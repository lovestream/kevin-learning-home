import type { FullLesson } from "./contract.ts";
const registered = new Map<string, { visual: string; interactive: boolean }>();
function register(
  prefix: string,
  names: string[],
  visual: string,
  interactive = true,
) {
  for (const name of names) {
    const key = prefix + name;
    if (registered.has(key)) throw Error("DUPLICATE_ADAPTER");
    registered.set(key, { visual, interactive });
  }
}
register("spatial:", ["observe", "hidden", "fold"], "SpatialWorkbench");
register("mass:", ["weigh", "boat"], "MassWorkbench");
register(
  "operations:",
  [
    "wallet",
    "division-groups",
    "laws",
    "split-array",
    "reverse",
    "substitution",
  ],
  "OperationExtensionLab",
);
register(
  "textbook:",
  [
    "product-place",
    "place-value",
    "estimate-product",
    "coding",
    "angle",
    "fraction",
    "fraction-core",
    "outfits",
    "paper-fold",
    "motion",
    "share-place",
    "division",
    "pack-remainder",
    "nested-groups",
    "invariant-table",
    "boundary",
    "joining",
    "tiling",
    "cut-area",
    "vote",
    "data-bins",
    "calendar",
    "clock",
    "decimal",
    "sets",
  ],
  "TextbookWorkbench",
);
register(
  "static:",
  ["angles", "planning", "boundary", "areaGrid", "decimals", "sets"],
  "StaticConceptFigure",
  false,
);
register(
  "",
  [
    "mixedOperations",
    "lengthWorkbench",
    "fraction",
    "area",
    "substitution",
    "balance",
    "quantity",
    "addition",
    "subtraction",
  ],
  "TeachingWidget",
);
export function adapterFor(lesson: FullLesson) {
  let key: string = lesson.widget;
  if (key === "conceptLab") {
    const s = lesson.conceptScenes[0]!;
    key = s.handsOnSpec
      ? s.handsOnSpec.type + ":" + s.handsOnSpec.mode
      : s.modelSpec
        ? "operations:" + s.modelSpec.type
        : s.textbookSpec
          ? "textbook:" + s.textbookSpec.type
          : "static:" + s.family;
  }
  const adapter = registered.get(key);
  if (
    !adapter ||
    adapter.interactive !== (lesson.interactionStatus === "verified")
  )
    throw Error("UNREVIEWED_ADAPTER_OR_STATUS");
  return { key, ...adapter };
}
