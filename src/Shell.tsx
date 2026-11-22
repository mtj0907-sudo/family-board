import { useState } from 'react';
import { useFamily } from './FamilyContext';
import { TodayScreen } from './features/TodayScreen';
import { StatusScreen } from './features/StatusScreen';
import { MessageScreen } from './features/MessageScreen';
import { RoutineScreen } from './features/RoutineScreen';
import { ComingSoon, HelpScreen, MoreScreen, type SubPage } from './features/MoreScreen';
import { SettingsScreen } from './features/SettingsScreen';
import { ScheduleScreen } from './features/ScheduleScreen';
import { CalendarScreen } from './features/CalendarScreen';

type Tab = 'today' | 'status' | 'message' | 'routine' | 'more';

const TABS: { key: Tab; emoji: string; label: string }[] = [
  { key: 'today', emoji: '🏠', label: '오늘' },
  { key: 'status', emoji: '📍', label: '상태' },
  { key: 'message', emoji: '💌', label: '한마디' },
  { key: 'routine', emoji: '✅', label: '루틴' },
  { key: 'more', emoji: '➕', label: '더보기' },
];

const SUB_TITLES: Record<SubPage, string> = {
  settings: '설정',
  schedule: '일정',
  calendar: '달력',
  work: '근무 가져오기',
  board: '거실 보드',
  help: '홈 화면에 추가',
};

export function Shell() {
  const { me } = useFamily();
  const [tab, setTab] = useState<Tab>('today');
  const [sub, setSub] = useState<SubPage | null>(null);

  const go = (t: Tab) => {
    setTab(t);
    setSub(null);
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
      ) : sub === 'help' ? (
        <HelpScreen />
      ) : (
        <ComingSoon title={SUB_TITLES[sub]} stage={sub === 'work' ? 3 : 4} />
      );
  } else if (tab === 'today') body = <TodayScreen />;
  else if (tab === 'status') body = <StatusScreen />;
  else if (tab === 'message') body = <MessageScreen />;
  else if (tab === 'routine') body = <RoutineScreen />;
  else body = <MoreScreen onOpen={setSub} />;

  return (
    <div className="app">
      <header className="topbar">
        {tab === 'more' && sub ? (
          <button className="back" onClick={() => setSub(null)}>
            ‹ {SUB_TITLES[sub]}
          </button>
        ) : (
          <span className="title">🏡 우리집 보드</span>
        )}
        <span className="who-me">
          {me.emoji} {me.name}
        </span>
      </header>
      <main>{body}</main>
      <nav className="tabbar">
        {TABS.map((t) => (
          <button key={t.key} className={tab === t.key ? 'tab on' : 'tab'} onClick={() => go(t.key)}>
            <span className="tab-emoji">{t.emoji}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
