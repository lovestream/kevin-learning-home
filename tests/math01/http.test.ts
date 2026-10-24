import test from "node:test";
import assert from "node:assert/strict";
import { mathFixture, pathFor } from "./helpers.ts";
import { authFixture } from "../auth/helpers.ts";
import { MathLessonService } from "../../packages/subjects/math/service.ts";
import { LEGACY_TABLES } from "../../packages/platform/store.ts";
import { canonical } from "../../packages/contracts/index.ts";
const legacy = (f: Awaited<ReturnType<typeof mathFixture>>) =>
  Object.fromEntries(LEGACY_TABLES.map((t) => [t, f.store.summary()[t]]));
test("M01 A02 unavailable packaged lesson returns HTTP 503 without title or fallback", async () => {
  const f = await authFixture(
    false,
    false,
    new MathLessonService(
      "apps/web/dist",
      "packages/subjects/no-such-synthetic-content",
    ),
  );
  try {
    const c = f.client();
    await c.login(true);
    const response = await c.call("GET", pathFor(f.child.learnerId));
    assert.equal(response.status, 503);
    assert.equal(response.body.error.code, "CONTENT_UNAVAILABLE");
    assert.equal(Object.hasOwn(response.body, "lesson"), false);
  } finally {
    await f.stop();
  }
});
test("M01 A03/A04 HTTPS real cookies bind two children and two parents; lock/grant/revoke/logout/expiry cannot expose lesson", async () => {
  const f = await mathFixture(true);
  try {
    const before = legacy(f),
      anon = f.client();
    assert.equal(
      (await anon.call("GET", pathFor(f.child.learnerId))).status,
      401,
    );
    const a = f.client(),
      b = f.client(),
      p = f.client(),
      q = f.client();
    const login = await a.login(true);
    assert.equal(login.status, 200);
    assert.match(login.headers["set-cookie"]![0], /HttpOnly/);
    assert.match(login.headers["set-cookie"]![0], /Secure/);
    assert.match(login.headers["set-cookie"]![0], /SameSite=Strict/);
    assert.equal((await a.call("GET", pathFor(f.child.learnerId))).status, 200);
    assert.equal(
      (await a.call("GET", pathFor(f.child2.learnerId))).status,
      403,
    );
    assert.equal(
      (
        await b.call("POST", "/api/v1/auth/login", {
          login: f.childLogin2,
          password: f.childPassword2,
        })
      ).status,
      200,
    );
    assert.equal(
      (await b.call("GET", pathFor(f.child2.learnerId))).status,
      200,
    );
    assert.equal((await b.call("GET", pathFor(f.child.learnerId))).status, 403);
    assert.equal((await p.login()).status, 200);
    const locked = await p.call("GET", pathFor(f.child.learnerId));
    assert.equal(locked.body.error.code, "PARENT_ACCESS_REQUIRED");
    assert.equal(JSON.stringify(locked.body).includes("换一个位置"), false);
    assert.equal(
      (
        await p.call("POST", "/api/v1/auth/parent-unlock", {
          password: f.password,
        })
      ).status,
      200,
    );
    assert.equal((await p.call("GET", pathFor(f.child.learnerId))).status, 200);
    assert.equal(
      (await p.call("GET", pathFor(f.child2.learnerId))).status,
      403,
    );
    await q.call("POST", "/api/v1/auth/login", {
      login: f.parentLogin2,
      password: f.password2,
    });
    await q.call("POST", "/api/v1/auth/parent-unlock", {
      password: f.password2,
    });
    assert.equal(
      (await q.call("GET", pathFor(f.child2.learnerId))).status,
      200,
    );
    assert.equal((await q.call("GET", pathFor(f.child.learnerId))).status, 403);
    f.auth.revokeGrant(f.parent, f.child.learnerId);
    assert.equal(
      (await p.call("GET", pathFor(f.child.learnerId))).body.error.code,
      "LEARNER_FORBIDDEN",
    );
    f.auth.grant(f.parent, f.child.learnerId);
    await p.call("POST", "/api/v1/auth/parent-lock");
    assert.equal((await p.call("GET", pathFor(f.child.learnerId))).status, 403);
    await a.call("POST", "/api/v1/auth/logout");
    assert.equal((await a.call("GET", pathFor(f.child.learnerId))).status, 401);
    await q.call("POST", "/api/v1/auth/parent-unlock", {
      password: f.password2,
    });
    f.advance(5 * 60 * 1000 + 1);
    assert.equal(
      (await q.call("GET", pathFor(f.child2.learnerId))).body.error.code,
      "PARENT_ACCESS_REQUIRED",
    );
    f.advance(24 * 3600 * 1000);
    assert.equal(
      (await b.call("GET", pathFor(f.child2.learnerId))).status,
      401,
    );
    assert.equal(canonical(legacy(f)), canonical(before));
  } finally {
    await f.stop();
  }
});
test("M01 A03/A06 exact request policy, no metadata oracle, all writes closed, original 11 learning tables unchanged", async () => {
  const f = await mathFixture();
  try {
    const c = f.client();
    await c.login(true);
    const before = legacy(f),
      path = pathFor(f.child.learnerId);
    for (const method of ["POST", "PUT", "PATCH", "DELETE", "HEAD"])
      assert.equal((await c.call(method, path)).status, 405);
    for (const path of [
      "/api/studio",
      "/api/studio/reading",
      "/api/studio/attempt",
      "/api/attempt",
      "/api/feed",
      "/api/parent/access",
      "/api/import",
      "/api/v1/learners/" + f.child.learnerId + "/subjects/math/commands",
    ])
      assert.equal((await c.call("POST", path)).status, 403);
    assert.equal(
      (await c.call("GET", path + "?learnerId=" + f.child2.learnerId)).status,
      400,
    );
    assert.equal(
      (await c.call("GET", path.replace(f.child.learnerId, "%2f"))).status,
      400,
    );
    assert.equal(
      (await c.call("GET", path, {}, { Origin: "https://evil.invalid" }))
        .status,
      403,
    );
    assert.equal(
      (await c.call("GET", path, {}, { Host: "evil.invalid" })).status,
      403,
    );
    assert.equal(
      (await c.call("GET", pathFor(f.child.learnerId, "unknown"))).status,
      404,
    );
    assert.equal(
      (await c.call("GET", pathFor(f.child2.learnerId, "unknown"))).status,
      403,
    );
    const read = await c.call("GET", path);
    assert.equal(read.status, 200);
    assert.equal(read.headers["cache-control"], "no-store");
    assert.equal(read.body.manifest.externalAssets.length, 0);
    assert.equal(
      (await c.call("GET", "/packages/subjects/math/public-lesson.json"))
        .status,
      404,
    );
    assert.equal(canonical(legacy(f)), canonical(before));
  } finally {
    await f.stop();
  }
});
test("M01 A06 default-off configuration preserves disabled math/english/wallet and rejects new course route", async () => {
  const f = await mathFixture(false, false);
  try {
    const c = f.client();
    await c.login(true);
    const config = await c.call("GET", "/api/v1/config");
    assert(config.body.subjects.every((s: { enabled: boolean }) => !s.enabled));
    assert.equal(config.body.features.wallet, false);
    assert.equal(
      (await c.call("GET", pathFor(f.child.learnerId))).body.error.code,
      "FEATURE_DISABLED",
    );
  } finally {
    await f.stop();
  }
});
