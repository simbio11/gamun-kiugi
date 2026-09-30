// 명예의 전당 카드 도트 아트 (64×88).
// 테마별 배경(권력·법·군·의료·과학·우주·무대·스포츠·장인·영웅·신앙·자연·가족·돈) + 도트로 다시 찍은 문장(아이콘)
// + 등급별 액자(전설 금·영웅 보라·희귀 파랑·일반 은)와 코너 보석. 뒷면은 가문 문장과 격자 무늬.
// 시너지는 32×36 방패 엠블럼.

import type { Rarity } from '../core/rewards';

export const CW = 64;
export const CH = 88;
type RGB = [number, number, number];
type Img = { w: number; h: number; d: Uint8ClampedArray };

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
const mix = (a: RGB, b: RGB, t: number): RGB => [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t)) as RGB;

function img(w: number, h: number): Img {
  return { w, h, d: new Uint8ClampedArray(w * h * 4) };
}
function put(m: Img, x: number, y: number, c: RGB, a = 255) {
  x |= 0;
  y |= 0;
  if (x < 0 || y < 0 || x >= m.w || y >= m.h) return;
  const i = (y * m.w + x) * 4;
  if (a < 255) {
    const t = a / 255;
    m.d[i] = Math.round(m.d[i] * (1 - t) + c[0] * t);
    m.d[i + 1] = Math.round(m.d[i + 1] * (1 - t) + c[1] * t);
    m.d[i + 2] = Math.round(m.d[i + 2] * (1 - t) + c[2] * t);
    m.d[i + 3] = Math.max(m.d[i + 3], a);
    return;
  }
  m.d[i] = c[0];
  m.d[i + 1] = c[1];
  m.d[i + 2] = c[2];
  m.d[i + 3] = 255;
}
function get(m: Img, x: number, y: number): RGB {
  const i = (y * m.w + x) * 4;
  return [m.d[i], m.d[i + 1], m.d[i + 2]];
}
function rect(m: Img, x0: number, y0: number, x1: number, y1: number, c: RGB, a = 255) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) put(m, x, y, c, a);
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

// ───────────────────────── 문장: 아이콘을 저해상도로 찍고 외곽선·명암을 입혀 도트로 ─────────────────────────

/** 아이콘을 n×n 도트로. 불투명 픽셀만 남기고, 색은 단계로 줄이고, 1px 테두리 */
function emblem(icon: string, n: number): (RGB | null)[][] {
  const key = icon + n;
  const hit = emblemCache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = c.height = n;
  const ctx = c.getContext('2d')!;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${Math.round(n * 0.86)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
  ctx.fillText(icon, n / 2, n / 2 + n * 0.06);
  const d = ctx.getImageData(0, 0, n, n).data;
  const out: (RGB | null)[][] = [];
  const q = (v: number) => Math.min(255, Math.round(v / 36) * 36);
  for (let y = 0; y < n; y++) {
    out.push([]);
    for (let x = 0; x < n; x++) {
      const i = (y * n + x) * 4;
      out[y].push(d[i + 3] > 110 ? [q(d[i] * 255 / Math.max(1, d[i + 3])), q(d[i + 1] * 255 / Math.max(1, d[i + 3])), q(d[i + 2] * 255 / Math.max(1, d[i + 3]))] : null);
    }
  }
  emblemCache.set(key, out);
  return out;
}
const emblemCache = new Map<string, (RGB | null)[][]>();

/** 문장을 s배로 찍는다. 외곽선 + 위쪽 하이라이트 + 아래쪽 그림자로 도트 느낌 */
function stamp(m: Img, icon: string, cx: number, cy: number, n: number, s: number, sil?: RGB) {
  const e = emblem(icon, n);
  const x0 = Math.round(cx - (n * s) / 2);
  const y0 = Math.round(cy - (n * s) / 2);
  const OUT: RGB = [24, 16, 28];
  const on = (x: number, y: number) => x >= 0 && y >= 0 && x < n && y < n && !!e[y][x];
  // 그림자
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (e[y][x]) rect(m, x0 + x * s + s, y0 + y * s + s, x0 + x * s + 2 * s - 1, y0 + y * s + 2 * s - 1, [0, 0, 0], 70);
  // 외곽선
  for (let y = -1; y <= n; y++)
    for (let x = -1; x <= n; x++) {
      if (on(x, y)) continue;
      if (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1)) rect(m, x0 + x * s, y0 + y * s, x0 + x * s + s - 1, y0 + y * s + s - 1, OUT);
    }
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const c = e[y][x];
      if (!c) continue;
      let col: RGB = sil ?? c;
      if (!sil) {
        if (!on(x, y - 1) || !on(x - 1, y)) col = mix(col, [255, 250, 230], 0.28);
        else if (!on(x, y + 1) || !on(x + 1, y)) col = mix(col, [30, 20, 40], 0.25);
      }
      rect(m, x0 + x * s, y0 + y * s, x0 + x * s + s - 1, y0 + y * s + s - 1, col);
    }
}

