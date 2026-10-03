import type { EventDef } from './ev-util';
import { gate, who, schedule } from './ev-util';
import { chance, int } from './rng';
import { addFlag, age, alive, clamp, fullName, hasFlag, isMainline } from './people';
import { hasLicense, revokeLicense, savePreviousLevel } from './licenses';
import type { GameState, Person } from './types';
import { JOBS } from './jobs';

/**
 * ─────────────────────────────────────────────────────────
 * 범죄 및 스노우볼 시스템 (Crimes & Snowball Chain)
 * ─────────────────────────────────────────────────────────
 * 사소한 유혹/경범죄에서 출발하여 은폐나 도주를 시도할수록
 * 구속, 징역형, 면허 취소, 가문 명성 실추로 커지는 현실적 시스템.
 */

// ── 수감 및 복역 연간 루틴 ──
export function crimeYear(s: GameState): string[] {
  const msgs: string[] = [];

  for (const p of Object.values(s.people)) {
    if (!alive(p)) continue;

    // 복역 중인 인물 처리
    if (hasFlag(p, 'in_prison')) {
      const termFlag = p.flags.find((f) => f.startsWith('prison_term:'));
      let remaining = termFlag ? Number(termFlag.slice(12)) : 1;
      remaining--;

      p.flags = p.flags.filter((f) => !f.startsWith('prison_term:'));
      p.happiness = clamp(p.happiness - 10, 0, 100);

      if (remaining <= 0) {
        p.flags = p.flags.filter((f) => f !== 'in_prison');
        addFlag(p, 'criminal'); // 전과 기록
        p.job = 'none';
        p.jobLevel = 0;
        p.jobYears = 0;
        if (isMainline(s, p)) {
          msgs.push(`🚪 ${fullName(p)}, 형기를 마치고 교도소에서 만기 출소했다. 세상이 많이 변해 있다.`);
        }
      } else {
        p.flags.push(`prison_term:${remaining}`);
        if (isMainline(s, p)) {
          msgs.push(`⚖️ ${fullName(p)}, 교도소에서 복역 중 (남은 형기 ${remaining}년)`);
        }
      }
    }
  }

  return msgs;
}

/** 캐릭터 구속 수감 헬퍼 */
export function imprison(s: GameState, p: Person, years: number, fameLoss: number, reason: string): string {
  addFlag(p, 'in_prison');
  p.flags = p.flags.filter((f) => !f.startsWith('prison_term:') && !f.startsWith('prep:') && !f.startsWith('tries:'));
  p.flags.push(`prison_term:${years}`);
  addFlag(p, 'convicted');

  // 직업 박탈 (단, 면허 자체는 별도 revokeLicense 호출 시에만 취소)
  if (p.job !== 'none') savePreviousLevel(p, p.job, p.jobLevel);
  p.job = 'none';
  p.jobLevel = 0;
  p.jobYears = 0;
  p.happiness = clamp(p.happiness - 35, 0, 100);
  s.fame = Math.max(0, s.fame - fameLoss);
  s.scandal = Math.min(100, (s.scandal ?? 0) + Math.round(fameLoss * 0.8));

  return `💥 법정 구속! ${fullName(p)}에게 징역 ${years}년의 실형이 선고되었다. (${reason}) 교도소에 수감되었다. (가문 명성 -${fameLoss})`;
}

// ─────────────────────────────────────────────────────────
// 1. 음주운전 스노우볼 체인 (DUI Snowball)
// ─────────────────────────────────────────────────────────

