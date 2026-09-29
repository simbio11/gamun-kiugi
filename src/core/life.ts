// 인생사 이벤트: 가주뿐 아니라 직계 가족 모두에게 일어난다.
// 확률은 통계를 참고했다 (현역판정 86%, 암 평생 발병 남 45%·여 38%, 5년 생존율 병기별, 조이혼율 등).

import { chance, int, normal, pick } from './rng';
import { JOBS, MALE_NAMES, FEMALE_NAMES } from './data';
import { addHolding, formatMoney, jobTitle, settlePension } from './economy';
import { applyDesire, gate, iga, queueNext, req, schedule, setJob, who, type Choice, type Ctx, type EventDef } from './ev-util';
import {
  addFlag,
  age,
  alive,
  check,
  clamp,
  createPerson,
  fullName,
  hasFlag,
  hasTalent,
  hasTrait,
  householder,
  inherit,
  randomGenes,
  spouseOf,
} from './people';
import type { GameState, Person } from './types';

export interface LifeDef extends EventDef {
  /** 한 해에 이 사람에게 일어날 가중치 (0이면 안 일어남) */
  weight?: (s: GameState, p: Person) => number;
}

const salary = (p: Person) => {
  const j = JOBS[p.job];
  return j.kind === 'salary' || j.kind === 'fixed' ? j.base + j.perLevel * p.jobLevel : 3000;
};
const flagNum = (p: Person, key: string) => Number(p.flags.find((f) => f.startsWith(key + ':'))?.split(':')[1] ?? NaN);
const setFlagVal = (p: Person, key: string, v: string | number) => {
  p.flags = p.flags.filter((f) => !f.startsWith(key + ':'));
  p.flags.push(`${key}:${v}`);
};

// ───────────────────────── 병역 ─────────────────────────

/** 복무 시작: 학생이면 졸업이 2년 밀리고, 직장은 휴직 */
function serve(x: Ctx, years: number, kind: string, text: string): string {
  const p = x.p;
  setFlagVal(p, 'serving', x.s.year + years - 1);
  addFlag(p, kind);
  const grad = p.flags.find((f) => f.startsWith('grad:'));
  if (grad) {
    p.flags = p.flags.filter((f) => f !== grad);
    p.flags.push('grad:' + (Number(grad.slice(5)) + years));
  }
  p.happiness = clamp(p.happiness - 8, 0, 100);
  return text;
}

export function milGrade(s: GameState, p: Person): number {
  const v = p.actual.hp + normal(s, 0, 6) + (hasTrait(p, 'frail') ? -10 : hasTrait(p, 'tough') ? 8 : 0);
  return v >= 30 ? 3 - Math.min(2, Math.floor((v - 30) / 15)) : v >= 20 ? 4 : 5;
}

const military: LifeDef = {
  id: 'military',
  title: () => '병역판정검사',
  text: (c) => {
    c.ev.data ??= { grade: milGrade(c.s, c.p) };
    const g = c.ev.data.grade;
    return (
      `${who(c)}, 병역판정검사 결과 ${g}급.\n` +
      (g <= 3 ? '현역 입영 대상이다. 어디로 갈까?' : g === 4 ? '보충역(사회복무요원) 판정이다.' : '전시근로역(면제) 판정이 나왔다.')
    );
  },
  choices: (c) => {
    const g = c.ev.data.grade;
    const p = c.p;
    if (g === 5) return [{ label: '확인', run: (x) => (addFlag(x.p, 'exempt'), '군대에 가지 않는다. 주변에서 부러워하면서도 수군댄다.') }];
    if (g === 4)
      return [
        { label: '사회복무요원 (21개월)', run: (x) => serve(x, 2, 'social_service', '구청에서 사회복무를 시작했다. 출퇴근하는 군 복무다.') },
        dodge,
      ];
    const out: Choice[] = [
      {
        label: '육군 현역 입대 (18개월)',
        run: (x) => {
          x.p.actual.str = clamp(x.p.actual.str + 4, 0, 100);
          x.p.actual.mor = clamp(x.p.actual.mor + 3, 0, 100);
          return serve(x, 2, 'army', '까까머리로 논산 훈련소에 들어갔다. 부모님이 울었다.');
        },
      },
      {
        label: '해병대 자원',
        req: [req('str', 55)],
        run: (x) => {
          x.p.actual.str = clamp(x.p.actual.str + 7, 0, 100);
          x.p.actual.mor = clamp(x.p.actual.mor + 3, 0, 100);
          x.s.fame += 1;
          return serve(x, 2, 'marine', '빨간 명찰을 달았다. 한 번 해병은 영원한 해병.');
        },
      },
      {
        label: '공군 (21개월)',
        req: ['자격증·성적 순'],
        run: (x) => {
          if (!check(x.s, x.p.actual.int, 45, 8)) {
            x.p.actual.str = clamp(x.p.actual.str + 4, 0, 100);
            return serve(x, 2, 'army', '공군은 떨어져서 육군으로 갔다.');
          }
          x.p.actual.int = clamp(x.p.actual.int + 2, 0, 100);
          return serve(x, 2, 'airforce', '공군에 합격했다. 외박이 잦다.');
        },
      },
      {
        label: '카투사 지원 (추첨)',
        req: ['영어 성적', req('int', 55)],
        disabled: p.actual.int < 45,
        run: (x) => {
          if (chance(x.s, 0.2)) {
            x.p.actual.int = clamp(x.p.actual.int + 3, 0, 100);
            return serve(x, 2, 'katusa', '카투사에 뽑혔다! 미군 부대에서 영어가 늘었다.');
          }
          x.p.actual.str = clamp(x.p.actual.str + 4, 0, 100);
          return serve(x, 2, 'army', '추첨에서 떨어져 육군으로 갔다.');
        },
      },
      {
        label: '학사장교·ROTC (장교 복무)',
        req: ['대학생·대졸'],
        disabled: !p.flags.some((f) => f.startsWith('univ_') || f === 'student'),
        run: (x) => {
          x.p.actual.mor = clamp(x.p.actual.mor + 5, 0, 100);
          x.p.actual.cha = clamp(x.p.actual.cha + 2, 0, 100);
          return serve(x, 3, 'officer_served', '소위 계급장을 달았다. 전역 후 장기복무 제안이 올 수도 있다.');
        },
      },
    ];
    if (hasFlag(p, 'student') && !hasFlag(p, 'mil_postponed'))
      out.push({ label: '졸업 후로 연기', run: (x) => (addFlag(x.p, 'mil_postponed'), '입영을 연기했다. 졸업하면 다시 통지가 온다.') });
    out.push(dodge);
    return out;
  },
};

