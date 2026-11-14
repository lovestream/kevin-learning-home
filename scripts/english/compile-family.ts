// Read ONLY fixed, inventoried Git blobs. Untracked private word packs and records are never opened.
import { execFileSync } from "node:child_process";
import {
  readFileSync,
  mkdirSync,
  writeFileSync,
  renameSync,
  rmSync,
} from "node:fs";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";
import { runInNewContext } from "node:vm";
import {
  ENGLISH_SOURCE_SHA,
  type EnglishBundle,
  type EnglishCard,
  type EnglishGroup,
} from "../../packages/english/contract.ts";
const [repo, out, scope] = process.argv.slice(2);
if (!repo || !out || scope !== "--family-lan-source")
  throw Error(
    "USAGE: compile-family.ts SOURCE_REPO OUTPUT --family-lan-source; not a public redistribution approval",
  );
const destination = resolve(out);
if (!destination.endsWith("/.english-family"))
  throw Error("PRIVATE_BUNDLE_DIRECTORY_REQUIRED");
const inventory = JSON.parse(
  readFileSync(
    new URL("../../docs/english/source-inventory.json", import.meta.url),
    "utf8",
  ),
);
const entries = new Map<string, any>(
  inventory.files.map((x: any) => [x.path, x]),
);
const sha = (b: Buffer | string) =>
  createHash("sha256").update(b).digest("hex");
const sources: EnglishBundle["sources"] = [];
function blob(path: string) {
  const row = entries.get(path);
  if (
    !row ||
    !/^assets\/[A-Za-z0-9/._-]+$/.test(path) ||
    path.includes("..") ||
    /wordpack|wordquest|private/i.test(path)
  )
    throw Error("UNINVENTORIED_SOURCE");
  const bytes = execFileSync(
    "git",
    ["-C", resolve(repo), "show", `${ENGLISH_SOURCE_SHA}:${path}`],
    { maxBuffer: 24 * 1024 * 1024 },
  );
  if (sha(bytes) !== row.sha256 || bytes.length !== row.bytes)
    throw Error("SOURCE_HASH_MISMATCH " + path);
  sources.push({ path, sha256: row.sha256, bytes: row.bytes });
  return bytes;
}
const context: any = { window: {}, console: { log() {}, warn() {} } };
for (const path of [
  "assets/words.js",
  "assets/cambridge-official.js",
  "assets/movers-2025.js",
  "assets/core2000.js",
  "assets/core2000-answers.js",
])
  runInNewContext(blob(path).toString("utf8"), context, {
    timeout: 5000,
    contextCodeGeneration: { strings: false, wasm: false },
  });
