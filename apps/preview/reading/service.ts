import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { createHash } from "node:crypto";
import {
  articleSchema,
  checkpointInput,
  checkpointResult,
} from "./contract.ts";
const keySchema = z
  .array(
    z.strictObject({
      lessonId: z.string(),
      blockId: z.string(),
      type: z.enum(["choice", "self-explanation"]),
      options: z
        .array(z.strictObject({ correct: z.boolean(), reason: z.string() }))
        .optional(),
      referenceAnswer: z.string().optional(),
    }),
  )
  .length(70);
export function loadReading(root: string) {
  const a = readFileSync(join(root, "apps/preview/reading/articles.json")),
    b = readFileSync(
      join(root, "apps/preview/reading/private/checkpoints.json"),
    ),
    articles = z
      .array(articleSchema)
      .length(70)
      .parse(JSON.parse(a.toString())),
    keys = keySchema.parse(JSON.parse(b.toString()));
  const articlesMap = new Map(articles.map((a) => [a.lessonId, a]));
  if (articlesMap.size !== 70) throw Error("READING_DUPLICATE");
  for (const k of keys) {
    const a = articlesMap.get(k.lessonId),
      block = a?.blocks.find((x) => x.blockId === k.blockId);
    if (
      !block ||
      block.type !== "checkpoint" ||
      block.responseType !== k.type ||
      (k.type === "choice" &&
        (block.options?.length !== k.options?.length ||
          k.options?.filter((x) => x.correct).length !== 1)) ||
      (k.type === "self-explanation" && !k.referenceAnswer)
    )
      throw Error("CHECKPOINT_PROJECTION_MISMATCH");
  }
  return {
    articles: articlesMap,
    sha256: createHash("sha256").update(a).update(b).digest("hex"),
    grade(value: unknown) {
      const input = checkpointInput.parse(value),
        k = keys.find(
          (k) => k.lessonId === input.lessonId && k.blockId === input.blockId,
        );
      if (!k) throw Error("UNKNOWN_CHECKPOINT");
      if (k.type === "choice") {
        if (
          input.explanation !== undefined ||
          input.choice === undefined ||
          !k.options?.[input.choice]
        )
          throw Error("CHECKPOINT_RESPONSE_INVALID");
        const o = k.options[input.choice];
        return checkpointResult.parse({
          feedback: o.reason,
          correct: o.correct,
          persisted: false,
        });
      }
      if (
        input.choice !== undefined ||
        !input.explanation?.trim() ||
        input.explanation.trim().length < 2
      )
        throw Error("WRITE_YOUR_THOUGHT_FIRST");
      return checkpointResult.parse({
        feedback:
          "对照原教案的参考过程，回到模型核对。口述解释不自动判对错或掌握。",
        correct: null,
        reference: k.referenceAnswer,
        persisted: false,
      });
    },
  };
}
