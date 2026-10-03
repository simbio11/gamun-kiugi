// 한국 현대 사회의 명암과 가족 현실을 다루는 K-현실 라이프 서사 모듈
// 1. [상속 분쟁과 간병 기여분 소송]
// 2. [청약 벼락거지와 깡통전세의 덫]
// 3. [고위공직·전문직 전관예우의 유혹과 후폭풍]
// 4. [대치동 학군지 입성과 입시 지옥]

import type { GameState } from './types';
import type { LifeDef } from './life';
import type { EventDef } from './ev-util';
import { schedule, who } from './ev-util';
import { chance, int } from './rng';
import { addFlag, age, alive, childrenOf, clamp, fullName, hasFlag, parentsOf, siblingsOf } from './people';
import { addAsset, assetsOf, formatMoney } from './economy';
import { imprison } from './crimes';
import { revokeLicense } from './licenses';

// ─────────────────────────────────────────────────────────────
// 1. [상속 & 간병 기여분 분쟁]
// ─────────────────────────────────────────────────────────────

export const krInheritanceDispute: LifeDef = {
  id: 'kr_inheritance_dispute',
  weight: (s: GameState, p) => {
    // 40세 이상, 부모가 모두 사망, 형제자매 1명 이상 생존, 가문 자산 3억 이상
    if (age(s, p) < 40 || hasFlag(p, 'kr_done:inheritance')) return 0;
    const pars = parentsOf(s, p).filter(Boolean);
    if (!pars.length || pars.some((par) => alive(par))) return 0;
    const siblings = siblingsOf(s, p).filter((sb) => sb && alive(sb));
    if (!siblings.length) return 0;
    const totalWealth = s.familyCash + s.assets.reduce((t, a) => t + a.value, 0);
    if (totalWealth < 30000) return 0;
    return 0.04;
  },
  title: () => '⚖️ 상속 분쟁과 유류분 청구',
  text: (c) => {
    addFlag(c.p, 'kr_done:inheritance');
    return (
      `${who(c)}에게 다른 형제 측 변호사로부터 내용증명이 도착했다.\n` +
      `"부모님 생전 증여분과 상속 재산에 대한 기여분을 재산정하고, 법정 유류분을 반환하라"는 요구다.\n` +
      `오랜 세월 쌓였던 서운함과 돈 문제가 뒤엉켜 집안이 갈라설 위기에 처했다.`
    );
  },
  choices: () => [
    {
      label: '가족끼리 법정까진 가지 말자 (합의금 5,000만 원 분할)',
      cost: 5000,
      run: (x) => {
        x.p.happiness = clamp(x.p.happiness - 5, 0, 100);
        return '쓰린 속을 달래며 합의금을 건넸다. 법적 분쟁은 피했지만 명절에 얼굴 보기는 영 어색해졌다.';
      },
    },
    {
      label: '로펌을 선임해 맞소송으로 간다 (변호사 선임비 2,000만 원)',
      cost: 2000,
      run: (x) => {
        schedule(x.s, int(x.s, 1, 2), 'kr_inheritance_verdict', x.p.id, { mode: 'lawsuit' });
        return '대형 로펌 변호사를 선임했다. 피를 나눈 형제와 법정에서 서면 공방을 시작한다. (1~2년 뒤 판결 예정)';
      },
    },
    {
      label: '"부모님 모신 건 나다!" 간병 기여분 맞청구',
      run: (x) => {
        const cared = hasFlag(x.p, 'wf_care_self') || hasFlag(x.p, 'wf_care_hospital') || hasFlag(x.p, 'filial');
        schedule(x.s, int(x.s, 1, 2), 'kr_inheritance_verdict', x.p.id, { mode: 'care_defense', cared });
        return '그동안 부모님 병간호와 생활을 도맡았던 기록과 영수증을 모아 간병 기여분을 맞청구했다. (1~2년 뒤 판결 예정)';
      },
    },
  ],
};

