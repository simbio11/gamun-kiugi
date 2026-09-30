// 히든의 히든 (ULTRA HIDDEN) 9종: 슈퍼 히든 위의 최심층.
// 한 가지 문이 아니라 네 가지 문으로 열린다.
//   ① 죽음의 문턱 — 목숨이 끊기는 순간, 연도·재산이 맞으면 다른 길이 열린다 (뱀파이어 · 사이보그)
//   ② 3단계 연작 미션 (아홉 꼬리 신부 · 계약서의 여주인 · 시간 정지의 여제 · 색욕의 성녀)
//   ③ 단일 대형 이벤트 — 조건을 채운 해에 한 번 찾아온다 (향의 연금술사 · 독의 소믈리에)
//   ④ 배우자 경로 — 40세까지 장가들지 못한 남성 가주에게 41세에 안드로이드 신부가 온다 (글리치 메이드)
import { HIDDEN_BY_ID } from './hidden-data';
import { SURNAMES } from './data';
import { gate, type Ctx, type EventDef } from './ev-util';
import { addFlag, age, alive, clamp, createPerson, fullName, head, isMainline } from './people';
import { chance, pick } from './rng';
import { assetsOf, formatMoney, personWorth } from './economy';
import { marry } from './events';
import { awardCard } from './cards';
import type { GameState, Person } from './types';

const A = (s: GameState, p: Person) => age(s, p);
const ST = (p: Person) => p.actual;

interface UltraStep {
  title: string;
  text: string;
  check: (p: Person) => boolean;
  rate: number;
  succText: string;
  succMoney: number;
  failText: string;
}
/** 마지막 문에서 다른 길을 택할 때 (구미호는 진짜 사랑을 받으면 요기를 잃는다) */
interface AltChoice {
  label: string;
  text: string;
  hap?: number;
  /** 남는 재산 비율 (0.5 = 절반을 놓는다) */
  keepCash?: number;
}
interface UltraRoute {
  id: string;
  name: string;
  icon: string;
  /** 1단계 트리거 자격 조건 */
  ready: (s: GameState, p: Person) => boolean;
  alt: AltChoice;
  steps: [UltraStep, UltraStep, UltraStep];
}

