// Isolated synthetic persistence for independent review. Never constructed by production main or NAS preview.
import { DatabaseSync } from "node:sqlite";
import { join, basename, dirname, resolve } from "node:path";
import { tmpdir } from "node:os";
import {
  lstatSync,
  realpathSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { WriterLease } from "../platform/writer-lock.ts";
import { AppError } from "../contracts/index.ts";
import {
  freshTraining,
  validateTraining,
  applyTraining,
  exportTraining,
  restoreTraining,
  trainingData,
  casePreview,
  todayTraining,
  type TrainingState,
  type TrainingChannel,
} from "./engine.mjs";
import {
  freshStudy,
  validateStudy,
  studyData,
  applyStudy,
  exportStudy,
  restoreStudy,
  type StudyState,
  type StudyChannel,
} from "./study.mjs";
const digest = (v: unknown) =>
  createHash("sha256").update(JSON.stringify(v)).digest("hex");
const validLearner = (id: string) => {
  if (!/^[A-Za-z0-9][A-Za-z0-9:._-]{0,119}$/.test(id))
    throw new AppError("LEARNER_INVALID", 400);
};
const marker = "klh-math-synthetic-review.v1\n";
export class MathTrainingRepository {
  private db!: DatabaseSync;
  private lease: WriterLease;
  private clock: () => number;
  constructor(directory: string, clock: () => number = Date.now) {
    if (process.env.NODE_ENV !== "test")
      throw new AppError("MATH_TRAINING_SYNTHETIC_ONLY", 503);
    const path = resolve(directory),
      parent = realpathSync(dirname(path));
    if (
      !basename(path).startsWith("klh-math-review-") ||
      parent !== realpathSync(tmpdir()) ||
      lstatSync(path).isSymbolicLink() ||
      realpathSync(path) !== path
    )
      throw new AppError("SYNTHETIC_DIRECTORY_REQUIRED", 503);
    const owner = join(path, ".math-review-owner");
    if (!existsSync(owner)) {
      if (readdirSync(path).length)
        throw new AppError("EMPTY_SYNTHETIC_DIRECTORY_REQUIRED", 503);
      writeFileSync(owner, marker, { flag: "wx", mode: 0o600 });
    }
    if (lstatSync(owner).isSymbolicLink())
      throw new AppError("SYNTHETIC_OWNER_MISMATCH", 503);
    if (readFileSync(owner, "utf8") !== marker)
      throw new AppError("SYNTHETIC_OWNER_MISMATCH", 503);
    for (const file of readdirSync(path))
      if (
        ![
          ".math-review-owner",
          ".writer.lock",
          "training.sqlite",
          "training.sqlite-wal",
          "training.sqlite-shm",
        ].includes(file) ||
        lstatSync(join(path, file)).isSymbolicLink()
      )
        throw new AppError("SYNTHETIC_DIRECTORY_MISMATCH", 503);
    this.clock = clock;
    this.lease = new WriterLease(path);
    try {
      this.db = new DatabaseSync(join(path, "training.sqlite"));
      this.db.exec(
        "PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS training_meta(version INTEGER NOT NULL); INSERT INTO training_meta SELECT 1 WHERE NOT EXISTS(SELECT 1 FROM training_meta); CREATE TABLE IF NOT EXISTS training_states(learner_id TEXT PRIMARY KEY, revision INTEGER NOT NULL CHECK(revision>0), payload TEXT NOT NULL, sha256 TEXT NOT NULL); CREATE TABLE IF NOT EXISTS study_states(learner_id TEXT PRIMARY KEY, revision INTEGER NOT NULL CHECK(revision>0), payload TEXT NOT NULL, sha256 TEXT NOT NULL);",
      );
      if (
        this.db.prepare("SELECT version FROM training_meta").get()?.version !==
        1
      )
        throw new AppError("MATH_TRAINING_SCHEMA_UNSUPPORTED", 503);
    } catch (e) {
      try {
        this.db?.close();
      } finally {
        this.lease.close();
      }
      throw e;
    }
  }
  private transaction<T>(fn: () => T): T {
    this.lease.assertOwned();
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const result = fn();
      this.db.exec("COMMIT");
      return result;
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }
  state(id: string): TrainingState {
    this.lease.assertOwned();
    validLearner(id);
    const row = this.db
      .prepare("SELECT payload,sha256 FROM training_states WHERE learner_id=?")
      .get(id);
    if (!row) return freshTraining();
    const p = JSON.parse(String(row.payload)) as TrainingState;
    if (digest(p) !== row.sha256)
      throw new AppError("MATH_TRAINING_CORRUPT", 503);
    validateTraining(p);
    return p;
  }
  dispatch(
    id: string,
    channel: TrainingChannel,
    event: Record<string, unknown>,
  ) {
    validLearner(id);
    return this.transaction(() => {
      const p = this.state(id),
        before = digest(p),
        result = applyTraining(p, channel, event, this.clock());
      if (before !== digest(p))
        this.db
          .prepare(
            "INSERT INTO training_states VALUES(?,1,?,?) ON CONFLICT(learner_id) DO UPDATE SET revision=revision+1,payload=excluded.payload,sha256=excluded.sha256",
          )
          .run(id, JSON.stringify(p), digest(p));
      return result;
    });
  }
  data(id: string, parent = false) {
    return trainingData(this.state(id), this.clock(), parent);
  }
  case(id: string, caseId: string) {
    return casePreview(this.state(id), caseId);
  }
  today(id: string) {
    validLearner(id);
    return this.transaction(() => {
      const p = this.state(id),
        before = digest(p),
        result = todayTraining(p, this.clock());
      if (before !== digest(p))
        this.db
          .prepare(
            "INSERT INTO training_states VALUES(?,1,?,?) ON CONFLICT(learner_id) DO UPDATE SET revision=revision+1,payload=excluded.payload,sha256=excluded.sha256",
          )
          .run(id, JSON.stringify(p), digest(p));
      return result;
    });
  }
  backup(id: string) {
    return { scope: id, ...exportTraining(this.state(id)) };
  }
  restore(id: string, envelope: unknown) {
    validLearner(id);
    const v = envelope as { scope?: unknown };
    if (v?.scope !== id) throw new AppError("RESTORE_SCOPE_FORBIDDEN", 403);
    const p = restoreTraining(v);
    return this.transaction(() => {
      this.db
        .prepare(
          "INSERT INTO training_states VALUES(?,1,?,?) ON CONFLICT(learner_id) DO UPDATE SET revision=revision+1,payload=excluded.payload,sha256=excluded.sha256",
        )
        .run(id, JSON.stringify(p), digest(p));
      return this.data(id, true);
    });
  }
  summary() {
    return {
      syntheticOnly: true,
      schemaVersion: 1,
      learners: this.db
        .prepare(
          "SELECT learner_id,revision,sha256 FROM training_states ORDER BY learner_id",
        )
        .all(),
    };
  }
  studyState(id: string): StudyState {
    this.lease.assertOwned();
    validLearner(id);
    const row = this.db
      .prepare("SELECT payload,sha256 FROM study_states WHERE learner_id=?")
      .get(id);
    if (!row) return freshStudy();
    const p = JSON.parse(String(row.payload)) as StudyState;
    if (digest(p) !== row.sha256) throw new AppError("MATH_STUDY_CORRUPT", 503);
    validateStudy(p);
    return p;
  }
  studyData(id: string) {
    return studyData(this.studyState(id), this.clock());
  }
  studyDispatch(
    id: string,
    channel: StudyChannel,
    event: Record<string, unknown>,
  ) {
    validLearner(id);
    return this.transaction(() => {
      const p = this.studyState(id),
        before = digest(p),
        result = applyStudy(p, channel, event, this.clock());
      if (before !== digest(p))
        this.db
          .prepare(
            "INSERT INTO study_states VALUES(?,1,?,?) ON CONFLICT(learner_id) DO UPDATE SET revision=revision+1,payload=excluded.payload,sha256=excluded.sha256",
          )
          .run(id, JSON.stringify(p), digest(p));
      return result;
    });
  }
  studyBackup(id: string) {
    return { scope: id, ...exportStudy(this.studyState(id)) };
  }
  studyRestore(id: string, envelope: unknown) {
    validLearner(id);
    const v = envelope as { scope?: unknown };
    if (v?.scope !== id) throw new AppError("RESTORE_SCOPE_FORBIDDEN", 403);
    const p = restoreStudy(v);
    return this.transaction(() => {
      this.db
        .prepare(
          "INSERT INTO study_states VALUES(?,1,?,?) ON CONFLICT(learner_id) DO UPDATE SET revision=revision+1,payload=excluded.payload,sha256=excluded.sha256",
        )
        .run(id, JSON.stringify(p), digest(p));
      return this.studyData(id);
    });
  }
  close() {
    try {
      this.db.close();
    } finally {
      this.lease.close();
    }
  }
}
