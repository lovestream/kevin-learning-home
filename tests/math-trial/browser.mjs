// Explicit LAN acceptance. Real Chromium -> new TLS -> formal Node/SQLite; no mocks.
// All secrets stay local/in-memory. No HAR, trace, raw failures, Cookie or request bodies in evidence.
import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {trustedProfile} from '../../infra/math-trial/browser-trust.mjs';
import {plan,state,credentials,learningSnapshot,changeGrant} from './nas-evidence.mjs';
import {canonical} from '../../packages/contracts/index.ts';
import {mathResponseSchema} from '../../packages/contracts/math-readonly.ts';
const origin=state.origin, path='/subjects/math/lessons/G3-U01-B01';
const evidence=state.buildEvidence, manifest=evidence.manifest;
const dto=JSON.parse(readFileSync('packages/subjects/math/public-lesson.json'));
const title=dto.lesson.title;
const dir='docs/implementation/evidence/math-nas-01';mkdirSync(dir,{recursive:true});
const before=learningSnapshot(), results=[], screenshots=[], observations={};
let failed=false,stage='init';
const hash=x=>createHash('sha256').update(x).digest('hex');
const api=(p,url,method='GET',body)=>p.evaluate(async({url,method,body})=>{
  const session=method==='GET'?null:await(await fetch('/api/v1/auth/session',{cache:'no-store'})).json();
  const r=await fetch(url,{method,cache:'no-store',headers:method==='GET'?{}:{'Content-Type':'application/json','X-CSRF-Token':session.csrfToken},...(method==='GET'?{}:{body:JSON.stringify(body??{})})});
  return {status:r.status,body:await r.json()};
},{url,method,body});
async function login(p,parent=false){
  await p.goto(origin+'/login');const c=parent?credentials.parent:credentials.learner;
  await p.getByLabel('登录名',{exact:true}).fill(c.login);
  await p.getByLabel('密码',{exact:true}).fill(c.password);
  await p.getByLabel('密码',{exact:true}).press('Enter');
  await expect(p.getByRole('heading',{name:parent?'家长权限已锁定':'今天，想从哪里开始？',exact:true})).toBeVisible();
}
async function unlock(p){
  await p.getByLabel('再次输入家长密码').fill(credentials.parent.password);
  await p.getByRole('button',{name:'解锁家长权限',exact:true}).click();
  await expect(p.getByRole('heading',{name:'家长中心',exact:true})).toBeVisible();
}
async function shot(p,name){
  assert(await p.locator('input[type=password]').evaluateAll(ns=>ns.every(n=>!n.value)));
  assert(!(await p.locator('body').innerText()).includes(credentials.parent.password));
  assert(!(await p.locator('body').innerText()).includes(credentials.learner.password));
  await p.screenshot({path:dir+'/'+name+'.png',fullPage:true});screenshots.push(name+'.png');
}
async function noOverflow(p){assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
async function run(name,width,fn){
  const profile='.trial-private/browser-'+name+'-'+Date.now();
  let c;const start=Date.now();
  try{
    stage='strict-profile-trust';
    c=await trustedProfile(chromium,profile,'.trial-private/tls/ca.crt',{
      viewport:{width,height:width===768?1024:900},reducedMotion:'reduce'});
    // Remove Chromium's initial blank pages before collecting only LAN-page observations.
    for(const p of c.pages())await p.close();
    let csp=0,external=0,errors=0,leak=false,hashChecked=0,cspHeaders=0;
    const posts=[],pending=[];
    await c.exposeBinding('reportPolicyViolation',()=>csp++);
    await c.addInitScript(()=>document.addEventListener('securitypolicyviolation',()=>void window.reportPolicyViolation()));
    const p=await c.newPage();p.setDefaultTimeout(15000);
    p.on('pageerror',()=>errors++);
    p.on('console',m=>{if([credentials.parent.password,credentials.learner.password].some(s=>m.text().includes(s)))leak=true;});
    p.on('request',r=>{
      if(new URL(r.url()).origin!==origin)external++;
      if(r.method()==='POST')pending.push((async()=>{
        const h=await r.allHeaders();posts.push({endpoint:new URL(r.url()).pathname,originMatches:h.origin===origin,csrfPresent:!!h['x-csrf-token']});
      })());
    });
    p.on('response',r=>{pending.push((async()=>{
      const u=new URL(r.url());if(u.origin!==origin)return;
      const headers=await r.allHeaders();
      assert.equal(headers['cache-control'],'no-store');
      assert.match(headers['content-security-policy'],/default-src 'self'; script-src 'self'; style-src 'self'/);cspHeaders++;
      if(r.status()!==200)return;
      const file=manifest.files.find(f=>'/'+f.path===u.pathname);
      if(file){assert.equal(hash(await r.body()),file.sha256);hashChecked++;}
      if(/^\/api\/v1\/learners\/[^/]+\/subjects\/math\/lessons\//.test(u.pathname)){
        const body=mathResponseSchema.parse(await r.json());
        assert.equal(body.manifest.publicDtoSha256,manifest.publicDtoSha256);
        assert.equal(body.manifest.visualArtifactSha256,manifest.visualArtifactSha256);
        const projection=Object.fromEntries(Object.keys(dto).map(k=>[k,body[k]]));
        assert.equal(hash(canonical(projection)),manifest.publicDtoSha256);hashChecked++;
      }
    })());});
    stage=name;
    await fn(p,c);
    stage='safety-and-hashes';await Promise.all(pending);
    assert.equal(csp,0);assert.equal(external,0);assert.equal(errors,0);assert.equal(leak,false);
    assert(hashChecked>=2&&cspHeaders>0);
    assert(posts.every(x=>x.originMatches&&(x.endpoint==='/api/v1/auth/login'||x.csrfPresent)));
    assert(await p.evaluate(async()=>localStorage.length===0&&sessionStorage.length===0&&(await indexedDB.databases()).length===0&&(await caches.keys()).length===0));
    assert.deepEqual(learningSnapshot(),before);
    results.push({name,status:'PASS',durationMs:Date.now()-start,cspViolations:csp,externalRequests:external,pageErrors:errors,secretLeaks:leak,hashChecked,cspHeaders,postBoundaries:posts});
  }catch{
    failed=true;results.push({name,status:'FAIL',stage,error:'NAS_MATH_ASSERTION'});
    console.error(JSON.stringify({name,stage,error:'NAS_MATH_ASSERTION'}));
  }finally{await c?.close();rmSync(profile,{recursive:true,force:true});}
}
try{
  for(const width of [390,768,1280]){
    await run('child-six-steps-'+width,width,async p=>{
      stage='anonymous-gate';await p.goto(origin+path);
      await expect(p.getByRole('heading',{name:'请先登录学习家园',exact:true})).toBeVisible();
      assert(!(await p.locator('body').innerText()).includes(title));
      stage='child-login';await login(p);
      const config=(await api(p,'/api/v1/config')).body;
      assert.equal(config.subjects.find(x=>x.id==='math').status,'readonly-preview');
      assert.equal(config.subjects.find(x=>x.id==='english').status,'awaiting-migration');
      await shot(p,'home-'+width);
      await p.locator('a[href="/subjects/math"]').first().click();
      await p.getByRole('link',{name:'打开首课只读课堂',exact:true}).click();
      await expect(p.locator('.math-lesson')).toBeVisible();
      await expect(p.getByText(dto.lesson.classroom.story,{exact:true})).toBeVisible();
      await noOverflow(p);await shot(p,'story-'+width);
      stage='six-steps-and-rotation';
      await p.getByRole('button',{name:'下一步',exact:true}).click();
      await expect(p.locator('.classroom-stage')).toBeFocused();
      await p.getByRole('button',{name:dto.lesson.classroom.predictionOptions[0],exact:true}).click();
      await p.getByRole('button',{name:'下一步',exact:true}).click();
      const svg=p.locator('.solid-viewport[tabindex]');await svg.focus();
      await p.keyboard.press('ArrowRight');await p.keyboard.press('ArrowUp');
      await expect(p.locator('[data-evidence=direction]')).toHaveText('绕盒子45°，抬高35°');
      for(const view of ['正前方','右侧','上方']){
        await p.getByRole('button',{name:'从'+view+'看',exact:true}).click();
        await expect(p.locator('[data-evidence=direction]')).toHaveText('正对'+view);
        await p.getByRole('button',{name:'拍下当前方向',exact:true}).click();
      }
      await expect(p.locator('.photo-shelf figure')).toHaveCount(3);
      assert.deepEqual(await p.locator('.projection-row rect').evaluateAll(ns=>ns.map(n=>[n.getAttribute('width'),n.getAttribute('height')])),[['96','60'],['48','60'],['96','48']]);
      await noOverflow(p);await shot(p,'experiment-'+width);
      for(let i=0;i<3;i++)await p.getByRole('button',{name:'下一步',exact:true}).click();
      await expect(p.getByRole('heading',{name:'练习尚未接入',exact:true})).toBeVisible();
      await expect(p.locator('.math-step-count')).toHaveText('6 / 6');
      await expect(p.getByRole('button',{name:'下一步',exact:true})).toBeDisabled();
      stage='readonly-http';
      const session=(await api(p,'/api/v1/auth/session')).body;
      const lessonApi='/api/v1/learners/'+session.learnerIds[0]+'/subjects/math/lessons/';
      assert.equal((await api(p,lessonApi+'G3-U01-B02')).status,404);
      for(const endpoint of [lessonApi+'G3-U01-B01','/api/v1/learners/'+session.learnerIds[0]+'/subjects/math/commands','/api/v1/learners/'+session.learnerIds[0]+'/subjects/math/state','/api/v1/wallet/commands']){
        const r=await api(p,endpoint,'POST');assert.equal(r.status,endpoint.includes('/lessons/')?405:403);
      }
      stage='refresh-reset-logout';await p.reload();
      await expect(p.locator('.math-step-count')).toHaveText('1 / 6');
      await p.locator('.classroom-route button').nth(2).click();
      await expect(p.locator('.photo-shelf')).toHaveCount(0);
      await expect(p.locator('[data-evidence=direction]')).toHaveText('绕盒子35°，抬高25°');
      await p.getByRole('button',{name:'退出',exact:true}).click();
      await expect(p.getByRole('heading',{name:'请先登录学习家园',exact:true})).toBeVisible();
      await p.goto(origin+path);await expect(p.locator('.math-lesson')).toHaveCount(0);
    });
    if(failed)break;
  }
  if(!failed)await run('parent-permissions-continuity-revoke',1280,async p=>{
    stage='locked-parent';await login(p,true);
    const childSession=await api(p,'/api/v1/auth/session');assert.deepEqual(childSession.body.learnerIds,[]);
    await unlock(p);const s=(await api(p,'/api/v1/auth/session')).body;
    assert.equal(s.learnerIds.length,1);const learnerId=s.learnerIds[0];
    const url='/api/v1/learners/'+learnerId+'/subjects/math/lessons/G3-U01-B01';
    assert.equal((await api(p,'/api/v1/auth/parent-lock','POST')).status,200);
    assert.equal((await api(p,url)).status,403);
    await p.goto(origin+'/parent');await unlock(p);
    assert.equal((await api(p,url)).status,200);
    await p.locator('#learner-choice-0').click();
    await p.getByRole('link',{name:'打开首课只读课堂',exact:true}).click();
    await expect(p.locator('.math-lesson')).toBeVisible();
    await p.locator('.classroom-route button').nth(2).click();
    const button=p.getByRole('button',{name:'从右侧看',exact:true});await button.focus();await p.keyboard.press('Enter');
    const node=await button.elementHandle();let authPolls=0,mathPolls=0;
    p.on('response',r=>{if(r.status()===200){if(r.url().endsWith('/auth/session'))authPolls++;if(r.url().endsWith(url))mathPolls++;}});
    stage='two-auth-math-polls-focus';const start=Date.now();
    for(let i=0;i<12;i++){await p.waitForTimeout(1000);await expect(button).toBeFocused();assert(await node.evaluate(n=>n.isConnected&&n===document.activeElement));}
    assert(authPolls>=2&&mathPolls>=2);
    observations.parentContinuity={authPolls,mathPolls,wallClockMs:Date.now()-start,stableDOMAndFocus:true};
    await shot(p,'parent-continuity');
    stage='offline-revoke-formal-cli';changeGrant('revoke-grant',learnerId);
    try{
      await expect.poll(async()=>{try{return(await api(p,url)).status}catch{return 0}},{timeout:20000}).toBe(403);
      await expect(p.locator('.math-lesson')).toHaveCount(0,{timeout:10000});
      assert(!(await p.locator('body').innerText()).includes(title));
    }finally{changeGrant('grant-learner',learnerId);}
    observations.grantRevoke={formalOfflineSyntheticCLI:true,newAppStoppedForWriterLock:true,revokedHttp:403,privateDOMCleared:true,grantRestored:true};
    await p.goto(origin+'/parent');await p.getByRole('button',{name:'退出',exact:true}).click();
  });
}finally{
  const after=learningSnapshot();if(JSON.stringify(after)!==JSON.stringify(before))failed=true;
  writeFileSync(dir+'/browser-results.json',JSON.stringify({status:failed?'FAIL':'PASS',sourceSha:plan.sourceSha,runId:plan.runId,imageId:state.imageId,
    strictTLS:true,profileOnlyCA:true,physicalDevices:'NEEDS_USER_ACTION',build:manifest,learningBefore:before,learningAfter:after,results,screenshots,observations},null,2)+'\n');
  if(failed){
    // Stop only ID+label+image verified new resources, keep diagnostics and data.
    const {execFileSync}=await import('node:child_process');
    execFileSync('python3',['infra/math-trial/controller.py','stop'],{stdio:['ignore','pipe','ignore']});
    process.exitCode=1;
  }
}
console.log(JSON.stringify({status:failed?'FAIL':'PASS',cases:results.length,passed:results.filter(x=>x.status==='PASS').length}));
