import { describe, expect, it } from 'vitest';
import type { EventDoc } from './events';
import { tomorrowItems } from './tomorrow';
import type { Member, WithId } from './types';

// 모두 가짜 데이터
const members: Member[] = [
  { id: 'm1', name: '가나', emoji: '', role: 'parent' },
  { id: 'm3', name: '다라', emoji: '', role: 'child' },
];
const ev = (id: string, over: Partial<EventDoc> = {}): WithId<EventDoc> => ({ id, title: id, emoji: '📌', date: '2026-11-23', time: '', who: [], pickupBy: '', repeat: 'none', ...over });

describe('내일 일정', () => {
  it('내일(오늘 다음 날) 것만, 시간 순으로, 종일은 맨 앞', () => {
    const r = tomorrowItems(
      [ev('늦게', { time: '15:30', who: ['m3'] }), ev('오늘', { date: '2026-11-22' }), ev('종일'), ev('일찍', { time: '09:00' })],
      '2026-11-22',
      members,
    );
    expect(r.map((x) => x.id)).toEqual(['종일', '일찍', '늦게']);
    expect(r[0].time).toBe('종일');
    expect(r[2].who).toBe('다라');
  });
  it('가족 전체 일정은 이름이 비어 있다', () => {
    expect(tomorrowItems([ev('a')], '2026-11-22', members)[0].who).toBe('');
  });
  it('반복 일정도 내일에 해당하면 나온다', () => {
    const r = tomorrowItems([ev('매일', { date: '2026-11-01', repeat: 'daily' })], '2026-11-22', members);
    expect(r).toHaveLength(1);
  });
  it('월말 → 다음 달 1일도 맞게 넘어간다', () => {
    expect(tomorrowItems([ev('a', { date: '2026-12-01' })], '2026-11-30', members)).toHaveLength(1);
  });
  it('없으면 빈 목록', () => {
    expect(tomorrowItems([], '2026-11-22', members)).toEqual([]);
  });
});
