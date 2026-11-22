import { statusInfo } from './constants';
import { alertText } from './boardAlert';
import type { Member, MessageDoc, StatusDoc, WithId } from './types';

export interface LiveAlert {
  /** 한 번 알린 것을 기억하는 값 */
  id: string;
  who: string;
  text: string;
  /** 눌렀을 때 열 탭 */
  tab: 'message' | 'status';
}

/**
 * 앱을 열어 둔 동안 위에 띄울 알림을 고릅니다.
 * - 부모: 다른 사람이 보낸 한마디(나에게 온 것 또는 모두에게), 다른 사람의 상태 변경
 * - 아이: 내가 보낸 유튜브 요청에 답이 달렸을 때
 * `since`(앱을 연 시각) 이후의 것만, 이미 알린 것(alerted)은 빼고, 오래된 순으로 돌려줍니다.
 */
export function pickLiveAlerts(o: {
  msgs: WithId<MessageDoc>[];
  statuses: WithId<StatusDoc>[];
  members: Member[];
  meId: string;
  isParent: boolean;
  since: number;
  alerted: ReadonlySet<string>;
}): (LiveAlert & { at: number })[] {
  const nameOf = (id: string) => o.members.find((m) => m.id === id)?.name ?? '';
  const out: (LiveAlert & { at: number })[] = [];

  for (const m of o.msgs) {
    if (o.isParent) {
      const id = `m:${m.id}`;
      if (m.at <= o.since || o.alerted.has(id) || m.from === o.meId) continue;
      if (m.to && m.to !== o.meId) continue;
      out.push({ id, at: m.at, who: nameOf(m.from), text: alertText(m, o.members), tab: 'message' });
    } else if (m.from === o.meId && m.reply && m.reply.at > o.since) {
      const id = `r:${m.id}`;
      if (o.alerted.has(id)) continue;
      out.push({ id, at: m.reply.at, who: nameOf(m.reply.by), text: '유튜브 답이 왔어요', tab: 'message' });
    }
  }

  if (o.isParent) {
    for (const s of o.statuses) {
      const id = `s:${s.id}:${s.since}`;
      if (s.id === o.meId || s.since <= o.since || o.alerted.has(id)) continue;
      const info = statusInfo(s);
      if (!info) continue;
      out.push({ id, at: s.since, who: nameOf(s.id), text: info.label, tab: 'status' });
    }
  }

  return out.sort((a, b) => a.at - b.at);
}
