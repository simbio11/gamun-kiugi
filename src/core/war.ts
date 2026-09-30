// 전쟁: 게임 속 가상의 미래 (2027년~). 한 해 약 1/150 확률로 터지고, 한번 터지면 10여 년 흐름이 이어진다.
//   전쟁 → (2년 뒤부터 해마다 12%) 휴전 → (해마다 15%) 종전 / (해마다 4%) 전쟁 재개. 20년이 넘으면 강제로 종전.
// 전쟁 동안: 국가총동원법, 징집(전사 위험), 군수·의료·식량 직업 호황, 관광·서비스 불황, 시장 폭락과 배급.
// 끝나면: 종전 선언, 전후 재건, 참전 용사 훈장. 시대마다 전쟁의 얼굴이 다르다 (세계 대전 → 자원 전쟁 → 행성 전쟁).
// 실제 국가·인물을 지목하지 않는다. 비극은 가볍게 다루지 않도록 선택지를 "가족이 겪은 일"로 둔다.
import { chance, int, pick } from './rng';
import { gate, schedule, type Choice, type Ctx, type EventDef } from './ev-util';
import { addHolding, formatMoney, setIncomeMul } from './economy';
import { wageIndex } from './pay';
import { shock } from './era';
import { unlock } from './achievements';
import { addFlag, age, alive, clamp, fullName, hasFlag, householder, isMainline } from './people';
import { awardHonor } from './rewards';
import type { GameState, Person } from './types';

interface WarKind {
  from: number;
  name: string;
  foe: string;
  front: string[];
  news: string[];
  truceNews: string[];
}
const KINDS: WarKind[] = [
  {
    from: 2027, name: '세계 대전', foe: '적대 동맹',
    front: ['서해', '동해 해상', '사이버 전선', '우주 궤도', '태평양'],
    news: ['동맹군, 서해 해상 봉쇄선 돌파', '사이버 공격으로 수도권 전력망 12시간 마비', '국가총동원법 2단계: 전 국민 비상 근무', '등화관제 훈련 매일 밤 9시', '배급표 제도 부활: 쌀·연료·약품',
      '적 드론 편대 요격, 민간 피해 최소화', '징집 연령 18~45세로 확대', '해외 교민 대피 작전', '전쟁 채권 발행, 국민 1인당 평균 200만 원 매입', '군수 공장 3교대 풀가동', '전쟁 고아 보호 시설 포화',
      '중립국 중재로 휴전 협상 시작설', '위성 요격 무기 첫 사용, 우주 쓰레기 경보', '피난민 100만 명, 남부 지방 임시 주택', '"전선에서 온 편지" 라디오 프로그램 청취율 1위'],
    truceNews: ['휴전 협정 서명, 비무장 지대 재설정', '포로 교환 시작', '휴전선 감시 드론 24시간 가동', '이산가족 소식 확인 센터 개설', '"휴전은 끝이 아니다" 정부 경계 태세 유지'],
  },
  {
    from: 2080, name: '자원 전쟁', foe: '자원 연합',
    front: ['북극 해저', '심해 광구', '달 궤도', '사이버 전선', '적도 우주 엘리베이터'],
    news: ['북극 해저 광구에서 무인 잠수함 교전', '우주 엘리베이터 경비 강화, 관광 전면 중단', '로봇 병력 투입, "사람은 후방에서 원격 조종"', '국가총동원법: 로봇 공장 전량 군수 전환', '희토류 배급제',
      '해상 도시 방어막 가동', '뉴럴 해킹 방지 긴급 업데이트', '달 기지 교대 인력 귀환 명령', '원격 조종병 징집, 게이머 출신 우대', '식량 자급률 비상, 배양육 공장 증설', '해저 케이블 절단으로 인터넷 반쪽'],
    truceNews: ['자원 공동 관리 조약 초안 합의', '심해 광구 비무장화', '로봇 병력 해체 작업 시작', '우주 엘리베이터 관광 재개 준비'],
  },
  {
    from: 2140, name: '행성 전쟁', foe: '화성 분리주의 정부',
    front: ['화성 궤도', '소행성대', '달 라그랑주점', '목성 항로'],
    news: ['화성 분리주의 정부, 지구행 수송선 봉쇄', '소행성대 광산 점령, 금속 값 폭등', '궤도 도시 방공 시스템 가동', '태양계 연합, 전 행성 총동원령', '화성 태생 이웃 향한 혐오 범죄 우려',
      '반물질 무기 금지 협약 긴급 회의', '행성간 통신 두절, 화성 가족 소식 끊겨', '달 독립국 중립 선언', '지구 식량 수출 전면 중단', '"우리는 같은 인류다" 양측 시민 평화 행진'],
    truceNews: ['화성-지구 휴전, 소행성대 공동 관리', '행성간 통신 재개, 가족 영상 편지 쏟아져', '화성 자치 확대 협상', '포로 우주선 교환'],
  },
];
const kindOf = (y: number) => KINDS.filter((k) => y >= k.from).pop()!;

