/** 반짝이는 전구가 달린 크리스마스 트리. 터치는 통과합니다. */
const BULBS = [
  { x: 70, y: 58, c: '#ff5a5a' }, { x: 58, y: 84, c: '#ffd23f' }, { x: 84, y: 90, c: '#5ab0ff' },
  { x: 46, y: 116, c: '#5ae08a' }, { x: 72, y: 118, c: '#ff5a5a' }, { x: 98, y: 120, c: '#ffd23f' },
  { x: 34, y: 150, c: '#5ab0ff' }, { x: 62, y: 152, c: '#ffd23f' }, { x: 88, y: 150, c: '#ff8ad1' }, { x: 110, y: 152, c: '#5ae08a' },
];

export function ChristmasTree({ size = 190 }: { size?: number }) {
  return (
    <svg className="xmas-tree" width={size * 0.78} height={size} viewBox="0 0 140 180" aria-hidden>
      <polygon points="70,10 104,66 36,66" fill="#2f7d4a" />
      <polygon points="70,40 116,108 24,108" fill="#2a7144" />
      <polygon points="70,76 126,148 14,148" fill="#256a3f" />
      <rect x="62" y="148" width="16" height="18" rx="2" fill="#8a5a2b" />
      <polygon points="70,0 73,8 82,8 75,13 78,22 70,16 62,22 65,13 58,8 67,8" fill="#ffd23f" className="xmas-star" />
      {BULBS.map((b, i) => (
        <circle key={i} className="bulb" cx={b.x} cy={b.y} r="4.6" fill={b.c} style={{ animationDelay: `${(i * 0.37) % 1.8}s`, color: b.c }} />
      ))}
      <rect x="22" y="160" width="26" height="18" rx="2" fill="#d94a4a" />
      <rect x="32" y="160" width="6" height="18" fill="#ffe08a" />
      <rect x="96" y="164" width="22" height="14" rx="2" fill="#4a8fd9" />
      <rect x="104" y="164" width="6" height="14" fill="#ffe08a" />
    </svg>
  );
}
