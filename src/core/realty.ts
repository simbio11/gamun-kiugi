// 부동산: 해마다 바뀌는 매물, 1주택/다주택 세금, 대출(LTV·소득 한도), 전세·월세, 공실, 재건축·개발 호재.
// 세율은 한국 제도를 게임용으로 단순화했다 (정확한 세액 계산기가 아니다).
import { chance, int, next, normal, pick } from './rng';
import type { Asset, GameState, Listing, Person } from './types';
import { addAsset, expectedIncome, formatMoney, pay } from './economy';
import { alive, clamp, fullName, head, spouseOf } from './people';
import { creditBlocked, homeOf, JEONSE_TERM, refundOf } from './housing';
import { queueJeonseEnd, tenantYear } from './tenant';

export const HOUSE_KINDS = ['apt_seoul', 'apt_local'] as const;
export const REALTY_KINDS = ['apt_seoul', 'apt_local', 'land', 'building'] as const;
export const isRealty = (a: { kind: string }) => (REALTY_KINDS as readonly string[]).includes(a.kind);
/** 주택 수에 들어가는가: 아파트, 그리고 주거용 오피스텔·다가구 */
export const isHouse = (a: { kind: string; tags?: string[] }) => (HOUSE_KINDS as readonly string[]).includes(a.kind) || !!a.tags?.includes('주택');

/** 자산에 딸린 빚: 담보대출 + 세입자 보증금 */
export const liab = (a: Asset) => (a.loan ?? 0) + (a.deposit ?? 0);
/** 순자산 가치 */
export const netOf = (a: Asset) => a.value - liab(a);

export const LOAN_RATE = 0.045;
const BROKER = 0.004; // 중개보수

// ───────────────────────── 가구와 주택 수 ─────────────────────────

function household(s: GameState, p: Person): Person[] {
  const sp = spouseOf(s, p);
  return sp && alive(sp) ? [p, sp] : [p];
}

/** 한 가구(본인+배우자)가 가진 주택 */
export function homesOf(s: GameState, p: Person): Asset[] {
  const ids = new Set(household(s, p).map((x) => x.id));
  return s.assets.filter((a) => ids.has(a.ownerId) && isHouse(a));
}

/** 실거주 집: 가구가 가진 주택 중 가장 비싼 한 채 */
export function primaryOf(s: GameState, p: Person): Asset | undefined {
  return homesOf(s, p).sort((a, b) => b.value - a.value)[0];
}

/** 실거주 집: 가구가 '자가'로 사는 집. 집 기록이 없는 가구(방계 등)는 가장 비싼 집으로 친다 */
export function isPrimary(s: GameState, a: Asset): boolean {
  const o = s.people[a.ownerId];
  if (!o || !isHouse(a)) return false;
  const hs = household(s, o).map((x) => x.home).filter(Boolean);
  if (hs.length) return hs.some((h) => h!.type === 'own' && h!.assetId === a.id);
  return primaryOf(s, o)?.id === a.id;
}

// ───────────────────────── 세금 ─────────────────────────

/** 취득세율: 주택은 보유 주택 수에 따라 중과 */
export function acqTax(s: GameState, buyer: Person, l: { price: number; house: boolean }): { rate: number; note: string } {
  if (!l.house) return { rate: 0.046, note: '토지·상가 4.6%' };
  const n = homesOf(s, buyer).length;
  if (n === 0) return { rate: l.price <= 60000 ? 0.01 : l.price <= 90000 ? 0.02 : 0.03, note: '무주택 1~3%' };
  if (n === 1) return { rate: 0.08, note: '2주택 중과 8%' };
  return { rate: 0.12, note: '3주택 이상 중과 12%' };
}

/** 대출 한도: 주택 수에 따른 LTV와 소득 대비 한도(연 소득 7배) 중 작은 쪽. 전세 낀 집은 대출 불가 */
export function loanLimit(s: GameState, buyer: Person, l: Listing): { amount: number; ltv: number } {
  if (l.deposit || creditBlocked(buyer)) return { amount: 0, ltv: 0 };
  const n = homesOf(s, buyer).length;
  const ltv = l.house ? (n === 0 ? 0.6 : n === 1 ? 0.3 : 0) : 0.5;
  const income = household(s, buyer).reduce((t, p) => t + Math.max(0, expectedIncome(s, p)), 0);
  return { amount: Math.round(Math.min(l.price * ltv, income * 7)), ltv };
}

