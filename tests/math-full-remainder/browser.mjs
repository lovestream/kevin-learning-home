// Real compiled frontend + content process; no response stubs or personal learning data.
import fs from "node:fs";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chromium, expect } from "@playwright/test";
import { startPreview } from "../../apps/preview/server.ts";
import { loadLibrary } from "../../apps/preview/library/service.ts";
import { loadPractice } from "../../apps/preview/practice/service.ts";
import { checksDefault } from "../../apps/preview/practice/contract.ts";
import { firstAnswer } from "../math-full-02/helpers.mjs";
import { detectiveSubmission } from "./helpers.mjs";
const nas = process.argv.includes("--nas"),
  target = process.env.KLH_PREVIEW_TEST_ORIGIN,
  expected = process.env.KLH_PREVIEW_EXPECT_SHA;
if (
  nas &&
  (target !== "http://192.168.2.100:38444" ||
    !/^[a-f0-9]{40}$/.test(expected ?? ""))
)
  throw Error("EXPLICIT_NAS_HTTP_AND_SHA_REQUIRED");
if (!nas && target) throw Error("NAS_MODE_REQUIRED");
const lib = loadLibrary(process.cwd()),
  primary = loadPractice(process.cwd()),
  dir = ".evidence/math-full-remainder/" + (nas ? "nas" : "local");
fs.mkdirSync(dir, { recursive: true });
const server = nas ? null : await startPreview({ enabled: true, port: 0 }),
  origin = nas ? target : "http://127.0.0.1:" + server.address().port,
  browser = await chromium.launch(),
  errors = [],
  results = [],
  flows = [],
  started = Date.now();
const inputs = [
  "apps/preview/main.tsx",
  "apps/preview/MapNavigation.tsx",
  "apps/preview/server.ts",
  "apps/preview/preview.css",
  "apps/preview/practice/Practice.tsx",
  "apps/preview/practice/service.ts",
  ...execFileSync(
    "git",
    [
      "ls-files",
      "--cached",
      "--others",
      "--exclude-standard",
      "apps/preview/library",
    ],
    { encoding: "utf8" },
  )
    .trim()
    .split("\n")
    .filter(Boolean),
  "tests/math-full-remainder/browser.mjs",
];
const execution = {
  head: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  dirty: !!execFileSync("git", ["status", "--porcelain"], {
    encoding: "utf8",
  }).trim(),
  files: Object.fromEntries(
    [...new Set(inputs)].map((p) => [
      p,
      createHash("sha256").update(fs.readFileSync(p)).digest("hex"),
    ]),
  ),
};
const url = (kind, id, grade) =>
  origin +
  "/subjects/math/library?" +
  new URLSearchParams({
    kind,
    ...(id ? { id } : {}),
    ...(grade ? { grade: String(grade) } : {}),
  });
