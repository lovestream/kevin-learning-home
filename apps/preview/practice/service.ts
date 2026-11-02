// Content-only, deterministic in-memory computation. No identity, database, file writes or history.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { canonical } from "../contract.ts";
import { hash } from "../content.ts";
import { validateTask } from "./private/pilot-math.mjs";
import {
  publicTaskSchema,
  publicLessonSchema,
  submissionSchema,
  resultSchema,
  groups,
} from "./contract.ts";
const privateTask = publicTaskSchema.extend({
  solution: z.string().min(1).max(8000),
  hint: z.string().min(1).max(8000),
  diagnostic: z.string().max(8000).optional(),
  expected: z.string().max(1000).optional(),
  fields: z
    .array(
      z.strictObject({
        key: z.string(),
        label: z.string(),
        unit: z.string().optional(),
        expected: z.string(),
      }),
    )
    .max(12)
    .optional(),
  responseSpec: publicTaskSchema.shape.responseSpec.extend({
    expectedEvidence: z.string().optional(),
    rubric: z.array(z.string()).max(20).optional(),
  }),
});
const privateLesson = publicLessonSchema.extend({
  taskSets: z.strictObject(
    Object.fromEntries(
      groups.map((g) => [g, z.array(privateTask).max(40)]),
    ) as Record<(typeof groups)[number], z.ZodArray<typeof privateTask>>,
  ),
});
const bankSchema = z.strictObject({
  schemaVersion: z.literal(1),
  sourceCommit: z.literal("a7c05aaa8d9c5eabae4f3453807f830da1cbf279"),
  lessons: z.array(privateLesson).length(70),
});
export function projectTask(t: z.infer<typeof privateTask>) {
  const {
    solution: _s,
    hint: _h,
    diagnostic: _d,
    expected: _e,
    fields,
    responseSpec,
    ...question
  } = t;
  const { expectedEvidence: _ee, rubric: _r, ...safeSpec } = responseSpec;
  return publicTaskSchema.parse({
    ...question,
    responseSpec: safeSpec,
    ...(fields ? { fields: fields.map(({ expected: _x, ...f }) => f) } : {}),
  });
}
export function loadPractice(root: string) {
  const bytes = readFileSync(
    join(root, "apps/preview/practice/private/bank.json"),
  );
  const bank = bankSchema.parse(JSON.parse(bytes.toString()));
  const prepared = preparePractice(bank.lessons, 70, 849);
  return {
    ...prepared,
    bankSha256: hash(bytes),
    publicSha256: hash(canonical([...prepared.lessons.values()])),
  };
}
export function preparePractice(
  input: unknown[],
  expectedLessons: number,
  expectedTasks: number,
) {
  const parsed = z.array(privateLesson).length(expectedLessons).parse(input);
  const lessons = new Map<string, z.infer<typeof publicLessonSchema>>(),
    tasks = new Map<
      string,
      {
        task: z.infer<typeof privateTask>;
        lessonId: string;
        contentVersion: string;
      }
    >();
  for (const l of parsed) {
    if (lessons.has(l.lessonId)) throw Error("DUPLICATE_PRACTICE_LESSON");
    const taskSets = Object.fromEntries(
      groups.map((g) => [
        g,
        l.taskSets[g].map((t) => {
          if (tasks.has(t.id)) throw Error("DUPLICATE_TASK_ID");
          tasks.set(t.id, {
            task: t,
            lessonId: l.lessonId,
            contentVersion: l.contentVersion,
          });
          return projectTask(t);
        }),
      ]),
    );
    lessons.set(l.lessonId, publicLessonSchema.parse({ ...l, taskSets }));
  }
  if (tasks.size !== expectedTasks) throw Error("EXACT_TASK_COUNT_REQUIRED");
  return { lessons, tasks };
}
export function gradePractice(
  bank: ReturnType<typeof preparePractice>,
  input: unknown,
) {
  const s = submissionSchema.parse(input),
    row = bank.tasks.get(s.taskId);
  if (
    !row ||
    row.lessonId !== s.lessonId ||
    row.contentVersion !== s.contentVersion
  )
    throw Error("UNKNOWN_OR_STALE_TASK");
  const allowed = new Set(
    row.task.fields?.map((f) => f.key) ?? [
      "value",
      ...(row.task.responseSpec.type === "claim-evidence" ? ["evidence"] : []),
    ],
  );
  for (const a of [s.firstAnswer, s.finalAnswer])
    if (Object.keys(a).some((k) => !allowed.has(k)))
      throw Error("UNKNOWN_ANSWER_FIELD");
  // Enforce an independent first attempt, but deliberately do not grade or retain it.
  if (!Object.values(s.firstAnswer).some((v) => v.trim()))
    throw Error("FIRST_ANSWER_REQUIRED");
  const out = validateTask(row.task, s.finalAnswer),
    t = row.task;
  return resultSchema.parse({
    taskId: t.id,
    ...out,
    ...(out.status === "pendingReview"
      ? {
          message:
            "请和爸爸妈妈核对结论、关系和理由；文字解释不自动判定正确，本次回答不会保存。",
        }
      : {}),
    ...(out.status !== "invalidInput"
      ? {
          hint: t.hint,
          solution: t.solution,
          ...(t.diagnostic ? { diagnostic: t.diagnostic } : {}),
          ...(t.responseSpec.rubric ? { rubric: t.responseSpec.rubric } : {}),
        }
      : {}),
    persisted: false,
  });
}
