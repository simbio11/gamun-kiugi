import { JOBS } from '../core/data';
import type { Person } from '../core/types';

// 16×16 절차 생성 도트 초상화.
// 유전자(머리형·머리색·피부·눈·얼굴형·눈썹·입) + 개인 특징(안경·주근깨…) + 나이 단계 + 직업(옷).

const SKIN = ['#f6d7b8', '#eec39a', '#d9a577', '#a8744f', '#fbe3cf'];
const SKIN_SHADE = ['#e0b08e', '#d49f78', '#b98556', '#865a3a', '#ecc6a8'];
const HAIR = ['#2b2220', '#4a3426', '#1c1c28', '#7a4b2a', '#c9a15a', '#8c2f2f', '#d8d0c0', '#5b6f8f', '#c76a8a'];
const LIP = ['#b0645a', '#c97a70', '#9c5048', '#b86b6b'];
const GRAY = '#c9c4bd';
const OUTLINE = '#1d1620';
const EYE = '#231816';

type Stage = 'baby' | 'child' | 'teen' | 'adult' | 'elder';

export function stageOf(age: number): Stage {
  return age < 3 ? 'baby' : age < 13 ? 'child' : age < 20 ? 'teen' : age < 60 ? 'adult' : 'elder';
}

/** 장면 그림(scene.ts)에서 그 사람처럼 그리려고: 머리·피부·옷 색 */
export function looksOf(p: Person, age: number): { hair: string; skin: string; cloth: string; female: boolean; kid: boolean; old: boolean } {
  const st = stageOf(age);
  return {
    hair: st === 'elder' ? GRAY : HAIR[p.genes.hairColor % HAIR.length],
    skin: SKIN[p.genes.skin % SKIN.length],
    cloth: st === 'child' || st === 'baby' ? '#e2b93b' : st === 'teen' ? '#3f6fb5' : JOBS[p.job]?.color ?? '#34506e',
    female: p.sex === 'F',
    kid: st === 'child' || st === 'baby',
    old: st === 'elder',
  };
}

const cache = new Map<string, string>();

