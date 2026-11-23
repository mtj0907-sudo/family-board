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

/** 펫 그림이 그려지고 움직이는 캔버스 (그림을 3D 공간에서 구부려 움직여요) */
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
    if (ready) eng.current?.setPet(p.species, p.stage, p.grow, import.meta.env.BASE_URL);
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
