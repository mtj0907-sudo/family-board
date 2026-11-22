import { describe, expect, it } from 'vitest';
import { addDays, eventsOn, monthCells, occursOn, shiftMonth, weekdayOf, type EventDoc } from './events';

// 모두 가짜 데이터
const mk = (over: Partial<EventDoc> & { id?: string }) => ({
  id: over.id ?? 'e1',
  title: '가짜 일정',
  emoji: '📌',
  date: '2030-01-15', // 화요일
  time: '',
  who: [],
  pickupBy: '',
  repeat: 'none' as const,
  ...over,
});

describe('date helpers', () => {
  it('addDays는 월/연 경계를 넘는다', () => {
    expect(addDays('2030-01-31', 1)).toBe('2030-02-01');
    expect(addDays('2030-01-01', -1)).toBe('2029-12-31');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });
  it('weekdayOf', () => {
    expect(weekdayOf('2030-01-15')).toBe(2);
    expect(weekdayOf('2030-01-13')).toBe(0);
  });
  it('shiftMonth', () => {
    expect(shiftMonth(2030, 12, 1)).toEqual({ y: 2031, m: 1 });
    expect(shiftMonth(2030, 1, -1)).toEqual({ y: 2029, m: 12 });
    expect(shiftMonth(2030, 6, 0)).toEqual({ y: 2030, m: 6 });
  });
});

describe('occursOn', () => {
  it('반복 없음: 그날만', () => {
    const e = mk({});
    expect(occursOn(e, '2030-01-15')).toBe(true);
    expect(occursOn(e, '2030-01-16')).toBe(false);
  });
  it('시작일 이전에는 열리지 않는다', () => {
    expect(occursOn(mk({ repeat: 'daily' }), '2030-01-14')).toBe(false);
    expect(occursOn(mk({ repeat: 'daily' }), '2030-01-16')).toBe(true);
  });
  it('평일: 월~금만', () => {
    const e = mk({ repeat: 'weekdays', date: '2030-01-14' });
    expect(occursOn(e, '2030-01-18')).toBe(true); // 금
    expect(occursOn(e, '2030-01-19')).toBe(false); // 토
    expect(occursOn(e, '2030-01-20')).toBe(false); // 일
  });
  it('매주: 같은 요일만', () => {
    const e = mk({ repeat: 'weekly' });
    expect(occursOn(e, '2030-01-22')).toBe(true);
    expect(occursOn(e, '2030-01-23')).toBe(false);
  });
  it('매달: 31일 시작은 짧은 달의 마지막 날', () => {
    const e = mk({ repeat: 'monthly', date: '2030-01-31' });
    expect(occursOn(e, '2030-02-28')).toBe(true);
    expect(occursOn(e, '2030-02-27')).toBe(false);
    expect(occursOn(e, '2030-03-31')).toBe(true);
  });
  it('매년: 같은 월/일, 2/29는 평년에 2/28', () => {
    const b = mk({ repeat: 'yearly', date: '2020-03-05' });
    expect(occursOn(b, '2031-03-05')).toBe(true);
    expect(occursOn(b, '2031-03-06')).toBe(false);
    const leap = mk({ repeat: 'yearly', date: '2020-02-29' });
    expect(occursOn(leap, '2031-02-28')).toBe(true);
    expect(occursOn(leap, '2032-02-29')).toBe(true);
  });
});

describe('eventsOn / monthCells', () => {
  it('하루 종일이 먼저, 그다음 시간순', () => {
    const list = [mk({ id: 'a', time: '15:00' }), mk({ id: 'b', time: '' }), mk({ id: 'c', time: '09:30' })];
    expect(eventsOn(list, '2030-01-15').map((e) => e.id)).toEqual(['b', 'c', 'a']);
  });
  it('달력은 42칸, 일요일 시작, 이번 달만 inMonth', () => {
    const cells = monthCells(2030, 1); // 2030-01-01 은 화요일
    expect(cells).toHaveLength(42);
    expect(cells[0].key).toBe('2029-12-30');
    expect(cells[0].inMonth).toBe(false);
    expect(cells[2].key).toBe('2030-01-01');
    expect(cells[2].inMonth).toBe(true);
    expect(cells.filter((c) => c.inMonth)).toHaveLength(31);
  });
});
