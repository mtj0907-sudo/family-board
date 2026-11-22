import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';

/**
 * 화면 전체를 덮는 창(아래에서 올라오는 창 등)을 문서 맨 바깥에 그립니다.
 * 스크롤되는 영역 안에 그리면 아이폰에서 아래 막대 뒤로 잘려 보일 수 있어요.
 */
export function Portal({ children }: { children: ReactNode }) {
  return createPortal(children, document.body);
}
