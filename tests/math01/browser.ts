// Actual compiled React -> HTTP -> production AuthService/SQLite. No identity mocks.
// No HAR, trace, cookies, credentials or private database files in evidence.
import { chromium, expect, type Page, type Locator } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { uiFixture, noOverflow } from "../shell/ui-fixture.ts";
import { LEGACY_TABLES } from "../../packages/platform/store.ts";
import { MATH_PAGE } from "../../packages/contracts/math-readonly.ts";
const publicLesson = JSON.parse(
  readFileSync("packages/subjects/math/public-lesson.json", "utf8"),
).lesson;
const browser = await chromium.launch({ headless: true });
const cases: unknown[] = [],
  shots: string[] = [];
const observations: Record<string, unknown> = {};
let failed = 0,
  stage = "";
type Fixture = Awaited<ReturnType<typeof uiFixture>>;
const lesson = (p: Page) => p.locator(".math-lesson");
const next = (p: Page) =>
  p.getByRole("button", { name: "下一步", exact: true });
async function step(name: string, fn: () => Promise<unknown>) {
  stage = name;
  if (process.env.KLH_MATH_DEBUG) console.log(JSON.stringify({ stage }));
  await fn();
}
async function keyTo(p: Page, target: Locator) {
  // Move within the document, avoiding a wrap through browser chrome (a real visibility/blur event).
  const backwards = await target.evaluate(
    (n) =>
      !!(
        document.activeElement &&
        n.compareDocumentPosition(document.activeElement) &
          Node.DOCUMENT_POSITION_FOLLOWING
      ),
  );
  for (let i = 0; i < 60; i++) {
    if (await target.evaluate((n) => n === document.activeElement)) {
      assert(
        await target.evaluate(
          (n) => getComputedStyle(n).outlineStyle !== "none",
        ),
      );
      return;
    }
    await p.keyboard.press(backwards ? "Shift+Tab" : "Tab");
  }
  throw Error("KEYBOARD_TARGET_UNREACHABLE");
}
async function open(f: Fixture, parent = false) {
  if (new URL(f.page.url()).pathname !== MATH_PAGE) {
    if (parent)
      await f.page
        .locator('a[href="' + MATH_PAGE + '"]')
        .first()
        .click();
    else await f.page.goto(f.origin + MATH_PAGE);
  }
  await expect(
    f.page.getByRole("heading", { name: publicLesson.title, exact: true }),
  ).toBeVisible();
}
async function experiment(f: Fixture) {
  await f.page.locator(".classroom-route button").nth(2).click();
  await expect(f.page.locator("[data-model=observe]")).toBeVisible();
  await expect(f.page.locator(".classroom-stage")).toBeFocused();
}
async function shot(f: Fixture, name: string) {
  assert(
    await f.page
      .locator("input[type=password]")
      .evaluateAll((ns) => ns.every((n) => !(n as HTMLInputElement).value)),
  );
  await f.page.screenshot({
    path: ".evidence/math-01/" + name + ".png",
    fullPage: true,
  });
  shots.push(name + ".png");
}
async function run(
  name: string,
  width: number,
  fn: (f: Fixture) => Promise<void>,
  siblings = false,
) {
  if (process.env.KLH_MATH_CASE && !name.includes(process.env.KLH_MATH_CASE))
    return;
  const start = Date.now();
  let f: Fixture | undefined;
  try {
    stage = "fixture";
    f = await uiFixture(
      browser,
      { width, height: width === 768 ? 1024 : 900 },
      siblings,
      true,
    );
    let cumulativeCspViolations = 0;
    await f.context.exposeBinding(
      "mathPolicyViolation",
      () => cumulativeCspViolations++,
    );
    await f.context.addInitScript(() => {
      document.addEventListener("securitypolicyviolation", () => {
        void (
          window as unknown as { mathPolicyViolation: () => Promise<void> }
        ).mathPolicyViolation();
      });
    });
    f.context.setDefaultTimeout(7000);
    const before = f.store.summary();
    await fn(f);
    stage = "verify browser safety";
    if (process.env.KLH_MATH_DEBUG) console.log(JSON.stringify({ stage }));
    const safety = await f.verify(),
      after = f.store.summary();
    assert.equal(cumulativeCspViolations, 0);
    for (const table of LEGACY_TABLES)
      assert.deepEqual(after[table], before[table]);
    assert(safety.posts.every((p) => p.endpoint.startsWith("/api/v1/auth/")));
    stage = "browser storage checks";
    if (process.env.KLH_MATH_DEBUG) console.log(JSON.stringify({ stage }));
    const state = await f.page.evaluate(async () => ({
      databases: (await indexedDB.databases()).length,
      workers: (await navigator.serviceWorker.getRegistrations()).length,
      caches: (await caches.keys()).length,
    }));
    assert.deepEqual(state, { databases: 0, workers: 0, caches: 0 });
    cases.push({
      name,
      status: "PASS",
      width,
      durationMs: Date.now() - start,
      learningTablesUnchanged: true,
      cumulativeCspViolations,
      learningTables: Object.fromEntries(
        LEGACY_TABLES.map((t) => [t, { before: before[t], after: after[t] }]),
      ),
      ...safety,
      ...state,
    });
  } catch (e) {
    failed++;
    let diagnostic = e instanceof Error ? e.message : "UNKNOWN";
    for (const value of [
      f?.password,
      f?.childPassword,
      f?.parentLogin,
      f?.childLogin,
    ])
      if (value) diagnostic = diagnostic.split(value).join("[redacted]");
    diagnostic = diagnostic.replace(/[A-Za-z0-9_-]{32,}/g, "[redacted]");
    if (process.env.KLH_MATH_DEBUG) console.error(diagnostic.slice(0, 600));
    // Assertion stack/expected values could contain live credentials. Only retain fixed stage/code.
    cases.push({
      name,
      status: "FAIL",
      stage,
      error: "MATH_BROWSER_ASSERTION",
      diagnostic: diagnostic.split("\n")[0].slice(0, 180),
    });
    console.error(
      JSON.stringify({ name, stage, error: "MATH_BROWSER_ASSERTION" }),
    );
  } finally {
    if (process.env.KLH_MATH_DEBUG)
      console.log(JSON.stringify({ stage: "fixture cleanup" }));
    await f?.close();
  }
}
mkdirSync(".evidence/math-01", { recursive: true });
try {
  for (const width of [390, 768, 1280])
    await run("child-six-steps-" + width, width, async (f) => {
      const p = f.page;
      await step(
        "anonymous deep link contains no authored content or lazy lesson asset",
        async () => {
          const loaded: string[] = [];
          p.on("request", (r) => loaded.push(new URL(r.url()).pathname));
          await p.goto(f.origin + MATH_PAGE);
          await expect(
            p.getByRole("heading", { name: "请先登录学习家园", exact: true }),
          ).toBeVisible();
          assert(
            !(await p.locator("body").innerText()).includes(publicLesson.title),
          );
          assert(!loaded.some((v) => /Lesson-.*\.(js|css)$/.test(v)));
        },
      );
      await step("real child keyboard login and subject entry", async () => {
        await f.login(false, true);
        await p.locator('a[href="/subjects/math"]').first().click();
        await p
          .getByRole("link", { name: "打开首课只读课堂", exact: true })
          .click();
        await expect(lesson(p)).toBeVisible();
      });
      await step(
        "original story, scoped SVG identifiers, keyboard six-step navigation",
        async () => {
          await expect(
            p.getByText(publicLesson.classroom.story, { exact: true }),
          ).toBeVisible();
          await expect(
            p.getByText(publicLesson.intro.title, { exact: true }),
          ).toBeVisible();
          const ids = await lesson(p)
            .locator("svg [id]")
            .evaluateAll((ns) => ns.map((n) => n.id));
          assert.equal(new Set(ids).size, ids.length);
          assert(ids.length > 3);
          await noOverflow(p);
          await shot(f, "story-" + width);
          await keyTo(p, next(p));
          await p.keyboard.press("Enter");
          await expect(p.locator(".classroom-stage")).toBeFocused();
          await expect(
            p.getByText(publicLesson.predictionIntro.title, { exact: true }),
          ).toBeVisible();
          await expect(p.locator(".photo-shelf")).toHaveCount(0);
          await keyTo(
            p,
            p.getByRole("button", {
              name: publicLesson.classroom.predictionOptions[0],
              exact: true,
            }),
          );
          await p.keyboard.press("Enter");
          await keyTo(p, next(p));
          await p.keyboard.press("Enter");
          await expect(p.locator(".classroom-stage")).toBeFocused();
        },
      );
      await step(
        "keyboard arrows, front right top projections and temporary photos",
        async () => {
          const svg = p.locator(".solid-viewport[tabindex]");
          await keyTo(p, svg);
          await p.keyboard.press("ArrowRight");
          await p.keyboard.press("ArrowUp");
          await expect(p.locator("[data-evidence=direction]")).toHaveText(
            "绕盒子45°，抬高35°",
          );
          for (const view of ["正前方", "右侧", "上方"]) {
            await keyTo(
              p,
              p.getByRole("button", { name: "从" + view + "看", exact: true }),
            );
            await p.keyboard.press("Enter");
            await expect(p.locator("[data-evidence=direction]")).toHaveText(
              "正对" + view,
            );
            await keyTo(
              p,
              p.getByRole("button", { name: "拍下当前方向", exact: true }),
            );
            await p.keyboard.press("Enter");
          }
          await expect(p.locator(".photo-shelf figure")).toHaveCount(3);
          const shapes = await p
            .locator(".projection-row rect")
            .evaluateAll((ns) =>
              ns.map((n) => [
                n.getAttribute("width"),
                n.getAttribute("height"),
              ]),
            );
          assert.deepEqual(shapes, [
            ["96", "60"],
            ["48", "60"],
            ["96", "48"],
          ]);
          await noOverflow(p);
          await shot(f, "experiment-" + width);
        },
      );
      await step(
        "pointer cancellation releases rotation; all five teaching steps and sixth blocked exercise",
        async () => {
          const svg = p.locator(".solid-viewport[tabindex]");
          const b = (await svg.boundingBox())!;
          await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
          await p.mouse.down();
          await p.mouse.move(b.x + b.width / 2 + 10, b.y + b.height / 2);
          await expect(p.locator("[data-evidence=direction]")).toHaveText(
            "绕盒子7°，抬高90°",
          );
          await svg.dispatchEvent("pointercancel", { pointerId: 1 });
          const dir = await p.locator("[data-evidence=direction]").innerText();
          await p.mouse.move(b.x + b.width / 2 + 40, b.y + b.height / 2);
          await p.mouse.up();
          assert.equal(
            await p.locator("[data-evidence=direction]").innerText(),
            dir,
          );
          stage = "keyboard discovery and symbols after pointer cancellation";
          await keyTo(p, next(p));
          await p.keyboard.press("Enter");
          await expect(p.locator(".classroom-stage")).toBeFocused();
          await keyTo(
            p,
            p.getByText("需要时展开：回看开头问题的关系", { exact: true }),
          );
          await p.keyboard.press("Enter");
          for (const text of publicLesson.classroom.discovery)
            await expect(p.getByText(text, { exact: true })).toBeVisible();
          await keyTo(p, next(p));
          await p.keyboard.press("Enter");
          await expect(p.locator(".classroom-stage")).toBeFocused();
          for (const text of publicLesson.classroom.symbols)
            await expect(p.getByText(text, { exact: true })).toBeVisible();
          await keyTo(p, next(p));
          await p.keyboard.press("Enter");
          await expect(p.locator(".classroom-stage")).toBeFocused();
          await expect(
            p.getByRole("heading", { name: "练习尚未接入", exact: true }),
          ).toBeVisible();
          await expect(next(p)).toBeDisabled();
          await noOverflow(p);
          await shot(f, "exercise-closed-" + width);
        },
      );
      await step(
        "refresh resets steps camera photos; real logout closes deep route",
        async () => {
          await p.reload();
          await expect(lesson(p)).toBeVisible();
          await expect(p.locator(".math-step-count")).toHaveText("1 / 6");
          await experiment(f);
          await expect(p.locator(".photo-shelf")).toHaveCount(0);
          await expect(p.locator("[data-evidence=direction]")).toHaveText(
            "绕盒子35°，抬高25°",
          );
          const loggedOut = p.waitForResponse(
            (r) =>
              r.url().endsWith("/api/v1/auth/logout") && r.status() === 200,
          );
          await p.getByRole("button", { name: "退出", exact: true }).click();
          await loggedOut;
          await expect(
            p.getByRole("heading", { name: "请先登录学习家园", exact: true }),
          ).toBeVisible();
          await p.goto(f.origin + MATH_PAGE);
          await expect(lesson(p)).toHaveCount(0);
        },
      );
    });
  await run("parent-two-background-rechecks-focus-stable", 1280, async (f) => {
    const p = f.page;
    let authPolls = 0,
      mathPolls = 0;
    await f.login(true);
    await f.unlock();
    const parentStyle = await p
      .getByRole("button", { name: "锁定家长权限", exact: true })
      .evaluate((n) => {
        const s = getComputedStyle(n);
        return [s.fontFamily, s.fontSize, s.padding, s.borderRadius];
      });
    await p.locator("#learner-choice-0").click();
    await p
      .getByRole("link", { name: "打开首课只读课堂", exact: true })
      .click();
    await expect(lesson(p)).toBeVisible();
    await experiment(f);
    const button = p.getByRole("button", { name: "从右侧看", exact: true });
    await button.focus();
    await p.keyboard.press("Enter");
    const node = await button.elementHandle();
    p.on("response", (r) => {
      if (r.status() !== 200) return;
      if (r.url().endsWith("/auth/session")) authPolls++;
      if (r.url().includes("/subjects/math/lessons/")) mathPolls++;
    });
    await step(
      "12 seconds with at least two real auth and lesson polls",
      async () => {
        const start = Date.now();
        for (let i = 0; i < 12; i++) {
          await p.waitForTimeout(1000);
          await expect(button).toBeFocused();
          await expect(lesson(p)).toBeVisible();
          assert(
            await node!.evaluate(
              (n) => n.isConnected && n === document.activeElement,
            ),
          );
        }
        assert(authPolls >= 2 && mathPolls >= 2);
        observations.parentContinuity = {
          successfulAuthPolls: authPolls,
          successfulLessonPolls: mathPolls,
          wallClockMs: Date.now() - start,
          stableDOMAndFocus: true,
        };
        await p.keyboard.press("Tab");
        await expect(
          p.getByRole("button", { name: "从上方看", exact: true }),
        ).toBeFocused();
        await shot(f, "parent-stable-after-two-polls");
      },
    );
    await p
      .getByRole("link", { name: "家长中心", exact: true })
      .first()
      .click();
    const after = await p
      .getByRole("button", { name: "锁定家长权限", exact: true })
      .evaluate((n) => {
        const s = getComputedStyle(n);
        return [s.fontFamily, s.fontSize, s.padding, s.borderRadius];
      });
    assert.deepEqual(after, parentStyle);
  });
  await run(
    "parent-locked-grant-revoke-and-learner-switch-reset",
    768,
    async (f) => {
      const p = f.page;
      await f.login(true);
      await p.goto(f.origin + MATH_PAGE);
      await expect(
        p.getByRole("heading", { name: "家长权限已锁定", exact: true }),
      ).toBeVisible();
      assert(
        !(await p.locator("body").innerText()).includes(publicLesson.title),
      );
      await f.unlock();
      await p
        .locator(".learner-option")
        .filter({ hasText: "Synthetic learner" })
        .click();
      await open(f, true);
      await experiment(f);
      await p.getByRole("button", { name: "从右侧看", exact: true }).click();
      await p
        .getByRole("button", { name: "拍下当前方向", exact: true })
        .click();
      await p
        .getByRole("link", { name: "家长中心", exact: true })
        .first()
        .click();
      const sibling = p
        .locator(".learner-option")
        .filter({ hasText: "合成学习者乙" });
      await sibling.click();
      await expect(sibling).toHaveAttribute("aria-pressed", "true");
      await p
        .getByRole("link", { name: "打开首课只读课堂", exact: true })
        .click();
      await expect(lesson(p)).toBeVisible();
      await expect(lesson(p)).toHaveAttribute(
        "data-learner-id",
        f.sibling!.learnerId,
      );
      await expect(p.locator(".math-step-count")).toHaveText("1 / 6");
      await experiment(f);
      await expect(p.locator(".photo-shelf")).toHaveCount(0);
      f.auth.revokeGrant(f.parent, f.sibling!.learnerId);
      assert.equal(
        (
          await p.request.get(
            f.origin +
              "/api/v1/learners/" +
              f.sibling!.learnerId +
              "/subjects/math/lessons/G3-U01-B01",
          )
        ).status(),
        403,
      );
      await expect(lesson(p)).toHaveCount(0, { timeout: 8000 });
      assert(
        !(await p.locator("body").innerText()).includes(publicLesson.title),
      );
    },
    true,
  );
  await run(
    "parent-blur-unconfirmed-masks-course-and-lock-clears",
    1280,
    async (f) => {
      const p = f.page;
      await f.login(true);
      await f.unlock();
      await p.locator("#learner-choice-0").click();
      await open(f, true);
      await step(
        "blur hides already loaded private lesson before authority refresh",
        async () => {
          await p.evaluate(() => window.dispatchEvent(new Event("blur")));
          await expect(lesson(p)).toHaveCount(0);
          assert(
            !(await p.locator("body").innerText()).includes(publicLesson.title),
          );
          await p
            .getByRole("button", { name: "重新确认", exact: true })
            .click();
          // Reconfirmation may require selecting the learner again; it must never restore stale course memory.
          await expect(
            p.locator(".math-lesson, #learner-choice-0").first(),
          ).toBeVisible();
          if (!(await lesson(p).count())) {
            await p.locator("#learner-choice-0").click();
          }
          await expect(lesson(p)).toBeVisible();
          await p.locator(".account-menu summary").click();
          await p
            .getByRole("button", { name: "更新会话并锁定权限", exact: true })
            .click();
          await expect(lesson(p)).toHaveCount(0);
          assert(
            !(await p.locator("body").innerText()).includes(publicLesson.title),
          );
        },
      );
    },
  );
  await run(
    "unknown-field-and-public-hash-corruption-never-paint",
    1280,
    async (f) => {
      await f.login(false);
      for (const mode of ["unknown", "hash"]) {
        await f.page.route(
          "**/subjects/math/lessons/G3-U01-B01",
          async (route) => {
            if (!route.request().url().includes("/api/v1/"))
              return route.continue();
            const response = await route.fetch(),
              data = await response.json();
            if (mode === "unknown")
              data.lesson.classroom.expectedExplanation =
                "SYNTHETIC_ANSWER_NEVER_PAINT";
            else data.lesson.title = "SYNTHETIC_ANSWER_NEVER_PAINT";
            await route.fulfill({ response, json: data });
          },
        );
        await f.page.goto(f.origin + MATH_PAGE);
        await expect(
          f.page.getByRole("heading", {
            name: "课堂暂时无法确认",
            exact: true,
          }),
        ).toBeVisible();
        assert(
          !(await f.page.locator("body").innerText()).includes(
            "SYNTHETIC_ANSWER_NEVER_PAINT",
          ),
        );
        await expect(lesson(f.page)).toHaveCount(0);
        await f.page.unrouteAll();
      }
    },
  );
  await run(
    "lesson-network-failure-removes-previous-content",
    390,
    async (f) => {
      await f.login(false);
      await open(f);
      await experiment(f);
      await f.page
        .getByRole("button", { name: "从右侧看", exact: true })
        .click();
      await f.page
        .getByRole("button", { name: "拍下当前方向", exact: true })
        .click();
      await f.page.route("**/api/v1/learners/*/subjects/math/lessons/*", (r) =>
        r.abort("failed"),
      );
      await expect(
        f.page.getByRole("heading", { name: "课堂暂时无法确认", exact: true }),
      ).toBeVisible({ timeout: 9000 });
      await expect(lesson(f.page)).toHaveCount(0);
      assert(
        !(await f.page.locator("body").innerText()).includes(
          publicLesson.title,
        ),
      );
      await f.page.unrouteAll();
      await f.page
        .getByRole("button", { name: "重新读取课堂", exact: true })
        .click();
      await expect(lesson(f.page)).toBeVisible();
      await expect(f.page.locator(".math-step-count")).toHaveText("1 / 6");
      await experiment(f);
      await expect(f.page.locator(".photo-shelf")).toHaveCount(0);
      await expect(f.page.locator("[data-evidence=direction]")).toHaveText(
        "绕盒子35°，抬高25°",
      );
    },
  );
  await run(
    "normal-motion-cancel-on-leaving-and-reduced-motion",
    1280,
    async (f) => {
      const p = f.page;
      await f.login(false);
      await open(f);
      await experiment(f);
      await p.evaluate(() => {
        const original = window.requestAnimationFrame.bind(window),
          cancel = window.cancelAnimationFrame.bind(window);
        const stats = { requested: 0, cancelled: 0 };
        (window as unknown as { motionStats: typeof stats }).motionStats =
          stats;
        window.requestAnimationFrame = (cb) => {
          stats.requested++;
          return original(cb);
        };
        window.cancelAnimationFrame = (id) => {
          stats.cancelled++;
          return cancel(id);
        };
      });
      await p.emulateMedia({ reducedMotion: "no-preference" });
      await p.getByRole("button", { name: "从右侧看", exact: true }).click();
      await p.waitForTimeout(90);
      await p.locator(".classroom-route button").nth(3).click();
      const stats = await p.evaluate(
        () =>
          (
            window as unknown as {
              motionStats: { requested: number; cancelled: number };
            }
          ).motionStats,
      );
      assert(stats.requested > 1 && stats.cancelled > 0);
      observations.motion = {
        ...stats,
        cancelledOnUnmount: true,
        reducedMotionRequestsAdded: 0,
      };
      await experiment(f);
      await p.emulateMedia({ reducedMotion: "reduce" });
      const before = await p.evaluate(
        () =>
          (window as unknown as { motionStats: { requested: number } })
            .motionStats.requested,
      );
      await p.getByRole("button", { name: "从上方看", exact: true }).click();
      await p.waitForTimeout(90);
      assert.equal(
        await p.evaluate(
          () =>
            (window as unknown as { motionStats: { requested: number } })
              .motionStats.requested,
        ),
        before,
      );
    },
  );
} finally {
  await browser.close();
}
const result = {
  status: failed ? "FAIL" : process.env.CI ? "PASS_CI" : "PASS_LOCAL",
  total: cases.length,
  failures: failed,
  filtered: !!process.env.KLH_MATH_CASE,
  executedHeadSha: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  node: process.version,
  worktreeDirty: !!execFileSync(
    "git",
    ["status", "--porcelain", "--untracked-files=no"],
    { encoding: "utf8" },
  ).trim(),
  timestamp: new Date().toISOString(),
  viewports: [390, 768, 1280],
  screenshots: shots,
  cases,
  observations,
};
writeFileSync(
  ".evidence/math-01/browser.json",
  JSON.stringify(result, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    status: result.status,
    total: cases.length,
    failures: failed,
  }),
);
if (failed) process.exitCode = 1;
