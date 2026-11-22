import { topic } from './korean';
import { statusInfo } from './constants';
import type { Member, StatusDoc } from './types';

export type Presence = 'home' | 'sleep' | 'away' | 'none';

/** 집 안에서 하는 일로 보는 상태들 */
const HOME_KEYS = new Set(['home', 'cleaning', 'organizing', 'laundry', 'cooking', 'caring', 'resting', 'study', 'gaming']);

/** 지금 집에 있는지 (상태 글자로 짐작) */
export function presenceOf(st?: Pick<StatusDoc, 'key'> | null): Presence {
  if (!st) return 'none';
  if (st.key === 'sleep') return 'sleep';
  return HOME_KEYS.has(st.key) ? 'home' : 'away';
}

export const PRESENCE_COLOR: Record<Presence, string> = { home: '#38b27a', sleep: '#7d8fb3', away: '#e0a526', none: '#c3ccc7' };
export const PRESENCE_LABEL: Record<Presence, string> = { home: '집', sleep: '자는 중', away: '밖', none: '소식 없음' };

/** "지금 집에 3명 · 엄마는 회사에서 일하는 중" 같은 한 줄 */
export function presenceSummary(members: Member[], statuses: (Pick<StatusDoc, 'key'> & { id: string; label?: string; emoji?: string; eta?: boolean })[]): { homeCount: number; text: string } {
  const st = (id: string) => statuses.find((s) => s.id === id);
  const inHome = members.filter((m) => ['home', 'sleep'].includes(presenceOf(st(m.id))));
  const away = members.filter((m) => presenceOf(st(m.id)) === 'away');
  const homeCount = inHome.length;
  if (away.length === 0) return { homeCount, text: homeCount === members.length ? '모두 집에 있어요' : `지금 집에 ${homeCount}명` };
  const shown = away.slice(0, 2).map((m) => `${topic(m.name)} ${statusInfo(st(m.id))?.label ?? '밖에 있어요'}`);
  const more = away.length > 2 ? ` 외 ${away.length - 2}명` : '';
  return { homeCount, text: `지금 집에 ${homeCount}명 · ${shown.join(', ')}${more}` };
}
