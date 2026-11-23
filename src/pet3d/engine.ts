import * as THREE from 'three';
import type { Anim, PetMood, PetSpecies, PetStage } from '../lib/pet';
import { buildPet, disposeModels, type Rig } from './models';
import { applyPose, type PoseOpts } from './poses';

export type FoodKind = 'cookie' | 'rice';
export type ServeMode = 'eat' | 'refuse' | 'flee';

interface Food {
  mesh: THREE.Group;
  kind: FoodKind;
  mode: ServeMode;
  t0: number;
  start: THREE.Vector3;
  phase: 'fly' | 'eat' | 'drop' | 'done';
  eatT0: number;
  vy: number;
  hold: THREE.Vector3 | null;
}
interface Bubble {
  mesh: THREE.Mesh;
  t0: number;
  life: number;
  vx: number;
  wob: number;
}

const FLY = 0.8;
const BITE = 0.42;
const norm = (a: number) => {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
};
const lerpAngle = (a: number, b: number, k: number) => a + norm(b - a) * k;

function makeFood(kind: FoodKind): THREE.Group {
  const g = new THREE.Group();
  if (kind === 'cookie') {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.04, 24), new THREE.MeshStandardMaterial({ color: 0xe0a24d, roughness: 0.8 }));
    g.add(base);
    for (let i = 0; i < 6; i++) {
      const chip = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), new THREE.MeshStandardMaterial({ color: 0x5a3320, roughness: 0.7 }));
      const a = (i / 6) * Math.PI * 2;
      chip.position.set(Math.cos(a) * 0.06, 0.02, Math.sin(a) * 0.06);
      g.add(chip);
    }
    g.rotation.x = 0.5;
  } else {
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.1, 0.1, 24), new THREE.MeshStandardMaterial({ color: 0x6aa8e0, roughness: 0.5 }));
    const rice = new THREE.Mesh(new THREE.SphereGeometry(0.14, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }));
    rice.position.y = 0.05;
    g.add(bowl, rice);
  }
  g.scale.setScalar(1.2);
  return g;
}

