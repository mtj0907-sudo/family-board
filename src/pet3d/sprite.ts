import * as THREE from 'three';
import type { Anim, PetMood } from '../lib/pet';

/**
 * 처음 만든 지점토 펫 그림을 그대로 쓰되, 그림을 격자로 나눠서 부위별로 구부려요.
 * 머리는 끄덕이고 턱은 벌어지고, 다리는 번갈아 들리고, 배는 볼록해지고, 꼬리는 흔들려요.
 */

/** 그림마다 입(턱) 위치: [가로 0~1, 세로 0~1(아래가 0)] */
const MOUTH: Record<string, [number, number]> = {
  'bear-baby': [0.55, 0.52],
  'cat-baby': [0.52, 0.54],
  'cat-kid': [0.37, 0.56],
  'cat-adult': [0.7, 0.68],
  'chick-baby': [0.55, 0.54],
  'chick-kid': [0.52, 0.63],
  'chick-adult': [0.67, 0.76],
  'dog-baby': [0.58, 0.49],
  'dog-kid': [0.38, 0.57],
  'dog-adult': [0.5, 0.69],
  'hamster-baby': [0.53, 0.58],
  'hamster-kid': [0.56, 0.69],
  'hamster-adult': [0.52, 0.66],
  'rabbit-baby': [0.53, 0.54],
  'rabbit-kid': [0.44, 0.69],
  'rabbit-adult': [0.57, 0.69],
};
/** 머리가 시작되는 높이 (이 위쪽이 머리로 움직여요) */
const NECK: Record<string, number> = { baby: 0.38, kid: 0.47, adult: 0.6, egg: 0.5 };

export interface Sprite {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  /** 가로 세로 크기(세계 단위) */
  w: number;
  h: number;
  mouth: [number, number];
  isEgg: boolean;
  dispose: () => void;
}

