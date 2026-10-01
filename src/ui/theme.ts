// 가주 테마: 화면 전체 분위기가 "지금 가주"를 따라간다. (가족 직업은 상관없다 — 가주 본인만)
//   · 가주가 히든 직업(희귀 직업)이면 → 그 직업 빛깔로 물들고, 직업 소품(박쥐·비행기·카드…)이 화면을 오간다
//   · 아니면 → 나이대 테마: 크레파스(어린이) · 칠판과 공책(10대) · 청춘의 밤(20~30대) · 원목(중년, 기본) · 한지와 먹(노년)
import { HIDDEN_BY_ID, isSuperHidden } from '../core/hidden-data';
import { age, head } from '../core/people';
import type { GameState } from '../core/types';
import { hiddenArt } from './hidden-card';
import { decoOver, decoVars, ptcHTML, silHTML } from './theme-deco';

export interface Theme {
  id: string;
  label: string;
  /** CSS 변수 (#app 에 바로 꽂는다) */
  vars: Record<string, string>;
  art?: string;
  fx?: string;
  /** 희귀 직업 id (장식용) */
  job?: string;
}

const AGE: { max: number; id: string; label: string; vars: Record<string, string> }[] = [
  { max: 12, id: 'kid', label: '🖍 크레파스', vars: { '--bg': '#2c4a6e', '--bg2': '#3a5f88', '--panel': '#fff8ea', '--panel2': '#ffe3b8', '--ink': '#2a2f45', '--muted': '#7a6f8a', '--line': '#24304a', '--gold': '#ffb53b' } },
  { max: 19, id: 'teen', label: '📓 칠판과 공책', vars: { '--bg': '#22403a', '--bg2': '#2e5249', '--panel': '#f6f4ea', '--panel2': '#dfe9ee', '--ink': '#1f2a2c', '--muted': '#5f7275', '--line': '#16241f', '--gold': '#f2c94c' } },
  { max: 34, id: 'youth', label: '🌆 청춘의 밤', vars: { '--bg': '#1f2142', '--bg2': '#2d2f5c', '--panel': '#f4eef0', '--panel2': '#e6dcf2', '--ink': '#22203a', '--muted': '#7a6e8e', '--line': '#151530', '--gold': '#ff8f7a' } },
  { max: 54, id: 'prime', label: '🪵 원목과 가죽', vars: {} },
  { max: 999, id: 'elder', label: '🖌 한지와 먹', vars: { '--bg': '#252a26', '--bg2': '#343b35', '--panel': '#f0e9d8', '--panel2': '#ded3b8', '--ink': '#25281f', '--muted': '#6f6a58', '--line': '#161a16', '--gold': '#c9a54e' } },
];

function hsl(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255);
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l * 100];
  const d = mx - mn;
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s * 100, l * 100];
}
const H = (h: number, s: number, l: number) => `hsl(${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%)`;

/** 히든 직업 빛깔에서 화면 팔레트를 뽑는다 */
function jobVars(color: string, sup: boolean): Record<string, string> {
  const [h, s0] = hsl(color);
  const s = Math.max(28, Math.min(70, s0));
  return {
    '--bg': H(h, s * 0.55, 8),
    '--bg2': H(h, s * 0.5, 14),
    '--panel': H(h, 30, 93),
    '--panel2': H(h, 32, 84),
    '--ink': H(h, 35, 12),
    '--muted': H(h, 18, 40),
    '--line': H(h, 40, 6),
    '--gold': sup ? H(h, Math.min(85, s + 15), 66) : H(h, Math.min(80, s + 10), 62),
  };
}

export function themeOf(g: GameState): Theme {
  const h = head(g);
  const hj = HIDDEN_BY_ID[h.job];
  if (hj) {
    const a = hiddenArt(h.job, h.sex) ?? hiddenArt(h.job, h.sex === 'F' ? 'M' : 'F');
    return { id: 'job', label: `${hj.icon} ${hj.name}`, vars: { ...jobVars(hj.color, isSuperHidden(h.job)), ...decoVars(h.job) }, art: a?.src, fx: hj.fx, job: h.job };
  }
  const a = age(g, h);
  const t = AGE.find((x) => a <= x.max)!;
  return { id: t.id, label: t.label, vars: t.vars };
}

const ALL_VARS = ['--bg', '--bg2', '--panel', '--panel2', '--ink', '--muted', '--line', '--gold', '--td-edge', '--td-edge-h', '--td-corner'];
let last = '';
/** 화면에 테마를 입힌다. 색은 문서 전체(:root)에, 배경 그림·실루엣·입자는 다시 그려지지 않는 고정 층(#theme-bg·#theme-fx)에 — 클릭할 때마다 애니메이션이 처음으로 튀지 않게 */
export function applyTheme(root: HTMLElement, g: GameState | undefined, on: boolean): Theme | undefined {
  const t = g && on ? themeOf(g) : undefined;
  const key = t ? `${t.id}:${t.label}:${t.art ?? ''}` : '';
  root.dataset.theme = t?.id ?? '';
  root.dataset.themeFx = t?.fx ?? '';
  root.dataset.themeJob = t?.job ?? '';
  if (key === last) return t;
  last = key;
  const doc = document.documentElement;
  for (const v of ALL_VARS) doc.style.removeProperty(v);
  if (t) for (const [k, v] of Object.entries(t.vars)) doc.style.setProperty(k, v);
  layer('theme-bg', t ? bgHTML(t) : '', t ? `theme-bg ${t.id} ov-${t.job ? decoOver(t.job) : ''}` : 'theme-bg');
  layer('theme-fx', t?.job ? ptcHTML(t.job) : '', `theme-fx ov-${t?.job ? decoOver(t.job) : ''}`);
  return t;
}

function layer(id: string, html: string, cls: string) {
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement('div');
    el.id = id;
    el.setAttribute('aria-hidden', 'true');
    document.body.appendChild(el);
  }
  el.className = cls;
  el.innerHTML = html;
}

function bgHTML(t: Theme): string {
  if (t.id === 'prime') return '';
  // 카드 그림은 깔지 않는다: 원래 화면 결 그대로, 빛깔만 바꾸고 그 직업의 소품(박쥐·비행기…)이 오간다
  return `<i class="tb-pat"></i>${t.job ? `<div class="td-sil">${silHTML(t.job)}</div>` : ''}`;
}
