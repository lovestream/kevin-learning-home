// Actual family gateway, SQLite, image worker and Chromium; no request mocks.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { chromium,expect } from "@playwright/test";
import sharp from "sharp";
import { startFamily } from "../../apps/family/server.ts";
process.env.NODE_ENV="test";
const password="Synthetic browser parent phrase 2026!",root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),"klh-family-browser-"))),out=".evidence/records/browser";
fs.mkdirSync(out,{recursive:true});
const app=await startFamily({directory:path.join(root,"records"),synthetic:true});
await app.records.access.setup("synthetic-parent",password,"合成学习者");
const browser=await chromium.launch(),rows=[],errors=[];
const login=async page=>{
  await page.goto(app.origin+"/parent");await page.getByLabel("家长账号",{exact:true}).fill("synthetic-parent");await page.getByLabel("家长密码",{exact:true}).fill(password);await page.getByRole("button",{name:"家长登录",exact:true}).click();await expect(page.getByRole("heading",{name:"看看想法怎样慢慢长出来"})).toBeVisible();
};
const enroll=async page=>{await login(page);await page.getByRole("button",{name:"允许这台设备学习"}).click();await expect(page.getByRole("status")).toContainText("这台设备已获允许");await page.getByRole("button",{name:"退出家长查看"}).click();await page.goto(app.origin+"/explore");await expect(page.getByRole("heading",{name:"今天，你好奇什么？"})).toBeVisible();};
try {
  for(const width of [360,390,768,1280,1440]) {
    const context=await browser.newContext({viewport:{width,height:960},reducedMotion:"reduce"}),page=await context.newPage();page.setDefaultTimeout(12000);
    page.on("pageerror",e=>errors.push(e.message));const external=[];page.on("request",r=>{if(new URL(r.url()).origin!==app.origin)external.push(r.url());});
    await page.goto(app.origin+"/explore");await expect(page.getByRole("heading",{name:"请家长允许这台设备"})).toBeVisible();assert.equal(await page.locator('input[type="password"]').count(),0);
    await enroll(page);
    const question=`合成探索 ${width}：纸桥换一种折法会怎样？`;
    await page.getByLabel("我想弄明白的问题",{exact:true}).fill(question);await page.getByRole("button",{name:"先留下这个问题"}).click();
    await expect(page.getByRole("heading",{name:question,exact:true})).toBeVisible();const url=page.url();
    await page.getByLabel("我的第一种想法",{exact:true}).fill("合成首猜：折起来可能更能承重，先观察再判断。");await page.getByRole("button",{name:"保存在家园",exact:true}).click();await expect(page.getByRole("status").filter({hasText:"已保存在家园"})).toBeVisible();
    await page.reload();await expect(page.locator(".first-thought")).toContainText("合成首猜");
    const png=await sharp({create:{width:32,height:20,channels:3,background:"#f6c848"}}).png().toBuffer();
    await page.getByLabel("选择照片",{exact:true}).setInputFiles({name:"synthetic.png",mimeType:"image/png",buffer:png});await expect(page.locator(".media-gallery img")).toHaveCount(1);
    await page.getByRole("button",{name:"观察与证据",exact:true}).click();await page.getByLabel("观察事实或资料原意",{exact:true}).fill("合成观察：纸桥折过以后形状发生变化，尚未证明更牢固。");await page.getByRole("button",{name:"保存在家园",exact:true}).click();await expect(page.getByRole("status").filter({hasText:"已保存在家园"})).toBeVisible();
    await page.getByRole("button",{name:"过程回看",exact:true}).click();await expect(page.locator(".explore-workbench")).toContainText("纸桥折过以后");
    await page.screenshot({path:out+`/project-${width}.png`,fullPage:true});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    assert.equal(await page.evaluate(()=>localStorage.length+sessionStorage.length),0);assert.equal(external.length,0);
    const projectId=new URL(url).searchParams.get("id");
    // Parent review polling must retain an active >10s comment and actual focus.
    await login(page);const panel=page.locator(".parent-project").filter({has:page.getByRole("heading",{name:question,exact:true})});
    const comment=panel.getByLabel("给孩子一个开放的问题",{exact:true});await comment.fill("合成家长建议：还可以怎样只改一个条件？");await comment.focus();
    await page.waitForTimeout(11000);await expect(comment).toHaveValue("合成家长建议：还可以怎样只改一个条件？");await expect(comment).toBeFocused();
    await panel.getByRole("button",{name:"留下家长建议"}).click();await expect(panel).toContainText("合成家长建议：还可以怎样只改一个条件？");
    await page.screenshot({path:out+`/parent-${width}.png`,fullPage:true});
    // A second authorized browser sees the same SQLite history, not browser storage.
    const other=await browser.newContext({viewport:{width,height:960}}),otherPage=await other.newPage();await enroll(otherPage);await otherPage.goto(url);await expect(otherPage.locator(".first-thought")).toContainText("合成首猜");
    await otherPage.getByRole("button",{name:"过程回看",exact:true}).click();await expect(otherPage.locator(".explore-workbench")).toContainText("合成家长建议");
    await page.getByText("家庭备份与设备管理",{exact:true}).click();
    page.once("dialog",d=>d.accept());await page.getByRole("button",{name:"撤销学习设备授权"}).click();await expect(otherPage.getByRole("heading",{name:"请家长允许这台设备"})).toBeVisible({timeout:10000});assert.equal(await otherPage.locator(".first-thought").count(),0);
    rows.push({width,status:"PASS",projectId,childPasswordRequired:false,firstThoughtAfterReload:true,twoAuthorizedBrowsers:true,parentFocusOverTwoRechecks:true,revocationMasked:true,externalRequests:0});
    await other.close();await context.close();
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(out+"/result.json",JSON.stringify({status:"PASS_FIVE_WIDTHS_PRIVATE_SYNTHETIC",rows,realData:false,physicalDevices:"NOT_RUN"},null,2)+"\n");console.log("PASS: five widths, actual SQLite persistence, media, two devices, >10s parent focus and revocation masking");
}catch(e){fs.writeFileSync(out+"/failure.txt",String(e));throw e;}
finally{await browser.close();await app.close();fs.rmSync(root,{recursive:true,force:true});}
