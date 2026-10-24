import { MathLessonService } from "../../packages/subjects/math/service.ts";
import {
  createServer as httpsServer,
  request as httpsRequest,
} from "node:https";
import { request as httpRequest, type RequestListener } from "node:http";
import type { Server } from "node:http";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { join, resolve } from "node:path";
import { fixture, port } from "../foundation/helpers.ts";
import { Store } from "../../packages/platform/store.ts";
import { AuthService } from "../../packages/auth/service.ts";
import { authConfig } from "../../packages/auth/config.ts";
import { createHttp } from "../../apps/server/http.ts";
export const secret = () => randomBytes(24).toString("base64url");
export async function authFixture(
  tls = false,
  empty = false,
  math: boolean | MathLessonService = false,
) {
  process.env.NODE_ENV = "test";
  const f = fixture(),
    n = await port(),
    origin = (tls ? "https://localhost:" : "http://127.0.0.1:") + n;
  let now = Date.now(),
    store = f.store,
    auth = new AuthService(store, () => now),
    server: Server;
  const parentLogin = "p-" + randomBytes(8).toString("hex"),
    password = secret(),
    childLogin = "c-" + randomBytes(8).toString("hex"),
    childPassword = secret();
  const parent = empty
    ? ""
    : await auth.bootstrap(parentLogin, "Synthetic parent", password);
  const child = empty
    ? { actorId: "", learnerId: "" }
    : await auth.provisionLearner(
        parent,
        childLogin,
        "Synthetic learner",
        childPassword,
      );
  let key: Buffer | undefined, cert: Buffer | undefined;
  if (tls) {
    execFileSync(
      "openssl",
      [
        "req",
        "-x509",
        "-newkey",
        "rsa:2048",
        "-nodes",
        "-days",
        "1",
        "-subj",
        "/CN=localhost",
        "-addext",
        "subjectAltName=DNS:localhost",
        "-keyout",
        join(f.root, "fixture.key"),
        "-out",
        join(f.root, "fixture.crt"),
      ],
      { stdio: "ignore" },
    );
    key = readFileSync(join(f.root, "fixture.key"));
    cert = readFileSync(join(f.root, "fixture.crt"));
  }
  const config = authConfig(
    origin,
    tls ? "production" : "loopback-development",
  );
  const start = async () => {
    const inner = createHttp(store, {
      webRoot: resolve("apps/web/dist"),
      origin,
      auth: { service: auth, config },
      ...(math
        ? {
            math:
              math === true
                ? new MathLessonService(resolve("apps/web/dist"))
                : math,
          }
        : {}),
    });
    server = tls
      ? httpsServer(
          { key, cert },
          inner.listeners("request")[0] as RequestListener,
        )
      : inner;
    await new Promise<void>((r) => server.listen(n, "127.0.0.1", r));
  };
  const close = async () => {
    server.closeAllConnections();
    await new Promise<void>((r, e) =>
      server.close((err) => (err ? e(err) : r())),
    );
  };
  await start();
  function client() {
    let cookie = "",
      csrf = "";
    const c = {
      get cookie() {
        return cookie;
      },
      get csrf() {
        return csrf;
      },
      async call(
        method: string,
        path: string,
        body: unknown = {},
        overrides: Record<string, string | undefined> = {},
      ) {
        const payload = JSON.stringify(body);
        const headers: Record<string, string | undefined> = {
          Host: new URL(origin).host,
          ...(method === "POST"
            ? {
                "Content-Type": "application/json",
                Origin: origin,
                "X-CSRF-Token": csrf,
                "Content-Length": String(Buffer.byteLength(payload)),
              }
            : {}),
          ...(cookie ? { Cookie: cookie } : {}),
          ...overrides,
        };
        const result = await new Promise<{
          status: number;
          body: any;
          headers: import("node:http").IncomingHttpHeaders;
        }>((resolve, reject) => {
          const request = tls ? httpsRequest : httpRequest;
          const req = request(
            {
              agent: false,
              hostname: "127.0.0.1",
              port: n,
              path,
              method,
              headers: Object.fromEntries(
                Object.entries(headers).filter(([, v]) => v !== undefined),
              ),
              ...(tls ? { ca: cert, servername: "localhost" } : {}),
            },
            (res) => {
              let out = "";
              res.on("data", (b) => (out += b));
              res.on("end", () => {
                try {
                  resolve({
                    status: res.statusCode!,
                    body: out ? JSON.parse(out) : null,
                    headers: res.headers,
                  });
                } catch {
                  reject(Error("RESPONSE_INVALID"));
                }
              });
            },
          );
          req.on("error", reject);
          req.setTimeout(5000, () => req.destroy(Error("HTTP_TIMEOUT")));
          req.end(method === "POST" ? payload : undefined);
        });
        if (result.headers["set-cookie"])
          cookie = result.headers["set-cookie"][0].split(";")[0];
        if (typeof result.body?.csrfToken === "string")
          csrf = result.body.csrfToken;
        return result;
      },
      login: async (learner = false) =>
        c.call("POST", "/api/v1/auth/login", {
          login: learner ? childLogin : parentLogin,
          password: learner ? childPassword : password,
        }),
    };
    return c;
  }
  return {
    ...f,
    origin,
    config,
    parent,
    child,
    parentLogin,
    password,
    childLogin,
    childPassword,
    client,
    get store() {
      return store;
    },
    get auth() {
      return auth;
    },
    advance: (ms: number) => {
      now += ms;
    },
    async restart() {
      await close();
      store.close();
      store = new Store(f.paths.data);
      auth = new AuthService(store, () => now);
      await start();
    },
    async stop() {
      await close();
      store.close();
      f.close();
    },
  };
}
