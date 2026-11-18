import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { EnglishContent, englishHash } from "../../packages/english/content.ts";
import {
  ENGLISH_SOURCE_SHA,
  type EnglishBundle,
  type EnglishCard,
} from "../../packages/english/contract.ts";
export async function fixture(
  options: { additionalWords?: { word: string; zh: string }[] } = {},
) {
  const directory = mkdtempSync(join(tmpdir(), "klh-english-synthetic-"));
  mkdirSync(join(directory, "media"));
  const image = await sharp({
      create: { width: 160, height: 120, channels: 3, background: "#42816a" },
    })
      .webp()
      .toBuffer(),
    hash = englishHash(image),
    url = "/preview-api/v1/english/media/" + hash + ".webp";
  writeFileSync(join(directory, "media", hash + ".webp"), image);
  const sourceWords = [
    ...["candy", "colour", "a", "pencil"].map((word, i) => ({
      word,
      zh: ["糖果", "颜色", "一个", "铅笔"][i],
    })),
    ...(options.additionalWords ?? []),
  ];
  const cards: EnglishCard[] = sourceWords.map(({ word, zh }) => ({
    id: "synthetic-" + word,
    bankId: "core2000",
    sourceGroupId: "synthetic-group",
    word,
    en: "A " + word + " is a practice item.",
    zh,
    ipa: "",
    pos: "n.",
    example: "I see " + word + ".",
    exampleZh: "",
    chunks: [word],
    tip: "",
    image: url,
    imageStatus: "synthetic",
    contentVersion: "synthetic-v1",
    spellingVariants: word === "colour" ? ["color"] : [],
    semanticAlternatives: word === "candy" ? ["sweet"] : [],
    quizClue: "",
  }));
  const bundle: EnglishBundle = {
    schemaVersion: 1,
    sourceSha: ENGLISH_SOURCE_SHA,
    contentVersion: "synthetic-v1",
    scope: "family-lan-source",
    publicationApproved: false,
    cards,
    groups: [
      {
        id: "synthetic-group",
        bankId: "core2000",
        title: "合成验证组",
        book: 1,
        unit: 1,
        half: "a",
        wordIds: cards.map((c) => c.id),
        readingImages: [url],
        exercise: { id: "synthetic-exercise", image: url, answerSlots: 2 },
      },
    ],
    aliases: { "old-synthetic-candy": "synthetic-candy" },
    exerciseAnswers: { "synthetic-exercise": ["a", ["colour", "color"]] },
    media: {
      [url]: {
        path: "media/" + hash + ".webp",
        sha256: hash,
        bytes: image.length,
        type: "image/webp",
        publication: "synthetic",
      },
    },
    sources: [],
  };
  const bytes = JSON.stringify(bundle);
  writeFileSync(join(directory, "bundle.json"), bytes);
  writeFileSync(
    join(directory, "seal.json"),
    JSON.stringify({
      scope: bundle.scope,
      sourceSha: bundle.sourceSha,
      publicationApproved: false,
      bundleSha256: englishHash(bytes),
    }),
  );
  return {
    content: new EnglishContent(directory),
    directory,
    cleanup() {
      rmSync(directory, { recursive: true, force: true });
    },
  };
}