export const crmDuiStep1: EventDef = {
  id: 'crm_dui_step1',
  title: () => '🍺 늦은 밤의 갈림길',
  valid: (c) =>
    alive(c.p) &&
    age(c.s, c.p) >= 21 &&
    age(c.s, c.p) <= 65 &&
    !hasFlag(c.p, 'in_prison') &&
    !hasFlag(c.p, 'crm:dui_pending'),
  text: (c) =>
    `${who(c)}, 오랜만에 동창들과 늦은 시간까지 폭음을 했다. 자정이 훌쩍 넘었는데 대리운전 기사가 도무지 잡히지 않는다.\n집까지는 차로 딱 10분 거리. 어떻게 할까?`,
  choices: (c) =>
    gate(c.s, [
      {
        label: '차를 두고 택시를 탄다 (-5만원)',
        run: (x) => {
          x.p.cash -= 5;
          x.p.happiness = clamp(x.p.happiness + 2, 0, 100);
          return '술김에 귀찮았지만 안전하게 택시로 귀가했다. 다음 날 아침 차를 찾으러 갔다.';
        },
      },
      {
        label: '잡힐 때까지 대리를 기다린다 (-4만원)',
        run: (x) => {
          x.p.cash -= 4;
          x.p.happiness = clamp(x.p.happiness - 4, 0, 100);
          return '골목 벤치에서 40분을 덜덜 떨며 기다린 끝에 대리기사를 만났다. 속은 쓰리지만 안전했다.';
        },
      },
      {
        label: '"안 걸리면 그만이야" 직접 운전대를 잡는다',
        run: (x) => {
          addFlag(x.p, 'crm:dui_pending');
          // 40% 확률로 무사 귀가, 60% 확률로 단속 또는 사고 스노우볼
          if (chance(x.s, 0.4)) {
            x.p.flags = x.p.flags.filter((f) => f !== 'crm:dui_pending');
            return '식은땀을 흘리며 아파트 주차장에 무사히 도착했다. "휴, 다음부턴 절대 안 탄다." 가슴을 쓸어내렸다.';
          }
          // 스노우볼 발생
          if (chance(x.s, 0.5)) {
            x.s.events.push({ uid: x.s.eventSeq++, defId: 'crm_dui_police', personId: x.p.id });
            return '비틀거리며 큰길로 들어선 순간, 저 멀리 번쩍이는 경찰 경광봉과 음주단속 표지판이 보인다!';
          } else {
            x.s.events.push({ uid: x.s.eventSeq++, defId: 'crm_dui_crash', personId: x.p.id });
            return '순간 깜빡 졸았는지 쿵 하는 둔탁한 소리와 함께 골목길 행인/주차 차량을 들이받았다!';
          }
        },
      },
    ]),
};

export const crmDuiPolice: EventDef = {
  id: 'crm_dui_police',
  title: () => '🚨 음주 단속 검문소',
  valid: (c) => alive(c.p) && hasFlag(c.p, 'crm:dui_pending'),
  text: () =>
    `경찰관들이 차량을 한 대씩 세우며 음주 측정을 하고 있다. 이미 검문 차선으로 진입해 후진도 불가능하다. 어떻게 대처할까?`,
  choices: (c) =>
    gate(c.s, [
      {
        label: '순순히 측정에 응한다 (벌금 600만원 + 면허정지)',
        run: (x) => {
          x.p.flags = x.p.flags.filter((f) => f !== 'crm:dui_pending');
          addFlag(x.p, 'criminal_minor');
          x.p.cash -= 600;
          x.p.happiness = clamp(x.p.happiness - 20, 0, 100);
          x.s.fame = Math.max(0, x.s.fame - 4);
          x.s.scandal = Math.min(100, (x.s.scandal ?? 0) + 10);
          return `삐- 소리와 함께 혈중알코올농도 0.09% 적발. 면허 취소 처분과 벌금 600만 원이 부과되었다. 전과 기록이 남았다.`;
        },
      },
      {
        label: '중앙선을 침범해 급유턴 도주를 시도한다!',
        run: (x) => {
          x.p.flags = x.p.flags.filter((f) => f !== 'crm:dui_pending');
          // 순찰차 추격 끝에 체포
          return imprison(x.s, x.p, 1, 20, '음주운전 도주 및 특수공무집행방해치상');
        },
      },
    ]),
};

