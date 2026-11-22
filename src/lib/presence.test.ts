import { describe, expect, it } from 'vitest';
import { presenceOf } from './presence';

describe('집에 있는지', () => {
  it('상태로 짐작', () => {
    expect(presenceOf({ key: 'home' })).toBe('home');
    expect(presenceOf({ key: 'cooking' })).toBe('home');
    expect(presenceOf({ key: 'sleep' })).toBe('sleep');
    expect(presenceOf({ key: 'work' })).toBe('away');
    expect(presenceOf({ key: '직접만든것' })).toBe('away');
    expect(presenceOf(undefined)).toBe('none');
  });
  it('아이가 집에서 하는 일(밥·씻기·영상·책)도 집으로 본다', () => {
    for (const key of ['eating', 'washing', 'tv', 'reading', 'study', 'gaming']) expect(presenceOf({ key })).toBe('home');
  });
});
