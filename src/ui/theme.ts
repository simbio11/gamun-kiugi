// 가주 테마: 화면 전체 분위기가 "지금 가주"를 따라간다. (가족 직업은 상관없다 — 가주 본인만)
//   · 가주가 히든 직업(희귀 직업)이면 → 그 직업 빛깔로 물들고, 직업 소품(박쥐·비행기·카드…)이 화면을 오간다
//   · 아니면 → 집안 형편 테마: 반지하 · 원룸 · 서민 주택 · 아파트 · 고급 주택 · 빌딩 꼭대기 · 금고 (실내 도트 배경 + 작은 마스코트)
//     부모님 집에 얹혀살면 부모님 집 재산, 독립했으면 내 집(가주 부부) 재산으로 본다
import { HIDDEN_BY_ID, isSuperHidden } from '../core/hidden-data';
import { head, householder, spouseOf, alive } from '../core/people';
import { personWorth } from '../core/economy';
import { wageIndex } from '../core/pay';
import { roomURL } from '../render/room';
import type { GameState } from '../core/types';
import { hiddenArt } from './hidden-card';
import { decoOver, decoVars, ptcHTML, sheetURL, silHTML } from './theme-deco';

export interface Theme {
  id: string;
  label: string;
  /** CSS 변수 (#app 에 바로 꽂는다) */
  vars: Record<string, string>;
  art?: string;
  fx?: string;
  /** 희귀 직업 id (장식용) */
  job?: string;
  /** 집안 형편 단계 (0 반지하 ~ 6 금고) */
  tier?: number;
}

/** 집안 형편 7단계: 순자산 기준(2025년 돈, 그 시대 임금 수준으로 환산) */
export const WEALTH: { max: number; id: string; label: string; mascot: [string, string]; vars: Record<string, string> }[] = [
  { max: 3000, id: 'w0', label: '🐀 반지하', mascot: ['rat', 'rat2'], vars: { '--bg': '#1c201a', '--bg2': '#272c23', '--panel': '#ece8d8', '--panel2': '#d8d2bc', '--ink': '#20231c', '--muted': '#6a6a58', '--line': '#12140f', '--gold': '#b8b870' } },
  { max: 15000, id: 'w1', label: '🌀 원룸', mascot: ['fan', 'fan2'], vars: { '--bg': '#39414e', '--bg2': '#4a5462', '--panel': '#f8f6f0', '--panel2': '#e4e8ee', '--ink': '#22262e', '--muted': '#6e7684', '--line': '#1a1e26', '--gold': '#7ac0ff' } },
  { max: 50000, id: 'w2', label: '🍚 서민 주택', mascot: ['cooker', 'cooker2'], vars: { '--bg': '#45301f', '--bg2': '#5a4029', '--panel': '#f6ecd8', '--panel2': '#ead8b4', '--ink': '#2a1e14', '--muted': '#7d6a55', '--line': '#1d1410', '--gold': '#e8a050' } },
  { max: 200000, id: 'w3', label: '🏢 아파트', mascot: ['aircon', 'aircon2'], vars: { '--bg': '#2e3542', '--bg2': '#3c4556', '--panel': '#f6f6f4', '--panel2': '#e0e8e8', '--ink': '#1e2430', '--muted': '#68727e', '--line': '#141a24', '--gold': '#6ad0b8' } },
  { max: 1000000, id: 'w4', label: '🕯 고급 주택', mascot: ['chandelier', 'chandelier2'], vars: { '--bg': '#2a1c16', '--bg2': '#3a281e', '--panel': '#f6eee0', '--panel2': '#e8d8bc', '--ink': '#2a1a12', '--muted': '#7a6450', '--line': '#160e0a', '--gold': '#d8b060' } },
  { max: 5000000, id: 'w5', label: '🏙 빌딩 꼭대기', mascot: ['trophy', 'trophy2'], vars: { '--bg': '#0e1222', '--bg2': '#1a2036', '--panel': '#f2f0ec', '--panel2': '#dcdde4', '--ink': '#141824', '--muted': '#5e6476', '--line': '#080a14', '--gold': '#c8a050' } },
  { max: Infinity, id: 'w6', label: '💰 금고', mascot: ['goldpile', 'goldpile2'], vars: { '--bg': '#18140c', '--bg2': '#2a2214', '--panel': '#fbf4e0', '--panel2': '#f0dfb0', '--ink': '#241a08', '--muted': '#7a6640', '--line': '#0e0a04', '--gold': '#ffd040' } },
];

/** 이 집의 형편: 얹혀살면 부모님 집, 독립했으면 가주 부부의 순자산 */
export function wealthTier(g: GameState): number {
  const hh = householder(g);
  const sp = spouseOf(g, hh);
  const worth = personWorth(g, hh) + (sp && alive(sp) ? personWorth(g, sp) : 0);
  const k = worth / Math.max(0.05, wageIndex(g.year));
  return WEALTH.findIndex((w) => k < w.max);
}

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
  const tier = wealthTier(g);
  const w = WEALTH[tier];
  return { id: 'wealth', label: w.label, tier, vars: { ...w.vars, '--mascot': sheetURL(w.mascot[0], w.mascot[1]) } };
}

const ALL_VARS = ['--bg', '--bg2', '--panel', '--panel2', '--ink', '--muted', '--line', '--gold', '--td-edge', '--td-edge-h', '--td-corner', '--mascot'];
let last = '';
/** 화면에 테마를 입힌다. 색은 문서 전체(:root)에, 배경 그림·실루엣·입자는 다시 그려지지 않는 고정 층(#theme-bg·#theme-fx)에 — 클릭할 때마다 애니메이션이 처음으로 튀지 않게 */
export function applyTheme(root: HTMLElement, g: GameState | undefined, on: boolean): Theme | undefined {
  const t = g && on ? themeOf(g) : undefined;
  const key = t ? `${t.id}:${t.label}:${t.tier ?? ''}` : '';
  root.dataset.theme = t?.id ?? '';
  root.dataset.themeFx = t?.fx ?? '';
  root.dataset.themeJob = t?.job ?? '';
  root.dataset.tier = t?.tier !== undefined ? String(t.tier) : '';
  if (key === last) return t;
  last = key;
  const doc = document.documentElement;
  for (const v of ALL_VARS) doc.style.removeProperty(v);
  if (t) for (const [k, v] of Object.entries(t.vars)) doc.style.setProperty(k, v);
  layer('theme-bg', t ? bgHTML(t) : '', t ? `theme-bg ${t.id} ${t.tier !== undefined ? 'w' + t.tier : ''} ov-${t.job ? decoOver(t.job) : ''}` : 'theme-bg');
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
  if (t.tier !== undefined) return `<i class="tb-room" style="background-image:url('${roomURL(t.tier)}')"></i><i class="tb-pat"></i>`;
  // 카드 그림은 깔지 않는다: 원래 화면 결 그대로, 빛깔만 바꾸고 그 직업의 소품(박쥐·비행기…)이 오간다
  return `<i class="tb-pat"></i>${t.job ? `<div class="td-sil">${silHTML(t.job)}</div>` : ''}`;
}
