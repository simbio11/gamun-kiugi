// 자식은 자원이 아니라 사람이다: 저마다 독립심·야망·충성도가 있어 가주의 뜻을 거스르기도 하고,
// 불쑥 일을 저지르기도 한다 (야반도주·빚보증·창업·정치 입문·꿈을 좇아 퇴사·출가).
// 정략결혼: 몰락 명문가(명성)와 신흥 부유층(돈) 중 하나와 사돈을 맺을 수 있다. 사랑은 덤이 아니다.

import { chance, int, pick } from './rng';
import { gate, queueNext, type Choice, type Ctx, type EventDef } from './ev-util';
import { addFlag, age, alive, check, clamp, fullName, hasFlag, hasTrait, householder, isMainline, spouseOf } from './people';
import { breakUp, startDating } from './romance';
import { makeDate } from './events';
import { formatMoney } from './economy';
import { SURNAMES } from './data';
import type { ActionDef } from './actions';
import type { GameState, Person } from './types';

/** 사람마다 고정된 0~1 값 */
function hashUnit(id: string, salt: string): number {
  let x = 2166136261;
  for (const ch of id + '|' + salt) x = Math.imul(x ^ ch.charCodeAt(0), 16777619);
  x ^= x >>> 15;
  x = Math.imul(x, 0x2c1b3c6d);
  x ^= x >>> 12;
  return (x >>> 0) / 4294967296;
}

export interface Will {
  /** 독립심: 높으면 자기 길을 간다 */
  indep: number;
  /** 야망: 높으면 큰일을 벌인다 */
  ambition: number;
  /** 충성도: 부모·가문을 따르는 마음 (관계에 따라 변한다) */
  loyalty: number;
}
export function willOf(p: Person): Will {
  const t = (id: string) => hasTrait(p, id);
  const j = (salt: string) => (hashUnit(p.id + ':' + p.birthYear, salt) - 0.5) * 36;
  return {
    indep: Math.round(clamp(48 + (t('rebel') ? 25 : 0) + (t('gambler') ? 8 : 0) + (t('filial') ? -18 : 0) + (t('shy') ? -6 : 0) + j('indep'), 5, 95)),
    ambition: Math.round(clamp(42 + (t('ambitious') ? 30 : 0) + (t('leader') ? 14 : 0) + (t('lazy') ? -20 : 0) + (p.actual.cha - 50) / 5 + j('amb'), 5, 95)),
    loyalty: Math.round(clamp(50 + p.affinity / 2 + (t('filial') ? 20 : 0) + (t('rebel') ? -20 : 0) + j('loy') / 2, 0, 100)),
  };
}
export const willLine = (p: Person) => {
  const w = willOf(p);
  const lv = (v: number, hi: string, lo: string) => (v >= 65 ? hi : v <= 35 ? lo : '');
  return [lv(w.indep, '독립심 강함', '의지하는 편'), lv(w.ambition, '야망가', '욕심 없음'), lv(w.loyalty, '효심 깊음', '반항적')].filter(Boolean).join(' · ') || '무난한 성향';
};
/** 가주의 뜻을 따를까: 충성도 vs 독립심 */
export function obeys(s: GameState, p: Person, pressure = 0): boolean {
  const w = willOf(p);
  return chance(s, clamp(0.55 + (w.loyalty - w.indep) / 110 + pressure, 0.08, 0.95));
}

const kids = (s: GameState) =>
  Object.values(s.people).filter((p) => alive(p) && !p.inLaw && isMainline(s, p) && p.id !== s.headId && age(s, p) >= 18 && age(s, p) <= 50 && !p.flags.includes('student'));
const n = (c: Ctx) => fullName(c.p);
const hap = (p: Person, d: number) => (p.happiness = clamp(p.happiness + d, 0, 100));
const aff = (p: Person, d: number) => (p.affinity = clamp(p.affinity + d, -100, 100));

// ───────────────────────── 정략결혼 ─────────────────────────

function arrangedMatch(s: GameState, p: Person, kind: 'noble' | 'rich'): Person {
  const c = makeDate(s, p, kind === 'rich' ? 8 : 4);
  c.surname = pick(s, SURNAMES.filter((x) => x !== s.familyName));
  addFlag(c, kind === 'noble' ? 'from_noble' : 'from_newmoney');
  if (kind === 'rich') c.cash += 20000;
  return c;
}

