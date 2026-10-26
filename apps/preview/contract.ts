import { z } from "zod";
// Same strict-CSP setting as the formal UI: never probe eval / compile schemas at runtime.
z.config({ jitless: true });
import {
  introVisualTypes,
  type IntroVisual,
} from "./adapters/source/shared/intro-visuals.mjs";
import type {
  ConceptScene,
  MathScene,
  LengthScene,
  DiagramKind,
  WidgetKind,
} from "./adapters/source/src/studio/types.ts";
const text = z.string().min(1).max(8000),
  label = z.string().min(1).max(240),
  list = z.array(text).max(100);
export const lessonId = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9.-]{0,100}$/);
const hash = z.string().regex(/^[a-f0-9]{64}$/);
export const widgets = [
  "conceptLab",
  "mixedOperations",
  "lengthWorkbench",
  "fraction",
  "area",
  "substitution",
  "balance",
  "quantity",
  "addition",
  "subtraction",
] as const satisfies readonly WidgetKind[];
export const families = [
  "spatial",
  "operations",
  "mass",
  "placeValue",
  "coding",
  "angles",
  "fractions",
  "planning",
  "transform",
  "division",
  "boundary",
  "areaGrid",
  "data",
  "time",
  "decimals",
  "sets",
] as const;
const diagramKinds = [
  "readingCorner",
  "joinedTiles",
  "ribbon",
  "unequalRibbon",
  "groupedRibbon",
  "snackBox",
  "threeSnacks",
  "candyEquality",
  "picnicCount",
  "countSpacing",
  "appleAddition",
  "appleTransfer",
  "stickerTake",
  "stickerCompare",
] as const satisfies readonly DiagramKind[];
const number = z.number().finite().min(-1e7).max(1e7);
const scalar = z.union([z.string().max(8000), number, z.boolean()]);
const modelKeys = {
  handsOnSpec:
    "type mode version dimensions frontHeight maxRearHeight net boatMass elephantMass passengerMass",
  modelSpec:
    "type start pay refund total groups perGroup rows cols left right piles copies cut addend multiplier target",
  textbookSpec:
    "type title version cases mode contexts total bank digits groups regroup options limits angle reference parts people shirts pants side start end width height rows cols cutRows cutCols data bins left right",
} as const;
const modelTypes = {
  handsOnSpec: ["spatial", "mass"],
  modelSpec: [
    "wallet",
    "division-groups",
    "laws",
    "split-array",
    "reverse",
    "substitution",
  ],
  textbookSpec: [
    "product-place",
    "place-value",
    "estimate-product",
    "coding",
    "angle",
    "fraction",
    "fraction-core",
    "outfits",
    "paper-fold",
    "motion",
    "share-place",
    "division",
    "pack-remainder",
    "nested-groups",
    "invariant-table",
    "boundary",
    "joining",
    "tiling",
    "cut-area",
    "vote",
    "data-bins",
    "calendar",
    "clock",
    "decimal",
    "sets",
  ],
} as const;
const nestedKeys = new Set(
  "story unit group outer alternate x y z id name value label min max step inner kind quantity".split(
    " ",
  ),
);
function safeTree(v: unknown, depth = 0): boolean {
  if (depth > 8) return false;
  if (scalar.safeParse(v).success) return true;
  if (Array.isArray(v))
    return v.length <= 200 && v.every((x) => safeTree(x, depth + 1));
  if (v && typeof v === "object")
    return Object.entries(v).every(
      ([k, x]) => nestedKeys.has(k) && safeTree(x, depth + 1),
    );
  return false;
}
function teachingModel(v: unknown, key: keyof typeof modelKeys) {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const o = v as Record<string, unknown>;
  return (
    (modelTypes[key] as readonly unknown[]).includes(o.type) &&
    Object.entries(o).every(
      ([k, x]) => modelKeys[key].split(" ").includes(k) && safeTree(x),
    )
  );
}
const intro = z.strictObject({
  type: z.custom<IntroVisual["type"]>(
    (v) => typeof v === "string" && introVisualTypes.has(v),
  ),
  title: text,
  caption: text,
  values: z.array(number).max(100).optional(),
  labels: list.optional(),
});
const unit = z.strictObject({
  id: label,
  title: text,
  term: label,
  sourceId: label,
  printedPages: text,
  notes: text,
  sequence: z.array(lessonId).max(70),
});
const concept = z.strictObject({
  sceneId: label,
  family: z.enum(families),
  variant: label,
  title: text,
  prompt: text,
  initialState: text,
  learnerAction: text,
  observableChange: text,
  question: text,
  wrongActionFeedback: text,
  guidance: z.array(z.strictObject({ label: text, explanation: text })).max(20),
  values: z.array(number).max(100),
  labels: list,
  modelStatus: z.enum(["registered", "static-review"]).optional(),
  handsOnSpec: z
    .custom<NonNullable<ConceptScene["handsOnSpec"]>>((v) =>
      teachingModel(v, "handsOnSpec"),
    )
    .optional(),
  modelSpec: z
    .custom<NonNullable<ConceptScene["modelSpec"]>>((v) =>
      teachingModel(v, "modelSpec"),
    )
    .optional(),
  textbookSpec: z
    .custom<NonNullable<ConceptScene["textbookSpec"]>>((v) =>
      teachingModel(v, "textbookSpec"),
    )
    .optional(),
});
type AST =
  | { type: "number"; value: number }
  | {
      type: "operation";
      operator: "add" | "subtract" | "multiply" | "divide";
      left: AST;
      right: AST;
      grouped?: boolean;
    };