const wi = (s: GameState) => wageIndex(s.year);
const hap = (p: Person, d: number) => (p.happiness = clamp(p.happiness + d, 0, 100));
const family = (s: GameState) => Object.values(s.people).filter((p) => alive(p) && isMainline(s, p));
const serving = (p: Person) => hasFlag(p, 'war_serving');
/** 징집 대상: 20~45세, 2060년 전엔 남자만 (그 뒤엔 성별 구분 없이) */
const draftable = (s: GameState, p: Person) => {
  const a = age(s, p);
  return a >= 20 && a <= 45 && !serving(p) && !hasFlag(p, 'war_exempt') && !p.flags.some((f) => f.startsWith('serving:')) && (p.sex === 'M' || s.year >= 2060) && !p.flags.includes('student');
};
export const atWar = (s: GameState) => s.war?.phase === 'war';
export const warOn = (s: GameState) => !!s.war;

// ───────── 직업 경기: 군수·의료·식량은 호황, 관광·여가는 불황 ─────────
const BOOM: Record<string, number> = {
  officer: 1.5, shipbuilder: 1.5, welder: 1.4, factory: 1.35, big_factory: 1.4, chip_engineer: 1.35, mech_engineer: 1.4, aero_engineer: 1.5, security: 1.4,
  doctor: 1.3, nurse: 1.35, emt: 1.4, farmer: 1.35, fisher: 1.2, rancher: 1.25, smart_farmer: 1.3, trucker: 1.25, electrician: 1.25, robot_tech: 1.5, drone_control: 1.5,
  space_tech: 1.4, asteroid_miner: 1.4, star_navigator: 1.3, journalist: 1.2, police: 1.15, firefighter: 1.15, researcher: 1.2,
  tour_guide: 0.35, hotelier: 0.5, flight_attendant: 0.5, pilot: 0.8, cafe_owner: 0.6, restaurant: 0.7, barista: 0.6, entertainer: 0.6, model: 0.5, wedding_planner: 0.4,
  nail_artist: 0.6, pet_groomer: 0.7, online_shop: 0.8, realtor: 0.5, youtuber: 0.8, musician: 0.7, painter: 0.7, gamer: 0.8, landlord: 0.8,
};
setIncomeMul((s, p) => {
  if (!s.war) return 1;
  const m = BOOM[p.job] ?? 0.95;
  return s.war.phase === 'war' ? m : 1 + (m - 1) * 0.4;
});

