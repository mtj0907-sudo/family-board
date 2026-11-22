import {
  BriefcaseBusiness,
  CalendarDays,
  CalendarRange,
  ChevronRight,
  MapPinned,
  Monitor,
  Settings,
  Smartphone,
  type LucideIcon,
} from 'lucide-react';
import { Avatar } from '../components/Avatar';
import { useFamily } from '../FamilyContext';
import { openFindMy } from '../lib/findmy';

export type SubPage = 'settings' | 'schedule' | 'calendar' | 'work' | 'board' | 'help';

const ITEMS: { key: SubPage; Icon: LucideIcon; label: string; note?: string; parentOnly?: boolean }[] = [
  { key: 'schedule', Icon: CalendarRange, label: '일정', note: '오늘·내일' },
  { key: 'calendar', Icon: CalendarDays, label: '달력', note: '한 달 보기' },
  { key: 'work', Icon: BriefcaseBusiness, label: '근무 가져오기', note: 'PIN 필요', parentOnly: true },
  { key: 'board', Icon: Monitor, label: '거실 보드', note: '아이패드용 큰 화면' },
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
        {isParent && (
          <button className="listitem" onClick={openFindMy}>
            <MapPinned size={24} strokeWidth={1.75} aria-hidden />
            <span className="grow left">
              위치 확인<span className="sub"> · 나의 찾기 앱 열기</span>
            </span>
            <ChevronRight size={20} strokeWidth={1.75} className="chev" aria-hidden />
          </button>
        )}
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
          예전에 만든 아이콘이 첫 화면(새 가족 만들기)으로 열리면, 그 아이콘을 지우고 위 순서로 다시 추가하세요.
        </p>
      </div>
      <div className="card">
        <h2>거실 아이패드를 보드로 쓰기</h2>
        <ol className="steps">
          <li>
            아이패드 Safari로 앱을 열고, <b>더보기 → 거실 보드</b>를 눌러요.
          </li>
          <li>
            그 상태에서 <b>공유 → 홈 화면에 추가</b>를 하면, 아이콘이 바로 거실 보드로 열려요.
          </li>
          <li>
            화면이 꺼지지 않게: 보드에 <b>화면 켜짐 유지 중</b>이 보이면 앱이 알아서 해요. 대신 <b>화면 켜두기</b> 버튼이 보이면 한 번 눌러 주세요.
          </li>
          <li>
            그래도 꺼지면 아이패드 <b>설정 → 디스플레이 및 밝기 → 자동 잠금 → 안 함</b>으로 바꾸고, 충전기를 꽂아 두세요.
          </li>
        </ol>
        <p className="sub">보드는 보기만 하는 화면이라 눌러야 하는 곳이 거의 없어요. 오른쪽 위 X로 닫을 수 있어요.</p>
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
