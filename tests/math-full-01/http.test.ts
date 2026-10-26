import test from "node:test";
import { request as httpRequest } from "node:http";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  cpSync,
  rmSync,
  writeFileSync,
  readFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startPreview } from "../../apps/preview/server.ts";
import { hash } from "../../apps/preview/content.ts";
import { canonical } from "../../apps/preview/contract.ts";
import { authFixture } from "../auth/helpers.ts";
test("preview requires explicit enable; 70 real anonymous GETs have no cookies or write API", async () => {
  await assert.rejects(startPreview({ port: 0 }), /EXPLICIT/);
  const server = await startPreview({ port: 0, enabled: true }),
    address = server.address();
  assert(address && typeof address === "object");
  const origin = "http://127.0.0.1:" + address.port;
  try {
    const catalog = (await (
      await fetch(origin + "/preview-api/v1/catalog")
    ).json()) as { lessons: { lessonId: string }[]; navigationSha256: string };
    assert.equal(catalog.lessons.length, 70);
    const mapResponse = await fetch(origin + "/preview-api/v1/learning-map");
    assert.equal(mapResponse.status, 200);
    assert.equal(mapResponse.headers.get("set-cookie"), null);
    assert.equal(
      hash(canonical(await mapResponse.json())),
      catalog.navigationSha256,
    );
    for (const l of catalog.lessons) {
      const r = await fetch(origin + "/preview-api/v1/lessons/" + l.lessonId, {
        headers: { Cookie: "untrusted-synthetic-cookie" },
      });
      assert.equal(r.status, 200);
      assert.equal(r.headers.get("set-cookie"), null);
      assert.equal(r.headers.get("cache-control"), "no-store");
      assert.equal(
        ((await r.json()) as { lessonId: string }).lessonId,
        l.lessonId,
      );
    }
    for (const path of [
      "/api/v1/auth/me",
      "/api/v1/config",
      "/api/v1/learners/real/subjects/math/state",
      "/.trial-private/credentials.json",
      "/preview-api/v1/lessons/unknown",
    ])
      assert.equal((await fetch(origin + path)).status, 404);
    for (const method of ["POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
      assert.equal(
        (await fetch(origin + "/preview-api/v1/catalog", { method })).status,
        405,
      );
    assert.equal(
      (await fetch(origin, { headers: { Origin: "https://foreign.invalid" } }))
        .status,
      403,
    );
    const badHost = await new Promise<number>((resolve, reject) => {
      const req = httpRequest(
        origin,
        { headers: { Host: "foreign.invalid" } },
        (res) => {
          res.resume();
          res.once("end", () => resolve(res.statusCode!));
        },
      );
      req.once("error", reject);
      req.end();
    });
    assert.equal(badHost, 403);
    const page = await fetch(origin),
      csp = page.headers.get("content-security-policy")!;
    assert(csp.includes("script-src 'self'") && !csp.includes("unsafe-"));
    assert.equal(page.headers.get("x-frame-options"), "DENY");
    assert.equal(page.headers.get("access-control-allow-origin"), null);
    assert.deepEqual(await (await fetch(origin + "/health/ready")).json(), {
      status: "content-only-ready",
      lessons: 70,
      database: false,
    });
  } finally {
    server.closeAllConnections();
    await new Promise<void>((r) => server.close(() => r()));
  }
});
test("missing or changed build assets prevent startup; no partial healthy service", async () => {
  const root = mkdtempSync(join(tmpdir(), "klh-preview-assets-"));
  try {
    mkdirSync(join(root, "apps/preview"), { recursive: true });
    cpSync("apps/preview/content", join(root, "apps/preview/content"), {
      recursive: true,
    });
    cpSync("apps/preview/dist", join(root, "apps/preview/dist"), {
      recursive: true,
    });
    const seal = JSON.parse(
        readFileSync(join(root, "apps/preview/dist/seal.json"), "utf8"),
      ),
      asset = Object.keys(seal.files).find((x) => x.endsWith(".js"))!;
    writeFileSync(join(root, "apps/preview/dist", asset), "changed");
    await assert.rejects(
      startPreview({ root, port: 0, enabled: true }),
      /INTEGRITY/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
test("anonymous preview does not turn formal math / learner APIs anonymous or bypass parent grant", async () => {
  const f = await authFixture(false, false, true);
  try {
    const anonymous = f.client(),
      route =
        "/api/v1/learners/" +
        f.child.learnerId +
        "/subjects/math/lessons/G3-U01-B01";
    assert.equal((await anonymous.call("GET", route)).status, 401);
    assert.equal(
      (
        await anonymous.call(
          "POST",
          "/api/v1/learners/" + f.child.learnerId + "/subjects/math/commands",
          { command: "anything" },
        )
      ).status,
      403,
    );
    const parent = f.client();
    assert.equal((await parent.login()).status, 200);
    assert.equal((await parent.call("GET", route)).status, 403);
    assert.equal(
      (await anonymous.call("GET", "/preview-api/v1/catalog")).status,
      404,
    );
  } finally {
    await f.stop();
  }
});
