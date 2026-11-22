import { useDocData } from './useFirestore';
import { path } from '../lib/db';
import { addDays } from '../lib/events';
import { codeOnDate, type WorkDoc } from '../lib/work';

/** 오늘~모레 근무를 찾는 함수를 돌려줍니다. (월이 바뀌는 경우를 위해 필요한 달만 구독) */
export function useWorkWindow(code: string, todayKey: string): (dateKey: string) => string | undefined {
  const ymA = todayKey.slice(0, 7);
  const ymB = addDays(todayKey, 2).slice(0, 7);
  const a = useDocData<WorkDoc>(path(code, 'work', ymA));
  const b = useDocData<WorkDoc>(ymB === ymA ? null : path(code, 'work', ymB));
  return (dateKey) => {
    const ym = dateKey.slice(0, 7);
    const doc = ym === ymA ? a : ym === ymB ? b : null;
    return codeOnDate(doc?.days, dateKey);
  };
}
