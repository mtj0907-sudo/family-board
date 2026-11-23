import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { capturable, reach, type ChessPuzzle, type PieceKind } from '../../lib/petChess';

/** 3D 체스판: 나무 판 위에 입체 말이 올라가 있어요. 검은 말을 눌러서 고르고, 맞으면 내 말이 날아가서 잡아요. */
interface Props {
  puzzle: ChessPuzzle;
  picked: number | null;
  onPick: (i: number) => void;
}

const IVORY = 0xf6ecd6;
const DARK = 0x2b2b36;
const GOLD = 0xffc94d;

function lathe(pts: [number, number][], color: number, segs = 32): THREE.Mesh {
  const g = new THREE.LatheGeometry(
    pts.map(([r, y]) => new THREE.Vector2(r, y)),
    segs,
  );
  return new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.12 }));
}
const mat = (color: number) => new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.12 });
const BASE: [number, number][] = [[0, 0], [0.36, 0], [0.38, 0.05], [0.33, 0.1], [0.22, 0.17]];

function piece(kind: PieceKind | 'pawn', color: number): THREE.Group {
  const g = new THREE.Group();
  if (kind === 'pawn') {
    g.add(lathe([...BASE, [0.13, 0.3], [0.17, 0.36], [0.2, 0.4], [0.13, 0.44], [0, 0.46]], color));
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 24, 18), mat(color));
    head.position.y = 0.6;
    g.add(head);
  } else if (kind === 'rook') {
    g.add(lathe([...BASE, [0.2, 0.3], [0.2, 0.62], [0.3, 0.68], [0.3, 0.86], [0.22, 0.86], [0.22, 0.8], [0, 0.8]], color));
    for (let i = 0; i < 4; i++) {
      const c = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.16), mat(color));
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      c.position.set(Math.cos(a) * 0.25, 0.92, Math.sin(a) * 0.25);
      c.rotation.y = -a;
      g.add(c);
    }
  } else if (kind === 'bishop') {
    g.add(lathe([...BASE, [0.15, 0.32], [0.13, 0.56], [0.22, 0.62], [0.1, 0.66], [0, 0.66]], color));
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 18), mat(color));
    head.scale.set(1, 1.35, 1);
    head.position.y = 0.88;
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.06, 14, 10), mat(color));
    ball.position.y = 1.2;
    g.add(head, ball);
  } else if (kind === 'queen') {
    g.add(lathe([...BASE, [0.17, 0.34], [0.14, 0.7], [0.3, 0.8], [0.32, 0.92], [0.2, 0.96], [0, 0.96]], color));
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), mat(color));
      b.position.set(Math.cos(a) * 0.28, 0.98, Math.sin(a) * 0.28);
      g.add(b);
    }
    const top = new THREE.Mesh(new THREE.SphereGeometry(0.11, 18, 12), mat(color));
    top.position.y = 1.1;
    g.add(top);
  } else {
    g.add(lathe([...BASE, [0.28, 0.2], [0, 0.22]], color));
    const s = new THREE.Shape();
    s.moveTo(-0.24, 0);
    s.lineTo(0.24, 0);
    s.quadraticCurveTo(0.26, 0.28, 0.16, 0.5);
    s.lineTo(0.36, 0.56);
    s.quadraticCurveTo(0.42, 0.66, 0.36, 0.72);
    s.lineTo(0.18, 0.8);
    s.lineTo(0.12, 0.98);
    s.lineTo(-0.02, 0.84);
    s.quadraticCurveTo(-0.26, 0.7, -0.24, 0);
    const eg = new THREE.ExtrudeGeometry(s, { depth: 0.2, bevelEnabled: true, bevelSize: 0.045, bevelThickness: 0.045, bevelSegments: 4, curveSegments: 14 });
    const head = new THREE.Mesh(eg, mat(color));
    head.position.set(0, 0.18, -0.1);
    g.add(head);
    for (const z of [0.16, -0.16]) {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), new THREE.MeshStandardMaterial({ color: color === DARK ? 0xffffff : 0x222222 }));
      e.position.set(0.22, 0.86, z);
      g.add(e);
    }
  }
  return g;
}

const pos = (r: number, c: number) => new THREE.Vector3(c - 3.5, 0.2, r - 3.5);
const easeOut = (u: number) => 1 - (1 - u) ** 3;

