import { X } from 'lucide-react';
import type { Member } from '../lib/types';
import { PetPanel } from './PetPanel';

/** 거실 보드에서 아이의 펫을 보는 창. 한참 안 만지면 저절로 닫혀요. */
export function PetSheet({ kid, onClose }: { kid: Member; onClose: () => void }) {
  return (
    <div className="board-sheet-wrap" onClick={onClose}>
      <div className="board-sheet pet-sheet" role="dialog" aria-label={`${kid.name}의 펫`} onClick={(e) => e.stopPropagation()}>
        <button className="pet-close" onClick={onClose} aria-label="닫기">
          <X size={22} strokeWidth={1.75} aria-hidden />
        </button>
        <PetPanel kid={kid} actAsKid />
      </div>
    </div>
  );
}
