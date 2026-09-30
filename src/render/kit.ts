// 인물 창 큰 초상화 — 그려 온 부품(아틀라스)을 겹쳐 조립한다 (192×192)
//   순서: 옷 → 두상 → 눈 → 코 → 입 → 머리카락
//   부품마다 원래 시트의 축척이 달라서, 두상의 얼굴 폭을 기준으로 크기를 맞춘다
//   피부색이 섞인 부품(옷의 목·코·화장 눈·입술 둘레)은 두상 피부색으로, 머리카락은 유전 머리색으로 다시 칠한다
//   부품은 처음 필요할 때 내려받는다 → 준비 전에는 null (기존 도트 초상화로 대신)
import type { Person } from '../core/types';
import { looks96 } from './bust';
import { pickKit, type KitAtlas, type KitPart, type KitRef } from './kitPick';

const N = 192;
const S = 2; // 두상 확대 배율 (얼굴 폭 ≈ 76px)
const BASE = `${import.meta.env.BASE_URL}portrait/`;

let atlas: KitAtlas | null = null;
let atlasLoading: Promise<void> | null = null;
const sheets = new Map<string, HTMLImageElement>();
const sheetLoading = new Map<string, Promise<void>>();
const cache = new Map<string, string>();
const listeners: (() => void)[] = [];

/** 부품이 준비되면 부를 함수 (인물 창의 초상화를 바꿔 끼우기) */
export function onKitReady(fn: () => void) {
  listeners.push(fn);
}

function loadAtlas(): Promise<void> {
  atlasLoading ??= fetch(BASE + 'atlas.json')
    .then((r) => r.json())
    .then((j: KitAtlas) => {
      atlas = j;
    })
    .catch(() => {
      atlasLoading = null;
    });
  return atlasLoading;
}

function loadSheet(kind: string): Promise<void> {
  let pr = sheetLoading.get(kind);
  if (!pr) {
    pr = new Promise<void>((ok, fail) => {
      const im = new Image();
      im.onload = () => {
        sheets.set(kind, im);
        ok();
      };
      im.onerror = () => {
        sheetLoading.delete(kind);
        fail(new Error(kind));
      };
      im.src = `${BASE}${kind}.webp`;
    });
    sheetLoading.set(kind, pr);
  }
  return pr;
}

const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));

/** 부품 하나를 작은 캔버스로 떼어 온다 */
function partCanvas(ref: KitRef): { cv: HTMLCanvasElement; ctx: CanvasRenderingContext2D; p: KitPart } {
  const p = atlas![ref.kind][ref.i];
  const cv = document.createElement('canvas');
  cv.width = p.w;
  cv.height = p.h;
  const ctx = cv.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(sheets.get(ref.kind)!, p.x, p.y, p.w, p.h, 0, 0, p.w, p.h);
  return { cv, ctx, p };
}

/** 부품에 섞인 피부색(ref)과 가까운 픽셀을 목표 피부색으로 옮긴다 — 명암은 그대로 */
function reskin(ctx: CanvasRenderingContext2D, w: number, h: number, ref: number[] | null | undefined, target: number[], tol: number, maxY = h) {
  if (!ref) return;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const [dr, dg, db] = [target[0] - ref[0], target[1] - ref[1], target[2] - ref[2]];
  for (let y = 0; y < maxY; y++)
    for (let x = 0; x < w; x++) {
      const k = (y * w + x) * 4;
      if (!d[k + 3]) continue;
      const r = d[k], g = d[k + 1], b = d[k + 2];
      if (!(r > g && g > b && r - b > 25 && r > 70 && r - g < 90)) continue;
      if (Math.hypot(r - ref[0], g - ref[1], b - ref[2]) >= tol) continue;
      d[k] = r + dr;
      d[k + 1] = g + dg;
      d[k + 2] = b + db;
    }
  ctx.putImageData(img, 0, 0);
}