export const ULTRA_ROUTES: UltraRoute[] = [
  // ── 🦊 아홉 꼬리 신부: 야망 자체를 먹고 사는 존재. 진짜 사랑을 받으면 죽는다 ──
  {
    id: 'hj_gumiho',
    name: '아홉 꼬리 신부',
    icon: '🦊',
    ready: (s, p) => p.sex === 'F' && A(s, p) >= 20 && A(s, p) <= 32 && ST(p).cha >= 74 && ST(p).mor <= 45,
    alt: { label: '진짜 사랑을 택한다 (요기를 놓는다)', text: '요기를 놓자 꼬리가 하나씩 사라졌다. 사람의 온도를 처음 알았다. 재산은 절반으로 줄었지만, 거울에 비치는 얼굴이 웃고 있다.', hap: 30, keepCash: 0.5 },
    steps: [
      {
        title: '🦊 첫 번째 꼬리',
        text: '재벌가 송년 만찬. {n}이(가) 잔을 기울일 때마다 방의 온도가 한 칸씩 올라간다. 소매 끝에서 첫 번째 꼬리가 흔들린다. "이 방에서 제일 비싼 건 사람이에요."',
        check: (p) => ST(p).cha >= 74,
        rate: 0.88,
        succText: '회장의 시선이 {n}에게 못 박혔다. 첫 계약금이 손에 쥐어졌다.',
        succMoney: 4000,
        failText: '가면이 조금 일찍 벗겨졌다. 사람들이 등을 돌렸다.',
      },
      {
        title: '🦊 다섯 번째 꼬리',
        text: '혼례 계약서가 놓였다. 서명하는 순간 상대의 재산·권력·정력이 전부 {n}의 것이 된다. 사내는 웃고 있지만 눈은 이미 비어 있다.',
        check: (p) => ST(p).cha >= 76 && ST(p).int >= 58,
        rate: 0.85,
        succText: '혼례복 자락 아래 다섯 개의 꼬리가 펼쳐졌다. 가문 금고가 통째로 넘어왔다.',
        succMoney: 24000,
        failText: '가문의 사주를 본 무당이 혼례를 막아섰다.',
      },
      {
        title: '🦊 아홉 번째 꼬리',
        text: '아홉 번째 꼬리가 자라나는 밤, {n}은(는) 처음으로 진짜 사랑을 받고 있다는 것을 알아챘다. 완성하면 다시는 사람을 사랑할 수 없다.',
        check: (p) => ST(p).cha >= 78,
        rate: 0.92,
        succText: '아홉 개의 꼬리가 달빛을 갈랐다. 이제 세상의 모든 야망이 {n}의 밥이 된다.',
        succMoney: 40000,
        failText: '달이 구름에 가려 마지막 꼬리가 흐려졌다.',
      },
    ],
  },

  // ── 👠 계약서의 여주인: 꿈속에서 접대하는 서큐버스 회계사 ──
  {
    id: 'hj_succubus',
    name: '계약서의 여주인',
    icon: '👠',
    ready: (s, p) => p.sex === 'F' && A(s, p) >= 24 && A(s, p) <= 40 && ST(p).int >= 70 && ST(p).cha >= 66 && ST(p).mor <= 30,
    alt: { label: '계약서를 태운다', text: '야간 미팅 장부를 태웠다. 영혼은 안전하지만, 이제 밤마다 누군가 이름을 부르는 꿈을 꾼다.', hap: 10, keepCash: 0.7 },
    steps: [
      {
        title: '👠 야간 미팅, 30분',
        text: '명함에는 사업자등록번호만 적혀 있다. 첫 미팅은 꿈속에서 열렸다. "한 번에 30분, 야간만. 서명하시면 계약서 자체가 마법진이 됩니다."',
        check: (p) => ST(p).int >= 70,
        rate: 0.86,
        succText: '서명란에 이름을 올렸다. 잠에서 깨니 통장에 수량이 찍혀 있었다.',
        succMoney: 5000,
        failText: '꿈인 줄 알고 웃어넘겼다가 계약이 무효가 됐다.',
      },
      {
        title: '📉 장부에 남은 수량',
        text: '정·재계 거물들의 수면이 장부에 수량으로 적혀 있다. {n}이(가) 밤마다 한 칸씩 지우면, 아침에 그들의 비자금이 사라진다.',
        check: (p) => ST(p).int >= 72 && ST(p).cha >= 68,
        rate: 0.84,
        succText: '비자금 장부를 통째로 넘겨받았다. 회계 장부가 곧 마법진이다.',
        succMoney: 26000,
        failText: '거물이 각성제를 먹고 나타나 미팅이 깨졌다.',
      },
      {
        title: '⏰ 영혼 담보 만기',
        text: '계약 만기일. 담보로 잡힌 영혼을 찾아온 회수자가 밤마다 문을 두드린다. 만기를 하루 더 미루려면 지금까지 모은 판을 전부 걸어야 한다.',
        check: (p) => ST(p).int >= 74,
        rate: 0.93,
        succText: '만기를 영원히 미뤘다. 이제 회수자들이 {n}의 회계 장부를 쓴다.',
        succMoney: 45000,
        failText: '만기를 넘겼다. 담보의 일부가 사라졌다.',
      },
    ],
  },

  // ── ⏳ 시간 정지의 여제: 3분 12초 동안 세상이 멈춘다 ──
  {
    id: 'hj_timequeen',
    name: '시간 정지의 여제',
    icon: '⏳',
    ready: (s, p) => p.sex === 'F' && A(s, p) >= 22 && A(s, p) <= 40 && ST(p).int >= 72 && ST(p).cha >= 70 && ST(p).mor <= 40,
    alt: { label: '멈춘 시간을 되돌려 놓는다', text: '주머니 속 시계를 벽에 던졌다. 시간이 다시 흐르기 시작했고, 세상은 아무 일도 없었다는 듯 지나갔다.', hap: 14, keepCash: 0.6 },
    steps: [
      {
        title: '⏳ 멈춘 시계',
        text: '지하철 손잡이를 잡은 순간이었다. 세상이 멈췄다. 사람도, 비둘기도, 쏟아지는 커피도. {n}만 움직일 수 있다. 3분 12초 동안.',
        check: (p) => ST(p).int >= 72,
        rate: 0.85,
        succText: '멈춘 세계를 걸어 다녔다. 아무도 기억하지 못할 3분.',
        succMoney: 6000,
        failText: '숨을 참은 탓에 12초 만에 시간이 다시 흘렀다.',
      },
      {
        title: '🏦 금고 앞의 3분',
        text: '은행 지하 금고, 경비원들의 시선이 허공에 멈춰 있다. 문이 열릴 때까지 {n}에게 주어진 시간은 3분뿐이다.',
        check: (p) => ST(p).int >= 74 && ST(p).cha >= 70,
        rate: 0.82,
        succText: '멈춘 시간 동안 금고 문이 열렸다. 돌아온 세계에는 빈 금고만 남았다.',
        succMoney: 30000,
        failText: '시간이 풀리는 순간 사이렌이 울렸다.',
      },
      {
        title: '👑 시간의 여제',
        text: '멈출 수 있는 시간이 분에서 시간으로 늘었다. 이제 {n}의 하루는 남들보다 길다. 시간 자체를 쥔 자의 대관식.',
        check: (p) => ST(p).int >= 76,
        rate: 0.94,
        succText: '세상의 시계가 {n}의 손끝을 따른다. 시간 정지의 여제 등극.',
        succMoney: 50000,
        failText: '너무 긴 시간을 멈춰 두는 바람에 몸이 늙었다.',
      },
    ],
  },

  // ── 🕯 색욕의 성녀: 고해실 뒤에서 사람의 욕망을 받아먹는 성녀 ──
  {
    id: 'hj_lustsaint',
    name: '색욕의 성녀',
    icon: '🕯',
    ready: (s, p) => p.sex === 'F' && A(s, p) >= 21 && A(s, p) <= 38 && ST(p).cha >= 72 && ST(p).mor <= 25,
    alt: { label: '성상(聖像)을 부순다', text: '성상을 부수고 고해실을 나왔다. 헌금은 흩어졌고, 대신 오래 잠들 수 있는 밤을 얻었다.', hap: 12, keepCash: 0.4 },
    steps: [
      {
        title: '🕯 밤의 고해실',
        text: '자정의 성당. 고해실 문 너머로 남자들의 목소리가 번갈아 흘러나온다. {n}은(는) 그 목소리에서 가장 달콤한 죄만 골라 받아 적는다.',
        check: (p) => ST(p).cha >= 72,
        rate: 0.88,
        succText: '고해실 앞에 줄이 생겼다. 봉헌금 상자가 밤마다 무거워진다.',
        succMoney: 5000,
        failText: '늙은 신부가 고해실을 잠가 버렸다.',
      },
      {
        title: '⛪ 순례자의 헌금',
        text: '성지 순례단이 {n}의 이름을 듣고 찾아왔다. 순례자들은 재산을 맡기고, {n}은 그들의 욕망을 대신 기도해 준다.',
        check: (p) => ST(p).cha >= 74 && ST(p).int >= 60,
        rate: 0.85,
        succText: '순례단의 헌금이 금고를 넘쳤다. 신자 수가 도시 인구를 넘어섰다.',
        succMoney: 22000,
        failText: '교구에서 조사관이 내려왔다.',
      },
      {
        title: '👑 성녀의 대관식',
        text: '바티칸에서 시성(諡聖) 심사관이 왔다. 심사관조차 고해실 앞에 무릎을 꿇는 밤, {n}의 이름이 기도문에 오른다.',
        check: (p) => ST(p).cha >= 76,
        rate: 0.93,
        succText: '색욕의 성녀 대관식. 이제 죄를 고백하는 사람들이 {n}의 이름으로 고백한다.',
        succMoney: 40000,
        failText: '심사관이 아니라 사냥꾼이었다.',
      },
    ],
  },
];

