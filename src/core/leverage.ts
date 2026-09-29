// 빚내서 산 것: 살 수 있는 한도, 신용융자(주식), 반대매매, 담보 부족 → 임의경매.
// 원칙: 내 돈(가구 통장 순액)보다 많이 사려면 정해진 대출(주담대·신용융자)로만. 통장이 마이너스로 사지지는 않는다.
import type { Asset, GameState, Person } from './types';
import type { Choice, EventDef } from './ev-util';
import { formatMoney } from './economy';
import { alive, clamp, fullName, head, householder, mark, spouseOf } from './people';
import { isPrimary, isRealty, liab, sellRealty } from './realty';
import { afterHomeSold } from './housing';
import { creditOf, walletNet } from './debt';

/** 신용융자 금리 (증권사 신용거래 이자, 연 8~9%대) */
export const MARGIN_RATE = 0.085;
/** 신용매수 때 내 돈으로 넣어야 하는 비율 (증거금) */
export const MARGIN_MIN = 0.6;
/** 담보유지비율: 계좌 평가액 ÷ 융자금이 이 아래로 내려가면 반대매매 */
export const MAINTAIN = 1.4;
/** 임의경매 낙찰가율 (시세 대비) */
export const AUCTION_RATE = 0.78;

const household = (s: GameState, p: Person) => {
  const sp = spouseOf(s, p);
  return sp && alive(sp) ? [p, sp] : [p];
};

/** 지금 내 돈으로 살 수 있는 한도: 가구 통장 순액(빚은 뺀다) + 가문 공동 현금(가주일 때) */
export function buyPower(s: GameState): number {
  const h = head(s);
  const own = walletNet(s, h) + (householder(s).id === h.id ? Math.max(0, s.familyCash) : 0);
  return Math.max(0, Math.round(own));
}

/** 주식 매수 견적: 현금으로 되면 현금, 모자라면 신용융자(증거금 60%) */
export function stockQuote(s: GameState, amount: number, fee: number): { ok: boolean; loan: number; why?: string } {
  const total = Math.round(amount * (1 + fee));
  const power = buyPower(s);
  if (power >= total) return { ok: true, loan: 0 };
  const h = head(s);
  if (creditOf(h) < 600) return { ok: false, loan: 0, why: '신용점수가 낮아 신용거래 불가' };
  if (power < total * MARGIN_MIN) return { ok: false, loan: 0, why: `증거금 부족 (최소 ${formatMoney(Math.round(total * MARGIN_MIN))})` };
  return { ok: true, loan: total - power };
}

// ───────────────────────── 해마다 ─────────────────────────

const mine = (s: GameState, a: Asset) => household(s, head(s)).some((x) => x.id === a.ownerId) && householder(s).id === head(s).id;
const queued = (s: GameState, id: string, assetId: string) => s.events.some((e) => e.defId === id && e.data?.assetId === assetId);

/** 신용 이자, 반대매매·임의경매 점검 (시세가 바뀐 뒤에) */
export function leverageYear(s: GameState): string[] {
  const msgs: string[] = [];
  for (const a of [...s.assets]) {
    const o = s.people[a.ownerId];
    if (!o) continue;
    // 주식 신용융자
    if (a.kind === 'stock' && a.loan) {
      const i = Math.round(a.loan * MARGIN_RATE);
      o.cash -= i;
      if (a.value < a.loan * MAINTAIN) {
        if (mine(s, a) && alive(o)) {
          if (!queued(s, 'margin_call', a.id)) s.events.push({ uid: s.eventSeq++, defId: 'margin_call', personId: o.id, data: { assetId: a.id } });
        } else msgs.push(forcedSale(s, a, 0.95));
      }
    }
    // 부동산: 대출이 시세를 넘었고(깡통) 이자 낼 돈도 없으면 은행이 경매에 부친다
    if (isRealty(a) && a.loan && liab(a) > a.value * 0.92 && mine(s, a) && walletNet(s, head(s)) < 0) {
      const last = Number(o.flags.find((f) => f.startsWith('fc:' + a.id + ':'))?.split(':')[2] ?? -99);
      if (s.year - last >= 2 && !queued(s, 'foreclosure', a.id)) {
        o.flags = o.flags.filter((f) => !f.startsWith('fc:' + a.id + ':'));
        o.flags.push(`fc:${a.id}:${s.year}`);
        s.events.push({ uid: s.eventSeq++, defId: 'foreclosure', personId: head(s).id, data: { assetId: a.id } });
      }
    }
  }
  return msgs;
}

