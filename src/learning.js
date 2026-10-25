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

// Календарные недели начинаются в понедельник, как и недельный план на экране.
export function weeklyPerformance(events, now = new Date(), weekCount = 6) {
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return Array.from({ length: weekCount }, (_, index) => {
    const start = new Date(monday);
    start.setDate(start.getDate() - 7 * (weekCount - index - 1));
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    const current = events.filter(event => {
      const date = new Date(event.occurred_at).getTime();
      return date >= start.getTime() && date < end.getTime() && date <= now.getTime();
    });
    const scores = current.filter(event => event.score !== null).map(event => Number(event.score)).filter(score => Number.isFinite(score) && score >= 0 && score <= 100);
    return {
      start,
      averageScore: scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : null,
      attempts: scores.length,
      minutes: current.reduce((sum, event) => sum + Math.max(0, Number(event.duration_minutes) || 0), 0),
    };
  });
}

export function learningStatus(events) {
  const scores = [...events]
    .filter(event => Number.isFinite(Number(event.score)) && event.score !== null)
    .sort((a, b) => new Date(b.occurred_at) - new Date(a.occurred_at))
    .slice(0, 5)
    .map(event => Number(event.score));
  if (!scores.length) return { score: null, label: 'Пока нет результатов', tone: 'neutral', detail: 'Пройди первое задание — и здесь появится оценка динамики.' };
  const score = Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length);
  if (score >= 80) return { score, label: 'Идёт хорошо', tone: 'good', detail: 'Последние задания получаются уверенно. Продолжай и не забывай повторять темы.' };
  if (score >= 60) return { score, label: 'Есть прогресс', tone: 'steady', detail: 'Основа уже есть. Посмотри темы ниже и закрепи то, где были ошибки.' };
  return { score, label: 'Нужно закрепить', tone: 'needs-work', detail: 'Сейчас полезнее вернуться к трудным темам, чем спешить дальше.' };
}

export function recommendedTopics(progress, reviews, events, now = new Date()) {
  const latestScores = new Map();
  for (const event of events) {
    if (!event.lesson_id || event.score === null || !Number.isFinite(Number(event.score))) continue;
    const previous = latestScores.get(event.lesson_id);
    if (!previous || new Date(event.occurred_at) > new Date(previous.occurred_at)) latestScores.set(event.lesson_id, event);
  }
  const progressById = new Map(progress.map(item => [item.lesson_id, item]));
  const reviewById = new Map(reviews.map(item => [item.lesson_id, item]));
  const ids = new Set([...progressById.keys(), ...reviewById.keys(), ...latestScores.keys()]);
  return [...ids].map(lessonId => {
    const row = progressById.get(lessonId);
    const review = reviewById.get(lessonId);
    const latest = latestScores.get(lessonId);
    if (review?.last_result === false) return { lessonId, reason: 'Повторение пока не получилось', priority: 0, action: 'lesson' };
    if (latest && Number(latest.score) < 70) return { lessonId, reason: `Последний тест: ${latest.score}%`, priority: 1, action: 'lesson' };
    if (row?.attempts > 0 && !row.completed_at) return { lessonId, reason: 'Урок ещё не пройден', priority: 2, action: 'lesson' };
    if (row?.confidence <= 2) return { lessonId, reason: 'Тема кажется трудной', priority: 3, action: 'lesson' };
    if (review && new Date(review.due_at) <= now) return { lessonId, reason: 'Пришло время повторить', priority: 4, action: 'review' };
    return null;
  }).filter(Boolean).sort((a, b) => a.priority - b.priority || a.lessonId.localeCompare(b.lessonId));
}
