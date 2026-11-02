// Curated authored content only. Does not read an original workspace or learner data.
import fs from "node:fs";
import { createHash } from "node:crypto";
import { articleSchema } from "../../apps/preview/reading/contract.ts";
const src = ".evidence/math-onepass/source/content/pilot/lessons.json",
  raw = fs.readFileSync(src),
  sha = (b) => createHash("sha256").update(b).digest("hex"),
  manifest = JSON.parse(
    fs.readFileSync(".evidence/math-onepass/selected-source.json", "utf8"),
  ),
  origin = manifest.find((x) => x.path === "content/pilot/lessons.json");
if (!origin || sha(raw) !== origin.sha256)
  throw Error("READING_SOURCE_MISMATCH");
const lessons = JSON.parse(raw),
  publicArticles = [],
  checkpoints = [];
for (const l of lessons) {
  const blocks = l.articleBlocks.map((b) => {
    const out = {};
    for (const k of [
      "blockId",
      "type",
      "title",
      "text",
      "paragraphs",
      "diagram",
      "widget",
      "examples",
      "cases",
      "methods",
      "prompt",
      "revisit",
    ])
      if (b[k] !== undefined) out[k] = structuredClone(b[k]);
    if (b.type === "checkpoint") {
      out.responseType =
        b.responseSpec?.type === "self-explanation"
          ? "self-explanation"
          : "choice";
      if (b.options) out.options = b.options.map((o) => o.text);
      checkpoints.push({
        lessonId: l.lessonId,
        blockId: b.blockId,
        type: out.responseType,
        ...(b.options
          ? {
              options: b.options.map((o) => ({
                correct: o.correct,
                reason: o.reason,
              })),
            }
          : {}),
        ...(b.referenceAnswer ? { referenceAnswer: b.referenceAnswer } : {}),
      });
    }
    return out;
  });
  publicArticles.push(
    articleSchema.parse({
      lessonId: l.lessonId,
      retellPrompt: l.retellPrompt,
      blocks,
    }),
  );
}
if (publicArticles.length !== 70 || checkpoints.length !== 70)
  throw Error("READING_COUNT_MISMATCH");
fs.mkdirSync("apps/preview/reading/private", { recursive: true });
const files = [];
for (const [path, value] of [
  ["apps/preview/reading/articles.json", publicArticles],
  ["apps/preview/reading/private/checkpoints.json", checkpoints],
]) {
  const b = JSON.stringify(value, null, 2) + "\n";
  fs.writeFileSync(path, b);
  files.push({ target: path, targetSha256: sha(b) });
}
fs.writeFileSync(
  "docs/implementation/evidence/math-onepass/reading-source.json",
  JSON.stringify(
    {
      source: origin,
      projection:
        "Field allowlist; authored teaching blocks only. Checkpoint correctness, reason and reference answer remain server-only until the child submits a response. No taskSets, identities, reward rules or learning histories imported.",
      articles: 70,
      checkpoints: 70,
      files,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  JSON.stringify({
    articles: 70,
    checkpoints: 70,
    sourceRef: origin.gitRef,
    sourceSha256: origin.sha256,
  }),
);
