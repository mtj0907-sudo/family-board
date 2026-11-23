/** 펫 간식을 얻는 퀴즈. 학교 다니는 아이는 초등 문제, 아직 안 다니면 유치원 문제예요. */
export type QuizLevel = 'kinder' | 'school';
export interface Question {
  q: string;
  choices: string[];
  /** 정답이 choices의 몇 번째인지 */
  answer: number;
}

type Rand = () => number;
const int = (r: Rand, a: number, b: number) => a + Math.floor(r() * (b - a + 1));
function shuffle<T>(arr: T[], r: Rand): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
/** 정답과 틀린 보기를 섞어서 문제로 만들어요 */
function make(q: string, right: string, wrong: string[], r: Rand): Question {
  const uniq = [...new Set(wrong.filter((w) => w !== right))].slice(0, 2);
  const choices = shuffle([right, ...uniq], r);
  return { q, choices, answer: choices.indexOf(right) };
}
function numberWrongs(n: number, r: Rand): string[] {
  const out = new Set<number>();
  while (out.size < 2) {
    const d = int(r, 1, 3) * (r() < 0.5 ? -1 : 1);
    if (n + d >= 0 && n + d !== n) out.add(n + d);
  }
  return [...out].map(String);
}

const VOCAB: [string, string][] = [
  ['apple', '사과'], ['dog', '강아지'], ['cat', '고양이'], ['milk', '우유'], ['book', '책'], ['water', '물'], ['tree', '나무'],
  ['school', '학교'], ['rabbit', '토끼'], ['bear', '곰'], ['red', '빨강'], ['blue', '파랑'], ['sun', '해'], ['moon', '달'],
];
const TRIVIA: [string, string, string[]][] = [
  ['우리나라의 수도는?', '서울', ['부산', '대구']],
  ['무지개는 모두 몇 가지 색일까요?', '7가지', ['5가지', '9가지']],
  ['태양계에서 가장 큰 행성은?', '목성', ['지구', '화성']],
  ['물이 꽁꽁 얼면 무엇이 될까요?', '얼음', ['수증기', '모래']],
  ['일주일은 며칠일까요?', '7일', ['5일', '10일']],
  ['거미는 다리가 몇 개일까요?', '8개', ['6개', '10개']],
  ['식물이 자라려면 꼭 필요한 것은?', '햇빛', ['장난감', '비누']],
];

const FRUITS = ['🍎', '🍓', '🍌', '🍇', '🍊'];
const KINDER: ((r: Rand) => Question)[] = [
  (r) => {
    const n = int(r, 1, 6);
    const f = FRUITS[int(r, 0, FRUITS.length - 1)];
    return make(`${f.repeat(n)}\n모두 몇 개일까요?`, String(n), numberWrongs(n, r), r);
  },
  (r) => {
    const a = int(r, 1, 4);
    const b = int(r, 1, 4);
    return make(`${'🍪'.repeat(a)} 그리고 ${'🍪'.repeat(b)}\n합치면 몇 개일까요?`, String(a + b), numberWrongs(a + b, r), r);
  },
  (r) => {
    const sets: [string, string, string[]][] = [
      ['멍멍 하고 우는 동물은?', '🐶', ['🐱', '🐰']],
      ['야옹 하고 우는 동물은?', '🐱', ['🐶', '🐥']],
      ['삐약삐약 하고 우는 동물은?', '🐥', ['🐻', '🐹']],
      ['당근을 좋아하는 동물은?', '🐰', ['🐶', '🐱']],
    ];
    const [q, a, w] = sets[int(r, 0, sets.length - 1)];
    return make(q, a, w, r);
  },
  (r) => {
    const sets: [string, string, string[]][] = [
      ['바나나는 무슨 색일까요?', '노랑', ['파랑', '보라']],
      ['딸기는 무슨 색일까요?', '빨강', ['초록', '검정']],
      ['하늘은 무슨 색일까요?', '파랑', ['분홍', '갈색']],
      ['잔디는 무슨 색일까요?', '초록', ['빨강', '주황']],
    ];
    const [q, a, w] = sets[int(r, 0, sets.length - 1)];
    return make(q, a, w, r);
  },
  (r) => {
    const sets: [string, string, string[]][] = [
      ['공처럼 동그란 모양은?', '⚪', ['🔺', '⬛']],
      ['뾰족한 세모는 어느 것일까요?', '🔺', ['⚪', '⬛']],
      ['네모난 모양은?', '⬛', ['🔺', '⚪']],
    ];
    const [q, a, w] = sets[int(r, 0, sets.length - 1)];
    return make(q, a, w, r);
  },
];
const SCHOOL: ((r: Rand) => Question)[] = [
  (r) => {
    const a = int(r, 12, 60);
    const b = int(r, 5, 35);
    return make(`${a} + ${b} = ?`, String(a + b), numberWrongs(a + b, r), r);
  },
  (r) => {
    const a = int(r, 30, 90);
    const b = int(r, 5, 29);
    return make(`${a} − ${b} = ?`, String(a - b), numberWrongs(a - b, r), r);
  },
  (r) => {
    const a = int(r, 2, 9);
    const b = int(r, 2, 9);
    return make(`${a} × ${b} = ?`, String(a * b), numberWrongs(a * b, r), r);
  },
  (r) => {
    const [en, ko] = VOCAB[int(r, 0, VOCAB.length - 1)];
    const others = shuffle(VOCAB.filter((v) => v[1] !== ko).map((v) => v[1]), r).slice(0, 2);
    return make(`영어 단어 "${en}"의 뜻은?`, ko, others, r);
  },
  (r) => {
    const [q, a, w] = TRIVIA[int(r, 0, TRIVIA.length - 1)];
    return make(q, a, w, r);
  },
];

/** 다섯 문제를 만들어요 (같은 문제가 나란히 나오지 않게 섞어요) */
export function makeQuiz(level: QuizLevel, r: Rand = Math.random, count = 5): Question[] {
  const gens = level === 'school' ? SCHOOL : KINDER;
  const out: Question[] = [];
  let guard = 0;
  while (out.length < count && guard++ < 50) {
    const gen = gens[(out.length + int(r, 0, gens.length - 1)) % gens.length];
    const q = gen(r);
    if (!out.some((o) => o.q === q.q)) out.push(q);
  }
  return out;
}

/** 퀴즈에서 맞힌 개수만큼 간식을 받아요. 다 맞히면 한 개 더! */
export const quizSnacks = (correct: number, total: number): number => Math.max(0, correct - 1) + (correct === total && total > 0 ? 1 : 0);
/** 짝 맞추기: 적게 뒤집을수록 많이 받아요 */
export const memorySnacks = (moves: number): number => (moves <= 8 ? 3 : moves <= 12 ? 2 : 1);
/** 간식 잡기: 네 개 잡을 때마다 한 개 */
export const catchSnacks = (score: number): number => Math.floor(Math.max(0, score) / 4);
