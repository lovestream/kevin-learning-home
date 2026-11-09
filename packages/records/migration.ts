import { DatabaseSync,backup } from "node:sqlite";
import { readFileSync,writeFileSync,mkdirSync,existsSync,lstatSync,realpathSync,chmodSync,rmSync } from "node:fs";
import { join,resolve,dirname } from "node:path";
import { AppError,sha256 } from "../contracts/index.ts";
import { ownedDirectory } from "../platform/store.ts";
export type Leaf={path:string;kind:string;sha256:string;bytes:number;disposition:"exact"|"deferred-wallet"|"quarantined"};
/** Lexical inventory: numbers and duplicate keys never pass through a lossy
 * stringify. Report paths/hashes stay private; public reports contain counts only.
 */
export function leafInventory(raw:string):Leaf[] {
  JSON.parse(raw);let offset=0;const leaves:Leaf[]=[];
  const ws=()=>{while(/\s/.test(raw[offset]??"")&&offset<raw.length)offset++;};
  const string=()=>{const start=offset++;while(offset<raw.length){if(raw[offset++]==='"')break;if(raw[offset-1]==="\\")offset++;}return raw.slice(start,offset);};
  const visit=(path:string,depth:number,quarantined=false)=>{
    if(depth>64||leaves.length>300_000)throw new AppError("MIGRATION_STRUCTURE_LIMIT",413);ws();const start=offset,c=raw[offset];
    if(c==="{"||c==="[") {
      const object=c==="{",end=object?"}":"]",keys=new Set<string>();offset++;ws();let index=0;
      if(raw[offset]!==end)while(true){
        let key=String(index++),duplicate=false;
        if(object){ws();key=JSON.parse(string());duplicate=keys.has(key);keys.add(key);ws();offset++;}
        visit(path+"/"+key.replace(/~/g,"~0").replace(/\//g,"~1")+(duplicate?"#duplicate-"+index:""),depth+1,quarantined||duplicate);ws();if(raw[offset]!==",")break;offset++;
      }
      offset++;
      if(index)return;
    }else if(c==='"')string();
    else {while(offset<raw.length&&!/[\s,}\]]/.test(raw[offset]))offset++;}
    const token=raw.slice(start,offset),kind=c==="{"?"empty-object":c==="["?"empty-array":c==='"'?"string":token==="null"?"null":["true","false"].includes(token)?"boolean":"number";
    leaves.push({path,kind,bytes:Buffer.byteLength(token),sha256:sha256(token),disposition:quarantined?"quarantined":/\/(wallet|pets|inventory|entitlements|coins|xp)(\/|$)/i.test(path)?"deferred-wallet":"exact"});
  };
  visit("",0);return leaves;
}
export function migrationSummary(raw:string) {
  const inventory=leafInventory(raw);return {payloadSha256:sha256(raw),leaves:inventory.length,assigned:inventory.length,silentLoss:0,exact:inventory.filter(x=>x.disposition==="exact").length,deferredWallet:inventory.filter(x=>x.disposition==="deferred-wallet").length,quarantined:inventory.filter(x=>x.disposition==="quarantined").length,walletReplayed:false};
}
/** Only creates a new private snapshot. Never instantiates old store.mjs or
 * normalizers (which can write/upgrade pets). Online backup includes WAL commits.
 */
export async function snapshotMathSource(source:string,destination:string) {
  const from=resolve(source),target=resolve(destination);
  if(realpathSync(from)!==from||lstatSync(from).isSymbolicLink()||!lstatSync(from).isFile())throw new AppError("SOURCE_PATH_UNSAFE",422);
  if(existsSync(target)||target.startsWith(dirname(from)+"/"))throw new AppError("NEW_PRIVATE_SNAPSHOT_REQUIRED",409);
  const parent=ownedDirectory(dirname(target));mkdirSync(target,{mode:0o700});
  let db:DatabaseSync|undefined;
  try {
    db=new DatabaseSync(from,{readOnly:true});const dbPath=join(target,"source.sqlite");await backup(db,dbPath);db.close();db=undefined;chmodSync(dbPath,0o600);
    const snapshot=new DatabaseSync(dbPath,{readOnly:true});let raw:string;
    try {if(snapshot.prepare("PRAGMA integrity_check").get()!.integrity_check!=="ok")throw new AppError("SOURCE_INTEGRITY",422);const rows=snapshot.prepare("SELECT id,payload FROM progress").all();if(rows.length!==1||rows[0].id!==1)throw new AppError("SOURCE_SHAPE",422);raw=String(rows[0].payload);}finally{snapshot.close();}
    const inventory=leafInventory(raw),summary=migrationSummary(raw);
    writeFileSync(join(target,"payload.json"),raw,{flag:"wx",mode:0o600});
    const receipt={format:"klh-math-readonly-snapshot-v1",sourceDatabaseSha256:sha256(readFileSync(dbPath)),payloadSha256:summary.payloadSha256,summary};
    writeFileSync(join(target,"inventory.private.json"),JSON.stringify(inventory),{flag:"wx",mode:0o600});
    writeFileSync(join(target,"receipt.private.json"),JSON.stringify(receipt),{flag:"wx",mode:0o600});
    return receipt;
  }catch(e){rmSync(target,{recursive:true,force:true});throw e;}finally{db?.close();}
}
export function englishEnvelope(raw:string) {
  let value;
  try { value=JSON.parse(raw); } catch {throw new AppError("ENGLISH_SOURCE_INVALID",422);}
  if(!value||typeof value!=="object"||Array.isArray(value))throw new AppError("ENGLISH_SOURCE_INVALID",422);
  const portable=value.format==="kevin-word-quest-portable-record";
  if(value.format!==undefined&&!portable)throw new AppError("ENGLISH_VERSION_UNSUPPORTED",422);
  if(portable&&(![1,2].includes(value.formatVersion)||!value.state||typeof value.state!=="object"||Array.isArray(value.state)))throw new AppError("ENGLISH_VERSION_UNSUPPORTED",422);
  // ADAPT: Word Quest app.js createPortableRecord/stateFromPortableRecord at d0b42a8.
  // Preserve the whole envelope, summary, orphanProgress and unknown fields. Do
  // not run mergeState or reaward historical xp/coins during an import.
  const state=portable?value.state:value;
  if(![1,2].includes(state.schemaVersion))throw new AppError("ENGLISH_VERSION_UNSUPPORTED",422);
  for(const key of ["settings","stats","progress"])
    if(!state[key]||typeof state[key]!=="object"||Array.isArray(state[key]))throw new AppError("ENGLISH_SOURCE_INVALID",422);
  return {format:portable?"wordquest-portable-v"+value.formatVersion:"wordquest-state-v"+(state.schemaVersion??1),payload:raw,inventory:leafInventory(raw),sourceSha256:sha256(raw),walletReplayed:false};
}
