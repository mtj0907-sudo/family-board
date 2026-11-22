import { Check, MapPinned, Pencil } from 'lucide-react';
import { Avatar } from '../components/Avatar';
import { EtaTrack } from '../components/EtaTrack';
import { EventRow } from '../components/EventRow';
import { Glyph } from '../components/Glyph';
import { ProgressBar } from '../components/ProgressBar';
import { WorkStrip } from '../components/WorkStrip';
import { useFamily } from '../FamilyContext';
import { useColData } from '../hooks/useFirestore';
import { doingOf, messageOf, statusInfo } from '../lib/constants';
import { path } from '../lib/db';
import type { EventDoc } from '../lib/events';
import { openFindMy } from '../lib/findmy';
import { presenceOf } from '../lib/presence';
import { routineProgress } from '../lib/routine';
import { dayStart, formatClock, formatElapsed } from '../lib/time';
import type { Member, MessageDoc, RoutineDoc, StatusDoc, WithId } from '../lib/types';
import { estimateEta } from '../lib/whenHome';

/**
 * 한 사람의 자세한 모습. 오늘 화면에서 카드를 한 번 더 누르면 열려요.
 * 첫 화면에서는 "지금 어디서 뭐 하는지"만 보이고, 숙제·가방·일정·근무·한마디는 여기서 봅니다.
 */
export function MemberDetail({
  m,
  st,
  routine,
  now,
  events,
  workOn,
  bag,
  onClose,
  onChangeStatus,
}: {
  m: Member;
  st?: StatusDoc;
  routine?: RoutineDoc;
  now: number;
  events: WithId<EventDoc>[];
  workOn?: (dateKey: string) => string | undefined;
  bag?: { done: number; total: number; complete: boolean; skip: boolean };
  onClose: () => void;
  /** 부모가 이 사람의 상태를 대신 바꾸러 가기 */
  onChangeStatus?: () => void;
}) {
  const { code, settings, isParent, members } = useFamily();
  const msgs = useColData<MessageDoc>(path(code, 'messages'), { orderField: 'at', limitN: 40 });
  const def = st ? statusInfo(st) : undefined;
  const eta = estimateEta(st, settings.commuteMinutes?.[m.id]);
  const done = routine?.done?.[m.id];
  const prog = routineProgress(settings.routineItems, done);
  const doing = doingOf(routine?.doing?.[m.id]);
  const mine = msgs.filter((x) => x.from === m.id && x.kind !== 'youtube' && x.at >= dayStart(now)).slice(0, 4);
  const nameOf = (id: string) => members.find((x) => x.id === id)?.name;

  return (
    <div className="modal sheet-bottom" onClick={onClose}>
      <div className="phone-sheet detail" role="dialog" aria-label={`${m.name} 자세히`} onClick={(e) => e.stopPropagation()}>
        <div className={`dt-head pres-${presenceOf(st)}`}>
          <Avatar member={m} size={64} />
          <div className="grow">
            <h2>{m.name}</h2>
            {st && def ? (
              <div className="m-status-row">
                <span className="m-status dt-pill">
                  <Glyph k={def.emoji} size={18} />
                  <span>{def.label}</span>
                </span>
                <span className="sub">{formatElapsed(now - st.since)}</span>
              </div>
            ) : (
              <div className="sub">아직 상태가 없어요</div>
            )}
          </div>
        </div>

        {eta && <EtaTrack member={m} eta={eta} now={now} />}

        {m.role === 'child' && (
          <div className="dt-sec">
            <div className="dt-title">
              오늘 할 일 <span className="sub">{prog.done}/{prog.total}</span>
            </div>
            <ProgressBar value={prog.ratio} label="오늘 할 일" />
            <div className="dt-list">
              {settings.routineItems.map((it) => {
                const on = !!done?.[it.key];
                return (
                  <span key={it.key} className={on ? 'dt-item on' : 'dt-item'}>
                    {on ? <Check size={15} strokeWidth={2.5} aria-hidden /> : <Glyph k={it.emoji} size={15} />}
                    {it.label}
                  </span>
                );
              })}
            </div>
            {doing && (
              <div className="sub">
                지금은 <b>{doing.label}</b>
              </div>
            )}
            {bag && (
              <div className={bag.complete ? 'dt-bag ok' : 'dt-bag'}>
                {bag.skip ? '내일은 학교 안 가요' : bag.complete ? '가방을 다 챙겼어요' : `가방 챙기기 ${bag.done}/${bag.total}`}
              </div>
            )}
          </div>
        )}

        {workOn && (
          <div className="dt-sec">
            <div className="dt-title">근무</div>
            <WorkStrip workOn={workOn} now={now} times={settings.workTimes} />
          </div>
        )}

        <div className="dt-sec">
          <div className="dt-title">오늘 일정</div>
          {events.length === 0 ? (
            <div className="sub">오늘은 일정이 없어요</div>
          ) : (
            events.map((ev) => <EventRow key={ev.id} ev={ev} forMember={m} />)
          )}
        </div>

        {mine.length > 0 && (
          <div className="dt-sec">
            <div className="dt-title">오늘 남긴 한마디</div>
            {mine.map((x) => (
              <div key={x.id} className="dt-msg">
                <span>
                  {x.to && nameOf(x.to) ? `${nameOf(x.to)}에게 ` : ''}
                  {x.kind === 'note' ? x.text : messageOf(x.key)?.label}
                </span>
                <span className="sub">{formatClock(x.at)}</span>
              </div>
            ))}
          </div>
        )}

        <div className="dt-actions">
          {isParent && m.role === 'child' && (
            <button className="btn" onClick={openFindMy}>
              <MapPinned size={18} strokeWidth={1.75} aria-hidden />
              위치 보기
            </button>
          )}
          {onChangeStatus && (
            <button className="btn" onClick={onChangeStatus}>
              <Pencil size={18} strokeWidth={1.75} aria-hidden />
              {m.name} 대신 바꾸기
            </button>
          )}
        </div>
        <button className="btn primary" onClick={onClose}>
          닫기
        </button>
      </div>
    </div>
  );
}
