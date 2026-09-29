// 학창 시절 → 수능 → 정시 원서 3장 → 합격 발표 → 등록 or 재수.
// 매년 어떻게 보낼지(학원·과외·인강·동아리·놀기…) 고르면 성적(study)과 사교육비(eduSpent)가 쌓이고,
// 수능 백분위 = 성적·지능·사교육비·컨디션. 대학·학과마다 합격선과 경쟁률이 있고, 학과가 진로를 연다.

import { chance, int, next, normal, pick } from './rng';
import { FEMALE_NAMES, MALE_NAMES, SURNAMES, TALENTS } from './data';
import { formatMoney } from './economy';
import {
  applyDesire,
  gate,
  iga,
  ok,
  schedule,
  setJob,
  setStudy,
  tr,
  who,
  type Choice,
  type Ctx,
  type EventDef,
} from './ev-util';
import { addFlag, age, check, clamp, discoverTalent, hasFlag, hasTalent, hasTrait, mark } from './people';
import type { CareerTag, Focus, GameState, Person } from './types';
import { studyBoost, suneungBonus } from './marks';

// ───────────────────────── 대학·학과 ─────────────────────────

export type Tier = 'S' | 'A' | 'B' | 'C' | 'D' | 'E' | 'X';
export const TIERS: Record<Tier, { name: string; flag: string; tuition: number }> = {
  S: { name: '서울대', flag: 'univ_top', tuition: 600 },
  A: { name: '연고대', flag: 'univ_top', tuition: 950 },
  B: { name: '인서울', flag: 'univ_seoul', tuition: 900 },
  C: { name: '지방 거점국립대', flag: 'univ_local', tuition: 450 },
  D: { name: '지방 사립대', flag: 'univ_local', tuition: 850 },
  E: { name: '전문대', flag: 'college', tuition: 700 },
  X: { name: '특수대학', flag: 'univ_top', tuition: 0 },
};

export interface Program {
  id: string;
  tier: Tier;
  /** 표시용 학교 이름 (없으면 등급 이름) */
  school?: string;
  major: string;
  /** 전공 키: 졸업 후 추천 직업 */
  key: string;
  /** 정시 합격선 (수능 백분위) */
  cut: number;
  years: number;
  /** 특수 트랙 (졸업하면 국가고시·임관 등). 없으면 일반 졸업 → 진로 선택 */
  track?: string;
  tuition?: number;
  /** 예체능 실기: 실기 능력치와 비중 */
  practical?: { stat: 'cha' | 'str'; need: number };
  /** 추가 조건 (사관학교 체력 등) */
  need?: { stat: 'str' | 'hp'; min: number };
  tag: CareerTag;
}