const dodge: Choice = {
  label: '해외로 떠나 병역을 피한다',
  run: (x) => {
    addFlag(x.p, 'draft_dodger');
    x.s.fame = Math.max(0, x.s.fame - 25);
    x.p.actual.mor = clamp(x.p.actual.mor - 10, 0, 100);
    return '국적을 포기하고 떠났다. 가문 이름에 먹칠을 했다. (명성 -25, 공직 진출 불가)';
  },
};

// ───────────────────────── 질병·사고 ─────────────────────────

/** 연령별 연간 암 발병률 (평생 약 40%가 되도록) */
export function cancerRate(s: GameState, p: Person): number {
  const a = age(s, p);
  const base = a < 30 ? 0.0005 : a < 40 ? 0.0015 : a < 50 ? 0.004 : a < 60 ? 0.008 : a < 70 ? 0.014 : 0.02;
  return base * (p.sex === 'M' ? 1.15 : 0.9) * (hasTrait(p, 'frail') ? 1.5 : hasTrait(p, 'tough') ? 0.7 : 1);
}

/** 병기별 5년 생존율 (%) */
const SURVIVAL = [95, 88, 70, 25];

const cancer: LifeDef = {
  id: 'cancer',
  title: () => '암 진단',
  text: (c) => {
    const checked = c.p.flags.some((f) => f.startsWith('checkup:') && c.s.year - Number(f.slice(8)) <= 2);
    c.ev.data ??= { stage: pick(c.s, checked ? [1, 1, 1, 2] : [1, 1, 1, 1, 2, 2, 2, 3, 3, 4]), checked };
    const st = c.ev.data.stage;
    return `${who(c)}, ${c.ev.data.checked ? '정기 검진 덕에 일찍' : '건강검진에서'} 암이 발견됐다. ${st}기.\n의사가 5년 생존율은 ${SURVIVAL[st - 1]}% 정도라고 한다.\n치료 방법을 정해야 한다.`;
  },
  choices: (c) => {
    const st: number = c.ev.data.stage;
    const treat = (bonus: number, text: string) => (x: Ctx) => {
      const surv = clamp(SURVIVAL[st - 1] + bonus, 3, 99);
      setFlagVal(x.p, 'cancer', `${surv}:${x.s.year}`);
      x.p.actual.hp = clamp(x.p.actual.hp - 10, 0, 100);
      x.p.happiness = clamp(x.p.happiness - 15, 0, 100);
      return text + ` (5년 생존 가능성 ${surv}%)`;
    };
    return gate(c.s, [
      { label: '대학병원 표준치료 (산정특례)', cost: 1500, run: treat(0, '수술과 항암 치료를 시작했다.') },
      { label: '최고 병원 + 신약 (비급여)', cost: 8000, run: treat(12, '최신 표적항암제를 쓰기로 했다. 비싸지만 희망이 있다.') },
      { label: '민간요법에 기댄다', cost: 200, run: treat(-35, '산속 요양원에 들어갔다. 가족들이 말렸지만…') },
      { label: '치료를 거부한다', run: treat(-55, '남은 시간을 가족과 보내기로 했다.') },
    ]);
  },
};

const accident: LifeDef = {
  id: 'accident',
  weight: (s, p) => (age(s, p) >= 18 ? 0.012 * (JOBS[p.job].risk ? 2 : 1) : 0.004),
  title: () => '교통사고',
  text: (c) => {
    c.ev.data ??= { dmg: int(c.s, 8, 25) };
    return `${who(c)}, 교통사고를 당했다. 전치 ${c.ev.data.dmg}주.`;
  },
  choices: (c) =>
    gate(c.s, [
      {
        label: '제대로 치료받는다',
        cost: 400,
        run: (x) => ((x.p.actual.hp = clamp(x.p.actual.hp - x.ev.data.dmg * 0.3, 0, 100)), '재활까지 마쳤다. 흉터만 남았다.'),
      },
      {
        label: '합의금 받고 대충 끝낸다',
        run: (x) => {
          x.p.cash += x.ev.data.dmg * 60;
          x.p.actual.hp = clamp(x.p.actual.hp - x.ev.data.dmg * 0.7, 0, 100);
          return `합의금 ${formatMoney(x.ev.data.dmg * 60)}을 받았다. 궂은 날이면 허리가 쑤신다.`;
        },
      },
    ]),
};

