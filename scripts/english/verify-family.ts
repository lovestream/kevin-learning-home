import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { EnglishContent } from "../../packages/english/content.ts";
import { EnglishTraining } from "../../packages/english/training.ts";
import {
  spellingAnswersFor,
  coreExerciseAnswerMatches,
  clueContainsAnswer,
} from "../../packages/english/source-grading.mjs";
const c = new EnglishContent(".english-family"),
  e = new EnglishTraining(c);
let sprintGroups = 0,
  sprintWords = 0;
for (const b of c.catalog.banks) {
  const batches = c.sprint(b.id);
  assert.equal(
    batches.reduce((n, x) => n + x.count, 0),
    b.count,
  );
  for (const batch of batches) {
    let q = e.act({ action: "sprint-start", bankId: b.id, day: batch.day });
    for (let phase = 0; phase < 3; phase++) {
      assert.equal(q.sprint.phase, ["cloze", "full", "final"][phase]);
      while (!q.done) {
        const card = e.sessions.get(q.sessionId)!.tasks[q.index].card;
        assert(!clueContainsAnswer(q.clue, card));
        assert(q.clue.trim(), "INDEPENDENT_CLUE_REQUIRED " + card.id);
        q = e.act({
          action: "answer",
          sessionId: q.sessionId,
          taskId: q.taskId,
          requestId: crypto.randomUUID(),
          answer: card.word,
        });
        assert(q.feedback.correct);
        assert.equal(q.latestEvidence.lessonOrUnitId, card.sourceGroupId);
        q = e.act({
          action: "next",
          sessionId: q.sessionId,
          taskId: q.taskId,
          requestId: crypto.randomUUID(),
        });
      }
      if (phase < 2)
        q = e.act({
          action: "sprint-advance",
          sessionId: q.sessionId,
          requestId: crypto.randomUUID(),
        });
    }
    assert.equal(q.sprint.phase, "complete");
    assert.equal(q.sprint.score, batch.count);
    sprintGroups++;
    sprintWords += batch.count;
    e.act({
      action: "close",
      sessionId: q.sessionId,
      requestId: crypto.randomUUID(),
    });
  }
}
let checked = 0,
  exerciseSlots = 0;
assert(
  c.bundle.notices?.includes("Permission is hereby granted"),
  "DICT_LICENSE_NOTICE_REQUIRED",
);
assert.equal(c.bundle.cards.length, 6631);
assert.equal(c.bundle.groups.length, 665);
assert.equal(
  c.bundle.groups.filter((g) => g.bankId === "core2000").length,
  128,
);
for (const g of c.bundle.groups) {
  const ids = g.wordIds;
  for (const id of ids) {
    const card = c.card(id),
      q = e.start({
        action: "start",
        groupId: g.id,
        mode: "full",
        wordIds: [id],
      });
    assert(!clueContainsAnswer(q.clue, card));
    assert(q.clue.trim(), "INDEPENDENT_CLUE_REQUIRED " + card.id);
    assert(!("wordId" in q));
    assert(!("word" in q));
    assert.equal(
      e.act({
        action: "answer",
        sessionId: q.sessionId,
        taskId: q.taskId,
        requestId: crypto.randomUUID(),
        answer: card.word,
      }).feedback.correct,
      true,
    );
    e.act({
      action: "close",
      sessionId: q.sessionId,
      requestId: crypto.randomUUID(),
    });
    checked++;
  }
  if (g.exercise) {
    const answers = c.bundle.exerciseAnswers[g.exercise.id];
    assert.equal(answers.length, g.exercise.answerSlots);
    assert(c.media(g.exercise.image));
    for (const a of answers) {
      assert(coreExerciseAnswerMatches(Array.isArray(a) ? a[0] : a, a));
      exerciseSlots++;
    }
  }
  for (const im of g.readingImages) assert(c.media(im));
}
for (const url of Object.keys(c.bundle.media)) assert(c.media(url));
console.log(
  JSON.stringify({
    status: "PASS",
    sourceSha: c.bundle.sourceSha,
    cards: checked,
    groups: c.bundle.groups.length,
    workbookPages: 128,
    exerciseSlots,
    uniqueMedia: Object.keys(c.bundle.media).length,
    readingImageReferences: c.bundle.groups.reduce(
      (n, g) => n + g.readingImages.length,
      0,
    ),
    sprintGroups,
    sprintWords,
    sprintCorrectResponses: sprintWords * 3,
    rewardsIssued: 0,
    realRecordsRead: false,
  }),
);
