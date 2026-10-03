// 용돈: 부모 집에 사는 동안 받는다. 금액은 나이와 집안 형편 따라 (여성가족부 청소년 종합실태·대학생 생활비 조사 흐름):
//  초등 월 2만 · 중등 월 5만 · 고등 월 7~8만 · 대학생·취준생(집에서 통학) 월 30~40만.
//  가난한 집은 절반이거나 끊기고, 부잣집은 몇 배, 재벌가는 카드 한 장.
// 형편이 바뀌면 부모님이 줄이거나 늘린다는 이야기를 꺼낸다.

import { chance, int, pick } from './rng';
import { type Choice, type EventDef } from './ev-util';
import { expectedIncome, formatMoney, personWorth } from './economy';
import { wageIndex } from './pay';
import { addFlag, age, alive, clamp, fullName, hasFlag, head, mark, markOf, parentsOf, relationLabel } from './people';
import type { GameState, Person } from './types';

type Band = 'none' | 'poor' | 'tight' | 'normal' | 'comfy' | 'rich' | 'tycoon';
const BAND_MULT: Record<Band, number> = { none: 0, poor: 0.4, tight: 0.7, normal: 1, comfy: 1.6, rich: 3, tycoon: 6 };
const BAND_NAME: Record<Band, string> = { none: '끊김', poor: '아주 빠듯', tight: '빠듯', normal: '보통', comfy: '넉넉', rich: '부유', tycoon: '재벌가' };

/** 나이별 기본 한 해 용돈 (만원, 2025년 돈) */
function baseFor(s: GameState, p: Person): number {
  const a = age(s, p);
  if (a < 8) return 0;
  if (a < 13) return 24;
  if (a < 16) return 60;
  if (a < 19) return 90;
  // 성인: 대학생·취준생·백수는 계속 받는다. 돈을 벌기 시작하면 부모님이 "이제 그만"을 꺼낸다 (allowance_end)
  if (hasFlag(p, 'allow_cut') && !p.flags.includes('student') && p.job !== 'none') return 0;
  return p.flags.includes('student') ? 420 : 300;
}

/** 부모 형편 → 용돈 등급 */
function bandOf(s: GameState, p: Person): Band {
  const pars = parentsOf(s, p).filter(alive);
  if (!pars.length) return 'none';
  const inc = pars.reduce((t, q) => t + Math.max(0, expectedIncome(s, q)), 0) / wageIndex(s.year);
  const cash = pars.reduce((t, q) => t + q.cash, 0) / wageIndex(s.year);
  const worth = pars.reduce((t, q) => t + personWorth(s, q), 0) / wageIndex(s.year);
  if (pars.some((q) => q.job === 'founder' && q.jobLevel >= 4) || worth > 1000000) return 'tycoon';
  if (cash < -3000 && inc < 3000) return 'none';
  if (pars.some((q) => hasFlag(q, 'welfare')) || inc < 2500) return 'poor';
  if (inc < 4500 || cash < 0) return 'tight';
  if (worth > 200000 || inc > 20000) return 'rich';
  if (inc > 9000) return 'comfy';
  return 'normal';
}

export function allowanceOf(s: GameState, p: Person): { amount: number; band: Band } {
  if (hasFlag(p, 'indep') || p.spouseId) return { amount: 0, band: 'none' };
  const band = bandOf(s, p);
  let v = baseFor(s, p) * BAND_MULT[band];
  // 짠돌이·펑펑 부모
  const pars = parentsOf(s, p).filter(alive);
  if (pars.some((q) => q.traits?.includes('frugal'))) v *= 0.75;
  if (pars.some((q) => q.traits?.includes('spender'))) v *= 1.25;
  return { amount: Math.round(v * wageIndex(s.year)), band };
}

const ORDER: Band[] = ['none', 'poor', 'tight', 'normal', 'comfy', 'rich', 'tycoon'];
const lastBand = (p: Person) => p.flags.find((f) => f.startsWith('allow_band:'))?.slice(11) as Band | undefined;

/** 해마다: 용돈 지급. 형편이 두 단계 이상 바뀌면 부모님이 이야기를 꺼낸다 */
/** 용돈 중 쓰지 않고 남기는 몫: 아이들도 군것질·학용품·친구 만나는 데 대부분 쓴다 */
function keepRate(p: Person): number {
  const t = p.traits ?? [];
  return clamp((t.includes('frugal') ? 0.55 : t.includes('spender') ? 0.1 : 0.3) + Math.min(0.2, markOf(p, 'thrift') * 0.04), 0.05, 0.75);
}
/** 돈을 버는 중인가 (학생 알바는 빼고) */
const earning = (s: GameState, p: Person) => !p.flags.includes('student') && p.job !== 'none' && (p.job !== 'parttime' || expectedIncome(s, p) > 1500 * wageIndex(s.year));

