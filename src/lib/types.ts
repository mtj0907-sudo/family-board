export type Role = 'parent' | 'child';

export interface Member {
  id: string;
  name: string;
  emoji: string;
  role: Role;
}

export interface RoutineItem {
  key: string;
  emoji: string;
  label: string;
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
}

export interface StatusDoc {
  key: string;
  since: number;
  etaAt: number | null;
  etaFrom: number | null;
}

export type YoutubeAnswer = 'yes' | 'no' | '30';

export interface MessageDoc {
  from: string;
  kind: 'quick' | 'youtube';
  key: string;
  at: number;
  reply?: { answer: YoutubeAnswer; at: number; by: string };
}

export interface RoutineDoc {
  done?: Record<string, Record<string, boolean>>;
  doing?: Record<string, string>;
}

export type WithId<T> = T & { id: string };
