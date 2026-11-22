import { useState } from 'react';
import { PinGuard } from '../components/PinGuard';
import { QrCode } from '../components/QrCode';
import { useFamily } from '../FamilyContext';
import { EMOJI_CHOICES } from '../lib/constants';
import { saveSettings } from '../lib/db';
import { buildJoinLink } from '../lib/family';
import { hashPin, isValidPin } from '../lib/pin';
import type { FamilySettings, Member, RoutineItem } from '../lib/types';

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
  const [newPin, setNewPin] = useState('');
  const [openEmoji, setOpenEmoji] = useState<string | null>(null);
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
    };
    void saveSettings(code, next);
    setNewPin('');
    setMsg('저장했어요 ✅');
  }

  return (
    <div className="screen">
      <div className="card">
        <h2>👪 가족 구성원</h2>
        {members.map((m) => (
          <div key={m.id}>
            <div className="row">
              <button className="avatar sm btnreset" onClick={() => setOpenEmoji(openEmoji === m.id ? null : m.id)}>
                {m.emoji}
              </button>
              <input className="grow" value={m.name} maxLength={10} onChange={(e) => setMember(m.id, { name: e.target.value })} />
              <select value={m.role} onChange={(e) => setMember(m.id, { role: e.target.value as Member['role'] })}>
                <option value="parent">어른</option>
                <option value="child">아이</option>
              </select>
            </div>
            {openEmoji === m.id && (
              <div className="emoji-grid">
                {EMOJI_CHOICES.map((e) => (
                  <button
                    key={e}
                    className="btnreset"
                    onClick={() => {
                      setMember(m.id, { emoji: e });
                      setOpenEmoji(null);
                    }}
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="card">
        <h2>✅ 루틴 항목 (아이 공통)</h2>
        {items.map((it, i) => (
          <div className="row" key={i}>
            <input className="emoji-in" value={it.emoji} maxLength={4} onChange={(e) => setItem(i, { emoji: e.target.value })} />
            <input className="grow" value={it.label} maxLength={8} onChange={(e) => setItem(i, { label: e.target.value })} />
            <button className="btn inline" onClick={() => setItems(items.filter((_, j) => j !== i))} aria-label="삭제">
              🗑
            </button>
          </div>
        ))}
        {items.length < 8 && (
          <button className="btn" onClick={() => setItems([...items, { key: '', emoji: '⭐', label: '' }])}>
            ➕ 항목 추가
          </button>
        )}
      </div>

      <div className="card">
        <h2>🔒 부모 PIN 바꾸기</h2>
        <input inputMode="numeric" maxLength={4} placeholder="새 PIN 4자리 (안 바꾸면 비워 두세요)" value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))} />
      </div>

      <button className="btn primary sticky" onClick={save}>
        저장하기
      </button>
      {msg && <div className="toast">{msg}</div>}

      <div className="card">
        <h2>🔗 가족 링크</h2>
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
          {copied ? '✅ 복사했어요' : '📋 링크 복사'}
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
