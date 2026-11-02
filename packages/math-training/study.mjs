// Reuses the original learning mechanisms, with rewards removed in the imported copy.
// Authored content is immutable. This module never opens a learner file or database.
import fs from "node:fs";
import { createHash } from "node:crypto";
import {
  initPilot,
  saveReading,
  createSession,
  saveSession,
  revealHelp,
  selfCheckTask,
  submitTask,
  saveNote,
  validatePilot,
  reviewFormalTask,
  publicSession,
} from "./source/server/pilot-store.mjs";
import {
  applyThinking,
  applyThinkingReview,
} from "./source/server/thinking-store.mjs";
import { thinkingCards } from "./source/content/pilot/thinking-source.mjs";
import { lessonEvidence } from "./source/shared/learning-evidence.mjs";
import {
  learningEntries,
  learningReviews,
  unfinishedLearning,
  articleMistakes,
  articleAttempts,
} from "./source/src/learningMap.mjs";
const read = (p) =>
    JSON.parse(fs.readFileSync(new URL("../../" + p, import.meta.url), "utf8")),
  practice = read("apps/preview/practice/private/bank.json"),
  articles = read("apps/preview/reading/articles.json");
const library = read("apps/preview/library/private/bank.json");
const lessons = [
  ...practice.lessons.map((p) => {
    const teaching = read(
        "apps/preview/content/lessons/" + p.lessonId + ".json",
      ),
      article = articles.find((a) => a.lessonId === p.lessonId);
    return {
      ...teaching,
      ...p,
      articleBlocks: article.blocks,
      childClassroom: teaching.classroom,
      retellPrompt: article.retellPrompt,
    };
  }),
  ...library.practice.map((l) => ({
    ...l,
    title:
      library.entries.find((e) => e.id === l.lessonId)?.title ?? l.lessonId,
    shortTitle: l.lessonId,
    articleBlocks: [],
    childClassroom: null,
  })),
];
const tasks = new Map(
    lessons.flatMap((l) =>
      Object.values(l.taskSets)
        .flat()
        .map((t) => [t.id, t]),
    ),
  ),
  hash = (v) => createHash("sha256").update(JSON.stringify(v)).digest("hex");
