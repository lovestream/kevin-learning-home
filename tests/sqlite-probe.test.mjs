import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { MARKER, runProbe, ownedDirectory, IMAGE_DIGEST } from '../infra/probes/node-sqlite/probe.mjs';

const sha = process.env.GITHUB_SHA || 'a'.repeat(40);
const environment = process.env.GITHUB_ACTIONS ? 'ci' : 'local';
function fixture(t) {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'klh-pr1a-test-')));
  fs.chmodSync(dir, 0o700);
  fs.writeFileSync(path.join(dir, '.klh-pr1a-owned'), MARKER, { mode: 0o600 });
  t.after(() => fs.rmSync(dir, { recursive: true })); // only this test's mkdtemp
  return dir;
}
async function exercise(t) {
  const dataDir = fixture(t);
  const report = await runProbe({ mode: 'exercise', dataDir, repositorySha: sha, environment });
  assert.equal(report.status, 'PASS', JSON.stringify(report.checks));
  return { dataDir, report };
}

test('SQLite transactions, constraints, idempotency/conflict, WAL, backup and empty restore', async t => {
  const { dataDir, report } = await exercise(t);
  assert.equal(report.runtime.node, '24.15.0');
  assert.deepEqual(report.checks.pragmas.values, { journal_mode: 'wal', synchronous: 2, foreign_keys: 1, busy_timeout: 3000 });
  for (const check of ['transactionCommit', 'transactionRollback', 'eventIdIdempotency', 'differentPayloadConflict',
    'foreignKeyEnforced', 'consistentBackup', 'emptyDirectoryRestore', 'integrityCheck', 'disconnectReconnect']) {
    assert.equal(report.checks[check].status, 'PASS', check);
  }
  const restored = new DatabaseSync(path.join(dataDir, 'restore/progress.sqlite'), { readOnly: true });
  try {
    assert.equal(restored.prepare('SELECT count(*) AS n FROM events').get().n, 1);
    assert.equal(restored.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
  } finally { restored.close(); }
});

test('a distinct Node process sees persisted synthetic state', async t => {
  const { dataDir } = await exercise(t);
  const p = spawnSync(process.execPath, ['infra/probes/node-sqlite/probe.mjs', 'verify', '--data-dir', dataDir,
    '--environment', environment, '--repository-sha', sha], { encoding: 'utf8', timeout: 10000 });
  assert.equal(p.status, 0);
  const report = JSON.parse(p.stdout);
  assert.equal(report.checks.separateProcessPersistence.status, 'PASS');
  assert.equal(report.repositorySha, sha);
});

test('refuses exercise rerun without altering the existing snapshot', async t => {
  const { dataDir } = await exercise(t);
  const before = fs.readFileSync(path.join(dataDir, 'backup.sqlite'));
  const report = await runProbe({ mode: 'exercise', dataDir });
  assert.equal(report.status, 'FAIL');
  assert.equal(report.checks.failure.code, 'EXERCISE_REQUIRES_EMPTY_OWNED_DIRECTORY');
  assert.deepEqual(fs.readFileSync(path.join(dataDir, 'backup.sqlite')), before);
});

test('unmarked, unknown, symlink and unsafe-permission directories are refused', t => {
  const dataDir = fixture(t);
  fs.unlinkSync(path.join(dataDir, '.klh-pr1a-owned'));
  assert.throws(() => ownedDirectory(dataDir), /ENOENT/);
  fs.writeFileSync(path.join(dataDir, '.klh-pr1a-owned'), MARKER);
  fs.writeFileSync(path.join(dataDir, 'unrelated.txt'), 'synthetic unrelated');
  assert.throws(() => ownedDirectory(dataDir), /UNKNOWN_FILE_REFUSED/);
  fs.unlinkSync(path.join(dataDir, 'unrelated.txt'));
  fs.symlinkSync('synthetic-missing-target', path.join(dataDir, 'progress.sqlite'));
  assert.throws(() => ownedDirectory(dataDir), /SYMLINK_REFUSED/);
  fs.unlinkSync(path.join(dataDir, 'progress.sqlite'));
  fs.chmodSync(dataDir, 0o770);
  assert.throws(() => ownedDirectory(dataDir), /DATA_DIR_GROUP_OR_WORLD_WRITABLE/);
  fs.chmodSync(dataDir, 0o700);
});

test('verify rejects an unrelated synthetic database without creating tables', async t => {
  const dataDir = fixture(t);
  const file = path.join(dataDir, 'progress.sqlite');
  const unrelated = new DatabaseSync(file);
  unrelated.exec('CREATE TABLE unrelated(value TEXT)');
  unrelated.close();
  const before = fs.readFileSync(file);
  const report = await runProbe({ mode: 'verify', dataDir });
  assert.equal(report.status, 'FAIL');
  assert.deepEqual(fs.readFileSync(file), before);
});

test('image lock and Dockerfile agree on the amd64 manifest, not a floating tag', () => {
  const lock = JSON.parse(fs.readFileSync('infra/probes/node-sqlite/image-lock.json', 'utf8'));
  assert.equal(lock.linuxAmd64Digest, IMAGE_DIGEST);
  assert.equal(lock.nodeVersion, '24.15.0');
  assert.equal(lock.platform, 'linux/amd64');
  const dockerfile = fs.readFileSync('infra/probes/node-sqlite/Dockerfile', 'utf8');
  assert.ok(dockerfile.includes(`FROM ${lock.tag}@${lock.linuxAmd64Digest}`));
  assert.ok(dockerfile.includes('USER node'));
});
