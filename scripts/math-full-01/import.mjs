// Explicit, read-only import from pinned tracked teaching blobs. Never part of build/CI.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
const source = process.argv[2];
if (!source) throw Error("EXPLICIT_SOURCE_REPO_REQUIRED");
const commit = "a7c05aaa8d9c5eabae4f3453807f830da1cbf279";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const git = (...args) =>
  execFileSync("git", ["-C", source, ...args], {
    env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
    maxBuffer: 8e6,
  });
if (git("rev-parse", "HEAD").toString().trim() !== commit)
  throw Error("FROZEN_SOURCE_HEAD_MISMATCH");
const before = git("status", "--porcelain=v1", "-z");
const tree = new Set(
  git("ls-tree", "-r", "--name-only", commit).toString().trim().split("\n"),
);
const dir = "docs/implementation/evidence/math-full-01",
  dest = "apps/preview/adapters/source";
fs.mkdirSync(dir, { recursive: true });
const origins = [];
function read(p) {
  if (
    !tree.has(p) ||
    !/^(src\/studio\/|shared\/|public\/math-paper-folding\/|content\/pilot\/lessons.json$)/.test(
      p,
    )
  )
    throw Error("UNAPPROVED_SOURCE_PATH");
  return git("show", commit + ":" + p);
}
function write(p, b) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, b);
}
function origin(p, out, bytes, adaptation) {
  const raw = read(p);
  origins.push({
    path: p,
    commit,
    gitBlob: git("rev-parse", commit + ":" + p)
      .toString()
      .trim(),
    sha256: sha(raw),
    target: out,
    targetSha256: sha(bytes),
    adaptation,
    license:
      "User-authorized reuse of own project; no root LICENSE; third-party notices retained. No game/textbook assets.",
  });
}
const modules = [
  "src/studio/TeachingDiagrams.tsx",
  "src/studio/IntroVisual.tsx",
  "src/studio/measurement/TaskDiagram.tsx",
  "shared/classroom-expression.mjs",
];
const seen = new Set();
const find = (p, ref) => {
  const base = path.posix.normalize(
    path.posix.join(path.posix.dirname(p), ref),
  );
  const target = [
    base,
    base + ".tsx",
    base + ".ts",
    base + ".mjs",
    base + ".css",
  ].find((x) => tree.has(x));
  if (!target) throw Error("MISSING_DEPENDENCY " + p + " " + ref);
  return target;
};
const external = new Set(["react", "react-dom", "lucide-react"]);
while (modules.length) {
  const p = modules.shift();
  if (seen.has(p) || p === "src/studio/types.ts") continue;
  seen.add(p);
  let text = read(p).toString();
  if (
    /\b(?:fetch\s*\(|localStorage|sessionStorage|indexedDB|sendBeacon|XMLHttpRequest)/.test(
      text,
    )
  )
    throw Error("NON_CONTENT_DEPENDENCY " + p);
  if (p === "shared/pilot-math.mjs")
    text = text.slice(0, text.indexOf("export function validateTask("));
  if (p === "src/studio/concept/OperationExtensionLab.tsx")
    text = text.replace(
      "参数、预测、操作和解释都会随课程保存。完成操作表示探索过，独立迁移与隔日复习另行记录。",
      "参数、预测、操作与解释只留在本页内存，刷新或离开即清空，不生成学习记录。",
    );
  if (p === "src/studio/measurement/ChainExperiment.tsx")
    text = text.replace(
      "这里只记录探索，不发独立掌握积分。",
      "本次只在页面探索，不保存记录或发放积分。",
    );
  if (p === "src/studio/concept/SpatialWorkbench.tsx")
    text = text.replace("保存的照片", "本次临时照片");
  if (p === "src/studio/concept/useHandsOn.tsx")
    text = text.replace(
      "操作会保存 · 探索不等于掌握",
      "仅本页内存 · 刷新即清空 · 探索不等于掌握",
    );
  if (p === "src/studio/concept/ConceptWorkbench.tsx")
    text = text
      .replace("scene.expectedExplanation", "scene.observableChange")
      .replace(
        "这次只记录读课与探索，不自动判为掌握。",
        "体验模式不记录读课或探索，不自动判为掌握。",
      );
  if (p === "src/studio/TeachingDiagrams.tsx")
    text = text
      .replaceAll("scene.expected.value", "astValue(scene.expressionAST)")
      .replaceAll("scene.expected.unit", "''")
      .replaceAll(
        "scene.expected.explanation",
        "'请回到原故事，核对单位和运算顺序。'",
      );
  // Reviewed literal imports only. Regex is not an AST or a general JS dependency proof.
  const refs = [];
  for (const pattern of [
    /^\s*import\s+(?!\()[^;]*?\s+from\s*(['"])([^'"]+)\1/gm,
    /^\s*import\s*(['"])([^'"]+)\1/gm,
    /\bimport\s*\(\s*(['"])([^'"]+)\1\s*\)/g,
  ]) {
    for (const match of text.matchAll(pattern))
      refs.push({
        ref: match[2],
        start: match.index + match[0].lastIndexOf(match[2]),
      });
  }
  const edits = [];
  for (const { ref, start } of refs) {
    if (ref.startsWith(".")) {
      const target = find(p, ref);
      modules.push(target);
      if (!path.posix.extname(ref))
        edits.push({
          start,
          end: start + ref.length,
          value: ref + path.posix.extname(target),
        });
    } else if (!external.has(ref))
      throw Error("EXTERNAL_IMPORT_NOT_REVIEWED " + ref);
  }
  for (const e of edits.sort((a, b) => b.start - a.start))
    text = text.slice(0, e.start) + e.value + text.slice(e.end);
  const out = dest + "/" + p;
  write(out, text);
  origin(
    p,
    out,
    text,
    "Teaching-only dependency closure. Extension resolution; memory-only notices; remove task validator and hidden answer reads.",
  );
  if (p.endsWith(".mjs")) {
    const d = p.replace(/\.mjs$/, ".d.mts");
    if (tree.has(d)) {
      let types = read(d)
        .toString()
        .replace(/^export function validateTask\([^\n]+\n?/m, "");
      const out = dest + "/" + d;
      write(out, types);
      origin(
        d,
        out,
        types,
        "Pure teaching model types; task validator declaration excluded.",
      );
    }
  }
}
const typesPath = "src/studio/types.ts",
  rawTypes = read(typesPath).toString();
let types = rawTypes.slice(
  rawTypes.indexOf("import type {OperationModel}"),
  rawTypes.indexOf("export type WorkedStep="),
);
types = types
  .replace(/export type SetName=[^\n]+\n/, "")
  .replace(";expected:{value:number|string;unit:string;explanation:string}", "")
  .replace(";expectedExplanation:string", "")
  .replace(";expectedMm?:number", "")
  .replace(";responseSpecId:string", "");
types +=
  "\n" +
  rawTypes.slice(
    rawTypes.indexOf("export type MeasurementTaskDiagram="),
    rawTypes.indexOf("export type ConceptTaskDiagram="),
  ) +
  "\nexport type PilotLesson={mathScenes?:MathScene[];conceptScenes?:ConceptScene[];lengthScenes?:LengthScene[]};\n";
// Imports in types refer to local copied modules; extension already explicit.
write(dest + "/" + typesPath, types);
origin(
  typesPath,
  dest + "/" + typesPath,
  types,
  "Select only teaching state/scene types; exclude Progress, tasks, expected answers and persisted records.",
);
for (const p of ["src/studio/teaching.css"]) {
  const b = read(p);
  write(dest + "/" + p, b);
  origin(
    p,
    dest + "/" + p,
    b,
    "Scoped by separate preview entry; teaching controls and figures only.",
  );
}
const assets = [
  "template-cube-1.svg",
  "template-cube-2.svg",
  "template-cube-3.svg",
  "template-rectangular-box.svg",
];
for (const name of assets) {
  const p = "public/math-paper-folding/" + name,
    b = read(p),
    t = b.toString();
  if (/<script|<foreignObject|\son\w+\s*=|(?:href|src)=|<style|url\(/i.test(t))
    throw Error("UNSAFE_PRINT_ASSET");
  const out = "apps/preview/public/math-paper-folding/" + name;
  write(out, b);
  origin(
    p,
    out,
    b,
    "Reviewed code-generated geometric print SVG; no script, links, embedded styles or external assets.",
  );
}
const artifactPath = "content/pilot/lessons.json",
  raw = read(artifactPath);
if (
  sha(raw) !==
  "0a1c23b8904eb328a029a1d4dec0fda480defb1596325121b9cb7cb19ff70afa"
)
  throw Error("SOURCE_ARTIFACT_HASH_MISMATCH");
const lessons = JSON.parse(raw),
  mapping = [];
const canonical = (x) =>
  JSON.stringify(x, (_, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(
          Object.entries(v).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
        )
      : v,
  );
function pick(object, names, from, to, records) {
  const out = {};
  for (const name of names) {
    if (object?.[name] !== undefined) {
      out[name] = object[name];
      records.push({ source: from + "/" + name, target: to + "/" + name });
    }
  }
  return out;
}
const rootKeys =
  "schemaVersion editorialRevision contentVersion status previewEnabled sourceAnchors masteryRuleId rewardRuleId assetIds generatorIds validatorIds reviewRecord childClassroom contentSource editorialStatus lessonId exampleId title shortTitle question subtitle grade strand track parentUnitId coverageIds coveredSubitemIds thinkingSkills recommendedPrerequisites relatedLessonIds representation estimatedActiveMinutes color widget prerequisiteNote objectives conceptScenes retellPrompt articleBlocks taskSets interactionStatus activityVerification introVisual textbookUnit mathScenes lengthScenes coverageClaim defaultHint".split(
    " ",
  );
const allowed = {
  classroom:
    "story predictQuestion predictionOptions discovery symbols mission retell observedEvidence whyQuestion counterexamplePrompt modelText predictionFocus".split(
      " ",
    ),
  intro: "type title caption values labels".split(" "),
  concept:
    "sceneId family variant title prompt initialState learnerAction observableChange question wrongActionFeedback guidance values labels modelStatus".split(
      " ",
    ),
  handsOn:
    "type mode version dimensions frontHeight maxRearHeight net boatMass elephantMass passengerMass".split(
      " ",
    ),
  operation:
    "type start pay refund total groups perGroup rows cols left right piles copies cut addend multiplier target".split(
      " ",
    ),
  textbook:
    "type title version cases mode contexts total bank digits groups regroup options limits angle reference parts people shirts pants side start end width height rows cols cutRows cutCols data bins left right".split(
      " ",
    ),
  length:
    "sceneId mode title prompt pieceLengthsMm overlapsMm thicknessMm count startMm endMm spacingMm closed explanation".split(
      " ",
    ),
  math: "sceneId lessonId story expressionAST model taskMode contentVersion".split(
    " ",
  ),
  unit: "id title term sourceId printedPages notes sequence".split(" "),
};
function noHidden(value) {
  if (value && typeof value === "object")
    for (const [k, v] of Object.entries(value)) {
      if (
        /^(?:taskSets|expected|expectedMm|expectedExplanation|expectedEvidence|referenceAnswer|hint|solution|validatorIds|rewardRuleId|masteryRuleId|wallet|pets|pin)$/i.test(
          k,
        )
      )
        throw Error("HIDDEN_FIELD_IN_PUBLIC_DTO " + k);
      noHidden(v);
    }
}
const index = [],
  coverage = [];
for (const [i, l] of lessons.entries()) {
  if (
    l.schemaVersion !== 3 ||
    l.status !== "draft" ||
    Object.keys(l).some((k) => !rootKeys.includes(k))
  )
    throw Error("UNKNOWN_LESSON_SCHEMA");
  if (!["verified", "static-visual"].includes(l.interactionStatus))
    throw Error("UNVERIFIED_INTERACTION");
  const records = [],
    prefix = "/" + i,
    p = (o, keys, src, target) => pick(o, keys, prefix + src, target, records);
  const dto = p(
    l,
    [
      "lessonId",
      "contentVersion",
      "editorialRevision",
      "status",
      "title",
      "shortTitle",
      "question",
      "subtitle",
      "grade",
      "strand",
      "track",
      "parentUnitId",
      "recommendedPrerequisites",
      "relatedLessonIds",
      "estimatedActiveMinutes",
      "widget",
      "prerequisiteNote",
      "interactionStatus",
    ],
    "",
    "",
  );
  dto.classroom = p(
    l.childClassroom,
    allowed.classroom,
    "/childClassroom",
    "/classroom",
  );
  for (const name of ["storyVisual", "predictionVisual"])
    if (l.childClassroom[name])
      dto[name] = p(
        l.childClassroom[name],
        allowed.intro,
        "/childClassroom/" + name,
        "/" + name,
      );
  if (l.articleBlocks[0].diagram) {
    dto.contextDiagram = l.articleBlocks[0].diagram;
    records.push({
      source: prefix + "/articleBlocks/0/diagram",
      target: "/contextDiagram",
    });
  }
  dto.workedExamples = [];
  for (const [j, block] of l.articleBlocks.entries())
    for (const [k, example] of (block.examples ?? []).entries()) {
      const src = "/articleBlocks/" + j + "/examples/" + k,
        target = "/workedExamples/" + dto.workedExamples.length;
      const out = p(example, ["title"], src, target);
      out.steps = example.steps.map((step, n) =>
        p(
          step,
          [
            "math",
            "why",
            "expressionBefore",
            "operation",
            "expressionAfter",
            "units",
          ],
          src + "/steps/" + n,
          target + "/steps/" + n,
        ),
      );
      dto.workedExamples.push(out);
    }
  dto.objectives = l.objectives.map((o, j) =>
    p(o, ["id", "action", "scope"], "/objectives/" + j, "/objectives/" + j),
  );
  if (l.textbookUnit)
    dto.textbookUnit = p(
      l.textbookUnit,
      allowed.unit,
      "/textbookUnit",
      "/textbookUnit",
    );
  dto.conceptScenes = (l.conceptScenes ?? []).map((s, j) => {
    const base = "/conceptScenes/" + j,
      out = p(s, allowed.concept, base, base);
    for (const [key, kind] of [
      ["handsOnSpec", "handsOn"],
      ["modelSpec", "operation"],
      ["textbookSpec", "textbook"],
    ])
      if (s[key])
        out[key] = p(s[key], allowed[kind], base + "/" + key, base + "/" + key);
    return out;
  });
  dto.mathScenes = (l.mathScenes ?? []).map((s, j) => {
    const base = "/mathScenes/" + j,
      out = p(s, allowed.math, base, base);
    out.target = p(s.target, ["prompt"], base + "/target", base + "/target");
    return out;
  });
  dto.lengthScenes = (l.lengthScenes ?? []).map((s, j) =>
    p(s, allowed.length, "/lengthScenes/" + j, "/lengthScenes/" + j),
  );
  noHidden(dto);
  const bytes = JSON.stringify(dto, null, 2) + "\n",
    out = "apps/preview/content/lessons/" + l.lessonId + ".json";
  write(out, bytes);
  origin(
    artifactPath,
    out,
    bytes,
    "Explicit field-by-field public teaching projection; taskSets/article answer blocks and grading fields excluded.",
  );
  const model = dto.conceptScenes[0],
    renderer =
      l.widget === "conceptLab"
        ? model?.handsOnSpec?.type + ":" + model?.handsOnSpec?.mode !==
          "undefined:undefined"
          ? model.handsOnSpec.type + ":" + model.handsOnSpec.mode
          : model?.textbookSpec
            ? "textbook:" + model.textbookSpec.type
            : model?.modelSpec
              ? "operations:" + model.modelSpec.type
              : "static:" + model?.family
        : l.widget;
  const at = (value, pointer) =>
    pointer
      .split("/")
      .slice(1)
      .reduce((o, key) => o?.[key], value);
  for (const record of records) {
    const original = at(lessons, record.source),
      projected = at(dto, record.target);
    if (original === undefined || canonical(original) !== canonical(projected))
      throw Error("FIELD_PROJECTION_MISMATCH " + record.target);
    record.valueSha256 = sha(canonical(original));
  }
  const manifest = {
    lessonId: l.lessonId,
    sourceItemSha256: sha(canonical(l)),
    dtoSha256: sha(canonical(dto)),
    fileSha256: sha(bytes),
    renderer,
    fieldMappings: records,
  };
  mapping.push(manifest);
  index.push({
    ...pick(
      dto,
      [
        "lessonId",
        "title",
        "shortTitle",
        "contentVersion",
        "editorialRevision",
        "status",
        "track",
        "parentUnitId",
        "textbookUnit",
        "interactionStatus",
        "widget",
        "recommendedPrerequisites",
      ],
      "",
      "",
      [],
    ),
    dtoSha256: manifest.dtoSha256,
    renderer,
  });
  coverage.push({
    lessonId: l.lessonId,
    textbookUnit: l.textbookUnit?.id ?? l.parentUnitId,
    sourceHash: manifest.sourceItemSha256,
    targetDTOHash: manifest.dtoSha256,
    renderer,
    visualComponents: [],
    sixSteps: "NOT_RUN",
    operatedModels: [],
    viewports: [],
    knownGaps: [],
    acceptance: "NOT_RUN",
  });
}
if (new Set(index.map((l) => l.lessonId)).size !== 70)
  throw Error("LESSON_COUNT_NOT_70");
write(
  "apps/preview/content/catalog.json",
  JSON.stringify(
    {
      schemaVersion: 1,
      sourceCommit: commit,
      sourceArtifactSha256: sha(raw),
      lessons: index,
    },
    null,
    2,
  ) + "\n",
);
write(dir + "/field-mappings.json", JSON.stringify(mapping, null, 2) + "\n");
write(
  dir + "/origins.json",
  JSON.stringify(
    {
      sourceCommit: commit,
      sourceArtifactSha256: sha(raw),
      runtimeSourceFiles: seen.size,
      files: origins,
    },
    null,
    2,
  ) + "\n",
);
write(
  dir + "/lessons-coverage.json",
  JSON.stringify({ status: "IN_PROGRESS", lessons: coverage }, null, 2) + "\n",
);
if (!before.equals(git("status", "--porcelain=v1", "-z")))
  throw Error("SOURCE_WORKTREE_CHANGED");
write(
  dir + "/source-boundary.json",
  JSON.stringify(
    {
      sourceCommit: commit,
      headMatches: true,
      gitStatusBeforeSha256: sha(before),
      gitStatusAfterSha256: sha(before),
      worktreeUnchanged: true,
      trackedPinnedBlobsOnly: true,
      realDataRead: false,
      oldProjectExecuted: false,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  JSON.stringify({
    lessons: index.length,
    sourceFiles: seen.size,
    copiedFiles: origins.length,
    sourceUnchanged: true,
  }),
);
