// Explicit integration test: stops/restarts only this anonymous preview service.
// Never run while a child is using it; no formal storage is imported.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createServer } from "node:http";
import { mkdirSync, writeFileSync } from "node:fs";
import { ORIGIN, PORT } from "../../scripts/local/service.mjs";
if (!process.argv.includes("--confirm-reset-preview"))
  throw Error(
    "Requires --confirm-reset-preview; this test ends anonymous page sessions.",
  );
function control(action, ok = true) {
  const r = spawnSync(
    process.execPath,
    ["scripts/local/service.mjs", action, "--json"],
    { encoding: "utf8", timeout: 120000 },
  );
  assert(!r.error, r.error?.message);
  if (ok) assert.equal(r.status, 0, r.stderr);
  else assert.notEqual(r.status, 0);
  return r;
}
const current = () => JSON.parse(control("status").stdout.trim());
const wasRunning = current().running;
const foreign = createServer((_req, res) => res.end("unrelated-service"));
let foreignOpen = false;
try {
  control("stop");
  assert.equal(current().running, false);
  await new Promise((resolve, reject) => {
    foreign.once("error", reject);
    foreign.listen(PORT, "127.0.0.1", resolve);
  });
  foreignOpen = true;
  const refused = control("start", false);
  assert.match(refused.stderr, /其他进程占用/);
  assert.equal(await fetch(ORIGIN).then((r) => r.text()), "unrelated-service");
  control("stop"); // Stopping our unloaded agent must not kill a foreign listener.
  assert.equal(await fetch(ORIGIN).then((r) => r.text()), "unrelated-service");
  await new Promise((r) => foreign.close(r));
  foreignOpen = false;
  control("start");
  const first = current();
  assert(first.running && first.currentBuild);
  await Promise.all(
    Array.from({ length: 3 }, () =>
      promisify(execFile)(
        process.execPath,
        ["scripts/local/service.mjs", "start", "--json"],
        { timeout: 120000 },
      ),
    ),
  );
  control("start");
  assert.equal(
    current().pid,
    first.pid,
    "idempotent start must keep active sessions",
  );
  const ppid = spawnSync("/bin/ps", ["-o", "ppid=", "-p", String(first.pid)], {
    encoding: "utf8",
  });
  assert.equal(
    ppid.stdout.trim(),
    "1",
    "server must be owned by launchd, not a terminal/tool session",
  );
  control("restart");
  const restarted = current();
  assert(restarted.running && restarted.currentBuild);
  assert.notEqual(restarted.pid, first.pid);
  control("stop");
  assert.equal(current().running, false);
  control("start");
  assert(current().running);
  const result = {
    status: "PASS",
    buildSha: current().buildSha,
    terminalIndependent: true,
    idempotentStart: true,
    concurrentStart: true,
    stopRestart: true,
    foreignPortPreserved: true,
    realRecordsRead: false,
    realRecordsModified: false,
    database: false,
  };
  mkdirSync(".evidence/local", { recursive: true });
  writeFileSync(
    ".evidence/local/lifecycle.json",
    JSON.stringify(result, null, 2) + "\n",
  );
  console.log(JSON.stringify(result));
} finally {
  if (foreignOpen) await new Promise((r) => foreign.close(r));
  if (wasRunning) control("start");
  else control("stop");
}
