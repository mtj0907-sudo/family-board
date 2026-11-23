import { Backpack, Check, CloudSun, ListChecks, PartyPopper, PawPrint, Maximize2, MessageCircleHeart, MonitorPlay, Pencil, Sun, Volume2, VolumeX, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Avatar, toneOf } from '../components/Avatar';
import { StatusScene } from '../components/StatusScene';
import { hasClayScene, sceneLookOf } from '../lib/characters';
import { presenceOf } from '../lib/presence';
import { Clock, type ClockMark } from '../components/Clock';
import { EtaTrack } from '../components/EtaTrack';
import { EventRow } from '../components/EventRow';
import { Glyph } from '../components/Glyph';
import { WorkChip } from '../components/WorkChip';
import { useFamily } from '../FamilyContext';
import { useColData, useDocData } from '../hooks/useFirestore';
import { ChristmasTree } from '../components/ChristmasTree';
import { SpecialFx } from '../components/SpecialFx';
import { TomorrowBar } from '../components/TomorrowBar';
import { cheerOf, previewSpecial, specialDayOf, treeSeason, weekStartCheer, type SpecialKind } from '../lib/specialDay';
import { tomorrowItems } from '../lib/tomorrow';
import { BoardFeed } from '../components/BoardFeed';
import { loadHidden, saveHidden } from '../lib/boardFeed';
import { WeatherCard, WeatherPending } from '../components/WeatherCard';
import { WeatherFx } from '../components/WeatherFx';
import { useBag } from '../hooks/useBag';
import { useWeather } from '../hooks/useWeather';
import { fxOf, previewWeather, type Preview } from '../lib/weather';
import { store } from '../lib/storage';
import { useNow } from '../hooks/useNow';
import { useWorkWindow } from '../hooks/useWork';
import { statusInfo } from '../lib/constants';
import { path, setRoutineDone } from '../lib/db';
import { addDays, eventsOn, type EventDoc } from '../lib/events';
import { alertText, pickAlerts } from '../lib/boardAlert';
import { isMuted, playChime, setMuted, unlockAudio } from '../lib/chime';
import { useKeepAwake } from '../lib/keepAwake';
import { hasFinal } from '../lib/korean';
import { routineProgress } from '../lib/routine';
import { dateKey, dayStart, formatElapsed } from '../lib/time';
import type { Member, MessageDoc, RoutineDoc, StatusDoc, WithId } from '../lib/types';
import { estimateEta } from '../lib/whenHome';
import { bagProgress } from '../lib/bag';
import { MemberSheet, TalkSheet, YoutubeSheet, type SheetTab } from './BoardSheets';
import { PetSheet } from './PetSheet';

/**
 * 보드는 높이 820px 기준으로 디자인하고, 눈에 보이는 화면 크기에 맞춰 통째로 확대/축소합니다.
 * (아이패드 Safari의 vh는 주소창 뒤까지 포함해서 더 커요. 그래서 vh 대신 실제로 보이는 크기를 px로 씁니다.)
 * 좁은 화면(폰)은 그대로 세로 스크롤입니다.
 */
const BOARD_REF_H = 820;
const BOARD_REF_W = 1180;
function boardBox() {
  const w = typeof window === 'undefined' ? BOARD_REF_W : window.innerWidth;
  const h = typeof window === 'undefined' ? BOARD_REF_H : window.innerHeight;
  // 높이·너비 중 더 빡빡한 쪽에 맞춰서, 어느 쪽으로도 기준보다 좁아지지 않게 합니다.
  const scale = w <= 820 ? 1 : Math.min(1.6, Math.max(0.6, Math.min(h / BOARD_REF_H, w / BOARD_REF_W)));
  return { scale, style: { width: w / scale, height: h / scale, transform: `scale(${scale})` } as const };
}
export function useBoardBox() {
  const [box, setBox] = useState(boardBox);
  useEffect(() => {
    const on = () => setBox(boardBox());
    window.addEventListener('resize', on);
    window.addEventListener('orientationchange', on);
    return () => {
      window.removeEventListener('resize', on);
      window.removeEventListener('orientationchange', on);
    };
  }, []);
  return box;
}

/**
 * 거실 아이패드용 큰 화면. 멀리서도 읽히게 글씨를 크게 하고,
 * 아이는 자기 카드의 그림 버튼으로 한마디를 보내거나 "엄마(아빠) 언제 와요?"를 눌러 볼 수 있습니다.
 */
