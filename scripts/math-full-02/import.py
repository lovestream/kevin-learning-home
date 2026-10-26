"""Read only pinned authored source; never open learning databases or modify the old repo."""
import json,hashlib,subprocess,pathlib,sys
repo=sys.argv[1] if len(sys.argv)>1 else '../math-learning'
sha='a7c05aaa8d9c5eabae4f3453807f830da1cbf279'
def git(*args):return subprocess.check_output(['git','-C',repo,*args])
def h(b):return hashlib.sha256(b).hexdigest()
def canonical(v):return json.dumps(v,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()
def write(p,v):pathlib.Path(p).write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
before=git('status','--porcelain');raw=git('show',sha+':content/pilot/lessons.json');lessons=json.loads(raw)
source=[];bank=[]
for l in lessons:
 entry={k:l[k] for k in ['lessonId','contentVersion','editorialRevision']};entry['taskSets']=l['taskSets'];bank.append(entry)
 for group,tasks in entry['taskSets'].items():
  for index,t in enumerate(tasks):
   source.append(dict(lessonId=l['lessonId'],contentVersion=l['contentVersion'],editorialRevision=l['editorialRevision'],group=group,index=index,taskId=t['id'],kind=t['kind'],sourceTaskSha256=h(canonical(t))))
assert len(source)==len({r['taskId'] for r in source})==849
write('apps/preview/practice/private/bank.json',dict(schemaVersion=1,sourceCommit=sha,lessons=bank))
files=[]
for name,target in [('shared/pilot-math.mjs','apps/preview/practice/private/pilot-math.mjs')]:
 data=git('show',sha+':'+name);pathlib.Path(target).write_bytes(data);files.append(dict(source=name,target=target,sha256=h(data),gitBlob=git('rev-parse',sha+':'+name).decode().strip()))
# Two literal diagrams and the authored relationship-card renderer, not old Practice runtime.
for name,target in [('src/studio/measurement/InverseTaskFigure.tsx','apps/preview/practice/InverseTaskFigure.tsx'),('src/studio/concept/ConceptVisual.tsx','apps/preview/practice/ConceptVisual.tsx')]:
 data=git('show',sha+':'+name);text=data.decode()
 if 'Inverse' in name:text=text.replace("import type {Task} from '../types';", "import type {PublicTask as Task} from './contract.ts';").replace("import './measurement.css';", "import '../adapters/source/src/studio/measurement/measurement.css';")
 else:text=text.replace("import type {ConceptScene,ConceptTaskDiagram} from '../types';", "import type {ConceptScene} from '../adapters/source/src/studio/types.ts';\nimport type {ConceptDiagram as ConceptTaskDiagram} from './contract.ts';").replace("import './concept.css';", "")
 pathlib.Path(target).write_text(text);files.append(dict(source=name,target=target,sourceSha256=h(data),targetSha256=h(text.encode()),gitBlob=git('rev-parse',sha+':'+name).decode().strip(),adaptation='type-only imports and existing CSS path; no model/visual changes'))
after=git('status','--porcelain');assert before==after
write('docs/implementation/evidence/math-full-02/source.json',dict(sourceCommit=sha,sourceFile='content/pilot/lessons.json',sourceSha256=h(raw),sourceBlob=git('rev-parse',sha+':content/pilot/lessons.json').decode().strip(),privateBankSha256=h(pathlib.Path('apps/preview/practice/private/bank.json').read_bytes()),worktreeUnchanged=True,statusBeforeSha256=h(before),statusAfterSha256=h(after),files=files,tasks=source))
print('IMPORTED 70 lessons / 849 exact authored tasks; original worktree unchanged')
