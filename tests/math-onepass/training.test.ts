import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, realpathSync, rmSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  freshTraining,
  trainingCatalog,
  applyTraining,
  trainingData,
  exportTraining,
  restoreTraining,
  validateTraining,
} from "../../packages/math-training/engine.mjs";
import { selfQuestion } from "../../packages/math-training/source/server/detective-self-questions.mjs";
import { evaluateCheckEvidence } from "../../packages/math-training/source/server/detective-check-evidence.mjs";
import { MathTrainingRepository } from "../../packages/math-training/repository.ts";
import { PageTraining } from "../../apps/preview/training.ts";
const day = 86400000,
  now = Date.parse("2026-10-29T02:00:00Z");
const numeric = (s: string) => {
  const [a, b = 1] = s.split("/").map(Number);
  return a / b;
};
const record = (x: unknown) => x as Record<string, any>;
function finish(
  p: any,
  family: string,
  index: number,
  mode = "practice",
  time = now,
  help = false,
) {
  const attemptId = family + "-" + index + "-" + mode;
  const q = selfQuestion(family, index);
  const send = (action: string, extra: Record<string, unknown> = {}) => {
    const a = p.studio.detective.selfTraining?.attempts[attemptId];
    return record(
      applyTraining(
        p,
        "self",
        {
          action,
          attemptId,
          eventId: attemptId + "-" + action,
          expectedRevision: a?.revision,
          ...extra,
        },
        time,
      ),
    );
  };
  const first = send("start", { errorFamilyId: family, mode });
  assert.equal(first.question.id, q.id);
  assert(!JSON.stringify(first).includes("checkPattern"));
  send("first", {
    status: "answered",
    value: "999999",
    reasoning: "先估计，再看条件。",
  });
  if (help) send("hint");
  return {
    result: send("final", {
      value: q.answer,
      checkValue: q.checkTarget,
      checkExpression: q.checkPattern,
      checkStatus: "complete",
      explanation: "把所求值代回原题条件，核对它是否仍然成立。",
    }),
    id: attemptId,
  };
}
test("reviewed catalog has 14 legacy +30 anonymous +3 process +16 controls, no answer-bearing catalog", () => {
  const c = trainingCatalog();
  assert.equal(c.cases.length, 63);
  assert.equal(new Set(c.cases.map((x) => x.id)).size, 63);
  assert.equal(c.cases.filter((x) => x.bundleId).length, 30);
  assert(
    !JSON.stringify(c).match(
      /"(?:answer|repair|verify|verdict|errorStep|solution)":/,
    ),
  );
  validateTraining(freshTraining());
});
for (const f of trainingCatalog().families)
  test(`${f.id}: 256 variants checked against independent arithmetic, equivalent reverse evidence and constant-guess rejection`, () => {
    for (let i = 0; i < 256; i++) {
      const q = selfQuestion(f.id, i),
        k = i + 1,
        r = i % 4,
        p = q.parameters as Record<string, number>;
      let expected: number;
      switch (f.id) {
        case "MASS_AVERAGE":
          expected =
            r === 1
              ? (p.count ?? p.totalGrams / p.averageGrams)
              : r === 3
                ? p.count * p.averageGrams
                : p.totalGrams / p.count;
          break;
        case "INITIAL_CHANGE":
          expected =
            r === 1
              ? (p.finalMm - p.originalCm * 10) / p.mmPerKg
              : r === 3
                ? p.finalMm - p.loadKg * p.mmPerKg
                : p.originalCm * 10 + p.mmPerKg * p.loadKg;
          break;
        case "UNIT_GROUPING":
          expected =
            r % 2
              ? (k + 3) * (2 + r)
              : (p.targetMm / p.groupThicknessMm) * p.cardsPerGroup;
          break;
        case "OPERATION_ORDER":
          expected = r % 2 ? k + 10 : p.a + p.b * p.c;
          break;
        case "UNIT_CONVERSION":
          expected = r % 2 ? k + 2 : (k + 2) * 100;
          break;
        case "EQUAL_GROUPS":
          expected = r % 2 ? k + 3 : (k + 3) * (r + 4);
          break;
        case "UNIT_ORDERING":
          expected =
            r % 2
              ? (k + 1) * 100 + 20 + (i % 7) * 5
              : (k + 2) * 100 - ((k + 1) * 100 + 20 + (i % 7) * 5);
          break;
        default:
          expected =
            r % 2
              ? p.shortageDm
              : (p.lowTurns * (p.surplusDm + p.shortageDm)) /
                  (p.highTurns - p.lowTurns) +
                p.surplusDm;
      }
      assert(
        Math.abs(numeric(q.answer) - expected) < 1e-8,
        `${q.id}: ${q.answer} vs ${expected}`,
      );
      for (const relation of q.checkRelations)
        assert(
          evaluateCheckEvidence(q, q.answer, relation.target, relation.pattern)
            .verified,
          q.id + " equivalent relation",
        );
      assert(
        !evaluateCheckEvidence(q, q.answer, q.checkTarget, q.checkTarget)
          .verified,
      );
      assert(
        !evaluateCheckEvidence(
          q,
          q.answer,
          q.checkTarget,
          "□ - □ + " + q.checkTarget,
        ).verified,
      );
    }
  });