export const crmDuiCrash: EventDef = {
  id: 'crm_dui_crash',
  title: () => '💥 심야의 음주 접촉사고',
  valid: (c) => alive(c.p) && hasFlag(c.p, 'crm:dui_pending'),
  text: () =>
    `골목길에서 취객 행인을 살짝 치고 주차 차량을 긁었다! 피해자가 바닥에 넘어져 신음하고 있다. 술 냄새가 진동하는 상태. 어떻게 할까?`,
  choices: (c) =>
    gate(c.s, [
      {
        label: '즉시 차에서 내려 119를 부르고 자수한다',
        run: (x) => {
          x.p.flags = x.p.flags.filter((f) => f !== 'crm:dui_pending');
          addFlag(x.p, 'criminal_minor');
          x.p.cash -= 2500; // 치료비 및 형사합의금
          x.p.happiness = clamp(x.p.happiness - 25, 0, 100);
          x.s.fame = Math.max(0, x.s.fame - 6);
          x.s.scandal = Math.min(100, (x.s.scandal ?? 0) + 15);
          return `구호 조치와 자수 덕분에 실형은 면했으나, 피해자 합의금과 벌금으로 2,500만 원을 물어주고 집행유예를 받았다.`;
        },
      },
      {
        label: '공포에 질려 그대로 액셀을 밟고 도주한다 (뺑소니)',
        run: (x) => {
          x.p.flags = x.p.flags.filter((f) => f !== 'crm:dui_pending');
          // 방범 CCTV와 차량 블랙박스로 익일 아침 자택에서 긴급체포
          return imprison(x.s, x.p, 2, 35, '특가법상 도주치상(뺑소니) 및 음주운전');
        },
      },
    ]),
};

// ─────────────────────────────────────────────────────────
// 2. 사소한 탈세·횡령 스노우볼 체인 (Tax & Embezzlement)
// ─────────────────────────────────────────────────────────

export const crmTaxStep1: EventDef = {
  id: 'crm_tax_step1',
  title: () => '💼 장부 조작의 달콤한 유혹',
  valid: (c) =>
    alive(c.p) &&
    age(c.s, c.p) >= 26 &&
    ['business', 'salary'].includes(JOBS[c.p.job]?.kind) &&
    !hasFlag(c.p, 'in_prison') &&
    !hasFlag(c.p, 'crm:tax_fraud'),
  text: (c) =>
    `${who(c)}, 거래처에서 현금 결제를 조건으로 부가세 10%를 깎아주겠다고 제안했다. 세무 장부에 매출을 누락하면 당장 수천만 원의 세금을 아낄 수 있다.`,
  choices: (c) =>
    gate(c.s, [
      {
        label: '정직하게 세금계산서를 발행한다',
        run: (x) => {
          x.p.happiness = clamp(x.p.happiness + 3, 0, 100);
          return '원칙대로 신고했다. 세금은 나갔지만 두 다리 뻗고 잘 수 있다.';
        },
      },
      {
        label: '현금으로 받고 장부에서 조용히 누락한다 (+3,500만원)',
        run: (x) => {
          x.p.cash += 3500;
          addFlag(x.p, 'crm:tax_fraud');
          x.s.scandal = Math.min(100, (x.s.scandal ?? 0) + 10);
          // 1~2년 뒤 세무조사 큐잉
          schedule(x.s, int(x.s, 1, 2), 'crm_tax_audit', x.p.id);
          return '통장에 찍히지 않는 현금 3,500만 원을 챙겼다. 아무도 모를 거라 생각했다.';
        },
      },
    ]),
};

export const crmTaxAudit: EventDef = {
  id: 'crm_tax_audit',
  title: () => '📑 국세청 세무조사 착수 통보',
  valid: (c) => alive(c.p) && hasFlag(c.p, 'crm:tax_fraud'),
  text: (c) =>
    `국세청 조사관들이 들이닥쳤다! 거래처가 탈세로 털리면서 ${who(c)}의 차명 계좌와 무자료 거래 내역까지 전부 확보되었다고 한다.`,
  choices: (c) =>
    gate(c.s, [
      {
        label: '모든 누락을 자진 시인하고 가산세를 완납한다 (-7,000만원)',
        run: (x) => {
          x.p.flags = x.p.flags.filter((f) => f !== 'crm:tax_fraud');
          x.p.cash -= 7000;
          x.p.happiness = clamp(x.p.happiness - 20, 0, 100);
          x.s.fame = Math.max(0, x.s.fame - 5);
          return '본세와 징벌적 가산세를 합쳐 7,000만 원을 토해냈다. 형사 고발은 가까스로 면했다.';
        },
      },
      {
        label: '장부를 파쇄하고 조사관에게 뇌물 청탁을 시도한다!',
        run: (x) => {
          x.p.flags = x.p.flags.filter((f) => f !== 'crm:tax_fraud');
          return imprison(x.s, x.p, 2, 40, '특정범죄가중처벌법상 조세포탈 및 뇌물공여');
        },
      },
    ]),
};

