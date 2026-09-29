import { chance, int, pick } from './rng';
import { ACHIEVEMENTS, JOBS, STAT_NAMES, SURNAMES, TAG_NAMES, TALENTS } from './data';
import { addAsset, formatMoney, pay, personWorth } from './economy';
import { giveGift } from './estate';
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
  head,
  spouseOf,
} from './people';
import type { CareerTag, GameState, JobId, PendingEvent, Person, StatKey } from './types';

export interface Ctx {
  s: GameState;
  p: Person;
  ev: PendingEvent;
}

export interface Choice {
  label: string;
  /** 요구 조건 뱃지 (결과는 숨기고 조건만 보여줌) */
  req?: string[];
  disabled?: boolean;
  cost?: number;
  tag?: CareerTag;
  run: (c: Ctx) => string | { text: string; keep: true };
}

export interface EventDef {
  id: string;
  title: (c: Ctx) => string;
  text: (c: Ctx) => string;
  choices: (c: Ctx) => Choice[];
  portraits?: (c: Ctx) => Person[];
}

const stars = (v: number) => '★'.repeat(clamp(Math.round(v / 20), 1, 5));
const req = (k: StatKey, v: number) => `${STAT_NAMES[k]} ${stars(v)}`;
const who = (c: Ctx) => fullName(c.p);
const tr = (n: string, a: string, b: string) => {
  const code = n.charCodeAt(n.length - 1) - 0xac00;
  return code >= 0 && code % 28 !== 0 ? a : b;
};
/** 조사: 이/가, 은/는, 을/를 */
const iga = (n: string) => n + tr(n, '이', '가');
const eun = (n: string) => n + tr(n, '은', '는');
const eul = (n: string) => n + tr(n, '을', '를');

export function spendable(s: GameState): number {
  const h = head(s);
  const sp = spouseOf(s, h);
  return Math.max(0, h.cash) + (sp && alive(sp) ? Math.max(0, sp.cash) : 0) + Math.max(0, s.familyCash);
}

/** 자녀의 꿈과 선택 방향 비교 → 관계도·행복도 */
function applyDesire(c: Ctx, tag?: CareerTag): string {
  const p = c.p;
  if (!tag || !p.desire || p.id === c.s.headId) return '';
  if (tag === p.desire) {
    p.happiness = clamp(p.happiness + 10, 0, 100);
    p.affinity = clamp(p.affinity + 6, -100, 100);
    addFlag(p, 'passion');
    return p.desireKnown ? ' 원하던 길이라 눈이 반짝인다.' : '';
  }
  p.happiness = clamp(p.happiness - 10, 0, 100);
  p.affinity = clamp(p.affinity - 8, -100, 100);
  p.flags = p.flags.filter((f) => f !== 'passion');
  return p.desireKnown ? ' 하지만 원하던 길이 아니라 시무룩하다.' : '';
}

function setJob(p: Person, job: JobId, level = 0) {
  p.job = job;
  p.jobLevel = level;
  p.jobYears = 0;
}

function setStudy(s: GameState, p: Person, years: number, flag: string) {
  addFlag(p, flag);
  addFlag(p, 'student');
  p.flags = p.flags.filter((f) => !f.startsWith('grad:'));
  p.flags.push('grad:' + (s.year + years));
}

const ok = (cost: number | undefined, s: GameState) => (cost ?? 0) <= spendable(s);
/** 비용을 감당 못 하는 선택지는 비활성화 */
const gate = (s: GameState, list: Choice[]): Choice[] => list.map((ch) => ({ ...ch, disabled: ch.disabled || !ok(ch.cost, s) }));

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
    return `${iga(who(c))} 진지하게 말한다.\n"나는 커서 ${TAG_NAMES[c.p.desire]}${tr(TAG_NAMES[c.p.desire], '이', '')} 하고 싶어!"`;
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

