import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  realpathSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  symlinkSync,
  rmSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { execFileSync, fork } from "node:child_process";
import { once } from "node:events";
import { Store, LEGACY_TABLES } from "../../packages/platform/store.ts";
import {
  layout,
  prepareLayout,
  upgrade,
  restore,
  backup,
} from "../../packages/platform/checkpoint.ts";
import { seed, syntheticCommand } from "../../scripts/synthetic.ts";
import { AuthService } from "../../packages/auth/service.ts";
import { secret } from "./helpers.ts";
import { canonical } from "../../packages/contracts/index.ts";
const BASE = "87ec45e95809d00b7104242702fb28ffbb6f7881";
async function legacyFixture() {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "klh02a-v1-"))),
    code = join(root, "frozen-main");
  mkdirSync(code);
  for (const p of [
    "packages/platform/store.ts",
    "packages/platform/writer-lock.ts",
    "packages/platform/001-foundation.sql",
    "packages/contracts/index.ts",
  ]) {
    mkdirSync(dirname(join(code, p)), { recursive: true });
    writeFileSync(join(code, p), execFileSync("git", ["show", BASE + ":" + p]));
  }
  writeFileSync(join(code, "package.json"), '{"type":"module"}');
  symlinkSync(
    realpathSync(resolve("node_modules")),
    join(code, "node_modules"),
    "dir",
  );
  const Old = (
    await import(pathToFileURL(join(code, "packages/platform/store.ts")).href)
  ).Store as typeof Store;
  const paths = layout(join(root, "original-v1"));
  prepareLayout(paths);
  const old = new Old(paths.data);
  seed(old, paths);
  const command = syntheticCommand(),
    result = old.command(command),
    before = old.summary(),
    migrationRow = old.db
      .prepare("SELECT * FROM schema_migrations WHERE version=1")
      .get();
  old.close();
  return {
    root,
    paths,
    Old,
    command,
    result,
    before,
    migrationRow,
    close: () => rmSync(root, { recursive: true, force: true }),
  };
}
test("A01 actual frozen-main v1 database upgrades losslessly through checkpoint; repeat is idempotent and old image rejects v2", async () => {
  const f = await legacyFixture();
  try {
    assert.throws(
      () => new Store(f.paths.data),
      /SCHEMA_UPGRADE_REQUIRES_CHECKPOINT/,
    );
    const ck = join(f.root, "pre-v2");
    const report = upgrade(f.paths, ck);
    assert.equal(report.schemaVersion, 2);
    const s = new Store(f.paths.data);
    const after = s.summary();
    try {
      for (const table of LEGACY_TABLES.filter(
        (t) => t !== "schema_migrations",
      ))
        assert.deepEqual(s.summary()[table], f.before[table]);
      assert.equal(
        s.db.prepare("SELECT count(*) n FROM schema_migrations").get()!.n,
        2,
      );
      assert.deepEqual(
        s.db.prepare("SELECT * FROM schema_migrations WHERE version=1").get(),
        f.migrationRow,
      );
      assert(
        readFileSync("packages/platform/001-foundation.sql").equals(
          execFileSync("git", [
            "show",
            BASE + ":packages/platform/001-foundation.sql",
          ]),
        ),
      );
      const replay = s.command(f.command);
      assert(replay.duplicate);
      assert(canonical(replay.events) === canonical(f.result.events));
      const before = s.summary();
      s.close();
      assert.equal(
        upgrade(f.paths, join(f.root, "not-created")).status,
        "already-current",
      );
      assert(!existsSync(join(f.root, "not-created")));
      const reopened = new Store(f.paths.data);
      assert.deepEqual(reopened.summary(), before);
      reopened.close();
    } finally {
      s.close();
    }
    assert.throws(() => new f.Old(f.paths.data), /SCHEMA_VERSION_UNSUPPORTED/);
    const target = join(f.root, "old-image-rollback");
    restore(ck, target);
    const old = new f.Old(layout(target).data);
    try {
      assert.deepEqual(old.summary(), f.before);
    } finally {
      old.close();
    }
    mkdirSync(".evidence", { recursive: true });
    writeFileSync(
      ".evidence/auth-migration.json",
      JSON.stringify(
        {
          status: "PASS",
          frozenV1SourceSha: BASE,
          migration001ByteIdentical: true,
          oldTenDataTablesEqual: true,
          legacyMetadataRow1Preserved: true,
          metadataDelta: "exactly one v2 migration row",
          before: f.before,
          after,
          reconciliation: LEGACY_TABLES.map((table) => ({
            table,
            before: f.before[table],
            after: after[table],
            exactlyEqual:
              canonical(f.before[table]) === canonical(after[table]),
            allowedDelta:
              table === "schema_migrations"
                ? "preserve complete row 1; append version 2 only"
                : null,
          })),
          checkpointVersion: 1,
          currentVersion: 2,
          oldImageRejectsV2: true,
          oldImageRollbackFromCheckpoint: true,
        },
        null,
        2,
      ) + "\n",
    );
  } finally {
    f.close();
  }
});
test("A02 injected failure after v2 SQL rolls back schema/data atomically and leaves verified v1 checkpoint", async () => {
  process.env.NODE_ENV = "test";
  const f = await legacyFixture();
  try {
    const ck = join(f.root, "before-fault");
    assert.throws(
      () =>
        upgrade(f.paths, ck, () => {
          throw Error("SYNTHETIC_MIGRATION_FAILURE");
        }),
      /SYNTHETIC_MIGRATION_FAILURE/,
    );
    const old = new f.Old(f.paths.data);
    try {
      assert.deepEqual(old.summary(), f.before);
      old.verifyIntegrity();
    } finally {
      old.close();
    }
    assert(existsSync(join(ck, "manifest.json")));
    assert.equal(upgrade(f.paths, join(f.root, "retry")).schemaVersion, 2);
  } finally {
    f.close();
  }
});
test("A02 SIGKILL mid-migration leaves v1 usable by actual frozen runtime, then clean retry succeeds", async () => {
  const f = await legacyFixture();
  let child: ReturnType<typeof fork> | undefined;
  try {
    backup(f.paths, join(f.root, "pre-crash"));
    const marker = join(f.root, "inflight");
    child = fork(
      resolve("tests/auth/migration-child.ts"),
      [f.paths.data, marker],
      { env: { ...process.env, NODE_ENV: "test" }, stdio: "ignore" },
    );
    for (let i = 0; i < 100 && !existsSync(marker); i++)
      await new Promise((r) => setTimeout(r, 50));
    assert(existsSync(marker), "migration reached in-flight boundary");
    const exit = once(child, "exit");
    child.kill("SIGKILL");
    const [, signal] = await exit;
    assert.equal(signal, "SIGKILL");
    const old = new f.Old(f.paths.data);
    try {
      assert.deepEqual(old.summary(), f.before);
      old.verifyIntegrity();
    } finally {
      old.close();
    }
    assert.equal(
      upgrade(f.paths, join(f.root, "retry-crash")).schemaVersion,
      2,
    );
  } finally {
    if (child?.exitCode === null && child.signalCode === null)
      child.kill("SIGKILL");
    f.close();
  }
});
test("A09 v2 backup preserves actors/grants/credential versions, events and media; restored sessions always revoked", async () => {
  const f = await legacyFixture();
  try {
    upgrade(f.paths, join(f.root, "v1-checkpoint"));
    const s = new Store(f.paths.data),
      auth = new AuthService(s);
    const password = secret(),
      parent = await auth.bootstrap(
        "synthetic-parent",
        "Synthetic parent",
        password,
      );
    auth.grant(parent, "synthetic-learner");
    const childPassword = secret(),
      child = await auth.provisionLearner(
        parent,
        "synthetic-child",
        "Synthetic child",
        childPassword,
      );
    auth.revokeGrant(parent, "synthetic-learner");
    const childLogin = await auth.login(
      "synthetic-child",
      childPassword,
      "test-child",
    );
    assert(childLogin);
    auth.logout(childLogin.cookie);
    const login = await auth.login("synthetic-parent", password, "test");
    assert(login);
    const unlocked = await auth.unlock(login.cookie, password, "test");
    assert(unlocked);
    const before = s.summary();
    s.close();
    const ck = join(f.root, "v2-checkpoint");
    const manifest = backup(f.paths, ck);
    assert.equal(manifest.schemaVersion, 2);
    const to = join(f.root, "restored-v2");
    restore(ck, to);
    const r = new Store(layout(to).data);
    try {
      for (const table of ["actors", "learner_grants", ...LEGACY_TABLES])
        assert.deepEqual(r.summary()[table], before[table]);
      const restoredAuth = new AuthService(r);
      assert.throws(
        () => restoredAuth.session(unlocked.cookie),
        /SESSION_REQUIRED/,
      );
      assert.throws(
        () => restoredAuth.session(childLogin.cookie),
        /SESSION_REQUIRED/,
      );
      assert.equal(
        r.db
          .prepare(
            "SELECT count(*) n FROM auth_sessions WHERE revoked_at IS NULL OR parent_unlock_until!=0",
          )
          .get()!.n,
        0,
      );
      assert(r.command(f.command).duplicate);
      const fresh = await restoredAuth.login(
        "synthetic-parent",
        password,
        "restored",
      );
      assert(fresh);
      assert.equal(
        restoredAuth.view(restoredAuth.session(fresh.cookie)).parentUnlocked,
        false,
      );
      assert.deepEqual(
        restoredAuth.view(restoredAuth.session(fresh.cookie)).learnerIds,
        [],
      );
      const freshUnlock = await restoredAuth.unlock(
        fresh.cookie,
        password,
        "restored",
      );
      assert(freshUnlock);
      assert.deepEqual(
        restoredAuth.view(restoredAuth.session(freshUnlock.cookie)).learnerIds,
        [child.learnerId],
      );
    } finally {
      r.close();
    }
  } finally {
    f.close();
  }
});
