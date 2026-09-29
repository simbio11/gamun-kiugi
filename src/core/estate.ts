import { assessedValue, assetsOf, formatMoney } from './economy';
import { alive, age, childrenOf, clamp, fullName, head, isDescendantOf, parentsOf, siblingsOf, spouseOf, addFlag } from './people';
import { giftTax, inheritanceTax, type GiftTaxOpts } from './tax';
import { unlock } from './achievements';
import { rollMissions } from './missions';
import { chance } from './rng';
import type { GameState, Person } from './types';

export interface EstateReport {
  title: string;
  lines: string[];
  gross: number;
  tax: number;
}

/** 법정 상속인과 지분. 배우자 1.5 : 자녀 1. 없으면 부모 → 형제 순. */
function legalShares(s: GameState, d: Person): Map<string, number> {
  const m = new Map<string, number>();
  const sp = spouseOf(s, d);
  const kids = childrenOf(s, d).filter(alive);
  if (kids.length) {
    if (sp && alive(sp)) m.set(sp.id, 1.5);
    for (const k of kids) m.set(k.id, 1);
    return m;
  }
  if (sp && alive(sp)) {
    m.set(sp.id, 1);
    return m;
  }
  const pars = parentsOf(s, d).filter(alive);
  if (pars.length) {
    for (const p of pars) m.set(p.id, 1);
    return m;
  }
  for (const sib of siblingsOf(s, d).filter(alive)) m.set(sib.id, 1);
  return m;
}

function willShares(s: GameState, d: Person, successorId?: string): Map<string, number> {
  const kids = childrenOf(s, d).filter(alive);
  if (s.will === 'heir' && successorId && kids.some((k) => k.id === successorId)) return new Map([[successorId, 1]]);
  if (s.will === 'equal' && kids.length) return new Map(kids.map((k) => [k.id, 1]));
  return legalShares(s, d);
}

/** 지금 d가 사망하면 내야 할 상속세 (정산과 미리보기 공용) */
export function estateTax(s: GameState, d: Person) {
  const assets = assetsOf(s, d.id);
  const gross = d.cash + assets.reduce((t, a) => t + a.value, 0);
  const assessed = d.cash + assets.reduce((t, a) => t + assessedValue(a), 0);
  const recent = s.gifts.filter((g) => g.fromId === d.id && s.year - g.year < 10);
  const priorGifts = recent.reduce((t, g) => t + g.amount, 0);
  const priorGiftTax = recent.reduce((t, g) => t + g.tax, 0);
  const sp = spouseOf(s, d);
  const advisor = d.id === s.headId && s.policy.taxAdvisor;
  const r = inheritanceTax({ assessed: Math.max(0, assessed), priorGifts, priorGiftTax, spouseAlive: !!sp && alive(sp), advisor });
  return { ...r, gross, assessed, priorGifts, assets };
}

/** 세금 낼 때 먼저 팔리는 순서: 주식·코인 → 싼 것부터 */
const LIQUID: Record<string, number> = { stock: 0, coin: 0 };

/**
 * 사망자 재산 정산: 상속세 계산 → 납부(현금 부족 시 자산 매각) → 분배.
 * 가주였던 사람이면 유언(s.will)을 따르고, 실물 자산은 가장 큰 지분을 받는 사람(동률이면 후계자)에게.
 */
