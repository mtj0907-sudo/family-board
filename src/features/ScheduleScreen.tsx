import { useState } from 'react';
import { EventEditor } from '../components/EventEditor';
import { EventRow } from '../components/EventRow';
import { useFamily } from '../FamilyContext';
import { useColData } from '../hooks/useFirestore';
import { useNow } from '../hooks/useNow';
import { path } from '../lib/db';
import { addDays, eventsOn, type EventDoc } from '../lib/events';
import { dateKey } from '../lib/time';
import type { WithId } from '../lib/types';

export function ScheduleScreen() {
  const { code, isParent } = useFamily();
  const now = useNow(60000);
  const events = useColData<EventDoc>(path(code, 'events'));
  const today = dateKey(now);
  const tomorrow = addDays(today, 1);
  const [editing, setEditing] = useState<WithId<EventDoc> | 'new' | null>(null);

  const days = [
    { key: today, title: '오늘' },
    { key: tomorrow, title: '내일' },
  ];

  return (
    <div className="screen">
      {days.map((d) => {
        const list = eventsOn(events, d.key);
        return (
          <div className="card" key={d.key}>
            <h2>{d.title}</h2>
            {list.length === 0 && <div className="sub">일정이 없어요 🌿</div>}
            {list.map((ev) => (
              <EventRow key={ev.id} ev={ev} onClick={isParent ? () => setEditing(ev) : undefined} />
            ))}
          </div>
        );
      })}

      {isParent && (
        <button className="btn primary" onClick={() => setEditing('new')}>
          ➕ 일정 추가
        </button>
      )}
      <div className="sub center-text">더 먼 일정은 더보기 → 달력에서 볼 수 있어요</div>

      {editing && (
        <EventEditor
          initial={editing === 'new' ? undefined : editing}
          defaultDate={today}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
