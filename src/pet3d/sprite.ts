import * as THREE from 'three';
import type { Anim, PetMood } from '../lib/pet';

/**
 * 처음 만든 지점토 펫 그림을 그대로 쓰되, 그림을 격자로 나눠서 부위별로 구부려요.
 * 머리는 끄덕이고 턱은 벌어지고, 다리는 번갈아 들리고, 배는 볼록해지고, 꼬리는 흔들려요.
 */

export type PoseName = 'walkA' | 'walkB' | 'eat' | 'chew' | 'sleep' | 'jump' | 'roll' | 'sit';
export const POSE_NAMES: PoseName[] = ['walkA', 'walkB', 'eat', 'chew', 'sleep', 'jump', 'roll', 'sit'];

/** 한 자세 그림 */
export interface Pose {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  w: number;
  h: number;
}
/** 한 마리의 모든 자세 (걷기·먹기·자기·점프·뒹굴기·앉기) */
export interface Sprite {
  group: THREE.Group;
  poses: Partial<Record<PoseName, Pose>>;
  /** 앉은 자세의 크기(기준) */
  w: number;
  h: number;
  /** 지금 보이는 자세 */
  current: PoseName;
  isEgg: boolean;
  dispose: () => void;
}

/** 자세마다 입 위치(그림 안 비율) — 오른쪽을 보는 그림이에요 */
const MOUTH_AT: Record<PoseName, [number, number]> = {
  sit: [0.78, 0.6],
  eat: [0.84, 0.3],
  chew: [0.78, 0.58],
  walkA: [0.85, 0.62],
  walkB: [0.85, 0.62],
  jump: [0.85, 0.6],
  roll: [0.5, 0.5],
  sleep: [0.8, 0.35],
};
export const mouthOf = (s: Sprite): [number, number] => MOUTH_AT[s.current];

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
const loadTex = (url: string) =>
  new Promise<THREE.Texture>((res, rej) =>
    loader.load(
      url,
      (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 4;
        t.minFilter = THREE.LinearMipmapLinearFilter;
        res(t);
      },
      undefined,
      rej,
    ),
  );

function makePose(tex: THREE.Texture, h: number, w: number): Pose {
  const geo = new THREE.PlaneGeometry(1, 1, 22, 26);
  geo.translate(0, 0.5, 0);
  geo.scale(w, h, 1);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTex: { value: tex },
      uSize: { value: new THREE.Vector2(w, h) },
      uTime: { value: 0 },
      uNeck: { value: 0.55 },
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
      uMouth: { value: new THREE.Vector2(0.8, 0.6) },
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
  mesh.visible = false;
  return { mesh, mat, w, h };
}

