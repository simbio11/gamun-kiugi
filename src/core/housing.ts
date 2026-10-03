// 사는 집: 자가·전세·월세. 이사, 전세 재계약, 전세 살던 집 매수, 집 팔고 줄여 가기.
// 보증금은 내가 맡겨 둔 돈이라 내 재산이고, 전세자금대출은 빚이다.
import type { Asset, GameState, Home, Person } from './types';
import { addAsset, expectedIncome, formatMoney } from './economy';
import { alive, clamp, fullName, householder, spouseOf } from './people';
import { previewGiftTax } from './estate';
import { chance } from './rng';

export interface Tier {
  id: string;
  name: string;
  kind: 'apt_seoul' | 'apt_local';
  rank: number;
  price: number;
}

/** 집 등급: 시세는 시장 가격을 따라간다 */
export function tiers(s: GameState): Tier[] {
  const L = s.market.apt_local;
  const S = s.market.apt_seoul;
  const t = (id: string, name: string, kind: Tier['kind'], rank: number, price: number): Tier => ({ id, name, kind, rank, price: Math.round(price / 100) * 100 });
  // 이름은 시대를 탄다: 1960년대 판잣집 셋방·도시 한옥 → 오늘의 원룸·아파트 → 먼 미래의 주거 모듈·해상 도시
  const y = s.year;
  const n = (list: [number, string][]) => list.filter(([from]) => y >= from).pop()![1];
  return [
    t('room', n([[0, '판잣집 셋방'], [1976, '단칸 셋방'], [1985, '반지하 단칸방'], [2045, '지하 소형 주거 모듈'], [2110, '궤도 도시 기본 모듈']]), 'apt_local', 0, L * 0.16),
    t('oneroom', n([[0, '문간방 두 칸'], [1985, '원룸 오피스텔'], [2050, 'AI 스마트 원룸'], [2110, '궤도 도시 1인 주거']]), 'apt_local', 1, L * 0.35),
    t('villa', n([[0, '도시 한옥'], [1980, '연립주택'], [1990, '빌라 투룸'], [2060, '로봇 관리 타운하우스'], [2100, '해상 도시 투룸']]), 'apt_local', 2, L * 0.6),
    t('local', n([[0, '지방 단독주택'], [1978, '지방 아파트 32평'], [2080, '지방 생태 주택 단지']]), 'apt_local', 3, L),
    t('metro', n([[0, '서울 변두리 단독주택'], [1978, '수도권 주공아파트'], [1991, '수도권 아파트 25평'], [2100, '수도권 숲속 아파트']]), 'apt_seoul', 4, S * 0.25),
    t('seoul', n([[0, '서울 양옥'], [1970, '서울 아파트 31평'], [1995, '서울 아파트 34평'], [2100, '서울 숲 전망 아파트']]), 'apt_seoul', 5, S * 0.55),
    t('gangnam', n([[0, '성북동 한옥 대저택'], [1976, '영동(강남) 신축 아파트'], [1990, '강남 아파트 34평'], [2080, '강남 수직 정원 타워']]), 'apt_seoul', 6, S),
  ];
}
export const tierOf = (s: GameState, id: string) => tiers(s).find((t) => t.id === id) ?? tiers(s)[2];

export const JEONSE_RATIO = 0.6;
export const WOLSE_DEPOSIT = 0.05;
export const WOLSE_RATE = 0.035;
export const JEONSE_LOAN_RATE = 0.04;
const MOVING_COST = 150;

export const jeonseOf = (t: Tier) => Math.round((t.price * JEONSE_RATIO) / 100) * 100;
/** 단계별 연 월세율: 작은 집일수록 집값 대비 월세가 비싸다 (2025 시세 기준 반지하 월 40만·원룸 60만·빌라 75만·지방 아파트 100만·수도권 150만·서울 300만·강남 500만 원 안팎 — 한국부동산원 전월세 통계 흐름) */
const RENT_RATE = [0.09, 0.07, 0.05, 0.04, 0.03, 0.026, 0.024];
export const wolseOf = (t: Tier) => ({ deposit: Math.max(300, Math.round((t.price * WOLSE_DEPOSIT) / 100) * 100), rent: Math.round(t.price * (RENT_RATE[t.rank] ?? WOLSE_RATE)) });

