import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { EnglishTraining } from "../../packages/english/training.ts";
import { EnglishContent, englishHash } from "../../packages/english/content.ts";
import { inspectPack } from "../../packages/english/pack.ts";
import {
  spellingAnswersFor,
  clueContainsAnswer,
  coreExerciseAnswerMatches,
} from "../../packages/english/source-grading.mjs";
import { fixture } from "./fixture.ts";
function action(e: EnglishTraining, q: any, type: string, extra = {}) {
  return e.act({
    action: type,
    sessionId: q.sessionId,
    taskId: q.taskId,
    requestId: randomUUID(),
    ...extra,
  });
}
test("source helper target is pinned and semantic alternatives never count as spelling", () => {
  const x = JSON.parse(
    readFileSync("docs/english/grading-origin.json", "utf8"),
  );
  assert.equal(
    englishHash(readFileSync("packages/english/source-grading.mjs")),
    x.targetSha256,
  );
  assert.deepEqual(
    spellingAnswersFor({ word: "candy", acceptedAnswers: ["sweet"] }),
    ["candy"],
  );
  assert.deepEqual(
    spellingAnswersFor({ word: "colour", spellingVariants: ["color"] }),
    ["colour", "color"],
  );
  assert(coreExerciseAnswerMatches("B and A", "a,b"));
  assert(!coreExerciseAnswerMatches("A", "a,b"));
});
test("pre-answer payload has no target word, stable answer-bearing ID, definition, example or source filename", async () => {
  const f = await fixture();
  try {
    const e = new EnglishTraining(f.content),
      q = e.start({
        action: "start",
        groupId: "synthetic-group",
        mode: "full",
      }),
      s = JSON.stringify(q);
    for (const forbidden of [
      "candy",
      "synthetic-",
      "A candy",
      "wordId",
      "example",
      "spellingVariants",
    ])
      assert(!s.includes(forbidden), forbidden);
    assert(q.image?.match(/[a-f0-9]{64}\.webp$/));
    assert.match(q.taskId, /^[a-f0-9-]{36}$/);
    assert.equal(q.clue, "糖果");
  } finally {
    f.cleanup();
  }
});
test("first wrong answer is immutable; hint, reference and audio remain separately visible", async () => {
  const f = await fixture();
  try {
    const e = new EnglishTraining(f.content),
      q = e.start({
        action: "start",
        groupId: "synthetic-group",
        mode: "full",
      });
    const bad = action(e, q, "answer", { answer: "sweet" });
    assert.equal(bad.feedback.correct, false);
    assert(bad.feedback.nearMiss);
    assert.equal(bad.feedback.answer, "");
    action(e, q, "hint");
    action(e, q, "audio");
    action(e, q, "reference");
    const fixed = action(e, q, "answer", { answer: "CANDY" });
    assert.equal(fixed.feedback.correct, true);
    assert.equal(fixed.firstAnswer.answer, "sweet");
    assert.equal(fixed.firstAnswer.correct, false);
    assert.equal(fixed.firstAnswer.assisted, false);
    const sum = action(e, q, "summary");
    assert.equal(sum.evidence.length, 2);
    assert(
      sum.evidence[1].usedHint &&
        sum.evidence[1].answerShown &&
        sum.evidence[1].usedAudio,
    );
    assert(sum.evidence.every((x: any) => !x.rewardEligible));
  } finally {
    f.cleanup();
  }
});
test("help before first answer is accurately marked; a retry cannot rewrite a receipt or task", async () => {
  const f = await fixture();
  try {
    const e = new EnglishTraining(f.content),
      q = e.start({
        action: "start",
        groupId: "synthetic-group",
        mode: "full",
      });
    action(e, q, "reference");
    const c = {
      action: "answer",
      sessionId: q.sessionId,
      taskId: q.taskId,
      requestId: randomUUID(),
      answer: "candy",
    };
    const a = e.act(c);
    assert(a.firstAnswer.assisted);
    assert.deepEqual(e.act(c), a);
    assert.throws(() => e.act({ ...c, answer: "sweet" }));
    const next = action(e, q, "next");
    assert.throws(() => action(e, q, "answer", { answer: "colour" }));
    assert.equal(
      action(e, next, "answer", { answer: "color" }).feedback.correct,
      true,
    );
  } finally {
    f.cleanup();
  }
});
test("cloze always hides at least one letter, full mode no mask; unfinished cannot advance", async () => {
  const f = await fixture();
  try {
    const e = new EnglishTraining(f.content);
    for (const c of f.content.cards.values()) {
      const q = e.start({
        action: "start",
        groupId: "synthetic-group",
        mode: "cloze",
        wordIds: [c.id],
      });
      assert(q.mask?.includes("_"));
      assert.throws(() => action(e, q, "next"));
    }
    const q = e.start({
      action: "start",
      groupId: "synthetic-group",
      mode: "full",
    });
    assert.equal(q.mask, null);
  } finally {
    f.cleanup();
  }
});
test("workbook grading keeps first responses, idempotent retries and later corrections separate", async () => {
  const f = await fixture();
  try {
    const e = new EnglishTraining(f.content),
      q = e.start({ action: "start", groupId: "synthetic-group" }),
      c = {
        action: "exercise",
        sessionId: q.sessionId,
        requestId: randomUUID(),
        responses: ["b", "blue"],
      };
    const a = e.act(c);
    assert(a.checks.every((x: any) => !x.correct));
    assert.deepEqual(e.act(c), a);
    const b = e.act({
      ...c,
      requestId: randomUUID(),
      responses: ["a", "color"],
    });
    assert.deepEqual(b.firstResponses, ["b", "blue"]);
    assert.equal(b.submissionCount, 2);
    assert(b.checks.every((x: any) => x.correct));
  } finally {
    f.cleanup();
  }
});
test("session expiration, isolation and resource limits do not persist learner data", async () => {
  const f = await fixture();
  try {
    let now = 1000;
    const e = new EnglishTraining(f.content, () => now),
      q = e.start({
        action: "start",
        groupId: "synthetic-group",
        mode: "full",
      }),
      e2 = new EnglishTraining(f.content);
    assert.throws(() => action(e2, q, "summary"));
    now += 3600001;
    assert.throws(() => action(e, q, "summary"));
    assert.equal(e.sessions.size, 0);
    assert.throws(() =>
      e.start({
        action: "start",
        groupId: "synthetic-group",
        wordIds: ["unknown"],
      }),
    );
  } finally {
    f.cleanup();
  }
});
test("bundle/media tampering fails closed and source aliases retain canonical IDs", async () => {
  const f = await fixture();
  try {
    assert.equal(
      f.content.publicCard("old-synthetic-candy").id,
      "synthetic-candy",
    );
    assert.equal(
      f.content.publicCard("synthetic-candy").groupId,
      "synthetic-group",
    );
    const path =
      f.content.bundle.media[Object.keys(f.content.bundle.media)[0]].path;
    writeFileSync(f.directory + "/" + path, "tamper");
    assert.throws(() =>
      f.content.media(Object.keys(f.content.bundle.media)[0]),
    );
    writeFileSync(f.directory + "/bundle.json", "{}");
    assert.throws(() => new EnglishContent(f.directory));
  } finally {
    f.cleanup();
  }
});
test("public pack format rejects external/SVG images, missing fields, bad chunks, missing target and future versions", () => {
  const word = {
    word: "candy",
    partOfSpeech: "n.",
    ipa: "/x/",
    lemma: "candy",
    definition: "A sweet food.",
    example: "I like candy.",
    memoryTip: "Say it.",
    spellingChunks: ["can", "dy"],
    image: "data:image/png;base64,aGVsbG8=",
  };
  const p = {
    format: "kevin-word-quest-ai-pack",
    version: 1,
    title: "Synthetic",
    words: [word],
  };
  assert.equal(inspectPack(p).words.length, 1);
  for (const bad of [
    { ...p, version: 2 },
    { ...p, words: [{ ...word, image: "https://example.invalid/x.png" }] },
    { ...p, words: [{ ...word, image: "data:image/svg+xml;base64,AAAA" }] },
    { ...p, words: [{ ...word, spellingChunks: ["can"] }] },
    { ...p, words: [{ ...word, example: "Other." }] },
    { ...p, words: [word, word] },
  ])
    assert.throws(() => inspectPack(bad));
});

