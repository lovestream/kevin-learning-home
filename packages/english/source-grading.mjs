// Pure helpers copied from word-request@d0b42a8872a7e87433b96770519203630223b6f2 assets/app.js. No DOM, storage, scheduling or rewards.
function safeText(v, f = "", max = 180) {
  return typeof v === "string" ? v.slice(0, max) : f;
}
function isPracticeLetter(value) {
  return /^\p{L}$/u.test(String(value || ""));
}
function normalizeAnswer(value) {
  return String(value || "")
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replaceAll("’", "'");
}

function spellingVariants(word) {
  const forms = new Set();
  const normalized = normalizeAnswer(word).replace(/\s+/g, " ");
  if (!normalized) return forms;
  forms.add(normalized);
  if (!/^[a-z]{3,}$/.test(normalized)) return forms;
  forms.add(`${normalized}s`);
  forms.add(`${normalized}ed`);
  forms.add(`${normalized}ing`);
  if (normalized.endsWith("e")) {
    forms.add(`${normalized}d`);
    forms.add(`${normalized.slice(0, -1)}ing`);
  }
  if (/[^aeiou]y$/.test(normalized)) {
    forms.add(`${normalized.slice(0, -1)}ies`);
    forms.add(`${normalized.slice(0, -1)}ied`);
  }
  if (/(?:s|x|z|ch|sh)$/.test(normalized)) forms.add(`${normalized}es`);
  return forms;
}

function answerFormsFor(word) {
  return [
    ...new Set(
      [
        word?.word,
        ...(Array.isArray(word?.acceptedAnswers) ? word.acceptedAnswers : []),
      ].flatMap((form) => [...spellingVariants(form)]),
    ),
  ];
}

function semanticAlternativesFor(word) {
  const values = Array.isArray(word?.semanticAlternatives)
    ? word.semanticAlternatives
    : word?.acceptedAnswers;
  return [
    ...new Set(
      (Array.isArray(values) ? values : [])
        .map(normalizeAnswer)
        .filter(Boolean),
    ),
  ];
}

function spellingAnswersFor(word) {
  return [
    ...new Set(
      [
        word?.word,
        ...(Array.isArray(word?.spellingVariants) ? word.spellingVariants : []),
      ]
        .map(normalizeAnswer)
        .filter(Boolean),
    ),
  ];
}

function clueContainsAnswer(clue, word) {
  const searchable = normalizeAnswer(clue)
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!searchable) return false;
  return answerFormsFor(word).some((form) => {
    const target = form
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return target && ` ${searchable} `.includes(` ${target} `);
  });
}

function studyDefinitionFor(word) {
  return safeText(word?.studyDefinition || word?.en, "", 900);
}

function feedbackDefinitionFor(word) {
  return safeText(
    word?.feedbackDefinition || studyDefinitionFor(word),
    "",
    900,
  );
}

function quizClueFor(word) {
  const clue = safeText(word?.quizClue, "", 500);
  return clue && !clueContainsAnswer(clue, word) ? clue : "";
}

function normalizeExerciseAnswer(value) {
  return normalizeAnswer(value)
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .replace(/\s*[,;/&+]\s*/g, ",")
    .replace(/\s+and\s+/g, ",")
    .replace(/[^a-z0-9,' -]/g, "")
    .trim();
}

function coreExerciseAnswerMatches(value, expected) {
  const candidates = Array.isArray(expected) ? expected : [expected];
  const actual = normalizeExerciseAnswer(value);
  return candidates.some((candidate) => {
    const target = normalizeExerciseAnswer(candidate);
    if (!target) return false;
    const targetChoices = target.replaceAll(",", "");
    if (/^[a-e]{2,5}$/.test(targetChoices) && target.includes(",")) {
      const actualChoices = actual.replaceAll(",", "");
      return (
        /^[a-e]{2,5}$/.test(actualChoices) &&
        [...new Set(actualChoices)].sort().join("") ===
          [...new Set(targetChoices)].sort().join("")
      );
    }
    return (
      actual.replaceAll(",", " ").replace(/\s+/g, " ") ===
      target.replaceAll(",", " ").replace(/\s+/g, " ")
    );
  });
}

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededShuffle(items, seed) {
  const result = [...items];
  let value = hashString(seed) || 1;
  for (let index = result.length - 1; index > 0; index -= 1) {
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    const swap = Math.abs(value) % (index + 1);
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

function makeMask(word, seed, mode) {
  const chars = [...word.toLowerCase()];
  const letterIndices = chars
    .map((char, index) => (isPracticeLetter(char) ? index : -1))
    .filter((index) => index >= 0);
  if (mode === "full") return new Set(letterIndices);
  const candidates = letterIndices.filter((index) => {
    if (letterIndices.length < 4) return true;
    return index !== letterIndices[0] && index !== letterIndices.at(-1);
  });
  const shuffled = seededShuffle(candidates, seed);
  const target = Math.max(
    1,
    Math.min(candidates.length, Math.ceil(letterIndices.length * 0.52)),
  );
  return new Set(shuffled.slice(0, target));
}

export {
  makeMask,
  normalizeAnswer,
  spellingAnswersFor,
  clueContainsAnswer,
  quizClueFor,
  coreExerciseAnswerMatches,
};