// ───────────────────────── 집 단계의 효과 (해마다, 과하지 않게) ─────────────────────────
// 동네 효과(학군·사교육비·수능 정보력)는 아래 HOODS. 여기는 집 자체: 채광·습기·소음·넓이.
export interface HomeFx {
  hap: number;
  hp: number;
  fame: number;
  line: string;
}
export const HOME_FX: HomeFx[] = [
  { hap: -2, hp: -1, fame: 0, line: '습기·곰팡이·채광 부족 (행복 −2 · 건강 −1/년) · 여름 폭우 침수 위험' },
  { hap: -1, hp: 0, fame: 0, line: '좁다 (행복 −1/년)' },
  { hap: 0, hp: 0, fame: 0, line: '그럭저럭 (효과 없음)' },
  { hap: 1, hp: 0, fame: 0, line: '숨통이 트인다 (행복 +1/년)' },
  { hap: 1, hp: 0, fame: 0, line: '아파트 단지 (행복 +1/년)' },
  { hap: 2, hp: 0, fame: 0.3, line: '서울 아파트 (행복 +2/년 · 명성 조금)' },
  { hap: 2, hp: 0, fame: 0.6, line: '강남 (행복 +2/년 · 명성 +)' },
];
/** 집주인이 보는 월세 감당 능력: 연 월세가 가구 소득의 40% 이하 (또는 통장에 5년 치, 또는 넉넉한 부모님 보증) — 위로 옮길 때만 본다 */
export const RENT_INCOME_CAP = 0.4;
export function rentAffordable(s: GameState, p: Person, rent: number): boolean {
  const income = household(s, p).reduce((t, x) => t + Math.max(0, expectedIncome(s, x)), 0);
  return rent <= income * RENT_INCOME_CAP || cashOf(s, p) >= rent * 5 || parentBacking(s, p).liquid >= rent * 8;
}

// ───────────────────────── 금수저: 부모님 찬스 ─────────────────────────
// 같은 집이라도 부모님이 넉넉하면 구하기 쉽다: 월세는 부모님 보증으로, 전세는 부모님이 보증금을 보태 준다.
/** 부부 양쪽의 살아 계신 부모님과 그분들이 당장 쓸 수 있는 돈 (집에 같이 사는 부모님은 제외 = 내가 가주가 아닌 경우의 살림 주인) */
export function parentBacking(s: GameState, p: Person): { pars: Person[]; liquid: number } {
  const mine = new Set(household(s, p).map((x) => x.id));
  const pars = [...new Set(household(s, p).flatMap((x) => [x.fatherId, x.motherId]))]
    .map((id) => s.people[id ?? ''])
    .filter((q): q is Person => !!q && alive(q) && !mine.has(q.id));
  return { pars, liquid: pars.reduce((t, q) => t + Math.max(0, q.cash), 0) };
}
/** 전세 보증금이 모자랄 때 부모님이 보태 주실 수 있는 돈: 부모님 현금의 50%까지 (자식이 여럿이면 나눠야 하니) */
export function parentTopUp(s: GameState, p: Person, short: number): number {
  const { liquid } = parentBacking(s, p);
  const cap = liquid * 0.5;
  return short > 0 && short <= cap ? short : 0;
}
/** 부모님이 보태 주신다: 증여로 기록 (성인 자녀 10년 5천만 원 공제 넘으면 증여세) */
export function receiveTopUp(s: GameState, p: Person, amount: number): string {
  const { pars } = parentBacking(s, p);
  let left = amount;
  let tax = 0;
  for (const q of pars.sort((a, b) => b.cash - a.cash)) {
    if (left <= 0) break;
    const give = Math.min(left, Math.max(0, q.cash));
    if (give <= 0) continue;
    const tx = previewGiftTax(s, q, p, give);
    q.cash -= give + tx; // 증여세까지 부모님이 내 주신다 (흔한 일)
    p.cash += give;
    tax += tx;
    s.gifts.push({ fromId: q.id, toId: p.id, amount: give + tx, tax: tx, year: s.year });
    left -= give;
  }
  p.flags = p.flags.filter((f) => !f.startsWith('nest:')).concat('nest:' + Math.round(Number(p.flags.find((f) => f.startsWith('nest:'))?.slice(5) ?? 0) + amount));
  return `부모님이 전세금 ${formatMoney(amount)}을 보태 주셨다${tax ? ` (증여세 ${formatMoney(tax)}도 대신 내 주셨다)` : ''}.`;
}

