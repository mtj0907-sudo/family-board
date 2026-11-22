import QRCode from 'qrcode';

/** 텍스트(가족 링크)를 QR 코드 SVG 이미지 주소(data URI)로 바꿉니다. 인터넷 없이 기기 안에서 만들어요. */
export async function qrDataUri(text: string): Promise<string> {
  const svg = await QRCode.toString(text, {
    type: 'svg',
    margin: 2,
    errorCorrectionLevel: 'M',
    color: { dark: '#2b2b2b', light: '#ffffff' },
  });
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
