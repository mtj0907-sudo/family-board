import { dateKey } from './time';

export type PetSpecies = 'dog' | 'rabbit' | 'cat' | 'hamster' | 'chick' | 'bear';

export const PET_SPECIES: { key: PetSpecies; label: string; emoji: string; defaultName: string }[] = [
  { key: 'dog', label: '강아지', emoji: '🐶', defaultName: '멍이' },
  { key: 'rabbit', label: '토끼', emoji: '🐰', defaultName: '토순이' },
  { key: 'cat', label: '고양이', emoji: '🐱', defaultName: '냥이' },
  { key: 'hamster', label: '햄스터', emoji: '🐹', defaultName: '햄이' },
  { key: 'chick', label: '병아리', emoji: '🐥', defaultName: '삐약이' },
  { key: 'bear', label: '곰', emoji: '🐻', defaultName: '곰돌이' },
];
export const speciesOf = (k: string) => PET_SPECIES.find((s) => s.key === k);

export type PetStage = 'egg' | 'baby' | 'kid' | 'adult';
/** 이 경험치(xp)부터 그 단계예요. 알은 0부터. */
export const STAGE_AT: Record<Exclude<PetStage, 'egg'>, number> = { baby: 20, kid: 120, adult: 300 };
export const STAGE_ORDER: PetStage[] = ['egg', 'baby', 'kid', 'adult'];

export type CareKey = 'feed' | 'play' | 'wash' | 'snack' | 'gift';
export interface PetDay {
  feed?: boolean;
  play?: boolean;
  wash?: boolean;
  snack?: boolean;
  gift?: boolean;
  /** 쓰다듬은 횟수 */
  love?: number;
}
export interface PetDoc {
  species: PetSpecies;
  name: string;
  xp: number;
  adoptedAt: number;
  /** 마지막으로 돌본 날 'YYYY-MM-DD' */
  lastCareDate?: string;
  days?: Record<string, PetDay>;
}

export const CARE: Record<CareKey, { label: string; emoji: string; xp: number }> = {
  feed: { label: '밥 주기', emoji: '🍚', xp: 10 },
  play: { label: '놀아주기', emoji: '🧸', xp: 10 },
  wash: { label: '씻겨주기', emoji: '🛁', xp: 10 },
  snack: { label: '간식 주기', emoji: '🍪', xp: 10 },
  gift: { label: '선물 주기', emoji: '🎁', xp: 15 },
};
export const CARE_KEYS: CareKey[] = ['feed', 'play', 'wash', 'snack', 'gift'];
export const LOVE_MAX = 5;

export function stageOf(xp: number): PetStage {
  if (xp >= STAGE_AT.adult) return 'adult';
  if (xp >= STAGE_AT.kid) return 'kid';
  if (xp >= STAGE_AT.baby) return 'baby';
  return 'egg';
}

/** 지금 단계 안에서 얼마나 왔는지(0~1)와 다음 단계까지 남은 경험치 */
export function stageProgress(xp: number): { stage: PetStage; ratio: number; toNext: number | null } {
  const stage = stageOf(xp);
  if (stage === 'adult') return { stage, ratio: 1, toNext: null };
  const next = stage === 'egg' ? STAGE_AT.baby : stage === 'baby' ? STAGE_AT.kid : STAGE_AT.adult;
  const from = stage === 'egg' ? 0 : stage === 'baby' ? STAGE_AT.baby : STAGE_AT.kid;
  return { stage, ratio: Math.min(1, Math.max(0, (xp - from) / (next - from))), toNext: Math.max(0, next - xp) };
}

export function stageLabel(species: PetSpecies, stage: PetStage): string {
  const name = speciesOf(species)?.label ?? '펫';
  if (stage === 'egg') return '알';
  if (stage === 'baby') return `아기 ${name}`;
  if (stage === 'kid') return `어린이 ${name}`;
  return `멋진 ${name}`;
}

/** 오늘 돌본 횟수(쓰다듬기는 제외) */
export const careCount = (d?: PetDay): number => CARE_KEYS.filter((k) => d?.[k]).length;

