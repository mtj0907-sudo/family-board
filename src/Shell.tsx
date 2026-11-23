import { ChevronLeft, Ellipsis, House, ListChecks, MapPin, MessageCircle, Monitor, PawPrint, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { Avatar } from './components/Avatar';
import { useFamily } from './FamilyContext';
import { useMessageDot } from './hooks/useMessageDot';
import { useLiveAlerts } from './hooks/useLiveAlerts';
import { LiveAlertBanner } from './components/LiveAlertBanner';
import { TodayScreen } from './features/TodayScreen';
import { StatusScreen } from './features/StatusScreen';
import { MessageScreen } from './features/MessageScreen';
import { RoutineScreen } from './features/RoutineScreen';
import { PetScreen } from './features/PetPanel';
import { ComingSoon, HelpScreen, MoreScreen, type SubPage } from './features/MoreScreen';
import { SettingsScreen } from './features/SettingsScreen';
import { ScheduleScreen } from './features/ScheduleScreen';
import { CalendarScreen } from './features/CalendarScreen';
import { WorkScreen } from './features/WorkScreen';

export type Tab = 'today' | 'status' | 'message' | 'routine' | 'pet' | 'more';

const TABS: { key: Tab; Icon: LucideIcon; label: string }[] = [
  { key: 'today', Icon: House, label: '오늘' },
  { key: 'status', Icon: MapPin, label: '상태' },
  { key: 'message', Icon: MessageCircle, label: '한마디' },
  { key: 'routine', Icon: ListChecks, label: '루틴' },
  { key: 'pet', Icon: PawPrint, label: '펫' },
  { key: 'more', Icon: Ellipsis, label: '더보기' },
];

const SUB_TITLES: Record<SubPage, string> = {
  settings: '설정',
  schedule: '일정',
  calendar: '달력',
  work: '근무 가져오기',
  board: '거실 보드',
  help: '홈 화면에 추가',
};

export function Shell({ initialTab = 'today', onBoard }: { initialTab?: Tab; onBoard?: () => void }) {
  const { me, isParent } = useFamily();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [sub, setSub] = useState<SubPage | null>(null);
  const messageDot = useMessageDot(tab === 'message');
  const live = useLiveAlerts(tab);

  const [statusFor, setStatusFor] = useState<string | null>(null);
  const go = (t: Tab, who?: string) => {
    setTab(t);
    setSub(null);
    setStatusFor(who ?? null);
  };

  let body;
  if (tab === 'more' && sub) {
    body =
      sub === 'settings' ? (
        <SettingsScreen />
      ) : sub === 'schedule' ? (
        <ScheduleScreen />
      ) : sub === 'calendar' ? (
        <CalendarScreen />
      ) : sub === 'work' ? (
        <WorkScreen />
      ) : sub === 'help' ? (
        <HelpScreen />
      ) : (
        <ComingSoon title={SUB_TITLES[sub]} stage={4} />
      );
  } else if (tab === 'today') body = <TodayScreen onGo={go} />;
  else if (tab === 'status') body = <StatusScreen key={statusFor ?? 'me'} initialTarget={statusFor} />;
  else if (tab === 'message') body = <MessageScreen />;
  else if (tab === 'routine') body = <RoutineScreen />;
  else if (tab === 'pet') body = <PetScreen />;
  else body = <MoreScreen onOpen={(p) => (p === 'board' && onBoard ? onBoard() : setSub(p))} />;

  const title = TABS.find((t) => t.key === tab)!.label;

  return (
    <div className="app">
      <LiveAlertBanner
        alert={live.alert}
        onOpen={(t) => {
          live.dismiss();
          go(t);
        }}
      />
      <header className="topbar">
        {tab === 'more' && sub ? (
          <button className="back" onClick={() => setSub(null)}>
            <ChevronLeft size={26} strokeWidth={1.75} aria-hidden />
            {SUB_TITLES[sub]}
          </button>
        ) : (
          <h1 className="top-title">{title}</h1>
        )}
        <span className="top-right">
          {tab === 'today' && onBoard && (
            <button className="top-btn" onClick={onBoard} aria-label="거실 보드 열기">
              <Monitor size={16} strokeWidth={1.75} aria-hidden />
              보드
            </button>
          )}
          <span className="who-me">
            <Avatar member={me} size={30} />
            {me.name}
          </span>
        </span>
      </header>
      <main>{body}</main>
      <nav className="tabbar" aria-label="메뉴">
        {TABS.filter((t) => t.key !== 'pet' || !isParent).map(({ key, Icon, label }) => (
          <button key={key} className={tab === key ? 'tab on' : 'tab'} onClick={() => go(key)} aria-current={tab === key ? 'page' : undefined}>
            <Icon size={24} strokeWidth={tab === key ? 2 : 1.75} aria-hidden />
            <span>{label}</span>
            {key === 'message' && messageDot && tab !== 'message' && <i className="tab-dot" aria-label="새 한마디" />}
          </button>
        ))}
      </nav>
    </div>
  );
}
