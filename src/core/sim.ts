import { chance, int, next, normal, pick } from './rng';
import { ACHIEVEMENTS, ART_TIERS, EXAMS, JOBS, REAL_ESTATE, SURNAMES } from './data';
import { checkAchievements } from './achievements';
import { setMoneyYear, addAsset, addHolding, assetsOf, economyYear, familyWorth, foldFamilyPot, formatMoney, jobLabel, marketYear, pay, personWorth, settlePension, severance, totalWorth } from './economy';
import { checkMissions, initMissions } from './missions';
import { LIFE_RANDOM, cancerRate, deliver, isElectionYear, setBond, type LifeDef } from './life';
import { heirCandidates } from './family';
import { FATE_RANDOM, fateYear, lifeInsurancePayout } from './fate';
import { ROMANCE_RANDOM, romanceYear } from './romance';
import { nestYear } from './nest';
import { isRealty, mortgageFromCash, rollListings, sellRealty } from './realty';
import { afterHomeSold, homeOf, settleHome } from './housing';
import { giveUsedCar } from './vehicle';
import { debtYear } from './debt';
import { queueFuneral } from './lifecost';
import { DECEPTION_EVENTS } from './deception';
import { K_REALITY_RANDOM } from './k-reality';
import { fitCats, HOBBY_AGES } from './interests';
import { buyPower, leverageYear, stockQuote } from './leverage';
import { bindState } from './school';
import { STORIES } from './stories';
import { SEED_EVENTS, seedYear } from './seeds';
import { apMax, autoGiftYear } from './actions';
import { bondDrift } from './marks';
import { chooseSuccessor, giveAsset, giveGift, settleEstate, transferHeadship } from './estate';
import { CREATORS, JOB_CATS, TALENT_IDS, TALENTS } from './data';
import { exposeFakes, makeDate, marry, examScore, spendable, type Ctx } from './events';
import { EVENTS, RANDOM_EVENTS } from './registry';
import { eraYear } from './era';
import { rivalYear } from './rival';
import { careerYear, ministerLeaves, presidentLeaves } from './career';
import { powerYear } from './power';
import { power2Year, presTerm } from './power2';
import { applyAncestor, applyLegacy, applyPerma, hasPerma } from './legacy';
import { handoverYear } from './handover';
import { companyStoryYear, companyYear } from './companies';
import { sagaYear, startInheritanceDrama } from './saga';
import { obituary } from './obituary';
import { dutyDone, dutyYear, onDuty } from './duty';
import { GLORY_SCALE, achvRarity, checkHonors, capStats, perkYear, retireHonor } from './rewards';
import { scanMilestones } from './milestones';
import { cardCapBonus, cardYear } from './cards';
import { scandalYear } from './scandal';
import { assignWoes, woeYear, woesOf, WOES } from './woes';
import { eggForKids, eggYear, scheduleEggs } from './nestegg';
import { spouseYear } from './spouse';
import { anachronistic, histOverride, inHistory, periodize, TIMELESS } from './histpack';
import { HIST_PARENT_JOBS, HIST_START, histOrigins, histYear } from './history';
import { timelineYear } from './timeline';
import { chainYear } from './chains';
import { warYear } from './war';
import { medicalYear } from './medical-events';
import { HIST_BASE, histPrice, histRel } from './histidx';
import { autonomyYear } from './autonomy';
import { grantLicense, hasAnyLicense, hasLicense, getLicenses, savePreviousLevel, calculateReturnLevel, LICENSED_JOBS } from './licenses';
import { PUBLIC_EXAMS } from './jobs';
import { crimeYear } from './crimes';
import { lifeReport, trackPeak } from './score';
import { wageIndex } from './pay';
import { BOSS_STORIES, selfBoss } from './boss';
import { hiddenYear } from './hidden';
import { inlawYear, kinDrift } from './inlaws';
import { superHiddenYear } from './super-hidden';
import { gateYear } from './super-gates';
import { casinoYear } from './casino';
import { commEvent } from './devices';
import { pathYear } from './hidden-paths';
import { photoYear } from './photos';
import { relicYear } from './relics';
import { vipCureYear } from './vip-cure';
import { bigYear } from './big-events';
import { treasureSellValue, treasureYear } from './treasure';
import { HIDDEN_BY_ID, isSuperHidden } from './hidden-data';
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
  parentsOf,
  freshName,
  randomName,
  addTrait,
} from './people';
import type { Ancestor, AssetKind, GameState, MarketKey, Person, Sex, WillMode } from './types';

export interface NewGameOpts {
  seed?: number;
  familyName: string;
  sex: Sex;
  /** 없으면 무작위 (운명) */
  origin?: GameState['origin'];
  /** 난이도: 집안 형편·부모 직업·재산·아이의 유전(잠재력·재능·성격)까지 정한다. 없으면 운명 */
  difficulty?: Difficulty;
  /** 근현대사 모드 (1960년 시작) */
  era?: 'history';
  /** 유산 상점에서 산 시작 혜택 (legacy.ts) */
  legacy?: string[];
  /** 계정의 가문 내력 (영구) */
  perma?: string[];
  /** 지난 가문의 조상 카드 */
  ancestor?: Ancestor;
}

export type Difficulty = 'easy' | 'normal' | 'hard' | 'hell';
/** 난이도별: 형편, 재벌가 확률, 부모 잠재력 보정, 아이 잠재력 보정, 부모 직급 보정 */
export const DIFFICULTY: Record<Difficulty, { name: string; desc: string; origin: GameState['origin']; tycoon: number; parentQ: number; childQ: number; level: number }> = {
  easy: { name: '쉬움 · 금수저', desc: '부유한 집(재벌가일 수도), 전문직 부모와 높은 직급, 뛰어난 유전자 — 잠재력↑, 재능 하나는 타고난다, 좋은 성격. 정점 도전이 쉽지만 명예는 0.8배', origin: 'rich', tycoon: 0.12, parentQ: 3, childQ: 5, level: 1 },
  normal: { name: '보통 · 중산층', desc: '평범한 직장인 부모, 수도권·지방 아파트, 보통의 유전자', origin: 'middle', tycoon: 0, parentQ: 0, childQ: 0, level: 0 },
  hard: { name: '어려움 · 흙수저', desc: '가난한 집, 빚과 반지하, 생계형 직업 부모, 불리한 유전자 — 잠재력↓, 재능 없음, 약점 하나. 정점 도전이 어렵고 라이벌이 강하지만 명예를 1.25배 받는다', origin: 'poor', tycoon: 0, parentQ: -2, childQ: -4, level: -1 },
  hell: { name: '지옥 · 무일푼', desc: '가장 가난한 집, 약한 유전자, 부자 라이벌. 정점 도전 판정이 훨씬 어렵다. 대신 명예를 1.5배 받는다 — 여기서 대통령을 내면 전설이다', origin: 'poor', tycoon: 0, parentQ: -4, childQ: -5, level: -1 },
};

const BASE_START = 2025;
const DEFAULT_MARKET: Record<MarketKey, number> = { apt_seoul: 250000, apt_local: 30000, land: 20000, building: 350000, stock: 100, coin: 100, art: 100 };

/** 예전 버전 세이브를 현재 형식으로 */
/** 게임에서 빠진 히든 직업(15세 등급 정리)의 흔적을 옛 저장에서 걷어 낸다. 여러 번 불러도 같다 */
function dropRetiredHidden(s: GameState): void {
  const gone = (id: unknown) => typeof id === 'string' && id.startsWith('hj_') && !HIDDEN_BY_ID[id];
  for (const p of Object.values(s.people)) {
    if (gone(p.job)) {
      p.job = 'none';
      p.jobLevel = 0;
      p.jobYears = 0;
    }
    p.flags = p.flags.filter((f) => {
      const m = /^(?:hidden:|sh:|hq:|hp:)(hj_[a-z0-9_]+)/.exec(f);
      return !(m && gone(m[1]));
    });
  }
  s.cards = (s.cards ?? []).filter((c) => !gone(c.id));
  s.events = s.events.filter((e) => !gone((e.data as { id?: unknown } | undefined)?.id));
  if (s.jobsSeen) s.jobsSeen = s.jobsSeen.filter((j) => !gone(j));
}

/** 📖 직업 도감: 가주의 부모·배우자·자녀·손주와 직계 모두 (사돈은 빼고, 배우자는 넣는다). 가장 높았던 직업(peakjob)도 */
export function recordJobs(s: GameState) {
  const seen = (s.jobsSeen ??= []);
  const h = s.people[s.headId];
  const near = new Set<string>(h ? [h.id, h.spouseId ?? '', h.fatherId ?? '', h.motherId ?? '', ...h.childIds] : []);
  for (const p of Object.values(s.people)) {
    const mainline = isMainline(s, p);
    const spouseOfLine = p.inLaw && Object.values(s.people).some((q) => q.spouseId === p.id && !q.inLaw && (isMainline(s, q) || near.has(q.id)));
    if (!mainline && !near.has(p.id) && !spouseOfLine) continue;
    const add = (j?: string) => j && JOBS[j] && !['none', 'pension', 'parttime'].includes(j) && !seen.includes(j) && seen.push(j);
    if (alive(p) && age(s, p) >= 18) add(p.job);
    add(p.flags.find((f) => f.startsWith('peakjob:'))?.split(':')[1]);
  }
}

