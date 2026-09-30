// 라이벌 가문: 같은 동네에서 대대로 엎치락뒤치락하는 집안.
// 해마다 저쪽 재산도 불어나거나 줄고, 가끔 두 집안이 부딪친다. 앙숙이 될 수도, 사돈이 될 수도 있다.

import { SURNAMES } from './data';
import { addAsset, addHolding, formatMoney } from './economy';
import { chance, int, next, normal, pick } from './rng';
import { gate, schedule, type Choice, type Ctx, type EventDef } from './ev-util';
import { unlock } from './achievements';
import { addFlag, age, alive, check, clamp, fullName, head, householder, isMainline, mark, randomName, spouseOf } from './people';
import { JOBS } from './data';
import { grant } from './rewards';
import type { ActionDef } from './actions';
import { buyPower } from './leverage';
import type { GameState, Person } from './types';

export interface Rival {
  name: string;
  /** 저쪽 가문 재산 (만원) */
  worth: number;
  fame: number;
  /** 0 = 남남, 100 = 원수 */
  feud: number;
  since: number;
  /** 사돈·동맹을 맺었다 */
  allied?: boolean;
  /** 망했다 (몇 년 뒤 재기할 수도) */
  fallen?: number;
  /** 저쪽 대표 인물 이름 (세대가 바뀌면 바뀐다) */
  boss: string;
  bossBorn: number;
  /** 우리보다 앞섰던 적이 있는가 → 추월하면 업적 */
  passed?: boolean;
  /** 자극받은 정도 (우리가 앞설수록 독기를 품는다) */
  drive?: number;
  /** 우리가 연속으로 앞선 햇수 */
  lead?: number;
  /** 올해 저쪽이 한 일 (화면 표시용) */
  move?: string;
}

const rv = (s: GameState) => s.rival!;
const R = (s: GameState) => rv(s).name + '씨 가문';
const boss = (s: GameState) => rv(s).boss;

export function initRival(s: GameState, ourWorth: number) {
  const name = pick(s, SURNAMES.filter((n) => n !== s.familyName));
  const h = head(s);
  const born = h.birthYear + int(s, -3, 3);
  s.rival = {
    name,
    worth: Math.round(Math.max(20000, ourWorth * (1.2 + 0.5 * next(s)))),
    fame: Math.round(s.fame * 1.2 + 8),
    feud: 30,
    since: s.year,
    boss: name + randomName(s, chance(s, 0.5) ? 'M' : 'F', born),
    bossBorn: born,
  };
}

export function rivalMood(r: Rival): string {
  if (r.fallen) return '몰락';
  if (r.allied) return '사돈·동맹';
  if (r.feud >= 75) return '철천지원수';
  if (r.feud >= 50) return '앙숙';
  if (r.feud >= 25) return '경쟁';
  return '데면데면';
}

/** 해마다: 저쪽 형편 변화 + 가끔 부딪치는 사건 */
export function rivalYear(s: GameState, ourWorth: number): string[] {
  const msgs: string[] = [];
  const h = head(s);
  if (!s.rival) {
    if (age(s, h) < 20) return msgs;
    initRival(s, ourWorth);
    s.events.push({ uid: s.eventSeq++, defId: 'rv_intro', personId: h.id });
    return msgs;
  }
  const r = s.rival;
  // 세대교체: 저쪽 대표가 늙으면 자식이 물려받는다
  if (s.year - r.bossBorn >= 78 && chance(s, 0.25)) {
    const old = r.boss;
    r.bossBorn = s.year - int(s, 40, 52);
    r.boss = r.name + randomName(s, chance(s, 0.5) ? 'M' : 'F', r.bossBorn);
    r.feud = Math.round(r.feud * 0.6);
    msgs.push(`🕯 ${R(s)} ${old} 회장 별세. 이제 ${r.boss}이(가) 집안을 이끈다.`);
  }
  if (r.fallen) {
    if (s.year - r.fallen >= 8 && chance(s, 0.2)) {
      r.fallen = undefined;
      r.worth = Math.max(r.worth, 30000);
      msgs.push(`🔥 ${R(s)}이(가) 재기했다. 다시 우리를 따라잡겠다고 한다.`);
    }
    return msgs;
  }
  const mc = s.marketChange;
  // 우리가 앞서면 저쪽은 독기를 품고 더 공격적으로 불린다 (고무줄 경쟁)
  const ratio = ourWorth / Math.max(1, r.worth);
  r.drive = clamp((r.drive ?? 0) * 0.85 + (ratio > 1 ? Math.min(0.03, (ratio - 1) * 0.02) : 0), 0, 0.06);
  // 앞서면 쫓아오고, 너무 앞서 나가면 저쪽도 돈을 쓰고 방심한다: 늘 비등한 승부가 되게
  const chase = ratio > 1 ? Math.min(0.15, 0.03 + (ratio - 1) * 0.05) : -Math.min(0.09, (1 / Math.max(ratio, 0.05) - 1) * 0.02);
  // 세 배 넘게 벌어지면 저쪽이 총력전(또는 크게 헤프게 쓴다)
  const burst = ratio > 3 ? 0.18 : ratio < 1 / 3 ? -0.1 : 0;
  const g = normal(s, 0.05 + chase + r.drive + burst, 0.09) + 0.45 * (mc.apt_seoul ?? 0) + 0.25 * (mc.stock ?? 0);
  r.worth = Math.max(3000, Math.round(r.worth * (1 + clamp(g, -0.35, 0.8))));
  // 명성도 우리를 쫓아온다
  r.fame = Math.max(0, Math.round((r.fame + normal(s, 0.8, 1.2) + (s.fame > r.fame ? (s.fame - r.fame) * 0.12 : 0)) * 10) / 10);
  r.feud = clamp(r.feud + (r.allied ? -2 : 0.5), 0, 100);
  if (ourWorth < r.worth) {
    if ((r.lead ?? 0) >= 3) msgs.push(`😱 ${R(s)}에게 역전당했다! 저쪽 재산 ${formatMoney(r.worth)}. 동네에서 "역시 ${r.name}씨네"라는 말이 돈다.`);
    r.passed = false;
    r.lead = 0;
  } else {
    r.lead = (r.lead ?? 0) + 1;
    if (r.passed === false) {
      r.passed = true;
      unlock(s, 'rival_passed');
      msgs.push(`🏁 드디어 ${R(s)}의 재산을 넘어섰다! 동네 사람들이 수군댄다.`);
    }
    if (r.lead === 5) grant(s, '⚔️', `라이벌 5년 연속 제압`, `${R(s)}을(를) 5년째 앞서고 있다. 저쪽이 독기를 품었다는 소문이다.`, 'rare');
    if (r.lead === 15) grant(s, '👑', `동네의 패자`, `${R(s)}을(를) 15년째 앞섰다. 이 동네에서 ${s.familyName}씨 가문을 모르는 사람이 없다.`, 'epic');
  }
  // 저쪽의 올해 한 수 (우리에게 영향을 준다)
  r.move = undefined;
  if (age(s, h) >= 20 && chance(s, 0.6)) {
    const mv = rivalMove(s, ourWorth);
    if (mv) {
      r.move = mv;
      msgs.push(`⚔️ ${mv}`);
    }
  }
  if (age(s, h) < 20) return msgs;
  // 부딪치는 사건: 2년에 한 번꼴
  const last = s.storySeen?.['rival:last'] ?? 0;
  if (s.year - last < 2 || !chance(s, 0.3 + r.feud / 400)) return msgs;
  const ctxFor = (p: Person): Ctx => ({ s, p, ev: { uid: 0, defId: '', personId: p.id } });
  const pool: [RivalDef, Person, number][] = [];
  const members = Object.values(s.people).filter((p) => alive(p) && !p.inLaw);
  for (const d of RIVAL_RANDOM) {
    if ((s.storySeen?.['rv:' + d.id] ?? -99) > s.year - (d.cooldown ?? 10)) continue;
    for (const p of d.who === 'head' ? [h] : members) {
      const w = d.weight(ctxFor(p));
      if (w > 0) pool.push([d, p, w]);
    }
  }
  const total = pool.reduce((t, [, , w]) => t + w, 0);
  if (!total) return msgs;
  let x = next(s) * total;
  const hit = pool.find(([, , w]) => (x -= w) <= 0) ?? pool[pool.length - 1];
  (s.storySeen ??= {})['rival:last'] = s.year;
  s.storySeen['rv:' + hit[0].id] = s.year;
  s.events.push({ uid: s.eventSeq++, defId: hit[0].id, personId: hit[1].id });
  return msgs;
}

