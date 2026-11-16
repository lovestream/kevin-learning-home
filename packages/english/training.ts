// Anonymous page-only English training. Never imports records, auth, a wallet, or browser storage.
import { englishUUID as randomUUID } from "./id.ts";
import { z } from "zod";
import { sprintBatches, evaluateSprint } from "./sprint.ts";
import type { SprintView } from "./contract.ts";
import type { EnglishBundle, EnglishGroup } from "./contract.ts";
type EnglishReadModel = {
  cards: Map<string, EnglishCard>;
  card: (id: string) => EnglishCard;
  group: (id: string) => { group: EnglishGroup };
  bundle: Pick<EnglishBundle, "exerciseAnswers">;
};
import type { EnglishCard, QuizView, AttemptEvidence } from "./contract.ts";
import {
  normalizeAnswer,
  spellingAnswersFor,
  clueContainsAnswer,
  quizClueFor,
  coreExerciseAnswerMatches,
  makeMask,
} from "./source-grading.mjs";
function definitionWithoutTarget(card: EnglishCard) {
  // Original Core definitions include the headword. Keep the useful meaning,
  // replacing complete target spellings instead of dropping the whole clue.
  // Fixed-width blank does not reveal length; never send the original sentence.
  let clue = card.en;
  for (const answer of [...spellingAnswersFor(card)].sort(
    (a, b) => b.length - a.length,
  )) {
    const escaped = answer.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    clue = clue.replace(
      new RegExp("(?<![A-Za-z0-9])" + escaped + "(?![A-Za-z0-9])", "gi"),
      "____",
    );
  }
  // Use the same source leakage oracle for inflected tokens (stairs, tied,
  // directions, ...), without widening accepted spelling answers.
  clue = clue.replace(/[A-Za-z]+(?:['’-][A-Za-z]+)*/g, (token) =>
    clueContainsAnswer(token, card) ? "____" : token,
  );
  return !clueContainsAnswer(clue, card) &&
    clue.replace(/[^a-z]/gi, "").length > 4
    ? clue
    : "";
}
type Task = {
  id: string;
  card: EnglishCard;
  mode: "cloze" | "full";
  mask: string | null;
  hint: boolean;
  audio: boolean;
  shown: boolean;
  answers: {
    answer: string;
    correct: boolean;
    assisted: boolean;
    at: number;
  }[];
  passed: boolean;
};
type Session = {
  id: string;
  groupId: string;
  source: "new" | "review" | "sprint";
  tasks: Task[];
  index: number;
  expires: number;
  receipts: Map<string, { body: string; result: unknown }>;
  evidence: AttemptEvidence[];
  sprint?: SprintView & {
    wordIds: string[];
    mistakeIds: string[];
    stageStart: number;
    nextCycle?: number;
  };
  workbook?: {
    first: string[];
    history: { responses: string[]; at: number }[];
  };
};
const startSchema = z
  .object({
    action: z.literal("start"),
    groupId: z.string().max(120),
    mode: z.enum(["cloze", "full", "sequence", "sprint"]).default("sequence"),
    source: z.enum(["new", "review", "sprint"]).default("new"),
    wordIds: z.array(z.string().max(160)).max(50).optional(),
  })
  .strict();
const commandSchema = z
  .object({
    action: z.enum([
      "answer",
      "hint",
      "audio",
      "reference",
      "next",
      "summary",
      "close",
      "exercise",
      "sprint-advance",
    ]),
    sessionId: z.string().uuid(),
    taskId: z.string().uuid().optional(),
    requestId: z.string().uuid(),
    answer: z.string().max(200).optional(),
    checks: z.array(z.boolean()).length(3).optional(),
    responses: z.array(z.string().max(200)).max(12).optional(),
  })
  .strict();
const sprintStartSchema = z
  .object({
    action: z.literal("sprint-start"),
    bankId: z.enum(["core2000", "movers", "ket", "pet"]),
    day: z.number().int().min(1).max(999),
  })
  .strict();
export class EnglishTraining {
  readonly content: EnglishReadModel;
  readonly sessions = new Map<string, Session>();
  readonly now: () => number;
  constructor(content: EnglishReadModel, now = Date.now) {
    this.content = content;
    this.now = now;
  }
  clear() {
    this.sessions.clear();
  }
  sweep() {
    for (const [id, s] of this.sessions)
      if (s.expires <= this.now()) this.sessions.delete(id);
  }
  view(s: Session): QuizView {
    const t = s.tasks[s.index];
    const sprint = s.sprint
      ? {
          bankId: s.sprint.bankId,
          day: s.sprint.day,
          days: s.sprint.days,
          size: s.sprint.size,
          phase: s.sprint.phase,
          cycle: s.sprint.cycle,
          score: s.sprint.score,
          nextPhase: s.sprint.nextPhase,
          history: s.sprint.history,
        }
      : undefined;
    if (!t)
      return {
        sprint,
        sessionId: s.id,
        taskId: s.tasks.at(-1)!.id,
        index: s.tasks.length,
        total: s.tasks.length,
        mode: "full",
        source: s.source,
        clue: "",
        image: null,
        mask: null,
        hint: null,
        usedHint: false,
        usedAudio: false,
        attempts: 0,
        answerShown: false,
        done: true,
      };
    const clue =
      quizClueFor(t.card) ||
      (!clueContainsAnswer(t.card.zh, t.card) ? t.card.zh : "") ||
      (!clueContainsAnswer(t.card.en, t.card) ? t.card.en : "") ||
      definitionWithoutTarget(t.card);
    const a = t.answers.at(-1);
    return {
      sprint,
      sessionId: s.id,
      taskId: t.id,
      index: s.index,
      total: s.tasks.length,
      mode: t.mode,
      source: s.source,
      clue,
      image: t.card.image,
      mask: t.mask,
      hint: t.hint ? "首字母：" + [...t.card.word][0] : null,
      usedHint: t.hint,
      usedAudio: t.audio,
      attempts: t.answers.length,
      answerShown: t.shown,
      ...(t.answers.length
        ? {
            firstAnswer: {
              answer: t.answers[0].answer,
              correct: t.answers[0].correct,
              assisted: t.answers[0].assisted,
            },
          }
        : {}),
      ...(a
        ? {
            feedback: {
              correct: a.correct,
              answer: a.correct || t.shown ? t.card.word : "",
              definition: a.correct || t.shown ? t.card.en : "",
              nearMiss:
                !a.correct &&
                t.card.semanticAlternatives.some(
                  (x) => normalizeAnswer(x) === normalizeAnswer(a.answer),
                ),
            },
          }
        : {}),
      done: false,
    };
  }
  tasks(ids: string[], modes: readonly ("cloze" | "full")[]): Task[] {
    return modes.flatMap((mode) =>
      ids.map((id) => {
        const c = this.content.card(id);
        const hidden = makeMask(c.word, randomUUID(), mode);
        const mask =
          mode === "cloze"
            ? [...c.word].map((ch, i) => (hidden.has(i) ? "_" : ch)).join("")
            : null;
        return {
          id: randomUUID(),
          card: c,
          mode,
          mask,
          hint: false,
          audio: false,
          shown: false,
          answers: [],
          passed: false,
        };
      }),
    );
  }
  sprintStart(raw: unknown) {
    const x = sprintStartSchema.parse(raw);
    const batches = sprintBatches([...this.content.cards.values()], x.bankId);
    const day = Math.min(x.day, batches.length),
      batch = batches[day - 1];
    const first = this.content.card(batch.wordIds[0]);
    const groupId = first.sourceGroupId;
    if (!groupId) throw Error("冲刺来源单元信息缺失，请更新家庭内容包。");
    const q = this.start({
      action: "start",
      groupId,
      mode: "cloze",
      source: "sprint",
      wordIds: batch.wordIds,
    });
    const s = this.sessions.get(q.sessionId)!;
    s.sprint = {
      bankId: x.bankId,
      day,
      days: batches.length,
      size: batch.wordIds.length,
      phase: "cloze",
      cycle: 1,
      score: 0,
      history: [],
      wordIds: [...batch.wordIds],
      mistakeIds: [],
      stageStart: 0,
    };
    return this.view(s);
  }
  start(raw: unknown) {
    this.sweep();
    const x = startSchema.parse(raw);
    if (this.sessions.size >= 256)
      throw Error("体验窗口较多，请关闭一些窗口或稍后再试。");
    const group = this.content.group(x.groupId).group;
    const ids = x.wordIds ?? group.wordIds;
    if (
      !ids.length ||
      new Set(ids).size !== ids.length ||
      ids.some(
        (id) =>
          !this.content.cards.has(id) ||
          this.content.card(id).bankId !== group.bankId,
      )
    )
      throw Error("学习组中的单词无效。");
    const modes =
      x.mode === "sequence"
        ? (["cloze", "full"] as const)
        : x.mode === "cloze"
          ? (["cloze"] as const)
          : (["full"] as const);
    const tasks = this.tasks(ids, modes);
    const s: Session = {
      id: randomUUID(),
      groupId: x.groupId,
      source: x.mode === "sprint" ? "sprint" : x.source,
      tasks,
      index: 0,
      expires: this.now() + 60 * 60 * 1000,
      receipts: new Map(),
      evidence: [],
    };
    this.sessions.set(s.id, s);
    return this.view(s);
  }
  act(raw: unknown): any {
    if (
      raw &&
      typeof raw === "object" &&
      (raw as any).action === "sprint-start"
    )
      return this.sprintStart(raw);
    if (raw && typeof raw === "object" && (raw as any).action === "start")
      return this.start(raw);
    this.sweep();
    const c = commandSchema.parse(raw),
      s = this.sessions.get(c.sessionId);
    if (!s) throw Error("这次临时练习已结束或已过期，请重新开始。");
    const body = JSON.stringify(c),
      replay = s.receipts.get(c.requestId);
    if (replay) {
      if (replay.body !== body)
        throw Error("这条操作已经提交，不能用同一编号改写。");
      return structuredClone(replay.result);
    }
    if (s.receipts.size >= 1000)
      throw Error("这次练习操作较多，请结束后重新开始。");
    s.expires = this.now() + 60 * 60 * 1000;
    const t = s.tasks[s.index];
    let result: any;
    if (c.action === "summary")
      result = {
        sessionId: s.id,
        evidence: s.evidence,
        completed: s.index >= s.tasks.length,
        storage: "page-memory-only",
        rewardEligible: false,
      };
    else if (c.action === "close") {
      this.sessions.delete(s.id);
      return { closed: true };
    } else if (c.action === "exercise") {
      if (s.sprint)
        throw Error("教材页练习请从原学习组打开，不能混入冲刺记录。");
      const g = this.content.group(s.groupId).group,
        answers =
          g.exercise && this.content.bundle.exerciseAnswers[g.exercise.id];
      if (!answers || !c.responses || c.responses.length !== answers.length)
        throw Error("请按这页练习的题数填写。");
      s.workbook ??= { first: [...c.responses], history: [] };
      s.workbook.history.push({ responses: [...c.responses], at: this.now() });
      result = {
        firstResponses: s.workbook.first,
        submissionCount: s.workbook.history.length,
        checks: answers.map((a, i) => ({
          index: i + 1,
          correct: coreExerciseAnswerMatches(c.responses![i], a),
        })),
        storage: "page-memory-only",
        rewardEligible: false,
      };
    } else if (c.action === "sprint-advance") {
      const p = s.sprint;
      if (
        !p ||
        s.index < s.tasks.length ||
        !p.nextPhase ||
        p.nextPhase === "complete"
      )
        throw Error("先完成当前冲刺阶段。");
      p.phase = p.nextPhase;
      p.cycle = p.nextCycle ?? p.cycle;
      delete p.nextPhase;
      delete p.nextCycle;
      p.stageStart = s.evidence.length;
      s.tasks = this.tasks(p.phase === "drill" ? p.mistakeIds : p.wordIds, [
        p.phase === "cloze" ? "cloze" : "full",
      ]);
      s.index = 0;
      result = this.view(s);
    } else {
      if (
        s.sprint?.phase === "final" &&
        ["hint", "audio", "reference"].includes(c.action)
      )
        throw Error("整组复测不提供提示或参考。需要帮助可以退出后回练。");
      if (!t || c.taskId !== t.id) throw Error("题目已切换，请使用当前题目。");
      if (c.action === "answer") {
        if (t.passed) throw Error("本题已完成，可以进入下一题。");
        const answer = c.answer?.trim();
        if (!answer) throw Error("先写下你的答案。");
        const correct = spellingAnswersFor(t.card).includes(
          normalizeAnswer(answer),
        );
        const assisted = t.hint || t.shown || t.audio;
        const first = t.answers.length === 0;
        const at = this.now();
        t.answers.push({ answer, correct, assisted, at });
        t.passed = correct;
        s.evidence.push({
          subjectId: "english",
          bankId: t.card.bankId,
          wordId: t.card.id,
          lessonOrUnitId: t.card.sourceGroupId || s.groupId,
          trainingGroupId: s.groupId,
          ...(s.sprint
            ? {
                sprintPhase: s.sprint.phase,
                sprintCycle: s.sprint.cycle,
                sprintDay: s.sprint.day,
              }
            : {}),
          contentVersion: t.card.contentVersion,
          attemptId: c.requestId,
          occurredAt: at,
          source: s.source,
          mode: t.mode,
          answer,
          firstAttempt: first,
          firstAttemptCorrect: first && correct,
          answerCorrect: correct,
          usedHint: t.hint,
          answerShown: t.shown,
          usedAudio: t.audio,
          cueType: t.audio
            ? "audio-dictation"
            : t.mode === "cloze"
              ? "partial-spelling"
              : "definition",
          selfCheck: c.checks ?? [false, false, false],
          storage: "page-memory-only",
          rewardEligible: false,
        });
      } else if (c.action === "hint") t.hint = true;
      else if (c.action === "reference") t.shown = true;
      else if (c.action === "audio") t.audio = true;
      else if (c.action === "next") {
        if (!t.passed) throw Error("先订正这一题，再进入下一题。");
        s.index++;
        if (s.sprint && s.index === s.tasks.length) {
          const p = s.sprint;
          const evaluated = evaluateSprint(
            p.phase,
            p.wordIds,
            s.evidence.slice(p.stageStart),
            p.cycle,
          );
          p.score = evaluated.score;
          p.nextPhase = evaluated.nextPhase;
          p.nextCycle = evaluated.cycle;
          if (p.phase === "full" || p.phase === "final")
            p.mistakeIds = evaluated.mistakes;
          p.history.push({
            phase: p.phase,
            cycle: p.cycle,
            score: evaluated.score,
            total: p.phase === "drill" ? s.tasks.length : p.size,
          });
          if (evaluated.nextPhase === "complete") p.phase = "complete";
        }
      }
      result = {
        ...this.view(s),
        ...(s.index >= s.tasks.length ? { evidence: s.evidence } : {}),
        ...(c.action === "audio" ? { speech: t.card.word } : {}),
        ...(c.action === "answer" ? { latestEvidence: s.evidence.at(-1) } : {}),
        ...(c.action === "reference"
          ? {
              reference: {
                word: t.card.word,
                en: t.card.en,
                example: t.card.example,
              },
            }
          : {}),
      };
    }
    const snapshot = structuredClone(result);
    s.receipts.set(c.requestId, { body, result: snapshot });
    return structuredClone(snapshot);
  }
}
