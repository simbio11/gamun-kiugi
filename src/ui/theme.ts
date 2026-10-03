// 가주 테마: 화면 전체 분위기가 "지금 가주"를 따라간다. (가족 직업은 상관없다 — 가주 본인만)
//   · 가주가 히든 직업(희귀 직업)이면 → 그 직업 빛깔로 물들고, 직업 소품(박쥐·비행기·카드…)이 화면을 오간다
//   · 아니면 → 사는 집 테마: 반지하 · 원룸 · 빌라 · 지방 아파트 · 수도권 아파트 · 서울 아파트 · 강남 (도트 배경 + 작은 마스코트)
//     실제로 사는 집(자가·전세·월세 상관없이 집 단계)으로 본다. 부모님 집에 얹혀살면 부모님 집.
import { HIDDEN_BY_ID, isSuperHidden } from '../core/hidden-data';
import { head } from '../core/people';
import { residence, tierOf } from '../core/housing';
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
  /** 희귀 직업 테마인데 전용 그림이 없을 때 깔 집 배경 단계 */
  roomTier?: number;
}

/** 사는 집 7단계 (housing.ts 집 단계 rank 0~6과 같은 순서) */
export const WEALTH: { max: number; id: string; label: string; mascot: [string, string]; vars: Record<string, string> }[] = [
  { max: 3000, id: 'w0', label: '🐀 반지하', mascot: ['rat', 'rat2'], vars: { '--bg': '#1c201a', '--bg2': '#272c23', '--panel': '#ece8d8', '--panel2': '#d8d2bc', '--ink': '#20231c', '--muted': '#6a6a58', '--line': '#12140f', '--gold': '#b8b870' } },
  { max: 15000, id: 'w1', label: '🌀 원룸', mascot: ['fan', 'fan2'], vars: { '--bg': '#39414e', '--bg2': '#4a5462', '--panel': '#f8f6f0', '--panel2': '#e4e8ee', '--ink': '#22262e', '--muted': '#6e7684', '--line': '#1a1e26', '--gold': '#7ac0ff' } },
  { max: 50000, id: 'w2', label: '🍚 빌라', mascot: ['cooker', 'cooker2'], vars: { '--bg': '#45301f', '--bg2': '#5a4029', '--panel': '#f6ecd8', '--panel2': '#ead8b4', '--ink': '#2a1e14', '--muted': '#7d6a55', '--line': '#1d1410', '--gold': '#e8a050' } },
  { max: 200000, id: 'w3', label: '🏢 지방 아파트', mascot: ['aircon', 'aircon2'], vars: { '--bg': '#2e3542', '--bg2': '#3c4556', '--panel': '#f6f6f4', '--panel2': '#e0e8e8', '--ink': '#1e2430', '--muted': '#68727e', '--line': '#141a24', '--gold': '#6ad0b8' } },
  { max: 1000000, id: 'w4', label: '🏙 수도권 아파트', mascot: ['chandelier', 'chandelier2'], vars: { '--bg': '#2a1c16', '--bg2': '#3a281e', '--panel': '#f6eee0', '--panel2': '#e8d8bc', '--ink': '#2a1a12', '--muted': '#7a6450', '--line': '#160e0a', '--gold': '#d8b060' } },
  { max: 5000000, id: 'w5', label: '🕯 서울 아파트', mascot: ['trophy', 'trophy2'], vars: { '--bg': '#0e1222', '--bg2': '#1a2036', '--panel': '#f2f0ec', '--panel2': '#dcdde4', '--ink': '#141824', '--muted': '#5e6476', '--line': '#080a14', '--gold': '#c8a050' } },
  { max: Infinity, id: 'w6', label: '💰 강남', mascot: ['goldpile', 'goldpile2'], vars: { '--bg': '#18140c', '--bg2': '#2a2214', '--panel': '#fbf4e0', '--panel2': '#f0dfb0', '--ink': '#241a08', '--muted': '#7a6640', '--line': '#0e0a04', '--gold': '#ffd040' } },
];

/** 지금 사는 집의 단계 (0 반지하 ~ 6 강남). 집 기록이 없으면 빌라(2) */
export function wealthTier(g: GameState): number {
  const h = residence(g).home;
  return h ? Math.max(0, Math.min(6, tierOf(g, h.tier).rank)) : 2;
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
    // 그 직업 그림이 없으면 지금 집안 형편 배경 위에 직업 빛깔을 입힌다 (tier 는 배경 그림 고르기에만 쓴다)
    return { id: 'job', label: `${hj.icon} ${hj.name}`, vars: { ...jobVars(hj.color, isSuperHidden(h.job)), ...decoVars(h.job) }, art: a?.src, fx: hj.fx, job: h.job, roomTier: wealthTier(g) };
  }
  const tier = wealthTier(g);
  const w = WEALTH[tier];
  // 이름은 시대를 탄다 (1960년대 판잣집 셋방 … 먼 미래 주거 모듈): 아이콘만 단계에서, 이름은 실제 집에서
  const home = residence(g).home;
  const label = home ? `${w.label.split(' ')[0]} ${tierOf(g, home.tier).name}` : w.label;
  return { id: 'wealth', label, tier, vars: { ...w.vars, '--mascot': sheetURL(w.mascot[0], w.mascot[1]) } };
}