export function portraitURL(p: Person, age: number): string {
  const stage = stageOf(age);
  const gn = p.genes;
  const era = eraOf(p.birthYear + age);
  const key = [gn.hairStyle, gn.hairColor, gn.skin, gn.eyes, gn.face, gn.brows, gn.mouth, gn.mark, p.sex, stage, p.job, era].join('-');
  const hit = cache.get(key);
  if (hit) return hit;
  const grid = draw(p, stage, era);
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

/** 옷차림의 시대: 0 1960~70년대 · 1 1980~2030년대 · 2 2040년대~ */
const eraOf = (y: number) => (y < 1983 ? 0 : y < 2040 ? 1 : 2);

function draw(p: Person, stage: Stage, era = 1): (string | null)[][] {
  const g: (string | null)[][] = Array.from({ length: 16 }, () => Array(16).fill(null));
  const set = (x: number, y: number, c: string | null) => {
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
  // 아이 옷·교복도 시대를 탄다: 60~70년대 물려 입은 무채색 옷과 검정 교복, 2040년대~ 형광 기능성 옷
  const kidShirt = era === 0 ? '#8a7a5a' : era === 2 ? '#4fd0e0' : '#e2b93b';
  const teenShirt = era === 0 ? '#1e1e28' : era === 2 ? '#e8ecf4' : '#3f6fb5';
  const shirt = stage === 'baby' ? '#f3b6c8' : stage === 'child' ? kidShirt : stage === 'teen' ? teenShirt : JOBS[p.job].color;
  if (stage === 'baby') rect(4, 13, 11, 15, shirt);
  else if (stage === 'child') {
    rect(4, 12, 11, 15, shirt);
    rect(7, 11, 8, 11, skin);
  } else {
    if (f) {
      // 여자: 좁은 어깨 + 파인 목선
      rect(4, 13, 11, 15, shirt);
      rect(7, 11, 8, 13, skin);
      set(6, 13, skin);
      set(9, 13, skin);
    } else {
      // 남자: 넓은 어깨 + 깃
      rect(3, 13, 12, 15, shirt);
      rect(2, 14, 13, 15, shirt);
      rect(7, 11, 8, 12, skin);
      set(6, 13, '#f2f2f2');
      set(9, 13, '#f2f2f2');
    }
    if (p.job === 'doctor' || p.job === 'pharmacist') rect(7, 13, 8, 15, '#7fb3d5');
    if (['office', 'corp', 'civil', 'public_corp', 'lawyer', 'accountant', 'politician'].includes(p.job)) rect(7, 13, 7, 15, p.job === 'politician' ? '#e8b64c' : '#a33');
    if (['police', 'officer', 'firefighter', 'pilot'].includes(p.job)) set(5, 14, '#f0d060');
    if (p.job === 'nurse') set(7, 14, '#d33');
    if (p.job === 'athlete') rect(3, 15, 12, 15, '#fff');
    if (p.job === 'musician' || p.job === 'entertainer') set(10, 14, '#fff27a');
  }

  // 얼굴
  const top = stage === 'baby' || stage === 'child' ? 6 : 4;
  const bottom = stage === 'baby' ? 12 : stage === 'child' ? 11 : 10;
  rect(5, top, 10, bottom, skin);
  const face = (p.genes.face ?? 1) % 3;
  if (stage !== 'baby') {
    if (face === 0) {
      // 갸름: 턱 끝을 깎는다
      set(5, bottom, null);
      set(10, bottom, null);
      rect(6, bottom + 1, 9, bottom + 1, skin);
    } else if (face === 2) {
      // 둥근 얼굴: 볼이 나온다
      rect(4, top + 2, 4, bottom - 1, skin);
      rect(11, top + 2, 11, bottom - 1, skin);
    }
  }
  if (stage === 'baby') {
    rect(4, top + 1, 4, bottom - 1, skin);
    rect(11, top + 1, 11, bottom - 1, skin);
  }
  if (face !== 0 || stage === 'baby') {
    set(5, bottom, shade);
    set(10, bottom, shade);
  } else {
    set(6, bottom + 1, shade);
    set(9, bottom + 1, shade);
  }

  // 머리카락
  const ht = top - 2;
  const style = p.genes.hairStyle % 7;
  if (stage === 'baby') {
    rect(6, top - 1, 9, top - 1, hair);
    set(7, top - 2, hair);
  } else if (stage === 'elder' && f) {
    // 할머니: 짧은 뽀글 파마
    rect(4, ht, 11, top, hair);
    rect(3, top, 4, top + 3, hair);
    rect(11, top, 12, top + 3, hair);
    set(5, ht - 1, hair);
    set(8, ht - 1, hair);
    set(10, ht - 1, hair);
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
        rect(4, ht, 11, top, hair);
        rect(4, top, 4, top + 3, hair);
        rect(11, top, 12, top + 6, hair);
        break;
      case 3: // 뽀글
        rect(4, ht - 1, 11, top, hair);
        rect(3, top, 4, top + 3, hair);
        rect(11, top, 12, top + 3, hair);
        break;
      case 5: // 앞머리 단발
        rect(4, ht, 11, top + 1, hair);
        rect(4, top, 4, top + 4, hair);
        rect(11, top, 11, top + 4, hair);
        break;
      case 6: // 양갈래
        rect(5, ht, 10, top, hair);
        rect(3, top + 1, 4, top + 6, hair);
        rect(11, top + 1, 12, top + 6, hair);
        break;
      default: // 올림머리
        rect(4, ht + 1, 11, top, hair);
        rect(6, ht - 1, 9, ht, hair);
        rect(4, top, 4, top + 3, hair);
        rect(11, top, 11, top + 3, hair);
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
      case 5: // 투블럭
        rect(4, ht, 11, top - 1, hair);
        rect(5, top, 10, top, hair);
        break;
      case 6: // 덮은 머리 (남자는 귀 밑까지만)
        rect(4, ht, 11, top, hair);
        rect(4, top, 4, top + 3, hair);
        rect(11, top, 11, top + 3, hair);
        break;
      default: // 스포츠
        rect(5, ht + 2, 10, top, hair);
    }
  }

  // 눈·눈썹·입
  const ey = top + 3;
  // 성별 표시: 여자는 머리핀·리본, 속눈썹, 붉은 입술, 귀걸이 / 남자는 짙은 눈썹, 구레나룻, 수염 자국
  const kidish = stage === 'child' || stage === 'teen';
  if (f && stage !== 'baby') {
    const acc = ['#e8506a', '#f0a0c0', '#f0d060', '#8a6ad0'][p.genes.hairColor % 4];
    if (kidish) {
      set(10, top - 2, acc);
      set(11, top - 2, acc);
      set(11, top - 3, acc);
    } else set(10, top - 1, acc);
  }
  const eyes = p.genes.eyes % 5;
  const grown = stage !== 'baby';
  set(6, ey, EYE);
  set(9, ey, EYE);
  if (grown) {
    if (eyes === 1) {
      // 큰 눈
      set(6, ey - 1, EYE);
      set(9, ey - 1, EYE);
    } else if (eyes === 3) {
      // 가로로 긴 눈
      set(5, ey, EYE);
      set(10, ey, EYE);
    } else if (eyes === 4) {
      // 반짝이는 눈
      set(6, ey - 1, EYE);
      set(9, ey - 1, EYE);
      set(6, ey - 1, '#fff');
      set(9, ey - 1, '#fff');
      set(6, ey, EYE);
      set(9, ey, EYE);
    }
    const brows = (p.genes.brows ?? 0) % 3;
    const bc = stage === 'elder' ? GRAY : eyes === 2 ? hair : HAIR[p.genes.hairColor % HAIR.length];
    if (brows === 1 || eyes === 2) {
      // 짙은 일자 눈썹
      rect(5, ey - 2, 6, ey - 2, bc);
      rect(9, ey - 2, 10, ey - 2, bc);
    } else if (brows === 2) {
      // 올라간 눈썹
      set(5, ey - 1, bc);
      set(6, ey - 2, bc);
      set(10, ey - 1, bc);
      set(9, ey - 2, bc);
    }
  }
  if (grown && stage !== 'child' && f) {
    // 속눈썹
    set(5, ey - 1, EYE);
    set(10, ey - 1, EYE);
  }
  if (grown && !f && stage !== 'child') {
    // 짙은 일자 눈썹
    const bc = stage === 'elder' ? GRAY : HAIR[p.genes.hairColor % HAIR.length];
    rect(5, ey - 2, 6, ey - 2, bc);
    rect(9, ey - 2, 10, ey - 2, bc);
    if (stage === 'adult' || stage === 'elder') {
      // 구레나룻
      set(5, top + 1, hair);
      set(10, top + 1, hair);
    }
  }
  const my = Math.min(bottom - 1, ey + 2);
  const mouth = (p.genes.mouth ?? 0) % 4;
  const lip = f && (stage === 'teen' || stage === 'adult') ? ['#d8485a', '#e05a6a', '#c83c50', '#d05070'][mouth] : f ? LIP[mouth] : ['#9c5a50', '#a86458', '#8e5048', '#9c5a50'][mouth];
  if (mouth === 1 && grown) {
    // 미소
    set(6, my, lip);
    set(7, my + 1 <= bottom ? my + 1 : my, lip);
    set(8, my + 1 <= bottom ? my + 1 : my, lip);
    set(9, my, lip);
  } else if (mouth === 2 && grown) {
    set(7, my, lip); // 작은 입
  } else {
    set(7, my, lip);
    set(8, my, lip);
  }
  if (f && (stage === 'adult' || stage === 'elder') && mouth === 2 && grown) set(8, my, lip); // 여자 어른은 입술이 도톰하게
  if (!f && stage === 'adult' && (p.genes.face ?? 1) % 3 !== 2 && (p.genes.mouth ?? 0) % 2 === 0) {
    // 수염 자국
    set(6, my + 1 <= bottom ? my + 1 : my, shade);
    set(9, my + 1 <= bottom ? my + 1 : my, shade);
  }
  if (f && (stage === 'adult' || stage === 'elder')) {
    // 귀걸이
    set(4, ey + 2, '#f0d060');
    set(11, ey + 2, '#f0d060');
  }
  if (f || stage === 'baby' || (p.genes.mark ?? 0) === 4) {
    set(5, ey + 1, '#f19a9a');
    set(10, ey + 1, '#f19a9a');
  }
  if (stage === 'elder') {
    set(5, ey + 1, shade);
    set(10, ey + 1, shade);
  }
  // 개인 특징 (유전 안 됨)
  if (grown) {
    switch (p.genes.mark ?? 0) {
      case 1: // 안경
        for (const x of [5, 6, 9, 10]) set(x, ey - 1, '#3a3a4a');
        set(7, ey, '#3a3a4a');
        set(8, ey, '#3a3a4a');
        set(5, ey, '#3a3a4a');
        set(10, ey, '#3a3a4a');
        break;
      case 2: // 주근깨
        set(5, ey + 1, '#b9805a');
        set(6, ey + 2, '#b9805a');
        set(10, ey + 1, '#b9805a');
        set(9, ey + 2, '#b9805a');
        break;
      case 3: // 점
        set(9, my, '#3a2a22');
        break;
      case 5: // 선글라스
        if (stage === 'adult') rect(5, ey - 1, 10, ey, '#15151c');
        break;
    }
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
