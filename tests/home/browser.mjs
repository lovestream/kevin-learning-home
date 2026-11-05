import fs from "node:fs";
import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";
import { startPreview } from "../../apps/preview/server.ts";
const nas = process.argv.includes("--nas"),
  target = process.env.KLH_PREVIEW_TEST_ORIGIN,
  sha = process.env.KLH_PREVIEW_EXPECT_SHA;
if (
  nas &&
  (target !== "http://192.168.2.100:38444" || !/^[a-f0-9]{40}$/.test(sha ?? ""))
)
  throw Error("EXACT_NAS_ORIGIN_AND_SHA_REQUIRED");
if (!nas && target) throw Error("EXPLICIT_NAS_MODE_REQUIRED");
const server = nas ? null : await startPreview({ enabled: true, port: 0 }),
  origin = nas ? target : "http://127.0.0.1:" + server.address().port,
  out = ".evidence/home/" + (nas ? "nas" : "local");
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch(),
  rows = [],
  errors = [];
try {
  for (const width of [360, 390, 768, 1280, 1440]) {
    const context = await browser.newContext({
        viewport: { width, height: 960 },
        hasTouch: width <= 768,
        reducedMotion: "reduce",
      }),
      page = await context.newPage(),
      writes = [],
      external = [];
    page.setDefaultTimeout(12000);
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("request", (r) => {
      if (!["GET", "HEAD"].includes(r.method())) writes.push(r.url());
      if (new URL(r.url()).origin !== origin) external.push(r.url());
    });
    await page.addInitScript(() => {
      window.__homeCsp = [];
      addEventListener("securitypolicyviolation", (e) =>
        window.__homeCsp.push(e.violatedDirective),
      );
    });
    const fit = async () =>
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        "HOME_HORIZONTAL_OVERFLOW_" + width,
      );
    await page.goto(origin);
    await expect(page.locator("[data-home-page]")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /今天，想发现\s*一点什么？/ }),
    ).toBeVisible();
    assert.equal(await page.locator(".topbar .preview-subjects").count(), 0);
    assert.equal(await page.locator("[data-lesson-link]").count(), 0);
    assert.equal(await page.locator('input[type="password"]').count(), 0);
    await fit();
    await page.screenshot({ path: out + `/home-${width}.png`, fullPage: true });
    const controls = page.getByRole("group", { name: "换个方向看纸盒" });
    await page
      .locator(".desk-controls")
      .getByRole("button", { name: "右面", exact: true })
      .click();
    await expect(
      page
        .locator(".desk-controls")
        .getByRole("button", { name: "右面", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("link", { name: "选一个学习空间" }).click();
    await expect(page.locator("#learning-spaces")).toBeInViewport();
    const menu = page.getByRole("button", { name: "学习导航", exact: true });
    await menu.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(menu).toBeFocused();
    await page
      .getByRole("searchbox", { name: "在家园找一找" })
      .fill("时刻与时长");
    await expect(
      page.getByRole("region", { name: "家园搜索结果" }),
    ).toContainText("三年级下册");
    assert.equal(new URL(page.url()).search, "");
    await page
      .locator(".home-results a[href^='/subjects/math/lessons/']")
      .first()
      .click();
    await expect(page.locator("[data-lesson-id]")).toBeVisible();
    await page.goBack();
    await expect(page.locator("[data-home-page]")).toBeVisible();
    await page.getByRole("searchbox", { name: "在家园找一找" }).fill("english");
    await expect(page.locator(".pending-result")).toContainText("准备中");
    assert.equal(await page.locator(".pending-result a").count(), 0);
    await page
      .getByRole("searchbox", { name: "在家园找一找" })
      .fill("不存在的合成课程");
    await expect(page.getByRole("status")).toContainText("还没找到");
    await page
      .getByRole("button", { name: "回到学习空间", exact: true })
      .click();
    await page.locator('[data-term-link="upper"]').click();
    await expect(page.locator("[data-unit]")).toHaveCount(9);
    await page.locator('[data-unit="G3-U01"] summary').click();
    await page
      .locator('[data-unit="G3-U01"]')
      .getByRole("link", { name: /进入.*知识点/ })
      .click();
    await page.locator('[data-lesson-link="G3-U01-B01"]').click();
    await expect(page.locator('[data-lesson-id="G3-U01-B01"]')).toBeVisible();
    await page.locator("[data-return-unit]").click();
    await expect(page).toHaveURL(/term=upper&unit=G3-U01/);
    await fit();
    await menu.click();
    await page
      .getByRole("dialog")
      .getByRole("link", { name: "返回家园首页", exact: true })
      .click();
    await expect(page.locator("[data-home-page]")).toBeVisible();
    assert.equal(await page.locator("dialog[open]").count(), 0);
    await page.getByRole("link", { name: "打开探索本", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "今天，你好奇什么？" }),
    ).toBeVisible();
    await fit();
    await page.goto(origin);
    await page.locator(".home-example-slip").click();
    await expect(
      page.getByRole("heading", {
        name: "为什么月亮看起来会变形？",
        exact: true,
      }),
    ).toBeVisible();
    await page.goBack();
    await expect(page.locator("[data-home-page]")).toBeVisible();
    await page.reload();
    await expect(page.locator("[data-home-page]")).toBeVisible();
    assert.deepEqual(await page.evaluate(() => window.__homeCsp), []);
    assert.equal(
      await page.evaluate(() => localStorage.length + sessionStorage.length),
      0,
    );
    assert.deepEqual(writes, []);
    assert.deepEqual(external, []);
    const runtime = await (
      await context.request.get(origin + "/preview-api/v1/runtime")
    ).json();
    if (nas) assert.equal(runtime.buildSha, sha);
    rows.push({
      width,
      status: "PASS",
      hierarchy: true,
      realSearch: true,
      disabledSpaces: true,
      menuFocus: true,
      exactLessonReturn: true,
      topCourseTabs: 0,
      writes: 0,
      externalRequests: 0,
      buildSha: runtime.buildSha,
    });
    await context.close();
  }
  assert.deepEqual(errors, []);
  fs.writeFileSync(
    out + "/result.json",
    JSON.stringify(
      { status: "PASS_HOME_FIVE_WIDTHS", rows, physicalDevices: "NOT_RUN" },
      null,
      2,
    ) + "\n",
  );
  console.log(
    "PASS home: five widths, real course search, hierarchy, exact return, global drawer, keyboard and zero writes",
  );
} finally {
  await browser.close();
  await new Promise((r) => (server ? server.close(r) : r()));
}
