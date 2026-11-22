import { describe, expect, it } from 'vitest';
import { buildJoinLink, generateCode, parseJoinCode } from './family';

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
