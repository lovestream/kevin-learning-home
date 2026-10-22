import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import {
  isShellRoute,
  isPublicRoute,
  shellRoutes,
} from "../../packages/contracts/routes.ts";
import { subjects, type SubjectSlot } from "../../packages/subjects/index.ts";
import {
  sessionDTO,
  learnerDTO,
  catalogDTO,
  errorMessage,
  RequestError,
} from "../../apps/web/src/api.ts";
import { httpFixture, rawRead } from "../foundation/helpers.ts";

test("B09 browser catalog isolates malformed/missing modules and accepts a future disabled subject without auth or wallet changes", () => {
  const science: SubjectSlot = {
    registration: {
      id: "science",
      title: "科学",
      enabled: false,
      status: "unavailable",
      contractVersion: 1,
      contentVersion: null,
      mark: "探",
      accent: "green",
    },
  };
  assert.equal(science.module, undefined);
  const result = catalogDTO({
    features: { auth: true },
    subjects: [
      { id: "math", title: "broken" },
      subjects[1],
      science.registration,
      science.registration,
    ],
  });
  assert.equal(result.auth, true);
  assert.deepEqual(
    result.subjects.map((s) => s.id),
    ["english", "science"],
  );
  assert.deepEqual(
    catalogDTO({ features: { auth: true }, subjects: [] }).subjects,
    [],
  );
  assert(
    subjects.every(
      (s) =>
        !s.enabled &&
        s.status === "awaiting-migration" &&
        s.contentVersion === null,
    ),
  );
});
test("B03/B04 client DTO validation fails closed on contradictory role/grant metadata and cross-learner responses", () => {
  const learner = randomUUID(),
    base = {
      schemaVersion: 1,
      actor: { id: randomUUID(), role: "parent" },
      learnerIds: [],
      parentUnlocked: false,
      parentUnlockExpiresAt: null,
      expiresAt: Date.now() + 60000,
      csrfToken: randomBytes(32).toString("base64url"),
    };
  assert.equal(sessionDTO(base).learnerIds.length, 0);
  assert.throws(
    () => sessionDTO({ ...base, learnerIds: [learner] }),
    /RESPONSE_INVALID/,
  );
  assert.throws(
    () =>
      sessionDTO({
        ...base,
        actor: { ...base.actor, role: "learner" },
        learnerIds: [learner, randomUUID()],
      }),
    /RESPONSE_INVALID/,
  );
  const child = sessionDTO({
    ...base,
    actor: { ...base.actor, role: "learner" },
    learnerIds: [learner],
  });
  assert.throws(
    () =>
      learnerDTO(
        {
          schemaVersion: 1,
          learners: [{ id: randomUUID(), label: "Synthetic" }],
        },
        child,
      ),
    /RESPONSE_INVALID/,
  );
  assert.throws(
    () =>
      learnerDTO(
        {
          schemaVersion: 1,
          learners: [
            { id: learner, label: "Synthetic" },
            { id: learner, label: "Synthetic" },
          ],
        },
        child,
      ),
    /RESPONSE_INVALID/,
  );
});
test("B07 public errors distinguish HTTP outcomes without echoing server details or credentials", () => {
  for (const status of [401, 403, 422, 429, 503]) {
    const message = errorMessage(
      new RequestError("PRIVATE_DETAIL_MUST_NOT_ECHO", status),
      "登录",
    );
    assert(!message.includes("PRIVATE_DETAIL_MUST_NOT_ECHO"));
    assert(message.length > 8);
  }
  assert.match(errorMessage(new RequestError("NETWORK_UNAVAILABLE")), /连接/);
  assert.match(
    errorMessage(new RequestError("REQUEST_INTERRUPTED")),
    /重新确认/,
  );
});
test("B10 explicit SPA routes never overlap API, health, assets or traversal paths", () => {
  for (const path of shellRoutes) assert(isShellRoute(path));
  assert(isShellRoute("/subjects/science"));
  assert(isPublicRoute("/subjects/math"));
  assert(!isPublicRoute("/parent/report"));
  for (const path of [
    "/api/v1/auth/session",
    "/health/live",
    "/assets/a.js",
    "/parent/../../x",
    "/subjects/%2e%2e",
    "/subjects/.hidden",
    "/parent/report/extra",
    "/unknown",
  ])
    assert(!isShellRoute(path));
});
test("B10 real static deep links preserve CSP, APIs, missing assets and the offline no-learning-write boundary", async () => {
  const f = await httpFixture(undefined, true),
    before = f.store.summary();
  try {
    for (const path of [
      "/login",
      "/home",
      "/today",
      "/review",
      "/growth",
      "/subjects",
      "/parent",
      "/parent/report",
      "/subjects/science",
    ]) {
      const r = await fetch(f.origin + path);
      assert.equal(r.status, 200);
      assert.match(
        r.headers.get("content-security-policy") ?? "",
        /script-src 'self'/,
      );
      assert(
        !r.headers.get("content-security-policy")?.includes("unsafe-inline"),
      );
      assert.match(await r.text(), /id="root"/);
    }
    assert.equal((await fetch(f.origin + "/api/v1/parent/report")).status, 403);
    assert.equal((await fetch(f.origin + "/api/v1/auth/session")).status, 403);
    assert.equal((await fetch(f.origin + "/health/integrity")).status, 404);
    for (const path of [
      "/assets/missing.js",
      "/unknown",
      "/parent/report/extra",
    ])
      assert.equal((await fetch(f.origin + path)).status, 404);
    for (const path of [
      "/assets/%2e%2e%2fpackage.json",
      "/subjects/%2e%2e%2f",
      "/%2eenv",
      "/parent%00",
    ])
      assert.notEqual((await rawRead(f.origin + path)).status, 200);
    assert.deepEqual(f.store.summary(), before);
  } finally {
    await f.stop();
  }
});
