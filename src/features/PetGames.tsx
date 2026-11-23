import { useEffect, useMemo, useRef, useState } from 'react';
import { catchSnacks, makeQuiz, memorySnacks, quizSnacks, type QuizLevel } from '../lib/petQuiz';

type Game = 'menu' | 'quiz' | 'catch' | 'memory';

/** 간식을 얻는 퀴즈와 미니게임 모음 */
export function PetGames({ level, onEarn, onClose }: { level: QuizLevel; onEarn: (n: number) => void; onClose: () => void }) {
  const [game, setGame] = useState<Game>('menu');
  const [result, setResult] = useState<number | null>(null);
  const finish = (n: number) => {
    setResult(n);
    if (n > 0) onEarn(n);
  };
  const again = () => {
    setResult(null);
    setGame('menu');
  };
  return (
    <div className="pet-games" role="dialog" aria-label="간식 얻기 게임">
      <div className="pg-top">
        <b>{game === 'menu' ? '간식 얻기 게임' : game === 'quiz' ? '똑똑 퀴즈' : game === 'catch' ? '간식 잡기' : '짝 맞추기'}</b>
        <button className="pg-x" onClick={onClose} aria-label="닫기">
          ✕
        </button>
      </div>
      {result !== null ? (
        <div className="pg-result">
          <div className="pg-big">{result > 0 ? '🍪'.repeat(Math.min(result, 6)) : '😅'}</div>
          <div>{result > 0 ? `간식 ${result}개를 받았어요!` : '이번엔 간식을 못 받았어요. 다시 해 볼까요?'}</div>
          <div className="pg-row">
            <button className="btn primary" onClick={again}>
              또 하기
            </button>
            <button className="btn" onClick={onClose}>
              펫에게 가기
            </button>
          </div>
        </div>
      ) : game === 'menu' ? (
        <div className="pg-menu">
          <button onClick={() => setGame('quiz')}>
            <span>🧠</span>똑똑 퀴즈<small>맞힌 만큼 간식</small>
          </button>
          <button onClick={() => setGame('catch')}>
            <span>🧺</span>간식 잡기<small>떨어지는 간식을 톡톡</small>
          </button>
          <button onClick={() => setGame('memory')}>
            <span>🃏</span>짝 맞추기<small>같은 그림 찾기</small>
          </button>
        </div>
      ) : game === 'quiz' ? (
        <Quiz level={level} onDone={finish} />
      ) : game === 'catch' ? (
        <Catch onDone={finish} />
      ) : (
        <Memory onDone={finish} />
      )}
    </div>
  );
}

function Quiz({ level, onDone }: { level: QuizLevel; onDone: (n: number) => void }) {
  const qs = useMemo(() => makeQuiz(level), [level]);
  const [i, setI] = useState(0);
  const [right, setRight] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const q = qs[i];
  function choose(c: number) {
    if (chosen !== null) return;
    setChosen(c);
    const ok = c === q.answer;
    const nextRight = right + (ok ? 1 : 0);
    window.setTimeout(() => {
      if (i + 1 >= qs.length) onDone(quizSnacks(nextRight, qs.length));
      else {
        setRight(nextRight);
        setI(i + 1);
        setChosen(null);
      }
    }, 900);
  }
  return (
    <div className="pg-quiz">
      <div className="sub">
        {i + 1} / {qs.length} 문제 · 맞힌 개수 {right}
      </div>
      <div className="pg-q">{q.q}</div>
      <div className="pg-choices">
        {q.choices.map((c, idx) => (
          <button key={c} className={chosen === null ? '' : idx === q.answer ? 'right' : idx === chosen ? 'wrong' : 'dim'} onClick={() => choose(idx)}>
            {c}
          </button>
        ))}
      </div>
      <div className="pg-fb" aria-live="polite">
        {chosen === null ? '' : chosen === q.answer ? '⭕ 정답!' : '❌ 아쉬워요'}
      </div>
    </div>
  );
}

const FOODS = ['🍎', '🍪', '🍓', '🥕', '🍰'];
interface Drop {
  id: number;
  x: number;
  e: string;
  bad: boolean;
  dur: number;
}
const CATCH_SECONDS = 20;

function Catch({ onDone }: { onDone: (n: number) => void }) {
  const [drops, setDrops] = useState<Drop[]>([]);
  const [score, setScore] = useState(0);
  const [left, setLeft] = useState(CATCH_SECONDS);
  const id = useRef(0);
  const scoreRef = useRef(0);
  useEffect(() => {
    const spawn = window.setInterval(() => {
      const bad = Math.random() < 0.2;
      setDrops((d) => [...d, { id: ++id.current, x: 6 + Math.random() * 78, e: bad ? '🥦' : FOODS[Math.floor(Math.random() * FOODS.length)], bad, dur: 2.4 + Math.random() * 1.2 }]);
    }, 620);
    const tick = window.setInterval(() => setLeft((l) => l - 1), 1000);
    return () => {
      window.clearInterval(spawn);
      window.clearInterval(tick);
    };
  }, []);
  useEffect(() => {
    if (left <= 0) onDone(catchSnacks(scoreRef.current));
  }, [left, onDone]);
  function tap(d: Drop) {
    setDrops((all) => all.filter((x) => x.id !== d.id));
    scoreRef.current = Math.max(0, scoreRef.current + (d.bad ? -1 : 1));
    setScore(scoreRef.current);
  }
  return (
    <div className="pg-catch">
      <div className="pg-hud">
        <span>⏱ {Math.max(0, left)}초</span>
        <span>🍪 {score}</span>
        <span className="sub">브로콜리는 피해요!</span>
      </div>
      <div className="pg-field">
        {drops.map((d) => (
          <button key={d.id} className="pg-drop" style={{ left: `${d.x}%`, animationDuration: `${d.dur}s` }} onClick={() => tap(d)} onAnimationEnd={() => setDrops((all) => all.filter((x) => x.id !== d.id))} aria-label={d.bad ? '브로콜리' : '간식'}>
            {d.e}
          </button>
        ))}
      </div>
    </div>
  );
}

const CARDS = ['🐶', '🐱', '🐰', '🐹', '🐥', '🐻'];
function Memory({ onDone }: { onDone: (n: number) => void }) {
  const deck = useMemo(() => {
    const picks = [...CARDS].sort(() => Math.random() - 0.5).slice(0, 4);
    return [...picks, ...picks].sort(() => Math.random() - 0.5);
  }, []);
  const [open, setOpen] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const lock = useRef(false);
  function flip(i: number) {
    if (lock.current || open.includes(i) || matched.includes(i)) return;
    const next = [...open, i];
    setOpen(next);
    if (next.length < 2) return;
    setMoves((m) => m + 1);
    lock.current = true;
    const [a, b] = next;
    window.setTimeout(() => {
      if (deck[a] === deck[b]) {
        const m = [...matched, a, b];
        setMatched(m);
        if (m.length === deck.length) window.setTimeout(() => onDone(memorySnacks(moves + 1)), 500);
      }
      setOpen([]);
      lock.current = false;
    }, 700);
  }
  return (
    <div className="pg-memory">
      <div className="sub">뒤집은 횟수 {moves}번 (적을수록 간식이 많아요)</div>
      <div className="pg-cards">
        {deck.map((e, i) => {
          const up = open.includes(i) || matched.includes(i);
          return (
            <button key={i} className={`card ${up ? 'up' : ''} ${matched.includes(i) ? 'ok' : ''}`} onClick={() => flip(i)} aria-label={up ? e : '뒤집힌 카드'}>
              {up ? e : '❔'}
            </button>
          );
        })}
      </div>
    </div>
  );
}
