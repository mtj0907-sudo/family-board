import { describe, expect, it } from 'vitest';
import { KID_SCENE_KEYS, SCENE_KEYS, hasClayScene, lookOf, sceneFile, sceneLookOf } from './characters';
import { STATUS_CATALOG } from './constants';
import { CHILD_DEFAULT } from './statusSets';

const adult = (name: string, look?: 'short' | 'long' | 'boy' | 'girl') => ({ name, role: 'parent' as const, look });
const kid = (name: string, look?: 'short' | 'long' | 'boy' | 'girl') => ({ name, role: 'child' as const, look });

describe('그림 속 모습', () => {
  it('어른: 이름에 엄마가 들어 있으면 긴 머리, 아니면 짧은 머리', () => {
    expect(sceneLookOf(adult('엄마'))).toBe('long');
    expect(sceneLookOf(adult('mom'))).toBe('long');
    expect(sceneLookOf(adult('아빠'))).toBe('short');
    expect(sceneLookOf(adult('가나'))).toBe('short');
  });
  it('아이: 정하지 않으면 남자아이', () => {
    expect(sceneLookOf(kid('다라'))).toBe('boy');
  });
  it('직접 정한 모습이 이름 규칙보다 우선', () => {
    expect(sceneLookOf(kid('다라', 'girl'))).toBe('girl');
    expect(sceneLookOf(adult('엄마', 'short'))).toBe('short');
  });
  it('간단한 그림용 모습', () => {
    expect(lookOf(kid('다라', 'girl'))).toBe('long');
    expect(lookOf(kid('다라'))).toBe('short');
  });
});

describe('그림이 있는 상태', () => {
  it('어른 상태 목록의 모든 상태에 그림이 있다', () => {
    const keys = STATUS_CATALOG.filter((s) => s.audience !== 'child').map((s) => s.key);
    for (const k of keys) expect(SCENE_KEYS as readonly string[]).toContain(k);
  });
  it('아이 기본 상태 목록의 모든 상태에 그림이 있다 (학원에 있어요는 학원 그림을 같이 씀)', () => {
    for (const k of CHILD_DEFAULT) expect(hasClayScene(k, 'boy')).toBe(true);
    expect(hasClayScene('at_academy', 'girl')).toBe(true);
    expect(sceneFile('at_academy', 'girl')).toBe('academy-girl');
  });
  it('아이 그림과 어른 그림은 서로 다른 목록', () => {
    expect(hasClayScene('work', 'boy')).toBe(false);
    expect(hasClayScene('study', 'short')).toBe(false);
    expect(hasClayScene('home', 'girl')).toBe(true);
  });
  it('직접 만든 상태에는 그림이 없다', () => {
    expect(hasClayScene('c1', 'short')).toBe(false);
  });
  it('그림 파일 이름', () => {
    expect(sceneFile('going_home', 'long')).toBe('going_home-long');
    expect(KID_SCENE_KEYS.length).toBe(14);
  });
});
