import type { RoutineItem } from './types';

export type StatusAudience = 'parent' | 'child' | 'both';

export interface StatusDef {
  key: string;
  emoji: string;
  label: string;
  /** 도착 예정 시각을 지정할 수 있는 상태 */
  eta: boolean;
  /** 누구에게 어울리는 상태인지 (어른/아이). 설정에서 사람마다 켜고 끌 수 있어요. */
  audience?: StatusAudience;
  /** 설정 화면에서 묶어 보여줄 이름 */
  group?: string;
}

/**
 * 고를 수 있는 상태 전체. 기존 기록과 호환되도록 예전 키(home, work, going_home, pickup, shopping, academy, school, sleep)는 그대로입니다.
 * 어떤 사람에게 보일지는 lib/statusSets.ts 에서 정합니다.
 */
export const STATUS_CATALOG: StatusDef[] = [
  // 공통
  { key: 'home', emoji: '🏠', label: '집에 있어요', eta: false, audience: 'both', group: '장소' },
  { key: 'sleep', emoji: '😴', label: '자는 중', eta: false, audience: 'both', group: '쉬기' },
  // 어른
  { key: 'work', emoji: '💼', label: '회사에서 일하는 중', eta: false, audience: 'parent', group: '장소' },
  { key: 'going_home', emoji: '🚗', label: '집에 가는 중', eta: true, audience: 'parent', group: '이동' },
  { key: 'pickup', emoji: '🧒', label: '데리러 가는 중', eta: true, audience: 'parent', group: '이동' },
  { key: 'shopping', emoji: '🛒', label: '장 보는 중', eta: true, audience: 'parent', group: '이동' },
  { key: 'errand', emoji: '🚶', label: '볼일 보는 중', eta: true, audience: 'parent', group: '이동' },
  { key: 'hospital', emoji: '🏥', label: '병원에 있어요', eta: false, audience: 'parent', group: '장소' },
  { key: 'cleaning', emoji: '🧹', label: '청소 중', eta: false, audience: 'parent', group: '집안일' },
  { key: 'organizing', emoji: '🗂', label: '정리하는 중', eta: false, audience: 'parent', group: '집안일' },
  { key: 'laundry', emoji: '🧺', label: '빨래 중', eta: false, audience: 'parent', group: '집안일' },
  { key: 'cooking', emoji: '🍳', label: '요리하는 중', eta: false, audience: 'parent', group: '집안일' },
  { key: 'caring', emoji: '👪', label: '아이 돌보는 중', eta: false, audience: 'parent', group: '쉬기' },
  { key: 'resting', emoji: '🛋', label: '쉬는 중', eta: false, audience: 'parent', group: '쉬기' },
  { key: 'exercise', emoji: '🏋️', label: '운동 중', eta: false, audience: 'parent', group: '쉬기' },
  // 아이
  { key: 'school', emoji: '🏫', label: '학교에 있어요', eta: false, audience: 'child', group: '장소' },
  { key: 'kid_going_home', emoji: '🚶', label: '집에 오는 중', eta: true, audience: 'child', group: '이동' },
  { key: 'academy', emoji: '🎒', label: '학원 가는 중', eta: true, audience: 'child', group: '이동' },
  { key: 'at_academy', emoji: '🎒', label: '학원에 있어요', eta: false, audience: 'child', group: '장소' },
  { key: 'playground', emoji: '🌳', label: '놀이터에서 놀아요', eta: false, audience: 'child', group: '장소' },
  { key: 'friend', emoji: '👫', label: '친구 집에 있어요', eta: false, audience: 'child', group: '장소' },
  { key: 'study', emoji: '📝', label: '공부·숙제 중', eta: false, audience: 'child', group: '집에서' },
  { key: 'gaming', emoji: '🎮', label: '게임·놀이 중', eta: false, audience: 'child', group: '집에서' },
  { key: 'eating', emoji: '🍚', label: '밥 먹는 중', eta: false, audience: 'child', group: '집에서' },
  { key: 'washing', emoji: '🛁', label: '씻는 중', eta: false, audience: 'child', group: '집에서' },
  { key: 'tv', emoji: '📺', label: '영상 보는 중', eta: false, audience: 'child', group: '집에서' },
  { key: 'reading', emoji: '📖', label: '책 읽는 중', eta: false, audience: 'child', group: '집에서' },
];