export const krInheritanceVerdict: EventDef = {
  id: 'kr_inheritance_verdict',
  title: () => '⚖️ 상속 소송 최종 판결',
  text: (c) => {
    const data = c.ev.data as { mode: string; cared?: boolean };
    if (data.mode === 'care_defense') {
      if (data.cared) {
        return (
          `법원이 ${who(c)}의 '특별기여분'을 대폭 인정했다!\n` +
          `"피상속인을 지극정성으로 부양하고 간병한 사실이 명백하다."\n` +
          `상대 형제의 유류분 청구는 대부분 기각되었다. 그러나 형제와는 완전히 등을 돌렸다.`
        );
      }
      return (
        `법원이 기여분 주장을 인정하지 않았다.\n` +
        `"통상적인 부양의 범위를 넘는 특별한 희생으로 보기 어렵다."\n` +
        `결국 법정 유류분 7,000만 원을 배상하게 되었다.`
      );
    }
    // 일반 소송
    if (chance(c.s, 0.55)) {
      return (
        `지루한 2심 공방 끝에 일부 승소 판결이 내려졌다.\n` +
        `상대방 청구액 중 2,000만 원만 지급하는 것으로 조정 판결이 났다.\n` +
        `집안은 씻을 수 없는 상처를 입었다.`
      );
    }
    return (
      `패소 판결이 내려졌다. 상대 형제의 유류분 청구가 전액 인용되었다.\n` +
      `법정 배상금 8,000만 원과 상대측 소송비용까지 물어내야 한다.`
    );
  },
  choices: (c) => {
    const data = c.ev.data as { mode: string; cared?: boolean };
    if (data.mode === 'care_defense' && data.cared) {
      return [
        {
          label: '씁쓸하지만 판결을 받아들인다',
          run: (x) => {
            x.s.fame = Math.min(100, x.s.fame + 2);
            return '재산은 지켰지만 친척 모임에는 다시는 나갈 수 없게 되었다. (명성 +2)';
          },
        },
      ];
    }
    const payAmt = data.mode === 'lawsuit' && !data.cared ? (chance(c.s, 0.55) ? 2000 : 8000) : 7000;
    return [
      {
        label: `배상금을 지급하고 사건을 종결한다 (${formatMoney(payAmt)})`,
        cost: payAmt,
        run: (x) => {
          x.p.happiness = clamp(x.p.happiness - 10, 0, 100);
          x.s.scandal = Math.min(100, (x.s.scandal ?? 0) + 5);
          return '판결금을 송금하고 기나긴 상속 분쟁을 매듭지었다. (스캔들 +5)';
        },
      },
    ];
  },
};

// ─────────────────────────────────────────────────────────────
// 2. [청약 벼락거지와 깡통전세의 덫]
// ─────────────────────────────────────────────────────────────

