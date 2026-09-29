import { chance, int, normal, pick } from './rng';
import { ART_TIERS, DREAM_QUOTES, EXAMS, JOB_CATS, JOB_IDS, JOBS, PREP_TIERS, STAT_NAMES, SURNAMES, TAG_NAMES, TALENTS } from './data';
import { MAJOR_JOBS } from './school';
import { startDating } from './romance';
import { appealBonus } from './marks';
import { unlock } from './achievements';
import { addAsset, formatMoney, jobLabel, jobTitle, pay, personWorth, statScore } from './economy';
import { estateTax, giveGift } from './estate';
import {
  addFlag,
  age,
  alive,
  check,
  clamp,
  computeDesire,
  createPerson,
  discoverTalent,
  fullName,
  hasFlag,
  hasTalent,
  hasTrait,
  head,
  householder,
  isMainline,
  mark,
} from './people';
import type { GameState, JobId, Person, StatKey } from './types';

import {
  applyDesire,
  eul,
  eun,
  exposeFakes,
  gate,
  iga,
  ok,
  queueNext,
  req,
  schedule,
  setJob,
  setStudy,
  spendable,
  stars,
  tr,
  who,
  type Choice,
  type Ctx,
  type EventDef,
  type RandomDef,
} from './ev-util';
export type { Choice, Ctx, EventDef, RandomDef } from './ev-util';
export { spendable, setStudy, exposeFakes, queueNext } from './ev-util';

// ───────────────────────── 미성년 마일스톤 ─────────────────────────

const kinder: EventDef = {
  id: 'kinder',
  title: () => '유치원 선택',
  text: (c) => `${iga(who(c))} 다섯 살이 되었다. 어디로 보낼까?`,
  choices: (c) => gate(c.s, [
    { label: '영어유치원', cost: 2400, run: (x) => (addFlag(x.p, 'kinder_eng'), `${iga(who(x))} 영어로 옹알이를 시작했다.`) },
    { label: '동네 어린이집', cost: 300, run: (x) => `${iga(who(x))} 친구들과 잘 어울린다.` },
    {
      label: '집에서 직접 키운다',
      run: (x) => {
        x.p.affinity = clamp(x.p.affinity + 10, -100, 100);
        x.p.happiness = clamp(x.p.happiness + 8, 0, 100);
        return `부모와 보낸 시간이 많아 유대가 깊어졌다.`;
      },
    },
  ]),
};

const elementary: EventDef = {
  id: 'elementary',
  title: () => '초등학교 입학',
  text: (c) => `${iga(who(c))} 여덟 살. 초등학교에 갈 나이가 되었다.`,
  choices: (c) =>
    gate(c.s, [
      { label: '동네 공립초', run: (x) => (addFlag(x.p, 'elem_public'), `평범하지만 무난한 시작.`) },
      { label: '사립초', cost: 3000, run: (x) => (addFlag(x.p, 'elem_private'), `교복을 입은 ${iga(who(x))} 제법 의젓하다.`) },
      {
        label: '국제학교',
        cost: 8000,
        req: ['재산 5억 이상'],
        disabled: personWorth(c.s, head(c.s)) < 50000,
        run: (x) => (addFlag(x.p, 'elem_intl'), `외국인 친구들 사이에서 ${iga(who(x))} 빠르게 적응한다.`),
      },
      {
        label: '대안학교',
        cost: 1000,
        run: (x) => {
          addFlag(x.p, 'elem_alt');
          x.p.happiness = clamp(x.p.happiness + 12, 0, 100);
          const t = x.p.talents.find((t) => !t.discovered);
          if (t && chance(x.s, 0.4)) {
            discoverTalent(x.p, t.id);
            return `자유로운 수업 속에서 [${TALENTS[t.id].name}] 재능이 드러났다!`;
          }
          return `${iga(who(x))} 매일 웃으며 학교에 간다.`;
        },
      },
    ]),
};

const aptitude: EventDef = {
  id: 'aptitude',
  title: () => '재능을 찾아서',
  text: (c) => `${iga(who(c))} 열한 살. 이것저것 해보게 할 시기다. 하나만 골라 도전시켜 보자.`,
  choices: (c) => gate(c.s, [
    {
      label: '영재원 시험',
      cost: 200,
      req: [req('int', 60)],
      tag: 'study',
      run: (x) => {
        const g = hasTalent(x.p, 'genius');
        if (g) discoverTalent(x.p, 'genius');
        if (check(x.s, x.p.actual.int + (g ? 20 : 0), 38, 5)) {
          addFlag(x.p, 'gifted');
          return `합격! ${g ? '[수재] 재능이 확인되었다. ' : ''}영재원에 다니게 된다.` + applyDesire(x, 'study');
        }
        return `불합격. ${g ? '그래도 시험관이 [수재]의 싹을 봤다고 한다.' : '공부 쪽은 아직인가 보다.'}` + applyDesire(x, 'study');
      },
    },
    {
      label: '운동부 테스트',
      req: [req('str', 60)],
      tag: 'sport',
      run: (x) => {
        const g = hasTalent(x.p, 'athlete');
        if (g) discoverTalent(x.p, 'athlete');
        if (check(x.s, x.p.actual.str + (g ? 20 : 0), 36, 5)) {
          addFlag(x.p, 'sports_team');
          return `운동부에 뽑혔다! ${g ? '코치가 [운동신경]이 남다르다며 흥분한다.' : ''}` + applyDesire(x, 'sport');
        }
        return `탈락했다. ${g ? '하지만 코치가 [운동신경]은 있다고 귀띔했다.' : ''}` + applyDesire(x, 'sport');
      },
    },
    {
      label: '아역 오디션',
      cost: 300,
      req: [req('cha', 60)],
      tag: 'stage',
      run: (x) => {
        const g = hasTalent(x.p, 'star');
        if (g) discoverTalent(x.p, 'star');
        if (check(x.s, x.p.actual.cha + (g ? 20 : 0), 38, 5)) {
          addFlag(x.p, 'trainee');
          return `기획사 연습생 제안을 받았다! ${g ? '[스타성]이 번뜩인다.' : ''}` + applyDesire(x, 'stage');
        }
        return `오디션에서 떨어졌다.` + applyDesire(x, 'stage');
      },
    },
    {
      label: '용돈 벌이를 시켜본다',
      tag: 'business',
      run: (x) => {
        if (hasTalent(x.p, 'merchant')) {
          discoverTalent(x.p, 'merchant');
          x.p.cash += 100;
          return `문방구에서 떼온 물건을 되팔아 100만원을 벌었다! [장사꾼] 재능이다.` + applyDesire(x, 'business');
        }
        return `딱지를 팔아 3천원을 벌었다. 귀엽다.` + applyDesire(x, 'business');
      },
    },
    {
      label: '그냥 놀게 둔다',
      tag: 'free',
      run: (x) => {
        x.p.happiness = clamp(x.p.happiness + 10, 0, 100);
        const t = x.p.talents.find((t) => !t.discovered);
        if (t && chance(x.s, 0.15)) {
          discoverTalent(x.p, t.id);
          return `놀다가 우연히 [${TALENTS[t.id].name}] 재능이 드러났다!`;
        }
        return `${iga(who(x))} 해맑게 뛰어논다.` + applyDesire(x, 'free');
      },
    },
  ]),
};

const dream: EventDef = {
  id: 'dream',
  title: () => '장래희망',
  text: (c) => {
    c.p.desire = c.p.desire ?? computeDesire(c.p);
    c.ev.data ??= { quote: pick(c.s, DREAM_QUOTES[c.p.desire]) };
    return `${iga(who(c))} 진지하게 말한다.\n"${c.ev.data.quote}"`;
  },
  choices: () => [
    {
      label: '응원한다',
      run: (x) => {
        x.p.desireKnown = true;
        x.p.affinity = clamp(x.p.affinity + 12, -100, 100);
        x.p.happiness = clamp(x.p.happiness + 8, 0, 100);
        return `${iga(who(x))} 환하게 웃는다. (꿈에 맞는 선택을 하면 성장 보너스)`;
      },
    },
    {
      label: '다른 길을 권한다',
      run: (x) => {
        x.p.desireKnown = true;
        x.p.affinity = clamp(x.p.affinity - 6, -100, 100);
        if (chance(x.s, 0.35 + x.p.actual.mor / 300)) {
          x.p.desire = 'study';
          return `${iga(who(x))} 고민 끝에 공부를 해보겠다고 한다.`;
        }
        return `${iga(who(x))} 입을 삐죽 내민다. 꿈은 그대로인 것 같다.`;
      },
    },
  ],
};

