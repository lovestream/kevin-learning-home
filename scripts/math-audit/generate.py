#!/usr/bin/env python3
"""Read ONLY pinned tracked blobs, never execute/import/build old code or open its data.
Output contains metadata/hashes/field names, never lesson text, expected answers or assets.
"""
import argparse, hashlib, json, pathlib, posixpath, re, subprocess, os

MATH_SHA = 'a7c05aaa8d9c5eabae4f3453807f830da1cbf279'
WORD_SHA = 'd0b42a8872a7e87433b96770519203630223b6f2'
ROOT = pathlib.Path(__file__).resolve().parents[2]
DEST = ROOT/'docs/implementation/evidence/math-00'
ROOTS = {
 'prior17': list(json.loads((ROOT/'docs/implementation/evidence/02b-nas-trial/source-freeze.json').read_text())['mathFiles']),
 'build70': ['content/pilot/source.mjs','scripts/build-pilot.mjs','scripts/build-grade3-catalog.mjs','scripts/build-upper-primary-catalog.mjs'],
 'firstLessonVisual': ['src/studio/ChildClassroom.tsx','src/studio/IntroVisual.tsx','src/studio/TeachingDiagrams.tsx','src/studio/concept/SpatialWorkbench.tsx','src/studio/concept/SolidView.tsx'],
 'storageSecurity': ['server/store.mjs','server/pilot-store.mjs','server/parent-access.mjs','server/index.mjs','server/review-schedule.mjs','server/pet-care.mjs'],
 'provenance': ['package-lock.json','package.json','README.md','content/Kevin_数学课程结构清单.json','assets/source/solid-shapes/README.md'],
}
# Branch-specific non-import resources audited manually. Generated outputs are NOT
# treated as missing source inputs; no build is run to fill them in.
MANUAL_EDGES = [
 ('scripts/build-pilot.mjs','content/Kevin_数学课程结构清单.json','reads blueprint'),
 ('scripts/build-pilot.mjs','content/pilot/lessons.json','generated tracked output; source authority remains source.mjs'),
 ('scripts/build-pilot.mjs','content/pilot/design-index.json','generated tracked output'),
 ('scripts/build-pilot.mjs','content/pilot/methods.json','generated tracked output'),
 ('scripts/build-pilot.mjs','content/rollout.json','generated tracked output'),
 ('server/index.mjs','content/pilot/lessons.json','runtime readFileSync'),
 ('content/pilot/grade3-complete.mjs','content/course-plan-v2/grade-3.json','readFileSync new URL import.meta.url; authority teaching plan'),
 ('content/pilot/thinking-source.mjs','content/course-plan-v2/grade-3-thinking.json','readFileSync new URL import.meta.url; non-first-lesson bank'),
 ('scripts/build-grade3-catalog.mjs','content/grade-3/legacy-seed.json','readFileSync source variable; legacy catalog only'),
 ('server/index.mjs','content/pilot/design-index.json','runtime readFileSync'),
]
for name in ['print-templates.html','template-rectangular-box.svg','template-cube-1.svg','template-cube-2.svg','template-cube-3.svg']:
 MANUAL_EDGES.extend([('scripts/build-pilot.mjs','assets/source/solid-shapes/'+name,'fold-only copy input; not first observe lesson'),('src/studio/concept/SpatialWorkbench.tsx','public/math-paper-folding/'+name,'fold-only static link; not first observe lesson')])

IMPORT = re.compile(r'''(?:^|[;\n])\s*(?:import\s+(?:type\s+)?[^;\n]*?\bfrom\s*|export\s+[^;\n]*?\bfrom\s*|import\s*)['"]([^'"\n]+)['"]|(?<![\w./$])import\s*\(\s*['"]([^'"\n]+)['"]''')
CSS = re.compile(r'''(?:url\(\s*|@import\s*)['"]?([^)'"\s;]+)''')
def guard(condition, code):
 if not condition:raise ValueError(code)

TEXT_EXT = {'.mjs','.js','.ts','.tsx','.mts','.css','.json','.md','.html','.svg'}

