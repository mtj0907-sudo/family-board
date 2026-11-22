import { monthCells } from '../lib/events';
import { workKind } from '../lib/work';

const DOW = ['일', '월', '화', '수', '목', '금', '토'];

interface Props {
  ym: string; // 'YYYY-MM'
  days: Record<string, string>;
  todayKey?: string;
  /** 주면 날짜를 눌러 수정할 수 있어요 */
  onPick?: (day: number) => void;
}

export function WorkCalendar({ ym, days, todayKey, onPick }: Props) {
  const [y, m] = ym.split('-').map(Number);
  const cells = monthCells(y, m);
  return (
    <div className="calgrid wkcal">
      {DOW.map((d, i) => (
        <div key={d} className={i === 0 ? 'dow sun' : i === 6 ? 'dow sat' : 'dow'}>
          {d}
        </div>
      ))}
      {cells.map((c) => {
        if (!c.inMonth) return <div key={c.key} className="day blank" />;
        const day = Number(c.key.slice(8));
        const code = days[String(day)];
        const cls = ['day', 'wkday'];
        if (code) cls.push(`k-${workKind(code)}`);
        if (c.key === todayKey) cls.push('today');
        const inner = (
          <>
            <span className="dnum">{day}</span>
            <span className="wkcode">{code ?? ''}</span>
          </>
        );
        return onPick ? (
          <button key={c.key} className={cls.join(' ')} onClick={() => onPick(day)}>
            {inner}
          </button>
        ) : (
          <div key={c.key} className={cls.join(' ')}>
            {inner}
          </div>
        );
      })}
    </div>
  );
}
