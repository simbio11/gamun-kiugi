import { chance, normal, pick } from './rng';
import { ASSESS_RATIO, ASSET_NAMES, ASSET_YIELD, CREATORS, EDU_COST, JOBS, TALENTS } from './data';
import { addFlag, age, alive, check, clamp, discoverTalent, fullName, hasTalent, head, livingMainlineMinors } from './people';
import type { Asset, AssetKind, GameState, MarketKey, Person } from './types';

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

/** 세법상 평가액: 부동산 70%, 예술품 50%, 금융자산 100% */
export function assessedValue(a: Asset): number {
  return Math.round(a.value * ASSESS_RATIO[a.kind]);
}

export function addAsset(s: GameState, kind: AssetKind, ownerId: string, value: number, name = ASSET_NAMES[kind]): Asset {
  const a: Asset = { id: 'a' + s.idSeq++, kind, name, ownerId, value: Math.round(value) };
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
    case 'fixed':
      if (p.job === 'parttime') return { income: Math.round(j.base * clamp(normal(s, 1, 0.15), 0.6, 1.4)) };
      return { income: j.base + j.perLevel * p.jobLevel };

    case 'salary': {
      const sc = statScore(p, j.stats ?? { int: 1 });
      let msg: string | undefined;
      if (p.job === 'doctor' && p.jobYears <= 4) return { income: 4500, msg: p.jobYears === 4 ? `🩺 ${name} 전문의 취득` : undefined };
      if (p.jobLevel < j.maxLevel && chance(s, (j.promote ?? 0.1) * workBoost * (0.5 + sc / 100))) {
        p.jobLevel++;
        msg = `${name} ${jobTitle(p)}(으)로 승진`;
        if (p.job === 'professor') s.fame += 2;
      }
      return { income: Math.round((j.base + j.perLevel * p.jobLevel) * (0.75 + sc / 200)), msg };
    }

    case 'business': {
      const merchant = hasTalent(p, 'merchant');
      if (p.job === 'shopkeeper') {
        // 자영업: 대부분 겨우 먹고살고, 상당수가 몇 년 안에 문을 닫는다
        const skill = (a.cha + a.mor) / 2 + (merchant ? 18 : 0) + p.jobLevel * 5 - 50;
        const roll = normal(s, skill, 18);
        const income = Math.round(1800 + roll * 120 + p.jobLevel * 3500);
        let msg: string | undefined;
        if (roll > 30 && p.jobLevel < j.maxLevel) {
          p.jobLevel++;
          msg = `🏪 ${name}의 가게가 ${jobTitle(p)}(으)로 커졌다`;
        } else if (roll < -32) {
          p.job = 'none';
          p.jobLevel = 0;
          p.happiness = clamp(p.happiness - 20, 0, 100);
          msg = `${name}의 가게가 폐업했다`;
        }
        return { income, msg };
      }
      const skill = (a.int + a.cha) / 2 + (merchant ? 22 : 0) + p.jobLevel * 4 - 48;
      const roll = normal(s, skill, 22);
      const income = Math.round(roll * 400 * (1 + p.jobLevel * 0.6));
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
      return { income: Math.round(c.incomes[p.jobLevel] * Math.max(0.1, normal(s, 1, 0.4))), msg };
    }

    case 'athlete': {
      const ag = age(s, p);
      let msg: string | undefined;
      if (ag < 30 && p.jobLevel < j.maxLevel && check(s, a.str + (hasTalent(p, 'athlete') ? 20 : 0), 55 + p.jobLevel * 8, 8)) {
        p.jobLevel++;
        msg = `${name} 주전 도약! (레벨 ${p.jobLevel})`;
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

  // 3-1) 감당 못 할 빚: 담보 자산 강제 매각 → 그래도 안 되면 개인파산
  for (const p of Object.values(s.people)) {
    if (!alive(p) || p.cash >= 0) continue;
    const inc = Math.max(1500, incomes.get(p.id) ?? 0);
    const limit = () => assetsOf(s, p.id).reduce((t, a) => t + a.value, 0) * 0.7 + inc * 5;
    const owned = assetsOf(s, p.id).sort((a, b) => (a.kind === 'stock' || a.kind === 'coin' ? -1 : 0) - (b.kind === 'stock' || b.kind === 'coin' ? -1 : 0) || a.value - b.value);
    while (-p.cash > limit() && owned.length) {
      const a = owned.shift()!;
      p.cash += a.fake ? Math.round(a.value * 0.05) : a.value;
      s.assets = s.assets.filter((x) => x.id !== a.id);
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

  // 4) 임대수익·배당
  for (const a of s.assets) {
    const rent = Math.round(a.value * ASSET_YIELD[a.kind]);
    if (!rent) continue;
    if (a.ownerId === 'family') s.familyCash += rent;
    else if (s.people[a.ownerId]) s.people[a.ownerId].cash += rent;
  }

  // 5) 세무사 수임료
  if (s.policy.taxAdvisor) pay(s, h, advisorFee(s));

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

const MARKET_KEYS: MarketKey[] = ['apt_seoul', 'apt_local', 'land', 'stock', 'coin', 'art'];
const MARKET_CLAMP: Record<MarketKey, [number, number]> = {
  apt_seoul: [-0.4, 0.6],
  apt_local: [-0.4, 0.6],
  land: [-0.4, 0.6],
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
    const own = a.kind === 'art' ? normal(s, 0, 0.08) : 0;
    a.value = Math.max(0, Math.round(a.value * (1 + r[a.kind] + own)));
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
