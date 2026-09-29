import { assessedValue, assetsOf, formatMoney } from './economy';
import { alive, age, childrenOf, clamp, fullName, head, isDescendantOf, parentsOf, siblingsOf, spouseOf, addFlag } from './people';
import { giftTax, inheritanceTax } from './tax';
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

/**
 * 사망자 재산 정산: 상속세 계산 → 납부(현금 부족 시 부동산 매각) → 분배.
 * 가주였던 사람이면 유언(s.will)을 따르고, 부동산은 가장 큰 지분을 받는 사람(동률이면 후계자)에게.
 */
export function settleEstate(s: GameState, d: Person, successorId?: string): EstateReport {
  const wasHead = d.id === s.headId;
  const assets = assetsOf(s, d.id);
  const gross = d.cash + assets.reduce((t, a) => t + a.value, 0);
  const assessed = d.cash + assets.reduce((t, a) => t + assessedValue(a), 0);
  const recent = s.gifts.filter((g) => g.fromId === d.id && s.year - g.year < 10);
  const priorGifts = recent.reduce((t, g) => t + g.amount, 0);
  const priorGiftTax = recent.reduce((t, g) => t + g.tax, 0);
  const sp = spouseOf(s, d);
  const { tax, deduction, base } = inheritanceTax({ assessed: Math.max(0, assessed), priorGifts, priorGiftTax, spouseAlive: !!sp && alive(sp) });

  const lines: string[] = [];
  lines.push(`재산 시가 ${formatMoney(gross)} (세법상 평가액 ${formatMoney(assessed)})`);
  if (priorGifts) lines.push(`10년 내 사전증여 ${formatMoney(priorGifts)} 합산`);
  lines.push(`공제 ${formatMoney(deduction)} → 과세표준 ${formatMoney(base)}`);
  lines.push(`상속세 ${formatMoney(tax)}` + (gross > 0 ? ` (실효세율 ${((tax / Math.max(1, gross)) * 100).toFixed(1)}%)` : ''));

  // 세금 납부: 현금 → 부동산 싼 것부터 매각
  let cash = d.cash - tax;
  const sorted = [...assets].sort((a, b) => a.value - b.value);
  while (cash < 0 && sorted.length) {
    const a = sorted.shift()!;
    cash += a.value;
    s.assets = s.assets.filter((x) => x.id !== a.id);
    lines.push(`세금 납부를 위해 ${a.name}(${formatMoney(a.value)}) 매각`);
  }
  const kept = sorted;

  const shares = wasHead ? willShares(s, d, successorId) : legalShares(s, d);
  const total = [...shares.values()].reduce((a, b) => a + b, 0);
  if (total === 0) {
    s.familyCash += cash;
    for (const a of kept) a.ownerId = 'family';
    lines.push('상속인이 없어 재산이 가문 금고로 귀속되었다');
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
      lines.push(`→ ${fullName(heir)}: ${formatMoney(got + assetPart)}` + (assetPart ? ` (부동산 포함)` : ''));
      // 가주의 자녀가 법정 몫의 70%도 못 받으면 불만
      if (wasHead && d.childIds.includes(id) && id !== successorId) {
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
  return undefined;
}

/** 가주 교체 (사망 승계 / 은퇴 승계 공통) */
export function transferHeadship(s: GameState, next: Person) {
  const prev = head(s);
  s.headId = next.id;
  s.heirId = undefined;
  s.will = 'legal';
  s.generation++;
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

/** 생전 증여 (현금). 수증자가 증여세 납부. */
export function giveGift(s: GameState, from: Person, to: Person, amount: number): { ok: boolean; msg: string } {
  if (from.cash < amount) return { ok: false, msg: '현금이 부족합니다' };
  const prior = s.gifts.filter((g) => g.toId === to.id && s.year - g.year < 10);
  const tax = giftTax(amount, prior.reduce((t, g) => t + g.amount, 0), prior.reduce((t, g) => t + g.tax, 0), age(s, to) < 20);
  from.cash -= amount;
  to.cash += amount - tax;
  s.gifts.push({ fromId: from.id, toId: to.id, amount, tax, year: s.year });
  to.affinity = clamp(to.affinity + 5, -100, 100);
  return { ok: true, msg: `${fullName(to)}에게 ${formatMoney(amount)} 증여 (증여세 ${formatMoney(tax)})` };
}

export function previewGiftTax(s: GameState, to: Person, amount: number): number {
  const prior = s.gifts.filter((g) => g.toId === to.id && s.year - g.year < 10);
  return giftTax(amount, prior.reduce((t, g) => t + g.amount, 0), prior.reduce((t, g) => t + g.tax, 0), age(s, to) < 20);
}