function daysBetween(a: string, b: string): number {
  const t = (k: string) => {
    const [y, m, d] = k.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((t(b) - t(a)) / 86400000);
}

export type PetMood = 'happy' | 'ok' | 'sad';

/**
 * 기분: 오늘 두 가지 이상 돌봤으면 좋음, 하나 돌봤거나 어제까지 돌봤으면 보통, 이틀 이상 못 만났으면 시무룩.
 * 시무룩해도 펫은 아프거나 사라지지 않아요. 다시 돌보면 바로 기뻐해요.
 */
export function moodOf(pet: Pick<PetDoc, 'days' | 'lastCareDate' | 'adoptedAt'>, today: string): PetMood {
  const n = careCount(pet.days?.[today]);
  if (n >= 2) return 'happy';
  if (n === 1) return 'ok';
  const last = pet.lastCareDate ?? dateKey(pet.adoptedAt);
  return daysBetween(last, today) >= 2 ? 'sad' : 'ok';
}

export interface CareContext {
  /** 오늘 할 일을 한 비율 (0~1) */
  routineRatio: number;
  /** 가방을 다 챙겼는지 */
  bagComplete: boolean;
  /** 학교 가는 아이인지 (아니면 할 일을 다 하면 선물이 열려요) */
  isSchoolKid: boolean;
}

export interface CareOption {
  key: CareKey;
  label: string;
  emoji: string;
  xp: number;
  state: 'ready' | 'done' | 'locked';
  note?: string;
}

/** 오늘 할 수 있는 돌봄 목록. 밥·놀이·씻기는 언제나 열려 있고, 간식과 선물은 진짜 할 일을 해야 열려요. */
export function careOptions(pet: Pick<PetDoc, 'days'>, today: string, ctx: CareContext): CareOption[] {
  const day = pet.days?.[today];
  return CARE_KEYS.map((key) => {
    const base = { key, ...CARE[key] };
    if (day?.[key]) return { ...base, state: 'done' as const };
    if (key === 'snack' && ctx.routineRatio < 0.5) return { ...base, state: 'locked' as const, note: '오늘 할 일을 반쯤 하면 열려요' };
    if (key === 'gift') {
      const open = ctx.isSchoolKid ? ctx.bagComplete : ctx.routineRatio >= 1;
      if (!open) return { ...base, state: 'locked' as const, note: ctx.isSchoolKid ? '가방을 다 챙기면 열려요' : '오늘 할 일을 다 하면 열려요' };
    }
    return { ...base, state: 'ready' as const };
  });
}

/** 단계마다 준비된 그림. 아직 없는 그림은 이전 단계 그림을 키워서 대신 보여줘요. */
const MISSING = new Set<string>(['bear-kid', 'bear-adult']);
const FALLBACK_SCALE: Record<'kid' | 'adult', number> = { kid: 1.18, adult: 1.38 };

export function petArt(species: PetSpecies, stage: PetStage): { src: string; scale: number } {
  if (stage === 'egg') return { src: 'pets/egg.webp', scale: 1 };
  if (MISSING.has(`${species}-${stage}`)) return { src: `pets/${species}-baby.webp`, scale: FALLBACK_SCALE[stage as 'kid' | 'adult'] };
  return { src: `pets/${species}-${stage}.webp`, scale: 1 };
}

/** 그림 파일 이름 목록 (파일이 모두 있는지 시험할 때 써요) */
export function petArtFiles(): string[] {
  const out = ['pets/egg.webp'];
  for (const s of PET_SPECIES) for (const st of ['baby', 'kid', 'adult'] as const) if (!MISSING.has(`${s.key}-${st}`)) out.push(`pets/${s.key}-${st}.webp`);
  return out;
}

/** 펫이 하는 말 */
export function petMessage(mood: PetMood, stage: PetStage, doneToday: number): string {
  if (stage === 'egg') return doneToday > 0 ? '알이 따뜻해졌어요. 조금만 더 기다려요' : '알이 아직 자고 있어요. 돌봐 주면 깨어나요';
  if (mood === 'sad') return '보고 싶었어요… 오늘 놀아 줄래요?';
  if (mood === 'happy') return doneToday >= 4 ? '오늘 최고예요! 사랑해요' : '기분이 좋아요! 고마워요';
  return doneToday === 0 ? '오늘도 같이 놀아요!' : '조금 더 놀고 싶어요';
}

/** 쓰다듬기로 받을 수 있는 남은 횟수 */
export const loveLeft = (d?: PetDay): number => Math.max(0, LOVE_MAX - (d?.love ?? 0));