/** 3D 펫을 그리고 움직이는 엔진 (React와 따로 있어요) */
export class PetEngine {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
  private actor = new THREE.Group();
  private face = new THREE.Group();
  private shadow: THREE.Mesh;
  private rig: Rig | null = null;
  private key = '';
  private raf = 0;
  private clock = new THREE.Clock();
  private time = 0;
  private anim: Anim = 'idle';
  private animT0 = 0;
  private mood: PetMood = 'ok';
  private bellyTarget = 0.5;
  private belly = 0.5;
  private energy = 1;
  private grow = 0;
  private from = 0;
  private to = 0;
  private x0 = 0;
  private dur = 0;
  private dir = 1;
  private yaw = -0.8;
  private camYaw = 0;
  private lastDrag = -99;
  private R = 6.4;
  private zoom = 1;
  private halfW = 1.5;
  private food: Food | null = null;
  private bubbles: Bubble[] = [];
  private stars: THREE.Group;
  private lastBubble = 0;
  private disposed = false;
  private ro: ResizeObserver;
  private down: { x: number; y: number; yaw: number } | null = null;
  private moved = false;
  onPoke: () => void = () => undefined;

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xf0d6b0, 1.5));
    const sun = new THREE.DirectionalLight(0xfff0dc, 2.3);
    sun.position.set(2.5, 4.5, 3.5);
    this.scene.add(sun);
    const rim = new THREE.DirectionalLight(0xbfdcff, 0.7);
    rim.position.set(-3, 2, -2);
    this.scene.add(rim);
    this.scene.add(this.actor);
    this.actor.add(this.face);

    // 바닥 그림자
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const cx = c.getContext('2d')!;
    const grad = cx.createRadialGradient(32, 32, 2, 32, 32, 30);
    grad.addColorStop(0, 'rgba(70,40,20,.5)');
    grad.addColorStop(1, 'rgba(70,40,20,0)');
    cx.fillStyle = grad;
    cx.fillRect(0, 0, 64, 64);
    this.shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = 0.005;
    this.actor.add(this.shadow);

    // 어지러울 때 머리 위를 도는 별
    this.stars = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const st = new THREE.Mesh(new THREE.OctahedronGeometry(0.06), new THREE.MeshBasicMaterial({ color: 0xffd23f }));
      this.stars.add(st);
    }
    this.stars.visible = false;
    this.actor.add(this.stars);

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas);
    this.resize();
    canvas.addEventListener('pointerdown', this.pd);
    canvas.addEventListener('pointermove', this.pm);
    canvas.addEventListener('pointerup', this.pu);
    canvas.addEventListener('pointercancel', this.pu);
    this.clock.start();
    this.loop();
  }

  private pd = (e: PointerEvent) => {
    this.down = { x: e.clientX, y: e.clientY, yaw: this.camYaw };
    this.moved = false;
    this.canvas.setPointerCapture?.(e.pointerId);
  };
  private pm = (e: PointerEvent) => {
    if (!this.down) return;
    const dx = e.clientX - this.down.x;
    if (Math.abs(dx) > 8) this.moved = true;
    if (this.moved) {
      this.camYaw = Math.max(-1.35, Math.min(1.35, this.down.yaw - dx * 0.008));
      this.lastDrag = this.time;
    }
  };
  private pu = () => {
    if (this.down && !this.moved) this.onPoke();
    this.down = null;
  };

  private resize() {
    const w = this.canvas.clientWidth || 300;
    const h = this.canvas.clientHeight || 400;
    this.renderer.setSize(w, h, false);
    const aspect = w / h;
    this.camera.aspect = aspect;
    const tan = Math.tan((this.camera.fov * Math.PI) / 360);
    this.R = Math.min(8.8, Math.max(3.6, 3.4 / (2 * tan * aspect)));
    this.halfW = this.R * tan * aspect;
    this.camera.updateProjectionMatrix();
  }

  /** 종류·단계가 바뀌면 새로 만들어요 */
  setPet(species: PetSpecies, stage: PetStage, grow: number) {
    this.grow = grow;
    const key = `${species}-${stage}`;
    if (key === this.key) return;
    this.key = key;
    if (this.rig) this.face.remove(this.rig.root);
    this.rig = buildPet(species, stage);
    this.face.add(this.rig.root);
  }

  setState(mood: PetMood, belly: number, energy: number) {
    this.mood = mood;
    this.bellyTarget = belly;
    this.energy = energy;
  }

  /** 가로 위치(0~100%)와 방향, 움직이는 시간 */
  setTarget(xPct: number, dir: number, durMs: number) {
    const wx = ((xPct - 50) / 50) * this.halfW * 0.85;
    if (wx === this.to && dir === this.dir) return;
    this.from = this.curX();
    this.x0 = this.time;
    this.to = wx;
    this.dur = durMs / 1000;
    this.dir = dir;
  }
  private curX() {
    if (this.dur <= 0) return this.to;
    const u = Math.min(1, (this.time - this.x0) / this.dur);
    return this.from + (this.to - this.from) * u;
  }
  private moving() {
    return this.dur > 0 && this.time - this.x0 < this.dur;
  }

  setAnim(a: Anim) {
    if (a === this.anim) return;
    this.anim = a;
    this.animT0 = this.time;
  }

  /** 간식·밥을 날려 보내요 */
  serve(kind: FoodKind, mode: ServeMode) {
    if (this.food) this.scene.remove(this.food.mesh);
    const mesh = makeFood(kind);
    const x = this.curX();
    const start = new THREE.Vector3(x + (Math.random() - 0.5) * 0.6, 0.15, 3.2);
    mesh.position.copy(start);
    this.scene.add(mesh);
    this.food = { mesh, kind, mode, t0: this.time, start, phase: 'fly', eatT0: 0, vy: 0, hold: null };
    this.animT0 = this.time;
  }

  private spawnBubble() {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), new THREE.MeshStandardMaterial({ color: 0xcfeeff, transparent: true, opacity: 0.55, roughness: 0.1 }));
    const r = 0.03 + Math.random() * 0.05;
    mesh.scale.setScalar(r);
    mesh.position.set(this.actor.position.x + (Math.random() - 0.5) * 0.8, 0.2 + Math.random() * 0.6, (Math.random() - 0.3) * 0.6);
    this.scene.add(mesh);
    this.bubbles.push({ mesh, t0: this.time, life: 1.2 + Math.random() * 0.8, vx: (Math.random() - 0.5) * 0.2, wob: Math.random() * 6 });
  }

  private loop = () => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    if (document.hidden) return;
    const dt = Math.min(0.05, this.clock.getDelta());
    this.time += dt;
    this.step(dt);
    this.renderer.render(this.scene, this.camera);
  };

  private step(dt: number) {
    const rig = this.rig;
    if (!rig) return;
    const t = this.time - this.animT0;
    const x = this.curX();
    this.actor.position.x = x;
    const running = this.anim === 'flee' || this.anim === 'walk' || this.moving();

    // 방향: 걸을 땐 가는 쪽(옆모습), 멈추면 카메라 쪽으로 돌아봐요
    let target: number;
    if (running && this.anim !== 'eat') target = this.dir > 0 ? 0 : Math.PI;
    else if (this.anim === 'eat' || this.anim === 'hug' || this.anim === 'refuse' || this.anim === 'tickle') target = this.dir > 0 ? -1.25 : -1.9;
    else target = this.dir > 0 ? -0.75 : -2.4;
    this.yaw = lerpAngle(this.yaw, target, 1 - Math.exp(-dt * (this.anim === 'flee' ? 14 : 6)));
    this.face.rotation.y = this.yaw;

    // 배부름 부드럽게
    this.belly += (this.bellyTarget - this.belly) * (1 - Math.exp(-dt * 2));

    /* 먹이 */
    let chew = 0;
    let wide = 0;
    let away = 0;
    const f = this.food;
    if (f) {
      const mouth = new THREE.Vector3();
      rig.mouthPoint.getWorldPosition(mouth);
      if (rig.isEgg) mouth.set(this.actor.position.x, 0.7, 0.2);
      if (f.phase === 'fly') {
        const u = Math.min(1, (this.time - f.t0) / FLY);
        const stopAt = f.mode === 'eat' ? 1 : 0.55;
        const uu = Math.min(u, stopAt);
        const target = f.mode === 'eat' ? mouth : mouth.clone().add(new THREE.Vector3(0, 0.02, 0.5));
        f.mesh.position.lerpVectors(f.start, target, uu);
        f.mesh.position.y += Math.sin(uu * Math.PI) * 0.9 * (1 - uu * 0.3);
        f.mesh.rotation.y += dt * 10;
        wide = f.mode === 'eat' ? Math.min(1, u * 1.6) : 0;
        if (u >= 1) {
          if (f.mode === 'eat') {
            f.phase = 'eat';
            f.eatT0 = this.time;
          } else {
            f.phase = 'drop';
            f.vy = 0.5;
            f.hold = f.mesh.position.clone();
          }
        }
      } else if (f.phase === 'eat') {
        const e = this.time - f.eatT0;
        const bites = 3;
        const k = Math.min(bites, Math.floor(e / BITE));
        f.mesh.position.copy(mouth);
        f.mesh.scale.setScalar(1.2 * Math.max(0.05, 1 - k / bites) * (1 - (e % BITE) / BITE * 0.08));
        chew = 1;
        wide = 0.25;
        if (e > BITE * bites + 0.35) {
          this.scene.remove(f.mesh);
          this.food = null;
        }
      } else if (f.phase === 'drop') {
        f.vy -= 9 * dt;
        f.mesh.position.y += f.vy * dt;
        if (f.mesh.position.y < 0.05) {
          f.mesh.position.y = 0.05;
          f.vy = 0;
          f.mesh.scale.multiplyScalar(0.97);
          if (f.mesh.scale.x < 0.2) {
            this.scene.remove(f.mesh);
            this.food = null;
          }
        }
        away = 1;
      }
      if (f && (f.mode === 'refuse' || f.mode === 'flee') && f.phase !== 'fly') away = 1;
      if (f && f.mode === 'refuse' && f.phase === 'fly') away = Math.min(1, (this.time - f.t0) / 0.5);
    }

    /* 몸짓 */
    const opts: PoseOpts = {
      time: this.time,
      t,
      mood: this.mood,
      belly: this.belly,
      energy: this.energy,
      chew,
      wide,
      away,
      shut: this.anim === 'refuse' ? 0.3 : 0,
    };
    // 먹이가 날아오는 동안·씹는 동안에는 먹는 몸짓으로
    const effective: Anim = f && f.mode === 'eat' && this.anim === 'eat' ? 'eat' : this.anim;
    applyPose(rig, effective, opts);

    // 아기→어른 사이에서도 매일 조금씩 커져요
    const k = 0.9 + 0.1 * this.grow;
    rig.root.scale.multiplyScalar(k);

    /* 그림자 */
    const lift = Math.max(0, rig.root.position.y + (rig.parts[0]?.position.y ?? 0) * 0);
    this.shadow.scale.setScalar(1.15 * rig.root.scale.x * (rig.isEgg ? 0.8 : 1.3) * (1 - Math.min(0.4, lift * 0.4)));
    (this.shadow.material as THREE.MeshBasicMaterial).opacity = 0.9 - Math.min(0.4, lift);

    /* 비눗방울·별 */
    if (this.anim === 'wash' && this.time - this.lastBubble > 0.07) {
      this.lastBubble = this.time;
      this.spawnBubble();
    }
    this.bubbles = this.bubbles.filter((b) => {
      const age = this.time - b.t0;
      if (age > b.life) {
        this.scene.remove(b.mesh);
        b.mesh.geometry.dispose();
        (b.mesh.material as THREE.Material).dispose();
        return false;
      }
      b.mesh.position.y += dt * 0.5;
      b.mesh.position.x += Math.sin(age * 4 + b.wob) * dt * 0.15 + b.vx * dt;
      (b.mesh.material as THREE.MeshStandardMaterial).opacity = 0.55 * (1 - age / b.life);
      return true;
    });
    this.stars.visible = this.anim === 'dizzy';
    if (this.stars.visible) {
      this.stars.children.forEach((s, i) => {
        const a = this.time * 6 + (i * Math.PI * 2) / 3;
        s.position.set(Math.cos(a) * 0.35, 1.25 * rig.root.scale.y + Math.sin(a * 2) * 0.03, Math.sin(a) * 0.35);
        s.rotation.y = a * 2;
      });
    }

    /* 카메라: 손으로 돌려 보면 옆·뒤모습도 볼 수 있어요 */
    if (this.time - this.lastDrag > 3.5) this.camYaw *= 1 - Math.min(1, dt * 1.8);
    const zoomT = this.anim === 'hug' ? 0.78 : 1;
    this.zoom += (zoomT - this.zoom) * (1 - Math.exp(-dt * 4));
    const R = this.R * this.zoom;
    const cy = 0.55 + this.camYaw * 0;
    const px = this.actor.position.x * (this.anim === 'hug' ? 0.9 : 0.35);
    this.camera.position.set(px + Math.sin(this.camYaw) * R, 2.05, Math.cos(this.camYaw) * R);
    this.camera.lookAt(px, cy, 0);
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.canvas.removeEventListener('pointerdown', this.pd);
    this.canvas.removeEventListener('pointermove', this.pm);
    this.canvas.removeEventListener('pointerup', this.pu);
    this.canvas.removeEventListener('pointercancel', this.pu);
    this.renderer.dispose();
    disposeModels();
  }
}
