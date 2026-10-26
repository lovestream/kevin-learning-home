import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {loadPractice,gradePractice} from '../../apps/preview/practice/service.ts';
import {publicLessonSchema,publicTaskSchema,groups} from '../../apps/preview/practice/contract.ts';
import {canonical} from '../../apps/preview/contract.ts';
import {validateTask,parseNumber,add,rational,formatFraction} from '../../apps/preview/practice/private/pilot-math.mjs';
import {startPreview} from '../../apps/preview/server.ts';
import {firstAnswer,submission} from './helpers.mjs';
const root=process.cwd(),bank=loadPractice(root),source=JSON.parse(fs.readFileSync('docs/implementation/evidence/math-full-02/source.json'));
const sha=v=>createHash('sha256').update(v).digest('hex');
const counts=(key,values)=>Object.fromEntries(values.map(v=>[v,source.tasks.filter(t=>t[key]===v).length]));
test('849 exact frozen tasks, five groups/kinds, 70 lessons, source hashes and strict projection',()=>{
 const coverage=JSON.parse(fs.readFileSync('docs/implementation/evidence/math-full-02/tasks-coverage.json'));assert.equal(coverage.status,'PASS');assert.equal(coverage.total,849);assert.equal(coverage.bankSha256,bank.bankSha256);assert.equal(coverage.publicSha256,bank.publicSha256);for(const [p,h]of Object.entries(coverage.execution.files))assert.equal(sha(fs.readFileSync(p)),h,'STALE_PRACTICE_EVIDENCE '+p);
 assert.equal(bank.tasks.size,849);assert.equal(bank.lessons.size,70);assert(source.worktreeUnchanged);
 assert.equal(source.privateBankSha256,bank.bankSha256);assert.equal(source.statusBeforeSha256,source.statusAfterSha256);
 assert.deepEqual(counts('group',groups),{warmup:140,core:249,transfer:143,challenge:73,review:244});
 assert.deepEqual(counts('kind',['number','choice','explanation','expression','fields']),{number:357,choice:93,explanation:335,expression:25,fields:39});
 for(const r of source.tasks){const t=bank.tasks.get(r.taskId);assert(t);assert.equal(sha(canonical(t.task)),r.sourceTaskSha256);assert.equal(t.lessonId,r.lessonId);assert.equal(t.contentVersion,r.contentVersion);const p=bank.lessons.get(r.lessonId).taskSets[r.group][r.index];assert.equal(p.id,r.taskId);assert.equal(p.prompt,t.task.prompt);assert.equal(p.kind,t.task.kind);assert.deepEqual(p.options,t.task.options);assert.deepEqual(p.diagram,t.task.diagram);assert(!('expected'in p));assert(!('solution'in p));assert(!('hint'in p));assert(!('expectedEvidence'in p.responseSpec));for(const f of p.fields??[])assert(!('expected'in f));assert.throws(()=>publicTaskSchema.parse({...p,expected:'private'}));}
 for(const l of bank.lessons.values())assert.deepEqual(publicLessonSchema.parse(l),l);
 for(const f of source.files)assert.equal(sha(fs.readFileSync(f.target)),f.targetSha256??f.sha256);
});
test('all 849 authored golden answers match original pure grader; 335 explanations stay human review',()=>{
 let human=0,deterministic=0;const results=[];
 for(const row of bank.tasks.values()){
  const answer=firstAnswer(row.task),raw=validateTask(row.task,answer),out=gradePractice(bank,submission(row));
  assert.equal(out.status,raw.status,row.task.id);assert.equal(out.status,row.task.kind==='explanation'?'pendingReview':'correct',row.task.id);assert.equal(out.persisted,false);assert(out.solution&&out.hint);
  if(row.task.kind==='explanation'){human++;assert(!out.message.includes('已保存'));}else deterministic++;
  assert.equal(gradePractice(bank,{...submission(row),finalAnswer:{}}).status,'invalidInput');
  let negative='pendingReview';
  if(row.task.kind!=='explanation'){
   const bad={...answer};if(row.task.kind==='choice')bad.value=row.task.options.find(o=>o.id!==row.task.expected).id;
   else if(row.task.kind==='expression')bad.value='0';
   else {const key=row.task.fields?.[0].key??'value';bad[key]=formatFraction(add(parseNumber(bad[key]),rational(1)));}
   const mismatch=gradePractice(bank,{...submission(row),finalAnswer:bad});negative=mismatch.status;assert.notEqual(negative,'correct',row.task.id);assert.equal(negative,validateTask(row.task,bad).status);
  }
  results.push({negative,taskId:row.task.id,kind:row.task.kind,status:out.status,invalidInput:'PASS',sourceTaskSha256:sha(canonical(row.task))});
 }
 assert.equal(human,335);assert.equal(deterministic,514);fs.mkdirSync('.evidence/math-full-02',{recursive:true});fs.writeFileSync('.evidence/math-full-02/golden.json',JSON.stringify({status:'PASS',total:849,human,deterministic,results},null,2)+'\n');
});
test('independent arithmetic fixtures: fractions, Unicode, complete expressions, claim/evidence and units',()=>{
 const number={kind:'number',expected:'1/2'};
 for(const v of ['0.5','2/4','+0.50','1／2'])assert.equal(validateTask(number,{value:v}).status,'correct');
 for(const v of ['0.6','2/5'])assert.equal(validateTask(number,{value:v}).status,'incorrect');
 for(const v of ['1/0','0.5米','1e9','1;process.exit()'])assert.equal(validateTask(number,{value:v}).status,'invalidInput');
 const e={kind:'expression',expected:'2*(3+4)',responseSpec:{requireBrackets:true,requiredOperators:['*'],preserveOperands:true}};
 assert.equal(validateTask(e,{value:'（3＋4）×2'}).status,'correct');assert.equal(validateTask(e,{value:'14'}).status,'invalidInput');assert.equal(validateTask(e,{value:'2*(3+5)'}).status,'invalidInput');
 assert.equal(validateTask({kind:'fields',fields:[{key:'a',label:'长',expected:'3',unit:'厘米'},{key:'b',label:'宽',expected:'2'}]},{a:'6/2',b:'2.0'}).status,'correct');
 const c={kind:'choice',options:[{id:'yes'},{id:'no'}],expected:'yes',responseSpec:{type:'claim-evidence',evidenceOptions:[{id:'proof'},{id:'other'}],expectedEvidence:'proof'}};
 assert.equal(validateTask(c,{value:'yes',evidence:'other'}).status,'incorrect');assert.equal(validateTask(c,{value:'yes',evidence:'proof'}).status,'correct');assert.equal(validateTask(c,{value:'yes'}).status,'invalidInput');
});
test('submission schema rejects missing self-checks, stale/other lesson, unknown fields and oversized answers',()=>{
 const row=bank.tasks.values().next().value,s=submission(row);
 for(const bad of [{...s,checks:[true,false,true]},{...s,checks:[]},{...s,firstAnswer:{}},{...s,learnerId:'real'},{...s,contentVersion:'stale'},{...s,lessonId:'other'},{...s,finalAnswer:{__proto__:'x',value:'x',owner:'real'}},{...s,finalAnswer:{value:'x'.repeat(1001)}}])assert.throws(()=>gradePractice(bank,bad));
});
test('real HTTP reaches all 849 questions, final-only stateless feedback; private/formal APIs inaccessible',async()=>{
 const s=await startPreview({port:0,enabled:true}),origin='http://127.0.0.1:'+s.address().port;
 const post=(body,headers={})=>fetch(origin+'/preview-api/v1/practice/grade',{method:'POST',headers:{'Content-Type':'application/json',...headers},body:typeof body==='string'?body:JSON.stringify(body)});
 try{
  const reached=new Set();for(const id of bank.lessons.keys()){
   const r=await fetch(origin+'/preview-api/v1/practice/lessons/'+id);assert.equal(r.status,200);assert.equal(r.headers.get('set-cookie'),null);const p=publicLessonSchema.parse(await r.json());for(const g of groups)for(const t of p.taskSets[g])reached.add(t.id);
  }assert.equal(reached.size,849);
  for(const row of bank.tasks.values()){const r=await post(submission(row));assert.equal(r.status,200);assert.equal(r.headers.get('set-cookie'),null);assert.equal((await r.json()).status,row.task.kind==='explanation'?'pendingReview':'correct');}
  const row=bank.tasks.values().next().value;assert.equal((await post({...submission(row),checks:[false,true,true]})).status,400);
  assert.equal((await post(submission(row),{Origin:'https://evil.invalid'})).status,403);
  assert.equal((await post(submission(row),{'Sec-Fetch-Site':'cross-site'})).status,415);
  assert.equal((await post(submission(row),{'Content-Type':'text/plain'})).status,415);
  assert.equal((await post('x'.repeat(17000))).status,413);
  assert.equal((await post('{bad')).status,400);
  for(const p of ['/api/v1/math/grade','/api/v1/auth/me','/practice/private/bank.json','/apps/preview/practice/private/bank.json','/preview-api/v1/practice/lessons/unknown'])assert.equal((await fetch(origin+p)).status,404);
  for(const method of ['POST','PUT','PATCH','DELETE'])assert.equal((await fetch(origin+'/api/v1/math/grade',{method})).status,405);
  for(const f of fs.readdirSync('apps/preview/dist/assets').filter(x=>x.endsWith('.js'))){const text=fs.readFileSync('apps/preview/dist/assets/'+f,'utf8');assert(!text.includes('validateTask('));for(const row of bank.tasks.values())if(row.task.solution.length>45)assert(!text.includes(row.task.solution),'private task solution in bundle');}
 }finally{s.closeAllConnections();await new Promise(r=>s.close(r));}
});
test('private bank tampering prevents startup',async()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'klh-public-practice-'));
 try{fs.mkdirSync(path.join(tmp,'apps'),{recursive:true});fs.cpSync('apps/preview',path.join(tmp,'apps/preview'),{recursive:true});const p=path.join(tmp,'apps/preview/practice/private/bank.json'),b=JSON.parse(fs.readFileSync(p));b.lessons[0].taskSets.warmup[0].prompt+='tampered';fs.writeFileSync(p,JSON.stringify(b));await assert.rejects(startPreview({enabled:true,port:0,root:tmp}),/PRACTICE_SEAL_MISMATCH/);}finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
