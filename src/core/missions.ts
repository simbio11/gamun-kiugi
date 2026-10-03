// 세대 미션: 가주가 바뀔 때마다 이번 세대의 목표 3개가 주어진다. 달성하면 보상, 못 하면 기록만 남는다.
import { chance, pick } from './rng';
import { grant } from './rewards';
import { unlock } from './achievements';
import { personWorth, totalWorth } from './economy';
import { JOBS, TALENTS } from './data';
import { homeOf } from './housing';
import { age, alive, childrenOf, hasFlag, head, isDescendantOf, isMainline } from './people';
import type { GameState, Mission, Person, StatKey, TalentId } from './types';

interface MissionDef {
  name: string;
  desc: string;
  fame: number;
  cash?: number;
  /** 시작 시점 기준값 */
  base?: (s: GameState) => number;
  eligible?: (s: GameState) => boolean;
  check: (s: GameState, m: Mission) => boolean;
  /** 1세대(첫 아이) 전용: 그 아이의 재능·적성·난이도에 맞춰 고른다 */
  first?: boolean;
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

// ───────────────────────── 1세대 맞춤 미션 ─────────────────────────
// 첫 가주는 다섯 살에 시작한다. 평생 안에 닿을 수 있는 목표를, 그 아이가 타고난 것에 맞춰 준다.
//   ① 재능 미션: 타고난 재능(아직 몰라도)이 맞는 분야에서 세 번째 직급까지 — 재능이 없으면 적성 미션을 하나 더
//   ② 적성 미션: 잠재력이 가장 높은 능력치에 맞는 목표
//   ③ 난이도 미션: 쉬움은 지키기, 지옥은 일어서기
const H = (s: GameState) => head(s);
const lvOk = (p: Person, n: number) => {
  const j = JOBS[p.job];
  return !!j && (p.jobLevel >= n || (j.maxLevel !== undefined && j.maxLevel <= n && p.jobLevel >= j.maxLevel));
};
const TAL_GOAL: Partial<Record<TalentId, string>> = {
  genius: '연구·공학·법조·의료', athlete: '운동선수', star: '방송·연예', merchant: '장사·사업', artist: '예술·창작', orator: '법조·정치·영업',
  healer: '의료', craft: '기술·공학', linguist: '외교·번역·언론', iron: '운동·운송·기능직', empath: '교육·돌봄', strategist: '금융·사업',
  pitch: '음악', palate: '요리·서비스', justice: '공공·법조', commander: '정치·군·경영', navigator: '운전·항해·비행', greenthumb: '농업',
  beauty: '미용·패션·디자인', scholar: '연구·교육', animal: '수의·축산·반려동물',
};
const TAL_MISSIONS: Record<string, MissionDef> = Object.fromEntries(
  (Object.keys(TALENTS) as TalentId[]).map((tid) => [
    'tal_' + tid,
    {
      name: `타고난 길: ${TALENTS[tid].name}`,
      desc: `가주가 ${TAL_GOAL[tid] ?? '재능이 맞는'} 분야(또는 숨은 직업)에서 세 번째 직급까지 오르기`,
      fame: 12,
      first: true,
      check: (s: GameState) => {
        const p = H(s);
        const j = JOBS[p.job];
        return !!j && (p.job.startsWith('hj_') || (TALENTS[tid].cats ?? []).includes(j.cat)) && lvOk(p, 2);
      },
    } satisfies MissionDef,
  ]),
);
const APT: Record<StatKey, string[]> = { int: ['apt_int', 'apt_int2'], str: ['apt_str', 'apt_str2'], cha: ['apt_cha', 'apt_cha2'], mor: ['apt_mor', 'apt_mor2'], hp: ['apt_hp'] };
const FIRST_MISSIONS: Record<string, MissionDef> = {
  ...TAL_MISSIONS,
  apt_int: { name: '배움으로 일어서다', desc: '가주가 대학에 들어가기', fame: 10, first: true, check: (s) => H(s).flags.some((f) => f.startsWith('school:')) || has(H(s), ['univ_top', 'univ_seoul', 'univ_local', 'college', 'med_school']) },
  apt_str: { name: '몸이 밑천', desc: '가주가 한 직업에서 10년 이상 버티기', fame: 10, first: true, check: (s) => !['none', 'parttime', 'pension'].includes(H(s).job) && (H(s).jobYears ?? 0) >= 10 },
  apt_cha: { name: '사람이 재산', desc: '가주가 결혼하거나, 매력 62 이상 되기', fame: 10, first: true, check: (s) => !!H(s).spouseId || H(s).actual.cha >= 62 },
  apt_mor: { name: '존경받는 어른', desc: '가주가 40세 이후 도덕성 65 이상이거나 훈장 받기', fame: 10, first: true, check: (s) => (age(s, H(s)) >= 40 && H(s).actual.mor >= 65) || (s.honors ?? []).some((h) => h.personId === s.headId) },
  apt_hp: { name: '무병장수의 기틀', desc: '가주가 건강 40 이상으로 60세 맞기 (또는 75세까지 살기)', fame: 10, first: true, check: (s) => age(s, H(s)) >= 75 || (age(s, H(s)) >= 60 && H(s).actual.hp >= 40) },
  apt_int2: { name: '합격 통지서', desc: '가주가 시험·자격증에 합격하기', fame: 10, first: true, check: (s) => H(s).flags.some((f) => f.startsWith('passed:')) || ['exam', 'school'].includes(JOBS[H(s).job]?.entry?.how ?? '') },
  apt_str2: { name: '땀의 보상', desc: '가주가 몸 쓰는 일(운동·기능·운송·농어업)에서 두 번째 직급까지', fame: 10, first: true, check: (s) => ['sport', 'trade', 'transport', 'farm'].includes(JOBS[H(s).job]?.cat ?? '') && lvOk(H(s), 1) },
  apt_cha2: { name: '사람 부자', desc: '가주가 자녀 둘 이상 두기', fame: 10, first: true, check: (s) => childrenOf(s, H(s)).length >= 2 },
  apt_mor2: { name: '나눔의 집', desc: '가주가 남을 돕는 일(돌봄·교육·의료·공공)에서 10년 일하기', fame: 10, first: true, check: (s) => ['edu', 'medical', 'public'].includes(JOBS[H(s).job]?.cat ?? '') && (H(s).jobYears ?? 0) >= 10 },
  // 난이도별
  d_easy: { name: '가문을 지키다', desc: '가주 50세까지 가문 재산을 줄이지 않기', fame: 10, first: true, base: (s) => worth(s), check: (s, m) => age(s, H(s)) >= 50 && worth(s) >= (m.base ?? 0) },
  d_normal: { name: '내 집 마련', desc: '가주 이름으로 집 한 채', fame: 10, first: true, check: (s) => homeOf(s, H(s))?.type === 'own' || s.assets.some((a) => a.ownerId === s.headId && a.kind.startsWith('apt')) },
  d_hard: { name: '자수성가', desc: '가주 개인 재산 8억 원 넘기기', fame: 12, first: true, check: (s) => personWorth(s, H(s)) >= 80000 },
  d_hell: { name: '셋방 탈출', desc: '가주가 빚 없이 40세 맞기 (또는 내 집 마련)', fame: 14, first: true, check: (s) => (age(s, H(s)) >= 40 && H(s).cash >= 0) || homeOf(s, H(s))?.type === 'own' },
};
Object.assign(MISSIONS, FIRST_MISSIONS);

/** 잠재력이 가장 높은 능력치 순 */
const aptOrder = (p: Person) => (['int', 'str', 'cha', 'mor', 'hp'] as StatKey[]).sort((a, b) => p.potential[b] - p.potential[a]);

/** 1세대 미션: 재능 + 적성 + 난이도 */
function firstMissions(s: GameState) {
  const p = H(s);
  const ids: string[] = [];
  const tal = p.talents.map((t) => 'tal_' + t.id).filter((id) => MISSIONS[id]);
  if (tal.length) ids.push(pick(s, tal));
  for (const st of aptOrder(p)) {
    if (ids.length >= 2) break;
    ids.push(pick(s, APT[st]));
  }
  ids.push('d_' + (s.difficulty ?? (s.origin === 'rich' ? 'easy' : s.origin === 'poor' ? 'hard' : 'normal')));
  for (const id of ids.slice(0, 3)) s.missions!.push({ id, gen: s.generation, state: 'open', base: MISSIONS[id].base?.(s) });
}

/** 이번 세대 미션 3개 부여 */
export function initMissions(s: GameState) {
  s.missions ??= [];
  if (s.generation === 1 && !s.missions.length) return firstMissions(s);
  const recent = new Set(s.missions.filter((m) => m.gen >= s.generation - 1).map((m) => m.id));
  const pool = Object.keys(MISSIONS).filter((id) => !MISSIONS[id].first && !recent.has(id) && (MISSIONS[id].eligible?.(s) ?? true));
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
    grant(s, '🎯', `세대 미션 달성: ${d.name}`, `${d.desc}${d.fame ? `\n명성 +${d.fame}` : ''}${d.cash ? `\n상금 ${d.cash >= 10000 ? d.cash / 10000 + '억' : d.cash + '만'} 원` : ''}`, 'epic');
  }
  const done = (s.missions ?? []).filter((m) => m.state === 'done').length;
  if (done >= 10) unlock(s, 'mission10');
}

/** 승계 시: 못 이룬 미션은 실패로 남기고 새 세대 미션 */
export function rollMissions(s: GameState) {
  for (const m of s.missions ?? []) if (m.state === 'open') m.state = 'failed';
  initMissions(s);
}