/** 매수에 필요한 현금 */
export function buyQuote(s: GameState, buyer: Person, l: Listing) {
  const tax = Math.round(l.price * acqTax(s, buyer, l).rate);
  const fee = Math.round(l.price * BROKER);
  const lim = loanLimit(s, buyer, l);
  // 첫 집이면 지금 사는 전세·월세 보증금을 빼서 보탤 수 있다
  const first = l.house && !l.deposit && homesOf(s, buyer).length === 0;
  // 통장 순액 (빚은 뺀다): 마이너스 통장으로는 집을 못 산다
  const cash = Math.max(0, household(s, buyer).reduce((t, p) => t + p.cash, 0)) + (first ? refundOf(homeOf(s, buyer)) : 0);
  const base = l.price - (l.deposit ?? 0) + tax + fee;
  const loan = Math.max(0, Math.min(lim.amount, base - cash));
  return { tax, fee, loan, limit: lim.amount, ltv: lim.ltv, need: base - lim.amount, total: base, cash };
}

/** 양도소득세 (단순화): 1세대 1주택 2년 보유면 12억까지 비과세, 단기 보유·다주택은 무겁게 */
export function gainsTax(s: GameState, a: Asset): { tax: number; note: string } {
  if (!isRealty(a)) return { tax: 0, note: '' };
  const gain = a.value - (a.cost ?? a.value);
  if (gain <= 0) return { tax: 0, note: '차익 없음' };
  const held = s.year - (a.bought ?? s.year);
  const o = s.people[a.ownerId];
  const n = o ? homesOf(s, o).length : 1;
  const house = isHouse(a);
  if (house && n === 1 && held >= 2) {
    if (a.value <= 120000) return { tax: 0, note: '1세대 1주택 비과세' };
    const taxable = (gain * (a.value - 120000)) / a.value;
    return { tax: Math.round(taxable * 0.24), note: '1주택 고가분만 과세' };
  }
  let rate: number;
  let note: string;
  if (held < 1) (rate = house ? 0.7 : 0.5), (note = '1년 미만 단타');
  else if (held < 2) (rate = house ? 0.6 : 0.4), (note = '2년 미만 보유');
  else {
    rate = gain <= 5000 ? 0.15 : gain <= 15000 ? 0.24 : gain <= 50000 ? 0.35 : 0.42;
    note = `${held}년 보유`;
    if (house && n >= 2) {
      rate += n >= 3 ? 0.3 : 0.2;
      note += ` · 다주택 중과`;
    }
  }
  return { tax: Math.round(gain * rate), note };
}

/** 재산세율 (시가 기준으로 환산) */
function propertyTaxRate(s: GameState, a: Asset): number {
  if (isHouse(a)) return isPrimary(s, a) ? 0.001 : 0.0015;
  return a.kind === 'land' ? 0.002 : 0.0025;
}

/** 종합부동산세: 가구 주택 공시가(시가 70%) 합이 공제선(1주택 12억, 다주택 9억)을 넘는 부분 */
function comprehensiveTax(s: GameState, p: Person): number {
  const homes = homesOf(s, p);
  if (!homes.length) return 0;
  const assessed = homes.reduce((t, a) => t + a.value * 0.7, 0);
  const free = homes.length === 1 ? 120000 : 90000;
  const rate = homes.length >= 3 ? 0.015 : homes.length === 2 ? 0.008 : 0.005;
  return Math.round(Math.max(0, assessed - free) * rate);
}

const VACANCY: Record<string, number> = { apt_seoul: 0.04, apt_local: 0.1, building: 0.12, land: 0 };
const DEFAULT_YIELD: Record<string, number> = { apt_seoul: 0.022, apt_local: 0.04, building: 0.034, land: 0 };
export const yieldOf = (a: Asset) => a.yield ?? DEFAULT_YIELD[a.kind] ?? 0;
const vacancyOf = (a: Asset) => (a.tags?.includes('상가') ? 0.2 : VACANCY[a.kind] ?? 0);

/** 올해 받을 월세 (실거주·전세 낀 집·땅은 없다) */
export function rentable(s: GameState, a: Asset): boolean {
  return isRealty(a) && !a.deposit && a.lease !== 'empty' && !isPrimary(s, a) && yieldOf(a) > 0;
}

// ───────────────────────── 한 해 정산 ─────────────────────────

