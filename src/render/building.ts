// 32×32 절차 생성 도트 풍경: 사는 집·가진 부동산·탈것을 하늘·땅·빛과 함께 그린다.
// 같은 물건이라도 seed에 따라 노을·한낮·밤 분위기가 달라진다.
export type BuildingKind = 'tower' | 'luxury' | 'apt' | 'villa' | 'banjiha' | 'officetel' | 'building' | 'shop' | 'land' | 'house' | 'car' | 'sedan' | 'suv' | 'sports' | 'yacht';

const N = 32;
const OUT = '#2b2230';
const cache = new Map<string, string>();

type Grid = (string | null)[][];
const blank = (): Grid => Array.from({ length: N }, () => Array<string | null>(N).fill(null));

// ── 색 ──
function hex(c: string): [number, number, number] {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mix(a: string, b: string, t: number): string {
  const x = hex(a);
  const y = hex(b);
  return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
const light = (c: string, t = 0.25) => mix(c, '#fff8e8', t);
const dark = (c: string, t = 0.25) => mix(c, '#2b2230', t);

function px(g: Grid, x: number, y: number, c: string) {
  if (x >= 0 && y >= 0 && x < N && y < N) g[y][x] = c;
}
function rect(g: Grid, x0: number, y0: number, x1: number, y1: number, c: string) {
  for (let y = Math.max(0, y0); y <= Math.min(N - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(N - 1, x1); x++) g[y][x] = c;
}
/** 명암 있는 벽: 테두리 + 왼쪽 볕 + 오른쪽 그늘 */
function wall(g: Grid, x0: number, y0: number, x1: number, y1: number, base: string) {
  rect(g, x0, y0, x1, y1, OUT);
  rect(g, x0 + 1, y0 + 1, x1 - 1, y1, base);
  rect(g, x0 + 1, y0 + 1, x0 + 1, y1, light(base, 0.3));
  rect(g, x1 - 2, y0 + 1, x1 - 1, y1, dark(base, 0.18));
}

// ── 분위기 (하늘) ──
interface Mood {
  sky: string[];
  lit: number;
  glow: string;
  ground: string;
  sun?: [number, number, string];
  stars?: boolean;
}
const MOODS: Mood[] = [
  // 노을
  { sky: ['#6b5b95', '#b06a8a', '#e88a7a', '#f6b68b', '#fbd9a4'], lit: 0.45, glow: '#ffd27a', ground: '#6f8f58', sun: [24, 19, '#fff0b8'] },
  // 맑은 오후
  { sky: ['#8ec5e8', '#a6d3ee', '#bfe0f2', '#d6ebf4', '#e8f3f2'], lit: 0.12, glow: '#ffe9a8', ground: '#7aa55e', sun: [25, 5, '#fff6d0'] },
  // 밤
  { sky: ['#1c1b3a', '#262650', '#33326a', '#43407a', '#5a4f86'], lit: 0.7, glow: '#ffcf6a', ground: '#3f5a45', sun: [24, 5, '#f4efd2'], stars: true },
];

function sky(g: Grid, m: Mood, seed: number) {
  const bands = m.sky.length;
  for (let y = 0; y < N; y++) {
    const f = (y / 26) * (bands - 1);
    const i = Math.min(bands - 2, Math.floor(f));
    const t = f - i;
    for (let x = 0; x < N; x++) {
      // 두 색 사이는 격자 디더링으로 부드럽게
      const d = ((x + y) % 2 === 0 ? 0.25 : -0.25) * (t > 0.2 && t < 0.8 ? 1 : 0);
      g[y][x] = t + d > 0.5 ? m.sky[i + 1] : m.sky[i];
    }
  }
  if (m.stars) {
    let r = seed * 7 + 3;
    for (let k = 0; k < 9; k++) {
      r = (r * 1103515245 + 12345) & 0x7fffffff;
      px(g, r % N, (r >> 8) % 16, k % 3 ? '#cfd3ff' : '#fff6d0');
    }
  }
  if (m.sun) {
    const [cx, cy, c] = m.sun;
    for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) if (x * x + y * y <= 9) px(g, cx + x, cy + y, x * x + y * y > 5 ? mix(c, g[Math.max(0, cy + y)]?.[cx + x] ?? c, 0.4) : c);
    if (m.stars) for (let y = -3; y <= 3; y++) for (let x = -1; x <= 3; x++) if (x * x + y * y <= 9 && (x + 1) * (x + 1) + y * y <= 6) px(g, cx + x + 1, cy + y, m.sky[1]); // 초승달
  } else return;
  // 구름 한 조각 (낮·노을)
  if (!m.stars) {
    const cx = 4 + (seed * 5) % 10;
    const cc = light(m.sky[2], 0.55);
    rect(g, cx, 7, cx + 6, 8, cc);
    rect(g, cx + 2, 6, cx + 4, 6, cc);
    rect(g, cx + 1, 9, cx + 7, 9, mix(cc, m.sky[2], 0.5));
  }
}

function ground(g: Grid, m: Mood, y0 = 27, c = m.ground) {
  rect(g, 0, y0, N - 1, N - 1, c);
  rect(g, 0, y0, N - 1, y0, light(c, 0.2));
  for (let x = 1; x < N; x += 3) px(g, x, y0 + 2 + (x % 2), dark(c, 0.2));
}
function road(g: Grid, m: Mood, y0 = 27) {
  rect(g, 0, y0, N - 1, N - 1, m.stars ? '#3c3a48' : '#6c6a74');
  rect(g, 0, y0, N - 1, y0, m.stars ? '#55525f' : '#9a98a0');
  for (let x = 2; x < N; x += 6) rect(g, x, y0 + 3, x + 2, y0 + 3, '#e8d690');
}
function tree(g: Grid, x: number, y: number, m: Mood, big = false) {
  const leaf = m.stars ? '#2f5a45' : '#4f8a4a';
  rect(g, x, y + (big ? 4 : 3), x, y + (big ? 7 : 5), '#6a4a30');
  const r = big ? 3 : 2;
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (dx * dx + dy * dy <= r * r + 1) px(g, x + dx, y + dy + 1, dx < 0 && dy < 0 ? light(leaf, 0.25) : dx > 0 && dy > 0 ? dark(leaf, 0.2) : leaf);
}
/** 창문: 불 켜진 창은 따뜻하게, 꺼진 창엔 하늘이 비친다 */
function windows(g: Grid, x0: number, y0: number, x1: number, y1: number, dx: number, dy: number, m: Mood, seed: number, w = 1, h = 1) {
  let r = seed * 31 + 17;
  for (let y = y0; y + h - 1 <= y1; y += dy)
    for (let x = x0; x + w - 1 <= x1; x += dx) {
      r = (r * 1103515245 + 12345) & 0x7fffffff;
      const on = (r % 100) / 100 < m.lit;
      rect(g, x, y, x + w - 1, y + h - 1, on ? m.glow : dark(m.sky[1], 0.35));
      if (on && w > 1) px(g, x, y, light(m.glow, 0.5));
      if (!on && w > 1) px(g, x + w - 1, y, light(m.sky[2], 0.3));
    }
}

function draw(kind: BuildingKind, seed: number): Grid {
  const g = blank();
  const m = MOODS[seed % 3];
  sky(g, m, seed);
  switch (kind) {
    case 'luxury':
    case 'tower': {
      ground(g, m);
      const lux = kind === 'luxury';
      const a = lux ? '#cfd8e6' : ['#e9e2d6', '#dfe5ea', '#eadcc8'][seed % 3];
      // 뒤 동 (조금 흐리게)
      wall(g, 18, 8, 27, 27, mix(a, m.sky[2], 0.35));
      windows(g, 20, 10, 25, 25, 2, 2, m, seed + 3);
      // 앞 동
      wall(g, 5, lux ? 2 : 5, 16, 27, a);
      if (lux) {
        // 유리 커튼월: 세로 줄무늬에 하늘이 비친다
        for (let x = 7; x <= 14; x += 2) rect(g, x, 4, x, 25, mix(m.sky[3], '#8fb0d0', 0.5));
        windows(g, 8, 5, 14, 25, 2, 3, m, seed, 1, 1);
        rect(g, 5, 1, 16, 1, '#d8b04a');
        rect(g, 10, 0, 11, 0, '#d8b04a');
      } else {
        windows(g, 7, 7, 14, 25, 2, 2, m, seed);
        rect(g, 6, 5, 15, 5, dark(a, 0.3)); // 옥상 난간
        rect(g, 13, 2, 13, 4, OUT); // 안테나
      }
      rect(g, 9, 25, 12, 27, dark(a, 0.5));
      rect(g, 10, 25, 11, 25, m.glow); // 1층 로비 불빛
      tree(g, 2, 23, m);
      tree(g, 29, 23, m);
      break;
    }
    case 'apt': {
      ground(g, m);
      const a = ['#efe6d6', '#e3ebe8', '#f0e0cf'][seed % 3];
      wall(g, 2, 9, 29, 27, a);
      rect(g, 2, 8, 29, 8, OUT);
      rect(g, 3, 9, 28, 9, ['#b0584a', '#4a7aa0', '#5a8a5a'][seed % 3]); // 지붕 띠
      for (let y = 11; y <= 24; y += 3) rect(g, 3, y + 2, 27, y + 2, dark(a, 0.12)); // 발코니 선
      windows(g, 4, 11, 27, 24, 3, 3, m, seed, 2, 2);
      rect(g, 14, 23, 17, 27, dark(a, 0.45));
      rect(g, 15, 24, 16, 24, m.glow);
      tree(g, 3, 24, m);
      tree(g, 27, 24, m);
      tree(g, 22, 25, m);
      break;
    }
    case 'villa': {
      ground(g, m);
      const a = ['#c98a6a', '#d8b69a', '#b9a08a'][seed % 3]; // 붉은 벽돌 빌라
      wall(g, 6, 10, 25, 27, a);
      for (let y = 12; y < 27; y += 2) for (let x = 7 + (y % 4 ? 0 : 1); x < 24; x += 3) px(g, x, y, dark(a, 0.12)); // 벽돌 결
      rect(g, 6, 9, 25, 9, OUT);
      rect(g, 19, 6, 23, 8, '#5a8ab0'); // 옥상 물탱크
      rect(g, 19, 6, 23, 6, light('#5a8ab0', 0.3));
      windows(g, 8, 12, 23, 23, 5, 4, m, seed, 3, 2);
      for (let y = 14; y <= 22; y += 4) rect(g, 7, y, 24, y, '#3a3a44'); // 난간
      rect(g, 14, 23, 17, 27, '#6a4a34');
      px(g, 16, 25, '#e8c060');
      tree(g, 3, 24, m);
      rect(g, 26, 25, 28, 27, '#8a5a3a'); // 화분
      px(g, 27, 24, '#e87a8a');
      break;
    }
    case 'house': {
      ground(g, m);
      const a = '#f2e6c8';
      wall(g, 7, 17, 24, 27, a);
      const roof = ['#b85a44', '#4a6a8a', '#6a8a4a'][seed % 3];
      for (let i = 0; i < 7; i++) rect(g, 5 + i, 16 - i, 26 - i, 16 - i, i === 6 ? OUT : i % 2 ? roof : light(roof, 0.12));
      rect(g, 21, 8, 22, 12, '#7a5a4a'); // 굴뚝
      if (!m.stars) rect(g, 22, 5, 23, 6, light(m.sky[2], 0.5)); // 연기
      rect(g, 10, 20, 13, 23, m.glow);
      rect(g, 11, 20, 11, 23, OUT);
      rect(g, 10, 21, 13, 21, OUT);
      rect(g, 17, 20, 20, 27, '#7a5234');
      px(g, 19, 24, '#e8c060');
      for (let x = 1; x < N; x += 2) rect(g, x, 25, x, 27, x < 7 || x > 24 ? '#f4efe6' : g[25][x]!); // 울타리
      for (const x of [2, 5, 27, 30]) px(g, x, 27, ['#e87a8a', '#f4d06a'][x % 2]);
      break;
    }
    case 'banjiha': {
      // 반지하: 골목 바닥이 창 절반을 덮는다
      const a = '#d8c6ae';
      wall(g, 4, 6, 27, 27, a);
      rect(g, 4, 5, 27, 5, OUT);
      windows(g, 7, 8, 24, 16, 6, 5, m, seed, 3, 2);
      rect(g, 0, 22, N - 1, N - 1, m.stars ? '#4a4450' : '#8a8078'); // 골목
      rect(g, 0, 22, N - 1, 22, m.stars ? '#6a6470' : '#aaa098');
      // 반쯤 묻힌 창 (방범창)
      rect(g, 7, 19, 15, 24, OUT);
      rect(g, 8, 20, 14, 23, m.glow);
      for (let x = 9; x <= 14; x += 2) rect(g, x, 20, x, 23, '#3a3a44');
      rect(g, 8, 22, 14, 23, m.stars ? '#4a4450' : '#8a8078'); // 땅에 가린 아래쪽
      // 내려가는 계단
      for (let i = 0; i < 4; i++) rect(g, 19 + i, 22 + i, 24, 22 + i, i % 2 ? '#6a6068' : '#7a7078');
      rect(g, 25, 20, 26, 22, '#6a8a4a'); // 화분 하나
      px(g, 25, 19, '#e87a8a');
      break;
    }
    case 'officetel': {
      road(g, m);
      const a = '#9cb8d0';
      wall(g, 9, 3, 22, 27, a);
      for (let x = 11; x <= 20; x += 3) rect(g, x, 5, x + 1, 22, mix(m.sky[3], '#7a9ab8', 0.5));
      windows(g, 11, 5, 21, 22, 3, 2, m, seed, 2, 1);
      rect(g, 10, 23, 21, 26, '#f4f2ea'); // 1층 편의점
      rect(g, 10, 23, 21, 23, '#3aa06a');
      rect(g, 12, 24, 19, 26, m.glow);
      tree(g, 4, 22, m);
      tree(g, 27, 22, m);
      break;
    }
    case 'building': {
      road(g, m);
      const a = ['#dcd6cc', '#ccd4dc', '#dccab8'][seed % 3];
      wall(g, 4, 6, 27, 27, a);
      const signs = ['#d84a3a', '#3a6ad8', '#e8a83a', '#3aa06a', '#9a5ad8'];
      for (let f = 0; f < 4; f++) {
        const y = 8 + f * 4;
        rect(g, 6, y, 25, y + 2, mix(m.sky[2], '#8aaac8', 0.5)); // 유리
        rect(g, 6 + ((f * 5 + seed) % 8), y, 13 + ((f * 5 + seed) % 8), y, signs[(f + seed) % 5]); // 층마다 간판
        if ((f + seed) % 2 || m.lit > 0.4) rect(g, 7 + f * 3, y + 1, 9 + f * 3, y + 2, m.glow);
      }
      rect(g, 5, 24, 26, 27, '#f4ead8'); // 1층 상가
      rect(g, 7, 25, 13, 27, m.glow);
      rect(g, 17, 25, 20, 27, OUT);
      break;
    }
    case 'shop': {
      road(g, m);
      const a = '#efe4d0';
      wall(g, 4, 14, 27, 27, a);
      rect(g, 4, 13, 27, 13, OUT);
      rect(g, 7, 10, 24, 12, ['#3a6a4a', '#8a3a3a', '#3a4a8a'][seed % 3]); // 간판
      rect(g, 9, 11, 22, 11, '#f4e6b8');
      for (let x = 4; x <= 27; x++) rect(g, x, 15, x, 16, x % 4 < 2 ? '#d84a3a' : '#fbf4e8'); // 줄무늬 차양
      rect(g, 4, 17, 27, 17, dark('#d84a3a', 0.3));
      rect(g, 6, 19, 16, 25, m.glow); // 쇼윈도
      rect(g, 11, 19, 11, 25, OUT);
      rect(g, 19, 19, 24, 27, '#7a5234');
      rect(g, 26, 24, 27, 26, '#6a8a4a');
      break;
    }
    case 'land': {
      const field = m.stars ? '#4a6a45' : '#8aac5a';
      rect(g, 0, 18, N - 1, N - 1, field);
      for (let y = 20; y < N; y += 2) for (let x = (y % 4) / 2; x < N; x += 2) px(g, x, y, dark(field, 0.18)); // 밭고랑
      rect(g, 0, 18, N - 1, 18, light(field, 0.2));
      for (let x = 0; x < N; x += 4) rect(g, x, 16, x, 19, '#8a6a44'); // 울타리
      rect(g, 0, 17, N - 1, 17, '#9a7a54');
      tree(g, 25, 10, m, true);
      rect(g, 6, 14, 8, 17, '#b85a44'); // 작은 창고
      rect(g, 5, 13, 9, 13, OUT);
      break;
    }
    case 'car':
    case 'sedan':
    case 'suv':
    case 'sports': {
      road(g, m, 25);
      tree(g, 4, 17, m);
      tree(g, 27, 17, m);
      const col = kind === 'sports' ? ['#d8402e', '#f0c020', '#2e2e36'][seed % 3] : ['#3a6ac8', '#eeeef2', '#3a3a44'][seed % 3];
      const x0 = kind === 'car' ? 8 : 4;
      const x1 = kind === 'car' ? 23 : 27;
      const top = kind === 'suv' ? 14 : kind === 'sports' ? 18 : 16;
      const bodyTop = kind === 'sports' ? 21 : 20;
      // 그림자
      rect(g, x0 + 1, 28, x1 + 1, 28, dark(m.stars ? '#3c3a48' : '#6c6a74', 0.35));
      // 차체
      rect(g, x0, bodyTop, x1, 26, OUT);
      rect(g, x0 + 1, bodyTop + 1, x1 - 1, 25, col);
      rect(g, x0 + 1, bodyTop + 1, x1 - 1, bodyTop + 1, light(col, 0.35)); // 윗면 광택
      rect(g, x0 + 1, 25, x1 - 1, 25, dark(col, 0.3));
      // 지붕·유리
      const r0 = x0 + (kind === 'sports' ? 7 : 4);
      const r1 = x1 - (kind === 'sports' ? 5 : 4);
      rect(g, r0, top, r1, bodyTop, OUT);
      rect(g, r0 + 1, top + 1, r1 - 1, bodyTop, mix(m.sky[1], '#bfe4f4', 0.5));
      px(g, r0 + 2, top + 1, '#ffffff'); // 유리 반사
      px(g, r0 + 3, top + 2, '#ffffff');
      rect(g, Math.round((r0 + r1) / 2), top + 1, Math.round((r0 + r1) / 2), bodyTop, col); // B필러
      // 불빛
      rect(g, x1 - 1, bodyTop + 2, x1 - 1, bodyTop + 3, '#fff2a8');
      if (m.lit > 0.4) rect(g, x1, bodyTop + 2, x1 + 3, bodyTop + 3, mix('#fff2a8', m.sky[4], 0.5));
      px(g, x0 + 1, bodyTop + 2, '#e84a3a');
      // 바퀴
      for (const wx of [x0 + 3, x1 - 6]) {
        rect(g, wx, 24, wx + 3, 27, OUT);
        rect(g, wx + 1, 25, wx + 2, 26, '#b8b8c0');
      }
      break;
    }
    case 'yacht': {
      // 바다: 하늘빛이 물결에 비친다
      for (let y = 20; y < N; y++) for (let x = 0; x < N; x++) g[y][x] = mix(m.sky[3], '#2a5a8a', 0.45 + (y - 20) * 0.04);
      for (let y = 22; y < N; y += 3) for (let x = (y * 3) % 5; x < N; x += 6) rect(g, x, y, x + 2, y, light(g[y][x] ?? '#3a7ab8', 0.3));
      if (m.sun) for (let y = 21; y < N; y += 2) rect(g, m.sun[0] - 1, y, m.sun[0] + 1, y, mix(m.sun[2], '#3a7ab8', 0.4)); // 물에 비친 해
      // 선체
      for (let i = 0; i < 4; i++) rect(g, 5 + i, 19 + i, 26 - i, 19 + i, i === 0 ? '#ffffff' : i === 3 ? OUT : '#eef0f2');
      rect(g, 6, 20, 25, 20, '#1d4a8a');
      rect(g, 12, 17, 19, 18, '#eef0f2'); // 선실
      rect(g, 13, 17, 18, 17, m.glow);
      // 돛대와 돛
      rect(g, 15, 3, 15, 18, '#7a5a3a');
      for (let y = 4; y <= 16; y++) rect(g, 16, y, 16 + Math.floor((y - 3) * 0.7), y, y % 3 ? '#fbf8ee' : '#efe8d8');
      for (let y = 7; y <= 16; y++) rect(g, 14 - Math.floor((y - 6) * 0.55), y, 14, y, '#f0e8da');
      px(g, 15, 2, '#d84a3a'); // 깃발
      px(g, 16, 2, '#d84a3a');
      break;
    }
  }
  return g;
}

export function buildingURL(kind: BuildingKind, seed = 0): string {
  const key = kind + ':' + (seed % 9);
  const hit = cache.get(key);
  if (hit) return hit;
  const grid = draw(kind, seed % 9);
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
