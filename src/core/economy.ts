import { chance, normal, pick, type RngHolder } from './rng';
import { ASSET_NAMES, EDU_COST, JOBS, REAL_ESTATE_ASSESS_RATIO } from './data';
import { age, alive, check, clamp, fullName, hasTalent, head, livingMainlineMinors } from './people';
import type { Asset, AssetKind, GameState, Person } from './types';

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
  return p.cash + assetsOf(s, p.id).reduce((t, a) => t + a.value, 0);
}

export function familyWorth(s: GameState): number {
  return s.familyCash + assetsOf(s, 'family').reduce((t, a) => t + a.value, 0);
}

/** 가문 총자산 = 가문 재산 + 직계(가주·배우자·자손) 개인 재산 */
export function totalWorth(s: GameState, members: Person[]): number {
  return familyWorth(s) + members.reduce((t, p) => t + personWorth(s, p), 0);
}

export function assessedValue(a: Asset): number {
  return Math.round(a.value * REAL_ESTATE_ASSESS_RATIO);
}

export function addAsset(s: GameState, kind: AssetKind, ownerId: string, value: number): Asset {
  const a: Asset = { id: 'a' + s.idSeq++, kind, name: ASSET_NAMES[kind], ownerId, value: Math.round(value) };
  s.assets.push(a);
  return a;
}

/** 직업 연간 수입 계산 + 커리어 진행. 로그용 메시지를 돌려줌. */
export function workYear(s: GameState, p: Person): { income: number; msg?: string } {
  const j = JOBS[p.job];
  const a = p.actual;
  const isHead = p.id === s.headId;
  const workBoost = isHead ? { work: 1.5, balance: 1, family: 0.6, self: 0.9, rest: 0.3 }[s.policy.lifestyle] : 1;
  p.jobYears++;
  const promote = (base: number) => {
    if (p.jobLevel < j.maxLevel && chance(s, base * workBoost * (0.6 + (a.int + a.mor) / 200))) {
      p.jobLevel++;
      return true;
    }
    return false;
  };
  switch (p.job) {
    case 'none':
    case 'pension':
      return { income: j.base };
    case 'office': {
      const up = promote(0.16);
      return { income: Math.round((j.base + j.perLevel * p.jobLevel) * (0.8 + (a.int + a.cha) / 250)), msg: up ? `${fullName(p)} 승진 (${p.jobLevel}직급)` : undefined };
    }
    case 'civil': {
      const up = promote(0.14);
      return { income: j.base + j.perLevel * p.jobLevel, msg: up ? `${fullName(p)} 공무원 승진 (${p.jobLevel}급 상승)` : undefined };
    }
    case 'doctor': {
      if (p.jobYears <= 4) return { income: j.base, msg: p.jobYears === 4 ? `${fullName(p)} 전문의 취득` : undefined };
      const up = promote(0.12);
      return { income: 9000 + j.perLevel * p.jobLevel, msg: up ? `${fullName(p)} 병원 규모 확장` : undefined };
    }
    case 'founder': {
      const skill = (a.int + a.cha) / 2 + (hasTalent(p, 'merchant') ? 22 : 0) + p.jobLevel * 4 - 48;
      const roll = normal(s, skill, 22);
      const income = Math.round(roll * 400 * (1 + p.jobLevel * 0.6));
      let msg: string | undefined;
      if (roll > 28 && p.jobLevel < j.maxLevel) {
        p.jobLevel++;
        msg = `${fullName(p)}의 사업이 성장했다 (규모 ${p.jobLevel})`;
      } else if (roll < -28) {
        if (p.jobLevel === 0) {
          p.job = 'none';
          p.jobLevel = 0;
          p.happiness = clamp(p.happiness - 20, 0, 100);
          msg = `${fullName(p)}의 사업이 부도났다`;
        } else {
          p.jobLevel--;
          msg = `${fullName(p)}의 사업이 위축됐다`;
        }
      }
      return { income, msg };
    }
    case 'youtuber': {
      const viral = 0.03 + a.cha / 900 + (hasTalent(p, 'star') ? 0.12 : 0);
      let msg: string | undefined;
      if (chance(s, viral) && p.jobLevel < j.maxLevel) {
        p.jobLevel++;
        msg = `${fullName(p)}의 영상이 떡상했다! (구독자 단계 ${p.jobLevel})`;
        s.fame += p.jobLevel;
      } else if (p.jobLevel > 0 && chance(s, 0.12)) {
        p.jobLevel--;
        msg = `${fullName(p)} 채널 하락세`;
      }
      const income = Math.round(p.jobLevel * p.jobLevel * 1800 + normal(s, 300, 400));
      return { income, msg };
    }
    case 'athlete': {
      const ag = age(s, p);
      let msg: string | undefined;
      if (ag < 30 && p.jobLevel < j.maxLevel && check(s, a.str + (hasTalent(p, 'athlete') ? 20 : 0), 55 + p.jobLevel * 8, 8)) {
        p.jobLevel++;
        msg = `${fullName(p)} 주전 도약! (레벨 ${p.jobLevel})`;
      }
      return { income: Math.round((j.base + j.perLevel * p.jobLevel) * (0.5 + a.str / 100)), msg };
    }
  }
}

