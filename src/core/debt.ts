// 빚: 통장이 마이너스가 되면 생활비 대출(신용점수에 따라 금리가 다르다)이 되고, 이자가 쌓인다.
// 돈이 바닥나면 무엇을 팔지·어떻게 버틸지 고르고, 오래 못 갚으면 개인회생이나 파산으로 간다.
import type { GameState, Person } from './types';
import type { Choice, EventDef } from './ev-util';
import { chance, int } from './rng';
import { assetsOf, expectedIncome, formatMoney } from './economy';
import { addFlag, age, alive, clamp, fullName, hasFlag, head, householder, mark, parentsOf, relationLabel, spouseOf } from './people';
import { isPrimary, isRealty, liab, sellRealty } from './realty';
import { afterHomeSold, homeOf, moveQuote, moveTo, refundOf, tierOf, tiers } from './housing';

export const creditOf = (p: Person) => Math.round(p.credit ?? 750);

export function creditGrade(c: number): string {
  return c >= 850 ? '최우수' : c >= 750 ? '우수' : c >= 650 ? '보통' : c >= 500 ? '주의' : '위험';
}

const flagNum = (p: Person, k: string) => Number(p.flags.find((f) => f.startsWith(k + ':'))?.slice(k.length + 1) ?? NaN);
export const inRehab = (p: Person) => p.flags.some((f) => f.startsWith('rehab:'));

/** 마이너스 통장(생활비 대출) 금리: 신용이 나쁠수록 카드론·대부업 수준으로 */
export function debtRate(p: Person): number {
  if (inRehab(p)) return 0;
  const c = creditOf(p);
  return c >= 800 ? 0.055 : c >= 700 ? 0.075 : c >= 600 ? 0.1 : c >= 500 ? 0.14 : 0.19;
}

const household = (s: GameState, p: Person) => {
  const sp = spouseOf(s, p);
  return sp && alive(sp) ? [p, sp] : [p];
};
const incomeOf = (s: GameState, p: Person) => household(s, p).reduce((t, x) => t + Math.max(0, expectedIncome(s, x)), 0);
/** 가구 통장 합계 (마이너스면 빚) */
export const walletNet = (s: GameState, p: Person) => household(s, p).reduce((t, x) => t + x.cash, 0);

/** 해마다: 신용점수 오르내림, 빚 스트레스, 회생·파산 기간 정리, 위기 이벤트 */
export function debtYear(s: GameState): string[] {
  const msgs: string[] = [];
  for (const p of Object.values(s.people)) {
    if (!alive(p) || age(s, p) < 19) continue;
    const inc = Math.max(1000, expectedIncome(s, p));
    if (p.cash < 0) p.credit = clamp(creditOf(p) - clamp(15 + (-p.cash / inc) * 12, 15, 70), 300, 950);
    else p.credit = clamp(creditOf(p) + 20, 300, 950);
    const end = flagNum(p, 'rehab');
    if (end && s.year >= end) {
      p.flags = p.flags.filter((f) => !f.startsWith('rehab:'));
      const left = Math.max(0, -p.cash);
      if (p.cash < 0) p.cash = 0;
      p.credit = 550;
      if (p.id === s.headId) msgs.push(`⚖ 개인회생 종료! 남은 빚 ${formatMoney(left)}은 면책됐다. 신용이 조금씩 회복된다.`);
    }
    const bu = flagNum(p, 'bankrupt_until');
    if (bu && s.year >= bu) p.flags = p.flags.filter((f) => !f.startsWith('bankrupt_until:'));
  }
  // 우리 집 살림이 빚이면: 스트레스와 위기 이벤트
  const h = head(s);
  if (householder(s).id !== h.id) return msgs;
  const net = walletNet(s, h);
  const inc = Math.max(1000, incomeOf(s, h));
  if (net < 0) {
    if (!h.flags.some((f) => f.startsWith('debt_since:'))) h.flags.push('debt_since:' + s.year);
    if (!inRehab(h)) {
      for (const x of household(s, h)) x.happiness = clamp(x.happiness - (-net > inc ? 6 : 3), 0, 100);
      const sp = spouseOf(s, h);
      if (sp && alive(sp) && -net > inc) h.bond = sp.bond = clamp((h.bond ?? 60) - 3, 0, 100);
      if (-net > inc * 2) mark(h, 'health_x', 1);
    }
    const since = flagNum(h, 'debt_since');
    const queued = s.events.some((e) => e.defId === 'money_crisis' || e.defId === 'debt_collection');
    const lastDun = flagNum(h, 'dun');
    if (!queued && !inRehab(h)) {
      if (((s.year - since >= 3 && -net > Math.max(3000, inc * 1.5)) || -net > inc * 4 + 10000) && !(s.year - lastDun < 2)) {
        h.flags = h.flags.filter((f) => !f.startsWith('dun:'));
        h.flags.push('dun:' + s.year);
        s.events.push({ uid: s.eventSeq++, defId: 'debt_collection', personId: h.id });
      } else if (-net >= 300) {
        // 이미 대출로 버티기로 했으면, 빚이 눈에 띄게(연 소득 절반 이상) 불어날 때만 다시 묻는다
        const last = flagNum(h, 'crisis_at');
        if (isNaN(last) || -net > last + inc * 0.5) {
          h.flags = h.flags.filter((f) => !f.startsWith('crisis_at:'));
          h.flags.push('crisis_at:' + Math.round(-net));
          s.events.push({ uid: s.eventSeq++, defId: 'money_crisis', personId: h.id });
        }
      }
    }
  } else h.flags = h.flags.filter((f) => !f.startsWith('debt_since:') && !f.startsWith('crisis_at:'));
  return msgs;
}

