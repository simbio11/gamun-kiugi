// 히든 직업이 되는 숨은 길. 어렵지는 않지만 드물다.
// 세 갈래로 찾아온다: ① 평범한 길 위의 갑작스런 사건 ② 능력치·흔적이 채워졌을 때 ③ 가족 중 누군가의 직업 덕분에.
// 조건을 채웠는데 기회가 아직 안 왔으면, 가끔 연대기에 수수께끼 같은 힌트가 남는다.
import { HIDDEN_RATE, hiddenMastery, novelty } from './hidden-mastery';
import { HIDDEN_BY_ID } from './hidden-data';
import { gate, type EventDef } from './ev-util';
import { addFlag, age, alive, clamp, fullName, hasTrait, isMainline, markOf, parentsOf, siblingsOf, spouseOf } from './people';
import { chance, pick } from './rng';
import type { GameState, Person } from './types';
import { lowly, QUEST_EVENTS, questYear } from './hidden-quest';
import { awardCard } from './cards';

interface Route {
  id: string;
  /** 이 해들에만 (현대 기술·시대) */
  years?: [number, number];
  /** 본인 조건 */
  when: (s: GameState, p: Person) => boolean;
  /** 가족 중 이런 사람이 있으면 기회가 훨씬 잦다 */
  kin?: (q: Person) => boolean;
  /** 해마다 기회가 올 확률 */
  p: number;
  title: string;
  offer: string;
  yes: string;
  yesText: string;
  noText: string;
  /** 해마다 들킬·다칠 위험 */
  risk?: number;
  riskText?: string;
}

const A = (s: GameState, p: Person) => age(s, p);
const st = (p: Person) => p.actual;
const job = (...ids: string[]) => (q: Person) => ids.includes(q.job);
const was = (...fl: string[]) => (q: Person) => fl.some((f) => q.flags.includes(f));

/** 코인을 들고 있나: 본인 명의, 또는 가주 부부라면 집안 지갑의 코인 */
const myCoins = (s: GameState, p: Person) => s.assets.some((a) => a.kind === 'coin' && (a.ownerId === p.id || ((p.id === s.headId || s.people[s.headId]?.spouseId === p.id) && a.ownerId === s.headId)));

