// Verify the actual launchd-owned local entry, never an in-process substitute/NAS.
import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium, expect } from "@playwright/test";
import { loadEnglish } from "../../packages/english/content.ts";
import { englishQuizClue } from "../../packages/english/training.ts";
import { ORIGIN } from "../../scripts/local/service.mjs";
const content = loadEnglish(process.cwd());
assert(content, "frozen family content must be installed locally");
const seal = JSON.parse(fs.readFileSync("apps/preview/dist/seal.json", "utf8"));
const catalog = JSON.parse(
  fs.readFileSync("apps/preview/content/catalog.json", "utf8"),
);
const out = ".evidence/local";
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  reducedMotion: "reduce",
});
const page = await context.newPage(),
  errors = [];
page.setDefaultTimeout(15000);
page.on("pageerror", (e) => errors.push(e.message));
await context.tracing.start({ screenshots: true, snapshots: true });
try {
  const runtime = await context.request
    .get(ORIGIN + "/preview-api/v1/runtime")
    .then((r) => r.json());
  assert.equal(runtime.buildSha, seal.buildSha);
  assert.equal(runtime.database, false);
  assert.equal(runtime.lessons, 70);
  assert.equal(runtime.practiceTasks, 849);
  assert.equal(runtime.english.cards, 6631);
  assert.equal(runtime.english.groups, 665);
  assert.equal(runtime.english.media, 1861);
  assert.equal(runtime.storage, "page-memory-only");
  for (const entry of catalog.lessons) {
    assert.equal(
      (
        await context.request.get(
          ORIGIN + "/subjects/math/lessons/" + entry.lessonId,
        )
      ).status(),
      200,
    );
  }
  await page.goto(ORIGIN);
  await expect(page.locator("[data-home-page]")).toBeVisible();
  await page.screenshot({ path: out + "/home-1440.png", fullPage: true });
  await page.goto(ORIGIN + "/subjects/math/lessons/G3-U01-B01");
  const article = page.locator('[data-lesson-id="G3-U01-B01"]');
  await expect(article).toBeVisible();
  await expect(article.locator(".classroom-route button")).toHaveCount(6);
  for (let n = 0; n < 6; n++) {
    await article.locator(".classroom-route button").nth(n).click();
    await expect(article.locator(".classroom-stage")).toBeVisible();
  }
  await article.locator(".classroom-route button").nth(2).click();
  await page.screenshot({ path: out + "/math-1440.png", fullPage: true });
  let flows = 0;
  for (const bank of content.catalog.banks) {
    const g = content.bundle.groups.find((g) => g.bankId === bank.id),
      card = content.card(g.wordIds[0]);
    await page.goto(
      ORIGIN +
        "/subjects/english?" +
        new URLSearchParams({ bank: bank.id, group: g.id, word: card.id }),
    );
    await expect(page.locator("[data-word-card] h2")).toHaveText(card.word);
    if (card.image)
      assert(
        await page.locator("[data-word-card] img").evaluate(async (im) => {
          await im.decode();
          return im.naturalWidth > 0;
        }),
      );
    await page
      .getByRole("button", { name: "直接完整拼写", exact: true })
      .click();
    const quiz = page.locator("[data-english-quiz]");
    await quiz.getByRole("textbox").fill("zzincorrectzz");
    await quiz
      .getByRole("button", { name: "确认这次答案", exact: true })
      .click();
    await expect(quiz).toContainText("首答：zzincorrectzz");
    await quiz.getByRole("textbox").fill(card.word);
    await quiz
      .getByRole("button", { name: "确认这次答案", exact: true })
      .click();
    await expect(quiz).toContainText("这次订正正确");
    flows++;
  }
  await page.screenshot({ path: out + "/english-1440.png", fullPage: true });
  await page.goto(ORIGIN + "/subjects/english?view=sprint");
  await expect(page.getByLabel("冲刺词库")).toBeVisible();
  const batches = await context.request
    .get(ORIGIN + "/preview-api/v1/english/sprint?bank=ket")
    .then((r) => r.json());
  assert(batches.length > 0);
  await page.goto(ORIGIN + "/subjects/english?view=pk");
  const response = page.waitForResponse(
    (r) =>
      r.url().endsWith("/english/training") &&
      r.request().postDataJSON()?.action === "pk-start",
  );
  await page
    .getByRole("button", { name: "开始 45 秒挑战", exact: true })
    .click();
  const q = await (await response).json();
  assert.equal(q.total, 5);
  const candidates = [...content.cards.values()].filter(
    (c) =>
      c.bankId === q.pk.bankId &&
      englishQuizClue(c) === q.clue &&
      c.image === q.image,
  );
  assert(candidates.length > 0);
  const arena = page.getByRole("region", { name: "本局拼写" });
  await arena
    .getByLabel("输入完整英文单词", { exact: true })
    .fill(candidates[0].word);
  const answer = page.waitForResponse(
    (r) =>
      r.url().endsWith("/english/training") &&
      r.request().postDataJSON()?.action === "answer",
  );
  await arena.getByRole("button", { name: "提交拼写", exact: true }).click();
  const answered = await (await answer).json();
  assert.equal(answered.latestEvidence.rewardEligible, false);
  assert.equal(answered.latestEvidence.source, "pk");
  await page.screenshot({ path: out + "/pk-1440.png", fullPage: true });
  assert.deepEqual(
    await page.evaluate(() => [localStorage.length, sessionStorage.length]),
    [0, 0],
  );
  assert.deepEqual(errors, []);
  const result = {
    status: "PASS",
    origin: ORIGIN,
    buildSha: runtime.buildSha,
    mathEntries: 70,
    formalTasks: 849,
    classroomSteps: 6,
    englishCards: 6631,
    englishGroups: 665,
    englishMedia: 1861,
    sourceBankCorrectionFlows: flows,
    sprintLoaded: true,
    pkActualServerAnswer: true,
    realRecordsModified: false,
    realRewardsIssued: 0,
    database: false,
    browserErrors: errors,
    physicalDeviceTested: false,
  };
  fs.writeFileSync(
    out + "/browser.json",
    JSON.stringify(result, null, 2) + "\n",
  );
  console.log(JSON.stringify(result));
} catch (e) {
  await page.screenshot({ path: out + "/failure.png", fullPage: true });
  throw e;
} finally {
  await context.tracing.stop({ path: out + "/trace.zip" });
  await context.close();
  await browser.close();
}
