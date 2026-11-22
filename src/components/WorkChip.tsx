import { workKind, workLabel } from '../lib/work';

/** 근무 코드 칩. 휴·주휴·연차는 빨강, D/M/N은 색을 달리합니다. */
export function WorkChip({ code, times }: { code: string; times?: Record<string, string> }) {
  return <span className={`wk k-${workKind(code)}`}>{workLabel(code, times)}</span>;
}
