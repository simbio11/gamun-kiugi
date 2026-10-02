// 🏺 유산 상점 (메타 성장): 한 가문이 끝나면(가문 단절) 남긴 것만큼 "유산"을 받고,
// 다음 가문을 세울 때 유산으로 시작 혜택을 산다. 산 혜택은 그다음 가문 한 번에만 쓰인다 (소모형).
//
// · 유산 = 최종 점수 ÷ 40 + 세대 × 4 + 업적 ÷ 2 (최대 200). 근현대사·어려운 난이도는 조금 더 준다.
// · 혜택은 newGame 끝에서 정해진 순서로 적용한다: 같은 시드 + 같은 혜택이면 같은 결과 (재현성).
// · 저장은 UI가 맡는다 (localStorage). core는 계산과 적용만 한다.
// 기획안: docs/LEGACY_SHOP.md

import { addAsset } from './economy';
import { wageIndex } from './pay';
import { addFlag, addTrait, clamp, head, mark, parentsOf } from './people';
import { pick } from './rng';
import { TALENT_IDS } from './data';
import { grantRelic } from './relics';
import type { GameState } from './types';

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

/** 가문이 끝났을 때 받을 유산 */
export function legacyEarn(s: GameState): number {
  const score = s.gameOver?.score ?? 0;
  const dif = { easy: 0.8, normal: 1, hard: 1.25, hell: 1.5 }[s.difficulty ?? 'normal'] ?? 1;
  const hist = s.era === 'history' ? 1.1 : 1;
  const v = (score / 40 + s.generation * 4 + s.achievements.length / 2) * dif * hist;
  return clamp(Math.round(v), 5, 200);
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
