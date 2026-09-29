import { chance, int, next, normal, pick } from './rng';
import { ACHIEVEMENTS, ART_TIERS, EXAMS, FEMALE_NAMES, JOBS, MALE_NAMES, REAL_ESTATE } from './data';
import { checkAchievements } from './achievements';
import { addAsset, addHolding, assetsOf, economyYear, familyWorth, formatMoney, jobLabel, marketYear, pay, personWorth, settlePension, totalWorth } from './economy';
import { checkMissions, initMissions } from './missions';
import { LIFE_RANDOM, cancerRate, deliver, isElectionYear, setBond, type LifeDef } from './life';
import { heirCandidates } from './family';
import { FATE_RANDOM, fateYear, lifeInsurancePayout } from './fate';
import { ROMANCE_RANDOM, romanceYear } from './romance';
import { STORIES } from './stories';
import { chooseSuccessor, giveAsset, giveGift, settleEstate, transferHeadship } from './estate';
import { CREATORS } from './data';
import { exposeFakes, makeDate, marry, examScore, spendable, type Ctx } from './events';
import { EVENTS, RANDOM_EVENTS } from './registry';
import { eun, iga } from './ev-util';
import { deathChance, growthYear } from './growth';
import {
  addFlag,
  age,
  alive,
  check,
  clamp,
  createPerson,
  fullName,
  hasFlag,
  head,
  inherit,
  isDescendantOf,
  isMainline,
  livingMainlineMinors,
  fillGenes,
  hasTrait,
  householder,
  randomTraits,
  relationLabel,
  spouseOf,
} from './people';
import type { AssetKind, GameState, MarketKey, Person, Sex, WillMode } from './types';

export interface NewGameOpts {
  seed?: number;
  familyName: string;
  sex: Sex;
  /** 없으면 무작위 (운명) */
  origin?: GameState['origin'];
}

const START_YEAR = 2025;
const DEFAULT_MARKET: Record<MarketKey, number> = { apt_seoul: 250000, apt_local: 30000, land: 20000, building: 350000, stock: 100, coin: 100, art: 100 };

/** 예전 버전 세이브를 현재 형식으로 */
export function migrate(s: GameState): GameState {
  const v = s.version as number;
  if (v < 2) {
    s.market = { ...DEFAULT_MARKET, ...s.market };
    s.marketChange ??= {};
    s.policy.taxAdvisor ??= false;
    for (const p of Object.values(s.people)) {
      fillGenes(p);
      if (p.flags.includes('med_school') && p.flags.includes('student')) p.flags.push('track:med_school');
    }
    (s as { version: number }).version = 2;
  }
  if ((s.version as number) < 3) {
    s.market = { ...DEFAULT_MARKET, ...s.market };
    s.jobsSeen ??= [];
    s.scheduled ??= [];
    s.willWritten ??= false;
    for (const p of Object.values(s.people)) p.traits ??= randomTraits({ rng: p.birthYear * 7919 + p.id.length });
    for (const p of Object.values(s.people)) if (p.spouseId && p.bond === undefined) p.bond = 60;
    if (!s.missions?.length) {
      s.missions = [];
      initMissions(s);
    }
    s.version = 3;
  }
  return s;
}

/** 부모 직업 후보 (집안 형편별) */
const PARENT_JOBS: Record<GameState['origin'], string[]> = {
  poor: ['factory', 'delivery_rider', 'taxi', 'courier', 'parttime', 'caregiver', 'cvs_owner', 'mechanic', 'welder', 'shopkeeper', 'trucker', 'farmer'],
  middle: ['office', 'civil', 'teacher', 'nurse', 'corp', 'police', 'banker', 'developer', 'public_corp', 'firefighter', 'restaurant', 'pharmacist', 'electrician', 'bus_driver'],
  rich: ['doctor', 'lawyer', 'dentist', 'founder', 'corp', 'professor', 'accountant', 'kmd', 'judge', 'pilot'],
};

