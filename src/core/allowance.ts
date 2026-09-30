// 용돈: 부모 집에 사는 동안 받는다. 금액은 나이와 집안 형편 따라 (여성가족부 청소년 종합실태·대학생 생활비 조사 흐름):
//  초등 월 2만 · 중등 월 5만 · 고등 월 7~8만 · 대학생·취준생(집에서 통학) 월 30~40만.
//  가난한 집은 절반이거나 끊기고, 부잣집은 몇 배, 재벌가는 카드 한 장.
// 형편이 바뀌면 부모님이 줄이거나 늘린다는 이야기를 꺼낸다.

import { chance, int, pick } from './rng';
import { type Choice, type EventDef } from './ev-util';
import { expectedIncome, formatMoney, personWorth } from './economy';
import { wageIndex } from './pay';
import { addFlag, age, alive, clamp, fullName, hasFlag, head, mark, parentsOf, relationLabel } from './people';
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
  // 성인: 학생·취준생만 (일하면 오히려 생활비를 보탠다)
  if (p.job !== 'none' && p.job !== 'parttime') return 0;
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
export function allowanceYear(s: GameState) {
  const h = head(s);
  if (!alive(h)) return;
  const { amount, band } = allowanceOf(s, h);
  const pars = parentsOf(s, h).filter(alive);
  const payer = pars.sort((a, b) => b.cash - a.cash)[0];
  if (amount > 0 && payer) {
    payer.cash -= amount;
    h.cash += amount;
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

export const ALLOWANCE_EVENTS = [talk];
