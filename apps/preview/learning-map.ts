import { z } from "zod";
import { lessonId, type Catalog } from "./contract.ts";
const label = z.string().min(1).max(240),
  ids = z.array(lessonId).min(1).max(70);
export const learningMapSchema = z.strictObject({
  schemaVersion: z.literal(1),
  sourceCommit: z.literal("a7c05aaa8d9c5eabae4f3453807f830da1cbf279"),
  sourceFileSha256: z.string().regex(/^[a-f0-9]{64}$/),
  units: z
    .array(
      z.strictObject({
        id: label,
        term: z.enum(["upper", "lower"]),
        title: label,
        printedPages: label,
        coverage: z
          .array(z.strictObject({ topic: label, lessons: ids }))
          .min(1)
          .max(70),
        sequence: ids,
        supplemental: z.array(lessonId).max(3),
      }),
    )
    .length(17),
  bridgeGroups: z
    .array(z.strictObject({ id: lessonId, title: label, lessons: ids }))
    .length(4),
});
export type LearningMap = z.infer<typeof learningMapSchema>;
export type MapUnit = LearningMap["units"][number];
export type Entry = Catalog["lessons"][number];
export const termTitles = {
  upper: "三年级上册",
  lower: "三年级下册",
  bridge: "基础衔接与数学思维",
} as const;
export type Term = keyof typeof termTitles;
const unitOrder = [
  "G3-U01",
  "G3-U02",
  "G3-U03",
  "G3-UP01",
  "G3-U04",
  "G3-UP02",
  "G3-U05",
  "G3-U06",
  "G3-U07",
  "G3-L01",
  "G3-L02",
  "G3-L03",
  "G3-L04",
  "G3-L05",
  "G3-LP01",
  "G3-L06",
  "G3-L07",
];
export function validateLearningMap(
  raw: unknown,
  catalog: Catalog,
): LearningMap {
  const map = learningMapSchema.parse(raw),
    byId = new Map(catalog.lessons.map((l) => [l.lessonId, l]));
  const check = (ok: unknown) => {
    if (!ok) throw Error("LEARNING_MAP_INTEGRITY_FAILED");
  };
  check(map.units.map((x) => x.id).join("|") === unitOrder.join("|"));
  const assigned: string[] = [];
  for (const [i, u] of map.units.entries()) {
    check(u.term === (i < 9 ? "upper" : "lower"));
    check(new Set(u.sequence).size === u.sequence.length);
    const covered = u.coverage.flatMap((x) => x.lessons),
      supp = u.supplemental;
    check(new Set([...covered, ...supp]).size === u.sequence.length);
    check([...covered, ...supp].length === u.sequence.length);
    check([...covered, ...supp].every((id) => u.sequence.includes(id)));
    check(
      supp.length === 0 ||
        (u.id === "G3-U03" &&
          supp.join("|") === "G3-U03-E01|G3-U03-E02|G3-U03-O01"),
    );
    for (const id of u.sequence) {
      const l = byId.get(id),
        t = l?.textbookUnit;
      check(
        t &&
          t.id === u.id &&
          t.term === u.term &&
          t.title === u.title &&
          t.printedPages === u.printedPages,
      );
    }
    const reference = byId
      .get(u.sequence[0])!
      .textbookUnit!.sequence.filter((id) => u.sequence.includes(id));
    check(
      u.sequence.slice(0, reference.length).join("|") === reference.join("|"),
    );
    assigned.push(...u.sequence);
  }
  check(
    map.units.filter((x) => x.term === "upper").flatMap((x) => x.sequence)
      .length === 39,
  );
  check(
    map.units.filter((x) => x.term === "lower").flatMap((x) => x.sequence)
      .length === 24,
  );
  check(new Set(map.bridgeGroups.map((x) => x.id)).size === 4);
  for (const g of map.bridgeGroups) {
    for (const id of g.lessons)
      check(byId.has(id) && !byId.get(id)!.textbookUnit);
    assigned.push(...g.lessons);
  }
  check(
    assigned.length === 70 &&
      new Set(assigned).size === 70 &&
      assigned.every((id) => byId.has(id)),
  );
  // Existing prerequisites are recommendations, never locked routes. Reject cycles.
  const visiting = new Set<string>(),
    visited = new Set<string>();
  function visit(id: string) {
    check(!visiting.has(id));
    if (visited.has(id)) return;
    visiting.add(id);
    for (const p of byId.get(id)?.recommendedPrerequisites ?? [])
      if (byId.has(p)) visit(p);
    visiting.delete(id);
    visited.add(id);
  }
  for (const id of assigned) visit(id);
  return map;
}
export function mapHref(term?: Term, unit?: string) {
  const p = new URLSearchParams();
  if (term) p.set("term", term);
  if (unit) p.set("unit", unit);
  return "/subjects/math" + (p.size ? "?" + p : "");
}
export function lessonHref(id: string) {
  return "/subjects/math/lessons/" + encodeURIComponent(id);
}
export function lessonLocation(map: LearningMap, id: string) {
  const unit = map.units.find((u) => u.sequence.includes(id));
  const bridge = map.bridgeGroups.find((g) => g.lessons.includes(id));
  return {
    term: (unit?.term ?? "bridge") as Term,
    unit,
    bridge,
    returnHref: unit
      ? mapHref(unit.term, unit.id)
      : mapHref("bridge", bridge?.id),
    returnTitle: unit?.title ?? bridge?.title ?? termTitles.bridge,
  };
}
export function neighborLessons(
  map: LearningMap,
  catalog: Catalog,
  id: string,
) {
  const { term } = lessonLocation(map, id),
    order =
      term === "bridge"
        ? map.bridgeGroups.flatMap((x) => x.lessons)
        : map.units.filter((u) => u.term === term).flatMap((u) => u.sequence),
    i = order.indexOf(id),
    byId = new Map(catalog.lessons.map((l) => [l.lessonId, l]));
  return [byId.get(order[i - 1]), byId.get(order[i + 1])];
}
export function trackOf(l: Entry) {
  return /-R\d+$/.test(l.lessonId) ? "review" : l.track;
}
export const trackNames: Record<string, string> = {
  foundation: "课本主线 B",
  enhancement: "本章提升 E",
  olympiad: "数学思想 O",
  review: "复习 R",
};
const normalize = (s: string) =>
  s.toLowerCase().replace(/[\s，。、：:；;（）()·—–-]/g, "");
const synonyms: Record<string, string[]> = {
  四则: ["加法", "减法", "乘法", "除法", "混合运算"],
  乘除顺序: ["先乘除", "混合运算"],
  时间: ["时刻", "时长", "年", "月", "日"],
  时刻与时长: ["时刻", "时长"],
  方盒: ["纸盒", "正方体"],
  分米: ["毫米", "厘米", "米"],
};
export function searchLessons(
  map: LearningMap,
  catalog: Catalog,
  query: string,
) {
  const q = normalize(query.trim());
  if (!q) return [];
  const words = [q, ...(synonyms[q] ?? []).map(normalize)];
  return catalog.lessons.flatMap((l) => {
    const at = lessonLocation(map, l.lessonId),
      topic =
        at.unit?.coverage.find((c) => c.lessons.includes(l.lessonId))?.topic ??
        (at.unit ? "补充拓展" : at.bridge!.title);
    const text = normalize(
      [
        l.title,
        l.shortTitle,
        l.lessonId,
        at.unit?.title,
        at.bridge?.title,
        topic,
        termTitles[at.term],
      ]
        .filter(Boolean)
        .join(" "),
    );
    return words.some((w) => text.includes(w))
      ? [{ lesson: l, ...at, topic }]
      : [];
  });
}