const ROUTE_MAP: Record<string, UltraRoute> = Object.fromEntries(ULTRA_ROUTES.map((r) => [r.id, r]));
const fill = (t: string, p: Person) => t.replaceAll('{n}', fullName(p));

/** 단일 대형 이벤트로 열리는 문 (조건을 채운 해에 한 번) */
interface SoloRoute {
  id: string;
  event: string;
  rate: number;
  ready: (s: GameState, p: Person) => boolean;
}
export const SOLO_ROUTES: SoloRoute[] = [
  {
    id: 'hj_perfumer',
    event: 'ult_perfumer',
    rate: 0.05,
    ready: (s, p) => p.sex === 'F' && A(s, p) >= 22 && A(s, p) <= 48 && ST(p).int >= 66 && ST(p).cha >= 62 && ST(p).mor <= 40,
  },
  {
    id: 'hj_sommelier',
    event: 'ult_sommelier',
    rate: 0.05,
    ready: (s, p) => p.sex === 'F' && A(s, p) >= 26 && A(s, p) <= 48 && ST(p).int >= 64 && ST(p).cha >= 60 && ST(p).mor <= 32 && personWorth(s, p) >= 20000,
  },
];

/** 죽음의 문턱: 목숨이 끊기는 순간 열리는 문. 앞쪽이 먼저 굴려진다 */
interface DeathRoute {
  id: string;
  event: string;
  rate: number;
  ready: (s: GameState, p: Person) => boolean;
}
export const DEATH_ROUTES: DeathRoute[] = [
  // 사이보그: 2040년 이후, 재산 50억 이상이면 죽음의 순간 35% 확률로 뇌 이식 수술 제안
  { id: 'hj_cyborg', event: 'ult_cyborg', rate: 0.35, ready: (s, p) => s.year >= 2040 && personWorth(s, p) >= 500000 },
  // 뱀파이어: 25세 이상, 도덕 50 이하 (아주 낮은 확률)
  { id: 'hj_vampire', event: 'ult_vampire', rate: 0.06, ready: (s, p) => A(s, p) >= 25 && ST(p).mor <= 50 },
];

