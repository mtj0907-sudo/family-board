import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { Avatar } from '../components/Avatar';
import { useFamily } from '../FamilyContext';
import { firebasePublic } from '../firebase';
import { SHORTCUT_PRESETS, buildShortcutRequest } from '../lib/shortcut';
import { statusInfo } from '../lib/constants';
import { statusesFor } from '../lib/statusSets';

/**
 * 설정 안의 "위치로 자동 변경" 도우미.
 * 아이폰 단축어 앱의 "도착하면/떠나면" 자동화가 이 주소로 요청을 보내면, 앱의 아이 상태가 자동으로 바뀝니다.
 * 앱은 좌표를 받지 않고 "도착했다/떠났다"는 사실만 받아요.
 */
export function ShortcutHelper() {
  const { code, members, settings } = useFamily();
  const kids = members.filter((m) => m.role === 'child');
  const [kidId, setKidId] = useState(kids[0]?.id ?? '');
  const [statusKey, setStatusKey] = useState('school');
  const [copied, setCopied] = useState('');
  const kid = kids.find((k) => k.id === kidId);
  const list = kid ? statusesFor(kid, settings) : [];
  const chosen = list.find((s) => s.key === statusKey) ?? list[0];
  const isCustom = !!chosen && (settings.customStatuses ?? []).some((c) => c.key === chosen.key);

  if (!kid || !chosen) return null;
  if (!firebasePublic) return null;
  const req = buildShortcutRequest({
    projectId: firebasePublic.projectId,
    apiKey: firebasePublic.apiKey,
    code,
    memberId: kid.id,
    status: { key: chosen.key, ...(isCustom ? { custom: { label: chosen.label, emoji: chosen.emoji, eta: chosen.eta } } : {}) },
  });

  async function copy(what: 'url' | 'body') {
    const text = what === 'url' ? req.url : req.body;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      window.prompt('이 글을 길게 눌러 복사하세요', text);
    }
    setCopied(what);
    window.setTimeout(() => setCopied(''), 2000);
  }

  return (
    <div className="card">
      <h2>위치로 자동 변경 (아이폰 단축어)</h2>
      <div className="sub">
        아이 아이폰이 "학교에 도착했다"를 알아채면, 아이가 아무것도 안 눌러도 앱의 상태가 바뀌어요. 앱은 위치(좌표)를 받지 않고 도착했다는 사실만 받아요.
        에어태그는 이 용도로 쓸 수 없고, 아이의 아이폰이 필요해요.
      </div>

      <div className="sub">1. 누구의 상태를 바꿀까요?</div>
      <div className="picker wrap">
        {kids.map((k) => (
          <button key={k.id} className={k.id === kidId ? 'pick on' : 'pick'} onClick={() => setKidId(k.id)}>
            <Avatar member={k} size={38} />
            {k.name}
          </button>
        ))}
      </div>

      <div className="sub">2. 어떤 때에 무슨 상태로 바꿀까요?</div>
      <div className="chips">
        {SHORTCUT_PRESETS.map((p) => (
          <button key={p.label} className="chip small" onClick={() => setStatusKey(p.statusKey)}>
            {p.label}
          </button>
        ))}
      </div>
      <select value={chosen.key} onChange={(e) => setStatusKey(e.target.value)} aria-label="바꿀 상태">
        {list.map((s) => (
          <option key={s.key} value={s.key}>
            {s.label}
          </option>
        ))}
      </select>
      <div className="sub">
        바꿀 상태: <b>{statusInfo({ key: chosen.key, ...(isCustom ? { label: chosen.label, emoji: chosen.emoji } : {}) })?.label ?? chosen.label}</b>
      </div>

      <div className="sub">3. 아래 두 가지를 복사해서 단축어에 붙여 넣어요</div>
      <div className="row">
        <button className="btn inline" onClick={() => void copy('url')}>
          {copied === 'url' ? <Check size={18} aria-hidden /> : <Copy size={18} aria-hidden />}
          주소 복사
        </button>
        <button className="btn inline" onClick={() => void copy('body')}>
          {copied === 'body' ? <Check size={18} aria-hidden /> : <Copy size={18} aria-hidden />}
          내용 복사
        </button>
      </div>
      <div className="sub">복사한 주소에는 우리 가족 코드가 들어 있어요. 아이 아이폰의 단축어에만 붙여 넣고, 다른 곳에 올리지 마세요.</div>

      <details className="howto">
        <summary>단축어 만드는 순서 (아이 아이폰에서)</summary>
        <ol className="steps">
          <li>
            아이 아이폰에서 <b>단축어</b> 앱을 열고, 아래 가운데 <b>자동화</b>를 눌러요.
          </li>
          <li>
            오른쪽 위 <b>+</b> → <b>개인용 자동화 생성</b> → <b>도착</b>(또는 <b>떠남</b>)을 눌러요.
          </li>
          <li>
            <b>위치</b>에서 학교(또는 학원)를 찾아 고르고, <b>완료</b>를 눌러요. 시간은 <b>아무 때나</b>로 두세요. 그다음 <b>다음</b>.
          </li>
          <li>
            <b>동작 추가</b> → <b>텍스트</b>를 골라서, 위에서 복사한 <b>내용</b>을 붙여 넣어요.
          </li>
          <li>
            그 아래에 <b>동작 추가</b> → <b>URL 내용 가져오기</b>를 골라요. <b>URL</b> 칸에는 복사한 <b>주소</b>를 붙여 넣어요.
          </li>
          <li>
            <b>URL 내용 가져오기</b> 줄의 <b>화살표(∨)</b>를 눌러 펼치고 이렇게 바꿔요:
            <ul>
              <li>방법: <b>POST</b></li>
              <li>헤더 추가: 키 <b>Content-Type</b>, 값 <b>application/json</b></li>
              <li>요청 본문: <b>파일</b> → 파일 칸에서 위의 <b>텍스트</b>를 골라요</li>
            </ul>
          </li>
          <li>
            <b>다음</b>을 누르고, <b>실행 전에 확인</b>을 <b>끄고</b>(꺼짐), <b>완료</b>를 눌러요. 확인을 켜 두면 아이가 알림을 눌러야만 실행돼요.
          </li>
          <li>
            시험: 앱 상태를 다른 것으로 바꿔 두고, 단축어 자동화를 눌러 <b>실행(▶)</b>해 보세요. 앱의 상태가 바뀌면 성공이에요.
          </li>
        </ol>
        <p className="sub">
          장소마다 "도착"과 "떠남"을 따로 만들어요. 학교와 학원이면 4개예요. 아이폰이 장소를 알아채는 데 몇 분 걸리거나 100~200m쯤 어긋날 수 있어요.
          요청이 안 먹히면(오류 403) Google Cloud의 API 키 제한(HTTP 리퍼러)이 걸려 있는 것이니 알려 주세요.
        </p>
      </details>
    </div>
  );
}
