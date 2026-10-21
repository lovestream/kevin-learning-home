import { DatabaseSync } from "node:sqlite";
import {
  existsSync,
  mkdirSync,
  renameSync,
  rmSync,
  readdirSync,
  openSync,
  fsyncSync,
  closeSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { Store, ownedDirectory, SCHEMA_VERSION } from "./store.ts";
import {
  AppError,
  canonical,
  sha256,
  mediaAssetSchema,
  contentManifestSchema,
} from "../contracts/index.ts";
import {
  LocalMediaStorage,
  readWithin,
  writeNew,
  copyWithin,
  fingerprintWithin,
} from "../media/local.ts";

export interface Layout {
  data: string;
  media: string;
  content: string;
}
export function layout(root: string): Layout {
  return {
    data: join(root, "data"),
    media: join(root, "media"),
    content: join(root, "content"),
  };
}
export function prepareLayout(paths: Layout) {
  const dirs = Object.values(paths).map(ownedDirectory);
  for (let i = 0; i < dirs.length; i++)
    for (let j = i + 1; j < dirs.length; j++)
      if (
        dirs[i] === dirs[j] ||
        dirs[i].startsWith(dirs[j] + "/") ||
        dirs[j].startsWith(dirs[i] + "/")
      )
        throw new AppError("VOLUMES_MUST_BE_SEPARATE", 422);
}
export function verifyContent(store: Store, paths: Layout) {
  const media = new LocalMediaStorage(paths.media);
  for (const row of store.db
    .prepare(
      "SELECT asset_id,version,manifest FROM media_assets ORDER BY asset_id,version",
    )
    .iterate()) {
    const asset = mediaAssetSchema.parse(JSON.parse(String(row.manifest)));
    if (asset.assetId !== row.asset_id || asset.version !== row.version)
      throw new AppError("MEDIA_IDENTITY_MISMATCH", 422);
    media.verify(asset);
  }
  for (const row of store.db
    .prepare(
      "SELECT subject_id,content_version,manifest FROM content_manifests ORDER BY subject_id,content_version",
    )
    .iterate()) {
    const manifest = contentManifestSchema.parse(
      JSON.parse(String(row.manifest)),
    );
    if (
      manifest.subjectId !== row.subject_id ||
      manifest.contentVersion !== row.content_version
    )
      throw new AppError("CONTENT_IDENTITY_MISMATCH", 422);
    const refs = store.db
      .prepare(
        "SELECT asset_id,asset_version FROM content_media_refs WHERE subject_id=? AND content_version=? ORDER BY asset_id,asset_version",
      )
      .all(row.subject_id!, row.content_version!);
    const actual = refs.map((r) => ({
      assetId: String(r.asset_id),
      version: String(r.asset_version),
    }));
    const sortRefs = (refs: { assetId: string; version: string }[]) =>
      refs.map(canonical).sort();
    if (canonical(sortRefs(actual)) !== canonical(sortRefs(manifest.assets)))
      throw new AppError("CONTENT_REFERENCES_MISMATCH", 422);
    const key =
      String(row.subject_id) + "/" + String(row.content_version) + ".json";
    if (
      canonical(
        JSON.parse(readWithin(paths.content, key, 65536).toString()),
      ) !== canonical(manifest)
    )
      throw new AppError("CONTENT_HASH_MISMATCH", 422);
  }
}
function durableTree(root: string) {
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const p = join(root, entry.name);
    if (entry.isDirectory()) durableTree(p);
    else {
      const fd = openSync(p, "r");
      try {
        fsyncSync(fd);
      } finally {
        closeSync(fd);
      }
    }
  }
  const fd = openSync(root, "r");
  try {
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
}
/** Offline checkpoint: exclusive writer lock blocks app/other cooperating tools.
 * DB, published media and content stay frozen until staging is verified and renamed.
 */
export function backup(
  paths: Layout,
  destination: string,
  beforePublish?: () => void,
) {
  const target = resolve(destination);
  if (existsSync(target)) throw new AppError("BACKUP_DESTINATION_EXISTS", 409);
  const parent = ownedDirectory(dirname(target));
  for (const src of Object.values(paths))
    if (
      target === resolve(src) ||
      parent === resolve(src) ||
      parent.startsWith(resolve(src) + "/")
    )
      throw new AppError("BACKUP_INSIDE_SOURCE", 422);
  const stage = join(parent, ".checkpoint-" + randomUUID());
  mkdirSync(stage, { mode: 0o700 });
  let store: Store | undefined;
  try {
    store = new Store(paths.data);
    verifyContent(store, paths);
    store.verifyIntegrity();
    store.db.prepare("VACUUM INTO ?").run(join(stage, "learning.sqlite"));
    const files: Record<string, { sha256: string; sizeBytes: number }> = {};
    for (const row of store.db
      .prepare("SELECT manifest FROM media_assets ORDER BY asset_id,version")
      .iterate()) {
      const asset = mediaAssetSchema.parse(JSON.parse(String(row.manifest)));
      const key = "media/" + asset.storageKey;
      if (!files[key]) {
        const info = copyWithin(paths.media, asset.storageKey, stage, key);
        if (info.sha256 !== asset.sha256 || info.sizeBytes !== asset.sizeBytes)
          throw new AppError("MEDIA_HASH_MISMATCH", 422);
        files[key] = info;
      }
    }
    for (const row of store.db
      .prepare(
        "SELECT subject_id,content_version FROM content_manifests ORDER BY subject_id,content_version",
      )
      .iterate()) {
      const key =
        String(row.subject_id) + "/" + String(row.content_version) + ".json";
      const bytes = readWithin(paths.content, key, 65536);
      writeNew(stage, "content/" + key, bytes);
      files["content/" + key] = {
        sha256: sha256(bytes),
        sizeBytes: bytes.length,
      };
    }
    files["learning.sqlite"] = fingerprintWithin(stage, "learning.sqlite");
    const manifest = {
      format: "klh-checkpoint",
      schemaVersion: SCHEMA_VERSION,
      appVersion: "0.1.0",
      nodeVersion: process.version,
      createdAt: new Date().toISOString(),
      boundary:
        "offline-exclusive-writer; immutable published media/content; no concurrent external writer",
      tables: store.summary(),
      files,
    };
    writeNew(stage, "manifest.json", canonical(manifest));
    verifyContent(store, paths);
    beforePublish?.();
    durableTree(stage);
    renameSync(stage, target);
    const fd = openSync(parent, "r");
    try {
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    return manifest;
  } catch (e) {
    rmSync(stage, { recursive: true, force: true });
    throw e;
  } finally {
    store?.close();
  }
}
export function restore(checkpoint: string, emptyDestination: string) {
  const source = resolve(checkpoint),
    target = resolve(emptyDestination);
  // A nonexistent target is stronger than an existing "apparently empty" service path.
  if (existsSync(target)) throw new AppError("RESTORE_TARGET_EXISTS", 409);
  const manifest = JSON.parse(
    readWithin(source, "manifest.json", 2 * 1024 * 1024).toString(),
  );
  if (
    manifest.format !== "klh-checkpoint" ||
    manifest.schemaVersion !== SCHEMA_VERSION ||
    !manifest.files ||
    typeof manifest.files !== "object"
  )
    throw new AppError("CHECKPOINT_VERSION_UNSUPPORTED", 422);
  const parent = ownedDirectory(dirname(target));
  const stage = join(parent, ".restore-" + randomUUID());
  mkdirSync(stage, { mode: 0o700 });
  const paths = layout(stage);
  try {
    prepareLayout(paths);
    if (!manifest.files["learning.sqlite"])
      throw new AppError("CHECKPOINT_DATABASE_MISSING", 422);
    for (const [key, entry] of Object.entries(manifest.files) as [
      string,
      { sha256: string; sizeBytes: number },
    ][]) {
      if (
        key !== "learning.sqlite" &&
        !key.startsWith("media/") &&
        !key.startsWith("content/")
      )
        throw new AppError("CHECKPOINT_PATH_INVALID", 422);
      if (
        !Number.isSafeInteger(entry.sizeBytes) ||
        entry.sizeBytes < 0 ||
        !/^[a-f0-9]{64}$/.test(entry.sha256)
      )
        throw new AppError("CHECKPOINT_MANIFEST_INVALID", 422);
      const info = copyWithin(
        source,
        key,
        stage,
        key === "learning.sqlite" ? "data/learning.sqlite" : key,
      );
      if (info.sizeBytes !== entry.sizeBytes || info.sha256 !== entry.sha256)
        throw new AppError("CHECKPOINT_HASH_MISMATCH", 422);
    }
    const store = new Store(paths.data);
    try {
      store.verifyIntegrity();
      verifyContent(store, paths);
      if (canonical(store.summary()) !== canonical(manifest.tables))
        throw new AppError("RESTORE_TABLE_MISMATCH", 422);
    } finally {
      store.close();
    }
    durableTree(stage);
    renameSync(stage, target);
    const fd = openSync(parent, "r");
    try {
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    return manifest;
  } catch (e) {
    rmSync(stage, { recursive: true, force: true });
    throw e;
  }
}
