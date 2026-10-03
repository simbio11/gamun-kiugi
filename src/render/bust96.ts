// 인물 창 큰 초상화 (96×96). 얼굴·눈·코·입을 도형 공식으로 그려 해상도가 높아도 매끈하다.
//   얼굴형(턱) 5종 · 눈 모양 5종 × 크기 · 코 4종 × 크기 · 입 5종 × 크기 · 눈썹 모양·굵기 → 사람마다 다른 얼굴
//   턱은 유전(부모 중 한쪽), 나머지는 유전자 + 사람마다 조금씩
//   옷은 48칸 초상화의 옷을 Scale2x로 키워 그대로 입힌다 (직업 옷·무늬가 같다)
import type { Person } from '../core/types';
import { body48, looks96, mix, type Face } from './bust';

type Px = string | null;
const N = 96;
const BLUSH = '#f4a0a8';

class G {
  c: Px[][] = Array.from({ length: N }, () => Array(N).fill(null));
  m: (string | null)[][] = Array.from({ length: N }, () => Array(N).fill(null));
  outs: Record<string, string> = {};
  set(x: number, y: number, col: string, mat: string) {
    x = Math.floor(x);
    y = Math.floor(y);
    if (x < 0 || y < 0 || x >= N || y >= N) return;
    this.c[y][x] = col;
    this.m[y][x] = mat;
  }
  get(x: number, y: number) {
    return x < 0 || y < 0 || x >= N || y >= N ? null : this.m[y][x];
  }
  ellipse(cx: number, cy: number, rx: number, ry: number, col: string, mat: string) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.set(x, y, col, mat);
      }
  }
  outline() {
    const add: [number, number, string][] = [];
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
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

const JAW_F = ['v', 'oval', 'round', 'oval', 'long'] as const;
const JAW_M = ['square', 'oval', 'round', 'long', 'square'] as const;
type Jaw = 'v' | 'oval' | 'round' | 'square' | 'long';
const JAW: Record<Jaw, [number, number]> = { v: [0.2, 1.35], oval: [0.33, 2], round: [0.46, 2.7], square: [0.62, 5], long: [0.36, 2.3] };

export function paint96(p: Person, age: number, year: number, face: Face = 'normal', blink = false): Px[][] {
  const L = looks96(p, age, year);
  const { st, f, skin, hair, eye, style, fringe, h } = L;
  const g = new G();
  const cx = 48;
  const kid = st === 'baby' || st === 'child';
  const gn = p.genes;
  // ── 얼굴 틀 ──
  const jaw: Jaw = kid ? 'round' : (f ? JAW_F : JAW_M)[((gn.face ?? 0) * 2 + ((h >>> 13) & 1)) % 5];
  let W = st === 'baby' ? 20 : st === 'child' ? 19 : st === 'teen' ? 17.5 : 18.5;
  if (f) W -= 1;
  if (!kid) W += (((h >>> 16) % 3) - 1) * 0.8;
  let faceH = st === 'baby' ? 31 : st === 'child' ? 35 : st === 'teen' ? 39 : 42;
  if (f) faceH -= 1;
  if (jaw === 'long') faceH += 3;
  const y0 = st === 'baby' ? 37 : st === 'child' ? 31 : st === 'teen' ? 26 : 24;
  const [cw, k] = JAW[jaw];
  const chinW = W * (kid ? 0.48 : cw);
  const halfW = (y: number) => {
    const t = (y - y0) / faceH;
    if (t < 0 || t > 1) return -1;
    if (t < 0.42) return W * Math.sqrt(Math.max(0, 1 - ((0.42 - t) / 0.47) ** 2));
    const u = (t - 0.42) / 0.58;
    let w = chinW + (W - chinW) * (1 - u ** k);
    if (u > 0.86) w *= Math.sqrt(Math.max(0, (1 - u) / 0.14));
    return w;
  };
  const inFace = (x: number, y: number) => {
    const w = halfW(y + 0.5);
    return w > 0 && Math.abs(x + 0.5 - cx) <= w;
  };
  const chinY = y0 + faceH;
  const eyeY = Math.round(y0 + faceH * (kid ? 0.53 : 0.47));
  g.outs = { hair: hair.out, skin: skin.out, neck: skin.out, cloth: L.clothOut, cloth2: '#3a3440', acc: '#2a2230', eye: '#2a1822', mouth: skin.out };

  // ── 머리 설계 ──
  const vol = style === 'perm' || style === 'curly' ? 3 : f ? 1.5 : style === 'buzz' ? -1.5 : 0.5;
  const capCy = y0 + 12;
  const capRx = W + 2.5 + vol;
  const capRy = 17 + vol;
  const capTop = capCy - capRy;
  const inCap = (x: number, y: number) => ((x + 0.5 - cx) / capRx) ** 2 + ((y + 0.5 - capCy) / capRy) ** 2 <= 1;
  const jag = (x: number) => [0, 1, 2, 1][(x + (h & 3)) & 3];
  const flip = (h >>> 5) & 1 ? 1 : -1;
  const fringeY = (x: number): number => {
    const dx = x + 0.5 - cx;
    switch (fringe) {
      case 'bangs': return y0 + 12 - jag(x) + (Math.abs(dx) > W - 4 ? 2 : 0);
      case 'part': return Math.min(y0 + 16, y0 + 3 + Math.abs(dx - flip * 2) * 0.85);
      case 'side': { const t = (dx * flip + W) / (2 * W); return y0 + 2 + t * 13 + jag(x) * 0.5; }
      case 'spiky': { const q = ((x + 40) % 6) / 6; return y0 + 5 + (q < 0.5 ? q : 1 - q) * 10; }
      case 'short': return y0 + 5 + jag(x) * 0.6;
      case 'bowl': return y0 + 10;
      case 'curl': return y0 + 7 + Math.round(Math.sin(x * 0.9) * 1.5);
      case 'tuft': return y0 + 1;
      default: return y0 + 3;
    }
  };
  const H = (x: number, y: number) => g.set(x, y, hair.base, 'hair');

  // ── 1) 옷 (48칸 옷을 두 배로) ──
  const bodyTop = chinY + (kid ? 4 : 5);
  body48(p, age, year, g, bodyTop);

  // ── 2) 뒷머리 (긴 머리는 어깨 앞으로 흘러내린다) ──
  const backEnd: Record<string, number> = { long: 95, hime: 95, wavy: 92, braid: chinY + 4, bob: chinY - 1, perm: chinY - 4 };
  const neckHalf = W * (f || kid ? 0.4 : 0.47);
  if (backEnd[style] !== undefined) {
    const end = backEnd[style];
    for (let y = y0 + 4; y <= end; y++) {
      let bw = W + 3 + vol + (y > chinY ? Math.min(3, (y - chinY) * 0.25) : 0);
      if (style === 'wavy') bw += Math.sin(y / 3) * 1.5;
      if (style === 'bob' && y > end - 3) bw -= end - 3 - y + 3;
      for (let x = Math.floor(cx - bw); x < cx + bw; x++) if (y <= chinY || Math.abs(x + 0.5 - cx) > neckHalf + 2) H(x, y);
    }
  }
  if (style === 'twin' || style === 'pony') {
    const sides = style === 'twin' ? [-1, 1] : [flip];
    for (const s of sides)
      for (let y = y0 + 6; y <= y0 + (kid ? 44 : 52); y++) {
        const t = (y - y0 - 6) / 44;
        const w = 3.5 + Math.sin(t * Math.PI) * 2;
        const x0 = cx + s * (W + 4 + Math.sin(t * 3) * 1.5);
        for (let x = Math.floor(x0 - w); x < x0 + w; x++) H(x, y);
      }
  }

  // ── 3) 목·얼굴·귀 ──
  for (let y = chinY - 6; y <= bodyTop + 1; y++) for (let x = Math.floor(cx - neckHalf); x < cx + neckHalf; x++) g.set(x, y, y < chinY + 3 ? skin.sh : skin.base, 'neck');
  for (let y = y0; y <= chinY; y++) for (let x = cx - 30; x < cx + 30; x++) if (inFace(x, y)) g.set(x, y, skin.base, 'skin');
  for (const s of [-1, 1]) {
    const ex = cx + s * (W + 0.3);
    g.ellipse(ex, eyeY + 2.5, 2.4, 4.2, skin.base, 'skin');
    g.set(ex + s * 0.5, eyeY + 2, skin.sh, 'skin'), g.set(ex + s * 0.5, eyeY + 3, skin.sh, 'skin'), g.set(ex, eyeY + 4, skin.sh, 'skin');
  }
  // 음영: 오른쪽 볼·턱 아래, 왼쪽 볼 빛
  for (let y = y0; y <= chinY; y++)
    for (let x = cx - 30; x < cx + 30; x++) {
      if (g.get(x, y) !== 'skin' || !inFace(x, y)) continue;
      const w = halfW(y + 0.5);
      const t = (y - y0) / faceH;
      if (x + 0.5 - cx > w - 2 - t * 1.5) g.set(x, y, skin.sh, 'skin');
      else if (t > 0.6 && !inFace(x, y + 2)) g.set(x, y, skin.sh, 'skin');
    }
  g.ellipse(cx - W * 0.55, eyeY + 5, 1.6, 1.1, skin.hi, 'skin');
  g.set(cx - W * 0.3, y0 + 5, skin.hi, 'skin');

  // ── 4) 정수리·옆머리·앞머리 ──
  // 앞머리는 눈썹 위에서 멈춘다 (얼굴·눈을 가리지 않게)
  const browLine = eyeY - (kid ? 7 : f ? 7 : 6);
  const sideLimit = f ? eyeY + 12 : style === 'buzz' ? eyeY - 5 : eyeY - 2;
  for (let y = Math.floor(capTop) - 1; y <= eyeY + 14; y++)
    for (let x = cx - 32; x < cx + 32; x++) {
      if (!inCap(x, y)) continue;
      if (style === 'bald') {
        if (!inFace(x, y) && y > y0 + 8 && y < eyeY + 2) H(x, y);
        continue;
      }
      if (style === 'mohawk' && Math.abs(x + 0.5 - cx) > 4 && y < y0 + 6) continue;
      if (inFace(x, y) ? y < Math.min(fringeY(x), browLine) : y < sideLimit) H(x, y);
    }
  // 앞머리 옆 가닥 (여자): 얼굴선 바깥을 따라 흘러내린다
  if (f && style !== 'bun' && style !== 'pony' && style !== 'baby')
    for (let y = y0 + 8; y <= eyeY + 10; y++) {
      const w = halfW(y + 0.5);
      for (const s of [-1, 1]) for (let kk = 0; kk < 2.5; kk++) H(cx + s * (w + kk) - (s > 0 ? 0 : 1), y);
    }
  if (style === 'spiky' || style === 'messy' || style === 'mohawk')
    for (let i = 0; i < 5; i++) {
      const sx = cx - 12 + i * 6 + (h >> (i + 2)) % 3;
      const ht = 4 + ((h >> (i * 2)) % 3);
      for (let j = 0; j < ht; j++) for (let x = sx - (ht - j) * 0.5; x < sx + (ht - j) * 0.5; x++) H(x + j * 0.4, capTop + 1 - j);
    }
  if (style === 'bun') g.ellipse(cx, capTop - 2, 7, 5.5, hair.base, 'hair');
  if (style === 'curly' || style === 'perm')
    for (let a = 0; a < 22; a++) {
      const ang = Math.PI * 0.9 + (a / 21) * Math.PI * 1.2;
      g.ellipse(cx + Math.cos(ang) * capRx, capCy + Math.sin(ang) * capRy, 2.2, 2.2, hair.base, 'hair');
    }
  if (style === 'baby') for (let j = 0; j < 5; j++) H(cx + j * 0.6, y0 - 1 - j);

  // 머리 명암: 가닥 결 · 오른쪽 그늘 · 끝 그늘 · 천사의 고리
  const shade: [number, number, string][] = [];
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      if (g.get(x, y) !== 'hair') continue;
      const below = g.get(x, y + 1);
      const lean = Math.floor(y * 0.2);
      let c = hair.base;
      if ((x - cx + 60 + lean) % 5 === 0 && y > capTop + 7) c = hair.sh;
      if (x + 0.5 - cx > capRx * 0.5) c = hair.sh;
      if (below === 'skin') c = hair.out;
      else if (below !== 'hair') c = hair.sh;
      else if (g.get(x - 1, y) !== 'hair' && y < capCy) c = hair.hi;
      const ringY = capTop + 7 + ((x + 0.5 - cx) / capRx) ** 2 * 5;
      if (Math.abs(y + 0.5 - ringY) < 0.9 && x - cx > -capRx * 0.75 && x - cx < capRx * 0.45 && (x - cx + 60) % 6 !== 0 && c === hair.base) c = hair.hi;
      shade.push([x, y, c]);
    }
  for (const [x, y, c] of shade) g.set(x, y, c, 'hair');
  // 머리 그림자가 이마에 드리운다
  for (let y = y0; y < chinY; y++) for (let x = cx - 30; x < cx + 30; x++) if (g.get(x, y) === 'skin' && (g.get(x, y - 1) === 'hair' || g.get(x, y - 2) === 'hair')) g.set(x, y, skin.sh, 'skin');

  // ── 5) 이목구비 ──
  const eh0 = kid ? (st === 'baby' ? 4.6 : 4.6) : f ? 3.9 : 3.1;
  const ew0 = kid ? 4.8 : 4.3;
  const sz = ((h >>> 18) % 3) * 0.45;
  const ew = ew0 + sz + (f ? 0.2 : 0);
  const eh = eh0 + sz * 0.6;
  const shapeI = ((gn.eyes ?? 0) + (h >>> 20)) % 5;
  const tilt = [0, 0.16, -0.14, 0.28, 0.05][shapeI];
  const pe = [2, 1.7, 2, 1.55, 2.4][shapeI];
  const sep = W * 0.44 + ((h >>> 22) % 3) * 0.4;
  const K = st === 'elder' ? '#4a3a3a' : '#2a1822';
  const eyeD = mix(eye, 0.5);
  const eyeL = mix(eye, 1.45);
  const closed = blink || face === 'sleep';
  // 눈썹
  const browC = st === 'elder' ? '#a8a29c' : mix(hair.base, 0.6);
  const bt = f || kid ? 1 : 2;
  const arch = [1.2, 0.5, 1.8][(gn.brows ?? 0) % 3];
  const btilt = [0.1, -0.12, 0][(gn.brows ?? 0) % 3] + (face === 'angry' ? -0.35 : face === 'sad' ? 0.3 : 0);
  for (const s of [-1, 1]) {
    const ex = cx + s * sep;
    for (let u = -ew + 0.5; u <= ew + 1.5; u++) {
      const nu = (u - 0.5) / (ew + 1);
      const y = eyeY - eh - 3.2 - arch * (1 - nu * nu) - btilt * u - (face === 'shock' ? 2 : 0);
      for (let t = 0; t < bt + (u < ew * 0.3 && (gn.brows ?? 0) !== 2 ? 1 : 0); t++) g.set(ex + s * u, y + t, browC, 'eye');
    }
  }
  // 눈
  for (const s of [-1, 1]) {
    const ex = cx + s * sep;
    const inEye = (x: number, y: number) => {
      const u = (x + 0.5 - ex) * s;
      const v = y + 0.5 - eyeY + tilt * u;
      return Math.abs(u / ew) ** pe + Math.abs(v / eh) ** 2 <= 1;
    };
    if (closed || face === 'happy' || face === 'cry') {
      const up = face === 'happy' || face === 'cry';
      for (let u = -ew; u <= ew; u++) {
        const nu = u / ew;
        const y = eyeY + (up ? -1 - (1 - nu * nu) * 1.6 : 1 + (1 - nu * nu) * 1.3) - tilt * u * 0.5;
        g.set(ex + s * u, y, K, 'eye'), g.set(ex + s * u, y + 1, K, 'eye');
      }
      if (f && !kid) g.set(ex + s * (ew + 1), eyeY - tilt * ew * 0.5, K, 'eye');
      continue;
    }
    const ri = Math.min(eh * 1.12, ew * 0.72);
    const ix = ex - s * 0.4;
    for (let y = Math.floor(eyeY - eh - 3); y <= eyeY + eh + 3; y++)
      for (let x = Math.floor(ex - ew - 2); x <= ex + ew + 2; x++) {
        if (!inEye(x, y)) continue;
        const dx = x + 0.5 - ix;
        const dy = y + 0.5 - eyeY;
        let c = '#fffaf4';
        if (dx * dx + dy * dy <= ri * ri) {
          const t = (dy + ri) / (2 * ri);
          c = t < 0.35 ? eyeD : t < 0.7 ? eye : eyeL;
          if (dx * dx + dy * dy <= (ri * 0.38) ** 2) c = mix(eye, 0.3);
        }
        if (!inEye(x, y - 1) || (!inEye(x, y - 2) && (f || kid))) c = K;
        else if (!inEye(x, y + 1) && Math.abs(x + 0.5 - ex) < ew * 0.7) c = mix(skin.out, 1.15);
        g.set(x, y, c, 'eye');
      }
    // 반짝이: 위 안쪽에 큰 것, 아래 바깥에 작은 것
    g.set(ix + s * 0.8 - 1, eyeY - ri * 0.45, '#ffffff', 'eye');
    g.set(ix + s * 0.8, eyeY - ri * 0.45, '#ffffff', 'eye');
    g.set(ix + s * 0.8 - 1, eyeY - ri * 0.45 + 1, '#ffffff', 'eye');
    g.set(ix - s * ri * 0.4, eyeY + ri * 0.45, '#ffffff', 'eye');
    // 속눈썹 꼬리 (여자·아이)
    if ((f || kid) && st !== 'elder') {
      const oy = eyeY - tilt * ew - eh * 0.2;
      g.set(ex + s * (ew + 0.5), oy - 1, K, 'eye'), g.set(ex + s * (ew + 1.5), oy - 2, K, 'eye');
      if (f && !kid) g.set(ex + s * (ew + 1.5), oy - 1, K, 'eye');
    }
    if (face === 'love') for (const [a, b] of [[-1, -1], [1, -1], [0, 0], [-2, 0], [2, 0], [-1, 1], [1, 1], [0, 2], [-1, 0], [1, 0]]) g.set(ix + a, eyeY + b, '#e8506a', 'eye');
  }
  // 볼터치
  if (f || kid || face === 'love' || face === 'happy' || (gn.mark ?? 0) === 4)
    for (const s of [-1, 1]) g.ellipse(cx + s * (sep + 1), eyeY + eh + 4, 2.8, 1.2, (f || kid) ? BLUSH : mix(BLUSH, 0.93), 'skin');
  // 코
  const noseI = ((h >>> 24) + (gn.mouth ?? 0)) % 4;
  const nl = kid ? 2 : 3 + ((h >>> 26) % 3);
  const ny = Math.round(eyeY + (kid ? 6 : faceH * 0.2));
  const S = (x: number, y: number, c = skin.sh) => g.set(x, y, c, 'skin');
  if (noseI === 0) S(cx + 1, ny), S(cx, ny + 1), S(cx + 1, ny + 1);
  else if (noseI === 1) { for (let y = ny - nl - 2; y <= ny; y++) S(cx + 1, y); S(cx - 1, ny + 1), S(cx, ny + 1), S(cx + 1, ny + 1); }
  else if (noseI === 2) { S(cx - 1, ny + 1), S(cx, ny + 1), S(cx + 1, ny + 1), S(cx - 2, ny, mix(skin.sh, 0.9)), S(cx + 2, ny, mix(skin.sh, 0.9)); }
  else { for (let i = 0; i <= nl; i++) S(cx + Math.round(i * 0.5), ny - nl + i); S(cx - 1, ny + 1), S(cx, ny + 1); }
  S(cx - 1, ny - 2, skin.hi);
  // 입
  const mouthI = ((gn.mouth ?? 0) + ((h >>> 27) & 1) * 2) % 5;
  const mw = (kid ? 2 : f ? 2.8 : 3.4) + ((h >>> 28) % 3) * 0.6;
  const my = Math.round(eyeY + (kid ? 10 : faceH * 0.34));
  const lineC = mix(skin.out, 1.15);
  const lipC = f && !kid && st !== 'elder' ? '#d0586a' : mix(skin.sh, 0.92);
  const M = (x: number, y: number, c = lineC) => g.set(x, y, c, 'mouth');
  const curve = (curv: number, w = mw) => {
    for (let x = Math.floor(cx - w); x <= cx + w - 1; x++) {
      const dx = (x + 0.5 - cx) / w;
      M(x, my - Math.round(curv * dx * dx));
    }
  };
  if (face === 'shock') g.ellipse(cx, my + 1, 2, 2.5, '#6a2a32', 'mouth');
  else if (face === 'happy' || face === 'money' || face === 'love') { curve(2, mw + 1); for (let x = Math.floor(cx - mw + 1); x < cx + mw - 1; x++) M(x, my + 1, '#e86a78'), M(x, my + 2, lineC); }
  else if (face === 'sad' || face === 'cry') curve(-1.6);
  else if (face === 'angry') { curve(-0.6); for (let x = Math.floor(cx - mw); x < cx + mw; x++) M(x, my + 1, '#ffffff'); }
  else if (mouthI === 0) curve(1.4);
  else if (mouthI === 1) { curve(0.4); if (f) for (let x = Math.floor(cx - mw * 0.6); x < cx + mw * 0.6; x++) M(x, my + 1, lipC); }
  else if (mouthI === 2) curve(1.4, mw * 0.65);
  else if (mouthI === 3) { curve(1.8); for (let x = Math.floor(cx - mw * 0.5); x < cx + mw * 0.5; x++) M(x, my + 1, f ? lipC : skin.sh); }
  else { curve(0.2, mw * 1.1); M(cx - mw * 1.1 - 1, my - 1); M(cx + mw * 1.1, my - 1); }
  if (!f && !kid) for (let x = Math.floor(cx - 1.5); x < cx + 1.5; x++) S(x, my + 3); // 아랫입술 그늘

  // ── 6) 나이·개인 특징 ──
  const mark = gn.mark ?? 0;
  if (st === 'elder') {
    for (const s of [-1, 1]) {
      const ex = cx + s * sep;
      S(ex + s * (ew + 1), eyeY + 1), S(ex + s * (ew + 2), eyeY + 2), S(ex + s * (ew + 1), eyeY + 3);
      for (let i = 0; i < 5; i++) S(cx + s * (3 + i * 0.4), ny + 1 + i);
    }
    for (let x = cx - 5; x < cx + 5; x++) if (x % 3) S(x, y0 + 5), S(x + 1, y0 + 7);
  }
  if (mark === 2) for (const [a, b] of [[-9, 4], [-7, 5], [-10, 6], [7, 4], [9, 5], [6, 6], [-8, 7], [8, 7]]) S(cx + a, eyeY + eh + b - 1, mix(skin.sh, 0.85));
  if (mark === 3) g.set(cx + mw + 2, my + 2, '#5a3a30', 'skin');
  if (!f && !kid && st !== 'teen' && (h >>> 11) % 4 === 0) {
    const mc = st === 'elder' ? '#d0ccc6' : hair.base;
    for (let x = Math.floor(cx - mw - 1); x <= cx + mw; x++) g.set(x, my - 2, mc, 'hair'), Math.abs(x + 0.5 - cx) > 1.5 && g.set(x, my - 1, mc, 'hair');
  }
  if (!f && st === 'adult' && (h >>> 9) % 3 === 0) for (let y = my + 2; y < chinY - 1; y++) for (let x = cx - 12; x < cx + 12; x++) if ((x + y) % 2 === 0 && inFace(x, y) && g.get(x, y) === 'skin' && Math.abs(x + 0.5 - cx) > 2) S(x, y, mix(skin.sh, 0.9));
  // 턱수염: 48칸 초상화와 같은 유전 비트 (1·3 염소수염, 2 덥수룩한 턱수염)
  const beard = !f && (st === 'elder' || (st === 'adult' && age >= 28)) ? (h >>> 13) % 7 : 0;
  if (beard >= 1 && beard <= 3) {
    const bc = st === 'elder' ? '#d0ccc6' : hair.base;
    if (beard === 3) for (let x = Math.floor(cx - mw - 1); x <= cx + mw; x++) g.set(x, my - 2, bc, 'hair');
    for (let y = my + 2; y <= chinY + 1; y++)
      for (let x = cx - 14; x < cx + 14; x++) {
        const dx = Math.abs(x + 0.5 - cx);
        const full = beard === 2 && (inFace(x, y) || y >= chinY) && (y > my + 1 || dx > mw + 1) && dx < (y >= chinY ? chinW * 0.8 : 14);
        const goat = beard !== 2 && dx < (y >= chinY - 2 ? 2.5 : 3.5) && y >= my + 3;
        if (full || goat) g.set(x, y, (x * 7 + y * 3) % 11 === 0 ? mix(bc, 1.15) : bc, 'hair');
      }
  }
  if (f && !kid && (h >>> 21) % 6 === 0 && mark === 0) g.set(cx - sep - 2, eyeY + eh + 2, '#5a3a30', 'skin'); // 눈물점
  if (f && !kid && (h >>> 10) % 3 !== 0) {
    const E = (h >>> 12) % 2 ? '#f0c848' : '#f4f0f8';
    for (const s of [-1, 1]) g.set(cx + s * (W + 0.5), eyeY + 7, E, 'acc'), g.set(cx + s * (W + 0.5), eyeY + 8, E, 'acc');
  }
  if ((mark === 1 || mark === 5) && st !== 'baby') {
    const Gc = mark === 5 ? '#1a1a24' : st === 'elder' ? '#8a6a3a' : '#3a3444';
    for (const s of [-1, 1]) {
      const ex = cx + s * sep;
      const x0 = Math.floor(ex - ew - 1.5), x1 = Math.ceil(ex + ew + 1.5), yt = Math.floor(eyeY - eh - 1.5), yb = Math.ceil(eyeY + eh + 1.5);
      for (let x = x0; x <= x1; x++) for (let y = yt; y <= yb; y++) {
        const edge = x === x0 || x === x1 || y === yt || y === yb;
        if (edge) g.set(x, y, Gc, 'acc');
        else if (mark === 5) g.set(x, y, y < eyeY - 1 ? '#2a2a3a' : '#3a3a4c', 'acc');
      }
      if (mark === 1) g.set(x0 + 2, yt + 1, '#ffffff', 'acc');
    }
    for (let x = Math.floor(cx - sep + ew + 1.5); x <= cx + sep - ew - 1.5; x++) g.set(x, eyeY - eh - 1, Gc, 'acc');
  }

  g.outline();
  return g.c;
}
