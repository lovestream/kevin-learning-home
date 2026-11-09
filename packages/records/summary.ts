import type { Principal } from "./contracts.ts";
import type { PrivateRecords } from "./service.ts";
import { migrationSummary } from "./migration.ts";
import { object, sourceState } from "./review.ts";

const count = (v: unknown) => Array.isArray(v) ? v.length : Object.keys(object(v) ?? {}).length;
/** Parent-only projection. Counts are records, NOT correct answers or mastery.
 * No answers, comments, learner dates, wallet balances or unknown private fields
 * enter this shared summary. Existing subject engines retain their authority.
 */
export function recordsSummary(records: PrivateRecords, p: Principal, learner: string) {
  records.access.authorize(p, learner, "parent");
  const subjects = (["math", "english"] as const).map(subjectId => {
    const current = records.subject(p, learner, subjectId);
    if (current.payload === null) return {subjectId, revision: 0, available: false} as const;
    const audit = migrationSummary(current.payload), state = sourceState(subjectId, current.payload);
    const studio = object(state?.studio), self = object(object(studio?.detective)?.selfTraining);
    const quarantined = audit.quarantined > 0 || !state;
    const counts = quarantined ? null : subjectId === "math"
      ? {reading: count(studio?.reading), sessions: count(studio?.sessions), thinking: count(studio?.thinking), detectiveAttempts: count(self?.attempts)}
      : {words: count(state?.progress), unresolvedWords: count(state?.orphanProgress), attemptEvents: count(state?.attemptEvents), recognitionEvents: count(state?.recognitionEvents)};
    return {subjectId, revision: current.revision, available: true, schemaVersion: current.schemaVersion,
      contentVersion: current.contentVersion, archiveOnly: quarantined, counts,
      snapshotCount: Number(records.store.db.prepare("SELECT count(*) n FROM source_snapshots WHERE learner_id=? AND subject_id=?").get(learner, subjectId)!.n),
      reviewReferenceCount: Number(records.store.db.prepare("SELECT count(*) n FROM private_review_index WHERE learner_id=? AND subject_id=?").get(learner, subjectId)!.n),
      historicalSummaryOnly: subjectId === "english" && state?.schemaVersion === 1,
      unknownFieldsRetained: true, coinsIssued: 0} as const;
  });
  const exploration = records.list(p, learner);
  return {subjects, exploration: {projects: exploration.length, events: exploration.reduce((n, x) => n + x.events.length, 0)},
    rewardsActive: false, coinsIssued: 0, evidencePolicy: "records-are-not-mastery-v1"} as const;
}
export type RecordsSummary = ReturnType<typeof recordsSummary>;
