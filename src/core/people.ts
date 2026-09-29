import { chance, int, next, normal, pick, type RngHolder } from './rng';
import { FEMALE_NAMES, MALE_NAMES, STAT_KEYS, TALENTS, TALENT_IDS } from './data';
import type { CareerTag, GameState, Genes, Person, Sex, Stats, Talent } from './types';

export const HAIR_STYLES = 5;
export const HAIR_COLORS = 6;
export const SKINS = 4;
export const EYES = 3;

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function newId(s: GameState): string {
  return 'p' + s.idSeq++;
}

export const age = (s: GameState, p: Person) => s.year - p.birthYear;
export const alive = (p: Person) => p.deathYear === undefined;
export const fullName = (p: Person) => p.surname + p.name;
export const isMinor = (s: GameState, p: Person) => age(s, p) < 20;

export function head(s: GameState): Person {
  return s.people[s.headId];
}

export function randomName(r: RngHolder, sex: Sex): string {
  return pick(r, sex === 'M' ? MALE_NAMES : FEMALE_NAMES);
}

export function randomGenes(r: RngHolder): Genes {
  return {
    hairStyle: int(r, 0, HAIR_STYLES - 1),
    hairColor: int(r, 0, 2), // 기본은 어두운 머리색 계열, 밝은 색은 돌연변이로
    skin: int(r, 0, SKINS - 1),
    eyes: int(r, 0, EYES - 1),
  };
}

function randomStats(r: RngHolder, mean: number, sd: number): Stats {
  const st = {} as Stats;
  for (const k of STAT_KEYS) st[k] = Math.round(clamp(normal(r, mean, sd), 5, 100));
  return st;
}

export function randomTalents(r: RngHolder, p = 0.15): Talent[] {
  return TALENT_IDS.filter(() => chance(r, p)).map((id) => ({ id, discovered: false }));
}

interface CreateOpts {
  sex?: Sex;
  surname: string;
  birthYear: number;
  quality?: number; // 잠재력 평균
  grown?: number; // 실제치 = 잠재력 × grown
}

/** 부모 없이 생성되는 인물 (창시 세대, 배우자 후보, 방계 등) */
export function createPerson(s: GameState, o: CreateOpts): Person {
  const sex = o.sex ?? (chance(s, 0.5) ? 'M' : 'F');
  const potential = randomStats(s, o.quality ?? 50, 14);
  const grown = o.grown ?? 0.1;
  const actual = {} as Stats;
  for (const k of STAT_KEYS) actual[k] = Math.round(potential[k] * clamp(grown + normal(s, 0, 0.06), 0.05, 1));
  return {
    id: newId(s),
    surname: o.surname,
    name: randomName(s, sex),
    sex,
    birthYear: o.birthYear,
    childIds: [],
    potential,
    actual,
    talents: randomTalents(s),
    genes: randomGenes(s),
    job: 'none',
    jobYears: 0,
    jobLevel: 0,
    flags: [],
    affinity: 30,
    happiness: 60,
    desireKnown: false,
    potentialKnown: false,
    cash: 0,
    inLaw: false,
  };
}

/**
 * 유전: 자녀 잠재력 = 부모 평균 + N(0, 8)
 * 재능은 부모 각각에서 30%로 유전, 3% 돌연변이로 새 재능, 0.5% 천재 돌연변이(+25).
 * 외모 유전자는 부/모 중 한쪽에서 50:50, 5% 돌연변이.
 */
export function inherit(s: GameState, father: Person, mother: Person, surname: string): Person {
  const sex: Sex = chance(s, 0.51) ? 'M' : 'F';
  const potential = {} as Stats;
  for (const k of STAT_KEYS) {
    potential[k] = Math.round(clamp((father.potential[k] + mother.potential[k]) / 2 + normal(s, 0, 8), 1, 100));
  }
  const mutations: string[] = [];
  if (chance(s, 0.005)) {
    const k = pick(s, STAT_KEYS);
    potential[k] = clamp(potential[k] + 25, 1, 100);
    mutations.push('prodigy:' + k);
  }
  const talents: Talent[] = [];
  for (const t of [...father.talents, ...mother.talents]) {
    if (!talents.some((x) => x.id === t.id) && chance(s, 0.3)) talents.push({ id: t.id, discovered: false });
  }
  if (chance(s, 0.03)) {
    const t = pick(s, TALENT_IDS);
    if (!talents.some((x) => x.id === t)) talents.push({ id: t, discovered: false });
    mutations.push('talent:' + t);
  }
  const g = (a: number, b: number, n: number) => (chance(s, 0.05) ? int(s, 0, n - 1) : chance(s, 0.5) ? a : b);
  const genes: Genes = {
    hairStyle: g(father.genes.hairStyle, mother.genes.hairStyle, HAIR_STYLES),
    hairColor: g(father.genes.hairColor, mother.genes.hairColor, HAIR_COLORS),
    skin: g(father.genes.skin, mother.genes.skin, SKINS),
    eyes: g(father.genes.eyes, mother.genes.eyes, EYES),
  };
  const actual = {} as Stats;
  for (const k of STAT_KEYS) actual[k] = Math.max(1, Math.round(potential[k] * 0.1));
  actual.hp = Math.round(potential.hp * 0.5);
  return {
    id: newId(s),
    surname,
    name: randomName(s, sex),
    sex,
    birthYear: s.year,
    fatherId: father.id,
    motherId: mother.id,
    childIds: [],
    potential,
    actual,
    talents,
    genes,
    job: 'none',
    jobYears: 0,
    jobLevel: 0,
    flags: mutations.length ? ['mutation'] : [],
    affinity: 40,
    happiness: 70,
    desireKnown: false,
    potentialKnown: false,
    cash: 0,
    inLaw: false,
  };
}