const ROUTES: Route[] = [
  { id: 'hj_adventurer', years: [1970, 2200], when: (s, p) => A(s, p) >= 22 && A(s, p) <= 45 && st(p).str >= 59 && st(p).hp >= 60 && markOf(p, 'risk') >= 1, kin: was('saga_hidden'), p: 0.03, title: '🧭 낡은 지도',
    offer: '벼룩시장에서 산 고서 사이에서 손으로 그린 지도가 떨어졌다. 정글 한가운데 X 표시. 탐험대가 대원을 모집한다는 광고가 같은 날 신문에 났다.',
    yes: '탐험대에 합류한다', yesText: '배낭 하나 메고 비행기에 올랐다. 인생이 영화가 됐다.', noText: '지도는 서랍 속으로.', risk: 0.05, riskText: '정글에서 크게 다쳤다.' },
  { id: 'hj_magician', when: (s, p) => A(s, p) >= 18 && A(s, p) <= 45 && st(p).cha >= 56 && st(p).int >= 52, kin: job('entertainer', 'actor', 'musician'), p: 0.025, title: '🎩 무대 뒤의 노신사',
    offer: '술자리에서 동전 마술을 보여 주자, 구석의 노신사가 명함을 내밀었다. "은퇴한 마술사요. 내 비기(祕技)를 물려줄 사람을 30년째 찾고 있었소."',
    yes: '제자가 된다', yesText: '비둘기, 카드, 사라지는 상자. 첫 무대에서 기립 박수를 받았다.', noText: '"재밌는 분이네." 명함은 지갑 속에 오래 남았다.' },
  { id: 'hj_shaman', when: (s, p) => A(s, p) >= 22 && A(s, p) <= 55 && (st(p).hp < 45 || p.flags.includes('chronic')) && st(p).mor >= 45, kin: (q) => q.job === 'hj_shaman' || q.flags.includes('mom_devout'), p: 0.009, title: '🔔 신병(神病)',
    offer: '병원에선 아무 이상이 없다는데 몸이 계속 아프다. 꿈마다 흰옷 입은 할머니가 방울을 흔든다. 동네 만신이 {n}을 보더니 "신이 내렸네" 한다.',
    yes: '내림굿을 받는다', yesText: '굿이 끝나자 거짓말처럼 몸이 가벼워졌다. 이제 신당을 차린다.', noText: '"미신이야." 아픈 몸을 이끌고 다른 병원을 찾았다.' },
  { id: 'hj_cult', when: (s, p) => A(s, p) >= 28 && st(p).cha >= 58 && st(p).mor <= 48, kin: job('clergy'), p: 0.025, title: '🔮 추종자들',
    offer: '{n}의 말을 들으려고 사람들이 모인다. 작은 모임이 커져 "선생님"이라 부르는 이들이 백 명을 넘었다. 누군가 "우리만의 교회를 세우자"고 한다.',
    yes: '교단을 세운다', yesText: '산속 수련원에 금빛 의자가 놓였다. 헌금이 쏟아진다.', noText: '"나는 그런 사람이 아니다." 모임을 해산했다.', risk: 0.06, riskText: '탈퇴 신도들이 폭로 기자회견을 열었다.' },
  { id: 'hj_memecoin', years: [2013, 2200], when: (s, p) => A(s, p) >= 20 && A(s, p) <= 60 && myCoins(s, p) && (markOf(p, 'risk') >= 1 || hasTrait(p, 'gambler')), p: 0.022, title: '🐕 개 그림 코인',
    offer: '장난삼아 산 강아지 밈코인이 하룻밤에 300배가 됐다. 커뮤니티에선 {n}을 "고래"라 부른다. 지금 팔까, 아니면 이 판의 주인공이 될까?',
    yes: '전업 코인 인플루언서가 된다', yesText: '람보르기니 사진을 올렸다. 팔로워가 백만. 인생이 밈이 됐다.', noText: '조용히 절반만 팔았다. 그래도 큰돈이다.', risk: 0.08, riskText: '코인이 99% 폭락했다. 러그풀이었다.' },
  { id: 'hj_gambler', when: (s, p) => A(s, p) >= 20 && st(p).cha >= 55 && (markOf(p, 'cheat') >= 2 || markOf(p, 'risk') >= 3 || p.flags.includes('gambler')), kin: job('hj_mafia'), p: 0.035, title: '🃏 화투판의 전설',
    offer: '동네 하우스에서 판을 싹쓸이했다. 구석에서 지켜보던 사내가 다가온다. "손이 좋네. 큰 판에서 한번 놀아 볼 텐가? 설계는 내가 하지."',
    yes: '타짜의 길로', yesText: '밑장 빼기를 익혔다. 강원도에서 부산까지, 판마다 전설이 된다.', noText: '"도박은 끊었어요." 판을 떠났다.', risk: 0.07, riskText: '손목이 걸릴 뻔했다.' },
  { id: 'hj_natural', when: (s, p) => A(s, p) >= 40 && (p.happiness < 30 || st(p).hp < 40), p: 0.008, title: '🌿 산이 부른다',
    offer: 'TV에서 산속에 혼자 사는 사람을 봤다. 지친 {n}의 마음이 흔들린다. 마침 강원도 산골에 버려진 흙집이 싸게 나왔다.',
    yes: '모든 걸 두고 산으로', yesText: '약초를 캐고 계곡물을 마신다. 몸이 살아나는 게 느껴진다.', noText: '"언젠가는…" 리모컨을 내려놓았다.' },
  { id: 'hj_hermit', when: (s, p) => A(s, p) >= 20 && A(s, p) <= 40 && ['none', 'parttime'].includes(p.job) && p.happiness < 45 && !p.flags.includes('student'), p: 0.05, title: '🍜 방문을 닫다',
    offer: '면접에서 또 떨어졌다. {n}은(는) 방문을 걸어 잠갔다. 컵라면, 게임기, 밤낮이 바뀐 생활. 이대로 살아도 되지 않을까?',
    yes: '세상과 거리를 둔다', yesText: '"나는 쉬는 중이다." 방은 작은 우주가 됐다.', noText: '억지로 방문을 열고 나갔다. 햇빛이 눈부셨다.' },
  { id: 'hj_assassin', when: (s, p) => A(s, p) >= 24 && A(s, p) <= 50 && st(p).str >= 59 && st(p).mor <= 42, kin: (q) => q.job === 'officer' || q.flags.includes('war_vet'), p: 0.02, title: '🗡 검은 봉투',
    offer: '제대 후 방황하던 {n}에게 이름 없는 봉투가 도착했다. 사진 한 장과 거액의 선금. "당신 실력을 알고 있습니다."',
    yes: '일을 받는다', yesText: '비 오는 밤, 흔적 없이. 이름 대신 별명으로 불리게 됐다.', noText: '봉투를 태웠다. 그 뒤로 누군가 지켜보는 것 같았다.', risk: 0.08, riskText: '작전이 꼬였다. 총상을 입고 숨어 지낸다.' },
  { id: 'hj_hacker', years: [1995, 2200], when: (s, p) => A(s, p) >= 16 && st(p).int >= 72, kin: job('developer', 'security', 'data_scientist'), p: 0.012, title: '💻 해킹 대회의 초대장',
    offer: '{n}이(가) 심심풀이로 푼 보안 문제가 다크웹 포럼에 퍼졌다. 익명의 메시지: "당신이 그 사람이군요. 우리 팀에 들어오시죠."',
    yes: '화이트? 블랙? 일단 들어간다', yesText: '모니터 여섯 대, 에너지 드링크. 전설적인 닉네임이 생겼다.', noText: '메시지를 지웠다. 그래도 손가락이 근질거린다.', risk: 0.05, riskText: '수사 기관의 추적을 받았다.' },
  { id: 'hj_spy', when: (s, p) => A(s, p) >= 25 && A(s, p) <= 50 && st(p).int >= 62 && st(p).cha >= 56, kin: job('diplomat', 'officer', 'journalist', 'translator'), p: 0.025, title: '🕶 조용한 면접',
    offer: '출장 중 호텔 라운지에서 낯선 사람이 합석했다. "나라를 위해 일해 볼 생각 없으십니까. 가족에게도 비밀이어야 합니다."',
    yes: '요원이 된다', yesText: '겉으론 평범한 회사원. 밤에는 암호명으로 불린다.', noText: '"잘못 보셨습니다." 그 사람은 조용히 사라졌다.', risk: 0.04, riskText: '신분이 노출될 뻔했다.' },
  { id: 'hj_smuggler', when: (s, p) => A(s, p) >= 25 && st(p).mor <= 45 && ['shopkeeper', 'trader', 'fisher', 'customs_broker', 'trucker', 'courier', 'logistics', 'sme_ceo', 'ship_captain'].includes(p.job), kin: job('hj_pirate', 'hj_mafia'), p: 0.015, title: '💎 창고의 상자',
    offer: '거래처 사장이 상자 하나를 맡기며 말한다. "세관만 통과시켜 주면 한 번에 1년 치 벌이야." 상자에서 초록빛 보석이 반짝인다.',
    yes: '상자를 옮긴다', yesText: '한 번이 두 번이 되고, 이제 항구 창고의 주인이 됐다.', noText: '상자를 돌려보냈다.', risk: 0.08, riskText: '세관에 적발됐다.' },
  { id: 'hj_pirate', when: (s, p) => A(s, p) >= 20 && A(s, p) <= 50 && st(p).str >= 58 && st(p).mor <= 50, kin: job('fisher', 'navigator', 'coast_guard', 'shipbuilder'), p: 0.025, title: '🏴‍☠️ 수상한 선장',
    offer: '항구 선술집에서 외눈 선장이 {n}의 팔뚝을 보더니 웃는다. "공해(公海)에서 보물선을 쫓는다. 법 따위 없는 바다지. 탈 텐가?"',
    yes: '해적선에 오른다', yesText: '검은 깃발 아래서 파도를 가른다. 자유다.', noText: '"배멀미가 심해서요." 웃으며 거절했다.', risk: 0.07, riskText: '해군 함정에 쫓겼다.' },
  { id: 'hj_mercenary', when: (s, p) => A(s, p) >= 22 && A(s, p) <= 50 && st(p).str >= 61 && (p.flags.includes('war_vet') || p.flags.includes('war_veteran') || p.job === 'officer' || p.job === 'nco' || p.flags.some((f) => f.startsWith('served'))), kin: job('officer'), p: 0.03, title: '🪖 민간 군사 기업',
    offer: '해외 민간 군사 기업(PMC)에서 연락이 왔다. 연봉 2억, 분쟁 지역 6개월. "당신 같은 사람이 필요합니다."',
    yes: '계약서에 서명한다', yesText: '불타는 도시, 모래바람. 동료들과 등을 맞댄다.', noText: '가족 얼굴을 보고 거절했다.', risk: 0.09, riskText: '교전 중 부상을 입었다.' },
  // hj_mafia(밤의 대부)는 슈퍼 히든으로 승격 — 단발 제안 대신 super-hidden.ts의 3단계 사연(대부의 부름 → 가문 전쟁 → 도시의 왕)으로 열린다.
  { id: 'hj_trader', years: [1985, 2200], when: (s, p) => A(s, p) >= 26 && st(p).int >= 62 && ['banker', 'analyst', 'trader', 'corp', 'fund_manager', 'consultant', 'actuary'].includes(p.job), p: 0.05, title: '📈 뉴욕에서 온 전화',
    offer: '{n}의 공매도 리포트가 월가에 퍼졌다. 헤지펀드 매니징 디렉터가 직접 전화했다. "뉴욕으로 오시죠. 연봉은 원하시는 대로."',
    yes: '월스트리트로 간다', yesText: '맨해튼의 유리창 너머로 모니터 여섯 대. 하루에 수백억이 움직인다.', noText: '"가족이 여기 있어서요."', risk: 0.05, riskText: '큰 손실을 내고 책임을 졌다.' },
  { id: 'hj_bounty', when: (s, p) => A(s, p) >= 28 && st(p).str >= 56 && (p.flags.includes('was_police') || ['police', 'officer', 'coast_guard', 'nco', 'security_guard'].includes(p.job)), p: 0.045, title: '🎯 수배 전단',
    offer: '해외로 도주한 사기범 수배 전단. 피해자 모임이 사비로 건 현상금이 {n}의 연봉보다 많다.',
    yes: '사냥을 시작한다', yesText: '동남아 뒷골목을 누빈다. 잡을 때마다 이름이 알려진다.', noText: '전단을 접어 두었다.', risk: 0.05, riskText: '추적 중 습격을 받았다.' },
  { id: 'hj_tarot', when: (s, p) => A(s, p) >= 22 && st(p).cha >= 56 && st(p).int >= 50 && st(p).mor >= 50, kin: job('hj_shaman', 'hj_cult', 'clergy'), p: 0.025, title: '🔯 오래된 카드 한 벌',
    offer: '돌아가신 할머니 유품에서 손때 묻은 타로 카드가 나왔다. 장난삼아 친구 점을 봐 줬는데, 소름 돋게 맞았다.',
    yes: '작은 점집을 연다', yesText: '골목 끝 보랏빛 커튼. 손님들이 줄을 선다.', noText: '카드는 서랍에 넣었다.' },
  { id: 'hj_thief', when: (s, p) => A(s, p) >= 20 && A(s, p) <= 45 && st(p).int >= 66 && st(p).str >= 52 && (markOf(p, 'cheat') >= 1 || markOf(p, 'risk') >= 2), p: 0.02, title: '🎭 예고장',
    offer: '박물관 경비 시스템의 허점을 {n}은(는) 한눈에 알아봤다. 장난처럼 예고장을 써 본다. "오늘 밤 12시, 달빛의 보석을 가져가겠습니다."',
    yes: '예고장을 보낸다', yesText: '보석은 사라지고, 신문 1면에 괴도의 이름이 실렸다.', noText: '예고장을 찢었다. 상상만으로 짜릿했다.', risk: 0.07, riskText: '경찰이 턱밑까지 쫓아왔다.' },
  { id: 'hj_exorcist', when: (s, p) => A(s, p) >= 28 && st(p).mor >= 68, kin: job('hj_shaman', 'clergy'), p: 0.025, title: '📿 흉가의 부탁',
    offer: '"아무도 못 사는 집이 있어요." 마을 사람들이 {n}을 찾아왔다. 밤마다 우는 소리가 들린다는 폐가.',
    yes: '폐가에 들어간다', yesText: '염주와 경문으로 하룻밤을 버텼다. 새벽에 울음이 그쳤다. 소문이 퍼졌다.', noText: '"저는 그런 사람이 아닙니다."' },
  { id: 'hj_nomad', when: (s, p) => A(s, p) >= 24 && A(s, p) <= 50 && !p.spouseId && markOf(p, 'risk') >= 1 && p.happiness < 55, p: 0.03, title: '🎒 편도 티켓',
    offer: '퇴근길 여행사 창문의 포스터. "세계 일주, 편도." {n}의 가슴이 쿵 내려앉았다.',
    yes: '모든 걸 정리하고 떠난다', yesText: '배낭 하나, 스물 몇 개 나라. 길 위에서 사는 사람이 됐다.', noText: '포스터를 사진으로 찍어 두었다.' },
  { id: 'hj_fighter', when: (s, p) => A(s, p) >= 19 && A(s, p) <= 36 && st(p).str >= 59 && (s.origin === 'poor' || p.cash < 3000 || ['none', 'parttime'].includes(p.job)), p: 0.03, title: '🥊 지하 링',
    offer: '폐공장 지하, 철창 링. 우승 상금은 현금으로. 주최자가 {n}의 주먹을 보더니 웃는다. "다음 주 메인 이벤트 나가 볼래?"',
    yes: '링에 오른다', yesText: '3라운드 KO. 지하 세계에 새 챔피언이 탄생했다.', noText: '"다칠 일은 안 해요."', risk: 0.1, riskText: '경기 중 크게 다쳤다.' },
  { id: 'hj_forger', when: (s, p) => A(s, p) >= 25 && st(p).mor <= 45 && (p.job === 'painter' || p.flags.includes('side:painter') || markOf(p, 'i:media') >= 3 || p.job === 'illustrator'), kin: job('hj_smuggler', 'hj_mafia'), p: 0.025, title: '🖌 완벽한 모작',
    offer: '{n}이(가) 연습 삼아 그린 모작을 본 화랑 주인이 속삭인다. "이거 진품이라 해도 믿겠는데요. 경매에 한번 올려 볼까요?"',
    yes: '경매에 올린다', yesText: '감정사도 속았다. 수십억에 낙찰. 이제 "대가"들의 그림을 그린다.', noText: '"제 이름으로 그릴게요."', risk: 0.06, riskText: '과학 감정에서 들통날 위기다.' },
];
const ROUTE: Record<string, Route> = Object.fromEntries(ROUTES.map((r) => [r.id, r]));

