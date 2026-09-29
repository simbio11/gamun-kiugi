// 일상 이야기 추가 묶음: 요즘 한국의 생활 풍경. 나이대·처지(차·집·투자·자녀)에 따라 골고루.
import type { Story } from './stories';
import type { GameState, Person } from './types';
import { age, alive, parentsOf, spouseOf } from './people';

const working = (_s: GameState, p: Person) => !['none', 'parttime', 'pension'].includes(p.job) && !p.flags.includes('student');
const married = (s: GameState, p: Person) => !!spouseOf(s, p) && alive(spouseOf(s, p)!);
const hasKids = (s: GameState, p: Person) => p.childIds.some((id) => alive(s.people[id]) && age(s, s.people[id]) < 20);
const hasParents = (s: GameState, p: Person) => parentsOf(s, p).some(alive);
const owns = (kind: string) => (s: GameState, p: Person) => s.assets.some((a) => a.ownerId === p.id && a.kind === kind);
const hasCar = owns('vehicle');
const invests = (s: GameState, p: Person) => s.assets.some((a) => a.ownerId === p.id && (a.kind === 'stock' || a.kind === 'coin'));
const renting = (_s: GameState, p: Person) => p.home?.type === 'jeonse' || p.home?.type === 'wolse';
const homeowner = (_s: GameState, p: Person) => p.home?.type === 'own';

