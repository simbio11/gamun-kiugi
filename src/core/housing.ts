// 사는 집: 자가·전세·월세. 이사, 전세 재계약, 전세 살던 집 매수, 집 팔고 줄여 가기.
// 보증금은 내가 맡겨 둔 돈이라 내 재산이고, 전세자금대출은 빚이다.
import type { Asset, GameState, Home, Person } from './types';
import { addAsset, expectedIncome, formatMoney } from './economy';
import { alive, clamp, fullName, householder, spouseOf } from './people';

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
  return [
    t('room', '원룸 (반지하)', 'apt_local', 0, L * 0.18),
    t('oneroom', '원룸 오피스텔', 'apt_local', 1, L * 0.35),
    t('villa', '빌라 투룸', 'apt_local', 2, L * 0.6),
    t('local', '지방 아파트 32평', 'apt_local', 3, L),
    t('metro', '수도권 아파트 25평', 'apt_seoul', 4, S * 0.25),
    t('seoul', '서울 아파트 34평', 'apt_seoul', 5, S * 0.55),
    t('gangnam', '강남 아파트 34평', 'apt_seoul', 6, S),
  ];
}
export const tierOf = (s: GameState, id: string) => tiers(s).find((t) => t.id === id) ?? tiers(s)[2];

export const JEONSE_RATIO = 0.6;
export const WOLSE_DEPOSIT = 0.05;
export const WOLSE_RATE = 0.035;
export const JEONSE_LOAN_RATE = 0.04;
const MOVING_COST = 150;

export const jeonseOf = (t: Tier) => Math.round((t.price * JEONSE_RATIO) / 100) * 100;
export const wolseOf = (t: Tier) => ({ deposit: Math.max(300, Math.round((t.price * WOLSE_DEPOSIT) / 100) * 100), rent: Math.round(t.price * WOLSE_RATE) });

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
  if (type === 'wolse') {
    const w = wolseOf(t);
    const need = w.deposit + fee;
    return { ok: have >= need, need, loan: 0, deposit: w.deposit, rent: w.rent, why: have >= need ? undefined : `${formatMoney(need - have)} 모자람` };
  }
  const dep = jeonseOf(t);
  const lim = jeonseLoanLimit(s, p, dep);
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
  // 전세를 얻을 수 있는 가장 좋은 집, 아니면 월세
  const cash = cashOf(s, p);
  for (const t of [...tiers(s)].reverse()) {
    const dep = jeonseOf(t);
    if (cash >= dep - jeonseLoanLimit(s, p, dep) + MOVING_COST && cash >= dep * 0.3) {
      const q = moveQuote(s, p, t, 'jeonse');
      if (q.ok) {
        moveTo(s, p, t.id, 'jeonse');
        return `${t.name} 전세로 시작한다.`;
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
