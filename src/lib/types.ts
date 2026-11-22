export type Role = 'parent' | 'child';

export interface Member {
  id: string;
  name: string;
  emoji: string;
  role: Role;
  /** 얼굴 사진(작게 줄인 JPEG 데이터). 가족 Firebase에만 저장되고 저장소에는 올라가지 않아요 */
  photo?: string;
}

export interface RoutineItem {
  key: string;
  emoji: string;
  label: string;
}

export interface CustomStatus {
  key: string;
  label: string;
  emoji: string;
  /** 도착 시각을 정할 수 있는 상태인지 */
  eta: boolean;
  /** 누가 쓰는지(구성원 id). 비어 있으면 모두 */
  members?: string[];
}

export interface FamilySettings {
  members: Member[];
  routineItems: RoutineItem[];
  pinHash: string;
  createdAt: number;
  /** 근무표를 쓰는 구성원 id (설정에서 고름) */
  workOwnerId?: string;
  /** 근무 코드별 근무 시간 글자 (예: { D: '08:00~17:00' }). 비어 있으면 코드만 표시 */
  workTimes?: Record<string, string>;
  /** 직접 만든 장소/상태 (예: "피아노 학원 가는 중") */
  customStatuses?: CustomStatus[];
  /** 사람마다 보일 상태 목록(상태 키 순서대로). 없으면 어른/아이 기본 목록 */
  statusSets?: Record<string, string[]>;
  /** 학교 가는 아이 (가방 챙기기를 쓰는 구성원 id) */
  schoolKids?: string[];
  /** 평일에 가는 곳 (아이 id → '학교' | '유치원' | '어린이집'). 일요일 저녁 응원 메시지에 씁니다 */
  dayPlaces?: Record<string, string>;
  /** 가방 챙기기 항목. 없으면 기본 항목 */
  bagItems?: RoutineItem[];
  /** 알림 서버 주소 (Cloudflare Workers) */
  pushUrl?: string;
  /** 알림 키 (설정에서 한 번 만들어 가족 설정에 저장) */
  pushPublic?: string;
  pushPrivate?: string;
  /** 구성원별 퇴근 후 집까지 평소 걸리는 시간(분). 예: { m2: 30 } */
  commuteMinutes?: Record<string, number>;
}

export interface StatusDoc {
  key: string;
  /** 직접 만든 장소/상태일 때만: 화면에 그대로 보이도록 같이 저장 */
  label?: string;
  emoji?: string;
  eta?: boolean;
  since: number;
  etaAt: number | null;
  etaFrom: number | null;
}

export type YoutubeAnswer = 'yes' | 'no' | '30';

export interface MessageDoc {
  from: string;
  kind: 'quick' | 'youtube' | 'note';
  key: string;
  at: number;
  /** 특정 사람에게 보낸 한마디일 때 받는 사람 id (예: "엄마 언제 와요?") */
  to?: string;
  /** 짧은 메모(kind: 'note')의 내용 */
  text?: string;
  reply?: { answer: YoutubeAnswer; at: number; by: string };
}

export interface RoutineDoc {
  done?: Record<string, Record<string, boolean>>;
  doing?: Record<string, string>;
}

export type WithId<T> = T & { id: string };
