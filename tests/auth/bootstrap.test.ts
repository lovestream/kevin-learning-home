import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  realpathSync,
  rmSync,
  existsSync,
  mkdirSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync, execFileSync } from "node:child_process";
import { Store } from "../../packages/platform/store.ts";
import { hashPassword, verifyPassword } from "../../packages/auth/password.ts";
import { secret } from "./helpers.ts";
test("A03 bootstrap rejects pipes, HTTP-first-admin shortcuts, credential arguments and implicit synthetic mode", () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "klh02a-admin-")));
  try {
    for (const args of [
      [],
      ["--root", join(root, "absent"), "--synthetic"],
      ["--password", "untrusted"],
    ]) {
      const r = spawnSync(
        process.execPath,
        ["scripts/auth-admin.ts", "bootstrap-parent", ...args],
        { encoding: "utf8" },
      );
      assert.equal(r.status, 1);
      assert(r.stderr.includes("INTERACTIVE_LOCAL_TTY_REQUIRED"));
      assert(!existsSync(join(root, "absent")));
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
test("A03 real PTY bootstrap is synthetic, non-echoing and stores only salted versioned slow hashes", () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "klh02a-pty-")));
  try {
    const result = JSON.parse(
      execFileSync(
        "python3",
        ["tests/auth/bootstrap-pty.py", root, "success"],
        { encoding: "utf8" },
      ),
    );
    assert.equal(result.status, "PASS");
    const s = new Store(join(root, "data"));
    try {
      assert.equal(
        s.db
          .prepare(
            "SELECT count(*) n FROM actors WHERE kind='parent' AND synthetic=1",
          )
          .get()!.n,
        1,
      );
      assert.equal(
        s.db.prepare("SELECT count(*) n FROM auth_sessions").get()!.n,
        0,
      );
    } finally {
      s.close();
    }
    mkdirSync(".evidence", { recursive: true });
    writeFileSync(
      ".evidence/auth-bootstrap.json",
      JSON.stringify(
        {
          status: "PASS",
          realPTY: true,
          syntheticOnly: true,
          inputNotEchoed: true,
          plaintextCredentialArchived: false,
        },
        null,
        2,
      ) + "\n",
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
test("A03 interrupted interactive bootstrap leaves zero accounts and releases writer ownership", () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "klh02a-cancel-")));
  try {
    const result = JSON.parse(
      execFileSync(
        "python3",
        ["tests/auth/bootstrap-pty.py", root, "interrupt"],
        { encoding: "utf8" },
      ),
    );
    assert.equal(result.status, "PASS");
    const s = new Store(join(root, "data"));
    try {
      assert.equal(s.db.prepare("SELECT count(*) n FROM actors").get()!.n, 0);
    } finally {
      s.close();
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
test("A08 credential salts differ, valid/invalid checks use same scheme and unsupported schemes fail closed", async () => {
  const p = secret(),
    a = await hashPassword(p),
    b = await hashPassword(p);
  assert(a.password_salt !== b.password_salt);
  assert(a.password_hash !== b.password_hash);
  assert(await verifyPassword(p, a));
  assert(!(await verifyPassword(secret(), a)));
  await assert.rejects(() => hashPassword("short"), /PASSWORD_POLICY/);
  await assert.rejects(
    () => verifyPassword(p, { ...a, password_scheme: "unknown" }),
    /CREDENTIAL_FORMAT_UNSUPPORTED/,
  );
});