// ───────────────────────── 돈이 바닥났다 ─────────────────────────

/** 급매로 팔 투자 부동산 (순자산 큰 것부터) */
const investments = (s: GameState, p: Person) => s.assets.filter((a) => household(s, p).some((x) => x.id === a.ownerId) && isRealty(a) && !isPrimary(s, a)).sort((a, b) => b.value - liab(b) - (a.value - liab(a)));
const liquids = (s: GameState, p: Person) => s.assets.filter((a) => household(s, p).some((x) => x.id === a.ownerId) && (a.kind === 'stock' || a.kind === 'coin' || a.kind === 'art'));

function sellLiquids(s: GameState, p: Person): number {
  let got = 0;
  for (const a of liquids(s, p)) {
    const v = a.fake ? Math.round(a.value * 0.05) : Math.round(a.value * (a.kind === 'art' ? 0.8 : 0.99));
    s.people[a.ownerId].cash += v;
    got += v;
    s.assets = s.assets.filter((x) => x.id !== a.id);
  }
  return got;
}

/** 가족 중 도와줄 여유가 있는 사람 */
function helper(s: GameState, p: Person, need: number): Person | undefined {
  const cands = [...parentsOf(s, p), ...p.childIds.map((id) => s.people[id]), ...(spouseOf(s, p) ? parentsOf(s, spouseOf(s, p)!) : [])].filter((x) => x && alive(x) && age(s, x) >= 25 && x.cash >= need * 0.6);
  return cands.sort((a, b) => b.cash - a.cash)[0];
}