const middle: EventDef = {
  id: 'middle',
  title: () => '중학교 진학',
  text: (c) => `${iga(who(c))} 중학생이 된다.`,
  choices: (c) => {
    const p = c.p;
    return gate(c.s, [
      { label: '일반 중학교', run: () => `무난하게 진학했다.` },
      {
        label: '국제중',
        cost: 3000,
        req: [req('int', 45), '사립초·국제학교·영재원 출신'],
        tag: 'study',
        disabled: !(hasFlag(p, 'elem_private') || hasFlag(p, 'elem_intl') || hasFlag(p, 'gifted')),
        run: (x) => {
          if (check(x.s, x.p.actual.int, 42, 6)) return addFlag(x.p, 'mid_intl'), `국제중 합격!` + applyDesire(x, 'study');
          return `국제중 추첨에서 떨어져 일반 중학교로.`;
        },
      },
      {
        label: '체육중 (운동부 계속)',
        req: ['운동부 출신'],
        tag: 'sport',
        disabled: !hasFlag(p, 'sports_team'),
        run: (x) => (addFlag(x.p, 'mid_sport'), `본격적인 선수 생활이 시작됐다.` + applyDesire(x, 'sport')),
      },
      {
        label: '예술중',
        cost: 1500,
        req: [req('cha', 45)],
        tag: 'stage',
        run: (x) => {
          if (check(x.s, x.p.actual.cha + (hasFlag(x.p, 'trainee') ? 10 : 0), 42, 6)) return addFlag(x.p, 'mid_art'), `예술중 합격!` + applyDesire(x, 'stage');
          return `실기에서 떨어져 일반 중학교로.`;
        },
      },
    ]);
  },
};

const high: EventDef = {
  id: 'high',
  title: () => '고등학교 진학',
  text: (c) => `${iga(who(c))} 열일곱. 인생의 방향이 슬슬 정해진다.`,
  choices: (c) => {
    const p = c.p;
    return gate(c.s, [
      { label: '일반고', run: () => `평범한 고등학교 생활이 시작됐다.` },
      {
        label: '자사고·특목고',
        cost: 4000,
        req: [req('int', 55)],
        tag: 'study',
        run: (x) => {
          if (check(x.s, x.p.actual.int + (hasFlag(x.p, 'mid_intl') ? 6 : 0), 52, 6))
            return addFlag(x.p, 'high_elite'), `특목고 합격! 입시 전쟁이 시작된다.` + applyDesire(x, 'study');
          return `불합격. 일반고로 진학했다.`;
        },
      },
      {
        label: '체육고',
        req: ['운동부·체육중 출신', req('str', 50)],
        tag: 'sport',
        disabled: !(hasFlag(p, 'sports_team') || hasFlag(p, 'mid_sport')),
        run: (x) => (addFlag(x.p, 'high_sport'), `체고에 진학했다. 프로의 꿈이 가까워진다.` + applyDesire(x, 'sport')),
      },
      {
        label: '예고 / 연습생 계약',
        cost: 2000,
        req: ['연습생·예술중 출신'],
        tag: 'stage',
        disabled: !(hasFlag(p, 'trainee') || hasFlag(p, 'mid_art')),
        run: (x) => (addFlag(x.p, 'high_art'), `데뷔를 향한 혹독한 트레이닝이 시작됐다.` + applyDesire(x, 'stage')),
      },
      {
        label: '특성화고 (빠른 취업)',
        run: (x) => (addFlag(x.p, 'high_voc'), `기술을 배워 일찍 사회에 나가기로 했다.` + applyDesire(x, 'free')),
      },
      {
        label: '자퇴 → 검정고시',
        run: (x) => {
          addFlag(x.p, 'dropout');
          x.p.happiness = clamp(x.p.happiness + 10, 0, 100);
          x.p.affinity = clamp(x.p.affinity - 5, -100, 100);
          return `학교를 그만두고 자기만의 길을 찾기로 했다.` + applyDesire(x, 'free');
        },
      },
    ]);
  },
};

// ───────────────────────── 진로: 분야를 먼저 고르고, 그 안에서 선택 ─────────────────────────

/** 선택지 목록을 분야별로 나눠 보여주는 2단계 이벤트 */
function categorized(c: Ctx, cats: [string, string, () => Choice[]][]): Choice[] {
  const cur = c.ev.data?.cat as string | undefined;
  const found = cats.find(([id]) => id === cur);
  if (found) {
    return [
      ...gate(c.s, found[2]()),
      {
        label: '← 다른 분야 보기',
        run: (x) => {
          x.ev.data = { ...x.ev.data, cat: undefined };
          return { text: '', keep: true };
        },
      },
    ];
  }
  return cats.map(([id, label]) => ({
    label,
    run: (x) => {
      x.ev.data = { ...x.ev.data, cat: id };
      return { text: '', keep: true };
    },
  }));
}


const examOf = (p: Person) => p.flags.find((f) => f.startsWith('prep:'))?.slice(5);
const triesOf = (p: Person) => Number(p.flags.find((f) => f.startsWith('tries:'))?.slice(6) ?? 0);
const clearPrep = (p: Person) => (p.flags = p.flags.filter((f) => !f.startsWith('prep:') && !f.startsWith('tries:')));

/** 시험 준비 시작: 백수 상태로 공부하며 매년 응시 */
export function startPrep(s: GameState, p: Person, examId: string, now = true) {
  clearPrep(p);
  setJob(p, 'none');
  p.flags.push('prep:' + examId, 'tries:0');
  if (now) queueNext(s, 'exam', p.id);
}

const hasUniv = (p: Person) => hasFlag(p, 'univ_top') || hasFlag(p, 'univ_seoul') || hasFlag(p, 'univ_local');

function examChoice(label: string, examId: string, extra: Partial<Choice> & { pre?: (x: Ctx) => void } = {}): Choice {
  const e = EXAMS[examId];
  const { pre, ...rest } = extra;
  return {
    label,
    req: [...Object.keys(e.stats).map((k) => req(k as StatKey, e.pass)), ...(e.univ ? ['대학 졸업'] : [])],
    ...rest,
    run: (x) => {
      pre?.(x);
      startPrep(x.s, x.p, examId);
      return `${e.name} 준비를 시작했다. ${e.desc}`;
    },
  };
}

/** 시험 점수 (능력치 가중합 + 출신 보너스 + 재수 경험) */
export function examScore(p: Person, examId: string, prepBonus: number): number {
  const e = EXAMS[examId];
  let v = 0;
  for (const k of Object.keys(e.stats) as StatKey[]) v += p.actual[k] * e.stats[k]!;
  if (e.bonusFlags?.some((f) => hasFlag(p, f))) v += 8;
  if (MAJOR_JOBS[majorOf(p) ?? '']?.includes(e.job)) v += 5;
  if (hasTrait(p, 'diligent')) v += 3;
  if (hasTrait(p, 'lazy')) v -= 3;
  if (hasTalent(p, 'genius') && e.stats.int) v += 5 * e.stats.int;
  return v + prepBonus + Math.min(10, triesOf(p) * 2.5);
}

const exam: EventDef = {
  id: 'exam',
  title: (c) => EXAMS[examOf(c.p) ?? 'civil'].name,
  text: (c) => {
    const id = examOf(c.p) ?? 'civil';
    const e = EXAMS[id];
    const t = triesOf(c.p);
    return (
      `${who(c)}, ${e.name} ${t + 1}번째 도전.` +
      (t ? `\n(지난 ${t}번은 불합격. 경험이 쌓여 조금 유리하다)` : `\n${e.desc}`) +
      (e.maxTries ? `\n남은 응시 기회 ${e.maxTries - t}번` : '') +
      `\n어떻게 준비할까?`
    );
  },
  choices: (c) => {
    const id = examOf(c.p) ?? 'civil';
    const e = EXAMS[id];
    const tiers: Choice[] = PREP_TIERS.map(([name, cost, bonus]) => ({
      label: `${name}${cost ? '' : ' (돈 안 듦)'}`,
      cost: cost || undefined,
      run: (x) => {
        if (bonus >= 13) {
          x.p.happiness = clamp(x.p.happiness - 5, 0, 100);
          x.p.actual.hp = clamp(x.p.actual.hp - 2, 0, 100);
        }
        if (check(x.s, examScore(x.p, id, bonus), e.pass, 7)) {
          clearPrep(x.p);
          setJob(x.p, e.job, e.level);
          addFlag(x.p, 'passed:' + id);
          if (triesOf(x.p) >= 4) addFlag(x.p, 'long_prep');
          x.p.happiness = clamp(x.p.happiness + 12, 0, 100);
          const n = triesOf(x.p);
          return `🎉 합격! ${who(x)}${tr(who(x), '은', '는')} 이제 ${jobTitle(x.p)}.` + (n >= 3 ? ` (${n + 1}수 끝에!)` : '') + applyDesire(x, JOBS[e.job]?.entry?.tag);
        }
        const n = triesOf(x.p) + 1;
        x.p.flags = x.p.flags.filter((f) => !f.startsWith('tries:'));
        x.p.flags.push('tries:' + n);
        x.p.happiness = clamp(x.p.happiness - 6, 0, 100);
        if (e.maxTries && n >= e.maxTries) {
          clearPrep(x.p);
          addFlag(x.p, 'exam_out:' + id);
          if (isMainline(x.s, x.p)) queueNext(x.s, 'first_job', x.p.id);
          return `불합격. 응시 기회를 모두 써버렸다… 다른 길을 찾아야 한다.`;
        }
        return `불합격. ${n}수째 실패다.` + (n >= 3 ? ' 주변의 시선이 따갑다.' : '') + ' 내년에 다시 도전할 수 있다.';
      },
    }));
    return gate(c.s, [
      ...tiers,
      {
        label: '포기하고 다른 길을 찾는다',
        run: (x) => {
          clearPrep(x.p);
          x.p.happiness = clamp(x.p.happiness + 5, 0, 100);
          queueNext(x.s, 'first_job', x.p.id);
          return `${e.name}${tr(e.name, '은', '는')} 여기까지. 미련 없이 접었다.`;
        },
      },
    ]);
  },
};


