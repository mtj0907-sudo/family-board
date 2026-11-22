import { describe, expect, it } from 'vitest';
import { dayLabel, groupByDay } from './boardFeed';

const NOON = new Date('2026-11-22T12:00:00+09:00').getTime();
const H = 3600000;

describe('날짜 이름표', () => {
  it('오늘·어제·그 이전', () => {
    expect(dayLabel(NOON - 2 * H, NOON)).toBe('오늘');
    expect(dayLabel(NOON - 20 * H, NOON)).toBe('어제');
    expect(dayLabel(NOON - 3 * 24 * H, NOON)).toMatch(/11월 19일/);
  });
  it('날짜별로 묶고 최신이 위', () => {
    const g = groupByDay([{ at: NOON - 30 * H, n: 1 }, { at: NOON - H, n: 2 }, { at: NOON - 2 * H, n: 3 }], NOON);
    expect(g.map((x) => x.label)).toEqual(['오늘', '어제']);
    expect(g[0].items.map((i) => i.n)).toEqual([2, 3]);
  });
});
