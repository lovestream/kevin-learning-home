import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import os from "node:os";
mkdirSync(".evidence", { recursive: true });
const steps = [
  ["npm", ["run", "typecheck"]],
  ["npm", ["run", "build"]],
  [
    process.execPath,
    [
      "--test",
      "--test-concurrency=1",
      "--test-reporter=junit",
      "--test-reporter-destination=.evidence/foundation-junit.xml",
      "tests/foundation/platform.test.ts",
      "tests/foundation/recovery.test.ts",
      "tests/foundation/restart.test.ts",
      "tests/foundation/writer-lock.test.ts",
      "tests/foundation/readiness.test.ts",
      "tests/auth/bootstrap.test.ts",
      "tests/auth/http.test.ts",
      "tests/auth/migration.test.ts",
      "tests/auth/process.test.ts",
      "tests/auth/workflow.test.ts",
      "tests/shell/contracts.test.ts",
    ],
  ],
  ["npm", ["run", "test:browser"]],
  ["npm", ["run", "test:ui"]],
] as [string, string[]][];
const results = [];
for (const [command, args] of steps) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    maxBuffer: 4 * 1024 * 1024,
  });
  results.push({
    command: [command, ...args].join(" "),
    exitCode: result.status,
  });
  if (result.status !== 0) {
    writeFileSync(
      ".evidence/failed-step.log",
      String(result.stdout) + "\n" + String(result.stderr),
    );
    console.error("Failed " + command + " " + args.join(" "));
    process.exit(1);
  }
}
const xml = readFileSync(".evidence/foundation-junit.xml", "utf8");
const tests = [...xml.matchAll(/<testcase\b/g)].length;
if (!tests || /<failure\b|<error\b/.test(xml))
  throw Error("TEST_REPORT_INVALID");
const shell = JSON.parse(readFileSync(".evidence/shell-browser.json", "utf8"));
if (
  shell.filtered ||
  shell.failures ||
  shell.total !== 13 ||
  !["PASS_LOCAL", "PASS_CI"].includes(shell.status)
)
  throw Error("SHELL_REPORT_INCOMPLETE");
const result = {
  status: process.env.CI ? "PASS_CI" : "PASS_LOCAL",
  timestamp: new Date().toISOString(),
  executedHeadSha: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  worktreeDirty: !!execFileSync(
    "git",
    ["status", "--porcelain", "--untracked-files=no"],
    { encoding: "utf8" },
  ).trim(),
  environment: {
    node: process.version,
    os: os.platform(),
    arch: os.arch(),
    kernel: os.release(),
  },
  tests,
  browserViewports: 3,
  shellBrowserScenarios: JSON.parse(
    readFileSync(".evidence/shell-browser.json", "utf8"),
  ).total,
  shellViewports: [390, 768, 1280, 1440],
  steps: results,
};
writeFileSync(
  ".evidence/verification.json",
  JSON.stringify(result, null, 2) + "\n",
);
console.log(JSON.stringify(result));