export const krHousingCrossroads: LifeDef = {
  id: 'kr_housing_crossroads',
  weight: (s, p) => {
    // 26~37세 성인, 2015년 이후(현대 청약/영끌/전세 대란), 무주택, 1회성
    if (s.year < 2015 || hasFlag(p, 'kr_done:housing')) return 0;
    const a = age(s, p);
    if (a < 26 || a > 37) return 0;
    const myAssets = assetsOf(s, p.id);
    if (myAssets.some((ast) => ast.kind === 'apt_seoul' || ast.kind === 'apt_local' || ast.kind === 'building') || p.home?.type === 'own') {
      return 0;
    }
    return 0.05;
  },
  title: () => '🏠 청년 독립의 갈림길: 청약 vs 영끌 vs 전세',
  text: (c) => {
    addFlag(c.p, 'kr_done:housing');
    return (
      `${who(c)}이(가) 독립하여 살 집을 알아보고 있다.\n` +
      `치솟는 서울·수도권 집값 앞에서 친구들은 둘로 갈렸다.\n` +
      `"지금 안 사면 평생 벼락거지야!"라며 영끌하는 파와, "가점 채워서 청약 넣자"는 파, 그리고 가성비 전세로 버티는 파.`
    );
  },
  choices: () => [
    {
      label: '가점 채우며 청약 존버 (구축 원룸 월세 생활)',
      run: (x) => {
        x.p.happiness = clamp(x.p.happiness - 5, 0, 100);
        x.p.home = { type: 'wolse', tier: 'room', name: '구축 원룸', deposit: 1000, rent: 500, since: x.s.year };
        schedule(x.s, int(x.s, 2, 4), 'kr_apt_lottery', x.p.id);
        return '좁은 구축 원룸에 월세로 들어가며 청약 통장에 매달 납입을 이어간다. (2~4년 뒤 청약 결과 도착)';
      },
    },
    {
      label: '지금 안 사면 벼락거지! DSR 한도 영끌 매수 (수도권 외곽 아파트)',
      cost: 5000,
      run: (x) => {
        const ast = addAsset(x.s, 'apt_local', x.p.id, 35000, '수도권 외곽 24평 아파트');
        ast.loan = 30000;
        x.p.home = { type: 'own', tier: 'apt_local', name: '수도권 외곽 24평 아파트', assetId: ast.id, deposit: 0, rent: 0, since: x.s.year };
        schedule(x.s, int(x.s, 2, 3), 'kr_realty_interest_shock', x.p.id);
        return '영혼까지 끌어모은 대출 3억으로 아파트를 매수했다! 매달 감당해야 할 원리금이 상당하다. (2~3년 뒤 금리 변동)';
      },
    },
    {
      label: '가성비 신축 빌라 전세 계약 (전세대출 80%)',
      cost: 3000,
      run: (x) => {
        x.p.home = { type: 'jeonse', tier: 'villa', name: '신축 빌라', deposit: 20000, rent: 0, loan: 16000, since: x.s.year };
        schedule(x.s, 2, 'kr_jeonse_fraud', x.p.id);
        return '풀옵션 신축 빌라에 전세 2억 원으로 깔끔하게 입주했다. 겉보기엔 안락한 보금자리다. (2년 뒤 계약 만기)';
      },
    },
  ],
};

export const krJeonseFraud: EventDef = {
  id: 'kr_jeonse_fraud',
  title: () => '🚨 전세사기(깡통전세)의 덫',
  text: (c) => {
    return (
      `청천벽력 같은 등기우편이 날아왔다!\n` +
      `${who(c)}이(가) 살던 신축 빌라 임대인이 수백 채를 소유한 '바지사장 빌라왕'이었고,\n` +
      `세금 체납으로 건물 전체가 법원 강제 경매에 넘어갔다는 소식이다.\n` +
      `전세보증금 2억 원을 한 푼도 돌려받지 못하고 쫓겨날 절체절명의 위기다!`
    );
  },
  choices: () => [
    {
      label: '가문이 빚을 대신 갚아준다 (보증금 손실 1억 5천만 원 대위변제)',
      cost: 15000,
      run: (x) => {
        x.p.happiness = clamp(x.p.happiness + 10, 0, 100);
        x.p.home = { type: 'parents', tier: 'parents', name: '부모님 댁', deposit: 0, rent: 0, since: x.s.year };
        return '가문의 곳간을 헐어 자녀의 전세대출을 막아주었다. 자녀는 눈물을 흘리며 고마워했다.';
      },
    },
    {
      label: '우선매수권을 행사해 빌라를 경매로 셀프 낙찰받는다 (취득세 1,500만 원)',
      cost: 1500,
      run: (x) => {
        const ast = addAsset(x.s, 'apt_local', x.p.id, 16000, '낙찰받은 빌라 (처분 곤란)');
        ast.loan = 16000;
        x.p.home = { type: 'own', tier: 'villa', name: '낙찰받은 빌라', assetId: ast.id, deposit: 0, rent: 0, since: x.s.year };
        return '피눈물을 머금고 깡통 빌라를 스스로 낙찰받아 떠안았다. 보증금은 건졌지만 처분하기 힘든 애물단지가 되었다.';
      },
    },
    {
      label: '방법이 없다… 청년 개인회생 및 파산 신청',
      run: (x) => {
        x.p.happiness = clamp(x.p.happiness - 35, 0, 100);
        x.p.actual.hp = clamp(x.p.actual.hp - 15, 0, 100);
        x.p.credit = 350;
        addFlag(x.p, 'bad_credit');
        x.p.home = { type: 'parents', tier: 'parents', name: '부모님 댁', deposit: 0, rent: 0, since: x.s.year };
        return '신용불량자가 되어 법원에 개인회생을 신청했다. 향후 5년간 금융 거래가 제한되고 혹독한 변제 기간을 거친다.';
      },
    },
  ],
};