const P: Program[] = [];
function prog(tier: Tier, major: string, key: string, cut: number, o: Partial<Program> = {}) {
  P.push({ id: `${tier}_${key}_${P.length}`, tier, major, key, cut, years: 4, tag: 'study', ...o });
}
// 의약
prog('S', '의예과', 'med', 99.8, { years: 6, track: 'med_school', tuition: 1200 });
prog('C', '의예과 (지방 의대)', 'med', 99.3, { years: 6, track: 'med_school', tuition: 1100 });
prog('A', '치의예과', 'dent', 99.0, { years: 6, track: 'dent_school', tuition: 1300 });
prog('C', '치의예과', 'dent', 98.6, { years: 6, track: 'dent_school', tuition: 1000 });
prog('D', '한의예과', 'kmd', 98.0, { years: 6, track: 'kmd_school', tuition: 1100 });
prog('S', '수의예과', 'vet', 98.2, { years: 6, track: 'vet_school' });
prog('C', '수의예과', 'vet', 96.5, { years: 6, track: 'vet_school' });
prog('A', '약학과', 'pharm', 98.3, { years: 6, track: 'pharm_school', tuition: 1100 });
prog('C', '약학과', 'pharm', 97.0, { years: 6, track: 'pharm_school' });
prog('B', '간호학과', 'nurse', 90, { track: 'nurse_school', tag: 'public' });
prog('D', '간호학과', 'nurse', 72, { track: 'nurse_school', tag: 'public' });
prog('D', '물리치료학과', 'pt', 62, { track: 'health_pt', tag: 'public' });
prog('E', '물리치료과', 'pt', 45, { years: 3, track: 'health_pt', tag: 'public' });
prog('D', '방사선학과', 'radio', 58, { track: 'health_radio', tag: 'public' });
prog('E', '임상병리과', 'clinical', 42, { years: 3, track: 'health_clinical', tag: 'public' });
prog('E', '응급구조과', 'emt', 40, { years: 3, track: 'health_emt', tag: 'public' });
// 교육
prog('X', '초등교육과', 'edu_elem', 91, { school: '교육대학교', track: 'edu_elem', tuition: 350, tag: 'public' });
prog('S', '사범대 (수학교육)', 'edu', 97.5, { track: 'edu_school', tag: 'public' });
prog('B', '사범대 (국어교육)', 'edu', 88, { track: 'edu_school', tag: 'public' });
prog('C', '사범대 (영어교육)', 'edu', 80, { track: 'edu_school', tag: 'public' });
prog('E', '유아교육과', 'kinder', 40, { years: 3, track: 'kinder_edu', tag: 'public' });
// 특수대학
prog('X', '경찰대학', 'police', 97, { school: '경찰대', track: 'police_univ', need: { stat: 'str', min: 35 }, tag: 'public' });
prog('X', '육군사관학교', 'army', 93.5, { school: '사관학교', track: 'academy', need: { stat: 'hp', min: 45 }, tag: 'public' });
prog('X', '항해학부', 'marine', 72, { school: '한국해양대', track: 'maritime', tuition: 400, tag: 'free' });
prog('X', '항공운항학과', 'flight', 91, { school: '항공대', track: 'flight_univ', tuition: 1100, need: { stat: 'hp', min: 45 } });
// 문과
prog('S', '경영학과', 'biz', 98.7, { tag: 'business' });
prog('A', '경영학과', 'biz', 96.5, { tag: 'business' });
prog('B', '경영학과', 'biz', 89, { tag: 'business' });
prog('C', '경영학과', 'biz', 76, { tag: 'business' });
prog('D', '경영학과', 'biz', 50, { tag: 'business' });
prog('S', '경제학부', 'econ', 98.5);
prog('A', '경제학과', 'econ', 96);
prog('C', '경제학과', 'econ', 74);
prog('A', '자유전공 (법학)', 'law', 96.8);
prog('B', '법학과', 'law', 88);
prog('B', '행정학과', 'admin', 86, { tag: 'public' });
prog('C', '행정학과', 'admin', 72, { tag: 'public' });
prog('D', '행정학과', 'admin', 48, { tag: 'public' });
prog('A', '미디어학부', 'media', 96, { tag: 'stage' });
prog('B', '신문방송학과', 'media', 87, { tag: 'stage' });
prog('D', '미디어콘텐츠학과', 'media', 52, { tag: 'stage' });
prog('A', '영어영문학과', 'lang', 95);
prog('B', '중어중문학과', 'lang', 84);
prog('D', '관광영어과', 'lang', 45, { tag: 'free' });
prog('C', '사회복지학과', 'welfare', 62, { tag: 'public' });
prog('D', '사회복지학과', 'welfare', 40, { tag: 'public' });
// 이공
prog('S', '컴퓨터공학부', 'cs', 98.9);
prog('A', '컴퓨터학과', 'cs', 96.5);
prog('B', '소프트웨어학과', 'cs', 89);
prog('C', '컴퓨터공학과', 'cs', 78);
prog('D', '컴퓨터공학과', 'cs', 52);
prog('S', '전기정보공학부', 'ee', 98.6);
prog('A', '반도체공학과 (계약학과)', 'ee', 97.2);
prog('C', '전자공학과', 'ee', 77);
prog('A', '기계공학부', 'mech', 95.5);
prog('B', '기계공학과', 'mech', 86);
prog('C', '기계공학과', 'mech', 74);
prog('D', '기계공학과', 'mech', 48);
prog('A', '건축학과 (5년제)', 'arch', 95, { years: 5, tag: 'stage' });
prog('B', '건축학과 (5년제)', 'arch', 86, { years: 5, tag: 'stage' });
prog('D', '건축학과 (5년제)', 'arch', 50, { years: 5, tag: 'stage' });
prog('S', '생명과학부', 'bio', 98);
prog('C', '생명과학과', 'bio', 73);
prog('C', '농생명과학대학', 'agri', 64, { tag: 'free' });
prog('D', '스마트팜학과', 'agri', 42, { tag: 'business' });
// 전문대
prog('E', '호텔조리과', 'cook', 35, { years: 2, tag: 'free' });
prog('E', '뷰티디자인과', 'beauty', 30, { years: 2, tag: 'stage' });
prog('E', '항공서비스과', 'air', 50, { years: 2, tag: 'free' });
prog('E', '자동차과', 'auto', 25, { years: 2, tag: 'free' });
prog('E', 'IT소프트웨어과', 'itc', 38, { years: 2 });
// 예체능 (실기 70% + 수능 30%)
prog('S', '미술대학', 'art', 70, { track: 'art_school', practical: { stat: 'cha', need: 75 }, tag: 'stage' });
prog('B', '미술대학 (홍대)', 'art', 55, { track: 'art_school', practical: { stat: 'cha', need: 62 }, tag: 'stage' });
prog('D', '시각디자인과', 'design', 35, { practical: { stat: 'cha', need: 48 }, tag: 'stage' });
prog('S', '음악대학', 'music', 70, { track: 'music_school', practical: { stat: 'cha', need: 76 }, tag: 'stage' });
prog('D', '실용음악과', 'music', 30, { track: 'music_school', practical: { stat: 'cha', need: 52 }, tag: 'stage' });
prog('A', '연극영화과', 'acting', 60, { practical: { stat: 'cha', need: 70 }, tag: 'stage' });
prog('D', '연기예술과', 'acting', 30, { practical: { stat: 'cha', need: 50 }, tag: 'stage' });
prog('S', '체육교육과', 'sport', 75, { practical: { stat: 'str', need: 72 }, tag: 'sport' });
prog('C', '체육학과', 'sport', 45, { practical: { stat: 'str', need: 58 }, tag: 'sport' });

