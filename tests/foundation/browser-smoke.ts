import { chromium } from "@playwright/test";
import { spawn, execFileSync } from "node:child_process";
import { once } from "node:events";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { fixture, port } from "./helpers.ts";
import { Store } from "../../packages/platform/store.ts";
const f = fixture(),
  before = f.store.summary();
f.store.close();
const p = await port(),
  origin = "http://127.0.0.1:" + p;
const child = spawn(process.execPath, ["apps/server/main.ts"], {
  env: {
    ...process.env,
    NODE_ENV: "production",
    KLH_PORT: String(p),
    KLH_DATA_DIR: f.paths.data,
    KLH_MEDIA_DIR: f.paths.media,
    KLH_CONTENT_DIR: f.paths.content,
    KLH_INTERNAL_ORIGIN: origin,
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let browser;
const proof: unknown[] = [];
mkdirSync(".evidence", { recursive: true });
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(origin + "/health/ready")).ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  assert(ready, "production server ready");
  browser = await chromium.launch({ headless: true });
  for (const viewport of [
    { width: 1280, height: 800 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
  ]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage(),
      writes: string[] = [],
      errors: string[] = [];
    page.on("request", (r) => {
      if (!["GET", "HEAD"].includes(r.method())) writes.push(r.method());
    });
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(origin);
    await page
      .getByRole("heading", { name: "下一段学习，从这里开始。" })
      .waitFor();
    await page.getByRole("link", { name: "数学 待迁入" }).click();
    await page.getByRole("heading", { name: "数学待迁入" }).waitFor();
    await page.reload();
    await page.getByText("这里还没有课程，也没有学习记录。").waitFor();
    await page.getByRole("link", { name: "返回家园" }).click();
    await page.getByRole("link", { name: "英语 待迁入" }).click();
    await page.getByRole("heading", { name: "英语待迁入" }).waitFor();
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      true,
    );
    assert.deepEqual(writes, []);
    assert.deepEqual(errors, []);
    assert.equal(await page.evaluate(() => localStorage.length), 0);
    if (viewport.width === 1280) {
      await page.goto(origin);
      await page.screenshot({
        path: ".evidence/foundation-home.png",
        fullPage: true,
      });
    }
    proof.push({
      viewport,
      status: "PASS",
      writeRequests: 0,
      learningRecordsCreated: 0,
      localStorageEntries: 0,
    });
    await context.close();
  }
  const config = await (await fetch(origin + "/api/v1/config")).json();
  assert.equal(config.features.learning, false);
  assert(config.subjects.every((s: { enabled: boolean }) => !s.enabled));
} finally {
  await browser?.close();
  if (child.exitCode === null) {
    const stopped = once(child, "exit");
    child.kill("SIGTERM");
    await stopped;
  }
  const store = new Store(f.paths.data);
  try {
    assert.deepEqual(store.summary(), before);
  } finally {
    store.close();
    f.close();
  }
}
const result = {
  status: process.env.CI ? "PASS_CI" : "PASS_LOCAL",
  executedHeadSha: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  timestamp: new Date().toISOString(),
  scope: "production entry; Chromium viewport only, not physical iPad/Safari",
  viewports: proof,
};
writeFileSync(".evidence/browser.json", JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify(result));
