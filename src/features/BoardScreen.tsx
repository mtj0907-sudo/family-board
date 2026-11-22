import { Check, Clock as ClockIcon, Maximize2, MonitorPlay, Sun, Volume2, VolumeX, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Avatar, toneOf } from '../components/Avatar';
import { Clock, type ClockMark } from '../components/Clock';
import { EtaTrack } from '../components/EtaTrack';
import { EventRow } from '../components/EventRow';
import { Glyph } from '../components/Glyph';
import { ProgressBar } from '../components/ProgressBar';
import { WorkChip } from '../components/WorkChip';
import { useFamily } from '../FamilyContext';
import { useColData, useDocData } from '../hooks/useFirestore';
import { useNotify } from '../hooks/useNotify';
import { useNow } from '../hooks/useNow';
import { useWorkWindow } from '../hooks/useWork';
import { ASK_WHEN_MESSAGE, BOARD_MESSAGE_KEYS, QUICK_MESSAGES, doingOf, messageOf, statusInfo } from '../lib/constants';
import { path, sendMessage, setRoutineDone } from '../lib/db';
import { addDays, eventsOn, type EventDoc } from '../lib/events';
import { alertText, pickAlerts } from '../lib/boardAlert';
import { isMuted, playChime, setMuted, unlockAudio } from '../lib/chime';
import { useKeepAwake } from '../lib/keepAwake';
import { hasFinal } from '../lib/korean';
import { routineProgress } from '../lib/routine';
import { dateKey, dayStart, formatClock, formatElapsed } from '../lib/time';
import type { Member, MessageDoc, RoutineDoc, StatusDoc, WithId } from '../lib/types';
import { estimateEta, whenHome } from '../lib/whenHome';

/**
 * 보드는 높이 820px 기준으로 디자인하고, 눈에 보이는 화면 크기에 맞춰 통째로 확대/축소합니다.
 * (아이패드 Safari의 vh는 주소창 뒤까지 포함해서 더 커요. 그래서 vh 대신 실제로 보이는 크기를 px로 씁니다.)
 * 좁은 화면(폰)은 그대로 세로 스크롤입니다.
 */
const BOARD_REF_H = 820;
const BOARD_REF_W = 1180;
function boardBox() {
  const w = typeof window === 'undefined' ? BOARD_REF_W : window.innerWidth;
  const h = typeof window === 'undefined' ? BOARD_REF_H : window.innerHeight;
  // 높이·너비 중 더 빡빡한 쪽에 맞춰서, 어느 쪽으로도 기준보다 좁아지지 않게 합니다.
  const scale = w <= 820 ? 1 : Math.min(1.6, Math.max(0.6, Math.min(h / BOARD_REF_H, w / BOARD_REF_W)));
  return { scale, style: { width: w / scale, height: h / scale, transform: `scale(${scale})` } as const };
}
export function useBoardBox() {
  const [box, setBox] = useState(boardBox);
  useEffect(() => {
    const on = () => setBox(boardBox());
    window.addEventListener('resize', on);
    window.addEventListener('orientationchange', on);
    return () => {
      window.removeEventListener('resize', on);
      window.removeEventListener('orientationchange', on);
    };
  }, []);
  return box;
}

/**
 * 거실 아이패드용 큰 화면. 멀리서도 읽히게 글씨를 크게 하고,
 * 아이는 자기 카드의 그림 버튼으로 한마디를 보내거나 "엄마(아빠) 언제 와요?"를 눌러 볼 수 있습니다.
 */