export function allowanceYear(s: GameState) {
  const h = head(s);
  if (!alive(h)) return;
  const { amount, band } = allowanceOf(s, h);
  const pars = parentsOf(s, h).filter(alive);
  const payer = pars.sort((a, b) => b.cash - a.cash)[0];
  if (amount > 0 && payer) {
    // 반만 준다고 했던 해 (조른 결과)
    const half = hasFlag(h, 'allow_half');
    const given = half ? Math.round(amount / 2) : amount;
    h.flags = h.flags.filter((f) => f !== 'allow_half');
    payer.cash -= given;
    // 대부분은 그해에 쓴다 (군것질·교통비·친구·옷) — 남는 몫만 통장에
    h.cash += Math.round(given * keepRate(h));
  }
  const pending = (id: string) => s.events.some((e) => e.defId === id);
  // 돈을 벌기 시작했는데 아직 용돈을 받는다: 부모님이 "이제 그만"을 꺼낼 확률이 높다 (일반 직장 70%/년, 알바만 25%/년)
  if (amount > 0 && payer && age(s, h) >= 20 && earning(s, h) && !pending('allowance_end') && chance(s, h.job === 'parttime' ? 0.25 : 0.7))
    s.events.push({ uid: s.eventSeq++, defId: 'allowance_end', personId: h.id, data: { payerId: payer.id, amount } });
  // 용돈을 너무 안 써서 많이 쌓였다: 돈 쓸 일이 생긴다 (3년에 한 번까지)
  const pile = Math.max(600, amount * 3) * (age(s, h) < 20 ? 1 : 2);
  if (!hasFlag(h, 'indep') && age(s, h) >= 10 && age(s, h) < 30 && h.cash > pile && !pending('allowance_spree') && s.year - (s.storySeen?.['spree:' + h.id] ?? -99) >= 3 && chance(s, 0.6)) {
    (s.storySeen ??= {})['spree:' + h.id] = s.year;
    s.events.push({ uid: s.eventSeq++, defId: 'allowance_spree', personId: h.id });
  }
  const prev = lastBand(h);
  h.flags = h.flags.filter((f) => !f.startsWith('allow_band:'));
  if (band !== 'none' || baseFor(s, h) > 0) addFlag(h, 'allow_band:' + band);
  if (!prev || !payer || baseFor(s, h) === 0) return;
  const d = ORDER.indexOf(band) - ORDER.indexOf(prev);
  if (Math.abs(d) >= 1 && (Math.abs(d) >= 2 || band === 'none' || chance(s, 0.5)) && !s.events.some((e) => e.defId === 'allowance_talk'))
    s.events.push({ uid: s.eventSeq++, defId: 'allowance_talk', personId: h.id, data: { from: prev, to: band, payerId: payer.id, amount } });
}

