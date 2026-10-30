// Authored anonymous fixtures drive real staged forms, never a response mock.
import fs from "node:fs";
import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";
import { startPreview } from "../../apps/preview/server.ts";
import {
  freshTraining,
  trainingCatalog,
} from "../../packages/math-training/engine.mjs";
import { orderedReasons } from "../../packages/math-training/source/shared/detective-model.mjs";
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
const s = nas ? null : await startPreview({ enabled: true, port: 0 }),
  origin = nas ? target : "http://127.0.0.1:" + s.address().port,
  browser = await chromium.launch(),
  catalog = trainingCatalog(),
  source = Object.values(freshTraining().studio.detective.cases),
  rows = [],
  errors = [],
  dir = ".evidence/math-onepass/" + (nas ? "nas" : "local");
fs.mkdirSync(dir, { recursive: true });
try {
  if (nas)
    assert.equal(
      (await (await fetch(origin + "/preview-api/v1/runtime")).json()).buildSha,
      expected,
    );
  const context = await browser.newContext({
      viewport: { width: 1280, height: 960 },
      reducedMotion: "reduce",
    }),
    p = await context.newPage();
  p.setDefaultTimeout(10000);
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto(origin + "/subjects/math/detective");
  await p
    .locator("[data-training-case]")
    .first()
    .waitFor({ state: "attached" });
  for (const [i, entry] of catalog.cases.entries()) {
    const content = source[i].versions[0].content;
    await p.locator(".case-index summary").click();
    await p.locator('[data-training-case="' + entry.id + '"]').click();
    const desk = p.locator(".case-desk");
    await expect(desk).toHaveAttribute("data-case-id", entry.id);
    await expect(desk).toHaveAttribute("data-phase", "judge");
    await expect(p.locator(".case-index")).not.toHaveAttribute("open", "");
    await expect(p.locator(".training-room")).toHaveAttribute("aria-busy", "false");
    await expect(desk.locator("h2")).toBeFocused();
    assert.equal(await desk.locator("form").count(), 0);
    assert.equal(await desk.locator(".learning-feedback").count(), 0);
    const judgment = {
      correct: "做法正确",
      wrong: "有错误",
      insufficient: "过程不足，不能定位",
    }[content.verdict];
    await desk.getByRole("button", { name: judgment, exact: true }).click();
    await expect(desk).toHaveAttribute("data-phase", "evidence");
    const selects = desk.locator("form select");
    await selects
      .nth(0)
      .selectOption(
        content.verdict === "wrong" ? String(content.errorStep) : "",
      );
    const reason = orderedReasons(source[i].versions[0]).findIndex(
      (x) => x.index === content.reason,
    );
    await selects.nth(1).selectOption(String(reason));
    if (content.diagnosticCategory)
      await selects.nth(2).selectOption(content.diagnosticCategory);
    await desk.getByRole("button", { name: "提交依据", exact: true }).click();
    await expect(desk).toHaveAttribute("data-phase", "repair");
    for (const [phase, answer, label] of [
      ["repair", content.repair.answer, "提交修复"],
      ["verify", content.verify.answer, "提交验证"],
    ]) {
      const spec = content[phase];
      if (spec.kind === "ordering") {
        const desired = answer.split("|");
        for (let position = 0; position < desired.length; position++) {
          let current = (
            await desk.locator(".case-ordering li span").allTextContents()
          ).findIndex((x) => x.endsWith(desired[position]));
          while (current > position) {
            await desk
              .getByRole("button", {
                name: desired[position] + "上移",
                exact: true,
              })
              .click();
            current--;
          }
        }
        const keep = desk.getByRole("button", { name: "保留当前排列" });
        if (await keep.count()) await keep.click();
      } else if (spec.kind === "choice")
        await desk.locator("form select").selectOption(answer);
      else if (spec.kind === "oral") await desk.getByRole("checkbox").check();
      else await desk.locator("form input").fill(answer);
      await desk.getByRole("button", { name: label, exact: true }).click();
      if (phase === "repair")
        await expect(desk).toHaveAttribute("data-phase", "verify");
    }
    const oral =
      content.repair.kind === "oral" || content.verify.kind === "oral";
    if (oral) {
      await expect(desk).toHaveAttribute("data-status", "parent-review");
      await expect(desk).toContainText("不会冒充家长批准");
      await expect(desk.locator(".learning-feedback")).toHaveCount(0);
    } else {
      await expect(desk).toHaveAttribute("data-phase", "closed");
      await expect(desk.locator(".learning-feedback")).toContainText(
        content.solution,
      );
    }
    rows.push({
      id: entry.id,
      verdict: content.verdict,
      stepCount: entry.stepCount,
      oral,
      firstEvidenceRepairVerify: true,
    });
  }
  // L2 only offers processes with more than one step.
  await p.getByRole("button", { name: "02 找到首错" }).click();
  assert.equal(
    await p.locator("[data-training-case]").count(),
    catalog.cases.filter((c) => c.stepCount > 1).length,
  );
  // All eight family pairs and ten approved three-case collections can be
  // contrasted; their reverse/transfer action starts the actual L4 domain.
  for (const collection of catalog.collections) {
    await p.getByRole("button", { name: "03 变式对照" }).click();
    await p.getByLabel("选择变式与对照").selectOption(collection.id);
    assert.equal(
      await p.locator("[data-training-case]").count(),
      collection.caseIds.length,
    );
    const desk = p.locator(".case-desk"),
      previous = await desk.getAttribute("data-case-id");
    const a =
      collection.caseIds[
        (collection.caseIds.indexOf(previous) + 1) % collection.caseIds.length
      ];
    await p.getByRole("button", { name: "对照另一份做法" }).click();
    await expect(desk).toHaveAttribute("data-case-id", a);
    const b =
      collection.caseIds[
        (collection.caseIds.indexOf(a) + 1) % collection.caseIds.length
      ];
    await p.getByRole("button", { name: "对照另一份做法" }).click();
    await expect(desk).toHaveAttribute("data-case-id", b);
    assert.notEqual(a, b);
    const started = p.waitForResponse(
      (r) =>
        r.url().endsWith("/preview-api/v1/training/event") &&
        r.request().method() === "POST" &&
        r.request().postDataJSON().channel === "self" &&
        r.request().postDataJSON().event.action === "start",
    );
    await p.getByRole("button", { name: "换已知与所求，自己来试" }).click();
    const transfer = await (await started).json();
    assert.equal(transfer.mode, "transfer");
    assert.equal(transfer.question.errorFamilyId, collection.selfFamily);
    await expect(p.locator(".self-desk")).toContainText(
      transfer.question.prompt,
    );
    await expect(p.locator(".training-room")).toHaveAttribute(
      "aria-busy",
      "false",
    );
    await expect(p.getByLabel("选择题族")).toHaveValue(collection.selfFamily);
    rows.push({
      collection: collection.id,
      pairedControls: true,
      actualTransfer: true,
    });
  }
  // Deliver to the real server, then lose its response. Retrying the visible
  // first-answer action must replay the same event rather than overwrite it.
  await p.getByRole("button", { name: "04 自己检查" }).click();
  await p.getByLabel("选择题族").selectOption("MASS_AVERAGE");
  await p.getByRole("button", { name: "自主解题", exact: true }).click();
  await p.getByLabel("首次答案").fill("9");
  await p.getByLabel("我是这样想的").fill("合成首答：先独立留下我的思路。");
  const retryEvents = [];
  let lost = false;
  await p.route("**/preview-api/v1/training/event", async (route) => {
    const body = route.request().postDataJSON();
    if (body.channel === "self" && body.event.action === "first") {
      retryEvents.push({
        id: body.event.eventId,
        revision: body.event.expectedRevision,
      });
      if (!lost) {
        lost = true;
        const real = await route.fetch();
        assert.equal(real.status(), 200);
        await route.abort("connectionreset");
        return;
      }
    }
    await route.continue();
  });
  await p.getByRole("button", { name: "封存首答，开始自查" }).click();
  await expect(p.getByRole("alert")).toBeVisible();
  await expect(p.getByLabel("首次答案")).toHaveValue("9");
  await p.getByRole("button", { name: "封存首答，开始自查" }).click();
  await expect(p.getByText("首次想法已封存")).toBeVisible();
  assert.equal(retryEvents.length, 2);
  assert.deepEqual(retryEvents[0], retryEvents[1]);
  await expect(p.locator(".sealed-answer")).toContainText("9");
  rows.push({
    type: "real-commit-response-lost-retry",
    sameEvent: true,
    firstImmutable: true,
  });
  assert.deepEqual(errors, []);
  assert.deepEqual(await context.cookies(), []);
  await context.close();
  fs.writeFileSync(
    dir + "/cases-browser.json",
    JSON.stringify(
      {
        status: "PASS",
        nas,
        origin,
        expectedSha: nas ? expected : null,
        cases: 63,
        collections: 18,
        rows,
        errors,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    JSON.stringify({ status: "PASS", cases: 63, collections: 18, nas }),
  );
} finally {
  await browser.close();
  if (s) {
    s.closeAllConnections();
    await new Promise((r) => s.close(r));
  }
}
