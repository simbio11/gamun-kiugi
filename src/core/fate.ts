// 인연과 후폭풍: 지금의 선택이 몇 년 뒤 다른 사건으로 돌아온다.
// 결과는 선택하는 순간 확률로 정해져 예약(schedule)되지만, 플레이어에게는 숨겨진다.

import { chance, int, next, pick } from './rng';
import { FEMALE_NAMES, JOBS, MALE_NAMES, SURNAMES } from './data';
import { addAsset, addHolding, assetsOf, formatMoney, pay, personWorth } from './economy';
import { makeDate, marry } from './events';
import { eul, eun, gate, iga, schedule, who, type Choice, type Ctx, type EventDef } from './ev-util';
import { addFlag, age, alive, check, clamp, fullName, hasFlag, hasTrait, head, householder, isMainline, mark, spouseOf } from './people';
import type { GameState, Person } from './types';
import type { LifeDef } from './life';

const friendName = (s: GameState) => pick(s, SURNAMES) + pick(s, next(s) < 0.5 ? MALE_NAMES : FEMALE_NAMES);
const mood = (p: Person, d: number) => (p.happiness = clamp(p.happiness + d, 0, 100));
const later = '\n…언젠가 이 선택이 돌아올지도 모른다.';
const hasSpouse = (c: Ctx) => !!c.p.spouseId && alive(c.s.people[c.p.spouseId]);
const bondDelta = (s: GameState, p: Person, d: number) => {
  const sp = spouseOf(s, p);
  if (sp && alive(sp)) p.bond = sp.bond = clamp((p.bond ?? 60) + d, 0, 100);
};

// ───────────────────────── 보증 ─────────────────────────

const guarantee: LifeDef = {
  id: 'r_guarantee',
  weight: (s, p) => (age(s, p) >= 28 && !p.inLaw && p.cash > 0 ? 0.03 : 0),
  title: () => '친구의 부탁',
  text: (c) => {
    c.ev.data ??= { friend: friendName(c.s), amount: pick(c.s, [5000, 10000, 20000, 30000]) };
    return `${who(c)}의 오랜 친구 ${iga(c.ev.data.friend)} 찾아왔다.\n"사업 대출에 보증 좀 서줘. ${formatMoney(c.ev.data.amount)}이야. 절대 피해 안 가게 할게."`;
  },
  choices: () => [
    {
      label: '보증을 선다',
      run: (x) => signGuarantee(x, x.ev.data.amount),
    },
    {
      label: '절반만 보증한다',
      run: (x) => signGuarantee(x, x.ev.data.amount / 2),
    },
    {
      label: '미안하지만 거절한다',
      run: (x) => {
        x.p.actual.cha = clamp(x.p.actual.cha - 1, 0, 100);
        if (chance(x.s, 0.5)) schedule(x.s, int(x.s, 3, 8), 'friend_after', x.p.id, { friend: x.ev.data.friend, refused: true, ok: chance(x.s, 0.5) });
        return `${eun(x.ev.data.friend)} 서운한 얼굴로 돌아갔다.` + later;
      },
    },
  ],
};

/** 보증: 친구 사업의 운명은 지금 정해진다 (45% 부도) */
function signGuarantee(x: Ctx, amount: number): string {
  const { friend } = x.ev.data;
  x.p.actual.mor = clamp(x.p.actual.mor + 2, 0, 100);
  addFlag(x.p, 'guarantor');
  mark(x.p, 'kind', 1);
  mark(x.p, 'risk', 1);
  if (chance(x.s, 0.45)) schedule(x.s, int(x.s, 1, 5), 'guarantee_default', x.p.id, { friend, amount: Math.round(amount) });
  else if (chance(x.s, 0.6)) schedule(x.s, int(x.s, 3, 8), 'friend_after', x.p.id, { friend, amount, ok: true });
  bondDelta(x.s, x.p, -4);
  return `보증 서류에 도장을 찍었다. ${iga(friend)} 몇 번이고 고맙다고 했다.` + (hasSpouse(x) ? '\n배우자는 탐탁지 않은 표정이다.' : '') + later;
}

const guaranteeDefault: EventDef = {
  id: 'guarantee_default',
  title: () => '보증의 대가',
  text: (c) => `${c.ev.data.friend}의 회사가 부도났다. 친구는 연락이 끊겼다.\n은행에서 보증인 ${who(c)}에게 ${formatMoney(c.ev.data.amount)} 상환을 요구한다.`,
  choices: (c) => {
    const amt: number = c.ev.data.amount;
    return [
      {
        label: `대신 갚는다 (${formatMoney(amt)})`,
        run: (x) => {
          pay(x.s, x.p, amt);
          addFlag(x.p, 'guarantee_victim');
          bondDelta(x.s, x.p, -15);
          mood(x.p, -12);
          return `빚을 대신 갚았다. ${x.p.cash < 0 ? '대출까지 받아야 했다. ' : ''}배우자와 한동안 말을 하지 않았다.`;
        },
      },
      {
        label: '구상권 소송을 건다 (변호사비 500만)',
        run: (x) => {
          pay(x.s, x.p, amt + 500);
          addFlag(x.p, 'guarantee_victim');
          if (chance(x.s, 0.35)) schedule(x.s, int(x.s, 2, 4), 'guarantee_recover', x.p.id, { friend: x.ev.data.friend, amount: Math.round(amt * 0.4) });
          bondDelta(x.s, x.p, -10);
          return '일단 갚고, 친구를 상대로 소송을 걸었다. 재판은 오래 걸린다.';
        },
      },
      {
        label: '못 갚는다 — 개인회생 신청',
        run: (x) => {
          x.p.cash -= amt;
          addFlag(x.p, 'rehab');
          addFlag(x.p, 'guarantee_victim');
          x.s.fame = Math.max(0, x.s.fame - 3);
          bondDelta(x.s, x.p, -20);
          return '빚이 산더미가 됐다. 법원에 개인회생을 신청했다. (감당 못 하면 파산)';
        },
      },
    ];
  },
};