function household(s: GameState, p: Person): Person[] {
  const sp = spouseOf(s, p);
  return sp && alive(sp) ? [p, sp] : [p];
}

/** 이 사람 가구의 집 기록을 가진 사람 */
export function homeHolder(s: GameState, p: Person): Person | undefined {
  return household(s, p).find((x) => x.home);
}
export const homeOf = (s: GameState, p: Person): Home | undefined => homeHolder(s, p)?.home;

/** 지금 가주가 사는 곳 (독립 전이면 부모님 집) */
export function residence(s: GameState): { home?: Home; holder?: Person; withParents: boolean } {
  const hh = householder(s);
  const holder = homeHolder(s, hh);
  return { home: holder?.home, holder, withParents: hh.id !== s.headId };
}

/** 신용 상태에 따른 대출 가능 여부 */
export function creditBlocked(p: Person): string | undefined {
  if (p.flags.some((f) => f.startsWith('rehab:'))) return '개인회생 중';
  if (p.flags.some((f) => f.startsWith('bankrupt_until:'))) return '파산 면책 후 5년';
  if ((p.credit ?? 750) < 500) return '신용점수 부족';
  return undefined;
}

/** 전세자금대출 한도: 보증금의 80%, 2억, 연 소득 4배 중 작은 값 */
export function jeonseLoanLimit(s: GameState, p: Person, deposit: number): number {
  if (creditBlocked(p)) return 0;
  const income = household(s, p).reduce((t, x) => t + Math.max(0, expectedIncome(s, x)), 0);
  return Math.round(Math.min(deposit * 0.8, 20000, income * 4));
}

const cashOf = (s: GameState, p: Person) => household(s, p).reduce((t, x) => t + Math.max(0, x.cash), 0);

/** 지금 집을 빼면 돌려받는 돈 (보증금 - 전세대출) */
export const refundOf = (h?: Home) => (h && (h.type === 'jeonse' || h.type === 'wolse') ? h.deposit - (h.loan ?? 0) : 0);

export interface MoveQuote {
  ok: boolean;
  need: number;
  loan: number;
  deposit: number;
  rent: number;
  why?: string;
}

/** 이사 견적: 전세면 대출을 최대한 끼고, 모자라면 불가 */
export function moveQuote(s: GameState, p: Person, t: Tier, type: 'jeonse' | 'wolse'): MoveQuote {
  const old = homeOf(s, p);
  const have = cashOf(s, p) + refundOf(old);
  const fee = MOVING_COST + Math.round(t.price * 0.003);
  const curRank = old ? tierOf(s, old.tier).rank : -1;
  if (type === 'wolse') {
    const w = wolseOf(t);
    const need = w.deposit + fee;
    // 더 좋은 집으로 갈 때만 소득을 본다 (줄여 가는 건 언제든)
    if (t.rank > curRank && !rentAffordable(s, p, w.rent)) return { ok: false, need, loan: 0, deposit: w.deposit, rent: w.rent, why: `소득이 모자람 (월세가 소득의 ${RENT_INCOME_CAP * 100}%를 넘는다)` };
    return { ok: have >= need, need, loan: 0, deposit: w.deposit, rent: w.rent, why: have >= need ? undefined : `${formatMoney(need - have)} 모자람` };
  }
  const dep = jeonseOf(t);
  // 더 좋은 집 전세는 보증금의 30%는 내 돈이어야 한다 (대출만으로 올라가지 못한다)
  const backed = parentBacking(s, p).liquid >= dep * 0.5;
  const lim = t.rank > curRank && !backed ? Math.min(jeonseLoanLimit(s, p, dep), Math.round(dep * 0.7)) : jeonseLoanLimit(s, p, dep);
  const need = dep - lim + fee;
  const loan = Math.max(0, Math.min(lim, dep + fee - have));
  return { ok: have >= need, need, loan, deposit: dep, rent: 0, why: have >= need ? undefined : lim ? `${formatMoney(need - have)} 모자람 (대출 한도 ${formatMoney(lim)})` : `${formatMoney(need - have)} 모자람 (${creditBlocked(p) ?? '대출 불가'})` };
}

