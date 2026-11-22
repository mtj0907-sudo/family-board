import type { Member } from '../lib/types';

// 차분한 4가지 색 (구성원 번호 m1~m4 순서대로)
const TONES = [
  { bg: '#DDE7F0', fg: '#3F6285' },
  { bg: '#F0DDE4', fg: '#8A4A63' },
  { bg: '#DCEBE2', fg: '#3F7458' },
  { bg: '#F1E6CF', fg: '#8A6A22' },
];

export function toneOf(id: string) {
  const n = Number(id.replace(/\D/g, '')) || 1;
  return TONES[(n - 1) % TONES.length];
}

/** 얼굴 사진이 있으면 사진, 없으면 이름 첫 글자를 담은 동그란 아바타 */
export function Avatar({ member, size = 44 }: { member: Pick<Member, 'id' | 'name' | 'photo'>; size?: number }) {
  const t = toneOf(member.id);
  if (member.photo) {
    return <img className="avatar photo" src={member.photo} alt="" style={{ width: size, height: size }} aria-hidden />;
  }
  const ch = Array.from(member.name.trim())[0] ?? '·';
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, background: t.bg, color: t.fg, fontSize: size * 0.42 }}
      aria-hidden
    >
      {ch}
    </span>
  );
}
