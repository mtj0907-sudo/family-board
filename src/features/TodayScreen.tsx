import { Backpack, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Avatar } from '../components/Avatar';
import { TodayHero } from '../components/TodayHero';
import { toneOf } from '../components/Avatar';
import { presenceOf } from '../lib/presence';
import { specialDayOf, treeSeason, weekStartCheer } from '../lib/specialDay';
import { store } from '../lib/storage';
import { tomorrowItems } from '../lib/tomorrow';
import { useWeather } from '../hooks/useWeather';
import { MemberDetail } from './MemberDetail';
import { StatusScene } from '../components/StatusScene';
import { hasClayScene, sceneKeyOf, sceneLookOf } from '../lib/characters';
import { PhoneWhenSheet } from './PhoneSheets';
import { careCount, speciesOf, type PetDoc } from '../lib/pet';
import { useFitZoom } from '../hooks/useFitZoom';
import { EventRow } from '../components/EventRow';
import { Glyph } from '../components/Glyph';
import { useFamily } from '../FamilyContext';
import { useColData, useDocData } from '../hooks/useFirestore';
import { useBag } from '../hooks/useBag';
import { useNow } from '../hooks/useNow';
import { useWorkWindow } from '../hooks/useWork';
import { bagNudgeActive, bagProgress } from '../lib/bag';
import { statusInfo } from '../lib/constants';
import { path } from '../lib/db';
import { eventsOn, type EventDoc } from '../lib/events';
import { routineProgress } from '../lib/routine';
import { estimateEta } from '../lib/whenHome';
import { dateKey, formatClockKo, formatElapsed, formatLeftKo } from '../lib/time';
import type { Member, RoutineDoc, StatusDoc, WithId } from '../lib/types';

