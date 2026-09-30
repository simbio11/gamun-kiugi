// 명예의 전당 카드 도트 아트 (96×132, 실제 트레이딩 카드 63×88mm 비율).
// 참고한 문법: 발라트로·포켓몬 일러스트 레어의 "그림이 꽉 찬" 구도, 하스스톤 전설 카드의 왕관 장식,
// 도트 게임들의 순서 디더링(Bayer) 그라데이션 · 선택적 외곽선(sel-out) · 림 라이트.
// - 반투명 섞기 대신 디더링으로만 명암을 넣어 픽셀이 또렷하다
// - 이모지 아이콘은 크게 그린 뒤 줄이고, 색을 k-평균으로 몇 개로 묶어 도트 문장으로 다시 찍는다
// - 등급별 액자: 전설(금·루비·왕관) / 영웅(자수정·청록 보석) / 희귀(사파이어·금 보석) / 일반(강철)
// 시너지는 32×36 방패 문장.

import type { Rarity } from '../core/rewards';

export const CW = 96;
export const CH = 132;
type RGB = [number, number, number];
type Img = { w: number; h: number; d: Uint8ClampedArray };
type Box = [number, number, number, number];
type Col = RGB | string;

const cache = new Map<string, string>();

function hash(s: string): number {
  let x = 2166136261;
  for (const ch of s) x = Math.imul(x ^ ch.charCodeAt(0), 16777619);
  return x >>> 0;
}
function rng(seed: number) {
  let s = seed || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 10000) / 10000;
  };
}
const hex = (c: string): RGB => {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const col = (c: Col): RGB => (typeof c === 'string' ? hex(c) : c);
const mix = (a: RGB, b: RGB, t: number): RGB => [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t)) as RGB;
const BLACK: RGB = [0, 0, 0];
const WHITE: RGB = [255, 255, 255];

function img(w: number, h: number): Img {
  return { w, h, d: new Uint8ClampedArray(w * h * 4) };
}
function put(m: Img, x: number, y: number, c: RGB) {
  x = Math.floor(x);
  y = Math.floor(y);
  if (x < 0 || y < 0 || x >= m.w || y >= m.h) return;
  const i = (y * m.w + x) * 4;
  m.d[i] = c[0];
  m.d[i + 1] = c[1];
  m.d[i + 2] = c[2];
  m.d[i + 3] = 255;
}
function get(m: Img, x: number, y: number): RGB {
  const i = (y * m.w + x) * 4;
  return [m.d[i], m.d[i + 1], m.d[i + 2]];
}
function rect(m: Img, x0: number, y0: number, x1: number, y1: number, c: RGB) {
  for (let y = Math.floor(y0); y <= y1; y++) for (let x = Math.floor(x0); x <= x1; x++) put(m, x, y, c);
}
function toURL(m: Img): string {
  const c = document.createElement('canvas');
  c.width = m.w;
  c.height = m.h;
  const ctx = c.getContext('2d')!;
  const id = ctx.createImageData(m.w, m.h);
  id.data.set(m.d);
  ctx.putImageData(id, 0, 0);
  return c.toDataURL();
}

// ───────────────────────── 디더링 도구 ─────────────────────────

const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
/** 4×4 Bayer 문턱값 (0~1) */
const bay = (x: number, y: number) => (B4[((y & 3) << 2) | (x & 3)] + 0.5) / 16;
const dith = (x: number, y: number, t: number) => t > bay(Math.floor(x), Math.floor(y));

/** 색 계단을 따라 디더링: t=0 → 첫 색, t=1 → 끝 색 */
function ramp(stops: RGB[], t: number, x: number, y: number): RGB {
  const f = Math.max(0, Math.min(1, t)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(f));
  return dith(x, y, f - i) ? stops[i + 1] : stops[i];
}
function dgrad(m: Img, b: Box, stops: string[]) {
  const s = stops.map(hex);
  for (let y = b[1]; y <= b[3]; y++) for (let x = b[0]; x <= b[2]; x++) put(m, x, y, ramp(s, (y - b[1]) / Math.max(1, b[3] - b[1]), x, y));
}
/** 방사형 빛: 가운데일수록 촘촘한 디더 점 */
function dglow(m: Img, b: Box, cx: number, cy: number, r: number, c: Col, k = 1) {
  const cc = col(c);
  for (let y = b[1]; y <= b[3]; y++)
    for (let x = b[0]; x <= b[2]; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / r;
      if (d < 1 && dith(x, y, (1 - d) * k)) put(m, x, y, cc);
    }
}
/** 여러 겹 빛 (바깥은 넓고 옅게, 안은 좁고 밝게) */
function halo(m: Img, b: Box, cx: number, cy: number, r: number, cols: Col[], k = 1) {
  cols.forEach((c, i) => dglow(m, b, cx, cy, r * (1 - i / (cols.length + 0.6)), c, k * (0.75 + i * 0.12)));
}
/** 방사형 햇살 */
function rays(m: Img, b: Box, cx: number, cy: number, c: Col, n: number, k = 0.7, reach = 60) {
  const cc = col(c);
  for (let y = b[1]; y <= b[3]; y++)
    for (let x = b[0]; x <= b[2]; x++) {
      const ang = Math.atan2(y + 0.5 - cy, x + 0.5 - cx);
      const u = (((ang + Math.PI) / (2 * Math.PI)) * n) % 1;
      if (u > 0.42) continue;
      const d = Math.hypot(x - cx, y - cy);
      const edge = 1 - Math.abs(u - 0.21) / 0.21;
      if (dith(x, y, k * Math.min(1, edge * 1.6) * Math.max(0, 1 - d / reach))) put(m, x, y, cc);
    }
}
/** 반짝이 (십자 별) */
function sparkle(m: Img, x: number, y: number, c: RGB, len: number) {
  put(m, x, y, WHITE);
  for (let i = 1; i <= len; i++) {
    const cc = i === len ? mix(c, BLACK, 0.2) : c;
    put(m, x + i, y, cc);
    put(m, x - i, y, cc);
    put(m, x, y + i, cc);
    put(m, x, y - i, cc);
  }
}
/** 가장자리를 디더로 어둡게 (그림창 깊이감) */
function vignette(m: Img, b: Box, w: number, k = 0.8) {
  for (let y = b[1]; y <= b[3]; y++)
    for (let x = b[0]; x <= b[2]; x++) {
      const e = Math.min(x - b[0], y - b[1], b[2] - x, b[3] - y);
      if (e < w && dith(x, y, (1 - e / w) * k)) put(m, x, y, mix(get(m, x, y), [10, 6, 16], 0.55));
    }
}
/** 문자열 스프라이트. 팔레트에 없는 글자('.')는 건너뛴다 */
function sprite(m: Img, rows: string[], x0: number, y0: number, pal: Record<string, RGB>, flip = false) {
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const c = pal[row[x]];
      if (c) put(m, x0 + (flip ? row.length - 1 - x : x), y0 + y, c);
    }
  });
}

// ───────────────────────── 문장: 이모지를 도트 문장으로 ─────────────────────────

const emblemCache = new Map<string, (RGB | null)[][]>();

