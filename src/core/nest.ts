// 독립: 부모 품을 떠날 때. 부모의 형편·성격·관계·형제 수에 따라 지원이 달라진다.
// - 내가 떠날 때(leave_home): 부모님이 제안하고, 나는 받을지·사양할지·더 조를지 고른다.
// - 내 자녀가 떠날 때(kid_leave): 이번엔 내가 얼마나 보태줄지 정한다. 형제 간 형평성이 남는다.
import { chance, normal } from './rng';
import { ASSESS_RATIO } from './data';
import { addAsset, assetsOf, formatMoney, pay, personWorth } from './economy';
import { previewGiftTax } from './estate';
import { eul, iga, spendable, type Choice, type EventDef } from './ev-util';
import { settleHome } from './housing';
import { addFlag, age, alive, clamp, fullName, hasFlag, hasTrait, head, mark, parentsOf, relationLabel } from './people';
import type { AssetKind, GameState, Person } from './types';

/** 독립할 때 받은 지원 총액 (형평성 비교용) */
export const nestOf = (p: Person) => Number(p.flags.find((f) => f.startsWith('nest:'))?.slice(5) ?? 0);
function setNest(p: Person, amount: number) {
  p.flags = p.flags.filter((f) => !f.startsWith('nest:'));
  p.flags.push('nest:' + Math.round(amount));
}

const busy = (p: Person) => p.flags.some((f) => f === 'student' || f === 'retaking' || f.startsWith('prep:') || f.startsWith('serving:'));
const delayed = (s: GameState, p: Person) => p.flags.some((f) => f.startsWith('kangaroo:') && Number(f.slice(9)) > s.year);

/** 독립할 때가 됐는가: 성인·미혼·학업/군복무 끝, 그리고 번듯한 일자리가 있거나 나이가 찼거나 */
export function readyToLeave(s: GameState, p: Person): 'job' | 'age' | undefined {
  const a = age(s, p);
  if (a < 20 || p.spouseId || hasFlag(p, 'indep') || !alive(p) || busy(p) || delayed(s, p)) return;
  if (!parentsOf(s, p).some(alive)) return;
  if (p.job !== 'none' && p.job !== 'parttime') return 'job';
  if (a >= 28) return 'age';
}

function leave(p: Person, s?: GameState) {
  addFlag(p, 'indep');
  p.flags = p.flags.filter((f) => !f.startsWith('kangaroo:'));
  // 가주가 독립하면 집을 구한다 (받은 집이 있으면 거기로)
  if (s && p.id === s.headId && !p.spouseId) settleHome(s, p);
}

function siblingsIn(s: GameState, p: Person): Person[] {
  const pars = parentsOf(s, p);
  return Object.values(s.people).filter((x) => x.id !== p.id && alive(x) && pars.some((q) => q.childIds.includes(x.id)));
}

// ───────────────────────── 부모님이 내미는 것 ─────────────────────────

type OfferKind = 'spare' | 'apt_seoul' | 'apt_local' | 'jeonse' | 'deposit' | 'none' | 'need';
interface Offer {
  kind: OfferKind;
  amount: number;
  assetId?: string;
  payerId: string;
  why: string;
  /** 지금은 전세만, 몇 년 뒤 집을 마련해 주기로 한 약속 */
  promise?: 'apt_seoul' | 'apt_local';
}

/**
 * 부모님의 제안. 가진 현금(유동성)이 핵심이다: 집이 비싸도 현금이 없으면 못 준다.
 * 형제가 많으면 한 명에게 몰아주기 어렵고, 짠돌이 부모는 덜, 사이가 나쁘면 덜 준다.
 */
