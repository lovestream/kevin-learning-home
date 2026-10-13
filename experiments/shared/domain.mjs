import {selfCheckTask,revealHelp,submitTask} from './vendor/math/server/pilot-core.mjs';
import {normalizeAnswer,spellingAnswersFor,damerauDistanceOne,nextReviewSchedule} from './vendor/english.mjs';
export const VERSION='klh-parity-v1';
export const NOW=1791849600000;
export const MATH_TASK={id:'synthetic-math-q1',kind:'choice',level:'core',prompt:'2 + 3 = ?',options:[{id:'five',label:'5'},{id:'four',label:'4'}],expected:'five',hint:'Count two, then three.',solution:'2 + 3 = 5',diagnostic:'Count again.'};
export const WORD={id:'synthetic-word-apple',word:'apple',spellingVariants:['Apple']};
export const clone=v=>structuredClone(v);
export function mathProgress(attemptId='synthetic-attempt') {
  const s={id:attemptId,lessonId:'synthetic-lesson',contentVersion:VERSION,setName:'warmup',taskIds:[MATH_TASK.id],tasks:[clone(MATH_TASK)],revision:0,index:0,answers:{},help:{},results:{},selfChecks:{},completedAt:null};
  return {wallet:{coins:0,earned:0,spent:0,ledger:[]},settings:{reviewDays:7},studio:{version:1,reading:{},sessions:{[attemptId]:s},notes:[],events:[],entitlements:{},daily:{},review:{}}};
}
export function applyDomain(previous,subject,c,now=NOW) {
  const next=clone(previous??{});let result;
  if(subject==='math') {
    next.progress??=mathProgress(c.attemptId);
    if(!next.progress.studio.sessions[c.attemptId])next.progress.studio.sessions[c.attemptId]=mathProgress(c.attemptId).studio.sessions[c.attemptId];
    const p=next.progress,s=p.studio.sessions[c.attemptId];
    const input={sessionId:s.id,taskId:MATH_TASK.id,revision:s.revision,eventId:c.commandId};
    if(c.action==='math.first')result=selfCheckTask(p,{...input,answer:{value:c.answer}},now);
    else if(c.action==='math.help')result=revealHelp(p,{...input,kind:'hint'},now);
    else if(c.action==='math.evidence')result=selfCheckTask(p,{...input,phase:'evidence',evidence:{checks:['recount','read','compare'],reflection:'I checked the count.',finalConfirmed:true}},now);
    else if(c.action==='math.submit')result=submitTask(p,{...input,answer:{value:c.answer}},[],now);
    else throw Object.assign(new Error('subject/action mismatch'),{code:'INVALID_INPUT',status:400});
    // The source module's receipt history is not the platform ledger. Keep current
    // attempt evidence; immutable platform events/receipts retain all commands.
    p.studio.events=[];
  } else {
    if(c.action!=='english.answer')throw Object.assign(new Error('subject/action mismatch'),{code:'INVALID_INPUT',status:400});
    next.attempts??={};const a=next.attempts[c.attemptId]??={firstAnswer:c.answer,tries:0,nearMissUsed:false,hadLapse:false};
    const normalized=normalizeAnswer(c.answer),forms=spellingAnswersFor(WORD),correct=forms.includes(normalized);
    const near=!correct&&!a.nearMissUsed&&forms.some(v=>damerauDistanceOne(normalized,v)===1);
    a.tries++;a.nearMissUsed||=near;a.hadLapse||=!correct&&!near;
    const independent=correct&&a.tries===1&&!a.nearMissUsed&&!a.hadLapse;
    const grade=correct?(independent?'good':'hard'):(near?'hard':'again');
    // Scheduling is the exact original pure function; adapter attempt plumbing
    // is new and is not claimed as the complete old DOM application's parity.
    if(correct)next.schedule=nextReviewSchedule(next.schedule,grade,!next.schedule,now);
    result={status:correct?'correct':'incorrect',firstAnswer:a.firstAnswer,finalAnswer:c.answer,nearMiss:near,nearMissUsed:a.nearMissUsed,independent,grade,schedule:next.schedule??null};
  }
  const correct=result.status==='correct';
  const independent=subject==='math'?correct&&!result.assisted&&!result.selfCorrection:result.independent;
  return {next,result:{...result,independent,assessedBy:'engine',trustLevel:'server-verified',sourceVersion:VERSION},reward:correct?1:0,rewardSource:`${subject}:${VERSION}:${subject==='math'?MATH_TASK.id:WORD.id}`};
}
export function publicCourse(subject) {
  return {subject,version:VERSION,title:subject==='math'?'Synthetic math':'Synthetic English',taskId:subject==='math'?MATH_TASK.id:WORD.id,prompt:subject==='math'?MATH_TASK.prompt:'Spell the fruit: 苹果',options:subject==='math'?MATH_TASK.options:[],media:[{assetId:'synthetic-public-image',version:'v1'}]};
}
