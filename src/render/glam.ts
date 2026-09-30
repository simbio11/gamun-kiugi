// 히든 직업 카드 「AV 배우」 그림 (84×80, 3장이 번갈아 움직인다).
// 분장실: 전구 거울·화장대, 오른쪽엔 카메라, 붉은 체스터필드 소파에 기대 앉은 배우.
// 1장: 기본 · 2장: 눈 깜빡 + 머리칼 흔들림 · 3장: 거울 전구 반짝 + 머리칼 되돌아옴
import { setCustomArt } from './cardart';

const W = 84;
const H = 80;
type G = (string | null)[][];

function paint(frame: number): G {
  const g: G = Array.from({ length: H }, () => Array(W).fill(null));
  const fig: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false)); // 외곽선을 칠할 인물 영역
  const set = (x: number, y: number, c: string, isFig = false) => {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    g[y][x] = c;
    if (isFig) fig[y][x] = true;
  };
  const rect = (x0: number, y0: number, x1: number, y1: number, c: string, f = false) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, c, f);
  };
  const ell = (cx: number, cy: number, rx: number, ry: number, c: string | ((x: number, y: number) => string), f = false) => {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) set(x, y, typeof c === 'string' ? c : c(x, y), f);
      }
  };
  /** 두 점을 잇는 굵은 선 (팔·다리) */
  const limb = (x0: number, y0: number, x1: number, y1: number, r0: number, r1: number, c: (x: number, y: number, t: number) => string) => {
    const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const cx = x0 + (x1 - x0) * t;
      const cy = y0 + (y1 - y0) * t;
      const r = r0 + (r1 - r0) * t;
      for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r) set(x, y, c(x, y, t), true);
    }
  };

  // ── 벽·바닥 ──
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) set(x, y, y < 52 ? (y < 20 ? '#5c6680' : y < 38 ? '#66708a' : '#707a94') : (x + y) % 7 === 0 ? '#3e3644' : '#352e3c');
  // ── 전구 거울 + 화장대 ──
  rect(4, 6, 30, 40, '#8a6a48');
  rect(6, 8, 28, 38, '#b8c6d8');
  for (let i = 0; i < 26; i++) set(9 + i * 0.6, 34 - i, '#e0ecf6'), set(11 + i * 0.6, 34 - i, '#d0dcea');
  const bulbs: [number, number][] = [];
  for (let y = 9; y <= 37; y += 7) bulbs.push([3, y], [31, y]);
  for (let x = 9; x <= 26; x += 6) bulbs.push([x, 4]);
  bulbs.forEach(([bx, by], i) => {
    const bright = frame !== 2 || i % 2 === 0;
    ell(bx, by, 2.4, 2.4, bright ? '#f6dc8a' : '#b89a58');
    set(bx - 0.5, by - 0.5, bright ? '#fffbe8' : '#e8d8a8');
    if (bright && frame === 2) set(bx + 2, by - 2, '#fff8d0');
  });
  rect(0, 41, 36, 46, '#6e4c38');
  rect(0, 41, 36, 41, '#8e6a50');
  rect(0, 47, 34, 51, '#4e3426');
  rect(6, 35, 8, 40, '#d8d0e8'), set(7, 34, '#a0a0c0');
  rect(12, 37, 14, 40, '#e07aa0'), set(13, 36, '#f0f0f0');
  rect(18, 38, 23, 40, '#c8a060');
  // ── 카메라 (삼각대) ──
  for (let i = 0; i < 28; i++) set(72 - i * 0.25, 44 + i, '#22222a'), set(73 + i * 0.25, 44 + i, '#22222a'), set(72.5, 44 + i, '#2a2a34');
  rect(64, 30, 81, 42, '#26262e');
  rect(64, 30, 81, 31, '#3a3a46');
  rect(70, 26, 76, 29, '#26262e');
  ell(62, 36, 4, 4, '#1a1a22');
  ell(62, 36, 2.6, 2.6, '#3a5a80');
  set(61, 35, '#9ac8f0');
  set(79, 33, frame === 1 ? '#ff4040' : '#a02020'); // 녹화 불빛
  // ── 소파 (붉은 체스터필드) ──
  const red = (x: number, y: number) => ((x * 3 + y * 5) % 11 === 0 ? '#d23a44' : '#b0202c');
  for (let y = 36; y <= 60; y++) for (let x = 20; x <= 83; x++) set(x, y, red(x, y));
  for (let y = 40; y <= 58; y += 6) for (let x = 24 + ((y / 6) % 2) * 3; x <= 82; x += 6) set(x, y, '#6e0c16'), set(x + 1, y + 1, '#d84450');
  rect(20, 36, 83, 37, '#d8404a');
  ell(22, 52, 8, 12, (x) => (x < 20 ? '#c42c36' : '#a01a26')); // 팔걸이
  rect(18, 58, 83, 68, '#9a1824');
  rect(18, 58, 83, 59, '#c8303c');
  rect(18, 69, 83, 72, '#6e0c16');
  rect(22, 73, 25, 77, '#4a2a1a'), rect(78, 73, 81, 77, '#4a2a1a');

  // ── 배우 ──
  const SK = '#f6d2ba';
  const SK2 = '#e0a88c';
  const HR = '#8e5c30';
  const HR2 = '#b27c44';
  const HR3 = '#5e3a1e';
  const BK = '#16141c';
  const BK2 = '#34303e';
  const sway = frame === 1 ? 1 : 0;
  // 뒷머리: 어깨 아래로 흘러내리는 웨이브
  for (let y = 12; y <= 54; y++) {
    const wv = Math.sin(y / 3.2 + sway * 1.2) * 1.4;
    const l = 42 - (y > 24 ? 3 : 1) + wv - (y > 40 ? 1 : 0);
    const r = 63 + (y > 24 ? 3 : 1) + wv + (y > 40 ? 1 : 0);
    for (let x = Math.round(l); x <= Math.round(r); x++) set(x, y, (x + Math.round(y / 2)) % 5 === 0 ? HR3 : (x + y) % 9 === 0 ? HR2 : HR, true);
  }
  // 드레스 몸통 (오프숄더)
  for (let y = 33; y <= 57; y++) {
    const w = y < 36 ? 8 : y < 44 ? 7 - (y - 36) * 0.15 : 6 + (y - 44) * 0.35;
    for (let x = Math.round(53 - w); x <= Math.round(53 + w); x++) set(x, y, x > 53 + w * 0.4 ? BK : (x + y) % 6 === 0 ? BK2 : BK, true);
  }
  // 어깨·쇄골·목
  for (let y = 29; y <= 34; y++) for (let x = 45; x <= 61; x++) if (Math.abs(x - 53) <= 5 + (y - 29) * 1.5) set(x, y, y === 33 && Math.abs(x - 53) > 2 && Math.abs(x - 53) < 6 ? SK2 : SK, true);
  rect(51, 26, 55, 30, SK, true);
  rect(55, 28, 55, 30, SK2, true);
  // 들어 올린 팔 (머리를 쓸어 넘긴다) — 검은 긴소매
  limb(46, 34, 40, 20, 2.6, 2.2, (_x, y) => (y % 4 === 0 ? BK2 : BK));
  limb(40, 20, 44, 11, 2.2, 2.0, (_x, y) => (y % 4 === 0 ? BK2 : BK));
  ell(46, 11, 2.8, 2.4, SK, true);
  set(47, 9, SK2, true), set(48, 10, SK2, true);
  // 소파에 짚은 팔
  limb(61, 34, 66, 45, 2.4, 2.0, () => BK);
  limb(66, 45, 70, 55, 2.0, 1.8, () => BK);
  ell(71, 56.5, 2.6, 1.8, SK, true);
  // 꼰 다리 — 망사 스타킹
  const net = (x: number, y: number) => ((x + y) % 3 === 0 || (x - y + 99) % 3 === 0 ? '#2a2026' : '#8a6464');
  limb(50, 58, 34, 62, 5.2, 3.6, (x, y) => (x > 46 ? BK : net(x, y)));
  limb(34, 62, 27, 75, 3.4, 2.4, (x, y) => net(x, y));
  limb(55, 58, 42, 66, 5.0, 3.4, (x, y) => (x > 50 ? BK : net(x, y)));
  limb(42, 66, 38, 76, 3.2, 2.2, (x, y) => net(x, y));
  // 하이힐
  for (const [hx, hy] of [[26, 76], [37, 77]] as const) {
    rect(hx - 3, hy, hx + 2, hy + 1, BK, true);
    set(hx + 2, hy + 2, BK, true), set(hx + 2, hy + 3, BK, true);
    set(hx - 2, hy, '#6a6a7a', true);
  }
  // 얼굴
  ell(53, 20, 6.4, 8, SK, true);
  for (let y = 22; y <= 27; y++) set(58.5 - (y - 22) * 0.3, y, SK2, true); // 턱선 그늘
  // 앞머리: 옆으로 넘긴 웨이브
  for (let x = 46; x <= 60; x++) {
    const d = x < 52 ? 6 - (52 - x) * 0.6 : 3 + (x - 52) * 0.2;
    for (let y = 11; y < 11 + d; y++) set(x, y, (x + y) % 5 === 0 ? HR2 : HR, true);
  }
  ell(53, 12, 8, 4, (x, y) => ((x + y) % 4 === 0 ? HR2 : HR), true);
  for (let y = 12; y <= 30; y++) set(46 + Math.sin(y / 2.5 + sway) * 0.8, y, HR, true), set(60 + Math.sin(y / 2.5 + sway) * 0.8, y, HR3, true);
  set(50, 11, '#e0b070', true), set(51, 11, '#e0b070', true), set(52, 12, '#d8a860', true); // 윤기
  // 눈 (아이섀도 + 속눈썹) — 깜빡이면 감은 눈
  const K = '#1a0e14';
  if (frame === 1) {
    for (const ex of [49, 55]) set(ex - 1, 20, K, true), set(ex, 21, K, true), set(ex + 1, 21, K, true), set(ex + 2, 20, K, true);
  } else
    for (const ex of [49, 55]) {
      set(ex - 1, 18, '#a86070', true), set(ex, 18, '#a86070', true), set(ex + 1, 18, '#a86070', true);
      set(ex - 1, 19, K, true), set(ex, 19, K, true), set(ex + 1, 19, K, true), set(ex + 2, 19, K, true);
      set(ex - 2, 18, K, true);
      set(ex, 20, '#5a3a22', true), set(ex + 1, 20, '#7a5230', true), set(ex - 1, 20, '#fff6ee', true);
      set(ex + 1, 20, '#ffffff', true);
      set(ex, 21, K, true);
    }
  // 코·입술·볼
  set(52, 23, SK2, true);
  set(51, 25, '#c02438', true), set(52, 25, '#d83048', true), set(53, 25, '#c02438', true);
  set(52, 26, '#a01c30', true);
  set(48, 23, '#f0a0a8', true), set(57, 23, '#f0a0a8', true);
  // 귀걸이
  set(59, 23, '#f0d060', true), set(59, 24, '#f8e8a0', true);
  // ── 인물 외곽선 ──
  const out: [number, number][] = [];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (!fig[y][x] && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => fig[y + dy]?.[x + dx])) out.push([x, y]);
  for (const [x, y] of out) g[y][x] = '#1c1016';
  return g;
}

setCustomArt('av_star', { frames: 3, draw: paint });