/** 임대료·배당·재산세·종부세·대출이자·전세 만기·재건축/개발 호재. 로그 메시지를 돌려준다. */
export function realtyYear(s: GameState): string[] {
  const msgs: string[] = [];
  const h = head(s);
  const mine = new Set(household(s, h).map((p) => p.id));
  const sum = { rent: 0, div: 0, tax: 0, interest: 0 };
  for (const a of [...s.assets]) {
    const o = s.people[a.ownerId];
    if (!o || !alive(o)) continue;
    const me = mine.has(o.id);
    if (a.kind === 'stock') {
      const d = Math.round(a.value * clamp(normal(s, 0.018, 0.006), 0.004, 0.035) * ((s.marketChange.stock ?? 0) < -0.15 ? 0.6 : 1));
      o.cash += d;
      if (me) sum.div += d;
      continue;
    }
    if (!isRealty(a)) continue;
    // 대출 이자
    if (a.loan) {
      const i = Math.round(a.loan * LOAN_RATE);
      o.cash -= i;
      if (me) sum.interest += i;
    }
    // 재산세
    const t = Math.round(a.value * propertyTaxRate(s, a));
    o.cash -= t;
    if (me) sum.tax += t;
    // 월세 (공실이면 한 푼도 없다). 임대소득세 15%
    if (rentable(s, a)) {
      if (chance(s, vacancyOf(a))) {
        if (me) msgs.push(`🏚 ${a.name}: 세입자를 못 구해 1년 내내 공실`);
      } else {
        const r = Math.round(a.value * yieldOf(a) * (0.9 + next(s) * 0.2) * 0.85);
        o.cash += r;
        if (me) sum.rent += r;
      }
    }
    // 전세 만기: 우리 집이면 직접 고르고(이벤트), 남의 집은 재계약하거나 보증금을 돌려준다
    if (a.deposit && s.year >= (a.depositEnd ?? s.year) && queueJeonseEnd(s, a)) {
      /* 이벤트에서 처리 */
    } else if (a.deposit && s.year >= (a.depositEnd ?? s.year)) {
      if (chance(s, 0.55)) {
        const nd = Math.round((a.value * (0.5 + next(s) * 0.15)) / 100) * 100;
        const diff = nd - a.deposit;
        o.cash += diff;
        a.deposit = nd;
        a.depositEnd = s.year + JEONSE_TERM;
        if (me) msgs.push(diff >= 0 ? `🔑 ${a.name}: 전세 재계약, 보증금 ${formatMoney(diff)} 올려 받았다` : `😰 ${a.name}: 역전세! 보증금 ${formatMoney(-diff)}을 돌려줘야 했다`);
      } else {
        o.cash -= a.deposit;
        if (me) msgs.push(`📦 ${a.name}: 세입자가 이사 간다. 보증금 ${formatMoney(a.deposit)} 반환 → 이제 월세를 놓는다`);
        a.deposit = undefined;
        a.depositEnd = undefined;
      }
    }
    // 재건축·개발 호재: 오래 기다리다 한 방에 터지거나 무산된다
    for (const [tag, up, down, pUp, pDown] of [
      ['재건축 기대', 1.35, 0.88, 0.05, 0.02],
      ['개발 호재', 1.8, 0.6, 0.05, 0.05],
    ] as const) {
      if (!a.tags?.includes(tag)) continue;
      const r = next(s);
      if (r < pUp) {
        a.value = Math.round(a.value * up);
        a.tags = a.tags.filter((x) => x !== tag);
        if (me) msgs.push(`🎉 ${a.name}: ${tag === '재건축 기대' ? '재건축 확정! 조합 설립 인가가 났다' : '개발 계획이 확정됐다! 땅값이 뛰었다'} (${formatMoney(a.value)})`);
      } else if (r < pUp + pDown) {
        a.value = Math.round(a.value * down);
        a.tags = a.tags.filter((x) => x !== tag);
        if (me) msgs.push(`💨 ${a.name}: ${tag === '재건축 기대' ? '재건축 추진이 무산됐다' : '개발 계획이 백지화됐다'} (${formatMoney(a.value)})`);
      }
    }
  }
  tenantYear(s, s.assets.filter((a) => isRealty(a) && (rentable(s, a) || !!a.deposit)));
  // 종합부동산세 (가구별 한 번)
  const done = new Set<string>();
  for (const p of Object.values(s.people)) {
    if (!alive(p) || done.has(p.id)) continue;
    for (const x of household(s, p)) done.add(x.id);
    const t = comprehensiveTax(s, p);
    if (!t) continue;
    p.cash -= t;
    if (mine.has(p.id)) {
      sum.tax += t;
      msgs.push(`🧾 종합부동산세 ${formatMoney(t)} (주택 ${homesOf(s, p).length}채)`);
    }
  }
  const parts = [sum.rent && `월세 +${formatMoney(sum.rent)}`, sum.div && `배당 +${formatMoney(sum.div)}`, sum.tax && `재산세 등 −${formatMoney(sum.tax)}`, sum.interest && `대출이자 −${formatMoney(sum.interest)}`].filter(Boolean);
  if (parts.length) msgs.unshift(`🏠 ${parts.join(' · ')}`);
  return msgs;
}

