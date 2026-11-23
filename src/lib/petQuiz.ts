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
  ['apple', '사과'], ['library', '도서관'], ['vegetable', '채소'], ['tomorrow', '내일'], ['beautiful', '아름다운'], ['dangerous', '위험한'],
  ['elephant', '코끼리'], ['umbrella', '우산'], ['breakfast', '아침 식사'], ['mountain', '산'], ['river', '강'], ['kitchen', '부엌'],
  ['hospital', '병원'], ['wednesday', '수요일'], ['purple', '보라색'], ['scissors', '가위'], ['hungry', '배고픈'], ['borrow', '빌리다'],
  ['airport', '공항'], ['weather', '날씨'], ['dolphin', '돌고래'], ['whisper', '속삭이다'],
];
const TRIVIA: [string, string, string[]][] = [
  ['우리나라에서 가장 높은 산은?', '한라산', ['백두산', '지리산']],
  ['식물이 햇빛으로 양분을 만드는 일은?', '광합성', ['증발', '소화']],
  ['지구가 하루에 한 바퀴 도는 것은?', '자전', ['공전', '충돌']],
  ['한글을 만든 임금님은?', '세종대왕', ['이순신', '광개토대왕']],
  ['신라의 수도였던 도시는?', '경주', ['평양', '전주']],
  ['1km는 몇 m일까요?', '1000m', ['100m', '10000m']],
  ['물은 몇 ℃에서 끓을까요?', '100℃', ['50℃', '0℃']],
  ['일본의 수도는?', '도쿄', ['베이징', '방콕']],
  ['태양에서 세 번째로 가까운 행성은?', '지구', ['금성', '화성']],
  ['곤충의 다리는 모두 몇 개일까요?', '6개', ['4개', '8개']],
  ['삼각형의 세 각을 모두 더하면?', '180도', ['90도', '360도']],
  ['사람의 몸에서 피를 온몸으로 보내는 곳은?', '심장', ['위', '폐']],
  ['우리나라에서 가장 큰 섬은?', '제주도', ['울릉도', '강화도']],
  ['달이 지구를 한 바퀴 도는 데 걸리는 시간은 약?', '한 달', ['하루', '일 년']],
];

const FRUITS = ['🍎', '🍓', '🍌', '🍇', '🍊'];
const pickOf = <T,>(arr: T[], r: Rand): T => arr[int(r, 0, arr.length - 1)];
function fromSet(sets: [string, string, string[]][], r: Rand): Question {
  const [q, a, w] = pickOf(sets, r);
  return make(q, a, w, r);
}
function seqWrongs(n: number, r: Rand): string[] {
  const out = new Set<number>();
  while (out.size < 2) {
    const d = int(r, 1, 4) * (r() < 0.5 ? -1 : 1);
    if (d !== 0) out.add(n + d);
  }
  return [...out].map(String);
}

/** 5살 눈높이지만 한 번 생각해야 풀리는 문제들 */
const KINDER: ((r: Rand) => Question)[] = [
  (r) => {
    const n = int(r, 4, 10);
    return make(`${pickOf(FRUITS, r).repeat(n)}\n모두 몇 개일까요?`, String(n), numberWrongs(n, r), r);
  },
  (r) => {
    const a = int(r, 2, 6);
    const b = int(r, 2, 5);
    return make(`${'🍪'.repeat(a)} 그리고 ${'🍪'.repeat(b)}\n합치면 몇 개일까요?`, String(a + b), numberWrongs(a + b, r), r);
  },
  (r) => {
    const a = int(r, 5, 9);
    const b = int(r, 1, a - 2);
    return make(`🍰 ${a}개 중에 ${b}개를 먹었어요.\n몇 개 남았을까요?`, String(a - b), numberWrongs(a - b, r), r);
  },
  (r) => {
    const a = int(r, 1, 9);
    const b = ((a - 1 + int(r, 1, 8)) % 9) + 1;
    return make(`${a}와 ${b} 중에서 더 큰 수는?`, String(Math.max(a, b)), [String(Math.min(a, b))], r);
  },
  (r) => {
    const start = int(r, 1, 5);
    return make(`${start}, ${start + 1}, ${start + 2}, ❓\n다음 수는?`, String(start + 3), seqWrongs(start + 3, r), r);
  },
  (r) => {
    const [x, y] = [['🔴', '🔵'], ['⭐', '🌙'], ['🍎', '🍌']][int(r, 0, 2)];
    return make(`${x}${y}${x}${y}${x}❓\n빈칸에 들어갈 것은?`, y, [x, '🟢'], r);
  },
  (r) => fromSet([
    ['반대말을 찾아요. "크다"의 반대는?', '작다', ['많다', '길다']],
    ['반대말을 찾아요. "뜨겁다"의 반대는?', '차갑다', ['따뜻하다', '맵다']],
    ['반대말을 찾아요. "높다"의 반대는?', '낮다', ['넓다', '빠르다']],
    ['반대말을 찾아요. "밝다"의 반대는?', '어둡다', ['가볍다', '깨끗하다']],
  ], r),
  (r) => fromSet([
    ['"가"로 시작하는 낱말은?', '가방', ['나비', '다리']],
    ['"나"로 시작하는 낱말은?', '나무', ['바다', '사자']],
    ['"바"로 시작하는 낱말은?', '바나나', ['다람쥐', '고양이']],
    ['"사"로 시작하는 낱말은?', '사과', ['토끼', '하늘']],
  ], r),
  (r) => {
    const [en, ko] = pickOf<[string, string]>([['dog', '강아지'], ['cat', '고양이'], ['apple', '사과'], ['milk', '우유'], ['bear', '곰'], ['sun', '해']], r);
    const others = ['강아지', '고양이', '사과', '우유', '곰', '해'].filter((k) => k !== ko).sort(() => r() - 0.5).slice(0, 2);
    return make(`"${en}"는 우리말로 뭘까요?`, ko, others, r);
  },
  (r) => fromSet([
    ['가장 큰 동물은?', '🐘', ['🐶', '🐰']],
    ['하늘을 나는 동물은?', '🐥', ['🐻', '🐹']],
    ['그림자 시계는 낮에 무엇으로 시간을 알까요?', '해', ['달', '별']],
    ['비가 오면 쓰는 것은?', '☂️', ['🧢', '🧤']],
  ], r),
];