/** 가족 모두의 행복이 집 등급 변화만큼 오르내린다 */
function moodShift(s: GameState, p: Person, d: number) {
  if (!d) return;
  const fam = [...household(s, p), ...p.childIds.map((id) => s.people[id]).filter((c) => c && alive(c) && !c.flags.includes('indep') && !c.spouseId)];
  for (const x of fam) x.happiness = clamp(x.happiness + d, 0, 100);
}

/** 기존 집 정리: 보증금 돌려받고 전세대출 갚기. 자가는 그대로 두면 세를 놓는 집이 된다 */
function leaveHome(p: Person) {
  const h = p.home;
  if (!h) return;
  p.cash += refundOf(h);
  p.home = undefined;
}

/** 전세·월세로 이사 */
export function moveTo(s: GameState, who: Person, tierId: string, type: 'jeonse' | 'wolse'): string {
  const t = tierOf(s, tierId);
  const q = moveQuote(s, who, t, type);
  if (!q.ok) return `이사할 수 없다: ${q.why}`;
  const holder = homeHolder(s, who) ?? who;
  const old = holder.home;
  const oldRank = old ? tierOf(s, old.tier).rank : t.rank;
  const wasOwn = old?.type === 'own' ? s.assets.find((a) => a.id === old.assetId) : undefined;
  leaveHome(holder);
  for (const x of household(s, who)) if (x !== holder && x.cash > 0) (holder.cash += x.cash), (x.cash = 0);
  const fee = MOVING_COST + Math.round(t.price * 0.003);
  holder.cash -= q.deposit - q.loan + fee;
  holder.home = { type, tier: t.id, name: t.name, deposit: q.deposit, rent: q.rent, loan: q.loan || undefined, since: s.year };
  moodShift(s, holder, (t.rank - oldRank) * 4);
  s.log.push({ year: s.year, text: `🚚 ${fullName(holder)} 가족, ${t.name} ${type === 'jeonse' ? '전세' : '월세'}로 이사`, kind: 'money' });
  return (
    `${t.name}에 ${type === 'jeonse' ? `전세 ${formatMoney(q.deposit)}` : `보증금 ${formatMoney(q.deposit)} · 월세 연 ${formatMoney(q.rent)}`}로 이사했다.` +
    (q.loan ? ` 전세대출 ${formatMoney(q.loan)} (연 ${(JEONSE_LOAN_RATE * 100).toFixed(0)}%)` : '') +
    (wasOwn ? `\n살던 ${wasOwn.name}은(는) 세를 놓는다.` : '') +
    (t.rank < oldRank ? '\n좁아진 집에 가족들 표정이 어둡다.' : t.rank > oldRank ? '\n넓어진 집에 가족들이 들떴다.' : '')
  );
}

/** 산 집에 들어가 산다 (예전 전세·월세 보증금은 돌려받는다) */
export function moveInto(s: GameState, who: Person, a: Asset): string {
  const holder = homeHolder(s, who) ?? who;
  const old = holder.home;
  const oldRank = old ? tierOf(s, old.tier).rank : 2;
  leaveHome(holder);
  const t = nearestTier(s, a);
  holder.home = { type: 'own', tier: t.id, name: a.name, assetId: a.id, deposit: 0, rent: 0, since: s.year };
  moodShift(s, holder, Math.max(2, (t.rank - oldRank) * 4 + 4));
  s.log.push({ year: s.year, text: `🏡 ${fullName(holder)} 가족, 내 집 ${a.name}에 입주`, kind: 'money' });
  return `${a.name}에 입주했다. 내 집이다!` + (refundOf(old) ? ` (보증금 ${formatMoney(refundOf(old))} 돌려받음)` : '');
}