export function BoardScreen({ onExit }: { onExit: () => void }) {
  const { code, members, settings, requirePin } = useFamily();
  const now = useNow(15000);
  const today = dateKey(now);
  const workOn = useWorkWindow(code, today);
  const statuses = useColData<StatusDoc>(path(code, 'status'));
  const routine = useDocData<RoutineDoc>(path(code, 'routines', today));
  const events = useColData<EventDoc>(path(code, 'events'));
  const msgs = useColData<MessageDoc>(path(code, 'messages'), { orderField: 'at', limitN: 60 });
  const awake = useKeepAwake();
  const box = useBoardBox();
  const [talk, setTalk] = useState<Member | null>(null);
  const photo = useDocData<{ data: string }>(path(code, 'media', 'board'));
  const [sheet, setSheet] = useState<{ member: Member; tab: SheetTab } | null>(null);
  const [ytOpen, setYtOpen] = useState(false);
  const [petFor, setPetFor] = useState<Member | null>(null);
  const bag = useBag(now);
  const [hiddenIds, setHiddenIds] = useState(loadHidden);
  const hiddenSet = new Set(hiddenIds);
  const { weather: realWeather, status: wStatus, error: wError, retry: wRetry } = useWeather();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [specialPreview, setSpecialPreview] = useState<SpecialKind | 'cheer' | null>(null);
  const [fxOn, setFxOn] = useState(() => store.get('fb.fx') !== '0');
  const reduceMotion = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const weather = preview ? previewWeather(preview, realWeather) : realWeather;
  const PREVIEWS: (Preview | null)[] = [null, 'rain', 'snow', 'wind'];
  const PREVIEW_NAME: Record<Preview, string> = { rain: '비', snow: '눈', wind: '바람' };
  const [toast, setToast] = useState('');
  const [news, setNews] = useState<WithId<MessageDoc> | null>(null);
  const [muted, setMutedState] = useState(isMuted);
  const mountedAt = useRef(Date.now() - 10000);
  const alerted = useRef(new Set<string>());
  const newsTimer = useRef<number | undefined>(undefined);
  const kids = members.filter((m) => m.role === 'child');

  function flash(text: string) {
    setToast(text);
    window.setTimeout(() => setToast(''), 2200);
  }

  // 아이패드는 사용자가 직접 누른 뒤에만 화면 켜두기를 허용하는 경우가 있어서, 화면 아무 곳이나 한 번 누르면 시작합니다.
  useEffect(() => {
    if (awake.method !== 'none') return;
    const go = () => awake.start();
    document.addEventListener('pointerdown', go, { once: true });
    return () => document.removeEventListener('pointerdown', go);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [awake.method]);

  const clockMarkList: ClockMark[] = members.flatMap((m) => {
    const eta = estimateEta(statuses.find((s) => s.id === m.id), settings.commuteMinutes?.[m.id]);
    return eta ? [{ id: m.id, name: m.name, at: eta.at }] : [];
  });
  // 새 한마디가 오면 화면에 크게 보여주고 소리를 냅니다 (보드를 연 뒤에 온 것만)
  useEffect(() => {
    const fresh = pickAlerts(msgs, { since: mountedAt.current, alerted: alerted.current });
    if (fresh.length === 0) return;
    fresh.forEach((m) => alerted.current.add(m.id));
    setNews(fresh[fresh.length - 1]);
    playChime();
    // 타이머는 화면이 갱신돼도 지워지지 않게 ref로 따로 들고 있습니다.
    window.clearTimeout(newsTimer.current);
    newsTimer.current = window.setTimeout(() => setNews(null), 9000);
  }, [msgs]);
  useEffect(() => () => window.clearTimeout(newsTimer.current), []);

  // 소리는 화면을 한 번 눌러야 낼 수 있어서, 누를 때마다 준비해 둡니다.
  useEffect(() => {
    document.addEventListener('pointerdown', unlockAudio);
    return () => document.removeEventListener('pointerdown', unlockAudio);
  }, []);

  const todays = eventsOn(events, today);
  const tomorrow = tomorrowItems(events, today, members);
  const special = specialPreview && specialPreview !== 'cheer' ? previewSpecial(specialPreview) : specialDayOf(now, events);
  const cheer = specialPreview === 'cheer' ? cheerOf(settings) : weekStartCheer(now, settings);
  const banner = special ? { emoji: special.emoji, text: special.text } : cheer ? { emoji: '🌟', text: cheer.text, detail: cheer.detail } : null;
  const familyWide = todays.filter((e) => e.who.length === 0);
  const todayMsgs = msgs.filter((m) => m.at >= dayStart(now));
  const pendingYoutube = todayMsgs.filter((m) => m.kind === 'youtube' && !m.reply);
  const nameOf = (id: string): Member | undefined => members.find((m) => m.id === id);

  return (
    <div className="board" style={box.style}>
      <div className="board-top">
      <div className="board-weather">
        {weather ? (
          <WeatherCard
            w={weather}
            preview={preview ? PREVIEW_NAME[preview] : undefined}
            onTap={() => setPreview(PREVIEWS[(PREVIEWS.indexOf(preview) + 1) % PREVIEWS.length])}
          />
        ) : (
          <WeatherPending status={wStatus === 'ok' ? 'loading' : wStatus} error={wError} onRetry={wRetry} />
        )}
      </div>
      <TomorrowBar items={tomorrow} variant="board" banner={banner} />
      <div className="board-ctl">
        {awake.method === 'none' ? (
          <button className="board-btn" onClick={awake.start}>
            <Sun size={18} strokeWidth={1.75} aria-hidden />
            화면 켜두기
          </button>
        ) : (
          <span className="board-note">
            <Sun size={16} strokeWidth={1.75} aria-hidden />
            화면 켜짐 유지 중
          </span>
        )}
        <button
          className="board-btn icon"
          onClick={() => {
            setMuted(!muted);
            setMutedState(!muted);
            unlockAudio();
          }}
          aria-label={muted ? '알림 소리 켜기' : '알림 소리 끄기'}
          aria-pressed={muted}
        >
          {muted ? <VolumeX size={18} strokeWidth={1.75} aria-hidden /> : <Volume2 size={18} strokeWidth={1.75} aria-hidden />}
        </button>
        <button
          className="board-btn icon"
          onClick={() => {
            const order: (SpecialKind | 'cheer' | null)[] = [null, 'birthday', 'christmas', 'newyear', 'kids', 'cheer'];
            const next = order[(order.indexOf(specialPreview) + 1) % order.length];
            setSpecialPreview(next);
            flash(next ? `특별한 날 미리보기: ${{ birthday: '생일', christmas: '크리스마스', newyear: '새해', kids: '어린이날', cheer: '새 한 주 응원' }[next]}` : '특별한 날 미리보기를 껐어요');
          }}
          aria-label="특별한 날 모습 미리보기"
          title="특별한 날 미리보기"
        >
          <PartyPopper size={18} strokeWidth={1.75} aria-hidden />
        </button>
        <button
          className="board-btn icon"
          onClick={() => {
            store.set('fb.fx', fxOn ? '0' : '1');
            setFxOn(!fxOn);
          }}
          aria-label={fxOn ? '날씨 효과 끄기' : '날씨 효과 켜기'}
          aria-pressed={!fxOn}
          style={fxOn ? undefined : { opacity: 0.55 }}
        >
          <CloudSun size={18} strokeWidth={1.75} aria-hidden />
        </button>
        {'requestFullscreen' in document.documentElement && (
          <button className="board-btn icon" onClick={() => void document.documentElement.requestFullscreen?.().catch(() => {})} aria-label="전체 화면">
            <Maximize2 size={18} strokeWidth={1.75} aria-hidden />
          </button>
        )}
        <button className="board-btn icon" onClick={() => requirePin(onExit)} aria-label="거실 보드 닫기 (부모 PIN)">
          <X size={20} strokeWidth={1.75} aria-hidden />
        </button>
      </div>
      </div>

      <aside className={photo?.data ? 'board-side has-photo' : 'board-side'} style={photo?.data ? { backgroundImage: `url("${photo.data}")` } : undefined}>
        <div className="clockwrap">
          <Clock size={180} stacked marks={clockMarkList} />
        </div>
        <div className="side-bottom">

        {pendingYoutube.length > 0 && (
          <button className="board-alert" onClick={() => requirePin(() => setYtOpen(true))}>
            <MonitorPlay size={26} strokeWidth={1.75} aria-hidden />
            <span>
              {youtubeAsker(pendingYoutube.map((m) => nameOf(m.from)?.name ?? ''))} 유튜브를 물어봤어요
              <small>눌러서 답하기 (부모 PIN)</small>
            </span>
          </button>
        )}

        {familyWide.length > 0 && (
          <div className="group">
            <div className="group-head">
              <h3>오늘 가족 일정</h3>
            </div>
            {familyWide.map((ev) => (
              <EventRow key={ev.id} ev={ev} />
            ))}
          </div>
        )}

        <BoardFeed
          msgs={msgs}
          members={members}
          now={now}
          hidden={hiddenSet}
          onHide={(id) => {
            const next = [...hiddenIds, id];
            setHiddenIds(next);
            saveHidden(next);
          }}
          onShowHidden={() => {
            setHiddenIds([]);
            saveHidden([]);
          }}
        />
        </div>
      </aside>

      <section className="board-grid" aria-label="가족 상태">
        {members.map((m) => (
          <BoardTile
            key={m.id}
            m={m}
            st={statuses.find((s: WithId<StatusDoc>) => s.id === m.id)}
            routine={routine ?? undefined}
            events={todays.filter((e) => e.who.includes(m.id) || e.pickupBy === m.id)}
            workOn={m.id === settings.workOwnerId ? workOn : undefined}
            now={now}
            onEdit={m.role === 'child' ? () => setSheet({ member: m, tab: 'status' }) : undefined}
            bagStat={
              m.role === 'child' && bag.schoolKids.includes(m.id)
                ? { ...bagProgress(bag.items, bag.bag?.done?.[m.id]), skip: !!bag.bag?.skip?.[m.id], onOpen: () => setSheet({ member: m, tab: 'bag' }) }
                : undefined
            }
            onTalk={m.role === 'parent' ? () => setTalk(m) : undefined}
            kid={
              m.role === 'child'
                ? {
                    onToggle: (key, value) => void setRoutineDone(code, today, m.id, key, value),
                    onTodo: () => setSheet({ member: m, tab: 'todo' }),
                    onPet: () => setPetFor(m),
                  }
                : undefined
            }
          />
        ))}
      </section>

      {special && fxOn && !reduceMotion && <SpecialFx kind={special.kind} scale={box.scale} />}
      {(special?.kind === 'christmas' || (!specialPreview && treeSeason(now))) && (
        <div className="xmas-corner">
          <ChristmasTree />
        </div>
      )}
      {weather && fxOn && !reduceMotion && <WeatherFx fx={fxOf(weather)} scale={box.scale} />}

      {news && (
        <div className="board-news" role="status" onClick={() => setNews(null)}>
          {nameOf(news.from) && <Avatar member={nameOf(news.from)!} size={64} />}
          <div className="news-text">
            <small>{nameOf(news.from)?.name}</small>
            <span>{alertText(news, members)}</span>
          </div>
        </div>
      )}
      {toast && <div className="board-toast">{toast}</div>}
      {sheet && <MemberSheet member={sheet.member} initial={sheet.tab} now={now} onClose={() => setSheet(null)} onFlash={flash} />}
      {petFor && <PetSheet kid={petFor} onClose={() => setPetFor(null)} />}
      {ytOpen && (
        <YoutubeSheet pending={pendingYoutube} members={members} answeredBy={members.find((m) => m.role === 'parent')?.id ?? ''} onClose={() => setYtOpen(false)} onFlash={flash} />
      )}
      {talk && (
        <TalkSheet
          parent={talk}
          kids={kids}
          st={statuses.find((x) => x.id === talk.id)}
          workCode={talk.id === settings.workOwnerId ? workOn(today) : undefined}
          workTimes={settings.workTimes}
          commuteMin={settings.commuteMinutes?.[talk.id]}
          now={now}
          onClose={() => setTalk(null)}
          onFlash={flash}
        />
      )}
    </div>
  );
}

/** "첫째가 유튜브를…" 처럼 이름 뒤에 이/가를 붙입니다. */
function youtubeAsker(names: string[]): string {
  const list = names.filter(Boolean);
  const last = list[list.length - 1] ?? '';
  return `${list.join('·')}${hasFinal(last) ? '이' : '가'}`;
}

export function BoardTile({
  m,
  st,
  routine,
  events,
  workOn,
  now,
  kid,
  onEdit,
  onTalk,
  bagStat,
}: {
  m: Member;
  st?: StatusDoc;
  routine?: RoutineDoc;
  /** 부모 카드: 눌러서 이야기하기 창 열기 */
  onTalk?: () => void;
  /** 눌러서 상태를 바꾸는 창 열기 (아이 카드) */
  onEdit?: () => void;
  /** 학교 가는 아이: 가방 챙기기 진행 */
  bagStat?: { done: number; total: number; complete: boolean; skip: boolean; onOpen: () => void };
  events: WithId<EventDoc>[];
  workOn?: (dateKey: string) => string | undefined;
  now: number;
  /** 아이 카드에만: 그림 버튼에 필요한 정보 */
  kid?: {
    onToggle: (itemKey: string, value: boolean) => void;
    onTodo: () => void;
    onPet: () => void;
  };
}) {
  const { settings } = useFamily();
  const def = st ? statusInfo(st) : undefined;
  const prog = routineProgress(settings.routineItems, routine?.done?.[m.id]);
  const today = dateKey(now);
  const eta = estimateEta(st, settings.commuteMinutes?.[m.id]);

  return (
    <article className={`btile${onTalk ? ' talkable' : ''}${m.role === 'parent' && st ? ' has-scene' : ''}${m.role === 'child' && st && hasClayScene(st.key, sceneLookOf(m)) ? ' has-kidscene' : ''}`} onClick={onTalk}>
      {m.role === 'parent' && st && (
        <div className={`btile-bg pres-${presenceOf(st)}`} aria-hidden>
          <StatusScene statusKey={st.key} look={sceneLookOf(m)} accent={toneOf(m.id).fg} />
          <div className="btile-fade" />
        </div>
      )}
      <header className="btile-head">
        <Avatar member={m} size={kid ? 68 : 56} />
        <div className="btile-who">
          <h2>{m.name}</h2>
          {st && def ? (
            <div className="btile-status">
              <Glyph k={def.emoji} size={28} />
              <span>{def.label}</span>
              <small>{formatElapsed(now - st.since)}</small>
            </div>
          ) : (
            <div className="btile-status sub">상태 없음</div>
          )}
        </div>
        {onEdit && (
          <button className="btile-edit" onClick={onEdit} aria-label={`${m.name} 상태 바꾸기`}>
            <Pencil size={18} strokeWidth={1.75} aria-hidden />
            바꾸기
          </button>
        )}
      </header>

      {eta ? (
        <EtaTrack member={m} eta={eta} now={now} big />
      ) : (
        def?.eta && <div className="sub et-none">도착 시각은 아직 안 정했어요</div>
      )}

      {m.role === 'child' && (
        <div className="btile-pips">
          {settings.routineItems.map((it) => {
            const on = !!routine?.done?.[m.id]?.[it.key];
            const cls = on ? 'pip big on' : 'pip big';
            // 아이가 보드에서 직접 눌러 체크할 수 있어요
            return kid ? (
              <button key={it.key} className={cls} onClick={() => kid.onToggle(it.key, !on)} aria-pressed={on} aria-label={`${it.label} ${on ? '완료' : '아직'}`}>
                <Glyph k={it.emoji} size={20} />
              </button>
            ) : (
              <span key={it.key} className={cls} aria-label={`${it.label} ${on ? '완료' : '아직'}`}>
                <Glyph k={it.emoji} size={20} />
              </span>
            );
          })}
          <span className="sub">
            {prog.done}/{prog.total}
          </span>
          {bagStat && (
            <button className={bagStat.complete ? 'bagchip on' : 'bagchip'} onClick={bagStat.onOpen} aria-label="가방 챙기기">
              {bagStat.complete ? <Check size={18} strokeWidth={2.25} aria-hidden /> : <Backpack size={18} strokeWidth={1.75} aria-hidden />}
              {bagStat.skip ? '쉬는 날' : `${bagStat.done}/${bagStat.total}`}
            </button>
          )}
          {kid && (
            <button className="bagchip" onClick={kid.onPet} aria-label="펫 키우기">
              <PawPrint size={18} strokeWidth={1.75} aria-hidden />
              펫
            </button>
          )}
          {kid && (
            <button className="bagchip" onClick={kid.onTodo} aria-label="할 일과 지금 하는 일">
              <ListChecks size={18} strokeWidth={1.75} aria-hidden />
              할 일
            </button>
          )}
        </div>
      )}

      {workOn && (
        <div className="btile-work">
          <span className="sub">근무</span>
          {workOn(today) ? <WorkChip code={workOn(today)!} times={settings.workTimes} /> : <span className="sub">등록 안 됨</span>}
          {[1, 2].map((n) => {
            const c = workOn(addDays(today, n));
            return (
              <span key={n} className="workpreview">
                <span className="sub">{n === 1 ? '내일' : '모레'}</span>
                {c ? <WorkChip code={c} /> : <span className="sub">-</span>}
              </span>
            );
          })}
        </div>
      )}

      {events.length > 0 && (
        <div className="btile-events">
          {events.slice(0, 1).map((ev) => (
            <EventRow key={ev.id} ev={ev} forMember={m} />
          ))}
          {events.length > 1 && <div className="sub">외 {events.length - 1}건</div>}
        </div>
      )}

      {m.role === 'child' && st && hasClayScene(st.key, sceneLookOf(m)) && (
        <div className="btile-kidscene" aria-hidden>
          <StatusScene statusKey={st.key} look={sceneLookOf(m)} accent={toneOf(m.id).fg} />
        </div>
      )}

      {onTalk && (
        <button className="talkhint" onClick={(e) => { e.stopPropagation(); onTalk(); }}>
          <MessageCircleHeart size={22} strokeWidth={1.75} aria-hidden />
          {m.name}에게 이야기하기
        </button>
      )}
    </article>
  );
}
