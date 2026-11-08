import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deliverPreview } from "../../scripts/math-full-01/mac.mjs";
test("anonymous Mac delivery reuses one fixed folder and preserves the existing NAS credential guide", () => {
  const root = fs.realpathSync(
      fs.mkdtempSync(join(tmpdir(), "klh-content-delivery-")),
    ),
    repo = join(root, "repo"),
    dest = join(root, "delivery");
  fs.mkdirSync(repo);
  fs.mkdirSync(dest, { mode: 0o700 });
  try {
    fs.writeFileSync(join(dest, ".delivery.json"), JSON.stringify({ repo }), {
      mode: 0o600,
    });
    fs.writeFileSync(join(dest, "START-HERE.md"), "existing user guide", {
      mode: 0o600,
    });
    const result = deliverPreview(repo, dest);
    deliverPreview(repo, dest);
    assert.equal(result.passwordsRequired, false);
    assert.equal(
      fs.readFileSync(join(dest, "START-HERE.md"), "utf8"),
      "existing user guide",
    );
    assert.equal(
      fs.statSync(join(dest, "70课体验说明.md")).mode & 0o777,
      0o600,
    );
    assert.equal(
      fs.statSync(join(dest, "打开70课体验.command")).mode & 0o777,
      0o700,
    );
    assert(
      !fs
        .readFileSync(join(dest, "打开70课体验.command"), "utf8")
        .includes("password"),
    );
    fs.writeFileSync(join(dest, "70课体验说明.md"), "user notes");
    assert.throws(() => deliverPreview(repo, dest), /USER_EDIT/);
    assert.equal(
      fs.readFileSync(join(dest, "70课体验说明.md"), "utf8"),
      "user notes",
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
