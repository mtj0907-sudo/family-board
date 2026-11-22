import { useCallback, useEffect, useRef, useState } from 'react';
import { store } from '../lib/storage';
import { fetchWeather, type Weather, type WeatherStatus } from '../lib/weather';

const KEY = 'fb.weather';
const REFRESH_MS = 15 * 60000;
const RETRY_MS = 60000;
const STALE_MS = 3 * 3600000;

function cached(): Weather | null {
  try {
    const w = JSON.parse(store.get(KEY) ?? 'null') as Weather | null;
    return w && Date.now() - w.at < STALE_MS ? w : null;
  } catch {
    return null;
  }
}

export interface WeatherState {
  weather: Weather | null;
  status: WeatherStatus;
  /** 실패했을 때 이유 (화면에 보여줌) */
  error: string;
  retry: () => void;
}

/** 대구 날씨. 15분마다 새로 가져오고(실패하면 1분 뒤 다시), 인터넷이 잠깐 끊겨도 마지막 값(3시간 이내)을 보여줍니다. */
export function useWeather(): WeatherState {
  const [weather, setWeather] = useState<Weather | null>(cached);
  const [status, setStatus] = useState<WeatherStatus>(weather ? 'ok' : 'loading');
  const [error, setError] = useState('');
  const timer = useRef<number | undefined>(undefined);
  const alive = useRef(true);

  const load = useCallback(() => {
    window.clearTimeout(timer.current);
    fetchWeather()
      .then((w) => {
        if (!alive.current) return;
        store.set(KEY, JSON.stringify(w));
        setWeather(w);
        setStatus('ok');
        setError('');
        timer.current = window.setTimeout(load, REFRESH_MS);
      })
      .catch((e: unknown) => {
        if (!alive.current) return;
        setError(e instanceof Error && e.message ? e.message : '인터넷 연결 확인');
        setStatus((s) => (s === 'ok' ? 'ok' : 'error')); // 이미 보여줄 값이 있으면 그대로 둡니다
        timer.current = window.setTimeout(load, RETRY_MS);
      });
  }, []);

  useEffect(() => {
    alive.current = true;
    load();
    const vis = () => {
      if (document.visibilityState === 'visible') load();
    };
    document.addEventListener('visibilitychange', vis);
    return () => {
      alive.current = false;
      window.clearTimeout(timer.current);
      document.removeEventListener('visibilitychange', vis);
    };
  }, [load]);

  return { weather, status, error, retry: load };
}
