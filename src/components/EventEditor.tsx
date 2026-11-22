import { useState } from 'react';
import { useFamily } from '../FamilyContext';
import { deleteEvent, saveEvent } from '../lib/db';
import { REPEAT_OPTIONS, type EventDoc, type Repeat } from '../lib/events';
import type { WithId } from '../lib/types';
import { Avatar } from './Avatar';
import { Glyph, ICON_CHOICES } from './Glyph';

interface Props {
  initial?: WithId<EventDoc>;
  defaultDate: string;
  onClose: () => void;
}

/** 일정 추가/수정 시트 (부모용) */
export function EventEditor({ initial, defaultDate, onClose }: Props) {
  const { code, members } = useFamily();
  const [emoji, setEmoji] = useState(initial?.emoji ?? '📌');
  const [title, setTitle] = useState(initial?.title ?? '');
  const [date, setDate] = useState(initial?.date ?? defaultDate);
  const [time, setTime] = useState(initial?.time ?? '');
  const [endTime, setEndTime] = useState(initial?.endTime ?? '');
  const [who, setWho] = useState<string[]>(initial?.who ?? []);
  const [pickupBy, setPickupBy] = useState(initial?.pickupBy ?? '');
  const [repeat, setRepeat] = useState<Repeat>(initial?.repeat ?? 'none');
  const [error, setError] = useState('');

  const toggleWho = (id: string) => setWho(who.includes(id) ? who.filter((w) => w !== id) : [...who, id]);

  function save() {
    if (!title.trim()) return setError('일정 이름을 적어 주세요');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return setError('날짜를 골라 주세요');
    if (endTime && !time) return setError('끝나는 시간을 쓰려면 시작 시간을 먼저 정해 주세요');
    if (endTime && time && endTime <= time) return setError('끝나는 시간이 시작보다 빨라요');
    void saveEvent(code, initial?.id ?? null, {
      title: title.trim(),
      emoji,
      date,
      time,
      // Firestore는 undefined를 저장할 수 없어서, 비어 있으면 항목 자체를 뺍니다.
      ...(endTime ? { endTime } : {}),
      who,
      pickupBy,
      repeat,
    });
    onClose();
  }

  function remove() {
    if (!initial) return;
    const msg =
      initial.repeat === 'none'
        ? '이 일정을 지울까요?'
        : '반복 일정이에요. 지우면 모든 날짜에서 사라져요. 지울까요?';
    if (confirm(msg)) {
      void deleteEvent(code, initial.id);
      onClose();
    }
  }

  return (
    <div className="modal top">
      <div className="card sheet">
        <h2>{initial ? '일정 고치기' : '일정 추가'}</h2>

        <div className="icon-grid" role="group" aria-label="아이콘 고르기">
          {ICON_CHOICES.map((e) => (
            <button key={e} className={e === emoji ? 'sel' : ''} onClick={() => setEmoji(e)} aria-pressed={e === emoji}>
              <Glyph k={e} size={22} />
            </button>
          ))}
        </div>

        <label className="field">
          <span>일정 이름</span>
          <input value={title} maxLength={20} placeholder="예: 학예회, 치과" onChange={(e) => setTitle(e.target.value)} />
        </label>

        <div className="row">
          <label className="field grow">
            <span>날짜</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="field grow">
            <span>시작 (비우면 종일)</span>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </label>
          <label className="field grow">
            <span>끝 (선택)</span>
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </label>
        </div>

        <div className="field">
          <span>누구 일정이에요? (고르지 않으면 가족 전체)</span>
          <div className="picker wrap">
            {members.map((m) => (
              <button key={m.id} className={who.includes(m.id) ? 'pick on' : 'pick'} onClick={() => toggleWho(m.id)} aria-pressed={who.includes(m.id)}>
                <Avatar member={m} size={38} />
                {m.name}
              </button>
            ))}
          </div>
        </div>

        <label className="field">
          <span>데리러 갈 사람</span>
          <select value={pickupBy} onChange={(e) => setPickupBy(e.target.value)}>
            <option value="">없음</option>
            {members
              .filter((m) => m.role === 'parent')
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
          </select>
        </label>

        <label className="field">
          <span>반복</span>
          <select value={repeat} onChange={(e) => setRepeat(e.target.value as Repeat)}>
            {REPEAT_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        {error && <div className="error">{error}</div>}
        <button className="btn primary" onClick={save}>
          저장
        </button>
        <button className="btn" onClick={onClose}>
          취소
        </button>
        {initial && (
          <button className="btn no" onClick={remove}>
            지우기
          </button>
        )}
      </div>
    </div>
  );
}
