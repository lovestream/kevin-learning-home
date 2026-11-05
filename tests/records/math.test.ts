import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { editJSON } from "../../packages/records/lossless.ts";
import { PrivateMath } from "../../packages/records/math.ts";
import { fixture } from "./helpers.ts";
test("lossless updates retain unknown numeric lexemes, nulls, escapes and nested extensions",()=>{
 const raw='{ "unknown":{"big":9007199254740993,"zero":-0,"e":1e400,"text":"\\u4e2d","list":[2,1,null]},"studio":{"n":0} }';
 const updated=editJSON(raw,p=>{(p.studio as {n:number}).n=1;});
 for(const token of ['9007199254740993','-0','1e400','"\\u4e2d"','[2,1,null]'])assert(updated.includes(token),token);
 assert.equal((JSON.parse(updated).studio as {n:number}).n,1);
 assert.throws(()=>editJSON('{"same":1,"same":2}',()=>{}),/DUPLICATE_SOURCE_KEY_QUARANTINED/);
});
test("production math adapter reuses original first/self/final grading, snapshots and no rewards",async()=>{
 const f=await fixture();try{
  const math=new PrivateMath(f.records);
  const raw='{"schemaVersion":1,"wallet":{"coins":19},"unknown":{"huge":9007199254740993,"order":[2,1],"none":null}}';
  f.records.importSnapshot(f.learnerId,"math",Buffer.from(raw),"old-synthetic","legacy",0,randomUUID());
  const call=(channel:string,input:Record<string,unknown>,expectedRevision?:number)=>math.dispatch(f.child,f.learnerId,{requestId:randomUUID(),expectedRevision:expectedRevision??f.records.subject(f.child,f.learnerId,"math").revision,channel,input});
  const first=call("session-start",{lessonId:"G3-U01-B01",setName:"warmup"}),session=first.result as {id:string;revision:number;tasks:{id:string;kind:string}[]};
  const task=session.tasks.find(t=>t.kind==="choice")??session.tasks[0],source=JSON.parse(f.records.subject(f.child,f.learnerId,"math").payload!).studio.sessions[session.id],answer=task.kind==="choice"?{value:String(source.tasks.find((t:{id:string})=>t.id===task.id).expected)}:{value:"0"};
  assert(!JSON.stringify(session.tasks).includes('"expected":'));
  assert.throws(()=>call("help",{sessionId:session.id,taskId:task.id,revision:0,kind:"solution"}),/FIRST_ANSWER_REQUIRED/);
  const record=call("self-check",{sessionId:session.id,taskId:task.id,revision:0,phase:"first",answer});assert.equal((record.result as {revision:number}).revision,1);
  call("self-check",{sessionId:session.id,taskId:task.id,revision:1,phase:"evidence",evidence:{checks:["读清问题","核对过程","检查结果"],reflection:"合成逐项自查",format:"checklist-v1",finalConfirmed:true}});
  call("submit",{sessionId:session.id,taskId:task.id,revision:2,answer});
  const payload=f.records.subject(f.child,f.learnerId,"math").payload!;assert(payload.includes("9007199254740993"));assert(payload.includes('"coins":19'));assert.deepEqual(JSON.parse(payload).studio.sessions[session.id].selfChecks[task.id].firstAnswer,answer);
  assert.throws(()=>call("parent-formal",{sessionId:session.id,taskId:task.id,revision:3,verdict:"correct",comment:"由孩子伪造家长"}),/ROLE_FORBIDDEN/);
  assert.equal(math.view(f.child,f.learnerId).coinsIssued,0);assert(!JSON.stringify(math.view(f.child,f.learnerId)).includes('"expected":'));
  const before=payload;assert.throws(()=>call("reading",{lessonId:"G3-U01-B01",revision:0,blockId:"classroom",widgets:{}},0),/STALE_REVISION/);assert.equal(f.records.subject(f.child,f.learnerId,"math").payload,before);
 }finally{f.close();}
});
