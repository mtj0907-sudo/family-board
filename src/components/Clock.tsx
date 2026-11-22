import { useNow } from '../hooks/useNow';
import { clockAngles, formatClock, formatDateKo } from '../lib/time';

const NUMS = Array.from({ length: 12 }, (_, i) => i + 1);

export function Clock({ size = 200 }: { size?: number }) {
  const now = useNow(1000);
  const a = clockAngles(now);
  return (
    <div className="clockbox">
      <svg width={size} height={size} viewBox="0 0 200 200" role="img" aria-label="아날로그 시계">
        <circle cx="100" cy="100" r="96" fill="#fff" stroke="#2b2b2b" strokeWidth="6" />
        {NUMS.map((n) => {
          const r = (n * 30 * Math.PI) / 180;
          return (
            <text
              key={n}
              x={100 + 74 * Math.sin(r)}
              y={100 - 74 * Math.cos(r) + 9}
              textAnchor="middle"
              fontSize="26"
              fontWeight="800"
              fill="#2b2b2b"
            >
              {n}
            </text>
          );
        })}
        <line x1="100" y1="100" x2="100" y2="58" stroke="#2b2b2b" strokeWidth="9" strokeLinecap="round" transform={`rotate(${a.hour} 100 100)`} />
        <line x1="100" y1="100" x2="100" y2="36" stroke="#2b2b2b" strokeWidth="6" strokeLinecap="round" transform={`rotate(${a.minute} 100 100)`} />
        <line x1="100" y1="112" x2="100" y2="28" stroke="#ff5a4d" strokeWidth="3" strokeLinecap="round" transform={`rotate(${a.second} 100 100)`} />
        <circle cx="100" cy="100" r="7" fill="#ff5a4d" />
      </svg>
      <div className="clock-digital">{formatClock(now)}</div>
      <div className="clock-date">{formatDateKo(now)}</div>
    </div>
  );
}