const arranged: EventDef = {
  id: 'arranged_offer',
  title: () => '💍 혼담',
  valid: (c) => alive(c.p) && !c.p.spouseId,
  text: (c) => {
    const w = willOf(c.p);
    const partner = c.p.partnerId ? c.s.people[c.p.partnerId] : undefined;
    return (
      `중매인이 ${n(c)}(${age(c.s, c.p)}세)의 혼담을 두 개 들고 왔다.\n\n` +
      `🏯 몰락한 명문가: 300년 종가지만 가세가 기울었다. 사돈을 맺으면 가문 명성과 인맥이 오른다. 대신 저쪽 빚 일부를 떠안아야 한다.\n` +
      `💎 신흥 부유층: 코인·부동산으로 크게 번 집안. 지참금과 사업 투자를 약속한다. "졸부와 사돈 맺는다"는 뒷말은 각오해야 한다.\n\n` +
      (partner ? `⚠ ${n(c)}에게는 사귀는 사람(${fullName(partner)})이 있다.\n` : '') +
      `${n(c)}의 성향: ${willLine(c.p)} (독립심 ${w.indep} · 충성도 ${w.loyalty})`
    );
  },
  choices: (c) => {
    const go = (kind: 'noble' | 'rich'): Choice => ({
      label: kind === 'noble' ? '🏯 명문가와 정략결혼을 시킨다' : '💎 신흥 부자와 정략결혼을 시킨다',
      req: ['자녀가 거부할 수도'],
      run: (x) => {
        const p = x.p;
        const hasLove = !!p.partnerId;
        if (!obeys(x.s, p, hasLove ? -0.25 : 0)) {
          aff(p, -18);
          hap(p, -6);
          addFlag(p, 'grievance');
          if (hasLove && willOf(p).indep >= 55) {
            queueNext(x.s, 'kid_wedding', p.id);
            aff(p, -12);
            return `"제 인생은 제가 정해요!" ${fullName(p)}이(가) 애인과 짐을 싸서 나갔다. 둘이서 조촐한 결혼식을 올리겠다고 한다. (야반도주)`;
          }
          return `"싫어요. 사랑 없는 결혼은 안 해요." ${fullName(p)}이(가) 방문을 걸어 잠갔다. 혼담은 없던 일이 됐다.`;
        }
        if (p.partnerId) breakUp(x.s, p, '집안의 반대', true);
        const m = arrangedMatch(x.s, p, kind);
        startDating(x.s, p, m, kind === 'noble' ? '정략결혼 (명문가)' : '정략결혼 (신흥 부유층)', true);
        p.bond = m.bond = 35 + int(x.s, 0, 20);
        hap(p, -8);
        aff(p, -6);
        if (kind === 'noble') {
          x.s.fame += 10;
          householder(x.s).cash -= 5000;
          addFlag(p, 'noble_inlaw');
        } else {
          householder(x.s).cash += 25000;
          x.s.fame = Math.max(0, x.s.fame - 3);
          addFlag(p, 'rich_inlaw');
        }
        queueNext(x.s, 'kid_wedding', p.id);
        return kind === 'noble'
          ? `${fullName(p)}이(가) 고개를 숙였다. 종가의 ${fullName(m)}와(과) 혼례를 올린다. 사돈댁 빚 5천만 원을 떠안았지만 가문 이름이 올라갔다. (명성 +10)`
          : `${fullName(p)}이(가) 마지못해 승낙했다. ${fullName(m)} 집안이 지참금과 투자금 2억 5천만 원을 보냈다. (명성 −3)`;
      },
    });
    return gate(c.s, [go('noble'), go('rich'), { label: '💕 자유연애를 존중한다', run: (x) => (aff(x.p, 8), hap(x.p, 4), `"고마워요." ${n(x)}이(가) 웃었다. 사랑은 스스로 찾게 두기로 했다.`) }]);
  },
};

export const AUTONOMY_ACTIONS: ActionDef[] = [
  {
    id: 'arrange_marriage',
    cat: '가족',
    icon: '🏯',
    name: '정략결혼 추진',
    desc: '미혼 자녀에게 명문가·부유층 혼처를 알아본다 · 자녀가 거역할 수도',
    ap: 1,
    targets: (s) => kids(s).filter((p) => !p.spouseId && age(s, p) >= 24),
    run: (s, t) => {
      s.events.unshift({ uid: s.eventSeq++, defId: 'arranged_offer', personId: t!.id });
      return `중매인에게 ${fullName(t!)}의 혼처를 알아봐 달라고 했다.`;
    },
  },
];

// ───────────────────────── 돌발 행동 ─────────────────────────

