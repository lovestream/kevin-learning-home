import test from "node:test";
import assert from "node:assert/strict";
import {
  chmodSync,
  lstatSync,
  renameSync,
  mkdirSync,
  writeFileSync,
} from "node:fs";
import { performance } from "node:perf_hooks";
import { httpFixture } from "./helpers.ts";
import { startProcess, stopProcess } from "./process-helpers.ts";
import type { ChildProcess } from "node:child_process";

test("R1 readiness performs bounded SQL at 100000 events; liveness does zero SQL; deep check remains offline", async () => {
  const f = await httpFixture(undefined, true);
  try {
    const sql: string[] = [];
    const prepare = f.store.db.prepare.bind(f.store.db),
      exec = f.store.db.exec.bind(f.store.db);
    f.store.db.prepare = (text: string) => {
      sql.push(text);
      return prepare(text);
    };
    f.store.db.exec = (text: string) => {
      sql.push(text);
      return exec(text);
    };
    const probe = async () => {
      sql.length = 0;
      const timings: number[] = [];
      for (let i = 0; i < 30; i++) {
        const start = performance.now();
        assert.equal((await fetch(f.origin + "/health/ready")).status, 200);
        timings.push(performance.now() - start);
      }
      return { queries: [...sql], maxWallMs: Math.max(...timings) };
    };
    const small = await probe();
    f.store.transaction(() => {
      f.store.db
        .exec(`WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM n WHERE x<100000) INSERT INTO command_receipts SELECT 'synthetic-learner','capacity-command:'||x,'foundation-demo',printf('%064d',0),x,'{}' FROM n;
      INSERT INTO learning_events SELECT 'capacity-event:'||committed_revision,learner_id,subject_id,command_id,committed_revision,'{"synthetic":true,"quality":"ungraded","type":"reading-observed"}' FROM command_receipts;
      UPDATE subject_states SET revision=100000,projection='{"lastPosition":0,"observedCount":100000}';`);
    });
    const large = await probe();
    assert.equal(large.queries.length, small.queries.length);
    assert(large.queries.length <= 30 * 7);
    assert(
      !large.queries.some((s) =>
        /quick_check|integrity_check|foreign_key_check|learning_events|command_receipts/i.test(
          s,
        ),
      ),
    );
    sql.length = 0;
    for (let i = 0; i < 10; i++)
      assert.equal((await fetch(f.origin + "/health/live")).status, 200);
    assert.equal(sql.length, 0);
    assert.equal((await fetch(f.origin + "/health/integrity")).status, 404);
    assert.equal(sql.length, 0);
    f.store.verifyIntegrity();
    assert(sql.some((s) => /quick_check/i.test(s)));
    assert(sql.some((s) => /foreign_key_check/i.test(s)));
    mkdirSync(".evidence", { recursive: true });
    writeFileSync(
      ".evidence/r1-readiness.json",
      JSON.stringify(
        {
          status: "PASS",
          scope: "synthetic 100k capacity rows, not 100k teaching assessments",
          events: 100000,
          probesPerSize: 30,
          sqlOperationsSmall: small.queries.length,
          sqlOperationsLarge: large.queries.length,
          sqlPerProbe: large.queries.length / 30,
          deepChecksDuringReady: 0,
          livenessSQL: 0,
          observedSQL: [...new Set(large.queries)],
          smallMaxWallMs: small.maxWallMs,
          largeMaxWallMs: large.maxWallMs,
          deepChecksStillExecutable: true,
        },
        null,
        2,
      ) + "\n",
    );
  } finally {
    await f.stop();
  }
});
test("R1 real external SQLite writer makes readiness 503 within bounded busy wait; release restores 200", async () => {
  const f = await httpFixture(undefined, true);
  let child: ChildProcess | undefined;
  try {
    const holder = await startProcess(f.paths.data, "raw-sqlite-lock");
    child = holder.child;
    assert.equal(holder.initial.status, "ready");
    const start = performance.now();
    assert.equal((await fetch(f.origin + "/health/ready")).status, 503);
    assert(performance.now() - start < 2000);
    assert.equal((await fetch(f.origin + "/health/live")).status, 200);
    await stopProcess(child, "SIGKILL");
    assert.equal((await fetch(f.origin + "/health/ready")).status, 200);
    assert.equal(f.store.environment().pragmas.busy_timeout, 3000);
  } finally {
    if (child) await stopProcess(child);
    await f.stop();
  }
});
test("R1 readiness rejects inaccessible/replaced DB, incompatible runtime version and closed connection", async () => {
  const f = await httpFixture(undefined, true);
  const mode = lstatSync(f.store.file).mode & 0o777;
  try {
    chmodSync(f.store.file, 0o400);
    assert.equal((await fetch(f.origin + "/health/ready")).status, 503);
    chmodSync(f.store.file, mode);
    renameSync(f.store.file, f.store.file + ".moved");
    try {
      assert.equal((await fetch(f.origin + "/health/ready")).status, 503);
    } finally {
      renameSync(f.store.file + ".moved", f.store.file);
    }
    f.store.db.exec("PRAGMA user_version=2");
    assert.equal((await fetch(f.origin + "/health/ready")).status, 503);
    f.store.db.exec("PRAGMA user_version=1");
    assert.equal((await fetch(f.origin + "/health/ready")).status, 200);
    f.store.db.close();
    assert.equal((await fetch(f.origin + "/health/ready")).status, 503);
    assert.equal((await fetch(f.origin + "/health/live")).status, 200);
  } finally {
    chmodSync(f.store.file, mode);
    await f.stop();
  }
});
