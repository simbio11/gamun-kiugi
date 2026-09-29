// 소소한 일상 이벤트 모음: 짧고 가볍지만 작은 흔적이 쌓인다. 나이대별로 고르게.
import type { Story } from './stories';
import { age, alive, spouseOf } from './people';

export const MINI_STORIES: Story[] = [
  // ───────── 유아·초등 (5~12) ─────────
  { id: 'm_bug', title: '곤충 채집', age: [5, 10], w: 0.03, text: '{n이} 사슴벌레를 잡아 와서 키우겠다고 한다.', choices: [
    { label: '같이 키운다', mark: { study: 1, warmth: 1 }, text: '관찰 일기를 쓰기 시작했다. 방학 숙제로 상을 받았다.', eff: { int: 1, hap: 5 } },
    { label: '숲에 돌려보내자고 한다', mark: { kind: 1 }, text: '"잘 가!" 손을 흔드는 {n}의 얼굴이 제법 의젓했다.', eff: { mor: 2 } },
  ] },
  { id: 'm_nightmare', title: '무서운 꿈', age: [5, 9], w: 0.03, text: '한밤중, {n이} 무서운 꿈을 꿨다며 이불을 들고 왔다.', choices: [
    { label: '같이 잔다', mark: { warmth: 2 }, text: '꼭 안고 잤다. 아침에 {n이} 제일 먼저 웃었다.', eff: { hap: 4, aff: 3 } },
    { label: '혼자 자야 큰다고 달랜다', text: '', roll: ['mor', 30, [{ mor: 2 }, '"나 이제 형아(언니)야." 스스로 방으로 돌아갔다.'], [{ hap: -4 }, '밤새 훌쩍이는 소리가 들렸다.']] },
  ] },
  { id: 'm_drawing_wall', title: '벽에 낙서', age: [5, 7], w: 0.03, text: '{n이} 거실 벽에 크레파스로 커다란 그림을 그려 놓았다.', choices: [
    { label: '벽 한쪽을 도화지로 내준다', mark: { art: 1, warmth: 1 }, text: '거실 벽이 {n}만의 갤러리가 됐다.', eff: { cha: 2, hap: 6 } },
    { label: '같이 지우며 약속한다', mark: { honest: 1 }, text: '"다음엔 종이에 그릴게."', eff: { mor: 1 } },
  ] },
  { id: 'm_bike', title: '두발자전거', age: [6, 9], w: 0.03, once: true, text: '{n이} 보조 바퀴를 떼고 두발자전거를 타 보겠다고 한다.', choices: [
    { label: '뒤에서 잡아 준다', mark: { sport: 1, warmth: 1 }, text: '', roll: ['str', 25, [{ str: 2, hap: 8 }, '"놓지 마!" 했는데 이미 놓았다. 혼자 달렸다!'], [{ hp: -1, hap: -2 }, '무릎이 까졌다. 내일 또 하기로 했다.']] },
  ] },
  { id: 'm_lemonade', title: '레모네이드 가게', age: [7, 11], w: 0.02, text: '{n이} 집 앞에서 레모네이드를 팔겠다고 한다.', choices: [
    { label: '재료를 대 준다', cost: 3, mark: { thrift: 1 }, text: '', roll: ['cha', 35, [{ cash: 8, cha: 1, hap: 6 }, '이웃들이 사 줬다. 첫 장사 성공!'], [{ hap: -2 }, '한 잔도 못 팔았다. 가족이 다 마셨다.']] },
    { label: '위험하다고 말린다', text: '', eff: { hap: -2 } },
  ] },
  { id: 'm_lie', title: '거짓말', age: [6, 11], w: 0.03, text: '{n이} 숙제를 다 했다고 했는데, 가방에서 빈 공책이 나왔다.', choices: [
    { label: '차분히 이야기한다', mark: { honest: 1, warmth: 1 }, text: '"다음부턴 솔직하게 말할게." 약속했다.', eff: { mor: 3 } },
    { label: '크게 혼낸다', mark: { hurt: 1, honest: 1 }, text: '다시는 안 그러겠다며 울었다.', eff: { mor: 2, aff: -3 } },
  ] },
  { id: 'm_pet_fish', title: '금붕어', age: [5, 10], w: 0.02, text: '축제에서 {n이} 금붕어 두 마리를 받아 왔다.', choices: [
    { label: '어항을 사 준다', cost: 5, mark: { kind: 1 }, text: '"뽀글이, 뻐끔이." 이름도 지었다.', eff: { hap: 5, mor: 1 } },
  ] },
  { id: 'm_snow', title: '첫눈', age: [5, 12], w: 0.03, text: '첫눈이 펑펑 온다. {n이} 창문에 코를 박고 있다.', choices: [
    { label: '나가서 눈사람을 만든다', mark: { family: 1, warmth: 1 }, text: '장갑이 다 젖을 때까지 놀았다. 코코아가 달았다.', eff: { hap: 8 } },
    { label: '감기 걸린다, 창밖으로 보자', text: '', eff: { hap: 1 } },
  ] },
  { id: 'm_tooth_fairy', title: '용돈 기입장', age: [7, 12], w: 0.02, text: '{n이} 저금통을 깨서 엄마 생일 선물을 사겠다고 한다.', choices: [
    { label: '같이 고르러 간다', mark: { filial: 1, warmth: 1 }, text: '삐뚤빼뚤 카드와 머리핀. 엄마가 한참 울었다.', eff: { mor: 3, hap: 5 } },
  ] },
  { id: 'm_friend_moved', title: '단짝의 이사', age: [7, 13], w: 0.03, text: '{n}의 단짝 친구가 멀리 이사를 간다.', choices: [
    { label: '편지를 주고받게 한다', mark: { warmth: 1 }, text: '한 달에 한 번 편지가 온다. 우정이 이어진다.', eff: { hap: -2, mor: 1 } },
    { label: '새 친구를 사귀라고 한다', mark: { network: 1 }, text: '', roll: ['cha', 35, [{ cha: 1 }, '금세 새 친구가 생겼다.'], [{ hap: -6 }, '한동안 쉬는 시간에 혼자 앉아 있었다.']] },
  ] },
  { id: 'm_dentist', title: '치과', age: [5, 11], w: 0.03, text: '{n}의 어금니에 충치가 생겼다. 치과에 가자니 울고불고 난리다.', choices: [
    { label: '끝나면 장난감 사 주기로', cost: 5, text: '용감하게 버텼다. 로봇을 품에 안고 나왔다.', eff: { hap: 3 } },
    { label: '충치의 무서움을 설명한다', mark: { honest: 1 }, text: '', roll: ['mor', 30, [{ mor: 2 }, '울면서도 입을 벌렸다. 대견하다.'], [{ hap: -4 }, '결국 다음에 오기로 했다.']] },
  ] },
  { id: 'm_school_play', title: '학예회 역할', age: [6, 12], w: 0.03, text: '{n이} 학예회 연극에서 "나무 3" 역을 맡았다며 시무룩하다.', choices: [
    { label: '"나무가 제일 중요해" 격려한다', mark: { warmth: 1 }, text: '세상에서 가장 당당한 나무였다.', eff: { hap: 5, cha: 1 } },
    { label: '주인공 하려면 연습하자', mark: { art: 1 }, text: '', roll: ['cha', 40, [{ cha: 2 }, '다음 해 주인공을 따냈다.'], [{ hap: -3 }, '또 나무였다. 이번엔 나무 2.']] },
  ] },
  { id: 'm_stray_cat', title: '길고양이', age: [7, 14], w: 0.03, text: '{n이} 학교 앞 길고양이에게 몰래 급식 우유를 가져다준다.', choices: [
    { label: '사료를 사 준다', cost: 3, mark: { kind: 2 }, text: '고양이가 {n}만 보면 꼬리를 세운다.', eff: { mor: 3, hap: 4 } },
    { label: '병 옮는다고 말린다', text: '', eff: { hap: -3 } },
  ] },
  { id: 'm_science_kit', title: '과학 상자', age: [8, 13], w: 0.02, text: '{n이} 생일 선물로 과학 상자를 갖고 싶어 한다.', choices: [
    { label: '사 준다', cost: 15, mark: { study: 1 }, text: '모터 달린 자동차를 만들어 거실을 누볐다.', eff: { int: 2, hap: 6 } },
    { label: '대신 책을 사 준다', text: '', eff: { int: 1, hap: -1 } },
  ] },
  { id: 'm_grades_hidden', title: '받아쓰기 0점', age: [7, 10], w: 0.03, text: '{n}의 가방에서 구겨진 받아쓰기 0점 시험지가 나왔다.', choices: [
    { label: '웃으며 같이 다시 연습', mark: { warmth: 1, study: 1 }, text: '다음 주엔 80점! 둘이 하이파이브.', eff: { study: 2, aff: 3 } },
    { label: '왜 숨겼냐고 혼낸다', mark: { hurt: 1 }, text: '다음엔 더 깊숙이 숨길 것 같다.', eff: { aff: -4 } },
  ] },
  { id: 'm_class_hamster_duty', title: '교실 당번', age: [7, 11], w: 0.02, text: '{n이} 방학 동안 교실 거북이를 맡아 오게 됐다.', choices: [
    { label: '책임지고 돌본다', mark: { honest: 1, kind: 1 }, text: '거북이가 무사히 학교로 돌아갔다. 선생님이 칭찬 스티커를 줬다.', eff: { mor: 3 } },
  ] },
  { id: 'm_swim_lesson', title: '생존 수영', age: [6, 10], w: 0.03, text: '학교에서 생존 수영 수업이 시작됐다. {n이} 물을 무서워한다.', choices: [
    { label: '주말에 같이 연습한다', mark: { sport: 1, warmth: 1 }, text: '', roll: ['str', 25, [{ str: 2, hap: 6 }, '뜨기 성공! 이제 물이 좋단다.'], [{ hap: -3 }, '아직 무섭다. 천천히 하기로 했다.']] },
    { label: '억지로 시키지 않는다', text: '', eff: {} },
  ] },
  { id: 'm_first_love_kid', title: '고백 편지', age: [8, 12], w: 0.02, text: '{n}의 필통에서 "좋아해"라고 적힌 쪽지가 나왔다.', choices: [
    { label: '모른 척 흐뭇하게 넘긴다', mark: { warmth: 1 }, text: '{n}의 귀가 빨개졌다.', eff: { hap: 3 } },
    { label: '누구냐고 캐묻는다', text: '"몰라!" 방으로 도망갔다.', eff: { aff: -2 } },
  ] },
  { id: 'm_lost_item', title: '잃어버린 신발주머니', age: [7, 11], w: 0.03, text: '{n이} 또 신발주머니를 잃어버렸다. 이번 달만 세 번째다.', choices: [
    { label: '이름표를 달아 준다', text: '다음 날 분실물 센터에서 찾았다.', eff: {} },
    { label: '용돈으로 사게 한다', mark: { thrift: 1 }, text: '자기 돈으로 사니 소중히 들고 다닌다.', eff: { mor: 2, cash: -2 } },
  ] },
  { id: 'm_countryside', title: '주말농장', age: [5, 11], w: 0.02, text: '주말농장 체험! {n이} 고구마를 캐 보겠다고 한다.', choices: [
    { label: '온 가족이 간다', cost: 5, mark: { family: 1 }, text: '어른 팔뚝만 한 고구마를 캤다. 저녁은 군고구마.', eff: { hap: 7, hp: 1 } },
  ] },
  // ───────── 중·고등 (13~18) ─────────
  { id: 'm_voice_change', title: '사춘기', age: [12, 15], w: 0.03, once: true, text: '{n}의 방문에 "노크 필수" 종이가 붙었다.', choices: [
    { label: '존중해 준다', mark: { warmth: 1 }, text: '가끔 먼저 말을 걸어 온다.', eff: { aff: 3 } },
    { label: '우리 집에 비밀은 없다', mark: { hurt: 1 }, text: '방문 잠금장치가 생겼다.', eff: { aff: -5 } },
  ] },
  { id: 'm_school_festival', title: '학교 축제', age: [13, 18], w: 0.03, text: '{n}의 반이 축제에서 귀신의 집을 한다.', choices: [
    { label: '구경 간다', mark: { warmth: 1 }, text: '{n이} 분장한 좀비가 제일 무서웠다.', eff: { hap: 6, aff: 2 } },
    { label: '바빠서 못 간다', text: '"다른 부모님은 다 왔는데."', eff: { aff: -3 } },
  ] },
  { id: 'm_phone_broken', title: '액정 박살', age: [12, 18], w: 0.03, text: '{n}의 휴대폰 액정이 거미줄처럼 깨졌다.', choices: [
    { label: '수리해 준다', cost: 20, text: '', eff: { hap: 3 } },
    { label: '용돈으로 고치게 한다', mark: { thrift: 1 }, text: '두 달 동안 군것질을 끊었다.', eff: { mor: 1, hap: -3 } },
  ] },
  { id: 'm_class_fight', title: '단톡방 사건', age: [13, 17], w: 0.03, text: '반 단톡방에서 한 친구를 따돌리는 분위기다. {n}도 그 방에 있다.', choices: [
    { label: '그 친구 편을 들라고 한다', mark: { kind: 2, honest: 1 }, text: '', roll: ['cha', 45, [{ mor: 4, cha: 1 }, '{n}의 한마디에 분위기가 바뀌었다.'], [{ mor: 3, hap: -6 }, '{n}도 같이 눈 밖에 났다. 그래도 옳은 일이었다.']] },
    { label: '괜히 끼지 말라고 한다', text: '{n이} 찝찝한 얼굴로 고개를 끄덕였다.', eff: { mor: -2 } },
  ] },
  { id: 'm_bus_card', title: '첫 해외여행 계획', age: [15, 18], w: 0.02, text: '{n이} 친구들과 졸업 여행으로 일본에 가고 싶어 한다.', choices: [
    { label: '보내 준다', cost: 150, mark: { network: 1 }, text: '돌아와서 한 달 내내 여행 얘기만 했다.', eff: { hap: 10, cha: 1 } },
    { label: '성인 되면 가라', text: '', eff: { hap: -4 } },
  ] },
  { id: 'm_nosebleed', title: '독서실 코피', age: [15, 18], w: 0.03, text: '{n이} 독서실에서 코피를 쏟았다. 요즘 네 시간밖에 안 잔다.', choices: [
    { label: '억지로라도 재운다', mark: { warmth: 1 }, text: '푹 자고 나니 오히려 집중이 잘 된다.', eff: { hp: 3, hap: 3 } },
    { label: '홍삼을 사 준다', cost: 20, text: '', eff: { hp: 1 } },
  ] },
  { id: 'm_career_day', title: '직업 체험', age: [13, 16], w: 0.03, text: '{n}의 학교에서 진로 체험의 날. 어디로 신청할까?', choices: [
    { label: '병원·연구소', mark: { study: 1 }, text: '흰 가운이 멋있어 보였단다.', eff: { int: 1 } },
    { label: '방송국·디자인 회사', mark: { art: 1 }, text: '카메라 앞에 서 보고 들떠서 돌아왔다.', eff: { cha: 1 } },
    { label: '소방서·경찰서', mark: { sport: 1 }, text: '소방차에 올라 사진을 찍었다.', eff: { str: 1 } },
  ] },
  { id: 'm_haircut', title: '셀프 앞머리', age: [12, 17], w: 0.02, text: '{n이} 혼자 앞머리를 자르다 망했다. 학교에 안 가겠다고 한다.', choices: [
    { label: '미용실에 데려간다', cost: 3, text: '"생각보다 괜찮네?" 겨우 기분이 풀렸다.', eff: { hap: 2 } },
    { label: '모자를 빌려준다', mark: { warmth: 1 }, text: '일주일 내내 모자를 썼다.', eff: {} },
  ] },
  { id: 'm_curfew', title: '통금', age: [15, 18], w: 0.03, text: '{n이} 통금 시간을 한 시간 넘겨 들어왔다.', choices: [
    { label: '이유부터 듣는다', mark: { warmth: 1 }, text: '친구가 울어서 달래 주느라 늦었단다.', eff: { aff: 3, mor: 1 } },
    { label: '한 달간 외출 금지', mark: { hurt: 1 }, text: '방에서 한숨 소리가 들린다.', eff: { aff: -4, study: 1 } },
  ] },
  { id: 'm_study_cafe', title: '스터디 카페', age: [14, 18], w: 0.03, text: '{n이} 집에선 집중이 안 된다며 스터디 카페 정기권을 끊어 달란다.', choices: [
    { label: '끊어 준다', cost: 15, mark: { study: 1 }, text: '', roll: ['mor', 40, [{ study: 2 }, '정말로 공부를 한다!'], [{ hap: 3 }, '친구들과 모이는 아지트가 됐다.']] },
    { label: '방을 치워 준다', mark: { warmth: 1 }, text: '책상 위치를 바꾸고 조명을 새로 달았다.', eff: { study: 1 } },
  ] },
  // ───────── 청년 (19~35) ─────────
  { id: 'm_first_apartment', title: '첫 자취방', age: [19, 30], w: 0.02, once: true, cond: (_s, p) => p.flags.includes('indep') || p.flags.includes('student'), text: '{n}의 첫 자취방. 모든 게 낯설고 설렌다.', choices: [
    { label: '집들이를 한다', cost: 20, mark: { network: 1 }, text: '좁은 방에 친구 여덟 명이 끼어 앉았다.', eff: { hap: 8 } },
    { label: '혼자만의 시간을 즐긴다', text: '처음으로 라면을 끓이다 냄비를 태웠다.', eff: { hap: 4 } },
  ] },
  { id: 'm_driver_license', title: '운전면허', age: [19, 30], w: 0.03, once: true, text: '{n}, 운전면허 시험을 본다.', choices: [
    { label: '학원 등록', cost: 70, text: '', roll: ['int', 30, [{ hap: 5 }, '한 번에 합격!'], [{ hap: -3, cash: -10 }, '도로주행에서 떨어졌다. 다시.']] },
  ] },
  { id: 'm_blind_date_friend', title: '친구의 소개', age: [22, 35], w: 0.03, cond: (s, p) => !spouseOf(s, p) && !p.partnerId, text: '친구가 {n}에게 "딱 네 스타일"이라며 소개팅을 주선하겠다고 한다.', choices: [
    { label: '나간다', cost: 5, text: '', roll: ['cha', 50, [{ hap: 6 }, '대화가 잘 통했다. 연락처를 주고받았다.'], [{ hap: -3 }, '"네 스타일"은 무슨. 친구에게 따지고 싶다.']] },
    { label: '지금은 연애할 때가 아니다', text: '', eff: {} },
  ] },
  { id: 'm_concert', title: '페스티벌', age: [19, 35], w: 0.03, text: '{n이} 좋아하는 밴드가 여름 페스티벌 라인업에 올랐다.', choices: [
    { label: '3일권을 끊는다', cost: 30, mark: { network: 1 }, text: '진흙탕에서 뛰며 소리를 질렀다. 목이 쉬었다.', eff: { hap: 10 } },
    { label: '유튜브로 본다', text: '', eff: { hap: 1 } },
  ] },
  { id: 'm_fraud_call', title: '검찰 사칭 전화', age: [20, 35], w: 0.02, text: '"서울중앙지검입니다. {n}님 명의 계좌가 범죄에 연루됐습니다."', choices: [
    { label: '끊고 직접 확인한다', mark: { honest: 1 }, text: '보이스피싱이었다. 신고했다.', eff: { int: 1 } },
    { label: '시키는 대로 한다', text: '', roll: ['int', 55, [{}, '뭔가 이상해서 중간에 끊었다.'], [{ cash: -500, hap: -10 }, '안전 계좌라며 보낸 돈이 사라졌다.']] },
  ] },
  { id: 'm_gym_membership', title: '헬스장 1년권', age: [20, 45], w: 0.02, text: '{n}, 새해 기념 헬스장 1년권 할인에 마음이 흔들린다.', choices: [
    { label: '1년권을 끊는다', cost: 60, text: '', roll: ['mor', 45, [{ str: 2, hp: 2 }, '1년을 꼬박 다녔다! 몸이 달라졌다.'], [{ hap: -2 }, '3월부터 기부 천사가 됐다.']] },
    { label: '홈트로 한다', text: '', roll: ['mor', 50, [{ hp: 1 }, '매일 30분. 꾸준함의 힘.'], [{}, '요가 매트가 먼지를 뒤집어썼다.']] },
  ] },
  // ───────── 부모·가족 (25~60) ─────────
  { id: 'm_kid_sick_night', title: '밤중의 고열', age: [25, 50], w: 0.04, cond: (s, p) => p.childIds.some((id) => s.people[id] && alive(s.people[id]) && age(s, s.people[id]) < 8), text: '새벽 2시, 아이가 39도 고열로 끓는다.', choices: [
    { label: '응급실로 달려간다', cost: 10, mark: { family: 1 }, text: '장염이었다. 수액 맞고 아침에 돌아왔다. 부부 둘 다 반쯤 좀비.', eff: { hp: -1, bond: 2 } },
    { label: '해열제 먹이고 밤새 지킨다', mark: { warmth: 1 }, text: '새벽에 열이 내렸다. 아이 이마에 입을 맞췄다.', eff: { hp: -1 } },
  ] },
  { id: 'm_parents_day', title: '어버이날', age: [25, 60], w: 0.04, cond: (s, p) => [p.fatherId, p.motherId].some((id) => id && s.people[id] && alive(s.people[id])), text: '어버이날이다. {n}, 부모님께 무엇을 할까?', choices: [
    { label: '용돈과 카네이션', cost: 50, mark: { filial: 1 }, text: '"뭘 이런 걸." 하시면서도 봉투를 꼭 쥐셨다.', eff: { hap: 4 } },
    { label: '식사 한 끼 대접', cost: 20, mark: { family: 1 }, text: '오랜만에 온 가족이 둘러앉았다.', eff: { hap: 5 } },
    { label: '전화 한 통', text: '"바쁜데 뭘." 목소리가 조금 서운하시다.', eff: {} },
  ] },
  { id: 'm_kid_school_meeting', title: '학부모 총회', age: [30, 55], w: 0.03, cond: (s, p) => p.childIds.some((id) => s.people[id] && alive(s.people[id]) && age(s, s.people[id]) >= 8 && age(s, s.people[id]) <= 17), text: '아이 학교 학부모 총회. 반 대표를 뽑는데 모두 눈을 피한다.', choices: [
    { label: '손을 든다', mark: { network: 2 }, text: '학부모 단톡방의 방장이 됐다. 정보가 쏟아진다.', eff: { cha: 1, hap: -2 } },
    { label: '고개를 숙인다', text: '', eff: {} },
  ] },
  { id: 'm_couple_fight', title: '치약 전쟁', age: [25, 70], w: 0.03, cond: (s, p) => !!spouseOf(s, p) && alive(spouseOf(s, p)!), text: '치약을 가운데서 짜느냐 끝에서 짜느냐로 {n} 부부가 싸웠다.', choices: [
    { label: '치약 두 개를 산다', text: '평화가 찾아왔다.', eff: { bond: 2 } },
    { label: '끝까지 논리로 이긴다', text: '', roll: ['int', 50, [{ bond: -1 }, '이겼지만 저녁은 혼자 먹었다.'], [{ bond: -4 }, '졌다. 그리고 소파에서 잤다.']] },
  ] },
  { id: 'm_family_photo', title: '가족사진', age: [28, 70], w: 0.03, cond: (_s, p) => p.childIds.length > 0, text: '{n}, 이번 주말 가족사진을 찍을까?', choices: [
    { label: '사진관에서 제대로', cost: 40, mark: { family: 1 }, text: '거실에 커다란 액자가 걸렸다.', eff: { hap: 6 } },
    { label: '셀카로 충분하다', text: '반은 눈을 감았다. 그게 더 우리답다.', eff: { hap: 3 } },
  ] },
  { id: 'm_car_accident_minor', title: '주차장 접촉', age: [25, 75], w: 0.03, text: '{n이} 마트 주차장에서 옆 차를 살짝 긁었다.', choices: [
    { label: '연락처를 남긴다', mark: { honest: 1 }, text: '차주가 "요즘 이런 분 없다"며 수리비를 반만 받았다.', eff: { cash: -30, mor: 2 } },
    { label: '모른 척 떠난다', mark: { cheat: 1 }, text: '', roll: ['luck', 50, [{}, '아무 일도 없었다. …마음 한구석이 찜찜하다.'], [{ cash: -200, fame: -1 }, '블랙박스에 찍혔다. 뺑소니로 신고당했다.']] },
  ] },
  { id: 'm_neighbor_noise', title: '윗집 쿵쿵', age: [25, 80], w: 0.03, text: '윗집에서 밤마다 쿵쿵 소리가 난다. {n}의 가족이 잠을 설친다.', choices: [
    { label: '쪽지와 과일을 들고 올라간다', mark: { kind: 1 }, text: '윗집이 미안해하며 매트를 깔았다. 이웃사촌이 됐다.', eff: { hap: 3 } },
    { label: '관리실에 민원', text: '', roll: ['luck', 50, [{ hap: 2 }, '조용해졌다.'], [{ hap: -5 }, '보복 소음이 시작됐다.']] },
  ] },
  { id: 'm_promotion_party', title: '동기 승진', age: [30, 55], w: 0.03, cond: (_s, p) => !['none', 'parttime', 'pension'].includes(p.job), text: '입사 동기가 먼저 승진했다. 축하 회식 자리다.', choices: [
    { label: '진심으로 축하한다', mark: { network: 1 }, text: '동기가 "다음은 너야"라며 어깨를 두드렸다.', eff: { mor: 2 } },
    { label: '씁쓸해서 일찍 나온다', text: '', eff: { hap: -4 } },
  ] },
  { id: 'm_diet', title: '다이어트', age: [25, 60], w: 0.03, text: '{n}, 건강검진 결과 체중 관리 권고가 나왔다.', choices: [
    { label: '저녁을 샐러드로', mark: { exercise: 1 }, text: '', roll: ['mor', 45, [{ hp: 2, hap: 3 }, '석 달에 7kg 감량!'], [{ hap: -3 }, '사흘 만에 치킨을 시켰다.']] },
    { label: '먹는 낙이 최고다', text: '', eff: { hap: 2, hp: -1 } },
  ] },
  // ───────── 노년 (60~) ─────────
  { id: 'm_reading_glasses', title: '돋보기', age: [55, 75], w: 0.03, once: true, text: '{n}, 휴대폰 글씨가 안 보인다. 팔을 쭉 뻗어도 안 보인다.', choices: [
    { label: '돋보기를 맞춘다', cost: 20, text: '"세상이 이렇게 선명했나."', eff: { hap: 3 } },
    { label: '글씨 크기를 키운다', text: '손주들이 폰을 보고 웃는다.', eff: {} },
  ] },
  { id: 'm_hiking_club', title: '산악회', age: [55, 80], w: 0.03, text: '동네 산악회에서 {n}에게 정기 산행을 같이 가자고 한다.', choices: [
    { label: '매주 따라간다', mark: { exercise: 1, network: 1 }, text: '정상에서 먹는 막걸리 한 잔이 인생의 낙이 됐다.', eff: { hp: 2, hap: 6 } },
    { label: '무릎이 걱정된다', text: '', eff: {} },
  ] },
  { id: 'm_grandkid_call', title: '손주의 영상통화', age: [58, 95], w: 0.04, cond: (s, p) => p.childIds.some((id) => s.people[id]?.childIds.some((g) => s.people[g] && alive(s.people[g]))), text: '손주가 영상통화로 {n}에게 "사랑해요"를 외친다.', choices: [
    { label: '용돈을 보낸다', cost: 10, mark: { warmth: 1 }, text: '손주가 화면 속에서 춤을 춘다.', eff: { hap: 8 } },
    { label: '노래를 불러 준다', text: '손주가 따라 부르다 잠들었다.', eff: { hap: 6 } },
  ] },
  { id: 'm_old_photos', title: '옛 앨범', age: [60, 95], w: 0.03, text: '창고를 정리하다 {n}의 젊은 시절 앨범이 나왔다.', choices: [
    { label: '가족들과 함께 본다', mark: { family: 1 }, text: '"할머니(할아버지) 이때 연예인 같았네!" 한바탕 웃었다.', eff: { hap: 8 } },
    { label: '혼자 조용히 넘겨 본다', text: '먼저 간 친구 얼굴에 한참 머물렀다.', eff: { hap: 2, mor: 1 } },
  ] },
  { id: 'm_senior_romance', title: '황혼의 설렘', age: [65, 90], w: 0.02, cond: (s, p) => !spouseOf(s, p) || !alive(spouseOf(s, p)!), text: '복지관 노래 교실에서 {n}에게 자꾸 말을 거는 사람이 있다.', choices: [
    { label: '차 한잔 한다', text: '오랜만에 설렌다. 자식들은 반반이다.', eff: { hap: 10 } },
    { label: '이 나이에 무슨', text: '', eff: {} },
  ] },
  // ───────── 누구에게나 ─────────
  { id: 'm_lucky_coupon', title: '경품 당첨', age: [10, 90], w: 0.02, text: '{n이} 무심코 응모한 마트 경품에 당첨됐다!', choices: [
    { label: '상품을 받는다', text: '', roll: ['luck', 30, [{ cash: 200, hap: 8 }, '무려 에어프라이어와 상품권 200만 원!'], [{ hap: 3 }, '휴지 한 묶음. 그래도 당첨은 당첨.']] },
  ] },
  { id: 'm_lost_wallet_self', title: '지갑 분실', age: [15, 90], w: 0.02, text: '{n이} 지갑을 잃어버렸다. 신분증, 카드, 현금까지.', choices: [
    { label: '분실 신고부터', mark: { honest: 1 }, text: '', roll: ['luck', 40, [{ hap: 5 }, '다음 날 경찰서에서 연락이 왔다. 그대로 돌아왔다!'], [{ cash: -20, hap: -4 }, '재발급에 하루를 다 썼다.']] },
  ] },
  { id: 'm_stranger_help', title: '길 잃은 할머니', age: [12, 80], w: 0.02, text: '{n}, 길에서 집을 못 찾는 할머니를 만났다.', choices: [
    { label: '집까지 모셔다드린다', mark: { kind: 2 }, text: '할머니가 사탕 한 줌을 쥐여 주셨다.', eff: { mor: 3, hap: 3 } },
    { label: '경찰에 연락한다', mark: { kind: 1 }, text: '가족에게 무사히 인계됐다.', eff: { mor: 1 } },
  ] },
  { id: 'm_blackout_elevator', title: '엘리베이터 고립', age: [10, 85], w: 0.015, text: '{n이} 탄 엘리베이터가 층 사이에 멈췄다.', choices: [
    { label: '비상벨을 누르고 침착하게', text: '20분 만에 구조됐다. 같이 갇힌 이웃과 친해졌다.', eff: { mor: 1 } },
    { label: '패닉', text: '', eff: { hap: -5 } },
  ] },
  { id: 'm_rainbow', title: '쌍무지개', age: [5, 95], w: 0.015, text: '비 갠 오후, 하늘에 쌍무지개가 떴다. {n이} 걸음을 멈췄다.', choices: [
    { label: '사진을 찍어 가족에게 보낸다', mark: { family: 1 }, text: '가족 단톡방에 무지개가 연달아 올라왔다.', eff: { hap: 5 } },
    { label: '소원을 빈다', text: '무슨 소원인지는 비밀이다.', eff: { hap: 3 } },
  ] },
  { id: 'm_book_club', title: '독서 모임', age: [20, 80], w: 0.02, text: '{n}, 동네 도서관 독서 모임에 초대받았다.', choices: [
    { label: '참여한다', mark: { study: 1, network: 1 }, text: '한 달에 한 권. 생각이 넓어진다.', eff: { int: 1, hap: 3 } },
    { label: '책은 혼자 읽는 거다', text: '', eff: {} },
  ] },
];
