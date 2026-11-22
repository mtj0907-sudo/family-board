import type { RoutineItem } from './types';

export function routineProgress(items: RoutineItem[], done?: Record<string, boolean>) {
  const total = items.length;
  const count = items.filter((i) => done?.[i.key]).length;
  return { done: count, total, ratio: total ? count / total : 0 };
}
