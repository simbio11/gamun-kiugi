// 인물 초상화 (48×48, 인물 창·사건 그림) + 가계도용 꼬마 (16×16).
// 스타듀밸리·애니 도트 느낌: 색 외곽선(검정 대신 그 재질의 짙은 색), 3단 음영, 반짝이는 큰 눈, 볼터치.
//   물려받는 것(유전자): 얼굴형·눈 색·눈매·입·머리색·피부
//   사람마다·시대마다 고르는 것: 머리 모양(여 9·남 10)·앞머리·옷 종류·색·무늬·리본·액세서리
//   직업: 의사 가운·군복·경찰복·요리복(모자)·작업복·운동복·정장
//   나이: 아기·아이·청소년·어른·노인 (흰머리·주름·수염)
//   표정: 보통·기쁨·놀람·슬픔·화남·반함·돈·잠·울음·으쓱 + 눈 깜빡임 프레임
import { JOBS } from '../core/data';
import type { Person } from '../core/types';

export type Face = 'normal' | 'happy' | 'shock' | 'sad' | 'angry' | 'money' | 'love' | 'sleep' | 'cry' | 'smug';
type Px = string | null;
type Stage = 'baby' | 'child' | 'teen' | 'adult' | 'elder';
const N = 48;

const hash = (s: string = '') => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};
const mix = (c: string, k: number) => {
  const n = parseInt(c.slice(1, 7), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(k >= 1 ? v + (255 - v) * (k - 1) : v * k)));
  return '#' + [f(n >>> 16), f((n >>> 8) & 255), f(n & 255)].map((v) => v.toString(16).padStart(2, '0')).join('');
};
/** 한 재질의 네 가지 색: 밝은 면 · 바탕 · 그늘 · 외곽선 */
interface Pal { hi: string; base: string; sh: string; out: string }
const pal = (base: string, outK = 0.42): Pal => ({ hi: mix(base, 1.28), base, sh: mix(base, 0.76), out: mix(base, outK) });

const SKIN: Pal[] = [
  { hi: '#fff0e2', base: '#fbd9bf', sh: '#eab394', out: '#9a5a48' },
  { hi: '#ffe6cf', base: '#f2c49e', sh: '#d99e78', out: '#8e5040' },
  { hi: '#f4d0a8', base: '#dea77a', sh: '#bf8558', out: '#784230' },
  { hi: '#c99670', base: '#ac7650', sh: '#8a5a3a', out: '#553020' },
  { hi: '#fff6ee', base: '#fde6d4', sh: '#efc4aa', out: '#a06a58' },
];
const HAIR = ['#2e2426', '#553a2a', '#1c1c2a', '#8a5530', '#d8b060', '#9a3434', '#e8e0d0', '#5b6f9f', '#d07898'];
const GRAY = '#c8c4c0';
const EYE = ['#5a3420', '#3a2418', '#2a2438', '#7a5020', '#3a5a3a'];
const EYE_FUT = ['#3a7ac8', '#2a9a8a', '#8a4ac8', '#c85a8a'];
const CLOTH = ['#e8b83e', '#4a78c0', '#d85a4a', '#4aa060', '#8a60c8', '#ee88aa', '#3a9aa8', '#f4f0e8', '#34344a', '#c8803a', '#78a0d8', '#a8d058', '#ecdcb4', '#8a3a50', '#f09048', '#5a5a80', '#a8dcee', '#e0a8d0'];
const ACCENT = ['#ff5a7a', '#ffd23f', '#6ad0ff', '#ff8ac8', '#9a6aff', '#ffffff', '#ff7a3a'];
const LASH = '#2a1822';
const WHITE = '#fffaf4';
const BLUSH = '#f7a0a8';

const stageOf = (a: number): Stage => (a < 3 ? 'baby' : a < 13 ? 'child' : a < 20 ? 'teen' : a < 60 ? 'adult' : 'elder');
const eraOf = (year: number) => (year < 1983 ? 0 : year < 2040 ? 1 : 2);

// ───────────────────────── 그리기 판 ─────────────────────────

/** 칸마다 색과 재질(외곽선 색을 정할 때 쓴다) */
class Grid {
  c: Px[][];
  m: (string | null)[][];
  outs: Record<string, string> = {};
  constructor(public n: number) {
    this.c = Array.from({ length: n }, () => Array(n).fill(null));
    this.m = Array.from({ length: n }, () => Array(n).fill(null));
  }
  set(x: number, y: number, col: string, mat: string) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.n || y >= this.n) return;
    this.c[y][x] = col;
    this.m[y][x] = mat;
  }
  get(x: number, y: number) {
    return x < 0 || y < 0 || x >= this.n || y >= this.n ? null : this.m[y][x];
  }
  row(y: number, x0: number, x1: number, col: string, mat: string) {
    for (let x = x0; x <= x1; x++) this.set(x, y, col, mat);
  }
  /** 문자 그림 찍기: 글자 → 색 */
  stamp(x: number, y: number, rows: string[], colors: Record<string, string>, mat: string, flip = false) {
    rows.forEach((r, j) => [...r].forEach((ch, i) => ch !== '.' && colors[ch] && this.set(x + (flip ? r.length - 1 - i : i), y + j, colors[ch], mat)));
  }
  ellipse(cx: number, cy: number, rx: number, ry: number, col: string, mat: string, test?: (x: number, y: number) => boolean) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1 && (!test || test(x, y))) this.set(x, y, col, mat);
      }
  }
  /** 바깥 외곽선: 빈칸이 어떤 재질과 닿으면 그 재질의 외곽선 색 */
  outline() {
    const add: [number, number, string][] = [];
    for (let y = 0; y < this.n; y++)
      for (let x = 0; x < this.n; x++) {
        if (this.c[y][x]) continue;
        for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
          const mm = this.get(x + dx, y + dy);
          if (mm) {
            add.push([x, y, this.outs[mm] ?? '#2a1e24']);
            break;
          }
        }
      }
    for (const [x, y, col] of add) this.set(x, y, col, 'line');
  }
}

// ───────────────────────── 얼굴·머리 설계 ─────────────────────────

interface Build {
  st: Stage;
  f: boolean;
  era: number;
  h: number;
  cx: number;
  faceTop: number;
  rows: number[]; // 얼굴 줄마다 반폭
  eyeY: number;
  skin: Pal;
  hair: Pal;
  eye: string;
  accent: string;
  style: string;
  fringe: string;
}

const FEMALE_STYLES = [
  ['long', 'hime', 'bob', 'pony', 'perm', 'braid', 'bun', 'long', 'bob'], // 1960~70년대
  ['long', 'bob', 'pony', 'twin', 'wavy', 'bun', 'hime', 'long', 'braid'], // 1980~2030년대
  ['wavy', 'twin', 'bob', 'pony', 'long', 'bun', 'hime', 'braid', 'long'], // 2040년대~
];
const MALE_STYLES = [
  ['short', 'side', 'buzz', 'slick', 'short', 'bowl', 'side', 'curly', 'short', 'buzz'],
  ['side', 'short', 'spiky', 'twoblock', 'messy', 'curly', 'slick', 'bowl', 'side', 'spiky'],
  ['twoblock', 'spiky', 'messy', 'mohawk', 'side', 'curly', 'short', 'slick', 'spiky', 'messy'],
];