// ─────────────────────────────────────────────────────────
// 3. 주식 미공개 내부정보 찌라시 스노우볼 (Insider Trading)
// ─────────────────────────────────────────────────────────

export const crmInsiderStep1: EventDef = {
  id: 'crm_insider_step1',
  title: () => '📈 극비 내부자 정보',
  valid: (c) =>
    alive(c.p) &&
    age(c.s, c.p) >= 25 &&
    !hasFlag(c.p, 'in_prison') &&
    !hasFlag(c.p, 'crm:insider_trade'),
  text: () =>
    `여의도 증권가에 근무하는 지인이 은밀히 연락해왔다. "내일 모레 대기업 인수 공시가 뜰 거야. 지금 몰빵하면 최소 3배는 먹어."`,
  choices: (c) =>
    gate(c.s, [
      {
        label: '불법 내부정보 투자는 단호히 거절한다',
        run: () => {
          return '"그런 돈은 무섭다." 정중히 전화를 끊었다. 훗날 해당 주식은 작전 세력이 털고 나가며 폭락했다.';
        },
      },
      {
        label: '가문 자금을 영끌해 주식을 매수한다 (+8,000만원 대박)',
        run: (x) => {
          x.p.cash += 8000;
          addFlag(x.p, 'crm:insider_trade');
          x.s.scandal = Math.min(100, (x.s.scandal ?? 0) + 15);
          // 금감원 이상거래 감시망 포착 큐잉
          schedule(x.s, int(x.s, 1, 2), 'crm_insider_fss', x.p.id);
          return '공시가 뜨자마자 상한가 직행! 순식간에 8,000만 원의 차익을 남겼다. 축배를 들었다.';
        },
      },
    ]),
};

export const crmInsiderFss: EventDef = {
  id: 'crm_insider_fss',
  title: () => '🔍 금융감독원 패스트트랙 수사',
  valid: (c) => alive(c.p) && hasFlag(c.p, 'crm:insider_trade'),
  text: () =>
    `금융감독원 자본시장조사단에서 출석 요구서가 날아왔다! 공시 직전 매수한 타이밍이 너무나 정확해 작전 세력 연루 혐의로 계좌가 동결되었다.`,
  choices: (c) =>
    gate(c.s, [
      {
        label: '부당이득 전액을 반납하고 과징금 처분에 합의한다 (-1억 2천만원)',
        run: (x) => {
          x.p.flags = x.p.flags.filter((f) => f !== 'crm:insider_trade');
          x.p.cash -= 12000;
          x.p.happiness = clamp(x.p.happiness - 25, 0, 100);
          x.s.fame = Math.max(0, x.s.fame - 8);
          return '벌었던 돈에 과징금까지 얹어 1억 2천만 원을 납부하고 기소유예 처분을 받았다.';
        },
      },
      {
        label: '차명 계좌로 돈을 빼돌리고 증거인멸을 지시한다',
        run: (x) => {
          x.p.flags = x.p.flags.filter((f) => f !== 'crm:insider_trade');
          return imprison(x.s, x.p, 3, 50, '자본시장법 위반(미공개 중요정보 이용) 및 증거인멸교사');
        },
      },
    ]),
};

// ─────────────────────────────────────────────────────────
// 4. 의료 전문직 범죄: 대리수술 / 프로포폴 / 허위진단서 (Medical Crime)
// ─────────────────────────────────────────────────────────

