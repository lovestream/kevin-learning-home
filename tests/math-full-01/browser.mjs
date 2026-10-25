// Real content-only HTTP + production preview build. No auth mock or intercepted response.
import fs from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chromium, expect } from "@playwright/test";
import { startPreview } from "../../apps/preview/server.ts";
import { loadContent } from "../../apps/preview/content.ts";
import { exercise } from "./exercise.mjs";
const checkpoint = process.argv.includes("--checkpoint"),
  root = resolve("."),
  { catalog, lessons } = loadContent(root);
const representativeIds = [
  "G3-U01-B01",
  "G3-U01-B02",
  "G3-U01-B03",
  "G3-U02-B01",
  "G3-U03-B01",
  "G3-UP01-B01",
  "G3-UP01-B02",
  "G3-U04-B01",
  "G3-U06-B01",
  "geometry.area.perimeter",
  "G3-LP01-B02",
  "G3-U05-B01",
  "G3-L05-B01",
  "G3-L06-B01",
  "G3-L07-B01",
];
// Include all ten widget kinds, sixteen concept families and spatial/mass modes.
const representatives = new Map();
for (const entry of catalog.lessons) {
  const scene = lessons.get(entry.lessonId).data.conceptScenes[0];
  const key = scene ? scene.family + (scene.handsOnSpec ? ':' + scene.handsOnSpec.mode : '') : entry.widget;
  const previous = representatives.get(key);
  if (!previous || (previous.interactionStatus === 'static-visual' && entry.interactionStatus === 'verified')) representatives.set(key, entry);
}
const checkpointIds = new Set([...representativeIds, ...[...representatives.values()].map(x=>x.lessonId)]);
const selected = checkpoint ? catalog.lessons.filter(l=>checkpointIds.has(l.lessonId)) : catalog.lessons;
const output = ".evidence/math-full-01";
fs.mkdirSync(output, { recursive: true });
const server = await startPreview({ port: 0, enabled: true }),
  port = server.address().port,
  origin = "http://127.0.0.1:" + port;
const browser = await chromium.launch({ headless: true }),
  results = [],
  errors = [];