const path: EventDef = {
  id: 'path',
  title: (c) => (hasFlag(c.p, 'retaking') ? '재수의 결과' : '수능과 진로'),
  text: (c) =>
    `${iga(who(c))} ${hasFlag(c.p, 'retaking') ? '1년을 더 버텼다. 다시 선택의 순간.' : '열아홉. 이제 진짜 갈림길이다.'}\n(지능 ${Math.round(c.p.actual.int)} · 근력 ${Math.round(c.p.actual.str)} · 매력 ${Math.round(c.p.actual.cha)})`,
  choices: (c) => {
    const p = c.p;
    const retaken = hasFlag(p, 'retook');
    const fallback = (x: Ctx, why: string): string => {
      if (!retaken && !hasFlag(x.p, 'retaking')) {
        addFlag(x.p, 'retaking');
        return why + ' 재수를 하게 됐다. (내년에 다시 선택)';
      }
      x.p.flags = x.p.flags.filter((f) => f !== 'retaking');
      addFlag(x.p, 'retook');
      if (x.p.actual.int >= 30) {
        setStudy(x.s, x.p, 4, 'univ_local');
        return why + ' 결국 일반 대학에 진학했다.';
      }
      setJob(x.p, 'none');
      return why + ' 대학은 포기했다.';
    };
    const done = (x: Ctx) => {
      if (hasFlag(x.p, 'retaking')) {
        x.p.flags = x.p.flags.filter((f) => f !== 'retaking');
        addFlag(x.p, 'retook');
      }
    };
    const eliteBonus = (hasFlag(p, 'high_elite') ? 6 : 0) + (hasFlag(p, 'retaking') ? 4 : 0);
    return [
      {
        label: '의대 도전',
        req: [req('int', 80)],
        tag: 'study',
        run: (x) => {
          if (check(x.s, x.p.actual.int + eliteBonus + (hasTalent(x.p, 'genius') ? 8 : 0), 72, 5)) {
            done(x);
            setStudy(x.s, x.p, 6, 'med_school');
            if (x.s.origin === 'poor') unlock(x.s, 'dragon');
            return `🎉 의대 합격! 6년 뒤 의사가 된다.` + applyDesire(x, 'study');
          }
          return fallback(x, '의대 낙방.');
        },
      },
      {
        label: '명문대',
        req: [req('int', 60)],
        tag: 'study',
        run: (x) => {
          if (check(x.s, x.p.actual.int + eliteBonus, 55, 6)) {
            done(x);
            setStudy(x.s, x.p, 4, 'univ_top');
            return `명문대 합격!` + applyDesire(x, 'study');
          }
          return fallback(x, '명문대 불합격.');
        },
      },
      {
        label: '일반 대학',
        req: [req('int', 30)],
        run: (x) => {
          done(x);
          setStudy(x.s, x.p, 4, 'univ_local');
          return `대학생이 되었다.` + applyDesire(x, 'free');
        },
        disabled: p.actual.int < 20,
      },
      {
        label: '프로 입단 테스트',
        req: ['체고·운동부 출신', req('str', 60)],
        tag: 'sport',
        disabled: !(hasFlag(p, 'high_sport') || hasFlag(p, 'mid_sport') || hasFlag(p, 'sports_team')),
        run: (x) => {
          done(x);
          if (check(x.s, x.p.actual.str + (hasTalent(x.p, 'athlete') ? 15 : 0) + (hasFlag(x.p, 'high_sport') ? 5 : 0), 55, 6)) {
            setJob(x.p, 'athlete');
            return `프로 구단 입단! 연봉 계약서에 사인했다.` + applyDesire(x, 'sport');
          }
          setJob(x.p, 'none');
          addFlag(x.p, 'failed_pro');
          return `입단 테스트 탈락. 앞길이 막막하다.`;
        },
      },
      {
        label: '인플루언서 데뷔',
        req: ['연습생·예고 출신 유리', req('cha', 60)],
        tag: 'stage',
        run: (x) => {
          done(x);
          const trained = hasFlag(x.p, 'high_art') || hasFlag(x.p, 'trainee');
          setJob(x.p, 'youtuber', check(x.s, x.p.actual.cha + (trained ? 10 : 0) + (hasTalent(x.p, 'star') ? 15 : 0), 60, 7) ? 2 : 0);
          return (x.p.jobLevel ? `데뷔와 동시에 화제가 됐다!` : `채널을 열었지만 반응이 미지근하다.`) + applyDesire(x, 'stage');
        },
      },
      {
        label: '바로 취업',
        req: hasFlag(p, 'high_voc') ? ['특성화고 우대'] : [],
        run: (x) => {
          done(x);
          setJob(x.p, 'office', hasFlag(x.p, 'high_voc') ? 1 : 0);
          return `일찍 사회생활을 시작했다.` + applyDesire(x, 'free');
        },
      },
      {
        label: '당분간 쉰다',
        run: (x) => {
          done(x);
          setJob(x.p, 'none');
          x.p.happiness = clamp(x.p.happiness + 10, 0, 100);
          return `${eun(who(x))} 방에서 나오지 않는다.` + applyDesire(x, 'free');
        },
      },
    ];
  },
};

