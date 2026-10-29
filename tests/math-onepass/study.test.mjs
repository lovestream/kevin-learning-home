import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  freshStudy,
  validateStudy,
  applyStudy,
  studyData,
  studyPlan,
  exportStudy,
  restoreStudy,
} from "../../packages/math-training/study.mjs";
import { thinkingCards } from "../../packages/math-training/source/content/pilot/thinking-source.mjs";
import { thinkingVariant } from "../../packages/math-training/source/content/pilot/thinking-variants.mjs";
import {
  withdrawnLessons,
  withdrawnTaskIds,
} from "../../packages/math-training/source/shared/withdrawn-checks.mjs";
import { auditTask } from "../../packages/math-training/source/shared/task-audit-oracle.mjs";
import { loadReading } from "../../apps/preview/reading/service.ts";
import { methodCompanions } from "../../apps/preview/library/method-companions.ts";
const root = new URL("../..", import.meta.url).pathname,
  now = Date.parse("2026-10-29T02:00:00Z"),
  DAY = 86400000;
test("all 70 original full articles/checkpoints retain teaching; correctness/reference never in public checkpoint projection", () => {
  const reading = loadReading(root);
  let choices = 0,
    oral = 0;
  for (const a of reading.articles.values()) {
    assert(a.blocks.some((b) => b.type === "manipulative"));
    assert(a.blocks.some((b) => b.type === "workedExample"));
    const b = a.blocks.find((b) => b.type === "checkpoint");
    assert(b);
    assert(
      !JSON.stringify(b).match(
        /"(?:correct|referenceAnswer|reason|expected)":/,
      ),
    );
    assert.throws(() =>
      reading.grade({
        lessonId: a.lessonId,
        blockId: b.blockId,
        explanation: "",
      }),
    );
    if (b.responseType === "choice") {
      choices++;
      for (let choice = 0; choice < b.options.length; choice++) {
        const v = reading.grade({
          lessonId: a.lessonId,
          blockId: b.blockId,
          choice,
        });
        assert.equal(typeof v.correct, "boolean");
        assert(v.feedback);
        assert.equal(v.persisted, false);
      }
    } else {
      oral++;
      const r = reading.grade({
        lessonId: a.lessonId,
        blockId: b.blockId,
        explanation: "先按题目里的条件画图核对。",
      });
      assert.equal(r.correct, null);
      assert(r.reference);
    }
  }
  assert.deepEqual({ choices, oral }, { choices: 18, oral: 52 });
});
test("28 methods have actual conditions/examples/counterexamples and installed model links; 22 adapted, six original guides intact", () => {
  const bank = JSON.parse(
      fs.readFileSync("apps/preview/library/private/bank.json"),
    ),
    catalog = JSON.parse(fs.readFileSync("apps/preview/content/catalog.json")),
    ids = new Set([
      ...bank.entries.map((e) => e.id),
      ...catalog.lessons.map((l) => l.lessonId),
    ]);
  assert.equal(Object.keys(methodCompanions).length, 22);
  assert.equal(bank.methods.filter((x) => x.guide).length, 6);
  for (const m of bank.methods) {
    const g = m.guide ?? methodCompanions[m.thinkingSkillId];
    for (const k of [
      "question",
      "condition",
      "why",
      "example",
      "counterexample",
    ])
      assert(g[k]?.length > 8, m.thinkingSkillId + " " + k);
    assert(g.lessonIds.length);
    for (const id of g.lessonIds)
      assert(ids.has(id), "Unknown method classroom " + id);
  }
});
test("original reading revision, note replay/conflict, widget bounds and malicious state rejection are atomic", () => {
  const p = freshStudy(),
    event = {
      lessonId: "G3-U01-B01",
      revision: 0,
      blockId: "classroom",
      widgets: { classroom: { parentMode: true } },
    };
  const r = applyStudy(p, "reading", event, now);
  assert.equal(r.revision, 1);
  const before = JSON.stringify(p);
  assert.throws(() => applyStudy(p, "reading", event, now));
  assert.equal(JSON.stringify(p), before);
  assert.throws(() =>
    applyStudy(
      p,
      "reading",
      { ...event, revision: 1, widgets: { evil: { parentMode: true } } },
      now,
    ),
  );
  assert.equal(JSON.stringify(p), before);
  const n = {
    lessonId: "G3-U01-B01",
    id: "synthetic-note-one",
    text: "盒子不动，换观察方向。",
  };
  const note = applyStudy(p, "note", n, now);
  assert.deepEqual(applyStudy(p, "note", n, now + 1), note);
  assert.throws(() =>
    applyStudy(p, "note", { ...n, text: "覆盖第一次解释" }, now + 2),
  );
  assert.equal(p.studio.notes.length, 1);
  const evil = structuredClone(p);
  evil.studio.wallet = { coins: 1 };
  assert.throws(() => validateStudy(evil));
  assert.equal(restoreStudy(exportStudy(p)).studio.notes[0].text, n.text);
});
test("all eleven withdrawn assessments use the original five IDs, resume unchanged and reveal no answer key", () => {
  for (const lessonId of withdrawnLessons) {
    const p = freshStudy(),
      s = applyStudy(
        p,
        "session-start",
        { lessonId, setName: "core", assessment: "withdrawn-v1" },
        now,
      );
    assert.deepEqual(s.taskIds, withdrawnTaskIds(lessonId));
    assert.equal(s.tasks.length, 5);
    assert(
      !JSON.stringify(s.tasks).match(
        /"(?:expected|hint|solution|expectedEvidence)":/,
      ),
    );
    assert.equal(
      applyStudy(
        p,
        "session-start",
        { lessonId, setName: "core", assessment: "withdrawn-v1" },
        now + 1,
      ).id,
      s.id,
    );
    assert.throws(() =>
      applyStudy(
        p,
        "submit",
        {
          sessionId: s.id,
          eventId: "unsealed-first",
          revision: 0,
          taskId: s.taskIds[0],
          answer: { value: "1" },
        },
        now,
      ),
    );
  }
});
for (const card of thinkingCards)
  test(`${card.id}: immutable first, hints/automatic model validation recorded, parent gate and 12 genuinely different authored variants`, () => {
    const p = freshStudy(),
      send = (action, extra = {}) =>
        applyStudy(
          p,
          "thinking",
          {
            taskId: card.id,
            eventId: crypto.randomUUID(),
            revision: p.studio.thinking?.[card.id]?.revision ?? 0,
            action,
            ...extra,
          },
          now,
        );
    assert.throws(() => send("solution", { level: 1 }));
    send("first", { answer: "先读清条件，按数量关系比较。" });
    const first = p.studio.thinking[card.id].firstAnswer;
    assert.throws(() => send("first", { answer: "覆盖首答" }));
    assert.equal(p.studio.thinking[card.id].firstAnswer, first);
    send("hint", { level: 1 });
    send("check", {
      checks: [true, true, true],
      reflection: "逐个条件代回去，核对有没有遗漏。",
    });
    send("final", { answer: "用条件、图和反查关系解释结论。" });
    assert.equal(p.studio.thinking[card.id].phase, "pendingReview");
    assert.throws(() =>
      applyStudy(
        p,
        "parent-thinking",
        {
          taskId: card.id,
          eventId: crypto.randomUUID(),
          revision: p.studio.thinking[card.id].revision,
          verdict: "independent-mastered",
          comment: "不能把提示后的理解算独立。",
          reviewer: "synthetic-parent",
          causes: [],
        },
        now,
      ),
    );
    const variants = Array.from({ length: 12 }, (_, i) =>
      thinkingVariant(card.id, i + 1),
    );
    assert.equal(new Set(variants.map((x) => x.id)).size, 12);
    assert.equal(new Set(variants.map((x) => x.question)).size, 12);
    assert.throws(() => thinkingVariant("G3-U01-TH2", 1));
    validateStudy(p);
    assert.deepEqual(p.studio.entitlements, {});
    assert.deepEqual(p.studio.daily, {});
  });