export const PROGRAMS: Record<string, Program> = Object.fromEntries(P.map((p) => [p.id, p]));
export const programName = (p: Program) => `${p.school ?? TIERS[p.tier].name} ${p.major}`;

/** 전공별 추천 진로 (졸업 후 진로 선택의 '전공 추천' 탭) */
export const MAJOR_JOBS: Record<string, string[]> = {
  biz: ['corp', 'banker', 'analyst', 'accountant', 'marketer', 'trader', 'tax_accountant', 'founder'],
  econ: ['analyst', 'banker', 'public_corp', 'accountant', 'corp', 'appraiser'],
  law: ['civil', 'scrivener', 'labor_attorney', 'public_corp', 'corp'],
  admin: ['civil', 'tax_officer', 'public_corp', 'police', 'diplomat'],
  media: ['journalist', 'pd', 'announcer', 'marketer', 'youtuber', 'designer'],
  lang: ['trader', 'flight_attendant', 'diplomat', 'tour_guide', 'hotelier', 'corp'],
  welfare: ['social_worker', 'caregiver', 'civil'],
  cs: ['developer', 'data_scientist', 'security', 'game_dev', 'corp'],
  ee: ['chip_engineer', 'developer', 'patent_attorney', 'corp'],
  mech: ['mech_engineer', 'chip_engineer', 'patent_attorney', 'corp'],
  arch: ['architect', 'corp', 'appraiser'],
  bio: ['researcher', 'patent_attorney', 'corp'],
  agri: ['smart_farmer', 'farmer', 'rancher', 'civil'],
  cook: ['chef', 'hotelier', 'restaurant', 'cafe_owner'],
  beauty: ['hairdresser', 'nail_artist', 'online_shop'],
  air: ['flight_attendant', 'hotelier', 'tour_guide'],
  auto: ['mechanic', 'factory', 'trucker'],
  itc: ['developer', 'security', 'game_dev'],
  design: ['designer', 'game_dev', 'online_shop'],
  acting: ['actor', 'voice_actor', 'model', 'youtuber'],
  sport: ['trainer', 'police', 'firefighter', 'coach'],
  art: ['painter', 'designer'],
  music: ['musician'],
};

// ───────────────────────── 성적 ─────────────────────────

export function studyOf(p: Person): number {
  return p.study ?? Math.round(p.actual.int * 0.8);
}

