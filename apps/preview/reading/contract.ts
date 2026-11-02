import { z } from "zod";
import { lessonId, widgets, diagramKinds } from "../contract.ts";
const text = z.string().min(1).max(12000),
  label = z.string().min(1).max(240);
export const articleSchema = z.strictObject({
  lessonId,
  retellPrompt: text,
  blocks: z
    .array(
      z.strictObject({
        blockId: label,
        type: z.enum([
          "leadQuestion",
          "manipulative",
          "text",
          "workedExample",
          "compareCases",
          "checkpoint",
          "methodBridge",
          "practice",
        ]),
        title: text,
        text: text.optional(),
        paragraphs: z.array(text).max(30).optional(),
        diagram: z.enum(diagramKinds).optional(),
        widget: z.enum(widgets).optional(),
        examples: z
          .array(
            z.strictObject({
              title: text,
              steps: z
                .array(
                  z.strictObject({
                    math: text,
                    why: text,
                    expressionBefore: text.optional(),
                    operation: text.optional(),
                    expressionAfter: text.optional(),
                    units: text.optional(),
                  }),
                )
                .max(30),
            }),
          )
          .max(20)
          .optional(),
        cases: z
          .array(
            z.strictObject({
              label: text,
              math: text,
              explanation: text,
              valid: z.boolean(),
            }),
          )
          .max(20)
          .optional(),
        methods: z
          .array(
            z.strictObject({
              id: label,
              name: text,
              question: text.optional(),
              action: text,
              condition: text,
              counterexample: text,
            }),
          )
          .max(20)
          .optional(),
        prompt: text.optional(),
        options: z.array(text).max(10).optional(),
        responseType: z.enum(["choice", "self-explanation"]).optional(),
        revisit: label.optional(),
      }),
    )
    .min(1)
    .max(20),
});
export type Article = z.infer<typeof articleSchema>;
export const checkpointInput = z.strictObject({
  lessonId,
  blockId: label,
  choice: z.number().int().min(0).max(9).optional(),
  explanation: z.string().max(240).optional(),
});
export const checkpointResult = z.strictObject({
  feedback: text,
  correct: z.boolean().nullable(),
  reference: text.optional(),
  persisted: z.literal(false),
});