const kinOf = (s: GameState, p: Person) => {
  const ps = parentsOf(s, p);
  const sp = spouseOf(s, p);
  return [...ps, ...ps.flatMap((q) => parentsOf(s, q)), ...siblingsOf(s, p), ...(sp ? [sp] : []), ...p.childIds.map((id) => s.people[id]).filter(Boolean)].filter((q) => q && alive(q));
};
const fill = (t: string, p: Person) => t.replaceAll('{n}', fullName(p));

/** 해마다: 조건이 맞는 가족에게 드물게 히든 제안이 온다 (가족 전체에서 한 해 한 건). 못 받은 사람에겐 가끔 힌트 */
export function hiddenYear(s: GameState): string[] {
  const msgs: string[] = [];
  questYear(s);
  parentsHidden(s);
  const seen = (s.storySeen ??= {});
  const people = Object.values(s.people).filter((p) => alive(p) && isMainline(s, p) && !p.job.startsWith('hj_'));
  const cands: [Route, Person][] = [];
  const rate = HIDDEN_RATE * hiddenMastery(s).hid; // 가문의 숙련이 쌓일수록 문이 더 잘 열린다
  for (const p of people)
    for (const r of ROUTES) {
      if (r.years && (s.year < r.years[0] || s.year > r.years[1])) continue;
      if (p.flags.includes('refused:' + r.id) || seen[`refused:${r.id}:${p.id}`]) continue; // 거절한 사람은 절대 다시 오지 않는다
      if ((seen[`hid:${p.id}:${r.id}`] ?? -99) > s.year - 6) continue;
      if (!r.when(s, p)) continue;
      const boost = r.kin && kinOf(s, p).some(r.kin) ? 2.5 : 1;
      if (chance(s, r.p * boost * lowly(p) * rate * novelty(s, r.id))) cands.push([r, p]);
      else if (chance(s, 0.04)) msgs.push(`🌑 ${fullName(p)}: ${HIDDEN_BY_ID[r.id].hint}`); // 수수께끼 힌트
    }
  if (cands.length) {
    const [r, p] = pick(s, cands);
    seen[`hid:${p.id}:${r.id}`] = s.year;
    s.events.push({ uid: s.eventSeq++, defId: 'hid_offer', personId: p.id, data: { id: r.id } });
  }
  // 히든 직업의 대가: 들키거나 다친다
  for (const p of Object.values(s.people)) {
    if (!alive(p) || !p.job.startsWith('hj_')) continue;
    const r = ROUTE[p.job];
    if (r?.risk && chance(s, r.risk)) s.events.push({ uid: s.eventSeq++, defId: 'hid_risk', personId: p.id, data: { id: p.job } });
  }
  return msgs;
}

