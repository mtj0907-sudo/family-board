import { describe, expect, it } from 'vitest';
import { clockMarks } from './clockMarks';

// 한국 18:00 = 2030-01-01T09:00Z (모두 가짜 데이터)
const now = Date.UTC(2030, 0, 1, 9, 0);
const MIN = 60000;

describe('clockMarks', () => {
  it('도착 시각의 시계 각도: 6시 정각은 180도, 6시 30분은 195도', () => {
    expect(clockMarks([{ id: 'a', at: now + 0 * MIN + 1 }], now)[0].angle).toBeCloseTo(180, 0);
    expect(clockMarks([{ id: 'a', at: now + 30 * MIN }], now)[0].angle).toBeCloseTo(195, 5);
  });
  it('오후 6시 28분 → 194도', () => {
    expect(clockMarks([{ id: 'a', at: now + 28 * MIN }], now)[0].angle).toBeCloseTo(194, 5);
  });
  it('12시간 밖이거나 이미 한참 지난 도착은 숨긴다', () => {
    const r = clockMarks(
      [
        { id: 'far', at: now + 13 * 3600000 },
        { id: 'past', at: now - 30 * MIN },
        { id: 'ok', at: now + 20 * MIN },
        { id: 'justPast', at: now - 2 * MIN },
      ],
      now,
    );
    expect(r.map((m) => m.id).sort()).toEqual(['justPast', 'ok']);
  });
  it('가까운 시각은 안쪽 줄로 비켜서 놓는다', () => {
    const r = clockMarks(
      [
        { id: 'a', at: now + 20 * MIN },
        { id: 'b', at: now + 22 * MIN },
        { id: 'c', at: now + 120 * MIN },
      ],
      now,
    );
    expect(r.find((m) => m.id === 'a')?.ring).toBe(0);
    expect(r.find((m) => m.id === 'b')?.ring).toBe(1);
    expect(r.find((m) => m.id === 'c')?.ring).toBe(0);
  });
  it('12시 근처(0도와 360도)도 가까운 것으로 본다', () => {
    const midnight = Date.UTC(2030, 0, 1, 15, 0); // 한국 24:00 = 0도
    const r = clockMarks(
      [
        { id: 'a', at: midnight - 6 * MIN },
        { id: 'b', at: midnight + 6 * MIN },
      ],
      midnight - 60 * MIN,
    );
    expect(r.map((m) => m.ring)).toEqual([0, 1]);
  });
});
