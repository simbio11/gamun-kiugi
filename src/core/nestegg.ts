// 아이 명의 종잣돈: 형편이 되는 집은 아이가 어릴 때부터 적금·청약·적립식 주식을 들어 주고, 부잣집은 땅을 떼어 준다.
// 미성년 자녀는 10년간 2,000만 원까지 증여세가 없다 (성인은 5,000만). 스무 살이 되면 그대로 아이 몫이 된다.

import { chance } from './rng';
import { eul, type Choice, type EventDef } from './ev-util';
import { addAsset, addHolding, formatMoney } from './economy';
import { previewGiftTax } from './estate';
import { age, alive, fullName, head, parentsOf, relationLabel } from './people';
import type { GameState, Person } from './types';

type EggKind = 'save' | 'etf';
const EGG_NAMES: Record<EggKind, string> = { save: '청약·적금 통장', etf: '적립식 ETF 계좌' };

const liquid = (s: GameState, pars: Person[]) => pars.reduce((t, p) => t + Math.max(0, p.cash), 0) + (pars.some((p) => p.id === s.headId) ? 0 : Math.max(0, s.familyCash));

/** 누가 누구에게: 아이의 부모 중 현금 많은 쪽 */
function payerOf(s: GameState, kid: Person): Person | undefined {
  return parentsOf(s, kid)
    .filter(alive)
    .sort((a, b) => b.cash - a.cash)[0];
}

const eggEv: EventDef = {
  id: 'nest_egg',
  title: (c) => `${fullName(c.p)} 명의 종잣돈`,
  valid: (c) => age(c.s, c.p) < 18 && !!payerOf(c.s, c.p),
  portraits: (c) => [...parentsOf(c.s, c.p).filter(alive), c.p],
  text: (c) => {
    const payer = payerOf(c.s, c.p)!;
    const me = payer.id === c.s.headId;
    const pars = parentsOf(c.s, c.p).filter(alive);
    return (
      `${fullName(c.p)} ${age(c.s, c.p)}세. ${me ? '아이 앞으로 뭔가 들어 둘까?' : `${relationLabel(c.s, payer)}이(가) "아이 앞으로 뭐라도 들어 두자"고 하신다.`}\n` +
      `어릴 때부터 모은 돈은 복리로 불어나 스무 살에 목돈이 된다. 미성년 자녀는 10년간 2,000만 원까지 증여세가 없다.\n` +
      `${me ? '쓸 수 있는 현금' : '부모님 여윳돈'} ${formatMoney(liquid(c.s, pars))}`
    );
  },
  choices: (c) => {
    const payer = payerOf(c.s, c.p)!;
    const pars = parentsOf(c.s, c.p).filter(alive);
    const L = liquid(c.s, pars);
    const kid = c.p;
    const start = (kind: EggKind, yearly: number, text: string) => (): string => {
      kid.flags = kid.flags.filter((f) => !f.startsWith('egg:'));
      kid.flags.push(`egg:${kind}:${yearly}:${payer.id}`);
      if (kind === 'etf') addHolding(c.s, 'stock', kid.id, 0).name = `${kid.name} 명의 ETF`;
      return text;
    };
    const out: Choice[] = [];
    if (L >= 800) out.push({ label: '청약통장 + 적금 (월 10만 원)', run: start('save', 120, `${kid.name} 이름으로 청약통장과 적금을 텄다. 매달 10만 원씩.`) });
    if (L >= 4000) out.push({ label: '적립식 ETF (월 30만 원, 주가 따라 오르내림)', run: start('etf', 360, `${kid.name} 명의 증권 계좌를 열고 지수 ETF를 매달 30만 원씩 사 모으기로 했다.`) });
    if (L >= 30000) out.push({ label: '적립식 ETF (월 100만 원)', run: start('etf', 1200, `매달 100만 원씩 ${kid.name} 명의 ETF를 산다. 스무 살엔 억대가 될 것이다.`) });
    if (L >= 6000)
      out.push({
        label: '비과세 한도 2,000만 원을 한 번에 넣어 둔다',
        cost: payer.id === c.s.headId ? 2000 : undefined,
        run: (x) => {
          if (payer.id !== x.s.headId) payer.cash -= 2000;
          const a = addHolding(x.s, 'stock', kid.id, 2000);
          a.name = `${kid.name} 명의 ETF`;
          x.s.gifts.push({ fromId: payer.id, toId: kid.id, amount: 2000, tax: 0, year: x.s.year });
          return `증여 신고까지 마쳤다. 2,000만 원이 ${kid.name} 명의 계좌에서 굴러간다. (10년 뒤 또 2,000만 원까지 비과세)`;
        },
      });
    out.push({ label: L < 800 ? '지금은 여윳돈이 없다' : '아직은 괜찮다', run: () => (L < 800 ? '먹고살기도 빠듯하다. 마음만은 굴뚝같다.' : '나중에 생각하기로 했다.') });
    return out;
  },
};

