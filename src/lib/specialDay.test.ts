import { describe, expect, it } from 'vitest';
import type { EventDoc } from './events';
import { placesOf, previewSpecial, specialDayOf, treeSeason, weekStartCheer } from './specialDay';
import type { Member, WithId } from './types';

// 모두 가짜 데이터
const members: Member[] = [
  { id: 'm1', name: '가나', emoji: '', role: 'parent' },
  { id: 'm3', name: '다라', emoji: '', role: 'child' },
  { id: 'm4', name: '마바', emoji: '', role: 'child' },
];
const at = (iso: string) => new Date(`${iso}+09:00`).getTime();
const ev = (title: string, over: Partial<EventDoc> = {}): WithId<EventDoc> => ({ id: title, title, emoji: '📌', date: '2026-03-10', time: '', who: [], pickupBy: '', repeat: 'none', ...over });

describe('특별한 날', () => {
  it('생일: 달력 일정 제목에 "생일"이 있거나 🎂', () => {
    expect(specialDayOf(at('2026-03-10T10:00'), [ev('마바 생일')])).toMatchObject({ kind: 'birthday', text: '마바 생일 축하해요!' });
    expect(specialDayOf(at('2026-03-10T10:00'), [ev('케이크', { emoji: '🎂' })])?.kind).toBe('birthday');
    expect(specialDayOf(at('2026-03-11T10:00'), [ev('마바 생일')])).toBeNull();
  });
  it('매년 반복하는 생일도 해당 날짜에 잡힌다', () => {
    expect(specialDayOf(at('2028-03-10T10:00'), [ev('마바 생일', { repeat: 'yearly' })])?.kind).toBe('birthday');
  });
  it('크리스마스: 12월 한 달, 남은 날 문구', () => {
    expect(specialDayOf(at('2026-11-30T10:00'), [])).toBeNull();
    expect(specialDayOf(at('2026-12-01T10:00'), [])?.text).toBe('크리스마스까지 24일');
    expect(specialDayOf(at('2026-12-21T10:00'), [])?.text).toBe('크리스마스까지 4일');
    expect(specialDayOf(at('2026-12-24T10:00'), [])?.text).toBe('오늘은 크리스마스 이브예요');
    expect(specialDayOf(at('2026-12-25T10:00'), [])?.text).toBe('메리 크리스마스!');
    expect(specialDayOf(at('2026-12-28T10:00'), [])?.text).toBe('즐거운 연말 보내세요');
    expect(specialDayOf(at('2026-12-31T17:59'), [])?.kind).toBe('christmas');
  });
  it('트리는 12월 내내 (새해 문구가 나오는 12/31 저녁에도)', () => {
    expect(treeSeason(at('2026-11-30T23:00'))).toBe(false);
    expect(treeSeason(at('2026-12-01T00:30'))).toBe(true);
    expect(treeSeason(at('2026-12-31T21:00'))).toBe(true);
    expect(treeSeason(at('2027-01-01T09:00'))).toBe(false);
  });
  it('새해: 12/31 저녁 6시부터 1/1', () => {
    expect(specialDayOf(at('2026-12-31T18:00'), [])?.kind).toBe('newyear');
    expect(specialDayOf(at('2027-01-01T09:00'), [])?.text).toBe('새해 복 많이 받으세요!');
  });
  it('어린이날', () => {
    expect(specialDayOf(at('2027-05-05T09:00'), [])?.kind).toBe('kids');
  });
  it('생일이 크리스마스보다 우선', () => {
    expect(specialDayOf(at('2026-12-25T10:00'), [ev('마바 생일', { date: '2026-12-25' })])?.kind).toBe('birthday');
  });
  it('미리보기', () => {
    expect(previewSpecial('christmas').kind).toBe('christmas');
  });
});

describe('일요일 저녁 응원', () => {
  const s = { members, schoolKids: ['m3'], dayPlaces: { m4: '유치원' } };
  it('일요일 오후 3시부터만', () => {
    expect(weekStartCheer(at('2026-11-22T14:59'), s)).toBeNull(); // 일요일 이른 시간
    expect(weekStartCheer(at('2026-11-22T15:00'), s)).not.toBeNull();
    expect(weekStartCheer(at('2026-11-23T18:00'), s)).toBeNull(); // 월요일
    expect(weekStartCheer(at('2026-11-21T18:00'), s)).toBeNull(); // 토요일
  });
  it('아이별 가는 곳을 문구에 넣는다', () => {
    expect(weekStartCheer(at('2026-11-22T18:00'), s)?.detail).toBe('내일은 다라 학교 · 마바 유치원');
  });
  it('가는 곳이 하나도 없으면 인사말만', () => {
    expect(weekStartCheer(at('2026-11-22T18:00'), { members })?.detail).toBe('');
  });
  it('직접 정한 값이 "학교 가는 아이" 기본값보다 우선', () => {
    expect(placesOf({ members, schoolKids: ['m3'], dayPlaces: { m3: '어린이집' } })[0].place).toBe('어린이집');
  });
});
