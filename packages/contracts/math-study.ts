import { z } from "zod";
const id = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9:._-]{0,179}$/),
  answer = z
    .record(id, z.string().max(200))
    .refine((x) => Object.keys(x).length <= 12);
export const studyChannels = [
  "reading",
  "session-start",
  "session-draft",
  "help",
  "self-check",
  "submit",
  "note",
  "thinking",
  "parent-thinking",
  "parent-formal",
] as const;
// Input structure is strict; source domain validators additionally enforce the
// phase, revision, installed content, widget journal and evidence semantics.
export const studyEventSchema = z
  .object({
    action: z.string().max(32).optional(),
    eventId: id.optional(),
    lessonId: id.optional(),
    taskId: id.optional(),
    sessionId: id.optional(),
    id: id.optional(),
    revision: z.number().int().nonnegative().optional(),
    blockId: id.optional(),
    widgets: z.record(id, z.unknown()).optional(),
    setName: z
      .enum(["warmup", "core", "transfer", "challenge", "review"])
      .optional(),
    assessment: z.literal("withdrawn-v1").optional(),
    index: z.number().int().optional(),
    answers: z.record(id, answer).optional(),
    answer: z.union([answer, z.string().max(1200)]).optional(),
    kind: z.enum(["hint", "solution", "article"]).optional(),
    phase: z.enum(["first", "evidence"]).optional(),
    evidence: z
      .object({
        checks: z.array(z.string().max(240)).length(3),
        reflection: z.string().max(240),
        finalConfirmed: z.literal(true),
        format: z.literal("checklist-v1").optional(),
        firstOperation: z.string().max(120).optional(),
        intermediate: z.string().max(120).optional(),
      })
      .strict()
      .optional(),
    modelStateVersion: z.string().max(120).optional(),
    text: z.string().max(1200).optional(),
    command: z.string().max(80).optional(),
    value: z.number().finite().optional(),
    checks: z.array(z.boolean()).length(3).optional(),
    reflection: z.string().max(600).optional(),
    level: z.number().int().min(0).max(3).optional(),
    verdict: z.string().max(40).optional(),
    comment: z.string().max(1200).optional(),
    reviewer: z.string().max(40).optional(),
    causes: z.array(z.string().max(32)).max(5).optional(),
  })
  .strict();
