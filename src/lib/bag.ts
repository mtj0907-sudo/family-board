import { dateKey, kst } from './time';
import type { FamilySettings, RoutineItem } from './types';

/** 가방 챙기기 기록 문서: bag/{날짜}. 날짜는 "밤에 챙기는 그날"이고, 다음 날 정오까지 같은 문서를 씁니다. */
export interface BagDoc {
  done?: Record<string, Record<string, boolean>>;
  skip?: Record<string, boolean>;
  doneAt?: Record<string, number>;
}

/** 정오에 새로 시작합니다. (밤 8시에 챙기고, 다음 날 아침에 빠진 것을 확인할 수 있게) */
export const bagDate = (ms: number): string => dateKey(ms - 12 * 3600 * 1000);

export function bagProgress(items: RoutineItem[], done?: Record<string, boolean>) {
  const total = items.length;
  const count = items.filter((i) => done?.[i.key]).length;
  return { done: count, total, complete: total > 0 && count === total };
}

/**
 * 가방 챙길 시간 안내: 학교 가기 전날 저녁 5시부터 그날 아침 9시 전까지.
 * 일요일~목요일 저녁, 그리고 월요일~금요일 아침에만 알려요. (금요일 밤, 토요일, 일요일 아침은 다음 날이 학교 안 가는 날이라 안내하지 않습니다)
 */
export function bagNudgeActive(now: number): boolean {
  const { hh, dow } = kst(now);
  if (hh >= 17) return dow >= 0 && dow <= 4; // 일(0)~목(4) 저녁
  if (hh < 9) return dow >= 1 && dow <= 5; // 월(1)~금(5) 아침 (전날 밤 안내의 이어짐)
  return false;
}

const CHEERS = [
  '잘했어요! 내일도 파이팅 💪',
  '가방 준비 끝! 내일도 신나게 다녀와요 🎒',
  '혼자서 척척 해냈네요. 멋져요 ⭐',
  '가방도 마음도 준비 완료! 😊',
  '꼼꼼하게 챙겼네요. 최고예요 👍',
];

/** 가방을 다 챙겼을 때 보여줄 응원 한마디. 같은 날에는 같은 말, 날마다 다른 말이 나오게 seed(날짜 등)로 고릅니다. */
export function bagCheer(seed: number): string {
  return CHEERS[Math.abs(Math.floor(seed)) % CHEERS.length];
}

export const DEFAULT_BAG_ITEMS: RoutineItem[] = [
  { key: 'homework', emoji: '📝', label: '숙제 다 했어요' },
  { key: 'notice', emoji: '📋', label: '알림장 확인했어요' },
  { key: 'books', emoji: '📚', label: '교과서·공책 챙겼어요' },
  { key: 'pencil', emoji: '✏️', label: '연필 다 깎았어요' },
  { key: 'supplies', emoji: '🎒', label: '준비물 챙겼어요' },
  { key: 'water', emoji: '💧', label: '물통 챙겼어요' },
];

/**
 * 가방 챙기기가 나오는 아이들: "평일에 가는 곳"이 학교인 아이.
 * (예전에 "학교 가는 아이"로 따로 고른 값은, 평일에 가는 곳을 아직 정하지 않은 아이에게만 따릅니다)
 */
export function schoolKidIds(s: Pick<FamilySettings, 'members' | 'schoolKids' | 'dayPlaces'>): string[] {
  return s.members
    .filter((m) => m.role === 'child')
    .filter((m) => {
      const place = s.dayPlaces?.[m.id];
      return place !== undefined ? place === '학교' : (s.schoolKids ?? []).includes(m.id);
    })
    .map((m) => m.id);
}
