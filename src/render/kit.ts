// 인물 창 큰 초상화 — 그려 온 부품(아틀라스)을 겹쳐 조립한다 (192칸에서 조립 → 96칸 도트)
//   순서: 옷 → 두상 → 눈 → 코 → 입 → 머리카락
//   머리카락 부품의 얼굴 자리를 기준 틀로 삼아 두상을 맞추고, 눈·코·입은 두상 얼굴 폭에 비례해 놓는다
//   피부색이 섞인 부품(옷의 목·코·화장 눈·입술 둘레)은 두상 피부색으로, 머리카락은 유전 머리색으로 다시 칠한다
//   부품은 처음 필요할 때 내려받는다 → 준비 전에는 null (기존 도트 초상화로 대신)
import type { Person } from '../core/types';
import { looks96 } from './bust';
import { pickKit, type KitAtlas, type KitPart, type KitRef } from './kitPick';

const N = 192;
const K = 2.3; // 머리카락 부품 확대 배율 (조립은 192칸에서 하고 96칸으로 줄인다)
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

/** 부품에 섞인 피부(아틀라스를 만들 때 표준 피부색 NECK × 밝기로 맞춰 둠)를 목표 피부색 × 같은 밝기로 */
const NECK = [230, 180, 140];
function reskin(ctx: CanvasRenderingContext2D, w: number, h: number, target: number[]) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let k = 0; k < d.length; k += 4) {
    if (!d[k + 3]) continue;
    const m = d[k] / NECK[0];
    if (m < 0.35 || Math.abs(d[k + 1] - NECK[1] * m) > 4 || Math.abs(d[k + 2] - NECK[2] * m) > 4) continue;
    d[k] = target[0] * m;
    d[k + 1] = target[1] * m;
    d[k + 2] = target[2] * m;
  }
  ctx.putImageData(img, 0, 0);
}

/** 코의 진한 윤곽선을 피부 그늘색으로 — 선 없이 음영만 있는 작은 코 */
function softenOutline(ctx: CanvasRenderingContext2D, w: number, h: number, skin: number[]) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let k = 0; k < d.length; k += 4)
    if (d[k + 3] && Math.max(d[k], d[k + 1], d[k + 2]) < 110) for (let j = 0; j < 3; j++) d[k + j] = skin[j] * 0.72;
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

/** 머리카락 부품의 얼굴 자리 위쪽 70%를 피부색으로 채운 판 (가운데서 번져 나가 바깥 배경은 안 칠함) */
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

  // 기준 틀 = 머리카락 부품. 두상을 머리카락의 얼굴 자리에 맞춰 줄이고 늘린다
  //   가로: 두상 얼굴 폭 = 얼굴 자리 폭, 세로: 정수리가 얼굴 자리 위끝(이마 선)보다 위로 올라가 머리카락 밑에 숨게
  const Hr = partCanvas(pick.hair);
  recolorHair(Hr.ctx, Hr.p.w, Hr.p.h, hex(L.hair.base));
  const f = Hr.p.face!;
  const H = partCanvas(pick.head);
  const hp = H.p;
  const T = hp.skin ?? hex(L.skin.base);
  const hs = ((f[2] - f[0]) * 1.04) / hp.fw!;
  const vs = Math.max(hs, Math.min(hs * 1.4, (f[3] + 1 - (f[1] - 3)) / (hp.chin! - hp.top!)));
  const ox = N / 2 - ((f[0] + f[2]) / 2) * K;
  const oy = Math.max(N * 0.53 - f[3] * K, 6);
  const X = (x: number) => ox + x * K;
  const Y = (y: number) => oy + y * K;
  const hx = (f[0] + f[2]) / 2 - hp.cx! * hs;
  const hy = f[3] + 1 - hp.chin! * vs;
  const HX = (x: number) => X(hx + x * hs);
  const HY = (y: number) => Y(hy + y * vs);
  const kx = K * hs;
  const ky = K * vs;

  // 옷: 목 윗끝을 두상 목 끝보다 조금 위에 (두상이 덮는다)
  const O = partCanvas(pick.outfit);
  const op = O.p;
  reskin(O.ctx, op.w, op.h, hp.neck ?? T);
  const ok = kx * 1.15;
  place(ctx, O.cv, HX(hp.cx!) - op.cx! * ok, HY(hp.bot! - 4) - op.top! * ok, ok);

  place(ctx, holeFill(Hr.ctx, Hr.p, T), X(0), Y(0), K);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(H.cv, Math.round(HX(0)), Math.round(HY(0)), Math.round(hp.w * kx), Math.round(hp.h * ky));

  const fw = hp.fw! * kx;
  const top = HY(hp.top!);
  const fh = HY(hp.chin!) - top;
  const cx = HX(hp.cx!);

  // 눈: 한쪽 눈 그림 → 반대쪽은 좌우로 뒤집어
  const E = partCanvas(pick.eyes);
  reskin(E.ctx, E.p.w, E.p.h, T);
  const ek = (fw * 0.25) / E.p.w;
  const ew = E.p.w * ek;
  const eh = E.p.h * ek;
  const ey = top + fh * 0.55;
  for (const side of [-1, 1]) {
    const x0 = cx + side * fw * 0.21 - ew / 2;
    const y0 = ey - eh * 0.55;
    if (blink) {
      // 감은 눈: 눈썹만 남기고 눈자리를 피부로 덮은 뒤 속눈썹 선 하나
      ctx.fillStyle = `rgb(${T.join(',')})`;
      ctx.fillRect(Math.round(x0), Math.round(y0 + eh * 0.4), Math.round(ew), Math.round(eh * 0.6));
      ctx.fillStyle = '#3a2622';
      ctx.fillRect(Math.round(x0 + ew * 0.15), Math.round(ey + eh * 0.12), Math.round(ew * 0.7), 2);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(E.cv, 0, 0, E.p.w, Math.round(E.p.h * 0.4), Math.round(x0), Math.round(y0), Math.round(ew), Math.round(eh * 0.4));
    } else place(ctx, E.cv, x0, y0, ek, side < 0);
  }

  const No = partCanvas(pick.nose);
  reskin(No.ctx, No.p.w, No.p.h, T);
  softenOutline(No.ctx, No.p.w, No.p.h, T);
  const nk = (fw * 0.12) / No.p.w;
  place(ctx, No.cv, cx - (No.p.w * nk) / 2, top + fh * 0.76 - No.p.h * nk, nk);

  const Mo = partCanvas(pick.mouth);
  reskin(Mo.ctx, Mo.p.w, Mo.p.h, T);
  const mk = (fw * 0.26) / Mo.p.w;
  place(ctx, Mo.cv, cx - (Mo.p.w * mk) / 2, top + fh * 0.87 - (Mo.p.h * mk) / 2, mk);

  place(ctx, Hr.cv, X(0), Y(0), K);

  // 도트 격자 통일: 크기가 제각각인 부품을 반으로 줄여 한 격자(96칸)에 맞춘다 → 화면에서는 도트 그대로 키워 보인다
  const px = document.createElement('canvas');
  px.width = px.height = N / 2;
  const pc = px.getContext('2d')!;
  pc.imageSmoothingEnabled = true;
  pc.imageSmoothingQuality = 'high';
  pc.drawImage(out, 0, 0, N / 2, N / 2);
  return px.toDataURL();
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
