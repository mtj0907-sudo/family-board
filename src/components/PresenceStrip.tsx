import { Avatar } from './Avatar';
import { Glyph } from './Glyph';
import { statusInfo } from '../lib/constants';
import { PRESENCE_COLOR, presenceOf } from '../lib/presence';
import type { Member, StatusDoc, WithId } from '../lib/types';

/** 동그란 얼굴 네 개를 2×2로: 테두리 색이 집(초록)·밖(노랑)·자는 중(파랑)을 알려줍니다. 맨 위 카드 오른쪽에 들어가요. */
export function PresenceMini({ members, statuses, onOpen }: { members: Member[]; statuses: WithId<StatusDoc>[]; onOpen?: () => void }) {
  return (
    <button className="pmini" onClick={onOpen} aria-label="가족 상태 보기">
      {members.slice(0, 6).map((m) => {
        const st = statuses.find((s) => s.id === m.id);
        const def = st ? statusInfo(st) : undefined;
        return (
          <span key={m.id} className="pm" title={`${m.name}: ${def?.label ?? '소식 없음'}`}>
            <span className="pm-ring" style={{ borderColor: PRESENCE_COLOR[presenceOf(st)] }}>
              <Avatar member={m} size={36} />
            </span>
            {def && (
              <em className="pm-badge">
                <Glyph k={def.emoji} size={11} />
              </em>
            )}
          </span>
        );
      })}
    </button>
  );
}