export const krAptLottery: EventDef = {
  id: 'kr_apt_lottery',
  title: () => '🎉 아파트 특별공급 청약 추첨',
  text: (c) => {
    if (chance(c.s, 0.45)) {
      return (
        `경쟁률 80:1을 뚫고 수도권 역세권 공공분양 아파트 청약에 당첨되었다!\n` +
        `주변 시세보다 수억 원 저렴한 분양가로 내 집 마련의 꿈을 이뤘다.`
      );
    }
    return (
      `청약 추첨에서 아쉽게 예비 번호도 받지 못하고 탈락했다.\n` +
      `"다음 특공을 노려보자"며 쓰린 마음으로 원룸 전단지를 뒤적인다.`
    );
  },
  choices: (c) => {
    if (chance(c.s, 0.45)) {
      return [
        {
          label: '계약금을 납입하고 분양권을 확보한다 (계약금 5,000만 원)',
          cost: 5000,
          run: (x) => {
            const ast = addAsset(x.s, 'apt_seoul', x.p.id, 75000, '역세권 신축 아파트');
            x.p.home = { type: 'own', tier: 'apt_seoul', name: '역세권 신축 아파트', assetId: ast.id, deposit: 0, rent: 0, since: x.s.year };
            x.p.happiness = clamp(x.p.happiness + 25, 0, 100);
            return '로또 청약에 당첨되며 자산이 껑충 뛰었다! 가문의 든든한 주춧돌이 생겼다.';
          },
        },
      ];
    }
    return [
      {
        label: '아쉽지만 다음 기회를 기약한다',
        run: (x) => {
          x.p.happiness = clamp(x.p.happiness - 3, 0, 100);
          return '가점을 1점 더 쌓으며 다음 청약을 기다린다.';
        },
      },
    ];
  },
};

export const krRealtyInterestShock: EventDef = {
  id: 'kr_realty_interest_shock',
  title: () => '📉 기준금리 인상과 영끌 하우스푸어 위기',
  text: (c) => {
    return (
      `한국은행의 급격한 기준금리 인상으로 주택담보대출 금리가 7%대로 치솟았다!\n` +
      `${who(c)}이(가) 매달 납입해야 할 이자가 두 배로 폭증했다.\n` +
      `설상가상으로 주변 부동산 거래가 얼어붙으며 집값도 매수가 아래로 떨어졌다.`
    );
  },
  choices: () => [
    {
      label: '허리띠를 졸라매고 이자를 버텨낸다 (연간 추가 지출 1,800만 원)',
      cost: 1800,
      run: (x) => {
        x.p.happiness = clamp(x.p.happiness - 15, 0, 100);
        return '외식과 소비를 극단적으로 줄이며 버텼다. 가계는 팍팍해졌지만 집은 지켰다.';
      },
    },
    {
      label: '눈물의 손절 매도 (손해 보고 급매 처분)',
      run: (x) => {
        x.s.assets = x.s.assets.filter((a) => a.ownerId !== x.p.id || !a.name.includes('수도권 외곽'));
        x.p.home = { type: 'wolse', tier: 'room', name: '원룸', deposit: 1000, rent: 600, since: x.s.year };
        x.p.happiness = clamp(x.p.happiness - 20, 0, 100);
        return '원금 5천만 원을 통째로 날리고 빚만 간신히 정리했다. 쓰라린 인생의 교훈을 얻었다.';
      },
    },
  ],
};

