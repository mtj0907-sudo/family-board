import { describe, expect, it } from 'vitest';
import { alertText, pickAlerts } from './boardAlert';
import type { Member, MessageDoc, WithId } from './types';

// 모두 가짜 데이터
const members: Member[] = [
  { id: 'm1', name: '가나', emoji: '', role: 'parent' },
  { id: 'm3', name: '다라', emoji: '', role: 'child' },
];
const msg = (id: string, at: number, over: Partial<MessageDoc> = {}): WithId<MessageDoc> => ({
  id,
  from: 'm3',
  kind: 'quick',
  key: 'love',
  at,
  ...over,
});

describe('pickAlerts', () => {
  it('열린 뒤에 온 것만, 오래된 순으로', () => {
    const r = pickAlerts([msg('b', 300), msg('old', 50), msg('a', 200)], { since: 100, alerted: new Set() });
    expect(r.map((m) => m.id)).toEqual(['a', 'b']);
  });
  it('이미 알린 것은 다시 알리지 않는다', () => {
    const r = pickAlerts([msg('a', 200), msg('b', 300)], { since: 100, alerted: new Set(['a']) });
    expect(r.map((m) => m.id)).toEqual(['b']);
  });
});

describe('alertText', () => {
  it('종류별 문구', () => {
    expect(alertText(msg('1', 1), members)).toBe('사랑해요');
    expect(alertText(msg('2', 1, { kind: 'note', key: 'note', text: '장 봐 올게' }), members)).toBe('장 봐 올게');
    expect(alertText(msg('3', 1, { kind: 'youtube', key: 'youtube' }), members)).toBe('유튜브 봐도 돼요?');
    expect(alertText(msg('4', 1, { key: 'when', to: 'm1' }), members)).toBe('가나에게 언제 와요?');
    expect(alertText(msg('5', 1, { key: 'when' }), members)).toBe('언제 와요?');
  });
});
