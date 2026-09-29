// 일상 이야기 추가분: 어린 시절 → 학창 시절 → 청년 → 중년 → 노년 → 사회.
// 일부는 later 로 몇 년 뒤 이어지는 뒷이야기(w: 0, 예약으로만 도착)가 있다.
import type { Story } from './stories';
import { age, alive, hasFlag, spouseOf } from './people';

export const MORE_STORIES: Story[] = [
  // ───────── 어린 시절 (5~12) ─────────
  { id: 'lost_tooth', title: '흔들리는 이', age: [6, 8], w: 0.04, once: true, text: '{n}의 앞니가 흔들린다. 실로 묶어 뽑을까?', choices: [
    { label: '실로 묶어 문고리에!', mark: { warmth: 1 }, text: '', roll: ['luck', 60, [{ hap: 6 }, '쏙! 지붕 위로 던지며 "헌 이 줄게 새 이 다오"를 외쳤다.'], [{ hap: -4 }, '세 번 실패하고 울면서 치과에 갔다.']] },
    { label: '치과에 간다', cost: 5, text: '치과 선생님이 스티커를 두 장이나 줬다.', eff: { hap: 2 } },
  ] },
  { id: 'hamster', title: '햄스터', age: [6, 11], w: 0.03, once: true, text: '{n이} 학교 앞에서 햄스터를 사 달라고 조른다.', choices: [
    { label: '사 준다', mark: { warmth: 1, kind: 1 }, cost: 5, text: '"뽀삐"라고 이름 지었다. 매일 밤 쳇바퀴 소리가 난다.', eff: { hap: 8, mor: 2, later: [0.9, 2, 3, 'st_hamster_bye'] } },
    { label: '책임질 수 있을 때', mark: { hurt: 1 }, text: '"치…" 하루 종일 삐졌다.', eff: { hap: -4, aff: -2 } },
  ] },
  { id: 'hamster_bye', title: '뽀삐와의 이별', age: [6, 16], w: 0, text: '{n}의 햄스터 뽀삐가 움직이지 않는다.', choices: [
    { label: '화단에 묻어 준다', mark: { warmth: 1 }, text: '{n이} 아이스크림 막대로 작은 묘비를 만들었다. 처음 배운 이별이다.', eff: { mor: 3, hap: -6 } },
  ] },
  { id: 'rain_umbrella', title: '소나기', age: [6, 11], w: 0.03, text: '하굣길에 소나기가 쏟아졌다. {n}만 우산이 없다.', choices: [
    { label: '데리러 간다', mark: { warmth: 1 }, text: '교문 앞에서 기다리는 모습을 보고 {n이} 환하게 웃었다.', eff: { aff: 5, hap: 4 } },
    { label: '뛰어오라고 한다', mark: { sport: 1 }, text: '', roll: ['hp', 40, [{ hap: 3 }, '물웅덩이를 첨벙첨벙. 오히려 신났다.'], [{ hp: -3 }, '감기에 걸려 사흘을 앓았다.']] },
    { label: '친구 우산을 같이 쓰게 한다', mark: { network: 1 }, text: '우산 하나로 둘이 걸어오며 단짝이 됐다.', eff: { cha: 1, hap: 3 } },
  ] },
  { id: 'field_trip', title: '소풍', age: [6, 12], w: 0.04, text: '내일은 {n}의 소풍날! 도시락을 어떻게 싸 줄까?', choices: [
    { label: '캐릭터 김밥', cost: 5, mark: { warmth: 1 }, text: '친구들이 줄을 서서 구경했다. {n이} 어깨를 으쓱했다.', eff: { hap: 6, cha: 1 } },
    { label: '편의점 삼각김밥', text: '', roll: ['luck', 50, [{ hap: 1 }, '다들 편의점 거라 아무도 신경 안 썼다.'], [{ hap: -4 }, '"너희 엄마는 김밥 안 싸 줘?" 한마디가 콕 박혔다.']] },
  ] },
  { id: 'reading_award', boost: { study: 0.3 }, title: '독서왕', age: [7, 12], w: 0.03, text: '{n이} 학교 독서왕 대회에 나가고 싶어 한다. 한 달에 책 30권!', choices: [
    { label: '도서관에 매일 데려간다', mark: { study: 1, warmth: 1 }, text: '', roll: ['int', 40, [{ int: 3, study: 3, hap: 6 }, '독서왕 트로피를 받았다! 책 읽는 게 습관이 됐다.'], [{ int: 1, study: 1 }, '27권에서 멈췄지만 책이 좋아졌다.']] },
    { label: '만화책도 책이지', text: '만화 삼국지를 전권 읽었다. 역사 박사가 됐다.', eff: { int: 1, hap: 4 } },
  ] },
  { id: 'class_pet', title: '반장 선거', age: [8, 12], w: 0.03, text: '{n이} 반장 선거에 나가겠다며 공약을 쓴다. "급식에 매일 치킨!"', choices: [
    { label: '연설문을 같이 다듬는다', mark: { network: 1, warmth: 1 }, text: '', roll: ['cha', 45, [{ cha: 3, hap: 8, flag: 'class_pres' }, '당선! 목에 반장 명찰을 걸고 들어왔다.'], [{ hap: -5, mor: 1 }, '두 표 차로 떨어졌다. 그래도 끝까지 웃으며 박수쳐 줬다.']] },
    { label: '공약은 지킬 수 있는 걸로', mark: { honest: 1 }, text: '"치킨은 한 달에 한 번"으로 고쳤다. 현실적인 후보로 인기를 얻었다.', eff: { mor: 2, cha: 1 } },
  ] },
  { id: 'sleepover', title: '친구네서 자고 오기', age: [8, 13], w: 0.03, text: '{n이} 친구 집에서 자고 와도 되냐고 묻는다.', choices: [
    { label: '허락한다', mark: { network: 1 }, text: '밤새 베개 싸움을 하고 새벽 세 시에 잤다고 한다.', eff: { hap: 8, cha: 1 } },
    { label: '우리 집으로 초대하라고 한다', mark: { warmth: 1 }, cost: 10, text: '거실이 텐트로 변했다. 떡볶이 파티!', eff: { hap: 6, aff: 3 } },
    { label: '아직은 안 된다', mark: { hurt: 1 }, text: '"다른 애들은 다 되는데!" 방문이 쾅.', eff: { aff: -3 } },
  ] },
  { id: 'science_fair', boost: { study: 0.3 }, title: '과학 발명품 대회', age: [9, 13], w: 0.025, text: '{n이} 발명품 대회에 "자동 양말 개는 기계"를 내겠다고 한다.', choices: [
    { label: '같이 만든다', mark: { study: 1, warmth: 1 }, cost: 20, text: '', roll: ['int', 50, [{ int: 3, hap: 8, fame: 1 }, '장려상! 기계는 양말 대신 수건을 개긴 했지만.'], [{ int: 1, hap: 3 }, '모터가 타 버렸다. 그래도 둘이 한참 웃었다.']] },
    { label: '혼자 해 보라고 한다', text: '', roll: ['int', 55, [{ int: 3, mor: 1 }, '혼자 끝까지 해냈다. 스스로 대견해한다.'], [{ hap: -3 }, '반쯤 만들다 방 한구석에 쌓였다.']] },
  ] },
  // ───────── 학창 시절 (13~19) ─────────
  { id: 'first_phone', title: '첫 스마트폰', age: [11, 14], w: 0.04, once: true, text: '반에서 스마트폰 없는 애는 {n}뿐이란다.', choices: [
    { label: '최신폰을 사 준다', cost: 150, mark: { spend: 1 }, text: '{n}의 얼굴이 화면에 붙어 버렸다.', eff: { hap: 10, study: -2, cha: 1 } },
    { label: '중고폰 + 사용 시간 약속', cost: 30, mark: { thrift: 1 }, text: '', roll: ['mor', 40, [{ hap: 5, mor: 2 }, '약속을 제법 잘 지킨다.'], [{ study: -2 }, '약속은 사흘 만에 깨졌다.']] },
    { label: '고등학생 때까지 참아라', mark: { study: 1, hurt: 1 }, text: '단톡방 얘기를 못 알아들어 가끔 외롭다.', eff: { study: 2, hap: -6 } },
  ] },
  { id: 'idol_concert', title: '콘서트 티켓팅', age: [13, 19], w: 0.03, text: '{n}의 최애 그룹 콘서트 티켓팅 날. 피시방 광클 대작전!', choices: [
    { label: '같이 새로고침 해 준다', mark: { warmth: 1 }, text: '', roll: ['luck', 30, [{ hap: 12, aff: 5 }, '성공!! 둘이 부둥켜안고 소리를 질렀다.'], [{ hap: -5 }, '대기번호 8만 번대. 둘이 같이 망연자실했다.']] },
    { label: '암표를 산다', cost: 50, mark: { spend: 1 }, text: '', roll: ['luck', 70, [{ hap: 10 }, '무사히 입장했다. 평생 잊지 못할 밤.'], [{ hap: -8 }, '사기였다. 돈만 날렸다.']] },
    { label: '공부나 해라', mark: { hurt: 1 }, text: '"아무것도 모르면서!"', eff: { aff: -6, study: 1 } },
  ] },
  { id: 'dye_hair', title: '염색', age: [14, 19], w: 0.03, text: '{n이} 머리를 탈색하고 들어왔다. 노란 머리다.', choices: [
    { label: '"잘 어울리네!"', mark: { warmth: 1 }, text: '{n이} 의외라는 듯 씩 웃었다.', eff: { aff: 6, hap: 5, cha: 1 } },
    { label: '당장 검게 되돌려!', mark: { hurt: 1 }, text: '다음 날 머리 색은 돌아왔지만 말수는 줄었다.', eff: { aff: -8 } },
    { label: '학교 규칙은 지키자고 한다', mark: { honest: 1 }, text: '방학 동안만 하기로 타협했다.', eff: { mor: 1 } },
  ] },
  { id: 'part_time', title: '첫 알바', age: [16, 19], w: 0.04, once: true, text: '{n이} 편의점 알바를 해 보겠다고 한다.', choices: [
    { label: '해 보라고 한다', mark: { thrift: 1 }, text: '', roll: ['mor', 35, [{ cash: 150, mor: 3, hap: 4 }, '첫 월급으로 부모님께 내복을 사 왔다.'], [{ cash: 60, hap: -4 }, '진상 손님에게 시달리다 한 달 만에 그만뒀다. 세상이 만만치 않다.']] },
    { label: '지금은 공부할 때', mark: { study: 1 }, text: '', eff: { study: 1, hap: -2 } },
  ] },
  { id: 'school_trip', title: '수학여행', age: [15, 18], w: 0.04, text: '{n}의 수학여행. 장기자랑에 나가게 됐단다.', choices: [
    { label: '춤 연습을 도와준다', mark: { art: 1, warmth: 1 }, text: '', roll: ['cha', 45, [{ cha: 3, hap: 10 }, '장기자랑 1등! 학교에서 유명해졌다.'], [{ hap: 2 }, '실수했지만 다 같이 웃었다. 좋은 추억.']] },
    { label: '조용히 구경만', text: '밤새 베개 싸움하다 선생님께 걸렸다고 한다.', eff: { hap: 5 } },
  ] },
  { id: 'teen_love', title: '첫 연애', age: [15, 19], w: 0.03, boost: { network: 0.2 }, text: '{n}의 휴대폰에 하트가 가득하다. 연애를 시작한 모양이다.', choices: [
    { label: '모른 척 응원한다', mark: { warmth: 1 }, text: '', roll: ['cha', 40, [{ hap: 10, cha: 1 }, '풋풋하다. 요즘 콧노래를 부른다.'], [{ hap: -8, study: -1 }, '석 달 만에 헤어졌다. 이별 노래만 듣는다.']] },
    { label: '공부에 방해된다고 막는다', mark: { hurt: 1, study: 1 }, text: '몰래 만나기 시작했다.', eff: { aff: -6, study: 1 } },
  ] },
  { id: 'exam_cheat', boost: { cheat: 0.5 }, title: '커닝 유혹', age: [13, 19], w: 0.02, text: '기말고사 전날, 친구가 {n}에게 시험지 사진이 돌고 있다고 속삭인다.', choices: [
    { label: '거절한다', mark: { honest: 1 }, text: '결과는 그저 그랬지만 떳떳하다.', eff: { mor: 3 } },
    { label: '살짝 본다', mark: { cheat: 2 }, text: '', roll: ['luck', 60, [{ study: 3, mor: -3 }, '점수가 올랐다. 마음 한구석이 찜찜하다.'], [{ study: -5, mor: -4, fame: -1 }, '들켰다. 전교에 소문이 났다.']] },
  ] },
  { id: 'rebel_night', title: '가출', age: [14, 18], w: 0.015, cond: (_s, p) => p.affinity < 0 || p.happiness < 35, text: '{n이} 집에 들어오지 않았다. 휴대폰도 꺼져 있다.', choices: [
    { label: '밤새 찾아다닌다', mark: { warmth: 2 }, text: '새벽 PC방 구석에서 찾았다. 아무 말 없이 안아 줬다.', eff: { aff: 12, hap: 4 } },
    { label: '경찰에 신고한다', text: '다음 날 경찰차를 타고 돌아왔다. 한동안 어색했다.', eff: { aff: -2 } },
    { label: '돌아오면 혼낸다', mark: { hurt: 2 }, text: '사흘 만에 돌아왔다. 둘 사이 벽이 더 높아졌다.', eff: { aff: -12, hap: -6 } },
  ] },
  // ───────── 청년 (20~35) ─────────
  { id: 'backpack', title: '배낭여행', age: [20, 30], w: 0.03, text: '{n}, 모아 둔 돈으로 한 달 배낭여행을 떠날까?', choices: [
    { label: '유럽으로 떠난다', cost: 500, mark: { network: 1 }, text: '', roll: ['luck', 75, [{ hap: 12, cha: 2, int: 1 }, '파리의 야경, 로마의 젤라토. 세상이 넓다는 걸 알았다.'], [{ hap: 3, cash: -200 }, '소매치기에 여권을 털렸다. 대사관에서 사흘. 그래도 이야깃거리는 생겼다.']] },
    { label: '국토대장정', mark: { sport: 1 }, text: '발에 물집이 열 개. 그래도 해냈다.', eff: { str: 2, mor: 2, hap: 6 } },
    { label: '돈 모으는 게 먼저', mark: { thrift: 1 }, text: '적금 통장이 조금 두꺼워졌다.', eff: { cash: 300 } },
  ] },
  { id: 'coin_friend', boost: { risk: 0.4 }, title: '단톡방 리딩방', age: [20, 45], w: 0.025, text: '{n}, "무조건 10배 가는 코인"이라며 리딩방 초대가 왔다.', choices: [
    { label: '1천만 원 넣는다', mark: { risk: 2 }, cost: 1000, text: '', roll: ['luck', 20, [{ cash: 4000, hap: 10 }, '진짜 올랐다?! 4천만 원이 됐다. 이러면 안 되는데 자꾸 생각난다.'], [{ hap: -10 }, '다음 날 상장폐지. 리딩방은 사라졌다.']] },
    { label: '방을 나간다', mark: { honest: 1 }, text: '한 달 뒤 뉴스에 그 리딩방 사기 사건이 나왔다.', eff: { mor: 1 } },
  ] },
  { id: 'jeonse_scam', title: '전세 사기 소문', age: [22, 40], w: 0.015, text: '{n이} 사는 빌라 집주인이 연락 두절이라는 소문이 돈다.', choices: [
    { label: '전세보증보험을 확인한다', cost: 30, mark: { honest: 1 }, text: '다행히 보험에 가입되어 있었다. 가슴을 쓸어내렸다.', eff: { hap: 2 } },
    { label: '설마 하고 넘긴다', text: '', roll: ['luck', 70, [{}, '헛소문이었다. 휴.'], [{ cash: -3000, hap: -15 }, '진짜였다. 보증금 일부를 날렸다. 한동안 잠을 못 잤다.']] },
  ] },
  { id: 'side_hustle', title: '부업', age: [22, 50], w: 0.025, text: '{n}, 퇴근 후에 부업을 해 볼까?', choices: [
    { label: '스마트스토어를 연다', mark: { network: 1 }, cost: 200, text: '', roll: ['int', 50, [{ cash: 1200, hap: 6 }, '생각보다 잘 팔린다! 월 100만 원 부수입.'], [{ hap: -4 }, '재고만 창고에 쌓였다.']] },
    { label: '배달 알바', mark: { sport: 1 }, text: '주말마다 오토바이를 탔다. 통장은 불었지만 몸이 고되다.', eff: { cash: 600, hp: -2 } },
    { label: '쉴 땐 쉬어야지', text: '', eff: { hap: 3 } },
  ] },
  { id: 'wedding_guest', title: '청첩장 러시', age: [26, 36], w: 0.04, text: '이번 달에만 청첩장이 다섯 장 왔다. {n}의 통장이 운다.', choices: [
    { label: '다 가서 축의금 낸다', cost: 50, mark: { network: 2 }, text: '다섯 번의 뷔페. 인맥은 두터워졌다.', eff: { cha: 1 } },
    { label: '친한 사람만 간다', cost: 20, text: '몇 명은 서운했을지도.', eff: {} },
  ] },
  { id: 'hospital_night', title: '응급실', age: [20, 60], w: 0.02, text: '{n}, 새벽에 배가 끊어질 듯 아프다.', choices: [
    { label: '당장 응급실로', cost: 80, text: '', roll: ['hp', 30, [{ hp: -2 }, '급성 장염. 링거 맞고 돌아왔다.'], [{ hp: -6, flag: 'appendix' }, '맹장이 터지기 직전이었다. 바로 수술했다.']] },
    { label: '아침까지 참는다', mark: { health_x: 1 }, text: '', roll: ['hp', 50, [{ hp: -1 }, '아침엔 좀 괜찮아졌다.'], [{ hp: -10, cash: -300 }, '복막염. 입원이 길어졌다.']] },
  ] },
  { id: 'burnout', title: '번아웃', age: [25, 55], w: 0.02, cond: (_s, p) => p.job !== 'none', text: '{n}, 아침에 눈을 떴는데 회사에 가기 싫어서 눈물이 났다.', choices: [
    { label: '휴직한다', mark: { family: 1 }, text: '석 달을 쉬었다. 월급은 줄었지만 다시 웃기 시작했다.', eff: { cash: -700, hap: 12, hp: 3 } },
    { label: '상담을 받는다', cost: 100, text: '', roll: ['mor', 30, [{ hap: 8 }, '조금씩 나아지고 있다.'], [{ hap: 2 }, '아직은 모르겠다. 그래도 한 걸음.']] },
    { label: '버틴다', mark: { health_x: 1 }, text: '이를 악물고 출근했다.', eff: { hap: -8, hp: -3 } },
  ] },
  { id: 'reunion', title: '동창회', age: [30, 60], w: 0.03, text: '{n}, 20년 만의 동창회 문자가 왔다.', choices: [
    { label: '나간다', mark: { network: 1 }, text: '', roll: ['cha', 40, [{ hap: 8, cha: 1 }, '그때 그 시절로 돌아간 밤. 옛 친구와 다시 연락하기 시작했다.'], [{ hap: -4 }, '다들 집 평수, 차 얘기만 했다. 씁쓸하게 돌아왔다.']] },
    { label: '안 나간다', text: '', eff: {} },
  ] },
  // ───────── 중년 (35~65) ─────────
  { id: 'car', title: '차 바꾸기', age: [30, 65], w: 0.03, text: '{n}의 차가 10년이 넘었다. 이제 바꿀 때일까?', choices: [
    { label: '외제차', cost: 8000, mark: { spend: 2 }, text: '주차장에서 괜히 한 번 더 뒤돌아본다.', eff: { hap: 8, fame: 1 } },
    { label: '국산 SUV', cost: 4000, text: '가족 여행이 편해졌다.', eff: { hap: 5 } },
    { label: '폐차할 때까지 탄다', mark: { thrift: 1 }, text: '', roll: ['luck', 70, [{}, '오늘도 잘 굴러간다.'], [{ cash: -300, hap: -3 }, '고속도로에서 퍼졌다. 견인비에 수리비까지.']] },
  ] },
  { id: 'health_scare', title: '건강검진 재검', age: [40, 70], w: 0.03, text: '{n}의 건강검진 결과에 "재검 요망"이 찍혀 나왔다.', choices: [
    { label: '큰 병원에서 정밀검사', cost: 150, mark: { exercise: 1 }, text: '', roll: ['hp', 25, [{ hap: 6 }, '다행히 별것 아니었다. 운동을 시작하기로 했다.'], [{ hp: -3, flag: 'chronic' }, '고혈압·당뇨 전 단계. 약을 먹고 식단을 바꿨다.']] },
    { label: '바빠서 미룬다', mark: { health_x: 2 }, text: '마음 한구석이 계속 찜찜하다.', eff: {} },
  ] },
  { id: 'hobby_midlife', title: '중년의 취미', age: [38, 65], w: 0.03, text: '{n}, 요즘 뭔가 새로운 걸 배우고 싶어졌다.', choices: [
    { label: '골프', cost: 300, mark: { network: 2 }, text: '필드에서 인맥이 넓어졌다. 스코어는 비밀.', eff: { cha: 1, hap: 5 } },
    { label: '등산', mark: { exercise: 1 }, text: '주말마다 산에 오른다. 무릎은 조금 걱정.', eff: { hp: 3, hap: 4 } },
    { label: '색소폰', cost: 150, mark: { art: 1 }, text: '', roll: ['cha', 45, [{ cha: 2, hap: 8 }, '동네 축제 무대에 섰다!'], [{ hap: 2 }, '이웃에게 층간소음 항의를 받았다.']] },
    { label: '요리', mark: { family: 1 }, text: '주말 저녁은 이제 {n} 담당이다. 가족들 반응이 좋다.', eff: { bond: 4, hap: 4 } },
  ] },
  { id: 'kid_graduation', title: '졸업식', age: [40, 70], w: 0.02, cond: (s, p) => p.childIds.some((id) => s.people[id] && age(s, s.people[id]) === 22), text: '{n}의 아이가 대학을 졸업한다. 학사모를 쓴 모습이 낯설다.', choices: [
    { label: '꽃다발을 들고 간다', mark: { family: 1 }, text: '사진 속 {n이} 제일 활짝 웃고 있다.', eff: { hap: 10 } },
  ] },
  { id: 'parent_hospital', title: '부모님 입원', age: [35, 65], w: 0.025, cond: (s, p) => Object.values(s.people).some((x) => alive(x) && (p.fatherId === x.id || p.motherId === x.id)), text: '{n}의 부모님이 쓰러져 입원하셨다. 간병이 필요하다.', choices: [
    { label: '직접 간병한다', mark: { filial: 2 }, text: '병원 보호자 침대에서 한 달을 잤다. 부모님이 손을 꼭 잡아 주셨다.', eff: { hp: -3, hap: -3, cash: -300, mor: 3 } },
    { label: '간병인을 쓴다', cost: 800, text: '전문 간병인 덕에 회복이 빨랐다.', eff: {} },
    { label: '형제들과 나눈다', text: '', roll: ['cha', 40, [{ mor: 2 }, '형제들이 번갈아 가며 도왔다. 오랜만에 우애를 느꼈다.'], [{ hap: -6 }, '누가 더 했네 덜 했네, 형제끼리 언성이 높아졌다.']] },
  ] },
  { id: 'lotto_small', title: '로또', age: [20, 90], w: 0.02, text: '{n}, 꿈에 돼지가 나왔다. 로또를 사 볼까?', choices: [
    { label: '5천 원어치 산다', mark: { risk: 1 }, text: '', roll: ['luck', 8, [{ cash: 150, hap: 8 }, '4등! 5만 원… 이 아니라 3등 150만 원!'], [{}, '숫자 두 개 맞았다. 다음 주에 또.']] },
    { label: '돼지꿈은 좋은 일의 징조일 뿐', text: '그날 저녁, 삼겹살을 먹었다.', eff: { hap: 2 } },
  ] },
  { id: 'phishing_text', title: '택배 문자', age: [40, 95], w: 0.025, text: '"[택배] 주소 불일치로 배송 불가. 확인: http://…" {n}에게 문자가 왔다.', choices: [
    { label: '링크를 누른다', mark: { risk: 1 }, text: '', roll: ['int', 45, [{}, '뭔가 이상해서 바로 껐다. 휴.'], [{ cash: -800, hap: -10 }, '스미싱이었다. 통장에서 돈이 빠져나갔다.']] },
    { label: '삭제한다', text: '다음 날 뉴스에 같은 문자 사기가 나왔다.', eff: {} },
  ] },
  { id: 'neighbor_kimchi', title: '김장', age: [35, 90], w: 0.03, text: '김장철이다. {n}네 집에 배추 100포기가 도착했다.', choices: [
    { label: '온 가족이 모여 담근다', mark: { family: 1 }, text: '허리는 끊어질 것 같지만 수육이 맛있었다. 1년 반찬 걱정 끝.', eff: { hap: 6, bond: 3, cash: 100 } },
    { label: '사 먹는다', cost: 50, text: '편하긴 한데 뭔가 허전하다.', eff: {} },
  ] },
  // ───────── 노년 (60~) ─────────
  { id: 'retire_travel', title: '크루즈 여행', age: [60, 85], w: 0.02, text: '{n}, 평생 꿈이던 크루즈 여행을 떠날까?', choices: [
    { label: '떠난다', cost: 1500, mark: { family: 1 }, text: '지중해의 석양 아래서 지난 인생을 돌아봤다.', eff: { hap: 15, bond: 6 } },
    { label: '손주들 용돈으로 쓴다', mark: { warmth: 1 }, text: '손주들이 "할머니(할아버지) 최고!"를 외쳤다.', eff: { hap: 6 } },
  ] },
  { id: 'smartphone_old', title: '키오스크', age: [65, 95], w: 0.03, text: '{n}, 햄버거 가게 키오스크 앞에서 5분째 서 있다.', choices: [
    { label: '손주에게 배운다', mark: { warmth: 1 }, text: '', roll: ['int', 35, [{ int: 1, hap: 5 }, '이제 혼자서도 주문한다! 괜히 뿌듯하다.'], [{ hap: -2 }, '결국 직원을 불렀다. 그래도 다음엔 해 보리라.']] },
    { label: '다른 가게로 간다', text: '국밥집 사장님이 반갑게 맞아 줬다.', eff: { hap: 2 } },
  ] },
  { id: 'old_friend_dies', title: '오랜 친구의 부고', age: [65, 99], w: 0.03, text: '{n}의 50년 지기 친구가 세상을 떠났다.', choices: [
    { label: '장례식장을 지킨다', mark: { kind: 1 }, text: '밤새 친구와의 추억을 이야기했다. 남은 날들을 더 소중히 하기로 했다.', eff: { hap: -8, mor: 2 } },
  ] },
  { id: 'garden', title: '텃밭', age: [58, 90], w: 0.03, text: '{n}, 주말농장 한 칸을 빌려 텃밭을 가꿔 볼까?', choices: [
    { label: '상추·고추를 심는다', mark: { exercise: 1, family: 1 }, text: '', roll: ['luck', 60, [{ hp: 3, hap: 8 }, '풍년이다! 온 동네에 상추를 돌렸다.'], [{ hp: 1, hap: 2 }, '벌레가 다 먹었다. 그래도 흙냄새가 좋았다.']] },
    { label: '귀찮다', text: '', eff: {} },
  ] },
  { id: 'grandkid_visit', title: '손주 방문', age: [55, 95], w: 0.04, cond: (s, p) => p.childIds.some((id) => s.people[id]?.childIds.some((g) => s.people[g] && alive(s.people[g]))), text: '명절에 손주들이 {n}네 집에 우르르 몰려왔다.', choices: [
    { label: '용돈을 두둑이', cost: 100, mark: { warmth: 1 }, text: '손주들이 서로 할머니(할아버지) 옆에 앉겠다고 싸웠다.', eff: { hap: 10 } },
    { label: '옛날이야기를 들려준다', mark: { family: 1 }, text: '손주들이 눈을 반짝이며 들었다. 가문의 이야기가 이어진다.', eff: { hap: 8, fame: 0.5 } },
    { label: '잔소리를 한다', text: '다음 명절엔 손주들이 조금 덜 왔다.', eff: { hap: -3 } },
  ] },
  // ───────── 부부 ─────────
  { id: 'anniv_forget', title: '결혼기념일', age: [25, 80], w: 0.03, cond: (s, p) => !!spouseOf(s, p) && alive(spouseOf(s, p)!), text: '{n}, 오늘이 결혼기념일이라는 걸 저녁 여덟 시에 깨달았다.', choices: [
    { label: '꽃집으로 전력 질주', cost: 10, text: '', roll: ['luck', 60, [{ bond: 3 }, '문 닫기 직전 꽃을 샀다. 세이프!'], [{ bond: -5 }, '빈손으로 들어갔다. 한 주 내내 냉랭했다.']] },
    { label: '솔직하게 사과하고 주말 여행', cost: 200, mark: { family: 1 }, text: '"다음엔 달력에 적어 둬." 웃으며 용서받았다.', eff: { bond: 6 } },
  ] },
  { id: 'inlaw_holiday', title: '명절 어디로?', age: [26, 60], w: 0.03, cond: (s, p) => !!spouseOf(s, p), text: '이번 명절, 친가 먼저냐 처가(시가) 먼저냐로 부부가 신경전이다.', choices: [
    { label: '번갈아 가자고 정한다', mark: { family: 1 }, text: '합리적인 규칙이 생겼다. 다툼이 줄었다.', eff: { bond: 3 } },
    { label: '우리 집 먼저!', text: '', roll: ['cha', 55, [{ bond: -1 }, '마지못해 따라 줬다.'], [{ bond: -7 }, '차 안 공기가 싸늘했다.']] },
    { label: '이번엔 둘이 여행 간다', cost: 150, text: '양가 어른들 눈치는 보였지만 오랜만에 둘만의 시간.', eff: { bond: 5, aff: -3 } },
  ] },
  // ───────── 사회 (가주) ─────────
  { id: 'heat_wave', title: '폭염', age: [20, 99], w: 0.012, head: true, text: '40도에 육박하는 폭염. 에어컨이 고장 났다!', choices: [
    { label: '당장 새로 산다', cost: 150, text: '시원하다. 전기요금 고지서는 보지 않기로 했다.', eff: { hap: 4 } },
    { label: '선풍기로 버틴다', mark: { thrift: 1 }, text: '', roll: ['hp', 35, [{ hap: -2 }, '땀띠는 났지만 버텼다.'], [{ hp: -4 }, '열사병 기운으로 하루 누워 있었다.']] },
  ] },
  { id: 'power_outage', title: '정전', age: [20, 99], w: 0.008, head: true, text: '동네 전체가 정전이다. 휴대폰 배터리는 12%.', choices: [
    { label: '촛불 켜고 가족 보드게임', mark: { family: 1 }, text: '어둠 속에서 오랜만에 온 가족이 깔깔거렸다.', eff: { hap: 6, bond: 3 } },
    { label: '카페로 피신', cost: 3, text: '카페도 만석이었다.', eff: {} },
  ] },
  { id: 'local_news', title: '동네 맛집 취재', age: [30, 70], w: 0.006, cond: (_s, p) => ['restaurant', 'cafe_owner', 'shopkeeper', 'chicken'].includes(p.job), text: '{n}의 가게에 방송국 맛집 프로그램 섭외가 왔다!', choices: [
    { label: '출연한다', mark: { network: 1 }, text: '', roll: ['cha', 40, [{ cash: 1500, fame: 3, hap: 10 }, '방송 다음 날부터 줄이 섰다!'], [{ cash: 200, hap: -3 }, '편집이 이상하게 됐다. 반짝 손님만 왔다.']] },
    { label: '사양한다', text: '단골들이 더 좋아했다.', eff: { mor: 1 } },
  ] },
  { id: 'blood_donation', boost: { kind: 0.3 }, title: '헌혈', age: [17, 65], w: 0.02, text: '{n}, 헌혈의 집 앞을 지나간다. "혈액 수급 위기" 현수막이 걸려 있다.', choices: [
    { label: '헌혈한다', mark: { kind: 1 }, text: '초코파이와 영화표를 받았다. 누군가에게 도움이 되길.', eff: { mor: 2, hap: 3 } },
    { label: '다음에', text: '', eff: {} },
  ] },
  { id: 'old_classmate_money', title: '옛 친구의 부탁', age: [30, 70], w: 0.015, cond: (_s, p) => !hasFlag(p, 'bankrupt'), text: '연락 끊겼던 고향 친구가 {n}에게 전화를 걸어왔다. 딸 병원비가 급하단다.', choices: [
    { label: '300만 원을 보낸다', cost: 300, mark: { kind: 2 }, text: '"꼭 갚을게." 떨리는 목소리였다.', eff: { mor: 3, later: [0.6, 2, 5, 'st_friend_repay'] } },
    { label: '형편이 안 된다고 한다', text: '전화를 끊고 한참 창밖을 봤다.', eff: { hap: -2 } },
  ] },
  { id: 'friend_repay', title: '돌아온 봉투', age: [30, 95], w: 0, text: '몇 년 전 돈을 빌려 갔던 친구가 {n을} 찾아왔다.', choices: [
    { label: '만난다', text: '"네 덕에 딸이 살았다." 봉투에는 빌린 돈의 두 배가 들어 있었다. 친구는 이제 작은 식당을 한다.', eff: { cash: 600, hap: 10, mor: 2 } },
  ] },
  // ───────── 생활 수준 (가주 가족) ─────────
  { id: 'flea_market', title: '벼룩시장', age: [25, 80], w: 0.05, head: true, cond: (s) => s.policy.living === 'frugal', text: '동네 벼룩시장이 열렸다. {n}네 창고에 안 쓰는 물건이 가득하다.', choices: [
    { label: '좌판을 편다', mark: { thrift: 1 }, text: '', roll: ['cha', 35, [{ cash: 60, hap: 5 }, '다 팔았다! 아이들이 계산을 도왔다.'], [{ cash: 10 }, '반도 못 팔았다. 그래도 창고가 조금 비었다.']] },
    { label: '기부한다', mark: { kind: 1 }, text: '아름다운가게에 한 트럭 보냈다.', eff: { mor: 2 } },
  ] },
  { id: 'hand_me_down', title: '물려 입은 옷', age: [7, 15], w: 0.04, cond: (s, p) => s.policy.living === 'frugal' && p.id !== s.headId, text: '{n이} 친척 형(언니)에게 물려받은 옷 때문에 학교에서 놀림을 받았다.', choices: [
    { label: '새 옷을 한 벌 사 준다', cost: 20, mark: { warmth: 1 }, text: '{n이} 거울 앞을 떠나지 않는다.', eff: { hap: 8, aff: 4 } },
    { label: '아껴야 잘 산다고 가르친다', mark: { thrift: 2, hurt: 1 }, text: '{n이} 입을 삐죽였다. 그래도 아끼는 법을 배우고 있다.', eff: { hap: -5, mor: 2 } },
  ] },
  { id: 'coupon_life', title: '짠테크', age: [25, 80], w: 0.04, head: true, cond: (s) => s.policy.living === 'frugal', text: '{n}, 앱테크·쿠폰·포인트를 모아 봤더니 꽤 된다.', choices: [
    { label: '본격적으로 해 본다', mark: { thrift: 1 }, text: '한 달에 20만 원이 굳었다. 가계부가 즐거워진다.', eff: { cash: 240, hap: 2 } },
    { label: '시간이 아깝다', text: '', eff: {} },
  ] },
  { id: 'vip_party', title: 'VIP 초대', age: [28, 80], w: 0.05, head: true, cond: (s) => s.policy.living === 'lux', text: '{n}에게 백화점 VIP 라운지 파티 초대장이 왔다.', choices: [
    { label: '간다', cost: 300, mark: { network: 2, spend: 1 }, text: '', roll: ['cha', 45, [{ cha: 2, fame: 1, hap: 8 }, '재계 인사들과 명함을 주고받았다. 새로운 기회가 열린다.'], [{ hap: 3 }, '샴페인만 마시고 왔다.']] },
    { label: '사양한다', text: '', eff: {} },
  ] },
  { id: 'golf_member', title: '골프 회원권', age: [35, 75], w: 0.03, head: true, once: true, cond: (s) => s.policy.living === 'lux', text: '{n}, 명문 골프장 회원권 분양 제안이 왔다. 5억.', choices: [
    { label: '산다', cost: 50000, mark: { network: 3, spend: 2 }, text: '주말마다 필드. 인맥이 한 단계 올라갔다.', eff: { cha: 2, fame: 2, hap: 6, flag: 'golf_member' } },
    { label: '과하다', text: '', eff: {} },
  ] },
  { id: 'spoiled_kid', title: '버릇', age: [8, 17], w: 0.05, cond: (s, p) => s.policy.living === 'lux' && p.id !== s.headId, text: '{n이} 친구 앞에서 "우리 집은 너희 집보다 부자야"라고 했단다.', choices: [
    { label: '따끔하게 가르친다', mark: { honest: 1 }, text: '{n이} 얼굴이 빨개져 사과하러 갔다.', eff: { mor: 4, aff: -3 } },
    { label: '사실인데 뭐', mark: { spend: 2 }, text: '{n}의 목소리가 점점 커진다.', eff: { mor: -4, hap: 3 } },
  ] },
  { id: 'rich_scam', title: '투자 권유', age: [35, 85], w: 0.03, head: true, cond: (s) => s.policy.living === 'lux', text: '골프장에서 만난 "회장님"이 {n}에게 비상장 주식 투자를 권한다. "상장하면 열 배요."', choices: [
    { label: '1억 넣는다', cost: 10000, mark: { risk: 2 }, text: '', roll: ['luck', 15, [{ cash: 60000, hap: 10 }, '진짜 상장했다! 여섯 배.'], [{ hap: -10, fame: -1 }, '회장님이 사라졌다. 사기였다.']] },
    { label: '정중히 거절한다', mark: { honest: 1 }, text: '석 달 뒤 뉴스에 그 "회장님" 얼굴이 나왔다.', eff: {} },
  ] },
  { id: 'lux_envy', title: '구설', age: [30, 80], w: 0.03, head: true, cond: (s) => s.policy.living === 'lux', text: '{n}네 씀씀이를 두고 동네에서 말이 많다.', choices: [
    { label: '기부로 입막음을 한다', cost: 1000, mark: { kind: 1 }, text: '"그래도 베풀 줄은 안다"는 말로 바뀌었다.', eff: { fame: 2 } },
    { label: '신경 쓰지 않는다', text: '', eff: { fame: -1 } },
  ] },
];
