import { kst } from './time';
import { skyOf, type Weather } from './weather';

export interface HeroTheme {
  name: 'dawn' | 'day' | 'evening' | 'night' | 'rain' | 'snow';
  gradient: string;
  /** 예: "일요일 저녁이에요" */
  greeting: string;
  emoji: string;
}

const DOW = ['일', '월', '화', '수', '목', '금', '토'];

const GRADIENT: Record<HeroTheme['name'], string> = {
  dawn: 'linear-gradient(160deg, #4d4a7a 0%, #a9638a 55%, #d98b6e 100%)',
  day: 'linear-gradient(160deg, #2a67a0 0%, #3f86bd 55%, #5aa0cf 100%)',
  evening: 'linear-gradient(160deg, #3a3a6e 0%, #8a4f7f 55%, #d98264 100%)',
  night: 'linear-gradient(160deg, #1c2b3b 0%, #2d4a5e 60%, #3b6070 100%)',
  rain: 'linear-gradient(160deg, #34434f 0%, #4c5f6e 55%, #6a7f8d 100%)',
  snow: 'linear-gradient(160deg, #4e6680 0%, #6f8aa5 55%, #8fa9c2 100%)',
};

/** 시간대(와 비·눈)에 맞는 맨 위 카드의 배경과 인사말 */
export function heroTheme(now: number, w: Weather | null): HeroTheme {
  const t = kst(now);
  const h = t.hh;
  const word = h >= 5 && h < 11 ? '아침' : h >= 11 && h < 14 ? '점심' : h >= 14 && h < 18 ? '오후' : h >= 18 && h < 22 ? '저녁' : '밤';
  const emoji = h >= 5 && h < 11 ? '☀️' : h >= 11 && h < 18 ? '🌤️' : h >= 18 && h < 22 ? '🌇' : '🌙';
  const base: HeroTheme['name'] = h >= 5 && h < 9 ? 'dawn' : h >= 9 && h < 17 ? 'day' : h >= 17 && h < 20 ? 'evening' : 'night';
  const sky = w ? skyOf(w.code) : 'clear';
  const name: HeroTheme['name'] = sky === 'rain' || sky === 'drizzle' || sky === 'thunder' ? 'rain' : sky === 'snow' ? 'snow' : base;
  return { name, gradient: GRADIENT[name], greeting: `${DOW[t.dow]}요일 ${word}이에요`, emoji };
}
