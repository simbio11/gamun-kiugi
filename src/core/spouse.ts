// 배우자도 제 인생이 있다: 성격·능력에 따라 요즘 몰두하는 일(자녀 교육·재테크·커리어·동네 활동·자기계발·살림)이 생기고,
// 해마다 조금씩 가족에 보탬이 된다. 가끔은 스스로 일을 벌인다 (재취업·청약·부업·자격증·투자 권유 …).
// 훈장·카드는 여기서 직접 주지 않는다. 새 직업은 0단계부터 시작해 평소 규칙대로 올라가야 한다.

import { chance, int, next, pick } from './rng';
import { gate, type Choice, type EventDef } from './ev-util';
import { addAsset, addHolding, formatMoney } from './economy';
import { addStudy } from './school';
import { wageIndex } from './pay';
import { addFlag, age, alive, clamp, fullName, hasTrait, head, householder, livingMainlineMinors, mark, spouseOf } from './people';
import type { GameState, JobId, Person } from './types';

export type Focus = 'edu' | 'money' | 'career' | 'community' | 'self' | 'home';
export const FOCUS_LABEL: Record<Focus, string> = {
  edu: '📚 아이들 교육에 열심',
  money: '💹 재테크 공부 중',
  career: '💼 일에 몰두',
  community: '🤝 동네·봉사 활동',
  self: '📖 자기계발 중',
  home: '🏠 알뜰살림',
};

export function focusOf(p: Person): Focus | undefined {
  return p.flags.find((f) => f.startsWith('sp_focus:'))?.slice(9) as Focus | undefined;
}
function setFocus(p: Person, f: Focus) {
  p.flags = p.flags.filter((x) => !x.startsWith('sp_focus:'));
  p.flags.push('sp_focus:' + f);
}
/** 성향으로 요즘 몰두할 일을 고른다 */
function pickFocus(s: GameState, sp: Person): Focus {
  const kids = livingMainlineMinors(s).filter((k) => age(s, k) >= 6).length;
  const w: [Focus, number][] = [
    ['career', sp.job !== 'none' ? 3 + sp.jobLevel : 0.5],
    ['edu', kids ? 2 + sp.actual.int / 40 : 0],
    ['money', sp.actual.int / 30 + (hasTrait(sp, 'frugal') ? 1.5 : 0)],
    ['community', sp.actual.cha / 30 + (hasTrait(sp, 'social') ? 1.5 : 0)],
    ['self', 1 + (hasTrait(sp, 'diligent') ? 1 : 0)],
    ['home', sp.job === 'none' ? 2 : 0.5 + (hasTrait(sp, 'frugal') ? 1 : 0)],
  ];
  const tot = w.reduce((t, [, v]) => t + v, 0);
  let r = next(s) * tot;
  for (const [f, v] of w) if ((r -= v) <= 0) return f;
  return 'home';
}

const bond = (p: Person, d: number) => (p.bond = clamp((p.bond ?? 60) + d, 0, 100));
const hap = (p: Person, d: number) => (p.happiness = clamp(p.happiness + d, 0, 100));

/** 재취업할 만한 일: 능력에 맞춰 */
function comebackJob(sp: Person): JobId {
  if (sp.actual.int >= 60) return 'tutor';
  if (sp.actual.int >= 50) return 'office';
  if (sp.actual.mor >= 50) return sp.sex === 'F' ? 'nurse_aide' : 'caregiver';
  return 'caregiver';
}

interface SpAct {
  id: string;
  title: (c: { s: GameState; p: Person }) => string;
  ok: (s: GameState, sp: Person) => boolean;
  text: (c: Parameters<EventDef['text']>[0]) => string;
  choices: (c: Parameters<EventDef['choices']>[0]) => Choice[];
}

