import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Portal } from '../components/Portal';
import { PIECE_GLYPH, PIECE_NAME, capturable, makeChessPuzzle, reach, type ChessPuzzle, type PieceKind } from '../lib/petChess';
import { catchSnacks, makeQuiz, memorySnacks, quizSeconds, quizSnacks, type QuizLevel } from '../lib/petQuiz';
import { canUse3D } from '../pet3d/support';
import { canSpeak, speak, stopSpeaking } from './games/speak';
import { isMuted, setMuted, sfx } from './games/sfx';

const BASE = import.meta.env.BASE_URL;
const ChessBoard3D = lazy(() => import('./games/ChessBoard3D').then((m) => ({ default: m.ChessBoard3D })));

type Game = 'menu' | 'quiz' | 'catch' | 'memory' | 'chess';
const TITLES: Record<Game, string> = { menu: '간식 게임', quiz: '똑똑 퀴즈', catch: '간식 잡기', memory: '짝 맞추기', chess: '체스 퀴즈' };

interface Props {
  level: QuizLevel;
  species: string;
  petName: string;
  snacks: number;
  onEarn: (n: number) => void;
  onClose: () => void;
}

const portrait = (species: string) => `${BASE}pets/${species}-baby.webp`;

/** 종이 조각이 터지는 효과 */
function Confetti({ n = 26 }: { n?: number }) {
  const bits = useMemo(
    () =>
      Array.from({ length: n }, () => ({
        x: (Math.random() - 0.5) * 340,
        y: -120 - Math.random() * 160,
        r: Math.random() * 720 - 360,
        c: ['#ffcf3f', '#ff6fa5', '#5ad1ff', '#3fd9a6', '#9b7bff'][Math.floor(Math.random() * 5)],
        d: Math.random() * 0.15,
      })),
    [n],
  );
  return (
    <div className="gm-confetti" aria-hidden>
      {bits.map((b, i) => (
        <i key={i} style={{ ['--x' as string]: `${b.x}px`, ['--y' as string]: `${b.y}px`, ['--r' as string]: `${b.r}deg`, background: b.c, animationDelay: `${b.d}s` }} />
      ))}
    </div>
  );
}

/** 게임이 끝났을 때: 별과 받은 간식 */
function Result({ got, stars, onAgain, onClose }: { got: number; stars: number; onAgain: () => void; onClose: () => void }) {
  useEffect(() => {
    if (got > 0) sfx.win();
    else sfx.no();
  }, [got]);
  return (
    <div className="gm-result">
      {got > 0 && <Confetti n={40} />}
      <div className="gm-stars" aria-label={`별 ${stars}개`}>
        {[0, 1, 2].map((i) => (
          <span key={i} className={i < stars ? 'on' : ''} style={{ animationDelay: `${i * 0.18}s` }}>
            ★
          </span>
        ))}
      </div>
      <div className="gm-reward">
        <span className="gm-cookie">🍪</span>
        <b>× {got}</b>
      </div>
      <p>{got > 0 ? '간식을 받았어요! 펫에게 가서 줘 봐요' : '이번엔 간식을 못 받았어요. 한 번 더 해 볼까요?'}</p>
      <div className="gm-btns">
        <button className="gm-btn mint" onClick={onAgain}>
          또 하기
        </button>
        <button className="gm-btn sun" onClick={onClose}>
          펫에게 가기
        </button>
      </div>
    </div>
  );
}

