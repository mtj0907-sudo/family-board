import { describe, expect, it } from 'vitest';
import { CHILD_DEFAULT, PARENT_DEFAULT, selectableFor, statusesFor } from './statusSets';
import { STATUS_CATALOG, statusInfo } from './constants';

// 모두 가짜 데이터
const parent = { id: 'm1', role: 'parent' as const };
const kid = { id: 'm3', role: 'child' as const };
const labels = (list: { label: string }[]) => list.map((s) => s.label);

describe('사람마다 다른 상태 목록', () => {
  it('아이 기본 목록에는 어른 항목이 하나도 없다', () => {
    const l = statusesFor(kid, {});
    const adultOnly = STATUS_CATALOG.filter((s) => s.audience === 'parent').map((s) => s.key);
    expect(l.some((s) => adultOnly.includes(s.key))).toBe(false);
    expect(labels(l)).toContain('학교에 있어요');
    expect(labels(l)).toContain('학원 가는 중');
    expect(labels(l)).not.toContain('장 보는 중');
    expect(labels(l)).not.toContain('데리러 가는 중');
    expect(labels(l)).not.toContain('회사에서 일하는 중');
  });
  it('어른 기본 목록에는 집안일이 들어 있고 아이 전용 항목은 없다', () => {
    const l = statusesFor(parent, {});
    expect(labels(l)).toEqual(expect.arrayContaining(['청소 중', '정리하는 중', '요리하는 중', '빨래 중', '회사에서 일하는 중', '장 보는 중']));
    expect(labels(l)).not.toContain('학교에 있어요');
    expect(labels(l)).not.toContain('놀이터에서 놀아요');
  });
  it('기본 목록의 키는 모두 실제로 있고, 어른/아이에 맞는 것만 들어 있다', () => {
    for (const [keys, role] of [[PARENT_DEFAULT, 'parent'], [CHILD_DEFAULT, 'child']] as const) {
      const ok = selectableFor({ role }).map((s) => s.key);
      for (const k of keys) expect(ok).toContain(k);
    }
  });
  it('설정에서 고른 목록이 있으면 그 순서대로, 모르는 키는 건너뛴다', () => {
    const l = statusesFor(parent, { statusSets: { m1: ['cleaning', 'home', 'nope', 'resting'] } });
    expect(labels(l)).toEqual(['청소 중', '집에 있어요', '쉬는 중']);
  });
  it('고른 목록이 비어 있으면 기본 목록', () => {
    expect(statusesFor(kid, { statusSets: { m3: [] } })).toEqual(statusesFor(kid, {}));
  });
  it('"자주 가는 곳"은 쓰는 사람에게만 (비우면 모두)', () => {
    const settings = {
      customStatuses: [
        { key: 'c1', label: '피아노 학원 가는 중', emoji: '🎹', eta: true, members: ['m3'] },
        { key: 'c2', label: '헬스장', emoji: '🏋️', eta: false },
      ],
    };
    expect(labels(statusesFor(kid, settings))).toEqual(expect.arrayContaining(['피아노 학원 가는 중', '헬스장']));
    expect(labels(statusesFor(parent, settings))).not.toContain('피아노 학원 가는 중');
    expect(labels(statusesFor(parent, settings))).toContain('헬스장');
  });
  it('예전에 저장된 상태(키)도 계속 읽힌다', () => {
    for (const k of ['home', 'work', 'going_home', 'pickup', 'shopping', 'academy', 'school', 'sleep']) {
      expect(statusInfo({ key: k })?.label).toBeTruthy();
    }
  });
  it('이동 상태만 도착 시각을 정할 수 있다', () => {
    expect(statusInfo({ key: 'cleaning' })?.eta).toBe(false);
    expect(statusInfo({ key: 'kid_going_home' })?.eta).toBe(true);
    expect(statusInfo({ key: 'errand' })?.eta).toBe(true);
  });
});

describe('지금 하는 일을 상태로 합침', () => {
  it('아이 기본 상태에 밥·씻기·영상·책이 들어 있고 어른에게는 안 나온다', () => {
    const kid = statusesFor({ id: 'x', role: 'child' }, {}).map((s) => s.key);
    expect(kid).toEqual(expect.arrayContaining(['study', 'gaming', 'eating', 'washing', 'tv', 'reading']));
    const parent = statusesFor({ id: 'y', role: 'parent' }, {}).map((s) => s.key);
    for (const k of ['eating', 'washing', 'tv', 'reading']) expect(parent).not.toContain(k);
  });
  it('상태 이름표와 아이콘이 있다', () => {
    expect(statusInfo({ key: 'eating' })?.label).toBe('밥 먹는 중');
    expect(statusInfo({ key: 'reading' })?.emoji).toBe('📖');
  });
  it('상태 키가 겹치지 않는다', () => {
    const keys = STATUS_CATALOG.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
