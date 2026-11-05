import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync,writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { RecordsDatabase } from "../../packages/records/database.ts";
import { PrivateRecords } from "../../packages/records/service.ts";
import { PrivateMedia } from "../../packages/records/media.ts";
import { snapshotArchive,restoreArchive } from "../../packages/records/checkpoint.ts";
import { authConfig } from "../../packages/auth/config.ts";
import { fixture,PASSWORD } from "./helpers.ts";

test("private schema is independent, strict WAL/FULL, bounded readiness and exclusive flock",async()=>{
  const f=await fixture();try{
    assert.equal(f.store.db.prepare("PRAGMA journal_mode").get()!.journal_mode,"wal");
    assert.equal(f.store.db.prepare("PRAGMA synchronous").get()!.synchronous,2);
    assert.equal(f.store.db.prepare("PRAGMA foreign_keys").get()!.foreign_keys,1);
    const operations:string[]=[];const exec=f.store.db.exec.bind(f.store.db);f.store.db.exec=(sql:string)=>{operations.push(sql);return exec(sql);};
    for(let i=0;i<20;i++)assert(f.store.ready());
    assert(!operations.some(x=>/check|scan/i.test(x)));assert.throws(()=>new RecordsDatabase(join(f.root,"records"),true),/WRITER_LOCKED/);
  }finally{f.close();}
});
test("child has no credential; only one parent login, no second PIN; device persists over restart",async()=>{
  const f=await fixture();try{
    const p=f.create();f.store.close();const db=new RecordsDatabase(join(f.root,"records"),true);
    try{const r=new PrivateRecords(db),child=r.access.session(f.childCookie.cookie);assert.equal(r.project(child,f.learnerId,p.projectId).question,p.question);assert.equal(db.db.prepare("SELECT count(*) n FROM households").get()!.n,1);assert(!db.db.prepare("SELECT name FROM sqlite_schema WHERE name LIKE '%pin%'").get());}finally{db.close();}
  }finally{f.close();}
});
test("strict source JSON snapshots retain unknowns, order, null, timezone and unsafe integer bytes",async()=>{
  const f=await fixture();try{
    const raw=Buffer.from('{ "studio":{"reading":{"old":{"widgets":[2,1],"savedAt":null}},"sessions":{"old":{"tasks":[{"version":"old-coding","answer":0}]}}},"wallet":{"coins":14},"unknown":{"n":9007199254740993,"at":"2026-01-01T00:00:00+08:00"}}\n');
    const id=randomUUID(),r=f.records.importSnapshot(f.learnerId,"math",raw,"old-math-sha","legacy-v1",0,id);
    assert.equal(f.records.subject(f.child,f.learnerId,"math").payload,raw.toString());
    assert.deepEqual(Buffer.from(f.store.db.prepare("SELECT bytes FROM source_snapshots WHERE id=?").get(r.snapshotId)!.bytes as Uint8Array),raw);
    assert.throws(()=>f.store.db.exec("UPDATE source_snapshots SET format='changed'"),/IMMUTABLE/);
    assert.equal(f.records.importSnapshot(f.learnerId,"math",raw,"old-math-sha","legacy-v1",0,id).snapshotId,r.snapshotId);
    assert.equal(f.records.importSnapshot(f.learnerId,"math",raw,"old-math-sha","legacy-v1",1,randomUUID()).duplicate,true);
    const facts=f.store.db.prepare("SELECT fact FROM private_events").all();assert.equal(facts.length,1);assert(!String(facts[0].fact).includes("9007199254740993"));assert(String(facts[0].fact).includes('"walletReplayed":false'));
  }finally{f.close();}
});
test("subject CAS/idempotency, English V1/V2 opaque state and math never share a wallet",async()=>{
  const f=await fixture();try{
    const input={requestId:randomUUID(),expectedRevision:0,subjectId:"english",schemaVersion:"wordquest-v1",contentVersion:"synthetic-bank",payload:'{"version":1,"stats":{"coins":2},"unknown":[null,"原文"]}'};
    assert.equal(f.records.writeSubject(f.child,f.learnerId,input).revision,1);assert.equal(f.records.writeSubject(f.child,f.learnerId,input).revision,1);
    assert.throws(()=>f.records.writeSubject(f.child,f.learnerId,{...input,payload:"{}"}),/IDEMPOTENCY_CONFLICT/);
    assert.throws(()=>f.records.writeSubject(f.child,f.learnerId,{...input,requestId:randomUUID()}),/STALE_REVISION/);
    f.records.writeSubject(f.child,f.learnerId,{...input,requestId:randomUUID(),expectedRevision:1,schemaVersion:"wordquest-v2",payload:'{"version":2,"stats":{"coins":9},"wordProgress":{"synthetic-word":{"spelling":"first"}}}'});
    assert.equal(f.records.subject(f.child,f.learnerId,"math").revision,0);
  }finally{f.close();}
});
test("project creation receipt survives lost response; immutable first thought, revisions, parent provenance",async()=>{
  const f=await fixture();try{
    const c={requestId:randomUUID(),projectId:randomUUID(),question:"合成：月亮为什么会变化？",origin:"child",subjectRefs:[]};
    const p=f.records.create(f.child,f.learnerId,c);assert.equal(f.records.create(f.child,f.learnerId,c).projectId,p.projectId);
    const e={requestId:randomUUID(),expectedRevision:0,detail:{kind:"hypothesis_submitted",text:"我先保留自己的猜想。",assistance:"none"}};
    assert.equal(f.records.append(f.child,f.learnerId,p.projectId,e).revision,1);assert.equal(f.records.append(f.child,f.learnerId,p.projectId,e).revision,1);
    assert.throws(()=>f.records.append(f.child,f.learnerId,p.projectId,{...e,requestId:randomUUID()}),/STALE_REVISION/);
    assert.throws(()=>f.records.append(f.child,f.learnerId,p.projectId,{...e,requestId:randomUUID(),expectedRevision:1}),/FIRST_HYPOTHESIS_IMMUTABLE/);
    assert.throws(()=>f.records.append(f.parent,f.learnerId,p.projectId,{...e,requestId:randomUUID(),expectedRevision:1}),/ROLE_FORBIDDEN/);
    assert.throws(()=>f.records.append(f.child,f.learnerId,p.projectId,{requestId:randomUUID(),expectedRevision:1,detail:{kind:"parent_feedback",text:"伪造家长"}}),/ROLE_FORBIDDEN/);
    const next=f.records.append(f.parent,f.learnerId,p.projectId,{requestId:randomUUID(),expectedRevision:1,detail:{kind:"parent_feedback",text:"试着只改一个条件？"}});
    assert.equal(next.events[0].detail.kind,"hypothesis_submitted");assert.equal(next.events[1].actor,"parent");
    const facts=f.store.db.prepare("SELECT fact FROM private_events").all().map(x=>String(x.fact)).join("");assert(!facts.includes("月亮为什么"));assert(!facts.includes("我先保留"));
  }finally{f.close();}
});
test("transaction failure never leaves a project or receipt/fact half-written",async()=>{
  const f=await fixture();try{
    f.store.db.exec("CREATE TEMP TRIGGER fail_fact BEFORE INSERT ON private_events BEGIN SELECT RAISE(ABORT,'INJECTED_FAILURE'); END;");
    assert.throws(()=>f.create(),/INJECTED_FAILURE/);
    assert.equal(f.store.db.prepare("SELECT count(*) n FROM private_projects").get()!.n,0);assert.equal(f.store.db.prepare("SELECT count(*) n FROM private_receipts").get()!.n,0);
  }finally{f.close();}
});
test("cross-household ids, guessed media and stale/revoked/forged principals cannot read",async()=>{
  const f=await fixture();try{
    const p=f.create(),other=await f.records.access.syntheticHousehold("other-parent",PASSWORD),s=await f.records.access.login("other-parent",PASSWORD,"other"),parent=f.records.access.session(s.cookie),dev=f.records.access.enroll(parent,other.learnerId),child=f.records.access.session(dev.cookie);
    assert.throws(()=>f.records.project(child,f.learnerId,p.projectId),/NOT_FOUND/);
    assert.throws(()=>f.records.project({...child,learnerId:f.learnerId,householdId:f.householdId},f.learnerId,p.projectId),/NOT_FOUND/);
    assert.throws(()=>f.records.create(f.parent,f.learnerId,{requestId:randomUUID(),projectId:randomUUID(),question:"由家长伪造孩子",origin:"child",subjectRefs:[]}),/ROLE_FORBIDDEN/);
    f.records.access.revokeDevices(f.parent);assert.throws(()=>f.records.project(f.child,f.learnerId,p.projectId),/SESSION_REQUIRED/);
    assert.throws(()=>f.records.access.csrf(parent,"bad"),/CSRF_REJECTED/);
  }finally{f.close();}
});
test("child deletion hides project/media; only parent can restore with CAS and history preserved",async()=>{
  const f=await fixture();try{
    const p=f.create(),c={requestId:randomUUID(),expectedRevision:0,deleted:true};
    f.records.deleteRestore(f.child,f.learnerId,p.projectId,c);assert.equal(f.records.list(f.child,f.learnerId).length,0);assert.throws(()=>f.records.project(f.child,f.learnerId,p.projectId),/NOT_FOUND/);
    assert.throws(()=>f.records.deleteRestore(f.child,f.learnerId,p.projectId,{requestId:randomUUID(),expectedRevision:1,deleted:false}),/ROLE_FORBIDDEN/);
    assert.equal(f.records.list(f.parent,f.learnerId,true).length,1);f.records.deleteRestore(f.parent,f.learnerId,p.projectId,{requestId:randomUUID(),expectedRevision:1,deleted:false});
    assert.equal(f.records.project(f.child,f.learnerId,p.projectId).question,p.question);
  }finally{f.close();}
});
test("encrypted consistent backup restores projects/snapshots/media and revokes every old session",async()=>{
  const f=await fixture();try{
    const p=f.create();f.records.importSnapshot(f.learnerId,"math",Buffer.from('{"future":null,"wallet":{"coins":123}}'),"old","legacy",0,randomUUID());
    const bytes=await sharp({create:{width:16,height:10,channels:3,background:"#ffcc33"}}).png().toBuffer();
    const media=new PrivateMedia(f.records),asset=await media.upload(f.child,f.learnerId,p.projectId,randomUUID(),"drawing","image/png",bytes);
    const backup=await snapshotArchive(f.store,PASSWORD);assert(!backup.includes(Buffer.from("纸桥")));assert(!backup.includes(Buffer.from("SQLite format")));
    const target=join(f.root,"restored");await restoreArchive(backup,target,PASSWORD,true);const restored=new RecordsDatabase(target,true);
    try{assert.throws(()=>new PrivateRecords(restored).access.session(f.childCookie.cookie),/SESSION_REQUIRED/);assert.equal(restored.db.prepare("SELECT count(*) n FROM private_projects").get()!.n,1);assert.equal(restored.db.prepare("SELECT sha256 FROM private_media WHERE id=?").get(asset.artifactId)!.sha256,asset.sha256);assert.equal(restored.db.prepare("SELECT count(*) n FROM source_snapshots").get()!.n,1);}finally{restored.close();}
    await assert.rejects(restoreArchive(backup,join(f.root,"wrong-password"),"Incorrect synthetic phrase!",true),/BACKUP_AUTHENTICATION/);
    const tampered=Buffer.from(backup);tampered[tampered.length-3]^=1;await assert.rejects(restoreArchive(tampered,join(f.root,"tampered"),PASSWORD,true),/BACKUP_AUTHENTICATION/);
    await assert.rejects(restoreArchive(backup,target,PASSWORD,true),/RESTORE_TARGET_EXISTS/);
  }finally{f.close();}
});
test("image decoder strips metadata, creates matching thumbnail, binds scope and rejects active formats",async()=>{
  const f=await fixture();try{
    const p=f.create(),m=new PrivateMedia(f.records),bytes=await sharp({create:{width:640,height:400,channels:3,background:"#ffcc33"}}).withMetadata({exif:{IFD0:{Artist:"synthetic-only"}}}).jpeg().toBuffer(),id=randomUUID();
    const a=await m.upload(f.child,f.learnerId,p.projectId,id,"image","image/jpeg",bytes);assert.equal(a.mime,"image/png");assert.equal((await m.upload(f.child,f.learnerId,p.projectId,id,"image","image/jpeg",bytes)).artifactId,a.artifactId);
    const output=await sharp(m.read(f.child,f.learnerId,a.artifactId).bytes).metadata(),thumb=await sharp(m.read(f.child,f.learnerId,a.artifactId,true).bytes).metadata();
    assert(!output.exif);assert.equal(output.width,640);assert.equal(thumb.width,320);
    await assert.rejects(m.upload(f.child,f.learnerId,p.projectId,randomUUID(),"image","image/png",Buffer.from('<svg onload="alert(1)"></svg>')),/MEDIA_MIME_MISMATCH/);
    await assert.rejects(m.upload(f.child,f.learnerId,p.projectId,randomUUID(),"image","image/png",Buffer.alloc(5*1024*1024)),/MEDIA_SIZE/);
    const e=f.records.append(f.child,f.learnerId,p.projectId,{requestId:randomUUID(),expectedRevision:0,detail:{kind:"evidence_added",text:"合成颜色观察",source:"observed",citation:"",inference:"",artifactIds:[a.artifactId],assistance:"none"}});assert.equal(e.events[0].detail.kind,"evidence_added");
    assert.throws(()=>f.records.append(f.child,f.learnerId,p.projectId,{requestId:randomUUID(),expectedRevision:1,detail:{kind:"evidence_added",text:"伪造素材",source:"observed",citation:"",inference:"",artifactIds:[randomUUID()],assistance:"none"}}),/MEDIA_NOT_FOUND/);
  }finally{f.close();}
});
test("password reset invalidates child and parent; production HTTPS policy stays intact",async()=>{
  const f=await fixture();try{
    await f.records.access.changePassword(f.parent,"Another synthetic parent phrase 2026!");
    assert.throws(()=>f.records.access.session(f.parentCookie.cookie),/SESSION_REQUIRED/);assert.throws(()=>f.records.access.session(f.childCookie.cookie),/SESSION_REQUIRED/);
    await assert.rejects(f.records.access.login("synthetic-parent",PASSWORD,"reset"),/AUTH_INVALID/);
    assert.throws(()=>authConfig("http://192.168.2.100:38444","production"),/AUTH_TRANSPORT_CONFIG/);
    const original=readFileSync("packages/math-training/repository.ts","utf8");assert(original.includes('"test"')&&original.includes("MATH_TRAINING_SYNTHETIC_ONLY"));
  }finally{f.close();}
});