/** 예전 이름 (전체 목록) */
export const STATUSES = STATUS_CATALOG;

export const statusOf = (key: string): StatusDef | undefined => STATUS_CATALOG.find((s) => s.key === key);

export interface StatusLike {
  key: string;
  label?: string;
  emoji?: string;
  eta?: boolean;
}

/** 상태 기록 하나를 화면에 보일 모양으로. 직접 만든 장소는 기록에 이름·아이콘이 같이 들어 있습니다. */
export function statusInfo(st?: StatusLike | null): StatusDef | undefined {
  if (!st) return undefined;
  if (st.label) return { key: st.key, emoji: st.emoji ?? '📌', label: st.label, eta: !!st.eta };
  return statusOf(st.key);
}

export interface QuickMessage {
  key: string;
  emoji: string;
  label: string;
}

export const QUICK_MESSAGES: QuickMessage[] = [
  { key: 'arrived', emoji: '🏠', label: '집에 왔어요' },
  { key: 'hurry', emoji: '🏃', label: '빨리 오세요' },
  { key: 'hungry', emoji: '🍚', label: '배고파요' },
  { key: 'homework', emoji: '✏️', label: '숙제 다 했어요' },
  { key: 'miss', emoji: '🥺', label: '보고 싶어요' },
  { key: 'love', emoji: '❤️', label: '사랑해요' },
  { key: 'help', emoji: '🆘', label: '도와주세요' },
  { key: 'call', emoji: '📞', label: '전화해 주세요' },
];

export const YOUTUBE_MESSAGE: QuickMessage = {
  key: 'youtube',
  emoji: '📺',
  label: '유튜브 봐도 돼요?',
};

/** 거실 보드에서 "엄마 언제 와요?" 버튼을 눌렀을 때 부모에게 가는 질문 (한마디 버튼 목록에는 없음) */
export const ASK_WHEN_MESSAGE: QuickMessage = { key: 'when', emoji: '🕐', label: '언제 와요?' };

export const messageOf = (key: string): QuickMessage | undefined =>
  key === YOUTUBE_MESSAGE.key
    ? YOUTUBE_MESSAGE
    : key === ASK_WHEN_MESSAGE.key
      ? ASK_WHEN_MESSAGE
      : QUICK_MESSAGES.find((m) => m.key === key);

/** 거실 보드의 아이 카드에 놓는 그림 버튼 (한마디 버튼 중 집에서 쓰기 좋은 것) */
export const BOARD_MESSAGE_KEYS = ['love', 'miss', 'hungry', 'homework', 'help', 'call'];

export const DEFAULT_ROUTINE_ITEMS: RoutineItem[] = [
  { key: 'home', emoji: '🏠', label: '집 도착' },
  { key: 'homework', emoji: '✏️', label: '숙제' },
  { key: 'meal', emoji: '🍚', label: '밥' },
  { key: 'teeth', emoji: '🪥', label: '양치' },
];

/** 루틴 항목 중 "집 도착"에 해당하는 키 (집 도착 메시지/상태와 연동) */
export const ARRIVAL_ROUTINE_KEY = 'home';

export const EMOJI_CHOICES = [
  '👨', '👩', '👦', '👧', '🧑', '👴', '👵', '🐻', '🐰', '🐱', '🐶', '🦊', '🐼', '🦁', '🐯', '🐸',
];

export const YOUTUBE_ALLOW_MINUTES = 30;