function parentOffer(s: GameState, child: Person): Offer {
  const pars = parentsOf(s, child).filter(alive);
  const payer = pars.slice().sort((a, b) => b.cash - a.cash)[0];
  const isHead = child.id === s.headId;
  const liquid = pars.reduce((t, p) => t + Math.max(0, p.cash), 0) + (isHead ? Math.max(0, s.familyCash) : 0);
  const debt = pars.reduce((t, p) => t + Math.min(0, p.cash), 0);
  const worth = pars.reduce((t, p) => t + personWorth(s, p), 0);
  const kids = Math.max(1, siblingsIn(s, child).length + 1);
  const aff = pars.reduce((t, p) => t + p.affinity, 0) / pars.length;
  let g = clamp(normal(s, 1, 0.25), 0.4, 1.6);
  if (pars.some((p) => hasTrait(p, 'frugal'))) g *= 0.7;
  if (pars.some((p) => hasTrait(p, 'spender'))) g *= 1.15;
  g *= 0.75 + clamp(aff, -50, 80) / 200;
  // 형제가 많으면 한 명 몫이 줄어든다 (모두에게 비슷하게 해주려는 마음)
  const budget = Math.max(0, (liquid + debt * 0.5) * 0.45 * g) / Math.sqrt(kids);
  const base = { payerId: payer.id };

  if (worth < 3000 && liquid < 500 && pars.every((p) => p.job === 'none' || p.job === 'pension' || p.job === 'parttime'))
    return { ...base, kind: 'need', amount: 0, why: '부모님 형편이 어렵다. 오히려 보탬이 필요해 보인다.' };
  // 자수성가 교육: 형편과 무관하게 "네 힘으로 해라"
  if (chance(s, pars.some((p) => hasTrait(p, 'frugal')) ? 0.35 : 0.15))
    return { ...base, kind: 'none', amount: 0, why: `"${worth > 100000 ? '돈이 사람을 망친다.' : '고생도 해봐야 한다.'} 네 힘으로 시작해라."` };
  // 집이 두 채 이상이면 한 채를 넘겨준다 (현금이 없어도 가능)
  const homes = pars.flatMap((p) => assetsOf(s, p.id)).filter((a) => a.kind === 'apt_seoul' || a.kind === 'apt_local');
  if (homes.length >= 2 && worth > 150000 && chance(s, 0.6 * g)) {
    const spare = homes.sort((a, b) => a.value - b.value)[0];
    return { ...base, kind: 'spare', amount: spare.value, assetId: spare.id, payerId: spare.ownerId, why: `"우리가 가진 ${spare.name}, 이제 네가 살아라."` };
  }
  // 집은 사회생활 몇 년 해 보고 나서: 갓 취직한 자녀에게 바로 집을 주면 증여세를 감당 못 한다
  const young = age(s, child) < 27 || child.jobYears < 2;
  if (budget >= s.market.apt_local && young) {
    const amt = Math.min(Math.round((budget * 0.4) / 1000) * 1000, Math.round(s.market.apt_local * 0.5));
    return { ...base, kind: 'jeonse', amount: Math.max(5000, amt), promise: budget >= s.market.apt_seoul ? 'apt_seoul' : 'apt_local', why: '"일단 전셋집에서 시작해라. 몇 년 자리 잡으면 집은 우리가 마련해 주마."' };
  }
  if (budget >= s.market.apt_seoul) return { ...base, kind: 'apt_seoul', amount: s.market.apt_seoul, why: '"서울에 아파트 하나 봐 뒀다."' };
  if (budget >= s.market.apt_local) return { ...base, kind: 'apt_local', amount: s.market.apt_local, why: '"작은 아파트 하나 사줄게. 거기서 시작해라."' };
  if (budget >= 8000) {
    const amt = Math.min(Math.round(budget / 1000) * 1000, Math.round(s.market.apt_local * 0.7));
    return { ...base, kind: 'jeonse', amount: amt, why: '"전셋집 보증금은 우리가 보태마."' };
  }
  if (budget >= 800) {
    const amt = Math.min(5000, Math.round(budget / 500) * 500);
    return { ...base, kind: 'deposit', amount: amt, why: '"월세 보증금이라도 보태라."' };
  }
  return { ...base, kind: 'none', amount: 0, why: debt < -5000 ? '부모님도 대출 갚기 바쁘시다. 보태줄 형편이 안 된다.' : '보태줄 여윳돈이 없다며 미안해하신다.' };
}

const OFFER_NAMES: Record<OfferKind, string> = {
  spare: '집 한 채',
  apt_seoul: '서울 아파트',
  apt_local: '지방 아파트',
  jeonse: '전세 보증금',
  deposit: '월세 보증금',
  none: '',
  need: '',
};

/** 부동산으로 주면 평가액(70%)에 과세, 현금은 전액 과세. 성인 자녀 10년간 5천만 공제는 giftTax가 처리 */
function offerTax(s: GameState, from: Person, to: Person, o: Offer): number {
  if (!o.amount) return 0;
  const kind: AssetKind | undefined = o.kind === 'spare' ? s.assets.find((a) => a.id === o.assetId)?.kind : o.kind === 'apt_seoul' || o.kind === 'apt_local' ? o.kind : undefined;
  return previewGiftTax(s, from, to, kind ? Math.round(o.amount * ASSESS_RATIO[kind]) : o.amount);
}

