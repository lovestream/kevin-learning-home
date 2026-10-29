import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  legacyModels,
  modelFacts,
  type LessonModel,
} from "../../apps/preview/library/legacy-models.ts";
// Separate arithmetic oracle. Does not call diagram, formula or model helpers.
function expected(m: LessonModel, n: number, t: boolean): number {
  switch (m.kind) {
    case "place":
      return 306040;
    case "round":
      return n < 350 ? 300 : n < 450 ? 400 : 500;
    case "angle":
    case "coordinate":
    case "fraction-division":
    case "decimal-division":
    case "signed":
      return n;
    case "product":
      return 180 + 6 * n;
    case "division":
      return Math.floor(n / 21);
    case "laws":
      return 25 + 17 + 13;
    case "quad":
      return n * (t ? 6 : 8);
    case "land":
      return n ? 1000000 : 10000;
    case "chart":
      return 13 + n;
    case "units":
      return 1000 * n;
    case "animals":
      return 20 + 2 * n;
    case "tree":
      return 2 * n;
    case "period":
      return (n + 3) % 4;
    case "reverse":
      return m.id === "g4-working-backward"
        ? (n - 54) / 3
        : m.id === "g5-reverse-equation"
          ? (n - 36) / 4
          : (n - 16) / 2;
    case "drawers": {
      const k = m.id.startsWith("g4") ? 3 : m.id.startsWith("g5") ? 5 : 12;
      for (let count = 0; ; count++) if (count * k >= n) return count;
    }
    case "age":
      return 4;
    case "pairs":
      return Array.from({ length: n }, (_, i) => i + 1).reduce(
        (a, b) => a + b,
        0,
      );
    case "sticks":
      return n * 2 + n + 1;
    case "decimal-product":
      return (13 * n) / 100;
    case "equivalent":
      return 0.5;
    case "composite":
      return 5 * 6 + 3 * (6 - n);
    case "volume":
      return n * 4 * 3;
    case "equation":
      return 19 - 7;
    case "chance":
      return n / (n + 3);
    case "factors":
      return n ? 2 : 8;
    case "motion":
      return 3 + 3;
    case "digits":
      return Number(n === 0 || n === 6);
    case "average":
      return (6 + 8 + n) / 3;
    case "shear":
      return 8 * 4;
    case "work":
      return 6 * n + 4 * n;
    case "sequence": {
      let v = 2;
      for (let i = 1; i < n; i++) v += 3;
      return v;
    }
    case "fraction-product":
      return (3 * n) / (4 * 3);
    case "ratio":
      return 2 * n + 3 * n;
    case "percent":
      return n / 100;
    case "circle":
      return n * n;
    case "sector":
      return n * 3.6;
    case "cylinder":
      return 20 * n;
    case "proportion":
      return n * 5;
    case "combinations": {
      let count = 0;
      for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) count++;
      return count;
    }
    case "extreme":
      return n * (6 - n);
    case "parity":
      return n % 2;
    case "speed":
      return n * 6;
    case "dice": {
      let count = 0;
      for (let a = 1; a <= 6; a++)
        for (let b = 1; b <= 6; b++) if (a + b === n) count++;
      return count;
    }
  }
}
const bank = JSON.parse(
  readFileSync("apps/preview/library/private/bank.json", "utf8"),
) as {
  entries: { id: string; kind: string }[];
  practice: { lessonId: string; taskSets: Record<string, { id: string }[]> }[];
};
test("54 exact installed higher-grade lessons have distinct semantic parameters and all eight original tasks", () => {
  const ids = bank.entries
    .filter((e) => e.kind === "legacy")
    .map((e) => e.id)
    .sort();
  assert.equal(ids.length, 54);
  assert.deepEqual(legacyModels.map((m) => m.id).sort(), ids);
  assert.equal(new Set(legacyModels.map((m) => m.problem)).size, 54);
  assert.equal(legacyModels.filter((m) => m.id.startsWith("g4")).length, 18);
  for (const m of legacyModels) {
    const tasks = Object.values(
      bank.practice.find((l) => l.lessonId === m.id)!.taskSets,
    ).flat();
    assert.equal(tasks.length, 8, m.id);
    assert.equal(new Set(tasks.map((t) => t.id)).size, 8);
  }
});
for (const m of legacyModels)
  test(`${m.id}: real problem, dimensional model, independent arithmetic across every permitted parameter`, () => {
    assert(m.problem.length > 14 && m.connection.length > 15);
    assert.equal((m.initial - m.min) % m.step, 0);
    for (let n = m.min; n <= m.max; n += m.step)
      for (const t of [false, true]) {
        const f = modelFacts(m.id, n, t);
        assert(
          Math.abs(f.result - expected(m, n, t)) < 1e-8,
          m.id + " " + n + " " + t,
        );
        assert(f.formula.length > 3 && f.check.length > 6);
        assert(!/NaN|Infinity/.test(f.formula + f.check));
        if (["quad", "composite", "shear", "extreme"].includes(m.kind))
          assert.equal(f.unit, "平方厘米");
        if (["volume", "cylinder"].includes(m.kind))
          assert.equal(f.unit, "立方厘米");
      }
    assert.throws(() => modelFacts(m.id, m.max + m.step));
  });

test("slider display uses actual length/count or mode, not an internal index as a physical unit", async () => {
  const { modelControlValue } =
    await import("../../apps/preview/library/legacy-models.ts");
  assert.equal(modelControlValue("g5-decimal-multiply", 24), "2.4米");
  assert.equal(modelControlValue("g4-area-unit", 0), "边长100米（1公顷）");
  assert.equal(modelControlValue("g5-factors-primes", 1), "23个小方块");
  assert.equal(
    modelControlValue("g5-area-invariant", 1),
    "已剪拼，面积仍32平方厘米",
  );
  assert.equal(modelControlValue("g4-matchstick-pattern", 3), "3个正方形");
});
