import { ASK_WHEN_MESSAGE, YOUTUBE_MESSAGE, messageOf } from './constants';
import type { Member, MessageDoc, WithId } from './types';

/** 보드가 열린 뒤에 새로 온 한마디만 골라냅니다. 이미 알린 것(alerted)은 다시 알리지 않습니다. */
export function pickAlerts(
  msgs: WithId<MessageDoc>[],
  o: { since: number; alerted: ReadonlySet<string> },
): WithId<MessageDoc>[] {
  return msgs.filter((m) => m.at > o.since && !o.alerted.has(m.id)).sort((a, b) => a.at - b.at);
}

/** 알림 창에 보일 문구 */
export function alertText(m: MessageDoc, members: Member[]): string {
  const to = m.to ? members.find((x) => x.id === m.to)?.name : undefined;
  if (m.kind === 'note') return m.text ?? '';
  if (m.kind === 'youtube') return YOUTUBE_MESSAGE.label;
  if (m.key === ASK_WHEN_MESSAGE.key) return `${to ? `${to}에게 ` : ''}${ASK_WHEN_MESSAGE.label}`;
  return messageOf(m.key)?.label ?? '';
}
