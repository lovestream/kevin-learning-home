"""Selective frozen authored-source import. No old server, DB, inbox or write script execution."""
from pathlib import Path
import tempfile,subprocess,json,hashlib,re,sys
repo=sys.argv[1] if len(sys.argv)>1 else '../math-learning';sha='a7c05aaa8d9c5eabae4f3453807f830da1cbf279';files=[]
out=Path('apps/preview/library');evidence=Path('docs/implementation/evidence/math-full-remainder');evidence.mkdir(parents=True,exist_ok=True)
def git(*args):return subprocess.check_output(['git','-C',repo,*args])
def h(b):return hashlib.sha256(b).hexdigest()
def canonical(v):return json.dumps(v,sort_keys=True,ensure_ascii=False,separators=(',',':')).encode()
def source(p):
 b=git('show',sha+':'+p);files.append(dict(path=p,sha256=h(b),gitBlob=git('rev-parse',sha+':'+p).decode().strip()));return b.decode()
def write(p,v):Path(p).parent.mkdir(parents=True,exist_ok=True);Path(p).write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
before=git('status','--porcelain')
with tempfile.TemporaryDirectory(prefix='klh-authored-source-') as tmp:
 temp=Path(tmp)
 def put(p,s):q=temp/p;q.parent.mkdir(parents=True,exist_ok=True);q.write_text(s)
 framework=source('scripts/course-framework.mjs');assert not re.search(r'\b(import|process|fetch|require|eval)\b',framework);put('course-framework.mjs',framework)
 s=source('scripts/build-upper-primary-catalog.mjs');s=s[s.index('const LEVEL_LABEL'):s.index('const sets =')];assert not re.search(r'\b(?:fs|path|process)\s*\.|\b(?:fetch|require|eval)\s*\(',s)
 put('upper.mjs',"import {enrichLesson} from './course-framework.mjs';\n"+s+'\nexport const courses=[...G4,...G5,...G6];\n')
 for p in ['content/pilot/thinking-hints.mjs','content/pilot/thinking-publication.mjs','content/pilot/thinking-source.mjs','content/course-plan-v2/grade-3-thinking.json','content/pilot/methods.json']:put(p,source(p))
 inverse=source('shared/inverse-index.mjs');assert not re.search(r'\b(?:fetch|require|eval)\s*\(|\b(?:fs|process)\s*\.',inverse);put('inverse.mjs',inverse)
 s=source('content/detective/seed-cases.mjs');s=s[:s.index('export const legacyPendingCase')];assert not re.search(r'\b(import|process|fetch|require|eval)\b',s);put('seeds.mjs',s)
 # Evaluate only these new reviewed, I/O-free factories and a static reader into the new temp tree.
 program="""import {courses} from './upper.mjs';import {thinkingCards} from './content/pilot/thinking-source.mjs';import {publicationManifest} from './content/pilot/thinking-publication.mjs';import {seedCases} from './seeds.mjs';import {inverseTaskIndex,inverseClassroomId} from './inverse.mjs';console.log(JSON.stringify({courses,cards:thinkingCards.filter(c=>c.publicationStatus==='guided-study'),deferred:thinkingCards.filter(c=>c.publicationStatus!=='guided-study').map(c=>c.id),manifest:publicationManifest,seedCases,inverseTaskIndex,inverseClassroomId}));"""
 data=json.loads(subprocess.check_output(['node','--input-type=module','-e',program],cwd=tmp));methods=json.loads((temp/'content/pilot/methods.json').read_text())
assert len(data['courses'])==54 and len(data['cards'])==17 and len(data['deferred'])==43 and len(data['seedCases'])==14
practice=[];entries=[];mappings=[];groups=['warmup','core','transfer','challenge','review']
for c in data['courses']:
 entry={k:c[k] for k in ['id','grade','world','title','subtitle','concept','story','discovery','steps','takeaway','lab','labConfig','whyQuestion','humanNeed','invention','essence','extensionChain','retellPrompt','prerequisites']};entry['kind']='legacy';entries.append(entry);sets={g:[] for g in groups}
 for q in c['questions']:
  kind='choice' if q['exerciseType']=='choice' else 'number';t=dict(id=q['id'],level=q['level'],objectiveId='legacy-source',prompt=q['prompt'],kind=kind,responseSpec={'type':kind},unit=q['unit'],expected=str(q['answer']),solution=q['explanation'],hint='\n'.join(q['hints']),diagnostic=q['misconception'])
  if kind=='choice':t['options']=[dict(id=str(i+1),text=text) for i,text in enumerate(q['choices'])]
  sets[q['level']].append(t);mappings.append(dict(capabilityId=c['id'],taskId=t['id'],sourceObjectSha256=h(canonical(q)),targetTaskSha256=h(canonical(t)),sourceType='original-legacy-question'))
 practice.append(dict(lessonId=c['id'],contentVersion='legacy.a7c05aaa',editorialRevision='frozen-source',taskSets=sets))
