import { mkdtempSync, rmSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createServer } from "node:net";
import { randomUUID } from "node:crypto";
import { request } from "node:http";
import { Store } from "../../packages/platform/store.ts";
import { layout, prepareLayout } from "../../packages/platform/checkpoint.ts";
import { seed } from "../../scripts/synthetic.ts";
import { createHttp } from "../../apps/server/http.ts";
import type { LearningCommand } from "../../packages/contracts/index.ts";

// Native HTTP is required when intentionally testing Host. Node fetch ignores
// caller-supplied Host, so using fetch would test a different request.
export async function rawRead(
  url: string,
  headers: Record<string, string> = {},
) {
  return new Promise<{ status: number; body: string }>((resolve, reject) => {
    const req = request(url, { headers }, (res) => {
      let body = "";
      res.on("data", (b) => {
        body += b;
      });
      res.on("end", () => resolve({ status: res.statusCode ?? 0, body }));
    });
    req.on("error", reject);
    req.setTimeout(4000, () => req.destroy(Error("HTTP_TIMEOUT")));
    req.end();
  });
}

export function fixture() {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "klh-foundation-")));
  const paths = layout(root);
  prepareLayout(paths);
  const store = new Store(paths.data);
  const asset = seed(store, paths);
  return {
    root,
    paths,
    store,
    asset,
    close() {
      store.close();
      rmSync(root, { recursive: true, force: true });
    },
  };
}
export async function port() {
  const s = createServer();
  await new Promise<void>((r) => s.listen(0, "127.0.0.1", r));
  const n = (s.address() as { port: number }).port;
  await new Promise<void>((r, j) => s.close((e) => (e ? j(e) : r())));
  return n;
}
export async function httpFixture(
  afterWrites?: () => void,
  production = false,
) {
  const f = fixture(),
    origin = "http://127.0.0.1:" + (await port()),
    tokens: string[] = [randomUUID(), randomUUID()];
  process.env.NODE_ENV = "test";
  const server = createHttp(f.store, {
    webRoot: resolve("apps/web/dist"),
    origin,
    afterWrites,
    ...(production
      ? {}
      : {
          testContext: (req) => {
            const index = tokens.indexOf(
              String(req.headers["x-foundation-test-session"]),
            );
            return index < 0
              ? null
              : {
                  learnerId: "synthetic-learner",
                  sessionId: "synthetic-session-" + index,
                };
          },
        }),
  });
  await new Promise<void>((r) =>
    server.listen(Number(new URL(origin).port), "127.0.0.1", r),
  );
  return {
    ...f,
    origin,
    tokens,
    async stop() {
      await new Promise<void>((r, j) => server.close((e) => (e ? j(e) : r())));
      f.close();
    },
  };
}
export function send(
  origin: string,
  token: string,
  command: LearningCommand,
  key = command.commandId,
) {
  return fetch(
    origin +
      "/api/v1/learners/" +
      command.learnerId +
      "/subjects/" +
      command.subjectId +
      "/commands",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: origin,
        "Idempotency-Key": key,
        "X-Foundation-Test-Session": token,
      },
      body: JSON.stringify(command),
    },
  );
}