test("LAN HTTP IDs remain valid v4 UUIDs with secure-context-only APIs absent", async () => {
  const { englishUUID } = await import("../../packages/english/id.ts");
  const ids = new Set(Array.from({ length: 100 }, () => englishUUID()));
  assert.equal(ids.size, 100);
  for (const id of ids)
    assert.match(
      id,
      /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/,
    );
});

test("retried summary is a historical snapshot; final next returns the result atomically", async () => {
  const f = await fixture();
  try {
    const e = new EnglishTraining(f.content),
      q = e.start({
        action: "start",
        groupId: "synthetic-group",
        mode: "full",
        wordIds: ["synthetic-candy"],
      });
    const c = {
      action: "summary",
      sessionId: q.sessionId,
      requestId: randomUUID(),
    };
    assert.equal(e.act(c).evidence.length, 0);
    action(e, q, "answer", { answer: "candy" });
    assert.equal(e.act(c).evidence.length, 0);
    const done = action(e, q, "next");
    assert(done.done);
    assert.equal(done.evidence.length, 1);
  } finally {
    f.cleanup();
  }
});

test("original V1 mimeType/base64 and source-only title variants remain importable", () => {
  const w = {
    word: "candy",
    pos: "n.",
    ipa: "/x/",
    lemma: "candy",
    en: "A sweet food.",
    example: "I like candy.",
    tip: "Say it.",
    spellingChunks: ["can", "dy"],
    image: { mimeType: "image/jpg", base64: "aGVs\nbG8=" },
  };
  const p = {
    format: "kevin-word-quest-ai-pack",
    version: 1,
    source: "Synthetic source",
    words: [w],
  };
  const x = inspectPack(p);
  assert.equal(x.title, "Synthetic source");
  assert.equal(x.words[0].image, "data:image/jpeg;base64,aGVsbG8=");
});
