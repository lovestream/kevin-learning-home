// Standalone content-only process. No production server, identity, math service or SQLite imports.
import http from "node:http";
import { readFileSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadContent, hash } from "./content.ts";
import { runtimeBoundary, type PreviewRuntime } from "./runtime.ts";
const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const CSP =
  "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'";
const mimes: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};
export async function startPreview({
  root = ROOT,
  port = 4179,
  enabled = false,
  ...runtime
}: { root?: string; port?: number; enabled?: boolean } & PreviewRuntime = {}) {
  if (!enabled) throw Error("EXPLICIT_CONTENT_PREVIEW_ENABLE_REQUIRED");
  if (!Number.isInteger(port) || port < 0 || port > 65535)
    throw Error("INVALID_PREVIEW_PORT");
  const boundary = runtimeBoundary(runtime);
  const { catalog, lessons } = loadContent(root),
    dist = join(root, "apps/preview/dist");
  const seal = JSON.parse(readFileSync(join(dist, "seal.json"), "utf8")) as {
    schemaVersion: number;
    buildSha: string;
    catalogSha256: string;
    files: Record<string, string>;
  };
  if (
    seal.schemaVersion !== 1 ||
    !/^[a-f0-9]{40}$/.test(seal.buildSha) ||
    seal.catalogSha256 !==
      hash(readFileSync(join(root, "apps/preview/content/catalog.json")))
  )
    throw Error("CATALOG_SEAL_MISMATCH");
  const assets = new Map<string, Buffer>();
  for (const [name, expected] of Object.entries(seal.files)) {
    if (
      !/^\/(?:index\.html|THIRD-PARTY-NOTICES\.txt|assets\/[A-Za-z0-9._-]+|\.vite\/manifest\.json|math-paper-folding\/template-[A-Za-z0-9.-]+\.svg)$/.test(
        name,
      )
    )
      throw Error("UNREVIEWED_BUILD_RESOURCE");
    const data = readFileSync(join(dist, name));
    if (hash(data) !== expected) throw Error("BUILD_RESOURCE_INTEGRITY_FAILED");
    assets.set(name, data);
  }
  if (!assets.has("/index.html")) throw Error("PREVIEW_ENTRY_MISSING");
  const server = http.createServer((req, res) => {
    const address = server.address();
    if (!address || typeof address === "string") {
      res.writeHead(503).end();
      return;
    }
    const host = req.headers.host,
      allowed = boundary.origin
        ? [boundary.origin.host]
        : [`127.0.0.1:${address.port}`, `localhost:${address.port}`],
      origin = req.headers.origin;
    const headers = {
      "Cache-Control": "no-store",
      "Content-Security-Policy": CSP,
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "X-Frame-Options": "DENY",
      "Cross-Origin-Resource-Policy": "same-origin",
      "Cross-Origin-Opener-Policy": "same-origin",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    };
    function send(
      status: number,
      data: string | Buffer,
      type = "application/json; charset=utf-8",
    ) {
      res.writeHead(status, {
        ...headers,
        "Content-Type": type,
        "Content-Length": Buffer.byteLength(data),
      });
      res.end(req.method === "HEAD" ? undefined : data);
    }
    if (
      !boundary.allowPeer(req.socket.remoteAddress ?? "") ||
      !host ||
      !allowed.includes(host) ||
      (origin !== undefined &&
        origin !== (boundary.origin?.origin ?? "http://" + host))
    ) {
      send(403, '{"error":"PREVIEW_ORIGIN_DENIED"}');
      return;
    }
    if (req.method !== "GET" && req.method !== "HEAD") {
      send(405, '{"error":"CONTENT_ONLY_NO_WRITES"}');
      return;
    }
    let pathname: string;
    try {
      pathname = new URL(req.url ?? "/", "http://" + host).pathname;
    } catch {
      send(400, '{"error":"INVALID_PATH"}');
      return;
    }
    if (pathname === "/health/ready") {
      send(
        200,
        '{"status":"content-only-ready","lessons":70,"database":false}',
      );
      return;
    }
    if (pathname === "/preview-api/v1/runtime") {
      send(
        200,
        JSON.stringify({
          buildSha: seal.buildSha,
          catalogSha256: seal.catalogSha256,
          contentOnly: true,
          database: false,
          lessons: 70,
        }),
      );
      return;
    }
    if (pathname === "/preview-api/v1/catalog") {
      send(200, JSON.stringify(catalog));
      return;
    }
    if (pathname.startsWith("/preview-api/v1/lessons/")) {
      let id: string;
      try {
        id = decodeURIComponent(
          pathname.slice("/preview-api/v1/lessons/".length),
        );
      } catch {
        send(400, '{"error":"INVALID_LESSON_ID"}');
        return;
      }
      const lesson = lessons.get(id);
      if (!lesson) {
        send(404, '{"error":"UNKNOWN_LESSON"}');
        return;
      }
      send(200, lesson.body);
      return;
    }
    if (pathname.startsWith("/lesson/") && lessons.has(pathname.slice(8))) {
      res
        .writeHead(308, {
          ...headers,
          Location: "/subjects/math/lessons/" + pathname.slice(8),
        })
        .end();
      return;
    }
    if (
      pathname === "/" ||
      pathname === "/subjects/math" ||
      pathname === "/math-paper-folding/print-templates.html" ||
      (pathname.startsWith("/subjects/math/lessons/") &&
        lessons.has(pathname.slice(23)))
    ) {
      send(200, assets.get("/index.html")!, "text/html; charset=utf-8");
      return;
    }
    const asset = assets.get(pathname);
    if (asset && pathname !== "/.vite/manifest.json") {
      send(200, asset, mimes[extname(pathname)] ?? "application/octet-stream");
      return;
    }
    send(404, '{"error":"CONTENT_ONLY_NOT_FOUND"}');
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, boundary.bind, () => resolve());
  });
  return server;
}
if (
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url
) {
  const server = await startPreview({
    enabled: process.env.KLH_CONTENT_PREVIEW === "1",
    port: Number(process.env.KLH_PREVIEW_PORT ?? 4179),
    runtime: process.env.KLH_PREVIEW_RUNTIME as PreviewRuntime["runtime"],
    bindAddress: process.env.KLH_PREVIEW_BIND,
    publicOrigin: process.env.KLH_PREVIEW_ORIGIN,
    peers: process.env.KLH_PREVIEW_PEERS?.split(","),
  });
  const addr = server.address();
  console.log(
    "数学内容体验：无账号、不保存；入口 " +
      (process.env.KLH_PREVIEW_ORIGIN ??
        (typeof addr === "object" && addr
          ? "http://127.0.0.1:" + addr.port + "/"
          : "")),
  );
  for (const signal of ["SIGINT", "SIGTERM"])
    process.once(signal, () => server.close());
}
