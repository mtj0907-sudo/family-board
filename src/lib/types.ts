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
