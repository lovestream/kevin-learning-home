import os,subprocess,pathlib,json,sys,time
sha=sys.argv[1];assert len(sha)==40
root=pathlib.Path('.evidence/explore/math-nas-logs');root.mkdir(exist_ok=True)
env=os.environ|{'KLH_PREVIEW_TEST_ORIGIN':'http://192.168.2.100:38444','KLH_PREVIEW_EXPECT_SHA':sha,'KLH_PDFTOTEXT':'/Users/yako/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/poppler/poppler/bin/pdftotext'}
tests=[('coding','tests/math-onepass/coding-browser.mjs'),('original-primary-http','.evidence/math-onepass/probe-primary.mjs'),('original-library-http','.evidence/math-onepass/probe-library.mjs'),('business','tests/math-onepass/business-http.mjs'),('navigation','tests/math-full-01/navigation.mjs'),('classrooms','tests/math-full-01/browser.mjs'),('practice','tests/math-full-02/browser.mjs'),('compatibility','tests/math-full-remainder/browser.mjs'),('cases','tests/math-onepass/cases-browser.mjs'),('training','tests/math-onepass/training-browser.mjs'),('models','tests/math-onepass/legacy-browser.mjs'),('experience','tests/math-onepass/experience-browser.mjs'),('print','tests/math-onepass/print-browser.mjs')]
pathlib.Path('.evidence/math-onepass/nas').mkdir(exist_ok=True)
# Two independent browser clients, each with its own page capability. The NAS
# container retains its authorized single CPU / 256 MiB limits throughout.
import concurrent.futures
rows=[]
def run(item):
 name,path=item;print('START '+name,flush=True);begin=time.time()
 with open(root/(name+'.log'),'w') as log:r=subprocess.run(['node',*path.split(),'--nas'],env=env,stdout=log,stderr=subprocess.STDOUT,timeout=1500)
 row={'name':name,'script':path,'exit':r.returncode,'seconds':round(time.time()-begin,2),'log':str(root/(name+'.log'))}
 print('END '+name+' exit='+str(r.returncode),flush=True);return row
rows.append(run(('checkpoint','tests/math-full-01/browser.mjs --checkpoint')))
assert rows[0]['exit']==0,'NAS_CHECKPOINT_FAILED'
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
 for row in pool.map(run,tests):
  rows.append(row)
  (root/'suite.json').write_text(json.dumps({'sourceSha':sha,'origin':env['KLH_PREVIEW_TEST_ORIGIN'],'concurrentClients':2,'status':'PASS' if all(x['exit']==0 for x in rows) and len(rows)==len(tests)+1 else 'IN_PROGRESS_OR_FAIL','rows':rows},indent=2)+'\n')
assert len(rows)==len(tests)+1 and all(x['exit']==0 for x in rows),'ACTUAL_NAS_REGRESSION_FAILED'
