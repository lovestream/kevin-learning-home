import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { reviewEntries, rebuildReviewIndex, rebuildAllReviewIndexes } from "../../packages/records/review.ts";
import { englishEnvelope } from "../../packages/records/migration.ts";
import { recordsSummary } from "../../packages/records/summary.ts";
import { fixture } from "./helpers.ts";

const english = (version = 2) => ({schemaVersion: version, settings: {bank: "ket"}, stats: {coins: 23, learned: 999}, progress: {same: {dueAt: 1790000000000}}, orphanProgress: {same: {dueAt: null}}, future: {order: [2,1,null]}});
test("review lookup covers every math namespace and English raw/portable state without inventing schedules", () => {
  const math = {reviews: {same: {dueAt: "2026-11-10T00:00:00+08:00"}}, studio: {review: {same: {dueAt: null, nextReviewAt: "must-not-use"}}, thinking: {same: {review: {dueAt: "2026-11-10T16:00:00Z"}}}, detective: {selfTraining: {schedules: {same: {dueDay: "2026-11-11", paused: true}}}}}, progress: {wrongSubject: {dueAt: 1}}};
  const expected = [["legacy", '"2026-11-10T00:00:00+08:00"'], ["studio", "null"], ["thinking", '"2026-11-10T16:00:00Z"'], ["detective-self", '"2026-11-11"']];
  for (const value of [math, {format: "kevin-math-lab", version: 1, progress: math}])
    assert.deepEqual(reviewEntries("math", JSON.stringify(value)).map(r => [r.namespace,r.dueRaw]), expected);
  for (const version of [1, 2]) for (const value of [english(version), {format: "kevin-word-quest-portable-record", formatVersion: version, state: english(version)}]) {
    const raw = JSON.stringify(value);
    assert.equal(englishEnvelope(raw).payload, raw);
    assert.deepEqual(reviewEntries("english", raw).map(r => [r.namespace, r.dueRaw]), [["english", "1790000000000"], ["english-unresolved", "null"]]);
  }
  assert.deepEqual(reviewEntries("math", '{"format":"future","reviews":{"x":{"dueAt":1}}}'), []);
  assert.deepEqual(reviewEntries("math", '{"reviews":{"same":{"dueAt":1,"dueAt":2}}}'), []);
  assert.deepEqual(reviewEntries("math", '{"reviews":{"x":{"dueAt":{"unexpected":1}}}}'), []);
});
test("English imports reject future/incomplete formats before writes and retain every V1/V2 source byte", async () => {
  const f = await fixture();try {
    for (const version of [1, 2]) {
      const value = {format: "kevin-word-quest-portable-record", formatVersion: version, state: english(version), unknownEnvelope: null};
      const raw = JSON.stringify(value).replace('"unknownEnvelope":null', '"unknownEnvelope":9007199254740993');
      const revision = f.records.subject(f.parent, f.learnerId, "english").revision;
      const request = randomUUID();
      const first = f.records.importSnapshot(f.learnerId,"english",Buffer.from(raw),"d0b42a8",`wordquest-v${version}`,revision,request);
      assert.equal(f.records.importSnapshot(f.learnerId,"english",Buffer.from(raw),"d0b42a8",`wordquest-v${version}`,revision,request).snapshotId, first.snapshotId);
      assert.equal(f.records.subject(f.parent, f.learnerId, "english").payload,raw);
      assert.equal(recordsSummary(f.records, f.parent, f.learnerId).subjects[1].historicalSummaryOnly, version === 1);
    }
    const before = f.records.subject(f.parent, f.learnerId,"english");
    for (const invalid of [{schemaVersion:3}, {schemaVersion:2,settings:{},stats:{},progress:[]}, {format:"unknown",...english()}, {format:"kevin-word-quest-portable-record",formatVersion:99,state:english()}, {schemaVersion:2}]) {
      assert.throws(() => f.records.importSnapshot(f.learnerId,"english",Buffer.from(JSON.stringify(invalid)),"future","future",before.revision,randomUUID()), /ENGLISH_/);
      assert.deepEqual(f.records.subject(f.parent,f.learnerId,"english"),before);
    }
    assert.equal(f.records.subject(f.parent,f.learnerId,"math").revision,0);
    const facts=f.store.db.prepare("SELECT fact FROM private_events").all();assert.equal(facts.length,2);assert(facts.every(x=>String(x.fact).includes('"walletReplayed":false')));
  } finally {f.close();}
});
test("unified parent projection has scoped factual counts, no fabricated mastery, answers or wallet", async () => {
  const f=await fixture();try {
    const raw=JSON.stringify({schemaVersion:1,studio:{sessions:{legacy:{firstAnswer:"PRIVATE ANSWER"}},reading:{old:{}},thinking:{card:{review:{dueAt:null}}},detective:{selfTraining:{attempts:{old:{first:"SECRET"}}}}},wallet:{coins:999},privateExtension:"PRIVATE NOTE"});
    f.records.importSnapshot(f.learnerId,"math",Buffer.from(raw),"old-content","legacy",0,randomUUID());
    f.records.importSnapshot(f.learnerId,"english",Buffer.from(JSON.stringify(english(1))),"old-english","wordquest-v1",0,randomUUID());
    const p=f.create("PRIVATE QUESTION");
    f.records.append(f.child,f.learnerId,p.projectId,{requestId:randomUUID(),expectedRevision:0,detail:{kind:"hypothesis_submitted",text:"PRIVATE GUESS",assistance:"none"}});
    const summary=recordsSummary(f.records,f.parent,f.learnerId),json=JSON.stringify(summary);
    assert.deepEqual(summary.subjects[0].counts,{reading:1,sessions:1,thinking:1,detectiveAttempts:1});
    assert.equal(summary.exploration.projects,1);assert.equal(summary.exploration.events,1);
    assert.equal(summary.coinsIssued,0);assert.equal(summary.rewardsActive,false);
    for (const hidden of ["PRIVATE", "SECRET", "999", "mastered", "firstAnswer"]) assert(!json.includes(hidden),hidden);
    assert.throws(()=>recordsSummary(f.records,f.child,f.learnerId),/ROLE_FORBIDDEN/);
    assert.throws(()=>recordsSummary(f.records,{...f.child,role:"parent"},f.learnerId),/ROLE_FORBIDDEN/);
    assert.throws(()=>recordsSummary(f.records,f.parent,randomUUID()),/NOT_FOUND/);
    assert.equal(f.records.subject(f.parent,f.learnerId,"math").payload,raw);
  } finally {f.close();}
});
test("rebuild replaces stale dates atomically; duplicate sources stay archived without misleading counts", async () => {
  const f=await fixture();try {
    const raw='{ "reviews":{"a":{"dueAt":1}}, "same":1,"same":2 }';
    f.records.importSnapshot(f.learnerId,"math",Buffer.from(raw),"ambiguous","legacy",0,randomUUID());
    const summary=recordsSummary(f.records,f.parent,f.learnerId).subjects[0];assert.equal(summary.archiveOnly,true);assert.equal(summary.counts,null);
    assert.equal(f.records.subject(f.parent,f.learnerId,"math").payload,raw);
    f.store.transaction(()=>rebuildReviewIndex(f.store,f.learnerId,"math",2,'{"reviews":{"old":{"dueAt":1}}}'));
    f.store.transaction(()=>rebuildReviewIndex(f.store,f.learnerId,"math",3,'{"studio":{"thinking":{"new":{"review":{"dueAt":null}}}}}'));
    const rows=f.store.db.prepare("SELECT namespace,content_id,source_revision,due_raw FROM private_review_index").all();
    assert.equal(rows.length,1);assert.equal(rows[0].content_id,"new");assert.equal(rows[0].namespace,"thinking");assert.equal(rows[0].source_revision,3);assert.equal(rows[0].due_raw,"null");
    f.store.db.exec("CREATE TEMP TRIGGER fail_projection BEFORE INSERT ON private_review_index BEGIN SELECT RAISE(ABORT,'INJECTED_INDEX_FAILURE'); END;");
    assert.throws(()=>f.store.transaction(()=>rebuildReviewIndex(f.store,f.learnerId,"math",4,'{"reviews":{"lost":{"dueAt":2}}}')),/INJECTED_INDEX_FAILURE/);
    assert.deepEqual(f.store.db.prepare("SELECT namespace,content_id,source_revision,due_raw FROM private_review_index").all(),rows);
  } finally {f.close();}
});

test("old derived indexes rebuild on upgrade without changing source revision, history or wallet", async () => {
  const f=await fixture();try {
    const raw='{"studio":{"thinking":{"card":{"review":{"dueAt":"2026-11-12T00:00:00+08:00"}}}},"wallet":{"coins":9},"future":{"huge":9007199254740993}}';
    f.records.importSnapshot(f.learnerId,"math",Buffer.from(raw),"old","legacy",0,randomUUID());
    const before=f.records.subject(f.parent,f.learnerId,"math"),facts=f.store.db.prepare("SELECT * FROM private_events").all();
    f.store.db.exec("DELETE FROM private_review_index");
    rebuildAllReviewIndexes(f.store);rebuildAllReviewIndexes(f.store);
    assert.equal(f.store.db.prepare("SELECT count(*) n FROM private_review_index").get()!.n,1);
    assert.deepEqual(f.records.subject(f.parent,f.learnerId,"math"),before);
    assert.deepEqual(f.store.db.prepare("SELECT * FROM private_events").all(),facts);
  } finally {f.close();}
});
