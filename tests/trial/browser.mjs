// Explicit manual NAS acceptance only. Never runs against an arbitrary origin.
// No HAR, trace, raw console/error dumps, credentials, or cookie values archived.
import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
const plan = JSON.parse(readFileSync("infra/trial/plan.json"));
const state = JSON.parse(readFileSync(".trial-private/state.json"));
const credentials = JSON.parse(readFileSync(".trial-private/credentials.json"));
assert.deepEqual(state.plan, plan);
assert.equal(credentials.runId, plan.runId);
assert.equal(credentials.origin, state.origin);
assert(state.seeded && state.containers.app);
const origin = state.origin;
const dir = "docs/implementation/evidence/02b-nas-trial";
mkdirSync(dir, { recursive: true });
const tables = [
  "schema_migrations",
  "learners",
  "subjects",
  "subject_states",
  "server_attempts",
  "command_receipts",
  "learning_events",
  "media_assets",
  "content_manifests",
  "content_media_refs",
  "audit_log",
];
function learningSnapshot() {
  const code = `const {DatabaseSync}=require('node:sqlite');const d=new DatabaseSync('/data/learning.sqlite',{readOnly:true});const tables=${JSON.stringify(tables)};const r=Object.fromEntries(tables.map(t=>[t,d.prepare('SELECT * FROM '+t+' ORDER BY rowid').all()]));console.log(JSON.stringify(r));d.close()`;
  const args = [
    "sudo",
    "-n",
    "/usr/local/bin/docker",
    "exec",
    state.containers.app,
    "node",
    "-e",
    code,
  ];
  const quote = (s) => "'" + s.replaceAll("'", "'\\''") + "'";
  const raw = execFileSync(
    "ssh",
    ["-o", "BatchMode=yes", "nas-codex", args.map(quote).join(" ")],
    { stdio: ["ignore", "pipe", "ignore"] },
  );
  const rows = JSON.parse(raw);
  return {
    sha256: createHash("sha256").update(JSON.stringify(rows)).digest("hex"),
    counts: Object.fromEntries(tables.map((t) => [t, rows[t].length])),
  };
}
const before = learningSnapshot();
const browser = await chromium.launch({ headless: true });
const results = [],
  screenshots = [];
const mode = process.env.KLH_TRIAL_CASE || "all";
assert(["all", "parent", "child"].includes(mode));
let stage = "init";
async function shot(page, name) {
  assert(
    await page
      .locator("input[type=password]")
      .evaluateAll((ns) => ns.every((n) => !n.value)),
  );
  await page.screenshot({ path: `${dir}/${name}.png`, fullPage: true });
  screenshots.push(name + ".png");
}
const heading = (p, name) =>
  p.getByRole("heading", { name, exact: true }).waitFor({ timeout: 15000 });
