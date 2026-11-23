/** 글을 아직 잘 못 읽는 아이를 위해 문제를 소리 내어 읽어 줘요 */
const SAY: [RegExp, string][] = [
  [/\p{Extended_Pictographic}|️|‍/gu, ' '],
  [/☐/g, '빈칸'],
  [/×/g, ' 곱하기 '],
  [/÷/g, ' 나누기 '],
  [/[−-]/g, ' 빼기 '],
  [/\+/g, ' 더하기 '],
  [/=/g, ' 는 '],
  [/\?/g, ' 일까요 '],
  [/❓/g, ' 빈칸 '],
];
export function speakable(text: string): string {
  let t = text;
  for (const [re, to] of SAY) t = t.replace(re, to);
  return t.replace(/\s+/g, ' ').trim();
}
export function canSpeak(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}
export function speak(text: string) {
  if (!canSpeak()) return;
  try {
    const u = new SpeechSynthesisUtterance(speakable(text));
    u.lang = 'ko-KR';
    u.rate = 0.88;
    u.pitch = 1.15;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch {
    /* ignore */
  }
}
export function stopSpeaking() {
  try {
    window.speechSynthesis?.cancel();
  } catch {
    /* ignore */
  }
}