export function newGame(o: NewGameOpts): GameState {
  const seed = o.seed ?? Math.floor(Math.random() * 2 ** 31);
  const s: GameState = {
    version: 3,
    rng: seed,
    seed,
    year: START_YEAR,
    startYear: START_YEAR,
    familyName: o.familyName,
    origin: 'middle',
    headId: '',
    founderId: '',
    generation: 1,
    people: {},
    assets: [],
    gifts: [],
    familyCash: 0,
    fame: 0,
    market: { ...DEFAULT_MARKET },
    marketChange: {},
    policy: { lifestyle: 'balance', living: 'normal', familyPlan: 2, children: {}, taxAdvisor: false },
    will: 'legal',
    taxHeat: 0,
    events: [],
    eventSeq: 1,
    idSeq: 1,
    log: [],
    achievements: [],
    jobsSeen: [],
    missions: [],
  };
  // 집안 형편은 운명: 서민 30% · 중산층 52% · 부유층 18% (그중 1/4은 재벌가)
  const roll = next(s);
  const origin = o.origin ?? (roll < 0.3 ? 'poor' : roll < 0.82 ? 'middle' : 'rich');
  const tycoon = origin === 'rich' && chance(s, 0.25);
  s.origin = origin;
  s.fame = { poor: 0, middle: 8, rich: 25 }[origin] + (tycoon ? 25 : 0);
  const q = { poor: 46, middle: 51, rich: 56 }[origin];

  const fAge = int(s, 31, 43);
  const mAge = clamp(fAge + int(s, -5, 2), 28, 42);
  const father = createPerson(s, { sex: 'M', surname: o.familyName, birthYear: START_YEAR - fAge, quality: q, grown: 0.72 });
  const mother = createPerson(s, { sex: 'F', surname: pick(s, ['이', '박', '최', '정', '강', '윤', '한', '조', '장', '임', '오', '서']), birthYear: START_YEAR - mAge, quality: q, grown: 0.72 });
  mother.inLaw = true;
  father.spouseId = mother.id;
  mother.spouseId = father.id;
  father.bond = mother.bond = int(s, 35, 90);
  s.people[father.id] = father;
  s.people[mother.id] = mother;
  const giveJob = (p: Person, pool: string[]) => {
    p.job = tycoon && p === father ? 'founder' : pick(s, pool);
    const j = JOBS[p.job];
    p.jobYears = Math.max(0, age(s, p) - 27);
    p.jobLevel = tycoon && p === father ? 4 : Math.min(j.maxLevel, int(s, 0, Math.floor(p.jobYears / 4)));
  };
  giveJob(father, PARENT_JOBS[origin]);
  if (chance(s, origin === 'poor' ? 0.2 : 0.35)) mother.job = 'none';
  else giveJob(mother, PARENT_JOBS[origin]);

  // 재산: 같은 형편이라도 집집마다 다르다
  if (origin === 'poor') {
    father.cash = int(s, -4000, 2500);
    mother.cash = int(s, 0, 800);
    if (chance(s, 0.35)) addAsset(s, 'apt_local', father.id, s.market.apt_local * 0.6, '낡은 빌라');
  } else if (origin === 'middle') {
    father.cash = int(s, 2000, 15000);
    mother.cash = int(s, 0, 5000);
    if (chance(s, 0.3)) {
      addAsset(s, 'apt_seoul', father.id, s.market.apt_seoul * 0.55, '수도권 아파트');
      father.cash -= int(s, 30000, 80000); // 주택담보대출
    } else addAsset(s, 'apt_local', father.id, s.market.apt_local);
    s.familyCash = int(s, 0, 4000);
    if (chance(s, 0.3)) addAsset(s, 'land', 'family', int(s, 10000, 40000), '종가 토지');
  } else {
    father.cash = int(s, 30000, 100000);
    mother.cash = int(s, 5000, 30000);
    addAsset(s, 'apt_seoul', father.id, s.market.apt_seoul);
    if (chance(s, 0.5)) addAsset(s, 'apt_seoul', mother.id, s.market.apt_seoul * 0.8);
    addAsset(s, 'land', 'family', int(s, 80000, 300000), '종가 토지');
    s.familyCash = int(s, 20000, 80000);
    if (tycoon) {
      addAsset(s, 'building', father.id, s.market.building * 2, '강남 빌딩');
      addHolding(s, 'stock', father.id, int(s, 300000, 1500000)).name = `${o.familyName}씨 그룹 지분`;
      s.familyCash += 200000;
    }
  }

  // 형제자매: 0~3명, 위아래 무작위. 동생은 앞으로 태어난다
  const sibs = pick(s, [0, 0, 1, 1, 1, 1, 2, 2, 3]);
  const older = int(s, 0, sibs);
  const born = (years: number) => {
    s.year = START_YEAR - years;
    const c = inherit(s, father, mother, o.familyName);
    s.year = START_YEAR;
    const a = years;
    for (const k of Object.keys(c.actual) as (keyof typeof c.actual)[]) c.actual[k] = Math.round(c.potential[k] * clamp(0.12 + a * 0.035 + normal(s, 0, 0.05), 0.08, 0.8));
    c.study = a >= 8 ? Math.round(c.actual.int * (0.6 + next(s) * 0.5)) : undefined;
    father.childIds.push(c.id);
    mother.childIds.push(c.id);
    s.people[c.id] = c;
    return c;
  };
  const olderAges = Array.from({ length: older }, () => 5 + int(s, 1, 7)).sort((a, b) => b - a);
  for (const a of olderAges) if (mAge - a >= 22) born(a);
  const me = born(5);
  me.sex = o.sex;
  me.name = pick(s, o.sex === 'M' ? MALE_NAMES : FEMALE_NAMES);
  // 다섯 살까지 쌓인 능력치는 운
  for (const k of Object.keys(me.actual) as (keyof typeof me.actual)[]) me.actual[k] = Math.round(me.potential[k] * (0.12 + next(s) * 0.2));
  me.actual.hp = Math.round(me.potential.hp * (0.45 + next(s) * 0.3));
  me.affinity = 60;
  mother.flags.push('plan:' + (father.childIds.length + (sibs - older)));

  s.headId = me.id;
  s.founderId = me.id;
  s.policy.children[me.id] = { budget: 1, focus: 'free' };
  father.affinity = int(s, 30, 80);
  mother.affinity = int(s, 40, 90);
  for (const c of father.childIds) if (c !== me.id) s.people[c].affinity = int(s, 10, 60);

  const sibTxt = father.childIds.length === 1 ? '외동' : `${father.childIds.length}남매 중 ${father.childIds.indexOf(me.id) + 1}째`;
  const home = assetsOf(s, father.id).concat(assetsOf(s, mother.id));
  const worth = personWorth(s, father) + personWorth(s, mother) + familyWorth(s);
  queue(s, 'notice', me.id, {
    title: `${o.familyName}씨 가문의 시작`,
    text:
      `${START_YEAR - 5}년, ${iga(fullName(me))} 태어났다. ${sibTxt}.\n\n` +
      `👨 아버지 ${fullName(father)} (${age(s, father)}세) · ${jobLabel(father)}\n` +
      `👩 어머니 ${fullName(mother)} (${age(s, mother)}세) · ${mother.job === 'none' ? '전업주부' : jobLabel(mother)}\n` +
      `🏠 ${home.length ? home.map((a) => a.name).join(', ') : '월세살이'} · 집안 재산 ${formatMoney(worth)}` +
      (father.cash < 0 ? ` (빚 ${formatMoney(-father.cash)})` : '') +
      (tycoon ? '\n💎 재벌가의 자손이다!' : '') +
      `\n\n지금 ${START_YEAR}년, ${eun(fullName(me))} 다섯 살.\n이제부터 당신이 이 아이의 인생을, 그리고 가문을 이끈다.\n학창 시절 → 수능 → 진로 → 결혼 → 자녀·손주 → 유언과 승계.`,
    portrait: me.id,
  });
  queue(s, 'kinder', me.id);
  initMissions(s);
  return s;
}

