import { eventsOn, type EventDoc } from './events';
import { kst, dateKey } from './time';
import type { FamilySettings, Member, WithId } from './types';

export type SpecialKind = 'birthday' | 'christmas' | 'newyear' | 'kids';

export interface SpecialDay {
  kind: SpecialKind;
  emoji: string;
  /** 화면에 크게 쓸 문구 */
  text: string;
}

export const PLACE_CHOICES = ['학교', '유치원', '어린이집'];

/** 생일처럼 달력에 등록한 일정으로 "오늘이 특별한 날"인지 알아봅니다. (제목에 '생일'이 있거나 🎂 아이콘) */
function birthdayToday(events: WithId<EventDoc>[], todayKey: string): WithId<EventDoc> | undefined {
  return eventsOn(events, todayKey).find((e) => e.title.includes('생일') || e.emoji === '🎂');
}

/**
 * 오늘의 특별한 날 하나 (우선순위: 생일 > 크리스마스 > 새해 > 어린이날).
 * - 생일: 달력에 '생일'이 들어간 일정(또는 🎂)이 오늘 열릴 때
 * - 크리스마스: 12월 한 달 (25일 전에는 남은 날, 25일은 "메리 크리스마스", 그 뒤는 연말 인사)
 * - 새해: 12/31 저녁 6시부터 1/1 하루
 * - 어린이날: 5/5
 */
export function specialDayOf(now: number, events: WithId<EventDoc>[]): SpecialDay | null {
  const k = dateKey(now);
  const t = kst(now);
  const b = birthdayToday(events, k);
  if (b) return { kind: 'birthday', emoji: '🎂', text: `${b.title.replace(/\s*축하.*$/, '')} 축하해요!` };

  if (t.m === 12) {
    // 새해 전야(12/31 저녁)는 아래 새해가 먼저 나오고, 트리는 12월 내내 그대로 있어요.
    if (!(t.d === 31 && t.hh >= 18)) {
      const left = 25 - t.d;
      const text = left > 1 ? `크리스마스까지 ${left}일` : left === 1 ? '오늘은 크리스마스 이브예요' : left === 0 ? '메리 크리스마스!' : '즐거운 연말 보내세요';
      return { kind: 'christmas', emoji: '🎄', text };
    }
  }
  if (t.m === 12 && t.d === 31 && t.hh >= 18) return { kind: 'newyear', emoji: '🎆', text: '올해도 수고했어요. 내일은 새해예요!' };
  if (t.m === 1 && t.d === 1) return { kind: 'newyear', emoji: '🎆', text: '새해 복 많이 받으세요!' };
  if (t.m === 5 && t.d === 5) return { kind: 'kids', emoji: '🎈', text: '어린이날 축하해요!' };
  return null;
}

/** 미리보기용 (눈으로 확인하려고) */
export function previewSpecial(kind: SpecialKind): SpecialDay {
  switch (kind) {
    case 'birthday':
      return { kind, emoji: '🎂', text: '생일 축하해요!' };
    case 'christmas':
      return { kind, emoji: '🎄', text: '메리 크리스마스!' };
    case 'newyear':
      return { kind, emoji: '🎆', text: '새해 복 많이 받으세요!' };
    default:
      return { kind, emoji: '🎈', text: '어린이날 축하해요!' };
  }
}

export interface Cheer {
  text: string;
  /** 예: "승우 학교 · 아림 유치원" (없으면 빈 글자) */
  detail: string;
}

/** 아이별로 평일에 가는 곳: 직접 정한 값, 없으면 "학교 가는 아이"는 학교 */
export function placesOf(settings: Pick<FamilySettings, 'dayPlaces' | 'schoolKids' | 'members'>): { member: Member; place: string }[] {
  return settings.members
    .filter((m) => m.role === 'child')
    .map((m) => ({ member: m, place: settings.dayPlaces?.[m.id] ?? ((settings.schoolKids ?? []).includes(m.id) ? '학교' : '') }))
    .filter((x) => !!x.place);
}

/** 응원 메시지 내용 (시간과 상관없이) */
export function cheerOf(settings: Pick<FamilySettings, 'dayPlaces' | 'schoolKids' | 'members'>): Cheer {
  const places = placesOf(settings);
  return {
    text: '새로운 한 주, 힘차게 시작해요!',
    detail: places.length ? `내일은 ${places.map((x) => `${x.member.name} ${x.place}`).join(' · ')}` : '',
  };
}

/** 일요일 오후 3시부터 자정까지: 새로운 한 주를 시작하는 응원 메시지 */
export function weekStartCheer(now: number, settings: Pick<FamilySettings, 'dayPlaces' | 'schoolKids' | 'members'>): Cheer | null {
  const t = kst(now);
  if (t.dow !== 0 || t.hh < 15) return null;
  return cheerOf(settings);
}

/** 12월 한 달 동안은 트리를 세워 둡니다 (생일이나 새해 문구가 나오는 날에도 트리는 그대로) */
export function treeSeason(now: number): boolean {
  return kst(now).m === 12;
}
