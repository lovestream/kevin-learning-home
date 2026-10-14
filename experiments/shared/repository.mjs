import { applyDomain, VERSION, NOW } from "./domain.mjs";
export const canonical = (v) => JSON.stringify(sortValue(v));
function sortValue(v) {
  return Array.isArray(v)
    ? v.map(sortValue)
    : v && typeof v === "object"
      ? Object.fromEntries(
          Object.keys(v)
            .sort()
            .map((k) => [k, sortValue(v[k])]),
        )
      : v;
}
export async function hash(value) {
  const bytes =
    typeof value === "string" ? new TextEncoder().encode(value) : value;
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
export function failure(code, status = 400) {
  return Object.assign(new Error(code), { code, status });
}
export async function chunks(value) {
  const text = canonical(value);
  const pieces = [];
  let offset = 0;
  // UTF16 slice kept well below D1's 2MB UTF8 field limit; don't split surrogate pairs.
  while (offset < text.length) {
    let end = Math.min(offset + 65536, text.length);
    if (end < text.length && /[\uD800-\uDBFF]/.test(text[end - 1])) end--;
    const payload = text.slice(offset, end);
    pieces.push({ payload, sha256: await hash(payload) });
    offset = end;
  }
  return { pieces, stateHash: await hash(text) };
}
export function validateCommand(c, key) {
  const keys = [
    "commandId",
    "expectedRevision",
    "contentVersion",
    "action",
    "attemptId",
    "answer",
  ];
  if (
    !c ||
    typeof c !== "object" ||
    Array.isArray(c) ||
    Object.keys(c).length !== keys.length ||
    keys.some((k) => !(k in c)) ||
    Object.keys(c).some((k) => !keys.includes(k))
  )
    throw failure("INVALID_INPUT");
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      c.commandId,
    ) ||
    key !== c.commandId ||
    !Number.isSafeInteger(c.expectedRevision) ||
    c.expectedRevision < 0 ||
    c.contentVersion !== VERSION ||
    ![
      "math.first",
      "math.help",
      "math.evidence",
      "math.submit",
      "english.answer",
    ].includes(c.action) ||
    typeof c.answer !== "string" ||
    c.answer.length > 200 ||
    !/^[a-zA-Z0-9._:-]{1,100}$/.test(c.attemptId)
  )
    throw failure("INVALID_INPUT");
}
export class LearningRepository {
  constructor(db) {
    this.db = db;
  }
  async ensure(learner, subject) {
    await this.db.run(
      "INSERT OR IGNORE INTO subject_states(learner,subject,revision,state_hash) VALUES(?,?,0,?)",
      [learner, subject, await hash("{}")],
    );
  }
  async state(learner, subject) {
    const snapshot = await this.db.batch([
      [
        "SELECT revision,state_hash FROM subject_states WHERE learner=? AND subject=?",
        [learner, subject],
      ],
      [
        "SELECT payload,sha256 FROM state_chunks WHERE learner=? AND subject=? ORDER BY part",
        [learner, subject],
      ],
    ]);
    const s = snapshot[0].results[0];
    if (!s) return { revision: 0, state: {} };
    const parts = snapshot[1].results;
    for (const p of parts)
      if ((await hash(p.payload)) !== p.sha256)
        throw failure("STATE_INTEGRITY", 503);
    const text = parts.map((p) => p.payload).join("") || "{}";
    if ((await hash(text)) !== s.state_hash)
      throw failure("STATE_INTEGRITY", 503);
    return { revision: s.revision, state: JSON.parse(text) };
  }
  async receipt(learner, id) {
    return this.db.first(
      "SELECT subject,request_hash,result,revision FROM receipts WHERE learner=? AND command_id=?",
      [learner, id],
    );
  }
  async replay(learner, subject, c, h) {
    const p = await this.receipt(learner, c.commandId);
    if (!p) return null;
    if (p.subject !== subject || p.request_hash !== h)
      throw failure("IDEMPOTENCY_CONFLICT", 409);
    const s = await this.db.first(
      "SELECT revision FROM subject_states WHERE learner=? AND subject=?",
      [learner, subject],
    );
    return {
      result: JSON.parse(p.result),
      committedRevision: p.revision,
      currentRevision: s.revision,
      duplicate: true,
    };
  }
  async commit(learner, subject, c, { injectFailure = false } = {}) {
    await this.ensure(learner, subject);
    const h = await hash(canonical({ subject, ...c }));
    const replay = await this.replay(learner, subject, c, h);
    if (replay) return replay;
    const before = await this.state(learner, subject);
    if (before.revision !== c.expectedRevision)
      throw failure("STALE_REVISION", 409);
    const outcome = applyDomain(before.state, subject, c, NOW),
      revision = before.revision + 1,
      data = await chunks(outcome.next);
    const result = {
      ...outcome.result,
      syntheticRewardPolicy: "bench-only-v1",
    };
    // Guard failure is a SQL CHECK failure inside the batch, not a silent UPDATE
    // of zero rows. A competing writer aborts receipt+state+event+reward together.
    const statements = [
      [
        "INSERT INTO receipts(learner,command_id,subject,request_hash,result,revision,cas_guard) VALUES(?,?,?,?,?,?,CASE WHEN (SELECT revision FROM subject_states WHERE learner=? AND subject=?)=? THEN 1 ELSE 0 END)",
        [
          learner,
          c.commandId,
          subject,
          h,
          canonical(result),
          revision,
          learner,
          subject,
          c.expectedRevision,
        ],
      ],
      [
        "UPDATE subject_states SET revision=?,state_hash=? WHERE learner=? AND subject=?",
        [revision, data.stateHash, learner, subject],
      ],
      [
        "DELETE FROM state_chunks WHERE learner=? AND subject=?",
        [learner, subject],
      ],
      ...data.pieces.map((p, i) => [
        "INSERT INTO state_chunks VALUES(?,?,?,?,?)",
        [learner, subject, i, p.payload, p.sha256],
      ]),
      [
        "INSERT INTO learning_events VALUES(?,?,?,?,?)",
        [
          learner,
          subject,
          c.commandId,
          revision,
          canonical({ command: c, result, contentVersion: VERSION }),
        ],
      ],
      ...(outcome.reward
        ? [
            [
              "INSERT OR IGNORE INTO synthetic_rewards VALUES(?,?,?,?,?)",
              [
                learner,
                subject,
                outcome.rewardSource,
                outcome.reward,
                c.commandId,
              ],
            ],
          ]
        : []),
      ...(injectFailure
        ? [
            [
              "INSERT INTO synthetic_rewards VALUES(?,?,?,?,?)",
              [learner, subject, "fault", -1, c.commandId],
            ],
          ]
        : []),
    ];
    if (statements.length > 50) throw failure("STATE_COMMAND_TOO_LARGE", 413);
    try {
      await this.db.batch(statements);
    } catch (e) {
      const duplicate = await this.replay(learner, subject, c, h);
      if (duplicate) return duplicate;
      const current = await this.db.first(
        "SELECT revision FROM subject_states WHERE learner=? AND subject=?",
        [learner, subject],
      );
      if (current.revision !== c.expectedRevision)
        throw failure("STALE_REVISION", 409);
      throw failure("WRITE_FAILED_ROLLED_BACK", 503);
    }
    return {
      result,
      committedRevision: revision,
      currentRevision: revision,
      duplicate: false,
    };
  }
  async putLargeState(learner, subject, value) {
    await this.ensure(learner, subject);
    const data = await chunks(value);
    await this.db.batch([
      [
        "UPDATE subject_states SET state_hash=? WHERE learner=? AND subject=?",
        [data.stateHash, learner, subject],
      ],
      [
        "DELETE FROM state_chunks WHERE learner=? AND subject=?",
        [learner, subject],
      ],
      ...data.pieces.map((p, i) => [
        "INSERT INTO state_chunks VALUES(?,?,?,?,?)",
        [learner, subject, i, p.payload, p.sha256],
      ]),
    ]);
    return data.pieces.length;
  }
  async summary() {
    const out = {};
    for (const t of [
      "subject_states",
      "state_chunks",
      "attempts",
      "receipts",
      "learning_events",
      "synthetic_rewards",
      "media_manifests",
      "course_manifests",
      "media_refs",
    ])
      out[t] = await this.db.all(`SELECT * FROM ${t} ORDER BY 1,2`);
    return out;
  }
}