export function migrate(s: GameState): GameState {
  bindState(s);
  s.achievements ??= [];
  // 보상 시스템 이전 저장: 이미 이룬 업적만큼 명예를 채워 준다 (팝업 없이)
  if (s.gloryTotal === undefined) {
    const pts = { common: 5, rare: 12, epic: 30, legend: 80 } as const; // 옛 눈금 (아래 v4 이전에서 다시 줄인다)
    const t = s.achievements.reduce((sum, id) => {
      const r = ACHIEVEMENTS[id] ? achvRarity(id, ACHIEVEMENTS[id].cat) : undefined;
      return sum + (r ? pts[r] : 0);
    }, 0);
    s.glory = s.gloryTotal = t;
  }
  s.cards ??= [];
  s.honors ??= [];
  s.perks ??= {};
  s.rewards ??= [];
  s.scandal ??= 0;
  s.cleanYears ??= 0;
  s.storySeen ??= {};
  dropRetiredHidden(s);
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
    (s as { version: number }).version = 3;
  }
  if ((s.version as number) < 4) {
    // 명예 배점이 절반으로 줄었다 (rewards.ts GLORY_SCALE): 누적 명예도 같은 눈금으로 맞춘다. 쓸 수 있는 명예(✦)는 그대로.
    s.gloryTotal = Math.round((s.gloryTotal ?? 0) * GLORY_SCALE);
    s.version = 4;
  }
  foldFamilyPot(s);
  if (!s.listings) {
    rollListings(s);
    for (const p of Object.values(s.people)) mortgageFromCash(s, p); // 예전 저장: 주담대가 마이너스 현금으로 남아 있었다
  }
  if (!homeOf(s, householder(s))) settleHome(s, householder(s));
  recordJobs(s); // 예전 저장도 부모·배우자·자녀 직업을 도감에
  return s;
}

/** 부모 직업 후보 (집안 형편별) */
const PARENT_JOBS: Record<GameState['origin'], string[]> = {
  poor: ['factory', 'delivery_rider', 'taxi', 'courier', 'parttime', 'caregiver', 'cvs_owner', 'mechanic', 'welder', 'shopkeeper', 'trucker', 'farmer', 'plumber', 'carpenter', 'nurse_aide', 'hairdresser', 'barista', 'fisher', 'rancher', 'crane_operator', 'mail_carrier', 'pet_groomer', 'nail_artist', 'restaurant', 'online_shop', 'big_factory', 'bus_driver', 'shipbuilder', 'youtuber', 'insurance', 'sales'],
  middle: ['office', 'civil', 'teacher', 'nurse', 'corp', 'police', 'banker', 'developer', 'public_corp', 'firefighter', 'restaurant', 'pharmacist', 'electrician', 'bus_driver', 'mail_carrier', 'hr', 'marketer', 'sales', 'insurance', 'trader', 'pt', 'radiographer', 'clinical', 'emt', 'kinder_teacher', 'librarian', 'chef', 'hotelier', 'flight_attendant', 'big_factory', 'shipbuilder', 'train_driver', 'navigator', 'designer', 'journalist', 'pd', 'writer', 'youtuber', 'trainer', 'coach', 'cafe_owner', 'online_shop', 'smart_farmer', 'game_dev', 'mech_engineer', 'architect', 'researcher', 'tax_officer', 'coast_guard', 'social_worker', 'realtor', 'tutor', 'photographer', 'scrivener', 'labor_attorney', 'customs_broker', 'vet', 'data_scientist', 'security', 'chip_engineer', 'founder', 'musician', 'officer'],
  rich: ['doctor', 'lawyer', 'dentist', 'founder', 'corp', 'professor', 'accountant', 'kmd', 'judge', 'pilot', 'prosecutor', 'diplomat', 'patent_attorney', 'tax_accountant', 'appraiser', 'analyst', 'aero_engineer', 'entertainer', 'architect', 'vet', 'pharmacist', 'announcer', 'tutor', 'restaurant', 'online_shop', 'data_scientist', 'chip_engineer', 'fund_manager', 'consultant', 'sme_ceo', 'franchise_ceo', 'developer_re', 'film_director', 'film_actor', 'singer', 'fashion_designer', 'curator', 'star_lecturer', 'ai_engineer', 'bio_researcher', 'public_corp', 'landlord', 'politician', 'sommelier', 'interior_designer'],
};

/** 쉬움(금수저) 부모의 높은 자리: 재벌 총수만이 아니라 법조·의료·학계·정계·금융·문화계의 정점들.
 *  직급은 높게 시작한다 (giveJob 에서 +1~2). */
const ELITE_JOBS = ['judge', 'prosecutor', 'lawyer', 'doctor', 'dentist', 'professor', 'diplomat', 'politician', 'fund_manager', 'consultant', 'sme_ceo', 'franchise_ceo', 'developer_re', 'film_director', 'film_actor', 'singer', 'entertainer', 'announcer', 'architect', 'pilot', 'patent_attorney', 'accountant', 'star_lecturer', 'public_corp', 'corp', 'landlord', 'researcher', 'aero_engineer', 'fashion_designer', 'curator'];
/** 지옥(무일푼): 가장 불안정한 일들 */
const HELL_JOBS = ['parttime', 'delivery_rider', 'courier', 'caregiver', 'nurse_aide', 'factory', 'taxi', 'trucker', 'security_guard', 'tile_worker', 'barista', 'fisher', 'farmer'];
/** 부모의 원래 직업 → 이어질 수 있는 희귀 직업 (부모 나이 30~43세, 성별·나이 조건이 맞는 것만) */
const RARE_FROM: Record<string, string[]> = {
  fisher: ['hj_pirate', 'hj_smuggler'], navigator: ['hj_pirate', 'hj_smuggler'], shipbuilder: ['hj_pirate'], ship_captain: ['hj_pirate', 'hj_smuggler'],
  trucker: ['hj_smuggler', 'hj_nomad'], taxi: ['hj_nomad', 'hj_drifter'], delivery_rider: ['hj_nomad', 'hj_fighter'], courier: ['hj_smuggler', 'hj_nomad'], bus_driver: ['hj_nomad'],
  factory: ['hj_fighter'], big_factory: ['hj_fighter'], welder: ['hj_fighter', 'hj_mercenary'], mechanic: ['hj_drifter', 'hj_smuggler'], crane_operator: ['hj_mercenary'],
  officer: ['hj_mercenary', 'hj_bodyguard'], police: ['hj_bounty', 'hj_bodyguard'], coast_guard: ['hj_bounty', 'hj_pirate'], firefighter: ['hj_bodyguard'],
  security: ['hj_hacker'], developer: ['hj_hacker'], game_dev: ['hj_hacker', 'hj_memecoin'], data_scientist: ['hj_hacker', 'hj_trader'], chip_engineer: ['hj_hacker'], ai_engineer: ['hj_hacker'],
  aero_engineer: ['hj_space_analyst'], pilot: ['hj_space_analyst', 'hj_smuggler'], air_controller: ['hj_space_analyst'],
  trader: ['hj_trader', 'hj_memecoin'], banker: ['hj_trader'], analyst: ['hj_trader'], fund_manager: ['hj_trader', 'hj_memecoin'], insurance: ['hj_gambler'], sales: ['hj_gambler', 'hj_magician'],
  clergy: ['hj_exorcist', 'hj_stargazer'], social_worker: ['hj_tarot', 'hj_stargazer'], psychologist: ['hj_tarot', 'hj_stargazer'],
  entertainer: ['hj_magician'], actor: ['hj_magician'], film_actor: ['hj_magician'], musician: ['hj_magician', 'hj_nomad'], singer: ['hj_magician'], comedian: ['hj_magician'],
  painter: ['hj_forger', 'hj_art_investigator'], designer: ['hj_forger'], illustrator: ['hj_forger'], curator: ['hj_art_investigator', 'hj_conservator'], appraiser: ['hj_art_investigator'],
  photographer: ['hj_adventurer', 'hj_nomad'], journalist: ['hj_spy', 'hj_adventurer'], pd: ['hj_adventurer'], tour_guide: ['hj_nomad', 'hj_adventurer'], flight_attendant: ['hj_nomad'], translator: ['hj_spy'], diplomat: ['hj_spy'],
  chef: ['hj_michelin_inspector'], restaurant: ['hj_michelin_inspector'], sommelier: ['hj_michelin_inspector', 'hj_perfumer'], baker: ['hj_michelin_inspector'],
  pharmacist: ['hj_perfumer'], florist: ['hj_perfumer'], makeup_artist: ['hj_perfumer', 'hj_tarot'], hairdresser: ['hj_tarot'], nail_artist: ['hj_tarot'],
  librarian: ['hj_conservator'], researcher: ['hj_conservator', 'hj_hacker'], professor: ['hj_conservator'],
  farmer: ['hj_natural', 'hj_shaman'], smart_farmer: ['hj_natural'], rancher: ['hj_natural'],
  athlete: ['hj_fighter', 'hj_bodyguard'], trainer: ['hj_fighter', 'hj_bodyguard'], coach: ['hj_fighter'], sports_instructor: ['hj_fighter', 'hj_bodyguard'],
  landlord: ['hj_trader', 'hj_mafia', 'hj_godmother'], founder: ['hj_trader', 'hj_memecoin'], sme_ceo: ['hj_gambler', 'hj_mafia', 'hj_godmother'], franchise_ceo: ['hj_mafia', 'hj_godmother'], developer_re: ['hj_gambler', 'hj_mafia', 'hj_godmother'],
  bartender: ['hj_gambler', 'hj_underground_dealer'], parttime: ['hj_gambler', 'hj_fighter'], none: ['hj_gambler', 'hj_natural'],
};
function parentRareFrom(p: Person, from: string, origin: GameState['origin'], a: number): string[] {
  const list = RARE_FROM[from] ?? (origin === 'poor' ? ['hj_gambler', 'hj_fighter'] : origin === 'rich' ? ['hj_trader'] : []);
  return list.filter((id) => {
    if (!HIDDEN_BY_ID[id]) return false;
    if (id === 'hj_mafia') return p.sex === 'M';
    if (id === 'hj_fighter') return a <= 40;
    if (id === 'hj_godmother' || id === 'hj_drifter') return p.sex === 'F';
    if (id === 'hj_underground_dealer') return a <= 40;
    if (id === 'hj_stargazer') return a >= 30;
    return true;
  });
}


