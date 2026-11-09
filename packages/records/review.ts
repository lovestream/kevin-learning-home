import type { RecordsDatabase } from "./database.ts";
import { leafInventory } from "./migration.ts";

type Row = Record<string, unknown>;
export const object = (value: unknown): Row | undefined =>
  value !== null && typeof value === "object" && !Array.isArray(value) ? value as Row : undefined;
export function sourceState(subject: string, raw: string): Row | undefined {
  const root = object(JSON.parse(raw));
  if (!root) return;
  if (root.format === undefined) return root;
  if (subject === "math" && root.format === "kevin-math-lab" && root.version === 1) return object(root.progress);
  if (subject === "english" && root.format === "kevin-word-quest-portable-record" && [1, 2].includes(root.formatVersion as number)) return object(root.state);
}
export type ReviewEntry = { namespace: string; contentId: string; dueRaw: string };
/** Lookup, never a new scheduler. Nulls, local date strings and epoch values keep
 * their original meaning. A paused/retired/unresolved row is NOT an invitation
 * to start a task: the original subject engine must decide that separately.
 */
export function reviewEntries(subject: string, raw: string): ReviewEntry[] {
  // Duplicate JSON keys can be archived exactly, but must not become a silently
  // last-key-wins review plan. The offline inventory flags them for resolution.
  if (leafInventory(raw).some(x => x.disposition === "quarantined")) return [];
  const p = sourceState(subject, raw);
  if (!p) return [];
  const studio = object(p.studio), detective = object(studio?.detective), self = object(detective?.selfTraining);
  const groups: [string, unknown, boolean][] = subject === "math"
    ? [["legacy", p.reviews, false], ["studio", studio?.review, false], ["thinking", studio?.thinking, true], ["detective-self", self?.schedules, false]]
    : subject === "english" ? [["english", p.progress, false], ["english-unresolved", p.orphanProgress, false]] : [];
  const entries: ReviewEntry[] = [];
  for (const [namespace, group, nested] of groups) {
    for (const [contentId, value] of Object.entries(object(group) ?? {})) {
      const row = nested ? object(object(value)?.review) : object(value);
      if (!row) continue;
      const field = ["dueAt", "nextReviewAt", "due", "dueDay"].find(k => Object.hasOwn(row, k));
      if (!field) continue;
      const due = row[field];
      if (due === null || typeof due === "string" || (typeof due === "number" && Number.isFinite(due)))
        entries.push({namespace, contentId, dueRaw: JSON.stringify(due)});
    }
  }
  return entries;
}
export function rebuildReviewIndex(store: RecordsDatabase, learner: string, subject: string, revision: number, raw: string) {
  const entries = reviewEntries(subject, raw);
  store.db.prepare("DELETE FROM private_review_index WHERE learner_id=? AND subject_id=?").run(learner, subject);
  const insert = store.db.prepare("INSERT INTO private_review_index VALUES(?,?,?,?,?,?)");
  for (const e of entries) insert.run(learner, subject, e.namespace, e.contentId, revision, e.dueRaw);
}
/** Upgrade the disposable projection, never the source bytes or study history. */
export function rebuildAllReviewIndexes(store: RecordsDatabase) {
  store.transaction(() => {
    for (const row of store.db.prepare("SELECT learner_id,subject_id,revision,payload FROM private_subject_state").all())
      rebuildReviewIndex(store, String(row.learner_id), String(row.subject_id), Number(row.revision), String(row.payload));
  });
}
