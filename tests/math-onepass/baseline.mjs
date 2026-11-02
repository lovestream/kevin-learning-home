// Read-only visual baseline of the owned, anonymous NAS preview; no accounts or records.
import fs from "node:fs";
import { chromium } from "@playwright/test";
import { loadLibrary } from "../../apps/preview/library/service.ts";
const origin = "http://192.168.2.100:38444",
  dir = ".evidence/math-onepass/visual-r0";
fs.mkdirSync(dir, { recursive: true });
const lib = loadLibrary(process.cwd()),
  legacy = lib.catalog.entries.filter((x) => x.kind === "legacy");
const scenarios = [
  ["home", "/subjects/math"],
  ["upper", "/subjects/math?term=upper"],
  ["lower", "/subjects/math?term=lower"],
  ["unit", "/subjects/math?term=upper&unit=G3-U02"],
  ["lesson", "/subjects/math/lessons/G3-U01-B01"],
  ["lab", "/subjects/math/lessons/G3-U01-B01", 2],
  ["practice", "/subjects/math/lessons/G3-U01-B01", 5],
  ["thinking", "/subjects/math/library?kind=thinking&id=G3-UP01-TH1"],
  ["detective", "/subjects/math/library?kind=detective&id=DET-G3-001"],
  ["methods", "/subjects/math/library?kind=methods"],
  ["review", "/subjects/math/library?kind=review"],
  ...["geometry", "balance", "fraction"].map((lab) => [
    "legacy-" + lab,
    "/subjects/math/library?kind=legacy&id=" +
      legacy.find((x) => x.lab === lab).id,
    3,
  ]),
];
const browser = await chromium.launch(),
  rows = [];
try {
  for (const width of [1440, 1280, 768, 390, 360]) {
    const page = await browser.newPage({
      viewport: { width, height: 960 },
      reducedMotion: "reduce",
    });
    for (const [name, path, step] of scenarios) {
      await page.goto(origin + path);
      await page
        .locator(".learning-map,.math-lesson,.library-page")
        .first()
        .waitFor();
      if (step !== undefined)
        await page.locator(".classroom-route button").nth(step).click();
      await page.screenshot({
        path: dir + "/" + name + "-" + width + ".png",
        fullPage: true,
      });
      rows.push({
        name,
        width,
        path,
        screenshot: name + "-" + width + ".png",
        overflow: await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
      });
    }
    await page.close();
  }
} finally {
  await browser.close();
}
fs.writeFileSync(
  dir + "/manifest.json",
  JSON.stringify(
    {
      round: "R0_BEFORE_REDESIGN",
      origin,
      source: "52e781440b21a406286ac55bbfefdb6e06d119fe",
      rows,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  JSON.stringify({
    status: "BASELINE_CAPTURED",
    screenshots: rows.length,
    overflow: rows.filter((x) => x.overflow).length,
  }),
);
