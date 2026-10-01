// 가문 앨범 사진 그리기: 그날의 가족 초상화(48칸)를 배경 위에 세운다.
// 배경(종류마다 두세 가지)과 자리 배치(줄 서기·앉고 서기·들쭉날쭉·스냅)는 사진마다 달라진다. 시대마다 흑백(~1964) → 누렇게 바랜 컬러(~1989) → 필름(~2004) → 선명한 디지털.
import type { GameState, Person } from '../core/types';
import type { Photo, PhotoKind } from '../core/photos';
import { bustGrid } from './bust';

const cache = new Map<string, string>();

function sky(ctx: CanvasRenderingContext2D, w: number, h: number, top: string, bot: string) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, top);
  g.addColorStop(1, bot);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}
function rect(ctx: CanvasRenderingContext2D, c: string, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = c;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

/** 사진마다 다른 배경·자리 배치를 고르는 작은 난수 (같은 사진은 언제 그려도 같다) */
function seeded(seed: number) {
  let x = (Math.abs(Math.floor(seed)) * 2654435761 + 977) >>> 0;
  return () => ((x = (x * 1103515245 + 12345) >>> 0) / 4294967296);
}
type R = () => number;
const pickR = <T,>(r: R, a: T[]) => a[Math.floor(r() * a.length)];

function tree(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, leaf: string) {
  rect(ctx, '#6a4a2a', x - 1, y - s, 3, s);
  ctx.fillStyle = leaf;
  ctx.beginPath();
  ctx.arc(x, y - s, s * 0.6, 0, Math.PI * 2);
  ctx.fill();
}
function mountains(ctx: CanvasRenderingContext2D, w: number, base: number, c: string, r: R, hgt: number) {
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.moveTo(0, base);
  for (let x = 0; x <= w; x += 12) ctx.lineTo(x, base - hgt * (0.4 + r() * 0.6));
  ctx.lineTo(w, base);
  ctx.fill();
}
/** 한지 창살 문 */
function lattice(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  rect(ctx, '#f2e8cc', x, y, w, h);
  for (let i = x; i <= x + w; i += 6) rect(ctx, '#8a6440', i, y, 1, h);
  for (let j = y; j <= y + h; j += 8) rect(ctx, '#8a6440', x, j, w, 1);
  rect(ctx, '#5a3a22', x - 1, y - 1, w + 2, 2), rect(ctx, '#5a3a22', x - 1, y + h - 1, w + 2, 2);
}
/** 병풍 */
function screenFold(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: R) {
  const n = Math.max(4, Math.round(w / 18));
  const pw = w / n;
  for (let i = 0; i < n; i++) {
    rect(ctx, i % 2 ? '#efe2c0' : '#e6d6b0', x + i * pw, y, pw, h);
    rect(ctx, '#7a2a22', x + i * pw, y, 1, h);
    if (r() < 0.7) rect(ctx, pickR(r, ['#3a6a4a', '#b04a3a', '#3a4a6a']), x + i * pw + pw * 0.35, y + h * (0.2 + r() * 0.4), pw * 0.3, 3);
  }
  rect(ctx, '#7a2a22', x, y, w, 2), rect(ctx, '#7a2a22', x, y + h - 2, w, 2);
}
function studio(ctx: CanvasRenderingContext2D, w: number, h: number, year: number, r: R) {
  const g = ctx.createRadialGradient(w * (0.35 + r() * 0.3), h * 0.4, 8, w / 2, h * 0.45, w * 0.75);
  const pal =
    year < 1990
      ? pickR(r, [['#b8c4d0', '#56606e'], ['#d0c0a0', '#6a5440'], ['#b0c4b0', '#4a5a4a']])
      : year < 2040
        ? pickR(r, [['#d8dce8', '#6a7088'], ['#f0e0d0', '#8a6a5a'], ['#d0e4f0', '#4a6a8a'], ['#f4f0e8', '#a09888']])
        : pickR(r, [['#e8e0f8', '#6a5aa0'], ['#d8f4f0', '#3a7a8a']]);
  g.addColorStop(0, pal[0]);
  g.addColorStop(1, pal[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/** 배경: 종류마다 두세 가지 중에서 사진마다 하나 */
function backdrop(ctx: CanvasRenderingContext2D, kind: Scene, w: number, h: number, year: number, r: R) {
  const v = Math.floor(r() * 3);
  switch (kind) {
    case 'trip': {
      if (v === 0) {
        // 바닷가
        sky(ctx, w, h, '#7ec8f0', '#cbeeff');
        rect(ctx, '#ffffff', w * 0.1, 8, 18, 5), rect(ctx, '#ffffff', w * 0.62, 14, 24, 5);
        rect(ctx, '#3a8ac8', 0, h * 0.42, w, h * 0.18);
        for (let x = 0; x < w; x += 7) rect(ctx, '#bfe8ff', x, h * 0.46 + ((x / 7) % 2) * 3, 4, 1);
        rect(ctx, '#f0d8a0', 0, h * 0.6, w, h * 0.4);
      } else if (v === 1) {
        // 단풍 든 산
        sky(ctx, w, h, '#9ad0f0', '#e8f4f8');
        mountains(ctx, w, h * 0.55, '#7a9aa8', r, h * 0.4);
        mountains(ctx, w, h * 0.65, pickR(r, ['#c86a3a', '#4a8a4a', '#d89a3a']), r, h * 0.3);
        rect(ctx, '#8a7a5a', 0, h * 0.65, w, h * 0.35);
        for (let i = 0; i < 4; i++) tree(ctx, r() * w, h * 0.7, 10 + r() * 6, pickR(r, ['#d8582a', '#e8a83a', '#5a9a4a']));
      } else {
        // 꽃밭 (유채꽃·벚꽃)
        const pink = r() < 0.5;
        sky(ctx, w, h, '#a8d8f8', '#f4f8ff');
        mountains(ctx, w, h * 0.5, '#8ab0a0', r, h * 0.2);
        rect(ctx, pink ? '#a8c890' : '#7aa84a', 0, h * 0.5, w, h * 0.5);
        for (let i = 0; i < w * 1.2; i++) rect(ctx, pink ? pickR(r, ['#ffc8d8', '#ffe0ea']) : pickR(r, ['#f8e048', '#ffd030']), r() * w, h * 0.5 + r() * h * 0.5, 2, 2);
        if (pink) for (let i = 0; i < 3; i++) tree(ctx, w * (0.15 + i * 0.35), h * 0.55, 14, '#ffb8cc');
      }
      break;
    }
    case 'clan': {
      if (v === 2) {
        // 대청마루 병풍 앞
        rect(ctx, '#c8a878', 0, 0, w, h);
        screenFold(ctx, w * 0.06, h * 0.08, w * 0.88, h * 0.5, r);
        rect(ctx, '#a07848', 0, h * 0.62, w, h * 0.38);
        for (let x = 0; x < w; x += 10) rect(ctx, '#8a6438', x, h * 0.62, 1, h * 0.38);
        break;
      }
      sky(ctx, w, h, '#a8d0e8', '#e8f0e0');
      rect(ctx, '#5a3a2a', 0, h * 0.18, w, 6);
      for (let x = 0; x < w; x += 6) rect(ctx, '#3a2a22', x, h * 0.18 - 3, 5, 3);
      rect(ctx, '#e8dcc0', 0, h * 0.18 + 6, w, h * 0.34);
      for (let x = 10; x < w; x += 40) rect(ctx, '#8a6a4a', x, h * 0.18 + 6, 3, h * 0.34);
      if (v === 1) {
        // 마당의 감나무
        tree(ctx, w * 0.85, h * 0.55, 22, '#4a7a3a');
        for (let i = 0; i < 8; i++) rect(ctx, '#f07a2a', w * 0.85 - 10 + r() * 20, h * 0.55 - 30 + r() * 14, 2, 2);
      }
      rect(ctx, '#c8b890', 0, h * 0.52, w, h * 0.48);
      break;
    }
    case 'dol': {
      if (v === 1) {
        // 돌상 뒤 병풍
        rect(ctx, '#f0e0c8', 0, 0, w, h);
        screenFold(ctx, w * 0.1, h * 0.06, w * 0.8, h * 0.55, r);
      } else {
        sky(ctx, w, h, '#ffd6e4', '#fff0f4');
        for (let x = 0; x < w; x += 10) rect(ctx, '#ffb8cc', x, 0, 4, h * 0.5);
        for (let i = 0; i < 6; i++) rect(ctx, pickR(r, ['#f8d048', '#8ad0ff', '#ff8aa8']), r() * w, 4 + r() * 10, 6, 8);
      }
      rect(ctx, '#c84848', w * 0.08, h * 0.62, w * 0.84, 6);
      for (let x = w * 0.12; x < w * 0.88; x += 12) rect(ctx, ['#f8d048', '#e86a78', '#8ad0ff'][Math.round(x) % 3], x, h * 0.57, 7, 5);
      break;
    }
    case 'wedding': {
      if (v === 1) {
        // 야외 정원 아치
        sky(ctx, w, h, '#b8e0f8', '#f0f8ff');
        rect(ctx, '#7aba5a', 0, h * 0.6, w, h * 0.4);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(w / 2, h * 0.62, Math.min(w * 0.35, h * 0.5), Math.PI, 0);
        ctx.stroke();
        for (let i = 0; i < 24; i++) rect(ctx, pickR(r, ['#ffc8d8', '#ffffff', '#fff0a8']), w / 2 + Math.cos(Math.PI + (i / 23) * Math.PI) * Math.min(w * 0.35, h * 0.5) - 2, h * 0.62 + Math.sin(Math.PI + (i / 23) * Math.PI) * Math.min(w * 0.35, h * 0.5) - 2, 4, 4);
      } else if (v === 2) {
        // 예식장 단상: 붉은 융단과 꽃 기둥
        rect(ctx, '#f4ecdc', 0, 0, w, h);
        rect(ctx, '#e8d8c0', w * 0.2, 0, w * 0.6, h * 0.6);
        rect(ctx, '#b0303a', w * 0.38, h * 0.6, w * 0.24, h * 0.4);
        for (const x of [w * 0.12, w * 0.88]) {
          rect(ctx, '#ffffff', x - 3, h * 0.2, 6, h * 0.45);
          for (let i = 0; i < 6; i++) rect(ctx, pickR(r, ['#ffc8d8', '#ffffff', '#f8a0b8']), x - 6 + r() * 10, h * 0.14 + r() * 10, 4, 4);
        }
        rect(ctx, '#d8c8b0', 0, h * 0.6, w * 0.38, h * 0.4), rect(ctx, '#d8c8b0', w * 0.62, h * 0.6, w * 0.38, h * 0.4);
      } else {
        sky(ctx, w, h, '#ffffff', '#f4ecf4');
        for (let i = 0; i < 18; i++) rect(ctx, ['#ffc8d8', '#fff0a8', '#ffffff'][i % 3], (i * 37) % w, (i * 13) % (h * 0.5), 4, 4);
        rect(ctx, '#e8d0e0', 0, h * 0.7, w, h * 0.3);
      }
      break;
    }
    case 'grad': {
      sky(ctx, w, h, '#9ad0f0', '#e0f4ff');
      if (v === 1) {
        // 교문 앞 현수막
        rect(ctx, '#8a8a88', w * 0.08, h * 0.12, 6, h * 0.5), rect(ctx, '#8a8a88', w * 0.92 - 6, h * 0.12, 6, h * 0.5);
        rect(ctx, '#ffffff', w * 0.14, h * 0.14, w * 0.72, 10);
        for (let x = w * 0.18; x < w * 0.82; x += 6) rect(ctx, '#3a4a8a', x, h * 0.14 + 3, 3, 4);
        for (let i = 0; i < 3; i++) tree(ctx, w * (0.2 + i * 0.3), h * 0.55, 14, '#5a9a4a');
      } else {
        rect(ctx, '#d8c0a0', w * 0.1, h * 0.12, w * 0.8, h * 0.4);
        for (let x = w * 0.14; x < w * 0.86; x += 14) rect(ctx, '#7aa0c8', x, h * 0.18, 8, 7), rect(ctx, '#7aa0c8', x, h * 0.34, 8, 7);
        // 하늘로 던진 학사모
        if (v === 2) for (let i = 0; i < 5; i++) rect(ctx, '#2a2a3a', r() * w, 4 + r() * 12, 6, 2);
      }
      rect(ctx, '#a07a50', 0, h * 0.52, w, h * 0.48);
      break;
    }
    case 'couple': {
      if (v === 1) {
        // 벚꽃길
        sky(ctx, w, h, '#c8e4f8', '#fff4f8');
        for (let i = 0; i < 4; i++) tree(ctx, w * (0.1 + i * 0.28), h * 0.62, 18, '#ffc0d4');
        rect(ctx, '#d8c8b8', 0, h * 0.62, w, h * 0.38);
        for (let i = 0; i < 20; i++) rect(ctx, '#ffd8e4', r() * w, r() * h, 2, 2);
      } else if (v === 2) {
        // 밤의 도시 불빛
        sky(ctx, w, h, '#0e1430', '#2a3868');
        for (let x = 0; x < w; x += 14) {
          const bh = h * (0.2 + r() * 0.35);
          rect(ctx, '#1a2040', x, h * 0.62 - bh, 12, bh);
          for (let j = 0; j < bh - 4; j += 5) if (r() < 0.5) rect(ctx, '#ffd870', x + 2 + Math.floor(r() * 3) * 3, h * 0.62 - bh + 2 + j, 2, 2);
        }
        rect(ctx, '#2a2a3a', 0, h * 0.62, w, h * 0.38);
      } else {
        sky(ctx, w, h, '#f8a070', '#ffe0a8');
        ctx.fillStyle = '#fff4c0';
        ctx.beginPath();
        ctx.arc(w * 0.75, h * 0.38, 12, 0, Math.PI * 2);
        ctx.fill();
        rect(ctx, '#5a4a7a', 0, h * 0.55, w, h * 0.45);
      }
      break;
    }
    case 'newborn': {
      sky(ctx, w, h, '#eef6fa', '#dcecf0');
      if (v === 1) {
        // 산부인과 창가
        rect(ctx, '#ffffff', w * 0.55, h * 0.1, w * 0.35, h * 0.35);
        rect(ctx, '#a8d8f0', w * 0.57, h * 0.13, w * 0.31, h * 0.29);
        rect(ctx, '#ffffff', w * 0.72, h * 0.1, 2, h * 0.35);
      } else rect(ctx, '#f0c8d8', w * 0.8, h * 0.12, 14, 18);
      rect(ctx, '#c8e0e8', 0, h * 0.62, w, h * 0.38);
      break;
    }
    case 'meet': {
      // 상견례: 한정식 집 방 (창살문) 또는 호텔 식당 (통창 너머 도시)
      if (v === 1 && year >= 1985) {
        rect(ctx, '#e8e0d0', 0, 0, w, h);
        rect(ctx, '#8ab0d0', w * 0.08, h * 0.08, w * 0.84, h * 0.46);
        for (let x = w * 0.08; x < w * 0.92; x += 10) rect(ctx, '#6a88a8', x, h * 0.54 - h * (0.1 + r() * 0.25), 8, h * 0.4);
        for (let x = w * 0.08; x < w * 0.92; x += w * 0.21) rect(ctx, '#c8c0b0', x, h * 0.08, 3, h * 0.46);
        rect(ctx, '#d8c8a8', 0, h * 0.54, w, h * 0.46);
      } else {
        rect(ctx, '#c8a070', 0, 0, w, h);
        lattice(ctx, w * 0.06, h * 0.06, w * 0.4, h * 0.46);
        lattice(ctx, w * 0.54, h * 0.06, w * 0.4, h * 0.46);
        rect(ctx, '#e8d8b0', 0, h * 0.56, w, h * 0.44);
        for (let x = 0; x < w; x += 16) rect(ctx, '#d0c098', x, h * 0.56, 1, h * 0.44);
      }
      break;
    }
    case 'family': {
      if (v === 1) {
        // 집 거실: 벽지, 액자, 창
        rect(ctx, pickR(r, ['#efe4cc', '#e4ecdc', '#f0dcd4']), 0, 0, w, h);
        for (let x = 0; x < w; x += 8) rect(ctx, 'rgba(0,0,0,.04)', x, 0, 4, h * 0.6);
        rect(ctx, '#7a5a3a', w * 0.1, h * 0.1, 18, 14), rect(ctx, '#a8c8a0', w * 0.1 + 2, h * 0.1 + 2, 14, 10);
        rect(ctx, '#ffffff', w * 0.62, h * 0.08, w * 0.28, h * 0.3), rect(ctx, '#a8d8f0', w * 0.62 + 2, h * 0.08 + 2, w * 0.28 - 4, h * 0.3 - 4);
        rect(ctx, '#a07850', 0, h * 0.6, w, h * 0.4);
        break;
      }
      if (v === 2) {
        // 동네 공원
        sky(ctx, w, h, '#a0d4f4', '#e8f6ff');
        for (let i = 0; i < 4; i++) tree(ctx, r() * w, h * 0.58, 14 + r() * 8, pickR(r, ['#4a8a4a', '#5aa05a', '#3a7a3a']));
        rect(ctx, '#7ab85a', 0, h * 0.58, w, h * 0.42);
        break;
      }
      studio(ctx, w, h, year, r);
      break;
    }
    default: {
      // 잔칫날(환갑·칠순): 사진관 또는 잔칫상 뒤 병풍
      if (v === 1) {
        rect(ctx, '#e8d8b8', 0, 0, w, h);
        screenFold(ctx, w * 0.05, h * 0.05, w * 0.9, h * 0.55, r);
        rect(ctx, '#b0303a', 0, h * 0.62, w, h * 0.38);
      } else studio(ctx, w, h, year, r);
      for (let x = 6; x < w; x += 22) rect(ctx, '#e8b848', x, 6, 12, 4), rect(ctx, '#c83848', x + 4, 10, 4, 6);
    }
  }
}

/** 시대 색감: 흑백 · 누렇게 바랜 컬러 · 필름 */
function ageFilter(ctx: CanvasRenderingContext2D, w: number, h: number, year: number) {
  if (year >= 2005) return;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const [r, g, b] = [d[i], d[i + 1], d[i + 2]];
    const l = 0.3 * r + 0.59 * g + 0.11 * b;
    if (year < 1965) d[i] = d[i + 1] = d[i + 2] = Math.min(255, l * 1.05 + 8);
    else if (year < 1990) (d[i] = Math.min(255, l * 0.5 + r * 0.5 + 24)), (d[i + 1] = Math.min(255, l * 0.5 + g * 0.5 + 12)), (d[i + 2] = l * 0.45 + b * 0.35);
    else (d[i] = Math.min(255, r * 0.95 + 10)), (d[i + 1] = g * 0.95 + 4), (d[i + 2] = b * 0.9);
  }
  ctx.putImageData(img, 0, 0);
}

type Who = { p: Person; a: number };
type Scene = PhotoKind | 'meet';
/** 사람 하나를 그린 작은 캔버스 (좌우 뒤집기 가능) */
function figure(p: Person, a: number, year: number, flip: boolean): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = 48;
  const x = c.getContext('2d')!;
  bustGrid(p, a, year, 'happy').forEach((row, yy) => row.forEach((col, xx) => col && ((x.fillStyle = col), x.fillRect(flip ? 47 - xx : xx, yy, 1, 1))));
  return c;
}
interface Spot { who: Who; x: number; y: number; sc: number; flip: boolean }

/**
 * 자리 배치: 사진마다 다르게
 *   rows   — 어른 뒷줄, 아이 앞줄 (사진관 정석)
 *   seat   — 가장 나이 든 두 분이 앞에 앉고 나머지가 뒤에 선다
 *   stagger— 한 줄로 서되 키가 들쭉날쭉, 살짝 기울어진 사람도
 *   candid — 여기저기 흩어져 앞뒤 거리가 다른 스냅
 */
function arrange(people: Who[], w: number, h: number, kind: Scene, r: R, split = Math.ceil(people.length / 2)): Spot[] {
  const step = 30;
  const line = (row: Who[], y: number, sc = 1, gap = step): Spot[] => {
    const x0 = (w - ((row.length - 1) * gap + 48 * sc)) / 2;
    return row.map((who, i) => ({ who, x: x0 + i * gap, y, sc, flip: false }));
  };
  const bottom = h - 48;
  if (kind === 'meet') {
    // 양가가 마주 앉는다: 왼쪽 집안은 오른쪽을, 오른쪽 집안은 왼쪽을 본다
    const L = people.slice(0, split);
    const Rt = people.slice(split);
    const gap = Math.min(26, (w / 2 - 30) / Math.max(1, Math.max(L.length, Rt.length) - 1));
    return [
      ...L.map((who, i) => ({ who, x: 4 + i * gap, y: bottom - 6 - (i % 2) * 2, sc: 1, flip: true })),
      ...Rt.map((who, i) => ({ who, x: w - 52 - i * gap, y: bottom - 6 - (i % 2) * 2, sc: 1, flip: false })),
    ];
  }
  const kids = people.filter((x) => x.a < 15);
  const adults = people.filter((x) => x.a >= 15);
  const styles = kind === 'trip' || kind === 'couple' ? ['candid', 'stagger', 'rows'] : kind === 'clan' || kind === 'hwangap' ? ['seat', 'rows', 'stagger'] : ['rows', 'seat', 'stagger', 'candid'];
  const style = pickR(r, styles);
  if (style === 'seat' && adults.length >= 3) {
    const elders = [...adults].sort((x, y) => y.a - x.a).slice(0, 2);
    const rest = people.filter((x) => !elders.includes(x));
    const back = rest.filter((x) => x.a >= 10);
    const front = [...rest.filter((x) => x.a < 10)];
    // 앉은 두 분 사이·양옆에 어린아이
    const seated = [...front.slice(0, Math.ceil(front.length / 2)), ...elders, ...front.slice(Math.ceil(front.length / 2))];
    return [...line(back, bottom - 26), ...line(seated, bottom, 1, 32)];
  }
  if (style === 'stagger' || (style === 'seat' && adults.length < 3)) {
    const all = [...people].sort(() => r() - 0.5);
    if (all.length > 7) return [...line(all.filter((_, i) => i % 2 === 0), bottom - 24), ...line(all.filter((_, i) => i % 2 === 1), bottom)];
    return line(all, 0).map((s, i) => ({ ...s, y: bottom - (i % 2 ? 0 : 4) - (s.who.a < 15 ? -4 : 0) + Math.round(r() * 2), flip: r() < 0.2 }));
  }
  if (style === 'candid' && people.length <= 6) {
    const order = [...people].sort(() => r() - 0.5);
    const gap = (w - 48) / Math.max(1, order.length - 1 || 1);
    return order.map((who, i) => {
      const far = r() < 0.4 && order.length > 2;
      const sc = far ? 0.8 : 1;
      return { who, x: order.length === 1 ? (w - 48) / 2 : i * gap + (r() - 0.5) * 8, y: bottom - (far ? 14 : 0) + (far ? 48 * 0.2 : 0), sc, flip: i < order.length / 2 ? r() < 0.6 : r() < 0.2 };
    }).sort((x, y) => x.sc - y.sc);
  }
  // rows
  if (!kids.length) return line(adults, bottom);
  return [...line(adults, bottom - 26), ...line(kids, bottom)];
}

/** 사진 한 장 그리기: 배경 + 자리 배치 + 시대 색감 */
function render(people: Who[], kind: Scene, year: number, seed: number, split?: number): string {
  const r = seeded(seed);
  const n = Math.max(people.length, 2);
  const w = Math.max(150, Math.min(n, 7) * 30 + 40);
  const h = Math.max(100, Math.round(w * 0.66));
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  backdrop(ctx, kind, w, h, year, r);
  const spots = arrange(people, w, h, kind, r, split);
  for (const s of spots) {
    const sz = Math.round(48 * s.sc);
    ctx.fillStyle = 'rgba(0,0,0,.16)';
    ctx.fillRect(Math.round(s.x + sz * 0.2), Math.round(s.y + sz - 2), Math.round(sz * 0.6), 2);
    ctx.drawImage(figure(s.who.p, s.who.a, year, s.flip), Math.round(s.x), Math.round(s.y), sz, sz);
  }
  if (kind === 'meet') {
    // 앞에 놓인 상과 음식
    const ty = h - 16;
    rect(ctx, '#6a3a1e', 0, ty, w, 16);
    rect(ctx, '#8a5230', 0, ty, w, 3);
    for (let x = 8; x < w - 8; x += 13) {
      rect(ctx, '#f4f0e8', x, ty - 3, 9, 4);
      rect(ctx, pickR(r, ['#d0503a', '#5a9a4a', '#e8b848', '#a86a3a']), x + 2, ty - 5, 5, 3);
    }
  }
  ageFilter(ctx, w, h, year);
  // 옛날 사진은 귀퉁이가 어둑하게 (필름 시절)
  if (year < 2005) {
    const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(40,24,8,.35)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
  return c.toDataURL();
}

/** 앨범 사진 한 장 (data URL). 사람이 기록에서 사라졌으면 그 자리는 비운다 */
export function photoURL(g: GameState, ph: Photo): string {
  const key = `${ph.id}:${ph.year}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const people = ph.ids.map((id, i) => ({ p: g.people[id], a: ph.ages[i] })).filter((x) => x.p);
  const url = render(people, ph.kind, ph.year, ph.id * 7919 + ph.year);
  cache.set(key, url);
  return url;
}

/** 상견례 한 장: 왼쪽은 우리 집(부모님 + 본인), 오른쪽은 상대 집(상대 + 부모님) */
export function meetPhotoURL(g: GameState, ours: Person[], theirs: Person[], seed: number): string {
  const who = (p: Person) => ({ p, a: (p.deathYear ?? g.year) - p.birthYear });
  const key = `meet:${seed}:${g.year}:${[...ours, ...theirs].map((p) => p.id).join(',')}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const url = render([...ours.map(who), ...theirs.map(who)], 'meet', g.year, seed, ours.length);
  cache.set(key, url);
  return url;
}