/** 초등 고학년 도전 문제: 세 자리 수, 곱셈·나눗셈, 규칙 찾기, 시계, 분수, 영어, 상식 */
const SCHOOL: ((r: Rand) => Question)[] = [
  (r) => {
    const a = int(r, 120, 780);
    const b = int(r, 110, 480);
    return make(`${a} + ${b} = ?`, String(a + b), [String(a + b + 10), String(a + b - 100)], r);
  },
  (r) => {
    const a = int(r, 500, 980);
    const b = int(r, 120, 480);
    return make(`${a} − ${b} = ?`, String(a - b), [String(a - b + 10), String(a - b - 100)], r);
  },
  (r) => {
    const a = int(r, 12, 49);
    const b = int(r, 3, 9);
    return make(`${a} × ${b} = ?`, String(a * b), [String(a * b + b), String(a * b - 10)], r);
  },
  (r) => {
    const b = int(r, 3, 9);
    const q = int(r, 6, 15);
    return make(`${b * q} ÷ ${b} = ?`, String(q), numberWrongs(q, r), r);
  },
  (r) => {
    const b = int(r, 4, 9);
    const q = int(r, 4, 9);
    return make(`☐ × ${b} = ${b * q}\n☐ 안에 들어갈 수는?`, String(q), numberWrongs(q, r), r);
  },
  (r) => {
    const first = int(r, 2, 6);
    const step = int(r, 3, 7);
    const seq = [0, 1, 2, 3].map((i) => first + step * i);
    return make(`${seq.join(', ')}, ❓\n규칙을 찾아 다음 수를 맞혀 보세요`, String(first + step * 4), seqWrongs(first + step * 4, r), r);
  },
  (r) => {
    const start = int(r, 2, 4);
    const seq = [0, 1, 2, 3].map((i) => start * 2 ** i);
    return make(`${seq.join(', ')}, ❓\n다음 수는?`, String(start * 16), [String(start * 12), String(start * 18)], r);
  },
  (r) => {
    const h = int(r, 1, 8);
    const add = pickOf([30, 45, 50, 75], r);
    const total = h * 60 + 15 + add;
    const t = (m: number) => `${Math.floor(m / 60)}시 ${m % 60}분`;
    return make(`${h}시 15분에서 ${add}분이 지나면 몇 시 몇 분일까요?`, t(total), [t(total + 10), t(total - 15)], r);
  },
  (r) => fromSet([
    ['1/2 + 1/4 = ?', '3/4', ['2/6', '1/2']],
    ['3/4 − 1/4 = ?', '1/2', ['2/4 + 1', '1/4']],
    ['1/3 + 1/3 = ?', '2/3', ['2/6', '1/3']],
    ['0.5 + 0.25 = ?', '0.75', ['0.55', '0.7']],
    ['12의 1/4은?', '3', ['4', '6']],
    ['80의 25%는?', '20', ['25', '40']],
  ], r),
  (r) => {
    const [en, ko] = pickOf(VOCAB, r);
    const others = shuffle(VOCAB.filter((v) => v[1] !== ko).map((v) => v[1]), r).slice(0, 2);
    return make(`영어 단어 "${en}"의 뜻은?`, ko, others, r);
  },
  (r) => {
    const [en, ko] = pickOf(VOCAB, r);
    const others = shuffle(VOCAB.filter((v) => v[0] !== en).map((v) => v[0]), r).slice(0, 2);
    return make(`"${ko}"를 영어로 쓰면?`, en, others, r);
  },
  (r) => {
    const [q, a, w] = pickOf(TRIVIA, r);
    return make(q, a, w, r);
  },
  (r) => {
    const n = int(r, 3, 9);
    return make(`한 변이 ${n}cm인 정사각형의 둘레는?`, `${n * 4}cm`, [`${n * 2}cm`, `${n * n}cm`], r);
  },
];

/** 문제를 만들어요 (같은 문제가 나란히 나오지 않게 섞어요) */
export function makeQuiz(level: QuizLevel, r: Rand = Math.random, count = level === 'school' ? 6 : 5): Question[] {
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
/** 문제마다 생각할 수 있는 시간(초) */
export const quizSeconds = (level: QuizLevel): number => (level === 'school' ? 15 : 35);
/** 짝 맞추기: 적게 뒤집을수록 많이 받아요 (pairs = 카드 짝 수) */
export const memorySnacks = (moves: number, pairs = 4): number => (moves <= pairs * 2 ? 3 : moves <= pairs * 3 ? 2 : 1);
/** 간식 잡기: per개 잡을 때마다 한 개 */
export const catchSnacks = (score: number, per = 4): number => Math.floor(Math.max(0, score) / per);
