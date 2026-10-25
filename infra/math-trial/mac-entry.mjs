// Visible browser on the user's Mac. No cloud browser, system CA install or TLS bypass.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync,rmSync,rmdirSync,readdirSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import os from 'node:os';
import https from 'node:https';
import {randomUUID,X509Certificate} from 'node:crypto';
import {chromium,expect} from '@playwright/test';
import {trustedProfile} from './browser-trust.mjs';
import {defaultDelivery,owned,digest,sourceMaterial} from './mac-delivery.mjs';
const REPO=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
export function validateDelivery(destination,repo=REPO){
  destination=resolve(destination);owned(destination,0o700);
  const path=join(destination,'.delivery.json');owned(path,0o600);
  const marker=JSON.parse(readFileSync(path));
  const plan=JSON.parse(readFileSync(join(repo,'infra/math-trial/plan.json')));
  assert(marker.repo===repo&&marker.runId===plan.runId,'DELIVERY_PLAN_MISMATCH');
  for(const name of ['START-HERE.md','KLH-TRIAL-CA.cer','打开数学课堂.command']){
    owned(join(destination,name),name.endsWith('.command')?0o700:0o600);
    assert.equal(digest(readFileSync(join(destination,name))),marker.files[name],'DELIVERY_FILE_CHANGED');
  }
  const caPath=join(destination,'KLH-TRIAL-CA.cer'),ca=new X509Certificate(readFileSync(caPath));
  assert(ca.ca&&Date.parse(ca.validTo)>Date.now(),'TRIAL_CA_EXPIRED');
  const origin='https://'+plan.lanIp+':'+plan.port;assert.equal(origin,'https://192.168.2.100:38444');
  return {destination,repo,plan,origin,caPath,ca};
}
export function reserveRuntime(delivery){
  const runtime=join(delivery.destination,'.browser-runtime');
  if(existsSync(runtime)){
    owned(runtime,0o700);owned(join(runtime,'owner.json'),0o600);
    const marker=JSON.parse(readFileSync(join(runtime,'owner.json')));
    assert(marker.runId===delivery.plan.runId&&marker.repo===delivery.repo,'UNOWNED_BROWSER_RUNTIME');
    try{process.kill(marker.pid,0);return {alreadyRunning:true};}
    catch{throw Error('STALE_RUNTIME_PRESERVED_NEEDS_REVIEW');}
  }
  mkdirSync(runtime,{mode:0o700});
  const marker={runId:delivery.plan.runId,repo:delivery.repo,pid:process.pid,nonce:randomUUID()};
  writeFileSync(join(runtime,'owner.json'),JSON.stringify(marker),{mode:0o600});
  return {runtime,marker,profile:join(runtime,'profile'),alreadyRunning:false};
}
export function cleanRuntime(r){
  if(!r?.runtime||!existsSync(r.runtime))return;
  owned(r.runtime,0o700);
  const marker=JSON.parse(readFileSync(join(r.runtime,'owner.json')));
  assert(marker.nonce===r.marker.nonce&&marker.pid===process.pid,'RUNTIME_OWNER_MISMATCH');
  const profile=join(r.runtime,'profile');
  if(existsSync(profile)){owned(profile,0o700);rmSync(profile,{recursive:true});}
  // Only our ephemeral browser profile is disposable; unknown user files remain.
  if(readdirSync(r.runtime).some(n=>n!=='owner.json'))return;
  rmSync(join(r.runtime,'owner.json'));rmdirSync(r.runtime);
}
export function closeAfterLastPage(context,close){
  const watch=page=>page.once('close',()=>{
    if(context.pages().length===0)void Promise.resolve(close()).catch(()=>console.error('BROWSER_CLOSE_FAILED_RUNTIME_PRESERVED'));
  });
  context.pages().forEach(watch);context.on('page',watch);
}
function tlsGet(origin,path,ca){
  return new Promise((resolve,reject)=>{
    const q=https.get(origin+path,{ca:ca.toString(),rejectUnauthorized:true},r=>{
      let text='';r.on('data',b=>text+=b);r.on('end',()=>resolve({status:r.statusCode,text}));
    });q.on('error',reject);q.setTimeout(10000,()=>q.destroy(Error('TIMEOUT')));
  });
}
export async function launchMac(args=process.argv.slice(2)){
  assert.equal(process.platform,'darwin','USER_MAC_REQUIRED');
  let destination=defaultDelivery(),verify=false;
  for(let i=0;i<args.length;i++){
    if(args[i]==='--delivery')destination=args[++i];
    else if(args[i]==='--verify')verify=true;
    else throw Error('UNKNOWN_ARGUMENT');
  }
  const consoleUid=Number(execFileSync('stat',['-f','%u','/dev/console'],{encoding:'utf8'}).trim());
  assert.equal(consoleUid,process.getuid(),'ACTIVE_MAC_USER_MISMATCH');
  assert.equal(execFileSync('launchctl',['managername'],{encoding:'utf8'}).trim(),'Aqua','VISIBLE_MAC_SESSION_REQUIRED');
  const delivery=validateDelivery(destination),runtime=reserveRuntime(delivery);
  if(runtime.alreadyRunning){console.log('专属课堂浏览器已运行，请切换到 Google Chrome for Testing；未生成第二份配置。');return;}
  let context,stage='strict-tls',closed=false;
  const close=async()=>{if(closed)return;closed=true;await context?.close();cleanRuntime(runtime);};
  try{
    assert.equal((await tlsGet(delivery.origin,'/health/ready',delivery.ca)).status,200);
    context=await trustedProfile(chromium,runtime.profile,delivery.caPath,{headless:false,viewport:{width:1280,height:900}});
    closeAfterLastPage(context,close);
    const page=context.pages()[0]||await context.newPage();await page.bringToFront();
    await page.goto(delivery.origin+'/login');
    await expect(page.getByRole('button',{name:'登录',exact:true})).toBeVisible();
    if(verify){
      stage='real-synthetic-child-login';
      const source=sourceMaterial(REPO);
      await page.getByLabel('登录名',{exact:true}).fill(source.credentials.learner.login);
      await page.getByLabel('密码',{exact:true}).fill(source.credentials.learner.password);
      const login=page.waitForResponse(r=>r.url().endsWith('/api/v1/auth/login'));
      await page.getByRole('button',{name:'登录',exact:true}).click();
      assert.equal((await login).status(),200,'SYNTHETIC_LOGIN_NOT_ACCEPTED');
      await expect(page.locator('a[href="/subjects/math"]').first()).toContainText('只读课堂');
      await expect(page.locator('a[href="/subjects/english"]').first()).toContainText('待迁入');
      stage='visible-classroom';
      await page.locator('a[href="/subjects/math"]').first().click();
      await page.getByRole('link',{name:'打开首课只读课堂',exact:true}).click();
      await expect(page.locator('.math-lesson')).toBeVisible();
      await expect(page.locator('.math-step-count')).toHaveText('1 / 6');
      assert(await page.locator('input[type=password]').evaluateAll(ns=>ns.every(n=>!n.value)));
      const dir=join(REPO,'docs/implementation/evidence/math-nas-01-r1');mkdirSync(dir,{recursive:true});
      await page.screenshot({path:join(dir,'mac-headed-classroom.png'),fullPage:true});
      // Existing public CA only. Never old credentials, Cookie, key or DB.
      const oldCa=new X509Certificate(readFileSync(join(dirname(REPO),'kevin-learning-home-trial/.trial-private/klh-trial-ca.cer')));
      const old=await tlsGet('https://192.168.2.100:38443','/api/v1/config',oldCa);
      assert.equal(old.status,200);assert.equal(JSON.parse(old.text).subjects.find(s=>s.id==='math').status,'awaiting-migration');
      writeFileSync(join(dir,'mac-access.json'),JSON.stringify({status:'PASS',measuredAtUtc:new Date().toISOString(),
        hostFingerprint:digest(os.hostname()),platform:os.platform(),consoleUidMatches:true,aquaSession:true,
        headed:true,browser:context.browser().version(),strictTLS:true,globalTrustChanged:false,
        newPort:38444,childLoginHttp:200,math:'只读课堂',english:'待迁入',classroomPath:new URL(page.url()).pathname,steps:6,
        oldPort:38443,oldMath:'awaiting-migration',oldCredentialsRead:false,oldDatabaseRead:false,
        guideIsLocal:true,guideMode:'0600',directoryMode:'0700',publicCAOnly:true,
        physicalPhoneAndIPad:'NEEDS_USER_ACTION_NOT_RUN',leftVisibleForUser:true},null,2)+'\n');
      console.log('PASS：已在本机可见 Chromium 打开新数学课堂；指南在固定 Documents 文件夹。');
    }else console.log('可信浏览器已在本机打开。请使用同文件夹 START-HERE.md 中的新合成账号。');
    context.on('close',()=>{if(!closed){closed=true;cleanRuntime(runtime);}});
    for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>void close());
    await new Promise(resolve=>context.once('close',resolve));
  }catch{
    await close();console.error('MAC_ENTRY_FAILED_AT_'+stage+'：未降低TLS或重置账号，请反馈给Codex。');process.exitCode=1;
  }
}
