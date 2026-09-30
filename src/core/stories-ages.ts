// 모든 시대 × 모든 나이: 아이(6~12) · 청소년(13~19) · 청년(20~35) · 중년(36~59) · 노년(60~)
// 근현대사는 era(근현대사 모드 전용), 지금·미래는 years(어느 모드든).
import type { Story } from './stories';
import type { GameState, Person } from './types';
import { age } from './people';
import { homeOf } from './housing';

const kid = (s: GameState, p: Person) => p.id !== s.headId && age(s, p) < 20;
const married = (_s: GameState, p: Person) => !!p.spouseId;
const owner = (s: GameState, p: Person) => homeOf(s, p)?.type === 'own';
const renter = (s: GameState, p: Person) => ['jeonse', 'wolse'].includes(homeOf(s, p)?.type ?? '');
const working = (_s: GameState, p: Person) => !!p.job && !['none', 'pension', 'parttime'].includes(p.job);

export const AGE_STORIES: Story[] = [
  // ═══════ 1960~70년대 ═══════
  { id: 'h_kid_gomu', title: '고무줄놀이', age: [6, 12], w: 0.05, era: [1960, 1985], cond: kid, text: '골목에서 "무찌르자 오랑캐~" 고무줄놀이가 한창이다. 짓궂은 남자애가 고무줄을 끊고 달아났다.', choices: [
    { label: '쫓아가서 따진다', text: '', roll: ['str', 45, [{ hap: 4, cha: 1 }, '잡았다! 새 고무줄을 사 오기로 약속받았다.'], [{ hap: -2 }, '놓쳤다. 매듭을 지어 다시 놀았다.']] },
    { label: '매듭 지어 다시 논다', text: '짧아진 고무줄로 더 높이 뛰었다.', eff: { str: 1 } },
  ] },
  { id: 'h_teen_uniform_cap', title: '교모 챙 구기기', age: [13, 18], w: 0.04, era: [1960, 1982], cond: kid, text: '선배들처럼 교모 챙을 구기고 가방을 옆구리에 끼는 게 멋이란다. 규율부 선생님이 교문에 서 있다.', choices: [
    { label: '멋 부리고 간다', text: '', roll: ['luck', 45, [{ cha: 1, hap: 4 }, '무사통과. 친구들 사이에서 "좀 논다"는 소리를 들었다.'], [{ hap: -4 }, '교문에서 걸려 운동장 열 바퀴.']] },
    { label: '반듯하게 쓰고 간다', text: '선생님이 고개를 끄덕였다.', eff: { mor: 1 } },
  ] },
  { id: 'h_young_letter_army', title: '위문편지', age: [18, 26], w: 0.04, era: [1960, 1990], text: '군대 간 친구에게 위문편지를 쓴다. 학교에서도 국군 아저씨께 위문편지를 쓰라고 한다.', choices: [
    { label: '정성껏 길게 쓴다', text: '답장이 왔다. "네 편지 덕에 버틴다." 몇 년 뒤 그 친구와…', eff: { cha: 1, hap: 3 } },
    { label: '짧게 형식적으로', text: '"국군 아저씨 감사합니다." 세 줄로 끝.', eff: {} },
  ] },
  { id: 'h_mid_first_fridge', title: '첫 냉장고', age: [30, 55], w: 0.04, once: true, era: [1968, 1982], head: true, cond: (s) => s.origin !== 'poor', text: '금성 냉장고가 들어온 날. 옆집 아주머니들이 구경을 왔다. 여름에 얼음을 얼릴 수 있다니!', choices: [
    { label: '동네에 얼음을 나눈다', cost: 1, text: '아이들이 얼음 깨 먹으러 줄을 섰다. 인심 좋은 집이 됐다.', eff: { fame: 1, hap: 5 } },
    { label: '고기를 재어 둔다', text: '명절 준비가 한결 쉬워졌다.', eff: { hap: 4 } },
  ] },
  { id: 'h_old_60_hwangap_photo', title: '영정 사진', age: [60, 90], w: 0.04, era: [1960, 1995], text: '사진관에서 "환갑 기념"이라며 영정 사진을 미리 찍어 두자고 한다. 옛 어른들은 다 그렇게 했다.', choices: [
    { label: '한복 입고 찍는다', cost: 1, text: '곱게 찍혔다. 자식들이 "오래 사셔야죠" 하며 웃었다.', eff: { hap: 2 } },
    { label: '재수 없다며 손사래', text: '"백 살까지 살 거다!"', eff: { hp: 1 } },
  ] },
  // ═══════ 1980~90년대 ═══════
  { id: 'h_kid_hoppang', title: '호빵과 연탄난로', age: [6, 12], w: 0.04, era: [1980, 1995], cond: kid, text: '겨울 교실, 연탄난로 위에 도시락이 층층이 쌓였다. 맨 아래 도시락은 늘 누룽지가 된다.', choices: [
    { label: '맨 위에 올린다', text: '', roll: ['cha', 45, [{ hap: 4 }, '친구들이 자리를 양보해 줬다.'], [{ hap: -2 }, '맨 아래 차지. 까맣게 탔다.']] },
    { label: '누룽지를 즐긴다', text: '바삭한 누룽지를 친구들과 나눠 먹었다.', eff: { cha: 1, hap: 3 } },
  ] },
  { id: 'h_teen_mixtape', title: '공테이프', age: [13, 19], w: 0.05, era: [1983, 2000], cond: kid, text: '좋아하는 사람에게 줄 노래 모음 테이프를 만든다. 라디오에서 DJ 멘트가 끝나기 전에 녹음 버튼을 눌러야 한다.', choices: [
    { label: '밤새 완벽하게 만든다', text: '카세트 케이스 속지에 곡 목록을 손글씨로 적었다.', eff: { cha: 1, hap: 5, study: -1 } },
    { label: '용기가 안 나서 내가 듣는다', text: '워크맨으로 백 번은 들었다.', eff: { hap: 2 } },
  ] },
  { id: 'h_young_hakbeon', title: '학번 MT와 운동권 선배', age: [19, 24], w: 0.04, era: [1980, 1995], student: true, text: '신입생 환영회. 선배가 "사회과학 공부 모임" 명단을 돌린다. 옆 동기는 과외 자리를 소개해 준다고 한다.', choices: [
    { label: '공부 모임에 들어간다', text: '밤새 토론했다. 세상이 다르게 보이기 시작했다.', eff: { int: 1, mor: 1 } },
    { label: '과외를 뛴다', text: '학비를 제 손으로 벌었다.', eff: { cash: 100 } },
  ] },
  { id: 'h_mid_stock_89', title: '객장의 아줌마들', age: [30, 60], w: 0.05, era: [1986, 1990], head: true, text: '증권사 객장에 장바구니 든 아주머니들까지 모였다. 주가가 1년에 두 배. 옆집은 집 판 돈을 넣었단다.', choices: [
    { label: '나도 넣는다', cost: 200, mark: { risk: 1 }, text: '', roll: ['luck', 45, [{ cash: 350, hap: 6 }, '1989년 꼭지 전에 팔았다!'], [{ cash: 60, hap: -10 }, '1990년 폭락. 반의반이 됐다.']] },
    { label: '적금이 최고다', text: '이자율 연 10%. 편하게 잤다.', eff: { mark: { thrift: 1 } } },
  ] },
  { id: 'h_old_senior_center', title: '노인정 화투', age: [62, 90], w: 0.04, era: [1980, 2010], text: '노인정에서 10원짜리 고스톱이 한창이다. 오늘은 {n}이(가) 끗발이 좋다.', choices: [
    { label: '크게 먹는다', text: '', roll: ['luck', 50, [{ hap: 6 }, '짜장면을 쐈다. 영웅이 됐다.'], [{ hap: -2 }, '막판에 피박을 썼다.']] },
    { label: '적당히 하고 일어난다', text: '"다음에 또 봐." 사이좋게 헤어졌다.', eff: { cha: 1 } },
  ] },
  // ═══════ 2000~2025 (근현대사) ═══════
  { id: 'h_kid_tamagotchi', title: '다마고치', age: [7, 13], w: 0.04, era: [1997, 2003], cond: kid, text: '학교에 다마고치를 몰래 가져갔다. 수업 중에 "삐삐삐" 밥 달라고 운다.', choices: [
    { label: '몰래 밥을 준다', text: '', roll: ['luck', 50, [{ hap: 4 }, '들키지 않았다. 다마고치가 무럭무럭 큰다.'], [{ hap: -4 }, '압수당했다. 방학 끝나고 돌려받았는데 이미…']] },
    { label: '엄마에게 맡긴다', text: '엄마가 하루 종일 똥을 치워 줬다.', eff: { aff: 3 } },
  ] },
  { id: 'h_teen_suneung_day', title: '수능 한파', age: [18, 19], w: 0.06, once: true, era: [1994, 2025], cond: kid, text: '수능 날 아침, 영하의 한파. 교문 앞에 후배들이 "대박!" 피켓을 들고 서 있다. {n}의 손이 떨린다.', choices: [
    { label: '엄마가 싸 준 도시락을 믿는다', text: '보온 도시락의 된장국이 떨림을 가라앉혔다.', eff: { study: 2, aff: 3 } },
    { label: '초콜릿으로 당 충전', text: '시험장에서 초콜릿을 까먹는 소리가 유난히 컸다.', eff: { study: 1 } },
  ] },
  { id: 'h_young_job_hunt', title: '자소서 100개', age: [24, 30], w: 0.05, era: [2008, 2025], cond: (_s, p) => !working(_s, p) && !p.flags.includes('student'), text: '서류 탈락 문자만 수십 통. "귀하의 역량은 뛰어나나…" 스터디 동기들도 지쳐 간다.', choices: [
    { label: '스펙을 더 쌓는다', cost: 100, text: '토익, 자격증, 인턴… 한 줄이 늘었다.', eff: { int: 1, hap: -3 } },
    { label: '작은 회사부터 들어간다', text: '"경력 쌓아서 옮기자." 첫 출근을 했다.', eff: { hap: 3 } },
  ] },
  { id: 'h_mid_honjok', title: '기러기 아빠', age: [38, 55], w: 0.04, era: [2000, 2015], head: true, cond: (s, p) => married(s, p) && s.origin !== 'poor', text: '아내와 아이를 조기 유학 보낸 동료가 혼자 컵라면을 먹는다. {n}도 권유를 받았다.', choices: [
    { label: '보내지 않는다', text: '저녁마다 가족이 둘러앉는다. 그게 공부다.', eff: { aff: 5, bond: 5 } },
    { label: '1년만 보내 본다', cost: 3000, text: '아이 영어는 늘었다. 빈집이 너무 조용했다.', eff: { bond: -6, study: 3 } },
  ] },
  { id: 'h_old_smartphone_class', title: '스마트폰 배우기', age: [65, 90], w: 0.05, era: [2012, 2025], text: '손주가 "할머니(할아버지), 카톡으로 사진 보낼게요" 하는데 방법을 모르겠다. 복지관에 스마트폰 교실이 열렸다.', choices: [
    { label: '복지관에 등록한다', text: '첫 사진을 가족 단톡방에 올렸다. 손가락이 떨렸다. 이모티콘도 배웠다.', eff: { int: 1, hap: 5, aff: 3 } },
    { label: '손주에게 배운다', text: '"또 까먹었어?" 손주가 다섯 번째 알려 줬다. 그래도 웃었다.', eff: { aff: 5 } },
  ] },
  // ═══════ 2025~2060 ═══════
  { id: 'now_kid_ai_pet', title: 'AI 반려로봇', age: [6, 12], w: 0.04, years: [2030, 2065], cond: kid, text: '반 친구들이 다 AI 반려로봇을 갖고 있다. {n}도 갖고 싶다고 조른다. 진짜 강아지냐, 로봇 강아지냐.', choices: [
    { label: '진짜 강아지를 입양한다', cost: 100, text: '산책, 배변 훈련… 아이가 책임감을 배웠다.', eff: { mor: 2, hap: 6 } },
    { label: '로봇 강아지를 사 준다', cost: 80, text: '말도 하고 숙제도 도와준다. 하지만 털은 없다.', eff: { int: 1, hap: 4 } },
    { label: '아직 이르다', text: '아이가 삐졌다. 대신 동물원에 갔다.', eff: { aff: -1 } },
  ] },
  { id: 'now_teen_esports_ai', title: 'AI랑 게임', age: [13, 19], w: 0.04, years: [2028, 2060], cond: kid, text: '{n}이(가) AI 코치와 게임 연습을 한다. 프로게이머 연습생 제의가 왔다.', choices: [
    { label: '1년만 해 본다', text: '', roll: ['int', 55, [{ fame: 1, hap: 6 }, '대회 본선에 올랐다!'], [{ study: -3, hap: -2 }, '성적만 떨어졌다. 공부로 돌아왔다.']] },
    { label: '취미로만 한다', text: '주말에만 한다고 약속했다.', eff: { study: 1 } },
  ] },
  { id: 'now_young_4day', title: '주 4일 근무', age: [24, 45], w: 0.04, years: [2032, 2070], cond: working, text: '회사가 주 4일 근무를 도입했다. 금요일을 어떻게 쓸까?', choices: [
    { label: '대학원을 다닌다', text: '금요일마다 강의실. 2년 뒤 학위를 땄다.', eff: { int: 2 } },
    { label: '가족과 보낸다', text: '금요일은 아이 등하교 날. 아이가 아빠(엄마)랑 더 친해졌다.', eff: { aff: 5, hap: 4 } },
    { label: '부업을 한다', text: '금요일 부업으로 월 수입이 늘었다.', eff: { cash: 500 } },
  ] },
  { id: 'now_mid_reskill', title: '중년 재교육', age: [40, 58], w: 0.05, years: [2030, 2070], cond: working, text: '회사가 "AI 전환 재교육"을 받으라고 한다. 안 받으면 다음 구조조정 명단 1순위라는 소문.', choices: [
    { label: '열심히 배운다', text: '', roll: ['int', 45, [{ int: 2, promo: 1 }, '팀에서 AI를 제일 잘 다루는 사람이 됐다.'], [{ hap: -4, int: 1 }, '따라가기 벅찼다. 그래도 버텼다.']] },
    { label: '이참에 다른 길을 찾는다', text: '평생 해 보고 싶던 목공을 배우기 시작했다.', eff: { hap: 5, str: 1 } },
  ] },
  { id: 'now_old_digital_will', title: '디지털 유산', age: [65, 100], w: 0.04, years: [2030, 2080], head: true, text: '평생 쓴 계정·사진·코인·AI 비서 기록… 떠난 뒤 이걸 누가 어떻게 가져갈까? 디지털 유산 정리 서비스가 생겼다.', choices: [
    { label: '가족에게 비밀번호 봉투를 남긴다', text: '사진 3만 장을 가족 앨범으로 정리했다.', eff: { aff: 4, mor: 1 } },
    { label: '다 지워 달라고 한다', text: '"흔적 없이 가련다." 조금 쓸쓸했다.', eff: { hap: -1 } },
  ] },
  { id: 'now_owner_solar', title: '지붕 태양광', age: [30, 80], w: 0.04, years: [2027, 2060], head: true, cond: owner, text: '우리 집 지붕에 태양광 패널을 달면 전기요금이 거의 0원이 된다. 보조금도 나온다.', choices: [
    { label: '단다', cost: 600, text: '여름에도 에어컨 걱정이 없다. 남는 전기는 판다.', eff: { cash: 900, hap: 3 } },
    { label: '미관이 별로다', text: '지붕은 그대로 두었다.' },
  ] },
  { id: 'now_renter_landlord_ai', title: 'AI 집주인', age: [22, 60], w: 0.04, years: [2032, 2070], cond: renter, text: '집주인이 법인 AI 관리 시스템으로 바뀌었다. 보일러 고장 신고에 "처리 예정입니다"만 3주째.', choices: [
    { label: '임대차 분쟁 조정 신청', text: '', roll: ['int', 45, [{ hap: 4 }, '일주일 만에 사람이 와서 고쳐 줬다.'], [{ hap: -3 }, '조정 대기만 두 달.']] },
    { label: '직접 고치고 영수증을 청구한다', cost: 30, text: '돈은 한참 뒤에 돌려받았다.', eff: { int: 1 } },
  ] },
  // ═══════ 2060~2120 ═══════
  { id: 'fx_kid_lunar_camp', title: '달 캠프', age: [9, 14], w: 0.04, years: [2070, 2150], cond: kid, text: '방학 달 캠프 모집. 저중력에서 뛰어놀고 달 흙으로 식물을 키운다. {n}이(가) 가고 싶어 한다.', choices: [
    { label: '보낸다', cost: 600, text: '달에서 키운 콩나물을 들고 돌아왔다. "달 흙도 흙이야!"', eff: { int: 2, hap: 8, flag: 'space_trip' } },
    { label: '지구 캠프로', cost: 30, text: '지리산 캠프. 별이 쏟아졌다. 저기가 달이구나.', eff: { str: 1, hap: 4 } },
  ] },
  { id: 'fx_teen_neural_first', title: '첫 뉴럴 칩', age: [16, 19], w: 0.04, years: [2055, 2120], cond: kid, text: '친구들이 성인식 선물로 뉴럴 칩을 받는다. {n}도 원한다. 부모 동의가 필요하다.', choices: [
    { label: '동의한다', cost: 800, text: '생각만으로 친구들과 대화한다. 가끔 멍하니 있다.', eff: { int: 2, hap: 5, flag: 'neural' } },
    { label: '스무 살에 네가 정해라', text: '"네 머리는 네 거야. 어른이 되면 결정해." 아이가 투덜대다 고개를 끄덕였다.', eff: { mor: 1, aff: -1 } },
  ] },
  { id: 'fx_young_basic_income_art', title: '기본소득으로 그림을', age: [22, 40], w: 0.04, years: [2046, 2120], text: '기본소득으로 먹고살 수는 있다. {n}은(는) 회사를 그만두고 평생 꿈이던 일을 해 볼까 고민한다.', choices: [
    { label: '꿈을 좇는다', text: '', roll: ['cha', 45, [{ hap: 10, fame: 1 }, '첫 전시가 가상 갤러리 인기 1위!'], [{ hap: 3 }, '아무도 몰라주지만 행복하다.']] },
    { label: '일을 계속한다', text: '기본소득은 전부 저축했다.', eff: { cash: 800 } },
  ] },
  { id: 'fx_mid_robot_boss', title: 'AI 상사', age: [35, 60], w: 0.04, years: [2060, 2130], cond: working, text: '새 팀장이 AI다. 공정하지만 인정사정없다. 오늘 {n}에게 "효율 72%" 평가가 떴다.', choices: [
    { label: '데이터로 반박한다', text: '', roll: ['int', 50, [{ promo: 1 }, 'AI가 평가를 수정하고 사과(?)했다.'], [{ hap: -4 }, '"반박 데이터 불충분."']] },
    { label: '사람 동료들과 뭉친다', text: '"AI가 모르는 건 우리 팀워크야." 팀 회식을 했다.', eff: { cha: 1, hap: 3 } },
  ] },
  { id: 'fx_old_second_career', title: '100세의 새 직업', age: [90, 130], w: 0.04, years: [2070, 2200], text: '{n}은(는) 아흔이 넘었지만 몸이 멀쩡하다. "은퇴는 두 번째 인생의 시작"이라며 새 일을 배워 볼까?', choices: [
    { label: '기억 설계사 학원에 등록한다', text: '평생의 경험이 최고의 무기였다. 손님들이 줄을 선다.', eff: { int: 1, hap: 8, cash: 300 } },
    { label: '손주들 돌보며 산다', text: '증손주의 증손주 기저귀를 갈았다.', eff: { aff: 5, hap: 5 } },
  ] },
  // ═══════ 2120~2200 ═══════
  { id: 'fx_kid_orbital_school', title: '궤도 학교 전학', age: [7, 15], w: 0.04, years: [2120, 2200], cond: kid, text: '{n}네 반에 궤도 도시에서 전학 온 아이가 있다. 지구 중력이 무거워 체육 시간마다 앉아 있다.', choices: [
    { label: '같이 쉬며 친구가 된다', text: '창밖 지구 사진을 보여 줬다. 둘도 없는 친구가 됐다.', eff: { cha: 2, mor: 1 } },
    { label: '"우주 촌놈"이라 놀린다', text: '선생님께 크게 혼났다. 나중에 사과했다.', eff: { mor: -1, hap: -2 } },
  ] },
  { id: 'fx_teen_mars_exchange', title: '화성 교환학생', age: [15, 19], w: 0.04, years: [2115, 2200], cond: kid, text: '화성 새터 고등학교와 교환학생 프로그램. 1년 동안 붉은 행성에서 산다.', choices: [
    { label: '보낸다', cost: 1500, text: '화성 사투리(?)를 배워 왔다. 시야가 태양계만큼 넓어졌다.', eff: { int: 2, cha: 1, flag: 'space_trip' } },
    { label: '지구에서 수능 준비', text: '역량 평가가 코앞이다.', eff: { study: 2 } },
  ] },
  { id: 'fx_young_hibernation_love', title: '동면에서 깬 연인', age: [22, 40], w: 0.03, years: [2130, 2200], text: '인공 동면 40년에서 깨어난 사람과 사랑에 빠졌다. 그 사람의 기억 속 세상은 40년 전에 멈춰 있다.', choices: [
    { label: '지금 세상을 하나씩 보여 준다', text: '"와, 이제 화성에 가족이 사는구나." 매일이 새로운 데이트.', eff: { hap: 8, cha: 1 } },
    { label: '너무 다르다', text: '시대의 벽이 컸다. 좋은 친구로 남았다.', eff: { hap: -2 } },
  ] },
  { id: 'fx_mid_titan_contract', title: '타이탄 계약', age: [35, 60], w: 0.04, years: [2140, 2200], cond: working, text: '타이탄 기지에서 {n}을(를) 5년 계약으로 스카우트한다. 연봉은 세 배, 가족 동반 가능.', choices: [
    { label: '가족과 함께 간다', text: '주황빛 하늘 아래 새 집. 아이들이 메탄 호수에서 스케이트를 탄다.', eff: { cash: 3000, hap: 5, flag: 'space_trip' } },
    { label: '지구에 남는다', text: '익숙한 파란 하늘이 좋다.', eff: { aff: 3 } },
  ] },
  { id: 'fx_old_last_wish_stars', title: '마지막 소원', age: [100, 200], w: 0.04, years: [2120, 2200], text: '{n}의 소원은 죽기 전에 토성 고리를 직접 보는 것이다. 몸이 버틸까?', choices: [
    { label: '가족이 모시고 간다', cost: 800, text: '창밖 고리가 반짝였다. "이제 됐다." 평생 가장 환한 웃음이었다.', eff: { hap: 15, flag: 'space_trip' } },
    { label: '홀로그램으로 보여 드린다', text: '방 안 가득 토성이 떴다. "진짜 같구나." 손을 뻗으셨다.', eff: { hap: 6 } },
  ] },
  // ═══════ 전쟁 중 (war.ts가 켜 둔 동안) ═══════
  { id: 'war_kid_shelter_school', title: '대피소 학교', age: [7, 15], w: 0.12, years: [2027, 2200], cond: (s, p) => kid(s, p) && s.war?.phase === 'war', text: '학교가 지하 대피소로 옮겼다. {n}은(는) 희미한 불빛 아래서 받아쓰기를 한다. 멀리서 쿵 소리가 난다.', choices: [
    { label: '노래를 불러 동생들을 달랜다', text: '대피소가 합창으로 가득 찼다. 선생님이 눈물을 훔쳤다.', eff: { cha: 2, mor: 2 } },
    { label: '공부에 집중한다', text: '"전쟁이 끝나면 의사가 될 거야."', eff: { study: 3 } },
  ] },
  { id: 'war_teen_volunteer', title: '학도 자원봉사', age: [15, 19], w: 0.12, years: [2027, 2200], cond: (s, p) => kid(s, p) && s.war?.phase === 'war', text: '학생들이 병원·배급소 자원봉사에 나선다. {n}도 가겠다고 한다.', choices: [
    { label: '허락한다', text: '부상병의 손을 잡아 주고 편지를 대신 써 줬다. 아이가 부쩍 어른이 됐다.', eff: { mor: 3, str: 1 } },
    { label: '집에 있게 한다', text: '"너까지 위험해지면 안 돼."', eff: { aff: -1 } },
  ] },
  { id: 'war_old_memory', title: '또 전쟁이라니', age: [70, 150], w: 0.12, years: [2027, 2200], cond: (s) => !!s.war, text: '{n}이(가) 창밖을 오래 본다. "우리 할아버지가 겪었다던 전쟁을, 내가 또 볼 줄은…"', choices: [
    { label: '손주들에게 평화 이야기를 들려준다', text: '"전쟁은 이긴 쪽도 진다." 아이들이 조용히 들었다.', eff: { mor: 2, aff: 4 } },
    { label: '라디오 뉴스만 듣는다', text: '밤마다 뉴스에 귀를 기울인다.', eff: { hap: -3 } },
  ] },
  { id: 'war_mid_black_market', title: '전시 암시장', age: [30, 60], w: 0.1, years: [2027, 2200], cond: (s) => s.war?.phase === 'war', head: true, text: '약품이 품귀다. 암시장 브로커가 {n}에게 "사재기해 두면 세 배로 판다"고 속삭인다.', choices: [
    { label: '거절하고 신고한다', text: '브로커가 붙잡혔다. 동네 약국에 약이 풀렸다.', eff: { mor: 3, fame: 1 } },
    { label: '한몫 잡는다', mark: { risk: 1 }, text: '', roll: ['luck', 45, [{ cash: 2000, mor: -3 }, '큰돈을 벌었다. 이웃 얼굴을 못 보겠다.'], [{ cash: -500, fame: -3, mor: -3 }, '단속에 걸렸다. 가문 이름이 신문에 났다.']] },
  ] },
];

/** 역사의 산증인: 1960년 전에 태어나 2030년을 맞은 사람 (근현대사) */
export const isWitness = (s: GameState, p: Person) => s.era === 'history' && s.year >= 2030 && p.birthYear < 1960;