export function PetGames({ level, species, petName, snacks, onEarn, onClose }: Props) {
  const [game, setGame] = useState<Game>('menu');
  const [result, setResult] = useState<{ got: number; stars: number } | null>(null);
  const [mute, setMute] = useState(isMuted());
  const finish = (got: number, stars: number) => {
    setResult({ got, stars });
    if (got > 0) onEarn(got);
  };
  const close = () => {
    stopSpeaking();
    onClose();
  };
  const back = () => {
    stopSpeaking();
    setResult(null);
    setGame('menu');
  };
  const hard = level === 'school';
  return (
    <Portal>
      <div className={`gm lv-${level}`} role="dialog" aria-label="간식 게임">
        <div className="gm-top">
          <button className="gm-icon" onClick={game === 'menu' ? close : back} aria-label={game === 'menu' ? '닫기' : '뒤로'}>
            {game === 'menu' ? '✕' : '‹'}
          </button>
          <b>{TITLES[game]}</b>
          <div className="gm-pill" title="가진 간식">
            🍪 <span>{snacks}</span>
          </div>
          <button
            className="gm-icon sm"
            onClick={() => {
              setMuted(!mute);
              setMute(!mute);
            }}
            aria-label={mute ? '소리 켜기' : '소리 끄기'}
          >
            {mute ? '🔇' : '🔊'}
          </button>
        </div>
        <div className="gm-body">
          {result ? (
            <Result got={result.got} stars={result.stars} onAgain={back} onClose={close} />
          ) : game === 'menu' ? (
            <div className="gm-menu">
              <div className="gm-hello">
                <img src={portrait(species)} alt="" draggable={false} />
                <div className="gm-bubble">{petName}에게 줄 간식을 모아 볼까요?</div>
              </div>
              <div className="gm-cards">
                <button className="gm-card grape" onClick={() => setGame('quiz')}>
                  <i>🧠</i>
                  <b>똑똑 퀴즈</b>
                  <small>{hard ? '6문제 · 시간 제한' : '5문제 · 읽어 줘요'}</small>
                </button>
                <button className="gm-card sky" onClick={() => setGame('catch')}>
                  <i>🧺</i>
                  <b>간식 잡기</b>
                  <small>{hard ? '25초 · 빠르게' : '20초 · 톡톡'}</small>
                </button>
                <button className="gm-card pink" onClick={() => setGame('memory')}>
                  <i>🃏</i>
                  <b>짝 맞추기</b>
                  <small>{hard ? '12장' : '8장'}</small>
                </button>
                <button className="gm-card mint" onClick={() => setGame('chess')}>
                  <i>♞</i>
                  <b>체스 퀴즈</b>
                  <small>3D 체스판</small>
                </button>
              </div>
            </div>
          ) : game === 'quiz' ? (
            <Quiz level={level} species={species} onDone={finish} />
          ) : game === 'catch' ? (
            <Catch level={level} species={species} onDone={finish} />
          ) : game === 'chess' ? (
            <Chess level={level} onDone={finish} />
          ) : (
            <Memory level={level} onDone={finish} />
          )}
        </div>
      </div>
    </Portal>
  );
}

const stars3 = (right: number, total: number) => (right >= total ? 3 : right >= Math.ceil(total * 0.6) ? 2 : right >= 1 ? 1 : 0);

