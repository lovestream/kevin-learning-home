"""Selective authored PR1 import. Inputs are allowlisted fixed blobs, never a source worktree or inbox scan."""
from pathlib import Path
import json,hashlib,re
base=Path('.evidence/math-onepass');src=base/'source';out=Path('packages/math-training/source');out.mkdir(parents=True,exist_ok=True);proof=[]
selected={r['path']:r for r in json.loads((base/'selected-source.json').read_text())}
def copy(p,adapt=None):
 b=(src/p).read_bytes();assert hashlib.sha256(b).hexdigest()==selected[p]['sha256'];s=b.decode();notes=[]
 if adapt:s,notes=adapt(s)
 target=out/p;target.parent.mkdir(parents=True,exist_ok=True);target.write_text(s)
 proof.append(dict(sourcePath=p,sourceGitRef=selected[p]['gitRef'],sourceBlob=selected[p]['gitBlob'],sourceSha256=selected[p]['sha256'],target=str(target),targetSha256=hashlib.sha256(s.encode()).hexdigest(),adaptations=notes))
def seed(s):return s[:s.index('export const legacyPendingCase')],['Only 14 authored approved seeds; unpublished pending draft excluded.']
def store(s):
 s=s.replace('seedCases,pendingCase,legacyPendingCase','seedCases');a=s.index('  if(p.studio.detective){');b=s.index('  const cases=',a);s=s[:a]+'  if(p.studio.detective)return p.studio.detective;\n'+s[b:]
 s=s.replace('[...seedCases,pendingCase]','seedCases').replace("status:id===pendingCase.id?'draft':'review'","status:'review'")
 line="  if(!d.badges.some(x=>x.version===a.version)&&d.badges.filter(x=>x.day===day(now)).length<3)d.badges.push({version:a.version,attemptId:a.id,day:day(now),at:iso(now)});"
 assert line in s;s=s.replace(line,'  // No badge or reward mutation in the new home training domain.')
 return s,['No unpublished pending draft/migration; no badge grant; other math, gate and state-machine logic preserved.']
def inbox(s):
 target="import reviewedEditions from '../server/detective-reviewed-editions.json' with {type:'json'};";assert target in s
 return s.replace(target,"import reviewedEditions from '../content/detective/approved-editions.json' with {type:'json'};"),['Editorial exceptions restricted to the 12 exact authored anonymous fixed-blob cases in this import, not the original private registry. No inbox sync/store is copied.']
for p in ['shared/detective-model.mjs','shared/detective-mass-spring.mjs','shared/detective-self-validation.mjs','server/detective-self-questions.mjs','server/detective-self-store.mjs','server/detective-self-integrity.mjs','server/detective-check-evidence.mjs','content/detective/process-cases.mjs','shared/task-audit-oracle.mjs','scripts/lib/detective-delivery-audit.mjs'] :copy(p)
copy('content/detective/seed-cases.mjs',seed);copy('server/detective-store.mjs',store);copy('shared/detective-inbox.mjs',inbox)
# Exact arithmetic shared by existing 849 questions and active PR1 (unchanged source blob).
p='shared/pilot-math.mjs';copy(p)
generated=[]
entries=[];editions=[];allowed=json.loads((base/'anonymous-source.json').read_text());assert len(allowed)==10
for r in allowed:
 b=(base/'anonymous'/(r['bundleId']+'.json')).read_bytes();assert hashlib.sha256(b).hexdigest()==r['sha256'];obj=json.loads(b);assert obj['privacy']=='public-anonymized-math-only' and obj['policy']=='auto-if-independently-verified'
 for e in obj['cases']:
  assert set(e)<=set(['id','content','verification','role','simulatedSteps']),list(e)
  entries.append(dict(id=e['id'],content=e['content'],verification=e['verification'],bundleId=obj['bundleId']))
  if obj['bundleId'].startswith('DT-20261026'):editions.append(dict(template=e['verification']['template'],parameters=e['verification']['parameters'],content=e['content']))
assert len(entries)==30 and len(editions)==12
for name,v in [('approved-bundles.json',entries),('approved-editions.json',editions)]:
 p=out/'content/detective'/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n');generated.append(dict(target=str(p),targetSha256=hashlib.sha256(p.read_bytes()).hexdigest()))
e=Path('docs/implementation/evidence/math-onepass');e.mkdir(parents=True,exist_ok=True)
(e/'source-import.json').write_text(json.dumps(dict(sourceRef='8292de85b40d6b2b5fba0f8b2dca359f5b2f821d',oldSourceRef='a7c05aaa8d9c5eabae4f3453807f830da1cbf279',sources=proof,generatedTargets=generated,anonymousBundles=allowed,privateUploadsRead=False,originalRepositoriesModified=False,rewardsEnabled=False,pendingDraftsImported=False),indent=2,ensure_ascii=False)+'\n')
print('SELECTIVE_V2_IMPORT_COMPLETE_30_ANONYMOUS_CASES_NO_PRIVATE_UPLOADS')
