import { createCipheriv,createDecipheriv,randomBytes,scrypt } from "node:crypto";
import { gzipSync,gunzipSync } from "node:zlib";
import { mkdirSync,existsSync,writeFileSync,readFileSync,rmSync,mkdtempSync,openSync,closeSync,fsyncSync,linkSync,unlinkSync } from "node:fs";
import { dirname,join,resolve } from "node:path";
import { tmpdir } from "node:os";
import { AppError,sha256 } from "../contracts/index.ts";
import { ownedDirectory } from "../platform/store.ts";
import { checkPasswordPolicy } from "../auth/password.ts";
import { RecordsDatabase,PRIVATE_SCHEMA_HASH } from "./database.ts";
const MAGIC=Buffer.from("KLH-PRIVATE-ARCHIVE-1\n");
const MAX_BYTES=128*1024*1024;
async function key(password:string,salt:Buffer):Promise<Buffer> {
  checkPasswordPolicy(password);
  return await new Promise((resolve,reject)=>scrypt(password,salt,32,{N:32768,r:8,p:3,maxmem:64*1024*1024},(e,k)=>e?reject(e):resolve(k)));
}
export async function encryptArchive(bytes:Buffer,password:string) {
  if(bytes.length>MAX_BYTES)throw new AppError("BACKUP_LIMIT",413);
  const salt=randomBytes(16),iv=randomBytes(12),secret=await key(password,salt);
  try {
    const cipher=createCipheriv("aes-256-gcm",secret,iv);cipher.setAAD(MAGIC);
    const encrypted=Buffer.concat([cipher.update(gzipSync(bytes)),cipher.final()]);
    return Buffer.concat([MAGIC,salt,iv,cipher.getAuthTag(),encrypted]);
  } finally {secret.fill(0);}
}
export async function decryptArchive(bytes:Buffer,password:string) {
  if(bytes.length>MAX_BYTES||bytes.length<MAGIC.length+45||!bytes.subarray(0,MAGIC.length).equals(MAGIC))throw new AppError("BACKUP_FORMAT",422);
  const p=MAGIC.length,secret=await key(password,bytes.subarray(p,p+16));
  try {
    const decipher=createDecipheriv("aes-256-gcm",secret,bytes.subarray(p+16,p+28));
    decipher.setAAD(MAGIC);decipher.setAuthTag(bytes.subarray(p+28,p+44));
    const clear=Buffer.concat([decipher.update(bytes.subarray(p+44)),decipher.final()]);
    return gunzipSync(clear,{maxOutputLength:MAX_BYTES});
  } catch {throw new AppError("BACKUP_AUTHENTICATION_FAILED",422);}
  finally {secret.fill(0);}
}
export async function snapshotArchive(store:RecordsDatabase,password:string) {
  // No await until the coherent SQLite snapshot has completed under the lease.
  store.verify();
  const scratch=mkdtempSync(join(tmpdir(),"klh-private-checkpoint-"));
  try {
    const target=join(scratch,"snapshot.sqlite");store.db.prepare("VACUUM INTO ?").run(target);
    const db=readFileSync(target),manifest={format:"klh-private-checkpoint",version:1,schemaHash:PRIVATE_SCHEMA_HASH,synthetic:store.synthetic,sha256:sha256(db),createdAt:new Date().toISOString(),sessionsInvalidatedOnRestore:true};
    return await encryptArchive(Buffer.from(JSON.stringify({manifest,database:db.toString("base64")})),password);
  } finally {rmSync(scratch,{recursive:true,force:true});}
}
export async function writeCheckpoint(store:RecordsDatabase,destination:string,password:string) {
  const target=resolve(destination),parent=ownedDirectory(dirname(target));
  if(target.startsWith(store.root+"/")||existsSync(target))throw new AppError("BACKUP_DESTINATION_UNSAFE",409);
  const bytes=await snapshotArchive(store,password),stage=join(parent,".archive-"+randomBytes(16).toString("hex"));
  try {
    const fd=openSync(stage,"wx",0o600);
    try {writeFileSync(fd,bytes);fsyncSync(fd);}finally{closeSync(fd);}
    linkSync(stage,target);const dir=openSync(parent,"r");try{fsyncSync(dir);}finally{closeSync(dir);}
  }finally{if(existsSync(stage))unlinkSync(stage);}
  return {format:"klh-private-archive",sha256:sha256(bytes),sizeBytes:bytes.length};
}
export async function restoreArchive(bytes:Buffer,destination:string,password:string,synthetic:boolean) {
  const target=resolve(destination);if(existsSync(target))throw new AppError("RESTORE_TARGET_EXISTS",409);
  let parsed: {manifest:{format:string;version:number;schemaHash:string;synthetic:boolean;sha256:string};database:string};
  try {parsed=JSON.parse((await decryptArchive(bytes,password)).toString());}
  catch(e){if(e instanceof AppError)throw e;throw new AppError("BACKUP_MANIFEST_INVALID",422);}
  if(parsed.manifest?.format!=="klh-private-checkpoint"||parsed.manifest.version!==1||parsed.manifest.schemaHash!==PRIVATE_SCHEMA_HASH||parsed.manifest.synthetic!==synthetic||typeof parsed.database!=="string")throw new AppError("BACKUP_MANIFEST_INVALID",422);
  const db=Buffer.from(parsed.database,"base64");if(sha256(db)!==parsed.manifest.sha256)throw new AppError("BACKUP_HASH_MISMATCH",422);
  const parent=ownedDirectory(dirname(target)),stage=mkdtempSync(join(parent,".restore-"));
  let store:RecordsDatabase|undefined;
  try {
    writeFileSync(join(stage,"private.sqlite"),db,{flag:"wx",mode:0o600});
    store=new RecordsDatabase(stage,synthetic);store.verify();
    store.transaction(()=>{store!.db.exec("UPDATE metadata SET epoch=epoch+1;UPDATE private_sessions SET revoked=1;");store!.audit("restored_sessions_revoked");});
    store.close();store=undefined;
    // The destination stays exclusive: mkdir never overwrites an existing service.
    mkdirSync(target,{mode:0o700});
    try {
      const {copyFileSync,constants}=await import("node:fs");
      copyFileSync(join(stage,"private.sqlite"),join(target,"private.sqlite"),constants.COPYFILE_EXCL);
    }catch(e){rmSync(target,{recursive:true,force:true});throw e;}
    return {status:"RESTORED",schemaVersion:1,sessionsRevoked:true};
  }finally{store?.close();rmSync(stage,{recursive:true,force:true});}
}
