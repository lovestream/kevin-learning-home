// Isolated trial-only TLS termination. No production trust/config changes.
import { createServer } from "node:https";
import { request } from "node:http";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export function proxy({ origin, key, cert, upstream = "app", port = 4177 }) {
  const expected = new URL(origin);
  if (origin !== expected.origin || expected.protocol !== "https:")
    throw Error("EXACT_HTTPS_ORIGIN_REQUIRED");
  const server = createServer(
    { key, cert, minVersion: "TLSv1.2" },
    (req, res) => {
      if (
        req.headers.host !== expected.host ||
        !req.url?.startsWith("/") ||
        req.url.startsWith("//")
      ) {
        req.resume();
        res.writeHead(403, { "Cache-Control": "no-store" });
        return res.end("Host/path rejected");
      }
      const headers = { ...req.headers };
      for (const field of [
        "connection",
        "proxy-authorization",
        "proxy-connection",
        "upgrade",
        "x-forwarded-for",
        "x-forwarded-host",
        "x-forwarded-proto",
      ])
        delete headers[field];
      // Preserve exact Host, Origin, Cookie and CSRF. AuthService remains authoritative.
      const outgoing = request(
        { host: upstream, port, path: req.url, method: req.method, headers },
        (incoming) => {
          res.writeHead(incoming.statusCode ?? 503, incoming.headers);
          incoming.pipe(res);
          incoming.on("error", () => res.destroy());
        },
      );
      outgoing.setTimeout(10000, () =>
        outgoing.destroy(Error("UPSTREAM_TIMEOUT")),
      );
      outgoing.on("error", () => {
        if (!res.headersSent)
          res.writeHead(503, { "Cache-Control": "no-store" });
        res.end("Trial service unavailable");
      });
      req.on("aborted", () => outgoing.destroy());
      res.on("close", () => {
        if (!res.writableEnded) outgoing.destroy();
      });
      req.pipe(outgoing);
    },
  );
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  return server;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const server = proxy({
    origin: process.env.TRIAL_ORIGIN,
    key: readFileSync("/tls/server.key"),
    cert: readFileSync("/tls/server.crt"),
  });
  server.listen(8443, "0.0.0.0");
  for (const signal of ["SIGTERM", "SIGINT"])
    process.once(signal, () => server.close(() => process.exit(0)));
}
