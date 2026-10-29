// Real browser printing + independent Poppler text extraction. No grade/API mocks.
import fs from "node:fs";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chromium, expect } from "@playwright/test";
import { startPreview } from "../../apps/preview/server.ts";
import { loadLibrary } from "../../apps/preview/library/service.ts";
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
  origin = nas ? target : "http://127.0.0.1:" + server.address().port,
  browser = await chromium.launch(),
  dir = ".evidence/math-onepass/" + (nas ? "nas" : "local") + "/print";
fs.mkdirSync(dir, { recursive: true });
const articles = JSON.parse(
    fs.readFileSync("apps/preview/reading/articles.json"),
  ),
  lib = loadLibrary(process.cwd()),
  rows = [],
  normalize = (s) => s.normalize("NFKC").replace(/\s+/gu, "");
function checkPDF(file, required) {
  const text = execFileSync(
    process.env.KLH_PDFTOTEXT ?? "pdftotext",
    [file, "-"],
    { encoding: "utf8", maxBuffer: 1024 * 1024 },
  );
  assert(
    !text.includes("学习导航") && !text.includes("打印本课教案"),
    "SCREEN_CHROME_IN_PRINT",
  );
  const pages = text.split("\f");
  if (!pages.at(-1).trim()) pages.pop();
  assert(pages.length > 0 && pages.length <= 15);
  assert(
    pages.every((p) => p.trim().length > 0),
    "BLANK_PRINT_PAGE",
  );
  for (const value of required)
    assert(
      normalize(text).includes(normalize(value)),
      "PRINT_CONTENT_MISSING " + value,
    );
  return {
    pages: pages.length,
    requiredTexts: required.length,
    bytes: fs.statSync(file).size,
  };
}
try {
  if (nas)
    assert.equal(
      (await (await fetch(origin + "/preview-api/v1/runtime")).json()).buildSha,
      expected,
    );
  const p = await browser.newPage({
      viewport: { width: 1280, height: 960 },
      reducedMotion: "reduce",
    }),
    errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.addInitScript(() => {
    window.__printCalls = 0;
    const native = window.print;
    window.print = () => {
      window.__printCalls++;
      native.call(window);
    };
  });
  for (const id of ["G3-U01-B01", "G3-U04-B01", "G3-U06-B01"]) {
    await p.goto(origin + "/subjects/math/lessons/" + id);
    await p.getByRole("button", { name: "展开完整教案", exact: true }).click();
    await p.locator('[data-reading-lesson="' + id + '"]').waitFor();
    const details = p.locator(".reading-article details");
    assert((await details.count()) > 0);
    const before = await details.evaluateAll((xs) => xs.map((x) => x.open));
    await p.emulateMedia({ media: "print" });
    await expect(p.locator(".reading-article > header")).toBeVisible();
    const file = dir + "/" + id + ".pdf";
    await p.emulateMedia({ media: "print" });
    await expect(
      p.locator(".reading-article .action-row button").first(),
    ).toBeHidden();
    await p.pdf({
      path: file,
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
    });
    await expect
      .poll(() => details.evaluateAll((xs) => xs.map((x) => x.open)))
      .toEqual(before);
    await p.emulateMedia({ media: null });
    const a = articles.find((a) => a.lessonId === id),
      required = [
        a.retellPrompt,
        ...a.blocks.flatMap((b) =>
          [
            b.text,
            ...(b.paragraphs ?? []),
            ...(b.examples ?? []).flatMap((e) =>
              e.steps.flatMap((s) => [s.math, s.why]),
            ),
            ...(b.cases ?? []).flatMap((c) => [c.math, c.explanation]),
            ...(b.options ?? []),
          ].filter(Boolean),
        ),
      ];
    rows.push({
      id,
      kind: "primary",
      ...checkPDF(file, required),
      closedTeachingIncluded: true,
      screenStateRestored: true,
    });
  }
  for (const id of ["g4-angle-measure", "g5-cuboid-volume", "g6-proportion"]) {
    await p.goto(origin + "/subjects/math/library?kind=legacy&id=" + id);
    await p.getByRole("button", { name: "展开完整主题教案" }).click();
    const article = p.locator('[data-legacy-article="' + id + '"]');
    await expect(article).toBeVisible();
    await expect(
      article.locator("#legacy-reading-example .learning-feedback"),
    ).toHaveCount(0);
    const before = await p.evaluate(() => window.__printCalls);
    await p.getByRole("button", { name: "打印本课教案", exact: true }).click();
    await expect
      .poll(() => p.evaluate(() => window.__printCalls))
      .toBe(before + 1);
    await expect(
      article.locator("#legacy-reading-example .learning-feedback"),
    ).toBeVisible();
    const file = dir + "/" + id + ".pdf";
    await p.emulateMedia({ media: "print" });
    await expect(
      p.locator(".reading-article .action-row button").first(),
    ).toBeHidden();
    await p.pdf({
      path: file,
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
    });
    await p.emulateMedia({ media: null });
    const entry = lib.catalog.entries.find((e) => e.id === id),
      task = [...lib.practice.tasks.values()].find(
        (r) => r.lessonId === id && r.task.kind !== "choice",
      ).task;
    rows.push({
      id,
      kind: "legacy",
      ...checkPDF(file, [
        entry.title,
        entry.story,
        entry.concept,
        task.prompt,
        task.solution,
        entry.retellPrompt,
      ]),
      explicitPrintLoadsAuthoredExample: true,
    });
  }
  assert.deepEqual(errors, []);
  await p.close();
  fs.writeFileSync(
    dir + "/results.json",
    JSON.stringify(
      {
        status: "PASS",
        nas,
        origin,
        expectedSha: nas ? expected : null,
        rows,
        physicalPrinter: "NOT_TESTED",
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    JSON.stringify({
      status: "PASS",
      printGuides: rows.length,
      sourceExamplesAndReasonsVerified: true,
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
