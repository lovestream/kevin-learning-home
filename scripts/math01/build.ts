import {
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
  mkdirSync,
} from "node:fs";
import { canonical, sha256 } from "../../packages/contracts/index.ts";
import {
  SOURCE_COMMIT,
  SOURCE_ARTIFACT_SHA,
  PUBLIC_DTO_SHA,
  VISUAL_SOURCES,
  mathLessonSchema,
} from "../../packages/contracts/math-readonly.ts";
const root = "apps/web/dist/";
const payload = mathLessonSchema.parse(
  JSON.parse(readFileSync("packages/subjects/math/public-lesson.json", "utf8")),
);
if (sha256(canonical(payload)) !== PUBLIC_DTO_SHA)
  throw Error("PUBLIC_PROJECTION_HASH_MISMATCH");
const files = readdirSync(root + "assets")
  .filter((x) => /\.(js|css)$/.test(x))
  .sort()
  .map((name) => {
    const path = "assets/" + name,
      b = readFileSync(root + path);
    return { path, sha256: sha256(b), sizeBytes: b.length };
  });
if (files.length < 2 || files.some((f) => !statSync(root + f.path).isFile()))
  throw Error("VISUAL_BUILD_MISSING");
const digest = sha256(canonical(files));
writeFileSync(
  root + "math-integrity.json",
  JSON.stringify(
    {
      schemaVersion: 1,
      sourceCommit: SOURCE_COMMIT,
      sourceArtifactSha256: SOURCE_ARTIFACT_SHA,
      publicDtoSha256: PUBLIC_DTO_SHA,
      visualSources: VISUAL_SOURCES,
      files,
      visualArtifactSha256: digest,
    },
    null,
    2,
  ) + "\n",
);
const html = readFileSync(root + "index.html", "utf8");
if (html.includes("klh-math-visual-sha256")) throw Error("HTML_ALREADY_SEALED");
writeFileSync(
  root + "index.html",
  html.replace(
    "</head>",
    `<meta name="klh-math-visual-sha256" content="${digest}" /></head>`,
  ),
);
mkdirSync(".evidence/math-01", { recursive: true });
writeFileSync(
  ".evidence/math-01/build-integrity.json",
  readFileSync(root + "math-integrity.json"),
);
console.log(
  JSON.stringify({
    status: "PASS_MATH_BUILD",
    visualFiles: files.length,
    visualArtifactSha256: digest,
  }),
);
