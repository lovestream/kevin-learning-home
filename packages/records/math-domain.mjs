// ADAPT: dispatch from audited study.mjs; directly reuse the copied original pure
// pilot/thinking functions. Do not weaken validateStudy or synthetic repository gates.
import fs from "node:fs";
import {initPilot,validatePilot,saveReading,createSession,saveSession,revealHelp,selfCheckTask,submitTask,saveNote,publicSession,reviewFormalTask}from "../math-training/source/server/pilot-store.mjs";
import {applyThinking,applyThinkingReview}from "../math-training/source/server/thinking-store.mjs";
import {editJSON}from "./lossless.ts";
import {publicTaskSchema}from "../../apps/preview/practice/contract.ts";
const read=p=>JSON.parse(fs.readFileSync(new URL("../../"+p,import.meta.url),"utf8"));
const bank=read("apps/preview/practice/private/bank.json"),library=read("apps/preview/library/private/bank.json"),articles=read("apps/preview/reading/articles.json");
const lessons=[...bank.lessons.map(p=>{const l=read("apps/preview/content/lessons/"+p.lessonId+".json");return {...l,...p,articleBlocks:articles.find(a=>a.lessonId===p.lessonId).blocks,childClassroom:l.classroom};}),...library.practice.map(l=>({...l,articleBlocks:[],childClassroom:null}))];
const assert=(v,code,status=422)=>{if(!v)throw Object.assign(Error(code),{code,status});};
export function runMath(raw,channel,input,requestId,now=Date.now()) {
 let result;
 const payload=editJSON(raw,p=>{
  assert(!p.format,"MATH_ENVELOPE_REQUIRES_OFFLINE_ADAPTER");validatePilot(p.studio);initPilot(p);
  assert(["thinking","parent-thinking"].includes(channel)||input.action===undefined,"UNEXPECTED_MATH_ACTION");
  const event={...input,eventId:requestId},session=input.sessionId?p.studio.sessions[input.sessionId]:null;
  if(session&&channel!=="parent-formal"){
    const current=lessons.find(l=>l.lessonId===session.lessonId);
    assert(!current||current.contentVersion===session.contentVersion,"CONTENT_VERSION_RETIRED",409);
  }
  if(channel==="reading"){
    const l=lessons.find(l=>l.lessonId===input.lessonId),keys=new Set(["classroom",...(l?.articleBlocks??[]).map(b=>b.blockId)]);
    assert(input.widgets&&Object.keys(input.widgets).every(k=>keys.has(k)),"WIDGET_LOCATION_INVALID");result=saveReading(p,event,lessons,now);
  }else if(channel==="session-start")result=publicSession(createSession(p,event,lessons,now));
  else if(channel==="session-draft")result=publicSession(saveSession(p,event,now));
  else if(channel==="help"){
    assert(input.kind!=="solution"||session?.selfChecks?.[input.taskId],"FIRST_ANSWER_REQUIRED",403);result=revealHelp(p,event,now);
  }else if(channel==="self-check")result=selfCheckTask(p,event,now);
  else if(channel==="submit")result=submitTask(p,event,lessons,now);
  else if(channel==="note"){
    const id=event.id??requestId,old=p.studio.notes.find(n=>n.id===id);assert(!old||(old.lessonId===input.lessonId&&old.text===input.text?.trim()),"NOTE_ID_CONFLICT",409);result=saveNote(p,{...event,id},lessons,now);
  }else if(channel==="thinking")result=applyThinking(p,event,now);
  else if(channel==="parent-thinking")result=applyThinkingReview(p,{...event,reviewer:"parent-workbench"},now);
  else if(channel==="parent-formal")result=reviewFormalTask(p,event,now);
  else assert(false,"MATH_CHANNEL_INVALID");
  validatePilot(p.studio);
 });
 return {payload,result};
}
export function mathView(raw,parent=false) {
 const p=JSON.parse(raw),s=p.studio??{};
 const sessions=Object.values(s.sessions??{}).map(source=>{
  const projected=publicSession(source),row={};
  for(const k of ["id","lessonId","contentVersion","editorialRevision","setName","assessment","revision","index","taskIds","answers","help","results","selfChecks","createdAt","savedAt","submittedAt","completedAt"])if(projected[k]!==undefined)row[k]=projected[k];
  row.tasks=projected.tasks.map(t=>{const value=publicTaskSchema.strip().safeParse(t);return value.success?value.data:{id:String(t.id),prompt:String(t.prompt??"旧版本题目"),retired:true};});
  if(parent)row.parentReviews=source.parentReviews??{};return row;
 });
 return {reading:s.reading??{},sessions,notes:s.notes??[],review:s.review??{},...(parent?{thinking:s.thinking??{}}:{}),coinsIssued:0};
}
