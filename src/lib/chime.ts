import { store } from './storage';

const MUTE_KEY = 'fb.boardMute';
let ctx: AudioContext | null = null;

/** iOS는 화면을 한 번 눌러야 소리를 낼 수 있어서, 보드를 누를 때마다 준비해 둡니다. */
export function unlockAudio(): void {
  try {
    const Ctor: typeof AudioContext | undefined =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    ctx ??= new Ctor();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    /* 소리를 못 내도 화면 알림은 그대로 */
  }
}

export const isMuted = () => store.get(MUTE_KEY) === '1';
export function setMuted(muted: boolean) {
  if (muted) store.set(MUTE_KEY, '1');
  else store.remove(MUTE_KEY);
}

/** 부드러운 두 음 알림소리 */
export function playChime(): void {
  if (isMuted() || !ctx || ctx.state !== 'running') return;
  const c = ctx;
  const t0 = c.currentTime;
  [
    { f: 880, at: 0 },
    { f: 1318.5, at: 0.16 },
  ].forEach(({ f, at }) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = f;
    gain.gain.setValueAtTime(0.0001, t0 + at);
    gain.gain.exponentialRampToValueAtTime(0.18, t0 + at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + at + 0.45);
    osc.connect(gain).connect(c.destination);
    osc.start(t0 + at);
    osc.stop(t0 + at + 0.5);
  });
}
