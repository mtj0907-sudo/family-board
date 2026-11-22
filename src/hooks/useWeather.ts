import { useEffect, useState } from 'react';
import { store } from '../lib/storage';
import { fetchWeather, type Weather } from '../lib/weather';

const KEY = 'fb.weather';
const REFRESH_MS = 15 * 60000;
const STALE_MS = 3 * 3600000;

function cached(): Weather | null {
  try {
    const w = JSON.parse(store.get(KEY) ?? 'null') as Weather | null;
    return w && Date.now() - w.at < STALE_MS ? w : null;
  } catch {
    return null;
  }
}

/** 대구 날씨. 15분마다 새로 가져오고, 인터넷이 잠깐 끊겨도 마지막 값(3시간 이내)을 보여줍니다. */
export function useWeather(): Weather | null {
  const [w, setW] = useState<Weather | null>(cached);
  useEffect(() => {
    const ctrl = new AbortController();
    const load = () =>
      fetchWeather(ctrl.signal)
        .then((r) => {
          if (!r) return;
          store.set(KEY, JSON.stringify(r));
          setW(r);
        })
        .catch(() => {});
    load();
    const t = window.setInterval(load, REFRESH_MS);
    const vis = () => {
      if (document.visibilityState === 'visible') load();
    };
    document.addEventListener('visibilitychange', vis);
    return () => {
      ctrl.abort();
      window.clearInterval(t);
      document.removeEventListener('visibilitychange', vis);
    };
  }, []);
  return w;
}
