import fs from 'node:fs';
import assert from 'node:assert/strict';
import {chromium,expect} from '@playwright/test';
import {loadContent} from '../../apps/preview/content.ts';
import {exercise} from '../../tests/math-full-01/exercise.mjs';
const origin='http://192.168.2.100:38444', expected=process.env.KLH_PREVIEW_EXPECT_SHA;
assert(/^[a-f0-9]{40}$/.test(expected??''));
const runtime=await(await fetch(origin+'/preview-api/v1/runtime')).json();assert.equal(runtime.buildSha,expected);
const {lessons}=loadContent(process.cwd()),lesson=lessons.get('G3-U02-E03').data;
const dir='.evidence/explore/target-checkpoint';fs.mkdirSync(dir,{recursive:true});
const browser=await chromium.launch(),results=[];
try{
 const page=await browser.newPage({viewport:{width:1280,height:900},reducedMotion:'reduce'});
 for(let n=0;n<3;n++){
  await page.goto(origin+'/subjects/math/lessons/G3-U02-E03');
  const article=page.locator('[data-lesson-id="G3-U02-E03"]');await expect(article).toBeVisible();
  await article.locator('.classroom-route button').nth(1).click();
  await article.locator('.prediction-cards button').first().click();
  await article.locator('.classroom-route button').nth(2).click();
  const lab=article.locator('[data-adapter]');await lab.waitFor();
  await exercise(lab,article,lesson);
  const button=article.locator('.classroom-route button').nth(3);
  const before=await button.boundingBox();const start=Date.now();
  try{await button.click();}catch(e){await page.screenshot({path:dir+'/failure-'+n+'.png',fullPage:true});fs.writeFileSync(dir+'/failure.json',JSON.stringify({message:String(e),before,scroll:await page.evaluate(()=>({x:scrollX,y:scrollY,height:document.documentElement.scrollHeight}))},null,2));throw e;}
  await expect(article.locator('.math-step-count')).toHaveText('4 / 6');
  await page.screenshot({path:dir+'/success-'+n+'.png',fullPage:true});results.push({run:n+1,before,clickMs:Date.now()-start,pass:true});
 }
 fs.writeFileSync(dir+'/report.json',JSON.stringify({status:'PASS',sourceSha:expected,lessonId:lesson.lessonId,results},null,2)+'\n');console.log(JSON.stringify({status:'PASS',runs:results.length}));
}finally{await browser.close();}
