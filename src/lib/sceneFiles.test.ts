import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { KID_SCENE_KEYS, SCENE_KEYS, sceneFile } from './characters';

// 그림 목록과 실제 파일이 어긋나면(파일 누락) 앱에서 간단한 그림이나 빈칸으로 보이므로 미리 잡습니다.
describe('public/scenes 그림 파일', () => {
  it('어른 상태 × (아빠, 엄마)', () => {
    for (const k of SCENE_KEYS) for (const l of ['short', 'long'] as const) expect(existsSync(`public/scenes/${sceneFile(k, l)}.webp`), `${k}-${l}`).toBe(true);
  });
  it('아이 상태 × (남자아이, 여자아이)', () => {
    for (const k of KID_SCENE_KEYS) for (const l of ['boy', 'girl'] as const) expect(existsSync(`public/scenes/${sceneFile(k, l)}.webp`), `${k}-${l}`).toBe(true);
  });
});
