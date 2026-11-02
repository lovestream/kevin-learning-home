export type StudyState = {
  schemaVersion: 1;
  syntheticOnly: true;
  studio: Record<string, unknown>;
};
export type StudyChannel =
  | "reading"
  | "session-start"
  | "session-draft"
  | "help"
  | "self-check"
  | "submit"
  | "note"
  | "thinking"
  | "parent-thinking"
  | "parent-formal";
export function freshStudy(): StudyState;
export function validateStudy(p: unknown): boolean;
export function studyData(p: StudyState, now?: number): unknown;
export function studyPlan(p: StudyState, now?: number, grade?: number): unknown;
export function applyStudy(
  p: StudyState,
  channel: StudyChannel,
  input: Record<string, unknown>,
  now?: number,
): unknown;
export function exportStudy(p: StudyState): {
  format: string;
  syntheticOnly: true;
  payload: StudyState;
  sha256: string;
};
export function restoreStudy(p: unknown): StudyState;
