// Real non-secure HTTP frontend/backend. No permissions, certificates or Chrome
// secure-origin exceptions. Catches accidental randomUUID/subtle dependencies.
import { networkInterfaces } from "node:os";
import { createServer } from "node:net";
import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";
import { startPreview } from "../../apps/preview/server.ts";
import { privateIPv4 } from "../../apps/preview/runtime.ts";
const ip = Object.values(networkInterfaces())
  .flat()
  .find((x) => x && !x.internal && privateIPv4(x.address))?.address;
if (!ip) throw Error("NON_SECURE_PRIVATE_INTERFACE_REQUIRED");
const reservation = createServer();
await new Promise((r) => reservation.listen(0, ip, r));
const port = reservation.address().port;
await new Promise((r) => reservation.close(r));
const origin = "http://" + ip + ":" + port,
  server = await startPreview({
    enabled: true,
    port,
    runtime: "isolated-container",
    bindAddress: ip,
    publicOrigin: origin,
    peers: [ip + "/32"],
  }),
  browser = await chromium.launch({ args: ["--no-proxy-server"] });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(origin + "/subjects/math/detective");
  await expect(page.getByText("正在摆好案卷…")).toHaveCount(0);
  const platform = await page.evaluate(() => ({
    secure: isSecureContext,
    uuid: typeof crypto.randomUUID,
    subtle: typeof crypto.subtle,
    random: typeof crypto.getRandomValues,
  }));
  assert.deepEqual(platform, {
    secure: false,
    uuid: "undefined",
    subtle: "undefined",
    random: "function",
  });
  await page.getByRole("button", { name: "04 自己检查" }).click();
  await page.getByLabel("选择题族").selectOption("EQUAL_GROUPS");
  await page.getByRole("button", { name: "自主解题", exact: true }).click();
  await page.getByLabel("首次答案").fill("16");
  await page.getByLabel("我是这样想的").fill("4袋，每袋4块。");
  await page.getByRole("button", { name: "封存首答，开始自查" }).click();
  await expect(page.getByText("首次想法已封存")).toBeVisible();
  await page.goto(
    origin + "/subjects/math/library?kind=thinking&id=G3-UP01-TH1",
  );
  await expect(page.locator(".thinking-tool")).toBeVisible();
  await page.locator(".thinking-tool button").first().click();
  await expect(
    page.getByRole("button", { name: "撤销教具操作" }),
  ).toBeEnabled();
  assert.deepEqual(errors, []);
  await page.close();
  console.log(
    JSON.stringify({
      nonSecureHttp: true,
      secureContext: false,
      randomUUIDAvailable: false,
      subtleAvailable: false,
      firstSeal: true,
      thinkingTool: true,
      status: "PASS",
    }),
  );
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
