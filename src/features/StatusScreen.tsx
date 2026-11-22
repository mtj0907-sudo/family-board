import { useState } from 'react';
import { Avatar } from '../components/Avatar';
import { Glyph } from '../components/Glyph';
import { useFamily } from '../FamilyContext';
import { useDocData } from '../hooks/useFirestore';
import { useNow } from '../hooks/useNow';
import { ARRIVAL_ROUTINE_KEY, STATUSES, statusOf } from '../lib/constants';
import { path, setEta, setRoutineDone, setStatus } from '../lib/db';
import { dateKey, etaFromTime, formatClock } from '../lib/time';
import type { Member, StatusDoc } from '../lib/types';

const QUICK_ETA = [
  { label: '10분 뒤', min: 10 },
  { label: '20분 뒤', min: 20 },
  { label: '30분 뒤', min: 30 },
  { label: '1시간 뒤', min: 60 },
];

export function StatusScreen() {
  const { code, members, me, isParent } = useFamily();
  const [targetId, setTargetId] = useState(me.id);
  const now = useNow(30000);
  const target = members.find((m) => m.id === targetId) ?? me;
  const st = useDocData<StatusDoc>(path(code, 'status', target.id));

  const pick = (key: string) => {
    void setStatus(code, target.id, key);
    // 아이가 "집에 있어요"를 누르면 루틴의 "집 도착"도 자동 체크
    if (key === 'home' && target.role === 'child') {
      void setRoutineDone(code, dateKey(Date.now()), target.id, ARRIVAL_ROUTINE_KEY, true);
    }
  };

  return (
    <StatusView
      members={members}
      isParent={isParent}
      target={target}
      onTarget={setTargetId}
      st={st ?? undefined}
      now={now}
      onPick={pick}
      onEta={(at) => void setEta(code, target.id, at)}
    />
  );
}

export function StatusView({
  members,
  isParent,
  target,
  onTarget,
  st,
  now,
  onPick,
  onEta,
}: {
  members: Member[];
  isParent: boolean;
  target: Member;
  onTarget: (id: string) => void;
  st?: StatusDoc;
  now: number;
  onPick: (key: string) => void;
  onEta: (at: number | null) => void;
}) {
  const def = st ? statusOf(st.key) : undefined;
  const [time, setTime] = useState('');

  return (
    <div className="screen">
      {isParent && (
        <div className="picker" role="tablist" aria-label="누구의 상태인가요">
          {members.map((m) => (
            <button key={m.id} className={m.id === target.id ? 'pick on' : 'pick'} onClick={() => onTarget(m.id)}>
              <Avatar member={m} size={38} />
              {m.name}
            </button>
          ))}
        </div>
      )}

      <div className="chips">
        {STATUSES.map((s) => (
          <button key={s.key} className={st?.key === s.key ? 'chip on' : 'chip'} onClick={() => onPick(s.key)}>
            <Glyph k={s.emoji} size={24} />
            <span>{s.label}</span>
          </button>
        ))}
      </div>

      {def?.eta && (
        <div className="card">
          <h3>몇 시에 도착해요?</h3>
          {st?.etaAt && (
            <div className="eta-now">
              지금 <b>{formatClock(st.etaAt)}</b> 도착 예정이에요
            </div>
          )}
          <div className="chips">
            {QUICK_ETA.map((q) => (
              <button key={q.min} className="chip small" onClick={() => onEta(Date.now() + q.min * 60000)}>
                {q.label}
              </button>
            ))}
          </div>
          <div className="row">
            <input type="time" className="grow" value={time} onChange={(e) => setTime(e.target.value)} aria-label="도착 시각" />
            <button
              className="btn primary inline"
              disabled={!time}
              onClick={() => {
                const at = etaFromTime(time, now);
                if (at) onEta(at);
              }}
            >
              시각으로 정하기
            </button>
          </div>
          {st?.etaAt && (
            <button className="btn" onClick={() => onEta(null)}>
              도착 시각 지우기
            </button>
          )}
        </div>
      )}
    </div>
  );
}
