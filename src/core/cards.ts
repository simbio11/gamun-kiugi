// 명예의 전당 카드: 가문 사람이 각 분야의 정점에 서면 카드가 생긴다.
// 카드마다 그 사람이 살아 있는 동안 가문 전체에 효과를 준다. 도감을 채우면 세트 보상.

import { chance, pick } from './rng';
import { gate, type Choice, type Ctx, type EventDef } from './ev-util';
import { age, alive, check, clamp, fullName, hasFlag, isMainline } from './people';
import { wageIndex } from './pay';
import { grant, type Rarity } from './rewards';
import type { GameState, Person, StatKey } from './types';

export interface CardEff {
  /** 해마다 가문 명성 */
  fame?: number;
  /** 해마다 카드 주인 수입 (만원, 물가 반영) */
  cash?: number;
  /** 해마다 집안 아이들(20세 미만) 능력치 +1 */
  kid?: StatKey;
  /** 해마다 온 가족 건강·행복 */
  hp?: number;
  hap?: number;
  /** 해마다 아이들 성적 */
  study?: number;
  /** 해마다 세무 주목도 감소 */
  heat?: number;
}
export interface CardDef {
  id: string;
  name: string;
  icon: string;
  rarity: Rarity;
  /** 어떻게 얻나 (도감 힌트) */
  how: string;
  /** 효과 설명 */
  eff: CardEff;
  /** 조건을 채우면 저절로 (없으면 정점 이벤트로) */
  auto?: (s: GameState, p: Person) => boolean;
}

