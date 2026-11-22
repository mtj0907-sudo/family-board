import { Check } from 'lucide-react';
import { useState } from 'react';
import { Avatar } from '../components/Avatar';
import { Glyph } from '../components/Glyph';
import { useFamily } from '../FamilyContext';
import { useDocData } from '../hooks/useFirestore';
import { useStatusActions } from '../hooks/useStatusActions';
import { useNow } from '../hooks/useNow';
import { statusInfo, type StatusDef } from '../lib/constants';
import { statusesFor } from '../lib/statusSets';
import { path } from '../lib/db';
import { etaFromTime, formatClock } from '../lib/time';
import type { Member, StatusDoc } from '../lib/types';

export const QUICK_ETA = [
  { label: '10분 뒤', min: 10 },
  { label: '20분 뒤', min: 20 },
  { label: '30분 뒤', min: 30 },
  { label: '1시간 뒤', min: 60 },
];

export function StatusScreen() {
  const { code, members, me, isParent, settings } = useFamily();
  const [targetId, setTargetId] = useState(me.id);
  const now = useNow(30000);
  const target = members.find((m) => m.id === targetId) ?? me;
  const st = useDocData<StatusDoc>(path(code, 'status', target.id));
  const actions = useStatusActions();

  // 이 사람(어른/아이)에게 어울리는 상태만 보여줍니다.
  const list = statusesFor(target, settings);

  return (
    <StatusView
      members={members}
      isParent={isParent}
      target={target}
      onTarget={setTargetId}
      st={st ?? undefined}
      now={now}
      onPick={(def) => actions.pick(target, def)}
      statuses={list}
      onEta={(at) => actions.eta(target, at)}
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
  statuses,
}: {
  members: Member[];
  isParent: boolean;
  target: Member;
  onTarget: (id: string) => void;
  st?: StatusDoc;
  now: number;
  onPick: (def: StatusDef) => void;
  onEta: (at: number | null) => void;
  statuses: StatusDef[];
}) {
  const def = statusInfo(st);
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
        {statuses.map((s) => (
          <button key={s.key} className={st?.key === s.key ? 'chip on' : 'chip'} onClick={() => onPick(s)}>
            <Glyph k={s.emoji} size={24} />
            <span>{s.label}</span>
            {st?.key === s.key && <Check className="chk" size={18} strokeWidth={2.5} aria-hidden />}
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