def allowed_path(p):
 parts=pathlib.PurePosixPath(p).parts
 return bool(p and posixpath.normpath(p)==p and not p.startswith('/') and '..' not in parts and all(x.lower() not in {'data','backups','backup','inbox','.env','.ssh','secrets','private','research','node_modules','.git'} for x in parts) and not any(x.lower().startswith('.env') for x in parts) and not re.search(r'\.(?:sqlite|db|key|pem|p12|wordpack\.json)(?:-|$)',p,re.I))

class GitSource:
 def __init__(self, repo, sha=MATH_SHA):
  self.repo=str(pathlib.Path(repo).resolve());self.sha=sha
  guard(sha==MATH_SHA, 'FROZEN_SHA_MISMATCH')
  guard(self.git('rev-parse','HEAD').decode().strip()==sha, 'SOURCE_HEAD_MISMATCH')
  self.before=self.snapshot()
  rows=self.git('ls-tree','-rz',sha).decode().strip('\0').split('\0')
  self.paths={row.split('\t',1)[1]:row.split()[2] for row in rows}
  self.modes={row.split('\t',1)[1]:row.split()[0] for row in rows}
  self.cache={}
 def git(self,*args):
  return subprocess.check_output(['git','-C',self.repo,*args],stderr=subprocess.DEVNULL,env={**os.environ,'GIT_OPTIONAL_LOCKS':'0'})
 def snapshot(self):
  status=self.git('status','--porcelain=v1','--untracked-files=all','-z')
  return {'head':self.git('rev-parse','HEAD').decode().strip(),'statusSha256':hashlib.sha256(status).hexdigest(),'statusEntryCount':len([x for x in status.split(b'\0') if x])}
 def read(self,p):
  guard(allowed_path(p), 'FORBIDDEN_SOURCE_PATH')
  guard(p in self.paths, 'UNTRACKED_OR_MISSING_SOURCE '+p)
  guard(self.modes[p] in {'100644','100755'}, 'SYMLINK_OR_SUBMODULE_SOURCE')
  if p not in self.cache:self.cache[p]=self.git('show',self.sha+':'+p)
  return self.cache[p]
 def resolve(self,p,spec):
  if spec.startswith('/'):
   base='public/'+spec.lstrip('/')
  elif spec.startswith('.'):
   base=posixpath.normpath(posixpath.join(posixpath.dirname(p),spec))
  else:return None
  guard(allowed_path(base), 'FORBIDDEN_DEPENDENCY')
  for candidate in [base,*(base+x for x in ['.ts','.tsx','.mjs','.js','.css','.d.mts']),base+'/index.ts',base+'/index.tsx']:
   if candidate in self.paths:return candidate
  raise ValueError('UNRESOLVED_STATIC_DEPENDENCY '+p+' '+spec)

def classify(p):
 if p.startswith('server/'):
  if p in {'server/pilot-store.mjs','server/review-schedule.mjs','server/pet-care.mjs','server/thinking-store.mjs'}:
   return 'adapt','future server-only math adapter','State mutators/review/rewards need learner partition and KLH transaction; never MATH-01 runtime'
  return 'exclude','none','Old singleton DB, HTTP/PIN/inbox service must not enter KLH'
 if p.startswith('tests/'):
  return 'adapt','future characterization fixtures','Select synthetic mathematical fixtures only; do not execute old pretest or import real backups'
 if p.startswith('scripts/'):
  return 'exclude','audit provenance only','Build writes generated content/public trees; do not run/copy legacy build pipeline'
 if p.startswith('shared/detective') or p.startswith('content/detective') or p=='content/pets/catalog.json':
  return 'exclude','none','Detective/inbox/pet content outside first readonly math lesson; no automatic sync or reward import'
 if p.startswith('shared/'):
  return 'allow','future math domain/visual model','Tracked geometry/arithmetic source candidate; preserve algorithms; server grading excluded from readonly bundle'
 if p.startswith('src/'):
  return 'adapt','future math readonly view','Scope CSS, remove old API/persistence/assessment; select observe-only branch; no full classroom mount'
 if '/solid-shapes/' in p or '/math-paper-folding/' in p:
  return 'exclude','none for first lesson','Fold-mode printing/static assets not needed by observe lesson; authorship/license unconfirmed'
 if p.startswith('content/'):
  if p in {'content/pilot/lessons.json','content/pilot/source.mjs'}:
   return 'adapt','future single-lesson public projector/provenance','Full source contains 70 draft lessons and answers; project one allowlisted public lesson only after approval'
  return 'adapt','future selected math content provenance','Dependency candidate only; do not ship full authoring banks, answers or unrelated lessons'
 return 'exclude','provenance only','Configuration/docs/lock metadata are audit evidence, not runtime course files'

