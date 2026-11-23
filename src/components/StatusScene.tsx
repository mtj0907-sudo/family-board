import { useState, type ReactNode } from 'react';
import { SCENE_KEYS, type Look } from '../lib/characters';

/**
 * 상태마다 달라지는 작은 장면 그림 (어른용). 우리 앱을 위해 새로 그린 그림이에요.
 * 받침대 위에 인물이 서 있고, 회사에서는 책상, 집에 가는 중이나 데리러 가는 중에는 자동차가 나와요.
 */
const SKIN = '#f7d2b4';
const HAIR = '#3a2a22';
const INK = '#2b2321';

function Tile() {
  return (
    <g>
      <ellipse cx="160" cy="226" rx="120" ry="14" fill="#17201d" opacity=".12" />
      <polygon points="52,172 160,128 268,172 160,216" fill="#ece8e2" />
      <polygon points="52,172 160,216 160,232 52,188" fill="#9a7650" />
      <polygon points="160,216 268,172 268,188 160,232" fill="#7b5b3c" />
      <polygon points="52,172 160,128 268,172 160,216" fill="none" stroke="#fff" strokeOpacity=".6" strokeWidth="1.5" />
    </g>
  );
}

/** 머리와 얼굴. (0,0)이 얼굴 가운데, 반지름 22 */
function Head({ look, sleepy = false }: { look: Look; sleepy?: boolean }) {
  return (
    <g>
      {look === 'long' && <path d="M-25 -2 q-5 36 9 42 h32 q14 -6 9 -42 z" fill={HAIR} />}
      <circle r="22" fill={SKIN} />
      {look === 'long' ? (
        <path d="M-25 4 q-4 -33 25 -33 q29 0 25 33 q-11 -16 -25 -16 q-14 0 -25 16z" fill={HAIR} />
      ) : (
        <path d="M-23 -2 q-2 -28 23 -28 q25 0 23 28 q-3 -8 -10 -12 q-10 4 -28 2 q-6 2 -8 10z" fill={HAIR} />
      )}
      {sleepy ? (
        <>
          <path d="M-12 3 q4 3 8 0" stroke={INK} strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M4 3 q4 3 8 0" stroke={INK} strokeWidth="2" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="-8" cy="3" r="2.6" fill={INK} />
          <circle cx="8" cy="3" r="2.6" fill={INK} />
        </>
      )}
      <ellipse cx="-14" cy="11" rx="4.5" ry="2.8" fill="#f2a29a" opacity=".6" />
      <ellipse cx="14" cy="11" rx="4.5" ry="2.8" fill="#f2a29a" opacity=".6" />
      <path d="M-5 11 q5 5 10 0" stroke="#b3544b" strokeWidth="2" fill="none" strokeLinecap="round" />
    </g>
  );
}

type Pose = 'stand' | 'wave' | 'lift';

/** 서 있는 인물. (0,0)이 발끝 */
function Person({ x, y, s = 1, look, shirt, pose = 'stand', pants = '#37425c', bag = false }: { x: number; y: number; s?: number; look: Look; shirt: string; pose?: Pose; pants?: string; bag?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-14" y="-28" width="12" height="28" rx="4" fill={pants} />
      <rect x="2" y="-28" width="12" height="28" rx="4" fill={pants} />
      <ellipse cx="-8" cy="0" rx="9" ry="4.5" fill="#4a3a30" />
      <ellipse cx="8" cy="0" rx="9" ry="4.5" fill="#4a3a30" />
      <rect x="-19" y="-56" width="38" height="34" rx="12" fill={shirt} />
      <rect x="-19" y="-56" width="38" height="34" rx="12" fill="#fff" opacity=".12" />
      <rect x="-25" y="-52" width="10" height="26" rx="5" fill={shirt} />
      {pose === 'wave' ? (
        <g>
          <rect x="15" y="-52" width="10" height="26" rx="5" fill={shirt} transform="rotate(-145 20 -50)" />
          <circle cx="36" cy="-76" r="5.5" fill={SKIN} />
        </g>
      ) : pose === 'lift' ? (
        <>
          <path d="M-16 -48 L-27 -114 M16 -48 L27 -114" stroke={shirt} strokeWidth="10" strokeLinecap="round" />
          <circle cx="-27" cy="-118" r="5.5" fill={SKIN} />
          <circle cx="27" cy="-118" r="5.5" fill={SKIN} />
        </>
      ) : (
        <rect x="15" y="-52" width="10" height="26" rx="5" fill={shirt} />
      )}
      {bag && (
        <g>
          <path d="M-34 -40 q-2 -8 4 -8 q6 0 4 8" stroke="#6e4a2e" strokeWidth="2" fill="none" />
          <rect x="-40" y="-40" width="20" height="26" rx="4" fill="#d9a066" />
          <rect x="-40" y="-40" width="20" height="7" rx="3" fill="#fff" opacity=".25" />
        </g>
      )}
      <g transform="translate(0 -78)">
        <Head look={look} />
      </g>
    </g>
  );
}

