import test from "node:test";
import assert from "node:assert/strict";
import {
  freshTraining,
  trainingCatalog,
  applyTraining,
} from "../../packages/math-training/engine.mjs";
import { orderedReasons } from "../../packages/math-training/source/shared/detective-model.mjs";
const catalog = trainingCatalog(),
  source = Object.values(freshTraining().studio.detective.cases);
test("public case identifiers do not reveal ERROR/CONTROL or a pre-answer verdict", () => {
  assert.equal(catalog.cases.length, 63);
  for (const c of catalog.cases) {
    assert(/^case-[a-f0-9]{24}$/.test(c.id));
    assert(/^case-[a-f0-9]{24}$/.test(c.version));
    assert(!/正确|无错|只算了|答案对|只有答案|错误|反例/.test(c.title),c.title);
    assert(
      !JSON.stringify(c).match(/ERROR|CONTROL|"verdict"|"answer"|"solution"/),
    );
  }
});
for (const [index, entry] of catalog.cases.entries())
  test(`${entry.id}: staged first verdict → first-error evidence → repair → inverse verification, no early key or reward`, () => {
    const p = freshTraining(),
      v = source[index].versions[0],
      content = v.content,
      attemptId = "case-flow-" + index;
    let result;
    const send = (action, extra = {}) => {
      result = applyTraining(p, "case", {
        action,
        attemptId,
        eventId: attemptId + "-" + action,
        expectedRevision: result?.attempt.revision,
        ...extra,
      });
      return result;
    };
    send("start", { caseId: entry.id, version: entry.version });
    assert.equal(result.case.id, entry.id);
    assert.equal(result.case.title,entry.title);
    for (const k of [
      "reasons",
      "response",
      "solution",
      "verdict",
      "errorStep",
      "answer",
    ])
      assert(!(k in result.case));
    assert.equal(result.attempt.phase, "judge");
    send("judge", { value: content.verdict });
    assert.equal(result.attempt.firstVerdict, content.verdict);
    assert(result.case.reasons.length > 1);
    assert(!("response" in result.case));
    assert(!("solution" in result.case));
    const reason = orderedReasons(v).findIndex(
      (x) => x.index === content.reason,
    );
    assert(reason >= 0);
    send("evidence", {
      step: content.verdict === "wrong" ? content.errorStep : null,
      reason,
      ...(content.diagnosticCategory
        ? { category: content.diagnosticCategory }
        : {}),
    });
    assert.equal(result.attempt.phase, "repair");
    assert(!("answer" in result.case.response));
    assert(!("solution" in result.case));
    send("repair", { value: content.repair.answer });
    assert.equal(result.attempt.phase, "verify");
    assert(!("solution" in result.case));
    send("verify", { value: content.verify.answer });
    if (content.repair.kind === "oral" || content.verify.kind === "oral") {
      assert.equal(result.attempt.status, "parent-review");
      assert(!("solution" in result.case));
    } else {
      assert.equal(result.attempt.phase, "closed");
      assert.equal(result.case.solution, content.solution);
    }
    assert.equal(p.studio.detective.badges.length, 0);
    const snapshot = JSON.stringify(p);
    assert.throws(() =>
      applyTraining(p, "case", {
        action: "judge",
        attemptId,
        eventId: "overwrite-first",
        expectedRevision: 1,
        value: "wrong",
      }),
    );
    assert.equal(JSON.stringify(p), snapshot);
  });
test("wrong first judgment/hints are preserved as assisted and cannot become independent evidence", () => {
  const p = freshTraining(),
    entry = catalog.cases[0],
    content = source[0].versions[0].content;
  let r = applyTraining(p, "case", {
    action: "start",
    attemptId: "assistance-case",
    eventId: "assistance-start",
    caseId: entry.id,
    version: entry.version,
  });
  r = applyTraining(p, "case", {
    action: "judge",
    attemptId: r.attempt.id,
    eventId: "assistance-wrong",
    expectedRevision: r.attempt.revision,
    value: content.verdict === "wrong" ? "correct" : "wrong",
  });
  assert(r.attempt.assisted);
  const wrong = r.attempt.firstVerdict;
  r = applyTraining(p, "case", {
    action: "hint",
    attemptId: r.attempt.id,
    eventId: "assistance-hint",
    expectedRevision: r.attempt.revision,
  });
  r = applyTraining(p, "case", {
    action: "judge",
    attemptId: r.attempt.id,
    eventId: "assistance-correct",
    expectedRevision: r.attempt.revision,
    value: content.verdict,
  });
  assert.equal(r.attempt.firstVerdict, wrong);
  assert(r.attempt.assisted);
  assert.equal(r.attempt.phase, "evidence");
});
