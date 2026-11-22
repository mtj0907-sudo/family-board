import { store, type KV } from './storage';

export const PIN_TTL_MS = 30 * 60 * 1000;
const KEY = 'fb.pinUntil';

/** PIN은 가족 코드를 소금(salt)으로 SHA-256 해시해서 저장합니다. (4자리는 아이의 실수 방지용 잠금) */
export async function hashPin(pin: string, salt: string): Promise<string> {
  const buf = new TextEncoder().encode(`${salt}:${pin}`);
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

export const isValidPin = (pin: string) => /^\d{4}$/.test(pin);

/** 이 기기에서 PIN 잠금이 풀려 있는지 (마지막 입력 후 30분) */
export function isUnlocked(now = Date.now(), kv: KV = store): boolean {
  const until = Number(kv.get(KEY));
  return Number.isFinite(until) && until > now;
}

export function unlock(now = Date.now(), kv: KV = store): void {
  kv.set(KEY, String(now + PIN_TTL_MS));
}

export function lock(kv: KV = store): void {
  kv.remove(KEY);
}
