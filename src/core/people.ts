import { chance, int, next, normal, pick, type RngHolder } from './rng';
import { bonusGene } from './rewards';
import { ERA_NAMES, NATIVE_NAMES, STAT_KEYS, SUPER_RARE_TRAIT_IDS, TALENTS, TALENT_IDS, TRAITS, TRAIT_IDS } from './data';
import type { CareerTag, GameState, Genes, Person, Sex, Stats, Talent } from './types';

export const HAIR_STYLES = 7;
export const HAIR_COLORS = 9;
/** 0~2: 흑발·갈색 계열, 3~: 밝은 색·염색 */
export const DARK_HAIR = 3;
export const SKINS = 5;
export const EYES = 5;
export const FACES = 3;
export const BROWS = 3;
export const MOUTHS = 4;
export const MARKS = 6;

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

/** 태어난 해의 유행 이름 (가끔 앞뒤 시대 이름, 드물게 순우리말) */
export function randomName(r: RngHolder, sex: Sex, birthYear = 2025): string {
  const i = Math.max(0, ERA_NAMES.findIndex((e) => birthYear <= e.until));
  const roll = next(r);
  if (roll < 0.05) return pick(r, NATIVE_NAMES[sex]);
  const era = roll < 0.85 ? ERA_NAMES[i] : ERA_NAMES[clamp(i + (roll < 0.93 ? -1 : 1), 0, ERA_NAMES.length - 1)];
  return pick(r, era[sex]);
}

/** 집안에서 이미 쓰는 이름: 부모·조부모·형제 (항렬 문화에서도 같은 이름은 피한다) */
export function takenNames(s: GameState, p: Person): Set<string> {
  const ps = [p.fatherId, p.motherId].map((id) => (id ? s.people[id] : undefined)).filter((x): x is Person => !!x);
  const gps = ps.flatMap((q) => [q.fatherId, q.motherId].map((id) => (id ? s.people[id] : undefined)).filter((x): x is Person => !!x));
  const sibs = ps.flatMap((q) => q.childIds.map((id) => s.people[id])).filter((x) => x && x.id !== p.id);
  return new Set([...ps, ...gps, ...sibs].map((x) => x.name));
}

/** 집안 이름과 겹치지 않는 새 이름 */
export function freshName(s: GameState, p: Person): string {
  const taken = takenNames(s, p);
  let n = p.name;
  for (let i = 0; i < 30 && (!n || taken.has(n)); i++) n = randomName(s, p.sex, p.birthYear);
  return n;
}

/** 유전 안 되는 개인 특징: 절반은 없음, 선글라스는 드묾 */
export function randomMark(r: RngHolder): number {
  if (chance(r, 0.5)) return 0;
  return chance(r, 0.08) ? 5 : int(r, 1, 4);
}

export function randomGenes(r: RngHolder): Genes {
  return {
    hairStyle: int(r, 0, HAIR_STYLES - 1),
    hairColor: chance(r, 0.7) ? int(r, 0, DARK_HAIR - 1) : int(r, 0, HAIR_COLORS - 1),
    skin: int(r, 0, SKINS - 1),
    eyes: int(r, 0, EYES - 1),
    face: int(r, 0, FACES - 1),
    brows: int(r, 0, BROWS - 1),
    mouth: int(r, 0, MOUTHS - 1),
    mark: randomMark(r),
  };
}

/** 예전 세이브의 유전자에 새 항목 채우기 (id 기반으로 결정적) */
export function fillGenes(p: Person) {
  const g = p.genes as Partial<Genes> & Genes;
  let h = 0;
  for (const ch of p.id) h = (h * 31 + ch.charCodeAt(0)) | 0;
  const r = { rng: h };
  g.face ??= int(r, 0, FACES - 1);
  g.brows ??= int(r, 0, BROWS - 1);
  g.mouth ??= int(r, 0, MOUTHS - 1);
  g.mark ??= randomMark(r);
}

