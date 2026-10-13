import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
export async function runBrowserSuite(h) {
  const browser = await chromium.launch();
  const results = [];
  try {
    for (const viewport of [
      { width: 1280, height: 800 },
      { width: 768, height: 1024 },
      { width: 390, height: 844 },
    ]) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      let bytes = 0;
      page.on("response", async (r) => {
        if (r.url().startsWith(h.origin) && !r.url().includes("/api/"))
          try {
            bytes += (await r.body()).length;
          } catch {}
      });
      await page.goto(h.origin);
      await page.locator("#loginButton").click();
      await page.locator("#classroom").waitFor({ state: "visible" });
      await page.locator("#answer").fill("four");
      await page.locator("#hint").click();
      await page.waitForFunction(
        () => document.querySelector("#sync").textContent === "已同步",
      );
      await page.locator("#answer").fill("five");
      await page.locator("#submit").click();
      await page.waitForFunction(() =>
        document
          .querySelector("#result")
          .textContent.includes('"status": "correct"'),
      );
      assert(
        (await page.locator("#result").textContent()).includes(
          '"independent": false',
        ),
      );
      await page.locator("#englishTab").click();
      await page.waitForFunction(() =>
        document.querySelector("#identity").textContent.includes("english"),
      );
      await page.locator("#newAttempt").click();
      await page.waitForFunction(
        () => document.querySelector("#sync").textContent === "新一轮已准备",
      );
      await page.locator("#answer").fill("appel");
      await page.locator("#submit").click();
      await page.waitForFunction(() =>
        document
          .querySelector("#result")
          .textContent.includes('"nearMiss": true'),
      );
      await page.locator("#answer").fill("apple");
      await page.locator("#submit").click();
      await page.waitForFunction(() =>
        document
          .querySelector("#result")
          .textContent.includes('"status": "correct"'),
      );
      await page.reload();
      await page.locator("#classroom").waitFor({ state: "visible" });
      await page.locator("#englishTab").click();
      await page.waitForFunction(() =>
        document.querySelector("#identity").textContent.includes("english"),
      );
      await page.locator("#answer").fill("apple");
      await context.setOffline(true);
      await page.locator("#submit").click();
      await page.waitForFunction(() =>
        document.querySelector("#sync").textContent.includes("尚未同步"),
      );
      const draft = await page.evaluate(() =>
        localStorage.getItem("klh-bench-draft:synthetic-a:english"),
      );
      assert(draft);
      await context.setOffline(false);
      assert.equal(
        await page.evaluate(() =>
          localStorage.getItem("klh-bench-draft:synthetic-a:english"),
        ),
        draft,
      );
      await page.locator("#retry").click();
      await page.waitForFunction(
        () => document.querySelector("#sync").textContent === "已同步",
      );
      assert.equal(
        await page.evaluate(() =>
          localStorage.getItem("klh-bench-draft:synthetic-a:english"),
        ),
        null,
      );
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
        "horizontal overflow",
      );
      const cold = bytes;
      await page.reload();
      await page.locator("#classroom").waitFor({ state: "visible" });
      results.push({
        viewport,
        status: process.env.CI ? "PASS_CI" : "PASS_LOCAL",
        math: true,
        english: true,
        refresh: true,
        offlineRetryOriginalId: true,
        coldResourceBodyBytes: cold,
        warmResourceBodyBytes: bytes - cold,
        note: "decoded response-body bytes, not compressed network transfer; Chromium viewport emulation, not physical Safari/iPad",
      });
      await context.close();
    }
  } finally {
    await browser.close();
  }
  return results;
}
