import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("R1-02 main push and development push/PR share the unconditional complete verification job", () => {
  const workflow = readFileSync(".github/workflows/foundation.yml", "utf8");
  // Guard the checked-in explicit branch lists; GitHub parses the actual YAML in CI.
  const branches = (event: string) => {
    const match = new RegExp(
      `^  ${event}:\\s*\\n    branches:\\s*\\[([^\\]]+)\\]`,
      "m",
    ).exec(workflow);
    assert(match, "EXPECTED_EXPLICIT_EVENT_BRANCH_LIST");
    return match[1]
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
  };
  assert.deepEqual(
    branches("push").sort(),
    [
      "main",
      "codex/02b-nas-trial",
      "codex/implement-01-foundation",
      "codex/implement-02a-auth",
      "codex/implement-02b-shell",
    ].sort(),
  );
  assert.deepEqual(branches("pull_request"), ["main"]);
  assert(
    !/^    (?:if|continue-on-error):/m.test(workflow),
    "FULL_JOB_MUST_NOT_SKIP_MAIN",
  );
  for (const step of [
    "npm ci",
    "node scripts/verify.ts",
    "npm run test:container",
    "Compose 1.28.5 parser compatibility",
  ])
    assert(workflow.includes(step), "FULL_PIPELINE_STEP_MISSING");
  assert(
    workflow.includes("github.event.pull_request.head.sha || github.sha"),
    "VERIFY_EXACT_EVENT_HEAD",
  );
});
