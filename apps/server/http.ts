import { createServer, type IncomingMessage } from "node:http";
import { readFileSync, existsSync, realpathSync } from "node:fs";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { AppError, parseCommand } from "../../packages/contracts/index.ts";
import { subjectCatalog, wallet } from "../../packages/subjects/index.ts";
import { mathTrainingHTTP } from "./math-training-http.ts";
import type { MathTrainingRepository } from "../../packages/math-training/repository.ts";
import { mathHTTP } from "./math-http.ts";
import type { MathLessonService } from "../../packages/subjects/math/service.ts";
import { authHTTP } from "./auth-http.ts";
import { authConfig, type AuthConfig } from "../../packages/auth/config.ts";
import type { AuthService } from "../../packages/auth/service.ts";
import type { Store } from "../../packages/platform/store.ts";
import { isShellRoute } from "../../packages/contracts/routes.ts";

export interface TestContext {
  learnerId: string;
  sessionId: string;
}
export function createHttp(
  store: Store,
  options: {
    webRoot: string;
    origin: string;
    auth?: { service: AuthService; config: AuthConfig };
    math?: MathLessonService;
    syntheticMathTraining?: MathTrainingRepository;
    readiness?: () => void;
    testContext?: (req: IncomingMessage) => TestContext | null;
    afterWrites?: () => void;
  },
) {
  if (
    options.syntheticMathTraining &&
    (process.env.NODE_ENV !== "test" ||
      !options.auth ||
      options.auth.config.mode !== "loopback-development" ||
      !/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(options.origin))
  )
    throw new AppError("MATH_TRAINING_SYNTHETIC_ONLY", 503);
  if (options.testContext && process.env.NODE_ENV !== "test")
    throw new AppError("TEST_CONTEXT_DISABLED", 503);
  if (options.auth) {
    if (options.testContext) throw new AppError("TEST_CONTEXT_DISABLED", 503);
    const validated = authConfig(
      options.auth.config.origin,
      options.auth.config.mode,
    );
    if (
      validated.origin !== options.origin ||
      validated.secure !== options.auth.config.secure ||
      validated.cookieName !== options.auth.config.cookieName
    )
      throw new AppError("AUTH_ORIGIN_CONFIG", 503);
  }
  const webRoot = resolve(options.webRoot),
    origin = new URL(options.origin);
  return createServer(async (req, res) => {
    const requestId = randomUUID();
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
    );
    const json = (status: number, value: unknown) => {
      res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
      });
      res.end(JSON.stringify(value));
    };
    try {
      if (req.headers.host !== origin.host)
        throw new AppError("HOST_REJECTED", 403);
      const url = new URL(req.url ?? "/", origin),
        path = url.pathname;
      if (req.method === "GET" && path === "/health/live")
        return json(200, { status: "ok" });
      if (req.method === "GET" && path === "/health/ready") {
        if (!store.isReady()) throw new AppError("STORAGE_UNAVAILABLE", 503);
        options.readiness?.();
        return json(200, {
          status: "ready",
          schemaVersion: store.schemaVersion,
        });
      }
      if (req.method === "GET" && path === "/api/v1/config")
        return json(200, {
          schemaVersion: 1,
          subjects: subjectCatalog(!!options.math),
          features: {
            auth: !!options.auth,
            learning: false,
            parent: false,
            mediaDelivery: false,
            wallet: wallet.enabled,
          },
        });
      if (
        options.auth &&
        (await authHTTP(
          req,
          path,
          options.auth.service,
          options.auth.config,
          json,
          (value) => res.setHeader("Set-Cookie", value),
        ))
      )
        return;
      if (
        await mathTrainingHTTP(
          req,
          path,
          url,
          options.auth,
          options.syntheticMathTraining,
          json,
        )
      )
        return;
      if (mathHTTP(req, path, url, options.auth, options.math, json)) return;
      if (path.startsWith("/api/")) {
        const route =
          /^\/api\/v1\/learners\/([^/]+)\/subjects\/(foundation-demo)\/(state|commands)$/.exec(
            path,
          );
        if (!options.testContext || !route)
          throw new AppError("FEATURE_DISABLED", 403);
        const context = options.testContext(req);
        if (!context) throw new AppError("SESSION_REQUIRED", 401);
        if (context.learnerId !== route[1])
          throw new AppError("LEARNER_FORBIDDEN", 403);
        if (req.method === "GET" && route[3] === "state")
          return json(200, store.state(route[1], route[2]));
        if (req.method === "POST" && route[3] === "commands") {
          if (
            req.headers.origin !== origin.origin ||
            req.headers["sec-fetch-site"] === "cross-site"
          )
            throw new AppError("ORIGIN_REJECTED", 403);
          if (req.headers["content-type"] !== "application/json")
            throw new AppError("CONTENT_TYPE_REQUIRED", 415);
          let length = 0;
          const chunks: Buffer[] = [];
          for await (const piece of req) {
            length += piece.length;
            if (length > 16384) throw new AppError("PAYLOAD_TOO_LARGE", 413);
            chunks.push(piece);
          }
          let value: unknown;
          try {
            value = JSON.parse(Buffer.concat(chunks).toString());
          } catch {
            throw new AppError("INVALID_JSON", 400);
          }
          const command = parseCommand(
            value,
            typeof req.headers["idempotency-key"] === "string"
              ? req.headers["idempotency-key"]
              : undefined,
          );
          if (command.learnerId !== route[1] || command.subjectId !== route[2])
            throw new AppError("COMMAND_SCOPE_MISMATCH", 403);
          return json(200, store.command(command, options.afterWrites));
        }
        throw new AppError("METHOD_NOT_ALLOWED", 405);
      }
      if (req.method !== "GET" && req.method !== "HEAD")
        throw new AppError("METHOD_NOT_ALLOWED", 405);
      let key: string;
      try {
        key = decodeURIComponent(path);
      } catch {
        throw new AppError("PATH_INVALID", 400);
      }
      if (
        key.includes("\\") ||
        key.includes("\0") ||
        key.split("/").includes("..") ||
        key.startsWith("/.")
      )
        throw new AppError("PATH_INVALID", 400);
      const file = isShellRoute(key)
        ? join(webRoot, "index.html")
        : key.startsWith("/assets/")
          ? join(webRoot, key)
          : "";
      if (
        !file ||
        !existsSync(file) ||
        !realpathSync(file).startsWith(webRoot + "/")
      )
        throw new AppError("NOT_FOUND", 404);
      const ext = file.split(".").at(-1);
      const type =
        ext === "html"
          ? "text/html"
          : ext === "js"
            ? "text/javascript"
            : ext === "css"
              ? "text/css"
              : null;
      if (!type) throw new AppError("NOT_FOUND", 404);
      res.writeHead(200, { "Content-Type": type + "; charset=utf-8" });
      res.end(req.method === "HEAD" ? undefined : readFileSync(file));
    } catch (e) {
      const err =
        e instanceof AppError ? e : new AppError("STORAGE_UNAVAILABLE", 503);
      if (!res.headersSent && err.status === 429)
        res.setHeader("Retry-After", err.code === "AUTH_BUSY" ? "1" : "900");
      if (!res.headersSent)
        json(err.status, {
          schemaVersion: 1,
          requestId,
          error: {
            code: err.code,
            message: err.code,
            retryable: err.status === 503 || err.status === 429,
            ...(err.currentRevision === undefined
              ? {}
              : { currentRevision: err.currentRevision }),
          },
        });
      else res.destroy();
    }
  });
}
