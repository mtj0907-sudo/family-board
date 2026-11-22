import { describe, expect, it } from 'vitest';
import { normalizeStatus, toMillis } from './statusDoc';
import { buildShortcutRequest } from './shortcut';

// 모두 가짜 값
const base = { projectId: 'demo-proj', apiKey: 'AIza-test', code: 'abcdefghjkmnpqrstuvwxyz23456', memberId: 'm3' };

describe('buildShortcutRequest', () => {
  it('주소: 프로젝트와 키가 들어간 commit 주소', () => {
    const r = buildShortcutRequest({ ...base, status: { key: 'school' } });
    expect(r.url).toBe('https://firestore.googleapis.com/v1/projects/demo-proj/databases/(default)/documents:commit?key=AIza-test');
  });
  it('내용: 가족 코드와 아이 번호가 들어간 문서를 쓰고, 시각은 서버가 정한다', () => {
    const r = buildShortcutRequest({ ...base, status: { key: 'school' } });
    const j = JSON.parse(r.body);
    const w = j.writes[0];
    expect(w.update.name).toBe('projects/demo-proj/databases/(default)/documents/families/abcdefghjkmnpqrstuvwxyz23456/status/m3');
    expect(w.update.fields.key).toEqual({ stringValue: 'school' });
    expect(w.update.fields.etaAt).toEqual({ nullValue: null });
    expect(w.updateTransforms).toEqual([{ fieldPath: 'at', setToServerValue: 'REQUEST_TIME' }]);
  });
  it('직접 만든 장소는 이름·아이콘·도착 시각 여부가 같이 들어간다', () => {
    const r = buildShortcutRequest({ ...base, status: { key: 'c1', custom: { label: '피아노 학원', emoji: '🎹', eta: true } } });
    const f = JSON.parse(r.body).writes[0].update.fields;
    expect(f.label).toEqual({ stringValue: '피아노 학원' });
    expect(f.eta).toEqual({ booleanValue: true });
  });
  it('키에 특수문자가 있어도 주소가 깨지지 않는다', () => {
    expect(buildShortcutRequest({ ...base, apiKey: 'a b&c', status: { key: 'x' } }).url).toContain('key=a%20b%26c');
  });
});

describe('normalizeStatus', () => {
  it('서버 시각(at)이 있으면 since로 바꿔 준다', () => {
    const at = { toMillis: () => 5000 };
    expect((normalizeStatus({ key: 'school', since: 0, at } as never) as { since: number }).since).toBe(5000);
  });
  it('앱이 직접 바꾼 기록(at 없음)은 그대로', () => {
    const d = { key: 'home', since: 777, etaAt: null, etaFrom: null };
    expect(normalizeStatus(d)).toBe(d);
  });
  it('앱이 나중에 바꿨다면(since가 at보다 새 것) since를 유지', () => {
    expect((normalizeStatus({ key: 'home', since: 9000, at: { toMillis: () => 5000 } } as never) as { since: number }).since).toBe(9000);
  });
  it('toMillis', () => {
    expect(toMillis(12)).toBe(12);
    expect(toMillis({ toMillis: () => 34 })).toBe(34);
    expect(toMillis('x')).toBeNull();
  });
});