// ───────── 해마다 ─────────
export function warYear(s: GameState): string[] {
  const out: string[] = [];
  const seen = (s.storySeen ??= {});
  if (!s.war) {
    // 2027년 전(근현대사의 실제 역사)에는 일어나지 않는다. 지난 전쟁 뒤 40년은 평화.
    if (s.year < 2027 || s.year - (s.lastWarEnd ?? -999) < 40) return out;
    if (!chance(s, 1 / 150)) return out;
    const k = kindOf(s.year);
    s.war = { name: k.name, start: s.year, phase: 'war', dead: 0 };
    shock(s, { stock: -0.35, apt_seoul: -0.2, apt_local: -0.15, land: -0.1, coin: -0.3, art: -0.3, building: -0.2 });
    out.push(`📰 ⚔ ${k.name} 발발. ${k.foe}과(와) 전면전, 정부 국가총동원법 선포`);
    s.events.push({ uid: s.eventSeq++, defId: 'war_start', personId: householder(s).id });
    return out;
  }
  const w = s.war;
  const k = kindOf(w.start);
  const yrs = s.year - w.start;
  // 흐름: 전쟁 ↔ 휴전 → 종전
  if (w.phase === 'war' && yrs >= 2 && chance(s, 0.12)) {
    w.phase = 'truce';
    w.truceAt = s.year;
    out.push(`📰 🕊 ${pick(s, k.truceNews)}`);
    s.events.push({ uid: s.eventSeq++, defId: 'war_truce', personId: householder(s).id });
  } else if (w.phase === 'truce' && (chance(s, 0.15) || yrs >= 20)) {
    return endWar(s, out);
  } else if (w.phase === 'truce' && chance(s, 0.04)) {
    w.phase = 'war';
    out.push(`📰 ⚔ 휴전 붕괴, ${pick(s, k.front)}에서 전투 재개`);
    shock(s, { stock: -0.15, apt_seoul: -0.08 });
  } else if (yrs >= 20) return endWar(s, out);
  // 전쟁 뉴스
  const pool = w.phase === 'war' ? k.news : k.truceNews;
  const fresh = pool.filter((t) => seen['wn:' + t] === undefined);
  for (let i = 0; i < 2 && fresh.length; i++) {
    const t = fresh.splice(int(s, 0, fresh.length - 1), 1)[0];
    seen['wn:' + t] = s.year;
    out.push(`📰 ${w.phase === 'war' ? '⚔' : '🕊'} ${t}`);
  }
  if (w.phase === 'war') {
    out.push(`📰 ⚔ ${w.name} ${yrs + 1}년째, ${pick(s, k.front)} 전선 교착`);
    shock(s, { apt_seoul: -0.03, stock: chance(s, 0.5) ? -0.05 : 0.04 });
    for (const p of family(s)) hap(p, -3);
  }
  // 복무 중인 가족: 전사 위험, 제대
  for (const p of family(s)) {
    if (!serving(p)) continue;
    const since = Number(p.flags.find((f) => f.startsWith('war_since:'))?.slice(9) ?? s.year);
    if (w.phase === 'war' && chance(s, 0.035)) {
      s.events.push({ uid: s.eventSeq++, defId: 'war_kia', personId: p.id });
      continue;
    }
    if (s.year - since >= 3 || (w.phase === 'truce' && s.year - since >= 2)) {
      p.flags = p.flags.filter((f) => f !== 'war_serving' && !f.startsWith('war_since:'));
      addFlag(p, 'war_veteran');
      out.push(`🎖 ${fullName(p)}, 무사히 전역해 집으로 돌아왔다`);
      awardHonor(s, p, 'war_service', '전쟁 복무');
      unlock(s, 'war_veteran');
    }
  }
  // 징집: 전쟁 중 해마다 한 명쯤
  if (w.phase === 'war') {
    const cand = family(s).filter((p) => draftable(s, p));
    if (cand.length && chance(s, 0.55) && !s.events.some((e) => e.defId === 'war_draft')) s.events.push({ uid: s.eventSeq++, defId: 'war_draft', personId: pick(s, cand).id });
    // 전시 생활 사건
    const life = ['war_raid', 'war_ration', 'war_bond', 'war_refugee', 'war_factory', 'war_letter'].filter((id) => seen['wl:' + id] !== w.start);
    if (life.length && chance(s, 0.75)) {
      const id = pick(s, life);
      seen['wl:' + id] = w.start;
      s.events.push({ uid: s.eventSeq++, defId: id, personId: householder(s).id });
    }
  }
  return out;
}

