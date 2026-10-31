// Opt-in test harness only. Production main never supplies this dependency.
import type { IncomingMessage } from "node:http";
import {
  studyChannels,
  studyEventSchema,
} from "../../packages/contracts/math-study.ts";
import { z } from "zod";
import { AppError } from "../../packages/contracts/index.ts";
import { trainingEventSchema } from "../../packages/contracts/math-training.ts";
import type { MathTrainingRepository } from "../../packages/math-training/repository.ts";
import type { AuthService } from "../../packages/auth/service.ts";
import type { AuthConfig } from "../../packages/auth/config.ts";
import { readAuthSession } from "./auth-http.ts";
function restoreDomain<T>(run: () => T): T {
  try {
    return run();
  } catch (e) {
    if (e instanceof AppError) throw e;
    const status = (e as { status?: number }).status;
    throw new AppError(
      "SYNTHETIC_RESTORE_REJECTED",
      status && [400, 403, 409, 503].includes(status) ? status : 400,
    );
  }
}
const parentEvent = z
  .object({
    action: z.enum(["schedule", "review"]),
    eventId: z.string().max(120),
    attemptId: z.string().max(120).optional(),
    errorFamilyId: z.string().max(80).optional(),
    expectedRevision: z.number().int(),
    expectedScheduleRevision: z.number().int().optional(),
    paused: z.boolean().optional(),
    dueDay: z.string().max(10).nullable().optional(),
    verdict: z.string().max(40).optional(),
    comment: z.string().max(500).optional(),
    confirmPreFeedbackEvidence: z.boolean().optional(),
  })
  .strict();
