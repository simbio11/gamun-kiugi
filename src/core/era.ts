// 시대의 파도: 10년에 한 번쯤, 온 나라를 뒤흔드는 사건이 온다.
// 시장이 요동치고, 가주는 가문의 방향을 정해야 한다. 위기에 줍는 사람, 버티는 사람, 무너지는 사람.
// 폭락 뒤에는 대개 회복이 온다 (몇 년 뒤 반등을 예약한다) — 역사적으로도 그랬다.

import { addAsset, addHolding, formatMoney } from './economy';
import { chance, int, next } from './rng';
import { gate, schedule, type Choice, type Ctx, type EventDef } from './ev-util';
import { unlock } from './achievements';
import { addFlag, age, alive, check, clamp, fullName, head, householder, isMainline } from './people';
import { buyPower } from './leverage';
import type { GameState, MarketKey } from './types';

type Delta = Partial<Record<MarketKey, number>>;

/** 시장 충격을 바로 반영: 지수와 보유 자산 가치가 함께 움직인다 */
export function shock(s: GameState, d: Delta) {
  for (const k of Object.keys(d) as MarketKey[]) {
    const r = d[k]!;
    s.market[k] = Math.max(1, Math.round(s.market[k] * (1 + r)));
    s.marketChange[k] = (s.marketChange[k] ?? 0) + r;
    for (const a of s.assets) if (a.kind === k) a.value = Math.max(0, Math.round(a.value * (1 + r * (a.beta ?? 1))));
  }
}

const deltaText = (d: Delta) => {
  const N: Record<MarketKey, string> = { apt_seoul: '서울 집값', apt_local: '지방 집값', land: '땅값', building: '빌딩', stock: '주식', coin: '코인', art: '미술품' };
  return (Object.keys(d) as MarketKey[]).map((k) => `${N[k]} ${d[k]! > 0 ? '+' : ''}${Math.round(d[k]! * 100)}%`).join(' · ');
};

const allMain = (s: GameState) => Object.values(s.people).filter((p) => alive(p) && isMainline(s, p));
const choices = (c: Ctx, list: (Choice | false)[]) => gate(c.s, list.filter((x): x is Choice => !!x));

/** 가진 돈의 일부로 폭락한 주식을 줍는다 */
function dip(c: Ctx, share: number, kind: 'stock' | 'coin' = 'stock'): Choice {
  const amt = Math.round(Math.min(buyPower(c.s) * share, 50000));
  return {
    label: `폭락장에서 ${kind === 'stock' ? '주식' : '코인'}을 줍는다 (${formatMoney(amt)})`,
    disabled: amt < 300,
    req: amt < 300 ? ['여윳돈이 없다'] : undefined,
    run: (x) => {
      householder(x.s).cash -= amt;
      addHolding(x.s, kind, householder(x.s).id, amt);
      addFlag(x.p, 'dip_buyer');
      return `모두가 던질 때 ${formatMoney(amt)}어치를 샀다. 손이 떨렸다. 몇 년 뒤 웃을 수 있을까?`;
    },
  };
}

interface Era {
  id: string;
  title: string;
  /** 사건이 일어날 수 있는 해 */
  from?: number;
  news: string;
  delta: Delta;
  /** 몇 년 뒤 되돌아오는 반등 */
  rebound?: Delta;
  body: (c: Ctx) => string;
  choices: (c: Ctx) => Choice[];
  /** 온 가족에게 미치는 영향 (선택 전에 이미 벌어진 일) */
  hit?: (s: GameState) => string;
}

