// 살면서 꼭 한 번씩 드는 큰돈: 산후조리원, 장례, 운전면허, 반려동물. 금액은 2025년 조사 기준에 물가를 반영.
// · 산후조리원 2주: 전국 일반실 평균 372만·특실 543만, 서울 민간 평균 490~543만, 공공 170~230만 (2025 하반기 보건복지부 조사 보도)
// · 장례 3일장: 평균 1,300~1,500만 (한국소비자원·상조업계). 빈소 사용료 공설 275만 < 전문 364만 < 대학병원 427만
// · 1종 보통 운전면허 학원비: 전국 평균 77만 (2025)
// · 반려견: 1마리 월 16.1만, 반려가구 월 19.4만, 2년간 치료비 약 103만 (KB 2025 한국 반려동물 보고서)
import type { GameState, Person } from './types';
import type { Choice, Ctx, EventDef } from './ev-util';
import { chance, int } from './rng';
import { formatMoney, pay } from './economy';
import { wageIndex } from './pay';
import { addFlag, age, alive, clamp, fullName, hasFlag, head, householder, markOf, relationLabel, spouseOf } from './people';

const W = (s: GameState, v: number) => Math.round(v * wageIndex(s.year));
const hh = (s: GameState) => householder(s);

// ───────────────────────── 산후조리원 ─────────────────────────

const postnatal: EventDef = {
  id: 'postnatal',
  title: () => '🍼 산후조리',
  text: (c) => {
    const mom = c.s.people[c.ev.data?.momId] ?? c.p;
    return (
      `${fullName(mom)}의 출산 후 몸조리를 어떻게 할까?\n` +
      `요즘 산모 열에 여덟 명 이상이 산후조리원에 간다. 2주 평균은 전국 일반실 ${formatMoney(W(c.s, 372))}, 서울은 500만 원 안팎. 공공 산후조리원은 절반값이지만 추첨이다.`
    );
  },
  choices: (c) => {
    const s = c.s;
    const mom = s.people[c.ev.data?.momId] ?? c.p;
    const heal = (x: Ctx, hp: number, hap: number) => {
      mom.actual.hp = clamp(mom.actual.hp + hp, 0, mom.potential.hp);
      mom.happiness = clamp(mom.happiness + hap, 0, 100);
      return x;
    };
    const opts: Choice[] = [
      {
        label: `공공 산후조리원 추첨 (2주 ${formatMoney(W(s, 200))})`,
        run: (x) => {
          if (chance(s, 0.3)) {
            pay(s, hh(s), W(s, 200));
            heal(x, 4, 5);
            return '당첨! 시설도 깔끔하고 밥도 맛있다. 반값에 똑같이 쉬었다.';
          }
          pay(s, hh(s), W(s, 372));
          heal(x, 4, 3);
          return '대기 순번 40번… 결국 동네 민간 조리원 일반실로 갔다.';
        },
      },
      {
        label: `동네 조리원 일반실 (2주 ${formatMoney(W(s, 372))})`,
        cost: W(s, 372),
        run: (x) => (heal(x, 5, 5), '신생아실 선생님들이 수유부터 목욕까지 알려 줬다. 2주 동안 잠은 원 없이 잤다.'),
      },
      {
        label: `강남 조리원 특실 (2주 ${formatMoney(W(s, 1700))})`,
        cost: W(s, 1700),
        run: (x) => {
          heal(x, 6, 9);
          s.fame += 1;
          return '호텔 같은 특실에 마사지, 요가, 전속 셰프. 조리원 동기 모임이 곧 인맥이 됐다.';
        },
      },
      {
        label: '친정·집에서 산후도우미와 (정부 바우처)',
        run: (x) => {
          pay(s, hh(s), W(s, 120));
          heal(x, 2, 1);
          const sp = spouseOf(s, mom);
          if (sp && alive(sp)) sp.bond = mom.bond = clamp((mom.bond ?? 60) + 3, 0, 100);
          return '정부 지원 산후도우미가 집으로 왔다. 가족이 함께 아기를 돌보며 더 가까워졌다. 대신 산모는 좀 더 지쳤다.';
        },
      },
    ];
    return opts;
  },
};

/** 가주 부부가 아이를 낳으면 산후조리를 고른다 */
export function queuePostnatal(s: GameState, mom: Person, dad: Person) {
  const h = head(s);
  if (![mom.id, dad.id].includes(h.id) || s.events.some((e) => e.defId === 'postnatal')) return;
  s.events.push({ uid: s.eventSeq++, defId: 'postnatal', personId: h.id, data: { momId: mom.id } });
}

