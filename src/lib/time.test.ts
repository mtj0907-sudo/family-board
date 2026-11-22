import { describe, expect, it } from 'vitest';
import {
  clockAngles,
  dateKey,
  dayStart,
  etaFromTime,
  etaProgress,
  formatClock,
  formatClockKo,
  formatLeftKo,
  formatElapsed,
  formatRemaining,
} from './time';

// 2030-01-01T14:59:59Z = 한국 2030-01-01 23:59:59
const BEFORE_MIDNIGHT = Date.UTC(2030, 0, 1, 14, 59, 59);
const AFTER_MIDNIGHT = Date.UTC(2030, 0, 1, 15, 0, 0);

describe('time (KST)', () => {
  it('자정에 날짜 키가 바뀐다', () => {
    expect(dateKey(BEFORE_MIDNIGHT)).toBe('2030-01-01');
    expect(dateKey(AFTER_MIDNIGHT)).toBe('2030-01-02');
  });

  it('dayStart는 한국 0시', () => {
    expect(dayStart(AFTER_MIDNIGHT + 5 * 3600000)).toBe(AFTER_MIDNIGHT);
  });

  it('formatClock', () => {
    expect(formatClock(Date.UTC(2030, 0, 1, 9, 5))).toBe('오후 6:05');
    expect(formatClock(AFTER_MIDNIGHT)).toBe('오전 12:00');
    expect(formatClock(Date.UTC(2030, 0, 1, 3, 0))).toBe('오후 12:00');
  });

  it('formatElapsed', () => {
    expect(formatElapsed(20000)).toBe('방금');
    expect(formatElapsed(12 * 60000)).toBe('12분째');
    expect(formatElapsed(60 * 60000)).toBe('1시간째');
    expect(formatElapsed(125 * 60000)).toBe('2시간 5분째');
    expect(formatElapsed(49 * 3600000)).toBe('2일째');
  });

  it('formatRemaining', () => {
    expect(formatRemaining(-1)).toBe('도착할 시간이에요');
    expect(formatRemaining(61000)).toBe('2분 남음');
    expect(formatRemaining(90 * 60000)).toBe('1시간 30분 남음');
  });

  it('etaFromTime: 오늘 시각, 이미 지났으면 내일', () => {
    const now = Date.UTC(2030, 0, 1, 9, 0); // 한국 18:00
    expect(etaFromTime('18:30', now)).toBe(now + 30 * 60000);
    expect(etaFromTime('17:00', now)).toBe(now + 23 * 3600000);
    expect(etaFromTime('abc', now)).toBeNull();
  });

  it('etaProgress', () => {
    expect(etaProgress(0, 100, 50)).toBe(0.5);
    expect(etaProgress(0, 100, 500)).toBe(1);
    expect(etaProgress(100, 100, 150)).toBe(0);
  });

  it('clockAngles: 3시 정각', () => {
    const a = clockAngles(Date.UTC(2030, 0, 1, 6, 0, 0)); // 한국 15:00:00
    expect(a.hour).toBe(90);
    expect(a.minute).toBe(0);
    expect(a.second).toBe(0);
  });

  it('formatClockKo: 말로 읽는 시각', () => {
    expect(formatClockKo(Date.UTC(2030, 0, 1, 9, 28))).toBe('오후 6시 28분');
    expect(formatClockKo(Date.UTC(2030, 0, 1, 9, 0))).toBe('오후 6시');
    expect(formatClockKo(Date.UTC(2030, 0, 1, 15, 0))).toBe('오전 12시');
    expect(formatClockKo(Date.UTC(2030, 0, 1, 3, 5))).toBe('오후 12시 5분');
  });

  it('formatLeftKo: 남은 시간 말투', () => {
    expect(formatLeftKo(-1)).toBe('곧 도착해요');
    expect(formatLeftKo(35 * 60000)).toBe('35분 남았어요');
    expect(formatLeftKo(61000)).toBe('2분 남았어요');
    expect(formatLeftKo(110 * 60000)).toBe('1시간 50분 남았어요');
    expect(formatLeftKo(120 * 60000)).toBe('2시간 남았어요');
  });
});
