// Adapted from fixed word-request@d0b42a8 assets/app.js:338-435,522-535,1864-1878.
// Pure grouping/transition rules; no date, persistence, wallet, or private imports.
import type { EnglishCard, AttemptEvidence, SprintView } from "./contract.ts";
export function sprintBatches(cards: EnglishCard[], bankId: string) {
  let words = cards.filter((c) => c.bankId === bankId);
  if (!words.length) throw Error("这个词库还没有可用的冲刺内容。");
  const batches: { wordIds: string[]; title: string; scheduleKey: string }[] =
    [];
  if (bankId === "movers") {
    words = [...words].sort(
      (a, b) =>
        (a.cardType === "phrase" ? 10000 : 0) +
          (a.sourceNumber ?? 9999) -
          (b.cardType === "phrase" ? 10000 : 0) -
          (b.sourceNumber ?? 9999) || a.id.localeCompare(b.id),
    );
    const singles = words.filter((c) => c.cardType !== "phrase"),
      phrases = words.filter((c) => c.cardType === "phrase");
    // Never silently fall back to generic 30s for an old/incomplete Movers bundle.
    if (
      !singles.length ||
      singles.some((c) => !Number.isInteger(c.sourceDay) || c.sourceDay! < 1) ||
      words.some(
        (c) => !Number.isInteger(c.sourceNumber) || c.sourceNumber! < 1,
      )
    )
      throw Error("Movers 冲刺需要原词表的分日信息，请更新家庭内容包。");
    for (const day of [...new Set(singles.map((c) => c.sourceDay!))].sort(
      (a, b) => a - b,
    ))
      batches.push({
        wordIds: singles.filter((c) => c.sourceDay === day).map((c) => c.id),
        title: `词表 Day ${day}`,
        scheduleKey: "movers-word-list-2025:v2",
      });
    for (let i = 0; i < phrases.length; i += 20)
      batches.push({
        wordIds: phrases.slice(i, i + 20).map((c) => c.id),
        title: `短语 ${i + 1}–${Math.min(i + 20, phrases.length)}`,
        scheduleKey: "movers-word-list-2025:v2",
      });
  } else {
    for (let i = 0; i < words.length; i += 30)
      batches.push({
        wordIds: words.slice(i, i + 30).map((c) => c.id),
        title: `词表 ${i + 1}–${Math.min(i + 30, words.length)}`,
        scheduleKey: "fixed-30:v1",
      });
  }
  return batches;
}
export function evaluateSprint(
  phase: SprintView["phase"],
  ids: string[],
  evidence: AttemptEvidence[],
  cycle: number,
) {
  const clean = new Set(
    evidence
      .filter(
        (e) =>
          e.firstAttempt &&
          e.firstAttemptCorrect &&
          !e.usedHint &&
          !e.answerShown &&
          !e.usedAudio,
      )
      .map((e) => e.wordId),
  );
  const mistakes = ids.filter((id) => !clean.has(id)),
    score = ids.length - mistakes.length;
  const nextPhase: SprintView["phase"] =
    phase === "cloze"
      ? "full"
      : phase === "full"
        ? mistakes.length
          ? "drill"
          : "final"
        : phase === "drill"
          ? "final"
          : phase === "final"
            ? mistakes.length
              ? "drill"
              : "complete"
            : "complete";
  return {
    nextPhase,
    score,
    mistakes,
    cycle: phase === "final" && mistakes.length ? cycle + 1 : cycle,
  };
}
