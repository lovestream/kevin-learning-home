import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, writeFileSync } from "node:fs";
import { Store } from "../../packages/platform/store.ts";
import {
  canonical,
  sha256,
  parseCommand,
} from "../../packages/contracts/index.ts";
import { syntheticCommand } from "../../scripts/synthetic.ts";
import { fixture, httpFixture, send, rawRead } from "./helpers.ts";

test("F11 native HTTP rejects forged Host, cross-origin commands and cross-learner access", async () => {
  const f = await httpFixture();
  try {
    assert.equal(
      (await rawRead(f.origin + "/health/live", { Host: "forged.example" }))
        .status,
      403,
    );
    const command = syntheticCommand();
    const r = await fetch(
      f.origin +
        "/api/v1/learners/synthetic-learner/subjects/foundation-demo/commands",
      {
        method: "POST",
        headers: {
          Origin: "http://forged.example",
          "Content-Type": "application/json",
          "Idempotency-Key": command.commandId,
          "X-Foundation-Test-Session": f.tokens[0],
        },
        body: JSON.stringify(command),
      },
    );
    assert.equal(r.status, 403);
    assert.equal((await r.json()).error.code, "ORIGIN_REJECTED");
    const other = await fetch(
      f.origin +
        "/api/v1/learners/another-learner/subjects/foundation-demo/state",
      { headers: { "X-Foundation-Test-Session": f.tokens[0] } },
    );
    assert.equal(other.status, 403);
    assert.equal(f.store.summary().learning_events.count, 0);
  } finally {
    await f.stop();
  }
});

