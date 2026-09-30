// 부모의 짐: 어려움·지옥 난이도(와 운명에 맡긴 가난한 집 일부)에서 부모 한 명이 안고 시작하는 문제.
// 해마다 돈이 새고, 가끔 일이 터진다. 치료(돈)나 공공 지원(무료)으로 벗어날 수 있지만 중독은 재발한다.
// 근거: 2021 정신건강실태조사(알코올 사용장애 평생유병률 11.6%, 우울 7.7%), 사행산업통합감독위원회 도박문제 실태조사,
// 법정 최고금리 20%, 중독관리통합지원센터·한국도박문제예방치유원(1336)·서민금융진흥원·신용회복위원회·국민취업지원제도.

import { chance, int, pick } from './rng';
import { eun, iga, type Choice, type EventDef } from './ev-util';
import { addFlag, age, alive, clamp, fullName, hasFlag, head, mark, parentsOf, relationLabel } from './people';
import type { GameState, Person } from './types';

export type WoeId = 'alcohol' | 'gamble' | 'chronic' | 'injury' | 'depression' | 'loan' | 'guarantee' | 'jobless' | 'shopping' | 'smoking';

interface Cure {
  label: string;
  cost: number;
  /** 벗어날 확률 */
  cure: number;
  ok: string;
  fail: string;
}
interface Woe {
  name: string;
  icon: string;
  desc: string;
  /** 해마다 새는 돈 (만원, 가계부 항목) */
  yearly: number;
  yearlyLabel: string;
  /** 해마다 건강 */
  hp?: number;
  /** 일이 터지는 확률 */
  evChance: number;
  lines: string[];
  /** 터졌을 때 바로 입는 피해 */
  hit: (s: GameState, p: Person) => string;
  treat: Cure;
  free: Cure;
  /** 벗어난 뒤 해마다 재발 확률 */
  relapse?: number;
  /** 시작할 때 처지 */
  setup?: (s: GameState, p: Person) => void;
}

const fam = (s: GameState, n: number) => {
  const h = head(s);
  h.happiness = clamp(h.happiness + n, 0, 100);
};