interface RivalDef extends EventDef {
  who?: 'head' | 'any';
  cooldown?: number;
  weight: (c: Ctx) => number;
}

const feud = (s: GameState, d: number) => (rv(s).feud = clamp(rv(s).feud + d, 0, 100));
const rich = (s: GameState) => rv(s).worth;
const kid = (s: GameState) => rv(s).name + randomName(s, chance(s, 0.5) ? 'M' : 'F', rv(s).bossBorn + 30);
const ok = (s: GameState) => !!s.rival && !rv(s).fallen;
const hostile = (s: GameState) => ok(s) && !rv(s).allied;
const choices = (c: Ctx, list: (Choice | false | undefined)[]) => gate(c.s, list.filter((x): x is Choice => !!x));
const n = (c: Ctx) => fullName(c.p);

const intro: EventDef = {
  id: 'rv_intro',
  title: (c) => `라이벌 가문: ${R(c.s)}`,
  text: (c) =>
    `같은 동네에 오래 산 ${R(c.s)}. 부모님 대부터 뭐든 비교당했다.\n"${boss(c.s)}네는 이번에 건물 샀다더라."\n\n저쪽 재산은 대략 ${formatMoney(rich(c.s))}. 앞으로 두 집안은 자꾸 부딪칠 것이다.`,
  choices: () => [
    { label: '언젠가 저 집을 넘어선다', run: (x) => (feud(x.s, 15), (x.p.actual.mor = clamp(x.p.actual.mor + 1, 0, 100)), `${n(x)}의 가슴에 불이 붙었다. 목표가 생겼다.`) },
    { label: '비교는 됐고, 우리 식대로 산다', run: (x) => (feud(x.s, -10), (x.p.happiness = clamp(x.p.happiness + 4, 0, 100)), '남의 집 사정은 남의 집 사정. 마음이 편하다.') },
    { label: '먼저 인사하러 간다', run: (x) => (feud(x.s, -20), `과일 바구니를 들고 갔다. ${boss(x.s)}이(가) 어색하게 웃으며 문을 열었다.`) },
  ],
};

