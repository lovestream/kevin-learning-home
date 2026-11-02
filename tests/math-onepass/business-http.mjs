// Every original task traverses the real new page-capability/session/first/check/
// final HTTP pipeline, in addition to the retained original stateless graders.
import fs from "node:fs";
import assert from "node:assert/strict";
import { startPreview } from "../../apps/preview/server.ts";
import { loadPractice } from "../../apps/preview/practice/service.ts";
import { loadLibrary } from "../../apps/preview/library/service.ts";
import { firstAnswer } from "../math-full-02/helpers.mjs";
import { checksDefault } from "../../apps/preview/practice/contract.ts";
const nas = process.argv.includes("--nas"),
  target = process.env.KLH_PREVIEW_TEST_ORIGIN,
  expected = process.env.KLH_PREVIEW_EXPECT_SHA;
if (
  nas &&
  (target !== "http://192.168.2.100:38444" ||
    !/^[a-f0-9]{40}$/.test(expected ?? ""))
)
  throw Error("EXPLICIT_NAS_SHA_REQUIRED");
if (!nas && target) throw Error("EXPLICIT_NAS_MODE_REQUIRED");
const server = nas ? null : await startPreview({ enabled: true, port: 0 }),
  origin = nas ? target : "http://127.0.0.1:" + server.address().port,
  bank = loadPractice(process.cwd()),
  library = loadLibrary(process.cwd()),
  all = [...bank.tasks.values(), ...library.practice.tasks.values()],
  rows = [],
  started = Date.now();
let seq = 0;
async function post(path, body) {
  const r = await fetch(origin + "/preview-api/v1/training/" + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify(body),
  });
  const value = await r.json();
  assert.equal(
    r.status,
    200,
    JSON.stringify({ path, status: r.status, error: value }),
  );
  assert.equal(r.headers.get("set-cookie"), null);
  return value;
}
try {
  if (nas) {
    const runtime = await (
      await fetch(origin + "/preview-api/v1/runtime")
    ).json();
    assert.equal(runtime.buildSha, expected);
    assert.equal(runtime.training.cases, 63);
  }
  for (const lessonId of new Set(all.map((r) => r.lessonId))) {
    const start = await post("start", {}),
      capability = start.capability,
      sessions = new Map();
    try {
      for (const row of all.filter((r) => r.lessonId === lessonId)) {
        const task = row.task,
          group = Object.entries(
            (
              bank.lessons.get(lessonId) ??
              library.practice.lessons.get(lessonId)
            ).taskSets,
          ).find(([, ts]) => ts.some((t) => t.id === task.id))[0];
        let s = sessions.get(group);
        if (!s) {
          s = await post("study-event", {
            capability,
            channel: "session-start",
            event: { lessonId, setName: group },
          });
          sessions.set(group, s);
          assert(
            !JSON.stringify(s.tasks).match(
              /"(?:expected|hint|solution|expectedEvidence)":/,
            ),
          );
        }
        const send = (channel, extra) =>
            post("study-event", {
              capability,
              channel,
              event: {
                sessionId: s.id,
                taskId: task.id,
                revision: s.revision,
                eventId: "business-" + ++seq,
                ...extra,
              },
            }),
          answer = firstAnswer(task);
        const first = await send("self-check", { phase: "first", answer });
        assert.equal(first.status, "selfCheck", task.id);
        assert.deepEqual(first.firstAnswer, answer);
        s.revision = first.revision;
        const check = await send("self-check", {
          phase: "evidence",
          evidence: {
            checks: task.selfCheckItems ?? checksDefault,
            reflection: "合成测试：逐项核对条件、过程与答案。",
            finalConfirmed: true,
            format: "checklist-v1",
          },
        });
        s.revision = check.revision;
        const final = await send("submit", { answer });
        assert.equal(
          final.status,
          task.kind === "explanation" ? "pendingReview" : "correct",
          task.id,
        );
        assert.equal(final.paid, 0);
        assert.deepEqual(final.firstAnswer, answer);
        s.revision = final.revision;
        rows.push({
          lessonId,
          taskId: task.id,
          group,
          kind: task.kind,
          status: final.status,
          firstSealed: true,
          selfCheckRequired: true,
          paid: 0,
        });
      }
    } finally {
      await post("release", { capability });
    }
  }
  assert.equal(rows.length, 1298);
  assert.equal(new Set(rows.map((r) => r.taskId)).size, 1298);
  const dir = ".evidence/math-onepass/" + (nas ? "nas" : "local");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    dir + "/business-http.json",
    JSON.stringify(
      {
        status: "PASS",
        nas,
        origin,
        expectedSha: nas ? expected : null,
        total: rows.length,
        lessons: 141,
        humanReview: rows.filter((r) => r.status === "pendingReview").length,
        elapsedMs: Date.now() - started,
        rows,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    JSON.stringify({
      status: "PASS",
      total: 1298,
      sourcePrimary: 849,
      sourceAdditional: 449,
      elapsedMs: Date.now() - started,
      nas,
    }),
  );
} finally {
  if (server) {
    server.closeAllConnections();
    await new Promise((r) => server.close(r));
  }
}
