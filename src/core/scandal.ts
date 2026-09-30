// 명예 vs 실리: 돈을 크게 버는 지름길(사채·투기·탈세…)은 가문의 "스캔들 위험"을 쌓는다.
// 위험이 높을수록 언론 폭로가 잘 터지고, 터지면 공직·학계·의료처럼 명예로 먹고사는 가족이 가장 크게 다친다.
// 반대로 오래 깨끗하게 지낸 가문은 "청렴 가문"으로 명성이 조금씩 오른다.

import { addAsset, expectedIncome, formatMoney } from './economy';
import { chance, next, pick } from './rng';
import { gate, type EventDef } from './ev-util';
import { alive, clamp, fullName, head, householder, isMainline } from './people';
import { buyPower } from './leverage';
import { grant } from './rewards';
import type { ActionDef } from './actions';
import type { GameState } from './types';

/** 명예로 먹고사는 직업: 스캔들이 터지면 징계·낙마 */
export const HONOR_JOBS = new Set(['civil', 'tax_officer', 'police', 'coast_guard', 'firefighter', 'officer', 'diplomat', 'judge', 'prosecutor', 'teacher', 'professor', 'researcher', 'doctor', 'social_worker', 'clergy', 'politician', 'minister', 'president', 'journalist', 'announcer']);
export const addScandal = (s: GameState, n: number) => (s.scandal = clamp((s.scandal ?? 0) + n, 0, 100));
export const scandalLabel = (v: number) => (v >= 60 ? '🔥 위험' : v >= 30 ? '⚠ 수상함' : v >= 10 ? '소문 조금' : '깨끗');

const honorFolks = (s: GameState) => Object.values(s.people).filter((p) => alive(p) && isMainline(s, p) && HONOR_JOBS.has(p.job));
const insider = (s: GameState) => honorFolks(s).some((p) => ['civil', 'politician', 'minister', 'tax_officer', 'judge', 'prosecutor'].includes(p.job));

// ───────────────────────── 돈 되는 지름길 (행동) ─────────────────────────

export const MONEY_ACTIONS: ActionDef[] = [
  {
    id: 'm_loanshark',
    cat: '재산',
    icon: '💸',
    name: '대부업(사채) 투자',
    desc: '연 30% 넘는 수익 · 스캔들 위험↑↑ · 불법 추심이 걸리면 명성 추락',
    ap: 1,
    show: (s) => buyPower(s) >= 3000,
    run: (s) => {
      const amt = Math.round(Math.min(buyPower(s) * 0.3, 30000));
      const h = householder(s);
      addScandal(s, 12);
      if (chance(s, 0.15)) {
        h.cash -= amt;
        s.fame = Math.max(0, s.fame - 8);
        addScandal(s, 20);
        return `💥 투자한 대부업체가 불법 추심으로 적발됐다. 원금 ${formatMoney(amt)}이 묶이고 "사채업자 가문" 기사가 났다. (명성 −8)`;
      }
      const gain = Math.round(amt * (0.25 + next(s) * 0.15));
      h.cash += gain;
      return `이자 수익 ${formatMoney(gain)}. 돈은 벌었지만 누군가의 눈물이다. (스캔들 위험 ↑)`;
    },
  },
  {
    id: 'm_speculate',
    cat: '재산',
    icon: '🗺',
    name: '개발 정보로 땅 투기',
    desc: '신도시 예정지 땅을 미리 산다 · 가족 중 공직자가 있으면 수익↑ 그러나 스캔들↑↑↑',
    ap: 1,
    show: (s) => buyPower(s) >= 5000,
    run: (s) => {
      const amt = Math.round(Math.min(buyPower(s) * 0.4, 50000));
      const h = householder(s);
      const inside = insider(s);
      addScandal(s, inside ? 28 : 12);
      h.cash -= amt;
      const mult = chance(s, inside ? 0.75 : 0.45) ? 1.6 + next(s) * 0.8 : 0.6 + next(s) * 0.3;
      addAsset(s, 'land', h.id, Math.round(amt * mult), inside ? '개발 예정지 (차명)' : '개발 예정지 토지');
      return mult > 1
        ? `신도시 발표! 땅값이 ${Math.round(mult * 10) / 10}배가 됐다.${inside ? ' …공직에 있는 가족의 "정보"였다는 소문이 돈다.' : ''}`
        : '발표가 무산됐다. 산골 땅만 남았다.';
    },
  },
  {
    id: 'm_taxdodge',
    cat: '재산',
    icon: '🕳',
    name: '차명 계좌로 세금 줄이기',
    desc: '당장 수천만 원 절약 · 세무조사·스캔들 위험↑↑',
    ap: 1,
    show: (s) => buyPower(s) >= 10000,
    run: (s) => {
      const save = Math.round(Math.min(buyPower(s) * 0.05, 20000));
      householder(s).cash += save;
      s.taxHeat += 20;
      addScandal(s, 18);
      return `세금 ${formatMoney(save)}을 아꼈다. 은행 창구 직원의 눈빛이 묘했다.`;
    },
  },
  {
    id: 'm_nightlife',
    cat: '재산',
    icon: '🍸',
    name: '심야 술집에 건물 통임대',
    desc: '임대료 두 배 · 명성↓ · 스캔들 위험↑',
    ap: 1,
    show: (s) => s.assets.some((a) => a.kind === 'building' && a.ownerId === householder(s).id),
    run: (s) => {
      const b = s.assets.find((a) => a.kind === 'building' && a.ownerId === householder(s).id)!;
      const gain = Math.round(b.value * 0.04);
      householder(s).cash += gain;
      s.fame = Math.max(0, s.fame - 2);
      addScandal(s, 10);
      return `${b.name}에 밤늦게까지 시끄러운 술집이 들어왔다. 월세가 두 배. 동네 사람들이 수군댄다. (+${formatMoney(gain)}, 명성 −2)`;
    },
  },
  {
    id: 'm_clean',
    cat: '사회',
    icon: '🧼',
    name: '부정한 재산 정리·사회 환원',
    desc: '스캔들 위험을 크게 낮춘다 · 대신 돈이 든다',
    ap: 1,
    show: (s) => (s.scandal ?? 0) >= 15,
    run: (s) => {
      const cost = Math.round(Math.min(buyPower(s) * 0.1, 30000) + 500);
      householder(s).cash -= cost;
      const before = s.scandal ?? 0;
      s.scandal = Math.round(before * 0.4);
      s.fame += 2;
      return `차명 재산을 정리하고 ${formatMoney(cost)}을 장학재단에 냈다. 스캔들 위험 ${Math.round(before)} → ${s.scandal}. (명성 +2)`;
    },
  },
];

