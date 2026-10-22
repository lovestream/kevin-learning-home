import test from "node:test";
import assert from "node:assert/strict";
import { authFixture, secret } from "./helpers.ts";
import { authConfig } from "../../packages/auth/config.ts";
import { authSessionSchema } from "../../packages/contracts/auth.ts";
import {
  ABSOLUTE_MS,
  IDLE_MS,
  UNLOCK_MS,
} from "../../packages/auth/service.ts";

test("A04/A07 real TLS login sets host-only Secure HttpOnly Strict cookie; no credential or bearer is stored in plaintext", async () => {
  const f = await authFixture(true);
  try {
    const c = f.client();
    const r = await c.login();
    assert.equal(r.status, 200);
    assert(r.headers["set-cookie"]?.[0].startsWith("__Host-klh-session="));
    for (const flag of ["Secure", "HttpOnly", "SameSite=Strict", "Path=/"])
      assert(r.headers["set-cookie"]![0].includes(flag));
    assert(!r.headers["set-cookie"]![0].includes("Domain="));
    assert(authSessionSchema.safeParse(r.body).success);
    assert.equal(r.body.actor.role, "parent");
    assert.equal(r.body.parentUnlocked, false);
    const rows =
      JSON.stringify(f.store.db.prepare("SELECT * FROM actors").all()) +
      JSON.stringify(f.store.db.prepare("SELECT * FROM auth_sessions").all());
    assert(!rows.includes(f.password));
    assert(!rows.includes(c.cookie.split("=")[1]));
    assert(!rows.includes(c.csrf));
    assert.equal((await c.call("GET", "/api/v1/auth/session")).status, 200);
  } finally {
    await f.stop();
  }
});
test("A05/A06 actual HTTP child scope, parent second unlock, grant checks and forged proxy/role headers", async () => {
  const f = await authFixture();
  try {
    const child = f.client();
    assert.equal((await child.login(true)).status, 200);
    const list = await child.call("GET", "/api/v1/learners");
    assert.equal(list.body.learners.length, 1);
    assert.equal(list.body.learners[0].id, f.child.learnerId);
    assert.equal(
      (
        await child.call(
          "GET",
          "/api/v1/learners/synthetic-learner",
          {},
          { "X-Role": "parent", "X-Tailscale-User": f.parentLogin },
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await child.call("POST", "/api/v1/auth/parent-unlock", {
          password: f.childPassword,
        })
      ).status,
      403,
    );
    assert.equal(
      (await child.call("POST", "/api/v1/auth/parent-lock")).status,
      403,
    );
    const p = f.client();
    assert.equal((await p.login()).status, 200);
    assert.equal((await p.call("GET", "/api/v1/learners")).status, 403);
    assert.equal(
      (
        await p.call("POST", "/api/v1/auth/parent-unlock", {
          password: secret(),
        })
      ).status,
      401,
    );
    const old = p.cookie;
    assert.equal(
      (
        await p.call("POST", "/api/v1/auth/parent-unlock", {
          password: f.password,
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await f
          .client()
          .call("GET", "/api/v1/auth/session", {}, { Cookie: old })
      ).status,
      401,
    );
    assert.equal(
      (await p.call("GET", "/api/v1/learners")).body.learners[0].id,
      f.child.learnerId,
    );
    assert.equal(
      (await p.call("GET", "/api/v1/learners/synthetic-learner")).status,
      403,
    );
    f.auth.revokeGrant(f.parent, f.child.learnerId);
    assert.equal(
      (await p.call("GET", "/api/v1/learners/" + f.child.learnerId)).status,
      403,
    );
    f.auth.grant(f.parent, f.child.learnerId);
    assert.equal(
      (await p.call("GET", "/api/v1/learners/" + f.child.learnerId)).status,
      200,
    );
    assert.equal(
      (await p.call("POST", "/api/v1/auth/parent-lock")).status,
      200,
    );
    assert.equal((await p.call("GET", "/api/v1/learners")).status, 403);
  } finally {
    await f.stop();
  }
});
test("A04/A06 restart, idle and absolute expiry, rotation, lock timeout and cross-device logout remain server authoritative", async () => {
  const f = await authFixture();
  try {
    const a = f.client(),
      b = f.client();
    assert.equal((await a.login()).status, 200);
    assert.equal((await b.login()).status, 200);
    await f.restart();
    assert.equal((await a.call("GET", "/api/v1/auth/session")).status, 200);
    const old = a.cookie;
    assert.equal((await a.call("POST", "/api/v1/auth/rotate")).status, 200);
    assert.equal(
      (
        await f
          .client()
          .call("GET", "/api/v1/auth/session", {}, { Cookie: old })
      ).status,
      401,
    );
    assert.equal(
      (
        await a.call("POST", "/api/v1/auth/parent-unlock", {
          password: f.password,
        })
      ).status,
      200,
    );
    f.advance(UNLOCK_MS + 1);
    assert.equal((await a.call("GET", "/api/v1/learners")).status, 403);
    assert.equal(
      (await a.call("POST", "/api/v1/auth/logout", { allDevices: true }))
        .status,
      200,
    );
    await f.restart();
    assert.equal((await b.call("GET", "/api/v1/auth/session")).status, 401);
    const c = f.client();
    assert.equal((await c.login()).status, 200);
    f.advance(IDLE_MS + 1);
    assert.equal((await c.call("GET", "/api/v1/auth/session")).status, 401);
    const d = f.client();
    assert.equal((await d.login()).status, 200);
    for (let i = 0; i < 17; i++) {
      f.advance(IDLE_MS - 1000);
      await d.call("GET", "/api/v1/auth/session");
    }
    assert.equal((await d.call("GET", "/api/v1/auth/session")).status, 401); // Absolute bound despite activity.
    assert(ABSOLUTE_MS < 17 * (IDLE_MS - 1000));
  } finally {
    await f.stop();
  }
});
test("A07 login CSRF, synchronized token, Host/Origin, fixation, duplicate cookies and unsupported APIs fail closed", async () => {
  const f = await authFixture();
  try {
    const c = f.client();
    assert.equal(
      (
        await c.call(
          "POST",
          "/api/v1/auth/login",
          { login: f.parentLogin, password: f.password },
          { Origin: "https://foreign.invalid" },
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await c.call(
          "POST",
          "/api/v1/auth/login",
          { login: f.parentLogin, password: f.password },
          { Origin: undefined },
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await c.call("POST", "/api/v1/auth/login", {
          login: f.parentLogin,
          password: f.password,
          role: "parent",
        })
      ).status,
      422,
    );
    const fixed = "klh-dev-session=" + secret() + "." + secret();
    const login = await c.call(
      "POST",
      "/api/v1/auth/login",
      { login: f.parentLogin, password: f.password },
      { Cookie: fixed },
    );
    assert.equal(login.status, 200);
    assert(c.cookie !== fixed);
    const active = c.cookie;
    const other = f.client();
    await other.login();
    assert.equal(
      (
        await c.call(
          "POST",
          "/api/v1/auth/logout",
          {},
          { "X-CSRF-Token": other.csrf },
        )
      ).status,
      403,
    );
    for (const headers of [
      { "X-CSRF-Token": undefined },
      { "X-CSRF-Token": secret() },
      { Origin: "null" },
      { Host: "foreign.invalid" },
      { "Sec-Fetch-Site": "cross-site" },
    ]) {
      assert.equal(
        (await c.call("POST", "/api/v1/auth/logout", {}, headers)).status,
        403,
      );
    }
    assert.equal(
      (
        await c.call(
          "GET",
          "/api/v1/auth/session",
          {},
          { Cookie: active + "; " + active },
        )
      ).status,
      401,
    );
    assert.equal(
      (await c.call("GET", "/api/v1/auth/session?token=untrusted")).status,
      400,
    );
    assert.equal(
      (
        await c.call(
          "GET",
          "/api/v1/auth/session",
          {},
          { Origin: "https://foreign.invalid" },
        )
      ).status,
      403,
    );
    for (const path of [
      "/api/v1/auth/register",
      "/api/v1/parent/review",
      "/api/v1/import",
      "/api/v1/wallet",
      "/api/v1/media/private",
      "/api/v1/backup",
      "/api/v1/restore",
    ])
      assert.equal((await c.call("POST", path)).status, 403);
    assert.equal(
      (
        await c.call(
          "POST",
          "/api/v1/learners/synthetic-learner/subjects/foundation-demo/commands",
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await c.call("POST", "/api/v1/auth/parent-unlock", {
          password: f.password,
          learnerId: f.child.learnerId,
        })
      ).status,
      422,
    );
    assert.equal(
      (
        await c.call(
          "POST",
          "/api/v1/auth/logout",
          {},
          { "Content-Type": "text/plain" },
        )
      ).status,
      415,
    );
    assert.equal(
      (
        await c.call("POST", "/api/v1/auth/logout", {
          padding: "x".repeat(5000),
        })
      ).status,
      413,
    );
    assert.equal((await c.call("GET", "/api/v1/auth/session")).status, 200);
  } finally {
    await f.stop();
  }
});
test("A08 persistent uniform login limits survive restart and ignore forged client-address headers", async () => {
  const f = await authFixture();
  try {
    const c = f.client();
    const errors: string[] = [];
    for (const name of [f.parentLogin, "synthetic-absent"]) {
      for (let i = 0; i < 5; i++) {
        const r = await c.call(
          "POST",
          "/api/v1/auth/login",
          { login: name, password: secret() },
          { "X-Forwarded-For": "192.0.2." + i },
        );
        assert.equal(r.status, 401);
        errors.push(r.body.error.code);
      }
    }
    assert(errors.every((x) => x === "AUTH_INVALID"));
    await f.restart();
    for (const name of [f.parentLogin, "synthetic-absent"])
      assert.equal(
        (
          await c.call("POST", "/api/v1/auth/login", {
            login: name,
            password: secret(),
          })
        ).status,
        429,
      );
    f.advance(15 * 60 * 1000 + 1);
    assert.equal((await c.login()).status, 200);
    const audit = JSON.stringify(
      f.store.db.prepare("SELECT * FROM auth_audit").all(),
    );
    assert(
      !audit.includes(f.password) &&
        !audit.includes(f.parentLogin) &&
        !audit.includes(c.csrf),
    );
  } finally {
    await f.stop();
  }
});
test("A04/A06 credential reset and authority rotation invalidate all old sessions and elevation", async () => {
  const f = await authFixture();
  try {
    const c = f.client();
    await c.login();
    await c.call("POST", "/api/v1/auth/parent-unlock", {
      password: f.password,
    });
    const replacement = secret();
    await f.auth.resetCredential(f.parentLogin, replacement);
    assert.equal((await c.call("GET", "/api/v1/auth/session")).status, 401);
    assert.equal((await c.login()).status, 401);
    const resetLogin = await c.call("POST", "/api/v1/auth/login", {
      login: f.parentLogin,
      password: replacement,
    });
    assert.equal(resetLogin.status, 200);
    assert.equal(resetLogin.body.parentUnlocked, false);
    const child = f.client();
    await child.login(true);
    f.auth.rotateAuthority();
    assert.equal((await child.call("GET", "/api/v1/auth/session")).status, 401);
    assert.equal((await c.call("GET", "/api/v1/auth/session")).status, 401);
  } finally {
    await f.stop();
  }
});
test("A07 production cannot select insecure loopback, arbitrary origin or weakened cookie mode", () => {
  const old = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  try {
    assert.throws(
      () => authConfig("http://127.0.0.1:4177", "loopback-development"),
      /AUTH_TRANSPORT_CONFIG/,
    );
    assert.throws(
      () => authConfig("http://127.0.0.1:4177"),
      /AUTH_TRANSPORT_CONFIG/,
    );
    assert.throws(
      () => authConfig("https://example.invalid/path"),
      /AUTH_ORIGIN_CONFIG/,
    );
    assert.equal(authConfig("https://example.invalid").secure, true);
  } finally {
    process.env.NODE_ENV = old;
  }
});

test("A03 unauthenticated first visitor cannot bootstrap or register a parent over HTTP", async () => {
  const f = await authFixture(false, true);
  try {
    const c = f.client();
    for (const path of [
      "/api/v1/auth/register",
      "/api/v1/auth/bootstrap",
      "/api/v1/learners",
    ])
      assert.equal(
        (await c.call("POST", path, { role: "parent" })).status,
        403,
      );
    assert.equal((await c.login()).status, 401);
    assert.equal(
      f.store.db.prepare("SELECT count(*) n FROM actors").get()!.n,
      0,
    );
  } finally {
    await f.stop();
  }
});

test("A10 readiness includes bounded auth-control primary-key probe and detects missing runtime authority", async () => {
  const f = await authFixture();
  try {
    f.store.db.exec("DELETE FROM auth_controls");
    const c = f.client();
    assert.equal((await c.call("GET", "/health/ready")).status, 503);
    assert.equal((await c.call("GET", "/health/live")).status, 200);
    f.store.db.exec("INSERT INTO auth_controls VALUES(1,1)");
    assert.equal((await c.call("GET", "/health/ready")).status, 200);
  } finally {
    await f.stop();
  }
});

test("A08 unsupported stored credential format fails with the same public login error as an unknown actor", async () => {
  const f = await authFixture();
  try {
    f.store.db
      .prepare("UPDATE actors SET password_scheme='unsupported' WHERE id=?")
      .run(f.parent);
    const c = f.client();
    const known = await c.login();
    const absent = await c.call("POST", "/api/v1/auth/login", {
      login: "synthetic-absent",
      password: secret(),
    });
    assert.equal(known.status, 401);
    assert.equal(absent.status, 401);
    assert.equal(known.body.error.code, absent.body.error.code);
    assert.equal(
      f.store.db.prepare("SELECT count(*) n FROM auth_sessions").get()!.n,
      0,
    );
  } finally {
    await f.stop();
  }
});

test("A04 aged sessions rotate and revoke atomically without nesting the idle-touch transaction", async () => {
  const f = await authFixture();
  try {
    const c = f.client();
    await c.login();
    f.advance(60001);
    const issued = f.auth.rotate(c.cookie.split("=")[1]);
    const cookie = "klh-dev-session=" + issued.cookie;
    assert.equal(
      (await c.call("GET", "/api/v1/auth/session", {}, { Cookie: cookie }))
        .status,
      200,
    );
    f.advance(60001);
    f.auth.logout(issued.cookie);
    assert.equal(
      (await c.call("GET", "/api/v1/auth/session", {}, { Cookie: cookie }))
        .status,
      401,
    );
  } finally {
    await f.stop();
  }
});

test("R1-01 real HTTP hides locked parent scope through login, lock, rotation, expiry and restart while child scope remains intact", async () => {
  const f = await authFixture();
  try {
    // Keep an explicitly revoked grant as well as an active one in the database.
    f.auth.grant(f.parent, "synthetic-learner");
    f.auth.revokeGrant(f.parent, "synthetic-learner");
    const parent = f.client(),
      child = f.client();
    const locked = (response: Awaited<ReturnType<typeof parent.call>>) => {
      assert.equal(response.status, 200);
      assert(authSessionSchema.safeParse(response.body).success);
      assert.equal(response.body.actor.role, "parent");
      assert.equal(response.body.parentUnlocked, false);
      assert.deepEqual(response.body.learnerIds, []);
      const payload = JSON.stringify(response.body);
      assert(!payload.includes(f.child.learnerId));
      assert(!payload.includes("synthetic-learner"));
      assert(!payload.includes("Synthetic learner"));
    };
    const spoof = { "X-Role": "parent", "X-Tailscale-User": f.parentLogin };
    const hidden = async () => {
      locked(await parent.call("GET", "/api/v1/auth/session", {}, spoof));
      for (const path of [
        "/api/v1/learners",
        "/api/v1/learners/" + f.child.learnerId,
      ])
        assert.equal((await parent.call("GET", path, {}, spoof)).status, 403);
    };
    const replay = async (cookie: string) => {
      assert.equal(
        (
          await f
            .client()
            .call(
              "GET",
              "/api/v1/auth/session",
              {},
              { Cookie: cookie, ...spoof },
            )
        ).status,
        401,
      );
    };
    const unlock = async () => {
      const response = await parent.call("POST", "/api/v1/auth/parent-unlock", {
        password: f.password,
      });
      assert.equal(response.status, 200);
      assert.equal(response.body.parentUnlocked, true);
      assert.deepEqual(response.body.learnerIds, [f.child.learnerId]);
    };
    locked(await parent.login());
    await hidden();
    const childLogin = await child.login(true);
    assert.equal(childLogin.status, 200);
    assert.deepEqual(childLogin.body.learnerIds, [f.child.learnerId]);
    assert.equal(childLogin.body.parentUnlocked, false);
    const preUnlock = parent.cookie;
    await unlock();
    await replay(preUnlock);
    assert.deepEqual(
      (await parent.call("GET", "/api/v1/auth/session")).body.learnerIds,
      [f.child.learnerId],
    );
    f.auth.revokeGrant(f.parent, f.child.learnerId);
    const revoked = await parent.call("GET", "/api/v1/auth/session");
    assert.equal(revoked.body.parentUnlocked, true);
    assert.deepEqual(revoked.body.learnerIds, []);
    assert.equal(
      (await parent.call("GET", "/api/v1/learners/" + f.child.learnerId))
        .status,
      403,
    );
    f.auth.grant(f.parent, f.child.learnerId);
    assert.deepEqual(
      (await parent.call("GET", "/api/v1/auth/session")).body.learnerIds,
      [f.child.learnerId],
    );
    const beforeLock = parent.cookie;
    locked(await parent.call("POST", "/api/v1/auth/parent-lock"));
    await hidden();
    await f.restart();
    await hidden();
    await replay(beforeLock);
    await unlock();
    const beforeRotate = parent.cookie;
    locked(await parent.call("POST", "/api/v1/auth/rotate"));
    await hidden();
    await replay(beforeRotate);
    await unlock();
    f.advance(UNLOCK_MS + 1);
    await hidden();
    await f.restart();
    await hidden();
    await replay(beforeLock);
    const childSession = await child.call(
      "GET",
      "/api/v1/auth/session",
      {},
      spoof,
    );
    assert.equal(childSession.status, 200);
    assert.equal(childSession.body.actor.role, "learner");
    assert.equal(childSession.body.parentUnlocked, false);
    assert.deepEqual(childSession.body.learnerIds, [f.child.learnerId]);
    assert.equal(
      (await child.call("GET", "/api/v1/learners/synthetic-learner", {}, spoof))
        .status,
      403,
    );
  } finally {
    await f.stop();
  }
});
