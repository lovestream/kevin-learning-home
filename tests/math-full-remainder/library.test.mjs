import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";
import {
  loadLibrary,
  gradeLibrary,
  gradeDetective,
  orderedReasons,
  matchesResponse,
} from "../../apps/preview/library/service.ts";
import { librarySchema } from "../../apps/preview/library/contract.ts";
import { canonical } from "../../apps/preview/contract.ts";
import { startPreview } from "../../apps/preview/server.ts";
import { firstAnswer, submission } from "../math-full-02/helpers.mjs";
import {
  placeValueColumns,
  changeTens,
} from "../../apps/preview/library/place-value.ts";
import {
  thinkingToolSpec,
  initialThinkingTool,
  moveThinkingTool,
  measureThinkingTool,
} from "../../apps/preview/library/source/thinking-tools.mjs";
const lib = loadLibrary(process.cwd()),
  source = JSON.parse(
    fs.readFileSync(
      "docs/implementation/evidence/math-full-remainder/source.json",
    ),
  ),
  h = (b) => createHash("sha256").update(b).digest("hex");
import { detectiveSubmission } from "./helpers.mjs";
test("exact approved capabilities and frozen source mapping; no deferred card, private case or blueprint disguised as course", () => {
  assert.equal(lib.catalog.inverse.length,11);
  assert.deepEqual(lib.catalog.counts, {
    thinking: 17,
    deferred: 43,
    legacy: 54,
    legacyQuestions: 432,
    blueprints: 168,
    cases: 14,
    methodGuides: 6,
  });
  assert.equal(source.privateBankSha256, lib.bankSha256);
  assert(
    source.worktreeUnchanged &&
      source.privateFilesRead === false &&
      source.originalSideEffectScriptsExecuted === false,
  );
  assert.equal(source.statusBeforeSha256, source.statusAfterSha256);
  const cards = lib.catalog.entries.filter((c) => c.kind === "thinking");
  assert.deepEqual(
    cards.map((c) => c.id).sort(),
    source.approvedCards.map((c) => c.id).sort(),
  );
  for (const id of source.deferredIDs)
    assert(!lib.catalog.entries.some((c) => c.id === id));
  assert.equal(lib.catalog.methods.filter((m) => m.guide).length, 6);
  for (const g of [4, 5, 6])
    assert.equal(
      lib.catalog.entries.filter((c) => c.kind === "legacy" && c.grade === g)
        .length,
      18,
    );
  for (const t of source.targets)
    assert.equal(h(fs.readFileSync(t.target)), t.sha256, t.target);
  for (const c of lib.cases.values())
    assert.equal(h(canonical(c)), source.caseHashes[c.id]);
  assert(!lib.cases.has("DET-G3-PENDING-015"));
  assert.equal(source.taskMappings.length, 449);
  for (const m of source.taskMappings) {
    const row = lib.practice.tasks.get(m.taskId);
    assert(row);
    assert.equal(row.lessonId, m.capabilityId);
    assert.equal(h(canonical(row.task)), m.targetTaskSha256);
  }
  assert.deepEqual(librarySchema.parse(lib.catalog), lib.catalog);
  assert(
    !source.files.some((f) => /detective\/(?:inbox|reviewed)\//.test(f.path)),
  );
});
test("all 432 legacy questions have source-compatible deterministic goldens; 17 thought explanations remain human review", () => {
  let deterministic = 0,
    human = 0;
  const rows = [];
  for (const row of lib.practice.tasks.values()) {
    const out = gradeLibrary(lib, submission(row));
    assert.equal(
      out.status,
      row.task.kind === "explanation" ? "pendingReview" : "correct",
      row.task.id,
    );
    assert.equal(out.persisted, false);
    if (row.task.kind === "explanation") human++;
    else deterministic++;
    rows.push({
      taskId: row.task.id,
      lessonId: row.lessonId,
      status: out.status,
    });
  }
  assert.equal(deterministic, 432);
  assert.equal(human, 17);
  fs.mkdirSync(".evidence/math-full-remainder", { recursive: true });
  fs.writeFileSync(
    ".evidence/math-full-remainder/golden.json",
    JSON.stringify({ status: "PASS", deterministic, human, rows }, null, 2) +
      "\n",
  );
});
test("14 original anonymous cases: correct/wrong, reason shuffle, ordering, rational numeric comparison and no oral auto-correct", () => {
  for (const row of lib.cases.values()) {
    const s = detectiveSubmission(row),
      r = gradeDetective(lib, s);
    assert.equal(r.status, "correct", row.id);
    assert.equal(r.persisted, false);
    assert.equal(
      gradeDetective(lib, {
        ...s,
        finalAnswer: { ...s.finalAnswer, repair: "invalid" },
      }).status,
      "incorrect",
    );
    assert.throws(() =>
      gradeDetective(lib, { ...s, checks: [true, false, true] }),
    );
    assert.throws(() => gradeDetective(lib, { ...s, learnerId: "real" }));
    assert.throws(() =>
      gradeDetective(lib, { ...s, caseId: "DET-G3-PENDING-015" }),
    );
  }
  assert(matchesResponse({ kind: "number", answer: "1/2" }, "0.5"));
  assert(!matchesResponse({ kind: "number", answer: "2" }, "2厘米"));
  assert(!matchesResponse({ kind: "ordering", answer: "a|b" }, "b|a"));
  const row = structuredClone(lib.cases.values().next().value);
  row.content.repair.kind = "oral";
  const synthetic = { ...lib, cases: new Map([[row.id, row]]) };
  assert.equal(
    gradeDetective(synthetic, detectiveSubmission(row)).status,
    "pendingReview",
  );
});
test("library projection never sends task keys, case verdict, expected reason, solutions or private source notes initially", () => {
  for (const c of lib.catalog.cases) {
    for (const key of [
      "verdict",
      "errorStep",
      "reason",
      "solution",
      "hints",
      "sourceNotes",
    ])
      assert(!(key in c));
    assert(!("answer" in c.repair));
    assert(!("answer" in c.verify));
  }
  for (const l of lib.practice.lessons.values())
    for (const ts of Object.values(l.taskSets))
      for (const t of ts) {
        for (const key of [
          "answer",
          "expected",
          "solution",
          "hint",
          "diagnostic",
        ])
          assert(!(key in t));
      }
  const text = fs.readFileSync("apps/preview/library/service.ts", "utf8");
  assert(
    !/from ["'][^"']*(?:packages\/auth|packages\/platform|node:sqlite|apps\/server|inbox|store)/.test(
      text,
    ),
  );
  for (const p of fs
    .readdirSync("apps/preview/library/source")
    .filter((n) => /\.(?:mjs|tsx|ts)$/.test(n))) {
    const t = fs.readFileSync("apps/preview/library/source/" + p, "utf8");
    assert(
      !/\b(?:fetch\s*\(|localStorage|sessionStorage|indexedDB|XMLHttpRequest|sendBeacon)/.test(
        t,
      ),
      p,
    );
  }
});
test("real library HTTP reaches all 71 entries/449 tasks/14 cases; same schema and boundary for stateless grades", async () => {
  const s = await startPreview({ enabled: true, port: 0 }),
    origin = "http://127.0.0.1:" + s.address().port;
  const post = (route, body, headers = {}) =>
    fetch(origin + "/preview-api/v1/" + route + "/grade", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: typeof body === "string" ? body : JSON.stringify(body),
    });
  try {
    const cat = await fetch(origin + "/preview-api/v1/library/catalog");
    assert.equal(cat.headers.get("set-cookie"), null);
    assert.equal(canonical(await cat.json()), canonical(lib.catalog));
    for (const l of lib.practice.lessons.values()) {
      const r = await fetch(
        origin + "/preview-api/v1/library/lessons/" + l.lessonId,
      );
      assert.equal(r.status, 200);
      assert.equal(canonical(await r.json()), canonical(l));
    }
    for (const row of lib.practice.tasks.values()) {
      const r = await post("library", submission(row));
      assert.equal(r.status, 200);
      assert.equal(
        (await r.json()).status,
        row.task.kind === "explanation" ? "pendingReview" : "correct",
      );
    }
    for (const row of lib.cases.values()) {
      const r = await post("detective", detectiveSubmission(row));
      assert.equal(r.status, 200);
      assert.equal(r.headers.get("set-cookie"), null);
      assert.equal((await r.json()).status, "correct");
    }
    for (const id of source.deferredIDs)
      assert.equal(
        (await fetch(origin + "/preview-api/v1/library/lessons/" + id)).status,
        404,
      );
    for (const route of ["library", "detective"]) {
      assert.equal((await post(route, "x".repeat(17000))).status, 413);
      assert.equal(
        (await post(route, {}, { Origin: "https://foreign.invalid" })).status,
        403,
      );
      assert.equal(
        (await post(route, {}, { "Content-Type": "text/plain" })).status,
        415,
      );
      assert.equal((await post(route, { learnerId: "real" })).status, 400);
    }
    for (const p of [
      "/library/private/bank.json",
      "/apps/preview/library/private/bank.json",
      "/api/v1/auth/me",
      "/api/v1/detective/inbox",
      "/api/v1/parent/thinking",
    ])
      assert.equal((await fetch(origin + p)).status, 404);
    for (const method of ["POST", "PUT", "DELETE"])
      assert.equal(
        (await fetch(origin + "/api/v1/detective/inbox", { method })).status,
        405,
      );
    assert.equal(
      (await fetch(origin + "/subjects/math/library?kind=thinking")).status,
      200,
    );
  } finally {
    s.closeAllConnections();
    await new Promise((r) => s.close(r));
  }
});
test("library bank tampering prevents healthy startup", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "klh-library-test-"));
  try {
    fs.mkdirSync(path.join(dir, "apps"), { recursive: true });
    fs.cpSync("apps/preview", path.join(dir, "apps/preview"), {
      recursive: true,
    });
    const p = path.join(dir, "apps/preview/library/private/bank.json"),
      x = JSON.parse(fs.readFileSync(p));
    x.entries[0].title += "tamper";
    fs.writeFileSync(p, JSON.stringify(x));
    await assert.rejects(
      startPreview({ enabled: true, port: 0, root: dir }),
      /LIBRARY_SEAL_MISMATCH/,
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("multi-digit legacy place value conserves 306040 and higher units instead of truncating at hundreds", () => {
  for (const value of [0, 6, 99, 346, 306040, 4070500, 999999999]) {
    const cols = placeValueColumns(value);
    assert.equal(
      cols.reduce((n, c) => n + c.digit * c.unit, 0),
      value,
    );
    assert(cols.every((c) => c.digit >= 0 && c.digit <= 9));
  }
  assert.deepEqual(
    placeValueColumns(306040).map((c) => c.digit),
    [3, 0, 6, 0, 4, 0],
  );
  assert.equal(changeTens(306040, 1), 306050);
  assert.equal(changeTens(306040, -1), 306030);
  assert.equal(changeTens(0, -1), 0);
  assert.throws(() => placeValueColumns(1e10));
  assert.throws(() => placeValueColumns(1.5));
});
test("frozen thought models conserve equal removals, view constraints and Venn counts", () => {
  const b = thinkingToolSpec("G3-UP01-TH1"),
    s = initialThinkingTool(b);
  assert(measureThinkingTool(b, s).balanced);
  assert(
    measureThinkingTool(b, moveThinkingTool(b, s, "remove-both-box")).balanced,
  );
  assert(
    !measureThinkingTool(b, moveThinkingTool(b, s, "remove-left-box")).balanced,
  );
  const v = thinkingToolSpec("G3-U01-TH1");
  let state = initialThinkingTool(v);
  state = moveThinkingTool(v, state, "height", 0, 2);
  state = moveThinkingTool(v, state, "height", 1, 1);
  state = moveThinkingTool(v, state, "height", 2, 1);
  assert(measureThinkingTool(v, state).matches);
  const set = thinkingToolSpec("G3-L07-TH1");
  let people = initialThinkingTool(set);
  const zones = [
    ...Array(6).fill(1),
    ...Array(6).fill(2),
    ...Array(4).fill(3),
    ...Array(4).fill(4),
  ];
  zones.forEach((z, i) => {
    people = moveThinkingTool(set, people, "place", i, z);
  });
  assert(measureThinkingTool(set, people).matches);
});
