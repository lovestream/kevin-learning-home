import { spawnSync } from "node:child_process";
import { mkdtemp, writeFile, mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  apiSession,
  request,
  statePath,
  commandPath,
  command,
} from "../../tests/platform-parity/business-suite.mjs";
const run = (args) => {
  const r = spawnSync("docker", args, {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
  if (r.status !== 0)
    throw Error("docker " + args[0] + " failed: " + r.stderr.slice(-1500));
  return r.stdout.trim();
};
const root = await mkdtemp(path.join(os.tmpdir(), "klh-bench-container-")),
  data = path.join(root, "data");
await mkdir(data, { mode: 0o700 });
const origin = "http://127.0.0.1:37931",
  name = "klh-bench-" + randomUUID(),
  image = "klh-bench-node:" + randomUUID();
await writeFile(
  path.join(data, "config.private.json"),
  JSON.stringify({
    database: "/data/learning.sqlite",
    port: 8080,
    mediaAssets: [],
    env: {
      BENCH_ENV: "ci",
      PUBLIC_ORIGIN: origin,
      MEDIA_ORIGIN: "http://127.0.0.1:1",
      MEDIA_MOCK_KEY: randomUUID(),
    },
  }),
  { mode: 0o600 },
);
run(["build", "-f", "experiments/node/Dockerfile", "-t", image, "."]);
const launch = async () => {
  run([
    "run",
    "-d",
    "--name",
    name,
    "--user",
    `${process.getuid()}:${process.getgid()}`,
    "--memory",
    "256m",
    "--cpus",
    "1",
    "--read-only",
    "--tmpfs",
    "/tmp:rw,noexec,nosuid,size=16m",
    "-p",
    "127.0.0.1:37931:8080",
    "-v",
    data + ":/data",
    "-e",
    "KLH_BENCH_CONFIG=/data/config.private.json",
    image,
  ]);
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(origin + "/health")).ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  assert(ready, "container health");
};
try {
  await launch();
  const s = await apiSession(origin),
    a = (
      await request(origin, s, statePath().replace(/state$/, "attempts"), {
        method: "POST",
        body: {},
      })
    ).data.attemptId,
    c = command(0, { attemptId: a }),
    submit = () =>
      request(origin, s, commandPath(), {
        method: "POST",
        body: c,
        headers: { "Idempotency-Key": c.commandId },
      });
  assert.equal((await submit()).status, 200);
  const before = (await request(origin, s, statePath())).data;
  run(["rm", "-f", name]);
  await launch();
  assert.deepEqual((await request(origin, s, statePath())).data, before);
  assert.equal((await submit()).data.duplicate, true);
  const environment = JSON.parse(run(["info", "--format", "{{json .}}"]));
  await writeFile(
    "docs/benchmarks/results/node/container-ci.json",
    JSON.stringify(
      {
        status: "PASS_CI",
        scope: "modern Linux container; NOT NAS",
        nonRoot: true,
        readOnlyImage: true,
        persistedAfterDeleteRecreate: true,
        sessionRetained: true,
        receiptRetained: true,
        dockerVersion: environment.ServerVersion,
        kernel: environment.KernelVersion,
        imageTag: "node:24.15.0-bookworm-slim",
        actualImageId: run(["inspect", "--format", "{{.Image}}", name]),
      },
      null,
      2,
    ) + "\n",
  );
} finally {
  try {
    run(["rm", "-f", name]);
  } catch {}
  try {
    run(["image", "rm", image]);
  } catch {}
}
