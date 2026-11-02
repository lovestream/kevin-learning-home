import { z } from "zod";
import { visualSchema } from "./library/contract.ts";
const text = z.string(),
  rate = z.object({
    numerator: z.number(),
    denominator: z.number(),
    rate: z.number().nullable(),
  });
export const trainingCatalogSchema = z.object({
  counts: z.object({
    cases: z.number(),
    families: z.number(),
    anonymousBundles: z.number(),
    anonymousCases: z.number(),
  }),
  families: z.array(z.object({ id: text, title: text, focus: text })),
  collections:z.array(z.object({id:text,title:text,selfFamily:text,caseIds:z.array(text)})),
  cases: z.array(
    z.object({
      id: text,
      version: text,
      title: text,
      family: text,
      stepCount:z.number().int().positive(),
      bundleId: text.nullable(),
    }),
  ),
});
const question = z.object({
  id: text,
  prompt: text,
  unit: text,
  errorFamilyId: text,
  check: z
    .object({ pattern: text, target: text, unit: text, instruction: text })
    .optional(),
});
export const selfAttemptSchema = z.object({
  id: text,
  revision: z.number().int(),
  phase: z.enum(["first", "check", "feedback"]),
  mode: text,
  question,
  draft: text,
  firstAnswer: z.object({ value: text, status: text, at: text }).nullable(),
  firstReasoning: text,
  hintExposure: z.array(z.object({ kind: text, at: text, phase: text })),
  hintText: text.nullable(),
  answer: text.optional(),
  explanation: text.optional(),
  preFeedbackRevision: z.object({ value: text, at: text }).optional(),
  currentCheckEvidence: z
    .object({ eligible: z.boolean(), source: text, reason: text })
    .optional(),
  result: z
    .object({
      firstCorrect: z.boolean(),
      finalCorrect: z.boolean(),
      independent: z.boolean(),
      category: text,
    })
    .optional(),
  visual: z
    .object({ kind: z.literal("manual"), values: z.array(text) })
    .optional(),
});
export type SelfAttempt = z.infer<typeof selfAttemptSchema>;
export const caseAttemptSchema = z.object({
  attempt: z.object({
    id: text,
    revision: z.number().int(),
    phase: z.enum(["judge", "evidence", "repair", "verify", "closed"]),
    status: text,
    firstVerdict: text.nullable(),
    feedback: text,
    assisted: z.boolean(),
    draft: text,
  }),
  case: z.object({
    id: text,
    version: text,
    title: text,
    prompt: text,
    steps: z.array(text),
    visual: visualSchema,
    supportsInsufficient: z.boolean(),
    reasons: z.array(text).optional(),
    response: z
      .object({
        kind: text,
        question: text,
        unit: text,
        options: z.array(text),
      })
      .optional(),
    solution: text.optional(),
  }),
});
export type CaseAttempt = z.infer<typeof caseAttemptSchema>;
export const trainingDataSchema = z.object({
  caseHistory:z.array(caseAttemptSchema).default([]),
  families: z.array(
    z.object({
      id: text,
      title: text,
      focus: text,
      available: z.boolean(),
      evidence: text,
      schedule: z
        .object({
          stage: z.number(),
          dueDay: text.nullable(),
          paused: z.boolean(),
        })
        .nullable(),
    }),
  ),
  attempts: z.array(selfAttemptSchema),
  stats: z.object({
    firstCorrect: rate,
    afterCheck: rate,
    effectiveCorrection: rate,
    transfer: rate,
    explanation: text,
  }),
});
export type TrainingData = z.infer<typeof trainingDataSchema>;