const depression: LifeDef = {
  id: 'depression',
  weight: (s, p) => (age(s, p) >= 15 && p.happiness < 22 ? 0.25 * (hasTrait(p, 'anxious') ? 2 : 1) * (hasTrait(p, 'cheerful') ? 0.3 : 1) : 0),
  title: () => '마음의 병',
  text: (c) => `${iga(who(c))} 몇 달째 잠을 못 자고, 웃지 않는다. 우울증 같다.`,
  choices: (c) =>
    gate(c.s, [
      { label: '정신건강의학과 치료', cost: 300, run: (x) => ((x.p.happiness = clamp(x.p.happiness + 28, 0, 100)), '꾸준히 상담을 받았다. 조금씩 웃음을 되찾는다.') },
      {
        label: '가족 여행을 떠난다',
        cost: 600,
        run: (x) => {
          x.p.happiness = clamp(x.p.happiness + 15, 0, 100);
          x.p.affinity = clamp(x.p.affinity + 8, -100, 100);
          return '바다를 보며 오랜만에 대화를 나눴다.';
        },
      },
      {
        label: '혼자 이겨내게 둔다',
        run: (x) => {
          x.p.actual.hp = clamp(x.p.actual.hp - 6, 0, 100);
          return chance(x.s, 0.4) ? ((x.p.happiness = clamp(x.p.happiness + 12, 0, 100)), '시간이 약이었다.') : '점점 더 방 밖으로 나오지 않는다…';
        },
      },
    ]),
};

// ───────────────────────── 부부 ─────────────────────────

export function setBond(p: Person, sp: Person, v: number) {
  p.bond = sp.bond = clamp(Math.round(v), 0, 100);
}

/** 이혼: 재산분할(현금 절반씩) + 위자료. 배우자는 가문을 떠난다. */
export function divorce(s: GameState, p: Person, fault?: Person): string {
  const sp = spouseOf(s, p)!;
  const wedYear = flagNum(p, 'wed');
  const total = Math.max(0, p.cash) + Math.max(0, sp.cash);
  const half = Math.round(total / 2);
  const deltaP = half - Math.max(0, p.cash);
  p.cash += deltaP;
  sp.cash -= deltaP;
  let extra = '';
  if (fault) {
    const other = fault === p ? sp : p;
    const fee = 5000;
    fault.cash -= fee;
    other.cash += fee;
    extra = ` ${fullName(fault)}이(가) 위자료 ${formatMoney(fee)}를 물었다.`;
  }
  p.spouseId = undefined;
  sp.spouseId = undefined;
  for (const x of [p, sp]) {
    addFlag(x, 'divorced');
    x.flags = x.flags.filter((f) => !f.startsWith('wed:'));
  }
  addFlag(sp, 'ex_spouse');
  if (!isNaN(wedYear) && s.year - wedYear >= 30) addFlag(p, 'gray_divorce');
  p.happiness = clamp(p.happiness - 10, 0, 100);
  for (const k of p.childIds.map((id) => s.people[id]).filter(alive)) k.happiness = clamp(k.happiness - 15, 0, 100);
  s.fame = Math.max(0, s.fame - 2);
  s.log.push({ year: s.year, text: `💔 ${fullName(p)}·${fullName(sp)} 이혼`, kind: 'life' });
  return `이혼 도장을 찍었다. 재산은 반씩 나눴다.${extra}`;
}

const hasSpouse = (c: Ctx) => !!c.p.spouseId && alive(c.s.people[c.p.spouseId]);

const maritalCrisis: LifeDef = {
  id: 'marital_crisis',
  valid: hasSpouse,
  title: () => '부부 위기',
  portraits: (c) => [c.p, spouseOf(c.s, c.p)!],
  text: (c) => {
    const sp = spouseOf(c.s, c.p)!;
    return `${who(c)}와(과) ${fullName(sp)}, 요즘 말만 하면 싸운다. 각방을 쓴 지 석 달째.\n(부부 금슬 ${c.p.bond ?? 50})`;
  },
  choices: (c) => {
    const sp = spouseOf(c.s, c.p)!;
    return gate(c.s, [
      {
        label: '부부상담을 받는다',
        cost: 300,
        req: [req('mor', 50)],
        run: (x) => {
          const ok = check(x.s, (x.p.actual.mor + sp.actual.mor) / 2, 45, 8);
          setBond(x.p, sp, (x.p.bond ?? 40) + (ok ? 30 : 8));
          return ok ? '서로의 상처를 처음으로 들여다봤다. 다시 손을 잡았다.' : '상담실에서도 싸웠다. 그래도 조금은 나아졌다.';
        },
      },
      { label: '단둘이 여행을 떠난다', cost: 800, run: (x) => (setBond(x.p, sp, (x.p.bond ?? 40) + 15), '제주도에서 연애 시절 이야기를 했다.') },
      {
        label: '아이들 보고 참고 산다',
        run: (x) => {
          setBond(x.p, sp, (x.p.bond ?? 40) + 5);
          x.p.happiness = clamp(x.p.happiness - 8, 0, 100);
          return '쇼윈도 부부로 지내기로 했다.';
        },
      },
      { label: '이혼한다', run: (x) => divorce(x.s, x.p) },
    ]);
  },
};

