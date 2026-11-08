// Visible anonymous preview on the user's Mac. Never reads credentials, CA keys or a database.
import fs from "node:fs";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { chromium, expect } from "@playwright/test";
import { startPreview } from "../../apps/preview/server.ts";
const REPO = fileURLToPath(new URL("../..", import.meta.url));
const sha = (x) => createHash("sha256").update(x).digest("hex");
const quote = (x) => "'" + x.replaceAll("'", "'\\''") + "'";
function own(p, mode) {
  const s = fs.lstatSync(p);
  if (
    s.isSymbolicLink() ||
    fs.realpathSync(p) !== resolve(p) ||
    s.uid !== process.getuid() ||
    (mode !== undefined && (s.mode & 0o777) !== mode)
  )
    throw Error("OWNED_LOCAL_PATH_REQUIRED");
}
export function deliverPreview(
  repo = resolve(REPO),
  destination = join(os.homedir(), "Documents/Kevin-Learning-Home-Trial"),
) {
  repo = fs.realpathSync(repo);
  destination = resolve(destination);
  own(dirname(destination));
  const marker = join(destination, ".math-full-delivery.json");
  if (fs.existsSync(destination)) {
    own(destination, 0o700);
    if (fs.existsSync(marker)) {
      own(marker, 0o600);
      const old = JSON.parse(fs.readFileSync(marker));
      if (old.repo !== repo) throw Error("DELIVERY_REPO_MISMATCH");
      for (const [name, digest] of Object.entries(old.files)) {
        if (!["打开70课体验.command", "70课体验说明.md"].includes(name))
          throw Error("UNOWNED_DELIVERY_FILE");
        own(join(destination, name));
        if (sha(fs.readFileSync(join(destination, name))) !== digest)
          throw Error("USER_EDIT_PRESERVED");
      }
    } else {
      const legacy = join(destination, ".delivery.json");
      own(legacy, 0o600);
      if (JSON.parse(fs.readFileSync(legacy)).repo !== repo)
        throw Error("UNOWNED_DELIVERY_DIRECTORY");
    }
  } else fs.mkdirSync(destination, { mode: 0o700 });
  const command =
    "#!/bin/zsh\nset -eu\ncd -- " +
    quote(repo) +
    "\nexec " +
    quote(process.execPath) +
    " " +
    quote(join(repo, "scripts/math-full-01/mac.mjs")) +
    " --open\n";
  const guide = [
    "# 70课数学体验：无需账号",
    "",
    "新入口：http://127.0.0.1:4179/（仅这台Mac）",
    "",
    "1. 双击同文件夹「打开70课体验.command」，保持运行终端。",
    "2. 可见浏览器直接打开全部70课目录，不需要任何账号、密码或证书安装。",
    "3. 按单元/基础B/提高E/思维O选择课程，体验六步与原教具。",
    "体验模式不会保存：无真实资料，无成绩/阅读记录。刷新或离开课堂，猜想、照片与教具操作全部清空。",
    "70课全部仍是draft；64交互、6静态关系图/纸笔指导。完整849题将在下一批接入，本批不生成掌握/积分。",
    "原NAS 38443/38444与原账号指南保持原样；这里的70课尚未部署NAS，不能在手机/iPad输入127.0.0.1当作Mac地址。",
    "本机回环HTTP不经过网络，不携带登录身份或真实数据；不改变现有正式服务的HTTPS、登录或家长权限。",
    "关闭体验浏览器后，本次服务停止。重复双击不会创建第二个进程/工作树；已运行时也可直接在本机浏览器打开上方地址。",
    "如端口占用或资源校验失败，停止并反馈，不终止其他程序、不改安全设置。",
    "同机工作副本：" + repo,
    "",
    "本目录原有START-HERE.md仍属于旧NAS单课合成账户，与本次免账号入口不同；不要删除其中私密文件。",
    "",
  ].join("\n");
  const files = { "打开70课体验.command": command, "70课体验说明.md": guide },
    hashes = {};
  for (const name of Object.keys(files)) {
    const p = join(destination, name);
    if (fs.existsSync(p)) {
      own(p);
      if (!fs.existsSync(marker)) throw Error("UNKNOWN_FILE_PRESERVED");
    }
  }
  for (const [name, body] of Object.entries(files)) {
    const p = join(destination, name);
    fs.writeFileSync(p, body, {
      mode: name.endsWith(".command") ? 0o700 : 0o600,
    });
    fs.chmodSync(p, name.endsWith(".command") ? 0o700 : 0o600);
    hashes[name] = sha(body);
  }
  fs.writeFileSync(marker, JSON.stringify({ repo, files: hashes }), {
    mode: 0o600,
  });
  fs.chmodSync(marker, 0o600);
  return {
    destination,
    origin: "http://127.0.0.1:4179/",
    passwordsRequired: false,
  };
}
export async function openPreview() {
  if (
    process.platform !== "darwin" ||
    Number(
      execFileSync("stat", ["-f", "%u", "/dev/console"], {
        encoding: "utf8",
      }).trim(),
    ) !== process.getuid() ||
    execFileSync("launchctl", ["managername"], { encoding: "utf8" }).trim() !==
      "Aqua"
  )
    throw Error("USER_MAC_VISIBLE_SESSION_REQUIRED");
  const directory = join(REPO, ".evidence/math-full-01");
  fs.mkdirSync(directory, { recursive: true });
  own(directory);
  const marker = join(directory, "mac-runtime.json");
  if (fs.existsSync(marker)) {
    own(marker, 0o600);
    const old = JSON.parse(fs.readFileSync(marker));
    if (old.repo !== resolve(REPO)) throw Error("UNOWNED_MAC_RUNTIME");
    try {
      process.kill(old.pid, 0);
    } catch {
      throw Error("STALE_RUNTIME_PRESERVED_NEEDS_REVIEW");
    }
    const r = await fetch("http://127.0.0.1:4179/health/ready");
    if (!r.ok || (await r.json()).status !== "content-only-ready")
      throw Error("RUNNING_SERVICE_NOT_CONFIRMED");
    console.log(
      "70课体验已运行：http://127.0.0.1:4179/；没有创建第二份进程或配置。",
    );
    return;
  }
  const record = { repo: resolve(REPO), pid: process.pid, nonce: randomUUID() };
  fs.writeFileSync(marker, JSON.stringify(record), { mode: 0o600 });
  let server,
    browser,
    closing = false;
  let done;
  const ended = new Promise((r) => (done = r));
  const close = async () => {
    if (closing) return;
    closing = true;
    try {
      await browser?.close();
      if (server) {
        server.closeAllConnections();
        await new Promise((r) => server.close(r));
      }
      if (fs.existsSync(marker)) {
        own(marker, 0o600);
        const current = JSON.parse(fs.readFileSync(marker));
        if (current.nonce !== record.nonce)
          throw Error("RUNTIME_OWNER_MISMATCH");
        fs.unlinkSync(marker);
      }
    } finally {
      done();
    }
  };
  try {
    server = await startPreview({ port: 4179, enabled: true });
    browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({
        viewport: { width: 1280, height: 900 },
      }),
      page = await context.newPage();
    browser.on("disconnected", () => void close());
    const watch = (p) =>
      p.once("close", () => {
        if (!context.pages().length) void close();
      });
    context.pages().forEach(watch);
    context.on("page", watch);
    for (const signal of ["SIGINT", "SIGTERM"])
      process.once(signal, () => void close());
    await page.goto("http://127.0.0.1:4179/");
    await expect(page.locator("[data-lesson-link]")).toHaveCount(70);
    await page.bringToFront();
    await page.screenshot({
      path: join(directory, "mac-visible-catalog.png"),
      fullPage: true,
    });
    console.log(
      "70课免账号体验已在这台Mac打开：http://127.0.0.1:4179/；保持终端，关闭体验浏览器后服务停止。",
    );
    await ended;
  } catch {
    await close();
    console.error(
      "PREVIEW_START_FAILED：保留原服务与资源，请反馈；未修改NAS或系统权限。",
    );
    process.exitCode = 1;
  }
}
if (
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url
) {
  if (process.argv[2] === "--deliver")
    console.log(JSON.stringify(deliverPreview()));
  else if (process.argv[2] === "--open") await openPreview();
  else throw Error("USE_DELIVER_OR_OPEN");
}
