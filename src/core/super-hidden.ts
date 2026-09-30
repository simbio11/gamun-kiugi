// 슈퍼 히든 직업: 3단계 연작 미션 체인.
// 단순 운빨 가챠가 아니라, 자격을 갖춘 자에게 확정적으로 퀘스트가 열리고,
// 빌드업을 완료한 유저는 80~95% 높은 확률로 격파해 나가는 치밀한 육성형 히든 시스템.

import { HIDDEN_BY_ID, isHoH, isSuperHidden } from './hidden-data';
import { gate, type EventDef } from './ev-util';
import { addFlag, age, alive, clamp, fullName, isMainline } from './people';
import { chance } from './rng';
import { myVehicles } from './vehicle';
import { formatMoney } from './economy';
import type { GameState, Person } from './types';
import { GATE_ONLY, GATE_READY } from './super-gates';

interface SuperRoute {
  id: string;
  name: string;
  icon: string;
  /** 1단계 트리거 자격 조건 */
  ready: (s: GameState, p: Person) => boolean;
  step1: {
    title: string;
    text: string;
    check: (p: Person) => boolean;
    rate: number;
    succText: string;
    succMoney: number;
    failText: string;
  };
  step2: {
    title: string;
    text: string;
    check: (p: Person) => boolean;
    rate: number;
    succText: string;
    succMoney: number;
    failText: string;
  };
  step3: {
    title: string;
    text: string;
    check: (p: Person) => boolean;
    rate: number;
    succText: string;
    succMoney: number;
    failText: string;
  };
}

const A = (s: GameState, p: Person) => age(s, p);
const ST = (p: Person) => p.actual;
const hasCar = (s: GameState, p: Person) => s.assets.some((a) => a.kind === 'vehicle' && a.ownerId === p.id) || myVehicles(s).length > 0;
const hasPC = (s: GameState) => !!s.gear?.pc;


type Step = [string, string, (p: Person) => boolean, number, string, number, string];
const stepOf = (x: Step) => ({ title: x[0], text: x[1], check: x[2], rate: x[3], succText: x[4], succMoney: x[5], failText: x[6] });
/** 가문에 슈퍼 히든 카드를 가진 사람이 있었나 (심층 슈퍼 히든의 문) */
export const hasSuperLineage = (s: GameState) => (s.cards ?? []).some((c) => isSuperHidden(c.id) && !isHoH(c.id));
/** 심층 슈퍼 히든: 슈퍼 히든 가문에서만 */
const H = (id: string, name: string, icon: string, ready: (s: GameState, p: Person) => boolean, a: Step, b: Step, c: Step): SuperRoute => ({
  id, name, icon, ready: (s, p) => hasSuperLineage(s) && ready(s, p), step1: stepOf(a), step2: stepOf(b), step3: stepOf(c),
});

