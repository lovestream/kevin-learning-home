export interface SubjectRegistration {
  id: string;
  title: string;
  enabled: boolean;
  status: "awaiting-migration";
}
export const subjects: readonly SubjectRegistration[] = Object.freeze([
  Object.freeze({
    id: "math",
    title: "数学",
    enabled: false,
    status: "awaiting-migration" as const,
  }),
  Object.freeze({
    id: "english",
    title: "英语",
    enabled: false,
    status: "awaiting-migration" as const,
  }),
]);
export const wallet = Object.freeze({
  enabled: false,
  status: "awaiting-separate-approval",
});
