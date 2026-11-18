import test from "node:test";
import assert from "node:assert/strict";
import {
  findSpaces,
  learningSpaces,
  pinnedSpaces,
  type LearningSpace,
} from "../../apps/preview/home/spaces.ts";
test("30 future spaces remain discoverable without increasing the fixed navigation", () => {
  const expanded: LearningSpace[] = [
    ...learningSpaces,
    ...Array.from({ length: 30 }, (_, i) => ({
      id: "future-" + i,
      title: "合成学科 " + i,
      description: "扩展测试",
      keywords: ["future-" + i],
      href: "/subjects/future-" + i,
      available: true,
    })),
  ];
  assert.equal(pinnedSpaces(expanded).length, 3);
  assert.equal(findSpaces("future-29", expanded)[0].id, "future-29");
  const allPinned = expanded.map((s) => ({ ...s, pinned: true }));
  assert.equal(pinnedSpaces(allPinned).length, 4);
});
test("unavailable growth spaces have no actionable route or fake installed curriculum", () => {
  for (const id of ["growth"]) {
    const s = learningSpaces.find((v) => v.id === id)!;
    assert.equal(s.available, false);
    assert.equal(s.href, null);
    assert(!pinnedSpaces().includes(s));
  }
  assert.equal(findSpaces("english")[0].id, "english");
  assert.equal(findSpaces(" math ")[0].id, "math");
  assert.deepEqual(findSpaces("未知合成学科"), []);
});

test("English occupies one real subject route, never one nav item per group", () => {
  const s = learningSpaces.find((s) => s.id === "english")!;
  assert.equal(s.href, "/subjects/english");
  assert(s.available);
  assert(pinnedSpaces().includes(s));
});
