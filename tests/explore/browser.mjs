// Real preview process + real browser, synthetic inputs only. No API stubs.
import fs from "node:fs";
import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";
import { startPreview } from "../../apps/preview/server.ts";
const nas = process.argv.includes("--nas");
const requested = process.env.KLH_PREVIEW_TEST_ORIGIN;
const sha = process.env.KLH_PREVIEW_EXPECT_SHA;
if (
  nas &&
  (requested !== "http://192.168.2.100:38444" ||
    !/^[a-f0-9]{40}$/.test(sha ?? ""))
)
  throw Error("EXPLICIT_NAS_SHA_REQUIRED");
if (!nas && requested) throw Error("NAS_MODE_REQUIRED");
const server = nas ? null : await startPreview({ enabled: true, port: 0 });
const origin = nas ? requested : "http://127.0.0.1:" + server.address().port;
const dir = ".evidence/explore/" + (nas ? "nas" : "local");
fs.mkdirSync(dir, { recursive: true });
const browser = await chromium.launch(),
  rows = [],
  errors = [];
const runtime = await (await fetch(origin + "/preview-api/v1/runtime")).json();
if (nas) assert.equal(runtime.buildSha, sha);
try {
  // The anonymous process has no writable explore, parent or attachment endpoints.
  for (const path of [
    "/preview-api/v1/explore/projects",
    "/api/explore/projects",
    "/api/parent/reports",
    "/explore/private-id",
    "/api/explore/media",
  ]) {
    for (const method of ["GET", "POST"]) {
      const response = await fetch(origin + path, {
        method,
        headers: {
          origin,
          ...(method === "POST" ? { "content-type": "application/json" } : {}),
        },
        ...(method === "POST"
          ? { body: JSON.stringify({ question: "synthetic" }) }
          : {}),
      });
      assert([404, 405].includes(response.status), method + " " + path);
    }
  }
  for (const width of [360, 390, 768, 1280, 1440]) {
    const context = await browser.newContext({
      viewport: { width, height: 960 },
      reducedMotion: "reduce",
    });
    await context.addInitScript(() => {
      window.__exploreCspViolations = [];
      addEventListener("securitypolicyviolation", (event) =>
        window.__exploreCspViolations.push(event.violatedDirective),
      );
    });
    const page = await context.newPage();
    page.setDefaultTimeout(12000);
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error" && m.text().includes("Content Security Policy"))
        errors.push(m.text());
    });
    const requests = [];
    page.on("request", (r) =>
      requests.push({ url: r.url(), method: r.method(), body: r.postData() }),
    );
    await page.goto(origin + "/explore");
    await expect(
      page.getByRole("heading", { name: "今天，你好奇什么？" }),
    ).toBeVisible();
    for (const path of ["questions", "projects", "creations", "archive"]) {
      await page
        .locator('.explore-nav a[href="/explore/' + path + '"]')
        .click();
      await expect(
        page.locator('[data-explore-page="' + path + '"]'),
      ).toBeVisible();
      await page.screenshot({
        path: dir + "/" + path + "-" + width + ".png",
        fullPage: true,
      });
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
    }
    await page.locator('.explore-nav a[href="/explore"]').click();
    await page.screenshot({
      path: dir + "/home-" + width + ".png",
      fullPage: true,
    });
    const start = requests.length;
    const question = "合成演练：纸桥换一种折法会怎样？";
    await page.getByLabel("我想弄明白的问题", { exact: true }).fill(question);
    await page.getByRole("button", { name: "先留下这个问题" }).click();
    await expect(
      page.getByRole("heading", { name: question, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "给一个方法提示", exact: true }),
    ).toBeDisabled();
    await page
      .getByRole("button", { name: "问我一个问题", exact: true })
      .click();
    await expect(page.locator(".coach-prompt")).toContainText("先猜");
    await page.getByRole("button", { name: "我先自己想", exact: true }).click();
    await expect(page.locator(".coach-prompt")).toHaveCount(0);

    await page
      .getByLabel("我的第一种想法", { exact: true })
      .fill("我猜折成波浪的纸桥更稳。");
    await page.getByRole("button", { name: "留在本页", exact: true }).click();
    await expect(page.locator(".first-thought")).toContainText(
      "我猜折成波浪的纸桥更稳。",
    );
    await page
      .getByRole("button", { name: "给一个方法提示", exact: true })
      .click();
    await expect(page.locator(".coach-prompt")).toContainText("换一个条件");
    await page
      .getByLabel("我的验证计划", { exact: true })
      .fill("还没有提交的计划草稿");
    await page.getByLabel("现在的节奏", { exact: true }).selectOption("paused");
    await expect(page.getByLabel("我的验证计划", { exact: true })).toHaveValue(
      "还没有提交的计划草稿",
    );
    await page
      .getByRole("button", { name: "本周想多想想这个", exact: true })
      .click();
    await expect(page.getByLabel("我的验证计划", { exact: true })).toHaveValue(
      "还没有提交的计划草稿",
    );
    await page.getByRole("button", { name: "观察与证据", exact: true }).click();
    await page.getByRole("button", { name: "我的想法", exact: true }).click();
    await expect(page.getByLabel("我的验证计划", { exact: true })).toHaveValue(
      "还没有提交的计划草稿",
    );
    await page
      .getByRole("button", { name: "撤销未提交文字", exact: true })
      .click();
    await page.getByRole("button", { name: "观察与证据", exact: true }).click();
    await page
      .getByLabel("观察事实或资料原意", { exact: true })
      .fill("合成观察：波浪形纸桥放第一块积木时也弯了。");
    await page
      .getByLabel("我的解释（和事实分开，可不填）", { exact: true })
      .fill("原来的解释可能不够。");
    await page.getByRole("button", { name: "留在本页", exact: true }).click();
    await page.getByRole("button", { name: "新的看法", exact: true }).click();
    await page
      .getByLabel("现在我这样想", { exact: true })
      .fill("可能还与桥的跨度有关，证据还不够。");
    await page
      .getByRole("button", { name: "用证据修改猜想", exact: true })
      .click();
    await expect(page.locator(".first-thought")).toContainText(
      "我猜折成波浪的纸桥更稳。",
    );
    await page
      .getByLabel("现在我这样想", { exact: true })
      .fill("我想下一次只改变跨度。");
    await page
      .getByRole("button", { name: "记下这次反思", exact: true })
      .click();
    await page.getByRole("button", { name: "我的创造", exact: true }).click();
    await page
      .getByLabel("我的作品说明", { exact: true })
      .fill("纸桥第二版的设计文字，尚未实际制作。");
    await page
      .getByLabel("这是想象作品，不是现实观察", { exact: true })
      .check();
    await page.getByRole("button", { name: "留在本页", exact: true }).click();
    await page.getByRole("button", { name: "过程回看", exact: true }).click();
    await expect(page.locator(".explore-history")).toContainText(
      "我猜折成波浪的纸桥更稳。",
    );
    await expect(page.locator(".explore-history")).toContainText(
      "可能还与桥的跨度有关",
    );
    await expect(page.locator(".explore-history")).toContainText(
      "想象作品，不是现实观察证据",
    );
    await page
      .getByLabel("现在的节奏", { exact: true })
      .selectOption("uncertain");
    await page
      .getByRole("button", { name: "本周想多想想这个", exact: true })
      .click();
    await page.screenshot({
      path: dir + "/history-" + width + ".png",
      fullPage: true,
    });
    await page.getByRole("button", { name: "我的想法", exact: true }).click();
    await page.screenshot({
      path: dir + "/workbench-" + width + ".png",
      fullPage: true,
    });
    // An uninterrupted focused editor survives ordinary rerender/hint actions.
    await page
      .getByLabel("我的验证计划", { exact: true })
      .fill("<img src=x onerror=alert(1)> 合成计划");
    await page.getByRole("button", { name: "留在本页", exact: true }).click();
    await page.getByRole("button", { name: "过程回看", exact: true }).click();
    await expect(page.locator(".explore-history")).toContainText(
      "<img src=x onerror=alert(1)>",
    );
    assert.equal(await page.locator(".explore-history img").count(), 0);
    const edits = requests.slice(start);
    assert.equal(
      edits.filter((r) => r.method !== "GET").length,
      0,
      "No explore content POST",
    );
    assert.equal(
      edits.filter(
        (r) =>
          new URL(r.url).origin !== origin ||
          (r.body ?? "").includes(question) ||
          r.url.includes(encodeURIComponent(question)),
      ).length,
      0,
    );
    assert.deepEqual(
      await page.evaluate(() => window.__exploreCspViolations),
      [],
    );
    assert.deepEqual(await context.cookies(), []);
    assert.deepEqual(
      await page.evaluate(() => ({
        local: localStorage.length,
        session: sessionStorage.length,
      })),
      { local: 0, session: 0 },
    );
    assert.deepEqual(
      await page.evaluate(async () => await indexedDB.databases()),
      [],
    );
    assert.equal(
      await page
        .locator('input[type="password"],input[type="file"],audio,video')
        .count(),
      0,
    );
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "这个临时问题已经不在本页了" }),
    ).toBeVisible();
    await page.getByRole("link", { name: "回到问题库", exact: true }).click();
    await expect(page.locator(".question-collection")).not.toContainText(
      question,
    );
    // Verify an authored lesson's actual version and exact return route.
    await page.goto(origin + "/subjects/math/lessons/G3-U01-B01");
    await page.getByRole("link", { name: "从这节课问一个为什么" }).click();
    await expect(page.locator(".linked-lesson")).toContainText(
      "换一个位置，看到的样子为什么变了",
    );
    await page
      .getByLabel("我想弄明白的问题", { exact: true })
      .fill("合成问题：从背面看盒子会怎样？");
    await page.getByRole("button", { name: "先留下这个问题" }).click();
    await expect(page.locator(".explore-references")).toContainText(
      "2026-10-07.2",
    );
    await page.locator(".explore-references a").click();
    await expect(page.locator('[data-lesson-id="G3-U01-B01"]')).toBeVisible();
    // Touch menu and keyboard focus work on the real shared shell.
    if (width <= 900) {
      await page.getByRole("button", { name: "学习导航", exact: true }).click();
      await page.locator('dialog a[href="/explore"]').click();
      await expect(
        page.getByRole("heading", { name: "今天，你好奇什么？" }),
      ).toBeVisible();
      assert.equal(await page.locator("dialog[open]").count(), 0);
      await expect(page.locator("dialog .dialog-subjects")).toContainText(
        "成长家园 · 待接入",
      );
    } else
      await page
        .locator('.learning-sidebar .preview-subjects a[href="/explore"]')
        .click();
    await page.getByLabel("我想弄明白的问题", { exact: true }).focus();
    assert.equal(
      await page
        .getByLabel("我想弄明白的问题", { exact: true })
        .evaluate((el) => el === document.activeElement),
      true,
    );
    await page
      .getByRole("button", { name: "清空本页试用", exact: true })
      .click();
    await page.getByRole("button", { name: "确认清空", exact: true }).click();
    await expect(page.locator("[data-project]")).toHaveCount(5);
    rows.push({
      width,
      pass: true,
      flows: [
        "four-sections",
        "question-first-thought-evidence-revision-creation-history",
        "uncertainty-pause-voluntary-selection",
        "first-thought-immutable",
        "no-content-egress",
        "no-browser-storage",
        "refresh-discards",
        "xss-escaped",
        "lesson-roundtrip",
        "menu-keyboard",
        "reset",
      ],
    });
    await context.close();
  }
  assert.deepEqual(errors, []);
  fs.writeFileSync(
    dir + "/report.json",
    JSON.stringify(
      {
        status: "PASS",
        mode: nas ? "NAS_PREVIEW" : "LOCAL_SYNTHETIC",
        origin,
        buildSha: runtime.buildSha,
        rows,
        errors,
        physicalIPad: "NEEDS_USER_ACTION",
        privatePersistence: "NOT_ENABLED",
        parentLogin: "PLANNED_USER_SET_PASSWORD_ONLY",
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    JSON.stringify({
      status: "PASS",
      widths: rows.length,
      buildSha: runtime.buildSha,
      errors: errors.length,
    }),
  );
} finally {
  await browser.close();
  if (server) await new Promise((resolve) => server.close(resolve));
}
