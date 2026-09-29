import {
  ADVISOR_BASE_CUT,
  GENERATION_SKIP_SURCHARGE,
  GIFT_EXEMPT_ADULT,
  GIFT_EXEMPT_MINOR,
  GIFT_EXEMPT_SPOUSE,
  INHERIT_BASIC_DEDUCTION,
  INHERIT_SPOUSE_DEDUCTION,
  TAX_BRACKETS,
} from './data';

/** 누진세 계산 (만원) */
export function progressiveTax(base: number): number {
  if (base <= 0) return 0;
  let tax = 0;
  let lower = 0;
  for (const [upper, rate] of TAX_BRACKETS) {
    if (base <= lower) break;
    tax += (Math.min(base, upper) - lower) * rate;
    lower = upper;
  }
  return Math.round(tax);
}

export interface InheritanceTaxInput {
  /** 상속재산 평가액 (부동산은 기준시가) */
  assessed: number;
  /** 사망 전 10년 내 증여액 합계 (합산 과세) */
  priorGifts: number;
  /** 그 증여에 이미 낸 증여세 (공제) */
  priorGiftTax: number;
  spouseAlive: boolean;
  /** 세무사 선임 시 과세표준 추가 감면 */
  advisor?: boolean;
}

export function inheritanceTax(i: InheritanceTaxInput) {
  let deduction = INHERIT_BASIC_DEDUCTION + (i.spouseAlive ? INHERIT_SPOUSE_DEDUCTION : 0);
  const raw = Math.max(0, i.assessed + i.priorGifts - deduction);
  const advisorCut = i.advisor ? Math.round(raw * ADVISOR_BASE_CUT) : 0;
  deduction += advisorCut;
  const base = raw - advisorCut;
  const tax = Math.max(0, progressiveTax(base) - i.priorGiftTax);
  return { base, deduction, tax, advisorCut };
}

export interface GiftTaxOpts {
  /** 받는 사람이 미성년 */
  minor?: boolean;
  /** 배우자 간 증여 (6억 공제) */
  spouse?: boolean;
  /** 자녀를 건너뛰고 손주에게 (30% 할증) */
  skipGen?: boolean;
  advisor?: boolean;
}

/** 증여세: 수증자 기준 10년 합산, 공제 후 누진 */
export function giftTax(amount: number, prior10y: number, priorTaxPaid: number, o: GiftTaxOpts = {}): number {
  const exempt = o.spouse ? GIFT_EXEMPT_SPOUSE : o.minor ? GIFT_EXEMPT_MINOR : GIFT_EXEMPT_ADULT;
  let base = Math.max(0, amount + prior10y - exempt);
  if (o.advisor) base = Math.round(base * (1 - ADVISOR_BASE_CUT / 2));
  const total = progressiveTax(base) * (o.skipGen ? 1 + GENERATION_SKIP_SURCHARGE : 1);
  return Math.max(0, Math.round(total - priorTaxPaid));
}
