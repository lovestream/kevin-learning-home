// Golden relationships from the frozen source's pure model tests. No old store or source.mjs execution.
import test from "node:test";
import assert from "node:assert/strict";
import {
  coreModels,
  initialCoreState,
  measureCore,
  validateCoreState,
  digits4,
} from "../../apps/preview/adapters/source/shared/core-models.mjs";
import {
  textbookModels,
  initialTextbookState,
  measureTextbook,
  validateTextbookState,
  monthDays,
  gridCells,
  gridPerimeter,
} from "../../apps/preview/adapters/source/shared/textbook-models.mjs";
import {
  foldedFaces,
  faceRelation,
  cubeProjection,
  boxFaces,
  projectPoint,
  scaleMass,
  balanceState,
  boatState,
  handsOnModels,
} from "../../apps/preview/adapters/source/shared/hands-on-models.mjs";
import {
  boardMeasure,
  chainMeasure,
  intervalMeasure,
  rulerReading,
} from "../../apps/preview/adapters/source/shared/length-model.mjs";
import {
  operationModels,
  measureOperationModel,
  arrayTurnPoint,
} from "../../apps/preview/adapters/source/shared/operation-models.mjs";
const near = (a, b) => assert(Math.abs(a - b) < 1e-8),
  distance = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
test("all 11 core models × 6 authored contexts initialize and preserve finite parameter domains", () => {
  assert.equal(Object.keys(coreModels).length, 11);
  let checked = 0;
  for (const model of Object.values(coreModels))
    for (let choice = 0; choice < 6; choice++) {
      const state = initialCoreState(model, choice);
      assert.doesNotThrow(() => measureCore(model, state));
      assert.doesNotThrow(() => validateCoreState(model, state));
      checked++;
      if (model.type === "product-place") {
        const [per, groups] = model.cases[choice];
        for (let group = 1; group <= groups; group++) {
          state.placed++;
          state.bank = state.bank.map((n, i) => n + digits4(per)[i]);
          assert.equal(measureCore(model, state).total, per * group);
        }
        for (let i = 3; i >= 1; i--)
          while (state.bank[i] >= 10) {
            state.bank[i] -= 10;
            state.bank[i - 1]++;
            assert.equal(measureCore(model, state).total, per * groups);
          }
        assert.deepEqual(state.bank, digits4(per * groups));
        assert(measureCore(model, state).normalized);
        const wrong = {
          ...state,
          bank: state.bank.map((n, i) => n + (i === 3 ? 1 : 0)),
        };
        assert.throws(() => validateCoreState(model, wrong));
      }
      if (model.type === "share-place") {
        const [total, groups] = model.cases[choice];
        state.bank = [0, 0, 0, 0];
        state.alloc = Array.from({ length: groups }, () =>
          digits4(total / groups),
        ).flat();
        assert(measureCore(model, state).equal);
        const wrong = [...state.alloc],
          digit = digits4(total / groups).findIndex((n) => n > 0);
        wrong[digit]--;
        wrong[digit + 4]++;
        assert(!measureCore(model, { ...state, alloc: wrong }).equal);
      }
    }
  assert.equal(checked, 66);
});
test("35 textbook models initialize; angle invariants, unit changes and unequal allocations remain mathematical", () => {
  assert.equal(Object.keys(textbookModels).length, 35);
  for (const model of Object.values(textbookModels))
    assert.doesNotThrow(() =>
      measureTextbook(model, initialTextbookState(model)),
    );
  const angle = textbookModels["G3-U05-B02"],
    s = initialTextbookState(angle);
  for (const sideLength of [55, 100, 170])
    for (const rotation of [0, 90, 180, 270])
      assert.equal(
        measureTextbook(angle, { ...s, sideLength, rotation }).degrees,
        45,
      );
  assert.equal(measureTextbook(angle, { ...s, angle: 90 }).kind, "直角");
  assert.equal(measureTextbook(angle, { ...s, angle: 120 }).kind, "钝角");
  const place = textbookModels["G3-U04-B02"];
  assert.equal(
    measureTextbook(place, { ...initialTextbookState(place), bank: [0, 4, 8] })
      .total,
    48,
  );
  assert.throws(() =>
    validateTextbookState(place, {
      ...initialTextbookState(place),
      bank: [0, 4, 9],
    }),
  );
});
test("fractions regroup without changing length; areas and common edges are conserved correctly", () => {
  const fraction = textbookModels["G3-U06-E01"],
    f = initialTextbookState(fraction);
  for (let parts = 2; parts <= 10; parts++) {
    const measured = measureTextbook(fraction, {
      ...f,
      parts,
      cuts: Array.from({ length: parts + 1 }, (_, i) => (i * 2520) / parts),
    });
    assert(measured.equal);
    assert.equal(measured.length, 840);
  }
  assert.equal(
    measureTextbook(fraction, { ...f, cuts: [0, 600, 1260, 1890, 2520] }).equal,
    false,
  );
  const joining = textbookModels["G3-L03-E01"],
    j = initialTextbookState(joining);
  assert.equal(measureTextbook(joining, j).perimeter, 24);
  assert.equal(measureTextbook(joining, { ...j, offset: 0 }).perimeter, 18);
  const cut = textbookModels["G3-L04-B03"],
    c = initialTextbookState(cut);
  assert.equal(measureTextbook(cut, c).area, 40);
  assert.equal(measureTextbook(cut, { ...c, left: 8, top: 0 }).area, 40);
  assert(measureTextbook(cut, { ...c, left: 0, top: 0 }).overlap > 0);
  assert.equal(gridCells(cut, c).length, 40);
  assert.equal(
    gridPerimeter([
      [0, 0],
      [1, 0],
    ]),
    6,
  );
});
test("calendar leap years and clock fields use the copied time model without persistence", () => {
  assert.equal(monthDays(2024, 2), 29);
  assert.equal(monthDays(2100, 2), 28);
  assert.equal(monthDays(2000, 2), 29);
  const model = textbookModels["G3-LP01-B02"],
    state = initialTextbookState(model);
  assert.doesNotThrow(() => validateTextbookState(model, state));
  assert.notDeepEqual(
    measureTextbook(model, { ...state, minutes: state.minutes + 15 }),
    measureTextbook(model, state),
  );
});
test("continuous folding preserves six faces, edge lengths, and the final cube topology", () => {
  for (let progress = 0; progress <= 100; progress++)
    for (const f of foldedFaces(progress)) {
      for (let i = 0; i < 4; i++)
        near(distance(f.points[i], f.points[(i + 1) % 4]), 1);
      near(distance(f.points[0], f.points[2]), Math.SQRT2);
    }
  const faces = foldedFaces(100),
    key = (p) => p.map((v) => v.toFixed(6)).join(","),
    vertices = new Set(),
    edges = new Map();
  for (const f of faces)
    for (let i = 0; i < 4; i++) {
      vertices.add(key(f.points[i]));
      const edge = [key(f.points[i]), key(f.points[(i + 1) % 4])]
        .sort()
        .join("|");
      edges.set(edge, (edges.get(edge) ?? 0) + 1);
    }
  assert.equal(vertices.size, 8);
  assert.equal(edges.size, 12);
  assert([...edges.values()].every((n) => n === 2));
  for (const a of faces)
    for (const b of faces)
      if (a.id !== b.id) {
        const shared = a.points.filter((p) =>
          b.points.some((q) => distance(p, q) < 1e-8),
        ).length;
        assert.equal(shared, faceRelation(a.id, b.id) === "opposite" ? 0 : 2);
      }
  assert.throws(() => foldedFaces(101));
});
test("observer projection, hidden cubes, weighing and equal waterline substitution match source goldens", () => {
  const box = boxFaces(2.4, 1.5, 1.2),
    before = JSON.stringify(box);
  for (const [a, e, w, h] of [
    [0, 0, 2.4, 1.5],
    [90, 0, 1.2, 1.5],
    [0, 90, 2.4, 1.2],
  ]) {
    const points = box.flatMap((f) =>
      f.points.map((p) => projectPoint(p, a, e)),
    );
    near(
      Math.max(...points.map((p) => p.x)) - Math.min(...points.map((p) => p.x)),
      w,
    );
    near(
      Math.max(...points.map((p) => p.y)) - Math.min(...points.map((p) => p.y)),
      h,
    );
  }
  assert.equal(JSON.stringify(box), before);
  assert.deepEqual(cubeProjection(1, "front"), cubeProjection(2, "front"));
  assert.notDeepEqual(cubeProjection(1, "right"), cubeProjection(2, "right"));
  assert.equal(scaleMass([2]), 1000);
  assert.equal(scaleMass([0, 1], "container"), 380);
  assert.equal(scaleMass([2], "container") - scaleMass([0], "container"), 260);
  assert.equal(balanceState([1, 1]).angle, 0);
  const boat = handsOnModels["G3-UP01-B02"];
  assert(boatState(boat, { boatStones: [1, 3, 4] }).replacementValid);
  assert(
    boatState(boat, { boatStones: [2, 5], passenger: true }).sameWaterline,
  );
  assert(
    !boatState(boat, { boatStones: [2, 5], passenger: true }).replacementValid,
  );
});
test("ruler, intervals, overlapping boards and chain joints retain physical units", () => {
  assert.deepEqual(rulerReading(35, 53), {
    startMm: 35,
    endMm: 88,
    lengthMm: 53,
  });
  assert.deepEqual(intervalMeasure(24000, 4000, false), {
    segments: 6,
    points: 7,
  });
  assert.deepEqual(intervalMeasure(24000, 4000, true), {
    segments: 6,
    points: 6,
  });
  assert.equal(boardMeasure([300, 250], [80]).totalMm, 470);
  assert.equal(boardMeasure([300, 250], [30]).totalMm, 520);
  assert.throws(() => boardMeasure([200, 200, 200], [150, 150]));
  assert.deepEqual(chainMeasure(40, 5, 4).starts, [0, 30, 60, 90]);
  assert.equal(chainMeasure(40, 5, 4).totalMm, 130);
  assert.equal(chainMeasure(40, 5, 5).totalMm, 160);
});
test("operation array cuts, inverse flow and substitution preserve original mathematical semantics", () => {
  const wallet = measureOperationModel(operationModels["G3-U02-E03"]);
  assert.equal(wallet.final, 52);
  assert.equal(wallet.counterexample, 40);
  const groups = measureOperationModel(operationModels["G3-U02-E02"]);
  assert.equal(groups.people, 12);
  assert.equal(groups.perPerson, 4);
  assert.equal(measureOperationModel(operationModels["G3-U02-O02"]).total, 60);
  assert.equal(measureOperationModel(operationModels["G3-U02-O01"]).unknown, 4);
  for (const model of [
    operationModels["G3-U02-E04"],
    operationModels["G3-U02-E05"],
  ])
    for (let cut = 1; cut < model.cols; cut++) {
      const m = measureOperationModel(model, { cut });
      assert.equal(m.left + m.right, model.rows * model.cols);
    }
  for (const turn of [0, 0.25, 0.5, 0.75, 1]) {
    const a = arrayTurnPoint(0, 0, 4, 3, turn),
      b = arrayTurnPoint(1, 0, 4, 3, turn);
    near(Math.hypot(a.x - b.x, a.y - b.y), 1);
  }
});