/** 자산 가격에 가장 가까운 집 등급 */
export function nearestTier(s: GameState, a: { kind: string; value: number }): Tier {
  const pool = tiers(s).filter((t) => t.kind === a.kind || a.kind === 'building');
  return (pool.length ? pool : tiers(s)).reduce((b, t) => (Math.abs(t.price - a.value) < Math.abs(b.price - a.value) ? t : b));
}

/** 지금 전세·월세로 사는 집을 산다 */
export function buyingPrice(s: GameState, h: Home): number {
  return tierOf(s, h.tier).price;
}

/** 살던 집(자가)이 팔렸을 때: 같은 등급 이하 월세로 옮긴다 */
export function afterHomeSold(s: GameState, assetId: string): string {
  const holder = Object.values(s.people).find((p) => p.home?.type === 'own' && p.home.assetId === assetId);
  if (!holder) return '';
  const old = holder.home!;
  const ts = tiers(s);
  const cur = tierOf(s, old.tier);
  // 한 단계 낮은 집 월세 (보증금은 판 돈에서)
  const t = ts.find((x) => x.rank === Math.max(0, cur.rank - 1)) ?? cur;
  const w = wolseOf(t);
  holder.cash -= w.deposit + MOVING_COST;
  holder.home = { type: 'wolse', tier: t.id, name: t.name, deposit: w.deposit, rent: w.rent, since: s.year };
  moodShift(s, holder, -6);
  return `살던 집을 팔고 ${t.name} 월세(연 ${formatMoney(w.rent)})로 옮겼다.`;
}

/** 해마다: 월세 조정, 전세 5년 만기 재계약 (오른 만큼 더 내거나 돌려받는다) */
export const JEONSE_TERM = 5;
export function housingYear(s: GameState): string[] {
  const msgs: string[] = [];
  const hh = householder(s);
  for (const p of Object.values(s.people)) {
    const h = p.home;
    if (!h || !alive(p)) continue;
    const t = tierOf(s, h.tier);
    const mine = p.id === hh.id || p.id === hh.spouseId;
    // 집 단계의 효과: 이 집에 사는 사람들 (부부 + 같이 사는 미혼 자녀)
    const fx = HOME_FX[t.rank];
    if (fx && p.id === (homeHolder(s, p) ?? p).id) {
      const fam = [...household(s, p), ...p.childIds.map((id) => s.people[id]).filter((c) => c && alive(c) && !c.home && !c.spouseId && !c.flags.includes('indep'))];
      for (const x of fam) {
        x.happiness = clamp(x.happiness + fx.hap, 0, 100);
        if (fx.hp) x.actual.hp = clamp(x.actual.hp + fx.hp, 0, 100);
      }
      if (mine) s.fame += fx.fame;
      // 반지하 침수: 2022년 8월 서울 폭우 때 반지하 가구 인명 피해 — 여름마다 조금
      if (t.rank === 0 && s.year >= 1985 && chance(s, 0.03)) {
        p.cash -= 300;
        for (const x of fam) x.happiness = clamp(x.happiness - 6, 0, 100);
        if (mine) msgs.push('🌧 폭우에 반지하 방이 물에 잠겼다. 가전과 이불을 버렸다. (−300만 원)');
      }
    }
    // 월세를 감당 못 하면 (월세가 소득의 60%를 넘고 통장도 비면) 한 단계 작은 집으로 밀려난다
    if (mine && h.type === 'wolse' && t.rank > 0 && p.cash < h.rent) {
      const income = household(s, p).reduce((a, x) => a + Math.max(0, expectedIncome(s, x)), 0);
      if (h.rent > income * 0.6) {
        const low = tiers(s).find((x) => x.rank === t.rank - 1)!;
        // 이사비가 없어도 쫓겨난다: 원래 보증금을 그대로 새 보증금으로 (모자라면 그만큼 빚)
        const w = wolseOf(low);
        p.cash += h.deposit - w.deposit - MOVING_COST;
        p.home = { type: 'wolse', tier: low.id, name: low.name, deposit: w.deposit, rent: w.rent, since: s.year };
        moodShift(s, p, -6);
        msgs.push(`📦 월세를 감당하지 못해 ${low.name}(으)로 밀려났다. (월세 연 ${formatMoney(w.rent)})`);
        continue;
      }
    }
    if (h.type === 'wolse') h.rent = wolseOf(t).rent;
    if (h.type === 'jeonse' && s.year - h.since >= JEONSE_TERM && (s.year - h.since) % JEONSE_TERM === 0) {
      const nd = jeonseOf(t);
      const diff = nd - h.deposit;
      p.cash -= diff;
      h.deposit = nd;
      if (mine && Math.abs(diff) >= 100) msgs.push(diff > 0 ? `🏠 전세 재계약: 보증금 ${formatMoney(diff)} 올려 줬다` : `🏠 전세 재계약: 보증금 ${formatMoney(-diff)} 돌려받았다`);
    }
  }
  return msgs;
}

