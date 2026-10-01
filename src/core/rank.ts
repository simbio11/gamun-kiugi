// 직급이 오를 때의 말: 직업마다 다르다.
//   회사원은 "승진", 군인은 "진급", 판검사는 "보임", 셰프·조종사는 "승격", 기능공은 "승급",
//   유튜버는 "돌파", 배우·가수는 "도약", 사장님은 "성장", 국회의원은 "당선"…
// 직급마다 머물러야 하는 햇수(minYears)도 여기서 정한다: 위로 갈수록 자리가 좁아 오래 버텨야 한다.
import { JOBS } from './data';
import type { Person } from './types';

export interface RankWord {
  /** 오르는 일 (승진·진급·도약…) */
  verb: string;
  icon: string;
  /** 직급을 부르는 말 (직급·계급·연차·위상…) */
  noun: string;
  /** 소식 한 줄: n=이름, t=새 직급 */
  line: (n: string, t: string) => string;
}

const W = (verb: string, icon: string, noun: string, line?: (n: string, t: string) => string): RankWord => ({
  verb,
  icon,
  noun,
  line: line ?? ((n, t) => `${icon} ${n} ${t}(으)로 ${verb}!`),
});

const PROMO = W('승진', '📈', '직급');
const MIL = W('진급', '🎖', '계급');
const UNIFORM = W('승진', '🚨', '계급');
const COURT = W('보임', '⚖', '보직', (n, t) => `⚖ ${n}, ${t}에 보임됐다`);
const ENVOY = W('영전', '🌐', '직위', (n, t) => `🌐 ${n}, ${t}(으)로 영전!`);
const RISE = W('승격', '✨', '등급');
const CRAFT = W('승급', '🔧', '숙련도', (n, t) => `🔧 ${n} ${t}(으)로 승급 — 손끝이 한층 여물었다`);
const SUBS = W('돌파', '📺', '구독자', (n, t) => `📺 ${n}, ${t} 돌파!`);
const STAR = W('도약', '🌟', '위상', (n, t) => `🌟 ${n}, ${t}(으)로 도약!`);
const CROWN = W('등극', '🔥', '몸값', (n, t) => `🔥 ${n}, ${t}(으)로 등극!`);
const SPORT = W('승격', '🏆', '위상', (n, t) => (t.includes('국가대표') ? `🇰🇷 ${n}, ${t} 발탁!` : `🏆 ${n}, ${t}(으)로 승격!`));
const POST = W('부임', '📋', '자리', (n, t) => `📋 ${n}, ${t}(으)로 부임`);
const GROW = W('성장', '🚀', '규모', (n, t) => `🚀 ${n}의 사업이 ${t}(으)로 성장!`);
const FARM = W('성장', '🌾', '규모', (n, t) => `🌾 ${n}의 농장이 ${t}(으)로 성장!`);
const EXPAND = W('확장', '🏥', '규모', (n, t) => `🏥 ${n}, ${t}(으)로 키웠다`);
const ELECT = W('당선', '🗳', '선수', (n, t) => `🗳 ${n}, ${t} 고지에 올랐다!`);
const MAYOR = W('연임', '🗳', '임기', (n, t) => `🗳 ${n}, ${t}(으)로 연임!`);
const PARTNER = W('승격', '💼', '직위', (n, t) => `💼 ${n}, ${t}(으)로 올라섰다`);

/** 직업별로 꼭 집어 정한 말 */
const BY_JOB: Record<string, RankWord> = {
  officer: MIL,
  nco: MIL,
  police: UNIFORM,
  coast_guard: UNIFORM,
  firefighter: W('승진', '🚒', '계급'),
  prison_guard: UNIFORM,
  judge: COURT,
  prosecutor: COURT,
  diplomat: ENVOY,
  politician: ELECT,
  mayor: MAYOR,
  clergy: POST,
  coach: POST,
  teacher: W('승진', '🍎', '직위'),
  professor: W('승진', '🎓', '직위'),
  youtuber: SUBS,
  streamer: SUBS,
  tutor: CROWN,
  star_lecturer: CROWN,
  pilot: W('승격', '✈', '자격'),
  train_driver: W('승격', '🚄', '자격'),
  navigator: W('승선', '⚓', '자격', (n, t) => `⚓ ${n}, ${t}(으)로 승선!`),
  ship_captain: W('승선', '⚓', '자격', (n, t) => `⚓ ${n}, ${t}(으)로 승선!`),
  star_navigator: W('승선', '🚀', '자격', (n, t) => `🚀 ${n}, ${t}(으)로 승선!`),
  taxi: W('전환', '🚕', '면허', (n, t) => `🚕 ${n}, ${t} 면허를 땄다`),
  lawyer: PARTNER,
  accountant: PARTNER,
  consultant: PARTNER,
  dentist: EXPAND,
  kmd: EXPAND,
  vet: EXPAND,
  pharmacist: EXPAND,
  realtor: GROW,
  athlete: SPORT,
  chess_player: SPORT,
  gamer: SPORT,
};
const BY_CAT: Partial<Record<string, RankWord>> = { trade: CRAFT, service: RISE, transport: RISE, farm: FARM, biz: GROW, sport: SPORT, media: PROMO };

/** 이 직업에서 직급이 오를 때 쓰는 말 */
export function rankWord(jobId: string): RankWord {
  const j = JOBS[jobId];
  if (BY_JOB[jobId]) return BY_JOB[jobId];
  if (!j) return PROMO;
  if (j.kind === 'creator') return j.cat === 'edu' ? CROWN : STAR;
  if (j.kind === 'athlete') return SPORT;
  if (j.kind === 'business') return j.cat === 'farm' ? FARM : GROW;
  // 개업·법인 대표로 가는 전문직 (세무사·변리사·법무사 등)
  if (j.cat === 'legal') return PARTNER;
  return BY_CAT[j.cat] ?? PROMO;
}

/** 이 직급(lv)에서 다음으로 오르기까지 최소 햇수: 아래는 빨리, 위로 갈수록 오래 */
export function minYears(lv: number, maxLevel: number): number {
  if (maxLevel <= 2) return 2;
  const frac = lv / maxLevel;
  return frac < 0.34 ? 2 : frac < 0.67 ? 3 : 4;
}

/** 소식 한 줄 */
export const rankLine = (p: Person, name: string, title: string) => rankWord(p.job).line(name, title);

/** 직급 사다리 한 줄: 지나온 자리 ✓ · 지금 자리 ▶ · 남은 자리 */
export function rankLadder(p: Person): string {
  const ts = JOBS[p.job]?.titles;
  if (!ts) return '';
  return ts.map((t, i) => (i < p.jobLevel ? `✓${t}` : i === p.jobLevel ? `▶${t}` : t)).join(' → ');
}
