import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { pathToFileURL } from 'node:url';

export const MARKER = 'KLH-PR-1A synthetic-only v1\n';
export const OWNER = 'klh-pr1a-synthetic-v1';
export const IMAGE_DIGEST = 'sha256:152aceace5c03e2597988763165ee33e3fd3633636db0fc983cd2e126b02cfde';
export const PAYLOAD = JSON.stringify({ learnerId: 'synthetic-learner-1', activity: 'fixture', value: 7 });
const FILES = new Set(['.klh-pr1a-owned', 'progress.sqlite', 'progress.sqlite-wal', 'progress.sqlite-shm', 'backup.sqlite', 'restore']);

function guard(condition, code) {
  if (!condition) throw Object.assign(new Error(code), { code });
}

export function ownedDirectory(dir, fresh = false) {
  guard(path.isAbsolute(dir), 'DATA_DIR_MUST_BE_ABSOLUTE');
  // Refuse symlinks in any component, not just the final directory.
  let cursor = path.parse(dir).root;
  for (const segment of path.relative(cursor, dir).split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, segment);
    guard(!fs.lstatSync(cursor).isSymbolicLink(), 'SYMLINK_REFUSED');
  }
  const s = fs.lstatSync(dir);
  guard(s.isDirectory(), 'DATA_DIR_NOT_DIRECTORY');
  guard((s.mode & 0o022) === 0, 'DATA_DIR_GROUP_OR_WORLD_WRITABLE');
  guard(typeof process.getuid === 'function' && s.uid === process.getuid(), 'DATA_DIR_OWNER_MISMATCH');
  const names = fs.readdirSync(dir);
  guard(names.every(n => FILES.has(n)), 'UNKNOWN_FILE_REFUSED');
  for (const n of names) guard(!fs.lstatSync(path.join(dir, n)).isSymbolicLink(), 'SYMLINK_REFUSED');
  guard(fs.readFileSync(path.join(dir, '.klh-pr1a-owned'), 'utf8') === MARKER, 'OWNERSHIP_MARKER_REQUIRED');
  if (fresh) guard(names.length === 1, 'EXERCISE_REQUIRES_EMPTY_OWNED_DIRECTORY');
  return dir;
}

export function submit(db, eventId, payload) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const existing = db.prepare('SELECT payload FROM events WHERE event_id=?').get(eventId);
    if (existing) {
      guard(existing.payload === payload, 'EVENT_PAYLOAD_CONFLICT');
      db.exec('COMMIT');
      return 'duplicate';
    }
    db.prepare('INSERT INTO events(event_id,learner_id,payload) VALUES (?,?,?)')
      .run(eventId, 'synthetic-learner-1', payload);
    db.exec('COMMIT');
    return 'inserted';
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

function configure(db) {
  db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=3000;');
  const values = Object.fromEntries(['journal_mode', 'synchronous', 'foreign_keys', 'busy_timeout']
    .map(n => [n, Object.values(db.prepare(`PRAGMA ${n}`).get())[0]]));
  guard(values.journal_mode === 'wal' && values.synchronous === 2 && values.foreign_keys === 1 && values.busy_timeout === 3000,
    'PRAGMA_MISMATCH');
  return values;
}

function fingerprint(db) {
  const owner = db.prepare("SELECT value FROM meta WHERE key='owner'").get()?.value;
  guard(owner === OWNER, 'DATABASE_OWNER_MISMATCH');
  const learners = db.prepare('SELECT learner_id FROM learners ORDER BY learner_id').all();
  const events = db.prepare('SELECT event_id,learner_id,payload FROM events ORDER BY event_id').all();
  guard(JSON.stringify(learners) === JSON.stringify([{ learner_id: 'synthetic-learner-1' }]), 'LEARNER_MISMATCH');
  guard(JSON.stringify(events) === JSON.stringify([{ event_id: 'synthetic-event-1', learner_id: 'synthetic-learner-1', payload: PAYLOAD }]),
    'EVENT_STATE_MISMATCH');
  guard(db.prepare('PRAGMA integrity_check').get().integrity_check === 'ok', 'INTEGRITY_FAILED');
  return JSON.stringify({ learners, events });
}

