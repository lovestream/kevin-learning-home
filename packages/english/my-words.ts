// Page-only counterpart of the original My Words catalogue. No storage or network.
import { z } from "zod";
import { sha256 } from "@noble/hashes/sha2.js";
import { englishUUID } from "./id.ts";
import type { EnglishCard } from "./contract.ts";
const clean = (n: number) => z.string().trim().min(1).max(n);
const draftSchema = z
  .object({
    word: clean(80).regex(/^[a-z][a-z' -]{0,78}$/i),
    en: clean(320),
    example: clean(320),
    sourceTag: clean(80).default("Reading"),
    context: z.string().trim().max(320).default(""),
    pos: z.string().trim().max(40).default(""),
    ipa: z.string().trim().max(80).default(""),
    train: z.boolean().default(true),
  })
  .strict();
export type MyWord = {
  card: EnglishCard;
  sourceTag: string;
  context: string;
  train: boolean;
  archived: boolean;
  createdAt: number;
  updatedAt: number;
  revisions: {
    card: EnglishCard;
    at: number;
    sourceTag: string;
    context: string;
  }[];
};
const version = (x: unknown) =>
  Array.from(sha256(new TextEncoder().encode(JSON.stringify(x))), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
export class MyWords {
  readonly entries = new Map<string, MyWord>();
  readonly urls = new Set<string>();
  save(raw: unknown, id?: string, now = Date.now()) {
    const d = draftSchema.parse(raw);
    const old = id ? this.entries.get(id) : undefined;
    if (id && (!old || old.archived)) throw Error("请先恢复这个词条，再编辑。");
    if (!old && this.entries.size >= 200)
      throw Error("本次生词本最多200词，请先结束本次体验。");
    if (
      [...this.entries.values()].some(
        (x) =>
          x.card.id !== id &&
          x.card.word.toLowerCase() === d.word.toLowerCase() &&
          x.card.en.toLowerCase() === d.en.toLowerCase(),
      )
    )
      throw Error("这个词和释义已在生词本中，可以直接编辑或恢复。");
    const card: EnglishCard = {
      ...(old?.card ?? {}),
      id: id || "custom:" + englishUUID(),
      bankId: "custom",
      word: d.word,
      en: d.en,
      zh: "",
      ipa: d.ipa,
      pos: d.pos,
      example: d.example,
      exampleZh: "",
      chunks: [d.word],
      tip: d.context,
      image:
        old?.card.word === d.word && old?.card.en === d.en
          ? old.card.image
          : null,
      imageStatus:
        old?.card.word === d.word && old?.card.en === d.en
          ? old.card.imageStatus
          : "no-user-image",
      contentVersion: version({
        word: d.word,
        en: d.en,
        example: d.example,
        pos: d.pos,
        ipa: d.ipa,
      }),
      spellingVariants: [],
      semanticAlternatives: [],
      quizClue: "",
    };
    // Preserve stable identity and old content snapshots; never rewrite prior attempt evidence.
    const entry: MyWord = {
      card,
      sourceTag: d.sourceTag,
      context: d.context,
      train: d.train,
      archived: false,
      createdAt: old?.createdAt ?? now,
      updatedAt: now,
      revisions: old
        ? [
            ...old.revisions,
            {
              card: structuredClone(old.card),
              at: old.updatedAt,
              sourceTag: old.sourceTag,
              context: old.context,
            },
          ].slice(-20)
        : [],
    };
    this.entries.set(card.id, entry);
    return entry;
  }
  addPack(cards: EnglishCard[], title: string, train: boolean) {
    // Atomic preflight: duplicates are retained as-is, never overwrite an edited card.
    const fresh = cards.filter(
      (c) =>
        ![...this.entries.values()].some(
          (e) =>
            e.card.id === c.id ||
            (e.card.word.toLowerCase() === c.word.toLowerCase() &&
              e.card.en.toLowerCase() === c.en.toLowerCase()),
        ),
    );
    if (fresh.length + this.entries.size > 200)
      throw Error("加入后会超过本次200词上限，请减少选择。");
    for (const c of fresh) {
      const now = Date.now();
      this.entries.set(c.id, {
        card: structuredClone(c),
        sourceTag: title.slice(0, 80),
        context: "",
        train,
        archived: false,
        createdAt: now,
        updatedAt: now,
        revisions: [],
      });
      if (c.image?.startsWith("blob:")) this.urls.add(c.image);
    }
    return fresh.map((c) => c.id);
  }
  archive(id: string, archived: boolean) {
    const e = this.entries.get(id);
    if (!e) throw Error("词条不存在。");
    e.archived = archived;
    e.updatedAt = Date.now();
  }
  setTraining(ids: string[], train: boolean) {
    for (const id of ids) {
      const e = this.entries.get(id);
      if (e && !e.archived) e.train = train;
    }
  }
  filter(
    query: string,
    source: string,
    status: "active" | "train" | "collection" | "archived",
  ) {
    const q = query.trim().toLowerCase();
    return [...this.entries.values()].filter(
      (e) =>
        e.archived === (status === "archived") &&
        (!source || e.sourceTag === source) &&
        (status !== "train" || e.train) &&
        (status !== "collection" || !e.train) &&
        (!q ||
          [e.card.word, e.card.en, e.sourceTag, e.context].some((t) =>
            t.toLowerCase().includes(q),
          )),
    );
  }
}