export const EXTRA_STORIES: Story[] = [
  // ───────── 어린 시절 (5~12) ─────────
  { id: 'x_kids_cafe', title: '키즈카페 생일파티', age: [5, 9], w: 0.03, text: '{n}의 반 친구가 키즈카페에서 생일파티를 한다. 우리 애 생일도 다음 달이다.', choices: [
    { label: '우리도 키즈카페에서', cost: 60, mark: { network: 1 }, text: '반 아이들이 다 왔다. {n이} 하루 종일 주인공이었다.', eff: { hap: 8, cha: 1 } },
    { label: '집에서 소박하게', mark: { family: 1, thrift: 1 }, text: '고깔모자 쓰고 할머니(할아버지)랑 케이크를 먹었다. 이것도 좋다.', eff: { hap: 4 } },
  ] },
  { id: 'x_youtube_kid', title: '유튜버가 될래', age: [7, 12], w: 0.03, text: '{n이} 장난감 리뷰 유튜브를 하겠다며 휴대폰을 세워 놓고 혼자 떠든다.', choices: [
    { label: '편집하는 법을 같이 배운다', mark: { art: 1, warmth: 1 }, text: '', roll: ['cha', 35, [{ cha: 3, hap: 6 }, '구독자 37명! 할머니(할아버지)가 1호 구독자다.'], [{ hap: 2 }, '조회수 4. 그래도 재밌단다.']] },
    { label: '얼굴 공개는 안 된다고 한다', mark: { honest: 1 }, text: '손만 나오는 영상으로 합의했다.', eff: { mor: 1 } },
  ] },
  { id: 'x_phone_first', title: '첫 휴대폰', age: [8, 12], w: 0.04, once: true, text: '반에서 휴대폰 없는 애가 {n}뿐이라고 한다.', choices: [
    { label: '키즈폰을 사 준다', cost: 30, text: '위치 추적 앱까지 깔았다. {n이} 신나서 가족에게 이모티콘을 보낸다.', eff: { hap: 6 } },
    { label: '최신 스마트폰', cost: 120, mark: { spend: 1 }, text: '단톡방 알림이 밤새 울린다.', eff: { hap: 9, study: -2 } },
    { label: '중학교 가서 사 주기로', mark: { study: 1 }, text: '대신 주말에 가족 휴대폰으로 친구와 통화하게 해 줬다.', eff: { hap: -4, study: 1 } },
  ] },
  { id: 'x_kiosk_kid', title: '혼자 주문', age: [6, 10], w: 0.02, text: '패스트푸드점 키오스크 앞에서 {n이} "내가 할래!" 한다.', choices: [
    { label: '맡겨 본다', mark: { warmth: 1 }, text: '', roll: ['int', 20, [{ int: 1, hap: 5 }, '세트 메뉴에 음료 변경까지 해냈다. 뒤에 선 어르신이 박수를 쳤다.'], [{ hap: 1 }, '감자튀김이 세 개 나왔다. 그래도 맛있게 먹었다.']] },
  ] },
  { id: 'x_hakwon_bus', title: '학원 버스', age: [8, 12], w: 0.03, text: '{n이} 학원 버스에서 잠들어 종점까지 갔다. 기사님 전화가 왔다.', choices: [
    { label: '데리러 가며 꼭 안아 준다', mark: { warmth: 1 }, text: '"많이 피곤했구나." 그날은 학원을 하나 쉬게 했다.', eff: { hap: 4, aff: 3 } },
    { label: '학원을 하나 줄인다', mark: { family: 1 }, text: '저녁을 같이 먹는 날이 하루 늘었다.', eff: { hap: 6, study: -1 } },
  ] },
  { id: 'x_science_fair', title: '과학의 날', age: [8, 12], w: 0.03, text: '과학의 날 대회에 {n이} 물로켓을 쏘겠다고 한다.', choices: [
    { label: '주말 내내 같이 만든다', mark: { study: 1, warmth: 1 }, text: '', roll: ['int', 35, [{ int: 3, hap: 7 }, '운동장 끝까지 날아갔다! 금상.'], [{ hap: -2, int: 1 }, '발사대에서 물만 뿜었다. 옷이 다 젖었다.']] },
    { label: '알아서 하게 둔다', text: '', roll: ['int', 45, [{ int: 2, mor: 1 }, '혼자 만든 로켓으로 동상. 뿌듯해한다.'], [{ hap: -1 }, '참가상을 받았다.']] },
  ] },
  { id: 'x_grandparents_farm', title: '시골 할머니(할아버지) 댁', age: [5, 11], w: 0.03, cond: (s, p) => parentsOf(s, p).some((q) => parentsOf(s, q).some(alive)), text: '방학이라 {n이} 시골에 일주일 다녀오겠다고 한다.', choices: [
    { label: '보낸다', mark: { family: 1, filial: 1 }, text: '까맣게 타서 돌아왔다. 옥수수 따는 법과 사투리를 배워 왔다.', eff: { hap: 7, hp: 1 } },
    { label: '학원 때문에 안 된다', mark: { study: 1 }, text: '전화 너머 목소리가 서운해 보였다.', eff: { study: 1, hap: -3 } },
  ] },
  { id: 'x_magic_trick', title: '마술 쇼', age: [6, 11], w: 0.02, text: '{n이} 가족 앞에서 카드 마술을 선보이겠다며 거실에 의자를 줄 세웠다.', choices: [
    { label: '온 가족이 관객이 된다', mark: { warmth: 1, art: 1 }, text: '', roll: ['cha', 25, [{ cha: 2, hap: 6 }, '"우와!" 진짜로 놀랐다. 앵콜까지 했다.'], [{ hap: 3 }, '카드가 소매에서 우수수. 다 같이 웃었다.']] },
  ] },
  { id: 'x_lost_mart', title: '마트 미아', age: [5, 8], w: 0.02, once: true, text: '대형마트에서 {n이} 사라졌다! 심장이 철렁한다.', choices: [
    { label: '안내 방송을 부탁한다', text: '장난감 코너에서 울고 있는 {n을} 찾았다. 둘 다 한참 울었다.', eff: { aff: 4 } },
    { label: '미리 가르친 대로 기다린다', mark: { honest: 1 }, text: '"엄마(아빠) 잃어버리면 계산대 직원에게!" 약속대로 계산대에 서 있었다. 대견하다.', eff: { mor: 3 } },
  ] },

  // ───────── 학창 시절 (13~19) ─────────
  { id: 'x_mbti', title: 'MBTI', age: [13, 25], w: 0.03, text: '{n이} 성격 유형 검사 결과를 내밀며 "이게 딱 나야!"라고 한다. (인물 창의 성향에서 볼 수 있다)', choices: [
    { label: '같이 해 본다', mark: { warmth: 1 }, text: '온 가족 유형을 맞혀 보다 한바탕 웃었다. 아빠는 끝까지 인정 안 했다.', eff: { hap: 4, aff: 2 } },
    { label: '혈액형 같은 거라고 한다', text: '"또 꼰대 소리 하네." 방문이 닫혔다.', eff: { aff: -2 } },
  ] },
  { id: 'x_idol_concert', title: '콘서트 티켓팅', age: [13, 22], w: 0.03, text: '{n이} 좋아하는 아이돌 콘서트 티켓팅이 오늘 저녁 8시다. PC방 가겠다고 한다.', choices: [
    { label: '가족 총동원 광클', mark: { warmth: 1 }, text: '', roll: ['luck', 30, [{ hap: 12 }, '온 가족 중 할머니(할아버지) 폰이 성공! 전설이 됐다.'], [{ hap: -5 }, '대기 번호 38,000번. 다 같이 허탈하게 웃었다.']] },
    { label: '공부나 하라고 한다', mark: { hurt: 1 }, text: '밤새 이불 속에서 휴대폰 불빛이 새어 나왔다.', eff: { aff: -3 } },
  ] },
  { id: 'x_part_time_teen', title: '편의점 알바', age: [17, 22], w: 0.03, text: '{n이} 방학 때 편의점 야간 알바를 하겠다고 한다.', choices: [
    { label: '경험이니 해 보라고', mark: { thrift: 1 }, text: '', roll: ['str', 35, [{ cash: 150, mor: 2 }, '첫 월급으로 부모님 내복을 사 왔다.'], [{ hp: -2, cash: 80 }, '밤낮이 바뀌어 한 달 만에 그만뒀다.']] },
    { label: '그 시간에 공부해라', mark: { study: 1 }, text: '용돈을 조금 올려 줬다.', eff: { study: 1, cash: -30 } },
  ] },
  { id: 'x_school_trip', title: '수학여행', age: [15, 18], w: 0.03, text: '{n}의 수학여행 장소가 제주도로 정해졌다. 옷을 새로 사고 싶단다.', choices: [
    { label: '새 옷을 사 준다', cost: 40, text: '단체 사진 속 {n이} 제일 밝게 웃고 있다.', eff: { hap: 6, cha: 1 } },
    { label: '있는 옷으로 가라고', mark: { thrift: 1 }, text: '"다들 새 옷 입었더라." 조금 서운해했다.', eff: { hap: 1 } },
  ] },
  { id: 'x_selfharm_worry', title: '말이 없어졌다', age: [13, 18], w: 0.02, text: '요즘 {n이} 밥도 잘 안 먹고 방에서 나오지 않는다. 담임에게서 연락이 왔다.', choices: [
    { label: '상담 센터에 같이 간다', cost: 30, mark: { warmth: 2 }, text: '처음엔 말이 없던 {n이} 세 번째 상담에서 울음을 터뜨렸다. 조금씩 나아지고 있다.', eff: { hap: 6, aff: 5 } },
    { label: '사춘기라고 넘긴다', mark: { hurt: 1 }, text: '', roll: ['mor', 45, [{ hap: 1 }, '다행히 몇 달 뒤 스스로 털고 일어났다.'], [{ hap: -8, hp: -2 }, '마음의 병이 깊어졌다.']] },
  ] },
  { id: 'x_debate', title: '토론 대회', age: [14, 18], w: 0.02, text: '{n이} 교내 토론 대회에 나간다. 주제는 "AI가 교사를 대체할 수 있는가".', choices: [
    { label: '저녁마다 반론 연습 상대가 된다', mark: { study: 1, warmth: 1 }, text: '', roll: ['int', 45, [{ int: 2, cha: 2 }, '결승에서 이겼다! 생활기록부에 한 줄이 늘었다.'], [{ cha: 1 }, '8강 탈락. 그래도 말하는 게 늘었다.']] },
  ] },
  { id: 'x_gym_teen', title: '헬스 입문', age: [16, 22], w: 0.03, text: '{n이} 갑자기 닭가슴살을 사 달라고 한다. 헬스를 시작했단다.', choices: [
    { label: '프로틴까지 사 준다', cost: 20, mark: { exercise: 1, sport: 1 }, text: '어깨가 넓어졌다. 자신감도 같이 붙었다.', eff: { str: 3, cha: 1, hap: 3 } },
    { label: '작심삼일이라며 웃는다', text: '', roll: ['mor', 40, [{ str: 2 }, '보란 듯이 6개월째 다닌다.'], [{}, '2주 만에 닭가슴살이 냉동실에 쌓였다.']] },
  ] },
  { id: 'x_cheating_ring', title: '시험 족보', age: [15, 23], w: 0.02, text: '{n}의 친구가 선배에게서 받은 "족보"를 돌린다며 {n}에게도 보냈다.', choices: [
    { label: '보지 말라고 한다', mark: { honest: 2 }, text: '', roll: ['int', 45, [{ mor: 3, study: 1 }, '제 실력으로 본 시험, 성적도 괜찮았다.'], [{ mor: 2, study: -1 }, '점수는 조금 밀렸지만 떳떳하다.']] },
    { label: '다들 보는데 뭐', mark: { cheat: 1 }, text: '', roll: ['luck', 70, [{ study: 2 }, '점수가 올랐다. 찜찜하다.'], [{ mor: -3, hap: -6, study: -3 }, '부정행위로 걸렸다. 그 과목 0점.']] },
  ] },
  { id: 'x_bike_trip', title: '국토 종주', age: [17, 25], w: 0.02, text: '{n이} 친구들과 자전거로 서울에서 부산까지 가겠다고 한다.', choices: [
    { label: '응원하고 보내 준다', cost: 50, mark: { sport: 1 }, text: '', roll: ['str', 40, [{ str: 3, mor: 2, hap: 10 }, '633km 완주! 인증 수첩에 도장이 가득하다.'], [{ hp: -2, hap: 2 }, '대구에서 무릎이 나가 기차를 탔다. 그래도 추억이다.']] },
    { label: '위험하다고 말린다', text: '', eff: { hap: -3, aff: -2 } },
  ] },

  // ───────── 청년 (20~34) ─────────
  { id: 'x_dangn', title: '중고거래', age: [20, 60], w: 0.03, text: '{n이} 안 쓰는 물건을 중고거래 앱에 올렸다. "네고 되나요?" 알림이 쏟아진다.', choices: [
    { label: '쿨거래한다', mark: { thrift: 1 }, text: '', roll: ['luck', 70, [{ cash: 40, hap: 3 }, '문고리 거래 성공. 쌓인 짐이 줄었다.'], [{ hap: -3 }, '약속 장소에 아무도 안 왔다. "죄송해요 ㅠ" 한 줄.']] },
    { label: '나눔으로 올린다', mark: { kind: 1 }, text: '받아 간 학생이 쿠키를 두고 갔다.', eff: { mor: 2, hap: 3 } },
  ] },
  { id: 'x_running_crew', title: '러닝 크루', age: [20, 45], w: 0.03, text: '{n이} 퇴근 후 한강 러닝 크루에 들어가 볼까 한다.', choices: [
    { label: '가입한다', cost: 30, mark: { exercise: 1, network: 1 }, text: '', roll: ['str', 30, [{ str: 2, hp: 2, cha: 1, hap: 5 }, '첫 10km 완주 인증샷에 좋아요가 쏟아졌다.'], [{ hp: 1, hap: 1 }, '페이스를 못 따라가 뒤에서 걸었다. 그래도 공기는 좋다.']] },
    { label: '혼자 뛴다', mark: { exercise: 1 }, text: '이어폰 끼고 혼자 달리는 게 편하다.', eff: { hp: 2 } },
  ] },
  { id: 'x_omakase', title: '오마카세', age: [22, 40], w: 0.02, text: '{n}의 친구들이 요즘 오마카세가 유행이라며 1인 25만 원짜리 예약을 잡았다.', choices: [
    { label: '간다', cost: 25, mark: { spend: 1 }, text: '한 점 한 점이 예술이었다. 카드 명세서도 예술이었다.', eff: { hap: 6 } },
    { label: '다음에 가자고 한다', mark: { thrift: 1 }, text: '대신 동네 초밥집에서 배부르게 먹었다.', eff: { hap: 2 } },
  ] },
  { id: 'x_jeonse_scam', title: '전세 사기 뉴스', age: [22, 45], w: 0.03, cond: renting, text: '뉴스에 빌라 전세 사기 피해자가 쏟아진다. {n}의 집주인도 연락이 뜸하다.', choices: [
    { label: '전세보증보험에 든다', cost: 30, mark: { honest: 1 }, text: '보증료를 내고 나니 잠이 온다.', eff: { hap: 3 } },
    { label: '등기부등본만 떼어 본다', text: '', roll: ['luck', 85, [{}, '근저당이 없었다. 한숨 돌렸다.'], [{ hap: -10, cash: -500 }, '집이 경매에 넘어가 있었다. 소송 비용이 들었다.']] },
  ] },
  { id: 'x_quiet_quit', title: '조용한 퇴사', age: [24, 40], w: 0.03, cond: working, text: '{n이} "딱 월급만큼만 일하기로 했다"고 한다. 야근도 회식도 안 간다.', choices: [
    { label: '그것도 방법이라고 한다', mark: { family: 1 }, text: '저녁이 있는 삶이 생겼다. 대신 승진 명단에서 빠졌다.', eff: { hap: 7, hp: 2 } },
    { label: '지금 열심히 해야 한다고', mark: { network: 1 }, text: '', roll: ['mor', 45, [{ cha: 2 }, '다시 마음을 다잡았다. 팀장이 알아봐 준다.'], [{ hap: -5, hp: -2 }, '억지로 버티다 번아웃이 왔다.']] },
  ] },
  { id: 'x_side_hustle', title: 'N잡', age: [23, 45], w: 0.03, cond: working, text: '{n이} 퇴근 후 스마트스토어를 열어 볼까 한다.', choices: [
    { label: '해 본다', cost: 100, mark: { risk: 1 }, text: '', roll: ['cha', 45, [{ cash: 600, cha: 2, hap: 5 }, '핸드메이드 키링이 입소문을 탔다. 월 50만 원 부수입!'], [{ cash: -50, hap: -3 }, '재고만 방 한가득 남았다.']] },
    { label: '본업에 집중한다', text: '자격증 공부를 시작했다.', eff: { int: 1 } },
  ] },
  { id: 'x_wedding_invite', title: '청첩장 모임', age: [26, 38], w: 0.03, text: '이번 달에만 청첩장이 네 장이다. {n}의 통장이 울고 있다.', choices: [
    { label: '다 간다, 축의금 10만 원씩', cost: 40, mark: { network: 1 }, text: '결혼식 뷔페 순례를 했다. 인맥은 지켰다.', eff: { cha: 1, hap: -1 } },
    { label: '친한 친구만 간다', mark: { thrift: 1 }, text: '안 간 쪽에서 서운하다는 말이 돌았다.', eff: { hap: 1 } },
  ] },
  { id: 'x_studio_rent', title: '관리비 폭탄', age: [22, 35], w: 0.03, cond: renting, text: '{n}의 원룸 관리비가 월세만큼 나왔다. 겨울 난방비다.', choices: [
    { label: '전기장판으로 버틴다', mark: { thrift: 1 }, text: '코끝이 시리지만 통장은 지켰다.', eff: { hp: -1, cash: 20 } },
    { label: '따뜻하게 산다', text: '따뜻한 게 최고다.', eff: { cash: -40, hap: 2 } },
  ] },
  { id: 'x_blind_friend', title: '친구의 소개팅 부탁', age: [25, 36], w: 0.02, text: '친구가 {n}에게 회사 동료를 소개해 달라고 조른다.', choices: [
    { label: '주선한다', mark: { network: 1 }, text: '', roll: ['luck', 40, [{ cha: 1, hap: 4 }, '둘이 사귄다! 결혼식 사회는 {n}의 몫이 됐다.'], [{ hap: -2 }, '양쪽에서 원망을 들었다.']] },
    { label: '정중히 거절한다', text: '괜한 부담은 사양이다.', eff: {} },
  ] },
  { id: 'x_ai_tool', title: '업무 자동화', age: [22, 55], w: 0.03, cond: working, text: '회사에 AI 도구가 들어왔다. {n}의 업무 절반이 자동화될 수도 있다는 말이 돈다.', choices: [
    { label: '먼저 배워서 쓴다', mark: { study: 1 }, text: '', roll: ['int', 45, [{ int: 3, cha: 1 }, '팀에서 제일 잘 다루게 됐다. 사내 강사로 뽑혔다.'], [{ int: 1 }, '배우는 데 시간이 걸린다. 그래도 조금씩 는다.']] },
    { label: '하던 대로 한다', text: '', roll: ['luck', 60, [{}, '아직은 괜찮다.'], [{ hap: -6 }, '부서 개편 명단에 이름이 올랐다. 불안하다.']] },
  ] },
  { id: 'x_first_salary_parents', title: '첫 월급 선물', age: [22, 32], w: 0.03, once: true, cond: (s, p) => working(s, p) && hasParents(s, p), text: '{n}의 첫 월급날이다. 부모님께 뭘 해 드릴까?', choices: [
    { label: '빨간 내복과 용돈 봉투', cost: 50, mark: { filial: 2 }, text: '엄마가 봉투를 한참 쓰다듬었다. 아빠는 괜히 헛기침을 했다.', eff: { hap: 6, aff: 6 } },
    { label: '가족 외식을 쏜다', cost: 30, mark: { family: 1 }, text: '"우리 애가 사는 밥"이라며 사진을 찍으셨다.', eff: { hap: 5, aff: 4 } },
    { label: '일단 적금부터', mark: { thrift: 1 }, text: '부모님은 "잘했다"고 했다. 조금 서운한 눈치였다.', eff: { cash: 100 } },
  ] },

  // ───────── 차 ─────────
  { id: 'x_car_road_trip', title: '즉흥 드라이브', age: [20, 75], w: 0.04, cond: hasCar, text: '날씨가 너무 좋다. {n이} 차 키를 만지작거린다.', choices: [
    { label: '동해로 달린다', cost: 20, mark: { family: 1 }, text: '새벽 바다에서 해 뜨는 걸 봤다. 휴게소 호두과자가 달았다.', eff: { hap: 8, hp: 1 } },
    { label: '동네 한 바퀴만', text: '창문을 내리고 좋아하는 노래를 틀었다.', eff: { hap: 3 } },
  ] },
  { id: 'x_car_scratch', title: '문콕', age: [20, 80], w: 0.03, cond: hasCar, text: '아침에 보니 {n}의 차 문에 누가 콕 찍어 놓고 갔다.', choices: [
    { label: '블랙박스를 뒤진다', text: '', roll: ['luck', 50, [{ hap: 2 }, '찾았다. 상대가 사과하고 수리비를 줬다.'], [{ hap: -3, cash: -30 }, '사각지대였다. 덴트 비용은 내 몫.']] },
    { label: '그냥 탄다', mark: { thrift: 1 }, text: '차는 굴러가면 그만이다.', eff: {} },
  ] },
  { id: 'x_car_parking_ticket', title: '주차 딱지', age: [20, 80], w: 0.03, cond: hasCar, text: '잠깐 세워 둔 사이 {n}의 차에 주정차 위반 딱지가 붙었다.', choices: [
    { label: '억울하지만 낸다', text: '과태료 4만 원. 비싼 커피를 마신 셈이다.', eff: { cash: -4, hap: -1 } },
    { label: '이의 신청을 한다', text: '', roll: ['int', 40, [{ hap: 3 }, '비상등 켠 블랙박스 영상이 인정됐다.'], [{ cash: -4, hap: -2 }, '기각. 시간만 썼다.']] },
  ] },
  { id: 'x_car_kid_drive', title: '운전 연수', age: [19, 25], w: 0.03, cond: (s, p) => parentsOf(s, p).some((q) => alive(q) && s.assets.some((a) => a.ownerId === q.id && a.kind === 'vehicle')), text: '면허를 딴 {n이} 집 차로 연습하고 싶다고 한다.', choices: [
    { label: '조수석에서 가르친다', mark: { warmth: 1 }, text: '', roll: ['int', 30, [{ hap: 5, aff: 3 }, '"브레이크! 브레이크!" 소리를 지르며 달린 끝에 주차까지 해냈다.'], [{ aff: -3, cash: -50 }, '연석에 휠을 긁었다. 둘 다 말이 없었다.']] },
    { label: '연수 학원에 보낸다', cost: 30, text: '가족의 평화를 지켰다.', eff: { hap: 2 } },
  ] },
  { id: 'x_car_recall', title: '리콜 통지', age: [20, 80], w: 0.02, cond: hasCar, text: '{n}의 차에 리콜 통지서가 날아왔다. 브레이크 부품 결함이란다.', choices: [
    { label: '바로 서비스센터에', text: '무상 수리를 받고 나니 마음이 놓인다.', eff: { hap: 1 } },
    { label: '나중에 한다', text: '', roll: ['luck', 85, [{}, '별일 없었다.'], [{ hp: -4, cash: -200 }, '빗길에 미끄러졌다. 크게 다치진 않았지만 차가 망가졌다.']] },
  ] },

  // ───────── 집 ─────────
  { id: 'x_interior', title: '셀프 인테리어', age: [28, 65], w: 0.03, cond: homeowner, text: '{n이} 유튜브를 보더니 주방 타일을 직접 바꾸겠다고 한다.', choices: [
    { label: '업체를 부른다', cost: 300, text: '깔끔하다. 돈이 좋긴 좋다.', eff: { hap: 4 } },
    { label: '직접 해 본다', cost: 60, mark: { art: 1 }, text: '', roll: ['str', 40, [{ hap: 7, cha: 1 }, '제법 그럴싸하다. 집들이 때 자랑했다.'], [{ hap: -4, cash: -150 }, '줄눈이 삐뚤빼뚤. 결국 업체를 불렀다.']] },
  ] },
  { id: 'x_apt_meeting', title: '입주민 회의', age: [30, 80], w: 0.03, cond: homeowner, text: '아파트에 재도색·엘리베이터 교체 안건이 올라왔다. 세대당 분담금이 크다.', choices: [
    { label: '찬성 (집값을 위해)', cost: 150, mark: { network: 1 }, text: '단지가 새것처럼 반짝인다. 호가가 조금 올랐다는 소문.', eff: { hap: 3 } },
    { label: '반대표를 모은다', text: '', roll: ['cha', 45, [{ fame: 1 }, '안건이 부결됐다. 단톡방 스타가 됐다.'], [{ hap: -3 }, '가결됐다. 분담금은 똑같이 낸다.']] },
  ] },
  { id: 'x_moving_day', title: '이사 전날', age: [22, 70], w: 0.02, cond: renting, text: '{n}의 집주인이 만기에 실거주하겠다며 비워 달라고 한다.', choices: [
    { label: '순순히 알아본다', text: '발품 끝에 비슷한 집을 구했다. 이삿짐센터 비용이 아프다.', eff: { cash: -150, hap: -2 } },
    { label: '계약갱신청구권을 쓴다', mark: { honest: 1 }, text: '', roll: ['int', 40, [{ hap: 2 }, '법대로 2년을 더 살게 됐다.'], [{ hap: -5, cash: -150 }, '실거주 사유가 인정돼 결국 나왔다.']] },
  ] },

  // ───────── 투자 ─────────
  { id: 'x_stock_group', title: '주식 단톡방', age: [22, 70], w: 0.03, cond: invests, text: '{n}의 회사 동기 단톡방이 오늘도 빨갛다. "이번엔 진짜다" 종목이 올라왔다.', choices: [
    { label: '조금 따라 산다', cost: 300, mark: { risk: 1 }, text: '', roll: ['luck', 40, [{ cash: 600, hap: 5 }, '두 배! 단톡방에 인증샷을 올렸다.'], [{ hap: -5 }, '반토막. 단톡방이 조용해졌다.']] },
    { label: '알림을 끈다', mark: { thrift: 1 }, text: '장기 투자는 원래 지루한 법이다.', eff: { hap: 1 } },
  ] },
  { id: 'x_dividend_day', title: '배당금 입금', age: [22, 90], w: 0.03, cond: owns('stock'), text: '"배당금이 입금되었습니다." {n}의 휴대폰에 알림이 떴다.', choices: [
    { label: '재투자한다', mark: { thrift: 1 }, text: '눈덩이는 이렇게 굴러간다.', eff: { hap: 2 } },
    { label: '가족에게 치킨을 쏜다', mark: { family: 1 }, text: '"주식이 사 준 치킨"이 제일 맛있다.', eff: { hap: 5 } },
  ] },
  { id: 'x_coin_hack', title: '거래소 점검', age: [20, 70], w: 0.02, cond: owns('coin'), text: '코인이 급락하는데 하필 거래소가 "긴급 점검 중"이다. {n}의 손이 떨린다.', choices: [
    { label: '휴대폰을 덮는다', mark: { thrift: 1 }, text: '다음 날 보니 반은 회복했다. 모르는 게 약이었다.', eff: { hap: 1 } },
    { label: '밤새 새로고침한다', mark: { risk: 1 }, text: '한숨도 못 잤다.', eff: { hp: -2, hap: -4 } },
  ] },

  // ───────── 중년 (35~59) ─────────
  { id: 'x_golf', title: '골프 입문', age: [35, 60], w: 0.03, cond: working, text: '거래처와 골프 약속이 잡혔다. {n}은 골프채를 잡아 본 적도 없다.', choices: [
    { label: '레슨을 끊는다', cost: 200, mark: { network: 2 }, text: '', roll: ['str', 40, [{ cha: 2, hap: 4 }, '첫 라운딩에서 버디! 거래처 사장님과 형님 동생이 됐다.'], [{ hap: -2 }, '공보다 잔디를 더 많이 팠다. 그래도 분위기는 좋았다.']] },
    { label: '스크린골프로 버틴다', cost: 30, text: '실전은 역시 다르다. 그래도 망신은 면했다.', eff: { hap: 1 } },
  ] },
  { id: 'x_camping', title: '캠핑 장비', age: [30, 55], w: 0.03, cond: hasKids, text: '{n이} 캠핑 영상을 보더니 장비를 사자고 한다. 텐트만 백만 원이다.', choices: [
    { label: '장비를 다 산다', cost: 400, mark: { family: 2, spend: 1 }, text: '밤하늘 아래 아이들과 마시멜로를 구웠다. 이 맛에 산다.', eff: { hap: 9 } },
    { label: '글램핑으로 체험만', cost: 50, mark: { family: 1 }, text: '"다음엔 진짜 캠핑 가자!" 아이들이 들떴다.', eff: { hap: 5 } },
  ] },
  { id: 'x_midlife_bike', title: '로드바이크', age: [38, 58], w: 0.02, text: '{n이} 쫄쫄이를 입고 500만 원짜리 로드바이크를 끌고 들어왔다.', choices: [
    { label: '멋지다고 해 준다', cost: 500, mark: { exercise: 1, spend: 1 }, text: '주말마다 북한강을 달린다. 뱃살이 들어갔다.', eff: { str: 2, hp: 3, hap: 6 } },
    { label: '당장 환불하라고', text: '', eff: { hap: -4, bond: -3 } },
  ] },
  { id: 'x_kid_smartphone_fight', title: '스마트폰 전쟁', age: [35, 55], w: 0.03, cond: hasKids, text: '아이들이 밥 먹을 때도 휴대폰만 본다. {n이} 한마디 하려다 참는다.', choices: [
    { label: '"폰 없는 저녁" 규칙을 만든다', mark: { family: 1 }, text: '처음엔 투덜댔지만, 이제 저녁 식탁에서 수다가 오간다.', eff: { hap: 4 } },
    { label: '나도 폰을 본다', text: '식탁 위에 휴대폰 네 대가 빛난다.', eff: { hap: -1 } },
  ] },
  { id: 'x_parents_kiosk', title: '부모님과 키오스크', age: [35, 60], w: 0.03, cond: hasParents, text: '{n}의 부모님이 식당 키오스크 앞에서 한참 서 있다 그냥 나오셨단다.', choices: [
    { label: '주말에 연습시켜 드린다', mark: { filial: 1, warmth: 1 }, text: '"이제 커피도 혼자 시켜." 자랑 전화가 왔다.', eff: { hap: 4, mor: 1 } },
    { label: '배달 앱으로 대신 시켜 드린다', mark: { filial: 1 }, text: '"우리 애가 시켜 준 거야." 경비 아저씨에게 자랑하셨단다.', eff: { hap: 3 } },
  ] },
  { id: 'x_health_app', title: '만보 걷기', age: [40, 75], w: 0.03, text: '건강검진에서 "운동 부족" 소견이 나왔다. {n이} 만보기 앱을 깔았다.', choices: [
    { label: '매일 걷는다', mark: { exercise: 1 }, text: '', roll: ['mor', 35, [{ hp: 4, hap: 3 }, '한 달째 만보 달성. 혈압이 내려갔다.'], [{ hp: 1 }, '비 오는 날부터 흐지부지됐다.']] },
    { label: '포인트만 챙긴다', text: '걸음 수 대신 포인트 이벤트만 열심히 한다.', eff: { cash: 2 } },
  ] },
  { id: 'x_reunion_rich', title: '잘나가는 동창', age: [35, 60], w: 0.03, text: '동창회에서 {n}의 옛 짝이 외제차 키를 테이블에 올려놓는다.', choices: [
    { label: '진심으로 축하한다', mark: { kind: 1 }, text: '"너 그대로다." 오랜만에 속 깊은 이야기를 나눴다.', eff: { hap: 3, mor: 1 } },
    { label: '괜히 비교된다', mark: { hurt: 1 }, text: '집에 오는 길이 유난히 길었다.', eff: { hap: -5 } },
  ] },
  { id: 'x_promotion_dinner', title: '승진 턱', age: [30, 55], w: 0.02, cond: (_s, p) => working(_s, p) && p.jobLevel >= 2, text: '{n이} 팀장이 됐다. 팀원들이 "턱!"을 외친다.', choices: [
    { label: '소고기 쏜다', cost: 80, mark: { network: 1 }, text: '팀 분위기가 한층 좋아졌다.', eff: { cha: 2, hap: 4 } },
    { label: '커피로 대신한다', mark: { thrift: 1 }, text: '"팀장님 짠돌이" 별명이 생겼다.', eff: { hap: 1 } },
  ] },
  { id: 'x_marriage_counsel', title: '각방', age: [35, 65], w: 0.02, cond: married, text: '코골이 때문에 {n}의 부부가 각방을 쓴 지 석 달째다.', choices: [
    { label: '수면 클리닉에 간다', cost: 60, mark: { family: 1 }, text: '수면무호흡이었다. 치료 후 다시 한방을 쓴다.', eff: { hp: 3, bond: 5 } },
    { label: '각방이 편하다', text: '잠은 잘 오는데, 대화가 줄었다.', eff: { hap: 2, bond: -4 } },
  ] },

  // ───────── 노년 (60+) ─────────
  { id: 'x_smartphone_senior', title: '영상 통화', age: [60, 95], w: 0.03, text: '손주가 {n}에게 영상 통화 거는 법을 알려 준다.', choices: [
    { label: '열심히 배운다', mark: { family: 1 }, text: '이제 매일 저녁 손주 얼굴을 본다. 화면 가득 콧구멍이지만.', eff: { hap: 7 } },
    { label: '전화가 편하다', text: '"목소리면 충분하다." 그래도 사진은 받아 본다.', eff: { hap: 2 } },
  ] },
  { id: 'x_senior_class', title: '복지관 수업', age: [62, 90], w: 0.03, text: '동네 복지관에 {n}이 배우고 싶던 서예·스마트폰·노래교실이 열렸다.', choices: [
    { label: '노래교실', mark: { art: 1, network: 1 }, text: '트로트 한 곡을 완창했다. 새 친구들이 생겼다.', eff: { hap: 8, cha: 1 } },
    { label: '서예', mark: { study: 1 }, text: '먹 가는 소리에 마음이 차분해진다. 가훈을 써서 걸었다.', eff: { hap: 5, mor: 1 } },
    { label: '스마트폰 교실', text: '이제 사진에 필터도 넣는다.', eff: { int: 1, hap: 4 } },
  ] },
  { id: 'x_scam_call', title: '"엄마, 나 폰 고장 났어"', age: [58, 95], w: 0.03, text: '{n}에게 자녀를 사칭한 문자가 왔다. "급하게 상품권 좀 사서 보내 줘."', choices: [
    { label: '자녀에게 직접 전화한다', mark: { honest: 1 }, text: '"나 멀쩡해!" 스미싱이었다. 가족 단톡방에 경고를 돌렸다.', eff: { int: 1 } },
    { label: '급하다니 보낸다', text: '', roll: ['luck', 15, [{}, '송금 직전 은행 직원이 막아 줬다.'], [{ cash: -300, hap: -8 }, '보이스피싱이었다. 경찰서에서 한참을 울었다.']] },
  ] },
  { id: 'x_senior_travel', title: '크루즈 여행', age: [60, 80], w: 0.02, text: '{n}의 친구들이 은퇴 기념 크루즈 여행을 가자고 한다.', choices: [
    { label: '간다', cost: 600, mark: { family: 1 }, text: '지중해 석양 앞에서 사진을 수백 장 찍었다.', eff: { hap: 12, hp: 1 } },
    { label: '국내 온천으로', cost: 80, text: '뜨끈한 물에 몸을 담그니 이것도 신선놀음이다.', eff: { hap: 5, hp: 2 } },
  ] },
  { id: 'x_old_photos', title: '앨범 정리', age: [60, 95], w: 0.03, text: '{n이} 장롱 깊숙한 곳에서 빛바랜 앨범을 꺼냈다.', choices: [
    { label: '자식들을 불러 같이 본다', mark: { family: 2 }, text: '"이게 나야?" 웃음과 눈물이 번갈아 터졌다. 사진은 스캔해서 가족 앨범에 올렸다.', eff: { hap: 8 } },
    { label: '혼자 한 장씩 넘긴다', text: '젊은 날의 얼굴들이 말을 걸어온다.', eff: { hap: 3, mor: 1 } },
  ] },
  { id: 'x_garden', title: '텃밭', age: [55, 90], w: 0.03, text: '{n이} 주말농장 텃밭을 분양받았다. 상추·고추·방울토마토를 심는다.', choices: [
    { label: '정성껏 키운다', mark: { exercise: 1 }, text: '', roll: ['luck', 60, [{ hp: 3, hap: 7 }, '상추가 너무 잘 자라 온 동네에 나눠 줬다.'], [{ hap: -2 }, '장마에 다 녹아 버렸다. 내년을 기약한다.']] },
  ] },
  { id: 'x_hearing_aid', title: '보청기', age: [65, 95], w: 0.03, text: '가족들이 {n}에게 자꾸 "네?"를 되묻는다고 한다. 보청기를 해 볼까?', choices: [
    { label: '맞춘다', cost: 250, text: '빗소리가 이렇게 컸나. 손주 목소리가 또렷하게 들린다.', eff: { hap: 6 } },
    { label: '아직 괜찮다', text: 'TV 볼륨이 40을 넘었다.', eff: { hap: -2 } },
  ] },
  { id: 'x_last_wishes', title: '버킷리스트', age: [70, 95], w: 0.02, once: true, text: '{n이} 공책에 "죽기 전에 하고 싶은 일"을 적기 시작했다.', choices: [
    { label: '하나씩 같이 이룬다', mark: { family: 2, filial: 1 }, text: '첫 번째는 "가족사진 찍기"였다. 사진관에서 3대가 웃었다.', eff: { hap: 10 } },
    { label: '조용히 지켜본다', text: '공책은 머리맡에 놓여 있다.', eff: { hap: 3 } },
  ] },

  // ───────── 고증 묶음: 2025년 통계 기반 ─────────
  // 연말정산: 2024년 귀속 근로자 70.5%가 환급, 추가 납부자는 1인 평균 117만 원 (국세청 통계 보도)
  { id: 'x_yearend', title: '13월의 월급', age: [23, 64], w: 0.05, cooldown: 4, cond: working, text: '연말정산 시즌이다. {n}의 회사에서 "간소화 자료를 제출하라"는 메일이 왔다.', choices: [
    { label: '영수증까지 꼼꼼히 챙긴다', mark: { thrift: 1 }, text: '', roll: ['int', 30, [{ cash: 120, hap: 4 }, '의료비·월세·기부금까지 다 챙겼다. 환급 120만 원! 진짜 13월의 월급이다.'], [{ cash: 40 }, '열심히 했는데 40만 원. 그래도 돌려받았다.']] },
    { label: '간소화 자료만 대충 낸다', text: '', roll: ['luck', 70, [{ cash: 30 }, '30만 원 환급. 나쁘지 않다.'], [{ cash: -117, hap: -5 }, '추가 납부 117만 원… 13월의 세금이었다.']] },
  ] },
  // 65세 이상 치과 임플란트: 평생 2개까지 건강보험, 본인부담 30%
  { id: 'x_implant', title: '임플란트', age: [65, 95], w: 0.04, once: true, text: '{n}의 어금니가 흔들린다. 치과에서 임플란트를 권한다. 만 65세가 넘어 평생 2개까지는 건강보험이 된다.', choices: [
    { label: '보험으로 2개 (본인부담 30%)', cost: 80, text: '개당 40만 원 남짓. 갈비를 다시 씹는다!', eff: { hp: 2, hap: 6 } },
    { label: '비보험까지 4개 한 번에', cost: 380, text: '보험 2개 + 비보험 2개(개당 150만 원). 새 이로 웃는 사진을 찍었다.', eff: { hp: 3, hap: 9, cha: 1 } },
    { label: '틀니로 버틴다', text: '딱딱한 건 이제 못 먹는다.', eff: { hap: -3 } },
  ] },
  // 반려동물 치료비: 최근 2년간 평균 약 103만 원, 2년 새 두 배 (KB 2025 반려동물 보고서)
  { id: 'x_pet_vet', title: '동물병원', age: [25, 90], w: 0.05, head: true, cond: (_s, p) => p.flags.includes('pet'), text: '복실이가 다리를 절뚝인다. 동물병원에서 슬개골 탈구라며 수술을 권한다.', choices: [
    { label: '수술시킨다', cost: 250, mark: { kind: 1 }, text: '양쪽 다리 수술에 250만 원. 펫보험을 들어 둘 걸 그랬다. 그래도 다시 뛰어논다.', eff: { hap: 4 } },
    { label: '약과 관리로 지켜본다', cost: 30, text: '', roll: ['luck', 50, [{ hap: 1 }, '다행히 더 나빠지진 않았다.'], [{ hap: -5 }, '결국 1년 뒤 수술했다. 병을 키웠다.']] },
  ] },
  // 운전면허 학원비: 1종 보통 전국 평균 77만 원 (2025)
  { id: 'x_kid_license', title: '면허 따고 싶어', age: [18, 21], w: 0.05, once: true, cond: (s, p) => p.id !== s.headId && !p.flags.includes('license'), text: '수능이 끝난 {n이} 운전면허 학원에 등록하고 싶다고 한다. 학원비가 80만 원 가까이 한다.', choices: [
    { label: '학원비를 대 준다', cost: 77, mark: { warmth: 1 }, text: '', roll: ['int', 30, [{ hap: 6, flag: 'license' }, '한 번에 합격! 면허증을 흔들며 들어왔다.'], [{ hap: 2, flag: 'license' }, '도로주행 재시험 끝에 합격. 재시험비는 자기 용돈으로 냈다.']] },
    { label: '알바해서 네가 내라', mark: { thrift: 1 }, text: '석 달 편의점 알바 끝에 제 돈으로 땄다. 면허증이 더 소중하단다.', eff: { mor: 2, flag: 'license' } },
  ] },
  { id: 'x_dol', title: '첫돌', age: [1, 1], w: 0.3, once: true, cond: (s, p) => [p.fatherId, p.motherId].includes(s.headId), text: '{n}의 첫 생일이다. 돌잔치를 어떻게 할까?', choices: [
    { label: '가족끼리 식사 + 돌상 대여', cost: 100, mark: { family: 1 }, text: '양가 조부모님만 모였다. {n이} 돌잡이로 청진기를 집었다. 다들 박수를 쳤다.', eff: { hap: 5 } },
    { label: '연회장 빌려 돌잔치', cost: 600, mark: { network: 1 }, text: '하객 80명. 성장 동영상에 할머니(할아버지)가 눈물을 훔쳤다. 돌반지가 서랍 한가득.', eff: { hap: 6, cash: 300 } },
    { label: '사진만 예쁘게 찍는다', cost: 40, text: '스튜디오 한 컷이 거실 벽에 걸렸다.', eff: { hap: 3 } },
  ] },

  // ───────── 사회·계절 ─────────
  { id: 'x_heatwave', title: '폭염', age: [20, 95], w: 0.03, text: '40도 가까운 폭염이다. {n}의 집 에어컨이 덜덜거린다.', choices: [
    { label: '새 에어컨을 산다', cost: 200, text: '시원한 바람 아래 온 가족이 모였다.', eff: { hap: 5 } },
    { label: '은행·도서관으로 피서', mark: { thrift: 1 }, text: '무더위 쉼터에서 책을 세 권 읽었다.', eff: { int: 1, hap: 1 } },
  ] },
  { id: 'x_fine_dust', title: '미세먼지', age: [5, 95], w: 0.02, text: '미세먼지 "매우 나쁨". {n이} 기침을 한다.', choices: [
    { label: '공기청정기를 들인다', cost: 60, text: '필터가 금세 까맣게 변했다. 기침이 멎었다.', eff: { hp: 2 } },
    { label: '마스크로 버틴다', text: '', roll: ['hp', 35, [{}, '별일 없이 지나갔다.'], [{ hp: -2 }, '기관지염으로 일주일 고생했다.']] },
  ] },
  { id: 'x_election_volunteer', title: '투표 날', age: [19, 95], w: 0.02, text: '선거 날이다. {n}은 투표소에 갈까, 놀러 갈까?', choices: [
    { label: '투표하고 인증샷', mark: { honest: 1 }, text: '손등에 도장 인증샷을 올렸다.', eff: { mor: 1 } },
    { label: '놀러 간다', text: '고속도로가 텅 비었다.', eff: { hap: 3 } },
  ] },
  { id: 'x_typhoon', title: '태풍', age: [20, 95], w: 0.02, text: '초강력 태풍이 올라온다. {n}의 집 창문이 흔들린다.', choices: [
    { label: '창문에 테이프·단단히 대비', text: '밤새 바람이 울었지만 무사히 지나갔다.', eff: { hap: 1 } },
    { label: '설마 하고 잔다', text: '', roll: ['luck', 70, [{}, '다행히 비껴갔다.'], [{ cash: -150, hap: -4 }, '베란다 유리가 깨졌다.']] },
  ] },
  { id: 'x_volunteer_briquette', title: '연탄 봉사', age: [16, 70], w: 0.02, text: '겨울, 달동네 연탄 나르기 봉사에 {n}을 부르는 연락이 왔다.', choices: [
    { label: '간다', mark: { kind: 2 }, text: '얼굴에 검댕이 묻었다. 할머니가 쥐여 준 귤이 제일 달았다.', eff: { mor: 3, hap: 5 } },
    { label: '대신 후원금을 보낸다', cost: 10, mark: { kind: 1 }, text: '연탄 200장이 전달됐다.', eff: { mor: 1 } },
  ] },
  { id: 'x_lost_wallet', title: '주운 지갑', age: [10, 90], w: 0.02, text: '{n이} 길에서 현금 50만 원이 든 지갑을 주웠다.', choices: [
    { label: '경찰서에 맡긴다', mark: { honest: 2 }, text: '주인이 사례금을 주려 했지만 사양했다. 감사 편지가 왔다.', eff: { mor: 3 } },
    { label: '현금만 챙긴다', mark: { cheat: 1 }, text: '', roll: ['luck', 60, [{ cash: 50 }, '아무도 모른다. …정말?'], [{ fame: -2, hap: -8 }, 'CCTV에 찍혔다. 점유이탈물횡령으로 입건됐다.']] },
  ] },
];
