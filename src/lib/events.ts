import type { WithId } from './types';

export type Repeat = 'none' | 'daily' | 'weekdays' | 'weekly' | 'monthly' | 'yearly';

/** 일정과 달력이 함께 쓰는 문서. 날짜는 한국 날짜 'YYYY-MM-DD', 시간은 'HH:MM'(비면 하루 종일) */
export interface EventDoc {
  title: string;
  emoji: string;
  date: string;
  time: string;
  /** 대상 구성원 id (비어 있으면 가족 전체) */
  who: string[];
  /** 데리러 갈 사람 id (없으면 빈 문자열) */
  pickupBy: string;
  repeat: Repeat;
}

export const REPEAT_OPTIONS: { key: Repeat; label: string }[] = [
  { key: 'none', label: '반복 안 함' },
  { key: 'daily', label: '매일' },
  { key: 'weekdays', label: '평일 (월~금)' },
  { key: 'weekly', label: '매주 (같은 요일)' },
  { key: 'monthly', label: '매달 (같은 날짜)' },
  { key: 'yearly', label: '매년 (생일 등)' },
];

export const repeatLabel = (r: Repeat) => REPEAT_OPTIONS.find((o) => o.key === r)?.label ?? '';

export const EVENT_EMOJIS = [
  '📌', '🎂', '🎓', '🏫', '🎨', '🎭', '🏥', '🦷', '✈️', '🏖', '⚽', '🎹',
  '📚', '🛒', '🍽', '🎉', '👪', '🚗', '🎒', '💼', '🎁', '🏊', '🚌', '☎️',
];

const pad = (n: number) => String(n).padStart(2, '0');

function parse(key: string): [number, number, number] {
  const [y, m, d] = key.split('-').map(Number);
  return [y, m, d];
}

export const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

export function weekdayOf(key: string): number {
  const [y, m, d] = parse(key);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function addDays(key: string, n: number): string {
  const [y, m, d] = parse(key);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

export const toKey = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

export function shiftMonth(y: number, m: number, delta: number): { y: number; m: number } {
  const idx = y * 12 + (m - 1) + delta;
  return { y: Math.floor(idx / 12), m: (idx % 12) + 1 };
}

/** 이 일정이 해당 날짜(key)에 열리는지 (반복 규칙 포함) */
export function occursOn(ev: Pick<EventDoc, 'date' | 'repeat'>, key: string): boolean {
  if (key < ev.date) return false;
  const [y, m, d] = parse(key);
  const [, sm, sd] = parse(ev.date);
  switch (ev.repeat) {
    case 'none':
      return key === ev.date;
    case 'daily':
      return true;
    case 'weekdays': {
      const w = weekdayOf(key);
      return w >= 1 && w <= 5;
    }
    case 'weekly':
      return weekdayOf(key) === weekdayOf(ev.date);
    // 31일 시작인데 그 달이 30일까지면 그 달 마지막 날에 표시
    case 'monthly':
      return d === Math.min(sd, daysInMonth(y, m));
    case 'yearly':
      return m === sm && d === Math.min(sd, daysInMonth(y, m));
    default:
      return key === ev.date;
  }
}

/** 하루 종일 일정이 먼저, 그다음 시간순 */
export function eventsOn(events: WithId<EventDoc>[], key: string): WithId<EventDoc>[] {
  return events
    .filter((e) => occursOn(e, key))
    .sort((a, b) => (a.time || '').localeCompare(b.time || '') || a.title.localeCompare(b.title));
}

/** 달력 칸 42개(6주). 이전/다음 달 날짜도 채웁니다. */
export function monthCells(y: number, m: number): { key: string; inMonth: boolean }[] {
  const first = toKey(y, m, 1);
  const start = addDays(first, -weekdayOf(first));
  return Array.from({ length: 42 }, (_, i) => {
    const key = addDays(start, i);
    return { key, inMonth: key.startsWith(`${y}-${pad(m)}-`) };
  });
}

/** 이번 달 마지막 날이 있는 주까지만 보여줍니다 (마지막 주가 통째로 비면 그 줄을 뺍니다). */
export function visibleCells(y: number, m: number): { key: string; inMonth: boolean }[] {
  const cells = monthCells(y, m);
  const last = cells.map((c) => c.inMonth).lastIndexOf(true);
  return cells.slice(0, Math.ceil((last + 1) / 7) * 7);
}
