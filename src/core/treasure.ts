// 현물 자산: 금·은·보석·명품 시계·와인. 금고에 넣어 두는 재산.
//   금·은은 국제 금값(금 지수 s.gold, 2025년=100)을 따라 움직이고, 보석·시계·와인은 물건마다 따로 논다.
//   사는 값과 되파는 값이 다르다: 골드바는 수수료 2~5%, 보석은 되팔면 반값 가까이 (매입가 차이).
// 출처: 금값 연평균 — LBMA/World Gold Council 연평균 달러 시세(1960 $35 → 1980 $615 → 2000 $279 → 2010 $1,225
//   → 2020 $1,770 → 2024 $2,390 → 2025 약 $3,300) × 한국은행 연평균 원/달러 환율로 원화 환산해 2025년=100 지수로 만듦.
//   2025년 국내 금 시세 1g 약 15만 원 (한국거래소 KRX 금시장 기준 대략치), 은 1g 약 1,800원.
// 게임 속 돈은 "2025년 돈 가치"(economy.ts)라서, 명목 금값을 그대로 쓰면 물가로 두 번 깎인다 (1960년 금 한 돈 ≈ 4원).
//   그래서 금값은 실질 금값(명목 ÷ 소비자물가) ÷ 실질 소득 = "소득 대비 금값"으로 바꿔 histPrice 처럼 임금 지수를 곱한다.
//   → 1960년 한 돈 ≈ 1,300원(그해 돈), 1970년 ≈ 4,800원, 1990년 ≈ 5.8만 원 (당시 금은방 시세 1990년 한 돈 4~5만 원대와 비슷).
// 보석·시계·와인은 국제 시세(달러)로 값이 매겨지는 수입 사치품이라, 소득이 낮던 시절엔 소득 대비 훨씬 비쌌다.
//   소득 대비 값 = (1 / 실질 소득)^lux. lux 는 수입 의존도·희소성 (다이아·시계·와인 0.7, 진주 0.6, 비취 0.5).
//   → 1990년 1캐럿 다이아 ≈ 680만 원(그해 돈; 당시 예물 다이아 500~1,000만 원대).
// 출처: 실질 소득 — 통계청 1인당 실질 국민총소득(histidx.ts REAL_INCOME), 소비자물가 — 통계청 CPI(economy.ts).
import { formatMoney, priceLevel } from './economy';
import { histRealIncome, histWage } from './histidx';
import { alive, fullName, head } from './people';
import { wageIndex } from './pay';
import { chance, normal, pick } from './rng';
import type { Asset, GameState } from './types';

export interface Treasure {
  id: string;
  name: string;
  icon: string;
  /** 2025년 값 (만원) */
  base: number;
  /** 금 지수를 얼마나 따라가나 (0이면 따로 논다) */
  gold: number;
  /** 연 추가 상승률 · 변동성 */
  drift: number;
  vol: number;
  /** 되팔 때 깎이는 비율 */
  spread: number;
  /** 이 해부터 살 수 있다 */
  from?: number;
  /** 수입 사치품 정도: 소득이 낮던 시절 소득 대비 값이 (1/실질 소득)^lux 배 (금·은은 금값 연표를 따른다) */
  lux?: number;
  note: string;
}

export const TREASURES: Treasure[] = [
  { id: 'gold_don', name: '순금 한 돈 반지', icon: '💍', base: 56, gold: 1, drift: 0, vol: 0, spread: 0.08, note: '3.75g · 돌반지·결혼 예물의 단골' },
  { id: 'gold_100', name: '골드바 100g', icon: '🥇', base: 1500, gold: 1, drift: 0, vol: 0, spread: 0.04, note: '금값을 그대로 따라간다 · 되팔 때 수수료 약 4%' },
  { id: 'gold_kg', name: '골드바 1kg', icon: '🧈', base: 15000, gold: 1, drift: 0, vol: 0, spread: 0.02, note: '큰손들의 안전자산 · 수수료 약 2%' },
  { id: 'silver_kg', name: '은괴 1kg', icon: '🥈', base: 180, gold: 1.3, drift: -0.005, vol: 0.06, spread: 0.12, note: '금보다 더 크게 출렁인다' },
  { id: 'diamond', lux: 0.7, name: '1캐럿 다이아몬드', icon: '💎', base: 1500, gold: 0, drift: -0.01, vol: 0.05, spread: 0.45, note: '영원하지만 되팔면 반값 · 랩 다이아에 값이 눌린다' },
  { id: 'pearl', lux: 0.6, name: '남양 진주 목걸이', icon: '📿', base: 300, gold: 0, drift: 0, vol: 0.04, spread: 0.5, note: '예물·대물림용 · 되팔면 반값' },
  { id: 'jade', lux: 0.5, name: '비취 가락지', icon: '🟢', base: 800, gold: 0, drift: 0.015, vol: 0.06, spread: 0.4, note: '할머니의 할머니 때부터 귀한 돌' },
  { id: 'watch', lux: 0.7, name: '스위스 명품 시계', icon: '⌚', base: 1800, gold: 0, drift: 0.03, vol: 0.1, spread: 0.15, from: 1975, note: '인기 모델은 웃돈이 붙는다' },
  { id: 'wine', lux: 0.7, name: '그랑 크뤼 와인 한 상자', icon: '🍷', base: 2400, gold: 0, drift: 0.05, vol: 0.12, spread: 0.2, from: 1990, note: '해가 갈수록 익지만, 보관을 잘못하면 식초' },
];
export const TREASURE_BY_ID: Record<string, Treasure> = Object.fromEntries(TREASURES.map((t) => [t.id, t]));

