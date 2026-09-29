// 세대 미션: 가주가 바뀔 때마다 이번 세대의 목표 3개가 주어진다. 달성하면 보상, 못 하면 기록만 남는다.
import { chance, pick } from './rng';
import { unlock } from './achievements';
import { totalWorth } from './economy';
import { alive, childrenOf, hasFlag, head, isDescendantOf, isMainline } from './people';
import type { GameState, Mission, Person } from './types';

interface MissionDef {
  name: string;
  desc: string;
  fame: number;
  cash?: number;
  /** 시작 시점 기준값 */
  base?: (s: GameState) => number;
  eligible?: (s: GameState) => boolean;
  check: (s: GameState, m: Mission) => boolean;
}

const desc = (s: GameState) => Object.values(s.people).filter((p) => alive(p) && isDescendantOf(s, p, head(s)));
const members = (s: GameState) => Object.values(s.people).filter((p) => alive(p) && isMainline(s, p));
const worth = (s: GameState) => totalWorth(s, members(s));
const PRO = ['doctor', 'dentist', 'kmd', 'vet', 'pharmacist', 'lawyer', 'judge', 'prosecutor', 'accountant', 'patent_attorney', 'professor'];
const PUBLIC = ['civil', 'tax_officer', 'police', 'coast_guard', 'firefighter', 'prison_guard', 'mail_carrier', 'teacher', 'officer', 'diplomat'];
const has = (p: Person, fs: string[]) => fs.some((f) => hasFlag(p, f));

export const MISSIONS: Record<string, MissionDef> = {
  kids2: { name: '다둥이', desc: '가주가 자녀 2명 이상 두기', fame: 8, check: (s) => childrenOf(s, head(s)).filter(alive).length >= 2 },
  top_univ: {
    name: '명문대 보내기',
    desc: '자손 중 한 명을 명문대·의약학 계열에 입학시키기',
    fame: 10,
    check: (s) => desc(s).some((p) => has(p, ['univ_top', 'med_school', 'dent_school', 'kmd_school', 'pharm_school', 'vet_school'])),
  },
  pro_job: { name: '사(士)자 직업', desc: '자손 중 전문직(의사·변호사·판검사·회계사 등) 배출', fame: 15, check: (s) => desc(s).some((p) => PRO.includes(p.job)) },
  public_job: { name: '철밥통', desc: '자손 중 공무원·교사·경찰·소방관 배출', fame: 8, cash: 3000, check: (s) => desc(s).some((p) => PUBLIC.includes(p.job)) },
  double: { name: '재산 두 배', desc: '가문 총자산을 이번 세대 시작의 2배로', fame: 12, base: (s) => Math.max(10000, worth(s)), check: (s, m) => worth(s) >= (m.base ?? 0) * 2 },
  gangnam: { name: '강남 입성', desc: '가주 명의로 강남 아파트 보유', fame: 10, check: (s) => s.assets.some((a) => a.kind === 'apt_seoul' && a.ownerId === s.headId) },
  building: { name: '건물주의 꿈', desc: '가족 명의로 상가 건물 보유', fame: 12, check: (s) => s.assets.some((a) => a.kind === 'building' && (a.ownerId === 'family' || members(s).some((p) => p.id === a.ownerId))) },
  grandchild: { name: '손주 보기', desc: '가주가 손주를 보기', fame: 10, check: (s) => desc(s).some((p) => !childrenOf(s, head(s)).includes(p)) },
  fame50: { name: '이름을 떨치다', desc: '가문 명성 +50', fame: 0, cash: 10000, base: (s) => s.fame, check: (s, m) => s.fame >= (m.base ?? 0) + 50 },
  art: { name: '안목', desc: '진품 예술품 1점 이상 소장', fame: 5, check: (s) => s.assets.some((a) => a.kind === 'art' && !a.fake && (a.ownerId === 'family' || members(s).some((p) => p.id === a.ownerId))) },
  gift: {
    name: '미리미리 증여',
    desc: '가주가 자손에게 합계 1억 이상 증여',
    fame: 5,
    base: (s) => s.year,
    check: (s, m) => s.gifts.filter((g) => g.fromId === s.headId && g.year >= (m.base ?? 0)).reduce((t, g) => t + g.amount, 0) >= 10000,
  },
  served: {
    name: '병역 이행',
    desc: '아들이 병역을 마치기',
    fame: 8,
    eligible: (s) => childrenOf(s, head(s)).some((c) => c.sex === 'M') || head(s).sex === 'M',
    check: (s) => [head(s), ...childrenOf(s, head(s))].some((c) => c.sex === 'M' && hasFlag(c, 'served')),
  },
  exam: {
    name: '합격 소식',
    desc: '가족 중 누군가 시험에 합격',
    fame: 5,
    base: (s) => members(s).reduce((t, p) => t + p.flags.filter((f) => f.startsWith('passed:')).length, 0),
    check: (s, m) => members(s).reduce((t, p) => t + p.flags.filter((f) => f.startsWith('passed:')).length, 0) > (m.base ?? 0),
  },
  star: { name: '스타 탄생', desc: '자손 중 유튜버·연예인·작가 등으로 크게 성공 (3단계)', fame: 15, check: (s) => desc(s).some((p) => ['youtuber', 'entertainer', 'actor', 'writer', 'novelist', 'musician', 'model', 'tutor', 'gamer'].includes(p.job) && p.jobLevel >= 3) },
  married_kid: { name: '혼주가 되다', desc: '자녀를 결혼시키기', fame: 5, check: (s) => childrenOf(s, head(s)).some((c) => !!c.spouseId) },
  promotion: { name: '임원 승진', desc: '가족 중 누군가 직급 5단계 이상 도달', fame: 8, check: (s) => members(s).some((p) => p.jobLevel >= 5) },
  debt_free: { name: '빚 없는 집', desc: '가주 50세 이후 직계 모두 빚 0', fame: 6, check: (s) => s.year - head(s).birthYear >= 50 && members(s).every((p) => p.cash >= 0) },
};