// ───────────────────────── 테마 배경 ─────────────────────────

export type Theme = 'power' | 'law' | 'military' | 'diplo' | 'money' | 'science' | 'space' | 'tech' | 'medical' | 'stage' | 'screen' | 'music' | 'sports' | 'craft' | 'service' | 'hero' | 'faith' | 'nature' | 'family' | 'press';

function vgrad(m: Img, x0: number, y0: number, x1: number, y1: number, top: string, bot: string, bands = 6) {
  const a = hex(top);
  const b = hex(bot);
  for (let y = y0; y <= y1; y++) {
    const t = Math.floor(((y - y0) / Math.max(1, y1 - y0)) * bands) / bands;
    for (let x = x0; x <= x1; x++) put(m, x, y, mix(a, b, t));
  }
}
function rays(m: Img, cx: number, cy: number, x0: number, y0: number, x1: number, y1: number, c: RGB, n: number, a: number) {
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const ang = Math.atan2(y - cy, x - cx);
      if (Math.floor(((ang + Math.PI) / (2 * Math.PI)) * n * 2) % 2 === 0) put(m, x, y, c, a);
    }
}
function glow(m: Img, cx: number, cy: number, r: number, c: RGB, a: number, x0: number, y0: number, x1: number, y1: number) {
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const d = Math.hypot(x - cx, y - cy) / r;
      if (d < 1) put(m, x, y, c, Math.round(a * (1 - d) * 4) / 4);
    }
}