// ───────────────────────── 장례 ─────────────────────────

/** 조문객 수: 고인·상주의 사회적 관계가 넓을수록 많다 */
function guests(s: GameState, dead: Person): number {
  const h = head(s);
  const net = markOf(h, 'network') + markOf(dead, 'network');
  return clamp(Math.round(120 + s.fame * 3 + net * 25 + dead.jobLevel * 30 + int(s, -30, 60)), 60, 900);
}

const funeral: EventDef = {
  id: 'funeral',
  title: (c) => `🕯 ${fullName(c.s.people[c.ev.data.deadId])}의 장례`,
  valid: (c) => !!c.s.people[c.ev.data?.deadId],
  text: (c) => {
    const d = c.s.people[c.ev.data.deadId];
    c.ev.data.guests ??= guests(c.s, d);
    return (
      `${relationLabel(c.s, d)} ${fullName(d)}을(를) 떠나보낸다. 상주는 ${fullName(c.p)}.\n` +
      `조문객은 ${c.ev.data.guests}명쯤 올 것 같다. 3일장 평균 비용은 1,300~1,500만 원, 대부분 부의금으로 일부를 메운다.`
    );
  },
  choices: (c) => {
    const s = c.s;
    const d = s.people[c.ev.data.deadId];
    const g: number = c.ev.data.guests ?? 150;
    const settle = (cost: number, guestShare: number, per: number) => {
      const got = Math.round(g * guestShare * per * wageIndex(s.year));
      pay(s, hh(s), W(s, cost));
      hh(s).cash += got;
      return `장례비 ${formatMoney(W(s, cost))} · 부의금 ${formatMoney(got)}`;
    };
    return [
      {
        label: `무빈소 가족장 + 화장 (약 ${formatMoney(W(s, 500))})`,
        run: () => {
          const r = settle(500, 0.15, 10);
          return `가족끼리 조용히 보내 드렸다. 부고는 장례가 끝난 뒤에 알렸다. 서운해하는 친척도 있었다.\n${r}`;
        },
      },
      {
        label: `전문 장례식장 3일장 + 봉안당 (약 ${formatMoney(W(s, 1400))})`,
        cost: Math.round(W(s, 1400) * 0.5),
        run: (x) => {
          const r = settle(1400, 1, 6);
          x.p.happiness = clamp(x.p.happiness + 2, 0, 100);
          return `사흘 동안 조문객을 맞았다. 육개장 냄새, 밤샘, 발인. 오랜만에 친척들이 다 모였다.\n${r}`;
        },
      },
      {
        label: `대학병원 특실 + 선산 매장 (약 ${formatMoney(W(s, 2800))})`,
        cost: Math.round(W(s, 2800) * 0.6),
        run: () => {
          const r = settle(2800, 1.3, 7);
          s.fame += 2;
          return `근조화환이 복도를 가득 채웠다. 선산에 모시고 봉분을 올렸다. "마지막 가시는 길은 번듯하게."\n${r}`;
        },
      },
      {
        label: `3일장 + 수목장 (약 ${formatMoney(W(s, 1100))})`,
        cost: Math.round(W(s, 1100) * 0.5),
        run: () => {
          const r = settle(1100, 0.9, 6);
          return `${fullName(d)}의 뜻대로 산자락 참나무 아래 모셨다. 해마다 이 나무를 보러 오기로 했다.\n${r}`;
        },
      },
    ];
  },
};

/** 가족이 세상을 떠나면 (가주가 성인이고 살림을 맡고 있을 때) 장례를 치른다 */
export function queueFuneral(s: GameState, dead: Person) {
  const h = head(s);
  if (age(s, h) < 20 || householder(s).id !== h.id) return;
  s.events.push({ uid: s.eventSeq++, defId: 'funeral', personId: h.id, data: { deadId: dead.id } });
}

// ───────────────────────── 반려동물 ─────────────────────────

/** 반려견 연 양육비 (월 16.1만) */
export const PET_YEAR = 193;

export function petUpkeep(s: GameState, ids: Set<string>): number {
  return [...ids].some((id) => s.people[id] && alive(s.people[id]) && hasFlag(s.people[id], 'pet')) ? W(s, PET_YEAR) : 0;
}

export function hasLicense(p: Person): boolean {
  return hasFlag(p, 'license');
}
export function grantLicense(p: Person) {
  addFlag(p, 'license');
}

export const LIFECOST_EVENTS = [postnatal, funeral];
