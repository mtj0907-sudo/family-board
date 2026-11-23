import { useEffect, useRef, useState } from 'react';
import { useFamily } from '../FamilyContext';
import { useBag } from '../hooks/useBag';
import { useDocData } from '../hooks/useFirestore';
import { useNotify } from '../hooks/useNotify';
import { useNow } from '../hooks/useNow';
import { bagProgress } from '../lib/bag';
import { increment } from 'firebase/firestore';
import { adoptPet, claimReward, devPatch, earnSnacks, path, petDo } from '../lib/db';
import {
  ACTIONS,
  DAY_GROWTH,
  PET_SPECIES,
  careCount,
  dayNumber,
  growScale,
  growthOf,
  moodOf,
  petArt,
  petMessage,
  react,
  reactTap,
  rewardOptions,
  speciesOf,
  stageLabel,
  stageProgress,
  statsNow,
  todayGrowth,
  type ActionKey,
  type Anim,
  type PetDoc,
  type PetSpecies,
  type RewardKey,
  type Stat,
  type StatKey,
} from '../lib/pet';
import { routineProgress } from '../lib/routine';
import { dateKey } from '../lib/time';
import type { RoutineDoc } from '../lib/types';
import type { Member } from '../lib/types';
import { lazy, Suspense } from 'react';
import type { Pet3DHandle } from '../pet3d/Pet3D';
import { canUse3D } from '../pet3d/support';
import { PetGames } from './PetGames';

const WEBGL = canUse3D();
/** 3D 부분은 무거워서 펫 화면을 열 때 불러와요 */
const Pet3D = lazy(() => import('../pet3d/Pet3D').then((m) => ({ default: m.Pet3D })));

const BASE = import.meta.env.BASE_URL;

/** 펫 그림 한 장 (자세히 보기 같은 작은 곳에서 써요). 기분에 따라 움직임이 달라져요. */
export function PetImage({ pet, className = '' }: { pet: Pick<PetDoc, 'species' | 'days' | 'lastCareDate' | 'adoptedAt'>; className?: string }) {
  const today = dateKey(Date.now());
  const prog = stageProgress(growthOf(pet));
  const art = petArt(pet.species, prog.stage);
  const mood = prog.stage === 'egg' ? 'ok' : moodOf(pet, today);
  return (
    <img
      className={`pet-img stage-${prog.stage} mood-${mood} ${className}`}
      style={{ ['--ps' as string]: art.scale * growScale(prog.ratio) }}
      src={`${BASE}${art.src}`}
      alt=""
      draggable={false}
    />
  );
}

/** 펫 데려오기: 6종류 중에 아이가 골라요 */
function Adopt({ kid }: { kid: Member }) {
  const { code } = useFamily();
  const [pick, setPick] = useState<PetSpecies | null>(null);
  const [name, setName] = useState('');
  const sp = pick ? speciesOf(pick) : null;
  return (
    <div className="pet-adopt">
      <h2>{kid.name}의 펫을 골라요</h2>
      <div className="sub">매일 돌봐 주면 알에서 깨어나 쑥쑥 자라요</div>
      <div className="pet-pick">
        {PET_SPECIES.map((s) => (
          <button
            key={s.key}
            className={pick === s.key ? 'pp on' : 'pp'}
            aria-pressed={pick === s.key}
            onClick={() => {
              setPick(s.key);
              setName(s.defaultName);
            }}
          >
            <img src={`${BASE}pets/${s.key}-baby.webp`} alt="" draggable={false} />
            <span>{s.label}</span>
          </button>
        ))}
      </div>
      {sp && (
        <div className="pet-name">
          <label>
            <span className="sub">이름을 지어 줘요</span>
            <input value={name} maxLength={8} onChange={(e) => setName(e.target.value)} placeholder={sp.defaultName} />
          </label>
          <button className="btn primary" onClick={() => void adoptPet(code, kid.id, sp.key, name.trim() || sp.defaultName)}>
            {sp.emoji} 알 데려오기
          </button>
        </div>
      )}
    </div>
  );
}

const KST_HOUR = (t: number) => new Date(t + 9 * 3600000).getUTCHours();

/**
 * 돌아다니는 펫. 그림 한 장을 걷게 하고(통통 튀며 좌우로), 상황마다 몸짓을 바꿔요.
 * 밥 먹기, 거절하기, 도망가기, 숨기, 춤추기, 자기, 어지러워하기 같은 동작이 있어요.
 */
