import { describe, expect, it } from 'vitest';
import { cropSquare, fitWithin, fixCrop } from './photo';

describe('사진 자르기 계산', () => {
  it('배율 1이면 짧은 변만큼의 정사각형', () => {
    const r = cropSquare({ zoom: 1, cx: 0.5, cy: 0.5 }, 1000, 2000);
    expect(r.side).toBe(1000);
    expect(r.sx).toBe(0);
    expect(r.sy).toBe(500);
  });
  it('확대하면 한 변이 줄어든다', () => {
    expect(cropSquare({ zoom: 4, cx: 0.5, cy: 0.5 }, 1000, 2000).side).toBe(250);
  });
  it('사진 밖으로 나가지 않게 중심을 맞춘다', () => {
    const r = cropSquare({ zoom: 2, cx: 0, cy: 1 }, 1000, 2000);
    expect(r.sx).toBe(0);
    expect(r.sy + r.side).toBe(2000);
  });
  it('배율은 1~6 사이', () => {
    expect(fixCrop({ zoom: 0.2, cx: 0.5, cy: 0.5 }, 100, 100).zoom).toBe(1);
    expect(fixCrop({ zoom: 99, cx: 0.5, cy: 0.5 }, 100, 100).zoom).toBe(6);
  });
  it('긴 변을 줄이되 키우지는 않는다', () => {
    expect(fitWithin(4000, 2000, 1000)).toEqual({ w: 1000, h: 500 });
    expect(fitWithin(400, 300, 1000)).toEqual({ w: 400, h: 300 });
  });
});
