import test, { after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync, type ChildProcess } from "node:child_process";
import { join } from "node:path";
import {
  readFileSync,
  writeFileSync,
  lstatSync,
  mkdirSync,
  symlinkSync,
} from "node:fs";
import { fixture } from "./helpers.ts";
import { startProcess, stopProcess, nextMessage } from "./process-helpers.ts";
import { syntheticCommand } from "../../scripts/synthetic.ts";
import { Store } from "../../packages/platform/store.ts";
import { migrateLegacyWriterLock } from "../../packages/platform/writer-lock.ts";
const evidence: unknown[] = [];
after(() => {
  mkdirSync(".evidence", { recursive: true });
  writeFileSync(
    ".evidence/r1-ownership.json",
    JSON.stringify(
      {
        scope: "synthetic real Node processes; never NAS",
        status: evidence.length === 6 ? "PASS" : "INCOMPLETE",
        cases: evidence,
      },
      null,
      2,
    ) + "\n",
  );
});

for (const signal of ["SIGTERM", "SIGKILL"] as const)
  test(
    "R1 writer " +
      signal +
      " releases kernel ownership and replays exact committed evidence in new process",
    async () => {
      const f = fixture();
      f.store.close();
      let child: ChildProcess | undefined;
      try {
        const first = await startProcess(f.paths.data);
        child = first.child;
        assert.equal(first.initial.status, "ready");
        const command = syntheticCommand();
        const original = await nextMessage(child, {
          operation: "command",
          command,
        });
        assert.equal(original.status, "ok");
        const before = await nextMessage(child, { operation: "snapshot" });
        const inode = lstatSync(join(f.paths.data, ".writer.lock")).ino;
        const death = await stopProcess(child, signal);
        assert.equal(
          signal === "SIGTERM" ? death.exitCode : death.signal,
          signal === "SIGTERM" ? 0 : "SIGKILL",
        );
        const second = await startProcess(f.paths.data);
        child = second.child;
        assert.equal(second.initial.status, "ready");
        const recovered = await nextMessage(child, { operation: "snapshot" });
        assert.deepEqual(recovered.tables, before.tables);
        assert.equal(recovered.environment.pragmas.journal_mode, "wal");
        const replay = await nextMessage(child, {
          operation: "command",
          command,
        });
        assert.equal(replay.result.duplicate, true);
        assert.equal(replay.result.committedRevision, 1);
        assert.deepEqual(replay.result.events, original.result.events);
        assert.equal(lstatSync(join(f.paths.data, ".writer.lock")).ino, inode);
        evidence.push({
          case: signal,
          status: "PASS",
          death,
          tableHashesPreserved: true,
          receiptReplayed: true,
          stableInodePreserved: true,
        });
      } finally {
        if (child) await stopProcess(child);
        f.close();
      }
    },
  );