function randomStats(r: RngHolder, mean: number, sd: number): Stats {
  const st = {} as Stats;
  for (const k of STAT_KEYS) st[k] = Math.round(clamp(normal(r, mean, sd), 15, 98));
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
  // 같은 '집안 수준'이라도 사람마다 편차가 크다
  const potential = randomStats(s, (o.quality ?? 50) + normal(s, 0, 5), 14);
  const grown = o.grown ?? 0.1;
  const actual = {} as Stats;
  for (const k of STAT_KEYS) actual[k] = Math.round(potential[k] * clamp(grown + normal(s, 0, 0.06), 0.05, 1));
  return {
    id: newId(s),
    surname: o.surname,
    name: randomName(s, sex, o.birthYear),
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
    traits: randomTraits(s),
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
    // 부모 평균 + 큰 변이. 가끔은 한쪽 부모를 쏙 빼닮는다
    const mid = chance(s, 0.25) ? (chance(s, 0.5) ? father.potential[k] : mother.potential[k]) : (father.potential[k] + mother.potential[k]) / 2;
    potential[k] = Math.round(clamp(mid + normal(s, 0, 10) + bonusGene(s), 15, 100));
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
  // 각 형질은 부/모 중 한쪽에서, 12%는 새로 (형제끼리도 꽤 다르게 생김)
  const g = (a: number, b: number, n: number) => (chance(s, 0.12) ? int(s, 0, n - 1) : chance(s, 0.5) ? a : b);
  const fg = father.genes;
  const mg = mother.genes;
  const genes: Genes = {
    hairStyle: int(s, 0, HAIR_STYLES - 1), // 머리 모양은 유전보다 취향
    hairColor: chance(s, 0.12) ? (chance(s, 0.7) ? int(s, 0, DARK_HAIR - 1) : int(s, 0, HAIR_COLORS - 1)) : chance(s, 0.5) ? fg.hairColor : mg.hairColor,
    skin: g(fg.skin, mg.skin, SKINS),
    eyes: g(fg.eyes, mg.eyes, EYES),
    face: g(fg.face ?? 0, mg.face ?? 0, FACES),
    brows: g(fg.brows ?? 0, mg.brows ?? 0, BROWS),
    mouth: g(fg.mouth ?? 0, mg.mouth ?? 0, MOUTHS),
    mark: randomMark(s),
  };
  const actual = {} as Stats;
  for (const k of STAT_KEYS) actual[k] = Math.max(1, Math.round(potential[k] * 0.1));
  actual.hp = Math.round(potential.hp * 0.5);
  return {
    id: newId(s),
    surname,
    name: randomName(s, sex, s.year),
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
    traits: inheritTraits(s, father, mother),
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

/**
 * 살림을 책임지는 사람. 가주가 아직 어리거나 학생·수험생이면 부모가 돈을 낸다.
 */
export function householder(s: GameState): Person {
  const h = head(s);
  const a = age(s, h);
  // 미성년이거나, 아직 독립(결혼·독립 이벤트)하지 않았으면 부모님 살림에 얹혀 산다
  const dependent = a < 20 || (!h.spouseId && !h.flags.includes('indep'));
  if (dependent) {
    const par = parentsOf(s, h)
      .filter(alive)
      .sort((x, y) => y.cash - x.cash)[0];
    if (par) return par;
  }
  return h;
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
    // 부모 중 한 분만 같으면 이복(배다른)·이부(씨다른) 형제
    const half = !(p.fatherId && p.fatherId === h.fatherId && p.motherId && p.motherId === h.motherId) ? '이복 ' : '';
    if (p.sex === 'M') return half + (older ? (h.sex === 'M' ? '형' : '오빠') : '남동생');
    return half + (older ? (h.sex === 'M' ? '누나' : '언니') : '여동생');
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

export const hasTrait = (p: Person, id: string) => !!p.traits?.includes(id);

/** 흔적 쌓기 (음수면 지우기). 플레이어에게는 보이지 않는다 */
export function mark(p: Person, key: string, n = 1) {
  const m = (p.marks ??= {});
  m[key] = Math.max(0, (m[key] ?? 0) + n);
}
export const markOf = (p: Person | undefined, key: string) => p?.marks?.[key] ?? 0;

/** 성격 부여: 기존 성격과 반대되는 건 건너뜀 */
function addTrait(list: string[], id: string) {
  if (list.includes(id) || list.some((t) => TRAITS[t].opp === id)) return;
  list.push(id);
}

/** 무작위 성격 0~2개 (2% 확률로 슈퍼 히든 개방 희귀 선천 특성 발현) */
export function randomTraits(r: RngHolder, base: string[] = []): string[] {
  const out = [...base];
  if (chance(r, 0.02)) {
    const rare = pick(r, SUPER_RARE_TRAIT_IDS as unknown as string[]);
    addTrait(out, rare);
  }
  const n = pick(r, [0, 1, 1, 1, 2, 2]);
  for (let i = 0; i < n; i++) addTrait(out, pick(r, TRAIT_IDS));
  return out.slice(0, 3);
}

/** 부모 성격을 각각 30% 확률로 물려받고, 나머지는 무작위 */
export function inheritTraits(r: RngHolder, a: Person, b: Person): string[] {
  const base: string[] = [];
  for (const t of [...(a.traits ?? []), ...(b.traits ?? [])]) if (chance(r, 0.3)) addTrait(base, t);
  return randomTraits(r, base);
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

const MED_TRACKS = ['track:med_school', 'track:dent_school', 'track:kmd_school', 'track:vet_school', 'track:pharm_school'];
/** 의약계열(의·치·한·수·약대) 재학 중 */
export const isMedStudent = (p: Person) => p.flags.includes('student') && p.flags.some((f) => MED_TRACKS.includes(f));

/** 숨겨진 이복형제가 나타났다: 실제 가족으로 가계도에 올린다 */
export function addHalfSibling(s: GameState, p: Person): Person | undefined {
  const par = parentsOf(s, p).find((q) => q.sex === 'M') ?? parentsOf(s, p)[0];
  if (!par) return undefined;
  const q = createPerson(s, { surname: par.sex === 'M' ? par.surname : p.surname, birthYear: p.birthYear + Math.round(normal(s, 2, 5)), quality: 50, grown: 0.85 });
  if (par.sex === 'M') q.fatherId = par.id;
  else q.motherId = par.id;
  q.inLaw = false;
  q.affinity = 10;
  q.flags.push('half_sib');
  q.job = pick(s, ['office', 'shopkeeper', 'sales', 'factory', 'civil', 'restaurant']);
  q.jobYears = 8;
  s.people[q.id] = q;
  par.childIds.push(q.id);
  return q;
}
