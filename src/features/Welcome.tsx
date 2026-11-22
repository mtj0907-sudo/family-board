import { useEffect, useRef, useState } from 'react';
import { DEFAULT_ROUTINE_ITEMS } from '../lib/constants';
import { familyExists, saveSettings } from '../lib/db';
import { buildJoinLink, generateCode, parseJoinCode } from '../lib/family';
import { hashPin, isValidPin } from '../lib/pin';
import type { Member, Role } from '../lib/types';

interface Props {
  /** 공유 링크(#c=코드)로 들어왔을 때 미리 받은 코드 */
  initialCode: string | null;
  onDone: (code: string) => void;
}

const withTimeout = <T,>(p: Promise<T>, ms: number) =>
  Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

const DEFAULT_ROWS: { emoji: string; role: Role; hint: string }[] = [
  { emoji: '👨', role: 'parent', hint: '어른 1' },
  { emoji: '👩', role: 'parent', hint: '어른 2' },
  { emoji: '👦', role: 'child', hint: '아이 1' },
  { emoji: '👧', role: 'child', hint: '아이 2' },
];

export function Welcome({ initialCode, onDone }: Props) {
  const [mode, setMode] = useState<'start' | 'create' | 'join' | 'created'>('start');
  const [joinText, setJoinText] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [createdCode, setCreatedCode] = useState('');
  const autoTried = useRef(false);

  async function join(raw: string) {
    const code = parseJoinCode(raw);
    if (!code) return setError('코드가 올바르지 않아요. 링크 전체를 붙여넣어 보세요.');
    setBusy(true);
    setError('');
    try {
      if (await withTimeout(familyExists(code), 10000)) {
        history.replaceState(null, '', location.pathname + location.search);
        onDone(code);
      } else setError('이 코드의 가족을 찾을 수 없어요.');
    } catch {
      setError('연결하지 못했어요. 인터넷을 확인하고 다시 해 주세요.');
    }
    setBusy(false);
  }

  useEffect(() => {
    if (initialCode && !autoTried.current) {
      autoTried.current = true;
      setMode('join');
      void join(initialCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode]);

  if (mode === 'created') {
    return <CreatedScreen code={createdCode} onNext={() => onDone(createdCode)} />;
  }

  if (mode === 'create') {
    return (
      <CreateForm
        onBack={() => setMode('start')}
        onCreated={(c) => {
          setCreatedCode(c);
          setMode('created');
        }}
      />
    );
  }

  return (
    <div className="screen center">
      <div className="card welcome">
        <div className="logo">🏡</div>
        <h1>우리집 보드</h1>
        <p className="sub">우리 가족만 보는 상태 공유 보드예요</p>

        {mode === 'join' ? (
          <>
            <label className="field">
              <span>가족 링크 또는 코드</span>
              <textarea
                rows={3}
                value={joinText}
                onChange={(e) => setJoinText(e.target.value)}
                placeholder="받은 링크를 여기에 붙여넣기"
              />
            </label>
            {error && <div className="error">{error}</div>}
            <button className="btn primary" disabled={busy} onClick={() => join(joinText)}>
              {busy ? '연결 중…' : '연결하기'}
            </button>
            <button className="btn" onClick={() => setMode('start')}>
              뒤로
            </button>
          </>
        ) : (
          <>
            <button className="btn primary" onClick={() => setMode('create')}>
              ✨ 새 가족 만들기
            </button>
            <button className="btn" onClick={() => setMode('join')}>
              🔗 이미 만든 가족에 들어가기
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function CreateForm({ onBack, onCreated }: { onBack: () => void; onCreated: (code: string) => void }) {
  const [rows, setRows] = useState(DEFAULT_ROWS.map((r) => ({ ...r, name: '' })));
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (rows.some((r) => !r.name.trim())) return setError('4명의 이름을 모두 입력해 주세요.');
    if (!rows.some((r) => r.role === 'parent')) return setError('어른이 한 명 이상 있어야 해요.');
    if (!isValidPin(pin)) return setError('PIN은 숫자 4자리예요.');
    if (pin !== pin2) return setError('PIN 두 번이 서로 달라요.');
    setBusy(true);
    setError('');
    const code = generateCode();
    const members: Member[] = rows.map((r, i) => ({
      id: `m${i + 1}`,
      name: r.name.trim(),
      emoji: r.emoji,
      role: r.role,
    }));
    try {
      await withTimeout(
        saveSettings(code, {
          members,
          routineItems: DEFAULT_ROUTINE_ITEMS,
          pinHash: await hashPin(pin, code),
          createdAt: Date.now(),
        }),
        10000,
      );
      onCreated(code);
    } catch {
      setError('저장하지 못했어요. 인터넷과 Firebase 설정(규칙 게시)을 확인해 주세요.');
    }
    setBusy(false);
  }

  return (
    <div className="screen">
      <div className="card">
        <h2>우리 가족 만들기</h2>
        <p className="sub">이름은 이 기기와 우리 가족 데이터에만 저장돼요.</p>
        {rows.map((r, i) => (
          <div className="row" key={i}>
            <span className="avatar sm">{r.emoji}</span>
            <input
              className="grow"
              placeholder={r.hint}
              value={r.name}
              maxLength={10}
              onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
            />
            <select
              value={r.role}
              onChange={(e) =>
                setRows(rows.map((x, j) => (j === i ? { ...x, role: e.target.value as Role } : x)))
              }
            >
              <option value="parent">어른</option>
              <option value="child">아이</option>
            </select>
          </div>
        ))}
        <label className="field">
          <span>🔒 부모 PIN (숫자 4자리)</span>
          <input inputMode="numeric" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} />
        </label>
        <label className="field">
          <span>PIN 한 번 더</span>
          <input inputMode="numeric" maxLength={4} value={pin2} onChange={(e) => setPin2(e.target.value.replace(/\D/g, ''))} />
        </label>
        {error && <div className="error">{error}</div>}
        <button className="btn primary" disabled={busy} onClick={submit}>
          {busy ? '만드는 중…' : '가족 만들기'}
        </button>
        <button className="btn" onClick={onBack}>
          뒤로
        </button>
      </div>
    </div>
  );
}

function CreatedScreen({ code, onNext }: { code: string; onNext: () => void }) {
  const link = buildJoinLink(location.href, code);
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      window.prompt('이 링크를 복사하세요', link);
    }
  }
  async function share() {
    try {
      await navigator.share({ title: '우리집 보드', text: '우리집 보드 가족 링크', url: link });
    } catch {
      /* 취소 */
    }
  }

  return (
    <div className="screen center">
      <div className="card welcome">
        <div className="logo">🎉</div>
        <h2>가족이 만들어졌어요!</h2>
        <p className="sub">
          아래 링크를 가족에게 보내세요. 링크를 열면 바로 같은 가족으로 연결돼요.
          <br />이 링크는 우리 가족만 알아야 해요 (공개 게시판에 올리지 마세요).
        </p>
        <div className="linkbox">{link}</div>
        {'share' in navigator && (
          <button className="btn primary" onClick={share}>
            📤 카톡 등으로 보내기
          </button>
        )}
        <button className="btn" onClick={copy}>
          {copied ? '✅ 복사했어요' : '📋 링크 복사'}
        </button>
        <button className="btn primary" onClick={onNext}>
          다음 (나는 누구?)
        </button>
      </div>
    </div>
  );
}
