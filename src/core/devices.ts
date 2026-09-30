// 연락 수단과 컴퓨터: 시대와 형편에 따라 달라진다.
//
// 1960년대엔 편지·전보와 동네 이장님 댁 전화, 1970~80년대엔 다이얼 전화(한때 전화 한 대가 집값),
// 1990년대엔 삐삐와 공중전화 줄, 1997년 PCS 휴대폰, 2000년대 폴더·슬라이드폰, 2009년 아이폰 이후 스마트폰,
// 그다음은 AR 글래스·AI 이어피스·뇌-컴퓨터 연결·홀로그램으로 간다.
// 같은 해라도 부잣집은 새 물건을 먼저 들이고, 가난한 집은 몇 년 늦게, 그것도 구형이나 공짜폰으로 산다.
// 모델마다 [부유층, 중산층, 서민, 빈곤층]이 손에 넣는 해를 따로 적었다.

import { formatWon } from './economy';
import type { GameState, Person } from './types';
import type { Story } from './stories';
import type { ActionDef } from './actions';
import { wageIndex } from './pay';
import { age, alive, clamp, fullName, householder } from './people';

export type CommKind = 'letter' | 'shared' | 'landline' | 'carphone' | 'pager' | 'citi' | 'cell' | 'feature' | 'smart' | 'glass' | 'neural' | 'holo';

interface Model {
  id: string;
  name: string;
  icon: string;
  kind: CommKind;
  /** [부유층, 중산층, 서민, 빈곤층]이 이 물건을 쓰기 시작하는 해 */
  avail: [number, number, number, number];
  /** 새것일 때 값 (2025년 돈 가치, 만원) */
  price: number;
  /** 한 줄 설명 */
  note: string;
}

const N = 9999;
export const PHONES: Model[] = [
  { id: 'letter', name: '편지·전보', icon: '✉', kind: 'letter', avail: [0, 0, 0, 0], price: 0, note: '급한 소식은 우체국 전보로. "모친위독급래" 여섯 글자에 온 식구가 짐을 싼다' },
  { id: 'neighbor', name: '이장님 댁 전화·공중전화', icon: '☎', kind: 'shared', avail: [N, 1960, 1960, 1960], price: 0, note: '"○○네, 서울서 전화 왔어요!" 동네 스피커로 부르면 뛰어간다' },
  { id: 'rotary', name: '다이얼 전화 (백색전화)', icon: '☎', kind: 'landline', avail: [1960, 1976, 1984, 1988], price: 900, note: '1970년대 백색전화는 집 한 채 값. 1987년에야 1가구 1전화가 된다' },
  { id: 'button', name: '버튼식 전화', icon: '☎', kind: 'landline', avail: [1983, 1986, 1989, 1993], price: 60, note: '"삐삐삐" 누르는 전화. 전전자 교환기(TDX)로 전화가 흔해졌다' },
  { id: 'carphone', name: '카폰', icon: '🚗', kind: 'carphone', avail: [1986, N, N, N], price: 2500, note: '승용차에 다는 전화. 안테나가 곧 부의 상징' },
  { id: 'pager', name: '삐삐 + 집 전화', icon: '📟', kind: 'pager', avail: [1989, 1992, 1994, 1996], price: 50, note: '번호가 찍히면 공중전화로 달려간다. 8282(빨리빨리) · 1004(천사)' },
  { id: 'brick', name: '벽돌폰 (아날로그 휴대폰)', icon: '📱', kind: 'cell', avail: [1990, N, N, N], price: 1500, note: '모토로라 다이나택. 무전기만 한 크기에 값은 차 한 대' },
  { id: 'citi', name: '시티폰 + 삐삐', icon: '📟', kind: 'citi', avail: [N, 1997, 1997, 1998], price: 40, note: '공중전화 근처에서만 걸 수 있는 발신 전용 전화' },
  { id: 'pcs', name: 'PCS 휴대폰', icon: '📱', kind: 'feature', avail: [1996, 1998, 1999, 2001], price: 150, note: '"걸면 걸리니까" 016·017·018·019. 흑백 액정에 안테나를 뽑는다' },
  { id: 'folder', name: '컬러 폴더폰', icon: '📱', kind: 'feature', avail: [2002, 2003, 2004, 2006], price: 120, note: '40화음 벨소리, 카메라 달린 폰. 문자는 80자 한 건에 30원' },
  { id: 'slide', name: 'DMB 슬라이드폰', icon: '📱', kind: 'feature', avail: [2005, 2006, 2008, 2010], price: 110, note: '지하철에서 안테나 뽑고 TV를 본다' },
  { id: 'smart1', name: '초기 스마트폰', icon: '📱', kind: 'smart', avail: [2009, 2011, 2012, 2014], price: 130, note: '아이폰 3GS·갤럭시S. 카톡이 문자를 밀어낸다' },
  { id: 'smart', name: '대화면 스마트폰', icon: '📱', kind: 'smart', avail: [2013, 2015, 2017, 2020], price: 140, note: 'LTE·페이·은행 앱. 전화보다 메신저가 먼저다' },
  { id: 'fold', name: '폴더블 스마트폰', icon: '📱', kind: 'smart', avail: [2019, 2023, 2028, 2033], price: 230, note: '접는 화면. 할부 24개월' },
  { id: 'glass', name: 'AR 스마트 글래스', icon: '👓', kind: 'glass', avail: [2031, 2034, 2038, 2042], price: 300, note: '눈앞에 메시지가 뜨고 손짓으로 답한다' },
  { id: 'ear', name: 'AI 비서 이어피스', icon: '🎧', kind: 'glass', avail: [2036, 2039, 2043, 2047], price: 260, note: '비서가 전화를 대신 받아 요약해 준다. 사기 전화도 걸러 준다(대부분은)' },
  { id: 'bci', name: '뉴럴 링크 (뇌-컴퓨터 연결)', icon: '🧠', kind: 'neural', avail: [2045, 2050, 2056, 2062], price: 1800, note: '생각만으로 메시지를 보낸다. 시술이 필요하다' },
  { id: 'holo', name: '홀로그램 통신', icon: '💠', kind: 'holo', avail: [2055, 2060, 2066, 2072], price: 900, note: '멀리 사는 가족이 거실에 서 있는 것처럼 보인다' },
];

