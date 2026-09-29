import { chance, int, next, pick } from './rng';
import { ACHIEVEMENTS, FEMALE_NAMES, JOBS, MALE_NAMES } from './data';
import { addAsset, economyYear, formatMoney, marketYear, pay, personWorth, totalWorth } from './economy';
import { chooseSuccessor, giveGift, settleEstate, transferHeadship } from './estate';
import { EVENTS, RANDOM_EVENTS, makeSuitors, unlock, type Ctx } from './events';
import { deathChance, growthYear } from './growth';
import {
  addFlag,
  age,
  alive,
  clamp,
  createPerson,
  fullName,
  hasFlag,
  head,
  inherit,
  isDescendantOf,
  isMainline,
  livingMainlineMinors,
  spouseOf,
} from './people';
import type { AssetKind, GameState, Person, Sex, WillMode } from './types';

export interface NewGameOpts {
  seed?: number;
  familyName: string;
  sex: Sex;
  origin: GameState['origin'];
}

const START_YEAR = 2025;

export function newGame(o: NewGameOpts): GameState {
  const seed = o.seed ?? Math.floor(Math.random() * 2 ** 31);
  const s: GameState = {
    version: 1,
    rng: seed,
    seed,
    year: START_YEAR - 24,
    startYear: START_YEAR,
    familyName: o.familyName,
    origin: o.origin,
    headId: '',
    founderId: '',
    generation: 1,
    people: {},
    assets: [],
    gifts: [],
    familyCash: 0,
    fame: o.origin === 'rich' ? 30 : o.origin === 'middle' ? 10 : 0,
    market: { apt_seoul: 250000, apt_local: 30000, land: 20000 },
    policy: { lifestyle: 'balance', living: 'normal', familyPlan: 2, children: {} },
    will: 'legal',
    taxHeat: 0,
    events: [],
    eventSeq: 1,
    idSeq: 1,
    log: [],
    achievements: [],
  };
  const q = o.origin === 'rich' ? 58 : o.origin === 'middle' ? 52 : 46;
  const father = createPerson(s, { sex: 'M', surname: o.familyName, birthYear: START_YEAR - 56, quality: q, grown: 0.72 });
  const mother = createPerson(s, { sex: 'F', surname: 'SURNAME', birthYear: START_YEAR - 53, quality: q, grown: 0.72 });
  mother.surname = pick(s, ['이', '박', '최', '정', '강', '윤', '한']);
  mother.inLaw = true;
  father.spouseId = mother.id;
  mother.spouseId = father.id;
  s.people[father.id] = father;
  s.people[mother.id] = mother;

  // 본인: 부모에게서 유전된 뒤 24세까지 자란 상태로 시작
  s.year = START_YEAR - 24;
  const me = inherit(s, father, mother, o.familyName);
  me.sex = o.sex;
  me.name = pick(s, o.sex === 'M' ? MALE_NAMES : FEMALE_NAMES);
  s.year = START_YEAR - 21;
  const sib = inherit(s, father, mother, o.familyName);
  s.year = START_YEAR;
  for (const p of [me, sib]) {
    for (const k of Object.keys(p.actual) as (keyof typeof p.actual)[]) {
      p.actual[k] = Math.round(p.potential[k] * (0.55 + next(s) * 0.25));
    }
    father.childIds.push(p.id);
    mother.childIds.push(p.id);
    s.people[p.id] = p;
  }
  addFlag(me, me.actual.int >= 50 ? 'univ_top' : 'univ_local');
  sib.flags.push('student', 'univ_local', 'grad:' + (START_YEAR + 2));

  s.headId = me.id;
  s.founderId = me.id;

  if (o.origin === 'poor') {
    father.job = 'office';
    father.jobLevel = 1;
    mother.job = 'none';
    father.cash = 1500;
    me.cash = 300;
    addAsset(s, 'apt_local', father.id, s.market.apt_local * 0.7);
  } else if (o.origin === 'middle') {
    father.job = 'office';
    father.jobLevel = 4;
    mother.job = 'civil';
    mother.jobLevel = 3;
    father.cash = 15000;
    me.cash = 2000;
    addAsset(s, 'apt_local', father.id, s.market.apt_local);
    const land = addAsset(s, 'land', 'family', 30000);
    land.name = '종가 토지';
    s.familyCash = 5000;
  } else {
    father.job = 'founder';
    father.jobLevel = 3;
    mother.job = 'none';
    father.cash = 80000;
    mother.cash = 20000;
    me.cash = 10000;
    addAsset(s, 'apt_seoul', father.id, s.market.apt_seoul);
    addAsset(s, 'apt_seoul', mother.id, s.market.apt_seoul * 0.8);
    const land = addAsset(s, 'land', 'family', 200000);
    land.name = '종가 토지';
    s.familyCash = 50000;
  }
  father.affinity = 50;
  mother.affinity = 60;
  sib.affinity = 30;

  queue(s, 'notice', me.id, {
    title: `${o.familyName}씨 가문의 시작`,
    text: `${START_YEAR}년. ${fullName(me)}, ${age(s, me)}세.\n이제부터 당신이 ${o.familyName}씨 가문의 가주다.\n\n육성 → 혼인 → 출산 → 승계.\n가문을 영원히 이어가 보자.`,
    portrait: me.id,
  });
  queue(s, 'first_job', me.id);
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
  births(s);
  milestones(s);
  adultEvents(s);
  randomEvents(s);

  for (const p of mainlineMembers(s)) if (age(s, p) >= 20) s.fame += JOBS[p.job].fame * 0.5;
  s.fame = Math.max(0, Math.round(s.fame * 10) / 10);

  const after = familyTotal(s);
  log(s, `가문 총자산 ${formatMoney(after)} (${after >= before ? '+' : ''}${formatMoney(after - before)})`, 'money');
  checkAchievements(s);
}

