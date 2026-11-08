import assert from "node:assert/strict";
import { expect } from "@playwright/test";
import {
  firstOperationOptions,
  evaluateExpressionAST,
  formatFraction,
} from "../../apps/preview/adapters/source/shared/pilot-math.mjs";
import { measureOperationModel } from "../../apps/preview/adapters/source/shared/operation-models.mjs";
// Operate the actual model and assert its mathematical output, rather than just ticking "I predicted".
export async function exercise(lab, article, lesson) {
  const scene = lesson.conceptScenes[0],
    model = scene?.modelSpec;
  if (model) {
    const m = measureOperationModel(model);
    if (model.type === "wallet") {
      await lab
        .getByRole("button", {
          name: model.pay + "－" + model.refund,
          exact: true,
        })
        .click();
      await lab
        .getByRole("button", { name: "把净支出放进钱袋", exact: true })
        .click();
      await expect(lab.locator(".model-result")).toContainText(
        "逐笔余额：" + m.final + "元",
      );
    } else if (model.type === "division-groups") {
      await lab
        .getByRole("button", {
          name: `总人数＝${model.groups}×${model.perGroup}`,
          exact: true,
        })
        .click();
      await lab
        .getByRole("button", { name: "按选择平均分", exact: true })
        .click();
      await expect(lab.locator(".model-result")).toContainText(
        `每人${m.perPerson}张`,
      );
    } else if (model.type === "laws" || model.type === "split-array") {
      await lab.locator("input[type=range]").press("ArrowRight");
      await lab
        .getByRole("button", { name: "执行并核对预测", exact: true })
        .click();
      await expect(lab.locator(".model-result")).toContainText("＝" + m.total);
    } else if (model.type === "reverse") {
      await lab
        .getByRole("button", { name: "除以" + model.multiplier, exact: true })
        .click();
      await lab
        .getByRole("button", { name: "减去" + model.addend, exact: true })
        .click();
      await expect(lab.locator(".model-result")).toContainText(
        "找回□＝" + m.unknown,
      );
    } else {
      await lab
        .getByRole("button", {
          name: `□包住（${model.left}＋${model.right}）`,
          exact: true,
        })
        .click();
      await lab
        .getByRole("button", { name: "替换所选对象", exact: true })
        .click();
      await expect(lab.locator(".model-result")).toContainText("＝" + m.total);
    }
    return "computed-output:" + model.type;
  }
  if (lesson.widget === "mixedOperations") {
    const scene = lesson.mathScenes[0],
      choice = firstOperationOptions(scene.expressionAST).find(
        (x) => x.correct,
      );
    assert(choice);
    const ordered = (n) =>
      n.type === "number" ? [] : [...ordered(n.left), ...ordered(n.right), n];
    const first = ordered(scene.expressionAST)[0];
    await lab.getByRole("button", { name: choice.text, exact: true }).click();
    await lab
      .getByLabel("这一小步得到多少？", { exact: true })
      .fill(formatFraction(evaluateExpressionAST(first)));
    await lab
      .getByRole("button", { name: "按预测算第一步", exact: true })
      .click();
    await expect(lab.locator(".operation-track .done")).toHaveCount(1);
    return "mixed-first-operation-with-intermediate";
  }
  const textbook = scene?.textbookSpec;
  if (textbook && ["vote", "data-bins", "sets"].includes(textbook.type)) {
    await lab.locator(".textbook-record-tray button").first().click();
    let bin = 1;
    if (textbook.type === "data-bins")
      bin =
        textbook.bins.findIndex(
          ([lo, hi]) => textbook.data[0] >= lo && textbook.data[0] <= hi,
        ) + 1;
    if (textbook.type === "sets")
      bin = textbook.left.includes(0)
        ? textbook.right.includes(0)
          ? 2
          : 1
        : 3;
    const zone = lab.locator('[data-bin="' + bin + '"]');
    await zone.getByRole("button", { name: /放这里/ }).click();
    await expect(zone.locator(".bin-count")).toHaveText("1");
    if (textbook.type === "vote") {
      await lab
        .getByRole("button", { name: "试试给选中同学再投一票", exact: true })
        .click();
      await expect(zone.locator(".bin-count")).toHaveText("1");
      await expect(lab.locator(".textbook-feedback")).toContainText(
        "不能重复累计",
      );
    }
    return "classify-record-once:" + textbook.type;
  }
  if (scene?.handsOnSpec?.mode === "fold") {
    await lab
      .getByRole("button", { name: "播放折盒过程", exact: true })
      .click();
    await expect(lab.locator(".fold-stage-caption b")).toHaveText(
      "六个面已合成盒子",
    );
    return "fold-six-faces-to-100-percent";
  }
  const controls = lab.getByRole("button");
  for (let i = 0; i < Math.min(15, await controls.count()); i++) {
    const button = controls.nth(i);
    if (!(await button.isVisible()) || !(await button.isEnabled())) continue;
    const name = ((await button.textContent()) ?? "").trim().slice(0, 100);
    if (/重新|恢复|撤销|介绍|全屏|放大|我已想过/.test(name)) continue;
    await button.click();
    if (Number(await article.getAttribute("data-state-revision")) > 0)
      return (
        name ||
        (await button.getAttribute("aria-label")) ||
        "accessible-model-button"
      );
  }
  const range = lab.locator("input[type=range]").first();
  if (await range.count()) {
    await range.focus();
    await range.press("ArrowRight");
    if (Number(await article.getAttribute("data-state-revision")) > 0)
      return "keyboard-range-arrow";
  }
  throw Error("INTERACTIVE_MODEL_DID_NOT_CHANGE_STATE");
}