/** 부잣집: 조부모·부모가 가진 땅 일부를 손주·자녀 이름으로 */
const landEv: EventDef = {
  id: 'egg_land',
  title: () => '아이 이름으로 된 땅',
  valid: (c) => age(c.s, c.p) < 20 && c.s.assets.some((a) => a.kind === 'land' && (a.ownerId === 'family' || parentsOf(c.s, c.p).some((q) => q.id === a.ownerId))),
  portraits: (c) => [...parentsOf(c.s, c.p).filter(alive), c.p],
  text: (c) => {
    const land = c.s.assets.filter((a) => a.kind === 'land' && (a.ownerId === 'family' || parentsOf(c.s, c.p).some((q) => q.id === a.ownerId))).sort((a, b) => b.value - a.value)[0];
    c.ev.data ??= { landId: land.id };
    const part = Math.round(land.value * 0.2);
    const payer = payerOf(c.s, c.p)!;
    return `집안 어른들이 모여 ${eul(land.name)} 두고 이야기한다.\n"땅은 일찍 넘길수록 세금이 싸다. 오를 땅이니 지금 떼어 주자."\n\n→ ${fullName(c.p)} 몫으로 ${formatMoney(part)}어치 (공시가 기준 과세, 증여세 약 ${formatMoney(previewGiftTax(c.s, payer, c.p, Math.round(part * 0.7)))}은 어른들이 대신 낸다)`;
  },
  choices: (c) => {
    const land = c.s.assets.find((a) => a.id === c.ev.data.landId);
    const payer = payerOf(c.s, c.p)!;
    return [
      {
        label: '아이 이름으로 떼어 준다',
        run: (x) => {
          if (!land) return '땅이 이미 없다.';
          const part = Math.round(land.value * 0.2);
          const tax = previewGiftTax(x.s, payer, x.p, Math.round(part * 0.7));
          land.value -= part;
          addAsset(x.s, 'land', x.p.id, part, `${land.name} (일부)`);
          payer.cash -= Math.round(tax * 1.2);
          x.s.gifts.push({ fromId: payer.id, toId: x.p.id, amount: Math.round(part * 0.7 + tax * 1.2), tax, year: x.s.year });
          return `등기부에 ${x.p.name}의 이름이 올라갔다. 증여세 ${formatMoney(tax)}과 그 세금에 붙은 세금까지 어른들이 냈다.`;
        },
      },
      { label: '아직 이르다', run: () => '"애가 땅을 알아서 뭐 하냐." 다음으로 미뤘다.' },
    ];
  },
};

export const EGG_EVENTS = [eggEv, landEv];

/** 새 게임: 형편이 되는 집은 아이가 일곱 살쯤 종잣돈 이야기가 나온다. 부잣집은 열 살 무렵 땅 이야기도 */
export function scheduleEggs(s: GameState, me: Person) {
  if (s.origin === 'poor') return;
  (s.scheduled ??= []).push({ year: s.year + 2, defId: 'nest_egg', personId: me.id });
  if (s.origin === 'rich') s.scheduled.push({ year: s.year + 5, defId: 'egg_land', personId: me.id });
}

/** 내 아이가 태어나 세 살이 되면 (내가 부모) */
export function eggForKids(s: GameState) {
  const h = head(s);
  for (const id of h.childIds) {
    const k = s.people[id];
    if (!k || !alive(k) || age(s, k) !== 3 || k.flags.some((f) => f.startsWith('egg:'))) continue;
    if (!s.events.some((e) => e.defId === 'nest_egg' && e.personId === k.id)) s.events.push({ uid: s.eventSeq++, defId: 'nest_egg', personId: k.id });
  }
}

/** 해마다: 적립. 스무 살이 되면 끝나고 그대로 아이 몫 */
export function eggYear(s: GameState): string[] {
  const msgs: string[] = [];
  for (const k of Object.values(s.people)) {
    const f = k.flags.find((x) => x.startsWith('egg:'));
    if (!f || !alive(k)) continue;
    const [, kind, amt, payerId] = f.split(':');
    const payer = s.people[payerId];
    const v = Number(amt);
    if (age(s, k) >= 20) {
      k.flags = k.flags.filter((x) => x !== f);
      const bal = kind === 'etf' ? s.assets.find((a) => a.kind === 'stock' && a.ownerId === k.id)?.value ?? 0 : k.cash;
      if (k.id === s.headId || parentsOf(s, head(s)).includes(k) || head(s).childIds.includes(k.id))
        msgs.push(`🎁 ${fullName(k)} 스무 살: 어릴 때부터 모은 ${EGG_NAMES[kind as EggKind]} ${formatMoney(bal)}이 온전히 제 몫이 됐다.`);
      continue;
    }
    // 부모가 형편이 어려워지면 잠시 멈춘다
    if (!payer || !alive(payer) || payer.cash < v * 2) continue;
    payer.cash -= v;
    if (kind === 'etf') addHolding(s, 'stock', k.id, v);
    else k.cash += Math.round(v * 1.03); // 적금 이자
    // 한 번씩 할머니·할아버지 용돈도 보탠다
    if (chance(s, 0.2)) k.cash += 30;
  }
  return msgs;
}