export const PCS: Model[] = [
  { id: 'none', name: '없음', icon: '·', kind: 'letter', avail: [0, 0, 0, 0], price: 0, note: '' },
  { id: 'msx', name: '8비트 컴퓨터 (애플Ⅱ 호환·MSX)', icon: '🖥', kind: 'landline', avail: [1983, 1986, 1990, N], price: 700, note: '카세트테이프로 게임을 읽는다. 베이직으로 "HELLO"' },
  { id: 'at', name: '16비트 PC (XT·AT)', icon: '🖥', kind: 'landline', avail: [1987, 1989, 1992, 1995], price: 900, note: '5.25인치 디스켓, 도스, 한글 1.0' },
  { id: 'dos486', name: '486 PC · 도스', icon: '🖥', kind: 'landline', avail: [1991, 1993, 1995, 1997], price: 800, note: '하이텔·천리안 PC통신. 모뎀이 "삐- 치익"' },
  { id: 'win95', name: '펜티엄 PC · 윈도95', icon: '🖥', kind: 'landline', avail: [1995, 1996, 1998, 2000], price: 700, note: '"시작" 버튼. 스타크래프트' },
  { id: 'net', name: '초고속 인터넷 PC', icon: '🖥', kind: 'landline', avail: [1998, 1999, 2001, 2003], price: 450, note: 'ADSL·두루넷. 싸이월드와 인강' },
  { id: 'laptop', name: '노트북', icon: '💻', kind: 'landline', avail: [2004, 2007, 2010, 2013], price: 250, note: '카페에서 과제를 한다' },
  { id: 'tablet', name: '태블릿 + 노트북', icon: '💻', kind: 'landline', avail: [2011, 2013, 2016, 2019], price: 220, note: '인강은 태블릿으로' },
  { id: 'aipc', name: 'AI PC', icon: '💻', kind: 'landline', avail: [2024, 2026, 2029, 2032], price: 280, note: '과제 도우미가 기본으로 들어 있다' },
  { id: 'spatial', name: '공간 컴퓨터 (MR 헤드셋)', icon: '🥽', kind: 'glass', avail: [2030, 2033, 2037, 2041], price: 500, note: '거실 벽이 모니터가 된다' },
  { id: 'agent', name: '가정용 AI 에이전트', icon: '🤖', kind: 'glass', avail: [2038, 2042, 2046, 2050], price: 600, note: '숙제·가계부·병원 예약까지 알아서 한다' },
];