export const WOES: Record<WoeId, Woe> = {
  alcohol: {
    name: '알코올 의존',
    icon: '🍶',
    desc: '매일 소주 두세 병. 술만 들어가면 딴사람이 된다',
    yearly: 240,
    yearlyLabel: '술값',
    hp: -2,
    evChance: 0.3,
    lines: ['새벽 두 시, 술에 취해 들어와 살림을 부쉈다.', '음주운전 단속에 걸렸다.', '회사에서 술 냄새 때문에 경고를 받았다.', '건강검진에서 간 수치가 위험하다고 나왔다.'],
    hit: (s, p) => {
      if (chance(s, 0.35)) {
        p.cash -= 800;
        return '음주운전 벌금 800만 원. 면허도 취소됐다.';
      }
      fam(s, -8);
      return '아이가 방문을 잠그고 운다.';
    },
    treat: { label: '알코올 전문병원 입원 치료 (3개월)', cost: 450, cure: 0.45, ok: '석 달 만에 맑은 눈으로 돌아왔다. 술잔 대신 보리차를 든다.', fail: '퇴원 한 달 만에 다시 술을 입에 댔다.' },
    free: { label: '중독관리통합지원센터 상담 (무료)', cost: 0, cure: 0.15, ok: '상담사와 단주 모임에 꾸준히 나가더니 술을 끊었다.', fail: '두 번 나가고 그만뒀다.' },
    relapse: 0.12,
  },
  gamble: {
    name: '도박 중독',
    icon: '🎰',
    desc: '경마·스포츠토토·불법 온라인 도박. 월급날이면 사라진다',
    yearly: 0,
    yearlyLabel: '',
    evChance: 0.45,
    lines: ['월급 통장이 또 비었다. "이번엔 진짜 딴다"더니.', '모르는 번호로 빚 독촉 전화가 온다.', '집 보증금을 몰래 빼려다 들켰다.', '"한 번만 더"라며 가족 카드를 들고 나갔다.'],
    hit: (s, p) => {
      const lost = int(s, 600, 2500);
      p.cash -= lost;
      fam(s, -6);
      return `${lost.toLocaleString()}만 원이 사라졌다.`;
    },
    treat: { label: '도박문제 치유 입소 프로그램', cost: 200, cure: 0.4, ok: '입소 치료를 마치고 앱을 모두 지웠다. 통장은 가족이 관리한다.', fail: '나오자마자 다시 손을 댔다.' },
    free: { label: '1336 도박문제 상담 전화 (무료)', cost: 0, cure: 0.15, ok: '상담 끝에 스스로 출입 제한 신청을 했다.', fail: '"나는 중독 아니야." 전화를 끊었다.' },
    relapse: 0.18,
  },
  chronic: {
    name: '당뇨 합병증',
    icon: '💉',
    desc: '관리 안 된 당뇨로 신장·눈이 나빠지고 있다. 투석 직전',
    yearly: 360,
    yearlyLabel: '약값·통원비',
    hp: -2,
    evChance: 0.25,
    lines: ['쓰러져 응급실에 실려 갔다.', '의사가 투석을 준비하자고 한다.', '발의 상처가 낫지 않는다.'],
    hit: (_s, p) => {
      p.cash -= 500;
      p.actual.hp = clamp(p.actual.hp - 5, 0, 100);
      return '입원비 500만 원 (산정특례 적용 후).';
    },
    treat: { label: '대학병원 집중 관리·식단 교육', cost: 300, cure: 0.35, ok: '혈당이 잡혔다. 합병증 진행이 멈췄다.', fail: '관리가 오래가지 못했다.' },
    free: { label: '보건소 만성질환 관리 프로그램 (무료)', cost: 0, cure: 0.12, ok: '보건소 간호사가 매달 챙겨 준 덕에 수치가 좋아졌다.', fail: '보건소 가는 날을 자꾸 잊는다.' },
  },
  injury: {
    name: '허리디스크 (산재 후유증)',
    icon: '🦴',
    desc: '공사장에서 다친 허리. 무거운 걸 못 들어 일을 자주 쉰다',
    yearly: 150,
    yearlyLabel: '물리치료비',
    hp: -1,
    evChance: 0.3,
    lines: ['아침에 일어나지 못할 만큼 허리가 아프다.', '통증 때문에 한 달을 쉬었다.', '진통제 없이는 잠을 못 잔다.'],
    hit: (_s, p) => {
      p.cash -= 400;
      return '한 달 일을 쉬어 400만 원을 못 벌었다.';
    },
    treat: { label: '척추 수술', cost: 700, cure: 0.6, ok: '수술이 잘 됐다. 다시 허리를 편다.', fail: '수술했는데도 통증이 남았다.' },
    free: { label: '근로복지공단 산재 재심사 청구 (무료)', cost: 0, cure: 0.3, ok: '산재가 인정돼 치료비와 휴업급여를 받았다.', fail: '"업무와 인과관계 불충분." 기각됐다.' },
  },
  depression: {
    name: '우울증',
    icon: '🌧',
    desc: '몇 년째 무기력하다. 방 밖으로 잘 나오지 않는다',
    yearly: 0,
    yearlyLabel: '',
    hp: -1,
    evChance: 0.3,
    lines: ['며칠째 출근을 못 했다.', '"다 내 탓이야"라는 말을 자주 한다.', '아이 졸업식에도 오지 못했다.'],
    hit: (s, p) => {
      if (p.job !== 'none' && chance(s, 0.25)) {
        p.job = 'none';
        p.jobLevel = 0;
        return '결국 직장을 그만뒀다.';
      }
      fam(s, -6);
      p.happiness = clamp(p.happiness - 10, 0, 100);
      return '집 안 공기가 무겁다.';
    },
    treat: { label: '정신건강의학과 꾸준한 치료 (1년)', cost: 150, cure: 0.5, ok: '약과 상담으로 조금씩 웃음을 되찾았다.', fail: '약을 끊더니 다시 가라앉았다.' },
    free: { label: '정신건강복지센터 상담 (무료)', cost: 0, cure: 0.25, ok: '센터 상담사 덕분에 다시 일어설 힘이 생겼다.', fail: '상담 날 문을 열지 않았다.' },
    relapse: 0.08,
  },
  loan: {
    name: '불법 사채 빚',
    icon: '🩸',
    desc: '생활비로 빌린 급전이 불어나 사채까지 손댔다. 이자가 이자를 낳는다',
    yearly: 480,
    yearlyLabel: '사채 이자',
    evChance: 0.35,
    lines: ['추심업자가 집 앞에 찾아왔다.', '직장으로 독촉 전화가 온다.', '대문에 빨간 글씨가 붙었다.'],
    hit: (s, p) => {
      p.cash -= 500;
      fam(s, -8);
      return '급한 대로 500만 원을 막았다. 아이가 겁에 질렸다.';
    },
    treat: { label: '법무사 통해 개인회생 신청', cost: 150, cure: 0.7, ok: '개인회생이 받아들여졌다. 추심이 멈추고 갚을 수 있는 만큼만 갚는다.', fail: '서류가 반려됐다. 다시 준비해야 한다.' },
    free: { label: '서민금융진흥원 채무조정 상담 (1397, 무료)', cost: 0, cure: 0.35, ok: '불법 사채는 신고하고, 나머지는 저금리로 바꿨다.', fail: '조건이 안 맞는다고 한다.' },
    setup: (s, p) => {
      p.cash -= int(s, 2000, 5000);
    },
  },
  guarantee: {
    name: '친척 보증 빚',
    icon: '📜',
    desc: '사업하던 친척의 보증을 섰다가 빚을 떠안았다',
    yearly: 300,
    yearlyLabel: '보증 빚 상환',
    evChance: 0.25,
    lines: ['채권자가 월급을 압류했다.', '보증 섰던 친척은 연락이 끊겼다.', '법원에서 지급명령 등기가 왔다.'],
    hit: (_s, p) => {
      p.cash -= 1000;
      return '압류로 1,000만 원이 빠져나갔다.';
    },
    treat: { label: '법무사 통해 개인회생 신청', cost: 150, cure: 0.7, ok: '개인회생 인가. 이제 숨 쉴 틈이 생겼다.', fail: '서류가 반려됐다.' },
    free: { label: '신용회복위원회 채무조정 (무료)', cost: 0, cure: 0.35, ok: '이자를 깎고 10년에 나눠 갚기로 했다.', fail: '채권자가 동의하지 않았다.' },
    setup: (s, p) => {
      p.cash -= int(s, 4000, 9000);
    },
  },
  jobless: {
    name: '장기 실업',
    icon: '🪑',
    desc: '회사가 문을 닫은 뒤 몇 년째 일을 구하지 못했다. 이제는 구직도 포기했다',
    yearly: 0,
    yearlyLabel: '',
    evChance: 0.3,
    lines: ['하루 종일 TV만 본다.', '"이 나이에 누가 써 주냐"며 한숨을 쉰다.', '부부 싸움이 잦아졌다.'],
    hit: (s) => {
      fam(s, -5);
      return '집 안 분위기가 싸늘하다.';
    },
    treat: { label: '직업훈련(내일배움카드)·자격증 준비', cost: 100, cure: 0.5, ok: '', fail: '면접에서 번번이 떨어졌다.' },
    free: { label: '국민취업지원제도 신청 (무료)', cost: 0, cure: 0.35, ok: '', fail: '상담만 받고 흐지부지됐다.' },
    setup: (_s, p) => {
      p.job = 'none';
      p.jobLevel = 0;
    },
  },
  shopping: {
    name: '홈쇼핑·충동구매',
    icon: '🛍',
    desc: '새벽 홈쇼핑과 카드 할부. 택배 상자가 쌓인다',
    yearly: 480,
    yearlyLabel: '충동구매 카드값',
    evChance: 0.3,
    lines: ['카드값 연체 문자가 왔다.', '뜯지도 않은 택배가 베란다에 가득하다.', '리볼빙 이자가 눈덩이처럼 불었다.'],
    hit: (_s, p) => {
      p.cash -= 700;
      return '리볼빙 잔액 700만 원을 한꺼번에 막았다.';
    },
    treat: { label: '상담 치료 + 신용카드 전부 해지', cost: 80, cure: 0.45, ok: '카드를 자르고 체크카드만 쓴다. 통장이 조금씩 찬다.', fail: '몰래 새 카드를 만들었다.' },
    free: { label: '가족이 통장을 맡아 관리한다', cost: 0, cure: 0.3, ok: '용돈 받아 쓰는 생활에 적응했다.', fail: '"내 돈 내가 쓰는데!" 크게 싸웠다.' },
    relapse: 0.1,
  },
  smoking: {
    name: '하루 두 갑 골초',
    icon: '🚬',
    desc: '30년 흡연. 기침이 멈추지 않는다',
    yearly: 330,
    yearlyLabel: '담뱃값 (하루 두 갑)',
    hp: -2,
    evChance: 0.2,
    lines: ['숨이 차서 계단을 못 오른다.', '폐 CT에서 그림자가 보인다고 한다.', '아이 방까지 담배 냄새가 밴다.'],
    hit: (_s, p) => {
      p.cash -= 400;
      p.actual.hp = clamp(p.actual.hp - 6, 0, 100);
      return '만성폐쇄성폐질환(COPD) 진단. 입원비 400만 원.';
    },
    treat: { label: '금연 약물 치료 (건강보험 적용)', cost: 30, cure: 0.4, ok: '석 달 만에 담배를 끊었다. 기침이 줄었다.', fail: '회식 자리에서 다시 불을 붙였다.' },
    free: { label: '보건소 금연클리닉 (무료)', cost: 0, cure: 0.3, ok: '금연 패치와 상담으로 끊었다.', fail: '일주일 버텼다.' },
    relapse: 0.1,
  },
};
export const WOE_IDS = Object.keys(WOES) as WoeId[];

