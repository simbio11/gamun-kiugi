import { describe, expect, it } from 'vitest';
import { newGame, simulateYear } from '../src/core/sim';
import { head } from '../src/core/people';
import { companyOf, COMPANIES, companyPay, hireTier, pickCompany, setCompany, smallCompany } from '../src/core/companies';
import { payOf, jobLabel } from '../src/core/economy';
import { EVENTS } from '../src/core/registry';

describe('회사 (companies.ts)', () => {
  it('최상위 이공계 졸업생은 대기업 이상, 지방대 평범한 능력은 중견 이하가 많다', () => {
    const s = newGame({ seed: 1, familyName: '김', sex: 'M' });
    const p = head(s);
    p.flags.push('univ_top', 'major:cs');
    p.actual.int = 88;
    const top = Array.from({ length: 40 }, () => hireTier(s, p, 'developer'));
    expect(top.filter((t) => ['global', 'S', 'A'].includes(t)).length).toBeGreaterThan(30);
    p.flags = p.flags.filter((f) => f !== 'univ_top' && f !== 'major:cs');
    p.flags.push('univ_local');
    p.actual.int = 55;
    const low = Array.from({ length: 40 }, () => hireTier(s, p, 'developer'));
    expect(low.filter((t) => ['mid', 'small', 'startup'].includes(t)).length).toBeGreaterThan(30);
  });
  it('입사하면 회사 이름이 붙고, 회사 급에 따라 연봉이 다르다', () => {
    const s = newGame({ seed: 2, familyName: '김', sex: 'M' });
    const p = head(s);
    p.birthYear = s.year - 28;
    p.job = 'developer';
    p.jobLevel = 1;
    s.events = [];
    simulateYear(s);
    expect(companyOf(p)).toBeTruthy();
    expect(jobLabel(p)).toContain(companyOf(p)!.name);
    setCompany(p, COMPANIES.find((c) => c.id === 'gooble')!);
    const hi = payOf(s, p, true)!;
    setCompany(p, smallCompany(s, 'small'));
    const lo = payOf(s, p, true)!;
    expect(hi).toBeGreaterThan(lo * 2);
    expect(companyPay(p)).toBeLessThan(1);
  });
  it('대기업 패러디·해외 가명 기업이 고르게 있고, 회사 이야기가 등록돼 있다', () => {
    expect(COMPANIES.filter((c) => c.tier === 'global').length).toBeGreaterThanOrEqual(12);
    expect(COMPANIES.filter((c) => ['S', 'A', 'B'].includes(c.tier)).length).toBeGreaterThanOrEqual(25);
    const s = newGame({ seed: 3, familyName: '김', sex: 'M' });
    expect(pickCompany(s, head(s), 'corp', 'S').tier).toBe('S');
    for (const id of ['co_poach', 'co_startup_exit', 'co_bonus', 'co_abroad', 'co_sme_heir', 'co_scandal', 'co_crunch']) expect(EVENTS[id]).toBeTruthy();
  });
});
