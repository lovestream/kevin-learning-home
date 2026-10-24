import { z } from "zod";
import {
  SOURCE_COMMIT,
  SOURCE_ARTIFACT_SHA,
  PUBLIC_DTO_SHA,
  VISUAL_SOURCES,
} from "./math-reviewed.ts";
export { SOURCE_COMMIT, SOURCE_ARTIFACT_SHA, PUBLIC_DTO_SHA, VISUAL_SOURCES };
export const MATH_LESSON_ID = "G3-U01-B01";
export const MATH_PAGE = "/subjects/math/lessons/G3-U01-B01";
const text = (max = 2000) => z.string().min(1).max(max);
const strings = z.array(text()).max(16);
const visual = z.strictObject({
  type: z.literal("box-camera"),
  title: text(160),
  caption: text(1000),
  values: z.tuple([]),
  labels: z.tuple([]),
});
export const mathLessonSchema = z.strictObject({
  lessonId: z.literal(MATH_LESSON_ID),
  contentVersion: z.literal("2026-10-07.2"),
  editorialRevision: z.literal("2026-10-09.4"),
  sourceStatus: z.literal("draft"),
  lesson: z.strictObject({
    title: text(160),
    question: text(),
    subtitle: text(1000),
    objectives: z
      .array(z.strictObject({ id: text(120), action: text(), scope: text() }))
      .min(1)
      .max(16),
    classroom: z.strictObject({
      story: text(),
      mission: text(),
      predictQuestion: text(),
      predictionOptions: z.array(text(240)).min(1).max(8),
      discovery: strings,
      symbols: strings,
      retell: text(),
      observedEvidence: text(),
      whyQuestion: text(),
      counterexamplePrompt: text(),
    }),
    intro: visual,
    predictionIntro: visual,
    spatial: z.strictObject({
      sceneId: z.literal("G3-U01-B01-MODEL1"),
      type: z.literal("spatial"),
      mode: z.literal("observe"),
      version: z.literal("spatial.v2"),
      dimensions: z.tuple([z.literal(2.4), z.literal(1.5), z.literal(1.2)]),
    }),
  }),
});
const digest = z.string().regex(/^[a-f0-9]{64}$/);
export const mathResponseSchema = mathLessonSchema
  .extend({
    schemaVersion: z.literal(1),
    learnerId: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9:._-]{0,119}$/),
    subjectId: z.literal("math"),
    mode: z.literal("readonly"),
    manifest: z.strictObject({
      sourceCommit: z.literal(SOURCE_COMMIT),
      sourceArtifactSha256: z.literal(SOURCE_ARTIFACT_SHA),
      publicDtoSha256: z.literal(PUBLIC_DTO_SHA),
      visualSources: z
        .array(z.strictObject({ path: text(200), sha256: digest }))
        .length(8),
      externalAssets: z.tuple([]),
      visualArtifactSha256: digest,
    }),
  })
  .superRefine((v, c) => {
    if (
      JSON.stringify(v.manifest.visualSources) !==
      JSON.stringify(VISUAL_SOURCES)
    )
      c.addIssue({ code: "custom", message: "VISUAL_SOURCE_MISMATCH" });
  });
export type MathPayload = z.infer<typeof mathLessonSchema>;
export type MathResponse = z.infer<typeof mathResponseSchema>;
export function publicMathFields(v: MathResponse): MathPayload {
  return {
    lessonId: v.lessonId,
    contentVersion: v.contentVersion,
    editorialRevision: v.editorialRevision,
    sourceStatus: v.sourceStatus,
    lesson: v.lesson,
  };
}