/* ───────── 똑똑 퀴즈 ───────── */
function Quiz({ level, species, onDone }: { level: QuizLevel; species: string; onDone: (n: number, s: number) => void }) {
  const qs = useMemo(() => makeQuiz(level), [level]);
  const kinder = level === 'kinder';
  const [i, setI] = useState(0);
  const [right, setRight] = useState(0);
  const [streak, setStreak] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [hints, setHints] = useState(kinder ? 2 : 1);
  const [hidden, setHidden] = useState<number[]>([]);
  const total = quizSeconds(level);
  const [left, setLeft] = useState(total);
  const q = qs[i];
  const readAll = () => speak(`${q.q}. ${q.choices.map((c, k) => `${k + 1}번, ${c}`).join('. ')}`);

  useEffect(() => {
    if (kinder && canSpeak()) readAll();
    return () => stopSpeaking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);
  useEffect(() => {
    if (chosen !== null) return;
    if (left <= 0) {
      choose(-1);
      return;
    }
    if (left <= 5) sfx.tick();
    const t = window.setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left, chosen]);

  function choose(c: number) {
    if (chosen !== null) return;
    stopSpeaking();
    setChosen(c);
    const ok = c === q.answer;
    ok ? sfx.ok() : sfx.no();
    const nextRight = right + (ok ? 1 : 0);
    window.setTimeout(() => {
      if (i + 1 >= qs.length) onDone(quizSnacks(nextRight, qs.length), stars3(nextRight, qs.length));
      else {
        setRight(nextRight);
        setStreak(ok ? streak + 1 : 0);
        setI(i + 1);
        setChosen(null);
        setHidden([]);
        setLeft(total);
      }
    }, ok ? 1100 : 1500);
  }
  function hint() {
    if (hints <= 0 || chosen !== null) return;
    const wrong = q.choices.map((_, k) => k).filter((k) => k !== q.answer && !hidden.includes(k));
    if (!wrong.length) return;
    setHidden([...hidden, wrong[Math.floor(Math.random() * wrong.length)]]);
    setHints(hints - 1);
    sfx.pop();
  }
  const ok = chosen === q.answer;
  return (
    <div className="gm-quiz">
      <div className="gm-prog">
        {qs.map((_, k) => (
          <i key={k} className={k < i ? 'done' : k === i ? 'now' : ''} />
        ))}
        {streak >= 2 && <span className="gm-streak">🔥 {streak}연속</span>}
      </div>
      <div className="gm-time" aria-label={`남은 시간 ${left}초`}>
        <i style={{ width: `${(left / total) * 100}%` }} className={left <= 5 ? 'low' : ''} />
      </div>
      <div className="gm-ask">
        <img src={portrait(species)} alt="" draggable={false} className={chosen === null ? '' : ok ? 'happy' : 'sad'} />
        <div className="gm-qcard">
          <div className="gm-q">{q.q}</div>
          {canSpeak() && (
            <button className="gm-speak" onClick={readAll} aria-label="문제 읽어 주기">
              🔊 {kinder ? '읽어 줘요' : ''}
            </button>
          )}
        </div>
      </div>
      <div className="gm-choices">
        {q.choices.map((c, idx) => (
          <button
            key={c}
            className={`gm-choice c${idx} ${chosen === null ? '' : idx === q.answer ? 'right' : idx === chosen ? 'wrong' : 'dim'} ${hidden.includes(idx) ? 'gone' : ''}`}
            disabled={chosen !== null || hidden.includes(idx)}
            onClick={() => choose(idx)}
          >
            <span className="gm-badge">{['①', '②', '③'][idx]}</span>
            <span className="gm-ctext">{c}</span>
          </button>
        ))}
      </div>
      <div className="gm-foot">
        <button className="gm-hint" onClick={hint} disabled={hints <= 0 || chosen !== null}>
          💡 힌트 {hints}
        </button>
        <span className="gm-fb">{chosen === null ? '' : ok ? '⭕ 정답!' : chosen === -1 ? '⏰ 시간 끝' : '❌ 아쉬워요'}</span>
      </div>
      {chosen !== null && ok && <Confetti key={i} />}
    </div>
  );
}

/* ───────── 간식 잡기 ───────── */
const FOODS = ['🍎', '🍪', '🍓', '🥕', '🍰', '🍩'];
interface Drop {
  id: number;
  x: number;
  e: string;
  bad: boolean;
  dur: number;
}
interface Pop {
  id: number;
  x: number;
  y: number;
  t: string;
  bad: boolean;
}

function Catch({ level, species, onDone }: { level: QuizLevel; species: string; onDone: (n: number, s: number) => void }) {
  const hard = level === 'school';
  const seconds = hard ? 25 : 20;
  const [drops, setDrops] = useState<Drop[]>([]);
  const [pops, setPops] = useState<Pop[]>([]);
  const [score, setScore] = useState(0);
  const [left, setLeft] = useState(seconds);
  const [combo, setCombo] = useState(0);
  const [mood, setMood] = useState<'' | 'yum' | 'yuck'>('');
  const field = useRef<HTMLDivElement>(null);
  const id = useRef(0);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  useEffect(() => {
    const spawn = window.setInterval(() => {
      const bad = Math.random() < (hard ? 0.3 : 0.2);
      setDrops((d) => [...d, { id: ++id.current, x: 8 + Math.random() * 76, e: bad ? '🥦' : FOODS[Math.floor(Math.random() * FOODS.length)], bad, dur: hard ? 1.6 + Math.random() : 2.5 + Math.random() * 1.1 }]);
    }, hard ? 430 : 620);
    const tick = window.setInterval(() => setLeft((l) => l - 1), 1000);
    return () => {
      window.clearInterval(spawn);
      window.clearInterval(tick);
    };
  }, [hard]);
  useEffect(() => {
    if (left > 0) return;
    const per = hard ? 6 : 4;
    const got = catchSnacks(scoreRef.current, per);
    onDone(got, stars3(scoreRef.current, per * 3));
  }, [left, hard, onDone]);
  function tap(d: Drop, e: React.PointerEvent) {
    const r = field.current?.getBoundingClientRect();
    setDrops((all) => all.filter((x) => x.id !== d.id));
    comboRef.current = d.bad ? 0 : comboRef.current + 1;
    setCombo(comboRef.current);
    const bonus = !d.bad && comboRef.current > 0 && comboRef.current % 3 === 0 ? 1 : 0;
    const delta = d.bad ? -2 : 1 + bonus;
    scoreRef.current = Math.max(0, scoreRef.current + delta);
    setScore(scoreRef.current);
    d.bad ? sfx.no() : sfx.pop();
    setMood(d.bad ? 'yuck' : 'yum');
    window.setTimeout(() => setMood(''), 420);
    const pid = ++id.current;
    setPops((p) => [...p, { id: pid, x: r ? e.clientX - r.left : 0, y: r ? e.clientY - r.top : 0, t: d.bad ? '−2 😖' : bonus ? '+2 🔥' : '+1', bad: d.bad }]);
    window.setTimeout(() => setPops((p) => p.filter((x) => x.id !== pid)), 700);
  }
  return (
    <div className="gm-catch">
      <div className="gm-hud">
        <div className="gm-chip">⏱ {Math.max(0, left)}</div>
        <div className="gm-chip big">🍪 {score}</div>
        <div className={`gm-chip ${combo >= 3 ? 'hot' : ''}`}>🔥 {combo}</div>
      </div>
      <div className="gm-time">
        <i style={{ width: `${(Math.max(0, left) / seconds) * 100}%` }} className={left <= 5 ? 'low' : ''} />
      </div>
      <div className="gm-field" ref={field}>
        <i className="gm-cloud c1" />
        <i className="gm-cloud c2" />
        {drops.map((d) => (
          <button key={d.id} className={`gm-drop ${d.bad ? 'bad' : ''}`} style={{ left: `${d.x}%`, animationDuration: `${d.dur}s` }} onPointerDown={(e) => tap(d, e)} onAnimationEnd={() => setDrops((all) => all.filter((x) => x.id !== d.id))} aria-label={d.bad ? '브로콜리' : '간식'}>
            {d.e}
          </button>
        ))}
        {pops.map((p) => (
          <span key={p.id} className={`gm-pop ${p.bad ? 'bad' : ''}`} style={{ left: p.x, top: p.y }}>
            {p.t}
          </span>
        ))}
        <div className={`gm-eater ${mood}`}>
          <img src={portrait(species)} alt="" draggable={false} />
        </div>
      </div>
      <div className="gm-tip">🥦 브로콜리는 피해요 · 3번 연속 잡으면 보너스!</div>
    </div>
  );
}

/* ───────── 짝 맞추기 ───────── */
const FACES = ['dog', 'cat', 'rabbit', 'hamster', 'chick', 'bear'];
function Memory({ level, onDone }: { level: QuizLevel; onDone: (n: number, s: number) => void }) {
  const pairs = level === 'school' ? 6 : 4;
  const deck = useMemo(() => {
    const picks = [...FACES].sort(() => Math.random() - 0.5).slice(0, pairs);
    return [...picks, ...picks].sort(() => Math.random() - 0.5);
  }, [pairs]);
  const [open, setOpen] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [sparkle, setSparkle] = useState<number[]>([]);
  const lock = useRef(false);
  function flip(i: number) {
    if (lock.current || open.includes(i) || matched.includes(i)) return;
    sfx.flip();
    const next = [...open, i];
    setOpen(next);
    if (next.length < 2) return;
    setMoves((m) => m + 1);
    lock.current = true;
    const [a, b] = next;
    window.setTimeout(() => {
      if (deck[a] === deck[b]) {
        sfx.ok();
        const m = [...matched, a, b];
        setMatched(m);
        setSparkle([a, b]);
        window.setTimeout(() => setSparkle([]), 700);
        if (m.length === deck.length) {
          const got = memorySnacks(moves + 1, pairs);
          window.setTimeout(() => onDone(got, got), 900);
        }
      } else sfx.no();
      setOpen([]);
      lock.current = false;
    }, 750);
  }
  return (
    <div className="gm-memory">
      <div className="gm-hud">
        <div className="gm-chip">👆 {moves}번</div>
        <div className="gm-chip big">
          ✅ {matched.length / 2} / {pairs}
        </div>
      </div>
      <div className={`gm-mgrid p${pairs}`}>
        {deck.map((s, i) => {
          const up = open.includes(i) || matched.includes(i);
          return (
            <button key={i} className={`gm-mc ${up ? 'up' : ''} ${matched.includes(i) ? 'ok' : ''} ${sparkle.includes(i) ? 'spark' : ''}`} onClick={() => flip(i)} aria-label={up ? s : '뒤집힌 카드'}>
              <span className="gm-mc-in">
                <span className="gm-mc-back">
                  <i>🐾</i>
                </span>
                <span className="gm-mc-front">
                  <img src={portrait(s)} alt="" draggable={false} />
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <div className="gm-tip">같은 친구 두 장을 찾아요 · 적게 뒤집을수록 간식이 많아요</div>
    </div>
  );
}

/* ───────── 체스 퀴즈 ───────── */
const MOVE_TIP: Record<PieceKind, string> = { rook: '룩은 가로·세로로 쭉 가요', bishop: '비숍은 비스듬히 쭉 가요', knight: '나이트는 ㄱ자(L)로 껑충 뛰어요', queen: '퀸은 룩과 비숍처럼 다 가요' };

function Chess({ level, onDone }: { level: QuizLevel; onDone: (n: number, s: number) => void }) {
  const hard = level === 'school';
  const kinder = !hard;
  const count = hard ? 6 : 5;
  const puzzles = useMemo<ChessPuzzle[]>(() => Array.from({ length: count }, () => makeChessPuzzle(hard)), [hard, count]);
  const [i, setI] = useState(0);
  const [right, setRight] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const p = puzzles[i];
  const hit = capturable(p);
  const text = `${PIECE_NAME[p.kind]}이 한 번에 잡을 수 있는 검은 말을 눌러요`;
  useEffect(() => {
    if (kinder && canSpeak()) speak(`${text}. ${MOVE_TIP[p.kind]}`);
    return () => stopSpeaking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);
  function choose(t: number) {
    if (picked !== null) return;
    setPicked(t);
    const ok = hit.includes(t);
    ok ? sfx.ok() : sfx.no();
    const nextRight = right + (ok ? 1 : 0);
    window.setTimeout(() => {
      if (i + 1 >= count) onDone(quizSnacks(nextRight, count), stars3(nextRight, count));
      else {
        setRight(nextRight);
        setI(i + 1);
        setPicked(null);
      }
    }, 2300);
  }
  const ok = picked !== null && hit.includes(picked);
  return (
    <div className="gm-chess">
      <div className="gm-prog">
        {puzzles.map((_, k) => (
          <i key={k} className={k < i ? 'done' : k === i ? 'now' : ''} />
        ))}
      </div>
      <div className="gm-qcard wide">
        <div className="gm-q">
          <span className="gm-glyph">{PIECE_GLYPH[p.kind]}</span> {text}
        </div>
        <div className="gm-sub">
          {MOVE_TIP[p.kind]}
          {hard && p.blockers.length > 0 ? ' · 흰 폰은 길을 막아요' : ''}
        </div>
        {canSpeak() && (
          <button className="gm-speak" onClick={() => speak(`${text}. ${MOVE_TIP[p.kind]}`)} aria-label="읽어 주기">
            🔊 {kinder ? '읽어 줘요' : ''}
          </button>
        )}
      </div>
      {canUse3D() ? (
        <Suspense fallback={<div className="gm-chess3d" />}>
          <ChessBoard3D puzzle={p} picked={picked} onPick={choose} />
        </Suspense>
      ) : (
        <Chess2D puzzle={p} picked={picked} hit={hit} onPick={choose} />
      )}
      <div className="gm-fb center" aria-live="polite">
        {picked === null ? '검은 말 중에서 하나를 눌러요' : ok ? '⭕ 정답! 잡았어요' : '❌ 초록 점이 갈 수 있는 칸이에요'}
      </div>
      {ok && <Confetti key={i} />}
    </div>
  );
}

/** 3D를 못 쓰는 기기를 위한 평면 체스판 */
function Chess2D({ puzzle: p, picked, hit, onPick }: { puzzle: ChessPuzzle; picked: number | null; hit: number[]; onPick: (i: number) => void }) {
  const occ = new Set([...p.targets, ...p.blockers].map((s) => `${s.r},${s.c}`));
  const shown = picked !== null ? new Set(reach(p.kind, p.me, occ).map((s) => `${s.r},${s.c}`)) : new Set<string>();
  const cells = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const k = `${r},${c}`;
      const ti = p.targets.findIndex((t) => t.r === r && t.c === c);
      const mine = p.me.r === r && p.me.c === c;
      const block = p.blockers.some((b) => b.r === r && b.c === c);
      cells.push(
        <button key={k} className={`cell ${(r + c) % 2 ? 'dk' : 'lt'} ${shown.has(k) ? 'reach' : ''} ${picked !== null && ti >= 0 ? (hit.includes(ti) ? 'right' : ti === picked ? 'wrong' : '') : ''}`} disabled={ti < 0 || picked !== null} onClick={() => onPick(ti)}>
          {mine ? <b className="mine">{PIECE_GLYPH[p.kind]}</b> : ti >= 0 ? <b className="foe">♟</b> : block ? <b className="ally">♙</b> : ''}
        </button>,
      );
    }
  }
  return <div className="pg-board gm-board2d">{cells}</div>;
}
