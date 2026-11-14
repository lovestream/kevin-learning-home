export function normalizeAnswer(value: unknown): string;
export function spellingAnswersFor(word: unknown): string[];
export function clueContainsAnswer(clue: string, word: unknown): boolean;
export function quizClueFor(word: unknown): string;
export function coreExerciseAnswerMatches(
  value: string,
  expected: string | string[],
): boolean;
export function makeMask(word: string, seed: string, mode: string): Set<number>;
