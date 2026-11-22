import { Check, Timer, X } from 'lucide-react';
import { useState } from 'react';
import { Avatar } from '../components/Avatar';
import { Glyph } from '../components/Glyph';
import { useFamily } from '../FamilyContext';
import { useColData } from '../hooks/useFirestore';
import { useNow } from '../hooks/useNow';
import {
  ARRIVAL_ROUTINE_KEY,
  QUICK_MESSAGES,
  YOUTUBE_ALLOW_MINUTES,
  YOUTUBE_MESSAGE,
  messageOf,
} from '../lib/constants';
import { answerYoutube, path, sendMessage, setRoutineDone, setStatus } from '../lib/db';
import { dateKey, dayStart, formatClock } from '../lib/time';
import type { MessageDoc, Member, WithId, YoutubeAnswer } from '../lib/types';

export function MessageScreen() {
  const { code, me, isParent } = useFamily();
  const now = useNow(30000);
  const all = useColData<MessageDoc>(path(code, 'messages'), { orderField: 'at', limitN: 60 });
  const today = all.filter((m) => m.at >= dayStart(now));
  return isParent ? <ParentView msgs={today} now={now} /> : <ChildView msgs={today} now={now} meId={me.id} />;
}

export function ChildView({ msgs, now, meId }: { msgs: WithId<MessageDoc>[]; now: number; meId: string }) {
  const { code } = useFamily();
  const [toast, setToast] = useState('');
  const mine = msgs.filter((m) => m.from === meId);
  const lastYoutube = mine.find((m) => m.kind === 'youtube');
  const waiting = !!lastYoutube && !lastYoutube.reply;

  function flash(text: string) {
    setToast(text);
    setTimeout(() => setToast(''), 2000);
  }

  function send(key: string) {
    void sendMessage(code, meId, 'quick', key);
    // "집에 왔어요"는 상태와 루틴(집 도착)에도 자동 반영
    if (key === 'arrived') {
      void setStatus(code, meId, 'home');
      void setRoutineDone(code, dateKey(Date.now()), meId, ARRIVAL_ROUTINE_KEY, true);
    }
    flash('보냈어요');
  }

  return (
    <div className="screen">
      {toast && <div className="toast">{toast}</div>}
      <div className="tiles">
        {QUICK_MESSAGES.map((q) => (
          <button key={q.key} className="tile" onClick={() => send(q.key)}>
            <Glyph k={q.emoji} size={34} />
            <span>{q.label}</span>
          </button>
        ))}
        <button
          className="tile wide"
          disabled={waiting}
          onClick={() => {
            void sendMessage(code, meId, 'youtube', YOUTUBE_MESSAGE.key);
            flash('엄마·아빠에게 물어봤어요');
          }}
        >
          <Glyph k={YOUTUBE_MESSAGE.emoji} size={34} />
          <span>{waiting ? '대답을 기다리는 중…' : YOUTUBE_MESSAGE.label}</span>
        </button>
      </div>

      {lastYoutube?.reply && <YoutubeResult reply={lastYoutube.reply} now={now} />}
    </div>
  );
}

function YoutubeResult({ reply, now }: { reply: NonNullable<MessageDoc['reply']>; now: number }) {
  if (reply.answer === 'yes')
    return (
      <div className="result ok">
        <Check size={28} strokeWidth={2} aria-hidden />
        유튜브 봐도 돼요
      </div>
    );
  if (reply.answer === 'no')
    return (
      <div className="result no">
        <X size={28} strokeWidth={2} aria-hidden />
        오늘은 안 돼요
      </div>
    );
  const until = reply.at + YOUTUBE_ALLOW_MINUTES * 60000;
  return now < until ? (
    <div className="result ok">
      <Timer size={28} strokeWidth={2} aria-hidden />
      {YOUTUBE_ALLOW_MINUTES}분만 봐요 · {formatClock(until)}까지
    </div>
  ) : (
    <div className="result no">
      <Timer size={28} strokeWidth={2} aria-hidden />
      시간이 끝났어요. 이제 그만 봐요
    </div>
  );
}

export function ParentView({ msgs, now }: { msgs: WithId<MessageDoc>[]; now: number }) {
  const { code, members, me, requirePin } = useFamily();
  const pending = msgs.filter((m) => m.kind === 'youtube' && !m.reply);
  const nameOf = (id: string): Member | undefined => members.find((m) => m.id === id);

  function answer(id: string, a: YoutubeAnswer) {
    requirePin(() => void answerYoutube(code, id, a, me.id));
  }

  return (
    <div className="screen">
      {pending.map((m) => {
        const who = nameOf(m.from);
        return (
          <div key={m.id} className="card ask">
            <div className="row">
              {who && <Avatar member={who} size={40} />}
              <div className="grow">
                <h3>{who?.name}: 유튜브 봐도 돼요?</h3>
                <div className="sub">{formatClock(m.at)}에 물어봤어요 · 응답에는 PIN이 필요해요</div>
              </div>
            </div>
            <div className="answers">
              <button className="btn primary" onClick={() => answer(m.id, 'yes')}>
                돼요
              </button>
              <button className="btn no" onClick={() => answer(m.id, 'no')}>
                안 돼요
              </button>
              <button className="btn" onClick={() => answer(m.id, '30')}>
                30분만
              </button>
            </div>
          </div>
        );
      })}

      <div className="group">
        <div className="group-head">
          <h3>오늘 온 한마디</h3>
        </div>
        {msgs.length === 0 && (
          <div className="group-empty sub">아직 없어요</div>
        )}
        {msgs.map((m) => {
          const who = nameOf(m.from);
          const q = messageOf(m.key);
          return (
            <div key={m.id} className="feed">
              {who && <Avatar member={who} size={36} />}
              <div className="grow">
                <b>{who?.name}</b> <span className="feed-text">{q?.label}</span>
                {m.reply && <div className="sub">→ {replyText(m.reply, now)}</div>}
              </div>
              <span className="sub">{formatClock(m.at)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function replyText(r: NonNullable<MessageDoc['reply']>, now: number) {
  if (r.answer === 'yes') return '돼요';
  if (r.answer === 'no') return '안 돼요';
  return now < r.at + YOUTUBE_ALLOW_MINUTES * 60000 ? '30분만' : '30분만 (끝남)';
}
