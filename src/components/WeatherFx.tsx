import { useEffect, useRef } from 'react';
import { stepPile, type Fx } from '../lib/weather';

interface Drop { x: number; y: number; len: number; v: number }
interface Flake { x: number; y: number; r: number; v: number; ph: number }
interface Leaf { x: number; y: number; s: number; rot: number; spin: number; vx: number; ph: number; color: string }
interface Ripple { x: number; y: number; age: number }

const LEAF_COLORS = ['#c8742c', '#a8501f', '#d8a040', '#8a5a2b', '#b8862a'];
const rnd = (a: number, b: number) => a + Math.random() * (b - a);

/**
 * 거실 보드 위에 날씨 모습을 그립니다. 눌러도 아래 화면이 그대로 눌리도록 터치는 통과시킵니다.
 * 비: 빗방울과 바닥의 물결 / 눈: 내리다가 아래에 쌓임 / 바람: 낙엽이 불어가는 쪽으로 날아감
 */
export function WeatherFx({ fx, scale }: { fx: Fx; scale: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const fxRef = useRef(fx);
  fxRef.current = fx;
  const pile = useRef(0);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    let W = 0;
    let H = 0;
    const resize = () => {
      W = cv.clientWidth;
      H = cv.clientHeight;
      const k = Math.min(2.5, scale * (window.devicePixelRatio || 1));
      cv.width = Math.round(W * k);
      cv.height = Math.round(H * k);
      ctx.setTransform(k, 0, 0, k, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const drops: Drop[] = [];
    const flakes: Flake[] = [];
    const leaves: Leaf[] = [];
    const ripples: Ripple[] = [];
    let raf = 0;
    let last = performance.now();
    let t = 0;

    const newDrop = (top = false): Drop => ({ x: rnd(-60, W + 60), y: top ? rnd(-H * 0.2, 0) : rnd(0, H), len: rnd(12, 26), v: rnd(750, 1100) });
    const newFlake = (top = false): Flake => ({ x: rnd(-40, W + 40), y: top ? rnd(-20, 0) : rnd(0, H), r: rnd(1.6, 4.6), v: rnd(36, 80), ph: rnd(0, 6.28) });
    const newLeaf = (dir: number, edge = true): Leaf => ({
      x: edge ? (dir >= 0 ? rnd(-120, -10) : rnd(W + 10, W + 120)) : rnd(0, W),
      y: rnd(40, H - 40),
      s: rnd(9, 17),
      rot: rnd(0, 6.28),
      spin: rnd(-3, 3),
      vx: 0,
      ph: rnd(0, 6.28),
      color: LEAF_COLORS[Math.floor(Math.random() * LEAF_COLORS.length)],
    });

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (document.hidden) {
        last = now;
        return;
      }
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;
      const f = fxRef.current;
      ctx.clearRect(0, 0, W, H);

      // ── 비
      const wantDrops = f.kind === 'rain' ? (f.heavy ? 190 : 110) : 0;
      while (drops.length < wantDrops) drops.push(newDrop());
      if (drops.length > wantDrops) drops.length = wantDrops;
      if (drops.length) {
        const tilt = 0.12 + f.windDx * 0.5; // 가로로 얼마나 기울어 떨어지는지
        ctx.strokeStyle = 'rgba(70, 104, 140, .42)';
        ctx.lineWidth = 1.6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        for (const d of drops) {
          d.y += d.v * dt;
          d.x += d.v * tilt * dt;
          if (d.y > H - rnd(0, 14)) {
            if (ripples.length < 28 && Math.random() < 0.5) ripples.push({ x: d.x, y: H - rnd(2, 18), age: 0 });
            Object.assign(d, newDrop(true));
          }
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(d.x - tilt * d.len, d.y - d.len);
        }
        ctx.stroke();
      } else if (drops.length) drops.length = 0;
      // 바닥 물결
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.age += dt;
        if (r.age > 0.7) {
          ripples.splice(i, 1);
          continue;
        }
        ctx.strokeStyle = `rgba(70, 104, 140, ${0.35 * (1 - r.age / 0.7)})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(r.x, r.y, 4 + r.age * 22, 1.5 + r.age * 7, 0, 0, 6.28);
        ctx.stroke();
      }

      // ── 눈
      const snowing = f.kind === 'snow';
      pile.current = stepPile(pile.current, snowing, f.heavy, dt);
      const wantFlakes = snowing ? (f.heavy ? 150 : 80) : 0;
      while (flakes.length < wantFlakes) flakes.push(newFlake());
      if (flakes.length > wantFlakes) flakes.length = wantFlakes;
      if (flakes.length) {
        ctx.fillStyle = 'rgba(255,255,255,.97)';
        ctx.strokeStyle = 'rgba(110, 135, 160, .55)';
        ctx.lineWidth = 0.9;
        for (const s of flakes) {
          s.y += s.v * dt * (0.6 + s.r / 4);
          s.x += (Math.sin(t * 1.4 + s.ph) * 18 + f.windDx * 90) * dt;
          if (s.y > H + 6) Object.assign(s, newFlake(true));
          if (s.x > W + 50) s.x = -40;
          if (s.x < -50) s.x = W + 40;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, 6.28);
          ctx.fill();
          ctx.stroke();
        }
      }
      // 쌓인 눈
      if (pile.current > 0.5) {
        const lv = pile.current;
        ctx.beginPath();
        ctx.moveTo(0, H);
        for (let x = 0; x <= W; x += 12) {
          const bump = 0.75 + 0.25 * Math.sin(x * 0.021) + 0.15 * Math.sin(x * 0.067 + 1.3);
          ctx.lineTo(x, H - lv * bump);
        }
        ctx.lineTo(W, H);
        ctx.closePath();
        ctx.fillStyle = 'rgba(255,255,255,.98)';
        ctx.shadowColor = 'rgba(90, 115, 140, .35)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = -1;
        ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
      }

      // ── 바람: 낙엽
      const wantLeaves = f.leaves ? (f.gale ? 26 : 12) : 0;
      const dir = Math.abs(f.windDx) < 0.08 ? 1 : Math.sign(f.windDx);
      while (leaves.length < wantLeaves) leaves.push(newLeaf(dir, false));
      if (leaves.length > wantLeaves) leaves.length = wantLeaves;
      for (const l of leaves) {
        const speed = 90 + Math.abs(f.windDx) * 420 + (f.gale ? 80 : 0);
        l.vx = dir * speed * (0.7 + (l.s - 9) / 20);
        l.x += l.vx * dt;
        l.y += (Math.sin(t * 2.2 + l.ph) * 55 + 20) * dt;
        l.rot += l.spin * dt * (1 + speed / 300);
        if (l.x > W + 140 || l.x < -140 || l.y > H + 30) Object.assign(l, newLeaf(dir));
        ctx.save();
        ctx.translate(l.x, l.y);
        ctx.rotate(l.rot);
        ctx.fillStyle = l.color;
        ctx.beginPath();
        ctx.moveTo(0, -l.s);
        ctx.quadraticCurveTo(l.s * 0.75, 0, 0, l.s);
        ctx.quadraticCurveTo(-l.s * 0.75, 0, 0, -l.s);
        ctx.fill();
        ctx.strokeStyle = 'rgba(70, 40, 10, .45)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(0, -l.s);
        ctx.lineTo(0, l.s);
        ctx.stroke();
        ctx.restore();
      }
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [scale]);

  return <canvas ref={ref} className="weather-fx" aria-hidden />;
}

