import { Clock } from '../components/Clock';
import { EventRow } from '../components/EventRow';
import { ProgressBar } from '../components/ProgressBar';
import { WorkChip } from '../components/WorkChip';
import { useWorkWindow } from '../hooks/useWork';
import { addDays, eventsOn, type EventDoc } from '../lib/events';
import { useFamily } from '../FamilyContext';
import { useColData, useDocData } from '../hooks/useFirestore';
import { useNow } from '../hooks/useNow';
import { doingOf, statusOf } from '../lib/constants';
import { path } from '../lib/db';
import { routineProgress } from '../lib/routine';
import { dateKey, etaProgress, formatClock, formatElapsed, formatRemaining } from '../lib/time';
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
    <div className="screen">
      <div className="card clockcard">
        <Clock />
      </div>
      {familyWide.length > 0 && (
        <div className="card">
          <h3>👪 오늘 가족 일정</h3>
          {familyWide.map((ev) => (
            <EventRow key={ev.id} ev={ev} />
          ))}
        </div>
      )}
      {members.map((m) => (
        <MemberCard
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
  );
}

function MemberCard({
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
  const { settings } = useFamily();
  const def = st ? statusOf(st.key) : undefined;
  const doing = doingOf(routine?.doing?.[m.id]);
  const prog = routineProgress(settings.routineItems, routine?.done?.[m.id]);

  return (
    <div className="card member">
      <div className="avatar">{m.emoji}</div>
      <div className="info">
        <div className="name">{m.name}</div>
        {st && def ? (
          <div className="statusline">
            <span className="badge">
              {def.emoji} {def.label}
            </span>
            <span className="sub">{formatElapsed(now - st.since)}</span>
          </div>
        ) : (
          <div className="sub">아직 상태가 없어요</div>
        )}

        {st?.etaAt && (
          <div className="eta">
            <div>
              🕐 도착 예정 <b>{formatClock(st.etaAt)}</b> · {formatRemaining(st.etaAt - now)}
            </div>
            <ProgressBar value={etaProgress(st.etaFrom ?? st.since, st.etaAt, now)} label="도착까지" />
          </div>
        )}

        {m.role === 'child' && (
          <div className="mini-routine">
            {settings.routineItems.map((it) => (
              <span key={it.key} className={routine?.done?.[m.id]?.[it.key] ? 'mini on' : 'mini'}>
                {it.emoji} {routine?.done?.[m.id]?.[it.key] ? '✔' : '✖'}
              </span>
            ))}
            <span className="sub">
              {prog.done}/{prog.total}
            </span>
            {doing && (
              <span className="badge soft">
                {doing.emoji} {doing.label}
              </span>
            )}
          </div>
        )}

        {workOn && <WorkStrip workOn={workOn} now={now} times={settings.workTimes} />}

        {events.length > 0 && (
          <div className="today-events">
            <div className="sub">📅 오늘 일정</div>
            {events.map((ev) => (
              <EventRow key={ev.id} ev={ev} forMember={m} />
            ))}
          </div>
        )}
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
    <div className="workstrip">
      <div className="workrow">
        <span className="sub">👩‍💼 오늘 근무</span>
        {todayCode ? <WorkChip code={todayCode} times={times} /> : <span className="sub">등록 안 됨</span>}
      </div>
      <div className="workrow">
        {next.map((n) => (
          <span key={n.label} className="workpreview">
            <span className="sub">{n.label}</span> {n.code ? <WorkChip code={n.code} /> : <span className="sub">-</span>}
          </span>
        ))}
      </div>
    </div>
  );
}
