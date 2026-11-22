import { Delete, Lock, X } from 'lucide-react';
import { useState } from 'react';
import { hashPin, unlock } from '../lib/pin';

interface Props {
  pinHash: string;
  salt: string;
  title?: string;
  onSuccess: () => void;
  onCancel?: () => void;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'back', '0', 'cancel'];

/** 부모 PIN 입력 (숫자 4자리). 맞으면 이 기기에서 30분간 잠금이 풀립니다. */
export function PinPad({ pinHash, salt, title = '부모 PIN을 눌러 주세요', onSuccess, onCancel }: Props) {
  const [digits, setDigits] = useState('');
  const [wrong, setWrong] = useState(false);
  const [busy, setBusy] = useState(false);

  async function press(k: string) {
    if (busy) return;
    if (k === 'cancel') return onCancel?.();
    if (k === 'back') {
      setDigits((d) => d.slice(0, -1));
      return;
    }
    const next = (digits + k).slice(0, 4);
    setDigits(next);
    setWrong(false);
    if (next.length === 4) {
      setBusy(true);
      const h = await hashPin(next, salt);
      setBusy(false);
      if (h === pinHash) {
        unlock();
        onSuccess();
      } else {
        setWrong(true);
        setDigits('');
      }
    }
  }

  return (
    <div className="card pinpad">
      <div className="pin-title">
        <Lock size={18} strokeWidth={1.75} aria-hidden />
        {title}
      </div>
      <div className="pin-dots" aria-label="입력한 자릿수">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={i < digits.length ? 'dot-pin on' : 'dot-pin'} />
        ))}
      </div>
      <div className="pin-msg">{wrong ? 'PIN이 달라요. 다시 눌러 주세요' : ' '}</div>
      <div className="pin-keys">
        {KEYS.map((k) =>
          k === 'cancel' && !onCancel ? (
            <span key={k} />
          ) : (
            <button key={k} type="button" className="pin-key" onClick={() => press(k)} aria-label={k === 'back' ? '지우기' : k === 'cancel' ? '닫기' : k}>
              {k === 'back' ? <Delete size={22} strokeWidth={1.75} /> : k === 'cancel' ? <X size={22} strokeWidth={1.75} /> : k}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
