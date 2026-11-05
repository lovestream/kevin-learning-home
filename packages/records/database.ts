import { DatabaseSync } from "node:sqlite";
import { readFileSync, existsSync, lstatSync, chmodSync } from "node:fs";
import { join } from "node:path";
import { AppError, sha256 } from "../contracts/index.ts";
import { ownedDirectory } from "../platform/store.ts";
import { WriterLease } from "../platform/writer-lock.ts";

const sql = readFileSync(new URL("./schema.sql", import.meta.url), "utf8");
export const PRIVATE_SCHEMA_HASH = sha256(sql);
export class RecordsDatabase {
  readonly db: DatabaseSync;
  readonly root: string;
  readonly file: string;
  private lease: WriterLease;
  private closed = false;
  private identity: { dev: number; ino: number };
  readonly synthetic: boolean;
  constructor(root: string, synthetic: boolean) {
    this.synthetic=synthetic;
    this.root = ownedDirectory(root);
    if (lstatSync(this.root).mode & 0o077)
      throw new AppError("PRIVATE_DIRECTORY_REQUIRED", 503);
    this.file = join(this.root, "private.sqlite");
    this.lease = new WriterLease(this.root);
    let db: DatabaseSync | undefined;
    try {
      if (existsSync(this.file) && lstatSync(this.file).isSymbolicLink())
        throw new AppError("SYMLINK_DATABASE", 503);
      db = new DatabaseSync(this.file); this.db = db;chmodSync(this.file,0o600);
      const version = Number(db.prepare("PRAGMA user_version").get()!.user_version);
      if (!version) {
        if (db.prepare("SELECT name FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%'").all().length)
          throw new AppError("PRIVATE_SCHEMA_UNKNOWN", 503);
        this.transaction(() => {
          db!.exec(sql);
          db!.prepare("INSERT INTO metadata VALUES(1,1,?,?,1)").run(PRIVATE_SCHEMA_HASH, +synthetic);
          db!.exec("PRAGMA user_version=1");
        });
      } else if (version !== 1) throw new AppError("PRIVATE_SCHEMA_UNKNOWN", 503);
      const meta = db.prepare("SELECT * FROM metadata WHERE id=1").get();
      if (!meta || meta.schema_hash !== PRIVATE_SCHEMA_HASH || meta.synthetic !== +synthetic)
        throw new AppError("PRIVATE_SCHEMA_OR_MODE_MISMATCH", 503);
      const expected = new DatabaseSync(":memory:");
      try {
        expected.exec(sql);
        const shape = "SELECT type,name,tbl_name,sql FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%' ORDER BY type,name";
        if (JSON.stringify(db.prepare(shape).all()) !== JSON.stringify(expected.prepare(shape).all()))
          throw new AppError("PRIVATE_SCHEMA_SHAPE_MISMATCH", 503);
      } finally { expected.close(); }
      db.exec("PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=3000;");
      chmodSync(this.file, 0o600);
      this.verify(); this.identity = lstatSync(this.file);
    } catch(e) { db?.close(); this.lease.close(); throw e; }
  }
  transaction<T>(fn: () => T): T {
    this.lease.assertOwned(); this.db.exec("BEGIN IMMEDIATE");
    try { const value = fn(); this.db.exec("COMMIT"); return value; }
    catch(e) { this.db.exec("ROLLBACK"); throw e; }
  }
  verify() {
    if (this.db.prepare("PRAGMA quick_check").get()!.quick_check !== "ok" || this.db.prepare("PRAGMA foreign_key_check").all().length)
      throw new AppError("PRIVATE_DATABASE_INTEGRITY", 503);
  }
  ready() {
    if(this.closed) return false;
    try {
      this.lease.assertOwned(); const s=lstatSync(this.file);
      if(s.isSymbolicLink() || s.dev!==this.identity.dev || s.ino!==this.identity.ino) return false;
      this.db.exec("PRAGMA busy_timeout=50");
      return this.transaction(()=>Number(this.db.prepare("SELECT epoch FROM metadata WHERE id=1").get()!.epoch)>0);
    } catch { return false; }
    finally { if(!this.closed) this.db.exec("PRAGMA busy_timeout=3000"); }
  }
  audit(action: string, household?: string) {
    this.db.prepare("INSERT INTO private_audit(action,household_id,at) VALUES(?,?,?)").run(action,household??null,Date.now());
  }
  close() { if(!this.closed) { this.closed=true; this.db.close(); this.lease.close(); } }
}
