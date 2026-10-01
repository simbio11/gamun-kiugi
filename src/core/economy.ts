import { chance, normal, pick } from './rng';
import { minYears, rankLine } from './rank';
import { ASSESS_RATIO, ASSET_NAMES, CREATORS, EDU_COST, JOBS, TALENTS } from './data';
import { mark, markOf, parentsOf } from './people';
import { addFlag, age, alive, check, clamp, hasFlag, discoverTalent, fullName, hasTalent, hasTrait, head, householder, isMainline, livingMainlineMinors } from './people';
import type { Asset, AssetKind, GameState, MarketKey, Person } from './types';
import { promoteMult } from './marks';
import { BASE_YEAR, BASIC_PENSION, GRAD_STIPEND, incomeTax, NPS_A, PAY, PUBLIC_PENSION, wageIndex } from './pay';
import { isRealty, netOf, realtyForecast, realtyYear, sellRealty } from './realty';
import { housingYear, JEONSE_LOAN_RATE } from './housing';
import { vehicleUpkeep, vehicleYear } from './vehicle';
import { petUpkeep } from './lifecost';
import { debtRate } from './debt';
import { medicalCost, woeItems } from './woes';
import { HIST_BASE, histPrice, SINCE } from './histidx';
import { allowanceOf, allowanceYear } from './allowance';
import { allowanceForecast, careYear, childAllowanceYear, reverseMortgageYear, youthAccountYear } from './welfare';

// ───────── 물가: 게임 속 계산은 모두 "2025년 돈 가치"로 하고, 보여 줄 때만 그해 돈으로 바꾼다 ─────────
// 그래서 밸런스는 그대로다. 1970년 짜장면은 몇백 원, 2080년 짜장면은 몇만 원으로 보일 뿐.
/** 소비자물가지수 (2025 = 1, 통계청 CPI를 어림한 값) */
const CPI: [number, number][] = [
  [1955, 0.008], [1960, 0.014], [1965, 0.025], [1970, 0.043], [1975, 0.09], [1980, 0.2], [1985, 0.29], [1990, 0.375], [1995, 0.49],
  [1998, 0.57], [2000, 0.58], [2005, 0.665], [2010, 0.75], [2015, 0.81], [2020, 0.86], [2022, 0.925], [2025, 1],
];
/** 그해 물가 (2025 = 1). 2026년부터는 해마다 2%씩 (한국은행 물가 목표) */
export function priceLevel(y: number): number {
  if (y >= 2025) return Math.pow(1.02, y - 2025);
  if (y <= CPI[0][0]) return CPI[0][1];
  for (let i = 1; i < CPI.length; i++)
    if (y <= CPI[i][0]) {
      const [y0, v0] = CPI[i - 1];
      const [y1, v1] = CPI[i];
      return v0 * Math.pow(v1 / v0, (y - y0) / (y1 - y0));
    }
  return 1;
}
let MONEY_YEAR = 2025;
let NOMINAL = true;
/** 지금 보여 줄 해 (게임이 한 해 넘어갈 때마다) */
export const setMoneyYear = (y: number) => (MONEY_YEAR = y);
/** 그해 돈으로 보여 줄까(true) 2025년 돈으로 보여 줄까(false) */
export const setNominal = (on: boolean) => (NOMINAL = on);
export const isNominal = () => NOMINAL;

export function formatMoney(man0: number): string {
  const man = NOMINAL ? man0 * priceLevel(MONEY_YEAR) : man0;
  const neg = man < 0;
  // 1만 원이 안 되는 돈은 원 단위로 (1960년대 짜장면 값 같은)
  if (Math.abs(man) < 1 && man !== 0) return (neg ? '-' : '') + (Math.max(10, Math.round((Math.abs(man) * 10000) / 10) * 10)).toLocaleString('ko-KR') + '원';
  const v = Math.abs(Math.round(man));
  let out: string;
  if (v >= 100000000) {
    const jo = v / 100000000;
    out = (jo >= 100 ? Math.round(jo).toLocaleString('ko-KR') : jo.toFixed(1).replace(/\.0$/, '')) + '조';
  } else if (v >= 10000) {
    const eok = v / 10000;
    out = (eok >= 100 ? Math.round(eok).toLocaleString('ko-KR') : eok.toFixed(1).replace(/\.0$/, '')) + '억';
  } else out = v.toLocaleString('ko-KR') + '만';
  return (neg ? '-' : '') + out;
}

/** "3만 원"·"1.2억 원"·"500원" */
export const formatWon = (man: number) => {
  const t = formatMoney(man);
  return t.endsWith('원') ? t : t + '\u00a0원'; // 보통 공백 대신 줄바꿈 없는 공백: 물가 환산(histpack inflate)이 두 번 걸리지 않게
};

export const assetsOf = (s: GameState, ownerId: string) => s.assets.filter((a) => a.ownerId === ownerId);

export function personWorth(s: GameState, p: Person): number {
  const h = p.home ? p.home.deposit - (p.home.loan ?? 0) : 0; // 전세·월세 보증금은 내 돈
  return p.cash + h + assetsOf(s, p.id).reduce((t, a) => t + netOf(a), 0);
}

/**
 * 공동 금고는 없다: 누구 명의도 아닌 돈·재산(옛 저장의 가문 금고, 미션 상금, 상속인 없는 재산 등)은
 * 지금 살림을 맡은 사람 명의로 옮긴다. 가문 자산 = 가족 각자의 재산 합계.
 */
export function foldFamilyPot(s: GameState) {
  if (!s.familyCash && !s.assets.some((a) => a.ownerId === 'family')) return;
  const to = householder(s);
  to.cash += s.familyCash;
  s.familyCash = 0;
  for (const a of s.assets) if (a.ownerId === 'family') a.ownerId = to.id;
}

export function familyWorth(s: GameState): number {
  return s.familyCash + assetsOf(s, 'family').reduce((t, a) => t + a.value, 0);
}

/** 가문 총자산 = 가문 재산 + 직계(가주·배우자·자손) 개인 재산 */
export function totalWorth(s: GameState, members: Person[]): number {
  return familyWorth(s) + members.reduce((t, p) => t + personWorth(s, p), 0);
}

/** 세법상 평가액: 부동산 70%, 예술품 50%, 금융자산 100% */
export function assessedValue(a: Asset): number {
  return Math.round(a.value * ASSESS_RATIO[a.kind]);
}