// ───────────────────────── 성인 ─────────────────────────

/** 직업 DB의 진입 방식에 따라 선택지 만들기 */
function jobChoice(c: Ctx, id: string): Choice | undefined {
  const j = JOBS[id];
  const e = j?.entry;
  if (!e || id === 'none') return;
  const p = c.p;
  const a = age(c.s, p);
  const lacks = (e.needFlags && !e.needFlags.some((f) => hasFlag(p, f))) || (e.univ && !hasUniv(p)) || (e.maxAge !== undefined && a > e.maxAge);
  const extraReq = [...(e.needNote ? [e.needNote] : []), ...(e.univ ? ['대학 졸업'] : []), ...(e.maxAge ? [`${e.maxAge}세 이하`] : [])];
  const majorFit = MAJOR_JOBS[majorOf(p) ?? '']?.includes(id);
  if (e.how === 'exam' && e.exam) {
    const ch = examChoice(`${j.name} · ${EXAMS[e.exam].name}`, e.exam, {
      cost: e.cost,
      tag: e.tag,
      disabled: !!lacks,
      pre: (x) => {
        if (id === 'pilot') addFlag(x.p, 'flight_school');
      },
    });
    ch.req = [...(ch.req ?? []), ...extraReq.filter((r) => !ch.req?.includes(r)), ...(majorFit ? ['전공 일치'] : [])];
    return ch;
  }
  if (e.how === 'hire') {
    const w = j.stats ?? { int: 1 };
    return {
      label: j.name,
      cost: e.cost,
      tag: e.tag,
      disabled: !!lacks,
      req: [...Object.keys(w).slice(0, 2).map((k) => req(k as StatKey, (e.pass ?? 30) + 10)), ...extraReq, ...(majorFit ? ['전공 일치'] : [])],
      run: (x) => {
        const score = statScore(x.p, w) + (hasFlag(x.p, 'univ_top') ? 5 : 0) + (majorFit ? 8 : 0) + (hasTrait(x.p, 'social') ? 3 : 0) + (hasTrait(x.p, 'diligent') ? 3 : 0);
        if (check(x.s, score, e.pass ?? 30, 7)) {
          setJob(x.p, id, e.level ?? 0);
          return (e.text ?? `${j.name}(으)로 일하게 되었다.`) + applyDesire(x, e.tag);
        }
        return { text: `${j.name} 지원 결과: 불합격. 다른 곳을 알아보자.`, keep: true };
      },
    };
  }
  if (e.how === 'start') {
    return {
      label: j.name + (e.cost ? '' : ''),
      cost: e.cost,
      tag: e.tag,
      req: [...(j.stats ? Object.keys(j.stats).slice(0, 1).map((k) => req(k as StatKey, 50)) : []), ...extraReq],
      run: (x) => {
        setJob(x.p, id, 0);
        if (id === 'founder' && hasTalent(x.p, 'merchant') && discoverTalent(x.p, 'merchant')) return '사업을 시작했다. 거래처를 다루는 솜씨를 보니 [장사꾼] 재능이 있다!';
        return (e.text ?? `${j.name}의 길을 걷기 시작했다.`) + applyDesire(x, e.tag);
      },
    };
  }
}

const majorOf = (p: Person) => p.flags.find((f) => f.startsWith('major:'))?.slice(6);

/** 특수 경로 (진학·교육 과정) */
function specialChoices(c: Ctx, cat: string): Choice[] {
  const p = c.p;
  const univ = hasUniv(p);
  const a = age(c.s, p);
  const out: Choice[] = [];
  if (cat === 'legal')
    out.push({
      label: '로스쿨 진학 (→ 변호사·판사·검사)',
      req: [req('int', 65), '대학 졸업', '합격 시 학비 6천만'],
      tag: 'study',
      disabled: !univ || !ok(6000, c.s),
      run: (x) => {
        if (check(x.s, x.p.actual.int + (hasFlag(x.p, 'univ_top') ? 8 : 0) + (majorOf(x.p) === 'law' ? 5 : 0), 58, 6)) {
          pay(x.s, householder(x.s), 6000);
          setStudy(x.s, x.p, 3, 'law_school');
          return `로스쿨 합격! 3년 뒤 변호사 시험(5회 제한). 성적이 좋으면 판사·검사 임용도 노릴 수 있다.` + applyDesire(x, 'study');
        }
        return { text: `로스쿨 입시에 떨어졌다. 다른 길을 골라보자.`, keep: true };
      },
    });
  if (cat === 'edu' || cat === 'tech' || cat === 'rec')
    out.push({
      label: '대학원 진학 (→ 교수·연구원)',
      cost: 3000,
      req: [req('int', 70), '대학 졸업', '수재 유리'],
      tag: 'study',
      disabled: !univ,
      run: (x) => (setStudy(x.s, x.p, 5, 'grad_school'), `석박사 과정을 시작했다. 5년 뒤 교수 임용에 도전한다.` + applyDesire(x, 'study')),
    });
  if (cat === 'tech')
    out.push(
      examChoice('개발 부트캠프 → IT 취업', 'developer', {
        cost: 1000,
        tag: 'study',
        pre: (x) => addFlag(x.p, 'bootcamp'),
      }),
    );
  if (cat === 'media') {
    out.push(
      {
        label: '유튜버 (장비 풀세팅)',
        cost: 500,
        tag: 'stage',
        run: (x) => (setJob(x.p, 'youtuber', 0), addFlag(x.p, 'invest:1'), `카메라·조명·마이크를 샀다. 그래도 구독자는 가족뿐.` + applyDesire(x, 'stage')),
      },
      {
        label: '유튜버 (편집자·스튜디오까지)',
        cost: 3000,
        tag: 'stage',
        run: (x) => (setJob(x.p, 'youtuber', 0), addFlag(x.p, 'invest:3'), `스튜디오를 빌리고 편집자를 고용했다.` + applyDesire(x, 'stage')),
      },
    );
  }
  if (cat === 'sport')
    out.push({
      label: '프로게이머 도전',
      req: [req('int', 55), '24세 이하'],
      tag: 'sport',
      disabled: a > 24,
      run: (x) => {
        if (check(x.s, x.p.actual.int * 0.6 + x.p.actual.str * 0.4, 60, 6)) return setJob(x.p, 'gamer', 1), `🎮 프로게임단 2군에 들어갔다!` + applyDesire(x, 'sport');
        return { text: `입단 테스트 탈락. 랭크 점수가 모자랐다.`, keep: true };
      },
    });
  if (cat === 'etc')
    out.push({
      label: '백수로 산다 (기본소득)',
      tag: 'free',
      run: (x) => {
        setJob(x.p, 'none');
        addFlag(x.p, 'chosen_idle');
        x.p.happiness = clamp(x.p.happiness + 15, 0, 100);
        x.s.fame = Math.max(0, x.s.fame - 2);
        return `기본소득으로 소소하게 살기로 했다. 가문 어른들이 혀를 찬다.` + applyDesire(x, 'free');
      },
    });
  return out;
}

