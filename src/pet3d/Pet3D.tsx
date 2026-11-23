import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { Anim, PetMood, PetSpecies, PetStage } from '../lib/pet';
import { PetEngine, type FoodKind, type ServeMode } from './engine';

export interface Pet3DHandle {
  serve: (kind: FoodKind, mode: ServeMode) => void;
}
interface Props {
  species: PetSpecies;
  stage: PetStage;
  /** 같은 단계 안에서 자란 정도 0~1 */
  grow: number;
  mood: PetMood;
  /** 배부름·기운 0~1 */
  belly: number;
  energy: number;
  /** 가로 위치(%)와 방향, 움직이는 시간(ms) */
  x: number;
  dir: number;
  dur: number;
  anim: Anim;
  onPoke: () => void;
}

/** 3D 펫이 그려지는 캔버스. 손가락으로 좌우로 끌면 옆모습·뒷모습도 볼 수 있어요. */
export const Pet3D = forwardRef<Pet3DHandle, Props>(function Pet3D(p, ref) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const eng = useRef<PetEngine | null>(null);
  const [ready, setReady] = useState(false);
  const poke = useRef(p.onPoke);
  poke.current = p.onPoke;

  useEffect(() => {
    if (!canvas.current) return;
    const e = new PetEngine(canvas.current);
    e.onPoke = () => poke.current();
    eng.current = e;
    setReady(true);
    return () => {
      e.dispose();
      eng.current = null;
    };
  }, []);
  useEffect(() => {
    if (ready) eng.current?.setPet(p.species, p.stage, p.grow);
  }, [ready, p.species, p.stage, p.grow]);
  useEffect(() => {
    if (ready) eng.current?.setState(p.mood, p.belly, p.energy);
  }, [ready, p.mood, p.belly, p.energy]);
  useEffect(() => {
    if (ready) eng.current?.setTarget(p.x, p.dir, p.dur);
  }, [ready, p.x, p.dir, p.dur]);
  useEffect(() => {
    if (ready) eng.current?.setAnim(p.anim);
  }, [ready, p.anim]);
  useImperativeHandle(ref, () => ({ serve: (k, m) => eng.current?.serve(k, m) }), []);

  return <canvas ref={canvas} className="pet-canvas" aria-hidden />;
});
