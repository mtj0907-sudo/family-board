import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useState } from 'react';
import { EventEditor } from '../components/EventEditor';
import { EventRow } from '../components/EventRow';
import { useFamily } from '../FamilyContext';
import { useColData } from '../hooks/useFirestore';
import { useNow } from '../hooks/useNow';
import { path } from '../lib/db';
import { eventsOn, shiftMonth, visibleCells, type EventDoc } from '../lib/events';
import { dateKey, kst } from '../lib/time';
import type { WithId } from '../lib/types';

const DOW = ['일', '월', '화', '수', '목', '금', '토'];

export function CalendarScreen() {
  const { code, isParent } = useFamily();
  const now = useNow(60000);
  const today = dateKey(now);
  const t = kst(now);
  const events = useColData<EventDoc>(path(code, 'events'));
  const [ym, setYm] = useState({ y: t.y, m: t.m });
  const [selected, setSelected] = useState(today);
  const [editing, setEditing] = useState<WithId<EventDoc> | 'new' | null>(null);

  const cells = visibleCells(ym.y, ym.m);
  const move = (d: number) => setYm(shiftMonth(ym.y, ym.m, d));
  const dayEvents = eventsOn(events, selected);
  const [, sm, sd] = selected.split('-').map(Number);

  return (
    <div className="screen">
      <div className="card">
        <div className="calhead">
          <button className="btn" onClick={() => move(-1)} aria-label="이전 달">
            <ChevronLeft size={22} strokeWidth={1.75} aria-hidden />
          </button>
          <button
            className="calmonth"
            onClick={() => {
              setYm({ y: t.y, m: t.m });
              setSelected(today);
            }}
            aria-label="오늘로 돌아가기"
          >
            {ym.y}년 {ym.m}월
          </button>
          <button className="btn" onClick={() => move(1)} aria-label="다음 달">
            <ChevronRight size={22} strokeWidth={1.75} aria-hidden />
          </button>
        </div>

        <div className="calgrid">
          {DOW.map((d, i) => (
            <div key={d} className={i === 0 ? 'dow sun' : 'dow'}>
              {d}
            </div>
          ))}
          {cells.map((c, i) => {
            const list = eventsOn(events, c.key);
            const day = Number(c.key.slice(8));
            const cls = ['day'];
            if (!c.inMonth) cls.push('out');
            if (c.key === today) cls.push('today');
            if (c.key === selected) cls.push('sel');
            if (i % 7 === 0) cls.push('sun');
            return (
              <button key={c.key} className={cls.join(' ')} onClick={() => setSelected(c.key)} aria-label={`${day}일 일정 ${list.length}개`}>
                <span className="dnum">{day}</span>
                <span className="dots">
                  {list.slice(0, 3).map((e) => (
                    <i key={e.id} />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="group">
        <div className="group-head">
          <h2>
            {sm}월 {sd}일
          </h2>
        </div>
        {dayEvents.length === 0 && <div className="group-empty sub">일정이 없어요</div>}
        {dayEvents.map((ev) => (
          <EventRow key={ev.id} ev={ev} onClick={isParent ? () => setEditing(ev) : undefined} />
        ))}
      </div>
      {isParent && (
        <button className="btn primary" onClick={() => setEditing('new')}>
          <Plus size={20} strokeWidth={2} aria-hidden />이 날 일정 추가
        </button>
      )}

      {editing && (
        <EventEditor
          initial={editing === 'new' ? undefined : editing}
          defaultDate={selected}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
