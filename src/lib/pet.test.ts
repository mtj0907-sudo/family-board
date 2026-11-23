import { describe, expect, it } from 'vitest';
import { DAY_GROWTH, PET_SPECIES, STAGE_AT, careCount, growScale, growthOf, moodOf, petArt, petArtFiles, petMessage, react, reactTap, rewardOptions, stageLabel, stageOf, stageProgress, statNow, statsNow } from './pet';

const at = (iso: string) => new Date(`${iso}T12:00:00+09:00`).getTime();
const pet = (over: Record<string, unknown> = {}) => ({ adoptedAt: at('2026-12-01'), ...over }) as never;
const S = (o: Partial<{ belly: number; energy: number; clean: number }> = {}) => ({ belly: 50, energy: 80, clean: 50, ...o });

describe('성장', () => {
  it('하루에 자랄 수 있는 점수에는 한도가 있어서 많이 해도 하루에 다 크지 않는다', () => {
    expect(growthOf({ days: { a: { xp: 500 } } })).toBe(DAY_GROWTH);
    expect(growthOf({ days: { a: { xp: 500 }, b: { xp: 4 } } })).toBe(DAY_GROWTH + 4);
    expect(growthOf({})).toBe(0);
  });
  it('하루 열심히 해도 어른이 되려면 며칠이 걸린다', () => {
    expect(Math.ceil(STAGE_AT.adult / DAY_GROWTH)).toBeGreaterThanOrEqual(14);
    expect(stageOf(DAY_GROWTH)).toBe('baby');
    expect(stageOf(DAY_GROWTH - 1)).toBe('egg');
  });
  it('단계와 진행도', () => {
    expect(stageOf(STAGE_AT.kid - 1)).toBe('baby');
    expect(stageOf(STAGE_AT.kid)).toBe('kid');
    expect(stageOf(STAGE_AT.adult)).toBe('adult');
    expect(stageProgress(0)).toEqual({ stage: 'egg', ratio: 0, toNext: STAGE_AT.baby });
    expect(stageProgress(1000)).toEqual({ stage: 'adult', ratio: 1, toNext: null });
  });
  it('같은 단계 안에서도 날마다 조금씩 커진다', () => {
    expect(growScale(0)).toBeLessThan(growScale(0.5));
    expect(growScale(0.5)).toBeLessThan(growScale(1));
    expect(growScale(1)).toBe(1);
    expect(growScale(9)).toBe(1);
  });
  it('이름표', () => {
    expect(stageLabel('dog', 'egg')).toBe('알');
    expect(stageLabel('cat', 'adult')).toBe('멋진 고양이');
  });
});

describe('기분', () => {
  it('오늘 돌본 횟수로 정해진다', () => {
    expect(moodOf(pet({ days: { '2026-12-05': { n: 3 } } }), '2026-12-05')).toBe('happy');
    expect(moodOf(pet({ days: { '2026-12-05': { n: 1 } } }), '2026-12-05')).toBe('ok');
    expect(careCount({ n: 7 })).toBe(7);
    expect(careCount(undefined)).toBe(0);
  });
  it('이틀 이상 못 만나면 시무룩, 어제까지 만났으면 보통', () => {
    expect(moodOf(pet({ lastCareDate: '2026-12-03' }), '2026-12-05')).toBe('sad');
    expect(moodOf(pet({ lastCareDate: '2026-12-04' }), '2026-12-05')).toBe('ok');
    expect(moodOf(pet({ lastCareDate: '2026-11-30' }), '2026-12-01')).toBe('ok');
  });
});

describe('배부름·기운·깨끗함', () => {
  const T = at('2026-12-05');
  it('저장된 값이 없으면 기본값', () => {
    expect(statsNow({}, T)).toEqual({ belly: 55, energy: 100, clean: 80 });
  });
  it('시간이 지나면 배는 꺼지고 기운은 차오른다', () => {
    expect(statNow({ belly: { v: 100, at: T } }, 'belly', T + 3600000)).toBe(86);
    expect(statNow({ energy: { v: 20, at: T } }, 'energy', T + 3600000)).toBe(32);
    expect(statNow({ belly: { v: 10, at: T } }, 'belly', T + 99 * 3600000)).toBe(0);
    expect(statNow({ energy: { v: 90, at: T } }, 'energy', T + 99 * 3600000)).toBe(100);
  });
});