interface Act {
  id: string;
  title: string;
  ok: (s: GameState, p: Person, w: Will) => boolean;
  text: (c: Ctx) => string;
  choices: (c: Ctx) => Choice[];
}
const ACTS: Act[] = [
  {
    id: 'wf_elope',
    title: '🌙 야반도주',
    ok: (_s, p, w) => !!p.partnerId && !p.spouseId && w.indep >= 48 && w.loyalty < 62,
    text: (c) => `새벽, ${n(c)}의 방이 비어 있다. 책상 위 쪽지: "반대하셔도 저는 이 사람과 살 거예요." 애인 ${fullName(c.s.people[c.p.partnerId!])}와(과) 함께 사라졌다.`,
    choices: () => [
      { label: '받아들이고 결혼식을 열어준다', run: (x) => (queueNext(x.s, 'kid_wedding', x.p.id), aff(x.p, 15), '전화를 걸었다. "돌아와라. 결혼식은 제대로 하자." 수화기 너머로 울음이 터졌다.') },
      { label: '찾아가 설득한다', run: (x) => (check(x.s, x.s.people[x.s.headId].actual.cha, 55, 10) ? (aff(x.p, 5), '밤새 이야기했다. 1년만 더 지켜보기로 했다.') : (queueNext(x.s, 'kid_wedding', x.p.id), aff(x.p, -10), '"이미 늦었어요." 둘은 구청에 혼인신고를 했다.')) },
      { label: '의절을 선언한다', run: (x) => (addFlag(x.p, 'disowned'), aff(x.p, -60), queueNext(x.s, 'kid_wedding', x.p.id), `"다시는 이 집에 발 들이지 마라." ${n(x)}은(는) 연락을 끊었다.`) },
    ],
  },
  {
    id: 'wf_guarantee',
    title: '📝 몰래 선 빚보증',
    ok: (_s, p, w) => w.loyalty >= 20 && (hasTrait(p, 'social') || hasTrait(p, 'filial') || p.actual.mor >= 50) && p.cash < 30000,
    text: (c) => {
      c.ev.data ??= { debt: int(c.s, 3000, 15000) };
      return `빚쟁이가 집에 찾아왔다. ${n(c)}이(가) 친구 사업 대출에 몰래 보증을 섰는데, 친구가 잠적했다. 보증 빚 ${formatMoney(c.ev.data.debt)}.`;
    },
    choices: (c) =>
      gate(c.s, [
        { label: `대신 갚아준다 (${formatMoney(c.ev.data?.debt ?? 5000)})`, cost: c.ev.data?.debt ?? 5000, run: (x) => (aff(x.p, 15), '"다시는 보증 서지 마라." 등을 두드려 줬다. 아이는 고개를 들지 못했다.') },
        { label: '스스로 갚게 한다', run: (x) => ((x.p.cash -= x.ev.data.debt), hap(x.p, -12), (x.p.actual.mor = clamp(x.p.actual.mor + 2, 0, 100)), '몇 년을 허리띠를 졸라매며 갚아 나간다. 세상 공부를 비싸게 했다.') },
        { label: '변호사를 붙여 다툰다', cost: 500, run: (x) => (chance(x.s, 0.5) ? '보증 계약의 허점을 찾아 절반만 갚았다.' : ((x.p.cash -= x.ev.data.debt), '패소. 변호사비까지 날렸다.')) },
      ]),
  },
  {
    id: 'wf_startup',
    title: '🚀 "회사 그만두고 창업할래요"',
    ok: (_s, p, w) => w.ambition >= 54 && !['none', 'parttime', 'pension', 'founder'].includes(p.job),
    text: (c) => `${n(c)}이(가) 사업계획서를 식탁에 올렸다. "안정적인 직장 그만두고 제 회사를 차릴 거예요. 5천만 원만 투자해 주세요." 야망 ${willOf(c.p).ambition}.`,
    choices: (c) =>
      gate(c.s, [
        { label: '투자한다 (5천만)', cost: 5000, run: (x) => ((x.p.job = 'founder'), (x.p.jobLevel = 0), (x.p.jobYears = 0), (x.p.cash += 5000), aff(x.p, 12), hap(x.p, 10), `${n(x)}의 스타트업이 문을 열었다. 가문 첫 투자처다.`) },
        {
          label: '반대한다',
          run: (x) => {
            if (obeys(x.s, x.p)) return aff(x.p, -8), '"…알겠어요." 사업계획서는 서랍으로 들어갔다.';
            x.p.job = 'founder';
            x.p.jobLevel = 0;
            x.p.jobYears = 0;
            aff(x.p, -15);
            return `"제 인생이에요." ${n(x)}이(가) 사표를 내고 대출을 받아 창업했다.`;
          },
        },
      ]),
  },
  {
    id: 'wf_politics',
    title: '🗳 "정치를 하겠어요"',
    ok: (s, p, w) => w.ambition >= 58 && p.actual.cha >= 50 && age(s, p) >= 30 && p.job !== 'politician',
    text: (c) => `${n(c)}이(가) 폭탄선언을 했다. "다음 총선에 출마하겠습니다." 집안 사람들이 술렁인다. 정치는 돈과 명예를 한꺼번에 걸어야 한다.`,
    choices: () => [
      { label: '밀어준다', run: (x) => (queueNext(x.s, 'election', x.p.id), aff(x.p, 10), '온 가족이 선거 사무실을 차렸다.') },
      { label: '말린다', run: (x) => (obeys(x.s, x.p) ? (aff(x.p, -5), '"…아직 때가 아닌가 봐요."') : (queueNext(x.s, 'election', x.p.id), aff(x.p, -12), '"말려도 나갑니다." 혼자 공천을 신청했다.')) },
    ],
  },
  {
    id: 'wf_dream',
    title: '🎸 꿈을 좇아 퇴사',
    ok: (_s, p, w) => w.indep >= 50 && p.happiness < 62 && ['office', 'corp', 'public_corp', 'civil', 'banker', 'sales', 'factory'].includes(p.job),
    text: (c) => `${n(c)}이(가) 회사에 사표를 냈다고 한다. "이렇게 살다 죽긴 싫어요. 음악(글·영상)을 할 거예요."`,
    choices: () => [
      { label: '응원한다', run: (x) => ((x.p.job = pick(x.s, ['musician', 'youtuber', 'writer', 'painter'])), (x.p.jobLevel = 0), (x.p.jobYears = 0), hap(x.p, 15), aff(x.p, 10), '가난하지만 눈빛이 달라졌다.') },
      { label: '복직하라고 한다', run: (x) => (obeys(x.s, x.p) ? (hap(x.p, -8), '회사로 돌아갔다. 한숨이 늘었다.') : ((x.p.job = pick(x.s, ['musician', 'youtuber', 'writer'])), (x.p.jobLevel = 0), (x.p.jobYears = 0), aff(x.p, -12), '"이번엔 제 뜻대로 할게요."')) },
    ],
  },
  {
    id: 'wf_monk',
    title: '⛰ 출가 선언',
    ok: (s, p, w) => p.actual.mor >= 65 && w.indep >= 50 && !spouseOf(s, p) && age(s, p) >= 25,
    text: (c) => `${n(c)}이(가) 머리를 깎고 산사(수도원)로 들어가겠다고 한다. "세상의 욕심을 내려놓고 싶어요."`,
    choices: () => [
      { label: '보내 준다', run: (x) => ((x.p.job = 'clergy'), (x.p.jobLevel = 0), (x.p.jobYears = 0), addFlag(x.p, 'single_life'), (x.s.fame += 2), '고요한 산사에서 편지가 온다. 표정이 평온해 보인다.') },
      { label: '붙잡는다', run: (x) => (obeys(x.s, x.p) ? (hap(x.p, -6), '"조금만 더 세상에 있어 볼게요."') : ((x.p.job = 'clergy'), (x.p.jobLevel = 0), addFlag(x.p, 'single_life'), aff(x.p, -10), '새벽에 조용히 떠났다.')) },
    ],
  },
];

