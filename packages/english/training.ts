// Anonymous page-only English training. Never imports records, auth, a wallet, or browser storage.
import { englishUUID as randomUUID } from "./id.ts";
import { z } from "zod";
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
    wordIds: z.array(z.string().max(160)).max(30).optional(),
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
    ]),
    sessionId: z.string().uuid(),
    taskId: z.string().uuid().optional(),
    requestId: z.string().uuid(),
    answer: z.string().max(200).optional(),
    checks: z.array(z.boolean()).length(3).optional(),
    responses: z.array(z.string().max(200)).max(12).optional(),
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
    if (!t)
      return {
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
      (!clueContainsAnswer(t.card.en, t.card) ? t.card.en : "");
    const a = t.answers.at(-1);
    return {
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
  start(raw: unknown) {
    this.sweep();
    const x = startSchema.parse(raw);
    if (this.sessions.size >= 256)
      throw Error("体验窗口较多，请关闭一些窗口或稍后再试。");
    const group = this.content.group(x.groupId).group;
    const ids = x.wordIds ?? group.wordIds;
    if (
      !ids.length ||
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
    const tasks: Task[] = modes.flatMap((mode) =>
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
      return replay.result;
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
    } else {
      if (!t || c.taskId !== t.id) throw Error("题目已切换，请使用当前题目。");
      if (c.action === "answer") {
        if (t.passed) throw Error("本题已完成，可以进入下一题。");
        const answer = c.answer?.trim();
        if (!answer) throw Error("先写下你的答案。");
        const correct = spellingAnswersFor(t.card).includes(
          normalizeAnswer(answer),
        );
        const assisted = t.hint || t.shown;
        const first = t.answers.length === 0;
        const at = this.now();
        t.answers.push({ answer, correct, assisted, at });
        t.passed = correct;
        s.evidence.push({
          subjectId: "english",
          bankId: t.card.bankId,
          wordId: t.card.id,
          lessonOrUnitId: s.groupId,
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
      }
      result = {
        ...this.view(s),
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
    s.receipts.set(c.requestId, { body, result });
    return result;
  }
}
