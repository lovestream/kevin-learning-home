// Modern Linux CI only. No SSH, NAS deployment, credentials or registry publishing.
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, chmodSync, lstatSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { fixture, rawRead } from "./helpers.ts";
import { syntheticCommand } from "../../scripts/synthetic.ts";
import { Store } from "../../packages/platform/store.ts";
import { verifyContainerAuth } from "../auth/container-smoke.ts";
import {
  backup,
  restore,
  layout,
  type Layout,
} from "../../packages/platform/checkpoint.ts";
import { join } from "node:path";
if (process.platform !== "linux" || process.arch !== "x64")
  throw Error("MODERN_LINUX_AMD64_CI_REQUIRED");
const run = (args: string[]) =>
  execFileSync("docker", args, { encoding: "utf8", maxBuffer: 1024 * 1024 });
const nonce = randomUUID(),
  image = "klh-foundation-ci:" + nonce,
  name = "klh-foundation-ci-" + nonce,
  f = fixture();
f.store.command(syntheticCommand());
const expected = f.store.summary();
f.store.close();
let id = "";
try {
  run([
    "build",
    "--platform",
    "linux/amd64",
    "-f",
    "infra/docker/Dockerfile",
    "-t",
    image,
    ".",
  ]);
  const meta = JSON.parse(
    run(["image", "inspect", image, "--format", "{{json .Config}}"]),
  );
  assert.equal(meta.User, "node");
  const actualImageId = run([
    "image",
    "inspect",
    image,
    "--format",
    "{{.Id}}",
  ]).trim();
  assert.equal(
    run([
      "image",
      "inspect",
      image,
      "--format",
      "{{.Architecture}} {{.Os}}",
    ]).trim(),
    "amd64 linux",
  );
  const mountArgs = (paths: Layout) => [
    "-v",
    paths.data + ":/data:rw",
    "-v",
    paths.media + ":/media:ro",
    "-v",
    paths.content + ":/content:ro",
  ];
  const launch = async (paths = f.paths, restart = "no") => {
    id = run([
      "run",
      "-d",
      "--name",
      name,
      "--user",
      String(process.getuid!()) + ":" + String(process.getgid!()),
      "--read-only",
      "--init",
      "--restart",
      restart,
      "--health-interval",
      "1s",
      "--health-start-period",
      "1s",
      "--health-retries",
      "1",
      "--cap-drop",
      "ALL",
      "--security-opt",
      "no-new-privileges",
      "--memory",
      "512m",
      "--tmpfs",
      "/tmp:rw,noexec,nosuid,size=16m",
      "-p",
      "127.0.0.1::4177",
      "-e",
      "KLH_AUTH_ORIGIN=",
      ...mountArgs(paths),
      image,
    ]).trim();
    return checkRunning();
  };
  const checkRunning = async () => {
    let healthy = false;
    for (let i = 0; i < 100; i++) {
      try {
        // RestartCount/Running may update before Docker republishes a dynamic
        // port. Resolve it inside the same bounded readiness wait.
        const hostPort = run(["port", name, "4177/tcp"])
          .trim()
          .split(":")
          .at(-1);
        const r = await rawRead(
          "http://127.0.0.1:" + hostPort + "/health/ready",
          { Host: "127.0.0.1:4177" },
        );
        if (r.status === 200) {
          healthy = true;
          break;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 200));
    }
    assert(healthy, "container ready");
    run(["exec", name, "node", "scripts/healthcheck.ts"]);
    const controls = JSON.parse(
      run(["inspect", name, "--format", "{{json .HostConfig}}"]),
    );
    assert(controls.ReadonlyRootfs);
    assert.equal(controls.Privileged, false);
    const counts = JSON.parse(
      run([
        "exec",
        name,
        "node",
        "--input-type=module",
        "-e",
        "import {DatabaseSync} from 'node:sqlite';const d=new DatabaseSync('/data/learning.sqlite',{readOnly:true});console.log(JSON.stringify({events:d.prepare('SELECT count(*) n FROM learning_events').get().n,receipts:d.prepare('SELECT count(*) n FROM command_receipts').get().n,revision:d.prepare('SELECT revision FROM subject_states').get().revision,uid:process.getuid()}));d.close();",
      ]),
    );
    assert.equal(counts.events, 1);
    assert.equal(counts.receipts, 1);
    assert.equal(counts.revision, 1);
    assert.notEqual(counts.uid, 0);
    assert.throws(() =>
      run([
        "exec",
        name,
        "node",
        "-e",
        "require('node:fs').writeFileSync('/app/should-fail','x')",
      ]),
    );
    assert.throws(() =>
      run([
        "exec",
        name,
        "node",
        "-e",
        "require('node:fs').accessSync('/app/tests/foundation/test-server.ts')",
      ]),
    );
    return counts;
  };
  await launch(f.paths, "unless-stopped");
  const contender = spawnSync(
    "docker",
    [
      "run",
      "--rm",
      "--name",
      name + "-contender",
      "--user",
      String(process.getuid!()) + ":" + String(process.getgid!()),
      "--read-only",
      ...mountArgs(f.paths),
      image,
    ],
    { encoding: "utf8", timeout: 10000 },
  );
  assert.equal(contender.error, undefined);
  assert.equal(contender.status, 1);
  assert.match(contender.stderr, /WRITER_LOCKED_OR_UNWRITABLE/);
  await checkRunning();
  assert.throws(
    () => backup(f.paths, join(f.root, "blocked-live-backup")),
    /WRITER_LOCKED_OR_UNWRITABLE/,
  );
  // Eligibility window for Docker's restart policy; no application retry loop.
  await new Promise((r) => setTimeout(r, 11000));
  const mediaMode = lstatSync(f.paths.media).mode & 0o777;
  const healthStatus = () =>
    run(["inspect", name, "--format", "{{.State.Health.Status}}"]).trim();
  const waitHealth = async (expected: string) => {
    for (let i = 0; i < 100; i++) {
      if (healthStatus() === expected) return;
      await new Promise((r) => setTimeout(r, 100));
    }
    throw Error("HEALTH_STATUS_TIMEOUT:" + expected);
  };
  try {
    chmodSync(f.paths.media, 0o000);
    await waitHealth("unhealthy");
    assert.equal(
      run([
        "inspect",
        name,
        "--format",
        "{{.State.Running}} {{.RestartCount}}",
      ]).trim(),
      "true 0",
    );
  } finally {
    chmodSync(f.paths.media, mediaMode);
  }
  await waitHealth("healthy");
  // Kill only the actual Node child of Docker's init. docker kill is an
  // operator stop and suppresses unless-stopped recovery on this daemon.
  run([
    "exec",
    name,
    "node",
    "--input-type=module",
    "-e",
    "import fs from 'node:fs';import assert from 'node:assert/strict';const children=fs.readFileSync('/proc/1/task/1/children','utf8').trim().split(/\\s+/);assert.equal(children.length,1);const pid=Number(children[0]);assert(pid>1);assert(fs.readFileSync('/proc/'+pid+'/cmdline','utf8').includes('apps/server/main.ts'));process.kill(pid,'SIGKILL');",
  ]);
  let autoRestartCount = 0;
  for (let i = 0; i < 100; i++) {
    autoRestartCount = Number(
      run(["inspect", name, "--format", "{{.RestartCount}}"]).trim(),
    );
    if (
      autoRestartCount >= 1 &&
      run(["inspect", name, "--format", "{{.State.Running}}"]).trim() === "true"
    )
      break;
    await new Promise((r) => setTimeout(r, 100));
  }
  assert(autoRestartCount >= 1);
  await checkRunning();
  await waitHealth("healthy");
  run(["stop", name]);
  run(["rm", name]);
  id = "";
  const persisted = new Store(f.paths.data);
  try {
    assert.deepEqual(persisted.summary(), expected);
  } finally {
    persisted.close();
  }
  await launch();
  run(["kill", "--signal", "KILL", name]);
  const killedExitCode = Number(run(["wait", name]).trim());
  assert.equal(killedExitCode, 137);
  run(["rm", name]);
  id = "";
  const recreated = await launch();
  run(["stop", name]);
  run(["rm", name]);
  id = "";
  const recreatedStore = new Store(f.paths.data);
  try {
    assert.deepEqual(recreatedStore.summary(), expected);
  } finally {
    recreatedStore.close();
  }
  const checkpoint = join(f.root, "checkpoint"),
    restored = join(f.root, "restored-host");
  backup(f.paths, checkpoint);
  restore(checkpoint, restored);
  await launch(layout(restored));
  run(["stop", name]);
  run(["rm", name]);
  id = "";
  const restoredStore = new Store(layout(restored).data);
  try {
    assert.deepEqual(restoredStore.summary(), expected);
  } finally {
    restoredStore.close();
  }
  // Wrong UID cannot write the dedicated data mount: no chmod/chown workaround.
  const denied = spawnSync(
    "docker",
    [
      "run",
      "--rm",
      "--name",
      name + "-denied",
      "--user",
      "65534:65534",
      "--read-only",
      ...mountArgs(f.paths),
      image,
    ],
    { encoding: "utf8", timeout: 20000 },
  );
  assert.notEqual(denied.status, 0);
  assert.match(denied.stderr, /WRITER_LOCKED_OR_UNWRITABLE|STARTUP_FAILED/);
  assert.equal(denied.error, undefined);
  await verifyContainerAuth(image, name + "-auth");
  await verifyContainerAuth(image, name + "-math", true);
  const evidence = {
    status: "PASS_CI",
    scope: "modern Linux amd64, never NAS",
    executedHeadSha: execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim(),
    writerProtocol: "kernel-flock-v2",
    nativeAddonRuntime: "fs-ext@2.1.1, built for Node24/linux-amd64",
    contenderExitCode: contender.status,
    activeOwnerNotEvicted: true,
    liveBackupExcluded: true,
    killedContainerExitCode: killedExitCode,
    killRecreatePreserved: true,
    restartPolicy: "unless-stopped",
    autoRestartCount,
    autoRestartAfterProcessKill: true,
    autoRestartTrigger:
      "SIGKILL to verified Node child of init; not docker kill",
    unhealthyAloneDidNotRestart: true,
    productionHealthCommandRecovered: true,
    nonRoot: true,
    readOnlyRootfs: true,
    deletedRecreatedVolumePersistent: true,
    restoredHostReady: true,
    exactTableHashesPreserved: true,
    actualImageId,
    architecture: "linux/amd64",
    healthcheckCommandPassed: true,
    wrongUidRejected: true,
    testHarnessExcludedFromImage: true,
    tables: expected,
    kernel: execFileSync("uname", ["-r"], { encoding: "utf8" }).trim(),
    dockerVersion: run(["version", "--format", "{{.Server.Version}}"]).trim(),
  };
  mkdirSync(".evidence", { recursive: true });
  writeFileSync(
    ".evidence/container.json",
    JSON.stringify(evidence, null, 2) + "\n",
  );
  console.log(JSON.stringify({ status: "PASS_CI", scope: evidence.scope }));
} finally {
  if (id) {
    try {
      run(["rm", "-f", name]);
    } catch {}
  }
  try {
    run(["rm", "-f", name + "-contender"]);
  } catch {}
  try {
    run(["rm", "-f", name + "-denied"]);
  } catch {}
  try {
    run(["image", "rm", image]);
  } catch {}
  f.close();
}
