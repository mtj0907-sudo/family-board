/** 아주 작은 효과음 (WebAudio로 만들어요). 소리를 끌 수도 있어요. */
let ctx: AudioContext | null = null;
let muted = false;
try {
  muted = localStorage.getItem('pet-mute') === '1';
} catch {
  /* 저장소를 못 쓰면 켜 둔 채로 */
}
export const isMuted = () => muted;
export function setMuted(v: boolean) {
  muted = v;
  try {
    localStorage.setItem('pet-mute', v ? '1' : '0');
  } catch {
    /* ignore */
  }
}
function tone(freq: number, dur: number, type: OscillatorType = 'sine', gain = 0.1, when = 0) {
  if (muted) return;
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = ctx ?? new AC();
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  } catch {
    /* 소리가 안 나도 게임은 계속 */
  }
}
export const sfx = {
  ok: () => {
    tone(660, 0.12);
    tone(990, 0.2, 'sine', 0.1, 0.09);
  },
  no: () => {
    tone(220, 0.2, 'triangle', 0.1);
    tone(160, 0.3, 'triangle', 0.1, 0.12);
  },
  pop: () => tone(500 + Math.random() * 300, 0.08, 'triangle', 0.09),
  flip: () => tone(420, 0.05, 'square', 0.04),
  tick: () => tone(900, 0.04, 'square', 0.03),
  win: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, 'sine', 0.11, i * 0.11)),
};
