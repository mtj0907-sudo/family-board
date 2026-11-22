import { describe, expect, it } from 'vitest';
import type { MessageDoc, WithId } from './types';
import { hasUnread } from './unread';

// 모두 가짜 데이터
const msg = (over: Partial<MessageDoc> & { id?: string }): WithId<MessageDoc> => ({
  id: over.id ?? 'x',
  from: 'kid',
  kind: 'quick',
  key: 'love',
  at: 1000,
  ...over,
});

describe('hasUnread', () => {
  it('부모: 본 뒤에 아이가 보낸 한마디가 있으면 표시', () => {
    const opts = { meId: 'mom', isParent: true, seen: 1500 };
    expect(hasUnread([msg({ at: 1000 })], opts)).toBe(false);
    expect(hasUnread([msg({ at: 2000 })], opts)).toBe(true);
  });
  it('부모: 내가 보낸 것은 읽지 않음으로 보지 않는다', () => {
    expect(hasUnread([msg({ from: 'mom', at: 2000 })], { meId: 'mom', isParent: true, seen: 1500 })).toBe(false);
  });
  it('부모: 답하지 않은 유튜브 요청은 답할 때까지 표시', () => {
    const pending = msg({ kind: 'youtube', key: 'youtube', at: 10 });
    expect(hasUnread([pending], { meId: 'mom', isParent: true, seen: 99999 })).toBe(true);
    const answered = { ...pending, reply: { answer: 'yes' as const, at: 20, by: 'mom' } };
    expect(hasUnread([answered], { meId: 'mom', isParent: true, seen: 99999 })).toBe(false);
  });
  it('아이: 본 뒤에 내 요청에 답이 달리면 표시', () => {
    const req = msg({ kind: 'youtube', key: 'youtube', at: 10, reply: { answer: 'no', at: 2000, by: 'mom' } });
    expect(hasUnread([req], { meId: 'kid', isParent: false, seen: 1500 })).toBe(true);
    expect(hasUnread([req], { meId: 'kid', isParent: false, seen: 2500 })).toBe(false);
    expect(hasUnread([req], { meId: 'other', isParent: false, seen: 0 })).toBe(false);
  });
  it('메모(note)도 한마디로 센다', () => {
    expect(hasUnread([msg({ kind: 'note', key: 'note', text: '장 봐 올게', at: 3000 })], { meId: 'dad', isParent: true, seen: 1000 })).toBe(true);
  });
});