const moneyCrisis: EventDef = {
  id: 'money_crisis',
  title: () => '💸 통장이 바닥났다',
  valid: (c) => walletNet(c.s, c.p) < 0,
  text: (c) => {
    const net = walletNet(c.s, c.p);
    const home = homeOf(c.s, c.p);
    return (
      `통장이 마이너스 ${formatMoney(-net)}다. 이대로 두면 생활비 대출이 되어 연 ${(debtRate(c.p) * 100).toFixed(1)}% 이자가 붙는다.\n` +
      `신용점수 ${creditOf(c.p)} (${creditGrade(creditOf(c.p))}) · 사는 집: ${home ? `${home.name} (${home.type === 'own' ? '자가' : home.type === 'jeonse' ? `전세 ${formatMoney(home.deposit)}` : home.type === 'wolse' ? `월세 연 ${formatMoney(home.rent)}` : '부모님 댁'})` : '—'}\n` +
      '어떻게 메울까?'
    );
  },
  choices: (c) => {
    const s = c.s;
    const p = c.p;
    const net = -walletNet(s, p);
    const out: Choice[] = [];
    out.push({
      label: `생활비 대출로 버틴다 (연 ${(debtRate(p) * 100).toFixed(1)}%)`,
      run: () => {
        p.credit = clamp(creditOf(p) - 20, 300, 950);
        addFlag(p, 'living_loan');
        return `은행에서 마이너스 통장을 열었다. 급한 불은 껐지만 이자가 매년 붙는다. (신용점수 ${creditOf(p)})`;
      },
    });
    const home = homeOf(s, p);
    const ownA = home?.type === 'own' ? s.assets.find((a) => a.id === home.assetId) : undefined;
    if (ownA)
      out.push({
        label: `살던 집을 팔고 월세로 줄여 간다 (시세 ${formatMoney(ownA.value)})`,
        run: () => {
          const r = sellRealty(s, ownA);
          const moved = afterHomeSold(s, ownA.id);
          mark(p, 'scar', 1);
          return `정든 집을 팔았다. 손에 쥔 돈 ${formatMoney(r.got)}${r.tax ? ` (양도세 ${formatMoney(r.tax)})` : ''}.\n${moved}`;
        },
      });
    if (home && (home.type === 'jeonse' || (home.type === 'wolse' && tierOf(s, home.tier).rank > 0))) {
      const cur = tierOf(s, home.tier);
      const target = [...tiers(s)].filter((t) => t.rank < cur.rank || (home.type === 'jeonse' && t.rank <= cur.rank)).reverse().find((t) => moveQuote(s, p, t, 'wolse').ok);
      if (target)
        out.push({
          label: home.type === 'jeonse' ? `전세를 빼서 ${target.name} 월세로 (보증금 ${formatMoney(refundOf(home))} 돌려받음)` : `더 싼 ${target.name} 월세로 이사`,
          run: () => moveTo(s, p, target.id, 'wolse'),
        });
    }
    const inv = investments(s, p)[0];
    if (inv)
      out.push({
        label: `투자 부동산 급매: ${inv.name} (시세의 90%)`,
        run: () => {
          inv.value = Math.round(inv.value * 0.9);
          const r = sellRealty(s, inv);
          return `급하게 내놓았더니 제값을 못 받았다. 손에 쥔 돈 ${formatMoney(r.got)}${r.tax ? ` (양도세 ${formatMoney(r.tax)})` : ''}.`;
        },
      });
    if (liquids(s, p).length)
      out.push({
        label: `주식·코인·예술품을 처분한다 (${liquids(s, p).map((a) => a.name).join(', ').slice(0, 30)})`,
        run: () => `모두 팔아 ${formatMoney(sellLiquids(s, p))}을 마련했다.`,
      });
    const hp = helper(s, p, net);
    if (hp)
      out.push({
        label: `${relationLabel(s, hp)}께 손을 벌린다`,
        run: () => {
          if (chance(s, clamp(0.45 + hp.affinity / 200, 0.1, 0.9))) {
            const amt = Math.min(hp.cash, Math.round(net * 1.1));
            hp.cash -= amt;
            p.cash += amt;
            hp.affinity = clamp(hp.affinity - 8, -100, 100);
            mark(p, 'scar', 1);
            return `${fullName(hp)}이(가) 말없이 ${formatMoney(amt)}을 보내 줬다. 고맙고, 부끄럽다.`;
          }
          hp.affinity = clamp(hp.affinity - 6, -100, 100);
          return `"우리도 여유가 없다." 거절당했다. 서운함이 남았다.`;
        },
      });
    out.push({
      label: '허리띠를 졸라맨다 (생활 수준 ↓)',
      run: () => {
        s.policy.living = 'frugal';
        for (const x of household(s, p)) x.happiness = clamp(x.happiness - 6, 0, 100);
        return '외식·여행 끊고, 장보기는 할인 코너에서. 생활 수준을 "검소"로 바꿨다.';
      },
    });
    return out;
  },
};

// ───────────────────────── 빚 독촉 ─────────────────────────

