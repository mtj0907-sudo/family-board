import { Backpack, Check, ListChecks, MapPin } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Avatar } from '../components/Avatar';
import { Glyph } from '../components/Glyph';
import { ProgressBar } from '../components/ProgressBar';
import { useFamily } from '../FamilyContext';
import { useBag } from '../hooks/useBag';
import { useDocData } from '../hooks/useFirestore';
import { useNotify } from '../hooks/useNotify';
import { useStatusActions } from '../hooks/useStatusActions';
import { ASK_WHEN_MESSAGE, BOARD_MESSAGE_KEYS, QUICK_MESSAGES, statusInfo } from '../lib/constants';
import { answerYoutube, path, sendMessage, setRoutineDone } from '../lib/db';
import { whenHome } from '../lib/whenHome';
import { routineProgress } from '../lib/routine';
import { statusesFor } from '../lib/statusSets';
import { dateKey, formatClock } from '../lib/time';
import type { Member, MessageDoc, RoutineDoc, StatusDoc, WithId, YoutubeAnswer } from '../lib/types';
import { BagCard } from './BagCard';
import { QUICK_ETA } from './StatusScreen';

export type SheetTab = 'status' | 'todo' | 'bag';

/** 아무것도 안 누르면 저절로 닫히게: 누를 때마다 시간이 처음부터 다시 셉니다. */
function useIdleClose(onClose: () => void, ms: number) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const timer = useRef<number | undefined>(undefined);
  const touch = () => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => closeRef.current(), ms);
  };
  useEffect(() => {
    touch();
    return () => window.clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return touch;
}

/**
 * 거실 보드에서 한 사람의 상태·할 일·가방을 직접 바꾸는 창.
 * 아이는 자기 카드에서 바로 열고, 어른은 PIN을 누른 뒤에 열립니다.
 */
export function MemberSheet({
  member,
  initial,
  now,
  onClose,
  onFlash,
}: {
  member: Member;
  initial: SheetTab;
  now: number;
  onClose: () => void;
  onFlash: (text: string) => void;
}) {
  const { code, settings } = useFamily();
  const actions = useStatusActions();
  const bag = useBag(now);
  const today = dateKey(now);
  const st = useDocData<StatusDoc>(path(code, 'status', member.id)) ?? undefined;
  const routine = useDocData<RoutineDoc>(path(code, 'routines', today)) ?? undefined;
  const isKid = member.role === 'child';
  const hasBag = isKid && bag.schoolKids.includes(member.id);
  const [tab, setTab] = useState<SheetTab>(initial === 'bag' && !hasBag ? 'status' : initial);
  const touch = useIdleClose(onClose, 60000);

  const def = statusInfo(st);
  const list = statusesFor(member, settings);
  const done = routine?.done?.[member.id];
  const prog = routineProgress(settings.routineItems, done);

  const tabs: { key: SheetTab; label: string; Icon: typeof MapPin }[] = [
    { key: 'status', label: '지금 어디?', Icon: MapPin },
    ...(isKid ? [{ key: 'todo' as const, label: '할 일', Icon: ListChecks }] : []),
    ...(hasBag ? [{ key: 'bag' as const, label: '가방', Icon: Backpack }] : []),
  ];

  return (
    <div className="board-sheet-wrap" onClick={onClose}>
      <div className="board-sheet wide" role="dialog" aria-label={`${member.name} 바꾸기`} onClick={(e) => e.stopPropagation()} onPointerDown={touch}>
        <div className="sheet-head">
          <Avatar member={member} size={64} />
          <h2>{member.name}</h2>
          {tabs.length > 1 && (
            <div className="sheet-tabs" role="tablist">
              {tabs.map(({ key, label, Icon }) => (
                <button key={key} role="tab" aria-selected={tab === key} className={tab === key ? 'stab on' : 'stab'} onClick={() => setTab(key)}>
                  <Icon size={20} strokeWidth={1.75} aria-hidden />
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="sheet-body">
          {tab === 'status' && (
            <>
              <div className="chips">
                {list.map((s) => (
                  <button
                    key={s.key}
                    className={st?.key === s.key ? 'chip on' : 'chip'}
                    onClick={() => {
                      actions.pick(member, s);
                      if (!s.eta) {
                        onFlash(`${member.name}: ${s.label}`);
                        onClose();
                      }
                    }}
                  >
                    <Glyph k={s.emoji} size={28} />
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>
              {def?.eta && (
                <div className="sheet-eta-pick">
                  <h3>몇 시에 도착해요?</h3>
                  {st?.etaAt && (
                    <div className="eta-now">
                      지금 <b>{formatClock(st.etaAt)}</b> 도착 예정이에요
                    </div>
                  )}
                  <div className="chips">
                    {QUICK_ETA.map((q) => (
                      <button
                        key={q.min}
                        className="chip small"
                        onClick={() => {
                          actions.eta(member, Date.now() + q.min * 60000);
                          onFlash(`${q.label} 도착해요`);
                          onClose();
                        }}
                      >
                        {q.label}
                      </button>
                    ))}
                  </div>
                  {st?.etaAt && (
                    <button className="btn" onClick={() => actions.eta(member, null)}>
                      도착 시각 지우기
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          {tab === 'todo' && (
            <>
              <ProgressBar value={prog.ratio} label="오늘 할 일" />
              <div className="tiles">
                {settings.routineItems.map((it) => {
                  const on = !!done?.[it.key];
                  return (
                    <button key={it.key} className={on ? 'tile on' : 'tile'} aria-pressed={on} onClick={() => void setRoutineDone(code, today, member.id, it.key, !on)}>
                      <Glyph k={it.emoji} size={34} />
                      <span>{it.label}</span>
                      <span className="mark">
                        <Check size={14} strokeWidth={2.5} aria-hidden />
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {tab === 'bag' && hasBag && (
            <BagCard kid={member} items={bag.items} bag={bag.bag} onToggle={(key, v) => bag.toggle(member, key, v)} onSkip={(skip) => bag.setSkip(member, skip)} />
          )}
        </div>

        <button className="btn" onClick={onClose}>
          닫기
        </button>
      </div>
    </div>
  );
}

/** 보드에서 유튜브 요청에 답하기. 부모 PIN을 누른 뒤에 열립니다. */
export function YoutubeSheet({
  pending,
  members,
  answeredBy,
  onClose,
  onFlash,
}: {
  pending: WithId<MessageDoc>[];
  members: Member[];
  answeredBy: string;
  onClose: () => void;
  onFlash: (text: string) => void;
}) {
  const { code } = useFamily();
  const notify = useNotify();
  const touch = useIdleClose(onClose, 60000);

  function answer(id: string, a: YoutubeAnswer) {
    void answerYoutube(code, id, a, answeredBy);
    notify('message', '유튜브 답이 왔어요', a === 'yes' ? '봐도 돼요' : a === 'no' ? '오늘은 안 돼요' : '30분만 봐요');
    onFlash(a === 'yes' ? '봐도 된다고 답했어요' : a === 'no' ? '안 된다고 답했어요' : '30분만 된다고 답했어요');
    if (pending.length <= 1) onClose();
  }

  return (
    <div className="board-sheet-wrap" onClick={onClose}>
      <div className="board-sheet" role="dialog" aria-label="유튜브 답하기" onClick={(e) => e.stopPropagation()} onPointerDown={touch}>
        {pending.length === 0 && <div className="sub">답할 요청이 없어요</div>}
        {pending.map((m) => {
          const who = members.find((x) => x.id === m.from);
          return (
            <div key={m.id} className="yt-ask">
              {who && <Avatar member={who} size={64} />}
              <h2>{who?.name}: 유튜브 봐도 돼요?</h2>
              <div className="sub">{formatClock(m.at)}에 물어봤어요</div>
              <div className="answers">
                <button className="btn primary" onClick={() => answer(m.id, 'yes')}>
                  돼요
                </button>
                <button className="btn no" onClick={() => answer(m.id, 'no')}>
                  안 돼요
                </button>
                <button className="btn" onClick={() => answer(m.id, '30')}>
                  30분만
                </button>
              </div>
            </div>
          );
        })}
        <button className="btn" onClick={onClose}>
          닫기
        </button>
      </div>
    </div>
  );
}

/**
 * 부모를 눌렀을 때 열리는 "이야기하기" 창.
 * 위쪽에 그 부모의 지금 상태와 도착 시각을 보여주고, 누가 말하는지 얼굴로 고른 뒤 그림 버튼으로 한마디를 보냅니다.
 */
export function TalkSheet({
  parent,
  kids,
  st,
  workCode,
  workTimes,
  commuteMin,
  now,
  onClose,
  onFlash,
}: {
  parent: Member;
  kids: Member[];
  st?: StatusDoc;
  workCode?: string;
  workTimes?: Record<string, string>;
  commuteMin?: number;
  now: number;
  onClose: () => void;
  onFlash: (text: string) => void;
}) {
  const { code } = useFamily();
  const notify = useNotify();
  const touch = useIdleClose(onClose, 45000);
  const [who, setWho] = useState<string | null>(kids.length === 1 ? kids[0].id : null);
  const kid = kids.find((k) => k.id === who);
  const a = whenHome({ name: parent.name, st, now, workCode, workTimes, commuteMin });
  const msgs = BOARD_MESSAGE_KEYS.map((k) => QUICK_MESSAGES.find((q) => q.key === k)).filter((q): q is NonNullable<typeof q> => !!q);

  function send(key: string, label: string) {
    if (!kid) return;
    void sendMessage(code, kid.id, 'quick', key, parent.id);
    notify('message', kid.name, `${parent.name}에게 ${label}`);
    onFlash(`${parent.name}에게 "${label}" 보냈어요`);
    onClose();
  }

  return (
    <div className="board-sheet-wrap" onClick={onClose}>
      <div className="board-sheet wide" role="dialog" aria-label={`${parent.name}에게 이야기하기`} onClick={(e) => e.stopPropagation()} onPointerDown={touch}>
        <div className="sheet-head">
          <Avatar member={parent} size={72} />
          <div className="talk-title">
            <h2>{parent.name}에게 이야기해요</h2>
            <div className="sub">
              {a.headline}
              {a.eta ? ` · ${a.eta.clockLabel}` : ''}
            </div>
            {a.eta && <ProgressBar value={a.eta.ratio} label="도착까지" />}
            {a.details.map((d) => (
              <div key={d} className="sub">
                {d}
              </div>
            ))}
          </div>
        </div>

        {kids.length > 1 && (
          <>
            <div className="sub">누가 말해요?</div>
            <div className="who-say">
              {kids.map((k) => (
                <button key={k.id} className={who === k.id ? 'whobtn on' : 'whobtn'} aria-pressed={who === k.id} onClick={() => setWho(k.id)}>
                  <Avatar member={k} size={72} />
                  <span>{k.name}</span>
                </button>
              ))}
            </div>
          </>
        )}

        <div className="sub">{kid ? '하고 싶은 말을 눌러요' : '먼저 누가 말하는지 눌러요'}</div>
        <div className="say-grid">
          {msgs.map((q) => (
            <button key={q.key} className="saybtn" disabled={!kid} onClick={() => send(q.key, q.label)}>
              <Glyph k={q.emoji} size={30} />
              <span>{q.label}</span>
            </button>
          ))}
          {a.canAsk && (
            <button className="saybtn when" disabled={!kid} onClick={() => send(ASK_WHEN_MESSAGE.key, ASK_WHEN_MESSAGE.label)}>
              <Glyph k={ASK_WHEN_MESSAGE.emoji} size={30} />
              <span>{ASK_WHEN_MESSAGE.label}</span>
            </button>
          )}
        </div>
        <button className="btn" onClick={onClose}>
          닫기
        </button>
      </div>
    </div>
  );
}
