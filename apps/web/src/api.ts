import "./validation.ts";
import {
  authSessionSchema,
  type AuthSessionResponse,
} from "../../../packages/contracts/auth.ts";
import {
  subjectRegistrationSchema,
  type SubjectRegistration,
} from "../../../packages/subjects/index.ts";
import { z } from "zod";
export type Session = AuthSessionResponse;
export type { SubjectRegistration };
export const learnerListSchema = z.strictObject({
  schemaVersion: z.literal(1),
  learners: z
    .array(
      z.strictObject({
        id: z.string().min(1).max(120),
        label: z.string().min(1).max(120),
      }),
    )
    .max(32),
});
export type Learner = z.infer<typeof learnerListSchema>["learners"][number];
export class RequestError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(code: string, status = 0) {
    super(code);
    this.code = code;
    this.status = status;
  }
}
export async function request(
  path: string,
  signal: AbortSignal,
  body?: unknown,
  csrf?: string,
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: body === undefined ? "GET" : "POST",
      credentials: "same-origin",
      cache: "no-store",
      signal,
      headers:
        body === undefined
          ? {}
          : {
              "Content-Type": "application/json",
              ...(csrf ? { "X-CSRF-Token": csrf } : {}),
            },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch {
    throw new RequestError(
      signal.aborted ? "REQUEST_INTERRUPTED" : "NETWORK_UNAVAILABLE",
    );
  }
  let value: any;
  try {
    value = await response.json();
  } catch {
    throw new RequestError("RESPONSE_INVALID", 503);
  }
  if (!response.ok)
    throw new RequestError(
      typeof value?.error?.code === "string"
        ? value.error.code
        : "REQUEST_FAILED",
      response.status,
    );
  return value;
}
export function sessionDTO(value: unknown): Session {
  const parsed = authSessionSchema.safeParse(value);
  if (!parsed.success) throw new RequestError("RESPONSE_INVALID", 503);
  const session = parsed.data;
  if (
    (session.actor.role === "parent" &&
      !session.parentUnlocked &&
      session.learnerIds.length) ||
    (session.actor.role === "learner" &&
      (session.parentUnlocked || session.learnerIds.length !== 1))
  )
    throw new RequestError("RESPONSE_INVALID", 503);
  return session;
}
export function learnerDTO(value: unknown, session: Session): Learner[] {
  const parsed = learnerListSchema.safeParse(value);
  if (
    !parsed.success ||
    parsed.data.learners.some((l) => !session.learnerIds.includes(l.id)) ||
    new Set(parsed.data.learners.map((l) => l.id)).size !==
      parsed.data.learners.length
  )
    throw new RequestError("RESPONSE_INVALID", 503);
  return parsed.data.learners;
}
export function catalogDTO(value: unknown): {
  auth: boolean;
  subjects: SubjectRegistration[];
} {
  const root = z
    .object({
      features: z.object({ auth: z.boolean() }),
      subjects: z.array(z.unknown()).max(32),
    })
    .safeParse(value);
  if (!root.success) throw new RequestError("RESPONSE_INVALID", 503);
  const ids = new Set<string>(),
    subjects: SubjectRegistration[] = [];
  for (const entry of root.data.subjects) {
    const r = subjectRegistrationSchema.safeParse(entry);
    if (r.success && !ids.has(r.data.id)) {
      ids.add(r.data.id);
      subjects.push(r.data);
    }
  }
  return { auth: root.data.features.auth, subjects };
}
export function errorMessage(e: unknown, action = "操作") {
  if (!(e instanceof RequestError)) return "暂时无法完成，请重新确认。";
  if (e.status === 401)
    return action === "登录"
      ? "登录名或密码不正确，请重新输入。"
      : "会话已失效，请重新登录。";
  if (e.code === "FEATURE_DISABLED")
    return "登录服务尚未启用，请联系家庭管理员。";
  if (e.status === 403) return "权限已变化，请重新确认身份或解锁家长权限。";
  if (e.status === 422 || e.status === 400) return "请检查输入格式后重试。";
  if (e.status === 429) return "尝试次数较多，请稍后再试。";
  if (e.status === 503) return "服务暂时不可用，请稍后重新确认。";
  if (e.code === "REQUEST_INTERRUPTED")
    return `${action}已停止等待，结果需重新确认。`;
  return "连接尚未确认，请检查网络后重试。";
}