/** 파산: 내 명의 재산을 다 팔아 갚고, 남은 빚은 면책. 5년간 대출 불가 */
export function goBankrupt(s: GameState, p: Person): string {
  const lines: string[] = [];
  for (const a of assetsOf(s, p.id)) {
    if (isRealty(a)) {
      const r = sellRealty(s, a);
      const moved = afterHomeSold(s, a.id);
      lines.push(`${a.name} 경매 (${formatMoney(r.got)})` + (moved ? ` → ${moved}` : ''));
    } else {
      p.cash += a.fake ? Math.round(a.value * 0.05) : Math.round(a.value * 0.9);
      s.assets = s.assets.filter((x) => x.id !== a.id);
      lines.push(`${a.name} 처분`);
    }
  }
  const home = homeOf(s, p);
  if (home && home.type === 'jeonse') lines.push(moveTo(s, p, 'room', 'wolse'));
  const forgiven = Math.max(0, -p.cash);
  p.cash = Math.max(0, p.cash);
  p.flags = p.flags.filter((f) => !f.startsWith('debt_since:') && f !== 'living_loan');
  addFlag(p, 'bankrupt');
  p.flags.push('bankrupt_until:' + (s.year + 5));
  p.credit = 300;
  s.fame = Math.max(0, s.fame - 3);
  for (const x of household(s, p)) x.happiness = clamp(x.happiness - 25, 0, 100);
  const sp = spouseOf(s, p);
  if (sp && alive(sp)) p.bond = sp.bond = clamp((p.bond ?? 60) - 15, 0, 100);
  return [...lines, `남은 빚 ${formatMoney(forgiven)} 면책. 5년간 대출도 카드도 안 된다.`].join('\n');
}

const debtCollection: EventDef = {
  id: 'debt_collection',
  title: () => '📞 빚 독촉',
  valid: (c) => walletNet(c.s, c.p) < 0,
  text: (c) => {
    const net = -walletNet(c.s, c.p);
    const since = flagNum(c.p, 'debt_since');
    return (
      `빚 ${formatMoney(net)}${since ? `, ${c.s.year - since}년째` : ''}. 이자만 연 ${formatMoney(net * debtRate(c.p))}다.\n` +
      `모르는 번호로 독촉 전화가 하루에도 몇 번씩 온다. 신용점수 ${creditOf(c.p)} (${creditGrade(creditOf(c.p))}).\n` +
      '법률 상담을 받아 볼까?'
    );
  },
  choices: (c) => {
    const s = c.s;
    const p = c.p;
    const net = -walletNet(s, p);
    const inc = incomeOf(s, p);
    const out: Choice[] = [];
    if (inc > 1500)
      out.push({
        label: '개인회생 신청 (3년간 갚고 나머지 탕감)',
        run: () => {
          const repay = Math.round(net * 0.4);
          for (const x of household(s, p)) if (x.cash < 0) x.cash = 0;
          p.cash = -repay;
          p.flags.push('rehab:' + (s.year + 3));
          p.flags = p.flags.filter((f) => !f.startsWith('debt_since:'));
          p.credit = 400;
          for (const x of household(s, p)) x.happiness = clamp(x.happiness - 10, 0, 100);
          return `법원이 변제 계획을 인가했다. 3년간 ${formatMoney(repay)}(빚의 40%)을 이자 없이 갚으면 나머지는 탕감된다.\n그동안 대출은 막힌다. 매달 월급날이 무겁다.`;
        },
      });
    out.push({
      label: '파산 신청 (재산을 모두 내놓고 면책)',
      run: () => goBankrupt(s, p),
    });
    out.push({
      label: '어떻게든 버틴다',
      run: () => {
        p.actual.hp = clamp(p.actual.hp - int(s, 2, 4), 0, 100);
        mark(p, 'health_x', 1);
        for (const x of household(s, p)) x.happiness = clamp(x.happiness - 8, 0, 100);
        if (-walletNet(s, p) > inc * 8 + 30000) return '버티려 했지만 채권자가 소송을 걸었다…\n' + goBankrupt(s, p);
        return '투잡을 뛰고 잠을 줄였다. 빚은 그대로인데 몸이 먼저 상한다.';
      },
    });
    return out;
  },
};

export const DEBT_EVENTS = [moneyCrisis, debtCollection];
export const isBankrupt = (p: Person) => hasFlag(p, 'bankrupt');
