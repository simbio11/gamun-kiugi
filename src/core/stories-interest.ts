// 관심사별 이야기: 어릴 때 쌓은 관심 분야가 있어야 일어난다. 고르는 대로 관심이 더 깊어지거나 다른 길로 튼다.
import type { Story } from './stories';
import type { GameState, Person } from './types';
import { markOf } from './people';

const likes = (cat: string, n = 2) => (_s: GameState, p: Person) => markOf(p, 'i:' + cat) >= n;

export const INTEREST_STORIES: Story[] = [
  // ───────── IT·과학 ─────────
  { id: 'i_tech_game', title: '직접 만든 게임', age: [10, 18], w: 0.05, cond: likes('tech'), text: '{n이} 만든 게임을 친구들이 서로 하겠다고 줄을 선다. 앱스토어에 올리고 싶단다.', choices: [
    { label: '개발자 계정을 만들어 준다', cost: 15, mark: { 'i:tech': 2 }, text: '', roll: ['int', 50, [{ int: 2, cash: 50, fame: 1 }, '다운로드 1만! 광고 수익으로 첫 돈을 벌었다.'], [{ int: 1 }, '다운로드 37회. 그래도 리뷰 하나가 "재밌어요"였다.']] },
    { label: '코딩 대회에 내 본다', mark: { 'i:tech': 1, study: 1 }, text: '', roll: ['int', 55, [{ int: 2, fame: 1, flag: 'olympiad' }, '정보올림피아드 입상! 대학 입시에 한 줄.'], [{ hap: -2 }, '예선 탈락. 다른 애들은 괴물이었다.']] },
    { label: '게임은 그만하고 공부해라', mark: { study: 1, hurt: 1 }, text: '노트북이 거실로 옮겨졌다.', eff: { aff: -4, study: 2 } },
  ] },
  { id: 'i_tech_hack', title: '해킹 사고', age: [13, 25], w: 0.03, cond: likes('tech', 4), text: '{n이} 학교 홈페이지 보안 허점을 찾아냈다. 시험 문제 폴더가 열린다.', choices: [
    { label: '학교에 제보하게 한다', mark: { honest: 2, 'i:tech': 1 }, text: '교육청에서 감사장을 받았다. 화이트 해커 캠프에 초대됐다.', eff: { mor: 3, fame: 1 } },
    { label: '못 본 척하게 한다', text: '찜찜하지만 넘어갔다.', eff: {} },
    { label: '살짝 들여다본다', mark: { cheat: 2 }, text: '', roll: ['luck', 30, [{ study: 3 }, '아무도 몰랐다. …'], [{ hap: -15, fame: -2, flag: 'repeat_year' }, '접속 기록이 남았다. 정학 처분.']] },
  ] },
  { id: 'i_tech_internship', title: 'IT 기업 인턴', age: [20, 27], w: 0.05, cond: likes('tech'), text: '어릴 때부터 코딩을 한 {n}에게 IT 기업 인턴 제안이 왔다. 학기 중이다.', choices: [
    { label: '휴학하고 간다', mark: { intern: 2, 'i:tech': 1 }, text: '', roll: ['int', 45, [{ int: 2, flag: 'intern_offer', cash: 1200 }, '정규직 전환 제안까지 받았다.'], [{ cash: 1000 }, '실무를 배웠다. 전환은 안 됐다.']] },
    { label: '방학 때만', mark: { intern: 1 }, text: '짧지만 이력서 한 줄.', eff: { cash: 400 } },
    { label: '학업이 먼저', mark: { study: 1 }, text: '학점을 챙겼다.', eff: {} },
  ] },

  // ───────── 의료 ─────────
  { id: 'i_med_pet', title: '다친 새', age: [7, 15], w: 0.04, cond: likes('medical'), text: '{n이} 날개 다친 참새를 주워 왔다. 상자에 넣고 밤새 지켜본다.', choices: [
    { label: '야생동물구조센터에 데려간다', mark: { kind: 1, 'i:medical': 2 }, text: '수의사 선생님이 치료 과정을 보여 줬다. {n}의 눈이 반짝였다.', eff: { mor: 2, hap: 4 } },
    { label: '직접 돌보게 한다', mark: { 'i:medical': 1 }, text: '', roll: ['luck', 50, [{ hap: 8, mor: 2 }, '일주일 뒤 참새가 날아갔다!'], [{ hap: -6 }, '다음 날 아침 움직이지 않았다. 마당에 묻어 줬다.']] },
    { label: '제자리에 두고 오라고', text: '"엄마(아빠)는 너무해." 한참 울었다.', eff: { aff: -3 } },
  ] },
  { id: 'i_med_hospital_volunteer', title: '병원 봉사', age: [14, 22], w: 0.04, cond: likes('medical'), text: '{n이} 방학 동안 대학병원 봉사를 하고 싶다고 한다.', choices: [
    { label: '소아 병동으로', mark: { kind: 2, 'i:medical': 1 }, text: '아이들에게 책을 읽어 줬다. 의사가 되겠다는 마음이 굳어졌다.', eff: { mor: 3, hap: 3 } },
    { label: '응급실 안내 봉사로', mark: { 'i:medical': 2 }, text: '정신없는 응급실. 피를 봐도 무섭지 않았다.', eff: { str: 1, mor: 2 } },
    { label: '공부나 하라고', mark: { study: 1 }, text: '봉사 대신 학원.', eff: { study: 1, hap: -2 } },
  ] },

  // ───────── 법·사무 ─────────
  { id: 'i_legal_unfair', title: '억울한 친구', age: [10, 18], w: 0.04, cond: likes('legal'), text: '{n}의 친구가 누명을 쓰고 벌을 받게 생겼다. {n이} 변호하겠다고 나선다.', choices: [
    { label: '증거를 같이 모은다', mark: { honest: 1, 'i:legal': 2 }, text: '', roll: ['int', 45, [{ int: 1, cha: 2, fame: 1 }, 'CCTV를 찾아 누명을 벗겼다. 학교에서 "꼬마 변호사"로 불린다.'], [{ hap: -3 }, '증거가 부족했다. 그래도 끝까지 편을 들었다.']] },
    { label: '선생님께 말씀드리게 한다', mark: { 'i:legal': 1 }, text: '선생님이 다시 조사했다.', eff: { mor: 1 } },
    { label: '끼어들지 말라고', text: '"친구를 모른 척하라고?" 실망한 눈치다.', eff: { aff: -2 } },
  ] },
  { id: 'i_office_stock', title: '어린이 주식 계좌', age: [10, 18], w: 0.04, cond: likes('office'), text: '{n이} 용돈으로 주식을 사 보고 싶다고 한다. 좋아하는 게임 회사 주식이란다.', choices: [
    { label: '계좌를 만들어 준다 (10만 원)', cost: 10, mark: { 'i:office': 2, thrift: 1 }, text: '', roll: ['luck', 50, [{ cash: 20, int: 1 }, '두 배가 됐다! 기업 공시를 읽기 시작했다.'], [{ int: 1 }, '반토막. "장기 투자야." 제법 의젓하다.']] },
    { label: '모의투자 대회에 내 본다', mark: { 'i:office': 1 }, text: '', roll: ['int', 50, [{ fame: 1, int: 1 }, '청소년 모의투자 대회 입상!'], [{}, '수익률 -12%. 공부가 됐다.']] },
    { label: '아직 이르다', text: '저금통으로 만족.', eff: {} },
  ] },

  // ───────── 공공·안전 ─────────
  { id: 'i_public_rescue', title: '작은 영웅', age: [9, 18], w: 0.03, cond: likes('public'), text: '하굣길, {n이} 쓰러진 할아버지를 발견했다. 소방서 견학 때 배운 게 생각난다.', choices: [
    { label: '119 신고 후 심폐소생술', mark: { kind: 2, 'i:public': 2 }, text: '', roll: ['mor', 40, [{ fame: 2, mor: 3 }, '할아버지가 살았다! 소방서에서 "하트세이버" 배지를 받았다.'], [{ mor: 2 }, '구급대가 왔을 땐 이미 늦었다. 그래도 최선을 다했다.']] },
    { label: '어른을 부른다', mark: { 'i:public': 1 }, text: '근처 가게 사장님이 달려와 도왔다.', eff: { mor: 1 } },
  ] },
  { id: 'i_public_camp', title: '해병대·경찰 캠프', age: [14, 19], w: 0.04, cond: likes('public'), text: '방학에 청소년 해병대(경찰) 캠프가 열린다. {n이} 가고 싶어 한다.', choices: [
    { label: '보낸다', cost: 30, mark: { 'i:public': 2, sport: 1 }, text: '갯벌에서 구르고 왔다. 경례가 몸에 뱄다.', eff: { str: 2, mor: 2 } },
    { label: '대신 봉사활동', mark: { kind: 1 }, text: '구청 봉사로 방학을 보냈다.', eff: { mor: 1 } },
    { label: '위험하다', text: '"친구들은 다 가는데."', eff: { hap: -3 } },
  ] },

  // ───────── 교육 ─────────
  { id: 'i_edu_tutor', title: '공부방 선생님', age: [15, 25], w: 0.04, cond: likes('edu'), text: '동네 지역아동센터에서 {n}에게 아이들 공부를 봐 달라고 부탁했다.', choices: [
    { label: '매주 간다', mark: { kind: 2, 'i:edu': 2 }, text: '한 아이가 받아쓰기 100점을 받아 왔다. {n이} 더 기뻐했다.', eff: { mor: 3, cha: 1 } },
    { label: '유료 과외로 돌린다', mark: { 'i:edu': 1, thrift: 1 }, text: '용돈을 제법 벌었다.', eff: { cash: 200 } },
    { label: '바빠서 거절', text: '마음 한편이 불편하다.', eff: {} },
  ] },

  // ───────── 서비스·요식 ─────────
  { id: 'i_service_cook_contest', title: '요리 대회', age: [10, 19], w: 0.04, cond: likes('service'), text: '어린이(청소년) 요리 경연대회가 열린다. {n이} 떡볶이 레시피를 개발하겠단다.', choices: [
    { label: '재료를 대 준다', cost: 20, mark: { 'i:service': 2, art: 1 }, text: '', roll: ['cha', 45, [{ cha: 2, fame: 1, hap: 10 }, '대상! 심사위원 셰프가 명함을 줬다.'], [{ hap: -2 }, '떡이 딱딱했다. 그래도 가족은 맛있게 먹었다.']] },
    { label: '가족 식당 놀이로', mark: { 'i:service': 1, family: 1 }, text: '주말마다 {n이} 차린 "우리집 식당"이 문을 연다.', eff: { hap: 6 } },
    { label: '공부나 하라고', mark: { hurt: 1 }, text: '앞치마가 서랍으로 들어갔다.', eff: { aff: -3 } },
  ] },
  { id: 'i_service_parttime', title: '카페 알바의 재능', age: [17, 26], w: 0.04, cond: likes('service'), text: '{n}의 라떼아트를 보고 카페 사장님이 바리스타 자격증을 권한다.', choices: [
    { label: '자격증을 딴다', cost: 50, mark: { 'i:service': 2, cert: 1 }, text: '바리스타 2급 합격. 매니저로 승격됐다.', eff: { cha: 1, cash: 200 } },
    { label: '해외 카페에서 일해 본다 (워홀)', cost: 300, mark: { 'i:service': 1, network: 1 }, text: '멜버른 카페에서 1년. 영어와 커피를 배웠다.', eff: { cha: 3, hap: 8 } },
    { label: '알바는 알바일 뿐', text: '학업에 집중하기로 했다.', eff: {} },
  ] },

  // ───────── 기술·생산 ─────────
  { id: 'i_trade_fix', title: '동네 수리왕', age: [11, 20], w: 0.04, cond: likes('trade'), text: '{n이} 이웃집 고장 난 선풍기를 고쳐 줬다는 소문이 났다. 부탁이 줄을 선다.', choices: [
    { label: '용돈 받고 고쳐 주게 둔다', mark: { 'i:trade': 2, thrift: 1 }, text: '공구 가방이 생겼다. 손님(?)이 늘었다.', eff: { cash: 30, int: 1 } },
    { label: '마이스터고를 알아본다', mark: { 'i:trade': 1 }, text: '설명회에 다녀왔다. {n}의 눈빛이 진지하다.', eff: { mor: 1 } },
    { label: '다칠라 말린다', text: '드라이버를 압수했다.', eff: { hap: -3 } },
  ] },
  { id: 'i_trade_skills', title: '기능경기대회', age: [15, 22], w: 0.04, cond: likes('trade', 3), text: '{n이} 전국기능경기대회 지역 예선에 나가게 됐다. 종목은 전기 용접.', choices: [
    { label: '방과 후 맹연습', mark: { 'i:trade': 2, cert: 1 }, text: '', roll: ['str', 50, [{ fame: 2, str: 2, flag: 'intern_offer' }, '금메달! 대기업에서 채용 약속을 받았다.'], [{ str: 1 }, '동메달. 그래도 이력서에 한 줄.']] },
    { label: '편하게 나간다', text: '', roll: ['str', 60, [{ fame: 1 }, '입상했다!'], [{}, '참가에 의의.']] },
  ] },

  // ───────── 운송 ─────────
  { id: 'i_transport_airshow', title: '에어쇼', age: [7, 17], w: 0.04, cond: likes('transport'), text: '공군 에어쇼가 열린다. {n이} 한 달 전부터 달력에 표시해 뒀다.', choices: [
    { label: '온 가족이 간다', mark: { 'i:transport': 2, family: 1 }, text: '블랙이글스가 하늘에 태극 문양을 그렸다. {n이} 조종사가 되겠단다.', eff: { hap: 10 } },
    { label: '비행 시뮬레이터 체험도', cost: 10, mark: { 'i:transport': 2 }, text: '시뮬레이터로 착륙 성공! 교관이 소질 있다고 했다.', eff: { int: 1, hap: 6 } },
    { label: '너무 멀다', text: 'TV 중계로 봤다.', eff: { hap: -2 } },
  ] },
  { id: 'i_transport_license', title: '조종사의 꿈', age: [18, 28], w: 0.03, cond: likes('transport', 4), text: '어릴 때부터 하늘을 좋아한 {n}. 항공사 조종 훈련생 모집 공고가 떴다. 훈련비는 1억 원이 넘는다.', choices: [
    { label: '대출 받아 도전한다', mark: { 'i:transport': 2, risk: 1 }, text: '', roll: ['int', 55, [{ flag: 'flight_school', int: 2 }, '선발됐다! 비행 훈련이 시작된다. (첫 직장에서 파일럿 도전 가능)'], [{ hap: -8 }, '적성 검사에서 떨어졌다.']] },
    { label: '공군 조종 장학생으로', mark: { 'i:transport': 1, 'i:public': 1 }, text: '', roll: ['str', 55, [{ flag: 'flight_school', str: 2 }, '합격! 의무 복무 뒤 민항기로 갈 수 있다.'], [{ hap: -4 }, '신체검사 시력에서 떨어졌다.']] },
    { label: '다른 길을 찾는다', text: '하늘은 여행으로만.', eff: {} },
  ] },

  // ───────── 미디어 ─────────
  { id: 'i_media_channel', title: '구독자 1만', age: [12, 25], w: 0.04, cond: likes('media'), text: '{n}의 유튜브 채널이 구독자 1만을 넘었다! 광고 문의가 왔다.', choices: [
    { label: '광고를 받는다', mark: { 'i:media': 2 }, text: '첫 광고비 50만 원. 협찬 표기도 꼼꼼히 했다.', eff: { cash: 50, cha: 1, fame: 1 } },
    { label: '얼굴 공개는 아직', mark: { 'i:media': 1 }, text: '목소리와 손만 나오는 채널로 조용히 큰다.', eff: {} },
    { label: '공부에 방해된다며 쉬게 한다', mark: { hurt: 1, study: 1 }, text: '채널이 멈췄다. 댓글에 "돌아와요"가 쌓인다.', eff: { aff: -5, study: 2 } },
  ] },
  { id: 'i_media_contest', title: '웹툰 공모전', age: [14, 28], w: 0.04, cond: likes('media', 3), text: '{n이} 1년 동안 그린 웹툰을 플랫폼 공모전에 냈다.', choices: [
    { label: '결과를 기다린다', mark: { 'i:media': 2 }, text: '', roll: ['cha', 60, [{ fame: 3, cash: 1000, hap: 12 }, '우수상! 정식 연재 계약 제안이 왔다.'], [{ hap: -5 }, '낙선. 댓글 하나가 "계속 그려 주세요"였다.']] },
    { label: '다음 작품을 바로 시작한다', mark: { 'i:media': 1, art: 1 }, text: '결과와 상관없이 그린다. 손이 빨라졌다.', eff: { cha: 1 } },
  ] },

  // ───────── 스포츠 ─────────
  { id: 'i_sport_selection', title: '유소년 대표 선발', age: [11, 17], w: 0.04, cond: likes('sport'), text: '{n}에게 시 유소년 대표 선발전 연락이 왔다. 주말마다 합숙 훈련이다.', choices: [
    { label: '도전한다', cost: 50, mark: { 'i:sport': 2, sport: 1 }, text: '', roll: ['str', 55, [{ str: 3, fame: 1 }, '선발! 유니폼에 시 이름이 새겨졌다.'], [{ str: 1, hap: -3 }, '최종 명단에서 빠졌다. 내년에 다시.']] },
    { label: '취미로만', text: '즐겁게 공을 찬다.', eff: { hap: 3 } },
    { label: '운동은 그만', mark: { study: 1 }, text: '축구화가 신발장 깊이 들어갔다.', eff: { hap: -5 } },
  ] },
  { id: 'i_sport_injury', title: '성장판 부상', age: [12, 18], w: 0.02, cond: likes('sport', 4), text: '훈련 중 {n}의 무릎이 다쳤다. 성장판 근처라 조심해야 한단다.', choices: [
    { label: '1년 쉬며 재활', cost: 200, text: '천천히 회복했다. 조급함을 배웠다.', eff: { hp: 1, hap: -4 } },
    { label: '대회가 코앞이다, 뛴다', mark: { risk: 1 }, text: '', roll: ['luck', 40, [{ fame: 1 }, '버텼다. 팀이 우승했다.'], [{ hp: -6, str: -3 }, '부상이 커졌다. 선수 생활이 위태롭다.']] },
  ] },

  // ───────── 장사·사업 ─────────
  { id: 'i_biz_market', title: '플리마켓 사장님', age: [10, 18], w: 0.04, cond: likes('biz'), text: '{n이} 학교 축제 플리마켓에서 팔찌 가게를 열겠단다.', choices: [
    { label: '재료비를 투자한다', cost: 10, mark: { 'i:biz': 2 }, text: '', roll: ['cha', 40, [{ cash: 40, cha: 2 }, '완판! 원가의 네 배를 남겼다. "다음엔 인터넷으로 팔래."'], [{ hap: -2 }, '반도 못 팔았다. 가격을 너무 높게 불렀다.']] },
    { label: '제 돈으로 하게 한다', mark: { 'i:biz': 1, thrift: 1 }, text: '저금통을 깼다. 본전은 건졌다.', eff: { mor: 1 } },
  ] },
  { id: 'i_biz_startup_young', title: '대학생 창업', age: [20, 28], w: 0.04, cond: likes('biz', 3), text: '{n이} 친구들과 대학 창업 동아리에서 만든 아이템으로 정부 지원금에 도전한다.', choices: [
    { label: '휴학하고 올인', mark: { 'i:biz': 2, risk: 1 }, text: '', roll: ['int', 55, [{ cash: 3000, fame: 2, int: 1 }, '예비창업패키지 선정! 지원금 5천만 원으로 법인을 세웠다.'], [{ hap: -6 }, '떨어졌다. 팀이 흩어졌다.']] },
    { label: '학업과 병행', mark: { 'i:biz': 1 }, text: '천천히 키워 가기로 했다.', eff: { int: 1 } },
    { label: '취업이 먼저', text: '아이템은 서랍 속으로.', eff: {} },
  ] },

  // ───────── 농림어업 ─────────
  { id: 'i_farm_4h', title: '청소년 농업 동아리', age: [12, 19], w: 0.04, cond: likes('farm'), text: '{n이} 학교 4-H 동아리에서 딸기 스마트팜을 맡게 됐다.', choices: [
    { label: '주말에도 돌보게 한다', mark: { 'i:farm': 2 }, text: '', roll: ['int', 40, [{ int: 1, cash: 30, fame: 1 }, '수확한 딸기를 학교 축제에서 팔았다. 완판!'], [{ hap: -2 }, '온도 조절을 놓쳐 반이 시들었다. 배운 게 많다.']] },
    { label: '농업 마이스터고를 알아본다', mark: { 'i:farm': 1 }, text: '"청년 농부"라는 말이 멋있어 보인단다.', eff: { mor: 1 } },
  ] },
  { id: 'i_farm_return', title: '청년 귀농', age: [25, 40], w: 0.03, cond: likes('farm', 3), text: '어릴 때부터 흙을 좋아한 {n}. 도시 생활에 지쳐 청년 귀농 지원 사업을 알아본다.', choices: [
    { label: '귀농한다', mark: { 'i:farm': 2 }, text: '', roll: ['int', 45, [{ cash: 2000, hap: 10 }, '청년 창업농 지원금을 받아 스마트팜을 열었다.'], [{ cash: -1500, hap: -6 }, '첫해 농사를 망쳤다. 그래도 버텨 본다.']] },
    { label: '주말농장으로 만족', text: '주말마다 흙을 만진다. 그것으로 충분하다.', eff: { hap: 4 } },
    { label: '도시에 남는다', text: '꿈은 은퇴 후로 미뤘다.', eff: {} },
  ] },
];