const ERAS: Era[] = [
  {
    id: 'pandemic',
    title: '신종 팬데믹',
    news: '🦠 WHO, 신종 호흡기 바이러스 팬데믹 선언. 거리두기 4단계',
    delta: { stock: -0.3, coin: -0.25, building: -0.08, art: -0.1 },
    rebound: { stock: 0.45, coin: 0.6, building: 0.05 },
    hit: (s) => {
      let n = 0;
      for (const p of allMain(s)) {
        p.happiness = clamp(p.happiness - 6, 0, 100);
        if (age(s, p) >= 70) (p.actual.hp = clamp(p.actual.hp - 8, 0, 100)), n++;
      }
      return n ? `어르신 ${n}명이 한동안 앓았다. 온 가족이 집에 갇혔다.` : '학교도 회사도 원격이 됐다. 온 가족이 집에 갇혔다.';
    },
    body: () => '마스크 대란, 텅 빈 거리, 문 닫는 가게들. 주가는 한 달 만에 30% 빠졌다.\n가주로서 어떻게 할까?',
    choices: (c) =>
      choices(c, [
        dip(c, 0.3),
        { label: '현금을 쥐고 버틴다', run: (x) => ((x.p.actual.mor = clamp(x.p.actual.mor + 1, 0, 100)), '비상금을 챙기고 허리띠를 졸랐다. 폭풍이 지나가길 기다린다.') },
        { label: '마스크·방역 사업에 뛰어든다', cost: 2000, run: (x) => (check(x.s, x.p.actual.int, 50, 12) ? ((householder(x.s).cash += 9000), (x.s.fame += 1), '공장 라인을 잡았다! 1년 만에 9천만 원을 벌었다.') : ((householder(x.s).cash += 600), '뒤늦게 뛰어들었다. 재고만 쌓였다.')) },
        { label: '이웃에게 식료품을 나눈다', cost: 300, run: (x) => ((x.s.fame += 3), (x.p.actual.mor = clamp(x.p.actual.mor + 3, 0, 100)), '홀몸 어르신 댁에 매주 장을 봐 드렸다. 동네가 기억한다.') },
      ]),
  },
  {
    id: 'crash',
    title: '글로벌 금융위기',
    news: '📉 월가 대형 투자은행 파산. 전 세계 증시 동반 폭락',
    delta: { stock: -0.38, coin: -0.5, apt_seoul: -0.12, apt_local: -0.1, building: -0.15, art: -0.2 },
    rebound: { stock: 0.5, coin: 0.7, apt_seoul: 0.14, apt_local: 0.06, building: 0.12, art: 0.15 },
    hit: (s) => {
      const out = allMain(s).filter((p) => age(s, p) >= 25 && age(s, p) <= 60 && ['corp', 'office', 'banker', 'analyst', 'trader', 'insurance'].includes(p.job) && chance(s, 0.2));
      for (const p of out) addFlag(p, 'laid_off_warn');
      return out.length ? `${out.map(fullName).join(', ')}의 회사에 구조조정 칼바람이 분다.` : '뉴스마다 "제2의 IMF"라는 말이 나온다.';
    },
    body: () => '환율은 치솟고 코스피는 반토막. 급매물이 쏟아진다.\n"위기는 곧 기회"라는 말과 "현금이 왕"이라는 말이 동시에 들린다.',
    choices: (c) => {
      const apt = Math.round(c.s.market.apt_seoul * 0.75);
      return choices(c, [
        dip(c, 0.35),
        { label: `급매 아파트를 잡는다 (${formatMoney(apt)}, 시세의 75%)`, disabled: buyPower(c.s) < apt, req: buyPower(c.s) < apt ? ['돈이 모자란다'] : undefined, run: (x) => {
          householder(x.s).cash -= apt;
          addAsset(x.s, 'apt_seoul', householder(x.s).id, Math.round(x.s.market.apt_seoul), '급매로 산 서울 아파트');
          addFlag(x.p, 'dip_buyer');
          return '집주인이 울면서 도장을 찍었다. 마음이 무겁지만, 계약서는 우리 손에 있다.';
        } },
        { label: '빚부터 줄이고 현금을 확보한다', run: (x) => ((x.p.actual.int = clamp(x.p.actual.int + 1, 0, 100)), '지출을 줄이고 현금을 쌓았다. 잠은 잘 잔다.') },
        { label: '겁에 질려 다 판다', run: (x) => {
          let got = 0;
          for (const a of x.s.assets.filter((a) => (a.kind === 'stock' || a.kind === 'coin') && allMain(x.s).some((p) => p.id === a.ownerId))) {
            got += a.value;
            x.s.people[a.ownerId].cash += a.value;
            a.value = 0;
          }
          x.s.assets = x.s.assets.filter((a) => a.value > 0 || (a.kind !== 'stock' && a.kind !== 'coin'));
          return got ? `바닥에서 ${formatMoney(got)}어치를 전부 던졌다. 속은 후련한데… 너무 싸게 판 건 아닐까.` : '팔 것도 없었다. 오히려 다행이다.';
        } },
      ]);
    },
  },
  {
    id: 'ai_shift',
    title: 'AI 대전환',
    from: 2028,
    news: '🤖 범용 AI 상용화. "화이트칼라 일자리 30% 대체" 보고서 충격',
    delta: { stock: 0.28, coin: 0.2, building: -0.06 },
    hit: (s) => {
      const hit = allMain(s).filter((p) => age(s, p) >= 25 && age(s, p) <= 60 && ['office', 'corp', 'public_corp', 'banker', 'analyst', 'hr', 'secretary', 'marketer', 'insurance', 'trader', 'civil', 'tax_officer'].includes(p.job));
      for (const p of hit) p.happiness = clamp(p.happiness - 5, 0, 100);
      return hit.length ? `사무직인 ${hit.map(fullName).join(', ')}이(가) 불안에 잠을 설친다.` : '직장마다 "AI가 내 일을 가져간다"는 말이 돈다.';
    },
    body: () => '회의록도, 보고서도, 코딩도 AI가 한다. 기술주는 날아오르고 사무실은 비어 간다.\n가문은 이 파도를 어떻게 탈까?',
    choices: (c) =>
      choices(c, [
        { label: '온 가족 AI 재교육 (800만)', cost: 800, run: (x) => {
          for (const p of allMain(x.s)) if (age(x.s, p) >= 12 && age(x.s, p) <= 60) (p.actual.int = clamp(p.actual.int + 2, 0, 100)), addFlag(p, 'ai_ready');
          return '주말마다 온 가족이 노트북 앞에 앉았다. 할머니도 AI 비서를 쓴다.';
        } },
        dip(c, 0.25),
        { label: '손으로 하는 기술을 가르친다', run: (x) => {
          for (const p of allMain(x.s)) if (age(x.s, p) >= 10 && age(x.s, p) <= 25) (p.actual.str = clamp(p.actual.str + 2, 0, 100)), addFlag(p, 'ai_ready');
          return '"AI는 배관을 못 고친다." 아이들에게 목공·요리·정비를 가르쳤다.';
        } },
        { label: 'AI 스타트업에 엔젤 투자 (3,000만)', cost: 3000, run: (x) => (chance(x.s, 0.3) ? ((householder(x.s).cash += 30000), (x.s.fame += 2), '투자한 회사가 인수됐다! 10배 수익!') : '회사는 조용히 사라졌다. 수업료라 생각한다.') },
      ]),
  },
  {
    id: 'boom',
    title: '부동산 광풍',
    news: '🔥 "벼락거지" 신조어 등장. 서울 아파트 1년 새 25% 폭등',
    delta: { apt_seoul: 0.25, apt_local: 0.12, land: 0.1, building: 0.1 },
    body: (c) => {
      const has = c.s.assets.some((a) => (a.kind === 'apt_seoul' || a.kind === 'apt_local') && allMain(c.s).some((p) => p.id === a.ownerId));
      return has ? '가진 집값이 한 해 만에 수억 올랐다. 주변에선 "지금이라도 한 채 더"라고 한다.' : '집 없는 사람들이 "벼락거지"가 됐다. 전세가 사라지고, 사람들이 영끌로 몰려간다.';
    },
    choices: (c) => {
      const apt = Math.round(c.s.market.apt_local);
      return choices(c, [
        { label: `지방 아파트 한 채 더 (${formatMoney(apt)})`, disabled: buyPower(c.s) < apt, req: buyPower(c.s) < apt ? ['돈이 모자란다'] : undefined, run: (x) => {
          householder(x.s).cash -= apt;
          addAsset(x.s, 'apt_local', householder(x.s).id, apt);
          if (chance(x.s, 0.5)) schedule(x.s, int(x.s, 2, 4), 'era_bust', x.p.id);
          return '막차일까, 첫차일까. 등기를 쳤다.';
        } },
        { label: '청약에 온 가족이 매달린다', run: (x) => (chance(x.s, 0.12) ? ((householder(x.s).cash += 25000), addFlag(x.p, 'sub_win_era'), '로또 청약 당첨! 시세 차익만 2억 5천만 원!') : '경쟁률 500:1. 떨어졌다. 그래도 다음에 또 넣는다.') },
        { label: '거품이라 보고 관망한다', run: (x) => {
          if (chance(x.s, 0.5)) schedule(x.s, int(x.s, 2, 4), 'era_bust', x.p.id);
          x.p.actual.mor = clamp(x.p.actual.mor + 1, 0, 100);
          return '주변의 비웃음을 견딘다. "두고 봐라."';
        } },
      ]);
    },
  },
  {
    id: 'reunify',
    title: '남북 경협 급물살',
    from: 2030,
    news: '🕊 남북 정상, 경제협력 특구 합의. 접경지 땅값 들썩',
    delta: { land: 0.35, apt_local: 0.05, stock: 0.08 },
    body: () => '파주·철원 부동산 중개소마다 줄이 늘어섰다. 개성 공단 재가동, 철도 연결 소식이 연일 뉴스를 탄다.',
    choices: (c) => {
      const land = Math.round(c.s.market.land * 1.2);
      return choices(c, [
        { label: `접경지 땅을 산다 (${formatMoney(land)})`, disabled: buyPower(c.s) < land, req: buyPower(c.s) < land ? ['돈이 모자란다'] : undefined, run: (x) => {
          householder(x.s).cash -= land;
          const a = addAsset(x.s, 'land', householder(x.s).id, land, '접경지역 토지');
          a.vol = 0.2;
          return chance(x.s, 0.5) ? (shock(x.s, { land: 0.05 }), '"통일 대박"을 믿어 본다. 산 직후에 또 올랐다.') : '계약서를 받아 드는데 북한이 미사일을 쐈다는 속보가… 괜찮겠지?';
        } },
        { label: '고향이 북쪽인 어르신 소원을 들어드린다', cost: 500, run: (x) => {
          for (const p of allMain(x.s)) if (age(x.s, p) >= 70) p.happiness = clamp(p.happiness + 15, 0, 100);
          x.s.fame += 1;
          return '이산가족 상봉 신청서를 냈다. 할아버지(할머니)가 70년 만에 고향 소식을 들었다.';
        } },
        { label: '대북 사업 주식을 산다', cost: 1000, run: (x) => (addHolding(x.s, 'stock', householder(x.s).id, chance(x.s, 0.5) ? 2400 : 300), '경협주는 뉴스 하나에 오르고 내린다. 롤러코스터가 시작됐다.') },
        { label: '지켜본다', run: () => '"지난번에도 이러다 말았지." 신중하게 지켜본다.' },
      ]);
    },
  },
  {
    id: 'inflation',
    title: '물가 폭등',
    news: '💸 소비자물가 9% 급등. 한국은행, 기준금리 연속 빅스텝',
    delta: { stock: -0.15, apt_seoul: -0.08, apt_local: -0.06, building: -0.08 },
    rebound: { stock: 0.2, apt_seoul: 0.06 },
    hit: (s) => {
      let lost = 0;
      for (const p of allMain(s)) if (p.cash > 0) (lost += Math.round(p.cash * 0.06)), (p.cash -= Math.round(p.cash * 0.06));
      return lost ? `통장 속 현금의 가치가 줄었다. 체감 손실 ${formatMoney(lost)}.` : '장바구니 물가가 무섭다.';
    },
    body: () => '짜장면 한 그릇 1만 5천 원. 대출 금리는 7%를 넘었다. 영끌족 비명이 들린다.',
    choices: (c) =>
      choices(c, [
        { label: '금·실물 자산으로 옮긴다 (2,000만)', cost: 2000, run: (x) => (addAsset(x.s, 'art', householder(x.s).id, 2300, '골드바 1kg'), '금값이 치솟는다. 금고 속 골드바가 든든하다.') },
        { label: '고금리 예금에 넣는다', run: (x) => ((householder(x.s).cash += Math.round(Math.min(buyPower(x.s), 20000) * 0.06)), '연 6% 예금. 이자가 쏠쏠하다.') },
        { label: '온 가족 짠테크', run: (x) => {
          for (const p of allMain(x.s)) p.happiness = clamp(p.happiness - 3, 0, 100);
          householder(x.s).cash += 800;
          x.p.actual.mor = clamp(x.p.actual.mor + 2, 0, 100);
          return '외식을 끊고 도시락을 싼다. 아이들 불만이 쌓이지만 800만 원을 아꼈다.';
        } },
      ]),
  },
  {
    id: 'heatwave',
    title: '기록적 폭우·폭염',
    news: '🌊 100년 만의 폭우. 수도권 반지하 침수, 이어진 45도 폭염',
    delta: { apt_local: -0.03, land: -0.04 },
    hit: (s) => {
      let n = 0;
      for (const p of allMain(s)) if (age(s, p) >= 75 || age(s, p) <= 5) (p.actual.hp = clamp(p.actual.hp - 5, 0, 100)), n++;
      return n ? `노약자 ${n}명이 더위에 지쳤다.` : '에어컨 없이는 못 사는 여름이 됐다.';
    },
    body: () => '강남 도로가 강이 됐고, 반지하 가구가 물에 잠겼다. 기후 재난이 일상이 되어 간다.',
    choices: (c) =>
      choices(c, [
        { label: '수재민 성금을 낸다 (1,000만)', cost: 1000, run: (x) => ((x.s.fame += 3), (x.p.actual.mor = clamp(x.p.actual.mor + 2, 0, 100)), '뉴스 자막에 가문 이름이 올랐다.') },
        { label: '온 가족이 봉사 활동을 간다', run: (x) => {
          for (const p of allMain(x.s)) if (age(x.s, p) >= 12 && age(x.s, p) <= 60) (p.actual.mor = clamp(p.actual.mor + 2, 0, 100)), (p.actual.str = clamp(p.actual.str + 1, 0, 100));
          x.s.fame += 1;
          return '진흙을 퍼내고 가구를 날랐다. 아이들이 부쩍 자랐다.';
        } },
        { label: '기후테크 주식을 산다 (1,500만)', cost: 1500, run: (x) => (addHolding(x.s, 'stock', householder(x.s).id, chance(x.s, 0.55) ? 2600 : 900), '태양광·배터리·물관리 기업에 투자했다.') },
        { label: '집을 고지대로 옮길 계획을 세운다', run: (x) => ((x.p.actual.int = clamp(x.p.actual.int + 1, 0, 100)), '침수 지도를 펼쳐 놓고 다음 이사를 고민한다.') },
      ]),
  },
  {
    id: 'crypto_mania',
    title: '코인 대광풍',
    news: '🚀 비트코인 사상 최고가. "김치 프리미엄" 20% 돌파',
    delta: { coin: 1.5, stock: 0.05 },
    body: () => '택시 기사도, 중학생도 코인 이야기뿐. 누구는 10억을 벌었다더라.',
    choices: (c) =>
      choices(c, [
        { label: '영끌해서 올라탄다', cost: Math.round(Math.min(buyPower(c.s) * 0.4, 30000)), run: (x) => {
          const amt = Math.round(Math.min(buyPower(x.s) * 0.4 / 0.6, 30000));
          addHolding(x.s, 'coin', householder(x.s).id, amt);
          return '매수 버튼을 눌렀다. 밤마다 차트를 본다. 심장이 쿵쾅거린다.';
        } },
        { label: '갖고 있던 코인을 판다', run: (x) => {
          let got = 0;
          for (const a of x.s.assets.filter((a) => a.kind === 'coin' && allMain(x.s).some((p) => p.id === a.ownerId))) (got += a.value), (x.s.people[a.ownerId].cash += a.value), (a.value = 0);
          x.s.assets = x.s.assets.filter((a) => a.kind !== 'coin' || a.value > 0);
          return got ? `꼭지 근처에서 ${formatMoney(got)}을 챙겼다. 뒤도 안 돌아본다.` : '팔 코인이 없다. 구경만 한다.';
        } },
        { label: '"튤립 버블이다"', run: (x) => ((x.p.actual.int = clamp(x.p.actual.int + 1, 0, 100)), '역사책을 펼쳤다. 1637년 네덜란드 튤립 파동.') },
      ]),
  },
  {
    id: 'babyboom',
    title: '파격 출산 지원',
    from: 2027,
    news: '👶 정부, 출생아 1인당 1억 원 지원 발표. "인구 비상사태"',
    delta: { apt_local: 0.04 },
    hit: (s) => {
      let got = 0;
      for (const p of allMain(s)) if (age(s, p) <= 2 && !p.inLaw) got += 3000;
      if (got) householder(s).cash += got;
      return got ? `올해 태어난 아이 몫으로 ${formatMoney(got)}이 먼저 나왔다.` : '신혼부부들 사이에 "한 명 더?" 이야기가 돈다.';
    },
    body: () => '출산 장려금, 주택 특별공급, 육아휴직 급여 100%. 나라가 아이를 키워주겠다고 한다.',
    choices: (c) =>
      choices(c, [
        { label: '가족회의를 연다: "한 명 더?"', run: (x) => {
          for (const p of allMain(x.s)) if (age(x.s, p) >= 25 && age(x.s, p) <= 40 && p.spouseId) addFlag(p, 'baby_plan');
          return '젊은 부부들 얼굴이 빨개졌다. 설레는 계획이 생겼다.';
        } },
        { label: '육아 스타트업에 투자한다 (1,000만)', cost: 1000, run: (x) => (addHolding(x.s, 'stock', householder(x.s).id, chance(x.s, 0.5) ? 2200 : 500), '분유·유아용품·돌봄 플랫폼. 오를까?') },
        { label: '지역 어린이집에 기부한다', cost: 500, run: (x) => ((x.s.fame += 2), '동네 어린이집에 가문 이름을 딴 놀이터가 생겼다.') },
      ]),
  },
  {
    id: 'mega_event',
    title: '월드컵 유치',
    from: 2027,
    news: '⚽ 대한민국, 월드컵 단독 개최 확정! 관광·건설 특수',
    delta: { stock: 0.08, building: 0.06, land: 0.06 },
    body: () => '거리마다 붉은 물결. 경기장 주변 상권이 들썩이고, 온 나라가 축제다.',
    choices: (c) =>
      choices(c, [
        { label: '온 가족 결승전 직관 (1,200만)', cost: 1200, run: (x) => {
          for (const p of allMain(x.s)) p.happiness = clamp(p.happiness + 12, 0, 100);
          return chance(x.s, 0.3) ? '4강 신화 재현! 3대가 부둥켜안고 울었다. 평생의 추억.' : '8강에서 졌지만 목이 쉬도록 응원했다. 평생의 추억.';
        } },
        { label: '경기장 근처에서 장사를 한다', cost: 800, run: (x) => (check(x.s, x.p.actual.cha, 45, 12) ? ((householder(x.s).cash += 3500), '치킨·맥주 노점이 대박! 한 달에 3,500만 원.') : ((householder(x.s).cash += 400), '경쟁이 치열했다. 본전치기.')) },
        { label: '자원봉사를 신청한다', run: (x) => {
          for (const p of allMain(x.s)) if (age(x.s, p) >= 16 && age(x.s, p) <= 30) (p.actual.cha = clamp(p.actual.cha + 2, 0, 100)), (p.happiness = clamp(p.happiness + 6, 0, 100));
          return '젊은 가족들이 통역·안내 봉사를 했다. 외국 친구가 생겼다.';
        } },
      ]),
  },
  {
    id: 'pension_reform',
    title: '연금 개혁',
    from: 2027,
    news: '🧓 국민연금 개혁안 통과: 더 내고, 늦게 받는다',
    delta: { stock: 0.03 },
    hit: (s) => {
      const young = allMain(s).filter((p) => age(s, p) >= 20 && age(s, p) <= 45);
      for (const p of young) p.happiness = clamp(p.happiness - 3, 0, 100);
      return young.length ? '젊은 가족들이 "우린 못 받는 거 아니냐"며 한숨이다.' : '어르신들은 안도하고, 청년들은 분노한다.';
    },
    body: () => '보험료율 인상, 수급 개시 연령 상향. 세대 갈등이 뉴스를 도배한다. 가족 식탁에서도 논쟁이 붙었다.',
    choices: (c) =>
      choices(c, [
        { label: '개인연금을 온 가족이 든다', run: (x) => {
          for (const p of allMain(x.s)) if (age(x.s, p) >= 20 && age(x.s, p) <= 50) addFlag(p, 'private_pension');
          householder(x.s).cash -= 300;
          return '연금저축·IRP를 하나씩 들었다. 노후 준비 시작.';
        } },
        { label: '세대 간 대화를 한다', run: (x) => {
          for (const p of allMain(x.s)) p.affinity = clamp(p.affinity + 3, -100, 100);
          return '할아버지와 손주가 밤새 토론했다. 결론은 없었지만 서로를 조금 더 이해했다.';
        } },
        { label: '배당주로 노후를 준비한다 (2,000만)', cost: 2000, run: (x) => (addHolding(x.s, 'stock', householder(x.s).id, 2000), '배당 귀족주를 모았다. 매년 조금씩 나온다.') },
      ]),
  },
  {
    id: 'space',
    title: '우주 산업 붐',
    from: 2032,
    news: '🚀 한국형 달 착륙선 성공! 우주·방산주 폭등',
    delta: { stock: 0.2, land: 0.03 },
    body: () => '고흥 발사장에 인파가 몰렸다. 아이들 장래희망 1위가 "우주비행사"가 됐다.',
    choices: (c) =>
      choices(c, [
        dip(c, 0.2),
        { label: '아이들을 우주 캠프에 보낸다 (300만)', cost: 300, run: (x) => {
          for (const p of allMain(x.s)) if (age(x.s, p) >= 8 && age(x.s, p) <= 17) (p.actual.int = clamp(p.actual.int + 2, 0, 100)), addFlag(p, 'space_dream');
          return '아이들이 로켓을 쏘아 올리고 왔다. 눈이 반짝인다.';
        } },
        { label: '구경만 한다', run: () => '밤하늘을 올려다봤다. 저 위에 우리 나라 탐사선이 있다.' },
      ]),
  },
];