export function settleEstate(s: GameState, d: Person, successorId?: string, override?: Map<string, number>): EstateReport {
  const wasHead = d.id === s.headId;
  const { tax, deduction, base, gross, assessed, priorGifts, advisorCut, assets } = estateTax(s, d);

  const lines: string[] = [];
  lines.push(`재산 시가 ${formatMoney(gross)} (세법상 평가액 ${formatMoney(assessed)})`);
  if (priorGifts) lines.push(`10년 내 사전증여 ${formatMoney(priorGifts)} 합산`);
  if (advisorCut) lines.push(`세무사가 공제 항목을 찾아냈다 (-${formatMoney(advisorCut)})`);
  lines.push(`공제 ${formatMoney(deduction)} → 과세표준 ${formatMoney(base)}`);
  lines.push(`상속세 ${formatMoney(tax)}` + (gross > 0 ? ` (실효세율 ${((tax / Math.max(1, gross)) * 100).toFixed(1)}%)` : ''));
  if (wasHead && gross >= 200000 && tax / gross <= 0.1) unlock(s, 'taxsaver');

  // 세금 납부: 현금 → 주식·코인 → 싼 자산부터 매각. 위작은 헐값.
  let cash = d.cash - tax;
  const sorted = [...assets].sort((a, b) => (LIQUID[a.kind] ?? 1) - (LIQUID[b.kind] ?? 1) || a.value - b.value);
  while (cash < 0 && sorted.length) {
    const a = sorted.shift()!;
    const got = a.fake ? Math.round(a.value * 0.05) : a.value;
    cash += got;
    s.assets = s.assets.filter((x) => x.id !== a.id);
    lines.push(`세금 납부를 위해 ${a.name}(${formatMoney(got)}) 매각` + (a.fake ? ' — 감정 결과 위작이었다!' : ''));
  }
  let kept = sorted;

  const shares = override ?? (wasHead ? willShares(s, d, successorId) : legalShares(s, d));
  // 유언 없이 떠난 가주: 상속인끼리 합의가 안 돼 실물 자산을 헐값에 팔아 현금으로 나누고, 다툼이 생긴다
  const chaos = wasHead && !override && !s.willWritten && shares.size > 1;
  if (chaos) {
    lines.push('📜 유언장이 없었다. 상속인들의 합의가 틀어졌다.');
    for (const a of kept) {
      const got = Math.round((a.fake ? a.value * 0.05 : a.value) * 0.85);
      cash += got;
      s.assets = s.assets.filter((x) => x.id !== a.id);
      lines.push(`공동상속 분할을 위해 ${a.name} 급매 (${formatMoney(got)})`);
    }
    kept = [];
    const fee = Math.round(Math.max(0, cash) * 0.03);
    if (fee > 0 && chance(s, 0.6)) {
      cash -= fee;
      lines.push(`상속 소송으로 변호사 비용 ${formatMoney(fee)}`);
    }
  }
  const total = [...shares.values()].reduce((a, b) => a + b, 0);
  if (total === 0) {
    s.familyCash += cash;
    for (const a of kept) a.ownerId = 'family';
    lines.push('상속인이 없어 재산이 다음 가주에게 넘어간다');
  } else {
    const net = cash + kept.reduce((t, a) => t + a.value, 0);
    const ranked = [...shares.entries()].sort((a, b) => b[1] - a[1] || (a[0] === successorId ? -1 : b[0] === successorId ? 1 : 0));
    const assetTaker = ranked[0][0];
    const keptValue = kept.reduce((t, a) => t + a.value, 0);
    for (const a of kept) a.ownerId = assetTaker;
    const targets = new Map<string, number>();
    for (const [id, sh] of shares) targets.set(id, (net * sh) / total - (id === assetTaker ? keptValue : 0));
    const positive = [...targets.values()].filter((v) => v > 0).reduce((a, b) => a + b, 0);
    for (const [id, t] of targets) {
      const got = positive > 0 && t > 0 ? Math.round((cash * t) / positive) : 0;
      const heir = s.people[id];
      heir.cash += got;
      const assetPart = id === assetTaker ? keptValue : 0;
      lines.push(`→ ${fullName(heir)}: ${formatMoney(got + assetPart)}` + (assetPart ? ` (실물 자산 포함)` : ''));
      // 유언이 없으면 누군가는 꼭 서운하다
      if (chaos && d.childIds.includes(id) && chance(s, 0.35)) {
        addFlag(heir, 'grievance');
        heir.affinity = clamp(heir.affinity - 25, -100, 100);
      }
      // 가주의 자녀가 법정 몫의 70%도 못 받으면 불만
      if (wasHead && !override && d.childIds.includes(id) && id !== successorId) {
        const legal = legalShares(s, d);
        const lt = [...legal.values()].reduce((a, b) => a + b, 0);
        const fair = (net * (legal.get(id) ?? 0)) / Math.max(1, lt);
        if (got + assetPart < fair * 0.7) {
          addFlag(heir, 'grievance');
          heir.affinity = clamp(heir.affinity - 40, -100, 100);
        }
      }
    }
    // 가주가 아닌 자녀 중 한 푼도 못 받은 사람
    if (wasHead) {
      for (const k of childrenOf(s, d).filter(alive)) {
        if (!shares.has(k.id) && k.id !== successorId) {
          addFlag(k, 'grievance');
          k.affinity = clamp(k.affinity - 40, -100, 100);
          lines.push(`✗ ${fullName(k)}: 상속에서 배제됨`);
        }
      }
    }
  }
  d.cash = 0;
  return { title: `${fullName(d)}의 상속 정산`, lines, gross, tax };
}

/** 후계자 결정: 지명된 후계자 → 장자(첫째) → 가장 가까운 자손. 없으면 undefined(단절). */
export function chooseSuccessor(s: GameState, h: Person): Person | undefined {
  if (s.heirId) {
    const hp = s.people[s.heirId];
    if (hp && alive(hp) && isDescendantOf(s, hp, h)) return hp;
  }
  let gen: Person[] = childrenOf(s, h);
  while (gen.length) {
    const living = gen.filter(alive).sort((a, b) => a.birthYear - b.birthYear);
    if (living.length) return living[0];
    gen = gen.flatMap((p) => childrenOf(s, p));
  }
  // 자손이 없으면 조카를 양자로 (종가의 대를 잇는다)
  return adoptiveHeirs(s, h)[0];
}

