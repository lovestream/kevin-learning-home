import { z } from "zod";
import { idSchema, originSchema, subjectRefSchema, eventSchema } from "../explore/domain.ts";
export const createRequest = z.strictObject({requestId:z.uuid(), projectId:z.uuid(), question:z.string().trim().min(1).max(300), origin:originSchema, subjectRefs:z.array(subjectRefSchema).max(12)});
export const appendRequest = z.strictObject({requestId:z.uuid(), expectedRevision:z.number().int().nonnegative(), detail:eventSchema.shape.detail});
export const subjectWrite = z.strictObject({requestId:z.uuid(), expectedRevision:z.number().int().nonnegative(), subjectId:z.enum(["math","english"]),schemaVersion:idSchema,contentVersion:idSchema,payload:z.string().min(2).max(16*1024*1024)});
export const lifecycleRequest=z.strictObject({requestId:z.uuid(),expectedRevision:z.number().int().nonnegative(),deleted:z.boolean()});
export type Principal={householdId:string;learnerId:string|null;role:"parent"|"child";digest:string;csrf:string};
export function parsed<T>(schema:z.ZodType<T>,raw:unknown):T {
  const value=schema.safeParse(raw);if(!value.success)throw Error("REQUEST_SCHEMA_INVALID");return value.data;
}
