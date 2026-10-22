import { z } from "zod";
export const authLoginName = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9][a-z0-9._-]{2,63}$/);
const secretInput = z
  .string()
  .min(1)
  .max(128)
  .refine((v) => Buffer.byteLength(v) <= 512);
export const authCredentialsSchema = z.strictObject({
  login: authLoginName,
  password: secretInput,
});
export const parentUnlockSchema = z.strictObject({ password: secretInput });
export const authLogoutSchema = z.strictObject({
  allDevices: z.boolean().optional(),
});
export const authEmptySchema = z.strictObject({});
export const authSessionSchema = z.strictObject({
  schemaVersion: z.literal(1),
  actor: z.strictObject({ id: z.uuid(), role: z.enum(["parent", "learner"]) }),
  learnerIds: z
    .array(z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9:._-]{0,119}$/))
    .max(32),
  parentUnlocked: z.boolean(),
  parentUnlockExpiresAt: z.number().int().nonnegative().nullable(),
  expiresAt: z.number().int().positive(),
  csrfToken: z.string().regex(/^[a-zA-Z0-9_-]{43}$/),
});
export type AuthSessionResponse = z.infer<typeof authSessionSchema>;
