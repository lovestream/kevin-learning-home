import https from 'node:https';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const ca=fs.readFileSync('.trial-private/tls/ca.crt'),responses=[];
for(const path of ['/login','/health/ready','/api/v1/learners/synthetic-no-session/subjects/math/lessons/G3-U01-B01']) {
 const r=await new Promise((resolve,reject)=>{
  const q=https.get('https://192.168.2.100:38444'+path,{ca,rejectUnauthorized:true},r=>{
   const authorized=r.socket.authorized;let body='';
   r.on('data',x=>body+=x);
   r.on('end',()=>resolve({path,status:r.statusCode,bytes:Buffer.byteLength(body),authorized,...(path==='/health/ready'?{readiness:JSON.parse(body).status}:{})}));
  });
  q.on('error',reject);q.setTimeout(8000,()=>q.destroy(Error('TIMEOUT')));
 });
 responses.push(r);
}
assert.equal(responses[0].status,200);
assert.equal(responses[1].readiness,'ready');
assert.equal(responses[2].status,401);
assert(responses.every(x=>x.authorized));
const out={status:'PASS_OLD_SYNTHETIC_ROLLBACK',strictTLS:true,trustAnchor:'Existing synthetic trial public CA only; no OS trust changes',python314StrictProfileError:'Existing CA lacks key usage extension; Node 24 default TLS verification used, rejectUnauthorized=true',responses};
fs.writeFileSync('.evidence/math-full-nas-r2/rollback-probe.json',JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify(out));