const guaranteeRecover: EventDef = {
  id: 'guarantee_recover',
  title: () => '승소',
  text: (c) => `${c.ev.data.friend}에게 건 구상권 소송에서 이겼다. 일부나마 돌려받았다.`,
  choices: () => [{ label: '받는다', run: (x) => ((x.p.cash += x.ev.data.amount), `${formatMoney(x.ev.data.amount)} 회수.`) }],
};

const friendAfter: EventDef = {
  id: 'friend_after',
  title: (c) => (c.ev.data.ok ? '친구의 성공' : '친구의 소식'),
  text: (c) => {
    const d = c.ev.data;
    if (!d.ok) return `${d.friend}의 사업이 결국 망했다고 한다. 동창회에서 들었다.\n"그때 네가 거절해 줘서 다행이었지…" 친구가 쓸쓸히 웃었다.`;
    if (d.refused) return `${d.friend}의 회사가 코스닥에 상장했다! 그때 보증을 거절했던 ${who(c)}에게는 연락이 없다.`;
    return `${d.friend}의 회사가 크게 성공했다. 어려울 때 보증을 서준 ${eul(who(c))} 잊지 않았다며 찾아왔다.`;
  },
  choices: (c) => {
    const d = c.ev.data;
    if (!d.ok) return [{ label: '위로한다', run: (x) => ((x.p.actual.mor = clamp(x.p.actual.mor + 1, 0, 100)), '소주 한잔 사줬다.') }];
    if (d.refused) return [{ label: '씁쓸하다', run: (x) => (mood(x.p, -4), '축하 문자 하나 보냈다. 답장은 없었다.') }];
    const kid = x_kid(c);
    const out: Choice[] = [
      { label: '고맙다는 선물을 받는다', run: (x) => ((x.p.cash += Math.round((d.amount ?? 10000) * 0.3)), `${formatMoney((d.amount ?? 10000) * 0.3)}어치 선물이 왔다.`) },
      {
        label: '회사 지분을 받는다',
        run: (x) => {
          const v = Math.round((d.amount ?? 10000) * (0.5 + next(x.s) * 2.5));
          addHolding(x.s, 'stock', x.p.id, v);
          return `${d.friend} 회사 주식을 받았다. 평가액 ${formatMoney(v)}.`;
        },
      },
    ];
    if (kid)
      out.push({
        label: `${kid.name}의 취직을 부탁한다`,
        run: (x) => {
          const k = x.s.people[kid.id];
          k.job = 'corp';
          k.jobLevel = 0;
          k.jobYears = 0;
          k.flags = k.flags.filter((f) => !f.startsWith('prep:') && !f.startsWith('tries:'));
          x.s.fame = Math.max(0, x.s.fame - 1);
          return `${iga(fullName(k))} ${d.friend}의 회사에 입사했다. 낙하산이라는 뒷말이 있다.`;
        },
      });
    return out;
  },
};
/** 백수인 성인 자녀 */
function x_kid(c: Ctx): Person | undefined {
  return c.p.childIds.map((id) => c.s.people[id]).find((k) => alive(k) && age(c.s, k) >= 22 && ['none', 'parttime'].includes(k.job) && !hasFlag(k, 'student'));
}

// ───────────────────────── 돈 빌려주기 ─────────────────────────

const lend: LifeDef = {
  id: 'r_lend',
  weight: (s, p) => (age(s, p) >= 25 && !p.inLaw && p.cash > 3000 ? 0.035 : 0),
  title: () => '돈 좀 빌려줘',
  text: (c) => {
    c.ev.data ??= { friend: friendName(c.s), amount: pick(c.s, [1000, 2000, 3000, 5000]), rel: pick(c.s, ['대학 동기', '고향 친구', '사촌', '직장 선배', '군대 동기']) };
    return `${c.ev.data.rel} ${c.ev.data.friend}에게서 전화가 왔다.\n"딱 ${formatMoney(c.ev.data.amount)}만. 1년 안에 꼭 갚을게."`;
  },
  choices: (c) => {
    const a: number = c.ev.data.amount;
    const lendIt = (paper: boolean) => (x: Ctx) => {
      x.p.cash -= a;
      mark(x.p, 'kind', 1);
      const r = next(x.s);
      const outcome = r < 0.5 ? 'repay' : r < 0.7 ? 'partial' : r < 0.93 ? 'vanish' : 'success';
      schedule(x.s, int(x.s, 1, 4), 'lend_result', x.p.id, { ...x.ev.data, outcome, paper });
      return `${formatMoney(a)}을 보냈다.${paper ? ' 차용증도 받아뒀다.' : ' 친구 사이에 무슨 차용증이냐며 그냥 줬다.'}` + later;
    };
    return [
      { label: '차용증 받고 빌려준다', disabled: c.p.cash < a, run: lendIt(true) },
      { label: '믿고 빌려준다', disabled: c.p.cash < a, run: lendIt(false) },
      { label: '거절한다', run: () => '"미안, 나도 요즘 빠듯해." 전화를 끊었다.' },
    ];
  },
};

const lendResult: EventDef = {
  id: 'lend_result',
  title: () => '빌려준 돈',
  text: (c) => {
    const d = c.ev.data;
    return {
      repay: `${iga(d.friend)} 빌린 ${formatMoney(d.amount)}을 이자까지 쳐서 갚았다.`,
      partial: `${iga(d.friend)} 사정이 어렵다며 절반만 갚았다.`,
      vanish: `${iga(d.friend)} 연락을 끊었다. 전화번호도 바뀌었다.`,
      success: `${iga(d.friend)} 사업에 성공했다며 빌린 돈의 세 배를 들고 왔다!`,
    }[d.outcome as 'repay'];
  },
  choices: (c) => {
    const d = c.ev.data;
    if (d.outcome === 'vanish')
      return gate(c.s, [
        {
          label: '소송한다',
          cost: 300,
          disabled: !d.paper,
          req: [d.paper ? '차용증 있음' : '차용증 없음'],
          run: (x) => (chance(x.s, 0.6) ? ((x.p.cash += d.amount), '재판에서 이겨 돈을 돌려받았다. 차용증 덕분이다.') : '이겼지만 받을 재산이 없단다. 종이 쪼가리만 남았다.'),
        },
        { label: '떼인 셈 친다', run: (x) => (mood(x.p, -6), '돈도 잃고 친구도 잃었다.') },
      ]);
    const got = { repay: d.amount * 1.1, partial: d.amount * 0.5, success: d.amount * 3 }[d.outcome as 'repay'];
    return [{ label: '받는다', run: (x) => ((x.p.cash += Math.round(got)), `${formatMoney(got)} 입금.`) }];
  },
};