/** 아이콘을 4배 크기로 그린 뒤 n×n으로 평균 → 색을 k개로 묶고 → 외톨이 점 정리 */
function emblem(icon: string, n: number): (RGB | null)[][] {
  const key = icon + n;
  const hit = emblemCache.get(key);
  if (hit) return hit;
  const S = n * 4;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const ctx = cv.getContext('2d')!;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${Math.round(S * 0.84)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
  ctx.fillText(icon, S / 2, S / 2 + S * 0.05);
  const d = ctx.getImageData(0, 0, S, S).data;
  const px: (RGB | null)[][] = [];
  for (let y = 0; y < n; y++) {
    px.push([]);
    for (let x = 0; x < n; x++) {
      let a = 0;
      let r = 0;
      let g = 0;
      let b = 0;
      for (let v = 0; v < 4; v++)
        for (let u = 0; u < 4; u++) {
          const i = ((y * 4 + v) * S + x * 4 + u) * 4;
          const al = d[i + 3];
          a += al;
          r += d[i] * al;
          g += d[i + 1] * al;
          b += d[i + 2] * al;
        }
      px[y].push(a / 16 > 120 ? [r / a, g / a, b / a] : null);
    }
  }
  // k-평균으로 색 줄이기
  const all = px.flat().filter((c): c is RGB => !!c);
  if (!all.length) {
    const empty = px.map((row) => row.map(() => null));
    emblemCache.set(key, empty);
    return empty;
  }
  const lum = (c: RGB) => c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11;
  const K = Math.min(8, all.length);
  const dist = (a: RGB, b: RGB) => (a[0] - b[0]) ** 2 * 0.3 + (a[1] - b[1]) ** 2 * 0.59 + (a[2] - b[2]) ** 2 * 0.11;
  // 먼 점부터 뽑는 초기값: 작은 면적의 검정·빨강 같은 뚜렷한 색도 살아남는다
  const sorted = [...all].sort((a, b) => lum(a) - lum(b));
  let cent: RGB[] = [sorted[Math.floor(sorted.length / 2)]];
  while (cent.length < K) {
    let best = all[0];
    let bd = -1;
    for (const c of all) {
      const dd = Math.min(...cent.map((k) => dist(c, k)));
      if (dd > bd) {
        bd = dd;
        best = c;
      }
    }
    if (bd < 60) break;
    cent.push(best);
  }
  const near = (c: RGB) => {
    let bi = 0;
    let bd = Infinity;
    cent.forEach((k, i) => {
      const dd = dist(c, k);
      if (dd < bd) {
        bd = dd;
        bi = i;
      }
    });
    return bi;
  };
  for (let it = 0; it < 8; it++) {
    const acc = cent.map(() => [0, 0, 0, 0]);
    for (const c of all) {
      const a = acc[near(c)];
      a[0] += c[0];
      a[1] += c[1];
      a[2] += c[2];
      a[3]++;
    }
    cent = cent.map((k, i) => (acc[i][3] ? ([acc[i][0] / acc[i][3], acc[i][1] / acc[i][3], acc[i][2] / acc[i][3]] as RGB) : k));
  }
  // 채도·대비를 조금 올려 도트답게
  const pop = (c: RGB): RGB => {
    const l = lum(c);
    return c.map((v) => Math.max(0, Math.min(255, Math.round(l + (v - l) * 1.18 + (v - 128) * 0.08)))) as RGB;
  };
  const pal = cent.map(pop);
  const idx: number[][] = px.map((row) => row.map((c) => (c ? near(c) : -1)));
  // 외톨이 점: 같은 색 이웃이 없으면 가장 흔한 이웃 색으로
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const k = idx[y][x];
      if (k < 0) continue;
      const cnt = new Map<number, number>();
      let same = 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const v = idx[y + dy]?.[x + dx] ?? -1;
        if (v === k) same++;
        if (v >= 0) cnt.set(v, (cnt.get(v) ?? 0) + 1);
      }
      if (!same && cnt.size) idx[y][x] = [...cnt.entries()].sort((a, b) => b[1] - a[1])[0][0];
    }
  // 한 칸짜리 구멍 메우기
  for (let y = 1; y < n - 1; y++)
    for (let x = 1; x < n - 1; x++)
      if (idx[y][x] < 0) {
        const nb = [idx[y - 1][x], idx[y + 1][x], idx[y][x - 1], idx[y][x + 1]].filter((v) => v >= 0);
        if (nb.length >= 3) idx[y][x] = nb[0];
      }
  const out = idx.map((row) => row.map((k) => (k >= 0 ? pal[k] : null)));
  emblemCache.set(key, out);
  return out;
}

/**
 * 문장을 s배로 찍는다: 그림자 → 바깥 오라(디더) → 선택적 외곽선 → 림 라이트/그늘
 * rim: 장면 빛 색, aura: 등급 빛 색, sil: 실루엣 색(잠김)
 */
function stamp(m: Img, icon: string, cx: number, cy: number, n: number, s: number, o: { rim?: RGB; aura?: RGB; sil?: RGB } = {}) {
  const e = emblem(icon, n);
  const x0 = Math.round(cx - (n * s) / 2);
  const y0 = Math.round(cy - (n * s) / 2);
  const on = (x: number, y: number) => x >= 0 && y >= 0 && x < n && y < n && !!e[y][x];
  const cell = (x: number, y: number, c: RGB) => rect(m, x0 + x * s, y0 + y * s, x0 + x * s + s - 1, y0 + y * s + s - 1, c);
  const OUT: RGB = [20, 12, 24];
  const inPic = (X: number, Y: number) => X >= 0 && Y >= 0 && X < m.w && Y < m.h;
  // 그림자 (오른쪽 아래로 체크무늬)
  for (let y = 0; y <= n + 1; y++)
    for (let x = 0; x <= n + 1; x++) {
      if (!on(x - 1, y - 1) && !on(x - 2, y - 1)) continue;
      for (let v = 0; v < s; v++)
        for (let u = 0; u < s; u++) {
          const X = x0 + x * s + u;
          const Y = y0 + y * s + v;
          if (inPic(X, Y) && (X + Y) % 2 === 0) put(m, X, Y, mix(get(m, X, Y), BLACK, 0.6));
        }
    }
  // 오라: 외곽선 바깥 1~2칸에 디더 빛
  if (o.aura && !o.sil)
    for (let y = -3; y < n + 3; y++)
      for (let x = -3; x < n + 3; x++) {
        if (on(x, y)) continue;
        let nd = 9;
        for (let v = -3; v <= 3; v++) for (let u = -3; u <= 3; u++) if (on(x + u, y + v)) nd = Math.min(nd, Math.abs(u) + Math.abs(v));
        if (nd === 2 || nd === 3)
          for (let v = 0; v < s; v++)
            for (let u = 0; u < s; u++) {
              const X = x0 + x * s + u;
              const Y = y0 + y * s + v;
              if (inPic(X, Y) && dith(X, Y, nd === 2 ? 0.6 : 0.25)) put(m, X, Y, o.aura);
            }
      }
  // 선택적 외곽선: 위·왼쪽은 이웃 색의 어두운 톤, 아래·오른쪽은 거의 검정
  for (let y = -1; y <= n; y++)
    for (let x = -1; x <= n; x++) {
      if (on(x, y)) continue;
      const nb: [number, number][] = [[x, y + 1], [x + 1, y], [x, y - 1], [x - 1, y]];
      const hit = nb.find(([a, b]) => on(a, b));
      if (!hit) continue;
      const lower = on(x, y - 1) || on(x - 1, y);
      cell(x, y, o.sil || lower ? OUT : mix(e[hit[1]][hit[0]]!, OUT, 0.72));
    }
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const c = e[y][x];
      if (!c) continue;
      const top = !on(x, y - 1) || !on(x - 1, y);
      const bot = !on(x, y + 1) || !on(x + 1, y);
      if (o.sil) {
        cell(x, y, top ? mix(o.sil, WHITE, 0.14) : o.sil);
        continue;
      }
      let cc: RGB = c;
      if (top) cc = mix(cc, o.rim ?? [255, 248, 225], 0.38);
      else if (bot) cc = mix(cc, [24, 14, 40], 0.3);
      cell(x, y, cc);
    }
}

// ───────────────────────── 테마 장면 ─────────────────────────

export type Theme = 'power' | 'law' | 'military' | 'diplo' | 'money' | 'science' | 'space' | 'tech' | 'medical' | 'stage' | 'screen' | 'music' | 'sports' | 'craft' | 'service' | 'hero' | 'faith' | 'nature' | 'family' | 'press';

/** 장면별 문장 테두리 빛(림 라이트) */
const RIM: Record<Theme, string> = {
  power: '#ffe89a', law: '#ffd9a0', military: '#fff0a8', diplo: '#c8ecff', money: '#ffe27a', science: '#aeefff', space: '#e0c8ff', tech: '#9affe0',
  medical: '#d8fff0', stage: '#fff0b8', screen: '#fff0b8', music: '#c8f0ff', sports: '#fffbe0', craft: '#ffc27a', service: '#ffd9a0', hero: '#fff0a0',
  faith: '#fff4d0', nature: '#fffbe0', family: '#fff0c8', press: '#ffffff',
};

/** 대리석 기둥 */
function column(m: Img, x: number, top: number, bot: number, w = 5) {
  const L = hex('#f4ecd8');
  const M = hex('#cfc4a8');
  const D = hex('#8a7e66');
  rect(m, x - 1, top, x + w, top + 1, L);
  rect(m, x - 1, top + 2, x + w, top + 2, D);
  for (let y = top + 3; y <= bot - 3; y++) for (let i = 0; i < w; i++) put(m, x + i, y, i === 0 ? L : i === w - 1 ? D : i % 2 ? M : mix(L, M, 0.5));
  rect(m, x - 1, bot - 2, x + w, bot - 2, L);
  rect(m, x - 1, bot - 1, x + w, bot, D);
}

