import { useMemo } from 'react';

/** 결정이 같은 난수 (그림이 다시 그려져도 가지 모양이 바뀌지 않게) */
function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CX = 110;
const TIERS = [
  { y0: 40, y1: 92, hw: 34 },
  { y0: 66, y1: 128, hw: 50 },
  { y0: 96, y1: 166, hw: 66 },
  { y0: 128, y1: 204, hw: 80 },
  { y0: 162, y1: 242, hw: 94 },
];
const LIGHT_COLORS = ['#ffe3a1', '#ff6b6b', '#6bb7ff', '#7be39a', '#ffb347'];
const BALLS = [
  { x: 108, y: 82, c: 0 }, { x: 88, y: 118, c: 2 }, { x: 128, y: 112, c: 1 }, { x: 70, y: 152, c: 1 },
  { x: 112, y: 150, c: 3 }, { x: 148, y: 156, c: 2 }, { x: 56, y: 192, c: 3 }, { x: 94, y: 190, c: 0 },
  { x: 130, y: 194, c: 1 }, { x: 166, y: 190, c: 3 }, { x: 74, y: 228, c: 2 }, { x: 118, y: 230, c: 0 }, { x: 156, y: 226, c: 1 },
];
const BALL_COLORS = [
  ['#ffd36b', '#d9a21f', '#8a5f0c'], // 금색
  ['#ff7a86', '#c8283a', '#7a121d'], // 빨강
  ['#7fb6ff', '#2f6fb5', '#173f73'], // 파랑
  ['#f4f7f9', '#c4ccd3', '#7d8892'], // 은색
];

/** 가지 한 층: 아래쪽이 늘어진 모양 */
function tierPath(y0: number, y1: number, hw: number): string {
  const n = 6;
  let d = `M ${CX} ${y0} L ${CX - hw} ${y1 - 8}`;
  for (let i = 0; i < n; i++) {
    const xa = CX - hw + (2 * hw * i) / n;
    const xb = CX - hw + (2 * hw * (i + 1)) / n;
    d += ` Q ${(xa + xb) / 2} ${y1 + 14} ${xb} ${y1 - 8}`;
  }
  return `${d} Z`;
}

