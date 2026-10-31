import { z } from "zod";
export const trainingEventSchema = z
  .object({
    action: z.string().max(32),
    attemptId: z.string().max(120),
    eventId: z.string().max(120),
    expectedRevision: z.number().int().optional(),
    caseId: z.string().max(120).optional(),
    version: z.string().max(120).optional(),
    errorFamilyId: z.string().max(80).optional(),
    mode: z.enum(["practice", "transfer"]).optional(),
    value: z.string().max(1600).optional(),
    status: z.enum(["answered", "blank", "uncertain"]).optional(),
    reasoning: z.string().max(500).optional(),
    step: z.number().int().nullable().optional(),
    reason: z.number().int().optional(),
    category: z.string().max(32).optional(),
    checkValue: z.string().max(80).optional(),
    checkExpression: z.string().max(160).optional(),
    checkStatus: z.enum(["complete", "uncertain"]).optional(),
    explanation: z.string().max(500).optional(),
  })
  .strict();
