import { useFamily } from '../FamilyContext';
import { repeatLabel, type EventDoc } from '../lib/events';
import type { Member, WithId } from '../lib/types';

interface Props {
  ev: WithId<EventDoc>;
  /** 누르면 수정 (부모만 전달) */
  onClick?: () => void;
  /** 특정 구성원 카드 안에서 보일 때: 그 사람 기준으로 데리러 문구를 바꿉니다 */
  forMember?: Member;
}

export function EventRow({ ev, onClick, forMember }: Props) {
  const { members } = useFamily();
  const nameOf = (id: string) => members.find((m) => m.id === id);
  const pickup = ev.pickupBy ? nameOf(ev.pickupBy) : undefined;
  const who = ev.who.map(nameOf).filter((m): m is Member => !!m);

  let pickupText = '';
  if (pickup) {
    if (forMember && forMember.id === pickup.id) {
      const kids = who.filter((w) => w.id !== pickup.id).map((w) => w.name);
      pickupText = `🚗 ${kids.length ? kids.join('·') + ' ' : ''}데리러 가기`;
    } else {
      pickupText = `🚗 ${pickup.emoji} ${pickup.name}가 데리러 가요`;
    }
  }

  const body = (
    <>
      <span className="ev-time">{ev.time || '하루 종일'}</span>
      <span className="big-emoji">{ev.emoji}</span>
      <span className="grow left">
        <b>{ev.title}</b>
        {!forMember && who.length > 0 && <span className="sub"> {who.map((w) => w.emoji).join(' ')}</span>}
        {pickupText && <div className="pickup">{pickupText}</div>}
        {ev.repeat !== 'none' && <div className="sub">🔁 {repeatLabel(ev.repeat)}</div>}
      </span>
    </>
  );

  return onClick ? (
    <button className="eventrow" onClick={onClick}>
      {body}
    </button>
  ) : (
    <div className="eventrow">{body}</div>
  );
}