async function submitPractice(page, t) {
  const panel = page.locator(".practice-panel");
  if (t.kind === "explanation")
    await panel
      .getByRole("textbox", { name: "我的解释" })
      .fill("我先读清条件，再用图和算式说明关系，并和家长核对理由。");
  else if (t.kind === "choice")
    await panel
      .locator("input[type=radio]")
      .nth(t.options.findIndex((o) => o.id === t.expected))
      .check();
  else
    await panel
      .getByRole("textbox", { name: "我的答案", exact: true })
      .fill(t.expected);
  await panel
    .getByRole("button", { name: "完成首答，开始自查", exact: true })
    .click();
  const submit = panel.getByRole("button", {
    name: "提交最终答案",
    exact: true,
  });
  await expect(submit).toBeDisabled();
  for (const text of t.selfCheckItems ?? checksDefault)
    await panel.getByRole("checkbox", { name: text, exact: true }).check();
  await submit.click();
  await expect(panel.locator("[data-grade-status]")).toHaveAttribute(
    "data-grade-status",
    t.kind === "explanation" ? "pendingReview" : "correct",
  );
}
async function modelAction(page) {
  const model = page.locator(".legacy-lab"),
    before = await model.innerHTML(),
    slider = model.locator("input[type=range]");
  let action = "";
  if (await slider.count()) {
    await slider.first().focus();
    await page.keyboard.press("ArrowRight");
    action = "keyboard slider";
  } else {
    for (const b of await model.locator(".tool-button").all()) {
      if ((await b.textContent()).includes("重置") || !(await b.isEnabled()))
        continue;
      await b.click();
      if ((await model.innerHTML()) !== before) {
        action = (await b.textContent()).trim();
        break;
      }
    }
  }
  assert(
    action && (await model.innerHTML()) !== before,
    "MODEL_OPERATION_MUST_CHANGE_DOM",
  );
  return action;
}
async function caseResponse(page, response, answer, prefix) {
  if (response.kind === "ordering") {
    for (const [i, value] of answer.split("|").entries())
      await page
        .getByRole("combobox", {
          name: prefix + "第" + (i + 1) + "位",
          exact: true,
        })
        .selectOption(value);
  } else if (response.kind === "choice")
    await page
      .getByRole("combobox", { name: prefix, exact: true })
      .selectOption(answer);
  else
    await page.getByRole("textbox", { name: prefix, exact: true }).fill(answer);
}
try {
  for (const width of [390, 768, 1280]) {
    const context = await browser.newContext({
        viewport: { width, height: 900 },
        hasTouch: width < 1000,
        reducedMotion: "reduce",
      }),
      page = await context.newPage(),
      writes = [],
      external = [],
      models = new Map(),
      reached = new Set();
    page.on("pageerror", (e) => errors.push({ width, error: String(e) }));
    page.on("request", (r) => {
      if (!["GET", "HEAD"].includes(r.method()))
        writes.push(new URL(r.url()).pathname);
      if (new URL(r.url()).origin !== origin) external.push(r.url());
    });
    await page.addInitScript(() => {
      window.__csp = [];
      document.addEventListener("securitypolicyviolation", (e) =>
        window.__csp.push(e.violatedDirective),
      );
    });
    const runtime = await (
      await context.request.get(origin + "/preview-api/v1/runtime")
    ).json();
    if (nas) assert.equal(runtime.buildSha, expected);
    assert.deepEqual(runtime.library, {
      thinking: 17,
      legacy: 54,
      legacyQuestions: 432,
      detective: 14,
    });
    await page.goto(origin + "/");
    await page.locator("[data-map-home]").waitFor();
    assert.equal(await page.locator("[data-term-link]").count(), 3);
    assert.equal(
      await page
        .getByRole("navigation", { name: "更多数学探索" })
        .getByRole("link")
        .count(),
      5,
    );
    await page.screenshot({
      path: dir + "/home-" + width + ".png",
      fullPage: true,
    });
    await page
      .getByRole("link", { name: "17 张思维卡 →", exact: true })
      .click();
    await page.locator("[data-thinking-link]").first().waitFor();
    assert.equal(await page.locator("[data-thinking-link]").count(), 17);
    for (const entry of lib.catalog.entries.filter(
      (e) => e.kind === "thinking",
    )) {
      await page.goto(url("thinking", entry.id));
      await page.locator('[data-thinking-id="' + entry.id + '"]').waitFor();
      await page.locator(".practice-panel [data-task-id]").waitFor();
      const row = [...lib.practice.tasks.values()].find(
        (x) => x.lessonId === entry.id,
      );
      await submitPractice(page, row.task);
      reached.add(row.task.id);
      if (["G3-U01-TH1", "G3-UP01-TH1", "G3-L07-TH1"].includes(entry.id)) {
        const tool = page.locator(".thinking-tool");
        if (entry.id === "G3-U01-TH1")
          await tool
            .getByRole("combobox", { name: "前左堆高", exact: true })
            .selectOption("2");
        else if (entry.id === "G3-L07-TH1")
          await tool
            .getByRole("button", { name: "把人1放这里", exact: true })
            .first()
            .click();
        else await tool.getByRole("button").first().click();
        await expect(
          tool.getByRole("button", { name: "撤销教具操作" }),
        ).toBeEnabled();
        await tool.getByRole("button", { name: "撤销教具操作" }).click();
        await expect(
          tool.getByRole("button", { name: "撤销教具操作" }),
        ).toBeDisabled();
        await page.screenshot({
          path:
            dir + "/thinking-" + entry.id.toLowerCase() + "-" + width + ".png",
          fullPage: true,
        });
      }
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        "THINKING_OVERFLOW",
      );
      flows.push({
        width,
        type: "thinking",
        id: entry.id,
        status: "pendingReview",
        selfChecks: 3,
      });
    }
    for (const grade of [4, 5, 6]) {
      await page.goto(url("legacy", undefined, grade));
      await page.locator("[data-legacy-link]").first().waitFor();
      assert.equal(await page.locator("[data-legacy-link]").count(), 18);
    }
    for (const entry of lib.catalog.entries.filter(
      (e) => e.kind === "legacy",
    )) {
      await page.goto(url("legacy", entry.id, entry.grade));
      await page.locator('[data-library-id="' + entry.id + '"]').waitFor();
      for (let step = 0; step < 6; step++) {
        await page.locator(".classroom-route button").nth(step).click();
        await expect(page.locator(".classroom-stage h2")).toHaveText(
          [
            "本质结论",
            "生活麻烦",
            "为什么这样发明",
            "动手建模",
            "分层练习",
            "自己复述",
          ][step],
        );
        if (step === 3 && !models.has(entry.lab)) {
          const action = await modelAction(page);
          models.set(entry.lab, { id: entry.id, action });
          if (entry.lab === "table" && entry.labConfig.mode === "place-value") {
            const value = Number(
              await page
                .locator("[data-place-value]")
                .getAttribute("data-place-value"),
            );
            assert.equal(value, 306030);
            await expect(page.locator("[data-place-equation]")).toContainText(
              "306030",
            );
          }
          await page.screenshot({
            path: dir + "/model-" + entry.lab + "-" + width + ".png",
            fullPage: true,
          });
        }
      }
      await page.locator(".classroom-route button").nth(4).click();
      await page.locator(".practice-panel [data-task-id]").waitFor();
      const l = lib.practice.lessons.get(entry.id);
      for (const group of ["warmup", "core", "transfer", "challenge"]) {
        await page.locator('[data-practice-group="' + group + '"]').click();
        const ids = await page
          .locator("[data-practice-task]")
          .evaluateAll((xs) => xs.map((x) => x.dataset.practiceTask));
        assert.deepEqual(
          ids,
          l.taskSets[group].map((t) => t.id),
        );
        ids.forEach((x) => reached.add(x));
      }
      await page.locator('[data-practice-group="warmup"]').click();
      const row = lib.practice.tasks.get(l.taskSets.warmup[0].id);
      await submitPractice(page, row.task);
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        "LEGACY_OVERFLOW",
      );
      flows.push({
        width,
        type: "legacy",
        id: entry.id,
        steps: 6,
        questions: 8,
        status: "correct",
      });
    }
    assert.equal(models.size, 7);
    assert.equal(reached.size, 449);
    await page.goto(url("detective"));
    await page.locator("[data-detective-link]").first().waitFor();
    assert.equal(await page.locator("[data-detective-link]").count(), 14);
    for (const item of lib.catalog.cases) {
      const row = lib.cases.get(item.id),
        a = detectiveSubmission(row).finalAnswer;
      await page.goto(url("detective", item.id));
      await page.locator('[data-detective-id="' + item.id + '"]').waitFor();
      await page
        .getByRole("combobox", { name: "做法判断", exact: true })
        .selectOption(a.verdict);
      if (a.verdict === "wrong")
        await page
          .getByRole("combobox", { name: "首错行", exact: true })
          .selectOption(String(a.errorStep));
      await page
        .getByRole("combobox", { name: "判断依据", exact: true })
        .selectOption(a.reason);
      await caseResponse(page, item.repair, a.repair, "改正答案");
      await caseResponse(page, item.verify, a.verify, "反查答案");
      assert.equal(
        await page.getByText("查看参考过程", { exact: true }).count(),
        0,
      );
      await page
        .getByRole("button", { name: "完成独立调查，开始自查", exact: true })
        .click();
      const submit = page.getByRole("button", {
        name: "核对本次调查",
        exact: true,
      });
      await expect(submit).toBeDisabled();
      for (const c of checksDefault)
        await page.getByRole("checkbox", { name: c, exact: true }).check();
      await submit.click();
      await expect(page.locator("[data-detective-status]")).toHaveAttribute(
        "data-detective-status",
        "correct",
      );
      if (["DET-G3-001", "DET-G3-002"].includes(item.id))
        await page.screenshot({
          path: dir + "/case-" + item.id.toLowerCase() + "-" + width + ".png",
          fullPage: true,
        });
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        "DETECTIVE_OVERFLOW",
      );
      await page
        .getByRole("button", { name: "重做本次调查", exact: true })
        .click();
      await expect(
        page.getByRole("button", {
          name: "完成独立调查，开始自查",
          exact: true,
        }),
      ).toBeDisabled();
      flows.push({
        width,
        type: "detective",
        id: item.id,
        status: "correct",
        selfChecks: 3,
        reset: true,
      });
    }
    await page.goto(url("methods"));
    await page.locator("[data-method-card]").first().waitFor();
    assert.equal(await page.locator("[data-method-card]").count(), 28);
    assert.equal(
      await page
        .locator("[data-method-card]")
        .filter({ hasText: "完整讲解" })
        .count(),
      6,
    );
    await page
      .getByRole("textbox", { name: "查找数学方法" })
      .fill("不存在的方法XYZ");
    assert.equal(await page.locator("[data-method-card]").count(), 0);
    await page.getByRole("textbox", { name: "查找数学方法" }).fill("");
    await page
      .getByRole("checkbox", { name: "只看已有完整讲解", exact: true })
      .check();
    assert.equal(await page.locator("[data-method-card]").count(), 6);
    await page.locator("[data-method-card] summary").first().click();
    await page.screenshot({
      path: dir + "/methods-" + width + ".png",
      fullPage: true,
    });
    await page.goto(url("review"));
    await page.locator(".library-review-unit").first().waitFor();
    assert.equal(await page.locator("[data-review-link]").count(), 70);
    assert.equal(await page.locator("[data-inverse-link]").count(), 11);
    for (let i = 0; i < lib.catalog.inverse.length; i++) {
      await page.goto(url("review"));
      await page.locator("[data-inverse-link]").first().waitFor();
      await page.locator("[data-inverse-link]").nth(i).click();
      await page.locator(".practice-panel [data-task-id]").waitFor();
      await expect(page.locator("[data-task-id]")).toHaveAttribute(
        "data-task-id",
        lib.catalog.inverse[i].taskId,
      );
      await expect(
        page
          .locator(
            '[data-practice-group="' + lib.catalog.inverse[i].group + '"]',
          )
          .first(),
      ).toHaveAttribute("aria-pressed", "true");
    }
    await page.goto(url("review"));
    await page
      .locator("[data-review-link]")
      .first()
      .waitFor({ state: "attached" });
    await page
      .locator(".library-review-unit")
      .filter({ has: page.locator("[data-review-link]") })
      .first()
      .locator("summary")
      .click();
    const next = page.locator("[data-review-link]").first();
    await next.click();
    await page.locator(".practice-panel [data-task-id]").waitFor();
    await expect(
      page.locator('[data-practice-group="review"]'),
    ).toHaveAttribute("aria-pressed", "true");
    assert.equal(
      [...primary.lessons.values()].reduce(
        (n, l) => n + l.taskSets.review.length,
        0,
      ),
      244,
    );
    await page.reload();
    await page.locator(".practice-panel [data-task-id]").waitFor();
    assert.equal(await page.locator("[data-grade-status]").count(), 0);
    const persistent = await page.evaluate(async () => ({
      local: localStorage.length,
      session: sessionStorage.length,
      idb: await indexedDB.databases(),
      cache: typeof caches === "undefined" ? [] : await caches.keys(),
      sw:
        "serviceWorker" in navigator
          ? await navigator.serviceWorker
              .getRegistrations()
              .then((x) => x.length)
          : 0,
      csp: window.__csp,
    }));
    assert.deepEqual(persistent, {
      local: 0,
      session: 0,
      idb: [],
      cache: [],
      sw: 0,
      csp: [],
    });
    assert.deepEqual(await context.cookies(), []);
    assert.deepEqual(external, []);
    assert(
      writes.every((x) =>
        [
          "/preview-api/v1/library/grade",
          "/preview-api/v1/detective/grade",
        ].includes(x),
      ),
    );
    results.push({
      width,
      thinking: 17,
      legacy: 54,
      legacyQuestions: 432,
      libraryTasks: 449,
      detective: 14,
      methodEntries: 28,
      methodGuides: 6,
      reviewCourses: 70,
      reviewTasks: 244,
      models: Object.fromEntries(models),
      persistentEntries: 0,
      pass: true,
    });
    await context.close();
  }
  assert.deepEqual(errors, []);
  fs.writeFileSync(
    dir + "/browser.json",
    JSON.stringify(
      {
        status: "PASS",
        origin,
        nas,
        execution,
        elapsedMs: Date.now() - started,
        results,
        flows,
        errors,
        physicalIPhoneIPad: "NEEDS_USER_ACTION",
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    JSON.stringify({
      status: "PASS",
      nas,
      viewports: 3,
      completeFlows: flows.length,
      entriesPerViewport: 85,
      elapsedMs: Date.now() - started,
    }),
  );
} finally {
  await browser.close();
  if (server) {
    server.closeAllConnections();
    await new Promise((r) => server.close(r));
  }
}