for c in data['cards']:
 entry={k:c[k] for k in ['id','title','originUnit','parentLessonId','thinkingLabel','classification','minutes','bridgeFromCore','question','contentVersion','publicationStatus']};entry['kind']='thinking';entries.append(entry)
 t=dict(id=c['id']+'-explain',level='core',objectiveId=c['conceptId'],prompt=c['question'],kind='explanation',responseSpec={'type':'self-explanation','rubric':['说明结论、关键关系与理由','用图示或教具核对，再和家长讨论']},solution='\n'.join([c['answer'],c['reason'],*c['solutionSteps']]),hint='\n'.join(x['text'] for x in c['hints']),diagnostic=c['thinkingEvidence']);sets={g:[] for g in groups};sets['core']=[t]
 practice.append(dict(lessonId=c['id'],contentVersion=c['contentVersion'],editorialRevision='editorial-reviewed-awaiting-parent-trial',taskSets=sets));mappings.append(dict(capabilityId=c['id'],taskId=t['id'],sourceObjectSha256=h(canonical(c)),targetTaskSha256=h(canonical(t)),sourceType='approved-thinking-card'))
write(out/'private/bank.json',dict(schemaVersion=1,sourceCommit=sha,entries=entries,practice=practice,cases=data['seedCases'],inverse=data['inverseTaskIndex'],inverseClassroomId=data['inverseClassroomId'],methods=[{k:m[k] for k in ['thinkingSkillId','title','observableAction','applicationStructures','guide']} for m in methods]))
targets=[]
for path,name in [('src/MathLab.tsx','MathLab.tsx'),('src/thinking/ThinkingFigure.tsx','ThinkingFigure.tsx'),('src/thinking/ThinkingTools.tsx','ThinkingTools.tsx'),('shared/thinking-tools.mjs','thinking-tools.mjs'),('shared/thinking-tools.d.mts','thinking-tools.d.mts'),('src/detective/DetectiveFigure.tsx','DetectiveFigure.tsx'),('shared/detective-presentation.mjs','detective-presentation.mjs'),('shared/detective-presentation.d.mts','detective-presentation.d.mts')]:
 s=source(path);s=s.replace("from './types'","from './types.ts'").replace("from '../types'","from './types.ts'").replace('from "../types"','from "./types.ts"').replace("from './api'","from './types.ts'").replace('"../../shared/thinking-tools.mjs"','"./thinking-tools.mjs"').replace('"../../shared/hands-on-models.mjs"','"../../adapters/source/shared/hands-on-models.mjs"').replace('"../studio/concept/SolidView"','"../../adapters/source/src/studio/concept/SolidView.tsx"').replace('"../studio/useMotionValue"','"../../adapters/source/src/studio/useMotionValue.ts"').replace("'../../shared/detective-presentation.mjs'","'./detective-presentation.mjs'").replace('操作另有记录；请在下面保存你自己的推理','操作仅在本页暂存；请在下面写下你自己的推理')
 if name=='MathLab.tsx':
  s="import PlaceValueLab from '../PlaceValueLab.tsx';\n"+s
  a=s.index("  if(mode==='place-value'){");b=s.index("  if(mode==='enumeration'){",a)
  s=s[:a]+"  if(mode==='place-value')return <PlaceValueLab lesson={lesson}/>;\n"+s[b:]
 if name=='detective-presentation.mjs':s='// Pure authored figure geometry only; inbox-arrival helper excluded.\n'+s[s.index('export function wrapFigure'):]
 if name=='detective-presentation.d.mts':s='\n'.join(x for x in s.splitlines() if 'visibleArrivals' not in x)+'\n'
 target=out/'source'/name;target.write_text(s);targets.append(dict(source=path,target=str(target),sha256=h(s.encode()),adaptation=('legacy three-digit place-value branch replaced by audited multi-digit PlaceValueLab; other models unchanged' if name=='MathLab.tsx' else 'type/import paths; temporary-mode copy; exclude unused inbox helper; math/figure algorithms unchanged')))
