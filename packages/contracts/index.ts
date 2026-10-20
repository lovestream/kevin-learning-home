import { z } from "zod";
import { createHash } from "node:crypto";

export class AppError extends Error {
  readonly code: string;
  readonly status: number;
  readonly currentRevision?: number;
  constructor(code: string, status = 400, currentRevision?: number) {
    super(code);
    this.code = code;
    this.status = status;
    this.currentRevision = currentRevision;
  }
}
// ADAPT: recursive canonical ordering from PR#2@398074e repository.mjs.
export function canonical(value: unknown): string {
  const sort = (v: unknown): unknown =>
    Array.isArray(v)
      ? v.map(sort)
      : v !== null && typeof v === "object"
        ? Object.fromEntries(
            Object.entries(v)
              .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
              .map(([k, v]) => [k, sort(v)]),
          )
        : v;
  return JSON.stringify(sort(value));
}
export const sha256 = (bytes: string | Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");
export const identifier = z
  .string()
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9:._-]{0,119}$/);
export const commandSchema = z.strictObject({
  schemaVersion: z.literal(1),
  commandId: z.uuid(),
  learnerId: identifier,
  subjectId: z.literal("foundation-demo"),
  expectedRevision: z
    .number()
    .int()
    .min(0)
    .max(Number.MAX_SAFE_INTEGER - 1),
  contentVersion: z.literal("synthetic-v1"),
  occurredAt: z.iso.datetime(),
  serverAttemptId: identifier,
  action: z.literal("observe-reading"),
  lessonId: z.literal("synthetic:reading"),
  activityId: z.literal("synthetic:cursor"),
  input: z.strictObject({ position: z.number().int().min(0).max(1000) }),
});
export type LearningCommand = z.infer<typeof commandSchema>;
export interface CommandResult {
  schemaVersion: 1;
  commandId: string;
  duplicate: boolean;
  committedRevision: number;
  currentRevision: number;
  events: unknown[];
  result: { position: number };
}
export function parseCommand(
  value: unknown,
  key: string | undefined,
): LearningCommand {
  const result = commandSchema.safeParse(value);
  if (!result.success) throw new AppError("SCHEMA_INVALID", 422);
  if (key !== result.data.commandId)
    throw new AppError("IDEMPOTENCY_KEY_MISMATCH", 400);
  return result.data;
}
export const mediaAssetSchema = z.strictObject({
  schemaVersion: z.literal(1),
  assetId: identifier,
  version: identifier,
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  sizeBytes: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  mimeType: z.enum([
    "image/png",
    "audio/wav",
    "video/mp4",
    "text/plain",
    "application/octet-stream",
  ]),
  visibility: z.enum(["public", "private"]),
  sourceLicense: z.string().min(1).max(200),
  authorization: z.enum(["synthetic", "licensed", "private-owner"]),
  storageKey: z.string().min(1).max(240),
  contentRefs: z.array(identifier).max(100),
});
export type MediaAsset = z.infer<typeof mediaAssetSchema>;
export const contentManifestSchema = z.strictObject({
  schemaVersion: z.literal(1),
  subjectId: identifier,
  contentVersion: identifier,
  title: z.string().min(1).max(160),
  assets: z
    .array(z.strictObject({ assetId: identifier, version: identifier }))
    .max(100),
});
export type ContentManifest = z.infer<typeof contentManifestSchema>;
