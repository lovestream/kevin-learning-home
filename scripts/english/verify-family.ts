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
let checked = 0,
  exerciseSlots = 0;
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
    rewardsIssued: 0,
    realRecordsRead: false,
  }),
);