export function addAsset(s: GameState, kind: AssetKind, ownerId: string, value: number, name = ASSET_NAMES[kind]): Asset {
  const a: Asset = { id: 'a' + s.idSeq++, kind, name, ownerId, value: Math.round(value), cost: Math.round(value), bought: s.year };
  s.assets.push(a);
  return a;
}

/** 주식·코인은 한 사람당 한 계좌로 합산 */
export function addHolding(s: GameState, kind: 'stock' | 'coin', ownerId: string, amount: number): Asset {
  const cur = s.assets.find((a) => a.kind === kind && a.ownerId === ownerId);
  if (cur) {
    cur.value += Math.round(amount);
    return cur;
  }
  return addAsset(s, kind, ownerId, amount, kind === 'stock' ? '주식 계좌' : '코인 지갑');
}

/** 세무사 연 수임료: 가주 재산의 0.1%, 최소 600만 */
export function advisorFee(s: GameState): number {
  return Math.max(600, Math.round(personWorth(s, head(s)) * 0.001));
}

/** 지금 직급에 머문 햇수 (호봉·연차). mutate=false면 읽기만 */
export function levelYears(s: GameState, p: Person, mutate = true): number {
  const f = p.flags.find((x) => x.startsWith('lv:'));
  const [, lv, y] = f?.split(':') ?? [];
  if (!f || Number(lv) !== p.jobLevel) {
    if (mutate) {
      p.flags = p.flags.filter((x) => !x.startsWith('lv:'));
      p.flags.push(`lv:${p.jobLevel}:${s.year}`);
    }
    return 0;
  }
  return Math.max(0, s.year - Number(y));
}

/**
 * 연봉표(pay.ts) 기반 연봉: 직급 기본 × 호봉(연차) × 능력 × 임금 상승 × (성과급·개원 수입 출렁임)
 * expected=true면 운 없이 평균값.
 */
export function payOf(s: GameState, p: Person, expected = false): number | undefined {
  const d = PAY[p.job];
  if (!d) return;
  const j = JOBS[p.job];
  const lv = Math.min(p.jobLevel, d.pay.length - 1);
  let v = d.pay[lv] * Math.pow(1 + d.raise, Math.min(12, levelYears(s, p, !expected)));
  v *= 0.93 + statScore(p, j.stats ?? { int: 1 }) / 700;
  v *= wageIndex(s.year);
  if (!expected) {
    if (d.bonus) v *= clamp(normal(s, 1, d.bonus), 0.6, 1.6);
    // 개원·개업: 잘되는 해와 안되는 해 (평균은 같다)
    if (d.open !== undefined && p.jobLevel >= d.open) v *= clamp(normal(s, 1, 0.25), 0.4, 1.6);
  }
  return Math.round(v);
}

/** 연금: 퇴직할 때 정해진 금액 (없으면 기초연금 수준) */
/** 받는 연금 (2025년 원으로 저장, 해마다 물가만큼 오른다) */
export function pensionOf(p: Person, year = BASE_YEAR): number {
  return Math.round(Number(p.flags.find((f) => f.startsWith('pens:'))?.slice(5) ?? BASIC_PENSION) * wageIndex(year));
}

/** 퇴직금: 마지막 월급 × 근속 연수 (월급 직업만) */
export function severance(s: GameState, p: Person): number {
  const j = JOBS[p.job];
  if (!j || j.kind !== 'salary' || p.jobYears <= 0) return 0;
  const monthly = (payOf(s, p, true) ?? 0) / 12;
  const v = Math.round(monthly * Math.min(p.jobYears, 40));
  p.cash += v;
  return v;
}

/** 퇴직 시 연금액 확정: 마지막 연봉 × 연금 비율 */
/**
 * 연금 확정 (2025년 원 기준으로 저장):
 * 공무원·군인·교원 연금 = 마지막 연봉 × 1.7% × 재직 연수(최대 36년)
 * 국민연금 = (A값 + 본인 평균소득) / 2 × 40% × 가입 연수/40 (+ 기초연금은 소득 적은 사람만)
 */
export function settlePension(p: Person, s?: GameState) {
  const years = Math.max(0, markOf(p, 'npy'));
  const avg = years ? markOf(p, 'npsum') / years : 0;
  let amount: number;
  if (PUBLIC_PENSION.has(p.job) && PAY[p.job]) {
    const last = PAY[p.job].pay[Math.min(p.jobLevel, PAY[p.job].pay.length - 1)] * Math.pow(1 + PAY[p.job].raise, 10);
    amount = last * 0.017 * Math.min(36, Math.max(p.jobYears, years));
  } else {
    amount = ((NPS_A + Math.min(avg, 7400)) / 2) * 0.4 * (Math.min(40, years) / 40);
  }
  // 기초연금(2014~, 그 전 2008 기초노령연금): 근현대사 모드에서 그 전에 은퇴하면 없다
  const hist = s?.era === 'history' && s.year < 2008;
  if (amount < 1200 && !hist) amount += BASIC_PENSION;
  // 국민연금이 없던 시절(1988 전) 은퇴한 자영업·회사원은 연금이 0 (자식이 부양)
  if (hist && !PUBLIC_PENSION.has(p.job) && years === 0) amount = 0;
  p.flags = p.flags.filter((f) => !f.startsWith('pens:'));
  p.flags.push('pens:' + Math.round(amount));
}

/** 능력치 가중합 (0~100) */
export function statScore(p: Person, w: Partial<Record<keyof Person['actual'], number>>): number {
  let v = 0;
  for (const k of Object.keys(w) as (keyof Person['actual'])[]) v += p.actual[k] * w[k]!;
  return v;
}

export const jobTitle = (p: Person) => {
  // 시장은 어느 도시 시장인지: "부산시장"·"서울시장(재선)"
  if (p.job === 'mayor') {
    const city = p.flags.find((f) => f.startsWith('mayor_of:'))?.slice(9) ?? '';
    return `${city}시장${p.jobLevel ? ` (${p.jobLevel + 1}선)` : ''}`;
  }
  return JOBS[p.job].titles?.[p.jobLevel] ?? JOBS[p.job].name;
};
/** "공무원(9급)"처럼 직업명 + 직함 */
export const jobLabel = (p: Person) => (p.job === 'mayor' ? jobTitle(p) : JOBS[p.job].titles ? `${JOBS[p.job].name}(${jobTitle(p)})` : JOBS[p.job].name);

