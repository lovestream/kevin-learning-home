// Real frontend/backend. Authored answer fixtures only; no record imports/stubs.
import fs from "node:fs";
import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";
import { startPreview } from "../../apps/preview/server.ts";
import { loadPractice } from "../../apps/preview/practice/service.ts";
import { loadLibrary } from "../../apps/preview/library/service.ts";
import {
  withdrawnLessons,
  withdrawnTaskIds,
} from "../../packages/math-training/source/shared/withdrawn-checks.mjs";
import { runtimeInputs } from "./inputs.mjs";
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
  origin = nas ? target : "http://127.0.0.1:" + server.address().port;
const browser = await chromium.launch(),
  dir =
    ".evidence/math-onepass/" +
    (nas ? "visual-r2-nas" : "visual-r1-experience");
fs.mkdirSync(dir, { recursive: true });
const articles = JSON.parse(
    fs.readFileSync("apps/preview/reading/articles.json"),
  ),
  keys = JSON.parse(
    fs.readFileSync("apps/preview/reading/private/checkpoints.json"),
  ),
  lib = loadLibrary(process.cwd()),
  results = [],
  errors = [],
  csp = [];
async function openArticle(page, id) {
  await page.goto(origin + "/subjects/math/lessons/" + id);
  await page.getByRole("button", { name: "展开完整教案", exact: true }).click();
  await page.locator('[data-reading-lesson="' + id + '"]').waitFor();
}
async function shot(page, name) {
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: dir + "/" + name + ".png", fullPage: true });
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    name + " overflow",
  );
}
try {
  if (nas) {
    const runtime = await (
      await fetch(origin + "/preview-api/v1/runtime")
    ).json();
    assert.equal(runtime.buildSha, expected);
    assert.equal(runtime.training.cases, 63);
  }
  const context = await browser.newContext({
      viewport: { width: 1280, height: 960 },
      reducedMotion: "reduce",
    }),
    page = await context.newPage();
  page.setDefaultTimeout(12000);
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && m.text().includes("Content Security Policy"))
      csp.push(m.text());
  });
  // Every original full article and checkpoint is rendered and answered.
  for (const article of articles) {
    await openArticle(page, article.lessonId);
    assert.equal(
      await page.locator(".reading-article .reading-block").count(),
      article.blocks.length + 1,
    );
    const key = keys.find((k) => k.lessonId === article.lessonId),
      box = page.locator(".reading-checkpoint");
    await expect(box.locator(".learning-feedback")).toHaveCount(0);
    if (key.type === "choice")
      await box
        .locator("select")
        .selectOption(String(key.options.findIndex((o) => o.correct)));
    else
      await box
        .getByLabel("我的想法", { exact: true })
        .fill("我先画出条件，再核对图与算式的关系。");
    await box.getByRole("button", { name: "写好了，对照参考过程" }).click();
    await expect(box.locator(".learning-feedback")).toBeVisible();
    if (key.type === "self-explanation")
      await expect(box.locator(".learning-feedback")).toContainText(
        "不自动判对错",
      );
    results.push({
      type: "article",
      id: article.lessonId,
      checkpoint: key.type,
      pass: true,
    });
  }
  // Every legacy full article has its distinct model, authored worked example,
  // and one original choice checkpoint rather than a fabricated exercise.
  for (const entry of lib.catalog.entries.filter((e) => e.kind === "legacy")) {
    await page.goto(
      origin + "/subjects/math/library?kind=legacy&id=" + entry.id,
    );
    await page.getByRole("button", { name: "展开完整主题教案" }).click();
    const article = page.locator('[data-legacy-article="' + entry.id + '"]');
    await expect(
      article.locator('[data-semantic-model="' + entry.id + '"]'),
    ).toBeVisible();
    await article
      .getByRole("button", { name: "展开原课例题与参考过程" })
      .click();
    await expect(
      article.locator("#legacy-reading-example .learning-feedback"),
    ).toBeVisible();
    await expect(
      article.locator("#legacy-reading-check [data-task-id]"),
    ).toBeVisible();
    assert.equal(
      await article
        .locator("#legacy-reading-check [data-practice-task]")
        .count(),
      1,
    );
    results.push({ type: "legacy-article", id: entry.id, pass: true });
  }
  // All 28 method guides have conditions/reason/example/counterexample and a
  // real installed course link. Preserve distinction: six source,22 adapted.
  await page.goto(origin + "/subjects/math/library?kind=methods");
  const cards = page.locator("[data-method-card]");
  await expect(cards).toHaveCount(28);
  let source = 0,
    adapted = 0;
  for (let i = 0; i < 28; i++) {
    const card = cards.nth(i);
    await card.locator("summary").click();
    assert.equal(
      await card
        .locator("dt")
        .allTextContents()
        .then((x) => x.join(",")),
      "什么时候能用,为什么成立,例子,反例",
    );
    assert(
      (await card.locator("dd").allTextContents()).every(
        (x) => x.trim().length > 4,
      ),
    );
    const link = card.locator("a").first();
    await expect(link).toBeVisible();
    const response = await context.request.get(
      origin + (await link.getAttribute("href")),
    );
    assert.equal(response.status(), 200);
    const label = await card.locator("summary small").textContent();
    label === "原站完整讲解" ? source++ : adapted++;
  }
  assert.equal(source, 6);
  assert.equal(adapted, 22);
  await page.getByRole("checkbox", { name: "只看已有完整讲解" }).check();
  await expect(cards).toHaveCount(6);
  results.push({ type: "methods", source, adapted, pass: true });
  for (const id of withdrawnLessons) {
    await page.goto(
      origin +
        "/subjects/math/lessons/" +
        id +
        "?practice=core&assessment=withdrawn-v1",
    );
    await page.locator("[data-practice-task]").first().waitFor();
    assert.deepEqual(
      await page
        .locator("[data-practice-task]")
        .evaluateAll((xs) => xs.map((x) => x.dataset.practiceTask)),
      withdrawnTaskIds(id),
    );
    assert.equal(
      await page.locator(".practice-panel .task-diagram").count(),
      0,
    );
    results.push({ type: "withdrawn", id, tasks: 5, pass: true });
  }
  // Same-document navigation keeps only this page's notes/read marks; a full
  // refresh clears them. No account, cookies, storage or invented mastery.
  await openArticle(page, "G3-U01-B01");
  await page
    .getByLabel("我发现……", { exact: true })
    .fill("合成手记：固定盒子，换观察位置。");
  await page.getByRole("button", { name: "记在本页", exact: true }).click();
  await page.getByRole("button", { name: "标记本页已读", exact: true }).click();
  await page
    .locator('.learning-sidebar a[href="/subjects/math/library?kind=review"]')
    .click();
  await expect(page.locator(".page-notebook")).toContainText(
    "合成手记：固定盒子",
  );
  await expect(
    page.locator(".page-notebook .evidence-rates p").first().locator("strong"),
  ).toHaveText("1");
  await page.reload();
  await expect(page.locator(".page-notebook")).not.toContainText(
    "合成手记：固定盒子",
  );
  await expect(
    page.locator(".page-notebook .evidence-rates p").first().locator("strong"),
  ).toHaveText("0");
  // Wrong -> exact original task -> correction retains the first human-readable
  // choice and never equates a corrected answer with independent mastery.
  const bank = loadPractice(process.cwd()),
    lesson = bank.lessons.get("G3-U01-B01");
  const [group, tasks] = Object.entries(lesson.taskSets).find(([, ts]) =>
      ts.some((t) => t.kind === "choice"),
    ),
    task = bank.tasks.get(tasks.find((t) => t.kind === "choice").id).task,
    wrong = task.options.find((o) => o.id !== task.expected),
    right = task.options.find((o) => o.id === task.expected);
  await page.goto(
    origin +
      "/subjects/math/lessons/G3-U01-B01?practice=" +
      group +
      "&task=" +
      task.id,
  );
  async function answerChoice(option) {
    await page.locator('[data-task-id="' + task.id + '"]').waitFor();
    await page
      .locator('input[name="' + task.id + '-value"]')
      .nth(task.options.indexOf(option))
      .check();
    await page
      .getByRole("button", { name: "完成首答，开始自查", exact: true })
      .click();
    await expect(page.locator(".practice-self-check")).toBeVisible();
    await expect(page.locator(".practice-panel input[type=checkbox]")).toHaveCount(3);
    for (const c of await page
      .locator(".practice-panel input[type=checkbox]")
      .all())
      await c.check();
  }
  await answerChoice(wrong);
  await page.getByRole("button", { name: "提交最终答案", exact: true }).click();
  await expect(page.locator("[data-grade-status]")).toHaveAttribute(
    "data-grade-status",
    "incorrect",
  );
  await page
    .locator('.learning-sidebar a[href="/subjects/math/library?kind=review"]')
    .click();
  await expect(page.locator(".notebook-attempt")).toContainText(wrong.text);
  await page.getByRole("link", { name: "回原题核对条件、订正" }).click();
  await expect(page).toHaveURL(new RegExp("task=" + task.id));
  await answerChoice(right);
  await page.getByRole("button", { name: "提交最终答案", exact: true }).click();
  await expect(page.locator("[data-grade-status]")).toHaveAttribute(
    "data-grade-status",
    "correct",
  );
  await page
    .locator('.learning-sidebar a[href="/subjects/math/library?kind=review"]')
    .click();
  await page.getByText("查看本页已订正的题 · 1", { exact: true }).click();
  await expect(page.locator(".page-notebook")).toContainText(wrong.text);
  await expect(page.locator(".page-notebook")).toContainText(right.text);
  await expect(page.locator(".page-notebook")).toContainText(
    "订正后正确不等于独立掌握",
  );
  results.push({
    type: "wrong-exact-task-correction-first-preserved",
    pass: true,
  });
  // Printing renders actual article text and diagram in a standalone PDF.
  await openArticle(page, "G3-U01-B01");
  await page.emulateMedia({ media: "print" });
  await page.pdf({
    path: dir + "/first-lesson-print.pdf",
    format: "A4",
    printBackground: true,
  });
  await page.emulateMedia({ media: "screen" });
  assert(fs.statSync(dir + "/first-lesson-print.pdf").size > 10000);
  results.push({ type: "page-memory-print", pass: true });
  await context.close();
  // Five complete product widths, including modal focus, same-document menu
  // navigation, 70-course map, full article, practice, methods and review.
  for (const width of [1440, 1280, 768, 390, 360]) {
    const c = await browser.newContext({
        viewport: { width, height: 960 },
        reducedMotion: "reduce",
      }),
      p = await c.newPage();
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(origin + "/");
    await p.locator("[data-map-home]").waitFor();
    await shot(p, "home-" + width);
    if (width <= 768) {
      const menu = p.getByRole("button", { name: "学习导航", exact: true });
      await menu.click();
      await expect(p.getByRole("dialog")).toBeVisible();
      await p.keyboard.press("Escape");
      await expect(menu).toBeFocused();
      await menu.click();
      await p
        .getByRole("dialog")
        .getByRole("link", { name: "方法工具箱", exact: false })
        .click();
      await expect(p.getByRole("dialog")).not.toBeVisible();
      await expect(p.locator("[data-method-card]")).toHaveCount(28);
    }
    for (const [name, path, ready] of [
      ["upper", "/subjects/math?term=upper", '[data-term="upper"]'],
      ["lower", "/subjects/math?term=lower", '[data-term="lower"]'],
      [
        "thinking",
        "/subjects/math/library?kind=thinking&id=G3-UP01-TH1",
        "[data-thinking-id]",
      ],
      ["methods", "/subjects/math/library?kind=methods", "[data-method-card]"],
      ["review", "/subjects/math/library?kind=review", ".page-notebook"],
    ]) {
      await p.goto(origin + path);
      if (name === "upper" || name === "lower")
        await p.locator("[data-unit-list]").waitFor();
      else await p.locator(ready).first().waitFor();
      await shot(p, name + "-" + width);
    }
    await openArticle(p, "G3-U01-B01");
    await shot(p, "article-" + width);
    await p.getByRole("button", { name: "直接做本课练习" }).click();
    await p.locator("[data-practice-task]").first().waitFor();
    await shot(p, "practice-" + width);
    assert.deepEqual(await c.cookies(), []);
    const persisted = await p.evaluate(() => ({
      local: localStorage.length,
      session: sessionStorage.length,
    }));
    assert.deepEqual(persisted, { local: 0, session: 0 });
    results.push({ type: "width", width, pass: true });
    await c.close();
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(csp, []);
  fs.writeFileSync(
    dir + "/results.json",
    JSON.stringify(
      {
        status: "PASS",
        nas,
        origin,
        expectedSha: nas ? expected : null,
        files: runtimeInputs(),
        results,
        errors,
        csp,
        physicalDevices: "NEEDS_USER_ACTION",
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    JSON.stringify({
      status: "PASS",
      articles: 70,
      legacy: 54,
      methods: 28,
      withdrawn: 11,
      widths: 5,
      nas,
    }),
  );
} finally {
  await browser.close();
  if (server) {
    server.closeAllConnections();
    await new Promise((r) => server.close(r));
  }
}
