import { readFileSync, existsSync, lstatSync, realpathSync } from "node:fs";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import {
  ENGLISH_SOURCE_SHA,
  type EnglishBundle,
  type EnglishCard,
  type EnglishCatalog,
} from "./contract.ts";
export const englishHash = (x: Buffer | string) =>
  createHash("sha256").update(x).digest("hex");
export class EnglishContent {
  readonly bundle: EnglishBundle;
  readonly cards: Map<string, EnglishCard>;
  readonly catalog: EnglishCatalog;
  readonly directory: string;
  constructor(directory: string) {
    this.directory = resolve(directory);
    const bytes = readFileSync(join(directory, "bundle.json")),
      seal = JSON.parse(readFileSync(join(directory, "seal.json"), "utf8"));
    if (
      bytes.length > 24 * 1024 * 1024 ||
      seal.sourceSha !== ENGLISH_SOURCE_SHA ||
      englishHash(bytes) !== seal.bundleSha256 ||
      seal.scope !== "family-lan-source" ||
      seal.publicationApproved !== false
    )
      throw Error("ENGLISH_BUNDLE_SEAL_INVALID");
    const b = (this.bundle = JSON.parse(
      bytes.toString("utf8"),
    ) as EnglishBundle);
    if (
      b.schemaVersion !== 1 ||
      b.sourceSha !== ENGLISH_SOURCE_SHA ||
      b.scope !== seal.scope ||
      b.publicationApproved !== false ||
      !Array.isArray(b.cards) ||
      !Array.isArray(b.groups)
    )
      throw Error("ENGLISH_BUNDLE_INVALID");
    this.cards = new Map(b.cards.map((c) => [c.id, c]));
    if (
      this.cards.size !== b.cards.length ||
      b.groups.some((g) => g.wordIds.some((id) => !this.cards.has(id)))
    )
      throw Error("ENGLISH_MEMBERSHIP_INVALID");
    for (const [url, m] of Object.entries(b.media))
      if (
        url !== "/preview-api/v1/english/media/" + m.sha256 + ".webp" ||
        m.path !== "media/" + m.sha256 + ".webp" ||
        !Number.isSafeInteger(m.bytes) ||
        m.bytes > 4 * 1024 * 1024 ||
        m.type !== "image/webp"
      )
        throw Error("ENGLISH_MEDIA_MANIFEST_INVALID");
    this.catalog = {
      sourceSha: b.sourceSha,
      contentVersion: b.contentVersion,
      scope: b.scope,
      publicationApproved: false,
      storage: "page-memory-only",
      banks: [
        ["core2000", "2000 Core English Words"],
        ["movers", "Movers"],
        ["ket", "KET · A2 Key"],
        ["pet", "PET · B1 Preliminary"],
      ].map(([id, title]) => ({
        id,
        title,
        count: b.cards.filter((c) => c.bankId === id).length,
        books: id === "core2000" ? 4 : 0,
        groups: b.groups.filter((g) => g.bankId === id).length,
      })),
      groups: b.groups.map(({ wordIds, ...g }) => ({
        ...g,
        preview: wordIds
          .slice(0, 3)
          .map((id) => this.cards.get(id)!.word)
          .join(", "),
      })),
      localRecordedAudio: 0,
      mediaCount: Object.keys(b.media).length,
      reviewPersistence: false,
    };
  }
  card(id: string) {
    const c = this.cards.get(this.bundle.aliases[id] || id);
    if (!c) throw Error("没有找到这个单词。");
    return c;
  }
  publicCard(id: string) {
    const c = this.card(id);
    return {
      id: c.id,
      bankId: c.bankId,
      word: c.word,
      en: c.en,
      zh: c.zh,
      ipa: c.ipa,
      pos: c.pos,
      example: c.example,
      exampleZh: c.exampleZh,
      chunks: c.chunks,
      tip: c.tip,
      image: c.image,
      imageStatus: c.imageStatus,
      attribution: c.attribution,
      contentVersion: c.contentVersion,
      groupId: this.bundle.groups.find((g) => g.wordIds.includes(c.id))!.id,
    };
  }
  group(id: string) {
    const g = this.bundle.groups.find((x) => x.id === id);
    if (!g) throw Error("没有找到这个学习组。");
    return { group: g, cards: g.wordIds.map((id) => this.publicCard(id)) };
  }
  media(url: string) {
    const m = this.bundle.media[url];
    if (!m) return null;
    const path = join(this.directory, m.path);
    if (
      lstatSync(path).isSymbolicLink() ||
      !realpathSync(path).startsWith(realpathSync(this.directory) + "/")
    )
      throw Error("ENGLISH_MEDIA_PATH_INVALID");
    const bytes = readFileSync(path);
    if (bytes.length !== m.bytes || englishHash(bytes) !== m.sha256)
      throw Error("ENGLISH_MEDIA_HASH_INVALID");
    return { bytes, type: m.type };
  }
}
export function loadEnglish(root: string) {
  const path = join(root, ".english-family");
  return existsSync(join(path, "seal.json")) ? new EnglishContent(path) : null;
}
