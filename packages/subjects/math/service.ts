import { readFileSync, lstatSync, realpathSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { canonical, sha256, AppError } from "../../contracts/index.ts";
import {
  mathLessonSchema,
  mathResponseSchema,
  SOURCE_COMMIT,
  SOURCE_ARTIFACT_SHA,
  PUBLIC_DTO_SHA,
  VISUAL_SOURCES,
  type MathResponse,
} from "../../contracts/math-readonly.ts";
const record = z.strictObject({
  path: z.string().regex(/^assets\/[A-Za-z0-9_./-]+\.(?:js|css)$/),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  sizeBytes: z
    .number()
    .int()
    .positive()
    .max(8 * 1024 * 1024),
});
const buildSchema = z.strictObject({
  schemaVersion: z.literal(1),
  sourceCommit: z.literal(SOURCE_COMMIT),
  sourceArtifactSha256: z.literal(SOURCE_ARTIFACT_SHA),
  publicDtoSha256: z.literal(PUBLIC_DTO_SHA),
  visualSources: z
    .array(z.strictObject({ path: z.string(), sha256: z.string() }))
    .length(8),
  files: z.array(record).min(2).max(30),
  visualArtifactSha256: z.string().regex(/^[a-f0-9]{64}$/),
});
function regular(root: string, path: string) {
  const p = resolve(root, path);
  if (
    !p.startsWith(realpathSync(root) + "/") ||
    lstatSync(p).isSymbolicLink() ||
    !lstatSync(p).isFile() ||
    realpathSync(p) !== p
  )
    throw Error("CONTENT_FILE_INVALID");
  return readFileSync(p);
}
export class MathLessonService {
  readonly dataRoot: string;
  readonly webRoot: string;
  constructor(
    webRoot: string,
    dataRoot = dirname(fileURLToPath(import.meta.url)),
  ) {
    this.webRoot = resolve(webRoot);
    this.dataRoot = resolve(dataRoot);
  }
  get(learnerId: string): MathResponse {
    try {
      const payload = mathLessonSchema.parse(
        JSON.parse(regular(this.dataRoot, "public-lesson.json").toString()),
      );
      if (sha256(canonical(payload)) !== PUBLIC_DTO_SHA)
        throw Error("PUBLIC_HASH_MISMATCH");
      const build = buildSchema.parse(
        JSON.parse(regular(this.webRoot, "math-integrity.json").toString()),
      );
      if (
        canonical(build.visualSources) !== canonical(VISUAL_SOURCES) ||
        new Set(build.files.map((f) => f.path)).size !== build.files.length ||
        sha256(canonical(build.files)) !== build.visualArtifactSha256
      )
        throw Error("BUILD_MANIFEST_MISMATCH");
      const html = regular(this.webRoot, "index.html").toString();
      const metas = [
        ...html.matchAll(
          /<meta name="klh-math-visual-sha256" content="([a-f0-9]{64})"\s*\/>/g,
        ),
      ];
      if (metas.length !== 1 || metas[0][1] !== build.visualArtifactSha256)
        throw Error("BUILD_HTML_MISMATCH");
      for (const f of build.files) {
        if (f.path.split("/").includes("..")) throw Error("ASSET_PATH_INVALID");
        const b = regular(this.webRoot, f.path);
        if (b.length !== f.sizeBytes || sha256(b) !== f.sha256)
          throw Error("VISUAL_HASH_MISMATCH");
      }
      return mathResponseSchema.parse({
        schemaVersion: 1,
        learnerId,
        subjectId: "math",
        lessonId: payload.lessonId,
        contentVersion: payload.contentVersion,
        editorialRevision: payload.editorialRevision,
        sourceStatus: payload.sourceStatus,
        mode: "readonly",
        lesson: payload.lesson,
        manifest: {
          sourceCommit: SOURCE_COMMIT,
          sourceArtifactSha256: SOURCE_ARTIFACT_SHA,
          publicDtoSha256: PUBLIC_DTO_SHA,
          visualSources: VISUAL_SOURCES.map((s) => ({
            path: s.path,
            sha256: s.sha256,
          })),
          externalAssets: [],
          visualArtifactSha256: build.visualArtifactSha256,
        },
      });
    } catch {
      throw new AppError("CONTENT_UNAVAILABLE", 503);
    }
  }
}
export function mathReadonlyFlag(value: string | undefined) {
  if (value !== undefined && value !== "0" && value !== "1")
    throw new AppError("MATH_FLAG_INVALID", 503);
  return value === "1";
}
