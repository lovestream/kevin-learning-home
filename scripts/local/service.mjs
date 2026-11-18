#!/usr/bin/env node
// Current-user macOS service. Never imports formal storage, rewards or NAS tools.
import { spawnSync } from "node:child_process";
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  renameSync,
  openSync,
  closeSync,
  unlinkSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";

export const LABEL = "com.lovestream.kevin-learning-home.local";
export const PORT = 38444;
export const ORIGIN = `http://127.0.0.1:${PORT}`;
const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const STATE = join(ROOT, ".local-runtime");
const PLIST = join(homedir(), "Library/LaunchAgents", `${LABEL}.plist`);
const DOMAIN = `gui/${process.getuid?.()}`;
const SERVICE = `${DOMAIN}/${LABEL}`;

function command(file, args, allowFailure = false) {
  const r = spawnSync(file, args, { encoding: "utf8", maxBuffer: 1024 * 1024 });
  if (!allowFailure && (r.error || r.status !== 0))
    throw Error(
      `${file} ${args[0]} 未完成：${r.error?.message ?? r.stderr.trim().slice(0, 500)}`,
    );
  return r;
}
export function config(root, node) {
  return {
    Label: LABEL,
    ProgramArguments: [node, join(root, "apps/preview/server.ts")],
    WorkingDirectory: root,
    EnvironmentVariables: {
      NODE_ENV: "production",
      KLH_CONTENT_PREVIEW: "1",
      KLH_PREVIEW_PORT: String(PORT),
    },
    RunAtLoad: true,
    KeepAlive: { SuccessfulExit: false },
    ThrottleInterval: 10,
    StandardOutPath: join(root, ".local-runtime", "stdout.log"),
    StandardErrorPath: join(root, ".local-runtime", "stderr.log"),
    Umask: 63,
  };
}
export function assertOwnedConfig(actual, expected) {
  // Refuse another checkout/service; never silently replace somebody else's agent.
  const canonical = (x) =>
    Array.isArray(x)
      ? x.map(canonical)
      : x && typeof x === "object"
        ? Object.fromEntries(
            Object.entries(x)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([k, v]) => [k, canonical(v)]),
          )
        : x;
  if (JSON.stringify(canonical(actual)) !== JSON.stringify(canonical(expected)))
    throw Error("后台配置与本项目不一致，未替换或停止任何服务。");
}
export function plistXML(value) {
  const esc = (s) =>
    String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  const encode = (x) =>
    typeof x === "boolean"
      ? `<${x}/>`
      : typeof x === "number"
        ? `<integer>${x}</integer>`
        : typeof x === "string"
          ? `<string>${esc(x)}</string>`
          : Array.isArray(x)
            ? `<array>${x.map(encode).join("")}</array>`
            : `<dict>${Object.entries(x)
                .map(([k, v]) => `<key>${esc(k)}</key>${encode(v)}`)
                .join("")}</dict>`;
  return `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0">${encode(value)}</plist>\n`;
}
function installed() {
  if (!existsSync(PLIST)) return false;
  const parsed = JSON.parse(
    command("/usr/bin/plutil", ["-convert", "json", "-o", "-", PLIST]).stdout,
  );
  assertOwnedConfig(parsed, config(ROOT, process.execPath));
  return true;
}
function loaded() {
  const r = command("/bin/launchctl", ["print", SERVICE], true);
  if (r.status !== 0) return null;
  if (
    !r.stdout.includes(`program = ${process.execPath}\n`) ||
    !r.stdout.includes(`working directory = ${ROOT}\n`) ||
    !r.stdout.includes(join(ROOT, "apps/preview/server.ts"))
  )
    throw Error("已加载的后台任务不是本项目，未操作。");
  return { pid: Number(r.stdout.match(/\bpid = (\d+)/)?.[1] ?? 0) };
}
function listeners() {
  const r = command(
    "/usr/sbin/lsof",
    ["-nP", "-t", `-iTCP:${PORT}`, "-sTCP:LISTEN"],
    true,
  );
  if (r.error || (r.status !== 0 && r.status !== 1))
    throw Error("无法核对端口归属，未操作后台服务。");
  return [...new Set(r.stdout.trim().split(/\s+/).filter(Boolean).map(Number))];
}
function seal() {
  return JSON.parse(
    readFileSync(join(ROOT, "apps/preview/dist/seal.json"), "utf8"),
  );
}
async function probe() {
  try {
    const r = await fetch(`${ORIGIN}/preview-api/v1/runtime`, {
      signal: AbortSignal.timeout(1500),
    });
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}
export function healthy(runtime, sha) {
  return (
    runtime?.buildSha === sha &&
    runtime.contentOnly === true &&
    runtime.database === false &&
    runtime.lessons === 70 &&
    runtime.practiceTasks === 849 &&
    runtime.english?.cards === 6631 &&
    runtime.english.groups === 665 &&
    runtime.english.media === 1861 &&
    runtime.storage === "page-memory-only"
  );
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function preflight() {
  if (process.platform !== "darwin") throw Error("这个启动器用于本机 macOS。");
  if (Number(process.versions.node.split(".")[0]) < 24)
    throw Error("需要 Node.js 24 或更新版本。");
  command("/bin/launchctl", ["print", DOMAIN]);
  if (!existsSync(join(ROOT, "node_modules/vite/package.json")))
    throw Error("依赖尚未安装，请先运行 npm ci。");
  if (!existsSync(join(ROOT, ".english-family/seal.json")))
    throw Error("缺少本机家庭英语素材包；不会从 NAS 或私人学习库自动导入。");
}
function build() {
  if (loaded() || listeners().length)
    throw Error("请先停止本项目服务后再构建；不会重启正在使用的页面。");
  mkdirSync(STATE, { recursive: true, mode: 0o700 });
  console.log("正在构建本机版本，完整输出写入 .local-runtime/build.log…");
  const r = spawnSync(
    join(dirname(process.execPath), "npm"),
    ["run", "build:math-preview"],
    {
      cwd: ROOT,
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
      env: {
        ...process.env,
        PATH: `${dirname(process.execPath)}:${process.env.PATH ?? ""}`,
        KLH_BUILD_SHA: head(),
      },
    },
  );
  writeFileSync(join(STATE, "build.log"), (r.stdout ?? "") + (r.stderr ?? ""), {
    mode: 0o600,
  });
  if (r.error || r.status !== 0)
    throw Error("构建失败；请查看 .local-runtime/build.log，后台未启动。");
}
function head() {
  return command("/usr/bin/git", [
    "-C",
    ROOT,
    "rev-parse",
    "HEAD",
  ]).stdout.trim();
}
async function status() {
  const owns = installed(),
    job = loaded(),
    pids = listeners(),
    runtime = await probe();
  const running =
    owns &&
    job?.pid > 0 &&
    pids.length === 1 &&
    pids[0] === job.pid &&
    existsSync(join(ROOT, "apps/preview/dist/seal.json")) &&
    healthy(runtime, seal().buildSha);
  return {
    running: Boolean(running),
    loaded: Boolean(job),
    pid: job?.pid ?? null,
    portOccupied: pids.length > 0,
    origin: ORIGIN,
    buildSha: running ? runtime.buildSha : null,
    checkoutSha: head(),
    currentBuild: running ? runtime.buildSha === head() : false,
    storage: "page-memory-only",
    realDataImported: false,
  };
}
async function start() {
  preflight();
  installed();
  const s = await status();
  if (s.running) {
    if (!s.currentBuild)
      throw Error(
        "后台正在运行较早版本。为保留当前页面未自动重启；更新请使用 restart。",
      );
    return s;
  }
  if (loaded())
    throw Error(
      "任务已加载但未就绪；请检查 .local-runtime/stderr.log，或使用 restart。",
    );
  if (listeners().length)
    throw Error(`端口 ${PORT} 被其他进程占用，没有停止该进程。`);
  if (
    !existsSync(join(ROOT, "apps/preview/dist/seal.json")) ||
    seal().buildSha !== head()
  )
    build();
  mkdirSync(STATE, { recursive: true, mode: 0o700 });
  for (const name of ["stdout.log", "stderr.log"]) {
    // launchd creates log files before applying the child's umask.
    const path = join(STATE, name);
    if (!existsSync(path)) writeFileSync(path, "", { mode: 0o600, flag: "wx" });
  }
  mkdirSync(dirname(PLIST), { recursive: true });
  if (!existsSync(PLIST)) {
    const tmp = `${PLIST}.${process.pid}.tmp`;
    writeFileSync(tmp, plistXML(config(ROOT, process.execPath)), {
      mode: 0o600,
      flag: "wx",
    });
    renameSync(tmp, PLIST);
  }
  command("/bin/launchctl", ["enable", SERVICE]);
  command("/bin/launchctl", ["bootstrap", DOMAIN, PLIST]);
  for (let n = 0; n < 40; n++) {
    await sleep(500);
    const s = await status();
    if (s.running) return s;
  }
  // Only remove the exact owned job if startup failed; never touch a foreign port.
  installed();
  loaded();
  command("/bin/launchctl", ["bootout", SERVICE], true);
  throw Error(
    "启动未就绪，已撤下本项目任务。请查看 .local-runtime/stderr.log。",
  );
}
async function stop() {
  const owns = installed(),
    job = loaded();
  if (!owns && job) throw Error("缺少可核对的服务配置，没有停止进程。");
  if (job) command("/bin/launchctl", ["bootout", SERVICE]);
  if (owns) command("/bin/launchctl", ["disable", SERVICE]);
  for (let n = 0; job?.pid && n < 30; n++) {
    if (!listeners().includes(job.pid)) return;
    await sleep(200);
  }
  if (job?.pid && listeners().includes(job.pid))
    throw Error("本项目进程仍未退出，请检查日志。");
}
async function run(action, json) {
  if (!["start", "stop", "restart", "status", "build", "open"].includes(action))
    throw Error(
      "用法：node scripts/local/service.mjs start|stop|restart|status|build|open [--json]",
    );
  if (process.platform !== "darwin") throw Error("这个启动器用于本机 macOS。");
  let s;
  if (action === "stop") {
    await stop();
    console.log("学习家园已停止；没有删除课程、学习库或素材。");
    return;
  }
  if (action === "build") {
    preflight();
    installed();
    build();
    console.log("本机构建完成。");
    return;
  }
  if (action === "restart") {
    console.log("重新启动会结束当前匿名页面会话；不会修改旧学习库。");
    await stop();
    s = await start();
  } else if (action === "start" || action === "open") s = await start();
  else s = await status();
  if (json) console.log(JSON.stringify(s));
  else
    console.log(
      s.running
        ? `学习家园后台运行中：${ORIGIN}\n版本 ${s.buildSha}\n关闭终端/浏览器不会停止服务；当前记录仅在本次页面会话保留。`
        : `学习家园未就绪${s.portOccupied ? "，端口被占用" : ""}。运行 start 启动。`,
    );
  if (action === "open") command("/usr/bin/open", [ORIGIN]);
}
export async function main(action = "status", json = false) {
  if (process.platform !== "darwin" || action === "status")
    return run(action, json);
  mkdirSync(STATE, { recursive: true, mode: 0o700 });
  const lock = join(STATE, "control.lock");
  for (let n = 0; n < 120; n++) {
    let fd;
    try {
      fd = openSync(lock, "wx", 0o600);
    } catch (e) {
      if (e.code !== "EEXIST") throw e;
      try {
        const pid = Number(readFileSync(lock, "utf8"));
        if (Number.isSafeInteger(pid) && pid > 1) {
          try {
            process.kill(pid, 0);
          } catch (err) {
            if (err.code === "ESRCH") unlinkSync(lock);
          }
        }
      } catch (err) {
        if (err.code !== "ENOENT") throw err;
      }
      await sleep(250);
      continue;
    }
    try {
      writeFileSync(fd, String(process.pid));
      return await run(action, json);
    } finally {
      closeSync(fd);
      unlinkSync(lock);
    }
  }
  throw Error("另一个启动/停止操作尚未结束，请稍后再试；未停止任何进程。");
}
if (
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url
) {
  try {
    await main(process.argv[2], process.argv.includes("--json"));
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  }
}
