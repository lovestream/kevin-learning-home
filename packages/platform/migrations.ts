import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { AppError, canonical, sha256 } from "../contracts/index.ts";

export const CURRENT_SCHEMA = 2;
export const migrations = ["001-foundation.sql", "002-family-auth.sql"].map(
  (name) => readFileSync(new URL(name, import.meta.url), "utf8"),
);
const metadataSQL =
  "CREATE TABLE schema_migrations(version INTEGER PRIMARY KEY, sha256 TEXT NOT NULL, applied_at TEXT NOT NULL) STRICT;";
const shapeSQL =
  "SELECT type,name,tbl_name,sql FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%' ORDER BY type,name";
export function version(db: DatabaseSync) {
  return Number(Object.values(db.prepare("PRAGMA user_version").get()!)[0]);
}
export function validateSchema(db: DatabaseSync, v: number) {
  if (![1, 2].includes(v))
    throw new AppError("SCHEMA_VERSION_UNSUPPORTED", 503);
  const rows = db
    .prepare("SELECT version,sha256 FROM schema_migrations ORDER BY version")
    .all();
  if (
    rows.length !== v ||
    rows.some(
      (r, i) => r.version !== i + 1 || r.sha256 !== sha256(migrations[i]),
    )
  )
    throw new AppError("SCHEMA_MIGRATION_MISMATCH", 503);
  const expected = new DatabaseSync(":memory:");
  try {
    expected.exec(
      "PRAGMA foreign_keys=OFF;" +
        metadataSQL +
        migrations.slice(0, v).join("\n"),
    );
    if (
      canonical(db.prepare(shapeSQL).all()) !==
      canonical(expected.prepare(shapeSQL).all())
    )
      throw new AppError("SCHEMA_SHAPE_MISMATCH", 503);
  } finally {
    expected.close();
  }
}
export function applyV2(db: DatabaseSync, beforeCommit?: () => void) {
  validateSchema(db, 1);
  // SQLite's generalized ALTER TABLE procedure: never rename the old parent.
  db.exec("PRAGMA foreign_keys=OFF");
  try {
    db.exec("BEGIN IMMEDIATE");
    try {
      db.exec(migrations[1]);
      beforeCommit?.();
      if (db.prepare("PRAGMA foreign_key_check").all().length)
        throw new AppError("MIGRATION_FOREIGN_KEYS", 503);
      db.prepare("INSERT INTO schema_migrations VALUES(2,?,?)").run(
        sha256(migrations[1]),
        new Date().toISOString(),
      );
      db.exec("PRAGMA user_version=2");
      validateSchema(db, 2);
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  } finally {
    db.exec("PRAGMA foreign_keys=ON");
  }
}
export function initialize(db: DatabaseSync, legacyMaintenance: boolean) {
  const tables = db
    .prepare(
      "SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%'",
    )
    .all();
  let v = version(db);
  if (!tables.length && v === 0) {
    db.exec("BEGIN IMMEDIATE");
    try {
      db.exec(metadataSQL + migrations[0]);
      db.prepare("INSERT INTO schema_migrations VALUES(1,?,?)").run(
        sha256(migrations[0]),
        new Date().toISOString(),
      );
      db.exec("PRAGMA user_version=1; COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
    if (!legacyMaintenance) applyV2(db);
    v = version(db);
  } else {
    if (
      !tables.some((t) => t.name === "schema_migrations") ||
      ![1, 2].includes(v)
    )
      throw new AppError("SCHEMA_VERSION_UNSUPPORTED", 503);
    validateSchema(db, v);
    if (v === 1 && !legacyMaintenance)
      throw new AppError("SCHEMA_UPGRADE_REQUIRES_CHECKPOINT", 503);
  }
  validateSchema(db, v);
  return v;
}