export function queue(s: GameState, defId: string, personId: string, data?: any) {
  s.events.push({ uid: s.eventSeq++, defId, personId, data });
}

const log = (s: GameState, text: string, kind?: GameState['log'][number]['kind']) => s.log.push({ year: s.year, text, kind });

export function mainlineMembers(s: GameState): Person[] {
  return Object.values(s.people).filter((p) => alive(p) && isMainline(s, p));
}

export function familyTotal(s: GameState): number {
  return totalWorth(s, mainlineMembers(s));
}

// ─────────────────────── 한 해 진행 ───────────────────────

export function simulateYear(s: GameState): void {
  if (s.events.length || s.gameOver) return;
  s.year++;
  const h0 = head(s);
  log(s, `── ${s.year}년 · ${fullName(h0)} ${age(s, h0)}세 ──`);

  for (const m of growthYear(s)) log(s, m, 'life');
  const before = familyTotal(s);
  for (const m of economyYear(s)) log(s, m, 'money');
  for (const m of marketYear(s)) log(s, m, 'market');

  retirementAndGraduation(s);
  deaths(s);
  if (s.gameOver) return;
  kinMarriages(s);
  births(s);
  milestones(s);
  adultEvents(s);
  lifeYear(s);
  randomEvents(s);

  for (const p of mainlineMembers(s)) {
    if (age(s, p) >= 20) s.fame += JOBS[p.job].fame * 0.5 * (hasTrait(p, 'ambitious') && JOBS[p.job].fame > 0 ? 1.3 : 1);
    if (!p.inLaw && age(s, p) >= 18 && !['none', 'pension'].includes(p.job) && !s.jobsSeen!.includes(p.job)) s.jobsSeen!.push(p.job);
  }
  s.fame = Math.max(0, Math.round(s.fame * 10) / 10);

  const after = familyTotal(s);
  log(s, `가문 총자산 ${formatMoney(after)} (${after >= before ? '+' : ''}${formatMoney(after - before)})`, 'money');
  checkAchievements(s);
  checkMissions(s);
}

/** 인생사: 성격·금슬·병역·질병·난임·선거·유언 + 무작위 사건 (한 해 최대 2건) */
function lifeYear(s: GameState) {
  const h = head(s);
  const members = mainlineMembers(s);
  for (const p of Object.values(s.people)) {
    if (!alive(p)) continue;
    // 성격이 행복·관계에 스며든다
    if (hasTrait(p, 'cheerful')) p.happiness = clamp(p.happiness + 2, 0, 100);
    if (hasTrait(p, 'anxious')) p.happiness = clamp(p.happiness - 2, 0, 100);
    if (hasTrait(p, 'filial')) p.affinity = clamp(p.affinity + 1, -100, 100);
    if (hasTrait(p, 'spender') && age(s, p) >= 20) p.cash -= 400;
    if (hasTrait(p, 'frugal') && age(s, p) >= 20) p.cash += 250;
  }
  for (const p of members) {
    const a = age(s, p);
    const pending = (id: string) => s.events.some((e) => e.personId === p.id && e.defId === id);
    const sp = spouseOf(s, p);
    // 부부 금슬: 조금씩 식는다. 가정적이면 덜, 바람기 있으면 더
    if (sp && alive(sp) && !p.inLaw) {
      let d = -1.2 + normal(s, 0, 2);
      if (p.id === h.id) d += { work: -1, balance: 0, family: 1.8, self: 0, rest: 0.5 }[s.policy.lifestyle];
      for (const x of [p, sp]) d += hasTrait(x, 'devoted') ? 1 : hasTrait(x, 'flirt') ? -1.5 : 0;
      if (p.happiness > 60 && sp.happiness > 60) d += 0.5;
      setBond(p, sp, (p.bond ?? 60) + d);
      if ((p.bond ?? 60) < 28 && chance(s, 0.35) && !pending('marital_crisis')) queue(s, 'marital_crisis', p.id);
      // 난임
      const mom = p.sex === 'F' ? p : sp;
      const wed = Number(p.flags.find((f) => f.startsWith('wed:'))?.slice(4) ?? s.year);
      const want = p.id === h.id ? s.policy.familyPlan : 2;
      if (!p.childIds.length && want > 0 && !hasFlag(p, 'childfree') && s.year - wed >= 2 && age(s, mom) >= 29 && age(s, mom) <= 44 && chance(s, 0.3) && !pending('infertility'))
        queue(s, 'infertility', p.id);
    }
    // 병역: 남자 20세 (연기했으면 졸업 후)
    if (p.sex === 'M' && !p.inLaw && a >= 20 && a <= 28 && !p.flags.some((f) => ['served', 'exempt', 'draft_dodger'].includes(f) || f.startsWith('serving:')) && !pending('military')) {
      if (a === 20 || (hasFlag(p, 'mil_postponed') && !hasFlag(p, 'student'))) queue(s, 'military', p.id);
    }
    // 암
    if (!p.flags.some((f) => f.startsWith('cancer:')) && chance(s, cancerRate(s, p))) queue(s, 'cancer', p.id);
    // 올림픽(4년)·아시안게임
    if (p.job === 'athlete' && p.jobLevel >= 3 && (s.year % 4 === 0 || s.year % 4 === 2)) queue(s, 'olympic', p.id, { ag: s.year % 4 === 2 });
    // 상장
    if (p.job === 'founder' && p.jobLevel >= 4 && !p.flags.some((f) => f === 'ipo' || f === 'ipo_declined')) queue(s, 'ipo', p.id);
    // 대선
    if (isElectionYear(s.year) && a >= 45 && a <= 72 && !hasFlag(p, 'draft_dodger') && p.job !== 'president' && !hasFlag(p, 'president')) {
      if ((p.job === 'politician' && p.jobLevel >= 2) || (hasFlag(p, 'was_minister') && s.fame >= 120) || (p.job === 'politician' && s.fame >= 150)) queue(s, 'presidential', p.id);
    }
  }
  // 유언장: 가주 65세부터 5년마다
  const ha = age(s, h);
  if (!s.willWritten && ha >= 65 && ha % 5 === 0 && h.childIds.some((id) => alive(s.people[id]))) queue(s, 'will', h.id);

  // 보험료·청약 추첨·예약된 후폭풍 도착
  fateYear(s);
  // 무작위 인생사: 가족 전체에서 최대 2건
  const pool: [LifeDef, Person, number][] = [];
  romanceYear(s);
  for (const p of members) for (const d of [...LIFE_RANDOM, ...FATE_RANDOM, ...ROMANCE_RANDOM]) {
    const w = d.weight?.(s, p) ?? 0;
    if (w > 0) pool.push([d, p, w]);
  }
  // 일상 이야기: 해마다 한두 개
  const stories: [LifeDef, Person, number][] = [];
  for (const p of members) for (const d of STORIES) {
    const w = d.weight?.(s, p) ?? 0;
    if (w > 0) stories.push([d, p, w]);
  }
  for (let i = 0; i < 2 && stories.length && chance(s, i === 0 ? 0.85 : 0.35); i++) {
    const total = stories.reduce((t, [, , w]) => t + w, 0);
    let r = next(s) * total;
    const hit = stories.find(([, , w]) => (r -= w) <= 0) ?? stories[stories.length - 1];
    queue(s, hit[0].id, hit[1].id);
    stories.splice(stories.indexOf(hit), 1);
  }
  for (let i = 0; i < 2 && pool.length; i++) {
    const total = pool.reduce((t, [, , w]) => t + w, 0);
    if (!chance(s, Math.min(0.9, total))) break;
    let r = next(s) * total;
    const hit = pool.find(([, , w]) => (r -= w) <= 0) ?? pool[pool.length - 1];
    queue(s, hit[0].id, hit[1].id);
    pool.splice(pool.indexOf(hit), 1);
  }
}