function scene(m: Img, th: Theme, seed: number, b: Box) {
  const r = rng(seed);
  const [x0, y0, x1, y1] = b;
  const W = x1 - x0;
  const H = y1 - y0;
  const cx = x0 + W / 2;
  const cy = y0 + H * 0.48;
  const stars = (n: number, cols: string[], maxY = 0.75) => {
    for (let i = 0; i < n; i++) {
      const x = x0 + Math.floor(r() * W);
      const y = y0 + Math.floor(r() * H * maxY);
      const c = hex(cols[Math.floor(r() * cols.length)]);
      if (r() < 0.12) sparkle(m, x, y, c, 1);
      else put(m, x, y, c);
    }
  };
  switch (th) {
    case 'power': {
      dgrad(m, b, ['#070a26', '#141a52', '#2c2478', '#4a2a86']);
      rays(m, b, cx, cy, '#3a3490', 16, 0.9, 70);
      halo(m, b, cx, cy, 40, ['#5a3a8a', '#b07a3a', '#ffcc4a', '#fff0a8']);
      stars(14, ['#fff0b0', '#ffffff'], 0.35);
      for (const px of [x0 + 2, x0 + 11, x1 - 16, x1 - 7]) column(m, px, y1 - 30, y1 - 5);
      for (let i = 0; i < 5; i++) {
        const yy = y1 - 4 + i;
        const hw = 10 + i * 3;
        rect(m, cx - hw, yy, cx + hw, yy, hex(i % 2 ? '#8a1020' : '#c01c30'));
        put(m, cx - hw, yy, hex('#ffd24a'));
        put(m, cx + hw, yy, hex('#ffd24a'));
      }
      rect(m, x0, y1 - 4, cx - 11, y1, hex('#d8ccb0'));
      rect(m, cx + 11, y1 - 4, x1, y1, hex('#d8ccb0'));
      for (let x = x0; x <= x1; x += 4) put(m, x, y1 - 4, hex('#f4ecd8'));
      break;
    }
    case 'law': {
      dgrad(m, b, ['#12030a', '#3a0a16', '#5e1422', '#7a2230']);
      rays(m, b, cx, y0 - 4, '#8a3a36', 10, 0.8, 90);
      halo(m, b, cx, cy, 34, ['#8a4a3a', '#d8a060', '#ffe0a0']);
      for (let i = 0; i <= 10; i++) {
        const yy = y0 + 2 + i;
        rect(m, cx - i * 4 - 2, yy, cx + i * 4 + 2, yy, i === 10 ? hex('#8a7e66') : i % 2 ? hex('#e8dcc0') : hex('#d4c8aa'));
        put(m, cx - i * 4 - 2, yy, hex('#fff6e0'));
      }
      put(m, cx, y0 + 7, hex('#ffd24a'));
      for (let x = x0 + 3; x < x1 - 3; x += 12) column(m, x, y0 + 14, y1 - 4, 5);
      rect(m, x0, y1 - 3, x1, y1, hex('#e8dcc0'));
      for (let x = x0; x <= x1; x += 2) put(m, x, y1 - 1, hex('#b8ac90'));
      break;
    }
    case 'military': {
      dgrad(m, b, ['#0c1008', '#1e2612', '#34401c', '#4a5626']);
      for (let i = 0; i < 26; i++) {
        const bx = x0 + r() * W;
        const by = y0 + r() * H;
        const rr = 3 + r() * 5;
        const c = hex(r() < 0.5 ? '#2a3416' : '#56622c');
        for (let y = -rr; y <= rr; y++)
          for (let x = -rr * 1.4; x <= rr * 1.4; x++) if ((x / 1.4) ** 2 + y * y < rr * rr && bx + x >= x0 && bx + x <= x1 && by + y >= y0 && by + y <= y1) put(m, bx + x, by + y, c);
      }
      for (const [sx, dir] of [[x0 + 4, 1], [x1 - 4, -1]] as [number, number][])
        for (let y = y0; y <= y1; y++) {
          const t = (y1 - y) / H;
          const bx = sx + dir * t * W * 0.8;
          const hw = 2 + t * 8;
          for (let x = Math.floor(bx - hw); x <= bx + hw; x++) if (x >= x0 && x <= x1 && dith(x, y, 0.55 - (Math.abs(x - bx) / hw) * 0.4)) put(m, x, y, hex('#e8e0a0'));
        }
      halo(m, b, cx, cy, 30, ['#6a6a30', '#c8b860', '#fff0a8'], 0.9);
      const star = ['..#..', '.###.', '#####', '.###.', '.#.#.'];
      for (let i = 0; i < 4; i++) sprite(m, star, x0 + 12 + i * 16, y0 + 3, { '#': hex('#ffe060') });
      rect(m, x0, y1 - 5, x1, y1, hex('#3a3018'));
      for (let x = x0; x <= x1; x += 5) rect(m, x, y1 - 6, x + 3, y1 - 5, hex('#6a5a30'));
      break;
    }
    case 'diplo': {
      dgrad(m, b, ['#04101e', '#0a2848', '#14487a', '#2a6aa0']);
      halo(m, b, cx, cy, 38, ['#1e5a90', '#4a9ad0', '#a8e0ff']);
      const RR = 30;
      for (let a = 0; a < Math.PI * 2; a += 0.02) {
        put(m, cx + Math.cos(a) * RR, cy + Math.sin(a) * RR, hex('#bfe6ff'));
        for (const k of [0.35, 0.72]) put(m, cx + Math.cos(a) * RR * k, cy + Math.sin(a) * RR, hex('#6ab0e0'));
      }
      for (const k of [-0.5, 0, 0.5]) {
        const hw = RR * Math.sqrt(1 - k * k);
        for (let x = -hw; x <= hw; x++) put(m, cx + x, cy + k * RR, hex('#6ab0e0'));
      }
      for (const s of [-1, 1])
        for (let i = 0; i < 10; i++) {
          const a = Math.PI / 2 + s * (0.3 + i * 0.13);
          const lx = cx + Math.cos(a) * (RR + 5);
          const ly = cy + Math.sin(a) * (RR + 3);
          rect(m, lx - 1, ly, lx + 1, ly + 1, hex('#5aa04a'));
          put(m, lx - s, ly - 1, hex('#a8e07a'));
        }
      stars(12, ['#ffffff', '#bfe6ff'], 0.3);
      break;
    }
    case 'money': {
      dgrad(m, b, ['#03040c', '#0e0c26', '#221a48', '#3e2458']);
      halo(m, b, cx, cy - 4, 36, ['#4a2a4a', '#a0602a', '#ffc23a', '#fff0a0']);
      stars(16, ['#fff6c0', '#ffffff'], 0.4);
      for (let x = x0; x <= x1; ) {
        const w = 5 + Math.floor(r() * 6);
        const h = 16 + Math.floor(r() * (H * 0.45));
        const tall = r() < 0.25;
        const top = y1 - h - (tall ? 8 : 0);
        rect(m, x, top, x + w - 1, y1, hex('#100e24'));
        rect(m, x + w - 1, top, x + w - 1, y1, hex('#1e1a3a'));
        if (tall) put(m, x + Math.floor(w / 2), top - 3, hex('#ff3a3a'));
        for (let wy = top + 2; wy < y1 - 1; wy += 3) for (let wx = x + 1; wx < x + w - 1; wx += 2) if (r() < 0.5) put(m, wx, wy, hex(r() < 0.75 ? '#ffd25a' : '#9fe0ff'));
        x += w + 1;
      }
      for (let i = 0; i < 7; i++) sprite(m, ['.##.', '#yh#', '#yy#', '.##.'], x0 + 4 + r() * (W - 8), y0 + 6 + r() * H * 0.5, { '#': hex('#8a5200'), y: hex('#ffc830'), h: hex('#fff4b0') });
      break;
    }
    case 'science':
    case 'tech': {
      const tech = th === 'tech';
      dgrad(m, b, tech ? ['#010806', '#04201c', '#0a3a32', '#105046'] : ['#02061a', '#081a40', '#10305e', '#1a4a80']);
      const c = hex(tech ? '#2affc0' : '#6ad4ff');
      const cd = mix(c, BLACK, 0.55);
      if (tech) {
        for (let i = 0; i < 40; i++) put(m, x0 + r() * W, y0 + r() * H, hex(r() < 0.5 ? '#0e6a54' : '#1a8a6a'));
        for (let i = 0; i < 12; i++) {
          let x = x0 + Math.floor(r() * W);
          let y = y0 + Math.floor(r() * H);
          let dir = r() < 0.5 ? 0 : 1;
          for (let k = 0; k < 26 && x <= x1 && y <= y1; k++) {
            put(m, x, y, cd);
            if (r() < 0.12) dir = 1 - dir;
            if (dir) x += 1;
            else y += 1;
          }
          rect(m, x - 1, y - 1, x + 1, y + 1, c);
          put(m, x, y, WHITE);
        }
      } else {
        for (let y = y0; y <= y1; y++)
          for (let x = x0; x <= x1; x++) {
            const q = (x - x0 + (Math.floor((y - y0) / 7) % 2) * 4) % 8;
            if ((y - y0) % 7 === 0 && q < 4) put(m, x, y, hex('#163e6a'));
            if ((q === 0 || q === 4) && (y - y0) % 7 !== 0 && dith(x, y, 0.5)) put(m, x, y, hex('#163e6a'));
          }
      }
      halo(m, b, cx, cy, 36, tech ? ['#0a5a4a', '#1ab08a', '#8affe0'] : ['#1a4a8a', '#3a90d0', '#bff0ff']);
      if (!tech)
        for (let k = 0; k < 3; k++) {
          const rot = (k * Math.PI) / 3;
          for (let a = 0; a < Math.PI * 2; a += 0.015) {
            const ex = Math.cos(a) * 34;
            const ey = Math.sin(a) * 11;
            put(m, cx + ex * Math.cos(rot) - ey * Math.sin(rot), cy + ex * Math.sin(rot) + ey * Math.cos(rot), hex('#bfeeff'));
          }
        }
      break;
    }
    case 'space': {
      dgrad(m, b, ['#000004', '#05031a', '#120830', '#1e0c40']);
      halo(m, b, x0 + W * 0.28, y0 + H * 0.32, 30, ['#2a0e4a', '#5a1a7a', '#9a3ab0'], 0.9);
      halo(m, b, x0 + W * 0.72, y0 + H * 0.6, 26, ['#0e1e4a', '#1a4a9a', '#3a8ae0'], 0.9);
      stars(60, ['#ffffff', '#c8d8ff', '#ffe0f0'], 1);
      const px = x1 - 14;
      const py = y1 - 12;
      for (let y = -10; y <= 10; y++)
        for (let x = -10; x <= 10; x++) if (x * x + y * y <= 100) put(m, px + x, py + y, ramp([hex('#ffb070'), hex('#d0603a'), hex('#6a2a2a'), hex('#2a0e1a')], (x + y + 14) / 30, px + x, py + y));
      for (let a = 0; a < Math.PI * 2; a += 0.01) {
        const ex = Math.cos(a) * 17;
        const ey = Math.sin(a) * 4;
        const X = px + ex * 0.96 - ey * 0.28;
        const Y = py + ex * 0.28 + ey * 0.96;
        if (Math.sin(a) > 0 || (X - px) ** 2 + (Y - py) ** 2 > 100) put(m, X, Y, hex(Math.sin(a) > 0 ? '#ffe0b0' : '#b08a6a'));
      }
      for (let y = -4; y <= 4; y++) for (let x = -4; x <= 4; x++) if (x * x + y * y <= 16) put(m, x0 + 12 + x, y0 + 12 + y, ramp([hex('#f4f0e0'), hex('#a8a498'), hex('#4a4640')], (x + y + 8) / 16, x, y));
      break;
    }
    case 'medical': {
      dgrad(m, b, ['#021414', '#062a2a', '#0c4442', '#165e56']);
      for (let y = y0 + 4; y < y1; y += 10)
        for (let x = x0 + 4 + (Math.floor(y / 10) % 2) * 5; x < x1; x += 10) {
          rect(m, x - 1, y, x + 1, y, hex('#1f7a6a'));
          rect(m, x, y - 1, x, y + 1, hex('#1f7a6a'));
        }
      halo(m, b, cx, cy, 36, ['#1a6a60', '#5ac8b0', '#d8fff0']);
      const base = y1 - 10;
      let prev = base;
      for (let x = x0; x <= x1; x++) {
        const k = (x - x0) % 30;
        const yy = base + (k === 12 ? -14 : k === 13 ? 8 : k === 14 ? -4 : k === 10 || k === 16 ? -1 : 0);
        for (let t = Math.min(prev, yy); t <= Math.max(prev, yy); t++) put(m, x, t, hex('#aaffdd'));
        put(m, x, yy + 1, hex('#2a9a7a'));
        prev = yy;
      }
      break;
    }
    case 'stage':
    case 'screen':
    case 'music': {
      dgrad(m, b, ['#050104', '#12040a', '#200612', '#2e0a1a']);
      const beam = th === 'music' ? ['#3a2a6a', '#6a8ae0', '#c8f0ff'] : ['#5a3a2a', '#c8a060', '#fff4c0'];
      if (th === 'music')
        for (const [bx, bc] of [[cx - 26, '#ff4ac8'], [cx + 26, '#4ae0ff']] as [number, string][])
          for (let y = y0; y <= y1; y++) {
            const t = (y - y0) / H;
            const hw = 2 + t * 12;
            const mx = bx + (cx - bx) * t;
            for (let x = Math.floor(mx - hw); x <= mx + hw; x++) if (x >= x0 && x <= x1 && dith(x, y, 0.3)) put(m, x, y, hex(bc));
          }
      for (let y = y0 + 5; y <= y1; y++) {
        const t = (y - y0) / H;
        const hw = 6 + t * 24;
        for (let x = Math.floor(cx - hw); x <= cx + hw; x++)
          if (x >= x0 && x <= x1) {
            const e = 1 - Math.abs(x - cx) / hw;
            if (dith(x, y, 0.2 + e * 0.35)) put(m, x, y, hex(beam[e > 0.6 ? 2 : e > 0.3 ? 1 : 0]));
          }
      }
      halo(m, b, cx, cy, 26, [beam[1], beam[2]], 0.8);
      const folds = ['#5a0612', '#8a0e1e', '#b8182a', '#d8303e', '#b8182a', '#8a0e1e'];
      for (let y = y0; y <= y1; y++) {
        const w = Math.max(3, 16 - Math.floor(((y - y0) / H) ** 0.7 * 12));
        for (let i = 0; i <= w; i++) {
          put(m, x0 + i, y, hex(folds[i % folds.length]));
          put(m, x1 - i, y, hex(folds[i % folds.length]));
        }
        put(m, x0 + w + 1, y, hex('#3a020a'));
        put(m, x1 - w - 1, y, hex('#3a020a'));
      }
      rect(m, x0, y0, x1, y0 + 4, hex('#a01424'));
      for (let x = x0; x <= x1; x++) {
        put(m, x, y0 + 5, hex(x % 2 ? '#ffd25a' : '#b07a1a'));
        if (x % 3 === 0) put(m, x, y0 + 6, hex('#ffd25a'));
      }
      for (let x = x0; x <= x1; x += 6) put(m, x, y0 + 2, hex('#ffd25a'));
      for (let y = y1 - 5; y <= y1; y++) for (let x = x0; x <= x1; x++) put(m, x, y, hex((x + (y - y1) * 3) % 12 === 0 ? '#2a1408' : y === y1 - 5 ? '#8a5a2a' : '#5a3418'));
      if (th === 'screen')
        for (let x = x0; x <= x1; x += 5) {
          rect(m, x, y0 + 8, x + 2, y0 + 9, hex('#1a1016'));
          rect(m, x + 1, y1 - 3, x + 2, y1 - 2, hex('#1a1016'));
        }
      if (th === 'music') for (let i = 0; i < 5; i++) sprite(m, ['..##', '..#.', '..#.', '##..', '##..'], x0 + 18 + r() * (W - 36), y0 + 10 + r() * 30, { '#': hex(r() < 0.5 ? '#ffe0f8' : '#c8f8ff') });
      break;
    }
    case 'press': {
      dgrad(m, b, ['#0a0a0e', '#18181e', '#26262e', '#34343e']);
      rect(m, x0 + 3, y0 + 3, x1 - 3, y1 - 3, hex('#d8d2c4'));
      rect(m, x0 + 3, y0 + 3, x1 - 3, y0 + 10, hex('#1a1a1e'));
      for (let x = x0 + 6; x < x1 - 6; x += 3) rect(m, x, y0 + 5, x + 1, y0 + 8, hex('#e8e2d4'));
      for (let c = 0; c < 3; c++)
        for (let y = y0 + 14; y < y1 - 5; y += 3) {
          const cx0 = x0 + 5 + c * 28;
          const len = 20 + Math.floor(r() * 5);
          for (let x = cx0; x < cx0 + len && x < x1 - 4; x++) if (r() < 0.85) put(m, x, y, hex('#6a665e'));
        }
      halo(m, b, x1 - 6, y0 + 6, 60, ['#8a8a8a', '#e8e8e8', '#ffffff'], 0.55);
      rays(m, b, x1 - 6, y0 + 6, '#ffffff', 14, 0.5, 70);
      halo(m, b, cx, cy, 30, ['#a09a8a', '#fff8e0'], 0.7);
      break;
    }
    case 'sports': {
      dgrad(m, b, ['#030820', '#0a1644', '#142a66', '#1e3a80']);
      for (let i = 0; i < 4; i++) {
        const lx = x0 + 8 + i * 22;
        for (let y = y0 + 6; y < y1 - 12; y++) {
          const t = (y - y0) / H;
          const bx = lx + (cx - lx) * t * 0.6;
          const hw = 1 + t * 6;
          for (let x = Math.floor(bx - hw); x <= bx + hw; x++) if (dith(x, y, 0.3 * (1 - t))) put(m, x, y, hex('#fffbe0'));
        }
        rect(m, lx - 3, y0 + 2, lx + 3, y0 + 5, hex('#3a3a4a'));
        for (let k = -2; k <= 2; k += 2) put(m, lx + k, y0 + 3, WHITE);
      }
      for (let y = y1 - 22; y < y1 - 11; y++) for (let x = x0; x <= x1; x++) put(m, x, y, (x + y) % 2 ? hex('#141c3a') : hex(['#c04040', '#4060c0', '#e0c040', '#e0e0e0', '#40a060'][Math.floor(r() * 5)]));
      rect(m, x0, y1 - 11, x1, y1 - 11, hex('#8a8a9a'));
      for (let y = y1 - 10; y <= y1; y++) for (let x = x0; x <= x1; x++) put(m, x, y, hex(Math.floor((x - x0) / 7) % 2 ? '#2a8a3a' : '#35a045'));
      halo(m, b, cx, cy, 30, ['#3a5aa0', '#a0c0ff', '#ffffff'], 0.8);
      break;
    }
    case 'craft': {
      dgrad(m, b, ['#040202', '#140806', '#2a0e06', '#3e1608']);
      halo(m, b, cx, y1 + 6, 60, ['#4a1606', '#a03a0a', '#ff7a1a', '#ffd04a'], 0.95);
      for (let i = 0; i < 45; i++) {
        const sx = cx + (r() - 0.5) * W;
        const sy = y1 - r() * H;
        const c = hex(r() < 0.5 ? '#ffd24a' : '#ff7a2a');
        put(m, sx, sy, c);
        if (r() < 0.5) put(m, sx + (sx > cx ? 1 : -1), sy + 1, mix(c, BLACK, 0.5));
      }
      sprite(m, ['############', '.##########.', '....####....', '...######...', '..########..'], cx - 6, y1 - 4, { '#': hex('#1a1a20') });
      rect(m, cx - 6, y1 - 4, cx + 5, y1 - 4, hex('#6a6a78'));
      break;
    }
    case 'service': {
      dgrad(m, b, ['#0e0402', '#2a0e06', '#48200e', '#5e2e16']);
      halo(m, b, cx, cy, 36, ['#5a2a10', '#c06a2a', '#ffc070']);
      for (let x = x0; x <= x1; x++) put(m, x, y0 + 6 + Math.round(Math.sin(((x - x0) / W) * Math.PI) * 6), hex('#2a1a10'));
      for (let i = 0; i < 6; i++) {
        const lx = x0 + 5 + i * 15;
        const ly = y0 + 5 + Math.round(Math.sin(((lx + 2 - x0) / W) * Math.PI) * 6);
        dglow(m, b, lx + 2, ly + 5, 9, '#ff9a3a', 0.5);
        sprite(m, ['.##.', 'rrrr', 'ryyr', 'ryyr', 'rrrr', '.##.'], lx, ly + 1, { '#': hex('#2a1a10'), r: hex('#e0302a'), y: hex('#ffd07a') });
      }
      rect(m, x0, y1 - 7, x1, y1, hex('#6a3a1e'));
      rect(m, x0, y1 - 7, x1, y1 - 7, hex('#b0763a'));
      for (let x = x0; x <= x1; x += 9) rect(m, x, y1 - 6, x, y1, hex('#4a2410'));
      break;
    }
    case 'hero': {
      dgrad(m, b, ['#0a0000', '#2a0402', '#520c04', '#7a1a06']);
      halo(m, b, cx, cy, 40, ['#7a2006', '#d0601a', '#ffd060', '#fff4c0']);
      const fl = [hex('#fff4a0'), hex('#ffd040'), hex('#ff8a1a'), hex('#d02a0a'), hex('#6a0a02')];
      for (let x = x0; x <= x1; x++) {
        const h = 14 + Math.floor(r() * 10) + Math.round(Math.sin(x * 0.7) * 4);
        for (let y = y1; y > y1 - h; y--) put(m, x, y, ramp(fl, (y1 - y) / h, x, y));
      }
      for (let i = 0; i < 24; i++) put(m, x0 + r() * W, y0 + r() * H * 0.7, hex(r() < 0.5 ? '#ffd040' : '#ff6a1a'));
      break;
    }
    case 'faith': {
      dgrad(m, b, ['#05030e', '#110a24', '#1e1238', '#2a1a4a']);
      const glass = ['#d8303a', '#2a6ad8', '#e0b02a', '#2aa06a', '#8a3ad8', '#e06a2a'];
      const RR = 30;
      for (let y = -RR; y <= RR; y++)
        for (let x = -RR; x <= RR; x++) {
          const d = Math.hypot(x, y);
          if (d > RR) continue;
          const f = ((Math.atan2(y, x) + Math.PI) / (Math.PI * 2)) * 12;
          const seg = Math.floor(f);
          const ring = d < 10 ? 0 : d < 20 ? 1 : 2;
          const lead = Math.abs(d - 10) < 0.7 || Math.abs(d - 20) < 0.7 || d > RR - 1.2 || (ring > 0 && (f % 1) * d < 1.6);
          put(m, cx + x, cy + y, lead ? hex('#1a1420') : ramp([hex(glass[(seg + ring * 3) % glass.length]), hex('#fff4e0')], (1 - d / RR) * 0.35, x, y));
        }
      rays(m, b, cx, y0 - 10, '#fff4d0', 9, 0.35, 120);
      halo(m, b, cx, cy, 30, ['#6a4a8a', '#fff0c8'], 0.6);
      break;
    }
    case 'nature': {
      dgrad(m, b, ['#2a6ab0', '#4a92d0', '#8ac4e8', '#d0ecf0']);
      halo(m, b, x1 - 16, y0 + 14, 22, ['#bfe0f0', '#fff6c0', '#fffbe8']);
      for (let i = 0; i < 3; i++) sprite(m, ['..####....', '.######.##', '##########', '.########.'], x0 + 6 + r() * (W - 30), y0 + 8 + i * 9, { '#': WHITE });
      for (const [c, base, amp] of [['#5a9a4a', 22, 9], ['#3e7a32', 14, 6]] as [string, number, number][])
        for (let x = x0; x <= x1; x++) {
          const h = base + Math.round(Math.sin((x - x0) / 9 + base) * amp * 0.5);
          for (let y = y1 - h; y <= y1; y++) put(m, x, y, y === y1 - h ? mix(hex(c), WHITE, 0.3) : hex(c));
        }
      for (let i = 0; i < 18; i++) put(m, x0 + r() * W, y1 - r() * 8, hex(r() < 0.5 ? '#ffe070' : '#ff90b0'));
      break;
    }
    case 'family': {
      dgrad(m, b, ['#2a1440', '#7a3a6a', '#d8605a', '#ffb070']);
      halo(m, b, cx, y1 - 14, 34, ['#e07a5a', '#ffc080', '#fff0c0']);
      for (let x = x0; x <= x1; x++) {
        const h = 9 + Math.round(Math.sin((x - x0) / 11) * 3);
        for (let y = y1 - h; y <= y1; y++) put(m, x, y, hex('#3a1e2e'));
      }
      sprite(
        m,
        ['......##......', '.....####.....', '....######....', '...########...', '..##########..', '.############.', '##############', '..##########..', '..##yy##yy##..', '..##yy##yy##..', '..##########..', '..#####..###..', '..#####..###..'],
        x0 + 6,
        y1 - 22,
        { '#': hex('#2a1420'), y: hex('#ffd060') },
      );
      stars(8, ['#ffe8f0'], 0.3);
      break;
    }
  }
}