// ───────────────────────── 투자 권유 ─────────────────────────

const startup: LifeDef = {
  id: 'r_startup',
  weight: (s, p) => (age(s, p) >= 30 && !p.inLaw && p.cash > 5000 ? 0.025 : 0),
  title: () => '엔젤 투자',
  text: (c) => {
    c.ev.data ??= { friend: friendName(c.s), field: pick(c.s, ['AI 챗봇', '반려동물 앱', '밀키트', '전기차 충전', '웹툰 플랫폼', '바이오 신약', '중고거래 앱']) };
    return `후배 ${iga(c.ev.data.friend)} ${c.ev.data.field} 스타트업을 차렸다며 초기 투자를 부탁한다.\n"지금 들어오시면 지분 5%. 10년 뒤엔 유니콘입니다."`;
  },
  choices: (c) => {
    const inv = (amt: number) => (x: Ctx) => {
      x.p.cash -= amt;
      mark(x.p, 'risk', 1);
      const merchant = x.p.talents.some((t) => t.id === 'merchant') ? 0.06 : 0;
      const r = next(x.s);
      const mult = r < 0.08 + merchant ? 30 : r < 0.3 + merchant ? 2.5 : r < 0.45 ? 0.5 : 0;
      schedule(x.s, int(x.s, 4, 10), 'startup_exit', x.p.id, { ...x.ev.data, amount: amt, mult });
      return `${formatMoney(amt)}을 투자했다. 스타트업 10곳 중 9곳은 망한다는데…` + later;
    };
    return [
      { label: '3천만 투자', disabled: c.p.cash < 3000, run: inv(3000) },
      { label: '1억 투자', disabled: c.p.cash < 10000, run: inv(10000) },
      { label: '응원만 한다', run: () => '"잘 될 거야." 투자는 안 했다.' },
    ];
  },
};

const startupExit: EventDef = {
  id: 'startup_exit',
  title: (c) => (c.ev.data.mult >= 30 ? '유니콘!' : c.ev.data.mult > 1 ? '엑싯' : '폐업 소식'),
  text: (c) => {
    const d = c.ev.data;
    if (d.mult >= 30) return `${d.friend}의 ${d.field} 회사가 대기업에 인수됐다! 몇 년 전 넣은 ${formatMoney(d.amount)}이 ${formatMoney(d.amount * d.mult)}이 되었다!!!`;
    if (d.mult > 1) return `${d.friend}의 회사가 인수합병됐다. 투자금 ${formatMoney(d.amount)}이 ${formatMoney(d.amount * d.mult)}이 됐다.`;
    if (d.mult > 0) return `${d.friend}의 회사가 헐값에 팔렸다. 투자금의 절반만 돌아왔다.`;
    return `${d.friend}의 ${d.field} 회사가 문을 닫았다. 투자금 ${formatMoney(d.amount)}은 사라졌다.`;
  },
  choices: (c) => [
    {
      label: c.ev.data.mult > 0 ? '받는다' : '그런 게 투자지',
      run: (x) => {
        const v = Math.round(x.ev.data.amount * x.ev.data.mult);
        x.p.cash += v;
        if (x.ev.data.mult >= 30) {
          x.s.fame += 5;
          addFlag(x.p, 'angel_jackpot');
        }
        return v ? `${formatMoney(v)} 입금.` : '수업료였다.';
      },
    },
  ],
};

/** 폰지: 처음 몇 번은 배당이 들어오다가 어느 날 무너진다 */
const ponzi: LifeDef = {
  id: 'r_ponzi',
  weight: (s, p) => (age(s, p) >= 35 && !p.inLaw && p.cash > 3000 && !hasFlag(p, 'ponzi') ? 0.02 : 0),
  title: () => '원금 보장 월 3%',
  text: () => '동창이 "코인 차익거래" 투자를 권한다.\n"원금 보장에 매달 3% 배당. 벌써 수백 명이 받고 있어."',
  choices: (c) => {
    const go = (amt: number) => (x: Ctx) => {
      x.p.cash -= amt;
      mark(x.p, 'risk', 1);
      addFlag(x.p, 'ponzi');
      const smart = check(x.s, x.p.actual.int, 70, 8);
      schedule(x.s, 1, 'ponzi_payout', x.p.id, { amount: amt, left: int(x.s, 1, 3), smart });
      return `${formatMoney(amt)}을 넣었다.` + later;
    };
    return [
      { label: '3천만 넣는다', disabled: c.p.cash < 3000, run: go(3000) },
      { label: '1억 넣는다', disabled: c.p.cash < 10000, run: go(10000) },
      { label: '세상에 공짜는 없다', run: () => '거절했다.' },
    ];
  },
};

