// Independent amendment checks against pinned authored data; no old checkout access.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {canonical} from '../../apps/preview/contract.ts';
import {loadContent} from '../../apps/preview/content.ts';
import {loadPractice,gradePractice} from '../../apps/preview/practice/service.ts';
import {firstAnswer,submission} from '../math-full-02/helpers.mjs';
import {idParts,identityGroups,postalParts,classCode,stableCode,codingQuiz} from '../../apps/preview/adapters/source/shared/coding-model.mjs';
const read=p=>JSON.parse(fs.readFileSync(p)), hash=b=>createHash('sha256').update(b).digest('hex');
const id='G3-UP02-B01', m=read('docs/implementation/evidence/coding-20261101/source.json'), bank=loadPractice(process.cwd());
test('coding amendment pins d409 version 2026-11-01.2, other 69 DTO bytes and 837 authored tasks unchanged',()=>{
 assert.equal(m.sourceCommit,'d409a021dd8905154d572b53c9802a8c3b2d14d9');assert.equal(m.contentVersion,'2026-11-01.2');assert.equal(m.sourceStatusBeforeSha256,m.sourceStatusAfterSha256);
 assert.equal(Object.keys(m.unchangedTaskFingerprints).length,837);assert.equal(Object.keys(m.unchangedLessonDTOFingerprints).length,69);
 for(const [k,h] of Object.entries(m.unchangedTaskFingerprints))assert.equal(hash(canonical(bank.tasks.get(k).task)),h,k);
 for(const [k,h] of Object.entries(m.unchangedLessonDTOFingerprints))assert.equal(hash(fs.readFileSync('apps/preview/content/lessons/'+k+'.json')),h,k);
 const lesson=read('docs/implementation/evidence/coding-20261101/source-lesson.json');assert.equal(hash(canonical(lesson)),m.sourceLessonSha256);
 assert.deepEqual([...bank.tasks.values()].filter(x=>x.lessonId===id).map(x=>x.task),Object.values(lesson.taskSets).flat());
 assert.equal(bank.tasks.size,849);assert.equal(bank.lessons.size,70);
});
test('public teaching projection contains current coding title, no private answers and all twelve versioned questions',()=>{
 const dto=loadContent(process.cwd()).lessons.get(id).data;assert.equal(dto.contentVersion,m.contentVersion);assert.match(dto.title,/身份证、邮编/);
 const visit=v=>{if(Array.isArray(v))v.forEach(visit);else if(v&&typeof v==='object')for(const [k,x] of Object.entries(v)){assert(!['expected','solution','hint','referenceAnswer','expectedEvidence','taskSets'].includes(k),k);visit(x);}};
 visit(dto);const pub=bank.lessons.get(id);assert.equal(pub.contentVersion,m.contentVersion);
 const tasks=Object.values(pub.taskSets).flat();assert.equal(tasks.length,12);for(const t of tasks)visit(t);
});
test('identity is only a fictional 17-digit fragment plus ?, with independent 6+8+3+1 positions',()=>{
 assert.deepEqual(idParts.map(x=>x.digits.length),[2,2,2,4,2,2,3,1]);assert.equal(idParts.at(-1).digits,'?');assert(!/^\d{17}[\dX]$/.test(idParts.map(x=>x.digits).join('')));
 assert.deepEqual(identityGroups.map(g=>idParts.slice(g.from,g.to).reduce((n,x)=>n+x.digits.length,0)),[6,8,3,1]);
 assert.deepEqual(postalParts.map(x=>x.digits.length),[2,1,1,2]);assert.equal(postalParts.map(x=>x.digits).join(''),'100031');
 assert.deepEqual(codingQuiz.map(q=>q.correct),[1,1,0,1,2]);for(const q of codingQuiz)assert(q.why.length>10);
});
test('class and long-term school encodings are collision-free over complete allowed domains and reject invalid bounds',()=>{
 const a=new Set(),b=new Set();for(let g=1;g<=6;g++)for(let c=1;c<=6;c++)for(let s=1;s<=45;s++)a.add(classCode(g,c,s));assert.equal(a.size,1620);assert.equal(classCode(3,2,7),'03-02-07');
 for(let y=2023;y<=2026;y++)for(let s=1;s<=9999;s++)b.add(stableCode(y,s));assert.equal(b.size,39996);assert.equal(stableCode(2024,7),'2024-0007');assert.equal(stableCode(2026,9999),'2026-9999');
 for(const args of [[0,1,1],[7,1,1],[1,0,1],[1,7,1],[1,1,0],[1,1,46],[1.5,1,1],['3',2,7]])assert.throws(()=>classCode(...args));
 for(const args of [[2022,1],[2027,1],[2024,0],[2024,10000],[2024,1.5],[NaN,1]])assert.throws(()=>stableCode(...args));
});
test('all twelve amended tasks grade independently, five open explanations remain human, old versions rejected',()=>{
 const independentlySelected={P01:'2',P02:'1',P04:'1',P05:'1',P09:String(6+8+3+1),P10:'2',P11:'1'};
 for(const [suffix,answer] of Object.entries(independentlySelected))assert.equal(bank.tasks.get(id+'-'+suffix).task.expected,answer);
 let human=0,determinate=0;
 for(const row of [...bank.tasks.values()].filter(x=>x.lessonId===id)){
  const out=gradePractice(bank,submission(row));assert.equal(out.persisted,false);assert.equal(out.status,row.task.kind==='explanation'?'pendingReview':'correct',row.task.id);
  assert.equal(gradePractice(bank,{...submission(row),finalAnswer:{}}).status,'invalidInput');assert.throws(()=>gradePractice(bank,{...submission(row),contentVersion:'2026-10-09.4'}),/UNKNOWN_OR_STALE_TASK/);
  if(row.task.kind==='explanation'){human++;assert.match(out.message,/不自动判定正确/);}else{determinate++;const a=firstAnswer(row.task);a.value=row.task.kind==='choice'?row.task.options.find(o=>o.id!==row.task.expected).id:String(Number(a.value)+1);assert.notEqual(gradePractice(bank,submission(row,a)).status,'correct');}
 }
 assert.equal(human,5);assert.equal(determinate,7);assert.equal([...bank.tasks.values()].filter(x=>x.task.kind==='explanation').length,329);
});
