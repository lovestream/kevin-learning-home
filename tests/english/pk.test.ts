import { test } from "node:test";
import assert from "node:assert/strict";
import { EnglishTraining } from "../../packages/english/training.ts";
import { englishUUID } from "../../packages/english/id.ts";
import { fixture } from "./fixture.ts";
import type { QuizView } from "../../packages/english/contract.ts";
const command = (e: EnglishTraining, q: QuizView, action: string, extra = {}) =>
  e.act({
    action,
    sessionId: q.sessionId,
    taskId: q.taskId,
    requestId: englishUUID(),
    ...extra,
  });
async function setup() {
  const f = await fixture();
  const cards = [...f.content.cards.values()];
  for (let i = 0; i < 4; i++)
    cards.push({
      ...cards[0],
      id: "extra-" + i,
      word: "word" + String.fromCharCode(98 + i),
      en: "A distinct practice item.",
      zh: "合成意思" + i,
    });
  // Source group is kept for each card; only synthetic content is used.
  const c = f.content;
  for (const card of cards) c.cards.set(card.id, card);
  let now = 100000,
    elapsed = 0;
  const e = new EnglishTraining(
    c,
    () => now,
    () => elapsed,
  );
  return {
    f,
    e,
    setTime: (n: number) => {
      now = 100000 + n;
      elapsed = n;
    },
    setWallTime: (n: number) => {
      now = n;
    },
    start: () => e.act({ action: "pk-start", bankId: "core2000" }) as QuizView,
  };
}
test("PK uses five unique source words; pre-answer view has no keys, answers or help", async () => {
  const x = await setup();
  try {
    const q = x.start(),
      s = x.e.sessions.get(q.sessionId)!;
    assert.equal(q.total, 5);
    assert.equal(q.source, "pk");
    assert.equal(new Set(s.tasks.map((t) => t.card.id)).size, 5);
    assert.equal(q.mode, "full");
    assert.equal(q.mask, null);
    assert.equal(q.pk!.score, 0);
    for (const t of s.tasks) {
      assert.equal(JSON.stringify(q).includes(t.card.id), false);
      assert.equal(q.clue.includes(t.card.word), false);
    }
    assert.equal(q.pk!.review, undefined);
    for (const action of [
      "hint",
      "reference",
      "audio",
      "next",
      "exercise",
      "sprint-advance",
    ])
      assert.throws(() => command(x.e, q, action), /机器人比赛/);
    assert.throws(() => x.e.act({ action: "pk-start", bankId: "custom" }));
  } finally {
    x.f.cleanup();
  }
});
test("PK first wrong/correction remain separate; score and next word are atomic and idempotent", async () => {
  const x = await setup();
  try {
    let q = x.start();
    const s = x.e.sessions.get(q.sessionId)!;
    q = command(x.e, q, "answer", { answer: "not-this-word" });
    assert.equal(q.pk!.score, 0);
    assert.equal(q.firstAnswer!.correct, false);
    const body = {
      action: "answer",
      sessionId: q.sessionId,
      taskId: q.taskId,
      requestId: englishUUID(),
      answer: s.tasks[0].card.word,
    };
    q = x.e.act(body);
    assert.equal(q.pk!.score, 100);
    assert.equal(q.pk!.answered, 1);
    assert.equal(q.index, 1);
    const retry = x.e.act(body);
    assert.deepEqual(retry, q);
    assert.equal(s.evidence.length, 2);
    assert.equal(s.evidence[0].firstAttempt, true);
    assert.equal(s.evidence[0].answerCorrect, false);
    assert.equal(s.evidence[1].firstAttempt, false);
    assert.equal(s.evidence[1].answerCorrect, true);
    assert(s.evidence.every((r) => r.source === "pk" && !r.rewardEligible));
    assert.throws(() => x.e.act({ ...body, answer: "changed" }), /同一编号/);
    while (!q.done)
      q = command(x.e, q, "answer", { answer: s.tasks[q.index].card.word });
    assert.equal(q.pk!.score, 500);
    assert.equal(q.pk!.finished, true);
    assert.equal(q.pk!.outcome, "won");
    assert.equal(q.pk!.review![0].firstCorrect, false);
    assert.equal(q.pk!.review![0].corrected, true);
    assert.equal(q.pk!.review![0].firstAnswer, "not-this-word");
    const frozen = q.pk;
    x.setTime(100000);
    q = command(x.e, q, "pk-tick");
    assert.deepEqual({ ...q.pk, revision: 0 }, { ...frozen, revision: 0 });
  } finally {
    x.f.cleanup();
  }
});
test("PK elapsed time, original bot cadence and timeout are server-owned, not polling frequency", async () => {
  const x = await setup();
  try {
    let q = x.start();
    for (const [ms, bot, seconds] of [
      [999, 0, 45],
      [1000, 100, 44],
      [4999, 100, 41],
      [5000, 200, 40],
      [17000, 500, 28],
    ] as const) {
      x.setTime(ms);
      q = command(x.e, q, "pk-tick");
      assert.equal(q.pk!.botScore, bot);
      assert.equal(q.pk!.seconds, seconds);
    }
    x.setTime(0);
    q = command(x.e, q, "pk-tick");
    assert.equal(q.pk!.seconds, 28, "clock rollback cannot grant time");
    const s = x.e.sessions.get(q.sessionId)!;
    x.setTime(45000);
    x.setWallTime(1); // wall clock correction cannot extend the monotonic deadline
    q = command(x.e, q, "answer", { answer: s.tasks[0].card.word });
    assert.equal(q.done, true);
    assert.equal(q.pk!.reason, "time-up");
    assert.equal(q.pk!.score, 0);
    assert.equal(q.index, 0);
    assert.equal(
      s.evidence.length,
      0,
      "late answer must not create an attempt or reward",
    );
    assert(q.pk!.review!.every((r) => r.firstAnswer === null));
    x.setTime(120000);
    const later = command(x.e, q, "summary");
    assert.equal(later.rewardEligible, false);
    assert.equal(later.pk.score, 0);
    assert.equal(later.completed, false);
    assert.equal(later.pk.seconds, 0);
  } finally {
    x.f.cleanup();
  }
});
test("PK preserves original spelling variants and rejects semantic substitutes", async () => {
  const x = await setup();
  try {
    // Select a synthetic five-card pool whose cards all use this same reviewed pair.
    for (const c of x.e.content.cards.values()) {
      c.word = "colour";
      c.spellingVariants = ["color"];
      c.semanticAlternatives = ["hue"];
      c.zh = "颜色";
    }
    let q = x.start();
    q = command(x.e, q, "answer", { answer: "hue" });
    assert.equal(q.pk!.score, 0);
    assert.equal(q.feedback!.nearMiss, true);
    q = command(x.e, q, "answer", { answer: " COLOR " });
    assert.equal(q.pk!.score, 100);
    assert.equal(
      x.e.sessions.get(q.sessionId)!.evidence[0].firstAttemptCorrect,
      false,
    );
    command(x.e, q, "close");
    assert.equal(x.e.sessions.size, 0);
  } finally {
    x.f.cleanup();
  }
});