def generate(source):
 queue=[p for group in ROOTS.values() for p in group]+[e[1] for e in MANUAL_EDGES]
 files={};edges=[];external=set();dynamic=[]
 while queue:
  p=queue.pop(0)
  if p in files:continue
  raw=source.read(p);ext=pathlib.PurePosixPath(p).suffix
  role,target,reason=classify(p)
  text=raw.decode('utf-8') if ext in TEXT_EXT else ''
  files[p]={'path':p,'sourceGitBlob':source.paths[p],'gitMode':source.modes[p],'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw),'decision':role,'purpose':reason,'targetModule':target,'license':'NO_ROOT_LICENSE; private-owner review required; no redistribution grant inferred','addedBeyond17':p not in ROOTS['prior17']}
  specs=[a or b for a,b in IMPORT.findall(text)] if ext in {'.mjs','.js','.ts','.tsx','.mts'} else CSS.findall(text) if ext=='.css' else []
  files[p]['externalImports']=sorted(set(x for x in specs if not x.startswith(('.', '/'))))
  for spec in dict.fromkeys(specs):
   if not spec.startswith(('.', '/')):external.add(spec);continue
   if spec.startswith('data:') or spec.startswith('#'):continue
   targetp=source.resolve(p,spec);edges.append({'from':p,'to':targetp,'kind':'static import/css'});queue.append(targetp)
  for match in re.finditer(r'(?<![\w./$])import\s*\(([^)]+)\)',text):
   if not match.group(1).lstrip().startswith('?') and not re.fullmatch(r'''\s*['"][^'"]+['"]\s*''',match.group(1)):dynamic.append({'path':p,'line':text[:match.start()].count('\n')+1,'resolution':'NOT_EXECUTED; requires separate review; not approved runtime'})
 for a,b,kind in MANUAL_EDGES:
  guard(a in files and b in files, 'MANUAL_EDGE_NOT_INVENTORIED')
  edges.append({'from':a,'to':b,'kind':kind})
 first_selected={'shared/hands-on-models.mjs':'select faces/boxFaces and local dependencies only; not full handsOnModels bank','shared/solid-rendering.mjs':'preserve composeSolid/tint pure geometry and dependencies','src/studio/concept/SolidView.tsx':'preserve renderer/keyboard; namespace IDs and CSS','src/studio/IntroVisual.tsx':'select BoxCamera/Canvas/Camera helpers only; no other lesson branches','src/studio/intro-visual.css':'scope only box-camera selectors under math root','src/studio/concept/SpatialWorkbench.tsx':'select observe/Projection/controls only; no fold/hidden/assessment','src/studio/concept/hands-on.css':'scope observe-only styles under math root','src/studio/useMotionValue.ts':'retain motion hooks/reduced-motion and cleanup','content/pilot/lessons.json':'project G3-U01-B01 public fields only; never copy 70-lesson output'}
 for p,row in files.items():row['math01Scope']=first_selected.get(p,'AUDIT_ONLY_NOT_MATH01_COPY')
 frozen=json.loads(source.read('content/pilot/lessons.json'))
 guard(len(frozen)==70 and len({l['lessonId'] for l in frozen})==70, 'LESSON_COUNT_MISMATCH')
 guard(len({l['contentVersion'] for l in frozen})==4 and all(l['status']=='draft' for l in frozen), 'LESSON_METADATA_MISMATCH')
 l=next(x for x in frozen if x['lessonId']=='G3-U01-B01')
 fields=[]
 def walk(v,path=''):
  if isinstance(v,dict):
   for k,x in v.items():fields.append(path+'/'+k);walk(x,path+'/'+k)
  elif isinstance(v,list):
   for x in v:walk(x,path+'/*')
 walk(l)
 sensitive=sorted(set(p for p in fields if re.search(r'/(expected|expectedExplanation|expectedEvidence|referenceAnswer|solution|hint|diagnostic|answer|correct|validatorIds|rewardRuleId)(/|$)',p)))
 lock=json.loads(source.read('package-lock.json'));third_party=[{'package':k,'version':lock.get('packages',{}).get('node_modules/'+k,{}).get('version'),'licenseInFrozenLock':lock.get('packages',{}).get('node_modules/'+k,{}).get('license','NOT_DECLARED_IN_LOCK')} for k in ['react','react-dom','lucide-react']]
 license_files=[p for p in source.paths if '/' not in p and re.search(r'license|copying',p,re.I)]
 prior=json.loads((ROOT/'docs/implementation/evidence/02b-nas-trial/source-freeze.json').read_text())['mathFiles']
 guard(all(files[p]['sha256']==v['sha256'] for p,v in prior.items()), 'PRIOR17_HASH_MISMATCH')
 guard(source.snapshot()==source.before, 'SOURCE_WORKTREE_CHANGED')
 return {'schemaVersion':1,'issue':9,'source':{'repository':'lovestream/math-learning','commit':MATH_SHA,'headMustMatchFreeze':True,'rootLicenseFiles':license_files,'thirdPartyPackages':third_party},'englishExcluded':{'repository':'lovestream/word-request','commit':WORD_SHA,'blobsRead':0},'baseline17Verified':True,'sourceBoundaryBefore':source.before,'sourceBoundaryAfter':source.snapshot(),'method':'git show pinned tracked blobs; static literal import closure + explicitly reviewed filesystem links; never import/build/evaluate source','roots':ROOTS,'files':[files[k] for k in sorted(files)],'edges':sorted(edges,key=lambda e:(e['from'],e['to'],e['kind'])),'externalModules':sorted(external),'nonliteralImports':dynamic,'lessonInventory':{'count':70,'uniqueLessonIds':70,'contentVersions':sorted({x['contentVersion'] for x in frozen}),'statusCounts':{'draft':70}},'firstLesson':{'selectedSourcePaths':sorted(first_selected),'selectionRequiresAdaptation':True,'lessonId':l['lessonId'],'contentVersion':l['contentVersion'],'editorialRevision':l['editorialRevision'],'status':l['status'],'classroomStepCount':6,'taskSetCounts':{k:len(v) for k,v in l['taskSets'].items()},'taskIds':{k:[t['id'] for t in v] for k,v in l['taskSets'].items()},'blockIds':[b['blockId'] for b in l['articleBlocks']],'introType':l['introVisual']['type'],'sceneId':l['conceptScenes'][0]['sceneId'],'handsOnMode':l['conceptScenes'][0]['handsOnSpec']['mode'],'handsOnVersion':l['conceptScenes'][0]['handsOnSpec']['version'],'sourceAssetIds':l['assetIds'],'sensitiveFieldPaths':sensitive,'externalBinaryAssetsForObserve':[],'inlineSvgGeneratedBy':['src/studio/IntroVisual.tsx','src/studio/concept/SolidView.tsx','src/studio/concept/SpatialWorkbench.tsx'],'foldTemplatesRequired':False},'generatedPathsNotRead':[{'path':'content/catalog.json','producer':'scripts/build-upper-primary-catalog.mjs','consumer':'server/index.mjs','reason':'gitignored generated catalog; not a frozen tracked input'},{'path':'content/grade-3/catalog.json','producer':'scripts/build-grade3-catalog.mjs','consumer':'scripts/build-upper-primary-catalog.mjs','reason':'gitignored build product; generation not executed'}],'privateRuntimeReadsNotFollowed':['server/store.mjs: runtime progress.sqlite and backups','server/parent-access.mjs: runtime credential/recovery files','server/detective-inbox-store.mjs: runtime inbox'],'excludedPathPolicies':['data/**','**/backups/**','**/inbox/**','.env*','**/*.sqlite*','**/*.key','research/**','untracked files','all word-request blobs'],'sourceFilesCopied':0,'oldBuildExecuted':False,'nasAccessed':False}

if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--source-repo',required=True);args=parser.parse_args()
 s=GitSource(args.source_repo);inventory=generate(s);DEST.mkdir(parents=True,exist_ok=True)
 (DEST/'source-inventory.json').write_text(json.dumps(inventory,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps({'files':len(inventory['files']),'edges':len(inventory['edges']),'copied':0,'oldBuildExecuted':False}))
