import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  runtimeBoundary,
  exactLANOrigin,
  peerAllowed,
} from "../../apps/preview/runtime.ts";
import { contentDigest } from "../../apps/preview/integrity.ts";
import { canonical } from "../../apps/preview/contract.ts";
import { loadContent } from "../../apps/preview/content.ts";
test("container HTTP is explicit, privately bound and rejects broader origins or peers", () => {
  assert.equal(runtimeBoundary().bind, "127.0.0.1");
  for (const options of [
    { publicOrigin: "http://192.168.2.100:38444" },
    { runtime: "invalid" },
    {
      runtime: "isolated-container",
      bindAddress: "0.0.0.0",
      publicOrigin: "http://192.168.2.100:38444",
    },
  ])
    assert.throws(() => runtimeBoundary(options));
  for (const origin of [
    "https://192.168.2.100:38444",
    "http://example.com",
    "http://192.168.2.100/path",
    "http://user:password@192.168.2.100",
  ])
    assert.throws(() => exactLANOrigin(origin));
  assert.equal(
    exactLANOrigin("http://192.168.2.100:38444").host,
    "192.168.2.100:38444",
  );
  assert(peerAllowed("::ffff:192.168.2.3", ["192.168.2.0/24"]));
  assert(!peerAllowed("8.8.8.8", ["192.168.2.0/24"]));
  assert.throws(() => peerAllowed("192.0.0.1", ["192.168.0.0/8"]));
});
test("LAN-compatible digest independently matches Node SHA-256 for all 70 DTOs and Unicode", () => {
  for (const value of [
    "",
    "数学课堂 🌈",
    { nested: [1, true, "零"] },
    ...[...loadContent(process.cwd()).lessons.values()].map((x) => x.data),
  ])
    assert.equal(
      contentDigest(value),
      createHash("sha256").update(canonical(value)).digest("hex"),
    );
});
