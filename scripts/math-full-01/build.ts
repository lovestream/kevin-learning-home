// Offline preview build seal. Does not read or execute an old repository.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadContent, hash } from "../../apps/preview/content.ts";
const root = fileURLToPath(new URL("../..", import.meta.url)),
  out = join(root, "apps/preview/dist");
const origins = JSON.parse(
  readFileSync(
    join(root, "docs/implementation/evidence/math-full-01/origins.json"),
    "utf8",
  ),
) as { files: { target: string; targetSha256: string }[] };
for (const file of origins.files) {
  if (
    !/^(apps\/preview\/adapters\/source\/|apps\/preview\/public\/|apps\/preview\/content\/lessons\/)/.test(
      file.target,
    ) ||
    !resolve(root, file.target).startsWith(root)
  )
    throw Error("SOURCE_TARGET_OUT_OF_SCOPE");
  if (hash(readFileSync(join(root, file.target))) !== file.targetSha256)
    throw Error("ADAPTED_SOURCE_HASH_CHANGED " + file.target);
}
const { catalog } = loadContent(root),
  files: Record<string, string> = {};
function visit(dir: string, prefix = "") {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const name = prefix + "/" + e.name;
    if (e.isDirectory()) visit(join(dir, e.name), name);
    else files[name] = hash(readFileSync(join(dir, e.name)));
  }
}
visit(out);
writeFileSync(
  join(out, "seal.json"),
  JSON.stringify(
    {
      schemaVersion: 1,
      catalogSha256: hash(
        readFileSync(join(root, "apps/preview/content/catalog.json")),
      ),
      files,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  JSON.stringify({
    previewBuild: "SEALED",
    lessons: catalog.lessons.length,
    assets: Object.keys(files).length,
    databaseOpened: false,
  }),
);
