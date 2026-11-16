import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { EnglishTraining } from "../../packages/english/training.ts";
import { MyWords } from "../../packages/english/my-words.ts";
import { packContent } from "../../packages/english/pack.ts";
import {
  sprintBatches,
  evaluateSprint,
} from "../../packages/english/sprint.ts";
import type {
  EnglishCard,
  AttemptEvidence,
} from "../../packages/english/contract.ts";
import { fixture } from "./fixture.ts";
const draft = {
  word: "robot",
  en: "A machine that can do jobs.",
  example: "The robot can help.",
  sourceTag: "Story",
};
const act = (e: EnglishTraining, q: any, action: string, extra = {}) =>
  e.act({
    action,
    sessionId: q.sessionId,
    taskId: q.taskId,
    requestId: randomUUID(),
    ...extra,
  });
test("Core meaning survives target removal, including inflections, without accepting them as spellings", async () => {
  const f = await fixture();
  try {
    for (const [word, en] of [
      ["blood", "Blood is the red liquid in your body."],
      [
        "stair",
        "A stair is a step in a set of stairs from one level to another.",
      ],
      ["tie", "A tie is worn under a shirt collar and tied at the front."],
      ["direction", "Directions are instructions that tell you what to do."],
    ]) {
      const card = {
        ...f.content.bundle.cards[0],
        bankId: "custom",
        word,
        en,
        zh: "",
        spellingVariants: [],
        semanticAlternatives: [],
      };
      const e = new EnglishTraining(packContent([card]));
      const q = e.start({
        action: "start",
        groupId: "local-pack",
        mode: "full",
      });
      assert(q.clue.includes("____"));
      assert(q.clue.length > 15);
      assert(!new RegExp(word, "i").test(q.clue));
      assert.equal(
        act(e, q, "answer", { answer: word + "s" }).feedback.correct,
        false,
      );
    }
  } finally {
    f.cleanup();
  }
});
test("source partitions: generic 65 is 30/30/5; Movers original PDF days and 20-phrase chunks", () => {
  const cards = Array.from(
    { length: 65 },
    (_, i) => ({ id: "w" + i, bankId: "ket" }) as EnglishCard,
  );
  assert.deepEqual(
    sprintBatches(cards, "ket").map((b) => b.wordIds.length),
    [30, 30, 5],
  );
  const movers = Array.from(
    { length: 30 },
    (_, i) =>
      ({
        id: "m" + i,
        bankId: "movers",
        sourceDay: i < 2 ? 1 : 2,
        sourceNumber: i < 5 ? i + 1 : i - 4,
        cardType: i < 5 ? "word" : "phrase",
      }) as EnglishCard,
  );
  assert.deepEqual(
    sprintBatches(movers.reverse(), "movers").map((b) => b.wordIds.length),
    [2, 3, 20, 5],
  );
  assert.equal(sprintBatches(movers, "movers")[0].wordIds[0], "m0");
  assert.throws(
    () =>
      sprintBatches([{ id: "old", bankId: "movers" } as EnglishCard], "movers"),
    /分日信息/,
  );
  assert.throws(() => sprintBatches(cards, "unknown"));
});
test("duplicate clean rows never replace a missing word; audio and hint are not clean final evidence", () => {
  const row = {
    wordId: "a",
    firstAttempt: true,
    firstAttemptCorrect: true,
    usedHint: false,
    answerShown: false,
    usedAudio: false,
  } as AttemptEvidence;
  assert.equal(
    evaluateSprint("final", ["a", "b"], [row, row], 1).nextPhase,
    "drill",
  );
  for (const field of ["usedAudio", "usedHint", "answerShown"] as const)
    assert.equal(
      evaluateSprint("final", ["a"], [{ ...row, [field]: true }], 1).nextPhase,
      "drill",
    );
  assert.equal(evaluateSprint("final", ["a"], [row], 1).nextPhase, "complete");
});
test("complete sprint lifecycle: wrong full -> drill -> final wrong -> drill -> final clean; no rewards or overwritten first", async () => {
  const f = await fixture();
  try {
    const e = new EnglishTraining(f.content);
    let q: any = e.act({
      action: "sprint-start",
      bankId: "core2000",
      day: 999,
    });
    assert.equal(q.sprint.day, 1);
    assert(!JSON.stringify(q).includes("synthetic-candy"));
    assert.throws(() => act(e, q, "sprint-advance"), /当前冲刺/);
    const finish = (bad = false) => {
      let i = 0;
      while (!q.done) {
        const card = e.sessions.get(q.sessionId)!.tasks[q.index].card;
        if (bad && i++ === 0) q = act(e, q, "answer", { answer: "wrong" });
        q = act(e, q, "answer", { answer: card.word });
        q = act(e, q, "next");
      }
    };
    finish();
    assert.equal(q.sprint.nextPhase, "full");
    q = act(e, q, "sprint-advance");
    finish(true);
    assert.equal(q.sprint.nextPhase, "drill");
    q = act(e, q, "sprint-advance");
    assert.equal(q.total, 1);
    finish();
    q = act(e, q, "sprint-advance");
    assert.equal(q.sprint.phase, "final");
    for (const help of ["hint", "reference", "audio"])
      assert.throws(() => act(e, q, help), /不提供提示/);
    finish(true);
    assert.equal(q.sprint.nextPhase, "drill");
    const request = {
      action: "sprint-advance",
      sessionId: q.sessionId,
      taskId: q.taskId,
      requestId: randomUUID(),
    };
    q = e.act(request);
    assert.equal(q.sprint.cycle, 2);
    assert.deepEqual(e.act(request), q);
    finish();
    q = act(e, q, "sprint-advance");
    finish();
    assert.equal(q.sprint.phase, "complete");
    const summary = act(e, q, "summary");
    assert(summary.completed);
    assert.equal(summary.rewardEligible, false);
    assert.equal(
      summary.evidence.filter(
        (r: any) => r.firstAttempt && !r.firstAttemptCorrect,
      ).length,
      2,
    );
    assert(
      summary.evidence.every(
        (r: any) =>
          r.lessonOrUnitId === "synthetic-group" &&
          r.sprintDay === 1 &&
          r.storage === "page-memory-only",
      ),
    );
  } finally {
    f.cleanup();
  }
});
test("sprint final clean score uses the active phase only, not previously successful cloze", async () => {
  const f = await fixture();
  try {
    const e = new EnglishTraining(f.content);
    let q: any = e.act({ action: "sprint-start", bankId: "core2000", day: 1 });
    const finish = (hint = false) => {
      let i = 0;
      while (!q.done) {
        const card = e.sessions.get(q.sessionId)!.tasks[q.index].card;
        if (hint && i++ === 0) q = act(e, q, "audio");
        q = act(e, q, "answer", { answer: card.word });
        q = act(e, q, "next");
      }
    };
    finish();
    q = act(e, q, "sprint-advance");
    finish(true);
    assert.equal(q.sprint.score, 3);
    assert.equal(q.sprint.nextPhase, "drill");
  } finally {
    f.cleanup();
  }
});
test("custom training evidence survives edits/archive and keeps content version snapshots", () => {
  const words = new MyWords(),
    entry = words.save(draft),
    id = entry.card.id;
  const engine = new EnglishTraining(packContent([entry.card]));
  const q = engine.start({
    action: "start",
    groupId: "local-pack",
    mode: "full",
  });
  const result = act(engine, q, "answer", { answer: "robot" }),
    v = entry.card.contentVersion;
  const updated = words.save(
    { ...draft, word: "robots", example: "Robots help us." },
    id,
  );
  assert.equal(updated.card.id, id);
  assert.equal(updated.revisions[0].card.word, "robot");
  assert.notEqual(v, updated.card.contentVersion);
  assert.equal(result.latestEvidence.wordId, id);
  assert.equal(result.latestEvidence.contentVersion, v);
  words.archive(id, true);
  assert.equal(words.filter("", "", "active").length, 0);
  assert.equal(words.filter("", "", "archived").length, 1);
  words.archive(id, false);
  assert.equal(words.entries.get(id)!.train, true);
  assert.equal(act(engine, q, "summary").evidence[0].answer, "robot");
});
test("My Words duplicate, atomic pack limit, source filters and training/collection are independent", () => {
  const words = new MyWords();
  const a = words.save(draft),
    b = words.save({
      ...draft,
      word: "book",
      en: "Pages to read.",
      example: "Read this book.",
      sourceTag: "School",
      train: false,
    });
  assert.throws(() => words.save(draft), /已在生词本/);
  assert.equal(
    words.filter("book", "School", "collection")[0].card.id,
    b.card.id,
  );
  const visible = words
    .filter("robot", "Story", "active")
    .map((e) => e.card.id);
  words.setTraining(visible, false);
  assert.equal(words.entries.get(b.card.id)!.train, false);
  assert.equal(words.entries.get(a.card.id)!.train, false);
  assert.equal(words.addPack([a.card], "another", true).length, 0);
  assert.equal(words.entries.get(a.card.id)!.sourceTag, "Story");
  assert.throws(() => words.save({ ...draft, word: "<script>" }));
  for (let i = words.entries.size; i < 200; i++)
    words.save({
      ...draft,
      word:
        "word " +
        String.fromCharCode(97 + Math.floor(i / 26)) +
        String.fromCharCode(97 + (i % 26)),
      en: "Entry " + i,
    });
  assert.throws(
    () =>
      words.addPack(
        [{ ...a.card, id: "custom:extra", word: "extra", en: "extra" }],
        "pack",
        true,
      ),
    /200/,
  );
  assert.equal(words.entries.size, 200);
});
test("manual phrase whitespace follows original normalization and metadata edits preserve spelling chunks", () => {
  const words = new MyWords(),
    entry = words.save({
      ...draft,
      word: "ice  cream",
      en: "  A   frozen dessert.  ",
      example: "I like ice cream.",
    });
  assert.equal(entry.card.word, "ice cream");
  assert.equal(entry.card.en, "A frozen dessert.");
  const e = new EnglishTraining(packContent([entry.card]));
  const q = e.start({ action: "start", groupId: "local-pack", mode: "full" });
  assert.equal(
    act(e, q, "answer", { answer: "ice cream" }).feedback.correct,
    true,
  );
  const chunks = [...entry.card.chunks];
  const updated = words.save(
    {
      ...draft,
      word: "ice cream",
      en: "A frozen dessert.",
      example: "I like ice cream.",
      sourceTag: "A different story",
    },
    entry.card.id,
  );
  assert.deepEqual(updated.card.chunks, chunks);
  assert.equal(updated.card.contentVersion, entry.card.contentVersion);
});