function retirementAndGraduation(s: GameState) {
  for (const p of Object.values(s.people)) {
    if (!alive(p)) continue;
    const a = age(s, p);
    const grad = p.flags.find((f) => f.startsWith('grad:'));
    if (grad && Number(grad.slice(5)) <= s.year) {
      const track = p.flags.find((f) => f.startsWith('track:'))?.slice(6);
      p.flags = p.flags.filter((f) => f !== grad && f !== 'student' && !f.startsWith('track:') && !f.startsWith('tuition:'));
      graduate(s, p, track);
    }
    // 암 5년 생존 → 완치
    const cancer = p.flags.find((f) => f.startsWith('cancer:'));
    if (cancer && s.year - Number(cancer.split(':')[2]) >= 5) {
      p.flags = p.flags.filter((f) => f !== cancer);
      addFlag(p, 'cancer_survivor');
      if (isMainline(s, p)) log(s, `🎗 ${fullName(p)} 암 완치 판정`, 'life');
    }
    // 전역
    const serving = p.flags.find((f) => f.startsWith('serving:'));
    if (serving && Number(serving.slice(8)) < s.year) {
      p.flags = p.flags.filter((f) => f !== serving);
      addFlag(p, 'served');
      log(s, `🎖 ${fullName(p)} 만기 전역`, 'life');
      if (hasFlag(p, 'officer_served') && isMainline(s, p)) queue(s, 'officer_stay', p.id);
    }
    // 장관 2년, 대통령 5년
    if (p.job === 'minister' && p.jobYears >= 2) {
      const [pj, pl] = (p.flags.find((f) => f.startsWith('prev:'))?.slice(5) ?? 'pension:0').split(':');
      p.job = pj;
      p.jobLevel = Number(pl);
      p.jobYears = 5;
      log(s, `${fullName(p)} 장관 퇴임`, 'life');
    }
    if (p.job === 'president' && p.jobYears >= 5) {
      p.job = 'pension';
      p.flags = p.flags.filter((f) => !f.startsWith('pens:'));
      p.flags.push('pens:15000', 'ex_president');
      log(s, `🇰🇷 ${fullName(p)} 대통령 퇴임`, 'life');
    }
    // 건물주
    const building = s.assets.some((x) => x.kind === 'building' && x.ownerId === p.id);
    if (building && (p.job === 'none' || p.job === 'parttime') && a >= 20 && !hasFlag(p, 'student')) p.job = 'landlord';
    else if (!building && p.job === 'landlord') p.job = 'none';
    // 방계(가주가 바뀌며 곁가지가 된 사람)의 시험은 자동으로
    const prep = p.flags.find((f) => f.startsWith('prep:'))?.slice(5);
    if (prep && !isMainline(s, p)) autoExam(s, p, prep);
    // 프로게이머는 20대 후반에 은퇴 → 스트리머
    if (p.job === 'gamer' && a >= 28) {
      p.job = 'youtuber';
      p.jobLevel = Math.min(3, p.jobLevel);
      p.jobYears = 0;
      log(s, `🎮 ${fullName(p)} 프로게이머 은퇴, 스트리머로 전향`, 'life');
    }
    // 방계 남자는 알아서 병역 (현역 86%)
    if (p.sex === 'M' && !p.inLaw && a === 21 && !isMainline(s, p) && !p.flags.some((f) => f === 'served' || f === 'exempt' || f.startsWith('serving:')))
      addFlag(p, chance(s, 0.93) ? 'served' : 'exempt');
    // 방계 자동 진학
    if (!isMainline(s, p) && a === 19 && !hasFlag(p, 'student') && p.job === 'none') {
      p.flags.push('student', 'univ_local', 'grad:' + (s.year + 4));
    }
    // 정년 (창작·스포츠·정치는 따로)
    const ra = JOBS[p.job].retireAge;
    if (ra && a >= ra) {
      if (p.job !== 'none' && p.job !== 'parttime') log(s, `${fullName(p)} ${JOBS[p.job].kind === 'salary' ? '정년퇴직' : '은퇴'}`, 'life');
      settlePension(p);
      p.job = 'pension';
      p.flags = p.flags.filter((f) => !f.startsWith('prep:') && !f.startsWith('tries:'));
    } else if ((JOBS[p.job].kind === 'creator' || JOBS[p.job].kind === 'business' || p.job === 'politician') && a >= 78) {
      settlePension(p);
      p.job = 'pension';
    }
  }
}

