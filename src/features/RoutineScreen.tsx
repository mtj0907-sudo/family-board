import { ProgressBar } from '../components/ProgressBar';
import { useFamily } from '../FamilyContext';
import { useDocData } from '../hooks/useFirestore';
import { useNow } from '../hooks/useNow';
import { DOING_OPTIONS } from '../lib/constants';
import { path, setDoing, setRoutineDone } from '../lib/db';
import { routineProgress } from '../lib/routine';
import { dateKey } from '../lib/time';
import type { RoutineDoc } from '../lib/types';

export function RoutineScreen() {
  const { code, members, me, isParent, settings } = useFamily();
  const now = useNow(60000);
  const date = dateKey(now);
  const routine = useDocData<RoutineDoc>(path(code, 'routines', date));
  const kids = members.filter((m) => m.role === 'child');
  // 아이 기기에는 자기 것만, 부모 기기에는 아이 전체
  const shown = isParent ? kids : kids.filter((k) => k.id === me.id);

  return (
    <div className="screen">
      {shown.length === 0 && <div className="card sub">루틴을 볼 아이가 없어요</div>}
      {shown.map((k) => {
        const done = routine?.done?.[k.id];
        const doing = routine?.doing?.[k.id];
        const prog = routineProgress(settings.routineItems, done);
        return (
          <div key={k.id} className="card">
            <div className="row">
              <span className="avatar">{k.emoji}</span>
              <div className="grow">
                <div className="name">{k.name}</div>
                <ProgressBar value={prog.ratio} label="오늘 루틴" />
              </div>
              <b className="count">
                {prog.done}/{prog.total}
              </b>
            </div>

            <div className="grid4">
              {settings.routineItems.map((it) => {
                const on = !!done?.[it.key];
                return (
                  <button
                    key={it.key}
                    className={on ? 'rt on' : 'rt'}
                    onClick={() => setRoutineDone(code, date, k.id, it.key, !on)}
                    aria-pressed={on}
                  >
                    <span className="big-emoji">{it.emoji}</span>
                    <span>{it.label}</span>
                    <span className="mark">{on ? '✔' : '✖'}</span>
                  </button>
                );
              })}
            </div>

            <div className="sub">지금 하는 일</div>
            <div className="chips row4">
              {DOING_OPTIONS.map((d) => (
                <button
                  key={d.key}
                  className={doing === d.key ? 'chip small on' : 'chip small'}
                  onClick={() => setDoing(code, date, k.id, doing === d.key ? '' : d.key)}
                >
                  {d.emoji} {d.label}
                </button>
              ))}
            </div>
          </div>
        );
      })}
      <div className="sub center-text">🌙 매일 자정(한국 시간)에 새로 시작돼요</div>
    </div>
  );
}
