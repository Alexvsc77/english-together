const DAY_MS = 24 * 60 * 60 * 1000;
const REVIEW_INTERVALS = [1, 3, 7, 14, 30, 60, 120];

export function scoreAnswers(questions, answers) {
  const total = questions.length;
  if (!total) return { correct: 0, total: 0, percent: 0 };
  const correct = questions.reduce((count, question, index) =>
    count + Number(String(answers[index] ?? '') === String(question.answer)), 0);
  return { correct, total, percent: Math.round((correct / total) * 100) };
}

export function progressPercent(completed, total) {
  if (!total) return 0;
  return Math.min(100, Math.max(0, Math.round((completed / total) * 100)));
}

export function nextReview(previous, wasCorrect, now = new Date()) {
  const oldRepetitions = Number(previous?.repetitions) || 0;
  const repetitions = wasCorrect ? Math.min(oldRepetitions + 1, REVIEW_INTERVALS.length) : 0;
  const intervalDays = wasCorrect ? REVIEW_INTERVALS[repetitions - 1] : 1;
  return {
    repetitions,
    interval_days: intervalDays,
    due_at: new Date(now.getTime() + intervalDays * DAY_MS).toISOString(),
    last_result: wasCorrect,
  };
}

export function dueReviews(items, now = new Date()) {
  return items.filter(item => new Date(item.due_at).getTime() <= now.getTime());
}

export function nextStudyDate(weekdays, from = new Date()) {
  if (!Array.isArray(weekdays) || weekdays.length === 0) return null;
  const candidate = new Date(from);
  candidate.setHours(12, 0, 0, 0);
  for (let offset = 0; offset < 8; offset += 1) {
    if (weekdays.includes(candidate.getDay())) return candidate;
    candidate.setDate(candidate.getDate() + 1);
  }
  return null;
}

export function levelProgress(lessons, completedIds) {
  return progressPercent(lessons.filter(lesson => completedIds.has(lesson.id)).length, lessons.length);
}

export function latestPosition(levels, completedIds) {
  for (const level of levels) {
    const next = level.lessons.find(lesson => !completedIds.has(lesson.id));
    if (next) return { level, lesson: next };
  }
  const level = levels.at(-1);
  return { level, lesson: level?.lessons.at(-1) ?? null };
}

export function formatMinutes(minutes) {
  const value = Math.max(0, Math.round(Number(minutes) || 0));
  return value < 60 ? `${value} мин` : `${Math.floor(value / 60)} ч ${value % 60} мин`;
}