/** 졸업 → 진로. 전문 과정은 국가고시·임용으로 이어진다 */
function graduate(s: GameState, p: Person, track?: string) {
  const main = isMainline(s, p);
  const setJob = (job: Person['job'], level = 0) => {
    p.job = job;
    p.jobLevel = level;
    p.jobYears = 0;
  };
  const prep = (id: string) => {
    p.flags.push('prep:' + id, 'tries:0');
    if (main) queue(s, 'exam', p.id);
  };
  switch (track) {
    case 'med_school':
      setJob('doctor');
      log(s, `🩺 ${fullName(p)} 의사 면허 취득`, 'life');
      return;
    case 'law_school':
      return prep('bar');
    case 'dent_school':
      return prep('dentist');
    case 'kmd_school':
      return prep('kmd');
    case 'vet_school':
      return prep('vet');
    case 'health_pt':
      return prep('pt');
    case 'health_radio':
      return prep('radiographer');
    case 'health_clinical':
      return prep('clinical');
    case 'health_emt':
      return prep('emt');
    case 'edu_elem':
      addFlag(p, 'edu_school');
      return prep('teacher');
    case 'kinder_edu':
      setJob('kinder_teacher');
      log(s, `🧸 ${fullName(p)} 유치원 교사로 취업`, 'life');
      return;
    case 'maritime':
      setJob('navigator');
      log(s, `⚓ ${fullName(p)} 3등 항해사로 승선`, 'life');
      return;
    case 'flight_univ':
      addFlag(p, 'flight_school');
      return prep('pilot');
    case 'grad_school':
      log(s, `🎓 ${fullName(p)} 박사 학위 취득`, 'life');
      return prep('professor');
    case 'pharm_school':
      return prep('pharmacist');
    case 'nurse_school':
      return prep('nurse');
    case 'edu_school':
      return prep('teacher');
    case 'academy':
      setJob('officer');
      log(s, `🎖 ${fullName(p)} 소위 임관`, 'life');
      return;
    case 'police_univ':
      setJob('police', 3);
      log(s, `👮 ${fullName(p)} 경위 임관`, 'life');
      return;
    case 'art_school':
      setJob('painter');
      log(s, `🎨 ${fullName(p)} 미대 졸업, 전업 화가의 길로`, 'life');
      return;
    case 'music_school':
      setJob('musician');
      log(s, `🎻 ${fullName(p)} 음대 졸업, 음악가의 길로`, 'life');
      return;
  }
  if (main) {
    queue(s, 'first_job', p.id);
    return;
  }
  // 방계는 알아서 취업
  const r = next(s);
  const job = p.actual.int > 60 && r < 0.3 ? 'corp' : p.actual.int > 50 && r < 0.55 ? 'civil' : r < 0.65 ? 'teacher' : r < 0.75 ? 'parttime' : 'office';
  setJob(job, 0);
  log(s, `${fullName(p)} ${JOBS[p.job].name}(으)로 취업`, 'life');
}

/** 방계의 시험: 학원 다니는 셈 치고 자동 응시, 3번 떨어지면 포기 */
function autoExam(s: GameState, p: Person, id: string) {
  const e = EXAMS[id];
  const tries = Number(p.flags.find((f) => f.startsWith('tries:'))?.slice(6) ?? 0);
  const clear = () => (p.flags = p.flags.filter((f) => !f.startsWith('prep:') && !f.startsWith('tries:')));
  if (check(s, examScore(p, id, 8), e.pass, 7)) {
    clear();
    p.job = e.job;
    p.jobLevel = e.level;
    p.jobYears = 0;
    log(s, `${fullName(p)} ${e.name} 합격`, 'life');
  } else if (tries >= 2 || (e.maxTries && tries + 1 >= e.maxTries)) {
    clear();
    p.job = 'office';
    p.jobLevel = 0;
  } else {
    p.flags = p.flags.filter((f) => !f.startsWith('tries:'));
    p.flags.push('tries:' + (tries + 1));
  }
}

function causeOf(s: GameState, p: Person): string {
  if (p.flags.some((f) => f.startsWith('cancer:'))) return '암 투병 끝에';
  const a = age(s, p);
  return a > 75 ? '노환으로' : p.actual.hp < 30 ? '지병으로' : a < 50 && chance(s, 0.5) ? '불의의 사고로' : '갑작스러운 병으로';
}