/** 살림 맡은 사람이 집이 없으면(독립·결혼·승계 직후) 형편에 맞게 정한다 */
export function settleHome(s: GameState, p: Person): string {
  if (homeOf(s, p)) return '';
  const owned = s.assets.filter((a) => household(s, p).some((x) => x.id === a.ownerId) && (a.kind === 'apt_seoul' || a.kind === 'apt_local' || a.tags?.includes('주택')) && !a.deposit);
  if (owned.length) {
    const a = owned.sort((x, y) => y.value - x.value)[0];
    const t = nearestTier(s, a);
    p.home = { type: 'own', tier: t.id, name: a.name, assetId: a.id, deposit: 0, rent: 0, since: s.year };
    return `${a.name}에서 산다.`;
  }
  // 전세를 얻을 수 있는 가장 좋은 집, 아니면 월세 — 단, 첫 집은 자란 집(부모님 집)보다 한 단계 위까지만 (출발선은 대물림된다)
  const cash = cashOf(s, p);
  const grewUp = [p, ...household(s, p)]
    .flatMap((x) => [s.people[x.fatherId ?? ''], s.people[x.motherId ?? '']])
    .filter(Boolean)
    .map((q) => homeOf(s, q))
    .filter(Boolean)
    .map((h) => tierOf(s, h!.tier).rank);
  const cap = grewUp.length ? Math.max(...grewUp) + 1 : 6;
  for (const t of [...tiers(s)].reverse().filter((x) => x.rank <= cap)) {
    const dep = jeonseOf(t);
    if (cash >= dep - jeonseLoanLimit(s, p, dep) + MOVING_COST && cash >= dep * 0.3) {
      const q = moveQuote(s, p, t, 'jeonse');
      if (q.ok) {
        moveTo(s, p, t.id, 'jeonse');
        return `${t.name} 전세로 시작한다.`;
      }
    }
    // 금수저: 자란 집 두 단계 아래까지는 부모님이 모자란 보증금을 보태 주신다
    if (grewUp.length && t.rank >= Math.max(...grewUp) - 2 && !p.flags.includes('declined_help')) {
      const q = moveQuote(s, p, t, 'jeonse');
      const short = q.need - (cash + refundOf(homeOf(s, p)));
      const top = parentTopUp(s, p, short + 100);
      if (top) {
        const help = receiveTopUp(s, p, top);
        moveTo(s, p, t.id, 'jeonse');
        return `${help} ${t.name} 전세로 시작한다.`;
      }
    }
  }
  const t = cash >= wolseOf(tierOf(s, 'oneroom')).deposit + 500 ? tierOf(s, 'oneroom') : tierOf(s, 'room');
  const w = wolseOf(t);
  p.cash -= w.deposit;
  p.home = { type: 'wolse', tier: t.id, name: t.name, deposit: w.deposit, rent: w.rent, since: s.year };
  return `${t.name} 월세(연 ${formatMoney(w.rent)})로 시작한다.`;
}

