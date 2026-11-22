import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

const MIN_ZOOM = 0.78;

/**
 * 화면(스크롤 영역) 안에 내용이 다 들어오도록 통째로 살짝 줄입니다.
 * 폰마다 높이가 달라서(상태 표시줄·아래 막대 크기까지) 미리 딱 맞게 정할 수 없기 때문이에요.
 * 너무 작아지지 않게 78%까지만 줄이고, 그래도 안 들어오면 스크롤됩니다.
 */
export function useFitZoom() {
  const el = useRef<HTMLDivElement | null>(null);

  const fit = useCallback(() => {
    const node = el.current;
    const box = node?.parentElement;
    if (!node || !box) return;
    (node.style as CSSStyleDeclaration & { zoom: string }).zoom = '1';
    const need = node.scrollHeight;
    const have = box.clientHeight;
    const z = need > have ? Math.max(MIN_ZOOM, have / need) : 1;
    (node.style as CSSStyleDeclaration & { zoom: string }).zoom = String(Math.round(z * 1000) / 1000);
  }, []);

  // 내용이 바뀔 때마다(렌더 때마다) 다시 재서 맞춥니다.
  useLayoutEffect(fit);

  useEffect(() => {
    const box = el.current?.parentElement;
    window.addEventListener('resize', fit);
    window.addEventListener('orientationchange', fit);
    const ro = box && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
    if (box) ro?.observe(box);
    void document.fonts?.ready.then(fit);
    return () => {
      window.removeEventListener('resize', fit);
      window.removeEventListener('orientationchange', fit);
      ro?.disconnect();
    };
  }, [fit]);

  return useCallback((node: HTMLDivElement | null) => {
    el.current = node;
  }, []);
}
