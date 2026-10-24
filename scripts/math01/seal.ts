// Explicit developer provenance refresh, not a CI repair or source checkout.
import { readFileSync, writeFileSync } from "node:fs";
import { sha256, canonical } from "../../packages/contracts/index.ts";
const dir = "docs/implementation/evidence/math-01/";
const verification = JSON.parse(
  readFileSync(dir + "source-verification.json", "utf8"),
);
const inventory = JSON.parse(
  readFileSync(
    "docs/implementation/evidence/math-00/source-inventory.json",
    "utf8",
  ),
);
const selections: Record<
  string,
  { symbols: string[]; targets: string[]; adaptation: string }
> = {
  "content/pilot/lessons.json": {
    symbols: ["G3-U01-B01 public DTO fields only"],
    targets: [
      "packages/subjects/math/public-lesson.json",
      "packages/subjects/math/project.ts",
    ],
    adaptation:
      "One lesson explicit public projection; no task/article/concept banks",
  },
  "shared/hands-on-models.mjs": {
    symbols: ["faces", "rad", "projectPoint", "boxFaces"],
    targets: ["apps/web/src/math/geometry.mjs"],
    adaptation:
      "Exact selected declarations; no model banks or fold/hidden functions",
  },
  "shared/solid-rendering.mjs": {
    symbols: ["subtract", "cross", "composeSolid", "tint"],
    targets: ["apps/web/src/math/geometry.mjs"],
    adaptation:
      "Exact geometry declarations joined with reviewed box projection",
  },
  "src/studio/IntroVisual.tsx": {
    symbols: ["text palette helper", "Canvas", "Camera", "BoxCamera"],
    targets: ["apps/web/src/math/BoxCamera.tsx"],
    adaptation:
      "Box only; dimensions from strict DTO, 3 inline color attributes become scoped CSS classes",
  },
  "src/studio/concept/SolidView.tsx": {
    symbols: ["SolidView renderer and pointer/keyboard projection"],
    targets: ["apps/web/src/math/SolidView.tsx"],
    adaptation:
      "Observe only; remove fold/face selection props; add pointer ownership/lost capture cleanup and raw control orientation to preserve rapid arrow input during animated renders; preserve geometry/colors",
  },
  "src/studio/concept/SpatialWorkbench.tsx": {
    symbols: [
      "views",
      "Projection observe",
      "SpatialWorkbench observe controls/photo display",
    ],
    targets: ["apps/web/src/math/Workbench.tsx"],
    adaptation:
      "Remove rear/fold/persistence/grading and old hooks; component memory only",
  },
  "src/studio/useMotionValue.ts": {
    symbols: ["useMotionValue", "useMotionAngle"],
    targets: ["apps/web/src/math/motion.ts"],
    adaptation: "Only both required hooks; keep reduced motion and RAF cleanup",
  },
  "src/studio/intro-visual.css": {
    symbols: [
      "intro-visual",
      "intro-object-layout",
      "intro-marker-key",
      "intro-photo-pair",
      "intro-unknown",
    ],
    targets: ["apps/web/src/math/math.css"],
    adaptation:
      "Scoped .math-lesson box-camera rules and responsive fit; no other lesson branches",
  },
  "src/studio/concept/hands-on.css": {
    symbols: ["observe stage/controls/projection/photo layout"],
    targets: ["apps/web/src/math/math.css"],
    adaptation:
      "Scoped observe layout; remove fold/hidden/material rules; no global CSS",
  },
};
const origins = verification.sources.map(
  (s: { path: string; commit: string; gitBlob: string; sha256: string }) => {
    const base = inventory.files.find(
        (x: { path: string }) => x.path === s.path,
      ),
      selection = selections[s.path];
    if (
      !base ||
      !selection ||
      base.sha256 !== s.sha256 ||
      base.sourceGitBlob !== s.gitBlob
    )
      throw Error("SOURCE_PROVENANCE_INVALID");
    return {
      repository: "lovestream/math-learning",
      sourceCommit: s.commit,
      sourcePath: s.path,
      sourceGitBlob: s.gitBlob,
      sourceSha256: s.sha256,
      selectedSymbols: selection.symbols,
      copiedWholeFile: false,
      license:
        "Owner-directed private reuse for Issue11; no root redistribution license inferred; React MIT dependencies reused from KLH",
      adaptation: selection.adaptation,
      targets: selection.targets.map((path) => ({
        path,
        sha256: sha256(readFileSync(path)),
      })),
    };
  },
);
if (origins.length !== 9) throw Error("NINE_APPROVED_SOURCES_REQUIRED");
const record = {
  schemaVersion: 1,
  issue: 11,
  origins,
  thirdPartyAssets: [],
  notes:
    "No new third party dependencies/assets. New glue/schema/server code is original KLH integration, not old source.",
};
if (process.argv.includes("--seal"))
  writeFileSync(dir + "origins.json", JSON.stringify(record, null, 2) + "\n");
else if (
  canonical(JSON.parse(readFileSync(dir + "origins.json", "utf8"))) !==
  canonical(record)
)
  throw Error("TARGET_PROVENANCE_DRIFT");
console.log(
  JSON.stringify({
    status: "PASS_PROVENANCE",
    sources: 9,
    targets: new Set(
      origins.flatMap((x: { targets: { path: string }[] }) =>
        x.targets.map((t) => t.path),
      ),
    ).size,
  }),
);