/** 사람이 죽으면 집 기록은 배우자에게, 없으면 보증금을 현금으로 돌려 상속 재산에 넣는다 */
export function passHome(s: GameState, d: Person) {
  const h = d.home;
  if (!h) return;
  const sp = spouseOf(s, d);
  if (sp && alive(sp) && !sp.home) sp.home = h;
  else d.cash += refundOf(h);
  d.home = undefined;
}

export const HOME_TYPE: Record<Home['type'], string> = { own: '자가', jeonse: '전세', wolse: '월세', parents: '부모님 댁' };

/** 전세·월세로 사는 집을 산다: 보증금을 돌려받아 보태고, 나머지는 주택담보대출 */
export function homeBuyQuote(s: GameState, p: Person): { price: number; need: number; loan: number; tax: number } | undefined {
  const h = homeOf(s, p);
  if (!h || h.type === 'own' || h.type === 'parents') return;
  const price = buyingPrice(s, h);
  const tax = Math.round(price * (price <= 60000 ? 0.01 : price <= 90000 ? 0.02 : 0.03));
  const income = household(s, p).reduce((t, x) => t + Math.max(0, expectedIncome(s, x)), 0);
  const loan = creditBlocked(p) ? 0 : Math.round(Math.min(price * 0.6, income * 7));
  const need = price + tax - refundOf(h) - loan;
  return { price, need, loan, tax };
}

export function buyCurrentHome(s: GameState, p: Person): string {
  const holder = homeHolder(s, p);
  const q = homeBuyQuote(s, p);
  if (!holder || !q) return '';
  const have = cashOf(s, p);
  if (have < q.need) return `${formatMoney(q.need - have)} 모자라 살 수 없다`;
  const h = holder.home!;
  const t = tierOf(s, h.tier);
  leaveHome(holder);
  const useLoan = Math.max(0, Math.min(q.loan, q.price + q.tax - holder.cash));
  holder.cash -= q.price + q.tax - useLoan;
  const a = addAsset(s, t.kind, holder.id, q.price, h.name.replace(/ \(.*\)$/, ''));
  if (useLoan) a.loan = useLoan;
  holder.home = { type: 'own', tier: t.id, name: a.name, assetId: a.id, deposit: 0, rent: 0, since: s.year };
  moodShift(s, holder, 5);
  s.log.push({ year: s.year, text: `🏡 ${fullName(holder)}, 살던 ${a.name}을(를) 매수`, kind: 'money' });
  return `살던 집을 샀다! ${formatMoney(q.price)} (취득세 ${formatMoney(q.tax)}${useLoan ? ` · 대출 ${formatMoney(useLoan)}` : ''})`;
}

// ───────────────────────── 동네 (학군·어울리는 친구) ─────────────────────────

export type Hood = 'poor' | 'modest' | 'local' | 'middle' | 'rich' | 'elite';
export interface HoodInfo {
  hood: Hood;
  name: string;
  /** 공부 효율 배수 (면학 분위기·학원 인프라) */
  study: number;
  /** 사교육비 배수 (대치동 학원비 vs 동네 보습학원) */
  cost: number;
  /** 수능 정보력 보너스 */
  sat: number;
}
const HOODS: Record<Hood, Omit<HoodInfo, 'hood'>> = {
  poor: { name: '반지하 동네', study: 0.85, cost: 0.7, sat: -1.5 },
  modest: { name: '빌라촌', study: 0.93, cost: 0.85, sat: -0.5 },
  local: { name: '지방 아파트 단지', study: 0.97, cost: 0.9, sat: 0 },
  middle: { name: '수도권 아파트 단지', study: 1, cost: 1, sat: 0 },
  rich: { name: '서울 학군지', study: 1.08, cost: 1.35, sat: 1 },
  elite: { name: '대치동 학원가', study: 1.15, cost: 1.8, sat: 2 },
};
const RANK_HOOD: Hood[] = ['poor', 'poor', 'modest', 'local', 'middle', 'rich', 'elite'];