/** 머리카락을 유전 머리색으로: 밝기 비율을 지켜 한 색으로 칠한다 (윤곽선은 어두운 채로) */
function recolorHair(ctx: CanvasRenderingContext2D, w: number, h: number, target: number[]) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const lum: number[] = [];
  for (let k = 0; k < d.length; k += 4) if (d[k + 3]) lum.push(0.3 * d[k] + 0.59 * d[k + 1] + 0.11 * d[k + 2]);
  if (!lum.length) return;
  lum.sort((a, b) => a - b);
  const mid = Math.max(30, lum[lum.length >> 1]);
  const tl = 0.3 * target[0] + 0.59 * target[1] + 0.11 * target[2];
  for (let k = 0; k < d.length; k += 4) {
    if (!d[k + 3]) continue;
    const l = 0.3 * d[k] + 0.59 * d[k + 1] + 0.11 * d[k + 2];
    const t = Math.min(1.5, l / mid); // 1 = 머리색 그대로, <1 그늘, >1 윤기 (너무 밝은 점은 하얗게 튀지 않게 누른다)
    for (let j = 0; j < 3; j++) {
      const c = t <= 1 ? target[j] * t : target[j] + (255 - target[j]) * (t - 1) * (tl < 80 ? 0.3 : 0.5);
      d[k + j] = c;
    }
  }
  ctx.putImageData(img, 0, 0);
}

/** 머리카락 부품의 얼굴 자리 위쪽 70%를 머리 그늘색으로 채운 판 (가운데서 번져 나가 바깥 배경은 안 칠함) */
function holeFill(hctx: CanvasRenderingContext2D, p: KitPart, skin: number[]): HTMLCanvasElement {
  const [x0, y0, x1, y1] = p.face!;
  const yMax = Math.round(y0 + (y1 - y0) * 0.7);
  const a = hctx.getImageData(0, 0, p.w, p.h).data;
  const cv = document.createElement('canvas');
  cv.width = p.w;
  cv.height = p.h;
  const ctx = cv.getContext('2d')!;
  const out = ctx.createImageData(p.w, p.h);
  const seen = new Uint8Array(p.w * p.h);
  const st: number[] = [];
  const sx = Math.round((x0 + x1) / 2);
  for (let y = Math.max(0, y0 - 2); y < yMax; y++) st.push(y * p.w + sx);
  while (st.length) {
    const k = st.pop()!;
    if (k < 0 || k >= seen.length || seen[k]) continue;
    const x = k % p.w, y = (k - x) / p.w;
    if (x < x0 - 3 || x >= Math.min(x1 + 3, p.w) || y < y0 - 2 || y >= yMax || a[k * 4 + 3]) continue;
    seen[k] = 1;
    out.data.set([skin[0], skin[1], skin[2], 255], k * 4);
    if (x + 1 < p.w) st.push(k + 1);
    if (x > 0) st.push(k - 1);
    st.push(k + p.w, k - p.w);
  }
  ctx.putImageData(out, 0, 0);
  return cv;
}

function place(dst: CanvasRenderingContext2D, src: HTMLCanvasElement, x: number, y: number, k: number, flip = false) {
  dst.imageSmoothingEnabled = k < 1; // 줄일 때만 부드럽게, 키울 때는 도트 그대로
  dst.imageSmoothingQuality = 'high';
  const w = src.width * k;
  const h = src.height * k;
  if (flip) {
    dst.save();
    dst.translate(Math.round(x + w), Math.round(y));
    dst.scale(-1, 1);
    dst.drawImage(src, 0, 0, w, h);
    dst.restore();
  } else dst.drawImage(src, Math.round(x), Math.round(y), w, h);
}