test("immutable first answer, draft/hint exposure, idempotence/conflicts and wrong-to-right statistics", () => {
  const p = freshTraining(),
    before = JSON.stringify(p),
    q = selfQuestion("MASS_AVERAGE", 0);
  assert.throws(() =>
    applyTraining(
      p,
      "self",
      {
        action: "final",
        eventId: "bad-first",
        attemptId: "missing",
        value: q.answer,
      },
      now,
    ),
  );
  assert.equal(JSON.stringify(p), before);
  const a = finish(p, "MASS_AVERAGE", 0);
  assert(a.result.currentCheckEvidence.eligible);
  assert.equal(a.result.firstAnswer.value, "999999");
  assert.equal(
    record(trainingData(p, now)).stats.effectiveCorrection.numerator,
    1,
  );
  const state = record(p.studio).detective.selfTraining.attempts[a.id],
    firstHash = state.firstHash;
  assert.throws(() =>
    applyTraining(
      p,
      "self",
      {
        action: "first",
        eventId: "overwrite",
        attemptId: a.id,
        expectedRevision: state.revision,
        status: "answered",
        value: q.answer,
        reasoning: "rewrite",
      },
      now,
    ),
  );
  assert.equal(state.firstHash, firstHash);
  const helped = freshTraining(),
    b = finish(helped, "MASS_AVERAGE", 0, "practice", now, true);
  assert(!b.result.currentCheckEvidence.eligible);
  assert.equal(b.result.result.category, "assisted");
});
test("1/3/7/14 local-day progression, unseen transfer, no early/same-day review, clock rollback and parent schedule", () => {
  const p = freshTraining();
  finish(p, "EQUAL_GROUPS", 0);
  finish(p, "EQUAL_GROUPS", 1, "transfer", now + 1);
  const self = () => record(p.studio).detective.selfTraining;
  const start = (i: number, t: number) =>
    applyTraining(
      p,
      "self",
      {
        action: "start",
        attemptId: "early-" + i,
        eventId: "early-event-" + i,
        errorFamilyId: "EQUAL_GROUPS",
        mode: "review",
      },
      t,
    );
  assert.throws(() => start(0, now + 1000));
  for (const [i, offset] of [1, 3, 7, 14].entries()) {
    finish(p, "EQUAL_GROUPS", i + 2, "review", now + offset * day);
    assert.equal(self().schedules.EQUAL_GROUPS.stage, i + 1);
    assert.throws(() => start(i + 1, now + offset * day + 1));
  }
  assert.equal(self().schedules.EQUAL_GROUPS.dueDay, null);
  const snapshot = JSON.stringify(p);
  assert.throws(() => start(9, now));
  assert.equal(JSON.stringify(p), snapshot);
  const other = freshTraining();
  finish(other, "EQUAL_GROUPS", 0);
  const r = record(other.studio).detective.selfTraining.schedules.EQUAL_GROUPS;
  applyTraining(
    other,
    "parent-self",
    {
      action: "schedule",
      errorFamilyId: "EQUAL_GROUPS",
      eventId: "pause-review",
      expectedRevision: r.revision,
      paused: true,
      dueDay: "2026-11-02",
    },
    now,
  );
  assert.equal(
    record(other.studio).detective.selfTraining.schedules.EQUAL_GROUPS.paused,
    true,
  );
});
test("SQLite WAL transactions, held flock, process restart, learner isolation, scoped recovery and malicious backup rejection", () => {
  process.env.NODE_ENV = "test";
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "klh-math-review-")));
  let repo = new MathTrainingRepository(dir, () => now);
  try {
    assert.throws(() => new MathTrainingRepository(dir));
    const ev = {
      action: "start",
      eventId: "persist-start",
      attemptId: "persist-one",
      errorFamilyId: "MASS_AVERAGE",
      mode: "practice",
    };
    repo.dispatch("synthetic-a", "self", ev);
    const snapshot = repo.summary();
    repo.dispatch("synthetic-a", "self", ev);
    assert.deepEqual(repo.summary(), snapshot);
    assert.throws(() =>
      repo.dispatch("synthetic-a", "self", { ...ev, mode: "transfer" }),
    );
    assert.deepEqual(repo.summary(), snapshot);
    assert.equal(record(repo.data("synthetic-b")).attempts.length, 0);
    const backup = repo.backup("synthetic-a");
    repo.close();
    repo = new MathTrainingRepository(dir, () => now);
    assert.equal(record(repo.data("synthetic-a")).attempts.length, 1);
    assert.throws(() => repo.restore("synthetic-b", backup));
    assert.equal(
      record(repo.restore("synthetic-a", backup)).attempts.length,
      1,
    );
    const tampered = structuredClone(backup);
    record(tampered.payload.studio).detective.selfTraining.attempts[
      "persist-one"
    ].firstAnswer = {
      value: "123",
      status: "answered",
      at: new Date(now).toISOString(),
    };
    assert.throws(() => repo.restore("synthetic-a", tampered));
    assert.equal(
      readFileSync(join(dir, ".math-review-owner"), "utf8"),
      "klh-math-synthetic-review.v1\n",
    );
  } finally {
    repo.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
test("anonymous page capabilities are isolated, bounded, expire and cannot request review/parent/clock/extra data", () => {
  let clock = now;
  const pages = new PageTraining(() => clock),
    a = record(pages.dispatch("start", {})),
    b = record(pages.dispatch("start", {}));
  const event = {
    action: "start",
    eventId: "page-start",
    attemptId: "page-one",
    errorFamilyId: "MASS_AVERAGE",
    mode: "practice",
  };
  pages.dispatch("event", { capability: a.capability, channel: "self", event });
  assert.equal(
    record(pages.dispatch("data", { capability: b.capability })).attempts
      .length,
    0,
  );
  for (const value of [
    { capability: a.capability, channel: "parent-self", event },
    {
      capability: a.capability,
      channel: "self",
      event: { ...event, mode: "review" },
    },
    { capability: a.capability, now, event },
    {
      capability: a.capability,
      channel: "self",
      event: { ...event, role: "parent" },
    },
  ])
    assert.throws(() => pages.dispatch("event", value));
  pages.dispatch("release", { capability: a.capability });
  assert.throws(() => pages.dispatch("data", { capability: a.capability }));
  clock += 31 * 60000;
  assert.throws(() => pages.dispatch("data", { capability: b.capability }));
});

test("private synthetic daily case plan is fixed for the day and survives repository reopen", () => {
  process.env.NODE_ENV = "test";
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "klh-math-review-")));
  let repo = new MathTrainingRepository(dir, () => now);
  try {
    const first = record(repo.today("synthetic-plan")),
      state = record(repo.state("synthetic-plan"));
    assert.equal(first.cases.length, 3);
    assert.equal(Object.keys(state.studio.detective.plans).length, 1);
    const refs = first.cases.map((x: any) => x.case.id);
    assert.equal(new Set(refs).size, 3);
    assert.deepEqual(
      record(repo.today("synthetic-plan")).cases.map((x: any) => x.case.id),
      refs,
    );
    repo.close();
    repo = new MathTrainingRepository(dir, () => now);
    assert.deepEqual(
      record(repo.today("synthetic-plan")).cases.map((x: any) => x.case.id),
      refs,
    );
    assert.equal(
      Object.keys(record(repo.state("synthetic-other")).studio.detective.plans)
        .length,
      0,
    );
  } finally {
    repo.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
