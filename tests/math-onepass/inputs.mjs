import fs from "node:fs";
import { createHash } from "node:crypto";
// Authored runtime plus this manifest helper. Harness files are recorded separately.
// No worktree/private/temp directory scan.
export function runtimeInputs() {
  const files = [];
  function visit(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (
        ["dist", "node_modules", "__pycache__"].includes(e.name) ||
        e.name.startsWith(".")
      )
        continue;
      const p = dir + "/" + e.name;
      if (e.isDirectory()) visit(p);
      else if (/\.(ts|tsx|mts|mjs|css|json|py|yml)$/.test(e.name))
        files.push(p);
    }
  }
  for (const dir of [
    "apps/preview",
    "apps/server",
    "packages/math-training",
    "packages/contracts",
  ])
    visit(dir);
  files.push(
    "scripts/math-full-01/build.ts",
    "tests/math-onepass/inputs.mjs",
    "infra/math-preview/Dockerfile",
    "package.json",
    "package-lock.json",
  );
  for (const p of [
    "docs/implementation/evidence/math-full-01/origins.json",
    "docs/implementation/evidence/math-full-02/source.json",
    "docs/implementation/evidence/math-full-remainder/source.json",
    "docs/implementation/evidence/math-onepass/source-import.json",
    "docs/implementation/evidence/math-onepass/study-source.json",
    "docs/implementation/evidence/math-onepass/reading-source.json",
  ])
    files.push(p);
  return Object.fromEntries(
    [...new Set(files)]
      .sort()
      .map((p) => [
        p,
        createHash("sha256").update(fs.readFileSync(p)).digest("hex"),
      ]),
  );
}
