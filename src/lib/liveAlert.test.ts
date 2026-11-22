import { describe, expect, it } from 'vitest';
import { pickLiveAlerts } from './liveAlert';
import type { Member, MessageDoc, StatusDoc, WithId } from './types';

// 모두 가짜 데이터
const members: Member[] = [
  { id: 'm1', name: '가나', emoji: '', role: 'parent' },
  { id: 'm2', name: '나다', emoji: '', role: 'parent' },
  { id: 'm3', name: '다라', emoji: '', role: 'child' },
];
const msg = (id: string, at: number, over: Partial<MessageDoc> = {}): WithId<MessageDoc> => ({ id, from: 'm3', kind: 'quick', key: 'love', at, ...over });
const st = (id: string, since: number, key = 'home'): WithId<StatusDoc> => ({ id, key, since, etaAt: null, etaFrom: null });
const base = { members, statuses: [], msgs: [], meId: 'm1', isParent: true, since: 100, alerted: new Set<string>() };

describe('pickLiveAlerts', () => {
  it('부모: 앱을 연 뒤 다른 사람이 보낸 한마디만', () => {
    const r = pickLiveAlerts({ ...base, msgs: [msg('a', 200), msg('old', 50), msg('mine', 300, { from: 'm1' })] });
    expect(r.map((x) => x.id)).toEqual(['m:a']);
    expect(r[0]).toMatchObject({ who: '다라', tab: 'message' });
  });
  it('다른 부모에게만 간 한마디는 알리지 않는다', () => {
    const r = pickLiveAlerts({ ...base, msgs: [msg('a', 200, { to: 'm2' }), msg('b', 210, { to: 'm1' })] });
    expect(r.map((x) => x.id)).toEqual(['m:b']);
  });
  it('부모: 다른 사람의 상태 변경만, 내 상태는 제외', () => {
    const r = pickLiveAlerts({ ...base, statuses: [st('m3', 200, 'school'), st('m1', 210), st('m2', 50)] });
    expect(r.map((x) => x.id)).toEqual(['s:m3:200']);
    expect(r[0].who).toBe('다라');
    expect(r[0].text).toBe('학교에 있어요');
    expect(r[0].tab).toBe('status');
  });
  it('이미 알린 것은 다시 알리지 않고, 같은 사람이 또 바꾸면 새로 알린다', () => {
    const alerted = new Set(['s:m3:200']);
    expect(pickLiveAlerts({ ...base, alerted, statuses: [st('m3', 200)] })).toEqual([]);
    expect(pickLiveAlerts({ ...base, alerted, statuses: [st('m3', 300)] }).map((x) => x.id)).toEqual(['s:m3:300']);
  });
  it('오래된 순으로 정렬', () => {
    const r = pickLiveAlerts({ ...base, msgs: [msg('b', 300)], statuses: [st('m3', 200)] });
    expect(r.map((x) => x.id)).toEqual(['s:m3:200', 'm:b']);
  });
  it('아이: 어른의 한마디·상태는 알리지 않고, 내 유튜브 요청에 답이 달리면 알린다', () => {
    const kid = { ...base, meId: 'm3', isParent: false };
    expect(pickLiveAlerts({ ...kid, msgs: [msg('x', 200, { from: 'm1' })], statuses: [st('m1', 200)] })).toEqual([]);
    const replied = msg('y', 50, { kind: 'youtube', key: 'youtube', reply: { answer: 'yes', at: 400, by: 'm1' } } as Partial<MessageDoc>);
    const r = pickLiveAlerts({ ...kid, msgs: [replied] });
    expect(r.map((x) => x.id)).toEqual(['r:y']);
    expect(r[0].who).toBe('가나');
  });
});
