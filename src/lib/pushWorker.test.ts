import { describe, expect, it } from 'vitest';
import { buildPayload, clip, isGone, parseSubscriptions, parseVapidKeys, selectTargets, validateRequest } from '../../worker/src/logic';

// 모두 가짜 값
const base = {
  projectId: 'demo-project',
  apiKey: 'fakeApiKey_fakeApiKey_1234',
  code: 'abcdefghjkmnpqrstuvwxyz23456',
  appOrigin: 'https://example.github.io',
  category: 'message',
  title: '가나',
  body: '사랑해요',
};

describe('validateRequest', () => {
  it('정상 요청', () => {
    const r = validateRequest(base);
    expect(r.ok).toBe(true);
  });
  it('잘못된 값은 이유와 함께 거절', () => {
    expect(validateRequest(null).ok).toBe(false);
    expect(validateRequest({ ...base, code: 'short' }).ok).toBe(false);
    expect(validateRequest({ ...base, projectId: 'A' }).ok).toBe(false);
    expect(validateRequest({ ...base, apiKey: 'x' }).ok).toBe(false);
    expect(validateRequest({ ...base, appOrigin: 'http://example.com' }).ok).toBe(false);
    expect(validateRequest({ ...base, category: 'hack' }).ok).toBe(false);
    expect(validateRequest({ ...base, title: '   ' }).ok).toBe(false);
  });
  it('테스트 알림은 받을 기기가 있어야 한다', () => {
    expect(validateRequest({ ...base, category: 'test' }).ok).toBe(false);
    expect(validateRequest({ ...base, category: 'test', onlyDevice: 'device-abc123' }).ok).toBe(true);
  });
  it('긴 글은 잘라낸다', () => {
    const r = validateRequest({ ...base, body: 'ㅁ'.repeat(500) });
    expect(r.ok && r.value.body.length).toBe(140);
    expect(clip('abcdef', 4)).toBe('abc…');
  });
});

const fs = (id: string, over: Record<string, unknown> = {}) => ({
  name: `projects/p/databases/(default)/documents/families/c/push/${id}`,
  fields: {
    endpoint: { stringValue: `https://push.example.test/${id}` },
    p256dh: { stringValue: 'pk' },
    auth: { stringValue: 'au' },
    memberId: { stringValue: 'm1' },
    prefStatus: { booleanValue: false },
    prefMessage: { booleanValue: true },
    prefPickup: { booleanValue: true },
    ...over,
  },
});

describe('parseSubscriptions / parseVapidKeys', () => {
  it('목록을 기기 목록으로 바꾼다', () => {
    const subs = parseSubscriptions({ documents: [fs('dev1'), fs('dev2', { prefStatus: { booleanValue: true } })] });
    expect(subs.map((s) => s.id)).toEqual(['dev1', 'dev2']);
    expect(subs[1].prefs.status).toBe(true);
  });
  it('불완전하거나 https가 아닌 문서는 건너뛴다, 설정 값이 없으면 기본값', () => {
    const bad = { name: 'x/push/bad', fields: { endpoint: { stringValue: 'http://insecure' } } };
    const noPrefs = { name: 'x/push/np', fields: { endpoint: { stringValue: 'https://e/1' }, p256dh: { stringValue: 'a' }, auth: { stringValue: 'b' } } };
    const subs = parseSubscriptions({ documents: [bad, noPrefs] });
    expect(subs).toHaveLength(1);
    expect(subs[0].prefs).toEqual({ status: false, message: true, pickup: true });
    expect(parseSubscriptions(null)).toEqual([]);
  });
  it('알림 키는 둘 다 있을 때만', () => {
    expect(parseVapidKeys({ fields: { pushPublic: { stringValue: 'a' }, pushPrivate: { stringValue: 'b' } } })).toEqual({ publicKey: 'a', privateKey: 'b' });
    expect(parseVapidKeys({ fields: { pushPublic: { stringValue: 'a' } } })).toBeNull();
    expect(parseVapidKeys(null)).toBeNull();
  });
});

describe('selectTargets', () => {
  const subs = parseSubscriptions({
    documents: [fs('mine'), fs('other'), fs('quiet', { prefMessage: { booleanValue: false } }), fs('statusOn', { prefStatus: { booleanValue: true } })],
  });
  it('보낸 기기는 빼고, 그 종류를 켠 기기에만', () => {
    expect(selectTargets(subs, { category: 'message', fromDevice: 'mine' }).map((s) => s.id)).toEqual(['other', 'statusOn']);
    expect(selectTargets(subs, { category: 'status', fromDevice: 'mine' }).map((s) => s.id)).toEqual(['statusOn']);
    expect(selectTargets(subs, { category: 'pickup' }).map((s) => s.id)).toEqual(['mine', 'other', 'quiet', 'statusOn']);
  });
  it('테스트 알림은 지정한 기기에만', () => {
    expect(selectTargets(subs, { category: 'test', onlyDevice: 'quiet' }).map((s) => s.id)).toEqual(['quiet']);
    expect(selectTargets(subs, { category: 'test', onlyDevice: 'nobody' })).toEqual([]);
  });
});

describe('buildPayload / isGone', () => {
  it('JSON 내용과 tag', () => {
    expect(JSON.parse(buildPayload({ category: 'status', title: '가나', body: '집에 가는 중' }))).toEqual({ title: '가나', body: '집에 가는 중', tag: 'fb-status' });
  });
  it('만료 응답', () => {
    expect(isGone(410)).toBe(true);
    expect(isGone(404)).toBe(true);
    expect(isGone(201)).toBe(false);
    expect(isGone(500)).toBe(false);
  });
});