function useActor(canWalk: boolean, calm: boolean) {
  const [x, setX] = useState(50);
  const [dir, setDir] = useState(1);
  const [anim, setAnim] = useState<Anim>('idle');
  const [dur, setDur] = useState(0);
  const xr = useRef(50);
  const busy = useRef(false);
  const timers = useRef<number[]>([]);
  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };
  const moveTo = (to: number, ms: number) => {
    setDir(to >= xr.current ? 1 : -1);
    setDur(ms);
    setX(to);
    xr.current = to;
  };
  useEffect(
    () => () => {
      timers.current.forEach((t) => window.clearTimeout(t));
    },
    [],
  );
  useEffect(() => {
    if (!canWalk) return;
    let stop = false;
    const loop = () => {
      if (stop) return;
      if (!busy.current) {
        const to = 26 + Math.random() * 48;
        const ms = Math.abs(to - xr.current) * (calm ? 110 : 62);
        moveTo(to, ms);
        setAnim('walk');
        later(() => {
          if (!busy.current) setAnim('idle');
        }, ms);
      }
      later(loop, (calm ? 5000 : 2400) + Math.random() * 3200);
    };
    later(loop, 1200);
    return () => {
      stop = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canWalk, calm]);

  const play = (a: Anim, ms: number) => {
    busy.current = true;
    setAnim(a);
    if (a === 'flee') {
      const away = xr.current < 50 ? -30 : 130;
      moveTo(away, 800);
      later(() => moveTo(50, 1100), Math.max(1500, ms - 1200));
    } else if (a === 'eat' || a === 'wash' || a === 'sleep' || a === 'hug') {
      moveTo(50, 500);
    }
    later(() => {
      busy.current = false;
      setAnim('idle');
    }, ms);
  };
  return { x, dir, anim, dur, play };
}

interface Fx {
  id: number;
  e: string;
  dx: number;
}

/**
 * 한 아이의 펫 화면. 아이가 직접 골라 키우고, 부모는 자세히 보기에서 구경만 해요.
 * 돌보기 횟수에는 제한이 없어요. 대신 너무 많이 주면 펫이 배불러하고 도망가요.
 * 간식은 퀴즈·미니게임과 진짜 할 일(보상 상자)로 얻어요.
 */
