import { daysInMonth } from './events';

/** 근무 코드. 휴·주휴·연차는 쉬는 날(빨강 계열). 그 밖의 글자도 자유 텍스트로 허용합니다. */
export const WORK_CODES = ['D', 'M09', 'M10', 'M12', 'M13', 'M14', 'N', '휴', '주휴', '연차'];
/** 설정에서 근무 시간을 입력할 수 있는 코드 (쉬는 날 제외) */
export const TIMED_CODES = ['D', 'M09', 'M10', 'M12', 'M13', 'M14', 'N'];
export const OFF_CODES = ['휴', '주휴', '연차'];

export type WorkKind = 'off' | 'day' | 'mid' | 'night' | 'other';

export function workKind(code: string): WorkKind {
  if (OFF_CODES.includes(code)) return 'off';
  if (code === 'D') return 'day';
  if (/^M\d{2}$/.test(code)) return 'mid';
  if (code === 'N') return 'night';
  return 'other';
}

/** 저장 문서: work/{YYYY-MM}. 키는 날짜(일) 문자열 '1'~'31' */
export interface WorkDoc {
  days?: Record<string, string>;
  updatedAt?: number;
}

export interface ParsedWork {
  /** 'YYYY-MM' */
  ym: string;
  days: Record<string, string>;
  warnings: string[];
}

export type ParseResult = { ok: true; value: ParsedWork } | { ok: false; error: string };

const pad = (n: number) => String(n).padStart(2, '0');

function normalize(raw: string): string {
  return raw
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/｜/g, '|')
    .replace(/[，、]/g, ',')
    .replace(/＝/g, '=')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeCode(v: string): string {
  const t = v.trim();
  if (/^[a-zA-Z]+\d*$/.test(t)) {
    const u = t.toUpperCase();
    return /^M\d$/.test(u) ? `M0${u[1]}` : u;
  }
  return t;
}

/**
 * `YYYY-MM|1=M12,2=휴,3=N,...` 형식을 읽습니다.
 * 공백·줄바꿈이 어디에 있어도, 쉼표가 빠져도(1=M12 2=휴) 읽히고, 값에 공백이 있는 자유 텍스트(건강 검진)도 허용합니다.
 */
export function parseWork(raw: string): ParseResult {
  const text = normalize(raw);
  const bar = text.indexOf('|');
  if (bar < 0) return { ok: false, error: '맨 앞에 "2026-11|" 같은 월 표시가 필요해요.' };

  const head = text.slice(0, bar);
  const hm = head.match(/(\d{4})\s*[-./년]\s*(\d{1,2})\s*월?\s*$/);
  if (!hm) return { ok: false, error: '월 표시를 읽지 못했어요. 예: 2026-11' };
  const y = Number(hm[1]);
  const m = Number(hm[2]);
  if (m < 1 || m > 12) return { ok: false, error: `${m}월은 없는 달이에요.` };
  const ym = `${y}-${pad(m)}`;
  const dim = daysInMonth(y, m);

  // 앞에 ','를 붙여서 첫 항목도 같은 방식으로 찾습니다.
  const body = `,${text.slice(bar + 1)}`;
  const re = /[,\s](\d{1,2})\s*=\s*/g;
  const found: { day: number; start: number; end: number }[] = [];
  let mm: RegExpExecArray | null;
  while ((mm = re.exec(body))) {
    found.push({ day: Number(mm[1]), start: mm.index, end: mm.index + mm[0].length });
  }
  if (found.length === 0) return { ok: false, error: '"날짜=코드" 항목을 찾지 못했어요. 예: 1=M12,2=휴' };

  const days: Record<string, string> = {};
  const warnings: string[] = [];
  found.forEach((f, i) => {
    const next = found[i + 1];
    const value = normalizeCode(body.slice(f.end, next ? next.start : undefined).replace(/^[,\s]+|[,\s]+$/g, ''));
    if (f.day < 1 || f.day > dim) {
      warnings.push(`${f.day}일은 ${m}월에 없어서 건너뛰었어요.`);
      return;
    }
    if (!value) {
      warnings.push(`${f.day}일 코드가 비어 있어서 건너뛰었어요.`);
      return;
    }
    if (days[String(f.day)]) warnings.push(`${f.day}일이 두 번 나와서 뒤의 값(${value})으로 했어요.`);
    days[String(f.day)] = value;
  });

  if (Object.keys(days).length === 0) return { ok: false, error: '읽을 수 있는 근무 코드가 없어요.' };
  const missing = dim - Object.keys(days).length;
  if (missing > 0) warnings.push(`${missing}일은 근무 정보가 없어요. (저장 후 직접 채울 수 있어요)`);
  return { ok: true, value: { ym, days, warnings } };
}

/** 'YYYY-MM-DD' 날짜의 근무 코드를 해당 월의 days에서 찾습니다. */
export function codeOnDate(days: Record<string, string> | undefined, dateKey: string): string | undefined {
  return days?.[String(Number(dateKey.slice(8, 10)))];
}

/** 칩에 보일 글자: 코드 + (설정에 시간이 있으면) 시간 */
export function workLabel(code: string, times?: Record<string, string>): string {
  const t = times?.[code]?.trim();
  return t ? `${code} ${t}` : code;
}
