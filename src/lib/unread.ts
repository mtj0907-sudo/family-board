import type { MessageDoc, WithId } from './types';

/**
 * 한마디 탭의 빨간 점을 보여줄지.
 * - 부모: 아직 답하지 않은 유튜브 요청이 있거나, 마지막으로 본 뒤 다른 사람이 보낸 한마디가 있을 때
 * - 아이: 마지막으로 본 뒤 내 유튜브 요청에 답이 달렸을 때
 */
export function hasUnread(
  msgs: WithId<MessageDoc>[],
  o: { meId: string; isParent: boolean; seen: number },
): boolean {
  if (o.isParent) {
    if (msgs.some((m) => m.kind === 'youtube' && !m.reply)) return true;
    return msgs.some((m) => m.at > o.seen && m.from !== o.meId);
  }
  return msgs.some((m) => m.from === o.meId && !!m.reply && m.reply.at > o.seen);
}
