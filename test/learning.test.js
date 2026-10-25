import test from 'node:test';
import assert from 'node:assert/strict';
import { scoreAnswers, nextReview, dueReviews, progressPercent, nextStudyDate, latestPosition, weeklyPerformance, learningStatus, recommendedTopics } from '../src/learning.js';

test('оценка учитывает все ответы, включая пропущенные', () => {
  const questions = [{ answer: 'a' }, { answer: 'b' }, { answer: 'c' }];
  assert.deepEqual(scoreAnswers(questions, ['a', 'x']), { correct: 1, total: 3, percent: 33 });
  assert.equal(progressPercent(8, 10), 80);
  assert.equal(progressPercent(0, 0), 0);
});

test('повторение увеличивает интервалы и сбрасывает их после ошибки', () => {
  const now = new Date('2026-10-25T10:00:00Z');
  const first = nextReview(null, true, now);
  assert.equal(first.interval_days, 1);
  assert.equal(nextReview(first, true, now).interval_days, 3);
  const reset = nextReview({ repetitions: 4 }, false, now);
  assert.equal(reset.repetitions, 0);
  assert.equal(dueReviews([reset], new Date('2026-10-26T10:00:00Z')).length, 1);
});

test('план и продолжение курса выбирают ближайший нужный шаг', () => {
  const sunday = new Date('2026-10-25T09:00:00');
  assert.equal(nextStudyDate([1, 3], sunday).getDay(), 1);
  const levels = [{ lessons: [{ id: 'a' }, { id: 'b' }] }, { lessons: [{ id: 'c' }] }];
  assert.equal(latestPosition(levels, new Set(['a'])).lesson.id, 'b');
});

test('график считает баллы по календарным неделям и не принимает пустой балл за ноль', () => {
  const now = new Date('2026-10-25T10:00:00');
  const weeks = weeklyPerformance([
    { occurred_at: '2026-10-13T12:00:00', score: 40, duration_minutes: 15 },
    { occurred_at: '2026-10-15T12:00:00', score: 80, duration_minutes: 20 },
    { occurred_at: '2026-10-20T12:00:00', score: null, duration_minutes: 10 },
    { occurred_at: '2026-10-25T12:00:00', score: 100, duration_minutes: 15 },
  ], now, 2);
  assert.deepEqual(weeks.map(week => [week.averageScore, week.attempts, week.minutes]), [
    [60, 2, 35],
    [null, 0, 10],
  ]);
});

test('оценка динамики сообщает о трудностях, а рекомендации ведут к нужному уроку', () => {
  const now = new Date('2026-10-25T10:00:00Z');
  const events = [
    { lesson_id: 'a', score: 33, occurred_at: '2026-10-24T10:00:00Z' },
    { lesson_id: 'a', score: 100, occurred_at: '2026-10-25T08:00:00Z' },
    { lesson_id: 'b', score: 40, occurred_at: '2026-10-25T09:00:00Z' },
    { lesson_id: 'c', score: null, occurred_at: '2026-10-25T09:30:00Z' },
  ];
  assert.equal(learningStatus(events).score, 58);
  assert.equal(learningStatus(events).label, 'Нужно закрепить');
  assert.equal(learningStatus([]).score, null);

  const topics = recommendedTopics(
    [{ lesson_id: 'a', confidence: 4, completed_at: '2026-10-24' }, { lesson_id: 'b', confidence: 2, attempts: 1 }],
    [{ lesson_id: 'a', due_at: '2026-10-25T09:00:00Z', last_result: true }, { lesson_id: 'c', due_at: '2026-10-27T09:00:00Z', last_result: false }],
    events,
    now,
  );
  assert.deepEqual(topics.map(item => [item.lessonId, item.action]), [
    ['c', 'lesson'],
    ['b', 'lesson'],
    ['a', 'review'],
  ]);
});