function plan(p: Person, age: number, year: number): Build {
  const st = stageOf(age);
  const f = p.sex === 'F';
  const era = eraOf(year);
  const h = hash(p.id);
  const gn = p.genes;
  const skin = SKIN[gn.skin % SKIN.length];
  let hc = HAIR[gn.hairColor % HAIR.length];
  if (st === 'elder') hc = GRAY;
  else if (st === 'adult' && age >= 50 && h % 3 === 0) hc = mix(hc, 1.35); // 희끗희끗
  if (era === 2 && st !== 'elder' && h % 4 === 0) hc = ['#48b8d0', '#b060d8', '#e86a9a', '#5ac878'][h % 4];
  const eye = era === 2 && h % 3 === 0 ? EYE_FUT[h % EYE_FUT.length] : EYE[gn.eyes % EYE.length];
  const kidish = st === 'baby' || st === 'child';
  // 얼굴형: 여자는 갸름한 V턱, 남자는 각진 턱, 아이는 동글동글
  const FACES_F = [
    [7, 8, 9, 10, 10, 10, 10, 10, 10, 10, 10, 9, 9, 8, 7, 6, 4, 3],
    [7, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 9, 8, 7, 6, 5, 3],
    [8, 9, 10, 11, 11, 11, 11, 11, 11, 11, 10, 10, 9, 8, 7, 5],
  ];
  const FACES_M = [
    [8, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 9, 9, 8, 7, 5],
    [8, 9, 10, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 10, 10, 9, 8, 6],
    [7, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 9, 9, 8, 7, 6, 4],
  ];
  const KID = [8, 10, 11, 11, 12, 12, 12, 12, 12, 12, 12, 11, 11, 10, 9, 7, 5];
  const BABY = [9, 11, 12, 12, 13, 13, 13, 13, 13, 13, 12, 12, 11, 9, 7];
  const rows = st === 'baby' ? BABY : kidish ? KID : (f ? FACES_F : FACES_M)[(gn.face ?? 0) % 3];
  const faceTop = st === 'baby' ? 17 : kidish ? 15 : st === 'teen' ? 13 : 12;
  const eyeY = faceTop + (st === 'baby' ? 7 : kidish ? 7 : 8);
  let style = (f ? FEMALE_STYLES : MALE_STYLES)[era][(gn.hairStyle * 7 + (h >>> 5)) % (f ? 9 : 10)];
  if (st === 'baby') style = 'baby';
  else if (st === 'child') style = f ? (['twin', 'bob', 'pony', 'long'] as const)[h % 4] : (['bowl', 'short', 'spiky', 'short'] as const)[h % 4];
  else if (st === 'elder') style = f ? (h % 2 ? 'perm' : 'bun') : h % 3 === 0 ? 'bald' : h % 3 === 1 ? 'side' : 'short';
  const FR: Record<string, string[]> = {
    long: ['part', 'bangs', 'side'], hime: ['bangs'], bob: ['bangs', 'side'], pony: ['side', 'part'], twin: ['bangs'], wavy: ['part', 'side'], bun: ['part', 'bangs'], braid: ['side'], perm: ['curl'],
    short: ['short'], side: ['side'], spiky: ['spiky'], buzz: ['none'], twoblock: ['side'], slick: ['none'], curly: ['curl'], bowl: ['bowl'], messy: ['spiky'], mohawk: ['none'], bald: ['none'], baby: ['tuft'],
  };
  const fr = FR[style] ?? ['short'];
  return { st, f, era, h, cx: 24, faceTop, rows, eyeY, skin, hair: pal(hc, 0.4), eye, accent: ACCENT[(h >>> 7) % ACCENT.length], style, fringe: fr[(h >>> 3) % fr.length] };
}

// ───────────────────────── 48×48 초상화 ─────────────────────────

function paint(p: Person, age: number, year: number, face: Face, blink: boolean): Grid {
  const B = plan(p, age, year);
  const { st, f, cx, faceTop, rows, eyeY, skin, hair, h } = B;
  const g = new Grid(N);
  const kidish = st === 'baby' || st === 'child';
  const faceBottom = faceTop + rows.length - 1;
  const inFace = (x: number, y: number) => {
    const i = y - faceTop;
    if (i < 0 || i >= rows.length) return false;
    return x >= cx - rows[i] && x <= cx + rows[i] - 1;
  };
  const maxW = Math.max(...rows);
  g.outs = { hair: hair.out, hairB: hair.out, skin: skin.out, neck: skin.out };

  // 1) 뒷머리 (긴 머리는 몸 뒤로 흘러내린다)
  const backLen: Record<string, number> = { long: 47, hime: 47, wavy: 46, braid: faceBottom + 2, bob: faceBottom - 1, pony: faceBottom, twin: faceBottom, bun: faceBottom - 2, perm: faceBottom - 3 };
  if (backLen[B.style] !== undefined) {
    const bottom = backLen[B.style];
    for (let y = faceTop + 2; y <= bottom; y++) {
      const t = (y - faceTop) / (bottom - faceTop + 1);
      const w = maxW + 3 + (B.style === 'wavy' ? Math.round(Math.sin(y / 2) * 1.2) : 0) - (B.style === 'bob' && y > bottom - 2 ? 1 : 0) + (t > 0.7 && (B.style === 'long' || B.style === 'hime') ? 1 : 0);
      g.row(y, cx - w, cx + w - 1, y > bottom - 2 ? hair.sh : hair.base, 'hairB');
    }
  }
  if (B.style === 'twin') {
    // 양갈래: 머리 양옆으로 묶어 늘어뜨린다
    for (const side of [-1, 1]) {
      const x0 = side < 0 ? cx - maxW - 6 : cx + maxW + 1;
      for (let y = faceTop + 3; y <= (kidish ? 36 : 42); y++) {
        const w = y < faceTop + 6 ? 3 : y > (kidish ? 33 : 39) ? 3 : 4;
        g.row(y, x0 + (side < 0 ? 5 - w : 0), x0 + (side < 0 ? 4 : w - 1), hair.base, 'hairB');
      }
    }
  }
  if (B.style === 'pony') {
    for (let y = faceTop - 1; y <= faceTop + 20; y++) {
      const w = y < faceTop + 3 ? 3 : y < faceTop + 16 ? 4 : 3;
      const x0 = cx + maxW + 1 + Math.round(Math.sin((y - faceTop) / 5) * 1);
      g.row(y, x0, x0 + w - 1, hair.base, 'hairB');
    }
  }

  // 2) 옷 (어깨)
  const kind = pickCloth(p, st, h, B.era);
  drawBody(g, B, kind, p, faceBottom);

  // 3) 목·얼굴·귀
  const neckW = f || kidish ? 3 : 4;
  for (let y = faceBottom - 1; y <= faceBottom + 4; y++) g.row(y, cx - neckW, cx + neckW - 1, skin.sh, 'neck');
  rows.forEach((w, i) => g.row(faceTop + i, cx - w, cx + w - 1, skin.base, 'skin'));
  const earY = eyeY;
  for (const [x, dir] of [[cx - maxW - 1, -1], [cx + maxW, 1]] as const) {
    g.set(x, earY, skin.base, 'skin'), g.set(x, earY + 1, skin.base, 'skin'), g.set(x, earY + 2, skin.sh, 'skin');
    g.set(x + dir, earY + 1, skin.base, 'skin');
  }
  // 얼굴 음영: 오른쪽 가장자리·턱 아래
  rows.forEach((w, i) => {
    const y = faceTop + i;
    g.set(cx + w - 1, y, skin.sh, 'skin');
    if (i >= rows.length - 2) g.row(y, cx - w + 1, cx + w - 2, skin.sh, 'skin');
  });
  // 볼 하이라이트
  g.set(cx - rows[4] + 2, faceTop + 4, skin.hi, 'skin');

  // 4) 앞머리·정수리
  drawHair(g, B, inFace, maxW);

  // 5) 이목구비
  drawFace(g, B, face, blink, p.genes.mouth ?? 0, p.genes.brows ?? 0);

  // 6) 개인 특징
  const mark = p.genes.mark ?? 0;
  const lx = cx - 9;
  const rx = cx + 3;
  if (mark === 1 && st !== 'baby') {
    const G = st === 'elder' ? '#8a6a3a' : '#3a3444';
    for (const x0 of [lx - 1, rx - 1]) {
      g.row(eyeY - 2, x0, x0 + 7, G, 'acc');
      g.row(eyeY + 5, x0, x0 + 7, G, 'acc');
      for (let y = eyeY - 1; y <= eyeY + 4; y++) g.set(x0, y, G, 'acc'), g.set(x0 + 7, y, G, 'acc');
      g.set(x0 + 1, eyeY - 1, '#ffffff', 'acc');
    }
    g.row(eyeY - 1, cx - 2, cx + 1, G, 'acc');
  }
  if (mark === 5 && st === 'adult' && face !== 'sleep') {
    for (const x0 of [lx - 1, rx - 1]) for (let y = eyeY - 1; y <= eyeY + 4; y++) g.row(y, x0, x0 + 7, y === eyeY - 1 ? '#1a1a24' : '#2a2a3a', 'acc');
    g.set(lx + 1, eyeY, '#8a8aa0', 'acc'), g.set(rx + 1, eyeY, '#8a8aa0', 'acc');
    g.row(eyeY - 1, cx - 2, cx + 1, '#1a1a24', 'acc');
  }
  if (mark === 2) for (const [x, y] of [[-7, 6], [-6, 7], [-8, 7], [6, 6], [5, 7], [7, 7]]) g.set(cx + x, eyeY + y, skin.sh, 'skin');
  if (mark === 3) g.set(cx + 4, eyeY + 8, '#5a3a30', 'skin');
  if (st === 'elder') {
    g.set(cx - 10, eyeY + 1, skin.sh, 'skin'), g.set(cx + 9, eyeY + 1, skin.sh, 'skin');
    g.set(cx - 5, eyeY + 7, skin.sh, 'skin'), g.set(cx + 4, eyeY + 7, skin.sh, 'skin');
    g.row(faceTop + 3, cx - 3, cx + 2, skin.sh, 'skin');
  }
  if (!f && st === 'adult' && (h >>> 9) % 3 === 0) for (let x = cx - 5; x <= cx + 4; x += 2) g.set(x, faceBottom - 2, skin.sh, 'skin'); // 수염 자국
  if (!f && (st === 'elder' || (st === 'adult' && age >= 40)) && (h >>> 11) % 4 === 0) {
    // 콧수염
    const m = st === 'elder' ? GRAY : hair.base;
    g.row(eyeY + 7, cx - 3, cx + 2, m, 'hair');
    g.set(cx - 4, eyeY + 8, m, 'hair'), g.set(cx + 3, eyeY + 8, m, 'hair');
  }
  if (f && (st === 'adult' || st === 'teen') && (h >>> 10) % 3 !== 0) {
    // 귀걸이
    const E = (h >>> 12) % 2 ? '#f0c848' : '#f4f0f8';
    g.set(cx - maxW - 1, earY + 3, E, 'acc'), g.set(cx + maxW, earY + 3, E, 'acc');
    if (st === 'adult') g.set(cx - maxW - 1, earY + 4, E, 'acc'), g.set(cx + maxW, earY + 4, E, 'acc');
  }

  // 7) 모자·머리 장식
  drawHat(g, B, p, maxW);

  g.outs.acc = '#2a2230';
  g.outline();
  return g;
}