/** 성적 올리기: 지능·재능·성격·학년에 따라 효율이 다르고, 위로 갈수록 오르기 어렵다 */
export function addStudy(s: GameState, p: Person, base: number) {
  const cur = studyOf(p);
  if (base < 0) {
    p.study = clamp(cur + base, 0, 100);
    return;
  }
  let g = base * (0.5 + p.actual.int / 70);
  if (hasTalent(p, 'genius')) g *= 1.3;
  if (hasTrait(p, 'diligent')) g *= 1.2;
  if (hasTrait(p, 'lazy')) g *= 0.75;
  if (age(s, p) >= 16) g *= 1.3;
  g *= studyBoost(p);
  p.study = clamp(cur + g * (1 - cur / 115), 0, 100);
}

/** 사교육비 누적이 수능에 주는 보너스 (돈이 많이 들수록 체감) */
const eduBonus = (p: Person) => Math.min(10, Math.sqrt((p.eduSpent ?? 0) / 1000) * 1.2);

/** 수능: 원점수 → 백분위 */
export function suneung(s: GameState, p: Person): number {
  const retakes = Number(p.flags.find((f) => f.startsWith('retake:'))?.slice(7) ?? 0);
  const raw =
    studyOf(p) * 0.75 +
    p.actual.int * 0.35 +
    eduBonus(p) +
    Math.min(3, p.flags.filter((f) => f === 'club').length * 0.6) +
    Math.min(4, retakes * 1.5) +
    (hasTrait(p, 'anxious') ? -2 : hasTrait(p, 'cheerful') ? 1 : 0) +
    suneungBonus(p) +
    normal(s, 0, 4);
  return Math.round(clamp(100 / (1 + Math.exp(-(raw - 58) / 10)), 0.1, 99.99) * 100) / 100;
}

export function gradeOf(pct: number): number {
  const cuts = [96, 89, 77, 60, 40, 23, 11, 4];
  const i = cuts.findIndex((c) => pct >= c);
  return i < 0 ? 9 : i + 1;
}

/** 합격 확률 */
export function admitChance(p: Person, pr: Program, pct: number): number {
  if (pr.need && p.actual[pr.need.stat] < pr.need.min) return 0;
  if (pr.practical) {
    const v = p.actual[pr.practical.stat] * 0.7 + (pct / 100) * 30 + (hasFlag(p, 'high_art') || hasFlag(p, 'high_sport') ? 6 : 0);
    const need = pr.practical.need * 0.7 + (pr.cut / 100) * 30;
    return 1 / (1 + Math.exp(-(v - need) / 3));
  }
  const w = Math.max(0.35, (100 - pr.cut) * 0.3);
  return 1 / (1 + Math.exp(-(pct - pr.cut) / w));
}

/** 경쟁률 (연도·학과별로 고정된 값) */
export function ratioOf(s: GameState, pr: Program): string {
  let h = s.year;
  for (const ch of pr.id) h = (h * 31 + ch.charCodeAt(0)) | 0;
  const r = { rng: h };
  const base = pr.track === 'med_school' || pr.key === 'dent' || pr.key === 'kmd' ? 6 : pr.practical ? 8 : pr.tier === 'E' ? 2 : 3.5;
  return (base + next(r) * 4).toFixed(1);
}

function band(c: number): string {
  return c >= 0.8 ? '안정' : c >= 0.4 ? '적정' : c >= 0.1 ? '소신' : '상향';
}

/** 성적에 맞는 대학·학과 추천: 상향·소신·적정·안정 골고루 */
export function recommend(p: Person, pct: number, practical: boolean): Program[] {
  const list = P.filter((pr) => !!pr.practical === practical)
    .map((pr) => [pr, admitChance(p, pr, pct)] as const)
    .filter(([pr, c]) => c > 0.02 && !(pr.need && p.actual[pr.need.stat] < pr.need.min));
  const pickBand = (lo: number, hi: number, n: number) =>
    list
      .filter(([, c]) => c >= lo && c < hi)
      .sort((a, b) => b[0].cut - a[0].cut)
      .slice(0, n)
      .map(([pr]) => pr);
  return [...pickBand(0.02, 0.1, 2), ...pickBand(0.1, 0.4, 3), ...pickBand(0.4, 0.8, 3), ...pickBand(0.8, 1.01, 3)];
}

// ───────────────────────── 학년별 생활 ─────────────────────────