const eraDef = (e: Era): EventDef => ({
  id: 'era_' + e.id,
  title: () => `🌊 시대의 파도: ${e.title}`,
  portraits: (c) => [c.p],
  text: (c) => {
    c.ev.data ??= {};
    return `${e.news}\n(${deltaText(e.delta)})\n\n${c.ev.data.hit ? c.ev.data.hit + '\n\n' : ''}${e.body(c)}`;
  },
  choices: (c) => e.choices(c),
});

const rebound: EventDef = {
  id: 'era_rebound',
  title: () => '📈 폭풍이 지나갔다',
  text: (c) => `${c.ev.data?.title ?? '위기'} 이후 몇 해. 시장이 회복했다.\n(${deltaText(c.ev.data?.delta ?? {})})\n\n${c.p.flags.includes('dip_buyer') ? '그때 바닥에서 주운 자산이 크게 올랐다. 가족들이 가주를 다시 본다.' : '그때 버틴 사람들이 웃고 있다.'}`,
  choices: () => [
    { label: '다행이다', run: (x) => {
      if (x.ev.data?.delta) shock(x.s, x.ev.data.delta);
      if (x.p.flags.includes('dip_buyer')) {
        unlock(x.s, 'dip_buyer');
        x.p.flags = x.p.flags.filter((f) => f !== 'dip_buyer');
        x.p.happiness = clamp(x.p.happiness + 10, 0, 100);
        return '"공포에 사라"는 말을 몸으로 배웠다.';
      }
      return '다음 위기엔 준비돼 있을 것이다.';
    } },
  ],
};