const firstJob: EventDef = {
  id: 'first_job',
  title: () => '진로 선택',
  text: (c) => {
    const p = c.p;
    const school = p.flags.filter((f) => f.startsWith('school:')).pop()?.slice(7);
    return (
      `${iga(who(c))} 사회로 나갈 차례다. (${age(c.s, p)}세 · ${school ? school + ' 졸업' : hasUniv(p) ? '대졸' : '고졸'})` +
      (c.ev.data?.cat ? '' : `\n어느 분야로 가볼까? 시험은 붙을 때까지 매년 볼 수 있고, 떨어지면 다른 분야를 골라도 된다.`)
    );
  },
  choices: (c) => {
    const p = c.p;
    const major = majorOf(p);
    const cats: [string, string, () => Choice[]][] = [];
    if (major && MAJOR_JOBS[major])
      cats.push([
        'rec',
        '🎯 전공 추천',
        () => [...MAJOR_JOBS[major].map((id) => jobChoice(c, id)).filter((x): x is Choice => !!x), ...(hasUniv(p) ? specialChoices(c, 'legal') : []), ...specialChoices(c, 'rec')],
      ]);
    for (const [cat, label] of Object.entries(JOB_CATS)) {
      cats.push([
        cat,
        label,
        () => [
          ...JOB_IDS.filter((id) => JOBS[id].cat === cat)
            .map((id) => jobChoice(c, id))
            .filter((x): x is Choice => !!x),
          ...specialChoices(c, cat),
        ],
      ]);
    }
    return categorized(c, cats);
  },
};

// ───────────────────────── 소개팅 → 프러포즈 ─────────────────────────

export const DATE_JOBS: JobId[] = [
  'office', 'office', 'office', 'corp', 'civil', 'civil', 'teacher', 'nurse', 'police', 'developer', 'public_corp',
  'parttime', 'none', 'shopkeeper', 'founder', 'doctor', 'lawyer', 'pharmacist', 'accountant', 'youtuber', 'musician', 'writer',
];

/** 나이가 들수록 후보의 폭이 좁아지고(나이 많은 후보·돌싱 증가), 결혼 확률도 떨어진다 */
export function agePenalty(a: number): number {
  return Math.max(0, a - 32) * 1.2 + (a >= 40 ? 6 : 0) + (a >= 45 ? 10 : 0);
}

/** 소개팅 상대 1명 생성. bonus = 결혼정보회사 등급 */
export function makeDate(s: GameState, p: Person, bonus = 0): Person {
  const a = age(s, p);
  const quality = 44 + Math.min(18, s.fame / 5) + bonus - Math.max(0, a - 34) * 0.9;
  const older = a >= 38;
  const candAge = Math.max(23, a + (older ? int(s, -6, 5) : int(s, -4, 3)));
  const cand = createPerson(s, {
    sex: p.sex === 'M' ? 'F' : 'M',
    surname: pick(s, SURNAMES),
    birthYear: s.year - candAge,
    quality,
    grown: 0.7,
  });
  cand.job = pick(s, DATE_JOBS);
  cand.jobLevel = int(s, 0, Math.min(JOBS[cand.job].maxLevel, Math.floor((candAge - 24) / 5)));
  cand.cash = Math.round(Math.max(300, (quality - 30) * 120 + (candAge - 25) * 250 + int(s, 0, 6000) + bonus * 400));
  cand.inLaw = true;
  if (candAge >= 36 && chance(s, 0.3)) cand.flags.push('divorced');
  const shows = new Set<string>([pick(s, ['str', 'int', 'cha', 'mor', 'hp']), pick(s, ['int', 'cha', 'mor'])]);
  for (const k of shows) cand.flags.push('show:' + k);
  return cand;
}

function makeSuitors(s: GameState, p: Person, quality: number): Person[] {
  return [0, 1, 2].map(() => makeDate(s, p, quality - 44));
}

/** 매력도: 외모·성품·명성·재산 + 직업 번듯함 */
export function appeal(s: GameState, p: Person): number {
  return 10 + appealBonus(p) + Math.min(10, p.jobLevel * 2 + Math.max(0, JOBS[p.job].fame) * 2) + (hasTrait(p, 'social') ? 6 : hasTrait(p, 'shy') ? -6 : 0) + (hasTrait(p, 'flirt') ? 4 : 0) + p.actual.cha * 0.7 + p.actual.mor * 0.2 + Math.min(20, s.fame * 0.25) + Math.min(25, (personWorth(s, p) + s.familyCash * 0.3) / 4000);
}
export function desirability(c: Person): number {
  const a = c.actual;
  return (a.str + a.int + a.cha + a.mor + a.hp) / 5 + Math.min(20, c.cash / 1500) + (c.flags.includes('divorced') ? -6 : 0);
}

export function marry(s: GameState, p: Person, sp: Person) {
  sp.flags = sp.flags.filter((f) => !f.startsWith('show:') && f !== 'partner');
  p.partnerId = sp.partnerId = undefined;
  p.flags = p.flags.filter((f) => !f.startsWith('dating_since:'));
  if (p.spouseId || p.flags.includes('divorced')) p.flags.push('remarried');
  sp.spouseId = p.id;
  sp.affinity = 40;
  p.spouseId = sp.id;
  const bond = 62 + normal(s, 0, 12) + [p, sp].reduce((t, x) => t + (hasTrait(x, 'devoted') ? 10 : hasTrait(x, 'flirt') ? -10 : 0), 0);
  p.bond = sp.bond = Math.round(Math.max(20, Math.min(100, bond)));
  for (const x of [p, sp]) {
    x.flags = x.flags.filter((f) => !f.startsWith('wed:') && !f.startsWith('kangaroo:'));
    x.flags.push('wed:' + s.year);
    if (!x.flags.includes('indep')) x.flags.push('indep'); // 결혼하면 살림을 따로 난다
  }
  const a = age(s, p);
  if (a >= 45) p.flags.push('late_marriage');
  if (a < 25) p.flags.push('young_marriage');
  s.people[sp.id] = sp;
  s.log.push({ year: s.year, text: `💍 ${fullName(p)} ♥ ${fullName(sp)} 결혼 (${age(s, p)}세 · 지참금 ${formatMoney(sp.cash)})`, kind: 'life' });
}

export function suitorLine(c: Person, s: GameState): string {
  const shown = c.flags.filter((f) => f.startsWith('show:')).map((f) => f.slice(5) as StatKey);
  const uniq = [...new Set(shown)];
  const statTxt = uniq.map((k) => `${STAT_NAMES[k]}${stars(c.actual[k])}`).join(' ');
  return `${fullName(c)} ${s.year - c.birthYear}세${c.flags.includes('divorced') ? '(돌싱)' : ''} · ${jobLabel(c)} · 집안${stars(c.cash / 150)} · ${statTxt}`;
}

/** 번듯한 직장이 없으면 결혼 승낙을 받기 어렵다 */
export function jobless(p: Person): boolean {
  return ['none', 'parttime'].includes(p.job) || p.flags.some((f) => f === 'student' || f.startsWith('prep:') || f.startsWith('serving:'));
}

export const AGENCY_TIERS: [string, number, number][] = [
  ['결혼정보회사 일반 회원', 500, 6],
  ['결혼정보회사 VIP', 3000, 14],
];