const RIVAL_RANDOM: RivalDef[] = [
  {
    id: 'rv_reunion',
    who: 'head',
    title: () => '동창회의 자랑 배틀',
    weight: (c) => (hostile(c.s) && age(c.s, c.p) >= 30 ? 1 : 0),
    text: (c) => `동창회에 ${boss(c.s)}이(가) 외제차를 타고 나타났다. "요즘 뭐 하고 지내? 우리 애는 이번에 의대 붙었어."\n모두의 눈이 ${n(c)}에게 쏠린다.`,
    choices: (c) =>
      choices(c, [
        { label: '우리 집 자랑으로 맞받아친다', run: (x) => (check(x.s, x.p.actual.cha, 50, 10) ? (feud(x.s, 8), (x.s.fame += 1), '말발로 판을 뒤집었다. 동창들이 박수를 쳤다. 저쪽 얼굴이 벌게졌다.') : (feud(x.s, 5), (x.p.happiness = clamp(x.p.happiness - 5, 0, 100)), '자랑하다 말이 꼬였다. 집에 오는 길이 길었다.')) },
        { label: '한턱 쏜다 (200만)', cost: 200, run: (x) => (feud(x.s, 4), (x.s.fame += 1.5), '"오늘은 내가 산다!" 2차까지 계산했다. 동창 단톡방에 이름이 오르내린다.') },
        { label: '웃고 넘긴다', run: (x) => ((x.p.happiness = clamp(x.p.happiness + 2, 0, 100)), feud(x.s, -5), '"잘됐네, 축하해." 진심인지는 본인만 안다.') },
      ]),
  },
  {
    id: 'rv_auction',
    who: 'head',
    cooldown: 12,
    title: () => '같은 매물, 두 집안',
    weight: (c) => (hostile(c.s) && buyPower(c.s) >= c.s.market.building * 0.6 ? 0.9 : 0),
    text: (c) => {
      const v = Math.round(c.s.market.building * 0.8);
      c.ev.data ??= { v };
      return `역세권 꼬마빌딩이 경매에 나왔다. 감정가 ${formatMoney(c.ev.data.v)}.\n그런데 입찰장에 ${boss(c.s)}도 와 있다. 눈이 마주쳤다.`;
    },
    choices: (c) => {
      const v: number = c.ev.data?.v ?? Math.round(c.s.market.building * 0.8);
      const bp = buyPower(c.s);
      const bid = (mult: number, p: number): Choice => ({
        label: `감정가 ${Math.round(mult * 100)}%로 입찰 (${formatMoney(Math.round(v * mult))})`,
        disabled: bp < v * mult,
        req: bp < v * mult ? ['돈이 모자란다'] : undefined,
        run: (x) => {
          if (!chance(x.s, p)) return feud(x.s, 6), `${boss(x.s)}이(가) 1,000만 원 더 써서 가져갔다. 입찰장을 나서는 뒷모습이 얄밉다.`;
          const cost = Math.round(v * mult);
          householder(x.s).cash -= cost;
          addAsset(x.s, 'building', householder(x.s).id, v, '역세권 꼬마빌딩');
          feud(x.s, 12);
          return `낙찰! ${formatMoney(cost)}에 빌딩을 손에 넣었다. ${boss(x.s)}이(가) 입술을 깨물었다.`;
        },
      });
      return choices(c, [
        bid(0.85, 0.3),
        bid(1.0, 0.6),
        bid(1.15, 0.9),
        { label: '공동 투자를 제안한다', disabled: bp < v * 0.5, req: bp < v * 0.5 ? ['돈이 모자란다'] : undefined, run: (x) => {
          if (!check(x.s, x.p.actual.cha, 55, 10)) return feud(x.s, 4), '"당신이랑? 됐어요." 문전박대.';
          householder(x.s).cash -= Math.round(v * 0.5);
          addAsset(x.s, 'building', householder(x.s).id, Math.round(v * 0.5), `꼬마빌딩 지분 50% (${rv(x.s).name}씨 공동)`);
          feud(x.s, -25);
          return '뜻밖에 손을 잡았다. 반반씩 투자했다. 동네가 놀랐다.';
        } },
        { label: '포기한다', run: () => '괜히 무리하지 않기로 했다.' },
      ]);
    },
  },
  {
    id: 'rv_classmate',
    title: () => '전교 1등 다툼',
    weight: (c) => (ok(c.s) && age(c.s, c.p) >= 12 && age(c.s, c.p) <= 18 ? 1.2 : 0),
    text: (c) => {
      c.ev.data ??= { k: kid(c.s) };
      return `${n(c)}와(과) ${R(c.s)}의 ${c.ev.data.k}, 둘이 같은 반이 됐다. 전교 1등을 두고 매번 1~2점 차이다.\n엄마들 모임에서도 은근한 신경전이 오간다.`;
    },
    choices: (c) =>
      choices(c, [
        { label: '1:1 과외를 붙인다 (600만)', cost: 600, run: (x) => (check(x.s, x.p.actual.int, 55, 12) ? ((x.p.study = clamp((x.p.study ?? 40) + 8, 0, 100)), (x.p.actual.int = clamp(x.p.actual.int + 2, 0, 100)), feud(x.s, 5), `기말고사 전교 1등! ${x.ev.data.k}은(는) 2등이었다.`) : ((x.p.happiness = clamp(x.p.happiness - 6, 0, 100)), `이번에도 2등. ${x.ev.data.k}이(가) 웃으며 지나갔다.`)) },
        { label: '"걔랑 비교하지 마"', run: (x) => ((x.p.happiness = clamp(x.p.happiness + 6, 0, 100)), (x.p.affinity = clamp(x.p.affinity + 4, -100, 100)), `${n(x)}의 어깨가 가벼워졌다. 공부가 오히려 즐거워졌다.`) },
        { label: '친구가 되어 보라고 한다', run: (x) => (check(x.s, x.p.actual.cha, 40, 10) ? (feud(x.s, -12), (x.p.actual.cha = clamp(x.p.actual.cha + 2, 0, 100)), `둘이 스터디 짝꿍이 됐다. 같이 1, 2등을 나눠 가진다.`) : `"걔는 재수 없어." 설득에 실패했다.`) },
      ]),
  },
  {
    id: 'rv_romance',
    cooldown: 30,
    title: () => '원수 집안의 연인',
    weight: (c) => (hostile(c.s) && age(c.s, c.p) >= 22 && age(c.s, c.p) <= 34 && !spouseOf(c.s, c.p) && !c.p.partnerId && c.p.id !== c.s.headId ? 0.8 : 0),
    text: (c) => {
      c.ev.data ??= { k: kid(c.s) };
      return `${n(c)}이(가) 사귀는 사람이 있다며 사진을 보여줬다.\n…${R(c.s)}의 ${c.ev.data.k}이다. 두 사람은 진지하다.`;
    },
    choices: (c) =>
      choices(c, [
        { label: '결사반대', run: (x) => ((x.p.affinity = clamp(x.p.affinity - 15, -100, 100)), (x.p.happiness = clamp(x.p.happiness - 12, 0, 100)), feud(x.s, 10), addFlag(x.p, 'grievance'), `"아빠(엄마)가 뭔데!" ${n(x)}이(가) 문을 쾅 닫았다. 두 사람은 몰래 만난다고 한다.`) },
        { label: '저쪽 집안과 담판을 짓는다', run: (x) => (schedule(x.s, int(x.s, 1, 3), 'rv_union', x.p.id, { k: x.ev.data.k }), feud(x.s, -10), `${boss(x.s)}와(과) 마주 앉았다. 긴 침묵 끝에, "애들이 좋다는데…" 누가 먼저랄 것도 없이 한숨을 쉬었다.`) },
        { label: '둘을 믿는다', run: (x) => ((x.p.affinity = clamp(x.p.affinity + 8, -100, 100)), (x.p.happiness = clamp(x.p.happiness + 10, 0, 100)), schedule(x.s, int(x.s, 1, 3), 'rv_union', x.p.id, { k: x.ev.data.k }), `${n(x)}이(가) 울면서 안겼다.`) },
      ]),
  },
  {
    id: 'rv_lawsuit',
    who: 'head',
    title: () => '경계선 분쟁',
    weight: (c) => (hostile(c.s) && rv(c.s).feud >= 40 && age(c.s, c.p) >= 35 ? 0.9 : 0),
    text: (c) => `${R(c.s)}이(가) 우리 땅 경계가 1.5m 넘어왔다며 소송을 걸었다. 측량 기사는 애매하다고 한다.\n${boss(c.s)}: "법대로 합시다."`,
    choices: (c) =>
      choices(c, [
        { label: '대형 로펌을 쓴다 (1,500만)', cost: 1500, run: (x) => (chance(x.s, 0.65) ? ((householder(x.s).cash += 4000), feud(x.s, 15), '완승! 소송비용에 손해배상까지 받아냈다.') : (feud(x.s, 10), '패소. 담장을 1.5m 옮겼다. 분하다.')) },
        { label: '직접 증거를 모은다', run: (x) => (check(x.s, x.p.actual.int, 55, 12) ? (feud(x.s, 8), (x.p.actual.int = clamp(x.p.actual.int + 1, 0, 100)), '1970년대 지적도를 찾아냈다! 소송이 취하됐다.') : ((householder(x.s).cash -= 1500), feud(x.s, 6), '증거가 부족했다. 합의금으로 1,500만 원을 물었다.')) },
        { label: '막걸리 들고 찾아간다', run: (x) => (check(x.s, x.p.actual.cha, 50, 12) ? (feud(x.s, -25), '"어릴 땐 같이 멱 감던 사이 아니오." 소송이 취하됐다. 담장은 그대로.') : (feud(x.s, 5), '문전박대. 막걸리는 둘이 마셨다… 우리 부부가.')) },
      ]),
  },
  {
    id: 'rv_boss',
    title: () => '회사에 온 라이벌',
    weight: (c) => (hostile(c.s) && age(c.s, c.p) >= 28 && age(c.s, c.p) <= 55 && !['none', 'parttime', 'pension', 'founder'].includes(c.p.job) && !c.p.flags.includes('student') ? 0.7 : 0),
    text: (c) => {
      c.ev.data ??= { k: kid(c.s) };
      return `새로 온 팀장이 ${R(c.s)}의 ${c.ev.data.k}이다. 첫 회의에서 ${n(c)}의 보고서를 대놓고 깎아내렸다.\n승진 심사가 코앞이다.`;
    },
    choices: (c) =>
      choices(c, [
        { label: '실력으로 보여준다', run: (x) => (check(x.s, x.p.actual.int, 55, 12) ? ((x.p.jobLevel += 1), feud(x.s, 6), '분기 실적 1위. 팀장을 건너뛰고 본부장이 직접 승진시켰다!') : ((x.p.happiness = clamp(x.p.happiness - 8, 0, 100)), '밤을 새웠지만 이번엔 밀렸다.')) },
        { label: '인사팀에 부당함을 알린다', run: (x) => (check(x.s, x.p.actual.mor, 45, 12) ? (feud(x.s, 10), '감사 결과 팀장이 교체됐다. 사내에서 조용히 영웅이 됐다.') : ((x.p.happiness = clamp(x.p.happiness - 10, 0, 100)), '"개인 감정 아니에요?" 오히려 찍혔다.')) },
        { label: '이직을 알아본다', run: (x) => ((x.p.happiness = clamp(x.p.happiness + 2, 0, 100)), `이력서를 업데이트했다. 올해 '이직' 행동이 눈에 들어온다.`) },
        { label: '술 한잔하며 푼다', run: (x) => (check(x.s, x.p.actual.cha, 50, 10) ? (feud(x.s, -15), (x.p.actual.cha = clamp(x.p.actual.cha + 1, 0, 100)), '"집안 일이랑 회사 일은 별개죠." 형님 동생 사이가 됐다.') : '어색한 침묵만 흘렀다.') },
      ]),
  },
  {
    id: 'rv_crisis',
    who: 'head',
    cooldown: 25,
    title: () => '라이벌의 몰락',
    weight: (c) => (ok(c.s) && age(c.s, c.p) >= 35 && buyPower(c.s) >= 3000 ? 0.5 : 0),
    text: (c) => `${R(c.s)}이(가) 사업 실패로 부도 위기다. ${boss(c.s)}이(가) 밤늦게 찾아왔다.\n"…염치없지만, 3억만 빌려줄 수 있겠소."`,
    choices: (c) =>
      choices(c, [
        { label: '빌려준다 (3억)', cost: 30000, run: (x) => {
          if (chance(x.s, 0.7)) {
            schedule(x.s, int(x.s, 3, 6), 'rv_repay', x.p.id);
            rv(x.s).allied = true;
            feud(x.s, -60);
            unlock(x.s, 'rival_allied');
            return `${boss(x.s)}이(가) 무릎을 꿇었다. "이 은혜는 대대로 잊지 않겠소." 두 집안의 앙금이 녹았다.`;
          }
          rv(x.s).fallen = x.s.year;
          rv(x.s).worth = Math.round(rv(x.s).worth * 0.1);
          return '끝내 부도가 났다. 빌려준 돈은 채권단에 묶였다. 그래도 사람은 남았다.';
        } },
        { label: '담보로 건물 지분을 받고 빌려준다 (3억)', cost: 30000, run: (x) => {
          addAsset(x.s, 'building', householder(x.s).id, 38000, `${rv(x.s).name}씨 빌딩 지분`);
          feud(x.s, 5);
          rv(x.s).worth = Math.round(rv(x.s).worth * 0.6);
          return '냉정하게 계약서를 썼다. 저쪽 빌딩 지분이 우리 손에 들어왔다.';
        } },
        { label: '거절한다', run: (x) => {
          rv(x.s).fallen = x.s.year;
          rv(x.s).worth = Math.round(rv(x.s).worth * 0.1);
          unlock(x.s, 'rival_fallen');
          return `${R(x.s)}은(는) 결국 무너졌다. 동네에서 그 집 이야기가 사라졌다. 이긴 건데, 기분이 이상하다.`;
        } },
      ]),
  },
  {
    id: 'rv_election',
    who: 'head',
    cooldown: 12,
    title: () => '동대표 선거',
    weight: (c) => (hostile(c.s) && age(c.s, c.p) >= 40 ? 0.6 : 0),
    text: (c) => `아파트 입주자대표 회장 선거. 상대 후보가 ${boss(c.s)}이다. 관리비 비리 의혹, 재건축 추진이 쟁점이다.`,
    choices: (c) =>
      choices(c, [
        { label: '재건축 추진을 공약한다', run: (x) => (check(x.s, x.p.actual.cha, 55, 12) ? ((x.s.fame += 3), feud(x.s, 10), addFlag(x.p, 'apt_rep'), '당선! 단지 현수막에 이름이 걸렸다.') : (feud(x.s, 6), (x.p.happiness = clamp(x.p.happiness - 6, 0, 100)), '17표 차이 낙선. 엘리베이터에서 마주치기 싫다.')) },
        { label: '관리비 비리를 파헤친다', run: (x) => (check(x.s, x.p.actual.int, 55, 12) ? ((x.s.fame += 4), (x.p.actual.mor = clamp(x.p.actual.mor + 2, 0, 100)), feud(x.s, 15), '회계 장부에서 3천만 원 횡령을 찾아냈다. 압도적 당선!') : ((x.s.fame -= 1), '근거 없는 폭로라며 역풍을 맞았다.')) },
        { label: '출마를 양보한다', run: (x) => (feud(x.s, -12), `${boss(x.s)}이(가) 당선됐다. 떡을 돌리러 우리 집에도 왔다.`) },
      ]),
  },
  {
    id: 'rv_holiday',
    title: () => '명절의 비교',
    weight: (c) => (ok(c.s) && age(c.s, c.p) >= 25 && age(c.s, c.p) <= 45 && c.p.id !== c.s.headId ? 0.6 : 0),
    text: (c) => `명절 친척 모임. 큰고모가 한마디 한다. "${R(c.s)}네 애는 이번에 대기업 임원 됐다더라. ${n(c)}은(는) 요즘 뭐 하니?"`,
    choices: (c) =>
      choices(c, [
        { label: '"저는 제 속도대로 가요"', run: (x) => ((x.p.actual.mor = clamp(x.p.actual.mor + 1, 0, 100)), (x.p.happiness = clamp(x.p.happiness + 2, 0, 100)), '큰고모가 머쓱해졌다. 사촌 동생이 엄지를 들어 보였다.') },
        { label: '용돈 봉투로 입을 막는다 (50만)', cost: 50, run: (x) => ((x.p.happiness = clamp(x.p.happiness + 1, 0, 100)), '"아이고 우리 조카!" 화제가 바뀌었다.') },
        { label: '상처받는다', run: (x) => ((x.p.happiness = clamp(x.p.happiness - 8, 0, 100)), feud(x.s, 3), '집에 오는 차 안에서 한마디도 안 했다.') },
      ]),
  },
  {
    id: 'rv_tv',
    who: 'head',
    cooldown: 14,
    title: () => '라이벌, TV에 나오다',
    weight: (c) => (hostile(c.s) && rv(c.s).fame > c.s.fame ? 0.6 : 0),
    text: (c) => `${boss(c.s)}이(가) "성공한 가문의 비결" 다큐멘터리에 나왔다. 동네 식당마다 그 방송이 틀어져 있다.`,
    choices: (c) =>
      choices(c, [
        { label: '우리도 방송국에 연락한다', run: (x) => (check(x.s, x.p.actual.cha, 55, 12) ? ((x.s.fame += 4), feud(x.s, 6), '"대를 이은 가문" 편에 출연 확정! 시청률이 저쪽보다 높았다.') : ((x.p.happiness = clamp(x.p.happiness - 4, 0, 100)), '"아직 저희 기획과는 안 맞네요." 거절당했다.')) },
        { label: '장학금을 만든다 (2,000만)', cost: 2000, run: (x) => ((x.s.fame += 3), (x.p.actual.mor = clamp(x.p.actual.mor + 2, 0, 100)), '가문 이름을 건 장학금. 지역 신문 1면에 났다.') },
        { label: 'TV를 끈다', run: (x) => ((x.p.happiness = clamp(x.p.happiness + 1, 0, 100)), '남의 집 방송 보며 속 끓일 필요 없다.') },
      ]),
  },
  {
    id: 'rv_invest_tip',
    who: 'head',
    cooldown: 12,
    title: () => '라이벌의 투자 정보',
    weight: (c) => (ok(c.s) && age(c.s, c.p) >= 30 && buyPower(c.s) >= 2000 ? 0.6 : 0),
    text: (c) => `${R(c.s)} 쪽에서 흘러나온 소문. "${boss(c.s)}이(가) 바이오 주식에 전 재산을 넣었다더라." 따라 할까?`,
    choices: (c) => {
      const amt = Math.min(Math.round(buyPower(c.s) * 0.3), 20000);
      return choices(c, [
        { label: `따라 산다 (${formatMoney(amt)})`, cost: amt, run: (x) => {
          const win = rv(x.s).allied ? chance(x.s, 0.7) : chance(x.s, 0.4);
          addHolding(x.s, 'stock', householder(x.s).id, Math.round(amt * (win ? 2.2 : 0.35)));
          if (!win) feud(x.s, 8);
          return win ? '임상 3상 통과! 상한가 다섯 번. 투자금이 두 배가 넘었다.' : rv(x.s).allied ? '이번엔 저쪽도 같이 물렸다. 사돈끼리 소주를 기울였다.' : '…역정보였다. 저쪽은 이미 팔고 나간 뒤였다.';
        } },
        { label: '반대로 간다', run: (x) => ((x.p.actual.int = clamp(x.p.actual.int + 1, 0, 100)), '냉정하게 지켜보기로 했다. 결과는 몰라도 마음은 편하다.') },
      ]);
    },
  },
  {
    id: 'rv_gift',
    who: 'head',
    cooldown: 10,
    title: () => '저쪽에서 온 선물',
    weight: (c) => (ok(c.s) && (rv(c.s).allied || rv(c.s).feud < 25) ? 0.8 : 0),
    text: (c) => `${boss(c.s)}이(가) 명절 선물로 한우 세트와 손편지를 보냈다. "요즘 두 집안이 사이좋게 지내니 동네가 다 화목합니다."`,
    choices: (c) =>
      choices(c, [
        { label: '두 가문 합동 잔치를 연다 (500만)', cost: 500, run: (x) => ((x.s.fame += 2), (x.p.happiness = clamp(x.p.happiness + 8, 0, 100)), feud(x.s, -10), '동네 사람 200명이 모였다. 두 집안 어른들이 함께 건배했다.') },
        { label: '답례품을 보낸다', cost: 100, run: (x) => (feud(x.s, -5), '정성껏 답례했다. 오가는 정이 쌓인다.') },
        { label: '공동 사업을 제안한다', run: (x) => (check(x.s, x.p.actual.int, 50, 12) ? ((householder(x.s).cash += 5000), feud(x.s, -8), '두 집안이 합작한 카페 체인이 대박! 배당금 5천만 원.') : ((householder(x.s).cash -= 1500), '사업은 접었지만 우정은 남았다. 손실 1,500만 원.')) },
      ]),
  },
];

