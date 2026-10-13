import http from "node:http";
import { readFile } from "node:fs/promises";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { SQLiteAdapter } from "./adapter.mjs";
import { handle, initialize } from "../shared/api.mjs";
const config = JSON.parse(await readFile(process.env.KLH_BENCH_CONFIG, "utf8"));
const db = new SQLiteAdapter(config.database);
await initialize(db, config.mediaAssets);
const files = {
  "/": "index.html",
  "/index.html": "index.html",
  "/app.js": "app.js",
  "/style.css": "style.css",
};
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
};
const server = http.createServer(async (req, res) => {
  try {
    if (req.headers.host !== new URL(config.env.PUBLIC_ORIGIN).host) {
      res.writeHead(403);
      res.end('{"error":{"code":"HOST_FORBIDDEN"}}');
      return;
    }
    const pathname = new URL(req.url, config.env.PUBLIC_ORIGIN).pathname;
    if (files[pathname]) {
      res.writeHead(200, {
        "Content-Type":
          types[files[pathname].slice(files[pathname].lastIndexOf("."))],
        "Cache-Control": "no-cache",
      });
      res.end(
        await readFile(
          new URL("../shared/web/" + files[pathname], import.meta.url),
        ),
      );
      return;
    }
    const request = new Request(new URL(req.url, config.env.PUBLIC_ORIGIN), {
      method: req.method,
      headers: req.headers,
      ...(!["GET", "HEAD"].includes(req.method)
        ? { body: Readable.toWeb(req), duplex: "half" }
        : {}),
    });
    const response = await handle(request, db, config.env);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    if (response.body) await pipeline(Readable.fromWeb(response.body), res);
    else res.end();
  } catch (e) {
    if (!res.headersSent)
      res.writeHead(503, { "Content-Type": "application/json" });
    res.end('{"error":{"code":"SERVICE_UNAVAILABLE"}}');
  }
});
server.listen(
  config.port,
  process.env.KLH_BENCH_LISTEN_HOST ?? "127.0.0.1",
  () =>
    process.send?.({
      ready: true,
      environment: db.environment(),
      uid: process.getuid?.(),
    }),
);
process.on("message", (msg) => {
  if (msg.kind === "metrics")
    process.send?.({
      kind: "metrics",
      id: msg.id,
      resourceUsage: process.resourceUsage(),
      memoryUsage: process.memoryUsage(),
      db: db.stats,
      environment: db.environment(),
    });
});
process.on("SIGTERM", () =>
  server.close(() => {
    db.close();
    process.exit(0);
  }),
);