export function TodayScreen({ onGo }: { onGo?: (tab: 'status' | 'message' | 'routine', who?: string) => void }) {
  const { code, members, settings, me, isParent } = useFamily();
  const now = useNow(30000);
  const workOn = useWorkWindow(code, dateKey(now));
  const bag = useBag(now);
  const bagInfo = (kidId: string) => {
    if (!bag.schoolKids.includes(kidId)) return undefined;
    const p = bagProgress(bag.items, bag.bag?.done?.[kidId]);
    const skip = !!bag.bag?.skip?.[kidId];
    // 저녁~다음 날 아침에만 보여주고, 낮에는 다 챙겼을 때만 남겨 둡니다.
    return bagNudgeActive(now) || p.complete ? { ...p, skip } : undefined;
  };
  const myBag = !isParent ? bagInfo(me.id) : undefined;
  const showNudge = !!myBag && !myBag.complete && !myBag.skip && bagNudgeActive(now);
  const statuses = useColData<StatusDoc>(path(code, 'status'));
  const routine = useDocData<RoutineDoc>(path(code, 'routines', dateKey(now)));
  const events = useColData<EventDoc>(path(code, 'events'));
  const todays = eventsOn(events, dateKey(now));
  const familyWide = todays.filter((e) => e.who.length === 0);
  const { weather, status: wStatus, error: wError, retry: wRetry } = useWeather();
  const [whenOpen, setWhenOpen] = useState(false);
  const [detail, setDetail] = useState<string | null>(null);
  const fit = useFitZoom();
  const special = specialDayOf(now, events);
  const cheer = weekStartCheer(now, settings);
  const myPet = useDocData<PetDoc>(!isParent ? path(code, 'pets', me.id) : null);
  const petNudge = !isParent && myPet !== undefined ? (myPet === null ? { emoji: '🥚', text: '펫을 골라 보세요', detail: '펫 탭에서 알을 데려와요' } : careCount(myPet.days?.[dateKey(now)]) === 0 ? { emoji: speciesOf(myPet.species)?.emoji ?? '🐾', text: `${myPet.name}가 기다려요`, detail: '펫 탭에서 돌봐 주세요' } : null) : null;
  const banner = special ? { emoji: special.emoji, text: special.text } : petNudge ? petNudge : cheer ? { emoji: '🌟', text: cheer.text, detail: cheer.detail } : null;
  const effects = store.get('fb.fx') !== '0' && !(typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

  return (
    <div className="screen today" ref={fit}>
      <TodayHero
        weather={weather}
        wStatus={wStatus}
        wError={wError}
        onRetryWeather={wRetry}
        banner={banner}
        tomorrow={tomorrowItems(events, dateKey(now), members)}
        special={special?.kind ?? null}
        tree={treeSeason(now) || special?.kind === 'christmas'}
        onMessage={() => onGo?.('message')}
        onWhen={() => setWhenOpen(true)}
        effects={effects}
      />
      {showNudge && myBag && <BagNudge done={myBag.done} total={myBag.total} onClick={() => onGo?.('routine')} />}
      {familyWide.length > 0 && (
        <div className="group">
          <div className="group-head">
            <h3>오늘 가족 일정</h3>
          </div>
          {familyWide.map((ev) => (
            <EventRow key={ev.id} ev={ev} />
          ))}
        </div>
      )}
      <div className="mlist">
        {members.map((m) => (
          <MemberRow
            key={m.id}
            m={m}
            st={statuses.find((s: WithId<StatusDoc>) => s.id === m.id)}
            routine={routine ?? undefined}
            now={now}
            events={todays.filter((e) => e.who.includes(m.id) || e.pickupBy === m.id)}
            workOn={m.id === settings.workOwnerId ? workOn : undefined}
            bag={bagInfo(m.id)}
            onOpen={() => setDetail(m.id)}
          />
        ))}
      </div>
      {whenOpen && <PhoneWhenSheet onClose={() => setWhenOpen(false)} />}
      {detail && members.find((x) => x.id === detail) && (
        <MemberDetail
          m={members.find((x) => x.id === detail)!}
          st={statuses.find((x) => x.id === detail)}
          routine={routine ?? undefined}
          now={now}
          events={todays.filter((e) => e.who.includes(detail) || e.pickupBy === detail)}
          workOn={detail === settings.workOwnerId ? workOn : undefined}
          bag={bagInfo(detail)}
          onClose={() => setDetail(null)}
          onChangeStatus={isParent && detail !== me.id ? () => onGo?.('status', detail) : undefined}
        />
      )}
    </div>
  );
}

export function MemberRow({
  m,
  st,
  routine,
  now,
  events,
  workOn,
  bag,
  onOpen,
}: {
  m: Member;
  st?: StatusDoc;
  routine?: RoutineDoc;
  now: number;
  events: WithId<EventDoc>[];
  workOn?: (dateKey: string) => string | undefined;
  /** 학교 가는 아이의 가방 챙기기 현황 */
  bag?: { done: number; total: number; complete: boolean; skip: boolean };
  /** 누르면 이 사람의 자세한 모습 */
  onOpen?: () => void;
}) {
  const { settings } = useFamily();
  const def = st ? statusInfo(st) : undefined;
  const prog = routineProgress(settings.routineItems, routine?.done?.[m.id]);
  const eta = estimateEta(st, settings.commuteMinutes?.[m.id]);
  const workCode = workOn?.(dateKey(now));
  const look = sceneLookOf(m);
  const scene = !!st && hasClayScene(sceneKeyOf(st), look);

  return (
    <button className={`mcard pres-${presenceOf(st)}${scene ? ' has-scene' : ''}`} style={{ ['--c' as string]: toneOf(m.id).fg }} onClick={onOpen} aria-label={`${m.name} 자세히 보기`}>
      {scene && st && (
        <span className="mcard-bg" aria-hidden>
          <StatusScene statusKey={sceneKeyOf(st)} look={look} accent={toneOf(m.id).fg} />
        </span>
      )}
      <Avatar member={m} size={46} />
      <div className="m-body">
        <div className="m-line">
          <div className="m-name">{m.name}</div>
          {st && def ? (
            <>
              <span className="m-status">
                <Glyph k={def.emoji} size={17} />
                <span>{def.label}</span>
              </span>
              <span className="sub m-since">{formatElapsed(now - st.since)}</span>
            </>
          ) : (
            <span className="sub">아직 상태가 없어요</span>
          )}
        </div>
        {eta ? (
          <div className="m-eta">
            {formatClockKo(eta.at)}
            {eta.estimated ? '쯤' : ''} 도착 <span className="sub">· {formatLeftKo(eta.at - now)}</span>
          </div>
        ) : (
          def?.eta && <div className="sub et-none">도착 시각은 아직 안 정했어요</div>
        )}
        {(m.role === 'child' || workCode || events.length > 0 ) && (
          <div className="mchips">
            {m.role === 'child' && (
              <span className={prog.done === prog.total ? 'mchip ok' : 'mchip'}>
                할 일 {prog.done}/{prog.total}
              </span>
            )}
            {m.role === 'child' && bag && (
              <span className={bag.complete ? 'mchip ok' : 'mchip'}>
                <Backpack size={13} strokeWidth={1.75} aria-hidden />
                {bag.skip ? '학교 안 가요' : bag.complete ? '가방 다 챙김' : `가방 ${bag.done}/${bag.total}`}
              </span>
            )}
            {workCode && <span className="mchip">근무 {workCode}</span>}
            {events.length > 0 && <span className="mchip">일정 {events.length}</span>}
          </div>
        )}
      </div>
      <ChevronRight size={20} strokeWidth={1.75} className="chev" aria-hidden />
    </button>
  );
}

/** 저녁에 아이 폰 오늘 화면 맨 위에 뜨는 "가방 챙길 시간이에요" */
export function BagNudge({ done, total, onClick }: { done: number; total: number; onClick: () => void }) {
  return (
    <button className="nudge" onClick={onClick}>
      <Backpack size={26} strokeWidth={1.75} aria-hidden />
      <span className="grow">
        가방 챙길 시간이에요
        <small>
          {done}/{total} 챙겼어요 · 눌러서 이어서 하기
        </small>
      </span>
      <ChevronRight size={20} strokeWidth={1.75} aria-hidden />
    </button>
  );
}