const ast: z.ZodType<AST> = z.lazy(() =>
  z.union([
    z.strictObject({ type: z.literal("number"), value: number }),
    z.strictObject({
      type: z.literal("operation"),
      operator: z.enum(["add", "subtract", "multiply", "divide"]),
      left: ast,
      right: ast,
      grouped: z.boolean().optional(),
    }),
  ]),
);
const math = z.strictObject({
  sceneId: label,
  lessonId,
  story: z.strictObject({
    text,
    quantities: z
      .array(
        z.strictObject({ id: label, value: number, unit: label, role: text }),
      )
      .max(30),
  }),
  expressionAST: ast,
  model: z.strictObject({
    type: label,
    quantityRefs: list,
    state: z.unknown().refine((v) => v === null || safeTree(v)),
  }),
  target: z.strictObject({ prompt: text }),
  taskMode: z.enum([
    "A_order_and_model",
    "B_equivalent_rewrite",
    "C_operation_law",
    "other",
  ]),
  contentVersion: label,
});
const length = z.strictObject({
  sceneId: label,
  mode: z.enum(["ruler", "boards", "chain", "interval", "route"]),
  title: text,
  prompt: text,
  pieceLengthsMm: z.array(number).max(100).optional(),
  overlapsMm: z.array(number).max(100).optional(),
  thicknessMm: number.optional(),
  count: number.optional(),
  startMm: number.optional(),
  endMm: number.optional(),
  spacingMm: number.optional(),
  closed: z.boolean().optional(),
  explanation: text,
});
const lessonObject = z.strictObject({
  lessonId,
  contentVersion: label,
  editorialRevision: label,
  status: z.literal("draft"),
  title: text,
  shortTitle: text,
  question: text,
  subtitle: text,
  grade: z.array(z.number().int().min(1).max(6)).max(6),
  strand: label,
  track: label,
  parentUnitId: label,
  recommendedPrerequisites: list,
  relatedLessonIds: list,
  estimatedActiveMinutes: number,
  widget: z.enum(widgets),
  prerequisiteNote: text,
  interactionStatus: z.enum(["verified", "static-visual"]),
  classroom: z.strictObject({
    story: text,
    predictQuestion: text,
    predictionOptions: list,
    discovery: list,
    symbols: list,
    mission: text,
    retell: text,
    observedEvidence: text.optional(),
    whyQuestion: text.optional(),
    counterexamplePrompt: text.optional(),
    modelText: text.optional(),
    predictionFocus: text.optional(),
  }),
  storyVisual: intro.optional(),
  predictionVisual: intro.optional(),
  contextDiagram: z.enum(diagramKinds).optional(),
  workedExamples: z
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
    .max(20),
  objectives: z
    .array(z.strictObject({ id: label, action: text, scope: text }))
    .min(1)
    .max(30),
  textbookUnit: unit.optional(),
  conceptScenes: z.array(concept).max(10),
  mathScenes: z.array(math).max(10),
  lengthScenes: z.array(length).max(10),
});
export const fullLessonSchema = lessonObject.superRefine((v, c) => {
  if (!(
    v.storyVisual ||
    v.contextDiagram ||
    v.mathScenes.length ||
    v.lengthScenes.length
  ))
    c.addIssue({ code: "custom", message: "MISSING_CONTEXT_VISUAL" });
  if (v.widget === "conceptLab" && v.conceptScenes.length !== 1)
    c.addIssue({ code: "custom", message: "CONCEPT_SCENE_REQUIRED" });
  if (v.widget === "mixedOperations" && !v.mathScenes.length)
    c.addIssue({ code: "custom", message: "MATH_SCENE_REQUIRED" });
  if (v.widget === "lengthWorkbench" && !v.lengthScenes.length)
    c.addIssue({ code: "custom", message: "LENGTH_SCENE_REQUIRED" });
});
export type FullLesson = z.infer<typeof fullLessonSchema>;
export type TeachingMathScene = MathScene;
export type TeachingLengthScene = LengthScene;
const catalogItem = lessonObject
  .pick({
    lessonId: true,
    title: true,
    shortTitle: true,
    contentVersion: true,
    editorialRevision: true,
    status: true,
    track: true,
    parentUnitId: true,
    textbookUnit: true,
    interactionStatus: true,
    widget: true,
    recommendedPrerequisites: true,
  })
  .extend({ dtoSha256: hash, renderer: label });
export const catalogSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    sourceCommit: z.literal("a7c05aaa8d9c5eabae4f3453807f830da1cbf279"),
    sourceArtifactSha256: z.literal(
      "0a1c23b8904eb328a029a1d4dec0fda480defb1596325121b9cb7cb19ff70afa",
    ),
    navigationSha256: hash,
    lessons: z.array(catalogItem).length(70),
  })
  .superRefine((v, c) => {
    if (new Set(v.lessons.map((l) => l.lessonId)).size !== 70)
      c.addIssue({ code: "custom", message: "DUPLICATE_LESSON_ID" });
  });
export type Catalog = z.infer<typeof catalogSchema>;
export function canonical(value: unknown): string {
  return JSON.stringify(value, (_, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(
          Object.entries(v).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
        )
      : v,
  );
}