/** 그림 창 (x0..x1, y0..y1) 에 테마 배경 */
function scene(m: Img, th: Theme, seed: number, x0: number, y0: number, x1: number, y1: number) {
  const r = rng(seed);
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2 - 2;
  const W = x1 - x0;
  const H = y1 - y0;
  const stars = (n: number, c: RGB) => {
    for (let i = 0; i < n; i++) put(m, x0 + Math.floor(r() * W), y0 + Math.floor(r() * H * 0.8), c, r() < 0.3 ? 255 : 160);
  };
  switch (th) {
    case 'power': {
      vgrad(m, x0, y0, x1, y1, '#101a44', '#3a2a70');
      rays(m, cx, cy, x0, y0, x1, y1, hex('#ffd24a'), 14, 60);
      glow(m, cx, cy, 22, hex('#ffe08a'), 150, x0, y0, x1, y1);
      for (const px of [x0 + 3, x0 + 9, x1 - 11, x1 - 5]) {
        rect(m, px, y1 - 20, px + 3, y1 - 3, hex('#e8e0c8'));
        rect(m, px + 3, y1 - 20, px + 3, y1 - 3, hex('#b0a888'));
        rect(m, px - 1, y1 - 22, px + 4, y1 - 21, hex('#fff4d8'));
      }
      rect(m, x0, y1 - 2, x1, y1, hex('#c8b890'));
      break;
    }
    case 'law': {
      vgrad(m, x0, y0, x1, y1, '#3a0e1a', '#6b1f2a');
      rays(m, cx, y0, x0, y0, x1, y1, hex('#f0c060'), 10, 45);
      for (let x = x0 + 2; x < x1; x += 7) {
        rect(m, x, y0 + 8, x + 2, y1 - 3, hex('#d8cfb8'));
        rect(m, x + 2, y0 + 8, x + 2, y1 - 3, hex('#9a927c'));
      }
      rect(m, x0, y0 + 6, x1, y0 + 7, hex('#f4ecd4'));
      rect(m, x0, y1 - 2, x1, y1, hex('#f4ecd4'));
      break;
    }
    case 'military': {
      vgrad(m, x0, y0, x1, y1, '#2e3a1e', '#4d5a2a');
      for (let i = 0; i < 40; i++) {
        const bx = x0 + Math.floor(r() * W);
        const by = y0 + Math.floor(r() * H);
        rect(m, bx, by, bx + 3, by + 1, hex(r() < 0.5 ? '#3b4722' : '#5e6b35'));
      }
      rays(m, cx, cy, x0, y0, x1, y1, hex('#e8d890'), 8, 40);
      for (let i = 0; i < 5; i++) {
        const sx = x0 + 6 + i * 11;
        put(m, sx, y0 + 4, hex('#fff2a0'));
        put(m, sx - 1, y0 + 5, hex('#fff2a0'));
        put(m, sx + 1, y0 + 5, hex('#fff2a0'));
        put(m, sx, y0 + 5, hex('#fff2a0'));
        put(m, sx, y0 + 6, hex('#e0c060'));
      }
      break;
    }
    case 'diplo': {
      vgrad(m, x0, y0, x1, y1, '#0f3a6a', '#3e7ab0');
      glow(m, cx, cy + 4, 18, hex('#bfe4ff'), 170, x0, y0, x1, y1);
      for (let a = 0; a < 2 * Math.PI; a += 0.08) {
        put(m, cx + Math.cos(a) * 17, cy + 4 + Math.sin(a) * 17, hex('#dff0ff'), 180);
        for (const d of [-8, 0, 8]) put(m, cx + d * Math.cos(a) * 0 + Math.cos(a) * Math.abs(17 - Math.abs(d)), cy + 4 + Math.sin(a) * 17, hex('#a8d0f0'), 90);
      }
      for (let i = 0; i < 14; i++) {
        const a = -Math.PI * 0.9 + i * 0.13;
        put(m, cx + Math.cos(a) * 22, y1 - 3 + Math.sin(a) * 18, hex('#ffe9a0'));
        put(m, cx - Math.cos(a) * 22, y1 - 3 + Math.sin(a) * 18, hex('#ffe9a0'));
      }
      break;
    }
    case 'money': {
      vgrad(m, x0, y0, x1, y1, '#0c0f24', '#2c2150');
      stars(10, hex('#fff6c0'));
      for (let x = x0; x <= x1; ) {
        const w = 4 + Math.floor(r() * 5);
        const h = 12 + Math.floor(r() * (H - 18));
        rect(m, x, y1 - h, x + w - 1, y1, hex('#1a1838'));
        for (let wy = y1 - h + 2; wy < y1 - 1; wy += 3) for (let wx = x + 1; wx < x + w - 1; wx += 2) if (r() < 0.55) put(m, wx, wy, hex(r() < 0.7 ? '#ffd25a' : '#9fe0ff'));
        x += w + 1;
      }
      glow(m, cx, cy - 4, 16, hex('#ffd24a'), 110, x0, y0, x1, y1);
      break;
    }
    case 'science':
    case 'tech': {
      vgrad(m, x0, y0, x1, y1, th === 'tech' ? '#051a1a' : '#08122e', th === 'tech' ? '#0c3a3a' : '#17306a');
      const c = hex(th === 'tech' ? '#3cffc8' : '#7fd4ff');
      for (let i = 0; i < 9; i++) {
        let x = x0 + Math.floor(r() * W);
        let y = y0 + Math.floor(r() * H);
        for (let k = 0; k < 14; k++) {
          put(m, x, y, c, 120);
          if (r() < 0.5) x += r() < 0.5 ? 1 : -1;
          else y += r() < 0.5 ? 1 : -1;
        }
        rect(m, x - 1, y - 1, x + 1, y + 1, c, 200);
      }
      glow(m, cx, cy, 20, c, 90, x0, y0, x1, y1);
      if (th === 'science')
        for (let a = 0; a < 2 * Math.PI; a += 0.05) {
          put(m, cx + Math.cos(a) * 20, cy + Math.sin(a) * 7, hex('#bfe8ff'), 170);
          put(m, cx + Math.cos(a) * 7, cy + Math.sin(a) * 20, hex('#bfe8ff'), 120);
        }
      break;
    }
    case 'space': {
      vgrad(m, x0, y0, x1, y1, '#02030d', '#1a0f3a');
      glow(m, x0 + W * 0.3, y0 + H * 0.35, 20, hex('#b04aff'), 90, x0, y0, x1, y1);
      glow(m, x0 + W * 0.75, y0 + H * 0.6, 16, hex('#3a8aff'), 90, x0, y0, x1, y1);
      stars(40, hex('#ffffff'));
      const px = x1 - 10;
      const py = y1 - 8;
      for (let y = -7; y <= 7; y++) for (let x = -7; x <= 7; x++) if (x * x + y * y <= 49) put(m, px + x, py + y, mix(hex('#e07a4a'), hex('#5a2a1a'), (x + y + 14) / 28));
      break;
    }
    case 'medical': {
      vgrad(m, x0, y0, x1, y1, '#0e3a3a', '#1f6a62');
      for (let y = y0 + 3; y < y1; y += 9)
        for (let x = x0 + 3 + ((y / 9) % 2 ? 4 : 0); x < x1; x += 9) {
          rect(m, x, y + 1, x + 2, y + 1, hex('#5fd0b0'), 90);
          rect(m, x + 1, y, x + 1, y + 2, hex('#5fd0b0'), 90);
        }
      let yy = cy + 12;
      for (let x = x0; x <= x1; x++) {
        const k = x - x0;
        const dy = k % 18 === 8 ? -8 : k % 18 === 9 ? 6 : k % 18 === 10 ? -3 : 0;
        put(m, x, yy + dy, hex('#aaffdd'));
        if (dy) for (let t = 0; t !== dy; t += Math.sign(dy)) put(m, x, yy + t, hex('#aaffdd'));
      }
      glow(m, cx, cy - 3, 18, hex('#e8fff6'), 110, x0, y0, x1, y1);
      yy = 0;
      break;
    }
    case 'stage':
    case 'screen':
    case 'music': {
      vgrad(m, x0, y0, x1, y1, '#12060e', '#2a0c1c');
      for (let y = y0; y <= y1; y++) {
        const w = Math.max(0, 10 - Math.floor((y - y0) / 6));
        rect(m, x0, y, x0 + w + 2, y, hex('#8a1020'));
        rect(m, x1 - w - 2, y, x1, y, hex('#8a1020'));
        if ((y - y0) % 3 === 0) {
          put(m, x0 + w + 2, y, hex('#c02a3a'));
          put(m, x1 - w - 2, y, hex('#c02a3a'));
        }
      }
      rect(m, x0, y0, x1, y0 + 3, hex('#b01828'));
      for (let x = x0; x <= x1; x += 3) put(m, x, y0 + 4, hex('#ffcf5a'));
      for (let y = y0 + 4; y <= y1; y++) {
        const half = (y - y0) * 0.45;
        rect(m, Math.round(cx - half), y, Math.round(cx + half), y, hex(th === 'music' ? '#a0e0ff' : '#fff2b0'), 55);
      }
      rect(m, x0, y1 - 3, x1, y1, hex('#3a2010'));
      if (th === 'screen') for (let x = x0 + 2; x < x1; x += 4) rect(m, x, y1 - 1, x + 1, y1, hex('#fff'));
      break;
    }
    case 'press': {
      vgrad(m, x0, y0, x1, y1, '#1a1a1e', '#3a3a44');
      for (let y = y0 + 2; y < y1; y += 4) for (let x = x0 + 2; x < x1 - 2; x++) if (r() < 0.6) put(m, x, y, hex('#8a8a98'), 110);
      rays(m, x1, y0, x0, y0, x1, y1, hex('#fff7cf'), 6, 40);
      rect(m, x0 + 2, y0 + 2, x1 - 2, y0 + 6, hex('#e8e0d0'), 200);
      break;
    }
    case 'sports': {
      vgrad(m, x0, y0, x1, y1, '#0a1640', '#1d2f70');
      for (let i = 0; i < 4; i++) {
        const lx = x0 + 6 + i * 14;
        rect(m, lx, y0 + 2, lx + 3, y0 + 4, hex('#fffbe0'));
        for (let y = y0 + 5; y < y1 - 10; y++) put(m, lx + 1 + Math.round((y - y0) * (cx - lx) / H), y, hex('#fffbe0'), 70);
      }
      for (let y = y1 - 16; y < y1 - 9; y++) for (let x = x0; x <= x1; x++) put(m, x, y, hex(r() < 0.5 ? '#c04040' : r() < 0.5 ? '#4060c0' : '#e0c040'));
      vgrad(m, x0, y1 - 9, x1, y1, '#2f8a3a', '#1f6a2a', 3);
      for (let x = x0; x <= x1; x += 6) rect(m, x, y1 - 9, x + 2, y1, hex('#3aa04a'), 120);
      break;
    }
    case 'craft': {
      vgrad(m, x0, y0, x1, y1, '#140a06', '#3a1a0a');
      glow(m, cx, y1 - 4, 26, hex('#ff8a2a'), 160, x0, y0, x1, y1);
      for (let i = 0; i < 30; i++) {
        const sx = cx + (r() - 0.5) * W;
        const sy = y1 - r() * H;
        put(m, sx, sy, hex(r() < 0.5 ? '#ffd24a' : '#ff7a2a'));
        if (r() < 0.4) put(m, sx + 1, sy - 1, hex('#ffe9a0'));
      }
      rect(m, x0 + 12, y1 - 4, x1 - 12, y1, hex('#2a2a30'));
      break;
    }
    case 'service': {
      vgrad(m, x0, y0, x1, y1, '#2a1410', '#5a2e1a');
      for (let i = 0; i < 6; i++) {
        const lx = x0 + 4 + i * 10;
        const ly = y0 + 4 + (i % 2) * 4;
        put(m, lx + 1, ly - 2, hex('#3a2a20'));
        rect(m, lx, ly, lx + 3, ly + 4, hex('#ff5a3a'));
        rect(m, lx + 1, ly + 1, lx + 2, ly + 3, hex('#ffd07a'));
        glow(m, lx + 1.5, ly + 2, 6, hex('#ffb04a'), 80, x0, y0, x1, y1);
      }
      rect(m, x0, y1 - 5, x1, y1, hex('#6a3a1e'));
      for (let x = x0; x <= x1; x += 4) put(m, x, y1 - 5, hex('#8a5a2e'));
      break;
    }
    case 'hero': {
      vgrad(m, x0, y0, x1, y1, '#1a0404', '#6a1406');
      for (let x = x0; x <= x1; x++) {
        const h = 8 + Math.floor(r() * 16);
        for (let y = y1; y > y1 - h; y--) {
          const t = (y1 - y) / h;
          put(m, x, y, mix(hex('#ffe060'), hex('#d02010'), t), 230);
        }
      }
      glow(m, cx, cy, 18, hex('#fff0b0'), 120, x0, y0, x1, y1);
      break;
    }
    case 'faith': {
      vgrad(m, x0, y0, x1, y1, '#140c24', '#2a1a44');
      const cols = ['#e04a4a', '#4a8ae0', '#e0c04a', '#4ac08a', '#a04ae0'];
      for (let y = y0 + 2; y < y1 - 6; y += 5)
        for (let x = x0 + 2; x < x1 - 2; x += 5) {
          const d = Math.hypot(x + 2 - cx, y + 2 - (y0 + 16));
          if (d < 20) rect(m, x, y, x + 3, y + 3, hex(cols[Math.floor(r() * cols.length)]), 150);
        }
      rays(m, cx, y0, x0, y0, x1, y1, hex('#fff6d0'), 7, 50);
      break;
    }
    case 'nature': {
      vgrad(m, x0, y0, x1, y1, '#6ab6e8', '#d8f0c8');
      glow(m, x1 - 12, y0 + 10, 10, hex('#fff6b0'), 220, x0, y0, x1, y1);
      for (let x = x0; x <= x1; x++) {
        const h1 = 10 + Math.round(Math.sin((x - x0) / 7) * 3);
        for (let y = y1 - h1; y <= y1; y++) put(m, x, y, hex(y > y1 - 5 ? '#4a8a2a' : '#6aaa3a'));
      }
      for (let i = 0; i < 12; i++) put(m, x0 + Math.floor(r() * W), y1 - Math.floor(r() * 6), hex(r() < 0.5 ? '#ffe070' : '#ff90a0'));
      break;
    }
    case 'family': {
      vgrad(m, x0, y0, x1, y1, '#f08a5a', '#ffd9a0');
      glow(m, cx, y1 - 10, 18, hex('#fff2c0'), 200, x0, y0, x1, y1);
      rect(m, cx - 8, y1 - 10, cx + 8, y1 - 1, hex('#6a3a2a'));
      for (let i = 0; i <= 9; i++) rect(m, cx - 9 + i, y1 - 11 - i, cx + 9 - i, y1 - 11 - i, hex('#3a2a3a'));
      rect(m, cx - 2, y1 - 6, cx + 1, y1 - 1, hex('#ffd060'));
      rect(m, x0, y1, x1, y1, hex('#4a6a2a'));
      break;
    }
  }
}

