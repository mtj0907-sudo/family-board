import { useState } from 'react';
import { EventEditor } from '../components/EventEditor';
import { EventRow } from '../components/EventRow';
import { useFamily } from '../FamilyContext';
import { useColData } from '../hooks/useFirestore';
import { useNow } from '../hooks/useNow';
import { path } from '../lib/db';
import { eventsOn, monthCells, shiftMonth, type EventDoc } from '../lib/events';
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

  const cells = monthCells(ym.y, ym.m);
  const move = (d: number) => setYm(shiftMonth(ym.y, ym.m, d));
  const dayEvents = eventsOn(events, selected);
  const [, sm, sd] = selected.split('-').map(Number);

  return (
    <div className="screen">
      <div className="card cal">
        <div className="calhead">
          <button className="btn inline" onClick={() => move(-1)} aria-label="이전 달">
            ‹
          </button>
          <div className="calmonth">
            {ym.y}년 {ym.m}월
          </div>
          <button className="btn inline" onClick={() => move(1)} aria-label="다음 달">
            ›
          </button>
        </div>
        <button
          className="btn small"
          onClick={() => {
            setYm({ y: t.y, m: t.m });
            setSelected(today);
          }}
        >
          오늘로
        </button>

        <div className="calgrid">
          {DOW.map((d, i) => (
            <div key={d} className={i === 0 ? 'dow sun' : i === 6 ? 'dow sat' : 'dow'}>
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
              <button key={c.key} className={cls.join(' ')} onClick={() => setSelected(c.key)}>
                <span className="dnum">{day}</span>
                <span className="dem">
                  {list.slice(0, 3).map((e) => e.emoji).join('')}
                  {list.length > 3 ? '+' : ''}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="card">
        <h2>
          {sm}월 {sd}일
        </h2>
        {dayEvents.length === 0 && <div className="sub">일정이 없어요 🌿</div>}
        {dayEvents.map((ev) => (
          <EventRow key={ev.id} ev={ev} onClick={isParent ? () => setEditing(ev) : undefined} />
        ))}
        {isParent && (
          <button className="btn primary" onClick={() => setEditing('new')}>
            ➕ 이 날 일정 추가
          </button>
        )}
      </div>

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
