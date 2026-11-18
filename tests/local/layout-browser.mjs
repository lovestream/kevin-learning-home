// Actual local service: right navigation is a non-modal rail; no real records.
import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium, expect } from "@playwright/test";
import { loadEnglish } from "../../packages/english/content.ts";
import { ORIGIN } from "../../scripts/local/service.mjs";
const content = loadEnglish(process.cwd());
assert(content);
const out = ".evidence/layout";
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch(),
  rows = [],
  errors = [];
try {
  for (const width of [1440, 1280, 768, 390]) {
    const context = await browser.newContext({
      viewport: { width, height: 1000 },
      reducedMotion: "reduce",
      hasTouch: width <= 768,
    });
    const page = await context.newPage();
    page.setDefaultTimeout(12000);
    page.on("pageerror", (e) => errors.push(e.message));
    await context.tracing.start({ screenshots: true, snapshots: true });
    try {
      for (const route of ["/", "/subjects/math", "/subjects/english"]) {
        await page.goto(ORIGIN + route);
        if (route.endsWith("english"))
          await expect(page.locator(".english-banks")).toBeVisible();
        const menu = page.getByRole("button", {
          name: "学习导航",
          exact: true,
        });
        const panel = page.getByRole("complementary", { name: "学习导航面板" });
        const before = await page.locator("#main-content").boundingBox();
        await menu.click();
        await expect(panel).toBeVisible();
        await expect(menu).toHaveAttribute("aria-expanded", "true");
        assert.equal(await page.locator("dialog[open], :modal").count(), 0);
        const b = await panel.boundingBox();
        assert(Math.abs(b.x + b.width - width) <= 1);
        assert(b.height >= 990 && b.width <= 360);
        assert.deepEqual(
          await page.locator("#main-content").boundingBox(),
          before,
          "rail must not resize or jump the lesson",
        );
        assert.equal(
          await page.evaluate(
            () => getComputedStyle(document.body).overflow === "hidden",
          ),
          false,
        );
        await page.keyboard.press("Escape");
        await expect(panel).toBeHidden();
        await expect(menu).toBeFocused();
        await menu.click();
        await page.locator("#main-content").click({ position: { x: 5, y: 5 } });
        await expect(panel).toBeHidden();
        await menu.click();
        await page
          .getByRole("button", { name: "关闭学习导航", exact: true })
          .click();
        await expect(menu).toBeFocused();
      }
      if (width >= 1280) {
        for (const card of await page.locator(".english-bank").all())
          await expect(card).toBeInViewport();
        await page.screenshot({
          path: `${out}/english-${width}.png`,
          fullPage: true,
        });
      }
      await page.getByRole("button", { name: "学习导航", exact: true }).click();
      const panel = page.getByRole("complementary", { name: "学习导航面板" });
      await expect(
        panel.getByRole("navigation", { name: "英语词库" }).getByRole("link"),
      ).toHaveCount(4);
      await page.screenshot({ path: `${out}/navigation-${width}.png` });
      await panel
        .getByRole("navigation", { name: "英语词库" })
        .getByRole("link", { name: "KET 词汇", exact: false })
        .click();
      await expect(panel).toBeHidden();
      await expect(page.locator(".english-groups")).toBeVisible();
      const g = content.bundle.groups.find((g) => g.bankId === "core2000"),
        card = content.card(g.wordIds[0]);
      await page.goto(
        ORIGIN +
          "/subjects/english?" +
          new URLSearchParams({ bank: "core2000", group: g.id }),
      );
      await expect(page.locator("[data-word-card] h2")).toHaveText(card.word);
      await page.screenshot({
        path: `${out}/word-${width}.png`,
        fullPage: true,
      });
      await page
        .getByRole("button", { name: "直接完整拼写", exact: true })
        .click();
      const input = page.locator("[data-english-quiz]").getByRole("textbox");
      await input.fill("kevin-draft");
      await page.getByRole("button", { name: "学习导航", exact: true }).click();
      await page.keyboard.press("Escape");
      await expect(input).toHaveValue("kevin-draft");
      await input.focus();
      await expect(input).toBeFocused();
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
      assert.deepEqual(
        await page.evaluate(() => [localStorage.length, sessionStorage.length]),
        [0, 0],
      );
      rows.push({
        width,
        nonModal: true,
        rightAligned: true,
        escapeAndOutsideClose: true,
        focusRestored: true,
        directBankLinks: 4,
        draftPreserved: true,
        overflow: false,
      });
    } catch (e) {
      await page.screenshot({
        path: `${out}/failure-${width}.png`,
        fullPage: true,
      });
      throw e;
    } finally {
      await context.tracing.stop({ path: `${out}/trace-${width}.zip` });
      await context.close();
    }
  }
  assert.deepEqual(errors, []);
  const runtime = await fetch(ORIGIN + "/preview-api/v1/runtime").then((r) =>
    r.json(),
  );
  const result = {
    status: "PASS",
    buildSha: runtime.buildSha,
    rows,
    errors,
    realRecordsModified: false,
  };
  fs.writeFileSync(out + "/report.json", JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
}