/** 내년 가계부용: 지갑 주인들의 부동산·주식 수입과 비용 (운 없이 평균) */
export function realtyForecast(s: GameState, owners: Person[]): { income: [string, number][]; expense: [string, number][] } {
  const ids = new Set(owners.map((p) => p.id));
  let rent = 0;
  let div = 0;
  let tax = 0;
  let interest = 0;
  for (const a of s.assets) {
    if (!ids.has(a.ownerId)) continue;
    if (a.kind === 'stock') div += a.value * 0.018;
    if (!isRealty(a)) continue;
    if (rentable(s, a)) rent += a.value * yieldOf(a) * (1 - vacancyOf(a)) * 0.85;
    tax += a.value * propertyTaxRate(s, a);
    interest += (a.loan ?? 0) * LOAN_RATE;
  }
  if (owners[0]) tax += comprehensiveTax(s, owners[0]);
  const inc: [string, number][] = [];
  const exp: [string, number][] = [];
  if (rent >= 1) inc.push(['월세 (공실 감안, 세후)', Math.round(rent)]);
  if (div >= 1) inc.push(['주식 배당', Math.round(div)]);
  if (tax >= 1) exp.push(['재산세·종부세', Math.round(tax)]);
  if (interest >= 1) exp.push(['주택담보대출 이자', Math.round(interest)]);
  return { income: inc, expense: exp };
}

// ───────────────────────── 매물 ─────────────────────────

const APT = ['래미안', '자이', '힐스테이트', '푸르지오', '아이파크', 'e편한세상', '롯데캐슬', '더샵', '센트레빌', '포레나', '스위첸', '하늘채', '주공', '현대', '한신'];

interface Tpl {
  kind: Listing['kind'];
  area: string;
  py?: number;
  m: [number, number];
  y: [number, number];
  tags?: [string, number][];
  drift?: number;
  beta?: number;
  vol?: number;
  house?: boolean;
  noApt?: boolean;
  w?: number;
}

