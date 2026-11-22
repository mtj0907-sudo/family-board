import { store } from './storage';

const CODE_KEY = 'fb.code';
const ME_KEY = 'fb.me';

// 헷갈리는 글자(0 o 1 l i)는 뺀 31글자
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

/** 추측 불가한 가족 코드 (28자 ≈ 138비트) */
export function generateCode(len = 28): string {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}

/** 링크(`...#c=코드`), `#c=코드`, 코드 그대로를 모두 받아 코드만 꺼냅니다. */
export function parseJoinCode(input: string): string | null {
  const text = input.trim();
  const m = text.match(/[?#&]c=([a-z0-9]+)/i);
  const code = (m ? m[1] : text).toLowerCase();
  return /^[a-z0-9]{20,64}$/.test(code) ? code : null;
}

/** 다른 가족 기기에서 열 공유 링크. 코드는 # 뒤에 있어 서버로 전송되지 않습니다. */
export function buildJoinLink(base: string, code: string): string {
  return `${base.split('#')[0]}#c=${code}`;
}

export const getCode = () => store.get(CODE_KEY);
export const setCode = (c: string) => store.set(CODE_KEY, c);
export const getMeId = () => store.get(ME_KEY);
export const setMeId = (id: string | null) => (id ? store.set(ME_KEY, id) : store.remove(ME_KEY));
export function disconnect() {
  store.remove(CODE_KEY);
  store.remove(ME_KEY);
}
