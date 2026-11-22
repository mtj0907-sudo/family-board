import { statusOf } from './constants';
import { topic } from './korean';
import { dayStart, etaProgress, formatClock, formatRemaining } from './time';
import type { StatusDoc } from './types';
import { OFF_CODES, workEndAt } from './work';

const MIN = 60000;

export interface Eta {
  at: number;
  from: number;
  /** true면 본인이 정한 시각이 아니라 평소 걸리는 시간으로 짐작한 값 */
  estimated: boolean;
}

/**
 * 도착 시각: 본인이 정했으면 그것을, 아니면 "집에 가는 중"을 누른 때 + 평소 걸리는 시간으로 짐작합니다.
 * (위치는 쓰지 않습니다.)
 */
export function estimateEta(st: StatusDoc | undefined, commuteMin?: number): Eta | null {
  if (!st) return null;
  if (st.etaAt) return { at: st.etaAt, from: st.etaFrom ?? st.since, estimated: false };
  if (st.key === 'going_home' && commuteMin && commuteMin > 0) {
    return { at: st.since + commuteMin * MIN, from: st.since, estimated: true };
  }
  return null;
}

export interface WhenAnswer {
  /** 예: "엄마는 집에 가는 중" */
  headline: string;
  /** 도착 시각을 알거나 짐작할 수 있을 때 */
  eta?: { text: string; clockLabel: string; ratio: number; estimated: boolean };
  /** 보충 설명 (근무가 끝나는 시각, 평소 걸리는 시간 등) */
  details: string[];
  /** 도착 시각을 모를 때 "물어보기"를 보여줄지 */
  canAsk: boolean;
}

/** "엄마 언제 와요?"에 대한 답을 만듭니다. 위치는 쓰지 않고, 본인이 정한 상태와 평소 걸리는 시간만 씁니다. */
export function whenHome(opts: {
  name: string;
  st?: StatusDoc;
  now: number;
  workCode?: string;
  workTimes?: Record<string, string>;
  commuteMin?: number;
}): WhenAnswer {
  const { name, st, now, workCode, workTimes, commuteMin } = opts;
  if (!st) return { headline: `${topic(name)} 아직 소식이 없어요`, details: [], canAsk: true };

  const def = statusOf(st.key);
  const headline = `${topic(name)} ${def?.label ?? '밖에 있어요'}`;

  const eta = estimateEta(st, commuteMin);
  if (eta) {
    const left = eta.at - now;
    const base = left > 0 ? formatRemaining(left) : '곧 도착해요';
    return {
      headline,
      eta: {
        text: eta.estimated && left > 0 ? `약 ${base}` : base,
        clockLabel: `${eta.estimated ? '약 ' : ''}${formatClock(eta.at)} 도착 ${eta.estimated ? '예상' : '예정'}`,
        ratio: etaProgress(eta.from, eta.at, now),
        estimated: eta.estimated,
      },
      details: eta.estimated ? [`평소 ${commuteMin}분 걸려요`] : [],
      canAsk: false,
    };
  }

  if (st.key === 'home') return { headline, details: [], canAsk: false };

  const details: string[] = [];
  if (st.key === 'work') {
    const endMs = workCode && !OFF_CODES.includes(workCode) ? workEndAt(workCode, workTimes, dayStart(now)) : null;
    if (endMs && endMs > now) {
      details.push(`오늘 근무는 ${formatClock(endMs)}에 끝나요`);
      if (commuteMin) details.push(`집에는 약 ${formatClock(endMs + commuteMin * MIN)}쯤 도착해요`);
    } else if (commuteMin) {
      details.push(`퇴근하면 집까지 약 ${commuteMin}분 걸려요`);
    }
  }
  return { headline, details, canAsk: true };
}
