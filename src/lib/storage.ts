// localStorage 래퍼: 사생활 보호 모드 등에서 막혀 있어도 앱이 죽지 않도록 메모리로 대체합니다.
export interface KV {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

export function createMemoryStore(): KV {
  const m = new Map<string, string>();
  return {
    get: (k) => m.get(k) ?? null,
    set: (k, v) => void m.set(k, v),
    remove: (k) => void m.delete(k),
  };
}

const memory = createMemoryStore();

export const store: KV = {
  get(key) {
    try {
      return localStorage.getItem(key) ?? memory.get(key);
    } catch {
      return memory.get(key);
    }
  },
  set(key, value) {
    memory.set(key, value);
    try {
      localStorage.setItem(key, value);
    } catch {
      /* 무시 */
    }
  },
  remove(key) {
    memory.remove(key);
    try {
      localStorage.removeItem(key);
    } catch {
      /* 무시 */
    }
  },
};
