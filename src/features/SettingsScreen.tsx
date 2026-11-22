import { useState } from 'react';
import { Copy, Plus, Trash2 } from 'lucide-react';
import { Avatar } from '../components/Avatar';
import { Glyph, ICON_CHOICES } from '../components/Glyph';
import { PinGuard } from '../components/PinGuard';
import { QrCode } from '../components/QrCode';
import { useFamily } from '../FamilyContext';
import { saveSettings } from '../lib/db';
import { buildJoinLink } from '../lib/family';
import { hashPin, isValidPin } from '../lib/pin';
import type { CustomStatus, FamilySettings, Member, RoutineItem } from '../lib/types';
import { TIMED_CODES } from '../lib/work';

export function SettingsScreen() {
  return (
    <PinGuard title="설정은 부모 PIN이 필요해요">
      <SettingsBody />
    </PinGuard>
  );
}

function SettingsBody() {
  const { code, settings, leave } = useFamily();
  const [members, setMembers] = useState<Member[]>(settings.members);
  const [items, setItems] = useState<RoutineItem[]>(settings.routineItems);
  const [owner, setOwner] = useState(settings.workOwnerId ?? '');
  const [times, setTimes] = useState<Record<string, string>>(settings.workTimes ?? {});
  const [commute, setCommute] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(settings.commuteMinutes ?? {}).map(([k, v]) => [k, String(v)])),
  );
  const [newPin, setNewPin] = useState('');
  const [openIcon, setOpenIcon] = useState<number | null>(null);
  const [places, setPlaces] = useState<CustomStatus[]>(settings.customStatuses ?? []);
  const [openPlaceIcon, setOpenPlaceIcon] = useState<number | null>(null);
  const [msg, setMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const link = buildJoinLink(location.href, code);

  const setMember = (id: string, patch: Partial<Member>) =>
    setMembers(members.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  const setItem = (i: number, patch: Partial<RoutineItem>) =>
    setItems(items.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  async function save() {
    if (members.some((m) => !m.name.trim())) return setMsg('이름을 비워 둘 수 없어요');
    if (!members.some((m) => m.role === 'parent')) return setMsg('어른이 한 명 이상 있어야 해요');
    if (newPin && !isValidPin(newPin)) return setMsg('새 PIN은 숫자 4자리예요');
    const next: FamilySettings = {
      ...settings,
      members: members.map((m) => ({ ...m, name: m.name.trim() })),
      routineItems: items
        .filter((i) => i.label.trim())
        .map((i, n) => ({ ...i, label: i.label.trim(), key: i.key || `c${Date.now()}${n}` })),
      pinHash: newPin ? await hashPin(newPin, code) : settings.pinHash,
      workTimes: Object.fromEntries(
        Object.entries(times)
          .map(([k, v]) => [k, v.trim()] as const)
          .filter(([, v]) => v),
      ),
    };
    next.customStatuses = places
      .filter((pl) => pl.label.trim())
      .slice(0, 10)
      .map((pl, n) => ({ ...pl, label: pl.label.trim(), key: pl.key || `c${Date.now()}${n}` }));
    next.commuteMinutes = Object.fromEntries(
      Object.entries(commute)
        .map(([k, v]) => [k, Math.round(Number(v))] as const)
        .filter(([k, n]) => members.some((m) => m.id === k && m.role === 'parent') && Number.isFinite(n) && n > 0 && n <= 300),
    );
    // Firestore는 undefined 값을 저장할 수 없어서, 선택 안 했으면 항목 자체를 뺍니다.
    if (owner) next.workOwnerId = owner;
    else delete next.workOwnerId;
    void saveSettings(code, next);
    setNewPin('');
    setMsg('저장했어요');
  }

  return (
    <div className="screen">
      <div className="card">
        <h2>가족 구성원</h2>
        {members.map((m) => (
          <div className="row" key={m.id}>
            <Avatar member={m} size={44} />
            <input className="grow" value={m.name} maxLength={10} onChange={(e) => setMember(m.id, { name: e.target.value })} aria-label="이름" />
            <select value={m.role} onChange={(e) => setMember(m.id, { role: e.target.value as Member['role'] })} aria-label="역할">
              <option value="parent">어른</option>
              <option value="child">아이</option>
            </select>
          </div>
        ))}
      </div>

      <div className="card">
        <h2>루틴 항목 (아이 공통)</h2>
        {items.map((it, i) => (
          <div key={i}>
            <div className="row">
              <button className="icon-pick" onClick={() => setOpenIcon(openIcon === i ? null : i)} aria-label="아이콘 바꾸기">
                <Glyph k={it.emoji} size={22} />
              </button>
              <input className="grow" value={it.label} maxLength={8} placeholder="항목 이름" onChange={(e) => setItem(i, { label: e.target.value })} />
              <button className="btn inline" onClick={() => setItems(items.filter((_, j) => j !== i))} aria-label="삭제">
                <Trash2 size={20} strokeWidth={1.75} aria-hidden />
              </button>
            </div>
            {openIcon === i && (
              <div className="icon-grid" style={{ marginTop: 8 }}>
                {ICON_CHOICES.map((e) => (
                  <button
                    key={e}
                    className={e === it.emoji ? 'sel' : ''}
                    onClick={() => {
                      setItem(i, { emoji: e });
                      setOpenIcon(null);
                    }}
                  >
                    <Glyph k={e} size={22} />
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        {items.length < 8 && (
          <button className="btn" onClick={() => setItems([...items, { key: '', emoji: '📌', label: '' }])}>
            <Plus size={20} strokeWidth={2} aria-hidden />
            항목 추가
          </button>
        )}
      </div>

      <div className="card">
        <h2>자주 가는 곳</h2>
        <div className="sub">
          학원처럼 자주 가는 곳을 만들어 두면 상태 화면에 칩으로 나와요. 예: "피아노 학원 가는 중". 도착 시각을 정하는 곳이면 "도착 시각"을 켜 두세요.
        </div>
        {places.map((pl, i) => (
          <div key={i}>
            <div className="row">
              <button className="icon-pick" onClick={() => setOpenPlaceIcon(openPlaceIcon === i ? null : i)} aria-label="아이콘 바꾸기">
                <Glyph k={pl.emoji} size={22} />
              </button>
              <input
                className="grow"
                value={pl.label}
                maxLength={14}
                placeholder="예: 피아노 학원 가는 중"
                onChange={(e) => setPlaces(places.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
              />
              <button className="btn inline" onClick={() => setPlaces(places.filter((_, j) => j !== i))} aria-label="삭제">
                <Trash2 size={20} strokeWidth={1.75} aria-hidden />
              </button>
            </div>
            <label className="check">
              <input
                type="checkbox"
                checked={pl.eta}
                onChange={(e) => setPlaces(places.map((x, j) => (j === i ? { ...x, eta: e.target.checked } : x)))}
              />
              도착 시각 정하기
            </label>
            {openPlaceIcon === i && (
              <div className="icon-grid" style={{ marginTop: 8 }}>
                {ICON_CHOICES.map((e) => (
                  <button
                    key={e}
                    className={e === pl.emoji ? 'sel' : ''}
                    onClick={() => {
                      setPlaces(places.map((x, j) => (j === i ? { ...x, emoji: e } : x)));
                      setOpenPlaceIcon(null);
                    }}
                  >
                    <Glyph k={e} size={22} />
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        {places.length < 10 && (
          <button className="btn" onClick={() => setPlaces([...places, { key: '', emoji: '🎹', label: '', eta: true }])}>
            <Plus size={20} strokeWidth={2} aria-hidden />
            장소 추가
          </button>
        )}
      </div>

      <div className="card">
        <h2>근무표</h2>
        <label className="field">
          <span>근무표를 쓰는 사람</span>
          <select value={owner} onChange={(e) => setOwner(e.target.value)}>
            <option value="">선택 안 함</option>
            {members
              .filter((m) => m.role === 'parent')
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
          </select>
        </label>
        <div className="sub">코드별 근무 시간 (비워 두면 코드만 보여요. 예: 08:00~17:00)</div>
        {TIMED_CODES.map((c) => (
          <div className="row" key={c}>
            <span className="wk-code">{c}</span>
            <input
              className="grow"
              value={times[c] ?? ''}
              maxLength={15}
              placeholder="시간"
              onChange={(e) => setTimes({ ...times, [c]: e.target.value })}
            />
          </div>
        ))}
      </div>

      <div className="card">
        <h2>퇴근 후 집까지 걸리는 시간</h2>
        <div className="sub">
          "집에 가는 중"을 누르면 이 시간을 더해 도착 시각을 짐작해서 보여줘요. 위치를 읽는 것이 아니라 평소 시간 기준이에요. 비워 두면 짐작하지 않아요.
        </div>
        {members
          .filter((m) => m.role === 'parent')
          .map((m) => (
            <div className="row" key={m.id}>
              <Avatar member={m} size={40} />
              <span className="wk-code">{m.name}</span>
              <input
                className="grow"
                inputMode="numeric"
                maxLength={3}
                placeholder="분"
                value={commute[m.id] ?? ''}
                onChange={(e) => setCommute({ ...commute, [m.id]: e.target.value.replace(/\D/g, '') })}
                aria-label={`${m.name} 집까지 걸리는 시간(분)`}
              />
              <span className="sub">분</span>
            </div>
          ))}
      </div>

      <div className="card">
        <h2>부모 PIN 바꾸기</h2>
        <input inputMode="numeric" maxLength={4} placeholder="새 PIN 4자리 (안 바꾸면 비워 두세요)" value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))} />
      </div>

      <button className="btn primary sticky" onClick={save}>
        저장하기
      </button>
      {msg && <div className="toast">{msg}</div>}

      <div className="card">
        <h2>가족 링크</h2>
        <p className="sub">다른 기기에서 이 링크를 열면 같은 가족으로 연결돼요. 가족 밖에는 공유하지 마세요.</p>
        <QrCode link={link} />
        <div className="linkbox">{link}</div>
        <button
          className="btn"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(link);
              setCopied(true);
            } catch {
              window.prompt('이 링크를 복사하세요', link);
            }
          }}
        >
          <Copy size={20} strokeWidth={1.75} aria-hidden />
          {copied ? '복사했어요' : '링크 복사'}
        </button>
        <button
          className="btn no"
          onClick={() => {
            if (confirm('이 기기의 가족 연결을 끊을까요? (가족 데이터는 지워지지 않아요)')) leave();
          }}
        >
          이 기기 연결 끊기
        </button>
      </div>
    </div>
  );
}