const affair: LifeDef = {
  id: 'affair',
  valid: hasSpouse,
  weight: (s, p) => (p.spouseId && alive(spouseOf(s, p)!) && hasTrait(p, 'flirt') ? 0.04 : 0),
  title: () => '외도',
  portraits: (c) => [c.p, spouseOf(c.s, c.p)!],
  text: (c) => `${who(c)}의 휴대폰에서 낯선 이름의 메시지가 발견됐다. 바람이다.`,
  choices: (c) => {
    const sp = spouseOf(c.s, c.p)!;
    return [
      {
        label: '용서를 빈다',
        run: (x) => {
          setBond(x.p, sp, (x.p.bond ?? 50) - 25);
          return check(x.s, x.p.actual.cha, 50, 10) ? '무릎 꿇고 빌었다. 한 번만 넘어가기로 했다.' : '용서는 받았지만, 금이 간 그릇은 붙지 않는다.';
        },
      },
      { label: '이혼 (위자료)', run: (x) => divorce(x.s, x.p, x.p) },
    ];
  },
};

// ───────────────────────── 아이 ─────────────────────────

/** 아기 탄생 (쌍둥이 가능). 직계면 이름 짓기 이벤트 */
export function deliver(s: GameState, dad: Person, mom: Person, surname: string, twinP: number, name = true): Person[] {
  const n = chance(s, twinP) ? 2 : 1;
  const out: Person[] = [];
  for (let i = 0; i < n; i++) {
    const baby = inherit(s, dad, mom, surname);
    s.people[baby.id] = baby;
    dad.childIds.push(baby.id);
    mom.childIds.push(baby.id);
    s.policy.children[baby.id] = { budget: 1, focus: 'free' };
    if (n === 2) addFlag(baby, 'twin');
    out.push(baby);
    if (name) {
      const pool = baby.sex === 'M' ? MALE_NAMES : FEMALE_NAMES;
      const names = new Set<string>([baby.name]);
      while (names.size < 3) names.add(pick(s, pool));
      s.events.push({ uid: s.eventSeq++, defId: 'naming', personId: dad.id, data: { childId: baby.id, names: [...names] } });
    }
  }
  s.log.push({ year: s.year, text: `👶 ${fullName(dad)}·${fullName(mom)} 부부에게 ${n === 2 ? '쌍둥이' : out[0].sex === 'M' ? '아들' : '딸'} 출생`, kind: 'birth' });
  if (out.some((b) => b.flags.includes('mutation'))) s.log.push({ year: s.year, text: '…아기에게서 범상치 않은 기운이 느껴진다', kind: 'birth' });
  return out;
}

const infertility: LifeDef = {
  id: 'infertility',
  valid: (c) => hasSpouse(c) && !c.p.childIds.length,
  title: () => '아이가 생기지 않는다',
  portraits: (c) => [c.p, spouseOf(c.s, c.p)!],
  text: (c) => {
    const mom = c.p.sex === 'F' ? c.p : spouseOf(c.s, c.p)!;
    return `결혼한 지 몇 년, ${who(c)} 부부에게 아이 소식이 없다. 아내는 ${age(c.s, mom)}세.\n난임 병원을 알아볼까?`;
  },
  choices: (c) => {
    const sp = spouseOf(c.s, c.p)!;
    const mom = c.p.sex === 'F' ? c.p : sp;
    const dad = c.p.sex === 'M' ? c.p : sp;
    const a = age(c.s, mom);
    const pr = clamp(0.55 - (a - 30) * 0.045, 0.05, 0.5);
    return gate(c.s, [
      {
        label: `시험관 시술 (성공률 약 ${Math.round(pr * 100)}%)`,
        cost: 700,
        run: (x) => {
          addFlag(x.p, 'ivf');
          if (chance(x.s, pr)) {
            const babies = deliver(x.s, dad, mom, x.p.inLaw ? sp.surname : x.p.surname, 0.2);
            return babies.length === 2 ? '🎉 시험관 성공! 그것도 쌍둥이다!' : '🎉 시험관 성공! 건강한 아기가 태어났다.';
          }
          return '이번에도 실패했다. 몸도 마음도 지쳤다. 내년에 다시 해볼 수 있다.';
        },
      },
      {
        label: '입양한다',
        cost: 300,
        run: (x) => {
          const kid = createPerson(x.s, { surname: x.p.inLaw ? sp.surname : x.p.surname, birthYear: x.s.year - int(x.s, 0, 3), quality: 50, grown: 0.12 });
          kid.genes = randomGenes(x.s);
          kid.fatherId = dad.id;
          kid.motherId = mom.id;
          kid.affinity = 60;
          kid.happiness = 70;
          addFlag(kid, 'adopted');
          x.s.people[kid.id] = kid;
          dad.childIds.push(kid.id);
          mom.childIds.push(kid.id);
          x.s.policy.children[kid.id] = { budget: 1, focus: 'free' };
          return `${fullName(kid)}을(를) 가족으로 맞았다. 피보다 진한 인연이다.`;
        },
      },
      { label: '자연에 맡긴다', run: () => '조급해하지 않기로 했다.' },
      {
        label: '아이 없이 둘이 산다',
        run: (x) => {
          addFlag(x.p, 'childfree');
          addFlag(sp, 'childfree');
          setBond(x.p, sp, (x.p.bond ?? 60) + 5);
          return '둘만의 삶을 택했다.';
        },
      },
    ]);
  },
};

// ───────────────────────── 돈·일 ─────────────────────────