const talk: EventDef = {
  id: 'allowance_talk',
  title: (c) => (ORDER.indexOf(c.ev.data.to) > ORDER.indexOf(c.ev.data.from) ? '💸 용돈이 올랐다' : c.ev.data.to === 'none' ? '💸 용돈 끊김' : '💸 용돈 삭감'),
  valid: (c) => alive(c.p) && !hasFlag(c.p, 'indep'),
  portraits: (c) => [c.s.people[c.ev.data.payerId], c.p].filter(Boolean),
  text: (c) => {
    const d = c.ev.data as { from: Band; to: Band; payerId: string; amount: number };
    const payer = c.s.people[d.payerId];
    const up = ORDER.indexOf(d.to) > ORDER.indexOf(d.from);
    const who = payer ? relationLabel(c.s, payer) : '부모님';
    const monthly = formatMoney(Math.round(d.amount / 12));
    if (up)
      return d.to === 'tycoon' || d.to === 'rich'
        ? `${who}이(가) 지갑에서 카드 한 장을 꺼내 주셨다. "필요한 데 써라. 대신 아껴 쓰고."\n용돈 월 ${monthly} (집안 형편: ${BAND_NAME[d.to]})`
        : `요즘 집안 형편이 나아졌다. ${who}: "고생했다. 용돈 좀 올려 주마."\n용돈 월 ${monthly} (집안 형편: ${BAND_NAME[d.from]} → ${BAND_NAME[d.to]})`;
    if (d.to === 'none') return `저녁 식탁. ${who}이(가) 한참 머뭇거리다 말을 꺼냈다.\n"미안하다. 당분간 용돈은 못 주겠다."\n빚 독촉 전화가 잦아진 걸 ${fullName(c.p)}도 알고 있었다.`;
    return `${who}: "요즘 집이 좀 어렵다. 용돈을 줄여야겠구나."\n용돈 월 ${monthly} (집안 형편: ${BAND_NAME[d.from]} → ${BAND_NAME[d.to]})`;
  },
  choices: (c) => {
    const d = c.ev.data;
    const up = ORDER.indexOf(d.to) > ORDER.indexOf(d.from);
    const p = c.p;
    const adult = age(c.s, p) >= 16;
    const out: Choice[] = [];
    if (up) {
      out.push({ label: '감사히 받고 저축한다', run: (x) => (mark(x.p, 'thrift'), (x.p.affinity = clamp(x.p.affinity + 5, -100, 100)), '반은 통장에 넣었다. 부모님이 흐뭇해하신다.') });
      out.push({ label: '갖고 싶던 걸 산다', run: (x) => ((x.p.happiness = clamp(x.p.happiness + 8, 0, 100)), (x.p.cash -= Math.round(d.amount * 0.3)), pick(x.s, ['새 운동화를 샀다. 한동안 신발만 쳐다봤다.', '친구들에게 한턱 쐈다. 인기가 올라간 기분이다.', '최신 휴대폰으로 바꿨다.'])) });
      return out;
    }
    if (adult)
      out.push({
        label: '알바를 시작한다 (편의점·물류센터)',
        run: (x) => {
          const pay = Math.round(int(x.s, 300, 700) * wageIndex(x.s.year));
          x.p.cash += pay;
          x.p.happiness = clamp(x.p.happiness - 3, 0, 100);
          if (typeof x.p.study === 'number' && age(x.s, x.p) < 20) x.p.study = Math.max(0, x.p.study - 2);
          mark(x.p, 'selfmade');
          x.p.affinity = clamp(x.p.affinity + 6, -100, 100);
          return `주말마다 편의점에 선다. 올해 ${formatMoney(pay)}을 벌었다. 공부 시간은 조금 줄었다.`;
        },
      });
    out.push({ label: '괜찮다고, 아껴 쓰겠다고 한다', run: (x) => (mark(x.p, 'thrift'), (x.p.affinity = clamp(x.p.affinity + 8, -100, 100)), (x.p.actual.mor = clamp(x.p.actual.mor + 1, 0, 100)), '"걱정 마세요." 부모님 눈가가 촉촉해졌다.') });
    out.push({ label: '친구들 다 받는데… 조른다', run: (x) => ((x.p.affinity = clamp(x.p.affinity - 8, -100, 100)), (x.p.happiness = clamp(x.p.happiness - 5, 0, 100)), '"우리 집 사정 뻔히 알면서!" 목소리가 커졌다. 방문이 쾅 닫혔다.') });
    return out;
  },
};

