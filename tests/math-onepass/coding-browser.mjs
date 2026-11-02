// Real frontend + content-only backend, including live NAS. No intercepts or learner records.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {chromium,expect} from '@playwright/test';
import {startPreview} from '../../apps/preview/server.ts';
import {loadPractice} from '../../apps/preview/practice/service.ts';
import {checksDefault} from '../../apps/preview/practice/contract.ts';
import {codingQuiz} from '../../apps/preview/adapters/source/shared/coding-model.mjs';
import {firstAnswer,submission} from '../math-full-02/helpers.mjs';
import {runtimeInputs} from './inputs.mjs';
const nas=process.argv.includes('--nas'),target=process.env.KLH_PREVIEW_TEST_ORIGIN,expected=process.env.KLH_PREVIEW_EXPECT_SHA;
if(nas&&(target!=='http://192.168.2.100:38444'||!/^[a-f0-9]{40}$/.test(expected??'')))throw Error('EXPLICIT_NAS_SHA_REQUIRED');if(!nas&&target)throw Error('NAS_MODE_REQUIRED');
const id='G3-UP02-B01',server=nas?null:await startPreview({enabled:true,port:0}),origin=nas?target:'http://127.0.0.1:'+server.address().port,browser=await chromium.launch(),dir='.evidence/math-onepass/'+(nas?'coding-nas':'coding-local');fs.mkdirSync(dir,{recursive:true});
const bank=loadPractice(process.cwd()),results=[],errors=[],execution={files:runtimeInputs()};
async function noOverflow(page,name){assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),name);}
async function shot(page,name){await noOverflow(page,name);await page.screenshot({path:dir+'/'+name+'.png',fullPage:true});}
try{
 for(const width of [1440,1280,768,390,360]){
  const ctx=await browser.newContext({viewport:{width,height:960},reducedMotion:'reduce',hasTouch:width<1000}),page=await ctx.newPage();page.on('pageerror',e=>errors.push(String(e)));page.setDefaultTimeout(15000);
  if(nas)assert.equal((await(await ctx.request.get(origin+'/preview-api/v1/runtime')).json()).buildSha,expected);
  const dto=await(await ctx.request.get(origin+'/preview-api/v1/lessons/'+id)).json();assert.equal(dto.contentVersion,'2026-11-01.2');
  const pub=await(await ctx.request.get(origin+'/preview-api/v1/practice/lessons/'+id)).json();assert.equal(pub.contentVersion,'2026-11-01.2');assert(!JSON.stringify(pub).includes('"solution"'));assert(!JSON.stringify(pub).includes('"expected"'));
  await page.goto(origin+'/subjects/math/lessons/'+id);await page.locator('[data-lesson-id="'+id+'"]').waitFor();
  const steps=page.locator('.classroom-route button');assert.equal(await steps.count(),6);
  for(const step of [0,1]){await steps.nth(step).click();const overview=page.getByRole('group',{name:'四种编码的条件示意'});await expect(overview).toBeVisible();assert.equal(await overview.locator('article').count(),4);await shot(page,'coding-conditions-'+step+'-'+width);}
  await steps.nth(2).click();const lab=page.locator('[aria-label="数字编码主题实验室"]');await expect(lab).toBeVisible();
  assert(await lab.evaluate(el=>!!(el.compareDocumentPosition(document.querySelector('[data-textbook-model="coding"] .code-fields'))&Node.DOCUMENT_POSITION_FOLLOWING)),'new lab before preserved shelf');
  const identity=lab.getByRole('region',{name:'身份证结构学习'}); // section has explicit accessible name
  for(let i=0;i<8;i++){await lab.locator('.coding-id-parts button').nth(i).click();await expect(lab.locator('.coding-detail strong')).toContainText(['第1','第3','第5','第7','第11','第13','第15','第18'][i]);}
  await lab.getByRole('button',{name:'004',exact:true}).click();await expect(lab.locator('.coding-example')).toContainText('偶数，按规则对应女性');await shot(page,'coding-identity-'+width);
  await lab.getByRole('button',{name:'邮政编码6位',exact:true}).click();for(let i=0;i<4;i++){await lab.locator('.coding-postal button').nth(i).click();await expect(lab.locator('.coding-detail')).toBeVisible();}await expect(lab.locator('.coding-two-cards')).toContainText('不是同一套规则');await shot(page,'coding-postal-'+width);
  await lab.getByRole('button',{name:'自己设计学号',exact:true}).click();const selectedTopic=lab.getByRole('button',{name:'自己设计学号',exact:true});await selectedTopic.hover();await expect(selectedTopic).toHaveCSS('background-color','rgb(30, 88, 97)');await expect(selectedTopic).toHaveCSS('color','rgb(255, 255, 255)');await expect(lab.locator('.coding-code-preview')).toHaveText('03-02-07');await lab.getByLabel('班级',{exact:true}).selectOption('1');await expect(lab.locator('.coding-code-preview')).toHaveText('03-01-07');await lab.getByLabel('年级',{exact:true}).selectOption('6');await expect(lab.locator('.coding-detail')).toContainText('完成小学');assert(!await lab.locator('.coding-detail').innerText().then(t=>t.includes('07-01-07')));
  await lab.getByRole('button',{name:'长期校内编号',exact:true}).click();await lab.getByLabel('该入学年校内唯一流水号',{exact:true}).selectOption('9999');await expect(lab.locator('.coding-code-preview')).toHaveText('2024-9999');await lab.getByLabel('入学年份',{exact:true}).selectOption('2026');await expect(lab.locator('.coding-code-preview')).toHaveText('2026-9999');await expect(lab.locator('.coding-detail')).toContainText('不能每换一个班');await lab.locator('textarea').fill('虚构两个班同号，用校内唯一流水号区分。');await shot(page,'coding-student-'+width);
  await lab.getByRole('button',{name:'综合辨错',exact:true}).click();for(let i=0;i<5;i++){const box=lab.locator('.coding-quiz').nth(i);await box.locator('button').nth((codingQuiz[i].correct+1)%3).click();await expect(box.locator('.coding-quiz-wrong')).toBeVisible();await box.locator('button').nth(codingQuiz[i].correct).click();await expect(box.locator('.coding-quiz-right')).toBeVisible();}await shot(page,'coding-quiz-'+width);await lab.getByRole('button',{name:'清空本页练习，重新思考'}).click();assert.equal(await lab.locator('.coding-quiz-right,.coding-quiz-wrong').count(),0);
  const small=await lab.locator('button').evaluateAll(xs=>xs.filter(x=>x.getBoundingClientRect().width&&x.getBoundingClientRect().height<43.5).map(x=>({text:x.textContent,h:x.getBoundingClientRect().height})));assert.deepEqual(small,[],'44px teaching controls');
  for(const s of [3,4,5]){await steps.nth(s).click();await noOverflow(page,'step'+s);}
  // Every revised formal exercise completes first attempt -> self-check -> final, at each width.
  for(const [group,tasks] of Object.entries(bank.lessons.get(id).taskSets)){
   await page.locator('[data-practice-group="'+group+'"]').click();
   for(const t of tasks){await page.locator('[data-practice-task="'+t.id+'"]').click();assert.equal(await page.locator('[data-grade-status]').count(),0);const privateTask=bank.tasks.get(t.id).task,a=firstAnswer(privateTask);
    if(t.kind==='choice'){const i=t.options.findIndex(o=>o.id===a.value);await page.locator('.practice-answer input[name="'+t.id+'-value"]').nth(i).check();}else await page.getByRole('textbox',{name:t.kind==='explanation'?'我的解释':'我的答案',exact:true}).fill(a.value);
    await page.getByRole('button',{name:'完成首答，开始自查',exact:true}).click();const submit=page.getByRole('button',{name:'提交最终答案',exact:true});await expect(submit).toBeDisabled();for(const c of t.selfCheckItems??checksDefault)await page.getByRole('checkbox',{name:c,exact:true}).check();await submit.click();await expect(page.locator('[data-grade-status]')).toHaveAttribute('data-grade-status',t.kind==='explanation'?'pendingReview':'correct');
   }
  }
  await page.reload();await page.locator('.classroom-route button').nth(2).click();await page.getByRole('button',{name:'自己设计学号',exact:true}).click();await expect(page.locator('#coding-reflection')).toHaveValue('');
  assert.deepEqual(await page.evaluate(async()=>({local:localStorage.length,session:sessionStorage.length,idb:await indexedDB.databases()})),{local:0,session:0,idb:[]});assert.deepEqual(await ctx.cookies(),[]);await noOverflow(page,'refresh');
  // All12 HTTP paths plus stale-version rejection, on actual backend.
  for(const row of [...bank.tasks.values()].filter(x=>x.lessonId===id)){const r=await ctx.request.post(origin+'/preview-api/v1/practice/grade',{data:submission(row)});assert.equal(r.status(),200);const out=await r.json();assert.equal(out.persisted,false);assert.equal(out.status,row.task.kind==='explanation'?'pendingReview':'correct');const stale=await ctx.request.post(origin+'/preview-api/v1/practice/grade',{data:{...submission(row),contentVersion:'2026-10-09.4'}});assert(stale.status()>=400);}
  results.push({width,conditions:4,sixSteps:true,identitySegments:8,postalSegments:4,studentBoundaries:true,selectedHoverContrast:true,quiz:5,formalFirstSelfFinal:12,staleVersionRejected:12,persistentEntries:0,overflow:false,pass:true});await ctx.close();
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(dir+'/browser.json',JSON.stringify({status:'PASS',nas,origin,sourceSha:nas?expected:null,contentVersion:'2026-11-01.2',execution,results,errors,physicalDevices:'NEEDS_USER_ACTION'},null,2)+'\n');console.log(JSON.stringify({status:'PASS',nas,widths:5,formalFlows:60,sourceVersion:'2026-11-01.2'}));
}finally{await browser.close();if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}}
