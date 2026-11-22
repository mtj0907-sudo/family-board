import { STATUS_CATALOG, statusOf, type StatusDef } from './constants';
import type { FamilySettings, Member } from './types';

/** 어른의 기본 상태 목록 */
export const PARENT_DEFAULT = [
  'home', 'work', 'going_home', 'pickup', 'shopping', 'errand',
  'cleaning', 'organizing', 'cooking', 'laundry', 'resting', 'exercise', 'sleep',
];

/** 아이의 기본 상태 목록 (어른 항목은 아예 나오지 않습니다) */
export const CHILD_DEFAULT = ['home', 'school', 'kid_going_home', 'academy', 'at_academy', 'playground', 'friend', 'study', 'gaming', 'eating', 'washing', 'tv', 'reading', 'sleep'];

export const defaultKeysFor = (m: Pick<Member, 'role'>): string[] => (m.role === 'parent' ? PARENT_DEFAULT : CHILD_DEFAULT);

/** 이 사람에게 설정에서 켜 줄 수 있는 상태(어른/아이에 어울리는 것 + 공통) */
export function selectableFor(m: Pick<Member, 'role'>): StatusDef[] {
  const want = m.role === 'parent' ? 'parent' : 'child';
  return STATUS_CATALOG.filter((s) => s.audience === 'both' || s.audience === want);
}

/** 이 사람이 상태 화면에서 보게 될 칩 목록 (고른 목록 또는 기본 목록 + 이 사람이 쓰는 "자주 가는 곳") */
export function statusesFor(m: Pick<Member, 'id' | 'role'>, settings: Pick<FamilySettings, 'statusSets' | 'customStatuses'>): StatusDef[] {
  const picked = settings.statusSets?.[m.id];
  const keys = picked && picked.length > 0 ? picked : defaultKeysFor(m);
  const base = keys.map((k) => statusOf(k)).filter((d): d is StatusDef => !!d);
  const customs: StatusDef[] = (settings.customStatuses ?? [])
    .filter((c) => !c.members || c.members.length === 0 || c.members.includes(m.id))
    .map((c) => ({ key: c.key, emoji: c.emoji, label: c.label, eta: c.eta }));
  return [...base, ...customs];
}