// ───────────────────────── 폭로 ─────────────────────────

const breakEv: EventDef = {
  id: 'scandal_break',
  title: () => '📰 단독: 가문의 치부',
  text: (c) => {
    c.ev.data ??= { what: pick(c.s, ['차명 재산과 사채 거래', '개발 정보를 이용한 땅 투기', '가족 명의로 쪼갠 탈세', '불법 추심과 연결된 돈줄', '유흥업소 건물 임대와 탈세']) };
    const hurt = honorFolks(c.s).map(fullName);
    return `한 일간지가 ${c.s.familyName}씨 가문의 "${c.ev.data.what}"을(를) 1면에 터뜨렸다. 기자들이 집 앞에 진을 쳤다.\n스캔들 위험 ${Math.round(c.s.scandal ?? 0)}` + (hurt.length ? `\n\n⚠ 명예로 먹고사는 가족이 위험하다: ${hurt.join(', ')}` : '');
  },
  choices: (c) =>
    gate(c.s, [
      {
        label: '공개 사과하고 재산을 환원한다',
        run: (x) => {
          const cost = Math.round(Math.min(buyPower(x.s) * 0.15, 50000));
          householder(x.s).cash -= cost;
          x.s.fame = Math.max(0, x.s.fame - 5);
          x.s.scandal = 5;
          return `고개를 숙이고 ${formatMoney(cost)}을 환원했다. 여론이 조금씩 누그러졌다. (명성 −5)`;
        },
      },
      {
        label: '대형 로펌·언론 관리 (1억)',
        cost: 10000,
        run: (x) => (chance(x.s, 0.5) ? ((x.s.scandal = Math.round((x.s.scandal ?? 0) * 0.6)), '후속 보도가 흐지부지됐다. 돈으로 덮었다… 이번엔.') : hit(x.s, 1)),
      },
      { label: '"사실무근" 모르쇠', run: (x) => (chance(x.s, 0.2) ? '다른 대형 사건에 묻혀 잊혔다. 운이 좋았다.' : hit(x.s, 1.6)) },
    ]),
};

/** 스캔들 직격: 명성 추락 + 명예 직업 가족 징계 */
function hit(s: GameState, k: number): string {
  const lines: string[] = [];
  const f = Math.round(12 * k);
  s.fame = Math.max(0, s.fame - f);
  lines.push(`명성 −${f}`);
  for (const p of honorFolks(s)) {
    p.happiness = clamp(p.happiness - 10, 0, 100);
    if (['politician', 'president'].includes(p.job) && p.pol) {
      p.pol.approval = Math.max(5, p.pol.approval - Math.round(15 * k));
      lines.push(`${fullName(p)} 지지율 −${Math.round(15 * k)}%`);
    } else if (chance(s, 0.5 * k)) {
      p.jobLevel = Math.max(0, p.jobLevel - 1);
      lines.push(`${fullName(p)} 징계·좌천`);
    }
  }
  s.scandal = Math.round((s.scandal ?? 0) * 0.5);
  return `💥 여론이 폭발했다. ` + lines.join(' · ');
}

export const SCANDAL_EVENTS: EventDef[] = [breakEv];

/** 명예형 직업의 대가: 해마다 품위 유지비(경조사·체면)가 나가고, 대신 가문 명성이 오른다 */
export const HONOR_UPKEEP = 0.06;
export const HONOR_FAME = 0.6;

/** 해마다: 위험이 조금씩 식고, 높으면 폭로가 터진다. 오래 깨끗하면 청렴 가문 */
export function scandalYear(s: GameState): string[] {
  const msgs: string[] = [];
  for (const p of honorFolks(s)) {
    const inc = expectedIncome(s, p);
    if (inc > 0) p.cash -= Math.round(inc * HONOR_UPKEEP);
    s.fame += HONOR_FAME;
  }
  const v = s.scandal ?? 0;
  if (v > 0 && chance(s, Math.min(0.45, v / 180))) {
    s.events.push({ uid: s.eventSeq++, defId: 'scandal_break', personId: head(s).id });
    return msgs;
  }
  s.scandal = Math.max(0, Math.round(v - 3));
  if ((s.scandal ?? 0) < 5) {
    s.cleanYears = (s.cleanYears ?? 0) + 1;
    const folks = honorFolks(s);
    if (s.cleanYears >= 10 && folks.length) s.fame += Math.min(3, folks.length);
    if (s.cleanYears === 20 && folks.length) grant(s, '🕊', '청렴 가문', '20년 동안 흠 없이 공직·학계·의료를 지켜 왔다. "저 집안은 믿을 수 있다."', 'epic');
  } else s.cleanYears = 0;
  return msgs;
}

