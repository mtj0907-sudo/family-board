import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { FamilySettings, Member } from './lib/types';
import { isUnlocked } from './lib/pin';
import { PinPad } from './components/PinPad';

interface FamilyCtx {
  code: string;
  settings: FamilySettings;
  members: Member[];
  me: Member;
  isParent: boolean;
  changeMe: () => void;
  leave: () => void;
  /** PIN 잠금이 풀려 있으면 바로, 아니면 PIN을 물어본 뒤 실행 */
  requirePin: (action: () => void) => void;
}

const Ctx = createContext<FamilyCtx | null>(null);

export function useFamily(): FamilyCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('FamilyProvider 밖에서 사용했어요');
  return c;
}

interface ProviderProps {
  code: string;
  settings: FamilySettings;
  me: Member;
  onChangeMe: () => void;
  onLeave: () => void;
  children: ReactNode;
}

export function FamilyProvider({ code, settings, me, onChangeMe, onLeave, children }: ProviderProps) {
  const [pending, setPending] = useState<(() => void) | null>(null);

  const requirePin = useCallback((action: () => void) => {
    if (isUnlocked()) action();
    else setPending(() => action);
  }, []);

  const value = useMemo<FamilyCtx>(
    () => ({
      code,
      settings,
      members: settings.members,
      me,
      isParent: me.role === 'parent',
      changeMe: onChangeMe,
      leave: onLeave,
      requirePin,
    }),
    [code, settings, me, onChangeMe, onLeave, requirePin],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      {pending && (
        <div className="modal">
          <PinPad
            pinHash={settings.pinHash}
            salt={code}
            onCancel={() => setPending(null)}
            onSuccess={() => {
              const run = pending;
              setPending(null);
              run();
            }}
          />
        </div>
      )}
    </Ctx.Provider>
  );
}
