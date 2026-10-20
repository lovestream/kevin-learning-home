// Maintenance/test fixture only; excluded from the production Docker image.
import { Buffer } from "node:buffer";
import { Store } from "../packages/platform/store.ts";
import type { Layout } from "../packages/platform/checkpoint.ts";
import {
  canonical,
  sha256,
  type MediaAsset,
  type LearningCommand,
} from "../packages/contracts/index.ts";
import { writeNew } from "../packages/media/local.ts";
import { randomUUID } from "node:crypto";

export function seed(store: Store, paths: Layout) {
  if (Number(store.db.prepare("SELECT count(*) n FROM learners").get()!.n) > 0)
    throw Error("SYNTHETIC_SEED_REQUIRES_EMPTY_DATABASE");
  const bytes = Buffer.from("Synthetic sample. No learning record.\n");
  const asset: MediaAsset = {
    schemaVersion: 1,
    assetId: "synthetic:sample",
    version: "v1",
    sha256: sha256(bytes),
    sizeBytes: bytes.length,
    mimeType: "text/plain",
    visibility: "public",
    sourceLicense: "CC0 synthetic fixture",
    authorization: "synthetic",
    storageKey: "objects/" + sha256(bytes) + ".txt",
    contentRefs: ["synthetic:reading"],
  };
  const content = {
    schemaVersion: 1,
    subjectId: "foundation-demo",
    contentVersion: "synthetic-v1",
    title: "Synthetic cursor fixture",
    assets: [{ assetId: asset.assetId, version: asset.version }],
  };
  writeNew(paths.media, asset.storageKey, bytes);
  writeNew(
    paths.content,
    "foundation-demo/synthetic-v1.json",
    canonical(content),
  );
  store.transaction(() => {
    store.db
      .prepare("INSERT INTO learners VALUES(?,?,1)")
      .run("synthetic-learner", "Synthetic learner");
    store.db.prepare("INSERT INTO subjects VALUES(?,0)").run("foundation-demo");
    store.db
      .prepare("INSERT INTO subject_states VALUES(?,?,0,1,?,?)")
      .run(
        "synthetic-learner",
        "foundation-demo",
        "synthetic-v1",
        canonical({ lastPosition: 0, observedCount: 0 }),
      );
    store.db
      .prepare("INSERT INTO server_attempts VALUES(?,?,?,?)")
      .run(
        "synthetic:attempt:1",
        "synthetic-learner",
        "foundation-demo",
        "synthetic-v1",
      );
    store.db
      .prepare("INSERT INTO media_assets VALUES(?,?,?)")
      .run(asset.assetId, asset.version, canonical(asset));
    store.db
      .prepare("INSERT INTO content_manifests VALUES(?,?,?)")
      .run("foundation-demo", "synthetic-v1", canonical(content));
    store.db
      .prepare("INSERT INTO content_media_refs VALUES(?,?,?,?)")
      .run("foundation-demo", "synthetic-v1", asset.assetId, asset.version);
  });
  return asset;
}
export function syntheticCommand(
  overrides: Partial<LearningCommand> = {},
): LearningCommand {
  return {
    schemaVersion: 1,
    commandId: randomUUID(),
    learnerId: "synthetic-learner",
    subjectId: "foundation-demo",
    expectedRevision: 0,
    contentVersion: "synthetic-v1",
    occurredAt: "2026-10-20T00:00:00.000Z",
    serverAttemptId: "synthetic:attempt:1",
    action: "observe-reading",
    lessonId: "synthetic:reading",
    activityId: "synthetic:cursor",
    input: { position: 10 },
    ...overrides,
  };
}