function deaths(s: GameState) {
  const living = Object.values(s.people).filter(alive);
  for (const p of living) {
    if (!alive(p) || !chance(s, deathChance(s, p))) continue;
    const wasHead = p.id === s.headId;
    const mainline = isMainline(s, p) || isRelevant(s, p);
    const cause = causeOf(s, p);
    p.deathYear = s.year;
    log(s, `🕯 ${fullName(p)} ${cause} 별세 (향년 ${age(s, p)}세)`, 'death');
    lifeInsurancePayout(s, p);

    if (wasHead) {
      const next = chooseSuccessor(s, p);
      const rep = settleEstate(s, p, next?.id);
      if (!next) {
        endGame(s, `${fullName(p)}의 사망. 뒤를 이을 자손이 없어 가문이 단절되었다.`);
        return;
      }
      const designated = s.heirId === next.id;
      const adopted = !isDescendantOf(s, next, p);
      if (adopted) addFlag(next, 'adopted_heir');
      transferHeadship(s, next);
      s.policy.lifestyle = 'balance';
      const text =
        `${iga(fullName(p))} ${cause} 세상을 떠났다. (향년 ${age(s, p)}세)` +
        (hasFlag(p, 'will_written') ? '' : '\n유언장은 남기지 않았다.') +
        (adopted ? `\n뒤를 이을 자손이 없어, 문중 회의 끝에 조카를 양자로 들이기로 했다.` : '') +
        '\n\n' +
        rep.lines.join('\n');
      const cands = heirCandidates(s, p);
      s.events.forEach((e) => e.defId === 'choose_heir' && (e.data.deadId = p.id));
      if (!designated && cands.length > 1) {
        s.events.unshift({ uid: s.eventSeq++, defId: 'choose_heir', personId: next.id, data: { text, cands: cands.map((c) => c.id), deadId: p.id } });
      } else {
        queue(s, 'notice', next.id, { title: '가주 승계', text: text + `\n\n이제 ${fullName(next)}(${age(s, next)}세)이(가) ${s.generation}대 가주다.`, portrait: next.id });
        log(s, `👑 ${fullName(next)} ${s.generation}대 가주 승계`, 'succession');
      }
      continue;
    }
    const h = head(s);
    // 가주의 부모: 성인이 된 가주가 형제들과 유산을 나눈다
    if ((p.id === h.fatherId || p.id === h.motherId) && age(s, h) >= 20 && personWorth(s, p) > 0) {
      addFlag(p, 'estate_pending');
      queue(s, 'notice', h.id, { title: '부고', text: `${relationLabel(s, p)} ${fullName(p)}이(가) ${cause} 세상을 떠났다. (향년 ${age(s, p)}세)\n장례를 치르고 나니 유산 이야기가 나온다.`, portrait: p.id });
      queue(s, 'parent_estate', h.id, { deadId: p.id });
      continue;
    }
    const worth = personWorth(s, p);
    const rep = worth !== 0 ? settleEstate(s, p) : undefined;
    if (mainline) {
      queue(s, 'notice', s.headId, {
        title: '부고',
        text: `${fullName(p)}이(가) ${cause} 세상을 떠났다. (향년 ${age(s, p)}세)` + (rep ? '\n\n' + rep.lines.join('\n') : ''),
        portrait: p.id,
      });
    }
  }
}

/** 가주의 부모·형제도 부고 대상 */
function isRelevant(s: GameState, p: Person): boolean {
  const h = head(s);
  return p.id === h.fatherId || p.id === h.motherId || (!!p.fatherId && (p.fatherId === h.fatherId || p.motherId === h.motherId));
}

function fertility(a: number) {
  return a < 20 ? 0 : a < 35 ? 1 : a < 40 ? 0.55 : a < 45 ? 0.2 : 0;
}

/** 방계 친족: 가주의 부모·조부모의 자손 (형제, 조카, 사촌…) */
function isKin(s: GameState, p: Person): boolean {
  const h = head(s);
  const ups = [h.fatherId, h.motherId].filter(Boolean).map((id) => s.people[id!]);
  const gps = ups.flatMap((u) => [u.fatherId, u.motherId].filter(Boolean).map((id) => s.people[id!]));
  return [...ups, ...gps].some((a) => isDescendantOf(s, p, a));
}

/** 방계는 알아서 결혼한다 (나이 들수록 확률↓) */
function kinMarriages(s: GameState) {
  for (const p of Object.values(s.people)) {
    if (!alive(p) || p.inLaw || p.spouseId || isMainline(s, p) || hasFlag(p, 'single_life')) continue;
    const a = age(s, p);
    if (a < 26) continue;
    if (a >= 55) {
      addFlag(p, 'single_life');
      continue;
    }
    if (!isKin(s, p) || !chance(s, dateChance(a, false) * 0.45)) continue;
    const sp = makeDate(s, p);
    marry(s, p, sp);
  }
}

function births(s: GameState) {
  const h = head(s);
  for (const mom of Object.values(s.people)) {
    if (!alive(mom) || mom.sex !== 'F' || !mom.spouseId) continue;
    const dad = s.people[mom.spouseId];
    if (!alive(dad)) continue;
    const couple = [mom, dad];
    const blood = couple.find((x) => x.id === h.id || isDescendantOf(s, x, h));
    // 방계(형제·조카…)와 가주의 부모: 부부마다 원하는 자녀 수가 있다
    const side = blood ? undefined : couple.find((x) => (!x.inLaw && isKin(s, x)) || x.id === h.fatherId || x.id === h.motherId);
    if (!blood && !side) continue;
    if (couple.some((x) => hasFlag(x, 'childfree'))) continue;
    if (side) {
      let plan = mom.flags.find((f) => f.startsWith('plan:'));
      if (!plan) mom.flags.push((plan = 'plan:' + pick(s, [0, 1, 1, 2, 2, 2, 3])));
      if (mom.childIds.length >= Number(plan.slice(5)) || !chance(s, 0.45 * fertility(age(s, mom)))) continue;
      const kids = deliver(s, dad, mom, side.inLaw ? dad.surname : side.surname, 0.015, false);
      for (const k of kids) {
        delete s.policy.children[k.id];
        k.affinity = int(s, 20, 60);
      }
      continue;
    }
    if (!blood) continue;
    const target = couple.some((x) => x.id === h.id) ? s.policy.familyPlan : 2;
    const kids = mom.childIds.filter((id) => alive(s.people[id])).length;
    if (kids >= target) continue;
    const pr = 0.55 * fertility(age(s, mom)) * clamp(mom.actual.hp / 50, 0.5, 1.2);
    if (!chance(s, pr)) continue;
    deliver(s, dad, mom, blood.surname, 0.015);
  }
}

