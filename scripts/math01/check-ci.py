# Download a complete GitHub Actions artifact first; read-only validation, no NAS/old repo access.
# Usage: python3 scripts/math01/check-ci.py ARTIFACT_DIR EXACT_HEAD_SHA
import json,sys,pathlib,xml.etree.ElementTree as ET
p=pathlib.Path(sys.argv[1]); sha=sys.argv[2]
def get(name): return json.loads((p/name).read_text())
v=get('verification.json'); s=get('shell-browser.json'); c=get('container.json'); a=get('auth-container.json'); b=get('browser.json')
assert v['status']=='PASS_CI' and v['executedHeadSha']==sha and v['worktreeDirty'] is False
assert v['tests']==60 and v['browserViewports']==3 and v['shellBrowserScenarios']==18
assert s['status']=='PASS_CI' and s['executedHeadSha']==sha and s['worktreeDirty'] is False
assert s['total']==18 and s['failures']==0 and s['filtered'] is False and len(s['screenshots'])==15
for x in s['cases']:
 assert x['status']=='PASS' and x['realAuthBackend'] and x['learningTablesUnchanged']
 assert not x['consoleSecretLeak'] and x['scriptErrors']==x['cspViolations']==x['externalRequests']==x['persistentBrowserEntries']==0
 for post in x['posts']:
  assert post['originMatches']
  assert post['endpoint']=='/api/v1/auth/login' or post['csrfPresent'] or post['endpoint'] in x['intentionalHeaderFaults']
assert c['status']=='PASS_CI' and c['executedHeadSha']==sha and c['nonRoot'] and c['readOnlyRootfs'] and c['autoRestartCount']>=1
for k in ['activeOwnerNotEvicted','liveBackupExcluded','killRecreatePreserved','autoRestartAfterProcessKill','unhealthyAloneDidNotRestart','productionHealthCommandRecovered','deletedRecreatedVolumePersistent','restoredHostReady','exactTableHashesPreserved','healthcheckCommandPassed','wrongUidRejected','testHarnessExcludedFromImage']: assert c[k],k
assert a['status']=='PASS_CI'
for k,val in a.items():
 if isinstance(val,bool): assert val,k
assert a['shellHarnessExcluded'] and b['status']=='PASS_CI' and b['executedHeadSha']==sha and len(b['viewports'])==3
cases=[]
for t in ET.parse(p/'foundation-junit.xml').iter('testcase'):
 assert all(t.find(tag) is None for tag in ['error','failure','skipped'])
 cases.append({'name':t.attrib['name'],'status':'PASS','durationSeconds':float(t.attrib.get('time','0'))})
old=json.loads(pathlib.Path('docs/implementation/evidence/02a-r1/ci/test-cases.json').read_text())
assert len(cases)==60 and len(old['cases'])==55 and set(x['name'] for x in old['cases'])<=set(x['name'] for x in cases)
assert (p/'compose-v1.yml').stat().st_size>0
for name in s['screenshots']: assert (p/'02b'/name).is_file()
print(json.dumps({'sha':sha,'status':'PASS_CI','nodeTests':60,'original55Preserved':True,'legacyViewports':3,'realShellScenarios':18,'screenshots':15,'autoRestartCount':c['autoRestartCount'],'shellHarnessExcluded':a['shellHarnessExcluded']}))

prior=json.loads(pathlib.Path('docs/implementation/evidence/02b/ci/test-cases.json').read_text())
assert set(x['name'] for x in prior['cases'])==set(x['name'] for x in cases)
priorUI=json.loads(pathlib.Path('docs/implementation/evidence/02b/local/shell-browser.json').read_text())
assert set(x['name'] for x in priorUI['cases'])<=set(x['name'] for x in s['cases'])
r=s['r1Evidence']; assert r['continuity']['wallClockMs']>=12000 and r['continuity']['successfulPolls']>=2
assert r['continuity']['stableDOMAndFocus'] and r['continuity']['unchangedUnlockDeadline']
for section in ['config','revocation','race','expiry']:
 for key,val in r[section].items():
  if isinstance(val,bool): assert val,(section,key)
print(json.dumps({'R1':r,'original60Preserved':True,'original13UIPreserved':True}))

import hashlib
mb=get('math-01/browser.json'); mc=get('math-01/container.json'); mi=get('math-01/build-integrity.json')
assert v['mathNodeTests']==12 and v['mathBrowserScenarios']==9
assert mb['status']=='PASS_CI' and mb['executedHeadSha']==sha and mb['worktreeDirty'] is False
assert mb['total']==9 and mb['failures']==0 and mb['filtered'] is False
assert mb['viewports']==[390,768,1280] and len(mb['screenshots'])==10
for case in mb['cases']:
 assert case['status']=='PASS' and case['realAuthBackend'] and case['learningTablesUnchanged']
 assert not case['consoleSecretLeak']
 for field in ['scriptErrors','cspViolations','externalRequests','persistentBrowserEntries','databases','workers','caches']: assert case[field]==0,(case['name'],field)
 assert len(case['learningTables'])==11
 for table, counts in case['learningTables'].items(): assert counts['before']==counts['after'],(case['name'],table)
 for post in case['posts']: assert post['endpoint'].startswith('/api/v1/auth/') and post['originMatches']
for name in mb['screenshots']: assert (p/'math-01'/name).is_file()
pc=mb['observations']['parentContinuity']; motion=mb['observations']['motion']
assert pc['wallClockMs']>=12000 and pc['successfulAuthPolls']>=2 and pc['successfulLessonPolls']>=2 and pc['stableDOMAndFocus']
assert motion['requested']>1 and motion['cancelled']>0 and motion['cancelledOnUnmount'] and motion['reducedMotionRequestsAdded']==0
mt=list(ET.parse(p/'math-01/unit.xml').iter('testcase'))
assert len(mt)==12 and all(all(t.find(tag) is None for tag in ['failure','error','skipped']) for t in mt)
assert mc['status']=='PASS_CI' and mc['mathReadonlyEnabled'] and mc['realParentSessionAndGrant'] and mc['allMathWritesClosed'] and mc['mathImportAndBrowserHarnessExcluded']
for key,val in mc.items():
 if isinstance(val,bool): assert val,key
canonical=lambda obj:json.dumps(obj,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode()
assert hashlib.sha256(canonical(mi['files'])).hexdigest()==mi['visualArtifactSha256']
public=json.loads(pathlib.Path('packages/subjects/math/public-lesson.json').read_text())
assert hashlib.sha256(canonical(public)).hexdigest()==mi['publicDtoSha256']
assert mi['sourceCommit']=='a7c05aaa8d9c5eabae4f3453807f830da1cbf279' and len(mi['visualSources'])==8
print(json.dumps({'status':'PASS_MATH_CI','sha':sha,'mathNodeTests':12,'mathBrowserScenarios':9,'screenshots':10,'all11LearningTablesUnchanged':True,'parentContinuity':pc,'motion':motion,'productionMathContainer':True,'publicDtoSha256':mi['publicDtoSha256'],'visualArtifactSha256':mi['visualArtifactSha256']}))
