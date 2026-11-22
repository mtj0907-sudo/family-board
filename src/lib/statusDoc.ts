import type { StatusDoc } from './types';

/**
 * 아이폰 단축어(위치 자동화)로 바뀐 상태 기록을 앱이 쓰는 모양으로 맞춥니다.
 * 단축어는 지금 시각을 서버 시각(`at`, 시간 값)으로 남기므로, 그 값을 `since`(밀리초 숫자)로 바꿔 줍니다.
 */
export function normalizeStatus<T extends Partial<StatusDoc> & { at?: unknown }>(d: T): T {
  const at = toMillis(d.at);
  if (at === null) return d;
  const since = typeof d.since === 'number' ? d.since : 0;
  return at > since ? { ...d, since: at } : d;
}

/** Firestore 시간 값(Timestamp)이나 숫자를 밀리초로 */
export function toMillis(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (v && typeof v === 'object' && typeof (v as { toMillis?: unknown }).toMillis === 'function') {
    const n = (v as { toMillis: () => number }).toMillis();
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** 경로가 상태 기록(컬렉션 또는 문서)인지 */
export const isStatusPath = (path: string) => /\/status(\/|$)/.test(path);
