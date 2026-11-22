import { useCallback } from 'react';
import { useFamily } from '../FamilyContext';
import { notifyFamily } from '../lib/push';

/** 알림 보내기. 서버가 연결돼 있지 않으면 아무 일도 하지 않습니다. */
export function useNotify() {
  const { code, settings } = useFamily();
  return useCallback(
    (category: 'status' | 'message' | 'pickup', title: string, body: string) => notifyFamily(settings, code, { category, title, body }),
    [code, settings],
  );
}