function compose(p: Person, age: number, year: number, blink: boolean): string {
  const L = looks96(p, age, year);
  const pick = pickKit(atlas!, p, age, L.skin.base);
  const out = document.createElement('canvas');
  out.width = out.height = N;
  const ctx = out.getContext('2d')!;

  const H = partCanvas(pick.head);
  const hp = H.p;
  const T = hp.skin ?? hex(L.skin.base);
  const cx = hp.cx!, top = hp.top!, chin = hp.chin!, bot = hp.bot!, fw = hp.fw!;
  const ox = N / 2 - cx * S;
  const oy = 42 - top * S; // 정수리 y=42: 부푼 머리도 위가 안 잘리게
  const X = (x: number) => ox + x * S;
  const Y = (y: number) => oy + y * S;
  const faceH = chin - top;

  // 옷: 목 윗끝을 두상 목 끝보다 조금 위에 (두상이 덮는다)
  const O = partCanvas(pick.outfit);
  const op = O.p;
  reskin(O.ctx, op.w, op.h, op.skin, hp.neck ?? T, 90, op.skinY ?? op.h);
  const ok = S * 1.15;
  place(ctx, O.cv, X(cx) - op.cx! * ok, Y(bot - 4) - op.top! * ok, ok);

  // 머리카락은 미리 준비: 얼굴 자리(이마·관자놀이)가 두상보다 넓으면 빈틈이 보이니 두상 밑에 머리 그늘색을 깐다
  const Hr = partCanvas(pick.hair);
  recolorHair(Hr.ctx, Hr.p.w, Hr.p.h, hex(L.hair.base));
  const f = Hr.p.face!;
  const hk = ((S * fw) / (f[2] - f[0])) * 0.95;
  const hx = X(cx) - ((f[0] + f[2]) / 2) * hk;
  const hy = Y(chin) - f[3] * hk;
  place(ctx, holeFill(Hr.ctx, Hr.p, hex(L.hair.base).map((v) => v * 0.7)), hx, hy, hk);

  place(ctx, H.cv, ox, oy, S);

  // 눈: 한쪽 눈 그림 → 반대쪽은 좌우로 뒤집어
  const E = partCanvas(pick.eyes);
  reskin(E.ctx, E.p.w, E.p.h, E.p.skin, T, 60);
  const ek = (S * fw * 0.27) / E.p.w;
  const ey = Y(top + faceH * 0.56);
  for (const side of [-1, 1]) {
    const ex = X(cx + side * fw * 0.22);
    const x0 = ex - (E.p.w * ek) / 2;
    const y0 = ey - E.p.h * ek * 0.6;
    if (blink) {
      // 감은 눈: 눈자리를 피부로 덮고 속눈썹 선 하나
      const ew = E.p.w * ek;
      const eh = E.p.h * ek;
      ctx.fillStyle = `rgb(${T.join(',')})`;
      ctx.fillRect(Math.round(x0), Math.round(y0 + eh * 0.42), Math.round(ew), Math.round(eh * 0.58));
      ctx.fillStyle = '#3a2622';
      ctx.fillRect(Math.round(x0 + ew * 0.12), Math.round(ey + eh * 0.1), Math.round(ew * 0.76), 2);
      ctx.drawImage(E.cv, 0, 0, E.p.w, Math.round(E.p.h * 0.4), Math.round(x0), Math.round(y0), Math.round(ew), Math.round(eh * 0.4));
    } else place(ctx, E.cv, x0, y0, ek, side < 0);
  }

  const No = partCanvas(pick.nose);
  reskin(No.ctx, No.p.w, No.p.h, No.p.skin, T, 120);
  const nk = (S * fw * 0.2) / Math.max(10, No.p.w);
  place(ctx, No.cv, X(cx) - (No.p.w * nk) / 2, Y(top + faceH * 0.74) - No.p.h * nk, nk);

  const Mo = partCanvas(pick.mouth);
  reskin(Mo.ctx, Mo.p.w, Mo.p.h, Mo.p.skin, T, 40);
  const mk = (S * fw * 0.34) / Mo.p.w;
  place(ctx, Mo.cv, X(cx) - (Mo.p.w * mk) / 2, Y(top + faceH * 0.87) - (Mo.p.h * mk) / 2, mk);

  // 머리카락: 지운 얼굴 자리의 폭·턱을 두상 얼굴에 맞춘다
  place(ctx, Hr.cv, hx, hy, hk);

  return out.toDataURL();
}

const stage = (a: number) => (a < 3 ? 0 : a < 6 ? 1 : a < 9 ? 2 : a < 13 ? 3 : a < 15 ? 4 : a < 20 ? 5 : a < 35 ? 6 : a < 50 ? 7 : a < 65 ? 8 : a < 75 ? 9 : 10);

/** 부품 초상화 주소. 부품을 아직 못 받았으면 받기 시작하고 null → 준비되면 onKitReady 로 알린다 */
export function kitPortraitURL(p: Person, age: number, year: number, blink = false): string | null {
  const key = `${p.id}:${stage(age)}:${p.job}:${Math.floor(year / 20)}:${blink ? 'b' : ''}`;
  const hit = cache.get(key);
  if (hit) return hit;
  if (!atlas) {
    void loadAtlas().then(() => atlas && notify());
    return null;
  }
  const L = looks96(p, age, year);
  const pick = pickKit(atlas, p, age, L.skin.base);
  const need = [pick.head, pick.hair, pick.eyes, pick.nose, pick.mouth, pick.outfit].map((r) => r.kind);
  const missing = need.filter((k) => !sheets.has(k));
  if (missing.length) {
    void Promise.all(missing.map(loadSheet))
      .then(notify)
      .catch(() => {});
    return null;
  }
  try {
    const u = compose(p, age, year, blink);
    cache.set(key, u);
    return u;
  } catch (e) {
    console.warn('조립 초상화 실패', p.id, e);
    return null;
  }
}

let pending = false;
function notify() {
  if (pending) return;
  pending = true;
  requestAnimationFrame(() => {
    pending = false;
    for (const fn of listeners) fn();
  });
}