/** 2040년 이후 사이보그 수술비: 재산 30% */
export const CYBORG_OP_COST = 0.3;
/** 40세까지 장가들지 못한 남성 가주가 41세에 신부를 만날 확률 */
export const GLITCH_MAID_RATE = 0.2;

/**
 * 사망 판정 직후 호출. 죽음이 다른 길로 바뀌면 true (그 해에는 죽지 않는다).
 * 거절하면 'fated_death' 플래그가 붙어 이듬해에 반드시 세상을 떠난다.
 */
export function deathRescue(s: GameState, p: Person): boolean {
  if (p.flags.includes('fated_death')) return false; // 인간으로 남기로 한 사람
  if (!isMainline(s, p)) return false;
  for (const r of DEATH_ROUTES) {
    if (p.flags.includes('ult:denied:' + r.id)) continue; // 한 번 닫힌 문은 다시 열리지 않는다
    if (!r.ready(s, p) || !chance(s, r.rate)) continue;
    addFlag(p, 'ult:denied:' + r.id);
    s.events.push({ uid: s.eventSeq++, defId: r.event, personId: p.id, data: { id: r.id } });
    return true;
  }
  return false;
}

/** 해마다: 히든의 히든의 문이 열리는지 살핀다 (연대기 메시지 반환) */
export function ultraHiddenYear(s: GameState): string[] {
  const msgs: string[] = [];

  // ④ 배우자 경로: 40세까지 장가들지 못한 남성 가주에게 41세에 안드로이드 신부가 온다
  const h = head(s);
  if (h.sex === 'M' && !h.spouseId && !h.partnerId && !h.flags.includes('ult:glitch') && age(s, h) === 41) {
    addFlag(h, 'ult:glitch');
    if (chance(s, GLITCH_MAID_RATE)) {
      s.events.push({ uid: s.eventSeq++, defId: 'ult_glitch', personId: h.id });
      msgs.push(`🎀 ${fullName(h)}의 집 앞에 이름 없는 상자가 놓였다.`);
    }
  }

  const people = Object.values(s.people).filter((p) => alive(p) && isMainline(s, p) && !p.job.startsWith('hj_'));

  for (const p of people) {
    // ③ 단일 대형 이벤트
    for (const r of SOLO_ROUTES) {
      if (p.flags.includes('ult:denied:' + r.id) || !r.ready(s, p) || !chance(s, r.rate)) continue;
      addFlag(p, 'ult:denied:' + r.id);
      s.events.push({ uid: s.eventSeq++, defId: r.event, personId: p.id, data: { id: r.id } });
      msgs.push(`🧿 ${fullName(p)}에게 「${HIDDEN_BY_ID[r.id].name}」의 문이 열렸다.`);
      break;
    }
    if (p.job.startsWith('hj_')) continue;

    // ② 3단계 연작 미션
    for (const r of ULTRA_ROUTES) {
      const f1 = `ul:${r.id}:1`;
      const f2 = `ul:${r.id}:2`;
      if (p.flags.includes(f2)) {
        if (!s.events.some((e) => e.defId === 'ult_step3' && e.personId === p.id)) s.events.push({ uid: s.eventSeq++, defId: 'ult_step3', personId: p.id, data: { id: r.id } });
        break;
      }
      if (p.flags.includes(f1)) {
        if (!s.events.some((e) => e.defId === 'ult_step2' && e.personId === p.id)) s.events.push({ uid: s.eventSeq++, defId: 'ult_step2', personId: p.id, data: { id: r.id } });
        break;
      }
      if (r.ready(s, p) && chance(s, 0.3) && (s.storySeen?.[`ul:${r.id}:${p.id}`] ?? -99) <= s.year - 12) {
        // 거절하면 12년은 다시 오지 않는다
        if (!s.events.some((e) => e.defId === 'ult_step1' && e.personId === p.id)) {
          s.events.push({ uid: s.eventSeq++, defId: 'ult_step1', personId: p.id, data: { id: r.id } });
          msgs.push(`🌒 ${fullName(p)}의 그림자가 조금 길어졌다 (${r.icon} ${r.name})`);
          break;
        }
      }
    }
  }
  return msgs;
}

