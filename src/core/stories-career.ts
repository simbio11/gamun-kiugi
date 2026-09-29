// 길마다 겪는 일: 얇던 전공·수험·직업 트랙을 채우는 이야기. 같은 나이라도 걷는 길에 따라 다른 일이 생긴다.
import type { Story } from './stories';

export const CAREER_STORIES: Story[] = [
  // ───────── 의대생·보건계열·한의대 ─────────
  { id: 'c_med_repeat', title: '유급 위기', age: [20, 30], w: 0.06, tracks: ['u:med'], text: '본과 2학년, {n}의 병리학 성적이 과락 직전이다. 의대는 한 과목만 떨어져도 1년을 다시 다닌다.', choices: [
    { label: '재시험에 모든 걸 건다', mark: { study: 2 }, text: '', roll: ['int', 50, [{ int: 1, hap: 5 }, '재시험 통과. 동기들과 삼겹살로 자축했다.'], [{ hap: -12, flag: 'repeat_year' }, '유급이다. 후배들과 같은 강의실에 앉게 됐다.']] },
    { label: '휴학하고 숨 고르기', mark: { family: 1 }, text: '1년 휴학. 처음으로 의대 밖 세상을 봤다.', eff: { hap: 6, flag: 'repeat_year' } },
  ] },
  { id: 'c_med_major', title: '전공과 선택', age: [24, 32], w: 0.06, tracks: ['u:med', 'w:med'], once: true, text: '인턴이 끝나 간다. {n}의 전공을 정할 때다. 피안성정(피부·안과·성형·정신)이냐, 필수의료냐.', choices: [
    { label: '피부과·안과 (돈과 워라밸)', text: '경쟁이 치열했지만 붙었다. 개원하면 월급이 다를 거라는 말을 들었다.', eff: { hap: 6, cash: 500 } },
    { label: '소아과·흉부외과 (필수의료)', mark: { kind: 2, honest: 1 }, text: '"누군가는 해야 하니까." 밤샘 당직이 기다리지만 후회는 없다.', eff: { mor: 4, hap: 2, fame: 1 } },
    { label: '응급의학과 (현장)', mark: { kind: 1 }, text: '매일이 전쟁이다. 대신 살린 사람의 얼굴이 쌓인다.', eff: { str: 2, mor: 2, hp: -2 } },
  ] },
  { id: 'c_health_kukshi', title: '국시 D-30', age: [21, 28], w: 0.06, tracks: ['u:health'], text: '간호사 국가고시가 한 달 남았다. {n}의 동기 단톡방은 기출 공유로 뜨겁다.', choices: [
    { label: '기출 5개년 3회독', mark: { study: 2 }, text: '', roll: ['int', 40, [{ int: 1, hap: 5 }, '모의고사가 합격선을 넉넉히 넘었다.'], [{ hap: -5 }, '외울수록 헷갈린다.']] },
    { label: '실습 병원에 입사 원서부터', mark: { intern: 1 }, text: '대학병원 서류 합격. 국시만 붙으면 된다.', eff: { hap: 3 } },
  ] },
  { id: 'c_kmd_clinic', title: '한방병원 실습', age: [22, 30], w: 0.06, tracks: ['u:kmd'], text: '한방병원 실습 첫날, {n}에게 교수님이 침을 놓아 보라고 한다.', choices: [
    { label: '떨지 않고 놓는다', text: '', roll: ['mor', 40, [{ cha: 2, hap: 6 }, '"손이 좋다"는 칭찬을 들었다.'], [{ hap: -4 }, '환자가 "아야!" 하고 벌떡 일어났다.']] },
    { label: '한 번만 더 보고 하겠다', text: '신중하다는 평. 대신 순서가 밀렸다.', eff: { mor: 1 } },
  ] },

  // ───────── 경영·인문·일반 ─────────
  { id: 'c_biz_intern', title: '금융권 인턴', age: [21, 28], w: 0.06, tracks: ['u:biz', 'u:hum', 'u:gen'], text: '{n}이 증권사 여름 인턴에 붙었다. 첫날부터 엑셀과 보고서가 쏟아진다.', choices: [
    { label: '매일 마지막으로 퇴근한다', mark: { intern: 2, network: 1 }, text: '', roll: ['int', 45, [{ int: 1, flag: 'intern_offer' }, '전환형 인턴 최종 합격! 졸업하면 바로 입사다.'], [{ hap: -4 }, '열심히는 했는데 전환은 안 됐다. 이력서 한 줄은 남았다.']] },
    { label: '칼퇴하고 사람을 사귄다', mark: { network: 2 }, text: '선배들과 술자리에서 업계 얘기를 잔뜩 들었다.', eff: { cha: 2 } },
  ] },
  { id: 'c_gen_major_doubt', title: '전공이 안 맞아', age: [20, 25], w: 0.05, tracks: ['u:gen', 'u:hum', 'u:biz', 'u:eng'], text: '{n}이 "전공이 나랑 너무 안 맞는다"며 복수전공이나 전과를 고민한다.', choices: [
    { label: '컴퓨터공학 복수전공', mark: { study: 1 }, text: '', roll: ['int', 45, [{ int: 2, hap: 4 }, '코딩이 적성이었다! 개발자 인턴 제안까지 받았다.'], [{ hap: -5 }, '과제가 두 배. 졸업이 한 학기 늦어질 것 같다.']] },
    { label: '지금 전공으로 끝까지', text: '버티다 보니 재미있는 과목도 생겼다.', eff: { mor: 1 } },
    { label: '휴학하고 워홀', cost: 300, mark: { network: 1 }, text: '호주 농장에서 1년. 영어도 늘고 생각도 정리됐다.', eff: { cha: 2, hap: 8 } },
  ] },
  { id: 'c_sea_storm', title: '실습선의 폭풍', age: [20, 26], w: 0.06, tracks: ['u:sea'], text: '{n}이 탄 실습선이 태풍권에 들어섰다. 파도가 선교까지 튄다.', choices: [
    { label: '당직을 끝까지 선다', mark: { honest: 1 }, text: '', roll: ['str', 45, [{ str: 2, mor: 2 }, '선장이 "이제 뱃사람 다 됐다"고 했다.'], [{ hp: -2, hap: -4 }, '구토로 탈진해 선실에 실려 갔다.']] },
    { label: '선배에게 맡기고 배운다', text: '폭풍 속 조타를 옆에서 지켜봤다. 교과서엔 없는 걸 배웠다.', eff: { int: 1 } },
  ] },
  { id: 'c_craft_stage', title: '주방·살롱의 막내', age: [19, 26], w: 0.06, tracks: ['u:craft', 'w:service'], text: '{n}, 막내 생활 6개월째. 양파만 까거나 바닥만 쓸고 있다.', choices: [
    { label: '어깨너머로 다 훔쳐 배운다', mark: { art: 1 }, text: '', roll: ['cha', 40, [{ cha: 2, hap: 5 }, '셰프(원장님)가 처음으로 칼(가위)을 쥐여 줬다.'], [{ hap: -3 }, '"아직 멀었어." 오늘도 설거지.']] },
    { label: '더 좋은 곳으로 옮긴다', text: '', roll: ['luck', 50, [{ hap: 6 }, '옮긴 곳에서 바로 실무를 맡겼다.'], [{ hap: -5 }, '옮긴 곳도 똑같다. 막내는 어디나 막내다.']] },
  ] },

  // ───────── 수험생 ─────────
  { id: 'c_academia_postdoc', title: '포닥 5년 차', age: [30, 45], w: 0.06, tracks: ['x:academia'], text: '교수 임용 공고가 떴다. 한 자리에 지원자가 80명이다. {n}의 포닥 계약은 내년에 끝난다.', choices: [
    { label: '해외 포닥으로 버틴다', mark: { study: 1 }, text: '', roll: ['int', 55, [{ int: 2, fame: 1 }, '미국 연구소에서 톱 저널 논문을 냈다. 국내 대학에서 연락이 왔다.'], [{ hap: -8 }, '비자 문제로 1년 만에 돌아왔다.']] },
    { label: '기업 연구소로 간다', text: '연봉이 두 배가 됐다. 강의실 대신 실험실. 이것도 괜찮다.', eff: { hap: 4, cash: 1500, flag: 'quit_prep' } },
  ] },
  { id: 'c_press_final', title: '방송사 최종 면접', age: [23, 32], w: 0.06, tracks: ['x:press'], text: '{n}, 1,000대 1을 뚫고 방송사 최종 면접. 사장이 묻는다. "우리 뉴스의 문제가 뭐라고 생각하나?"', choices: [
    { label: '날카롭게 비판한다', mark: { honest: 2 }, text: '', roll: ['cha', 55, [{ cha: 2, hap: 6 }, '사장이 웃었다. "배짱 있네."'], [{ hap: -8 }, '면접장 공기가 얼어붙었다.']] },
    { label: '무난하게 답한다', text: '', roll: ['cha', 50, [{ hap: 3 }, '무난했다. 결과를 기다린다.'], [{ hap: -4 }, '기억에 남지 않는 답이었다.']] },
  ] },
  { id: 'c_medlic_fail', title: '국시 불합격', age: [22, 35], w: 0.04, tracks: ['x:medlic'], text: '{n}이 국가고시에서 2점 차로 떨어졌다. 동기들은 이미 병원 출근을 시작했다.', choices: [
    { label: '1년 더 준비한다', mark: { study: 2 }, text: '마음을 다잡았다. 내년엔 넉넉히 붙겠다.', eff: { hap: -6 } },
    { label: '관련 회사에 먼저 취업', text: '의료기기 회사 영업직으로 들어갔다. 국시는 병행하기로.', eff: { cash: 500, hap: -2 } },
  ] },
  { id: 'c_job_ncs', title: 'NCS 필기 시즌', age: [22, 35], w: 0.06, tracks: ['x:job'], text: '공기업 채용 시즌. {n}은 이번 달에만 NCS 필기를 다섯 번 본다.', choices: [
    { label: '전국을 돌며 다 본다', mark: { study: 1 }, text: '', roll: ['int', 45, [{ hap: 6, int: 1 }, '두 곳 필기 합격! 면접 준비에 들어간다.'], [{ hap: -6, cash: -40 }, 'KTX비만 나가고 다 떨어졌다.']] },
    { label: '한 곳만 정해 올인', text: '', roll: ['int', 50, [{ hap: 5 }, '필기 합격. 면접 스터디를 꾸렸다.'], [{ hap: -5 }, '떨어졌다. 다음 공고를 기다린다.']] },
  ] },

  // ───────── 법조·전문직 ─────────
  { id: 'c_legal_pro_bono', title: '국선 변호', age: [28, 65], w: 0.05, tracks: ['w:legal'], text: '돈이 안 되는 국선 사건이 {n}에게 배당됐다. 억울해 보이는 피고인이다.', choices: [
    { label: '밤새 기록을 뒤진다', mark: { honest: 2, kind: 1 }, text: '', roll: ['int', 50, [{ mor: 3, fame: 2 }, '무죄 판결! 피고인 어머니가 법원 복도에서 울며 절했다.'], [{ mor: 2, hap: -4 }, '유죄. 그래도 할 수 있는 건 다 했다.']] },
    { label: '형식적으로 처리한다', text: '다음 사건이 밀려 있다.', eff: { cash: 50 } },
  ] },
  { id: 'c_legal_ai', title: 'AI가 서면을 쓴다', age: [28, 65], w: 0.05, tracks: ['w:legal'], text: '사무실에 법률 AI가 들어왔다. 신입이 하던 판례 검색을 10초에 끝낸다. {n}의 일도 달라질까?', choices: [
    { label: '적극 도입해 사건을 두 배로 받는다', mark: { study: 1 }, text: '', roll: ['int', 45, [{ cash: 2000, int: 1 }, '처리 사건이 늘어 수입이 뛰었다.'], [{ hap: -4, fame: -1 }, 'AI가 만든 가짜 판례를 그대로 냈다가 망신을 샀다.']] },
    { label: '사람만 할 수 있는 일에 집중', mark: { network: 1 }, text: '의뢰인과 마주 앉는 시간을 늘렸다. 신뢰가 쌓인다.', eff: { cha: 2 } },
  ] },
  { id: 'c_legal_scout', title: '대형 로펌 스카우트', age: [30, 55], w: 0.04, tracks: ['w:legal'], text: '대형 로펌에서 {n}에게 파트너 트랙을 제안했다. 연봉은 두 배, 대신 주 80시간.', choices: [
    { label: '간다', text: '명함이 바뀌었다. 집에는 잠만 자러 온다.', eff: { cash: 5000, hap: -4, hp: -2, fame: 1 } },
    { label: '지금 사무실에 남는다', mark: { family: 1 }, text: '저녁을 가족과 먹는 삶을 골랐다.', eff: { hap: 4 } },
  ] },

  // ───────── 의료인 ─────────
  { id: 'c_med_lawsuit', title: '의료 분쟁', age: [30, 65], w: 0.04, tracks: ['w:med'], text: '{n}이 진료한 환자 가족이 의료 과실이라며 소송을 걸었다.', choices: [
    { label: '의료분쟁조정원에 맡긴다', text: '', roll: ['luck', 60, [{ hap: 2 }, '과실 없음으로 결론 났다.'], [{ cash: -1500, hap: -8 }, '일부 배상 판정. 배상책임보험으로 절반을 메웠다.']] },
    { label: '환자 가족을 직접 만난다', mark: { honest: 1 }, text: '', roll: ['cha', 50, [{ mor: 2, hap: 3 }, '오해가 풀렸다. 가족이 소를 취하했다.'], [{ hap: -6 }, '대화가 더 꼬였다.']] },
  ] },
  { id: 'c_med_rural', title: '지역 의료원 제안', age: [35, 65], w: 0.04, tracks: ['w:med'], text: '의사가 없어 문 닫기 직전인 지방 의료원이 {n}에게 연봉 4억을 제시했다.', choices: [
    { label: '내려간다', mark: { kind: 2 }, text: '읍내 사람들이 "우리 선생님"이라 부른다. 서울보다 하늘이 넓다.', eff: { cash: 8000, mor: 3, fame: 2, hap: 3 } },
    { label: '서울에 남는다', text: '가족과 아이 학교가 걸렸다.', eff: {} },
  ] },

  // ───────── 기술·생산 ─────────
  { id: 'c_trade_accident', title: '현장 안전사고', age: [20, 65], w: 0.05, tracks: ['w:trade'], text: '{n}의 현장에서 안전장치가 고장 났는데 반장은 "공정이 밀린다"며 그냥 하라고 한다.', choices: [
    { label: '작업을 멈추고 신고한다', mark: { honest: 2 }, text: '', roll: ['cha', 40, [{ mor: 3, fame: 1 }, '작업 중지권을 썼다. 회사가 설비를 바꿨다. 동료들이 고마워한다.'], [{ hap: -5 }, '"유난 떤다"는 눈총을 받았다. 그래도 아무도 다치지 않았다.']] },
    { label: '조심해서 그냥 한다', text: '', roll: ['luck', 75, [{}, '별일 없이 넘어갔다.'], [{ hp: -8, cash: 500 }, '손가락을 다쳤다. 산재 처리가 됐다.']] },
  ] },
  { id: 'c_trade_union', title: '노조 파업', age: [22, 60], w: 0.04, tracks: ['w:trade', 'w:transport'], text: '임금 협상이 결렬돼 노조가 파업을 결의했다. {n}도 결정해야 한다.', choices: [
    { label: '파업에 참여한다', mark: { network: 1 }, text: '', roll: ['luck', 55, [{ cash: 400, hap: 3 }, '2주 만에 타결. 임금이 5% 올랐다.'], [{ cash: -300, hap: -4 }, '파업이 길어졌다. 무노동 무임금.']] },
    { label: '출근한다', text: '동료들과 사이가 어색해졌다.', eff: { cash: 200, hap: -3 } },
  ] },
  { id: 'c_trade_robot', title: '자동화 라인', age: [25, 60], w: 0.04, tracks: ['w:trade'], text: '{n}의 공장에 로봇 라인이 들어온다. 인원 감축 소문이 돈다.', choices: [
    { label: '로봇 정비 교육을 자원한다', mark: { study: 1, cert: 1 }, text: '', roll: ['int', 40, [{ int: 2, cash: 300 }, '로봇 정비 담당이 됐다. 오히려 수당이 붙었다.'], [{ hap: -3 }, '교육은 받았는데 자리가 안 났다.']] },
    { label: '버틴다', text: '', roll: ['luck', 60, [{}, '감원 명단에서 빠졌다.'], [{ hap: -8, flag: 'laid_off' }, '희망퇴직 명단에 이름이 올랐다.']] },
  ] },

  // ───────── 서비스·운송·기타 직업 ─────────
  { id: 'c_service_review', title: '악성 리뷰', age: [20, 65], w: 0.05, tracks: ['w:service', 'w:owner'], text: '{n}의 가게(매장)에 별점 1개와 함께 "최악"이라는 리뷰가 달렸다. 사실과 다르다.', choices: [
    { label: '정중하게 답글을 단다', mark: { honest: 1 }, text: '', roll: ['cha', 40, [{ cha: 1, hap: 3 }, '답글을 본 단골들이 응원 리뷰를 남겼다.'], [{ hap: -3 }, '답글에 또 답글이 달렸다. 끝이 없다.']] },
    { label: '신고하고 무시한다', text: '며칠 뒤 리뷰가 내려갔다.', eff: {} },
  ] },
  { id: 'c_service_burnout', title: '감정 노동', age: [20, 60], w: 0.05, tracks: ['w:service', 'w:sales', 'w:care'], text: '오늘만 세 번째 폭언. {n}은 웃으며 "죄송합니다"를 반복했다.', choices: [
    { label: '회사에 보호 조치를 요청한다', mark: { honest: 1 }, text: '', roll: ['luck', 50, [{ hap: 4 }, '고객응대근로자 보호법대로 통화 종료 권한이 생겼다.'], [{ hap: -4 }, '"그 정도는 참아야지." 팀장의 한마디가 더 아팠다.']] },
    { label: '심리 상담을 받는다', cost: 20, text: '마음이 조금 가벼워졌다.', eff: { hap: 6 } },
  ] },
  { id: 'c_transport_night', title: '새벽 배송', age: [22, 65], w: 0.05, tracks: ['w:transport'], text: '{n}, 새벽 3시 물류센터. 오늘 배송 물량이 평소의 두 배다.', choices: [
    { label: '다 소화한다', text: '', roll: ['str', 45, [{ cash: 150, str: 1 }, '물량 수당이 두둑하다.'], [{ hp: -3 }, '무릎이 욱신거린다.']] },
    { label: '무리하지 않는다', text: '남은 물량은 동료에게 넘겼다.', eff: { hap: 1 } },
  ] },
  { id: 'c_creator_hate', title: '악플', age: [18, 60], w: 0.05, tracks: ['w:creator', 'w:press', 'w:sport'], text: '{n}의 영상(기사·경기)에 악플이 수백 개 달렸다. 가족까지 욕한다.', choices: [
    { label: '고소한다', cost: 200, mark: { honest: 1 }, text: '', roll: ['luck', 60, [{ hap: 5, fame: 1 }, '악플러들이 벌금형을 받았다. 다른 크리에이터들이 응원했다.'], [{ hap: -3 }, '해외 서버라 신원을 못 찾았다.']] },
    { label: '댓글을 닫고 쉰다', text: '한 달 쉬었다. 돌아오니 구독자가 조금 빠졌지만 마음은 편하다.', eff: { hap: 4, fame: -1 } },
  ] },
  { id: 'c_edu_student', title: '마음 아픈 제자', age: [25, 65], w: 0.05, tracks: ['w:edu'], text: '{n}의 학생 하나가 요즘 밥을 굶고 온다. 집에 사정이 있는 것 같다.', choices: [
    { label: '조용히 챙긴다', mark: { kind: 2 }, text: '교무실 서랍에 빵과 우유를 넣어 두었다. 졸업식 날 편지를 받았다.', eff: { mor: 3, hap: 4, cash: -10 } },
    { label: '복지 기관에 연결한다', mark: { honest: 1 }, text: '아동보호전문기관과 연결했다. 학생 가정에 지원이 들어갔다.', eff: { mor: 2 } },
  ] },
  { id: 'c_public_complaint', title: '악성 민원', age: [22, 62], w: 0.05, tracks: ['w:public'], text: '같은 민원인이 {n}에게 석 달째 매일 전화한다. 오늘은 "잘라 버리겠다"고 했다.', choices: [
    { label: '규정대로 끝까지 응대', mark: { honest: 1 }, text: '', roll: ['mor', 45, [{ mor: 2 }, '민원인이 결국 "고생하셨다"며 전화를 끊었다.'], [{ hap: -8, hp: -2 }, '스트레스로 원형 탈모가 생겼다.']] },
    { label: '다른 부서로 전보 신청', text: '새 부서에서 새로 시작한다.', eff: { hap: 3 } },
  ] },
  { id: 'c_office_restructure', title: '조직 개편', age: [28, 58], w: 0.05, tracks: ['w:office', 'w:finance'], text: '회사가 합병된다. {n}의 팀이 통째로 없어질 수도 있다.', choices: [
    { label: '신사업 TF에 자원한다', mark: { network: 1 }, text: '', roll: ['cha', 50, [{ cha: 2, cash: 500 }, 'TF가 성공했다. 새 조직의 핵심 멤버가 됐다.'], [{ hap: -5 }, 'TF가 해체됐다. 다시 원점이다.']] },
    { label: '이직 준비를 시작한다', text: '헤드헌터에게 이력서를 보냈다.', eff: { hap: -2 } },
    { label: '조용히 기다린다', text: '', roll: ['luck', 60, [{}, '팀은 살아남았다.'], [{ hap: -8, flag: 'laid_off' }, '희망퇴직 대상자 명단에 올랐다.']] },
  ] },
  { id: 'c_farm_weather', title: '이상 기후', age: [25, 80], w: 0.05, tracks: ['w:farm'], text: '올여름 폭우와 폭염이 번갈아 온다. {n}의 작물이 위험하다.', choices: [
    { label: '농작물 재해보험을 든다', cost: 100, text: '', roll: ['luck', 50, [{ hap: 2 }, '다행히 큰 피해는 없었다.'], [{ cash: 800, hap: -3 }, '수확 절반이 날아갔다. 보험금으로 겨우 버틴다.']] },
    { label: '하늘에 맡긴다', text: '', roll: ['luck', 55, [{ cash: 300 }, '풍년이다! 값도 좋다.'], [{ cash: -1000, hap: -8 }, '한 해 농사를 망쳤다.']] },
  ] },
  { id: 'c_uniform_rescue', title: '출동', age: [22, 60], w: 0.05, tracks: ['w:uniform'], text: '새벽 2시 출동 벨. {n}의 관할에서 큰불(사건)이 났다.', choices: [
    { label: '앞장선다', mark: { honest: 1, kind: 1 }, text: '', roll: ['str', 50, [{ fame: 2, mor: 3 }, '아이 둘을 구해 냈다. 표창을 받았다.'], [{ hp: -6, hap: -4 }, '연기를 마셔 병원에 실려 갔다.']] },
    { label: '매뉴얼대로 침착하게', text: '팀과 함께 무사히 상황을 정리했다.', eff: { mor: 1 } },
  ] },
];