function drawHair(g: Grid, B: Build, inFace: (x: number, y: number) => boolean, maxW: number) {
  const { cx, faceTop, hair, style, fringe, f, eyeY } = B;
  const H = (x: number, y: number, c = hair.base) => g.set(x, y, c, 'hair');
  if (style === 'bald') {
    // 옆머리만: 귀 위로 조금
    for (let y = faceTop + 4; y <= eyeY + 1; y++) H(cx - maxW, y), H(cx - maxW + 1, y), H(cx + maxW - 1, y), H(cx + maxW - 2, y);
    g.set(cx - 4, faceTop + 1, '#ffffff', 'skin');
    return;
  }
  if (style === 'baby') {
    // 정수리 한 가닥
    H(cx - 1, faceTop - 1), H(cx, faceTop - 2), H(cx + 1, faceTop - 3), H(cx + 2, faceTop - 3), H(cx - 1, faceTop), H(cx, faceTop), H(cx + 1, faceTop);
    return;
  }
  // 정수리(두피를 덮는 타원)
  const vol = style === 'perm' || style === 'curly' ? 2 : f ? 1 : style === 'buzz' ? -1 : 0;
  const ry = 9 + vol;
  const top = style === 'buzz' ? faceTop - 1 : faceTop - 3 - (style === 'spiky' || style === 'messy' ? 1 : 0) - (vol > 0 ? 1 : 0);
  const rx = maxW + 2 + vol;
  const hairline = fringe === 'none' ? faceTop + 1 : faceTop + 2;
  g.ellipse(cx, top + ry, rx, ry, hair.base, 'hair', (x, y) => !inFace(x, y) || y < hairline);
  // 옆머리(귀 앞으로 내려오는 구레나룻 / 여자는 옆 가닥)
  const sideTo = f ? (style === 'bun' || style === 'pony' ? eyeY + 4 : eyeY + 9) : style === 'buzz' ? eyeY - 2 : eyeY - 1;
  // 얼굴은 가리지 않는다: 옆머리는 얼굴 윤곽 바깥에서 얼굴을 감싸듯 흘러내린다
  for (let y = faceTop + 2; y <= sideTo; y++) {
    const i = y - faceTop;
    const w = B.rows[Math.min(i, B.rows.length - 1)];
    if (f) {
      const thick = y > eyeY + 5 ? 1 : 2;
      for (let k = 1; k <= thick; k++) H(cx - w - k, y), H(cx + w - 1 + k, y);
    } else if (y <= eyeY - 2) H(cx - w - 1, y), H(cx + w, y);
  }
  if (style === 'buzz') for (let x = cx - maxW; x < cx + maxW; x += 2) g.set(x, faceTop, hair.sh, 'hair');
  if (style === 'twoblock') for (let y = faceTop + 2; y <= eyeY - 1; y++) g.set(cx - maxW - 1, y, hair.sh, 'hair'), g.set(cx + maxW, y, hair.sh, 'hair');

  // 앞머리
  const L = cx - maxW;
  const R = cx + maxW - 1;
  const width = R - L + 1;
  switch (fringe) {
    case 'bangs': {
      // 일자 앞머리 (끝이 들쭉날쭉)
      const depth = style === 'bowl' ? 5 : 5;
      for (let x = L; x <= R; x++) {
        const d = depth - ((x - L) % 3 === 1 ? 1 : 0) - (x === L || x === R ? 1 : 0);
        for (let y = faceTop; y < faceTop + d; y++) if (inFace(x, y)) H(x, y);
      }
      break;
    }
    case 'bowl': {
      for (let x = L; x <= R; x++) for (let y = faceTop; y < faceTop + 4; y++) if (inFace(x, y)) H(x, y);
      break;
    }
    case 'side': {
      // 옆으로 넘긴 앞머리: 왼쪽은 이마가 보이고 오른쪽으로 쓸려 내려온다
      for (let x = L; x <= R; x++) {
        const t = (x - L) / width;
        const d = 1 + Math.round(t * (f ? 5 : 4));
        for (let y = faceTop; y < faceTop + d; y++) if (inFace(x, y)) H(x, y);
      }
      break;
    }
    case 'part': {
      // 가운데 가르마 (커튼 앞머리)
      for (let x = L; x <= R; x++) {
        const d = Math.min(6, 1 + Math.round(Math.abs(x + 0.5 - cx) / 1.6));
        for (let y = faceTop; y < faceTop + d; y++) if (inFace(x, y)) H(x, y);
      }
      break;
    }
    case 'spiky': {
      // 삐죽삐죽: 아래로 뾰족한 가닥들
      for (let x = L; x <= R; x++) {
        const k = (x - L) % 4;
        const d = [3, 4, 3, 2][k];
        for (let y = faceTop; y < faceTop + d; y++) if (inFace(x, y)) H(x, y);
      }
      // 위로 솟은 가닥
      for (let i = 0; i < 4; i++) {
        const x = cx - 7 + i * 5;
        H(x, top - 1), H(x + 1, top - 1), H(x + 1, top - 2);
      }
      break;
    }
    case 'short': {
      for (let x = L; x <= R; x++) {
        const d = 3 + ((x - L) % 5 === 2 ? 1 : 0);
        for (let y = faceTop; y < faceTop + d; y++) if (inFace(x, y)) H(x, y);
      }
      break;
    }
    case 'curl': {
      for (let x = L - 1; x <= R + 1; x++) {
        const d = 3 + ((x - L) % 3 === 0 ? 1 : 0);
        for (let y = faceTop; y < faceTop + d; y++) if (inFace(x, y)) H(x, y);
      }
      // 뽀글뽀글한 윤곽
      for (let a = 0; a < 14; a++) {
        const ang = Math.PI + (a / 13) * Math.PI;
        H(cx + Math.cos(ang) * (rx + 0.5), top + ry + Math.sin(ang) * (ry + 0.5));
      }
      break;
    }
    case 'none':
      break;
  }
  if (style === 'mohawk') {
    for (let y = top - 4; y < top + 3; y++) g.row(y, cx - 2, cx + 1, hair.base, 'hair');
    for (let x = cx - maxW - 1; x <= cx + maxW; x++) for (let y = top + 1; y < faceTop + 2; y++) if (g.get(x, y) === 'hair' && Math.abs(x + 0.5 - cx) > 3) g.set(x, y, mix(B.skin.base, 0.85), 'skin');
  }
  if (style === 'bun') g.ellipse(cx, top - 2, 5, 4, hair.base, 'hair');
  if (style === 'slick') for (let x = cx - 6; x <= cx + 6; x += 3) g.set(x, top + 3, hair.sh, 'hair'), g.set(x + 1, top + 4, hair.sh, 'hair');

  // 음영: 가닥 아래쪽·오른쪽은 그늘, 얼굴과 닿는 끝은 짙게
  const shade: [number, number, string][] = [];
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      if (g.get(x, y) !== 'hair') continue;
      const below = g.get(x, y + 1);
      if (below === 'skin') shade.push([x, y, hair.out]);
      else if (below !== 'hair' || g.get(x + 1, y) !== 'hair') shade.push([x, y, hair.sh]);
    }
  for (const [x, y, c] of shade) g.set(x, y, c, 'hair');
  // 가닥 결: 정수리에서 내려오는 가는 선
  for (let i = 0; i < 5; i++) {
    const x0 = cx - 8 + i * 4;
    for (let y = top + 2; y < faceTop + 1; y++) if (g.get(x0 + ((y >> 1) % 2), y) === 'hair' && (y + i) % 3 !== 0) g.set(x0 + ((y >> 1) % 2), y, hair.sh, 'hair');
  }
  // 천사의 고리: 반짝이는 윤기 띠
  const ringY = top + 3 + (vol > 0 ? 1 : 0);
  for (let x = cx - rx + 3; x <= cx + rx - 5; x++) {
    if ((x - cx + 40) % 5 === 4) continue;
    const y = ringY + Math.round(Math.abs(x + 0.5 - cx) / 5);
    if (g.get(x, y) === 'hair') g.set(x, y, hair.hi, 'hair');
  }
  g.set(cx - 5, top + 2, mix(hair.base, 1.55), 'hair');
}

