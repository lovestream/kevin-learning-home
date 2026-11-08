// Read only pinned public curriculum metadata, never export source lessons/answers.
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { canonical } from "../../apps/preview/contract.ts";
const repo = process.argv[2];
if (!repo) throw Error("EXPLICIT_FROZEN_SOURCE_REQUIRED");
const commit = "a7c05aaa8d9c5eabae4f3453807f830da1cbf279",
  path = "content/course-plan-v2/grade-3.json";
const git = (...a) =>
  execFileSync("git", ["-C", repo, ...a], {
    env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
    maxBuffer: 8e6,
  });
const before = git("status", "--porcelain=v1", "-z");
if (git("rev-parse", "HEAD").toString().trim() !== commit)
  throw Error("FROZEN_SOURCE_MISMATCH");
const raw = git("show", commit + ":" + path),
  source = JSON.parse(raw),
  catalogPath = "apps/preview/content/catalog.json",
  catalog = JSON.parse(fs.readFileSync(catalogPath));
const hash = (b) => createHash("sha256").update(b).digest("hex");
const units = source.units.map((u) => {
  const rows = catalog.lessons.filter((l) => l.textbookUnit?.id === u.id);
  const ordered = rows[0].textbookUnit.sequence.filter((id) =>
    rows.some((l) => l.lessonId === id),
  );
  if (
    rows.some(
      (l) =>
        JSON.stringify(l.textbookUnit.sequence) !==
        JSON.stringify(rows[0].textbookUnit.sequence),
    )
  )
    throw Error("UNIT_SEQUENCE_DRIFT");
  // Frozen pilot's three U03 extensions are absent from every textbook sequence.
  // Append them in their original pilot/catalog order, never invent a textbook position.
  const sequence = [
    ...ordered,
    ...rows.map((l) => l.lessonId).filter((id) => !ordered.includes(id)),
  ];
  return {
    id: u.id,
    term: u.term,
    title: u.title,
    printedPages: u.printedPages,
    coverage: u.coverage.map((c) => ({
      topic: c.topic,
      lessons: [...c.lessons],
    })),
    sequence,
    supplemental: sequence.filter(
      (id) => !u.coverage.some((c) => c.lessons.includes(id)),
    ),
  };
});
const bridgeGroups = [
  {
    id: "quantity-operations",
    title: "数量与运算",
    lessons: [
      "numbers.quantity.intro",
      "numbers.addition.meaning",
      "numbers.subtraction.meaning",
    ],
  },
  { id: "fractions", title: "分数", lessons: ["numbers.fractions.meaning"] },
  {
    id: "area-perimeter",
    title: "面积与周长",
    lessons: ["geometry.area.perimeter"],
  },
  {
    id: "equality",
    title: "等量替换与天平",
    lessons: ["algebra.balance.intro", "algebra.substitution.intro"],
  },
];
const value = {
  schemaVersion: 1,
  sourceCommit: commit,
  sourceFileSha256: hash(raw),
  units,
  bridgeGroups,
};
const bytes = JSON.stringify(value, null, 2) + "\n";
fs.writeFileSync("apps/preview/content/learning-map.json", bytes);
catalog.navigationSha256 = hash(canonical(value));
fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + "\n");
const evidence = "docs/implementation/evidence/math-full-r3";
fs.mkdirSync(evidence, { recursive: true });
const component = "src/UnitLearningMap.tsx";
const sourceValueHashes = source.units.flatMap((u, i) =>
  ["id", "term", "title", "printedPages", "coverage", "sequence"].map(
    (key) => ({
      pointer: "/units/" + i + "/" + key,
      sha256: hash(canonical(u[key])),
    }),
  ),
);
fs.writeFileSync(
  evidence + "/source.json",
  JSON.stringify(
    {
      commit,
      path,
      gitBlob: git("rev-parse", commit + ":" + path)
        .toString()
        .trim(),
      sourceSha256: hash(raw),
      target: "apps/preview/content/learning-map.json",
      targetSha256: hash(bytes),
      sourceValueHashes,
      projection:
        "units[].id/term/title/printedPages/coverage.topic/coverage.lessons/sequence only; three U03 supplements absent from textbook sequence appended in frozen pilot/catalog order; bridge labels are editorial navigation, not textbook chapters",
      referenceComponent: {
        path: component,
        sha256: hash(git("show", commit + ":" + component)),
        copied: false,
      },
      license:
        "User-authorized reuse of own frozen project; no textbook PDF, game assets, answers or learning records.",
    },
    null,
    2,
  ) + "\n",
);
if (!before.equals(git("status", "--porcelain=v1", "-z")))
  throw Error("OLD_WORKTREE_CHANGED");
console.log(
  JSON.stringify({
    status: "PINNED_METADATA_ONLY_IMPORTED",
    units: units.length,
    upper: units
      .filter((x) => x.term === "upper")
      .reduce((n, x) => n + x.sequence.length, 0),
    lower: units
      .filter((x) => x.term === "lower")
      .reduce((n, x) => n + x.sequence.length, 0),
    bridges: bridgeGroups.flatMap((x) => x.lessons).length,
    supplemental: units.flatMap((x) => x.supplemental),
  }),
);
