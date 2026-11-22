import { Bell } from 'lucide-react';
import type { LiveAlert } from '../lib/liveAlert';

/** 앱 위쪽에 잠깐 뜨는 알림. 누르면 해당 탭으로 이동합니다. */
export function LiveAlertBanner({ alert, onOpen }: { alert: (LiveAlert & { more: number }) | null; onOpen: (tab: LiveAlert['tab']) => void }) {
  if (!alert) return null;
  return (
    <button className="live-alert" role="status" aria-live="polite" onClick={() => onOpen(alert.tab)}>
      <Bell size={20} strokeWidth={1.75} aria-hidden />
      <span className="grow">
        <b>{alert.who}</b>
        <span>{alert.text}</span>
      </span>
      {alert.more > 0 && <small>외 {alert.more}건</small>}
    </button>
  );
}
