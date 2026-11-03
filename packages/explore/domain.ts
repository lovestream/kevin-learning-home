import { z } from "zod";
// Loaded before the math contract by the shared shell; never probe eval under CSP.
z.config({ jitless: true });

export const idSchema = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,95}$/);
const text = z.string().trim().min(1).max(2400);
export const assistanceSchema = z.enum(["none", "parent", "ai"]);
export const originSchema = z.enum([
  "child",
  "parent-suggestion",
  "lesson",
  "ai-suggestion",
]);
export const statusSchema = z.enum([
  "pending",
  "active",
  "paused",
  "uncertain",
  "finished",
  "archived",
]);
export const subjectRefSchema = z.strictObject({
  subjectId: idSchema,
  contentId: idSchema,
  contentVersion: idSchema,
  optionalTaskId: idSchema.optional(),
  relationship: z.enum(["inspired-by", "investigates", "created-from"]),
});
export type SubjectRef = z.infer<typeof subjectRefSchema>;
export const mediaReferenceSchema = z.strictObject({
  artifactId: idSchema,
  projectId: idSchema,
  learnerId: idSchema,
  kind: z.enum(["drawing", "image", "audio"]),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  bytes: z
    .number()
    .int()
    .positive()
    .max(10 * 1024 * 1024),
  mime: z.enum(["image/png", "image/jpeg", "audio/webm", "audio/mp4"]),
  assistance: assistanceSchema,
});
export const eventSchema = z.strictObject({
  recordVersion: z.literal(1),
  activityModule: z.literal("explore"),
  eventId: idSchema,
  projectId: idSchema,
  learnerId: idSchema,
  expectedRevision: z.number().int().nonnegative(),
  actor: z.enum(["child", "parent"]),
  recordedAt: z.iso.datetime(),
  detail: z.discriminatedUnion("kind", [
    z.strictObject({
      kind: z.literal("hypothesis_submitted"),
      text,
      assistance: assistanceSchema,
    }),
    z.strictObject({
      kind: z.literal("plan_written"),
      text,
      assistance: assistanceSchema,
    }),
    z.strictObject({
      kind: z.literal("evidence_added"),
      text,
      source: z.enum(["observed", "reference", "parent", "ai"]),
      citation: z.string().trim().max(400),
      inference: z.string().trim().max(1200),
      artifactIds: z.array(idSchema).max(10),
      assistance: assistanceSchema,
    }),
    z.strictObject({
      kind: z.literal("hypothesis_revised"),
      text,
      evidenceEventIds: z.array(idSchema).min(1).max(30),
      assistance: assistanceSchema,
    }),
    z.strictObject({
      kind: z.literal("claim_written"),
      text,
      certainty: z.enum(["supported", "uncertain", "disproved"]),
      unresolved: z.string().trim().max(1200),
      assistance: assistanceSchema,
    }),
    z.strictObject({
      kind: z.literal("artifact_created"),
      text,
      category: z.enum(["model", "diagram", "story", "design", "experiment"]),
      artifactIds: z.array(idSchema).max(10),
      fictional: z.boolean(),
      assistance: assistanceSchema,
    }),
    z.strictObject({
      kind: z.literal("reflection_written"),
      text,
      assistance: assistanceSchema,
    }),
    z.strictObject({ kind: z.literal("status_changed"), status: statusSchema }),
    z.strictObject({
      kind: z.literal("weekly_selected"),
      selected: z.boolean(),
    }),
    z.strictObject({ kind: z.literal("parent_feedback"), text }),
    z.strictObject({
      kind: z.literal("help_requested"),
      level: z.enum(["ask-back", "idea", "study-source", "review-help"]),
    }),
  ]),
});
export type ExploreEvent = z.infer<typeof eventSchema>;
export const projectSchema = z.strictObject({
  schemaVersion: z.literal(1),
  activityModule: z.literal("explore"),
  projectId: idSchema,
  learnerId: idSchema,
  questionId: idSchema,
  question: z.string().trim().min(1).max(300),
  origin: originSchema,
  status: statusSchema,
  revision: z.number().int().nonnegative(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  subjectRefs: z.array(subjectRefSchema).max(12),
  events: z.array(eventSchema).max(500),
});
export type ExploreProject = z.infer<typeof projectSchema>;
export function createProject(
  input: Pick<
    ExploreProject,
    | "projectId"
    | "learnerId"
    | "questionId"
    | "question"
    | "origin"
    | "subjectRefs"
  >,
  at: string,
): ExploreProject {
  return projectSchema.parse({
    ...input,
    activityModule: "explore",
    schemaVersion: 1,
    status: "pending",
    revision: 0,
    createdAt: at,
    updatedAt: at,
    events: [],
  });
}
export function firstHypothesis(project: ExploreProject) {
  return project.events.find((e) => e.detail.kind === "hypothesis_submitted");
}
// Pure aggregate, not an authorization boundary. A private service MUST derive
// learner/actor from its verified session, never from caller JSON. Preview is RAM only.
export function appendEvent(
  input: ExploreProject,
  raw: unknown,
): ExploreProject {
  const project = projectSchema.parse(input),
    event = eventSchema.parse(raw);
  if (
    event.projectId !== project.projectId ||
    event.learnerId !== project.learnerId
  )
    throw Error("PROJECT_SCOPE_MISMATCH");
  const old = project.events.find((e) => e.eventId === event.eventId);
  if (old) {
    if (JSON.stringify(old) !== JSON.stringify(event))
      throw Error("IDEMPOTENCY_CONFLICT");
    return project;
  }
  if (event.expectedRevision !== project.revision)
    throw Error("REVISION_CONFLICT");
  if (project.events.length >= 500) throw Error("EVENT_LIMIT");
  const d = event.detail,
    first = firstHypothesis(project);
  if ((event.actor === "parent") !== (d.kind === "parent_feedback"))
    throw Error("ACTOR_DENIED");
  if (d.kind === "hypothesis_submitted" && first)
    throw Error("FIRST_HYPOTHESIS_IMMUTABLE");
  if (["help_requested", "hypothesis_revised"].includes(d.kind) && !first)
    throw Error("FIRST_THOUGHT_REQUIRED");
  if (
    d.kind === "evidence_added" &&
    ["reference", "ai", "parent"].includes(d.source) &&
    !d.citation
  )
    throw Error("SOURCE_REQUIRED");
  if (
    d.kind === "hypothesis_revised" &&
    d.evidenceEventIds.some(
      (id) =>
        !project.events.some(
          (e) => e.eventId === id && e.detail.kind === "evidence_added",
        ),
    )
  )
    throw Error("EVIDENCE_REQUIRED");
  // A later adapter may resolve private artifacts. Anonymous preview never does.
  if (
    (d.kind === "artifact_created" || d.kind === "evidence_added") &&
    d.artifactIds.length
  )
    throw Error("PRIVATE_MEDIA_ADAPTER_REQUIRED");
  if (Date.parse(event.recordedAt) < Date.parse(project.updatedAt))
    throw Error("EVENT_TIME_REVERSED");
  return projectSchema.parse({
    ...project,
    status: d.kind === "status_changed" ? d.status : project.status,
    revision: project.revision + 1,
    updatedAt: event.recordedAt,
    events: [...project.events, event],
  });
}
export const eventFactName = (event: ExploreEvent) =>
  "exploration." + event.detail.kind;

// No reward writer exists here. A future reviewed ledger alone may consume
// one candidate keyed by learner/project/milestone/policy, not click counts.
export function recognitionCandidate(project: ExploreProject) {
  const first = firstHypothesis(project);
  if (
    project.origin !== "child" ||
    !first ||
    first.detail.kind !== "hypothesis_submitted" ||
    first.detail.assistance !== "none"
  )
    return null;
  const observed = project.events.find(
    (e) =>
      e.detail.kind === "evidence_added" &&
      e.detail.source === "observed" &&
      e.detail.assistance === "none",
  );
  const reflection = project.events.find(
    (e) =>
      e.detail.kind === "reflection_written" && e.detail.assistance === "none",
  );
  if (!observed || !reflection) return null;
  return {
    policyVersion: "draft-process-v1",
    milestone: "observation-and-reflection",
    idempotencyKey: [
      project.learnerId,
      project.projectId,
      "observation-and-reflection",
      "draft-process-v1",
    ]
      .map(encodeURIComponent)
      .join(":"),
    evidenceEventIds: [first.eventId, observed.eventId, reflection.eventId],
    eligibility: "requires-parent-review-and-issue20-ledger" as const,
    coinsIssued: 0 as const,
  };
}