function retirementAndGraduation(s: GameState) {
  for (const p of Object.values(s.people)) {
    if (!alive(p)) continue;
    const a = age(s, p);
    const grad = p.flags.find((f) => f.startsWith('grad:'));
    if (grad && Number(grad.slice(5)) <= s.year) {
      p.flags = p.flags.filter((f) => f !== grad && f !== 'student');
      if (hasFlag(p, 'med_school')) {
        p.job = 'doctor';
        p.jobYears = 0;
        p.jobLevel = 0;
        log(s, `🩺 ${fullName(p)} 의사 면허 취득`, 'life');
      } else if (isMainline(s, p)) {
        queue(s, 'first_job', p.id);
      } else {
        p.job = p.actual.int > 55 && chance(s, 0.4) ? 'civil' : 'office';
        p.jobLevel = int(s, 0, 1);
        log(s, `${fullName(p)} ${JOBS[p.job].name}으로 취업`, 'life');
      }
    }
    // 방계 자동 진학
    if (!isMainline(s, p) && a === 19 && !hasFlag(p, 'student') && p.job === 'none') {
      p.flags.push('student', 'univ_local', 'grad:' + (s.year + 4));
    }
    // 정년
    if ((p.job === 'office' || p.job === 'civil') && a >= 65) {
      p.job = 'pension';
      log(s, `${fullName(p)} 정년퇴직`, 'life');
    } else if ((p.job === 'doctor' || p.job === 'founder' || p.job === 'youtuber') && a >= 72) {
      p.job = 'pension';
      log(s, `${fullName(p)} 은퇴`, 'life');
    }
    if (p.job === 'none' && a >= 65) p.job = 'pension';
  }
}

