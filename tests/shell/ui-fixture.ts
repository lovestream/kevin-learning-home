import { type Browser, type Page } from "@playwright/test";
import { authFixture, secret } from "../auth/helpers.ts";
import { randomBytes } from "node:crypto";
import { mkdirSync } from "node:fs";

export async function uiFixture(
  browser: Browser,
  viewport = { width: 1280, height: 900 },
  siblings = false,
) {
  const f = await authFixture();
  const sibling = siblings
    ? await f.auth.provisionLearner(
        f.parent,
        "s-" + randomBytes(8).toString("hex"),
        "合成学习者乙",
        secret(),
      )
    : null;
  const context = await browser.newContext({
      viewport,
      reducedMotion: "reduce",
    }),
    page = await context.newPage();
  let errors = 0,
    secretLeak = false,
    external = 0;
  const posts: {
    endpoint: string;
    originMatches: boolean;
    csrfPresent: boolean;
  }[] = [];
  const inspected: Promise<void>[] = [];
  const intentionalHeaderFaults = new Set<string>();
  await context.addInitScript(() => {
    const state = window as unknown as {
      policyViolations: number;
      policyDetails: unknown[];
    };
    state.policyViolations = 0;
    state.policyDetails = [];
    document.addEventListener("securitypolicyviolation", (event) => {
      state.policyViolations++;
      state.policyDetails.push({
        directive: event.effectiveDirective,
        blocked: event.blockedURI.startsWith("http")
          ? new URL(event.blockedURI).pathname
          : event.blockedURI,
        line: event.lineNumber,
      });
    });
  });
  page.on("pageerror", () => errors++);
  page.on("console", (message) => {
    if (
      [f.password, f.childPassword, f.parentLogin, f.childLogin].some((s) =>
        message.text().includes(s),
      )
    )
      secretLeak = true;
  });
  page.on("request", (request) => {
    if (!request.url().startsWith(f.origin)) external++;
    if (request.method() === "POST") {
      inspected.push(
        (async () => {
          const headers = await request.allHeaders();
          posts.push({
            endpoint: new URL(request.url()).pathname,
            originMatches: headers.origin === f.origin,
            csrfPresent:
              typeof headers["x-csrf-token"] === "string" &&
              headers["x-csrf-token"].length > 0,
          });
        })(),
      );
    }
  });
  async function login(parent = false, keyboard = false) {
    await page.goto(f.origin + "/login");
    await page
      .getByLabel("登录名", { exact: true })
      .fill(parent ? f.parentLogin : f.childLogin);
    if (keyboard) {
      await page.getByLabel("登录名", { exact: true }).focus();
      await page.keyboard.press("Tab");
      if (
        (await page.locator(":focus").getAttribute("id")) !== "login-password"
      )
        throw Error("KEYBOARD_FOCUS");
    }
    await page
      .getByLabel("密码", { exact: true })
      .fill(parent ? f.password : f.childPassword);
    if (keyboard) await page.getByLabel("密码", { exact: true }).press("Enter");
    else await page.getByRole("button", { name: "登录", exact: true }).click();
    await page
      .getByRole("heading", {
        name: parent ? "家长权限已锁定" : "今天，想从哪里开始？",
        exact: true,
      })
      .waitFor();
  }
  async function unlock() {
    await page.getByLabel("再次输入家长密码").fill(f.password);
    await page
      .getByRole("button", { name: "解锁家长权限", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "家长中心", exact: true })
      .waitFor();
  }
  async function shot(name: string) {
    const empty = await page
      .locator("input[name=password]")
      .evaluateAll((nodes) =>
        nodes.every((n) => (n as HTMLInputElement).value === ""),
      );
    if (!empty) throw Error("SCREENSHOT_SECRET_INPUT_NOT_EMPTY");
    mkdirSync(".evidence/02b", { recursive: true });
    await page.screenshot({
      path: ".evidence/02b/" + name + ".png",
      fullPage: true,
    });
  }
  async function verify() {
    await Promise.all(inspected);
    if (errors || secretLeak || external)
      throw Error("BROWSER_SAFETY_ASSERTION");
    if (
      (await page.evaluate(
        () => localStorage.length + sessionStorage.length,
      )) !== 0
    )
      throw Error("PERSISTENT_BROWSER_STATE");
    if (
      (await page.evaluate(
        () =>
          (window as unknown as { policyViolations: number }).policyViolations,
      )) !== 0
    ) {
      console.error(
        JSON.stringify({
          cspDiagnostics: await page.evaluate(
            () =>
              (window as unknown as { policyDetails: unknown[] }).policyDetails,
          ),
        }),
      );
      throw Error("CSP_VIOLATION");
    }
    for (const p of posts)
      if (
        !p.originMatches ||
        (p.endpoint !== "/api/v1/auth/login" &&
          !p.csrfPresent &&
          !intentionalHeaderFaults.has(p.endpoint))
      )
        throw Error("POST_ORIGIN_CSRF_MISSING");
    return {
      realAuthBackend: true,
      roleHeadersTrusted: false,
      posts: posts.map((p) => ({ ...p })),
      intentionalHeaderFaults: [...intentionalHeaderFaults],
      consoleSecretLeak: false,
      scriptErrors: errors,
      cspViolations: 0,
      externalRequests: external,
      persistentBrowserEntries: 0,
    };
  }
  return {
    ...f,
    get store() {
      return f.store;
    },
    get auth() {
      return f.auth;
    },
    expectHeaderFault: (endpoint: string) =>
      intentionalHeaderFaults.add(endpoint),
    sibling,
    context,
    page,
    login,
    unlock,
    shot,
    verify,
    async close() {
      await context.close();
      await f.stop();
    },
  };
}
export async function noOverflow(page: Page) {
  if (
    !(await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ))
  )
    throw Error("HORIZONTAL_OVERFLOW");
  const small = await page
    .locator("button:visible,a:visible,input:visible,summary:visible")
    .evaluateAll((nodes) =>
      nodes
        .filter((n) => n.getBoundingClientRect().height < 43)
        .map((n) => n.tagName),
    );
  if (small.length) throw Error("TOUCH_TARGET_TOO_SMALL");
}