const VERT = /* glsl */ `
uniform vec2 uSize;
uniform float uTime, uNeck, uNod, uHeadX, uStep, uPhase, uTail, uBulge, uJaw, uBreath, uSway, uPuff, uEar, uSquishTop;
uniform vec2 uMouth;
varying vec2 vUv;
void main() {
  vUv = uv;
  vec3 p = position;
  float u = uv.x;
  float v = uv.y;
  // 숨쉬기: 위로 갈수록 조금 더 늘어나요
  p.y *= 1.0 + uBreath * v;
  p.x *= 1.0 - uBreath * 0.5 * v;
  // 배: 몸통 가운데가 볼록
  float bell = exp(-pow((v - uNeck * 0.55) / 0.2, 2.0)) * uBulge;
  p.x += (u - 0.5) * uSize.x * bell * 0.32;
  // 다리: 왼쪽/오른쪽이 번갈아 들려요
  float lw = 1.0 - smoothstep(0.0, 0.3, v);
  float ph = uPhase + (u < 0.5 ? 0.0 : 3.14159);
  p.y += lw * max(0.0, sin(ph)) * uStep * uSize.y * 0.075;
  p.x += lw * sin(ph) * uStep * uSize.x * 0.035;
  // 꼬리·팔 쪽(가장자리)이 살랑
  float edge = smoothstep(0.26, 0.0, u) + smoothstep(0.74, 1.0, u);
  float tw = edge * smoothstep(0.12, 0.4, v) * (1.0 - smoothstep(0.55, 0.85, v));
  p.x += tw * uTail * uSize.x;
  // 몸 전체 기울기(발 기준)
  p.x += v * uSway * uSize.y;
  // 머리: 목을 축으로 끄덕이고 옆으로 움직여요
  float hw = smoothstep(uNeck - 0.07, uNeck + 0.12, v);
  vec2 pivot = vec2(0.0, uNeck * uSize.y);
  vec2 d = p.xy - pivot;
  float a = uNod * hw;
  d = mat2(cos(a), sin(a), -sin(a), cos(a)) * d;
  p.xy = pivot + d;
  p.x += hw * uHeadX * uSize.x;
  // 볼이 빵빵
  p.x += (u - 0.5) * uSize.x * hw * uPuff * 0.07;
  // 귀 끝이 팔랑
  p.x += smoothstep(0.82, 1.0, v) * uEar * uSize.x;
  // 턱이 벌어져요 (입 아래쪽이 내려가요)
  float jx = exp(-pow((u - uMouth.x) / 0.2, 2.0));
  float jy = smoothstep(uMouth.y - 0.11, uMouth.y, v) * (1.0 - step(uMouth.y + 0.0001, v));
  p.y -= uJaw * uSize.y * 0.055 * jx * jy;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;
const FRAG = /* glsl */ `
uniform sampler2D uTex;
uniform float uTint;
varying vec2 vUv;
void main() {
  vec4 c = texture2D(uTex, vUv);
  if (c.a < 0.02) discard;
  vec3 rgb = mix(c.rgb, c.rgb * vec3(0.78, 0.8, 0.95), uTint);
  gl_FragColor = vec4(rgb, c.a);
  #include <colorspace_fragment>
}`;

const loader = new THREE.TextureLoader();

export function loadSprite(url: string, key: string, stage: string, height: number, scale: number): Promise<Sprite> {
  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 4;
        tex.generateMipmaps = true;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        const img = tex.image as { width: number; height: number };
        const h = height * scale;
        const w = (img.width / img.height) * h;
        const geo = new THREE.PlaneGeometry(1, 1, 26, 30);
        geo.translate(0, 0.5, 0);
        geo.scale(w, h, 1);
        const mouth = MOUTH[key] ?? [0.5, 0.6];
        const mat = new THREE.ShaderMaterial({
          uniforms: {
            uTex: { value: tex },
            uSize: { value: new THREE.Vector2(w, h) },
            uTime: { value: 0 },
            uNeck: { value: NECK[stage] ?? 0.5 },
            uNod: { value: 0 },
            uHeadX: { value: 0 },
            uStep: { value: 0 },
            uPhase: { value: 0 },
            uTail: { value: 0 },
            uBulge: { value: 0 },
            uJaw: { value: 0 },
            uBreath: { value: 0 },
            uSway: { value: 0 },
            uPuff: { value: 0 },
            uEar: { value: 0 },
            uSquishTop: { value: 0 },
            uMouth: { value: new THREE.Vector2(mouth[0], mouth[1]) },
            uTint: { value: 0 },
          },
          vertexShader: VERT,
          fragmentShader: FRAG,
          transparent: true,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.frustumCulled = false;
        resolve({
          mesh,
          mat,
          w,
          h,
          mouth: [mouth[0], mouth[1]],
          isEgg: stage === 'egg',
          dispose: () => {
            tex.dispose();
            geo.dispose();
            mat.dispose();
          },
        });
      },
      undefined,
      reject,
    );
  });
}

export interface PoseIn {
  time: number;
  /** 지금 동작을 시작한 뒤 흐른 시간(초) */
  t: number;
  mood: PetMood;
  belly: number;
  energy: number;
  chew: number;
  wide: number;
  /** 1이면 먹이에서 고개를 돌려요 */
  away: number;
  /** 가는 방향 -1 | 1 */
  dir: number;
  moving: boolean;
}

const sin = Math.sin;
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (u: number) => u * u * (3 - 2 * u);
const arc = (u: number) => 4 * u * (1 - u);

/** 한 프레임의 몸짓: 그림 전체의 움직임과 부위별 구부림 값을 정해요 */
export function poseSprite(s: Sprite, anim: Anim, o: PoseIn) {
  const u = s.mat.uniforms;
  const { time, t, dir } = o;
  const sad = o.mood === 'sad';
  const happy = o.mood === 'happy';
  const lazy = 1 - o.energy * 0.45;
  const m = s.mesh;
  const flip = dir >= 0 ? 1 : -1;
  const bulge = clamp((o.belly - 0.45) / 0.55);

  let hop = 0;
  let rotZ = 0;
  let yaw = 0;
  let sx = 1;
  let sy = 1;
  let ox = 0;
  let nod = 0;
  let headX = 0;
  let step = 0;
  let phase = time * 10;
  let jaw = 0;
  let sway = 0;
  let tail = sin(time * (happy ? 12 : sad ? 2 : 5)) * (happy ? 0.03 : sad ? 0.004 : 0.015);
  let puff = o.belly > 0.88 ? 1 : 0;
  let ear = 0;
  let aroundCenter = false;
  let lie = 0;
  const breath = sin(time * (anim === 'sleep' ? 1.7 : 2.6)) * (anim === 'sleep' ? 0.03 : 0.016);

  // 평소: 가만히 숨 쉬며 두리번
  nod = sin(time * 0.9) * 0.025 + (sad ? 0.12 : 0) + (1 - o.energy) * 0.05;
  headX = sin(time * 0.6) * 0.012;
  sway = sin(time * 0.8) * 0.006;
  yaw = sin(time * 0.5) * 0.18;

  switch (anim) {
    case 'walk':
    case 'flee': {
      const fast = anim === 'flee';
      const w = fast ? 20 : 10 * lazy;
      phase = time * w;
      step = fast ? 1.5 : 1;
      hop = Math.abs(sin(time * w * 0.5 * 2)) * (fast ? 0.1 : 0.05);
      rotZ = sin(time * w) * (fast ? 0.07 : 0.045);
      sway = (fast ? -0.06 : -0.02) * flip * -1;
      yaw = 0.42 * flip;
      nod = sin(time * w) * 0.04 + (fast ? -0.1 : 0);
      sy = 1 + sin(time * w * 2) * 0.012;
      tail = sin(time * w) * 0.025;
      break;
    }
    case 'eat': {
      yaw = 0;
      const chewing = o.chew > 0;
      nod = chewing ? -0.1 + sin(time * 16) * 0.055 : 0.1 * o.wide;
      jaw = chewing ? (0.35 + 0.65 * (sin(time * 16) * 0.5 + 0.5)) : o.wide * 1.0;
      headX = chewing ? sin(time * 8) * 0.008 : 0;
      sy = chewing ? 1 - 0.02 * (sin(time * 16) * 0.5 + 0.5) : 1;
      puff = Math.max(puff, chewing ? 0.6 + 0.4 * sin(time * 16) : 0);
      break;
    }
    case 'refuse': {
      yaw = sin(t * 14) * 0.55 * clamp(1.8 - t);
      nod = 0.08;
      headX = sin(t * 14) * 0.03 * clamp(1.8 - t);
      sway = 0.03 * -flip;
      sy = 1.02;
      puff = 1;
      break;
    }
    case 'shake': {
      const k = clamp(1.6 - t);
      rotZ = sin(t * 38) * 0.17 * k;
      yaw = sin(t * 38 + 1) * 0.5 * k;
      ear = sin(t * 40) * 0.02 * k;
      break;
    }
    case 'tickle': {
      rotZ = sin(t * 24) * 0.1;
      hop = Math.abs(sin(t * 14)) * 0.07;
      jaw = 0.6 + 0.35 * sin(t * 20);
      nod = -0.1 + sin(t * 18) * 0.05;
      sx = 1 + sin(t * 24) * 0.02;
      break;
    }
    case 'play': {
      // 뒹굴기: 몸 가운데를 축으로 데굴데굴, 마지막에 벌떡 일어서며 폴짝
      const roll = clamp(t / 1.5);
      const turns = ease(roll) * Math.PI * 4 * -flip;
      rotZ = turns;
      aroundCenter = true;
      hop = Math.abs(sin(turns / 2)) * 0.05;
      const after = clamp((t - 1.5) / 0.5);
      if (t > 1.5) hop += arc(after) * 0.18;
      jaw = roll < 1 ? 0.5 + 0.4 * sin(t * 12) : 0.2;
      if (roll >= 1) sy = 1 + (after < 0.2 ? -0.08 : 0.05 * arc(after));
      break;
    }
    case 'jump': {
      const k = (t % 0.7) / 0.7;
      hop = arc(k) * 0.4;
      sy = 1 + (k < 0.15 || k > 0.85 ? -0.12 : 0.08);
      sx = 1 + (k < 0.15 || k > 0.85 ? 0.08 : -0.04);
      step = arc(k) * 1.2;
      phase = time * 14;
      jaw = 0.4 * arc(k);
      ear = -arc(k) * 0.03;
      break;
    }
    case 'hide': {
      // 숨바꼭질: 몸을 낮추고 웅크렸다가 짜잔 하고 튀어올라요
      const crouch = t < 1.4 ? ease(clamp(t / 0.35)) : 1 - ease(clamp((t - 1.4) / 0.15));
      sy = 1 - crouch * 0.42;
      sx = 1 + crouch * 0.12;
      nod = crouch * 0.2;
      const pop = clamp((t - 1.5) / 0.6);
      if (t > 1.5) hop = arc(pop) * 0.45;
      break;
    }
    case 'wash': {
      rotZ = sin(t * 14) * 0.1;
      yaw = sin(t * 11) * 0.4;
      hop = Math.abs(sin(t * 7)) * 0.03;
      jaw = 0.25 + 0.2 * sin(t * 6);
      nod = sin(t * 14) * 0.08;
      step = 0.5;
      phase = time * 14;
      break;
    }
    case 'hug': {
      const k = ease(clamp(t / 0.4));
      sx = 1 + 0.07 * k + sin(time * 6) * 0.012;
      sy = 1 - 0.05 * k;
      nod = 0.18 * k;
      yaw = sin(time * 3) * 0.3;
      break;
    }
    case 'dance': {
      rotZ = sin(time * 8) * 0.14;
      hop = Math.abs(sin(time * 8)) * 0.12;
      yaw = sin(time * 4) * 0.6;
      nod = sin(time * 16) * 0.09;
      step = 1;
      phase = time * 8;
      jaw = 0.45 + 0.3 * sin(time * 8);
      tail = sin(time * 16) * 0.035;
      ear = sin(time * 16) * 0.02;
      break;
    }
    case 'sleep': {
      // 옆으로 누워서 쿨쿨 (숨쉴 때마다 몸이 오르내려요)
      const down = ease(clamp(t / 0.9));
      lie = down;
      aroundCenter = true;
      rotZ = -Math.PI * 0.46 * down * flip;
      nod = 0;
      sway = 0;
      yaw = 0;
      sy = 1 + sin(time * 1.7) * 0.02;
      break;
    }
    case 'dizzy': {
      yaw = t * 9;
      rotZ = sin(t * 7) * 0.08;
      nod = sin(t * 8) * 0.12;
      jaw = 0.3;
      break;
    }
    default:
      break;
  }
  if (sad && anim === 'idle') sy *= 0.985;

  u.uTime.value = time;
  u.uNod.value = nod;
  u.uHeadX.value = headX;
  u.uStep.value = step;
  u.uPhase.value = phase;
  u.uTail.value = tail;
  u.uBulge.value = bulge;
  u.uJaw.value = jaw;
  u.uBreath.value = breath;
  u.uSway.value = sway;
  u.uPuff.value = puff;
  u.uEar.value = ear;
  u.uTint.value = sad ? 0.35 : 0;

  // 알은 머리가 없으니 통통 흔들리기만
  if (s.isEgg) {
    u.uNod.value = 0;
    u.uJaw.value = 0;
    u.uHeadX.value = 0;
    u.uStep.value = 0;
    const wob = anim === 'idle' || anim === 'walk' ? 0.03 : 0.14;
    const f = anim === 'idle' || anim === 'walk' ? 1.6 : 9;
    rotZ = sin(time * f) * wob;
    hop = anim === 'jump' || anim === 'hug' || anim === 'tickle' || anim === 'dizzy' ? Math.abs(sin(t * 8)) * 0.12 : 0;
    yaw = 0;
  }

  // 몸 전체 위치·기울기. aroundCenter면 몸 가운데를 축으로 돌려요.
  m.scale.set(flip * sx, sy, 1);
  m.rotation.set(0, yaw, rotZ);
  if (aroundCenter) {
    const c = (s.h * sy) / 2;
    m.position.y = hop + c * (1 - Math.cos(rotZ)) - lie * (s.h / 2 - s.w / 2) * 0.9;
    m.position.x = ox + c * Math.sin(rotZ);
  } else {
    m.position.set(ox, hop, 0);
  }
}
