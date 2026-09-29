import { chance, normal, pick } from './rng';
import { ASSESS_RATIO, ASSET_NAMES, CREATORS, EDU_COST, JOBS, TALENTS } from './data';
import { mark } from './people';
import { addFlag, age, alive, check, clamp, hasFlag, discoverTalent, fullName, hasTalent, hasTrait, head, householder, isMainline, livingMainlineMinors } from './people';
import type { Asset, AssetKind, GameState, MarketKey, Person } from './types';
import { promoteMult } from './marks';
import { GRAD_STIPEND, PAY, wageIndex } from './pay';
import { isRealty, netOf, realtyForecast, realtyYear, sellRealty } from './realty';
import { housingYear, JEONSE_LOAN_RATE } from './housing';
import { debtRate } from './debt';

export function formatMoney(man: number): string {
  const neg = man < 0;
  const v = Math.abs(Math.round(man));
  let out: string;
  if (v >= 10000) {
    const eok = v / 10000;
    out = (eok >= 100 ? Math.round(eok).toLocaleString('ko-KR') : eok.toFixed(1).replace(/\.0$/, '')) + '억';
  } else out = v.toLocaleString('ko-KR') + '만';
  return (neg ? '-' : '') + out;
}

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
function levelYears(s: GameState, p: Person, mutate = true): number {
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
    if (d.bonus) v *= clamp(normal(s, 1, d.bonus), 0.5, 2);
    if (d.open !== undefined && p.jobLevel >= d.open) v *= clamp(normal(s, 1, 0.3), 0.3, 2.2);
  }
  return Math.round(v);
}

/** 연금: 퇴직할 때 정해진 금액 (없으면 기초연금 수준) */
export function pensionOf(p: Person): number {
  return Number(p.flags.find((f) => f.startsWith('pens:'))?.slice(5) ?? JOBS.pension.base);
}

/** 퇴직 시 연금액 확정: 마지막 연봉 × 연금 비율 */
export function settlePension(p: Person) {
  const j = JOBS[p.job];
  const last = PAY[p.job] ? Math.round(PAY[p.job].pay[Math.min(p.jobLevel, PAY[p.job].pay.length - 1)] * 1.2) : j.kind === 'salary' ? j.base + j.perLevel * p.jobLevel : j.kind === 'fixed' ? j.base : 3000;
  const rate = j.pension ?? (j.kind === 'salary' ? 0.3 : 0.15);
  const amount = Math.max(JOBS.pension.base, Math.round(last * rate));
  p.flags = p.flags.filter((f) => !f.startsWith('pens:'));
  p.flags.push('pens:' + amount);
}

/** 능력치 가중합 (0~100) */
export function statScore(p: Person, w: Partial<Record<keyof Person['actual'], number>>): number {
  let v = 0;
  for (const k of Object.keys(w) as (keyof Person['actual'])[]) v += p.actual[k] * w[k]!;
  return v;
}

export const jobTitle = (p: Person) => JOBS[p.job].titles?.[p.jobLevel] ?? JOBS[p.job].name;
/** "공무원(9급)"처럼 직업명 + 직함 */
export const jobLabel = (p: Person) => (JOBS[p.job].titles ? `${JOBS[p.job].name}(${jobTitle(p)})` : JOBS[p.job].name);

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
      if (p.job === 'pension') return { income: pensionOf(p) };
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
      const diligent = (hasTrait(p, 'diligent') ? 1.3 : hasTrait(p, 'lazy') ? 0.6 : 1) * promoteMult(p);
      const intoOpen = d?.open !== undefined && p.jobLevel + 1 === d.open;
      // 승진은 지금 직급에서 2년 이상 일한 뒤부터
      if (p.jobLevel < j.maxLevel && p.jobLevel >= ladderTop && !intoOpen && levelYears(s, p, false) >= 2 && chance(s, (j.promote ?? 0.1) * workBoost * diligent * (0.5 + sc / 100))) {
        p.jobLevel++;
        msg = `${name} ${jobTitle(p)}(으)로 승진`;
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
          msg = `🏪 ${name}: ${jobTitle(p)}(으)로 성장!`;
        } else if (roll < b.fail) {
          msg = `${name}의 ${j.name.replace(' 사장', '').replace(' 대표', '')} ${j.cat === 'farm' ? '— 흉년·사고로 접었다' : '폐업'}`;
          p.job = 'none';
          p.jobLevel = 0;
          p.happiness = clamp(p.happiness - 20, 0, 100);
        }
        return { income, msg };
      }
      const skill = (a.int + a.cha) / 2 + (merchant ? 22 : 0) + p.jobLevel * 4 - 48;
      const roll = normal(s, skill, 22);
      const income = Math.round(roll * 400 * (1 + p.jobLevel * 0.6) * wageIndex(s.year));
      let msg: string | undefined;
      if (roll > 28 && p.jobLevel < j.maxLevel) {
        p.jobLevel++;
        msg = `${name}의 사업이 성장했다 (규모 ${p.jobLevel})`;
      } else if (roll < -28) {
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
      const up = (c.base + a[c.stat] / c.div + tal + invest * 0.012 + Math.min(0.02, p.jobYears * 0.002)) * Math.pow(0.8, p.jobLevel);
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
  // 기본 생활비는 형편 따라: 넉넉하면 1인 1,500만, 빠듯하면 900만까지 줄여 산다
  const wi = wageIndex(s.year); // 임금이 오르는 만큼 생활비도 오른다
  const perAdult = clamp(700 * wi + houseIncome * 0.12, 900 * wi, 1500 * wi);
  add('기본 생활비', perAdult * mult * (hsp ? 2 : 1));
  add(`아이 양육비 (${minors.length}명)`, minors.length * perAdult * 0.6 * mult);
  add(`얹혀 사는 성인 자녀 (${atHome.length}명)`, atHome.length * perAdult * 0.8 * mult);
  // 여윳돈이 생기면 씀씀이도 커진다 (연 4천만 넘는 부분의 35%)
  add('소비 (수입에 비례)', Math.max(0, houseIncome - 4000 * wi) * 0.35 * mult * (hasTrait(hh, 'frugal') ? 0.8 : hasTrait(hh, 'spender') ? 1.3 : 1));
  // 미취학 아동 교육비 (학령기는 해마다 학년 이벤트에서 직접 고른다)
  let pre = 0;
  for (const c of livingMainlineMinors(s)) if (age(s, c) < 8) pre += EDU_COST[s.policy.children[c.id]?.budget ?? 1];
  add('미취학 교육비', pre);
  let tuition = 0;
  for (const p of Object.values(s.people)) {
    const tu = p.flags.find((f) => f.startsWith('tuition:'));
    if (tu && alive(p) && p.flags.includes('student') && isMainline(s, p)) tuition += Number(tu.slice(8));
  }
  add('대학 등록금', tuition);
  // 주거비: 월세, 전세자금대출 이자
  const home = hh.home ?? hsp?.home;
  if (home?.type === 'wolse') add(`월세 (${home.name})`, home.rent);
  if (home?.loan) add('전세대출 이자', home.loan * JEONSE_LOAN_RATE);
  return { hh, hsp, inHouse, items };
}

