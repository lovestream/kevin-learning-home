import test from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import {
  existsSync,
  readFileSync,
  writeFileSync,
  symlinkSync,
  mkdirSync,
  cpSync,
} from "node:fs";
import { Store } from "../../packages/platform/store.ts";
import {
  backup,
  restore,
  layout,
  verifyContent,
} from "../../packages/platform/checkpoint.ts";
import {
  LocalMediaStorage,
  safeKey,
  readWithin,
} from "../../packages/media/local.ts";
import { canonical } from "../../packages/contracts/index.ts";
import { syntheticCommand } from "../../scripts/synthetic.ts";
import { fixture } from "./helpers.ts";

test("F08 offline checkpoint restores DB, media, content, revisions, event and receipt hashes into empty host layout", () => {
  const f = fixture();
  try {
    const c = syntheticCommand();
    f.store.command(c);
    const before = f.store.summary();
    assert.throws(
      () => backup(f.paths, join(f.root, "locked")),
      /WRITER_LOCKED/,
    );
    f.store.close();
    const checkpoint = join(f.root, "checkpoint");
    const manifest = backup(f.paths, checkpoint);
    assert.deepEqual(manifest.tables, before);
    const target = join(f.root, "new-host");
    restore(checkpoint, target);
    const s = new Store(layout(target).data);
    try {
      assert.deepEqual(s.summary(), before);
      verifyContent(s, layout(target));
      assert.equal(s.state(c.learnerId, c.subjectId).revision, 1);
      assert.equal(s.command(c).duplicate, true);
    } finally {
      s.close();
    }
    assert.throws(() => restore(checkpoint, target), /RESTORE_TARGET_EXISTS/);
    mkdirSync(".evidence", { recursive: true });
    writeFileSync(
      ".evidence/recovery.json",
      JSON.stringify(
        {
          status: process.env.CI ? "PASS_CI" : "PASS_LOCAL",
          scope:
            "synthetic DB+media+content; offline snapshot into new empty host layout",
          manifest,
          tableHashesMatch: true,
          receiptReplay: true,
        },
        null,
        2,
      ) + "\n",
    );
  } finally {
    f.close();
  }
});
test("F08 corrupted media/database checkpoints fail without publishing or overwriting targets", () => {
  const f = fixture();
  try {
    f.store.close();
    const checkpoint = join(f.root, "checkpoint");
    backup(f.paths, checkpoint);
    for (const key of ["media/" + f.asset.storageKey, "learning.sqlite"]) {
      const broken = join(f.root, "broken-" + key.split("/")[0]);
      cpSync(checkpoint, broken, { recursive: true });
      writeFileSync(join(broken, key), "corrupt");
      const dest = broken + "-restore";
      assert.throws(
        () => restore(broken, dest),
        /CHECKPOINT_HASH_MISMATCH|MEDIA_SIZE_INVALID/,
      );
      assert.equal(existsSync(dest), false);
    }
    assert(existsSync(join(checkpoint, "manifest.json")));
  } finally {
    f.close();
  }
});
test("F08 checkpoint failure never replaces previous good backup; symlink/path injections rejected", () => {
  const f = fixture();
  try {
    f.store.close();
    const good = join(f.root, "good");
    backup(f.paths, good);
    const original = readFileSync(join(good, "manifest.json"), "utf8");
    const bad = join(f.root, "failed");
    assert.throws(
      () =>
        backup(f.paths, bad, () => {
          throw Error("injected before publish");
        }),
      /injected/,
    );
    assert.equal(existsSync(bad), false);
    assert.equal(readFileSync(join(good, "manifest.json"), "utf8"), original);
    assert.throws(() => backup(f.paths, good), /BACKUP_DESTINATION_EXISTS/);
    const altered = join(f.root, "altered");
    cpSync(good, altered, { recursive: true });
    const manifest = JSON.parse(
      readFileSync(join(altered, "manifest.json"), "utf8"),
    );
    manifest.files["../../outside"] = { sizeBytes: 0, sha256: "0".repeat(64) };
    writeFileSync(join(altered, "manifest.json"), JSON.stringify(manifest));
    assert.throws(
      () => restore(altered, join(f.root, "unsafe")),
      /CHECKPOINT_PATH_INVALID/,
    );
  } finally {
    f.close();
  }
});
test("F09 manifest identity/version/hash, private denied, immutable local provider root switch", () => {
  const f = fixture();
  try {
    const a = new LocalMediaStorage(f.paths.media);
    assert.equal(a.read(f.asset, "public").length, f.asset.sizeBytes);
    assert.throws(
      () => a.read({ ...f.asset, visibility: "private" }, "public"),
      /MEDIA_FORBIDDEN/,
    );
    assert.throws(
      () => a.read({ ...f.asset, sha256: "0".repeat(64) }, "public"),
      /MEDIA_HASH_MISMATCH/,
    );
    assert.throws(
      () =>
        a.read(
          { ...f.asset, visibility: "public", authorization: "private-owner" },
          "public",
        ),
      /MEDIA_LICENSE_INVALID/,
    );
    const second = join(f.root, "provider-b");
    cpSync(f.paths.media, second, { recursive: true });
    const b = new LocalMediaStorage(second),
      before = canonical(
        f.store.db.prepare("SELECT * FROM content_manifests").all(),
      );
    assert.deepEqual(a.read(f.asset, "public"), b.read(f.asset, "public"));
    assert.equal(
      canonical(f.store.db.prepare("SELECT * FROM content_manifests").all()),
      before,
    );
  } finally {
    f.close();
  }
});
test("F09 traversal, absolute paths, symlink file/parent/root, missing objects are rejected", () => {
  const f = fixture();
  try {
    for (const key of [
      "../escape",
      "/absolute",
      "a/../../b",
      "a//b",
      "a\\b",
      "./x",
      "a/./x",
    ])
      assert.throws(() => safeKey(key), /MEDIA_KEY_INVALID/);
    const outside = join(f.root, "outside");
    mkdirSync(outside);
    writeFileSync(join(outside, "secret"), "not published");
    symlinkSync(outside, join(f.paths.media, "escape"));
    assert.throws(
      () => readWithin(f.paths.media, "escape/secret"),
      /MEDIA_PATH_UNSAFE/,
    );
    symlinkSync(join(outside, "secret"), join(f.paths.media, "link"));
    assert.throws(() => readWithin(f.paths.media, "link"), /MEDIA_PATH_UNSAFE/);
    const a = new LocalMediaStorage(f.paths.media);
    assert.throws(
      () => a.read({ ...f.asset, storageKey: "missing" }, "public"),
      /MEDIA_MISSING/,
    );
    symlinkSync(f.paths.media, join(f.root, "root-link"));
    assert.throws(
      () => new LocalMediaStorage(join(f.root, "root-link")),
      /MEDIA_PATH_UNSAFE/,
    );
  } finally {
    f.close();
  }
});
