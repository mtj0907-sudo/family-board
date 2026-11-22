import { Check } from 'lucide-react';
import { Avatar } from '../components/Avatar';
import { Glyph } from '../components/Glyph';
import { ProgressBar } from '../components/ProgressBar';
import { useFamily } from '../FamilyContext';
import { useDocData } from '../hooks/useFirestore';
import { useNow } from '../hooks/useNow';
import { DOING_OPTIONS } from '../lib/constants';
import { path, setDoing, setRoutineDone } from '../lib/db';
import { routineProgress } from '../lib/routine';
import { dateKey } from '../lib/time';
import type { Member, RoutineDoc, RoutineItem } from '../lib/types';

export function RoutineScreen() {
  const { code, members, me, isParent, settings } = useFamily();
  const now = useNow(60000);
  const date = dateKey(now);
  const routine = useDocData<RoutineDoc>(path(code, 'routines', date));
  const kids = members.filter((m) => m.role === 'child');
  // 아이 기기에는 자기 것만, 부모 기기에는 아이 전체
  const shown = isParent ? kids : kids.filter((k) => k.id === me.id);

  return (
    <RoutineView
      kids={shown}
      items={settings.routineItems}
      routine={routine ?? undefined}
      onToggle={(kid, key, value) => void setRoutineDone(code, date, kid, key, value)}
      onDoing={(kid, value) => void setDoing(code, date, kid, value)}
    />
  );
}

export function RoutineView({
  kids,
  items,
  routine,
  onToggle,
  onDoing,
}: {
  kids: Member[];
  items: RoutineItem[];
  routine?: RoutineDoc;
  onToggle: (kidId: string, key: string, value: boolean) => void;
  onDoing: (kidId: string, value: string) => void;
}) {
  return (
    <div className="screen">
      {kids.length === 0 && <div className="card sub">루틴을 볼 아이가 없어요</div>}
      {kids.map((k) => {
        const done = routine?.done?.[k.id];
        const doing = routine?.doing?.[k.id];
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

            <div className="sub">지금 하는 일</div>
            <div className="chips">
              {DOING_OPTIONS.map((d) => (
                <button
                  key={d.key}
                  className={doing === d.key ? 'chip small on' : 'chip small'}
                  onClick={() => onDoing(k.id, doing === d.key ? '' : d.key)}
                >
                  <Glyph k={d.emoji} size={18} />
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        );
      })}
      <div className="sub center-text">매일 자정(한국 시간)에 새로 시작돼요</div>
    </div>
  );
}
