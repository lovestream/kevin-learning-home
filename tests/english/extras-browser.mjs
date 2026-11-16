// Synthetic browser fixtures only. No real word packs, records, or learner data.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {chromium,expect} from '@playwright/test';
import {startPreview} from '../../apps/preview/server.ts';
import {fixture} from './fixture.ts';
const f=await fixture(),server=await startPreview({enabled:true,port:0,englishContent:f.content});
const origin='http://127.0.0.1:'+server.address().port,out='.evidence/english/extras';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch(),results=[],errors=[];
try{
for(const width of [390,768,1280]){
 const context=await browser.newContext({viewport:{width,height:960},reducedMotion:'reduce',hasTouch:width<=768}),page=await context.newPage();
 page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));
 await context.addInitScript(()=>{Object.defineProperty(Crypto.prototype,'randomUUID',{value:undefined,configurable:true});Object.defineProperty(Crypto.prototype,'subtle',{get:()=>undefined,configurable:true});});
 await context.tracing.start({screenshots:true,snapshots:true});
 const fit=async()=>assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'OVERFLOW_'+width);
 try{
  await page.goto(origin+'/subjects/english?view=sprint');await page.getByLabel('冲刺词库').selectOption('core2000');
  await expect(page.getByRole('button',{name:'开始这批冲刺（4词）'})).toBeEnabled();await fit();await page.screenshot({path:out+'/sprint-start-'+width+'.png',fullPage:true});
  await page.getByRole('button',{name:'开始这批冲刺（4词）'}).click();
  const q=page.locator('[data-english-quiz]'),result=page.locator('[data-english-result]');
  async function round(words,bad=false){for(let i=0;i<words.length;i++){
    if(bad&&i===0){await q.getByRole('textbox').fill('wrongfirst');await q.getByRole('button',{name:'确认这次答案'}).click();await expect(q).toContainText('首答：wrongfirst');}
    await q.getByRole('textbox').fill(words[i]);await q.getByRole('button',{name:'确认这次答案'}).click();
    await q.getByRole('button',{name:i===words.length-1?'查看本次结果':'下一题',exact:true}).click();
  }await expect(result).toBeVisible();}
  const words=f.content.bundle.cards.map(c=>c.word);
  await round(words);await result.getByRole('button',{name:'继续完整拼写',exact:true}).click();
  await round(words,true);await expect(result).toContainText('3/4');await page.screenshot({path:out+'/wrong-round-'+width+'.png',fullPage:true});
  await result.getByRole('button',{name:'继续错词回练',exact:true}).click();await round([words[0]]);
  await result.getByRole('button',{name:'继续整组复测',exact:true}).click();
  await expect(q.getByRole('button',{name:'听读音',exact:true})).toHaveCount(0);await expect(q.getByRole('button',{name:'看参考后再练'})).toHaveCount(0);
  await fit();await page.screenshot({path:out+'/final-no-hints-'+width+'.png',fullPage:true});
  await round(words);await expect(result).toContainText('整组复测首答全部正确');await fit();
  await page.getByRole('navigation',{name:'英语活动'}).getByRole('link',{name:'我的生词本',exact:true}).click();
  let wordPosts=0;const track=r=>{if(r.method()==='POST')wordPosts++;};page.on('request',track);
  async function create(word,en,source){await page.getByRole('button',{name:'手动加一个词'}).click();await page.getByLabel('英文单词或短语',{exact:true}).fill(word);await page.getByLabel('英文释义',{exact:true}).fill(en);await page.getByLabel('英文例句',{exact:true}).fill('I see a '+word+'.');await page.getByLabel('来自哪本书或哪篇文章').fill(source);await page.getByRole('button',{name:'先看词卡预览'}).click();await page.getByRole('button',{name:'确认保存到本次生词本'}).click();}
  await create('robot','A machine that can do jobs.','Story');await create('book','Pages to read.','School');
  await page.getByLabel('查找生词').fill('robot');await page.getByRole('button',{name:'全选当前结果（1）'}).click();
  await page.getByRole('button',{name:'所选只收藏',exact:true}).click();await page.getByLabel('查找生词').fill('');
  await page.getByLabel('查看范围').selectOption('train');await expect(page.locator('.english-custom-list article')).toHaveCount(1);await expect(page.locator('.english-custom-list')).toContainText('book');
  await page.getByRole('button',{name:'全选当前结果（1）'}).click();await page.getByRole('button',{name:'练习所选词（最多30词）'}).click();
  await q.getByRole('textbox').fill('wrongfirst');await q.getByRole('button',{name:'确认这次答案'}).click();await q.getByRole('textbox').fill('book');await q.getByRole('button',{name:'确认这次答案'}).click();
  await q.getByRole('button',{name:'回到本组词卡',exact:true}).click();await page.getByLabel('查看范围').selectOption('active');
  const book=page.locator('.english-custom-list article').filter({has:page.getByText('book',{exact:true})});await expect(book).toContainText('本次作答 2 次');
  await book.getByRole('button',{name:'编辑',exact:true}).click();await page.getByLabel('英文单词或短语',{exact:true}).fill('books');await page.getByLabel('英文例句',{exact:true}).fill('I read books.');await page.getByRole('button',{name:'先看词卡预览'}).click();await page.getByRole('button',{name:'确认保存到本次生词本'}).click();
  const books=page.locator('.english-custom-list article').filter({has:page.getByText('books',{exact:true})});await expect(books).toContainText('本次旧版本 1 个');await expect(books).toContainText('本次作答 2 次');await books.getByRole('button',{name:'归档这个词'}).click();
  await page.getByLabel('查看范围').selectOption('archived');await expect(page.locator('.english-custom-list')).toContainText('books');await page.getByRole('button',{name:'恢复这个词'}).click();await page.getByLabel('查看范围').selectOption('active');
  await fit();await page.screenshot({path:out+'/mywords-'+width+'.png',fullPage:true});assert.equal(wordPosts,0,'custom words must remain local');page.off('request',track);
  assert.deepEqual(await page.evaluate(()=>[localStorage.length,sessionStorage.length]),[0,0]);await page.reload();await expect(page.locator('.english-custom-list article')).toHaveCount(0);
  await page.goto(origin+'/subjects/english?view=sprint');await page.getByLabel('冲刺词库').selectOption('core2000');await expect(page.locator('[data-english-quiz]')).toHaveCount(0);
  await page.getByRole('link',{name:'生词包',exact:true}).first().click();
  const fixtureImage=fs.readFileSync(f.directory+'/media/'+Object.values(f.content.bundle.media)[0].sha256+'.webp');
  const pack={format:'kevin-word-quest-ai-pack',version:1,title:'Synthetic reading pack',words:[{word:'pencil',ipa:'/test/',lemma:'pencil',partOfSpeech:'n.',definition:'A writing tool.',example:'I use a pencil.',memoryTip:'Draw lines.',spellingChunks:['pen','cil'],image:{dataUrl:'data:image/webp;base64,'+fixtureImage.toString('base64')}}]};
  await page.locator('input[type=file]').setInputFiles({name:'synthetic.wordpack.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(pack))});
  await page.getByRole('button',{name:'把所选词加入我的生词'}).click();await page.getByRole('link',{name:'打开我的生词',exact:true}).click();
  await expect(page.locator('.english-custom-list')).toContainText('pencil');assert(await page.locator('.english-custom-list img').evaluate(async im=>{await im.decode();return im.naturalWidth>0;}),'pack picture must survive source view unmount');
  await page.locator('.english-custom-list').getByRole('button',{name:'编辑',exact:true}).click();await page.getByLabel('英文单词或短语',{exact:true}).fill('pen');await page.getByLabel('英文例句',{exact:true}).fill('I use a pen.');await page.getByRole('button',{name:'先看词卡预览'}).click();await page.getByRole('button',{name:'确认保存到本次生词本'}).click();await expect(page.locator('.english-custom-list img')).toHaveCount(0);
  results.push({width,packTransferAndImageLifetime:true,sprintLifecycle:true,wrongFirst:true,finalNoHelp:true,myWordsLocalOnly:true,filterSelection:true,editHistory:true,archiveRestore:true,refreshClears:true});
 }catch(e){await page.screenshot({path:out+'/failure-'+width+'.png',fullPage:true});throw e;}
 finally{await context.tracing.stop({path:out+'/trace-'+width+'.zip'});await context.close();}
}
assert.deepEqual(errors,[]);fs.writeFileSync(out+'/report.json',JSON.stringify({status:'PASS',results,realRecordsRead:false,rewardsIssued:0},null,2));console.log(JSON.stringify({status:'PASS',flows:results.length,widths:results.map(x=>x.width)}));
}finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));f.cleanup();}