function drawFace(g: Grid, B: Build, face: Face, blink: boolean, mouthGene: number, browGene: number) {
  const { cx, eyeY, f, st, skin, hair, eye } = B;
  const kidish = st === 'baby' || st === 'child';
  const K = st === 'elder' ? '#4a3a3a' : LASH;
  const D = mix(eye, 0.55);
  const I = eye;
  const i2 = mix(eye, 1.35);
  const col: Record<string, string> = { K, D, I, i: i2, H: '#ffffff', W: WHITE, L: mix(skin.out, 1.15), R: '#e8506a', Y: '#f8d048', y: '#c89a28', B: '#8ad0ff', P: '#ff8ab0' };
  const lx = cx - 9; // 왼눈 바깥쪽 (6칸 눈)
  const rx = cx + 3; // 오른눈 안쪽
  const eyes = (rows: string[], dy = 0) => {
    g.stamp(lx, eyeY + dy, rows, col, 'eye');
    g.stamp(rx, eyeY + dy, rows, col, 'eye', true);
  };
  const closed = blink || face === 'sleep';
  // ── 눈: 굵은 윗속눈썹 · 위는 짙고 아래로 밝아지는 눈동자 · 반짝이 둘 ──
  if (face === 'love') eyes(['.R..R.', 'RRRRRR', 'RPRRRR', '.RRRR.', '..RR..']);
  else if (face === 'money') eyes(['..YY..', '.YYYY.', 'Y.YY..', '.YYYY.', '..YY.Y', '.YYYY.']);
  else if (face === 'happy' || face === 'cry') eyes(['.KKKK.', 'K....K']);
  else if (closed) eyes(['......', '......', 'KKKKKK', '.LLLL.'], 0);
  else if (face === 'shock') eyes(['.KKKK.', 'KWWWWK', 'KWDDWK', 'KWWWWK', '.KKKK.']);
  else if (face === 'smug') eyes(['KKKKKK', 'KDDDHW', '.LLLL.'], 1);
  else if (st === 'baby') eyes(['.KKKK.', 'KDDHDK', 'KIiiDK', '.KKKK.']);
  else if (kidish) eyes(['.KKKK.', 'KDDDHK', 'KDIIHK', 'KIiiIK', '.KKKK.']);
  else if (st === 'elder') eyes(f ? ['.KKKKK', 'KDDDHW', '.LLLL.'] : ['KKKKKK', '.DDDH.', '.LLLL.']);
  else if (f) {
    eyes(['.KKKK.', 'KKKKKK', 'KDDDHW', 'KDIIHW', 'KIiiIW', '.LiiL.']);
    g.set(lx - 1, eyeY, K, 'eye'), g.set(rx + 6, eyeY, K, 'eye');
    g.set(lx - 1, eyeY + 1, K, 'eye'), g.set(rx + 6, eyeY + 1, K, 'eye');
    g.set(lx + 2, eyeY + 4, '#ffffff', 'eye'), g.set(rx + 3, eyeY + 4, '#ffffff', 'eye');
  } else eyes(['KKKKKK', 'KDDDHK', 'WDIIHW', 'WIiiIW', '.LLLL.']);
  if (face === 'angry' && !closed) {
    // 눈꼬리가 치켜 올라간다
    g.set(lx + 4, eyeY, skin.base, 'skin'), g.set(rx, eyeY, skin.base, 'skin');
  }
  // ── 눈썹 ──
  const bc = st === 'elder' ? '#9a948e' : hair.sh === hair.base ? hair.out : mix(hair.base, 0.62);
  const by = eyeY - (kidish ? 2 : 3);
  const browL = (pts: [number, number][]) => {
    for (const [x, y] of pts) g.set(lx + x, by + y, bc, 'eye'), g.set(rx + 5 - x, by + y, bc, 'eye');
  };
  if (face === 'angry') browL([[0, -1], [1, -1], [2, 0], [3, 0], [4, 1], ...(f ? [] : ([[1, 0], [3, 1]] as [number, number][]))]);
  else if (face === 'sad' || face === 'cry') browL([[0, 1], [1, 0], [2, 0], [3, -1], [4, -1]]);
  else if (face === 'shock') browL([[0, -1], [1, -2], [2, -2], [3, -2], [4, -1]]);
  else if (f || kidish) browL(browGene % 2 ? [[0, 0], [1, -1], [2, -1], [3, -1]] : [[1, -1], [2, -1], [3, -1], [4, 0]]);
  else browL(browGene % 2 ? [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [1, -1], [2, -1], [3, -1]] : [[0, 0], [1, -1], [2, -1], [3, -1], [4, 0], [1, 0], [2, 0], [3, 0]]);
  // ── 코 ──
  const ny = eyeY + (kidish ? 5 : 6);
  g.set(cx, ny, skin.sh, 'skin');
  if (!f && !kidish) g.set(cx, ny - 1, skin.sh, 'skin');
  g.set(cx - 1, ny - 1, skin.hi, 'skin');
  // ── 볼터치 ──
  if (f || kidish || face === 'love' || face === 'happy' || face === 'smug') {
    const b = f || kidish ? BLUSH : mix(BLUSH, 0.95);
    const byy = eyeY + (kidish ? 5 : 6);
    g.row(byy, lx, lx + 2, b, 'skin'), g.row(byy, rx + 3, rx + 5, b, 'skin');
    g.set(lx + 1, byy + 1, mix(b, 1.08), 'skin'), g.set(rx + 4, byy + 1, mix(b, 1.08), 'skin');
    if (face === 'love') g.row(eyeY + (kidish ? 5 : 6), lx + 1, lx + 2, b, 'skin'), g.row(eyeY + (kidish ? 5 : 6), rx + 2, rx + 3, b, 'skin');
  }
  // ── 입 ──
  const my = eyeY + (kidish ? 7 : 8);
  const lip = f && !kidish && st !== 'elder' ? '#d8586e' : mix(skin.out, 1.25);
  const M: Record<string, string> = { M: lip, K: mix(skin.out, 0.8), r: '#e86a78', w: '#ffffff', d: '#6a2a32' };
  const mouth = (rows: string[]) => g.stamp(cx - Math.floor(rows[0].length / 2), my, rows, M, 'mouth');
  if (face === 'happy' || face === 'money') mouth(['KKKK', 'KrrK', '.KK.']);
  else if (face === 'love') mouth(['K.K.K', '.K.K.']);
  else if (face === 'shock') mouth(['.KK.', 'KddK', '.KK.']);
  else if (face === 'sad' || face === 'cry') mouth(['.KK.', 'K..K']);
  else if (face === 'angry') mouth(['KKKK', 'KwwK', 'KKKK']);
  else if (face === 'smug') mouth(['...K', 'KKK.']);
  else if (face === 'sleep') mouth(['.K.', 'K.K', '.K.']);
  else if (f) mouth(mouthGene % 3 === 0 ? ['MM'] : mouthGene % 3 === 1 ? ['.MM.', 'M..M'].reverse() : ['MMM']);
  else mouth(mouthGene % 2 ? ['KKK'] : ['K..K', '.KK.']);
  // ── 눈물·땀·반짝 ──
  if (face === 'cry') for (let y = eyeY + 2; y < eyeY + 8; y++) g.set(lx + 2, y, '#8ad0ff', 'eye'), g.set(rx + 2, y, '#8ad0ff', 'eye');
  if (face === 'sad') g.set(lx + 4, eyeY + 4, '#8ad0ff', 'eye');
  if (face === 'shock') g.set(cx + 11, B.faceTop + 2, '#8ad0ff', 'eye'), g.set(cx + 11, B.faceTop + 3, '#8ad0ff', 'eye'), g.set(cx + 12, B.faceTop + 3, '#8ad0ff', 'eye');
}