const union: EventDef = {
  id: 'rv_union',
  title: () => '두 집안의 화해',
  valid: (c) => alive(c.p) && !!c.s.rival,
  text: (c) => `${n(c)}와(과) ${c.ev.data?.k ?? '저쪽 자식'}의 사랑이 두 집안을 움직였다.\n${boss(c.s)}이(가) 먼저 손을 내밀었다. "이제 그만 싸웁시다. 애들 보기 부끄럽소."`,
  choices: () => [
    { label: '손을 맞잡는다', run: (x) => {
      rv(x.s).allied = true;
      feud(x.s, -80);
      x.s.fame += 3;
      x.p.happiness = clamp(x.p.happiness + 12, 0, 100);
      unlock(x.s, 'rival_allied');
      return '수십 년 앙금이 녹았다. 동네 사람들이 "로미오와 줄리엣이 해냈다"며 웃었다.';
    } },
    { label: '"아직은 이르다"', run: (x) => ((x.p.affinity = clamp(x.p.affinity - 8, -100, 100)), feud(x.s, 5), '어색한 악수만 오갔다. 두 사람은 계속 만난다.') },
  ],
};

const repay: EventDef = {
  id: 'rv_repay',
  title: () => '은혜 갚은 라이벌',
  valid: (c) => !!c.s.rival,
  text: (c) => `${R(c.s)}이(가) 재기에 성공했다. ${boss(c.s)}이(가) 빌린 돈에 이자를 두둑이 얹어 들고 왔다.`,
  choices: () => [
    { label: '받는다', run: (x) => ((householder(x.s).cash += 45000), (x.s.fame += 2), '3억이 4억 5천이 되어 돌아왔다. "그때 아니었으면 우리 집안은 끝났소."') },
    { label: '원금만 받는다', run: (x) => ((householder(x.s).cash += 30000), (x.s.fame += 4), (x.p.actual.mor = clamp(x.p.actual.mor + 3, 0, 100)), '"이자는 됐소." 소문이 퍼져 가문의 이름이 높아졌다.') },
  ],
};

