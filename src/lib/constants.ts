import type { RoutineItem } from './types';

export interface StatusDef {
  key: string;
  emoji: string;
  label: string;
  /** 도착 예정 시각을 지정할 수 있는 상태 */
  eta: boolean;
}

export const STATUSES: StatusDef[] = [
  { key: 'home', emoji: '🏠', label: '집에 있어요', eta: false },
  { key: 'work', emoji: '💼', label: '회사에서 일하는 중', eta: false },
  { key: 'going_home', emoji: '🚗', label: '집에 가는 중', eta: true },
  { key: 'pickup', emoji: '🧒', label: '데리러 가는 중', eta: true },
  { key: 'shopping', emoji: '🛒', label: '장 보는 중', eta: true },
  { key: 'academy', emoji: '🎒', label: '학원 가는 중', eta: true },
  { key: 'school', emoji: '🏫', label: '학교에 있어요', eta: false },
  { key: 'sleep', emoji: '😴', label: '자는 중', eta: false },
];

export const statusOf = (key: string): StatusDef | undefined =>
  STATUSES.find((s) => s.key === key);

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

export const messageOf = (key: string): QuickMessage | undefined =>
  key === YOUTUBE_MESSAGE.key ? YOUTUBE_MESSAGE : QUICK_MESSAGES.find((m) => m.key === key);

export const DEFAULT_ROUTINE_ITEMS: RoutineItem[] = [
  { key: 'home', emoji: '🏠', label: '집 도착' },
  { key: 'homework', emoji: '✏️', label: '숙제' },
  { key: 'meal', emoji: '🍚', label: '밥' },
  { key: 'teeth', emoji: '🪥', label: '양치' },
];

/** 루틴 항목 중 "집 도착"에 해당하는 키 (집 도착 메시지/상태와 연동) */
export const ARRIVAL_ROUTINE_KEY = 'home';

export const DOING_OPTIONS = [
  { key: 'play', emoji: '🧸', label: '놀이 중' },
  { key: 'homework', emoji: '✏️', label: '숙제 중' },
  { key: 'eating', emoji: '🍚', label: '밥 먹는 중' },
  { key: 'wash', emoji: '🛁', label: '씻는 중' },
  { key: 'tv', emoji: '📺', label: '영상 보는 중' },
  { key: 'book', emoji: '📖', label: '책 읽는 중' },
  { key: 'sleep', emoji: '😴', label: '자는 중' },
];

export const doingOf = (key?: string) => DOING_OPTIONS.find((d) => d.key === key);

export const EMOJI_CHOICES = [
  '👨', '👩', '👦', '👧', '🧑', '👴', '👵', '🐻', '🐰', '🐱', '🐶', '🦊', '🐼', '🦁', '🐯', '🐸',
];

export const YOUTUBE_ALLOW_MINUTES = 30;
