import type { IncomingMessage } from "node:http";
import { z } from "zod";
import { AppError } from "../../packages/contracts/index.ts";
import {
  AuthService,
  credentialsSchema,
  emptySchema,
  logoutSchema,
  unlockSchema,
} from "../../packages/auth/service.ts";
import { sessionCookie, type AuthConfig } from "../../packages/auth/config.ts";

export async function readAuthJSON(req: IncomingMessage) {
  if (req.headers["content-type"] !== "application/json")
    throw new AppError("CONTENT_TYPE_REQUIRED", 415);
  if (Number(req.headers["content-length"] ?? 0) > 4096)
    throw new AppError("PAYLOAD_TOO_LARGE", 413);
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 4096) throw new AppError("PAYLOAD_TOO_LARGE", 413);
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString());
  } catch {
    throw new AppError("INVALID_JSON", 400);
  }
}
function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const r = schema.safeParse(value);
  if (!r.success) throw new AppError("SCHEMA_INVALID", 422);
  return r.data;
}
function cookieValue(req: IncomingMessage, config: AuthConfig) {
  const values = (req.headers.cookie ?? "")
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.startsWith(config.cookieName + "="));
  if (values.length !== 1) throw new AppError("SESSION_REQUIRED", 401);
  return values[0].slice(config.cookieName.length + 1);
}
/** Reuse the exact cookie/session verifier; never a test context or client identity. */
export function readAuthSession(
  req: IncomingMessage,
  auth: AuthService,
  config: AuthConfig,
) {
  return auth.session(cookieValue(req, config));
}
export async function authHTTP(
  req: IncomingMessage,
  path: string,
  auth: AuthService,
  config: AuthConfig,
  json: (status: number, value: unknown) => void,
  setCookie: (value: string) => void,
) {
  const isAuth = path.startsWith("/api/v1/auth/");
  const learner = /^\/api\/v1\/learners(?:\/([^/]+))?$/.exec(path);
  // Provisioning is offline only; learner writes remain an explicitly disabled API.
  if (learner && req.method !== "GET") return false;
  const endpoint = isAuth ? path.slice("/api/v1/auth/".length) : "";
  if (
    !learner &&
    ![
      "login",
      "session",
      "logout",
      "rotate",
      "parent-unlock",
      "parent-lock",
    ].includes(endpoint)
  )
    return false;
  if (new URL(req.url!, config.origin).search)
    throw new AppError("AUTH_QUERY_REJECTED", 400);
  if (
    req.headers["sec-fetch-site"] === "cross-site" ||
    (req.headers.origin !== undefined && req.headers.origin !== config.origin)
  )
    throw new AppError("ORIGIN_REJECTED", 403);
  const read = req.method === "GET" && (endpoint === "session" || !!learner);
  if (!read && req.method !== "POST")
    throw new AppError("METHOD_NOT_ALLOWED", 405);
  if (req.method === "POST" && (endpoint === "session" || learner))
    throw new AppError("METHOD_NOT_ALLOWED", 405);
  if (!read && req.headers.origin !== config.origin)
    throw new AppError("ORIGIN_REJECTED", 403);
  const body = read ? undefined : await readAuthJSON(req);
  const source = req.socket.remoteAddress ?? "local"; // Never trust forwarded/Tailscale headers.
  if (endpoint === "login") {
    const c = parse(credentialsSchema, body),
      issued = await auth.login(c.login, c.password, source);
    if (!issued) throw new AppError("AUTH_INVALID", 401);
    setCookie(sessionCookie(config, issued.cookie, issued.maxAge));
    json(200, auth.view(auth.session(issued.cookie)));
    return true;
  }
  const cookie = cookieValue(req, config),
    session = auth.session(cookie);
  if (read) {
    json(
      200,
      learner
        ? { schemaVersion: 1, learners: auth.learners(session, learner[1]) }
        : auth.view(session),
    );
    return true;
  }
  auth.csrf(session, req.headers["x-csrf-token"]);
  if (endpoint === "logout") {
    const value = parse(logoutSchema, body);
    auth.logout(cookie, value.allDevices);
    setCookie(sessionCookie(config, "", 0));
    json(200, { schemaVersion: 1, authenticated: false });
    return true;
  }
  let issued;
  if (endpoint === "parent-unlock") {
    const value = parse(unlockSchema, body);
    issued = await auth.unlock(cookie, value.password, source);
    if (!issued) throw new AppError("AUTH_INVALID", 401);
  } else {
    parse(emptySchema, body);
    issued =
      endpoint === "parent-lock" ? auth.lock(cookie) : auth.rotate(cookie);
  }
  setCookie(sessionCookie(config, issued.cookie, issued.maxAge));
  json(200, auth.view(auth.session(issued.cookie)));
  return true;
}