const insist = (v, message, status = 400) => {
  if (!v) throw Object.assign(Error(message), { status });
};
export function freshStudy() {
  const p = { schemaVersion: 1, syntheticOnly: true, studio: undefined };
  initPilot(p);
  return p;
}
export function validateStudy(p) {
  insist(
    p?.schemaVersion === 1 &&
      p.syntheticOnly === true &&
      Object.keys(p).every((k) =>
        ["schemaVersion", "syntheticOnly", "studio"].includes(k),
      ),
    "仅接受隔离合成学习状态。",
  );
  validatePilot(p.studio);
  const s = p.studio;
  insist(
    Object.keys(s).every((k) =>
      [
        "version",
        "reading",
        "sessions",
        "notes",
        "events",
        "entitlements",
        "daily",
        "review",
        "lastLessonId",
        "thinking",
      ].includes(k),
    ) &&
      Object.keys(s.entitlements).length === 0 &&
      Object.keys(s.daily).length === 0,
    "不接受账户、真实档案或奖励数据。",
  );
  insist(
    Object.keys(s.reading).length <= 70 &&
      Object.keys(s.sessions).length <= 1000 &&
      s.notes.length <= 1000 &&
      s.events.length <= 10000,
    "隔离学习记录容量已满，原记录保留，请先导出。",
  );
  for (const [id, r] of Object.entries(s.reading)) {
    const l = lessons.find((x) => x.lessonId === id);
    insist(
      (l && l.articleBlocks.some((b) => b.blockId === r.blockId)) ||
        (l && r.blockId === "classroom"),
      "阅读课程或位置不在已发布目录。",
    );
  }
  for (const row of Object.values(s.sessions)) {
    const l = lessons.find((x) => x.lessonId === row.lessonId);
    insist(
      l && row.contentVersion === l.contentVersion,
      "不接受其它课程版本。",
    );
    for (const t of row.tasks)
      insist(
        tasks.has(t.id) && hash(t) === hash(tasks.get(t.id)),
        "存档中的题目内容不可修改。",
      );
  }
  for (const n of s.notes)
    insist(
      lessons.some((l) => l.lessonId === n.lessonId),
      "笔记不在已发布课程中。",
    );
  for (const id of Object.keys(s.thinking ?? {}))
    insist(
      thinkingCards.some((t) => t.id === id),
      "未发布思维卡不可导入。",
    );
  return true;
}
export function studyPlan(p, now = Date.now(), grade = 3) {
  validateStudy(p);
  insist([3, 4, 5, 6].includes(grade), "合成年级不在已安装课程中。");
  const installed = lessons
    .filter((l) => !thinkingCards.some((t) => t.id === l.lessonId))
    .map((l) => {
      const entry = library.entries.find((e) => e.id === l.lessonId);
      return {
        ...l,
        grade: l.grade ?? [entry.grade],
        thinkingSkills: [],
        track: l.track ?? "foundation",
        estimatedActiveMinutes: l.estimatedActiveMinutes ?? 20,
        objectives: l.objectives ?? [],
        subtitle: l.subtitle ?? entry.subtitle,
        strand: l.strand ?? entry.world,
      };
    });
  const data = {
      articleCourses: installed,
      courses: [],
      progress: { studio: p.studio, lessons: {}, reviews: {} },
    },
    entries = learningEntries(data, grade),
    resume = unfinishedLearning(data),
    due = learningReviews(data).filter(
      (r) =>
        Date.parse(r.review.dueAt) <= now &&
        r.entry.lesson.grade.includes(grade),
    );
  const short = (e) =>
    e
      ? {
          id: e.id,
          title: e.title,
          grade: e.lesson.grade,
          completed: e.completed,
        }
      : null;
  return {
    grade,
    next: short(
      entries.find((e) => e.track === "foundation" && !e.completed) ??
        entries[0],
    ),
    thinking: short(entries.find((e) => e.kind === "thinking" && !e.completed)),
    due: due.map((r) => ({
      ...short(r.entry),
      dueAt: r.review.dueAt,
      stage: r.review.stage,
    })),
    resume: resume
      ? {
          entry: short(resume.entry),
          set: resume.set,
          taskId: resume.taskId,
          savedAt: resume.savedAt,
        }
      : null,
    mistakes: articleMistakes(data).map((r) => ({
      id: r.id,
      entry: short(r.entry),
      objective: r.objective,
      wrong: r.wrong,
      total: r.total,
      resolved: r.resolved,
      task: r.task,
    })),
    observedAttempts: articleAttempts(p).length,
  };
}
export function studyData(p, now = Date.now()) {
  validateStudy(p);
  const s = p.studio;
  return {
    syntheticOnly: true,
    reading: structuredClone(s.reading),
    notes: structuredClone(s.notes),
    sessions: Object.values(s.sessions).map(publicSession),
    thinking: structuredClone(s.thinking ?? {}),
    review: structuredClone(s.review),
    evidence: lessons.map((l) => ({
      lessonId: l.lessonId,
      ...lessonEvidence(p, l.lessonId, l.contentVersion),
    })),
    plan: studyPlan(p, now),
  };
}
export function applyStudy(p, channel, input, now = Date.now()) {
  const next = structuredClone(p);
  validateStudy(next);
  insist(
    ["thinking", "parent-thinking"].includes(channel) ||
      input.action === undefined,
    "该学习操作不接受额外动作标记。",
  );
  let result;
  if (channel === "reading") {
    const l = lessons.find((l) => l.lessonId === input.lessonId),
      keys = new Set([
        "classroom",
        ...(l?.articleBlocks ?? []).map((b) => b.blockId),
      ]);
    insist(
      input.widgets && Object.keys(input.widgets).every((k) => keys.has(k)),
      "教具位置不在本课教案中。",
    );
    result = saveReading(next, input, lessons, now);
  } else if (channel === "session-start")
    result = publicSession(createSession(next, input, lessons, now));
  else if (channel === "session-draft")
    result = publicSession(saveSession(next, input, now));
  else if (channel === "help") {
    insist(
      input.kind !== "solution" ||
        next.studio.sessions[input.sessionId]?.selfChecks?.[input.taskId],
      "先封存自己的首答，再看参考解答。",
      403,
    );
    result = revealHelp(next, input, now);
  } else if (channel === "self-check") {
    result = selfCheckTask(next, input, now);
    if (
      input.phase === "first" &&
      next.studio.sessions[input.sessionId]?.selfChecks?.[input.taskId]
    )
      result = {
        ...result,
        firstAnswer: structuredClone(
          next.studio.sessions[input.sessionId].selfChecks[input.taskId]
            .firstAnswer,
        ),
      };
  } else if (channel === "submit")
    result = submitTask(next, input, lessons, now);
  else if (channel === "note") {
    const old = next.studio.notes.find((n) => n.id === input.id);
    insist(
      !old ||
        (old.lessonId === input.lessonId && old.text === input.text?.trim()),
      "笔记编号已用于其它内容。",
      409,
    );
    result = saveNote(next, input, lessons, now);
  } else if (channel === "thinking") result = applyThinking(next, input, now);
  else if (channel === "parent-thinking")
    result = applyThinkingReview(next, input, now);
  else if (channel === "parent-formal")
    result = reviewFormalTask(next, input, now);
  else insist(false, "不支持这个学习操作。");
  validateStudy(next);
  p.studio = next.studio;
  return result;
}
export function exportStudy(p) {
  validateStudy(p);
  return {
    format: "klh-math-study.v1",
    syntheticOnly: true,
    payload: structuredClone(p),
    sha256: hash(p),
  };
}
export function restoreStudy(v) {
  insist(
    v?.format === "klh-math-study.v1" &&
      v.syntheticOnly === true &&
      hash(v.payload) === v.sha256,
    "合成学习备份格式或摘要不符。",
  );
  validateStudy(v.payload);
  return structuredClone(v.payload);
}