async function body(req: IncomingMessage, limit = 16384) {
  if (
    req.headers["content-type"] !== "application/json" ||
    req.headers["content-encoding"]
  )
    throw new AppError("CONTENT_TYPE_REQUIRED", 415);
  if (Number(req.headers["content-length"] ?? 0) > limit)
    throw new AppError("PAYLOAD_TOO_LARGE", 413);
  let size = 0;
  const chunks: Buffer[] = [];
  req.setTimeout(5000, () => req.destroy());
  for await (const b of req) {
    size += b.length;
    if (size > limit) throw new AppError("PAYLOAD_TOO_LARGE", 413);
    chunks.push(b);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString()) as unknown;
  } catch {
    throw new AppError("INVALID_JSON", 400);
  }
}
export async function mathTrainingHTTP(
  req: IncomingMessage,
  path: string,
  url: URL,
  auth: { service: AuthService; config: AuthConfig } | undefined,
  repo: MathTrainingRepository | undefined,
  json: (s: number, v: unknown) => void,
) {
  if (
    !(req.url ?? "").startsWith("/api/v1/learners/") ||
    !/\/subjects\/math\/(training|study)/.test(req.url ?? "")
  )
    return false;
  if (!repo) throw new AppError("FEATURE_DISABLED", 403);
  if (!auth) throw new AppError("SESSION_REQUIRED", 401);
  if (url.search || /%|\\|(?:^|\/)\.{1,2}(?:\/|$)/.test(req.url ?? ""))
    throw new AppError("REQUEST_INVALID", 400);
  const studyMatch =
    /^\/api\/v1\/learners\/([A-Za-z0-9][A-Za-z0-9:._-]{0,119})\/subjects\/math\/study\/(state|reading|session-start|session-draft|help|self-check|submit|note|thinking|parent-thinking|parent-formal|backup|restore)$/.exec(
      path,
    );
  const m =
    /^\/api\/v1\/learners\/([A-Za-z0-9][A-Za-z0-9:._-]{0,119})\/subjects\/math\/training\/(state|today|case|self|parent-self|parent-case|backup|restore)$/.exec(
      path,
    );
  if (studyMatch) {
    const scope = studyMatch[1],
      endpoint = studyMatch[2],
      session = readAuthSession(req, auth.service, auth.config);
    auth.service.learners(session, scope);
    if (
      req.headers["sec-fetch-site"] === "cross-site" ||
      (req.headers.origin !== undefined &&
        req.headers.origin !== auth.config.origin)
    )
      throw new AppError("ORIGIN_REJECTED", 403);
    if (
      (endpoint.startsWith("parent-") ||
        ["backup", "restore"].includes(endpoint)) &&
      session.actor.kind !== "parent"
    )
      throw new AppError("PARENT_REQUIRED", 403);
    if (req.method === "GET" && ["state", "backup"].includes(endpoint)) {
      json(
        200,
        endpoint === "state" ? repo.studyData(scope) : repo.studyBackup(scope),
      );
      return true;
    }
    if (req.method !== "POST" || endpoint === "state" || endpoint === "backup")
      throw new AppError("METHOD_NOT_ALLOWED", 405);
    if (req.headers.origin !== auth.config.origin)
      throw new AppError("ORIGIN_REJECTED", 403);
    auth.service.csrf(session, req.headers["x-csrf-token"]);
    const value = await body(
      req,
      endpoint === "restore" ? 8 * 1024 * 1024 : 65536,
    );
    if (endpoint === "restore") {
      json(
        200,
        restoreDomain(() => repo.studyRestore(scope, value)),
      );
      return true;
    }
    const parsed = studyEventSchema.safeParse(value);
    if (!parsed.success) throw new AppError("SCHEMA_INVALID", 422);
    try {
      json(
        200,
        repo.studyDispatch(
          scope,
          endpoint as (typeof studyChannels)[number],
          parsed.data,
        ),
      );
    } catch (e) {
      const code = (e as { status?: number }).status;
      if (code && [400, 403, 404, 409].includes(code))
        throw new AppError("MATH_STUDY_COMMAND_REJECTED", code);
      throw e;
    }
    return true;
  }
  if (!m) throw new AppError("REQUEST_INVALID", 400);
  if (
    req.headers["sec-fetch-site"] === "cross-site" ||
    (req.headers.origin !== undefined &&
      req.headers.origin !== auth.config.origin)
  )
    throw new AppError("ORIGIN_REJECTED", 403);
  const session = readAuthSession(req, auth.service, auth.config);
  // Parent elevation and every grant are checked live, on reads and writes.
  auth.service.learners(session, m[1]);
  const parent = ["parent-self", "parent-case", "backup", "restore"].includes(
    m[2],
  );
  if (parent && session.actor.kind !== "parent")
    throw new AppError("PARENT_REQUIRED", 403);
  if (req.method === "GET") {
    if (m[2] === "state") json(200, repo.data(m[1]));
    else if (m[2] === "today") json(200, repo.today(m[1]));
    else if (m[2] === "backup") json(200, repo.backup(m[1]));
    else throw new AppError("METHOD_NOT_ALLOWED", 405);
    return true;
  }
  if (
    req.method !== "POST" ||
    !["case", "self", "parent-self", "parent-case", "restore"].includes(m[2])
  )
    throw new AppError("METHOD_NOT_ALLOWED", 405);
  if (req.headers.origin !== auth.config.origin)
    throw new AppError("ORIGIN_REJECTED", 403);
  auth.service.csrf(session, req.headers["x-csrf-token"]);
  const value = await body(req, m[2] === "restore" ? 4 * 1024 * 1024 : 16384);
  if (m[2] === "restore") {
    json(
      200,
      restoreDomain(() => repo.restore(m[1], value)),
    );
    return true;
  }
  const parsed = (parent ? parentEvent : trainingEventSchema).safeParse(value);
  if (!parsed.success) throw new AppError("SCHEMA_INVALID", 422);
  try {
    json(
      200,
      repo.dispatch(
        m[1],
        m[2] as "case" | "self" | "parent-self" | "parent-case",
        parsed.data,
      ),
    );
  } catch (e) {
    const code = (e as { status?: number }).status;
    if (code && [400, 403, 404, 409].includes(code))
      throw new AppError("MATH_TRAINING_COMMAND_REJECTED", code);
    throw e;
  }
  return true;
}