interface Plan {
  label: string;
  cost: number;
  budget: 0 | 1 | 2 | 3;
  focus: Focus;
  study: number;
  happy: number;
  minAge?: number;
  extra?: (x: Ctx) => string;
}
const PLANS: Plan[] = [
  { label: '학원 뺑뺑이', cost: 1200, budget: 2, focus: 'study', study: 6, happy: -4 },
  { label: '과외 + 학원 올인', cost: 3000, budget: 3, focus: 'study', study: 9, happy: -9 },
  { label: '인강으로 자기주도 학습', cost: 200, budget: 1, focus: 'study', study: 4, happy: -1 },
  {
    label: '운동부·체육 활동',
    cost: 600,
    budget: 2,
    focus: 'sport',
    study: 1,
    happy: 3,
    extra: (x) => (x.p.flags.push('club'), ''),
  },
  {
    label: '미술·음악·연기 학원',
    cost: 900,
    budget: 2,
    focus: 'art',
    study: 1,
    happy: 3,
    extra: (x) => (x.p.flags.push('club'), ''),
  },
  { label: '봉사·동아리 (인성)', cost: 100, budget: 1, focus: 'character', study: 2, happy: 2, extra: (x) => (x.p.flags.push('club'), '') },
  { label: '친구들과 실컷 놀기', cost: 0, budget: 0, focus: 'free', study: -3, happy: 9 },
  {
    label: '연애한다',
    cost: 0,
    budget: 0,
    focus: 'free',
    study: -4,
    happy: 10,
    minAge: 15,
    extra: (x) => {
      // 첫사랑: 수십 년 뒤 다시 나타날 수도
      if (!x.p.flags.includes('first_love') && chance(x.s, 0.35)) {
        x.p.flags.push('first_love');
        const name = pick(x.s, SURNAMES) + pick(x.s, x.p.sex === 'M' ? FEMALE_NAMES : MALE_NAMES);
        schedule(x.s, int(x.s, 15, 30), 'first_love', x.p.id, { name });
        return ` 첫사랑 ${name}. 졸업하며 헤어졌지만 평생 잊지 못할 것 같다.`;
      }
      return chance(x.s, 0.3) ? ' 첫사랑과 헤어지고 한동안 방황했다.' : ' 설레는 한 해였다.';
    },
  },
  {
    label: '알바한다',
    cost: 0,
    budget: 0,
    focus: 'character',
    study: -3,
    happy: 0,
    minAge: 16,
    extra: (x) => ((x.p.cash += 400), (x.p.actual.mor = clamp(x.p.actual.mor + 2, 0, 100)), ' 번 돈 400만원은 자기 통장에.'),
  },
];

/** 학년 생활이 남기는 흔적: 학원·과외·인강·운동부·예체능·봉사·놀기·연애·알바 */
const PLAN_MARKS: Record<string, number>[] = [{ study: 1 }, { study: 1, hurt: 1 }, { study: 1 }, { sport: 1 }, { art: 1 }, { kind: 1 }, { warmth: 1 }, {}, { thrift: 1 }];

const GRADE = (a: number) => (a <= 13 ? `초등 ${a - 7}학년` : a <= 16 ? `중학교 ${a - 13}학년` : `고등학교 ${a - 16}학년`);

function runPlan(x: Ctx, i: number): string {
  const pl = PLANS[i];
  const p = x.p;
  x.s.policy.children[p.id] = { budget: pl.budget, focus: pl.focus };
  p.flags = p.flags.filter((f) => !f.startsWith('sy:'));
  p.flags.push('sy:' + i);
  p.eduSpent = (p.eduSpent ?? 0) + pl.cost;
  for (const [k, n] of Object.entries(PLAN_MARKS[i] ?? {})) mark(p, k, n);
  const before = studyOf(p);
  addStudy(x.s, p, pl.study);
  p.happiness = clamp(p.happiness + pl.happy, 0, 100);
  let msg = pl.extra?.(x) ?? '';
  // 투자한 분야에서 재능이 드러나기도
  const t = p.talents.find((t) => !t.discovered && TALENTS[t.id].stat === { study: 'int', sport: 'str', art: 'cha' }[pl.focus as 'study']);
  if (t && chance(x.s, 0.15)) {
    discoverTalent(p, t.id);
    msg += ` ✨ [${TALENTS[t.id].name}] 재능이 보인다!`;
  }
  if (pl.budget === 3 && p.happiness < 25 && chance(x.s, 0.3)) msg += ' 번아웃 직전이다. 표정이 어둡다.';
  const d = studyOf(p) - before;
  return `성적 ${d >= 0 ? '▲' : '▼'}${Math.abs(d).toFixed(1)} (현재 ${Math.round(studyOf(p))}점대).${msg}`;
}

