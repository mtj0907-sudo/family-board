import * as THREE from 'three';
import type { PetSpecies, PetStage } from '../lib/pet';

/** 지점토 느낌의 둥근 3D 펫을 코드로 만들어요. +X가 앞, +Y가 위예요. */
export interface Rig {
  root: THREE.Group;
  body: THREE.Mesh;
  belly: THREE.Mesh;
  head: THREE.Group;
  jawPivot: THREE.Group | null;
  mouthIn: THREE.Mesh | null;
  eyes: THREE.Mesh[];
  ears: THREE.Object3D[];
  tail: THREE.Object3D[];
  /** [앞왼, 앞오, 뒤왼, 뒤오] (없으면 null) */
  legs: (THREE.Object3D | null)[];
  cheeks: THREE.Mesh[];
  wings: THREE.Object3D[];
  /** 입(턱)이 있는 위치를 월드 좌표로 알려 주는 기준점 */
  mouthPoint: THREE.Object3D;
  /** 땅에서 몸통 아래까지의 높이 */
  legLen: number;
  isEgg: boolean;
  parts: THREE.Object3D[];
  dispose: () => void;
}

const SPHERE = new THREE.SphereGeometry(1, 28, 20);
const CONE = new THREE.ConeGeometry(1, 1, 16);
const CAPSULE = new THREE.CapsuleGeometry(1, 1, 8, 14);
const TORUS = new THREE.TorusGeometry(1, 0.28, 10, 28);
const mats: THREE.Material[] = [];
function m(color: number, rough = 0.82): THREE.MeshStandardMaterial {
  const mt = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0 });
  mats.push(mt);
  return mt;
}
function ell(rx: number, ry: number, rz: number, color: number, p: [number, number, number] = [0, 0, 0], rough = 0.82): THREE.Mesh {
  const mesh = new THREE.Mesh(SPHERE, m(color, rough));
  mesh.scale.set(rx, ry, rz);
  mesh.position.set(...p);
  return mesh;
}

interface Spec {
  body: number;
  belly: number;
  accent: number;
  inner: number;
  /** 몸통 반지름 x,y,z */
  bd: [number, number, number];
  head: number;
  legLen: number;
  legR: number;
  /** 머리가 몸 앞쪽 위로 얼마나 나와 있는지 */
  headAt: [number, number];
}

const SPECS: Record<Exclude<PetSpecies, 'chick'>, Spec> = {
  dog: { body: 0xd99a5b, belly: 0xfff0d6, accent: 0x9a5b2e, inner: 0xf3b5a0, bd: [0.5, 0.36, 0.34], head: 0.36, legLen: 0.3, legR: 0.095, headAt: [0.46, 0.34] },
  cat: { body: 0xe6a15c, belly: 0xfff3e2, accent: 0xb86a2a, inner: 0xf6a9b4, bd: [0.46, 0.32, 0.3], head: 0.34, legLen: 0.3, legR: 0.08, headAt: [0.42, 0.34] },
  rabbit: { body: 0xfaf6f0, belly: 0xffffff, accent: 0xf2c6d1, inner: 0xf7a8be, bd: [0.4, 0.34, 0.32], head: 0.32, legLen: 0.22, legR: 0.09, headAt: [0.36, 0.34] },
  hamster: { body: 0xe9b36a, belly: 0xfff4de, accent: 0xc07f3c, inner: 0xf3b5a0, bd: [0.44, 0.4, 0.4], head: 0.34, legLen: 0.12, legR: 0.08, headAt: [0.3, 0.2] },
  bear: { body: 0x9b6a45, belly: 0xd9b48a, accent: 0x6e4529, inner: 0xd9a98a, bd: [0.5, 0.4, 0.38], head: 0.38, legLen: 0.26, legR: 0.12, headAt: [0.42, 0.36] },
};
const CHICK = { body: 0xffd84a, belly: 0xfff0a6, accent: 0xff9f2a, wing: 0xffc628 };

function eye(r: number, p: [number, number, number], rig: Rig['eyes'], parent: THREE.Object3D) {
  const e = ell(r, r * 1.15, r, 0x1b1b1f, p, 0.25);
  const hl = ell(r * 0.38, r * 0.38, r * 0.38, 0xffffff, [r * 0.45, r * 0.5, r * 0.35], 0.2);
  e.add(hl);
  parent.add(e);
  rig.push(e);
}

