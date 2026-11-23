import { describe, expect, it } from 'vitest';
import { capturable, makeChessPuzzle, reach } from './petChess';

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}
const has = (list: { r: number; c: number }[], r: number, c: number) => list.some((s) => s.r === r && s.c === c);

describe('체스 이동', () => {
  it('나이트는 L자로 뛴다', () => {
    const t = reach('knight', { r: 4, c: 4 }, new Set());
    expect(t).toHaveLength(8);
    expect(has(t, 2, 5)).toBe(true);
    expect(has(t, 4, 5)).toBe(false);
    expect(reach('knight', { r: 0, c: 0 }, new Set())).toHaveLength(2);
  });
  it('룩은 가로세로, 비숍은 대각선, 퀸은 둘 다', () => {
    expect(reach('rook', { r: 0, c: 0 }, new Set())).toHaveLength(14);
    expect(reach('bishop', { r: 0, c: 0 }, new Set())).toHaveLength(7);
    expect(reach('queen', { r: 0, c: 0 }, new Set())).toHaveLength(21);
  });
  it('다른 말이 있으면 그 칸까지만 간다 (뛰어넘지 못한다)', () => {
    const t = reach('rook', { r: 0, c: 0 }, new Set(['0,3']));
    expect(has(t, 0, 3)).toBe(true);
    expect(has(t, 0, 4)).toBe(false);
  });
  it('같은 편 말에 막히면 그 뒤의 상대 말은 잡을 수 없다', () => {
    const base = { kind: 'rook' as const, me: { r: 0, c: 0 }, targets: [{ r: 0, c: 5 }] };
    expect(capturable({ ...base, blockers: [] })).toEqual([0]);
    expect(capturable({ ...base, blockers: [{ r: 0, c: 2 }] })).toEqual([]);
  });
});

describe('체스 문제 만들기', () => {
  for (const hard of [false, true]) {
    it(`${hard ? '어려운' : '쉬운'} 문제: 잡을 수 있는 말이 정확히 하나`, () => {
      for (let seed = 1; seed <= 80; seed++) {
        const p = makeChessPuzzle(hard, seeded(seed));
        expect(capturable(p)).toEqual([p.answer]);
        const all = [p.me, ...p.targets, ...p.blockers].map((s) => `${s.r},${s.c}`);
        expect(new Set(all).size).toBe(all.length);
        expect(p.blockers).toHaveLength(hard ? 2 : 0);
      }
    });
  }
});
