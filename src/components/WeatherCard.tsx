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

/** 거실 보드 위쪽 날씨 알약. 사진을 가리지 않게 한 줄로 작게 두고, 누르면 비·눈·바람 미리보기. */
export function WeatherCard({ w, preview, onTap }: { w: Weather; preview?: string; onTap?: () => void }) {
  return (
    <button className="weather-card" onClick={onTap} aria-label={`${WEATHER_PLACE.name} 날씨. 누르면 비, 눈, 바람 미리보기`}>
      <WeatherIcon w={w} size={24} />
      <b>{deg(w.temp)}</b>
      <span className="wc-label">{preview ? `${preview} 미리보기` : labelOf(w)}</span>
      {!preview && w.lo !== null && w.hi !== null && (
        <span className="sub">
          {deg(w.lo)} / {deg(w.hi)}
        </span>
      )}
      {!preview && w.pop !== null && w.pop >= 30 && <span className="sub">☔ {Math.round(w.pop)}%</span>}
    </button>
  );
}

/** 날씨를 아직 못 받았을 때의 알림. 이유를 보여주고, 누르면 다시 시도합니다. */
export function WeatherPending({ status, error, onRetry, compact }: { status: 'loading' | 'error'; error: string; onRetry: () => void; compact?: boolean }) {
  const text = status === 'loading' ? '날씨 불러오는 중…' : `날씨를 못 불러왔어요 (${error}) · 눌러서 다시`;
  return compact ? (
    <button className="weather-line pending" onClick={onRetry}>
      <Cloud size={20} strokeWidth={1.6} aria-hidden />
      <span>{text}</span>
    </button>
  ) : (
    <button className="weather-card pending" onClick={onRetry}>
      <Cloud size={22} strokeWidth={1.6} aria-hidden />
      <span className="wc-label">{text}</span>
    </button>
  );
}
