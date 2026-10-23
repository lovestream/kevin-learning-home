import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { request } from "node:https";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { proxy } from "../../infra/trial/tls-proxy.mjs";

test("isolated HTTPS proxy preserves auth boundary, rejects wrong Host and fails closed", async () => {
  const root = mkdtempSync(join(tmpdir(), "klh-proxy-"));
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
      "-keyout",
      join(root, "key"),
      "-out",
      join(root, "cert"),
    ],
    { stdio: "ignore" },
  );
  let received;
  const backend = createServer((req, res) => {
    received = req.headers;
    res.writeHead(200, {
      "Set-Cookie":
        "__Host-klh-session=synthetic; Path=/; Secure; HttpOnly; SameSite=Strict",
      "Content-Security-Policy": "default-src 'self'",
    });
    res.end("ok");
  });
  await new Promise((r) => backend.listen(0, "127.0.0.1", r));
  const tls = proxy({
    origin: "https://localhost:38443",
    key: readFileSync(join(root, "key")),
    cert: readFileSync(join(root, "cert")),
    upstream: "127.0.0.1",
    port: backend.address().port,
  });
  await new Promise((r) => tls.listen(0, "127.0.0.1", r));
  const call = (host = "localhost:38443") =>
    new Promise((resolve, reject) => {
      const req = request(
        {
          hostname: "127.0.0.1",
          port: tls.address().port,
          path: "/api/v1/auth/parent-lock",
          method: "POST",
          rejectUnauthorized: false,
          headers: {
            Host: host,
            Origin: "https://localhost:38443",
            "X-CSRF-Token": "synthetic",
            Cookie: "synthetic=value",
            "X-Forwarded-For": "spoof",
            "X-Forwarded-Proto": "http",
          },
        },
        (res) => {
          res.resume();
          res.on("end", () =>
            resolve({ status: res.statusCode, headers: res.headers }),
          );
        },
      );
      req.on("error", reject);
      req.end("{}");
    });
  try {
    const r = await call();
    assert.equal(r.status, 200);
    assert.equal(received.host, "localhost:38443");
    assert.equal(received.origin, "https://localhost:38443");
    assert.equal(received["x-csrf-token"], "synthetic");
    assert.equal(received.cookie, "synthetic=value");
    assert.equal(received["x-forwarded-for"], undefined);
    assert.equal(received["x-forwarded-proto"], undefined);
    assert.match(
      r.headers["set-cookie"][0],
      /Secure; HttpOnly; SameSite=Strict/,
    );
    assert.equal(r.headers["content-security-policy"], "default-src 'self'");
    assert.equal((await call("evil.invalid")).status, 403);
    await new Promise((r) => backend.close(r));
    assert.equal((await call()).status, 503);
    assert.throws(
      () => proxy({ origin: "http://localhost", key: "", cert: "" }),
      /EXACT_HTTPS/,
    );
  } finally {
    tls.closeAllConnections();
    await new Promise((r) => tls.close(r));
    if (backend.listening) await new Promise((r) => backend.close(r));
    rmSync(root, { recursive: true, force: true });
  }
});
