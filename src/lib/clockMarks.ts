import { clockAngles } from './time';

export interface MarkInput {
  id: string;
  /** 도착 시각(ms) */
  at: number;
}

export interface Mark {
  id: string;
  /** 시계 12시 방향이 0도, 시계 방향으로 늘어나는 각도 */
  angle: number;
  /** 0 = 테두리 바깥쪽 줄, 1 = 안쪽 줄 (같은 시각 근처가 겹칠 때) */
  ring: 0 | 1;
}

const NEAR_DEG = 10;

/**
 * 아날로그 시계(12시간)에서 가족이 도착하는 시각의 위치를 계산합니다.
 * 지금부터 12시간 안(또는 방금 지난 5분 이내)의 도착만 보여주고, 서로 가까우면 안쪽 줄에 놓습니다.
 */
export function clockMarks(inputs: MarkInput[], now: number): Mark[] {
  const visible = inputs
    .filter((i) => i.at > now - 5 * 60000 && i.at < now + 12 * 3600000)
    .sort((a, b) => a.at - b.at);
  const out: Mark[] = [];
  for (const i of visible) {
    const angle = clockAngles(i.at).hour;
    const crowded = out.some((o) => o.ring === 0 && Math.min(Math.abs(o.angle - angle), 360 - Math.abs(o.angle - angle)) < NEAR_DEG);
    out.push({ id: i.id, angle, ring: crowded ? 1 : 0 });
  }
  return out;
}
