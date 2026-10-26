// One content process; no record store, review queue, identity or inbox dependencies.
import fs from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { canonical } from "../contract.ts";
import { hash } from "../content.ts";
import { loadPractice } from "../practice/service.ts";
import { loadContent } from "../content.ts";
import { preparePractice, gradePractice } from "../practice/service.ts";
import {
  entrySchema,
  privateCaseSchema,
  librarySchema,
  detectiveSubmissionSchema,
  detectiveResultSchema,
  type PrivateCase,
} from "./contract.ts";
import {
  orderedReasons,
  matchesResponse,
} from "./private/detective-grading.mjs";
export {
  orderedReasons,
  matchesResponse,
} from "./private/detective-grading.mjs";
const bankSchema = z.strictObject({
  schemaVersion: z.literal(1),
  sourceCommit: z.literal("a7c05aaa8d9c5eabae4f3453807f830da1cbf279"),
  entries: z.array(entrySchema).length(71),
  practice: z.array(z.unknown()).length(71),
  cases: z.array(privateCaseSchema).length(14),
  methods: z.array(z.unknown()).length(28),
  inverse: z
    .array(
      z.strictObject({
        taskId: z.string(),
        lessonId: z.string(),
        direction: z.string(),
        unknown: z.string(),
        forwardCheck: z.string(),
      }),
    )
    .length(11),
  inverseClassroomId: z.literal("G3-U02-O01"),
});
export function loadLibrary(
  root: string,
  primary = loadPractice(root),
  primaryCatalog = loadContent(root).catalog,
) {
  const bytes = fs.readFileSync(
      join(root, "apps/preview/library/private/bank.json"),
    ),
    bank = bankSchema.parse(JSON.parse(bytes.toString())),
    practice = preparePractice(bank.practice, 71, 449);
  const cases = new Map(bank.cases.map((c) => [c.id, c]));
  if (
    cases.size !== 14 ||
    bank.entries.filter((c) => c.kind === "thinking").length !== 17 ||
    bank.entries.filter((c) => c.kind === "legacy").length !== 54
  )
    throw Error("EXACT_PUBLISHED_CAPABILITIES_REQUIRED");
  for (const c of bank.entries)
    if (!practice.lessons.has(c.id)) throw Error("CAPABILITY_PRACTICE_MISSING");
  const catalog = librarySchema.parse({
    entries: bank.entries,
    inverseClassroomId: bank.inverseClassroomId,
    inverse: bank.inverse.map((meta) => {
      const l = primary.lessons.get(meta.lessonId),
        entry = primaryCatalog.lessons.find(
          (c) => c.lessonId === meta.lessonId,
        );
      if (!l || !entry) throw Error("INVERSE_LESSON_MISSING");
      const group = (
        ["warmup", "core", "transfer", "challenge", "review"] as const
      ).find((g) => l.taskSets[g].some((t) => t.id === meta.taskId));
      if (!group) throw Error("INVERSE_TASK_MISSING");
      return {
        taskId: meta.taskId,
        lessonId: meta.lessonId,
        direction: meta.direction,
        unknown: meta.unknown,
        group,
        title: entry.title,
      };
    }),
    cases: bank.cases.map((c) => {
      const { title, prompt, steps, repair, verify, visual } = c.content;
      const publicResponse = ({ answer: _answer, ...r }: typeof repair) => r;
      return {
        id: c.id,
        title,
        prompt,
        steps,
        reasons: orderedReasons(c).map((r, i) => ({
          id: "r" + i,
          text: r.text,
        })),
        repair: publicResponse(repair),
        verify: publicResponse(verify),
        visual,
        simulation: true,
      };
    }),
    methods: bank.methods,
    counts: {
      thinking: 17,
      deferred: 43,
      legacy: 54,
      legacyQuestions: 432,
      blueprints: 168,
      cases: 14,
      methodGuides: 6,
    },
  });
  return {
    catalog,
    cases,
    practice,
    bankSha256: hash(bytes),
    publicSha256: hash(canonical(catalog)),
  };
}
export function gradeLibrary(
  bank: ReturnType<typeof loadLibrary>,
  input: unknown,
) {
  return gradePractice(bank.practice, input);
}
export function gradeDetective(
  bank: ReturnType<typeof loadLibrary>,
  input: unknown,
) {
  const s = detectiveSubmissionSchema.parse(input),
    row = bank.cases.get(s.caseId);
  if (!row) throw Error("UNKNOWN_CASE");
  const a = s.finalAnswer,
    c = row.content,
    reason = orderedReasons(row)[Number(a.reason.slice(1))];
  if (
    (a.verdict === "correct" && a.errorStep !== null) ||
    (a.errorStep !== null && a.errorStep >= c.steps.length)
  )
    throw Error("INVALID_ERROR_STEP");
  const oral = c.repair.kind === "oral" || c.verify.kind === "oral";
  const correct =
    a.verdict === c.verdict &&
    a.errorStep === c.errorStep &&
    reason?.index === c.reason &&
    matchesResponse(c.repair, a.repair) &&
    matchesResponse(c.verify, a.verify);
  return detectiveResultSchema.parse({
    caseId: row.id,
    status: oral ? "pendingReview" : correct ? "correct" : "incorrect",
    message: oral
      ? "这份说明待家长核对，不自动判定。"
      : correct
        ? "本次判断、理由、改正与反查相互支持；这不是掌握记录。"
        : "请把判断、首错行、理由、改正与反查逐项放回条件检查。",
    hints: c.hints,
    solution: c.solution,
    persisted: false,
  });
}
