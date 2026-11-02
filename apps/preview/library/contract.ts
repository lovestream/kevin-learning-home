import { z } from "zod";
import { lessonId } from "../contract.ts";
import { answerSchema } from "../practice/contract.ts";
z.config({ jitless: true });
const text = z.string().min(1).max(10000),
  label = z.string().min(1).max(240);
const legacy = z.strictObject({
  id: lessonId,
  kind: z.literal("legacy"),
  world: z.enum([
    "numbers",
    "relations",
    "geometry",
    "patterns",
    "logic",
    "fractions",
  ]),
  grade: z.union([z.literal(4), z.literal(5), z.literal(6)]),
  title: label,
  subtitle: text,
  concept: text,
  story: text,
  discovery: text,
  steps: z.array(text).max(30),
  takeaway: text,
  lab: z.enum([
    "table",
    "numberline",
    "geometry",
    "array",
    "balance",
    "fraction",
    "bar",
  ]),
  labConfig: z.record(
    z.string().max(80),
    z.union([z.number().finite(), z.string().max(240)]),
  ),
  whyQuestion: text,
  humanNeed: text,
  invention: text,
  essence: text,
  extensionChain: z.array(text).max(30),
  retellPrompt: text,
  prerequisites: z.array(lessonId).max(30),
});
const thinking = z.strictObject({
  id: lessonId,
  kind: z.literal("thinking"),
  title: label,
  originUnit: lessonId,
  parentLessonId: lessonId,
  thinkingLabel: label,
  classification: label,
  minutes: z.string().min(1).max(80),
  bridgeFromCore: text,
  question: text,
  contentVersion: label,
  publicationStatus: z.literal("guided-study"),
});
export const entrySchema = z.discriminatedUnion("kind", [legacy, thinking]);
export type Entry = z.infer<typeof entrySchema>;
export type LegacyEntry = Extract<Entry, { kind: "legacy" }>;
export type ThinkingEntry = Extract<Entry, { kind: "thinking" }>;
export const visualSchema = z.strictObject({
  kind: z.enum([
    "banana",
    "lengths",
    "cards",
    "road",
    "array",
    "hundreds",
    "expression",
    "manual",
  ]),
  values: z.array(z.string().max(240)).max(12),
});
const response = z.strictObject({
  kind: z.enum(["number", "choice", "ordering", "oral"]),
  question: label,
  unit: z.string().max(80),
  options: z.array(label).max(10),
});
export const publicCaseSchema = z.strictObject({
  id: lessonId,
  title: label,
  prompt: text,
  steps: z.array(label).min(1).max(10),
  reasons: z
    .array(z.strictObject({ id: label, text: label }))
    .min(2)
    .max(5),
  repair: response,
  verify: response,
  visual: visualSchema,
  simulation: z.literal(true),
});
export type PublicCase = z.infer<typeof publicCaseSchema>;
export const privateCaseSchema = z.strictObject({
  id: lessonId,
  content: z.strictObject({
    title: label,
    prompt: text,
    steps: z.array(label).min(1).max(10),
    verdict: z.enum(["correct", "wrong"]),
    errorStep: z.number().int().min(0).max(9).nullable(),
    family: label,
    reasons: z.array(label).min(2).max(5),
    reason: z.number().int().min(0).max(4),
    repair: response.extend({ answer: text }),
    verify: response.extend({ answer: text }),
    solution: text,
    visual: visualSchema,
    hints: z.array(text).length(3),
    sourceNotes: text,
  }),
});
export type PrivateCase = z.infer<typeof privateCaseSchema>;
const detectiveAnswer = z.strictObject({
  verdict: z.enum(["correct", "wrong"]),
  errorStep: z.number().int().min(0).max(9).nullable(),
  reason: z.string().regex(/^r[0-4]$/),
  repair: z.string().min(1).max(1000),
  verify: z.string().min(1).max(1000),
});
export const detectiveSubmissionSchema = z.strictObject({
  caseId: lessonId,
  firstAnswer: detectiveAnswer,
  checks: z.tuple([z.literal(true), z.literal(true), z.literal(true)]),
  finalAnswer: detectiveAnswer,
});
export const detectiveResultSchema = z.strictObject({
  caseId: lessonId,
  status: z.enum(["correct", "incorrect", "pendingReview", "invalidInput"]),
  message: text,
  hints: z.array(text).length(3).optional(),
  solution: text.optional(),
  persisted: z.literal(false),
});
export type DetectiveResult = z.infer<typeof detectiveResultSchema>;
const method = z.strictObject({
  thinkingSkillId: label,
  title: label,
  observableAction: text,
  applicationStructures: z.array(text).max(40),
  guide: z
    .strictObject({
      question: text,
      condition: text,
      why: text,
      example: text,
      counterexample: text,
      lessonIds: z.array(lessonId).max(30),
    })
    .nullable(),
});
export const inverseSchema = z.strictObject({
  taskId: label,
  lessonId,
  direction: label,
  unknown: label,
  group: z.enum(["warmup", "core", "transfer", "challenge", "review"]),
  title: label,
});
export const librarySchema = z.strictObject({
  entries: z.array(entrySchema).length(71),
  inverse: z.array(inverseSchema).length(11),
  inverseClassroomId: lessonId,
  cases: z.array(publicCaseSchema).length(14),
  methods: z.array(method).length(28),
  counts: z.strictObject({
    thinking: z.literal(17),
    deferred: z.literal(43),
    legacy: z.literal(54),
    legacyQuestions: z.literal(432),
    blueprints: z.literal(168),
    cases: z.literal(14),
    methodGuides: z.literal(6),
  }),
});
export type Library = z.infer<typeof librarySchema>;