const lv = (p: Person, job: string, n: number) => p.job === job && p.jobLevel >= n;
export const CARDS: CardDef[] = [
  // 권력
  { id: 'president', name: '대통령', icon: '🇰🇷', rarity: 'legend', how: '대선 승리', eff: { fame: 4, hap: 2 }, auto: (_s, p) => hasFlag(p, 'president') },
  { id: 'minister', name: '장관', icon: '🏛', rarity: 'epic', how: '인사청문회 통과', eff: { fame: 2 }, auto: (_s, p) => hasFlag(p, 'was_minister') },
  { id: 'lawmaker', name: '국회의원', icon: '🗳', rarity: 'epic', how: '총선 당선', eff: { fame: 1, heat: 2 }, auto: (_s, p) => hasFlag(p, 'was_politician') },
  { id: 'chief_justice', name: '대법원장', icon: '⚖️', rarity: 'legend', how: '판사로 정점에', eff: { fame: 3, heat: 6 }, auto: (_s, p) => lv(p, 'judge', 5) },
  { id: 'prosecutor_general', name: '검찰총장', icon: '🗂', rarity: 'legend', how: '검사로 정점에', eff: { fame: 3, heat: 6 }, auto: (_s, p) => lv(p, 'prosecutor', 5) },
  { id: 'general', name: '별을 단 장군', icon: '⭐', rarity: 'epic', how: '장교로 장성 진급', eff: { fame: 2, kid: 'str' }, auto: (_s, p) => lv(p, 'officer', 6) },
  { id: 'ambassador', name: '특명전권대사', icon: '🌐', rarity: 'epic', how: '외교관으로 대사 부임', eff: { fame: 2, kid: 'cha' }, auto: (_s, p) => lv(p, 'diplomat', 5) },
  // 돈
  { id: 'chaebol', name: '그룹 총수', icon: '🏢', rarity: 'legend', how: '창업해 대기업 총수로', eff: { cash: 30000, fame: 2 }, auto: (_s, p) => lv(p, 'founder', 5) },
  { id: 'ceo', name: '대기업 사장', icon: '💼', rarity: 'epic', how: '월급쟁이로 사장까지', eff: { cash: 6000 }, auto: (_s, p) => lv(p, 'corp', 7) },
  // 학문·의료
  { id: 'nobel', name: '노벨상 수상자', icon: '🏅', rarity: 'legend', how: '노벨상', eff: { fame: 4, kid: 'int' }, auto: (_s, p) => hasFlag(p, 'nobel') },
  { id: 'scholar', name: '석학 (석좌교수·총장)', icon: '🎓', rarity: 'epic', how: '교수로 석좌·총장까지', eff: { study: 2, fame: 1 }, auto: (_s, p) => lv(p, 'professor', 3) },
  { id: 'famed_doctor', name: '명의', icon: '🩺', rarity: 'epic', how: '의사로 이름을 떨친다 (정점 이벤트)', eff: { hp: 2 } },
  // 연예·문화
  { id: 'national_mc', name: '국민 MC', icon: '🎤', rarity: 'legend', how: '방송인으로 연예대상 대상 (정점 이벤트)', eff: { fame: 3, kid: 'cha', hap: 1 } },
  { id: 'world_star', name: '월드 스타', icon: '🌟', rarity: 'legend', how: '연예인으로 정점에', eff: { fame: 5, cash: 20000 }, auto: (_s, p) => lv(p, 'entertainer', 5) },
  { id: 'best_actor', name: '청룡영화상 주연상', icon: '🎬', rarity: 'epic', how: '배우로 영화제 주연상 (정점 이벤트)', eff: { cash: 5000, fame: 2 } },
  { id: 'national_singer', name: '국민 가수', icon: '🎶', rarity: 'epic', how: '가수로 가요대상 대상 (정점 이벤트)', eff: { hap: 3, cash: 3000 } },
  { id: 'billboard', name: '빌보드 1위', icon: '📀', rarity: 'legend', how: '음악가로 정점에', eff: { hap: 3, cash: 10000, fame: 3 }, auto: (_s, p) => lv(p, 'musician', 5) },
  { id: 'anchor', name: '9시 뉴스 앵커', icon: '📺', rarity: 'epic', how: '아나운서·기자로 메인 앵커 (정점 이벤트)', eff: { fame: 2, kid: 'cha' } },
  { id: 'bestseller', name: '밀리언셀러 작가', icon: '📚', rarity: 'epic', how: '작가로 100만 부 (정점 이벤트)', eff: { kid: 'int', cash: 3000 } },
  { id: 'webtoon_ip', name: '글로벌 IP 작가', icon: '✏️', rarity: 'epic', how: '웹툰·웹소설 작가로 정점에', eff: { cash: 8000, fame: 1 }, auto: (_s, p) => lv(p, 'writer', 5) },
  { id: 'gold_button', name: '골드버튼 크리에이터', icon: '▶️', rarity: 'rare', how: '유튜버로 구독자 100만', eff: { fame: 1, cash: 2000 }, auto: (_s, p) => lv(p, 'youtuber', 4) },
  { id: 'star_tutor', name: '1타 강사', icon: '👨‍🏫', rarity: 'epic', how: '학원 강사로 정점에', eff: { study: 3 }, auto: (_s, p) => lv(p, 'tutor', 4) },
  // 스포츠
  { id: 'olympic', name: '올림픽 금메달리스트', icon: '🥇', rarity: 'legend', how: '올림픽 금메달', eff: { kid: 'str', fame: 2 }, auto: (_s, p) => hasFlag(p, 'olympic_gold') },
  { id: 'national_coach', name: '국가대표 감독', icon: '📋', rarity: 'epic', how: '지도자로 국가대표 감독 (정점 이벤트)', eff: { kid: 'str', fame: 2 } },
  { id: 'gamer_champ', name: 'e스포츠 월드 챔피언', icon: '🎮', rarity: 'epic', how: '프로게이머로 정점에', eff: { kid: 'int', fame: 1 }, auto: (_s, p) => lv(p, 'gamer', 5) },
  // 장인
  { id: 'michelin', name: '미쉐린 스타 셰프', icon: '👨‍🍳', rarity: 'epic', how: '셰프로 미쉐린 별', eff: { hap: 2, hp: 1 }, auto: (_s, p) => lv(p, 'chef', 5) },
  { id: 'star_chef', name: '스타 셰프', icon: '🍳', rarity: 'rare', how: '요리 경연 우승 (정점 이벤트)', eff: { hap: 2, cash: 1500 } },
  { id: 'architect', name: '프리츠커상 건축가', icon: '🏗', rarity: 'legend', how: '건축가로 세계적 상 (정점 이벤트)', eff: { fame: 3 } },
  { id: 'master_craft', name: '대한민국 명장', icon: '🛠', rarity: 'epic', how: '기술자로 명장 선정 (정점 이벤트)', eff: { kid: 'str', cash: 1500 } },
  { id: 'captain', name: '수석 기장', icon: '✈️', rarity: 'rare', how: '조종사로 정점에', eff: { hp: 1, cash: 1000 }, auto: (_s, p) => lv(p, 'pilot', 3) },
  { id: 'star_farmer', name: '신지식 농업인', icon: '🌾', rarity: 'rare', how: '농업인으로 정점 (정점 이벤트)', eff: { hp: 1, cash: 1500 } },
  { id: 'national_hero', name: '의인·명예 소방관', icon: '🚒', rarity: 'epic', how: '구조 현장에서 목숨을 구한다 (정점 이벤트)', eff: { fame: 3, hap: 1 } },
];
export const CARD = Object.fromEntries(CARDS.map((c) => [c.id, c])) as Record<string, CardDef>;