// ───────────────────────── 액자 ─────────────────────────

type Frame = { t: RGB[]; plate: [RGB, RGB]; gem: RGB; ribbon: [RGB, RGB, RGB]; aura?: RGB };
const F = (t: string[], plate: [string, string], gem: string, ribbon: [string, string, string], aura?: string): Frame => ({
  t: t.map(hex),
  plate: plate.map(hex) as [RGB, RGB],
  gem: hex(gem),
  ribbon: ribbon.map(hex) as [RGB, RGB, RGB],
  aura: aura ? hex(aura) : undefined,
});
/** t: [외곽선, 어둠, 중간, 밝음, 하이라이트] */
const FRAMES: Record<Rarity, Frame> = {
  legend: F(['#1e0e00', '#7a4200', '#d08a00', '#ffcc30', '#fff6c0'], ['#140c04', '#2a1c0a'], '#ff2a50', ['#5a0614', '#a8142c', '#e0344a'], '#ffe070'),
  epic: F(['#10042a', '#44168a', '#8a3ee0', '#c68cff', '#f4e4ff'], ['#0e0620', '#1e1038'], '#30f0c0', ['#1e0a4a', '#4a1e9a', '#7a4ad8'], '#d8a8ff'),
  rare: F(['#041230', '#12408a', '#2a7ae0', '#7ec0ff', '#e0f2ff'], ['#06101e', '#0e1e38'], '#ffd040', ['#06224a', '#0e3e84', '#2a64b8'], '#9ad4ff'),
  common: F(['#16161c', '#4a4a58', '#8a8a9c', '#c4c4d0', '#f4f4fa'], ['#121216', '#22222c'], '#70d8ff', ['#26262e', '#44444e', '#62626e']),
};