/**
 * 자녀 통장으로 증여세를 못 내면 부모가 모자란 만큼 더 보내 준다 (실제로도 흔하다).
 * 대신 내 준 세금도 증여라 20% 남짓 세금이 또 붙는다고 보고 그만큼 부모 돈이 더 나간다.
 */
export function coverTax(s: GameState, from: Person, to: Person, tax: number): number {
  const short = Math.max(0, tax - Math.max(0, to.cash));
  if (!short || from.cash < short * 1.2) return 0;
  pay(s, from, Math.round(short * 1.2));
  to.cash += short;
  return short;
}

/** 제안을 실제로 실행: 돈이 오가고 증여 기록이 남는다 */
function executeOffer(s: GameState, from: Person, to: Person, o: Offer, amount = o.amount): string {
  const tax = offerTax(s, from, to, { ...o, amount });
  if (o.kind === 'spare') {
    const a = s.assets.find((x) => x.id === o.assetId);
    if (!a) return '';
    a.ownerId = to.id;
  } else if (o.kind === 'apt_seoul' || o.kind === 'apt_local') {
    pay(s, from, amount);
    addAsset(s, o.kind, to.id, amount, o.kind === 'apt_seoul' ? '서울 첫 집' : '첫 집');
  } else {
    pay(s, from, amount);
    to.cash += amount;
  }
  const covered = coverTax(s, from, to, tax);
  to.cash -= tax;
  s.gifts.push({ fromId: from.id, toId: to.id, amount: (o.kind === 'spare' || o.kind.startsWith('apt') ? Math.round(amount * 0.7) : amount) + covered, tax, year: s.year });
  setNest(to, nestOf(to) + amount);
  if (o.promise) addFlag(to, `house_promise:${s.year + 2 + (chance(s, 0.5) ? 1 : 0)}:${o.promise}:${from.id}`);
  return !tax ? ' (증여세 없음: 성인 자녀 10년간 5천만 공제 안)' : covered ? ` (증여세 ${formatMoney(tax)} 중 모자란 ${formatMoney(covered)}은 부모님이 대신 보태 주셨다)` : ` (증여세 ${formatMoney(tax)}은 내가 냈다)`;
}

/** 형제보다 훨씬 많이 받으면 뒷말이 나온다 */
function jealousy(s: GameState, p: Person): string {
  const me = nestOf(p);
  const hurt = siblingsIn(s, p).filter((x) => age(s, x) >= 18 && nestOf(x) * 2 + 3000 < me);
  for (const x of hurt) {
    x.affinity = clamp(x.affinity - 10, -100, 100);
    mark(x, 'nest_envy');
  }
  if (!hurt.length || me < 10000) return '';
  return `\n${hurt.map((x) => fullName(x)).join(', ')}: "누구는 집까지 받고…" 뒷말이 나온다.`;
}

// ───────────────────────── 내가 떠날 때 ─────────────────────────

