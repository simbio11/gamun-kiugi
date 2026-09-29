import { describe, expect, it } from 'vitest';
import { giftTax, inheritanceTax, progressiveTax } from '../src/core/tax';

describe('세금', () => {
  it('누진세 구간 계산', () => {
    expect(progressiveTax(0)).toBe(0);
    expect(progressiveTax(10000)).toBe(1000); // 1억 → 1천만
    expect(progressiveTax(50000)).toBe(9000); // 5억 → 1천 + 8천
    expect(progressiveTax(100000)).toBe(24000); // 10억 → 2.4억
    expect(progressiveTax(300000)).toBe(104000); // 30억 → 10.4억
    expect(progressiveTax(400000)).toBe(154000); // 40억 → 15.4억
  });

  it('상속세: 일괄공제·배우자공제·사전증여 합산', () => {
    expect(inheritanceTax({ assessed: 90000, priorGifts: 0, priorGiftTax: 0, spouseAlive: true }).tax).toBe(0);
    const r = inheritanceTax({ assessed: 150000, priorGifts: 0, priorGiftTax: 0, spouseAlive: false });
    expect(r.base).toBe(100000);
    expect(r.tax).toBe(24000);
    const withGift = inheritanceTax({ assessed: 150000, priorGifts: 20000, priorGiftTax: 3000, spouseAlive: false });
    expect(withGift.tax).toBe(progressiveTax(120000) - 3000);
  });

  it('증여세: 성인 5천만 공제, 10년 합산', () => {
    expect(giftTax(5000, 0, 0, false)).toBe(0);
    expect(giftTax(15000, 0, 0, false)).toBe(1000);
    expect(giftTax(10000, 5000, 0, false)).toBe(1000);
    expect(giftTax(5000, 0, 0, true)).toBe(300);
  });
});