const blindDate: EventDef = {
  id: 'blind_date',
  title: (c) => (c.p.id === c.s.headId ? '소개팅' : `${fullName(c.p)}의 소개팅`),
  text: (c) => {
    const cand: Person = c.ev.data.cand;
    const a = age(c.s, c.p);
    const mood = a >= 45 ? '\n(나이가 나이인 만큼 주변에서도 반쯤 포기한 눈치다)' : a >= 40 ? '\n(마흔을 넘기니 소개도 뜸해졌다)' : a >= 35 ? '\n(슬슬 주변의 걱정이 늘었다)' : '';
    return (
      `${a}세 ${who(c)}, ${c.ev.data.agency ? `${c.ev.data.agency}에서 소개받은 상대` : pick({ rng: cand.birthYear + a }, ['지인이 주선한 소개팅', '친구 결혼식 뒤풀이에서 만난 사람', '회사 동료의 소개', '동호회에서 알게 된 사람'])}.` +
      `\n${suitorLine(cand, c.s)}` +
      (c.ev.data.tries ? `\n(올해 ${c.ev.data.tries + 1}번째 만남)` : '') +
      mood
    );
  },
  portraits: (c) => [c.p, c.ev.data.cand],
  choices: (c) => {
    const cand: Person = c.ev.data.cand;
    const isHead = c.p.id === c.s.headId;
    const a = age(c.s, c.p);
    const tries: number = c.ev.data.tries ?? 0;
    const out: Choice[] = [
      {
        label: c.ev.data.agency ? '결혼을 전제로 만나본다' : '애프터 신청 (연애 시작)',
        req: ['매력·집안·명성', ...(a >= 40 ? ['나이 불리'] : [])],
        run: (x) => {
          if (check(x.s, appeal(x.s, x.p) + 12 + (x.ev.data.bonus ?? 0) - agePenalty(a) * 0.5, desirability(cand), 11)) {
            startDating(x.s, x.p, cand, x.ev.data.agency ? '결혼정보회사' : '소개팅', !!x.ev.data.agency);
            if (!isHead) x.p.affinity = clamp(x.p.affinity + 3, -100, 100);
            return `💕 ${iga(fullName(cand))} 애프터에 응했다. 연애 시작!` + (isHead ? '\n(사귀는 동안 해마다 이런저런 일이 생긴다. 결혼까지 갈지는 모른다)' : '');
          }
          x.p.happiness = clamp(x.p.happiness - 5, 0, 100);
          return `💔 "좋은 분이지만… 미안해요." ${iga(fullName(cand))} 거절했다.`;
        },
      },
    ];
    if (tries < 2)
      out.push({
        label: '다른 사람도 만나본다',
        run: (x) => {
          x.ev.data = { cand: makeDate(x.s, x.p, x.ev.data.bonus ?? 0), tries: tries + 1 };
          return { text: '', keep: true };
        },
      });
    if (!c.ev.data.agency)
      for (const [name, cost, bonus] of AGENCY_TIERS)
        out.push({
          label: `${name}으로 가입`,
          cost,
          disabled: !ok(cost, c.s),
          run: (x) => {
            x.ev.data = { cand: makeDate(x.s, x.p, bonus), agency: name, bonus: bonus / 2, tries };
            return { text: `${name}으로 가입했다. 매니저가 조건 맞는 상대를 연결해 줬다.`, keep: true };
          },
        });
    if (!isHead)
      out.push({
        label: '본인에게 맡긴다 (연애결혼)',
        run: (x) => {
          if (!chance(x.s, clamp(0.6 - Math.max(0, a - 33) * 0.04, 0.08, 0.6))) {
            return `${iga(who(x))} "알아서 할게"라고 했지만… 아직 소식이 없다.`;
          }
          const sp = makeDate(x.s, x.p);
          startDating(x.s, x.p, sp, '자연스럽게');
          x.p.affinity = clamp(x.p.affinity + 5, -100, 100);
          return `${iga(who(x))} ${eul(fullName(sp))} 만나기 시작했다고 한다. 결혼까지 갈지는 두고 볼 일이다.`;
        },
      });
    out.push({ label: '이번엔 인연이 아닌 것 같다', run: () => '정중히 거절했다. 다음 인연을 기다린다.' });
    if (a >= 38)
      out.push({
        label: '결혼은 포기하고 혼자 산다',
        run: (x) => {
          addFlag(x.p, 'single_life');
          x.p.happiness = clamp(x.p.happiness + 5, 0, 100);
          return `${eun(who(x))} 혼자만의 삶을 택했다. 더 이상 소개팅은 없다.`;
        },
      });
    return out;
  },
};

/** (v0.1 세이브 호환용) 후보 3명 중 고르기 */
const suitors: EventDef = {
  id: 'suitors',
  title: (c) => (c.p.id === c.s.headId ? '인연' : `${fullName(c.p)}의 혼사`),
  text: (c) => {
    const list: Person[] = c.ev.data.candidates;
    return (
      `${iga(who(c))} ${age(c.s, c.p)}세. 혼인 상대 후보가 나타났다.\n` +
      (c.ev.data.matched ? '(중매로 소개받은 후보들)\n' : '') +
      list.map((x, i) => `${'①②③'[i]} ${suitorLine(x, c.s)}`).join('\n')
    );
  },
  portraits: (c) => c.ev.data.candidates,
  choices: (c) => {
    const list: Person[] = c.ev.data.candidates;
    const isHead = c.p.id === c.s.headId;
    const out: Choice[] = list.map((cand, i) => ({
      label: `${'①②③'[i]} ${fullName(cand)}에게 청혼`,
      run: (x) => {
        const bonus = x.ev.data.matched ? 8 : 0;
        if (check(x.s, appeal(x.s, x.p) + bonus, desirability(cand), 9)) {
          marry(x.s, x.p, cand);
          if (!isHead) x.p.affinity = clamp(x.p.affinity - 3, -100, 100);
          return `💍 ${eun(fullName(cand))} 청혼을 받아들였다! 두 사람은 부부가 되었다.`;
        }
        return `💔 ${eun(fullName(cand))} 정중히 거절했다. 인연이 아니었나 보다.`;
      },
    }));
    if (!c.ev.data.matched)
      out.push({
        label: '중매를 부탁한다',
        cost: 500,
        disabled: !ok(500, c.s),
        run: (x) => {
          x.ev.data = { candidates: makeSuitors(x.s, x.p, 50 + Math.min(20, x.s.fame / 4)), matched: true };
          return { text: '중매쟁이가 조건 좋은 후보를 데려왔다.', keep: true };
        },
      });
    if (!isHead)
      out.push({
        label: '본인에게 맡긴다 (연애결혼)',
        run: (x) => {
          const sp = createPerson(x.s, { sex: x.p.sex === 'M' ? 'F' : 'M', surname: pick(x.s, SURNAMES), birthYear: x.p.birthYear + int(x.s, -3, 3), quality: 48, grown: 0.7 });
          sp.inLaw = true;
          sp.cash = int(x.s, 500, 4000);
          sp.job = pick(x.s, ['office', 'civil', 'none'] as JobId[]);
          marry(x.s, x.p, sp);
          x.p.happiness = clamp(x.p.happiness + 12, 0, 100);
          x.p.affinity = clamp(x.p.affinity + 8, -100, 100);
          return `${iga(who(x))} 사랑하는 사람 ${eul(fullName(sp))} 데려왔다.`;
        },
      });
    out.push({ label: '아직은 때가 아니다', run: () => '혼인을 미뤘다.' });
    return out;
  },
};

const naming: EventDef = {
  id: 'naming',
  title: () => '출생',
  text: (c) => {
    const kid = c.s.people[c.ev.data.childId];
    const par = [kid.fatherId, kid.motherId].map((id) => id && fullName(c.s.people[id])).join(' · ');
    return `${par} 사이에서 ${kid.sex === 'M' ? '아들' : '딸'}이 태어났다! 이름을 지어주자.`;
  },
  portraits: (c) => [c.s.people[c.ev.data.childId]],
  choices: (c) =>
    (c.ev.data.names as string[]).map((n) => ({
      label: c.s.people[c.ev.data.childId].surname + n,
      run: (x) => {
        const kid = x.s.people[x.ev.data.childId];
        kid.name = n;
        return `${fullName(kid)}. 가문의 새 식구다.`;
      },
    })),
};

const notice: EventDef = {
  id: 'notice',
  title: (c) => c.ev.data.title,
  text: (c) => c.ev.data.text,
  portraits: (c) => (c.ev.data.portrait ? [c.s.people[c.ev.data.portrait]] : []),
  choices: () => [{ label: '확인', run: () => '' }],
};

const athleteRetire: EventDef = {
  id: 'athlete_retire',
  title: () => '은퇴',
  text: (c) => `${iga(who(c))} 서른넷. 선수 생활의 끝이 보인다.`,
  choices: () => [
    { label: '코치가 된다', run: (x) => (setJob(x.p, 'office', 2), '후배들을 가르치는 코치가 되었다.') },
    {
      label: '해설가 도전',
      req: [req('cha', 55)],
      run: (x) => {
        if (check(x.s, x.p.actual.cha + x.p.jobLevel * 4, 50, 6)) return setJob(x.p, 'youtuber', 2), '입담이 터졌다! 스포츠 해설가 겸 방송인으로.';
        setJob(x.p, 'office', 1);
        return '방송은 맞지 않았다. 구단 프런트로 들어갔다.';
      },
    },
    { label: '사업을 시작한다', run: (x) => (setJob(x.p, 'founder', 1), '선수 시절 인지도로 스포츠센터를 차렸다.') },
    { label: '쉰다', run: (x) => (setJob(x.p, 'none'), '긴 휴식에 들어갔다.') },
  ],
};