async function login(p, parent = false) {
  await p.goto(origin + "/login");
  const c = parent ? credentials.parent : credentials.learner;
  await p.getByLabel("登录名", { exact: true }).fill(c.login);
  await p.getByLabel("密码", { exact: true }).fill(c.password);
  await p.getByRole("button", { name: "登录", exact: true }).click();
  await heading(p, parent ? "家长权限已锁定" : "今天，想从哪里开始？");
}
async function unlock(p) {
  await p.getByLabel("再次输入家长密码").fill(credentials.parent.password);
  await p.getByRole("button", { name: "解锁家长权限", exact: true }).click();
  await heading(p, "家长中心");
}
async function run(name, width, action) {
  // This isolated test CA is not installed into the OS/device trust stores.
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width, height: width === 768 ? 1024 : 900 },
  });
  await context.addInitScript(() => {
    window.trialCspViolations = 0;
    document.addEventListener(
      "securitypolicyviolation",
      () => window.trialCspViolations++,
    );
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  let external = 0,
    errors = 0,
    leak = false;
  const posts = [],
    pending = [];
  page.on("pageerror", () => errors++);
  page.on("console", (m) => {
    if (
      [credentials.parent.password, credentials.learner.password].some((s) =>
        m.text().includes(s),
      )
    )
      leak = true;
  });
  page.on("request", (r) => {
    if (!r.url().startsWith(origin + "/")) external++;
    if (r.method() === "POST")
      pending.push(
        (async () => {
          const h = await r.allHeaders();
          posts.push({
            endpoint: new URL(r.url()).pathname,
            originMatches: h.origin === origin,
            csrfPresent: !!h["x-csrf-token"],
          });
        })(),
      );
  });
  try {
    stage = name;
    const extra = await action(page, context);
    await Promise.all(pending);
    assert.equal(external, 0);
    assert.equal(errors, 0);
    assert(!leak);
    assert(
      posts.length &&
        posts.every(
          (p) =>
            p.originMatches &&
            (p.endpoint === "/api/v1/auth/login" || p.csrfPresent),
        ),
    );
    const storage = await page.evaluate(() => ({
      local: localStorage.length,
      session: sessionStorage.length,
      jsCookie: document.cookie.length,
    }));
    assert.deepEqual(storage, { local: 0, session: 0, jsCookie: 0 });
    const cspViolations = await page.evaluate(() => window.trialCspViolations);
    assert.equal(cspViolations, 0);
    results.push({
      name,
      status: "PASS_NAS",
      width,
      externalRequests: external,
      pageErrors: errors,
      secretConsoleLeak: leak,
      cspViolations,
      posts,
      storage,
      ...extra,
    });
  } finally {
    await context.close();
  }
}
try {
  for (const width of mode === "parent" ? [] : [390, 768, 1280])
    await run("child-" + width, width, async (p, c) => {
      await login(p);
      stage = "child-" + width + "-logged-in";
      assert(
        await p.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      const cookies = await c.cookies();
      assert(
        cookies.length === 1 &&
          cookies[0].secure &&
          cookies[0].httpOnly &&
          cookies[0].sameSite === "Strict",
      );
      await shot(p, "nas-child-" + width);
      stage = "child-" + width + "-refresh";
      await p.reload();
      await heading(p, "今天，想从哪里开始？");
      await p.goto(origin + "/parent");
      await heading(p, "这个入口只对家长开放");
      stage = "child-" + width + "-parent-denied";
      await expect(p.getByText("合成试用孩子", { exact: true })).toHaveCount(0);
      assert.equal(await p.getByLabel("再次输入家长密码").count(), 0);
      const old = cookies.map((x) => x.name + "=" + x.value).join("; ");
      stage = "child-" + width + "-logout";
      await p.getByRole("button", { name: "退出", exact: true }).click();
      await heading(p, "请先登录学习家园");
      assert.equal(
        (
          await c.request.get(origin + "/api/v1/auth/session", {
            headers: { Cookie: old },
          })
        ).status(),
        401,
      );
      return {
        secureHttpOnlyStrict: true,
        refreshPersisted: true,
        parentAccessDenied: true,
        logoutInvalidatedOldCookie: true,
      };
    });
  if (mode !== "child")
    await run("parent-continuous-two-polls", 1280, async (p, c) => {
      await login(p, true);
      const locked = await (
        await c.request.get(origin + "/api/v1/auth/session")
      ).json();
      assert.deepEqual(locked.learnerIds, []);
      assert.equal(locked.parentUnlocked, false);
      await expect(p.getByText("合成试用孩子", { exact: true })).toHaveCount(0);
      await shot(p, "nas-parent-locked");
      await unlock(p);
      await p.getByRole("button", { name: /合成试用孩子/ }).click();
      await heading(p, "合成试用孩子的学习报告");
      let polls = 0;
      const deadlines = [];
      p.on("response", async (r) => {
        if (r.status() === 200 && r.url().endsWith("/api/v1/learners")) polls++;
        if (r.status() === 200 && r.url().endsWith("/api/v1/auth/session")) {
          try {
            deadlines.push((await r.json()).parentUnlockExpiresAt);
          } catch {}
        }
      });
      await p.locator('.sidebar a[href="/parent/report"]').focus();
      await p.evaluate(() => {
        window.trialLink = document.querySelector(
          '.sidebar a[href="/parent/report"]',
        );
        window.trialPicker = document.querySelector(".learner-option");
        window.trialFocus = window.trialLink;
        window.trialUnstable = false;
        new MutationObserver(() => {
          if (
            !window.trialLink.isConnected ||
            !window.trialPicker.isConnected ||
            document.querySelector(".access-gate,.pending") ||
            document.activeElement !== window.trialFocus
          )
            window.trialUnstable = true;
        }).observe(document.documentElement, {
          childList: true,
          subtree: true,
          attributes: true,
        });
      });
      const start = Date.now();
      await p.waitForTimeout(6000);
      await p.evaluate(() => {
        window.trialFocus = window.trialPicker;
        window.trialPicker.focus();
      });
      await p.waitForTimeout(6000);
      const durationMs = Date.now() - start;
      const successfulBackgroundPolls = polls;
      assert(durationMs >= 12000 && successfulBackgroundPolls >= 2);
      assert(deadlines.length >= 2 && new Set(deadlines).size === 1);
      assert.equal(await p.evaluate(() => window.trialUnstable), false);
      await shot(p, "nas-parent-continuity");
      await p
        .getByRole("button", { name: "锁定家长权限", exact: true })
        .click();
      await heading(p, "家长权限已锁定");
      await expect(p.getByText("合成试用孩子", { exact: true })).toHaveCount(0);
      await unlock(p);
      await p.reload();
      await heading(p, "家长权限已锁定");
      await p.getByRole("button", { name: "退出", exact: true }).click();
      await heading(p, "请先登录学习家园");
      return {
        durationMs,
        successfulBackgroundPolls,
        stableDomAndFocus: true,
        unlockDeadlineStable: true,
        lockedLearnerIdsEmpty: true,
        manualLock: true,
        refreshRelock: true,
      };
    });
  const after = learningSnapshot();
  assert.deepEqual(after, before);
  const report = {
    sourceSha: plan.sourceSha,
    runId: plan.runId,
    status: "PASS_NAS",
    requestedCase: mode,
    client: "macOS real headless Chromium to LAN HTTPS NAS",
    physicalPhone: "NEEDS_USER_ACTION",
    physicalIPad: "NEEDS_USER_ACTION",
    certificateTrust:
      "test CA accepted explicitly by browser; custom CA verified separately by curl; no device trust installed",
    browserVersion: browser.version(),
    results,
    screenshots,
    learningBefore: before,
    learningAfter: after,
    learningTablesUnchanged: true,
    mocks: false,
    realData: false,
  };
  writeFileSync(
    dir + "/browser-" + (mode === "all" ? "results" : mode) + ".json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(
    JSON.stringify({
      status: report.status,
      cases: results.length,
      screenshots: screenshots.length,
      learningTablesUnchanged: true,
    }),
  );
} catch (e) {
  const code = e.name;
  const line = String(e.stack)
    .split("\n")
    .find((x) => x.includes("tests/trial/browser.mjs:"))
    ?.match(/browser.mjs:(\d+)/)?.[1];
  console.error(JSON.stringify({ code, line }));
  writeFileSync(
    dir + "/browser-failure.json",
    JSON.stringify({
      status: "FAIL_NAS",
      stage,
      completed: results.map((x) => x.name),
    }) + "\n",
  );
  console.error(JSON.stringify({ status: "FAIL_NAS", stage }));
  process.exitCode = 1;
} finally {
  await browser.close();
}
