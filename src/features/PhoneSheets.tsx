import { Check } from 'lucide-react';
import { useState } from 'react';
import { Avatar } from '../components/Avatar';
import { Portal } from '../components/Portal';
import { ProgressBar } from '../components/ProgressBar';
import { useFamily } from '../FamilyContext';
import { useColData } from '../hooks/useFirestore';
import { useNotify } from '../hooks/useNotify';
import { useNow } from '../hooks/useNow';
import { useWorkWindow } from '../hooks/useWork';
import { ASK_WHEN_MESSAGE } from '../lib/constants';
import { path, sendMessage } from '../lib/db';
import { dateKey } from '../lib/time';
import type { StatusDoc } from '../lib/types';
import { whenHome } from '../lib/whenHome';

/** "언제 와요?" 창: 다른 어른들의 도착 시각을 보여주고, 모를 때는 물어볼 수 있어요. */
export function PhoneWhenSheet({ onClose }: { onClose: () => void }) {
  const { code, members, me, settings } = useFamily();
  const notify = useNotify();
  const now = useNow(15000);
  const statuses = useColData<StatusDoc>(path(code, 'status'));
  const workOn = useWorkWindow(code, dateKey(now));
  const [asked, setAsked] = useState<string[]>([]);
  const others = members.filter((m) => m.role === 'parent' && m.id !== me.id);

  return (
    <Portal>
    <div className="modal sheet-bottom" onClick={onClose}>
      <div className="phone-sheet" role="dialog" aria-label="언제 와요" onClick={(e) => e.stopPropagation()}>
        <h2>언제 와요?</h2>
        {others.length === 0 && <div className="sub">물어볼 어른이 없어요</div>}
        {others.map((p) => {
          const a = whenHome({
            name: p.name,
            st: statuses.find((s) => s.id === p.id),
            now,
            workCode: p.id === settings.workOwnerId ? workOn(dateKey(now)) : undefined,
            workTimes: settings.workTimes,
            commuteMin: settings.commuteMinutes?.[p.id],
          });
          const done = asked.includes(p.id);
          return (
            <div key={p.id} className="ws-card">
              <div className="row">
                <Avatar member={p} size={46} />
                <div className="grow">
                  <b>{a.headline}</b>
                  {a.eta && <div className="ws-big">{a.eta.text}</div>}
                  {a.eta && <div className="sub">{a.eta.clockLabel}</div>}
                </div>
              </div>
              {a.eta && <ProgressBar value={a.eta.ratio} label="도착까지" />}
              {a.details.map((d) => (
                <div key={d} className="sub">
                  {d}
                </div>
              ))}
              {done ? (
                <div className="ws-done">
                  <Check size={20} strokeWidth={2.25} aria-hidden />
                  {p.name}에게 물어봤어요
                </div>
              ) : (
                a.canAsk && (
                  <button
                    className="btn primary"
                    onClick={() => {
                      void sendMessage(code, me.id, 'quick', ASK_WHEN_MESSAGE.key, p.id);
                      notify('message', me.name, `${p.name}에게 ${ASK_WHEN_MESSAGE.label}`);
                      setAsked([...asked, p.id]);
                    }}
                  >
                    {p.name}에게 물어보기
                  </button>
                )
              )}
            </div>
          );
        })}
        <button className="btn" onClick={onClose}>
          닫기
        </button>
      </div>
    </div>
    </Portal>
  );
}