// ─────────────────────────────────────────────────────────────
// 3. [전문직·고위공직 전관예우의 유혹과 후폭풍]
// ─────────────────────────────────────────────────────────────

export const krExOfficioOffer: LifeDef = {
  id: 'kr_ex_officio_offer',
  weight: (s, p) => {
    // 50~68세, 판검사 4레벨 이상이거나 장관/국회의원 출신, 1회성
    if (age(s, p) < 50 || age(s, p) > 68 || hasFlag(p, 'kr_done:ex_officio')) return 0;
    const isLegalHigh = (p.job === 'judge' || p.job === 'prosecutor') && p.jobLevel >= 4;
    const isPolHigh = hasFlag(p, 'was_minister') || hasFlag(p, 'was_politician') || hasFlag(p, 'president');
    if (!isLegalHigh && !isPolHigh) return 0;
    return 0.08;
  },
  title: () => '💼 대형 로펌의 전관예우 스카우트 제의',
  text: (c) => {
    addFlag(c.p, 'kr_done:ex_officio');
    return (
      `공직에서 물러날 채비를 하는 ${who(c)}에게 국내 굴지의 대형 로펌(김앤장 등) 대표가 은밀히 찾아왔다.\n` +
      `"선배님, 이제 후배들에게 자리 물려주시고 저희 로펌 대표 파트너로 오시지요.\n` +
      `계약금 10억에 기본 연봉 15억, 법인 카드와 전용 기사 딸린 에쿠스를 보장해 드리겠습니다."`
    );
  },
  choices: () => [
    {
      label: '"세상이 다 그렇게 사는 거다" 전관 스카우트 수락',
      run: (x) => {
        x.s.familyCash += 100000; // 10억 지급
        addFlag(x.p, 'kr_ex_officio_hired');
        schedule(x.s, int(x.s, 2, 3), 'kr_ex_officio_probe', x.p.id);
        return '대형 로펌의 호화 파트너실로 출근하기 시작했다. 가문의 통장에 10억 원의 계약금이 꽂혔다! (2~3년 뒤 후폭풍 가능)';
      },
    },
    {
      label: '평생 지켜온 법복의 명예: 국선전담 / 공익인권변호사 개업',
      run: (x) => {
        x.p.actual.mor = clamp(x.p.actual.mor + 15, 0, 100);
        x.s.fame = Math.min(100, x.s.fame + 5);
        addFlag(x.p, 'conscience'); // 명예의 전당 양심 카드 요건
        return '달콤한 수십억의 유혹을 뿌리치고 억울한 서민들을 위한 공익 변호에 헌신하기로 했다. (명성 +5, 양심 달성)';
      },
    },
    {
      label: '로스쿨 석좌교수로 후학 양성에 힘쓴다',
      run: (x) => {
        x.p.actual.int = clamp(x.p.actual.int + 5, 0, 100);
        x.s.fame = Math.min(100, x.s.fame + 2);
        return '대학 강단으로 자리를 옮겼다. 법조계 후배들을 양성하며 존경받는 학자로 조용한 여생을 보낸다.';
      },
    },
  ],
};