type Cloth = 'tee' | 'shirt' | 'hoodie' | 'suit' | 'sweater' | 'hanbok' | 'uniform' | 'cardigan' | 'coat' | 'army' | 'police' | 'chef' | 'overall' | 'jersey' | 'future' | 'dress';
function pickCloth(p: Person, st: Stage, h: number, era: number): Cloth {
  const f = p.sex === 'F';
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
    if (j === 'hj_av' || j === 'hj_spy' || j === 'hj_gambler' || j === 'hj_magician') return f ? 'dress' : 'suit';
    if (j === 'hj_mafia' || j === 'hj_trader') return 'suit';
    if (['lawyer', 'judge', 'prosecutor', 'politician', 'minister', 'president', 'corp', 'banker', 'analyst', 'diplomat', 'accountant', 'founder', 'ceo', 'mayor', 'lawmaker'].includes(j)) return 'suit';
  }
  if (era === 2 && h % 3 === 0) return 'future';
  if (st === 'elder' && era === 0) return h % 2 ? 'hanbok' : 'cardigan';
  if (st === 'elder') return (['cardigan', 'sweater', 'shirt', 'hanbok'] as Cloth[])[h % 4];
  const list: Cloth[] = st === 'child' ? (f ? ['dress', 'tee', 'sweater', 'dress', 'overall'] : ['tee', 'tee', 'sweater', 'hoodie', 'overall']) : f ? ['dress', 'shirt', 'cardigan', 'sweater', 'tee', 'dress', 'shirt'] : ['tee', 'shirt', 'hoodie', 'sweater', 'cardigan', 'shirt', 'tee'];
  return list[(h >>> 3) % list.length];
}

