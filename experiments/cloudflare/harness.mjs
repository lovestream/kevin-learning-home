import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { mkdir, readFile, cp } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { D1Adapter } from "./adapter.mjs";
import { initialize } from "../shared/api.mjs";
import { startMediaMock } from "../shared/media-mock.mjs";
export async function createHarness({
  directory,
  port = 37911,
  mediaPort = 37912,
  restore,
} = {}) {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const persist = path.join(directory, "d1"),
    objects = path.join(directory, "objects");
  if (restore) {
    await cp(path.join(restore, "d1"), persist, { recursive: true });
    await cp(path.join(restore, "objects"), objects, { recursive: true });
  }
  const origin = `http://127.0.0.1:${port}`,
    key = randomUUID() + randomUUID();
  const media = await startMediaMock({
    directory: objects,
    port: mediaPort,
    key,
    backendOrigin: origin,
    publicOrigin: origin,
    seedObjects: !restore,
  });
  let mf, binding, db;
  const env = {
    BENCH_ENV: process.env.CI ? "ci" : "local",
    PUBLIC_ORIGIN: origin,
    MEDIA_ORIGIN: media.origin,
    MEDIA_MOCK_KEY: key,
    MEDIA_PROVIDER: "local-a",
  };
  const launch = async () => {
    mf = new Miniflare(
      convertV4MiniflareOptions({
        name: "klh-bench-local-only",
        host: "127.0.0.1",
        port,
        modules: true,
        scriptPath: new URL("./dist/worker.js", import.meta.url).pathname,
        compatibilityDate: "2026-10-13",
        compatibilityFlags: ["nodejs_compat"],
        bindings: env,
        d1Databases: { DB: "00000000-0000-0000-0000-000000000001" },
        resourcePersistencePath: persist,
        serviceBindings: {
          ASSETS: async (request) => {
            const filename = {
              "/": "index.html",
              "/index.html": "index.html",
              "/app.js": "app.js",
              "/style.css": "style.css",
            }[new URL(request.url).pathname];
            if (!filename) return new Response("not found", { status: 404 });
            return new Response(
              await readFile(
                new URL("../shared/web/" + filename, import.meta.url),
              ),
              {
                headers: {
                  "Content-Type": filename.endsWith(".html")
                    ? "text/html"
                    : filename.endsWith(".js")
                      ? "text/javascript"
                      : "text/css",
                  "Cache-Control": "no-cache",
                },
              },
            );
          },
        },
      }),
    );
    await mf.ready;
    binding = await mf.getD1Database("DB");
    db = new D1Adapter(binding);
    const schema = await readFile(
      new URL("../shared/schema.sql", import.meta.url),
      "utf8",
    );
    for (const sql of schema
      .split(";")
      .map((x) => x.trim())
      .filter(Boolean))
      await db.run(sql);
    await initialize(db, media.assets);
  };
  await launch();
  return {
    origin,
    get db() {
      return db;
    },
    media,
    directory,
    kind: "cloudflare",
    setDatabaseUnavailable:async enabled=>{env.BENCH_DB_FAULT=enabled?"on":"off";await mf.dispose();await launch();},
    environment: {
      simulator: "Miniflare/workerd",sqliteVersion:"NOT_EXPOSED_D1_SQL_FUNCTION_DENIED",miniflareVersion:JSON.parse(await readFile(new URL("../../node_modules/miniflare/package.json",import.meta.url))).version,workerdVersion:JSON.parse(await readFile(new URL("../../node_modules/workerd/package.json",import.meta.url))).version,
      remote: false,
      sessionPolicy: "first-primary",
      staticAssets:
        "local binding mock; Wrangler native asset smoke separately",
    },
    restart: async () => {
      await mf.dispose();
      await launch();
    },
    backup: async (target) => {
      await mkdir(target, { recursive: true });
      await mf.dispose();
      await cp(persist, path.join(target, "d1"), { recursive: true });
      await cp(objects, path.join(target, "objects"), { recursive: true });
      await launch();
    },
    close: async () => {
      await mf.dispose();
      await media.close();
    },
    terminate: async () => {
      await mf.dispose();
    },
    launch,
    setProvider: async (alias) => {
      env.MEDIA_PROVIDER = alias;
      await mf.dispose();
      await launch();
    },
    metrics: async () => ({
      workerCpuMs: null,
      free10msEnforcement: "NOT_RUN_REMOTE_APPROVAL_REQUIRED",
      hostMemory: process.memoryUsage(),
      d1: db.stats,
    }),
  };
}