describe('펫의 반응', () => {
  it('배고플 땐 잘 먹는다', () => {
    const r = react('feed', S({ belly: 20 }), 0, 0);
    expect(r).toMatchObject({ ok: true, anim: 'eat', xp: 3 });
    expect(r.set.belly).toBe(55);
  });
  it('배부르면 밥을 거절하고, 계속 주면 도망간다', () => {
    expect(react('feed', S({ belly: 90 }), 0, 0)).toMatchObject({ ok: false, anim: 'refuse', xp: 0 });
    expect(react('feed', S({ belly: 90 }), 2, 0)).toMatchObject({ ok: false, anim: 'flee' });
  });
  it('간식도 많이 먹으면 거절하거나 도망가고, 거절하면 간식이 줄지 않는다', () => {
    const a = react('snack', S({ belly: 95 }), 0, 0);
    expect(a).toMatchObject({ ok: false, anim: 'refuse', snack: 0 });
    expect(react('snack', S({ belly: 95 }), 1, 0)).toMatchObject({ ok: false, anim: 'flee', snack: 0 });
  });
  it('간식은 먹으면 하나 줄고, 배가 부르면 꺼억 한다', () => {
    expect(react('snack', S({ belly: 30 }), 0, 0)).toMatchObject({ ok: true, snack: -1, xp: 3 });
    const full = react('snack', S({ belly: 75 }), 0, 0);
    expect(full).toMatchObject({ ok: true, snack: -1, xp: 1 });
    expect(full.say).toContain('꺼억');
  });
  it('졸리면 놀지 않고 자고, 놀면 기운이 줄고 동작이 다양하다', () => {
    expect(react('play', S({ energy: 5 }), 0, 0)).toMatchObject({ ok: false, anim: 'sleep' });
    expect(react('play', S({ belly: 5 }), 0, 0)).toMatchObject({ ok: false });
    const kinds = new Set([0, 0.3, 0.6, 0.9].map((r) => react('play', S(), 0, r).anim));
    expect(kinds.size).toBe(4);
    expect(react('play', S({ energy: 80 }), 0, 0).set.energy).toBe(62);
  });
  it('이미 깨끗하면 씻기 싫어하고, 더러우면 씻고 깨끗해진다', () => {
    expect(react('wash', S({ clean: 95 }), 0, 0)).toMatchObject({ ok: false, anim: 'shake' });
    expect(react('wash', S({ clean: 95 }), 1, 0)).toMatchObject({ ok: false, anim: 'flee' });
    expect(react('wash', S({ clean: 10 }), 0, 0)).toMatchObject({ ok: true, anim: 'wash', set: { clean: 100 } });
  });
  it('안아주기는 언제나, 졸릴 때 재우면 기운이 찬다', () => {
    expect(react('hug', S({ belly: 100, energy: 0, clean: 100 }), 0, 0).ok).toBe(true);
    expect(react('sleep', S({ energy: 95 }), 0, 0).ok).toBe(false);
    expect(react('sleep', S({ energy: 30 }), 0, 0).set.energy).toBe(75);
  });
  it('톡톡 계속 치면 간지러워하다가 어지러워한다', () => {
    expect(reactTap(1, 0).anim).toBe('jump');
    expect(reactTap(4, 0).anim).toBe('tickle');
    expect(reactTap(8, 0).anim).toBe('dizzy');
  });
});

describe('보상 상자', () => {
  const ctx = { routineRatio: 0, bagComplete: false, isSchoolKid: true };
  const by = (o: ReturnType<typeof rewardOptions>, k: string) => o.find((x) => x.key === k)!;
  it('진짜 할 일을 하면 열린다', () => {
    expect(by(rewardOptions(undefined, ctx), 'r50').state).toBe('locked');
    expect(by(rewardOptions(undefined, { ...ctx, routineRatio: 0.5 }), 'r50').state).toBe('ready');
    expect(by(rewardOptions(undefined, { ...ctx, routineRatio: 0.99 }), 'r100').state).toBe('locked');
    expect(by(rewardOptions(undefined, { ...ctx, bagComplete: true }), 'bag').state).toBe('ready');
  });
  it('학교 안 가는 아이에게는 가방 상자가 없다', () => {
    expect(rewardOptions(undefined, { ...ctx, isSchoolKid: false }).some((r) => r.key === 'bag')).toBe(false);
  });
  it('받은 상자는 오늘 다시 받을 수 없다', () => {
    expect(by(rewardOptions({ claimed: { r50: true } }, { ...ctx, routineRatio: 1 }), 'r50').state).toBe('done');
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
  it('말: 배고픔이 기분보다 먼저', () => {
    expect(petMessage('sad', 'baby', 0)).toContain('보고 싶었어요');
    expect(petMessage('ok', 'egg', 0)).toContain('알');
    expect(petMessage('happy', 'baby', 9, { belly: 5, energy: 90, clean: 90 })).toContain('배고파요');
    expect(petMessage('ok', 'baby', 0, S(), true)).toContain('쿨쿨');
  });
  it('그림 목록은 중복이 없다', () => {
    const f = petArtFiles();
    expect(new Set(f).size).toBe(f.length);
  });
});