const ponziPayout: EventDef = {
  id: 'ponzi_payout',
  title: (c) => (c.ev.data.left > 0 ? '배당금 입금' : '뉴스 속보'),
  text: (c) => {
    const d = c.ev.data;
    if (d.left > 0) return `정말로 1년 치 배당 ${formatMoney(d.amount * 0.36)}이 들어왔다! 주변에서도 너도나도 넣는다고 한다.`;
    return `"수천억대 폰지 사기… 대표 해외 도주" ${iga(who(c))} 넣은 ${formatMoney(d.amount)}이 사라졌다.`;
  },
  choices: (c) => {
    const d = c.ev.data;
    if (d.left <= 0)
      return [
        {
          label: '피해자 모임에 들어간다',
          run: (x) => {
            mood(x.p, -15);
            addFlag(x.p, 'ponzi_victim');
            if (d.recruited) {
              x.s.fame = Math.max(0, x.s.fame - 6);
              for (const q of Object.values(x.s.people)) if (alive(q) && !isMainline(x.s, q)) q.affinity = clamp(q.affinity - 10, -100, 100);
            }
            if (chance(x.s, 0.2)) {
              x.p.cash += Math.round(d.amount * 0.15);
              return '몇 년 뒤 15%를 돌려받았다. 나머지는 영영.';
            }
            return '돌려받을 길은 없었다.';
          },
        },
      ];
    const pay1 = Math.round(d.amount * 0.36);
    return [
      {
        label: '원금을 빼겠다고 한다',
        run: (x) => {
          x.p.cash += pay1;
          if (chance(x.s, d.smart ? 0.8 : 0.5)) {
            x.p.cash += d.amount;
            return '원금까지 돌려받았다. 뭔가 찜찜해서 뺐는데… 잘한 걸까?';
          }
          schedule(x.s, 1, 'ponzi_payout', x.p.id, { ...d, left: 0 });
          return '"지금은 출금이 몰려서요, 다음 달에…" 출금이 막혔다.';
        },
      },
      {
        label: '그대로 둔다',
        run: (x) => {
          x.p.cash += pay1;
          schedule(x.s, 1, 'ponzi_payout', x.p.id, { ...d, left: d.left - 1 });
          return '달콤하다.';
        },
      },
      {
        label: '배당까지 다시 넣고, 지인도 끌어들인다',
        run: (x) => {
          schedule(x.s, 1, 'ponzi_payout', x.p.id, { ...d, amount: d.amount + pay1, left: d.left - 1, recruited: true });
          addFlag(x.p, 'ponzi_recruiter');
          return '친척들에게도 권했다. 다들 고마워한다. 지금은.';
        },
      },
    ];
  },
};

// ───────────────────────── 보험·청약·재개발·검진 ─────────────────────────

const insurance: LifeDef = {
  id: 'r_insurance',
  weight: (s, p) => (age(s, p) >= 30 && age(s, p) <= 60 && !p.inLaw && !p.flags.some((f) => f.startsWith('ins_')) ? 0.012 : 0),
  title: () => '보험 설계사',
  text: (c) => `${who(c)}에게 보험 설계사가 찾아왔다.\n"요즘 암 진단비 없으면 큰일 나요. 종신보험은 가족을 위한 마지막 선물이고요."`,
  choices: () => [
    { label: '암보험 (연 150만)', run: (x) => (addFlag(x.p, 'ins_cancer'), '암 진단 시 5천만원이 나오는 보험에 가입했다.') },
    { label: '종신보험 (연 600만)', run: (x) => (addFlag(x.p, 'ins_life'), '사망 시 가족에게 3억이 나오는 보험에 가입했다.') },
    { label: '둘 다 (연 750만)', run: (x) => (addFlag(x.p, 'ins_cancer'), addFlag(x.p, 'ins_life'), '보험료가 만만치 않지만 든든하다.') },
    { label: '필요 없다', run: () => '"건강 하나는 자신 있어요."' },
  ],
};

const subscription: LifeDef = {
  id: 'r_subscription',
  weight: (s, p) => (age(s, p) >= 20 && age(s, p) <= 40 && !p.inLaw && !hasFlag(p, 'sub_account') && !assetsOf(s, p.id).some((a) => a.kind.startsWith('apt')) ? 0.03 : 0),
  title: () => '청약통장',
  text: (c) => `은행 창구 직원이 ${who(c)}에게 주택청약종합저축 가입을 권한다.\n"꾸준히 넣어두시면 언젠가 새 아파트 분양받으실 수 있어요."`,
  choices: () => [
    { label: '가입한다 (연 120만)', run: (x) => (addFlag(x.p, 'sub_account'), x.p.flags.push('sub_since:' + x.s.year), '매달 10만원씩 넣기로 했다. 가점은 쌓일수록 유리하다.') },
    { label: '나중에', run: () => '"아파트는 무슨…"' },
  ],
};

const subscriptionWin: EventDef = {
  id: 'sub_win',
  title: () => '🎉 청약 당첨',
  text: (c) => {
    c.ev.data ??= { price: Math.round(c.s.market.apt_seoul * 0.55), value: Math.round(c.s.market.apt_seoul * 0.8) };
    return `${who(c)}, 수도권 신축 아파트 청약에 당첨됐다!\n분양가 ${formatMoney(c.ev.data.price)} · 주변 시세 ${formatMoney(c.ev.data.value)}.\n계약금 20%만 있으면 나머지는 중도금 대출.`;
  },
  choices: (c) => [
    {
      label: '계약한다',
      disabled: c.p.cash < c.ev.data.price * 0.2,
      req: [`계약금 ${formatMoney(c.ev.data.price * 0.2)}`],
      run: (x) => {
        x.p.cash -= x.ev.data.price;
        addAsset(x.s, 'apt_seoul', x.p.id, x.ev.data.value, '분양받은 새 아파트');
        addFlag(x.p, 'sub_winner');
        x.p.flags = x.p.flags.filter((f) => f !== 'sub_account' && !f.startsWith('sub_since:'));
        return `내 집 마련 성공! 대출 ${formatMoney(Math.max(0, -x.p.cash))}은 차차 갚아나가자.`;
      },
    },
    {
      label: '돈이 없어 포기한다',
      run: (x) => {
        mood(x.p, -8);
        // 당첨 포기하면 가점이 초기화된다
        x.p.flags = x.p.flags.filter((f) => !f.startsWith('sub_since:'));
        x.p.flags.push('sub_since:' + x.s.year);
        return '눈물을 머금고 포기했다. 가점이 날아갔다.';
      },
    },
    ...(c.p.id !== householder(c.s).id
      ? [
          {
            label: '부모님께 계약금을 빌린다',
            run: (x: Ctx) => {
              const par = householder(x.s);
              const down = Math.round(x.ev.data.price * 0.2);
              par.cash -= down;
              x.p.cash += down;
              x.p.cash -= x.ev.data.price;
              addAsset(x.s, 'apt_seoul', x.p.id, x.ev.data.value, '분양받은 새 아파트');
              addFlag(x.p, 'sub_winner');
              x.p.flags = x.p.flags.filter((f) => f !== 'sub_account' && !f.startsWith('sub_since:'));
              return `${iga(fullName(par))} 계약금 ${formatMoney(down)}을 보태줬다. 내 집 마련 성공!`;
            },
          } as Choice,
        ]
      : []),
  ],
};

