import { Clock as ClockIcon, Maximize2, MonitorPlay, Sun, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Avatar } from '../components/Avatar';
import { Clock } from '../components/Clock';
import { EventRow } from '../components/EventRow';
import { Glyph } from '../components/Glyph';
import { ProgressBar } from '../components/ProgressBar';
import { WorkChip } from '../components/WorkChip';
import { useFamily } from '../FamilyContext';
import { useColData, useDocData } from '../hooks/useFirestore';
import { useNow } from '../hooks/useNow';
import { useWorkWindow } from '../hooks/useWork';
import { doingOf, messageOf, statusOf } from '../lib/constants';
import { path } from '../lib/db';
import { addDays, eventsOn, type EventDoc } from '../lib/events';
import { useKeepAwake } from '../lib/keepAwake';
import { routineProgress } from '../lib/routine';
import { dateKey, dayStart, etaProgress, formatClock, formatElapsed, formatRemaining } from '../lib/time';
import type { Member, MessageDoc, RoutineDoc, StatusDoc, WithId } from '../lib/types';

/** 보드는 높이 820px 기준으로 디자인하고, 화면 높이에 맞춰 통째로 확대/축소합니다. (좁은 화면은 그대로 세로 스크롤) */
const BOARD_REF_H = 820;
const BOARD_REF_W = 1180;
function boardScale(): number {
  if (typeof window === 'undefined' || window.innerWidth <= 820) return 1;
  // 높이·너비 중 더 빡빡한 쪽에 맞춰서, 어느 쪽으로도 기준보다 좁아지지 않게 합니다.
  return Math.min(1.6, Math.max(0.6, Math.min(window.innerHeight / BOARD_REF_H, window.innerWidth / BOARD_REF_W)));
}
export function useBoardScale(): number {
  const [scale, setScale] = useState(boardScale);
  useEffect(() => {
    const on = () => setScale(boardScale());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return scale;
}

/** 거실 아이패드용 큰 화면. 누르는 곳이 거의 없고, 멀리서도 읽히게 글씨를 크게 합니다. */
export function BoardScreen({ onExit }: { onExit: () => void }) {
  const { code, members, settings } = useFamily();
  const now = useNow(15000);
  const today = dateKey(now);
  const workOn = useWorkWindow(code, today);
  const statuses = useColData<StatusDoc>(path(code, 'status'));
  const routine = useDocData<RoutineDoc>(path(code, 'routines', today));
  const events = useColData<EventDoc>(path(code, 'events'));
  const msgs = useColData<MessageDoc>(path(code, 'messages'), { orderField: 'at', limitN: 30 });
  const awake = useKeepAwake();
  const scale = useBoardScale();

  const todays = eventsOn(events, today);
  const familyWide = todays.filter((e) => e.who.length === 0);
  const todayMsgs = msgs.filter((m) => m.at >= dayStart(now));
  const pendingYoutube = todayMsgs.filter((m) => m.kind === 'youtube' && !m.reply);
  const nameOf = (id: string): Member | undefined => members.find((m) => m.id === id);

  return (
    <div
      className="board"
      style={scale === 1 ? undefined : { width: `${100 / scale}vw`, height: `${100 / scale}vh`, transform: `scale(${scale})` }}
    >
      <div className="board-ctl">
        {awake.method === 'none' ? (
          <button className="board-btn" onClick={awake.start}>
            <Sun size={18} strokeWidth={1.75} aria-hidden />
            화면 켜두기
          </button>
        ) : (
          <span className="board-note">
            <Sun size={16} strokeWidth={1.75} aria-hidden />
            화면 켜짐 유지 중
          </span>
        )}
        {'requestFullscreen' in document.documentElement && (
          <button className="board-btn icon" onClick={() => void document.documentElement.requestFullscreen?.().catch(() => {})} aria-label="전체 화면">
            <Maximize2 size={18} strokeWidth={1.75} aria-hidden />
          </button>
        )}
        <button className="board-btn icon" onClick={onExit} aria-label="거실 보드 닫기">
          <X size={20} strokeWidth={1.75} aria-hidden />
        </button>
      </div>

      <aside className="board-side">
        <Clock size={180} stacked />

        {pendingYoutube.length > 0 && (
          <div className="board-alert">
            <MonitorPlay size={26} strokeWidth={1.75} aria-hidden />
            <span>
              {pendingYoutube.map((m) => nameOf(m.from)?.name).filter(Boolean).join('·')}이(가) 유튜브를 물어봤어요
              <small>부모 폰에서 답해 주세요</small>
            </span>
          </div>
        )}

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

        {todayMsgs.filter((m) => m.kind === 'quick').length > 0 && (
          <div className="group">
            <div className="group-head">
              <h3>오늘 온 한마디</h3>
            </div>
            {todayMsgs
              .filter((m) => m.kind === 'quick')
              .slice(0, 3)
              .map((m) => {
                const who = nameOf(m.from);
                const q = messageOf(m.key);
                return (
                  <div key={m.id} className="feed">
                    {who && <Avatar member={who} size={36} />}
                    <div className="grow">
                      <b>{who?.name}</b> {q?.label}
                    </div>
                    <span className="sub">{formatClock(m.at)}</span>
                  </div>
                );
              })}
          </div>
        )}
      </aside>

      <section className="board-grid" aria-label="가족 상태">
        {members.map((m) => (
          <BoardTile
            key={m.id}
            m={m}
            st={statuses.find((s: WithId<StatusDoc>) => s.id === m.id)}
            routine={routine ?? undefined}
            events={todays.filter((e) => e.who.includes(m.id) || e.pickupBy === m.id)}
            workOn={m.id === settings.workOwnerId ? workOn : undefined}
            now={now}
          />
        ))}
      </section>
    </div>
  );
}

export function BoardTile({
  m,
  st,
  routine,
  events,
  workOn,
  now,
}: {
  m: Member;
  st?: StatusDoc;
  routine?: RoutineDoc;
  events: WithId<EventDoc>[];
  workOn?: (dateKey: string) => string | undefined;
  now: number;
}) {
  const { settings } = useFamily();
  const def = st ? statusOf(st.key) : undefined;
  const doing = doingOf(routine?.doing?.[m.id]);
  const prog = routineProgress(settings.routineItems, routine?.done?.[m.id]);
  const today = dateKey(now);

  return (
    <article className="btile">
      <header className="btile-head">
        <Avatar member={m} size={56} />
        <div className="btile-who">
          <h2>{m.name}</h2>
          {st && def ? (
            <div className="btile-status">
              <Glyph k={def.emoji} size={28} />
              <span>{def.label}</span>
              <small>{formatElapsed(now - st.since)}</small>
            </div>
          ) : (
            <div className="btile-status sub">상태 없음</div>
          )}
        </div>
      </header>

      {st?.etaAt && (
        <div>
          <div className="btile-eta">
            <ClockIcon size={22} strokeWidth={1.75} aria-hidden />
            <b>{formatClock(st.etaAt)}</b> 도착 · {formatRemaining(st.etaAt - now)}
          </div>
          <ProgressBar value={etaProgress(st.etaFrom ?? st.since, st.etaAt, now)} label="도착까지" />
        </div>
      )}

      {m.role === 'child' && (
        <div className="btile-pips">
          {settings.routineItems.map((it) => {
            const on = !!routine?.done?.[m.id]?.[it.key];
            return (
              <span key={it.key} className={on ? 'pip big on' : 'pip big'} aria-label={`${it.label} ${on ? '완료' : '아직'}`}>
                <Glyph k={it.emoji} size={20} />
              </span>
            );
          })}
          <span className="sub">
            {prog.done}/{prog.total}
          </span>
          {doing && (
            <span className="badge">
              <Glyph k={doing.emoji} size={20} />
              {doing.label}
            </span>
          )}
        </div>
      )}

      {workOn && (
        <div className="btile-work">
          <span className="sub">근무</span>
          {workOn(today) ? <WorkChip code={workOn(today)!} times={settings.workTimes} /> : <span className="sub">등록 안 됨</span>}
          {[1, 2].map((n) => {
            const c = workOn(addDays(today, n));
            return (
              <span key={n} className="workpreview">
                <span className="sub">{n === 1 ? '내일' : '모레'}</span>
                {c ? <WorkChip code={c} /> : <span className="sub">-</span>}
              </span>
            );
          })}
        </div>
      )}

      {events.length > 0 && (
        <div className="btile-events">
          {events.slice(0, 1).map((ev) => (
            <EventRow key={ev.id} ev={ev} forMember={m} />
          ))}
          {events.length > 1 && <div className="sub">외 {events.length - 1}건</div>}
        </div>
      )}
    </article>
  );
}