function leg(len: number, r: number, color: number, pawColor: number, at: [number, number, number]): THREE.Group {
  const g = new THREE.Group();
  g.position.set(...at);
  const limb = new THREE.Mesh(CAPSULE, m(color));
  limb.scale.set(r, len * 0.5 - r * 0.2, r);
  limb.position.set(0, -len * 0.45, 0);
  const paw = ell(r * 1.35, r * 0.85, r * 1.15, pawColor, [r * 0.35, -len * 0.92, 0]);
  g.add(limb, paw);
  return g;
}

/** 단계마다 모습이 달라져요: 아기는 머리가 크고 작고, 어른은 몸이 커요 */
const STAGE_LOOK: Record<'baby' | 'kid' | 'adult', { size: number; head: number; legs: number }> = {
  baby: { size: 0.78, head: 1.28, legs: 0.8 },
  kid: { size: 1, head: 1.1, legs: 1 },
  adult: { size: 1.22, head: 1, legs: 1.08 },
};

export function buildPet(species: PetSpecies, stage: PetStage): Rig {
  if (stage === 'egg') return buildEgg();
  const look = STAGE_LOOK[stage];
  const root = new THREE.Group();
  const eyes: THREE.Mesh[] = [];
  const ears: THREE.Object3D[] = [];
  const tail: THREE.Object3D[] = [];
  const cheeks: THREE.Mesh[] = [];
  const wings: THREE.Object3D[] = [];
  const legs: (THREE.Object3D | null)[] = [null, null, null, null];

  const isChick = species === 'chick';
  const s: Spec = isChick
    ? { body: CHICK.body, belly: CHICK.belly, accent: CHICK.accent, inner: 0xffb347, bd: [0.34, 0.34, 0.32], head: 0.3, legLen: 0.16, legR: 0.025, headAt: [0.2, 0.42] }
    : SPECS[species as Exclude<PetSpecies, 'chick'>];
  const legLen = s.legLen * look.legs;
  const [bx, by, bz] = s.bd;

  const inner = new THREE.Group();
  inner.position.y = legLen + by * 0.9;
  root.add(inner);

  const body = ell(bx, by, bz, s.body);
  inner.add(body);
  const belly = ell(bx * 0.78, by * 0.82, bz * 0.88, s.belly, [bx * 0.08, -by * 0.14, bz * 0.18]);
  belly.scale.z = bz * 0.88;
  inner.add(belly);

  /* 머리 */
  const hr = s.head * look.head;
  const head = new THREE.Group();
  head.position.set(bx * 0.58 + s.headAt[0] * 0.5, by * 0.45 + s.headAt[1] * 0.5, 0);
  inner.add(head);
  const skull = ell(hr, hr * 0.92, hr * 1.02, s.body);
  head.add(skull);
  eye(hr * 0.16, [hr * 0.78, hr * 0.2, hr * 0.4], eyes, head);
  eye(hr * 0.16, [hr * 0.78, hr * 0.2, -hr * 0.4], eyes, head);
  // 볼터치
  head.add(ell(hr * 0.12, hr * 0.08, hr * 0.12, 0xff9fb0, [hr * 0.7, -hr * 0.08, hr * 0.62]));
  head.add(ell(hr * 0.12, hr * 0.08, hr * 0.12, 0xff9fb0, [hr * 0.7, -hr * 0.08, -hr * 0.62]));

  const mouthPoint = new THREE.Object3D();
  let jawPivot: THREE.Group | null = null;
  let mouthIn: THREE.Mesh | null = null;

  if (isChick) {
    // 부리: 윗부리 + 움직이는 아랫부리
    const up = new THREE.Mesh(CONE, m(CHICK.accent));
    up.scale.set(hr * 0.2, hr * 0.38, hr * 0.2);
    up.rotation.z = -Math.PI / 2;
    up.position.set(hr * 0.98, -hr * 0.02, 0);
    head.add(up);
    jawPivot = new THREE.Group();
    jawPivot.position.set(hr * 0.82, -hr * 0.12, 0);
    const low = new THREE.Mesh(CONE, m(0xf08a1c));
    low.scale.set(hr * 0.16, hr * 0.28, hr * 0.16);
    low.rotation.z = -Math.PI / 2;
    low.position.set(hr * 0.16, 0, 0);
    jawPivot.add(low);
    head.add(jawPivot);
    mouthIn = ell(hr * 0.1, hr * 0.01, hr * 0.12, 0xb4374a, [hr * 0.86, -hr * 0.1, 0]);
    head.add(mouthIn);
    mouthPoint.position.set(hr * 1.05, -hr * 0.1, 0);
    head.add(ell(hr * 0.22, hr * 0.22, hr * 0.14, CHICK.body, [0.02, hr * 0.98, 0])); // 머리 깃털
    // 날개
    for (const sz of [1, -1]) {
      const w = new THREE.Group();
      w.position.set(0, by * 0.1, bz * 0.92 * sz);
      const wm = ell(bx * 0.45, by * 0.5, bz * 0.14, CHICK.wing, [-bx * 0.12, -by * 0.12, 0]);
      w.add(wm);
      inner.add(w);
      wings.push(w);
    }
    // 다리 (뒤쪽 둘만, 가늘게)
    for (const [i, sz] of [[2, 1], [3, -1]] as const) {
      const lg = new THREE.Group();
      lg.position.set(bx * 0.05, -by * 0.7 + (legLen - legLen), bz * 0.35 * sz);
      lg.position.y = legLen + by * 0.9 - by * 0.75;
      const stick = new THREE.Mesh(CAPSULE, m(CHICK.accent));
      stick.scale.set(0.022, legLen * 0.45, 0.022);
      stick.position.y = -legLen * 0.5;
      const foot = ell(0.08, 0.02, 0.06, CHICK.accent, [0.04, -legLen * 0.98, 0]);
      lg.add(stick, foot);
      root.add(lg);
      legs[i] = lg;
    }
    // 꼬리깃
    const tg = new THREE.Group();
    tg.position.set(-bx * 0.92, by * 0.2, 0);
    tg.add(ell(0.1, 0.07, 0.1, CHICK.wing, [-0.06, 0.04, 0]));
    inner.add(tg);
    tail.push(tg);
  } else {
    // 코와 입 주변
    const snoutDims: Record<string, [number, number, number]> = { dog: [0.55, 0.4, 0.45], cat: [0.36, 0.28, 0.34], rabbit: [0.34, 0.3, 0.34], hamster: [0.3, 0.26, 0.3], bear: [0.5, 0.38, 0.42] };
    const sd = snoutDims[species];
    const snout = ell(hr * sd[0], hr * sd[1], hr * sd[2], species === 'rabbit' || species === 'cat' || species === 'hamster' ? s.belly : s.belly, [hr * 0.7, -hr * 0.2, 0]);
    head.add(snout);
    const noseColor = species === 'rabbit' || species === 'cat' || species === 'hamster' ? 0xf48aa2 : 0x2a1a1a;
    const nose = ell(hr * 0.1, hr * 0.075, hr * 0.12, noseColor, [hr * (0.7 + sd[0] * 0.92), -hr * 0.1, 0], 0.4);
    head.add(nose);
    mouthIn = ell(hr * 0.16, hr * 0.01, hr * 0.2, 0xa8283f, [hr * 0.78, -hr * 0.36, 0]);
    head.add(mouthIn);
    jawPivot = new THREE.Group();
    jawPivot.position.set(hr * 0.42, -hr * 0.34, 0);
    const jaw = ell(hr * 0.34, hr * 0.12, hr * 0.28, s.belly, [hr * 0.28, -hr * 0.02, 0]);
    const tongue = ell(hr * 0.16, hr * 0.05, hr * 0.14, 0xf2707f, [hr * 0.32, hr * 0.06, 0]);
    jawPivot.add(jaw, tongue);
    head.add(jawPivot);
    mouthPoint.position.set(hr * 0.95, -hr * 0.34, 0);

    // 귀
    const earMat = (c: number) => m(c);
    for (const sz of [1, -1]) {
      const g = new THREE.Group();
      if (species === 'dog') {
        g.position.set(-hr * 0.1, hr * 0.62, hr * 0.62 * sz);
        const e = ell(hr * 0.22, hr * 0.46, hr * 0.28, s.accent, [0, -hr * 0.3, 0]);
        e.rotation.x = 0.35 * sz;
        g.add(e);
      } else if (species === 'cat') {
        g.position.set(-hr * 0.05, hr * 0.78, hr * 0.5 * sz);
        const e = new THREE.Mesh(CONE, earMat(s.body));
        e.scale.set(hr * 0.3, hr * 0.5, hr * 0.2);
        e.position.y = hr * 0.18;
        e.rotation.x = -0.18 * sz;
        const ie = new THREE.Mesh(CONE, earMat(s.inner));
        ie.scale.set(hr * 0.18, hr * 0.32, hr * 0.1);
        ie.position.set(hr * 0.06, hr * 0.12, 0);
        e.add(ie);
        g.add(e);
      } else if (species === 'rabbit') {
        g.position.set(-hr * 0.1, hr * 0.7, hr * 0.38 * sz);
        const e = new THREE.Mesh(CAPSULE, earMat(s.body));
        e.scale.set(hr * 0.2, hr * 0.62, hr * 0.1);
        e.position.y = hr * 0.5;
        const ie = new THREE.Mesh(CAPSULE, earMat(s.inner));
        ie.scale.set(hr * 0.12, hr * 0.5, hr * 0.06);
        ie.position.set(hr * 0.05, hr * 0.5, hr * 0.0);
        g.add(e, ie);
      } else {
        // 곰·햄스터: 동그란 귀
        g.position.set(-hr * 0.1, hr * 0.78, hr * 0.62 * sz);
        g.add(ell(hr * (species === 'bear' ? 0.28 : 0.22), hr * (species === 'bear' ? 0.28 : 0.22), hr * 0.14, s.body));
        const ie = ell(hr * 0.15, hr * 0.15, hr * 0.1, s.inner, [hr * 0.06, 0, 0]);
        g.add(ie);
      }
      head.add(g);
      ears.push(g);
    }

    // 수염 (고양이·토끼·햄스터)
    if (species === 'cat' || species === 'rabbit' || species === 'hamster') {
      for (const sz of [1, -1]) {
        for (const dy of [0.04, -0.06]) {
          const w = new THREE.Mesh(CAPSULE, m(0xffffff));
          w.scale.set(hr * 0.012, hr * 0.26, hr * 0.012);
          w.rotation.z = Math.PI / 2;
          w.rotation.y = 0.35 * sz;
          w.position.set(hr * 0.86, -hr * 0.18 + dy * hr, hr * 0.5 * sz);
          head.add(w);
        }
      }
    }
    // 햄스터 볼주머니
    if (species === 'hamster') {
      for (const sz of [1, -1]) {
        const c = ell(hr * 0.34, hr * 0.3, hr * 0.3, s.belly, [hr * 0.5, -hr * 0.22, hr * 0.62 * sz]);
        head.add(c);
        cheeks.push(c);
      }
    } else {
      for (const sz of [1, -1]) {
        const c = ell(hr * 0.001, hr * 0.001, hr * 0.001, s.belly, [hr * 0.55, -hr * 0.22, hr * 0.62 * sz]);
        head.add(c);
        cheeks.push(c);
      }
    }
    // 곰/고양이 얼룩
    if (species === 'cat') {
      for (const x of [-0.18, 0, 0.18]) inner.add(ell(bx * 0.06, by * 0.02, bz * 0.34, s.accent, [bx * x, by * 0.97, 0]));
    }
    if (species === 'dog') {
      // 빨간 스카프
      const sc = new THREE.Mesh(TORUS, m(0xd9473f));
      sc.scale.set(hr * 0.5, hr * 0.5, hr * 0.5);
      sc.rotation.y = Math.PI / 2;
      sc.position.set(-hr * 0.05, -hr * 0.62, 0);
      head.add(sc);
    }

    // 다리 4개
    const hip = (x: number, z: number) => [bx * x, by * 0.9 - by * 0.55 + legLen - legLen, bz * z] as [number, number, number];
    const legTop = legLen + by * 0.9 - by * 0.55;
    const defs: [number, number, number][] = [[0, 0.55, 0.55], [1, 0.55, -0.55], [2, -0.55, 0.55], [3, -0.55, -0.55]];
    for (const [i, x, z] of defs) {
      const lg = leg(legLen + by * 0.1, s.legR * (species === 'rabbit' && i >= 2 ? 1.25 : 1), s.body, i >= 0 && species === 'dog' ? s.belly : s.body, [bx * x, legTop, bz * z]);
      void hip;
      root.add(lg);
      legs[i] = lg;
    }

    // 꼬리
    const tg = new THREE.Group();
    tg.position.set(-bx * 0.9, by * 0.2, 0);
    inner.add(tg);
    tail.push(tg);
    if (species === 'dog') {
      let prev: THREE.Object3D = tg;
      for (let i = 0; i < 3; i++) {
        const seg = new THREE.Group();
        seg.position.set(i === 0 ? 0 : -0.07, i === 0 ? 0 : 0.07, 0);
        seg.add(ell(0.1 - i * 0.012, 0.1 - i * 0.012, 0.1 - i * 0.012, i === 2 ? s.belly : s.body, [-0.05, 0.05, 0]));
        prev.add(seg);
        tail.push(seg);
        prev = seg;
      }
    } else if (species === 'cat') {
      let prev: THREE.Object3D = tg;
      for (let i = 0; i < 6; i++) {
        const seg = new THREE.Group();
        seg.position.set(i === 0 ? 0 : -0.1, i === 0 ? 0 : 0.05, 0);
        seg.add(ell(0.075, 0.075, 0.075, i % 2 && i > 1 ? s.accent : s.body, [-0.05, 0.02, 0]));
        prev.add(seg);
        tail.push(seg);
        prev = seg;
      }
    } else if (species === 'rabbit') {
      tg.add(ell(0.14, 0.14, 0.14, 0xffffff, [-0.08, 0.04, 0]));
    } else if (species === 'bear') {
      tg.add(ell(0.11, 0.11, 0.11, s.body, [-0.06, 0.02, 0]));
    } else {
      tg.add(ell(0.05, 0.05, 0.05, s.body, [-0.03, 0, 0]));
    }
  }

  const rig: Rig = {
    root, body, belly, head, jawPivot, mouthIn, eyes, ears, tail, legs, cheeks, wings, mouthPoint, legLen, isEgg: false,
    parts: [],
    dispose: () => undefined,
  };
  (rig as Rig & { inner: THREE.Group }).inner = inner;
  head.add(mouthPoint);
  root.scale.setScalar(look.size);
  collect(rig, [inner, head, ...ears, ...tail, ...legs.filter(Boolean) as THREE.Object3D[], ...wings, ...eyes, ...cheeks, body, belly, ...(jawPivot ? [jawPivot] : []), ...(mouthIn ? [mouthIn] : [])]);
  rig.dispose = () => undefined;
  return rig;
}