test("R1 simultaneous independent process starts have exactly one owner; contenders cannot evict it", async () => {
  const f = fixture();
  f.store.close();
  const children: ChildProcess[] = [];
  try {
    // Exercise atomic first publication, not just a preexisting protocol-v2 file.
    const data = join(f.root, "empty-race");
    const results = await Promise.all([startProcess(data), startProcess(data)]);
    children.push(...results.map((r) => r.child));
    assert.equal(results.filter((r) => r.initial.status === "ready").length, 1);
    assert.equal(
      results.filter((r) => r.initial.status === "blocked").length,
      1,
    );
    const winner = results.find((r) => r.initial.status === "ready")!.child,
      loser = results.find((r) => r.initial.status === "blocked")!;
    assert.equal(loser.initial.code, "WRITER_LOCKED_OR_UNWRITABLE");
    const before = await nextMessage(winner, { operation: "snapshot" });
    for (let i = 0; i < 3; i++) {
      const contender = await startProcess(data);
      children.push(contender.child);
      assert.equal(contender.initial.status, "blocked");
    }
    assert.deepEqual(
      (await nextMessage(winner, { operation: "snapshot" })).tables,
      before.tables,
    );
    evidence.push({
      case: "two-process-initialization-and-live-contention",
      status: "PASS",
      owners: 1,
      blocked: 1,
      repeatedContenders: 3,
      activeOwnerPreserved: true,
    });
  } finally {
    await Promise.all(children.map((c) => stopProcess(c)));
    f.close();
  }
});
test("R1 independent backup CLI is excluded by live owner and succeeds after SIGKILL", async () => {
  const f = fixture();
  f.store.close();
  let child: ChildProcess | undefined;
  try {
    const started = await startProcess(f.paths.data);
    child = started.child;
    assert.equal(started.initial.status, "ready");
    const original = await nextMessage(child, { operation: "snapshot" });
    const output = join(f.root, "checkpoint");
    const args = [
      "scripts/maintenance.ts",
      "backup",
      "--root",
      f.root,
      "--out",
      output,
    ];
    const blocked = spawnSync(process.execPath, args, { encoding: "utf8" });
    assert.equal(blocked.status, 1);
    assert.match(blocked.stderr, /WRITER_LOCKED_OR_UNWRITABLE/);
    await stopProcess(child, "SIGKILL");
    const completed = spawnSync(process.execPath, args, { encoding: "utf8" });
    assert.equal(completed.status, 0, completed.stderr);
    const restored = join(f.root, "restored");
    const restore = spawnSync(
      process.execPath,
      ["scripts/maintenance.ts", "restore", "--from", output, "--to", restored],
      { encoding: "utf8" },
    );
    assert.equal(restore.status, 0, restore.stderr);
    const store = new Store(join(restored, "data"));
    try {
      assert.deepEqual(store.summary(), original.tables);
    } finally {
      store.close();
    }
    evidence.push({
      case: "live-app-backup-CLI-exclusion",
      status: "PASS",
      blockedExitCode: blocked.status,
      postKillBackupExitCode: completed.status,
      restoreExitCode: restore.status,
    });
  } finally {
    if (child) await stopProcess(child);
    f.close();
  }
});
test("R1 v1 marker requires explicit offline migration and cannot override live v2 flock", () => {
  const f = fixture();
  try {
    assert.throws(
      () => migrateLegacyWriterLock(f.paths.data, true),
      /WRITER_LOCKED_OR_UNWRITABLE/,
    );
    f.store.close();
    const path = join(f.paths.data, ".writer.lock");
    writeFileSync(
      path,
      JSON.stringify({ pid: process.pid, owner: "klh-foundation" }),
    );
    const inode = lstatSync(path).ino;
    assert.throws(
      () => new Store(f.paths.data),
      /LEGACY_WRITER_LOCK_REQUIRES_OFFLINE_MIGRATION/,
    );
    assert.throws(
      () => migrateLegacyWriterLock(f.paths.data, false),
      /OFFLINE_V1_STOP_CONFIRMATION_REQUIRED/,
    );
    const args = [
      "scripts/maintenance.ts",
      "migrate-writer-lock",
      "--root",
      f.root,
    ];
    const unconfirmed = spawnSync(process.execPath, args, { encoding: "utf8" });
    assert.equal(unconfirmed.status, 1);
    assert.match(unconfirmed.stderr, /OFFLINE_V1_STOP_CONFIRMATION_REQUIRED/);
    const completed = spawnSync(
      process.execPath,
      [...args, "--confirm-all-v1-writers-stopped"],
      { encoding: "utf8" },
    );
    assert.equal(completed.status, 0, completed.stderr);
    assert.equal(
      JSON.parse(completed.stdout).result.status,
      "migrated-offline",
    );
    assert.equal(lstatSync(path).ino, inode);
    const store = new Store(f.paths.data);
    store.close();
    assert.equal(
      migrateLegacyWriterLock(f.paths.data, true).status,
      "already-current",
    );
    evidence.push({
      case: "v1-offline-transition",
      status: "PASS",
      noPIDLivenessInference: true,
      sameInode: true,
      liveV2OwnerCannotBeOverridden: true,
      unconfirmedCLIExitCode: unconfirmed.status,
      confirmedCLIExitCode: completed.status,
    });
  } finally {
    f.close();
  }
});
test("R1 malformed legacy markers and symlink lock paths fail closed without deleting them", () => {
  const f = fixture();
  try {
    f.store.close();
    const path = join(f.paths.data, ".writer.lock");
    writeFileSync(path, "incomplete");
    assert.throws(
      () => new Store(f.paths.data),
      /LEGACY_WRITER_LOCK_REQUIRES_OFFLINE_MIGRATION/,
    );
    assert.throws(
      () => migrateLegacyWriterLock(f.paths.data, true),
      /LEGACY_LOCK_METADATA_INVALID/,
    );
    assert.equal(readFileSync(path, "utf8"), "incomplete");
    const directory = join(f.root, "symlink-data");
    mkdirSync(directory, { mode: 0o700 });
    symlinkSync(path, join(directory, ".writer.lock"));
    assert.throws(() => new Store(directory), /WRITER_LOCKED_OR_UNWRITABLE/);
    evidence.push({
      case: "unknown-and-symlink-lock-rejected",
      status: "PASS",
      originalPreserved: true,
    });
  } finally {
    f.close();
  }
});
