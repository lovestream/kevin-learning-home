import { randomUUID } from "node:crypto";
import { AppError,canonical,sha256 } from "../contracts/index.ts";
import { appendEvent,createProject,projectSchema,questionCreatedFact,type ExploreProject,type ExploreEvent } from "../explore/domain.ts";
import { createRequest,appendRequest,subjectWrite,lifecycleRequest,parsed,type Principal } from "./contracts.ts";
import { RecordsDatabase } from "./database.ts";
import { FamilyAccess } from "./access.ts";
import { rebuildReviewIndex } from "./review.ts";

export class PrivateRecords {
  readonly access:FamilyAccess;
  readonly store:RecordsDatabase;
  constructor(store:RecordsDatabase) {this.store=store;this.access=new FamilyAccess(store);}
  receipt<T>(learner:string,id:string,command:unknown,operation:()=>T):T {
    return this.store.transaction(()=>{
      const hash=sha256(canonical(command)),r=this.store.db.prepare("SELECT * FROM private_receipts WHERE learner_id=? AND request_id=?").get(learner,id);
      if(r){if(r.request_hash!==hash)throw new AppError("IDEMPOTENCY_CONFLICT",409);return JSON.parse(String(r.response)) as T;}
      const result=operation();
      this.store.db.prepare("INSERT INTO private_receipts VALUES(?,?,?,?)").run(learner,id,hash,JSON.stringify(result));return result;
    });
  }
  list(p:Principal,learner:string,deleted=false) {
    this.access.authorize(p,learner);
    return this.store.db.prepare("SELECT projection FROM private_projects WHERE learner_id=? AND "+(deleted?"deleted_at IS NOT NULL":"deleted_at IS NULL")+" ORDER BY rowid DESC").all(learner).map(r=>projectSchema.parse(JSON.parse(String(r.projection))));
  }
  project(p:Principal,learner:string,id:string,includeDeleted=false):ExploreProject {
    this.access.authorize(p,learner);
    const r=this.store.db.prepare("SELECT projection FROM private_projects WHERE learner_id=? AND id=?"+(includeDeleted?"":" AND deleted_at IS NULL")).get(learner,id);
    if(!r)throw new AppError("NOT_FOUND",404);return projectSchema.parse(JSON.parse(String(r.projection)));
  }
  create(p:Principal,learner:string,raw:unknown) {
    this.access.authorize(p,learner,"child");const c=parsed(createRequest,raw);
    return this.receipt(learner,c.requestId,{kind:"create",...c},()=>{
      if(this.store.db.prepare("SELECT id FROM private_projects WHERE id=?").get(c.projectId))throw new AppError("PROJECT_ID_CONFLICT",409);
      const value=createProject({projectId:c.projectId,learnerId:learner,questionId:randomUUID(),question:c.question,origin:c.origin,subjectRefs:c.subjectRefs},new Date().toISOString());
      this.store.db.prepare("INSERT INTO private_projects VALUES(?,?,0,?,NULL)").run(value.projectId,learner,JSON.stringify(value));
      const fact=questionCreatedFact(value,c.requestId);this.fact(c.requestId,learner,"explore",value.projectId,0,fact,value.createdAt);
      return value;
    });
  }
  append(p:Principal,learner:string,id:string,raw:unknown) {
    const live=this.access.authorize(p,learner),c=parsed(appendRequest,raw);
    if((live.role==="parent")!==(c.detail.kind==="parent_feedback"))throw new AppError("ROLE_FORBIDDEN",403);
    return this.receipt(learner,c.requestId,{kind:"append",projectId:id,...c},()=>{
      const current=this.project(p,learner,id);
      if(current.revision!==c.expectedRevision)throw new AppError("STALE_REVISION",409,current.revision);
      // Media authority is resolved here; the anonymous aggregate stays media-disabled.
      const d=c.detail;
      if(d.kind==="evidence_added"||d.kind==="artifact_created")for(const asset of d.artifactIds)
        if(!this.store.db.prepare("SELECT id FROM private_media WHERE id=? AND learner_id=? AND project_id=? AND deleted_at IS NULL").get(asset,learner,id))throw new AppError("MEDIA_NOT_FOUND",404);
      const at=new Date(Math.max(Date.now(),Date.parse(current.updatedAt))).toISOString();
      const event:ExploreEvent={recordVersion:1,activityModule:"explore",eventId:c.requestId,projectId:id,learnerId:learner,expectedRevision:c.expectedRevision,actor:live.role,recordedAt:at,detail:d};
      const safeEvent=(d.kind==="evidence_added"||d.kind==="artifact_created")?{...event,detail:{...d,artifactIds:[]}}:event;
      const next=appendEvent(current,safeEvent);
      next.events[next.events.length-1]=event;
      this.store.db.prepare("UPDATE private_projects SET revision=?,projection=? WHERE id=? AND learner_id=?").run(next.revision,JSON.stringify(next),id,learner);
      this.fact(c.requestId,learner,"explore",id,next.revision,{kind:"exploration."+d.kind,actor:live.role,subjectRefs:next.subjectRefs,sourceRevision:next.revision,coinsIssued:0},at);
      return next;
    });
  }
  deleteRestore(p:Principal,learner:string,id:string,raw:unknown) {
    this.access.authorize(p,learner);const c=parsed(lifecycleRequest,raw);
    if(!c.deleted)this.access.authorize(p,learner,"parent");
    return this.receipt(learner,c.requestId,{kind:"visibility",projectId:id,...c},()=>{
      const value=this.project(p,learner,id,true);
      if(value.revision!==c.expectedRevision)throw new AppError("STALE_REVISION",409,value.revision);
      const at=new Date().toISOString();value.revision++;value.updatedAt=at;
      this.store.db.prepare("UPDATE private_projects SET revision=?,projection=?,deleted_at=? WHERE id=? AND learner_id=?").run(value.revision,JSON.stringify(value),c.deleted?at:null,id,learner);
      this.fact(c.requestId,learner,"explore",id,value.revision,{kind:c.deleted?"project.deleted":"project.restored",actor:p.role},at);
      return {projectId:id,revision:value.revision,deleted:c.deleted};
    });
  }
  fact(id:string,learner:string,module:string,entity:string,revision:number,fact:unknown,at:string) {
    this.store.db.prepare("INSERT INTO private_events VALUES(?,?,?,?,?,?,?)").run(id,learner,module,entity,revision,JSON.stringify(fact),at);
  }
  subject(p:Principal,learner:string,subject:string) {
    this.access.authorize(p,learner);
    const r=this.store.db.prepare("SELECT * FROM private_subject_state WHERE learner_id=? AND subject_id=?").get(learner,subject);
    if(!r)return {subjectId:subject,revision:0,payload:null};
    return {subjectId:subject,revision:Number(r.revision),schemaVersion:String(r.schema_version),contentVersion:String(r.content_version),payload:String(r.payload),snapshotId:r.snapshot_id};
  }
  writeSubject(p:Principal,learner:string,raw:unknown) {
    this.access.authorize(p,learner,"child");const c=parsed(subjectWrite,raw);validateJSON(c.payload);
    return this.receipt(learner,c.requestId,{kind:"subject",...c},()=>{
      const current=this.subject(p,learner,c.subjectId);
      if(current.revision!==c.expectedRevision)throw new AppError("STALE_REVISION",409,current.revision);
      const revision=current.revision+1;
      this.store.db.prepare("INSERT INTO private_subject_state VALUES(?,?,?,?,?,?,NULL) ON CONFLICT(learner_id,subject_id) DO UPDATE SET revision=excluded.revision,schema_version=excluded.schema_version,content_version=excluded.content_version,payload=excluded.payload").run(learner,c.subjectId,revision,c.schemaVersion,c.contentVersion,c.payload);
      rebuildReviewIndex(this.store,learner,c.subjectId,revision,c.payload);
      this.fact(c.requestId,learner,c.subjectId,c.subjectId,revision,{kind:"subject.state_saved",sourceRevision:revision,payloadHash:sha256(c.payload),coinsIssued:0},new Date().toISOString());
      return {subjectId:c.subjectId,revision};
    });
  }
  /** Offline migration only; caller must first stop runtime and hold this lease.
   * Raw JSON is stored unchanged, not parse/stringified. Unknowns remain intact.
   */
  importSnapshot(learner:string,subject:"math"|"english",bytes:Buffer,sourceVersion:string,format:string,expectedRevision:number,requestId:string) {
    if(bytes.length>16*1024*1024)throw new AppError("SNAPSHOT_TOO_LARGE",413);
    const payload=new TextDecoder("utf-8",{fatal:true}).decode(bytes);validateJSON(payload);
    const digest=sha256(bytes);
    return this.receipt(learner,requestId,{kind:"import",subject,digest,sourceVersion,format,expectedRevision},()=>{
      const current=this.store.db.prepare("SELECT revision FROM private_subject_state WHERE learner_id=? AND subject_id=?").get(learner,subject),revision=Number(current?.revision??0);
      const exists=this.store.db.prepare("SELECT id FROM source_snapshots WHERE learner_id=? AND subject_id=? AND sha256=?").get(learner,subject,digest);
      if(exists)return {snapshotId:String(exists.id),duplicate:true,revision};
      if(revision!==expectedRevision)throw new AppError("STALE_REVISION",409,revision);
      const id=randomUUID();
      this.store.db.prepare("INSERT INTO source_snapshots VALUES(?,?,?,?,?,?,?,?)").run(id,learner,subject,sourceVersion,format,digest,bytes,Date.now());
      this.store.db.prepare("INSERT INTO private_subject_state VALUES(?,?,?,?,?,?,?) ON CONFLICT(learner_id,subject_id) DO UPDATE SET revision=excluded.revision,schema_version=excluded.schema_version,content_version=excluded.content_version,payload=excluded.payload,snapshot_id=excluded.snapshot_id").run(learner,subject,revision+1,format,sourceVersion,payload,id);
      rebuildReviewIndex(this.store,learner,subject,revision+1,payload);
      this.fact(requestId,learner,subject,subject,revision+1,{kind:"subject.snapshot_imported",snapshotId:id,sha256:digest,walletReplayed:false},new Date().toISOString());
      return {snapshotId:id,duplicate:false,revision:revision+1};
    });
  }
}
export function validateJSON(raw:string) {
  try {
    const data:unknown=JSON.parse(raw);
    if(!data||typeof data!=="object"||Array.isArray(data))throw Error();
  } catch {throw new AppError("SUBJECT_JSON_INVALID",422);}
}