/** 반대매매: 담보비율을 맞출 만큼(실제로는 넉넉히) 시장가로 던진다. 평가액이 융자보다 적으면 남은 빚은 통장으로 */
function forcedSale(s: GameState, a: Asset, price: number): string {
  const o = s.people[a.ownerId];
  const loan = a.loan ?? 0;
  const v = a.value * price;
  // 팔고 나서 담보비율 170%가 되도록: (v - x) / (loan - x) = 1.7
  const x = Math.min(v, Math.max(0, (1.7 * loan - v) / 0.7));
  if (x >= v * 0.999 || v <= loan) {
    o.cash += Math.round(v - loan);
    s.assets = s.assets.filter((y) => y !== a);
    return `📉 ${fullName(o)}의 ${a.name} 반대매매: 전량 강제 처분 (${formatMoney(Math.round(v))} → 융자 ${formatMoney(loan)} 상환${v < loan ? `, 모자란 ${formatMoney(Math.round(loan - v))}은 빚으로` : ''})`;
  }
  a.value = Math.round(a.value - x / price);
  a.loan = Math.round(loan - x);
  return `📉 ${fullName(o)}의 ${a.name} 반대매매: ${formatMoney(Math.round(x))}어치가 하한가 근처에서 강제로 팔렸다 (남은 융자 ${formatMoney(a.loan)})`;
}

const assetOf = (s: GameState, data: { assetId?: string } | undefined) => s.assets.find((a) => a.id === data?.assetId);

const marginCall: EventDef = {
  id: 'margin_call',
  title: () => '📉 증권사 전화: 담보 부족',
  valid: (c) => {
    const a = assetOf(c.s, c.ev.data);
    return !!a && !!a.loan && a.value < a.loan * MAINTAIN;
  },
  text: (c) => {
    const a = assetOf(c.s, c.ev.data)!;
    const ratio = Math.round((a.value / a.loan!) * 100);
    return (
      `주가가 빠지면서 ${a.name} 담보비율이 ${ratio}%로 떨어졌다 (유지 ${MAINTAIN * 100}%).\n` +
      `평가액 ${formatMoney(a.value)} · 신용융자 ${formatMoney(a.loan!)} (연 ${(MARGIN_RATE * 100).toFixed(1)}%)\n` +
      '"오늘 안에 추가 증거금을 넣지 않으시면 내일 아침 동시호가에 반대매매 들어갑니다."'
    );
  },
  choices: (c) => {
    const s = c.s;
    const a = assetOf(s, c.ev.data)!;
    const o = s.people[a.ownerId];
    const loan = a.loan!;
    // 융자를 갚아 담보비율 160%로 되돌리는 데 드는 돈
    const need = Math.max(0, Math.round(loan - a.value / 1.6));
    const out: Choice[] = [];
    if (buyPower(s) >= need)
      out.push({
        label: `추가 증거금 ${formatMoney(need)}을 넣는다`,
        run: () => {
          const h = head(s);
          let left = need;
          for (const x of household(s, h)) {
            const t = Math.min(left, Math.max(0, x.cash));
            x.cash -= t;
            left -= t;
          }
          s.familyCash -= left;
          a.loan = loan - need;
          return `급하게 돈을 넣어 반대매매를 막았다. 남은 융자 ${formatMoney(a.loan)}. 주가가 다시 오르기만 기다린다.`;
        },
      });
    out.push({
      label: '내 손으로 일부를 팔아 융자를 줄인다',
      run: () => {
        const r = forcedSale(s, a, 0.99);
        mark(o, 'scar', 1);
        return r.replace('반대매매', '자진 정리').replace('강제로 ', '') + '\n쓰리지만 계좌는 살렸다.';
      },
    });
    out.push({
      label: '버틴다 (반대매매 당한다)',
      run: () => {
        const r = forcedSale(s, a, 0.93);
        o.credit = clamp(creditOf(o) - 25, 300, 950);
        mark(o, 'scar', 1);
        o.happiness = clamp(o.happiness - 8, 0, 100);
        return `다음 날 아침 9시, 하한가 근처에서 물량이 쏟아졌다.\n${r}`;
      },
    });
    return out;
  },
};