export const woesOf = (p: Person): WoeId[] => p.flags.filter((f) => f.startsWith('woe:')).map((f) => f.slice(4) as WoeId).filter((w) => WOES[w]);

/** 새 게임: 어려움 1개, 지옥 2개, 운명에 맡긴 가난한 집은 40% 확률로 1개 */
export function assignWoes(s: GameState, father: Person, mother: Person, difficulty?: string) {
  const n = difficulty === 'hell' ? 2 : difficulty === 'hard' ? 1 : !difficulty && s.origin === 'poor' && chance(s, 0.4) ? 1 : 0;
  const pool = [...WOE_IDS];
  for (let i = 0; i < n; i++) {
    const w = pick(s, pool);
    pool.splice(pool.indexOf(w), 1);
    // 중독·빚은 대개 아버지, 우울·충동구매는 누구든
    const who = ['depression', 'shopping', 'chronic'].includes(w) && chance(s, 0.5) ? mother : father;
    addFlag(who, 'woe:' + w);
    WOES[w].setup?.(s, who);
  }
}

/** 가계부 항목: 같은 집에 사는 사람의 짐 */
export function woeItems(s: GameState, inHouse: Set<string>, wi: number): [string, number][] {
  const out: [string, number][] = [];
  for (const id of inHouse) {
    const p = s.people[id];
    if (!p || !alive(p)) continue;
    for (const w of woesOf(p)) if (WOES[w].yearly) out.push([`${WOES[w].yearlyLabel} (${p.name})`, Math.round(WOES[w].yearly * wi)]);
  }
  return out;
}