export const krExOfficioProbe: EventDef = {
  id: 'kr_ex_officio_probe',
  title: () => '⚡ 특검 수사와 전관예우 비리 게이트',
  text: (c) => {
    return (
      `국회를 통과한 특검팀이 대형 로펌에 대한 전격 압수수색을 단행했다!\n` +
      `${who(c)}이(가) 수임했던 재벌 총수의 배임 사건에서 '현직 법관·검찰 수뇌부 불법 청탁 및 뇌물성 자문료 수수' 의혹이 터졌다.\n` +
      `언론은 연일 "사법 카르텔의 민낯"이라며 ${who(c)}의 실명을 대서특필하고 있다.`
    );
  },
  choices: () => [
    {
      label: '초호화 전관 카르텔 총동원 맞대응 (로비 자금 3억 원)',
      cost: 30000,
      run: (x) => {
        x.s.scandal = Math.min(100, (x.s.scandal ?? 0) + 20);
        if (chance(x.s, 0.5)) {
          return '동기 법관들의 비호 속에 간신히 증거불충분 불기소 처분을 받았다. 그러나 가문의 이름은 먹칠되었다. (스캔들 +20)';
        }
        x.s.fame = Math.max(0, x.s.fame - 15);
        revokeLicense(x.p, 'lawyer');
        return imprison(x.s, x.p, 2, 20, '전관예우 알선수재죄로 징역 2년 및 변호사 면허 취소');
      },
    },
    {
      label: '모든 직책 사퇴 및 수임료 전액 사회 환원 (10억 원 공익 기부)',
      run: (x) => {
        x.s.familyCash = Math.max(0, x.s.familyCash - 100000);
        x.s.scandal = Math.max(0, (x.s.scandal ?? 0) - 10);
        x.s.fame = Math.max(0, x.s.fame - 5);
        return '대국민 사과와 함께 전관 수임료 10억을 전액 공익 기부했다. 구속은 면했으나 평생의 명예에 흠집이 남았다.';
      },
    },
  ],
};

// ─────────────────────────────────────────────────────────────
// 4. [대치동 학군지 입성과 입시 지옥]
// ─────────────────────────────────────────────────────────────

export const krDaechiFrenzy: LifeDef = {
  id: 'kr_daechi_frenzy',
  weight: (s, p) => {
    // 35세 이상 부모, 13~18세(중고생) 자녀 생존, 1995년 이후, 1회성
    if (s.year < 1995 || age(s, p) < 35 || hasFlag(p, 'kr_done:daechi')) return 0;
    const teenChild = childrenOf(s, p).find((c) => c && alive(c) && age(s, c) >= 13 && age(s, c) <= 18);
    if (!teenChild) return 0;
    if (s.familyCash < 2000) return 0;
    return 0.06;
  },
  title: () => '📚 대치동 학군지 입성과 사교육 잔혹사',
  text: (c) => {
    addFlag(c.p, 'kr_done:daechi');
    const child = childrenOf(c.s, c.p).find((k) => k && alive(k) && age(c.s, k) >= 13 && age(c.s, k) <= 18) ?? c.p;
    return (
      `입시 설명회에 다녀온 배우자가 사색이 되어 ${who(c)}의 손을 잡는다.\n` +
      `"여보, 지금 ${fullName(child)} 성적으로는 인서울 4년제도 턱도 없대.\n` +
      `대치동 1타 강사 팀수업에 자리가 하나 났는데, 지금 당장 안 들어가면 의대 문턱도 못 밟아!"`
    );
  },
  choices: (c) => {
    const child = childrenOf(c.s, c.p).find((k) => k && alive(k) && age(c.s, k) >= 13 && age(c.s, k) <= 18) ?? c.p;
    return [
      {
        label: '빚을 내서라도 보낸다! 대치동 라이딩 풀코스 (연 3,600만 원)',
        cost: 3600,
        run: () => {
          child.actual.int = clamp(child.actual.int + 15, 0, 100);
          child.happiness = clamp(child.happiness - 20, 0, 100);
          child.actual.hp = clamp(child.actual.hp - 10, 0, 100);
          child.eduSpent = (child.eduSpent ?? 0) + 3600;
          return `${fullName(child)}의 눈 밑에 다크서클이 짙어졌지만 모의고사 성적이 눈부시게 올랐다! (지능 +15, 행복 -20, 건강 -10)`;
        },
      },
      {
        label: '족집게 입시 컨설팅 & 논문 대필 품앗이 (1,500만 원)',
        cost: 1500,
        run: (x) => {
          x.p.actual.mor = clamp(x.p.actual.mor - 10, 0, 100);
          child.actual.int = clamp(child.actual.int + 10, 0, 100);
          schedule(x.s, 2, 'kr_admission_audit', child.id);
          return '컨설턴트의 주도로 교수 자녀들과 논문 공저 스펙을 품앗이했다. 명문대 학생부 종합전형이 코앞이다! (2년 뒤 감사 위험)';
        },
      },
      {
        label: '아이를 믿자, EBS와 자기주도학습으로 버틴다',
        run: () => {
          child.happiness = clamp(child.happiness + 5, 0, 100);
          return '무리한 사교육 경쟁에 휘말리지 않기로 했다. 아이는 숨통이 트였지만 입시 경쟁은 험난할 것이다.';
        },
      },
    ];
  },
};

