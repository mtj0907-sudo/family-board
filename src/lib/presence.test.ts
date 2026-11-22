import { describe, expect, it } from 'vitest';
import { presenceOf, presenceSummary } from './presence';
import type { Member } from './types';

// 모두 가짜 데이터
const members: Member[] = [
  { id: 'm1', name: '가나', emoji: '', role: 'parent' },
  { id: 'm2', name: '나다', emoji: '', role: 'parent' },
  { id: 'm3', name: '다라', emoji: '', role: 'child' },
];
const st = (id: string, key: string) => ({ id, key });

describe('집에 있는지', () => {
  it('상태로 짐작', () => {
    expect(presenceOf({ key: 'home' })).toBe('home');
    expect(presenceOf({ key: 'cooking' })).toBe('home');
    expect(presenceOf({ key: 'sleep' })).toBe('sleep');
    expect(presenceOf({ key: 'work' })).toBe('away');
    expect(presenceOf({ key: '직접만든것' })).toBe('away');
    expect(presenceOf(undefined)).toBe('none');
  });
  it('한 줄 요약: 밖에 있는 사람을 알려준다', () => {
    const r = presenceSummary(members, [st('m1', 'home'), st('m2', 'work'), st('m3', 'study')]);
    expect(r.homeCount).toBe(2);
    expect(r.text).toBe('지금 집에 2명 · 나다는 회사에서 일하는 중');
  });
  it('모두 집이면', () => {
    expect(presenceSummary(members, [st('m1', 'home'), st('m2', 'resting'), st('m3', 'sleep')]).text).toBe('모두 집에 있어요');
  });
  it('밖에 3명 이상이면 줄인다', () => {
    const r = presenceSummary(members, [st('m1', 'work'), st('m2', 'errand'), st('m3', 'school')]);
    expect(r.text).toContain('외 1명');
  });
  it('소식 없는 사람은 집에 세지 않는다', () => {
    expect(presenceSummary(members, []).text).toBe('지금 집에 0명');
  });
});