const leaveHome: EventDef = {
  id: 'leave_home',
  title: () => '독립',
  valid: (c) => !hasFlag(c.p, 'indep') && !c.p.spouseId && parentsOf(c.s, c.p).some(alive),
  portraits: (c) => [c.p, ...parentsOf(c.s, c.p).filter(alive)],
  text: (c) => {
    const d = (c.ev.data ??= {});
    if (!d.offer) d.offer = parentOffer(c.s, c.p);
    const o: Offer = d.offer;
    const payer = c.s.people[o.payerId];
    const lead =
      d.reason === 'age'
        ? `${fullName(c.p)} ${age(c.s, c.p)}세. 부모님이 "이제 나가 살 때도 됐다"고 하신다.`
        : `${fullName(c.p)}, 이제 제 밥벌이를 한다. 독립할 때가 됐다.`;
    const offer = o.amount
      ? `\n${relationLabel(c.s, payer)}: ${o.why}\n→ ${OFFER_NAMES[o.kind]} ${formatMoney(o.amount)} · 예상 증여세 ${formatMoney(offerTax(c.s, payer, c.p, o))}`
      : `\n${o.why}`;
    return `${lead}\n내 통장: ${formatMoney(c.p.cash)}${offer}${d.begged ? '\n(한 번 더 졸라 봤다)' : ''}`;
  },
  choices: (c) => {
    const s = c.s;
    const o: Offer = c.ev.data.offer;
    const payer = s.people[o.payerId];
    const pars = parentsOf(s, c.p).filter(alive);
    const touch = (n: number) => pars.forEach((p) => (p.affinity = clamp(p.affinity + n, -100, 100)));
    const out: Choice[] = [];
    if (o.kind === 'need') {
      out.push({
        label: '독립하고, 매년 부모님 생활비를 보낸다',
        run: (x) => {
          leave(x.p, s);
          (s.policy.autoGifts ??= {})[payer.id] = 600;
          mark(x.p, 'filial', 2);
          touch(15);
          return '작은 원룸을 얻었다. 첫 월급날부터 부모님께 생활비를 부쳐드린다. (자산 탭 → 적립식 증여에서 조정 가능)';
        },
      });
      out.push({ label: '내 앞가림부터 한다', run: (x) => (leave(x.p, s), touch(-5), '미안하지만 지금은 나 하나 건사하기도 벅차다.') });
    } else if (o.amount) {
      out.push({
        label: `감사히 받는다 (${OFFER_NAMES[o.kind]})`,
        run: (x) => {
          const tx = executeOffer(s, payer, x.p, o);
          leave(x.p, s);
          touch(5);
          mark(x.p, 'helped');
          x.p.happiness = clamp(x.p.happiness + 10, 0, 100);
          return `${eul(OFFER_NAMES[o.kind])} 받아 독립했다.${tx}${jealousy(s, x.p)}`;
        },
      });
      if (o.amount > 5000)
        out.push({
          label: '5천만만 받는다 (증여세 비과세 한도)',
          run: (x) => {
            const tx = executeOffer(s, payer, x.p, { ...o, kind: 'deposit' }, 5000);
            leave(x.p, s);
            touch(8);
            mark(x.p, 'modest');
            return `"필요한 만큼만 받을게요." 부모님이 내심 흐뭇해하신다.${tx}`;
          },
        });
      if (!c.ev.data.begged && o.kind !== 'spare')
        out.push({
          label: '조금만 더 보태 달라고 조른다',
          run: (x) => {
            x.ev.data.begged = true;
            touch(-8);
            const room = pars.reduce((t, p) => t + Math.max(0, p.cash), 0) - o.amount;
            if (room > o.amount * 0.5 && chance(s, 0.55)) {
              if (o.kind === 'apt_local' && room + o.amount >= s.market.apt_seoul) {
                o.kind = 'apt_seoul';
                o.amount = s.market.apt_seoul;
              } else o.amount = Math.round((o.amount * 1.5) / 500) * 500;
              if (o.kind === 'deposit' && o.amount >= 8000) o.kind = 'jeonse';
              return { text: '한숨을 쉬시더니 조금 더 보태 주시기로 했다.', keep: true };
            }
            return { text: '"우리 노후는 어쩌라고?" 분위기가 싸늘해졌다.', keep: true };
          },
        });
    } else {
      out.push({ label: '반지하 월세로 시작한다', run: (x) => (leave(x.p, s), mark(x.p, 'selfmade'), '맨손으로 시작한다. 좁지만 내 공간이다.') });
    }
    out.push({
      label: o.amount ? '사양하고 내 힘으로 시작한다' : '악착같이 모아 내 힘으로 선다',
      run: (x) => {
        leave(x.p, s);
        mark(x.p, 'selfmade', 2);
        x.p.actual.mor = clamp(x.p.actual.mor + 2, 0, 100);
        touch(o.amount ? 10 : 3);
        return o.amount ? '"마음만 받을게요." 부모님이 대견해하신다. 이 악물고 버틴 시간은 언젠가 쓸모가 있을 것이다.' : '누구에게도 기대지 않는다.';
      },
    });
    if (age(s, c.p) < 30 && o.kind !== 'need')
      out.push({
        label: '돈 모을 때까지 좀 더 얹혀산다',
        run: (x) => {
          x.p.flags.push('kangaroo:' + (s.year + 2));
          mark(x.p, 'kangaroo');
          touch(-6);
          return '2년만 더 신세 지기로 했다. 생활비는 부모님 몫, 월급은 내 통장에 차곡차곡.';
        },
      });
    return out;
  },
};

// ───────────────────────── 내 자녀가 떠날 때 ─────────────────────────

