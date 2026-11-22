import { Check } from 'lucide-react';
import { Avatar } from '../components/Avatar';
import { Glyph } from '../components/Glyph';
import { ProgressBar } from '../components/ProgressBar';
import { useFamily } from '../FamilyContext';
import { useDocData } from '../hooks/useFirestore';
import { useBag } from '../hooks/useBag';
import { useNow } from '../hooks/useNow';
import { path, setRoutineDone } from '../lib/db';
import { routineProgress } from '../lib/routine';
import { dateKey } from '../lib/time';
import type { Member, RoutineDoc, RoutineItem } from '../lib/types';
import { BagCard } from './BagCard';

export function RoutineScreen() {
  const { code, members, me, isParent, settings } = useFamily();
  const now = useNow(60000);
  const date = dateKey(now);
  const routine = useDocData<RoutineDoc>(path(code, 'routines', date));
  const kids = members.filter((m) => m.role === 'child');
  // 아이 기기에는 자기 것만, 부모 기기에는 아이 전체
  const shown = isParent ? kids : kids.filter((k) => k.id === me.id);
  const bag = useBag(now);
  const bagKids = shown.filter((k) => bag.schoolKids.includes(k.id));

  return (
    <RoutineView
      before={bagKids.map((k) => (
        <BagCard key={k.id} kid={k} items={bag.items} bag={bag.bag} onToggle={(key, v) => bag.toggle(k, key, v)} onSkip={(skip) => bag.setSkip(k, skip)} />
      ))}
      kids={shown}
      items={settings.routineItems}
      routine={routine ?? undefined}
      onToggle={(kid, key, value) => void setRoutineDone(code, date, kid, key, value)}
    />
  );
}

export function RoutineView({
  before,
  kids,
  items,
  routine,
  onToggle,
}: {
  /** 맨 위에 놓을 카드들 (가방 챙기기) */
  before?: React.ReactNode;
  kids: Member[];
  items: RoutineItem[];
  routine?: RoutineDoc;
  onToggle: (kidId: string, key: string, value: boolean) => void;
}) {
  return (
    <div className="screen">
      {before}
      {kids.length === 0 && <div className="card sub">루틴을 볼 아이가 없어요</div>}
      {kids.map((k) => {
        const done = routine?.done?.[k.id];
        const prog = routineProgress(items, done);
        return (
          <div key={k.id} className="card">
            <div className="row">
              <Avatar member={k} size={46} />
              <div className="grow">
                <div className="m-name">{k.name}</div>
                <ProgressBar value={prog.ratio} label="오늘 루틴" />
              </div>
              <span className="count">
                {prog.done}/{prog.total}
              </span>
            </div>

            <div className="tiles">
              {items.map((it) => {
                const on = !!done?.[it.key];
                return (
                  <button
                    key={it.key}
                    className={on ? 'tile on' : 'tile'}
                    onClick={() => onToggle(k.id, it.key, !on)}
                    aria-pressed={on}
                  >
                    <Glyph k={it.emoji} size={32} />
                    <span>{it.label}</span>
                    <span className="mark">
                      <Check size={14} strokeWidth={2.5} aria-hidden />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      <div className="sub center-text">매일 자정(한국 시간)에 새로 시작돼요</div>
    </div>
  );
}