/** 직업 연간 수입 계산 + 커리어 진행. 로그용 메시지를 돌려줌. */
export function workYear(s: GameState, p: Person): { income: number; msg?: string } {
  const j = JOBS[p.job];
  const a = p.actual;
  const isHead = p.id === s.headId;
  const workBoost = isHead ? { work: 1.5, balance: 1, family: 0.6, self: 0.9, rest: 0.3 }[s.policy.lifestyle] : 1;
  p.jobYears++;
  const name = fullName(p);

  switch (j.kind) {
    case 'fixed': {
      if (p.job === 'parttime') return { income: Math.round(j.base * wageIndex(s.year) * clamp(normal(s, 1, 0.15), 0.6, 1.4)) };
      if (p.job === 'pension') {
        const from = Number(p.flags.find((f) => f.startsWith('pens_from:'))?.slice(10) ?? 0);
        return { income: from > s.year ? 0 : pensionOf(p, s.year) };
      }
      return { income: Math.round((j.base + j.perLevel * p.jobLevel) * wageIndex(s.year)) };
    }

    case 'salary': {
      const sc = statScore(p, j.stats ?? { int: 1 });
      const d = PAY[p.job];
      let msg: string | undefined;
      if (j.risk && chance(s, j.risk)) {
        p.actual.hp = clamp(p.actual.hp - 6, 0, 100);
        msg = `🤕 ${name} 업무 중 부상 (건강 -6)`;
      }
      // 수련 과정: 연차가 차면 자동으로 (의사: 인턴 1년 → 레지던트 4년 → 전문의)
      if (d?.ladder)
        for (const [yrs, lv] of d.ladder)
          if (p.jobYears > yrs && p.jobLevel < lv) {
            p.jobLevel = lv;
            msg = `🩺 ${name} ${jobTitle(p)}${lv === 1 ? ' 수련 시작' : ' 자격 취득!'}`;
          }
      const ladderTop = d?.ladder ? Math.max(...d.ladder.map((x) => x[1])) : 0;
      // 개원·개업: 선택(이야기)으로만 한다
      if (d?.open !== undefined && hasFlag(p, 'open_clinic')) {
        p.flags = p.flags.filter((f) => f !== 'open_clinic');
        if (p.jobLevel < d.open) {
          p.jobLevel = d.open;
          msg = `🏥 ${name} ${jobTitle(p)}의 길로 — 내 가게를 열었다`;
        }
      }
      const diligent = (hasTrait(p, 'diligent') ? 1.3 : hasTrait(p, 'lazy') ? 0.6 : 1) * promoteMult(p) * (p.talents.some((t) => TALENTS[t.id].cats?.includes(j.cat)) ? 1.25 : 1);
      const intoOpen = d?.open !== undefined && p.jobLevel + 1 === d.open;
      // 승진은 지금 직급에서 2년 이상 일한 뒤부터. 맨 꼭대기(병원장→의료재단 이사장, 사장→회장 등)는
      // 50세 넘어 그 아래 자리에서 5년 이상 버텨야 하고, 그마저도 자리 하나를 두고 다투니 확률이 절반
      const toTop = p.jobLevel + 1 === j.maxLevel && j.maxLevel >= 4;
      const topOk = !toTop || (age(s, p) >= 50 && levelYears(s, p, false) >= 5);
      if (p.jobLevel < j.maxLevel && p.jobLevel >= ladderTop && !intoOpen && topOk && levelYears(s, p, false) >= minYears(p.jobLevel, j.maxLevel) && chance(s, (j.promote ?? 0.1) * workBoost * diligent * (0.5 + sc / 100) * (toTop ? 0.45 : 1))) {
        p.jobLevel++;
        msg = rankLine(p, name, jobTitle(p));
        p.happiness = clamp(p.happiness + 6, 0, 100);
        if (p.job === 'professor') s.fame += 2;
      }
      // 개원한 곳도 망할 수 있다
      if (d?.open !== undefined && p.jobLevel >= d.open && chance(s, 0.02)) {
        p.jobLevel = d.open - 1;
        p.happiness = clamp(p.happiness - 15, 0, 100);
        msg = `📉 ${name}, 경영난으로 문을 닫고 다시 월급을 받는다`;
      }
      const income = payOf(s, p) ?? Math.round((j.base + j.perLevel * p.jobLevel) * (0.75 + sc / 200) * wageIndex(s.year));
      return { income, msg };
    }

    case 'business': {
      const merchant = hasTalent(p, 'merchant');
      if (j.biz) {
        // 장사: 대부분 겨우 먹고살고, 상당수가 몇 년 안에 문을 닫는다
        const b = j.biz;
        const skill = (a.cha + a.mor + a.int) / 3 + (merchant ? 18 : 0) + p.jobLevel * 5 + Math.min(10, p.jobYears) - 50;
        const roll = normal(s, skill, b.sd);
        const income = Math.round((b.base + roll * 120 + p.jobLevel * b.step) * wageIndex(s.year));
        let msg: string | undefined;
        if (roll > 30 && p.jobLevel < j.maxLevel) {
          p.jobLevel++;
          msg = rankLine(p, name, jobTitle(p));
        } else if (roll < b.fail) {
          msg = `${name}의 ${j.name.replace(' 사장', '').replace(' 대표', '')} ${j.cat === 'farm' ? '— 흉년·사고로 접었다' : '폐업'}`;
          p.job = 'none';
          p.jobLevel = 0;
          p.happiness = clamp(p.happiness - 20, 0, 100);
        }
        return { income, msg };
      }
      // 창업: 규모가 커질수록 버는 돈이 뛴다. 초기엔 적자도 흔하지만, 살아남으면 월급쟁이를 훌쩍 넘는다
      // (중소벤처기업부 창업기업 실태조사: 창업 초기 대표 소득은 낮고, 매출 100억 이상 기업 대표는 억대)
      const skill = (a.int + a.cha) / 2 + (merchant ? 22 : 0) + p.jobLevel * 4 + Math.min(8, p.jobYears) - 48;
      const roll = normal(s, skill, 22);
      const LV = [2200, 6000, 14000, 32000, 90000, 250000];
      const mult = clamp(normal(s, 0.95 + skill / 90, 0.4), p.jobLevel ? 0.25 : -0.4, 2.6);
      const income = Math.round(LV[p.jobLevel] * mult * wageIndex(s.year));
      let msg: string | undefined;
      if (roll > 26 && p.jobLevel < j.maxLevel) {
        p.jobLevel++;
        s.fame += p.jobLevel * 0.5;
        msg = `🚀 ${name}의 회사가 ${jobTitle(p)}(으)로 성장했다!`;
      } else if (roll < -30) {
        if (p.jobLevel === 0) {
          p.job = 'none';
          p.jobLevel = 0;
          p.happiness = clamp(p.happiness - 20, 0, 100);
          msg = `${name}의 사업이 부도났다`;
        } else {
          p.jobLevel--;
          msg = `${name}의 사업이 위축됐다`;
        }
      }
      return { income, msg };
    }

    case 'creator': {
      const c = CREATORS[p.job]!;
      const invest = Number(p.flags.find((f) => f.startsWith('invest:'))?.slice(7) ?? 0);
      const tal = hasTalent(p, c.talent) ? 0.07 : 0;
      const up = (c.base + a[c.stat] / c.div + tal + invest * 0.012 + Math.min(0.04, p.jobYears * 0.004)) * Math.pow(0.8, p.jobLevel);
      let msg: string | undefined;
      if (p.jobLevel < j.maxLevel && chance(s, up)) {
        p.jobLevel++;
        s.fame += p.jobLevel;
        msg = `🌟 ${name} ${jobTitle(p)} 달성!`;
        if (tal && discoverTalent(p, c.talent)) msg += ` [${TALENTS[c.talent].name}] 재능이 드러났다`;
      } else if (p.jobLevel > 0 && chance(s, 0.09)) {
        p.jobLevel--;
        msg = `${name} 인기가 식었다 (${jobTitle(p)})`;
      }
      if (p.job === 'painter' && chance(s, 0.02 + (hasTalent(p, 'artist') ? 0.06 : 0) + p.jobLevel * 0.015)) {
        // 걸작: 작품이 예술품 자산으로 남는다
        const value = Math.round(20000 * (p.jobLevel + 1) * Math.max(0.3, normal(s, 1, 0.4)));
        addAsset(s, 'art', p.id, value, `${name}의 걸작`);
        addFlag(p, 'masterpiece');
        s.fame += 4;
        msg = `🖼 ${name}이(가) 걸작을 완성했다! (평가 ${formatMoney(value)})`;
      }
      return { income: Math.round(c.incomes[p.jobLevel] * Math.max(0.1, normal(s, 1, 0.4)) * wageIndex(s.year)), msg };
    }

    case 'athlete': {
      const ag = age(s, p);
      let msg: string | undefined;
      if (ag < 30 && p.jobLevel < j.maxLevel && check(s, a.str + (hasTalent(p, 'athlete') ? 20 : 0), 55 + p.jobLevel * 8, 8)) {
        p.jobLevel++;
        msg = `${name} 주전 도약! (레벨 ${p.jobLevel})`;
      }
      return { income: Math.round((j.base + j.perLevel * p.jobLevel) * (0.5 + a.str / 100) * wageIndex(s.year)), msg };
    }
  }
}

