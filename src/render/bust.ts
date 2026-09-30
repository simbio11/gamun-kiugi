// 인물 상세용 32×32 흉상. 부품을 섞어서 사람마다 다르게:
//   물려받는 것(유전자): 얼굴형·눈·눈썹·입·코·머리색·피부
//   제가 고르는 것(사람마다·시대마다): 머리 모양(남 10·여 10)·옷 종류(티셔츠·셔츠·후드·정장·스웨터·한복·교복·가디건·작업복·미래복)·옷 색·무늬
//   직업이 정하는 것: 의사 가운·군복·경찰복·요리복·작업복·운동복
//   나이: 아기·아이·청소년·어른·노인 (흰머리·주름·대머리)
import { JOBS } from '../core/data';
import type { Person } from '../core/types';

type Px = string | null;
const N = 32;
const OUT = '#231a22';
const SKIN = [['#f6d7b8', '#e0b08e'], ['#eec39a', '#d49f78'], ['#d9a577', '#b98556'], ['#a8744f', '#865a3a'], ['#fbe3cf', '#ecc6a8']];
const HAIR = [['#2b2220', '#44362f'], ['#4a3426', '#6a4a36'], ['#1c1c28', '#34344a'], ['#7a4b2a', '#9a6a40'], ['#c9a15a', '#e0c07a'], ['#8c2f2f', '#b04a4a'], ['#d8d0c0', '#f0ece0'], ['#5b6f8f', '#7a90b0'], ['#c76a8a', '#e08aa8']];
const GRAY: [string, string] = ['#b8b4ae', '#dcd8d2'];
const CLOTH = ['#e2b93b', '#3f6fb5', '#d05a4a', '#4a9a5a', '#8a5ac0', '#e07aa0', '#3a8a9a', '#f0f0f0', '#2a2a34', '#c07a3a', '#6a8ac8', '#a0c850', '#e8d8b0', '#7a3a4a', '#f08a3a', '#4a4a6a', '#9ad0e8', '#d8a0c8'];

const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};
const shade = (hex: string, k: number) => {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  return '#' + [f(n >> 16), f((n >> 8) & 255), f(n & 255)].map((v) => v.toString(16).padStart(2, '0')).join('');
};

type Stage = 'baby' | 'child' | 'teen' | 'adult' | 'elder';
const stageOf = (a: number): Stage => (a < 3 ? 'baby' : a < 13 ? 'child' : a < 20 ? 'teen' : a < 60 ? 'adult' : 'elder');

const cache = new Map<string, string>();