function Car({ x = 0, color }: { x?: number; color: string }) {
  return (
    <g transform={`translate(${x} 0)`}>
      <ellipse cx="160" cy="184" rx="78" ry="9" fill="#17201d" opacity=".16" />
      <path d="M122 146 L136 116 Q140 110 148 110 H190 Q198 110 202 116 L214 146 Z" fill={color} />
      <rect x="92" y="146" width="136" height="28" rx="13" fill={color} />
      <rect x="92" y="146" width="136" height="9" rx="4" fill="#fff" opacity=".18" />
      <ellipse cx="226" cy="158" rx="4" ry="5" fill="#ffe27a" />
      <ellipse cx="94" cy="158" rx="3" ry="5" fill="#ff7a6e" />
      <circle cx="122" cy="174" r="13" fill="#2b2f33" />
      <circle cx="122" cy="174" r="5" fill="#cfd6db" />
      <circle cx="200" cy="174" r="13" fill="#2b2f33" />
      <circle cx="200" cy="174" r="5" fill="#cfd6db" />
    </g>
  );
}

/** 자동차 창 안의 운전자 */
function Driver({ look, x = 0 }: { look: Look; x?: number }) {
  return (
    <g transform={`translate(${x} 0)`}>
      <path d="M131 144 L141 120 H187 L199 144 Z" fill="#d3ecf9" />
      <g transform="translate(176 128) scale(.6)">
        <Head look={look} />
      </g>
      <path d="M131 144 L141 120 H187 L199 144 Z" fill="none" stroke="#fff" strokeOpacity=".5" strokeWidth="1.2" />
      <path d="M150 122 L146 142" stroke="#fff" strokeOpacity=".55" strokeWidth="3" strokeLinecap="round" />
    </g>
  );
}

function Road() {
  return (
    <g>
      <polygon points="68,172 160,134 252,172 160,210" fill="#6b7076" opacity=".55" />
      <path d="M96 172 L160 146 M178 139 L222 158" stroke="#fff" strokeOpacity=".7" strokeWidth="2.5" strokeDasharray="8 7" />
    </g>
  );
}

function House({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="0" y="34" width="84" height="52" fill="#fff1d6" />
      <rect x="42" y="34" width="42" height="52" fill="#000" opacity=".06" />
      <polygon points="-8,36 42,0 92,36" fill="#d9695a" />
      <polygon points="42,0 92,36 42,36" fill="#000" opacity=".1" />
      <rect x="30" y="54" width="20" height="32" rx="3" fill="#8a5a3a" />
      <circle cx="45" cy="70" r="1.8" fill="#ffd36b" />
      <rect x="8" y="46" width="16" height="16" rx="2" fill="#bfe3f5" />
      <rect x="58" y="46" width="16" height="16" rx="2" fill="#bfe3f5" />
    </g>
  );
}

