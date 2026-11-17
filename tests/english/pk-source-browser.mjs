// Original frozen family content only, never personal words or real learner records.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {chromium,expect} from '@playwright/test';
import {startPreview} from '../../apps/preview/server.ts';
import {loadEnglish} from '../../packages/english/content.ts';
import {englishQuizClue} from '../../packages/english/training.ts';
const nas=process.argv.includes('--nas'),content=loadEnglish(process.cwd());if(!content)throw Error('SOURCE_REQUIRED');
const target=process.env.KLH_PREVIEW_TEST_ORIGIN,sha=process.env.KLH_PREVIEW_EXPECT_SHA;
if(nas&&(target!=='http://192.168.2.100:38444'||!(/^[a-f0-9]{40}$/.test(sha||''))))throw Error('EXACT_NAS_REQUIRED');
const server=nas?null:await startPreview({enabled:true,port:0}),origin=nas?target:'http://127.0.0.1:'+server.address().port;
const out='.evidence/english/pk-'+(nas?'nas':'family');fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch(),results=[],errors=[];
const oracle=new Map();for(const c of content.cards.values()){
 const key=JSON.stringify([c.bankId,englishQuizClue(c),c.image]);const a=oracle.get(key)??[];a.push(c);oracle.set(key,a);
}
try{
 const api=await browser.newContext();const runtime=await api.request.get(origin+'/preview-api/v1/runtime').then(r=>r.json());if(nas)assert.equal(runtime.buildSha,sha);assert.equal(runtime.database,false);await api.close();
 for(const width of [390,768,1280]){
  const context=await browser.newContext({viewport:{width,height:960},hasTouch:width<=768,reducedMotion:'reduce'}),page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));await context.tracing.start({screenshots:true,snapshots:true});
  try{
   await page.goto(origin+'/subjects/english?view=pk');
   const submit=async(name,action)=>{
    const reply=page.waitForResponse(r=>r.url().endsWith('/english/training')&&r.request().method()==='POST'&&r.request().postDataJSON()?.action===action);
    await page.getByRole('button',{name,exact:true}).click();const response=await reply;assert(response.ok());return response.json();
   };
   for(const bank of content.catalog.banks){
    await page.getByLabel('比赛词库').selectOption(bank.id);
    let q=await submit('开始 45 秒挑战','pk-start');assert.equal(q.total,5);assert.equal(q.pk.review,undefined);assert.equal(q.pk.bankId,bank.id);
    const arena=page.getByRole('region',{name:'本局拼写'});await expect(arena).toBeVisible();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    if(q.image)assert(await arena.locator('img').evaluate(async im=>{await im.decode();return im.naturalWidth>0;}));
    if(width===1280)await page.screenshot({path:out+'/game-'+bank.id+'-'+width+'.png',fullPage:true});
    let attempts=0;
    while(!q.done){
     const candidates=oracle.get(JSON.stringify([bank.id,q.clue,q.image]));assert(candidates?.length,'clue and image must match a frozen source card');
     let accepted=false;
     for(const c of candidates){
      await arena.getByLabel('输入完整英文单词',{exact:true}).fill(c.word);
      q=await submit('提交拼写','answer');attempts++;
      assert(q.latestEvidence,'game must not expire before source flow completes');
      const known=content.card(q.latestEvidence.wordId);assert.equal(q.latestEvidence.contentVersion,known.contentVersion);assert.equal(q.latestEvidence.lessonOrUnitId,known.sourceGroupId);assert.equal(q.latestEvidence.rewardEligible,false);
      if(q.latestEvidence.answerCorrect){accepted=true;break;}
     }
     assert(accepted,'a reviewed source spelling must answer its own source clue');
    }
    await expect(page.locator('[data-pk-result]')).toBeVisible();assert.equal(q.pk.score,500);assert.equal(q.pk.review.length,5);assert.equal(new Set(q.pk.review.map(r=>r.wordId)).size,5);assert(q.evidence.every(e=>e.source==='pk'&&!e.rewardEligible));
    results.push({width,bankId:bank.id,words:5,attempts,finished:true,sourceVersionAndUnit:true,noRealRewards:true});
    await page.getByRole('button',{name:'返回比赛准备',exact:true}).click();
   }
   assert.deepEqual(await page.evaluate(()=>[localStorage.length,sessionStorage.length]),[0,0]);
  }catch(e){await page.screenshot({path:out+'/failure-'+width+'.png',fullPage:true});throw e;}
  finally{await context.tracing.stop({path:out+'/trace-'+width+'.zip'});await context.close();}
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(out+'/report.json',JSON.stringify({status:'PASS',buildSha:runtime.buildSha,nas,results,sourceSha:content.catalog.sourceSha,realRecordsRead:false,rewardsIssued:0},null,2));console.log(JSON.stringify({status:'PASS',buildSha:runtime.buildSha,nas,flows:results.length,banks:4,correctResponses:60}));
}finally{await browser.close();if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}}