const ART: Box = [6, 6, CW - 7, 85];
const PLATE: Box = [6, 90, CW - 7, CH - 7];
const RAD = 6;

/** 둥근 모서리를 따른 바깥에서의 거리 (−1 = 카드 밖) */
function edgeDist(x: number, y: number, W: number, H: number): number {
  const dx = x < RAD ? RAD - x - 0.5 : x > W - 1 - RAD ? x + 0.5 - (W - RAD) : 0;
  const dy = y < RAD ? RAD - y - 0.5 : y > H - 1 - RAD ? y + 0.5 - (H - RAD) : 0;
  if (dx > 0 && dy > 0) {
    const d = Math.hypot(dx, dy);
    return d > RAD ? -1 : Math.floor(RAD - d);
  }
  return Math.min(x, y, W - 1 - x, H - 1 - y);
}

/** 테두리: 바깥선 · 밝은 베벨 · 무늬 띠 · 안쪽 역베벨 · 안쪽선 + 가운데 가로대 */
function frameBand(m: Img, f: Frame, rar: Rarity) {
  const [O, D, M, L, Hh] = f.t;
  for (let y = 0; y < m.h; y++)
    for (let x = 0; x < m.w; x++) {
      const e = edgeDist(x, y, m.w, m.h);
      if (e < 0) {
        m.d[(y * m.w + x) * 4 + 3] = 0;
        continue;
      }
      if (e > 5) continue;
      const lit = Math.min(x, y) <= Math.min(m.w - 1 - x, m.h - 1 - y);
      const along = Math.min(x, m.w - 1 - x) === e ? y : x;
      let c: RGB;
      if (e === 0) c = O;
      else if (e === 1) c = lit ? Hh : D;
      else if (e === 2 || e === 3) {
        c = e === 2 && lit ? mix(M, L, 0.5) : M;
        if (rar === 'legend' && along % 4 === 0) c = e === 2 ? Hh : D;
        else if (rar === 'epic' && along % 6 === 0) c = e === 2 ? L : D;
        else if (rar === 'rare' && along % 8 === 0 && e === 3) c = L;
      } else if (e === 4) c = lit ? D : L;
      else c = O;
      put(m, x, y, c);
    }
  for (let x = 5; x < m.w - 5; x++) {
    put(m, x, 86, O);
    put(m, x, 87, rar === 'legend' && x % 4 === 0 ? Hh : L);
    put(m, x, 88, M);
    put(m, x, 89, O);
  }
}

