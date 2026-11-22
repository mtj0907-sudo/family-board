import { useCallback, useEffect, useRef, useState } from 'react';
import { useFamily } from '../FamilyContext';
import { path } from '../lib/db';
import { pickLiveAlerts, type LiveAlert } from '../lib/liveAlert';
import type { MessageDoc, StatusDoc } from '../lib/types';
import { useColData } from './useFirestore';

const SHOW_MS = 6000;

/** 앱을 열어 둔 동안 새 한마디·상태 변경이 오면 위에 잠깐 띄웁니다. */
export function useLiveAlerts(viewing: 'message' | 'status' | string) {
  const { code, members, me, isParent } = useFamily();
  const msgs = useColData<MessageDoc>(path(code, 'messages'), { orderField: 'at', limitN: 30 });
  const statuses = useColData<StatusDoc>(path(code, 'status'));
  const mountedAt = useRef(Date.now());
  const alerted = useRef(new Set<string>());
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const [current, setCurrent] = useState<(LiveAlert & { more: number }) | null>(null);

  const dismiss = useCallback(() => {
    clearTimeout(timer.current);
    setCurrent(null);
  }, []);

  useEffect(() => {
    const fresh = pickLiveAlerts({ msgs, statuses, members, meId: me.id, isParent, since: mountedAt.current, alerted: alerted.current });
    if (fresh.length === 0) return;
    fresh.forEach((a) => alerted.current.add(a.id));
    // 지금 보고 있는 탭의 소식은 화면에 이미 보이므로 띄우지 않습니다.
    const show = fresh.filter((a) => a.tab !== viewing);
    if (show.length === 0) return;
    const last = show[show.length - 1];
    setCurrent({ ...last, more: show.length - 1 });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCurrent(null), SHOW_MS);
  }, [msgs, statuses, members, me.id, isParent, viewing]);

  useEffect(() => () => clearTimeout(timer.current), []);

  return { alert: current, dismiss };
}
