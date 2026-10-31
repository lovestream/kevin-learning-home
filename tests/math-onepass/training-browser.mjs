import { chromium, expect } from "@playwright/test";
import fs from "node:fs";
import assert from "node:assert/strict";
import { startPreview } from "../../apps/preview/server.ts";
const nas = process.argv.includes("--nas"),
  target = process.env.KLH_PREVIEW_TEST_ORIGIN,
  expected = process.env.KLH_PREVIEW_EXPECT_SHA;
if (
  nas &&
  (target !== "http://192.168.2.100:38444" ||
    !/^[a-f0-9]{40}$/.test(expected ?? ""))
)
  throw Error("EXPLICIT_NAS_SHA_REQUIRED");
if (!nas && target) throw Error("NAS_MODE_REQUIRED");
const server = nas ? null : await startPreview({ enabled: true, port: 0 }),
  origin = nas ? target : "http://127.0.0.1:" + server.address().port,
  browser = await chromium.launch();
const dir =
  process.env.KLH_EVIDENCE_DIR ??
  ".evidence/math-onepass/" +
    (nas ? "visual-r2-nas-training" : "visual-r1-training");
fs.mkdirSync(dir, { recursive: true });
const results = [];
try {
  if (nas) {
    const runtime = await (
      await fetch(origin + "/preview-api/v1/runtime")
    ).json();
    assert.equal(runtime.buildSha, expected);
    assert.equal(runtime.training.cases, 63);
  }
  for (const width of [1440, 1280, 768, 390, 360]) {
    const page = await browser.newPage({
        viewport: { width, height: 960 },
        reducedMotion: "reduce",
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript(() => {
      window.__csp = [];
      document.addEventListener("securitypolicyviolation", (e) =>
        window.__csp.push(e.violatedDirective),
      );
    });
    await page.goto(origin + "/subjects/math/detective");
    await expect(
      page.getByRole("heading", { name: "先找依据，再改答案" }),
    ).toBeVisible();
    await expect(page.getByText("正在摆好案卷…")).toHaveCount(0);
    await page.locator(".case-index summary").click();
    await page
      .getByRole("button", { name: "香蕉长度调查", exact: true })
      .click();
    await page.getByRole("button", { name: "有错误", exact: true }).click();
    await expect(page.getByText("首个可证明的问题在哪里？")).toBeVisible();
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({
      path: dir + "/case-" + width + ".png",
      fullPage: true,
    });
    await page.getByRole("button", { name: "04 自己检查" }).click();
    await page.getByLabel("选择题族").selectOption("MASS_AVERAGE");
    await page.getByRole("button", { name: "自主解题", exact: true }).click();
    await page.getByLabel("首次答案").fill("9");
    await page.getByLabel("我是这样想的").fill("先把总质量除以豆子数量。");
    await page.getByRole("button", { name: "封存首答，开始自查" }).click();
    await expect(page.getByText("首次想法已封存")).toBeVisible();
    await expect(page.locator(".math-expression")).toContainText("25");
    await page.getByLabel("自查后的答案").fill("0.5");
    await page.getByLabel("实际使用的检验式").fill("□ × 25");
    await page.getByLabel("亲自算出的反查结果").fill("12.5");
    await page
      .getByLabel("这怎样核对了原题条件")
      .fill("把每颗质量乘以25，回到总质量12.5克。");
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({
      path: dir + "/self-check-" + width + ".png",
      fullPage: true,
    });
    await page.getByRole("button", { name: "封存自查，查看反馈" }).click();
    await expect(
      page.getByText("本次有独立检查证据。", { exact: true }),
    ).toBeVisible();
    await expect(page.locator(".sealed-answer")).toContainText("9");
    // Feedback can render before its following stats request completes. Verify
    // settled real backend rates before capturing the final evidence image.
    await expect(page.locator(".training-room")).toHaveAttribute(
      "aria-busy",
      "false",
    );
    await expect(page.locator(".evidence-rates strong")).toHaveText([
      "0 / 1",
      "1 / 1",
      "1 / 1",
      "尚无样本",
    ]);
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({
      path: dir + "/feedback-" + width + ".png",
      fullPage: true,
    });
    const leak = await page.evaluate(() => ({
      local: Object.keys(localStorage),
      session: Object.keys(sessionStorage),
      cookies: document.cookie,
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
      csp: window.__csp,
    }));
    assert.deepEqual(leak, {
      local: [],
      session: [],
      cookies: "",
      overflow: false,
      csp: [],
    });
    assert.deepEqual(errors, []);
    await page.reload();
    await expect(page.getByText("正在摆好案卷…")).toHaveCount(0);
    await page.getByRole("button", { name: "04 自己检查" }).click();
    await expect(page.locator(".self-desk")).toHaveCount(0);
    await expect(page.locator(".evidence-rates")).toContainText("尚无样本");
    results.push({
      width,
      firstImmutable: true,
      reverseEvidence: true,
      settledRatesVerified: true,
      refreshCleared: true,
      noBrowserPersistence: true,
    });
    await page.close();
  }
} finally {
  await browser.close();
  if (server) {
    server.closeAllConnections();
    await new Promise((r) => server.close(r));
  }
}
fs.writeFileSync(
  dir + "/results.json",
  JSON.stringify(
    {
      status: "PASS",
      nas,
      origin,
      expectedSha: nas ? expected : null,
      results,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  JSON.stringify({
    browserTraining: results.length,
    widths: results.map((x) => x.width),
    status: "PASS",
  }),
);
