import { dateKey, kst } from './time';
import type { RoutineItem } from './types';

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

/** 가방 챙길 시간(저녁 5시~다음 날 아침 9시 전)이면 알려줍니다. */
export function bagNudgeActive(now: number): boolean {
  const h = kst(now).hh;
  return h >= 17 || h < 9;
}

export const DEFAULT_BAG_ITEMS: RoutineItem[] = [
  { key: 'homework', emoji: '📝', label: '숙제 다 했어요' },
  { key: 'notice', emoji: '📋', label: '알림장 확인했어요' },
  { key: 'books', emoji: '📚', label: '교과서·공책 챙겼어요' },
  { key: 'pencil', emoji: '✏️', label: '연필 다 깎았어요' },
  { key: 'supplies', emoji: '🎒', label: '준비물 챙겼어요' },
  { key: 'water', emoji: '💧', label: '물통 챙겼어요' },
];
