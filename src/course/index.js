import preA1 from './pre-a1.js';
import a1 from './a1.js';
import a2 from './a2.js';
import b1 from './b1.js';
import b2 from './b2.js';
import c1 from './c1.js';
import c2 from './c2.js';

function normalizeLevel(level) {
  return {
    ...level,
    lessons: level.lessons.map((raw, index) => {
      const lesson = raw.t ? {
        title: raw.t, goal: raw.g, theory: raw.n, examples: raw.e,
        words: raw.w, dialogue: raw.d,
        reading: { text: raw.r[0], question: { prompt: raw.r[1], options: raw.r[2], answer: raw.r[3] } },
        check: { prompt: raw.c[0], options: raw.c[1], answer: raw.c[2] },
        writing: raw.write, speaking: raw.speak,
      } : raw;
      const [first, second, third] = lesson.words;
      const quiz = [
        lesson.check,
        {
          prompt: `Как переводится «${first[0]}»?`,
          options: [first[1], second[1], third[1]],
          answer: first[1],
        },
        lesson.reading.question,
      ];
      return { ...lesson, id: `${level.id}-${String(index + 1).padStart(2, '0')}`, quiz };
    }),
  };
}

export const levels = [preA1, a1, a2, b1, b2, c1, c2].map(normalizeLevel);
export const allLessons = levels.flatMap(level => level.lessons);
export const findLesson = id => allLessons.find(lesson => lesson.id === id);
export const findLevel = id => levels.find(level => level.id === id);