/** 해마다: 건강이 깎이고, 일이 터지고, 끊었던 사람은 재발할 수 있다 */
export function woeYear(s: GameState) {
  for (const p of Object.values(s.people)) {
    if (!alive(p)) continue;
    for (const w of woesOf(p)) {
      const d = WOES[w];
      if (d.hp) p.actual.hp = clamp(p.actual.hp + d.hp, 0, 100);
      if (s.events.some((e) => e.defId === 'woe' && e.personId === p.id)) continue;
      // 내 부모거나 내 가족일 때만 선택지로 띄운다
      const h = head(s);
      const close = parentsOf(s, h).includes(p) || p.id === h.spouseId || p.id === h.id;
      if (close && chance(s, d.evChance)) s.events.push({ uid: s.eventSeq++, defId: 'woe', personId: p.id, data: { w } });
      else if (!close && chance(s, 0.1)) p.flags = p.flags.filter((f) => f !== 'woe:' + w); // 방계는 조용히 정리
    }
    // 재발
    for (const f of p.flags.filter((x) => x.startsWith('woe_quit:'))) {
      const w = f.slice(9) as WoeId;
      if (WOES[w]?.relapse && chance(s, WOES[w].relapse!)) {
        p.flags = p.flags.filter((x) => x !== f);
        addFlag(p, 'woe:' + w);
        const h = head(s);
        if (parentsOf(s, h).includes(p)) s.events.push({ uid: s.eventSeq++, defId: 'woe', personId: p.id, data: { w, relapse: true } });
      }
    }
  }
}

/** 기초생활수급·차상위면 의료급여로 치료비 대부분이 지원된다 */
const aided = (s: GameState, p: Person) => hasFlag(p, 'welfare') || parentsOf(s, head(s)).some((q) => hasFlag(q, 'welfare'));

