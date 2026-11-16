export const ENGLISH_SOURCE_SHA = "d0b42a8872a7e87433b96770519203630223b6f2";
export type EnglishCard = {
  id: string;
  bankId: string;
  word: string;
  en: string;
  zh: string;
  ipa: string;
  pos: string;
  example: string;
  exampleZh: string;
  chunks: string[];
  tip: string;
  image: string | null;
  imageStatus: string;
  attribution?: {
    creator: string;
    license: string;
    licenseUrl: string;
    sourceUrl: string;
  };
  contentVersion: string;
  spellingVariants: string[];
  semanticAlternatives: string[];
  quizClue: string;
  sourceBook?: number;
  sourceUnit?: number;
  sourceHalf?: string;
  sourceDay?: number;
  sourceNumber?: number;
  cardType?: string;
  sourceGroupId?: string;
};
export type EnglishGroup = {
  id: string;
  bankId: string;
  title: string;
  preview?: string;
  book: number | null;
  unit: number;
  half: string | null;
  wordIds: string[];
  exercise?: { id: string; image: string; answerSlots: number };
  readingImages: string[];
};
export type EnglishCatalog = {
  sourceSha: string;
  contentVersion: string;
  scope: "family-lan-source";
  publicationApproved: false;
  storage: "page-memory-only";
  banks: {
    id: string;
    title: string;
    count: number;
    books: number;
    groups: number;
  }[];
  groups: Omit<EnglishGroup, "wordIds">[];
  localRecordedAudio: 0;
  mediaCount: number;
  reviewPersistence: false;
};
export type EnglishBundle = {
  schemaVersion: 1;
  notices?: string;
  sourceSha: string;
  contentVersion: string;
  scope: "family-lan-source";
  publicationApproved: false;
  cards: EnglishCard[];
  groups: EnglishGroup[];
  aliases: Record<string, string>;
  exerciseAnswers: Record<string, (string | string[])[]>;
  media: Record<
    string,
    {
      path: string;
      sha256: string;
      bytes: number;
      type: string;
      publication: string;
    }
  >;
  sources: { path: string; sha256: string; bytes: number }[];
};
export type QuizView = {
  sprint?: SprintView;
  sessionId: string;
  taskId: string;
  index: number;
  total: number;
  mode: "cloze" | "full";
  source: "new" | "review" | "sprint";
  clue: string;
  image: string | null;
  mask: string | null;
  hint: string | null;
  usedHint: boolean;
  usedAudio: boolean;
  attempts: number;
  answerShown: boolean;
  firstAnswer?: { answer: string; correct: boolean; assisted: boolean };
  feedback?: {
    correct: boolean;
    answer: string;
    definition: string;
    nearMiss: boolean;
  };
  done: boolean;
};
export type SprintView = {
  bankId: string;
  day: number;
  days: number;
  size: number;
  phase: "cloze" | "full" | "drill" | "final" | "complete";
  cycle: number;
  score: number;
  nextPhase?: "cloze" | "full" | "drill" | "final" | "complete";
  history: { phase: string; cycle: number; score: number; total: number }[];
};
export type AttemptEvidence = {
  subjectId: "english";
  bankId: string;
  wordId: string;
  lessonOrUnitId: string;
  trainingGroupId?: string;
  sprintPhase?: string;
  sprintCycle?: number;
  sprintDay?: number;
  contentVersion: string;
  attemptId: string;
  occurredAt: number;
  source: string;
  mode: string;
  answer: string;
  firstAttempt: boolean;
  firstAttemptCorrect: boolean;
  answerCorrect: boolean;
  usedHint: boolean;
  answerShown: boolean;
  usedAudio: boolean;
  cueType: string;
  selfCheck: boolean[];
  storage: "page-memory-only";
  rewardEligible: false;
};
