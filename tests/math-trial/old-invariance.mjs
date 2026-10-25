// Read-only minimal metadata and anonymous HTTPS of old services. Never old credentials/DB.
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {X509Certificate,createHash} from 'node:crypto';
import https from 'node:https';
import assert from 'node:assert/strict';
const plan=JSON.parse(readFileSync('infra/math-trial/plan.json'));
const stage=process.argv[2];assert(['before','after'].includes(stage));
const quote=s=>"'"+s.replaceAll("'","'\\''")+"'";
const ssh=(cmd)=>execFileSync('ssh',['-o','BatchMode=yes','nas-codex',cmd],{stdio:['ignore','pipe','ignore']});
const docker=(...args)=>ssh(['sudo','-n','/usr/local/bin/docker',...args].map(quote).join(' '));
const ids=docker('ps','-aq').toString().trim().split(/\s+/);
const format='[{{json .Id}},{{json .Name}},{{json .State.Status}},{{json .State.StartedAt}},{{json .RestartCount}}]';
const current=docker('inspect','--format',format,...ids).toString().trim().split('\n').map(JSON.parse)
  .filter(x=>!['app','tls','admin','verify'].some(role=>x[1]==='/'+plan.resourcePrefix+'-'+role)).sort((a,b)=>a[0].localeCompare(b[0]));
assert.equal(current.length,10);assert(current.every(x=>x[2]==='running'));
if(stage==='before'&&existsSync('/tmp/klh-math-nas-services-before.json')){
  const initial=JSON.parse(readFileSync('/tmp/klh-math-nas-services-before.json')).rows.sort((a,b)=>a[0].localeCompare(b[0]));
  assert.deepEqual(current,initial);
}
// Existing *public DER CA only*; no old state.json/credentials/keys/DB opened.
const oldPublicCa=process.argv[3];assert(oldPublicCa,'EXPLICIT_EXISTING_PUBLIC_CA_REQUIRED');
const ca=new X509Certificate(readFileSync(oldPublicCa));
const call=path=>new Promise((resolve,reject)=>{
  const req=https.get('https://192.168.2.100:38443'+path,{ca:ca.toString(),rejectUnauthorized:true},r=>{
    const leaf=r.socket.getPeerCertificate().raw;let body='';r.on('data',b=>body+=b);r.on('end',()=>resolve({status:r.statusCode,leafSha256:hash(leaf),body}));
  });req.on('error',reject);req.setTimeout(10000,()=>req.destroy(Error('TIMEOUT')));
});
const hash=x=>createHash('sha256').update(x).digest('hex');
const ready=await call('/health/ready'), config=await call('/api/v1/config'), login=await call('/login');
assert.equal(ready.status,200);assert.equal(JSON.parse(ready.body).status,'ready');assert.equal(login.status,200);
assert.equal(JSON.parse(config.body).subjects.find(x=>x.id==='math').status,'awaiting-migration');
const oldTrial=current.filter(x=>x[1].startsWith('/klh-02b-trial-20261023-33fccf71-'));
assert.equal(oldTrial.length,2);
const metadata={count:10,productionCount:8,oldTrialCount:2,allSha256:hash(JSON.stringify(current)),
 productionSha256:hash(JSON.stringify(current.filter(x=>!oldTrial.includes(x)))),oldTrialSha256:hash(JSON.stringify(oldTrial)),
 publicCaSha256:hash(ca.raw),leafSha256:ready.leafSha256,httpsReady:200,anonymousLoginPage:200,
 oldMathStatus:'awaiting-migration',oldAccountLogin:'NEEDS_USER_ACTION_NO_OLD_CREDENTIAL_READ'};
if(stage==='after')assert.deepEqual(metadata,JSON.parse(readFileSync('.trial-private/old-before.json')));
writeFileSync('.trial-private/old-'+stage+'.json',JSON.stringify(metadata,null,2)+'\n',{mode:0o600});
console.log(JSON.stringify(metadata));
