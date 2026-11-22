import { useState, type ReactNode } from 'react';
import { useFamily } from '../FamilyContext';
import { isUnlocked } from '../lib/pin';
import { PinPad } from './PinPad';

/** 화면 전체를 부모 PIN으로 잠급니다 (설정, 근무표 등). 한 번 풀면 30분간 유지. */
export function PinGuard({ children, title }: { children: ReactNode; title?: string }) {
  const { settings, code } = useFamily();
  const [ok, setOk] = useState(isUnlocked());
  if (ok) return <>{children}</>;
  return (
    <div className="screen center">
      <PinPad pinHash={settings.pinHash} salt={code} title={title} onSuccess={() => setOk(true)} />
    </div>
  );
}