const bust: EventDef = {
  id: 'era_bust',
  title: () => '📉 광풍이 꺼지다',
  text: () => '금리가 오르고 거래가 끊겼다. 부동산 광풍이 끝났다. 영끌족 매물이 쏟아진다.\n(서울 집값 −15% · 지방 집값 −12% · 땅값 −8%)',
  choices: () => [
    { label: '버틴다', run: (x) => (shock(x.s, { apt_seoul: -0.15, apt_local: -0.12, land: -0.08 }), '집값은 오르내린다. 살 집이라면 버티면 된다.') },
    { label: '이번엔 급매를 노린다', run: (x) => (shock(x.s, { apt_seoul: -0.15, apt_local: -0.12, land: -0.08 }), (x.p.actual.int = clamp(x.p.actual.int + 1, 0, 100)), '부동산 앱 알림을 켜 두었다. 올해 매물 목록을 다시 보자.') },
  ],
};

export const ERA_EVENTS: EventDef[] = [...ERAS.map(eraDef), rebound, bust];

/** 해마다: 마지막 파도 뒤 7년이 지나면 조금씩 확률이 오른다 */
export function eraYear(s: GameState): string[] {
  const h = head(s);
  if (age(s, h) < 22) return [];
  const seen = (s.storySeen ??= {});
  const last = seen['era:last'] ?? s.startYear - 3;
  const gap = s.year - last;
  if (gap < 7 || !chance(s, Math.min(0.35, (gap - 6) * 0.06))) return [];
  const pool = ERAS.filter((e) => (e.from ?? 0) <= s.year && s.year - (seen['era:' + e.id] ?? -999) >= 30);
  if (!pool.length) return [];
  const e = pool[Math.floor(next(s) * pool.length)];
  seen['era:last'] = s.year;
  seen['era:' + e.id] = s.year;
  shock(s, e.delta);
  const hit = e.hit?.(s);
  s.events.push({ uid: s.eventSeq++, defId: 'era_' + e.id, personId: h.id, data: { hit } });
  if (e.rebound) schedule(s, int(s, 2, 4), 'era_rebound', h.id, { title: e.title, delta: e.rebound });
  return [e.news];
}