const kidLeave: EventDef = {
  id: 'kid_leave',
  title: (c) => `${fullName(c.p)}의 독립`,
  valid: (c) => !hasFlag(c.p, 'indep') && !c.p.spouseId && c.s.people[c.s.headId].childIds.includes(c.p.id),
  portraits: (c) => [head(c.s), c.p],
  text: (c) => {
    const sibs = siblingsIn(c.s, c.p).filter((x) => nestOf(x) > 0);
    const reason = readyToLeave(c.s, c.p) === 'age' ? `${age(c.s, c.p)}세, 아직 번듯한 직장이 없다. 이제 내보낼 때다.` : `${iga(fullName(c.p))} 취직해서 독립하겠다고 한다.`;
    return (
      `${reason}\n얼마나 보태 줄까? (쓸 수 있는 돈 ${formatMoney(spendable(c.s))})` +
      (sibs.length ? `\n형제들이 받은 것: ${sibs.map((x) => `${fullName(x)} ${formatMoney(nestOf(x))}`).join(', ')}` : '')
    );
  },
  choices: (c) => {
    const s = c.s;
    const me = head(s);
    const kid = c.p;
    const maxSib = Math.max(0, ...siblingsIn(s, kid).map(nestOf));
    const give = (o: Offer, text: string) => () => {
      leave(kid);
      // 비용은 선택지 cost로 이미 냈으니, 여기선 받는 쪽만 처리
      const tax = offerTax(s, me, kid, o);
      if (o.kind === 'spare') s.assets.find((a) => a.id === o.assetId)!.ownerId = kid.id;
      else if (o.kind === 'apt_seoul' || o.kind === 'apt_local') addAsset(s, o.kind, kid.id, o.amount, '첫 집');
      else kid.cash += o.amount;
      kid.cash -= tax;
      s.gifts.push({ fromId: me.id, toId: kid.id, amount: o.kind === 'jeonse' || o.kind === 'deposit' ? o.amount : Math.round(o.amount * 0.7), tax, year: s.year });
      setNest(kid, o.amount);
      kid.affinity = clamp(kid.affinity + (o.amount >= maxSib ? 12 : 4), -100, 100);
      kid.happiness = clamp(kid.happiness + 8, 0, 100);
      let fair = '';
      if (maxSib > 0 && o.amount < maxSib * 0.5) {
        kid.affinity = clamp(kid.affinity - 18, -100, 100);
        mark(kid, 'nest_envy');
        fair = `\n${iga(fullName(kid))} 형제와 비교하며 서운해한다.`;
      }
      return `${text}${tax ? ` (증여세 ${formatMoney(tax)})` : ''}${fair}${jealousy(s, kid)}`;
    };
    const base = { payerId: me.id, why: '' };
    const out: Choice[] = [];
    const spare = assetsOf(s, me.id).filter((a) => a.kind === 'apt_seoul' || a.kind === 'apt_local');
    if (spare.length >= 2) {
      const a = spare.sort((x, y) => x.value - y.value)[0];
      const o: Offer = { ...base, kind: 'spare', amount: a.value, assetId: a.id };
      out.push({ label: `${eul(a.name)} 넘겨준다 (증여세 ${formatMoney(offerTax(s, me, kid, o))}는 자녀 부담)`, run: give(o, `${a.name}의 명의를 넘겨주었다.`) });
    }
    for (const kind of ['apt_seoul', 'apt_local'] as const) {
      const o: Offer = { ...base, kind, amount: s.market[kind] };
      out.push({ label: `${OFFER_NAMES[kind]}를 사준다`, cost: o.amount, run: give(o, `${OFFER_NAMES[kind]}를 한 채 사주었다.`) });
    }
    out.push({ label: '전세금 2억을 보태준다', cost: 20000, run: give({ ...base, kind: 'jeonse', amount: 20000 }, '전셋집을 얻어 주었다.') });
    out.push({ label: '5천만 원 (비과세 한도)', cost: 5000, run: give({ ...base, kind: 'deposit', amount: 5000 }, '5천만 원을 보냈다. 세금 걱정은 없다.') });
    out.push({ label: '보증금 1천만 원만', cost: 1000, run: give({ ...base, kind: 'deposit', amount: 1000 }, '월세 보증금을 보태 주었다.') });
    out.push({
      label: '스스로 하게 둔다',
      run: () => {
        leave(kid);
        mark(kid, 'selfmade');
        kid.affinity = clamp(kid.affinity - (maxSib > 0 ? 15 : 3), -100, 100);
        return maxSib > 0 ? `"다른 형제는 해줬잖아요." ${iga(fullName(kid))} 서운한 기색이다.` : `${iga(fullName(kid))} 맨손으로 집을 나섰다.`;
      },
    });
    if (age(s, kid) < 30)
      out.push({
        label: '좀 더 데리고 산다',
        run: () => {
          kid.flags.push('kangaroo:' + (s.year + 2));
          return '2년만 더 같이 살기로 했다. 생활비는 우리 몫이다.';
        },
      });
    return out;
  },
};

