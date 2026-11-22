import { useState } from 'react';
import { useFamily } from '../FamilyContext';
import { useDocData } from '../hooks/useFirestore';
import { useNow } from '../hooks/useNow';
import { ARRIVAL_ROUTINE_KEY, STATUSES, statusOf } from '../lib/constants';
import { path, setEta, setRoutineDone, setStatus } from '../lib/db';
import { dateKey, etaFromTime, formatClock } from '../lib/time';
import type { StatusDoc } from '../lib/types';

const QUICK_ETA = [
  { label: '10분', min: 10 },
  { label: '20분', min: 20 },
  { label: '30분', min: 30 },
  { label: '1시간', min: 60 },
];

export function StatusScreen() {
  const { code, members, me, isParent } = useFamily();
  const [targetId, setTargetId] = useState(me.id);
  const now = useNow(30000);
  const target = members.find((m) => m.id === targetId) ?? me;
  const st = useDocData<StatusDoc>(path(code, 'status', target.id));
  const def = st ? statusOf(st.key) : undefined;
  const [time, setTime] = useState('');

  const pick = (key: string) => {
    void setStatus(code, target.id, key);
    // 아이가 "집에 있어요"를 누르면 루틴의 "집 도착"도 자동 체크
    if (key === 'home' && target.role === 'child') {
      void setRoutineDone(code, dateKey(Date.now()), target.id, ARRIVAL_ROUTINE_KEY, true);
    }
  };

  return (
    <div className="screen">
      {isParent && (
        <div className="picker">
          {members.map((m) => (
            <button key={m.id} className={m.id === target.id ? 'pick on' : 'pick'} onClick={() => setTargetId(m.id)}>
              <span className="avatar sm">{m.emoji}</span>
              <span>{m.name}</span>
            </button>
          ))}
        </div>
      )}

      <div className="card">
        <h2>
          {target.emoji} {target.name}
        </h2>
        <div className="chips">
          {STATUSES.map((s) => (
            <button key={s.key} className={st?.key === s.key ? 'chip on' : 'chip'} onClick={() => pick(s.key)}>
              <span className="emoji">{s.emoji}</span>
              <span>{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {def?.eta && (
        <div className="card">
          <h3>🕐 몇 시에 도착해요?</h3>
          {st?.etaAt && (
            <div className="eta-now">
              지금 <b>{formatClock(st.etaAt)}</b> 도착 예정
            </div>
          )}
          <div className="chips row4">
            {QUICK_ETA.map((q) => (
              <button key={q.min} className="chip small" onClick={() => setEta(code, target.id, Date.now() + q.min * 60000)}>
                {q.label} 뒤
              </button>
            ))}
          </div>
          <div className="row">
            <input type="time" className="grow" value={time} onChange={(e) => setTime(e.target.value)} />
            <button
              className="btn primary inline"
              disabled={!time}
              onClick={() => {
                const at = etaFromTime(time, now);
                if (at) setEta(code, target.id, at);
              }}
            >
              시각으로 정하기
            </button>
          </div>
          {st?.etaAt && (
            <button className="btn" onClick={() => setEta(code, target.id, null)}>
              도착 시각 지우기
            </button>
          )}
        </div>
      )}
    </div>
  );
}