const fraud: LifeDef = {
  id: 'fraud',
  weight: (s, p) => (age(s, p) >= 25 && p.cash > 1000 ? (age(s, p) >= 60 ? 0.03 : 0.015) : 0),
  title: (c) => (age(c.s, c.p) >= 60 ? '보이스피싱' : age(c.s, c.p) < 40 ? '전세사기' : '투자 리딩방'),
  text: (c) => {
    const a = age(c.s, c.p);
    c.ev.data ??= { caught: check(c.s, c.p.actual.int, 55, 8), loss: Math.min(Math.round(c.p.cash * 0.6), a < 40 ? 20000 : 8000) };
    if (c.ev.data.caught) return `${who(c)}에게 수상한 ${a >= 60 ? '전화' : a < 40 ? '전세 매물' : '투자 권유'}가 왔지만, 낌새를 채고 피했다.`;
    return a >= 60
      ? `"아들이 사고를 쳤다"는 전화에 속아 ${who(c)}이(가) ${formatMoney(c.ev.data.loss)}을 송금했다.`
      : a < 40
        ? `${who(c)}의 전셋집 집주인이 잠적했다. 보증금 ${formatMoney(c.ev.data.loss)}이 날아갔다.`
        : `리딩방 "전문가"를 믿고 넣은 ${formatMoney(c.ev.data.loss)}이 사라졌다.`;
  },
  choices: (c) => {
    if (c.ev.data.caught) return [{ label: '휴, 다행이다', run: (x) => ((x.p.actual.int = clamp(x.p.actual.int + 1, 0, 100)), '세상 조심해야겠다.') }];
    return gate(c.s, [
      {
        label: '경찰 신고 + 민사소송',
        cost: 300,
        run: (x) => {
          x.p.cash -= x.ev.data.loss;
          if (chance(x.s, 0.3)) {
            x.p.cash += Math.round(x.ev.data.loss * 0.5);
            return `절반은 돌려받았다. (${formatMoney(x.ev.data.loss * 0.5)})`;
          }
          return '범인은 잡혔지만 돈은 이미 사라진 뒤였다.';
        },
      },
      { label: '잊는다', run: (x) => ((x.p.cash -= x.ev.data.loss), (x.p.happiness = clamp(x.p.happiness - 10, 0, 100)), '비싼 수업료였다.') },
    ]);
  },
};

const LAYOFF_CATS = new Set(['office', 'tech', 'media']);
const layoff: LifeDef = {
  id: 'layoff',
  weight: (s, p) => (JOBS[p.job].kind === 'salary' && LAYOFF_CATS.has(JOBS[p.job].cat) && age(s, p) >= 45 && p.jobLevel >= 2 && p.jobLevel < JOBS[p.job].maxLevel ? 0.06 : 0),
  title: () => '명예퇴직 권고',
  text: (c) => `회사가 구조조정에 들어갔다. ${jobTitle(c.p)} ${who(c)}에게 명예퇴직 권고가 내려왔다.\n위로금은 연봉 2년치.`,
  choices: (c) => [
    {
      label: `명퇴를 받아들인다 (위로금 ${formatMoney(salary(c.p) * 2)})`,
      run: (x) => {
        x.p.cash += salary(x.p) * 2;
        settlePension(x.p);
        setJob(x.p, 'none');
        queueNext(x.s, 'first_job', x.p.id, { second: true });
        return '짐을 챙겨 나왔다. 인생 2막을 준비할 때다. (치킨집? 귀농? 재취업?)';
      },
    },
    {
      label: '버틴다',
      run: (x) => {
        if (chance(x.s, 0.5)) {
          x.p.jobLevel = Math.max(0, x.p.jobLevel - 1);
          x.p.happiness = clamp(x.p.happiness - 12, 0, 100);
          return '창가 자리로 밀려났다. 그래도 월급은 나온다.';
        }
        return '살아남았다. 동기들은 절반이 나갔다.';
      },
    },
  ],
};

const scout: LifeDef = {
  id: 'scout',
  weight: (s, p) => {
    const a = age(s, p);
    return a >= 14 && a <= 24 && p.actual.cha >= 55 && JOBS[p.job].cat !== 'media' ? (p.actual.cha - 50) / 400 + (hasTalent(p, 'star') ? 0.03 : 0) : 0;
  },
  title: () => '길거리 캐스팅',
  text: (c) => `명동을 걷던 ${who(c)}에게 누군가 명함을 내민다.\n"혹시 연예계 생각 없어요? 저 ○○엔터 실장입니다."`,
  choices: () => [
    {
      label: '계약한다',
      tag: 'stage',
      run: (x) => {
        if (age(x.s, x.p) < 20) {
          addFlag(x.p, 'trainee');
          return '연습생 계약서에 사인했다. 학교 끝나면 연습실로 간다.' + applyDesire(x, 'stage');
        }
        setJob(x.p, x.p.actual.cha >= 65 ? 'entertainer' : 'model', 0);
        return '데뷔 준비를 시작했다.' + applyDesire(x, 'stage');
      },
    },
    { label: '사기 같다. 거절', run: () => '명함을 버렸다. 진짜였을지도 모른다.' },
  ],
};