function milestones(s: GameState) {
  for (const p of livingMainlineMinors(s)) {
    const a = age(s, p);
    const ev = { 5: 'kinder', 8: 'elementary', 11: 'aptitude', 12: 'dream', 14: 'middle', 17: 'high', 19: 'path' }[a];
    if (ev) queue(s, ev, p.id);
    // 매 학년: 어떻게 보낼지 고른다
    if (a >= 9 && a <= 18 && a !== 11 && a !== 14 && a !== 17) queue(s, 'school_year', p.id);
    if (a >= 13 && p.happiness < 25 && chance(s, hasTrait(p, 'rebel') ? 0.8 : 0.5)) queue(s, 'rebellion', p.id);
  }
  // 재수·삼수…: 매년 수능
  for (const p of mainlineMembers(s)) if (hasFlag(p, 'retaking') && age(s, p) >= 20) queue(s, 'path', p.id);
}

/** 소개팅 빈도: 30대 초반까지 매년, 이후 점점 뜸해진다 */
function dateChance(a: number, isHead: boolean): number {
  if (a < 26) return 0;
  if (a <= 29) return isHead ? 0.55 : 0.35;
  if (a <= 35) return isHead ? 0.9 : 0.6;
  if (a <= 44) return 0.5;
  if (a <= 54) return 0.25;
  return 0;
}

function adultEvents(s: GameState) {
  const h = head(s);
  for (const p of mainlineMembers(s)) {
    const a = age(s, p);
    if (a < 20 || p.inLaw) continue;
    const pending = (id: string) => s.events.some((e) => e.personId === p.id && e.defId === id);
    if (p.job === 'none' && !hasFlag(p, 'student') && hasFlag(p, 'failed_pro') && chance(s, 0.6)) {
      p.flags = p.flags.filter((f) => f !== 'failed_pro');
      queue(s, 'first_job', p.id);
    }
    // 시험 준비생은 매년 응시
    if (p.flags.some((f) => f.startsWith('prep:')) && !pending('exam')) queue(s, 'exam', p.id);
    if (p.job === 'athlete' && a === 34) queue(s, 'athlete_retire', p.id);
    // 창작 직업이 몇 년째 안 뜨면 고민
    if (CREATORS[p.job] && p.jobLevel === 0 && p.jobYears >= 3 && p.jobYears % 3 === 0) queue(s, 'yt_slump', p.id);
    // 출마 제안 / 재선
    if (p.job === 'politician' && p.jobYears > 0 && p.jobYears % 4 === 0) queue(s, 'election', p.id);
    else if (p.job !== 'politician' && a >= 40 && a <= 65 && (s.fame >= 40 || ['lawyer', 'professor', 'journalist'].includes(p.job) || p.jobLevel >= 4) && chance(s, 0.06))
      queue(s, 'election', p.id);
    // 소개팅
    const single = !p.spouseId || !alive(s.people[p.spouseId]);
    if (single && !p.partnerId && !hasFlag(p, 'single_life') && !pending('blind_date') && chance(s, dateChance(a, p.id === h.id) * (p.spouseId || hasFlag(p, 'divorced') ? 0.5 : 1))) {
      queue(s, 'blind_date', p.id, { cand: makeDate(s, p) });
    }
  }
  for (const p of Object.values(s.people)) {
    if (alive(p) && hasFlag(p, 'grievance') && chance(s, 0.5)) queue(s, 'grievance', p.id);
  }
}

function randomEvents(s: GameState) {
  const h = head(s);
  if (age(s, h) < 20) return;
  const rolls = chance(s, 0.7) ? (chance(s, 0.25) ? 2 : 1) : 0;
  const used = new Set<string>();
  for (let i = 0; i < rolls; i++) {
    const ctx: Ctx = { s, p: h, ev: { uid: 0, defId: '', personId: h.id } };
    const pool = RANDOM_EVENTS.filter((e) => !used.has(e.id)).map((e) => [e, e.weight(ctx)] as const).filter(([, w]) => w > 0);
    const total = pool.reduce((t, [, w]) => t + w, 0);
    if (!total) return;
    let r = next(s) * total;
    for (const [e, w] of pool) {
      r -= w;
      if (r <= 0) {
        used.add(e.id);
        queue(s, e.id, h.id);
        break;
      }
    }
  }
}

function endGame(s: GameState, reason: string) {
  const score = Math.round(s.fame + familyTotal(s) / 10000 + s.generation * 50 + s.achievements.length * 30);
  s.gameOver = { reason, score };
  s.events = [];
  log(s, `⚰ ${reason}`, 'death');
}

// ─────────────────────── 이벤트 처리 ───────────────────────

/** 죽은 사람 앞으로 온 이벤트도 보여주는 것들 */
const FOR_THE_DEAD = new Set(['notice', 'choose_heir', 'parent_estate', 'naming']);

export function currentEvent(s: GameState): ReturnType<typeof eventView> | undefined {
  // 그사이 상황이 바뀐 이벤트(사망·이혼 등)는 건너뛴다
  while (s.events.length) {
    const ev = s.events[0];
    const def = EVENTS[ev.defId];
    const p = s.people[ev.personId];
    const ctx: Ctx = { s, p, ev };
    if (def && p && (alive(p) || FOR_THE_DEAD.has(def.id)) && (def.valid?.(ctx) ?? true)) return eventView(ctx);
    s.events.shift();
  }
  return undefined;
}

function eventView(ctx: Ctx) {
  const { ev, p } = ctx;
  const def = EVENTS[ev.defId];
  const text = def.text(ctx);
  const choices = def.choices(ctx);
  // 돈이 없어 고를 게 하나도 없으면 막히지 않게 탈출구를 준다
  if (choices.every((c) => c.disabled)) choices.push({ label: '어쩔 수 없다 (그냥 넘긴다)', run: () => '할 수 있는 게 없었다.' });
  return { ev, def, ctx, title: def.title(ctx), text, choices, portraits: def.portraits?.(ctx) ?? [p] };
}

