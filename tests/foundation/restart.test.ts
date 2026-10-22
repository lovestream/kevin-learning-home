import test from "node:test";
import assert from "node:assert/strict";
import { fork, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import { syntheticCommand } from "../../scripts/synthetic.ts";
import { fixture, port, send } from "./helpers.ts";
test("F06 real Node process stop/restart preserves state and original receipt", async () => {
  const f = fixture();
  f.store.close();
  let child: ChildProcess | undefined;
  const p = await port(),
    token = randomUUID(),
    origin = "http://127.0.0.1:" + p;
  const start = async () => {
    child = fork("tests/foundation/test-server.ts", [], {
      env: {
        ...process.env,
        NODE_ENV: "test",
        KLH_TEST_PORT: String(p),
        KLH_TEST_TOKEN: token,
        KLH_TEST_DATA: f.paths.data,
      },
      stdio: ["ignore", "ignore", "pipe", "ipc"],
    });
    await Promise.race([
      once(child, "message"),
      once(child, "exit").then(() => {
        throw Error("child exited before ready");
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(Error("child timeout")), 10000).unref(),
      ),
    ]);
  };
  const stop = async () => {
    if (child && child.exitCode === null) {
      const done = once(child, "exit");
      child.kill("SIGTERM");
      await done;
    }
  };
  try {
    await start();
    const c = syntheticCommand();
    const original = await (await send(origin, token, c)).json();
    assert.equal(original.duplicate, false);
    await stop();
    await start();
    const replay = await (await send(origin, token, c)).json();
    assert.equal(replay.duplicate, true);
    assert.deepEqual(replay.events, original.events);
    assert.equal(replay.committedRevision, 1);
    assert.equal(
      (
        await (
          await fetch(
            origin +
              "/api/v1/learners/synthetic-learner/subjects/foundation-demo/state",
            { headers: { "X-Foundation-Test-Session": token } },
          )
        ).json()
      ).revision,
      1,
    );
  } finally {
    await stop();
    f.close();
  }
});