export async function runProbe({ mode, dataDir, environment = 'local', repositorySha = 'UNKNOWN' }) {
  const report = { schemaVersion: 1, probeVersion: '1.0.0', timestampUtc: new Date().toISOString(),
    executionEnvironment: environment, repositorySha, mode, status: 'FAIL', checks: {},
    runtime: { node: process.versions.node, platform: process.platform, arch: process.arch,
      uid: process.getuid?.(), kernel: os.release(), baseImageDigest: process.env.KLH_BASE_IMAGE_DIGEST ?? null } };
  let db;
  const pass = (name, facts = {}) => { report.checks[name] = { status: 'PASS', ...facts }; };
  try {
    guard(['exercise', 'verify'].includes(mode), 'INVALID_MODE');
    guard(['local', 'ci', 'nas'].includes(environment), 'INVALID_ENVIRONMENT');
    guard(repositorySha === 'UNKNOWN' || /^[a-f0-9]{40}$/.test(repositorySha), 'INVALID_REPOSITORY_SHA');
    guard(process.getuid?.() !== 0 && process.getuid?.() !== undefined, 'NON_ROOT_REQUIRED');
    guard(process.versions.node === '24.15.0', 'NODE_VERSION_MISMATCH');
    if (process.env.KLH_BASE_IMAGE_DIGEST) {
      guard(process.env.KLH_BASE_IMAGE_DIGEST === IMAGE_DIGEST, 'IMAGE_DIGEST_MISMATCH');
      guard(process.platform === 'linux' && process.arch === 'x64', 'CONTAINER_PLATFORM_MISMATCH');
    }
    pass('runtime');
    ownedDirectory(dataDir, mode === 'exercise');
    pass('directorySafety');
    const { DatabaseSync } = await import('node:sqlite');
    pass('databaseSyncImport');
    const file = path.join(dataDir, 'progress.sqlite');
    if (mode === 'verify') {
      // Validate the synthetic ownership/state read-only before any writable open.
      db = new DatabaseSync(file, { readOnly: true });
      fingerprint(db);
      db.close();
    }
    db = new DatabaseSync(file);
    pass('sqliteVersion', { version: db.prepare('SELECT sqlite_version() AS version').get().version });
    pass('pragmas', { values: configure(db) });
    if (mode === 'exercise') {
      db.exec(`CREATE TABLE meta(key TEXT PRIMARY KEY, value TEXT NOT NULL);
        CREATE TABLE learners(learner_id TEXT PRIMARY KEY);
        CREATE TABLE events(event_id TEXT PRIMARY KEY, learner_id TEXT NOT NULL REFERENCES learners(learner_id), payload TEXT NOT NULL);`);
      db.prepare('INSERT INTO meta VALUES (?,?)').run('owner', OWNER);
      db.prepare('INSERT INTO learners VALUES (?)').run('synthetic-learner-1');
      guard(submit(db, 'synthetic-event-1', PAYLOAD) === 'inserted', 'COMMIT_FAILED');
      pass('transactionCommit');
      db.exec('BEGIN IMMEDIATE');
      db.prepare('INSERT INTO events VALUES (?,?,?)').run('synthetic-rollback', 'synthetic-learner-1', PAYLOAD);
      db.exec('ROLLBACK');
      guard(!db.prepare('SELECT 1 FROM events WHERE event_id=?').get('synthetic-rollback'), 'ROLLBACK_FAILED');
      pass('transactionRollback');
      guard(submit(db, 'synthetic-event-1', PAYLOAD) === 'duplicate', 'IDEMPOTENCY_FAILED');
      pass('eventIdIdempotency');
      let conflict = false;
      try { submit(db, 'synthetic-event-1', JSON.stringify({ synthetic: 'different' })); }
      catch (error) { conflict = error.code === 'EVENT_PAYLOAD_CONFLICT'; }
      guard(conflict, 'CONFLICT_NOT_REJECTED');
      fingerprint(db);
      pass('differentPayloadConflict');
      let fkRejected = false;
      try { db.prepare('INSERT INTO events VALUES (?,?,?)').run('synthetic-invalid', 'synthetic-absent', PAYLOAD); }
      catch (error) { fkRejected = error.errcode === 787; }
      guard(fkRejected, 'FOREIGN_KEY_NOT_ENFORCED');
      pass('foreignKeyEnforced');
      const expected = fingerprint(db);
      // SQLite takes a consistent snapshot, including committed WAL content.
      db.prepare('VACUUM INTO ?').run(path.join(dataDir, 'backup.sqlite'));
      pass('consistentBackup', { method: 'VACUUM INTO' });
      const restore = path.join(dataDir, 'restore');
      fs.mkdirSync(restore, { mode: 0o700 }); // must not already exist
      guard(fs.readdirSync(restore).length === 0, 'RESTORE_NOT_EMPTY');
      fs.writeFileSync(path.join(restore, '.klh-pr1a-owned'), MARKER, { flag: 'wx', mode: 0o600 });
      fs.copyFileSync(path.join(dataDir, 'backup.sqlite'), path.join(restore, 'progress.sqlite'), fs.constants.COPYFILE_EXCL);
      const restored = new DatabaseSync(path.join(restore, 'progress.sqlite'), { readOnly: true });
      try { guard(fingerprint(restored) === expected, 'RESTORE_STATE_MISMATCH'); }
      finally { restored.close(); }
      pass('emptyDirectoryRestore', { integrity: 'ok' });
    } else {
      pass('separateProcessPersistence', { integrity: 'ok' });
    }
    fingerprint(db);
    pass('integrityCheck', { value: 'ok' });
    db.close();
    db = new (await import('node:sqlite')).DatabaseSync(file, { readOnly: true });
    fingerprint(db);
    pass('disconnectReconnect', { integrity: 'ok' });
    report.status = 'PASS';
  } catch (error) {
    // Only publish allow-listed code, never a filesystem path or arbitrary SQL/error text.
    const code = typeof error.code === 'string' && /^[A-Z_]{3,70}$/.test(error.code) ? error.code : 'PROBE_FAILED_REDACTED';
    report.checks.failure = { status: 'FAIL', code };
  } finally { db?.close(); }
  return report;
}

async function cli() {
  const args = process.argv.slice(2);
  if (!args.length || args.includes('--help')) {
    console.log('Synthetic SQLite only: probe.mjs exercise|verify --data-dir ABSOLUTE --environment local|ci|nas --repository-sha SHA');
    return;
  }
  const [mode, ...flags] = args;
  const options = {};
  for (let i = 0; i < flags.length; i += 2) {
    guard(['--data-dir', '--environment', '--repository-sha'].includes(flags[i]) && flags[i + 1], 'INVALID_ARGUMENT');
    options[flags[i]] = flags[i + 1];
  }
  const report = await runProbe({ mode, dataDir: options['--data-dir'], environment: options['--environment'], repositorySha: options['--repository-sha'] });
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.status === 'PASS' ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  cli().catch(() => { console.log(JSON.stringify({ status: 'FAIL', code: 'INVALID_ARGUMENT' })); process.exitCode = 1; });
}