export const SUPER_ROUTES: SuperRoute[] = [
  // 버튜버 여제: 노래 방송 → 브랜드 콜라보 → 3D 단독 콘서트
  {
    id: 'hj_vtuber',
    name: '버튜버 여제',
    icon: '🎧',
    ready: (s, p) => p.sex === 'F' && A(s, p) >= 20 && A(s, p) <= 27 && ST(p).cha >= 68 && ST(p).int >= 60 && hasPC(s),
    step1: {
      title: '🎤 첫 노래 방송',
      text: '방 안에서 몰래 부르던 노래를 아바타의 목소리로 처음 방송해 보기로 했다. 떨리는 손으로 방송 시작 버튼을 누른다.',
      check: (p) => ST(p).cha >= 68,
      rate: 0.88,
      succText: '청아한 목소리에 채팅창이 폭발했다. 하룻밤 새 구독자가 수천 명 늘었다.',
      succMoney: 3000,
      failText: '긴장해서 음이 흔들렸다. 다음을 기약했다.',
    },
    step2: {
      title: '🤝 대형 브랜드 콜라보',
      text: '유명 게임사와 음료 브랜드가 동시에 콜라보를 제안했다. 기획서와 대본을 직접 짜서 설득해야 한다.',
      check: (p) => ST(p).int >= 60 && ST(p).cha >= 70,
      rate: 0.85,
      succText: '콜라보 방송이 대성공! 편의점마다 {n}의 아바타가 그려진 음료가 깔렸다.',
      succMoney: 10000,
      failText: '조건이 맞지 않아 계약이 무산됐다.',
    },
    step3: {
      title: '🏟 3D 단독 콘서트',
      text: '드디어 3D 단독 콘서트. 동시 시청자 30만 명 앞에서 모션 캡처 장비가 멈췄다! 목소리 하나로 무대를 지켜야 한다.',
      check: (p) => ST(p).cha >= 72,
      rate: 0.95,
      succText: '장비 없이 부른 아카펠라에 모두가 울었다. 전 세계 실시간 트렌드 1위, 버튜버 여제로 등극했다.',
      succMoney: 20000,
      failText: '공연을 중단해야 했다. 팬들이 따뜻하게 위로했다.',
    },
  },

  // 드리프트 퀸: 아마추어 서킷 → 프로 데뷔 → 국제 챔피언십 (선천 특성 [질주본능] 필요, 2%)
  {
    id: 'hj_drifter',
    name: '드리프트 퀸',
    icon: '🏎️',
    ready: (s, p) => p.sex === 'F' && A(s, p) >= 19 && hasCar(s, p) && (p.traits?.includes('speed_demon') ?? false),
    step1: {
      title: '🏁 아마추어 서킷 대회',
      text: '주말 아마추어 드리프트 대회. 베테랑 참가자가 "초보가 올 데가 아니다"라며 웃는다. 타고난 감각으로 코너를 공략할 시간.',
      check: () => true,
      rate: 0.98,
      succText: '완벽한 각도의 드리프트로 심사위원 만점! 첫 우승 상금을 받았다.',
      succMoney: 4000,
      failText: '타이어 그립을 잃고 스핀했다. 다음 대회를 노린다.',
    },
    step2: {
      title: '📋 프로 팀 입단 테스트',
      text: '자동차 회사 레이싱 팀이 테스트 드라이버를 뽑는다. 최고의 기록을 낸 한 명만 계약서를 받는다.',
      check: () => true,
      rate: 0.98,
      succText: '헤어핀 코너에서 코스 레코드를 깼다! 프로 계약서에 사인했다.',
      succMoney: 10000,
      failText: '직선 구간에서 기록이 밀렸다.',
    },
    step3: {
      title: '🏆 국제 드리프트 챔피언십',
      text: '세계 챔피언십 결승. 비가 내리기 시작한 트랙, 상대는 3연패의 디펜딩 챔피언이다.',
      check: () => true,
      rate: 0.99,
      succText: '빗속에서 그린 완벽한 라인! 관중석이 일어섰다. 전설의 드리프트 퀸 등극.',
      succMoney: 20000,
      failText: '마지막 코너에서 아깝게 밀려 준우승했다.',
    },
  },

  // ───── 심층 슈퍼 히든: 슈퍼 히든을 배출한 가문에만 열리는 문 ─────
  H('hj_vampire', '핏빛 후작부인', '🌹', (s, p) => p.sex === 'F' && A(s, p) >= 30 && ST(p).cha >= 70 && ST(p).hp >= 60,
    ['🌹 붉은 초대장', '밀랍으로 봉한 붉은 초대장. "자정, 고성의 무도회에 오십시오."', (p) => ST(p).cha >= 70, 0.85, '무도회의 주인공이 됐다. 창백한 귀족들이 {n}에게 고개를 숙인다.', 5000, '자정 전에 발길을 돌렸다.'],
    ['🌒 영원의 계약', '늙은 후작이 오래된 계약서를 내민다. "서명하면 늙지 않는다. 대신 햇빛과는 작별이지."', (p) => ST(p).hp >= 60 && ST(p).cha >= 72, 0.82, '서명했다. 거울 속 얼굴이 멈췄다. 영원이 시작됐다.', 10000, '펜을 내려놓았다.'],
    ['🏰 고성의 안주인', '후작이 긴 잠에 들며 성의 열쇠를 {n}에게 넘긴다. "이제 밤은 당신의 것이오."', (p) => ST(p).cha >= 74, 0.9, '핏빛 후작부인. 천 년의 고성과 밤의 왕관을 물려받았다.', 22000, '열쇠를 받지 못했다.']),
  H('hj_timetraveler', '시간 정지의 여제', '⏳', (s, p) => p.sex === 'F' && A(s, p) >= 20 && ST(p).int >= 78,
    ['⏱ 멈춘 시계', '할머니의 손목시계가 멈추는 순간, 사무실의 모든 것이 멈췄다. 공중에 뜬 커피잔까지.', (p) => ST(p).int >= 78, 0.85, '멈춘 세상을 혼자 걸었다. 1초를 한 시간처럼 쓰는 법을 알았다.', 5000, '시계가 다시 흘렀다.'],
    ['❄ 얼어붙은 1초', '회사의 운명이 걸린 1초. 멈춘 시간 속에서 {n}만 움직일 수 있다.', (p) => ST(p).int >= 80, 0.82, '멈춘 1초 동안 모든 것을 바로잡았다. 아무도 눈치채지 못했다.', 12000, '시간이 너무 빨리 풀렸다.'],
    ['👑 시간 정지의 여제', '시간의 틈에서 목소리가 들린다. "멈춘 세상의 주인이 되어라."', (p) => ST(p).int >= 82, 0.9, '{n}은(는) 시간 정지의 여제가 되었다. 손가락 하나로 세상을 멈춘다.', 24000, '틈이 닫혔다.']),
];

