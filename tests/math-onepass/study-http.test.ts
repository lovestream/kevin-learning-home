import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, realpathSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { MathTrainingRepository } from "../../packages/math-training/repository.ts";
import { authFixture, secret } from "../auth/helpers.ts";
test("actual private HTTP: reading/note revisions, learner isolation, parent backup/recovery, CSRF and stale synthetic grants", async () => {
  process.env.NODE_ENV = "test";
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "klh-math-review-"))),
    repo = new MathTrainingRepository(dir),
    f = await authFixture(false, false, false, repo);
  try {
    const base = `/api/v1/learners/${f.child.learnerId}/subjects/math/study/`,
      child = f.client(),
      parent = f.client(),
      anonymous = f.client();
    assert.equal((await anonymous.call("GET", base + "state")).status, 401);
    await child.login(true);
    const input = {
      lessonId: "G3-U01-B01",
      revision: 0,
      blockId: "classroom",
      widgets: { classroom: { parentMode: true } },
    };
    assert.equal(
      (await child.call("POST", base + "reading", input)).status,
      200,
    );
    assert.equal(
      (await child.call("POST", base + "reading", input)).status,
      409,
    );
    assert.equal(
      (
        await child.call(
          "POST",
          base + "reading",
          { ...input, revision: 1 },
          { "X-CSRF-Token": secret() },
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await child.call(
          "POST",
          base + "reading",
          { ...input, revision: 1 },
          { Origin: "http://other.invalid" },
        )
      ).status,
      403,
    );
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
        await child.call("POST", base + "note", {
          id: "synthetic-http-note",
          lessonId: "G3-U01-B01",
          text: "固定盒子，换观察位置。",
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await child.call("POST", base + "note", {
          id: "synthetic-http-note",
          lessonId: "G3-U01-B01",
          text: "覆盖首份说明",
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await child.call("POST", base + "note", {
          id: "synthetic-http-note2",
          lessonId: "G3-U01-B01",
          text: "普通说明",
          actor: "parent",
        })
      ).status,
      422,
    );
    assert.equal(
      (
        await child.call(
          "POST",
          base + "parent-thinking",
          {
            taskId: "G3-UP01-TH1",
            eventId: "forged-parent",
            revision: 0,
            verdict: "independent-mastered",
            comment: "伪造角色",
            reviewer: "parent",
            causes: [],
          },
          { "X-Role": "parent" },
        )
      ).status,
      403,
    );
    assert.equal((await child.call("GET", base + "backup")).status, 403);
    await parent.login();
    assert.equal((await parent.call("GET", base + "backup")).status, 403);
    await parent.call("POST", "/api/v1/auth/parent-unlock", {
      password: f.password,
    });
    const backup = await parent.call("GET", base + "backup");
    assert.equal(backup.status, 200);
    assert.equal(backup.body.payload.studio.notes.length, 1);
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
      (
        await parent.call("POST", base + "restore", {
          ...backup.body,
          sha256: "0".repeat(64),
        })
      ).status,
      400,
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
    assert.equal(
      (await child.call("GET", base + "state")).body.notes.length,
      1,
    );
  } finally {
    await f.stop();
    repo.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
test("actual private HTTP: first answer/self-check gate, help exposure, human explanation review and zero rewards", async () => {
  process.env.NODE_ENV = "test";
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "klh-math-review-"))),
    repo = new MathTrainingRepository(dir),
    f = await authFixture(false, false, false, repo);
  try {
    const base = `/api/v1/learners/${f.child.learnerId}/subjects/math/study/`,
      child = f.client(),
      parent = f.client();
    await child.login(true);
    const s = await child.call("POST", base + "session-start", {
      lessonId: "G3-U01-B01",
      setName: "challenge",
    });
    assert.equal(s.status, 200);
    assert(
      !JSON.stringify(s.body.tasks).match(
        /"(?:expected|solution|hint|expectedEvidence)":/,
      ),
    );
    const task = s.body.tasks.find(
      (t: { kind: string }) => t.kind === "explanation",
    );
    assert(task);
    const send = (endpoint: string, event: Record<string, unknown>) =>
      child.call("POST", base + endpoint, {
        sessionId: s.body.id,
        taskId: task.id,
        eventId: "synthetic-" + secret().slice(0, 24),
        ...event,
      });
    assert.equal(
      (await send("submit", { revision: 0, answer: { value: "我的解释" } }))
        .status,
      400,
    );
    assert.equal(
      (await send("help", { revision: 0, kind: "solution" })).status,
      403,
    );
    let revision = 0;
    const first = await send("self-check", {
      revision,
      phase: "first",
      answer: { value: "固定盒子，先换观察位置。" },
    });
    assert.equal(first.status, 200);
    revision = first.body.revision;
    const again = await send("self-check", {
      revision,
      phase: "first",
      answer: { value: "第二次改了说法" },
    });
    assert.equal(again.body.firstAnswer.value, "固定盒子，先换观察位置。");
    revision = again.body.revision;
    const help = await send("help", { revision, kind: "hint" });
    assert.equal(help.status, 200);
    revision = help.body.revision;
    const checked = await send("self-check", {
      revision,
      phase: "evidence",
      evidence: {
        checks: ["读清问题", "核对过程", "检查结果"],
        reflection: "检查观察位置与所见面的关系。",
        format: "checklist-v1",
        finalConfirmed: true,
      },
    });
    revision = checked.body.revision;
    const final = await send("submit", {
      revision,
      answer: { value: "盒子不动，相机正对右面，才能看见右面标记。" },
    });
    assert.equal(final.status, 200);
    assert.equal(final.body.status, "pendingReview");
    assert.equal(final.body.paid, 0);
    assert.equal(final.body.assisted, true);
    assert.equal(final.body.firstAnswer.value, "固定盒子，先换观察位置。");
    assert.equal(
      (
        await child.call("POST", base + "parent-formal", {
          sessionId: s.body.id,
          taskId: task.id,
          eventId: "no-parent",
          revision: final.body.revision,
          verdict: "correct",
          comment: "伪造批准",
        })
      ).status,
      403,
    );
    await parent.login();
    await parent.call("POST", "/api/v1/auth/parent-unlock", {
      password: f.password,
    });
    const reviewed = await parent.call("POST", base + "parent-formal", {
      sessionId: s.body.id,
      taskId: task.id,
      eventId: "synthetic-parent-check",
      revision: final.body.revision,
      verdict: "correct",
      comment: "合成测试：明确说明物体固定与视角对应。",
    });
    assert.equal(reviewed.status, 200);
    assert.equal(reviewed.body.paid, 0);
    assert.deepEqual(
      repo.studyState(f.child.learnerId).studio.entitlements,
      {},
    );
    assert.deepEqual(repo.studyState(f.child.learnerId).studio.daily, {});
  } finally {
    await f.stop();
    repo.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