// ───────────────────────── 성인 ─────────────────────────

const firstJob: EventDef = {
  id: 'first_job',
  title: () => '취업',
  text: (c) =>
    `${iga(who(c))} 사회로 나갈 차례다.` +
    (hasFlag(c.p, 'univ_top') ? ' (명문대 졸업)' : hasFlag(c.p, 'univ_local') ? ' (대학 졸업)' : ''),
  choices: (c) => [
    {
      label: '대기업 공채',
      req: [req('int', 60), '명문대 유리'],
      tag: 'study',
      run: (x) => {
        if (check(x.s, x.p.actual.int * 0.7 + x.p.actual.cha * 0.3 + (hasFlag(x.p, 'univ_top') ? 15 : 0), 52, 7)) {
          setJob(x.p, 'office', 1);
          return `대기업 합격! 사원증을 목에 걸었다.` + applyDesire(x, 'study');
        }
        setJob(x.p, 'office', 0);
        return `대기업은 떨어지고 중소기업에 들어갔다.`;
      },
    },
    { label: '중소기업', run: (x) => (setJob(x.p, 'office', 0), `작은 회사에서 커리어를 시작했다.`) },
    {
      label: '공무원 시험',
      req: [req('int', 45), req('mor', 40)],
      tag: 'public',
      run: (x) => {
        if (check(x.s, x.p.actual.int * 0.7 + x.p.actual.mor * 0.4, 48, 6)) {
          setJob(x.p, 'civil', 0);
          return `공무원 시험 합격! 철밥통이다.` + applyDesire(x, 'public');
        }
        setJob(x.p, 'none');
        addFlag(x.p, 'exam_fail');
        return `시험에 떨어졌다. 공시생 생활이 이어진다.` + applyDesire(x, 'public');
      },
    },
    {
      label: '창업 (가문이 자본금 지원)',
      cost: 5000,
      req: ['자본금 5천만', '장사 재능 유리'],
      tag: 'business',
      disabled: !ok(5000, c.s),
      run: (x) => {
        setJob(x.p, 'founder', 0);
        if (hasTalent(x.p, 'merchant') && discoverTalent(x.p, 'merchant')) return `사업을 시작했다. 거래처를 다루는 솜씨를 보니 [장사꾼] 재능이 있다!`;
        return `작은 사업체를 차렸다.` + applyDesire(x, 'business');
      },
    },
    {
      label: '유튜버',
      req: [req('cha', 50)],
      tag: 'stage',
      run: (x) => (setJob(x.p, 'youtuber', 0), `카메라를 샀다. 구독과 좋아요 부탁드립니다.` + applyDesire(x, 'stage')),
    },
    {
      label: '백수로 산다 (기본소득)',
      tag: 'free',
      run: (x) => {
        setJob(x.p, 'none');
        addFlag(x.p, 'chosen_idle');
        x.p.happiness = clamp(x.p.happiness + 15, 0, 100);
        x.s.fame = Math.max(0, x.s.fame - 2);
        return `기본소득으로 소소하게 살기로 했다. 가문 어른들이 혀를 찬다.` + applyDesire(x, 'free');
      },
    },
  ],
};

function makeSuitors(s: GameState, p: Person, quality: number): Person[] {
  const n = 3;
  const out: Person[] = [];
  for (let i = 0; i < n; i++) {
    const cand = createPerson(s, {
      sex: p.sex === 'M' ? 'F' : 'M',
      surname: pick(s, SURNAMES),
      birthYear: p.birthYear + int(s, -3, 4),
      quality,
      grown: 0.72,
    });
    cand.job = pick(s, ['office', 'office', 'civil', 'none', 'founder', 'doctor', 'youtuber'] as JobId[]);
    cand.jobLevel = int(s, 0, 2);
    cand.cash = Math.round(Math.max(500, (quality - 30) * 150 + int(s, 0, 8000)));
    cand.inLaw = true;
    cand.flags.push('show:' + pick(s, ['str', 'int', 'cha', 'mor', 'hp']), 'show:' + pick(s, ['int', 'cha', 'mor']));
    out.push(cand);
  }
  return out;
}

