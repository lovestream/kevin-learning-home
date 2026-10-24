import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
export const plan = JSON.parse(readFileSync('infra/math-trial/plan.json'));
export const state = JSON.parse(readFileSync('.trial-private/state.json'));
export const credentials = JSON.parse(readFileSync('.trial-private/credentials.json'));
assert.deepEqual(state.plan,plan);
assert.equal(state.origin,'https://192.168.2.100:38444');
assert.equal(credentials.origin,state.origin);
assert.equal(credentials.runId,plan.runId);
const quote = s=>"'"+s.replaceAll("'","'\\''")+"'";
export function docker(...args) {
  return execFileSync('ssh',['-o','BatchMode=yes','nas-codex',
    ['sudo','-n','/usr/local/bin/docker',...args].map(quote).join(' ')],
    {stdio:['ignore','pipe','ignore'],timeout:120000});
}
export function ownedApp() {
  const x=JSON.parse(docker('inspect','--format','{{json .}}',state.containers.app));
  assert.equal(x.Name,'/'+plan.resourcePrefix+'-app');
  assert.equal(x.Config.Labels['org.kevin-learning-home.trial'],plan.runId);
  assert.equal(x.Image,state.imageId);
  assert.deepEqual(x.Mounts.filter(m=>m.Type==='bind').map(m=>m.Source).sort(),
    ['content','data','media'].map(x=>state.root+'/'+x).sort());
  return x;
}
export function learningSnapshot() {
  ownedApp();
  const code = `const {DatabaseSync}=require('node:sqlite');const {createHash}=require('node:crypto');
  const db=new DatabaseSync('/data/learning.sqlite',{readOnly:true});
  const tables=['schema_migrations','learners','subjects','subject_states','server_attempts','command_receipts','learning_events','media_assets','content_manifests','content_media_refs','audit_log'];
  const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
  const rows=Object.fromEntries(tables.map(t=>[t,db.prepare('SELECT * FROM '+t+' ORDER BY rowid').all()]));
  console.log(JSON.stringify({sha256:hash(rows),tables:Object.fromEntries(tables.map(t=>[t,{count:rows[t].length,sha256:hash(rows[t])}]))}));db.close()`;
  return JSON.parse(docker('exec',state.containers.app,'node','-e',code));
}
export function changeGrant(action, learnerId) {
  assert(['grant-learner','revoke-grant'].includes(action));
  assert(/^[A-Za-z0-9:._-]+$/.test(learnerId));
  ownedApp();
  const py=`import importlib.util,types,json
s=importlib.util.spec_from_file_location('c','infra/math-trial/controller.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
t=m.Trial(types.SimpleNamespace(lan_ip='192.168.2.100',port=38444))
t.invariance();t.docker(['stop','--time','20',t.state['containers']['app']])
try:
 c=json.load(open('.trial-private/credentials.json'))
 t.seed(${JSON.stringify(action)},[c['parent']['login'],c['parent']['password'],${JSON.stringify(learnerId)}])
finally:t.docker(['start',t.state['containers']['app']])
t.invariance()`;
  execFileSync('python3',['-c',py],{stdio:['ignore','pipe','ignore'],timeout:120000});
}
