import { describe, expect, it } from 'vitest';
import { DEFAULT_BAG_ITEMS, bagCheer, bagDate, bagNudgeActive, bagProgress, schoolKidIds } from './bag';

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

describe('bagNudgeActive: 요일', () => {
  // 2030-01-06 = 일요일
  it('일~목 저녁에는 켜진다', () => {
    for (const d of [6, 7, 8, 9, 10]) expect(bagNudgeActive(kstMs(2030, 1, d, 19, 0))).toBe(true);
  });
  it('금요일 밤과 토요일에는 꺼져 있다', () => {
    expect(bagNudgeActive(kstMs(2030, 1, 11, 19, 0))).toBe(false); // 금 저녁
    expect(bagNudgeActive(kstMs(2030, 1, 12, 8, 0))).toBe(false); // 토 아침
    expect(bagNudgeActive(kstMs(2030, 1, 12, 19, 0))).toBe(false); // 토 저녁
  });
  it('일요일 아침은 꺼져 있고, 월~금 아침은 켜진다', () => {
    expect(bagNudgeActive(kstMs(2030, 1, 6, 8, 0))).toBe(false); // 일 아침
    expect(bagNudgeActive(kstMs(2030, 1, 7, 8, 0))).toBe(true); // 월 아침 (일요일 밤의 이어짐)
    expect(bagNudgeActive(kstMs(2030, 1, 11, 8, 0))).toBe(true); // 금 아침
  });
});

describe('bagCheer', () => {
  it('같은 seed는 같은 말, seed가 바뀌면 다른 말도 나온다', () => {
    expect(bagCheer(3)).toBe(bagCheer(3));
    const set = new Set([0, 1, 2, 3, 4].map(bagCheer));
    expect(set.size).toBe(5);
    expect(bagCheer(5)).toBe(bagCheer(0));
  });
  it('음수·소수도 안전', () => {
    expect(typeof bagCheer(-3.7)).toBe('string');
  });
});

describe('schoolKidIds', () => {
  const members = [
    { id: 'm1', name: '가나', emoji: '', role: 'parent' as const },
    { id: 'm3', name: '다라', emoji: '', role: 'child' as const },
    { id: 'm4', name: '마바', emoji: '', role: 'child' as const },
  ];
  it('평일에 가는 곳이 학교인 아이', () => {
    expect(schoolKidIds({ members, dayPlaces: { m3: '학교', m4: '유치원' } })).toEqual(['m3']);
  });
  it('유치원·어린이집·안 가요(빈 값)는 제외', () => {
    expect(schoolKidIds({ members, dayPlaces: { m3: '유치원', m4: '' } })).toEqual([]);
  });
  it('평일에 가는 곳을 정하지 않은 아이는 예전 "학교 가는 아이" 값을 따른다', () => {
    expect(schoolKidIds({ members, schoolKids: ['m3'], dayPlaces: { m4: '유치원' } })).toEqual(['m3']);
    expect(schoolKidIds({ members, schoolKids: ['m3'] })).toEqual(['m3']);
  });
  it('직접 정한 값이 예전 값보다 우선', () => {
    expect(schoolKidIds({ members, schoolKids: ['m3'], dayPlaces: { m3: '유치원' } })).toEqual([]);
  });
  it('어른은 제외', () => {
    expect(schoolKidIds({ members, dayPlaces: { m1: '학교' } })).toEqual([]);
  });
});
