import test from "node:test";
import assert from "node:assert/strict";
import {
  readFileSync,
  mkdtempSync,
  mkdirSync,
  cpSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { loadContent, hash } from "../../apps/preview/content.ts";
import {
  catalogSchema,
  fullLessonSchema,
  canonical,
  type FullLesson,
} from "../../apps/preview/contract.ts";
import { adapterFor } from "../../apps/preview/registry-meta.ts";
const root = resolve("."),
  content = loadContent(root);
test("70 unique draft lessons retain 64 interactive / 6 static, metadata and supported model families", () => {
  assert.equal(content.lessons.size, 70);
  assert.equal(
    content.catalog.lessons.filter((l) => l.interactionStatus === "verified")
      .length,
    64,
  );
  assert.equal(
    content.catalog.lessons.filter(
      (l) => l.interactionStatus === "static-visual",
    ).length,
    6,
  );
  assert.equal(
    new Set(content.catalog.lessons.map((l) => l.renderer)).size,
    51,
  );
  for (const entry of content.catalog.lessons) {
    const { data } = content.lessons.get(entry.lessonId)!;
    assert.equal(data.status, "draft");
    assert.equal(adapterFor(data).key, entry.renderer);
    assert.equal(data.contentVersion, entry.contentVersion);
    assert.equal(data.editorialRevision, entry.editorialRevision);
    assert(
      data.classroom.story &&
        data.classroom.discovery.length &&
        data.classroom.symbols.length,
    );
  }
});
test("all field projections match recorded source value hashes; no answer / private field enters public lessons", () => {
  const mappings = JSON.parse(
    readFileSync(
      "docs/implementation/evidence/math-full-01/field-mappings.json",
      "utf8",
    ),
  ) as {
    lessonId: string;
    dtoSha256: string;
    fieldMappings: { source: string; target: string; valueSha256: string }[];
  }[];
  function visit(v: unknown) {
    if (v && typeof v === "object")
      for (const [key, value] of Object.entries(v)) {
        assert(
          !/^(taskSets|expected|expectedMm|expectedExplanation|expectedEvidence|referenceAnswer|hint|solution|validatorIds|pin|wallet|pets|rewardRuleId|masteryRuleId)$/i.test(
            key,
          ),
        );
        visit(value);
      }
  }
  assert.equal(mappings.length, 70);
  for (const m of mappings) {
    const dto = content.lessons.get(m.lessonId)!.data;
    visit(dto);
    assert.equal(hash(canonical(dto)), m.dtoSha256);
    for (const field of m.fieldMappings) {
      const value = field.target
        .split("/")
        .slice(1)
        .reduce<unknown>((v, k) => (v as Record<string, unknown>)[k], dto);
      assert.notEqual(value, undefined);
      assert.equal(hash(canonical(value)), field.valueSha256);
      assert(/^\/\d+\//.test(field.source));
    }
  }
});
test("unknown schemas, nested answer fields, renderer drift and duplicate IDs fail closed", () => {
  const first = structuredClone(content.lessons.get("G3-U01-B01")!.data);
  for (const mutate of [
    (d: Record<string, unknown>) => {
      d.taskSets = {};
    },
    (d: Record<string, unknown>) => {
      d.expected = "hidden";
    },
    (d: Record<string, unknown>) => {
      d.unknown = true;
    },
  ]) {
    const d = structuredClone(first) as unknown as Record<string, unknown>;
    mutate(d);
    assert(!fullLessonSchema.safeParse(d).success);
  }
  const bad = structuredClone(first) as unknown as {
    conceptScenes: { handsOnSpec: Record<string, unknown> }[];
  };
  bad.conceptScenes[0]!.handsOnSpec.expectedEvidence = "secret";
  assert(!fullLessonSchema.safeParse(bad).success);
  const unknown = structuredClone(first);
  unknown.storyVisual!.type = "unreviewed" as never;
  assert(!fullLessonSchema.safeParse(unknown).success);
  const cat = structuredClone(content.catalog);
  cat.lessons[1] = cat.lessons[0]!;
  assert(!catalogSchema.safeParse(cat).success);
  assert.throws(() =>
    adapterFor({ ...first, interactionStatus: "static-visual" }),
  );
});
test("changed teaching content is rejected by catalog hash, not silently displayed", () => {
  const fixture = mkdtempSync(join(tmpdir(), "klh-preview-contract-"));
  try {
    mkdirSync(join(fixture, "apps/preview"), { recursive: true });
    cpSync("apps/preview/content", join(fixture, "apps/preview/content"), {
      recursive: true,
    });
    const file = join(fixture, "apps/preview/content/lessons/G3-U01-B01.json"),
      dto = JSON.parse(readFileSync(file, "utf8"));
    dto.classroom.story += " drift";
    writeFileSync(file, JSON.stringify(dto));
    assert.throws(() => loadContent(fixture), /INTEGRITY/);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
