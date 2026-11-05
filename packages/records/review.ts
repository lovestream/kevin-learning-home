import type { RecordsDatabase } from "./database.ts";
// Rebuildable lookup only: original schedules/anchors/unknown fields remain in
// subject payload and immutable source snapshots. No day/timezone conversion.
export function rebuildReviewIndex(store:RecordsDatabase,learner:string,subject:string,revision:number,raw:string) {
  const value=JSON.parse(raw),p=value.format==="kevin-math-lab"?value.progress:value.format==="kevin-word-quest-portable-record"?value.state:value;
  store.db.prepare("DELETE FROM private_review_index WHERE learner_id=? AND subject_id=?").run(learner,subject);
  const insert=store.db.prepare("INSERT INTO private_review_index VALUES(?,?,?,?,?,?)");
  const groups:[[string,unknown],[string,unknown],[string,unknown]]=[["legacy",p.reviews],["studio",p.studio?.review],["english",p.progress]];
  for(const [namespace,group] of groups) {
    if(!group||typeof group!=="object"||Array.isArray(group))continue;
    for(const [id,row] of Object.entries(group)) {
      if(!row||typeof row!=="object")continue;
      const r=row as Record<string,unknown>,due=r.dueAt??r.nextReviewAt??r.due;
      if(due!==undefined)insert.run(learner,subject,namespace,id,revision,JSON.stringify(due));
    }
  }
}