/** 이번 세대 미션 3개 부여 */
export function initMissions(s: GameState) {
  s.missions ??= [];
  const recent = new Set(s.missions.filter((m) => m.gen >= s.generation - 1).map((m) => m.id));
  const pool = Object.keys(MISSIONS).filter((id) => !recent.has(id) && (MISSIONS[id].eligible?.(s) ?? true));
  for (let i = 0; i < 3 && pool.length; i++) {
    const id = pick(s, pool);
    pool.splice(pool.indexOf(id), 1);
    if (MISSIONS[id].check(s, { id, gen: s.generation, state: 'open', base: MISSIONS[id].base?.(s) }) && chance(s, 0.8)) {
      i--;
      continue; // 이미 달성된 건 되도록 피한다
    }
    s.missions.push({ id, gen: s.generation, state: 'open', base: MISSIONS[id].base?.(s) });
  }
}

export function checkMissions(s: GameState) {
  for (const m of s.missions ?? []) {
    if (m.state !== 'open' || m.gen !== s.generation) continue;
    const d = MISSIONS[m.id];
    if (!d || !d.check(s, m)) continue;
    m.state = 'done';
    s.fame += d.fame;
    if (d.cash) s.familyCash += d.cash;
    s.log.push({ year: s.year, text: `🎯 세대 미션 달성: ${d.name}` + (d.fame ? ` (명성 +${d.fame})` : '') + (d.cash ? ` (가문 금고 +${d.cash >= 10000 ? d.cash / 10000 + '억' : d.cash + '만'})` : ''), kind: 'achv' });
  }
  const done = (s.missions ?? []).filter((m) => m.state === 'done').length;
  if (done >= 10) unlock(s, 'mission10');
}

/** 승계 시: 못 이룬 미션은 실패로 남기고 새 세대 미션 */
export function rollMissions(s: GameState) {
  for (const m of s.missions ?? []) if (m.state === 'open') m.state = 'failed';
  initMissions(s);
}
