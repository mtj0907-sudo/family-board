// 모든 날짜/시간 계산은 한국 시간(Asia/Seoul, UTC+9, 서머타임 없음) 기준입니다.
const KST_OFFSET = 9 * 3600 * 1000;
const DAY = 86400000;

const p2 = (n: number) => String(n).padStart(2, '0');

export function kst(ms: number) {
  const d = new Date(ms + KST_OFFSET);
  return {
    y: d.getUTCFullYear(),
    m: d.getUTCMonth() + 1,
    d: d.getUTCDate(),
    hh: d.getUTCHours(),
    mm: d.getUTCMinutes(),
    ss: d.getUTCSeconds(),
    dow: d.getUTCDay(),
  };
}

/** 'YYYY-MM-DD' (한국 날짜). 루틴 문서 이름으로 쓰므로 자정에 자동으로 새 문서가 됩니다. */
export function dateKey(ms: number): string {
  const t = kst(ms);
  return `${t.y}-${p2(t.m)}-${p2(t.d)}`;
}

/** 한국 시간 기준 그날 0시의 실제 시각(ms) */
export function dayStart(ms: number): number {
  const t = kst(ms);
  return Date.UTC(t.y, t.m - 1, t.d) - KST_OFFSET;
}

const DOW = ['일', '월', '화', '수', '목', '금', '토'];

export function formatDateKo(ms: number): string {
  const t = kst(ms);
  return `${t.m}월 ${t.d}일 (${DOW[t.dow]})`;
}

export function formatClock(ms: number): string {
  const t = kst(ms);
  const ap = t.hh < 12 ? '오전' : '오후';
  const h = t.hh % 12 === 0 ? 12 : t.hh % 12;
  return `${ap} ${h}:${p2(t.mm)}`;
}

export function formatElapsed(ms: number): string {
  const m = Math.floor(ms / 60000);
  if (m < 1) return '방금';
  if (m < 60) return `${m}분째`;
  const h = Math.floor(m / 60);
  if (h >= 24) return `${Math.floor(h / 24)}일째`;
  const r = m % 60;
  return r ? `${h}시간 ${r}분째` : `${h}시간째`;
}

export function formatRemaining(ms: number): string {
  if (ms <= 0) return '도착할 시간이에요';
  const m = Math.ceil(ms / 60000);
  if (m < 60) return `${m}분 남음`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}시간 ${r}분 남음` : `${h}시간 남음`;
}

/** '18:30' → 오늘 18:30(한국 시간)의 ms. 이미 지난 시각이면 내일로 넘깁니다. */
export function etaFromTime(hhmm: string, now: number): number | null {
  const [h, m] = hhmm.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  let at = dayStart(now) + (h * 60 + m) * 60000;
  if (at < now) at += DAY;
  return at;
}

/** 예정 시각을 정한 때(from)부터 예정 시각(at)까지 얼마나 왔는지 0~1 */
export function etaProgress(from: number, at: number, now: number): number {
  if (at <= from) return 0;
  return Math.min(1, Math.max(0, (now - from) / (at - from)));
}

/** 아날로그 시계 바늘 각도(도) */
export function clockAngles(ms: number) {
  const t = kst(ms);
  return {
    hour: ((t.hh % 12) + t.mm / 60) * 30,
    minute: (t.mm + t.ss / 60) * 6,
    second: t.ss * 6,
  };
}