/** 돈을 벌기 시작한 자식에게: "이제 용돈은 그만" */
const allowanceEnd: EventDef = {
  id: 'allowance_end',
  title: () => '💸 이제 용돈은 그만',
  valid: (c) => alive(c.p) && !hasFlag(c.p, 'indep') && !c.p.spouseId && !hasFlag(c.p, 'allow_cut'),
  portraits: (c) => [c.s.people[c.ev.data.payerId], c.p].filter(Boolean),
  text: (c) => {
    const payer = c.s.people[c.ev.data.payerId];
    return `${payer ? relationLabel(c.s, payer) : '부모님'}이(가) 저녁 식탁에서 말을 꺼냈다.
"이제 너도 ${c.p.job === 'parttime' ? '알바로 꽤 버는 것 같던데' : '월급을 받으니'}, 용돈은 이번 달까지만 주마. 대신 집에 생활비를 좀 보태면 좋겠구나."
(지금 용돈 월 ${formatMoney(Math.round(c.ev.data.amount / 12))})`;
  },
  choices: () => [
    {
      label: '당연하죠. 생활비도 보탤게요',
      run: (x) => {
        addFlag(x.p, 'allow_cut');
        mark(x.p, 'filial');
        const v = Math.min(Math.max(0, x.p.cash), Math.round(300 * wageIndex(x.s.year)));
        x.p.cash -= v;
        const payer = x.s.people[x.ev.data.payerId];
        if (payer) (payer.cash += v), (payer.affinity = clamp(payer.affinity + 10, -100, 100));
        return `첫 생활비 봉투를 내밀었다. 어머니가 봉투를 한참 쓰다듬었다.${v ? ` (${formatMoney(v)})` : ''}`;
      },
    },
    { label: '알겠어요, 이제 제 힘으로', run: (x) => (addFlag(x.p, 'allow_cut'), mark(x.p, 'selfmade'), '용돈 통장이 조용해졌다. 진짜 어른이 된 기분이다.') },
    {
      label: '조금만 더 주시면 안 돼요…',
      run: (x) => {
        const payer = x.s.people[x.ev.data.payerId];
        if (chance(x.s, 0.45)) {
          addFlag(x.p, 'allow_half');
          if (payer) payer.affinity = clamp(payer.affinity - 4, -100, 100);
          return '"그럼 올해까지만 반만 주마." 마지못해 고개를 끄덕이셨다. 내년엔 정말 끝이다.';
        }
        addFlag(x.p, 'allow_cut');
        if (payer) payer.affinity = clamp(payer.affinity - 8, -100, 100);
        x.p.happiness = clamp(x.p.happiness - 4, 0, 100);
        return '"돈 버는 애가 무슨 용돈이니." 단칼에 잘렸다.';
      },
    },
  ],
};

/** 용돈을 너무 안 써서 많이 모였다: 쓸 일이 생긴다 */
const allowanceSpree: EventDef = {
  id: 'allowance_spree',
  title: () => '🐷 불어난 저금통',
  valid: (c) => alive(c.p) && c.p.cash > 0,
  text: (c) => `${fullName(c.p)}의 통장에 용돈이 ${formatMoney(c.p.cash)}이나 쌓였다. 친구들이 "너 부자네?" 한다. 갖고 싶은 것도, 하고 싶은 것도 많다.`,
  choices: (c) => {
    const a = age(c.s, c.p);
    const spend = (r: number) => (x: { p: Person }) => {
      const v = Math.round(Math.max(0, x.p.cash) * r);
      x.p.cash -= v;
      return v;
    };
    const big = a < 14 ? '최신 게임기와 게임' : a < 20 ? '최신 휴대폰과 무선 이어폰' : '노트북과 명품 지갑';
    return [
      { label: `${big}을(를) 산다`, run: (x) => { const v = spend(0.45)(x); x.p.happiness = clamp(x.p.happiness + 10, 0, 100); mark(x.p, 'spend'); return `${big}을(를) 손에 넣었다. 며칠 동안 잠도 설쳤다. (−${formatMoney(v)})`; } },
      { label: a < 18 ? '친구들에게 한턱 쏜다' : '친구들과 여행을 간다', run: (x) => { const v = spend(0.25)(x); x.p.happiness = clamp(x.p.happiness + 8, 0, 100); x.p.actual.cha = clamp(x.p.actual.cha + 1, 0, 100); return `${a < 18 ? '떡볶이·노래방·영화까지 풀코스.' : '바닷가로 2박 3일.'} 추억이 쌓였다. (−${formatMoney(v)}, 매력 +1)`; } },
      { label: '부모님 선물을 산다', run: (x) => { const v = spend(0.15)(x); for (const q of parentsOf(x.s, x.p).filter(alive)) q.affinity = clamp(q.affinity + 8, -100, 100); mark(x.p, 'filial'); return `부모님 내복과 화장품을 샀다. 어머니가 한참 말을 잇지 못하셨다. (−${formatMoney(v)})`; } },
      { label: a < 15 ? '학원 교재·책을 산다' : '배우고 싶던 걸 배운다', run: (x) => { const v = spend(0.2)(x); x.p.actual.int = clamp(x.p.actual.int + 2, 0, 100); return `${a < 15 ? '서점에서 한 아름 사 왔다.' : '주말 강좌에 등록했다.'} (−${formatMoney(v)}, 지능 +2)`; } },
      { label: '그래도 모은다 (적금 통장)', run: (x) => { mark(x.p, 'thrift', 2); x.p.happiness = clamp(x.p.happiness - 2, 0, 100); return '"나중에 크게 쓸 거야." 친구들은 짠돌이라 놀리지만, 통장 숫자를 보면 든든하다.'; } },
    ];
  },
};

export const ALLOWANCE_EVENTS = [talk, allowanceEnd, allowanceSpree];
