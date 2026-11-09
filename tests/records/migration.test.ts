import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync,rmSync,readFileSync,realpathSync,existsSync,mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { leafInventory,migrationSummary,snapshotMathSource,englishEnvelope } from "../../packages/records/migration.ts";
import { fixture } from "./helpers.ts";
test("lexical migration inventory assigns every leaf including empty structures, duplicates and large numbers",()=>{
  const raw='{"unknown":{"huge":9007199254740993,"empty":[],"null":null},"wallet":{"coins":12},"same":1,"same":2}';
  const inventory=leafInventory(raw),summary=migrationSummary(raw);
  assert.equal(inventory.length,6);assert.equal(summary.assigned,summary.leaves);assert.equal(summary.silentLoss,0);assert.equal(summary.deferredWallet,1);assert.equal(summary.quarantined,1);
  assert(inventory.some(x=>x.path.includes("duplicate")));assert(!JSON.stringify(inventory).includes("9007199254740993"));
  assert.throws(()=>leafInventory('{"broken":}'));
});
test("SQLite Backup API captures synthetic WAL without starting or normalizing old source",async()=>{
  const root=realpathSync(mkdtempSync(join(tmpdir(),"klh-snapshot-synthetic-")));mkdirSync(join(root,"source"),{mode:0o700});const source=join(root,"source","old.sqlite"),db=new DatabaseSync(source);
  try{
    db.exec("PRAGMA journal_mode=WAL;CREATE TABLE progress(id INTEGER PRIMARY KEY,payload TEXT NOT NULL);");
    const raw='{ "studio":{"sessions":{"old-coding":{"version":"2026-old","firstAnswer":null}}},"unknown":[3,1],"pets":{"xp":99} }';
    db.prepare("INSERT INTO progress VALUES(1,?)").run(raw);
    const result=await snapshotMathSource(source,join(root,"snapshot"));
    assert.equal(readFileSync(join(root,"snapshot","payload.json"),"utf8"),raw);assert.equal(result.summary.silentLoss,0);
    assert.equal(db.prepare("SELECT payload FROM progress").get()!.payload,raw);assert(existsSync(source+"-wal"));
    await assert.rejects(snapshotMathSource(source,join(root,"snapshot")),/NEW_PRIVATE_SNAPSHOT_REQUIRED/);
  }finally{db.close();rmSync(root,{recursive:true,force:true});}
});
test("synthetic English V1/V2 portable/raw formats preserve orphan fields and do not normalize/reaward",()=>{
  for(const version of [1,2]){
    const state={schemaVersion:version,settings:{bank:"ket"},progress:{"old-word":{nextReviewAt:1790000000000,spelling:{first:"synthetic",selfChecks:[true,false,true]}}},orphanProgress:{unmatched:{first:null}},stats:{xp:10,coins:2},future:{order:[2,1]}};
    for(const value of [state,{format:"kevin-word-quest-portable-record",formatVersion:version,exportedAt:"2026-11-01T00:00:00+08:00",summary:{xp:10},state}]){
      const raw=JSON.stringify(value),r=englishEnvelope(raw);assert.equal(r.payload,raw);assert.equal(r.walletReplayed,false);assert(r.inventory.some(x=>x.path.includes("orphanProgress")));
    }
  }
  assert.throws(()=>englishEnvelope('{"format":"kevin-word-quest-portable-record","formatVersion":99,"state":{}}'),/ENGLISH_VERSION_UNSUPPORTED/);
});
test("review projection retains namespaces, raw timezone/epoch and cannot invent mastery or reward",async()=>{
  const f=await fixture();try{
    const raw='{"reviews":{"same":{"dueAt":"2026-11-04T00:00:00+08:00","firstLearnedAt":null}},"studio":{"review":{"same":{"dueAt":"2026-11-04T16:00:00Z","successDates":[]}}},"unknown":false}';
    f.records.importSnapshot(f.learnerId,"math",Buffer.from(raw),"old","legacy",0,randomUUID());
    const rows=f.store.db.prepare("SELECT namespace,due_raw FROM private_review_index ORDER BY namespace").all();assert.equal(rows.length,2);assert.equal(rows[0].due_raw,'"2026-11-04T00:00:00+08:00"');assert.equal(rows[1].due_raw,'"2026-11-04T16:00:00Z"');
    assert.equal(f.records.subject(f.child,f.learnerId,"math").payload,raw);
  }finally{f.close();}
});