/** 현금 → 자산 순으로 병원비를 걷는다 (모자라면 남은 금액은 빚이 된다) */
function payUp(s: GameState, p: Person, amount: number): number {
  let need = amount;
  const cash = Math.min(Math.max(0, p.cash), need);
  p.cash -= cash;
  need -= cash;
  for (const a of [...assetsOf(s, p.id)].sort((x, y) => y.value - x.value)) {
    if (need <= 0) break;
    const cut = Math.min(a.value, need);
    a.value -= cut;
    need -= cut;
  }
  if (need > 0) p.cash -= need; // 남은 수술비는 대출로
  return amount;
}

/** 히든의 히든 달성: 직업을 바꾸고 카드를 바로 준다 */
function ascend(x: Ctx, id: string, why: string): string {
  x.p.job = id;
  x.p.jobLevel = 0;
  x.p.jobYears = 0;
  x.p.flags = x.p.flags.filter((f) => !f.startsWith('prep:') && !f.startsWith(`ul:${id}`));
  addFlag(x.p, 'hidden:' + id);
  x.s.fame += 5;
  awardCard(x.s, x.p, id, why);
  const d = HIDDEN_BY_ID[id];
  return `\n\n🌒✨ [히든의 히든 해금] ${d.icon} ${d.name} 등극! (해마다 ${formatMoney(d.pay)} 수입)`;
}

// ─────────────────────────── 3단계 연작 미션 (2번 문) ───────────────────────────

const step1Event: EventDef = {
  id: 'ult_step1',
  title: (c) => ROUTE_MAP[c.ev.data.id]?.steps[0].title ?? '낯선 문',
  valid: (c) => alive(c.p) && !c.p.job.startsWith('hj_'),
  text: (c) => {
    const r = ROUTE_MAP[c.ev.data.id];
    return `${fill(r.steps[0].text, c.p)}\n\n🌒 [1단계] ${r.icon} ${r.name}의 첫 번째 문`;
  },
  choices: (c) => {
    const r = ROUTE_MAP[c.ev.data.id];
    return gate(c.s, [
      {
        label: '문을 두드린다',
        run: (x) => {
          if (r.steps[0].check(x.p) && chance(x.s, r.steps[0].rate)) {
            addFlag(x.p, `ul:${r.id}:1`);
            x.p.cash += r.steps[0].succMoney;
            x.p.happiness = clamp(x.p.happiness + 10, 0, 100);
            return `🎉 ${fill(r.steps[0].succText, x.p)} (+${formatMoney(r.steps[0].succMoney)})`;
          }
          return `❌ ${fill(r.steps[0].failText, x.p)}`;
        },
      },
      { label: '모르는 척 지나친다', run: (x) => {
          (x.s.storySeen ??= {})[`ul:${r.id}:${x.p.id}`] = x.s.year;
          return `문 앞에서 발길을 돌렸다. ${fullName(x.p)}의 밤은 평범하게 흘렀다.`;
        } },
    ]);
  },
};

