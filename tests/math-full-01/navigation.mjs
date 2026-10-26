// Real frontend + backend, local development or explicit NAS origin. No response mocks.
import fs from "node:fs";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chromium, expect } from "@playwright/test";
import { startPreview } from "../../apps/preview/server.ts";
import { loadContent } from "../../apps/preview/content.ts";
import { mapHref, lessonLocation } from "../../apps/preview/learning-map.ts";
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
const { catalog, learningMap: map } = loadContent(process.cwd()),
  output = ".evidence/math-full-r3" + (nas ? "/nas" : "/local");
fs.mkdirSync(output, { recursive: true });
const server = nas ? null : await startPreview({ enabled: true, port: 0 }),
  origin = nas ? target : "http://127.0.0.1:" + server.address().port;
const browser = await chromium.launch(),
  results = [],
  errors = [],
  shots = [],
  started = Date.now();
const sourceFiles = [
  "apps/preview/MapNavigation.tsx",
  "apps/preview/learning-map.ts",
  "apps/preview/main.tsx",
  "apps/preview/preview.css",
  "apps/preview/content.ts",
  "apps/preview/server.ts",
  "apps/preview/content/catalog.json",
  "apps/preview/content/learning-map.json",
  "tests/math-full-01/navigation.mjs",
];
const execution = {
  head: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  dirty: !!execFileSync("git", ["status", "--porcelain"], {
    encoding: "utf8",
  }).trim(),
  files: Object.fromEntries(
    sourceFiles.map((p) => [
      p,
      createHash("sha256").update(fs.readFileSync(p)).digest("hex"),
    ]),
  ),
};
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
      csp = [],
      reached = new Set();
    page.on("pageerror", (e) => errors.push({ width, error: String(e) }));
    page.on("request", (r) => {
      if (!["GET", "HEAD"].includes(r.method())) writes.push(r.url());
      if (new URL(r.url()).origin !== origin) external.push(r.url());
    });
    await page.addInitScript(() => {
      window.__mapCsp = [];
      addEventListener("securitypolicyviolation", (e) =>
        window.__mapCsp.push(e.violatedDirective),
      );
    });
    const click = async (l) => {
      const href = await l.getAttribute("href");
      const action = () => (width < 1000 ? l.tap() : l.click());
      if (href)
        await Promise.all([
          page.waitForURL(new URL(href, page.url()).href, {
            waitUntil: "load",
          }),
          action(),
        ]);
      else await action();
    };
    const photo = async (name) => {
      await page.screenshot({
        path: output + "/" + name + "-" + width + ".png",
        fullPage: true,
      });
      shots.push(name + "-" + width + ".png");
    };
    const fit = async () =>
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        "PAGE_OVERFLOW",
      );
    await page.goto(origin);
    await expect(page.locator("[data-term-link]")).toHaveCount(3);
    await expect(page.locator("[data-lesson-link]")).toHaveCount(0);
    await fit();
    await photo("home");
    const runtime = await (
      await context.request.get(origin + "/preview-api/v1/runtime")
    ).json();
    if (nas) assert.equal(runtime.buildSha, expected);
    await click(page.locator('[data-term-link="upper"]'));
    await expect(page.locator("[data-unit]")).toHaveCount(9);
    await expect(page.locator("[data-lesson-link]")).toHaveCount(0);
    const mixed = page.locator('[data-unit="G3-U02"]');
    await click(mixed.locator("summary"));
    await expect(mixed).toHaveAttribute("open", "");
    await fit();
    await photo("upper-open");
    await click(mixed.getByRole("link", { name: "进入混合运算知识点" }));
    await expect(page.locator("[data-lesson-link]")).toHaveCount(12);
    assert.deepEqual(
      await page
        .locator("[data-lesson-link]")
        .evaluateAll((ns) => ns.map((n) => n.getAttribute("data-lesson-link"))),
      map.units.find((u) => u.id === "G3-U02").sequence,
    );
    await expect(page.locator("[data-topic]")).toContainText([
      "没有括号时，先乘除，再加减",
    ]);
    await fit();
    await photo("u02");
    await click(page.locator('[data-lesson-link="G3-U02-B02"]'));
    await expect(page.locator("[data-lesson-id]")).toHaveAttribute(
      "data-lesson-id",
      "G3-U02-B02",
    );
    await expect(
      page.getByRole("navigation", { name: "当前位置" }),
    ).toContainText("三年级上册");
    await expect(
      page.getByRole("navigation", { name: "当前位置" }),
    ).toContainText("混合运算");
    await click(page.locator("[data-return-unit]"));
    await expect(page).toHaveURL(/term=upper&unit=G3-U02/);
    assert(new URL(page.url()).searchParams.get("unit") === "G3-U02");
    await expect(page.locator("[data-lesson-link]")).toHaveCount(12);
    await photo("classroom-return");
    await page.goBack();
    await expect(page.locator("[data-lesson-id]")).toHaveAttribute(
      "data-lesson-id",
      "G3-U02-B02",
    );
    await page.reload();
    await expect(page.locator("[data-return-unit]")).toHaveText("返回混合运算");
    await click(page.locator("[data-return-unit]"));
    await page.getByLabel("找知识点或课程").fill("时刻与时长");
    await expect(
      page.getByRole("region", { name: "知识点搜索结果" }),
    ).toContainText("三年级下册 / 年、月、日的秘密");
    await page.reload();
    await expect(page.getByLabel("找知识点或课程")).toHaveValue("时刻与时长");
    await click(page.getByRole("link", { name: "退出搜索，返回混合运算" }));
    await expect(page.locator("[data-lesson-link]")).toHaveCount(12);
    await page.getByLabel("找知识点或课程").fill("not-a-math-topic");
    await expect(page.getByRole("status")).toContainText("没有找到");
    await click(page.getByRole("link", { name: "退出搜索，返回混合运算" }));
    await page.goto(origin + "/subjects/math");
    await click(page.locator('[data-term-link="lower"]'));
    await expect(page.locator("[data-unit]")).toHaveCount(8);
    const time = page.locator('[data-unit="G3-LP01"]');
    await click(time.locator("summary"));
    await photo("lower-open");
    await click(time.getByRole("link", { name: "进入年、月、日的秘密知识点" }));
    await click(page.locator('[data-lesson-link="G3-LP01-B02"]'));
    await expect(page.locator("[data-return-unit]")).toHaveText(
      "返回年、月、日的秘密",
    );
    await expect(
      page.getByRole("navigation", { name: "当前位置" }),
    ).toContainText("三年级下册");
    await click(page.locator("[data-return-unit]"));
    await page.reload();
    assert.equal(new URL(page.url()).searchParams.get("unit"), "G3-LP01");
    await page.goto(origin + "/subjects/math");
    await click(page.locator('[data-term-link="bridge"]'));
    await expect(page.locator("[data-lesson-link]")).toHaveCount(7);
    await fit();
    await photo("bridge");
    await click(page.locator('[data-lesson-link="algebra.balance.intro"]'));
    await expect(page.locator("[data-return-unit]")).toHaveText(
      "返回等量替换与天平",
    );
    await click(page.locator("[data-return-unit]"));
    // All 70 are reachable from their own topic/unit, without opening a flat all-course list.
    for (const u of map.units) {
      await page.goto(origin + mapHref(u.term, u.id));
      await expect(page.locator("[data-lesson-link]")).toHaveCount(
        u.sequence.length,
      );
      const ids = await page
        .locator("[data-lesson-link]")
        .evaluateAll((ns) => ns.map((n) => n.getAttribute("data-lesson-link")));
      assert.deepEqual(ids, u.sequence);
      ids.forEach((id) => reached.add(id));
      await fit();
    }
    await page.goto(origin + mapHref("upper", "G3-U03"));
    await expect(
      page.getByRole("heading", { name: "补充拓展", exact: true }),
    ).toHaveCount(1);
    await page.goto(origin + mapHref("upper", "G3-U07"));
    await expect(
      page.getByRole("heading", { name: "复习 R", exact: true }),
    ).toHaveCount(1);
    for (const g of map.bridgeGroups) {
      await page.goto(origin + mapHref("bridge", g.id));
      await expect(page.locator("[data-lesson-link]")).toHaveCount(
        g.lessons.length,
      );
      g.lessons.forEach((id) => reached.add(id));
    }
    assert.equal(reached.size, 70);
    // The same native disclosure also supports keyboard operation.
    await page.goto(origin + mapHref("upper"));
    const summary = page.locator('[data-unit="G3-U01"] summary');
    await summary.press("Enter");
    await expect(page.locator('[data-unit="G3-U01"]')).toHaveAttribute(
      "open",
      "",
    );
    assert.equal(
      await page.evaluate(() => localStorage.length + sessionStorage.length),
      0,
    );
    assert.equal((await context.cookies()).length, 0);
    csp.push(...(await page.evaluate(() => window.__mapCsp)));
    assert.deepEqual(writes, []);
    assert.deepEqual(external, []);
    assert.deepEqual(csp, []);
    results.push({
      width,
      pass: true,
      reachedLessons: [...reached],
      unitCount: 17,
      bridgeLessons: 7,
      upperFlow: true,
      lowerFlow: true,
      bridgeFlow: true,
      searchContext: true,
      backAndReload: true,
      keyboardDisclosure: true,
      noWrites: true,
      noCookies: true,
    });
    await context.close();
  }
} catch (e) {
  errors.push({ error: String(e.stack ?? e).slice(0, 2500) });
  process.exitCode = 1;
  console.error(String(e.stack ?? e).slice(0, 1800));
} finally {
  await browser.close();
  if (server) await new Promise((r) => server.close(r));
  const record = {
    status: errors.length ? "FAIL" : "PASS",
    origin,
    target: nas ? "NAS_LAN_HTTP" : "LOCAL_DEVELOPMENT",
    expectedBuildSha: nas ? expected : undefined,
    execution,
    elapsedMs: Date.now() - started,
    results,
    errors,
    screenshots: shots,
    physicalIPhoneIPad: "NEEDS_USER_ACTION",
  };
  fs.writeFileSync(
    output + "/navigation.json",
    JSON.stringify(record, null, 2) + "\n",
  );
  console.log(
    JSON.stringify({
      status: record.status,
      viewports: results.length,
      errors: errors.length,
      elapsedMs: record.elapsedMs,
    }),
  );
}
