import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, realpathSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { MathTrainingRepository } from "../../packages/math-training/repository.ts";
import { authFixture, secret } from "../auth/helpers.ts";
import { UNLOCK_MS } from "../../packages/auth/service.ts";
test("real HTTP: synthetic persistence is disabled by default; anonymous has no private learner API", async () => {
  const f = await authFixture();
  try {
    const c = f.client();
    assert.equal(
      (
        await c.call(
          "GET",
          `/api/v1/learners/${f.child.learnerId}/subjects/math/training/state`,
        )
      ).status,
      403,
    );
    await c.login(true);
    assert.equal(
      (
        await c.call(
          "POST",
          `/api/v1/learners/${f.child.learnerId}/subjects/math/training/self`,
          {},
        )
      ).status,
      403,
    );
  } finally {
    await f.stop();
  }
});
test("real HTTP: live child scope, parent unlock/grant/revocation, CSRF/origin, disabled provisioning and expiry", async () => {
  process.env.NODE_ENV = "test";
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "klh-math-review-"))),
    repo = new MathTrainingRepository(dir);
  const f = await authFixture(false, false, false, repo);
  try {
    const base = `/api/v1/learners/${f.child.learnerId}/subjects/math/training/`,
      guest = f.client(),
      child = f.client(),
      parent = f.client();
    assert.equal((await guest.call("GET", base + "state")).status, 401);
    await child.login(true);
    assert.equal((await child.call("GET", base + "state")).status, 200);
    assert.equal(
      (
        await child.call(
          "GET",
          base.replace(f.child.learnerId, "synthetic-other") + "state",
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await child.call(
          "GET",
          base + "backup",
          {},
          { "X-Role": "parent", "X-Tailscale-User": f.parentLogin },
        )
      ).status,
      403,
    );
    const ev = {
      action: "start",
      attemptId: "http-synthetic-one",
      eventId: "http-start-one",
      errorFamilyId: "MASS_AVERAGE",
      mode: "practice",
    };
    assert.equal(
      (
        await child.call("POST", base + "self", ev, {
          "X-CSRF-Token": secret(),
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await child.call("POST", base + "self", ev, {
          Origin: "http://other.invalid",
        })
      ).status,
      403,
    );
    assert.equal(
      (await child.call("POST", base + "self", { ...ev, now: 0 })).status,
      422,
    );
    assert.equal(repo.summary().learners.length, 0);
    assert.equal((await child.call("POST", base + "self", ev)).status, 200);
    const summary = repo.summary();
    assert.equal((await child.call("POST", base + "self", ev)).status, 200);
    assert.deepEqual(repo.summary(), summary);
    assert.equal(
      (await child.call("POST", base + "self", { ...ev, mode: "transfer" }))
        .status,
      409,
    );
    await parent.login();
    for (const route of ["state", "today", "backup"])
      assert.equal((await parent.call("GET", base + route)).status, 403);
    assert.equal(
      (
        await parent.call("POST", "/api/v1/auth/parent-unlock", {
          password: f.password,
        })
      ).status,
      200,
    );
    assert.equal((await parent.call("GET", base + "state")).status, 200);
    const backup = await parent.call("GET", base + "backup");
    assert.equal(backup.status, 200);
    assert.equal(backup.body.scope, f.child.learnerId);
    assert.equal(
      (await child.call("POST", base + "restore", backup.body)).status,
      403,
    );
    assert.equal(
      (
        await parent.call("POST", base + "restore", {
          ...backup.body,
          scope: "synthetic-other",
        })
      ).status,
      403,
    );
    assert.equal(
      (await parent.call("POST", base + "restore", backup.body)).status,
      200,
    );
    f.auth.revokeGrant(f.parent, f.child.learnerId);
    assert.equal((await parent.call("GET", base + "backup")).status, 403);
    assert.equal(
      (await parent.call("POST", base + "restore", backup.body)).status,
      403,
    );
    f.auth.grant(f.parent, f.child.learnerId);
    assert.equal((await parent.call("GET", base + "backup")).status, 200);
    f.advance(UNLOCK_MS + 1);
    assert.equal((await parent.call("GET", base + "state")).status, 403);
    assert.equal(
      (
        await parent.call("POST", base + "parent-self", {
          action: "schedule",
          expectedRevision: 1,
          eventId: "forged-schedule",
          errorFamilyId: "MASS_AVERAGE",
          dueDay: "2026-11-01",
          paused: false,
        })
      ).status,
      403,
    );
    assert.equal(
      (await child.call("POST", "/api/v1/auth/logout", { allDevices: false }))
        .status,
      200,
    );
    assert.equal((await child.call("GET", base + "state")).status, 401);
  } finally {
    await f.stop();
    repo.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