function endWar(s: GameState, out: string[]): string[] {
  const w = s.war!;
  out.push(`📰 🕊 ${w.name} 종전 선언. ${s.year - w.start}년 만의 평화`);
  shock(s, { stock: 0.4, apt_seoul: 0.15, apt_local: 0.1, land: 0.08, art: 0.2 });
  s.lastWarEnd = s.year;
  s.events.push({ uid: s.eventSeq++, defId: 'war_end', personId: householder(s).id, data: { name: w.name, dead: w.dead, start: w.start } });
  s.war = undefined;
  // 복무 중이던 가족은 모두 귀환
  for (const p of family(s))
    if (serving(p)) {
      p.flags = p.flags.filter((f) => f !== 'war_serving' && !f.startsWith('war_since:'));
      addFlag(p, 'war_veteran');
      awardHonor(s, p, 'war_service', '전쟁 복무');
    }
  if (family(s).length) unlock(s, 'war_survived');
  schedule(s, 2, 'war_rebuild', householder(s).id);
  return out;
}

// ───────── 사건 ─────────
const ok = (label: string, text: string, fx?: (x: Ctx) => void): Choice => ({ label, run: (x) => (fx?.(x), text) });
const W = (s: GameState, v: number) => Math.round(v * Math.max(1, wi(s)));

const warStart: EventDef = {
  id: 'war_start',
  title: (c) => `⚔ ${c.s.war?.name ?? '전쟁'} 발발`,
  portraits: (c) => [c.p],
  text: (c) => `국가총동원법 선포\n\n새벽, 모든 기기에서 동시에 경보가 울렸다. ${kindOf(c.s.year).foe}과(와)의 전면전. 주가는 하루 만에 30% 넘게 빠졌고, 마트 앞엔 줄이 늘어섰다.\n가주로서 가족을 어떻게 지킬까?`,
  choices: (c) =>
    gate(c.s, [
      ok('남부 지방으로 피난한다', '짐을 싸서 남쪽 친척 집으로 내려갔다. 좁지만 식구가 다 모였다.', (x) => {
        householder(x.s).cash -= W(x.s, 500);
        for (const p of family(x.s)) hap(p, -4), (p.actual.hp = clamp(p.actual.hp + 1, 0, 100));
      }),
      ok('집을 지키며 비상 식량을 쌓는다', '라면·쌀·물·약을 지하 창고에 쌓았다. 밤마다 등화관제.', (x) => (householder(x.s).cash -= W(x.s, 200))),
      {
        label: '해외로 가족을 내보낸다',
        cost: W(c.s, 8000),
        run: (x) => {
          for (const p of family(x.s)) if (age(x.s, p) < 20) addFlag(p, 'war_exempt');
          x.s.fame = Math.max(0, x.s.fame - 3);
          return '아이들을 해외 친척 집에 보냈다. "있는 집은 다 도망갔다"는 소리를 들었다.';
        },
      },
      ok('전쟁 채권을 산다', '"나라가 있어야 가문도 있다." 여윳돈으로 전쟁 채권을 샀다.', (x) => {
        const v = Math.round(Math.min(Math.max(0, householder(x.s).cash) * 0.3, W(x.s, 5000)));
        householder(x.s).cash -= v;
        (x.s.storySeen ??= {})['war:bond'] = v;
        x.s.fame += 1;
      }),
    ]),
};