/** 운에 기대지 않은 평균 연 수입 (내년 예상용) */
export function expectedIncome(s: GameState, p: Person): number {
  if (!alive(p)) return 0;
  if (p.flags.some((f) => f.startsWith('serving:'))) return Number(p.flags.find((f) => f.startsWith('serve_pay:'))?.slice(10) ?? 1200);
  if (p.flags.includes('student')) return p.flags.includes('track:grad_school') ? Math.round(GRAD_STIPEND * wageIndex(s.year)) : 0;
  if (age(s, p) < 20 && p.job === 'none') return 0;
  const j = JOBS[p.job];
  const a = p.actual;
  switch (j.kind) {
    case 'fixed':
      if (p.job === 'pension') return pensionOf(p);
      return Math.round((j.base + j.perLevel * p.jobLevel) * wageIndex(s.year));
    case 'salary':
      return payOf(s, p, true) ?? Math.round((j.base + j.perLevel * p.jobLevel) * (0.75 + statScore(p, j.stats ?? { int: 1 }) / 200) * wageIndex(s.year));
    case 'business': {
      const merchant = hasTalent(p, 'merchant');
      if (j.biz) {
        const skill = (a.cha + a.mor + a.int) / 3 + (merchant ? 18 : 0) + p.jobLevel * 5 + Math.min(10, p.jobYears + 1) - 50;
        return Math.round((j.biz.base + skill * 120 + p.jobLevel * j.biz.step) * wageIndex(s.year));
      }
      const skill = (a.int + a.cha) / 2 + (merchant ? 22 : 0) + p.jobLevel * 4 - 48;
      return Math.round(skill * 400 * (1 + p.jobLevel * 0.6) * wageIndex(s.year));
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
  /** 독립 전 가주가 따로 모으는 돈 (내 통장) */
  mine?: number;
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
  const re = realtyForecast(s, wallet);
  income.push(...re.income);
  expense.push(...re.expense);
  const cash = wallet.reduce((t, p) => t + p.cash, 0) + s.familyCash;
  if (cash >= 0) add(income, '예금 이자', cash * 0.02);
  else add(expense, '대출 이자', -cash * 0.07);
  if (s.policy.taxAdvisor) add(expense, '세무사 수임료', advisorFee(s));
  const net = income.reduce((t, [, v]) => t + v, 0) - expense.reduce((t, [, v]) => t + v, 0);
  return { income, expense, net, mine: hh.id !== h.id ? incomes.get(h.id) || undefined : undefined };
}

export function economyYear(s: GameState): string[] {
  const msgs: string[] = [];
  const h = head(s);
  const hh = householder(s);

  // 1) 수입. 복무 중이면 병사 월급만
  const incomes = new Map<string, number>();
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
    p.cash += income;
    incomes.set(p.id, income);
    if (msg) msgs.push(msg);
  }

  // 2) 지출: 살림을 맡은 사람(가주, 가주가 어리거나 독립 전이면 부모)의 가계
  const { inHouse, items } = householdItems(s, incomes);
  const household = items.reduce((t, [, v]) => t + v, 0);
  pay(s, hh, Math.round(household));

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
  if (chance(s, 0.18)) {
    const ev = pick(s, MARKET_EVENTS);
    msgs.push(ev.text);
    for (const k of Object.keys(ev.delta) as MarketKey[]) r[k] += ev.delta[k]!;
  }
  for (const k of MARKET_KEYS) {
    r[k] = clamp(r[k], ...MARKET_CLAMP[k]);
    s.market[k] = Math.max(1, Math.round(s.market[k] * (1 + r[k])));
    s.marketChange[k] = r[k];
  }
  for (const a of s.assets) {
    // 예술품은 작품마다 따로 논다
    // 부동산은 매물마다 성격이 다르다 (시장 민감도·입지 프리미엄·변동성)
    const own = a.kind === 'art' ? normal(s, 0, 0.08) : a.vol ? normal(s, 0, a.vol) : 0;
    a.value = Math.max(0, Math.round(a.value * (1 + r[a.kind] * (a.beta ?? 1) + (a.drift ?? 0) + own)));
  }
  return msgs;
}

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