const foreclosure: EventDef = {
  id: 'foreclosure',
  title: () => '🏦 은행 통지: 임의경매 신청',
  valid: (c) => {
    const a = assetOf(c.s, c.ev.data);
    return !!a && !!a.loan && liab(a) > a.value * 0.92;
  },
  text: (c) => {
    const a = assetOf(c.s, c.ev.data)!;
    return (
      `${a.name} 시세가 ${formatMoney(a.value)}까지 떨어졌는데 대출·보증금이 ${formatMoney(liab(a))}이다 (깡통).\n` +
      '통장도 마이너스라 이자가 밀리자, 은행이 기한이익 상실을 통보하고 법원에 임의경매를 신청했다.\n' +
      `경매로 넘어가면 보통 시세의 ${Math.round(AUCTION_RATE * 100)}% 안팎에 낙찰된다.`
    );
  },
  choices: (c) => {
    const s = c.s;
    const a = assetOf(s, c.ev.data)!;
    const o = s.people[a.ownerId];
    const home = isPrimary(s, a);
    const need = Math.max(0, Math.round(liab(a) - a.value * 0.7));
    const out: Choice[] = [];
    if (buyPower(s) >= need)
      out.push({
        label: `대출 ${formatMoney(need)}을 갚고 경매를 취하시킨다`,
        run: () => {
          let left = need;
          for (const x of household(s, head(s))) {
            const t = Math.min(left, Math.max(0, x.cash));
            x.cash -= t;
            left -= t;
          }
          s.familyCash -= left;
          a.loan = Math.max(0, (a.loan ?? 0) - need);
          return '가진 돈을 다 긁어모아 대출을 줄였다. 경매가 취하됐다. 집은 지켰다.';
        },
      });
    out.push({
      label: `경매 전에 급매로 판다 (시세의 90%)`,
      run: () => {
        a.value = Math.round(a.value * 0.9);
        const r = sellRealty(s, a);
        const moved = home ? afterHomeSold(s, a.id) : '';
        mark(o, 'scar', 1);
        return `매수자를 겨우 찾았다. 손에 쥔 돈 ${formatMoney(r.got)}${r.got < 0 ? ' (모자란 만큼 빚으로 남았다)' : ''}.${moved ? '\n' + moved : ''}`;
      },
    });
    out.push({
      label: '손을 놓는다 (경매로 넘어간다)',
      run: () => {
        a.value = Math.round(a.value * AUCTION_RATE);
        const r = sellRealty(s, a);
        const moved = home ? afterHomeSold(s, a.id) : '';
        o.credit = clamp(creditOf(o) - 80, 300, 950);
        mark(o, 'scar', 2);
        for (const x of household(s, head(s))) x.happiness = clamp(x.happiness - 12, 0, 100);
        s.fame = Math.max(0, s.fame - 2);
        return `법원 경매 3회차에 낙찰됐다. 정리하고 남은 돈 ${formatMoney(r.got)}${r.got < 0 ? ' → 갚지 못한 대출은 빚으로 남았다' : ''}.\n신용점수 ${creditOf(o)}.${moved ? '\n' + moved : ''}`;
      },
    });
    return out;
  },
};

export const LEVERAGE_EVENTS = [marginCall, foreclosure];