const ACTS: SpAct[] = [
  {
    id: 'sp_comeback',
    title: () => '💼 "나도 다시 일하고 싶어"',
    ok: (s, sp) => sp.job === 'none' && age(s, sp) >= 28 && age(s, sp) <= 56 && livingMainlineMinors(s).every((k) => age(s, k) >= 4),
    text: (c) => `${fullName(c.p)}이(가) 저녁 식탁에서 말을 꺼냈다.\n"아이들도 컸고, 나도 내 일을 다시 하고 싶어. 경력은 끊겼지만 지금이라도."\n(경력단절 후 재취업: 처음엔 낮은 자리부터)`,
    choices: (c) =>
      gate(c.s, [
        {
          label: '응원한다 (직업훈련·자격증 학원비 300만)',
          cost: 300,
          run: (x) => {
            const j = comebackJob(x.p);
            if (!chance(x.s, 0.75)) return bond(x.p, 4), '몇 달을 준비했지만 면접에서 번번이 떨어졌다. 그래도 곁에서 응원해 준 게 고맙단다.';
            x.p.job = j;
            x.p.jobLevel = 0;
            x.p.jobYears = 0;
            bond(x.p, 8);
            hap(x.p, 12);
            setFocus(x.p, 'career');
            return `${fullName(x.p)}, 첫 출근! 쑥스러워하면서도 들뜬 얼굴이다.`;
          },
        },
        {
          label: '둘이 작은 가게를 차린다 (3,000만)',
          cost: 3000,
          run: (x) => {
            x.p.job = x.p.actual.cha >= 50 ? 'cafe_owner' : 'online_shop';
            x.p.jobLevel = 0;
            x.p.jobYears = 0;
            bond(x.p, 6);
            hap(x.p, 10);
            setFocus(x.p, 'career');
            return `${fullName(x.p)}의 가게가 문을 열었다. 개업 떡을 돌렸다.`;
          },
        },
        { label: '"아이들 더 클 때까지만…"', run: (x) => (bond(x.p, -8), hap(x.p, -10), '대답 대신 설거지 소리만 크게 났다.') },
      ]),
  },
  {
    id: 'sp_cheongyak',
    title: () => '🎉 청약 당첨!',
    ok: (s, sp) => {
      const h = householder(s);
      return h.id === s.headId && h.home?.type !== 'own' && !s.assets.some((a) => (a.ownerId === s.headId || a.ownerId === sp.id) && (a.kind === 'apt_seoul' || a.kind === 'apt_local')) && (focusOf(sp) === 'money' || sp.flags.includes('sp_cheong'));
    },
    text: (c) => {
      const price = Math.round((c.s.market.apt_seoul * 0.72) / 100) * 100;
      c.ev.data ??= { price };
      return `${fullName(c.p)}이(가) 몇 년째 넣어 온 청약통장이 드디어 터졌다!\n수도권 신축 아파트 분양가 ${formatMoney(price)} (주변 시세 ${formatMoney(c.s.market.apt_seoul)})\n계약금·중도금 일부로 분양가의 30%가 필요하고, 나머지 70%는 잔금 대출.`;
    },
    choices: (c) => {
      const price: number = c.ev.data?.price ?? c.s.market.apt_seoul * 0.72;
      return gate(c.s, [
        {
          label: `계약한다 (${formatMoney(Math.round(price * 0.3))})`,
          cost: Math.round(price * 0.3),
          run: (x) => {
            const a = addAsset(x.s, 'apt_seoul', x.s.headId, x.s.market.apt_seoul, '청약 당첨 신축 아파트');
            a.cost = price;
            a.bought = x.s.year;
            a.loan = Math.round(price * 0.7);
            a.tags = ['신축'];
            bond(x.p, 12);
            hap(x.p, 15);
            return `계약서에 도장을 찍었다. 입주는 몇 년 뒤지만, 벌써 시세 차익이 ${formatMoney(x.s.market.apt_seoul - price)}이다. "내가 몇 년을 넣었는데!" ${fullName(x.p)}이(가) 으쓱한다.`;
          },
        },
        { label: '돈이 모자라 포기한다', run: (x) => (hap(x.p, -10), '당첨 통장을 날렸다. 한동안 부부 사이에 말이 없었다.') },
      ]);
    },
  },
  {
    id: 'sp_side',
    title: () => '🛍 배우자의 부업',
    ok: (s, sp) => age(s, sp) < 60 && (sp.job === 'none' || sp.actual.int + sp.actual.cha >= 110),
    text: (c) => `${fullName(c.p)}이(가) 밤마다 노트북 앞에 앉아 있다. "${pick(c.s, ['스마트스토어로 수제 간식을 팔아 볼까 해.', '블로그 체험단이랑 공방 수업을 해 보려고.', '동네 아이들 공부방을 열어 볼까?', '중고 명품 리셀을 좀 알아 봤거든.'])}" 초기 비용 500만.`,
    choices: (c) =>
      gate(c.s, [
        {
          label: '해 보라고 한다 (500만)',
          cost: 500,
          run: (x) => {
            const r = int(x.s, 0, 9) + (x.p.actual.int + x.p.actual.cha) / 30;
            if (r >= 9) {
              const v = Math.round(int(x.s, 1200, 3500) * wageIndex(x.s.year));
              x.p.cash += v;
              hap(x.p, 12);
              return `대박까진 아니어도 쏠쏠하다. 올해 부업 순수익 ${formatMoney(v)}. "내 돈 내가 벌었다!"`;
            }
            if (r >= 5) {
              x.p.cash += 600;
              hap(x.p, 5);
              return '본전은 건졌다. 재미있었다고 한다.';
            }
            hap(x.p, -6);
            return '재고만 쌓였다. 베란다가 택배 상자로 가득하다.';
          },
        },
        { label: '말린다', run: (x) => (bond(x.p, -4), '"당신은 늘 내 편이 아니더라."') },
      ]),
  },
  {
    id: 'sp_cert',
    title: () => '📖 늦깎이 공부',
    ok: (s, sp) => age(s, sp) >= 30 && age(s, sp) <= 60 && focusOf(sp) === 'self',
    text: (c) => `${fullName(c.p)}이(가) ${pick(c.s, ['방송통신대에 원서를 냈다', '사회복지사 자격 과정을 알아 왔다', '공인중개사 시험을 보겠다고 한다', '야간 대학원 입학 설명회에 다녀왔다'])}. "이 나이에 무슨 공부냐고? 지금이 제일 젊을 때야." 비용 800만.`,
    choices: (c) =>
      gate(c.s, [
        {
          label: '밀어준다 (800만)',
          cost: 800,
          run: (x) => {
            x.p.actual.int = clamp(x.p.actual.int + 3, 0, Math.max(x.p.potential.int, x.p.actual.int));
            mark(x.p, 'study');
            if (chance(x.s, 0.55)) {
              if (x.p.job === 'none') {
                x.p.job = x.p.actual.int >= 55 ? 'realtor' : 'social_worker';
                x.p.jobLevel = 0;
                x.p.jobYears = 0;
                return `합격! ${fullName(x.p)}이(가) 새 일을 시작했다.`;
              }
              return '자격증을 땄다. 액자에 넣어 거실에 걸었다.';
            }
            return '이번엔 떨어졌다. 그래도 공부하는 모습이 아이들에게 좋은 본보기가 됐다.';
          },
        },
        { label: '돈 아깝다고 한다', run: (x) => (bond(x.p, -6), hap(x.p, -6), '책을 덮는 소리가 크게 들렸다.') },
      ]),
  },
  {
    id: 'sp_pta',
    title: () => '🏫 학부모회장',
    ok: (s, sp) => focusOf(sp) === 'community' && livingMainlineMinors(s).some((k) => age(s, k) >= 8 && age(s, k) <= 18),
    text: (c) => `${fullName(c.p)}이(가) 학부모회장에 뽑혔다. 행사·봉사·학교 운영위원회까지. 바빠지겠지만 인맥은 넓어진다.`,
    choices: () => [
      {
        label: '잘됐다고 축하한다',
        run: (x) => {
          x.s.fame += 1;
          mark(x.p, 'network');
          for (const k of livingMainlineMinors(x.s)) hap(k, 3);
          return '아이 학교에서 우리 가족을 모르는 사람이 없다. (명성 +1)';
        },
      },
    ],
  },
  {
    id: 'sp_scam',
    title: () => '📞 "좋은 투자처가 있대"',
    ok: (_s, sp) => sp.cash >= 1500 && sp.actual.int < 58,
    text: (c) => `${fullName(c.p)}이(가) 동창 모임에서 "원금 보장, 월 3% 배당" 투자를 권유받았다. 벌써 1,000만 원을 넣기로 약속했단다.`,
    choices: () => [
      {
        label: '폰지 사기라고 말린다',
        run: (x) => {
          if ((x.p.bond ?? 60) >= 45 || chance(x.s, 0.5)) return bond(x.p, 2), '반신반의하더니 넣지 않았다. 몇 달 뒤 그 업체 대표가 구속됐다는 뉴스가 떴다.';
          x.p.cash -= 1000;
          bond(x.p, -5);
          return '"당신은 맨날 부정적이야." 결국 넣었다. 석 달 뒤 연락이 끊겼다.';
        },
      },
      { label: '본인 돈이니 알아서 하라고 한다', run: (x) => ((x.p.cash -= 1000), hap(x.p, -10), '석 달 배당이 들어오더니 사이트가 닫혔다. 1,000만 원이 사라졌다.') },
    ],
  },
];

