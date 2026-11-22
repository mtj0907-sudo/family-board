import { describe, expect, it } from 'vitest';
import { parseFirebaseConfig } from './firebaseConfig';

// 모두 가짜 값
const JSON_FORM = '{"apiKey":"fake-key","authDomain":"demo.example","projectId":"demo-project","appId":"1:1:web:fake"}';
const JS_FORM = `const firebaseConfig = {
  apiKey: "fake-key",
  authDomain: "demo.example",
  projectId: "demo-project",
  storageBucket: "demo.example",
  messagingSenderId: "123",
  appId: "1:1:web:fake"
};`;

describe('parseFirebaseConfig', () => {
  it('JSON 형태', () => {
    expect(parseFirebaseConfig(JSON_FORM)?.projectId).toBe('demo-project');
  });
  it('콘솔에서 복사한 JS 객체 형태', () => {
    const c = parseFirebaseConfig(JS_FORM);
    expect(c?.apiKey).toBe('fake-key');
    expect(c?.messagingSenderId).toBe('123');
  });
  it('필수 값이 없거나 비어 있으면 null', () => {
    expect(parseFirebaseConfig('')).toBeNull();
    expect(parseFirebaseConfig(undefined)).toBeNull();
    expect(parseFirebaseConfig('{"apiKey":"x"}')).toBeNull();
  });
});