const ytSlump: EventDef = {
  id: 'yt_slump',
  title: () => '안 뜬다',
  text: (c) =>
    `${who(c)}${tr(who(c), '은', '는')} ${JOBS[c.p.job].name}${tr(JOBS[c.p.job].name, '으로', '로')} ${c.p.jobYears}년째 제자리다. (${jobTitle(c.p)})\n` +
    `올해 수입은 용돈 수준. 계속할까?`,
  choices: (c) => {
    const invest = Number(c.p.flags.find((f) => f.startsWith('invest:'))?.slice(7) ?? 0);
    return gate(c.s, [
      { label: '버틴다', run: (x) => ((x.p.happiness = clamp(x.p.happiness - 3, 0, 100)), '언젠가 알고리즘의 선택을 받을 거라 믿는다.') },
      {
        label: '장비·홍보에 더 투자한다',
        cost: 1000,
        disabled: invest >= 4,
        run: (x) => {
          x.p.flags = x.p.flags.filter((f) => !f.startsWith('invest:'));
          x.p.flags.push('invest:' + (invest + 1));
          return '광고를 돌리고 장비를 바꿨다. 뜰 확률이 조금 올랐다.';
        },
      },
      { label: '접고 알바한다', run: (x) => (setJob(x.p, 'parttime'), '꿈은 잠시 접어두고 생계를 챙긴다.') },
      {
        label: '접고 취업 준비',
        run: (x) => {
          setJob(x.p, 'none');
          queueNext(x.s, 'first_job', x.p.id);
          return '현실을 택했다.';
        },
      },
    ]);
  },
};

const rebellion: EventDef = {
  id: 'rebellion',
  title: () => '사춘기',
  text: (c) => `${iga(who(c))} 방문을 쾅 닫는다. "다 엄마 아빠 때문이야!"`,
  choices: () => [
    {
      label: '마음을 열고 대화한다',
      run: (x) => {
        x.p.happiness = clamp(x.p.happiness + 18, 0, 100);
        x.p.affinity = clamp(x.p.affinity + 10, -100, 100);
        if (x.p.desire && !x.p.desireKnown) {
          x.p.desireKnown = true;
          return `밤새 이야기를 나눴다. ${who(x)}의 진짜 꿈은 '${TAG_NAMES[x.p.desire]}' 쪽이었다.`;
        }
        return '밤새 이야기를 나눴다. 조금은 풀린 것 같다.';
      },
    },
    {
      label: '엄하게 다스린다',
      run: (x) => {
        x.p.actual.mor = clamp(x.p.actual.mor + 3, 0, 100);
        x.p.affinity = clamp(x.p.affinity - 12, -100, 100);
        if (chance(x.s, 0.2)) {
          x.p.happiness = clamp(x.p.happiness - 10, 0, 100);
          addFlag(x.p, 'ran_away');
          return `${iga(who(x))} 가출했다가 사흘 만에 돌아왔다.`;
        }
        return '집안에 냉기가 돈다.';
      },
    },
  ],
};

const grievance: EventDef = {
  id: 'grievance',
  title: () => '형제의 불만',
  text: (c) => `${iga(who(c))} 찾아왔다. "상속이 공평하지 않았어. 나도 내 몫을 받아야겠어."`,
  choices: (c) => {
    const amt = Math.max(3000, Math.round(personWorth(c.s, head(c.s)) * 0.1));
    return [
      {
        label: `돈으로 달랜다 (${formatMoney(amt)} 증여)`,
        disabled: head(c.s).cash < amt,
        run: (x) => {
          const r = giveGift(x.s, head(x.s), x.p, amt);
          x.p.flags = x.p.flags.filter((f) => f !== 'grievance');
          x.p.affinity = clamp(x.p.affinity + 40, -100, 100);
          return r.msg + '. 앙금이 풀렸다.';
        },
      },
      {
        label: '진심으로 사과한다',
        req: [req('mor', 60)],
        run: (x) => {
          if (check(x.s, head(x.s).actual.mor + x.p.actual.mor * 0.5, 70, 8)) {
            x.p.flags = x.p.flags.filter((f) => f !== 'grievance');
            x.p.affinity = clamp(x.p.affinity + 25, -100, 100);
            return '형제는 눈물을 흘리며 화해했다.';
          }
          return '"말로 때우려고?" 문을 박차고 나갔다.';
        },
      },
      {
        label: '무시한다',
        run: (x) => {
          x.p.affinity = clamp(x.p.affinity - 20, -100, 100);
          x.s.fame = Math.max(0, x.s.fame - 3);
          if (chance(x.s, 0.4)) {
            const fee = 5000;
            pay(x.s, head(x.s), fee);
            x.p.flags = x.p.flags.filter((f) => f !== 'grievance');
            addFlag(x.p, 'feud');
            return `유류분 소송이 걸렸다! 변호사 비용 ${formatMoney(fee)}. 형제와는 남남이 되었다.`;
          }
          return '형제 사이가 소원해졌다. 친척들 사이에 소문이 돈다.';
        },
      },
    ];
  },
};

const election: EventDef = {
  id: 'election',
  title: (c) => (c.p.job === 'politician' ? '재선 도전' : '출마 제안'),
  text: (c) =>
    c.p.job === 'politician'
      ? `${who(c)} 의원의 임기가 끝나간다. 다음 총선에 나갈까? (당선 ${c.p.jobLevel + 1}회)`
      : `정당에서 ${who(c)}에게 국회의원 출마를 제안해 왔다. 선거에는 돈이 든다.`,
  choices: (c) => {
    const inc = c.p.job === 'politician';
    const cost = inc ? 10000 : 20000;
    return gate(c.s, [
      {
        label: inc ? '재선에 도전한다' : '출마한다',
        cost,
        req: [req('cha', 60), req('mor', 50), '가문 명성'],
        tag: 'public',
        run: (x) => {
          const score = x.p.actual.cha * 0.5 + x.p.actual.mor * 0.3 + Math.min(30, x.s.fame / 3) + (inc ? 8 + x.p.jobLevel * 2 : 0);
          if (check(x.s, score, 58, 8)) {
            if (inc) {
              x.p.jobLevel = Math.min(JOBS.politician.maxLevel, x.p.jobLevel + 1);
              x.p.jobYears = 0;
            } else setJob(x.p, 'politician', 0);
            addFlag(x.p, 'was_politician');
            x.s.fame += 10;
            return `🗳 당선! ${who(x)} 의원${inc ? `, ${x.p.jobLevel + 1}선 고지에 올랐다` : '이 탄생했다'}. (명성 +10)` + applyDesire(x, 'public');
          }
          if (inc) setJob(x.p, age(x.s, x.p) >= 65 ? 'pension' : 'office', 3);
          x.s.fame += 2;
          return inc ? '낙선했다. 정계를 떠나 기업 고문으로 자리를 옮겼다.' : '아깝게 낙선했다. 그래도 이름은 알렸다.';
        },
      },
      {
        label: inc ? '불출마 선언' : '고사한다',
        run: (x) => {
          if (inc) setJob(x.p, age(x.s, x.p) >= 65 ? 'pension' : 'office', 3);
          return inc ? '박수받으며 정계를 떠났다.' : '정치는 체질이 아니다.';
        },
      },
    ]);
  },
};

// ───────────────────────── 가주 랜덤 이벤트 ─────────────────────────


const guarantee: RandomDef = {
  id: 'r_guarantee',
  weight: (c) => (age(c.s, c.p) >= 28 ? 0.5 : 0),
  title: () => '친구의 부탁',
  text: () => '오랜 친구가 찾아와 사업 대출 보증을 서 달라고 한다.',
  choices: () => [
    { label: '거절한다', run: (x) => ((x.p.actual.cha = Math.max(0, x.p.actual.cha - 1)), '친구는 서운한 얼굴로 돌아갔다.') },
    {
      label: '보증을 선다',
      run: (x) => {
        x.p.actual.mor = clamp(x.p.actual.mor + 2, 0, 100);
        if (chance(x.s, 0.45)) {
          const loss = int(x.s, 5000, 15000);
          pay(x.s, x.p, loss);
          return `친구가 부도를 냈다. 빚 ${formatMoney(loss)}을 대신 갚았다.`;
        }
        return '친구의 사업이 잘 풀렸다. 고맙다며 선물을 보내왔다.';
      },
    },
  ],
};

const scam: RandomDef = {
  id: 'r_invest',
  weight: (c) => (c.p.cash > 3000 ? 1 : 0),
  title: () => '솔깃한 투자 제안',
  text: () => '"원금 보장에 연 30%! 딱 3천만원만 넣어보세요."',
  choices: () => [
    {
      label: '투자한다 (3천만)',
      req: ['지능·장사 재능 필요'],
      run: (x) => {
        if (check(x.s, x.p.actual.int + (hasTalent(x.p, 'merchant') ? 30 : 0), 70, 8)) {
          x.p.cash += 3000;
          if (hasTalent(x.p, 'merchant')) discoverTalent(x.p, 'merchant');
          return '냄새를 잘 맡았다. 원금의 두 배를 회수했다!';
        }
        x.p.cash -= 3000;
        return '사기였다. 3천만원이 증발했다.';
      },
    },
    { label: '거절한다', run: () => '세상에 공짜 점심은 없다.' },
  ],
};