/** 실제 나무처럼: 층층이 늘어진 가지, 바늘잎 결, 전구 줄, 반짝이는 불빛, 장식 공과 선물 */
export function ChristmasTree({ size = 230 }: { size?: number }) {
  const art = useMemo(() => {
    const r = rng(7);
    const needles: { x1: number; y1: number; x2: number; y2: number; c: string; o: number }[] = [];
    const greens = ['#2c7a48', '#3f9560', '#1c5133', '#52a86d', '#15402a'];
    TIERS.forEach((t, ti) => {
      const count = 110 + ti * 30;
      for (let i = 0; i < count; i++) {
        const u = 0.06 + r() * 0.92; // 위(0)에서 아래(1)
        const y = t.y0 + (t.y1 - t.y0) * u;
        const half = t.hw * u;
        const x = CX + (r() * 2 - 1) * half * 0.96;
        const out = x < CX ? -1 : 1;
        const ang = (r() * 0.7 + 0.1) * out; // 아래쪽 바깥으로 기울어진 바늘
        const len = 7 + r() * 8;
        needles.push({ x1: x, y1: y, x2: x + Math.sin(ang) * len, y2: y + Math.cos(ang) * len, c: greens[Math.floor(r() * greens.length)], o: 0.55 + r() * 0.4 });
      }
    });
    // 전구 줄: 층마다 늘어진 줄을 걸고 그 위에 전구를 단다
    const wires: string[] = [];
    const bulbs: { x: number; y: number; c: number; d: number; dur: number }[] = [];
    let k = 0;
    TIERS.forEach((t, ti) => {
      const yl = t.y0 + (t.y1 - t.y0) * 0.62;
      const half = t.hw * 0.62 * 0.98;
      const ltr = ti % 2 === 0;
      const ax = CX - half, bx = CX + half;
      const sag = 16 + ti * 2;
      wires.push(`M ${ltr ? ax : bx} ${yl - 8} Q ${CX} ${yl + sag} ${ltr ? bx : ax} ${yl - 8}`);
      const per = 4 + ti;
      for (let i = 0; i < per; i++) {
        const u = (i + 0.5) / per;
        const x0 = ltr ? ax : bx, x2 = ltr ? bx : ax;
        const px = (1 - u) * (1 - u) * x0 + 2 * (1 - u) * u * CX + u * u * x2;
        const py = (1 - u) * (1 - u) * (yl - 8) + 2 * (1 - u) * u * (yl + sag) + u * u * (yl - 8);
        bulbs.push({ x: px, y: py, c: k % LIGHT_COLORS.length, d: (k * 0.43) % 2.2, dur: 1.3 + ((k * 7) % 9) / 10 });
        k++;
      }
    });
    return { needles, wires, bulbs };
  }, []);

  return (
    <svg className="xmas-tree" width={(size * 220) / 280} height={size} viewBox="0 0 220 280" role="img" aria-label="반짝이는 크리스마스 트리">
      <defs>
        <linearGradient id="xt-tier" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3f9560" />
          <stop offset="1" stopColor="#1b4f31" />
        </linearGradient>
        <linearGradient id="xt-shade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity=".14" />
          <stop offset=".55" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".3" />
        </linearGradient>
        <linearGradient id="xt-skirt" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d23a40" />
          <stop offset="1" stopColor="#8e1b22" />
        </linearGradient>
        <linearGradient id="xt-star" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff4b8" />
          <stop offset="1" stopColor="#f0a81c" />
        </linearGradient>
        {LIGHT_COLORS.map((c, i) => (
          <radialGradient key={i} id={`xt-glow${i}`}>
            <stop offset="0" stopColor={c} stopOpacity="1" />
            <stop offset=".35" stopColor={c} stopOpacity=".55" />
            <stop offset="1" stopColor={c} stopOpacity="0" />
          </radialGradient>
        ))}
        {BALL_COLORS.map(([hi, mid, lo], i) => (
          <radialGradient key={i} id={`xt-ball${i}`} cx=".35" cy=".3" r=".8">
            <stop offset="0" stopColor={hi} />
            <stop offset=".55" stopColor={mid} />
            <stop offset="1" stopColor={lo} />
          </radialGradient>
        ))}
        <radialGradient id="xt-starglow">
          <stop offset="0" stopColor="#fff3b0" stopOpacity=".95" />
          <stop offset="1" stopColor="#ffd45a" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx={CX} cy="262" rx="98" ry="9" fill="#17201d" opacity=".16" />
      <rect x={CX - 9} y="236" width="18" height="22" rx="2" fill="#6b4423" />

      {TIERS.map((t, i) => (
        <g key={i}>
          <path d={tierPath(t.y0, t.y1, t.hw)} fill="url(#xt-tier)" />
          <path d={tierPath(t.y0, t.y1, t.hw)} fill="url(#xt-shade)" />
        </g>
      ))}
      <g strokeLinecap="round" strokeWidth="1.6">
        {art.needles.map((n, i) => (
          <line key={i} x1={n.x1} y1={n.y1} x2={n.x2} y2={n.y2} stroke={n.c} strokeOpacity={n.o} />
        ))}
      </g>

      {art.wires.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="#10281a" strokeWidth="1.2" strokeOpacity=".7" />
      ))}

      {BALLS.map((b, i) => (
        <g key={i}>
          <rect x={b.x - 1.4} y={b.y - 9} width="2.8" height="3.4" fill="#b8860b" />
          <circle cx={b.x} cy={b.y} r="5.6" fill={`url(#xt-ball${b.c})`} />
          <ellipse cx={b.x - 1.8} cy={b.y - 2} rx="1.5" ry="1" fill="#fff" opacity=".75" />
        </g>
      ))}

      {art.bulbs.map((b, i) => (
        <g key={i} className="bulb" style={{ animationDelay: `${b.d}s`, animationDuration: `${b.dur}s` }}>
          <circle cx={b.x} cy={b.y} r="9" fill={`url(#xt-glow${b.c})`} />
          <circle cx={b.x} cy={b.y} r="2.4" fill="#fffbe9" />
        </g>
      ))}

      <g className="xmas-star">
        <circle cx={CX} cy="30" r="22" fill="url(#xt-starglow)" />
        <polygon
          points={Array.from({ length: 10 }, (_, i) => {
            const rad = i % 2 === 0 ? 13 : 5.6;
            const a = (Math.PI / 5) * i - Math.PI / 2;
            return `${CX + rad * Math.cos(a)},${30 + rad * Math.sin(a)}`;
          }).join(' ')}
          fill="url(#xt-star)"
          stroke="#c98412"
          strokeWidth=".8"
        />
      </g>

      <ellipse cx={CX} cy="250" rx="86" ry="13" fill="url(#xt-skirt)" />
      <ellipse cx={CX} cy="246" rx="86" ry="10" fill="#e0474d" opacity=".55" />
      {/* 선물 */}
      <g>
        <rect x="26" y="236" width="34" height="24" rx="2.5" fill="#2f6fb5" />
        <rect x="26" y="236" width="34" height="7" rx="2" fill="#4b8bd0" />
        <rect x="40" y="236" width="6" height="24" fill="#ffe08a" />
        <ellipse cx="38" cy="233" rx="6" ry="4" fill="#ffe08a" />
        <ellipse cx="48" cy="233" rx="6" ry="4" fill="#f4c94a" />
      </g>
      <g>
        <rect x="160" y="240" width="30" height="20" rx="2.5" fill="#c8283a" />
        <rect x="160" y="240" width="30" height="6" rx="2" fill="#e04858" />
        <rect x="172" y="240" width="6" height="20" fill="#f4f7f9" />
        <ellipse cx="170" cy="237" rx="5.5" ry="3.6" fill="#f4f7f9" />
        <ellipse cx="180" cy="237" rx="5.5" ry="3.6" fill="#dfe6ea" />
      </g>
      <g>
        <rect x="132" y="248" width="22" height="14" rx="2" fill="#2f9460" />
        <rect x="140" y="248" width="5" height="14" fill="#ffe08a" />
      </g>
    </svg>
  );
}
