import type { Member } from './types';

export type Look = 'short' | 'long';

/** 그림 속 인물의 머리 모양: 이름에 "엄마"(또는 mom)가 들어 있으면 긴 머리, 아니면 짧은 머리 */
export function lookOf(m: Pick<Member, 'name'>): Look {
  return /엄마|mom|mother|맘/i.test(m.name) ? 'long' : 'short';
}

/** 상태 그림이 있는 상태들 (어른용) */
export const SCENE_KEYS = ['home', 'work', 'going_home', 'pickup', 'shopping', 'errand', 'hospital', 'cleaning', 'organizing', 'laundry', 'cooking', 'caring', 'resting', 'exercise', 'sleep'] as const;
