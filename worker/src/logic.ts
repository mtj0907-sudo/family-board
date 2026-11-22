// 알림 서버의 판단 로직. 외부 라이브러리 없이 순수한 코드만 두어서 앱 쪽 테스트(vitest)로 확인합니다.

export type Category = 'status' | 'message' | 'pickup' | 'test';

export interface NotifyRequest {
  projectId: string;
  apiKey: string;
  code: string;
  /** 앱 주소(https). 푸시 서비스에 알리는 발신자 표시로만 씁니다. */
  appOrigin: string;
  category: Category;
  title: string;
  body: string;
  /** 알림을 일으킨 기기 (그 기기에는 보내지 않음) */
  fromDevice?: string;
  /** category가 test일 때 이 기기에만 보냄 */
  onlyDevice?: string;
}

export interface PushSub {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  memberId: string;
  prefs: { status: boolean; message: boolean; pickup: boolean };
}

const CODE_RE = /^[a-z0-9]{20,64}$/;
const PROJECT_RE = /^[a-z0-9-]{4,63}$/;
const KEY_RE = /^[A-Za-z0-9_-]{20,80}$/;
const DEVICE_RE = /^[A-Za-z0-9_-]{8,64}$/;
const CATEGORIES: Category[] = ['status', 'message', 'pickup', 'test'];

export const clip = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);

export function validateRequest(x: unknown): { ok: true; value: NotifyRequest } | { ok: false; error: string } {
  if (!x || typeof x !== 'object') return { ok: false, error: '요청 형식이 올바르지 않아요' };
  const r = x as Record<string, unknown>;
  const str = (k: string) => (typeof r[k] === 'string' ? (r[k] as string) : '');
  if (!PROJECT_RE.test(str('projectId'))) return { ok: false, error: 'projectId가 올바르지 않아요' };
  if (!KEY_RE.test(str('apiKey'))) return { ok: false, error: 'apiKey가 올바르지 않아요' };
  if (!CODE_RE.test(str('code'))) return { ok: false, error: '가족 코드가 올바르지 않아요' };
  if (!/^https:\/\/[A-Za-z0-9.-]+(:\d+)?$/.test(str('appOrigin'))) return { ok: false, error: 'appOrigin은 https 주소여야 해요' };
  const category = str('category') as Category;
  if (!CATEGORIES.includes(category)) return { ok: false, error: 'category가 올바르지 않아요' };
  const title = clip(str('title').trim(), 60);
  const body = clip(str('body').trim(), 140);
  if (!title) return { ok: false, error: '제목이 비어 있어요' };
  const fromDevice = DEVICE_RE.test(str('fromDevice')) ? str('fromDevice') : undefined;
  const onlyDevice = DEVICE_RE.test(str('onlyDevice')) ? str('onlyDevice') : undefined;
  if (category === 'test' && !onlyDevice) return { ok: false, error: '테스트 알림은 받을 기기가 필요해요' };
  return {
    ok: true,
    value: {
      projectId: str('projectId'),
      apiKey: str('apiKey'),
      code: str('code'),
      appOrigin: str('appOrigin'),
      category,
      title,
      body,
      fromDevice,
      onlyDevice,
    },
  };
}

interface FsField {
  stringValue?: string;
  booleanValue?: boolean;
}
interface FsDoc {
  name?: string;
  fields?: Record<string, FsField>;
}

const fsString = (f?: FsField) => (typeof f?.stringValue === 'string' ? f.stringValue : undefined);
const fsBool = (f: FsField | undefined, fallback: boolean) => (typeof f?.booleanValue === 'boolean' ? f.booleanValue : fallback);

/** 가족 설정 문서에서 알림 키를 꺼냅니다. 없으면 null */
export function parseVapidKeys(doc: FsDoc | null | undefined): { publicKey: string; privateKey: string } | null {
  const publicKey = fsString(doc?.fields?.pushPublic);
  const privateKey = fsString(doc?.fields?.pushPrivate);
  return publicKey && privateKey ? { publicKey, privateKey } : null;
}

/** Firestore REST가 돌려준 push 컬렉션 목록을 기기 목록으로 바꿉니다. 불완전한 문서는 건너뜁니다. */
export function parseSubscriptions(list: { documents?: FsDoc[] } | null | undefined): PushSub[] {
  const out: PushSub[] = [];
  for (const d of list?.documents ?? []) {
    const f = d.fields ?? {};
    const endpoint = fsString(f.endpoint);
    const p256dh = fsString(f.p256dh);
    const auth = fsString(f.auth);
    const id = d.name?.split('/').pop();
    if (!id || !endpoint || !p256dh || !auth || !endpoint.startsWith('https://')) continue;
    out.push({
      id,
      endpoint,
      p256dh,
      auth,
      memberId: fsString(f.memberId) ?? '',
      prefs: {
        status: fsBool(f.prefStatus, false),
        message: fsBool(f.prefMessage, true),
        pickup: fsBool(f.prefPickup, true),
      },
    });
  }
  return out;
}

/** 이번 알림을 받을 기기 */
export function selectTargets(subs: PushSub[], req: Pick<NotifyRequest, 'category' | 'fromDevice' | 'onlyDevice'>): PushSub[] {
  if (req.category === 'test') return subs.filter((s) => s.id === req.onlyDevice);
  const cat: Exclude<Category, 'test'> = req.category;
  return subs.filter((s) => s.id !== req.fromDevice && s.prefs[cat]);
}

/** 푸시로 보낼 내용(JSON). 같은 종류는 하나로 합쳐서 보이도록 tag를 붙입니다. */
export function buildPayload(req: Pick<NotifyRequest, 'category' | 'title' | 'body'>): string {
  return JSON.stringify({ title: req.title, body: req.body, tag: `fb-${req.category}` });
}

/** 만료되어 지워도 되는 응답인지 (404/410) */
export const isGone = (status: number) => status === 404 || status === 410;