const draft: EventDef = {
  id: 'war_draft',
  title: () => '📜 소집 영장',
  portraits: (c) => [c.p],
  valid: (c) => atWar(c.s) && alive(c.p) && !serving(c.p),
  text: (c) => `${fullName(c.p)}(${age(c.s, c.p)}세) 앞으로 소집 영장이 날아왔다. 72시간 안에 부대로 가야 한다.`,
  choices: (c) => {
    const eng = ['chip_engineer', 'mech_engineer', 'aero_engineer', 'shipbuilder', 'researcher', 'robot_tech', 'developer', 'security', 'doctor', 'nurse'].includes(c.p.job);
    return gate(c.s, [
      ok('입대한다', '가족들과 역 앞에서 작별했다. "꼭 돌아올게."', (x) => {
        addFlag(x.p, 'war_serving');
        x.p.flags.push('war_since:' + x.s.year);
        hap(x.p, -5);
      }),
      ...(eng ? [ok('전문 인력으로 후방 근무를 신청한다', '군수 공장·군 병원으로 배치됐다. 위험은 덜하지만 일은 두 배다.', (x) => (addFlag(x.p, 'war_exempt'), addFlag(x.p, 'war_medic'), (x.p.actual.hp = clamp(x.p.actual.hp - 3, 0, 100))))] : []),
      {
        label: '용감하게 최전방을 자원한다',
        run: (x) => {
          addFlag(x.p, 'war_serving');
          x.p.flags.push('war_since:' + x.s.year);
          if (chance(x.s, 0.4)) {
            addFlag(x.p, 'war_hero');
            x.s.fame += 3;
            return '최전방에서 부대원들을 구해 냈다. 뉴스에 이름이 나왔다.';
          }
          return '최전방으로 갔다. 편지가 한동안 오지 않는다.';
        },
      },
      {
        label: '병역을 피한다',
        run: (x) => {
          if (chance(x.s, 0.5)) {
            addFlag(x.p, 'draft_dodger');
            x.s.fame = Math.max(0, x.s.fame - 6);
            (x.s.scandal = (x.s.scandal ?? 0) + 15);
            return '위장 질병으로 빠졌다가 들통났다. 가문 이름이 기피자 명단에 올랐다.';
          }
          addFlag(x.p, 'war_exempt');
          x.p.actual.mor = clamp(x.p.actual.mor - 5, 0, 100);
          return '빠져나갔다. 거울 속 얼굴을 오래 보지 못했다.';
        },
      },
    ]);
  },
};

const kia: EventDef = {
  id: 'war_kia',
  title: () => '✉ 전선에서 온 통지',
  portraits: (c) => [c.p],
  valid: (c) => alive(c.p) && serving(c.p),
  text: (c) => {
    c.ev.data ??= { dead: chance(c.s, 0.45) };
    return c.ev.data.dead ? `${fullName(c.p)}이(가) ${pick(c.s, kindOf(c.s.year).front)}에서 전사했다는 통지가 왔다.` : `${fullName(c.p)}이(가) ${pick(c.s, kindOf(c.s.year).front)} 전투에서 크게 다쳐 후송됐다.`;
  },
  choices: (c) => [
    {
      label: c.ev.data?.dead ? '…' : '병원으로 달려간다',
      run: (x) => {
        if (x.ev.data.dead) {
          // 실제 사망 처리(상속·승계)는 한 해가 넘어갈 때 sim.deaths가 한다
          addFlag(x.p, 'kia_pending');
          x.p.flags = x.p.flags.filter((f) => f !== 'war_serving' && !f.startsWith('war_since:'));
          if (x.s.war) x.s.war.dead++;
          for (const q of family(x.s)) if (q.id !== x.p.id) hap(q, -15);
          awardHonor(x.s, x.p, 'war_merit', '전사');
          return '온 가족이 무너졌다. 국립묘지에 이름이 새겨졌다. 나라는 무공훈장을 추서했다.';
        }
        x.p.actual.hp = clamp(x.p.actual.hp - 30, 5, 100);
        x.p.flags = x.p.flags.filter((f) => f !== 'war_serving' && !f.startsWith('war_since:'));
        addFlag(x.p, 'war_veteran');
        addFlag(x.p, 'war_wounded');
        awardHonor(x.s, x.p, 'war_merit', '부상');
        return '살아 돌아왔다. 다리를 절게 됐지만, 살아 있다.';
      },
    },
  ],
};

const truce: EventDef = {
  id: 'war_truce',
  title: () => '🕊 휴전',
  portraits: (c) => [c.p],
  text: () => '총성이 멎었다. 전쟁이 끝난 건 아니다. 휴전선 너머를 모두 불안하게 바라본다.\n가족은 이 틈에 무엇을 할까?',
  choices: () => [
    ok('떨어져 지낸 가족을 모은다', '몇 년 만에 식구가 한 상에 모였다.', (x) => {
      for (const p of family(x.s)) hap(p, 6);
    }),
    ok('폭락한 자산을 줍는다', '반값이 된 집과 주식을 조금씩 샀다. 전쟁이 다시 터지면 끝이다.', (x) => {
      const v = Math.round(Math.min(Math.max(0, householder(x.s).cash) * 0.25, W(x.s, 20000)));
      if (v > 0) (householder(x.s).cash -= v), addHolding(x.s, 'stock', householder(x.s).id, v);
    }),
    ok('아직 몸을 사린다', '비상 식량은 그대로 둔다.'),
  ],
};