const LIVING_MULT = { frugal: 0.7, normal: 1, lux: 1.8 } as const;

/** 한 해 가계 정산. 로그 메시지 목록 반환. */
/** 한 집에 사는 사람들의 1년 살림 비용 항목. 실제 정산과 '내년 예상'이 같은 계산을 쓴다. */
export function householdItems(s: GameState, incomes: Map<string, number>) {
  const h = head(s);
  const hh = householder(s);
  const mult = LIVING_MULT[s.policy.living];
  const hsp = hh.spouseId && alive(s.people[hh.spouseId]) ? s.people[hh.spouseId] : undefined;
  const minors =
    hh === h
      ? livingMainlineMinors(s)
      : hh.childIds.map((id) => s.people[id]).filter((c) => alive(c) && age(s, c) < 20);
  // 독립하지 않은 성인 자녀는 부모 집에 얹혀 산다 (본인 생활비 대신 부모 살림에서)
  const atHome = hh.childIds
    .map((id) => s.people[id])
    .filter((c) => c && alive(c) && age(s, c) >= 20 && !c.spouseId && !c.flags.includes('indep') && !c.flags.some((f) => f.startsWith('serving:')));
  const inHouse = new Set([hh.id, ...(hsp ? [hsp.id] : []), ...minors.map((m) => m.id), ...atHome.map((m) => m.id), h.id]);
  const items: [string, number][] = [];
  const add = (label: string, v: number) => v > 0 && items.push([label, Math.round(v)]);
  const houseIncome = Math.max(0, incomes.get(hh.id) ?? 0) + Math.max(0, (hsp && incomes.get(hsp.id)) || 0);
  // 기본 생활비 (식비·통신·교통·관리비·보험 …). 2023 가계금융복지조사: 가구 소비지출 월 280만 안팎, 1인 가구 월 160만 안팎.
  // 아무리 아껴도 줄일 수 없는 바닥(1인 연 1,150만)이 있고, 검소·호화는 그 위의 몫만 줄이거나 늘린다
  const wi = wageIndex(s.year); // 임금이 오르는 만큼 생활비도 오른다
  const floor = 950 * wi;
  const perAdult = clamp(750 * wi + houseIncome * 0.1, floor, 2000 * wi);
  const adj = (v: number, fl: number) => fl + Math.max(0, v - fl) * mult;
  add('기본 생활비', adj(perAdult, floor) * (hsp ? 2 : 1));
  add(`아이 양육비 (${minors.length}명)`, minors.length * adj(perAdult * 0.45, floor * 0.4));
  add(`얹혀 사는 성인 자녀 (${atHome.length}명)`, atHome.length * adj(perAdult * 0.8, floor * 0.7));
  // 여윳돈이 생기면 씀씀이도 커진다 (연 3,500만 넘는 부분의 32%: 외식·여행·경조사·쇼핑)
  add('소비 (수입에 비례)', Math.max(0, houseIncome - 3500 * wi) * 0.32 * mult * (hasTrait(hh, 'frugal') ? 0.8 : hasTrait(hh, 'spender') ? 1.3 : 1));
  // 의료비: 건강할수록 적고 노인·병약할수록 많다. 기초수급이면 의료급여로 거의 안 든다
  let med = 0;
  for (const id of inHouse) {
    const q = s.people[id];
    if (q && alive(q)) med += medicalCost(s, q);
  }
  if (hasFlag(hh, 'welfare')) med *= 0.15;
  add('의료비 (건강 상태별)', med * wi);
  for (const [l, v] of woeItems(s, inHouse, wi)) add(l, v);
  // 미취학 아동 교육비 (학령기는 해마다 학년 이벤트에서 직접 고른다)
  let pre = 0;
  for (const c of livingMainlineMinors(s)) if (age(s, c) < 8) pre += EDU_COST[s.policy.children[c.id]?.budget ?? 1] * wi;
  add('미취학 교육비', pre);
  let tuition = 0;
  for (const p of Object.values(s.people)) {
    const tu = p.flags.find((f) => f.startsWith('tuition:'));
    if (tu && alive(p) && p.flags.includes('student') && isMainline(s, p)) tuition += Number(tu.slice(8));
  }
  add('대학 등록금', tuition);
  // 주거비: 월세, 전세자금대출 이자
  add('반려견 양육비', petUpkeep(s, inHouse));
  const car = vehicleUpkeep(s, inHouse);
  add(`차량 유지비 (${car.n}대)`, car.cost);
  const home = hh.home ?? hsp?.home;
  if (home?.type === 'wolse') add(`월세 (${home.name})`, home.rent);
  if (home?.loan) add('전세대출 이자', home.loan * JEONSE_LOAN_RATE);
  return { hh, hsp, inHouse, items };
}