function drawBody(g: Grid, B: Build, kind: Cloth, p: Person, faceBottom: number) {
  const { st, f, cx, h, era } = B;
  const kidish = st === 'baby' || st === 'child';
  let base = CLOTH[(h >>> 8) % CLOTH.length];
  if (kind === 'coat' || kind === 'chef') base = '#f6f6f2';
  if (kind === 'army') base = '#62703e';
  if (kind === 'police') base = '#2e3e6e';
  if (kind === 'suit') base = f ? ['#34344a', '#e8e0d4', '#6a3a4a', '#2a3450'][h % 4] : ['#2a2a36', '#3a3a4c', '#2a3452', '#4a3a3a'][h % 4];
  if (kind === 'uniform') base = era === 0 ? '#222230' : ['#2a3a5c', '#3a2a3a', '#2a4a3a'][h % 3];
  if (kind === 'overall') base = '#4a6aa0';
  if (kind === 'future') base = ['#eef0f6', '#2a2a3c', '#d8eaf2'][h % 3];
  if (kind === 'jersey') base = JOBS[p.job]?.color ?? base;
  if (kind === 'hanbok') base = f ? ['#f4d860', '#f4a8c0', '#a8d8b0', '#c8b8f0'][h % 4] : ['#f0ece0', '#c8d8e8', '#e8d8b8'][h % 3];
  const P = pal(base, 0.45);
  g.outs.cloth = P.out;
  g.outs.cloth2 = '#3a3440';
  const shoulder = st === 'baby' ? 11 : kidish ? 13 : f ? (st === 'teen' ? 14 : 15) : st === 'teen' ? 16 : 19;
  const top = faceBottom + 3;
  const C = (x: number, y: number, c: string, m = 'cloth') => g.set(x, y, c, m);
  for (let y = top; y < N; y++) {
    const w = Math.min(shoulder, 5 + (y - top) * (f || kidish ? 3 : 4));
    const ww = kind === 'dress' && y > top + 6 ? w + Math.floor((y - top - 6) / 2) : w;
    for (let x = cx - ww; x <= cx + ww - 1; x++) {
      const rel = (x - (cx - ww)) / (2 * ww);
      C(x, y, rel > 0.72 ? P.sh : rel < 0.16 && y < top + 5 ? P.hi : P.base);
    }
  }
  // 팔 경계 (소매 선)
  if (!kidish) for (let y = top + 5; y < N; y++) C(cx - shoulder + 4, y, P.sh), C(cx + shoulder - 5, y, P.out);
  const W = (x: number, y: number, c = '#fbf8f0') => g.set(x, y, c, 'cloth');
  const acc = B.accent;
  switch (kind) {
    case 'tee':
    case 'dress': {
      // 둥근 목선
      g.row(top, cx - 3, cx + 2, B.skin.sh, 'neck');
      g.row(top + 1, cx - 2, cx + 1, B.skin.sh, 'neck');
      if (kind === 'dress') {
        // 둥근 칼라 + 리본
        for (const s of [-1, 1]) for (let i = 0; i < 4; i++) W(cx + (s < 0 ? -4 - i : 3 + i), top + 1 + (i > 1 ? 1 : 0));
        g.stamp(cx - 3, top + 2, ['R.R.R'.replace(/\./g, '.'), 'RRkRR', 'R...R'].map((r) => r.slice(0, 5)), { R: acc, k: mix(acc, 0.6) }, 'cloth2');
        for (let y = top + 8; y < N; y += 3) for (let x = cx - 6; x < cx + 6; x += 4) W(x + (y % 2), y, P.hi);
      } else {
        const pat = (h >>> 12) % 5;
        if (pat === 1) for (let y = top + 4; y < N; y += 3) g.row(y, cx - shoulder + 1, cx + shoulder - 2, P.hi, 'cloth');
        if (pat === 2) for (let y = top + 4; y < N; y += 3) for (let x = cx - 12; x < cx + 12; x += 3) W(x + (y % 2), y, P.hi);
        if (pat === 4) g.stamp(cx - 3, top + 5, ['.ww.w', 'wwwww', '.www.', '..w..'], { w: mix(base, 1.5) }, 'cloth');
      }
      break;
    }
    case 'shirt': {
      if (f) {
        // 블라우스: 넓은 칼라 + 리본 타이
        for (let i = 0; i < 5; i++) W(cx - 1 - i, top + i), W(cx + i, top + i), W(cx - 2 - i, top + i), W(cx + 1 + i, top + i);
        g.stamp(cx - 3, top + 3, ['RR.RR', '.RkR.', '.R.R.'], { R: acc, k: mix(acc, 0.6) }, 'cloth2');
      } else {
        g.row(top, cx - 2, cx + 1, B.skin.sh, 'neck');
        g.stamp(cx - 5, top, ['wwww..wwww', '.www..www.', '..ww..ww..'], { w: '#fbf8f0' }, 'cloth');
        for (let y = top + 3; y < N; y += 3) W(cx, y, P.sh), W(cx - 1, y, P.out);
      }
      break;
    }
    case 'hoodie': {
      // 모자 테두리와 끈
      for (let x = cx - 7; x <= cx + 6; x++) g.set(x, top - 1, P.sh, 'cloth');
      g.row(top, cx - 3, cx + 2, B.skin.sh, 'neck');
      for (let y = top + 1; y < top + 7; y++) W(cx - 3, y), W(cx + 2, y);
      g.row(top + 11, cx - 6, cx + 5, P.sh, 'cloth');
      break;
    }
    case 'suit': {
      // 흰 셔츠 V + 넥타이(남) / 블라우스(여) + 옷깃
      for (let y = top; y < top + 9; y++) {
        const w = Math.max(0, 4 - Math.floor((y - top) / 2));
        for (let x = cx - w; x <= cx + w - 1; x++) W(x, y);
      }
      if (!f) for (let y = top + 1; y < N; y++) g.set(cx - (y > top + 2 ? 1 : 0), y, y < top + 3 ? '#a02838' : '#c83848', 'cloth2'), y > top + 2 && g.set(cx, y, '#a02838', 'cloth2');
      else g.stamp(cx - 1, top + 1, ['PP', 'PP'], { P: '#f0e0c0' }, 'cloth2');
      for (let i = 0; i < 9; i++) C(cx - 5 - Math.floor(i / 2), top + i, P.out), C(cx + 4 + Math.floor(i / 2), top + i, P.out);
      if (f && (h >>> 13) % 2) g.stamp(cx + 7, top + 5, ['.g.', 'ggg', '.g.'], { g: '#f0c848' }, 'cloth2'); // 브로치
      else if (!f) g.set(cx + 8, top + 6, '#f0c848', 'cloth2'); // 배지
      break;
    }
    case 'sweater': {
      g.row(top, cx - 3, cx + 2, B.skin.sh, 'neck');
      for (let x = cx - 4; x <= cx + 3; x++) C(x, top + 1, x % 2 ? P.hi : P.sh);
      for (let y = top + 4; y < N; y += 4) for (let x = cx - 10; x < cx + 10; x += 4) C(x, y, P.hi), C(x + 1, y + 1, P.hi), C(x + 2, y, P.hi);
      break;
    }
    case 'cardigan': {
      for (let y = top; y < N; y++) for (let x = cx - 2; x <= cx + 1; x++) W(x, y, f ? '#fbf4f0' : '#f0e8d8');
      for (let y = top; y < N; y++) C(cx - 3, y, P.out), C(cx + 2, y, P.out);
      for (let y = top + 4; y < N; y += 4) g.set(cx - 4, y, '#f0d890', 'cloth2');
      break;
    }
    case 'hanbok': {
      // 동정(흰 깃) 사선 + 고름
      for (let i = 0; i < 9; i++) W(cx + 3 - i, top + i), W(cx + 4 - i, top + i);
      g.row(top, cx - 2, cx + 3, B.skin.sh, 'neck');
      const go = f ? '#d83050' : mix(base, 0.6);
      g.stamp(cx - 6, top + 8, f ? ['GGGG.', '.GG..', '.G.G.', '.G..G', '.G...', 'G....'] : ['GG.', '.G.', '.G.'], { G: go }, 'cloth2');
      if (f) for (let y = top + 11; y < N; y++) g.row(y, cx - shoulder, cx + shoulder - 1, y === top + 11 ? '#fbf8f0' : '#d83a50', 'cloth');
      break;
    }
    case 'uniform': {
      if (era === 0) {
        // 학생복(스탠드 칼라) + 금단추
        g.row(top, cx - 4, cx + 3, P.out, 'cloth');
        g.row(top + 1, cx - 4, cx + 3, P.out, 'cloth');
        for (let y = top + 3; y < N; y += 3) g.set(cx - 1, y, '#f0c848', 'cloth2');
        if (f) for (let i = 0; i < 6; i++) W(cx - 1 - i, top + i), W(cx + i, top + i); // 세일러 칼라
      } else {
        for (let y = top; y < top + 8; y++) {
          const w = Math.max(0, 4 - Math.floor((y - top) / 2));
          for (let x = cx - w; x <= cx + w - 1; x++) W(x, y);
        }
        if (f) g.stamp(cx - 3, top + 2, ['RR.RR', '.RkR.', '.R.R.'], { R: '#d83a50', k: '#a02838' }, 'cloth2');
        else for (let y = top + 1; y < N; y++) g.set(cx - 1, y, '#3a5aa0', 'cloth2'), g.set(cx, y, '#2a4a88', 'cloth2');
        for (let i = 0; i < 8; i++) C(cx - 5 - Math.floor(i / 2), top + i, P.out), C(cx + 4 + Math.floor(i / 2), top + i, P.out);
        g.row(top + 7, cx + 6, cx + 9, '#fbf8f0', 'cloth2'); // 명찰
      }
      break;
    }
    case 'coat': {
      // 의사 가운: 옷깃 + 안에 푸른 셔츠 + 청진기
      for (let y = top; y < top + 8; y++) {
        const w = Math.max(0, 4 - Math.floor((y - top) / 2));
        for (let x = cx - w; x <= cx + w - 1; x++) g.set(x, y, '#8ab0d8', 'cloth');
      }
      for (let i = 0; i < 10; i++) C(cx - 5 - Math.floor(i / 2), top + i, '#c8ccd0'), C(cx + 4 + Math.floor(i / 2), top + i, '#c8ccd0');
      for (let i = 0; i < 7; i++) g.set(cx - 6 + (i > 3 ? i - 3 : 0), top + 1 + i, '#4a4a58', 'cloth2');
      g.stamp(cx - 4, top + 8, ['.m.', 'mMm', '.m.'], { m: '#9aa0aa', M: '#e0e4ea' }, 'cloth2');
      g.row(top + 9, cx + 6, cx + 9, '#4a78c0', 'cloth2');
      break;
    }
    case 'army': {
      for (let y = top + 2; y < N; y += 3) for (let x = cx - shoulder + 2; x < cx + shoulder - 2; x += 5) C(x + (y % 4), y, P.sh), C(x + 1 + (y % 4), y, P.sh), C(x + 2, y + 1, mix(base, 0.62));
      g.row(top, cx - 3, cx + 2, P.out, 'cloth');
      g.row(top + 6, cx + 5, cx + 9, '#e8e4d0', 'cloth2');
      break;
    }
    case 'police': {
      for (let y = top; y < top + 6; y++) {
        const w = Math.max(0, 3 - Math.floor((y - top) / 2));
        for (let x = cx - w; x <= cx + w - 1; x++) W(x, y, '#dfe6f0');
      }
      g.stamp(cx - 9, top + 4, ['.y.', 'yYy', '.y.'], { y: '#c8a028', Y: '#f8d860' }, 'cloth2');
      g.row(top + 2, cx - shoulder + 2, cx - shoulder + 6, '#f0c848', 'cloth2');
      g.row(top + 2, cx + shoulder - 7, cx + shoulder - 3, '#f0c848', 'cloth2');
      break;
    }
    case 'chef': {
      g.row(top, cx - 4, cx + 3, '#d83a3a', 'cloth2'); // 스카프
      g.row(top + 1, cx - 2, cx + 1, '#d83a3a', 'cloth2');
      for (let y = top + 4; y < N; y += 3) g.set(cx - 4, y, '#b8b8c0', 'cloth2'), g.set(cx + 3, y, '#b8b8c0', 'cloth2');
      break;
    }
    case 'overall': {
      for (let y = top; y < N; y++) for (let x = cx - shoulder + 2; x <= cx + shoulder - 3; x++) if (y < top + 7) g.set(x, y, '#f0e0c8', 'cloth');
      for (let y = top; y < top + 7; y++) C(cx - 6, y, P.base), C(cx - 5, y, P.base), C(cx + 4, y, P.base), C(cx + 5, y, P.base);
      g.set(cx - 6, top + 6, '#f0c848', 'cloth2'), g.set(cx + 5, top + 6, '#f0c848', 'cloth2');
      for (let x = cx - 8; x <= cx + 7; x++) if (x % 3) g.set(x, top + 12, P.sh, 'cloth');
      break;
    }
    case 'jersey': {
      g.row(top, cx - 3, cx + 2, '#fbf8f0', 'cloth2');
      g.row(top + 1, cx - 2, cx + 1, '#fbf8f0', 'cloth2');
      const n = String(((h >>> 4) % 98) + 1).padStart(2, '0');
      const DIG: Record<string, string[]> = { '0': ['www', 'w.w', 'w.w', 'w.w', 'www'], '1': ['.w.', 'ww.', '.w.', '.w.', 'www'], '2': ['www', '..w', 'www', 'w..', 'www'], '3': ['www', '..w', '.ww', '..w', 'www'], '4': ['w.w', 'w.w', 'www', '..w', '..w'], '5': ['www', 'w..', 'www', '..w', 'www'], '6': ['www', 'w..', 'www', 'w.w', 'www'], '7': ['www', '..w', '.w.', '.w.', '.w.'], '8': ['www', 'w.w', 'www', 'w.w', 'www'], '9': ['www', 'w.w', 'www', '..w', 'www'] };
      g.stamp(cx - 4, top + 5, DIG[n[0]], { w: '#fbf8f0' }, 'cloth2');
      g.stamp(cx + 1, top + 5, DIG[n[1]], { w: '#fbf8f0' }, 'cloth2');
      break;
    }
    case 'future': {
      g.row(top, cx - 3, cx + 2, B.skin.sh, 'neck');
      const glow = ['#4ae8ff', '#b06aff', '#4affb0'][h % 3];
      for (let y = top + 1; y < N; y++) g.set(cx - 5 + Math.floor((y - top) / 3), y, glow, 'cloth2');
      g.row(top + 8, cx + 3, cx + 8, glow, 'cloth2');
      break;
    }
  }
  // 목걸이 (어른 여자, 사람마다)
  if (f && st === 'adult' && (h >>> 14) % 3 === 0 && (kind === 'tee' || kind === 'dress' || kind === 'sweater' || kind === 'cardigan'))
    for (let i = -3; i <= 3; i++) g.set(cx + i - (i < 0 ? 0 : 1), top + 2 + (Math.abs(i) < 2 ? 1 : 0), (h >>> 15) % 2 ? '#f0c848' : '#f8f4f8', 'cloth2');
}

