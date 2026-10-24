// Server/import tooling only. Explicit source projection; never import authoring banks.
import {
  mathLessonSchema,
  type MathPayload,
} from "../../contracts/math-readonly.ts";
function object(v: unknown): Record<string, unknown> {
  if (!v || typeof v !== "object" || Array.isArray(v))
    throw Error("SOURCE_SCHEMA_INVALID");
  return v as Record<string, unknown>;
}
const list = (v: unknown) => {
  if (!Array.isArray(v)) throw Error("SOURCE_SCHEMA_INVALID");
  return v;
};
function intro(v: unknown) {
  const o = object(v);
  return {
    type: o.type,
    title: o.title,
    caption: o.caption,
    values: list(o.values),
    labels: list(o.labels),
  };
}
export function projectSourceLesson(value: unknown): MathPayload {
  const s = object(value),
    c = object(s.childClassroom),
    scene = object(list(s.conceptScenes)[0]),
    spatial = object(scene.handsOnSpec);
  return mathLessonSchema.parse({
    lessonId: s.lessonId,
    contentVersion: s.contentVersion,
    editorialRevision: s.editorialRevision,
    sourceStatus: s.status,
    lesson: {
      title: s.title,
      question: s.question,
      subtitle: s.subtitle,
      objectives: list(s.objectives).map((v) => {
        const o = object(v);
        return { id: o.id, action: o.action, scope: o.scope };
      }),
      classroom: {
        story: c.story,
        mission: c.mission,
        predictQuestion: c.predictQuestion,
        predictionOptions: list(c.predictionOptions),
        discovery: list(c.discovery),
        symbols: list(c.symbols),
        retell: c.retell,
        observedEvidence: c.observedEvidence,
        whyQuestion: c.whyQuestion,
        counterexamplePrompt: c.counterexamplePrompt,
      },
      intro: intro(c.storyVisual),
      predictionIntro: intro(c.predictionVisual),
      spatial: {
        sceneId: scene.sceneId,
        type: spatial.type,
        mode: spatial.mode,
        version: spatial.version,
        dimensions: list(spatial.dimensions),
      },
    },
  });
}