// 직업마다의 새 사연(super-gates.ts)으로 문을 연다. 단계 성공률은 조금 낮춰 실패도 있게
for (const r of SUPER_ROUTES) {
  const gateReady = GATE_READY[r.id];
  const old = r.ready;
  if (gateReady) r.ready = GATE_ONLY.has(r.id) ? gateReady : (s, p) => gateReady(s, p) || old(s, p);
  for (const st of [r.step1, r.step2, r.step3]) st.rate = Math.max(0.6, st.rate - 0.1);
}

const ROUTE_MAP = Object.fromEntries(SUPER_ROUTES.map((r) => [r.id, r]));
const fill = (t: string, p: Person) => t.replaceAll('{n}', fullName(p));

/** 매년 시뮬레이션에서 슈퍼 히든 퀘스트 체인 검사 및 이벤트 큐 삽입 */
export function superHiddenYear(s: GameState): string[] {
  const msgs: string[] = [];
  const people = Object.values(s.people).filter((p) => alive(p) && isMainline(s, p));

  for (const p of people) {
    // 이미 히든 직업이면 스킵
    if (p.job.startsWith('hj_')) continue;

    for (const r of SUPER_ROUTES) {
      const f1 = `sh:${r.id}:1`;
      const f2 = `sh:${r.id}:2`;

      // 3단계 미션 체크
      if (p.flags.includes(f2)) {
        if (!s.events.some((e) => e.defId === 'sh_step3' && e.personId === p.id && e.data?.id === r.id)) {
          s.events.push({ uid: s.eventSeq++, defId: 'sh_step3', personId: p.id, data: { id: r.id } });
        }
        continue;
      }

      // 2단계 미션 체크
      if (p.flags.includes(f1)) {
        if (!s.events.some((e) => e.defId === 'sh_step2' && e.personId === p.id && e.data?.id === r.id)) {
          s.events.push({ uid: s.eventSeq++, defId: 'sh_step2', personId: p.id, data: { id: r.id } });
        }
        continue;
      }

      // 1단계 미션 체크 (희귀 선천 특성 보유 시 100% 즉시 발동, 일반 슈퍼히든 75%)
      if (r.ready(s, p)) {
        const hasRare = p.traits?.some((t) => ['speed_demon', 'hypnotic_eye', 'dark_artist'].includes(t));
        if ((hasRare || chance(s, 0.75)) && !s.events.some((e) => e.defId === 'sh_step1' && e.personId === p.id)) {
          s.events.push({ uid: s.eventSeq++, defId: 'sh_step1', personId: p.id, data: { id: r.id } });
          msgs.push(`✨ ${fullName(p)}에게 특별한 제안이 찾아왔다 (${r.icon} ${r.name})`);
          break;
        }
      }
    }
  }

  return msgs;
}

// ── 1단계 이벤트 정의 ──
const step1Event: EventDef = {
  id: 'sh_step1',
  title: (c) => ROUTE_MAP[c.ev.data.id]?.step1.title ?? '특별한 제의',
  valid: (c) => !!ROUTE_MAP[c.ev.data.id] && alive(c.p) && !c.p.job.startsWith('hj_'),
  text: (c) => {
    const r = ROUTE_MAP[c.ev.data.id];
    return `${fill(r.step1.text, c.p)}\n\n✨ [1단계 도전] ${r.icon} ${r.name}의 길`;
  },
  choices: (c) => {
    const r = ROUTE_MAP[c.ev.data.id];
    return gate(c.s, [
      {
        label: `도전한다 (자격 확인)`,
        run: (x) => {
          const ok = r.step1.check(x.p) && chance(x.s, r.step1.rate);
          if (ok) {
            addFlag(x.p, `sh:${r.id}:1`);
            x.p.cash += r.step1.succMoney;
            x.p.happiness = clamp(x.p.happiness + 10, 0, 100);
            return `🎉 성공! ${fill(r.step1.succText, x.p)} (+${formatMoney(r.step1.succMoney)})`;
          }
          return `❌ 실패. ${fill(r.step1.failText, x.p)}`;
        },
      },
      {
        label: '거절하고 평범하게 산다',
        run: (x) => `도전을 고사했다. ${fullName(x.p)}의 일상은 평화롭게 흘러간다.`,
      },
    ]);
  },
};

