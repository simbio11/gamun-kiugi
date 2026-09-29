// 탈것: 자동차·요트. 재산이면서 해마다 값이 깎이고 유지비가 나간다. 대신 움직일 여유(행동력)를 준다.
import { addAsset, formatMoney, pay } from './economy';
import { wageIndex } from './pay';
import { age, alive, head, spouseOf } from './people';
import { buyPower } from './leverage';
import type { Asset, GameState, Person } from './types';

export interface VehicleModel {
  id: string;
  name: string;
  icon: string;
  /** 2025년 신차가 (만원) */
  price: number;
  /** 연 유지비: 보험·자동차세·연료·정비 (요트는 계류비·관리) */
  upkeep: number;
  /** 연 감가율 */
  dep: number;
  /** 취득세율: 비영업용 승용차 7%, 경차 4%, 선박 3% (고급선박은 중과) */
  tax: number;
  /** 수명 (년): 넘기면 폐차·폐선 */
  life: number;
  /** 명성 (살 때 한 번) */
  fame: number;
  yacht?: boolean;
  sprite: 'car' | 'sedan' | 'suv' | 'sports' | 'yacht';
  note: string;
}

/** 대략 2025년 국내 신차 시세·유지비 기준 (트림에 따라 폭이 크다) */
export const VEHICLES: VehicleModel[] = [
  { id: 'kei', name: '경차 (캐스퍼·레이급)', icon: '🚙', price: 1700, upkeep: 250, dep: 0.12, tax: 0.04, life: 15, fame: 0, sprite: 'car', note: '유류세 환급·통행료 할인. 주차가 편하다' },
  { id: 'compact', name: '준중형 세단 (아반떼급)', icon: '🚗', price: 2400, upkeep: 380, dep: 0.13, tax: 0.07, life: 15, fame: 0, sprite: 'car', note: '사회초년생 첫 차의 정석' },
  { id: 'mid', name: '중형 세단 (쏘나타·K5급)', icon: '🚗', price: 3200, upkeep: 480, dep: 0.13, tax: 0.07, life: 15, fame: 1, sprite: 'sedan', note: '무난한 가장의 차' },
  { id: 'suv', name: '중형 SUV (쏘렌토·싼타페급)', icon: '🚙', price: 4000, upkeep: 560, dep: 0.12, tax: 0.07, life: 15, fame: 1, sprite: 'suv', note: '아이 있는 집의 캠핑·주말 나들이' },
  { id: 'large', name: '준대형 세단 (그랜저급)', icon: '🚘', price: 4600, upkeep: 620, dep: 0.14, tax: 0.07, life: 15, fame: 2, sprite: 'sedan', note: '"성공하면 타는 차"' },
  { id: 'genesis', name: '제네시스 G80급', icon: '🚘', price: 7000, upkeep: 850, dep: 0.15, tax: 0.07, life: 15, fame: 3, sprite: 'sedan', note: '임원 차량으로 흔하다' },
  { id: 'import', name: '수입 세단 (E클래스·5시리즈급)', icon: '🚘', price: 8500, upkeep: 1200, dep: 0.16, tax: 0.07, life: 15, fame: 4, sprite: 'sedan', note: '수리비·보험료가 국산의 두세 배' },
  { id: 'porsche', name: '스포츠카 (포르쉐 911급)', icon: '🏎', price: 18000, upkeep: 2200, dep: 0.09, tax: 0.07, life: 20, fame: 6, sprite: 'sports', note: '값이 잘 안 떨어진다. 대신 보험료가 무섭다' },
  { id: 'super', name: '슈퍼카 (페라리·람보르기니급)', icon: '🏎', price: 42000, upkeep: 4500, dep: 0.07, tax: 0.07, life: 25, fame: 10, sprite: 'sports', note: '법인 리스로 타는 사람이 대부분' },
  { id: 'sail', name: '세일링 요트 (30피트급)', icon: '⛵', price: 15000, upkeep: 1800, dep: 0.07, tax: 0.03, life: 30, fame: 5, yacht: true, sprite: 'yacht', note: '마리나 계류비 월 100만 안팎 · 조종면허 필요' },
  { id: 'motor', name: '모터 요트 (50피트급)', icon: '🛥', price: 90000, upkeep: 9000, dep: 0.08, tax: 0.1, life: 30, fame: 12, yacht: true, sprite: 'yacht', note: '고급선박 취득세 중과 · 선장·관리인 인건비 포함' },
];