const stage = destination + ".staging";
rmSync(stage, { recursive: true, force: true });
mkdirSync(join(stage, "media"), { recursive: true, mode: 0o700 });
const media: EnglishBundle["media"] = {};
function image(path: unknown) {
  if (typeof path !== "string" || !entries.has(path) || !path.endsWith(".webp"))
    return null;
  const bytes = blob(path),
    key = sha(bytes) + ".webp",
    url = "/preview-api/v1/english/media/" + key;
  if (!media[url])
    writeFileSync(join(stage, "media", key), bytes, { mode: 0o600 });
  media[url] = {
    path: "media/" + key,
    sha256: sha(bytes),
    bytes: bytes.length,
    type: "image/webp",
    publication: entries.get(path).publication,
  };
  return url;
}
const cards: EnglishCard[] = [];
const groups: EnglishGroup[] = [];
for (const bankId of ["core2000", "movers", "ket", "pet"]) {
  const raw = context.window.WORD_BANKS[bankId];
  for (const w of raw) {
    const imageUrl = image(w.visual?.image);
    cards.push({
      id: w.id,
      bankId,
      word: w.word,
      en: w.studyDefinition || w.en || "",
      zh: w.zh || "",
      ipa: w.ipa || "",
      pos: Array.isArray(w.pos) ? w.pos.join(", ") : w.pos || "",
      example: w.example || "",
      exampleZh: w.exampleZh || "",
      chunks: (w.breakdown?.parts || []).map((x: any) => String(x.text)),
      tip: w.tip || "",
      image: imageUrl,
      imageStatus: imageUrl ? media[imageUrl].publication : "no-source-image",
      ...(w.visual?.sourceKind === "wikimedia-commons"
        ? {
            attribution: {
              creator: w.visual.creator || "",
              license: w.visual.license || "",
              licenseUrl: w.visual.licenseUrl || "",
              sourceUrl: w.visual.sourceUrl || "",
            },
          }
        : {}),
      contentVersion: sha(JSON.stringify(w)),
      spellingVariants: w.spellingVariants || [],
      semanticAlternatives: w.semanticAlternatives || w.acceptedAnswers || [],
      quizClue: w.quizClue || "",
      ...(w.sourceBook
        ? {
            sourceBook: w.sourceBook,
            sourceUnit: w.sourceUnit,
            sourceHalf: w.sourceHalf,
          }
        : {}),
    });
  }
  if (bankId !== "core2000")
    for (let i = 0; i < raw.length; i += 10)
      groups.push({
        id: bankId + "-group-" + String(i / 10 + 1).padStart(3, "0"),
        bankId,
        title: "第 " + (i / 10 + 1) + " 组",
        book: null,
        unit: i / 10 + 1,
        half: null,
        wordIds: raw.slice(i, i + 10).map((x: any) => x.id),
        readingImages: [],
      });
}
for (const b of context.window.CORE2000_COURSE.batches)
  groups.push({
    id: b.id,
    bankId: "core2000",
    title: `Book ${b.book} · Unit ${b.unit} · Set ${b.half.toUpperCase()}`,
    book: b.book,
    unit: b.unit,
    half: b.half,
    wordIds: b.wordIds,
    exercise: {
      id: b.exercise.id,
      image: image(b.exercise.image)!,
      answerSlots:
        context.window.CORE2000_EXERCISE_ANSWERS[b.exercise.id].length,
    },
    readingImages: (b.readingImages || [])
      .map((x: any) => image(typeof x === "string" ? x : x.image))
      .filter(Boolean),
  });
const counts = Object.fromEntries(
  ["core2000", "movers", "ket", "pet"].map((b) => [
    b,
    cards.filter((c) => c.bankId === b).length,
  ]),
);
if (
  JSON.stringify(counts) !==
    JSON.stringify({ core2000: 1280, movers: 327, ket: 1802, pet: 3222 }) ||
  new Set(cards.map((c) => c.id)).size !== cards.length ||
  groups.filter((g) => g.bankId === "core2000").length !== 128
)
  throw Error("SOURCE_COUNT_INVARIANT");
const known = new Set(cards.map((c) => c.id));
if (groups.some((g) => g.wordIds.some((w) => !known.has(w))))
  throw Error("GROUP_MEMBER_MISSING");
const bundle: EnglishBundle = {
  schemaVersion: 1,
  sourceSha: ENGLISH_SOURCE_SHA,
  contentVersion: "english-" + ENGLISH_SOURCE_SHA,
  scope: "family-lan-source",
  publicationApproved: false,
  cards,
  groups,
  aliases: context.window.CORE2000_ID_ALIASES || {
    "core2000-b3-u16-b-05-fail": "core2000-b3-u16-b-05-tail",
  },
  exerciseAnswers: context.window.CORE2000_EXERCISE_ANSWERS,
  media,
  sources,
};
writeFileSync(join(stage, "bundle.json"), JSON.stringify(bundle) + "\n", {
  mode: 0o600,
});
writeFileSync(
  join(stage, "seal.json"),
  JSON.stringify({
    schemaVersion: 1,
    sourceSha: ENGLISH_SOURCE_SHA,
    bundleSha256: sha(readFileSync(join(stage, "bundle.json"))),
    scope: bundle.scope,
    publicationApproved: false,
  }) + "\n",
  { mode: 0o600 },
);
rmSync(destination, { recursive: true, force: true });
renameSync(stage, destination);
console.log(
  JSON.stringify({
    status: "FAMILY_SOURCE_COMPILED_NOT_PUBLIC_LICENSE_APPROVAL",
    sourceSha: bundle.sourceSha,
    counts,
    groups: groups.length,
    media: Object.keys(media).length,
    privateFilesRead: false,
    sourceWorkingTreeChanged: false,
  }),
);
