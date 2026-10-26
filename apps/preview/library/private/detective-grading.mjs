import {createHash} from 'node:crypto';
import {parseNumber as parse} from '../../practice/private/pilot-math.mjs';
const parseNumber=x=>{try{return parse(x);}catch{return null;}};
export const fingerprint=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function matchesResponse(r,value){
  if(r.kind==='oral')return value==='oral';
  if(typeof value!=='string'||value.length>1000)return false;
  if(r.kind==='number'){const a=parseNumber(value),b=parseNumber(r.answer);return !!a&&!!b&&a.n*b.d===b.n*a.d;}
  return value.trim()===r.answer;
}
export const orderedReasons=v=>v.content.reasons.map((text,index)=>({text,index})).sort((a,b)=>fingerprint(v.id+a.text).localeCompare(fingerprint(v.id+b.text)));
export const matchesReason=(v,index)=>orderedReasons(v)[index]?.index===v.content.reason;
