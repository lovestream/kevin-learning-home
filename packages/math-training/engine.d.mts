export type TrainingState = {
  schemaVersion: 1;
  profile: { name: "匿名合成练习" };
  studio: Record<string, unknown>;
};
export type TrainingChannel = "case" | "self" | "parent-self" | "parent-case";
export function freshTraining(): TrainingState;
export function validateTraining(value: unknown): boolean;
export function trainingCatalog(): {
  counts: typeof sourceCounts;
  families: typeof families;
  collections: {
    id: string;
    title: string;
    selfFamily: string;
    caseIds: string[];
  }[];
  cases: {
    id: string;
    version: string;
    title: string;
    family: string;
    stepCount: number;
    sourceKind: "anonymous-simulation";
    bundleId: string | null;
  }[];
};
export function casePreview(p: TrainingState, id: string): unknown;
export function trainingData(
  p: TrainingState,
  now?: number,
  parent?: boolean,
): unknown;
export function todayTraining(p: TrainingState, now?: number): unknown;
export function trainingHistory(p: TrainingState, now?: number): unknown[];
export function applyTraining(
  p: TrainingState,
  channel: TrainingChannel,
  event: Record<string, unknown>,
  now?: number,
): unknown;
export function exportTraining(p: TrainingState): {
  format: string;
  syntheticOnly: boolean;
  payload: TrainingState;
  sha256: string;
};
export function restoreTraining(envelope: unknown): TrainingState;
export const families: readonly { id: string; title: string; focus: string }[];
export const sourceCounts: {
  legacyCases: 14;
  anonymousBundles: 10;
  anonymousCases: 30;
  processCases: 3;
  familyExamples: 16;
  cases: 63;
  families: 8;
  templates: 10;
  reviewDays: number[];
};
