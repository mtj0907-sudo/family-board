import { describe, expect, it } from 'vitest';
import { routineProgress } from './routine';
import { DEFAULT_ROUTINE_ITEMS } from './constants';

describe('routineProgress', () => {
  it('체크한 개수와 비율', () => {
    const r = routineProgress(DEFAULT_ROUTINE_ITEMS, { home: true, meal: true, homework: false });
    expect(r).toEqual({ done: 2, total: 4, ratio: 0.5 });
  });
  it('기록이 없으면 0', () => {
    expect(routineProgress(DEFAULT_ROUTINE_ITEMS, undefined).done).toBe(0);
    expect(routineProgress([], {}).ratio).toBe(0);
  });
});