const warEnd: EventDef = {
  id: 'war_end',
  title: () => '🕊 종전',
  portraits: (c) => [c.p],
  text: (c) => `${c.ev.data?.name ?? '전쟁'}이 ${c.s.year - (c.ev.data?.start ?? c.s.year)}년 만에 끝났다. 광장에 사람들이 쏟아져 나와 울고 웃는다.${c.ev.data?.dead ? `\n우리 가족 ${c.ev.data.dead}명은 돌아오지 못했다.` : ''}`,
  choices: (c) => {
    const bond = c.s.storySeen?.['war:bond'] ?? 0;
    return [
      ok(bond ? `전쟁 채권을 돌려받는다 (${formatMoney(Math.round(bond * 1.6))})` : '광장으로 나간다', bond ? '나라가 약속을 지켰다. 이자까지 붙었다.' : '모르는 사람들과 부둥켜안았다.', (x) => {
        if (bond) (householder(x.s).cash += Math.round(bond * 1.6)), (x.s.storySeen!['war:bond'] = 0);
        for (const p of family(x.s)) hap(p, 12);
      }),
      ok('희생된 이들을 기린다', '추모비 앞에 꽃을 놓았다.', (x) => {
        for (const p of family(x.s)) p.actual.mor = clamp(p.actual.mor + 2, 0, 100);
      }),
    ];
  },
};

const rebuild: EventDef = {
  id: 'war_rebuild',
  title: () => '🏗 전후 재건',
  portraits: (c) => [c.p],
  text: () => '폐허 위에 크레인이 선다. 정부가 재건 채권과 재건 사업자를 모집한다. 전쟁 전보다 더 크게 짓겠다고 한다.',
  choices: (c) =>
    gate(c.s, [
      {
        label: '재건 사업에 투자한다',
        cost: W(c.s, 3000),
        run: (x) => {
          if (chance(x.s, 0.65)) {
            householder(x.s).cash += W(x.s, 6500);
            addFlag(x.p, 'rebuilder');
            unlock(x.s, 'war_rebuild');
            return '재건 붐을 탔다. 투자금이 두 배가 넘게 돌아왔다.';
          }
          return '공사가 몇 년째 멈췄다. 돈이 묶였다.';
        },
      },
      ok('재건 현장에서 일한다', '벽돌을 날랐다. 새 학교가 올라가는 걸 보며 뿌듯했다.', (x) => {
        addFlag(x.p, 'rebuilder');
        x.p.actual.str = clamp(x.p.actual.str + 2, 0, 100);
        householder(x.s).cash += W(x.s, 800);
        unlock(x.s, 'war_rebuild');
      }),
      ok('일상으로 돌아간다', '아이들이 다시 학교에 간다. 그거면 됐다.'),
    ]),
};

