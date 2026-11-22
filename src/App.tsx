import { useCallback, useState } from 'react';
import { FamilyProvider } from './FamilyContext';
import { useDocData } from './hooks/useFirestore';
import { firebaseReady } from './firebase';
import { disconnect, getCode, getMeId, parseJoinCode, setCode, setMeId } from './lib/family';
import { path } from './lib/db';
import type { FamilySettings } from './lib/types';
import { Welcome } from './features/Welcome';
import { WhoAmI } from './features/WhoAmI';
import { Shell } from './Shell';

export default function App() {
  const [code, setCodeState] = useState<string | null>(getCode());
  const [meId, setMeIdState] = useState<string | null>(getMeId());
  const [pickingMe, setPickingMe] = useState(false);

  const settings = useDocData<FamilySettings>(code ? path(code, 'settings', 'main') : null);

  const leave = useCallback(() => {
    disconnect();
    setCodeState(null);
    setMeIdState(null);
  }, []);

  if (!firebaseReady) return <ConfigMissing />;

  if (!code) {
    return (
      <Welcome
        initialCode={parseJoinCode(location.hash)}
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
          <div className="logo">🤔</div>
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

  const me = settings.members.find((m) => m.id === meId);
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
      <div className="logo spin">🏡</div>
    </div>
  );
}

function ConfigMissing() {
  return (
    <div className="screen center">
      <div className="card welcome">
        <div className="logo">🔧</div>
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