const TPL: Tpl[] = [
  // 서울·수도권 (시세 기준: 강남 34평)
  { kind: 'apt_seoul', area: '강남구 대치동', py: 34, m: [0.95, 1.15], y: [0.018, 0.022], tags: [['학군지', 1], ['재건축 기대', 0.3]], drift: 0.004, beta: 1.1 },
  { kind: 'apt_seoul', area: '서초구 반포동', py: 25, m: [0.85, 1.05], y: [0.018, 0.022], beta: 1.1 },
  { kind: 'apt_seoul', area: '송파구 잠실동', py: 33, m: [0.8, 0.95], y: [0.02, 0.024], tags: [['역세권', 0.6]] },
  { kind: 'apt_seoul', area: '용산구 한남동', py: 45, m: [1.4, 1.9], y: [0.015, 0.02], beta: 1.25, vol: 0.03 },
  { kind: 'apt_seoul', area: '마포구 아현동', py: 34, m: [0.55, 0.68], y: [0.022, 0.026], tags: [['역세권', 0.6]] },
  { kind: 'apt_seoul', area: '성동구 성수동', py: 25, m: [0.55, 0.72], y: [0.022, 0.026], drift: 0.006 },
  { kind: 'apt_seoul', area: '양천구 목동', py: 27, m: [0.6, 0.72], y: [0.022, 0.026], tags: [['학군지', 1], ['재건축 기대', 0.5]] },
  { kind: 'apt_seoul', area: '노원구 상계동', py: 24, m: [0.25, 0.33], y: [0.028, 0.032], tags: [['구축', 1], ['재건축 기대', 0.5]], beta: 0.9 },
  { kind: 'apt_seoul', area: '강서구 마곡동', py: 34, m: [0.45, 0.55], y: [0.025, 0.028], tags: [['역세권', 0.5]] },
  { kind: 'apt_seoul', area: '경기 분당 정자동', py: 32, m: [0.5, 0.62], y: [0.025, 0.028], tags: [['재건축 기대', 0.3]] },
  { kind: 'apt_seoul', area: '경기 과천', py: 34, m: [0.6, 0.72], y: [0.022, 0.026] },
  { kind: 'apt_seoul', area: '경기 화성 동탄2', py: 34, m: [0.22, 0.3], y: [0.03, 0.034], tags: [['신축', 0.7]], vol: 0.03 },
  { kind: 'apt_seoul', area: '인천 송도', py: 34, m: [0.25, 0.33], y: [0.03, 0.034], tags: [['신축', 0.5]], vol: 0.03 },
  { kind: 'apt_seoul', area: '경기 고양 일산', py: 32, m: [0.2, 0.27], y: [0.032, 0.036], tags: [['구축', 0.7]], drift: -0.004 },
  // 지방 (시세 기준: 지방 보통 아파트)
  { kind: 'apt_local', area: '부산 해운대구', py: 34, m: [1.8, 2.6], y: [0.03, 0.035], tags: [['바다 조망', 0.4]] },
  { kind: 'apt_local', area: '부산 동래구', py: 32, m: [1.1, 1.5], y: [0.034, 0.04] },
  { kind: 'apt_local', area: '대구 수성구', py: 34, m: [1.6, 2.2], y: [0.032, 0.036], tags: [['학군지', 1]] },
  { kind: 'apt_local', area: '대전 둔산동', py: 32, m: [1.1, 1.5], y: [0.035, 0.04] },
  { kind: 'apt_local', area: '광주 봉선동', py: 33, m: [1.0, 1.3], y: [0.036, 0.042] },
  { kind: 'apt_local', area: '세종 새롬동', py: 34, m: [1.4, 1.9], y: [0.025, 0.03], vol: 0.05, beta: 1.3 },
  { kind: 'apt_local', area: '울산 남구', py: 32, m: [1.0, 1.3], y: [0.038, 0.044] },
  { kind: 'apt_local', area: '천안 불당동', py: 34, m: [1.0, 1.3], y: [0.038, 0.044], tags: [['신축', 0.5]] },
  { kind: 'apt_local', area: '청주 복대동', py: 30, m: [0.8, 1.0], y: [0.04, 0.046] },
  { kind: 'apt_local', area: '창원 성산구', py: 32, m: [0.9, 1.2], y: [0.038, 0.044] },
  { kind: 'apt_local', area: '원주 무실동', py: 25, m: [0.6, 0.8], y: [0.042, 0.048] },
  { kind: 'apt_local', area: '전주 효자동', py: 32, m: [0.7, 0.9], y: [0.042, 0.048] },
  { kind: 'apt_local', area: '포항 북구', py: 24, m: [0.4, 0.55], y: [0.05, 0.056], tags: [['구축', 1]], drift: -0.01 },
  { kind: 'apt_local', area: '전북 익산', py: 24, m: [0.3, 0.4], y: [0.052, 0.06], tags: [['구축', 1]], drift: -0.012 },
  // 건물·상가
  { kind: 'building', area: '홍대 꼬마빌딩 (5층)', m: [0.8, 1.2], y: [0.03, 0.037], noApt: true, tags: [['역세권', 0.5]] },
  { kind: 'building', area: '성수동 리모델링 빌딩', m: [1.0, 1.5], y: [0.025, 0.03], noApt: true, drift: 0.008 },
  { kind: 'building', area: '강남역 이면도로 빌딩', m: [2.0, 3.0], y: [0.028, 0.033], noApt: true, w: 0.6 },
  { kind: 'building', area: '신도시 근린상가 1층 점포', m: [0.03, 0.06], y: [0.045, 0.06], noApt: true, tags: [['상가', 1]], w: 1.5 },
  { kind: 'building', area: '역세권 오피스텔 1실', m: [0.06, 0.09], y: [0.045, 0.055], noApt: true, house: true, tags: [['주택', 1], ['역세권', 1]], w: 1.5 },
  { kind: 'building', area: '지방 중심가 상가 건물', m: [0.15, 0.3], y: [0.05, 0.065], noApt: true, tags: [['상가', 1]], drift: -0.005 },
  { kind: 'building', area: '대학가 원룸 건물 (다가구)', m: [0.3, 0.5], y: [0.045, 0.055], noApt: true, house: true, tags: [['주택', 1]] },
  // 땅
  { kind: 'land', area: '경기 외곽 농지 300평', m: [0.5, 1.0], y: [0, 0.004], noApt: true },
  { kind: 'land', area: '제주 감귤밭 500평', m: [1.0, 1.8], y: [0.004, 0.008], noApt: true, vol: 0.05 },
  { kind: 'land', area: '강원 임야 3,000평', m: [0.15, 0.35], y: [0, 0], noApt: true, drift: -0.005 },
  { kind: 'land', area: '신도시 예정지 인근 대지 100평', m: [1.5, 3.0], y: [0, 0], noApt: true, tags: [['개발 호재', 1]], vol: 0.08 },
  { kind: 'land', area: '고속도로 IC 인근 잡종지', m: [0.8, 1.6], y: [0.005, 0.01], noApt: true, vol: 0.06 },
  { kind: 'land', area: '바닷가 캠핑장 부지', m: [0.8, 1.4], y: [0.01, 0.02], noApt: true },
];

