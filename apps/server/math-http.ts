import type { IncomingMessage } from "node:http";
import type { AuthService } from "../../packages/auth/service.ts";
import type { AuthConfig } from "../../packages/auth/config.ts";
import type { MathLessonService } from "../../packages/subjects/math/service.ts";
import { MATH_LESSON_ID } from "../../packages/contracts/math-readonly.ts";
import { AppError } from "../../packages/contracts/index.ts";
import { readAuthSession } from "./auth-http.ts";
export function mathHTTP(
  req: IncomingMessage,
  path: string,
  url: URL,
  auth: { service: AuthService; config: AuthConfig } | undefined,
  math: MathLessonService | undefined,
  json: (s: number, v: unknown) => void,
) {
  const raw = req.url ?? "";
  if (
    !raw.startsWith("/api/v1/learners/") ||
    !raw.includes("/subjects/math/lessons")
  )
    return false;
  if (!math) throw new AppError("FEATURE_DISABLED", 403);
  if (req.method !== "GET") throw new AppError("METHOD_NOT_ALLOWED", 405);
  if (url.search || /%|\\|(?:^|\/)\.{1,2}(?:\/|$)/.test(raw))
    throw new AppError("REQUEST_INVALID", 400);
  const match =
    /^\/api\/v1\/learners\/([A-Za-z0-9][A-Za-z0-9:._-]{0,119})\/subjects\/math\/lessons\/([A-Za-z0-9_-]{1,120})$/.exec(
      path,
    );
  if (!match) throw new AppError("REQUEST_INVALID", 400);
  if (!auth) throw new AppError("SESSION_REQUIRED", 401);
  if (
    req.headers["sec-fetch-site"] === "cross-site" ||
    (req.headers.origin !== undefined &&
      req.headers.origin !== auth.config.origin)
  )
    throw new AppError("ORIGIN_REJECTED", 403);
  const session = readAuthSession(req, auth.service, auth.config);
  // This existing method enforces parent elevation and live grants, including child binding.
  auth.service.learners(session, match[1]);
  if (match[2] !== MATH_LESSON_ID) throw new AppError("LESSON_NOT_FOUND", 404);
  json(200, math.get(match[1]));
  return true;
}