const step2Event: EventDef = {
  id: 'ult_step2',
  title: (c) => ROUTE_MAP[c.ev.data.id]?.steps[1].title ?? '두 번째 문',
  valid: (c) => alive(c.p) && c.p.flags.includes(`ul:${c.ev.data.id}:1`) && !c.p.job.startsWith('hj_'),
  text: (c) => {
    const r = ROUTE_MAP[c.ev.data.id];
    return `${fill(r.steps[1].text, c.p)}\n\n🌒 [2단계] 되돌아올 수 없는 선`;
  },
  choices: (c) => {
    const r = ROUTE_MAP[c.ev.data.id];
    return gate(c.s, [
      {
        label: '선을 넘는다',
        run: (x) => {
          if (r.steps[1].check(x.p) && chance(x.s, r.steps[1].rate)) {
            addFlag(x.p, `ul:${r.id}:2`);
            x.p.cash += r.steps[1].succMoney;
            x.p.happiness = clamp(x.p.happiness + 15, 0, 100);
            return `🎉 ${fill(r.steps[1].succText, x.p)} (+${formatMoney(r.steps[1].succMoney)})`;
          }
          return `⚠️ ${fill(r.steps[1].failText, x.p)}`;
        },
      },
      {
        label: '여기서 손을 뗀다',
        run: (x) => {
          x.p.flags = x.p.flags.filter((f) => !f.startsWith(`ul:${r.id}`));
          return '위험한 문을 닫았다. 지금까지 얻은 것은 남았다.';
        },
      },
    ]);
  },
};

const step3Event: EventDef = {
  id: 'ult_step3',
  title: (c) => ROUTE_MAP[c.ev.data.id]?.steps[2].title ?? '마지막 문',
  valid: (c) => alive(c.p) && c.p.flags.includes(`ul:${c.ev.data.id}:2`) && !c.p.job.startsWith('hj_'),
  text: (c) => {
    const r = ROUTE_MAP[c.ev.data.id];
    return `${fill(r.steps[2].text, c.p)}\n\n🌒 [마지막 문] ${r.icon} ${r.name} — 여기서 모든 것을 걸거나, 평범한 사람으로 남는다`;
  },
  choices: (c) => {
    const r = ROUTE_MAP[c.ev.data.id];
    return gate(c.s, [
      {
        label: `모든 것을 걸고 ${r.name}이(가) 된다`,
        run: (x) => {
          if (r.steps[2].check(x.p) && chance(x.s, r.steps[2].rate)) {
            x.p.cash += r.steps[2].succMoney;
            x.p.happiness = clamp(x.p.happiness + 25, 0, 100);
            return `👑 ${fill(r.steps[2].succText, x.p)} (+${formatMoney(r.steps[2].succMoney)})` + ascend(x, r.id, '히든의 히든');
          }
          return `아쉽게 문턱에서 물러났다. ${fill(r.steps[2].failText, x.p)}`;
        },
      },
      {
        label: r.alt.label,
        run: (x) => {
          const keep = r.alt.keepCash ?? 1;
          if (keep < 1) x.p.cash = Math.round(Math.max(0, x.p.cash) * keep);
          x.p.happiness = clamp(x.p.happiness + (r.alt.hap ?? 20), 0, 100);
          x.p.flags = x.p.flags.filter((f) => !f.startsWith(`ul:${r.id}`));
          return `🕊 ${fill(r.alt.text, x.p)}`;
        },
      },
    ]);
  },
};

// ─────────────────────────── 단일 대형 이벤트 (3번 문) ───────────────────────────

