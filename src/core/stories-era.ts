// 시대의 이야기 더: 근현대사(era, 근현대사 모드 전용) · 지금(2025~2040) · 먼 미래(2040~2200, years).
// 해마다 가족 누군가에게 그 시절다운 일이 하나쯤 찾아온다.
import type { Story } from './stories';
import type { GameState, Person } from './types';
import { age, alive, hasFlag, parentsOf } from './people';

const kid = (s: GameState, p: Person) => p.id !== s.headId && age(s, p) < 20;
const poor = (s: GameState) => s.origin === 'poor';
const rich = (s: GameState) => s.origin === 'rich';
const married = (_s: GameState, p: Person) => !!p.spouseId;
const oldParents = (s: GameState, p: Person) => parentsOf(s, p).some((q) => alive(q) && age(s, q) >= 70);

export const ERA_STORIES: Story[] = [
  // ════════════ 근현대사 (1960~2025) ════════════
  // ── 1960년대 ──
  { id: 'h_ration_rice', title: '쌀 배급 줄', age: [8, 60], w: 0.04, era: [1960, 1968], cond: poor, text: '동사무소 앞 정부미 배급 줄. 새벽부터 선 줄이 골목을 두 번 꺾었다. {n}의 차례가 오기 전에 떨어질지도 모른다.', choices: [
    { label: '끝까지 기다린다', text: '', roll: ['luck', 55, [{ hap: 3 }, '마지막 한 되를 받았다. 오늘은 흰 쌀밥이다.'], [{ hap: -4 }, '"오늘은 끝났습니다." 보리쌀만 사서 돌아왔다.']] },
    { label: '밀가루로 수제비를 끓인다', text: '멀건 수제비에 간장을 쳤다. 배는 불렀다.', eff: { hp: -1 } },
  ] },
  { id: 'h_well', title: '공동 우물', age: [6, 16], w: 0.04, era: [1960, 1972], text: '물지게를 지고 공동 우물에 가는 게 {n}의 아침 일이다. 오늘은 우물가에 동네 아이들이 다 모였다.', choices: [
    { label: '물을 길어 부지런히 나른다', text: '어깨가 빨개졌다. 어머니가 누룽지를 쥐여 주셨다.', eff: { str: 1, aff: 2 } },
    { label: '우물가에서 놀다 늦는다', text: '고무줄놀이, 딱지치기… 물동이는 반만 찼다.', eff: { hap: 4, aff: -2 } },
  ] },
  { id: 'h_movie_theater', title: '동시상영 극장', age: [10, 30], w: 0.04, era: [1960, 1985], text: '동네 극장에서 영화 두 편을 한 표로 보여 준다. 필름이 끊기면 관객들이 휘파람을 분다.', choices: [
    { label: '두 편 다 본다', cost: 1, text: '신성일·엄앵란의 멜로에 눈물이 났다. 나오니 해가 졌다.', eff: { hap: 5 } },
    { label: '뒷문으로 몰래 들어간다', text: '', roll: ['luck', 50, [{ hap: 6 }, '들키지 않았다! 짜릿했다.'], [{ hap: -3, mor: -1 }, '극장 아저씨에게 귀를 잡혀 끌려 나왔다.']] },
  ] },
  { id: 'h_lotto_lottery', title: '주택복권', age: [20, 60], w: 0.03, era: [1969, 2002], head: true, text: '"준비하시고~ 쏘세요!" 주택복권 추첨 방송. {n}은(는) 지갑 속 복권을 꺼냈다.', choices: [
    { label: '번호를 맞춰 본다', cost: 1, text: '', roll: ['luck', 8, [{ cash: 800, hap: 12 }, '3등 당첨! 가족들이 방방 뛰었다.'], [{ hap: -1 }, '꽝. "다음 주엔 되겠지."']] },
    { label: '복권은 끊는다', text: '복권 살 돈으로 저금통에 동전을 넣었다.', eff: { mark: { thrift: 1 } } },
  ] },
  // ── 1970년대 ──
  { id: 'h_saemaul_road', title: '마을길 넓히기', age: [25, 60], w: 0.05, era: [1971, 1979], head: true, text: '새마을운동으로 마을 안길을 넓힌다. {n}네 밭 한 귀퉁이가 길에 들어간다. 보상은 없다.', choices: [
    { label: '흔쾌히 내놓는다', text: '이장님이 마을 회의에서 {n}을(를) 칭찬했다. 경운기가 집 앞까지 들어온다.', eff: { mor: 2, fame: 1 } },
    { label: '버틴다', text: '', roll: ['cha', 50, [{ hap: 2 }, '다른 쪽으로 길이 났다.'], [{ hap: -5 }, '동네에서 "욕심쟁이" 소리를 들었다.']] },
  ] },
  { id: 'h_seoul_up', title: '무작정 상경', age: [16, 25], w: 0.05, era: [1965, 1985], cond: (s) => s.origin !== 'rich', text: '친구가 서울 가면 공장이든 식당이든 일자리가 많다고 한다. 서울역에 내리면 어떻게든 된다고.', choices: [
    { label: '보따리 하나 들고 기차를 탄다', text: '', roll: ['str', 45, [{ cash: 200, str: 1, hap: 2 }, '청계천 봉제 공장에 들어갔다. 첫 월급으로 고향에 내복을 부쳤다.'], [{ hap: -6, hp: -3 }, '소개소에 속아 돈만 날렸다. 한동안 역에서 잤다.']] },
    { label: '고향에서 농사를 돕는다', text: '"땅은 거짓말 안 한다." 아버지 곁을 지켰다.', eff: { aff: 4, mor: 1 } },
  ] },
  { id: 'h_color_tv_drama', title: '여로', age: [10, 70], w: 0.04, era: [1972, 1975], text: 'TV 일일연속극 "여로" 하는 시간이면 거리가 텅 빈다. 오늘 밤 결말이 난다는 소문이다.', choices: [
    { label: 'TV 있는 집에 모인다', text: '온 동네가 한 방에 모여 같이 울었다.', eff: { hap: 5, cha: 1 } },
    { label: '라디오로 줄거리를 듣는다', text: '다음 날 학교에서 친구들 이야기로 마저 들었다.', eff: { hap: 1 } },
  ] },
  { id: 'h_mideast_letter', title: '사우디에서 온 편지', age: [25, 50], w: 0.05, era: [1975, 1986], cond: married, head: true, text: '중동 건설 현장에 간 남편(아내)의 편지가 왔다. 사막 사진 한 장과 "송금 들어갔다"는 말.', choices: [
    { label: '송금은 모두 적금에', text: '달러 송금을 한 푼도 안 쓰고 모았다. 3년 뒤 집을 샀다.', eff: { cash: 600, mark: { thrift: 1 } } },
    { label: '아이들 과외에 쓴다', text: '아이들이 공부를 곧잘 한다. 편지에 성적표를 동봉했다.', eff: { aff: 3 } },
  ] },
  { id: 'h_dongchimi_briquette', title: '연탄 가스', age: [5, 80], w: 0.04, era: [1965, 1990], text: '아침에 일어났는데 머리가 깨질 듯 아프다. 연탄 아궁이 틈으로 가스가 샌 모양이다.', choices: [
    { label: '동치미 국물을 마시고 바람을 쐰다', text: '', roll: ['hp', 40, [{ hp: -2 }, '겨우 정신을 차렸다. 아궁이 틈을 진흙으로 막았다.'], [{ hp: -12 }, '병원에 실려 갔다. 고압산소 치료를 받았다.']] },
    { label: '당장 병원에 간다', cost: 5, text: '빨리 가길 잘했다. 의사가 "큰일 날 뻔했다"고 했다.', eff: { hp: -1 } },
  ] },
  // ── 1980년대 ──
  { id: 'h_separated_family', title: '이산가족 찾기', age: [30, 90], w: 0.05, once: true, era: [1983, 1983], cond: (s) => s.origin !== 'rich', text: 'KBS 이산가족 찾기 생방송. 피난길에 헤어진 {n}의 삼촌을 찾는 팻말을 여의도 광장에 걸어 볼까?', choices: [
    { label: '팻말을 들고 방송국에 간다', text: '', roll: ['luck', 30, [{ hap: 15, aff: 5 }, '"맞아요! 우리 형이에요!" 33년 만에 삼촌을 찾았다. 온 가족이 부둥켜안고 울었다.'], [{ hap: -2 }, '며칠을 기다렸지만 소식이 없었다. 그래도 팻말은 두고 왔다.']] },
    { label: 'TV 앞에서 같이 운다', text: '남의 가족이 만나는 장면에 온 가족이 울었다.', eff: { hap: 2 } },
  ] },
  { id: 'h_pro_baseball', title: '프로야구 개막', age: [8, 50], w: 0.04, era: [1982, 1995], text: '동대문야구장. 어린이 회원 가입하면 점퍼와 모자를 준다. 아이들 사이에 난리가 났다.', choices: [
    { label: '어린이 회원에 가입한다', cost: 2, text: '점퍼를 입고 학교에 갔다. 반에서 인기 최고.', eff: { hap: 6 } },
    { label: '라디오 중계를 듣는다', text: '9회 말 역전 홈런에 이불 속에서 소리를 질렀다.', eff: { hap: 3 } },
  ] },
  { id: 'h_tutoring_ban', title: '몰래바이트', age: [19, 25], w: 0.04, era: [1981, 1991], student: true, text: '과외가 법으로 금지됐다. 그런데 부잣집에서 "몰래 과외" 선생을 구한다. 한 달 수입이 월급쟁이만 하다.', choices: [
    { label: '몰래 가르친다', mark: { risk: 1 }, text: '', roll: ['luck', 70, [{ cash: 300 }, '학비를 다 벌었다.'], [{ hap: -8, mor: -1 }, '단속에 걸려 학교에 통보됐다.']] },
    { label: '공장 아르바이트를 한다', text: '땀 흘려 번 돈은 떳떳했다.', eff: { str: 1, cash: 80 } },
  ] },
  { id: 'h_mycar_drive', title: '첫 가족 드라이브', age: [30, 55], w: 0.04, era: [1986, 1995], head: true, cond: (s) => s.origin !== 'poor', text: '새로 뽑은 차로 첫 가족 나들이. 경부고속도로 휴게소 호두과자가 기다린다.', choices: [
    { label: '설악산까지 달린다', cost: 5, text: '차 안에서 온 가족이 노래를 불렀다. 흔들바위 앞에서 사진을 찍었다.', eff: { hap: 8, aff: 5 } },
    { label: '가까운 유원지로', cost: 2, text: '용인 자연농원에 갔다. 아이들이 바이킹을 타고 소리를 질렀다.', eff: { hap: 5, aff: 3 } },
  ] },
  // ── 1990년대 ──
  { id: 'h_seotaiji', title: '"난 알아요"', age: [12, 22], w: 0.05, era: [1992, 1996], text: '서태지와 아이들 노래가 온 거리를 흔든다. {n}은(는) 헐렁한 힙합 바지를 사 달라고 조른다.', choices: [
    { label: '사 준다', cost: 3, text: '땅바닥을 쓸고 다니는 바지를 입고 회오리춤을 췄다.', eff: { hap: 6, cha: 1 } },
    { label: '"그게 바지냐"', text: '방문을 쾅 닫는 소리가 들렸다.', eff: { aff: -3 } },
  ] },
  { id: 'h_imf_kid', title: 'IMF 우리 집', age: [8, 18], w: 0.06, once: true, era: [1998, 1999], cond: (s, p) => kid(s, p) && s.origin !== 'rich', text: '아빠가 요즘 아침에 양복을 입고 나가는데 회사에 안 가는 것 같다. {n}은(는) 학원을 그만두겠다고 먼저 말했다.', choices: [
    { label: '"괜찮아, 너는 공부해"', text: '엄마가 식당 일을 시작했다. {n}은(는) 이를 악물고 공부했다.', eff: { study: 3, mor: 1 } },
    { label: '고마워, 조금만 쉬자', text: '학원을 끊고 도서관에 다녔다. 가족이 더 단단해졌다.', eff: { aff: 5, mark: { thrift: 1 } } },
  ] },
  { id: 'h_starcraft', title: '스타크래프트', age: [12, 30], w: 0.05, era: [1998, 2005], text: '"GG." PC방에서 스타크래프트 한 판. 옆자리 형이 프로게이머 지망생이란다.', choices: [
    { label: '밤새 래더를 돈다', cost: 1, text: '', roll: ['int', 55, [{ hap: 7, int: 1 }, '저그로 연승! 형이 "너 소질 있다"고 했다.'], [{ hap: 2, study: -2 }, '새벽에 집에 들어가다 아버지와 마주쳤다.']] },
    { label: '한 판만 하고 간다', text: '진짜로 한 판만 했다. 스스로가 대견했다.', eff: { mor: 1 } },
  ] },
  // ── 2000년대 ──
  { id: 'h_worldcup2002', title: '거리 응원', age: [10, 70], w: 0.08, once: true, era: [2002, 2002], text: '한국–이탈리아 16강전. 시청 앞 광장에 수십만 명이 붉은 옷을 입고 모였다.', choices: [
    { label: '붉은 티셔츠 입고 광장으로', text: '안정환의 골든골! 모르는 사람과 부둥켜안고 울었다.', eff: { hap: 12, cha: 1 } },
    { label: '집에서 치킨 시켜 본다', cost: 2, text: '아파트 전체가 함성으로 흔들렸다.', eff: { hap: 8 } },
  ] },
  { id: 'h_card_debt', title: '길거리 카드 발급', age: [19, 30], w: 0.05, era: [2000, 2003], text: '지하철역 앞 카드 모집인이 사은품을 흔든다. "소득 증빙 필요 없어요, 학생도 돼요!"', choices: [
    { label: '만들고 막 쓴다', mark: { risk: 1 }, text: '', roll: ['mor', 55, [{ hap: 3 }, '다행히 할부로 갚을 만큼만 썼다.'], [{ cash: -300, hap: -10, flag: 'bad_credit' }, '돌려막기를 하다 신용불량자가 됐다.']] },
    { label: '사은품만 받고 가위로 자른다', text: '보온병은 쓸 만했다.', eff: { mark: { thrift: 1 } } },
  ] },
  { id: 'h_cyworld_bgm', title: '도토리 선물', age: [15, 30], w: 0.04, era: [2003, 2009], text: '좋아하는 사람이 미니홈피 배경음악을 바꿨다. "눈의 꽃". {n}에게 보내는 신호일까?', choices: [
    { label: '방명록에 글을 남긴다', text: '', roll: ['cha', 50, [{ hap: 8 }, '"일촌 신청할게요." 답글이 달렸다.'], [{ hap: -3 }, '다음 날 미니홈피가 비공개로 바뀌었다.']] },
    { label: '도토리로 음악을 선물한다', cost: 1, text: '선물한 노래가 그 사람 미니홈피에 흘렀다.', eff: { hap: 5, cha: 1 } },
  ] },
  { id: 'h_fund_boom', title: '펀드 열풍', age: [25, 60], w: 0.05, era: [2006, 2008], head: true, text: '은행 창구 직원이 "중국 펀드 1년에 50%"라며 가입서를 내민다. 옆자리 동료도 들었단다.', choices: [
    { label: '목돈을 넣는다', cost: 100, mark: { risk: 1 }, text: '', roll: ['luck', 35, [{ cash: 180, hap: 5 }, '때마침 환매했다. 두 배 가까이 벌었다.'], [{ cash: 40, hap: -10 }, '금융위기가 터졌다. 펀드가 반토막 났다.']] },
    { label: '적금이나 넣는다', text: '이자는 적지만 발 뻗고 잤다.', eff: { mark: { thrift: 1 } } },
  ] },
  // ── 2010~2025 ──
  { id: 'h_kakao_family', title: '가족 단톡방', age: [30, 80], w: 0.05, era: [2011, 2025], head: true, text: '어머니가 가족 단톡방을 만드셨다. 아침마다 꽃 사진과 "좋은 아침" 이미지가 올라온다.', choices: [
    { label: '꼬박꼬박 답장한다', text: '"엄지 척" 이모티콘 하나에 어머니가 행복해하신다.', eff: { aff: 4, mor: 1 } },
    { label: '알림을 끈다', text: '조용해졌다. 가끔 서운하다는 전화가 온다.', eff: { aff: -2 } },
  ] },
  { id: 'h_sewol_ribbon', title: '노란 리본', age: [10, 80], w: 0.05, once: true, era: [2014, 2014], text: '온 나라가 슬픔에 잠겼다. 가방마다 노란 리본이 달렸다. {n}은(는) 아이들을 오래 안아 주었다.', choices: [
    { label: '분향소에 다녀온다', text: '긴 줄 속에서 모두가 말없이 울었다.', eff: { mor: 2 } },
    { label: '아이들과 안전 이야기를 한다', text: '"무슨 일이 있어도 네 판단으로 나와." 아이가 고개를 끄덕였다.', eff: { aff: 4 } },
  ] },
  { id: 'h_mask_line', title: '마스크 5부제', age: [20, 80], w: 0.06, once: true, era: [2020, 2020], text: '출생 연도 끝자리에 맞춰 약국 앞에 줄을 선다. 오늘은 {n}의 요일이다.', choices: [
    { label: '새벽부터 줄 선다', text: '공적 마스크 2장. 부모님 몫까지 챙겼다.', eff: { aff: 3, hp: 1 } },
    { label: '천 마스크를 만들어 쓴다', text: '재봉틀을 꺼냈다. 이웃에게도 나눠 줬다.', eff: { mor: 2, cha: 1 } },
  ] },
  { id: 'h_youngkkeul', title: '영끌', age: [28, 45], w: 0.06, once: true, era: [2020, 2021], head: true, cond: (s) => s.origin !== 'rich', text: '집값이 한 달에 수천만 원씩 오른다. 친구는 "영혼까지 끌어모아" 집을 샀단다. 지금이 마지막 기회일까?', choices: [
    { label: '대출을 최대로 받아 산다', cost: 300, mark: { risk: 1 }, text: '', roll: ['luck', 50, [{ cash: 500, hap: 6 }, '이듬해에도 올랐다. 등기를 보며 안도했다.'], [{ cash: -200, hap: -12 }, '금리가 치솟았다. 이자 내느라 허리가 휜다.']] },
    { label: '기다린다', text: '"벼락거지" 소리에 속이 쓰렸다. 2022년 집값이 떨어지기 전까지는.', eff: { hap: -3 } },
  ] },

  // ════════════ 지금 (2025~2040, 어느 모드든) ════════════
  { id: 'now_ai_homework', title: 'AI가 한 숙제', age: [9, 18], w: 0.06, years: [2025, 2040], cond: kid, text: '{n}의 독후감이 너무 매끄럽다. AI가 써 준 것 같다. 선생님도 눈치챈 모양이다.', choices: [
    { label: 'AI와 함께 쓰는 법을 가르친다', text: '"질문은 네가, 초안은 AI가, 생각은 다시 네가." 아이의 글이 달라졌다.', eff: { int: 2, study: 2 } },
    { label: '손으로 다시 쓰게 한다', text: '투덜대며 원고지 다섯 장을 채웠다.', eff: { mor: 1, study: 1, aff: -2 } },
    { label: '모른 척한다', text: '다음 학기, AI 사용 적발로 0점을 받았다.', eff: { study: -3 } },
  ] },
  { id: 'now_jeonse_fraud', title: '전세 사기 경보', age: [24, 45], w: 0.05, years: [2025, 2032], cond: (s) => s.origin !== 'rich', text: '{n}이(가) 계약하려는 빌라, 집주인이 수십 채를 가진 "갭투자자"라는 소문이 있다. 전세가율 90%.', choices: [
    { label: '보증보험 되는 집만 고른다', text: '조금 멀어도 안전한 집으로 갔다. 등기부를 세 번 떼 봤다.', eff: { int: 1, mark: { thrift: 1 } } },
    { label: '싸니까 계약한다', mark: { risk: 1 }, text: '', roll: ['luck', 55, [{ hap: 3 }, '2년 뒤 무사히 보증금을 돌려받았다.'], [{ cash: -3000, hap: -15 }, '집주인이 잠적했다. 보증금이 경매에 묶였다.']] },
  ] },
  { id: 'now_quiet_quit', title: '조용한 퇴사', age: [24, 40], w: 0.04, years: [2025, 2035], cond: (_s, p) => !!p.job && !['none', 'pension'].includes(p.job), text: '회사에서 딱 월급만큼만 일하기로 했다는 동기들. {n}도 흔들린다.', choices: [
    { label: '나도 칼퇴한다', text: '저녁이 있는 삶. 운동을 시작했다.', eff: { hap: 5, hp: 2 } },
    { label: '더 달린다', text: '', roll: ['int', 50, [{ promo: 1 }, '빈자리를 채우니 기회가 왔다. 승진!'], [{ hap: -5, hp: -3 }, '일만 늘었다.']] },
  ] },
  { id: 'now_lowbirth_bonus', title: '출산 지원금 1억', age: [26, 40], w: 0.05, years: [2026, 2040], cond: married, text: '지자체 출산 지원금이 첫째 1억 원까지 올랐다. 주변에 둘째를 고민하는 부부가 늘었다.', choices: [
    { label: '아이 계획을 세운다', text: '둘이서 오래 이야기했다. "해 보자."', eff: { bond: 5, hap: 3, flag: 'want_kid' } },
    { label: '돈 때문은 아니다', text: '"키우는 건 20년이야." 둘만의 삶을 택했다.', eff: { hap: 2 } },
  ] },
  { id: 'now_robotaxi_first', title: '운전석이 빈 택시', age: [15, 90], w: 0.04, once: true, years: [2027, 2036], text: '처음 타 보는 로보택시. 운전석이 텅 비어 있다. 핸들이 혼자 돌아간다.', choices: [
    { label: '신기해서 영상을 찍는다', text: '"할머니, 이거 봐요!" 가족 단톡방이 난리가 났다.', eff: { hap: 4 } },
    { label: '다음부턴 버스를 탄다', text: '아무래도 사람 기사님이 편하다.', eff: { mor: 1 } },
  ] },
  { id: 'now_heatwave_school', title: '폭염 휴교', age: [7, 18], w: 0.05, years: [2028, 2045], cond: kid, text: '기온 41도, 폭염 휴교령. {n}은(는) 집에서 원격 수업을 듣는다. 에어컨 전기요금이 걱정이다.', choices: [
    { label: '에어컨을 튼다', cost: 10, text: '시원한 방에서 공부가 잘됐다.', eff: { study: 1 } },
    { label: '도서관 쉼터로 보낸다', text: '공공 쉼터에서 친구들과 숙제를 했다.', eff: { cha: 1 } },
  ] },
  { id: 'now_parent_ai_care', title: '어머니의 AI 말벗', age: [40, 70], w: 0.05, years: [2026, 2045], cond: oldParents, text: '혼자 사시는 어머니(아버지)께 AI 스피커 말벗을 놔 드렸다. 요즘은 그 AI 이야기만 하신다.', choices: [
    { label: '주말마다 직접 찾아간다', text: '"AI보다 네가 좋다." 손을 꼭 잡으셨다.', eff: { aff: 6, mor: 1 } },
    { label: 'AI가 있으니 안심이다', text: 'AI가 매일 건강 보고서를 보내 준다. 그런데 목소리는 오래 못 들었다.', eff: { aff: -3 } },
  ] },
  { id: 'now_side_job', title: 'N잡러', age: [22, 50], w: 0.05, years: [2025, 2040], cond: (_s, p) => !!p.job && !['none', 'pension'].includes(p.job), text: '퇴근 후 부업을 하는 동료가 많다. 전자책, 영상 편집, AI 프롬프트 판매…', choices: [
    { label: '부업을 시작한다', text: '', roll: ['int', 50, [{ cash: 600, hap: 3 }, '월 50만 원이 꾸준히 들어온다.'], [{ hp: -3, hap: -3 }, '잠만 줄었다.']] },
    { label: '본업에 집중한다', text: '저녁엔 쉬기로 했다.', eff: { hp: 2 } },
  ] },
  { id: 'now_deepfake_kid', title: '딥페이크', age: [12, 19], w: 0.04, years: [2025, 2040], cond: kid, text: '반 단톡방에 {n}의 얼굴을 합성한 사진이 돌았다. 아이가 학교에 가기 싫다고 운다.', choices: [
    { label: '학교폭력위원회와 경찰에 신고한다', text: '가해 학생들이 처벌받았다. 아이가 조금씩 웃기 시작했다.', eff: { aff: 6, mor: 1 } },
    { label: '조용히 전학시킨다', text: '새 학교에서 다시 시작했다. 상처는 오래 갔다.', eff: { hap: -5, aff: 2 } },
  ] },
  { id: 'now_pet_insure', title: '반려견 수술비', age: [25, 70], w: 0.04, years: [2025, 2045], head: true, text: '15년을 함께한 반려견이 쓰러졌다. 수술비 500만 원. 살 확률은 반반이란다.', choices: [
    { label: '수술한다', cost: 500, text: '', roll: ['luck', 50, [{ hap: 10 }, '다시 꼬리를 흔든다.'], [{ hap: -10 }, '수술대에서 눈을 감았다. 가족 모두 울었다.']] },
    { label: '편안하게 보내 준다', text: '마지막 산책을 함께했다.', eff: { hap: -6, mor: 1 } },
  ] },
  { id: 'now_climate_move', title: '물에 잠기는 동네', age: [30, 70], w: 0.04, years: [2032, 2055], head: true, text: '해마다 여름이면 반지하가 잠기는 동네. 구청이 이주 지원금을 준다며 고지대 임대주택을 권한다.', choices: [
    { label: '이주한다', text: '창밖이 탁 트였다. 장마가 더는 무섭지 않다.', eff: { hap: 5, hp: 2 } },
    { label: '정든 동네에 남는다', text: '', roll: ['luck', 50, [{ hap: 2 }, '올여름은 무사히 넘겼다.'], [{ cash: -800, hap: -8 }, '또 잠겼다. 가전을 다 버렸다.']] },
  ] },
  { id: 'now_robot_first', title: '로봇이 온 날', age: [5, 90], w: 0.04, once: true, years: [2036, 2050], cond: (s) => !poor(s), text: '택배 상자에서 휴머노이드 로봇이 걸어 나왔다. 아이들이 이름을 지어 주자고 한다.', choices: [
    { label: '"돌쇠"라고 부른다', text: '돌쇠가 설거지를 하며 트로트를 부른다. 할머니가 제일 좋아하신다.', eff: { hap: 6 } },
    { label: '"삼촌"이라고 부르게 한다', text: '아이들이 로봇을 삼촌이라 부르며 따라다닌다.', eff: { hap: 5, cha: 1 } },
  ] },

  // ════════════ 먼 미래 (2040~2200, 어느 모드든) ════════════
  { id: 'fx_neural_exam', title: '뉴럴 칩 컨닝', age: [15, 19], w: 0.05, years: [2050, 2090], cond: kid, text: '수능장에 뉴럴 칩 차단기가 설치됐다. 그런데 반 친구가 차단기를 피하는 법을 안다며 솔깃한 제안을 한다.', choices: [
    { label: '거절한다', text: '제 실력으로 봤다. 결과가 어떻든 떳떳하다.', eff: { mor: 2, study: 1 } },
    { label: '해 본다', mark: { risk: 1 }, text: '', roll: ['luck', 30, [{ study: 5 }, '들키지 않았다… 마음은 무겁다.'], [{ study: -10, hap: -12, mor: -3 }, '적발됐다. 시험 무효, 3년간 응시 금지.']] },
  ] },
  { id: 'fx_robot_friend', title: '로봇과 친구', age: [6, 14], w: 0.05, years: [2045, 2120], cond: kid, text: '{n}이(가) 사람 친구보다 집 로봇하고만 논다. 로봇은 절대 화내지 않으니까.', choices: [
    { label: '동네 공원에 데리고 나간다', text: '처음엔 쭈뼛했지만 해 질 녘엔 흙투성이로 돌아왔다.', eff: { cha: 2, str: 1 } },
    { label: '로봇에게 "사회성 모드"를 켠다', text: '로봇이 일부러 져 주지 않기 시작했다. 아이가 지는 법을 배웠다.', eff: { mor: 1, int: 1 } },
  ] },
  { id: 'fx_longevity_choice', title: '두 번째 청춘', age: [70, 100], w: 0.05, years: [2058, 2200], text: '노화 역전 치료 값이 많이 내렸다. {n}에게 "70세 몸을 50세로" 되돌릴 기회가 왔다.', choices: [
    { label: '치료받는다', cost: 3000, text: '계단을 뛰어올랐다. 손주들과 축구를 했다.', eff: { hp: 20, hap: 8 } },
    { label: '지금 나이가 좋다', text: '"주름도 내 인생이다." 산책 속도를 조금 줄였다.', eff: { mor: 2, hap: 3 } },
  ] },
  { id: 'fx_space_school_trip', title: '달 수학여행', age: [15, 18], w: 0.05, once: true, years: [2072, 2200], cond: kid, text: '{n}의 학교가 달 수학여행을 간다. 참가비가 만만치 않다. 못 가는 아이들은 홀로그램으로 참여한다.', choices: [
    { label: '보낸다', cost: 800, text: '달에서 친구들과 3미터씩 뛰었다. 평생의 추억.', eff: { hap: 12, cha: 1, flag: 'space_trip' } },
    { label: '홀로그램으로 참여한다', text: '친구들이 달에서 보내 준 월석 조각을 받았다.', eff: { hap: 2 } },
  ] },
  { id: 'fx_memory_regret', title: '지우고 싶은 기억', age: [20, 90], w: 0.04, years: [2076, 2200], text: '{n}을(를) 오래 괴롭힌 기억이 있다. 기억 설계사에게 가면 그 모서리를 다듬을 수 있다.', choices: [
    { label: '기억을 다듬는다', cost: 300, text: '밤에 식은땀 흘리며 깨는 일이 사라졌다.', eff: { hap: 10, hp: 2 } },
    { label: '안고 산다', text: '"그것도 나다." 대신 가족에게 처음으로 털어놨다.', eff: { mor: 2, aff: 4 } },
  ] },
  { id: 'fx_mars_cousin', title: '화성 사촌', age: [8, 30], w: 0.05, years: [2088, 2200], text: '화성 새터에 사는 먼 사촌이 지구에 왔다. 지구 중력이 무거워 걷기 힘들어한다. {n}이(가) 안내를 맡았다.', choices: [
    { label: '바다를 보여 준다', text: '사촌이 파도 앞에서 한참을 울었다. "진짜 물이 이렇게 많아?"', eff: { cha: 2, hap: 5 } },
    { label: '짜장면을 사 준다', cost: 2, text: '"화성 짜장면이랑 달라!" 곱빼기를 두 그릇 먹었다.', eff: { hap: 6, aff: 2 } },
  ] },
  { id: 'fx_upload_grandma', title: '업로드된 할머니', age: [10, 70], w: 0.05, years: [2135, 2200], text: '명절, 의식 업로드된 증조할머니(할아버지)가 홀로그램으로 차례상 앞에 섰다. "요즘 애들은…" 잔소리는 그대로다.', choices: [
    { label: '옛날이야기를 듣는다', text: '200년 전 스마트폰 시절 이야기에 아이들이 배꼽을 잡았다.', eff: { hap: 6, int: 1 } },
    { label: '조용히 접속을 끊는다', text: '할머니가 서운해하셨다고 로그에 남았다.', eff: { aff: -3 } },
  ] },
  { id: 'fx_orbital_birth', title: '궤도 도시에서 태어난 아이', age: [22, 45], w: 0.04, years: [2120, 2200], cond: married, text: '궤도 도시에서 출산하면 아이는 평생 "우주 태생"이 된다. 지구 병원이냐, 궤도 병원이냐.', choices: [
    { label: '지구에서 낳는다', text: '흙냄새 나는 고향을 주고 싶었다.', eff: { aff: 3 } },
    { label: '궤도에서 낳는다', text: '창밖에 지구가 떠 있는 병실. 아이의 첫 풍경이다.', eff: { hap: 6, fame: 1 } },
  ] },
  { id: 'fx_asteroid_job', title: '소행성 광산 모집', age: [20, 40], w: 0.04, years: [2110, 2180], cond: (s) => !rich(s), text: '소행성 광산이 2년 계약 인력을 모집한다. 연봉은 지구의 다섯 배. 대신 가족과 2년 떨어진다.', choices: [
    { label: '다녀온다', text: '', roll: ['str', 50, [{ cash: 5000, str: 1 }, '무사히 계약을 마쳤다. 집을 샀다.'], [{ cash: 2000, hp: -10 }, '사고로 다쳐 조기 귀환했다. 위로금은 받았다.']] },
    { label: '지구에 남는다', text: '아이들 크는 걸 옆에서 봤다.', eff: { aff: 5 } },
  ] },
  { id: 'fx_forest_city', title: '숲이 된 도시', age: [8, 90], w: 0.04, years: [2100, 2200], text: '할아버지가 태어난 아파트 단지가 이제는 숲이다. 콘크리트 사이로 참나무가 자랐다. 주말에 가족 산책을 갈까?', choices: [
    { label: '옛 동네를 걷는다', text: '"여기가 101동이었어." 할아버지가 나무를 쓰다듬으셨다.', eff: { hap: 6, hp: 2, aff: 3 } },
    { label: '홀로그램으로 옛 모습을 본다', text: '2020년대 모습이 겹쳐 보였다. 신기하고 조금 슬펐다.', eff: { int: 1, hap: 2 } },
  ] },
  { id: 'fx_signal_kids', title: '외계인 그림 대회', age: [6, 12], w: 0.05, years: [2144, 2200], cond: kid, text: '유로파 생명 발견 이후 아이들 사이에 "외계인 그리기"가 유행이다. 학교 대회에 {n}이(가) 나간다.', choices: [
    { label: '같이 그려 준다', text: '촉수 여덟 개에 웃는 얼굴. 대상을 탔다!', eff: { hap: 6, cha: 1, aff: 3 } },
    { label: '혼자 그리게 한다', text: '', roll: ['int', 45, [{ hap: 5, int: 1 }, '과학적으로 그럴듯한 미생물 그림으로 과학상을 탔다.'], [{ hap: 1 }, '참가상. 그래도 냉장고에 붙였다.']] },
  ] },
  { id: 'fx_star_letter', title: '80년 뒤에 닿는 편지', age: [10, 90], w: 0.04, years: [2150, 2200], text: '성간 탐사선 "누리별"에 가족 편지를 실어 보낼 수 있다. 80년 뒤, 다른 별에서 읽힐 편지다.', choices: [
    { label: '온 가족이 한 줄씩 쓴다', text: '"우리 가문은 1960년부터 여기까지 왔습니다." 편지가 별로 떠났다.', eff: { hap: 5, fame: 1 } },
    { label: '아이의 그림을 보낸다', text: '크레파스로 그린 가족 그림이 별빛 속으로.', eff: { hap: 4, aff: 3 } },
  ] },
  { id: 'fx_gravity_sick', title: '중력 멀미', age: [5, 80], w: 0.015, years: [2100, 2200], cond: (s, p) => hasFlag(p, 'orbital_home') || hasFlag(p, 'mars_settler') || s.year > 2130, text: '달·화성·궤도 도시를 오가다 보니 {n}이(가) 중력 멀미로 사흘째 누워 있다.', choices: [
    { label: '중력 적응 치료를 받는다', cost: 20, text: '다시 걸을 수 있게 됐다.', eff: { hp: 3 } },
    { label: '그냥 버틴다', text: '', roll: ['hp', 50, [{ hp: 1 }, '나흘째에 털고 일어났다.'], [{ hp: -6 }, '뼈가 약해졌다는 진단을 받았다.']] },
  ] },
  { id: 'fx_family_tree_holo', title: '홀로그램 족보', age: [30, 100], w: 0.04, years: [2120, 2200], head: true, text: '가문의 족보를 홀로그램으로 복원하는 서비스. 1960년대 조상의 흑백 사진이 걸어 나와 인사를 한다.', choices: [
    { label: '온 가족과 함께 본다', cost: 50, text: '"우리 할아버지의 할아버지가 연탄을 갈던 분이래." 아이들이 신기해했다.', eff: { hap: 6, aff: 4, fame: 1 } },
    { label: '종이 족보로 충분하다', text: '할아버지가 물려주신 족보를 쓰다듬었다.', eff: { mor: 1 } },
  ] },
];
