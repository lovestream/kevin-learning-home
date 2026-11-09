import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { fixture } from "./helpers.ts";
import { PrivateMedia } from "../../packages/records/media.ts";
function wav(seconds:number){const data=Buffer.alloc(seconds*16000*2),h=Buffer.alloc(44);h.write("RIFF",0);h.writeUInt32LE(data.length+36,4);h.write("WAVEfmt ",8);h.writeUInt32LE(16,16);h.writeUInt16LE(1,20);h.writeUInt16LE(1,22);h.writeUInt32LE(16000,24);h.writeUInt32LE(32000,28);h.writeUInt16LE(2,32);h.writeUInt16LE(16,34);h.write("data",36);h.writeUInt32LE(data.length,40);return Buffer.concat([h,data]);}
test("synthetic audio is decoded to bounded metadata-free PCM, no local/network decoder protocols",async()=>{
  const f=await fixture();try{
    const p=f.create(),media=new PrivateMedia(f.records),a=await media.upload(f.child,f.learnerId,p.projectId,randomUUID(),"audio","audio/wav",wav(1));
    assert.equal(a.mime,"audio/wav");assert.equal(a.metadata.duration,1);const bytes=media.read(f.child,f.learnerId,a.artifactId).bytes;assert.equal(bytes.length,32044);assert.equal(bytes.toString("ascii",36,40),"data");
    await assert.rejects(media.upload(f.child,f.learnerId,p.projectId,randomUUID(),"audio","audio/wav",wav(61)),/AUDIO_DURATION_INVALID/);
    await assert.rejects(media.upload(f.child,f.learnerId,p.projectId,randomUUID(),"audio","audio/mp4",Buffer.from('file:///private/synthetic-secret-only')),/MEDIA_MIME_MISMATCH/);
  }finally{f.close();}
});
