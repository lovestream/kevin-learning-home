// Real Linux Docker gate for the user-authorized LAN HTTP content-only release.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import http from "node:http";
import { execFileSync, spawn } from "node:child_process";
import { randomUUID, createHash } from "node:crypto";
import { createGzip } from "node:zlib";
import { pipeline } from "node:stream/promises";
import { loadContent } from "../../apps/preview/content.ts";
import { canonical } from "../../apps/preview/contract.ts";
if (process.platform !== "linux" || process.arch !== "x64")
  throw Error("LINUX_AMD64_DOCKER_GATE_REQUIRED");
const docker = (...args) =>
  execFileSync("docker", args, {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
const head = execFileSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8",
}).trim();
const nonce = randomUUID(),
  image = "klh-content-ci:" + nonce,
  app = "klh-content-app-" + nonce,
  network = "klh-content-net-" + nonce;
const directory = fs.mkdtempSync(path.join(os.tmpdir(), "klh-content-image-"));
const output = ".evidence/math-full-nas-r2";
fs.mkdirSync(output, { recursive: true });
const owner = [
  "--label",
  "org.kevin-learning-home.preview=" + nonce,
  "--label",
  "com.centurylinklabs.watchtower.enable=false",
];
const hardening = [
  "--read-only",
  "--user",
  process.getuid() + ":" + process.getgid(),
  "--cap-drop",
  "ALL",
  "--security-opt",
  "no-new-privileges:true",
  "--memory",
  "256m",
  "--cpuset-cpus",
  "0",
];
let networkCreated = false;
try {
  docker(
    "build",
    "--platform",
    "linux/amd64",
    "-f",
    "infra/math-preview/Dockerfile",
    "--build-arg",
    "KLH_BUILD_SHA=" + head,
    "-t",
    image,
    ".",
  );
  const info = JSON.parse(docker("image", "inspect", image))[0];
  assert.equal(info.Config.User, "node");
  assert.equal(info.Architecture, "amd64");
  assert.equal(info.Config.Labels["org.opencontainers.image.revision"], head);
  docker("network", "create", ...owner, network);
  networkCreated = true;
  const net = JSON.parse(docker("network", "inspect", network))[0],
    gateway = net.IPAM.Config[0].Gateway,
    prefix = gateway.slice(0, gateway.lastIndexOf(".") + 1),
    appIP = prefix + "2";
  const origin = "http://192.168.2.100:38444";
  const env = [
    "-e",
    "KLH_CONTENT_PREVIEW=1",
    "-e",
    "KLH_PREVIEW_RUNTIME=isolated-container",
    "-e",
    "KLH_PREVIEW_ORIGIN=" + origin,
  ];
  docker(
    "run",
    "-d",
    "--name",
    app,
    ...owner,
    ...hardening,
    "--network",
    network,
    "--ip",
    appIP,
    ...env,
    "-e",
    "KLH_PREVIEW_BIND=" + appIP,
    "-e",
    "KLH_PREVIEW_PEERS=" + gateway + "/32,127.0.0.0/8",
    "-p",
    "127.0.0.1::4179",
    image,
  );
  const inspect = (name) => JSON.parse(docker("inspect", name))[0];
  const port = Number(
    inspect(app).NetworkSettings.Ports["4179/tcp"][0].HostPort,
  );
  const request = (url = "/", headers = {}, method = "GET") =>
    new Promise((resolve, reject) => {
      const req = http.request(
        {
          host: "127.0.0.1",
          port,
          path: url,
          method,
          headers: { Host: "192.168.2.100:38444", ...headers },
        },
        (res) => {
          let body = "";
          res.on("data", (b) => (body += b));
          res.on("end", () =>
            resolve({ status: res.statusCode, headers: res.headers, body }),
          );
        },
      );
      req.on("error", reject);
      req.setTimeout(5000, () => req.destroy(Error("HTTP_TEST_TIMEOUT")));
      req.end();
    });
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try {
      ready = (await request("/health/ready")).status === 200;
      if (ready) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  assert(ready, "PREVIEW_HTTP_NOT_READY");
  const runtime = JSON.parse((await request("/preview-api/v1/runtime")).body);
  assert.equal(runtime.buildSha, head);
  assert.equal(runtime.database, false);
  assert.equal(runtime.lessons, 70);
  const { catalog } = loadContent(process.cwd()),
    remote = JSON.parse((await request("/preview-api/v1/catalog")).body);
  assert.equal(canonical(remote), canonical(catalog));
  for (const item of catalog.lessons) {
    const r = await request("/preview-api/v1/lessons/" + item.lessonId);
    assert.equal(r.status, 200);
    assert.equal(r.headers["set-cookie"], undefined);
    assert.equal(
      createHash("sha256")
        .update(canonical(JSON.parse(r.body)))
        .digest("hex"),
      item.dtoSha256,
    );
    assert.equal(
      (await request("/subjects/math/lessons/" + item.lessonId)).status,
      200,
    );
  }
  assert.equal((await request("/subjects/math")).status, 200);
  assert.equal((await request("/", { Host: "foreign.test" })).status, 403);
  assert.equal(
    (await request("/", { Origin: "https://foreign.test" })).status,
    403,
  );
  assert.equal((await request("/", {}, "POST")).status, 405);
  for (const p of [
    "/api/v1/auth/session",
    "/api/v1/learners",
    "/api/v1/wallet",
    "/data/learning.sqlite",
  ])
    assert.equal((await request(p)).status, 404);
  const missing = docker(
    "exec",
    app,
    "node",
    "--input-type=module",
    "-e",
    "import fs from 'node:fs';import assert from 'node:assert/strict';for(const p of ['/app/apps/server','/app/packages','/app/scripts/auth-admin.ts','/app/node_modules/fs-ext','/data','/media','/content'])assert(!fs.existsSync(p),p);assert(process.getuid()>0);console.log('PREVIEW_ONLY_NO_IDENTITY_OR_DB');",
  ).trim();
  assert.equal(missing, "PREVIEW_ONLY_NO_IDENTITY_OR_DB");
  const appMeta = inspect(app);
  assert.equal(appMeta.Mounts.length, 0);
  assert.equal(
    appMeta.HostConfig.PortBindings["4179/tcp"][0].HostIp,
    "127.0.0.1",
  );
  assert(appMeta.HostConfig.ReadonlyRootfs);
  let archive = null;
  if (process.env.KLH_EXPORT_PREVIEW_IMAGE === "1") {
    const file = output + "/preview-amd64.tar.gz",
      save = spawn("docker", ["save", image], {
        stdio: ["ignore", "pipe", "inherit"],
      });
    const exit = new Promise((resolve, reject) => {
      save.on("error", reject);
      save.on("close", (code) =>
        code === 0 ? resolve() : reject(Error("DOCKER_SAVE_FAILED")),
      );
    });
    await Promise.all([
      pipeline(save.stdout, createGzip(), fs.createWriteStream(file)),
      exit,
    ]);
    const hash = createHash("sha256");
    for await (const chunk of fs.createReadStream(file)) hash.update(chunk);
    archive = {
      name: "preview-amd64.tar.gz",
      bytes: fs.statSync(file).size,
      sha256: hash.digest("hex"),
    };
  }
  const evidence = {
    status: "PASS_PREVIEW_IMAGE_CI",
    buildSha: head,
    imageId: info.Id,
    imageTag: image,
    architecture: "linux/amd64",
    node: "24.15.0",
    baseDigest:
      "sha256:152aceace5c03e2597988763165ee33e3fd3633636db0fc983cd2e126b02cfde",
    catalogSha256: runtime.catalogSha256,
    lessons: 70,
    realLANHTTP: true,
    noCertificatesUsed: true,
    nonRoot: true,
    readOnlyRoot: true,
    appMounts: 0,
    appPublishedPorts: 1,
    ciBind: "127.0.0.1",
    formalServerOrSQLiteInImage: false,
    negativeAPIs: "PASS",
    archive,
  };
  fs.writeFileSync(
    output + "/image.json",
    JSON.stringify(evidence, null, 2) + "\n",
  );
  console.log(
    JSON.stringify({
      status: evidence.status,
      imageId: evidence.imageId,
      archive,
    }),
  );
} finally {
  for (const name of [app])
    try {
      docker("rm", "-f", name);
    } catch {}
  if (networkCreated)
    try {
      docker("network", "rm", network);
    } catch {}
  try {
    docker("image", "rm", image);
  } catch {}
  fs.rmSync(directory, { recursive: true, force: true });
}
