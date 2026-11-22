import { useEffect, useRef, useState } from 'react';
import { cropSquare, fixCrop, loadPhoto, renderFace, type Crop, type Loaded } from '../lib/photo';

const VIEW = 280;

/** 사진에서 얼굴 부분만 동그랗게 잘라 고르는 창. 손가락으로 끌어 옮기고, 막대로 확대해요. */
export function PhotoCropper({ file, onDone, onCancel }: { file: File; onDone: (dataUrl: string) => void; onCancel: () => void }) {
  const [photo, setPhoto] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState(false);
  const [crop, setCrop] = useState<Crop>({ zoom: 1, cx: 0.5, cy: 0.5 });
  const cv = useRef<HTMLCanvasElement>(null);
  const last = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    let alive = true;
    loadPhoto(file)
      .then((p) => {
        if (!alive) return;
        setPhoto(p);
        // 얼굴은 보통 사진 위쪽에 있어서, 세로 사진이면 위쪽 1/3 부근에서 시작합니다.
        setCrop(fixCrop({ zoom: 1, cx: 0.5, cy: p.h > p.w ? 0.35 : 0.5 }, p.w, p.h));
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [file]);

  useEffect(() => {
    const c = cv.current;
    if (!c || !photo) return;
    const { sx, sy, side } = cropSquare(crop, photo.w, photo.h);
    const g = c.getContext('2d')!;
    g.clearRect(0, 0, c.width, c.height);
    g.drawImage(photo.source, sx, sy, side, side, 0, 0, c.width, c.height);
  }, [crop, photo]);

  const move = (e: React.PointerEvent) => {
    if (!last.current || !photo) return;
    const dx = e.clientX - last.current.x;
    const dy = e.clientY - last.current.y;
    last.current = { x: e.clientX, y: e.clientY };
    const side = Math.min(photo.w, photo.h) / crop.zoom;
    const k = side / VIEW;
    setCrop(fixCrop({ ...crop, cx: crop.cx - (dx * k) / photo.w, cy: crop.cy - (dy * k) / photo.h }, photo.w, photo.h));
  };

  return (
    <div className="cropper-wrap" role="dialog" aria-label="얼굴 사진 고르기">
      <div className="cropper">
        <h3>얼굴이 동그라미 안에 오게 맞춰요</h3>
        {failed && <div className="sub">사진을 열지 못했어요. 다른 사진을 골라 주세요.</div>}
        {!failed && !photo && <div className="sub">불러오는 중…</div>}
        {photo && (
          <>
            <canvas
              ref={cv}
              className="crop-view"
              width={VIEW * 2}
              height={VIEW * 2}
              style={{ width: VIEW, height: VIEW }}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                last.current = { x: e.clientX, y: e.clientY };
              }}
              onPointerMove={move}
              onPointerUp={() => (last.current = null)}
              onPointerCancel={() => (last.current = null)}
            />
            <label className="crop-zoom">
              <span className="sub">크게</span>
              <input
                type="range"
                min={1}
                max={6}
                step={0.05}
                value={crop.zoom}
                onChange={(e) => setCrop(fixCrop({ ...crop, zoom: Number(e.target.value) }, photo.w, photo.h))}
                aria-label="확대"
              />
            </label>
          </>
        )}
        <div className="row">
          <button className="btn" onClick={onCancel}>
            취소
          </button>
          <button className="btn primary" disabled={!photo} onClick={() => photo && onDone(renderFace(photo, crop))}>
            이 사진으로
          </button>
        </div>
      </div>
    </div>
  );
}