const schoolYear: EventDef = {
  id: 'school_year',
  title: (c) => `${GRADE(age(c.s, c.p))}`,
  text: (c) => {
    const a = age(c.s, c.p);
    const st = Math.round(studyOf(c.p));
    const rank = st >= 90 ? '전교권' : st >= 75 ? '상위권' : st >= 55 ? '중상위권' : st >= 35 ? '중위권' : '하위권';
    return (
      `${iga(who(c))} ${GRADE(a)}이 되었다. 올해는 어떻게 보낼까?\n` +
      `성적 ${rank} (${st}) · 누적 사교육비 ${formatMoney(c.p.eduSpent ?? 0)}` +
      (a >= 17 ? '\n수능까지 얼마 안 남았다.' : '')
    );
  },
  choices: (c) => {
    const a = age(c.s, c.p);
    const last = Number(c.p.flags.find((f) => f.startsWith('sy:'))?.slice(3) ?? -1);
    const list: Choice[] = PLANS.flatMap((pl, i) =>
      (pl.minAge ?? 0) > a ? [] : [{ label: pl.label, cost: pl.cost || undefined, run: (x: Ctx) => runPlan(x, i) }],
    );
    if (last >= 0 && PLANS[last] && (PLANS[last].minAge ?? 0) <= a && ok(PLANS[last].cost, c.s))
      list.unshift({ label: `작년처럼 (${PLANS[last].label})`, cost: PLANS[last].cost || undefined, run: (x) => runPlan(x, last) });
    return gate(c.s, list);
  },
};

// ───────────────────────── 수능과 입시 ─────────────────────────

const retakesOf = (p: Person) => Number(p.flags.find((f) => f.startsWith('retake:'))?.slice(7) ?? 0);

function enroll(x: Ctx, pr: Program): string {
  const p = x.p;
  p.flags = p.flags.filter((f) => f !== 'retaking' && !f.startsWith('tuition:'));
  const t = TIERS[pr.tier];
  addFlag(p, t.flag);
  addFlag(p, 'major:' + pr.key);
  setStudy(x.s, p, pr.years, pr.track ?? t.flag);
  p.flags.push('tuition:' + (pr.tuition ?? t.tuition));
  p.flags.push('school:' + programName(pr));
  return `🎓 ${programName(pr)} 입학! (${pr.years}년 · 등록금 연 ${formatMoney(pr.tuition ?? t.tuition)})` + applyDesire(x, pr.tag);
}

function retake(x: Ctx, academy: boolean): string {
  const p = x.p;
  const n = retakesOf(p) + 1;
  p.flags = p.flags.filter((f) => !f.startsWith('retake:'));
  p.flags.push('retake:' + n);
  addFlag(p, 'retaking');
  if (academy) {
    p.eduSpent = (p.eduSpent ?? 0) + 2000;
    addStudy(x.s, p, 9);
  } else addStudy(x.s, p, 5);
  p.happiness = clamp(p.happiness - 8, 0, 100);
  return `${n + 1}수 결정. ${academy ? '재수종합반에 등록했다.' : '독서실에 자리를 잡았다.'} 내년 수능에 다시 도전한다.` + (n >= 2 ? ' 친구들은 벌써 대학 생활 중이다.' : '');
}

