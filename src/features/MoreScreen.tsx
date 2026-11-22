import {
  BriefcaseBusiness,
  CalendarDays,
  CalendarRange,
  ChevronRight,
  Monitor,
  Settings,
  Smartphone,
  type LucideIcon,
} from 'lucide-react';
import { Avatar } from '../components/Avatar';
import { useFamily } from '../FamilyContext';

export type SubPage = 'settings' | 'schedule' | 'calendar' | 'work' | 'board' | 'help';

const ITEMS: { key: SubPage; Icon: LucideIcon; label: string; note?: string; parentOnly?: boolean }[] = [
  { key: 'schedule', Icon: CalendarRange, label: '일정', note: '오늘·내일' },
  { key: 'calendar', Icon: CalendarDays, label: '달력', note: '한 달 보기' },
  { key: 'work', Icon: BriefcaseBusiness, label: '근무 가져오기', note: 'PIN 필요', parentOnly: true },
  { key: 'board', Icon: Monitor, label: '거실 보드', note: '준비 중' },
  { key: 'settings', Icon: Settings, label: '설정', note: 'PIN 필요', parentOnly: true },
  { key: 'help', Icon: Smartphone, label: '홈 화면에 추가하는 방법' },
];

export function MoreScreen({ onOpen }: { onOpen: (p: SubPage) => void }) {
  const { me, isParent, changeMe } = useFamily();
  return (
    <div className="screen">
      <div className="card">
        <div className="row">
          <Avatar member={me} size={52} />
          <div className="grow">
            <div className="m-name">{me.name}</div>
            <div className="sub">이 기기의 주인</div>
          </div>
          <button className="btn inline" onClick={changeMe}>
            바꾸기
          </button>
        </div>
      </div>
      <div className="group">
        {ITEMS.filter((i) => isParent || !i.parentOnly).map(({ key, Icon, label, note }) => (
          <button key={key} className="listitem" onClick={() => onOpen(key)}>
            <Icon size={24} strokeWidth={1.75} aria-hidden />
            <span className="grow left">
              {label}
              {note && <span className="sub"> · {note}</span>}
            </span>
            <ChevronRight size={20} strokeWidth={1.75} className="chev" aria-hidden />
          </button>
        ))}
      </div>
    </div>
  );
}

export function HelpScreen() {
  return (
    <div className="screen">
      <div className="card">
        <h2>홈 화면에 추가하기 (아이폰)</h2>
        <ol className="steps">
          <li>
            반드시 <b>Safari</b>로 이 앱을 연 상태에서 하세요 (카톡·인스타 안의 브라우저는 안 돼요).
          </li>
          <li>
            주소창 맨 끝에 <b>#c=…</b> 가 붙어 있는지 확인해요. 앱이 자동으로 붙여 줘요. 이게 있어야 홈 화면 앱이 우리 가족으로 바로 열려요.
          </li>
          <li>
            아래쪽 가운데 <b>공유 버튼</b>(네모에서 화살표 ⬆︎)을 눌러요.
          </li>
          <li>
            목록을 올려서 <b>홈 화면에 추가</b>를 눌러요.
          </li>
          <li>
            오른쪽 위 <b>추가</b>를 누르면 끝이에요.
          </li>
        </ol>
        <p className="sub">
          예전에 만든 아이콘이 첫 화면(새 가족 만들기)으로 열리면, 그 아이콘을 지우고 위 순서로 다시 추가하세요. 아이패드도 같은 방법이에요.
        </p>
      </div>
    </div>
  );
}

export function ComingSoon({ title, stage }: { title: string; stage: number }) {
  return (
    <div className="screen center">
      <div className="card welcome">
        <h2>{title}</h2>
        <p className="sub">{stage}단계에서 만들 예정이에요</p>
      </div>
    </div>
  );
}
