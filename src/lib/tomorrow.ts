import { addDays, eventsOn, type EventDoc } from './events';
import type { Member, WithId } from './types';

export interface TomorrowItem {
  id: string;
  emoji: string;
  /** 'HH:MM' 또는 '종일' */
  time: string;
  title: string;
  /** 누구 일정인지 (가족 전체면 빈 글자) */
  who: string;
}

/** 내일 열리는 일정을 시간 순으로 (반복 일정 포함) */
export function tomorrowItems(events: WithId<EventDoc>[], todayKey: string, members: Member[]): TomorrowItem[] {
  return eventsOn(events, addDays(todayKey, 1)).map((e) => ({
    id: e.id,
    emoji: e.emoji,
    time: e.time || '종일',
    title: e.title,
    who: e.who
      .map((id) => members.find((m) => m.id === id)?.name)
      .filter((n): n is string => !!n)
      .join('·'),
  }));
}
