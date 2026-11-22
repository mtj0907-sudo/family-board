import { MapPinned } from 'lucide-react';
import { Avatar } from '../components/Avatar';
import { Clock } from '../components/Clock';
import { EventRow } from '../components/EventRow';
import { Glyph } from '../components/Glyph';
import { EtaTrack } from '../components/EtaTrack';
import { WorkChip } from '../components/WorkChip';
import { useFamily } from '../FamilyContext';
import { useColData, useDocData } from '../hooks/useFirestore';
import { useNow } from '../hooks/useNow';
import { useWorkWindow } from '../hooks/useWork';
import { doingOf, statusOf } from '../lib/constants';
import { openFindMy } from '../lib/findmy';
import { path } from '../lib/db';
import { addDays, eventsOn, type EventDoc } from '../lib/events';
import { routineProgress } from '../lib/routine';
import { estimateEta } from '../lib/whenHome';
import { dateKey, formatElapsed } from '../lib/time';
import type { Member, RoutineDoc, StatusDoc, WithId } from '../lib/types';

export function TodayScreen() {
  const { code, members, settings } = useFamily();
  const now = useNow(30000);
  const workOn = useWorkWindow(code, dateKey(now));
  const statuses = useColData<StatusDoc>(path(code, 'status'));
  const routine = useDocData<RoutineDoc>(path(code, 'routines', dateKey(now)));
  const events = useColData<EventDoc>(path(code, 'events'));
  const todays = eventsOn(events, dateKey(now));
  const familyWide = todays.filter((e) => e.who.length === 0);

  return (
    <div className="screen fill">
      <Clock compact />
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
      <div className="group fill">
        {members.map((m) => (
          <MemberRow
            key={m.id}
            m={m}
            st={statuses.find((s: WithId<StatusDoc>) => s.id === m.id)}
            routine={routine ?? undefined}
            now={now}
            events={todays.filter((e) => e.who.includes(m.id) || e.pickupBy === m.id)}
            workOn={m.id === settings.workOwnerId ? workOn : undefined}
          />
        ))}
      </div>
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
}: {
  m: Member;
  st?: StatusDoc;
  routine?: RoutineDoc;
  now: number;
  events: WithId<EventDoc>[];
  workOn?: (dateKey: string) => string | undefined;
}) {
  const { settings, isParent } = useFamily();
  const def = st ? statusOf(st.key) : undefined;
  const doing = doingOf(routine?.doing?.[m.id]);
  const prog = routineProgress(settings.routineItems, routine?.done?.[m.id]);
  const extra = events.length > 0 || !!workOn;
  const eta = estimateEta(st, settings.commuteMinutes?.[m.id]);

  return (
    <div className="mrow">
      <div className="mrow-in">
      <Avatar member={m} size={46} />
      <div className="m-body">
        <div className="m-head">
          <div className="m-name">{m.name}</div>
          {isParent && m.role === 'child' && (
            <button className="locate" onClick={openFindMy} aria-label={`${m.name} 위치 확인 (나의 찾기 열기)`}>
              <MapPinned size={18} strokeWidth={1.75} aria-hidden />
              위치
            </button>
          )}
        </div>
        {st && def ? (
          <div className="m-status">
            <Glyph k={def.emoji} size={18} />
            <span>{def.label}</span>
            <span className="sub">{formatElapsed(now - st.since)}</span>
          </div>
        ) : (
          <div className="sub">아직 상태가 없어요</div>
        )}

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