function Steam({ x, y }: { x: number; y: number }) {
  return (
    <g stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none" opacity=".85">
      <path d={`M${x} ${y} q-6 -8 0 -16 q6 -8 0 -16`} />
      <path d={`M${x + 12} ${y + 2} q-6 -8 0 -16 q6 -8 0 -16`} />
    </g>
  );
}

function Spark({ x, y, r = 7, c = '#ffd36b' }: { x: number; y: number; r?: number; c?: string }) {
  return <path d={`M${x} ${y - r} L${x + r * 0.3} ${y - r * 0.3} L${x + r} ${y} L${x + r * 0.3} ${y + r * 0.3} L${x} ${y + r} L${x - r * 0.3} ${y + r * 0.3} L${x - r} ${y} L${x - r * 0.3} ${y - r * 0.3} Z`} fill={c} />;
}

function scene(key: string, o: { look: Look; accent: string }): ReactNode {
  const { look, accent } = o;
  const shirt = accent;
  switch (key) {
    case 'work':
      return (
        <>
          <Person x={208} y={162} look={look} shirt={shirt} />
          <rect x="84" y="150" width="150" height="14" rx="3" fill="#c79a66" />
          <rect x="92" y="164" width="8" height="22" fill="#a17848" />
          <rect x="218" y="164" width="8" height="22" fill="#a17848" />
          <rect x="112" y="108" width="62" height="40" rx="4" fill="#3b4650" />
          <rect x="117" y="113" width="52" height="30" rx="2" fill="#8fd3f2" />
          <path d="M122 135 l10 -10 l8 6 l12 -14 l10 12" stroke="#fff" strokeWidth="2" fill="none" opacity=".8" />
          <rect x="139" y="148" width="8" height="4" fill="#3b4650" />
          <rect x="90" y="140" width="18" height="10" rx="2" fill="#fff" />
          <rect x="196" y="136" width="12" height="14" rx="2" fill="#fff" />
          <rect x="196" y="136" width="12" height="5" fill="#8a5a3a" />
        </>
      );
    case 'going_home':
      return (
        <>
          <Road />
          <House x={214} y={96} s={0.55} />
          <Car x={-6} color={accent} />
          <Driver look={look} x={-6} />
        </>
      );
    case 'pickup':
      return (
        <>
          <Road />
          <Car x={22} color={accent} />
          <Driver look={look} x={22} />
          <Person x={92} y={186} s={0.55} look="short" shirt="#f0b84a" pose="wave" bag />
        </>
      );
    case 'shopping':
    case 'errand':
      return (
        <>
          <Person x={208} y={178} look={look} shirt={shirt} pose={key === 'errand' ? 'wave' : 'stand'} bag={key === 'errand'} />
          {key === 'shopping' && (
            <g>
              <path d="M96 128 H150 L142 162 H104 Z" fill="#c7ced4" />
              <path d="M96 128 H150 L142 162 H104 Z" fill="none" stroke="#7d8892" strokeWidth="2" />
              <path d="M110 128 L113 162 M124 128 V162 M138 128 L135 162 M100 140 H147 M102 151 H145" stroke="#7d8892" strokeWidth="1.5" />
              <path d="M96 128 L88 112 H78" stroke="#7d8892" strokeWidth="3" fill="none" strokeLinecap="round" />
              <circle cx="112" cy="168" r="5" fill="#2b2f33" />
              <circle cx="136" cy="168" r="5" fill="#2b2f33" />
              <rect x="104" y="102" width="20" height="28" rx="3" fill="#e7a05a" />
              <rect x="124" y="108" width="18" height="22" rx="3" fill="#7cc48c" />
              <circle cx="118" cy="100" r="6" fill="#e0584d" />
            </g>
          )}
          {key === 'errand' && <path d="M96 190 l8 -3 M116 184 l8 -3 M136 178 l8 -3" stroke="#b7ada0" strokeWidth="3" strokeLinecap="round" />}
        </>
      );
    case 'hospital':
      return (
        <>
          <Person x={214} y={180} look={look} shirt={shirt} />
          <rect x="84" y="102" width="92" height="76" fill="#f4f7f9" />
          <rect x="84" y="102" width="92" height="12" fill="#cfd8de" />
          <rect x="118" y="120" width="24" height="8" rx="2" fill="#e0584d" />
          <rect x="126" y="112" width="8" height="24" rx="2" fill="#e0584d" />
          <rect x="120" y="146" width="20" height="32" rx="2" fill="#8fb7d4" />
          <rect x="94" y="132" width="14" height="14" fill="#bfe3f5" />
          <rect x="152" y="132" width="14" height="14" fill="#bfe3f5" />
        </>
      );
    case 'cleaning':
      return (
        <>
          <Person x={212} y={180} look={look} shirt={shirt} pose="wave" />
          <rect x="94" y="156" width="36" height="28" rx="4" fill="#6fa8dc" />
          <ellipse cx="112" cy="156" rx="18" ry="5" fill="#a8d0f0" />
          <path d="M150 96 L128 170" stroke="#a17848" strokeWidth="5" strokeLinecap="round" />
          <path d="M118 168 l18 -6 l6 14 l-22 4 z" fill="#e7c36a" />
          <Spark x={90} y={120} />
          <Spark x={160} y={118} r={5} c="#fff" />
          <Spark x={176} y={146} r={6} />
        </>
      );
    case 'cooking':
      return (
        <>
          <Person x={214} y={180} look={look} shirt={shirt} />
          <rect x="80" y="140" width="96" height="42" rx="4" fill="#c9d0d6" />
          <rect x="80" y="140" width="96" height="10" rx="3" fill="#e5eaee" />
          <circle cx="104" cy="146" r="7" fill="#7d8892" />
          <rect x="112" y="116" width="44" height="26" rx="5" fill="#4a5560" />
          <rect x="108" y="112" width="52" height="8" rx="3" fill="#6a7580" />
          <rect x="156" y="124" width="14" height="5" rx="2" fill="#4a5560" />
          <Steam x={128} y={104} />
        </>
      );
    case 'laundry':
      return (
        <>
          <Person x={214} y={180} look={look} shirt={shirt} />
          <path d="M90 140 H170 L162 182 H98 Z" fill="#e8c88f" />
          <path d="M90 140 H170" stroke="#c8a56a" strokeWidth="5" strokeLinecap="round" />
          <ellipse cx="112" cy="136" rx="20" ry="11" fill="#f3a6b8" />
          <ellipse cx="138" cy="132" rx="22" ry="12" fill="#8fc7ea" />
          <ellipse cx="156" cy="138" rx="14" ry="9" fill="#fff" />
        </>
      );
    case 'organizing':
      return (
        <>
          <Person x={214} y={180} look={look} shirt={shirt} />
          <rect x="88" y="150" width="56" height="34" rx="3" fill="#d9b27c" />
          <rect x="104" y="150" width="24" height="8" fill="#c39a62" />
          <rect x="100" y="116" width="46" height="34" rx="3" fill="#e6c694" />
          <rect x="112" y="116" width="22" height="8" fill="#cfa86f" />
          <rect x="146" y="162" width="30" height="22" rx="3" fill="#8fb7d4" />
          <Spark x={92} y={112} r={5} c="#fff" />
        </>
      );
    case 'caring':
      return (
        <>
          <Person x={196} y={182} look={look} shirt={shirt} />
          <Person x={148} y={186} s={0.58} look="short" shirt="#f0b84a" pose="wave" />
          <path d="M168 160 q8 6 14 -2" stroke={SKIN} strokeWidth="6" strokeLinecap="round" fill="none" />
        </>
      );
    case 'resting':
      return (
        <>
          <rect x="84" y="118" width="116" height="44" rx="14" fill="#c9a07a" />
          <rect x="84" y="150" width="124" height="32" rx="10" fill="#b8895f" />
          <rect x="76" y="136" width="22" height="46" rx="10" fill="#a8794f" />
          <rect x="196" y="136" width="22" height="46" rx="10" fill="#a8794f" />
          <g transform="translate(142 122)">
            <rect x="-19" y="0" width="38" height="34" rx="12" fill={shirt} />
            <g transform="translate(0 -12)">
              <Head look={look} />
            </g>
          </g>
          <rect x="226" y="154" width="22" height="26" rx="3" fill="#8a5a3a" />
          <rect x="232" y="140" width="10" height="14" rx="2" fill="#fff" />
          <Steam x={237} y={134} />
        </>
      );
    case 'exercise':
      return (
        <>
          <Person x={190} y={182} look={look} shirt={shirt} pose="lift" />
          <g>
            <rect x="148" y="55" width="84" height="6" rx="3" fill="#59626b" />
            <rect x="140" y="44" width="12" height="28" rx="3" fill="#2b2f33" />
            <rect x="228" y="44" width="12" height="28" rx="3" fill="#2b2f33" />
          </g>
          <g>
            <rect x="96" y="176" width="40" height="5" rx="2" fill="#59626b" />
            <rect x="92" y="170" width="8" height="17" rx="3" fill="#2b2f33" />
            <rect x="132" y="170" width="8" height="17" rx="3" fill="#2b2f33" />
          </g>
        </>
      );
    case 'sleep':
      return (
        <>
          <rect x="84" y="132" width="132" height="40" rx="10" fill="#e8d9c4" />
          <rect x="84" y="168" width="132" height="14" rx="4" fill="#9a7650" />
          <rect x="84" y="112" width="14" height="70" rx="4" fill="#9a7650" />
          <rect x="96" y="122" width="44" height="22" rx="10" fill="#fff" />
          <g transform="translate(118 128) scale(.72)">
            <Head look={look} sleepy />
          </g>
          <path d="M104 150 H214 V170 H104 Z" fill={accent} opacity=".92" />
          <path d="M104 150 H214" stroke="#fff" strokeOpacity=".4" strokeWidth="3" />
          <path d="M230 92 a16 16 0 1 0 14 24 a12 12 0 1 1 -14 -24z" fill="#ffe27a" />
          <text x="170" y="112" fontSize="16" fontWeight="700" fill="#7d8fb3">z</text>
          <text x="184" y="98" fontSize="22" fontWeight="700" fill="#7d8fb3">z</text>
          <Spark x={90} y={96} r={5} c="#fff" />
        </>
      );
    case 'home':
      return (
        <>
          <House x={72} y={92} s={1.1} />
          <Person x={214} y={184} look={look} shirt={shirt} pose="wave" />
          <path d="M154 70 c-8 -10 -22 2 -10 14 l10 9 l10 -9 c12 -12 -2 -24 -10 -14z" fill="#ff7a8a" />
        </>
      );
    default:
      return <Person x={168} y={186} look={look} shirt={shirt} pose="wave" />;
  }
}

/** 3D 지점토 그림이 있는 상태들 (public/scenes/<상태>-<short|long>.webp) */
const CLAY = new Set<string>(SCENE_KEYS as readonly string[]);

/**
 * 어른 상태 그림. 3D 지점토 느낌의 그림이 있으면 그것을, 없으면(직접 만든 장소 등) 그려 둔 간단한 그림을 보여줘요.
 * 그림이 안 불러와지면(인터넷 문제 등) 간단한 그림으로 바뀝니다.
 */
export function StatusScene({ statusKey, look, accent, className }: { statusKey: string; look: Look; accent: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (CLAY.has(statusKey) && !failed) {
    return (
      <img
        className={className ?? 'status-scene clay'}
        src={`${import.meta.env.BASE_URL}scenes/${statusKey}-${look}.webp`}
        alt=""
        draggable={false}
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <svg className={className ?? 'status-scene'} viewBox="0 0 320 250" role="img" aria-hidden preserveAspectRatio="xMidYMid meet">
      <Tile />
      {scene(statusKey, { look, accent })}
    </svg>
  );
}