const perfumer: EventDef = {
  id: 'ult_perfumer',
  title: () => '🧪 금지된 조향',
  valid: (c) => alive(c.p) && !c.p.job.startsWith('hj_'),
  text: (c) =>
    `무향(無香) 상점의 지하. 투명한 유리병 수백 개가 늘어선 방에서 조향사가 ${fullName(c.p)}의 손목 안쪽을 맡았다.\n\n"고객이 딱 한 분 계십니다. 사람을 녹이는 향을 원하시죠. 살아 있는 체취 한 방울이면 됩니다 — 대신 그 향은 끊을 수 없게 됩니다."`,
  choices: (c) =>
    gate(c.s, [
      {
        label: '조제를 맡는다 → 히든의 히든: 향의 연금술사',
        run: (x) => {
          x.p.actual.cha = clamp(x.p.actual.cha + 4, 0, x.p.potential.cha + 20);
          x.p.cash += 8000;
          x.p.happiness = clamp(x.p.happiness + 12, 0, 100);
          return `🧪 첫 병의 이름은 「목덜미」. 재벌가 사모님들이 줄을 섰다. (+${formatMoney(8000)})` + ascend(x, 'hj_perfumer', '금지된 조향');
        },
      },
      { label: '향을 뿌리고 나온다', run: (x) => `향을 뿌리고 계단을 올라왔다. ${fullName(x.p)}의 손목에서 하루 종일 낯선 냄새가 났다.` },
    ]),
};

const sommelier: EventDef = {
  id: 'ult_sommelier',
  title: () => '🥀 재벌가의 만찬',
  valid: (c) => alive(c.p) && !c.p.job.startsWith('hj_'),
  text: (c) =>
    `강남 저택의 만찬장. 열두 잔의 와인이 차례로 놓이고, 주최자는 아내 후보를 고르는 중이다.\n\n${fullName(c.p)}은(는) 혀끝에서 독을 분별한다. 세 잔은 안전하고, 네 번째 잔은 사람을 조용히 재우는 와인이다.`,
  choices: (c) =>
    gate(c.s, [
      {
        label: '네 번째 잔을 따른다 → 히든의 히든: 독의 소믈리에',
        run: (x) => {
          x.p.actual.int = clamp(x.p.actual.int + 3, 0, x.p.potential.int + 20);
          x.p.cash += 7000;
          x.p.happiness = clamp(x.p.happiness + 10, 0, 100);
          return `🥀 만찬이 끝난 뒤 유언장이 세 번 바뀌었다. 모두 ${fullName(x.p)}의 잔을 거친 뒤였다. (+${formatMoney(7000)})` + ascend(x, 'hj_sommelier', '재벌가 만찬');
        },
      },
      { label: '물을 청한다', run: (x) => `잔을 물로 바꿨다. ${fullName(x.p)}은(는) 그날 밤 조용히 집으로 돌아왔다.` },
    ]),
};

// ─────────────────────────── 죽음의 문턱 (1번 문) ───────────────────────────

const cyborg: EventDef = {
  id: 'ult_cyborg',
  title: () => '🦾 사이보그 수술',
  valid: (c) => alive(c.p) && !c.p.job.startsWith('hj_'),
  text: (c) => {
    const worth = personWorth(c.s, c.p);
    const cost = Math.round(worth * CYBORG_OP_COST);
    return `사고 현장. ${fullName(c.p)}의 심장이 멈추는 순간, 눈앞에 푸른 홀로그램이 떠올랐다.\n\n"생체 신호 소실. 뇌 이식 수술이 가능합니다. 비용은 재산의 30% — ${formatMoney(cost)}. 뼈대와 장기는 금속으로 대체됩니다. 기억은 그대로 남습니다. 진행할까요?"`;
  },
  choices: (c) =>
    gate(c.s, [
      {
        label: '수술대에 오른다 → 히든의 히든: 사이보그',
        run: (x) => {
          const cost = Math.round(personWorth(x.s, x.p) * CYBORG_OP_COST);
          payUp(x.s, x.p, cost);
          x.p.actual.hp = Math.max(x.p.actual.hp, 70);
          x.p.actual.str = clamp(x.p.actual.str + 10, 0, 100);
          x.p.happiness = clamp(x.p.happiness + 8, 0, 100);
          return `🦾 눈을 뜬 것은 3일 뒤였다. 손끝에서 모터 소리가 났다. 수술비 ${formatMoney(cost)}가 빠져나갔다.` + ascend(x, 'hj_cyborg', '뇌 이식 수술');
        },
      },
      {
        label: '인간으로 죽는다',
        run: (x) => {
          addFlag(x.p, 'fated_death');
          return `"…인간으로 남겠습니다." 홀로그램이 꺼졌다.\n\n${fullName(x.p)}의 생체 신호가 사라져 간다. 올해를 넘기지 못한다.`;
        },
      },
    ]),
};

