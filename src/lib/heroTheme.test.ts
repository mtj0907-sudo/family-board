import { describe, expect, it } from 'vitest';
import { heroTheme } from './heroTheme';
import type { Weather } from './weather';

const at = (iso: string) => new Date(`${iso}+09:00`).getTime();
const w = (code: number): Weather => ({ temp: 5, feels: 3, code, windMs: 2, windDir: 0, isDay: true, hi: 8, lo: 1, pop: 0, at: 0 });

describe('맨 위 카드 테마', () => {
  it('시간대별 배경', () => {
    expect(heroTheme(at('2026-11-22T07:00'), null).name).toBe('dawn');
    expect(heroTheme(at('2026-11-22T12:00'), null).name).toBe('day');
    expect(heroTheme(at('2026-11-22T18:00'), null).name).toBe('evening');
    expect(heroTheme(at('2026-11-22T23:00'), null).name).toBe('night');
    expect(heroTheme(at('2026-11-22T03:00'), null).name).toBe('night');
  });
  it('비·눈이 오면 시간과 상관없이 그 분위기', () => {
    expect(heroTheme(at('2026-11-22T12:00'), w(63)).name).toBe('rain');
    expect(heroTheme(at('2026-11-22T21:00'), w(73)).name).toBe('snow');
    expect(heroTheme(at('2026-11-22T12:00'), w(2)).name).toBe('day');
  });
  it('인사말은 요일과 시간대', () => {
    expect(heroTheme(at('2026-11-22T18:30'), null).greeting).toBe('일요일 저녁이에요');
    expect(heroTheme(at('2026-11-23T08:00'), null).greeting).toBe('월요일 아침이에요');
    expect(heroTheme(at('2026-11-23T12:00'), null).greeting).toBe('월요일 점심이에요');
  });
});