export function effText(e: CardEff): string {
  const S: Record<StatKey, string> = { str: '근력', int: '지능', cha: '매력', mor: '도덕성', hp: '건강' };
  return [
    e.fame && `해마다 명성 +${e.fame}`,
    e.cash && `해마다 ${e.cash >= 10000 ? e.cash / 10000 + '억' : e.cash + '만'} 원 수입`,
    e.kid && `아이들 ${S[e.kid]} +1/년`,
    e.study && `아이들 성적 +${e.study}/년`,
    e.hp && `온 가족 건강 +${e.hp}/년`,
    e.hap && `온 가족 행복 +${e.hap}/년`,
    e.heat && `세무조사 위험 −${e.heat}/년`,
  ]
    .filter(Boolean)
    .join(' · ');
}

export const hasCard = (s: GameState, p: Person, id: string) => (s.cards ?? []).some((c) => c.id === id && c.personId === p.id);

export function awardCard(s: GameState, p: Person, id: string, why?: string) {
  const d = CARD[id];
  if (!d || hasCard(s, p, id)) return;
  const first = !(s.cards ?? []).some((c) => c.id === id);
  (s.cards ??= []).push({ id, personId: p.id, year: s.year });
  grant(s, d.icon, `${first ? '🆕 ' : ''}카드 획득: ${d.name}`, `${fullName(p)}${why ? ' — ' + why : ''}\n효과 (살아 있는 동안): ${effText(d.eff)}`, d.rarity);
  const r = s.rewards?.[s.rewards.length - 1];
  if (r) (r.card = id), (r.personId = p.id);
  // 도감 세트 보상
  const kinds = new Set(s.cards.map((c) => c.id)).size;
  for (const [n, rar] of [[3, 'rare'], [6, 'epic'], [10, 'epic'], [16, 'legend'], [24, 'legend']] as [number, Rarity][]) {
    if (kinds >= n && (s.storySeen ??= {})['cardset:' + n] === undefined) {
      s.storySeen['cardset:' + n] = s.year;
      s.fame += n;
      grant(s, '🗃', `카드 도감 ${n}종 달성`, `명예의 전당 카드를 ${n}종 모았다! 명성 +${n}`, rar);
    }
  }
}

// ───────────────────────── 정점 이벤트 ─────────────────────────
// 조건에 맞는 사람에게 가끔 "정점의 순간"이 찾아온다. 잘 해내면 카드.