const redevelop: LifeDef = {
  id: 'r_redevelop',
  weight: (s, p) => (p.id === s.headId && assetsOf(s, p.id).some((a) => a.kind === 'apt_local' && !a.name.includes('(')) ? 0.04 : 0),
  title: () => '재개발 조합',
  text: (c) => {
    const a = c.s.assets.find((z) => z.id === c.ev.data?.assetId) ?? assetsOf(c.s, c.p.id).find((z) => z.kind === 'apt_local' && !z.name.includes('('))!;
    c.ev.data ??= { assetId: a.id, levy: Math.round(a.value * (0.2 + next(c.s) * 0.3)) };
    return `${who(c)}의 ${a.name} 단지에 재개발 조합이 생겼다. 동의서를 걷는다.\n예상 분담금 ${formatMoney(c.ev.data.levy)}. 새 아파트가 되면 값이 두 배는 된다는데…`;
  },
  valid: (c) => !!c.s.assets.find((z) => z.id === c.ev.data?.assetId) || assetsOf(c.s, c.p.id).some((z) => z.kind === 'apt_local' && !z.name.includes('(')),
  choices: () => [
    {
      label: '동의한다 (분담금은 나중에)',
      run: (x) => {
        const ok = chance(x.s, 0.65);
        schedule(x.s, int(x.s, 5, 11), 'redevelop_done', x.p.id, { ...x.ev.data, ok });
        const a = x.s.assets.find((z) => z.id === x.ev.data.assetId);
        if (a) a.name += ' (재건축 중)';
        return '동의서에 도장을 찍었다. 이주비를 받아 전세로 옮겼다.' + later;
      },
    },
    {
      label: '프리미엄 받고 판다',
      run: (x) => {
        const a = x.s.assets.find((z) => z.id === x.ev.data.assetId);
        if (!a) return '';
        const got = Math.round(a.value * 1.25);
        x.p.cash += got;
        x.s.assets = x.s.assets.filter((z) => z !== a);
        return `재개발 기대감에 웃돈을 받고 팔았다. ${formatMoney(got)}.`;
      },
    },
    { label: '반대한다', run: () => '"살던 대로 살련다." 조합은 동의율을 못 채웠다.' },
  ],
};

const redevelopDone: EventDef = {
  id: 'redevelop_done',
  valid: (c) => c.s.assets.some((a) => a.id === c.ev.data.assetId),
  title: (c) => (c.ev.data.ok ? '입주' : '재개발 표류'),
  text: (c) =>
    c.ev.data.ok
      ? `드디어 새 아파트가 완공됐다! 분담금 ${formatMoney(c.ev.data.levy)}을 내고 입주한다.`
      : `조합 비리와 공사비 분쟁으로 재개발이 멈췄다. 몇 년째 폐허다. 분담금 일부 ${formatMoney(c.ev.data.levy * 0.3)}만 날렸다.`,
  choices: () => [
    {
      label: '확인',
      run: (x) => {
        const a = x.s.assets.find((z) => z.id === x.ev.data.assetId)!;
        if (x.ev.data.ok) {
          pay(x.s, x.p, x.ev.data.levy);
          a.value = Math.round(a.value * 2.2);
          a.name = '신축 아파트';
          return `집값이 ${formatMoney(a.value)}가 됐다!`;
        }
        pay(x.s, x.p, Math.round(x.ev.data.levy * 0.3));
        a.value = Math.round(a.value * 0.85);
        a.name = a.name.replace(' (재건축 중)', ' (사업 중단)');
        return '빈 단지에 까마귀만 운다.';
      },
    },
  ],
};

const checkup: LifeDef = {
  id: 'r_checkup',
  weight: (s, p) => (age(s, p) >= 40 && !p.flags.some((f) => f.startsWith('checkup:') && s.year - Number(f.slice(8)) < 8) ? 0.015 : 0),
  title: () => '건강검진',
  text: (c) => `${who(c)}에게 종합건강검진 안내문이 왔다. 내시경·CT까지 받으면 비싸다.`,
  choices: (c) =>
    gate(c.s, [
      {
        label: '정밀 종합검진 (200만)',
        cost: 200,
        run: (x) => {
          x.p.flags = x.p.flags.filter((f) => !f.startsWith('checkup:'));
          x.p.flags.push('checkup:' + x.s.year);
          mark(x.p, 'health_x', -1);
          return '이상 없음. 한동안은 병이 생겨도 초기에 잡을 수 있다.';
        },
      },
      { label: '기본 검진만', run: () => '"다 정상이네요." 반쯤 믿기로 했다.' },
      { label: '바빠서 건너뛴다', run: (x) => (hasTrait(x.p, 'frail') ? '몸이 약한데 괜찮을까…' : '올해도 미뤘다.') },
    ]),
};

// ───────────────────────── 일상의 후폭풍 ─────────────────────────

const drunkDrive: LifeDef = {
  id: 'r_drunk',
  weight: (s, p) => (age(s, p) >= 22 && !p.inLaw ? 0.007 * (hasTrait(p, 'gambler') || hasTrait(p, 'rebel') ? 2 : 1) * (hasFlag(p, 'dui_habit') ? 3 : 1) : 0),
  title: () => '회식 끝나고',
  text: (c) => `회식이 늦게 끝났다. ${who(c)}, 차를 가져왔다. 대리운전은 40분 대기.`,
  choices: () => [
    { label: '기다렸다 대리를 부른다', run: (x) => ((x.p.cash -= 3), '4만원이 아깝지 않다.') },
    { label: '택시 타고 차는 두고 간다', run: () => '내일 아침에 가지러 오면 된다.' },
    {
      label: '가까우니까 그냥 운전한다',
      run: (x) => {
        const r = next(x.s);
        if (r < 0.06) {
          x.p.actual.hp = clamp(x.p.actual.hp - 20, 0, 100);
          x.p.cash -= 5000;
          addFlag(x.p, 'dui');
          x.s.fame = Math.max(0, x.s.fame - 8);
          if (JOBS[x.p.job].kind === 'salary' && JOBS[x.p.job].cat === 'public') x.p.jobLevel = Math.max(0, x.p.jobLevel - 2);
          return '💥 사고를 냈다. 합의금 5천만, 면허 취소, 징계. 평생 따라다닐 전과가 생겼다.';
        }
        if (r < 0.2) {
          x.p.cash -= 1000;
          addFlag(x.p, 'dui');
          x.s.fame = Math.max(0, x.s.fame - 3);
          return '🚨 음주 단속에 걸렸다. 벌금 1천만, 면허 취소.';
        }
        addFlag(x.p, 'dui_habit');
        mark(x.p, 'cheat', 1);
        mark(x.p, 'health_x', 1);
        return '무사히 집에 왔다. …이번에는.';
      },
    },
  ],
};