function deaths(s: GameState) {
  const living = Object.values(s.people).filter(alive);
  for (const p of living) {
    if (!chance(s, deathChance(s, p))) continue;
    const wasHead = p.id === s.headId;
    const mainline = isMainline(s, p) || isRelevant(s, p);
    p.deathYear = s.year;
    const cause = age(s, p) > 70 ? '노환으로' : p.actual.hp < 30 ? '지병으로' : '불의의 사고로';
    log(s, `🕯 ${fullName(p)} ${cause} 별세 (향년 ${age(s, p)}세)`, 'death');

    if (wasHead) {
      const next = chooseSuccessor(s, p);
      const rep = settleEstate(s, p, next?.id);
      if (!next) {
        endGame(s, `${fullName(p)}의 사망. 뒤를 이을 자손이 없어 가문이 단절되었다.`);
        return;
      }
      transferHeadship(s, next);
      s.policy.lifestyle = 'balance';
      queue(s, 'notice', next.id, {
        title: '가주 승계',
        text:
          `${fullName(p)}이(가) ${cause} 세상을 떠났다. (향년 ${age(s, p)}세)\n\n` +
          rep.lines.join('\n') +
          `\n\n이제 ${fullName(next)}(${age(s, next)}세)이(가) ${s.generation}대 가주다.`,
        portrait: next.id,
      });
      log(s, `👑 ${fullName(next)} ${s.generation}대 가주 승계`, 'succession');
    } else {
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
}

/** 가주의 부모·형제도 부고 대상 */
function isRelevant(s: GameState, p: Person): boolean {
  const h = head(s);
  return p.id === h.fatherId || p.id === h.motherId || (!!p.fatherId && (p.fatherId === h.fatherId || p.motherId === h.motherId));
}

function fertility(a: number) {
  return a < 20 ? 0 : a < 35 ? 1 : a < 40 ? 0.55 : a < 45 ? 0.2 : 0;
}

function births(s: GameState) {
  const h = head(s);
  for (const mom of Object.values(s.people)) {
    if (!alive(mom) || mom.sex !== 'F' || !mom.spouseId) continue;
    const dad = s.people[mom.spouseId];
    if (!alive(dad)) continue;
    const couple = [mom, dad];
    const blood = couple.find((x) => x.id === h.id || isDescendantOf(s, x, h));
    if (!blood) continue; // v0.1: 직계만 출산
    const target = couple.some((x) => x.id === h.id) ? s.policy.familyPlan : 2;
    const kids = mom.childIds.filter((id) => alive(s.people[id])).length;
    if (kids >= target) continue;
    const pr = 0.5 * fertility(age(s, mom)) * clamp(mom.actual.hp / 55, 0.3, 1.2);
    if (!chance(s, pr)) continue;
    const baby = inherit(s, dad, mom, blood.surname);
    s.people[baby.id] = baby;
    dad.childIds.push(baby.id);
    mom.childIds.push(baby.id);
    s.policy.children[baby.id] = { budget: 1, focus: 'free' };
    const pool = baby.sex === 'M' ? MALE_NAMES : FEMALE_NAMES;
    const names = new Set<string>([baby.name]);
    while (names.size < 3) names.add(pick(s, pool));
    log(s, `👶 ${fullName(dad)}·${fullName(mom)} 부부에게 ${baby.sex === 'M' ? '아들' : '딸'} 출생`, 'birth');
    if (baby.flags.includes('mutation')) log(s, `…아기에게서 범상치 않은 기운이 느껴진다`, 'birth');
    queue(s, 'naming', dad.id, { childId: baby.id, names: [...names] });
  }
}

function milestones(s: GameState) {
  for (const p of livingMainlineMinors(s)) {
    const a = age(s, p);
    const ev = { 5: 'kinder', 8: 'elementary', 11: 'aptitude', 12: 'dream', 14: 'middle', 17: 'high', 19: 'path' }[a];
    if (ev) queue(s, ev, p.id);
    if (a >= 13 && p.happiness < 25 && chance(s, 0.5)) queue(s, 'rebellion', p.id);
  }
  for (const p of mainlineMembers(s)) if (hasFlag(p, 'retaking') && age(s, p) === 20) queue(s, 'path', p.id);
}

function adultEvents(s: GameState) {
  const h = head(s);
  for (const p of mainlineMembers(s)) {
    const a = age(s, p);
    if (a < 20 || p.inLaw) continue;
    if (p.job === 'none' && !hasFlag(p, 'student') && (hasFlag(p, 'exam_fail') || hasFlag(p, 'failed_pro')) && chance(s, 0.6)) {
      p.flags = p.flags.filter((f) => f !== 'exam_fail' && f !== 'failed_pro');
      queue(s, 'first_job', p.id);
    }
    if (p.job === 'athlete' && a === 34) queue(s, 'athlete_retire', p.id);
    if (p.job === 'youtuber' && p.jobLevel === 0 && p.jobYears >= 4) queue(s, 'yt_slump', p.id);
    const everMarried = !!p.spouseId;
    if (!everMarried && a >= 25 && a <= 40 && !s.events.some((e) => e.personId === p.id && e.defId === 'suitors')) {
      const due = p.id === h.id ? true : a >= 27 && (a - 27) % 3 === 0;
      if (due) queue(s, 'suitors', p.id, { candidates: makeSuitors(s, p, 42 + Math.min(20, s.fame / 5)) });
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

function checkAchievements(s: GameState) {
  if (familyTotal(s) >= 1_000_000) unlock(s, 'rich100');
  for (const p of Object.values(s.people)) {
    if (p.job === 'doctor' || hasFlag(p, 'was_doctor')) {
      addFlag(p, 'was_doctor');
      const par = [p.fatherId, p.motherId].map((id) => id && s.people[id]).find((x) => x && hasFlag(x, 'was_doctor')) as Person | undefined;
      const gp = par && ([par.fatherId, par.motherId].map((id) => id && s.people[id]).find((x) => x && hasFlag(x, 'was_doctor')) as Person | undefined);
      if (gp) unlock(s, 'doctor3');
    }
    if (alive(p) && p.job === 'none' && hasFlag(p, 'chosen_idle') && personWorth(s, p) >= 100000) unlock(s, 'noble_idle');
  }
}

function endGame(s: GameState, reason: string) {
  const score = Math.round(s.fame + familyTotal(s) / 10000 + s.generation * 50 + s.achievements.length * 30);
  s.gameOver = { reason, score };
  s.events = [];
  log(s, `⚰ ${reason}`, 'death');
}

// ─────────────────────── 이벤트 처리 ───────────────────────

export function currentEvent(s: GameState) {
  const ev = s.events[0];
  if (!ev) return undefined;
  const def = EVENTS[ev.defId];
  const p = s.people[ev.personId];
  const ctx: Ctx = { s, p, ev };
  const text = def.text(ctx);
  return { ev, def, ctx, title: def.title(ctx), text, choices: def.choices(ctx), portraits: def.portraits?.(ctx) ?? [p] };
}

export function resolveChoice(s: GameState, idx: number): string {
  const cur = currentEvent(s);
  if (!cur) return '';
  const ch = cur.choices[idx];
  if (!ch || ch.disabled) return '';
  if (ch.cost) pay(s, head(s), ch.cost);
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

export function buyAsset(s: GameState, kind: AssetKind): string {
  const h = head(s);
  const price = s.market[kind];
  const total = Math.round(price * (1 + BUY_TAX));
  pay(s, h, total);
  addAsset(s, kind, h.id, price);
  return `${formatMoney(price)}에 매수 (취득세 ${formatMoney(total - price)})` + (h.cash < 0 ? ` · 대출 ${formatMoney(-h.cash)}` : '');
}

export function sellAsset(s: GameState, assetId: string): string {
  const a = s.assets.find((x) => x.id === assetId);
  if (!a) return '';
  if (a.ownerId === 'family') s.familyCash += a.value;
  else s.people[a.ownerId].cash += a.value;
  s.assets = s.assets.filter((x) => x.id !== assetId);
  return `${a.name} 매각: ${formatMoney(a.value)}`;
}

export function gift(s: GameState, toId: string, amount: number): string {
  const r = giveGift(s, head(s), s.people[toId], amount);
  if (r.ok) log(s, `🎁 ${r.msg}`, 'money');
  return r.msg;
}

export { ACHIEVEMENTS, spouseOf };