const defOf = (a: SpAct): EventDef => ({
  id: a.id,
  title: (c) => a.title(c),
  text: a.text,
  choices: a.choices,
  portraits: (c) => [c.p],
  valid: (c) => alive(c.p) && c.p.id === head(c.s).spouseId && a.ok(c.s, c.p),
});
export const SPOUSE_EVENTS: EventDef[] = ACTS.map(defOf);

/** 해마다: 배우자의 관심사가 조금씩 가족에 보탬이 되고, 가끔 스스로 일을 벌인다 */
export function spouseYear(s: GameState): string[] {
  const msgs: string[] = [];
  const h = head(s);
  const sp = spouseOf(s, h);
  if (!sp || !alive(sp)) return msgs;
  // 몇 년에 한 번 관심사가 바뀐다
  if (!focusOf(sp) || chance(s, 0.12)) setFocus(sp, pickFocus(s, sp));
  if (!sp.flags.includes('sp_cheong') && chance(s, 0.3)) addFlag(sp, 'sp_cheong'); // 청약통장은 대개 누군가 넣고 있다
  const wi = wageIndex(s.year);
  switch (focusOf(sp)) {
    case 'edu':
      for (const k of livingMainlineMinors(s)) if (age(s, k) >= 7 && age(s, k) <= 18) addStudy(s, k, 1.2);
      break;
    case 'money':
      if (sp.cash > 3000) {
        const v = Math.round(sp.cash * 0.25);
        sp.cash -= v;
        addHolding(s, 'stock', sp.id, v);
      }
      break;
    case 'community':
      s.fame += 0.3;
      mark(sp, 'network');
      break;
    case 'self':
      if (sp.actual.int < sp.potential.int) sp.actual.int += 1;
      break;
    case 'home':
      // 알뜰살림: 장보기·공과금·보험을 꼼꼼히 챙겨 한 해 수십~백여만 원을 아낀다
      householder(s).cash += Math.round((hasTrait(sp, 'frugal') ? 180 : 100) * wi);
      break;
  }
  // 스스로 벌이는 일: 3년에 한 번꼴
  const seen = (s.storySeen ??= {});
  if ((seen['sp:' + sp.id] ?? -99) <= s.year - 3 && chance(s, 0.3)) {
    const pool = ACTS.filter((a) => a.ok(s, sp));
    if (pool.length) {
      const a = pick(s, pool);
      seen['sp:' + sp.id] = s.year;
      s.events.push({ uid: s.eventSeq++, defId: a.id, personId: sp.id });
    }
  }
  return msgs;
}
