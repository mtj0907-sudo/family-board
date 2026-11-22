// 웹 푸시 보내기 (RFC 8291 aes128gcm 암호화 + RFC 8292 VAPID). 브라우저/워커/Node의 WebCrypto만 씁니다.
// 알림 서버(Cloudflare Workers)와 앱(알림 키 만들기)이 같이 씁니다.

const enc = new TextEncoder();

export function b64uEncode(bytes: Uint8Array): string {
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function b64uDecode(s: string): Uint8Array<ArrayBuffer> {
  const b = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b + '='.repeat((4 - (b.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

const concat = (...parts: Uint8Array[]): Uint8Array<ArrayBuffer> => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
};

type Bytes = Uint8Array<ArrayBuffer>;

async function hkdf(salt: Bytes, ikm: Bytes, info: Bytes, length: number): Promise<Bytes> {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, length * 8));
}

const jwkFor = (privateKey: string, publicRaw: Bytes) => ({
  kty: 'EC',
  crv: 'P-256',
  d: privateKey,
  x: b64uEncode(publicRaw.slice(1, 33)),
  y: b64uEncode(publicRaw.slice(33, 65)),
  ext: true,
});

/** 알림 키 한 쌍을 만듭니다. publicKey(65바이트)와 privateKey(32바이트)는 base64url 글자. */
export async function generateVapidKeys(): Promise<{ publicKey: string; privateKey: string }> {
  const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const publicRaw = new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey));
  const jwk = await crypto.subtle.exportKey('jwk', kp.privateKey);
  return { publicKey: b64uEncode(publicRaw), privateKey: jwk.d as string };
}

export interface EncryptOptions {
  /** 시험용: 16바이트 salt를 고정 */
  salt?: Bytes;
  /** 시험용: 보내는 쪽 임시 키를 고정 */
  sender?: { privateKey: string; publicKey: string };
}

/** RFC 8291: 받는 브라우저의 공개키(p256dh)와 auth 값으로 메시지를 암호화합니다. */
export async function encryptAes128gcm(
  plaintext: Uint8Array,
  p256dh: string,
  auth: string,
  opts: EncryptOptions = {},
): Promise<Uint8Array<ArrayBuffer>> {
  const uaPublic = b64uDecode(p256dh);
  const authSecret = b64uDecode(auth);
  const salt = opts.salt ?? crypto.getRandomValues(new Uint8Array(16));

  let senderPrivate: CryptoKey;
  let asPublic: Bytes;
  if (opts.sender) {
    asPublic = b64uDecode(opts.sender.publicKey);
    senderPrivate = await crypto.subtle.importKey('jwk', jwkFor(opts.sender.privateKey, asPublic), { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']);
  } else {
    const kp = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
    senderPrivate = kp.privateKey;
    asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey));
  }

  const uaKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, senderPrivate, 256));

  const keyInfo = concat(enc.encode('WebPush: info\0'), uaPublic, asPublic);
  const ikm = await hkdf(authSecret, ecdh, keyInfo, 32);
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);

  const aesKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  // 마지막(그리고 유일한) 레코드이므로 끝에 구분자 0x02를 붙입니다.
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, concat(plaintext, new Uint8Array([2]))));

  const header = new Uint8Array(21 + asPublic.length);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, 4096); // record size
  header[20] = asPublic.length; // key id 길이
  header.set(asPublic, 21);
  return concat(header, cipher);
}

/** RFC 8292: VAPID 인증 헤더 값 */
export async function vapidAuthorization(
  endpoint: string,
  subject: string,
  publicKey: string,
  privateKey: string,
  nowSec = Math.floor(Date.now() / 1000),
): Promise<string> {
  const header = { typ: 'JWT', alg: 'ES256' };
  const claims = { aud: new URL(endpoint).origin, exp: nowSec + 12 * 3600, sub: subject };
  const input = `${b64uEncode(enc.encode(JSON.stringify(header)))}.${b64uEncode(enc.encode(JSON.stringify(claims)))}`;
  const key = await crypto.subtle.importKey('jwk', jwkFor(privateKey, b64uDecode(publicKey)), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(input)));
  return `vapid t=${input}.${b64uEncode(sig)}, k=${publicKey}`;
}

export interface PushTarget {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** 푸시 서비스(애플·구글 등)로 보낼 요청을 만듭니다. */
export async function buildPushRequest(
  target: PushTarget,
  message: string,
  vapid: { subject: string; publicKey: string; privateKey: string },
  opts: { ttl?: number; urgency?: 'low' | 'normal' | 'high' } = {},
): Promise<{ method: 'POST'; headers: Record<string, string>; body: Uint8Array<ArrayBuffer> }> {
  const body = await encryptAes128gcm(enc.encode(message), target.p256dh, target.auth);
  return {
    method: 'POST',
    headers: {
      Authorization: await vapidAuthorization(target.endpoint, vapid.subject, vapid.publicKey, vapid.privateKey),
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      'Content-Length': String(body.length),
      TTL: String(opts.ttl ?? 3600),
      Urgency: opts.urgency ?? 'high',
    },
    body,
  };
}