/** 운에 기대지 않은 평균 연 수입 (내년 예상용) */
/** 시대 사건(전쟁 등)이 직업 수입에 거는 배수 — war.ts가 등록한다 (순환 참조를 피하려고 주입) */
let INCOME_MUL: (s: GameState, p: Person) => number = () => 1;
export const setIncomeMul = (f: (s: GameState, p: Person) => number) => (INCOME_MUL = f);

export function expectedIncome(s: GameState, p: Person): number {
  const v = baseIncome(s, p);
  return v > 0 && !p.flags.some((f) => f.startsWith('serving:')) ? Math.round(v * INCOME_MUL(s, p)) : v;
}

function baseIncome(s: GameState, p: Person): number {
  if (!alive(p)) return 0;
  if (p.flags.some((f) => f.startsWith('serving:'))) return Number(p.flags.find((f) => f.startsWith('serve_pay:'))?.slice(10) ?? 1200);
  if (p.flags.includes('student')) return p.flags.includes('track:grad_school') ? Math.round(GRAD_STIPEND * wageIndex(s.year)) : 0;
  if (age(s, p) < 20 && p.job === 'none') return 0;
  const j = JOBS[p.job];
  const a = p.actual;
  switch (j.kind) {
    case 'fixed':
      if (p.job === 'pension') return pensionOf(p, s.year);
      return Math.round((j.base + j.perLevel * p.jobLevel) * wageIndex(s.year));
    case 'salary':
      return payOf(s, p, true) ?? Math.round((j.base + j.perLevel * p.jobLevel) * (0.75 + statScore(p, j.stats ?? { int: 1 }) / 200) * wageIndex(s.year));
    case 'business': {
      const merchant = hasTalent(p, 'merchant');
      if (j.biz) {
        const skill = (a.cha + a.mor + a.int) / 3 + (merchant ? 18 : 0) + p.jobLevel * 5 + Math.min(10, p.jobYears + 1) - 50;
        return Math.round((j.biz.base + skill * 120 + p.jobLevel * j.biz.step) * wageIndex(s.year));
      }
      const skill = (a.int + a.cha) / 2 + (merchant ? 22 : 0) + p.jobLevel * 4 + Math.min(8, p.jobYears + 1) - 48;
      const LV = [2200, 6000, 14000, 32000, 90000, 250000];
      return Math.round(LV[p.jobLevel] * clamp(0.95 + skill / 90, p.jobLevel ? 0.25 : -0.4, 2.6) * wageIndex(s.year));
    }
    case 'creator':
      return Math.round(CREATORS[p.job]!.incomes[p.jobLevel] * wageIndex(s.year));
    case 'athlete':
      return Math.round((j.base + j.perLevel * p.jobLevel) * (0.5 + a.str / 100) * wageIndex(s.year));
  }
}

export interface Forecast {
  income: [string, number][];
  expense: [string, number][];
  net: number;
  /** 독립 전 가주의 내 통장: 수입 − 세금 − 제 몫 지출 − 집에 보태는 돈 */
  mine?: { income: number; allow: number; tax: number; own: number; contrib: number; net: number };
}

/** 얹혀 사는 성인 자녀의 한 해: 제 몫 지출과 집에 보태는 돈 */
export function atHomeSpend(s: GameState, inc: number) {
  const wi = wageIndex(s.year);
  return { own: Math.round(1000 * wi + Math.max(0, inc - 2500 * wi) * 0.3), contrib: Math.round(Math.min(1200 * wi, inc * 0.1)) };
}

/** 2025 기준 중위소득 (월, 만원) · 생계급여 선정기준은 그 32% */
const MEDIAN = [0, 239.2, 393.3, 502.5, 609.8, 710.8, 806.4];
export function livelihoodAid(s: GameState, incomes: Map<string, number>, inHouse: Set<string>): number {
  const hh = householder(s);
  const ids = [...inHouse].filter((id) => s.people[id] && alive(s.people[id]));
  const n = Math.max(1, ids.length);
  const wi = wageIndex(s.year);
  const line = (MEDIAN[Math.min(6, n)] + Math.max(0, n - 6) * 96) * 12 * 0.32 * wi;
  const inc = ids.reduce((t, id) => t + Math.max(0, incomes.get(id) ?? 0), 0);
  // 재산 기준 (단순화): 기본재산 공제 + 주거용 재산 공제를 합쳐 부부 순자산 2억 2천까지
  const sp = hh.spouseId ? s.people[hh.spouseId] : undefined;
  const worth = personWorth(s, hh) + (sp && alive(sp) ? personWorth(s, sp) : 0);
  if (worth > 22000 * wi) return 0;
  const median = (MEDIAN[Math.min(6, n)] + Math.max(0, n - 6) * 96) * 12 * wi;
  // 근현대사 모드: 2000년 전엔 생활보호법 (일할 사람이 없는 집에 쌀·밀가루 정도), 근로장려금은 2009년부터
  if (s.era === 'history' && s.year < SINCE.livelihood) return inc <= 0 ? Math.round(line * 0.3) : 0;
  // 생계급여 (32%까지 채움)
  let aid = Math.max(0, line - inc);
  // 주거급여 (중위 48% 이하 세입자: 월세를 기준임대료 한도 안에서) · 교육급여 (초중고 학생 1인 연 50만 남짓)
  if (inc < median * 0.48) {
    const home = hh.home;
    if (home && (home.type === 'wolse' || home.type === 'jeonse')) aid += Math.min(home.type === 'wolse' ? home.rent : 200 * wi, 420 * wi);
    aid += ids.filter((id) => {
      const a = age(s, s.people[id]);
      return a >= 8 && a < 19;
    }).length * 50 * wi;
  }
  // 근로장려금 (일해서 버는 저소득 가구): 홑벌이 최대 285만, 맞벌이 330만, 소득 3,800~4,400만에서 끊긴다
  const earners = ids.filter((id) => (incomes.get(id) ?? 0) > 0).length;
  if (earners && !(s.era === 'history' && s.year < SINCE.eitc)) {
    const [mx, top] = earners >= 2 ? [330, 4400] : [285, 3800];
    const t = inc / wi;
    aid += (t < 2200 ? mx : t < top ? (mx * (top - t)) / (top - 2200) : 0) * wi;
  }
  return Math.max(0, Math.round(aid));
}