function drawHat(g: Grid, B: Build, p: Person, maxW: number) {
  const { cx, faceTop, h, st, f, era } = B;
  const top = faceTop - 4;
  if (st !== 'adult' && st !== 'elder') {
    if (f && B.style !== 'baby') {
      // 머리핀·리본: 여자아이는 거의 늘
      g.stamp(cx - maxW - 1, faceTop - 1, ['R.R', 'RkR', 'R.R'], { R: B.accent, k: mix(B.accent, 0.6) }, 'acc');
      g.outs.acc = mix(B.accent, 0.4);
    }
    return;
  }
  const j = p.job;
  if (['chef', 'restaurant'].includes(j) && st === 'adult') {
    g.ellipse(cx, top - 1, 9, 5, '#fbfbf6', 'hat');
    for (let y = top + 2; y < faceTop + 1; y++) g.row(y, cx - 7, cx + 6, '#f0f0ea', 'hat');
    g.row(faceTop, cx - 7, cx + 6, '#dcdcd4', 'hat');
    g.outs.hat = '#8a8a80';
    return;
  }
  if (['police', 'coast_guard'].includes(j)) {
    for (let y = top; y < faceTop + 1; y++) g.row(y, cx - 10 + Math.max(0, top + 2 - y), cx + 9 - Math.max(0, top + 2 - y), '#2a3a6a', 'hat');
    g.row(faceTop + 1, cx - 11, cx + 10, '#1a2244', 'hat');
    g.stamp(cx - 1, top + 1, ['yy', 'yy'], { y: '#f0c848' }, 'hat');
    g.outs.hat = '#141a30';
    return;
  }
  if (j === 'farmer' && h % 2 === 0) {
    g.ellipse(cx, faceTop + 1, 17, 2.5, '#e8c870', 'hat');
    g.ellipse(cx, top + 1, 9, 4, '#e0c060', 'hat', (_x, y) => y <= faceTop);
    g.row(faceTop - 1, cx - 9, cx + 8, '#c83a3a', 'hat');
    g.outs.hat = '#8a6a28';
    return;
  }
  if (f && (h >>> 16) % 3 === 0 && st === 'adult') {
    // 머리핀
    g.stamp(cx + maxW - 3, faceTop, ['.P.', 'PpP', '.P.'], { P: B.accent, p: '#ffffff' }, 'acc');
  }
  if (era === 2 && (h >>> 17) % 4 === 0) {
    // 2040년대~: AR 헤어밴드
    for (let x = cx - maxW - 1; x <= cx + maxW; x++) {
      const y = faceTop - 1 - Math.round(Math.sqrt(Math.max(0, 1 - ((x + 0.5 - cx) / (maxW + 2)) ** 2)) * 4);
      g.set(x, y, '#5af0ff', 'acc');
    }
  }
}

// ───────────────────────── 16×16 꼬마 (가계도) ─────────────────────────