const illness: RandomDef = {
  id: 'r_illness',
  weight: (c) => (c.p.actual.hp < 40 ? 1.2 : age(c.s, c.p) > 45 ? 0.6 : 0.15),
  title: () => '건강 이상',
  text: (c) => `${who(c)}의 몸이 예전 같지 않다. 병원에서 정밀 치료를 권한다.`,
  choices: () => [
    {
      label: '치료받는다',
      cost: 1500,
      run: (x) => {
        x.p.actual.hp = clamp(x.p.actual.hp + 12, 0, x.p.potential.hp);
        return '치료를 받고 회복했다.';
      },
    },
    { label: '참고 버틴다', run: (x) => ((x.p.actual.hp = clamp(x.p.actual.hp - 12, 0, 100)), '병을 키웠다...') },
  ],
};

const bargain: RandomDef = {
  id: 'r_bargain',
  weight: (c) => (spendable(c.s) > c.s.market.apt_seoul * 0.4 ? 1.2 : 0),
  title: () => '급매물',
  text: (c) => `강남 아파트 급매가 나왔다. 시세 ${formatMoney(c.s.market.apt_seoul)}짜리를 ${formatMoney(c.s.market.apt_seoul * 0.85)}에. (부족분은 대출)`,
  choices: (c) => [
    {
      label: '매수한다',
      run: (x) => {
        const price = Math.round(x.s.market.apt_seoul * 0.85);
        x.p.cash -= price;
        addAsset(x.s, 'apt_seoul', x.p.id, x.s.market.apt_seoul);
        return `강남 아파트 등기를 쳤다!${x.p.cash < 0 ? ` 대출 ${formatMoney(-x.p.cash)} (연 7%)` : ''}`;
      },
      disabled: spendable(c.s) < c.s.market.apt_seoul * 0.4,
    },
    { label: '지나친다', run: () => '괜히 무리하지 않기로 했다.' },
  ],
};

const donation: RandomDef = {
  id: 'r_donation',
  weight: (c) => (c.p.cash > 2000 ? 0.8 : 0),
  title: () => '기부 요청',
  text: () => '모교에서 장학기금 기부를 요청해 왔다.',
  choices: (c) => gate(c.s, [
    { label: '1천만 기부', cost: 1000, run: (x) => (mark(x.p, 'kind', 1), (x.s.fame += 3), chance(x.s, 0.15) && schedule(x.s, int(x.s, 15, 25), 'scholar_return', x.p.id, { years: 20 }), '감사패를 받았다. (명성 +3)') },
    { label: '1억 기부', cost: 10000, run: (x) => (mark(x.p, 'kind', 2), (x.s.fame += 15), chance(x.s, 0.45) && schedule(x.s, int(x.s, 15, 25), 'scholar_return', x.p.id, { years: 20 }), '도서관에 가문의 이름이 새겨졌다! (명성 +15)') },
    { label: '정중히 거절', run: () => '다음 기회에.' } as Choice,
  ]),
};

const offer: RandomDef = {
  id: 'r_offer',
  weight: (c) => (['office', 'civil'].includes(c.p.job) ? 1 : 0),
  title: () => '이직 제안',
  text: () => '경쟁사에서 스카우트 제안이 왔다. 직급을 올려주겠다고 한다.',
  choices: () => [
    {
      label: '옮긴다',
      req: [req('int', 50)],
      run: (x) => {
        if (check(x.s, x.p.actual.int + x.p.actual.cha * 0.3, 50, 8)) {
          x.p.jobLevel++;
          return '새 회사에서 승승장구한다. (직급 +1)';
        }
        x.p.jobLevel = Math.max(0, x.p.jobLevel - 1);
        return '새 회사와 맞지 않았다. 오히려 한직으로 밀려났다.';
      },
    },
    { label: '남는다', run: (x) => ((x.p.actual.mor = clamp(x.p.actual.mor + 1, 0, 100)), '의리를 지켰다.') },
  ],
};

const burnout: RandomDef = {
  id: 'r_burnout',
  weight: (c) => (c.s.policy.lifestyle === 'work' ? 2 : 0),
  title: () => '번아웃',
  text: (c) => `일에 파묻힌 ${who(c)}. 아침에 일어나기가 힘들다.`,
  choices: () => [
    { label: '휴가를 낸다', run: (x) => ((x.p.cash -= 800), (x.p.actual.hp = clamp(x.p.actual.hp + 6, 0, 100)), '푹 쉬고 돌아왔다. (수입 -800만)') },
    { label: '버틴다', run: (x) => ((x.p.actual.hp = clamp(x.p.actual.hp - 8, 0, 100)), (x.p.jobLevel += chance(x.s, 0.3) ? 1 : 0), '몸이 망가지는 게 느껴진다...') },
  ],
};

const lotto: RandomDef = {
  id: 'r_lotto',
  weight: () => 0.25,
  title: () => '복권',
  text: () => '편의점 계산대 옆에 복권이 보인다.',
  choices: () => [
    {
      label: '한 장 산다',
      run: (x) => {
        if (chance(x.s, 0.01)) {
          x.p.cash += 100000;
          addFlag(x.p, 'lotto');
          schedule(x.s, 1, 'lotto_relatives', x.p.id);
          return '🎰 1등 당첨!!! 10억!';
        }
        if (chance(x.s, 0.08)) {
          x.p.cash += 5;
          return '5만원 당첨. 본전은 넘겼다.';
        }
        return '꽝.';
      },
    },
    { label: '안 산다', run: () => '현명한 선택.' },
  ],
};

const parentCare: RandomDef = {
  id: 'r_parent_care',
  weight: (c) => ([c.p.fatherId, c.p.motherId].some((id) => id && alive(c.s.people[id]) && age(c.s, c.s.people[id]) >= 72) ? 1.5 : 0),
  title: () => '부모님 병환',
  text: () => '연로하신 부모님이 편찮으시다.',
  choices: () => [
    {
      label: '직접 모신다',
      run: (x) => {
        x.p.actual.mor = clamp(x.p.actual.mor + 3, 0, 100);
        x.p.actual.hp = clamp(x.p.actual.hp - 3, 0, 100);
        x.s.fame += 2;
        addFlag(x.p, 'cared_parent');
        mark(x.p, 'filial', 2);
        return '효자·효녀라는 소문이 났다. (명성 +2) 나중에 유산을 나눌 때 기여분을 주장할 수 있다.';
      },
    },
    { label: '좋은 요양원에 모신다', cost: 3000, run: () => '편안한 곳으로 모셨다.' },
    { label: '모른 척한다', run: (x) => ((x.s.fame = Math.max(0, x.s.fame - 4)), (x.p.actual.mor = clamp(x.p.actual.mor - 4, 0, 100)), '친척들의 눈총이 따갑다.') },
  ],
};

const landOffer: RandomDef = {
  id: 'r_land',
  weight: (c) => (spendable(c.s) > c.s.market.land ? 0.8 : 0),
  title: () => '개발 예정지',
  text: (c) => `개발 소문이 도는 땅을 ${formatMoney(c.s.market.land * 0.8)}에 사라는 제안이 왔다.`,
  choices: () => [
    {
      label: '산다',
      run: (x) => {
        const price = Math.round(x.s.market.land * 0.8);
        pay(x.s, x.p, price);
        const a = addAsset(x.s, 'land', x.p.id, x.s.market.land * (chance(x.s, 0.5) ? 1.4 : 0.7));
        a.name = '개발예정지 토지';
        return a.value > price ? '진짜 개발 계획이 발표됐다! 땅값이 뛰었다.' : '소문은 소문이었다. 땅값이 떨어졌다.';
      },
    },
    { label: '관심 없다', run: () => '부동산 업자를 돌려보냈다.' },
  ],
};

