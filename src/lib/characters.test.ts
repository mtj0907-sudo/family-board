import { describe, expect, it } from 'vitest';
import { SCENE_KEYS, lookOf } from './characters';
import { STATUS_CATALOG } from './constants';

describe('lookOf', () => {
  it('엄마가 들어 있는 이름은 긴 머리, 그 밖에는 짧은 머리', () => {
    expect(lookOf({ name: '엄마' })).toBe('long');
    expect(lookOf({ name: 'mom' })).toBe('long');
    expect(lookOf({ name: '아빠' })).toBe('short');
    expect(lookOf({ name: '가나' })).toBe('short');
  });
});

describe('SCENE_KEYS', () => {
  it('어른 상태 목록의 모든 상태에 그림이 있다 (자는 중 포함)', () => {
    const adult = STATUS_CATALOG.filter((s) => s.audience !== 'child').map((s) => s.key);
    for (const k of adult) expect(SCENE_KEYS as readonly string[]).toContain(k);
  });
});
