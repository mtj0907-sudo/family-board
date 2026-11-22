/** 사진 자르기 계산 (화면 없이 계산만) */

export interface Crop {
  /** 확대 배율 (1 = 사각형을 꽉 채우는 가장 작은 크기) */
  zoom: number;
  /** 사각형 중심이 가리키는 사진 위치 (0~1) */
  cx: number;
  cy: number;
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** 보이는 사각형이 사진 밖으로 나가지 않게 중심을 맞춥니다. */
export function fixCrop(c: Crop, w: number, h: number): Crop {
  const side = Math.min(w, h) / c.zoom; // 사진에서 잘라낼 한 변(px)
  return {
    zoom: clamp(c.zoom, 1, 6),
    cx: clamp(c.cx, side / 2 / w, 1 - side / 2 / w),
    cy: clamp(c.cy, side / 2 / h, 1 - side / 2 / h),
  };
}

/** 사진에서 잘라낼 정사각형 (원본 px) */
export function cropSquare(c: Crop, w: number, h: number): { sx: number; sy: number; side: number } {
  const f = fixCrop(c, w, h);
  const side = Math.min(w, h) / f.zoom;
  return { sx: f.cx * w - side / 2, sy: f.cy * h - side / 2, side };
}

/** 긴 변이 max를 넘지 않게 줄인 크기 */
export function fitWithin(w: number, h: number, max: number): { w: number; h: number } {
  const k = Math.min(1, max / Math.max(w, h));
  return { w: Math.round(w * k), h: Math.round(h * k) };
}

async function load(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      /* 아래 방법으로 */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

export interface Loaded {
  source: ImageBitmap | HTMLImageElement;
  w: number;
  h: number;
}
export async function loadPhoto(file: Blob): Promise<Loaded> {
  const source = await load(file);
  const w = 'naturalWidth' in source ? source.naturalWidth : source.width;
  const h = 'naturalHeight' in source ? source.naturalHeight : source.height;
  return { source, w, h };
}

/** 자른 얼굴을 정사각형 JPEG(글자 데이터)로 */
export function renderFace(p: Loaded, c: Crop, size = 256): string {
  const { sx, sy, side } = cropSquare(c, p.w, p.h);
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  cv.getContext('2d')!.drawImage(p.source, sx, sy, side, side, 0, 0, size, size);
  return cv.toDataURL('image/jpeg', 0.8);
}

/** 보드 사진: 긴 변을 줄여서 JPEG로 */
export function renderFit(p: Loaded, max = 1000): string {
  const { w, h } = fitWithin(p.w, p.h, max);
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  cv.getContext('2d')!.drawImage(p.source, 0, 0, w, h);
  return cv.toDataURL('image/jpeg', 0.78);
}
