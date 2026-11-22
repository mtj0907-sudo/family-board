import { describe, expect, it } from 'vitest';
import { hasFinal, subject, topic } from './korean';

describe('한국어 조사 (가짜 이름)', () => {
  it('받침 없음: 는/가', () => {
    expect(topic('엄마')).toBe('엄마는');
    expect(topic('가나')).toBe('가나는');
    expect(subject('가나')).toBe('가나가');
  });
  it('받침 있음: 은/이', () => {
    expect(topic('다름')).toBe('다름은');
    expect(subject('다름')).toBe('다름이');
    expect(topic('첫')).toBe('첫은');
  });
  it('한글이 아니거나 빈 글자는 받침 없음으로', () => {
    expect(hasFinal('Amy')).toBe(false);
    expect(hasFinal('')).toBe(false);
    expect(topic('Amy')).toBe('Amy는');
  });
});
