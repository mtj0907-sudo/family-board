import { describe, expect, it } from 'vitest';
import { hashPin, isUnlocked, isValidPin, lock, PIN_TTL_MS, unlock } from './pin';
import { createMemoryStore } from './storage';

describe('pin', () => {
  it('같은 PIN+소금은 같은 해시, 다르면 다른 해시', async () => {
    const a = await hashPin('1234', 'salt-a');
    expect(await hashPin('1234', 'salt-a')).toBe(a);
    expect(await hashPin('1235', 'salt-a')).not.toBe(a);
    expect(await hashPin('1234', 'salt-b')).not.toBe(a);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it('4자리 숫자만 유효', () => {
    expect(isValidPin('0000')).toBe(true);
    expect(isValidPin('123')).toBe(false);
    expect(isValidPin('12a4')).toBe(false);
    expect(isValidPin('12345')).toBe(false);
  });

  it('입력 후 30분간 유지, 이후 다시 잠김', () => {
    const kv = createMemoryStore();
    const t0 = 1_000_000;
    expect(isUnlocked(t0, kv)).toBe(false);
    unlock(t0, kv);
    expect(isUnlocked(t0 + PIN_TTL_MS - 1, kv)).toBe(true);
    expect(isUnlocked(t0 + PIN_TTL_MS, kv)).toBe(false);
    unlock(t0, kv);
    lock(kv);
    expect(isUnlocked(t0 + 1, kv)).toBe(false);
  });
});
