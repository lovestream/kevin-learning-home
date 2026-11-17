// Browser-only synthetic fixtures and deterministic server clock offset; no real records.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {chromium,expect} from '@playwright/test';
import {startPreview} from '../../apps/preview/server.ts';
import {fixture} from './fixture.ts';
const f=await fixture(), originalNow=performance.now.bind(performance), previousNow=Object.getOwnPropertyDescriptor(performance,'now');let clockOffset=0;
Object.defineProperty(performance,'now',{value:()=>originalNow()+clockOffset,configurable:true});
for(const [i,word] of ['robot','basket'].entries())f.content.cards.set('pk-extra-'+i,{...f.content.bundle.cards[0],id:'pk-extra-'+i,word,zh:['机器人','篮子'][i],en:'An object for this synthetic test.',spellingVariants:[],semanticAlternatives:[]});
const server=await startPreview({enabled:true,port:0,englishContent:f.content});
const origin='http://127.0.0.1:'+server.address().port,out='.evidence/english/pk';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch(),results=[],errors=[];
try{
for(const width of [390,768,1280]){
 const context=await browser.newContext({viewport:{width,height:960},reducedMotion:'reduce',hasTouch:width<=768}),page=await context.newPage();
 page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));
 await context.addInitScript(()=>{Object.defineProperty(Crypto.prototype,'randomUUID',{value:undefined,configurable:true});Object.defineProperty(Crypto.prototype,'subtle',{get:()=>undefined,configurable:true});});
 await context.tracing.start({screenshots:true,snapshots:true});
 const arena=page.getByRole('region',{name:'本局拼写'}),result=page.locator('[data-pk-result]');
 const fit=async()=>assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'PK_OVERFLOW_'+width);
 let latest;
 page.on('response',async r=>{if(r.url().endsWith('/english/training')&&r.ok()){const x=await r.json().catch(()=>null);if(x?.pk)latest=x;}});
 try{
  await page.goto(origin+'/subjects/english?view=pk');await expect(page.getByRole('heading',{name:'和闪电狐拼一局'})).toBeVisible();await fit();
  await page.getByRole('button',{name:'开始 45 秒挑战',exact:true}).click();await expect(arena).toBeVisible();
  await expect(arena.getByRole('button',{name:'听读音',exact:true})).toHaveCount(0);
  assert.equal(latest.pk.review,undefined);assert.equal(latest.total,5);
  await fit();if(width===1280){const box=await arena.getByLabel('输入完整英文单词',{exact:true}).boundingBox();assert(box.y+box.height<=960,'desktop input must stay in the first screen');}await page.screenshot({path:out+'/game-'+width+'.png',fullPage:true});
  const correct=async()=>{
    const clue=(await page.locator('.english-pk-clue').textContent()).trim();
    const card=[...f.content.cards.values()].find(c=>c.zh===clue);assert(card,'fixture clue must identify a card');return card.word;
  };
  const input=arena.getByLabel('输入完整英文单词',{exact:true});
  await input.fill('wrongfirst');await input.press('Enter');await expect(arena).toContainText('这次拼写还不对');
  let dropped=false;
  await page.route('**/preview-api/v1/english/training',async route=>{
    const body=route.request().postDataJSON();
    if(body.action==='answer'&&!dropped){dropped=true;await route.fetch();await route.abort('failed');}
    else await route.continue();
  });
  const first=await correct();await input.fill(first);await input.press('Enter');
  await expect(page.getByRole('alert')).toContainText('点击重试会核对同一次提交');await expect(input).toHaveValue(first);
  await arena.getByRole('button',{name:'重试这次提交',exact:true}).click();await expect(arena).toContainText('第 2 / 5 个词');
  await page.unroute('**/preview-api/v1/english/training');
  for(let i=1;i<5;i++){
    await input.fill(await correct());await input.press('Enter');
    if(i<4) await expect(arena).toContainText('第 '+(i+2)+' / 5 个词');
  }
  await expect(result).toBeVisible();await expect(result).toContainText('Kevin 500 分');await expect(result).toContainText('你的首答：wrongfirst');await expect(result).toContainText('已自主订正');
  assert.equal(latest.evidence.length,6);assert(latest.evidence.every(e=>!e.rewardEligible&&e.source==='pk'));
  await fit();await page.screenshot({path:out+'/result-'+width+'.png',fullPage:true});
  await result.getByRole('button',{name:'再来一局',exact:true}).click();await expect(arena).toBeVisible();
  clockOffset+=45001;
  await expect(result).toBeVisible();await expect(result).toContainText('45 秒到了');await expect(result).toContainText('Kevin 0 分');
  await expect(result.getByText('本局未作答',{exact:true})).toHaveCount(5);assert.equal(latest.evidence.length,0);
  await page.screenshot({path:out+'/time-up-'+width+'.png',fullPage:true});
  await result.getByRole('button',{name:'返回比赛准备',exact:true}).click();await page.getByRole('button',{name:'开始 45 秒挑战',exact:true}).click();await expect(arena).toBeVisible();
  await arena.getByRole('button',{name:'退出本局，慢慢练习',exact:true}).click();await expect(page.getByRole('button',{name:'开始 45 秒挑战',exact:true})).toBeVisible();
  if(width===1280){
    let releaseTick, signalTick, signalTickDelivered;
    const tickGate=new Promise(r=>{releaseTick=r;}),tickSeen=new Promise(r=>{signalTick=r;}),tickDelivered=new Promise(r=>{signalTickDelivered=r;});
    let held=false;
    await page.route('**/preview-api/v1/english/training',async route=>{
      const body=route.request().postDataJSON();
      if(body.action==='pk-tick'&&!held){held=true;signalTick();await tickGate;const response=await route.fetch();await route.fulfill({response});signalTickDelivered();}
      else if(body.action==='answer'){
        const response=await route.fetch();releaseTick();await tickDelivered;
        await expect(arena).toContainText('第 2 / 5 个词');
        await route.fulfill({response});
      }else await route.continue();
    });
    await page.getByRole('button',{name:'开始 45 秒挑战',exact:true}).click();await expect(arena).toBeVisible();await expect.poll(()=>held).toBe(true);
    await input.fill(await correct());await input.press('Enter');await expect(input).toHaveValue('');await expect(arena).toContainText('第 2 / 5 个词');
    await page.unroute('**/preview-api/v1/english/training');
    await page.getByRole('navigation',{name:'英语活动'}).getByRole('link',{name:'本次回顾',exact:true}).click();
    await expect(page.locator('.english-page')).toContainText('完整拼写首答 6 次，无辅助首答正确 5 次');
    await page.goto(origin+'/subjects/english?view=pk');
  }
  await page.reload();await expect(arena).toHaveCount(0);assert.deepEqual(await page.evaluate(()=>[localStorage.length,sessionStorage.length]),[0,0]);
  results.push({width,fiveUniqueTasks:true,wrongThenCorrect:true,committedResponseLostRetry:true,serverTimeoutNoNewAttempt:true,resultSeparatesFirstAnswer:true,staleTickCannotDiscardImmutableAnswer:width===1280,noHelp:true,noPersistentState:true,keyboard:true});
 }catch(e){await page.screenshot({path:out+'/failure-'+width+'.png',fullPage:true});throw e;}
 finally{await context.tracing.stop({path:out+'/trace-'+width+'.zip'});await context.close();}
}
assert.deepEqual(errors,[]);fs.writeFileSync(out+'/report.json',JSON.stringify({status:'PASS',results,realRecordsRead:false,rewardsIssued:0},null,2));console.log(JSON.stringify({status:'PASS',flows:results.length,widths:results.map(x=>x.width)}));
}finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));f.cleanup();if(previousNow)Object.defineProperty(performance,'now',previousNow);else delete performance.now;}