/** 아이가 자라는 동안 부모에게도 숨은 문이 열린다 (한 세대 최대 두 번) */
function parentsHidden(s: GameState) {
  const hd = s.people[s.headId];
  if (!hd || age(s, hd) >= 20) return;
  const seen = (s.storySeen ??= {});
  const k = `phid:${s.generation}`;
  if ((seen[k] ?? 0) >= 2) return;
  for (const par of [s.people[hd.fatherId ?? ''], s.people[hd.motherId ?? '']]) {
    if (!par || !alive(par) || par.job.startsWith('hj_') || age(s, par) > 60) continue;
    if (par.sex === 'F' && chance(s, 0.02)) {
      const ids = ['hj_vtuber', 'hj_drifter'].filter((id) => !par.flags.includes('refused:' + id) && !seen[`refused:${id}:${par.id}`]);
      if (ids.length) {
        s.events.push({ uid: s.eventSeq++, defId: 'sh_step1', personId: par.id, data: { id: pick(s, ids) } });
        seen[k] = (seen[k] ?? 0) + 1;
      }
    } else if (chance(s, 0.03)) {
      const ids = ROUTES.filter((r) => r.id !== 'hj_hermit' && (!r.years || (s.year >= r.years[0] && s.year <= r.years[1])) && !par.flags.includes('refused:' + r.id) && !seen[`refused:${r.id}:${par.id}`]).map((r) => r.id);
      if (ids.length) {
        s.events.push({ uid: s.eventSeq++, defId: 'hid_offer', personId: par.id, data: { id: pick(s, ids) } });
        seen[k] = (seen[k] ?? 0) + 1;
      }
    }


  }
}

