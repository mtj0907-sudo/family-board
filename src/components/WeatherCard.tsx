import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, Moon, Sun, Wind, type LucideIcon } from 'lucide-react';
import { WEATHER_PLACE, isWindy, labelOf, skyOf, type Sky, type Weather } from '../lib/weather';

const ICON: Record<Sky, LucideIcon> = { clear: Sun, cloudy: Cloud, fog: CloudFog, drizzle: CloudDrizzle, rain: CloudRain, snow: CloudSnow, thunder: CloudLightning };

export function WeatherIcon({ w, size = 28 }: { w: Weather; size?: number }) {
  const sky = skyOf(w.code);
  const Icon = sky === 'clear' && !w.isDay ? Moon : sky === 'cloudy' || sky === 'clear' ? (isWindy(w) && sky === 'clear' ? Wind : ICON[sky]) : ICON[sky];
  return <Icon size={size} strokeWidth={1.6} aria-hidden />;
}

const deg = (n: number) => `${Math.round(n)}°`;

/** 날씨 한 줄 (폰 오늘 화면) */
export function WeatherLine({ w }: { w: Weather }) {
  return (
    <div className="weather-line" aria-label={`${WEATHER_PLACE.name} 날씨 ${labelOf(w)} ${deg(w.temp)}`}>
      <WeatherIcon w={w} size={22} />
      <b>{deg(w.temp)}</b>
      <span>{labelOf(w)}</span>
      {w.lo !== null && w.hi !== null && (
        <span className="sub">
          {deg(w.lo)} / {deg(w.hi)}
        </span>
      )}
      {w.pop !== null && w.pop >= 30 && <span className="sub">☔ {Math.round(w.pop)}%</span>}
    </div>
  );
}

/** 거실 보드 날씨 카드. 누르면 비·눈·바람 모습을 미리 볼 수 있어요. */
export function WeatherCard({ w, preview, onTap }: { w: Weather; preview?: string; onTap?: () => void }) {
  return (
    <button className="weather-card" onClick={onTap} aria-label={`${WEATHER_PLACE.name} 날씨. 누르면 비, 눈, 바람 미리보기`}>
      <WeatherIcon w={w} size={40} />
      <span className="wc-main">
        <span className="wc-top">
          <b>{deg(w.temp)}</b>
          <span>{WEATHER_PLACE.name} · {labelOf(w)}</span>
        </span>
        <span className="sub">
          {preview ? `${preview} 미리보기 · 한 번 더 누르면 다음` : `체감 ${deg(w.feels)}${w.lo !== null && w.hi !== null ? ` · ${deg(w.lo)} / ${deg(w.hi)}` : ''}${w.pop !== null ? ` · 비·눈 ${Math.round(w.pop)}%` : ''}`}
        </span>
      </span>
    </button>
  );
}
