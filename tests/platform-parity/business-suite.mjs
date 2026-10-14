import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import {
  canonical,
  LearningRepository,
} from "../../experiments/shared/repository.mjs";
import { VERSION } from "../../experiments/shared/domain.mjs";
export async function apiSession(
  origin,
  role = "learner",
  learner = "synthetic-a",
) {
  const res = await fetch(origin + "/api/session", {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify({ role, learner, password: `${role}-fixture-only` }),
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  return {
    cookie: res.headers.get("set-cookie").split(";")[0],
    csrf: body.csrf,
    learner,
    role,
  };
}
export async function request(
  origin,
  session,
  path,
  { method = "GET", body, headers = {} } = {},
) {
  const res = await fetch(origin + path, {
    method,
    headers: {
      Cookie: session.cookie,
      ...(body
        ? {
            Origin: origin,
            "Content-Type": "application/json",
            "X-CSRF-Token": session.csrf,
          }
        : {}),
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json();
  return { status: res.status, data, headers: res.headers };
}
export const statePath = (subject = "english", learner = "synthetic-a") =>
  `/api/v1/learners/${learner}/subjects/${subject}/state`;
export const commandPath = (subject = "english", learner = "synthetic-a") =>
  statePath(subject, learner).replace(/state$/, "commands");
export const command = (revision, extra = {}) => ({
  commandId: randomUUID(),
  expectedRevision: revision,
  contentVersion: VERSION,
  action: "english.answer",
  attemptId: randomUUID(),
  answer: "apple",
  ...extra,
});
export async function runBusinessSuite(h) {
  const { origin } = h,
    learner = await apiSession(origin),
    parent = await apiSession(origin, "parent"),
    other = await apiSession(origin, "learner", "synthetic-b");
  const cases = [];
  const verify = async (id, name, fn) => {
    await fn();
    cases.push({ id, name, status: process.env.CI ? "PASS_CI" : "PASS_LOCAL" });
  };
  const state = async (subject = "english") =>
    (await request(origin, learner, statePath(subject))).data;
  const granted = new Map(),
    issued = new Set();
  const send = async (c, subject = "english", who = learner, headers = {}) => {
    if (!issued.has(c.attemptId)) {
      const key = subject + ":" + c.attemptId;
      if (!granted.has(key))
        granted.set(
          key,
          request(
            origin,
            who,
            statePath(subject).replace(/state$/, "attempts"),
            { method: "POST", body: {} },
          ).then((r) => {
            assert.equal(r.status, 200);
            issued.add(r.data.attemptId);
            return r.data.attemptId;
          }),
        );
      c.attemptId = await granted.get(key);
    }
    return request(origin, who, commandPath(subject), {
      method: "POST",
      body: c,
      headers: { "Idempotency-Key": c.commandId, ...headers },
    });
  };
  await verify(
    "P01",
    "source math first answer/hint/correction, no independent upgrade",
    async () => {
      for (const help of [false, true]) {
        let r = (await state("math")).revision;
        const attemptId = randomUUID();
        for (const [action, answer] of [
          ["math.first", "four"],
          ...(help ? [["math.help", ""]] : []),
          ["math.evidence", ""],
          ["math.submit", "five"],
        ]) {
          const result = await send(
            command(r, { attemptId, action, answer }),
            "math",
          );
          assert.equal(result.status, 200);
          r++;
          if (action === "math.submit") {
            assert.equal(result.data.result.status, "correct");
            assert.equal(result.data.result.selfCorrection, true);
            assert.equal(result.data.result.independent, false);
            assert.equal(result.data.result.assisted, help);
            assert.deepEqual(result.data.result.firstAnswer, { value: "four" });
          }
        }
      }
      let revision = (await state("math")).revision;
      const attemptId = randomUUID();
      let actualId;
      for (const [action, answer] of [
        ["math.first", "five"],
        ["math.first", "four"],
        ["math.evidence", ""],
        ["math.submit", "five"],
      ]) {
        const c = command(revision, { attemptId, action, answer });
        const result = await send(c, "math");
        actualId = c.attemptId;
        assert.equal(result.status, 200);
        revision++;
      }
      const saved = (await state("math")).state.progress.studio.sessions[
        actualId
      ];
      assert.deepEqual(saved.selfChecks["synthetic-math-q1"].firstAnswer, {
        value: "five",
      });
    },
  );
  await verify(
    "P02",
    "original spelling/near spelling/scheduling",
    async () => {
      const attemptId = randomUUID();
      let s = await state();
      const near = await send(
        command(s.revision, { attemptId, answer: "appel" }),
      );
      assert.equal(near.status, 200);
      assert.equal(near.data.result.nearMiss, true);
      assert.equal(near.data.result.status, "incorrect");
      s = await state();
      const fixed = await send(command(s.revision, { attemptId }));
      assert.equal(fixed.status, 200);
      assert.equal(fixed.data.result.independent, false);
      assert.equal(fixed.data.result.firstAnswer, "appel");
      assert.equal(fixed.data.result.nearMissUsed, true);
    },
  );
  await verify(
    "P03",
    "event and revision advance only on accepted command",
    async () => {
      const before = await state();
      const c = command(before.revision);
      const res = await send(c);
      assert.equal(res.status, 200);
      assert.equal(res.data.committedRevision, before.revision + 1);
      assert.equal((await state()).revision, before.revision + 1);
    },
  );
  await verify(
    "P04",
    "100 independent HTTP duplicate requests yield one receipt/event",
    async () => {
      const s = await state(),
        c = command(s.revision);
      const responses = await Promise.all(
        Array.from({ length: 100 }, () => send(c)),
      );
      assert(responses.every((r) => r.status === 200));
      assert.equal(responses.filter((r) => !r.data.duplicate).length, 1);
      assert(
        responses.every(
          (r) =>
            canonical(r.data.result) === canonical(responses[0].data.result),
        ),
      );
      assert.equal(
        (
          await h.db.first(
            "SELECT COUNT(*) n FROM receipts WHERE command_id=?",
            [c.commandId],
          )
        ).n,
        1,
      );
      assert.equal(
        (
          await h.db.first(
            "SELECT COUNT(*) n FROM learning_events WHERE event_id=?",
            [c.commandId],
          )
        ).n,
        1,
      );
      h.repeatedCommand = c;
    },
  );
  await verify(
    "P05",
    "same key changed payload rejected without write",
    async () => {
      const before = await state(),
        res = await send({ ...h.repeatedCommand, answer: "applf" });
      assert.equal(res.status, 409);
      assert.equal(res.data.error.code, "IDEMPOTENCY_CONFLICT");
      assert.deepEqual(await state(), before);
    },
  );
  await verify(
    "P06",
    "two independent sessions stale revision race and explicit refresh",
    async () => {
      const device2 = await apiSession(origin);
      const s = await state();
      const c1 = command(s.revision),
        c2 = command(s.revision);
      const results = await Promise.all([
        send(c1),
        send(c2, "english", device2),
      ]);
      assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
      assert.equal(
        results.find((r) => r.status === 409).data.error.code,
        "STALE_REVISION",
      );
      const rejected = results[0].status === 409 ? c1 : c2;
      const retry = { ...rejected, expectedRevision: (await state()).revision };
      assert.equal((await send(retry)).status, 200);
    },
  );
  await verify(
    "P07",
    "failure after state/event/reward statements rolls every table back",
    async () => {
      const grant = await request(
        origin,
        parent,
        statePath().replace(/state$/, "attempts"),
        { method: "POST", body: {} },
      );
      issued.add(grant.data.attemptId);
      const c = command((await state()).revision, {
        attemptId: grant.data.attemptId,
      });
      const before = await new LearningRepository(h.db).summary();
      const res = await send(c, "english", parent, { "X-Bench-Fault": "sql" });
      assert.equal(res.status, 503);
      assert.equal(res.data.error.code, "WRITE_FAILED_ROLLED_BACK");
      assert.deepEqual(await new LearningRepository(h.db).summary(), before);
    },
  );
  await verify(
    "P08",
    "logical reward source dedupe and subject isolation",
    async () => {
      const attemptId = randomUUID();
      let s = await state();
      assert.equal(
        (await send(command(s.revision, { attemptId }))).status,
        200,
      );
      s = await state();
      assert.equal(
        (await send(command(s.revision, { attemptId }))).status,
        200,
      );
      assert.equal(
        (
          await h.db.first(
            "SELECT COUNT(*) n FROM synthetic_rewards WHERE learner=? AND subject=?",
            ["synthetic-a", "english"],
          )
        ).n,
        1,
      );
      const rewards = await h.db.all(
        "SELECT DISTINCT subject FROM synthetic_rewards",
      );
      assert.deepEqual(rewards.map((x) => x.subject).sort(), [
        "english",
        "math",
      ]);
    },
  );
  await verify(
    "P09",
    "role/learner/origin/CSRF/schema/header spoof negative cases",
    async () => {
      for (const endpoint of [
        "/api/parent/review",
        "/api/parent/restore",
        "/api/parent/media/upload-intent",
      ])
        assert.equal(
          (
            await request(origin, learner, endpoint, {
              method: "POST",
              body: {},
              headers: { "X-Role": "parent", "X-Forwarded-User": "parent" },
            })
          ).status,
          403,
        );
      assert.equal(
        (await request(origin, learner, statePath("english", "synthetic-b")))
          .status,
        403,
      );
      const c = command((await state()).revision);
      for (const field of ["correct", "coins", "trustLevel", "usedHint"])
        assert.equal((await send({ ...c, [field]: true })).status, 400);
      assert.equal(
        (
          await send(c, "english", learner, {
            Origin: "https://attacker.example",
          })
        ).status,
        403,
      );
      assert.equal(
        (await send(c, "english", learner, { "X-CSRF-Token": "wrong" })).status,
        403,
      );
      assert.equal(
        (await send(c, "english", learner, { "Idempotency-Key": randomUUID() }))
          .status,
        400,
      );
      assert.equal(
        (await request(origin, { cookie: "", csrf: "" }, statePath())).status,
        401,
      );
    },
  );
  await verify(
    "P10",
    "lost response retry keeps command, session recovery and does not overwrite",
    async () => {
      const c = command((await state()).revision),
        first = await send(c);
      assert.equal(first.status, 200);
      const later = command((await state()).revision);
      assert.equal((await send(later)).status, 200);
      const saved = await state(),
        retry = await send(c);
      assert.equal(retry.data.duplicate, true);
      assert.equal(retry.data.committedRevision, first.data.committedRevision);
      assert.equal(retry.data.currentRevision, saved.revision);
      assert.deepEqual(await state(), saved);
      assert.equal(
        (await request(origin, learner, "/api/session")).status,
        200,
      );
    },
  );
  await verify(
    "P11",
    "versioned media, private auth/cache, direct streaming upload",
    async () => {
      const pub = await request(
        origin,
        learner,
        "/api/media/synthetic-public-image",
      );
      assert.equal(pub.status, 200);
      const obj = await fetch(pub.data.url);
      assert.equal(
        obj.headers.get("cache-control"),
        "public,max-age=31536000,immutable",
      );
      const data = new Uint8Array(await obj.arrayBuffer());
      assert.equal(data.length, pub.data.sizeBytes);
      assert.equal(
        createHash("sha256").update(data).digest("hex"),
        pub.data.sha256,
      );
      const priv = await request(
        origin,
        learner,
        "/api/media/synthetic-private-audio",
      );
      assert.equal(priv.headers.get("cache-control"), "no-store");
      assert.equal((await fetch(priv.data.url)).status, 403);
      assert.equal(
        (await fetch(priv.data.url, { headers: { Cookie: other.cookie } }))
          .status,
        403,
      );
      assert.equal(
        (
          await fetch(priv.data.url, {
            headers: {
              Cookie: learner.cookie,
              Origin: "https://attacker.example",
            },
          })
        ).status,
        403,
      );
      const allowed = await fetch(priv.data.url, {
        headers: { Cookie: learner.cookie },
      });
      assert.equal(allowed.status, 200);
      assert.equal(allowed.headers.get("cache-control"), "no-store");
      assert.equal(
        (await request(origin, other, "/api/media/synthetic-private-audio"))
          .status,
        403,
      );
      assert.equal(
        (await fetch(h.media.origin + "/object/guessed")).status,
        403,
      );
      const binary = Buffer.alloc(1048576, 73),
        sha256 = createHash("sha256").update(binary).digest("hex"),
        metadata = {
          sizeBytes: binary.length,
          mimeType: "application/octet-stream",
          sha256,
        };
      const intent = await request(
        origin,
        parent,
        "/api/parent/media/upload-intent",
        { method: "POST", body: metadata },
      );
      assert.equal(intent.status, 200);
      const uploaded = await fetch(intent.data.url, {
        method: "PUT",
        headers: { Origin: origin, "Content-Type": metadata.mimeType },
        body: binary,
      });
      assert.equal(uploaded.status, 200);
      assert.equal(
        (
          await request(origin, parent, "/api/parent/media/commit", {
            method: "POST",
            body: {
              ...metadata,
              mimeType: "image/png",
              assetId: "synthetic-wrong-mime",
            },
          })
        ).status,
        409,
      );
      const committed = await request(
        origin,
        parent,
        "/api/parent/media/commit",
        { method: "POST", body: { ...metadata, assetId: "synthetic-upload" } },
      );
      assert.equal(committed.status, 200);
      const published = await request(origin, parent, "/api/parent/publish", {
        method: "POST",
        body: {
          subject: "math",
          version: "v2",
          media: [{ assetId: "synthetic-public-image", version: "v1" }],
        },
      });
      assert.equal(published.status, 200);
      assert.equal(
        (await request(origin, learner, "/api/courses/math?version=v2")).data
          .version,
        "v2",
      );
      assert.equal(
        (await request(origin, learner, "/api/courses/math")).data.version,
        VERSION,
      );
    },
  );
  await verify(
    "P12",
    "backend restart retains learning state and opaque session",
    async () => {
      const before = await new LearningRepository(h.db).summary();
      await h.restart();
      assert.equal(
        (await request(h.origin, learner, "/api/session")).status,
        200,
      );
      assert.deepEqual(await new LearningRepository(h.db).summary(), before);
    },
  );
  return {
    cases,
    assertionScope:
      "shared P01-P12 business plus source parity suite; full recovery/e2e/load separately",
    remote: "BLOCKED_APPROVAL",
    nas: "NOT_RUN",
  };
}