export function newGame(o: NewGameOpts): GameState {
  const seed = o.seed ?? Math.floor(Math.random() * 2 ** 31);
  // 근현대사 모드: 1960년, 다섯 살(1955년생)로 시작
  const hist = o.era === 'history';
  const START_YEAR = hist ? HIST_START : BASE_START;
  const s: GameState = {
    version: 4,
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
    market: hist ? (Object.fromEntries(Object.keys(DEFAULT_MARKET).map((k) => [k, Math.round(histPrice(HIST_BASE[k as MarketKey], k as MarketKey, HIST_START))])) as Record<MarketKey, number>) : { ...DEFAULT_MARKET },
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
  const dif = o.difficulty ? DIFFICULTY[o.difficulty] : undefined;
  const origin = o.origin ?? dif?.origin ?? (roll < 0.3 ? 'poor' : roll < 0.82 ? 'middle' : 'rich');
  const tycoon = origin === 'rich' && chance(s, dif ? dif.tycoon : 0.25);
  if (o.difficulty) s.difficulty = o.difficulty;
  if (hist) s.era = 'history';
  s.origin = origin;
  s.fame = { poor: 0, middle: 8, rich: 25 }[origin] + (tycoon ? 25 : 0);
  const q = { poor: 46, middle: 51, rich: 56 }[origin] + (dif?.parentQ ?? 0);

  const fAge = int(s, 31, 43);
  const mAge = clamp(fAge + int(s, -5, 2), 28, 42);
  const father = createPerson(s, { sex: 'M', surname: o.familyName, birthYear: START_YEAR - fAge, quality: q, grown: 0.72 });
  const mother = createPerson(s, { sex: 'F', surname: pick(s, SURNAMES.filter((n) => n !== o.familyName)), birthYear: START_YEAR - mAge, quality: q, grown: 0.72 });
  mother.inLaw = true;
  father.spouseId = mother.id;
  mother.spouseId = father.id;
  father.bond = mother.bond = int(s, 35, 90);
  s.people[father.id] = father;
  s.people[mother.id] = mother;
  const giveJob = (p: Person, pool: string[], avoid?: string) => {
    const cands = pool.filter((j) => j !== avoid && JOBS[j]);
    p.job = tycoon && p === father ? 'founder' : pick(s, cands.length ? cands : pool);
    const j = JOBS[p.job];
    p.jobYears = Math.max(0, age(s, p) - 27);
    const elite = o.difficulty === 'easy' && ELITE_JOBS.includes(p.job) ? int(s, 1, 2) : 0; // 금수저 부모는 높은 자리에서 시작
    p.jobLevel = tycoon && p === father ? 4 : clamp(int(s, 0, Math.floor(p.jobYears / 4)) + (dif?.level ?? 0) + elite, 0, j.maxLevel);
  };
  // 난이도에 맞는 부모 직업 후보: 쉬움은 높은 자리, 지옥은 가장 불안정한 일. 보통·어려움은 열에 하나쯤 한 칸 위·아래도 섞인다
  const poolFor = (): string[] => {
    if (hist) return HIST_PARENT_JOBS[origin];
    if (o.difficulty === 'easy') return chance(s, 0.75) ? ELITE_JOBS : PARENT_JOBS.rich;
    if (o.difficulty === 'hell') return chance(s, 0.8) ? HELL_JOBS : PARENT_JOBS.poor;
    if (o.difficulty === 'normal' && chance(s, 0.1)) return PARENT_JOBS.rich;
    if (o.difficulty === 'hard' && chance(s, 0.1)) return PARENT_JOBS.middle;
    return PARENT_JOBS[origin];
  };
  giveJob(father, poolFor());
  // 1960년대 어머니는 대개 살림을 했다 (여성 경제활동참가율 30%대). 지금은 맞벌이가 더 흔하다 (2023 기혼 여성 고용률 약 64%, 통계청 지역별고용조사)
  if (chance(s, hist ? (origin === 'poor' ? 0.45 : 0.75) : origin === 'poor' ? 0.15 : 0.22)) mother.job = 'none';
  else giveJob(mother, hist ? (origin === 'poor' ? ['farmer', 'parttime', 'factory'] : origin === 'middle' ? ['teacher', 'shopkeeper', 'nurse'] : ['landlord', 'doctor']) : poolFor(), father.job);
  // 아주 드물게 부모가 이미 히든 직업 (각자 약 1%): 아무 직업이나가 아니라 원래 하던 일·집안 형편에서 이어지는 길로.
  //   어부였던 아버지가 밀수에 손을 대고, 큐레이터였던 어머니가 국제 미술품 수사관이 된다. 원래 직업은 "was:" 로 남는다.
  const rareStory: string[] = [];
  for (const par of [father, mother]) {
    if (hist || !chance(s, 0.012)) continue;
    const from = par.job;
    const cands = parentRareFrom(par, from, origin, age(s, par));
    if (!cands.length) continue;
    // 슈퍼 히든은 넷 중 하나꼴
    const sup = cands.filter((id) => isSuperHidden(id));
    const nor = cands.filter((id) => !isSuperHidden(id));
    const id = sup.length && (!nor.length || chance(s, 0.25)) ? pick(s, sup) : pick(s, nor);
    if (from !== 'none') addFlag(par, 'was:' + from);
    if (id === 'hj_perfumer') addTrait(par, 'keen_nose');
    if (id === 'hj_drifter') addTrait(par, 'speed_demon');
    par.job = id;
    par.jobLevel = 0;
    par.jobYears = int(s, 1, Math.max(1, age(s, par) - 28));
    addFlag(par, 'hidden:' + id);
    const who = par === father ? '아버지' : '어머니';
    const was = from === 'none' ? (origin === 'poor' ? '변변한 일자리가 없었는데' : '집에 있었는데') : `원래 ${JOBS[from]?.name ?? from}였는데`;
    rareStory.push(`✨ ${who}는 ${was}, 어느 날부터 ${HIDDEN_BY_ID[id]?.icon ?? ''} ${HIDDEN_BY_ID[id]?.name ?? id}의 길을 걷고 있다.`);
  }
  const pastLines = hist ? histOrigins(s, father, mother) : '';

  // 재산: 같은 형편이라도 집집마다 다르다
  if (origin === 'poor') {
    father.cash = int(s, -4000, 2500);
    mother.cash = int(s, 0, 800);
    // 낡은 빌라라도 내 집이 있는 집: 어려움 25% · 지옥 8% (나머지는 반지하·원룸 월세)
    if (chance(s, o.difficulty === 'hell' ? 0.08 : o.difficulty === 'hard' ? 0.25 : 0.35)) addAsset(s, 'apt_local', father.id, s.market.apt_local * 0.6, '낡은 빌라');
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
  // 가난한 집 부모의 짐 (중독·빚·병·실업 …)
  assignWoes(s, father, mother, o.difficulty);
  // 난이도에 맞춘 시작 방침: 부잣집은 씀씀이가 크고, 가난한 집 부모는 일에 매달린다
  if (origin === 'rich') s.policy.living = 'lux';
  if (o.difficulty === 'hard' || o.difficulty === 'hell') s.policy.lifestyle = 'work';
  // 차: 가난하면 없거나 낡은 경차, 중산층은 중형·SUV, 부자는 수입차
  const carPick = origin === 'poor' ? (chance(s, 0.5) ? 'kei' : undefined) : origin === 'middle' ? pick(s, ['compact', 'mid', 'suv', 'suv', 'large']) : tycoon ? 'super' : pick(s, ['genesis', 'import', 'import']);
  if (carPick && (!hist || tycoon)) giveUsedCar(s, father, carPick, int(s, 1, origin === 'poor' ? 10 : 6));
  // 1960년: 모은 돈과 땅도 그 시절 소득 수준으로 (땅은 소득 대비로도 쌌다)
  if (hist) {
    const w = wageIndex(START_YEAR);
    for (const p of [father, mother]) p.cash = Math.round(p.cash * w);
    // 1960년의 집: 아파트는 거의 없었다 (마포아파트가 1962년)
    const OLD_HOME: Record<string, string> = { '지방 아파트': '기와집 (한옥)', '수도권 아파트': '서울 양옥집', '낡은 빌라': '변두리 판잣집' };
    for (const a of s.assets) {
      if (OLD_HOME[a.name]) a.name = OLD_HOME[a.name];
      else if (a.kind === 'apt_seoul' && !a.name.includes('빌딩')) a.name = '서울 성북동 양옥 저택';
    }
    // 1960년엔 주택담보대출이 사실상 없었다: 가난한 집의 빚(사채·외상)만 남긴다
    if (origin !== 'poor') father.cash = Math.max(father.cash, Math.round(int(s, 300, 1500) * w));
    s.familyCash = Math.round(s.familyCash * w);
    for (const a of s.assets) if (a.kind === 'land' || a.kind === 'stock') a.value = Math.round(a.value * w * (a.kind === 'land' ? histRel('land', START_YEAR) : 1));
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
  me.name = randomName(s, o.sex, me.birthYear);
  for (const p of Object.values(s.people)) p.name = freshName(s, p);
  // 다섯 살까지 쌓인 능력치는 운
  for (const k of Object.keys(me.actual) as (keyof typeof me.actual)[]) me.actual[k] = Math.round(me.potential[k] * (0.12 + next(s) * 0.2));
  me.actual.hp = Math.round(me.potential.hp * (0.45 + next(s) * 0.3));
  // 난이도가 정하는 유전: 잠재력·재능·성격
  if (dif) {
    for (const k of Object.keys(me.potential) as (keyof typeof me.potential)[]) me.potential[k] = clamp(me.potential[k] + dif.childQ, 15, 98);
    if (o.difficulty === 'easy') {
      if (!me.talents.length) me.talents.push({ id: pick(s, TALENT_IDS), discovered: false });
      me.traits = (me.traits ?? []).filter((t) => !['lazy', 'frail', 'anxious'].includes(t));
      if (!me.traits.some((t) => ['diligent', 'cheerful', 'tough'].includes(t))) me.traits.push(pick(s, ['diligent', 'cheerful', 'tough']));
    } else if (o.difficulty === 'hard') {
      me.talents = [];
      me.traits = (me.traits ?? []).filter((t) => !['diligent', 'tough'].includes(t));
      if (!me.traits.some((t) => ['lazy', 'frail', 'anxious'].includes(t))) me.traits.push(pick(s, ['lazy', 'frail', 'anxious']));
    }
  }
  me.affinity = 60;
  mother.flags.push('plan:' + (father.childIds.length + (sibs - older)));

  s.headId = me.id;
  s.founderId = me.id;
  me.flags.push('gen:1');
  s.policy.children[me.id] = { budget: 1, focus: 'free' };
  father.affinity = int(s, 30, 80);
  mother.affinity = int(s, 40, 90);
  for (const c of father.childIds) if (c !== me.id) s.people[c].affinity = int(s, 10, 60);

  const sibTxt = father.childIds.length === 1 ? '외동' : `${father.childIds.length}남매 중 ${father.childIds.indexOf(me.id) + 1}째`;
  const home = assetsOf(s, father.id).concat(assetsOf(s, mother.id));
  const worth = personWorth(s, father) + personWorth(s, mother) + familyWorth(s);
  // 유산 상점에서 산 혜택 (지난 가문이 남긴 것)
  const legacyLines = o.legacy?.length ? applyLegacy(s, o.legacy) : [];
  const permaLines = o.perma?.length ? applyPerma(s, o.perma) : [];
  const ancestorLine = o.ancestor ? applyAncestor(s, o.ancestor) : '';
  queue(s, 'notice', me.id, {
    title: `${o.familyName}씨 가문의 시작`,
    text:
      `${START_YEAR - 5}년, ${iga(fullName(me))} 태어났다. ${sibTxt}.\n\n` +
      `👨 아버지 ${fullName(father)} (${age(s, father)}세) · ${jobLabel(father)}\n` +
      `👩 어머니 ${fullName(mother)} (${age(s, mother)}세) · ${mother.job === 'none' ? '전업주부' : jobLabel(mother)}\n` +
      `🏠 ${home.length ? home.map((a) => a.name).join(', ') : '월세살이'} · 집안 재산 ${formatMoney(worth)}` +
      (father.cash < 0 ? ` (빚 ${formatMoney(-father.cash)})` : '') +
      [father, mother].flatMap((q) => woesOf(q).map((w) => `\n⚠ ${q === father ? '아버지' : '어머니'}의 짐: ${WOES[w].icon} ${WOES[w].name} — ${WOES[w].desc}`)).join('') +
      (tycoon ? '\n💎 재벌가의 자손이다!' : '') +
      (rareStory.length ? '\n' + rareStory.join('\n') : '') +
      (dif ? `\n🎚 난이도: ${dif.name}` : '\n🎲 운명에 맡겼다') +
      (ancestorLine ? `\n\n${ancestorLine}` : '') +
      (legacyLines.length ? `\n\n🏺 지난 가문이 남긴 유산\n${legacyLines.join('\n')}` : '') +
      (permaLines.length ? `\n\n💠 가문 내력 (영구): ${permaLines.join(' · ')}` : '') +
      (hist
        ? `\n\n${pastLines}\n\n📜 지금 ${START_YEAR}년 봄. 3·15 부정선거로 온 나라가 들끓고 있다. ${eun(fullName(me))} 다섯 살.\n군사정변, 산업화, 유신, 광주, 올림픽, IMF, 월드컵, 촛불… 이 아이는 대한민국 현대사를 온몸으로 겪으며 자란다.\n해마다 그해의 신문이 오고, 역사의 큰 사건은 호외로 들이닥친다.\n\n💱 돈은 그해 물가로 보여 준다 (설정에서 "2025년 돈 가치"로 바꿔 볼 수 있다). 그 시절의 가난은 버는 돈이 적은 것으로 느껴진다.`
        : `\n\n지금 ${START_YEAR}년, ${eun(fullName(me))} 다섯 살.\n이제부터 당신이 이 아이의 인생을, 그리고 가문을 이끈다.\n학창 시절 → 수능 → 진로 → 결혼 → 자녀·손주 → 유언과 승계.`),
    portrait: me.id,
  });
  queue(s, 'kinder', me.id);
  scheduleEggs(s, me);
  initMissions(s);
  foldFamilyPot(s);
  for (const p of Object.values(s.people)) mortgageFromCash(s, p);
  settleHome(s, householder(s));
  rollListings(s);
  bindState(s);
  return s;
}

export function queue(s: GameState, defId: string, personId: string, data?: any) {
  s.events.push({ uid: s.eventSeq++, defId, personId, data });
}

const log = (s: GameState, text: string, kind?: GameState['log'][number]['kind']) => s.log.push({ year: s.year, text: text.startsWith('📰') ? text : periodize(s, text), kind }); // 뉴스는 그 시대 말로 이미 쓰였다

export function mainlineMembers(s: GameState): Person[] {
  return Object.values(s.people).filter((p) => alive(p) && isMainline(s, p));
}

export function familyTotal(s: GameState): number {
  return totalWorth(s, mainlineMembers(s));
}

/** 독립 전이면 부모님 재산까지 합친 '우리 집' 재산, 독립 후엔 가문 자산 */
export function homeTotal(s: GameState): { label: string; value: number } {
  const h = head(s);
  if (householder(s).id === h.id) return { label: '가문 자산', value: familyTotal(s) };
  const pars = parentsOf(s, h).filter(alive);
  return { label: '우리 집 재산', value: familyTotal(s) + pars.reduce((t, p) => t + personWorth(s, p), 0) };
}

// ─────────────────────── 한 해 진행 ───────────────────────

export function simulateYear(s: GameState): void {
  if (s.events.length || s.gameOver) return;
  bindState(s);
  s.year++;
  setMoneyYear(s.year);
  s.ap = apMax(s);
  s.actUsed = {};
  const h0 = head(s);
  log(s, `── ${s.year}년 · ${fullName(h0)} ${age(s, h0)}세 ──`);

  for (const m of growthYear(s)) log(s, m, 'life');
  const before = homeTotal(s);
  for (const m of economyYear(s)) log(s, m, 'money');
  for (const m of debtYear(s)) log(s, m, 'money');
  for (const m of autoGiftYear(s, (to, amt) => giveGift(s, head(s), to, amt).ok)) log(s, m, 'money');
  for (const m of marketYear(s)) log(s, m, 'market');
  for (const m of treasureYear(s)) log(s, m, 'market');
  for (const m of leverageYear(s)) log(s, m, 'money');
  // 우리 가족이 대통령이면, 실제 역사·미래 뉴스 속 "대통령" 기사는 빼고 우리 대통령 소식으로
  const ourPres = Object.values(s.people).find((p) => alive(p) && p.job === 'president');
  // 근현대사에서 우리 가문이 한 번이라도 정권을 잡았다면(가상 역사) 실제 대통령 기사는 계속 뺀다
  const altHist = s.storySeen?.['althist'] !== undefined;
  const presNews = (m: string) => (!ourPres && !altHist) || !m.startsWith('📰') || !/대통령|대선|청와대|대통령실|탄핵|취임식|국정 지지율|박정희|윤보선|최규하|전두환|노태우|김영삼|김대중|노무현|이명박|박근혜|문재인|윤석열|이재명|3선 개헌|유신헌법|6·29 선언/.test(m);
  for (const m of histYear(s)) if (presNews(m)) log(s, m, 'market');
  for (const m of timelineYear(s)) if (presNews(m)) log(s, m, 'market');
  if (ourPres) log(s, `📰 ${fullName(ourPres)} 대통령, 국정 지지율 ${ourPres.pol?.approval ?? 50}% · ${pick(s, ['민생 경제 점검 회의 주재', '정상회담 참석차 출국', '신년 기자회견', '재난 현장 방문', '국무회의에서 개혁안 발표', '청년 간담회 개최'])}`, 'market');
  chainYear(s);
  for (const m of warYear(s)) log(s, m, 'market');
  medicalYear(s);
  for (const m of eraYear(s)) log(s, m, 'market');
  for (const m of rivalYear(s, familyTotal(s))) log(s, m, 'life');
  for (const m of careerYear(s)) log(s, m, 'life');
  for (const m of powerYear(s)) log(s, m, 'life');
  for (const m of power2Year(s)) log(s, m, 'life');
  dutyYear(s);
  handoverYear(s);
  sagaYear(s);
  for (const m of cardYear(s)) log(s, m, 'life');
  for (const m of hiddenYear(s)) log(s, m, 'life');
  gateYear(s);
  for (const m of casinoYear(s)) log(s, m, 'life');
  pathYear(s);
  photoYear(s);
  relicYear(s);
  vipCureYear(s);
  bigYear(s);
  for (const m of superHiddenYear(s)) log(s, m, 'life');
  trackPeak(s);
  scandalYear(s);
  for (const m of crimeYear(s)) log(s, m, 'life');
  woeYear(s);
  for (const m of eggYear(s)) log(s, m, 'money');
  eggForKids(s);
  for (const m of spouseYear(s)) log(s, m, 'life');
  inlawYear(s);
  autonomyYear(s);
  perkYear(s, wageIndex(s.year));
  capStats(s, cardCapBonus(s));

  retirementAndGraduation(s);
  deaths(s);
  if (s.gameOver) return;
  kinMarriages(s);
  births(s);
  milestones(s);
  adultEvents(s);
  lifeYear(s);
  workEvents(s);
  randomEvents(s);

  for (const p of mainlineMembers(s)) {
    if (age(s, p) >= 20) s.fame += JOBS[p.job].fame * 0.5 * (hasTrait(p, 'ambitious') && JOBS[p.job].fame > 0 ? 1.3 : 1);
  }
  recordJobs(s);
  companyYear(s);
  companyStoryYear(s);
  s.fame = Math.max(0, Math.round(s.fame * 10) / 10);

  const after = homeTotal(s);
  log(s, `💰 ${after.label} ${formatMoney(after.value)} (${after.value >= before.value ? '+' : ''}${formatMoney(after.value - before.value)})`, 'money');
  checkAchievements(s);
  checkHonors(s);
  scanMilestones(s, familyTotal(s));
  checkMissions(s);
  foldFamilyPot(s);
  if (!homeOf(s, householder(s))) {
    const msg = settleHome(s, householder(s));
    if (msg) log(s, `🏠 ${fullName(householder(s))}: ${msg}`, 'money');
  }
  rollListings(s);
}

/** 휴대폰(연락 수단) 창으로 오는 사건인가 (제목을 만들 때 상황이 필요한 사건은 아니라고 본다) */
function isCommDef(d: LifeDef): boolean {
  try {
    return !!commEvent(d.id, d.title({} as never));
  } catch {
    return !!commEvent(d.id, '');
  }
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
      for (const x of [p, sp]) d += (hasTrait(x, 'devoted') ? 1 : hasTrait(x, 'flirt') ? -1.5 : 0) + bondDrift(x);
      d += kinDrift(s, p, sp); // 집안 차이·사돈 챙기기
      if (p.happiness > 60 && sp.happiness > 60) d += 0.5;
      setBond(p, sp, (p.bond ?? 60) + d);
      if ((p.bond ?? 60) < 28 && chance(s, 0.35) && !pending('marital_crisis')) queue(s, 'marital_crisis', p.id);
      // 난임
      const mom = p.sex === 'F' ? p : sp;
      const wed = Number(p.flags.find((f) => f.startsWith('wed:'))?.slice(4) ?? s.year);
      const want = p.id === h.id ? s.policy.familyPlan : 2;
      if (!p.childIds.length && want > 0 && !hasFlag(p, 'childfree') && s.year - wed >= 2 && age(s, mom) >= 29 && age(s, mom) <= 44 && chance(s, 0.3) && !pending('infertility'))
        queue(s, 'infertility', p.id);
      // 아이를 끝내 못 가진 부부: 몇 해에 한 번 입양 제안이 온다 (늙을 때까지 빈집이지 않게)
      else if (!p.childIds.length && !hasFlag(p, 'childfree') && !hasFlag(sp, 'childfree') && s.year - wed >= 4 && age(s, mom) >= 36 && age(s, mom) <= 62 && !onCooldown(s, p.id + ':adopt_offer', 4) && chance(s, 0.3) && !pending('adopt_offer')) {
        (s.storySeen ??= {})[p.id + ':adopt_offer'] = s.year;
        queue(s, 'adopt_offer', p.id);
      }
    }
    // 병역: 남자 20세 (연기했으면 졸업 후)
    if (p.sex === 'M' && !p.inLaw && a >= 20 && a <= 28 && !p.flags.some((f) => ['served', 'exempt', 'draft_dodger'].includes(f) || f.startsWith('serving:')) && !pending('military')) {
      // 스무 살에 첫 통지. 연기했으면 학업·시험이 끝나거나 28세가 되면 다시 온다
      const busy = hasFlag(p, 'student') || p.flags.some((f) => f.startsWith('prep:') || f === 'retaking');
      if (a === 20 || (hasFlag(p, 'mil_postponed') && (!busy || a >= 28))) queue(s, 'military', p.id);
    }
    // 암
    if (!p.flags.some((f) => f.startsWith('cancer:')) && chance(s, cancerRate(s, p))) queue(s, 'cancer', p.id);
    // 올림픽(4년)·아시안게임
    if (p.job === 'athlete' && p.jobLevel >= 3 && (s.year % 4 === 0 || s.year % 4 === 2)) queue(s, 'olympic', p.id, { ag: s.year % 4 === 2 });
    // 상장
    if (p.job === 'founder' && p.jobLevel >= 4 && !p.flags.some((f) => f === 'ipo' || f === 'ipo_declined')) queue(s, 'ipo', p.id);
    // 대선
    if (isElectionYear(s.year) && a >= 45 && a <= 72 && !hasFlag(p, 'draft_dodger') && p.job !== 'president' && !hasFlag(p, 'president')) {
      if ((p.job === 'politician' && p.jobLevel >= 2 && s.fame >= 100 && (p.pol?.approval ?? 0) >= 45) || (hasFlag(p, 'was_minister') && s.fame >= 140) || (hasFlag(p, 'was_top_prosecutor') && s.fame >= 120) || hasFlag(p, 'was_premier') || hasFlag(p, 'party_leader') || hasFlag(p, 'un_sg')) queue(s, 'presidential', p.id);
    }
  }
  // 유언장: 가주 65세부터 5년마다
  const ha = age(s, h);
  if (!s.willWritten && ha >= 65 && ha % 5 === 0 && h.childIds.some((id) => alive(s.people[id]))) queue(s, 'will', h.id);

  // 보험료·청약 추첨·예약된 후폭풍 도착
  fateYear(s);
  seedYear(s);
  // 무작위 인생사: 가족 전체에서 최대 2건
  const pool: [LifeDef, Person, number][] = [];
  romanceYear(s);
  nestYear(s);
  for (const p of members) for (const d of [...LIFE_RANDOM, ...FATE_RANDOM, ...ROMANCE_RANDOM, ...SEED_EVENTS, ...DECEPTION_EVENTS, ...K_REALITY_RANDOM]) {
    if (onDuty(p)) break;
    if (onCooldown(s, p.id + ':' + d.id, 6)) continue;
    if (onCooldown(s, 'fam:' + d.id, isCommDef(d) ? 8 : 3)) continue; // 같은 사건이 식구만 바꿔 연달아 오지 않게
    const w = d.weight?.(s, p) ?? 0;
    if (w > 0) pool.push([d, p, w]);
  }
  // 일상 이야기: 해마다 한두 개
  const stories: [LifeDef, Person, number][] = [];
  const histNow = inHistory(s);
  for (const p of members) for (const d of STORIES) {
    if (onDuty(p)) break; // 군 복무·해외 파견 중엔 그곳의 이야기만 (duty.ts)
    if (d.id.startsWith('st_wk_')) continue; // 직장 이야기는 따로 (workEvents)
    if (BOSS_STORIES.has(d.id.slice(3)) && selfBoss(p)) continue; // 상사·회사가 없는 사람에게 회사원 이야기는 없다
    if (histNow && d.raw && anachronistic(s, d.raw)) continue; // 그 시절에 없던 이야기
    if (histNow && s.year < 2000 && !d.id.startsWith('st_h_') && !d.id.startsWith('st_dev_') && !TIMELESS.has(d.id.slice(3))) continue; // 2000년 전엔 그 시절 이야기와 어느 시대에나 있을 이야기만
    const w = d.weight?.(s, p) ?? 0;
    if (w > 0) stories.push([d, p, w]);
  }
  // 휴대폰(연락 수단)으로 오는 이야기는 따로 한 번 더: 해마다 2/3쯤은 폰이 울린다
  //  같은 연락 이야기가 식구만 바꿔 또 오지 않게: 가문 전체로 10년은 쉰다 (예전엔 사람마다 따로 세서 한 판에 같은 문자가 네댓 번 왔다)
  const isCall = isCommDef;
  const commSeen = (d: LifeDef) => s.year - (s.storySeen?.['comm:' + d.id] ?? -99) < 10;
  for (let i = stories.length - 1; i >= 0; i--) if (isCall(stories[i][0]) && commSeen(stories[i][0])) stories.splice(i, 1);
  const calls = stories.filter(([d]) => isCall(d));
  if (calls.length && chance(s, 0.5)) {
    const total = calls.reduce((t, [, , w]) => t + w, 0);
    let r = next(s) * total;
    const hit = calls.find(([, , w]) => (r -= w) <= 0) ?? calls[calls.length - 1];
    queue(s, hit[0].id, hit[1].id);
    (s.storySeen ??= {})['comm:' + hit[0].id] = s.year;
    stories.splice(stories.indexOf(hit), 1);
  }
  // 일반 이야기 가운데 연락 수단으로 오는 것도 같은 해에 또 오지 않게
  for (let i = stories.length - 1; i >= 0; i--) if (isCall(stories[i][0])) stories.splice(i, 1);
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
    (s.storySeen ??= {})[hit[1].id + ':' + hit[0].id] = s.year;
    s.storySeen['fam:' + hit[0].id] = s.year;
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
      const away = dutyDone(p);
      if (away) log(s, away, 'life');
      else {
        addFlag(p, 'served');
        log(s, `🎖 ${fullName(p)} 만기 전역`, 'life');
        if (hasFlag(p, 'officer_served') && isMainline(s, p)) queue(s, 'officer_stay', p.id);
        else if (hasFlag(p, 'nco_offer') && isMainline(s, p)) queue(s, 'nco_stay', p.id);
      }
    }
    // 장관 2년, 대통령 5년
    if (p.job === 'minister' && p.jobYears >= 2) {
      const prevFlag = p.flags.find((f) => f.startsWith('prev:'))?.slice(5);
      let [pj, pl] = (prevFlag ?? '').split(':');
      if (!pj || pj === 'pension' || pj === 'none') {
        if (a < 65) {
          pj = hasLicense(p, 'lawyer') ? 'lawyer' : hasLicense(p, 'doctor') ? 'doctor' : 'politician';
          pl = '3';
        } else {
          pj = 'pension';
          pl = '0';
        }
      }
      const role = p.flags.includes('role:premier') ? '국무총리' : p.flags.includes('role:deputy_pm') ? '부총리' : p.flags.includes('role:chief') ? '대통령 비서실장' : '장관';
      p.flags = p.flags.filter((f) => !f.startsWith('role:'));
      p.job = pj;
      p.jobLevel = Number(pl) || 0;
      p.jobYears = 5;
      log(s, `${fullName(p)} ${role} 퇴임 (${JOBS[pj]?.name ?? pj} 복귀)`, 'life');
      ministerLeaves(s, p);
    }
    // 대통령 5년 단임 (거사로 오른 대통령은 7년 단임: 제5공화국 헌법)
    if (p.job === 'president' && p.jobYears >= presTerm(p)) {
      p.job = 'pension';
      p.flags = p.flags.filter((f) => !f.startsWith('pens:'));
      p.flags.push('pens:15000', 'ex_president');
      log(s, `🇰🇷 ${fullName(p)} 대통령 퇴임`, 'life');
      presidentLeaves(s, p);
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
    // 대기업 임원(상무 이상)은 정년 대신 계약 — 65세까지 (임원 평균 퇴임 나이 50대 후반~60대 초, 유니코써치 100대 기업 임원 조사)
    const ra = p.job === 'corp' && p.jobLevel >= 5 ? 65 : JOBS[p.job].retireAge;
    if (ra && a >= ra) {
      const sev = severance(s, p);
      if (p.job !== 'none' && p.job !== 'parttime') log(s, `${fullName(p)} ${JOBS[p.job].kind === 'salary' ? '정년퇴직' : '은퇴'}${sev ? ` (퇴직금 ${formatMoney(sev)})` : ''}`, 'life');
      if (hasAnyLicense(p)) savePreviousLevel(p, p.job, p.jobLevel);
      retireHonor(s, p);
      settlePension(p, s);
      if (p.id === s.headId) queue(s, 'pension_timing', p.id), queue(s, 'second_life', p.id);
      p.job = 'pension';
      p.flags = p.flags.filter((f) => !f.startsWith('prep:') && !f.startsWith('tries:'));
    } else if ((JOBS[p.job].kind === 'creator' || JOBS[p.job].kind === 'business' || p.job === 'politician') && a >= 78) {
      if (hasAnyLicense(p)) savePreviousLevel(p, p.job, p.jobLevel);
      settlePension(p, s);
      p.job = 'pension';
    }

    // 전문직 면허가 있는데 무직인 경우: 방계는 자동으로 복직, 메인라인은 복직/개원 이벤트 제안
    if (p.job === 'none' && hasAnyLicense(p) && a < 70 && !hasFlag(p, 'student') && !hasFlag(p, 'in_prison')) {
      const lics = getLicenses(p);
      const targetJob = lics[0];
      if (!isMainline(s, p)) {
        if (chance(s, 0.9)) {
          p.job = targetJob;
          p.jobLevel = calculateReturnLevel(p, targetJob, false);
          p.jobYears = 0;
          log(s, `🩺 ${fullName(p)}, ${LICENSED_JOBS[targetJob]?.name ?? '국가 면허'}를 살려 병원/전문기관에 복직`, 'life');
        }
      } else {
        if (!s.events.some((e) => e.personId === p.id && e.defId === 'licensed_rehire')) {
          queue(s, 'licensed_rehire', p.id, { jobId: targetJob });
        }
      }
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
      grantLicense(p, 'doctor');
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
    case 'jtri': {
      // 사법연수원 수료: 본가는 진로를 고르고, 방계는 성적대로
      addFlag(p, 'jtri_done');
      if (main) {
        queue(s, 'law_path', p.id, { jtri: true });
        return;
      }
      const sc = p.actual.int;
      setJob(sc >= 72 ? 'judge' : sc >= 64 ? 'prosecutor' : 'lawyer');
      log(s, `⚖ ${fullName(p)} 사법연수원 수료, ${JOBS[p.job].name}(으)로`, 'life');
      return;
    }
    case 'grad_school':
      log(s, `🎓 ${fullName(p)} 박사 학위 취득 (논문 ${p.papers ?? 0}편)`, 'life');
      addFlag(p, 'phd');
      p.flags.push('phd_y:' + s.year);
      setJob('researcher', 0); // 박사후연구원·시간강사로 버티며 임용을 노린다
      if (main) queue(s, 'prof_hire', p.id);
      return;
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
    case 'academy_air':
      setJob('officer');
      addFlag(p, 'flight_school');
      log(s, `✈️ ${fullName(p)} 공군 소위 임관 · 비행 교육 시작`, 'life');
      return;
    case 'academy_nurse':
      setJob('nurse', 1);
      grantLicense(p, 'nurse');
      addFlag(p, 'officer_served');
      log(s, `🩺 ${fullName(p)} 간호사 면허 취득 · 간호장교 소위 임관`, 'life');
      return;
    case 'coast_guard':
      setJob('coast_guard', 1);
      log(s, `🚢 ${fullName(p)} 해양경찰 간부후보로 임용`, 'life');
      return;
    case 'rail':
      setJob('train_driver');
      log(s, `🚆 ${fullName(p)} 철도차량 운전면허 취득, 기관사로 첫 운행`, 'life');
      return;
    case 'agri_univ':
      setJob('smart_farmer', 1);
      log(s, `🌾 ${fullName(p)} 한국농수산대 졸업, 청년 농업인으로 창업`, 'life');
      return;
    case 'culinary':
      setJob('chef', 1);
      log(s, `👨‍🍳 ${fullName(p)} 해외 요리학교 수료! 유명 레스토랑 주방에 들어갔다`, 'life');
      return;
    case 'hotel_school':
      setJob('hotelier', 1);
      log(s, `🏨 ${fullName(p)} 호텔스쿨 졸업, 특급호텔 매니저 트레이니로`, 'life');
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
  const a = age(s, p);
  if ((e.maxAge && a > e.maxAge) || (hasFlag(p, 'criminal') && (e.publicOnly || PUBLIC_EXAMS.has(id)))) {
    clear();
    p.job = 'office';
    p.jobLevel = 0;
    return;
  }
  if (check(s, examScore(p, id, 8), e.pass, 7)) {

    clear();
    p.job = e.job;
    p.jobLevel = e.level;
    p.jobYears = 0;
    grantLicense(p, e.job);
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
  if (p.flags.includes('kia_pending')) return '전장에서';
  if (p.flags.some((f) => f.startsWith('cancer:'))) return '암 투병 끝에';
  const a = age(s, p);
  return a > 75 ? '노환으로' : p.actual.hp < 30 ? '지병으로' : a < 50 && chance(s, 0.5) ? '불의의 사고로' : '갑작스러운 병으로';
}

function deaths(s: GameState) {
  const living = Object.values(s.people).filter(alive);
  for (const p of living) {
    if (!alive(p) || !chance(s, deathChance(s, p))) continue;
    // 💠 조상의 가호: 가주마다 한 번, 65세 전의 죽음을 비켜 간다
    if (p.id === s.headId && hasPerma(s, 'ancestor_guard') && age(s, p) < 65 && !(s.storySeen ??= {})['guard:' + p.id]) {
      s.storySeen['guard:' + p.id] = s.year;
      p.actual.hp = Math.max(p.actual.hp, 35);
      log(s, `🕯 ${fullName(p)}, 생사의 고비에서 기적처럼 깨어났다. 꿈에 조상이 나와 등을 떠밀었다고 한다. (조상의 가호)`, 'life');
      continue;
    }
    const wasHead = p.id === s.headId;
    const mainline = isMainline(s, p) || isRelevant(s, p);
    const cause = causeOf(s, p);
    p.deathYear = s.year;
    log(s, `🕯 ${fullName(p)} ${cause} 별세 (향년 ${age(s, p)}세)`, 'death');
    if (!p.inLaw && (wasHead || isMainline(s, p) || isDescendantOf(s, head(s), p)) && age(s, p) >= 15) lifeReport(s, p);
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
      startInheritanceDrama(s, p, next);
      const text =
        `🗞 ${obituary(s, p).headline}\n\n` +
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
      queueFuneral(s, p);
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
      // 가주의 부모·배우자·자녀는 가주가 장례를 치른다
      if (p.id === h.fatherId || p.id === h.motherId || p.id === h.spouseId || h.childIds.includes(p.id)) queueFuneral(s, p);
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
    const pr = 0.55 * fertility(age(s, mom)) * clamp(mom.actual.hp / 50, 0.5, 1.2) * clamp((dad.actual.hp + dad.potential.hp) / 110, 0.55, 1.15);
    if (!chance(s, pr)) continue;
    deliver(s, dad, mom, blood.surname, 0.015);
  }
}

function milestones(s: GameState) {
  for (const p of livingMainlineMinors(s)) {
    const a = age(s, p);
    const ev = { 5: 'kinder', 8: 'elementary', 11: 'aptitude', 12: 'dream', 14: 'middle', 17: 'high', 19: 'path' }[a];
    if (ev) queue(s, ev, p.id);
    // 관심사 찾기: 해 본 것들이 쌓여 나중의 진로가 된다
    if (HOBBY_AGES.includes(a)) queue(s, 'hobby', p.id);
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
    if (p.job === 'none' && !hasFlag(p, 'student') && hasFlag(p, 'failed_pro') && !hasFlag(p, 'in_prison') && !p.flags.some((f) => f.startsWith('serving:')) && chance(s, 0.6)) {
      p.flags = p.flags.filter((f) => f !== 'failed_pro');
      queue(s, 'first_job', p.id);
    }
    // 시험 준비생은 매년 응시 (수감 중이거나 복무 중이면 보류)
    if (p.flags.some((f) => f.startsWith('prep:')) && !pending('exam') && !hasFlag(p, 'in_prison') && !p.flags.some((f) => f.startsWith('serving:'))) queue(s, 'exam', p.id);
    if (p.job === 'athlete' && a === 34) queue(s, 'athlete_retire', p.id);
    // 창작 직업이 몇 년째 안 뜨면 고민
    if (CREATORS[p.job] && p.jobLevel === 0 && p.jobYears >= 3 && p.jobYears % 3 === 0) queue(s, 'yt_slump', p.id);
    // 출마 제안 / 재선 (수감자 또는 실형 전과자는 피선거권 제한)
    if (!hasFlag(p, 'in_prison') && !hasFlag(p, 'criminal')) {
      if (p.job === 'politician' && p.jobYears > 0 && p.jobYears % 4 === 0) queue(s, 'election', p.id);
      else if (p.job !== 'politician' && a >= 40 && a <= 65 && (s.fame >= 40 || ['lawyer', 'professor', 'journalist'].includes(p.job) || p.jobLevel >= 4) && chance(s, 0.06))
        queue(s, 'election', p.id);
    }
    // 소개팅 (수감 중이거나 군 복무 중이면 제외)
    const single = !p.spouseId || !alive(s.people[p.spouseId]);
    // 소개팅은 같은 사람에게 2년에 한 번까지 (해마다 같은 장면이 반복되지 않게)
    const lastBd = s.storySeen?.['bd:' + p.id];
    if (single && !onDuty(p) && !hasFlag(p, 'in_prison') && !p.partnerId && !hasFlag(p, 'single_life') && !pending('blind_date') && !(lastBd !== undefined && s.year - lastBd < 2) && chance(s, dateChance(a, p.id === h.id) * (p.spouseId || hasFlag(p, 'divorced') ? 0.5 : 1))) {
      (s.storySeen ??= {})['bd:' + p.id] = s.year;
      queue(s, 'blind_date', p.id, { cand: makeDate(s, p) });
    }

    // 범죄 및 유혹 이벤트 (경범죄 → 스노우볼)
    if (!hasFlag(p, 'in_prison') && !onDuty(p)) {
      if (hasLicense(p, 'doctor') && ['doctor', 'dentist'].includes(p.job) && a >= 32 && !hasFlag(p, 'crm:medical_crime') && !pending('crm_medical_step1') && chance(s, 0.04)) {
        queue(s, 'crm_medical_step1', p.id);
      } else if (['business', 'salary'].includes(JOBS[p.job]?.kind) && a >= 28 && !hasFlag(p, 'crm:tax_fraud') && !pending('crm_tax_step1') && chance(s, 0.03)) {
        queue(s, 'crm_tax_step1', p.id);
      } else if (a >= 25 && a <= 60 && !hasFlag(p, 'crm:insider_trade') && !pending('crm_insider_step1') && chance(s, 0.03)) {
        queue(s, 'crm_insider_step1', p.id);
      } else if (a >= 22 && a <= 60 && !hasFlag(p, 'crm:dui_pending') && !pending('crm_dui_step1') && chance(s, 0.03)) {
        queue(s, 'crm_dui_step1', p.id);
      }
    }
  }
  for (const p of Object.values(s.people)) {
    if (alive(p) && hasFlag(p, 'grievance') && chance(s, 0.5)) queue(s, 'grievance', p.id);
  }
}

/** 직장 생활 이야기: 일하는 가족에게 그 직업다운 일이 해마다 생긴다 (가주는 자주, 다른 가족은 가끔, 한 해 최대 2건) */
const WORK_DEFS = STORIES.filter((d) => d.id.startsWith('st_wk_'));
function workEvents(s: GameState) {
  const workers = mainlineMembers(s).filter((p) => age(s, p) >= 20 && !['none', 'parttime', 'pension'].includes(p.job) && !p.flags.includes('student') && !onDuty(p) && !p.flags.some((f) => f === 'in_prison' || f.startsWith('leave:')));
  workers.sort((a, b) => Number(b.id === s.headId) - Number(a.id === s.headId));
  let n = 0;
  for (const p of workers) {
    if (n >= 2 || !chance(s, p.id === s.headId ? 0.6 : 0.25)) continue;
    const pool = WORK_DEFS.filter((d) => !(inHistory(s) && d.raw && anachronistic(s, d.raw))).map((d) => [d, d.weight?.(s, p) ?? 0] as const).filter(([, w]) => w > 0);
    const total = pool.reduce((t, [, w]) => t + w, 0);
    if (!total) continue;
    let r = next(s) * total;
    const hit = pool.find(([, w]) => (r -= w) <= 0) ?? pool[pool.length - 1];
    queue(s, hit[0].id, p.id);
    n++;
  }
}

/** 같은 무작위 사건이 연달아 나오지 않게: 마지막으로 일어난 뒤 몇 년은 쉰다 */
const RAND_COOLDOWN: Record<string, number> = { r_illness: 7, holiday: 5, r_parent_care: 7 };
function onCooldown(s: GameState, key: string, years: number): boolean {
  const last = s.storySeen?.[key];
  return last !== undefined && s.year - last < years;
}

function randomEvents(s: GameState) {
  const h = head(s);
  if (age(s, h) < 20 || onDuty(h)) return;
  const rolls = chance(s, 0.5) ? (chance(s, 0.15) ? 2 : 1) : 0;
  const used = new Set<string>();
  for (let i = 0; i < rolls; i++) {
    const ctx: Ctx = { s, p: h, ev: { uid: 0, defId: '', personId: h.id } };
    const pool = RANDOM_EVENTS.filter((e) => !used.has(e.id) && !onCooldown(s, 'rand:' + e.id, RAND_COOLDOWN[e.id] ?? 10)).map((e) => [e, e.weight(ctx)] as const).filter(([, w]) => w > 0);
    const total = pool.reduce((t, [, w]) => t + w, 0);
    if (!total) return;
    let r = next(s) * total;
    for (const [e, w] of pool) {
      r -= w;
      if (r <= 0) {
        used.add(e.id);
        queue(s, e.id, h.id);
        (s.storySeen ??= {})['rand:' + e.id] = s.year;
        break;
      }
    }
  }
}

/** 📕 가문 이야기 마치기: 가주가 40세를 넘었거나 2대 이상이면, 스스로 가문의 이야기를 끝내고 유산을 받는다 */
export function canConclude(s: GameState): boolean {
  const h = head(s);
  return !s.gameOver && !s.events.length && (s.generation >= 2 || age(s, h) >= 40);
}
export function concludeFamily(s: GameState): boolean {
  if (!canConclude(s)) return false;
  const h = head(s);
  if (!h.inLaw && age(s, h) >= 15 && h.lifeScore === undefined) lifeReport(s, h);
  endGame(s, `${s.familyName}씨 가문 ${s.generation}대 가주 ${iga(fullName(h))} 붓을 내려놓았다. "우리 집안 이야기는 여기까지."\n${s.startYear}년부터 ${s.year}년까지, ${s.generation}대에 걸친 이야기가 족보에 남는다.`);
  s.gameOver!.voluntary = true;
  return true;
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

/** 근현대사 모드: 뼈대 사건은 그 시절 판으로 */
const defOf = (s: GameState, id: string) => histOverride(s, id) ?? EVENTS[id];
/** 근현대사에서 그 시절에 없던 말이 들어가도 건너뛰지 않는 뼈대 사건 (선택지만 거른다) */
const CORE_IDS = new Set(['notice', 'kinder', 'elementary', 'middle', 'high', 'exam', 'school_year', 'first_job', 'military', 'wedding', 'kid_wedding', 'naming', 'will', 'parent_estate', 'choose_heir', 'leave_home', 'kid_leave', 'house_promise', 'funeral', 'path', 'aptitude', 'dream', 'meet', 'dating_year', 'woe', 'allowance_talk', 'univ']);

export function currentEvent(s: GameState): ReturnType<typeof eventView> | undefined {
  bindState(s);
  // 그사이 상황이 바뀐 이벤트(사망·이혼 등)는 건너뛴다
  while (s.events.length) {
    const ev = s.events[0];
    const def = defOf(s, ev.defId);
    const p = s.people[ev.personId];
    const ctx: Ctx = { s, p, ev };
    if (def && p && (alive(p) || FOR_THE_DEAD.has(def.id)) && (def.valid?.(ctx) ?? true)) {
      const v = eventView(ctx);
      // 근현대사: 그 시절에 없던 물건·제도가 나오는 이야기는 건너뛴다
      if (!inHistory(s) || v.def.id.startsWith('hist_') || CORE_IDS.has(v.def.id) || !anachronistic(s, v.title + ' ' + v.text)) return v;
    }
    s.events.shift();
  }
  return undefined;
}

function eventView(ctx: Ctx) {
  const { ev, p } = ctx;
  const def = defOf(ctx.s, ev.defId);
  const hist = inHistory(ctx.s);
  const k = moneyK(ctx.s, def.id);
  const text = periodize(ctx.s, def.text(ctx), k);
  // 비용이 가용 자금을 넘는 선택지는 이벤트 정의와 무관하게 잠근다
  const money = spendable(ctx.s);
  let raw = def.choices(ctx);
  if (hist) {
    // 그 시절에 없던 선택지는 빼고, 말은 시대말로. 이야기(st_)의 고정 금액은 그 시절 소득 수준으로
    const w = wageIndex(ctx.s.year);
    const kept = raw.filter((c) => !anachronistic(ctx.s, c.label));
    raw = (kept.length ? kept : raw).map((c) => ({ ...c, label: periodize(ctx.s, c.label, k), cost: c.cost && def.id.startsWith('st_') ? Math.max(1, Math.round(c.cost * w)) : c.cost }));
  }
  const choices = raw.map((c) => (c.cost && c.cost > money ? { ...c, disabled: true } : c));
  // 돈이 없어 고를 게 하나도 없으면 막히지 않게 탈출구를 준다
  if (choices.every((c) => c.disabled)) choices.push({ label: '어쩔 수 없다 (그냥 넘긴다)', run: () => '할 수 있는 게 없었다.' });
  return { ev, def, ctx, title: periodize(ctx.s, def.title(ctx), k), text, choices, portraits: def.portraits?.(ctx) ?? [p] };
}

/** 글 속 금액 배율: 그 시절 돈으로 쓴 글(근현대사 전용 사건)은 0, 근현대사의 일반 이야기는 그 시절 소득 수준 */
function moneyK(s: GameState, id: string): number {
  if (!inHistory(s)) return 1;
  if (id.startsWith('hist_') || id.startsWith('st_h_') || id.startsWith('st_dev_')) return 0;
  return id.startsWith('st_') ? wageIndex(s.year) : 1;
}

export function resolveChoice(s: GameState, idx: number): string {
  const cur = currentEvent(s);
  if (!cur) return '';
  const ch = cur.choices[idx];
  if (!ch || ch.disabled) return '';
  if (ch.cost) pay(s, householder(s), ch.cost);
  const res = ch.run(cur.ctx);
  const text = periodize(s, typeof res === 'string' ? res : res.text, moneyK(s, cur.def.id));
  if (typeof res === 'string' || !res.keep) s.events.shift();
  if (text && cur.def.id !== 'notice') log(s, `[${cur.title}] ${ch.label} → ${text.split('\n')[0]}`, 'life');
  checkAchievements(s);
  scanMilestones(s, familyTotal(s));
  foldFamilyPot(s);
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

/** 정밀 적성검사 값: 근현대사에선 그 시절 소득 수준으로 */
export const testCost = (s: GameState) => (inHistory(s) ? Math.max(5, Math.round(300 * wageIndex(s.year))) : 300);

export function aptitudeTest(s: GameState, id: string): string {
  const p = s.people[id];
  const h = head(s);
  pay(s, h, testCost(s));
  p.potentialKnown = true;
  for (const t of p.talents) t.discovered = true;
  addFlag(p, 'tested');

  // 체스 신동: 여성 아이가 적성검사를 받을 때 4% 확률로 발현
  if (p.sex === 'F' && !p.traits?.includes('chess_prodigy') && chance(s, 0.04)) {
    addTrait(p, 'chess_prodigy');
    p.actual.int = clamp(p.actual.int + 8, 0, 100);
    p.potential.int = clamp(p.potential.int + 10, 0, 100);
    return `✨ 경이로운 발견! 정밀 적성검사 결과, ${fullName(p)}에게서 [체스 신동]의 천재적 적성이 발현되었다! 64칸 판 위에서 수십 수를 앞서 내다보는 전설적인 수읽기다. (지능 +8)`;
  }

  const fits = fitCats(p, 2).map((k) => JOB_CATS[k]);
  const tal = p.talents.map((t) => `[${TALENTS[t.id].name}]`).join(' ');
  return `정밀 적성검사 결과\n· 재능: ${tal || '뚜렷한 재능은 없다'}\n· 적성: ${fits.join(', ') || '아직 뚜렷하지 않다'}\n잠재력도 모두 확인되었다.`;
}

export const BUY_TAX = 0.04;
/** 주식·코인 거래 수수료 */
export const TRADE_FEE = 0.003;

export function artPrice(s: GameState, tier: number): number {
  return Math.round((ART_TIERS[tier].price * s.market.art) / 100);
}

/** 매수 가능 여부 (부동산은 40%만 있으면 대출, 나머지는 현금으로 전액) */
export function canBuy(s: GameState, kind: AssetKind, amount = 0): boolean {
  if (REAL_ESTATE.includes(kind)) return buyPower(s) >= s.market[kind as 'land'] * 0.4;
  if (kind === 'stock') return stockQuote(s, amount, TRADE_FEE).ok;
  return buyPower(s) >= Math.round(amount * (1 + (kind === 'coin' ? TRADE_FEE : 0)));
}

export function buyAsset(s: GameState, kind: AssetKind, amount = 0): string {
  const h = head(s);
  if (kind === 'stock' || kind === 'coin') {
    if (kind === 'stock') {
      const q = stockQuote(s, amount, TRADE_FEE);
      if (!q.ok) return q.why ?? '현금이 부족합니다';
      pay(s, h, Math.round(amount * (1 + TRADE_FEE)) - q.loan);
      const acc = addHolding(s, 'stock', h.id, amount);
      if (q.loan) acc.loan = (acc.loan ?? 0) + q.loan;
      return `주식 ${formatMoney(amount)} 매수` + (q.loan ? ` · 신용융자 ${formatMoney(q.loan)} (연 9.5%, 담보비율 140% 밑이면 반대매매)` : '');
    }
    if (!canBuy(s, kind, amount)) return '현금이 부족합니다 (코인은 빚내서 못 산다)';
    pay(s, h, Math.round(amount * (1 + TRADE_FEE)));
    addHolding(s, kind, h.id, amount);
    return `코인 ${formatMoney(amount)} 매수`;
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
  const price = s.market[kind as MarketKey];
  const total = Math.round(price * (1 + BUY_TAX));
  pay(s, h, total);
  addAsset(s, kind, h.id, price);
  return `${formatMoney(price)}에 매수 (취득세 ${formatMoney(total - price)})` + (h.cash < 0 ? ` · 대출 ${formatMoney(-h.cash)}` : '');
}

export function sellAsset(s: GameState, assetId: string): string {
  const a = s.assets.find((x) => x.id === assetId);
  if (!a) return '';
  if (isRealty(a)) {
    const r = sellRealty(s, a);
    const moved = afterHomeSold(s, a.id);
    if (moved) log(s, `🚚 ${moved}`, 'money');
    log(s, `🏷 ${a.name} 매도: 손에 쥔 돈 ${formatMoney(r.got)}${r.tax ? ` (양도세 ${formatMoney(r.tax)})` : ''}`, 'money');
    return `${a.name} 매도 → ${formatMoney(r.got)}` + (r.tax ? ` · 양도세 ${formatMoney(r.tax)} (${r.note})` : r.note ? ` · ${r.note}` : '') + (moved ? ` · ${moved}` : '');
  }
  const fake = exposeFakes(s, [a]).length > 0;
  const got = a.kind === 'treasure' ? treasureSellValue(a) : Math.round(a.value * (a.kind === 'stock' || a.kind === 'coin' ? 1 - TRADE_FEE : 1));
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