const noise: LifeDef = {
  id: 'r_noise',
  weight: (s, p) => (p.id === s.headId && age(s, p) >= 25 ? 0.02 : 0),
  title: () => '층간소음',
  text: () => '윗집에서 밤마다 쿵쿵거린다. 벌써 석 달째.',
  choices: () => [
    { label: '과일 바구니 들고 찾아간다', run: (x) => (chance(x.s, 0.7) ? (mood(x.p, 5), '아이가 셋이란다. 매트를 깔겠다며 미안해했다.') : '"우리 집 아닌데요?" 문이 쾅 닫혔다.') },
    {
      label: '관리실에 민원 넣고 천장을 두드린다',
      run: (x) => {
        if (chance(x.s, 0.4)) schedule(x.s, 1, 'noise_war', x.p.id);
        return '윗집이 조용해졌다. 대신 엘리베이터에서 눈을 피한다.' + later;
      },
    },
    { label: '참는다', run: (x) => (mood(x.p, -6), '귀마개를 샀다.') },
  ],
};

const noiseWar: EventDef = {
  id: 'noise_war',
  title: () => '보복 소음',
  text: () => '윗집이 우퍼 스피커를 천장에 달았다. 이웃 전쟁이다.',
  choices: (c) =>
    gate(c.s, [
      { label: '소송한다', cost: 500, run: (x) => (chance(x.s, 0.6) ? '승소했다. 윗집이 이사 갔다.' : (mood(x.p, -8), '증거 불충분. 변호사비만 날렸다.')) },
      { label: '이사 간다', cost: 1500, run: (x) => (mood(x.p, 6), '이사 비용이 들었지만 평화를 찾았다.') },
      { label: '이어폰 끼고 버틴다', run: (x) => (mood(x.p, -10), (x.p.actual.hp = clamp(x.p.actual.hp - 2, 0, 100)), '잠을 설치는 밤이 계속된다.') },
    ]),
};

const lottoRelatives: EventDef = {
  id: 'lotto_relatives',
  title: () => '로또 후폭풍',
  text: (c) => `${who(c)}의 로또 당첨 소문이 퍼졌다. 10년 만에 연락 온 친척들이 줄을 섰다.`,
  choices: () => [
    {
      label: '조금씩 나눠준다 (1억)',
      run: (x) => {
        x.p.cash -= 10000;
        x.s.fame += 3;
        return '친척들이 입을 모아 칭찬한다. 다음 명절이 기대된다(?).';
      },
    },
    {
      label: '연락을 끊는다',
      run: (x) => {
        for (const p of Object.values(x.s.people)) if (alive(p) && !isMainline(x.s, p)) p.affinity = clamp(p.affinity - 15, -100, 100);
        return '"돈 벌더니 변했다"는 말이 돈다.';
      },
    },
  ],
};

const firstLove: EventDef = {
  id: 'first_love',
  valid: (c) => age(c.s, c.p) < 70,
  title: () => '첫사랑',
  text: (c) => `${age(c.s, c.p)}세의 ${who(c)}, 우연히 들른 카페에서 학창 시절 첫사랑 ${eul(c.ev.data.name)} 만났다.\n"…너 하나도 안 변했다."`,
  choices: (c) => {
    if (hasSpouse(c))
      return [
        { label: '반갑게 인사만 하고 헤어진다', run: (x) => (bondDelta(x.s, x.p, 2), '추억은 추억으로 남기기로 했다. 집에 가서 배우자를 꼭 안아줬다.') },
        {
          label: '연락처를 주고받는다',
          run: (x) => {
            bondDelta(x.s, x.p, -15);
            if (chance(x.s, 0.45)) {
              bondDelta(x.s, x.p, -25);
              return '몰래 만나다 들켰다. 집안이 뒤집혔다.';
            }
            return '가끔 안부 문자를 주고받는다. 배우자는 아직 모른다.';
          },
        },
      ];
    return [
      {
        label: '다시 시작해 본다',
        run: (x) => {
          if (chance(x.s, 0.55)) {
            const sp = makeDate(x.s, x.p, 6);
            sp.name = x.ev.data.name.slice(1);
            sp.surname = x.ev.data.name[0];
            marry(x.s, x.p, sp);
            addFlag(x.p, 'married_first_love');
            mood(x.p, 20);
            return `💍 돌고 돌아 첫사랑과 결혼했다!`;
          }
          return '몇 번 만났지만, 그때의 우리가 아니었다.';
        },
      },
      { label: '추억으로 남긴다', run: () => '커피 한 잔으로 충분했다.' },
    ];
  },
};

const bullyExpose: EventDef = {
  id: 'bully_expose',
  title: () => '학폭 폭로',
  text: (c) => {
    const famous = JOBS[c.p.job].fame >= 1.5 || ['entertainer', 'politician', 'youtuber', 'athlete', 'announcer'].includes(c.p.job);
    c.ev.data = { ...c.ev.data, famous };
    return famous
      ? `온라인 커뮤니티에 글이 올라왔다. "${who(c)}에게 학교폭력을 당했습니다." 중학교 동창의 폭로다. 기사가 쏟아진다.`
      : `동창회에서 누군가 ${who(c)}의 학창 시절 이야기를 꺼냈다. 분위기가 싸해졌다.`;
  },
  choices: (c) =>
    c.ev.data.famous
      ? gate(c.s, [
          {
            label: '진심으로 사과한다',
            run: (x) => {
              x.s.fame = Math.max(0, x.s.fame - 6);
              x.p.jobLevel = Math.max(0, x.p.jobLevel - 1);
              return '피해자를 찾아가 사과했다. 활동은 잠시 멈췄다.';
            },
          },
          {
            label: '법적 대응하겠다며 부인한다',
            cost: 1000,
            run: (x) => {
              if (chance(x.s, x.ev.data.denied ? 0.25 : 0.6)) {
                x.s.fame = Math.max(0, x.s.fame - 25);
                x.p.jobLevel = 0;
                return '증거 사진이 나왔다. 역풍이 거세다. 모든 활동에서 하차했다. (명성 -25)';
              }
              return '폭로자가 글을 내렸다. 진실은 흐릿해졌다.';
            },
          },
        ])
      : [{ label: '고개를 숙인다', run: (x) => ((x.p.actual.mor = clamp(x.p.actual.mor + 3, 0, 100)), '"그땐 내가 미안했어." 늦은 사과를 했다.') }],
};

