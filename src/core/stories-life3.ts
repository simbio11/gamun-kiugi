// 이야기 묶음 3: 선택지를 넉넉히 (대부분 네 갈래). 같은 상황도 성격·형편에 따라 다르게 풀린다.
import type { Story } from './stories';
import type { GameState, Person } from './types';
import { age, alive, parentsOf, spouseOf } from './people';

const married = (s: GameState, p: Person) => !!spouseOf(s, p) && alive(spouseOf(s, p)!);
const hasKids = (s: GameState, p: Person) => p.childIds.some((id) => alive(s.people[id]) && age(s, s.people[id]) < 20);
const teenKid = (s: GameState, p: Person) => p.childIds.some((id) => alive(s.people[id]) && age(s, s.people[id]) >= 13 && age(s, s.people[id]) < 20);
const working = (_s: GameState, p: Person) => !['none', 'parttime', 'pension'].includes(p.job) && !p.flags.includes('student');
const rich = (_s: GameState, p: Person) => p.cash >= 20000;

export const LIFE3_STORIES: Story[] = [
  // ───────── 어린 시절 ─────────
  { id: 'l3_birthday_gift', title: '생일 선물', age: [6, 12], w: 0.04, text: '{n}의 생일. 갖고 싶은 게 세 가지란다: 최신 게임기, 강아지, 가족 여행.', choices: [
    { label: '게임기', cost: 50, text: '밤늦게까지 게임기를 끌어안고 잤다.', eff: { hap: 8, study: -1 } },
    { label: '가족 여행', cost: 100, mark: { family: 2 }, text: '바닷가 캠핑. 사진첩 첫 장이 이날이다.', eff: { hap: 7, aff: 4 } },
    { label: '책 한 권과 케이크', mark: { thrift: 1 }, text: '"…고마워." 조금 실망한 목소리.', eff: { hap: 1, int: 1 } },
    { label: '용돈으로 직접 고르게', mark: { thrift: 1 }, text: '한참 고민하다 반은 저금했다.', eff: { hap: 4, mor: 1 } },
  ] },
  { id: 'l3_homework_help', title: '숙제 대신 해 줘', age: [7, 12], w: 0.04, text: '방학 숙제 마감 하루 전. {n이} 곤충 채집 과제를 하나도 안 했다.', choices: [
    { label: '같이 밤새 한다', mark: { warmth: 1 }, text: '새벽 두 시, 둘이 만든 곤충 도감이 완성됐다.', eff: { aff: 4, hp: -1 } },
    { label: '내가 대신 해 준다', mark: { cheat: 1 }, text: '"이거 부모님이 하셨죠?" 선생님이 웃었다.', eff: { hap: 2, mor: -1 } },
    { label: '못 해 가도 네 책임', mark: { honest: 1 }, text: '혼나고 왔다. 다음 방학엔 달력에 숙제 날짜를 적었다.', eff: { mor: 2, hap: -3 } },
    { label: '선생님께 사정을 말하게', mark: { honest: 1 }, text: '하루 연장을 받았다. 스스로 해냈다.', eff: { mor: 1, int: 1 } },
  ] },
  { id: 'l3_scary_movie', title: '무서운 영화', age: [8, 13], w: 0.03, text: '친구 집에서 공포 영화를 본 {n이} 밤마다 화장실을 혼자 못 간다.', choices: [
    { label: '같이 가 준다', mark: { warmth: 1 }, text: '한 달쯤 지나자 괜찮아졌다.', eff: { aff: 3 } },
    { label: '무섭지 않은 이유를 설명', text: '', roll: ['int', 30, [{ int: 1, hap: 2 }, '"귀신은 없어" 과학 책을 같이 읽었다.'], [{ hap: -3 }, '설명할수록 더 무서워한다.']] },
    { label: '야간 조명을 달아 준다', cost: 3, text: '복도가 환해졌다. 문제 해결.', eff: { hap: 3 } },
  ] },
  { id: 'l3_smartphone_rules', title: '스마트폰 규칙', age: [9, 14], w: 0.04, text: '{n}의 하루 스마트폰 사용 시간이 6시간이다.', choices: [
    { label: '하루 1시간 제한 앱', mark: { study: 1 }, text: '', roll: ['mor', 35, [{ study: 2, hap: -2 }, '처음엔 울었지만 적응했다.'], [{ hap: -6, aff: -5 }, '몰래 공기계를 구했다. 쫓고 쫓기는 싸움.']] },
    { label: '규칙을 같이 정한다', mark: { warmth: 1, honest: 1 }, text: '숙제 끝나면 한 시간, 주말엔 두 시간. 스스로 지킨다.', eff: { mor: 2, aff: 2 } },
    { label: '나도 같이 줄인다', mark: { family: 1 }, text: '저녁 식탁에서 폰이 사라졌다. 대화가 늘었다.', eff: { hap: 3, aff: 4 } },
    { label: '그냥 둔다', text: '거북목이 되어 간다.', eff: { hp: -1, study: -1 } },
  ] },

  // ───────── 10대 ─────────
  { id: 'l3_fashion', title: '패딩 계급도', age: [13, 18], w: 0.04, text: '"반 애들 다 그 브랜드 패딩 입어." {n이} 80만 원짜리 패딩을 사 달라고 한다.', choices: [
    { label: '사 준다', cost: 80, mark: { spend: 1 }, text: '어깨가 으쓱. 한 철 입고 작아졌다.', eff: { hap: 7, cha: 1 } },
    { label: '반값 대체품', cost: 30, text: '"이거 짝퉁 같잖아…" 그래도 따뜻하게 입는다.', eff: { hap: 2 } },
    { label: '알바해서 반 보태라', mark: { thrift: 1 }, text: '주말 알바 두 달. 제 돈 들어간 패딩은 소중히 입는다.', eff: { mor: 2, hap: 3 } },
    { label: '안 된다', mark: { hurt: 1 }, text: '며칠 동안 말을 안 했다.', eff: { aff: -4 } },
  ] },
  { id: 'l3_tattoo', title: '타투하고 싶어', age: [16, 22], w: 0.03, text: '{n이} 팔에 작은 타투를 하겠단다.', choices: [
    { label: '성인 되면 네 뜻대로', text: '스무 살 생일에 작은 별을 새겼다.', eff: { hap: 4 } },
    { label: '헤나로 먼저 해 봐', text: '2주 만에 지워지자 "다행이다" 하고 웃었다.', eff: { hap: 2 } },
    { label: '절대 안 돼', mark: { hurt: 1 }, text: '몰래 했다. 여름에 긴팔을 입는다.', eff: { aff: -5 } },
    { label: '같이 한다', text: '가족 타투! 이야깃거리가 생겼다.', eff: { hap: 6, aff: 6 } },
  ] },
  { id: 'l3_study_abroad_teen', title: '유학 가고 싶어', age: [14, 18], w: 0.03, cond: rich, text: '{n이} 미국 고등학교로 유학을 가고 싶다고 한다. 1년에 7천만 원이다.', choices: [
    { label: '보낸다', cost: 7000, mark: { network: 1 }, text: '공항에서 한참을 울었다. 영상통화 속 {n이} 점점 어른이 된다.', eff: { cha: 3, int: 1, flag: 'abroad_kid' } },
    { label: '방학 캠프만', cost: 800, text: '한 달 캠프로 맛만 봤다.', eff: { cha: 1, hap: 4 } },
    { label: '대학 가서 교환학생으로', mark: { study: 1 }, text: '"그럼 공부 열심히 할게."', eff: { study: 1 } },
    { label: '안 된다', text: '꿈이 한풀 꺾였다.', eff: { hap: -5 } },
  ] },
  { id: 'l3_school_trip_accident', title: '수련회 연락', age: [13, 17], w: 0.02, text: '수련회 간 {n}이 친구와 싸워 선생님께 전화가 왔다.', choices: [
    { label: '당장 데리러 간다', text: '양쪽 얘기를 들으니 별일 아니었다. 다음 날 다시 합류했다.', eff: { aff: 2 } },
    { label: '선생님께 맡긴다', text: '', roll: ['luck', 65, [{}, '선생님이 잘 중재했다.'], [{ hap: -5 }, '감정의 골이 깊어졌다. 한동안 학교 가기 싫단다.']] },
    { label: '먼저 사과하라고 전한다', mark: { honest: 1 }, text: '"왜 나만?" 억울해하면서도 사과했다.', eff: { mor: 2, aff: -2 } },
  ] },

  // ───────── 청년 ─────────
  { id: 'l3_first_salary', title: '첫 월급 쓰는 법', age: [20, 30], w: 0.04, cond: working, text: '{n}의 첫 월급 250만 원이 들어왔다.', choices: [
    { label: '절반은 적금', mark: { thrift: 2 }, text: '통장 쪼개기를 시작했다.', eff: { cash: 125 } },
    { label: '부모님 선물', mark: { filial: 1 }, text: '엄마가 한참 봉투를 쓰다듬었다.', eff: { aff: 5, hap: 5 } },
    { label: '갖고 싶던 걸 산다', mark: { spend: 1 }, text: '노트북을 질렀다. 다음 달 카드값이 무섭다.', eff: { hap: 8 } },
    { label: 'ETF를 산다', mark: { risk: 1 }, text: '"장기 투자다." 앱을 하루 스무 번 켠다.', eff: { int: 1 } },
  ] },
  { id: 'l3_roommate', title: '룸메이트', age: [20, 32], w: 0.03, text: '{n}의 자취방 룸메이트가 설거지를 안 한다. 벌써 한 달째.', choices: [
    { label: '규칙표를 붙인다', mark: { honest: 1 }, text: '', roll: ['cha', 40, [{ hap: 3 }, '의외로 잘 지킨다.'], [{ hap: -4 }, '규칙표 위에 컵라면 용기가 쌓인다.']] },
    { label: '내가 그냥 한다', text: '평화는 지켰다. 속은 끓는다.', eff: { hap: -3 } },
    { label: '나간다', cost: 100, text: '혼자 사는 원룸으로 옮겼다. 조용하다.', eff: { hap: 4 } },
    { label: '대판 싸운다', text: '', roll: ['cha', 50, [{ hap: 2 }, '다 쏟아내고 나니 오히려 친해졌다.'], [{ hap: -6 }, '냉전 돌입. 집에 들어가기 싫다.']] },
  ] },
  { id: 'l3_overtime', title: '금요일 밤 호출', age: [24, 55], w: 0.04, cond: working, text: '금요일 밤 10시, 팀장 카톡. "{n} 씨, 내일 오전까지 이것 좀."', choices: [
    { label: '밤새 해서 보낸다', text: '', roll: ['luck', 60, [{ cha: 1 }, '월요일에 팀장이 커피를 사 줬다. 인정받았다.'], [{ hp: -2, hap: -5 }, '고맙다는 말도 없었다.']] },
    { label: '월요일에 하겠다고 답한다', mark: { honest: 1 }, text: '', roll: ['cha', 45, [{ hap: 3 }, '"그래요, 월요일에." 의외로 순순하다.'], [{ hap: -4 }, '월요일 아침 분위기가 싸했다.']] },
    { label: '읽씹한다', mark: { risk: 1 }, text: '주말은 지켰다. 월요일이 두렵다.', eff: { hap: 4 } },
    { label: '노무사 상담을 알아본다', mark: { honest: 1 }, text: '연장근로 수당 얘기를 꺼냈더니 호출이 줄었다.', eff: { mor: 1 } },
  ] },
  { id: 'l3_wedding_guest', title: '축의금 얼마', age: [25, 60], w: 0.04, text: '애매하게 친한 직장 동료 결혼식. {n}은 축의금을 얼마 낼까?', choices: [
    { label: '5만 원 (안 간다)', text: '봉투만 전달했다.', eff: { cash: -5 } },
    { label: '10만 원 (가서 먹는다)', text: '식권 두 장 값은 했다.', eff: { cash: -10 } },
    { label: '20만 원', mark: { network: 1 }, text: '"와 주셔서 감사해요!" 동료가 두 손을 잡았다.', eff: { cash: -20, cha: 1 } },
    { label: '안 낸다', text: '다음 날 탕비실이 어색했다.', eff: { cha: -1 } },
  ] },
  { id: 'l3_gap_year', title: '1년 쉬고 싶어', age: [22, 35], w: 0.03, text: '{n이} "딱 1년만 쉬고 싶다"고 한다. 번아웃이 온 것 같다.', choices: [
    { label: '세계 여행', cost: 1500, text: '남미를 배낭 하나로 돌았다. 돌아와 표정이 달라졌다.', eff: { hap: 15, cha: 2 } },
    { label: '제주 한 달 살기', cost: 300, text: '바다를 보며 책을 스무 권 읽었다.', eff: { hap: 10, hp: 2 } },
    { label: '쉬면서 자격증', cost: 100, mark: { cert: 1 }, text: '쉬는 듯 준비하는 1년.', eff: { hap: 4, int: 1 } },
    { label: '버텨 본다', text: '', roll: ['mor', 50, [{ mor: 1 }, '고비를 넘겼다.'], [{ hp: -3, hap: -8 }, '결국 병가를 냈다.']] },
  ] },

  // ───────── 부부·육아 ─────────
  { id: 'l3_kid_school_choice', title: '어느 학교로', age: [30, 50], w: 0.04, cond: hasKids, text: '아이 초등학교 입학을 앞두고 {n}의 부부가 고민한다. 집 앞 공립, 사립초, 대안학교.', choices: [
    { label: '집 앞 공립', mark: { thrift: 1 }, text: '걸어서 5분. 동네 친구들과 함께 다닌다.', eff: { hap: 2 } },
    { label: '사립초 (연 1,000만 원)', cost: 1000, mark: { study: 1 }, text: '영어·수영·바이올린까지. 등하교 차량이 필수다.', eff: { hap: -1 } },
    { label: '대안학교', cost: 500, mark: { warmth: 1 }, text: '숲에서 뛰노는 학교. 시험은 없다.', eff: { hap: 5 } },
    { label: '학군지로 이사를 고민', text: '"맹모삼천지교." 집값 검색이 시작됐다.', eff: { hap: -2 } },
  ] },
  { id: 'l3_couple_trip', title: '둘만의 여행', age: [30, 70], w: 0.04, cond: married, text: '결혼기념일. {n}의 배우자가 둘만 여행 가자고 한다.', choices: [
    { label: '해외 리조트', cost: 400, text: '아이 없는 사흘. 연애 때로 돌아간 것 같다.', eff: { bond: 10, hap: 8 } },
    { label: '근교 호캉스', cost: 60, text: '룸서비스와 수영장. 충분하다.', eff: { bond: 6, hap: 5 } },
    { label: '집에서 요리', mark: { family: 1 }, text: '서툰 스테이크와 와인. 웃음이 많았다.', eff: { bond: 5, hap: 3 } },
    { label: '바빠서 다음에', text: '"늘 다음이지." 서운한 눈빛.', eff: { bond: -6 } },
  ] },
  { id: 'l3_teen_grades', title: '성적표', age: [38, 60], w: 0.04, cond: teenKid, text: '중학생 아이 성적표를 보고 {n}의 얼굴이 굳었다. 반에서 뒤에서 다섯 번째다.', choices: [
    { label: '학원을 늘린다', cost: 600, text: '', roll: ['luck', 50, [{ hap: 2 }, '한 학기 만에 중간까지 올라왔다.'], [{ hap: -4 }, '학원만 바뀌었다. 아이 얼굴이 어둡다.']] },
    { label: '공부 말고 잘하는 걸 찾는다', mark: { warmth: 2 }, text: '"사실 나 요리하고 싶어." 처음 듣는 이야기였다.', eff: { hap: 4 } },
    { label: '크게 혼낸다', mark: { hurt: 1 }, text: '방문이 쾅. 저녁 식탁이 조용하다.', eff: { hap: -4 } },
    { label: '같이 공부 계획을 세운다', mark: { family: 1 }, text: '매일 저녁 한 시간, 나란히 앉아 책을 폈다.', eff: { hap: 2 } },
  ] },
  { id: 'l3_inlaw_visit', title: '시댁(처가) 방문', age: [28, 65], w: 0.04, cond: married, text: '배우자의 부모님이 한 달간 {n}네 집에 머무르신다고 한다.', choices: [
    { label: '정성껏 모신다', mark: { filial: 1 }, text: '한 달 내내 반찬을 새로 했다. 떠나시며 봉투를 쥐여 주셨다.', eff: { bond: 6, hap: -3, cash: 100 } },
    { label: '근처 숙소를 잡아 드린다', cost: 150, text: '적당한 거리가 모두를 편하게 했다.', eff: { bond: 2 } },
    { label: '배우자에게 맡긴다', text: '"우리 엄마(아빠)잖아, 좀 도와줘." 부부 싸움이 났다.', eff: { bond: -6 } },
  ] },
  { id: 'l3_kid_bully_victim', title: '괴롭힘을 당하는 아이', age: [30, 55], w: 0.02, cond: hasKids, text: '{n}의 아이 몸에서 멍을 발견했다. 학교에서 괴롭힘을 당하고 있었다.', choices: [
    { label: '학폭위를 연다', mark: { honest: 1 }, text: '가해 학생이 전학을 갔다. 아이가 다시 웃는다.', eff: { hap: -3 } },
    { label: '가해 부모를 직접 만난다', text: '', roll: ['cha', 50, [{}, '진심 어린 사과를 받았다.'], [{ hap: -8 }, '"애들 장난이죠." 적반하장이었다.']] },
    { label: '전학을 보낸다', cost: 200, text: '새 학교에서 새 친구를 사귀었다.', eff: { hap: 2 } },
    { label: '상담을 먼저 받게 한다', cost: 50, mark: { warmth: 1 }, text: '아이가 마음을 열고 이야기했다.', eff: { hap: 2 } },
  ] },

  // ───────── 중년·노년 ─────────
  { id: 'l3_parents_move', title: '부모님 모시기', age: [40, 65], w: 0.04, cond: (s, p) => parentsOf(s, p).some((q) => alive(q) && age(s, q) >= 75), text: '혼자 되신 부모님이 점점 기력이 떨어지신다. {n}이 결정해야 한다.', choices: [
    { label: '우리 집으로 모신다', mark: { filial: 2 }, text: '방 하나를 비웠다. 아이들이 할머니(할아버지) 곁에서 옛날 얘기를 듣는다.', eff: { hap: -2, bond: -3 } },
    { label: '근처로 이사 오시게', cost: 300, text: '걸어서 10분 거리. 매일 저녁 들른다.', eff: { hap: 2 } },
    { label: '실버타운', cost: 2000, text: '시설 좋은 곳에 모셨다. 친구분들이 생기셨다.', eff: { hap: 1 } },
    { label: '방문 요양 서비스', text: '장기요양등급을 받아 요양보호사가 매일 온다.', eff: {} },
  ] },
  { id: 'l3_health_check', title: '종합검진 결과', age: [40, 75], w: 0.04, text: '종합검진 결과표에 {n}의 "지방간·고지혈증·위염"이 나란히 적혀 있다.', choices: [
    { label: '술을 끊는다', mark: { exercise: 1 }, text: '', roll: ['mor', 45, [{ hp: 4 }, '석 달 만에 수치가 정상이 됐다.'], [{ hp: 1 }, '회식 자리에서 무너졌다.']] },
    { label: 'PT를 끊는다', cost: 200, mark: { exercise: 1 }, text: '뱃살이 들어갔다.', eff: { hp: 3, str: 1 } },
    { label: '영양제로 버틴다', cost: 50, text: '영양제 가짓수만 늘었다.', eff: { hp: 1 } },
    { label: '모른 척한다', text: '다음 해 결과표가 더 길어졌다.', eff: { hp: -2 } },
  ] },
  { id: 'l3_hobby_mid', title: '중년의 취미', age: [40, 65], w: 0.04, text: '{n}이 "나도 뭔가 배우고 싶다"며 동호회를 알아본다.', choices: [
    { label: '골프', cost: 300, mark: { network: 2 }, text: '주말 라운딩에서 거래처 사람들과 친해졌다.', eff: { cha: 1, hap: 4 } },
    { label: '등산 모임', mark: { exercise: 1, network: 1 }, text: '백두대간 종주 목표가 생겼다.', eff: { hp: 3, hap: 4 } },
    { label: '밴드 (드럼)', cost: 150, mark: { art: 1 }, text: '직장인 밴드 공연에서 무대에 섰다!', eff: { hap: 8, cha: 1 } },
    { label: '대학원 진학', cost: 1500, mark: { study: 1 }, text: '야간 대학원. 스무 살 어린 동기들과 공부한다.', eff: { int: 2, hap: 2 } },
  ] },
  { id: 'l3_retire_money', title: '퇴직금 어디에', age: [55, 70], w: 0.04, cond: (_s, p) => p.cash >= 10000, text: '{n}의 통장에 퇴직금이 들어왔다. 주변에서 조언이 쏟아진다.', choices: [
    { label: '연금으로 나눠 받는다 (IRP)', mark: { thrift: 2 }, text: '퇴직소득세를 30% 아꼈다. 매달 연금이 나온다.', eff: { cash: 500 } },
    { label: '치킨집 창업', mark: { risk: 2 }, text: '', roll: ['luck', 35, [{ cash: 3000, hap: 6 }, '동네 맛집이 됐다.'], [{ cash: -5000, hap: -10 }, '2년 만에 폐업. 퇴직금 절반이 날아갔다.']] },
    { label: '수익형 부동산', text: '오피스텔 한 채를 알아본다. 자산 탭에서 매물을 보자.', eff: {} },
    { label: '자녀 결혼 자금으로', mark: { family: 1 }, text: '자녀 전세금에 보탰다.', eff: { cash: -3000, hap: 4 } },
  ] },
  { id: 'l3_grandkid_name', title: '손주 이름', age: [55, 90], w: 0.03, cond: (s, p) => p.childIds.some((id) => s.people[id]?.childIds.some((g) => alive(s.people[g]) && age(s, s.people[g]) <= 1)), text: '자녀가 {n}에게 손주 이름을 지어 달라고 부탁했다.', choices: [
    { label: '작명소에 간다', cost: 30, text: '사주에 맞는 이름을 받아 왔다. 자녀는 조금 촌스럽단다.', eff: { hap: 3 } },
    { label: '항렬 따라 짓는다', mark: { family: 1 }, text: '족보를 펼쳤다. 집안 어른들이 흡족해하셨다.', eff: { hap: 4 } },
    { label: '너희가 지어라', text: '"아빠(엄마)가 지어 주길 바랐는데…" 괜히 서운하게 했다.', eff: { hap: -1 } },
  ] },
  { id: 'l3_old_car', title: '마지막 드라이브', age: [70, 95], w: 0.03, text: '{n}이 젊은 날 살던 동네를 한번 가 보고 싶다고 한다.', choices: [
    { label: '자녀와 함께 간다', mark: { family: 2 }, text: '옛집 자리엔 아파트가 섰다. 그래도 골목 끝 구멍가게는 그대로였다.', eff: { hap: 10 } },
    { label: '혼자 기차로', text: '창밖을 보며 한참 생각에 잠겼다.', eff: { hap: 5 } },
    { label: '사진으로만', text: '앨범을 넘기며 추억했다.', eff: { hap: 2 } },
  ] },

  // ───────── 사회 ─────────
  { id: 'l3_neighbor_smoke', title: '아랫집 담배 연기', age: [20, 90], w: 0.03, text: '베란다로 아랫집 담배 연기가 올라온다. {n}네 아이가 기침을 한다.', choices: [
    { label: '쪽지를 붙인다', text: '', roll: ['luck', 60, [{ hap: 3 }, '다음 날부터 연기가 사라졌다.'], [{ hap: -3 }, '"내 집에서 내가 피우는데" 답장 쪽지.']] },
    { label: '관리사무소에 민원', text: '방송이 나갔다. 조금 줄었다.', eff: { hap: 1 } },
    { label: '공기청정기를 산다', cost: 60, text: '해결은 아니지만 숨은 쉰다.', eff: {} },
    { label: '직접 찾아간다', text: '', roll: ['cha', 50, [{ hap: 4 }, '이웃이 미안하다며 금연을 결심했단다.'], [{ hap: -6 }, '언성이 높아졌다. 엘리베이터가 어색하다.']] },
  ] },
  { id: 'l3_donation_request', title: 'TV 모금 방송', age: [20, 95], w: 0.03, text: 'TV에서 소아암 어린이 모금 방송이 나온다. {n}의 마음이 흔들린다.', choices: [
    { label: '정기 후원 신청', cost: 36, mark: { kind: 2 }, text: '매달 3만 원. 연말정산 기부금 공제도 된다.', eff: { mor: 2, hap: 3 } },
    { label: 'ARS 한 통', cost: 1, mark: { kind: 1 }, text: '3천 원이지만 마음은 전했다.', eff: { mor: 1 } },
    { label: '헌혈하러 간다', mark: { kind: 1 }, text: '헌혈증을 기부했다.', eff: { mor: 2, hp: -1 } },
    { label: '채널을 돌린다', text: '마음이 조금 불편하다.', eff: {} },
  ] },
  { id: 'l3_election_help', title: '선거 운동 부탁', age: [30, 80], w: 0.02, text: '구의원 선거에 나간 동창이 {n}에게 선거 운동을 도와 달라고 한다.', choices: [
    { label: '적극 돕는다', mark: { network: 2 }, text: '', roll: ['luck', 45, [{ fame: 2 }, '당선! 동네 일이 수월해졌다.'], [{ hap: -3 }, '낙선. 반대편 이웃과 서먹해졌다.']] },
    { label: '후원금만', cost: 50, text: '영수증과 감사 문자가 왔다.', eff: {} },
    { label: '정치는 사양', text: '"미안, 나는 빠질게."', eff: {} },
  ] },
  { id: 'l3_lost_child', title: '길 잃은 아이', age: [18, 90], w: 0.02, text: '마트에서 {n}의 옷자락을 잡은 아이가 울고 있다. 엄마를 잃어버렸단다.', choices: [
    { label: '안내 데스크로 데려간다', mark: { kind: 1 }, text: '5분 만에 엄마가 달려왔다. 아이가 손을 흔들었다.', eff: { mor: 2, hap: 3 } },
    { label: '같이 찾아다닌다', mark: { kind: 1 }, text: '', roll: ['luck', 60, [{ mor: 2, hap: 4 }, '과자 코너에서 엄마를 찾았다.'], [{ hap: -2 }, '엇갈려 한참을 헤맸다. 결국 방송으로 찾았다.']] },
    { label: '직원을 불러 준다', text: '직원에게 맡겼다.', eff: {} },
  ] },
];
