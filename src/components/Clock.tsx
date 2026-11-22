import { useNow } from '../hooks/useNow';
import { clockAngles, formatClock, formatDateKo } from '../lib/time';

const TICKS = Array.from({ length: 12 }, (_, i) => i);

/** 얇은 선과 눈금만 있는 조용한 아날로그 시계. 초침만 포인트 색입니다. */
export function Clock({ size = 132 }: { size?: number }) {
  const now = useNow(1000);
  const a = clockAngles(now);
  const [ap, hm] = formatClock(now).split(' ');
  return (
    <div className="hero">
      <svg width={size} height={size} viewBox="0 0 200 200" role="img" aria-label="아날로그 시계" style={{ flex: 'none' }}>
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
        <line x1="100" y1="106" x2="100" y2="58" stroke="#17201d" strokeWidth="7" strokeLinecap="round" transform={`rotate(${a.hour} 100 100)`} />
        <line x1="100" y1="108" x2="100" y2="34" stroke="#17201d" strokeWidth="4.5" strokeLinecap="round" transform={`rotate(${a.minute} 100 100)`} />
        <line x1="100" y1="116" x2="100" y2="26" stroke="#e0a526" strokeWidth="2.5" strokeLinecap="round" transform={`rotate(${a.second} 100 100)`} />
        <circle cx="100" cy="100" r="6" fill="#e0a526" />
      </svg>
      <div className="clock-text">
        <div className="clock-digital">
          <span className="ampm">{ap}</span>
          {hm}
        </div>
        <div className="clock-date">{formatDateKo(now)}</div>
      </div>
    </div>
  );
}