/** 약속했던 집: 독립하고 2~3년 뒤, 부모님 형편이 여전하면 집을 마련해 주신다 */
const housePromise: EventDef = {
  id: 'house_promise',
  title: () => '부모님이 약속한 집',
  valid: (c) => parentsOf(c.s, c.p).some(alive),
  portraits: (c) => [c.p, ...parentsOf(c.s, c.p).filter(alive)],
  text: (c) => {
    const d = (c.ev.data ??= {});
    const o: Offer = d.offer;
    const payer = c.s.people[o.payerId];
    return `${fullName(c.p)} ${age(c.s, c.p)}세. 사회생활도 자리가 잡혔다.
${relationLabel(c.s, payer)}: "약속했던 집, 이제 마련해 주마."
→ ${OFFER_NAMES[o.kind]} ${formatMoney(o.amount)} · 예상 증여세 ${formatMoney(offerTax(c.s, payer, c.p, o))}
내 통장: ${formatMoney(c.p.cash)} (모자라면 부모님이 세금을 보태 주신다)`;
  },
  choices: (c) => {
    const s = c.s;
    const o: Offer = c.ev.data.offer;
    const payer = s.people[o.payerId];
    return [
      {
        label: `감사히 받는다 (${OFFER_NAMES[o.kind]})`,
        run: (x) => {
          const tx = executeOffer(s, payer, x.p, o);
          x.p.happiness = clamp(x.p.happiness + 10, 0, 100);
          mark(x.p, 'helped');
          return `${eul(OFFER_NAMES[o.kind])} 받았다. 내 이름으로 된 첫 집이다.${tx}${jealousy(s, x.p)}`;
        },
      },
      {
        label: '마음만 받는다',
        run: (x) => {
          mark(x.p, 'selfmade');
          payer.affinity = clamp(payer.affinity + 8, -100, 100);
          return '"제 힘으로 마련해 볼게요." 부모님이 대견해하신다.';
        },
      },
    ];
  },
};

export const NEST_EVENTS = [leaveHome, kidLeave, housePromise];

/** 약속한 해가 되면: 부모 형편이 아직 되는지 다시 보고 이벤트를 띄운다 */
function promiseYear(s: GameState, p: Person) {
  const f = p.flags.find((x) => x.startsWith('house_promise:'));
  if (!f) return;
  const [, yr, kind, payerId] = f.split(':');
  if (Number(yr) > s.year) return;
  p.flags = p.flags.filter((x) => x !== f);
  const payer = s.people[payerId];
  if (!payer || !alive(payer)) return;
  const k = kind as 'apt_seoul' | 'apt_local';
  const price = s.market[k];
  const want = payer.cash >= price * 1.15 ? k : payer.cash >= s.market.apt_local * 1.15 ? 'apt_local' : undefined;
  if (!want) return;
  s.events.push({ uid: s.eventSeq++, defId: 'house_promise', personId: p.id, data: { offer: { kind: want, amount: s.market[want], payerId, why: '' } } });
}

/** 해마다: 독립할 때가 된 사람을 찾는다. 내 자녀는 내가 정하고, 방계는 알아서 나간다. */
export function nestYear(s: GameState) {
  const h = head(s);
  const queued = (id: string) => s.events.some((e) => e.personId === id && (e.defId === 'leave_home' || e.defId === 'kid_leave'));
  promiseYear(s, h);
  const r = readyToLeave(s, h);
  if (r && !queued(h.id)) s.events.push({ uid: s.eventSeq++, defId: 'leave_home', personId: h.id, data: { reason: r } });
  for (const id of h.childIds) {
    const k = s.people[id];
    if (k && readyToLeave(s, k) && !queued(k.id)) s.events.push({ uid: s.eventSeq++, defId: 'kid_leave', personId: k.id });
  }
  // 내가 정하지 않는 사람들(형제, 조카, 손주 등)은 때가 되면 조용히 독립한다
  for (const p of Object.values(s.people)) {
    if (p.id === h.id || h.childIds.includes(p.id)) continue;
    if (readyToLeave(s, p) && chance(s, 0.5)) leave(p);
  }
}
