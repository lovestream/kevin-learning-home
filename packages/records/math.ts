import { z } from "zod";
import { AppError } from "../contracts/index.ts";
import { studyChannels,studyEventSchema } from "../contracts/math-study.ts";
import { runMath,mathView } from "./math-domain.mjs";
import type { Principal } from "./contracts.ts";
import type { PrivateRecords } from "./service.ts";
import { rebuildReviewIndex } from "./review.ts";
const schema=z.strictObject({requestId:z.uuid(),expectedRevision:z.number().int().nonnegative(),channel:z.enum(studyChannels),input:studyEventSchema.omit({eventId:true,reviewer:true})});
export class PrivateMath {
 readonly records:PrivateRecords;
 constructor(records:PrivateRecords){this.records=records;}
 view(p:Principal,learner:string):Record<string,unknown>&{sourceRevision:number} {const live=this.records.access.authorize(p,learner),s=this.records.subject(p,learner,"math");return {sourceRevision:s.revision,...mathView(s.payload??'{"schemaVersion":1}',live.role==="parent") as Record<string,unknown>};}
 dispatch(p:Principal,learner:string,raw:unknown) {
  const parsed=schema.safeParse(raw);if(!parsed.success)throw new AppError("MATH_COMMAND_SCHEMA",422);const c=parsed.data;
  const live=this.records.access.authorize(p,learner,c.channel.startsWith("parent-")?"parent":"child");
  return this.records.receipt(learner,c.requestId,{kind:"math.command",actor:live.role,...c},()=>{
   const current=this.records.subject(p,learner,"math");if(current.revision!==c.expectedRevision)throw new AppError("STALE_REVISION",409,current.revision);
   let next:{payload:string;result:unknown};
   try{next=runMath(current.payload??'{"schemaVersion":1}',c.channel,c.input,c.requestId);}catch(e){const error=e as Error&{code?:string;status?:number};throw new AppError(error.code??"MATH_INPUT_REJECTED",error.status??422);}
   const revision=current.revision+1;
   this.records.store.db.prepare("INSERT INTO private_subject_state VALUES(?,?,?,?,?,?,NULL) ON CONFLICT(learner_id,subject_id) DO UPDATE SET revision=excluded.revision,payload=excluded.payload").run(learner,"math",revision,"legacy-math-v1","installed-math",next.payload);
   rebuildReviewIndex(this.records.store,learner,"math",revision,next.payload);
   this.records.fact(c.requestId,learner,"math","math",revision,{kind:"math."+c.channel,actor:live.role,sourceRevision:revision,coinsIssued:0},new Date().toISOString());
   return {sourceRevision:revision,result:next.result};
  });
 }
}