function collect(rig: Rig, list: THREE.Object3D[]) {
  rig.parts = list;
  rig.root.userData.base = { p: rig.root.position.clone(), r: rig.root.rotation.clone(), s: rig.root.scale.clone() };
  for (const o of list) o.userData.base = { p: o.position.clone(), r: o.rotation.clone(), s: o.scale.clone() };
}

export const innerOf = (rig: Rig): THREE.Group => (rig as Rig & { inner: THREE.Group }).inner;

/** 모든 부위를 처음 모습으로 되돌려요 (애니메이션은 매 프레임 여기에 더해요) */
export function resetPose(rig: Rig) {
  const r0 = rig.root.userData.base;
  rig.root.position.copy(r0.p);
  rig.root.rotation.copy(r0.r);
  rig.root.scale.copy(r0.s);
  for (const o of rig.parts) {
    const b = o.userData.base;
    o.position.copy(b.p);
    o.rotation.copy(b.r);
    o.scale.copy(b.s);
  }
}

function buildEgg(): Rig {
  const root = new THREE.Group();
  const inner = new THREE.Group();
  inner.position.y = 0.58;
  root.add(inner);
  const body = ell(0.44, 0.58, 0.44, 0xfff1d6);
  inner.add(body);
  const spots: [number, number, number, number, number][] = [
    [0.1, 0.1, 0.9, 0.2, 0x9ad8c2],
    [0.09, 0.09, -0.6, 0.5, 0xf5a7b8],
    [0.11, 0.1, 0.2, -0.3, 0x9ad8c2],
    [0.08, 0.08, -0.9, -0.2, 0xf5c36a],
    [0.1, 0.09, 0.5, 0.75, 0xf5a7b8],
  ];
  for (const [rx, ry, a, h, c] of spots) {
    const y = h * 0.5;
    const rad = Math.sqrt(Math.max(0.05, 1 - y * y)) * 0.43;
    const sp = ell(rx, ry, 0.03, c, [Math.cos(a) * rad, y * 0.58, Math.sin(a) * rad]);
    sp.lookAt(sp.position.clone().multiplyScalar(3));
    inner.add(sp);
  }
  const head = new THREE.Group();
  const mouthPoint = new THREE.Object3D();
  head.add(mouthPoint);
  inner.add(head);
  const rig: Rig = { root, body, belly: body, head, jawPivot: null, mouthIn: null, eyes: [], ears: [], tail: [], legs: [null, null, null, null], cheeks: [], wings: [], mouthPoint, legLen: 0, isEgg: true, parts: [], dispose: () => undefined };
  (rig as Rig & { inner: THREE.Group }).inner = inner;
  collect(rig, [inner, body]);
  return rig;
}

export function disposeModels() {
  for (const mt of mats) mt.dispose();
  mats.length = 0;
}