export function resolveChoice(s: GameState, idx: number): string {
  const cur = currentEvent(s);
  if (!cur) return '';
  const ch = cur.choices[idx];
  if (!ch || ch.disabled) return '';
  if (ch.cost) pay(s, householder(s), ch.cost);
  const res = ch.run(cur.ctx);
  const text = typeof res === 'string' ? res : res.text;
  if (typeof res === 'string' || !res.keep) s.events.shift();
  if (text && cur.def.id !== 'notice') log(s, `[${cur.title}] ${ch.label} → ${text.split('\n')[0]}`, 'life');
  checkAchievements(s);
  return text;
}

// ─────────────────────── 플레이어 행동 ───────────────────────

export function designateHeir(s: GameState, id: string) {
  s.heirId = id;
  const p = s.people[id];
  p.affinity = clamp(p.affinity + 10, -100, 100);
  log(s, `${fullName(p)}을(를) 후계자로 지명`, 'succession');
}

export function setWill(s: GameState, w: WillMode) {
  s.will = w;
}

export function canRetire(s: GameState): string | true {
  const h = head(s);
  if (age(s, h) < 60) return '60세부터 은퇴할 수 있습니다';
  const heir = s.heirId && s.people[s.heirId];
  if (!heir || !alive(heir)) return '먼저 후계자를 지명하세요';
  if (age(s, heir) < 20) return '후계자가 성인이어야 합니다';
  return true;
}

export function retire(s: GameState): string {
  const r = canRetire(s);
  if (r !== true) return r;
  const h = head(s);
  const heir = s.people[s.heirId!];
  h.job = 'pension';
  addFlag(h, 'retired');
  transferHeadship(s, heir);
  log(s, `👑 ${fullName(h)} 은퇴, ${fullName(heir)} ${s.generation}대 가주 승계`, 'succession');
  return `${fullName(heir)}이(가) ${s.generation}대 가주가 되었다. ${fullName(h)}은(는) 원로로 물러났다.\n(원로의 재산은 사망 시 법정상속된다. 미리 증여해두면 절세에 유리하다.)`;
}

export function aptitudeTest(s: GameState, id: string): string {
  const p = s.people[id];
  const h = head(s);
  pay(s, h, 300);
  p.potentialKnown = true;
  for (const t of p.talents) t.discovered = true;
  addFlag(p, 'tested');
  return p.talents.length ? '정밀 적성검사 결과, 숨은 재능과 잠재력이 모두 드러났다.' : '정밀 적성검사 결과: 뚜렷한 재능은 없다. 잠재력은 확인되었다.';
}

export const BUY_TAX = 0.04;
/** 주식·코인 거래 수수료 */
export const TRADE_FEE = 0.003;

export function artPrice(s: GameState, tier: number): number {
  return Math.round((ART_TIERS[tier].price * s.market.art) / 100);
}

/** 매수 가능 여부 (부동산은 40%만 있으면 대출, 나머지는 현금으로 전액) */
export function canBuy(s: GameState, kind: AssetKind, amount = 0): boolean {
  if (REAL_ESTATE.includes(kind)) return spendable(s) >= s.market[kind as 'land'] * 0.4;
  return spendable(s) >= amount;
}

export function buyAsset(s: GameState, kind: AssetKind, amount = 0): string {
  const h = head(s);
  if (kind === 'stock' || kind === 'coin') {
    if (!canBuy(s, kind, amount)) return '현금이 부족합니다';
    pay(s, h, Math.round(amount * (1 + TRADE_FEE)));
    addHolding(s, kind, h.id, amount);
    return `${kind === 'stock' ? '주식' : '코인'} ${formatMoney(amount)} 매수`;
  }
  if (kind === 'art') {
    const tier = amount;
    const price = artPrice(s, tier);
    if (!canBuy(s, 'art', price)) return '현금이 부족합니다';
    pay(s, h, price);
    const a = addAsset(s, 'art', h.id, price, ART_TIERS[tier].name);
    a.fake = chance(s, ART_TIERS[tier].fake);
    return `${a.name}을(를) ${formatMoney(price)}에 샀다. 진품이길…`;
  }
  const price = s.market[kind];
  const total = Math.round(price * (1 + BUY_TAX));
  pay(s, h, total);
  addAsset(s, kind, h.id, price);
  return `${formatMoney(price)}에 매수 (취득세 ${formatMoney(total - price)})` + (h.cash < 0 ? ` · 대출 ${formatMoney(-h.cash)}` : '');
}

export function sellAsset(s: GameState, assetId: string): string {
  const a = s.assets.find((x) => x.id === assetId);
  if (!a) return '';
  const fake = exposeFakes(s, [a]).length > 0;
  const got = Math.round(a.value * (a.kind === 'stock' || a.kind === 'coin' ? 1 - TRADE_FEE : 1));
  if (a.ownerId === 'family') s.familyCash += got;
  else s.people[a.ownerId].cash += got;
  s.assets = s.assets.filter((x) => x.id !== assetId);
  if (fake) log(s, `😱 ${a.name} — 매각 감정에서 위작 판정`, 'money');
  return fake ? `감정 결과 위작! ${formatMoney(got)}밖에 못 받았다` : `${a.name} 매각: ${formatMoney(got)}`;
}

export function gift(s: GameState, toId: string, amount: number): string {
  const r = giveGift(s, head(s), s.people[toId], amount);
  if (r.ok) log(s, `🎁 ${r.msg}`, 'money');
  return r.msg;
}

export function giftAsset(s: GameState, toId: string, assetId: string): string {
  const r = giveAsset(s, head(s), s.people[toId], assetId);
  if (r.ok) log(s, `🎁 ${r.msg}`, 'money');
  return r.msg;
}

export function setTaxAdvisor(s: GameState, on: boolean) {
  s.policy.taxAdvisor = on;
}

export { ACHIEVEMENTS, spouseOf };
