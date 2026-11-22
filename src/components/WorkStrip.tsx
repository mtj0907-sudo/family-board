import { addDays } from '../lib/events';
import { dateKey } from '../lib/time';
import { WorkChip } from './WorkChip';

/** 엄마 카드의 오늘 근무 칩 + 내일·모레 미리보기 */
export function WorkStrip({
  workOn,
  now,
  times,
}: {
  workOn: (dateKey: string) => string | undefined;
  now: number;
  times?: Record<string, string>;
}) {
  const today = dateKey(now);
  const todayCode = workOn(today);
  const next = [
    { label: '내일', code: workOn(addDays(today, 1)) },
    { label: '모레', code: workOn(addDays(today, 2)) },
  ];
  return (
    <div className="workrow">
      <span className="workpreview">
        <span className="sub">오늘</span>
        {todayCode ? <WorkChip code={todayCode} times={times} /> : <span className="sub">등록 안 됨</span>}
      </span>
      {next.map((n) => (
        <span key={n.label} className="workpreview">
          <span className="sub">{n.label}</span>
          {n.code ? <WorkChip code={n.code} /> : <span className="sub">-</span>}
        </span>
      ))}
    </div>
  );
}