const LIVING_MULT = { frugal: 0.7, normal: 1, lux: 1.8 } as const;

/** 한 해 가계 정산. 로그 메시지 목록 반환. */
export function economyYear(s: GameState): string[] {
  const msgs: string[] = [];
  const h = head(s);
  const mult = LIVING_MULT[s.policy.living];

  // 1) 수입. 버는 만큼 씀씀이도 커진다 (가주 가계는 생활 수준에 따라)
  const incomes = new Map<string, number>();
  for (const p of Object.values(s.people)) {
    if (!alive(p)) continue;
    if (age(s, p) < 20 && p.job === 'none') continue;
    if (p.flags.includes('student')) continue;
    const { income, msg } = workYear(s, p);
    p.cash += income;
    incomes.set(p.id, income);
    if (msg) msgs.push(msg);
  }

  // 2) 지출: 가주 가계 (가주·배우자·미성년 직계) + 교육비
  const minors = livingMainlineMinors(s);
  let household = 0;
  household += 1500 * mult; // 가주
  if (h.spouseId && alive(s.people[h.spouseId])) household += 1500 * mult;
  household += minors.length * 900 * mult;
  const houseIncome = Math.max(0, incomes.get(h.id) ?? 0) + Math.max(0, (h.spouseId && incomes.get(h.spouseId)) || 0);
  household += houseIncome * 0.35 * mult;
  for (const c of minors) household += EDU_COST[s.policy.children[c.id]?.budget ?? 1];
  pay(s, h, Math.round(household));

  // 그 외 성인은 각자 생활비: 최소 1,500만, 수입의 60%
  for (const p of Object.values(s.people)) {
    if (!alive(p) || p.id === h.id || p.id === h.spouseId || age(s, p) < 20) continue;
    p.cash -= Math.round(Math.max(1500, (incomes.get(p.id) ?? 0) * 0.6));
  }

  // 3) 이자 (예금 2%, 빚 7%)
  for (const p of Object.values(s.people)) {
    if (!alive(p)) continue;
    p.cash = Math.round(p.cash * (p.cash >= 0 ? 1.02 : 1.07));
  }
  s.familyCash = Math.round(s.familyCash * 1.02);

  // 4) 부동산 임대수익 2.5%
  for (const a of s.assets) {
    const rent = Math.round(a.value * 0.025);
    if (a.ownerId === 'family') s.familyCash += rent;
    else if (s.people[a.ownerId]) s.people[a.ownerId].cash += rent;
  }

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

/** 부동산 시장 변동 + 가끔 큰 시장 이벤트 */
export function marketYear(s: GameState): string[] {
  const msgs: string[] = [];
  const r: Record<keyof GameState['market'], number> = {
    apt_seoul: normal(s, 0.035, 0.06),
    apt_local: normal(s, 0.015, 0.04),
    land: normal(s, 0.02, 0.03),
  };
  if (chance(s, 0.12)) {
    const ev = pick3(s);
    msgs.push(ev.text);
    for (const k of Object.keys(ev.delta) as (keyof typeof r)[]) r[k] += ev.delta[k]!;
  }
  for (const k of Object.keys(r) as (keyof typeof r)[]) {
    r[k] = clamp(r[k], -0.4, 0.6);
    s.market[k] = Math.round(s.market[k] * (1 + r[k]));
  }
  for (const a of s.assets) a.value = Math.round(a.value * (1 + r[a.kind]));
  return msgs;
}

const MARKET_EVENTS: { text: string; delta: Partial<Record<AssetKind, number>> }[] = [
  { text: '📈 강남 재건축 호재! 서울 아파트값 급등', delta: { apt_seoul: 0.22 } },
  { text: '📈 부동산 광풍. 전국 집값이 들썩인다', delta: { apt_seoul: 0.15, apt_local: 0.12, land: 0.08 } },
  { text: '📉 금리 인상 충격. 부동산 시장 급랭', delta: { apt_seoul: -0.15, apt_local: -0.1 } },
  { text: '📉 지방 인구 유출 가속. 지방 집값 하락', delta: { apt_local: -0.15 } },
  { text: '📈 신도시 개발 발표. 토지 보상 기대감', delta: { land: 0.3, apt_local: 0.08 } },
  { text: '📉 부동산 규제 대책 발표', delta: { apt_seoul: -0.08, apt_local: -0.04 } },
];

function pick3(r: RngHolder) {
  return pick(r, MARKET_EVENTS);
}
