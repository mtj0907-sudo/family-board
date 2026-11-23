import { describe, expect, it } from 'vitest';
import { catchSnacks, makeQuiz, memorySnacks, quizSnacks } from './petQuiz';

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

describe('펫 퀴즈', () => {
  for (const level of ['kinder', 'school'] as const) {
    it(`${level}: 다섯 문제, 보기 셋, 정답이 보기 안에 있다`, () => {
      for (let seed = 1; seed <= 60; seed++) {
        const qs = makeQuiz(level, seeded(seed));
        expect(qs).toHaveLength(5);
        for (const q of qs) {
          expect(q.choices.length).toBeGreaterThanOrEqual(2);
          expect(new Set(q.choices).size).toBe(q.choices.length);
          expect(q.answer).toBeGreaterThanOrEqual(0);
          expect(q.answer).toBeLessThan(q.choices.length);
        }
        expect(new Set(qs.map((q) => q.q)).size).toBe(5);
      }
    });
  }
  it('덧셈·곱셈 문제의 정답이 맞다', () => {
    for (let seed = 1; seed <= 80; seed++) {
      for (const q of makeQuiz('school', seeded(seed))) {
        const m = q.q.match(/^(\d+) ([+×−]) (\d+) = \?$/);
        if (!m) continue;
        const [a, b] = [Number(m[1]), Number(m[3])];
        const v = m[2] === '+' ? a + b : m[2] === '×' ? a * b : a - b;
        expect(q.choices[q.answer]).toBe(String(v));
      }
    }
  });
  it('보상 계산', () => {
    expect(quizSnacks(0, 5)).toBe(0);
    expect(quizSnacks(1, 5)).toBe(0);
    expect(quizSnacks(3, 5)).toBe(2);
    expect(quizSnacks(5, 5)).toBe(5);
    expect(memorySnacks(6)).toBe(3);
    expect(memorySnacks(12)).toBe(2);
    expect(memorySnacks(30)).toBe(1);
    expect(catchSnacks(3)).toBe(0);
    expect(catchSnacks(9)).toBe(2);
    expect(catchSnacks(-4)).toBe(0);
  });
});