export const crmMedicalStep1: EventDef = {
  id: 'crm_medical_step1',
  title: () => '🩺 은밀한 뒷거래의 유혹',
  valid: (c) =>
    alive(c.p) &&
    hasLicense(c.p, 'doctor') &&
    ['doctor', 'dentist'].includes(c.p.job) &&
    !hasFlag(c.p, 'in_prison') &&
    !hasFlag(c.p, 'crm:medical_crime'),
  text: () =>
    `의료기기 영업사원과 브로커가 찾아왔다. "원장님 수술 일정 너무 벅차시죠? 저희 전문 인력이 대리 집도 깔끔하게 해드립니다. VIP 프로포폴 차트도 알아서 덮어드릴 테니 건당 수천만 원씩 챙기시죠."`,
  choices: (c) =>
    gate(c.s, [
      {
        label: '"의사의 양심과 면허를 걸 수 없다" 단칼에 내쫓는다',
        run: (x) => {
          x.p.actual.mor = clamp(x.p.actual.mor + 5, 0, 100);
          x.p.happiness = clamp(x.p.happiness + 5, 0, 100);
          return '의사로서의 사명감과 윤리를 지켰다. 환자들의 신뢰를 얻었다.';
        },
      },
      {
        label: '"이번 딱 한 번만…" 검은 돈을 챙긴다 (+1억 2천만원)',
        run: (x) => {
          x.p.cash += 12000;
          addFlag(x.p, 'crm:medical_crime');
          x.p.actual.mor = clamp(x.p.actual.mor - 15, 0, 100);
          x.s.scandal = Math.min(100, (x.s.scandal ?? 0) + 20);
          // 단속/내부고발 큐잉
          schedule(x.s, int(x.s, 1, 2), 'crm_medical_bust', x.p.id);
          return '금고에 현금 다발 1억 2천만 원이 들어찼다. 하지만 수술실 CCTV 화면을 볼 때마다 손이 떨린다.';
        },
      },
    ]),
};

export const crmMedicalBust: EventDef = {
  id: 'crm_medical_bust',
  title: () => '🏥 수술실 내부고발과 검경 압수수색',
  valid: (c) => alive(c.p) && hasFlag(c.p, 'crm:medical_crime'),
  text: () =>
    `양심의 가책을 느낀 수술실 간호사가 권익위에 공익 신고를 접수했다! 검찰과 보건복지부가 병원에 들이닥쳐 진료기록부와 폐쇄회로 영상을 압수수색했다.`,
  choices: (c) =>
    gate(c.s, [
      {
        label: '과오를 인정하고 피해자들에게 사죄한다 (면허 1년 정지 + 벌금 8,000만원)',
        run: (x) => {
          x.p.flags = x.p.flags.filter((f) => f !== 'crm:medical_crime');
          x.p.cash -= 8000;
          x.p.job = 'none';
          x.p.jobLevel = 0;
          x.p.happiness = clamp(x.p.happiness - 30, 0, 100);
          x.s.fame = Math.max(0, x.s.fame - 20);
          // 면허는 정지 후 보존됨 (취소 안 됨)
          return '자백과 반성 태도가 참작되어 면허 취소는 면했다. 1년간 면허 자격 정지 및 벌금 8,000만 원이 선고되었다.';
        },
      },
      {
        label: '내부고발자를 협박하고 차트를 조작해 혐의를 전면 부인한다!',
        run: (x) => {
          x.p.flags = x.p.flags.filter((f) => f !== 'crm:medical_crime');
          // 의사 면허 영구 박탈!
          revokeLicense(x.p, 'doctor');
          return (
            imprison(x.s, x.p, 3, 60, '의료법 위반(대리수술·차트위조) 및 공익신고자 협박') +
            '\n\n❌ [의사 면허 영구 취소] 보건복지부 행정처분으로 의사 면허가 전격 취소 박탈되었습니다!'
          );
        },
      },
    ]),
};

// ── 범죄 이벤트 묶음 ──
export const CRIME_EVENTS: EventDef[] = [
  crmDuiStep1,
  crmDuiPolice,
  crmDuiCrash,
  crmTaxStep1,
  crmTaxAudit,
  crmInsiderStep1,
  crmInsiderFss,
  crmMedicalStep1,
  crmMedicalBust,
];
