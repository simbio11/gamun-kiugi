import { bustSmallURL, bustColors } from './bust';
import type { Person } from '../core/types';

// 16×16 초상화 — 상세 초상화(bust.ts, 32×32)를 반으로 줄인 것이라 같은 사람으로 보인다.

type Stage = 'baby' | 'child' | 'teen' | 'adult' | 'elder';

export function stageOf(age: number): Stage {
  return age < 3 ? 'baby' : age < 13 ? 'child' : age < 20 ? 'teen' : age < 60 ? 'adult' : 'elder';
}

/** 장면 그림(scene.ts)에서 그 사람처럼 그리려고: 머리·피부·옷 색 */
export function looksOf(p: Person, age: number): { hair: string; skin: string; cloth: string; female: boolean; kid: boolean; old: boolean } {
  const st = stageOf(age);
  const year = p.birthYear !== undefined ? p.birthYear + age : 2025;
  return {
    ...bustColors(p, age, year),
    female: p.sex === 'F',
    kid: st === 'child' || st === 'baby',
    old: st === 'elder',
  };
}

export function portraitURL(p: Person, age: number): string {
  const year = p.birthYear !== undefined ? p.birthYear + age : 2025;
  return bustSmallURL(p, age, year);
}

