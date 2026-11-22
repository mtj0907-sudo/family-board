import { describe, expect, it } from 'vitest';
import { PILE_MAX, fxOf, isHeavy, labelOf, parseWeather, previewWeather, skyOf, stepPile, type Weather } from './weather';

const w = (over: Partial<Weather> = {}): Weather => ({ temp: 10, feels: 8, code: 0, windMs: 2, windDir: 270, isDay: true, hi: 14, lo: 4, pop: 10, at: 0, ...over });

describe('날씨 분류', () => {
  it('날씨 코드를 하늘 모습으로', () => {
    expect(skyOf(0)).toBe('clear');
    expect(skyOf(3)).toBe('cloudy');
    expect(skyOf(45)).toBe('fog');
    expect(skyOf(53)).toBe('drizzle');
    expect(skyOf(63)).toBe('rain');
    expect(skyOf(81)).toBe('rain');
    expect(skyOf(73)).toBe('snow');
    expect(skyOf(86)).toBe('snow');
    expect(skyOf(95)).toBe('thunder');
  });
  it('센 비·눈', () => {
    expect(isHeavy(65)).toBe(true);
    expect(isHeavy(61)).toBe(false);
  });
  it('이름표: 바람이 세면 덧붙인다', () => {
    expect(labelOf(w())).toBe('맑음');
    expect(labelOf(w({ isDay: false }))).toBe('맑은 밤');
    expect(labelOf(w({ code: 61, windMs: 7 }))).toBe('비 · 바람 강해요');
  });
});

describe('화면 효과', () => {
  it('비·눈·없음', () => {
    expect(fxOf(w({ code: 61 })).kind).toBe('rain');
    expect(fxOf(w({ code: 95 })).kind).toBe('rain');
    expect(fxOf(w({ code: 71 })).kind).toBe('snow');
    expect(fxOf(w({ code: 2 })).kind).toBe('none');
  });
  it('서풍이면 오른쪽으로, 동풍이면 왼쪽으로 날아간다', () => {
    expect(fxOf(w({ windMs: 10, windDir: 270 })).windDx).toBeGreaterThan(0.5);
    expect(fxOf(w({ windMs: 10, windDir: 90 })).windDx).toBeLessThan(-0.5);
    expect(Math.abs(fxOf(w({ windMs: 10, windDir: 0 })).windDx)).toBeLessThan(0.01);
  });
  it('낙엽은 5m/s부터, 많이는 8m/s부터', () => {
    expect(fxOf(w({ windMs: 4.9 })).leaves).toBe(false);
    expect(fxOf(w({ windMs: 5 })).leaves).toBe(true);
    expect(fxOf(w({ windMs: 8 })).gale).toBe(true);
  });
  it('눈은 쌓이고 그치면 녹으며 범위를 넘지 않는다', () => {
    expect(stepPile(0, true, false, 100)).toBeGreaterThan(0);
    expect(stepPile(PILE_MAX, true, true, 1000)).toBe(PILE_MAX);
    expect(stepPile(10, false, false, 1000)).toBe(0);
  });
  it('미리보기 날씨', () => {
    expect(fxOf(previewWeather('rain', null)).kind).toBe('rain');
    expect(fxOf(previewWeather('snow', null)).kind).toBe('snow');
    expect(fxOf(previewWeather('wind', null)).leaves).toBe(true);
  });
});

describe('parseWeather', () => {
  const ok = {
    current: { temperature_2m: 12.3, apparent_temperature: 10.1, weather_code: 3, wind_speed_10m: 4.2, wind_direction_10m: 250, is_day: 1 },
    daily: { temperature_2m_max: [15.2], temperature_2m_min: [6.1], precipitation_probability_max: [30] },
  };
  it('응답을 읽는다', () => {
    expect(parseWeather(ok, 5)).toEqual({ temp: 12.3, feels: 10.1, code: 3, windMs: 4.2, windDir: 250, isDay: true, hi: 15.2, lo: 6.1, pop: 30, at: 5 });
  });
  it('필요한 값이 없으면 null', () => {
    expect(parseWeather(null)).toBeNull();
    expect(parseWeather({ current: { temperature_2m: 1 } })).toBeNull();
  });
  it('일간 값이 없어도 현재 날씨는 읽는다', () => {
    const r = parseWeather({ current: ok.current });
    expect(r?.hi).toBeNull();
    expect(r?.temp).toBe(12.3);
  });
});