const path: EventDef = {
  id: 'path',
  title: (c) => (retakesOf(c.p) ? `${retakesOf(c.p) + 1}수생의 수능` : '수능과 진로'),
  text: (c) => {
    const d = (c.ev.data ??= {});
    if (d.pct === undefined) d.pct = suneung(c.s, c.p);
    const apps: string[] = d.apps ?? [];
    const head =
      `${who(c)} 수능 성적표: 백분위 ${d.pct} (평균 ${gradeOf(d.pct)}등급)\n` +
      `누적 사교육비 ${formatMoney(c.p.eduSpent ?? 0)}` +
      (retakesOf(c.p) ? ` · ${retakesOf(c.p) + 1}수째` : '');
    if (d.stage === 'result') {
      return head + '\n\n📮 합격 발표\n' + (d.results as [string, boolean][]).map(([id, okk]) => `${okk ? '✅ 합격' : '❌ 불합격'} ${programName(PROGRAMS[id])}`).join('\n');
    }
    if (d.stage === 'apply' || d.stage === 'art')
      return (
        head +
        `\n\n원서 ${3 - apps.length}장 남음` +
        (apps.length ? `\n지원: ${apps.map((id) => programName(PROGRAMS[id])).join(', ')}` : '') +
        `\n(상향 < 소신 < 적정 < 안정 순으로 붙기 쉽다)`
      );
    if (d.stage === 'work') return head + '\n\n대학 대신 어떤 길로?';
    return head + '\n\n어떻게 할까?';
  },
  choices: (c) => {
    const d = c.ev.data;
    const p = c.p;
    const apps: string[] = d.apps ?? [];
    const back: Choice = { label: '← 뒤로', run: (x) => ((x.ev.data.stage = undefined), { text: '', keep: true }) };
    const finish: Choice = {
      label: `📮 원서 마감 · 결과 보기 (${apps.length}곳)`,
      disabled: !apps.length,
      run: (x) => {
        x.ev.data.results = apps.map((id) => [id, chance(x.s, admitChance(x.p, PROGRAMS[id], x.ev.data.pct))]);
        x.ev.data.stage = 'result';
        return { text: '', keep: true };
      },
    };
    const retakeChoices: Choice[] = gate(c.s, [
      { label: '재수한다 (재수종합반 2,000만)', cost: 2000, run: (x) => retake(x, true) },
      { label: '독학 재수', run: (x) => retake(x, false) },
    ]);

    if (d.stage === 'result') {
      const passed = (d.results as [string, boolean][]).filter(([, o]) => o).map(([id]) => PROGRAMS[id]);
      const out: Choice[] = passed.map((pr) => ({ label: `등록: ${programName(pr)}`, run: (x: Ctx) => enroll(x, pr) }));
      if (!passed.length) {
        const extra = P.filter((pr) => !pr.practical && (pr.tier === 'D' || pr.tier === 'E') && admitChance(p, pr, d.pct) > 0.5)
          .sort((a, b) => b.cut - a.cut)
          .slice(0, 2);
        for (const pr of extra) out.push({ label: `추가모집: ${programName(pr)}`, run: (x) => enroll(x, pr) });
      }
      out.push(...retakeChoices);
      out.push({ label: '대학은 접고 사회로', run: (x) => ((x.ev.data.stage = 'work'), { text: '', keep: true }) });
      return out;
    }

    if (d.stage === 'apply' || d.stage === 'art') {
      const recs = recommend(p, d.pct, d.stage === 'art').filter((pr) => !apps.includes(pr.id));
      const out: Choice[] = recs.map((pr) => {
        const ch = admitChance(p, pr, d.pct);
        const tuition = pr.tuition ?? TIERS[pr.tier].tuition;
        return {
          label: programName(pr),
          req: [`경쟁률 ${ratioOf(c.s, pr)}:1`, band(ch), `${pr.years}년`, ...(tuition ? [`등록금 ${formatMoney(tuition)}/년`] : ['학비 면제']), ...(pr.practical ? ['실기'] : [])],
          disabled: apps.length >= 3,
          run: (x: Ctx) => {
            x.ev.data.apps = [...(x.ev.data.apps ?? []), pr.id];
            return { text: '', keep: true };
          },
        };
      });
      if (!out.length) out.push({ label: '(지원 가능한 곳이 없다)', disabled: true, run: () => '' });
      return [finish, ...out, back];
    }

    if (d.stage === 'work') return workChoices(c);

    return [
      { label: '📝 정시 원서 쓰기 (가·나·다군 3장)', run: (x) => ((x.ev.data.stage = 'apply'), { text: '', keep: true }) },
      { label: '🎨 예체능 실기 전형', run: (x) => ((x.ev.data.stage = 'art'), { text: '', keep: true }) },
      ...retakeChoices,
      { label: '💼 대학 대신 사회로', run: (x) => ((x.ev.data.stage = 'work'), { text: '', keep: true }) },
    ];
  },
};

