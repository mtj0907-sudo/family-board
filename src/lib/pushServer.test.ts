import { afterEach, describe, expect, it, vi } from 'vitest';
import worker from '../../worker/src/index';
import { b64uEncode, generateVapidKeys } from '../../worker/src/webpush';

// 가짜 Firestore + 가짜 푸시 서비스로 서버 흐름 전체를 시험합니다. (모두 가짜 값)
const CODE = 'abcdefghjkmnpqrstuvwxyz23456';
const base = {
  projectId: 'demo-project',
  apiKey: 'fakeApiKey_fakeApiKey_1234',
  code: CODE,
  appOrigin: 'https://example.github.io',
  category: 'message',
  title: '가나',
  body: '사랑해요',
  fromDevice: 'dev-sender1',
};

async function fakeBrowser(id: string, over: Record<string, unknown> = {}) {
  const kp = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const p256dh = b64uEncode(new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey)));
  const auth = b64uEncode(crypto.getRandomValues(new Uint8Array(16)));
  return {
    id,
    doc: {
      name: `projects/p/databases/(default)/documents/families/${CODE}/push/${id}`,
      fields: {
        endpoint: { stringValue: `https://push.example.test/${id}` },
        p256dh: { stringValue: p256dh },
        auth: { stringValue: auth },
        memberId: { stringValue: 'm1' },
        prefStatus: { booleanValue: false },
        prefMessage: { booleanValue: true },
        prefPickup: { booleanValue: true },
        ...over,
      },
    },
  };
}

type Call = { url: string; method: string; headers: Record<string, string>; bodyLen: number };

async function setup(opts: { hasKeys?: boolean; pushStatus?: Record<string, number> } = {}) {
  const keys = await generateVapidKeys();
  const devices = [await fakeBrowser('dev-sender1'), await fakeBrowser('dev-other22'), await fakeBrowser('dev-gone333')];
  const calls: Call[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? 'GET';
      const headers = Object.fromEntries(Object.entries((init?.headers ?? {}) as Record<string, string>));
      const body = init?.body as Uint8Array | undefined;
      calls.push({ url, method, headers, bodyLen: body?.length ?? 0 });
      if (url.startsWith('https://firestore.googleapis.com/') && method === 'GET') {
        if (url.includes('/settings/main')) {
          return new Response(
            JSON.stringify({ fields: opts.hasKeys === false ? {} : { pushPublic: { stringValue: keys.publicKey }, pushPrivate: { stringValue: keys.privateKey } } }),
          );
        }
        if (url.includes('/push?')) return new Response(JSON.stringify({ documents: devices.map((d) => d.doc) }));
      }
      if (url.startsWith('https://firestore.googleapis.com/') && method === 'DELETE') return new Response('{}');
      if (url.startsWith('https://push.example.test/')) {
        const id = url.split('/').pop()!;
        return new Response(null, { status: opts.pushStatus?.[id] ?? 201 });
      }
      return new Response('unexpected', { status: 500 });
    }),
  );
  return { calls };
}

const post = (body: unknown) =>
  worker.fetch(new Request('https://worker.example.test/notify', { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }));

afterEach(() => vi.unstubAllGlobals());

describe('알림 서버', () => {
  it('GET은 주소 확인용 한 줄, OPTIONS는 CORS 허용', async () => {
    const g = await worker.fetch(new Request('https://worker.example.test/'));
    expect(await g.text()).toBe('family-board push ok');
    const o = await worker.fetch(new Request('https://worker.example.test/notify', { method: 'OPTIONS' }));
    expect(o.status).toBe(204);
    expect(o.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('보낸 기기를 뺀 나머지에게 암호화해서 보내고, 만료된 기기는 목록에서 지운다', async () => {
    const { calls } = await setup({ pushStatus: { 'dev-gone333': 410 } });
    const res = await post(base);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ sent: 1, failed: 0, removed: 1, targets: 2 });

    const pushes = calls.filter((c) => c.url.startsWith('https://push.example.test/'));
    expect(pushes.map((c) => c.url).sort()).toEqual(['https://push.example.test/dev-gone333', 'https://push.example.test/dev-other22']);
    for (const p of pushes) {
      expect(p.method).toBe('POST');
      expect(p.headers['Content-Encoding']).toBe('aes128gcm');
      expect(p.headers.Authorization).toMatch(/^vapid t=.+, k=.+$/);
      expect(p.bodyLen).toBeGreaterThan(86);
    }
    // 보낸 기기에는 보내지 않는다
    expect(pushes.some((c) => c.url.endsWith('dev-sender1'))).toBe(false);
    // 만료된 기기는 Firestore에서 삭제 요청
    const del = calls.find((c) => c.method === 'DELETE');
    expect(del?.url).toContain(`/families/${CODE}/push/dev-gone333`);
  });

  it('가족 코드 아래 경로만 읽는다', async () => {
    const { calls } = await setup();
    await post(base);
    for (const c of calls.filter((x) => x.url.startsWith('https://firestore.googleapis.com/'))) {
      expect(c.url).toContain(`/documents/families/${CODE}/`);
    }
  });

  it('알림 키가 없으면 409, 잘못된 요청은 400, 없는 주소는 404', async () => {
    await setup({ hasKeys: false });
    expect((await post(base)).status).toBe(409);
    expect((await post({ ...base, code: 'short' })).status).toBe(400);
    const bad = await worker.fetch(new Request('https://worker.example.test/notify', { method: 'POST', body: 'not json' }));
    expect(bad.status).toBe(400);
    const nf = await worker.fetch(new Request('https://worker.example.test/other', { method: 'POST', body: '{}' }));
    expect(nf.status).toBe(404);
  });

  it('테스트 알림은 지정한 기기에만', async () => {
    const { calls } = await setup();
    const res = await post({ ...base, category: 'test', onlyDevice: 'dev-sender1', fromDevice: undefined });
    expect(await res.json()).toMatchObject({ sent: 1, targets: 1 });
    expect(calls.filter((c) => c.url.startsWith('https://push.example.test/')).map((c) => c.url)).toEqual(['https://push.example.test/dev-sender1']);
  });
});
