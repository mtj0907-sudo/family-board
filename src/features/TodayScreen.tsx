import { Clock } from '../components/Clock';
import { ProgressBar } from '../components/ProgressBar';
import { useFamily } from '../FamilyContext';
import { useColData, useDocData } from '../hooks/useFirestore';
import { useNow } from '../hooks/useNow';
import { doingOf, statusOf } from '../lib/constants';
import { path } from '../lib/db';
import { routineProgress } from '../lib/routine';
import { dateKey, etaProgress, formatClock, formatElapsed, formatRemaining } from '../lib/time';
import type { Member, RoutineDoc, StatusDoc, WithId } from '../lib/types';

export function TodayScreen() {
  const { code, members } = useFamily();
  const now = useNow(30000);
  const statuses = useColData<StatusDoc>(path(code, 'status'));
  const routine = useDocData<RoutineDoc>(path(code, 'routines', dateKey(now)));

  return (
    <div className="screen">
      <div className="card clockcard">
        <Clock />
      </div>
      {members.map((m) => (
        <MemberCard
          key={m.id}
          m={m}
          st={statuses.find((s: WithId<StatusDoc>) => s.id === m.id)}
          routine={routine ?? undefined}
          now={now}
        />
      ))}
    </div>
  );
}

function MemberCard({ m, st, routine, now }: { m: Member; st?: StatusDoc; routine?: RoutineDoc; now: number }) {
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
      </div>
    </div>
  );
}
