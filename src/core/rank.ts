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

/**
 * 직급마다 다음 자리까지 머물러야 하는 최소 햇수 (현실보다 조금 빠르게).
 * 출처: 공무원임용령 제31조 승진소요최저연수(9→8급 1.5년, 8→7급 2년, 7→6급 2년, 6→5급 3.5년, 5→4급 4년, 4→3급 3년)와
 *   인사혁신처 「공무원 인사통계」의 실제 평균 승진 소요(9급 공채 → 5급 약 25~28년) 사이에서 게임용으로 잡았다.
 *   경찰·소방: 경찰공무원임용령 근속승진(순경→경장 4년, 경장→경사 5년, 경사→경위 6년6개월, 경위→경감 8년).
 *   군: 군인사법 시행령 진급 최저복무기간(소위 1년, 중위 2년, 대위 6년, 소령 5년, 중령 5년, 대령 5년 안팎).
 *   판·검사: 법관 임용 후 부장판사 보임 약 15년, 검사 임관 후 부장검사 약 13~15년 (법원·법무부 인사 관행).
 *   대기업: 사원→대리 4년, 대리→과장 4년, 과장→차장 4년, 차장→부장 4~5년, 부장→임원 5년+ (잡코리아 직급별 체류 연한 조사).
 */
const STEPS: Record<string, number[]> = {
  civil: [3, 3, 5, 7, 5, 5],
  tax_officer: [3, 3, 5, 7, 5, 5],
  court_officer: [3, 3, 5, 7, 5],
  forest_ranger: [5, 7, 6, 5],
  public_corp: [3, 4, 5, 5, 5],
  police: [4, 5, 6, 7, 5, 5],
  coast_guard: [4, 5, 6, 7, 5, 5],
  firefighter: [4, 5, 6, 7, 5],
  prison_guard: [4, 5, 6, 6, 5],
  mail_carrier: [4, 6, 6, 5],
  officer: [1, 2, 6, 5, 5, 5, 3, 3, 3],
  agent: [4, 5, 6, 6, 5],
  nco: [2, 6, 8, 5],
  judge: [11, 4, 5, 5, 5],
  prosecutor: [10, 2, 3, 3, 5],
  diplomat: [3, 4, 5, 4, 4],
  corp: [3, 4, 4, 4, 5, 3, 4],
  office: [2, 2, 3, 4, 4],
  sme_worker: [2, 2, 3, 4, 4],
  banker: [3, 3, 4, 4, 5, 5],
  teacher: [8, 7, 4, 4],
  kinder_teacher: [5, 5, 5],
  daycare_teacher: [4, 5, 5],
  nurse: [5, 6, 6, 4],
  lawyer: [3, 5, 4, 5, 5],
  accountant: [1, 3, 4, 4, 5],
  journalist: [1, 6, 5, 5, 5],
  pd: [3, 5, 5, 5, 4],
  researcher: [4, 5, 5, 5, 5],
  chip_engineer: [4, 4, 5, 5, 5, 4],
  hotelier: [2, 3, 5, 5, 5],
  pilot: [6, 5, 5],
  flight_attendant: [4, 5, 5, 5],
  aide: [2, 3, 4, 4],
  secretary: [3, 4, 4, 4],
};

/** 이 직급(lv)에서 다음으로 오르기까지 최소 햇수: 아래는 빨리, 위로 갈수록 오래 */
export function minYears(lv: number, maxLevel: number, job?: string): number {
  const st = job ? STEPS[job] : undefined;
  if (st && st[lv] !== undefined) return st[lv];
  if (maxLevel <= 2) return 3;
  const frac = lv / maxLevel;
  return frac < 0.2 ? 2 : frac < 0.5 ? 3 : frac < 0.8 ? 4 : 5;
}

/** 임명으로만 오르는 자리: 대법관·대법원장, 검찰총장, 정보기관장 (power.ts 이벤트) */
export const appointedOnly = (job: string, lv: number) => (job === 'judge' && lv >= 3) || (job === 'prosecutor' && lv >= 4) || (job === 'agent' && lv >= 4);

/** 지금 직급에 머문 햇수 (lv:직급:해 플래그, 읽기 전용) */
function yearsAtLevel(year: number, p: Person): number {
  const f = p.flags.find((x) => x.startsWith('lv:'));
  if (!f) return p.jobYears;
  const [, lv, y] = f.split(':');
  return Number(lv) === p.jobLevel ? Math.max(0, year - Number(y)) : 0;
}

/**
 * 승진할 자격이 됐나: 이벤트·행동·기회 등 어디서 올리든 이 문을 지나야 한다.
 * slack = 특채·스카우트처럼 조금 일찍 올라가는 것을 몇 년까지 봐줄지.
 * 맨 꼭대기(3급·장군·대법관·사장…)는 45세 이상.
 */
export function promoReady(year: number, birthYear: number, p: Person, slack = 0): boolean {
  const j = JOBS[p.job];
  if (!j || !j.maxLevel || p.jobLevel >= j.maxLevel) return false;
  if (j.kind === 'business' || j.kind === 'creator' || j.kind === 'athlete') return true;
  if (p.job === 'politician' || p.job === 'mayor' || p.job === 'professor') return false; // 선거·논문으로만
  if (appointedOnly(p.job, p.jobLevel)) return false;
  const toTop = p.jobLevel + 1 === j.maxLevel && j.maxLevel >= 4;
  if (toTop && year - birthYear < 45) return false;
  return yearsAtLevel(year, p) >= Math.max(1, minYears(p.jobLevel, j.maxLevel, p.job) - slack);
}

/** 조건이 되면 한 단계 올린다 (못 올리면 false) */
export function tryPromote(year: number, p: Person, slack = 0): boolean {
  if (!promoReady(year, p.birthYear, p, slack)) return false;
  p.jobLevel++;
  return true;
}

/** 다음 자리 이름 (없으면 undefined) */
export function nextTitle(p: Person): string | undefined {
  const t = JOBS[p.job]?.titles;
  return t?.[p.jobLevel + 1];
}

/** 이직해서 직급을 올리는 게 말이 되는 직업인가 (공무원·군·판검사는 '이직'으로 계급이 오르지 않는다) */
export function canHop(job: string): boolean {
  const j = JOBS[job];
  if (!j || j.kind !== 'salary') return false;
  if (j.cat === 'public') return false;
  return !['teacher', 'nurse', 'kinder_teacher', 'daycare_teacher', 'judge', 'prosecutor', 'officer', 'nco', 'professor', 'doctor', 'librarian', 'aide'].includes(job);
}

/** 소식 한 줄 */
export const rankLine = (p: Person, name: string, title: string) => rankWord(p.job).line(name, title);

/** 직급 사다리 한 줄: 지나온 자리 ✓ · 지금 자리 ▶ · 남은 자리 */
export function rankLadder(p: Person): string {
  const ts = JOBS[p.job]?.titles;
  if (!ts) return '';
  return ts.map((t, i) => (i < p.jobLevel ? `✓${t}` : i === p.jobLevel ? `▶${t}` : t)).join(' → ');
}
