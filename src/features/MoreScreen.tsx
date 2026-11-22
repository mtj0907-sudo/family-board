import { useFamily } from '../FamilyContext';

export type SubPage = 'settings' | 'schedule' | 'calendar' | 'work' | 'board' | 'help';

const ITEMS: { key: SubPage; emoji: string; label: string; note?: string; parentOnly?: boolean }[] = [
  { key: 'schedule', emoji: '🗓', label: '일정', note: '오늘·내일' },
  { key: 'calendar', emoji: '📅', label: '달력', note: '한 달 보기' },
  { key: 'work', emoji: '👩‍💼', label: '근무 가져오기', note: '3단계 · PIN 필요', parentOnly: true },
  { key: 'board', emoji: '🖥', label: '거실 보드', note: '4단계에서 만들어요' },
  { key: 'settings', emoji: '⚙️', label: '설정', note: 'PIN 필요', parentOnly: true },
  { key: 'help', emoji: '📲', label: '홈 화면에 추가하는 방법' },
];

export function MoreScreen({ onOpen }: { onOpen: (p: SubPage) => void }) {
  const { me, isParent, changeMe } = useFamily();
  return (
    <div className="screen">
      <div className="card row">
        <span className="avatar">{me.emoji}</span>
        <div className="grow">
          <div className="name">{me.name}</div>
          <div className="sub">이 기기의 주인</div>
        </div>
        <button className="btn inline" onClick={changeMe}>
          바꾸기
        </button>
      </div>
      <div className="list">
        {ITEMS.filter((i) => isParent || !i.parentOnly).map((i) => (
          <button key={i.key} className="listitem" onClick={() => onOpen(i.key)}>
            <span className="big-emoji">{i.emoji}</span>
            <span className="grow left">
              <b>{i.label}</b>
              {i.note && <span className="sub"> {i.note}</span>}
            </span>
            <span>›</span>
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
        <h2>📲 홈 화면에 추가하기 (아이폰)</h2>
        <ol className="steps">
          <li>
            반드시 <b>Safari</b>로 이 주소를 열어요 (카톡·인스타 안의 브라우저는 안 돼요).
          </li>
          <li>아래쪽 가운데 <b>공유 버튼(네모에서 화살표 ⬆︎)</b>을 눌러요.</li>
          <li>목록을 올려서 <b>"홈 화면에 추가"</b>를 눌러요.</li>
          <li>오른쪽 위 <b>추가</b>를 누르면 끝! 홈 화면의 아이콘으로 열어요.</li>
        </ol>
        <p className="sub">아이패드도 같은 방법이에요. 앱 아이콘 모양은 4단계에서 예쁘게 바꿔요.</p>
      </div>
    </div>
  );
}

export function ComingSoon({ title, stage }: { title: string; stage: number }) {
  return (
    <div className="screen center">
      <div className="card welcome">
        <div className="logo">🚧</div>
        <h2>{title}</h2>
        <p className="sub">{stage}단계에서 만들 예정이에요</p>
      </div>
    </div>
  );
}
