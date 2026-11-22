import type { Member } from '../lib/types';

export function WhoAmI({ members, onPick, onCancel }: { members: Member[]; onPick: (id: string) => void; onCancel?: () => void }) {
  return (
    <div className="screen center">
      <div className="card welcome">
        <h2>이 기기는 누구 거예요?</h2>
        <p className="sub">내 얼굴을 눌러 주세요</p>
        <div className="grid2">
          {members.map((m) => (
            <button key={m.id} className="who" onClick={() => onPick(m.id)}>
              <span className="avatar">{m.emoji}</span>
              <span className="name">{m.name}</span>
            </button>
          ))}
        </div>
        {onCancel && (
          <button className="btn" onClick={onCancel}>
            취소
          </button>
        )}
      </div>
    </div>
  );
}
