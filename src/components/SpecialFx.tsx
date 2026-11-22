import { useEffect, useRef } from 'react';
import type { SpecialKind } from '../lib/specialDay';

interface Piece { x: number; y: number; w: number; h: number; vy: number; ph: number; rot: number; spin: number; color: string }
interface Balloon { x: number; y: number; r: number; vy: number; ph: number; color: string }
interface Spark { x: number; y: number; vx: number; vy: number; life: number; color: string }

const COLORS = ['#ff5a7a', '#ffb02e', '#3ec6a8', '#5a8dff', '#b46cff', '#ffd23f'];
const rnd = (a: number, b: number) => a + Math.random() * (b - a);

/** 특별한 날 화면 효과. 생일·어린이날: 색종이와 풍선 / 새해: 불꽃놀이 / 크리스마스: 은은한 반짝임 */
export function SpecialFx({ kind, scale }: { kind: SpecialKind; scale: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext('2d');
    if (!cv || !ctx) return;
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

    const party = kind === 'birthday' || kind === 'kids';
    const pieces: Piece[] = [];
    const balloons: Balloon[] = [];
    const sparks: Spark[] = [];
    const twinkles: { x: number; y: number; ph: number; s: number }[] = [];
    const newPiece = (top = false): Piece => ({ x: rnd(0, W), y: top ? rnd(-30, 0) : rnd(0, H), w: rnd(6, 11), h: rnd(4, 7), vy: rnd(50, 120), ph: rnd(0, 6.28), rot: rnd(0, 6.28), spin: rnd(-4, 4), color: COLORS[Math.floor(Math.random() * COLORS.length)] });
    const newBalloon = (bottom = false): Balloon => ({ x: rnd(40, W - 40), y: bottom ? H + rnd(30, 120) : rnd(H * 0.3, H), r: rnd(22, 30), vy: rnd(28, 52), ph: rnd(0, 6.28), color: COLORS[Math.floor(Math.random() * COLORS.length)] });
    if (party) {
      for (let i = 0; i < 55; i++) pieces.push(newPiece());
      for (let i = 0; i < 6; i++) balloons.push(newBalloon());
    }
    if (kind === 'christmas') for (let i = 0; i < 26; i++) twinkles.push({ x: rnd(0, W), y: rnd(0, H), ph: rnd(0, 6.28), s: rnd(2, 4) });

    let raf = 0;
    let last = performance.now();
    let t = 0;
    let nextBurst = 0.4;
    const burst = () => {
      const cx = rnd(W * 0.15, W * 0.85);
      const cy = rnd(H * 0.12, H * 0.5);
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      for (let i = 0; i < 46; i++) {
        const a = (i / 46) * 6.283 + rnd(-0.05, 0.05);
        const v = rnd(120, 260);
        sparks.push({ x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, color });
      }
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (document.hidden) {
        last = now;
        return;
      }
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;
      ctx.clearRect(0, 0, W, H);

      for (const p of pieces) {
        p.y += p.vy * dt;
        p.x += Math.sin(t * 1.6 + p.ph) * 26 * dt;
        p.rot += p.spin * dt;
        if (p.y > H + 12) Object.assign(p, newPiece(true));
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.85;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      for (const b of balloons) {
        b.y -= b.vy * dt;
        const x = b.x + Math.sin(t * 0.9 + b.ph) * 18;
        if (b.y < -b.r * 3) Object.assign(b, newBalloon(true));
        ctx.strokeStyle = 'rgba(23,32,29,.35)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x, b.y + b.r * 1.15);
        ctx.quadraticCurveTo(x + 8, b.y + b.r * 2, x - 2, b.y + b.r * 3);
        ctx.stroke();
        ctx.fillStyle = b.color;
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.ellipse(x, b.y, b.r * 0.82, b.r, 0, 0, 6.283);
        ctx.fill();
        ctx.globalAlpha = 0.45;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(x - b.r * 0.3, b.y - b.r * 0.35, b.r * 0.16, b.r * 0.3, 0.5, 0, 6.283);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      if (kind === 'newyear') {
        nextBurst -= dt;
        if (nextBurst <= 0) {
          burst();
          nextBurst = rnd(0.7, 1.4);
        }
        for (let i = sparks.length - 1; i >= 0; i--) {
          const s = sparks[i];
          s.life -= dt * 0.75;
          if (s.life <= 0) {
            sparks.splice(i, 1);
            continue;
          }
          s.vy += 120 * dt;
          s.vx *= 0.985;
          const nx = s.x + s.vx * dt;
          const ny = s.y + s.vy * dt;
          ctx.strokeStyle = s.color;
          ctx.globalAlpha = Math.max(0, s.life);
          ctx.lineWidth = 3;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(nx - s.vx * 0.07, ny - s.vy * 0.07); // 꼬리를 길게 그려서 불꽃이 선으로 보이게
          ctx.lineTo(nx, ny);
          ctx.stroke();
          s.x = nx;
          s.y = ny;
        }
        ctx.globalAlpha = 1;
      }

      if (kind === 'christmas') {
        for (const w of twinkles) {
          const a = 0.5 + 0.5 * Math.sin(t * 2 + w.ph);
          ctx.globalAlpha = a * 0.9;
          ctx.fillStyle = '#e8b32b';
          const r = w.s * (0.6 + a * 0.6);
          ctx.beginPath();
          ctx.moveTo(w.x, w.y - r * 2);
          ctx.lineTo(w.x + r * 0.5, w.y - r * 0.5);
          ctx.lineTo(w.x + r * 2, w.y);
          ctx.lineTo(w.x + r * 0.5, w.y + r * 0.5);
          ctx.lineTo(w.x, w.y + r * 2);
          ctx.lineTo(w.x - r * 0.5, w.y + r * 0.5);
          ctx.lineTo(w.x - r * 2, w.y);
          ctx.lineTo(w.x - r * 0.5, w.y - r * 0.5);
          ctx.closePath();
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [kind, scale]);

  return <canvas ref={ref} className="special-fx" aria-hidden />;
}