const ALL_VARS = ['--bg', '--bg2', '--panel', '--panel2', '--ink', '--muted', '--line', '--gold', '--td-edge', '--td-edge-h', '--td-corner', '--mascot'];
let last = '';
/** 화면에 테마를 입힌다. 색은 문서 전체(:root)에, 배경 그림·실루엣·입자는 다시 그려지지 않는 고정 층(#theme-bg·#theme-fx)에 — 클릭할 때마다 애니메이션이 처음으로 튀지 않게 */
export function applyTheme(root: HTMLElement, g: GameState | undefined, on: boolean): Theme | undefined {
  const t = g && on ? themeOf(g) : undefined;
  const key = t ? `${t.id}:${t.label}:${t.tier ?? ''}:${t.roomTier ?? ''}` : '';
  root.dataset.theme = t?.id ?? '';
  root.dataset.themeFx = t?.fx ?? '';
  root.dataset.themeJob = t?.job ?? '';
  root.dataset.tier = t?.tier !== undefined ? String(t.tier) : '';
  if (key === last) return t;
  last = key;
  const doc = document.documentElement;
  for (const v of ALL_VARS) doc.style.removeProperty(v);
  if (t) for (const [k, v] of Object.entries(t.vars)) doc.style.setProperty(k, v);
  // 배경 층: 재산별 배경을 빌려 쓰는 희귀 직업은 집안 형편 테마와 같은 모양(wealth wN)으로 그린다
  const bgCls = t && borrowsRoom(t) ? `theme-bg wealth w${t.roomTier}` : t ? `theme-bg ${t.id} ${t.tier !== undefined ? 'w' + t.tier : ''} ov-${t.job ? decoOver(t.job) : ''}` : 'theme-bg';
  layer('theme-bg', t ? bgHTML(t) : '', bgCls);
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

const THEME_ASSETS = import.meta.glob<string>('../assets/themes/*.webp', { eager: true, import: 'default' });

export function themeAssetURL(key: string): string | undefined {
  const entry = Object.entries(THEME_ASSETS).find(([p]) => p.endsWith(`/${key}.webp`));
  return entry ? entry[1] : undefined;
}

const JOB_THEME_MAP: Record<string, string> = {
  // 슈퍼 히든 (17종 - 대모는 대부 배경 공유, 나머지 전원 본인 전용 배경)
  hj_vtuber: 'hj_vtuber',
  hj_drifter: 'hj_drifter',
  hj_vampire: 'hj_vampire',
  hj_private_jet: 'hj_private_jet',
  hj_underground_dealer: 'hj_underground_dealer',
  hj_chess_master: 'hj_chess_master',
  hj_mafia: 'hj_mafia',
  hj_godmother: 'hj_mafia', // 밤의 대모는 대부와 같은 배경 공유
  hj_art_investigator: 'hj_art_investigator',
  hj_michelin_inspector: 'hj_michelin_inspector',
  hj_conservator: 'hj_conservator',
  hj_bodyguard: 'hj_bodyguard',
  hj_detective: 'hj_detective',
  hj_perfumer: 'hj_perfumer',
  hj_stargazer: 'hj_stargazer',
  hj_pope: 'hj_pope',
  hj_space_analyst: 'hj_space_analyst',

  // 일반 히든: 22종 모두 본인 전용 배경
  hj_magician: 'hj_magician',
  hj_gambler: 'hj_gambler',
  hj_natural: 'hj_natural',
  hj_hermit: 'hj_hermit',
  hj_assassin: 'hj_assassin',
  hj_spy: 'hj_spy',
  hj_smuggler: 'hj_smuggler',
  hj_pirate: 'hj_pirate',
  hj_mercenary: 'hj_mercenary',
  hj_trader: 'hj_trader',
  hj_bounty: 'hj_bounty',
  hj_tarot: 'hj_tarot',
  hj_thief: 'hj_thief',
  hj_exorcist: 'hj_exorcist',
  hj_nomad: 'hj_nomad',
  hj_fighter: 'hj_fighter',
  hj_forger: 'hj_forger',
  hj_hacker: 'hj_hacker',
  hj_shaman: 'hj_shaman',
  hj_adventurer: 'hj_adventurer',
  hj_memecoin: 'hj_memecoin',
  hj_cult: 'hj_cult',
};

/** 집 단계 → 도트 배경: 반지하 tier1 · 원룸·빌라 tier2(골목) · 아파트 tier3(복도) · 서울 아파트 tier4(한강 거실) · 강남 tier5(저택) */
const TIER_THEME_MAP: Record<number, string> = {
  0: 'tier1',
  1: 'tier2',
  2: 'tier2',
  3: 'tier3',
  4: 'tier3',
  5: 'tier4',
  6: 'tier5',
};

function bgHTML(t: Theme): string {
  if (t.job) {
    const assetKey = JOB_THEME_MAP[t.job];
    const own = assetKey ? themeAssetURL(assetKey) : undefined;
    // 전용 그림이 없으면 재산별 도트 배경을 그대로 쓴다 (집안 형편 테마와 똑같이)
    if (!own && t.roomTier !== undefined) return roomHTML(t.roomTier);
    return `${own ? `<i class="tb-room custom-bg" style="background-image:url('${own}')"></i>` : ''}<i class="tb-pat job-tint"></i><div class="td-sil">${silHTML(t.job)}</div>`;
  }
  if (t.tier !== undefined) return roomHTML(t.tier);
  return `<i class="tb-pat"></i>`;
}

/** 재산별 도트 배경 */
function roomHTML(tier: number): string {
  const assetKey = TIER_THEME_MAP[tier];
  const bgUrl = assetKey ? themeAssetURL(assetKey) : undefined;
  return `<i class="tb-room custom-bg" style="background-image:url('${bgUrl ?? roomURL(tier)}')"></i><i class="tb-pat"></i>`;
}
/** 희귀 직업인데 전용 그림이 없어 재산별 배경을 쓰는가 */
const borrowsRoom = (t: Theme) => !!t.job && t.roomTier !== undefined && !(JOB_THEME_MAP[t.job] && themeAssetURL(JOB_THEME_MAP[t.job]));