export function BoardScreen({ onExit }: { onExit: () => void }) {
  const { code, members, settings, requirePin } = useFamily();
  const now = useNow(15000);
  const today = dateKey(now);
  const workOn = useWorkWindow(code, today);
  const statuses = useColData<StatusDoc>(path(code, 'status'));
  const routine = useDocData<RoutineDoc>(path(code, 'routines', today));
  const events = useColData<EventDoc>(path(code, 'events'));
  const msgs = useColData<MessageDoc>(path(code, 'messages'), { orderField: 'at', limitN: 30 });
  const awake = useKeepAwake();
  const box = useBoardBox();
  const [ask, setAsk] = useState<{ parent: Member; kid: Member } | null>(null);
  const [toast, setToast] = useState('');
  const [news, setNews] = useState<WithId<MessageDoc> | null>(null);
  const [muted, setMutedState] = useState(isMuted);
  const mountedAt = useRef(Date.now() - 10000);
  const alerted = useRef(new Set<string>());
  const newsTimer = useRef<number | undefined>(undefined);
  const parents = members.filter((m) => m.role === 'parent');

  function flash(text: string) {
    setToast(text);
    window.setTimeout(() => setToast(''), 2200);
  }

  // 아이패드는 사용자가 직접 누른 뒤에만 화면 켜두기를 허용하는 경우가 있어서, 화면 아무 곳이나 한 번 누르면 시작합니다.
  useEffect(() => {
    if (awake.method !== 'none') return;
    const go = () => awake.start();
    document.addEventListener('pointerdown', go, { once: true });
    return () => document.removeEventListener('pointerdown', go);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [awake.method]);

  const clockMarkList: ClockMark[] = members.flatMap((m) => {
    const eta = estimateEta(statuses.find((s) => s.id === m.id), settings.commuteMinutes?.[m.id]);
    return eta ? [{ id: m.id, name: m.name, at: eta.at }] : [];
  });
  // 새 한마디가 오면 화면에 크게 보여주고 소리를 냅니다 (보드를 연 뒤에 온 것만)
  useEffect(() => {
    const fresh = pickAlerts(msgs, { since: mountedAt.current, alerted: alerted.current });
    if (fresh.length === 0) return;
    fresh.forEach((m) => alerted.current.add(m.id));
    setNews(fresh[fresh.length - 1]);
    playChime();
    // 타이머는 화면이 갱신돼도 지워지지 않게 ref로 따로 들고 있습니다.
    window.clearTimeout(newsTimer.current);
    newsTimer.current = window.setTimeout(() => setNews(null), 9000);
  }, [msgs]);
  useEffect(() => () => window.clearTimeout(newsTimer.current), []);

  // 소리는 화면을 한 번 눌러야 낼 수 있어서, 누를 때마다 준비해 둡니다.
  useEffect(() => {
    document.addEventListener('pointerdown', unlockAudio);
    return () => document.removeEventListener('pointerdown', unlockAudio);
  }, []);

  const todays = eventsOn(events, today);
  const familyWide = todays.filter((e) => e.who.length === 0);
  const todayMsgs = msgs.filter((m) => m.at >= dayStart(now));
  const pendingYoutube = todayMsgs.filter((m) => m.kind === 'youtube' && !m.reply);
  const nameOf = (id: string): Member | undefined => members.find((m) => m.id === id);

  return (
    <div className="board" style={box.style}>
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
        <button
          className="board-btn icon"
          onClick={() => {
            setMuted(!muted);
            setMutedState(!muted);
            unlockAudio();
          }}
          aria-label={muted ? '알림 소리 켜기' : '알림 소리 끄기'}
          aria-pressed={muted}
        >
          {muted ? <VolumeX size={18} strokeWidth={1.75} aria-hidden /> : <Volume2 size={18} strokeWidth={1.75} aria-hidden />}
        </button>
        {'requestFullscreen' in document.documentElement && (
          <button className="board-btn icon" onClick={() => void document.documentElement.requestFullscreen?.().catch(() => {})} aria-label="전체 화면">
            <Maximize2 size={18} strokeWidth={1.75} aria-hidden />
          </button>
        )}
        <button className="board-btn icon" onClick={() => requirePin(onExit)} aria-label="거실 보드 닫기 (부모 PIN)">
          <X size={20} strokeWidth={1.75} aria-hidden />
        </button>
      </div>

      <aside className="board-side">
        <Clock size={180} stacked marks={clockMarkList} />

        {pendingYoutube.length > 0 && (
          <div className="board-alert">
            <MonitorPlay size={26} strokeWidth={1.75} aria-hidden />
            <span>
              {youtubeAsker(pendingYoutube.map((m) => nameOf(m.from)?.name ?? ''))} 유튜브를 물어봤어요
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

        {todayMsgs.filter((m) => m.kind !== 'youtube').length > 0 && (
          <div className="group">
            <div className="group-head">
              <h3>오늘 온 한마디</h3>
            </div>
            {todayMsgs
              .filter((m) => m.kind !== 'youtube')
              .slice(0, pendingYoutube.length > 0 && familyWide.length > 0 ? 2 : 3)
              .map((m) => {
                const who = nameOf(m.from);
                const q = messageOf(m.key);
                return (
                  <div key={m.id} className="feed">
                    {who && <Avatar member={who} size={36} />}
                    <div className="grow">
                      <b>{who?.name}</b>
                      {m.to && nameOf(m.to) ? <span className="sub"> → {nameOf(m.to)?.name}</span> : null} {m.kind === 'note' ? m.text : q?.label}
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
            kid={
              m.role === 'child'
                ? {
                    parents,
                    onWhen: (p) => setAsk({ parent: p, kid: m }),
                    onSent: flash,
                    onToggle: (key, value) => void setRoutineDone(code, today, m.id, key, value),
                  }
                : undefined
            }
          />
        ))}
      </section>

      {news && (
        <div className="board-news" role="status" onClick={() => setNews(null)}>
          {nameOf(news.from) && <Avatar member={nameOf(news.from)!} size={64} />}
          <div className="news-text">
            <small>{nameOf(news.from)?.name}</small>
            <span>{alertText(news, members)}</span>
          </div>
        </div>
      )}
      {toast && <div className="board-toast">{toast}</div>}
      {ask && (
        <WhenSheet
          parent={ask.parent}
          kid={ask.kid}
          st={statuses.find((x) => x.id === ask.parent.id)}
          workCode={ask.parent.id === settings.workOwnerId ? workOn(today) : undefined}
          workTimes={settings.workTimes}
          commuteMin={settings.commuteMinutes?.[ask.parent.id]}
          now={now}
          onClose={() => setAsk(null)}
        />
      )}
    </div>
  );
}

/** "첫째가 유튜브를…" 처럼 이름 뒤에 이/가를 붙입니다. */
function youtubeAsker(names: string[]): string {
  const list = names.filter(Boolean);
  const last = list[list.length - 1] ?? '';
  return `${list.join('·')}${hasFinal(last) ? '이' : '가'}`;
}

/** 아이 카드 안의 그림 버튼. 누르면 그 아이 이름으로 부모에게 한마디가 갑니다. */
function KidActions({
  kid,
  parents,
  onWhen,
  onSent,
}: {
  kid: Member;
  parents: Member[];
  onWhen: (parent: Member) => void;
  onSent: (text: string) => void;
}) {
  const { code } = useFamily();
  const notify = useNotify();
  const [sent, setSent] = useState<string | null>(null);
  const keys = BOARD_MESSAGE_KEYS.map((k) => QUICK_MESSAGES.find((q) => q.key === k)).filter((q): q is NonNullable<typeof q> => !!q);

  function send(key: string, label: string) {
    if (sent) return;
    void sendMessage(code, kid.id, 'quick', key);
    notify('message', kid.name, label);
    setSent(key);
    onSent(`${label} 보냈어요`);
    window.setTimeout(() => setSent(null), 3000); // 연달아 마구 누르는 것을 막아요
  }

  return (
    <div className="kidact" role="group" aria-label={`${kid.name}의 한마디 버튼`}>
      {keys.map((q) => (
        <button
          key={q.key}
          className={sent === q.key ? 'kbtn done' : 'kbtn'}
          disabled={!!sent && sent !== q.key}
          onClick={() => send(q.key, q.label)}
          aria-label={q.label}
        >
          {sent === q.key ? <Check size={28} strokeWidth={2.25} aria-hidden /> : <Glyph k={q.emoji} size={28} />}
        </button>
      ))}
      {parents.map((p) => (
        <button
          key={p.id}
          className="kbtn when"
          onClick={() => onWhen(p)}
          aria-label={`${p.name} ${ASK_WHEN_MESSAGE.label}`}
          style={{ background: toneOf(p.id).bg, color: toneOf(p.id).fg, borderColor: toneOf(p.id).fg }}
        >
          <span className="when-name">{p.name}</span>
          <ClockIcon size={18} strokeWidth={2} aria-hidden />
        </button>
      ))}
    </div>
  );
}

/** "엄마 언제 와요?" 답변 창. 큰 글씨로 보여주고, 잠시 뒤 저절로 닫힙니다. */
export function WhenSheet({
  parent,
  kid,
  st,
  workCode,
  workTimes,
  commuteMin,
  now,
  onClose,
}: {
  parent: Member;
  kid: Member;
  st?: StatusDoc;
  workCode?: string;
  workTimes?: Record<string, string>;
  commuteMin?: number;
  now: number;
  onClose: () => void;
}) {
  const { code } = useFamily();
  const notify = useNotify();
  const [asked, setAsked] = useState(false);
  const a = whenHome({ name: parent.name, st, now, workCode, workTimes, commuteMin });

  // 화면이 갱신돼도 닫힘 시간이 처음부터 다시 세어지지 않도록, 닫는 함수는 ref로 들고 있습니다.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const t = window.setTimeout(() => closeRef.current(), asked ? 2500 : 20000);
    return () => window.clearTimeout(t);
  }, [asked]);

  return (
    <div className="board-sheet-wrap" onClick={onClose}>
      <div className="board-sheet" role="dialog" aria-label={`${parent.name} 언제 와요`} onClick={(e) => e.stopPropagation()}>
        <Avatar member={parent} size={96} />
        <h2>{a.headline}</h2>
        {a.eta && (
          <div className="sheet-eta">
            <div className="sheet-big">{a.eta.text}</div>
            <div className="sub">{a.eta.clockLabel}</div>
            <ProgressBar value={a.eta.ratio} label="도착까지" />
          </div>
        )}
        {a.details.map((d) => (
          <div key={d} className={a.eta ? 'sub' : 'sheet-detail'}>
            {d}
          </div>
        ))}
        {!a.eta && a.details.length === 0 && a.canAsk && !asked && <div className="sub">몇 시에 오는지는 아직 몰라요</div>}
        {asked ? (
          <div className="sheet-done">
            <Check size={28} strokeWidth={2.25} aria-hidden />
            {parent.name}에게 물어봤어요
          </div>
        ) : (
          a.canAsk && (
            <button
              className="btn primary"
              onClick={() => {
                void sendMessage(code, kid.id, 'quick', ASK_WHEN_MESSAGE.key, parent.id);
                notify('message', kid.name, `${parent.name}에게 ${ASK_WHEN_MESSAGE.label}`);
                setAsked(true);
              }}
            >
              {parent.name}에게 물어보기
            </button>
          )
        )}
        <button className="btn" onClick={onClose}>
          닫기
        </button>
      </div>
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
  kid,
}: {
  m: Member;
  st?: StatusDoc;
  routine?: RoutineDoc;
  events: WithId<EventDoc>[];
  workOn?: (dateKey: string) => string | undefined;
  now: number;
  /** 아이 카드에만: 그림 버튼에 필요한 정보 */
  kid?: {
    parents: Member[];
    onWhen: (parent: Member) => void;
    onSent: (text: string) => void;
    onToggle: (itemKey: string, value: boolean) => void;
  };
}) {
  const { settings } = useFamily();
  const def = st ? statusInfo(st) : undefined;
  const doing = doingOf(routine?.doing?.[m.id]);
  const prog = routineProgress(settings.routineItems, routine?.done?.[m.id]);
  const today = dateKey(now);
  const eta = estimateEta(st, settings.commuteMinutes?.[m.id]);

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

      {eta ? (
        <EtaTrack member={m} eta={eta} now={now} big />
      ) : (
        def?.eta && <div className="sub et-none">도착 시각은 아직 안 정했어요</div>
      )}

      {m.role === 'child' && (
        <div className="btile-pips">
          {settings.routineItems.map((it) => {
            const on = !!routine?.done?.[m.id]?.[it.key];
            const cls = on ? 'pip big on' : 'pip big';
            // 아이가 보드에서 직접 눌러 체크할 수 있어요
            return kid ? (
              <button key={it.key} className={cls} onClick={() => kid.onToggle(it.key, !on)} aria-pressed={on} aria-label={`${it.label} ${on ? '완료' : '아직'}`}>
                <Glyph k={it.emoji} size={20} />
              </button>
            ) : (
              <span key={it.key} className={cls} aria-label={`${it.label} ${on ? '완료' : '아직'}`}>
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

      {kid && <KidActions kid={m} parents={kid.parents} onWhen={kid.onWhen} onSent={kid.onSent} />}
    </article>
  );
}