const olympiad: LifeDef = {
  id: 'olympiad',
  weight: (s, p) => (age(s, p) >= 12 && age(s, p) <= 17 && p.actual.int >= 45 && !hasFlag(p, 'olympiad') ? (hasTalent(p, 'genius') ? 0.15 : 0.03) : 0),
  title: () => '수학 올림피아드',
  text: (c) => `${who(c)}의 선생님이 수학 올림피아드 출전을 권한다.`,
  choices: (c) =>
    gate(c.s, [
      {
        label: '출전한다 (대회 준비 학원)',
        cost: 500,
        run: (x) => {
          addFlag(x.p, 'olympiad');
          x.p.eduSpent = (x.p.eduSpent ?? 0) + 500;
          if (check(x.s, x.p.actual.int + (hasTalent(x.p, 'genius') ? 15 : 0), 60, 6)) {
            x.p.study = clamp((x.p.study ?? 50) + 6, 0, 100);
            x.s.fame += 5;
            addFlag(x.p, 'olympiad_gold');
            return '🥇 금상! 신문에 이름이 났다. 명문대 입시에도 유리하다.';
          }
          x.p.study = clamp((x.p.study ?? 50) + 2, 0, 100);
          return '장려상. 좋은 경험이었다.';
        },
      },
      { label: '내신이나 챙긴다', run: () => '대회는 건너뛰었다.' },
    ]),
};

// ───────────────────────── 영광 ─────────────────────────

const olympic: LifeDef = {
  id: 'olympic',
  title: (c) => (c.ev.data?.ag ? '아시안게임' : '올림픽'),
  text: (c) => `국가대표 ${who(c)}, ${c.ev.data?.ag ? '아시안게임' : '올림픽'}에 출전한다! 온 가족이 TV 앞에 모였다.`,
  choices: () => [
    {
      label: '출전!',
      run: (x) => {
        const ag = !!x.ev.data?.ag;
        const v = x.p.actual.str + (hasTalent(x.p, 'athlete') ? 15 : 0) + x.p.jobLevel * 4 + normal(x.s, 0, 10) + (ag ? 12 : 0);
        const medal = v > 100 ? 'gold' : v > 92 ? 'silver' : v > 85 ? 'bronze' : '';
        if (!medal) return '아쉽게 메달을 놓쳤다. 다음을 기약한다.';
        const name = { gold: '🥇 금메달', silver: '🥈 은메달', bronze: '🥉 동메달' }[medal];
        x.s.fame += ag ? 8 : medal === 'gold' ? 30 : 15;
        x.p.cash += ag ? 1000 : medal === 'gold' ? 6300 : 3500;
        if (!ag && medal === 'gold') addFlag(x.p, 'olympic_gold');
        let extra = '';
        if (x.p.sex === 'M' && !hasFlag(x.p, 'served') && (medal === 'gold' || !ag)) {
          addFlag(x.p, 'served');
          addFlag(x.p, 'exempt_medal');
          extra = ' 병역특례도 받았다!';
        }
        return `${name}! 시상대 위에서 ${iga(who(x))} 울었다.` + extra;
      },
    },
  ],
};

const nobel: LifeDef = {
  id: 'nobel',
  weight: (_s, p) =>
    (['professor', 'researcher'].includes(p.job) && p.jobLevel >= 3 && (p.actual.int >= 85 || hasTalent(p, 'genius')) ? 0.004 : 0) + (p.job === 'novelist' && p.jobLevel >= 4 ? 0.01 : 0),
  title: () => '스톡홀름에서 온 전화',
  text: (c) => `새벽 4시, 스웨덴에서 전화가 왔다.\n"${who(c)} 씨, 노벨${c.p.job === 'novelist' ? '문학' : '과학'}상 수상자로 선정되셨습니다."`,
  choices: () => [
    {
      label: '수상 소감을 준비한다',
      run: (x) => {
        addFlag(x.p, 'nobel');
        x.s.fame += 80;
        x.p.cash += 130000;
        return '🏅 노벨상 수상! 상금 13억. 가문의 이름이 세계에 알려졌다.';
      },
    },
  ],
};

const ipo: LifeDef = {
  id: 'ipo',
  title: () => '상장 제안',
  text: (c) => `${who(c)}의 회사가 ${jobTitle(c.p)} 규모로 컸다. 증권사들이 IPO(상장)를 제안한다.`,
  choices: () => [
    {
      label: '상장한다',
      run: (x) => {
        addFlag(x.p, 'ipo');
        const v = Math.round(300000 * Math.max(0.4, normal(x.s, 1, 0.3)) * (x.p.jobLevel - 3));
        addHolding(x.s, 'stock', x.p.id, v).name = `${x.p.surname}씨 창업주 지분`;
        x.s.fame += 10;
        return `🔔 코스닥 상장! 창업주 지분 평가액 ${formatMoney(v)}. 하루아침에 주식 부자가 됐다.`;
      },
    },
    { label: '비상장으로 남는다', run: (x) => (addFlag(x.p, 'ipo_declined'), '경영권을 지키기로 했다.') },
  ],
};

const minister: LifeDef = {
  id: 'minister',
  weight: (s, p) => {
    const a = age(s, p);
    if (a < 45 || a > 72 || p.job === 'minister' || p.job === 'president' || hasFlag(p, 'draft_dodger')) return 0;
    const ok =
      (p.job === 'civil' && p.jobLevel >= 5) ||
      (p.job === 'professor' && p.jobLevel >= 2) ||
      (['judge', 'prosecutor'].includes(p.job) && p.jobLevel >= 3) ||
      p.job === 'politician' ||
      (p.job === 'diplomat' && p.jobLevel >= 4) ||
      (p.job === 'corp' && p.jobLevel >= 6);
    return ok ? 0.03 : 0;
  },
  title: () => '장관 후보 지명',
  text: (c) => `대통령실에서 연락이 왔다. ${who(c)}을(를) 장관 후보자로 지명하겠다고 한다.\n인사청문회에서 과거가 탈탈 털릴 것이다.`,
  choices: () => [
    {
      label: '인사청문회에 선다',
      run: (x) => {
        const p = x.p;
        const score = p.actual.mor + (hasFlag(p, 'served') ? 6 : 0) - (hasFlag(p, 'bankrupt') ? 10 : 0) - (hasFlag(p, 'divorced') ? 4 : 0) - x.s.taxHeat;
        if (check(x.s, score, 55, 8)) {
          setFlagVal(p, 'prev', `${p.job}:${p.jobLevel}`);
          setJob(p, 'minister');
          addFlag(p, 'was_minister');
          x.s.fame += 15;
          return '🏛 청문회를 통과했다! 장관으로 임명됐다. (2년 임기)';
        }
        x.s.fame = Math.max(0, x.s.fame - 8);
        return '위장전입, 논문 표절 의혹이 줄줄이 터졌다. 자진 사퇴했다.';
      },
    },
    { label: '고사한다', run: () => '"그릇이 못 됩니다." 정중히 사양했다.' },
  ],
};