/** 마름모 보석 (반지름 r) */
function gem(m: Img, cx: number, cy: number, r: number, c: RGB, out: RGB, rim: RGB) {
  for (let y = -r - 1; y <= r + 1; y++)
    for (let x = -r - 1; x <= r + 1; x++) {
      const d = Math.abs(x) + Math.abs(y);
      if (d === r + 1) put(m, cx + x, cy + y, out);
      else if (d === r) put(m, cx + x, cy + y, rim);
      else if (d < r) put(m, cx + x, cy + y, x + y < -1 ? mix(c, WHITE, 0.5) : x + y > 1 ? mix(c, BLACK, 0.35) : c);
    }
  put(m, cx - Math.max(1, r - 2), cy - 1, WHITE);
}

const STAR = ['...#...', '..#h#..', '###h###', '#yyhyy#', '.#yyy#.', '#yy#yy#', '##...##'];
const CROWN = [
  '..#......#......#..',
  '.#h#....#h#....#h#.',
  '.#l#...#lhl#...#l#.',
  '.#ll#.#lllll#.#ll#.',
  '.#lll#lllllll#lll#.',
  '.#lmmmmmmmmmmmmmd#.',
  '.#mrrmmmmgmmmmrrd#.',
  '.#mmmmmmmmmmmmmdd#.',
  '###################',
];
const WING = ['......##', '...####l', '.####ll#', '###lll#.', '.##ll#..', '..###...'];

/** 등급 장식: 왕관 · 보석 걸쇠 · 별 리본 */
function ornaments(m: Img, f: Frame, rar: Rarity, tier: number) {
  const [O, D, M, L, Hh] = f.t;
  const pal = { '#': O, h: Hh, l: L, m: M, d: D, r: hex('#ff2a50'), g: hex('#30e0ff') };
  for (const [gx, gy] of [[6, 6], [m.w - 7, 6], [6, 87], [m.w - 7, 87], [6, m.h - 7], [m.w - 7, m.h - 7]] as [number, number][]) {
    if (rar === 'common') {
      rect(m, gx - 1, gy - 1, gx + 1, gy + 1, O);
      put(m, gx, gy, L);
    } else gem(m, gx, gy, rar === 'rare' ? 2 : 3, f.gem, O, L);
  }
  const mid = Math.floor(m.w / 2);
  if (rar === 'legend') sprite(m, CROWN, mid - 9, 0, pal);
  else if (rar === 'epic') {
    for (const s of [-1, 1]) for (let i = 0; i < 6; i++) rect(m, mid + s * (5 + i), 2 + (i >> 1), mid + s * (5 + i), 4 + (i >> 1), i % 2 ? L : M);
    gem(m, mid, 4, 4, f.gem, O, L);
  } else if (rar === 'rare') gem(m, mid, 3, 3, f.gem, O, L);
  if (tier <= 0) return;
  // 별 리본 (그림창과 설명판 사이, 제비꼬리)
  const [rd, rm, rl] = f.ribbon;
  const w = 10 + tier * 9;
  const x0 = mid - Math.floor(w / 2);
  const y0 = 81;
  const hgt = 11;
  for (const s of [-1, 1]) {
    for (let y = 0; y < hgt - 2; y++)
      for (let i = 0; i < 7; i++) {
        const X = s < 0 ? x0 - 6 + i : x0 + w + 5 - i;
        const notch = i < 3 && Math.abs(y - (hgt - 3) / 2) < 3 - i;
        if (!notch) put(m, X, y0 + 3 + y, (i === 0 && !notch) || y === 0 || y === hgt - 3 ? O : y > hgt - 6 ? rd : rm);
      }
  }
  for (let y = 0; y < hgt; y++)
    for (let x = 0; x < w; x++) {
      const edge = y === 0 || y === hgt - 1 || x === 0 || x === w - 1;
      put(m, x0 + x, y0 + y, edge ? O : y === 1 ? rl : y >= hgt - 3 ? rd : rm);
    }
  if (rar === 'legend') for (const s of [-1, 1]) sprite(m, WING, s < 0 ? x0 - 15 : x0 + w + 7, y0 - 2, pal, s > 0);
  const spal = { '#': hex('#5a3000'), y: hex('#ffc82a'), h: hex('#fff6c0') };
  for (let i = 0; i < tier; i++) sprite(m, STAR, x0 + 5 + i * 9, y0 + 2, spal);
}

/** 설명판: 은은한 결 + 안쪽 테두리 */
function plate(m: Img, f: Frame, seed: number) {
  const [a, b] = f.plate;
  const [x0, y0, x1, y1] = PLATE;
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      put(m, x, y, y - y0 < 5 ? ramp([mix(a, BLACK, 0.4), a, b], (y - y0) / 5, x, y) : b);
    }
  const r = rng(seed);
  for (let i = 0; i < 40; i++) put(m, x0 + 3 + r() * (x1 - x0 - 6), y0 + 6 + r() * (y1 - y0 - 9), mix(b, r() < 0.5 ? WHITE : BLACK, 0.08));
  const line = mix(f.t[1], a, 0.3);
  rect(m, x0 + 3, y1 - 2, x1 - 3, y1 - 2, line);
  rect(m, x0 + 2, y0 + 6, x0 + 2, y1 - 3, line);
  rect(m, x1 - 2, y0 + 6, x1 - 2, y1 - 3, line);
  put(m, x0 + 2, y1 - 2, f.t[3]);
  put(m, x1 - 2, y1 - 2, f.t[3]);
}

// ───────────────────────── 공개 함수 ─────────────────────────

