const KEYS = [
  'apiKey',
  'authDomain',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId',
] as const;

/**
 * Firebase 콘솔에 나오는 JS 객체 형태(`apiKey: "..."`)와 JSON 형태를 모두 받아줍니다.
 * 비전문가가 콘솔 화면의 값을 그대로 붙여넣어도 동작하게 하려는 목적입니다.
 */
export function parseFirebaseConfig(raw: string | undefined | null): Record<string, string> | null {
  if (!raw) return null;
  const out: Record<string, string> = {};
  const re = /["']?(\w+)["']?\s*:\s*["']([^"']*)["']/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) {
    if ((KEYS as readonly string[]).includes(m[1])) out[m[1]] = m[2];
  }
  return out.apiKey && out.projectId && out.appId ? out : null;
}