// ───────────────────────── 액자 ─────────────────────────

const FRAMES: Record<Rarity, { dark: string; mid: string; light: string; gem: string; plate: string }> = {
  legend: { dark: '#5a3200', mid: '#e0a000', light: '#fff0a0', gem: '#ff3a4a', plate: '#2a1a00' },
  epic: { dark: '#2a0a52', mid: '#9a4ae8', light: '#e8c8ff', gem: '#3affd0', plate: '#1a0a2e' },
  rare: { dark: '#0a2452', mid: '#3a86e8', light: '#c8e4ff', gem: '#ffe04a', plate: '#0a1a2e' },
  common: { dark: '#3a3a44', mid: '#a8a8b8', light: '#f0f0f8', gem: '#8adfff', plate: '#1e1e26' },
};

function frame(m: Img, rar: Rarity) {
  const f = FRAMES[rar];
  const D = hex(f.dark);
  const M = hex(f.mid);
  const L = hex(f.light);
  // 바깥 테두리 4px: 어두운 선 - 중간 - 밝은 선 - 중간
  for (let i = 0; i < 4; i++) {
    const c = i === 0 ? D : i === 2 ? L : M;
    rect(m, i, i, CW - 1 - i, i, c);
    rect(m, i, CH - 1 - i, CW - 1 - i, CH - 1 - i, i === 2 ? mix(L, M, 0.5) : c);
    rect(m, i, i, i, CH - 1 - i, c);
    rect(m, CW - 1 - i, i, CW - 1 - i, CH - 1 - i, i === 2 ? mix(L, M, 0.5) : c);
  }
  // 전설: 테두리에 금 장식 무늬
  if (rar === 'legend')
    for (let i = 6; i < CW - 6; i += 4) {
      put(m, i, 1, L);
      put(m, i, CH - 2, L);
    }
  // 이름판 (위) 과 설명판 (아래)
  rect(m, 4, 4, CW - 5, 12, hex(f.plate));
  rect(m, 4, 13, CW - 5, 13, D);
  rect(m, 4, 62, CW - 5, 62, D);
  rect(m, 4, 63, CW - 5, CH - 5, hex(f.plate));
  // 코너 보석
  const G = hex(f.gem);
  for (const [gx, gy] of [[2, 2], [CW - 5, 2], [2, CH - 5], [CW - 5, CH - 5]] as [number, number][]) {
    rect(m, gx - 1, gy - 1, gx + 3, gy + 3, D);
    rect(m, gx, gy, gx + 2, gy + 2, G);
    put(m, gx, gy, mix(G, [255, 255, 255], 0.7));
  }
  // 그림창 안쪽 테두리
  rect(m, 4, 14, 4, 61, D);
  rect(m, CW - 5, 14, CW - 5, 61, D);
}

