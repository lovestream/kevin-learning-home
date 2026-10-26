// Offline preview build seal. Does not read or execute an old repository.
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadLibrary } from "../../apps/preview/library/service.ts";
import { loadPractice } from "../../apps/preview/practice/service.ts";
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
const buildSha =
  process.env.KLH_BUILD_SHA ??
  execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  }).trim();
if (!/^[a-f0-9]{40}$/.test(buildSha)) throw Error("EXACT_BUILD_SHA_REQUIRED");
const practiceOrigin=JSON.parse(readFileSync(join(root,'docs/implementation/evidence/math-full-02/source.json'),'utf8')) as {privateBankSha256:string;files:{target:string;targetSha256?:string;sha256?:string}[]};
for(const f of practiceOrigin.files){
 if(!/^apps\/preview\/practice\/[A-Za-z0-9/.-]+$/.test(f.target)||f.target.includes('..'))throw Error('PRACTICE_SOURCE_OUT_OF_SCOPE');
 if(hash(readFileSync(join(root,f.target)))!==(f.targetSha256??f.sha256))throw Error('PRACTICE_SOURCE_CHANGED');
}
const libraryOrigin=JSON.parse(readFileSync(join(root,'docs/implementation/evidence/math-full-remainder/source.json'),'utf8')) as {privateBankSha256:string;targets:{target:string;sha256:string}[]};
for(const f of libraryOrigin.targets){
 if(!f.target.startsWith('apps/preview/library/')||f.target.includes('..'))throw Error('LIBRARY_SOURCE_OUT_OF_SCOPE');
 if(hash(readFileSync(join(root,f.target)))!==f.sha256)throw Error('LIBRARY_SOURCE_CHANGED');
}
const library=loadLibrary(root);
if(library.bankSha256!==libraryOrigin.privateBankSha256)throw Error('LIBRARY_BANK_SOURCE_CHANGED');
const practice = loadPractice(root);
if(practice.bankSha256!==practiceOrigin.privateBankSha256)throw Error('PRACTICE_BANK_SOURCE_CHANGED');
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
      libraryBankSha256:library.bankSha256,
      libraryPublicSha256:library.publicSha256,
      practiceBankSha256: practice.bankSha256,
      practicePublicSha256: practice.publicSha256,
      buildSha,
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
