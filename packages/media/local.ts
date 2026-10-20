import {
  constants,
  closeSync,
  fstatSync,
  lstatSync,
  openSync,
  readFileSync,
  realpathSync,
  mkdirSync,
  writeFileSync,
  readSync,
  writeSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { join, resolve, dirname } from "node:path";
import {
  AppError,
  mediaAssetSchema,
  sha256,
  type MediaAsset,
} from "../contracts/index.ts";

export interface MediaStorage {
  read(asset: MediaAsset, permission: "public" | "private-authorized"): Buffer;
  verify(asset: MediaAsset): void;
}
export function safeKey(key: string): string {
  if (
    key.length > 240 ||
    !/^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(key) ||
    key.split("/").some((x) => !x || x === "." || x === "..")
  )
    throw new AppError("MEDIA_KEY_INVALID", 422);
  return key;
}
// Local directory belongs exclusively to the app operator. Published versions
// are immutable; external writers must remain stopped throughout a checkpoint.
function openWithin(root: string, key: string): number {
  safeKey(key);
  const base = resolve(root);
  if (realpathSync(base) !== base || lstatSync(base).isSymbolicLink())
    throw new AppError("MEDIA_PATH_UNSAFE", 422);
  let path = base;
  for (const part of key.split("/")) {
    path = join(path, part);
    if (lstatSync(path).isSymbolicLink())
      throw new AppError("MEDIA_PATH_UNSAFE", 422);
  }
  if (!realpathSync(path).startsWith(base + "/"))
    throw new AppError("MEDIA_PATH_UNSAFE", 422);
  if (!lstatSync(path).isFile()) throw new AppError("MEDIA_PATH_UNSAFE", 422);
  return openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
}
export function readWithin(root: string, key: string, limit?: number): Buffer {
  const fd = openWithin(root, key);
  try {
    const stat = fstatSync(fd);
    if (!stat.isFile() || (limit !== undefined && stat.size > limit))
      throw new AppError("MEDIA_SIZE_INVALID", 422);
    return readFileSync(fd);
  } finally {
    closeSync(fd);
  }
}
export function fingerprintWithin(root: string, key: string) {
  const fd = openWithin(root, key);
  const digest = createHash("sha256");
  let sizeBytes = 0;
  try {
    if (!fstatSync(fd).isFile()) throw new AppError("MEDIA_PATH_UNSAFE", 422);
    const block = Buffer.alloc(65536);
    let size;
    while ((size = readSync(fd, block, 0, block.length, null)) > 0) {
      digest.update(block.subarray(0, size));
      sizeBytes += size;
    }
    return { sha256: digest.digest("hex"), sizeBytes };
  } finally {
    closeSync(fd);
  }
}
export function copyWithin(
  root: string,
  key: string,
  destinationRoot: string,
  destinationKey: string,
) {
  safeKey(destinationKey);
  const out = join(destinationRoot, destinationKey);
  mkdirSync(dirname(out), { recursive: true, mode: 0o700 });
  if (realpathSync(dirname(out)) !== dirname(out))
    throw new AppError("MEDIA_PATH_UNSAFE", 422);
  const input = openWithin(root, key);
  let output: number | undefined;
  const digest = createHash("sha256");
  let sizeBytes = 0;
  try {
    if (!fstatSync(input).isFile())
      throw new AppError("MEDIA_PATH_UNSAFE", 422);
    output = openSync(
      out,
      constants.O_CREAT |
        constants.O_EXCL |
        constants.O_WRONLY |
        constants.O_NOFOLLOW,
      0o600,
    );
    const block = Buffer.alloc(65536);
    let size;
    while ((size = readSync(input, block, 0, block.length, null)) > 0) {
      digest.update(block.subarray(0, size));
      let written = 0;
      while (written < size)
        written += writeSync(output, block, written, size - written);
      sizeBytes += size;
    }
    return { sha256: digest.digest("hex"), sizeBytes };
  } finally {
    closeSync(input);
    if (output !== undefined) closeSync(output);
  }
}
export class LocalMediaStorage implements MediaStorage {
  readonly root: string;
  constructor(root: string) {
    this.root = resolve(root);
    if (realpathSync(this.root) !== this.root)
      throw new AppError("MEDIA_PATH_UNSAFE", 422);
  }
  read(asset: MediaAsset, permission: "public" | "private-authorized"): Buffer {
    const parsed = mediaAssetSchema.safeParse(asset);
    if (!parsed.success) throw new AppError("MEDIA_MANIFEST_INVALID", 422);
    if (asset.visibility === "private" && permission !== "private-authorized")
      throw new AppError("MEDIA_FORBIDDEN", 403);
    if (
      asset.visibility === "public" &&
      asset.authorization === "private-owner"
    )
      throw new AppError("MEDIA_LICENSE_INVALID", 403);
    if (asset.sizeBytes > 8 * 1024 * 1024)
      throw new AppError("MEDIA_STREAM_REQUIRED", 413);
    let bytes: Buffer;
    try {
      bytes = readWithin(this.root, asset.storageKey, asset.sizeBytes);
    } catch (e) {
      if (e instanceof AppError) throw e;
      throw new AppError("MEDIA_MISSING", 404);
    }
    if (bytes.length !== asset.sizeBytes || sha256(bytes) !== asset.sha256)
      throw new AppError("MEDIA_HASH_MISMATCH", 422);
    return bytes;
  }
  verify(asset: MediaAsset) {
    mediaAssetSchema.parse(asset);
    if (
      asset.visibility === "public" &&
      asset.authorization === "private-owner"
    )
      throw new AppError("MEDIA_LICENSE_INVALID", 403);
    const actual = fingerprintWithin(this.root, asset.storageKey);
    if (actual.sha256 !== asset.sha256 || actual.sizeBytes !== asset.sizeBytes)
      throw new AppError("MEDIA_HASH_MISMATCH", 422);
  }
}
export function writeNew(root: string, key: string, bytes: string | Buffer) {
  safeKey(key);
  const target = join(root, key);
  mkdirSync(dirname(target), { recursive: true, mode: 0o700 });
  // Internal maintenance-only output, never a client-provided destination.
  if (realpathSync(dirname(target)) !== dirname(target))
    throw new AppError("MEDIA_PATH_UNSAFE", 422);
  writeFileSync(target, bytes, { flag: "wx", mode: 0o600 });
}
