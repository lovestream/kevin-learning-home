// Runs unchanged in the formal image, both on Actions and DS918+ (no data mount).
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const hash = x => createHash('sha256').update(x).digest('hex');
const canonical = x => x === null || typeof x !== 'object' ? JSON.stringify(x) :
  Array.isArray(x) ? '['+x.map(canonical).join(',')+']' :
  '{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}';
const manifest = JSON.parse(readFileSync('/app/apps/web/dist/math-integrity.json'));
const dto = JSON.parse(readFileSync('/app/packages/subjects/math/public-lesson.json'));
if (hash(canonical(dto)) !== manifest.publicDtoSha256) throw Error('PUBLIC_DTO_HASH');
for (const file of manifest.files) {
  if (!/^assets\/[A-Za-z0-9_-]+\.(js|css)$/.test(file.path)) throw Error('ASSET_PATH');
  const bytes = readFileSync('/app/apps/web/dist/'+file.path);
  if (hash(bytes) !== file.sha256 || bytes.length !== file.sizeBytes) throw Error('ASSET_HASH');
}
if (hash(canonical(manifest.files)) !== manifest.visualArtifactSha256) throw Error('VISUAL_HASH');
console.log(JSON.stringify({node:process.version, arch:process.arch,
  nativeFlock:typeof require('fs-ext').flockSync === 'function', manifest,
  publicDtoFileSha256:hash(readFileSync('/app/packages/subjects/math/public-lesson.json'))}));
