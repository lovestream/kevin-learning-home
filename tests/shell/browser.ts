// Real compiled React -> Node auth/session/SQLite. Faults never grant identity.
// Do not enable tracing/HAR: they would include random credentials and cookies.
import { chromium, expect, type Page } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { uiFixture, noOverflow } from "./ui-fixture.ts";
import { secret } from "../auth/helpers.ts";
import { LEGACY_TABLES } from "../../packages/platform/store.ts";
import { UNLOCK_MS, IDLE_MS } from "../../packages/auth/service.ts";
const browser = await chromium.launch({ headless: true });
const cases: unknown[] = [];
let failed = 0,
  stage = "";
const screenshots: string[] = [];
type Fixture = Awaited<ReturnType<typeof uiFixture>>;
async function step(name: string, action: () => Promise<unknown>) {
  stage = name;
  await action();
}
async function shot(f: Fixture, name: string) {
  await f.shot(name);
  screenshots.push(name + ".png");
}
async function waitHeading(page: Page, name: string) {
  await page
    .getByRole("heading", { name, exact: true })
    .waitFor({ timeout: 7000 });
}
async function retry(page: Page) {
  await page.getByRole("button", { name: "重新确认", exact: true }).click();
}
async function noPrivate(f: Fixture) {
  const text = await f.page.locator("body").innerText();
  assert(
    !text.includes("Synthetic learner") &&
      !text.includes("合成学习者乙") &&
      !text.includes(f.child.learnerId),
  );
}
async function run(
  name: string,
  viewport: { width: number; height: number },
  action: (f: Fixture) => Promise<void>,
  siblings = false,
) {
  if (process.env.KLH_UI_CASE && !name.includes(process.env.KLH_UI_CASE))
    return;
  let f: Fixture | undefined;
  stage = "fixture";
  const started = Date.now();
  try {
    f = await uiFixture(browser, viewport, siblings);
    const before = f.store.summary();
    await action(f);
    const safety = await f.verify(),
      after = f.store.summary();
    for (const table of LEGACY_TABLES)
      assert.deepEqual(after[table], before[table]);
    cases.push({
      name,
      status: "PASS",
      viewport,
      durationMs: Date.now() - started,
      learningTablesUnchanged: true,
      ...safety,
    });
  } catch (e) {
    failed++;
    let diagnostic = e instanceof Error ? e.message.split("\n")[0] : "unknown";
    for (const secret of [
      f?.password,
      f?.childPassword,
      f?.parentLogin,
      f?.childLogin,
    ])
      if (secret) diagnostic = diagnostic.split(secret).join("[redacted]");
    diagnostic = diagnostic
      .replace(/[A-Za-z0-9_-]{32,}/g, "[redacted]")
      .slice(0, 220);
    const code =
      e instanceof Error && /^[A-Z_0-9]+$/.test(e.message)
        ? e.message
        : "UI_ASSERTION_FAILED";
    cases.push({
      name,
      status: "FAIL",
      viewport,
      stage,
      error: code,
      diagnostic,
    });
    console.error(
      JSON.stringify({ name, stage, error: code, diagnostic, status: "FAIL" }),
    );
    // Only a scrubbed diagnostic image, never raw errors, credentials, HAR or traces.
    if (f)
      try {
        await f.page
          .locator("input")
          .evaluateAll((nodes) =>
            nodes.forEach((n) => ((n as HTMLInputElement).value = "")),
          );
        await f.page.screenshot({
          path: ".evidence/02b/failure-" + name + ".png",
          fullPage: true,
        });
      } catch {}
  } finally {
    await f?.close();
  }
}
mkdirSync(".evidence/02b", { recursive: true });
try {
  for (const width of [390, 768, 1280, 1440])
    await run(
      "child-responsive-" + width,
      { width, height: width === 768 ? 1024 : 900 },
      async (f) => {
        await step("welcome and empty login screenshot", async () => {
          await f.page.goto(f.origin);
          await waitHeading(f.page, "下一段学习，从这里开始。");
          await noOverflow(f.page);
          if (width === 1280) await shot(f, "welcome-1280");
          await f.page.goto(f.origin + "/login");
          await f.page
            .getByRole("button", { name: "登录", exact: true })
            .waitFor();
          if (width === 390) await shot(f, "login-390");
        });
        await step("real child keyboard login", () => f.login(false, true));
        await step("home layout and no parent navigation", async () => {
          await noOverflow(f.page);
          assert.equal(
            await f.page
              .getByRole("link", { name: "家长中心", exact: true })
              .count(),
            0,
          );
          await shot(f, "home-" + width);
          assert.equal(await f.page.evaluate(() => document.cookie), "");
        });
        await step("empty routes and subject deep link refresh", async () => {
          for (const [link, title] of [
            ["今日计划", "今日计划"],
            ["复习", "复习"],
            ["成长家园", "给成长留一点空间"],
            ["科目", "科目"],
          ]) {
            await f.page.getByRole("link", { name: link, exact: true }).click();
            await waitHeading(f.page, title);
            await noOverflow(f.page);
          }
          await f.page
            .getByRole("link", { name: "数学 待迁入", exact: true })
            .click();
          await waitHeading(f.page, "数学待迁入");
          await f.page.reload();
          await waitHeading(f.page, "数学待迁入");
          await noOverflow(f.page);
        });
        await step(
          "direct parent URL and forged role header denied",
          async () => {
            await f.context.setExtraHTTPHeaders({
              "X-Role": "parent",
              "X-Tailscale-User": "synthetic-forged",
            });
            await f.page.goto(f.origin + "/parent/report");
            await waitHeading(f.page, "这个入口只对家长开放");
            assert.equal(await f.page.getByText("合成学习者乙").count(), 0);
            assert.equal(
              (
                await f.context.request.get(f.origin + "/api/v1/parent/report")
              ).status(),
              403,
            );
            await noOverflow(f.page);
          },
        );
        await step(
          "refresh and logout/back cannot restore session",
          async () => {
            await f.page.goto(f.origin + "/home");
            await waitHeading(f.page, "今天，想从哪里开始？");
            await f.page.reload();
            await waitHeading(f.page, "今天，想从哪里开始？");
            const cookie = (await f.context.cookies())
              .map((c) => c.name + "=" + c.value)
              .join("; ");
            await f.page
              .getByRole("button", { name: "退出", exact: true })
              .click();
            await waitHeading(f.page, "请先登录学习家园");
            assert.equal(
              (
                await f.context.request.get(f.origin + "/api/v1/auth/session", {
                  headers: { Cookie: cookie },
                })
              ).status(),
              401,
            );
            await f.page.goBack();
            await expect(f.page.locator(".role-tag")).toHaveCount(0);
            await noPrivate(f);
            await f.page.goto(f.origin + "/parent");
            await waitHeading(f.page, "请先登录学习家园");
            await noPrivate(f);
          },
        );
      },
    );
  for (const width of [390, 768])
    await run(
      "parent-responsive-" + width,
      { width, height: 1024 },
      async (f) => {
        await step("parent locked login", () => f.login(true));
        await noPrivate(f);
        await noOverflow(f.page);
        await shot(f, "parent-locked-" + width);
        await step("parent real unlock and learner selection", async () => {
          await f.unlock();
          await f.page.getByRole("button", { name: /合成学习者乙/ }).click();
          await f.page
            .getByRole("heading", {
              name: "合成学习者乙的学习报告",
              exact: true,
            })
            .waitFor();
          await noOverflow(f.page);
          await shot(f, "parent-unlocked-" + width);
        });
        await f.page.getByRole("button", { name: "锁定家长权限" }).click();
        await waitHeading(f.page, "家长权限已锁定");
        await noPrivate(f);
      },
      true,
    );
  await run(
    "parent-authority-lifecycle",
    { width: 1280, height: 900 },
    async (f) => {
      await f.page.clock.install({ time: new Date() });
      await step("locked DTO never exposes learner metadata", async () => {
        await f.login(true);
        await noPrivate(f);
        await shot(f, "parent-locked-1280");
      });
      await step("unlock and switch only current grants", async () => {
        await f.unlock();
        await f.page.getByRole("button", { name: /合成学习者乙/ }).click();
        await waitHeading(f.page, "合成学习者乙的学习报告");
        await shot(f, "parent-unlocked-1280");
      });
      await step(
        "revocation is immediately enforced on selection",
        async () => {
          f.auth.revokeGrant(f.parent, f.sibling!.learnerId);
          await f.page.getByRole("button", { name: /合成学习者乙/ }).click();
          await expect(
            f.page.getByRole("button", { name: /合成学习者乙/ }),
          ).toHaveCount(0);
          assert(
            !(await f.page.locator("body").innerText()).includes(
              "合成学习者乙",
            ),
          );
        },
      );
      await step(
        "lock/rotate invalidate old cookies and remove all private UI",
        async () => {
          const old = (await f.context.cookies())
            .map((c) => c.name + "=" + c.value)
            .join("; ");
          await f.page.getByRole("button", { name: "锁定家长权限" }).click();
          await waitHeading(f.page, "家长权限已锁定");
          await noPrivate(f);
          assert.equal(
            (
              await f.context.request.get(f.origin + "/api/v1/auth/session", {
                headers: { Cookie: old },
              })
            ).status(),
            401,
          );
          await f.unlock();
          await f.page.getByText("账户", { exact: true }).click();
          await f.page
            .getByRole("button", { name: "更新会话并锁定权限" })
            .click();
          await waitHeading(f.page, "家长权限已锁定");
          await noPrivate(f);
        },
      );
      await step("fresh document relocks through server CSRF API", async () => {
        await f.unlock();
        await f.page.reload();
        await waitHeading(f.page, "家长权限已锁定");
        await noPrivate(f);
      });
      await step(
        "expiry and backend restart never restore stale permissions",
        async () => {
          stage = "expiry: unlock";
          await f.unlock();
          stage = "expiry: advance clock";
          f.advance(UNLOCK_MS + 1);
          await f.page.clock.fastForward(UNLOCK_MS + 1000);
          stage = "expiry: wait locked";
          await waitHeading(f.page, "家长权限已锁定");
          await noPrivate(f);
          stage = "expiry: backend restart";
          await f.restart();
          stage = "expiry: reload";
          await f.page.reload();
          stage = "expiry: verify locked after restart";
          await waitHeading(f.page, "家长权限已锁定");
          await noPrivate(f);
        },
      );
    },
    true,
  );
  await run(
    "real-login-errors-401-422-429",
    { width: 390, height: 900 },
    async (f) => {
      await f.page.goto(f.origin + "/login");
      const attempt = async (login: string) => {
        await f.page.getByLabel("登录名", { exact: true }).fill(login);
        await f.page.getByLabel("密码", { exact: true }).fill(secret());
        await f.page.getByRole("button", { name: "登录", exact: true }).click();
      };
      await step("actual wrong credential 401", async () => {
        await attempt(f.parentLogin);
        await f.page
          .getByRole("alert")
          .filter({ hasText: "登录名或密码不正确" })
          .waitFor();
        assert.equal(
          await f.page.getByLabel("密码", { exact: true }).inputValue(),
          "",
        );
      });
      await step("actual schema 422", async () => {
        await attempt("!");
        await f.page
          .getByRole("alert")
          .filter({ hasText: "检查输入格式" })
          .waitFor();
      });
      await step("actual persistent rate limiter 429", async () => {
        for (let i = 0; i < 4; i++) {
          await attempt(f.parentLogin);
          await f.page
            .getByRole("alert")
            .filter({ hasText: "登录名或密码不正确" })
            .waitFor();
        }
        await attempt(f.parentLogin);
        await f.page
          .getByRole("alert")
          .filter({ hasText: "尝试次数较多" })
          .waitFor();
      });
    },
  );
  await run(
    "offline-503-csrf-and-logout-recovery",
    { width: 1280, height: 900 },
    async (f) => {
      await f.login(true);
      await f.unlock();
      await f.page.getByRole("button", { name: /Synthetic learner/ }).click();
      await waitHeading(f.page, "Synthetic learner的学习报告");
      await step("offline hides before any revalidation", async () => {
        await f.context.setOffline(true);
        await f.page
          .getByRole("alert")
          .filter({ hasText: "网络已断开" })
          .waitFor();
        await noPrivate(f);
        await shot(f, "offline-1280");
        await f.context.setOffline(false);
        await waitHeading(f.page, "家长中心");
      });
      await step("actual SQLite authority fault returns 503", async () => {
        const epoch = Number(
          f.store.db
            .prepare("SELECT epoch FROM auth_controls WHERE id=1")
            .get()!.epoch,
        );
        f.store.db.exec("DELETE FROM auth_controls");
        await f.page
          .getByRole("link", { name: "今日计划", exact: true })
          .click();
        await f.page
          .getByRole("alert")
          .filter({ hasText: "服务暂时不可用" })
          .waitFor();
        await noPrivate(f);
        f.store.db.prepare("INSERT INTO auth_controls VALUES(1,?)").run(epoch);
        await retry(f.page);
        await waitHeading(f.page, "今日计划");
        await f.page
          .getByRole("link", { name: "家长中心", exact: true })
          .click();
        await waitHeading(f.page, "家长中心");
      });
      await step(
        "real CSRF 403 clears UI; retry confirms pending lock",
        async () => {
          f.expectHeaderFault("/api/v1/auth/parent-lock");
          await f.page.route("**/api/v1/auth/parent-lock", async (route) => {
            const headers = { ...(await route.request().allHeaders()) };
            assert(typeof headers["x-csrf-token"] === "string");
            delete headers["x-csrf-token"];
            await route.continue({ headers });
          });
          const rejected = f.page.waitForResponse((r) =>
            r.url().endsWith("/api/v1/auth/parent-lock"),
          );
          await f.page.getByRole("button", { name: "锁定家长权限" }).click();
          assert.equal(
            (await (await rejected).json()).error.code,
            "CSRF_FAILED",
          );
          await f.page
            .getByRole("alert")
            .filter({ hasText: "权限已变化" })
            .waitFor();
          await noPrivate(f);
          await f.page.unroute("**/api/v1/auth/parent-lock");
          await retry(f.page);
          await waitHeading(f.page, "家长权限已锁定");
          await noPrivate(f);
        },
      );
      await step(
        "failed logout is never claimed successful; recovery completes intent",
        async () => {
          await f.page.route("**/api/v1/auth/logout", (route) =>
            route.abort("internetdisconnected"),
          );
          await f.page
            .getByRole("button", { name: "退出", exact: true })
            .click();
          await f.page
            .getByRole("alert")
            .filter({ hasText: "连接尚未确认" })
            .waitFor();
          assert(
            !(await f.page.locator("body").innerText()).includes(
              "已退出当前会话",
            ),
          );
          await noPrivate(f);
          await f.page.unroute("**/api/v1/auth/logout");
          await retry(f.page);
          await waitHeading(f.page, "请先登录学习家园");
          await f.page
            .getByRole("alert")
            .filter({ hasText: "已退出当前会话" })
            .waitFor();
        },
      );
    },
  );
  await run(
    "cancel-timeout-and-late-response",
    { width: 1280, height: 900 },
    async (f) => {
      await f.login(true);
      await f.unlock();
      let release: () => void = () => {};
      let forwarded: () => void = () => {};
      const responseReady = new Promise<void>((r) => (forwarded = r)),
        hold = new Promise<void>((r) => (release = r));
      await f.page.route("**/api/v1/auth/session", async (route) => {
        const response = await route.fetch();
        forwarded();
        await hold;
        try {
          await route.fulfill({ response });
        } catch {}
      });
      await step(
        "cancel masks and rejects late authenticated snapshot",
        async () => {
          await f.page
            .getByRole("link", { name: "今日计划", exact: true })
            .click();
          await responseReady;
          await f.page.getByRole("button", { name: "取消等待" }).click();
          f.auth.rotateAuthority();
          release();
          await f.page.waitForTimeout(150);
          await noPrivate(f);
          await f.page.unroute("**/api/v1/auth/session");
          await retry(f.page);
          await waitHeading(f.page, "请先登录学习家园");
        },
      );
      await step(
        "network deadline does not become optimistic success",
        async () => {
          await f.login(true);
          let finish: () => void = () => {};
          const held = new Promise<void>((r) => (finish = r));
          await f.page.route("**/api/v1/auth/session", async (route) => {
            await held;
            try {
              await route.continue();
            } catch {}
          });
          await f.page
            .getByRole("link", { name: "今日计划", exact: true })
            .click();
          await f.page
            .getByRole("alert")
            .filter({ hasText: "已停止等待" })
            .waitFor({ timeout: 11000 });
          await noPrivate(f);
          finish();
          await f.page.unroute("**/api/v1/auth/session");
        },
      );
    },
  );
  await run(
    "password-reset-and-idle-expiry",
    { width: 768, height: 1024 },
    async (f) => {
      await f.login();
      await step(
        "credential reset invalidates current browser on next read",
        async () => {
          await f.auth.resetCredential(f.childLogin, secret());
          await f.page.getByRole("link", { name: "复习", exact: true }).click();
          await waitHeading(f.page, "请先登录学习家园");
          await noPrivate(f);
        },
      );
      await step(
        "actual idle expiry does not recover from a stale UI",
        async () => {
          await f.auth.resetCredential(f.childLogin, f.childPassword);
          await f.login();
          f.advance(IDLE_MS + 1);
          await f.page.getByRole("link", { name: "科目", exact: true }).click();
          await waitHeading(f.page, "请先登录学习家园");
          await noPrivate(f);
        },
      );
    },
  );
  await run(
    "catalog-failure-isolation",
    { width: 1280, height: 900 },
    async (f) => {
      await f.login();
      await step(
        "missing/malformed subject cannot break other modules or identity",
        async () => {
          await f.page.route("**/api/v1/config", async (route) => {
            const response = await route.fetch(),
              data = await response.json();
            data.subjects = [
              { id: "math", title: "invalid" },
              data.subjects[1],
              {
                id: "science",
                title: "科学",
                enabled: false,
                status: "unavailable",
                contractVersion: 1,
                contentVersion: null,
                mark: "探",
                accent: "green",
              },
            ];
            await route.fulfill({ response, json: data });
          });
          await f.page.goto(f.origin + "/subjects");
          await waitHeading(f.page, "科目");
          await f.page
            .getByRole("link", { name: "英语 待迁入", exact: true })
            .waitFor();
          assert.equal(
            await f.page
              .getByRole("link", { name: "数学 待迁入", exact: true })
              .count(),
            0,
          );
          await f.page
            .getByRole("link", { name: "科学 暂不可用", exact: true })
            .click();
          await waitHeading(f.page, "科学暂不可用");
          await shot(f, "missing-subject-1280");
          await f.page.unroute("**/api/v1/config");
          await f.page.route("**/api/v1/config", (route) =>
            route.fulfill({
              status: 503,
              contentType: "application/json",
              body: "{}",
            }),
          );
          await f.page.goto(f.origin + "/subjects");
          await waitHeading(f.page, "科目");
          await f.page
            .getByText("科目列表暂时无法确认，其他入口仍可使用。")
            .waitFor();
          await f.page
            .getByRole("link", { name: "今日学习", exact: true })
            .click();
          await waitHeading(f.page, "今天，想从哪里开始？");
        },
      );
    },
  );
  await run(
    "late-parent-expiry-response",
    { width: 1280, height: 900 },
    async (f) => {
      await f.page.clock.install({ time: new Date() });
      await f.login(true);
      await f.unlock();
      await step(
        "late private metadata is never painted after elevation expiry",
        async () => {
          f.advance(UNLOCK_MS - 2000);
          await f.page.clock.fastForward(UNLOCK_MS - 2000);
          await waitHeading(f.page, "家长中心");
          let release: () => void = () => {},
            ready: () => void = () => {};
          const hold = new Promise<void>((r) => (release = r)),
            forwarded = new Promise<void>((r) => (ready = r));
          await f.page.route("**/api/v1/learners", async (route) => {
            const response = await route.fetch();
            ready();
            await hold;
            try {
              await route.fulfill({ response });
            } catch {}
          });
          await f.page
            .getByRole("link", { name: "学习报告", exact: true })
            .click();
          await forwarded;
          await f.page.evaluate(() => {
            const state = window as unknown as { latePrivatePainted: boolean };
            state.latePrivatePainted = false;
            new MutationObserver(() => {
              for (const node of document.querySelectorAll(".private-content"))
                if (
                  getComputedStyle(node).display !== "none" &&
                  node.textContent?.includes("Synthetic learner")
                )
                  state.latePrivatePainted = true;
            }).observe(document.documentElement, {
              childList: true,
              subtree: true,
              attributes: true,
            });
          });
          f.advance(3000);
          await f.page.clock.fastForward(3000);
          release();
          await f.page
            .getByRole("alert")
            .filter({ hasText: "权限已变化" })
            .waitFor();
          await noPrivate(f);
          assert.equal(
            await f.page.evaluate(
              () =>
                (window as unknown as { latePrivatePainted: boolean })
                  .latePrivatePainted,
            ),
            false,
          );
          await f.page.unroute("**/api/v1/learners");
          await retry(f.page);
          await waitHeading(f.page, "家长权限已锁定");
          await noPrivate(f);
        },
      );
    },
  );
} finally {
  await browser.close();
}
const result = {
  status: failed ? "FAIL" : process.env.CI ? "PASS_CI" : "PASS_LOCAL",
  timestamp: new Date().toISOString(),
  executedHeadSha: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  worktreeDirty: !!execFileSync("git", ["status", "--porcelain"], {
    encoding: "utf8",
  }).trim(),
  scope:
    "real compiled React + loopback Node auth + SQLite; synthetic only; never NAS/physical iPad",
  filtered: !!process.env.KLH_UI_CASE,
  total: cases.length,
  failures: failed,
  screenshots,
  cases,
};
writeFileSync(
  ".evidence/shell-browser.json",
  JSON.stringify(result, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    status: result.status,
    total: cases.length,
    failures: failed,
    scope: result.scope,
  }),
);
if (failed) process.exitCode = 1;
