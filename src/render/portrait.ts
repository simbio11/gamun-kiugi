import { JOBS } from '../core/data';
import type { Person } from '../core/types';

// 16×16 절차 생성 도트 초상화. 유전자(머리형·머리색·피부·눈) + 나이 단계 + 직업(옷 색).

const SKIN = ['#f6d7b8', '#eec39a', '#d9a577', '#a8744f'];
const SKIN_SHADE = ['#e0b08e', '#d49f78', '#b98556', '#865a3a'];
const HAIR = ['#2b2220', '#4a3426', '#1c1c28', '#7a4b2a', '#c9a15a', '#8c2f2f'];
const GRAY = '#c9c4bd';
const OUTLINE = '#1d1620';
const EYE = '#231816';

type Stage = 'baby' | 'child' | 'teen' | 'adult' | 'elder';

export function stageOf(age: number): Stage {
  return age < 3 ? 'baby' : age < 13 ? 'child' : age < 20 ? 'teen' : age < 60 ? 'adult' : 'elder';
}

const cache = new Map<string, string>();

export function portraitURL(p: Person, age: number): string {
  const stage = stageOf(age);
  const key = [p.genes.hairStyle, p.genes.hairColor, p.genes.skin, p.genes.eyes, p.sex, stage, p.job].join('-');
  const hit = cache.get(key);
  if (hit) return hit;
  const grid = draw(p, stage);
  const c = document.createElement('canvas');
  c.width = 16;
  c.height = 16;
  const ctx = c.getContext('2d')!;
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      const col = grid[y][x];
      if (col) {
        ctx.fillStyle = col;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  const url = c.toDataURL();
  cache.set(key, url);
  return url;
}

function draw(p: Person, stage: Stage): (string | null)[][] {
  const g: (string | null)[][] = Array.from({ length: 16 }, () => Array(16).fill(null));
  const set = (x: number, y: number, c: string) => {
    if (x >= 0 && x < 16 && y >= 0 && y < 16) g[y][x] = c;
  };
  const rect = (x0: number, y0: number, x1: number, y1: number, c: string) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, c);
  };
  const skin = SKIN[p.genes.skin % SKIN.length];
  const shade = SKIN_SHADE[p.genes.skin % SKIN.length];
  const hair = stage === 'elder' ? GRAY : HAIR[p.genes.hairColor % HAIR.length];
  const f = p.sex === 'F';

  // 몸
  const shirt = stage === 'baby' ? '#f3b6c8' : stage === 'child' ? '#e2b93b' : stage === 'teen' ? '#3f6fb5' : JOBS[p.job].color;
  if (stage === 'baby') rect(4, 13, 11, 15, shirt);
  else if (stage === 'child') {
    rect(4, 12, 11, 15, shirt);
    rect(7, 11, 8, 11, skin);
  } else {
    rect(3, 13, 12, 15, shirt);
    rect(7, 11, 8, 12, skin);
    if (p.job === 'doctor') rect(7, 13, 8, 15, '#7fb3d5');
    if (p.job === 'office' || p.job === 'civil') rect(7, 13, 7, 15, '#a33');
  }

  // 얼굴
  const top = stage === 'baby' || stage === 'child' ? 6 : 4;
  const bottom = stage === 'baby' ? 12 : stage === 'child' ? 11 : 10;
  rect(5, top, 10, bottom, skin);
  if (stage === 'baby') {
    rect(4, top + 1, 4, bottom - 1, skin);
    rect(11, top + 1, 11, bottom - 1, skin);
  }
  set(5, bottom, shade);
  set(10, bottom, shade);

  // 머리카락
  const ht = top - 2;
  const style = p.genes.hairStyle % 5;
  if (stage === 'baby') {
    rect(6, top - 1, 9, top - 1, hair);
    set(7, top - 2, hair);
  } else if (stage === 'elder' && !f && style % 2 === 0) {
    rect(5, top, 5, top + 2, hair);
    rect(10, top, 10, top + 2, hair);
    rect(6, top - 1, 9, top - 1, hair);
  } else if (f) {
    switch (style) {
      case 0: // 단발
        rect(4, ht, 11, top, hair);
        rect(4, top, 4, top + 5, hair);
        rect(11, top, 11, top + 5, hair);
        break;
      case 1: // 긴 생머리
        rect(4, ht, 11, top, hair);
        rect(4, top, 4, bottom + 2, hair);
        rect(11, top, 11, bottom + 2, hair);
        break;
      case 2: // 포니테일
        rect(5, ht, 10, top, hair);
        rect(11, top, 12, top + 4, hair);
        break;
      case 3: // 뽀글
        rect(4, ht - 1, 11, top, hair);
        rect(3, top, 4, top + 3, hair);
        rect(11, top, 12, top + 3, hair);
        break;
      default: // 올림머리
        rect(5, ht + 1, 10, top, hair);
        rect(7, ht - 1, 8, ht, hair);
    }
  } else {
    switch (style) {
      case 0: // 짧은 머리
        rect(5, ht + 1, 10, top, hair);
        set(5, top + 1, hair);
        set(10, top + 1, hair);
        break;
      case 1: // 가르마
        rect(4, ht + 1, 10, top, hair);
        rect(4, top, 4, top + 2, hair);
        set(9, top + 1, hair);
        set(10, top + 1, hair);
        break;
      case 2: // 덥수룩
        rect(4, ht, 11, top, hair);
        rect(4, top, 4, top + 3, hair);
        rect(11, top, 11, top + 3, hair);
        break;
      case 3: // 곱슬
        rect(4, ht, 11, top, hair);
        set(4, ht - 1, hair);
        set(7, ht - 1, hair);
        set(10, ht - 1, hair);
        rect(4, top, 4, top + 1, hair);
        rect(11, top, 11, top + 1, hair);
        break;
      default: // 스포츠
        rect(5, ht + 2, 10, top, hair);
    }
  }

  // 눈·입
  const ey = top + 3;
  const eyes = p.genes.eyes % 3;
  set(6, ey, EYE);
  set(9, ey, EYE);
  if (eyes === 1 && stage !== 'baby') {
    set(6, ey - 1, EYE);
    set(9, ey - 1, EYE);
  }
  if (eyes === 2 && stage !== 'baby') {
    set(5, ey - 2, hair);
    set(6, ey - 2, hair);
    set(9, ey - 2, hair);
    set(10, ey - 2, hair);
  }
  const my = Math.min(bottom - 1, ey + 2);
  set(7, my, '#b0645a');
  set(8, my, '#b0645a');
  if (f || stage === 'baby' || stage === 'child') {
    set(5, ey + 1, '#f19a9a');
    set(10, ey + 1, '#f19a9a');
  }
  if (stage === 'elder') {
    set(5, ey + 1, shade);
    set(10, ey + 1, shade);
  }

  // 외곽선
  const out: (string | null)[][] = g.map((r) => [...r]);
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      if (g[y][x]) continue;
      const n = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ].some(([dx, dy]) => g[y + dy]?.[x + dx]);
      if (n) out[y][x] = OUTLINE;
    }
  return out;
}
