// 길(전공·직업)에 맞는 이야기. 의대생에게는 해부학 실습이, 교사에게는 학부모 민원이 찾아온다.
// 몇몇은 later 로 몇 년 뒤 이어진다 (w: 0 이야기는 예약으로만 도착).
import type { Story } from './stories';
import { hasFlag, spouseOf, alive } from './people';
import { PAY } from './pay';

export const PATH_STORIES: Story[] = [
  // ───────── 의대·치대·수의대·약대 ─────────
  { id: 'cadaver', title: '해부학 실습', age: [19, 27], w: 0.08, once: true, paths: ['med'], student: true, text: '{n}의 첫 해부학 실습. 기증자께 묵념을 올리고 메스를 든다.', choices: [
    { label: '끝까지 집중한다', mark: { study: 1 }, text: '', roll: ['mor', 35, [{ int: 2, mor: 3 }, '생명의 무게를 배웠다. 의사가 되겠다는 마음이 단단해졌다.'], [{ hap: -6 }, '실습실을 뛰쳐나가 구역질을 했다. 동기들이 등을 두드려 줬다.']] },
    { label: '족보부터 챙긴다', mark: { cheat: 1 }, text: '시험은 넘겼지만 뭔가 중요한 걸 놓친 기분이다.', eff: { study: 2 } },
  ] },
  { id: 'med_fail', title: '유급 위기', age: [20, 28], w: 0.05, paths: ['med'], student: true, text: '{n}, 본과 시험에서 과락이 두 과목. 재시험에서 떨어지면 유급이다.', choices: [
    { label: '일주일 밤을 새운다', mark: { study: 1, health_x: 1 }, text: '', roll: ['int', 55, [{ hp: -3, mor: 2 }, '재시험 통과! 동기들과 부둥켜안았다.'], [{ hp: -3, hap: -12, flag: 'repeat_year' }, '유급. 1년 뒤 후배들과 같은 강의실에 앉는다.']] },
    { label: '휴학을 고민한다', mark: { hurt: 1 }, text: '"내가 정말 의사를 하고 싶은 걸까." 긴 밤이 이어졌다.', eff: { hap: -6, mor: 1 } },
  ] },
  { id: 'med_volunteer', title: '의료 봉사', age: [20, 30], w: 0.04, paths: ['med', 'kmd', 'nurse'], student: true, text: '{n}, 방학에 해외 의료 봉사단에 지원할까?', choices: [
    { label: '떠난다', cost: 200, mark: { kind: 2 }, text: '흙바닥 진료소에서 열흘. 아이가 웃으며 손을 흔들어 줬다.', eff: { mor: 4, hap: 8, cha: 1 } },
    { label: '국시 공부를 한다', mark: { study: 1 }, text: '', eff: { study: 2 } },
  ] },
  { id: 'specialty', title: '전공과 선택', age: [25, 33], w: 0.1, once: true, cond: (_s, p) => p.job === 'doctor', text: '인턴을 마친 {n}, 어떤 과를 전공할까?', choices: [
    { label: '피부과·안과 (돈과 워라밸)', mark: { spend: 1 }, text: '', roll: ['int', 70, [{ hap: 6, flag: 'derm' }, '경쟁을 뚫고 인기과에 들어갔다. 미래가 밝다.'], [{ hap: -5 }, '떨어졌다. 1년 더 기다려야 한다.']] },
    { label: '흉부외과·소아과 (필수의료)', mark: { kind: 2 }, text: '"그래도 누군가는 해야지." 당직이 끝없다.', eff: { mor: 5, hp: -3, fame: 2, flag: 'essential_md' } },
    { label: '내과 (무난하게)', text: '환자를 가장 많이 만나는 과. 바쁘지만 보람 있다.', eff: { mor: 2 } },
  ] },
  { id: 'night_duty', title: '36시간 당직', age: [24, 40], w: 0.05, cond: (_s, p) => p.job === 'doctor' && p.jobLevel <= 1, text: '{n}, 36시간째 당직이다. 응급실에 교통사고 환자가 들어왔다.', choices: [
    { label: '버텨서 살린다', mark: { kind: 1 }, text: '', roll: ['hp', 40, [{ mor: 3, fame: 1 }, '수술이 끝났다. 환자가 눈을 떴다. 이 맛에 버틴다.'], [{ hp: -6, hap: -6 }, '살렸지만 {n}도 쓰러졌다. 링거를 꽂고 잤다.']] },
    { label: '윗년차를 부른다', text: '"이런 건 혼자 하지 마." 선배가 함께해 줬다.', eff: { mor: 1 } },
  ] },
  { id: 'malpractice', title: '의료 분쟁', age: [30, 70], w: 0.02, cond: (_s, p) => ['doctor', 'dentist', 'kmd'].includes(p.job), text: '{n이} 치료한 환자 가족이 의료 과실이라며 소송을 걸었다.', choices: [
    { label: '끝까지 다툰다', cost: 1000, text: '', roll: ['int', 50, [{ hap: 3 }, '무혐의. 기록이 {n을} 지켜 줬다.'], [{ cash: -5000, fame: -3, hap: -10 }, '패소. 배상금을 물고 기사까지 났다.']] },
    { label: '합의한다', cost: 2000, text: '마음이 무겁지만 조용히 끝냈다.', eff: { hap: -5 } },
  ] },
  { id: 'open_clinic', title: '개원·개업', age: [30, 60], w: 0.06, cond: (_s, p) => {
    const d = PAY[p.job];
    return !!d && d.open !== undefined && p.jobLevel === d.open - 1 && p.jobYears >= 3 && !p.flags.some((f) => f.startsWith('serving:'));
  }, text: '{n}, 남 밑에서 월급을 받을까, 대출을 끼고 내 병원·약국·사무소를 차릴까?\n(개업하면 수입이 훨씬 커질 수 있지만 해마다 크게 출렁이고, 망할 수도 있다)', choices: [
    { label: '대출 받아 개업한다', cost: 5000, mark: { risk: 1 }, text: '', roll: ['cha', 45, [{ hap: 10, fame: 2, flag: 'open_clinic' }, '개업식 화환이 줄을 섰다. 첫 달부터 손님이 꽉 찼다.'], [{ cash: -5000, hap: -6, flag: 'open_clinic' }, '문은 열었지만 자리를 잘못 잡았다. 인테리어 대출이 무겁다.']] },
    { label: '월급이 안정적이다', text: '매달 같은 날 들어오는 월급이 최고다.', eff: { hap: 2 } },
  ] },
  { id: 'thank_letter', title: '감사 편지', age: [28, 75], w: 0.03, paths: ['med', 'kmd', 'nurse'], student: false, text: '{n}에게 손글씨 편지가 왔다. 몇 년 전 치료한 환자다.', choices: [
    { label: '읽는다', text: '"선생님 덕분에 딸 결혼식을 봤습니다." 한참을 읽고 또 읽었다.', eff: { hap: 10, mor: 2 } },
  ] },
  // ───────── 한의대·한의사 ─────────
  { id: 'acupuncture', title: '침 실습', age: [19, 27], w: 0.08, once: true, paths: ['kmd'], student: true, text: '{n}, 오늘은 동기 팔에 직접 침을 놓는 실습이다.', choices: [
    { label: '과감하게 놓는다', text: '', roll: ['int', 40, [{ int: 2, hap: 5 }, '정확히 혈자리에! 교수님이 고개를 끄덕였다.'], [{ hap: -4 }, '동기가 비명을 질렀다. 연습이 더 필요하다.']] },
    { label: '먼저 내 팔에 놓아 본다', mark: { honest: 1 }, text: '아프다. 환자 마음을 알게 됐다.', eff: { mor: 3 } },
  ] },
  { id: 'herb_garden', title: '약초 답사', age: [19, 27], w: 0.05, paths: ['kmd'], student: true, text: '{n}의 과에서 지리산 약초 답사를 간다.', choices: [
    { label: '따라간다', mark: { exercise: 1 }, text: '산을 오르며 약초 백 가지를 외웠다. 다리는 후들거린다.', eff: { int: 2, str: 1, hap: 4 } },
    { label: '빠지고 공부한다', text: '', eff: { study: 1 } },
  ] },
  { id: 'kmd_clinic', title: '한의원 운영', age: [30, 65], w: 0.04, cond: (_s, p) => p.job === 'kmd', text: '{n}의 한의원, 요즘 다이어트 한약 문의가 많다.', choices: [
    { label: '다이어트 한약을 앞세운다', mark: { spend: 1 }, text: '', roll: ['cha', 45, [{ cash: 3000, hap: 4 }, '입소문이 나서 매출이 늘었다.'], [{ fame: -1 }, '효과 없다는 후기가 올라왔다.']] },
    { label: '추나·침 치료에 집중한다', mark: { honest: 1 }, text: '단골 어르신들이 늘었다.', eff: { cash: 1200, mor: 2 } },
  ] },
  // ───────── 간호·보건 ─────────
  { id: 'taeum', title: '태움', age: [21, 35], w: 0.05, paths: ['nurse'], student: false, text: '{n}, 신규 간호사. 선배의 "태움"이 매일 계속된다.', choices: [
    { label: '버틴다', mark: { hurt: 1 }, text: '', roll: ['mor', 45, [{ mor: 3 }, '1년을 버텼다. 이제 후배를 따뜻하게 가르치는 선배가 되기로 했다.'], [{ hap: -12, hp: -3 }, '매일 밤 울었다. 사직서를 품고 다닌다.']] },
    { label: '신고한다', mark: { honest: 1 }, text: '병동 분위기가 바뀌었다. 다음 신규는 조금 편해지겠지.', eff: { mor: 3, hap: -3 } },
    { label: '다른 병원으로 옮긴다', text: '새 병원은 분위기가 좋다.', eff: { hap: 6 } },
  ] },
  { id: 'three_shift', title: '3교대', age: [21, 50], w: 0.04, paths: ['nurse'], student: false, text: '{n}, 나이트 근무가 연속 닷새째다. 낮밤이 뒤집혔다.', choices: [
    { label: '버틴다', mark: { health_x: 1 }, text: '', eff: { hp: -3, hap: -3, cash: 150 } },
    { label: '상담직·외래로 옮긴다', text: '월급은 줄었지만 저녁이 생겼다.', eff: { hap: 6, cash: -300 } },
  ] },
  // ───────── 법·행정 ─────────
  { id: 'moot_court', title: '모의재판', age: [20, 30], w: 0.05, paths: ['law'], student: true, text: '{n}, 모의재판 경연대회에 변호인으로 나간다.', choices: [
    { label: '밤새 변론서를 쓴다', mark: { study: 1 }, text: '', roll: ['int', 50, [{ int: 3, cha: 2, fame: 1 }, '우승! 현직 판사님께 명함을 받았다.'], [{ int: 1 }, '준우승. 반박을 예상 못 했다.']] },
    { label: '시험 공부에 집중한다', text: '', eff: { study: 2 } },
  ] },
  { id: 'first_case', title: '첫 사건', age: [25, 40], w: 0.05, cond: (_s, p) => ['lawyer', 'prosecutor', 'judge'].includes(p.job), text: '{n}의 첫 사건. 억울하다는 의뢰인이 울며 찾아왔다.', choices: [
    { label: '국선이라도 최선을 다한다', mark: { kind: 1, honest: 1 }, text: '', roll: ['int', 50, [{ fame: 3, mor: 3 }, '무죄 판결! 의뢰인 어머니가 {n}의 손을 잡고 우셨다.'], [{ hap: -5 }, '졌다. 법의 한계를 처음 느꼈다.']] },
    { label: '돈 되는 사건 위주로', mark: { spend: 1 }, text: '수임료가 쏠쏠하다. 마음 한구석이 비어 간다.', eff: { cash: 2000, mor: -2 } },
  ] },
  { id: 'bribe', title: '청탁', age: [28, 65], w: 0.02, paths: ['law', 'public'], student: false, text: '{n}에게 누군가 두툼한 봉투를 내밀며 "잘 좀 봐 달라"고 한다.', choices: [
    { label: '단호히 거절한다', mark: { honest: 2 }, text: '돌려보냈다. 떳떳하다.', eff: { mor: 4 } },
    { label: '받는다', mark: { cheat: 2 }, text: '', roll: ['luck', 60, [{ cash: 3000, mor: -6 }, '아무도 모른다. …지금은.'], [{ cash: -1000, fame: -10, flag: 'scandal', hap: -15 }, '감찰에 걸렸다. 징계에 언론 보도까지.']] },
  ] },
  // ───────── 교육 ─────────
  { id: 'teaching_practice', title: '교생 실습', age: [21, 27], w: 0.1, once: true, paths: ['edu'], student: true, text: '{n}의 교생 실습. 아이들이 "선생님!" 하고 부른다.', choices: [
    { label: '온 마음으로 가르친다', mark: { kind: 1 }, text: '', roll: ['cha', 40, [{ cha: 3, hap: 10 }, '마지막 날, 아이들이 롤링페이퍼를 줬다. 선생님이 될 이유가 생겼다.'], [{ hap: -4 }, '수업 시연을 망쳤다. 지도교사의 표정이 어둡다.']] },
    { label: '대충 시간만 채운다', text: '실습 일지만 두껍다.', eff: {} },
  ] },
  { id: 'parent_complaint', title: '학부모 민원', age: [24, 62], w: 0.05, cond: (_s, p) => ['teacher', 'elem_teacher', 'kinder_teacher', 'professor'].includes(p.job) || p.job.includes('teacher'), text: '{n}에게 학부모가 밤 11시에 전화해 "우리 애만 차별한다"며 따진다.', choices: [
    { label: '차분히 설명한다', text: '', roll: ['cha', 45, [{ mor: 2 }, '오해가 풀렸다. 다음 날 커피 한 잔이 왔다.'], [{ hap: -8 }, '교육청에 민원이 들어갔다. 경위서를 썼다.']] },
    { label: '교권보호위원회에 알린다', mark: { honest: 1 }, text: '학교가 나서 줬다. 조금은 숨이 쉬어진다.', eff: { hap: -2 } },
  ] },
  { id: 'student_letter', title: '제자', age: [35, 80], w: 0.03, cond: (_s, p) => p.job.includes('teacher') || p.job === 'professor' || hasFlag(p, 'was_teacher'), text: '스승의 날, {n}에게 20년 전 제자가 찾아왔다.', choices: [
    { label: '반갑게 맞는다', text: '"선생님 덕분에 버텼어요." 제자는 이제 의젓한 어른이다.', eff: { hap: 12, mor: 2 } },
  ] },
  // ───────── IT·공학 ─────────
  { id: 'hackathon', title: '해커톤', age: [19, 32], w: 0.05, paths: ['tech'], text: '{n}, 무박 2일 해커톤에 나간다.', choices: [
    { label: '밤새 코딩한다', mark: { study: 1, network: 1 }, cost: 5, text: '', roll: ['int', 50, [{ int: 3, fame: 1, hap: 8 }, '대상! 투자사 명함을 세 장 받았다.'], [{ hp: -2, int: 1 }, '데모 직전에 서버가 터졌다. 그래도 많이 배웠다.']] },
    { label: '구경만 한다', text: '', eff: { int: 1 } },
  ] },
  { id: 'deploy_fail', title: '배포 장애', age: [23, 55], w: 0.04, paths: ['tech'], student: false, text: '금요일 밤 11시, {n이} 배포한 코드 때문에 서비스가 멈췄다.', choices: [
    { label: '밤새 롤백하고 고친다', text: '', roll: ['int', 45, [{ mor: 2 }, '새벽 4시, 복구 완료. 팀장이 치킨을 쐈다.'], [{ hap: -8, hp: -2 }, '주말 내내 장애 보고서를 썼다.']] },
    { label: '"제 탓이 아닙니다"', mark: { cheat: 1 }, text: '분위기가 싸해졌다.', eff: { cha: -1 } },
  ] },
  { id: 'startup_offer', title: '스타트업 합류 제안', age: [26, 45], w: 0.03, paths: ['tech', 'biz'], student: false, text: '대학 동기가 {n}에게 스타트업 공동창업을 제안한다. 지분 20%.', choices: [
    { label: '회사를 그만두고 합류한다', mark: { risk: 2 }, text: '', roll: ['luck', 20, [{ cash: 30000, fame: 4, hap: 15 }, '4년 뒤 회사가 인수됐다! 지분이 30억이 됐다.'], [{ cash: -3000, hap: -8 }, '2년 만에 문을 닫았다. 그래도 배운 건 많다.']] },
    { label: '월급쟁이가 낫다', text: '안정이 최고다. 가끔 궁금하긴 하다.', eff: {} },
  ] },
  { id: 'patent', title: '특허', age: [26, 60], w: 0.02, paths: ['tech'], student: false, text: '{n이} 낸 아이디어가 사내 특허로 출원됐다.', choices: [
    { label: '직무발명 보상을 요구한다', text: '', roll: ['cha', 45, [{ cash: 2000, hap: 5 }, '보상금이 나왔다!'], [{ hap: -4 }, '"회사 자원으로 한 일"이라며 거절당했다.']] },
    { label: '이력서 한 줄로 만족한다', text: '', eff: { int: 1 } },
  ] },
  // ───────── 경영·경제·사무 ─────────
  { id: 'startup_club', title: '창업 동아리', age: [19, 26], w: 0.04, paths: ['biz'], student: true, text: '{n}, 창업 동아리에서 아이템을 정했다. "캠퍼스 중고거래 앱"!', choices: [
    { label: '정부 지원금에 도전', mark: { network: 1, risk: 1 }, text: '', roll: ['int', 55, [{ cash: 500, fame: 1, int: 2 }, '예비창업패키지 선정! 사업자등록증이 생겼다.'], [{ hap: -3 }, '서류 탈락. 다음 공고를 기다린다.']] },
    { label: '경험으로 만족', text: '', eff: { cha: 1 } },
  ] },
  { id: 'stock_club', title: '투자 동아리', age: [19, 27], w: 0.04, paths: ['biz'], student: true, text: '{n}의 투자 동아리에서 모의투자 대회가 열렸다.', choices: [
    { label: '과감하게 몰빵', mark: { risk: 1 }, text: '', roll: ['luck', 35, [{ int: 2, hap: 6 }, '수익률 1등!'], [{ hap: -3 }, '-40%. 실전이 아니라 다행이다.']] },
    { label: '분산투자', mark: { thrift: 1 }, text: '꾸준히 중상위권. 원칙을 배웠다.', eff: { int: 2 } },
  ] },
  { id: 'performance_review', title: '인사 고과', age: [26, 58], w: 0.04, paths: ['office', 'biz'], student: false, text: '연말 인사 고과 시즌. {n}의 팀장이 면담을 하자고 한다.', choices: [
    { label: '성과를 조목조목 어필한다', text: '', roll: ['cha', 50, [{ cash: 500, hap: 5 }, 'S등급! 성과급이 나왔다.'], [{ hap: -5 }, 'B등급. 팀장의 사람은 따로 있었다.']] },
    { label: '조용히 받아들인다', text: '평범한 등급. 무난하다.', eff: {} },
  ] },
  // ───────── 예술·미디어 ─────────
  { id: 'grad_show', title: '졸업 전시·공연', age: [21, 27], w: 0.08, once: true, paths: ['art'], student: true, text: '{n}의 졸업 작품 발표가 다가온다.', choices: [
    { label: '모든 걸 쏟아붓는다', cost: 300, mark: { art: 2 }, text: '', roll: ['cha', 50, [{ cha: 4, fame: 2, hap: 10 }, '관계자 눈에 띄었다! 연락이 왔다.'], [{ hap: -4 }, '반응이 미지근했다. 그래도 끝까지 해냈다.']] },
    { label: '무난하게 마무리', text: '', eff: { cha: 1 } },
  ] },
  { id: 'audition', title: '오디션', age: [16, 30], w: 0.04, paths: ['art'], text: '{n}, 큰 기획사 오디션 공고가 떴다.', choices: [
    { label: '지원한다', mark: { art: 1 }, text: '', roll: ['cha', 60, [{ cha: 3, fame: 2, hap: 12, flag: 'audition_pass' }, '최종 합격! 연습생 계약서를 받았다.'], [{ hap: -6 }, '1차 탈락. "다음에 또 봐요."']] },
    { label: '아직 준비가 안 됐다', text: '', eff: {} },
  ] },
  { id: 'art_poverty', title: '예술가의 통장', age: [24, 45], w: 0.03, paths: ['art'], student: false, text: '{n}의 통장 잔고가 바닥이다. 작업을 계속할 수 있을까?', choices: [
    { label: '알바하며 버틴다', mark: { art: 1 }, text: '낮엔 알바, 밤엔 작업. 꿈은 포기하지 않는다.', eff: { cash: 400, hp: -2 } },
    { label: '회사에 들어간다', text: '디자인 회사에 취직했다. 안정은 됐지만 작업 시간은 줄었다.', eff: { cash: 1500, hap: -4 } },
  ] },
  // ───────── 스포츠 ─────────
  { id: 'sports_injury', title: '부상', age: [16, 38], w: 0.05, paths: ['sport'], text: '{n}, 경기 중 무릎을 다쳤다. 전방 십자인대 파열.', choices: [
    { label: '수술하고 재활한다', cost: 800, text: '', roll: ['hp', 45, [{ str: -2 }, '1년의 재활 끝에 복귀했다!'], [{ str: -8, hap: -12 }, '예전 같지 않다. 은퇴를 고민한다.']] },
    { label: '주사 맞고 뛴다', mark: { health_x: 2 }, text: '', roll: ['luck', 40, [{}, '버텼다. 시즌을 마쳤다.'], [{ str: -10, hp: -5, hap: -15 }, '더 크게 다쳤다. 선수 생명이 위태롭다.']] },
  ] },
  { id: 'national_team', title: '국가대표 선발전', age: [18, 32], w: 0.03, paths: ['sport'], student: false, text: '{n}, 국가대표 선발전에 나간다.', choices: [
    { label: '모든 걸 건다', mark: { sport: 2 }, text: '', roll: ['str', 70, [{ fame: 5, hap: 15, flag: 'national_team' }, '태극마크를 달았다!'], [{ hap: -8 }, '0.1초 차로 떨어졌다. 4년을 또 기다린다.']] },
  ] },
  // ───────── 공무원·경찰·소방 ─────────
  { id: 'civil_complaint', title: '악성 민원', age: [22, 62], w: 0.04, paths: ['public'], student: false, text: '{n}의 창구에 매일 같은 민원인이 와서 소리를 지른다.', choices: [
    { label: '끝까지 친절하게', mark: { kind: 1 }, text: '', roll: ['mor', 50, [{ mor: 3 }, '어느 날 그분이 음료수를 두고 갔다.'], [{ hap: -8 }, '결국 {n이} 병가를 냈다.']] },
    { label: '규정대로 선을 긋는다', text: '보안요원이 나섰다. 조용해졌다.', eff: { hap: -2 } },
  ] },
  { id: 'disaster_call', title: '재난 출동', age: [22, 60], w: 0.03, cond: (_s, p) => ['firefighter', 'police'].includes(p.job), text: '큰불이 났다. {n}, 건물 안에 사람이 남아 있다는 무전이 온다.', choices: [
    { label: '들어간다', mark: { kind: 2 }, text: '', roll: ['str', 50, [{ fame: 6, mor: 5, flag: 'hero' }, '아이를 안고 나왔다. 뉴스에 이름이 나왔다.'], [{ hp: -12, fame: 3 }, '구조는 성공했지만 {n이} 화상을 입었다.']] },
    { label: '진입 명령을 기다린다', text: '팀이 함께 진입해 모두 구했다.', eff: { mor: 1 } },
  ] },
  // ───────── 군 복무 중 ─────────
  { id: 'boot_camp', title: '훈련소', age: [19, 29], w: 0.2, once: true, paths: ['soldier'], text: '{n}의 훈련소 5주 차. 행군이 기다린다.', choices: [
    { label: '분대장을 맡는다', mark: { network: 1 }, text: '', roll: ['str', 40, [{ str: 3, cha: 2 }, '우수 훈련병 표창! 포상 휴가를 받았다.'], [{ hap: -4 }, '분대원이 낙오해 같이 혼났다.']] },
    { label: '묵묵히 버틴다', text: '물집 잡힌 발로 완주했다.', eff: { str: 2, mor: 1 } },
  ] },
  { id: 'army_vacation', title: '휴가', age: [19, 30], w: 0.12, paths: ['soldier'], text: '{n}, 기다리던 휴가를 나왔다!', choices: [
    { label: '가족과 보낸다', mark: { family: 1 }, text: '엄마 밥을 세 그릇 먹었다.', eff: { hap: 10, aff: 5 } },
    { label: '친구들과 밤새 논다', mark: { network: 1 }, text: '복귀 날 아침, 세상이 끝나는 기분이었다.', eff: { hap: 8 } },
  ] },
  { id: 'senior_bully', title: '부조리', age: [19, 29], w: 0.05, paths: ['soldier'], cond: (_s, p) => !p.flags.includes('public_doctor') && !p.flags.includes('army_doctor'), text: '{n}의 선임이 부조리를 일삼는다.', choices: [
    { label: '마음의 편지로 신고한다', mark: { honest: 1 }, text: '', roll: ['luck', 60, [{ mor: 3 }, '선임이 전출됐다. 생활관이 조용해졌다.'], [{ hap: -8 }, '누가 신고했는지 소문이 났다. 한동안 힘들었다.']] },
    { label: '참는다', mark: { hurt: 1 }, text: '"나는 저러지 말아야지." 다짐했다.', eff: { hap: -5, mor: 2 } },
  ] },
  { id: 'rural_clinic', title: '섬마을 보건지소', age: [25, 35], w: 0.15, cond: (_s, p) => p.flags.includes('public_doctor') && p.flags.some((f) => f.startsWith('serving:')), text: '공중보건의 {n}. 배가 끊겨 섬에 갇혔는데, 할머니가 쓰러지셨다는 연락이 왔다.', choices: [
    { label: '밤길을 달려간다', mark: { kind: 2 }, text: '', roll: ['int', 40, [{ mor: 4, fame: 1, hap: 6 }, '응급처치로 고비를 넘겼다. 다음 날 마을 잔치가 열렸다.'], [{ hap: -8 }, '헬기가 올 때까지 버텼다. 할머니는 육지 병원으로 가셨다.']] },
  ] },
  // ───────── 취준·백수 ─────────
  { id: 'job_rejections', title: '서류 광탈', age: [23, 32], w: 0.06, cond: (_s, p) => p.job === 'none' && !p.flags.includes('student') && !p.flags.some((f) => f.startsWith('prep:') || f.startsWith('serving:')), text: '{n}, 이번 달에만 서류 탈락 문자가 열두 통이다.', choices: [
    { label: '자소서를 갈아엎는다', mark: { study: 1 }, text: '', roll: ['int', 45, [{ int: 1, hap: 3, flag: 'resume_fixed' }, '면접 연락이 왔다!'], [{ hap: -6 }, '또 떨어졌다. 그래도 한 줄은 나아졌다.']] },
    { label: '잠시 쉬어 간다', text: '한 달 동안 여행을 다녀왔다. 머리가 맑아졌다.', eff: { hap: 6, cash: -200 } },
    { label: '눈높이를 낮춘다', text: '중소기업 면접을 보기로 했다.', eff: { hap: -2 } },
  ] },
  { id: 'parents_nag', title: '명절 잔소리', age: [24, 35], w: 0.05, cond: (s, p) => (p.job === 'none' || !spouseOf(s, p)) && !p.flags.includes('student') && s.people[p.fatherId ?? '']?.deathYear === undefined, text: '명절, 친척들이 {n}에게 묻는다. "취업은?" "결혼은?"', choices: [
    { label: '웃으며 넘긴다', text: '용돈 봉투를 받았다. 버틴 보람이 있다.', eff: { cash: 30, hap: -2 } },
    { label: '방에 들어가 버린다', mark: { hurt: 1 }, text: '분위기가 싸해졌다.', eff: { aff: -4 } },
    { label: '명절에 안 간다', text: '혼자 편의점 도시락을 먹었다. 편하지만 쓸쓸하다.', eff: { hap: -3 } },
  ] },
  { id: 'marriage_single_life', title: '비혼', age: [33, 45], w: 0.02, once: true, cond: (s, p) => !spouseOf(s, p) && !p.partnerId && alive(p), text: '{n}, 요즘 혼자 사는 삶도 나쁘지 않다는 생각이 든다.', choices: [
    { label: '비혼을 선언한다', text: '홀가분하다. 대신 가문의 대는 다른 방법으로 잇게 될 것이다.', eff: { hap: 6, flag: 'single_life' } },
    { label: '아직 인연을 기다린다', text: '', eff: {} },
  ] },
];