/** 내년 가계 예상: 지갑(살림 맡은 사람 + 배우자 + 가문 금고) 기준 */
export function forecast(s: GameState): Forecast {
  const h = head(s);
  const incomes = new Map<string, number>();
  for (const p of Object.values(s.people)) if (alive(p)) incomes.set(p.id, expectedIncome(s, p));
  const { hh, hsp, items } = householdItems(s, incomes);
  const wallet = [hh, ...(hsp ? [hsp] : [])];
  const income: [string, number][] = [];
  const expense: [string, number][] = [...items];
  const add = (list: [string, number][], label: string, v: number) => Math.round(v) > 0 && list.push([label, Math.round(v)]);
  for (const p of wallet) add(income, `${fullName(p)} ${JOBS[p.job].name}`, incomes.get(p.id) ?? 0);
  for (const p of wallet) if ((incomes.get(p.id) ?? 0) < 0) add(expense, `${fullName(p)} 사업 적자`, -(incomes.get(p.id) ?? 0));
  const taxSum = wallet.reduce((t, p) => {
    const inc = incomes.get(p.id) ?? 0;
    if (p.job === 'pension' || inc <= 0) return t;
    const x = incomeTax(inc, s.year);
    return t + x.tax + x.social;
  }, 0);
  add(expense, '소득세·4대보험', taxSum);
  add(income, '부모급여·아동수당', allowanceForecast(s, wallet));
  const { inHouse } = householdItems(s, incomes);
  add(income, '복지 급여 (기초생활보장·근로장려금)', livelihoodAid(s, incomes, inHouse));
  for (const id of inHouse) {
    const p = s.people[id];
    if (!p || p.id === hh.id || p.id === hh.spouseId || age(s, p) < 20 || (incomes.get(id) ?? 0) <= 0) continue;
    add(income, `${p.name}이(가) 보태는 생활비`, atHomeSpend(s, incomes.get(id)!).contrib);
  }
  for (const p of wallet) if (p.flags.some((x) => x.startsWith('youth_acc:'))) add(expense, '청년도약계좌 납입', 840);
  for (const p of wallet) {
    const f = p.flags.find((x) => x.startsWith('rm:'));
    if (f) add(income, '주택연금', Number(f.split(':')[2]));
  }
  const h0 = head(s);
  for (const par of parentsOf(s, h0)) {
    if (!alive(par) || hh.id !== h0.id) continue;
    const care = par.flags.find((f) => f.startsWith('care:'))?.slice(5);
    if (care === 'nursing') add(expense, `${fullName(par)} 요양원`, 1500 * wageIndex(s.year));
    if (care === 'home') add(expense, `${fullName(par)} 방문 요양`, 400 * wageIndex(s.year));
  }
  const re = realtyForecast(s, wallet);
  income.push(...re.income);
  expense.push(...re.expense);
  const cash = wallet.reduce((t, p) => t + p.cash, 0) + s.familyCash;
  if (cash >= 0) add(income, '예금 이자', cash * 0.02);
  else add(expense, '대출 이자', -cash * 0.07);
  if (s.policy.taxAdvisor) add(expense, '세무사 수임료', advisorFee(s));
  const net = income.reduce((t, [, v]) => t + v, 0) - expense.reduce((t, [, v]) => t + v, 0);
  const hInc = hh.id !== h.id ? incomes.get(h.id) ?? 0 : 0;
  const allow = hh.id !== h.id ? allowanceOf(s, h).amount : 0;
  if (allow) add(expense, `${h.name} 용돈`, allow);
  let mine: Forecast['mine'];
  if ((hInc > 0 && inHouse.has(h.id)) || allow) {
    const k = hInc > 0 ? atHomeSpend(s, hInc) : { own: 0, contrib: 0 };
    const t = hInc > 0 ? incomeTax(hInc, s.year) : { tax: 0, social: 0 };
    mine = { income: hInc, allow, tax: t.tax + t.social, own: k.own, contrib: k.contrib, net: hInc + allow - t.tax - t.social - k.own - k.contrib };
  }
  return { income, expense, net, mine };
}