// ───────────────────────── 라이벌의 한 수 ─────────────────────────

interface Move {
  w: (s: GameState, ours: number) => number;
  run: (s: GameState, ours: number) => string;
}
const mainAdults = (s: GameState) => Object.values(s.people).filter((p) => alive(p) && !p.inLaw && isMainline(s, p) && age(s, p) >= 20);
const HOSTILE: Move[] = [
  { // 매물 선점
    w: (s) => ((s.listings ?? []).length ? 1 : 0),
    run: (s) => {
      const ls = s.listings!;
      const i = Math.floor(next(s) * ls.length);
      const l = ls.splice(i, 1)[0];
      rv(s).worth += Math.round(l.price * 0.4);
      return `${R(s)}이(가) 올해 매물 "${l.name}"을(를) 먼저 계약해 버렸다. (${formatMoney(l.price)})`;
    },
  },
  { // 헛소문
    w: (s) => (rv(s).feud >= 40 ? 1 : 0.4),
    run: (s) => {
      const d = s.fame >= 80 && chance(s, 0.5) ? 0 : int(s, 2, 5);
      s.fame = Math.max(0, s.fame - d);
      return d ? `${R(s)} 쪽에서 우리 집안에 대한 헛소문을 퍼뜨렸다. 명성 -${d}` : `${R(s)}의 헛소문이 돌았지만, 우리 가문의 이름값에 묻혔다.`;
    },
  },
  { // 가게 옆에 가게
    w: (s) => (mainAdults(s).some((p) => ['biz', 'service'].includes(JOBS[p.job]?.cat) && JOBS[p.job].kind === 'business') ? 1.2 : 0),
    run: (s) => {
      const p = mainAdults(s).find((q) => ['biz', 'service'].includes(JOBS[q.job]?.cat) && JOBS[q.job].kind === 'business')!;
      const loss = Math.round(Math.max(300, Math.abs(p.cash) * 0.05 + 600));
      p.cash -= loss;
      p.happiness = clamp(p.happiness - 5, 0, 100);
      return `${R(s)}이(가) ${fullName(p)}의 ${JOBS[p.job].name.replace(' 사장', '').replace(' 대표', '')} 바로 옆에 더 큰 가게를 냈다. 손님이 빠졌다. (-${formatMoney(loss)})`;
    },
  },
  { // 스카우트
    w: (s) => (mainAdults(s).some((p) => JOBS[p.job]?.kind === 'salary' && p.id !== s.headId) ? 0.7 : 0),
    run: (s) => {
      const p = pick(s, mainAdults(s).filter((q) => JOBS[q.job]?.kind === 'salary' && q.id !== s.headId));
      if (chance(s, 0.5)) {
        p.jobLevel = Math.min(JOBS[p.job].maxLevel, p.jobLevel + 1);
        p.affinity = clamp(p.affinity - 10, -100, 100);
        rv(s).feud = clamp(rv(s).feud - 5, 0, 100);
        return `${R(s)} 계열사가 ${fullName(p)}을(를) 한 직급 높여 스카우트했다. 본인은 신났지만 집안 어른들은 서운하다.`;
      }
      return `${R(s)}이(가) ${fullName(p)}에게 스카우트 제의를 했다. "우리 집안 사람이 거길 왜 가!" 거절했다.`;
    },
  },
  { // 선거에서 상대를 민다
    w: (s) => (mainAdults(s).some((p) => ['politician', 'president'].includes(p.job)) ? 1.5 : 0),
    run: (s) => {
      const p = mainAdults(s).find((q) => ['politician', 'president'].includes(q.job))!;
      const pl = (p.pol ??= { approval: 45, fund: 0, slush: 0, heat: 0 });
      pl.approval = Math.max(5, pl.approval - 6);
      return `${R(s)}이(가) ${fullName(p)}의 정적에게 거액을 후원했다. 지지율 -6%`;
    },
  },
  { // 자랑
    w: () => 0.8,
    run: (s) => {
      rv(s).fame += 3;
      const kids = Object.values(s.people).filter((p) => alive(p) && isMainline(s, p) && age(s, p) >= 10 && age(s, p) <= 25);
      for (const k of kids) k.happiness = clamp(k.happiness - 3, 0, 100);
      return `${R(s)} 자녀가 ${pick(s, ['서울대 의대에 수석 합격', '국가대표에 발탁', '대기업 최연소 임원이 됐다', '사법시험 수석을 했다', '해외 명문대 장학생이 됐다'])}. 동네 현수막이 걸렸다.${kids.length ? ' 우리 아이들이 비교당한다.' : ''}`;
    },
  },
  { // 대규모 투자
    w: (_s, ours) => (_s.rival!.worth < ours ? 1.2 : 0.5),
    run: (s) => {
      const add = Math.round(rv(s).worth * (0.08 + next(s) * 0.12));
      rv(s).worth += add;
      return `${R(s)}이(가) ${pick(s, ['강남 빌딩을 사들였다', '신사업에 뛰어들어 대박을 냈다', '코인으로 큰돈을 벌었다', '물류센터 부지를 선점했다'])}. 저쪽 재산 +${formatMoney(add)}`;
    },
  },
  { // 기부로 이름값
    w: () => 0.5,
    run: (s) => ((rv(s).fame += 5), `${R(s)}이(가) 지역 병원에 거액을 기부했다. 신문에 대문짝만하게 났다. (저쪽 명성 +5)`),
  },
];
const FRIENDLY: Move[] = [
  { w: () => 1, run: (s) => {
    const g = Math.round(Math.min(5000, rv(s).worth * 0.01));
    householder(s).cash += g;
    return `사돈 ${R(s)}과(와) 함께한 공동 사업에서 배당금 ${formatMoney(g)}이 나왔다.`;
  } },
  { w: () => 0.7, run: (s) => {
    const p = head(s);
    mark(p, 'network', 1);
    s.fame += 2;
    return `${boss(s)}이(가) 우리 가주를 경제인 모임에 소개했다. 명성 +2`;
  } },
  { w: (s) => (householder(s).cash < 0 ? 2 : 0), run: (s) => {
    householder(s).cash += 3000;
    return `형편이 어렵다는 소식에 사돈 ${R(s)}이(가) 3,000만 원을 보태 줬다.`;
  } },
];
function rivalMove(s: GameState, ours: number): string | undefined {
  const pool = (rv(s).allied ? FRIENDLY : HOSTILE).map((m) => [m, m.w(s, ours)] as const).filter(([, w]) => w > 0);
  const total = pool.reduce((t, [, w]) => t + w, 0);
  if (!total) return;
  let x = next(s) * total;
  const hit = pool.find(([, w]) => (x -= w) <= 0) ?? pool[pool.length - 1];
  return hit[0].run(s, ours);
}

