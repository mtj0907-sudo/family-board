/** 마지막 글자에 받침이 있는지 (한글이 아니면 없음으로 봅니다) */
export function hasFinal(word: string): boolean {
  const last = Array.from(word.trim()).pop();
  if (!last) return false;
  const c = last.charCodeAt(0);
  if (c < 0xac00 || c > 0xd7a3) return false;
  return (c - 0xac00) % 28 !== 0;
}

/** 은/는 */
export const topic = (name: string) => `${name}${hasFinal(name) ? '은' : '는'}`;
/** 이/가 */
export const subject = (name: string) => `${name}${hasFinal(name) ? '이' : '가'}`;