/** 카드 앞면 (잠김이면 어두운 실루엣) */
export function cardFrontURL(id: string, icon: string, theme: Theme, rar: Rarity, locked = false, tier = 1): string {
  const key = `f:${id}:${locked}:${tier}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const m = img(CW, CH);
  const fr: Rarity = locked ? 'common' : rar;
  const f = FRAMES[fr];
  scene(m, theme, hash(id), ART);
  const ecx = CW / 2;
  const ecy = 45;
  if (locked) {
    for (let i = 0; i < m.d.length; i += 4) {
      const g = Math.round((m.d[i] * 0.3 + m.d[i + 1] * 0.5 + m.d[i + 2] * 0.2) * 0.32);
      m.d[i] = g;
      m.d[i + 1] = g;
      m.d[i + 2] = Math.round(g * 1.15);
    }
    stamp(m, icon, ecx, ecy, 30, 2, { sil: [26, 22, 34] });
  } else {
    if (rar === 'legend') {
      rays(m, ART, ecx, ecy, '#ffe070', 18, 0.45, 55);
      halo(m, ART, ecx, ecy, 30, ['#ffc040', '#fff0a0'], 0.55);
    } else if (rar === 'epic') for (let a = 0; a < Math.PI * 2; a += 0.01) for (const rr of [34, 36]) put(m, ecx + Math.cos(a) * rr, ecy + Math.sin(a) * rr, rr === 34 ? f.t[3] : f.t[2]);
    stamp(m, icon, ecx, ecy, 30, 2, { rim: hex(RIM[theme]), aura: f.aura });
    if (rar === 'legend' || rar === 'epic') {
      const r = rng(hash(id) ^ 99);
      for (let i = 0; i < (rar === 'legend' ? 7 : 4); i++) sparkle(m, ART[0] + 6 + r() * (ART[2] - ART[0] - 12), ART[1] + 10 + r() * 60, f.aura ?? WHITE, r() < 0.4 ? 2 : 1);
    }
  }
  vignette(m, ART, 7, 0.75);
  plate(m, f, hash(id));
  frameBand(m, f, fr);
  ornaments(m, f, fr, locked ? 0 : tier);
  const u = toURL(m);
  cache.set(key, u);
  return u;
}

/** 카드 뒷면: 방사형 빛 + 마름모 격자 + 가운데 메달리온(성씨는 화면에서 얹는다) + 월계관 */
export function cardBackURL(rar: Rarity): string {
  const key = `b:${rar}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const m = img(CW, CH);
  const f = FRAMES[rar];
  const [O, D, M, L, Hh] = f.t;
  const [pa, pb] = f.plate;
  const all: Box = [0, 0, CW - 1, CH - 1];
  const cx = CW / 2;
  const cy = 58;
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) put(m, x, y, ramp([pa, pb, mix(pb, D, 0.5)], 1 - Math.hypot(x - cx, y - cy) / 80, x, y));
  rays(m, all, cx, cy, mix(pb, D, 0.8), 24, 0.6, 90);
  for (let y = 0; y < CH; y++)
    for (let x = 0; x < CW; x++) {
      if (((x + y) % 10 === 0 || (x - y + 1000) % 10 === 0) && dith(x, y, 0.7)) put(m, x, y, mix(D, pb, 0.3));
      if ((x + y) % 20 === 10 && (x - y + 1000) % 20 === 10) {
        put(m, x, y, L);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) put(m, x + dx, y + dy, M);
      }
    }
  halo(m, all, cx, cy, 44, [mix(D, pb, 0.2), M], 0.5);
  for (const s of [-1, 1])
    for (let i = 0; i < 17; i++) {
      const a = Math.PI / 2 + s * (0.25 + i * 0.145);
      sprite(m, ['.##.', '#gl#', '#gg#', '.##.'], cx + Math.cos(a) * 30 - 2, cy + Math.sin(a) * 30 - 2, { '#': hex('#12300a'), g: hex('#4a9a3a'), l: hex('#9ae07a') });
    }
  // 메달리온: 금속 고리(베벨) → 톱니 → 어두운 원판
  for (let y = -26; y <= 26; y++)
    for (let x = -26; x <= 26; x++) {
      const d = Math.hypot(x + 0.5, y + 0.5);
      if (d > 25) continue;
      const lit = x + y < 0;
      let c: RGB;
      if (d > 24) c = O;
      else if (d > 22) c = lit ? Hh : M;
      else if (d > 20) c = lit ? L : D;
      else if (d > 19) c = O;
      else if (d > 17.5) c = Math.floor(((Math.atan2(y, x) + Math.PI) / (2 * Math.PI)) * 48) % 2 ? M : D;
      else if (d > 16.5) c = O;
      else c = ramp([mix(pa, BLACK, 0.3), pb, mix(pb, D, 0.6)], 1 - d / 17 + (lit ? 0.1 : -0.1), x, y);
      put(m, cx + x, cy + y, c);
    }
  sparkle(m, cx - 15, cy - 16, Hh, 2);
  for (let y = 9; y <= 19; y++) for (let x = 12; x < CW - 12; x++) put(m, x, y, y === 9 || y === 19 || x === 12 || x === CW - 13 ? O : y === 10 ? f.ribbon[2] : y >= 17 ? f.ribbon[0] : f.ribbon[1]);
  plate(m, f, 7);
  frameBand(m, f, rar);
  ornaments(m, f, rar, 0);
  const u = toURL(m);
  cache.set(key, u);
  return u;
}