const byId = (list: Model[], id: string | undefined) => list.find((m) => m.id === id);

/** 형편: 0 부유층 · 1 중산층 · 2 서민 · 3 빈곤층 */
export function wealthTier(s: GameState): number {
  const h = householder(s);
  let t = s.origin === 'rich' ? 0 : s.origin === 'middle' ? 1 : 2;
  const wi = wageIndex(s.year);
  if (h.cash > 100000 * wi) t -= 1;
  if (h.cash < -500 * wi) t += 1;
  return clamp(t, 0, 3);
}

function newest(list: Model[], year: number, tier: number): Model {
  let best = list[0];
  for (const m of list) if (m.avail[tier] <= year && list.indexOf(m) > list.indexOf(best)) best = m;
  return best;
}
/** 그해 가장 새 물건 (부잣집이 막 산 것) */
export const latest = (list: Model[], year: number) => newest(list, year, 0);

export interface Gear {
  model: Model;
  /** 그해 최신 물건보다 뒤처졌나 */
  old: boolean;
  label: string;
}
function gearOf(s: GameState, list: Model[], owned: string | undefined): Gear {
  const def = newest(list, s.year, wealthTier(s));
  const own = byId(list, owned);
  const model = own && list.indexOf(own) > list.indexOf(def) ? own : def;
  const top = latest(list, s.year);
  const old = list.indexOf(model) < list.indexOf(top) && model.kind === top.kind;
  const cheap = model.kind === 'smart' && wealthTier(s) === 3 && !own ? ' (공짜폰·중고)' : old ? ' (구형)' : '';
  return { model, old, label: `${model.icon} ${model.name}${cheap}` };
}
/** 우리 집 연락 수단 */
export const phoneOf = (s: GameState) => gearOf(s, PHONES, s.gear?.phone);
/** 우리 집 컴퓨터 */
export const pcOf = (s: GameState) => gearOf(s, PCS, s.gear?.pc);

// ───────────────────────── 이벤트 창 ─────────────────────────

/** 이 사건이 전화로 오나(call) 글로 오나(msg) */
export function commEvent(defId: string, title: string): 'call' | 'msg' | undefined {
  if (COMM_IDS[defId]) return COMM_IDS[defId];
  if (/^(📞|☎)/.test(title)) return 'call';
  if (/^(📱|💌|📟|✉|📧|💬)/.test(title)) return 'msg';
  return undefined;
}
const COMM_IDS: Record<string, 'call' | 'msg'> = {
  st_h_beeper: 'msg', st_h_pc_comm: 'msg', st_h_phone: 'call', st_h_telegram: 'msg', st_h_lucky_letter: 'msg', st_h_pager_060: 'msg',
  st_h_700: 'call', st_h_long_distance: 'call', st_h_email: 'msg', st_dev_messenger: 'msg', st_dev_deepvoice: 'call', st_dev_holo_family: 'call',
};

/** 이 해에는 이런 사기가 없었다 (보이스피싱 2006~, 스미싱 2012~, 메신저 피싱 2018~) */
export const CALL_FROM: Record<string, number> = {
  call_kid_accident: 2006, call_prosecutor: 2006, call_refund: 2006, call_bank_fds: 2008, call_refinance: 2010, call_used_trade: 2010,
  call_parcel: 2012, call_romance: 2012, call_obituary: 2014, call_family_phone: 2018,
};

// ───────────────────────── 이야기 ─────────────────────────

const kid = (s: GameState, p: Person) => p.id !== s.headId && age(s, p) < 20;
const tierIs = (...t: number[]) => (s: GameState) => t.includes(wealthTier(s));