export const krAdmissionAudit: EventDef = {
  id: 'kr_admission_audit',
  title: () => '🚨 교육부 입시비리 전수조사 적발',
  text: (c) => {
    return (
      `교육부와 경찰청의 '고위층 자녀 스펙 품앗이 및 논문 대필 전수조사' 결과가 발표되었다!\n` +
      `${who(c)}이(가) 고교 시절 올렸던 학술지 논문과 표창장이 허위 스펙으로 특정되어\n` +
      `대학 입학 취소 심의위원회에 회부되었다는 통지서가 날아왔다.`
    );
  },
  choices: () => [
    {
      label: '대형 로펌을 선임해 입학 취소 처분 효력정지 가처분 소송 (3,000만 원)',
      cost: 3000,
      run: (x) => {
        x.s.scandal = Math.min(100, (x.s.scandal ?? 0) + 15);
        if (chance(x.s, 0.4)) {
          return '수년간의 지루한 법정 공방 끝에 징계를 면하고 졸업장을 지켰다. 그러나 학내 여론은 싸늘하다. (스캔들 +15)';
        }
        x.p.job = 'none';
        x.p.jobLevel = 0;
        return '가처분 신청이 기각되고 입학이 전격 취소되었다. 고졸 학력으로 강등되고 가문의 명예는 바닥으로 떨어졌다.';
      },
    },
    {
      label: '모든 사실을 시인하고 자진 자퇴 후 수능 정시 재도전',
      run: (x) => {
        x.p.actual.mor = clamp(x.p.actual.mor + 10, 0, 100);
        x.p.happiness = clamp(x.p.happiness - 15, 0, 100);
        x.p.job = 'none';
        x.p.jobLevel = 0;
        return '깨끗하게 자퇴서를 제출하고 노량진 재수학원으로 향했다. 뼈아픈 실패였지만 떳떳하게 다시 일어서기로 했다.';
      },
    },
  ],
};

// ─────────────────────────────────────────────────────────────
// 모듈 통합 및 Export
// ─────────────────────────────────────────────────────────────

export const K_REALITY_RANDOM: LifeDef[] = [
  krInheritanceDispute,
  krHousingCrossroads,
  krExOfficioOffer,
  krDaechiFrenzy,
];

export const K_REALITY_EVENTS: EventDef[] = [
  krInheritanceDispute,
  krInheritanceVerdict,
  krHousingCrossroads,
  krJeonseFraud,
  krAptLottery,
  krRealtyInterestShock,
  krExOfficioOffer,
  krExOfficioProbe,
  krDaechiFrenzy,
  krAdmissionAudit,
];