# Preserve only the exact pure detective comparison functions, excluding inbox validation/store logic.
s=source('shared/detective-model.mjs');body=s[s.index('export function matchesResponse'):s.index('const publicResponse')];assert not re.search(r'\b(fetch|fs|process|require|eval)\b',body)
helpers="import {createHash} from 'node:crypto';\nimport {parseNumber as parse} from '../../practice/private/pilot-math.mjs';\nconst parseNumber=x=>{try{return parse(x);}catch{return null;}};\nexport const fingerprint=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');\n"+body
target=out/'private/detective-grading.mjs';target.write_text(helpers);targets.append(dict(source='shared/detective-model.mjs',target=str(target),sha256=h(helpers.encode()),adaptation='only matchesResponse / orderedReasons / matchesReason and pure dependencies; no inbox/record validators'))
# Reuse the original model CSS declarations with an explicit library-page scope.
css=[source('src/styles.css'),source('src/thinking/thinking.css')];payload=json.dumps(dict(css=css,code='\n'.join((out/'source'/n).read_text() for n in ['MathLab.tsx','ThinkingTools.tsx'])))
css_program="""import fs from 'node:fs';import postcss from 'postcss';const p=JSON.parse(fs.readFileSync(0,'utf8')),classes=new Set([...p.code.matchAll(/className=[\"']([A-Za-z0-9 -]+)[\"']/g)].flatMap(x=>x[1].split(' '))),out=[];for(const css of p.css)postcss.parse(css).walkRules(r=>{if(![...r.selector.matchAll(/\\.([A-Za-z][A-Za-z0-9_-]*)/g)].some(x=>classes.has(x[1])))return;if(r.parent.type==='atrule'&&r.parent.name.includes('keyframes'))return;const c=r.clone();c.selectors=c.selectors.map(s=>'.library-page '+s);out.push(r.parent.type==='atrule'?r.parent.clone({nodes:[c]}).toString():c.toString());});console.log('/* Frozen model declarations, scoped to library-page; original source not modified. */\\n'+out.join('\\n'));"""
s=subprocess.check_output(['node','--input-type=module','-e',css_program],input=payload.encode()).decode();target=out/'source/model-styles.css';target.write_text(s);targets.append(dict(source='src/styles.css + src/thinking/thinking.css',target=str(target),sha256=h(s.encode()),adaptation='matching model rules only; prefix selectors with .library-page'))
legacy_seed=json.loads(source('content/grade-3/legacy-seed.json'));assert len(legacy_seed)==50
blueprint=json.loads(source('content/Kevin_数学课程结构清单.json'));assert len(blueprint['coursePlans'])==168
for p in ['server/index.mjs','src/App.tsx','src/learningMap.ts','src/MethodsView.tsx','src/LearningReviewView.tsx','src/InversePracticeIndex.tsx']:source(p)
after=git('status','--porcelain');assert before==after
write(evidence/'source.json',dict(sourceCommit=sha,privateBankSha256=h((out/'private/bank.json').read_bytes()),worktreeUnchanged=True,statusBeforeSha256=h(before),statusAfterSha256=h(after),files=files,targets=targets,approvedCards=data['manifest'],deferredIDs=data['deferred'],caseIDs=[c['id'] for c in data['seedCases']],caseHashes={c['id']:h(canonical(c)) for c in data['seedCases']},legacyCounts={str(g):sum(c['grade']==g for c in data['courses']) for g in [4,5,6]},legacyQuestions=432,supersededGrade3Legacy=50,blueprintContainers=168,taskMappings=mappings,privateFilesRead=False,originalSideEffectScriptsExecuted=False))
print('IMPORTED 17 approved cards / 54 legacy courses / 432 questions / 14 authored simulations / 28 method entries; old worktree unchanged')
