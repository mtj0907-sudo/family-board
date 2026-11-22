import { useEffect, useState } from 'react';
import { qrDataUri } from '../lib/qr';

/** 가족 링크 QR. 다른 아이폰/아이패드의 기본 카메라 앱으로 비추면 바로 연결됩니다. */
export function QrCode({ link }: { link: string }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    let alive = true;
    qrDataUri(link).then((u) => alive && setSrc(u)).catch(() => alive && setSrc(''));
    return () => {
      alive = false;
    };
  }, [link]);

  return (
    <div className="qrbox">
      {src ? <img src={src} alt="가족 연결 QR 코드" width={240} height={240} /> : <div className="sub">QR 만드는 중…</div>}
      <div className="sub">📷 다른 폰의 <b>카메라 앱</b>으로 비추면 바로 연결돼요</div>
    </div>
  );
}
