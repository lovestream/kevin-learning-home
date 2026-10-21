import fsExt from "fs-ext";
import {
  openSync,
  closeSync,
  readSync,
  writeFileSync,
  fstatSync,
  lstatSync,
  realpathSync,
  linkSync,
  unlinkSync,
  fsyncSync,
  ftruncateSync,
  constants,
} from "node:fs";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { AppError } from "../contracts/index.ts";

const MARKER =
  JSON.stringify({ format: "klh-writer-flock", version: 2 }) + "\n";
function metadata(fd: number): string {
  const size = fstatSync(fd).size;
  if (size > 1024)
    throw new AppError("LEGACY_WRITER_LOCK_REQUIRES_OFFLINE_MIGRATION", 503);
  const buffer = Buffer.alloc(size);
  readSync(fd, buffer, 0, size, 0);
  return buffer.toString();
}
function isCurrent(value: string) {
  try {
    const m = JSON.parse(value);
    return m.format === "klh-writer-flock" && m.version === 2;
  } catch {
    return false;
  }
}
function flock(fd: number) {
  try {
    fsExt.flockSync(fd, "exnb");
  } catch (e) {
    if (
      ["ENOSYS", "ENOTSUP", "EOPNOTSUPP"].includes(
        (e as NodeJS.ErrnoException).code ?? "",
      )
    )
      throw new AppError("WRITER_FLOCK_UNSUPPORTED", 503);
    throw new AppError("WRITER_LOCKED_OR_UNWRITABLE", 503);
  }
}
function sameFile(fd: number, path: string) {
  const open = fstatSync(fd),
    named = lstatSync(path);
  return (
    open.isFile() &&
    !named.isSymbolicLink() &&
    open.dev === named.dev &&
    open.ino === named.ino
  );
}
/** Stable inode + kernel flock, never unlink a published lock. PID/timeout are
 * not ownership evidence. The only owner is the held open file description.
 */
export class WriterLease {
  private fd: number;
  private path: string;
  private released = false;
  constructor(directory: string) {
    this.path = join(directory, ".writer.lock");
    let fd: number | undefined;
    try {
      try {
        fd = openSync(this.path, constants.O_RDWR | constants.O_NOFOLLOW);
        flock(fd);
      } catch (e) {
        if (fd !== undefined || (e as NodeJS.ErrnoException).code !== "ENOENT")
          throw e;
        // Publish an already locked, fully initialized inode atomically. A crash
        // before publication cannot leave an empty stable marker for a successor.
        const temporary = join(directory, ".writer-init-" + randomUUID());
        fd = openSync(
          temporary,
          constants.O_CREAT |
            constants.O_EXCL |
            constants.O_RDWR |
            constants.O_NOFOLLOW,
          0o600,
        );
        try {
          flock(fd);
          writeFileSync(fd, MARKER);
          fsyncSync(fd);
          try {
            linkSync(temporary, this.path);
            const parent = openSync(directory, "r");
            try {
              fsyncSync(parent);
            } finally {
              closeSync(parent);
            }
          } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
            closeSync(fd);
            fd = undefined;
            fd = openSync(this.path, constants.O_RDWR | constants.O_NOFOLLOW);
            flock(fd);
          }
        } finally {
          unlinkSync(temporary);
        }
      }
      if (!sameFile(fd!, this.path))
        throw new AppError("WRITER_LOCK_IDENTITY_CHANGED", 503);
      if (!isCurrent(metadata(fd!)))
        throw new AppError(
          "LEGACY_WRITER_LOCK_REQUIRES_OFFLINE_MIGRATION",
          503,
        );
      this.fd = fd!;
    } catch (e) {
      if (fd !== undefined) closeSync(fd);
      if (e instanceof AppError) throw e;
      throw new AppError("WRITER_LOCKED_OR_UNWRITABLE", 503);
    }
  }
  assertOwned() {
    if (this.released || !sameFile(this.fd, this.path))
      throw new AppError("WRITER_LOCK_IDENTITY_CHANGED", 503);
  }
  close() {
    if (!this.released) {
      this.released = true;
      closeSync(this.fd);
    }
  }
}
/** Only an explicitly acknowledged offline v1 transition, never automatic stale
 * PID recovery. Operator must stop every old process/container and its restarts.
 */
export function migrateLegacyWriterLock(
  directory: string,
  confirmedOffline: boolean,
) {
  if (!confirmedOffline)
    throw new AppError("OFFLINE_V1_STOP_CONFIRMATION_REQUIRED", 403);
  const root = resolve(directory);
  if (realpathSync(root) !== root || lstatSync(root).isSymbolicLink())
    throw new AppError("SYMLINK_DIRECTORY", 503);
  const path = join(root, ".writer.lock"),
    fd = openSync(path, constants.O_RDWR | constants.O_NOFOLLOW);
  try {
    flock(fd);
    if (!sameFile(fd, path))
      throw new AppError("WRITER_LOCK_IDENTITY_CHANGED", 503);
    const original = metadata(fd);
    if (isCurrent(original))
      return { status: "already-current", writerProtocol: 2 };
    let legacy;
    try {
      legacy = JSON.parse(original);
    } catch {
      throw new AppError("LEGACY_LOCK_METADATA_INVALID", 503);
    }
    if (
      legacy.owner !== "klh-foundation" ||
      !Number.isSafeInteger(legacy.pid) ||
      legacy.pid <= 0 ||
      Object.keys(legacy).sort().join(",") !== "owner,pid"
    )
      throw new AppError("LEGACY_LOCK_METADATA_INVALID", 503);
    const preserved = ".writer-v1-preserved-" + randomUUID() + ".json";
    const backup = openSync(
      join(root, preserved),
      constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY,
      0o600,
    );
    try {
      writeFileSync(backup, original);
      fsyncSync(backup);
    } finally {
      closeSync(backup);
    }
    // Never remove/recreate the stable inode: v1 O_EXCL startups stay fenced.
    ftruncateSync(fd, 0);
    writeFileSync(fd, MARKER);
    fsyncSync(fd);
    const parent = openSync(root, "r");
    try {
      fsyncSync(parent);
    } finally {
      closeSync(parent);
    }
    return {
      status: "migrated-offline",
      writerProtocol: 2,
      preservedLegacyMarker: preserved,
    };
  } finally {
    closeSync(fd);
  }
}