const rng = (s: GameState, [a, b]: [number, number]) => a + next(s) * (b - a);
const round = (v: number) => (v >= 100000 ? Math.round(v / 1000) * 1000 : Math.round(v / 100) * 100);

function makeListing(s: GameState, t: Tpl, deal?: 'bargain' | 'prime'): Listing {
  const tags = (t.tags ?? []).filter(([, p]) => chance(s, p)).map(([x]) => x);
  let m = rng(s, t.m);
  let drift = t.drift ?? 0;
  let y = rng(s, t.y);
  if (tags.includes('신축')) (m *= 1.08), (drift += 0.003);
  if (tags.includes('구축')) (y += 0.004), (drift -= 0.002);
  if (tags.includes('역세권')) (m *= 1.06), (drift += 0.003), (y += 0.002);
  if (tags.includes('학군지')) drift += 0.004;
  if (tags.includes('재건축 기대')) y -= 0.004;
  const r = next(s);
  if (deal === 'prime') {
    // 발품으로 찾은 알짜: 값은 시세 그대로지만 입지가 좋아 꾸준히 오른다
    const extra = pick(s, [['역세권', 0.004], ['학군지', 0.004], ['재건축 확정', 0.008], ['GTX 개통 예정', 0.007], ['대단지 신축', 0.005]] as [string, number][]);
    if (!tags.includes(extra[0])) tags.push(extra[0]);
    drift += extra[1];
    m *= 0.97 + next(s) * 0.06;
    tags.push('알짜');
  } else if (deal === 'bargain' || r < 0.18) {
    m *= deal === 'bargain' ? 0.76 + next(s) * 0.1 : 0.86 + next(s) * 0.07;
    tags.push('급매');
  } else if (r > 0.82) {
    m *= 1.05 + next(s) * 0.08;
    tags.push('호가 높음');
  }
  const price = round(s.market[t.kind] * m);
  const house = t.house ?? (HOUSE_KINDS as readonly string[]).includes(t.kind);
  const name = t.noApt ? t.area : `${t.area} ${pick(s, APT)} ${t.py}평`;
  const l: Listing = { id: 'l' + s.idSeq++, kind: t.kind, name, price, tags, beta: t.beta ?? 1, drift, vol: t.vol ?? (t.kind === 'land' ? 0.04 : 0.02), yield: Math.max(0, y), house };
  if (house && !t.noApt && deal !== 'bargain' && chance(s, 0.3)) {
    l.deposit = round(price * (0.5 + next(s) * 0.22));
    l.tags.push('전세 낀 매물');
  }
  return l;
}

function pickTpl(s: GameState, pool: Tpl[]): Tpl {
  const tot = pool.reduce((t, x) => t + (x.w ?? 1), 0);
  let r = next(s) * tot;
  for (const x of pool) if ((r -= x.w ?? 1) <= 0) return x;
  return pool[0];
}