function paintTiny(p: Person, age: number, year: number): Grid {
  const B = plan(p, age, year);
  const { st, f, skin, hair, h } = B;
  const g = new Grid(16);
  g.outs = { hair: hair.out, hairB: hair.out, skin: skin.out, cloth: '#2a2230', acc: '#2a2230' };
  const kidish = st === 'baby' || st === 'child';
  const kind = pickCloth(p, st, h, B.era);
  let cloth = CLOTH[(h >>> 8) % CLOTH.length];
  if (kind === 'coat' || kind === 'chef') cloth = '#f4f4f0';
  if (kind === 'army') cloth = '#62703e';
  if (kind === 'police') cloth = '#2e3e6e';
  if (kind === 'suit') cloth = '#2e2e3e';
  if (kind === 'uniform') cloth = B.era === 0 ? '#222230' : '#2a3a5c';
  if (kind === 'overall') cloth = '#4a6aa0';
  if (kind === 'jersey') cloth = JOBS[p.job]?.color ?? cloth;
  if (kind === 'hanbok') cloth = f ? '#f4d860' : '#f0ece0';
  const CP = pal(cloth, 0.45);
  g.outs.cloth = CP.out;
  const cx = 8;
  const headTop = st === 'baby' ? 4 : kidish ? 3 : 2;
  // 몸
  const bodyTop = headTop + 9;
  for (let y = bodyTop; y < 16; y++) {
    const w = Math.min(st === 'baby' ? 3 : f ? 3 + (y > bodyTop + 1 ? 1 : 0) : 4, 2 + (y - bodyTop));
    for (let x = cx - w; x <= cx + w - 1; x++) g.set(x, y, x >= cx + w - 2 ? CP.sh : CP.base, 'cloth');
  }
  if (kind === 'suit') g.set(cx - 1, bodyTop, '#fbf8f0', 'cloth'), g.set(cx, bodyTop, '#fbf8f0', 'cloth'), g.set(cx, bodyTop + 1, '#c83848', 'cloth');
  if (kind === 'coat') g.set(cx - 1, bodyTop + 1, '#8ab0d8', 'cloth'), g.set(cx, bodyTop + 1, '#8ab0d8', 'cloth');
  if ((kind === 'dress' || kind === 'shirt') && f) g.set(cx - 1, bodyTop, B.accent, 'cloth'), g.set(cx, bodyTop, B.accent, 'cloth');
  // 긴 머리·양갈래 (뒤)
  const s = B.style;
  if (['long', 'hime', 'wavy', 'braid'].includes(s)) for (let y = headTop + 3; y <= headTop + 11; y++) g.row(y, cx - 6, cx + 5, y > headTop + 10 ? hair.sh : hair.base, 'hairB');
  if (s === 'bob' || s === 'perm') for (let y = headTop + 3; y <= headTop + 8; y++) g.row(y, cx - 6, cx + 5, hair.base, 'hairB');
  if (s === 'twin') for (let y = headTop + 2; y <= headTop + 9; y++) g.row(y, 0, 1, hair.base, 'hairB'), g.row(y, 14, 15, hair.base, 'hairB');
  if (s === 'pony') for (let y = headTop; y <= headTop + 7; y++) g.row(y, 13, 14, hair.base, 'hairB');
  // 얼굴
  const FR = st === 'baby' ? [3, 4, 5, 5, 5, 5, 4, 3] : [4, 5, 5, 5, 5, 5, 4, 3];
  const fTop = headTop + 2;
  FR.forEach((w, i) => g.row(fTop + i, cx - w, cx + w - 1, i >= FR.length - 1 ? skin.sh : skin.base, 'skin'));
  // 머리
  if (s !== 'bald' && s !== 'baby') {
    g.ellipse(cx, fTop + 2, 6.2, 4.6, hair.base, 'hair', (_x, y) => y <= fTop + 1);
    const bang = s === 'buzz' || s === 'slick' || s === 'mohawk' ? 0 : s === 'bowl' || s === 'hime' || s === 'twin' ? 2 : 1;
    for (let x = cx - 5; x <= cx + 4; x++) for (let y = fTop; y < fTop + bang + ((x + h) % 3 === 0 ? 1 : 0); y++) g.set(x, y, hair.base, 'hair');
    if (f) for (let y = fTop; y <= fTop + 5; y++) g.set(cx - 5, y, hair.base, 'hair'), g.set(cx + 4, y, hair.base, 'hair');
    if (s === 'spiky' || s === 'messy') g.set(cx - 3, fTop - 3, hair.base, 'hair'), g.set(cx + 2, fTop - 3, hair.base, 'hair');
    if (s === 'bun') g.ellipse(cx, fTop - 3, 2.2, 1.6, hair.base, 'hair');
    // 윤기
    g.set(cx - 3, fTop - 1, hair.hi, 'hair'), g.set(cx - 2, fTop - 1, hair.hi, 'hair');
    for (let x = cx - 6; x <= cx + 5; x++) for (let y = fTop - 3; y <= fTop + 7; y++) if (g.get(x, y) === 'hair' && g.get(x, y + 1) === 'skin') g.set(x, y, hair.sh, 'hair');
  } else if (s === 'baby') g.set(cx, fTop - 1, hair.base, 'hair'), g.set(cx + 1, fTop - 2, hair.base, 'hair');
  else g.set(cx - 5, fTop + 2, hair.base, 'hair'), g.set(cx + 4, fTop + 2, hair.base, 'hair');
  // 눈·볼·입
  const ey = fTop + (st === 'baby' ? 3 : 3);
  const EK = LASH;
  g.set(cx - 3, ey, EK, 'eye'), g.set(cx - 3, ey + 1, EK, 'eye'), g.set(cx + 2, ey, EK, 'eye'), g.set(cx + 2, ey + 1, EK, 'eye');
  if (!kidish && st !== 'elder') g.set(cx - 3, ey, B.eye === EYE[2] ? EK : mix(B.eye, 0.7), 'eye'), g.set(cx + 2, ey, B.eye === EYE[2] ? EK : mix(B.eye, 0.7), 'eye');
  if (f && !kidish) g.set(cx - 4, ey, EK, 'eye'), g.set(cx + 3, ey, EK, 'eye');
  if (f || kidish) g.set(cx - 4, ey + 2, BLUSH, 'skin'), g.set(cx + 3, ey + 2, BLUSH, 'skin');
  g.set(cx - 1, ey + 3, f && !kidish ? '#d8586e' : mix(skin.out, 1.3), 'skin');
  g.set(cx, ey + 3, f && !kidish ? '#d8586e' : mix(skin.out, 1.3), 'skin');
  if (p.genes.mark === 1 && st !== 'baby') for (const x of [cx - 4, cx - 2, cx + 1, cx + 3]) g.set(x, ey, '#3a3444', 'acc');
  if (f && st !== 'elder' && st !== 'baby') g.set(cx - 5, fTop - 1, B.accent, 'acc'), g.set(cx - 6, fTop - 1, B.accent, 'acc'), g.set(cx - 5, fTop - 2, B.accent, 'acc');
  g.outline();
  return g;
}

// ───────────────────────── 내보내기 ─────────────────────────

function toURL(gr: Grid): string {
  const c = document.createElement('canvas');
  c.width = c.height = gr.n;
  const ctx = c.getContext('2d')!;
  gr.c.forEach((r, y) =>
    r.forEach((col, x) => {
      if (col) {
        ctx.fillStyle = col;
        ctx.fillRect(x, y, 1, 1);
      }
    }),
  );
  return c.toDataURL();
}

/** 도트 확대 Scale2x(EPX): 칸을 넷으로 나누며 대각선 계단을 둥글게 다듬는다. 두 번 돌리면 48 → 192 */
function scale2x(src: Px[][]): Px[][] {
  const n = src.length;
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= n || y >= n ? null : src[y][x]);
  const out: Px[][] = Array.from({ length: n * 2 }, () => Array(n * 2).fill(null));
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const P = src[y][x], A = at(x, y - 1), B = at(x + 1, y), C = at(x - 1, y), D = at(x, y + 1);
      let e0 = P, e1 = P, e2 = P, e3 = P;
      if (C === A && C !== D && A !== B) e0 = A;
      if (A === B && A !== C && B !== D) e1 = B;
      if (D === C && D !== B && C !== A) e2 = C;
      if (B === D && B !== A && D !== C) e3 = D;
      out[y * 2][x * 2] = e0;
      out[y * 2][x * 2 + 1] = e1;
      out[y * 2 + 1][x * 2] = e2;
      out[y * 2 + 1][x * 2 + 1] = e3;
    }
  return out;
}
function rowsURL(rows: Px[][]): string {
  const c = document.createElement('canvas');
  c.width = c.height = rows.length;
  const ctx = c.getContext('2d')!;
  rows.forEach((r, y) => r.forEach((col, x) => col && ((ctx.fillStyle = col), ctx.fillRect(x, y, 1, 1))));
  return c.toDataURL();
}

const cache = new Map<string, string>();
const keyOf = (p: Person, age: number, year: number) => `${p.id}:${stageOf(age)}:${p.job}:${eraOf(year)}:${p.sex}:${stageOf(age) === 'adult' && age >= 50 ? 'o' : ''}`;

/** 인물 창 초상화 (48×48) */
export function bustURL(p: Person, age: number, year: number, face: Face = 'normal', blink = false): string {
  const key = keyOf(p, age, year) + face + (blink ? 'b' : '');
  let u = cache.get(key);
  if (!u) cache.set(key, (u = toURL(paint(p, age, year, face, blink))));
  return u;
}

/** 인물 창 큰 초상화: 같은 그림을 Scale2x 두 번(192×192)으로 매끈하게 */
export function bustHiURL(p: Person, age: number, year: number, face: Face = 'normal', blink = false): string {
  const key = 'hi' + keyOf(p, age, year) + face + (blink ? 'b' : '');
  let u = cache.get(key);
  if (!u) cache.set(key, (u = rowsURL(scale2x(scale2x(paint(p, age, year, face, blink).c)))));
  return u;
}

/** 사건 그림에 합성할 초상화 격자 */
export function bustGrid(p: Person, age: number, year: number, face: Face, blink = false): Px[][] {
  return paint(p, age, year, face, blink).c;
}

/** 가계도용 16×16 꼬마 */
export function bustSmallURL(p: Person, age: number, year: number): string {
  const key = 't' + keyOf(p, age, year);
  let u = cache.get(key);
  if (!u) cache.set(key, (u = toURL(paintTiny(p, age, year))));
  return u;
}

/** 장면 그림용 색 — 초상화와 같은 머리·피부·옷 색 */
export function bustColors(p: Person, age: number, year: number): { hair: string; skin: string; cloth: string } {
  const B = plan(p, age, year);
  return { hair: B.hair.base, skin: B.skin.base, cloth: CLOTH[(B.h >>> 8) % CLOTH.length] };
}
