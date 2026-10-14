import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {mathProgress,MATH_TASK,VERSION,NOW,applyDomain} from '../../experiments/shared/domain.mjs';
import {selfCheckTask,revealHelp,submitTask} from '../../experiments/shared/vendor/math/server/pilot-core.mjs';
import {normalizeAnswer,damerauDistanceOne,nextReviewSchedule} from '../../experiments/shared/vendor/english.mjs';
const fixture=JSON.parse(readFileSync(new URL('./fixture-v1.json',import.meta.url)));
test('vendored math bytes and exact English extraction remain frozen',()=>{
  const lock=JSON.parse(readFileSync(new URL('./source-lock.json',import.meta.url)));
  for(const f of lock.files.filter(f=>f.vendoredPath))assert.equal(createHash('sha256').update(readFileSync(new URL('../../'+f.vendoredPath,import.meta.url))).digest('hex'),f.sha256);
  assert.equal(createHash('sha256').update(readFileSync(new URL('../../experiments/shared/vendor/english.mjs',import.meta.url))).digest('hex'),lock.englishModuleSha256);
  assert.equal(createHash('sha256').update(readFileSync(new URL('../../experiments/shared/vendor/math/server/pilot-core.mjs',import.meta.url))).digest('hex'),lock.mathPureModuleSha256);
  const lines=readFileSync(new URL('../../experiments/shared/vendor/math/server/pilot-store.mjs',import.meta.url),'utf8').split(/(?<=\n)/);
  for(const s of lock.mathPureSpans)assert.equal(createHash('sha256').update(lines.slice(s.startLine-1,s.endLine).join('')).digest('hex'),s.sha256);
});
test('frozen mathematical verdict/first answer/correction/help rules match source',()=>{
  for(const [i,c] of fixture.mathCases.entries()){
    const p=mathProgress(),id='synthetic-attempt',taskId=MATH_TASK.id;
    let revision=0;
    const first={sessionId:id,taskId,eventId:`first-${i}`,revision:revision++,answer:{value:c.first}};selfCheckTask(p,first,NOW);
    if(c.help)revealHelp(p,{sessionId:id,taskId,eventId:`help-${i}`,revision:revision++,kind:c.help},NOW);
    selfCheckTask(p,{sessionId:id,taskId,eventId:`check-${i}`,revision:revision++,phase:'evidence',evidence:{checks:['recount','read','compare'],reflection:'I checked the count.',finalConfirmed:true}},NOW);
    const result=submitTask(p,{sessionId:id,taskId,eventId:`submit-${i}`,revision,answer:{value:c.final}},[],NOW);
    assert.equal(result.status,c.status);assert.equal(result.selfCorrection,c.selfCorrection);assert.equal(result.assisted,c.assisted);assert.deepEqual(result.firstAnswer,{value:c.first});
    let state={};for(const action of ['math.first',...(c.help?['math.help']:[]),'math.evidence','math.submit'])state=applyDomain(state,'math',{attemptId:id,commandId:`adapter-${action}-${i}`,action,answer:action==='math.submit'?c.final:c.first},NOW).next;
    const via=state.progress.studio.sessions[id].results[taskId];
    // All grading/evidence fields (not a locally invented verdict) match original.
    assert.deepEqual(via,resultWithoutTransport(result));
  }
});
function resultWithoutTransport(r){const {revision,completionPaid,completed,dailyCap,...source}=r;return source;}
test('original English normalization and near spelling fixed expectations',()=>{
  for(const c of fixture.englishCases){assert.equal(normalizeAnswer(c.input),c.expectedNormalized);assert.equal(damerauDistanceOne(c.expectedNormalized,'apple'),c.distance);assert.equal(c.expectedNormalized==='apple',c.correct);}
});
test('original English scheduling golden outputs and adapter scheduling parity',()=>{
  for(const c of fixture.scheduleCases){const r=nextReviewSchedule(c.existing,c.outcome,c.initial,fixture.now);assert.equal(r.step,c.expectedStep);assert.equal(r.dueAt-fixture.now,c.dueDeltaMs);assert.equal(r.status,c.expectedStatus);assert.equal(r.lapses??0,c.expectedLapses);}
  const a=applyDomain({},'english',{attemptId:'original-parity',commandId:'x',action:'english.answer',answer:'apple'},NOW);
  assert.deepEqual(a.next.schedule,nextReviewSchedule(undefined,'good',true,NOW));
  assert.equal(a.result.sourceVersion,VERSION);
});
