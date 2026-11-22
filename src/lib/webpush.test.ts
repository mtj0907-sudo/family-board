import { describe, expect, it } from 'vitest';
import {
  b64uDecode,
  b64uEncode,
  buildPushRequest,
  encryptAes128gcm,
  generateVapidKeys,
  vapidAuthorization,
} from '../../worker/src/webpush';

const dec = new TextDecoder();
const enc = new TextEncoder();

describe('base64url', () => {
  it('왕복', () => {
    const bytes = Uint8Array.from([0, 250, 251, 252, 253, 254, 255, 1, 2, 3]);
    expect(b64uDecode(b64uEncode(bytes))).toEqual(bytes);
    expect(b64uEncode(bytes)).not.toMatch(/[+/=]/);
  });
});

// ── RFC 8291 부록 A 의 공식 시험 값 (표준 문서에 실린 값으로 우리 암호화가 맞는지 확인)
describe('RFC 8291 시험 값', () => {
  const plaintext = 'When I grow up, I want to be a watermelon';
  const asPrivate = 'yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw';
  const asPublic = 'BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8';
  const uaPublic = 'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4';
  const authSecret = 'BTBZMqHH6r4Tts7J_aSIgg';
  const salt = 'DGv6ra1nlYgDCS1FRnbzlw';
  // 표준 문서는 헤더(86바이트)와 암호문 본체를 따로 싣고 있어서 따로 비교합니다.
  // (86은 3의 배수가 아니라서, 둘을 이은 base64 글자는 두 글자를 그냥 이어 붙인 것과 다릅니다.)
  const expectedHeader =
    'DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8';
  const expectedCiphertext = '8pfeW0KbunFT06SuDKoJH9Ql87S1QUrdirN6GcG7sFz1y1sqLgVi1VhjVkHsUoEsbI_0LpXMuGvnzQ';

  it('고정한 키와 salt로 만든 헤더와 암호문이 표준 문서의 값과 정확히 같다', async () => {
    const out = await encryptAes128gcm(enc.encode(plaintext), uaPublic, authSecret, {
      salt: b64uDecode(salt),
      sender: { privateKey: asPrivate, publicKey: asPublic },
    });
    expect(b64uEncode(out.slice(0, 86))).toBe(expectedHeader);
    expect(b64uEncode(out.slice(86))).toBe(expectedCiphertext);
  });
});

// ── 받는 쪽(브라우저)이 하는 복호화를 시험용으로 직접 구현해서, 우리가 만든 암호문이 풀리는지 확인
async function decryptAsBrowser(body: Uint8Array, uaPrivateJwk: JsonWebKey, uaPublicRaw: Uint8Array, authSecret: Uint8Array): Promise<string> {
  const salt = body.slice(0, 16);
  const idlen = body[20];
  const asPublic = body.slice(21, 21 + idlen);
  const cipher = body.slice(21 + idlen);
  const priv = await crypto.subtle.importKey('jwk', uaPrivateJwk, { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']);
  const asKey = await crypto.subtle.importKey('raw', asPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: asKey }, priv, 256));
  const cat = (...a: Uint8Array[]) => Uint8Array.from(a.flatMap((x) => Array.from(x)));
  const hk = async (s: Uint8Array, ikm: Uint8Array, info: Uint8Array, n: number) =>
    new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: s as BufferSource, info: info as BufferSource }, await crypto.subtle.importKey('raw', ikm as BufferSource, 'HKDF', false, ['deriveBits']), n * 8));
  const ikm = await hk(authSecret, ecdh, cat(enc.encode('WebPush: info\0'), uaPublicRaw, asPublic), 32);
  const cek = await hk(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hk(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);
  const plain = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt']), cipher));
  let end = plain.length;
  while (end > 0 && plain[end - 1] === 0) end--;
  expect(plain[end - 1]).toBe(2); // 마지막 레코드 구분자
  return dec.decode(plain.slice(0, end - 1));
}

describe('buildPushRequest', () => {
  it('브라우저가 암호문을 풀 수 있고, VAPID 서명이 맞다', async () => {
    // 가짜 "브라우저 구독" 만들기
    const ua = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
    const uaPublicRaw = new Uint8Array(await crypto.subtle.exportKey('raw', ua.publicKey));
    const uaJwk = await crypto.subtle.exportKey('jwk', ua.privateKey);
    const authSecret = crypto.getRandomValues(new Uint8Array(16));
    const vapid = await generateVapidKeys();
    const message = JSON.stringify({ title: '가나', body: '사랑해요', tag: 'fb-message' });

    const req = await buildPushRequest(
      { endpoint: 'https://push.example.test/send/abc', p256dh: b64uEncode(uaPublicRaw), auth: b64uEncode(authSecret) },
      message,
      { subject: 'https://example.github.io', ...vapid },
      { ttl: 600 },
    );

    expect(req.method).toBe('POST');
    expect(req.headers['Content-Encoding']).toBe('aes128gcm');
    expect(req.headers.TTL).toBe('600');
    expect(req.headers['Content-Length']).toBe(String(req.body.length));
    expect(await decryptAsBrowser(req.body, uaJwk, uaPublicRaw, authSecret)).toBe(message);

    // VAPID: "vapid t=<jwt>, k=<공개키>" 이고, 서명이 공개키로 확인된다
    const m = req.headers.Authorization.match(/^vapid t=([^,]+), k=(.+)$/);
    expect(m).not.toBeNull();
    const [h, c, s] = m![1].split('.');
    expect(JSON.parse(dec.decode(b64uDecode(h)))).toEqual({ typ: 'JWT', alg: 'ES256' });
    const claims = JSON.parse(dec.decode(b64uDecode(c)));
    expect(claims.aud).toBe('https://push.example.test');
    expect(claims.sub).toBe('https://example.github.io');
    expect(claims.exp - Math.floor(Date.now() / 1000)).toBeLessThanOrEqual(24 * 3600);
    expect(m![2]).toBe(vapid.publicKey);
    const pub = await crypto.subtle.importKey('raw', b64uDecode(vapid.publicKey), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    expect(await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, pub, b64uDecode(s), enc.encode(`${h}.${c}`))).toBe(true);
  });

  it('같은 내용도 매번 다르게 암호화된다', async () => {
    const ua = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
    const t = { endpoint: 'https://e.example.test/x', p256dh: b64uEncode(new Uint8Array(await crypto.subtle.exportKey('raw', ua.publicKey))), auth: b64uEncode(crypto.getRandomValues(new Uint8Array(16))) };
    const v = { subject: 'https://example.github.io', ...(await generateVapidKeys()) };
    const a = await buildPushRequest(t, 'hello', v);
    const b = await buildPushRequest(t, 'hello', v);
    expect(b64uEncode(a.body)).not.toBe(b64uEncode(b.body));
  });
});

describe('generateVapidKeys / vapidAuthorization', () => {
  it('공개키는 65바이트, 개인키는 32바이트', async () => {
    const k = await generateVapidKeys();
    expect(b64uDecode(k.publicKey)).toHaveLength(65);
    expect(b64uDecode(k.publicKey)[0]).toBe(4);
    expect(b64uDecode(k.privateKey)).toHaveLength(32);
    const a = await vapidAuthorization('https://web.push.example.test/abc', 'https://example.github.io', k.publicKey, k.privateKey, 1000);
    expect(a.startsWith('vapid t=')).toBe(true);
  });
});
