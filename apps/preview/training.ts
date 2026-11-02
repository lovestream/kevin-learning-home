// An opaque page capability, not an account/session cookie. No filesystem writes.
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { trainingEventSchema } from "../../packages/contracts/math-training.ts";
import {
  studyChannels,
  studyEventSchema,
} from "../../packages/contracts/math-study.ts";
import {
  freshStudy,
  applyStudy,
  studyData,
  type StudyState,
} from "../../packages/math-training/study.mjs";
import {
  freshTraining,
  trainingCatalog,
  trainingData,
  trainingHistory,
  applyTraining,
  type TrainingState,
} from "../../packages/math-training/engine.mjs";

const input = z
  .object({
    capability: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
    channel: z.enum(["case", "self"]).optional(),
    event: trainingEventSchema.optional(),
  })
  .strict();
function fail(message: string, status = 400): never {
  throw Object.assign(new Error(message), { status });
}
export class PageTraining {
  private pages = new Map<
    string,
    { state: TrainingState; study?: StudyState; expires: number }
  >();
  private clock: () => number;
  constructor(clock: () => number = Date.now) {
    this.clock = clock;
  }
  catalog() {
    return trainingCatalog();
  }
  clear() {
    this.pages.clear();
  }
  private sweep() {
    for (const [id, p] of this.pages)
      if (p.expires <= this.clock()) this.pages.delete(id);
  }
  dispatch(path: string, body: unknown) {
    this.sweep();
    if (path === "start") {
      z.object({}).strict().parse(body);
      const bytes = Array.from(this.pages.values()).reduce(
        (n, p) => n + Buffer.byteLength(JSON.stringify(p)),
        0,
      );
      if (this.pages.size >= 64 || bytes > 20 * 1024 * 1024)
        fail("当前临时课堂已满，请稍后重试。", 503);
      const capability = randomBytes(32).toString("base64url");
      this.pages.set(capability, {
        state: freshTraining(),
        expires: this.clock() + 30 * 60000,
      });
      return {
        capability,
        data: trainingData(this.pages.get(capability)!.state, this.clock()),
        scope: "this-page-only",
      };
    }
    if (path === "study-event" || path === "study-data") {
      const b = z
          .object({
            capability: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
            channel: z.enum(studyChannels).optional(),
            event: studyEventSchema.optional(),
          })
          .strict()
          .parse(body),
        p = this.pages.get(b.capability);
      if (!p) fail("本页临时课堂已结束，请重新打开。", 410);
      if (path === "study-data") {
        if (b.channel || b.event) fail("读取请求无效。");
        const data = studyData(p.study ?? freshStudy()) as Record<
          string,
          unknown
        >;
        return { ...data, review: {}, plan: null, scope: "this-page-only" };
      }
      if (
        !b.channel ||
        !b.event ||
        b.channel.startsWith("parent-") ||
        b.event.action === "review-start" ||
        b.event.verdict !== undefined ||
        b.event.reviewer !== undefined
      )
        fail("匿名课堂不提供家长审批或跨日复测。", 403);
      const next = structuredClone(p.study ?? freshStudy()),
        result = applyStudy(next, b.channel, b.event, this.clock());
      const total =
        Buffer.byteLength(JSON.stringify({ ...p, study: next })) +
        Array.from(this.pages.values())
          .filter((x) => x !== p)
          .reduce((n, x) => n + Buffer.byteLength(JSON.stringify(x)), 0);
      if (total > 24 * 1024 * 1024)
        fail("临时课堂容量已满；已有内容保留。", 503);
      p.study = next;
      p.expires = this.clock() + 30 * 60000;
      return result;
    }
    const b = input.parse(body),
      p = this.pages.get(b.capability);
    if (!p) fail("本页临时课堂已结束，请重新打开。", 410);
    if (path === "release") {
      if (b.event || b.channel) fail("释放请求无效。");
      this.pages.delete(b.capability);
      return { released: true };
    }
    p.expires = this.clock() + 30 * 60000;
    if (path === "data") {
      if (b.event || b.channel) fail("读取请求无效。");
      return {
        ...(trainingData(p.state, this.clock()) as Record<string, unknown>),
        caseHistory: trainingHistory(p.state, this.clock()),
      };
    }
    if (path !== "event" || !b.event || !b.channel)
      fail("不支持这个临时课堂操作。");
    const allowed =
      b.channel === "case"
        ? [
            "start",
            "judge",
            "evidence",
            "repair",
            "verify",
            "hint",
            "draft",
            "remediate",
          ]
        : ["start", "first", "final", "draft", "hint", "visual", "parent-help"];
    if (
      !allowed.includes(b.event.action) ||
      (b.event.action === "start" &&
        b.channel === "self" &&
        !["practice", "transfer"].includes(b.event.mode ?? ""))
    )
      fail("匿名课堂不提供家长审批或跨日复测。", 403);
    // A failed command cannot partially mutate this page or evict another page.
    const next = structuredClone(p.state),
      result = applyTraining(next, b.channel, b.event, this.clock());
    const total =
      Buffer.byteLength(JSON.stringify({ ...p, state: next })) +
      Array.from(this.pages.values())
        .filter((x) => x !== p)
        .reduce((n, x) => n + Buffer.byteLength(JSON.stringify(x)), 0);
    if (total > 24 * 1024 * 1024)
      fail("临时课堂容量已满；本页已有内容保留。", 503);
    p.state = next;
    return result;
  }
}