const started = Date.now();
const execution = {
  head: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  dirty: !!execFileSync("git", ["status", "--porcelain"], {
    encoding: "utf8",
  }).trim(),
  files: Object.fromEntries(
    [
      "tests/math-full-01/browser.mjs",
      "tests/math-full-01/exercise.mjs",
      "apps/preview/main.tsx",
      "apps/preview/contract.ts",
      "apps/preview/content.ts",
      "apps/preview/server.ts",
      "apps/preview/registry.tsx",
      "apps/preview/registry-meta.ts",
      "apps/preview/preview.css",
    ].map((name) => [
      name,
      createHash("sha256").update(fs.readFileSync(name)).digest("hex"),
    ]),
  ),
};
try {
  for (const width of checkpoint ? [1280] : [390, 768, 1280]) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      hasTouch: width < 1000,
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    let csp = [],
      pageErrors = [],
      external = [],
      writes = [];
    page.on("pageerror", (e) => pageErrors.push(e.message));
    page.on("request", (r) => {
      if (new URL(r.url()).origin !== origin) external.push(r.url());
      if (!["GET", "HEAD"].includes(r.method())) writes.push(r.url());
    });
    await page.addInitScript(() => {
      window.__csp = [];
      window.__pointer = [];
      addEventListener("securitypolicyviolation", (e) =>
        window.__csp.push(e.violatedDirective),
      );
      addEventListener("pointermove", (e) => {
        if (e.target.closest?.(".solid-viewport"))
          window.__pointer.push({ type: e.pointerType, trusted: e.isTrusted });
      });
    });
    await page.goto(origin);
    await expect(page.locator("[data-lesson-link]")).toHaveCount(70);
    for (const entry of selected) {
      const begin = Date.now();
      try {
        const response = await page.goto(
          origin + "/lesson/" + encodeURIComponent(entry.lessonId),
        );
        assert.equal(response.status(), 200);
        const article = page.locator("[data-lesson-id]");
        await expect(article).toHaveAttribute("data-lesson-id", entry.lessonId);
        await expect(article.locator(".classroom-route button")).toHaveCount(6);
        await expect(article.locator(".math-step-count")).toHaveText("1 / 6");
        assert(
          (await article
            .locator(
              ".classroom-stage [data-intro-visual], .classroom-stage svg, .classroom-stage .teaching-figure, .classroom-stage .ribbon-strip, .classroom-stage .foundation-picture",
            )
            .count()) > 0,
          "STORY_VISUAL_MISSING",
        );
        await article.locator(".classroom-route button").nth(1).click();
        await expect(article.locator(".math-step-count")).toHaveText("2 / 6");
        assert(
          (await article
            .locator(
              ".classroom-stage [data-intro-visual], .classroom-stage svg, .classroom-stage .teaching-figure, .classroom-stage .ribbon-strip, .classroom-stage .foundation-picture",
            )
            .count()) > 0,
          "PREDICTION_VISUAL_MISSING",
        );
        const prediction = article.locator(".prediction-cards button").first();
        if (width < 1000) await prediction.tap();
        else await prediction.click();
        await expect(prediction).toHaveAttribute("aria-pressed", "true");
        await article.locator(".classroom-route button").nth(2).click();
        await expect(article.locator(".math-step-count")).toHaveText("3 / 6");
        const lab = article.locator("[data-adapter]");
        await expect(lab).toHaveAttribute("data-adapter", entry.renderer);
        await expect(
          lab.getByText("正在摆好本课教具…", { exact: true }),
        ).toHaveCount(0);
        assert(
          (await lab
            .locator(
              "svg, .core-place-columns, .core-nested-boxes, .core-fraction-whole, .core-relation-table, .ribbon-strip, .three-snacks, .candy-comparison, .lunchboxes, .apple-baskets, .sticker-row, .textbook-record-tray, .interactive-calendar, .outfit-trays, .textbook-code, .decimal-places",
            )
            .count()) > 0,
          "MODEL_VISUAL_MISSING",
        );
        const staticOnly = entry.interactionStatus === "static-visual";
        let operation = "STATIC_PAPER_GUIDANCE";
        if (!staticOnly) {
          operation = await exercise(
            lab,
            article,
            lessons.get(entry.lessonId).data,
          );
          assert(
            Number(await article.getAttribute("data-state-revision")) > 0,
            "INTERACTIVE_MODEL_DID_NOT_CHANGE_STATE",
          );
        } else
          await expect(article.locator(".preview-static-note")).toBeVisible();
        let pointer = null;
        if (entry.lessonId === "G3-U01-B01") {
          const svg = lab.locator(".solid-viewport");
          await svg.scrollIntoViewIfNeeded();
          await svg.focus();
          const beforeKeyboard = Number(
            await article.getAttribute("data-state-revision"),
          );
          await svg.press("ArrowRight");
          await expect
            .poll(async () =>
              Number(await article.getAttribute("data-state-revision")),
            )
            .toBeGreaterThan(beforeKeyboard);
          await expect(svg).toBeFocused();
          const box = await svg.boundingBox(),
            x = box.x + box.width * 0.45,
            y = box.y + box.height * 0.45,
            beforeDrag = Number(
              await article.getAttribute("data-state-revision"),
            );
          if (width < 1000) {
            const input = await context.newCDPSession(page);
            await input.send("Input.dispatchTouchEvent", {
              type: "touchStart",
              touchPoints: [{ x, y, id: 1 }],
            });
            await input.send("Input.dispatchTouchEvent", {
              type: "touchMove",
              touchPoints: [{ x: x + 35, y: y + 12, id: 1 }],
            });
            await input.send("Input.dispatchTouchEvent", {
              type: "touchEnd",
              touchPoints: [],
            });
            await input.detach();
          } else {
            await page.mouse.move(x, y);
            await page.mouse.down();
            await page.mouse.move(x + 35, y + 12, { steps: 4 });
            await page.mouse.up();
          }
          await expect
            .poll(async () =>
              Number(await article.getAttribute("data-state-revision")),
            )
            .toBeGreaterThan(beforeDrag);
          pointer = await page.evaluate(() => window.__pointer);
          assert(
            pointer.some(
              (p) => p.trusted && p.type === (width < 1000 ? "touch" : "mouse"),
            ),
            "REAL_POINTER_EVENT_NOT_OBSERVED",
          );
        }
        const overflow = await page.evaluate(() => ({
          scroll: document.documentElement.scrollWidth,
          client: document.documentElement.clientWidth,
        }));
        assert(
          overflow.scroll <= overflow.client + 2,
          JSON.stringify(overflow),
        );
        for (let s = 3; s < 6; s++) {
          await article.locator(".classroom-route button").nth(s).click();
          await expect(article.locator(".math-step-count")).toHaveText(
            s + 1 + " / 6",
          );
        }
        if (representativeIds.includes(entry.lessonId)) {
          await article.locator(".classroom-route button").nth(2).click();
          await page.screenshot({
            path: output + "/" + entry.lessonId + "-" + width + ".png",
            fullPage: true,
          });
        }
        csp.push(...(await page.evaluate(() => window.__csp)));
        assert.equal(
          await page.evaluate(
            () => localStorage.length + sessionStorage.length,
          ),
          0,
        );
        assert.deepEqual(await page.evaluate(() => indexedDB.databases()), []);
        assert.deepEqual(await page.evaluate(() => caches.keys()), []);
        assert.deepEqual(
          await page.evaluate(() =>
            navigator.serviceWorker
              .getRegistrations()
              .then((x) => x.map((y) => y.scope)),
          ),
          [],
        );
        assert.equal((await context.cookies()).length, 0);
        await page.reload();
        await expect(article).toHaveAttribute("data-state-revision", "0");
        await expect(article.locator(".math-step-count")).toHaveText("1 / 6");
        await article.locator(".classroom-route button").nth(1).click();
        await expect(
          article.locator(".prediction-cards [aria-pressed=true]"),
        ).toHaveCount(0);
        csp.push(...(await page.evaluate(() => window.__csp)));
        results.push({
          lessonId: entry.lessonId,
          renderer: entry.renderer,
          width,
          sixSteps: true,
          storyVisual: true,
          predictionVisual: true,
          operation,
          interactive: !staticOnly,
          predictionTouchTap: width < 1000,
          trustedPointerTrace: pointer,
          refreshClearsState: true,
          noBrowserPersistence: true,
          elapsedMs: Date.now() - begin,
          pass: true,
        });
      } catch (e) {
        const failure = {
          lessonId: entry.lessonId,
          width,
          error: String(e).slice(0, 1800),
        };
        errors.push(failure);
        await page
          .screenshot({
            path: output + "/failure-" + entry.lessonId + "-" + width + ".png",
            fullPage: true,
          })
          .catch(() => {});
        throw e;
      }
    }
    assert.deepEqual(pageErrors, [], "PAGE_EXCEPTIONS");
    assert.deepEqual(csp, [], "CSP_VIOLATIONS");
    assert.deepEqual(external, [], "EXTERNAL_REQUESTS");
    assert.deepEqual(writes, [], "LEARNING_OR_AUTH_WRITES");
    await context.close();
  }
  assert.equal(
    results.length,
    checkpoint ? selected.length : 210,
    "INCOMPLETE_CLASSROOM_MATRIX",
  );
} catch (e) {
  if (!errors.length)
    errors.push({
      stage: "global-browser-safety",
      error: String(e).slice(0, 1800),
    });
  console.error(String(e).slice(0, 2200));
  process.exitCode = 1;
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
  const summary = {
    mode: checkpoint ? "representative-checkpoint" : "all-70-all-viewports",
    filtered: checkpoint,
    execution,
    sourceCommit: catalog.sourceCommit,
    elapsedMs: Date.now() - started,
    results,
    errors,
    status: errors.length || process.exitCode ? "FAIL" : "PASS",
  };
  fs.writeFileSync(
    output + "/" + (checkpoint ? "checkpoint.json" : "browser.json"),
    JSON.stringify(summary, null, 2) + "\n",
  );
  console.log(
    JSON.stringify({
      status: summary.status,
      passed: results.length,
      failed: errors.length,
      elapsedMs: summary.elapsedMs,
    }),
  );
}
