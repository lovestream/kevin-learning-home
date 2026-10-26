// Actual frontend + backend, original authored fixtures; no response stubs or learning records.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {chromium,expect} from '@playwright/test';
import {startPreview} from '../../apps/preview/server.ts';
import {loadPractice} from '../../apps/preview/practice/service.ts';
import {groups,kinds,checksDefault} from '../../apps/preview/practice/contract.ts';
import {firstAnswer} from './helpers.mjs';
const nas=process.argv.includes('--nas'),target=process.env.KLH_PREVIEW_TEST_ORIGIN,expected=process.env.KLH_PREVIEW_EXPECT_SHA;
if(nas&&(target!=='http://192.168.2.100:38444'||!/^[a-f0-9]{40}$/.test(expected??'')))throw Error('EXPLICIT_NAS_AND_SHA_REQUIRED');
if(!nas&&target)throw Error('NAS_MODE_REQUIRED');
const rows=JSON.parse(fs.readFileSync('docs/implementation/evidence/math-full-02/source.json')).tasks;
const bank=loadPractice(process.cwd()),dir='.evidence/math-full-02/'+(nas?'nas':'local');fs.mkdirSync(dir,{recursive:true});
const server=nas?null:await startPreview({enabled:true,port:0}),origin=nas?target:'http://127.0.0.1:'+server.address().port,browser=await chromium.launch(),results=[],flows=[],errors=[],started=Date.now();
const fileList=['apps/preview/main.tsx','apps/preview/server.ts','apps/preview/preview.css','apps/preview/practice/Practice.tsx','apps/preview/practice/service.ts','apps/preview/practice/contract.ts','apps/preview/practice/private/bank.json','apps/preview/practice/private/pilot-math.mjs','tests/math-full-02/browser.mjs'];
const execution={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),dirty:!!execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim(),files:Object.fromEntries(fileList.map(p=>[p,createHash('sha256').update(fs.readFileSync(p)).digest('hex')]))};
async function open(page,id,group){await page.goto(origin+'/subjects/math/lessons/'+id);await page.locator('[data-lesson-id="'+id+'"]').waitFor();await page.locator('.classroom-route button').nth(5).click();await page.locator('[data-practice-lesson]').waitFor();await page.locator('[data-practice-group="'+group+'"]').click();}
async function input(page,t,a){
 if(t.kind==='choice'){for(const key of ['value',...(t.responseSpec.type==='claim-evidence'?['evidence']:[])]){const options=key==='value'?t.options:t.responseSpec.evidenceOptions;const i=options.findIndex(o=>o.id===a[key]);await page.locator('.practice-answer input[name="'+t.id+'-'+key+'"]').nth(i).check();}}
 else if(t.kind==='explanation'){const e=page.getByRole('textbox',{name:'我的解释'});await e.focus();await e.dispatchEvent('compositionstart',{data:''});await e.fill(a.value);await e.dispatchEvent('compositionend',{data:a.value});}
 else for(const f of t.fields??[{key:'value',label:t.kind==='expression'?'我的算式':'我的答案'}])await page.getByRole('textbox',{name:f.label,exact:true}).fill(a[f.key]);
}
try{
 for(const width of [390,768,1280]){
  const context=await browser.newContext({viewport:{width,height:900},hasTouch:width<1000,reducedMotion:'reduce'}),page=await context.newPage(),writes=[],external=[],reached=[];
  page.on('pageerror',e=>errors.push({width,error:String(e)}));page.on('request',r=>{if(!['GET','HEAD'].includes(r.method()))writes.push({path:new URL(r.url()).pathname,method:r.method()});if(new URL(r.url()).origin!==origin)external.push(r.url());});
  await page.addInitScript(()=>{window.__csp=[];document.addEventListener('securitypolicyviolation',e=>window.__csp.push(e.violatedDirective));});
  if(nas){const runtime=await(await context.request.get(origin+'/preview-api/v1/runtime')).json();assert.equal(runtime.buildSha,expected);assert.equal(runtime.practiceTasks,849);}
  // Every lesson and every ordered task ID is reachable from the actual five-group DOM.
  for(const lesson of bank.lessons.values()){
   await open(page,lesson.lessonId,'warmup');
   for(const group of groups){await page.locator('[data-practice-group="'+group+'"]').click();const ids=await page.locator('[data-practice-task]').evaluateAll(xs=>xs.map(x=>x.dataset.practiceTask));assert.deepEqual(ids,lesson.taskSets[group].map(t=>t.id));reached.push(...ids);}
  }
  assert.equal(reached.length,849);assert.equal(new Set(reached).size,849);
  const selected=new Map();for(const row of bank.tasks.values()){const r=rows.find(x=>x.taskId===row.task.id);const key=r.group+':'+row.task.kind;if(!selected.has(key))selected.set(key,{...row,group:r.group});if(row.task.responseSpec.type==='claim-evidence'&&!selected.has('claim-evidence'))selected.set('claim-evidence',{...row,group:r.group});if(['fraction','joined-perimeters','measurement'].includes(row.task.diagram?.type)&&!selected.has(row.task.diagram.type))selected.set(row.task.diagram.type,{...row,group:r.group});}
  for(const [key,row] of selected){
   const t=row.task;await open(page,row.lessonId,row.group);await page.locator('[data-practice-task="'+t.id+'"]').click();await expect(page.locator('[data-task-id]')).toHaveAttribute('data-task-id',t.id);assert.equal(await page.getByText('查看参考过程与检查依据',{exact:true}).count(),0);
   const a=firstAnswer(t);await input(page,t,a);await page.getByRole('button',{name:'完成首答，开始自查',exact:true}).click();const submit=page.getByRole('button',{name:'提交最终答案',exact:true});await expect(submit).toBeDisabled();
   for(const c of t.selfCheckItems??checksDefault)await page.getByRole('checkbox',{name:c,exact:true}).check();await expect(submit).toBeEnabled();await submit.click();await expect(page.locator('[data-grade-status]')).toHaveAttribute('data-grade-status',t.kind==='explanation'?'pendingReview':'correct');
   // Corrections are real inputs after final feedback; deterministic tasks get a wrong retry too.
   if(t.kind==='choice'){const wrong=t.options.find(o=>o.id!==t.expected);await input(page,t,{...a,value:wrong.id});await submit.click();await expect(page.locator('[data-grade-status]')).toHaveAttribute('data-grade-status','incorrect');await input(page,t,a);await submit.click();await expect(page.locator('[data-grade-status]')).toHaveAttribute('data-grade-status','correct');}
   if(t.kind!=='choice'&&t.kind!=='explanation'){
    const f=t.fields?.[0]??{key:'value',label:t.kind==='expression'?'我的算式':'我的答案'};await page.getByRole('textbox',{name:f.label,exact:true}).fill('invalid');await submit.click();await expect(page.locator('[data-grade-status]')).toHaveAttribute('data-grade-status','invalidInput');await input(page,t,a);await submit.click();await expect(page.locator('[data-grade-status]')).toHaveAttribute('data-grade-status','correct');
   }
   await page.getByText('查看参考过程与检查依据',{exact:true}).click();if(key.endsWith(':explanation')||key==='claim-evidence'||key.endsWith(':fields'))await page.screenshot({path:dir+'/'+key.replace(':','-')+'-'+width+'.png',fullPage:true});
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'HORIZONTAL_OVERFLOW');
   await page.getByRole('button',{name:'重做本题',exact:true}).click();assert.equal(await page.locator('[data-grade-status]').count(),0);await expect(page.getByRole('button',{name:'完成首答，开始自查',exact:true})).toBeDisabled();flows.push({width,key,taskId:t.id,kind:t.kind,group:row.group,firstSelfCheckFinal:true,correction:true,reset:true,status:t.kind==='explanation'?'pendingReview':'correct'});
  }
  // Refresh clears answers; keyboard is preserved on group changes; no browser persistence/cookies.
  const row=bank.tasks.values().find(x=>x.task.kind==='explanation');await open(page,row.lessonId,'warmup');const l=bank.lessons.get(row.lessonId),g=groups.find(g=>l.taskSets[g].some(t=>t.id===row.task.id));await page.locator('[data-practice-group="'+g+'"]').click();await page.locator('[data-practice-task="'+row.task.id+'"]').click();await input(page,row.task,firstAnswer(row.task));await page.reload();await page.locator('.classroom-route button').nth(5).click();await page.locator('[data-practice-lesson]').waitFor();await page.locator('[data-practice-group="'+g+'"]').click();await page.locator('[data-practice-task="'+row.task.id+'"]').click();await expect(page.getByRole('textbox',{name:'我的解释'})).toHaveValue('');
  const persistence=await page.evaluate(async()=>({local:localStorage.length,session:sessionStorage.length,idb:await indexedDB.databases(),cache:typeof caches==='undefined'?[]:await caches.keys(),sw:'serviceWorker'in navigator?await navigator.serviceWorker.getRegistrations().then(x=>x.length):0,csp:window.__csp}));assert.deepEqual(persistence,{local:0,session:0,idb:[],cache:[],sw:0,csp:[]});assert.deepEqual(await context.cookies(),[]);assert.deepEqual(external,[]);assert(writes.every(x=>x.method==='POST'&&x.path==='/preview-api/v1/practice/grade'));
  const keyboard=page.locator('[data-practice-group="review"]');await keyboard.focus();await page.keyboard.press('Enter');await expect(page.locator('.practice-panel h3')).toBeFocused();results.push({width,lessons:70,tasks:849,unique:849,flows:[...selected.keys()],onlyStatelessGradePOST:true,persistentEntries:0,refreshClears:true,keyboard:true,pass:true});await context.close();
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(dir+'/browser.json',JSON.stringify({status:'PASS',origin,nas,execution,elapsedMs:Date.now()-started,results,flows,errors,physicalIPhoneIPad:'NEEDS_USER_ACTION'},null,2)+'\n');console.log(JSON.stringify({status:'PASS',nas,viewports:3,tasksPerViewport:849,completeFlows:flows.length,elapsedMs:Date.now()-started}));
}finally{await browser.close();if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}}
