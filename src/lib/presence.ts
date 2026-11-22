import type { StatusDoc } from './types';

export type Presence = 'home' | 'sleep' | 'away' | 'none';

/** 집 안에서 하는 일로 보는 상태들 */
const HOME_KEYS = new Set(['home', 'cleaning', 'organizing', 'laundry', 'cooking', 'caring', 'resting', 'study', 'gaming', 'eating', 'washing', 'tv', 'reading']);

/** 지금 집에 있는지 (상태 글자로 짐작) */
export function presenceOf(st?: Pick<StatusDoc, 'key'> | null): Presence {
  if (!st) return 'none';
  if (st.key === 'sleep') return 'sleep';
  return HOME_KEYS.has(st.key) ? 'home' : 'away';
}

export const PRESENCE_COLOR: Record<Presence, string> = { home: '#38b27a', sleep: '#7d8fb3', away: '#e0a526', none: '#c3ccc7' };