// ───────────────────────── 우리의 대응 (행동) ─────────────────────────

const rivalOn = (s: GameState) => !!s.rival && !s.rival.fallen && age(s, head(s)) >= 20;
export const RIVAL_ACTIONS: ActionDef[] = [
  {
    id: 'rv_counter',
    cat: '사회',
    icon: '⚔️',
    name: '라이벌 견제 (여론전)',
    desc: '저쪽 명성·기세를 꺾는다. 실패하면 우리가 망신 · 원한↑',
    ap: 1,
    cost: 500,
    show: (s) => rivalOn(s) && !s.rival!.allied,
    run: (s) => {
      const p = head(s);
      if (check(s, p.actual.cha, 55, 10)) {
        rv(s).fame = Math.max(0, rv(s).fame - 5);
        rv(s).worth = Math.round(rv(s).worth * 0.97);
        rv(s).feud = clamp(rv(s).feud + 8, 0, 100);
        return `${R(s)}의 갑질 의혹을 지역 언론에 흘렸다. 저쪽 명성 -5, 재산 -3%. 원한이 깊어진다.`;
      }
      s.fame = Math.max(0, s.fame - 3);
      rv(s).feud = clamp(rv(s).feud + 5, 0, 100);
      return '역풍을 맞았다. "남 흉보는 집안"이라는 소리를 들었다. 명성 -3';
    },
  },
  {
    id: 'rv_peace',
    cat: '사회',
    icon: '🕊',
    name: '라이벌에게 화해의 손길',
    desc: '원한↓ · 원한이 거의 없어지면 동맹(사돈)이 되어 서로 돕는다',
    ap: 1,
    cost: 300,
    show: (s) => rivalOn(s) && !s.rival!.allied,
    run: (s) => {
      const p = head(s);
      const d = check(s, (p.actual.cha + p.actual.mor) / 2, 50, 10) ? int(s, 12, 20) : int(s, 3, 7);
      rv(s).feud = clamp(rv(s).feud - d, 0, 100);
      if (rv(s).feud <= 10) {
        rv(s).allied = true;
        unlock(s, 'rival_allied');
        return `${boss(s)}이(가) 손을 맞잡았다. "이제 경쟁 말고 같이 갑시다." ${R(s)}과(와) 동맹을 맺었다! 해마다 서로 돕는다.`;
      }
      return `선물을 들고 찾아갔다. 원한 -${d} (지금 ${Math.round(rv(s).feud)}). ${d >= 12 ? '저쪽 표정이 한결 풀렸다.' : '문 앞에서 돌려보내졌다.'}`;
    },
  },
  {
    id: 'rv_takeover',
    cat: '재산',
    icon: '🦈',
    name: '라이벌 계열사 지분 매입',
    desc: '저쪽이 약할 때 지분을 사들인다 · 저쪽 재산↓ 우리 자산↑ · 끝까지 몰아붙이면 몰락',
    ap: 1,
    show: (s) => rivalOn(s) && !s.rival!.allied && s.rival!.worth < buyPower(s) * 4,
    blocked: (s) => (buyPower(s) < Math.round(rv(s).worth * 0.1) ? `${formatMoney(Math.round(rv(s).worth * 0.1))} 필요` : undefined),
    run: (s) => {
      const cost = Math.round(rv(s).worth * 0.1);
      householder(s).cash -= cost;
      addAsset(s, 'building', householder(s).id, Math.round(cost * (0.95 + next(s) * 0.3)), `${rv(s).name}씨 계열사 지분`);
      rv(s).worth = Math.round(rv(s).worth * 0.82);
      rv(s).feud = clamp(rv(s).feud + 20, 0, 100);
      if (rv(s).worth < 20000 && chance(s, 0.4)) {
        rv(s).fallen = s.year;
        unlock(s, 'rival_fallen');
        return `적대적 인수 성공! ${R(s)}의 경영권이 무너졌다. 저쪽은 몰락했다.`;
      }
      return `${formatMoney(cost)}어치 지분을 사들였다. ${boss(s)}이(가) 긴급 이사회를 소집했다는 소문. (저쪽 재산 -18%)`;
    },
  },
];

export const RIVAL_EVENTS: EventDef[] = [intro, union, repay, ...RIVAL_RANDOM];

/** 화면 한 줄 요약 */
export function rivalLine(s: GameState, ours: number): string {
  const r = s.rival;
  if (!r) return '';
  const diff = ours - r.worth;
  const who = `${r.name}씨 가문 · ${rivalMood(r)}`;
  if (r.fallen) return `${who} — 저쪽은 몰락했다`;
  return `${who} — 저쪽 ${formatMoney(r.worth)} (${diff >= 0 ? '우리가 ' + formatMoney(diff) + ' 앞섬' : formatMoney(-diff) + ' 뒤짐'})`;
}