export function ChessBoard3D({ puzzle, picked, onPick }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<{ reveal: (i: number) => void } | null>(null);
  const pick = useRef(onPick);
  pick.current = onPick;

  useEffect(() => {
    const el = host.current!;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;touch-action:none';
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 80);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a6a4a, 1.5));
    const sun = new THREE.DirectionalLight(0xfff2de, 2.6);
    sun.position.set(-4, 9, 6);
    scene.add(sun);

    // 판
    const frame = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.3, 9.2), new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.55 }));
    frame.position.y = -0.2;
    scene.add(frame);
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const sq = new THREE.Mesh(new THREE.BoxGeometry(1, 0.2, 1), new THREE.MeshStandardMaterial({ color: (r + c) % 2 ? 0xa86f45 : 0xf3dfba, roughness: 0.6 }));
        sq.position.set(c - 3.5, 0.0, r - 3.5);
        scene.add(sq);
      }
    }

    // 말들
    const mine = piece(puzzle.kind, IVORY);
    mine.position.copy(pos(puzzle.me.r, puzzle.me.c));
    mine.scale.setScalar(1.3);
    scene.add(mine);
    const halo = new THREE.Mesh(new THREE.RingGeometry(0.58, 0.72, 40), new THREE.MeshBasicMaterial({ color: GOLD, side: THREE.DoubleSide, transparent: true, opacity: 0.95 }));
    halo.rotation.x = -Math.PI / 2;
    halo.position.copy(pos(puzzle.me.r, puzzle.me.c)).setY(0.215);
    scene.add(halo);
    const foes = puzzle.targets.map((t, i) => {
      const g = piece('pawn', DARK);
      g.position.copy(pos(t.r, t.c));
      g.userData.target = i;
      g.scale.setScalar(1.25);
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.5, 36), new THREE.MeshBasicMaterial({ color: 0xff6b6b, side: THREE.DoubleSide, transparent: true, opacity: 0.8 }));
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.02;
      g.add(ring);
      g.userData.ring = ring;
      scene.add(g);
      return g;
    });
    puzzle.blockers.forEach((b) => {
      const g = piece('pawn', IVORY);
      g.position.copy(pos(b.r, b.c));
      scene.add(g);
    });

    const discs: THREE.Mesh[] = [];
    const resize = () => {
      const w = el.clientWidth || 320;
      const h = el.clientHeight || 320;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      const tan = Math.tan((camera.fov * Math.PI) / 360);
      const dist = Math.max(9.6 / (2 * tan * Math.min(1, camera.aspect)), 12);
      camera.position.set(0, dist * 0.78, dist * 0.62);
      camera.lookAt(0, 0, 0.4);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    // 눌러서 고르기
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let lock = false;
    const onClick = (e: PointerEvent) => {
      if (lock) return;
      const rect = renderer.domElement.getBoundingClientRect();
      ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hits = ray.intersectObjects(foes, true);
      if (!hits.length) return;
      let o: THREE.Object3D | null = hits[0].object;
      while (o && o.userData.target === undefined) o = o.parent;
      if (o) {
        lock = true;
        pick.current(o.userData.target as number);
      }
    };
    renderer.domElement.addEventListener('pointerup', onClick);

    // 정답 보여 주기: 갈 수 있는 칸이 빛나고, 맞으면 내 말이 날아가서 잡아요
    let anim: { t0: number; to: THREE.Vector3; foe: THREE.Group; ok: boolean } | null = null;
    const hit = capturable(puzzle);
    api.current = {
      reveal: (i: number) => {
        const occ = new Set([...puzzle.targets, ...puzzle.blockers].map((s) => `${s.r},${s.c}`));
        for (const s of reach(puzzle.kind, puzzle.me, occ)) {
          const d = new THREE.Mesh(new THREE.CircleGeometry(0.2, 24), new THREE.MeshBasicMaterial({ color: 0x35e08a, transparent: true, opacity: 0.85 }));
          d.rotation.x = -Math.PI / 2;
          d.position.copy(pos(s.r, s.c)).setY(0.22);
          scene.add(d);
          discs.push(d);
        }
        const ok = hit.includes(i);
        (foes[puzzle.answer].userData.ring as THREE.Mesh).material = new THREE.MeshBasicMaterial({ color: 0x35e08a, side: THREE.DoubleSide, transparent: true, opacity: 0.95 });
        if (!ok) (foes[i].userData.ring as THREE.Mesh).material = new THREE.MeshBasicMaterial({ color: 0xff3b3b, side: THREE.DoubleSide, transparent: true, opacity: 0.95 });
        anim = { t0: performance.now(), to: pos(puzzle.targets[puzzle.answer].r, puzzle.targets[puzzle.answer].c), foe: foes[puzzle.answer], ok };
      },
    };

    let raf = 0;
    const from = pos(puzzle.me.r, puzzle.me.c);
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const now = performance.now();
      const tt = now / 1000;
      halo.scale.setScalar(1 + Math.sin(tt * 4) * 0.08);
      mine.position.y = anim ? mine.position.y : 0.2 + Math.max(0, Math.sin(tt * 3)) * 0.05;
      foes.forEach((f, i) => {
        if (!anim) f.position.y = 0.2 + Math.max(0, Math.sin(tt * 3 + i * 1.7)) * 0.06;
        const ring = f.userData.ring as THREE.Mesh;
        if (!anim) (ring.material as THREE.MeshBasicMaterial).opacity = 0.55 + Math.sin(tt * 4 + i) * 0.25;
      });
      if (anim) {
        const u = Math.min(1, (now - anim.t0) / 900);
        if (anim.ok) {
          mine.position.lerpVectors(from, anim.to, easeOut(u));
          mine.position.y = 0.2 + Math.sin(u * Math.PI) * 1.4;
          if (u >= 1) {
            const k = Math.min(1, (now - anim.t0 - 900) / 400);
            anim.foe.scale.setScalar(1.25 * (1 - k));
            anim.foe.rotation.y += 0.3;
          }
        } else {
          mine.rotation.y = Math.sin(u * 28) * 0.4 * (1 - u);
        }
      }
      renderer.render(scene, camera);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.domElement.removeEventListener('pointerup', onClick);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose?.();
        const mt = m.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mt)) mt.forEach((x) => x.dispose());
        else mt?.dispose?.();
      });
      renderer.dispose();
      el.removeChild(renderer.domElement);
    };
  }, [puzzle]);

  useEffect(() => {
    if (picked !== null) api.current?.reveal(picked);
  }, [picked]);

  return <div ref={host} className="gm-chess3d" aria-label="체스판" />;
}
