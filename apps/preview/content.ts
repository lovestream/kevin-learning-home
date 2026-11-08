import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import {
  catalogSchema,
  fullLessonSchema,
  canonical,
  type FullLesson,
} from "./contract.ts";
import { adapterFor } from "./registry-meta.ts";
import { validateLearningMap } from "./learning-map.ts";
export const hash = (b: string | Buffer) =>
  createHash("sha256").update(b).digest("hex");
export function loadContent(root: string) {
  const directory = join(root, "apps/preview/content"),
    catalog = catalogSchema.parse(
      JSON.parse(readFileSync(join(directory, "catalog.json"), "utf8")),
    );
  const lessons = new Map<string, { data: FullLesson; body: string }>();
  for (const entry of catalog.lessons) {
    const raw = JSON.parse(
        readFileSync(
          join(directory, "lessons", entry.lessonId + ".json"),
          "utf8",
        ),
      ),
      data = fullLessonSchema.parse(raw);
    if (
      data.lessonId !== entry.lessonId ||
      hash(canonical(data)) !== entry.dtoSha256 ||
      canonical(raw) !== canonical(data) ||
      data.contentVersion !== entry.contentVersion ||
      data.editorialRevision !== entry.editorialRevision ||
      data.status !== entry.status ||
      adapterFor(data).key !== entry.renderer
    )
      throw Error("CONTENT_INTEGRITY_FAILED");
    lessons.set(entry.lessonId, { data, body: JSON.stringify(data) });
  }
  const mapBytes = readFileSync(join(directory, "learning-map.json"));
  const learningMap = validateLearningMap(
    JSON.parse(mapBytes.toString()),
    catalog,
  );
  if (hash(canonical(learningMap)) !== catalog.navigationSha256)
    throw Error("LEARNING_MAP_HASH_MISMATCH");
  return { catalog, lessons, learningMap };
}