function appeal(s: GameState, p: Person): number {
  return p.actual.cha * 0.7 + p.actual.mor * 0.2 + Math.min(20, s.fame * 0.25) + Math.min(25, (personWorth(s, p) + s.familyCash * 0.3) / 4000);
}
function desirability(c: Person): number {
  const a = c.actual;
  return (a.str + a.int + a.cha + a.mor + a.hp) / 5 + Math.min(20, c.cash / 1500);
}

function marry(s: GameState, p: Person, sp: Person) {
  sp.flags = sp.flags.filter((f) => !f.startsWith('show:'));
  sp.spouseId = p.id;
  sp.affinity = 40;
  p.spouseId = sp.id;
  s.people[sp.id] = sp;
  s.log.push({ year: s.year, text: `💍 ${fullName(p)} ♥ ${fullName(sp)} 결혼 (지참금 ${formatMoney(sp.cash)})`, kind: 'life' });
}

export function suitorLine(c: Person, s: GameState): string {
  const shown = c.flags.filter((f) => f.startsWith('show:')).map((f) => f.slice(5) as StatKey);
  const uniq = [...new Set(shown)];
  const statTxt = uniq.map((k) => `${STAT_NAMES[k]}${stars(c.actual[k])}`).join(' ');
  return `${fullName(c)} ${s.year - c.birthYear}세 · ${JOBS[c.job].name} · 집안${stars(c.cash / 150)} · ${statTxt}`;
}

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
  title: () => '채널이 안 뜬다',
  text: (c) => `${who(c)}의 채널은 몇 년째 제자리다. 구독자 수가 좀처럼 늘지 않는다.`,
  choices: () => [
    { label: '버틴다', run: (x) => ((x.p.jobYears = 0), '언젠가 알고리즘의 선택을 받을 거라 믿는다.') },
    { label: '취업한다', run: (x) => (setJob(x.p, 'office', 0), '카메라를 내려놓고 회사에 들어갔다.') },
  ],
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
          return `밤새 이야기를 나눴다. ${who(x)}의 진짜 꿈은 '${TAG_NAMES[x.p.desire]}'였다.`;
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

// ───────────────────────── 가주 랜덤 이벤트 ─────────────────────────

interface RandomDef extends EventDef {
  weight: (c: Ctx) => number;
}

const guarantee: RandomDef = {
  id: 'r_guarantee',
  weight: (c) => (age(c.s, c.p) >= 28 ? 1 : 0),
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
  weight: (c) => (c.p.actual.hp < 50 ? 2 : age(c.s, c.p) > 45 ? 1 : 0.3),
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
    { label: '1천만 기부', cost: 1000, run: (x) => ((x.s.fame += 3), '감사패를 받았다. (명성 +3)') },
    { label: '1억 기부', cost: 10000, run: (x) => ((x.s.fame += 15), '도서관에 가문의 이름이 새겨졌다! (명성 +15)') },
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
  weight: () => 0.5,
  title: () => '복권',
  text: () => '편의점 계산대 옆에 복권이 보인다.',
  choices: () => [
    {
      label: '한 장 산다',
      run: (x) => {
        if (chance(x.s, 0.01)) {
          x.p.cash += 100000;
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
        return '효자·효녀라는 소문이 났다. (명성 +2)';
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
  text: (c) => {
    const k = c.p.childIds.map((id) => c.s.people[id]).find((k) => alive(k) && age(c.s, k) >= 22 && k.cash < 0)!;
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

export const RANDOM_EVENTS: RandomDef[] = [guarantee, scam, illness, bargain, donation, offer, burnout, lotto, parentCare, landOffer, childMoney];

export const EVENTS: Record<string, EventDef> = Object.fromEntries(
  [kinder, elementary, aptitude, dream, middle, high, path, firstJob, suitors, naming, notice, athleteRetire, ytSlump, rebellion, grievance, ...RANDOM_EVENTS].map((e) => [e.id, e]),
);

export { makeSuitors };

export function unlock(s: GameState, id: string) {
  if (!s.achievements.includes(id)) {
    s.achievements.push(id);
    s.log.push({ year: s.year, text: `🏆 업적 달성: ${ACHIEVEMENTS[id].name}`, kind: 'achv' });
  }
}
