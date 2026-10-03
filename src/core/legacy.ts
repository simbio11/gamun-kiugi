// 🏺 유산 상점 (메타 성장): 한 가문이 끝나면(가문 단절) 남긴 것만큼 "유산"을 받고,
// 다음 가문을 세울 때 유산으로 시작 혜택을 산다. 산 혜택은 그다음 가문 한 번에만 쓰인다 (소모형).
//
// · 유산 = 최종 점수 ÷ 40 + 세대 × 4 + 업적 ÷ 2 + 히든 카드 + 정점(대통령·대법원장 등 전설 카드) (최대 300).
//   근현대사·어려운 난이도는 조금 더 준다. 스스로 이야기를 마친 3대 이상 가문은 완결 보너스.
// · 한 번 시작할 때 담을 수 있는 소모형 혜택은 LEGACY_CAP 까지 (첫 아이가 너무 완성된 채 태어나지 않게).
// · 💠 가문 내력(PERMA_ITEMS): 비싸지만 계정에 영구로 남아 앞으로의 모든 가문에 적용된다. 돈·명예가 아니라 "규칙"을 바꾼다.
// · 🪦 조상 카드: 가문이 끝나면 마지막 가주가 조상이 되어, 다음 가문 아이에게 가장 뛰어났던 능력의 피(잠재력 +3)를 물려준다.
// · 혜택은 newGame 끝에서 정해진 순서로 적용한다: 같은 시드 + 같은 혜택이면 같은 결과 (재현성).
// · 저장은 UI가 맡는다 (localStorage). core는 계산과 적용만 한다.
// 기획안: docs/LEGACY_SHOP.md

import { addAsset } from './economy';
import { wageIndex } from './pay';
import { addFlag, addTrait, clamp, fullName, head, mark, parentsOf } from './people';
import { pick } from './rng';
import { TALENT_IDS } from './data';
import { grantRelic } from './relics';
import type { Ancestor, GameState, StatKey } from './types';
import { CARD } from './cards';
import { JOBS, STAT_NAMES } from './data';

export interface LegacyItem {
  id: string;
  icon: string;
  name: string;
  desc: string;
  cost: number;
  /** 한 가문에 몇 개까지 (기본 1) */
  max?: number;
  apply: (s: GameState) => string;
}

