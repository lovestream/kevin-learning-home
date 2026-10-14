import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { runBusinessSuite } from "./business-suite.mjs";
import { runBrowserSuite } from "./browser-suite.mjs";
import { runRecovery, runLoad } from "./extended-suite.mjs";
const kind = process.argv[2];
if (!["node", "cloudflare"].includes(kind)) throw Error("route required");
const { createHarness } = await import(`../../experiments/${kind}/harness.mjs`);
const work = await mkdtemp(path.join(os.tmpdir(), "klh-bench-" + kind + "-"));
const port=process.env.KLH_BENCH_PORT?Number(process.env.KLH_BENCH_PORT):undefined;if(port!==undefined&&(!Number.isInteger(port)||port<1024||port>65534))throw Error("invalid isolated test port");
const h = await createHarness({ directory: path.join(work, "primary"),...(port?{port,mediaPort:port+1}:{}) });
const result = {
  route: kind,
  timestamp: new Date().toISOString(),
  environment: {
    node: process.version,
    os: os.platform(),
    arch: os.arch(),
    kernel: os.release(),
    route: h.environment,
  },
  scope: process.env.CI ? "CI" : "LOCAL",
  seed: 20261013,
  executedHeadSha: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  cpuModel: os.cpus()[0]?.model,
  remote: "BLOCKED_APPROVAL",
  nas: "NOT_RUN_USER_DEFERRED",
};
try {
  result.phase = "business";
  result.business = await runBusinessSuite(h);
  result.phase = "browser";
  result.browser = await runBrowserSuite(h);
  result.phase = "recovery";
  result.recovery = await runRecovery(h, createHarness, work);
  result.phase = "performance";
  result.performance = [];
  for (const size of ["S", "M"])
    result.performance.push(await runLoad(h, size));
  result.status = process.env.CI ? "PASS_CI" : "PASS_LOCAL";
} catch (e) {
  result.status = "FAIL";
  result.error = {
    name: e.name,
    message: e.message.replaceAll(work, "<owned-test-directory>"),
  };
  throw e;
} finally {
  await h.close();
  const out = process.env.KLH_RESULT_DIR ?? `docs/benchmarks/results/${kind}`;
  await mkdir(out, { recursive: true });
  await writeFile(
    path.join(out, process.env.CI ? "ci.json" : "local.json"),
    JSON.stringify(result, null, 2) + "\n",
  );
  await rm(work,{recursive:true,force:true});
  console.log(
    JSON.stringify({
      route: kind,
      status: result.status,
      evidence: path.join(out, process.env.CI ? "ci.json" : "local.json"),
    }),
  );
}
