import fs from "node:fs";
import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";
import { startPreview } from "../../apps/preview/server.ts";
import {
  legacyModels,
  modelFacts,
} from "../../apps/preview/library/legacy-models.ts";
const nas=process.argv.includes('--nas'),target=process.env.KLH_PREVIEW_TEST_ORIGIN,expected=process.env.KLH_PREVIEW_EXPECT_SHA;
if(nas&&(target!=='http://192.168.2.100:38444'||!/^[a-f0-9]{40}$/.test(expected??'')))throw Error('EXPLICIT_NAS_SHA_REQUIRED');
if(!nas&&target)throw Error('NAS_MODE_REQUIRED');
const dir = '.evidence/math-onepass/'+(nas?'visual-r2-nas-legacy':'visual-r1-legacy');
fs.mkdirSync(dir,{recursive:true});
const server = nas?null:await startPreview({ enabled: true, port: 0 }),
  origin = nas?target:"http://127.0.0.1:" + server.address().port,
  browser = await chromium.launch(),
  results = [],
  errors = [];
try {
  if(nas){const runtime=await(await fetch(origin+'/preview-api/v1/runtime')).json();assert.equal(runtime.buildSha,expected);assert.equal(runtime.training.cases,63);}
  for (const width of [1440, 1280, 768, 390, 360]) {
    const page = await browser.newPage({
      viewport: { width, height: 960 },
      reducedMotion: "reduce",
    });
    page.on("pageerror", (e) => errors.push(e.message));
    for (const m of legacyModels) {
      await page.goto(origin + "/subjects/math/library?kind=legacy&id=" + m.id);
      await page.locator(".classroom-route button").nth(3).click();
      const lab = page.locator('[data-semantic-model="' + m.id + '"]');
      await expect(lab).toBeVisible();
      const cases = [];
      if (m.kind === "place") {
        await expect(lab.locator("[data-place-value]")).toBeVisible();
      } else {
        const slider = lab.locator("input[type=range]").first();
        for (const [state, value, key] of [
          ["initial", m.initial, null],
          ["min", m.min, "Home"],
          ["max", m.max, "End"],
        ]) {
          if (key) {
            await slider.focus();
            await slider.press(key);
          }
          await expect(lab).toHaveAttribute("data-model-value", String(value));
          await expect(lab.locator("[data-model-equation]")).toHaveText(
            modelFacts(m.id, value).formula,
          );
          const drawing = await lab.locator(".semantic-svg").evaluate((svg) => {
            const root = svg.getBoundingClientRect(),
              outside = [];
            for (const el of svg.querySelectorAll(
              "text,path,rect,polygon,circle,ellipse",
            )) {
              const r = el.getBoundingClientRect();
              if (
                r.width &&
                r.height &&
                (r.left < root.left - 1 ||
                  r.right > root.right + 1 ||
                  r.top < root.top - 1 ||
                  r.bottom > root.bottom + 1)
              )
                outside.push({
                  tag: el.tagName,
                  text: el.textContent?.slice(0, 100),
                  box: [
                    r.left - root.left,
                    r.top - root.top,
                    r.width,
                    r.height,
                  ],
                });
            }
            const area = (points) => {
              let sum = 0;
              for (let i = 0; i < points.length; i++) {
                const a = points[i],
                  b = points[(i + 1) % points.length];
                sum += a[0] * b[1] - a[1] * b[0];
              }
              return Math.abs(sum) / 2;
            };
            return {
              outside,
              polygons: [...svg.querySelectorAll("[data-area-piece]")].map(
                (p) => ({
                  name: p.getAttribute("data-area-piece"),
                  area: area(
                    p
                      .getAttribute("points")
                      .split(" ")
                      .map((v) => v.split(",").map(Number)),
                  ),
                }),
              ),
              groups: [...svg.querySelectorAll("[data-division-group]")].map(
                (g) => g.querySelectorAll("circle").length,
              ),
              path: svg.querySelector("[data-area-remain]")?.getAttribute("d"),
              cut: svg.querySelector("[data-area-cut]")
                ? {
                    width: Number(
                      svg
                        .querySelector("[data-area-cut]")
                        .getAttribute("width"),
                    ),
                    height: Number(
                      svg
                        .querySelector("[data-area-cut]")
                        .getAttribute("height"),
                    ),
                  }
                : null,
            };
          });
          assert.deepEqual(
            drawing.outside,
            [],
            m.id + " " + state + " clipped SVG",
          );
          if (["quad", "shear"].includes(m.kind)) {
            const expectedArea = m.kind === "quad" ? 8 * value : 32;
            assert.equal(
              drawing.polygons.reduce((n, p) => n + p.area, 0) / 900,
              expectedArea,
              m.id + " polygon area",
            );
          }
          if (m.kind === "division") {
            assert.equal(
              drawing.groups.reduce((a, b) => a + b, 0),
              value,
            );
            assert(drawing.groups.slice(0, -1).every((n) => n === 21));
            assert(drawing.groups.at(-1) <= 21);
          }
          if (m.kind === "composite") {
            assert.equal(drawing.cut.width / 32, 3);
            assert.equal(drawing.cut.height / 32, value);
            assert.equal(
              (256 * 192 - drawing.cut.width * drawing.cut.height) / 1024,
              48 - 3 * value,
            );
          }
          cases.push({ state, value, drawing });
        }
        await lab
          .getByRole("button", { name: "重置模型", exact: true })
          .click();
        if (m.kind === "coordinate") {
          await lab.getByRole("slider", { name: "改变纵坐标" }).press("End");
          await expect(lab.locator("[data-model-equation]")).toHaveText(
            `A＝(${m.initial},5)`,
          );
          await lab.getByRole("button", { name: "比较交换坐标" }).click();
          assert.equal(await lab.locator("circle").count(), 2);
        }
        if (m.kind === "motion") {
          await lab.getByRole("button", { name: "比较旋转90°" }).click();
          await expect(lab.locator("[data-model-check]")).toContainText(
            "旋转90°",
          );
          assert(
            (
              await lab.locator("polygon").last().getAttribute("transform")
            ).includes("rotate(90"),
          );
        }
        if (m.kind === "chance") {
          for (let i = 0; i < 10; i++)
            await lab.getByRole("button", { name: "摸一次，放回袋中" }).click();
          await expect(lab.locator("output").last()).toContainText(
            "本页摸球 10 次",
          );
        }
        if (m.kind === "shear") {
          await slider.press("End");
          const polygons = await lab
            .locator("[data-area-piece]")
            .evaluateAll((xs) => xs.map((x) => x.getAttribute("points")));
          assert.equal(polygons.length, 2);
          assert(polygons[1].startsWith("320,230"));
        }
      }
      await page.evaluate(() => scrollTo(0, 0));
      await page.screenshot({
        path: dir + "/" + m.id + "-" + width + ".png",
        fullPage: true,
      });
      await lab.screenshot({
        path: dir + "/" + m.id + "-model-" + width + ".png",
      });
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        m.id + " page overflow",
      );
      results.push({
        id: m.id,
        width,
        problem: m.problem,
        connection: m.connection,
        initial: modelFacts(m.id, m.initial),
        cases,
        pass: true,
      });
    }
    await page.close();
  }
} finally {
  await browser.close();
  if(server){server.closeAllConnections();await new Promise((r) => server.close(r));}
}
assert.deepEqual(errors, []);
fs.writeFileSync(
  dir + "/results.json",
  JSON.stringify(
    {
      status: "PASS", nas, origin, expectedSha:nas?expected:null,
      views: results.length,
      physicalDevices: "NEEDS_USER_ACTION",
      results,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  JSON.stringify({
    legacyModels: 54,
    widths: 5,
    views: results.length,
    status: "PASS",
  }),
);