/** 올해 매물 새로 깔기: 서울·수도권 2~3, 지방 1~2, 건물·상가 1~2, 땅 1 */
export function rollListings(s: GameState) {
  const by = (k: string) => TPL.filter((t) => t.kind === k);
  const out: Listing[] = [];
  const n = { apt_seoul: int(s, 2, 3), apt_local: int(s, 1, 2), building: int(s, 1, 2), land: 1 };
  for (const [k, c] of Object.entries(n)) {
    const pool = [...by(k)];
    for (let i = 0; i < c && pool.length; i++) {
      const t = pickTpl(s, pool);
      pool.splice(pool.indexOf(t), 1);
      out.push(makeListing(s, t));
    }
  }
  s.listings = out;
}

/** 발품(임장)으로 찾은 급매·알짜 매물 */
export function addBargains(s: GameState, n = 2, prime = 0): Listing[] {
  const found: Listing[] = [];
  const pool = TPL.filter((x) => x.kind !== 'land' || chance(s, 0.3));
  for (let i = 0; i < n + prime; i++) {
    const l = makeListing(s, pickTpl(s, pool), i < n ? 'bargain' : 'prime');
    l.found = true;
    found.push(l);
  }
  (s.listings ??= []).unshift(...found);
  return found;
}

// ───────────────────────── 사고팔기 ─────────────────────────

export function buyListing(s: GameState, id: string): string {
  const me = head(s);
  const l = s.listings?.find((x) => x.id === id);
  if (!l) return '이미 팔린 매물이다';
  const q = buyQuote(s, me, l);
  if (q.cash < q.need) return `현금이 ${formatMoney(q.need - q.cash)} 모자란다 (대출 한도 ${formatMoney(q.limit)})`;
  pay(s, me, q.total - q.loan);
  const a = addAsset(s, l.kind, me.id, l.price, l.name);
  Object.assign(a, { cost: l.price, bought: s.year, beta: l.beta, drift: l.drift, vol: l.vol, yield: l.yield, tags: l.tags.filter((t) => !['급매', '호가 높음', '전세 낀 매물'].includes(t)) });
  if (q.loan) a.loan = q.loan;
  if (l.deposit) (a.deposit = l.deposit), (a.depositEnd = s.year + int(s, 1, JEONSE_TERM));
  s.listings = s.listings!.filter((x) => x.id !== id);
  return `${l.name} 매수!` + (q.loan ? ` 대출 ${formatMoney(q.loan)}` : '') + (l.deposit ? ` · 세입자 보증금 ${formatMoney(l.deposit)} 승계` : '') + ` · 취득세 ${formatMoney(q.tax)}`;
}

/** 부동산 매도: 대출·보증금 갚고 양도세·중개보수 떼고 남는 돈 */
export function sellRealty(s: GameState, a: Asset): { got: number; tax: number; note: string } {
  const o = s.people[a.ownerId];
  const g = gainsTax(s, a);
  const got = Math.round(a.value * (1 - BROKER) - liab(a) - g.tax);
  if (o) o.cash += got;
  s.assets = s.assets.filter((x) => x.id !== a.id);
  return { got, tax: g.tax, note: g.note };
}

/** 대출 일부 상환 */
export function repayLoan(s: GameState, a: Asset, amount: number): string {
  const o = s.people[a.ownerId];
  if (!o || !a.loan) return '';
  const pay = Math.min(amount, a.loan, Math.max(0, o.cash));
  if (pay <= 0) return '현금이 없다';
  o.cash -= pay;
  a.loan -= pay;
  if (a.loan <= 0) a.loan = undefined;
  return `${a.name} 대출 ${formatMoney(pay)} 상환` + (a.loan ? ` (남은 대출 ${formatMoney(a.loan)})` : ' — 대출 끝!');
}

/** 집을 담보로 진 빚(마이너스 현금)을 그 집의 주택담보대출로 옮긴다 (시세의 70%까지) */
export function mortgageFromCash(s: GameState, p: Person) {
  if (p.cash >= 0) return;
  for (const a of s.assets.filter((x) => x.ownerId === p.id && isRealty(x)).sort((x, y) => y.value - x.value)) {
    const room = Math.max(0, Math.round(a.value * 0.7) - (a.loan ?? 0));
    const move = Math.min(room, -p.cash);
    if (move <= 0) continue;
    a.loan = (a.loan ?? 0) + move;
    p.cash += move;
    if (p.cash >= 0) break;
  }
}

export const ownerLabel = (s: GameState, a: Asset) => (s.people[a.ownerId] ? fullName(s.people[a.ownerId]) : '');
