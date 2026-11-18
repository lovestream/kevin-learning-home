// Exact compiled source / NAS shared entry. Does not read a personal pack or record.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {chromium,expect} from '@playwright/test';
import {startPreview} from '../../apps/preview/server.ts';
import {loadEnglish} from '../../packages/english/content.ts';
import {sprintBatches} from '../../packages/english/sprint.ts';
const nas=process.argv.includes('--nas'),content=loadEnglish(process.cwd());if(!content)throw Error('SOURCE_REQUIRED');
const target=process.env.KLH_PREVIEW_TEST_ORIGIN,sha=process.env.KLH_PREVIEW_EXPECT_SHA;
if(nas&&(target!=='http://192.168.2.100:38444'||!(/^[a-f0-9]{40}$/.test(sha||''))))throw Error('EXACT_NAS_REQUIRED');
const server=nas?null:await startPreview({enabled:true,port:0}),origin=nas?target:'http://127.0.0.1:'+server.address().port;
const out='.evidence/english/extras-'+(nas?'nas':'family');fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch(),results=[],errors=[];
try{
 const api=await browser.newContext();const runtime=await api.request.get(origin+'/preview-api/v1/runtime').then(r=>r.json());if(nas)assert.equal(runtime.buildSha,sha);assert.equal(runtime.database,false);
 let batchCount=0;
 for(const bank of content.catalog.banks){const actual=await api.request.get(origin+'/preview-api/v1/english/sprint?bank='+bank.id).then(r=>r.json());const expected=content.sprint(bank.id);assert.deepEqual(actual,expected);assert.equal(actual.reduce((n,b)=>n+b.count,0),bank.count);assert(!JSON.stringify(actual).includes('wordIds'));batchCount+=actual.length;}
 await api.close();assert.equal(batchCount,224);
 const batches=sprintBatches([...content.cards.values()],'ket'),words=batches.at(-1).wordIds.map(id=>content.card(id).word);
 for(const width of [390,768,1280]){
  const context=await browser.newContext({viewport:{width,height:960},hasTouch:width<=768,reducedMotion:'reduce'}),page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
  await context.tracing.start({screenshots:true,snapshots:true});
  try{
   await page.goto(origin+'/subjects/english?view=sprint');await page.getByLabel('冲刺词库').selectOption('ket');await page.getByLabel('选择词表批次').selectOption(String(batches.length));await page.getByRole('button',{name:`开始这批冲刺（${words.length}词）`}).click();
   const q=page.locator('[data-english-quiz]'),result=page.locator('[data-english-result]');
   for(const phase of ['cloze','full','final']){
    if(phase==='final'){await expect(q.getByRole('button',{name:'听读音',exact:true})).toHaveCount(0);await expect(q.getByRole('button',{name:'看参考后再练'})).toHaveCount(0);}
    for(let i=0;i<words.length;i++){await q.getByRole('textbox').fill(words[i]);await q.getByRole('button',{name:'确认这次答案'}).click();await q.getByRole('button',{name:i===words.length-1?'查看本次结果':'下一题',exact:true}).click();}
    if(phase!=='final')await result.getByRole('button',{name:phase==='cloze'?'继续完整拼写':'继续整组复测',exact:true}).click();
   }
   await expect(result).toContainText('整组复测首答全部正确');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:out+'/sprint-complete-'+width+'.png',fullPage:true});
   await page.getByRole('link',{name:'我的生词本',exact:true}).first().click();await page.getByRole('button',{name:'手动加一个词'}).click();await page.getByLabel('英文单词或短语',{exact:true}).fill('robot');await page.getByLabel('英文释义',{exact:true}).fill('A machine that can do jobs.');await page.getByLabel('英文例句',{exact:true}).fill('The robot can help.');await page.getByRole('button',{name:'先看词卡预览'}).click();await page.getByRole('button',{name:'确认保存到本次生词本'}).click();await expect(page.locator('.english-custom-list')).toContainText('robot');
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:out+'/mywords-'+width+'.png',fullPage:true});assert.deepEqual(await page.evaluate(()=>[localStorage.length,sessionStorage.length]),[0,0]);await page.reload();await expect(page.locator('.english-custom-list article')).toHaveCount(0);
   results.push({width,batch:batches.length,words:words.length,phases:3,finalClean:true,localMyWords:true,refreshClears:true});
  }catch(e){await page.screenshot({path:out+'/failure-'+width+'.png',fullPage:true});throw e;}
  finally{await context.tracing.stop({path:out+'/trace-'+width+'.zip'});await context.close();}
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(out+'/report.json',JSON.stringify({status:'PASS',buildSha:runtime.buildSha,batchCount,nas,results,realRecordsRead:false,rewardsIssued:0},null,2));console.log(JSON.stringify({status:'PASS',buildSha:runtime.buildSha,nas,batchCount,flows:results.length}));
}finally{await browser.close();if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}}
