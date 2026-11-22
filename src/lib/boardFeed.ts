import { store } from './storage';
import { dateKey, dayStart, formatDateKo } from './time';

const KEY = 'fb.boardHidden';
const MAX = 200;
const DAY = 86400000;

/** "오늘", "어제", 그 밖에는 날짜 */
export function dayLabel(at: number, now: number): string {
  const diff = Math.round((dayStart(now) - dayStart(at)) / DAY);
  if (diff <= 0) return '오늘';
  if (diff === 1) return '어제';
  return formatDateKo(at);
}

/** 같은 날짜끼리 묶어서 (최신 날짜가 위), 날짜가 바뀔 때마다 이름표를 붙입니다. */
export function groupByDay<T extends { at: number }>(items: T[], now: number): { label: string; items: T[] }[] {
  const out: { label: string; key: string; items: T[] }[] = [];
  for (const it of [...items].sort((a, b) => b.at - a.at)) {
    const key = dateKey(it.at);
    const last = out[out.length - 1];
    if (last && last.key === key) last.items.push(it);
    else out.push({ key, label: dayLabel(it.at, now), items: [it] });
  }
  return out.map(({ label, items }) => ({ label, items }));
}

/** 이 태블릿에서만 숨긴 한마디 (가족 Firebase의 기록은 지우지 않아요) */
export function loadHidden(): string[] {
  try {
    const v = JSON.parse(store.get(KEY) ?? '[]');
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}
export function saveHidden(ids: string[]): void {
  store.set(KEY, JSON.stringify(ids.slice(-MAX)));
}