/** 대학에 안 가는 길 */
function workChoices(c: Ctx): Choice[] {
  const p = c.p;
  const clearRetake = (x: Ctx) => (x.p.flags = x.p.flags.filter((f) => f !== 'retaking'));
  const trained = hasFlag(p, 'high_sport') || hasFlag(p, 'mid_sport') || hasFlag(p, 'sports_team');
  return gate(c.s, [
    {
      label: '바로 취업 (중소기업)',
      req: hasFlag(p, 'high_voc') ? ['특성화고 우대'] : [],
      run: (x) => (clearRetake(x), setJob(x.p, 'office', hasFlag(x.p, 'high_voc') ? 1 : 0), '일찍 사회생활을 시작했다.' + applyDesire(x, 'free')),
    },
    {
      label: '고졸 공무원 시험 준비',
      run: (x) => {
        clearRetake(x);
        x.p.flags.push('prep:civil', 'tries:0');
        return '공시생이 되었다. 내년부터 매년 시험을 본다.' + applyDesire(x, 'public');
      },
    },
    { label: '생산직 취업', run: (x) => (clearRetake(x), setJob(x.p, 'factory'), '3교대 공장에 들어갔다. 월급은 생각보다 괜찮다.') },
    { label: '알바하며 지낸다', run: (x) => (clearRetake(x), setJob(x.p, 'parttime'), '편의점 야간 알바를 시작했다.' + applyDesire(x, 'free')) },
    {
      label: '프로 입단 테스트',
      req: ['체고·운동부 출신'],
      tag: 'sport',
      disabled: !trained,
      run: (x) => {
        clearRetake(x);
        if (check(x.s, x.p.actual.str + (hasTalent(x.p, 'athlete') ? 15 : 0) + (hasFlag(x.p, 'high_sport') ? 5 : 0), 55, 6)) {
          setJob(x.p, 'athlete');
          return '프로 구단 입단! 연봉 계약서에 사인했다.' + applyDesire(x, 'sport');
        }
        setJob(x.p, 'none');
        addFlag(x.p, 'failed_pro');
        return '입단 테스트 탈락. 앞길이 막막하다.';
      },
    },
    {
      label: '연예기획사 데뷔',
      req: ['연습생·예고 출신'],
      tag: 'stage',
      disabled: !(hasFlag(p, 'trainee') || hasFlag(p, 'high_art')),
      run: (x) => {
        clearRetake(x);
        const star = hasTalent(x.p, 'star');
        if (star) discoverTalent(x.p, 'star');
        if (check(x.s, x.p.actual.cha + (star ? 15 : 0) + (hasFlag(x.p, 'high_art') ? 5 : 0), 62, 7)) {
          setJob(x.p, 'entertainer', 0);
          return '🎤 데뷔 확정! 하지만 아직은 무명이다.' + applyDesire(x, 'stage');
        }
        setJob(x.p, 'none');
        addFlag(x.p, 'failed_pro');
        return '데뷔조에서 탈락했다.';
      },
    },
    {
      label: '프로게임단 입단 테스트',
      tag: 'sport',
      run: (x) => {
        clearRetake(x);
        if (check(x.s, x.p.actual.int * 0.6 + x.p.actual.str * 0.4, 58, 6)) {
          setJob(x.p, 'gamer', 1);
          return '🎮 프로게임단 2군 합류!' + applyDesire(x, 'sport');
        }
        setJob(x.p, 'none');
        addFlag(x.p, 'failed_pro');
        return '테스트에서 떨어졌다.';
      },
    },
    {
      label: '유튜브 채널 개설',
      tag: 'stage',
      run: (x) => (clearRetake(x), setJob(x.p, 'youtuber', 0), '채널을 열었다. 조회수 12. 그중 10은 가족이다.' + applyDesire(x, 'stage')),
    },
    {
      label: '당분간 쉰다',
      run: (x) => {
        clearRetake(x);
        setJob(x.p, 'none');
        x.p.happiness = clamp(x.p.happiness + 10, 0, 100);
        return `${who(x)}${tr(who(x), '은', '는')} 방에서 나오지 않는다.` + applyDesire(x, 'free');
      },
    },
    { label: '← 뒤로', run: (x) => ((x.ev.data.stage = x.ev.data.results ? 'result' : undefined), { text: '', keep: true }) },
  ]);
}

export const SCHOOL_EVENTS: EventDef[] = [schoolYear, path];