interface Summit {
  card: string;
  title: string;
  ok: (s: GameState, p: Person) => boolean;
  text: (c: Ctx) => string;
  a: [string, StatKey, number, string, string];
  b: [string, StatKey, number, string, string];
}
const SUMMITS: Summit[] = [
  { card: 'national_mc', title: '🎤 연말 연예대상', ok: (_s, p) => ['entertainer', 'announcer', 'youtuber', 'actor', 'voice_actor'].includes(p.job) && p.jobLevel >= 3 && p.actual.cha >= 65,
    text: (c) => `${fullName(c.p)}이(가) 올해 예능 3개를 동시에 진행했다. 연말 연예대상 대상 후보에 올랐다. 생방송 수상 소감이 남았다.`,
    a: ['재치 있는 소감으로 웃긴다', 'cha', 65, '🏆 대상! "국민 MC" 칭호가 붙었다. 다음 날 모든 포털 메인.', '최우수상에 그쳤다. 그래도 내년이 있다.'],
    b: ['동료와 제작진에게 공을 돌린다', 'mor', 55, '🏆 대상! 겸손한 소감이 두고두고 회자된다. 국민 MC 탄생.', '대상은 다른 사람에게. 박수는 가장 컸다.'] },
  { card: 'best_actor', title: '🎬 청룡영화상', ok: (_s, p) => ['actor', 'entertainer'].includes(p.job) && p.jobLevel >= 3,
    text: (c) => `${fullName(c.p)}의 주연작이 관객 600만을 넘겼다. 청룡영화상 주연상 후보다.`,
    a: ['예술영화로 승부했던 연기를 믿는다', 'cha', 68, '🏆 주연상! 트로피를 든 손이 떨렸다.', '수상은 불발. 그래도 인생작이 남았다.'],
    b: ['시상식 전 캠페인 인터뷰를 돈다', 'int', 55, '🏆 주연상! 평단과 대중 모두를 잡았다.', '과한 홍보가 역효과였다.'] },
  { card: 'national_singer', title: '🎶 가요대상', ok: (_s, p) => p.job === 'musician' && p.jobLevel >= 3,
    text: (c) => `${fullName(c.p)}의 노래가 12주 연속 음원 차트 1위를 했다. 연말 가요대상 대상 후보다.`,
    a: ['라이브 무대로 정면 승부', 'cha', 66, '🏆 대상! 떼창이 시상식장을 울렸다. 국민 가수 탄생.', '본상만 받았다. 그래도 노래는 남았다.'],
    b: ['가족에게 바치는 신곡을 부른다', 'mor', 55, '🏆 대상! 온 국민이 따라 부르는 노래가 됐다.', '감동은 컸지만 대상은 다른 팀에게.'] },
  { card: 'anchor', title: '📺 메인 앵커 발탁', ok: (_s, p) => ['announcer', 'journalist'].includes(p.job) && p.jobLevel >= 2,
    text: (c) => `방송국 보도국장이 ${fullName(c.p)}을(를) 불렀다. "9시 뉴스 메인 앵커 오디션을 보게."`,
    a: ['또렷한 전달력으로 승부', 'cha', 62, '📺 9시 뉴스 메인 앵커 확정! 매일 밤 온 국민이 본다.', '최종에서 밀렸다. 주말 뉴스를 맡게 됐다.'],
    b: ['단독 취재 기사로 실력을 보인다', 'int', 60, '📺 특종 앵커로 발탁! "믿고 보는 뉴스"가 됐다.', '특종이 오보로 판명 났다. 아찔했다.'] },
  { card: 'famed_doctor', title: '🩺 명의의 순간', ok: (_s, p) => p.job === 'doctor' && p.jobLevel >= 2,
    text: (c) => `다른 병원들이 포기한 환자가 ${fullName(c.p)}에게 왔다. 12시간짜리 고난도 수술이다.`,
    a: ['직접 집도한다', 'int', 68, '🩺 수술 성공! 환자가 걸어서 퇴원했다. "TV 명의" 출연 섭외가 왔다.', '최선을 다했지만 합병증이 왔다. 오래 마음에 남는다.'],
    b: ['국내 최고 팀을 꾸려 협진한다', 'cha', 60, '🩺 협진 성공! 새 수술법이 교과서에 실렸다.', '팀이 삐걱였다. 수술은 절반의 성공.'] },
  { card: 'bestseller', title: '📚 밀리언셀러', ok: (_s, p) => ['novelist', 'writer'].includes(p.job) && p.jobLevel >= 3,
    text: (c) => `${fullName(c.p)}의 신작이 입소문을 타고 있다. 출판사가 대형 마케팅을 제안한다.`,
    a: ['북토크 전국 투어', 'cha', 55, '📚 100만 부 돌파! 서점마다 평대 한가운데.', '50만 부에서 멈췄다. 그래도 대단하다.'],
    b: ['홍보 대신 다음 작품을 쓴다', 'int', 65, '📚 조용히 100만 부. 평론가들이 "시대의 문장"이라 불렀다.', '입소문이 식었다.'] },
  { card: 'national_coach', title: '📋 국가대표 감독 제의', ok: (_s, p) => (p.job === 'coach' && p.jobLevel >= 2) || (p.job === 'athlete' && age(_s, p) >= 38),
    text: (c) => `대한체육회에서 ${fullName(c.p)}에게 국가대표 감독을 맡아 달라고 한다. 아시안게임이 1년 남았다.`,
    a: ['지옥 훈련으로 끌어올린다', 'str', 60, '📋 아시안게임 금메달! 선수들이 헹가래를 쳤다.', '동메달. 여론은 싸늘했다.'],
    b: ['선수들과 소통하는 리더십', 'cha', 58, '📋 금메달! "형님 리더십"이 화제가 됐다.', '분위기는 좋았지만 결과가 따르지 않았다.'] },
  { card: 'architect', title: '🏗 세계 건축상', ok: (_s, p) => p.job === 'architect' && p.jobLevel >= 4,
    text: (c) => `${fullName(c.p)}이(가) 설계한 도서관이 해외 건축 잡지 표지에 실렸다. 세계적인 건축상 후보에 올랐다.`,
    a: ['설계 철학을 담은 강연을 한다', 'int', 70, '🏗 한국인 최초 수상! 세계 건축계가 주목한다.', '최종 후보에서 멈췄다.'],
    b: ['지역 공공건축에 집중한다', 'mor', 60, '🏗 수상! "사람을 위한 건축"이라는 평.', '수상은 불발. 그래도 동네 명소가 남았다.'] },
  { card: 'master_craft', title: '🛠 대한민국 명장 심사', ok: (_s, p) => ['welder', 'mechanic', 'electrician', 'carpenter', 'shipbuilder', 'big_factory', 'factory', 'plumber'].includes(p.job) && p.jobLevel >= 3 && p.jobYears >= 15,
    text: (c) => `30년 가까이 한 길을 걸은 ${fullName(c.p)}이(가) 고용노동부 "대한민국 명장" 후보에 올랐다. 실기 심사가 남았다.`,
    a: ['손끝으로 증명한다', 'str', 55, '🛠 대한민국 명장 선정! 국가가 인정한 장인이 됐다.', '아깝게 떨어졌다. 내년에 다시.'],
    b: ['후배 양성 실적을 내세운다', 'mor', 55, '🛠 명장 선정! 제자 50명이 축하하러 왔다.', '서류에서 밀렸다.'] },
  { card: 'star_chef', title: '🍳 요리 서바이벌', ok: (_s, p) => ['chef', 'restaurant'].includes(p.job) && p.jobLevel >= 2,
    text: (c) => `${fullName(c.p)}이(가) 전국 요리 서바이벌 결승에 올랐다. 마지막 미션은 "나를 만든 한 그릇".`,
    a: ['어머니의 집밥을 재해석', 'cha', 55, '🍳 우승! 심사위원이 숟가락을 놓지 못했다. 가게 예약이 3개월 밀렸다.', '준우승. 그래도 가게 앞에 줄이 섰다.'],
    b: ['분자요리로 모험한다', 'int', 62, '🍳 우승! "천재 셰프" 수식어가 붙었다.', '실험이 과했다. 탈락.'] },
  { card: 'star_farmer', title: '🌾 신지식 농업인', ok: (_s, p) => ['farmer', 'smart_farmer', 'rancher', 'fisher'].includes(p.job) && p.jobLevel >= 2,
    text: (c) => `${fullName(c.p)}의 농장이 새 재배법으로 수확량을 두 배로 늘렸다. 농림부가 "신지식 농업인" 후보로 올렸다.`,
    a: ['재배법을 무료로 공개한다', 'mor', 50, '🌾 신지식 농업인 선정! 전국 농민들이 견학을 온다.', '심사에서 떨어졌지만 이웃들이 고마워한다.'],
    b: ['특허를 내고 사업화한다', 'int', 58, '🌾 선정! 기술 이전료까지 들어온다.', '특허 분쟁에 휘말렸다.'] },
  { card: 'national_hero', title: '🚒 불길 속으로', ok: (_s, p) => ['firefighter', 'police', 'coast_guard', 'emt', 'officer'].includes(p.job) && p.jobYears >= 3,
    text: (c) => `대형 화재 현장. 건물 안에 아이 둘이 갇혔다. 붕괴 위험이 있다. ${fullName(c.p)}의 판단은?`,
    a: ['직접 뛰어든다', 'str', 60, '🚒 두 아이를 안고 나왔다! 전 국민이 박수를 보냈다. 의인 표창.', '구조는 했지만 크게 다쳤다. 긴 재활이 시작됐다.'],
    b: ['팀을 지휘해 사다리차로 구한다', 'int', 55, '🚒 전원 구조! 침착한 지휘가 뉴스에 났다. 명예 훈장 수여.', '한 명을 구하지 못했다. 평생 잊지 못할 밤.'] },
];
const summitDef = (sm: Summit): EventDef => ({
  id: 'summit_' + sm.card,
  title: () => sm.title,
  valid: (c) => alive(c.p),
  text: (c) => `${sm.text(c)}\n\n🃏 성공하면 「${CARD[sm.card].name}」 카드 · ${effText(CARD[sm.card].eff)}`,
  choices: (c) =>
    gate(c.s, [sm.a, sm.b].map(([label, st, need, win, lose]): Choice => ({
      label,
      run: (x) => {
        if (check(x.s, x.p.actual[st], need, 10)) {
          awardCard(x.s, x.p, sm.card, sm.title.replace(/^\S+ /, ''));
          x.p.happiness = clamp(x.p.happiness + 15, 0, 100);
          return win;
        }
        if (sm.card === 'national_hero' && label.startsWith('직접')) x.p.actual.hp = clamp(x.p.actual.hp - 15, 0, 100);
        return lose;
      },
    }))),
});
export const CARD_EVENTS: EventDef[] = SUMMITS.map(summitDef);

