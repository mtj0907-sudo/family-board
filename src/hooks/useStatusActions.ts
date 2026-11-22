import { useCallback } from 'react';
import { useFamily } from '../FamilyContext';
import { ARRIVAL_ROUTINE_KEY, type StatusDef } from '../lib/constants';
import { setEta, setRoutineDone, setStatus } from '../lib/db';
import { dateKey, formatClockKo } from '../lib/time';
import type { Member } from '../lib/types';
import { useNotify } from './useNotify';

/** 상태 바꾸기·도착 시각 정하기. 상태 화면과 거실 보드가 같이 씁니다. */
export function useStatusActions() {
  const { code, settings } = useFamily();
  const notify = useNotify();

  const pick = useCallback(
    (target: Member, def: StatusDef) => {
      const isCustom = (settings.customStatuses ?? []).some((c) => c.key === def.key);
      void setStatus(code, target.id, def.key, isCustom ? { label: def.label, emoji: def.emoji, eta: def.eta } : undefined);
      notify('status', target.name, def.label);
      // 아이가 "집에 있어요"를 누르면 루틴의 "집 도착"도 자동 체크
      if (def.key === 'home' && target.role === 'child') {
        void setRoutineDone(code, dateKey(Date.now()), target.id, ARRIVAL_ROUTINE_KEY, true);
      }
    },
    [code, settings.customStatuses, notify],
  );

  const eta = useCallback(
    (target: Member, at: number | null) => {
      void setEta(code, target.id, at);
      if (at) notify('status', target.name, `${formatClockKo(at)} 도착 예정`);
    },
    [code, notify],
  );

  return { pick, eta };
}
