import type { Member } from './types';

/** 그림 속 인물 모습: 아빠(짧은 머리), 엄마(긴 머리), 남자아이, 여자아이 */
export type SceneLook = 'short' | 'long' | 'boy' | 'girl';
/** 간단한 그림(SVG)이 쓰는 모습 */
export type Look = 'short' | 'long';

export const LOOK_LABEL: Record<SceneLook, string> = { short: '아빠 모습', long: '엄마 모습', boy: '남자아이', girl: '여자아이' };

/** 직접 정한 모습이 있으면 그것을, 없으면 어른은 이름에 "엄마"가 들어 있으면 긴 머리·아니면 짧은 머리, 아이는 남자아이로 */
export function sceneLookOf(m: Pick<Member, 'name' | 'role' | 'look'>): SceneLook {
  if (m.look) return m.look;
  if (m.role === 'child') return 'boy';
  return /엄마|mom|mother|맘/i.test(m.name) ? 'long' : 'short';
}

/** 예전 이름 (간단한 그림용) */
export function lookOf(m: Pick<Member, 'name' | 'role' | 'look'>): Look {
  const l = sceneLookOf(m);
  return l === 'long' || l === 'girl' ? 'long' : 'short';
}

/** 어른 상태 그림이 있는 상태들 */
export const SCENE_KEYS = ['home', 'work', 'going_home', 'pickup', 'shopping', 'errand', 'hospital', 'cleaning', 'organizing', 'laundry', 'cooking', 'caring', 'resting', 'exercise', 'sleep'] as const;

/** 아이 상태 그림이 있는 상태들 */
export const KID_SCENE_KEYS = ['home', 'sleep', 'school', 'kid_going_home', 'academy', 'at_academy', 'playground', 'friend', 'study', 'gaming', 'eating', 'washing', 'tv', 'reading'] as const;

/** 이 상태와 모습에 3D 그림 파일이 있는지 */
export function hasClayScene(statusKey: string, look: SceneLook): boolean {
  const keys: readonly string[] = look === 'boy' || look === 'girl' ? KID_SCENE_KEYS : SCENE_KEYS;
  // "학원에 있어요"(at_academy)는 "학원 가는 중"(academy) 그림을 함께 씁니다
  return keys.includes(statusKey);
}

/** 그림 파일 이름에 쓰는 상태 이름 (at_academy는 academy 그림) */
export const sceneFile = (statusKey: string, look: SceneLook) => `${statusKey === 'at_academy' ? 'academy' : statusKey}-${look}`;
