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
/** 이 만큼 자랐으면(성장 점수) 그 단계예요. 하루에 자랄 수 있는 점수에 한도(DAY_GROWTH)가 있어서 매일 조금씩 커져요. */
export const STAGE_AT: Record<Exclude<PetStage, 'egg'>, number> = { baby: 10, kid: 60, adult: 200 };
export const STAGE_ORDER: PetStage[] = ['egg', 'baby', 'kid', 'adult'];
/** 하루에 자랄 수 있는 최대 성장 점수. (돌보기 횟수에는 제한이 없고, 키만 천천히 커요) */
export const DAY_GROWTH = 10;

export interface Stat {
  v: number;
  at: number;
}
export type StatKey = 'belly' | 'energy' | 'clean';
export interface PetDay {
  /** 오늘 돌본 횟수 */
  n?: number;
  /** 오늘 번 경험치 (성장은 DAY_GROWTH까지만 반영) */
  xp?: number;
  /** 오늘 받은 보상 상자 */
  claimed?: Partial<Record<RewardKey, boolean>>;
  /** 예전 기록 */
  feed?: boolean;
  play?: boolean;
  wash?: boolean;
  snack?: boolean;
  gift?: boolean;
}
export interface PetDoc {
  species: PetSpecies;
  name: string;
  adoptedAt: number;
  /** 마지막으로 돌본 날 'YYYY-MM-DD' */
  lastCareDate?: string;
  days?: Record<string, PetDay>;
  /** 가진 간식 개수 (퀴즈·미니게임·할 일 보상으로 얻어요) */
  snacks?: number;
  belly?: Stat;
  energy?: Stat;
  clean?: Stat;
}

/** 오늘까지 쌓인 성장 점수: 날마다 DAY_GROWTH를 넘지 않게 더해요 */
export function growthOf(pet: Pick<PetDoc, 'days'>): number {
  let g = 0;
  for (const d of Object.values(pet.days ?? {})) g += Math.min(DAY_GROWTH, d.xp ?? legacyCount(d) * 3);
  return g;
}
const legacyCount = (d: PetDay) => (['feed', 'play', 'wash', 'snack', 'gift'] as const).filter((k) => d[k]).length;
/** 오늘 자란 점수 */
export const todayGrowth = (d?: PetDay): number => Math.min(DAY_GROWTH, d?.xp ?? 0);

export function stageOf(g: number): PetStage {
  if (g >= STAGE_AT.adult) return 'adult';
  if (g >= STAGE_AT.kid) return 'kid';
  if (g >= STAGE_AT.baby) return 'baby';
  return 'egg';
}

/** 지금 단계 안에서 얼마나 왔는지(0~1)와 다음 단계까지 남은 점수 */
export function stageProgress(g: number): { stage: PetStage; ratio: number; toNext: number | null } {
  const stage = stageOf(g);
  if (stage === 'adult') return { stage, ratio: 1, toNext: null };
  const next = stage === 'egg' ? STAGE_AT.baby : stage === 'baby' ? STAGE_AT.kid : STAGE_AT.adult;
  const from = stage === 'egg' ? 0 : stage === 'baby' ? STAGE_AT.baby : STAGE_AT.kid;
  return { stage, ratio: Math.min(1, Math.max(0, (g - from) / (next - from))), toNext: Math.max(0, next - g) };
}

/** 같은 단계 안에서도 날마다 조금씩 커 보이게: 0.86배에서 1.0배까지 */
export const growScale = (ratio: number): number => 0.86 + 0.14 * Math.min(1, Math.max(0, ratio));

export function stageLabel(species: PetSpecies, stage: PetStage): string {
  const name = speciesOf(species)?.label ?? '펫';
  if (stage === 'egg') return '알';
  if (stage === 'baby') return `아기 ${name}`;
  if (stage === 'kid') return `어린이 ${name}`;
  return `멋진 ${name}`;
}

/** 오늘 돌본 횟수 */
export const careCount = (d?: PetDay): number => d?.n ?? (d ? legacyCount(d) : 0);

