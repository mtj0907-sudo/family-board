import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { petArtFiles, petPoseFiles } from './pet';

describe('public/pets 그림 파일', () => {
  it('목록의 그림이 모두 있다', () => {
    for (const f of petArtFiles()) expect(existsSync(`public/${f}`), f).toBe(true);
  });
  it('자세 그림 144장이 모두 있다', () => {
    const f = petPoseFiles();
    expect(f).toHaveLength(144);
    for (const x of f) expect(existsSync(`public/${x}`), x).toBe(true);
  });
});