// ───────────────────────── 공개 함수 ─────────────────────────

/** 카드 앞면 (잠김이면 실루엣) */
export function cardFrontURL(id: string, icon: string, theme: Theme, rar: Rarity, locked = false): string {
  const key = `f:${id}:${locked}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const m = img(CW, CH);
  scene(m, theme, hash(id), 5, 14, CW - 6, 61);
  if (locked) {
    for (let i = 0; i < m.d.length; i += 4) {
      const g = Math.round((m.d[i] * 0.3 + m.d[i + 1] * 0.5 + m.d[i + 2] * 0.2) * 0.35);
      m.d[i] = m.d[i + 1] = m.d[i + 2] = g;
    }
    stamp(m, icon, CW / 2, 37, 20, 2, [14, 10, 18]);
    frame(m, 'common');
  } else {
    stamp(m, icon, CW / 2, 37, 20, 2);
    frame(m, rar);
  }
  const u = toURL(m);
  cache.set(key, u);
  return u;
}

/** 카드 뒷면: 격자 무늬 + 가운데 원형 문장 자리 (글자는 화면에서 얹는다) */
export function cardBackURL(rar: Rarity): string {
  const key = `b:${rar}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const m = img(CW, CH);
  const f = FRAMES[rar];
  const D = hex(f.plate);
  const M = hex(f.mid);
  const L = hex(f.light);
  rect(m, 0, 0, CW - 1, CH - 1, D);
  for (let y = 0; y < CH; y++)
    for (let x = 0; x < CW; x++) {
      const u = (x + y) % 8;
      const v = (x - y + 800) % 8;
      if (u === 0 || v === 0) put(m, x, y, M, 110);
      if ((x + y) % 16 === 8 && (x - y + 800) % 16 === 8) put(m, x, y, L);
    }
  const cx = CW / 2;
  const cy = CH / 2;
  for (let y = -17; y <= 17; y++)
    for (let x = -17; x <= 17; x++) {
      const d = Math.hypot(x, y);
      if (d <= 17) put(m, cx + x, cy + y, d > 15 ? L : d > 13 ? M : D);
    }
  // 월계수
  for (let a = 0.4; a < Math.PI - 0.4; a += 0.28) {
    for (const s of [-1, 1]) {
      const lx = cx + s * Math.cos(a) * 21;
      const ly = cy + Math.sin(a) * 21 - 2;
      rect(m, lx - 1, ly, lx + 1, ly + 1, hex('#6ac04a'));
      put(m, lx, ly - 1, hex('#aef08a'));
    }
  }
  frame(m, rar);
  rect(m, 4, 4, CW - 5, 12, hex(f.plate));
  rect(m, 4, 63, CW - 5, CH - 5, hex(f.plate));
  const u = toURL(m);
  cache.set(key, u);
  return u;
}

