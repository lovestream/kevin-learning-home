import { z } from "zod";
export const subjectRegistrationSchema = z.strictObject({
  id: z.string().regex(/^[a-z][a-z0-9-]{0,47}$/),
  title: z.string().min(1).max(32),
  enabled: z.boolean(),
  status: z.enum(["awaiting-migration", "unavailable", "readonly-preview"]),
  contractVersion: z.literal(1),
  contentVersion: z.string().min(1).max(120).nullable(),
  mark: z.string().min(1).max(4),
  accent: z.enum(["blue", "green"]),
});
export type SubjectRegistration = z.infer<typeof subjectRegistrationSchema>;
/** Future server-side adapters only. No course engine, grading, schedule or rewards here. */
export interface SubjectContext {
  readonly learnerId: string;
  readonly contentVersion: string;
}
export interface CourseReference {
  readonly courseId: string;
  readonly title: string;
  readonly contentVersion: string;
  readonly assetIds: readonly string[];
}
export interface DueReference {
  readonly subjectId: string;
  readonly itemRef: string;
  readonly contentVersion: string;
}
export interface ParentReportReference {
  readonly subjectId: string;
  readonly contentVersion: string;
  readonly evidenceRefs: readonly string[];
}
export interface SubjectModule {
  readonly contractVersion: 1;
  readonly subjectId: string;
  readonly contentVersion: string;
  listCourses(context: SubjectContext): Promise<readonly CourseReference[]>;
  getDue(context: SubjectContext): Promise<readonly DueReference[]>;
  getParentReport(
    context: SubjectContext,
  ): Promise<ParentReportReference | null>;
}
export interface SubjectSlot {
  readonly registration: SubjectRegistration;
  readonly module?: SubjectModule;
}
export const subjects: readonly SubjectRegistration[] = Object.freeze([
  Object.freeze({
    id: "math",
    title: "数学",
    enabled: false,
    status: "awaiting-migration" as const,
    contractVersion: 1 as const,
    contentVersion: null,
    mark: "+",
    accent: "blue" as const,
  }),
  Object.freeze({
    id: "english",
    title: "英语",
    enabled: false,
    status: "awaiting-migration" as const,
    contractVersion: 1 as const,
    contentVersion: null,
    mark: "Aa",
    accent: "green" as const,
  }),
]);
export const wallet = Object.freeze({
  enabled: false,
  status: "awaiting-separate-approval",
});

/** Pure per-server catalog: default registry remains unchanged for all existing callers. */
export function subjectCatalog(
  mathReadonly = false,
): readonly SubjectRegistration[] {
  if (!mathReadonly) return subjects;
  return subjects.map((s) =>
    s.id === "math"
      ? {
          ...s,
          enabled: true,
          status: "readonly-preview" as const,
          contentVersion: "2026-10-07.2",
        }
      : s,
  );
}