test("thinking delayed challenge: no early reopen, no automatic model validation in challenge, 1/3/7/21 day chain", () => {
  const p = freshStudy(),
    id = "G3-UP01-TH1";
  let time = now;
  const act = (action, extra = {}) =>
    applyStudy(
      p,
      "thinking",
      {
        taskId: id,
        eventId: crypto.randomUUID(),
        revision: p.studio.thinking?.[id]?.revision ?? 0,
        action,
        ...extra,
      },
      time,
    );
  const finish = () => {
    act("first", { answer: "先用等量关系消去共同部分。" });
    act("check", {
      checks: [true, true, true],
      reflection: "把结果代回两条原关系，条件都要相同。",
    });
    act("final", { answer: "两条等量关系分别代回，解释每一步保持等量。" });
    applyStudy(
      p,
      "parent-thinking",
      {
        taskId: id,
        eventId: crypto.randomUUID(),
        revision: p.studio.thinking[id].revision,
        verdict: "independent-mastered",
        comment: "合成审核：无提示、无自动教具核对，逐项核对原条件。",
        reviewer: "synthetic-parent",
        causes: [],
      },
      time,
    );
  };
  finish();
  assert.throws(() => act("review-start"));
  for (const offset of [1, 3, 7, 21]) {
    time = Date.parse(p.studio.thinking[id].review.dueAt);
    assert(time >= now + offset * DAY);
    act("review-start");
    assert.equal(p.studio.thinking[id].mode, "challenge");
    assert.throws(() => act("tool-open"));
    finish();
  }
  assert(p.studio.thinking[id].review.completed);
  assert(p.studio.thinking[id].review.strongEvidence);
  assert.equal(studyData(p).thinking[id].attempts.length, 4);
});
test("independent editorial audit covers every original 849 prompt/diagram/solution; numeric evidence is not conflated with answer-key consistency", () => {
  const bank = JSON.parse(
      fs.readFileSync("apps/preview/practice/private/bank.json"),
    ),
    rows = bank.lessons
      .flatMap((l) => Object.values(l.taskSets).flat())
      .map((t) => ({ id: t.id, ...auditTask(t) }));
  assert.equal(rows.length, 849);
  const errors = rows.filter((x) => x.errors.length);
  fs.mkdirSync(".evidence/math-onepass", { recursive: true });
  fs.writeFileSync(
    ".evidence/math-onepass/849-math-audit.json",
    JSON.stringify(
      {
        count: rows.length,
        errors: errors.map((x) => ({ id: x.id, errors: x.errors })),
        independentlyDerived: rows.filter(
          (x) => x.independentlyDerivedFromPromptOrDiagram,
        ).length,
        solutionConsistent: rows.filter((x) => x.solutionInternallyConsistent)
          .length,
        rows,
      },
      null,
      2,
    ) + "\n",
  );
  assert.deepEqual(
    errors.map((x) => ({ id: x.id, errors: x.errors })),
    [],
  );
});