const childMoney: RandomDef = {
  id: 'r_child_money',
  weight: (c) => (c.p.childIds.some((id) => alive(c.s.people[id]) && age(c.s, c.s.people[id]) >= 22 && c.s.people[id].cash < 0) ? 2 : 0),
  title: () => '자식의 SOS',
  valid: (c) => c.p.childIds.some((id) => alive(c.s.people[id]) && age(c.s, c.s.people[id]) >= 22 && c.s.people[id].cash < 0),
  text: (c) => {
    const k = c.s.people[c.ev.data?.kid] ?? c.p.childIds.map((id) => c.s.people[id]).find((k) => alive(k) && age(c.s, k) >= 22 && k.cash < 0)!;
    c.ev.data = { kid: k.id };
    return `${iga(fullName(k))} 빚(${formatMoney(-k.cash)})에 시달리고 있다며 도움을 청한다.`;
  },
  choices: (c) => {
    const k = c.s.people[c.ev.data?.kid ?? c.p.childIds[0]];
    const amt = Math.max(1000, k ? -k.cash : 1000);
    return [
      {
        label: `빚을 갚아준다 (${formatMoney(amt)} 증여)`,
        disabled: c.p.cash < amt,
        run: (x) => giveGift(x.s, x.p, x.s.people[x.ev.data.kid], amt).msg,
      },
      {
        label: '스스로 해결하라고 한다',
        run: (x) => {
          const kk = x.s.people[x.ev.data.kid];
          kk.affinity = clamp(kk.affinity - 15, -100, 100);
          kk.actual.mor = clamp(kk.actual.mor + 2, 0, 100);
          return `${iga(fullName(kk))} 서운해하며 돌아갔다.`;
        },
      },
    ];
  },
};

const stockTip: RandomDef = {
  id: 'r_stock_tip',
  weight: (c) => (c.p.cash > 10000 ? 0.9 : 0),
  title: () => '급등주 정보',
  text: () => '"이거 다음 주에 무조건 뜬다. 너한테만 말하는 거야." 지인이 종목 하나를 찍어준다.',
  choices: (c) => [
    {
      label: '1억 몰빵',
      req: ['지능·장사 재능 필요'],
      disabled: c.p.cash < 10000,
      run: (x) => {
        const m = hasTalent(x.p, 'merchant');
        if (check(x.s, x.p.actual.int + (m ? 30 : 0), 72, 8)) {
          x.p.cash += 10000;
          if (m) discoverTalent(x.p, 'merchant');
          return '상한가 행진! 두 배로 불려서 빠져나왔다. (+1억)';
        }
        x.p.cash -= 6000;
        return '작전주였다. 손절하고 6천만원을 날렸다.';
      },
    },
    { label: '흘려듣는다', run: () => '그런 정보가 나한테까지 올 리 없다.' },
  ],
};

const coinFever: RandomDef = {
  id: 'r_coin',
  weight: (c) => (c.p.cash > 5000 ? 0.7 : 0),
  title: () => '신규 코인',
  text: () => '단톡방이 난리다. 상장 직전 코인을 지금 사면 100배라고 한다.',
  choices: (c) => [
    {
      label: '5천만 넣는다',
      disabled: c.p.cash < 5000,
      run: (x) => {
        if (chance(x.s, 0.15)) {
          x.p.cash += 45000;
          return '🚀 진짜 떡상했다! 5천만이 5억이 됐다.';
        }
        if (chance(x.s, 0.35)) {
          x.p.cash += 5000;
          return '두 배에서 팔았다. 욕심을 버린 게 신의 한 수.';
        }
        x.p.cash -= 5000;
        return '상장 당일 러그풀. 개발자가 잠수를 탔다.';
      },
    },
    { label: '안 한다', run: () => '코인은 도박이다.' },
  ],
};

const auction: RandomDef = {
  id: 'r_auction',
  weight: (c) => (spendable(c.s) > (ART_TIERS[1].price * c.s.market.art) / 100 ? 0.7 : 0),
  title: () => '비공개 경매',
  text: (c) => {
    c.ev.data = c.ev.data ?? { price: Math.round((ART_TIERS[1].price * c.s.market.art) / 100 * 0.6) };
    return `지인 소개로 비공개 경매에 초대받았다. 유명 작가의 작품이 시세의 60%인 ${formatMoney(c.ev.data.price)}에 나왔다.\n출처가 좀 애매하다는 소문이 있다.`;
  },
  choices: (c) => [
    {
      label: '낙찰받는다',
      disabled: spendable(c.s) < (c.ev.data?.price ?? Infinity),
      run: (x) => {
        const price = x.ev.data.price;
        pay(x.s, x.p, price);
        const a = addAsset(x.s, 'art', x.p.id, price / 0.6, '경매 낙찰 작품');
        a.fake = chance(x.s, 0.3);
        return `${formatMoney(price)}에 낙찰! 거실 벽이 한결 고급스러워졌다.`;
      },
    },
    { label: '지나친다', run: () => '싼 게 비지떡일 수도 있다.' },
  ],
};

const appraisal: RandomDef = {
  id: 'r_appraisal',
  weight: (c) => (c.s.assets.some((a) => a.kind === 'art' && (a.ownerId === c.p.id || a.ownerId === 'family') && !a.name.endsWith('(위작)')) ? 0.6 : 0),
  title: () => '감정 전문가',
  text: () => '미술품 감정 전문가를 소개받았다. 소장품을 감정받아 볼까?',
  choices: (c) =>
    gate(c.s, [
      {
        label: '감정을 의뢰한다',
        cost: 300,
        run: (x) => {
          const found = exposeFakes(x.s, x.s.assets.filter((a) => a.ownerId === x.p.id || a.ownerId === 'family'));
          return found.length ? `😱 위작이 ${found.length}점 나왔다: ${found.map((a) => a.name).join(', ')}` : '모두 진품으로 확인됐다. 감정서를 받아뒀다.';
        },
      },
      { label: '믿고 걸어둔다', run: () => '모르는 게 약이다.' },
    ]),
};

const advisorPitch: RandomDef = {
  id: 'r_advisor',
  weight: (c) => (!c.s.policy.taxAdvisor && personWorth(c.s, c.p) > 300000 ? 0.8 : 0),
  title: () => '세무사의 명함',
  text: (c) => {
    const t = estateTax(c.s, c.p);
    return `세무사가 찾아왔다.\n"지금 돌아가시면 상속세가 ${formatMoney(t.tax)}입니다. 미리 준비하셔야죠."`;
  },
  choices: () => [
    {
      label: '세무사를 선임한다',
      run: (x) => {
        x.s.policy.taxAdvisor = true;
        return '세무사를 선임했다. 매년 수임료가 나가지만 상속·증여세를 줄여준다. (자산 탭에서 해지 가능)';
      },
    },
    { label: '돌려보낸다', run: () => '세금은 나중 일이다.' },
  ],
};

const scandal: RandomDef = {
  id: 'r_scandal',
  weight: (c) => (['politician', 'entertainer'].includes(c.p.job) ? 1.2 : c.p.job === 'youtuber' && c.p.jobLevel >= 2 ? 0.6 : 0),
  title: () => '스캔들',
  text: (c) => `${who(c)}에 대한 폭로 기사가 떴다. 실검 1위다.`,
  choices: (c) =>
    gate(c.s, [
      {
        label: '정면 돌파 (해명)',
        req: [req('mor', 60)],
        run: (x) => {
          if (check(x.s, x.p.actual.mor + x.p.actual.cha * 0.3, 65, 8)) {
            x.s.fame += 3;
            return '진심 어린 해명이 통했다. 오히려 호감도가 올랐다.';
          }
          x.s.fame = Math.max(0, x.s.fame - 12);
          x.p.jobLevel = Math.max(0, x.p.jobLevel - 1);
          return '해명이 거짓으로 드러났다. 여론이 싸늘하다. (명성 -12)';
        },
      },
      {
        label: '돈으로 덮는다',
        cost: 10000,
        run: (x) => {
          x.s.taxHeat += 5;
          if (chance(x.s, 0.25)) {
            x.s.fame = Math.max(0, x.s.fame - 20);
            return '입막음 시도까지 들통났다! 최악이다. (명성 -20)';
          }
          return '기사가 조용히 내려갔다.';
        },
      },
      {
        label: '자숙한다',
        run: (x) => {
          x.s.fame = Math.max(0, x.s.fame - 5);
          x.p.jobLevel = Math.max(0, x.p.jobLevel - 1);
          return '활동을 잠시 멈췄다. (명성 -5)';
        },
      },
    ]),
};

// 보증·투자 권유는 후폭풍이 있는 fate.ts 버전으로 대체 (옛 세이브 호환을 위해 정의는 남겨둠)
void guarantee;
void scam;
export const RANDOM_EVENTS: RandomDef[] = [
  illness,
  bargain,
  donation,
  offer,
  burnout,
  lotto,
  parentCare,
  landOffer,
  childMoney,
  stockTip,
  coinFever,
  auction,
  appraisal,
  advisorPitch,
  scandal,
];

export const EVENTS: Record<string, EventDef> = Object.fromEntries(
  [kinder, elementary, aptitude, dream, middle, high, firstJob, exam, suitors, blindDate, naming, notice, athleteRetire, ytSlump, rebellion, grievance, election, ...RANDOM_EVENTS].map((e) => [e.id, e]),
);

export { makeSuitors, unlock };
