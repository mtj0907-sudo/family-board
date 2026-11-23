import type { Anim, PetMood } from '../lib/pet';
import { innerOf, resetPose, type Rig } from './models';

export interface PoseOpts {
  /** 전체 시간(초) */
  time: number;
  /** 지금 동작을 시작한 뒤 흐른 시간(초) */
  t: number;
  mood: PetMood;
  /** 배부름 0~1 */
  belly: number;
  /** 기운 0~1 */
  energy: number;
  /** 씹는 정도 0~1 */
  chew: number;
  /** 입을 크게 벌린 정도 0~1 (먹이를 기다릴 때) */
  wide: number;
  /** 고개를 돌려 피하는 정도 -1~1 */
  away: number;
  /** 눈을 감는 정도 0~1 */
  shut: number;
}

const sin = Math.sin;
const PI = Math.PI;
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (u: number) => u * u * (3 - 2 * u);

/** 몸 가운데를 축으로 굴러요 (발밑이 아니라 몸통 중심으로 돌게 위치를 맞춰요) */
function rollAbout(rig: Rig, angle: number) {
  const yc = (rig.legLen + 0.26) * rig.root.scale.y;
  rig.root.rotation.x += angle;
  rig.root.position.y += yc * (1 - Math.cos(angle));
  rig.root.position.z -= yc * Math.sin(angle);
}

/** 뛰어오르는 높이 곡선 */
const arc = (u: number) => 4 * u * (1 - u);

function setJaw(rig: Rig, open: number) {
  if (rig.jawPivot) rig.jawPivot.rotation.z = -open * 1.05;
  if (rig.mouthIn) rig.mouthIn.scale.y = (rig.mouthIn.userData.base?.s.x ?? 1) * (0.06 + open * 2.4);
}

/**
 * 한 프레임의 몸짓. 모든 부위를 처음 모습으로 되돌린 뒤, 동작에 맞게 조금씩 움직여요.
 * 걷기(다리), 먹기(고개·턱·볼), 뒹굴기(몸 전체 구르기), 자기(옆으로 눕기), 춤, 점프, 어지러움 등이 있어요.
 */
