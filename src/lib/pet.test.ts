import { describe, expect, it } from 'vitest';
import { CARE, LOVE_MAX, PET_SPECIES, STAGE_AT, careCount, careOptions, loveLeft, moodOf, petArt, petArtFiles, petMessage, stageLabel, stageOf, stageProgress } from './pet';

const at = (iso: string) => new Date(`${iso}T12:00:00+09:00`).getTime();
const pet = (over: Record<string, unknown> = {}) => ({ adoptedAt: at('2026-12-01'), ...over }) as never;

describe('성장 단계', () => {
  it('경험치로 단계가 정해진다', () => {
    expect(stageOf(0)).toBe('egg');
    expect(stageOf(STAGE_AT.baby - 1)).toBe('egg');
    expect(stageOf(STAGE_AT.baby)).toBe('baby');
    expect(stageOf(STAGE_AT.kid - 1)).toBe('baby');
    expect(stageOf(STAGE_AT.kid)).toBe('kid');
    expect(stageOf(STAGE_AT.adult)).toBe('adult');
    expect(stageOf(9999)).toBe('adult');
  });
  it('단계 안의 진행도와 남은 경험치', () => {
    expect(stageProgress(0)).toEqual({ stage: 'egg', ratio: 0, toNext: 20 });
    expect(stageProgress(10)).toMatchObject({ stage: 'egg', ratio: 0.5, toNext: 10 });
    expect(stageProgress(STAGE_AT.kid)).toMatchObject({ stage: 'kid', ratio: 0, toNext: 180 });
    expect(stageProgress(400)).toEqual({ stage: 'adult', ratio: 1, toNext: null });
  });
  it('이름표', () => {
    expect(stageLabel('dog', 'egg')).toBe('알');
    expect(stageLabel('bear', 'baby')).toBe('아기 곰');
    expect(stageLabel('cat', 'adult')).toBe('멋진 고양이');
  });
  it('하루에 열심히 하면 열흘 안에 다 자란다', () => {
    const perDay = CARE.feed.xp + CARE.play.xp + CARE.wash.xp + CARE.snack.xp + CARE.gift.xp + LOVE_MAX;
    expect(Math.ceil(STAGE_AT.adult / perDay)).toBeLessThanOrEqual(7);
    expect(Math.ceil(STAGE_AT.adult / (CARE.feed.xp + CARE.play.xp + CARE.wash.xp))).toBeLessThanOrEqual(10);
  });
});

describe('기분', () => {
  const today = '2026-12-05';
  it('오늘 두 가지 이상 돌보면 좋음, 하나면 보통', () => {
    expect(moodOf(pet({ days: { [today]: { feed: true, play: true } } }), today)).toBe('happy');
    expect(moodOf(pet({ days: { [today]: { feed: true } } }), today)).toBe('ok');
  });
  it('쓰다듬기만으로는 돌본 것으로 세지 않는다', () => {
    expect(careCount({ love: 5 })).toBe(0);
  });
  it('어제까지 만났으면 오늘 안 해도 보통, 이틀 이상 못 만나면 시무룩', () => {
    expect(moodOf(pet({ lastCareDate: '2026-12-04' }), today)).toBe('ok');
    expect(moodOf(pet({ lastCareDate: '2026-12-03' }), today)).toBe('sad');
  });
  it('데려온 지 이틀이 지났는데 한 번도 안 돌봤으면 시무룩, 막 데려왔으면 보통', () => {
    expect(moodOf(pet({ adoptedAt: at('2026-12-02') }), today)).toBe('sad');
    expect(moodOf(pet({ adoptedAt: at('2026-12-05') }), today)).toBe('ok');
  });
  it('시무룩해도 하나만 돌보면 바로 보통으로', () => {
    expect(moodOf(pet({ lastCareDate: '2026-12-01', days: { [today]: { feed: true } } }), today)).toBe('ok');
  });
  it('월말을 넘겨도 날짜 차이를 맞게 센다', () => {
    expect(moodOf(pet({ lastCareDate: '2026-11-30' }), '2026-12-02')).toBe('sad');
    expect(moodOf(pet({ lastCareDate: '2026-11-30' }), '2026-12-01')).toBe('ok');
  });
});

describe('오늘 돌봄 목록', () => {
  const ctx = { routineRatio: 0, bagComplete: false, isSchoolKid: true };
  const by = (o: ReturnType<typeof careOptions>, k: string) => o.find((x) => x.key === k)!;
  it('밥·놀이·씻기는 언제나 열려 있다', () => {
    const o = careOptions({}, '2026-12-05', ctx);
    for (const k of ['feed', 'play', 'wash']) expect(by(o, k).state).toBe('ready');
  });
  it('간식은 할 일을 반쯤 해야 열린다', () => {
    expect(by(careOptions({}, 'd', { ...ctx, routineRatio: 0.49 }), 'snack').state).toBe('locked');
    expect(by(careOptions({}, 'd', { ...ctx, routineRatio: 0.5 }), 'snack').state).toBe('ready');
  });
  it('선물: 학교 가는 아이는 가방을 다 챙기면, 그 밖의 아이는 할 일을 다 하면', () => {
    expect(by(careOptions({}, 'd', ctx), 'gift').state).toBe('locked');
    expect(by(careOptions({}, 'd', { ...ctx, bagComplete: true }), 'gift').state).toBe('ready');
    const small = { routineRatio: 0.75, bagComplete: false, isSchoolKid: false };
    expect(by(careOptions({}, 'd', small), 'gift').state).toBe('locked');
    expect(by(careOptions({}, 'd', { ...small, routineRatio: 1 }), 'gift').state).toBe('ready');
  });
  it('이미 한 돌봄은 하루에 한 번만', () => {
    const o = careOptions({ days: { d: { feed: true } } }, 'd', ctx);
    expect(by(o, 'feed').state).toBe('done');
    expect(by(careOptions({ days: { 'other-day': { feed: true } } }, 'd', ctx), 'feed').state).toBe('ready');
  });
  it('쓰다듬기 남은 횟수', () => {
    expect(loveLeft(undefined)).toBe(LOVE_MAX);
    expect(loveLeft({ love: 3 })).toBe(LOVE_MAX - 3);
    expect(loveLeft({ love: 99 })).toBe(0);
  });
});

describe('그림과 말', () => {
  it('알은 공통 그림, 나머지는 종류와 단계', () => {
    expect(petArt('dog', 'egg').src).toBe('pets/egg.webp');
    expect(petArt('rabbit', 'adult')).toEqual({ src: 'pets/rabbit-adult.webp', scale: 1 });
  });
  it('아직 없는 그림은 아기 그림을 키워서 쓴다', () => {
    const a = petArt('bear', 'adult');
    expect(a.src).toBe('pets/bear-baby.webp');
    expect(a.scale).toBeGreaterThan(petArt('bear', 'kid').scale);
  });
  it('6종류가 있다', () => {
    expect(PET_SPECIES.map((s) => s.key).sort()).toEqual(['bear', 'cat', 'chick', 'dog', 'hamster', 'rabbit']);
  });
  it('말', () => {
    expect(petMessage('sad', 'baby', 0)).toContain('보고 싶었어요');
    expect(petMessage('ok', 'egg', 0)).toContain('알');
  });
  it('그림 목록은 중복이 없다', () => {
    const f = petArtFiles();
    expect(new Set(f).size).toBe(f.length);
  });
});
