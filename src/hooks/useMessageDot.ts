import { useEffect, useState } from 'react';
import { useFamily } from '../FamilyContext';
import { path } from '../lib/db';
import { store } from '../lib/storage';
import type { MessageDoc } from '../lib/types';
import { hasUnread } from '../lib/unread';
import { useColData } from './useFirestore';

const KEY = 'fb.msgSeen';

/** 한마디 탭의 빨간 점. 한마디 탭을 열어 두면 "본 것"으로 칩니다. */
export function useMessageDot(viewing: boolean): boolean {
  const { code, me, isParent } = useFamily();
  const msgs = useColData<MessageDoc>(path(code, 'messages'), { orderField: 'at', limitN: 30 });
  const [seen, setSeen] = useState(() => {
    const v = Number(store.get(KEY));
    if (Number.isFinite(v) && v > 0) return v;
    const now = Date.now();
    store.set(KEY, String(now)); // 처음 쓸 때는 예전 한마디를 읽지 않음으로 치지 않습니다
    return now;
  });
  useEffect(() => {
    if (!viewing) return;
    const now = Date.now();
    store.set(KEY, String(now));
    setSeen(now);
  }, [viewing, msgs.length]);
  return hasUnread(msgs, { meId: me.id, isParent, seen });
}