export const modelOf = (a: Asset): VehicleModel | undefined => (a.kind === 'vehicle' ? VEHICLES.find((m) => m.id === a.tags?.[0]) : undefined);

/** 지금 가격 (임금·물가 따라 오른다) */
export const vehiclePrice = (s: GameState, m: VehicleModel) => Math.round(m.price * wageIndex(s.year));

export function vehiclesOf(s: GameState, ids: string[]): Asset[] {
  return s.assets.filter((a) => a.kind === 'vehicle' && ids.includes(a.ownerId));
}

/** 가주 부부의 탈것 */
export function myVehicles(s: GameState): Asset[] {
  const h = head(s);
  const sp = spouseOf(s, h);
  return vehiclesOf(s, [h.id, ...(sp && alive(sp) ? [sp.id] : [])]);
}

/** 탈것이 주는 행동력: 차가 있으면 +1, 요트가 있으면 +1 더 */
export function vehicleAP(s: GameState): number {
  const v = myVehicles(s).map(modelOf);
  return (v.some((m) => m && !m.yacht) ? 1 : 0) + (v.some((m) => m?.yacht) ? 1 : 0);
}

/** 연 유지비 합 (살림에 속한 사람들 것) */
export function vehicleUpkeep(s: GameState, inHouse: Set<string>): { n: number; cost: number } {
  const vs = s.assets.filter((a) => a.kind === 'vehicle' && inHouse.has(a.ownerId));
  const wi = wageIndex(s.year);
  return { n: vs.length, cost: Math.round(vs.reduce((t, a) => t + (modelOf(a)?.upkeep ?? 400) * wi, 0)) };
}

export function canDrive(s: GameState, p: Person = head(s)): boolean {
  return age(s, p) >= 19;
}

export function buyVehicle(s: GameState, id: string): { ok: boolean; text: string } {
  const m = VEHICLES.find((x) => x.id === id);
  const h = head(s);
  if (!m) return { ok: false, text: '' };
  if (!canDrive(s, h)) return { ok: false, text: '면허는 만 18세부터. 아직 못 산다' };
  if (!h.flags.includes('license')) return { ok: false, text: '운전면허가 없다. 행동 탭에서 먼저 면허를 따자 (요트는 조종면허도 필요)' };
  const price = vehiclePrice(s, m);
  const tax = Math.round(price * m.tax) - (m.id === 'kei' ? Math.min(75, Math.round(price * m.tax)) : 0);
  const money = buyPower(s);
  if (money < price + tax) return { ok: false, text: '현금이 부족하다' };
  const before = vehicleAP(s);
  pay(s, h, price + tax);
  const a = addAsset(s, 'vehicle', h.id, price, m.name.replace(/ \(.*\)/, ''));
  a.name = m.name.replace(/ \((.*)급\)/, ' · $1').replace(/ \((.*)\)/, ' · $1');
  a.tags = [m.id];
  s.fame += m.fame;
  const gain = vehicleAP(s) - before;
  if (gain > 0) s.ap = (s.ap ?? 0) + gain;
  return {
    ok: true,
    text:
      `${m.icon} ${m.name}을(를) ${formatMoney(price)}에 샀다 (취득세 ${formatMoney(tax)}).\n` +
      `해마다 유지비 약 ${formatMoney(Math.round(m.upkeep * wageIndex(s.year)))}, 값은 연 ${Math.round(m.dep * 100)}%씩 떨어진다.` +
      (gain > 0 ? `\n${m.yacht ? '주말마다 바다로 나가 머리를 식힌다' : '어디든 금방 간다'} → 행동력 +${gain} (올해부터)` : ''),
  };
}

