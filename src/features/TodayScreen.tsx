import { Backpack, ChevronRight, MapPinned } from 'lucide-react';
import { useState } from 'react';
import { Avatar } from '../components/Avatar';
import { TodayHero } from '../components/TodayHero';
import { toneOf } from '../components/Avatar';
import { presenceOf } from '../lib/presence';
import { specialDayOf, treeSeason, weekStartCheer } from '../lib/specialDay';
import { store } from '../lib/storage';
import { tomorrowItems } from '../lib/tomorrow';
import { useWeather } from '../hooks/useWeather';
import { PhoneWhenSheet } from './PhoneSheets';
import { useFitZoom } from '../hooks/useFitZoom';
import { EventRow } from '../components/EventRow';
import { Glyph } from '../components/Glyph';
import { EtaTrack } from '../components/EtaTrack';
import { WorkChip } from '../components/WorkChip';
import { useFamily } from '../FamilyContext';
import { useColData, useDocData } from '../hooks/useFirestore';
import { useBag } from '../hooks/useBag';
import { useNow } from '../hooks/useNow';
import { useWorkWindow } from '../hooks/useWork';
import { bagNudgeActive, bagProgress } from '../lib/bag';
import { doingOf, statusInfo } from '../lib/constants';
import { openFindMy } from '../lib/findmy';
import { path } from '../lib/db';
import { addDays, eventsOn, type EventDoc } from '../lib/events';
import { routineProgress } from '../lib/routine';
import { estimateEta } from '../lib/whenHome';
import { dateKey, formatElapsed } from '../lib/time';
import type { Member, RoutineDoc, StatusDoc, WithId } from '../lib/types';

export function TodayScreen({ onGo }: { onGo?: (tab: 'status' | 'message' | 'routine') => void }) {
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
  const fit = useFitZoom();
  const special = specialDayOf(now, events);
  const cheer = weekStartCheer(now, settings);
  const banner = special ? { emoji: special.emoji, text: special.text } : cheer ? { emoji: '🌟', text: cheer.text, detail: cheer.detail } : null;
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
        members={members}
        statuses={statuses}
        onOpenStatus={() => onGo?.('status')}
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
          />
        ))}
      </div>
      {whenOpen && <PhoneWhenSheet onClose={() => setWhenOpen(false)} />}
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
}: {
  m: Member;
  st?: StatusDoc;
  routine?: RoutineDoc;
  now: number;
  events: WithId<EventDoc>[];
  workOn?: (dateKey: string) => string | undefined;
  /** 학교 가는 아이의 가방 챙기기 현황 */
  bag?: { done: number; total: number; complete: boolean; skip: boolean };
}) {
  const { settings, isParent } = useFamily();
  const def = st ? statusInfo(st) : undefined;
  const doing = doingOf(routine?.doing?.[m.id]);
  const prog = routineProgress(settings.routineItems, routine?.done?.[m.id]);
  const extra = events.length > 0 || !!workOn;
  const eta = estimateEta(st, settings.commuteMinutes?.[m.id]);

  return (
    <div className={`mcard pres-${presenceOf(st)}${isParent && m.role === 'child' ? ' has-loc' : ''}`} style={{ ['--c' as string]: toneOf(m.id).fg }}>
      <div className="mrow-in">
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
          {isParent && m.role === 'child' && (
            <button className="locate" onClick={openFindMy} aria-label={`${m.name} 위치 확인 (나의 찾기 열기)`}>
              <MapPinned size={18} strokeWidth={1.75} aria-hidden />
            </button>
          )}
        </div>

        {eta ? (
          <EtaTrack member={m} eta={eta} now={now} />
        ) : (
          def?.eta && <div className="sub et-none">도착 시각은 아직 안 정했어요</div>
        )}

        {m.role === 'child' && (
          <div className="pips">
            {settings.routineItems.map((it) => {
              const on = !!routine?.done?.[m.id]?.[it.key];
              return (
                <span key={it.key} className={on ? 'pip on' : 'pip'} title={`${it.label} ${on ? '완료' : '아직'}`} aria-label={`${it.label} ${on ? '완료' : '아직'}`}>
                  <Glyph k={it.emoji} size={14} />
                </span>
              );
            })}
            <span className="sub">
              {prog.done}/{prog.total}
            </span>
            {doing && (
              <span className="badge sub">
                <Glyph k={doing.emoji} size={15} />
                {doing.label}
              </span>
            )}
            {bag && (
              <span className={bag.complete ? 'bagbadge ok' : 'bagbadge'}>
                <Backpack size={15} strokeWidth={1.75} aria-hidden />
                {bag.skip ? '학교 안 가요' : bag.complete ? '가방 다 챙겼어요' : `가방 ${bag.done}/${bag.total}`}
              </span>
            )}
          </div>
        )}

        {extra && (
          <div className="m-extra">
            {workOn && <WorkStrip workOn={workOn} now={now} times={settings.workTimes} />}
            {events.map((ev) => (
              <EventRow key={ev.id} ev={ev} forMember={m} />
            ))}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

/** 엄마 카드의 오늘 근무 칩 + 내일·모레 미리보기 */
function WorkStrip({
  workOn,
  now,
  times,
}: {
  workOn: (dateKey: string) => string | undefined;
  now: number;
  times?: Record<string, string>;
}) {
  const today = dateKey(now);
  const todayCode = workOn(today);
  const next = [
    { label: '내일', code: workOn(addDays(today, 1)) },
    { label: '모레', code: workOn(addDays(today, 2)) },
  ];
  return (
    <div className="workrow">
      <span className="workpreview">
        <span className="sub">오늘</span>
        {todayCode ? <WorkChip code={todayCode} times={times} /> : <span className="sub">등록 안 됨</span>}
      </span>
      {next.map((n) => (
        <span key={n.label} className="workpreview">
          <span className="sub">{n.label}</span>
          {n.code ? <WorkChip code={n.code} /> : <span className="sub">-</span>}
        </span>
      ))}
    </div>
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
