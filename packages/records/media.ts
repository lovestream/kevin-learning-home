import { Worker } from "node:worker_threads";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { AppError,sha256 } from "../contracts/index.ts";
import type { Principal } from "./contracts.ts";
import type { PrivateRecords } from "./service.ts";
let active=0;
async function image(bytes:Buffer):Promise<{bytes:Buffer;thumb:Buffer;width:number;height:number}> {
  return await new Promise((resolve,reject)=>{
    const worker=new Worker(new URL("./image-worker.ts",import.meta.url),{workerData:bytes,resourceLimits:{maxOldGenerationSizeMb:48}});
    let done=false;
    const finish=(error?:Error,value?:{bytes:Uint8Array;thumb:Uint8Array;width:number;height:number})=>{
      if(done)return;done=true;clearTimeout(timer);void worker.terminate();
      error?reject(error):resolve({...value!,bytes:Buffer.from(value!.bytes),thumb:Buffer.from(value!.thumb)});
    };
    const timer=setTimeout(()=>finish(new AppError("IMAGE_TIMEOUT",422)),8000);
    worker.on("error",()=>finish(new AppError("IMAGE_INVALID",422)));
    worker.on("exit",()=>{if(!done)finish(new AppError("IMAGE_INVALID",422));});
    worker.on("message",value=>value.error?finish(new AppError("IMAGE_INVALID",422)):finish(undefined,value));
  });
}
async function audio(bytes:Buffer):Promise<{bytes:Buffer;duration:number}> {
  return await new Promise((resolve,reject)=>{
    const child=spawn("ffmpeg",["-nostdin","-hide_banner","-loglevel","error","-protocol_whitelist","file,pipe","-threads","1","-i","pipe:0","-map_metadata","-1","-vn","-ac","1","-ar","16000","-t","61","-f","wav","pipe:1"],{stdio:["pipe","pipe","ignore"],env:{PATH:process.env.PATH}});
    const chunks:Buffer[]=[];let size=0,done=false;
    const end=(err?:Error)=>{if(done)return;done=true;clearTimeout(timer);if(err){child.kill("SIGKILL");reject(err);return;}
      const out=Buffer.concat(chunks);let p=12,data:Buffer|undefined;
      while(p+8<=out.length){const length=out.readUInt32LE(p+4);if(out.toString("ascii",p,p+4)==="data"){data=out.subarray(p+8);break;}p+=8+length+(length%2);}
      if(!data||data.length/32000>60||data.length<320)reject(new AppError("AUDIO_DURATION_INVALID",422));
      else {
        // Canonical PCM WAV with a correct bounded length, no metadata chunks.
        const h=Buffer.alloc(44);h.write("RIFF",0);h.writeUInt32LE(data.length+36,4);h.write("WAVEfmt ",8);h.writeUInt32LE(16,16);h.writeUInt16LE(1,20);h.writeUInt16LE(1,22);h.writeUInt32LE(16000,24);h.writeUInt32LE(32000,28);h.writeUInt16LE(2,32);h.writeUInt16LE(16,34);h.write("data",36);h.writeUInt32LE(data.length,40);
        resolve({bytes:Buffer.concat([h,data]),duration:data.length/32000});
      }
    };
    const timer=setTimeout(()=>end(new AppError("AUDIO_TIMEOUT",422)),10000);
    child.on("error",()=>end(new AppError("AUDIO_DECODER_UNAVAILABLE",503)));
    child.stdout.on("data",c=>{size+=c.length;if(size>2_000_000)end(new AppError("AUDIO_TOO_LARGE",413));else chunks.push(c);});
    child.on("close",code=>end(code===0?undefined:new AppError("AUDIO_INVALID",422)));
    child.stdin.on("error",()=>{});child.stdin.end(bytes);
  });
}
export class PrivateMedia {
  readonly records:PrivateRecords;
  constructor(records:PrivateRecords){this.records=records;}
  async upload(p:Principal,learner:string,projectId:string,requestId:string,kind:"image"|"drawing"|"audio",mime:string,bytes:Buffer) {
    this.records.access.authorize(p,learner,"child");this.records.project(p,learner,projectId);
    if(!/^[a-f0-9-]{36}$/.test(requestId))throw new AppError("REQUEST_ID_INVALID",422);
    if(bytes.length>4*1024*1024||bytes.length<16)throw new AppError("MEDIA_SIZE",413);
    const hash=sha256(bytes),db=this.records.store.db;
    const existing=db.prepare("SELECT * FROM private_media WHERE learner_id=? AND request_id=?").get(learner,requestId);
    if(existing){if(existing.source_hash!==hash||existing.project_id!==projectId||existing.kind!==kind)throw new AppError("IDEMPOTENCY_CONFLICT",409);return this.info(existing);}
    if(active)throw new AppError("MEDIA_BUSY",429);active++;
    try {
      let normalized:Buffer,thumb:Buffer|null=null,metadata:unknown,outputMime:string;
      if(kind==="audio") {
        const webm=bytes.subarray(0,4).equals(Buffer.from([0x1a,0x45,0xdf,0xa3])),mp4=bytes.toString("ascii",4,8)==="ftyp",wav=bytes.toString("ascii",0,4)==="RIFF"&&bytes.toString("ascii",8,12)==="WAVE";
        if(!((mime==="audio/webm"&&webm)||(mime==="audio/mp4"&&mp4)||(mime==="audio/wav"&&wav)))throw new AppError("MEDIA_MIME_MISMATCH",422);
        const value=await audio(bytes);normalized=value.bytes;metadata={duration:value.duration};outputMime="audio/wav";
      }else {
        const png=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),jpeg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
        if(!((mime==="image/png"&&png)||(mime==="image/jpeg"&&jpeg)))throw new AppError("MEDIA_MIME_MISMATCH",422);
        const value=await image(bytes);normalized=value.bytes;thumb=value.thumb;metadata={width:value.width,height:value.height,metadataStripped:true};outputMime="image/png";
      }
      if(normalized.length>16*1024*1024)throw new AppError("MEDIA_SIZE",413);
      return this.records.store.transaction(()=>{
        this.records.access.authorize(p,learner,"child");this.records.project(p,learner,projectId);
        const quota=Number(db.prepare("SELECT coalesce(sum(length(bytes)+coalesce(length(thumb),0)),0) size FROM private_media WHERE learner_id=?").get(learner)!.size);
        if(quota+normalized.length+(thumb?.length??0)>64*1024*1024)throw new AppError("MEDIA_QUOTA",413);
        const id=randomUUID();db.prepare("INSERT INTO private_media VALUES(?,?,?,?,?,?,?,?,?,?,?,NULL)").run(id,learner,projectId,kind,outputMime,hash,sha256(normalized),normalized,thumb,JSON.stringify(metadata),requestId);
        return this.info(db.prepare("SELECT * FROM private_media WHERE id=?").get(id)!);
      });
    }finally{active--;}
  }
  private info(row:Record<string,unknown>) {return {artifactId:String(row.id),projectId:String(row.project_id),learnerId:String(row.learner_id),kind:String(row.kind),mime:String(row.mime),sha256:String(row.sha256),sourceHash:String(row.source_hash),bytes:(row.bytes as Uint8Array).length,metadata:JSON.parse(String(row.metadata))};}
  list(p:Principal,learner:string,project:string){this.records.project(p,learner,project);return this.records.store.db.prepare("SELECT * FROM private_media WHERE learner_id=? AND project_id=? AND deleted_at IS NULL").all(learner,project).map(r=>this.info(r));}
  read(p:Principal,learner:string,id:string,thumbnail=false) {
    this.records.access.authorize(p,learner);
    const r=this.records.store.db.prepare("SELECT * FROM private_media WHERE id=? AND learner_id=? AND deleted_at IS NULL").get(id,learner);
    if(!r)throw new AppError("NOT_FOUND",404);this.records.project(p,learner,String(r.project_id));
    const bytes=Buffer.from((thumbnail?r.thumb:r.bytes) as Uint8Array??[]);
    if(!bytes.length)throw new AppError("NOT_FOUND",404);
    if(!thumbnail&&sha256(bytes)!==r.sha256)throw new AppError("MEDIA_HASH_MISMATCH",503);
    return {bytes,mime:thumbnail?"image/png":String(r.mime)};
  }
}