const bullyApology: EventDef = {
  id: 'bully_apology',
  title: () => '늦은 사과',
  text: (c) => `${eul(who(c))} 괴롭혔던 동창이 찾아왔다. "그때 정말 미안했어. 평생 마음에 걸렸어."`,
  choices: () => [
    { label: '용서한다', run: (x) => ((x.p.flags = x.p.flags.filter((f) => f !== 'trauma')), mood(x.p, 12), (x.p.actual.mor = clamp(x.p.actual.mor + 3, 0, 100)), '오래된 상처가 조금 아물었다.') },
    { label: '돌려보낸다', run: (x) => (mood(x.p, 3), '"사과는 받을게. 용서는 모르겠다."') },
  ],
};

const scholarReturn: EventDef = {
  id: 'scholar_return',
  title: () => '장학생의 편지',
  text: (c) => `"${c.ev.data.years}년 전 ${c.s.familyName}씨 가문 장학금으로 공부한 학생입니다." 이제 ${pick({ rng: c.s.year }, ['의사', '교수', '판사', '벤처 사장', '외교관'])}이 되었다며 인사를 왔다.`,
  choices: (c) => {
    const kids = Object.values(c.s.people).filter((p) => alive(p) && isMainline(c.s, p) && age(c.s, p) >= 8 && age(c.s, p) < 20);
    return [
      { label: '기쁘게 맞이한다', run: (x) => ((x.s.fame += 6), '신문에 "대를 이은 선행" 기사가 났다. (명성 +6)') },
      ...(kids.length
        ? [
            {
              label: '우리 아이들 멘토가 되어 달라고 한다',
              run: (x: Ctx) => {
                for (const k of kids) k.study = clamp((k.study ?? 40) + 5, 0, 100);
                x.s.fame += 2;
                return '방학마다 아이들 공부를 봐주기로 했다. (자녀 성적 +5)';
              },
            } as Choice,
          ]
        : []),
    ];
  },
};

const petFarewell: EventDef = {
  id: 'pet_farewell',
  title: () => '무지개다리',
  text: () => '15년을 함께한 복실이가 눈을 감았다. 가족 모두 목놓아 울었다.',
  choices: () => [
    {
      label: '마음을 추스르고 새 식구를 들인다',
      run: (x) => {
        schedule(x.s, int(x.s, 12, 16), 'pet_farewell', x.p.id);
        return '보호소에서 눈이 마주친 아이를 데려왔다. 이름은 "복실이 2호".';
      },
    },
    { label: '다시는 못 키울 것 같다', run: (x) => (mood(x.p, -8), (x.p.flags = x.p.flags.filter((f) => f !== 'pet')), '빈 방석을 오래 치우지 못했다.') },
  ],
};

const studyAbroad: LifeDef = {
  id: 'r_abroad',
  weight: (s, p) => {
    const a = age(s, p);
    return a >= 13 && a <= 16 && !hasFlag(p, 'abroad') && personWorth(s, householder(s)) > 50000 ? 0.05 : 0;
  },
  title: () => '조기유학',
  text: (c) => `${who(c)}의 친구 몇 명이 미국으로 조기유학을 떠난다. 아이도 가고 싶어 한다.\n(3년 학비·생활비 약 2억)`,
  choices: (c) =>
    gate(c.s, [
      {
        label: '보낸다 (기러기 가족)',
        cost: 20000,
        run: (x) => {
          addFlag(x.p, 'abroad');
          x.p.study = clamp((x.p.study ?? 50) + 6, 0, 100);
          x.p.actual.cha = clamp(x.p.actual.cha + 6, 0, 100);
          x.p.eduSpent = (x.p.eduSpent ?? 0) + 20000;
          const par = [x.s.people[x.p.fatherId ?? ''], x.s.people[x.p.motherId ?? '']].find((z) => z && isMainline(x.s, z));
          if (par) bondDelta(x.s, par, -12);
          if (chance(x.s, 0.3)) schedule(x.s, int(x.s, 10, 15), 'emigrate', x.p.id);
          return '영어는 원어민처럼 늘었다. 부부는 3년간 떨어져 살았다.' + later;
        },
      },
      { label: '국내에서 열심히 하자', run: (x) => (mood(x.p, -5), '아이가 입을 삐죽 내민다.') },
    ]),
};

const emigrate: EventDef = {
  id: 'emigrate',
  title: () => '해외 정착',
  text: (c) => `${iga(who(c))} 미국에서 좋은 일자리를 얻었다며, 한국에 돌아오지 않겠다고 한다.`,
  choices: () => [
    { label: '응원한다', run: (x) => (addFlag(x.p, 'emigrated'), (x.p.affinity = clamp(x.p.affinity + 10, -100, 100)), '명절에만 영상통화로 얼굴을 본다.') },
    {
      label: '돌아오라고 설득한다',
      run: (x) => {
        if (chance(x.s, 0.4)) return (x.p.affinity = clamp(x.p.affinity - 5, -100, 100)), '마지못해 귀국했다.';
        addFlag(x.p, 'emigrated');
        x.p.affinity = clamp(x.p.affinity - 20, -100, 100);
        return '말다툼 끝에 전화를 끊었다.';
      },
    },
  ],
};