function daysBetween(a: string, b: string): number {
  const t = (k: string) => {
    const [y, m, d] = k.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((t(b) - t(a)) / 86400000);
}
/** 데려온 지 며칠째인지 (첫날 = 1) */
export const dayNumber = (adoptedAt: number, today: string): number => daysBetween(dateKey(adoptedAt), today) + 1;

export type PetMood = 'happy' | 'ok' | 'sad';

/**
 * 기분: 오늘 세 번 이상 돌봤으면 좋음, 한 번 이상이거나 어제까지 돌봤으면 보통, 이틀 이상 못 만났으면 시무룩.
 * 시무룩해도 펫은 아프거나 사라지지 않아요. 다시 돌보면 바로 기뻐해요.
 */
export function moodOf(pet: Pick<PetDoc, 'days' | 'lastCareDate' | 'adoptedAt'>, today: string): PetMood {
  const n = careCount(pet.days?.[today]);
  if (n >= 3) return 'happy';
  if (n >= 1) return 'ok';
  const last = pet.lastCareDate ?? dateKey(pet.adoptedAt);
  return daysBetween(last, today) >= 2 ? 'sad' : 'ok';
}

/* ───────── 배부름·기운·깨끗함 ───────── */
const START: Record<StatKey, number> = { belly: 55, energy: 100, clean: 80 };
/** 한 시간에 변하는 양 (배부름·깨끗함은 줄고, 기운은 쉬면 차올라요) */
const RATE: Record<StatKey, number> = { belly: -14, energy: 12, clean: -6 };
const clamp = (n: number) => Math.min(100, Math.max(0, n));

export function statNow(pet: Pick<PetDoc, StatKey>, key: StatKey, now: number): number {
  const s = pet[key];
  if (!s) return START[key];
  return Math.round(clamp(s.v + ((now - s.at) / 3600000) * RATE[key]));
}
export interface Stats {
  belly: number;
  energy: number;
  clean: number;
}
export const statsNow = (pet: Pick<PetDoc, StatKey>, now: number): Stats => ({
  belly: statNow(pet, 'belly', now),
  energy: statNow(pet, 'energy', now),
  clean: statNow(pet, 'clean', now),
});

export type ActionKey = 'feed' | 'snack' | 'play' | 'wash' | 'hug' | 'dance' | 'sleep';
export const ACTIONS: { key: ActionKey; label: string; emoji: string }[] = [
  { key: 'feed', label: '밥 주기', emoji: '🍚' },
  { key: 'snack', label: '간식 주기', emoji: '🍪' },
  { key: 'play', label: '놀아주기', emoji: '🧸' },
  { key: 'wash', label: '씻겨주기', emoji: '🛁' },
  { key: 'hug', label: '안아주기', emoji: '🤗' },
  { key: 'dance', label: '춤추기', emoji: '💃' },
  { key: 'sleep', label: '재우기', emoji: '😴' },
];

/** 펫이 보여줄 동작 */
export type Anim = 'idle' | 'walk' | 'eat' | 'refuse' | 'flee' | 'play' | 'hide' | 'jump' | 'wash' | 'shake' | 'hug' | 'dance' | 'sleep' | 'dizzy' | 'tickle';

export interface Reaction {
  /** 받아들였는지 (거절하면 경험치도 간식도 쓰지 않아요) */
  ok: boolean;
  anim: Anim;
  say: string;
  /** 번 경험치 */
  xp: number;
  /** 바뀌는 수치 (새 값) */
  set: Partial<Stats>;
  /** 간식 개수 변화 */
  snack: number;
  /** 화면에 날릴 이모지 */
  fx: string[];
  /** 동작이 이어지는 시간(ms) */
  ms: number;
}

const pick = <T,>(arr: T[], r: number): T => arr[Math.min(arr.length - 1, Math.floor(r * arr.length))];
const SNACKS = ['🍪', '🍎', '🥕', '🍓', '🍰', '🍩'];

/**
 * 아이가 한 행동에 펫이 어떻게 반응하는지.
 * 횟수 제한은 없고, 너무 많이 주면 "배불러요"하고 거절하거나 도망가요.
 * pushed = 같은 행동을 거절당하고도 계속 누른 횟수, r = 0~1 사이 무작위 값
 */
export function react(action: ActionKey, s: Stats, pushed: number, r: number): Reaction {
  const base = { ok: true, xp: 0, set: {}, snack: 0, fx: [] as string[], ms: 1800 };
  const no = (anim: Anim, say: string, fx: string[], ms = 1800): Reaction => ({ ...base, ok: false, anim, say, fx, ms });
  switch (action) {
    case 'feed': {
      if (s.belly >= 85) {
        return pushed >= 2 ? no('flee', '꺅! 이제 정말 못 먹어요~ 도망가요!', ['💦'], 3200) : no('refuse', '배불러요! 이제 안 먹을래요', ['💢']);
      }
      const slow = s.belly >= 60;
      return {
        ...base,
        anim: 'eat',
        xp: slow ? 2 : 3,
        set: { belly: clamp(s.belly + (slow ? 15 : 35)) },
        say: slow ? '배가 불러 가요… 조금만 더 먹을게요' : pick(['냠냠! 맛있어요', '쩝쩝~ 힘이 나요!', '밥이 최고예요!'], r),
        fx: ['🍚', '✨'],
        ms: 2200,
      };
    }
    case 'snack': {
      if (s.belly >= 90) {
        return pushed >= 1 ? no('flee', '간식은 더 못 먹어요! 도망갈래요~', ['💦', '💨'], 3200) : no('refuse', '으윽, 배가 빵빵해서 못 먹겠어요', ['💢']);
      }
      const full = s.belly >= 70;
      return {
        ...base,
        anim: 'eat',
        xp: full ? 1 : 3,
        snack: -1,
        set: { belly: clamp(s.belly + (full ? 8 : 12)) },
        say: full ? '으… 배가 빵빵해요. 꺼억!' : pick(['와! 간식이다!', '이 맛이에요! 또 줘요~', '달콤해서 행복해요'], r),
        fx: [pick(SNACKS, r), full ? '💨' : '✨'],
        ms: 2200,
      };
    }
    case 'play': {
      if (s.energy < 15) return no('sleep', '너무 졸려서 못 놀아요… 쿨쿨', ['💤'], 2600);
      if (s.belly < 15) return no('refuse', '배고파서 힘이 없어요. 밥 먼저 줄래요?', ['🍚']);
      const kind = pick<Anim>(['play', 'hide', 'jump', 'dance'], r);
      const say: Record<string, string> = { play: '공놀이 신나요! 이리 와요~', hide: '숨바꼭질! 어디 숨었게요? 짜잔!', jump: '폴짝폴짝! 높이 뛰어요', dance: '신나서 춤이 나와요!' };
      const fx: Record<string, string[]> = { play: ['⚽', '✨'], hide: ['❓', '🎉'], jump: ['⭐', '✨'], dance: ['🎵', '🎶'] };
      return { ...base, anim: kind, xp: 3, set: { energy: clamp(s.energy - 18), belly: clamp(s.belly - 5) }, say: s.energy < 35 ? '헉헉… 그래도 재밌어요!' : say[kind], fx: fx[kind], ms: 2600 };
    }
    case 'wash': {
      if (s.clean >= 90) {
        return pushed >= 1 ? no('flee', '목욕 싫어요~! 이미 깨끗하단 말이에요', ['💦', '💨'], 3000) : no('shake', '벌써 깨끗해요! 푸르르~', ['💦'], 1800);
      }
      return { ...base, anim: 'wash', xp: s.clean < 30 ? 4 : 3, set: { clean: 100 }, say: s.clean < 30 ? '시원해요! 아주 개운해요' : '보글보글~ 상쾌해요', fx: ['🫧', '🫧', '🫧'], ms: 2600 };
    }
    case 'hug':
      return { ...base, anim: 'hug', xp: 1, say: pick(['따뜻해요… 좋아해요', '꼬옥~ 사랑해요', '안기면 마음이 포근해요'], r), fx: ['❤️', '💕'], ms: 2000 };
    case 'dance': {
      if (s.energy < 10) return no('sleep', '힘이 없어서 춤을 못 춰요… 쉬고 싶어요', ['💤'], 2400);
      return { ...base, anim: 'dance', xp: 2, set: { energy: clamp(s.energy - 8) }, say: pick(['랄라~ 같이 춰요!', '둠칫둠칫! 리듬을 타요', '내 춤 어때요?'], r), fx: ['🎵', '🎶', '✨'], ms: 2800 };
    }
    case 'sleep': {
      if (s.energy >= 90) return no('shake', '하나도 안 졸려요! 더 놀아요', ['💭']);
      return { ...base, anim: 'sleep', xp: 2, set: { energy: clamp(s.energy + 45) }, say: '쿨쿨… 푹 자고 일어났어요!', fx: ['💤', '💤'], ms: 3600 };
    }
  }
}

/** 화면을 톡톡 쳤을 때: 빠르게 계속 치면 어지러워해요 (저장하지 않아요) */
export function reactTap(taps: number, r: number): { anim: Anim; say: string; fx: string[] } {
  if (taps >= 7) return { anim: 'dizzy', say: '어지러워요~ 빙글빙글!', fx: ['💫', '💫'] };
  if (taps >= 4) return { anim: 'tickle', say: pick(['간지러워요! 깔깔', '히히, 그만~ 간질간질!'], r), fx: ['😆', '✨'] };
  return { anim: 'jump', say: pick(['저 여기 있어요!', '왜요왜요? 불렀어요?', '쓰담쓰담 좋아요'], r), fx: ['❤️'] };
}

/* ───────── 보상 상자: 진짜 할 일을 하면 간식이 생겨요 ───────── */
export type RewardKey = 'r50' | 'r100' | 'bag';
export const REWARDS: { key: RewardKey; label: string; snacks: number; note: string }[] = [
  { key: 'r50', label: '할 일 반쯤', snacks: 1, note: '오늘 할 일을 반쯤 하면' },
  { key: 'r100', label: '할 일 모두', snacks: 2, note: '오늘 할 일을 다 하면' },
  { key: 'bag', label: '가방 챙기기', snacks: 2, note: '가방을 다 챙기면' },
];
export interface RewardContext {
  routineRatio: number;
  bagComplete: boolean;
  isSchoolKid: boolean;
}
export interface RewardOption {
  key: RewardKey;
  label: string;
  snacks: number;
  note: string;
  state: 'ready' | 'done' | 'locked';
}
export function rewardOptions(day: PetDay | undefined, ctx: RewardContext): RewardOption[] {
  return REWARDS.filter((r) => r.key !== 'bag' || ctx.isSchoolKid).map((r) => {
    if (day?.claimed?.[r.key]) return { ...r, state: 'done' as const };
    const open = r.key === 'r50' ? ctx.routineRatio >= 0.5 : r.key === 'r100' ? ctx.routineRatio >= 1 : ctx.bagComplete;
    return { ...r, state: open ? ('ready' as const) : ('locked' as const) };
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

/** 펫이 가만히 있을 때 하는 말 */
export function petMessage(mood: PetMood, stage: PetStage, doneToday: number, st?: Stats, night = false): string {
  if (stage === 'egg') return doneToday > 0 ? '알이 따뜻해졌어요. 조금만 더 기다려요' : '알이 아직 자고 있어요. 돌봐 주면 깨어나요';
  if (night) return '쿨쿨… 밤이라 졸려요';
  if (st) {
    if (st.belly < 20) return '배고파요… 밥 주세요';
    if (st.clean < 25) return '몸이 꾸질꾸질해요. 씻고 싶어요';
    if (st.energy < 20) return '졸려요… 좀 쉬고 싶어요';
  }
  if (mood === 'sad') return '보고 싶었어요… 오늘 놀아 줄래요?';
  if (mood === 'happy') return doneToday >= 6 ? '오늘 최고예요! 사랑해요' : '기분이 좋아요! 고마워요';
  return doneToday === 0 ? '오늘도 같이 놀아요!' : '조금 더 놀고 싶어요';
}

/** 자세별 그림 파일 (걷기 두 장, 먹기·씹기·자기·점프·뒹굴기·앉기) */
export function petPoseFiles(): string[] {
  const out: string[] = [];
  for (const sp of PET_SPECIES) for (const st of ['baby', 'kid', 'adult'] as const) for (const po of ['walkA', 'walkB', 'eat', 'chew', 'sleep', 'jump', 'roll', 'sit']) out.push(`pets/${sp.key}-${st}-${po}.webp`);
  return out;
}