test("F03 empty schema migration, WAL/FULL/FK/busy_timeout, repeat opening is idempotent", () => {
  const f = fixture();
  try {
    const before = f.store.summary();
    assert.deepEqual(f.store.environment().pragmas, {
      journal_mode: "wal",
      synchronous: 2,
      foreign_keys: 1,
      busy_timeout: 3000,
    });
    f.store.close();
    const s = new Store(f.paths.data);
    try {
      assert.deepEqual(s.summary(), before);
    } finally {
      s.close();
    }
  } finally {
    f.close();
  }
});
test("F03 rejects future and legacy nonempty schemas without clearing records", () => {
  const f = fixture();
  try {
    f.store.db.exec("PRAGMA user_version=99");
    f.store.close();
    const before = sha256(readFileSync(f.store.file));
    assert.throws(() => new Store(f.paths.data), /SCHEMA_VERSION_UNSUPPORTED/);
    assert.equal(sha256(readFileSync(f.store.file)), before);
    const db = new DatabaseSync(f.store.file);
    assert.equal(db.prepare("SELECT count(*) n FROM learners").get()!.n, 1);
    db.exec("PRAGMA user_version=0");
    db.close();
    assert.throws(() => new Store(f.paths.data), /SCHEMA_VERSION_UNSUPPORTED/);
  } finally {
    f.close();
  }
});
test("F03 rejects incompatible extra columns and changed migration checksum", () => {
  const f = fixture();
  try {
    f.store.db.exec("ALTER TABLE subject_states ADD COLUMN unexpected TEXT");
    f.store.close();
    assert.throws(() => new Store(f.paths.data), /SCHEMA_SHAPE_MISMATCH/);
    const db = new DatabaseSync(f.store.file);
    db.exec("UPDATE schema_migrations SET sha256='changed'");
    db.close();
    assert.throws(() => new Store(f.paths.data), /SCHEMA_MIGRATION_MISMATCH/);
  } finally {
    f.close();
  }
});
test("single writer process lock rejects a second app or maintenance operation", () => {
  const f = fixture();
  try {
    assert.throws(() => new Store(f.paths.data), /WRITER_LOCKED_OR_UNWRITABLE/);
    f.store.verifyIntegrity();
  } finally {
    f.close();
  }
});
test("F04 100 simultaneous real HTTP duplicates create one event and receipt", async () => {
  const f = await httpFixture();
  try {
    const c = syntheticCommand();
    const responses = await Promise.all(
      Array.from({ length: 100 }, (_, i) => send(f.origin, f.tokens[i % 2], c)),
    );
    assert(responses.every((r) => r.status === 200));
    const bodies = await Promise.all(responses.map((r) => r.json()));
    assert.equal(bodies.filter((x) => !x.duplicate).length, 1);
    assert.equal(new Set(bodies.map((x) => canonical(x.result))).size, 1);
    assert.equal(f.store.summary().learning_events.count, 1);
    assert.equal(f.store.summary().command_receipts.count, 1);
    assert.equal(f.store.state(c.learnerId, c.subjectId).revision, 1);
  } finally {
    await f.stop();
  }
});
test("F04 same command key changed payload returns 409 without any table changes", async () => {
  const f = await httpFixture();
  try {
    const c = syntheticCommand();
    assert.equal((await send(f.origin, f.tokens[0], c)).status, 200);
    const before = f.store.summary();
    const r = await send(f.origin, f.tokens[1], {
      ...c,
      input: { position: 11 },
    });
    assert.equal(r.status, 409);
    assert.equal((await r.json()).error.code, "IDEMPOTENCY_CONFLICT");
    assert.deepEqual(f.store.summary(), before);
  } finally {
    await f.stop();
  }
});
test("F04 replay returns original result and committed revision with current revision after later writes", async () => {
  const f = await httpFixture();
  try {
    const first = syntheticCommand();
    const original = await (await send(f.origin, f.tokens[0], first)).json();
    assert.equal(original.committedRevision, 1);
    const second = syntheticCommand({
      expectedRevision: 1,
      input: { position: 50 },
    });
    assert.equal((await send(f.origin, f.tokens[1], second)).status, 200);
    const before = f.store.summary();
    const replay = await (await send(f.origin, f.tokens[1], first)).json();
    assert.equal(replay.duplicate, true);
    assert.equal(replay.committedRevision, 1);
    assert.equal(replay.currentRevision, 2);
    assert.deepEqual(replay.events, original.events);
    assert.deepEqual(f.store.summary(), before);
  } finally {
    await f.stop();
  }
});
test("F05 two independent test sessions compete on revision; exactly one commits", async () => {
  const f = await httpFixture();
  try {
    const replies = await Promise.all(
      f.tokens.map((t) => send(f.origin, t, syntheticCommand())),
    );
    assert.deepEqual(replies.map((r) => r.status).sort(), [200, 409]);
    const conflict = await replies.find((r) => r.status === 409)!.json();
    assert.equal(conflict.error.code, "STALE_REVISION");
    assert.equal(conflict.error.currentRevision, 1);
    assert.equal(f.store.summary().learning_events.count, 1);
  } finally {
    await f.stop();
  }
});
test("F05 a real SQL constraint failure at transaction tail rolls all tables back", async () => {
  let fail = true;
  let store: Store;
  const f = await httpFixture(() => {
    if (fail)
      store.db.exec(
        "INSERT INTO audit_log(action,at,metadata) VALUES(NULL,'synthetic','{}')",
      );
  });
  store = f.store;
  try {
    const before = f.store.summary(),
      c = syntheticCommand();
    assert.equal((await send(f.origin, f.tokens[0], c)).status, 503);
    assert.deepEqual(f.store.summary(), before);
    fail = false;
    assert.equal((await send(f.origin, f.tokens[0], c)).status, 200);
  } finally {
    await f.stop();
  }
});
test("F11 runtime schemas reject client scores, unknown fields, versions, and wrong keys", async () => {
  const f = await httpFixture();
  try {
    const c = syntheticCommand(),
      before = f.store.summary();
    for (const extra of [
      { correct: true },
      { coins: 10 },
      { trustLevel: "server-verified" },
      { schemaVersion: 2 },
      { input: { position: 1, correct: true } },
    ]) {
      const r = await send(f.origin, f.tokens[0], { ...c, ...extra } as never);
      assert.equal(r.status, 422);
    }
    assert.equal(
      (await send(f.origin, f.tokens[0], c, "wrong-key")).status,
      400,
    );
    assert.deepEqual(f.store.summary(), before);
    const r = await fetch(
      f.origin +
        "/api/v1/learners/synthetic-learner/subjects/foundation-demo/state",
      { headers: { "X-Foundation-Test-Session": "forged" } },
    );
    assert.equal(r.status, 401);
    assert.throws(
      () => parseCommand({ ...c, input: { position: 1001 } }, c.commandId),
      /SCHEMA_INVALID/,
    );
  } finally {
    await f.stop();
  }
});
test("F11 production rejects all learning/auth/parent/media write paths and spoofed identity", async () => {
  const f = await httpFixture(undefined, true);
  try {
    const before = f.store.summary();
    for (const path of [
      "/api/v1/auth/login",
      "/api/v1/parent/backups",
      "/api/v1/parent/assessments",
      "/api/v1/media/upload",
      "/api/v1/learners/synthetic-learner/subjects/foundation-demo/commands",
    ]) {
      const r = await fetch(f.origin + path, {
        method: "POST",
        headers: {
          "X-Foundation-Test-Session": f.tokens[0],
          "Tailscale-User-Login": "parent",
          "X-Role": "parent",
          "Content-Type": "application/json",
        },
        body: "{}",
      });
      assert.equal(r.status, 403);
      assert.equal((await r.json()).error.code, "FEATURE_DISABLED");
    }
    assert.deepEqual(f.store.summary(), before);
    assert.equal((await fetch(f.origin + "/health/ready")).status, 200);
  } finally {
    await f.stop();
  }
});
test("F11 test context cannot be enabled in production library configuration", () => {
  const f = fixture();
  try {
    process.env.NODE_ENV = "production";
    assert.throws(() => {
      const { store } = f;
      return importNever(store);
    }, /TEST_CONTEXT_DISABLED/);
  } finally {
    process.env.NODE_ENV = "test";
    f.close();
  }
});
import { createHttp } from "../../apps/server/http.ts";
function importNever(store: Store) {
  return createHttp(store, {
    origin: "http://127.0.0.1:4177",
    webRoot: "apps/web/dist",
    testContext: () => ({ learnerId: "synthetic-learner", sessionId: "fake" }),
  });
}
test("immutable events and receipts, bounded projection, no wallet table", () => {
  const f = fixture();
  try {
    f.store.command(syntheticCommand());
    assert.throws(
      () => f.store.db.exec("UPDATE learning_events SET payload='{}'"),
      /IMMUTABLE_EVENT/,
    );
    assert.throws(
      () => f.store.db.exec("DELETE FROM command_receipts"),
      /IMMUTABLE_RECEIPT/,
    );
    assert.throws(() =>
      f.store.db
        .prepare("UPDATE subject_states SET projection=?")
        .run(canonical({ huge: "x".repeat(5000) })),
    );
    assert.equal(
      f.store.db
        .prepare("SELECT name FROM sqlite_schema WHERE name LIKE 'wallet%'")
        .all().length,
      0,
    );
  } finally {
    f.close();
  }
});