/** 해마다: 감가, 오래된 차는 폐차 */
export function vehicleYear(s: GameState): string[] {
  const msgs: string[] = [];
  for (const a of [...s.assets]) {
    const m = modelOf(a);
    if (!m) continue;
    a.value = Math.max(0, Math.round(a.value * (1 - m.dep)));
    // 할부: 이자 + 원금 5분의 1씩
    if (a.loan) {
      const o = s.people[a.ownerId];
      const due = Math.min(a.loan, Math.round((a.cost ?? a.value) * 0.8 * 0.2));
      if (o) o.cash -= Math.round(a.loan * CAR_LOAN_RATE) + due;
      a.loan -= due;
      if (a.loan <= 0) a.loan = undefined;
    }
    if (s.year - (a.bought ?? s.year) >= m.life) {
      const scrap = Math.round(Math.max(a.value, m.yacht ? 500 : 40));
      const o = s.people[a.ownerId];
      if (o) o.cash += scrap;
      s.assets = s.assets.filter((x) => x !== a);
      msgs.push(`${m.icon} ${a.name} ${m.yacht ? '폐선' : '폐차'} (${s.year - (a.bought ?? s.year)}년 탔다) · 고철값 ${formatMoney(scrap)}`);
    }
  }
  return msgs;
}

/** 처음부터 있던 차 (몇 년 탄 중고) */
export function giveUsedCar(s: GameState, owner: Person, id: string, yearsOld: number): Asset | undefined {
  const m = VEHICLES.find((x) => x.id === id);
  if (!m) return undefined;
  const a = addAsset(s, 'vehicle', owner.id, vehiclePrice(s, m) * (1 - m.dep) ** yearsOld);
  a.name = m.name.replace(/ \((.*)급\)/, ' · $1').replace(/ \((.*)\)/, ' · $1');
  a.tags = [m.id];
  a.bought = s.year - yearsOld;
  return a;
}

/** 할부 금리 (캐피탈 자동차 할부, 연 6~7%) */
export const CAR_LOAN_RATE = 0.065;

/**
 * 이야기 속에서 차를 산다: 타던 차는 보상 판매, 모자라면 할부(최대 60개월).
 * 통장을 마이너스로 만들지 않는다. 할부도 안 되면 false
 */
/** 이야기 선택지용: 이 차를 (할부 포함) 살 수 있나 */
export function affordCar(s: GameState, p: Person, id: string, installment = false): boolean {
  const m = VEHICLES.find((x) => x.id === id);
  if (!m || age(s, p) < 19) return false;
  const tradeIn = s.assets.filter((a) => a.kind === 'vehicle' && a.ownerId === p.id && !modelOf(a)?.yacht).reduce((t, a) => t + Math.round(a.value * 0.9) - (a.loan ?? 0), 0);
  const price = vehiclePrice(s, m);
  const loan = Math.max(0, price + Math.round(price * m.tax) - Math.max(0, p.cash) - tradeIn);
  return loan === 0 || (installment && loan <= price * 0.8 && p.cash >= 0);
}

export function acquireCar(s: GameState, p: Person, id: string, installment = false): string {
  const m = VEHICLES.find((x) => x.id === id);
  if (!m || age(s, p) < 19) return '';
  const old = s.assets.filter((a) => a.kind === 'vehicle' && a.ownerId === p.id && !modelOf(a)?.yacht);
  const tradeIn = old.reduce((t, a) => t + Math.round(a.value * 0.9) - (a.loan ?? 0), 0);
  const price = vehiclePrice(s, m);
  const tax = Math.round(price * m.tax);
  const cash = Math.max(0, p.cash) + tradeIn;
  const loan = Math.max(0, price + tax - cash);
  if (loan > 0 && (!installment || loan > price * 0.8)) return '';
  s.assets = s.assets.filter((a) => !old.includes(a));
  p.cash += tradeIn - (price + tax - loan);
  // 면허가 없으면 이참에 딴다 (학원비)
  const lic = !p.flags.includes('license');
  if (lic) (p.flags.push('license'), (p.cash -= Math.round(77 * wageIndex(s.year))));
  const a = addAsset(s, 'vehicle', p.id, price);
  a.name = m.name.replace(/ \((.*)급\)/, ' · $1').replace(/ \((.*)\)/, ' · $1');
  a.tags = [m.id];
  if (loan) a.loan = loan;
  return `${lic ? '(면허부터 땄다) ' : ''}${m.icon} ${a.name}${old.length ? ` (타던 차 보상 ${formatMoney(Math.max(0, tradeIn))})` : ''}${loan ? ` · 할부 ${formatMoney(loan)} (연 ${(CAR_LOAN_RATE * 100).toFixed(1)}%, 5년)` : ''}`;
}
