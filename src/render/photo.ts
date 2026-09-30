// 가문 앨범 사진 그리기: 그날의 가족 초상화(48칸)를 배경 위에 나란히 세운다.
// 어른은 뒷줄, 아이는 앞줄. 시대마다 흑백(~1964) → 누렇게 바랜 컬러(~1989) → 필름(~2004) → 선명한 디지털.
import type { GameState } from '../core/types';
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

function backdrop(ctx: CanvasRenderingContext2D, kind: PhotoKind, w: number, h: number, year: number) {
  switch (kind) {
    case 'trip': {
      sky(ctx, w, h, '#7ec8f0', '#cbeeff');
      rect(ctx, '#ffffff', w * 0.1, 8, 18, 5), rect(ctx, '#ffffff', w * 0.62, 14, 24, 5);
      rect(ctx, '#3a8ac8', 0, h * 0.42, w, h * 0.18);
      for (let x = 0; x < w; x += 7) rect(ctx, '#bfe8ff', x, h * 0.46 + ((x / 7) % 2) * 3, 4, 1);
      rect(ctx, '#f0d8a0', 0, h * 0.6, w, h * 0.4);
      break;
    }
    case 'clan': {
      sky(ctx, w, h, '#a8d0e8', '#e8f0e0');
      rect(ctx, '#5a3a2a', 0, h * 0.18, w, 6);
      for (let x = 0; x < w; x += 6) rect(ctx, '#3a2a22', x, h * 0.18 - 3, 5, 3);
      rect(ctx, '#e8dcc0', 0, h * 0.18 + 6, w, h * 0.34);
      for (let x = 10; x < w; x += 40) rect(ctx, '#8a6a4a', x, h * 0.18 + 6, 3, h * 0.34);
      rect(ctx, '#c8b890', 0, h * 0.52, w, h * 0.48);
      break;
    }
    case 'dol': {
      sky(ctx, w, h, '#ffd6e4', '#fff0f4');
      for (let x = 0; x < w; x += 10) rect(ctx, '#ffb8cc', x, 0, 4, h * 0.5);
      rect(ctx, '#c84848', w * 0.08, h * 0.62, w * 0.84, 6);
      for (let x = w * 0.12; x < w * 0.88; x += 12) rect(ctx, ['#f8d048', '#e86a78', '#8ad0ff'][Math.round(x) % 3], x, h * 0.57, 7, 5);
      break;
    }
    case 'wedding': {
      sky(ctx, w, h, '#ffffff', '#f4ecf4');
      for (let i = 0; i < 18; i++) rect(ctx, ['#ffc8d8', '#fff0a8', '#ffffff'][i % 3], (i * 37) % w, (i * 13) % (h * 0.5), 4, 4);
      rect(ctx, '#e8d0e0', 0, h * 0.7, w, h * 0.3);
      break;
    }
    case 'grad': {
      sky(ctx, w, h, '#9ad0f0', '#e0f4ff');
      rect(ctx, '#d8c0a0', w * 0.1, h * 0.12, w * 0.8, h * 0.4);
      for (let x = w * 0.14; x < w * 0.86; x += 14) rect(ctx, '#7aa0c8', x, h * 0.18, 8, 7), rect(ctx, '#7aa0c8', x, h * 0.34, 8, 7);
      rect(ctx, '#a07a50', 0, h * 0.52, w, h * 0.48);
      break;
    }
    case 'couple': {
      sky(ctx, w, h, '#f8a070', '#ffe0a8');
      ctx.fillStyle = '#fff4c0';
      ctx.beginPath();
      ctx.arc(w * 0.75, h * 0.38, 12, 0, Math.PI * 2);
      ctx.fill();
      rect(ctx, '#5a4a7a', 0, h * 0.55, w, h * 0.45);
      break;
    }
    case 'newborn': {
      sky(ctx, w, h, '#eef6fa', '#dcecf0');
      rect(ctx, '#c8e0e8', 0, h * 0.62, w, h * 0.38);
      rect(ctx, '#f0c8d8', w * 0.8, h * 0.12, 14, 18);
      break;
    }
    default: {
      // 사진관 배경: 가운데가 밝은 천
      const g = ctx.createRadialGradient(w / 2, h * 0.4, 8, w / 2, h * 0.45, w * 0.7);
      const col = year < 1990 ? ['#b8c4d0', '#56606e'] : year < 2040 ? ['#d8dce8', '#6a7088'] : ['#e8e0f8', '#6a5aa0'];
      g.addColorStop(0, col[0]);
      g.addColorStop(1, col[1]);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      if (kind === 'hwangap') for (let x = 6; x < w; x += 22) rect(ctx, '#e8b848', x, 6, 12, 4), rect(ctx, '#c83848', x + 4, 10, 4, 6);
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

/** 앨범 사진 한 장 (data URL). 사람이 기록에서 사라졌으면 그 자리는 비운다 */
export function photoURL(g: GameState, ph: Photo): string {
  const key = `${ph.id}:${ph.year}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const people = ph.ids.map((id, i) => ({ p: g.people[id], a: ph.ages[i] })).filter((x) => x.p);
  const back = people.filter((x) => x.a >= 15);
  const front = people.filter((x) => x.a < 15);
  const step = 30;
  const cols = Math.max(back.length, front.length, 2);
  const w = cols * step + 30;
  const h = 48 + (front.length ? 26 : 4) + 8;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  backdrop(ctx, ph.kind, w, h, ph.year);
  const draw = (row: typeof people, y: number) => {
    const x0 = Math.round((w - (row.length - 1) * step - 48) / 2);
    row.forEach(({ p, a }, i) => {
      const grid = bustGrid(p, a, ph.year, 'happy');
      const x = x0 + i * step;
      grid.forEach((r, yy) => r.forEach((col, xx) => col && ((ctx.fillStyle = col), ctx.fillRect(x + xx, y + yy, 1, 1))));
    });
  };
  draw(back, 6);
  if (front.length) draw(front, 32);
  ageFilter(ctx, w, h, ph.year);
  const url = c.toDataURL();
  cache.set(key, url);
  return url;
}
