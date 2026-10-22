import { DatabaseSync } from "node:sqlite";
import {
  readFileSync,
  mkdirSync,
  existsSync,
  lstatSync,
  realpathSync,
  statfsSync,
  constants,
  accessSync,
} from "node:fs";
import { resolve, join } from "node:path";
import { randomUUID, createHash } from "node:crypto";
import {
  AppError,
  canonical,
  sha256,
  type LearningCommand,
  type CommandResult,
} from "../contracts/index.ts";
import { WriterLease } from "./writer-lock.ts";

export const SCHEMA_VERSION = 1;
const migration = readFileSync(
  new URL("./001-foundation.sql", import.meta.url),
  "utf8",
);
const migrationHash = sha256(migration);
export const TABLES = [
  "schema_migrations",
  "learners",
  "subjects",
  "subject_states",
  "server_attempts",
  "command_receipts",
  "learning_events",
  "media_assets",
  "content_manifests",
  "content_media_refs",
  "audit_log",
] as const;
export function ownedDirectory(path: string): string {
  const absolute = resolve(path);
  mkdirSync(absolute, { recursive: true, mode: 0o700 });
  if (
    lstatSync(absolute).isSymbolicLink() ||
    realpathSync(absolute) !== absolute
  )
    throw new AppError("SYMLINK_DIRECTORY", 503);
  const type = Number(statfsSync(absolute).type) >>> 0;
  if ([0x6969, 0x517b, 0xff534d42, 0x65735546].includes(type))
    throw new AppError("NETWORK_OR_FUSE_FILESYSTEM_REJECTED", 503);
  return absolute;
}
export class Store {
  readonly db: DatabaseSync;
  readonly directory: string;
  readonly file: string;
  private lease: WriterLease;
  private identity: { dev: number; ino: number };
  private closed = false;
  constructor(directory: string) {
    this.directory = ownedDirectory(directory);
    this.file = join(this.directory, "learning.sqlite");
    this.lease = new WriterLease(this.directory);
    let db: DatabaseSync | undefined;
    try {
      if (existsSync(this.file) && lstatSync(this.file).isSymbolicLink())
        throw new AppError("SYMLINK_DATABASE", 503);
      db = new DatabaseSync(this.file);
      this.db = db;
      // Reject unknown schema before changing journal mode or running migrations.
      this.migrate();
      db.exec(
        "PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=3000;",
      );
      this.verifyIntegrity();
      const file = lstatSync(this.file);
      this.identity = { dev: file.dev, ino: file.ino };
    } catch (e) {
      db?.close();
      this.lease.close();
      throw e;
    }
  }
  private migrate() {
    const db = this.db;
    const tables = db
      .prepare(
        "SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%'",
      )
      .all()
      .map((x) => x.name);
    const userVersion = Number(
      Object.values(db.prepare("PRAGMA user_version").get()!)[0],
    );
    if (!tables.length && userVersion === 0) {
      this.transaction(() => {
        db.exec(
          "CREATE TABLE schema_migrations(version INTEGER PRIMARY KEY, sha256 TEXT NOT NULL, applied_at TEXT NOT NULL) STRICT;",
        );
        db.exec(migration);
        db.prepare("INSERT INTO schema_migrations VALUES(1,?,?)").run(
          migrationHash,
          new Date().toISOString(),
        );
        db.exec("PRAGMA user_version=1");
      });
    } else {
      if (
        !tables.includes("schema_migrations") ||
        userVersion !== SCHEMA_VERSION
      )
        throw new AppError("SCHEMA_VERSION_UNSUPPORTED", 503);
      const versions = db
        .prepare(
          "SELECT version,sha256 FROM schema_migrations ORDER BY version",
        )
        .all();
      if (
        versions.length !== 1 ||
        versions[0].version !== 1 ||
        versions[0].sha256 !== migrationHash
      )
        throw new AppError("SCHEMA_MIGRATION_MISMATCH", 503);
      // Exact column definitions, indexes and triggers must match the approved migration.
      const expected = new DatabaseSync(":memory:");
      try {
        expected.exec(
          "CREATE TABLE schema_migrations(version INTEGER PRIMARY KEY, sha256 TEXT NOT NULL, applied_at TEXT NOT NULL) STRICT;" +
            migration,
        );
        const sql =
          "SELECT type,name,tbl_name,sql FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%' ORDER BY type,name";
        if (
          canonical(db.prepare(sql).all()) !==
          canonical(expected.prepare(sql).all())
        )
          throw new AppError("SCHEMA_SHAPE_MISMATCH", 503);
      } finally {
        expected.close();
      }
    }
  }
  transaction<T>(operation: () => T): T {
    this.lease.assertOwned();
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const result = operation();
      this.db.exec("COMMIT");
      return result;
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }
  environment() {
    return {
      sqlite: this.db.prepare("SELECT sqlite_version() v").get()!.v,
      pragmas: Object.fromEntries(
        ["journal_mode", "synchronous", "foreign_keys", "busy_timeout"].map(
          (k) => [k, Object.values(this.db.prepare("PRAGMA " + k).get()!)[0]],
        ),
      ),
    };
  }
  verifyIntegrity() {
    const p = this.environment().pragmas;
    if (
      p.journal_mode !== "wal" ||
      p.synchronous !== 2 ||
      p.foreign_keys !== 1 ||
      p.busy_timeout !== 3000
    )
      throw new AppError("SQLITE_PRAGMAS_INVALID", 503);
    if (
      Object.values(this.db.prepare("PRAGMA quick_check").get()!)[0] !== "ok" ||
      this.db.prepare("PRAGMA foreign_key_check").all().length
    )
      throw new AppError("DATABASE_INTEGRITY", 503);
  }
  /** At most six SQL operations, no table scan. A short empty write transaction
   * detects inability to acquire the SQLite writer, not just a live JS process.
   */
  isReady(): boolean {
    if (this.closed) return false;
    try {
      this.lease.assertOwned();
      const file = lstatSync(this.file);
      if (
        file.isSymbolicLink() ||
        file.dev !== this.identity.dev ||
        file.ino !== this.identity.ino
      )
        return false;
      accessSync(this.file, constants.R_OK | constants.W_OK);
      accessSync(this.directory, constants.W_OK | constants.X_OK);
      this.db.exec("PRAGMA busy_timeout=50");
      try {
        this.db.exec("BEGIN IMMEDIATE");
        try {
          return (
            this.db.prepare("SELECT 1 ok").get()!.ok === 1 &&
            Object.values(this.db.prepare("PRAGMA user_version").get()!)[0] ===
              SCHEMA_VERSION
          );
        } finally {
          this.db.exec("ROLLBACK");
        }
      } finally {
        this.db.exec("PRAGMA busy_timeout=3000");
      }
    } catch {
      return false;
    }
  }
  state(learner: string, subject: string) {
    const row = this.db
      .prepare(
        "SELECT revision,projection,content_version FROM subject_states WHERE learner_id=? AND subject_id=?",
      )
      .get(learner, subject);
    if (!row) throw new AppError("CONTENT_NOT_INSTALLED", 404);
    return {
      schemaVersion: 1,
      revision: Number(row.revision),
      contentVersion: String(row.content_version),
      state: JSON.parse(String(row.projection)),
    };
  }
  command(c: LearningCommand, afterWrites?: () => void): CommandResult {
    return this.transaction(() => {
      const digest = sha256(canonical(c));
      const receipt = this.db
        .prepare(
          "SELECT * FROM command_receipts WHERE learner_id=? AND command_id=?",
        )
        .get(c.learnerId, c.commandId);
      const state = this.state(c.learnerId, c.subjectId);
      if (receipt) {
        if (
          receipt.request_hash !== digest ||
          receipt.subject_id !== c.subjectId
        )
          throw new AppError("IDEMPOTENCY_CONFLICT", 409);
        return {
          ...JSON.parse(String(receipt.result_json)),
          duplicate: true,
          currentRevision: state.revision,
        };
      }
      if (state.revision !== c.expectedRevision)
        throw new AppError("STALE_REVISION", 409, state.revision);
      if (state.contentVersion !== c.contentVersion)
        throw new AppError("CONTENT_VERSION_CONFLICT", 409);
      const attempt = this.db
        .prepare(
          "SELECT id FROM server_attempts WHERE id=? AND learner_id=? AND subject_id=? AND content_version=?",
        )
        .get(c.serverAttemptId, c.learnerId, c.subjectId, c.contentVersion);
      if (!attempt) throw new AppError("ATTEMPT_NOT_ISSUED", 409);
      const revision = state.revision + 1;
      const event = {
        schemaVersion: 1,
        eventId: randomUUID(),
        learnerId: c.learnerId,
        subjectId: c.subjectId,
        type: "reading-observed",
        quality: "ungraded",
        assessedBy: "unassessed",
        synthetic: true,
        occurredAt: c.occurredAt,
        receivedAt: new Date().toISOString(),
        contentVersion: c.contentVersion,
        position: c.input.position,
      };
      const response: CommandResult = {
        schemaVersion: 1,
        commandId: c.commandId,
        duplicate: false,
        committedRevision: revision,
        currentRevision: revision,
        events: [event],
        result: { position: c.input.position },
      };
      this.db
        .prepare("INSERT INTO command_receipts VALUES(?,?,?,?,?,?)")
        .run(
          c.learnerId,
          c.commandId,
          c.subjectId,
          digest,
          revision,
          canonical(response),
        );
      this.db
        .prepare("INSERT INTO learning_events VALUES(?,?,?,?,?,?)")
        .run(
          event.eventId,
          c.learnerId,
          c.subjectId,
          c.commandId,
          revision,
          canonical(event),
        );
      const changed = this.db
        .prepare(
          "UPDATE subject_states SET revision=?,projection=? WHERE learner_id=? AND subject_id=? AND revision=?",
        )
        .run(
          revision,
          canonical({
            lastPosition: c.input.position,
            observedCount: state.state.observedCount + 1,
          }),
          c.learnerId,
          c.subjectId,
          c.expectedRevision,
        );
      if (Number(changed.changes) !== 1)
        throw new AppError("STALE_REVISION", 409, state.revision);
      this.db
        .prepare("INSERT INTO audit_log(action,at,metadata) VALUES(?,?,?)")
        .run(
          "synthetic-command",
          event.receivedAt,
          canonical({ commandId: c.commandId, revision }),
        );
      afterWrites?.();
      return response;
    });
  }
  summary() {
    return Object.fromEntries(
      TABLES.map((table) => {
        let count = 0;
        const digest = createHash("sha256");
        digest.update("[");
        for (const row of this.db
          .prepare(
            "SELECT * FROM " +
              table +
              " ORDER BY " +
              (table === "learning_events" ? "event_id" : "1,2"),
          )
          .iterate()) {
          if (count) digest.update(",");
          digest.update(canonical(row));
          count++;
        }
        digest.update("]");
        return [table, { count, sha256: digest.digest("hex") }];
      }),
    );
  }
  close() {
    if (!this.closed) {
      this.closed = true;
      try {
        if (this.db.isOpen) this.db.close();
      } finally {
        this.lease.close();
      }
    }
  }
}
