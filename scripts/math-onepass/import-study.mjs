// Only fixed authored source blobs. Never reads an old workspace or learner files.
import { stripTypeScriptTypes } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
const base = ".evidence/math-onepass/source",
  out = "packages/math-training/source",
  manifest = JSON.parse(
    fs.readFileSync(".evidence/math-onepass/selected-source.json", "utf8"),
  ),
  sha = (b) => createHash("sha256").update(b).digest("hex"),
  proof = [];
function source(p) {
  const b = fs.readFileSync(path.join(base, p)),
    row = manifest.find((x) => x.path === p);
  if (!row || sha(b) !== row.sha256) throw Error("SOURCE_MISMATCH " + p);
  return { b, row };
}
function copy(p, adapt, targetPath = p) {
  const { b, row } = source(p);
  const result = adapt
      ? adapt(b.toString())
      : { text: b.toString(), notes: [] },
    target = path.join(out, targetPath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, result.text);
  proof.push({
    sourcePath: p,
    sourceGitRef: row.gitRef,
    sourceBlob: row.gitBlob,
    sourceSha256: row.sha256,
    target,
    targetSha256: sha(result.text),
    adaptations: result.notes,
  });
}
for (const p of [
  "shared/withdrawn-checks.mjs",
  "shared/widget-state.mjs",
  "shared/operation-models.mjs",
  "shared/hands-on-models.mjs",
  "shared/textbook-models.mjs",
  "shared/core-models.mjs",
  "shared/length-model.mjs",
  "shared/thinking-tools.mjs",
  "shared/learning-evidence.mjs",
  "server/review-schedule.mjs",
  "server/thinking-store.mjs",
  "content/pilot/clarity-errata.mjs",
  "content/pilot/inverse-revisions.mjs",
  "content/pilot/thinking-deeper-variants.mjs",
])
  copy(p);
copy("server/pilot-store.mjs", (text) => {
  text = text.replace("import {ensureFriend} from './pet-care.mjs';\n", "");
  const a = text.indexOf("function credit("),
    b = text.indexOf("export function saveReading", a);
  if (a < 0 || b < 0) throw Error("REWARD_ADAPTATION_ANCHOR");
  text = text.slice(0, a) + text.slice(b);
  text = text.replace(
    "    const d=st.daily[day(now)]??={tasks:0,completion:0};let paid=0;",
    "    const paid=0;",
  );
  const start = text.indexOf(
      "    if(verdict.status==='correct'){",
      text.indexOf("export function submitTask"),
    ),
    end = text.indexOf("    const evidence=", start);
  if (start < 0 || end < 0) throw Error("TASK_REWARD_ANCHOR");
  text = text.slice(0, start) + text.slice(end);
  const core = text.indexOf(
      "      if(s.setName==='core'){",
      text.indexOf("export function submitTask"),
    ),
    complete = text.indexOf("      completeReviewEvidence", core);
  if (core < 0 || complete < 0) throw Error("PET_REWARD_ANCHOR");
  text = text.slice(0, core) + text.slice(complete);
  text = text
    .replace("dailyCap:d.tasks>=30", "dailyCap:false")
    .replaceAll("p.settings.reviewDays", "[1,3,7,21]");
  if (/p\.(wallet|pets|settings)|ensureFriend|credit\(/.test(text))
    throw Error("REWARD_COUPLING_REMAINS");
  return {
    text,
    notes: [
      "Remove wallet credit, entitlement/daily reward accounting, pet growth and completion bonus. Preserve reading revisions, notes, sessions, immutable first answers, self-check gates, mathematical grading, human explanation review and review scheduling. paid/completionPaid remain zero for source response compatibility; use the original 1/3/7/21-day schedule without a personal settings dependency.",
    ],
  };
});
copy(
  "src/learningMap.ts",
  (text) => ({
    text: stripTypeScriptTypes(text),
    notes: [
      "Erase TypeScript types only; original learning entry, due review, resume and mistake/evidence selectors retained. Data adapter supplies only installed synthetic course state.",
    ],
  }),
  "src/learningMap.mjs",
);
// Evaluate only this curated authored content module in the ignored source copy.
// It reads one fixed course-plan JSON, not any learner profile or inbox.
for (const p of [
  "content/pilot/thinking-source.mjs",
  "content/pilot/thinking-publication.mjs",
  "content/pilot/thinking-hints.mjs",
  "content/course-plan-v2/grade-3-thinking.json",
])
  source(p);
const { thinkingCards } = await import(
    pathToFileURL(path.resolve(base, "content/pilot/thinking-source.mjs")).href
  ),
  allowed = JSON.parse(
    fs.readFileSync("apps/preview/library/private/bank.json", "utf8"),
  )
    .entries.filter((e) => e.kind === "thinking")
    .map((e) => e.id),
  cards = thinkingCards.filter(
    (t) => allowed.includes(t.id) && t.publicationStatus === "guided-study",
  );
if (cards.length !== 17) throw Error("THINKING_RELEASE_MISMATCH");
copy("content/pilot/thinking-source.mjs", () => ({
  text:
    "// Only the 17 reviewed authored cards. No deferred cards.\nexport const thinkingCards=" +
    JSON.stringify(cards, null, 2) +
    ";\n",
  notes: [
    "Resolve authored course plan/hints/editorial publication into exactly the 17 existing published cards; 43 deferred cards are absent. No learner state.",
  ],
}));
const { thinkingHints } = await import(
  pathToFileURL(path.resolve(base, "content/pilot/thinking-hints.mjs")).href
);
copy("content/pilot/thinking-hints.mjs", () => ({
  text:
    "const hints=" +
    JSON.stringify(
      Object.fromEntries(allowed.map((id) => [id, thinkingHints(id)])),
      null,
      2,
    ) +
    ";\nexport const thinkingHints=id=>hints[id]??[];\n",
  notes: ["Hints restricted to the same 17 published cards."],
}));
copy("content/pilot/thinking-variants.mjs", (text) => ({
  text:
    "import {thinkingCards} from './thinking-source.mjs';\n" +
    text.replace(
      "export function thinkingVariant(id, index) {",
      "export function thinkingVariant(id, index) {\n  if(!thinkingCards.some(t=>t.id===id))throw Error('THINKING_NOT_RELEASED');",
    ),
  notes: [
    "Existing authored variant factories and arithmetic retained; entry rejects every unpublished card ID.",
  ],
}));
fs.writeFileSync(
  "docs/implementation/evidence/math-onepass/study-source.json",
  JSON.stringify(
    {
      sourceRef: manifest[0].gitRef,
      privateFilesRead: false,
      rewardsEnabled: false,
      thinkingCards: 17,
      deferredImported: 0,
      sources: proof,
      contentDependencies: [
        "content/pilot/thinking-publication.mjs",
        "content/course-plan-v2/grade-3-thinking.json",
      ].map((p) => source(p).row),
    },
    null,
    2,
  ) + "\n",
);
console.log("STUDY_DOMAIN_IMPORTED_17_CARDS_NO_REWARDS");