/** 대선은 2030년부터 5년마다 */
export const isElectionYear = (y: number) => y >= 2030 && (y - 2030) % 5 === 0;

const presidential: LifeDef = {
  id: 'presidential',
  title: () => '대통령 선거',
  text: (c) => `${isElectionYear(c.s.year) ? c.s.year : ''}년 대선. 당에서 ${who(c)}을(를) 대선 후보로 추대하려 한다.\n(선거비용 30억 · 15% 이상 득표하면 보전)`,
  choices: (c) =>
    gate(c.s, [
      {
        label: '대선에 출마한다',
        cost: 30000,
        tag: 'public',
        run: (x) => {
          const p = x.p;
          const score =
            p.actual.cha * 0.4 + p.actual.mor * 0.3 + Math.min(40, x.s.fame / 5) + (hasTrait(p, 'leader') ? 8 : 0) + (hasTrait(p, 'social') ? 3 : 0) + p.jobLevel * 3 + normal(x.s, 0, 5);
          if (check(x.s, score, 78, 6)) {
            setJob(p, 'president');
            addFlag(p, 'president');
            x.s.fame += 150;
            x.s.log.push({ year: x.s.year, text: `🇰🇷 ${fullName(p)} 대통령 당선!`, kind: 'achv' });
            return `🇰🇷 당선! ${iga(who(x))} 대한민국 대통령이 되었다! 5년 단임.`;
          }
          if (score > 60) {
            householder(x.s).cash += 30000;
            return '낙선했지만 득표율 15%를 넘겨 선거비용은 보전받았다.';
          }
          x.s.fame = Math.max(0, x.s.fame - 5);
          return '참패. 선거비용 30억이 허공으로 날아갔다.';
        },
      },
      { label: '불출마', run: () => '때가 아니다.' },
    ]),
};

// ───────────────────────── 소소한 일상 ─────────────────────────

const gamble: LifeDef = {
  id: 'gamble',
  weight: (s, p) => (hasTrait(p, 'gambler') && age(s, p) >= 20 && p.cash > 500 ? 0.12 : 0),
  title: () => '한탕의 유혹',
  text: (c) => `${who(c)}, 친구 따라 간 카지노에서 손이 근질근질하다.`,
  choices: () => [
    {
      label: '딱 한 번만…',
      run: (x) => {
        const bet = Math.min(Math.max(500, Math.round(x.p.cash * 0.3)), 10000);
        if (chance(x.s, 0.12)) {
          x.p.cash += bet * 2;
          return `잭팟! ${formatMoney(bet * 2)}을 땄다. …이게 더 위험하다.`;
        }
        x.p.cash -= bet;
        x.p.happiness = clamp(x.p.happiness - 6, 0, 100);
        return `${formatMoney(bet)}을 잃었다. 본전 생각이 난다.`;
      },
    },
    { label: '발길을 돌린다', run: (x) => ((x.p.actual.mor = clamp(x.p.actual.mor + 2, 0, 100)), '잘 참았다.') },
  ],
};

const holidayNag: LifeDef = {
  id: 'holiday',
  weight: (s, p) => {
    const a = age(s, p);
    return (a >= 30 && !p.spouseId) || (a >= 27 && p.job === 'none' && !hasFlag(p, 'student')) ? 0.12 : 0;
  },
  title: () => '명절',
  text: (c) =>
    `설날, 큰집에 친척들이 모였다.\n"${c.p.spouseId ? '' : '결혼은 언제 하니? '}${c.p.job === 'none' ? '취직은 했고?' : '연봉은 얼마나 받니?'}"\n${who(c)}의 표정이 굳는다.`,
  choices: () => [
    { label: '웃어넘긴다', run: (x) => ((x.p.actual.mor = clamp(x.p.actual.mor + 1, 0, 100)), '"하하, 알아서 할게요." 전을 부쳤다.') },
    { label: '한마디 받아친다', run: (x) => ((x.p.happiness = clamp(x.p.happiness + 4, 0, 100)), (x.s.fame = Math.max(0, x.s.fame - 1)), '큰아버지 얼굴이 벌게졌다. 속은 시원하다.') },
    { label: '다음 명절엔 여행 간다', run: (x) => ((x.p.happiness = clamp(x.p.happiness + 6, 0, 100)), (x.p.affinity = clamp(x.p.affinity - 6, -100, 100)), '공항에서 인증샷을 올렸다.') },
  ],
};

