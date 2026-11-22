import { House } from 'lucide-react';
import { etaProgress, formatClockKo, formatLeftKo } from '../lib/time';
import type { Member } from '../lib/types';
import type { Eta } from '../lib/whenHome';
import { Avatar } from './Avatar';

/**
 * 도착 시각을 카드의 주인공으로: 말로 읽는 도착 시각, 집을 향해 움직이는 아바타, 남은 시간.
 * 5세도 "얼마나 왔는지"를 길 위의 위치로 알 수 있습니다.
 */
export function EtaTrack({ member, eta, now, big = false }: { member: Member; eta: Eta; now: number; big?: boolean }) {
  const ratio = etaProgress(eta.from, eta.at, now);
  return (
    <div className={big ? 'etatrack big' : 'etatrack'}>
      <div className="et-head">
        <div className="et-when">
          {formatClockKo(eta.at)}
          {eta.estimated ? '쯤' : ''} 도착
        </div>
        <div className="et-left">{formatLeftKo(eta.at - now)}</div>
      </div>
      <div className="et-road">
        <div className="et-line">
          <div className="et-fill" style={{ width: `${ratio * 100}%` }} />
          <span className="et-me" style={{ left: `${ratio * 100}%` }}>
            <Avatar member={member} size={big ? 28 : 26} />
          </span>
        </div>
        <House size={big ? 24 : 22} strokeWidth={1.75} className="et-home" aria-hidden />
      </div>
    </div>
  );
}