const offer: EventDef = {
  id: 'hid_offer',
  title: (c) => ROUTE[c.ev.data.id].title,
  valid: (c) => alive(c.p) && !c.p.job.startsWith('hj_'),
  text: (c) => `${fill(ROUTE[c.ev.data.id].offer, c.p)}\n\n🌑 히든 직업 「${HIDDEN_BY_ID[c.ev.data.id].name}」의 문이 열렸다. (지금 일은 그만두게 된다)`,
  choices: (c) =>
    gate(c.s, [
      {
        label: `${ROUTE[c.ev.data.id].yes} → 히든 직업: ${HIDDEN_BY_ID[c.ev.data.id].name}`,
        run: (x) => {
          const id = x.ev.data.id as string;
          x.p.flags = x.p.flags.filter((f) => !f.startsWith('prep:'));
          x.p.job = id;
          x.p.jobLevel = 0;
          x.p.jobYears = 0;
          addFlag(x.p, 'hidden:' + id);
          x.p.happiness = clamp(x.p.happiness + 10, 0, 100);
          awardCard(x.s, x.p, id, `${HIDDEN_BY_ID[id]?.name ?? id} 전직`);
          return `🌑 ${fill(ROUTE[id].yesText, x.p)}\n\n✨ 히든 직업 달성: ${HIDDEN_BY_ID[id].icon} ${HIDDEN_BY_ID[id].name}\n🎴 명예의 전당 카드를 획득했습니다!`;
        },
      },
      {
        label: '거절한다',
        run: (x) => {
          const id = x.ev.data.id as string;
          addFlag(x.p, 'refused:' + id);
          (x.s.storySeen ??= {})[`refused:${id}:${x.p.id}`] = 1;
          return `${fill(ROUTE[id].noText, x.p)}\n\n(※ ${fullName(x.p)} 본인에게는 다시 제안이 오지 않지만, 부모님이나 자녀 등 다른 가족에게는 정상적으로 기회가 찾아옵니다)`;
        },
      },

    ]),
};