// 전시 생활
const life = (id: string, title: string, text: string, choices: (c: Ctx) => Choice[]): EventDef => ({ id, title: () => title, text: () => text, choices, portraits: (c) => [c.p], valid: (c) => warOn(c.s) });
const LIFE: EventDef[] = [
  life('war_raid', '🚨 공습 경보', '한밤중 공습 경보. 아파트 지하 대피소로 내려가야 한다. 거동이 불편한 옆집 할머니가 걱정된다.', () => [
    ok('할머니를 업고 내려간다', '대피소에서 할머니가 손을 꼭 잡으셨다. 날이 밝자 동네 사람들이 고맙다고 했다.', (x) => ((x.p.actual.mor = clamp(x.p.actual.mor + 3, 0, 100)), (x.s.fame += 1))),
    ok('가족부터 챙겨 뛴다', '무사히 대피했다. 할머니도 다른 이웃이 모시고 왔다.', (x) => hap(x.p, -2)),
  ]),
  life('war_ration', '🎫 배급표', '쌀·연료·약이 배급제가 됐다. 암시장에선 두 배 값에 뭐든 판다.', (c) =>
    gate(c.s, [
      ok('배급만으로 버틴다', '허리띠를 졸라맸다. 아이들이 말랐다.', (x) => {
        for (const p of family(x.s)) (p.actual.hp = clamp(p.actual.hp - 2, 0, 100)), (p.actual.mor = clamp(p.actual.mor + 1, 0, 100));
      }),
      { label: '암시장에서 산다', cost: W(c.s, 600), run: (x) => ((x.p.actual.mor = clamp(x.p.actual.mor - 2, 0, 100)), '배는 불렀다. 마음 한편이 불편했다.') },
      ok('남는 식량을 이웃과 나눈다', '동네에 "그 집은 인심이 좋다"는 말이 돌았다.', (x) => ((x.s.fame += 1), hap(x.p, 2))),
    ]),
  ),
  life('war_bond', '💴 전쟁 채권', '"승리를 위한 채권" 광고가 매일 나온다. 종전 뒤 원금의 1.6배를 돌려준다고 한다. 지면 휴지 조각이다.', (c) =>
    gate(c.s, [
      {
        label: '크게 산다',
        cost: W(c.s, 4000),
        run: (x) => (((x.s.storySeen ??= {})['war:bond'] = (x.s.storySeen['war:bond'] ?? 0) + W(x.s, 4000)), (x.s.fame += 1), '채권 증서를 금고에 넣었다.'),
      },
      ok('사지 않는다', '현금이 최고다.'),
    ]),
  ),
  life('war_refugee', '🏚 피난민 가족', '북쪽에서 내려온 피난민 가족이 방 한 칸만 내어 달라고 한다. 아이가 셋이다.', () => [
    ok('방을 내어 준다', '좁아졌지만 집이 시끌벅적해졌다. 전쟁이 끝나고도 평생 연락하는 사이가 됐다.', (x) => {
      householder(x.s).cash -= W(x.s, 300);
      for (const p of family(x.s)) p.actual.mor = clamp(p.actual.mor + 2, 0, 100);
      x.s.fame += 1;
    }),
    ok('형편이 안 된다', '문을 닫았다. 그 아이들 눈빛이 오래 남았다.', (x) => hap(x.p, -3)),
  ]),
  life('war_factory', '🏭 군수 공장 특근', '군수 공장에서 사람을 구한다. 임금은 평소의 두 배, 대신 3교대 야간 근무다.', () => [
    ok('가족 중 일할 수 있는 사람이 나간다', '번 돈으로 식량을 샀다. 손바닥에 굳은살이 박였다.', (x) => ((householder(x.s).cash += W(x.s, 1200)), (x.p.actual.hp = clamp(x.p.actual.hp - 4, 0, 100)))),
    ok('집을 지킨다', '아이들 곁에 있었다.', (x) => hap(x.p, 1)),
  ]),
  life('war_letter', '✉ 소식 두절', '멀리 사는 가족과 연락이 끊겼다. 통신망이 끊긴 지 석 달째.', () => [
    {
      label: '적십자 소식 확인 센터에 간다',
      run: (x) => {
        if (chance(x.s, 0.7)) return (hap(x.p, 8), '살아 있다는 소식을 들었다! 적십자 편지 한 장에 온 가족이 울었다.');
        hap(x.p, -6);
        return '아직 명단에 없다. 이름을 적고 돌아왔다.';
      },
    },
    ok('기다린다', '매일 밤 창밖을 봤다.', (x) => hap(x.p, -3)),
  ]),
];

export const WAR_EVENTS: EventDef[] = [warStart, draft, kia, truce, warEnd, rebuild, ...LIFE];

/** 화면 위쪽 칩 */
export const warChip = (s: GameState) => (s.war ? (s.war.phase === 'war' ? `⚔ ${s.war.name} ${s.year - s.war.start + 1}년째` : `🕊 ${s.war.name} 휴전 중`) : '');
