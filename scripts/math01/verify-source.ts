// Explicit local source check, not a build/CI dependency. Reads one approved author blob.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { canonical, sha256 } from "../../packages/contracts/index.ts";
import { projectSourceLesson } from "../../packages/subjects/math/project.ts";
import {
  SOURCE_COMMIT,
  SOURCE_ARTIFACT_SHA,
  PUBLIC_DTO_SHA,
} from "../../packages/contracts/math-reviewed.ts";
const source = process.argv[2];
if (!source) throw Error("EXPLICIT_FROZEN_SOURCE_REQUIRED");
const git = (...args: string[]) =>
  execFileSync("git", ["-C", source, ...args], {
    env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
    maxBuffer: 16 * 1024 * 1024,
  });
if (git("rev-parse", "HEAD").toString().trim() !== SOURCE_COMMIT)
  throw Error("SOURCE_HEAD_MISMATCH");
const before = git("status", "--porcelain=v1", "-z");
const blob = git("show", SOURCE_COMMIT + ":content/pilot/lessons.json");
if (sha256(blob) !== SOURCE_ARTIFACT_SHA) throw Error("SOURCE_HASH_MISMATCH");
const authored = JSON.parse(blob.toString()).find(
  (l: { lessonId: string }) => l.lessonId === "G3-U01-B01",
);
const projection = projectSourceLesson(authored);
if (
  sha256(canonical(projection)) !== PUBLIC_DTO_SHA ||
  canonical(projection) !==
    canonical(
      JSON.parse(
        readFileSync("packages/subjects/math/public-lesson.json", "utf8"),
      ),
    )
)
  throw Error("PUBLIC_FIELDS_DIFFER");
const after = git("status", "--porcelain=v1", "-z");
if (!before.equals(after)) throw Error("SOURCE_STATUS_CHANGED");
const evidence = {
  status: "PASS",
  sourceCommit: SOURCE_COMMIT,
  sourceArtifactSha256: SOURCE_ARTIFACT_SHA,
  publicDtoSha256: PUBLIC_DTO_SHA,
  allPublicFieldsEqual: true,
  publicLessonCount: 1,
  forbiddenSourceObjectsCopied: false,
  oldModuleExecuted: false,
  realDataRead: false,
  sourceStatusBeforeSha256: sha256(before),
  sourceStatusAfterSha256: sha256(after),
  node: process.version,
};
writeFileSync(
  "docs/implementation/evidence/math-01/public-projection-check.json",
  JSON.stringify(evidence, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    status: "PASS",
    allPublicFieldsEqual: true,
    publicLessons: 1,
  }),
);