// ── 2단계 이벤트 정의 ──
const step2Event: EventDef = {
  id: 'sh_step2',
  title: (c) => ROUTE_MAP[c.ev.data.id]?.step2.title ?? '위기와 시련',
  valid: (c) => !!ROUTE_MAP[c.ev.data.id] && alive(c.p) && c.p.flags.includes(`sh:${c.ev.data.id}:1`) && !c.p.job.startsWith('hj_'),
  text: (c) => {
    const r = ROUTE_MAP[c.ev.data.id];
    return `${fill(r.step2.text, c.p)}\n\n🔥 [2단계 도전] 더 큰 무대, 더 큰 기회`;
  },
  choices: (c) => {
    const r = ROUTE_MAP[c.ev.data.id];
    return gate(c.s, [
      {
        label: `한 단계 더 나아간다 (2단계 돌파)`,
        run: (x) => {
          const ok = r.step2.check(x.p) && chance(x.s, r.step2.rate);
          if (ok) {
            addFlag(x.p, `sh:${r.id}:2`);
            x.p.cash += r.step2.succMoney;
            x.p.happiness = clamp(x.p.happiness + 15, 0, 100);
            return `🎉 대성공! ${fill(r.step2.succText, x.p)} (+${formatMoney(r.step2.succMoney)})`;
          }
          return `⚠️ 고비를 넘기지 못했다. ${fill(r.step2.failText, x.p)}`;
        },
      },
      {
        label: '여기서 멈추고 손을 뗀다',
        run: (x) => {
          x.p.flags = x.p.flags.filter((f) => !f.startsWith(`sh:${r.id}`));
          return `위험한 판에서 조용히 빠져나왔다. 번 돈은 지켰다.`;
        },
      },
    ]);
  },
};

// ── 3단계 클라이맥스 이벤트 정의 ──
const step3Event: EventDef = {
  id: 'sh_step3',
  title: (c) => ROUTE_MAP[c.ev.data.id]?.step3.title ?? '최종 결전',
  valid: (c) => !!ROUTE_MAP[c.ev.data.id] && alive(c.p) && c.p.flags.includes(`sh:${c.ev.data.id}:2`) && !c.p.job.startsWith('hj_'),
  text: (c) => {
    const r = ROUTE_MAP[c.ev.data.id];
    return `${fill(r.step3.text, c.p)}\n\n👑 [최종 각성] ${r.icon} ${r.name} 등극의 순간!`;
  },
  choices: (c) => {
    const r = ROUTE_MAP[c.ev.data.id];
    return gate(c.s, [
      {
        label: `모든 것을 걸고 정점에 선다 (최종 전직)`,
        run: (x) => {
          const ok = r.step3.check(x.p) && chance(x.s, r.step3.rate);
          if (ok) {
            const id = r.id;
            x.p.job = id;
            x.p.jobLevel = 0;
            x.p.jobYears = 0;
            x.p.cash += r.step3.succMoney;
            x.p.flags = x.p.flags.filter((f) => !f.startsWith(`sh:${id}`));
            addFlag(x.p, 'hidden:' + id);
            x.p.happiness = clamp(x.p.happiness + 25, 0, 100);
            x.s.fame += 5;
            return `👑 ${fill(r.step3.succText, x.p)}\n\n✨ [슈퍼 히든 해금] ${HIDDEN_BY_ID[id].icon} ${HIDDEN_BY_ID[id].name} 전직 완료! (+${formatMoney(r.step3.succMoney)})`;
          }
          return `아쉽게 정점의 문턱에서 물러났다. ${fill(r.step3.failText, x.p)}`;
        },
      },
      {
        label: '마지막 순간 평범한 삶을 택한다',
        run: (x) => {
          x.p.flags = x.p.flags.filter((f) => !f.startsWith(`sh:${r.id}`));
          return `모든 욕망을 내려놓고 평온한 일상으로 돌아왔다.`;
        },
      },
    ]);
  },
};

export const SUPER_HIDDEN_EVENTS: EventDef[] = [step1Event, step2Event, step3Event];