/** 이 사람이 사는 동네: 본인 집 → 부모님 집 → 살림 맡은 사람 집 */
export function hoodOf(s: GameState, p: Person): HoodInfo {
  const h = homeOf(s, p) ?? [s.people[p.fatherId ?? ''], s.people[p.motherId ?? '']].filter(Boolean).map((q) => homeOf(s, q)).find(Boolean) ?? homeOf(s, householder(s));
  const hood = h ? RANK_HOOD[tierOf(s, h.tier).rank] : 'middle';
  return { hood, ...HOODS[hood] };
}

const HOUSE_KINDS_OWN = ['apt_seoul', 'apt_local'];

/** 내가(부부가) 가진 집 중 들어가 살 수 있는 곳: 지금 사는 집 빼고, 주택만 */
export function ownedHomes(s: GameState, p: Person): Asset[] {
  const ids = household(s, p).map((x) => x.id);
  const cur = homeOf(s, p);
  return s.assets.filter((a) => ids.includes(a.ownerId) && (HOUSE_KINDS_OWN.includes(a.kind) || !!a.tags?.includes('주택')) && !(cur?.type === 'own' && cur.assetId === a.id));
}

/** 내 집으로 들어가는 데 드는 돈: 세입자 보증금 반환 + 이사비 (지금 전세·월세 보증금은 돌려받아 보탠다) */
export function moveInQuote(s: GameState, p: Person, a: Asset): { need: number; have: number; ok: boolean; tenant: number } {
  const tenant = a.deposit ?? 0;
  const fee = MOVING_COST + Math.round(a.value * 0.003);
  const have = cashOf(s, p) + refundOf(homeOf(s, p));
  const need = tenant + fee;
  return { need, have, ok: have >= need, tenant };
}

/**
 * 가진 집에 들어가 산다. 세입자가 있으면 보증금을 돌려주고 내보낸다.
 * 부모님 댁에 얹혀 살던 사람은 이걸로 독립한다. 살던 자가는 세를 놓는 집이 된다.
 */
export function moveIntoOwned(s: GameState, p: Person, assetId: string): { ok: boolean; text: string } {
  const a = s.assets.find((x) => x.id === assetId);
  if (!a) return { ok: false, text: '그 집이 없다' };
  const q = moveInQuote(s, p, a);
  if (!q.ok) return { ok: false, text: `돈이 ${formatMoney(q.need - q.have)} 모자란다${q.tenant ? ` (세입자 보증금 ${formatMoney(q.tenant)} 돌려줘야 함)` : ''}` };
  const wasDependent = householder(s).id !== p.id;
  const oldOwn = homeOf(s, p)?.type === 'own' ? s.assets.find((x) => x.id === homeOf(s, p)!.assetId) : undefined;
  // 이사비·보증금 반환은 가구 통장에서 (먼저 지금 집 보증금을 돌려받는다)
  const holder = homeHolder(s, p) ?? p;
  if (holder.home) leaveHome(holder);
  for (const x of household(s, p)) if (x !== p && x.cash > 0) (p.cash += x.cash), (x.cash = 0);
  p.cash -= q.need;
  a.deposit = undefined;
  a.depositEnd = undefined;
  if (wasDependent && !p.flags.includes('indep')) p.flags.push('indep');
  const r = moveInto(s, p, a);
  return {
    ok: true,
    text:
      r +
      (q.tenant ? `\n세입자에게 보증금 ${formatMoney(q.tenant)}을 돌려주고 계약을 정리했다.` : '') +
      (oldOwn ? `\n살던 ${oldOwn.name}은(는) 세를 놓는다.` : '') +
      (wasDependent ? '\n부모님 품을 떠나 내 집에서 독립했다!' : ''),
  };
}
