import { describe, expect, it } from 'vitest';
import type { StatusDoc } from './types';
import { whenHome } from './whenHome';

// 모두 가짜 데이터
const now = Date.UTC(2030, 0, 1, 9, 0); // 한국 18:00
const MIN = 60000;
const st = (key: string, over: Partial<StatusDoc> = {}): StatusDoc => ({
  key,
  since: now - 20 * MIN,
  etaAt: null,
  etaFrom: null,
  ...over,
});

describe('whenHome (엄마 언제 와요?)', () => {
  it('상태가 없으면 소식 없음 + 물어보기', () => {
    const a = whenHome({ name: '엄마', now });
    expect(a.headline).toBe('엄마는 아직 소식이 없어요');
    expect(a.canAsk).toBe(true);
  });

  it('도착 예정이 있으면 남은 시간과 시각을 알려준다', () => {
    const a = whenHome({
      name: '아빠',
      now,
      st: st('going_home', { etaAt: now + 35 * MIN, etaFrom: now - 5 * MIN }),
    });
    expect(a.headline).toBe('아빠는 집에 가는 중');
    expect(a.eta?.text).toBe('35분 남음');
    expect(a.eta?.clock).toBe('오후 6:35');
    expect(a.eta?.ratio).toBeCloseTo(5 / 40);
    expect(a.canAsk).toBe(false);
  });

  it('도착 예정 시각이 지났으면 곧 도착', () => {
    const a = whenHome({ name: '엄마', now, st: st('going_home', { etaAt: now - 2 * MIN, etaFrom: now - 30 * MIN }) });
    expect(a.eta?.text).toBe('곧 도착해요');
  });

  it('집에 있으면 물어볼 필요 없음', () => {
    const a = whenHome({ name: '엄마', now, st: st('home') });
    expect(a.headline).toBe('엄마는 집에 있어요');
    expect(a.canAsk).toBe(false);
  });

  it('회사에 있고 근무 시간이 설정돼 있으면 근무가 끝나는 시각을 알려준다', () => {
    const a = whenHome({ name: '엄마', now, st: st('work'), workCode: 'M12', workTimes: { M12: '12:00~21:00' } });
    expect(a.headline).toBe('엄마는 회사에서 일하는 중');
    expect(a.detail).toBe('오늘 근무는 오후 9:00에 끝나요');
    expect(a.canAsk).toBe(true);
  });

  it('근무 시간이 없거나 쉬는 날 코드면 설명을 붙이지 않는다', () => {
    expect(whenHome({ name: '엄마', now, st: st('work'), workCode: 'M12', workTimes: {} }).detail).toBeUndefined();
    expect(whenHome({ name: '엄마', now, st: st('work'), workCode: '휴', workTimes: { 휴: '09:00~18:00' } }).detail).toBeUndefined();
  });

  it('받침 있는 이름은 은', () => {
    expect(whenHome({ name: '다름', now, st: st('home') }).headline).toBe('다름은 집에 있어요');
  });
});
