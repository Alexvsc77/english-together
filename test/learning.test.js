import test from 'node:test';
import assert from 'node:assert/strict';
import { scoreAnswers, nextReview, dueReviews, progressPercent, nextStudyDate, latestPosition } from '../src/learning.js';

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
