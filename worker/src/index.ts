// 가족 알림 서버 (Cloudflare Workers 무료 플랜).
// - 저장하는 데이터도, 따로 넣는 비밀값도 없습니다.
// - 요청이 오면 Firestore에서 "가족 코드" 아래의 알림 키와 알림 받는 기기 목록을 읽어서 푸시를 보냅니다.
// - 가족 코드를 모르면 아무것도 읽을 수 없습니다. (Firestore 보안 규칙과 같은 기준)
import { buildPayload, isGone, parseSubscriptions, parseVapidKeys, selectTargets, validateRequest, type NotifyRequest } from './logic';
import { buildPushRequest } from './webpush';

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8' } });

const familyUrl = (r: NotifyRequest) =>
  `https://firestore.googleapis.com/v1/projects/${r.projectId}/databases/(default)/documents/families/${r.code}`;
const keyParam = (r: NotifyRequest) => `key=${encodeURIComponent(r.apiKey)}`;

async function fsGet(url: string): Promise<any | null> {
  const res = await fetch(url);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Firestore 응답 ${res.status}`);
  return res.json();
}

export default {
  async fetch(req: Request): Promise<Response> {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    const url = new URL(req.url);

    // 주소가 맞는지 확인하는 용도 (앱 설정에서 "서버 연결"할 때 한 번 불러 봅니다)
    if (req.method === 'GET') {
      return new Response('family-board push ok', { headers: { ...CORS, 'Content-Type': 'text/plain; charset=utf-8' } });
    }
    if (req.method !== 'POST' || url.pathname !== '/notify') return json({ error: '찾을 수 없어요' }, 404);

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return json({ error: 'JSON 형식이 아니에요' }, 400);
    }
    const v = validateRequest(body);
    if (!v.ok) return json({ error: v.error }, 400);
    const r = v.value;

    try {
      const keys = parseVapidKeys(await fsGet(`${familyUrl(r)}/settings/main?${keyParam(r)}`));
      if (!keys) return json({ error: '이 가족에 알림 키가 아직 없어요' }, 409);

      const list = await fsGet(`${familyUrl(r)}/push?${keyParam(r)}&pageSize=100`);
      const targets = selectTargets(parseSubscriptions(list), r);
      const message = buildPayload(r);
      const vapid = { subject: r.appOrigin, publicKey: keys.publicKey, privateKey: keys.privateKey };

      let sent = 0;
      let failed = 0;
      let removed = 0;
      await Promise.all(
        targets.map(async (t) => {
          try {
            const push = await buildPushRequest(t, message, vapid, { ttl: 3600, urgency: 'high' });
            const res = await fetch(t.endpoint, { method: push.method, headers: push.headers, body: push.body });
            if (res.ok) sent++;
            else if (isGone(res.status)) {
              // 앱을 지웠거나 알림을 끈 기기: 목록에서 정리
              removed++;
              await fetch(`${familyUrl(r)}/push/${encodeURIComponent(t.id)}?${keyParam(r)}`, { method: 'DELETE' });
            } else failed++;
          } catch {
            failed++;
          }
        }),
      );
      return json({ sent, failed, removed, targets: targets.length });
    } catch (e) {
      return json({ error: e instanceof Error ? e.message : '알 수 없는 오류' }, 502);
    }
  },
};
