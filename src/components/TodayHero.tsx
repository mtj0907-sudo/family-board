import { useMemo } from 'react';
import { ChristmasTree } from './ChristmasTree';
import { Clock, type ClockMark } from './Clock';
import { Glyph } from './Glyph';
import { SpecialFx } from './SpecialFx';
import { WeatherFx } from './WeatherFx';
import { WeatherIcon, WeatherPending } from './WeatherCard';
import { useNow } from '../hooks/useNow';
import { heroTheme } from '../lib/heroTheme';
import { formatClock, formatDateKo } from '../lib/time';
import type { SpecialKind } from '../lib/specialDay';
import type { TomorrowItem } from '../lib/tomorrow';
import { fxOf, labelOf, type Weather, type WeatherStatus } from '../lib/weather';

export interface HeroBanner {
  emoji: string;
  text: string;
  detail?: string;
}

const deg = (n: number) => `${Math.round(n)}°`;

/**
 * 폰 오늘 화면 맨 위 카드. 시간대와 날씨에 따라 배경이 바뀌고, 시계·날씨·응원 문구·내일 일정이 한 장에 모여 있어요.
 * 비·눈·색종이 효과는 이 카드 안에서만 살짝 움직입니다.
 */
export function TodayHero({
  weather,
  wStatus,
  wError,
  onRetryWeather,
  banner,
  tomorrow,
  special,
  tree,
  marks,
  effects,
}: {
  weather: Weather | null;
  wStatus: WeatherStatus;
  wError: string;
  onRetryWeather: () => void;
  banner: HeroBanner | null;
  tomorrow: TomorrowItem[];
  special: SpecialKind | null;
  tree: boolean;
  marks: ClockMark[];
  /** 효과를 보여줄지 (끄기 설정·움직임 줄이기 반영) */
  effects: boolean;
}) {
  const now = useNow(15000);
  const theme = useMemo(() => heroTheme(now, weather), [now, weather]);
  const [ap, hm] = formatClock(now).split(' ');
  const fx = weather ? fxOf(weather) : null;
  const shown = tomorrow.slice(0, 2);
  const more = tomorrow.length - shown.length;

  return (
    <section className={`thero thero-${theme.name}${tree ? ' has-tree' : ''}`} style={{ background: theme.gradient }} aria-label="오늘">
      {effects && fx && <WeatherFx fx={fx} scale={1} pile={false} tone="light" />}
      {effects && special && <SpecialFx kind={special} scale={1} />}
      {theme.name === 'night' && (
        <>
          <i className="star" style={{ left: '12%', top: '14%' }} />
          <i className="star" style={{ left: '34%', top: '34%', opacity: 0.4 }} />
          <i className="star" style={{ left: '58%', top: '12%', opacity: 0.55 }} />
          <i className="star" style={{ left: '78%', top: '40%', opacity: 0.35 }} />
        </>
      )}
      <div className="thero-body">
        <div className="thero-top">
          <div className="thero-main">
            <div className="thero-hello">
              {theme.greeting} <span aria-hidden>{theme.emoji}</span>
            </div>
            <div className="thero-time">
              <small>{ap}</small>
              <b>{hm}</b>
            </div>
            <div className="thero-date">{formatDateKo(now)}</div>
          </div>
          <div className="thero-clock">
            <Clock size={86} digital={false} marks={marks} />
          </div>
        </div>

        <div className="thero-wx">
          {weather ? (
            <>
              <WeatherIcon w={weather} size={22} />
              <b>{deg(weather.temp)}</b>
              <span>{labelOf(weather)}</span>
              {weather.lo !== null && weather.hi !== null && (
                <span className="dim">
                  {deg(weather.lo)} / {deg(weather.hi)}
                </span>
              )}
              {weather.pop !== null && weather.pop >= 30 && <span className="dim">☔ {Math.round(weather.pop)}%</span>}
            </>
          ) : (
            <WeatherPending compact status={wStatus === 'ok' ? 'loading' : wStatus} error={wError} onRetry={onRetryWeather} />
          )}
        </div>

        <div className="thero-chips">
          {banner && (
            <div className="glass strong" role="status">
              <span aria-hidden>{banner.emoji}</span>
              <b>{banner.text}</b>
            </div>
          )}
          {banner?.detail && <div className="glass">{banner.detail}</div>}
          <div className="glass">
            <b>내일</b>
            {tomorrow.length === 0 ? (
              <span className="dim">일정이 없어요</span>
            ) : (
              <>
                {shown.map((it) => (
                  <span key={it.id} className="g-item">
                    <Glyph k={it.emoji} size={16} />
                    <span>{it.time}</span>
                    <b>{it.title}</b>
                    {it.who && <small>{it.who}</small>}
                  </span>
                ))}
                {more > 0 && <span className="dim">외 {more}건</span>}
              </>
            )}
          </div>
        </div>
      </div>
      {tree && (
        <div className="thero-tree" aria-hidden>
          <ChristmasTree size={160} />
        </div>
      )}
    </section>
  );
}
