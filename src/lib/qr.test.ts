import { describe, expect, it } from 'vitest';
import { qrDataUri } from './qr';

describe('qrDataUri', () => {
  it('링크를 SVG 이미지 주소로 만든다', async () => {
    const uri = await qrDataUri(`https://example.test/app/#c=${'a'.repeat(28)}`);
    expect(uri.startsWith('data:image/svg+xml;utf8,')).toBe(true);
    const svg = decodeURIComponent(uri.split(',')[1]);
    expect(svg).toContain('<svg');
  });

  it('내용이 다르면 다른 QR이 나온다', async () => {
    expect(await qrDataUri('https://example.test/#c=aaaa')).not.toBe(await qrDataUri('https://example.test/#c=bbbb'));
  });
});