/** 양자 후보: 형제자매의 자손 (가까운 촌수·젊은 성인 우선), 없으면 사촌 쪽 */
export function adoptiveHeirs(s: GameState, h: Person): Person[] {
  const ups = parentsOf(s, h);
  const gps = ups.flatMap((u) => parentsOf(s, u));
  for (const root of [ups, gps]) {
    const cands = Object.values(s.people).filter((p) => alive(p) && !p.inLaw && p.id !== h.id && root.some((r) => isDescendantOf(s, p, r)) && !parentsOf(s, h).includes(p));
    if (cands.length)
      return cands.sort((a, b) => Math.abs(age(s, a) - 30) - Math.abs(age(s, b) - 30)).slice(0, 6);
  }
  return [];
}

/** 가주 교체 (사망 승계 / 은퇴 승계 공통). newGen=false면 같은 세대 안에서 플레이 인물만 바꿈 */
export function transferHeadship(s: GameState, next: Person, newGen = true) {
  const prev = head(s);
  s.headId = next.id;
  s.heirId = undefined;
  s.will = 'legal';
  s.willWritten = false;
  if (newGen) {
    s.generation++;
    rollMissions(s);
  }
  for (const p of Object.values(s.people)) {
    if (!alive(p) || p.id === next.id) continue;
    if (p.id === next.spouseId) p.affinity = 60;
    else if (isDescendantOf(s, p, next)) p.affinity = 40;
    else if (siblingsOf(s, next).some((x) => x.id === p.id)) p.affinity = p.flags.includes('grievance') ? -30 : 20;
    else if (p.id === prev.id) p.affinity = 50;
    else p.affinity = 10;
  }
  if (!s.achievements.includes('second_gen')) s.achievements.push('second_gen');
}

/** 증여세 계산 옵션: 받는 사람과의 관계로 결정 */
function giftOpts(s: GameState, from: Person, to: Person): GiftTaxOpts {
  return {
    minor: age(s, to) < 20,
    spouse: from.spouseId === to.id,
    skipGen: from.spouseId !== to.id && !from.childIds.includes(to.id) && isDescendantOf(s, to, from),
    advisor: from.id === s.headId && s.policy.taxAdvisor,
  };
}

function priorTo(s: GameState, to: Person) {
  const prior = s.gifts.filter((g) => g.toId === to.id && s.year - g.year < 10);
  return [prior.reduce((t, g) => t + g.amount, 0), prior.reduce((t, g) => t + g.tax, 0)] as const;
}

export function previewGiftTax(s: GameState, from: Person, to: Person, amount: number): number {
  return giftTax(amount, ...priorTo(s, to), giftOpts(s, from, to));
}

/** 생전 증여 (현금). 수증자가 증여세 납부. */
export function giveGift(s: GameState, from: Person, to: Person, amount: number): { ok: boolean; msg: string } {
  if (from.cash < amount) return { ok: false, msg: '현금이 부족합니다' };
  const tax = previewGiftTax(s, from, to, amount);
  from.cash -= amount;
  to.cash += amount - tax;
  s.gifts.push({ fromId: from.id, toId: to.id, amount, tax, year: s.year });
  to.affinity = clamp(to.affinity + 5, -100, 100);
  return { ok: true, msg: `${fullName(to)}에게 ${formatMoney(amount)} 증여 (증여세 ${formatMoney(tax)})` };
}

/**
 * 현물 증여: 부동산·예술품은 세법상 평가액으로 과세 → 현금보다 싸게 넘길 수 있다.
 * 증여세는 수증자가 현금으로 낸다 (모자라면 빚).
 */
export function giveAsset(s: GameState, from: Person, to: Person, assetId: string): { ok: boolean; msg: string; tax: number } {
  const a = s.assets.find((x) => x.id === assetId && x.ownerId === from.id);
  if (!a) return { ok: false, msg: '증여할 수 없는 자산입니다', tax: 0 };
  const amount = assessedValue(a);
  const tax = previewGiftTax(s, from, to, amount);
  a.ownerId = to.id;
  to.cash -= tax;
  s.gifts.push({ fromId: from.id, toId: to.id, amount, tax, year: s.year });
  to.affinity = clamp(to.affinity + 8, -100, 100);
  return { ok: true, tax, msg: `${fullName(to)}에게 ${a.name} 증여 (평가액 ${formatMoney(amount)}, 증여세 ${formatMoney(tax)})` };
}

export function previewAssetGiftTax(s: GameState, from: Person, to: Person, assetId: string): number {
  const a = s.assets.find((x) => x.id === assetId);
  return a ? previewGiftTax(s, from, to, assessedValue(a)) : 0;
}