export function economyYear(s: GameState): string[] {
  const msgs: string[] = [];
  const h = head(s);
  const hh = householder(s);

  // 1) 수입. 복무 중이면 병사 월급만
  const incomes = new Map<string, number>();
  const taxes = new Map<string, number>();
  for (const p of Object.values(s.people)) {
    if (!alive(p)) continue;
    if (p.flags.some((f) => f.startsWith('serving:'))) {
      // 병사 월급, 공중보건의·군의관은 그보다 많다
      p.cash += Number(p.flags.find((f) => f.startsWith('serve_pay:'))?.slice(10) ?? 1200);
      continue;
    }
    if (age(s, p) < 20 && p.job === 'none') continue;
    if (p.flags.includes('student')) {
      // 대학원생은 조교·연구과제 인건비를 받는다
      if (p.flags.includes('track:grad_school')) {
        const st = Math.round(GRAD_STIPEND * wageIndex(s.year));
        p.cash += st;
        incomes.set(p.id, st);
      }
      continue;
    }
    const { income, msg } = workYear(s, p);
    // 육아휴직 중이면 육아휴직급여 (월 최대 250만 → 연 약 2,000만), 승진은 멈춘다
    const onLeave = p.flags.includes('leave:' + s.year);
    const got = onLeave ? Math.min(income, Math.round(2000 * wageIndex(s.year))) : income;
    // 세금·4대보험을 떼고 통장에 들어온다 (연금은 과세 생략)
    const t = p.job === 'pension' ? { tax: 0, social: 0 } : incomeTax(got, s.year);
    p.cash += got - t.tax - t.social;
    incomes.set(p.id, got);
    taxes.set(p.id, t.tax + t.social);
    // 국민연금 가입 기록 (연금 수령액 계산용, 2025년 원)
    if (got > 0 && p.job !== 'pension' && !(s.era === 'history' && s.year < SINCE.nps)) {
      mark(p, 'npy', 1);
      mark(p, 'npsum', Math.round(Math.min(got / wageIndex(s.year), 7400)));
    }
    if (msg) msgs.push(msg);
  }

  // 2) 지출: 살림을 맡은 사람(가주, 가주가 어리거나 독립 전이면 부모)의 가계
  const { inHouse, items } = householdItems(s, incomes);
  const household = items.reduce((t, [, v]) => t + v, 0);
  pay(s, hh, Math.round(household));

  // 부모 집에 얹혀 사는 성인 자녀: 제 용돈·교통·통신·여가는 스스로 쓰고, 생활비도 조금 보탠다
  for (const id of inHouse) {
    const p = s.people[id];
    if (!p || !alive(p) || p.id === hh.id || p.id === hh.spouseId || age(s, p) < 20) continue;
    const inc = incomes.get(p.id) ?? 0;
    if (inc <= 0) continue;
    const k = atHomeSpend(s, inc);
    p.cash -= k.own + k.contrib;
    hh.cash += k.contrib;
  }

  // 용돈: 부모 집에 사는 가주가 받는다 (형편 따라)
  allowanceYear(s);

  // 기초생활보장: 가구 소득이 기준 중위소득 32%에 못 미치고 재산이 적으면 모자란 만큼 생계급여 (의료급여도 함께)
  const aid = livelihoodAid(s, incomes, inHouse);
  if (aid > 0) {
    hh.cash += aid;
    const poor = aid > 700 * wageIndex(s.year);
    if (poor) addFlag(hh, 'welfare');
    else hh.flags = hh.flags.filter((f) => f !== 'welfare');
    msgs.push(`🤝 ${poor ? '기초생활보장 (생계·주거·교육·의료급여)' : '근로장려금'} ${formatMoney(aid)}`);
  } else hh.flags = hh.flags.filter((f) => f !== 'welfare');

  // 그 외 성인은 각자 생활비: 최소 1,500만, 수입의 60%
  for (const p of Object.values(s.people)) {
    if (!alive(p) || inHouse.has(p.id) || age(s, p) < 20 || p.flags.some((f) => f.startsWith('serving:'))) continue;
    const base = Math.max(1500, (incomes.get(p.id) ?? 0) * 0.6);
    p.cash -= Math.round(base * (p.flags.includes('student') ? 0.6 : 1));
  }

  // 3) 이자: 예금 2%, 마이너스(생활비 대출)는 신용점수에 따라 5.5~19%
  for (const p of Object.values(s.people)) {
    if (!alive(p)) continue;
    p.cash = Math.round(p.cash * (p.cash >= 0 ? 1.02 : 1 + debtRate(p)));
  }
  s.familyCash = Math.round(s.familyCash * 1.02);

  // 3-1) 감당 못 할 빚: 담보 자산 강제 매각 → 그래도 안 되면 개인파산
  // (내가 꾸리는 살림은 강제로 팔지 않는다: 무엇을 팔지 위기 이벤트에서 직접 고른다. 단, 감당 불가 수준이면 예외)
  const mine = hh.id === h.id ? new Set([h.id, h.spouseId]) : new Set<string | undefined>();
  for (const p of Object.values(s.people)) {
    if (!alive(p) || p.cash >= 0) continue;
    const inc = Math.max(1500, incomes.get(p.id) ?? 0);
    if (mine.has(p.id) && -p.cash < inc * 10 + 50000) continue;
    const limit = () => assetsOf(s, p.id).reduce((t, a) => t + netOf(a), 0) * 0.7 + inc * 5;
    const owned = assetsOf(s, p.id).sort((a, b) => (a.kind === 'stock' || a.kind === 'coin' ? -1 : 0) - (b.kind === 'stock' || b.kind === 'coin' ? -1 : 0) || a.value - b.value);
    while (-p.cash > limit() && owned.length) {
      const a = owned.shift()!;
      if (isRealty(a)) sellRealty(s, a);
      else {
        p.cash += a.fake ? Math.round(a.value * 0.05) : a.value;
        s.assets = s.assets.filter((x) => x.id !== a.id);
      }
      msgs.push(`🏦 ${fullName(p)}의 ${a.name}이(가) 빚 때문에 경매로 넘어갔다`);
    }
    if (-p.cash > inc * 5 + 20000) {
      msgs.push(`💸 ${fullName(p)} 개인파산 (빚 ${formatMoney(-p.cash)} 탕감)`);
      p.cash = 0;
      addFlag(p, 'bankrupt');
      p.happiness = clamp(p.happiness - 30, 0, 100);
      if (p.id === h.id || p.id === h.spouseId) s.fame = Math.max(0, s.fame - 5);
    }
  }

  // 4) 부동산·주식: 월세(공실)·배당·재산세·종부세·대출이자·전세 만기 / 우리 집 월세·전세 재계약
  msgs.push(...realtyYear(s));
  msgs.push(...housingYear(s));
  msgs.push(...vehicleYear(s));
  // 부모급여·아동수당, 부모님 돌봄 비용
  childAllowanceYear(s);
  reverseMortgageYear(s);
  msgs.push(...youthAccountYear(s));
  msgs.push(...careYear(s));

  // 생활 수준이 아이들에게 남기는 것: 호화는 행복↑·씀씀이 흔적, 검소는 행복 조금↓·절약 흔적
  for (const c of livingMainlineMinors(s)) {
    if (s.policy.living === 'lux') {
      c.happiness = clamp(c.happiness + 2, 0, 100);
      if (chance(s, 0.3)) mark(c, 'spend', 1);
    } else if (s.policy.living === 'frugal') {
      c.happiness = clamp(c.happiness - 1, 0, 100);
      if (chance(s, 0.3)) mark(c, 'thrift', 1);
    }
  }

  // 5) 세무사 수임료
  if (s.policy.taxAdvisor) pay(s, hh, advisorFee(s));

  return msgs;
}