const windfall: LifeDef = {
  id: 'windfall',
  weight: (s, p) => (age(s, p) >= 25 ? 0.003 : 0),
  title: () => '뜻밖의 유산',
  text: (c) => `한 번도 본 적 없는 먼 친척 할머니가 ${who(c)} 앞으로 재산을 남기셨다고 한다.`,
  choices: () => [
    {
      label: '감사히 받는다',
      run: (x) => {
        const v = int(x.s, 3000, 30000);
        x.p.cash += v;
        return `${formatMoney(v)}이 통장에 들어왔다.`;
      },
    },
  ],
};

/** 학폭 가해: 커서 유명해지면 폭로될 수 있다 */
function bullyLater(x: Ctx, p: number, denied: boolean) {
  addFlag(x.p, 'bully');
  if (chance(x.s, p)) schedule(x.s, int(x.s, 12, 25), 'bully_expose', x.p.id, { denied });
}

const bullying: LifeDef = {
  id: 'bullying',
  weight: (s, p) => (age(s, p) >= 10 && age(s, p) <= 17 ? 0.02 * (hasTrait(p, 'shy') || hasTrait(p, 'rebel') ? 2 : 1) : 0),
  title: () => '학교폭력',
  text: (c) => {
    c.ev.data ??= { bully: hasTrait(c.p, 'rebel') || (!hasTrait(c.p, 'shy') && chance(c.s, 0.3)) };
    return c.ev.data.bully ? `담임 선생님의 전화. ${iga(who(c))} 친구를 괴롭혔다고 한다.` : `${iga(who(c))} 학교에서 괴롭힘을 당하고 있었다. 온몸에 멍이 들었다.`;
  },
  choices: (c) =>
    c.ev.data.bully
      ? gate(c.s, [
          { label: '피해 학생에게 사과하고 합의', cost: 1000, run: (x) => ((x.p.actual.mor = clamp(x.p.actual.mor + 4, 0, 100)), (x.s.fame = Math.max(0, x.s.fame - 2)), bullyLater(x, 0.15, false), '무릎 꿇고 사과했다. 아이가 달라지길 바란다.') },
          { label: '우리 애는 그럴 애가 아니다', run: (x) => ((x.s.fame = Math.max(0, x.s.fame - 8)), (x.p.actual.mor = clamp(x.p.actual.mor - 4, 0, 100)), bullyLater(x, 0.6, true), '변호사를 선임했다. 동네에 소문이 났다.\n…언젠가 이 선택이 돌아올지도 모른다.') },
          { label: '엄하게 벌한다', run: (x) => ((x.p.actual.mor = clamp(x.p.actual.mor + 6, 0, 100)), (x.p.affinity = clamp(x.p.affinity - 12, -100, 100)), bullyLater(x, 0.3, false), '휴대폰을 뺏고 봉사활동을 보냈다.') },
        ])
      : gate(c.s, [
          { label: '전학시킨다', cost: 500, run: (x) => ((x.p.happiness = clamp(x.p.happiness + 10, 0, 100)), '새 학교에서 친구를 사귀었다.') },
          { label: '학폭위에 신고한다', run: (x) => ((x.p.happiness = clamp(x.p.happiness + 4, 0, 100)), (x.p.affinity = clamp(x.p.affinity + 10, -100, 100)), '가해 학생들이 징계를 받았다. 부모가 지켜줬다.') },
          { label: '참으라고 한다', run: (x) => ((x.p.happiness = clamp(x.p.happiness - 18, 0, 100)), addFlag(x.p, 'trauma'), chance(x.s, 0.4) && schedule(x.s, int(x.s, 15, 25), 'bully_apology', x.p.id), '아이의 눈빛이 달라졌다…') },
        ]),
};

const pet: LifeDef = {
  id: 'pet',
  weight: (s, p) => (p.id === s.headId && age(s, p) >= 25 && !hasFlag(p, 'pet') ? 0.03 : 0),
  title: () => '유기견',
  text: () => '비 오는 날, 집 앞에 떨고 있는 강아지가 있다.',
  choices: () => [
    {
      label: '데려와 키운다',
      run: (x) => {
        addFlag(x.p, 'pet');
        schedule(x.s, int(x.s, 12, 16), 'pet_farewell', x.p.id);
        for (const p of Object.values(x.s.people)) if (alive(p) && (p.id === x.p.id || p.id === x.p.spouseId || x.p.childIds.includes(p.id))) p.happiness = clamp(p.happiness + 6, 0, 100);
        return '이름은 "복실이". 가족 모두가 웃는다.';
      },
    },
    { label: '보호소에 연락한다', run: () => '좋은 주인을 만나길.' },
  ],
};

const officerStay: LifeDef = {
  id: 'officer_stay',
  title: () => '장기복무 제안',
  text: (c) => `전역을 앞둔 ${who(c)}에게 대대장이 장기복무를 권한다.`,
  choices: () => [
    { label: '직업군인으로 남는다', run: (x) => (setJob(x.p, 'officer', 1), '중위로 진급하며 장기복무를 시작했다.' + applyDesire(x, 'public')) },
    { label: '사회로 돌아간다', run: () => '전역증을 받았다.' },
  ],
};

/** 무작위로 일어나는 인생사 (가중치 있는 것) */
export const LIFE_RANDOM: LifeDef[] = [accident, depression, affair, fraud, layoff, scout, olympiad, nobel, minister, gamble, holidayNag, windfall, bullying, pet];
/** 조건이 되면 일어나는 것 (sim.ts 에서 직접 큐) */
export const LIFE_EVENTS: EventDef[] = [military, cancer, maritalCrisis, infertility, olympic, ipo, presidential, officerStay, ...LIFE_RANDOM];

