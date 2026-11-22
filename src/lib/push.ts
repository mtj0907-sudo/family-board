import { firebasePublic } from '../firebase';
import { b64uDecode, b64uEncode } from '../../worker/src/webpush';
import { deletePushDevice, savePushDevice } from './db';
import { store } from './storage';
import type { FamilySettings } from './types';

const DEVICE_KEY = 'fb.device';
const PREFS_KEY = 'fb.pushPrefs';

export interface PushPrefs {
  status: boolean;
  message: boolean;
  pickup: boolean;
}
export const DEFAULT_PREFS: PushPrefs = { status: false, message: true, pickup: true };

/** 이 기기를 구분하는 번호 (알림을 일으킨 기기에는 알림을 보내지 않기 위해) */
export function getDeviceId(): string {
  let id = store.get(DEVICE_KEY);
  if (!id) {
    id = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, '0')).join('');
    store.set(DEVICE_KEY, id);
  }
  return id;
}

export function getPrefs(): PushPrefs {
  try {
    return { ...DEFAULT_PREFS, ...(JSON.parse(store.get(PREFS_KEY) ?? '{}') as Partial<PushPrefs>) };
  } catch {
    return DEFAULT_PREFS;
  }
}
export const setPrefs = (p: PushPrefs) => store.set(PREFS_KEY, JSON.stringify(p));

export type PushSupport = { ok: true } | { ok: false; reason: 'ios-install' | 'unsupported' };

/** 이 기기/브라우저에서 알림을 켤 수 있는지. 아이폰은 "홈 화면에 추가"한 앱에서만 가능합니다. */
export function pushSupport(): PushSupport {
  if ('serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window) return { ok: true };
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return { ok: false, reason: ios ? 'ios-install' : 'unsupported' };
}

export async function getPushState(): Promise<{ permission: NotificationPermission; subscribed: boolean }> {
  if (!pushSupport().ok) return { permission: 'default', subscribed: false };
  try {
    const reg = await navigator.serviceWorker.ready;
    return { permission: Notification.permission, subscribed: !!(await reg.pushManager.getSubscription()) };
  } catch {
    return { permission: Notification.permission, subscribed: false };
  }
}

/** 이 기기에서 알림 켜기. 반드시 버튼을 누른 직후에 불러야 합니다(iOS 규칙). */
export async function enablePush(o: { code: string; memberId: string; vapidPublic: string; prefs: PushPrefs }): Promise<void> {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('denied');
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  // 알림 키가 바뀌었다면 예전 구독은 못 쓰므로 새로 만듭니다.
  if (sub && sub.options.applicationServerKey && b64uEncode(new Uint8Array(sub.options.applicationServerKey)) !== o.vapidPublic) {
    await sub.unsubscribe();
    sub = null;
  }
  sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64uDecode(o.vapidPublic) });
  const j = sub.toJSON();
  if (!j.endpoint || !j.keys?.p256dh || !j.keys.auth) throw new Error('subscription');
  await savePushDevice(o.code, getDeviceId(), {
    endpoint: j.endpoint,
    p256dh: j.keys.p256dh,
    auth: j.keys.auth,
    memberId: o.memberId,
    prefStatus: o.prefs.status,
    prefMessage: o.prefs.message,
    prefPickup: o.prefs.pickup,
  });
  setPrefs(o.prefs);
}

export async function disablePush(code: string): Promise<void> {
  try {
    const reg = await navigator.serviceWorker.ready;
    await (await reg.pushManager.getSubscription())?.unsubscribe();
  } catch {
    /* 이미 꺼져 있음 */
  }
  await deletePushDevice(code, getDeviceId());
}

/** 서버 주소 정리: https만, 끝의 / 제거. 못 쓰는 주소면 null */
export function normalizePushUrl(input: string): string | null {
  try {
    const u = new URL(input.trim());
    if (u.protocol !== 'https:') return null;
    return `${u.origin}`;
  } catch {
    return null;
  }
}

/** 주소가 우리 알림 서버가 맞는지 한 번 불러서 확인 */
export async function checkPushServer(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'GET' });
    return res.ok && (await res.text()).trim() === 'family-board push ok';
  } catch {
    return false;
  }
}

interface NotifyEvent {
  category: 'status' | 'message' | 'pickup';
  title: string;
  body: string;
}

function request(settings: FamilySettings, code: string, extra: Record<string, unknown>) {
  if (!settings.pushUrl || !settings.pushPublic || !firebasePublic) return null;
  return fetch(`${settings.pushUrl}/notify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...firebasePublic, code, appOrigin: location.origin, fromDevice: getDeviceId(), ...extra }),
    keepalive: true,
  });
}

/** 가족에게 알림 보내기. 실패해도 앱 동작에는 영향이 없도록 조용히 넘어갑니다. */
export function notifyFamily(settings: FamilySettings, code: string, ev: NotifyEvent): void {
  void request(settings, code, { ...ev })?.catch(() => {});
}

/** 이 기기로 시험 알림을 보냅니다. 결과 문구를 돌려줍니다. */
export async function sendTestPush(settings: FamilySettings, code: string): Promise<string> {
  try {
    const res = await request(settings, code, { category: 'test', title: '우리집 보드', body: '알림이 잘 와요', onlyDevice: getDeviceId() });
    if (!res) return '알림 서버가 아직 연결되지 않았어요';
    const j = (await res.json()) as { sent?: number; failed?: number; targets?: number; error?: string };
    if (!res.ok) return j.error ?? `서버 오류 (${res.status})`;
    if (!j.targets) return '이 기기가 아직 등록되지 않았어요. "이 기기에서 알림 받기"를 먼저 눌러 주세요';
    return j.sent ? '시험 알림을 보냈어요. 잠시 뒤 도착해요' : '보냈지만 전달되지 않았어요. 알림을 껐다가 다시 켜 보세요';
  } catch {
    return '알림 서버에 연결하지 못했어요';
  }
}