const risk: EventDef = {
  id: 'hid_risk',
  title: (c) => `${HIDDEN_BY_ID[c.ev.data.id].icon} 위기`,
  valid: (c) => alive(c.p) && c.p.job === c.ev.data.id,
  text: (c) => `${fullName(c.p)}: ${ROUTE[c.ev.data.id].riskText ?? '위기가 닥쳤다.'}`,
  choices: (c) =>
    gate(c.s, [
      { label: '정면으로 버틴다', run: (x) => (chance(x.s, 0.55) ? '고비를 넘겼다. 전설이 한 줄 늘었다.' : ((x.p.actual.hp = clamp(x.p.actual.hp - 12, 0, 100)), (x.s.fame = Math.max(0, x.s.fame - 3)), '큰 대가를 치렀다. (건강 −12 · 명성 −3)')) },
      {
        label: '손을 씻고 평범한 삶으로',
        run: (x) => {
          x.p.job = 'none';
          x.p.jobLevel = 0;
          x.p.jobYears = 0;
          addFlag(x.p, 'hidden_retired');
          return '모든 걸 내려놓았다. 카드는 남았다. 이야기도 남았다.';
        },
      },
    ]),
};

export const HIDDEN_EVENTS: EventDef[] = [offer, risk, ...QUEST_EVENTS];
