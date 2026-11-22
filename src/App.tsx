import { useCallback, useEffect, useState } from 'react';
import { FamilyProvider } from './FamilyContext';
import { useDocData } from './hooks/useFirestore';
import { firebaseReady } from './firebase';
import { buildHash, disconnect, getCode, getMeId, parseJoinHash, setCode, setMeId } from './lib/family';
import { path } from './lib/db';
import type { FamilySettings } from './lib/types';
import { Welcome } from './features/Welcome';
import { WhoAmI } from './features/WhoAmI';
import { Shell } from './Shell';

export default function App() {
  // 홈 화면 앱은 저장 공간이 따로라서, 주소 끝(#c=…&me=…)에 담긴 연결 정보를 이어받습니다.
  const [hashInfo] = useState(() => parseJoinHash(location.hash));
  const [code, setCodeState] = useState<string | null>(getCode());
  const [meId, setMeIdState] = useState<string | null>(getMeId() ?? hashInfo.me);
  const [pickingMe, setPickingMe] = useState(false);

  const settings = useDocData<FamilySettings>(code ? path(code, 'settings', 'main') : null);

  const leave = useCallback(() => {
    disconnect();
    setCodeState(null);
    setMeIdState(null);
  }, []);

  const me = settings?.members.find((m) => m.id === meId);

  // 연결된 기기는 주소 끝에 항상 #c=가족코드&me=번호 를 유지합니다. (# 뒤는 서버로 전송되지 않아요)
  useEffect(() => {
    if (!code) return;
    const next = buildHash(code, me?.id ?? null);
    if (location.hash !== next) history.replaceState(null, '', location.pathname + location.search + next);
    if (me) setMeId(me.id);
  }, [code, me]);

  if (!firebaseReady) return <ConfigMissing />;

  if (!code) {
    return (
      <Welcome
        initialCode={hashInfo.code}
        onDone={(c) => {
          setCode(c);
          setCodeState(c);
        }}
      />
    );
  }

  if (settings === undefined) return <Loading />;
  if (settings === null) {
    return (
      <div className="screen center">
        <div className="card welcome">
          <h2>가족 정보를 찾을 수 없어요</h2>
          <p className="sub">인터넷 연결이 안 되었거나 Firebase 규칙이 아직 게시되지 않았을 수 있어요.</p>
          <button className="btn primary" onClick={() => location.reload()}>
            다시 시도
          </button>
          <button className="btn" onClick={leave}>
            다른 가족으로 연결
          </button>
        </div>
      </div>
    );
  }

  if (!me || pickingMe) {
    return (
      <WhoAmI
        members={settings.members}
        onCancel={me ? () => setPickingMe(false) : undefined}
        onPick={(id) => {
          setMeId(id);
          setMeIdState(id);
          setPickingMe(false);
        }}
      />
    );
  }

  return (
    <FamilyProvider code={code} settings={settings} me={me} onChangeMe={() => setPickingMe(true)} onLeave={leave}>
      <Shell />
    </FamilyProvider>
  );
}

function Loading() {
  return (
    <div className="screen center">
      <div className="wordmark spin">우리집<i>보드</i></div>
    </div>
  );
}

function ConfigMissing() {
  return (
    <div className="screen center">
      <div className="card welcome">
        <h2>Firebase 설정이 아직 없어요</h2>
        <p className="sub">
          배포할 때 <b>VITE_FIREBASE_CONFIG</b> 값이 들어가야 해요.
          <br />
          docs/SETUP-FIREBASE.md 의 순서대로 설정해 주세요.
        </p>
      </div>
    </div>
  );
}
