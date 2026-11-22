import { statusOf } from './constants';
import { topic } from './korean';
import { etaProgress, formatClock, formatRemaining } from './time';
import type { StatusDoc } from './types';
import { OFF_CODES, workEndText } from './work';

export interface WhenAnswer {
  /** 예: "엄마는 집에 가는 중" */
  headline: string;
  /** 도착 예정이 있을 때만 */
  eta?: { text: string; clock: string; ratio: number };
  /** 보충 설명 (예: 근무가 끝나는 시각) */
  detail?: string;
  /** 도착 시각을 모를 때 "물어보기"를 보여줄지 */
  canAsk: boolean;
}

/** "엄마 언제 와요?"에 대한 답을 만듭니다. 위치는 쓰지 않고, 본인이 정한 상태와 도착 예정만 씁니다. */
export function whenHome(opts: {
  name: string;
  st?: StatusDoc;
  now: number;
  workCode?: string;
  workTimes?: Record<string, string>;
}): WhenAnswer {
  const { name, st, now, workCode, workTimes } = opts;
  if (!st) return { headline: `${topic(name)} 아직 소식이 없어요`, canAsk: true };

  const def = statusOf(st.key);
  const headline = `${topic(name)} ${def?.label ?? '밖에 있어요'}`;

  if (st.etaAt) {
    const left = st.etaAt - now;
    return {
      headline,
      eta: {
        text: left > 0 ? formatRemaining(left) : '곧 도착해요',
        clock: formatClock(st.etaAt),
        ratio: etaProgress(st.etaFrom ?? st.since, st.etaAt, now),
      },
      canAsk: false,
    };
  }

  if (st.key === 'home') return { headline, canAsk: false };

  let detail: string | undefined;
  if (st.key === 'work' && workCode && !OFF_CODES.includes(workCode)) {
    const end = workEndText(workCode, workTimes);
    if (end) detail = `오늘 근무는 ${end}에 끝나요`;
  }
  return { headline, detail, canAsk: true };
}