const mlm: LifeDef = {
  id: 'r_mlm',
  weight: (s, p) => (age(s, p) >= 25 && !p.inLaw && ['none', 'parttime', 'pension'].includes(p.job) ? 0.02 : 0),
  title: () => '오랜만의 연락',
  text: () => '10년 만에 연락 온 동창이 좋은 사업 기회가 있다며 세미나에 초대한다.',
  choices: () => [
    {
      label: '가본다. 들어나 보자',
      run: (x) => {
        if (check(x.s, x.p.actual.int, 50, 8)) return '다단계였다. 정신 차리고 빠져나왔다.';
        x.p.cash -= 2000;
        mark(x.p, 'risk', 1);
        schedule(x.s, int(x.s, 1, 2), 'mlm_end', x.p.id);
        return '건강식품 2천만원어치를 떠안았다. "직급만 올리면 월 천만원이래!"' + later;
      },
    },
    { label: '바쁘다고 거절한다', run: () => '읽씹했다.' },
  ],
};

const mlmEnd: EventDef = {
  id: 'mlm_end',
  title: () => '다단계의 끝',
  text: (c) => `${who(c)}의 방에는 팔지 못한 건강식품 박스가 천장까지 쌓였다. 친구들은 전화를 안 받는다.`,
  choices: () => [
    { label: '손절한다', run: (x) => (mood(x.p, -10), (x.p.actual.cha = clamp(x.p.actual.cha - 3, 0, 100)), '박스를 헐값에 넘겼다. 인간관계도 반쯤 잃었다.') },
  ],
};

/** 예약만 되는 후속 이벤트 */
export const FATE_EVENTS: EventDef[] = [
  guaranteeDefault,
  guaranteeRecover,
  friendAfter,
  lendResult,
  startupExit,
  ponziPayout,
  subscriptionWin,
  redevelopDone,
  noiseWar,
  lottoRelatives,
  firstLove,
  bullyExpose,
  bullyApology,
  scholarReturn,
  petFarewell,
  emigrate,
  mlmEnd,
];
/** 가족 누구에게나 무작위로 일어나는 것 */
export const FATE_RANDOM: LifeDef[] = [guarantee, lend, startup, ponzi, insurance, subscription, redevelop, checkup, drunkDrive, noise, studyAbroad, mlm];

/** 해마다: 보험료·청약 당첨 추첨·보험금 지급·예약된 후폭풍 도착 */
export function fateYear(s: GameState) {
  for (const p of Object.values(s.people)) {
    if (!alive(p)) continue;
    // 보험료 (가주 가계가 낸다)
    const premium = (hasFlag(p, 'ins_cancer') ? 150 : 0) + (hasFlag(p, 'ins_life') ? 600 : 0);
    if (premium) (isMainline(s, p) ? householder(s) : p).cash -= premium;
    // 암 진단비
    const c = p.flags.find((f) => f.startsWith('cancer:'));
    if (c && hasFlag(p, 'ins_cancer') && !hasFlag(p, 'ins_cancer_paid') && Number(c.split(':')[2]) >= s.year - 1) {
      p.cash += 5000;
      addFlag(p, 'ins_cancer_paid');
      s.log.push({ year: s.year, text: `📄 ${fullName(p)} 암 진단비 5,000만원 수령`, kind: 'money' });
    }
    // 청약: 가입 기간이 길수록 당첨 확률↑
    if (hasFlag(p, 'sub_account') && isMainline(s, p)) {
      p.cash -= 120;
      const since = Number(p.flags.find((f) => f.startsWith('sub_since:'))?.slice(10) ?? s.year);
      if (chance(s, Math.min(0.08, 0.004 + (s.year - since) * 0.006)) && !s.events.some((e) => e.defId === 'sub_win')) s.events.push({ uid: s.eventSeq++, defId: 'sub_win', personId: p.id });
    }
  }
  // 예약된 사건 도착
  const due = (s.scheduled ?? []).filter((x) => x.year <= s.year);
  s.scheduled = (s.scheduled ?? []).filter((x) => x.year > s.year);
  for (const d of due) {
    const p = s.people[d.personId];
    if (!p || !alive(p)) continue;
    // 방계가 된 사람의 후폭풍은 조용히 처리
    if (!isMainline(s, p) && p.id !== head(s).id) continue;
    s.events.push({ uid: s.eventSeq++, defId: d.defId, personId: d.personId, data: d.data });
  }
}

/** 본인이 알고 있는 '진행 중인 일' (결과는 모름) — 인물 상세에 표시 */
export function pendingAffairs(s: GameState, p: Person): string[] {
  const out: string[] = [];
  for (const x of s.scheduled ?? []) {
    if (x.personId !== p.id) continue;
    const d = x.data ?? {};
    if (x.defId === 'lend_result') out.push(`💸 ${d.friend}에게 빌려준 ${formatMoney(d.amount)}`);
    if ((x.defId === 'guarantee_default' || x.defId === 'friend_after') && d.amount && !d.refused) out.push(`✍ ${d.friend} 사업 대출 보증`);
    if (x.defId === 'startup_exit') out.push(`🚀 ${d.friend}의 ${d.field} 스타트업에 ${formatMoney(d.amount)} 투자`);
    if (x.defId === 'ponzi_payout') out.push(`📈 월 3% 고수익 상품 ${formatMoney(d.amount)}`);
    if (x.defId === 'redevelop_done') out.push('🏗 재개발 진행 중');
    if (x.defId === 'guarantee_recover') out.push(`⚖ ${d.friend} 상대 구상권 소송 중`);
  }
  if (hasFlag(p, 'sub_account')) {
    const since = Number(p.flags.find((f) => f.startsWith('sub_since:'))?.slice(10) ?? s.year);
    out.push(`🏦 청약통장 ${s.year - since}년차`);
  }
  if (hasFlag(p, 'ins_cancer')) out.push('📄 암보험');
  if (hasFlag(p, 'ins_life')) out.push('📄 종신보험');
  return out;
}

/** 종신보험: 사망 시 가족에게 */
export function lifeInsurancePayout(s: GameState, dead: Person) {
  if (!hasFlag(dead, 'ins_life')) return;
  const heir = spouseOf(s, dead) && alive(spouseOf(s, dead)!) ? spouseOf(s, dead)! : dead.childIds.map((id) => s.people[id]).find(alive);
  if (!heir) return;
  heir.cash += 30000;
  s.log.push({ year: s.year, text: `📄 ${fullName(dead)}의 종신보험금 3억이 ${fullName(heir)}에게 지급됐다`, kind: 'money' });
}