// 큐에 들어간 뒤 상황이 바뀌면 건너뛴다 (야반도주 전에 이미 헤어졌거나 결혼했다면)
const actDef = (a: Act): EventDef => ({ id: a.id, title: () => a.title, text: a.text, choices: (c) => a.choices(c), valid: (c) => alive(c.p) && (a.id !== 'wf_elope' || (!!c.p.partnerId && !!c.s.people[c.p.partnerId] && !c.p.spouseId)) });
export const AUTONOMY_EVENTS: EventDef[] = [arranged, ...ACTS.map(actDef)];

/** 해마다: 성향대로 움직이는 자식들 · 가끔 혼담이 들어온다 */
export function autonomyYear(s: GameState) {
  const seen = (s.storySeen ??= {});
  let n = 0;
  for (const p of kids(s)) {
    if (n >= 1) break;
    if ((seen['wf:' + p.id] ?? -99) > s.year - 4 || !chance(s, 0.35)) continue;
    const w = willOf(p);
    const pool = ACTS.filter((a) => a.ok(s, p, w));
    if (!pool.length) continue;
    const a = pick(s, pool);
    seen['wf:' + p.id] = s.year;
    s.events.push({ uid: s.eventSeq++, defId: a.id, personId: p.id });
    n++;
  }
  // 혼담: 가문이 이름이 있으면 중매가 먼저 들어온다
  if (s.fame >= 20 && chance(s, 0.18)) {
    const cands = kids(s).filter((p) => !p.spouseId && age(s, p) >= 26 && age(s, p) <= 38 && !hasFlag(p, 'single_life') && (seen['ao:' + p.id] ?? -99) <= s.year - 5);
    if (cands.length) {
      const p = pick(s, cands);
      seen['ao:' + p.id] = s.year;
      s.events.push({ uid: s.eventSeq++, defId: 'arranged_offer', personId: p.id });
    }
  }
}