export function applyPose(rig: Rig, anim: Anim, o: PoseOpts) {
  resetPose(rig);
  const inner = innerOf(rig);
  const { time, t } = o;
  const sad = o.mood === 'sad';
  const happy = o.mood === 'happy';
  const lazy = 1 - o.energy * 0.5;

  /* 알은 흔들리기만 해요 */
  if (rig.isEgg) {
    const amp = anim === 'idle' || anim === 'walk' ? 0.03 : anim === 'sleep' ? 0.01 : 0.16;
    const f = anim === 'idle' || anim === 'walk' ? 1.4 : 9;
    inner.rotation.z = sin(time * f) * amp;
    inner.rotation.x = sin(time * f * 0.8) * amp * 0.5;
    if (anim === 'jump' || anim === 'hug' || anim === 'dizzy' || anim === 'tickle') inner.position.y += Math.abs(sin(t * 8)) * 0.1;
    return;
  }

  /* 기본 숨쉬기·꼬리·귀 */
  const breath = sin(time * (anim === 'sleep' ? 1.6 : 2.6)) * (anim === 'sleep' ? 0.03 : 0.018);
  inner.scale.y *= 1 + breath;
  inner.scale.x *= 1 - breath * 0.5;
  // 배부름에 따라 배가 볼록해져요
  const bulge = clamp((o.belly - 0.45) / 0.55);
  rig.belly.scale.x *= 1 + bulge * 0.2;
  rig.belly.scale.y *= 1 + bulge * 0.32;
  rig.belly.scale.z *= 1 + bulge * 0.34;
  rig.body.scale.z *= 1 + bulge * 0.1;
  rig.body.scale.y *= 1 + bulge * 0.06;
  const wagSpeed = happy ? 13 : sad ? 2 : 6;
  const wagAmp = happy ? 0.55 : sad ? 0.08 : 0.28;
  rig.tail.forEach((tl, i) => {
    tl.rotation.y += sin(time * wagSpeed - i * 0.6) * wagAmp * (i === 0 ? 1 : 0.5);
    if (sad) tl.rotation.z -= 0.25;
  });
  rig.ears.forEach((e, i) => {
    e.rotation.x += sin(time * 1.3 + i * 2) * 0.03;
    if (sad) e.rotation.z -= 0.35;
    if (happy) e.rotation.z += 0.08;
  });
  // 깜빡이기
  const blinkPhase = (time * 0.37) % 1;
  const blink = blinkPhase > 0.94 ? 1 - Math.abs(blinkPhase - 0.97) / 0.03 : 0;
  const eyeShut = clamp(Math.max(blink, o.shut, anim === 'sleep' ? 1 : 0, anim === 'hug' ? 0.85 : 0));
  rig.eyes.forEach((e) => {
    e.scale.y *= 1 - eyeShut * 0.88;
  });
  rig.head.rotation.z += sad ? -0.3 : 0;
  rig.head.rotation.z -= (1 - o.energy) * 0.12;
  // 볼이 빵빵해져요 (햄스터는 늘 볼주머니가 있어요)
  rig.cheeks.forEach((c) => {
    const base = c.userData.base.s;
    const puff = o.belly > 0.85 ? 1 : o.chew > 0 ? 0.6 + 0.4 * sin(time * 14) : 0;
    if (base.x > 0.01) c.scale.multiplyScalar(1 + puff * 0.25);
    else c.scale.setScalar(0.001 + puff * 0.16);
  });
  setJaw(rig, 0);

  const legs = rig.legs;
  const swing = (speed: number, amp: number) => {
    const ph = time * speed;
    const a = sin(ph) * amp;
    if (legs[0]) legs[0].rotation.z = a;
    if (legs[3]) legs[3].rotation.z = a;
    if (legs[1]) legs[1].rotation.z = -a;
    if (legs[2]) legs[2].rotation.z = -a;
  };
  const wings = rig.wings;

  switch (anim) {
    case 'idle': {
      rig.head.rotation.y = sin(time * 0.6) * 0.3;
      rig.head.rotation.z += sin(time * 0.9) * 0.04;
      // 가끔 앉아서 쉬어요
      const sit = clamp(sin(time * 0.17) * 3 - 1.4);
      if (sit > 0 && !sad) {
        inner.rotation.z = -0.28 * sit;
        inner.position.y -= 0.08 * sit;
        if (legs[2]) legs[2].rotation.z = 1.1 * sit;
        if (legs[3]) legs[3].rotation.z = 1.1 * sit;
      }
      break;
    }
    case 'walk': {
      swing(10 * lazy, 0.75);
      inner.position.y += Math.abs(sin(time * 10 * lazy)) * 0.035;
      inner.rotation.z = sin(time * 10 * lazy) * 0.04;
      rig.head.rotation.z += sin(time * 10 * lazy + 1) * 0.04;
      wings.forEach((w, i) => (w.rotation.x = sin(time * 10) * 0.2 * (i ? -1 : 1)));
      break;
    }
    case 'flee': {
      swing(20, 1.0);
      inner.position.y += Math.abs(sin(time * 20)) * 0.07;
      inner.rotation.z = 0.12;
      rig.ears.forEach((e) => (e.rotation.z -= 0.5));
      wings.forEach((w, i) => (w.rotation.z = (i ? -1 : 1) * 0.6 + sin(time * 30) * 0.4));
      break;
    }
    case 'eat': {
      const wide = o.wide;
      rig.head.rotation.z += wide * 0.28 - o.chew * 0.28;
      rig.head.rotation.z += o.chew * sin(time * 16) * 0.07;
      setJaw(rig, Math.max(wide * 0.95, o.chew * (0.35 + 0.35 * sin(time * 16))));
      inner.position.y -= o.chew * 0.04;
      if (o.chew > 0) inner.rotation.z = -0.06 * o.chew;
      legs.forEach((l) => l && (l.rotation.z *= 0.2));
      break;
    }
    case 'refuse': {
      rig.head.rotation.y = sin(t * 16) * 0.6 * clamp(1.8 - t) + o.away * 0.4;
      inner.rotation.z = 0.12;
      inner.position.y += 0.02;
      rig.eyes.forEach((e) => (e.scale.y *= 0.65));
      setJaw(rig, 0);
      break;
    }
    case 'shake': {
      inner.rotation.y = sin(t * 38) * 0.28 * clamp(1.6 - t);
      inner.rotation.x = sin(t * 38 + 1) * 0.1;
      rig.head.rotation.y = sin(t * 38 + 2) * 0.4;
      rig.ears.forEach((e, i) => (e.rotation.x += sin(t * 40 + i) * 0.5));
      break;
    }
    case 'tickle': {
      inner.rotation.x = sin(t * 24) * 0.12;
      inner.position.y += Math.abs(sin(t * 14)) * 0.05;
      rig.head.rotation.z += 0.15 + sin(t * 18) * 0.08;
      setJaw(rig, 0.6 + 0.3 * sin(t * 20));
      swing(26, 0.8);
      break;
    }
    case 'play': {
      // 뒹굴기: 옆으로 한 바퀴 데굴데굴, 그다음 벌떡
      const roll = clamp(t / 1.5);
      const turns = ease(roll) * PI * 4;
      rollAbout(rig, turns);
      rig.root.position.y += rig.root.scale.y * 0.08 * Math.abs(sin(turns / 2));
      legs.forEach((l, i) => l && (l.rotation.z = sin(t * 18 + i) * 0.9 * (roll < 1 ? 1 : 0)));
      rig.tail.forEach((tl) => (tl.rotation.y += sin(t * 20) * 0.5));
      const after = clamp((t - 1.5) / 0.5);
      inner.position.y += arc(after) * 0.2 * (t > 1.5 ? 1 : 0);
      setJaw(rig, 0.4 + 0.3 * sin(t * 12) * (roll < 1 ? 1 : 0));
      break;
    }
    case 'jump': {
      const u = (t % 0.7) / 0.7;
      inner.position.y += arc(u) * 0.38;
      inner.scale.y *= 1 + (u < 0.15 || u > 0.85 ? -0.12 : 0.08);
      swing(14, 0.9 * arc(u));
      rig.ears.forEach((e) => (e.rotation.z -= arc(u) * 0.5));
      wings.forEach((w, i) => (w.rotation.z = (i ? -1 : 1) * arc(u) * 0.9));
      setJaw(rig, 0.35 * arc(u));
      break;
    }
    case 'hide': {
      // 숨바꼭질: 몸을 낮추고 웅크렸다가 짜잔 하고 뛰어올라요
      const crouch = t < 1.4 ? ease(clamp(t / 0.35)) : 1 - ease(clamp((t - 1.4) / 0.15));
      inner.scale.y *= 1 - crouch * 0.45;
      inner.position.y -= crouch * 0.1;
      rig.head.rotation.z -= crouch * 0.35;
      rig.ears.forEach((e) => (e.rotation.z -= crouch * 0.6));
      const pop = clamp((t - 1.5) / 0.6);
      inner.position.y += arc(pop) * 0.4 * (t > 1.5 ? 1 : 0);
      rig.eyes.forEach((e) => (e.scale.y *= 1 - crouch * 0.7));
      break;
    }
    case 'wash': {
      inner.rotation.y = sin(t * 14) * 0.25;
      inner.rotation.x = sin(t * 11) * 0.08;
      rig.head.rotation.y = sin(t * 14 + 1) * 0.3;
      inner.position.y += Math.abs(sin(t * 7)) * 0.025;
      setJaw(rig, 0.25 + 0.2 * sin(t * 6));
      swing(14, 0.35);
      break;
    }
    case 'hug': {
      const k = ease(clamp(t / 0.4));
      inner.scale.x *= 1 + 0.06 * k;
      inner.scale.y *= 1 - 0.04 * k;
      rig.head.rotation.z -= 0.15 * k;
      rig.head.rotation.x = sin(time * 3) * 0.12;
      inner.position.y += sin(time * 6) * 0.01 * k;
      break;
    }
    case 'dance': {
      inner.rotation.x = sin(time * 8) * 0.22;
      inner.position.y += Math.abs(sin(time * 8)) * 0.1;
      rig.head.rotation.z += sin(time * 16) * 0.12;
      rig.root.rotation.y += sin(time * 4) * 0.6;
      rig.ears.forEach((e, i) => (e.rotation.x += sin(time * 16 + i) * 0.3));
      swing(8, 0.8);
      wings.forEach((w, i) => (w.rotation.z = (i ? -1 : 1) * (0.5 + 0.4 * sin(time * 16))));
      setJaw(rig, 0.45 + 0.25 * sin(time * 8));
      break;
    }
    case 'sleep': {
      // 옆으로 누워서 쿨쿨
      const down = ease(clamp(t / 0.8));
      rollAbout(rig, down * (PI / 2) * 0.96);
      rig.root.position.y += down * 0.05 * rig.root.scale.y;
      rig.head.rotation.z -= 0.2 * down;
      rig.tail.forEach((tl) => (tl.rotation.y = 0.6 * down));
      legs.forEach((l, i) => l && (l.rotation.z = 0.5 * down * (i % 2 ? -1 : 1)));
      break;
    }
    case 'dizzy': {
      inner.rotation.y = t * 9;
      rig.head.rotation.z += sin(t * 8) * 0.3;
      inner.rotation.x = sin(t * 6) * 0.14;
      rig.eyes.forEach((e) => (e.scale.x *= 1 + 0.25 * sin(t * 20)));
      setJaw(rig, 0.3);
      break;
    }
  }
}
