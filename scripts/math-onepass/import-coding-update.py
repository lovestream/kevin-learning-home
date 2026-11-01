"""Explicit read-only, pinned authored coding amendment; never read learner records."""
import json,hashlib,pathlib,subprocess,re,sys,os
REPO=pathlib.Path(sys.argv[1]).resolve();REF='d409a021dd8905154d572b53c9802a8c3b2d14d9';BASE='a7c05aaa8d9c5eabae4f3453807f830da1cbf279';TARGET_BASE='314afa7803cc43dc2e814bfba5bb256c975ed94f';ID='G3-UP02-B01'
OUT=pathlib.Path('docs/implementation/evidence/coding-20261101');OUT.mkdir(parents=True,exist_ok=True)
def git(*a):return subprocess.check_output(['git','--no-optional-locks','-C',str(REPO),*a],env=os.environ|{'GIT_OPTIONAL_LOCKS':'0'})
def h(b):return hashlib.sha256(b).hexdigest()
def canon(v):return json.dumps(v,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()
def read(p):return json.loads(pathlib.Path(p).read_text())
def write(p,v):pathlib.Path(p).write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
def tracked(p):return git('show',REF+':'+p)
def blob(p):return git('rev-parse',REF+':'+p).decode().strip()
before=git('status','--porcelain');assert not before and git('rev-parse','HEAD').decode().strip()==REF
raw=tracked('content/pilot/lessons.json');rows=json.loads(raw);frozen=json.loads(git('show',BASE+':content/pilot/lessons.json'));assert len(rows)==len(frozen)==70
assert [x['lessonId'] for x in rows]==[x['lessonId'] for x in frozen]
assert [x['lessonId'] for x,y in zip(rows,frozen) if canon(x)!=canon(y)]==[ID]
lesson=next(x for x in rows if x['lessonId']==ID);index=rows.index(lesson);assert lesson['contentVersion']=='2026-11-01.2'
bankpath='apps/preview/practice/private/bank.json';bank=read(bankpath)
prior=json.loads(subprocess.check_output(['git','show',TARGET_BASE+':'+bankpath]));oldtasks={t['id']:t for l in prior['lessons'] for ts in l['taskSets'].values() for t in ts};newtasks={t['id']:t for l in rows for ts in l['taskSets'].values() for t in ts}
assert len(oldtasks)==len(newtasks)==849 and set(oldtasks)==set(newtasks)
changed=[k for k in oldtasks if canon(oldtasks[k])!=canon(newtasks[k])];assert len(changed)==12 and all(k.startswith(ID+'-P') for k in changed)
modules=['shared/coding-model.mjs','shared/coding-model.d.mts','shared/intro-visuals.mjs','shared/intro-visuals.d.mts','src/studio/IntroVisual.tsx','src/studio/textbook/SymbolWorkbench.tsx','src/studio/textbook/CodingExploration.tsx','src/studio/textbook/CodingOverview.tsx','src/studio/textbook/coding-exploration.css']
origpath='docs/implementation/evidence/math-full-01/origins.json';orig=read(origpath);base=pathlib.Path('apps/preview/adapters/source');provenance=[]
# Seed the exact, inspected pure modules before resolving their literal imports.
for p in modules:
 b=tracked(p);text=b.decode();assert not re.search(r'\b(fetch\s*\(|localStorage|sessionStorage|indexedDB|XMLHttpRequest|sendBeacon|writeFile|readFile)',text),p
 target=base/p;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(b)
for p in modules:
 b=tracked(p);text=b.decode()
 def explicit(m):
  ref=m.group(2)
  if pathlib.PurePosixPath(ref).suffix:return m.group(0)
  origin=base/pathlib.PurePosixPath(p).parent/ref
  ext=next((e for e in ['.tsx','.ts','.mjs','.css'] if pathlib.Path(str(origin)+e).is_file()),None);assert ext,(p,ref)
  return m.group(0).replace(ref,ref+ext)
 text=re.sub(r'(?:from\s*|import\s*)([\'"])(\.[^\'"]+)\1',explicit,text)
 target=base/p;target.write_text(text)
 row={'path':p,'commit':REF,'gitBlob':blob(p),'sha256':h(b),'target':str(target),'targetSha256':h(target.read_bytes()),'adaptation':'Only explicit local import extensions; original coding rules, HTML condition cards and memory-only React interactions retained. No storage/network/identity input.','license':'User-authorized reuse of own authored source; no learner data or third-party media.'}
 provenance.append(row);orig['files']=[x for x in orig['files'] if x['target']!=str(target)]+[row]
# Re-project through the existing field allowlist, retaining source pointers.
mapfile='docs/implementation/evidence/math-full-01/field-mappings.json';maps=read(mapfile);previous=next(x for x in maps if x['lessonId']==ID);records=[];dto={}
def get(value,p):
 try:
  for k in p.strip('/').split('/'):value=value[int(k)] if isinstance(value,list) else value[k]
  return value
 except (KeyError,IndexError,TypeError):return None
def put(p,v):
 parts=p.strip('/').split('/');o=dto
 for j,k in enumerate(parts):
  if isinstance(o,list):
   while len(o)<=int(k):o.append(None)
   if j==len(parts)-1:o[int(k)]=v;break
   if o[int(k)] is None:o[int(k)]=[] if parts[j+1].isdigit() else {}
   o=o[int(k)]
  else:
   if j==len(parts)-1:o[k]=v;break
   if k not in o:o[k]=[] if parts[j+1].isdigit() else {}
   o=o[k]
def add(sp,tp):
 v=get(rows,sp)
 if v is not None:put(tp,v);records.append({'source':sp,'target':tp,'valueSha256':h(canon(v))})
for f in previous['fieldMappings']:
 if f['target'].split('/')[1] not in ['workedExamples','classroom','storyVisual','predictionVisual']:add(f['source'],f['target'])
for k in 'story predictQuestion predictionOptions discovery symbols mission retell observedEvidence whyQuestion counterexamplePrompt modelText predictionFocus'.split():add(f'/{index}/childClassroom/{k}',f'/classroom/{k}')
for n in ['storyVisual','predictionVisual']:
 for k in ['type','title','caption','values','labels']:add(f'/{index}/childClassroom/{n}/{k}',f'/{n}/{k}')
dto['workedExamples']=[]
for j,b in enumerate(lesson['articleBlocks']):
 for k,e in enumerate(b.get('examples',[])):
  target=f'/workedExamples/{len(dto["workedExamples"])}';sp=f'/{index}/articleBlocks/{j}/examples/{k}'
  add(sp+'/title',target+'/title')
  for n,step in enumerate(e['steps']):
   for key in ['math','why','expressionBefore','operation','expressionAfter','units']:add(sp+f'/steps/{n}/'+key,target+f'/steps/{n}/'+key)
def no_hidden(v):
 if isinstance(v,dict):
  for k,x in v.items():
   assert k not in ['taskSets','expected','expectedMm','expectedExplanation','expectedEvidence','referenceAnswer','hint','solution','validatorIds','rewardRuleId','masteryRuleId','wallet','pets','pin'],k
   no_hidden(x)
 elif isinstance(v,list):
  for x in v:no_hidden(x)
# Match the established projector: absent scene collections are explicit empty arrays.
for field in ['mathScenes','lengthScenes','conceptScenes']:
 if field not in dto:
  assert not lesson.get(field),field
  dto[field]=[]
no_hidden(dto);assert dto['lessonId']==ID
file='apps/preview/content/lessons/'+ID+'.json';write(file,dto)
item={'lessonId':ID,'sourceItemSha256':h(canon(lesson)),'dtoSha256':h(canon(dto)),'fileSha256':h(pathlib.Path(file).read_bytes()),'renderer':previous['renderer'],'fieldMappings':records,'sourceCommit':REF}
maps=[item if x['lessonId']==ID else x for x in maps];write(mapfile,maps)
sourceRow={'path':'content/pilot/lessons.json','commit':REF,'gitBlob':blob('content/pilot/lessons.json'),'sha256':h(raw),'target':file,'targetSha256':h(pathlib.Path(file).read_bytes()),'adaptation':'Only G3-UP02-B01 versioned amendment; field allowlist, 69 other DTOs unchanged.','license':'User-authorized authored teaching content only.'}
orig['files']=[sourceRow if x['target']==file else x for x in orig['files']];orig['runtimeSourceFiles']=json.loads(subprocess.check_output(['git','show',TARGET_BASE+':'+origpath]))['runtimeSourceFiles']+4;orig['amendments']=[{'lessonId':ID,'commit':REF,'contentVersion':lesson['contentVersion']}];write(origpath,orig)
catpath='apps/preview/content/catalog.json';cat=read(catpath);entry=next(x for x in cat['lessons'] if x['lessonId']==ID)
for k in list(entry):
 if k in dto:entry[k]=dto[k]
entry['dtoSha256']=item['dtoSha256'];write(catpath,cat)
bl=next(x for x in bank['lessons'] if x['lessonId']==ID)
for k in ['contentVersion','editorialRevision','taskSets']:bl[k]=lesson[k]
write(bankpath,bank)
practicepath='docs/implementation/evidence/math-full-02/source.json';practice=read(practicepath)
for r in practice['tasks']:
 if r['lessonId']==ID:
  task=lesson['taskSets'][r['group']][r['index']];assert task['id']==r['taskId']
  r.update(contentVersion=lesson['contentVersion'],editorialRevision=lesson['editorialRevision'],kind=task['kind'],sourceTaskSha256=h(canon(task)),sourceCommit=REF)
practice['privateBankSha256']=h(pathlib.Path(bankpath).read_bytes());practice['amendments']=[{'lessonId':ID,'commit':REF,'sourceBlob':blob('content/pilot/lessons.json'),'sourceSha256':h(raw),'contentVersion':lesson['contentVersion'],'changedTasks':12,'otherTasksUnchanged':837}];write(practicepath,practice)
# Same reading allowlist as import-reading.mjs; only the revised article is replaced.
article={'lessonId':ID,'retellPrompt':lesson['retellPrompt'],'blocks':[]};key=None
for b in lesson['articleBlocks']:
 out={k:b[k] for k in ['blockId','type','title','text','paragraphs','diagram','widget','examples','cases','methods','prompt','revisit'] if k in b}
 if b['type']=='checkpoint':
  out['responseType']='self-explanation' if b.get('responseSpec',{}).get('type')=='self-explanation' else 'choice'
  if 'options' in b:out['options']=[o['text'] for o in b['options']]
  key={'lessonId':ID,'blockId':b['blockId'],'type':out['responseType']}
  if 'options' in b:key['options']=[{'correct':o['correct'],'reason':o['reason']} for o in b['options']]
  if 'referenceAnswer' in b:key['referenceAnswer']=b['referenceAnswer']
 article['blocks'].append(out)
assert key
ap='apps/preview/reading/articles.json';kp='apps/preview/reading/private/checkpoints.json'
write(ap,[article if x['lessonId']==ID else x for x in read(ap)]);write(kp,[key if x['lessonId']==ID else x for x in read(kp)])
rp='docs/implementation/evidence/math-onepass/reading-source.json';reading=read(rp)
for f in reading['files']:f['targetSha256']=h(pathlib.Path(f['target']).read_bytes())
reading['amendments']=[{'lessonId':ID,'commit':REF,'sourceBlob':blob('content/pilot/lessons.json'),'sourceSha256':h(raw),'contentVersion':lesson['contentVersion']}];write(rp,reading)
for x in cat['lessons']:
 if x['lessonId']!=ID:
  p='apps/preview/content/lessons/'+x['lessonId']+'.json';assert pathlib.Path(p).read_bytes()==subprocess.check_output(['git','show',TARGET_BASE+':'+p])
assert git('status','--porcelain')==before
write(OUT/'source-lesson.json',lesson)
reviewpath='docs/review/final-task-review/versioned/coding-20261101.json';review=tracked(reviewpath)
# The published amendment is authored review evidence, not learner records.
(OUT/'source-task-review.json').write_bytes(review)
write(OUT/'source.json',{'repository':'lovestream/math-learning','sourceCommit':REF,'baseSourceCommit':BASE,'targetBaseCommit':TARGET_BASE,'sourceFile':'content/pilot/lessons.json','sourceBlob':blob('content/pilot/lessons.json'),'sourceSha256':h(raw),'sourceLessonIndex':index,'lessonId':ID,'contentVersion':lesson['contentVersion'],'sourceLessonSha256':h(canon(lesson)),'unchangedLessons':69,'unchangedTasks':837,'unchangedTaskFingerprints':{k:h(canon(v)) for k,v in oldtasks.items() if k not in changed},'unchangedLessonDTOFingerprints':{x['lessonId']:h(pathlib.Path('apps/preview/content/lessons/'+x['lessonId']+'.json').read_bytes()) for x in cat['lessons'] if x['lessonId']!=ID},'changedTaskIds':changed,'sourceStatusBeforeSha256':h(before),'sourceStatusAfterSha256':h(git('status','--porcelain')),'sourceWorktreeUnchanged':True,'files':provenance,'sourceTaskReview':{'path':reviewpath,'gitBlob':blob(reviewpath),'sha256':h(review)},'sourceCI':{'status':'FAILURE','run':41272129841,'reason':'Original template browser gate expects an SVG for the new HTML coding overview. New project must independently verify the four visible authored condition cards; never add a fake SVG or bypass checks.'}})
print(json.dumps({'codingVersion':lesson['contentVersion'],'changedTasks':12,'unchangedTasks':837,'unchangedLessons':69,'pureSourceFiles':len(modules)}))