export const DEVICE_STORIES: Story[] = [
  // ── 그 시절 연락 (근현대사) ──
  { id: 'h_telegram', title: '✉ 전보', age: [25, 70], w: 0.04, era: [1960, 1985], head: true, text: '우체부가 전보를 내밀었다. "부친위독 급송금요망 — 숙부". 그런데 숙부님은 전보 칠 줄도 모르시는 분이고, 발신국도 고향이 아닌 낯선 우체국이다.', choices: [
    { label: '바로 우체국에서 돈을 부친다', text: '', roll: ['luck', 40, [{ aff: 3 }, '진짜였다. 부친 돈으로 읍내 병원에 모셨다.'], [{ cash: -150, hap: -10 }, '고향에 전화해 보니 아버지는 멀쩡하셨다. 전보 사기였다.']] },
    { label: '이장님 댁에 시외전화를 걸어 확인한다', cost: 1, text: '교환원을 거쳐 한 시간 만에 연결됐다. "무슨 소리여, 네 아버지 논에 나가 있어." 전보 사기였다.', eff: { mor: 1 } },
  ] },
  { id: 'h_lucky_letter', title: '✉ 행운의 편지', age: [10, 60], w: 0.04, era: [1970, 1996], text: '"이 편지는 영국에서 최초로 시작되어 일 년에 한 바퀴 돌면서 받는 사람에게 행운을 주었고… 7일 안에 7통을 보내지 않으면 불행이 옵니다."', choices: [
    { label: '밤새 7통을 베껴 쓴다', cost: 1, text: '우표값이 아깝지만 찝찝한 것보단 낫다. 손목이 시큰했다.', eff: { hap: -1 } },
    { label: '찢어서 버린다', text: '', roll: ['luck', 50, [{ mor: 1, hap: 2 }, '아무 일도 없었다. 역시 미신이다.'], [{ hap: -3 }, '다음 날 넘어져 무릎이 까졌다. 괜히 편지 생각이 났다.']] },
  ] },
  { id: 'h_long_distance', title: '☎ 시외전화', age: [18, 70], w: 0.03, era: [1960, 1987], text: '"서울서 전화 왔어요!" 동네 스피커가 {n}을(를) 부른다. 전화 있는 집까지 뛰어가 수화기를 들었다. 요금이 무서워 말이 빨라진다.', choices: [
    { label: '할 말만 하고 끊는다', text: '"잘 있다. 끊는다." 3분도 안 걸렸다.', eff: { mark: { thrift: 1 } } },
    { label: '안부를 길게 묻는다', cost: 2, text: '고향 소식을 한참 들었다. 전화 주인집에 과일값을 놓고 왔다.', eff: { hap: 4, aff: 3 } },
  ] },
  { id: 'h_700', title: '☎ 전화 요금 폭탄', age: [35, 60], w: 0.04, era: [1991, 1999], head: true, cond: (s, p) => p.childIds.some((id) => s.people[id] && age(s, s.people[id]) >= 13 && age(s, s.people[id]) <= 19), text: '전화 요금 고지서가 평소의 열 배다. 700 운세·폰팅 번호가 줄줄이 찍혀 있다. 사춘기 아이가 눈을 피한다.', choices: [
    { label: '크게 혼내고 700 번호를 막는다', cost: 20, text: '전화국에 가서 700 발신 차단을 신청했다. 요금은 어쩔 수 없이 냈다.', eff: { aff: -3 } },
    { label: '용돈에서 조금씩 갚게 한다', cost: 20, text: '아이가 반성문을 써 왔다. 석 달간 용돈에서 떼기로 했다.', eff: { mor: 1 } },
  ] },
  { id: 'h_pager_060', title: '📟 음성사서함', age: [18, 50], w: 0.04, era: [1993, 1999], text: '삐삐에 모르는 번호가 찍혔다. 음성사서함: "축하합니다! 경품 행사에 당첨되셨습니다. 060으로 시작하는 번호로 전화 주세요."', choices: [
    { label: '전화해 본다', cost: 6, text: '안내 멘트만 10분. 경품은 없고 정보이용료만 나갔다.', eff: { hap: -3 } },
    { label: '무시한다', text: '삐삐를 주머니에 도로 넣었다.', eff: { mor: 1 } },
  ] },
  { id: 'h_email', title: '📧 이메일 주소 만들기', age: [15, 50], w: 0.04, once: true, era: [1997, 2002], text: '"너 한메일 아이디 뭐야?" 다들 이메일 주소가 있다. 아이디를 뭐로 할지 한참 고민했다.', choices: [
    { label: '멋진 영어 아이디를 만든다', text: '"cool_guy97" 같은 아이디. 10년 뒤 이불을 찰 것이다.', eff: { hap: 3 } },
    { label: '이름 그대로 만든다', text: '무난하다. 평생 쓸 주소가 생겼다.', eff: { int: 1 } },
  ] },
  // ── 갖고 싶은 물건 (형편 차이) ──
  { id: 'dev_pager_want', title: '삐삐 사 줘', age: [14, 19], w: 0.05, once: true, years: [1993, 1998], cond: (s, p) => kid(s, p), text: '{n}이(가) 조른다. "반 애들 절반이 삐삐 차고 다녀. 나만 없어."', choices: [
    { label: '사 준다', cost: 20, text: '허리춤에 삐삐를 찼다. 친구들 사이 암호 "486(사랑해)"을 배워 왔다.', eff: { hap: 6, aff: 4 } },
    { label: '"공부하는 데 무슨 삐삐냐"', text: '방문이 쾅 닫혔다.', eff: { aff: -4, study: 1 } },
  ] },
  { id: 'dev_pc_want', title: '🖥 컴퓨터 사 주세요', age: [10, 18], w: 0.05, once: true, years: [1986, 1999], cond: (s, p) => kid(s, p) && pcOf(s).model.id === 'none', text: '{n}이(가) 컴퓨터 학원 전단지를 들고 왔다. "앞으로는 컴퓨터 못 하면 안 된대요. 짝꿍 집엔 벌써 있어요."', choices: [
    { label: '할부로 한 대 들인다', cost: 500, text: '책상 위에 모니터가 놓였다. 게임만 하는 것 같지만, 타자는 확실히 빨라졌다.', eff: { int: 2, hap: 6, flag: 'pc_kid', gear: 'pc' } },
    { label: '컴퓨터 학원만 보낸다', cost: 40, text: '학원에서 베이직과 타자를 배웠다.', eff: { int: 1 } },
    { label: '아직 이르다', text: '"컴퓨터는 무슨. 책이나 읽어라."', eff: { aff: -2 } },
  ] },
  { id: 'dev_pcbang', title: 'PC방', age: [12, 25], w: 0.05, years: [1998, 2010], text: '학교 끝나고 PC방. 스타크래프트 한 판만 하자던 게 해가 졌다.', choices: [
    { label: '한 판 더!', cost: 1, text: '', roll: ['int', 45, [{ hap: 6 }, '배틀넷 래더 점수가 올랐다.'], [{ hap: 2, study: -2 }, '밤 10시. 집에 가니 부모님이 기다리고 계셨다.']] },
    { label: '독서실로 간다', text: '친구들이 "배신자"라고 놀렸다.', eff: { study: 2 } },
  ] },
  { id: 'dev_messenger', title: '💬 버디버디', age: [12, 25], w: 0.04, years: [2000, 2008], text: '버디버디(네이트온) 창이 번쩍인다. 좋아하는 애가 말을 걸었다. 대화명이 "하늘을 나는 꿈…".', choices: [
    { label: '밤새 대화한다', text: '이모티콘 ^^;; 를 몇 번이나 썼는지 모른다.', eff: { hap: 6, cha: 1, study: -1 } },
    { label: '"자러 갈게"', text: '괜히 튕겼다. 다음 날 후회했다.', eff: { study: 1 } },
  ] },
  { id: 'dev_cyworld', title: '미니홈피', age: [14, 32], w: 0.04, years: [2002, 2010], text: '미니홈피 배경음악을 바꾸려면 도토리가 필요하다. 일촌들이 파도를 타고 들어온다.', choices: [
    { label: '도토리를 충전한다', cost: 3, text: '배경음악을 바꾸고 감성 글귀를 올렸다. 방문자 수 TODAY 38.', eff: { hap: 4, cha: 1 } },
    { label: '공짜로만 꾸민다', text: '기본 스킨도 나쁘지 않다.', eff: { mark: { thrift: 1 } } },
  ] },
  { id: 'dev_phone_want', title: '휴대폰 사 줘', age: [13, 19], w: 0.05, once: true, years: [2000, 2009], cond: (s, p) => kid(s, p), text: '{n}이(가) 말한다. "반에서 휴대폰 없는 애 나밖에 없어. 문자로 다 약속 잡는단 말이야."', choices: [
    { label: '최신 폴더폰을 사 준다', cost: 60, text: '40화음 벨소리를 몇 번이나 바꿨다. 문자 요금제 한도는 보름 만에 바닥났다.', eff: { hap: 7, aff: 4 } },
    { label: '공짜폰에 청소년 요금제', cost: 5, text: '"이거 완전 벽돌이잖아." 투덜대면서도 들고 다닌다.', eff: { hap: 3, mark: { thrift: 1 } } },
    { label: '아직은 안 된다', text: '친구 폰을 빌려 집에 전화한다.', eff: { aff: -4 } },
  ] },
  { id: 'dev_bill_shock', title: '데이터 요금 폭탄', age: [13, 25], w: 0.04, years: [2004, 2012], cond: (s, p) => kid(s, p), text: '휴대폰 고지서에 무선 인터넷 요금 38만 원. {n}이(가) 게임을 받다 "NATE" 버튼을 잘못 눌렀단다.', choices: [
    { label: '통신사에 따져 본다', text: '', roll: ['cha', 45, [{ hap: 2 }, '청소년 요금 상한제로 절반을 돌려받았다.'], [{ cash: -38, hap: -4 }, '"약관에 있습니다." 다 냈다.']] },
    { label: '용돈에서 갚게 한다', cost: 38, text: '아이 얼굴이 사색이 됐다. 다음부턴 조심하겠단다.', eff: { mor: 1 } },
  ] },
  { id: 'dev_iphone_line', title: '아이폰 출시 날', age: [18, 45], w: 0.04, once: true, years: [2009, 2011], cond: tierIs(0, 1), text: '아이폰이 한국에 들어왔다. 개통 행사장 앞에 밤새 줄이 늘어섰다.', choices: [
    { label: '줄을 선다', cost: 90, text: '새벽 5시에 개통했다. 카카오톡이란 걸 깔았다. 문자가 공짜다.', eff: { hap: 7, int: 1, gear: 'phone' } },
    { label: '쓰던 폰을 계속 쓴다', text: '"전화만 되면 됐지."' },
  ] },
  { id: 'dev_old_phone', title: '나만 구형폰', age: [11, 19], w: 0.06, once: true, years: [2011, 2040], cond: (s, p) => kid(s, p) && wealthTier(s) >= 2, text: '{n}의 휴대폰은 액정 한쪽이 깨진 몇 년 된 공짜폰이다. 단톡방 사진이 안 열리고, 친구들이 "그거 아직 켜져?" 하고 웃는다.', choices: [
    { label: '할부로 최신폰을 사 준다 (24개월)', cost: 180, text: '아이가 뛸 듯이 기뻐한다. 할부 이자를 계산하니 속이 쓰리다.', eff: { hap: 8, aff: 5, gear: 'phone' } },
    { label: '중고 1년 된 폰으로 바꿔 준다', cost: 50, text: '"이 정도면 괜찮아." 아이가 애써 웃는다.', eff: { hap: 3, aff: 2, mark: { thrift: 1 } } },
    { label: '형편을 솔직히 말한다', text: '', roll: ['mor', 50, [{ mor: 2, aff: 3 }, '아이가 고개를 끄덕였다. "알바해서 내가 살게."'], [{ hap: -6, aff: -5 }, '"우리 집은 왜 맨날 이래!" 방문이 닫혔다.']] },
  ] },
  { id: 'dev_free_phone', title: '"공짜폰 드려요"', age: [20, 80], w: 0.04, once: true, years: [2011, 2030], head: true, cond: tierIs(2, 3), text: '휴대폰 대리점 앞 현수막: "최신폰 공짜! 오늘만!" 직원이 계약서를 내밀며 "요금제만 6개월 쓰시면 돼요"라고 한다.', choices: [
    { label: '계약한다', text: '', roll: ['int', 55, [{ hap: 4 }, '약관을 꼼꼼히 봤다. 조건을 맞춰 정말 싸게 바꿨다.'], [{ cash: -120, hap: -8 }, '단말기 할부금 120만 원이 요금에 숨어 있었다. 공짜가 아니었다.']] },
    { label: '알뜰폰 요금제로 버틴다', text: '쓰던 폰에 유심만 바꿨다. 한 달 요금이 절반이 됐다.', eff: { mark: { thrift: 1 } } },
  ] },
  { id: 'dev_remote_class', title: '온라인 개학', age: [8, 18], w: 0.08, once: true, years: [2020, 2021], cond: (s, p) => kid(s, p) && wealthTier(s) >= 2, text: '코로나로 온라인 수업이 시작됐다. 집에 컴퓨터가 한 대뿐인데 아이들 수업은 겹친다. {n}은(는) 엄마 휴대폰으로 수업을 듣는다.', choices: [
    { label: '중고 노트북을 들인다', cost: 60, text: '화면이 작지만 수업은 끊기지 않는다.', eff: { study: 2 } },
    { label: '교육청 스마트기기 대여를 신청한다', text: '', roll: ['luck', 60, [{ study: 1 }, '태블릿을 빌렸다.'], [{ study: -3, hap: -3 }, '대여 물량이 동났다. 한 학기를 휴대폰으로 버텼다.']] },
  ] },
  // ── 미래 ──
  { id: 'dev_deepvoice', title: '📞 딥보이스', age: [40, 90], w: 0.04, years: [2028, 2060], head: true, cond: (s, p) => p.childIds.some((id) => s.people[id] && alive(s.people[id])), text: '영상통화가 왔다. 화면 속 자식이 울먹인다. "사고가 났어, 급히 돈이 필요해." 얼굴도 목소리도 똑같다. 그런데 배경이 조금 일렁인다.', choices: [
    { label: '바로 송금한다', text: '', roll: ['luck', 25, [{ aff: 3 }, '진짜였다. 다행히 제때 도왔다.'], [{ cash: -800, hap: -14 }, 'AI 합성 영상이었다. 자식은 회사에서 멀쩡히 일하고 있었다.']] },
    { label: '가족끼리 정한 암호를 묻는다', text: '"우리 집 강아지 이름이 뭐지?" 화면이 멈추더니 끊겼다. 딥페이크였다.', eff: { mor: 1, int: 1 } },
  ] },
  { id: 'dev_glass', title: 'AR 글래스', age: [15, 70], w: 0.04, once: true, years: [2031, 2045], text: '안경 하나로 길 안내·통역·메시지가 눈앞에 뜬다. 거리의 절반이 허공에 손짓을 한다.', choices: [
    { label: '최신 모델을 산다', cost: 300, text: '눈앞에 알림이 둥둥 뜬다. 처음 며칠은 어지러웠다.', eff: { hap: 5, int: 1, gear: 'phone' } },
    { label: '폰이면 충분하다', text: '"다들 허공에 대고 뭘 하는 거야."', eff: { mark: { thrift: 1 } } },
  ] },
  { id: 'dev_bci', title: '뇌-컴퓨터 연결 시술', age: [20, 60], w: 0.03, once: true, years: [2045, 2080], text: '생각만으로 메시지를 보내고 기억을 백업하는 뉴럴 링크 시술. 부유층은 이미 다 했다고 한다. 부작용 소송 뉴스도 가끔 나온다.', choices: [
    { label: '시술을 받는다', cost: 1800, text: '', roll: ['luck', 80, [{ int: 3, hap: 5, flag: 'neural' }, '머릿속으로 문장을 떠올리면 전송된다. 업무 속도가 두 배가 됐다.'], [{ hp: -12, hap: -8 }, '두통과 이명이 몇 달 이어졌다. 결국 장치를 껐다.']] },
    { label: '아직은 무섭다', text: '손가락으로 치는 게 속 편하다.' },
  ] },
  { id: 'dev_holo_family', title: '💠 홀로그램 명절', age: [30, 95], w: 0.04, years: [2055, 2090], head: true, text: '이번 명절엔 해외 사는 식구들이 홀로그램으로 차례상 앞에 섰다. 할머니(할아버지)가 손주 얼굴을 만지려다 허공을 짚었다.', choices: [
    { label: '다음엔 꼭 직접 오라고 한다', text: '"내년엔 비행기 타고 올게요." 약속을 받았다.', eff: { aff: 4, hap: 3 } },
    { label: '홀로그램이라도 반갑다', text: '밤늦도록 수다를 떨었다.', eff: { hap: 5 } },
  ] },
];

