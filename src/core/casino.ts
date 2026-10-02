// 카지노: 내국인이 들어갈 수 있는 곳은 강원랜드 하나 (2000년 개장, 폐광지역 개발 지원에 관한 특별법 1995).
// 테이블 게임의 하우스 엣지는 보통 1~5%라 오래 하면 결국 진다 — 다만 이 게임에선 "다닐수록 감이 붙는다"는 착각을
// 조금은 진짜로 만들어 둔다: 갈 때마다 딸 확률이 3.5%p씩 오른다 (첫 판 36% → 여덟 번째 판쯤 60%에서 멈춤).
// 20~40세에 세 번 따면 VIP 룸 매니저가 눈여겨본다 → 슈퍼 히든 [비밀 카지노의 딜러] 1단계.
import { chance } from './rng';
import { addFlag, age, alive, clamp, fullName, hasTrait, head, isMainline, mark, markOf } from './people';
import { formatMoney } from './economy';
import { wageIndex } from './pay';
import type { ActionDef } from './actions';
import type { GameState, Person } from './types';

const num = (p: Person, key: string) => Number(p.flags.find((f) => f.startsWith(key + ':'))?.slice(key.length + 1) ?? 0);
function setNum(p: Person, key: string, v: number) {
  p.flags = p.flags.filter((f) => !f.startsWith(key + ':'));
  p.flags.push(`${key}:${v}`);
}
export const casinoVisits = (p: Person) => num(p, 'casino_v');
export const casinoWins = (p: Person) => num(p, 'casino_w');
/** 이번에 딸 확률: 다닐수록 조금씩 오른다 · 머리가 좋으면 약간 더 */
export const casinoOdds = (p: Person) => clamp(0.36 + 0.035 * Math.min(7, casinoVisits(p)) + (p.actual.int - 50) / 600, 0.25, 0.65);
export const CASINO_OPEN = 2000;
/** 한 번 들고 가는 돈 (2025년 돈 200만 원, 물가 반영) */
export const casinoBet = (s: GameState) => Math.round(200 * Math.max(0.3, wageIndex(s.year)));

/** 딜러 루트가 열릴 수 있나: 20~40세 · 아직 히든 아님 · 최근 10년 안에 거절하지 않음 */
function dealerReady(s: GameState, p: Person): boolean {
  const a = age(s, p);
  if (a < 20 || a > 40 || p.job.startsWith('hj_')) return false;
  if (p.flags.some((f) => f.startsWith('sh:hj_underground_dealer'))) return false;
  const last = s.storySeen?.['casino_refused:' + p.id];
  return !(last != null && s.year - Number(last) < 10);
}

/** 한 번 다녀온다: 결과 글. 세 번째 승리면 VIP 룸의 초대 */
export function casinoVisit(s: GameState, p: Person, bet: number): string {
  const odds = casinoOdds(p);
  setNum(p, 'casino_v', casinoVisits(p) + 1);
  mark(p, 'risk', 1);
  const pct = Math.round(odds * 100);
  let out: string;
  if (chance(s, odds)) {
    setNum(p, 'casino_w', casinoWins(p) + 1);
    p.cash += bet * 2;
    p.happiness = clamp(p.happiness + 6, 0, 100);
    out = `🎰 ${fullName(p)}: 블랙잭 테이블에서 땄다! ${formatMoney(bet)} → ${formatMoney(bet * 2)} (승률 ${pct}% · 지금까지 ${casinoWins(p)}승 ${casinoVisits(p) - casinoWins(p)}패)`;
  } else {
    p.happiness = clamp(p.happiness - 4, 0, 100);
    out = `🎰 ${fullName(p)}: 칩이 전부 딜러 쪽으로 넘어갔다. (승률 ${pct}% · 지금까지 ${casinoWins(p)}승 ${casinoVisits(p) - casinoWins(p)}패)`;
  }
  if (casinoVisits(p) >= 6 && markOf(p, 'risk') >= 6 && !p.flags.includes('casino_addict')) {
    addFlag(p, 'casino_addict');
    out += '\n⚠ 주말마다 정선 가는 버스를 탄다. 가족들이 걱정하기 시작했다. (한국도박문제예방치유원 1336)';
  }
  if (casinoWins(p) >= 3 && dealerReady(s, p) && !s.events.some((e) => e.defId === 'sh_step1' && e.personId === p.id)) {
    s.events.push({ uid: s.eventSeq++, defId: 'sh_step1', personId: p.id, data: { id: 'hj_underground_dealer' } });
    out += '\n🂡 테이블 뒤에서 누군가 {n}을(를) 오래 지켜보고 있었다…'.replace('{n}', fullName(p));
  }
  return out;
}

export const CASINO_ACTION: ActionDef = {
  id: 'casino',
  cat: '재산',
  icon: '🎰',
  name: '카지노 (강원랜드)',
  desc: '판돈 200만 원(물가 반영) · 다닐수록 딸 확률이 조금씩 오른다 · 도박 흔적↑',
  ap: 1,
  show: (s) => s.year >= CASINO_OPEN,
  blocked: (s) => (age(s, head(s)) < 20 ? '만 19세 이상만 들어갈 수 있다' : head(s).cash < casinoBet(s) ? '판돈이 없다' : undefined),
  label: (s) => {
    const p = head(s);
    return { name: '카지노 (강원랜드)', desc: `판돈 ${formatMoney(casinoBet(s))} · 이번 승률 약 ${Math.round(casinoOdds(p) * 100)}% · ${casinoWins(p)}승 ${casinoVisits(p) - casinoWins(p)}패 · 도박 흔적↑` };
  },
  run: (s) => {
    const p = head(s);
    const bet = casinoBet(s);
    p.cash -= bet;
    return casinoVisit(s, p, bet);
  },
};

/** 해마다: 가주 말고도 한탕 기질이 있는 20~40세 가족은 스스로 정선에 간다 */
export function casinoYear(s: GameState): string[] {
  if (s.year < CASINO_OPEN) return [];
  const out: string[] = [];
  for (const p of Object.values(s.people)) {
    if (!alive(p) || p.id === s.headId || !isMainline(s, p)) continue;
    const a = age(s, p);
    if (a < 20 || a > 45 || p.cash < casinoBet(s)) continue;
    const pull = (hasTrait(p, 'gambler') ? 0.25 : 0) + (markOf(p, 'risk') >= 3 ? 0.12 : 0) + (casinoVisits(p) ? 0.1 : 0);
    if (!pull || !chance(s, pull)) continue;
    const bet = casinoBet(s);
    p.cash -= bet;
    out.push(casinoVisit(s, p, bet));
  }
  return out;
}
