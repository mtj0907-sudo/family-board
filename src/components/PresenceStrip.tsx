import { Avatar } from './Avatar';
import { Glyph } from './Glyph';
import { statusInfo } from '../lib/constants';
import { PRESENCE_COLOR, presenceOf, presenceSummary } from '../lib/presence';
import type { Member, StatusDoc, WithId } from '../lib/types';

/** "지금 우리집": 동그란 얼굴 테두리 색으로 집(초록)·밖(노랑)·자는 중(파랑)을 한눈에 */
export function PresenceStrip({ members, statuses, onOpen }: { members: Member[]; statuses: WithId<StatusDoc>[]; onOpen?: () => void }) {
  const sum = presenceSummary(members, statuses);
  return (
    <div className="pstrip">
      <div className="pstrip-row">
        {members.map((m) => {
          const st = statuses.find((s) => s.id === m.id);
          const def = st ? statusInfo(st) : undefined;
          const p = presenceOf(st);
          return (
            <button key={m.id} className="pst" onClick={onOpen} aria-label={`${m.name}: ${def?.label ?? '소식 없음'}`}>
              <span className="pst-ring" style={{ borderColor: PRESENCE_COLOR[p] }}>
                <Avatar member={m} size={54} />
                {def && (
                  <em className="pst-badge">
                    <Glyph k={def.emoji} size={14} />
                  </em>
                )}
              </span>
              <span className="pst-name">{m.name}</span>
            </button>
          );
        })}
      </div>
      <div className="pstrip-sum">{sum.text}</div>
    </div>
  );
}