/** 가주 지출: 가주 현금 → 배우자 현금 → 가문 금고 순. 모자라면 가주 빚. */
export function pay(s: GameState, h: Person, amount: number) {
  let left = amount;
  const take = (have: number) => {
    const t = Math.max(0, Math.min(have, left));
    left -= t;
    return t;
  };
  h.cash -= take(h.cash);
  const sp = h.spouseId ? s.people[h.spouseId] : undefined;
  if (sp && alive(sp)) sp.cash -= take(sp.cash);
  s.familyCash -= take(s.familyCash);
  h.cash -= left;
}

const MARKET_KEYS: MarketKey[] = ['apt_seoul', 'apt_local', 'land', 'building', 'stock', 'coin', 'art'];
const MARKET_CLAMP: Record<MarketKey, [number, number]> = {
  apt_seoul: [-0.4, 0.6],
  apt_local: [-0.4, 0.6],
  land: [-0.4, 0.6],
  building: [-0.3, 0.4],
  stock: [-0.5, 0.8],
  coin: [-0.8, 2.5],
  art: [-0.3, 0.5],
};

/** 자산 시장 변동 + 가끔 큰 시장 이벤트 */
export function marketYear(s: GameState): string[] {
  const msgs: string[] = [];
  const r: Record<MarketKey, number> = {
    apt_seoul: normal(s, 0.035, 0.06),
    apt_local: normal(s, 0.015, 0.04),
    land: normal(s, 0.02, 0.03),
    building: normal(s, 0.03, 0.05),
    stock: normal(s, 0.06, 0.17),
    coin: normal(s, 0.1, 0.55),
    art: normal(s, 0.035, 0.07),
  };
  // 근현대사 모드: 2025년까지는 실제 연표를 따라간다 (연표 값으로 끌어당기고 잡음만 조금)
  const hist = s.era === 'history' && s.year <= 2025;
  if (hist)
    for (const k of MARKET_KEYS) {
      const target = histPrice(HIST_BASE[k], k, s.year);
      const sd = k === 'stock' ? 0.05 : k === 'coin' ? 0.12 : 0.015;
      r[k] = target / Math.max(1, s.market[k]) - 1 + normal(s, 0, sd);
    }
  if (!hist && chance(s, 0.18)) {
    const ev = pick(s, MARKET_EVENTS);
    msgs.push(ev.text);
    for (const k of Object.keys(ev.delta) as MarketKey[]) r[k] += ev.delta[k]!;
  }
  // 인구 구조: 2030년대부터 지방 인구 유출·고령화로 지방 집값이 조금씩 눌린다
  if (s.year >= 2030) r.apt_local -= 0.006;
  const era = ERA_NEWS[s.year];
  if (era) msgs.push(era);
  for (const k of MARKET_KEYS) {
    r[k] = hist ? clamp(r[k], -0.6, 1.5) : clamp(r[k], ...MARKET_CLAMP[k]);
    s.market[k] = Math.max(1, Math.round(s.market[k] * (1 + r[k])));
    s.marketChange[k] = r[k];
  }
  for (const a of s.assets) {
    if (a.kind === 'vehicle' || a.kind === 'treasure') continue; // 탈것은 vehicleYear에서 감가, 현물은 treasureYear에서
    // 예술품은 작품마다 따로 논다
    // 부동산은 매물마다 성격이 다르다 (시장 민감도·입지 프리미엄·변동성)
    // 부동산은 주식·코인보다 덜 출렁이지만 단지마다 조금씩 다르게 움직인다 (기본 ±2~3%)
    const realty = a.kind === 'apt_seoul' || a.kind === 'apt_local' || a.kind === 'land' || a.kind === 'building';
    const own = a.kind === 'art' ? normal(s, 0, 0.08) : normal(s, 0, a.vol ?? (realty ? 0.025 : 0));
    a.prev = a.value;
    a.value = Math.max(0, Math.round(a.value * (1 + r[a.kind] * (a.beta ?? 1) + (a.drift ?? 0) + own)));
  }
  return msgs;
}

/** 시대 흐름 (통계청 장래인구추계의 방향을 따른 가상 뉴스) */
const ERA_NEWS: Record<number, string> = {
  2028: '📰 합계출산율 0.7명대 지속. 초등학교 입학생 30만 명 선 붕괴',
  2031: '📰 학령인구 절벽: 지방대 입학 정원 미달 속출. 지방대·전문대 문턱이 낮아진다',
  2035: '📰 65세 이상 인구 30% 돌파. 초고령사회 가속',
  2040: '📰 지방 소멸 경고: 기초지자체 절반이 소멸 위험 지역',
  2045: '📰 생산연령인구 급감. 외국인 근로자·정년 연장 논의 본격화',
  2050: '📰 인구 4천만 명대 진입 전망. 빈집이 늘어난다',
};

const MARKET_EVENTS: { text: string; delta: Partial<Record<MarketKey, number>> }[] = [
  { text: '📈 강남 재건축 호재! 서울 아파트값 급등', delta: { apt_seoul: 0.22 } },
  { text: '📈 부동산 광풍. 전국 집값이 들썩인다', delta: { apt_seoul: 0.15, apt_local: 0.12, land: 0.08 } },
  { text: '📉 금리 인상 충격. 부동산·주식 동반 하락', delta: { apt_seoul: -0.15, apt_local: -0.1, stock: -0.12 } },
  { text: '📉 지방 인구 유출 가속. 지방 집값 하락', delta: { apt_local: -0.15 } },
  { text: '📈 신도시 개발 발표. 토지 보상 기대감', delta: { land: 0.3, apt_local: 0.08 } },
  { text: '📉 부동산 규제 대책 발표', delta: { apt_seoul: -0.08, apt_local: -0.04 } },
  { text: '📈 반도체 슈퍼사이클! 코스피 사상 최고치', delta: { stock: 0.3 } },
  { text: '📉 글로벌 금융위기. 모든 자산이 폭락한다', delta: { stock: -0.35, coin: -0.5, apt_seoul: -0.12, apt_local: -0.1, art: -0.15 } },
  { text: '📉 증시 폭락. 개미들의 곡소리', delta: { stock: -0.25 } },
  { text: '🚀 코인 광풍! 너도나도 코인 이야기뿐', delta: { coin: 1.2 } },
  { text: '🥶 코인 겨울. 거래소 파산 소식', delta: { coin: -0.6 } },
  { text: '📈 AI 버블. 기술주가 하늘을 뚫는다', delta: { stock: 0.25, coin: 0.3 } },
  { text: '🖼 미술품 투자 붐. 경매장이 북적인다', delta: { art: 0.25 } },
  { text: '📉 미술 시장 침체. 유찰이 속출한다', delta: { art: -0.2 } },
];
