import { test } from "node:test";
import assert from "node:assert/strict";
import {
  config,
  assertOwnedConfig,
  plistXML,
  healthy,
  LABEL,
} from "../../scripts/local/service.mjs";

test("agent owns only its exact checkout and executable; no database or NAS configuration", () => {
  const c = config("/tmp/Family & Kevin", "/local/node");
  assert.equal(c.Label, LABEL);
  assert.deepEqual(c.ProgramArguments, [
    "/local/node",
    "/tmp/Family & Kevin/apps/preview/server.ts",
  ]);
  assert.equal(c.EnvironmentVariables.KLH_PREVIEW_PORT, "38444");
  assert.doesNotThrow(() => assertOwnedConfig(c, structuredClone(c)));
  const reordered = {
    ...c,
    EnvironmentVariables: Object.fromEntries(
      Object.entries(c.EnvironmentVariables).reverse(),
    ),
  };
  assert.doesNotThrow(() => assertOwnedConfig(reordered, c));
  for (const key of [
    "ProgramArguments",
    "WorkingDirectory",
    "EnvironmentVariables",
  ]) {
    const foreign = {
      ...c,
      [key]:
        key === "ProgramArguments" ? ["/other/node", "other.ts"] : "foreign",
    };
    assert.throws(() => assertOwnedConfig(foreign, c), /不一致/);
  }
  assert(!JSON.stringify(c).match(/192\.168|sqlite|DATABASE|TOKEN|password/i));
});
test("plist encodes Unicode, spaces and metacharacters without shell interpolation", () => {
  const xml = plistXML(config('/tmp/学习 & <Kevin> "math"', "/tmp/node"));
  assert(xml.includes("学习 &amp; &lt;Kevin&gt; &quot;math&quot;"));
  assert(xml.includes("<false/>"));
  assert(xml.includes("<integer>10</integer>"));
});
test("readiness requires exact build, complete math and English, anonymous local boundary", () => {
  const r = {
    buildSha: "abc",
    contentOnly: true,
    database: false,
    lessons: 70,
    practiceTasks: 849,
    english: { cards: 6631, groups: 665, media: 1861 },
    storage: "page-memory-only",
  };
  assert(healthy(r, "abc"));
  for (const changes of [
    { buildSha: "old" },
    { database: true },
    { english: null },
    { lessons: 69 },
    { practiceTasks: 848 },
    { storage: "persistent" },
  ]) {
    assert(!healthy({ ...r, ...changes }, "abc"));
  }
  assert(!healthy(null, "abc"));
});
