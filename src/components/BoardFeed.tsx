import { useRef, useState } from 'react';
import { groupByDay } from '../lib/boardFeed';
import { messageOf } from '../lib/constants';
import { formatClock } from '../lib/time';
import type { Member, MessageDoc, WithId } from '../lib/types';
import { Avatar } from './Avatar';

const SWIPE_OUT = 90;

/** 한 줄. 왼쪽으로 밀면 이 태블릿에서 사라져요. 세로로 쓸면 평소처럼 스크롤됩니다. */
function SwipeRow({ children, onHide }: { children: React.ReactNode; onHide: () => void }) {
  const [dx, setDx] = useState(0);
  const [gone, setGone] = useState(false);
  const start = useRef<{ x: number; y: number; on: boolean } | null>(null);

  return (
    <div
      className="feed swipe"
      style={{ transform: `translateX(${gone ? -420 : dx}px)`, opacity: gone ? 0 : 1 - Math.min(0.5, Math.abs(dx) / 260), transition: start.current?.on ? 'none' : 'transform .2s, opacity .2s' }}
      onPointerDown={(e) => {
        start.current = { x: e.clientX, y: e.clientY, on: false };
      }}
      onPointerMove={(e) => {
        const s = start.current;
        if (!s) return;
        const mx = e.clientX - s.x;
        const my = e.clientY - s.y;
        if (!s.on) {
          if (Math.abs(mx) > 12 && Math.abs(mx) > Math.abs(my) * 1.5) {
            s.on = true;
            e.currentTarget.setPointerCapture(e.pointerId);
          } else return;
        }
        setDx(Math.min(0, mx));
      }}
      onPointerUp={() => {
        const moved = start.current?.on;
        start.current = null;
        if (moved && dx < -SWIPE_OUT) {
          setGone(true);
          window.setTimeout(onHide, 200);
        } else setDx(0);
      }}
      onPointerCancel={() => {
        start.current = null;
        setDx(0);
      }}
    >
      {children}
    </div>
  );
}

/** 보드의 "한마디" 목록: 날짜별로 이전 대화까지 아래로 스크롤하고, 왼쪽으로 밀어서 지워요. */
export function BoardFeed({
  msgs,
  members,
  now,
  hidden,
  onHide,
  onShowHidden,
}: {
  msgs: WithId<MessageDoc>[];
  members: Member[];
  now: number;
  hidden: ReadonlySet<string>;
  onHide: (id: string) => void;
  onShowHidden: () => void;
}) {
  const shown = msgs.filter((m) => m.kind !== 'youtube' && !hidden.has(m.id));
  const hiddenCount = msgs.filter((m) => m.kind !== 'youtube' && hidden.has(m.id)).length;
  if (shown.length === 0 && hiddenCount === 0) return null;
  const nameOf = (id: string) => members.find((m) => m.id === id);

  return (
    <div className="group board-feed">
      <div className="group-head">
        <h3>한마디</h3>
        {shown.length > 0 && <span className="sub">왼쪽으로 밀면 지워져요</span>}
      </div>
      <div className="feed-scroll">
        {groupByDay(shown, now).map((g) => (
          <div key={g.label}>
            <div className="feed-day">{g.label}</div>
            {g.items.map((m) => {
              const who = nameOf(m.from);
              return (
                <SwipeRow key={m.id} onHide={() => onHide(m.id)}>
                  {who && <Avatar member={who} size={36} />}
                  <div className="grow">
                    <b>{who?.name}</b>
                    {m.to && nameOf(m.to) ? <span className="sub"> → {nameOf(m.to)?.name}</span> : null} {m.kind === 'note' ? m.text : messageOf(m.key)?.label}
                  </div>
                  <span className="sub">{formatClock(m.at)}</span>
                </SwipeRow>
              );
            })}
          </div>
        ))}
        {shown.length === 0 && <div className="sub feed-empty">지운 한마디만 있어요</div>}
      </div>
      {hiddenCount > 0 && (
        <button className="feed-restore" onClick={onShowHidden}>
          지운 한마디 {hiddenCount}개 다시 보기
        </button>
      )}
    </div>
  );
}
