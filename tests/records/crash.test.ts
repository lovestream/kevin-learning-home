import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { join } from "node:path";
import { fixture } from "./helpers.ts";
import { RecordsDatabase } from "../../packages/records/database.ts";
test("SIGKILL before/after commit releases kernel flock; only committed facts survive",async()=>{
  const f=await fixture();f.store.close();
  try{
    for(const phase of ["uncommitted","committed"]){
      const child=spawn(process.execPath,["tests/records/crash-child.ts",join(f.root,"records"),phase],{stdio:["ignore","pipe","pipe"]});
      try{
        await new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>reject(Error("CHILD_READY_TIMEOUT")),10000);child.stdout.once("data",()=>{clearTimeout(timer);resolve();});child.once("error",reject);child.once("exit",()=>{clearTimeout(timer);reject(Error("CHILD_EXITED_EARLY"));});});
        const exited=new Promise<void>(resolve=>child.once("exit",()=>resolve()));child.kill("SIGKILL");await exited;
        const db=new RecordsDatabase(join(f.root,"records"),true);try{db.verify();assert(db.ready());const count=Number(db.db.prepare("SELECT count(*) n FROM private_audit WHERE action=?").get("synthetic_"+phase)!.n);assert.equal(count,phase==="committed"?1:0);}finally{db.close();}
      }finally{if(child.exitCode===null&&child.signalCode===null)child.kill("SIGKILL");}
    }
  }finally{f.close();}
});