const authoredPractice = JSON.parse(
  fs.readFileSync("apps/preview/practice/private/bank.json"),
);
function practiceCommand(p, s, task, answer, time = now) {
  let n = 0;
  const send = (channel, extra) => {
    const result = applyStudy(
      p,
      channel,
      {
        sessionId: s.id,
        taskId: task.id,
        revision: s.revision,
        eventId: `synthetic-plan-${time}-${task.id}-${++n}-${s.revision}`,
        ...extra,
      },
      time,
    );
    s.revision = result.revision;
    return result;
  };
  send("self-check", { phase: "first", answer });
  send("self-check", {
    phase: "evidence",
    evidence: {
      checks: task.selfCheckItems ?? ["读清问题", "核对过程", "检查结果"],
      reflection: "合成测试：核对条件、单位与结论。",
      format: "checklist-v1",
      finalConfirmed: true,
    },
  });
  return send("submit", { answer });
}
test("private source selectors: installed grade/next/resume, wrong-to-right objective groups and actual due dates survive logical recovery", () => {
  const p = freshStudy();
  for (const grade of [3, 4, 5, 6]) {
    const plan = studyPlan(p, now, grade);
    assert(plan.next.grade.includes(grade));
    assert.equal(plan.next.completed, false);
    assert.equal(plan.resume, null);
    assert.deepEqual(plan.due, []);
  }
  const lessonId = "G3-U01-B01",
    l = authoredPractice.lessons.find((l) => l.lessonId === lessonId),
    t = l.taskSets.warmup[0],
    s = applyStudy(p, "session-start", { lessonId, setName: "warmup" }, now);
  assert.equal(studyPlan(p, now).resume.taskId, t.id);
  const wrong = { value: t.options.find((o) => o.id !== t.expected).id };
  assert.equal(practiceCommand(p, s, t, wrong).status, "incorrect");
  let plan = studyPlan(p, now);
  assert.equal(plan.mistakes.length, 1);
  assert.equal(plan.mistakes[0].resolved, false);
  assert.equal(plan.mistakes[0].task.taskId, t.id);
  assert.equal(plan.observedAttempts, 1);
  assert.deepEqual(plan.due, []);
  assert.equal(studyPlan(p, now + DAY + 1).due[0].id, lessonId);
  assert.equal(
    practiceCommand(p, s, t, { value: t.expected }, now + 2).status,
    "correct",
  );
  plan = studyPlan(p, now + 2);
  assert.equal(plan.mistakes[0].resolved, true);
  assert.equal(plan.observedAttempts, 2);
  assert.deepEqual(p.studio.sessions[s.id].selfChecks[t.id].firstAnswer, wrong);
  assert.deepEqual(studyPlan(restoreStudy(exportStudy(p)), now + 2), plan);
  assert(
    !JSON.stringify(plan).match(
      /"(?:expected|solution|hint|expectedEvidence)":/,
    ),
  );
});
test("parent rejection during a due original explanation review schedules remediation without any personal settings or rewards", () => {
  const p = freshStudy(),
    lesson = authoredPractice.lessons.find(
      (l) =>
        l.taskSets.review.some((t) => t.kind === "explanation") &&
        l.taskSets.warmup.some((t) => t.kind === "choice"),
    ),
    lessonId = lesson.lessonId,
    t = lesson.taskSets.warmup.find((t) => t.kind === "choice"),
    s = applyStudy(p, "session-start", { lessonId, setName: "warmup" }, now);
  practiceCommand(p, s, t, {
    value: t.options.find((o) => o.id !== t.expected).id,
    ...(t.responseSpec.expectedEvidence
      ? { evidence: t.responseSpec.expectedEvidence }
      : {}),
  });
  const time = now + DAY + 1,
    review = applyStudy(
      p,
      "session-start",
      { lessonId, setName: "review" },
      time,
    ),
    oral = lesson.taskSets.review.find((t) => t.kind === "explanation");
  assert.equal(
    practiceCommand(
      p,
      review,
      oral,
      { value: "合成解释：先读清所求，再回到原条件验证。" },
      time,
    ).status,
    "pendingReview",
  );
  const result = applyStudy(
    p,
    "parent-formal",
    {
      sessionId: review.id,
      taskId: oral.id,
      revision: review.revision,
      eventId: "synthetic-remediation-review",
      verdict: "needs-remediation",
      comment: "合成审核：还没有解释图形与数量的对应。",
    },
    time,
  );
  assert.equal(result.paid, 0);
  assert(Date.parse(p.studio.review[lessonId].dueAt) > time);
  assert(Date.parse(p.studio.review[lessonId].dueAt) <= time + DAY);
  assert.equal(p.studio.review[lessonId].history.at(-1).independent, false);
  assert.deepEqual(p.studio.entitlements, {});
  assert.deepEqual(p.studio.daily, {});
});
