import { describe, expect, it } from 'vitest';
import type { StatusDoc } from './types';
import { statusInfo } from './constants';
import { estimateEta, whenHome } from './whenHome';

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

describe('estimateEta', () => {
  it('본인이 정한 도착 시각이 우선', () => {
    const e = estimateEta(st('going_home', { etaAt: now + 10 * MIN, etaFrom: now - MIN }), 30);
    expect(e).toEqual({ at: now + 10 * MIN, from: now - MIN, estimated: false });
  });
  it('집에 가는 중 + 평소 시간이면 누른 때부터 더해 짐작', () => {
    const e = estimateEta(st('going_home'), 30);
    expect(e).toEqual({ at: now - 20 * MIN + 30 * MIN, from: now - 20 * MIN, estimated: true });
  });
  it('평소 시간이 없거나 다른 상태면 null', () => {
    expect(estimateEta(st('going_home'), undefined)).toBeNull();
    expect(estimateEta(st('going_home'), 0)).toBeNull();
    expect(estimateEta(st('shopping'), 30)).toBeNull();
    expect(estimateEta(undefined, 30)).toBeNull();
  });
});

describe('whenHome (엄마 언제 와요?)', () => {
  it('상태가 없으면 소식 없음 + 물어보기', () => {
    const a = whenHome({ name: '엄마', now });
    expect(a.headline).toBe('엄마는 아직 소식이 없어요');
    expect(a.canAsk).toBe(true);
  });

  it('본인이 정한 도착 예정이 있으면 남은 시간과 시각', () => {
    const a = whenHome({ name: '아빠', now, st: st('going_home', { etaAt: now + 35 * MIN, etaFrom: now - 5 * MIN }), commuteMin: 55 });
    expect(a.headline).toBe('아빠는 집에 가는 중');
    expect(a.eta?.text).toBe('35분 남음');
    expect(a.eta?.clockLabel).toBe('오후 6:35 도착 예정');
    expect(a.eta?.estimated).toBe(false);
    expect(a.eta?.ratio).toBeCloseTo(5 / 40);
    expect(a.canAsk).toBe(false);
  });

  it('도착 시각을 안 정해도 평소 걸리는 시간으로 짐작해 알려준다 (아빠 55분)', () => {
    const a = whenHome({ name: '아빠', now, st: st('going_home', { since: now - 15 * MIN }), commuteMin: 55 });
    expect(a.eta?.text).toBe('약 40분 남음');
    expect(a.eta?.clockLabel).toBe('약 오후 6:40 도착 예상');
    expect(a.eta?.estimated).toBe(true);
    expect(a.details).toEqual(['평소 55분 걸려요']);
    expect(a.canAsk).toBe(false);
  });

  it('짐작한 시각이 지났으면 곧 도착', () => {
    const a = whenHome({ name: '엄마', now, st: st('going_home', { since: now - 45 * MIN }), commuteMin: 30 });
    expect(a.eta?.text).toBe('곧 도착해요');
  });

  it('집에 있으면 물어볼 필요 없음', () => {
    const a = whenHome({ name: '엄마', now, st: st('home') });
    expect(a.headline).toBe('엄마는 집에 있어요');
    expect(a.canAsk).toBe(false);
  });

  it('회사에 있고 근무 시간이 있으면 끝나는 시각과 집 도착 예상 (엄마 30분)', () => {
    const a = whenHome({ name: '엄마', now, st: st('work'), workCode: 'M12', workTimes: { M12: '12:00~21:00' }, commuteMin: 30 });
    expect(a.headline).toBe('엄마는 일하는 중');
    expect(a.details).toEqual(['오늘 근무는 오후 9:00에 끝나요', '집에는 약 오후 9:30쯤 도착해요']);
    expect(a.canAsk).toBe(true);
  });

  it('야간 근무는 다음 날 아침에 끝난다', () => {
    const late = Date.UTC(2030, 0, 1, 14, 0); // 한국 23:00
    const a = whenHome({ name: '엄마', now: late, st: st('work'), workCode: 'N', workTimes: { N: '22:00~07:00' }, commuteMin: 30 });
    expect(a.details).toEqual(['오늘 근무는 오전 7:00에 끝나요', '집에는 약 오전 7:30쯤 도착해요']);
  });

  it('근무 시간이 없으면 평소 걸리는 시간만 알려준다 (아빠 55분)', () => {
    const a = whenHome({ name: '아빠', now, st: st('work'), commuteMin: 55 });
    expect(a.details).toEqual(['퇴근하면 집까지 약 55분 걸려요']);
  });

  it('쉬는 날 코드이거나 이미 근무가 끝난 시각이면 근무 설명을 붙이지 않는다', () => {
    expect(whenHome({ name: '엄마', now, st: st('work'), workCode: '휴', workTimes: { 휴: '09:00~18:00' } }).details).toEqual([]);
    const after = whenHome({ name: '엄마', now, st: st('work'), workCode: 'D', workTimes: { D: '08:00~17:00' }, commuteMin: 30 });
    expect(after.details).toEqual(['퇴근하면 집까지 약 30분 걸려요']);
  });

  it('받침 있는 이름은 은', () => {
    expect(whenHome({ name: '다름', now, st: st('home') }).headline).toBe('다름은 집에 있어요');
  });

  it('직접 만든 장소도 기록에 담긴 이름으로 보여준다', () => {
    const a = whenHome({ name: '가나', now, st: st('c1', { label: '피아노 학원 가는 중', emoji: '🎹', eta: true }) });
    expect(a.headline).toBe('가나는 피아노 학원 가는 중');
    expect(a.canAsk).toBe(true);
  });
});

describe('statusInfo', () => {
  it('기본 상태, 직접 만든 장소, 모르는 키', () => {
    expect(statusInfo({ key: 'home' })?.label).toBe('집에 있어요');
    expect(statusInfo({ key: 'c9', label: '수영장', emoji: '🏊', eta: true })).toEqual({ key: 'c9', label: '수영장', emoji: '🏊', eta: true });
    expect(statusInfo({ key: 'nope' })).toBeUndefined();
    expect(statusInfo(undefined)).toBeUndefined();
  });
});