/** 해마다: 자동 카드 · 정점 이벤트 · 카드 효과 */
export function cardYear(s: GameState): void {
  const seen = (s.storySeen ??= {});
  const people = Object.values(s.people).filter((p) => alive(p) && !p.inLaw && isMainline(s, p));
  for (const p of people) for (const d of CARDS) if (d.auto?.(s, p)) awardCard(s, p, d.id);
  // 정점 이벤트: 한 해에 하나
  const cands: [Summit, Person][] = [];
  for (const p of people)
    for (const sm of SUMMITS) if (!hasCard(s, p, sm.card) && sm.ok(s, p) && (seen[`summit:${p.id}:${sm.card}`] ?? -99) <= s.year - 5) cands.push([sm, p]);
  if (cands.length && chance(s, 0.3)) {
    const [sm, p] = pick(s, cands);
    seen[`summit:${p.id}:${sm.card}`] = s.year;
    s.events.push({ uid: s.eventSeq++, defId: 'summit_' + sm.card, personId: p.id });
  }
  // 효과: 카드 주인이 살아 있는 동안
  const kids = Object.values(s.people).filter((p) => alive(p) && isMainline(s, p) && age(s, p) < 20);
  const fam = Object.values(s.people).filter((p) => alive(p) && isMainline(s, p));
  for (const c of s.cards ?? []) {
    const holder = s.people[c.personId];
    if (!holder || !alive(holder)) continue;
    const e = CARD[c.id]?.eff;
    if (!e) continue;
    if (e.fame) s.fame += e.fame;
    if (e.cash) holder.cash += Math.round(e.cash * wageIndex(s.year));
    if (e.kid) for (const k of kids) k.actual[e.kid] = Math.min(Math.max(k.potential[e.kid], k.actual[e.kid]), k.actual[e.kid] + 1);
    if (e.study) for (const k of kids) if (age(s, k) >= 8) k.study = clamp((k.study ?? 40) + e.study, 0, 100);
    if (e.hp) for (const q of fam) q.actual.hp = clamp(q.actual.hp + e.hp, 0, Math.max(q.potential.hp, q.actual.hp));
    if (e.hap) for (const q of fam) q.happiness = clamp(q.happiness + e.hap, 0, 100);
    if (e.heat) s.taxHeat = Math.max(0, s.taxHeat - e.heat);
  }
}
