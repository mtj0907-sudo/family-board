import { Bell, BellOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { generateVapidKeys } from '../../worker/src/webpush';
import { useFamily } from '../FamilyContext';
import { saveSettings } from '../lib/db';
import {
  checkPushServer,
  disablePush,
  enablePush,
  getPrefs,
  getPushState,
  normalizePushUrl,
  pushSupport,
  sendTestPush,
  setPrefs,
  type PushPrefs,
} from '../lib/push';

/** 설정의 "알림" 카드: 알림 서버 연결(가족 1회) + 이 기기에서 알림 받기(기기마다) */
export function PushSettings() {
  const { code, settings, me } = useFamily();
  const [urlInput, setUrlInput] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<{ permission: NotificationPermission; subscribed: boolean } | null>(null);
  const [prefs, setPrefsState] = useState<PushPrefs>(getPrefs);
  const support = pushSupport();
  const connected = !!settings.pushUrl && !!settings.pushPublic;

  useEffect(() => {
    void getPushState().then(setState);
  }, []);

  async function connect() {
    const url = normalizePushUrl(urlInput);
    if (!url) return setMsg('https:// 로 시작하는 주소를 붙여넣어 주세요');
    setBusy(true);
    setMsg('');
    if (!(await checkPushServer(url))) {
      setBusy(false);
      return setMsg('이 주소에서 알림 서버를 찾지 못했어요. 주소를 다시 확인해 주세요');
    }
    // 이미 만든 알림 키가 있으면 그대로 씁니다. (바꾸면 켜 둔 기기들이 다시 켜야 해요)
    const keys = settings.pushPublic && settings.pushPrivate ? { publicKey: settings.pushPublic, privateKey: settings.pushPrivate } : await generateVapidKeys();
    void saveSettings(code, { ...settings, pushUrl: url, pushPublic: keys.publicKey, pushPrivate: keys.privateKey });
    setBusy(false);
    setUrlInput('');
    setMsg('알림 서버를 연결했어요');
  }

  function disconnect() {
    if (!confirm('알림 서버 연결을 끊을까요? (켜 둔 기기들의 알림이 오지 않게 돼요)')) return;
    const { pushUrl: _removed, ...rest } = settings;
    void saveSettings(code, rest);
    setMsg('연결을 끊었어요');
  }

  async function turnOn(next: PushPrefs) {
    if (!settings.pushPublic) return;
    try {
      await enablePush({ code, memberId: me.id, vapidPublic: settings.pushPublic, prefs: next });
      setState(await getPushState());
      setMsg('이 기기에서 알림을 받아요');
    } catch (e) {
      const denied = e instanceof Error && e.message === 'denied';
      setMsg(denied ? '알림이 막혀 있어요. 아이폰 설정 → 알림 → 이 앱에서 허용해 주세요' : '알림을 켜지 못했어요. 잠시 뒤 다시 해 주세요');
      setState(await getPushState());
    }
  }

  async function turnOff() {
    await disablePush(code);
    setState(await getPushState());
    setMsg('이 기기의 알림을 껐어요');
  }

  function changePref(key: keyof PushPrefs, value: boolean) {
    const next = { ...prefs, [key]: value };
    setPrefsState(next);
    setPrefs(next);
    if (state?.subscribed) void turnOn(next);
  }

  return (
    <div className="card">
      <h2>알림</h2>
      {!connected ? (
        <>
          <div className="sub">
            아이가 한마디를 보내거나 가족이 상태를 바꾸면 폰에 알림이 와요. 무료 알림 서버가 한 번 필요해요. 저장소의 <b>docs/SETUP-PUSH.md</b>를 따라
            서버를 만든 뒤, 받은 주소를 아래에 붙여넣어 주세요.
          </div>
          <input value={urlInput} placeholder="https://family-board-push.○○○.workers.dev" onChange={(e) => setUrlInput(e.target.value)} aria-label="알림 서버 주소" />
          <button className="btn primary" disabled={busy || !urlInput.trim()} onClick={connect}>
            {busy ? '확인 중…' : '알림 서버 연결하기'}
          </button>
        </>
      ) : (
        <>
          <div className="sub">알림 서버가 연결돼 있어요. 알림은 기기마다 따로 켜야 해요.</div>
          {!support.ok ? (
            <div className="sub">
              {support.reason === 'ios-install'
                ? '아이폰·아이패드는 홈 화면에 추가한 앱에서만 알림을 켤 수 있어요. 더보기 → 홈 화면에 추가하는 방법을 먼저 해 주세요.'
                : '이 브라우저는 알림을 지원하지 않아요.'}
            </div>
          ) : (
            <>
              <div className="field">
                <span>받을 알림</span>
                <label className="check flat">
                  <input type="checkbox" checked={prefs.message} onChange={(e) => changePref('message', e.target.checked)} />
                  아이의 한마디, 유튜브 요청과 답
                </label>
                <label className="check flat">
                  <input type="checkbox" checked={prefs.pickup} onChange={(e) => changePref('pickup', e.target.checked)} />
                  데리러 갈 사람이 바뀔 때
                </label>
                <label className="check flat">
                  <input type="checkbox" checked={prefs.status} onChange={(e) => changePref('status', e.target.checked)} />
                  가족이 상태를 바꿀 때 (자주 와요)
                </label>
              </div>
              {state?.subscribed ? (
                <>
                  <button className="btn" onClick={() => void turnOff()}>
                    <BellOff size={20} strokeWidth={1.75} aria-hidden />이 기기 알림 끄기
                  </button>
                  <button className="btn" onClick={async () => setMsg(await sendTestPush(settings, code))}>
                    시험 알림 보내기
                  </button>
                </>
              ) : (
                <button className="btn primary" onClick={() => void turnOn(prefs)}>
                  <Bell size={20} strokeWidth={1.75} aria-hidden />이 기기에서 알림 받기
                </button>
              )}
              {state?.permission === 'denied' && <div className="error">알림이 막혀 있어요. 아이폰 설정 → 알림에서 이 앱을 허용해 주세요.</div>}
            </>
          )}
          <button className="btn no" onClick={disconnect}>
            알림 서버 연결 끊기
          </button>
        </>
      )}
      {msg && <div className="sub">{msg}</div>}
    </div>
  );
}
