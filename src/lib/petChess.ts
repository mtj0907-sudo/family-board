/** 체스 퀴즈: 내 말이 한 번에 잡을 수 있는 상대 말을 찾아요 */
export type PieceKind = 'rook' | 'bishop' | 'knight' | 'queen';
export interface Sq {
  r: number; // 0~7 (위에서부터)
  c: number; // 0~7
}
export interface ChessPuzzle {
  kind: PieceKind;
  me: Sq;
  /** 상대 말들 (이 중 정확히 하나만 잡을 수 있어요) */
  targets: Sq[];
  /** 길을 막는 같은 편 말들 */
  blockers: Sq[];
  /** targets 중 잡을 수 있는 말의 번호 */
  answer: number;
}

export const PIECE_NAME: Record<PieceKind, string> = { rook: '룩', bishop: '비숍', knight: '나이트', queen: '퀸' };
export const PIECE_GLYPH: Record<PieceKind, string> = { rook: '♖', bishop: '♗', knight: '♘', queen: '♕' };

const key = (s: Sq) => `${s.r},${s.c}`;
const DIRS: Record<'rook' | 'bishop', [number, number][]> = {
  rook: [[1, 0], [-1, 0], [0, 1], [0, -1]],
  bishop: [[1, 1], [1, -1], [-1, 1], [-1, -1]],
};
const KNIGHT: [number, number][] = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]];

/** 말이 갈 수 있는 칸들. 다른 말에 막히면 거기까지 (그 칸은 잡을 수 있는 칸으로 포함) */
export function reach(kind: PieceKind, from: Sq, occupied: Set<string>): Sq[] {
  const out: Sq[] = [];
  if (kind === 'knight') {
    for (const [dr, dc] of KNIGHT) {
      const r = from.r + dr;
      const c = from.c + dc;
      if (r >= 0 && r < 8 && c >= 0 && c < 8) out.push({ r, c });
    }
    return out;
  }
  const dirs = kind === 'rook' ? DIRS.rook : kind === 'bishop' ? DIRS.bishop : [...DIRS.rook, ...DIRS.bishop];
  for (const [dr, dc] of dirs) {
    let r = from.r + dr;
    let c = from.c + dc;
    while (r >= 0 && r < 8 && c >= 0 && c < 8) {
      out.push({ r, c });
      if (occupied.has(`${r},${c}`)) break;
      r += dr;
      c += dc;
    }
  }
  return out;
}

/** 상대 말 중 잡을 수 있는 것의 번호들 (같은 편 말은 잡을 수 없어요) */
export function capturable(p: Pick<ChessPuzzle, 'kind' | 'me' | 'targets' | 'blockers'>): number[] {
  const occ = new Set([...p.targets, ...p.blockers].map(key));
  const reachable = new Set(reach(p.kind, p.me, occ).map(key));
  return p.targets.map((t, i) => (reachable.has(key(t)) ? i : -1)).filter((i) => i >= 0);
}

type Rand = () => number;
const rnd = (r: Rand, n: number) => Math.floor(r() * n);

/** 잡을 수 있는 말이 딱 하나인 문제를 만들어요. 어려운 쪽은 말 종류가 많고 길을 막는 말이 있어요. */
export function makeChessPuzzle(hard: boolean, r: Rand = Math.random): ChessPuzzle {
  const kinds: PieceKind[] = hard ? ['rook', 'bishop', 'knight', 'queen'] : ['rook', 'knight'];
  for (let guard = 0; guard < 500; guard++) {
    const used = new Set<string>();
    const place = (): Sq => {
      for (;;) {
        const s = { r: rnd(r, 8), c: rnd(r, 8) };
        if (!used.has(key(s))) {
          used.add(key(s));
          return s;
        }
      }
    };
    const kind = kinds[rnd(r, kinds.length)];
    const me = place();
    const targets = [place(), place(), place()];
    const blockers = hard ? [place(), place()] : [];
    const hit = capturable({ kind, me, targets, blockers });
    if (hit.length === 1) return { kind, me, targets, blockers, answer: hit[0] };
  }
  // 거의 일어나지 않지만, 못 찾으면 쉬운 고정 문제
  return { kind: 'rook', me: { r: 7, c: 0 }, targets: [{ r: 7, c: 5 }, { r: 2, c: 3 }, { r: 1, c: 6 }], blockers: [], answer: 0 };
}