export const LEGACY_ITEMS: LegacyItem[] = [
  {
    id: 'seed_money', icon: '💰', name: '종잣돈', desc: '가문 금고 +5천만 원 (그 시대 물가)', cost: 12, max: 3,
    apply: (s) => ((s.familyCash += Math.round(5000 * wageIndex(s.year))), '조상이 묻어 둔 항아리에서 종잣돈이 나왔다.'),
  },
  {
    id: 'good_genes', icon: '🧬', name: '좋은 유전자', desc: '첫 아이의 잠재력 전부 +3', cost: 20, max: 2,
    apply: (s) => {
      const me = head(s);
      for (const k of Object.keys(me.potential) as (keyof typeof me.potential)[]) me.potential[k] = clamp(me.potential[k] + 3, 0, 98);
      return '할아버지를 쏙 빼닮았다는 말을 듣는다. (잠재력 +3)';
    },
  },
  {
    id: 'talent_seed', icon: '✨', name: '재능의 씨앗', desc: '첫 아이가 재능 하나를 타고난다 (이미 있으면 하나 더)', cost: 30,
    apply: (s) => {
      const me = head(s);
      const left = TALENT_IDS.filter((t) => !me.talents.some((x) => x.id === t));
      if (left.length) me.talents.push({ id: pick(s, left), discovered: false });
      return '아이에게 특별한 무언가가 있다. 적성검사로 확인해 보자.';
    },
  },
  {
    id: 'diligent', icon: '📘', name: '부지런한 기질', desc: '첫 아이가 "성실" 성격 (게으름은 사라진다)', cost: 15,
    apply: (s) => {
      const me = head(s);
      me.traits = (me.traits ?? []).filter((t) => t !== 'lazy');
      addTrait(me, 'diligent');
      return '새벽같이 일어나는 아이다.';
    },
  },
  {
    id: 'study_habit', icon: '📚', name: '공부 습관', desc: '첫 아이 지능 +4 · 공부 습관', cost: 15,
    apply: (s) => {
      const me = head(s);
      me.actual.int = clamp(me.actual.int + 4, 0, me.potential.int);
      mark(me, 'study', 2);
      return '책 읽는 게 놀이인 아이다.';
    },
  },
  {
    id: 'long_life', icon: '🌿', name: '장수 집안', desc: '첫 아이 건강 잠재력 +8', cost: 15,
    apply: (s) => {
      const me = head(s);
      me.potential.hp = clamp(me.potential.hp + 8, 0, 98);
      return '잔병치레 없는 튼튼한 아이다.';
    },
  },
  {
    id: 'family_home', icon: '🏠', name: '내 집 한 채', desc: '부모님이 집 한 채를 갖고 시작 (이미 있으면 땅 한 필지)', cost: 35,
    apply: (s) => {
      const dad = parentsOf(s, head(s))[0];
      if (!dad) return '';
      const hasHouse = s.assets.some((a) => (a.kind === 'apt_local' || a.kind === 'apt_seoul') && parentsOf(s, head(s)).some((q) => q.id === a.ownerId));
      if (hasHouse) addAsset(s, 'land', 'family', Math.round(s.market.land * 0.5), '조상 땅');
      else addAsset(s, 'apt_local', dad.id, s.market.apt_local, s.era === 'history' ? '기와집 (물려받은 집)' : '물려받은 아파트');
      return hasHouse ? '조상이 남긴 땅 한 필지가 있다.' : '조상 덕에 내 집에서 시작한다.';
    },
  },
  {
    id: 'fame_start', icon: '📜', name: '가문의 이름', desc: '시작 명성 +20', cost: 10, max: 3,
    apply: (s) => ((s.fame += 20), '"그 집안 사람"이라는 말에 문이 열린다.'),
  },
  {
    id: 'network', icon: '🤝', name: '든든한 인맥', desc: '첫 아이 인맥 +3 (취업·이직·정치에 유리)', cost: 12,
    apply: (s) => (mark(head(s), 'network', 3), '어릴 때부터 어른들 손에 이끌려 여기저기 인사를 다닌다.'),
  },
  {
    id: 'lucky_charm', icon: '🍀', name: '행운의 부적', desc: '이번 가문 내내 대형 이벤트 성공률 +6%p', cost: 30,
    apply: (s) => (addLegacyFlag(s, 'lucky_charm'), '대대로 내려오는 부적을 지갑에 넣었다.'),
  },
  {
    id: 'hidden_map', icon: '🗺', name: '숨은 길 지도', desc: '이번 가문 내내 히든 직업 제안 확률 ×1.4', cost: 40,
    apply: (s) => (addLegacyFlag(s, 'hidden_map'), '할아버지의 낡은 수첩에 이상한 표시들이 있다.'),
  },
  {
    id: 'heirloom', icon: '💍', name: '가보 한 점', desc: '가문 보물함에 가보 하나를 갖고 시작', cost: 25,
    apply: (s) => {
      const r = grantRelic(s, head(s), 'relic_family_ring');
      addFlag(head(s), 'legacy_heir');
      return r ? '할머니의 반지가 보물함에 있다.' : '';
    },
  },
];
export const LEGACY_BY_ID = Object.fromEntries(LEGACY_ITEMS.map((x) => [x.id, x]));

function addLegacyFlag(s: GameState, f: string) {
  (s.legacy ??= []).includes(f) || s.legacy.push(f);
}
export const hasLegacy = (s: GameState, f: string) => !!s.legacy?.includes(f);

/** 한 번 시작할 때 담을 수 있는 소모형 혜택 합계 */
export const LEGACY_CAP = 80;

/** 정점 카드: 이 자리에 오른 사람이 있으면 유산에 더한다 */
const APEX: Record<string, number> = { president: 30, un_sg: 25, nobel: 25, chief_justice: 20, prosecutor_general: 15, chaebol: 15, chief_of_staff: 12, constitutional: 12, bok_governor: 12, world_star: 12, billboard: 12, olympic: 12, great_author: 15, turing: 12, minister: 8 };

/** 유산 내역 (가문 결과 화면에 보여 준다) */
export function legacyParts(s: GameState): [string, number][] {
  const score = s.gameOver?.score ?? 0;
  const ids = new Set((s.cards ?? []).map((c) => c.id));
  const hidden = [...ids].filter((id) => CARD[id]?.hidden).length;
  const apex = [...ids].reduce((t, id) => t + (APEX[id] ?? (CARD[id]?.rarity === 'legend' && !CARD[id]?.hidden ? 6 : 0)), 0);
  const parts: [string, number][] = [
    ['가문 점수 ÷ 40', score / 40],
    [`${s.generation}대까지`, s.generation * 4],
    [`업적 ${s.achievements.length}개`, s.achievements.length / 2],
    [`히든 카드 ${hidden}종`, Math.min(60, hidden * 6)],
    ['정점에 오른 사람들 (대통령·대법원장·전설 카드)', Math.min(90, apex)],
  ];
  if (s.gameOver?.voluntary && s.generation >= 3) parts.push(['📕 이야기 완결 보너스', 15]);
  const dif = { easy: 0.8, normal: 1, hard: 1.25, hell: 1.5 }[s.difficulty ?? 'normal'] ?? 1;
  const hist = s.era === 'history' ? 1.1 : 1;
  return parts.map(([l, v]) => [l, Math.round(v * dif * hist)] as [string, number]).filter(([, v]) => v > 0);
}

