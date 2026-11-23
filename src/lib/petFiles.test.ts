import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { petArtFiles } from './pet';

describe('public/pets 그림 파일', () => {
  it('목록의 그림이 모두 있다', () => {
    for (const f of petArtFiles()) expect(existsSync(`public/${f}`), f).toBe(true);
  });
});