const woeEv: EventDef = {
  id: 'woe',
  title: (c) => `${WOES[c.ev.data.w as WoeId].icon} ${relationLabel(c.s, c.p)}의 ${WOES[c.ev.data.w as WoeId].name}`,
  valid: (c) => alive(c.p) && hasFlag(c.p, 'woe:' + c.ev.data.w),
  portraits: (c) => [c.p, head(c.s)],
  text: (c) => {
    const d = WOES[c.ev.data.w as WoeId];
    c.ev.data.line ??= pick(c.s, d.lines);
    c.ev.data.hit ??= d.hit(c.s, c.p);
    const h = head(c.s);
    const kid = age(c.s, h) < 20 ? `\n\n${fullName(h)} ${age(c.s, h)}세. 어린 마음에도 다 안다.` : '';
    return `${c.ev.data.relapse ? '끊었던 줄 알았는데… 다시 시작됐다.\n' : ''}${fullName(c.p)}: ${d.desc}.\n\n${c.ev.data.line}\n→ ${c.ev.data.hit}${kid}${aided(c.s, c.p) ? '\n(의료급여 대상이라 치료비 대부분을 나라가 낸다)' : ''}`;
  },
  choices: (c) => {
    const w = c.ev.data.w as WoeId;
    const d = WOES[w];
    const h = head(c.s);
    const cure = (x: typeof c, cu: Cure): string => {
      if (!chance(x.s, cu.cure + (hasFlag(h, 'woe_help') ? 0.05 : 0))) return cu.fail;
      x.p.flags = x.p.flags.filter((f) => f !== 'woe:' + w);
      if (d.relapse) addFlag(x.p, 'woe_quit:' + w);
      x.p.affinity = clamp(x.p.affinity + 10, -100, 100);
      x.p.happiness = clamp(x.p.happiness + 12, 0, 100);
      fam(x.s, 10);
      mark(h, 'resilient');
      if (w === 'jobless') {
        x.p.job = pick(x.s, x.p.sex === 'M' ? ['factory', 'courier', 'taxi', 'caregiver'] : ['caregiver', 'nurse_aide', 'factory']);
        x.p.jobLevel = 0;
        x.p.jobYears = 0;
        return `다시 일자리를 구했다. 첫 출근 날, 셔츠를 몇 번이나 다려 입었다.`;
      }
      return cu.ok;
    };
    const costOf = (cu: Cure) => Math.round(cu.cost * (aided(c.s, c.p) ? 0.2 : 1));
    const out: Choice[] = [
      { label: `${d.treat.label}`, cost: costOf(d.treat), run: (x) => cure(x, d.treat) },
      { label: d.free.label, run: (x) => cure(x, d.free) },
    ];
    // 다 큰 자식은 직접 나설 수 있다
    if (age(c.s, h) >= 20 && h.id !== c.p.id)
      out.push({
        label: `${eun(fullName(h))} 직접 나서서 설득한다`,
        req: ['성품·매력'],
        run: (x) => {
          addFlag(h, 'woe_help');
          if (chance(x.s, 0.2 + (h.actual.mor + h.actual.cha) / 400)) return cure(x, { ...d.free, cure: 1 });
          h.happiness = clamp(h.happiness - 5, 0, 100);
          return '"네가 뭘 안다고!" 문이 쾅 닫혔다.';
        },
      });
    out.push({
      label: '모른 척한다',
      run: (x) => {
        x.p.affinity = clamp(x.p.affinity - 5, -100, 100);
        fam(x.s, -4);
        if (age(x.s, h) < 20) mark(h, 'hardship');
        return `오늘도 그냥 넘어갔다. ${iga(fullName(h))} 조용히 방으로 들어갔다.`;
      },
    });
    return out;
  },
};

export const WOE_EVENTS = [woeEv];

/**
 * 건강에 따른 한 해 의료비 (본인부담, 만원).
 * 2023 건강보험통계: 1인당 연 진료비 약 210만(본인부담 20~30%). 노인은 2배 이상. 중증은 본인부담상한제로 막힌다.
 */
export function medicalCost(s: GameState, p: Person): number {
  // 나이대별 1인 본인부담 (건강보험통계연보 기준 대략): 영유아 40, 학령기 25, 청년 30, 중년 55, 60대 95, 70대 이상 150
  const a = age(s, p);
  let v = a < 6 ? 40 : a < 20 ? 25 : a < 40 ? 30 : a < 60 ? 55 : a < 70 ? 95 : 150;
  // 어른은 몸이 무너지면 병원비가 크게 는다 (아이의 체력 수치는 자라는 중이라 보지 않는다)
  if (a >= 20) {
    const hp = p.actual.hp;
    v *= hp < 15 ? 6 : hp < 25 ? 3.5 : hp < 35 ? 1.8 : 1;
  }
  if (woesOf(p).includes('chronic')) v += 60;
  // 근현대사: 의료보험 전(1977)엔 병원비를 다 냈고, 전 국민 의료보험(1989) 전엔 자영업·농민이 비쌌다
  if (s.era === 'history') v *= s.year < 1977 ? 1.6 : s.year < 1989 ? 1.3 : 1;
  if (hasFlag(p, 'health_insured')) v *= 0.75;
  // 본인부담상한제: 아무리 아파도 한 해 800만 남짓에서 막힌다
  return Math.min(Math.round(v), 800);
}
