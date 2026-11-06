import pathlib,json,subprocess,sys,os,hashlib,urllib.request,re
root=pathlib.Path('.evidence/home');meta=json.loads((root/'source.json').read_text());sha=meta['sha']
assert subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()==sha
assert not subprocess.check_output(['git','status','--porcelain']).strip()
ci=json.loads((root/'source-ci.json').read_text());assert ci['sha']==sha
assert all(r['status']=='completed' and r['conclusion']=='success' and all(j['conclusion']=='success' for j in r['jobs']) for r in ci['runs'])
with open(root/'download.log','w')as log:subprocess.run(['python3','.evidence/math-onepass/download-release.py',str(meta['push']),sha],stdout=log,stderr=subprocess.STDOUT,check=True)
sys.path.insert(0,'infra/math-preview');from release import Release
r=Release();previous=r.c.state.get('activeRelease');assert previous=='b7a2d23e25027b59e9a64cadfd41f5e9931db9b1','CURRENT_NAS_RELEASE_CHANGED'
r.c.preflight();r.c.invariance();folder=pathlib.Path('.evidence/math-onepass/release-'+sha[:12])
stage=r.stage(str(folder/'preview-amd64.tar.gz'),str(folder/'image.json'));(root/'stage.json').write_text(json.dumps(stage,indent=2)+'\n');print('STAGED_VALIDATED_HOME_IMAGE',flush=True)
try:
 active=r.activate(sha);(root/'delivery.json').write_text(json.dumps(active,indent=2)+'\n');print('HOME_ACTIVE_ON_SAME_38444',flush=True)
 env=os.environ|{'KLH_PREVIEW_TEST_ORIGIN':'http://192.168.2.100:38444','KLH_PREVIEW_EXPECT_SHA':sha}
 for name,script in [('home','tests/home/browser.mjs'),('explore','tests/explore/browser.mjs')]:
  with open(root/('nas-'+name+'.log'),'w') as log:subprocess.run(['node',script,'--nas'],env=env,stdout=log,stderr=subprocess.STDOUT,check=True,timeout=600)
  print('NAS_'+name.upper()+'_FIVE_WIDTHS_PASS',flush=True)
 subprocess.run(['python3',str(root/'nas-math-regression.py'),sha],check=True,timeout=3000)
 old=r.activate(previous,remember=False);new=r.activate(sha);r.c.invariance()
 (root/'rollback.json').write_text(json.dumps({'status':'PASS_NEW_OLD_NEW','rollback':old,'restored':new},indent=2)+'\n')
 (root/'runtime.json').write_text(json.dumps(r.verify(sha,public=True),indent=2)+'\n')
 row,inspection=r.app(sha)
 (root/'isolation.json').write_text(json.dumps({'sourceSha':sha,'imageId':row['imageId'],'user':inspection['Config']['User'],'mountCount':len(inspection['Mounts']),'readOnlyRoot':inspection['HostConfig']['ReadonlyRootfs'],'memoryBytes':inspection['HostConfig']['Memory'],'cpuset':inspection['HostConfig']['CpusetCpus'],'capDrop':inspection['HostConfig']['CapDrop'],'securityOpt':inspection['HostConfig']['SecurityOpt'],'protectedContainersUnchanged':len(r.c.state['protectedBefore'])},indent=2)+'\n')
 command="import fs from 'node:fs';console.log(JSON.stringify(JSON.parse(fs.readFileSync('/app/apps/preview/dist/seal.json')).files))"
 files=json.loads(r.c.docker('exec',row['name'],'node','--input-type=module','-e',command));assets=[]
 opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
 for key,digest in files.items():
  if key=='/.vite/manifest.json':continue
  assert key.startswith('/') and '..' not in key
  with opener.open('http://192.168.2.100:38444'+key,timeout=10) as response:data=response.read()
  assert hashlib.sha256(data).hexdigest()==digest
  assets.append({'path':key,'sha256':digest,'bytes':len(data),'status':'PASS_HTTP_HASH'})
 (root/'static-assets.json').write_text(json.dumps({'status':'PASS_ALL_PUBLIC_ASSETS','sourceSha':sha,'files':assets},indent=2)+'\n')
 inputs=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {runtimeInputs}from './tests/math-onepass/inputs.mjs';console.log(JSON.stringify(runtimeInputs()))"],text=True));(root/'release-inputs.json').write_text(json.dumps(inputs,indent=2)+'\n')
 (root/'image.json').write_bytes((folder/'image.json').read_bytes())
 (root/'completion.json').write_text(json.dumps({'status':'PASS_HOME_NAS_DELIVERY','sourceSha':sha,'mathGroups':14,'homeWidths':5,'exploreWidths':5,'rollback':'PASS','protectedContainersUnchanged':len(r.c.state['protectedBefore']),'realData':False},indent=2)+'\n');print('HOME_COMPLETE_NAS_MATH14_HOME5_EXPLORE5_ROLLBACK',flush=True)
except Exception:
 r.activate(previous,remember=False);r.c.invariance();print('FAILED_RESTORED_PREVIOUS_HOME_ENTRY',flush=True);raise
