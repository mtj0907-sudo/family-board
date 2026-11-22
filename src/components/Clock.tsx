import { useNow } from '../hooks/useNow';
import { clockMarks } from '../lib/clockMarks';
import { clockAngles, formatClock, formatDateKo } from '../lib/time';
import { toneOf } from './Avatar';

const TICKS = Array.from({ length: 12 }, (_, i) => i);

/** 얇은 선과 눈금만 있는 조용한 아날로그 시계. 초침만 포인트 색입니다. */
export interface ClockMark {
  id: string;
  name: string;
  /** 도착 시각(ms) */
  at: number;
}

export function Clock({
  size = 132,
  stacked = false,
  compact = false,
  digital = true,
  marks = [],
}: {
  size?: number;
  stacked?: boolean;
  compact?: boolean;
  /** false면 아날로그 시계만 */
  digital?: boolean;
  /** 가족이 도착하는 시각을 시계 테두리에 색 점으로 표시 */
  marks?: ClockMark[];
}) {
  const now = useNow(1000);
  const a = clockAngles(now);
  const [ap, hm] = formatClock(now).split(' ');
  const placed = clockMarks(marks, now);
  const letters = size >= 150; // 큰 시계에서만 이름 첫 글자를 씁니다
  const pad = placed.length === 0 ? 0 : letters ? 16 : 12; // 테두리 위 이름표가 잘리지 않게 바깥 여백을 둡니다
  return (
    <div className={['hero', stacked ? 'stacked' : '', compact ? 'compact' : ''].filter(Boolean).join(' ')}>
      <svg width={size} height={size} viewBox={`${-pad} ${-pad} ${200 + 2 * pad} ${200 + 2 * pad}`} role="img" aria-label="아날로그 시계" style={{ flex: 'none' }}>
        <circle cx="100" cy="100" r="97" fill="#fff" stroke="#17201d" strokeWidth="2" />
        {TICKS.map((i) => {
          const major = i % 3 === 0;
          return (
            <line
              key={i}
              x1="100"
              y1={major ? 13 : 14}
              x2="100"
              y2={major ? 31 : 22}
              stroke="#17201d"
              strokeWidth={major ? 4 : 2}
              strokeLinecap="round"
              transform={`rotate(${i * 30} 100 100)`}
            />
          );
        })}
        {placed.map((p) => {
          const m = marks.find((x) => x.id === p.id)!;
          const t = toneOf(p.id);
          const r = p.ring === 0 ? 97 : 74;
          const rad = (p.angle * Math.PI) / 180;
          const cx = 100 + r * Math.sin(rad);
          const cy = 100 - r * Math.cos(rad);
          return (
            <g key={p.id}>
              <title>{m.name} 도착</title>
              <circle cx={cx} cy={cy} r={letters ? 13 : 11} fill={t.bg} stroke={t.fg} strokeWidth="2.5" />
              {letters && (
                <text x={cx} y={cy + 5} textAnchor="middle" fontSize="14" fontWeight="800" fill={t.fg}>
                  {Array.from(m.name.trim())[0]}
                </text>
              )}
            </g>
          );
        })}
        <line x1="100" y1="106" x2="100" y2="58" stroke="#17201d" strokeWidth="7" strokeLinecap="round" transform={`rotate(${a.hour} 100 100)`} />
        <line x1="100" y1="108" x2="100" y2="34" stroke="#17201d" strokeWidth="4.5" strokeLinecap="round" transform={`rotate(${a.minute} 100 100)`} />
        <line x1="100" y1="116" x2="100" y2="26" stroke="#e0a526" strokeWidth="2.5" strokeLinecap="round" transform={`rotate(${a.second} 100 100)`} />
        <circle cx="100" cy="100" r="6" fill="#e0a526" />
      </svg>
      {digital && (
      <div className="clock-text">
        <div className="clock-digital">
          <span className="ampm">{ap}</span>
          {hm}
        </div>
        <div className="clock-date">{formatDateKo(now)}</div>
      </div>
      )}
    </div>
  );
}
