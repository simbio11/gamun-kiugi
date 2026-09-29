// 시드 기반 RNG (mulberry32). 상태는 GameState.rng 에 숫자로 저장돼 세이브/재현 가능.
export interface RngHolder {
  rng: number;
}

export function next(h: RngHolder): number {
  h.rng = (h.rng + 0x6d2b79f5) | 0;
  let t = h.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export const chance = (h: RngHolder, p: number) => next(h) < p;
export const int = (h: RngHolder, min: number, max: number) => min + Math.floor(next(h) * (max - min + 1));
export const pick = <T>(h: RngHolder, arr: readonly T[]): T => arr[Math.floor(next(h) * arr.length)];

export function normal(h: RngHolder, mean = 0, sd = 1): number {
  const u = Math.max(next(h), 1e-9);
  const v = next(h);
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function shuffle<T>(h: RngHolder, arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(next(h) * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
