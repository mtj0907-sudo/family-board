import { describe, expect, it } from 'vitest';
import { DEFAULT_BAG_ITEMS, bagDate, bagNudgeActive, bagProgress } from './bag';

// 한국 시각 → ms (모두 가짜 날짜)
const kstMs = (y: number, mo: number, d: number, h: number, mi = 0) => Date.UTC(y, mo - 1, d, h - 9, mi);

describe('bagDate: 정오에 새로 시작', () => {
  it('밤에 챙긴 목록은 다음 날 정오 전까지 같은 날짜', () => {
    expect(bagDate(kstMs(2030, 1, 10, 19, 30))).toBe('2030-01-10');
    expect(bagDate(kstMs(2030, 1, 10, 23, 59))).toBe('2030-01-10');
    expect(bagDate(kstMs(2030, 1, 11, 0, 5))).toBe('2030-01-10');
    expect(bagDate(kstMs(2030, 1, 11, 7, 30))).toBe('2030-01-10');
    expect(bagDate(kstMs(2030, 1, 11, 11, 59))).toBe('2030-01-10');
  });
  it('정오가 되면 새 날짜', () => {
    expect(bagDate(kstMs(2030, 1, 11, 12, 0))).toBe('2030-01-11');
    expect(bagDate(kstMs(2030, 1, 11, 16, 0))).toBe('2030-01-11');
  });
  it('월말/연말 경계', () => {
    expect(bagDate(kstMs(2030, 3, 1, 8, 0))).toBe('2030-02-28');
    expect(bagDate(kstMs(2031, 1, 1, 8, 0))).toBe('2030-12-31');
  });
});

describe('bagProgress', () => {
  it('체크한 개수와 완료 여부', () => {
    const p = bagProgress(DEFAULT_BAG_ITEMS, { homework: true, notice: true });
    expect(p).toEqual({ done: 2, total: 6, complete: false });
    const all = Object.fromEntries(DEFAULT_BAG_ITEMS.map((i) => [i.key, true]));
    expect(bagProgress(DEFAULT_BAG_ITEMS, all).complete).toBe(true);
  });
  it('항목이 없으면 완료로 치지 않는다', () => {
    expect(bagProgress([], {}).complete).toBe(false);
    expect(bagProgress(DEFAULT_BAG_ITEMS, undefined).done).toBe(0);
  });
});

describe('bagNudgeActive', () => {
  it('저녁 5시부터 다음 날 아침 9시 전까지', () => {
    expect(bagNudgeActive(kstMs(2030, 1, 10, 16, 59))).toBe(false);
    expect(bagNudgeActive(kstMs(2030, 1, 10, 17, 0))).toBe(true);
    expect(bagNudgeActive(kstMs(2030, 1, 10, 23, 0))).toBe(true);
    expect(bagNudgeActive(kstMs(2030, 1, 11, 2, 0))).toBe(true);
    expect(bagNudgeActive(kstMs(2030, 1, 11, 8, 59))).toBe(true);
    expect(bagNudgeActive(kstMs(2030, 1, 11, 9, 0))).toBe(false);
    expect(bagNudgeActive(kstMs(2030, 1, 11, 13, 0))).toBe(false);
  });
});
