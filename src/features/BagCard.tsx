import { Backpack, Check } from 'lucide-react';
import { Avatar } from '../components/Avatar';
import { Glyph } from '../components/Glyph';
import { ProgressBar } from '../components/ProgressBar';
import { bagProgress, type BagDoc } from '../lib/bag';
import { formatClock } from '../lib/time';
import type { Member, RoutineItem } from '../lib/types';

/** "가방 챙기기" 카드. 아이는 스스로 체크하고, 부모는 같은 카드로 결과를 봅니다. */
export function BagCard({
  kid,
  items,
  bag,
  onToggle,
  onSkip,
}: {
  kid: Member;
  items: RoutineItem[];
  bag?: BagDoc;
  onToggle: (key: string, value: boolean) => void;
  onSkip: (skip: boolean) => void;
}) {
  const done = bag?.done?.[kid.id];
  const prog = bagProgress(items, done);
  const skip = !!bag?.skip?.[kid.id];
  const doneAt = bag?.doneAt?.[kid.id];

  return (
    <div className="card bagcard">
      <div className="row">
        <Avatar member={kid} size={46} />
        <div className="grow">
          <div className="m-name">{kid.name} 가방 챙기기</div>
          <ProgressBar value={prog.total ? prog.done / prog.total : 0} label="가방 챙기기" />
        </div>
        <span className="count">
          {prog.done}/{prog.total}
        </span>
      </div>

      {skip ? (
        <div className="result no-school">
          <Backpack size={22} strokeWidth={1.75} aria-hidden />
          내일은 학교 안 가는 날이에요
        </div>
      ) : (
        <>
          {prog.complete && (
            <div className="result ok">
              <Check size={26} strokeWidth={2} aria-hidden />
              다 챙겼어요{doneAt ? ` · ${formatClock(doneAt)}` : ''}
            </div>
          )}
          <div className="tiles">
            {items.map((it) => {
              const on = !!done?.[it.key];
              return (
                <button key={it.key} className={on ? 'tile on' : 'tile'} onClick={() => onToggle(it.key, !on)} aria-pressed={on}>
                  <Glyph k={it.emoji} size={30} />
                  <span>{it.label}</span>
                  <span className="mark">
                    <Check size={14} strokeWidth={2.5} aria-hidden />
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}

      <button className="btn small" onClick={() => onSkip(!skip)}>
        {skip ? '학교 가는 날로 바꾸기' : '내일은 학교 안 가요'}
      </button>
    </div>
  );
}
