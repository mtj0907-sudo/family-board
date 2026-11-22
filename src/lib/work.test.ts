import { describe, expect, it } from 'vitest';
import { codeOnDate, parseWork, workEndAt, workEndText, workKind, workLabel } from './work';

// 모두 가짜 데이터
const ok = (raw: string) => {
  const r = parseWork(raw);
  if (!r.ok) throw new Error(r.error);
  return r.value;
};

describe('parseWork', () => {
  it('기본 형식', () => {
    const v = ok('2030-02|1=M12,2=휴,3=N,4=D');
    expect(v.ym).toBe('2030-02');
    expect(v.days).toMatchObject({ '1': 'M12', '2': '휴', '3': 'N', '4': 'D' });
  });

  it('공백·줄바꿈이 어디에 있어도 읽는다', () => {
    const v = ok(' 2030-02 | 1 = M12 ,\n2=휴 ,\n\n 3=N\n,4 =D ');
    expect(v.days).toMatchObject({ '1': 'M12', '2': '휴', '3': 'N', '4': 'D' });
  });

  it('쉼표가 빠져도(공백/줄바꿈만으로 구분) 읽는다', () => {
    const v = ok('2030-02|1=M12 2=휴\n3=N');
    expect(Object.keys(v.days)).toHaveLength(3);
    expect(v.days['2']).toBe('휴');
  });

  it('자유 텍스트(공백 포함, 시각 포함)도 그대로 둔다', () => {
    const v = ok('2030-02|5=건강 검진,6=교육 10:00 시작,7=주휴');
    expect(v.days['5']).toBe('건강 검진');
    expect(v.days['6']).toBe('교육 10:00 시작');
    expect(v.days['7']).toBe('주휴');
  });

  it('소문자·한 자리 M 코드를 정리한다', () => {
    const v = ok('2030-02|1=m12,2=d,3=n,4=m9');
    expect(v.days).toMatchObject({ '1': 'M12', '2': 'D', '3': 'N', '4': 'M09' });
  });

  it('전각 문자(｜ ， ＝ 숫자)도 읽는다', () => {
    const v = ok('２０３０-０２｜１＝M12，２＝휴');
    expect(v.ym).toBe('2030-02');
    expect(v.days).toMatchObject({ '1': 'M12', '2': '휴' });
  });

  it('그 달에 없는 날짜는 건너뛰고 알려준다 (2월 30일)', () => {
    const r = ok('2030-02|1=D,30=N');
    expect(r.days['30']).toBeUndefined();
    expect(r.warnings.some((w) => w.includes('30일'))).toBe(true);
  });

  it('같은 날이 두 번 나오면 뒤의 값을 쓰고 알려준다', () => {
    const r = ok('2030-02|1=D,1=N');
    expect(r.days['1']).toBe('N');
    expect(r.warnings.some((w) => w.includes('두 번'))).toBe(true);
  });

  it('비어 있지 않은 날이 모자라면 알려준다', () => {
    const r = ok('2030-02|1=D');
    expect(r.warnings.some((w) => w.includes('27일'))).toBe(true);
  });

  it('잘못된 입력은 오류', () => {
    expect(parseWork('1=D,2=N').ok).toBe(false); // 월 표시 없음
    expect(parseWork('abc|1=D').ok).toBe(false); // 월 표시 이상
    expect(parseWork('2030-13|1=D').ok).toBe(false); // 13월
    expect(parseWork('2030-02|').ok).toBe(false); // 항목 없음
    expect(parseWork('').ok).toBe(false);
  });
});

describe('work helpers', () => {
  it('workKind: 휴·주휴·연차는 off', () => {
    expect(workKind('휴')).toBe('off');
    expect(workKind('주휴')).toBe('off');
    expect(workKind('연차')).toBe('off');
    expect(workKind('D')).toBe('day');
    expect(workKind('M12')).toBe('mid');
    expect(workKind('N')).toBe('night');
    expect(workKind('건강검진')).toBe('other');
  });
  it('codeOnDate', () => {
    expect(codeOnDate({ '5': 'N' }, '2030-02-05')).toBe('N');
    expect(codeOnDate({ '5': 'N' }, '2030-02-06')).toBeUndefined();
    expect(codeOnDate(undefined, '2030-02-06')).toBeUndefined();
  });
  it('workLabel: 시간이 없으면 코드만', () => {
    expect(workLabel('M12', { M12: '09:00~18:00' })).toBe('M12 09:00~18:00');
    expect(workLabel('M12', { M12: ' ' })).toBe('M12');
    expect(workLabel('N')).toBe('N');
  });
  it('workEndText: 끝나는 시각', () => {
    expect(workEndText('M12', { M12: '12:00~21:00' })).toBe('오후 9:00');
    expect(workEndText('D', { D: '08:30 - 17:30' })).toBe('오후 5:30');
    expect(workEndText('N', { N: '22:00~07:00' })).toBe('오전 7:00');
    expect(workEndText('D', { D: '아침' })).toBeNull();
    expect(workEndText('D', {})).toBeNull();
    expect(workEndText('D', undefined)).toBeNull();
  });
  it('workEndAt: 끝나는 시각(ms), 야간은 다음 날', () => {
    const day = Date.UTC(2030, 0, 1, 15, 0) - 86400000; // 한국 2030-01-01 0시
    expect(workEndAt('M12', { M12: '12:00~21:00' }, day)).toBe(day + 21 * 3600000);
    expect(workEndAt('N', { N: '22:00~07:00' }, day)).toBe(day + 31 * 3600000);
    expect(workEndAt('D', { D: '아침' }, day)).toBeNull();
    expect(workEndAt('D', undefined, day)).toBeNull();
    expect(workEndAt('D', { D: '08:00~25:00' }, day)).toBeNull();
  });
});
