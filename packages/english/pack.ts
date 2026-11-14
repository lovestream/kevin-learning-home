// Public pack format parser, usable without uploading the chosen file or any private history.
import { z } from "zod";
import { sha256 } from "@noble/hashes/sha2.js";
import type { EnglishCard, EnglishGroup, EnglishBundle } from "./contract.ts";
const text = (max: number) => z.string().trim().min(1).max(max);
const wordSchema = z
  .object({
    word: text(80).regex(/^[a-z][a-z' -]{0,78}$/i),
    partOfSpeech: z.string().max(40).optional(),
    pos: z.string().max(40).optional(),
    ipa: text(80),
    lemma: text(80),
    definition: z.string().max(900).optional(),
    en: z.string().max(900).optional(),
    example: text(500),
    memoryTip: z.string().max(500).optional(),
    tip: z.string().max(500).optional(),
    spellingChunks: z.array(text(80)).min(1).max(40),
    image: z
      .union([
        z.string().max(34000),
        z
          .object({
            dataUrl: z.string().max(34000).optional(),
            data: z.string().max(34000).optional(),
            mimeType: z.string().max(40).optional(),
            base64: z.string().max(34000).optional(),
            alt: z.string().max(200).optional(),
          })
          .passthrough(),
      ])
      .optional(),
    imageDataUrl: z.string().max(34000).optional(),
    train: z.boolean().optional(),
  })
  .passthrough();
const packSchema = z
  .object({
    format: z.literal("kevin-word-quest-ai-pack"),
    version: z.literal(1),
    title: text(120).optional(),
    source: z.string().max(80).optional(),
    sourceTag: z.string().max(80).optional(),
    trainByDefault: z.boolean().optional(),
    words: z.array(wordSchema).min(1).max(20),
  })
  .passthrough();
export function inspectPack(value: unknown) {
  const p = packSchema.parse(value),
    seen = new Set<string>();
  const words = p.words.map((w) => {
    const en = w.definition || w.en || "",
      tip = w.memoryTip || w.tip || "",
      pos = w.partOfSpeech || w.pos || "";
    if (!en.trim() || !tip.trim() || !pos.trim())
      throw Error("每个词需要词性、释义与记忆提示。");
    if (
      /[\u3400-\u9fff]/.test(
        [w.word, pos, w.lemma, en, w.example, tip].join(" "),
      )
    )
      throw Error("生词包教学内容应为英文。");
    if (
      w.spellingChunks
        .join("")
        .toLowerCase()
        .replace(/[^a-z]/g, "") !== w.word.toLowerCase().replace(/[^a-z]/g, "")
    )
      throw Error("拼写分块与目标词不一致。");
    if (!w.example.toLowerCase().includes(w.word.toLowerCase()))
      throw Error("例句需要包含目标词。");
    const key = w.word.toLowerCase() + "\n" + en.toLowerCase();
    if (seen.has(key)) throw Error("包中存在重复词条，请先整理。");
    seen.add(key);
    const image =
      typeof w.image === "string"
        ? w.image
        : w.image?.dataUrl ||
          w.image?.data ||
          (w.image?.mimeType && w.image.base64
            ? "data:" +
              w.image.mimeType
                .toLowerCase()
                .replace("image/jpg", "image/jpeg") +
              ";base64," +
              w.image.base64.replace(/\s+/g, "")
            : "") ||
          w.imageDataUrl ||
          "";
    if (
      !/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/i.test(
        image,
      )
    )
      throw Error("每个词需要内嵌PNG、JPEG或WebP图片，不加载外部图片地址。");
    const bytes = atob(image.slice(image.indexOf(",") + 1));
    if (bytes.length > 24576) throw Error("单张图片不能超过24KB。");
    return {
      word: w.word,
      en,
      pos,
      ipa: w.ipa,
      lemma: w.lemma,
      example: w.example,
      tip,
      chunks: w.spellingChunks,
      image,
      train: w.train ?? p.trainByDefault !== false,
    };
  });
  return { title: p.title || p.source || p.sourceTag || "AI Word Pack", words };
}
export async function localPackCards(p: ReturnType<typeof inspectPack>) {
  const cards: EnglishCard[] = [];
  const urls: string[] = [];
  try {
    for (const [i, w] of p.words.entries()) {
      const mime = w.image.slice(5, w.image.indexOf(";"));
      const raw = atob(w.image.slice(w.image.indexOf(",") + 1));
      const b = new Blob([Uint8Array.from(raw, (c) => c.charCodeAt(0))], {
          type: mime,
        }),
        bitmap = await createImageBitmap(b);
      try {
        if (
          bitmap.width > 4096 ||
          bitmap.height > 4096 ||
          bitmap.width * bitmap.height > 4000000
        )
          throw Error("图片尺寸过大，请缩小图片后重新导入。");
      } finally {
        bitmap.close();
      }
      const url = URL.createObjectURL(b);
      urls.push(url);
      const digest = Array.from(
        sha256(new TextEncoder().encode(w.word + "\n" + w.en)),
      )
        .map((x) => x.toString(16).padStart(2, "0"))
        .join("");
      cards.push({
        id: "custom:" + digest,
        bankId: "custom",
        word: w.word,
        en: w.en,
        zh: "",
        ipa: w.ipa,
        pos: w.pos,
        example: w.example,
        exampleZh: "",
        tip: w.tip,
        chunks: w.chunks,
        image: url,
        imageStatus: "user-selected-local-only",
        contentVersion: digest,
        spellingVariants: [],
        semanticAlternatives: [],
        quizClue: "",
      });
    }
    return { cards, urls };
  } catch (e) {
    for (const url of urls) URL.revokeObjectURL(url);
    throw e;
  }
}
export function packContent(cards: EnglishCard[]) {
  const group: EnglishGroup = {
    id: "local-pack",
    bankId: "custom",
    title: "本次生词包",
    book: null,
    unit: 1,
    half: null,
    wordIds: cards.map((c) => c.id),
    readingImages: [],
  };
  const map = new Map(cards.map((c) => [c.id, c]));
  return {
    cards: map,
    card(id: string) {
      const c = map.get(id);
      if (!c) throw Error("词条不存在。");
      return c;
    },
    group(id: string) {
      if (id !== "local-pack") throw Error("学习组不存在。");
      return { group, cards };
    },
    bundle: { exerciseAnswers: {} } as EnglishBundle,
  };
}
