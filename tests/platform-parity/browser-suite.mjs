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
      let bytes = 0,
        encoded = 0;
      const cdp = await context.newCDPSession(page);
      await cdp.send("Network.enable");
      cdp.on("Network.loadingFinished", (event) => {
        encoded += event.encodedDataLength;
      });
      page.on("response", async (r) => {
        if (r.url().startsWith(h.origin) && !r.url().includes("/api/"))
          try {
            bytes += (await r.body()).length;
          } catch {}
      });
      await page.goto(h.origin);
      await page.locator("#loginButton").click();
      await page.locator("#classroom").waitFor({ state: "visible" });
      const initialBytes = bytes,
        initialEncoded = encoded;
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
      const secondContext = await browser.newContext({ viewport });
      const peer = await secondContext.newPage();
      await peer.goto(h.origin);
      await peer.locator("#loginButton").click();
      await peer.locator("#classroom").waitFor({ state: "visible" });
      await peer.locator("#englishTab").click();
      await peer.waitForFunction(() =>
        document.querySelector("#identity").textContent.includes("english"),
      );
      await context.setOffline(true);
      await page.locator("#submit").click();
      await page.waitForFunction(() =>
        document.querySelector("#sync").textContent.includes("尚未同步"),
      );
      const conflictDraft = await page.evaluate(() =>
        localStorage.getItem("klh-bench-draft:synthetic-a:english"),
      );
      await peer.locator("#answer").fill("apple");
      await peer.locator("#submit").click();
      await peer.waitForFunction(() =>
        document
          .querySelector("#result")
          .textContent.includes('"status": "correct"'),
      );
      await context.setOffline(false);
      await page.locator("#retry").click();
      await page.waitForFunction(() =>
        document.querySelector("#sync").textContent.includes("冲突"),
      );
      assert.equal(
        await page.evaluate(() =>
          localStorage.getItem("klh-bench-draft:synthetic-a:english"),
        ),
        conflictDraft,
      );
      await page.locator("#resolve").click();
      await page.waitForFunction(
        () => document.querySelector("#sync").textContent === "已同步",
      );
      assert.equal(
        await page.evaluate(() =>
          localStorage.getItem(
            "klh-bench-draft:synthetic-a:english:superseded",
          ),
        ),
        conflictDraft,
      );
      await secondContext.close();
      const cold = initialBytes,
        warmBefore = bytes,
        warmEncodedBefore = encoded;
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
        warmResourceBodyBytes: bytes - warmBefore,
        initialEncodedTransferBytes: initialEncoded,
        warmEncodedTransferBytes: encoded - warmEncodedBefore,
        crossBrowserConflictRetainsDraft: true,
        explicitResolutionCreatesNewCommand: true,
        note: "decoded response-body bytes, not compressed network transfer; Chromium viewport emulation, not physical Safari/iPad",
      });
      const parentContext = await browser.newContext({ viewport });
      const mediaPage = await parentContext.newPage();
      await mediaPage.goto(h.origin);
      await mediaPage.locator("#role").selectOption("parent");
      await mediaPage.locator("#loginButton").click();
      await mediaPage.locator("#classroom").waitFor({ state: "visible" });
      const mediaResult = await mediaPage.evaluate(async () => {
        const s = await (await fetch("/api/session")).json();
        const bytes = new Uint8Array(1048576).fill(73);
        const sha256 = [
          ...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
        ]
          .map((x) => x.toString(16).padStart(2, "0"))
          .join("");
        const meta = {
          sizeBytes: bytes.length,
          mimeType: "application/octet-stream",
          sha256,
        };
        const intent = await (
          await fetch("/api/parent/media/upload-intent", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-CSRF-Token": s.csrf,
            },
            body: JSON.stringify(meta),
          })
        ).json();
        const upload = await fetch(intent.url, {
          method: "PUT",
          headers: { "Content-Type": meta.mimeType },
          body: bytes,
        });
        const commit = await fetch("/api/parent/media/commit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": s.csrf,
          },
          body: JSON.stringify({
            ...meta,
            assetId: "synthetic-browser-upload-" + innerWidth,
          }),
        });
        const privateAsset = await (
          await fetch("/api/media/synthetic-private-audio")
        ).json();
        const audio = await fetch(privateAsset.url, { credentials: "include" });
        return {
          upload: upload.status,
          commit: commit.status,
          privateDownload: audio.status,
          privateBytes: (await audio.arrayBuffer()).byteLength,
        };
      });
      assert.deepEqual(mediaResult, {
        upload: 200,
        commit: 200,
        privateDownload: 200,
        privateBytes: 1048576,
      });
      results.at(-1).browserDirectObjectUpload = mediaResult;
      await parentContext.close();
      await context.close();
    }
  } finally {
    await browser.close();
  }
  return results;
}
