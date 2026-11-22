/** 대구 날씨. Open-Meteo(무료·키 없음)에서 가져오고, 위치는 가족 정보가 아닌 도시 중심 좌표만 씁니다. */
export const WEATHER_PLACE = { name: '대구', lat: 35.8714, lon: 128.6014 };

export type Sky = 'clear' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'thunder';

export interface Weather {
  temp: number;
  feels: number;
  code: number;
  /** 바람 세기 (m/s) */
  windMs: number;
  /** 바람이 불어오는 방향 (도, 북=0, 동=90) */
  windDir: number;
  isDay: boolean;
  hi: number | null;
  lo: number | null;
  /** 오늘 비·눈 올 확률 (%) */
  pop: number | null;
  at: number;
}

/** 이 세기(m/s) 이상이면 낙엽이 날립니다 */
export const WINDY_MS = 5;

export function skyOf(code: number): Sky {
  if (code <= 1) return 'clear';
  if (code <= 3) return 'cloudy';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 51 && code <= 57) return 'drizzle';
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if (code >= 95) return 'thunder';
  return 'cloudy';
}

/** 눈·비가 센 편인지 */
export const isHeavy = (code: number) => [65, 67, 75, 82, 86, 95, 96, 99].includes(code);

export const isWindy = (w: Pick<Weather, 'windMs'>) => w.windMs >= WINDY_MS;

const LABEL: Record<Sky, string> = {
  clear: '맑음',
  cloudy: '구름 많음',
  fog: '안개',
  drizzle: '이슬비',
  rain: '비',
  snow: '눈',
  thunder: '천둥번개',
};

export function labelOf(w: Weather): string {
  const sky = skyOf(w.code);
  const base = sky === 'clear' && !w.isDay ? '맑은 밤' : LABEL[sky];
  return isWindy(w) ? `${base} · 바람 강해요` : base;
}

export type FxKind = 'none' | 'rain' | 'snow';
export interface Fx {
  kind: FxKind;
  heavy: boolean;
  /** 가로 바람: -1(왼쪽으로) ~ 1(오른쪽으로) */
  windDx: number;
  leaves: boolean;
  /** 낙엽이 많이 날릴 만큼 센 바람 */
  gale: boolean;
}

/** 화면에 그릴 효과 */
export function fxOf(w: Weather): Fx {
  const sky = skyOf(w.code);
  const kind: FxKind = sky === 'drizzle' || sky === 'rain' || sky === 'thunder' ? 'rain' : sky === 'snow' ? 'snow' : 'none';
  // 바람은 "불어오는 방향"이라서, 물체는 그 반대쪽으로 날아갑니다. 서풍(270°)이면 오른쪽(동쪽)으로.
  const dx = -Math.sin((w.windDir * Math.PI) / 180);
  const strength = Math.min(1, w.windMs / 12);
  return {
    kind,
    heavy: isHeavy(w.code) || sky === 'thunder',
    windDx: dx * strength,
    leaves: isWindy(w),
    gale: w.windMs >= 8,
  };
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** Open-Meteo 응답을 우리가 쓰는 모양으로. 필요한 값이 없으면 null */
export function parseWeather(json: unknown, at = Date.now()): Weather | null {
  const j = json as { current?: Record<string, unknown>; daily?: Record<string, unknown[]> } | null;
  const c = j?.current;
  if (!c) return null;
  const temp = num(c.temperature_2m);
  const code = num(c.weather_code);
  if (temp === null || code === null) return null;
  const first = (k: string) => num(j?.daily?.[k]?.[0]);
  return {
    temp,
    feels: num(c.apparent_temperature) ?? temp,
    code,
    windMs: num(c.wind_speed_10m) ?? 0,
    windDir: num(c.wind_direction_10m) ?? 0,
    isDay: c.is_day !== 0,
    hi: first('temperature_2m_max'),
    lo: first('temperature_2m_min'),
    pop: first('precipitation_probability_max'),
    at,
  };
}

export function weatherUrl(): string {
  const q = new URLSearchParams({
    latitude: String(WEATHER_PLACE.lat),
    longitude: String(WEATHER_PLACE.lon),
    current: 'temperature_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,is_day',
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    timezone: 'Asia/Seoul',
    wind_speed_unit: 'ms',
    forecast_days: '1',
  });
  return `https://api.open-meteo.com/v1/forecast?${q}`;
}

/** 날씨를 가져옵니다. 실패하면 이유가 담긴 오류를 던져서, 화면에 원인을 보여줄 수 있게 합니다. */
export async function fetchWeather(signal?: AbortSignal): Promise<Weather> {
  const res = await fetch(weatherUrl(), { signal });
  if (!res.ok) throw new Error(`서버 응답 ${res.status}`);
  const w = parseWeather(await res.json());
  if (!w) throw new Error('날씨 값을 읽지 못함');
  return w;
}

export type WeatherStatus = 'loading' | 'ok' | 'error';

/** 눈·비·바람 모습을 미리 보여주기 위한 가짜 날씨 */
export type Preview = 'rain' | 'snow' | 'wind';
export function previewWeather(kind: Preview, base: Weather | null): Weather {
  const b: Weather = base ?? { temp: 12, feels: 10, code: 0, windMs: 2, windDir: 270, isDay: true, hi: 15, lo: 6, pop: 20, at: Date.now() };
  if (kind === 'rain') return { ...b, code: 63, windMs: 3, pop: 90 };
  if (kind === 'snow') return { ...b, code: 73, temp: -1, feels: -4, windMs: 2, pop: 90 };
  return { ...b, code: 1, windMs: 9, windDir: 290 };
}

/** 쌓인 눈 높이(px): 눈이 오면 서서히 쌓이고, 그치면 서서히 녹습니다. */
export const PILE_MAX = 34;
export function stepPile(level: number, snowing: boolean, heavy: boolean, dt: number): number {
  const rate = snowing ? (heavy ? PILE_MAX / 90 : PILE_MAX / 200) : -PILE_MAX / 240;
  return Math.min(PILE_MAX, Math.max(0, level + rate * dt));
}
