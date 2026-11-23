import { Lock } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useFamily } from '../FamilyContext';
import { useBag } from '../hooks/useBag';
import { useDocData } from '../hooks/useFirestore';
import { useNotify } from '../hooks/useNotify';
import { useNow } from '../hooks/useNow';
import { bagProgress } from '../lib/bag';
import { adoptPet, carePet, lovePet, path } from '../lib/db';
import { CARE, PET_SPECIES, careCount, careOptions, loveLeft, moodOf, petArt, petMessage, speciesOf, stageLabel, stageProgress, type PetDoc, type PetSpecies } from '../lib/pet';
import { routineProgress } from '../lib/routine';
import { dateKey } from '../lib/time';
import type { RoutineDoc } from '../lib/types';
import type { Member } from '../lib/types';

const BASE = import.meta.env.BASE_URL;

/** 펫 그림 한 장. 기분에 따라 움직임이 달라져요. */
export function PetImage({ pet, className = '' }: { pet: Pick<PetDoc, 'species' | 'xp' | 'days' | 'lastCareDate' | 'adoptedAt'>; className?: string }) {
  const today = dateKey(Date.now());
  const stage = stageProgress(pet.xp).stage;
  const art = petArt(pet.species, stage);
  const mood = stage === 'egg' ? 'ok' : moodOf(pet, today);
  return (
    <img
      className={`pet-img stage-${stage} mood-${mood} ${className}`}
      style={{ ['--ps' as string]: art.scale }}
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

/**
 * 한 아이의 펫 화면. 아이가 직접 골라 키우고, 부모는 자세히 보기에서 구경만 해요.
 * 밥·놀이·씻기는 언제나, 간식은 할 일을 반쯤, 선물은 가방(또는 할 일)을 다 하면 열려요.
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

  const stage = pet ? stageProgress(pet.xp).stage : 'egg';
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

  const [hearts, setHearts] = useState<number[]>([]);
  if (pet === undefined) return <div className="sub">불러오는 중…</div>;
  if (pet === null) return isMe ? <Adopt kid={kid} /> : <div className="sub">{kid.name}은(는) 아직 펫이 없어요</div>;

  const prog = stageProgress(pet.xp);
  const mood = prog.stage === 'egg' ? 'ok' : moodOf(pet, today);
  const doneToday = careCount(pet.days?.[today]);
  const isSchool = bag.schoolKids.includes(kid.id);
  const bagDone = isSchool && bagProgress(bag.items, bag.bag?.done?.[kid.id]).complete;
  const ratio = routineProgress(settings.routineItems, routine?.done?.[kid.id]).ratio;
  const options = careOptions(pet, today, { routineRatio: ratio, bagComplete: bagDone, isSchoolKid: isSchool });
  const left = loveLeft(pet.days?.[today]);

  function care(key: (typeof options)[number]['key']) {
    if (!isMe) return;
    void carePet(code, kid.id, today, key);
    if (careCount(pet?.days?.[today]) === 0) notify('message', kid.name, `${pet?.name}를 돌봐 줬어요`);
  }
  function pat() {
    if (!isMe) return;
    setHearts((h) => [...h, Date.now()]);
    window.setTimeout(() => setHearts((h) => h.slice(1)), 1200);
    if (left > 0) void lovePet(code, kid.id, today);
  }

  return (
    <div className="pet-panel">
      {party && <div className="pet-party" role="status">{party}</div>}
      <div className="pet-head">
        <b>{pet.name}</b>
        <span className="sub">{stageLabel(pet.species, prog.stage)}</span>
      </div>

      <button className="pet-stage" onClick={pat} aria-label={`${pet.name} 쓰다듬기`} disabled={!isMe}>
        {mood === 'sad' && <span className="pet-cloud" aria-hidden>💧</span>}
        <PetImage pet={pet} />
        {hearts.map((k, i) => (
          <span key={k} className="pet-heart" style={{ left: `${38 + ((i * 17) % 30)}%` }} aria-hidden>
            ❤️
          </span>
        ))}
      </button>

      <div className={`pet-bubble mood-${mood}`}>{petMessage(mood, prog.stage, doneToday)}</div>

      <div className="pet-xp" aria-label="성장">
        <div className="pet-xp-bar">
          <i style={{ width: `${Math.round(prog.ratio * 100)}%` }} />
        </div>
        <span className="sub">{prog.toNext === null ? '다 자랐어요! 계속 사랑해 주세요' : `다음 단계까지 ${prog.toNext}`}</span>
      </div>

      <div className="pet-care">
        {options.map((o) => (
          <button
            key={o.key}
            className={`care ${o.state}`}
            disabled={!isMe || o.state !== 'ready'}
            onClick={() => care(o.key)}
            aria-label={`${o.label}${o.state === 'done' ? ' (오늘 했어요)' : o.note ? ` (${o.note})` : ''}`}
          >
            <span className="care-emoji" aria-hidden>
              {o.state === 'locked' ? <Lock size={22} strokeWidth={1.75} /> : o.emoji}
            </span>
            <span>{o.label}</span>
            <small>{o.state === 'done' ? '했어요' : o.state === 'locked' ? o.note : `+${CARE[o.key].xp}`}</small>
          </button>
        ))}
      </div>
      <div className="sub pet-foot">
        {isMe ? (left > 0 ? `펫을 눌러서 쓰다듬어 보세요 (${left}번 더)` : '오늘은 충분히 쓰다듬었어요') : `${kid.name}의 펫을 구경하는 중이에요`}
      </div>
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