/** 시너지 방패 문장 32×36: 좌우로 나뉜 방패(두 분야) + 금테 + 발동 시 왕관 */
export function crestURL(id: string, icons: [string, string], theme: Theme, active: boolean): string {
  const key = `s:${id}:${active}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const W = 32;
  const H = 36;
  const m = img(W, H);
  const inside = (x: number, y: number) => {
    if (y < 5 || y > H - 2) return false;
    const half = y < 22 ? 13 : 13 - ((y - 22) * 13) / 13.5;
    return Math.abs(x + 0.5 - 16) <= half;
  };
  const tmp = img(W, H);
  scene(tmp, theme, hash(id), [0, 0, W - 1, H - 1]);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (inside(x, y)) {
        let c = get(tmp, x, y);
        if (x >= 16) c = mix(c, [20, 10, 40], 0.35);
        if (!active) {
          const g = Math.round(((c[0] + c[1] + c[2]) / 3) * 0.42);
          c = [g, g, Math.round(g * 1.1)];
        }
        put(m, x, y, c);
      }
  const gold = (active ? ['#3a2000', '#8a5200', '#e0a010', '#ffe070', '#fff8d0'] : ['#141418', '#34343c', '#5a5a66', '#8a8a96', '#b0b0bc']).map(hex);
  for (let y = 6; y < H - 3; y++) put(m, 16, y, gold[2]);
  stamp(m, icons[0], 10, 18, 10, 1, active ? { rim: hex('#fff4c0') } : { sil: [34, 30, 40] });
  stamp(m, icons[1], 22, 18, 10, 1, active ? { rim: hex('#fff4c0') } : { sil: [34, 30, 40] });
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (inside(x, y)) {
        const e1 = !inside(x + 1, y) || !inside(x - 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
        const e2 = !inside(x + 2, y) || !inside(x - 2, y) || !inside(x, y - 2) || !inside(x, y + 2);
        if (e1) put(m, x, y, x < 16 ? gold[4] : gold[2]);
        else if (e2) put(m, x, y, x < 16 ? gold[3] : gold[1]);
      } else if (inside(x + 1, y) || inside(x - 1, y) || inside(x, y + 1) || inside(x, y - 1)) put(m, x, y, gold[0]);
    }
  if (active) sprite(m, ['#.#.#.#', '#h#h#h#', '#lllll#', '#lrlrl#', '#######'], 12, 0, { '#': gold[0], h: gold[4], l: gold[3], r: hex('#ff3a5a') });
  else rect(m, 13, 2, 18, 4, gold[1]);
  const u = toURL(m);
  cache.set(key, u);
  return u;
}

// ───────────────────────── 훈장 (64×96): 수(綬) 리본 + 금 걸쇠 + 고리 + 각진 별 몸체 + 칠보 원판 ─────────────────────────

/** 수(리본) 색: 실제 훈장 수의 색을 따랐다 (근정훈장은 청·황·홍·녹·옥조) */
const RIBBON: Record<string, string[]> = {
  mugunghwa: ['#c8a020', '#c01830', '#f0d060', '#c01830', '#c8a020'],
  cheongjo: ['#e8e8f0', '#1a4aa8', '#1a4aa8', '#1a4aa8', '#e8e8f0'],
  hwangjo: ['#e8e8f0', '#e0b020', '#e0b020', '#e0b020', '#e8e8f0'],
  hongjo: ['#e8e8f0', '#c8283a', '#c8283a', '#c8283a', '#e8e8f0'],
  nokjo: ['#e8e8f0', '#2a8a4a', '#2a8a4a', '#2a8a4a', '#e8e8f0'],
  okjo: ['#2a6a8a', '#e8f0f0', '#e8f0f0', '#e8f0f0', '#2a6a8a'],
  tongil: ['#1a5a2a', '#c8283a', '#1a5a2a', '#c8283a', '#1a5a2a'],
  gukseon: ['#1a5a2a', '#e8e8f0', '#1a5a2a', '#e8e8f0', '#1a5a2a'],
  taeguk: ['#1a3a9a', '#c8283a', '#f0f0f0', '#c8283a', '#1a3a9a'],
  cheongnyong: ['#f0f0f0', '#1a5ac8', '#6aa8f0', '#1a5ac8', '#f0f0f0'],
  geumgwan: ['#5a1a7a', '#c8a020', '#5a1a7a', '#c8a020', '#5a1a7a'],
  eungwan: ['#5a1a7a', '#c0c0d0', '#5a1a7a', '#c0c0d0', '#5a1a7a'],
  changjo: ['#0a2a6a', '#3aa0e0', '#e8f4ff', '#3aa0e0', '#0a2a6a'],
  hyeoksin: ['#0a2a6a', '#3aa0e0', '#0a2a6a', '#3aa0e0', '#0a2a6a'],
  ungbi: ['#0a1a4a', '#6a4ae0', '#e8e4ff', '#6a4ae0', '#0a1a4a'],
  geumtap: ['#8a4a00', '#f0a020', '#fff0a0', '#f0a020', '#8a4a00'],
  euntap: ['#6a6a78', '#f0a020', '#6a6a78', '#f0a020', '#6a6a78'],
  moran: ['#f0e0e8', '#e05a8a', '#f0e0e8', '#e05a8a', '#f0e0e8'],
  dongbaek: ['#1a5a2a', '#d02a3a', '#d02a3a', '#d02a3a', '#1a5a2a'],
  mugunghwa_nat: ['#e05a8a', '#f0e0e8', '#c01830', '#f0e0e8', '#e05a8a'],
  sugyo: ['#0a2a5a', '#e8e8f0', '#0a2a5a', '#e8e8f0', '#0a2a5a'],
  gwanghwa: ['#0a2a5a', '#e8e8f0', '#c8a020', '#e8e8f0', '#0a2a5a'],
};
const METAL: Record<Rarity, RGB[]> = {
  legend: ['#2a1600', '#8a5a00', '#d8a020', '#ffd84a', '#fff6c8'].map(hex),
  epic: ['#1a1a24', '#6a6a7a', '#b8b8c8', '#e8e8f4', '#ffffff'].map(hex),
  rare: ['#2a1606', '#7a4a1a', '#c08040', '#e8b070', '#fff0d8'].map(hex),
  common: ['#1a1a24', '#5a5a6a', '#9a9aaa', '#c8c8d4', '#f0f0f8'].map(hex),
};

/** 훈장 앞면(back=false) · 뒷면(back=true: 칠보 없이 금속, 가운데는 새김 글씨 자리) */
export function medalURL(id: string, icon: string, rar: Rarity, back = false): string {
  const key = `m:${id}:${back}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const W = 64;
  const H = 96;
  const m = img(W, H);
  const [O, D, M, L, Hh] = METAL[rar];
  const rib = (RIBBON[id] ?? ['#e8e8f0', '#1a4aa8', '#1a4aa8', '#1a4aa8', '#e8e8f0']).map(hex);
  // 리본: 5줄 무늬, 가운데로 모이는 주름 음영, 아래는 금 걸쇠
  const rx0 = 19;
  const rx1 = 44;
  for (let y = 0; y <= 27; y++)
    for (let x = rx0; x <= rx1; x++) {
      const u = (x - rx0) / (rx1 - rx0 + 1);
      const band = u < 0.14 ? 0 : u < 0.36 ? 1 : u < 0.64 ? 2 : u < 0.86 ? 3 : 4;
      let c = rib[band];
      // 비단 결: 세로 주름 + 위쪽이 살짝 어둡다
      if ((x - rx0) % 5 === 4) c = mix(c, BLACK, 0.18);
      else if ((x - rx0) % 5 === 1) c = mix(c, WHITE, 0.12);
      if (dith(x, y, 0.35 - y / 80)) c = mix(c, BLACK, 0.2);
      put(m, x, y, x === rx0 || x === rx1 ? mix(c, BLACK, 0.45) : c);
    }
  // 걸쇠 (금색 막대, 베벨)
  const G = METAL.legend;
  for (let x = rx0 - 2; x <= rx1 + 2; x++) {
    put(m, x, 27, G[0]);
    put(m, x, 28, x % 3 ? G[4] : G[3]);
    put(m, x, 29, G[2]);
    put(m, x, 30, G[1]);
    put(m, x, 31, G[0]);
  }
  for (const ex of [rx0 - 3, rx1 + 3]) for (let y = 28; y <= 30; y++) put(m, ex, y, G[0]);
  // 고리
  for (let a = 0; a < Math.PI * 2; a += 0.05) {
    const x = 31.5 + Math.cos(a) * 3;
    const y = 35 + Math.sin(a) * 3;
    put(m, x, y, Math.sin(a) < 0 ? G[3] : G[1]);
  }
  put(m, 31, 38, G[0]);
  put(m, 32, 38, G[0]);
  // 몸체: 전설은 8각 광휘 별, 영웅은 6각 별, 희귀는 5잎 꽃, 일반은 둥근 메달
  const cx = 31.5;
  const cy = 64.5;
  const n = rar === 'legend' ? 8 : rar === 'epic' ? 6 : rar === 'rare' ? 5 : 0;
  const Ro = 26;
  const Ri = rar === 'legend' ? 14 : rar === 'epic' ? 15 : 19;
  const radius = (ang: number) => {
    if (!n) return 22;
    const t = (((ang + Math.PI / 2) / ((Math.PI * 2) / n)) % 1 + 1) % 1;
    if (rar === 'rare') return Ri + (Ro - Ri) * Math.sin(t * Math.PI) ** 0.6; // 둥근 꽃잎
    return Ri + (Ro - Ri) * Math.abs(1 - 2 * t);
  };
  const facet = (ang: number) => {
    if (!n) return 0.5;
    return (((ang + Math.PI / 2) / ((Math.PI * 2) / n)) % 1 + 1) % 1;
  };
  const inBody = (x: number, y: number) => {
    const d = Math.hypot(x + 0.5 - cx - 0.5, y + 0.5 - cy - 0.5);
    return d <= radius(Math.atan2(y + 0.5 - cy - 0.5, x + 0.5 - cx - 0.5));
  };
  // 광휘 (전설): 몸체 뒤로 가는 햇살
  if (rar === 'legend')
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2 + Math.PI / 16;
      for (let r = 12; r < 30; r++) put(m, cx + 0.5 + Math.cos(a) * r, cy + 0.5 + Math.sin(a) * r, r > 27 ? G[1] : G[2]);
    }
  for (let y = 36; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (!inBody(x, y)) {
        if (inBody(x + 1, y) || inBody(x - 1, y) || inBody(x, y + 1) || inBody(x, y - 1)) put(m, x, y, O);
        continue;
      }
      const ang = Math.atan2(y + 0.5 - cy - 0.5, x + 0.5 - cx - 0.5);
      const d = Math.hypot(x + 0.5 - cx - 0.5, y + 0.5 - cy - 0.5);
      const t = facet(ang);
      // 각진 면: 한쪽은 빛, 한쪽은 그늘. 빛은 왼쪽 위에서
      const lightSide = Math.cos(ang + Math.PI * 0.75) > 0;
      let c = n && rar !== 'rare' ? (t < 0.5 === lightSide ? L : M) : ramp([L, M, D], (x - y + 40) / 110, x, y);
      if (n && rar !== 'rare' && Math.abs(t - 0.5) < 0.05) c = Hh; // 능선
      if (d > radius(ang) - 1.2) c = D;
      put(m, x, y, c);
    }
  if (!back) {
    // 칠보 원판: 바깥 금테 → 색 에나멜 고리 → 안쪽 원판 → 문장
    const ring = rib[1];
    for (let y = -14; y <= 14; y++)
      for (let x = -14; x <= 14; x++) {
        const d = Math.hypot(x, y);
        if (d > 13.5) continue;
        const X = Math.round(cx + x);
        const Y = Math.round(cy + y);
        if (d > 12.5) put(m, X, Y, O);
        else if (d > 11.3) put(m, X, Y, x + y < 0 ? Hh : D);
        else if (d > 8.2) put(m, X, Y, ramp([mix(ring, WHITE, 0.35), ring, mix(ring, BLACK, 0.35)], (x + y + 12) / 24, X, Y));
        else if (d > 7.4) put(m, X, Y, G[3]);
        else put(m, X, Y, ramp([hex('#fffaf0'), hex('#f0e4c8')], (x + y + 8) / 16, X, Y));
      }
    // 에나멜 고리의 점무늬
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      put(m, cx + Math.cos(a) * 9.8, cy + Math.sin(a) * 9.8, G[4]);
    }
    stamp(m, icon, cx + 0.5, cy + 0.5, 13, 1, { rim: hex('#fff4c0') });
    if (rar === 'legend' || rar === 'epic') {
      sparkle(m, 12, 48, WHITE, 2);
      sparkle(m, 52, 78, mix(Hh, WHITE, 0.5), 1);
    }
  } else {
    // 뒷면: 가운데를 평평하게 갈아 새김 글씨 자리를 만든다
    for (let y = -14; y <= 14; y++)
      for (let x = -14; x <= 14; x++) {
        const d = Math.hypot(x, y);
        if (d > 13.5) continue;
        const X = Math.round(cx + x);
        const Y = Math.round(cy + y);
        put(m, X, Y, d > 12.5 ? D : d > 11.5 ? (x + y > 0 ? L : D) : ramp([L, M], (x + y + 12) / 24, X, Y));
      }
    // 핀 (뒷면 고정 핀)
    for (let x = 20; x <= 43; x++) {
      put(m, x, 45, G[2]);
      put(m, x, 46, O);
    }
    rect(m, 17, 43, 20, 47, G[0]);
    rect(m, 18, 44, 19, 46, G[3]);
    rect(m, 43, 44, 45, 46, G[0]);
  }
  const u = toURL(m);
  cache.set(key, u);
  return u;
}