const vampire: EventDef = {
  id: 'ult_vampire',
  title: () => '🧛 붉은 밤',
  valid: (c) => alive(c.p) && !c.p.job.startsWith('hj_'),
  text: (c) =>
    `${fullName(c.p)}의 심장이 멎으려 한다. 어둠 속에서 창백한 손이 내려왔다.\n\n"목숨이 아깝지 않습니까. 계약서라 부르지 않겠습니다 — 그냥 한 모금입니다. 대신 다시는 낮을 온전히 보지 못합니다."`,
  choices: (c) =>
    gate(c.s, [
      {
        label: '피를 나눈다 → 히든의 히든: 뱀파이어',
        run: (x) => {
          x.p.actual.hp = Math.max(x.p.actual.hp, 65);
          x.p.actual.mor = clamp(x.p.actual.mor - 20, 0, 100);
          x.p.happiness = clamp(x.p.happiness + 6, 0, 100);
          return `🧛 심장이 다시 뛰기 시작했다. 거울 앞에 섰지만, 거기에는 아무도 없었다. (도덕 −20)` + ascend(x, 'hj_vampire', '붉은 밤');
        },
      },
      {
        label: '인간으로 죽는다',
        run: (x) => {
          addFlag(x.p, 'fated_death');
          return `"…사람으로 죽겠습니다." 창백한 손이 어둠 속으로 사라졌다.\n\n${fullName(x.p)}의 생체 신호가 사라져 간다. 올해를 넘기지 못한다.`;
        },
      },
    ]),
};

// ─────────────────────────── 배우자 경로 (4번 문) ───────────────────────────

const glitch: EventDef = {
  id: 'ult_glitch',
  title: () => '🎀 이름 없는 상자',
  valid: (c) => alive(c.p) && !c.p.spouseId,
  text: (c) =>
    `${fullName(c.p)}의 집 앞에 사람 키만 한 상자가 놓여 있었다. 송장에도 발신인도 없다.\n\n뚜껑을 열자, 눈을 뜬 여자가 앉아 있었다. "배송 완료되었습니다. 명령만 내려주세요. 다만… 제 감정 모듈은 손대지 마세요."`,
  choices: (c) =>
    gate(c.s, [
      {
        label: '받아들인다 → 히든의 히든: 글리치 메이드',
        run: (x) => {
          const sp = createPerson(x.s, { sex: 'F', surname: pick(x.s, SURNAMES), birthYear: x.s.year - 24, quality: 82, grown: 0.95 });
          sp.potential.int = sp.potential.cha = sp.potential.hp = 95;
          sp.actual.int = 88;
          sp.actual.cha = 88;
          sp.actual.hp = 95;
          sp.actual.mor = 60;
          sp.cash = 0;
          sp.inLaw = true;
          sp.job = 'hj_glitchmaid';
          sp.jobLevel = 0;
          sp.jobYears = 0;
          addFlag(sp, 'hidden:hj_glitchmaid');
          addFlag(sp, 'android');
          marry(x.s, x.p, sp);
          awardCard(x.s, sp, 'hj_glitchmaid', '이름 없는 상자');
          x.p.happiness = clamp(x.p.happiness + 15, 0, 100);
          return `🎀 ${fullName(sp)}은(는) ${fullName(x.p)}의 취향을 학습해 3일 만에 완벽한 아내가 되었다. 감정 모듈 스위치는 켜진 채였다.` + `\n\n🌒✨ [히든의 히든 해금] 🎀 글리치 메이드 — 배우자 ${fullName(sp)}이(가) 카드를 갖는다`;
        },
      },
      { label: '상자를 반송한다', run: (x) => `택배 기사도 없이 상자가 사라졌다. ${fullName(x.p)}은(는) 그날 밤 유난히 깊이 잤다.` },
    ]),
};

export const ULTRA_HIDDEN_EVENTS: EventDef[] = [step1Event, step2Event, step3Event, perfumer, sommelier, cyborg, vampire, glitch];

/** 테스트용 */
export const _ultra = { ROUTE_MAP, SOLO_ROUTES, DEATH_ROUTES, payUp, ascend };
