// 24×24 절차 생성 도트 건물: 사는 집과 가진 부동산을 가계도 아래에 그린다.
export type BuildingKind = 'tower' | 'luxury' | 'apt' | 'villa' | 'banjiha' | 'officetel' | 'building' | 'shop' | 'land' | 'house' | 'car' | 'sedan' | 'suv' | 'sports' | 'yacht';

const N = 24;
const OUT = '#1d1620';
const cache = new Map<string, string>();

type Grid = (string | null)[][];
const blank = (): Grid => Array.from({ length: N }, () => Array<string | null>(N).fill(null));

function rect(g: Grid, x0: number, y0: number, x1: number, y1: number, c: string) {
  for (let y = Math.max(0, y0); y <= Math.min(N - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(N - 1, x1); x++) g[y][x] = c;
}
/** 테두리 있는 몸체 */
function body(g: Grid, x0: number, y0: number, x1: number, y1: number, fill: string) {
  rect(g, x0, y0, x1, y1, OUT);
  rect(g, x0 + 1, y0 + 1, x1 - 1, y1 - 1, fill);
}
/** 창문 격자 (불 켜진 창은 노랗게) */
function windows(g: Grid, x0: number, y0: number, x1: number, y1: number, dx: number, dy: number, seed: number, dark = '#3a4a6a', lit = '#f4d67a') {
  let r = seed;
  for (let y = y0; y <= y1; y += dy)
    for (let x = x0; x <= x1; x += dx) {
      r = (r * 1103515245 + 12345) & 0x7fffffff;
      g[y][x] = r % 3 === 0 ? lit : dark;
    }
}
function ground(g: Grid, c = '#6a8a4a') {
  rect(g, 0, 22, N - 1, 23, c);
}

function draw(kind: BuildingKind, seed: number): Grid {
  const g = blank();
  switch (kind) {
    case 'luxury':
    case 'tower': {
      ground(g, '#8a8a8a');
      const fill = kind === 'luxury' ? '#e6d9b8' : ['#d6dde6', '#e2d6c6', '#cfd8cf'][seed % 3];
      body(g, 5, 1, 12, 21, fill);
      body(g, 12, 5, 19, 21, kind === 'luxury' ? '#d8c89a' : '#c3ccd6');
      windows(g, 7, 3, 10, 19, 2, 2, seed);
      windows(g, 14, 7, 17, 19, 2, 2, seed + 7);
      if (kind === 'luxury') {
        rect(g, 5, 0, 12, 0, '#c9a227');
        rect(g, 12, 4, 19, 4, '#c9a227');
      }
      rect(g, 9, 20, 10, 21, '#5a4a3a');
      break;
    }
    case 'apt': {
      ground(g);
      body(g, 2, 7, 21, 21, ['#e8e2d4', '#dfe6e8', '#efe0cf'][seed % 3]);
      rect(g, 2, 6, 21, 6, '#b04a3a');
      windows(g, 4, 9, 19, 19, 3, 2, seed);
      rect(g, 10, 19, 13, 21, '#6a5a4a');
      rect(g, 17, 10, 17, 20, '#9aa6b0');
      break;
    }
    case 'villa': {
      ground(g);
      body(g, 4, 10, 19, 21, ['#e7d3b0', '#d9c4c4', '#cfd9c4'][seed % 3]);
      for (let i = 0; i < 4; i++) rect(g, 3 + i, 9 - i, 20 - i, 9 - i, '#8a4a3a');
      windows(g, 6, 12, 17, 18, 4, 3, seed);
      rect(g, 11, 18, 12, 21, '#5a4030');
      break;
    }
    case 'house': {
      ground(g);
      body(g, 5, 13, 18, 21, '#efe2c4');
      for (let i = 0; i < 5; i++) rect(g, 4 + i, 12 - i, 19 - i, 12 - i, '#6a8a9a');
      rect(g, 7, 15, 9, 17, '#f4d67a');
      rect(g, 14, 16, 15, 21, '#6a4a30');
      break;
    }
    case 'banjiha': {
      // 반지하: 땅 높이가 높고 창이 반쯤 묻혀 있다
      rect(g, 0, 16, N - 1, 23, '#7a6a5a');
      body(g, 4, 6, 19, 17, '#d9ccb8');
      for (let i = 0; i < 3; i++) rect(g, 3 + i, 5 - i, 20 - i, 5 - i, '#6a5a4a');
      windows(g, 6, 8, 17, 12, 4, 4, seed);
      body(g, 6, 15, 11, 19, '#8a9aa6'); // 반쯤 묻힌 창
      rect(g, 7, 16, 10, 16, '#3a4a6a');
      rect(g, 14, 17, 17, 21, '#5a4a3a'); // 내려가는 계단
      rect(g, 14, 18, 17, 18, '#8a7a6a');
      rect(g, 14, 20, 17, 20, '#8a7a6a');
      break;
    }
    case 'officetel': {
      ground(g, '#8a8a8a');
      body(g, 7, 3, 16, 21, '#8fb3cf');
      windows(g, 9, 5, 14, 19, 1, 2, seed, '#5a7a9a', '#dfeaf5');
      rect(g, 11, 20, 12, 21, '#3a3a4a');
      break;
    }
    case 'building': {
      ground(g, '#8a8a8a');
      body(g, 3, 5, 20, 21, ['#d8d4cc', '#c8cfd6', '#d6c8b8'][seed % 3]);
      rect(g, 4, 7, 19, 8, ['#c83a3a', '#3a6ac8', '#3aa06a'][seed % 3]); // 간판
      windows(g, 5, 10, 18, 17, 2, 2, seed, '#6a8aaa', '#bfe0f5');
      rect(g, 4, 19, 19, 20, '#bfe0f5');
      rect(g, 10, 19, 13, 21, '#3a3a4a');
      break;
    }
    case 'shop': {
      ground(g, '#8a8a8a');
      body(g, 3, 11, 20, 21, '#e8e0d0');
      for (let x = 3; x <= 20; x++) rect(g, x, 11, x, 13, x % 2 ? '#c83a3a' : '#f5f0e8'); // 차양
      rect(g, 5, 15, 12, 19, '#bfe0f5');
      rect(g, 15, 15, 18, 21, '#6a4a30');
      break;
    }
    case 'land': {
      rect(g, 0, 12, N - 1, 23, '#8aa05a');
      for (let y = 14; y <= 22; y += 2) for (let x = 1; x < N - 1; x += 2) g[y][x] = '#5a7a3a';
      for (let x = 0; x < N; x += 3) rect(g, x, 11, x, 13, '#8a6a3a'); // 울타리
      rect(g, 0, 11, N - 1, 11, '#8a6a3a');
      rect(g, 18, 4, 20, 10, '#3a7a3a'); // 나무
      rect(g, 19, 8, 19, 11, '#6a4a30');
      break;
    }
    case 'car':
    case 'sedan':
    case 'suv':
    case 'sports': {
      rect(g, 0, 19, N - 1, 23, '#5a5a62'); // 도로
      for (let x = 1; x < N; x += 5) rect(g, x, 21, x + 2, 21, '#e8e0a0');
      const col = kind === 'sports' ? ['#d83a2a', '#f0c020', '#2a2a30'][seed] : ['#3a6ac8', '#e8e8ec', '#2a2a30'][seed];
      const top = kind === 'suv' ? 9 : kind === 'sports' ? 13 : 11;
      const x0 = kind === 'car' ? 5 : 2;
      const x1 = kind === 'car' ? 18 : 21;
      body(g, x0, 14, x1, 19, col); // 차체
      body(g, x0 + (kind === 'sports' ? 6 : 3), top, x1 - (kind === 'sports' ? 5 : 3), 15, col); // 지붕
      rect(g, x0 + (kind === 'sports' ? 7 : 4), top + 1, x1 - (kind === 'sports' ? 6 : 4), 14, '#9ad0f0'); // 유리
      rect(g, Math.round((x0 + x1) / 2), top + 1, Math.round((x0 + x1) / 2), 14, col);
      rect(g, x1 - 1, 15, x1 - 1, 16, '#f4d67a'); // 전조등
      for (const wx of [x0 + 2, x1 - 5]) {
        rect(g, wx, 18, wx + 3, 20, OUT);
        rect(g, wx + 1, 19, wx + 2, 19, '#aaaaaa');
      }
      break;
    }
    case 'yacht': {
      rect(g, 0, 18, N - 1, 23, '#3a7ab8'); // 바다
      for (let x = 0; x < N; x += 4) rect(g, x, 20 + (x % 8 ? 0 : 2), x + 1, 20 + (x % 8 ? 0 : 2), '#8ac0e8');
      for (let i = 0; i < 4; i++) rect(g, 3 + i, 15 + i, 20 - i, 15 + i, i === 0 ? OUT : '#f5f5f5'); // 선체
      rect(g, 4, 16, 19, 16, '#1d4a8a');
      rect(g, 11, 2, 11, 14, '#6a4a30'); // 돛대
      for (let y = 3; y <= 13; y++) rect(g, 12, y, 12 + Math.floor((y - 2) * 0.6), y, '#fafaf0'); // 돛
      for (let y = 6; y <= 13; y++) rect(g, 10 - Math.floor((y - 5) * 0.5), y, 10, y, '#e8e0d0');
      break;
    }
  }
  return g;
}

export function buildingURL(kind: BuildingKind, seed = 0): string {
  const key = kind + ':' + (seed % 3);
  const hit = cache.get(key);
  if (hit) return hit;
  const grid = draw(kind, seed % 3);
  const c = document.createElement('canvas');
  c.width = N;
  c.height = N;
  const ctx = c.getContext('2d')!;
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
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

/** 집 등급 → 건물 모양 */
export const TIER_SPRITE: Record<string, BuildingKind> = { room: 'banjiha', oneroom: 'officetel', villa: 'villa', local: 'apt', metro: 'apt', seoul: 'tower', gangnam: 'luxury' };