// ───────────────────────── 행동 ─────────────────────────

/** 과거엔 소득 수준만큼 싸게(그래도 비싸다), 미래엔 기술값이 떨어져 2025년 값 그대로 */
const price = (s: GameState, m: Model) => Math.round(m.price * Math.min(1, wageIndex(s.year)));

export const DEVICE_ACTIONS: ActionDef[] = [
  {
    id: 'dev_phone',
    cat: '재산',
    icon: '📱',
    name: '최신 연락 수단 들이기',
    desc: '그해 가장 새 전화기로 바꾼다',
    label: (s) => {
      const m = latest(PHONES, s.year);
      const now = phoneOf(s);
      return { name: `${m.icon} ${m.name} 들이기`, desc: `${m.note} · 지금: ${now.label} · ${formatWon(price(s, m))}` };
    },
    ap: 1,
    show: (s) => latest(PHONES, s.year).price > 0 && phoneOf(s).model.id !== latest(PHONES, s.year).id,
    blocked: (s) => (householder(s).cash < price(s, latest(PHONES, s.year)) ? '돈이 모자란다' : undefined),
    run: (s) => {
      const m = latest(PHONES, s.year);
      const h = householder(s);
      const v = price(s, m);
      h.cash -= v;
      (s.gear ??= {}).phone = m.id;
      h.happiness = clamp(h.happiness + 5, 0, 100);
      s.fame += m.avail[1] > s.year ? 0.5 : 0; // 중산층도 아직 못 쓰는 물건이면 동네에 소문이 난다
      return `${m.icon} ${m.name}을(를) 들였다. ${m.note}. (${formatWon(v)})`;
    },
  },
  {
    id: 'dev_pc',
    cat: '재산',
    icon: '🖥',
    name: '새 컴퓨터 들이기',
    desc: '아이들 공부와 일에 쓴다',
    label: (s) => {
      const m = latest(PCS, s.year);
      const now = pcOf(s);
      return { name: `${m.icon} ${m.name} 들이기`, desc: `${m.note} · 지금: ${now.model.id === 'none' ? '없음' : now.label} · ${formatWon(price(s, m))} · 집안 학생들 공부 효율↑` };
    },
    ap: 1,
    show: (s) => latest(PCS, s.year).id !== 'none' && pcOf(s).model.id !== latest(PCS, s.year).id,
    blocked: (s) => (householder(s).cash < price(s, latest(PCS, s.year)) ? '돈이 모자란다' : undefined),
    run: (s) => {
      const m = latest(PCS, s.year);
      const h = householder(s);
      const v = price(s, m);
      h.cash -= v;
      (s.gear ??= {}).pc = m.id;
      const kids = Object.values(s.people).filter((p) => alive(p) && age(s, p) >= 7 && age(s, p) <= 19);
      for (const k of kids) {
        k.study = clamp((k.study ?? 40) + 2, 0, 100);
        k.actual.int = clamp(k.actual.int + 1, 0, Math.max(k.potential.int, k.actual.int));
      }
      return `${m.icon} ${m.name}을(를) 들였다. ${m.note}.${kids.length ? ` ${kids.map(fullName).join('·')}의 공부가 조금 수월해졌다.` : ''} (${formatWon(v)})`;
    },
  },
];

/** 집안 학생들 공부 효율: 컴퓨터가 없거나 한참 뒤처지면 손해, 최신이면 이득 (1995년 이후) */
export function gearStudyMul(s: GameState): number {
  if (s.year < 1995) return 1;
  const g = pcOf(s);
  if (g.model.id === 'none') return 0.95;
  const gap = PCS.indexOf(latest(PCS, s.year)) - PCS.indexOf(g.model);
  return gap <= 0 ? 1.03 : gap >= 3 ? 0.97 : 1;
}

