// Manual source import only; never executed by build/CI. Pinned tracked blobs only.
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import vm from "node:vm";
const source = process.argv[2];
if (!source) throw Error("EXPLICIT_FROZEN_REPO_REQUIRED");
const sha = "a7c05aaa8d9c5eabae4f3453807f830da1cbf279";
const git = (...a) =>
  execFileSync("git", ["-C", source, ...a], {
    env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
    maxBuffer: 16 * 1024 * 1024,
  });
if (git("rev-parse", "HEAD").toString().trim() !== sha)
  throw Error("SOURCE_HEAD_MISMATCH");
const before = git("status", "--porcelain=v1", "-z");
const inventory = JSON.parse(
  fs.readFileSync("docs/implementation/evidence/math-00/source-inventory.json"),
);
const paths = inventory.firstLesson.selectedSourcePaths;
const raw = {};
const proof = [];
const hash = (x) => crypto.createHash("sha256").update(x).digest("hex");
for (const path of paths) {
  const b = git("show", sha + ":" + path),
    r = inventory.files.find((x) => x.path === path);
  if (hash(b) !== r.sha256) throw Error("SOURCE_HASH_MISMATCH");
  raw[path] = b.toString();
  proof.push({ path, commit: sha, gitBlob: r.sourceGitBlob, sha256: r.sha256 });
}
function select(path, names) {
  const text = raw[path],
    out = [];
  for (const name of names) {
    const start = new RegExp(
      "^(?:export )?(?:const|function) " + name + "\\b",
      "m",
    ).exec(text);
    if (!start) throw Error("SELECTION_MISSING");
    const tail = text.slice(start.index);
    const end =
      tail.startsWith("export function") || tail.startsWith("function")
        ? tail.indexOf("\n}") + 2
        : tail.indexOf("\n");
    if (end < 1) throw Error("SELECTION_RANGE_INVALID");
    out.push(tail.slice(0, end));
  }
  return out.join("\n");
}
const geometry =
  select("shared/hands-on-models.mjs", [
    "faces",
    "rad",
    "projectPoint",
    "boxFaces",
  ]) +
  "\n" +
  select("shared/solid-rendering.mjs", [
    "subtract",
    "cross",
    "composeSolid",
    "tint",
  ]);
fs.writeFileSync(
  "apps/web/src/math/geometry.mjs",
  "// Selected pure geometry, math-learning@" +
    sha +
    "; see docs/implementation/evidence/math-01/origins.json.\n" +
    geometry +
    "\n",
);
const all = JSON.parse(raw["content/pilot/lessons.json"]),
  l = all.find((x) => x.lessonId === "G3-U01-B01"),
  c = l.childClassroom;
// Explicit public field projection, never spread a lesson / article / task bank.
const intro = (v) => ({
  type: v.type,
  title: v.title,
  caption: v.caption,
  values: v.values.map((x) => x),
  labels: v.labels.map((x) => x),
});
const payload = {
  lessonId: l.lessonId,
  contentVersion: l.contentVersion,
  editorialRevision: l.editorialRevision,
  sourceStatus: l.status,
  lesson: {
    title: l.title,
    question: l.question,
    subtitle: l.subtitle,
    objectives: l.objectives.map((o) => ({
      id: o.id,
      action: o.action,
      scope: o.scope,
    })),
    classroom: {
      story: c.story,
      mission: c.mission,
      predictQuestion: c.predictQuestion,
      predictionOptions: c.predictionOptions.map((x) => x),
      discovery: c.discovery.map((x) => x),
      symbols: c.symbols.map((x) => x),
      retell: c.retell,
      observedEvidence: c.observedEvidence,
      whyQuestion: c.whyQuestion,
      counterexamplePrompt: c.counterexamplePrompt,
    },
    intro: intro(c.storyVisual),
    predictionIntro: intro(c.predictionVisual),
    spatial: {
      sceneId: l.conceptScenes[0].sceneId,
      type: l.conceptScenes[0].handsOnSpec.type,
      mode: l.conceptScenes[0].handsOnSpec.mode,
      version: l.conceptScenes[0].handsOnSpec.version,
      dimensions: l.conceptScenes[0].handsOnSpec.dimensions.map((x) => x),
    },
  },
};
const canonical = (x) =>
  JSON.stringify(x, (_, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(
          Object.entries(v).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
        )
      : v,
  );
fs.writeFileSync(
  "packages/subjects/math/public-lesson.json",
  JSON.stringify(payload, null, 2) + "\n",
);
const visuals = proof
  .filter((x) => x.path !== "content/pilot/lessons.json")
  .map((x) => ({ path: x.path, sha256: x.sha256 }));
const constants = {
  SOURCE_COMMIT: sha,
  SOURCE_ARTIFACT_SHA: hash(raw["content/pilot/lessons.json"]),
  PUBLIC_DTO_SHA: hash(canonical(payload)),
  VISUAL_SOURCES: visuals,
};
fs.writeFileSync(
  "packages/contracts/math-reviewed.ts",
  Object.entries(constants)
    .map(
      ([k, v]) =>
        "export const " + k + " = " + JSON.stringify(v) + " as const;",
    )
    .join("\n") + "\n",
);
const context = {};
vm.createContext(context);
vm.runInContext(
  geometry.replaceAll("export ", "") +
    ";globalThis.sample=(a,e)=>composeSolid(boxFaces(2.4,1.5,1.2),a,e)",
  context,
  { timeout: 1000 },
);
const round = (x) =>
  JSON.parse(
    JSON.stringify(x, (_, v) =>
      typeof v === "number" ? Math.round(v * 1e9) / 1e9 : v,
    ),
  );
fs.writeFileSync(
  "tests/math01/geometry-golden.json",
  JSON.stringify(
    {
      sourceCommit: sha,
      cases: [
        [0, 0],
        [90, 0],
        [0, 90],
        [35, 25],
      ].map(([a, e]) => ({
        azimuth: a,
        elevation: e,
        result: round(context.sample(a, e)),
      })),
    },
    null,
    2,
  ) + "\n",
);
if (!git("status", "--porcelain=v1", "-z").equals(before))
  throw Error("SOURCE_CHANGED");
fs.writeFileSync(
  "docs/implementation/evidence/math-01/source-verification.json",
  JSON.stringify(
    {
      sourceCommit: sha,
      sources: proof,
      courseCopied: "single public field projection only",
      sourceStatusBeforeSha256: hash(before),
      sourceStatusAfterSha256: hash(before),
      oldBuildExecuted: false,
      isolatedPureGeometryFixture: true,
      realRecordsRead: false,
      nasAccessed: false,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  JSON.stringify({
    verifiedSources: 9,
    publicLessons: 1,
    fullCourseCopied: false,
    oldBuildExecuted: false,
  }),
);