/** 가문이 끝났을 때 받을 유산 */
export function legacyEarn(s: GameState): number {
  return clamp(legacyParts(s).reduce((t, [, v]) => t + v, 0), 5, 300);
}

// ───────── 💠 가문 내력 (영구) ─────────
export interface PermaItem {
  id: string;
  icon: string;
  name: string;
  desc: string;
  cost: number;
  /** 아직 열 수 없다 (준비 중) */
  locked?: boolean;
}
export const PERMA_ITEMS: PermaItem[] = [
  { id: 'young_fire', icon: '🔥', name: '젊은 날의 열정', desc: '가주가 20~39세인 해마다 행동력 +1', cost: 180 },
  { id: 'talent_line', icon: '🧬', name: '재능의 핏줄', desc: '부모의 재능이 아이에게 이어질 확률 30% → 55%', cost: 160 },
  { id: 'twin_line', icon: '👶', name: '쌍둥이 내력', desc: '직계 아이가 태어날 때 쌍둥이 확률 1.5% → 10%', cost: 120 },
  { id: 'summit_grit', icon: '⛰', name: '불굴의 혈통', desc: '정점 도전(명예의 전당 카드) 기회가 한 사람당 1번 더', cost: 200 },
  { id: 'ancestor_guard', icon: '🕯', name: '조상의 가호', desc: '가주가 65세 전에 세상을 떠날 운명이면 한 번 비켜 간다 (가주마다 한 번)', cost: 220 },
  { id: 'rival_bane', icon: '⚔', name: '숙적의 그림자', desc: '라이벌 가문이 재산·명성 40% 적게, 앙심 없이 시작한다', cost: 120 },
  { id: 'era_gaehwa', icon: '📜', name: '개화기 시작 (1890년대)', desc: '갑신정변 뒤 한성에서 가문을 연다 — 시대 콘텐츠를 만드는 중이라 아직 열 수 없다', cost: 300, locked: true },
];
export const PERMA_BY_ID = Object.fromEntries(PERMA_ITEMS.map((x) => [x.id, x]));
export const hasPerma = (s: GameState, id: string) => !!s.perma?.includes(id);

/** 새 가문에 가문 내력 적용 (newGame 끝에서) */
export function applyPerma(s: GameState, ids: string[]): string[] {
  s.perma = [...new Set(ids.filter((id) => PERMA_BY_ID[id] && !PERMA_BY_ID[id].locked))].sort();
  // 숙적의 그림자는 라이벌 가문이 처음 나타날 때(rival.ts initRival) 적용된다
  return s.perma.map((id) => `${PERMA_BY_ID[id].icon} ${PERMA_BY_ID[id].name}`);
}

// ───────── 🪦 조상 카드 ─────────
const STATS: StatKey[] = ['int', 'cha', 'str', 'mor', 'hp'];
/** 가문이 끝날 때: 마지막 가주를 조상 카드로 */
export function ancestorOf(s: GameState): Ancestor | undefined {
  const p = s.people[s.headId];
  if (!p) return undefined;
  const stat = STATS.reduce((a, b) => (p.actual[b] > p.actual[a] ? b : a), 'int' as StatKey);
  const peak = p.flags.find((f) => f.startsWith('peakjob:'))?.split(':').slice(2).join(':');
  const gen = Number(p.flags.find((f) => f.startsWith('gen:'))?.slice(4) ?? s.generation);
  return { name: fullName(p), family: s.familyName, gen, role: peak ?? JOBS[p.job]?.name ?? '평범한 삶', stat, value: Math.round(p.actual[stat]), born: p.birthYear, died: p.deathYear };
}
/** 새 가문 아이에게 조상의 피 */
export function applyAncestor(s: GameState, a: Ancestor): string {
  const me = head(s);
  me.potential[a.stat] = clamp(me.potential[a.stat] + 3, 0, 98);
  s.ancestor = a;
  addFlag(me, 'ancestor_blood');
  return `🪦 조상 카드: ${a.family}씨 ${a.gen}대 가주 ${a.name} (${a.born}~${a.died ?? ''}) · ${a.role}
   ${STAT_NAMES[a.stat]} ${a.value}의 피가 흐른다 (${STAT_NAMES[a.stat]} 잠재력 +3)`;
}

/** 새 가문에 산 혜택을 적용 (newGame 끝에서). 같은 목록이면 같은 결과 */
export function applyLegacy(s: GameState, items: string[]): string[] {
  const lines: string[] = [];
  for (const id of [...items].sort()) {
    const it = LEGACY_BY_ID[id];
    if (!it) continue;
    const t = it.apply(s);
    if (t) lines.push(`${it.icon} ${it.name}: ${t}`);
  }
  if (lines.length) addLegacyFlag(s, 'used');
  return lines;
}