export function bustURL(p: Person, age: number, year: number): string {
  const st = stageOf(age);
  const h = hash(p.id);
  const eraBand = year < 1983 ? 0 : year < 2040 ? 1 : 2;
  const key = `${p.id}:${st}:${p.job}:${eraBand}:${p.deathYear !== undefined}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const g = draw(p, st, h, eraBand, age);
  const c = document.createElement('canvas');
  c.width = N;
  c.height = N;
  const ctx = c.getContext('2d')!;
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++)
      if (g[y][x]) {
        ctx.fillStyle = g[y][x]!;
        ctx.fillRect(x, y, 1, 1);
      }
  const url = c.toDataURL();
  cache.set(key, url);
  return url;
}

const lum = (c: string) => {
  const n = parseInt(c.slice(1, 7), 16);
  return 0.3 * (n >>> 16) + 0.59 * ((n >>> 8) & 255) + 0.11 * (n & 255);
};

/** 2×2 칸을 한 칸으로: 눈·눈썹·외곽선 같은 어두운 선은 살리고, 나머지는 많은 색 */
function shrink(g: Px[][]): Px[][] {
  const M = N / 2;
  const out: Px[][] = Array.from({ length: M }, () => Array(M).fill(null));
  for (let y = 0; y < M; y++)
    for (let x = 0; x < M; x++) {
      const b = [g[y * 2][x * 2], g[y * 2][x * 2 + 1], g[y * 2 + 1][x * 2], g[y * 2 + 1][x * 2 + 1]].filter((c): c is string => !!c);
      if (b.length < 2) continue;
      const cnt = new Map<string, number>();
      for (const c of b) cnt.set(c, (cnt.get(c) ?? 0) + 1);
      let best = b[0];
      for (const [c, n] of cnt) if (n > cnt.get(best)!) best = c;
      const dark = b.reduce((a, c) => (lum(c) < lum(a) ? c : a));
      out[y][x] = lum(dark) < lum(best) * 0.55 ? dark : best;
    }
  return out;
}

const small = new Map<string, string>();

/** 가계도용 16×16 — 상세 초상화를 그대로 줄인 것 */
export function bustSmallURL(p: Person, age: number, year: number): string {
  const st = stageOf(age);
  const eraBand = year < 1983 ? 0 : year < 2040 ? 1 : 2;
  const key = `${p.id}:${st}:${p.job}:${eraBand}`;
  const hit = small.get(key);
  if (hit) return hit;
  bare = true;
  const g = shrink(draw(p, st, hash(p.id), eraBand, age));
  bare = false;
  // 16칸 이목구비 — 상세판과 같은 자리·같은 성격
  const F = lastFace;
  const put = (x: number, y: number, c: string) => y >= 0 && y < 16 && x >= 0 && x < 16 && (g[y][x] = c);
  const ey = F.eyeY >> 1;
  const lx = (F.cx >> 1) - 2;
  const rx = (F.cx >> 1) + 1;
  const EYE = '#2a1a14';
  if (F.mark === 5 && F.st === 'adult') for (let x = lx - 1; x <= rx + 1; x++) put(x, ey, '#15151c');
  else {
    put(lx, ey, EYE), put(rx, ey, EYE);
    if (F.f && F.st !== 'baby') put(lx - 1, ey - 1, EYE), put(rx + 1, ey - 1, EYE); // 속눈썹
    else if (F.st !== 'baby' && g[ey - 1]?.[lx] === F.sk) put(lx, ey - 1, F.bc), put(lx - 1, ey - 1, F.bc), put(rx, ey - 1, F.bc), put(rx + 1, ey - 1, F.bc); // 눈썹
    if (F.mark === 1 && F.st !== 'baby') put(lx - 1, ey, '#5a5a6e'), put(rx + 1, ey, '#5a5a6e'), put(lx + 1, ey, '#5a5a6e'), put(rx - 1, ey, '#5a5a6e');
  }
  if (F.f || F.st === 'baby' || F.st === 'child') put(lx - 1, ey + 1, '#f4a0a8'), put(rx + 1, ey + 1, '#f4a0a8');
  const my = F.mouthY >> 1;
  const lip = F.f && (F.st === 'adult' || F.st === 'teen') ? '#c84a5a' : '#b86a6a';
  put(lx + 1, my, lip), put(rx - 1, my, lip);
  if (!F.f && F.st === 'elder') put(lx + 1, my - 1, '#c9c4bd'), put(rx - 1, my - 1, '#c9c4bd');
  if (F.st === 'elder') put(lx - 1, ey + 1, F.skD), put(rx + 1, ey + 1, F.skD);
  const c = document.createElement('canvas');
  c.width = c.height = N / 2;
  const ctx = c.getContext('2d')!;
  g.forEach((r, y) =>
    r.forEach((col, x) => {
      if (col) {
        ctx.fillStyle = col;
        ctx.fillRect(x, y, 1, 1);
      }
    }),
  );
  const url = c.toDataURL();
  small.set(key, url);
  return url;
}

let bare = false;
let lastFace = { cx: 16, eyeY: 12, mouthY: 18, f: false, st: 'adult' as Stage, mark: 0, sk: '#f1c9a5', skD: '#d9a577', bc: '#2a2420' };
let lastLooks = { hair: '#2a2420', skin: '#f1c9a5', cloth: '#34506e' };

/** 장면 그림용 색 — 상세 초상화와 같은 머리·피부·옷 색 */
export function bustColors(p: Person, age: number, year: number): { hair: string; skin: string; cloth: string } {
  draw(p, stageOf(age), hash(p.id), year < 1983 ? 0 : year < 2040 ? 1 : 2, age);
  return { ...lastLooks };
}

function draw(p: Person, st: Stage, h: number, era: number, age: number): Px[][] {
  const g: Px[][] = Array.from({ length: N }, () => Array(N).fill(null));
  const set = (x: number, y: number, c: Px) => {
    if (x >= 0 && x < N && y >= 0 && y < N) g[y][x] = c;
  };
  const row = (y: number, x0: number, x1: number, c: string) => {
    for (let x = x0; x <= x1; x++) set(x, y, c);
  };
  const stamp = (x: number, y: number, rows: string[], pal: Record<string, string>, flip = false) =>
    rows.forEach((r, j) => [...r].forEach((ch, i) => ch !== '.' && pal[ch] && set(x + (flip ? r.length - 1 - i : i), y + j, pal[ch])));

  const gn = p.genes;
  const f = p.sex === 'F';
  const [sk, skD] = SKIN[gn.skin % SKIN.length];
  const hairPair = st === 'elder' ? GRAY : st === 'adult' && age >= 52 && h % 3 === 0 ? ['#6a6460', '#8a847e'] : HAIR[gn.hairColor % HAIR.length];
  // 2080년 뒤엔 네온 머리색도 흔하다
  const [hc, hcL] = era === 2 && st !== 'elder' && h % 4 === 0 ? [['#3ac0d0', '#7ae8f0'], ['#b04ad0', '#d08af0'], ['#e05a8a', '#f08ab0']][h % 3] : hairPair;
  const kidish = st === 'baby' || st === 'child';

  // ── 얼굴형: 줄마다 반폭 ──
  const FACES = [
    [5, 6, 7, 7, 7, 7, 7, 7, 7, 7, 6, 6, 5, 4, 3], // 갸름
    [5, 6, 7, 7, 7, 7, 7, 7, 7, 7, 7, 6, 5, 4], // 보통
    [6, 7, 7, 8, 8, 8, 8, 8, 8, 7, 7, 6, 5], // 둥근
    [6, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 6, 5], // 각진
    [5, 6, 6, 7, 7, 7, 7, 7, 7, 7, 7, 6, 6, 5, 4, 3], // 긴
  ];
  const shape = kidish ? [6, 7, 7, 8, 8, 8, 8, 8, 8, 7, 7, 6, 5] : FACES[(gn.face ?? 1) % FACES.length];
  const cx = 16;
  const top = kidish ? 7 : 6;
  const faceBottom = top + shape.length - 1;

  // ── 머리 모양 (개인 선택: 사람마다 · 시대마다) ──
  const MALE = era === 0 ? ['buzz', 'side', 'side', 'slick', 'short', 'buzz', 'bowl', 'short', 'side', 'curly'] : era === 1 ? ['side', 'bowl', 'spiky', 'short', 'curly', 'messy', 'slick', 'twoblock', 'buzz', 'short'] : ['twoblock', 'spiky', 'messy', 'short', 'mohawk', 'side', 'curly', 'bowl', 'short', 'slick'];
  const FEMALE = era === 0 ? ['perm', 'bob', 'braid', 'bun', 'long', 'bob', 'perm', 'ponytail', 'bangs', 'long'] : era === 1 ? ['long', 'bob', 'ponytail', 'bangs', 'twin', 'wavy', 'bun', 'long', 'perm', 'long'] : ['wavy', 'long', 'twin', 'bob', 'ponytail', 'long', 'bun', 'bangs', 'braid', 'wavy'];
  let style = (f ? FEMALE : MALE)[(gn.hairStyle * 7 + (h >>> 4)) % 10];
  if (st === 'elder') style = f ? (h % 2 ? 'perm' : 'bun') : h % 3 === 0 ? 'bald' : h % 3 === 1 ? 'side' : 'short';
  if (st === 'baby') style = 'baby';
  if (st === 'child' && f && style === 'bun') style = 'twin';

  // 1) 뒷머리 (긴 머리는 얼굴 뒤로)
  const back = ['long', 'wavy', 'braid', 'bob', 'perm', 'bangs'].includes(style);
  if (back) {
    const len = style === 'bob' || style === 'perm' ? faceBottom + 2 : 29;
    for (let y = top + 2; y <= len; y++) row(y, cx - 9, cx + 8, hc);
    if (style === 'wavy') for (let y = top + 6; y <= len; y += 3) set(cx - 10, y, hc), set(cx + 9, y + 1, hc);
  }

  // 2) 옷 (어깨) — 직업·시대·나이
  const shoulderW = kidish ? 9 : f ? 11 : 13;
  const clothTop = faceBottom + 3;
  const jobs = JOBS[p.job];
  const kind = pickCloth(p, st, h, era);
  let base = CLOTH[(h >>> 8) % CLOTH.length];
  if (kind === 'coat') base = '#f4f4f4';
  if (kind === 'army') base = '#5a6a3a';
  if (kind === 'police') base = '#2a3a6a';
  if (kind === 'suit') base = ['#2a2a34', '#3a3a4a', '#2a3450', '#4a3a3a'][h % 4];
  if (kind === 'uniform') base = era === 0 ? '#1e1e28' : '#2a3a5a';
  if (kind === 'chef') base = '#f8f8f8';
  if (kind === 'overall') base = '#4a6a9a';
  if (kind === 'future') base = ['#e8ecf4', '#2a2a3a', '#d8e8f0'][h % 3];
  if (kind === 'jersey') base = jobs?.color ?? base;
  const dark = shade(base, 0.78);
  for (let y = clothTop; y < N; y++) {
    const w = Math.min(shoulderW, 4 + (y - clothTop) * 3);
    row(y, cx - w, cx + w - 1, base);
    set(cx + w - 1, y, dark);
    set(cx + w - 2, y, dark);
  }
  // 목
  for (let y = faceBottom; y < clothTop + 1; y++) row(y, cx - 2, cx + 1, y > faceBottom ? skD : sk);
  // 옷 종류별 디테일
  const nk = clothTop;
  const pattern = (h >>> 12) % 5; // 0 민무늬 1 줄무늬 2 도트 3 체크 4 로고
  switch (kind) {
    case 'tee':
      row(nk, cx - 2, cx + 1, sk);
      if (pattern === 1) for (let y = nk + 2; y < N; y += 2) row(y, cx - shoulderW + 1, cx + shoulderW - 3, shade(base, 1.18));
      if (pattern === 2) for (let y = nk + 2; y < N; y += 3) for (let x = cx - 8; x < cx + 8; x += 3) set(x + (y % 2), y, shade(base, 1.25));
      if (pattern === 4) stamp(cx - 2, nk + 3, ['.xx.', 'x..x', '.xx.'], { x: shade(base, 1.35) });
      break;
    case 'shirt':
      stamp(cx - 3, nk, ['ww..ww', '.ww.ww.', '..w.w..'].map((r) => r.slice(0, 6)), { w: '#f4f4f4' });
      for (let y = nk + 2; y < N; y += 2) set(cx, y, shade(base, 0.6));
      if (pattern === 3) for (let y = nk + 1; y < N; y++) for (let x = cx - shoulderW; x < cx + shoulderW; x++) if ((x + y) % 4 === 0 && g[y][x] === base) set(x, y, shade(base, 0.85));
      break;
    case 'hoodie':
      row(nk, cx - 4, cx + 3, shade(base, 0.8));
      row(nk + 1, cx - 3, cx + 2, shade(base, 0.8));
      set(cx - 2, nk + 2, '#f0f0f0'), set(cx - 2, nk + 3, '#f0f0f0'), set(cx + 1, nk + 2, '#f0f0f0'), set(cx + 1, nk + 3, '#f0f0f0');
      row(N - 3, cx - 4, cx + 3, shade(base, 0.85));
      break;
    case 'suit':
    case 'police':
      stamp(cx - 3, nk, ['ww..ww', '.wrrw.', '..rr..', '..rr..', '..rr..'], { w: '#f4f4f4', r: kind === 'police' ? '#1a2440' : ['#b03030', '#3050a0', '#2a6a3a', '#c09030'][h % 4] });
      for (let y = nk; y < N; y++) set(cx - 4 - Math.floor((y - nk) / 2), y, shade(base, 0.6)), set(cx + 3 + Math.floor((y - nk) / 2), y, shade(base, 0.6));
      if (kind === 'police') stamp(cx - 8, nk + 3, ['yy', 'yy'], { y: '#f0c040' });
      break;
    case 'sweater':
      row(nk, cx - 3, cx + 2, shade(base, 0.75));
      for (let y = nk + 3; y < N; y += 3) for (let x = cx - 9; x < cx + 9; x += 2) if (g[y][x] === base) set(x, y, shade(base, 1.2));
      break;
    case 'hanbok': {
      const ribbon = ['#c03040', '#3050a0', '#8a3aa0'][h % 3];
      stamp(cx - 4, nk, ['w......w', '.w....w.', '..w..w..', '...ww...'], { w: '#f8f8f8' });
      stamp(cx, nk + 3, ['rr', 'rrr', 'r.r', 'r..r'], { r: ribbon });
      break;
    }
    case 'uniform':
      stamp(cx - 3, nk, era === 0 ? ['wwwwww', '.w..w.'] : ['ww..ww', '.wrrw.', '..rr..'], { w: '#f4f4f4', r: '#8a2a3a' });
      if (era === 0) for (let y = nk + 2; y < N; y += 3) set(cx, y, '#d0b040');
      break;
    case 'cardigan':
      for (let y = nk; y < N; y++) row(y, cx - 2, cx + 1, CLOTH[(h >>> 3) % CLOTH.length]);
      for (let y = nk + 2; y < N; y += 3) set(cx - 3, y, '#f4f4f4');
      break;
    case 'coat':
      stamp(cx - 3, nk, ['.w..w.', 'ss..ss', '.s..s.'], { w: '#ffffff', s: '#9ac0d8' });
      if (p.job === 'doctor' || p.job === 'dentist' || p.job === 'kmd') stamp(cx - 6, nk + 1, ['.k.', 'k.k', '.k.'], { k: '#444' });
      stamp(cx + 4, nk + 3, ['bb', 'bb'], { b: '#3a6aa8' });
      break;
    case 'army':
      for (let i = 0; i < 26; i++) set(cx - 11 + ((i * 7 + (h % 5)) % 22), nk + 2 + ((i * 3) % 6), i % 2 ? '#3a4a2a' : '#7a8a4a');
      stamp(cx - 3, nk, ['gg..gg'], { g: '#4a5a2a' });
      break;
    case 'chef':
      for (let y = nk + 2; y < N; y += 2) set(cx - 3, y, '#999'), set(cx + 2, y, '#999');
      break;
    case 'overall':
      for (let y = nk; y < N; y++) row(y, cx - 5, cx + 4, CLOTH[(h >>> 5) % CLOTH.length]);
      for (let y = nk + 2; y < N; y++) row(y, cx - 4, cx + 3, '#4a6a9a');
      set(cx - 4, nk + 2, '#f0c040'), set(cx + 3, nk + 2, '#f0c040');
      break;
    case 'jersey': {
      const num = String((h % 98) + 1);
      row(nk, cx - 3, cx + 2, '#ffffff');
      const D: Record<string, string[]> = { '0': ['xx', 'xx', 'xx'], '1': ['.x', 'xx', '.x'], '2': ['xx', '.x', 'x.'], '7': ['xx', '.x', '.x'] };
      stamp(cx - 2, nk + 3, D[num[0]] ?? ['xx', 'x.', 'xx'], { x: '#ffffff' });
      if (num[1]) stamp(cx + 1, nk + 3, D[num[1]] ?? ['xx', '.x', 'xx'], { x: '#ffffff' });
      break;
    }
    case 'future':
      row(nk, cx - 4, cx + 3, '#4fe0ff');
      for (let y = nk + 1; y < N; y++) set(cx - 6, y, '#4fe0ff');
      set(cx + 5, nk + 3, '#ff4a8a');
      break;
  }

  // 3) 얼굴
  shape.forEach((w, i) => row(top + i, cx - w, cx + w - 1, sk));
  shape.forEach((w, i) => i > 1 && set(cx + w - 1, top + i, skD)); // 오른쪽 그늘
  // 귀
  const earY = top + 6;
  const ew = shape[6] ?? 7;
  for (const [x, d] of [[cx - ew - 1, -1], [cx + ew, 1]] as const) {
    set(x, earY, sk), set(x, earY + 1, sk), set(x, earY + 2, skD), set(x + d, earY + 1, sk);
  }

  // 4) 앞머리
  const hairTop = top - (kidish ? 2 : 3);
  const capR = (shape[3] ?? 7) + 1;
  const cap = (toY: number) => {
    for (let y = hairTop; y <= toY; y++) {
      const t = (y - hairTop) / Math.max(1, toY - hairTop + 2);
      const w = Math.round(capR * Math.sqrt(Math.min(1, 0.35 + t * 1.6)));
      row(y, cx - w, cx + w - 1, hc);
    }
    for (let x = cx - 4; x < cx + 2; x++) set(x, hairTop + 1, hcL); // 윤기
  };
  const hl = top + 2; // 이마 선
  switch (style) {
    case 'baby':
      set(cx, top - 1, hc), set(cx - 1, top - 2, hc), set(cx + 1, top - 1, hc);
      break;
    case 'bald':
      for (let x = cx - 7; x <= cx - 6; x++) for (let y = top + 3; y < top + 7; y++) set(x, y, hc);
      for (let x = cx + 5; x <= cx + 6; x++) for (let y = top + 3; y < top + 7; y++) set(x, y, hc);
      set(cx - 2, top, '#ffffff');
      break;
    case 'buzz':
      cap(hl - 1);
      for (let x = cx - 6; x < cx + 6; x += 2) set(x, hl - 1, sk);
      break;
    case 'bowl':
      cap(hl + 1);
      row(hl + 1, cx - capR, cx + capR - 1, hc);
      for (let y = hl; y < hl + 5; y++) set(cx - capR, y, hc), set(cx + capR - 1, y, hc);
      break;
    case 'side':
      cap(hl);
      for (let i = 0; i < 6; i++) set(cx - 6 + i, hl + 1 + (i < 3 ? 1 : 0), hc);
      row(hl + 1, cx - 7, cx - 2, hc);
      set(cx + 1, hairTop + 1, sk); // 가르마
      break;
    case 'slick':
      cap(hl - 1);
      for (let x = cx - 6; x < cx + 6; x += 3) set(x, hairTop + 2, hcL);
      break;
    case 'short':
      cap(hl);
      for (let x = cx - 6; x < cx + 6; x += 2) set(x, hl + 1, hc);
      break;
    case 'spiky':
      cap(hl);
      for (let x = cx - 7; x < cx + 7; x += 3) set(x, hairTop - 1, hc), set(x + 1, hairTop - 2, hc);
      break;
    case 'curly':
    case 'perm':
      cap(hl);
      for (let x = cx - capR - 1; x <= cx + capR; x += 2) set(x, hairTop + (x % 4 === 0 ? -1 : 0), hc);
      for (let y = hl; y < hl + (style === 'perm' ? 8 : 4); y += 2) set(cx - capR - 1, y, hc), set(cx + capR, y, hc);
      for (let x = cx - 5; x < cx + 5; x += 3) set(x, hl + 1, hcL);
      break;
    case 'messy':
      cap(hl + 1);
      for (let x = cx - 6; x < cx + 6; x += 2) set(x, hl + 2, hc);
      set(cx - 3, hairTop - 1, hc), set(cx + 4, hairTop - 1, hc), set(cx + 5, hairTop, hc);
      break;
    case 'twoblock':
      cap(hl + 1);
      for (let y = hl; y < hl + 4; y++) set(cx - capR, y, shade(hc, 0.7)), set(cx + capR - 1, y, shade(hc, 0.7));
      for (let x = cx - 5; x < cx + 3; x++) set(x, hl + 2, hc);
      break;
    case 'mohawk':
      for (let y = hairTop - 3; y < hl; y++) row(y, cx - 2, cx + 1, hc);
      row(hairTop - 3, cx - 1, cx, hcL);
      break;
    case 'long':
    case 'wavy':
      cap(hl);
      for (let y = hl; y < hl + 8; y++) set(cx - capR, y, hc), set(cx + capR - 1, y, hc);
      row(hl + 1, cx - 5, cx - 1, hc);
      break;
    case 'bob':
      cap(hl + 1);
      row(hl + 2, cx - capR + 1, cx + capR - 2, hc);
      for (let y = hl; y < faceBottom - 1; y++) set(cx - capR, y, hc), set(cx + capR - 1, y, hc);
      break;
    case 'bangs':
    case 'pixie':
      cap(hl + 1);
      row(hl + 2, cx - 6, cx + 5, hc);
      for (let x = cx - 6; x < cx + 6; x += 3) set(x, hl + 3, hc);
      if (style === 'bangs') for (let y = hl; y < faceBottom - 2; y++) set(cx - capR, y, hc), set(cx + capR - 1, y, hc);
      break;
    case 'ponytail':
      cap(hl);
      for (let y = top; y < top + 12; y++) row(y, cx + capR, cx + capR + 1 + (y > top + 4 ? 1 : 0), hc);
      set(cx + capR, top, '#ff5a7a');
      break;
    case 'twin':
      cap(hl + 1);
      row(hl + 2, cx - 5, cx + 4, hc);
      for (let y = top + 2; y < top + 13; y++) row(y, cx - capR - 3, cx - capR - 1, hc), row(y, cx + capR, cx + capR + 2, hc);
      set(cx - capR - 1, top + 2, '#ff5a7a'), set(cx + capR, top + 2, '#ff5a7a');
      break;
    case 'bun':
      cap(hl);
      for (let dy = -2; dy <= 1; dy++) row(hairTop - 2 + dy + 1, cx - 3 + Math.abs(dy), cx + 2 - Math.abs(dy), hc);
      break;
    case 'braid':
      cap(hl);
      for (let y = hl; y < 28; y++) set(cx - capR - 2 + (y % 2), y, hc), set(cx - capR - 1 + (y % 2), y, hcL);
      break;
  }

  // 5) 눈썹 (유전) · 눈 (유전) · 코 · 입
  const eyeY = top + 6;
  const mark = gn.mark ?? 0;
  if (bare) {
    // 축소판용: 이목구비는 16칸에 맞춰 따로 찍는다
    lastFace = { cx, eyeY, mouthY: eyeY + (st === 'baby' ? 4 : 6), f, st, mark, sk, skD, bc: shade(hc === '#d8d0c0' || st === 'elder' ? '#8a847e' : hc, 0.9) };
    lastLooks = { hair: hc, skin: sk, cloth: base };
    return outline(g);
  }
  const bc = shade(hc === '#d8d0c0' || st === 'elder' ? '#8a847e' : hc, 0.9);
  const BROWS = [['xxx'], ['xxxx'], ['.xx', 'x..'], ['xxx', '...'], ['x..', '.xx']];
  const brow = BROWS[(gn.brows ?? 0) % BROWS.length];
  if (st !== 'baby') {
    stamp(cx - 6, eyeY - 2 - (brow.length - 1), brow, { x: bc });
    stamp(cx + 2, eyeY - 2 - (brow.length - 1), brow, { x: bc }, true);
  }
  const EYES: string[][] = [
    ['le', 'ee'], // 기본
    ['wee', 'wle', '.ee'], // 큰 눈
    ['eee', '.l.'], // 졸린 눈
    ['eee'], // 가로로 긴 눈
    ['.eee', 'ewle', '.ee.'], // 속눈썹
    ['ee.', '.ee'], // 날카로운 눈
    ['.e.', 'e.e'], // 웃는 눈
    ['.e.', 'ele', '.e.'], // 동그란 눈
  ];
  const eyeIdx = (gn.eyes * 3 + (f && st !== 'child' ? 4 : 0)) % EYES.length;
  const eye = st === 'baby' ? ['ee', 'ee'] : EYES[eyeIdx];
  const EC = { e: '#2a1a14', l: '#ffffff', w: '#ffffff' };
  stamp(cx - 5, eyeY, eye, EC);
  stamp(cx + 5 - eye[0].length, eyeY, eye, EC, true);
  // 코
  const noseY = eyeY + 3;
  const NOSE = [['s'], ['s', 'ss'], ['s.s'], ['s', 's', 's'], ['sss']];
  if (st !== 'baby') stamp(cx - 1 + (NOSE[(h >>> 6) % 5][0].length > 1 ? 0 : 1), noseY, NOSE[(gn.face * 3 + (h >>> 6)) % 5], { s: skD });
  // 입
  const mouthY = noseY + (st === 'baby' ? 1 : 3);
  const lip = f && (st === 'adult' || st === 'teen') ? '#c84a5a' : '#b86a6a';
  const MOUTH = [['mm'], ['m..m', '.mm.'], ['mmmm', '.ww.'], ['.mm.', 'mmmm'], ['.m.', 'm.m'], ['..m', 'mm.']];
  const mouth = MOUTH[(gn.mouth ?? 0) % MOUTH.length];
  stamp(cx - Math.floor(mouth[0].length / 2), mouthY, mouth, { m: lip, w: '#ffffff' });

  // 6) 개인 특징·나이
  if (f || kidish || mark === 4) set(cx - 5, eyeY + 3, '#f4a0a8'), set(cx + 4, eyeY + 3, '#f4a0a8');
  if (mark === 1 && st !== 'baby') {
    const G2 = '#3a3a4a';
    row(eyeY - 1, cx - 6, cx - 2, G2), row(eyeY + 2, cx - 6, cx - 2, G2), set(cx - 6, eyeY, G2), set(cx - 6, eyeY + 1, G2), set(cx - 2, eyeY, G2), set(cx - 2, eyeY + 1, G2);
    row(eyeY - 1, cx + 1, cx + 5, G2), row(eyeY + 2, cx + 1, cx + 5, G2), set(cx + 1, eyeY, G2), set(cx + 1, eyeY + 1, G2), set(cx + 5, eyeY, G2), set(cx + 5, eyeY + 1, G2);
    set(cx - 1, eyeY, G2), set(cx, eyeY, G2);
  }
  if (mark === 2) for (const [x, y] of [[-5, 4], [-4, 5], [-6, 5], [4, 4], [5, 5], [3, 5]]) set(cx + x, eyeY + y, shade(sk, 0.8));
  if (mark === 3) set(cx + 3, mouthY - 1, '#4a3028');
  if (mark === 5 && st === 'adult') row(eyeY, cx - 6, cx + 5, '#15151c'), row(eyeY + 1, cx - 6, cx + 5, '#15151c');
  if (!f && st === 'adult' && (h >>> 9) % 3 === 0) for (let x = cx - 4; x < cx + 4; x += 2) set(x, mouthY + 2, shade(sk, 0.82)); // 수염 자국
  if (!f && st === 'elder' && (h >>> 9) % 2 === 0) row(mouthY - 1, cx - 3, cx + 2, GRAY[0]); // 콧수염
  if (st === 'elder') set(cx - 6, eyeY + 2, skD), set(cx + 5, eyeY + 2, skD), row(top + 3, cx - 3, cx + 2, skD); // 주름
  if (f && st === 'adult' && (h >>> 10) % 2 === 0) set(cx - ew - 1, earY + 3, '#f0c040'), set(cx + ew, earY + 3, '#f0c040'); // 귀걸이

  lastLooks = { hair: hc, skin: sk, cloth: base };
  return outline(g);
}

// 7) 외곽선
function outline(g: Px[][]): Px[][] {
  const out: Px[][] = g.map((r) => [...r]);
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      if (g[y][x]) continue;
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => g[y + dy]?.[x + dx])) out[y][x] = OUT;
    }
  return out;
}

type Cloth = 'tee' | 'shirt' | 'hoodie' | 'suit' | 'sweater' | 'hanbok' | 'uniform' | 'cardigan' | 'coat' | 'army' | 'police' | 'chef' | 'overall' | 'jersey' | 'future';
function pickCloth(p: Person, st: Stage, h: number, era: number): Cloth {
  if (st === 'baby') return 'tee';
  if (st === 'teen' && p.job === 'none') return h % 4 === 0 ? 'hoodie' : 'uniform';
  if (st === 'adult' || (st === 'elder' && p.job !== 'pension')) {
    const j = p.job;
    if (['doctor', 'dentist', 'kmd', 'pharmacist', 'nurse', 'vet', 'researcher', 'longevity_doc', 'bci_surgeon', 'xeno_biologist'].includes(j)) return 'coat';
    if (['officer'].includes(j)) return 'army';
    if (['police', 'coast_guard', 'prison_guard', 'firefighter'].includes(j)) return 'police';
    if (['chef', 'restaurant', 'barista'].includes(j)) return 'chef';
    if (['farmer', 'fisher', 'rancher', 'factory', 'welder', 'mechanic', 'carpenter', 'plumber', 'shipbuilder', 'electrician', 'robot_tech', 'asteroid_miner', 'sea_farmer'].includes(j)) return 'overall';
    if (['athlete', 'coach', 'trainer', 'gamer'].includes(j)) return 'jersey';
    if (['lawyer', 'judge', 'prosecutor', 'politician', 'minister', 'president', 'corp', 'banker', 'analyst', 'diplomat', 'accountant', 'founder', 'ceo'].includes(j)) return 'suit';
  }
  if (era === 2 && h % 3 === 0) return 'future';
  if (st === 'elder' && era === 0) return h % 2 ? 'hanbok' : 'cardigan';
  if (st === 'elder') return (['cardigan', 'sweater', 'shirt', 'hanbok'] as Cloth[])[h % 4];
  const list: Cloth[] = st === 'child' ? ['tee', 'tee', 'sweater', 'hoodie', 'overall'] : ['tee', 'shirt', 'hoodie', 'sweater', 'cardigan', 'shirt', 'tee'];
  return list[(h >>> 3) % list.length];
}