/** 한 마리의 자세 그림들을 모두 불러와요. 앉은 자세 높이를 height로 맞춰요. */
export async function loadSprite(base: string, species: string, stage: string, height: number, scale: number): Promise<Sprite> {
  const group = new THREE.Group();
  const poses: Partial<Record<PoseName, Pose>> = {};
  const texs: THREE.Texture[] = [];
  if (stage === 'egg') {
    const tex = await loadTex(`${base}pets/egg.webp`);
    texs.push(tex);
    const img = tex.image as { width: number; height: number };
    const h = height * scale;
    const p = makePose(tex, h, (img.width / img.height) * h);
    p.mesh.visible = true;
    group.add(p.mesh);
    poses.sit = p;
    return { group, poses, w: p.w, h: p.h, current: 'sit', isEgg: true, dispose: () => texs.forEach((t) => t.dispose()) };
  }
  const loaded = await Promise.all(POSE_NAMES.map((n) => loadTex(`${base}pets/${species}-${stage}-${n}.webp`)));
  loaded.forEach((t) => texs.push(t));
  const px = (t: THREE.Texture) => t.image as { width: number; height: number };
  const sitH = px(loaded[POSE_NAMES.indexOf('sit')]).height;
  const k = (height * scale) / sitH;
  POSE_NAMES.forEach((n, i) => {
    const im = px(loaded[i]);
    const p = makePose(loaded[i], im.height * k, im.width * k);
    group.add(p.mesh);
    poses[n] = p;
  });
  const sit = poses.sit!;
  sit.mesh.visible = true;
  return {
    group,
    poses,
    w: sit.w,
    h: sit.h,
    current: 'sit',
    isEgg: false,
    dispose: () => {
      texs.forEach((t) => t.dispose());
      Object.values(poses).forEach((p) => {
        p!.mesh.geometry.dispose();
        p!.mat.dispose();
      });
    },
  };
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

/** 이 동작에 쓸 자세 그림 고르기 (걷기는 두 장을 번갈아, 먹을 때는 먹기·씹기를 번갈아) */
export function chooseSprite(anim: Anim, o: { time: number; t: number; chew: number; wide: number; sleepy: boolean }): PoseName {
  switch (anim) {
    case 'walk':
      return Math.floor(o.time * 5) % 2 ? 'walkB' : 'walkA';
    case 'flee':
      return Math.floor(o.time * 10) % 2 ? 'walkB' : 'walkA';
    case 'dance':
      return Math.floor(o.time * 4) % 2 ? 'walkB' : 'walkA';
    case 'eat':
      if (o.chew > 0) return Math.floor(o.time * 4.5) % 2 ? 'chew' : 'eat';
      return o.wide > 0.3 ? 'eat' : 'sit';
    case 'sleep':
      return 'sleep';
    case 'jump':
      return 'jump';
    case 'play':
      return o.t < 1.6 ? 'roll' : 'jump';
    case 'tickle':
      return 'roll';
    case 'hug':
    case 'refuse':
    case 'shake':
    case 'wash':
    case 'hide':
    case 'dizzy':
    default:
      return o.sleepy && anim === 'idle' ? 'sleep' : 'sit';
  }
}

/** 한 프레임의 몸짓: 고른 자세 그림을 움직이고 구부려요 */
export function poseSprite(s: Sprite, anim: Anim, o: PoseIn) {
  const name = s.isEgg ? 'sit' : chooseSprite(anim, { time: o.time, t: o.t, chew: o.chew, wide: o.wide, sleepy: false });
  s.current = name;
  for (const [k, p] of Object.entries(s.poses)) p!.mesh.visible = k === name;
  const cur = s.poses[name]!;
  const u = cur.mat.uniforms;
  const { time, t, dir } = o;
  const sad = o.mood === 'sad';
  const happy = o.mood === 'happy';
  const flip = dir >= 0 ? 1 : -1;
  const bulge = clamp((o.belly - 0.45) / 0.55);

  let hop = 0;
  let rotZ = 0;
  let yaw = 0;
  let sx = 1;
  let sy = 1;
  let nod = 0;
  let sway = 0;
  let aroundCenter = false;
  const breath = sin(time * (anim === 'sleep' ? 1.7 : 2.6)) * (anim === 'sleep' ? 0.03 : 0.016);
  let tail = sin(time * (happy ? 12 : sad ? 2 : 5)) * (happy ? 0.02 : sad ? 0.003 : 0.01);

  switch (anim) {
    case 'idle':
      nod = sin(time * 0.9) * 0.02 + (sad ? 0.08 : 0);
      sway = sin(time * 0.8) * 0.006;
      yaw = sin(time * 0.5) * 0.12;
      if (sad) sy *= 0.985;
      break;
    case 'walk':
    case 'flee': {
      const fast = anim === 'flee';
      const w = fast ? 20 : 10;
      hop = Math.abs(sin(time * w * 0.5 * 2)) * (fast ? 0.09 : 0.045);
      rotZ = sin(time * w) * (fast ? 0.05 : 0.025);
      yaw = 0.18 * flip * (fast ? 1.4 : 1);
      tail = 0;
      break;
    }
    case 'eat': {
      const chewing = o.chew > 0;
      hop = 0;
      sy = chewing ? 1 - 0.015 * (sin(time * 16) * 0.5 + 0.5) : 1;
      rotZ = chewing ? sin(time * 9) * 0.012 : 0;
      break;
    }
    case 'refuse': {
      // 입을 꾹 다물고 도리도리
      const k = clamp(1.8 - t);
      yaw = sin(t * 14) * 0.7 * k;
      rotZ = sin(t * 14) * 0.04 * k;
      sx = 1 + 0.02;
      break;
    }
    case 'shake': {
      const k = clamp(1.6 - t);
      rotZ = sin(t * 38) * 0.15 * k;
      yaw = sin(t * 38 + 1) * 0.6 * k;
      break;
    }
    case 'tickle': {
      rotZ = sin(t * 24) * 0.12;
      hop = Math.abs(sin(t * 14)) * 0.05;
      aroundCenter = true;
      break;
    }
    case 'play': {
      // 뒹굴기: 발라당 누워 좌우로 데굴데굴, 그다음 폴짝
      if (t < 1.6) {
        aroundCenter = true;
        rotZ = sin(t * 7) * 0.5;
        hop = Math.abs(sin(t * 7)) * 0.04;
      } else {
        const k = clamp((t - 1.6) / 0.7);
        hop = arc(k) * 0.3;
      }
      break;
    }
    case 'jump': {
      const k = (t % 0.7) / 0.7;
      hop = arc(k) * 0.4;
      sy = 1 + (k < 0.15 || k > 0.85 ? -0.1 : 0.06);
      break;
    }
    case 'hide': {
      const crouch = t < 1.4 ? ease(clamp(t / 0.35)) : 1 - ease(clamp((t - 1.4) / 0.15));
      sy = 1 - crouch * 0.4;
      sx = 1 + crouch * 0.1;
      const pop = clamp((t - 1.5) / 0.6);
      if (t > 1.5) hop = arc(pop) * 0.45;
      break;
    }
    case 'wash': {
      rotZ = sin(t * 14) * 0.08;
      yaw = sin(t * 11) * 0.5;
      hop = Math.abs(sin(t * 7)) * 0.03;
      break;
    }
    case 'hug': {
      const k = ease(clamp(t / 0.4));
      sx = 1 + 0.06 * k + sin(time * 6) * 0.012;
      sy = 1 - 0.04 * k;
      rotZ = sin(time * 3) * 0.04;
      break;
    }
    case 'dance': {
      rotZ = sin(time * 8) * 0.1;
      hop = Math.abs(sin(time * 8)) * 0.1;
      yaw = sin(time * 4) * 0.4;
      break;
    }
    case 'sleep': {
      sy = 1 + sin(time * 1.7) * 0.025;
      break;
    }
    case 'dizzy': {
      yaw = t * 9;
      rotZ = sin(t * 7) * 0.06;
      break;
    }
    default:
      break;
  }

  u.uTime.value = time;
  u.uNod.value = nod;
  u.uBulge.value = bulge;
  u.uBreath.value = breath;
  u.uSway.value = sway;
  u.uTail.value = tail;
  u.uPuff.value = o.belly > 0.88 ? 1 : 0;
  u.uTint.value = sad ? 0.3 : 0;

  if (s.isEgg) {
    u.uNod.value = 0;
    u.uBulge.value = 0;
    const wob = anim === 'idle' || anim === 'walk' ? 0.03 : 0.14;
    const f = anim === 'idle' || anim === 'walk' ? 1.6 : 9;
    rotZ = sin(time * f) * wob;
    hop = anim === 'jump' || anim === 'hug' || anim === 'tickle' || anim === 'dizzy' ? Math.abs(sin(t * 8)) * 0.12 : 0;
    yaw = 0;
  }

  const m = cur.mesh;
  m.scale.set(flip * sx, sy, 1);
  m.rotation.set(0, yaw, rotZ);
  if (aroundCenter) {
    const c = (cur.h * sy) / 2;
    m.position.set(c * Math.sin(rotZ), hop + c * (1 - Math.cos(rotZ)), 0);
  } else {
    m.position.set(0, hop, 0);
  }
}
