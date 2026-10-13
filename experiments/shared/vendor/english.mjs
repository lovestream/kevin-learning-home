// Exact source spans; only this export wrapper is new. TZ=Asia/Shanghai in Node benchmark.
  const REVIEW_SCHEDULE_VERSION = 2;
  const MATURE_STEP = 6;
  const REVIEW_DELAYS = [
    { label: "10 分钟", ms: 10 * 60 * 1000, icon: "⏱" },
    { label: "1 天", days: 1, icon: "🌱" },
    { label: "3 天", days: 3, icon: "🌿" },
    { label: "7 天", days: 7, icon: "🪴" },
    { label: "14 天", days: 14, icon: "🌳" },
    { label: "30 天", days: 30, icon: "🏕️" },
    { label: "60 天", days: 60, icon: "🏆" },
    { label: "120 天", days: 120, icon: "🗻" },
    { label: "240 天", days: 240, icon: "🌌" },
    { label: "365 天", days: 365, icon: "⭐" }
  ];
  function finiteNumber(value, fallback = 0, minimum = 0, maximum = 1_000_000_000) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.max(minimum, Math.min(maximum, number));
  }

  function safeInteger(value, fallback = 0, minimum = 0, maximum = 1_000_000) {
    return Math.round(finiteNumber(value, fallback, minimum, maximum));
  }

  function addLocalDays(timestamp, days) {
    const date = new Date(timestamp);
    date.setDate(date.getDate() + days);
    return date.getTime();
  }

  function nextReviewSchedule(existing, outcome = "good", isInitial = false, now = Date.now()) {
    const progress = {
      ...(existing || {
      status: "learning",
      learnedAt: now,
      step: 0,
      scheduleToken: 0,
      lapses: 0,
      correct: 0,
      initialModesDone: []
      })
    };
    const grade = ["again", "hard", "good", "easy"].includes(outcome)
      ? outcome
      : outcome === "correct" ? "good" : "again";
    const currentStep = safeInteger(progress.step, 0, 0, REVIEW_DELAYS.length - 1);
    let step = isInitial ? 0 : currentStep;
    if (!isInitial && grade === "good") step = Math.min(REVIEW_DELAYS.length - 1, currentStep + 1);
    if (!isInitial && grade === "easy") step = Math.min(REVIEW_DELAYS.length - 1, currentStep + 2);
    if (!isInitial && grade === "again") {
      step = 0;
      progress.lapses = (progress.lapses || 0) + 1;
    }

    const delay = REVIEW_DELAYS[step];
    progress.status = grade === "again" && !isInitial
      ? "relearning"
      : step >= MATURE_STEP ? "mature" : "reviewing";
    progress.step = step;
    progress.scheduleVersion = REVIEW_SCHEDULE_VERSION;
    progress.dueAt = delay.ms ? now + delay.ms : addLocalDays(now, delay.days);
    progress.lastReviewedAt = now;
    progress.lastGrade = isInitial ? "good" : grade;
    if (isInitial || grade !== "again") {
      progress.lastSuccessAt = now;
      progress.correct = (progress.correct || 0) + 1;
    }
    progress.scheduleToken = (progress.scheduleToken || 0) + 1;
    return progress;
  }

  function initialScheduleNeeded(existing, requestedInitial) {
    return Boolean(requestedInitial && !existing?.dueAt);
  }

  function normalizeAnswer(value) {
    return String(value || "").normalize("NFKC").trim().toLowerCase().replaceAll("’", "'");
  }

  function spellingAnswersFor(word) {
    return [...new Set([word?.word, ...(Array.isArray(word?.spellingVariants) ? word.spellingVariants : [])]
      .map(normalizeAnswer)
      .filter(Boolean))];
  }

  function damerauDistanceOne(a, b) {
    if (a === b) return 0;
    if (Math.abs(a.length - b.length) > 1) return 2;
    if (a.length === b.length) {
      const diff = [];
      for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) diff.push(i);
      if (diff.length === 1) return 1;
      if (diff.length === 2 && diff[1] === diff[0] + 1 && a[diff[0]] === b[diff[1]] && a[diff[1]] === b[diff[0]]) return 1;
      return 2;
    }
    const shorter = a.length < b.length ? a : b;
    const longer = a.length < b.length ? b : a;
    let left = 0;
    let right = 0;
    let edits = 0;
    while (left < shorter.length && right < longer.length) {
      if (shorter[left] === longer[right]) left += 1;
      else if ((edits += 1) > 1) return 2;
      right += 1;
    }
    return 1;
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
        return /^[a-e]{2,5}$/.test(actualChoices)
          && [...new Set(actualChoices)].sort().join("") === [...new Set(targetChoices)].sort().join("");
      }
      return actual.replaceAll(",", " ").replace(/\s+/g, " ")
        === target.replaceAll(",", " ").replace(/\s+/g, " ");
    });
  }
export {finiteNumber, safeInteger, addLocalDays, nextReviewSchedule, initialScheduleNeeded, normalizeAnswer, spellingAnswersFor, damerauDistanceOne, normalizeExerciseAnswer, coreExerciseAnswerMatches};