export function parentsOf(s: GameState, p: Person): Person[] {
  return [p.fatherId, p.motherId].filter((x): x is string => !!x).map((id) => s.people[id]);
}

export function childrenOf(s: GameState, p: Person): Person[] {
  return p.childIds.map((id) => s.people[id]);
}

export function spouseOf(s: GameState, p: Person): Person | undefined {
  return p.spouseId ? s.people[p.spouseId] : undefined;
}

export function siblingsOf(s: GameState, p: Person): Person[] {
  const ps = parentsOf(s, p);
  const ids = new Set<string>();
  for (const par of ps) for (const c of par.childIds) if (c !== p.id) ids.add(c);
  return [...ids].map((id) => s.people[id]).sort((a, b) => a.birthYear - b.birthYear);
}

export function isDescendantOf(s: GameState, p: Person, ancestor: Person): boolean {
  for (const par of parentsOf(s, p)) {
    if (par.id === ancestor.id || isDescendantOf(s, par, ancestor)) return true;
  }
  return false;
}

/** 직계: 가주, 가주의 배우자, 가주의 자손(과 그 배우자). 이벤트·방침 대상. */
export function isMainline(s: GameState, p: Person): boolean {
  const h = head(s);
  if (p.id === h.id || p.id === h.spouseId) return true;
  if (isDescendantOf(s, p, h)) return true;
  const sp = spouseOf(s, p);
  return !!sp && isDescendantOf(s, sp, h);
}

export function livingMainlineMinors(s: GameState): Person[] {
  const h = head(s);
  return Object.values(s.people)
    .filter((p) => alive(p) && isMinor(s, p) && (p.id === h.id || isDescendantOf(s, p, h)))
    .sort((a, b) => a.birthYear - b.birthYear);
}

export function relationLabel(s: GameState, p: Person): string {
  const h = head(s);
  if (p.id === h.id) return '본인(가주)';
  if (p.id === h.spouseId) return h.sex === 'M' ? '아내' : '남편';
  const sp = spouseOf(s, p);
  const pars = parentsOf(s, p);
  if (p.id === h.fatherId) return '아버지';
  if (p.id === h.motherId) return '어머니';
  const hp = parentsOf(s, h);
  for (const par of hp) {
    if (p.id === par.fatherId) return '할아버지';
    if (p.id === par.motherId) return '할머니';
  }
  if (siblingsOf(s, h).some((x) => x.id === p.id)) {
    const older = p.birthYear < h.birthYear;
    if (p.sex === 'M') return older ? (h.sex === 'M' ? '형' : '오빠') : '남동생';
    return older ? (h.sex === 'M' ? '누나' : '언니') : '여동생';
  }
  if (h.childIds.includes(p.id)) return p.sex === 'M' ? '아들' : '딸';
  const hSibs = siblingsOf(s, h);
  if (sp && hSibs.some((x) => x.id === sp.id)) return '형제의 배우자';
  if (pars.some((x) => hSibs.some((y) => y.id === x.id))) return '조카';
  const father = h.fatherId ? s.people[h.fatherId] : undefined;
  const mother = h.motherId ? s.people[h.motherId] : undefined;
  if (father && siblingsOf(s, father).some((x) => x.id === p.id)) return p.sex === 'M' ? '삼촌' : '고모';
  if (mother && siblingsOf(s, mother).some((x) => x.id === p.id)) return p.sex === 'M' ? '외삼촌' : '이모';
  if (sp && h.childIds.includes(sp.id)) return p.sex === 'F' ? '며느리' : '사위';
  if (pars.some((x) => h.childIds.includes(x.id))) return p.sex === 'M' ? '손자' : '손녀';
  if (pars.some((x) => pars.length && parentsOf(s, x).some((y) => h.childIds.includes(y.id)))) return '증손';
  if (sp && isDescendantOf(s, sp, h)) return '손주 배우자';
  if (isDescendantOf(s, p, h)) return '후손';
  return '친척';
}

export function computeDesire(p: Person): CareerTag {
  if (p.talents.length) return TALENTS[p.talents[0].id].tag;
  const a = p.actual;
  const best = (['int', 'str', 'cha', 'mor'] as const).reduce((x, y) => (a[x] >= a[y] ? x : y));
  if (a[best] < 20) return 'free';
  return ({ int: 'study', str: 'sport', cha: 'stage', mor: 'public' } as const)[best];
}

export function hasTalent(p: Person, id: string) {
  return p.talents.some((t) => t.id === id);
}

export function discoverTalent(p: Person, id: string): boolean {
  const t = p.talents.find((t) => t.id === id);
  if (!t || t.discovered) return false;
  t.discovered = true;
  return true;
}

export function addFlag(p: Person, f: string) {
  if (!p.flags.includes(f)) p.flags.push(f);
}
export const hasFlag = (p: Person, f: string) => p.flags.includes(f);

/** 능력치 판정: 성공확률 = 시그모이드((스탯-기준)/폭) */
export function check(r: RngHolder, stat: number, threshold: number, width = 8, bonus = 0): boolean {
  const p = 1 / (1 + Math.exp(-(stat - threshold) / width)) + bonus;
  return next(r) < p;
}
