import { useFamily } from '../FamilyContext';
import { DEFAULT_BAG_ITEMS, bagDate, bagProgress, schoolKidIds, type BagDoc } from '../lib/bag';
import { path, setBagDoneAt, setBagItem, setBagSkip } from '../lib/db';
import type { Member } from '../lib/types';
import { useDocData } from './useFirestore';
import { useNotify } from './useNotify';

/** 가방 챙기기: 오늘 밤(다음 날 정오까지)의 기록과 체크 동작 */
export function useBag(now: number) {
  const { code, settings } = useFamily();
  const notify = useNotify();
  const date = bagDate(now);
  const bag = useDocData<BagDoc>(path(code, 'bag', date)) ?? undefined;
  const items = settings.bagItems?.length ? settings.bagItems : DEFAULT_BAG_ITEMS;
  const schoolKids = schoolKidIds(settings);

  function toggle(kid: Member, key: string, value: boolean) {
    const before = bagProgress(items, bag?.done?.[kid.id]);
    void setBagItem(code, date, kid.id, key, value);
    // 모두 체크되는 순간을 기록하고 부모에게 알림, 하나라도 풀면 기록을 지웁니다.
    const next = { ...(bag?.done?.[kid.id] ?? {}), [key]: value };
    const after = bagProgress(items, next);
    if (after.complete && !before.complete) {
      void setBagDoneAt(code, date, kid.id, Date.now());
      notify('message', kid.name, '가방을 다 챙겼어요');
    } else if (!after.complete && before.complete) {
      void setBagDoneAt(code, date, kid.id, null);
    }
  }

  const setSkip = (kid: Member, skip: boolean) => void setBagSkip(code, date, kid.id, skip);

  return { date, bag, items, schoolKids, toggle, setSkip };
}
