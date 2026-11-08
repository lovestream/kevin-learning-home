"""Offline evidence/target checker. Does not read an old repo, private data or NAS."""
import hashlib,json,pathlib,re
ROOT=pathlib.Path(__file__).resolve().parents[2]
SHA='a7c05aaa8d9c5eabae4f3453807f830da1cbf279'
ARTIFACT='0a1c23b8904eb328a029a1d4dec0fda480defb1596325121b9cb7cb19ff70afa'
def read(p):return json.loads((ROOT/p).read_text())
def digest(b):return hashlib.sha256(b).hexdigest()
def canonical(v):return json.dumps(v,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()
catalog=read('apps/preview/content/catalog.json')
assert catalog['sourceCommit']==SHA and catalog['sourceArtifactSha256']==ARTIFACT
rows=catalog['lessons'];ids=[x['lessonId'] for x in rows]
assert len(ids)==len(set(ids))==70
assert sum(x['interactionStatus']=='verified' for x in rows)==64
assert sum(x['interactionStatus']=='static-visual' for x in rows)==6
assert all(x['status']=='draft' for x in rows)
origin=read('docs/implementation/evidence/math-full-01/origins.json')
old={x['path']:x for x in read('docs/implementation/evidence/math-00/source-inventory.json')['files']}
targets=set()
for f in origin['files']:
 assert f['commit']==SHA and re.fullmatch('[a-f0-9]{40}',f['gitBlob'])
 assert re.match(r'^(src/studio/|shared/|public/math-paper-folding/|content/pilot/lessons.json$)',f['path'])
 if f['path'] in old:assert f['sha256']==old[f['path']]['sha256']
 assert re.match(r'^apps/preview/(adapters/source/|public/math-paper-folding/|content/lessons/)',f['target'])
 p=ROOT/f['target'];assert p.resolve().is_relative_to(ROOT/'apps/preview')
 assert digest(p.read_bytes())==f['targetSha256'],f['target']
 assert f['target'] not in targets;targets.add(f['target'])
mappings=read('docs/implementation/evidence/math-full-01/field-mappings.json')
assert {x['lessonId'] for x in mappings}==set(ids)
for m in mappings:
 dto=read('apps/preview/content/lessons/'+m['lessonId']+'.json')
 assert digest(canonical(dto))==m['dtoSha256']
 for f in m['fieldMappings']:
  value=dto
  for key in f['target'].split('/')[1:]:value=value[int(key)] if isinstance(value,list) else value[key]
  assert digest(canonical(value))==f['valueSha256']
  assert re.match(r'^/\d+/',f['source'])
 assert next(x for x in rows if x['lessonId']==m['lessonId'])['dtoSha256']==m['dtoSha256']
for p in (ROOT/'apps/preview/adapters/source').rglob('*'):
 if p.is_file() and p.suffix in ['.mjs','.tsx','.ts']:
  text=p.read_text();assert not re.search(r'\b(fetch\s*\(|localStorage|sessionStorage|indexedDB|XMLHttpRequest|sendBeacon)',text),str(p)
  assert not re.search(r'(?:https?://|/api/v1/)',text),str(p)
assert 'export function validateTask' not in (ROOT/'apps/preview/adapters/source/shared/pilot-math.mjs').read_text()
for name in ['server.ts','content.ts','registry-meta.ts']:
 text=(ROOT/'apps/preview'/name).read_text()
 assert not re.search(r"from\s+['\"][^'\"]*(?:packages/auth|packages/platform|node:sqlite|apps/server)",text)
assert not (ROOT/'apps/preview/content/lessons.json').exists()
docker=(ROOT/'infra/docker/Dockerfile').read_text().split(' AS build',1)[1].split('\nFROM ',1)[1]
assert 'apps/preview' not in docker and 'preview-content' not in docker
workflow=(ROOT/'.github/workflows/foundation.yml').read_text()
assert 'codex/math-full-01-70-lessons' in workflow
for command in ['node scripts/verify.ts','npm run test:container','Compose 1.28.5','node tests/math-full-01/browser.mjs','node --test --test-concurrency=1 tests/math-full-01/*.test.*']:assert command in workflow
assert not re.search(r'continue-on-error:\s*true',workflow)
boundary=read('docs/implementation/evidence/math-full-01/source-boundary.json')
assert boundary['worktreeUnchanged'] and boundary['gitStatusBeforeSha256']==boundary['gitStatusAfterSha256']
# Archived local evidence must describe these exact source/harness bytes, not stale runs.
coverage=read('docs/implementation/evidence/math-full-01/lessons-coverage.json')
assert coverage['status']=='PASS' and coverage['total']==70 and coverage['browserScenarios']==210
assert {x['lessonId'] for x in coverage['lessons']}==set(ids)
for path,sha in coverage['execution']['files'].items():
 assert (ROOT/path).resolve().is_relative_to(ROOT)
 assert digest((ROOT/path).read_bytes())==sha,path
for row in coverage['lessons']:
 assert row['acceptance']==row['sixSteps']==row['actualPublicGET']==row['browserDOM']=='PASS'
 assert row['viewports']==[390,768,1280] and row['refreshClearsState']
 assert row['persistentBrowserEntries']==0 and not row['knownGaps']
 expected=next(x for x in rows if x['lessonId']==row['lessonId'])
 assert row['targetDTOHash']==expected['dtoSha256']
for name,count in [('browser',210),('checkpoint',30)]:
 run=read('docs/implementation/evidence/math-full-01/'+name+'.json')
 assert run['status']=='PASS' and run['filtered']==(name=='checkpoint') and not run['errors']
 assert len(run['results'])==count and all(x['pass'] for x in run['results'])
 assert run['execution']['files']==coverage['execution']['files']
for shot in read('docs/implementation/evidence/math-full-01/screenshots.json')['screenshots']:
 assert digest((ROOT/'docs/implementation/evidence/math-full-01'/shot['name']).read_bytes())==shot['sha256']
print(json.dumps({'status':'PASS_OFFLINE','lessons':70,'interactive':64,'static':6,'sourceTargets':len(targets),'fieldProjectionHashes':sum(len(x['fieldMappings']) for x in mappings),'oldSourceDownloadedByCI':False,'productionRuntimePreviewExcluded':True}))
