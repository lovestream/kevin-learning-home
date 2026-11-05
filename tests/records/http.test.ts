import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync,rmSync,realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import http from "node:http";
import { startFamily } from "../../apps/family/server.ts";
import { PASSWORD } from "./helpers.ts";
test("real HTTP family/device authorization, CSRF, parent role, no anonymous writes and no identity self-report",async()=>{
  const root=realpathSync(mkdtempSync(join(tmpdir(),"klh-records-http-"))),app=await startFamily({directory:join(root,"records"),synthetic:true}),origin=app.origin;
  try {
    const ids=await app.records.access.setup("synthetic-parent",PASSWORD,"合成学习者");
    const call=async(path:string,method="GET",body?:unknown,headers:Record<string,string>={})=>await fetch(origin+"/private-api/v1"+path,{method,headers:{origin,...(body!==undefined?{"content-type":"application/json"}:{}),...headers},body:body===undefined?undefined:JSON.stringify(body)});
    assert.equal((await call("/learners/"+ids.learnerId+"/projects")).status,401);
    assert.equal((await call("/access/login","POST",{login:"synthetic-parent",password:PASSWORD},{origin:"https://attacker.invalid"})).status,403);
    const login=await call("/access/login","POST",{login:"synthetic-parent",password:PASSWORD}),parentCookie=login.headers.getSetCookie()[0].split(";")[0],parentView=await login.json() as {csrf:string};
    assert(login.headers.getSetCookie()[0].includes("HttpOnly"));assert(login.headers.getSetCookie()[0].includes("SameSite=Strict"));assert(!parentCookie.includes(PASSWORD));
    const parentHeaders={cookie:parentCookie,"x-csrf-token":parentView.csrf,"x-klh-role":"parent"};
    assert.equal((await call("/parent/enroll","POST",{learnerId:ids.learnerId},{cookie:parentCookie})).status,403);
    const enroll=await call("/parent/enroll","POST",{learnerId:ids.learnerId},parentHeaders);assert.equal(enroll.status,200);
    const childCookie=enroll.headers.getSetCookie()[0].split(";")[0],session=await (await call("/access/child","GET",undefined,{cookie:childCookie})).json() as {csrf:string;learners:{id:string}[]};
    const childHeaders={cookie:childCookie,"x-csrf-token":session.csrf};assert.equal(session.learners.length,1);
    const c={requestId:randomUUID(),projectId:randomUUID(),question:"HTTP 合成问题 <script>alert(1)</script>",origin:"child",subjectRefs:[]},path="/learners/"+ids.learnerId+"/projects";
    assert.equal((await call(path,"POST",c,{cookie:childCookie})).status,403);
    assert.equal((await call(path,"POST",{...c,learnerId:ids.learnerId},childHeaders)).status,422);
    assert.equal((await call(path,"POST",c,childHeaders)).status,201);assert.equal((await call(path,"POST",c,childHeaders)).status,201);
    const p=await (await call(path+"/"+c.projectId,"GET",undefined,childHeaders)).json() as {question:string};assert.equal(p.question,c.question);
    assert.equal((await call("/learners/"+randomUUID()+"/projects","GET",undefined,childHeaders)).status,404);
    assert.equal((await call("/parent/learners/"+ids.learnerId+"/deleted","GET",undefined,childHeaders)).status,401);
    assert.equal((await call("/parent/backup","POST",{password:PASSWORD},childHeaders)).status,401);
    assert.equal((await call("/parent/learners/"+ids.learnerId+"/deleted","GET",undefined,parentHeaders)).status,200);
    assert.equal((await call(path+"?learnerId=other","GET",undefined,childHeaders)).status,400);
    const privatePage=await fetch(origin+"/explore");assert.equal(privatePage.status,200);assert(!privatePage.headers.get("content-security-policy")!.includes("unsafe-inline"));
    // Undici normalizes Host; use the wire-level client to exercise DNS rebinding.
    const spoofed=await new Promise<number>((resolve,reject)=>{const r=http.get(origin+"/explore",{headers:{host:"attacker.invalid"}},res=>{res.resume();resolve(res.statusCode!);});r.on("error",reject);});assert.equal(spoofed,403);
    await call("/parent/revoke-devices","POST",{},parentHeaders);assert.equal((await call(path,"GET",undefined,childHeaders)).status,401);
    assert.equal((await call("/access/parent","GET",undefined,parentHeaders)).status,200);
  }finally{await app.close();rmSync(root,{recursive:true,force:true});}
});
test("no private production startup without explicit reviewed transport/deployment",async()=>{
  await assert.rejects(startFamily({directory:"/unused-private-path",synthetic:false}),/PRIVATE_DEPLOYMENT_REVIEW_REQUIRED/);
  await assert.rejects(startFamily({directory:"/unused-private-path",synthetic:true,mode:"production",origin:"https://family.invalid"}),/EXPLICIT_TRUSTED_TLS_PROXY_REQUIRED/);
});