/** 시너지 방패 엠블럼 32×36 */
export function crestURL(id: string, icons: [string, string], theme: Theme, active: boolean): string {
  const key = `s:${id}:${active}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const W = 32;
  const H = 36;
  const m = img(W, H);
  const inside = (x: number, y: number) => {
    if (y < 2 || y > H - 2) return false;
    const half = y < 22 ? 14 : 14 - ((y - 22) * 14) / 13;
    return Math.abs(x - 15.5) <= half;
  };
  const tmp = img(W, H);
  scene(tmp, theme, hash(id), 0, 0, W - 1, H - 1);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (inside(x, y)) {
        let c = get(tmp, x, y);
        if (!active) {
          const g = Math.round((c[0] + c[1] + c[2]) / 3 * 0.45);
          c = [g, g, g];
        }
        put(m, x, y, c);
      }
  stamp(m, icons[0], 10, 16, 10, 1, active ? undefined : [30, 26, 34]);
  stamp(m, icons[1], 22, 16, 10, 1, active ? undefined : [30, 26, 34]);
  // 방패 테두리
  const edge = hex(active ? '#ffd24a' : '#6a6a78');
  const edgeD = hex(active ? '#7a4a00' : '#2a2a30');
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (!inside(x, y) && (inside(x + 1, y) || inside(x - 1, y) || inside(x, y + 1) || inside(x, y - 1))) put(m, x, y, edgeD);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (inside(x, y) && (!inside(x + 1, y) || !inside(x - 1, y) || !inside(x, y - 1) || !inside(x, y + 1))) put(m, x, y, edge);
  if (active) {
    put(m, 15, 0, hex('#fff6b0'));
    put(m, 16, 0, hex('#fff6b0'));
    rect(m, 14, 1, 17, 1, edge);
  }
  const u = toURL(m);
  cache.set(key, u);
  return u;
}
