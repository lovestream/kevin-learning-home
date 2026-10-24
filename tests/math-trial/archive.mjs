// Public allowlisted summaries only; no credentials/state/DB/key/profile copying.
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash,X509Certificate} from 'node:crypto';
import assert from 'node:assert/strict';
import os from 'node:os';
import {chromium} from '@playwright/test';
import {plan,state,ownedApp} from './nas-evidence.mjs';
const dir='docs/implementation/evidence/math-nas-01';
const hash=x=>createHash('sha256').update(x).digest('hex');
const load=p=>JSON.parse(readFileSync(p));
const write=(name,obj)=>writeFileSync(dir+'/'+name,JSON.stringify(obj,null,2)+'\n');
const browser=load(dir+'/browser-results.json');
assert.equal(browser.status,'PASS');assert.equal(browser.filtered,false);assert.equal(browser.results.length,4);
assert(browser.results.every(x=>x.status==='PASS'));assert.deepEqual(browser.learningBefore,browser.learningAfter);
const status=load('.trial-private/nas-status.json');
assert.equal(status.status,'TRIAL_RUNNING_SYNTHETIC_ONLY');assert.equal(status.containers.app.health,'healthy');
assert(status.existingServices.unchanged);ownedApp();
const before=load('.trial-private/old-before.json'),after=load('.trial-private/old-after.json');
assert.deepEqual(before,after);
write('old-services-invariance.json',{before,after,unchanged:true,oldCredentialRead:false,oldDatabaseRead:false});
write('nas-status.json',status);
const image=load('.trial-private/bundle/image-inspect.json');
const inputs=readFileSync('.trial-private/bundle/source-inputs.sha256','utf8').trim().split('\n');
const sourceHashes={};
for(const path of ['infra/docker/Dockerfile','package-lock.json']){
  const h=hash(execFileSync('git',['show',plan.sourceSha+':'+path]));
  assert(inputs.some(x=>x.startsWith(h+' ')&&x.endsWith('/'+path)));
  sourceHashes[path]=h;
}
assert.equal(image.Id,state.imageId);assert.equal(image.Config.Labels['org.opencontainers.image.revision'],plan.sourceSha);
write('image-build.json',{sourceSha:plan.sourceSha,mainCiRun:plan.mainCiRun,
  workflowRun:40099510393,workflowHead:'8bbe64c475a049af6d2cdb265354b8d83941cdf7',
  artifact:{id:12562685287,name:'klh-math-trial-bundle',retentionDays:1},
  imageId:state.imageId,archiveSha256:state.archiveSha256,architecture:image.Architecture,os:image.Os,
  formalSourceHashes:sourceHashes,nasAndActionsEvidenceEqual:true,...state.buildEvidence});
const ca=new X509Certificate(readFileSync('.trial-private/tls/ca.crt'));
const leaf=new X509Certificate(readFileSync('.trial-private/tls/server.crt'));
assert.equal(Date.parse(leaf.validTo)-Date.parse(leaf.validFrom),7*24*60*60*1000);
assert(leaf.checkIssued(ca)&&leaf.verify(ca.publicKey));assert.equal(leaf.checkIP(plan.lanIp),plan.lanIp);
write('owned-resources.json',{runId:plan.runId,root:state.root,uid:1024,gid:100,rootMode:'0700',markerMatchesFrozenPlan:true,
  imageTag:plan.resourcePrefix+':app',imageId:state.imageId,containers:state.containers,
  networks:{internal:state.networkId,edge:state.edgeNetworkId},origin:state.origin,
  proxySha256:hash(readFileSync('infra/math-trial/tls-proxy.mjs')),
  certificate:{caSha256:hash(ca.raw),leafSha256:hash(leaf.raw),validFrom:leaf.validFrom,validTo:leaf.validTo,ipSan:plan.lanIp,profileOnlyTrust:true,globalTrustChanged:false},
  preservedForUserTrial:true,production:false,realData:false,physicalDevices:'NEEDS_USER_ACTION'});
const files=['tests/math-trial/browser.mjs','tests/math-trial/nas-evidence.mjs',
  'infra/math-trial/controller.py','infra/math-trial/browser-trust.mjs',
  'infra/math-trial/auth-budget.mjs','infra/math-trial/tls-proxy.mjs','infra/math-trial/plan.json'];
write('harness-files.json',{collection:'post-run snapshot; these seven files did not change during the successful full NAS run',
  gitHeadAtCollection:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
  worktreeDirtyAtRun:true,runtimeSourceSha:plan.sourceSha,
  browser:execFileSync(chromium.executablePath(),['--version'],{encoding:'utf8'}).trim(),
  client:{node:process.version,os:os.platform(),arch:os.arch(),kernel:os.release()},
  files:Object.fromEntries(files.map(p=>[p,hash(readFileSync(p))]))});
console.log(JSON.stringify({status:'PUBLIC_EVIDENCE_ARCHIVED',sourceSha:plan.sourceSha,oldServicesUnchanged:true}));
