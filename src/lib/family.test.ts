import { describe, expect, it } from 'vitest';
import { buildHash, buildJoinLink, generateCode, parseJoinCode, parseJoinHash } from './family';

describe('family code', () => {
  it('충분히 길고 서로 다른 코드를 만든다', () => {
    const a = generateCode();
    const b = generateCode();
    expect(a).toMatch(/^[a-z0-9]{28}$/);
    expect(a).not.toBe(b);
  });

  it('링크/해시/코드 그대로를 모두 해석한다', () => {
    const code = 'abcdefghjkmnpqrstuvwxyz23456';
    expect(parseJoinCode(code)).toBe(code);
    expect(parseJoinCode(`  ${code.toUpperCase()} `)).toBe(code);
    expect(parseJoinCode(`#c=${code}`)).toBe(code);
    expect(parseJoinCode(`https://example.github.io/family-board/#c=${code}`)).toBe(code);
    expect(parseJoinCode('short')).toBeNull();
    expect(parseJoinCode('')).toBeNull();
  });

  it('공유 링크는 # 뒤에 코드를 둔다 (서버로 전송되지 않음)', () => {
    expect(buildJoinLink('https://example.test/app/#old', 'x'.repeat(20))).toBe(
      `https://example.test/app/#c=${'x'.repeat(20)}`,
    );
  });
});

describe('홈 화면 앱 연결 정보(#c=…&me=…)', () => {
  const code = 'abcdefghjkmnpqrstuvwxyz23456'; // 가짜 코드
  it('코드와 구성원 번호를 함께 담고 다시 꺼낸다', () => {
    const h = buildHash(code, 'm3');
    expect(h).toBe(`#c=${code}&me=m3`);
    expect(parseJoinHash(h)).toEqual({ code, me: 'm3', board: false });
  });
  it('구성원 번호 없이도 된다 (공유 링크)', () => {
    expect(buildHash(code)).toBe(`#c=${code}`);
    expect(parseJoinHash(`#c=${code}`)).toEqual({ code, me: null, board: false });
  });
  it('잘못되거나 빈 주소는 null', () => {
    expect(parseJoinHash('')).toEqual({ code: null, me: null, board: false });
    expect(parseJoinHash('#c=short&me=m1')).toEqual({ code: null, me: 'm1', board: false });
    expect(parseJoinHash(`#c=${code}&me=hack`).me).toBeNull();
  });
  it('공유 링크에는 내 번호(me)가 따라가지 않는다', () => {
    expect(buildJoinLink(`https://example.test/app/${buildHash(code, 'm2')}`, code)).toBe(`https://example.test/app/#c=${code}`);
  });
  it('거실 보드 모드(b=1)도 주소에 담아 홈 화면 앱이 바로 보드로 열리게 한다', () => {
    const h = buildHash(code, 'm1', true);
    expect(h).toBe(`#c=${code}&me=m1&b=1`);
    expect(parseJoinHash(h)).toEqual({ code, me: 'm1', board: true });
    expect(parseJoinHash(`#c=${code}&b=10`).board).toBe(false);
  });
});
