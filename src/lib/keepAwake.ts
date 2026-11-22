import NoSleep from 'nosleep.js';
import { useEffect, useRef, useState } from 'react';

/**
 * 화면 켜두기. 1순위는 브라우저 기본 기능(Wake Lock), 안 되면 NoSleep(보이지 않는 짧은 영상) 방식.
 * - 'wakeLock': 기본 기능으로 켜짐 유지
 * - 'nosleep' : 대체 방식으로 켜짐 유지
 * - 'none'    : 켜지 못함 (아이패드 설정에서 자동 잠금을 "안 함"으로 바꿔 주세요)
 */
export type AwakeMethod = 'wakeLock' | 'nosleep' | 'none';

export function createKeepAwake(onChange: (m: AwakeMethod) => void) {
  let sentinel: WakeLockSentinel | null = null;
  let noSleep: NoSleep | null = null;
  let wanted = false;

  async function acquire(): Promise<boolean> {
    try {
      if ('wakeLock' in navigator) {
        const s = await navigator.wakeLock.request('screen');
        sentinel = s;
        s.addEventListener('release', () => {
          if (sentinel === s) sentinel = null;
        });
        onChange('wakeLock');
        return true;
      }
    } catch {
      /* 지원하지 않거나 거부됨 */
    }
    return false;
  }

  async function start() {
    wanted = true;
    if (await acquire()) return;
    try {
      noSleep ??= new NoSleep();
      await noSleep.enable(); // 화면을 직접 누른 뒤에만 성공할 수 있어요
      onChange('nosleep');
    } catch {
      onChange('none');
    }
  }

  function stop() {
    wanted = false;
    void sentinel?.release();
    sentinel = null;
    if (noSleep) void noSleep.disable();
    onChange('none');
  }

  // 화면이 가려졌다가 돌아오면 Wake Lock은 풀리므로 다시 잡습니다.
  function onVisible() {
    if (wanted && !document.hidden && !sentinel && !noSleep?.isEnabled) void acquire();
  }
  document.addEventListener('visibilitychange', onVisible);
  const dispose = () => {
    stop();
    document.removeEventListener('visibilitychange', onVisible);
  };

  return { start, stop, dispose };
}

export function useKeepAwake() {
  const [method, setMethod] = useState<AwakeMethod>('none');
  const ref = useRef<ReturnType<typeof createKeepAwake> | null>(null);
  useEffect(() => {
    const k = createKeepAwake(setMethod);
    ref.current = k;
    void k.start();
    return () => k.dispose();
  }, []);
  return { method, start: () => void ref.current?.start() };
}
