import {
  GIFT_EXEMPT_ADULT,
  GIFT_EXEMPT_MINOR,
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
}

export function inheritanceTax(i: InheritanceTaxInput) {
  const deduction = INHERIT_BASIC_DEDUCTION + (i.spouseAlive ? INHERIT_SPOUSE_DEDUCTION : 0);
  const base = Math.max(0, i.assessed + i.priorGifts - deduction);
  const tax = Math.max(0, progressiveTax(base) - i.priorGiftTax);
  return { base, deduction, tax };
}

/** 증여세: 수증자 기준 10년 합산, 공제 후 누진 */
export function giftTax(amount: number, prior10y: number, priorTaxPaid: number, minor: boolean): number {
  const exempt = minor ? GIFT_EXEMPT_MINOR : GIFT_EXEMPT_ADULT;
  const total = progressiveTax(Math.max(0, amount + prior10y - exempt));
  return Math.max(0, total - priorTaxPaid);
}