/** 원화 명목 금값 지수 (2025=100): 연평균 달러 시세 × 원/달러 환율 */
const GOLD_HIST: [number, number][] = [
  [1960, 0.05], [1970, 0.24], [1975, 1.65], [1980, 7.97], [1985, 5.89], [1990, 5.79], [1995, 6.32],
  [2000, 6.73], [2005, 9.72], [2008, 21.0], [2010, 30.2], [2013, 37.0], [2015, 28.0], [2020, 44.6], [2024, 69.6], [2025, 100],
];
function goldNominal(year: number): number {
  if (year <= GOLD_HIST[0][0]) return GOLD_HIST[0][1];
  for (let i = 1; i < GOLD_HIST.length; i++) {
    const [y1, v1] = GOLD_HIST[i];
    const [y0, v0] = GOLD_HIST[i - 1];
    if (year <= y1) return v0 * Math.pow(v1 / v0, (year - y0) / (y1 - y0));
  }
  return 100;
}
/** 게임 돈(2025년 가치) 기준 금값 지수 (2025=100): 소득 대비 실질 금값 × 게임 임금 지수 */
export function goldHist(year: number): number {
  if (year >= 2025) return 100;
  const real = goldNominal(year) / priceLevel(year);
  return (real / histRealIncome(year)) * histWage(year);
}
/** 보석·시계·와인 값 배율 (2025=1): 2025년 이후는 임금 지수, 그 전은 소득 대비 사치품 값 */
function luxIndex(year: number, lux: number): number {
  if (year >= 2025) return wageIndex(year);
  return Math.pow(1 / histRealIncome(year), lux) * histWage(year);
}
export const goldIndex = (s: GameState) => s.gold ?? goldHist(Math.min(2025, s.year));

/** 지금 사는 값 */
export function treasurePrice(s: GameState, t: Treasure): number {
  if (t.gold) return Math.max(1, Math.round((t.base * goldIndex(s)) / 100));
  // 보석·시계·와인: 2025년 값 × 그 시대 소득 대비 사치품 값
  return Math.max(1, Math.round(t.base * luxIndex(s.year, t.lux ?? 0)));
}
export const treasureOf = (a: Asset) => (a.kind === 'treasure' ? TREASURE_BY_ID[a.item ?? ''] : undefined);
/** 되팔 때 손에 쥐는 돈 */
export const treasureSellValue = (a: Asset) => Math.round(a.value * (1 - (treasureOf(a)?.spread ?? 0.1)));

export function buyTreasure(s: GameState, id: string): { ok: boolean; text: string } {
  const t = TREASURE_BY_ID[id];
  const h = head(s);
  if (!t) return { ok: false, text: '' };
  if (t.from && s.year < t.from) return { ok: false, text: '아직 이 물건을 살 수 없는 시대다' };
  const price = treasurePrice(s, t);
  if (h.cash < price) return { ok: false, text: '현금이 부족하다' };
  h.cash -= price;
  s.assets.push({ id: 'a' + s.idSeq++, kind: 'treasure', item: t.id, name: t.name, ownerId: h.id, value: price, cost: price, bought: s.year });
  return { ok: true, text: `${t.icon} ${t.name}을(를) ${formatMoney(price)}에 샀다. 금고에 넣었다.\n${t.note}` };
}

/** 해마다: 금값이 움직이고, 물건마다 값이 바뀌고, 드물게 도둑이 든다 */
export function treasureYear(s: GameState): string[] {
  const msgs: string[] = [];
  const before = goldIndex(s);
  // 2025년까지는 실제 금값, 그 뒤로는 연 5% 안팎 ±14% (장기 평균, 안전자산 수요)
  const after = s.year <= 2025 ? goldHist(s.year) : Math.max(5, before * (1 + Math.max(-0.35, Math.min(0.6, normal(s, 0.05, 0.14)))));
  if (s.year > 2025) s.gold = Math.round(after * 10) / 10;
  const r = after / Math.max(0.01, before) - 1;
  if (s.year > 2025 && Math.abs(r) >= 0.2) msgs.push(r > 0 ? `📰 금값 ${Math.round(r * 100)}% 폭등! "안전자산으로 돈이 몰린다"` : `📰 금값 ${Math.round(-r * 100)}% 급락. 금은방 앞이 한산하다`);
  for (const a of s.assets) {
    const t = treasureOf(a);
    if (!t) continue;
    a.prev = a.value;
    const own = t.vol ? normal(s, 0, t.vol) : 0;
    a.value = Math.max(1, Math.round(a.value * (1 + r * t.gold + t.drift + own)));
    if (t.id === 'wine' && chance(s, 0.02)) {
      a.value = Math.round(a.value * 0.1);
      a.name = '상해 버린 와인 한 상자';
      msgs.push(`🍷 와인 저장고 온도 관리 실패. ${t.name}이 식초가 됐다`);
    }
  }
  // 도둑: 보석·시계가 많을수록 노린다 (금고에 둔 골드바는 덜)
  const loot = s.assets.filter((a) => a.kind === 'treasure' && (treasureOf(a)?.gold ?? 1) === 0);
  if (loot.length && chance(s, 0.012 * Math.min(4, loot.length))) {
    const a = pick(s, loot);
    const o = s.people[a.ownerId];
    s.assets = s.assets.filter((x) => x.id !== a.id);
    msgs.push(`🚨 빈집털이! ${o && alive(o) ? fullName(o) + '의 ' : ''}${a.name}을(를) 도둑맞았다 (${formatMoney(a.value)})`);
  }
  return msgs;
}
