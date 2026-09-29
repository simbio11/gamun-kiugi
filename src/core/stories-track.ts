// 트랙(전공·시험·직업 그룹)별 이야기: 공시생·경찰 준비생·로스쿨생·사장님·농부·기사님… 각자의 하루.
import type { Story } from './stories';

export const TRACK_STORIES: Story[] = [
  // ───────── 수험생 ─────────
  { id: 'nory_cupbap', title: '노량진의 밤', age: [20, 40], w: 0.06, tracks: ['x:civil'], text: '{n}, 노량진 고시원 3평 방. 컵밥으로 저녁을 때운다. 올해로 {n}의 공시 몇 년 차더라.', choices: [
    { label: '독하게 버틴다', mark: { study: 1 }, text: '', roll: ['mor', 45, [{ hap: 3, mor: 2 }, '스터디원들과 서로 등을 두드렸다. 올해는 된다.'], [{ hap: -10, hp: -2 }, '밤마다 천장만 본다. 수험 우울이 찾아왔다.']] },
    { label: '고향에 내려가 쉰다', mark: { family: 1 }, text: '엄마 밥을 먹고 푹 잤다. 다시 올라갈 힘이 생겼다.', eff: { hap: 8 } },
    { label: '공시를 접는다', text: '"이제 그만하자." 짐을 쌌다. 홀가분하고 허무하다.', eff: { hap: -4, flag: 'quit_prep' } },
  ] },
  { id: 'civil_cutline', title: '합격선 발표', age: [20, 45], w: 0.05, tracks: ['x:civil', 'x:uniform'], text: '작년 합격선이 발표됐다. 커트라인이 또 올랐다. {n}의 가채점 점수로는 아슬아슬하다.', choices: [
    { label: '약점 과목만 판다', mark: { study: 1 }, text: '', roll: ['int', 50, [{ int: 1, hap: 4 }, '약점이던 행정법이 강점이 됐다.'], [{ hap: -5 }, '다른 과목이 무너졌다.']] },
    { label: '지역 구분 모집으로 돌린다', text: '경쟁률이 낮은 지방 직렬로 원서를 바꿨다.', eff: { hap: 2 } },
  ] },
  { id: 'uniform_fitness_test', title: '체력시험 날', age: [20, 40], w: 0.07, tracks: ['x:uniform'], text: '{n}의 체력시험 날. 악력, 윗몸일으키기, 왕복오래달리기…', choices: [
    { label: '전력을 다한다', mark: { sport: 1 }, text: '', roll: ['str', 45, [{ str: 2, hap: 8 }, '만점에 가까운 점수! 필기만 되면 된다.'], [{ hp: -3, hap: -8 }, '달리기 마지막 구간에서 다리가 풀렸다. 과락이다.']] },
    { label: '부상 없이 무난하게', text: '평균 점수. 무난하게 넘겼다.', eff: {} },
  ] },
  { id: 'police_interview', title: '경찰 면접', age: [20, 40], w: 0.04, tracks: ['x:uniform'], text: '면접관이 {n}에게 묻는다. "상관의 부당한 지시를 받으면 어떻게 하겠습니까?"', choices: [
    { label: '원칙대로 답한다', mark: { honest: 1 }, text: '', roll: ['cha', 40, [{ cha: 1, hap: 5 }, '면접관들이 고개를 끄덕였다.'], [{ hap: -4 }, '답이 너무 교과서적이었나 보다.']] },
    { label: '현실적으로 답한다', text: '', roll: ['cha', 50, [{ hap: 4 }, '진솔하다는 평을 받았다.'], [{ hap: -5 }, '면접관 표정이 굳었다.']] },
  ] },
  { id: 'bar_five', title: '오탈자의 공포', age: [25, 40], w: 0.05, tracks: ['x:law'], text: '변호사시험은 졸업 후 5년, 다섯 번까지만. {n}, 벌써 세 번째 도전이다.', choices: [
    { label: '모든 걸 걸고 다시', mark: { study: 2 }, text: '', roll: ['int', 55, [{ int: 2, hap: 3 }, '모의시험 성적이 합격권으로 올라왔다.'], [{ hap: -12, hp: -3 }, '불안해서 잠이 안 온다. 약을 먹기 시작했다.']] },
    { label: '법무팀·공기업으로 방향을 튼다', text: '법학 지식을 살려 다른 길을 찾기로 했다.', eff: { hap: 3, flag: 'quit_prep' } },
  ] },
  { id: 'cpa_second', title: '1차 합격, 2차의 벽', age: [22, 40], w: 0.05, tracks: ['x:license'], text: '{n}, 1차는 붙었는데 2차가 문제다. 유예 기간은 한 번뿐.', choices: [
    { label: '독서실에 산다', mark: { study: 2 }, text: '', roll: ['int', 55, [{ int: 2 }, '회계감사 과목에 감이 왔다.'], [{ hap: -8 }, '같은 문제를 세 번째 틀렸다.']] },
    { label: '회계법인 인턴을 병행', mark: { intern: 1 }, text: '현장을 보니 공부가 이해된다. 대신 시간이 모자라다.', eff: { cash: 800, hap: -2 } },
  ] },
  { id: 'teacher_quota', title: '임용 티오', age: [22, 40], w: 0.05, tracks: ['x:teacher'], text: '올해 {n}의 과목 임용 선발 인원이 반으로 줄었다는 발표가 났다.', choices: [
    { label: '그래도 도전한다', mark: { study: 1 }, text: '', roll: ['int', 55, [{ hap: 4 }, '오히려 오기가 생겼다.'], [{ hap: -8 }, '경쟁률 30:1. 한숨만 나온다.']] },
    { label: '기간제 교사로 경력을 쌓는다', text: '교단에 먼저 서 보기로 했다.', eff: { cash: 2500, cha: 1 } },
  ] },
  { id: 'nsu_pressure', title: 'N수의 무게', age: [19, 25], w: 0.08, tracks: ['x:suneung'], text: '친구들은 대학 축제 사진을 올린다. {n은} 재수학원 자습실에 앉아 있다.', choices: [
    { label: 'SNS를 지운다', mark: { study: 1 }, text: '핸드폰을 공기계로 바꿨다. 조용해졌다.', eff: { study: 2, hap: -3 } },
    { label: '친구를 만나 숨을 돌린다', text: '"넌 잘할 거야." 한마디가 힘이 됐다.', eff: { hap: 6, study: -1 } },
  ] },
  { id: 'job_group_interview', title: '합숙 면접', age: [22, 34], w: 0.05, tracks: ['x:job'], text: '{n}, 대기업 1박 2일 합숙 면접에 올랐다. 토론, PT, 인성 면접까지.', choices: [
    { label: '토론을 주도한다', text: '', roll: ['cha', 50, [{ cha: 2, hap: 6, flag: 'resume_fixed' }, '면접관이 메모를 많이 했다. 느낌이 좋다.'], [{ hap: -6 }, '너무 나선다는 평을 받았다.']] },
    { label: '조율자 역할을 한다', mark: { network: 1 }, text: '', roll: ['mor', 45, [{ mor: 2, hap: 4 }, '팀워크 점수를 잘 받았다.'], [{ hap: -3 }, '존재감이 없었다.']] },
  ] },
  { id: 'jobless_gap', title: '공백기', age: [26, 39], w: 0.04, tracks: ['x:job', 'x:idle'], text: '{n}의 이력서 공백이 1년을 넘었다. 면접관이 "그동안 뭐 하셨어요?"라고 묻는다.', choices: [
    { label: '솔직하게 말한다', mark: { honest: 1 }, text: '', roll: ['cha', 45, [{ hap: 4 }, '"그런 고민 좋네요." 분위기가 풀렸다.'], [{ hap: -5 }, '면접관이 고개를 갸웃했다.']] },
    { label: '국비 학원에서 기술을 배운다', mark: { cert: 1 }, text: '6개월 과정을 수료했다. 새 이력서 한 줄.', eff: { int: 1 } },
  ] },
  // ───────── 대학 전공 ─────────
  { id: 'law_school_life', title: '로스쿨', age: [22, 32], w: 0.05, tracks: ['u:law'], text: '{n}, 로스쿨 1학년. 학기마다 상대평가 전쟁이다.', choices: [
    { label: '성적 경쟁에 올인', mark: { study: 2 }, text: '', roll: ['int', 55, [{ int: 2, hap: 3, flag: 'law_top' }, '학년 상위 10%! 대형 로펌 인턴 기회가 왔다.'], [{ hap: -8 }, '중간고사를 망쳤다. 동기들이 무섭다.']] },
    { label: '공익 동아리 활동', mark: { kind: 1 }, text: '법률 상담 봉사를 하며 왜 법을 공부하는지 떠올렸다.', eff: { mor: 3 } },
  ] },
  { id: 'edu_practicum2', title: '교대 수업', age: [19, 25], w: 0.04, tracks: ['u:edu'], text: '{n}의 교대 동기들은 피아노·체육·미술까지 다 한다. 초등 교사는 만능이어야 한다.', choices: [
    { label: '피아노 반주를 연습한다', mark: { art: 1 }, text: '동요 반주 열 곡을 익혔다.', eff: { cha: 2 } },
    { label: '체육 실기를 연습한다', mark: { sport: 1 }, text: '뜀틀을 넘었다! 교수님이 박수를 쳤다.', eff: { str: 2 } },
  ] },
  { id: 'eng_lab_night', title: '연구실의 밤', age: [20, 30], w: 0.05, tracks: ['u:eng'], text: '{n}, 새벽 세 시 연구실. 실험 장비가 또 멈췄다.', choices: [
    { label: '끝까지 붙잡는다', mark: { study: 1 }, text: '', roll: ['int', 50, [{ int: 2, hap: 5 }, '원인을 찾았다! 교수님이 대학원 진학을 권한다.'], [{ hp: -2, hap: -5 }, '해가 떴다. 데이터는 없다.']] },
    { label: '집에 간다', text: '내일의 내가 해결하겠지.', eff: { hap: 2 } },
  ] },
  { id: 'art_critique', title: '크리틱', age: [19, 27], w: 0.05, tracks: ['u:art', 'u:perf'], text: '{n}의 작품 앞에서 교수와 동기들이 날카로운 평을 쏟아낸다.', choices: [
    { label: '반박한다', text: '', roll: ['cha', 50, [{ cha: 2, hap: 5 }, '자기 세계가 있다는 평을 받았다.'], [{ hap: -6 }, '고집만 세다는 말을 들었다.']] },
    { label: '받아 적는다', mark: { art: 1 }, text: '다음 작업이 한결 나아졌다.', eff: { cha: 1 } },
  ] },
  { id: 'sport_scout', title: '실업팀 스카우트', age: [19, 25], w: 0.05, tracks: ['u:sport'], text: '실업팀 감독이 {n}의 경기를 보러 왔다.', choices: [
    { label: '최선을 다해 뛴다', mark: { sport: 1 }, text: '', roll: ['str', 55, [{ fame: 2, hap: 10, flag: 'scouted' }, '입단 제안을 받았다!'], [{ hap: -5 }, '긴장해서 평소 실력이 안 나왔다.']] },
  ] },
  { id: 'academy_discipline', title: '생도 생활', age: [19, 24], w: 0.06, tracks: ['u:police', 'u:army'], text: '{n}, 외출 복귀 시간 5분 전. 아직 버스 안이다.', choices: [
    { label: '택시를 잡는다', cost: 5, text: '1분 남기고 들어왔다.', eff: {} },
    { label: '늦는다고 보고한다', mark: { honest: 1 }, text: '벌점을 받았지만 정직하다는 평을 받았다.', eff: { mor: 2 } },
  ] },
  { id: 'hum_career_worry', title: '문송합니다', age: [21, 26], w: 0.05, tracks: ['u:hum', 'u:admin'], text: '{n}, 취업 설명회에서 "문과는 좀…"이라는 말을 들었다.', choices: [
    { label: '코딩 부트캠프에 간다', cost: 200, mark: { cert: 1 }, text: '파이썬을 배웠다. 데이터 직무에 지원할 수 있게 됐다.', eff: { int: 2 } },
    { label: '공기업·공무원 쪽을 본다', text: '안정을 택하기로 했다.', eff: {} },
    { label: '내 전공을 믿는다', mark: { study: 1 }, text: '글 쓰는 힘은 어디서든 통한다고 믿기로 했다.', eff: { hap: 2 } },
  ] },
  // ───────── 직장·직업 ─────────
  { id: 'restructuring', title: '구조조정', age: [40, 58], w: 0.03, tracks: ['w:office', 'w:finance', 'w:sales'], text: '회사가 희망퇴직을 받는다. {n}의 부서가 명단에 올랐다는 소문이다.', choices: [
    { label: '버틴다', text: '', roll: ['int', 50, [{ hap: -2 }, '살아남았다. 동료 몇이 떠났다.'], [{ hap: -12, flag: 'laid_off' }, '결국 권고사직 통보를 받았다.']] },
    { label: '위로금 받고 나간다', text: '위로금 2년 치를 받고 나왔다. 무엇을 할까.', eff: { cash: 12000, hap: -5, flag: 'laid_off' } },
  ] },
  { id: 'market_crash_banker', title: '시장 폭락', age: [25, 60], w: 0.03, tracks: ['w:finance'], text: '시장이 하루에 7% 빠졌다. {n}의 고객들 전화가 빗발친다.', choices: [
    { label: '고객 곁을 지킨다', mark: { honest: 1 }, text: '"그때 곁에 있어 줘서 고마웠어요." 단골이 평생 고객이 됐다.', eff: { mor: 2, cha: 1 } },
    { label: '실적 압박에 무리한 상품을 판다', mark: { cheat: 1 }, text: '', roll: ['luck', 50, [{ cash: 1000 }, '실적은 채웠다. 뒷맛이 쓰다.'], [{ fame: -2, hap: -10 }, '불완전판매로 징계를 받았다.']] },
  ] },
  { id: 'public_transfer', title: '인사 발령', age: [25, 60], w: 0.04, tracks: ['w:public', 'w:uniform', 'w:edu'], text: '{n}에게 섬 지역 발령이 났다. 2년 근무하면 가산점이 있다.', choices: [
    { label: '간다', text: '바다를 보며 출근한다. 가족과 떨어져 쓸쓸하다.', eff: { hap: -3, bond: -3, flag: 'island_duty' } },
    { label: '사정을 말해 본다', text: '', roll: ['cha', 45, [{ hap: 3 }, '가까운 곳으로 조정됐다.'], [{ hap: -5 }, '"다들 가는 거야." 결국 가게 됐다.']] },
  ] },
  { id: 'fire_trauma', title: '트라우마', age: [22, 60], w: 0.03, tracks: ['w:uniform'], text: '참혹한 현장을 다녀온 뒤, {n은} 밤마다 그 장면이 떠오른다.', choices: [
    { label: '심리 상담을 받는다', cost: 50, text: '"괜찮지 않아도 괜찮아요." 조금씩 잠이 돌아왔다.', eff: { hap: 4 } },
    { label: '혼자 삭인다', mark: { health_x: 1 }, text: '술이 늘었다.', eff: { hap: -8, hp: -3 } },
  ] },
  { id: 'owner_rent', title: '임대료 인상', age: [25, 75], w: 0.05, tracks: ['w:owner'], text: '건물주가 {n}의 가게 월세를 30% 올리겠다고 한다. 장사가 막 자리를 잡았는데.', choices: [
    { label: '받아들인다', cost: 1200, text: '버티기로 했다. 대신 쉬는 날을 줄였다.', eff: { hap: -4 } },
    { label: '협상한다', text: '', roll: ['cha', 50, [{ hap: 4 }, '10%로 합의했다.'], [{ hap: -6, cash: -600 }, '"싫으면 나가세요." 결국 올려 줬다.']] },
    { label: '다른 곳으로 옮긴다', cost: 2000, text: '권리금을 포기하고 옮겼다. 단골 절반이 따라왔다.', eff: { hap: -5 } },
  ] },
  { id: 'owner_staff', title: '직원 문제', age: [25, 75], w: 0.04, tracks: ['w:owner'], text: '{n}의 가게에서 일 잘하던 직원이 경쟁 가게로 가겠다고 한다.', choices: [
    { label: '월급을 올려 붙잡는다', cost: 300, text: '고맙다며 더 열심히 일한다.', eff: { cha: 1 } },
    { label: '보내 준다', text: '새 직원을 가르치느라 한동안 고생했다.', eff: { hap: -3, hp: -1 } },
  ] },
  { id: 'owner_platform_fee', title: '배달앱 수수료', age: [25, 75], w: 0.04, tracks: ['w:owner'], text: '배달앱 수수료가 또 올랐다. {n}, 팔수록 남는 게 없다.', choices: [
    { label: '자체 배달을 시작한다', cost: 300, text: '', roll: ['int', 50, [{ cash: 1200 }, '단골 주문이 직접 들어온다.'], [{ cash: -200 }, '주문이 뚝 끊겼다.']] },
    { label: '가격을 올린다', text: '', roll: ['luck', 50, [{ cash: 500 }, '손님들이 이해해 줬다.'], [{ cash: -300, hap: -3 }, '"비싸졌네" 리뷰가 늘었다.']] },
  ] },
  { id: 'farm_weather', title: '이상 기후', age: [25, 90], w: 0.05, tracks: ['w:farm'], text: '올여름은 50일 넘게 비가 왔다. {n}의 밭이 물에 잠겼다.', choices: [
    { label: '재해 보험을 청구한다', text: '', roll: ['luck', 60, [{ cash: 500 }, '보험금이 나왔다. 휴.'], [{ cash: -1500, hap: -8 }, '보장 범위 밖이란다.']] },
    { label: '이웃과 함께 복구한다', mark: { kind: 1 }, text: '품앗이로 일주일 만에 복구했다.', eff: { hp: -2, mor: 2 } },
  ] },
  { id: 'farm_direct', title: '직거래', age: [25, 80], w: 0.04, tracks: ['w:farm'], text: '{n}, 온라인 직거래를 시작해 볼까?', choices: [
    { label: '라이브 커머스에 도전', mark: { network: 1 }, text: '', roll: ['cha', 45, [{ cash: 3000, fame: 1 }, '방송 한 번에 수확량이 다 팔렸다!'], [{ hap: -3 }, '시청자 12명. 그래도 두 상자는 팔았다.']] },
    { label: '농협 수매가 편하다', text: '제값은 못 받아도 속은 편하다.', eff: {} },
  ] },
  { id: 'transport_accident', title: '아찔한 순간', age: [21, 75], w: 0.04, tracks: ['w:transport'], text: '비 오는 밤, {n}의 차 앞으로 무단횡단하는 사람이 뛰어들었다.', choices: [
    { label: '급브레이크', text: '', roll: ['hp', 40, [{ hap: -2 }, '간발의 차로 멈췄다. 손이 떨린다.'], [{ cash: -1500, hap: -12 }, '가벼운 접촉 사고. 합의금과 보험 할증.']] },
  ] },
  { id: 'service_customer', title: '진상 손님', age: [18, 70], w: 0.05, tracks: ['w:service'], text: '손님이 {n}에게 소리를 지르며 "사장 나오라"고 한다.', choices: [
    { label: '끝까지 웃는다', mark: { kind: 1 }, text: '', roll: ['mor', 45, [{ mor: 2 }, '손님이 누그러져 사과까지 했다.'], [{ hap: -8 }, '퇴근길에 울컥했다.']] },
    { label: '정중하게 선을 긋는다', mark: { honest: 1 }, text: '매니저가 편을 들어 줬다.', eff: { hap: 2 } },
  ] },
  { id: 'creator_haters', title: '악플', age: [15, 70], w: 0.05, tracks: ['w:creator'], text: '{n}의 새 콘텐츠에 악플이 수천 개 달렸다.', choices: [
    { label: '고소한다', cost: 300, text: '', roll: ['luck', 60, [{ hap: 5, fame: 1 }, '악플러들이 사과문을 올렸다.'], [{ hap: -5 }, '수사가 지지부진하다.']] },
    { label: '무시하고 다음 작업', mark: { art: 1 }, text: '', roll: ['mor', 50, [{ hap: 2 }, '팬들이 더 뭉쳤다.'], [{ hap: -10, hp: -2 }, '밤마다 댓글을 확인하게 된다.']] },
  ] },
  { id: 'sport_contract', title: '연봉 협상', age: [19, 38], w: 0.05, tracks: ['w:sport'], text: '시즌이 끝났다. {n}의 연봉 협상 테이블.', choices: [
    { label: '에이전트를 쓴다', cost: 300, text: '', roll: ['cha', 45, [{ cash: 3000, hap: 6 }, '대폭 인상!'], [{ hap: -3 }, '동결. 수수료만 나갔다.']] },
    { label: '구단 제시액에 사인', text: '팀 분위기를 해치고 싶지 않다.', eff: { mor: 1 } },
  ] },
  { id: 'tech_ai', title: 'AI가 온다', age: [25, 60], w: 0.03, tracks: ['w:tech', 'w:office', 'w:press'], text: '회사가 AI 도입으로 {n}의 업무 절반을 자동화한다고 발표했다.', choices: [
    { label: 'AI를 먼저 배워 앞장선다', cost: 100, mark: { study: 1 }, text: '', roll: ['int', 50, [{ int: 2, flag: 'ai_lead' }, 'AI 도입 태스크포스 리더가 됐다.'], [{ hap: -3 }, '따라가기 벅차다.']] },
    { label: '불안하지만 지켜본다', text: '', eff: { hap: -4 } },
  ] },
  { id: 'care_burnout', title: '돌봄의 무게', age: [22, 65], w: 0.04, tracks: ['w:care'], text: '인력이 부족해 {n이} 환자 열다섯 명을 혼자 맡는다.', choices: [
    { label: '버틴다', mark: { kind: 1, health_x: 1 }, text: '환자 가족이 손을 잡고 고맙다고 했다. 그 힘으로 버틴다.', eff: { hp: -2, mor: 2 } },
    { label: '노조 활동에 참여한다', mark: { honest: 1 }, text: '인력 충원 요구가 받아들여졌다.', eff: { hap: 3 } },
  ] },
];
