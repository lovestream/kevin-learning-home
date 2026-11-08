import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadContent, hash } from "../../apps/preview/content.ts";
import { canonical } from "../../apps/preview/contract.ts";
import {
  validateLearningMap,
  neighborLessons,
  lessonLocation,
  searchLessons,
  trackOf,
  mapHref,
} from "../../apps/preview/learning-map.ts";
const { catalog, learningMap: map } = loadContent(process.cwd());
test("textbook map assigns 39 upper + 24 lower + 7 bridges exactly once in frozen order", () => {
  assert.equal(map.units.length, 17);
  assert.equal(map.units.filter((u) => u.term === "upper").length, 9);
  assert.equal(map.units.filter((u) => u.term === "lower").length, 8);
  const ids = [
    ...map.units.flatMap((u) => u.sequence),
    ...map.bridgeGroups.flatMap((g) => g.lessons),
  ];
  assert.equal(ids.length, 70);
  assert.equal(new Set(ids).size, 70);
  assert.deepEqual(
    new Set(ids),
    new Set(catalog.lessons.map((l) => l.lessonId)),
  );
  const sequence = map.units.find((u) => u.id === "G3-U02")!.sequence;
  assert(sequence.indexOf("G3-U02-E03") < sequence.indexOf("G3-U02-E02"));
  assert.deepEqual(map.units.find((u) => u.id === "G3-U03")!.supplemental, [
    "G3-U03-E01",
    "G3-U03-E02",
    "G3-U03-O01",
  ]);
});
test("every frozen curriculum metadata field matches a recorded source value hash, no source lessons exported", () => {
  const evidence = JSON.parse(
    readFileSync(
      "docs/implementation/evidence/math-full-r3/source.json",
      "utf8",
    ),
  );
  assert.equal(hash(readFileSync(evidence.target)), evidence.targetSha256);
  assert.equal(map.sourceFileSha256, evidence.sourceSha256);
  assert.equal(hash(canonical(map)), catalog.navigationSha256);
  assert.equal(evidence.sourceValueHashes.length, 102);
  for (const row of evidence.sourceValueHashes) {
    const [, , index, key] = row.pointer.split("/"),
      unit = map.units[Number(index)];
    const value =
      key === "sequence"
        ? unit.sequence.filter((id) => !unit.supplemental.includes(id))
        : unit[key as keyof typeof unit];
    assert.equal(hash(canonical(value)), row.sha256, row.pointer);
  }
  assert(!("lessons" in map));
  assert(
    !/"(?:expected|solution|hint|referenceAnswer|wallet|pin|rewardRuleId)"\s*:/.test(
      JSON.stringify(map),
    ),
  );
});
test("wrong units, duplicate or missing lessons, answer fields, and sequence drift fail closed", () => {
  for (const mutate of [
    (m: any) => m.units.reverse(),
    (m: any) => m.units[0].sequence.pop(),
    (m: any) => m.units[0].coverage[0].lessons.push("G3-U02-B01"),
    (m: any) => m.bridgeGroups[0].lessons.push("numbers.quantity.intro"),
    (m: any) => m.units[1].sequence.reverse(),
    (m: any) => (m.units[0].expected = "secret"),
    (m: any) => (m.units[0].term = "lower"),
  ]) {
    const changed = structuredClone(map);
    mutate(changed);
    assert.throws(() => validateLearningMap(changed, catalog));
  }
  const cyclic = structuredClone(catalog);
  cyclic.lessons[0].recommendedPrerequisites = [cyclic.lessons[1].lessonId];
  cyclic.lessons[1].recommendedPrerequisites = [cyclic.lessons[0].lessonId];
  assert.throws(() => validateLearningMap(map, cyclic));
});
test("review lessons retain R label; neighbors never cross upper/lower/bridge boundaries", () => {
  assert.equal(
    trackOf(catalog.lessons.find((l) => l.lessonId === "G3-U07-R01")!),
    "review",
  );
  for (const lesson of catalog.lessons) {
    const at = lessonLocation(map, lesson.lessonId);
    for (const neighbor of neighborLessons(map, catalog, lesson.lessonId))
      if (neighbor)
        assert.equal(lessonLocation(map, neighbor.lessonId).term, at.term);
    assert(at.returnHref.includes("unit="));
  }
  assert.equal(neighborLessons(map, catalog, "G3-U07-B01")[1], undefined);
  assert.equal(
    mapHref("upper", "G3-U02"),
    "/subjects/math?term=upper&unit=G3-U02",
  );
});
test("knowledge search matches unit, frozen topic, common keyword and context paths", () => {
  assert.equal(searchLessons(map, catalog, "混合运算").length, 12);
  assert(
    searchLessons(map, catalog, "先乘除").some(
      (r) => r.lesson.lessonId === "G3-U02-B02" && r.unit?.id === "G3-U02",
    ),
  );
  assert(
    searchLessons(map, catalog, "时长").some(
      (r) => r.term === "lower" && r.unit?.id === "G3-LP01",
    ),
  );
  assert(searchLessons(map, catalog, "四则").length > 0);
  assert.equal(searchLessons(map, catalog, "not-a-math-topic").length, 0);
  assert.equal(searchLessons(map, catalog, "   ").length, 0);
  assert.equal(lessonLocation(map, "numbers.quantity.intro").term, "bridge");
});