export function PetPanel({ kid, actAsKid = false }: { kid: Member; actAsKid?: boolean }) {
  const { code, settings, me } = useFamily();
  const notify = useNotify();
  const now = useNow(60000);
  const today = dateKey(now);
  const pet = useDocData<PetDoc>(path(code, 'pets', kid.id));
  const routine = useDocData<RoutineDoc>(path(code, 'routines', today)) ?? undefined;
  const bag = useBag(now);
  const isMe = actAsKid || me.id === kid.id;
  const night = KST_HOUR(now) >= 21 || KST_HOUR(now) < 6;

  const growth = pet ? growthOf(pet) : 0;
  const prog = stageProgress(growth);
  const stage = prog.stage;
  const prevStage = useRef(stage);
  const [party, setParty] = useState('');
  useEffect(() => {
    if (!pet) {
      prevStage.current = 'egg';
      return;
    }
    if (prevStage.current !== stage) {
      if (prevStage.current === 'egg') setParty('🎉 알이 깨어났어요!');
      else setParty(`🎉 ${stageLabel(pet.species, stage)}로 자랐어요!`);
      const t = window.setTimeout(() => setParty(''), 5000);
      prevStage.current = stage;
      return () => window.clearTimeout(t);
    }
  }, [stage, pet]);

  const mood = pet && stage !== 'egg' ? moodOf(pet, today) : 'ok';
  const actor = useActor(stage !== 'egg' && !night, mood === 'sad');
  const [say, setSay] = useState('');
  const [fx, setFx] = useState<Fx[]>([]);
  const [games, setGames] = useState(false);
  const [box, setBox] = useState(false);
  const [claiming, setClaiming] = useState<string[]>([]);
  const pet3d = useRef<Pet3DHandle>(null);
  const pushed = useRef<Record<string, number>>({});
  const taps = useRef({ n: 0, t: 0 });
  const sayTimer = useRef(0);
  useEffect(() => () => window.clearTimeout(sayTimer.current), []);

  if (pet === undefined) return <div className="sub">불러오는 중…</div>;
  if (pet === null) return isMe ? <Adopt kid={kid} /> : <div className="sub">{kid.name}은(는) 아직 펫이 없어요</div>;

  const t = Date.now();
  const stats = statsNow(pet, t);
  const day = pet.days?.[today];
  const doneToday = careCount(day);
  const snacks = pet.snacks ?? 0;
  const isSchool = bag.schoolKids.includes(kid.id);
  const bagDone = isSchool && bagProgress(bag.items, bag.bag?.done?.[kid.id]).complete;
  const ratio = routineProgress(settings.routineItems, routine?.done?.[kid.id]).ratio;
  const rewards = rewardOptions(day, { routineRatio: ratio, bagComplete: bagDone, isSchoolKid: isSchool });
  const art = petArt(pet.species, stage);
  const size = art.scale * growScale(prog.ratio);
  const sleeping = (night && actor.anim === 'idle') || actor.anim === 'sleep';
  const shownAnim: Anim = sleeping ? 'sleep' : actor.anim;
  const idleText = petMessage(mood, stage, doneToday, stats, night);

  function show(text: string, emojis: string[], ms: number) {
    setSay(text);
    window.clearTimeout(sayTimer.current);
    sayTimer.current = window.setTimeout(() => setSay(''), Math.max(2600, ms + 800));
    const base = Date.now();
    setFx((f) => [...f, ...emojis.map((e, i) => ({ id: base + i + Math.random(), e, dx: (i - (emojis.length - 1) / 2) * 24 }))]);
    window.setTimeout(() => setFx((f) => f.filter((x) => x.id < base || x.id > base + 10)), 1600);
  }

  function act(key: ActionKey) {
    if (!isMe) return;
    if (key === 'snack' && snacks <= 0) {
      show('간식이 없어요! 퀴즈나 게임으로 얻어 올까요?', ['🍪'], 1800);
      return;
    }
    const p = pushed.current[key] ?? 0;
    const r = react(key, stats, p, Math.random());
    pushed.current[key] = r.ok ? 0 : p + 1;
    if (WEBGL && (key === 'feed' || key === 'snack')) pet3d.current?.serve(key === 'snack' ? 'cookie' : 'rice', r.anim === 'eat' ? 'eat' : r.anim === 'flee' ? 'flee' : 'refuse');
    actor.play(r.anim, r.ms);
    show(r.say, r.fx, r.ms);
    if (!r.ok) return;
    const set: Partial<Record<StatKey, Stat>> = {};
    for (const k of ['belly', 'energy', 'clean'] as const) if (r.set[k] !== undefined) set[k] = { v: r.set[k]!, at: t };
    void petDo(code, kid.id, today, set, r.xp, r.snack);
    if (doneToday === 0 && kid.id !== 'demo-pet') notify('message', kid.name, `${pet?.name}를 돌봐 줬어요`);
  }
  function poke() {
    if (!isMe) return;
    const n = Date.now();
    taps.current = { n: n - taps.current.t < 1600 ? taps.current.n + 1 : 1, t: n };
    if (stage === 'egg') {
      actor.play('shake', 700);
      show('알이 달그락 움직여요', ['✨'], 700);
      return;
    }
    const r = reactTap(taps.current.n, Math.random());
    actor.play(r.anim, 1400);
    show(r.say, r.fx, 1400);
  }
  function claim(key: RewardKey, n: number) {
    if (!isMe || claiming.includes(key)) return;
    setClaiming((c) => [...c, key]);
    void claimReward(code, kid.id, today, key, n);
    show(`간식 ${n}개를 받았어요! 🍪`, ['🍪', '🎁'], 1800);
  }

  const ring = (emoji: string, v: number, cls: string, label: string) => (
    <div className={`pet-ring ${cls} ${v < 25 ? 'low' : ''}`} style={{ ['--v' as string]: v }} title={`${label} ${v}`} aria-label={`${label} ${v}`}>
      <span aria-hidden>{emoji}</span>
    </div>
  );
  const ready = rewards.filter((r) => r.state === 'ready' && !claiming.includes(r.key)).length;
  const need = stage === 'egg' ? '🥚' : night ? '💤' : stats.belly < 20 ? '🍚' : stats.clean < 25 ? '🫧' : stats.energy < 20 ? '💤' : mood === 'sad' ? '💧' : mood === 'happy' ? '💗' : '🎵';
  const main: { key: ActionKey; label: string }[] = [
    { key: 'feed', label: '밥' },
    { key: 'snack', label: '간식' },
    { key: 'wash', label: '목욕' },
    { key: 'play', label: '놀이' },
    { key: 'sleep', label: '잠' },
  ];
  const emojiOf = (k: ActionKey) => ACTIONS.find((x) => x.key === k)!.emoji;

  return (
    <div className="pet-panel">
      {party && <div className="pet-party" role="status">{party}</div>}
      <div className={`pet-room ${night ? 'night' : ''}`}>
        <div className="room-wall" aria-hidden>
          <div className="room-window">
            <i /><i /><i /><i />
            {night && <span className="room-moon">🌙</span>}
          </div>
          <span className="room-plant">🪴</span>
        </div>
        <div className="room-floor" aria-hidden />
        <div className="room-rug" aria-hidden />

        <div className="pet-hud">
          <div className="hud-lv">
            <b>{stage === 'egg' ? '🥚' : speciesOf(pet.species)?.emoji}</b>
            <div>
              <span className="hud-name">
                {pet.name} <small>{dayNumber(pet.adoptedAt, today)}일째</small>
              </span>
              <div className="hud-bar" title={stageLabel(pet.species, stage)}>
                <i style={{ width: `${Math.round(prog.ratio * 100)}%` }} />
              </div>
            </div>
          </div>
          <div className="hud-snack" title="간식">
            <span aria-hidden>🍪</span>
            <b>{snacks}</b>
          </div>
        </div>
        <div className="hud-sub">{stageLabel(pet.species, stage)} · 오늘 자란 만큼 {todayGrowth(day)}/{DAY_GROWTH}</div>

        <div className="pet-rings">
          {ring('🍚', stats.belly, 'belly', '배부름')}
          {ring('⚡', stats.energy, 'energy', '기운')}
          {ring('🫧', stats.clean, 'clean', '깨끗함')}
        </div>
        {isMe && (
          <div className="pet-side">
            <button className="rbtn small" onClick={() => setGames(true)} aria-label="게임하기">
              <span>🎮</span>
              <em>게임</em>
            </button>
            <button className={`rbtn small ${ready > 0 ? 'alert' : ''}`} onClick={() => setBox((v) => !v)} aria-label="보상 상자">
              <span>🎁</span>
              <em>보상</em>
              {ready > 0 && <u>{ready}</u>}
            </button>
          </div>
        )}

        <div className="pet-field" onClick={WEBGL ? undefined : poke} role="button" aria-label={`${pet.name}를 톡톡`} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && poke()}>
          {mood === 'sad' && stage !== 'egg' && <span className="pet-cloud" aria-hidden>💧</span>}
          {WEBGL && (
            <Suspense fallback={null}>
            <Pet3D
              ref={pet3d}
              species={pet.species}
              stage={stage}
              grow={prog.ratio}
              mood={mood}
              belly={stats.belly / 100}
              energy={stats.energy / 100}
              x={actor.x}
              dir={actor.dir}
              dur={actor.dur}
              anim={shownAnim}
              onPoke={poke}
            />
            </Suspense>
          )}
          <div className={WEBGL ? 'pet-actor over' : 'pet-actor'} style={{ left: `${WEBGL ? 50 + 0.85 * (actor.x - 50) : actor.x}%`, transitionDuration: `${actor.dur}ms`, ['--ps' as string]: size, ...(WEBGL ? { bottom: `${{ egg: 66, baby: 69, kid: 75, adult: 80 }[stage]}%` } : {}) }}>
            <div className={`pet-think ${say ? 'talk' : ''}`} aria-live="polite" title={idleText}>
              {say ? <span>{say}</span> : <b>{need}</b>}
            </div>
            {!WEBGL && (
              <>
                <div className="pet-shadow" />
                <div className={`pet-body a-${shownAnim} stage-${stage} mood-${mood}`} style={{ ['--dir' as string]: actor.dir }}>
                  <img className="pet-pic" src={`${BASE}${art.src}`} alt="" draggable={false} />
                </div>
              </>
            )}
            {fx.map((f) => (
              <span key={f.id} className="pet-fx" style={{ ['--dx' as string]: `${f.dx}px` }} aria-hidden>
                {f.e}
              </span>
            ))}
          </div>
        </div>

        {isMe && (
          <div className="pet-toys">
            <button className="rbtn mini" onClick={() => act('hug')} aria-label="안아주기">
              <span>{emojiOf('hug')}</span>
            </button>
            <button className="rbtn mini" onClick={() => act('dance')} aria-label="춤추기">
              <span>{emojiOf('dance')}</span>
            </button>
          </div>
        )}
        {isMe && (
          <div className="pet-dock">
            {main.map((m) => (
              <button key={m.key} className="rbtn" onClick={() => act(m.key)} aria-label={ACTIONS.find((x) => x.key === m.key)!.label}>
                <span>{emojiOf(m.key)}</span>
                <em>{m.key === 'snack' ? `${m.label} ${snacks}` : m.label}</em>
              </button>
            ))}
          </div>
        )}
        {!isMe && <div className="pet-viewing">{kid.name}의 펫을 구경하는 중이에요</div>}
        {stage === 'egg' && isMe && <div className="pet-viewing">밥도 주고 놀아주면 알이 따뜻해져요. 오늘 하루 돌봐 주면 깨어나요</div>}

        {box && isMe && (
          <div className="pet-box" role="dialog" aria-label="보상 상자">
            <div className="pet-box-top">
              <b>🎁 오늘의 보상 상자</b>
              <button className="pg-x" onClick={() => setBox(false)} aria-label="닫기">
                ✕
              </button>
            </div>
            <div className="sub">진짜 할 일을 하면 간식을 받아요</div>
            <div className="pet-rewards">
              {rewards.map((r) => (
                <button key={r.key} className={`rw ${r.state}`} disabled={r.state !== 'ready' || claiming.includes(r.key)} onClick={() => claim(r.key, r.snacks)}>
                  <span aria-hidden>{r.state === 'done' ? '✅' : r.state === 'ready' ? '🎁' : '🔒'}</span>
                  <b>{r.label}</b>
                  <small>{r.state === 'done' ? '받았어요' : r.state === 'ready' ? `간식 ${r.snacks}개 받기` : r.note}</small>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {kid.id === 'demo-pet' && (
        <div className="pet-dev">
          <b>🧪 체험용 테스트 도구 (아이 펫에는 안 보여요)</b>
          <div>
            <button onClick={() => void devPatch(code, kid.id, { days: { [`dev-${Date.now()}`]: { xp: 10, n: 1 } } })}>하루 성장 +1일</button>
            <button onClick={() => void devPatch(code, kid.id, { days: { [`dev-${Date.now()}`]: { xp: 10000, n: 1 } } })}>다 자라게</button>
            <button onClick={() => void devPatch(code, kid.id, { snacks: increment(5) })}>간식 +5</button>
          </div>
          <div>
            <button onClick={() => void devPatch(code, kid.id, { belly: { v: 100, at: Date.now() } })}>배 가득</button>
            <button onClick={() => void devPatch(code, kid.id, { belly: { v: 0, at: Date.now() } })}>배 비움</button>
            <button onClick={() => void devPatch(code, kid.id, { energy: { v: 0, at: Date.now() } })}>기운 0</button>
            <button onClick={() => void devPatch(code, kid.id, { energy: { v: 100, at: Date.now() } })}>기운 가득</button>
            <button onClick={() => void devPatch(code, kid.id, { clean: { v: 0, at: Date.now() } })}>더럽게</button>
            <button onClick={() => void devPatch(code, kid.id, { clean: { v: 100, at: Date.now() } })}>깨끗하게</button>
          </div>
        </div>
      )}

      {games && (
        <PetGames
          level={isSchool ? 'school' : 'kinder'}
          species={pet.species}
          petName={pet.name}
          snacks={snacks}
          onEarn={(n) => {
            void earnSnacks(code, kid.id, n);
            show(`간식 ${n}개를 얻었어요! 🍪`, ['🍪'], 1800);
          }}
          onClose={() => setGames(false)}
        />
      )}
    </div>
  );
}

/** 아이 폰의 펫 탭 */
export function PetScreen() {
  const { me } = useFamily();
  return (
    <div className="screen">
      <PetPanel kid={me} />
    </div>
  );
}
