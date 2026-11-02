// Reusable audited math domain. No network, learner-file I/O, identity or reward operations.
import fs from "node:fs";
import { createHash } from "node:crypto";
import { seedCases } from "./source/content/detective/seed-cases.mjs";
import { processCases } from "./source/content/detective/process-cases.mjs";
import {
  SELF_FAMILIES,
  selfQuestion,
  familyExamples,
} from "./source/server/detective-self-questions.mjs";
import {
  ensureDetective,
  manageDetective,
  detectiveAttempt,
  detectiveToday,
  enableProcessCases,
  gradeDetective,
  validateStored,
} from "./source/server/detective-store.mjs";
import {
  applySelfTraining,
  selfTrainingData,
  manageSelfTraining,
} from "./source/server/detective-self-store.mjs";
import { publicCase, insist } from "./source/shared/detective-model.mjs";
import { verifyImportedCaseMath } from "./source/shared/detective-inbox.mjs";
import { auditDeliveredCase } from "./source/scripts/lib/detective-delivery-audit.mjs";
// An authored bank, not user uploads. Read once in the server process; never import in React.
const bundles = JSON.parse(
  fs.readFileSync(
    new URL(
      "./source/content/detective/approved-bundles.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
for (const e of bundles) {
  insist(
    verifyImportedCaseMath(e.content, e.verification).status === "verified",
    "已审匿名案例来源校验失败。",
  );
  auditDeliveredCase(e);
}
export const sourceCounts = Object.freeze({
  legacyCases: 14,
  anonymousBundles: 10,
  anonymousCases: 30,
  processCases: 3,
  familyExamples: 16,
  cases: 63,
  families: 8,
  templates: 10,
  reviewDays: [1, 3, 7, 14],
});
export const families = Object.freeze(
  SELF_FAMILIES.map((x) => Object.freeze({ ...x })),
);
const baselineTime = Date.parse("2026-10-28T00:00:00Z");
function initialize() {
  const p = {
    schemaVersion: 1,
    profile: { name: "匿名合成练习" },
    studio: undefined,
  };
  manageDetective(
    p,
    {
      action: "enable-seeds",
      eventId: "builtin-seeds",
      checks: [true, true, true],
    },
    baselineTime,
  );
  for (const e of bundles) {
    manageDetective(
      p,
      {
        action: "create",
        caseId: e.id,
        content: e.content,
        eventId: e.id + "-create",
      },
      baselineTime,
    );
    const c = p.studio.detective.cases[e.id];
    manageDetective(
      p,
      {
        action: "publish",
        caseId: e.id,
        expectedRevision: c.revision,
        eventId: e.id + "-publish",
        checks: [true, true, true],
      },
      baselineTime,
    );
    c.versions[0].approvalSource = "builtin-reviewed";
    c.trainingSource = "v2-reviewed-sample";
  }
  enableProcessCases(p, baselineTime);
  for (const f of SELF_FAMILIES) enableProcessCases(p, baselineTime, f.id);
  insist(
    Object.keys(p.studio.detective.cases).length === 63,
    "审定案例数量不一致。",
  );
  for (const c of Object.values(p.studio.detective.cases)) {
    c.trainingSource = "v2-reviewed-sample";
    for (const v of c.versions) v.approvalSource = "builtin-reviewed";
  }
  p.studio.detective.plans = {};
  validateStored(p);
  return p;
}
const base = initialize();
// Original editorial IDs include ERROR/CONTROL. Never let those labels reveal
// a verdict in the child catalog before the child makes a judgment.
const publicIds = new Map(),
  internalIds = new Map();
for (const c of Object.values(base.studio.detective.cases))
  for (const value of [c.id, ...c.versions.map((v) => v.id)]) {
    const alias =
      "case-" +
      createHash("sha256")
        .update("klh-public-case.v1:" + value)
        .digest("hex")
        .slice(0, 24);
    publicIds.set(value, alias);
    internalIds.set(alias, value);
  }
// Source teacher-facing titles sometimes announce the verdict. Presentation
// aliases hide that cue without changing the immutable authored case/version.
const neutralTitles = new Map([
  ["逆向侦探 · 正确推理","玻璃珠颗数调查"],
  ["弹簧长度侦探 · 只算了伸长","弹簧总长记录"],
  ["弹簧长度侦探 · 正确对照","另一根弹簧的记录"],
  ["称重小侦探 · 无错对照","坚果质量记录"],
  ["逆向侦探 · 正确反推","弹簧重量记录"],
  ["答案对，过程就一定对吗？","一份弹簧计算过程"],
  ["只有答案，能判断过程吗？","一份弹簧计算记录"],
  ["正确的过程不用强行改","另一份弹簧计算过程"],
]);
const publicResult = (value) =>
  JSON.parse(
    JSON.stringify(value, (key, v) =>
      typeof v === "string" ? (key === "title" ? neutralTitles.get(v) ?? v : publicIds.get(v) ?? v) : v,
    ),
  );
export function freshTraining() {
  return structuredClone(base);
}
export function validateTraining(p) {
  insist(
    p &&
      Object.keys(p).every((k) =>
        ["schemaVersion", "profile", "studio"].includes(k),
      ) &&
      Object.keys(p.profile ?? {}).length === 1 &&
      p?.schemaVersion === 1 &&
      p.profile?.name === "匿名合成练习",
    "学习机制状态格式或匿名边界不符。",
  );
  validateStored(p);
  for (const key of ["reading", "sessions", "entitlements", "daily", "review"])
    insist(
      Object.keys(p.studio[key] ?? {}).length === 0,
      "不接受其它学习历史或奖励状态。",
    );
  for (const key of ["notes", "events"])
    insist(p.studio[key]?.length === 0, "不接受其它学习历史。");
  insist(
    Object.keys(p.studio.detective.cases).length === 63,
    "案例目录不可改变。",
  );
  for (const [id, c] of Object.entries(p.studio.detective.cases)) {
    const original = base.studio.detective.cases[id];
    insist(
      original &&
        c.versions.length === 1 &&
        c.versions[0].hash === original.versions[0].hash,
      "案例版本或原文不可改变。",
    );
  }
  insist(p.studio.detective.badges.length === 0, "本模块不提供奖励写入。");
  return true;
}
export function trainingCatalog() {
  return {
    counts: sourceCounts,
    families,
    collections: [
      ...families.map((f) => ({
        id: "family-" + f.id,
        title: f.title + " · 两份做法",
        selfFamily: f.id,
        caseIds: Object.values(base.studio.detective.cases)
          .filter((c) => c.id.startsWith("DET-V2-" + f.id + "-"))
          .map((c) => publicIds.get(c.id)),
      })),
      ...Array.from(new Set(bundles.map((b) => b.bundleId))).map((id, i) => {
        const entries = bundles.filter((b) => b.bundleId === id),
          family = /AVG/.test(id)
            ? "MASS_AVERAGE"
            : /SPR/.test(id)
              ? "INITIAL_CHANGE"
              : /ARITH/.test(id)
                ? "OPERATION_ORDER"
                : /CARD/.test(id)
                  ? "UNIT_GROUPING"
                  : /UNIT/.test(id)
                    ? "UNIT_CONVERSION"
                    : /ORDER/.test(id)
                      ? "UNIT_ORDERING"
                      : /EQUAL/.test(id)
                        ? "EQUAL_GROUPS"
                        : "WRAP_RELATION";
        return {
          id: "collection-" + (i + 1),
          title:
            families.find((f) => f.id === family).title + " · 情境包" + (i + 1),
          selfFamily: family,
          caseIds: entries.map((e) => publicIds.get(e.id)),
        };
      }),
    ],
    cases: Object.values(base.studio.detective.cases).map((c) => {
      const v = c.versions.find((v) => v.id === c.activeVersion);
      return {
        id: publicIds.get(c.id),
        version: publicIds.get(v.id),
        title: neutralTitles.get(v.content.title) ?? v.content.title,
        family: v.content.family,
        stepCount: v.content.steps.length,
        sourceKind: "anonymous-simulation",
        bundleId: bundles.find((e) => e.id === c.id)?.bundleId ?? null,
      };
    }),
  };
}
function activeVersion(p, id) {
  const c = p.studio.detective.cases[id];
  insist(c && c.status === "published", "案例不在已审定目录中。", 404);
  return c.versions.find((v) => v.id === c.activeVersion);
}
export function casePreview(p, id) {
  return publicResult(publicCase(activeVersion(p, internalIds.get(id)), null));
}
export function trainingData(p, now = Date.now(), parent = false) {
  validateTraining(p);
  return selfTrainingData(p, now, parent);
}
export function todayTraining(p, now = Date.now()) {
  validateTraining(p);
  return publicResult(detectiveToday(p, now));
}
export function trainingHistory(p, now = Date.now()) {
  validateTraining(p);
  return publicResult(detectiveToday(structuredClone(p), now).history);
}
export function applyTraining(p, channel, event, now = Date.now()) {
  const next = structuredClone(p);
  validateTraining(next);
  let result;
  if (channel === "case") {
    if (event.action === "start") {
      event = {
        ...event,
        caseId: internalIds.get(event.caseId),
        version: internalIds.get(event.version),
      };
      const v = activeVersion(next, event.caseId);
      insist(event.version === v.id, "请重新载入当前案例版本。", 409);
    }
    result = detectiveAttempt(next, event, now);
  } else if (channel === "self") result = applySelfTraining(next, event, now);
  else if (channel === "parent-self")
    result = manageSelfTraining(next, event, now);
  else if (channel === "parent-case") result = gradeDetective(next, event, now);
  else insist(false, "不支持这类学习操作。");
  validateTraining(next);
  p.studio = next.studio;
  return channel === "case" ? publicResult(result) : result;
}
export function exportTraining(p) {
  validateTraining(p);
  const payload = structuredClone(p),
    sha256 = createHash("sha256").update(JSON.stringify(payload)).digest("hex");
  return {
    format: "klh-math-training.v1",
    syntheticOnly: true,
    payload,
    sha256,
  };
}
export function restoreTraining(envelope) {
  insist(
    envelope?.format === "klh-math-training.v1" &&
      envelope.syntheticOnly === true,
    "仅接受独立合成学习机制备份。",
  );
  insist(
    createHash("sha256")
      .update(JSON.stringify(envelope.payload))
      .digest("hex") === envelope.sha256,
    "备份摘要不匹配。",
  );
  validateTraining(envelope.payload);
  return structuredClone(envelope.payload);
}
