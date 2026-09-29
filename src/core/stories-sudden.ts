// 갑작스러운 일: 나이대마다 불쑥 찾아오는 사건·사고·행운. 짧지만 결과가 남는다.
import type { Story } from './stories';
import type { GameState, Person } from './types';
import { age, alive, parentsOf, spouseOf } from './people';

const married = (s: GameState, p: Person) => !!spouseOf(s, p) && alive(spouseOf(s, p)!);
const hasKids = (s: GameState, p: Person) => p.childIds.some((id) => alive(s.people[id]) && age(s, s.people[id]) < 20);
const hasParents = (s: GameState, p: Person) => parentsOf(s, p).some(alive);
const adultKids = (s: GameState, p: Person) => p.childIds.some((id) => alive(s.people[id]) && age(s, s.people[id]) >= 25);
const working = (_s: GameState, p: Person) => !['none', 'parttime', 'pension'].includes(p.job) && !p.flags.includes('student');
const hasCar = (s: GameState, p: Person) => s.assets.some((a) => a.ownerId === p.id && a.kind === 'vehicle');
const owner = (_s: GameState, p: Person) => p.home?.type === 'own';

export const SUDDEN_STORIES: Story[] = [
  // ───────── 어린이 (5~12) ─────────
  { id: 's_playground', title: '놀이터 사고', age: [5, 10], w: 0.03, text: '{n이} 놀이터 정글짐에서 떨어졌다! 이마에서 피가 난다.', choices: [
    { label: '응급실로 달려간다', cost: 20, text: '다섯 바늘 꿰맸다. 흉터가 훈장이 됐다며 자랑한다.', eff: { hp: -1, hap: -2 } },
    { label: '집에서 소독만 한다', text: '', roll: ['luck', 70, [{ hap: 1 }, '다행히 금방 아물었다.'], [{ hp: -3 }, '덧나서 결국 병원에 갔다.']] },
  ] },
  { id: 's_lost_dog', title: '길 잃은 강아지', age: [6, 12], w: 0.03, text: '하굣길에 목줄 달린 강아지가 {n}을 졸졸 따라왔다.', choices: [
    { label: '주인을 찾아 준다', mark: { kind: 2 }, text: '전단지를 붙였다. 사흘 만에 주인 할머니가 울면서 찾아오셨다.', eff: { mor: 3, hap: 5, cash: 10 } },
    { label: '몰래 키우려 한다', text: '침대 밑에서 딱 걸렸다. 결국 보호소에 연락했다.', eff: { hap: -2 } },
  ] },
  { id: 's_fire_drill', title: '진짜 불', age: [7, 13], w: 0.015, text: '학교 과학실에서 진짜 불이 났다! {n}의 반이 대피한다.', choices: [
    { label: '훈련 때 배운 대로', mark: { honest: 1 }, text: '', roll: ['mor', 30, [{ mor: 2, fame: 1 }, '{n이} 동생들 손을 잡고 침착하게 나왔다. 교장 선생님 표창을 받았다.'], [{ hap: -3 }, '무서워서 한참 울었다. 다행히 다친 사람은 없다.']] },
  ] },
  { id: 's_quiz_show', title: '어린이 퀴즈쇼', age: [9, 13], w: 0.015, cond: (_s, p) => p.actual.int >= 50, text: '방송국에서 {n}에게 어린이 퀴즈 프로그램 출연 섭외가 왔다.', choices: [
    { label: '나가 본다', text: '', roll: ['int', 55, [{ fame: 2, hap: 10, int: 1 }, '최종 우승! 트로피를 들고 전국 방송에 나왔다.'], [{ hap: 3 }, '2라운드 탈락. 그래도 방송국 구경은 신났다.']] },
    { label: '부담스럽다', text: '다음에 기회가 또 있겠지.', eff: {} },
  ] },
  { id: 's_bike_stolen', title: '자전거 도난', age: [8, 16], w: 0.03, text: '{n}의 자전거가 학원 앞에서 사라졌다. 자물쇠까지 끊겼다.', choices: [
    { label: '경찰에 신고한다', mark: { honest: 1 }, text: '', roll: ['luck', 25, [{ hap: 6 }, 'CCTV로 찾았다! 중학생 형들이 사과했다.'], [{ hap: -3 }, '끝내 못 찾았다.']] },
    { label: '새로 사 준다', cost: 30, text: '이번엔 튼튼한 자물쇠도 같이.', eff: { hap: 2 } },
  ] },
  { id: 's_rich_friend', title: '친구네 집', age: [8, 13], w: 0.03, text: '친구 집에 놀러 갔다 온 {n이} "걔네 집엔 엘리베이터가 있어"라며 풀이 죽었다.', choices: [
    { label: '우리 집의 좋은 점을 얘기해 준다', mark: { warmth: 1 }, text: '"우리 집엔 엄마(아빠)가 있잖아." 꼭 안아 줬다.', eff: { hap: 3, mor: 1 } },
    { label: '열심히 살면 된다고 한다', mark: { study: 1 }, text: '{n이} 고개를 끄덕였다. 뭔가 다짐한 눈빛이다.', eff: { mor: 1 } },
  ] },
  { id: 's_flu_wave', title: '독감 유행', age: [5, 12], w: 0.03, text: '반에서 독감이 돈다. {n}도 열이 39도다.', choices: [
    { label: '병원 가서 타미플루', cost: 5, text: '이틀 만에 열이 내렸다.', eff: { hp: -1 } },
    { label: '집에서 푹 재운다', text: '', roll: ['hp', 30, [{}, '사흘 만에 털고 일어났다.'], [{ hp: -3 }, '폐렴으로 번져 입원했다.']] },
  ] },
  { id: 's_new_student', title: '전학생', age: [7, 15], w: 0.03, text: '{n}의 반에 외국에서 온 전학생이 왔다. 한국말이 서툴러 혼자 앉아 있다.', choices: [
    { label: '먼저 말을 건다', mark: { kind: 1, network: 1 }, text: '서툰 영어와 손짓으로 친구가 됐다. 집에 초대받았다.', eff: { cha: 2, hap: 4 } },
    { label: '지켜본다', text: '다른 친구들이 먼저 다가갔다.', eff: {} },
  ] },

  // ───────── 10대 (13~19) ─────────
  { id: 's_sns_viral', title: 'SNS 박제', age: [13, 22], w: 0.025, text: '{n}의 흑역사 영상이 SNS에 퍼졌다. 조회수 50만.', choices: [
    { label: '쿨하게 웃어넘긴다', text: '', roll: ['cha', 45, [{ cha: 2, fame: 1 }, '오히려 인기인이 됐다. 팔로워가 늘었다.'], [{ hap: -8 }, '놀림이 계속됐다. 한동안 학교 가기 싫단다.']] },
    { label: '삭제 요청·신고', mark: { honest: 1 }, text: '플랫폼에 신고해 내렸다. 올린 친구에게 사과도 받았다.', eff: { hap: -2 } },
  ] },
  { id: 's_wage_theft', title: '알바비를 안 준다', age: [16, 24], w: 0.03, text: '{n이} 석 달 일한 편의점 사장이 알바비 120만 원을 안 준다.', choices: [
    { label: '노동청에 진정한다', mark: { honest: 1 }, text: '', roll: ['luck', 70, [{ cash: 120, mor: 2 }, '노동청 연락 한 번에 입금됐다.'], [{ hap: -4 }, '사장이 폐업하고 사라졌다. 체당금을 신청 중이다.']] },
    { label: '포기한다', text: '비싼 인생 공부였다.', eff: { hap: -5 } },
  ] },
  { id: 's_caught_drinking', title: '술 먹다 걸렸다', age: [15, 18], w: 0.02, text: '{n이} 친구들과 몰래 술을 마시다 학생부 선생님께 걸렸다.', choices: [
    { label: '크게 혼내고 함께 반성문', mark: { honest: 1 }, text: '사회봉사 3일. 다시는 안 하겠단다.', eff: { mor: 2, aff: -3 } },
    { label: '왜 그랬는지 먼저 듣는다', mark: { warmth: 1 }, text: '"친구들이 다 하니까…" 대화가 길어졌다. 조금 가까워졌다.', eff: { aff: 3 } },
  ] },
  { id: 's_runaway_friend', title: '가출한 친구', age: [13, 18], w: 0.02, text: '{n}의 친구가 가출해서 우리 집에 재워 달라고 한다.', choices: [
    { label: '재워 주고 부모님께 연락', mark: { kind: 1, honest: 1 }, text: '친구 부모님이 새벽에 데리러 왔다. 고맙다며 고개를 숙였다.', eff: { mor: 2 } },
    { label: '곤란하다고 거절', text: '친구는 PC방에서 밤을 새웠단다. {n이} 마음 아파한다.', eff: { hap: -3 } },
  ] },
  { id: 's_scout_sports', title: '스카우트', age: [13, 18], w: 0.015, cond: (_s, p) => p.actual.str >= 60, text: '체육대회를 지켜보던 코치가 {n}에게 명함을 줬다. "육상부 한번 해 볼래?"', choices: [
    { label: '해 본다', mark: { sport: 2 }, text: '', roll: ['str', 60, [{ str: 3, fame: 1 }, '도 대회 입상! 체육 특기생 얘기가 나온다.'], [{ hap: -2, str: 1 }, '훈련이 너무 힘들어 한 학기 만에 그만뒀다.']] },
    { label: '공부에 집중한다', mark: { study: 1 }, text: '명함은 책상 서랍에.', eff: {} },
  ] },
  { id: 's_confession', title: '고백받았다', age: [14, 19], w: 0.03, text: '{n이} 같은 반 친구에게 고백을 받았다. 얼굴이 새빨갛다.', choices: [
    { label: '응원한다', mark: { warmth: 1 }, text: '"공부도 같이 해." 설레는 봄이다.', eff: { hap: 8, study: -1 } },
    { label: '대학 가서 하라고', mark: { study: 1 }, text: '"엄마(아빠) 진짜…" 방문이 닫혔다.', eff: { aff: -3 } },
  ] },
  { id: 's_exam_leak', title: '시험지 유출 소문', age: [15, 18], w: 0.015, text: '{n}의 학교에서 기말고사 문제가 유출됐다는 소문이 돈다. 재시험 얘기가 나온다.', choices: [
    { label: '재시험 대비를 시킨다', mark: { study: 1 }, text: '', roll: ['int', 45, [{ study: 2 }, '재시험에서 오히려 점수가 올랐다.'], [{ hap: -3 }, '한 번 본 시험을 또 보려니 지친다.']] },
    { label: '공정하게 해 달라고 민원', mark: { honest: 1 }, text: '학부모들이 함께 목소리를 냈다. 교육청 감사가 나왔다.', eff: {} },
  ] },
  { id: 's_motorbike', title: '오토바이', age: [16, 22], w: 0.02, text: '{n이} 배달 알바를 하겠다며 오토바이를 사겠단다.', choices: [
    { label: '절대 안 된다', mark: { hurt: 1 }, text: '"다른 애들은 다 하는데." 한동안 말을 안 한다.', eff: { aff: -4 } },
    { label: '안전 교육 받고 헬멧 필수로', cost: 50, text: '', roll: ['luck', 75, [{ cash: 200 }, '조심히 타며 용돈을 벌었다.'], [{ hp: -8 }, '빗길에 미끄러졌다. 다리 골절.']] },
  ] },

  // ───────── 청년 (20~34) ─────────
  { id: 's_phone_lost', title: '휴대폰 분실', age: [18, 60], w: 0.03, text: '{n이} 택시에 휴대폰을 두고 내렸다. 사진, 인증서, 연락처 전부 거기 있다.', choices: [
    { label: '택시 회사에 수소문', text: '', roll: ['luck', 55, [{ hap: 3 }, '기사님이 파출소에 맡겨 두셨다! 음료수 한 박스를 사 갔다.'], [{ cash: -130, hap: -5 }, '끝내 못 찾았다. 새로 샀다.']] },
    { label: '바로 분실 신고·정지', mark: { honest: 1 }, text: '결제 정지부터 했다. 폰은 못 찾았지만 피해는 없다.', eff: { cash: -130 } },
  ] },
  { id: 's_pickpocket', title: '해외여행 소매치기', age: [20, 70], w: 0.02, text: '파리 여행 중, {n}의 가방에서 지갑과 여권이 사라졌다.', choices: [
    { label: '대사관에 가서 긴급 여권', cost: 50, text: '하루를 날렸다. 여행자보험으로 일부 보상받았다.', eff: { hap: -5 } },
    { label: '경찰서에 신고부터', text: '', roll: ['luck', 20, [{ hap: 6 }, '기적처럼 여권이 우체통에서 발견됐다!'], [{ hap: -6, cash: -80 }, '말이 안 통해 반나절을 헤맸다.']] },
  ] },
  { id: 's_burglary', title: '빈집털이', age: [20, 60], w: 0.02, text: '퇴근한 {n}의 자취방 문이 열려 있다. 노트북과 비상금이 없어졌다.', choices: [
    { label: '경찰에 신고하고 도어락 교체', cost: 30, text: '', roll: ['luck', 35, [{ cash: 100 }, '범인이 잡혔다. 물건 일부를 돌려받았다.'], [{ hap: -5 }, '범인은 못 잡았다. 한동안 잠을 설쳤다.']] },
    { label: '이사한다', cost: 100, text: '더 안전한 동네로 옮겼다.', eff: { hap: 2 } },
  ] },
  { id: 's_mc_request', title: '결혼식 사회', age: [25, 40], w: 0.03, text: '가장 친한 친구가 {n}에게 결혼식 사회를 부탁했다.', choices: [
    { label: '맡는다', mark: { network: 1 }, text: '', roll: ['cha', 45, [{ cha: 2, hap: 6 }, '하객들이 배꼽을 잡았다. 명사회자 소리를 들었다.'], [{ hap: -4 }, '신랑 이름을 한 번 틀렸다. 평생 놀림감이다.']] },
    { label: '축가만 하겠다', text: '', roll: ['cha', 50, [{ hap: 5 }, '신부가 울었다.'], [{ hap: -3 }, '고음에서 음이탈.']] },
  ] },
  { id: 's_tv_interview', title: '길거리 인터뷰', age: [20, 60], w: 0.02, text: '출근길, 방송국 카메라가 {n}에게 마이크를 내밀었다. "요즘 물가 어떠세요?"', choices: [
    { label: '솔직하게 답한다', text: '', roll: ['cha', 40, [{ fame: 1, hap: 4 }, '9시 뉴스에 나왔다! 회사에서 알아봤다.'], [{ hap: -2 }, '말이 꼬였다. 편집돼서 한 마디만 나왔다.']] },
    { label: '손사래 치며 지나간다', text: '쑥스러웠다.', eff: {} },
  ] },
  { id: 's_lotto_small', title: '복권 3등', age: [20, 90], w: 0.01, text: '재미로 산 복권이 3등에 당첨됐다! {n}의 손이 떨린다.', choices: [
    { label: '가족과 외식', text: '세금 떼고 140만 원. 소고기를 먹었다.', eff: { cash: 100, hap: 8 } },
    { label: '전부 저축', mark: { thrift: 1 }, text: '비상금 통장이 두둑해졌다.', eff: { cash: 140 } },
    { label: '1등 노리고 더 산다', mark: { risk: 1 }, text: '', roll: ['luck', 3, [{ cash: 150000, fame: 2 }, '…말도 안 된다. 1등이다!!!'], [{ cash: 80, hap: -2 }, '역시 꽝. 60만 원어치를 날렸다.']] },
  ] },
  { id: 's_epidemic', title: '신종 감염병', age: [5, 95], w: 0.008, cooldown: 30, text: '신종 감염병이 유행한다. 학교가 원격 수업을 하고 회사는 재택근무에 들어갔다.', choices: [
    { label: '집에서 조심한다', text: '마스크와 손 소독. 가족과 보내는 시간이 늘었다.', eff: { hap: -3, hp: 1 } },
    { label: '평소대로 산다', text: '', roll: ['hp', 40, [{}, '걸리지 않았다.'], [{ hp: -5, hap: -5 }, '확진. 2주를 격리했다.']] },
  ] },
  { id: 's_company_bankrupt', title: '회사가 망했다', age: [22, 55], w: 0.012, cond: working, text: '{n}의 회사가 갑자기 법정관리에 들어갔다. 두 달째 월급이 밀렸다.', choices: [
    { label: '체당금 신청하고 이직 준비', mark: { honest: 1 }, text: '국가가 대신 주는 체불 임금을 받았다. 새 직장을 찾는다.', eff: { cash: 600, hap: -6, flag: 'laid_off' } },
    { label: '회사를 살려 보겠다며 남는다', text: '', roll: ['luck', 35, [{ cash: 1500, fame: 1 }, '회생 성공! 남은 직원들에게 스톡옵션이 나왔다.'], [{ hap: -10, flag: 'laid_off' }, '결국 파산. 퇴직금도 절반만 받았다.']] },
  ] },
  { id: 's_old_teacher', title: '은사와의 재회', age: [25, 60], w: 0.02, text: '지하철에서 {n}의 고등학교 담임 선생님을 우연히 만났다.', choices: [
    { label: '커피를 대접한다', mark: { warmth: 1 }, text: '"네가 제일 속 썩였는데 잘 컸구나." 한참 웃었다.', eff: { hap: 6, mor: 1 } },
    { label: '인사만 하고 헤어진다', text: '반가웠다.', eff: { hap: 2 } },
  ] },
  { id: 's_whistle', title: '회사 비리', age: [25, 60], w: 0.015, cond: working, text: '{n이} 회사 장부에서 분식회계 흔적을 발견했다.', choices: [
    { label: '공익신고한다', mark: { honest: 3 }, text: '', roll: ['mor', 50, [{ fame: 3, mor: 3, cash: 2000 }, '공익신고자 보호를 받았다. 보상금도 나왔다.'], [{ hap: -12, flag: 'laid_off' }, '보복 인사 끝에 결국 회사를 나왔다.']] },
    { label: '모른 척한다', mark: { cheat: 1 }, text: '밤마다 그 장부가 떠오른다.', eff: { mor: -2 } },
  ] },

  // ───────── 중년 (35~59) ─────────
  { id: 's_car_crash', title: '교통사고', age: [25, 80], w: 0.02, cond: hasCar, text: '신호 대기 중인 {n}의 차를 뒤차가 들이받았다.', choices: [
    { label: '한방병원 입원 치료', text: '일주일 입원. 합의금이 나왔다.', eff: { hp: -1, cash: 150 } },
    { label: '괜찮다며 그냥 간다', text: '', roll: ['hp', 40, [{}, '정말 괜찮았다.'], [{ hp: -4, hap: -4 }, '다음 날 목이 안 돌아간다. 후회했다.']] },
  ] },
  { id: 's_leak_victim', title: '윗집 누수', age: [30, 90], w: 0.02, cond: owner, text: '{n}네 천장에서 물이 뚝뚝 떨어진다. 윗집 배관이 터졌다.', choices: [
    { label: '윗집 보험으로 처리', text: '윗집의 일상생활배상책임 보험으로 도배까지 새로 했다.', eff: { hap: 1 } },
    { label: '우리 돈으로 먼저 고친다', cost: 150, text: '빨리 해결했지만 돈은 못 받았다.', eff: {} },
  ] },
  { id: 's_school_call', title: '학교 호출', age: [35, 55], w: 0.03, cond: hasKids, text: '담임 선생님 전화. "{n} 님 자녀가 친구와 크게 다퉈서요. 학교로 좀 오셔야겠습니다."', choices: [
    { label: '바로 간다', mark: { warmth: 1 }, text: '양쪽 이야기를 들어 보니 오해였다. 두 아이가 악수했다.', eff: { hap: -1 } },
    { label: '배우자에게 부탁한다', text: '회사 회의가 있었다. 배우자가 조금 서운해한다.', eff: { bond: -2 } },
  ] },
  { id: 's_parent_collapse', title: '부모님이 쓰러지셨다', age: [30, 70], w: 0.02, cond: (s, p) => parentsOf(s, p).some((q) => alive(q) && age(s, q) >= 65), text: '새벽에 전화가 왔다. {n}의 부모님이 뇌졸중으로 쓰러지셨다.', choices: [
    { label: '만사 제치고 병원으로', cost: 300, mark: { filial: 2 }, text: '골든타임 안에 도착했다. 재활이 길겠지만 고비는 넘겼다.', eff: { hap: -6 } },
    { label: '형제들에게 먼저 연락', text: '가장 가까이 사는 형제가 먼저 갔다. 마음이 무겁다.', eff: { hap: -8 } },
  ] },
  { id: 's_wildfire', title: '산불 대피', age: [20, 95], w: 0.008, text: '{n}이 사는 지역에 대형 산불이 번진다. 대피 문자가 울린다.', choices: [
    { label: '중요한 것만 챙겨 대피', text: '가족 사진과 서류를 챙겨 체육관으로. 집은 무사했다.', eff: { hap: -4 } },
    { label: '끝까지 집을 지킨다', text: '', roll: ['luck', 55, [{ hap: 2 }, '바람이 바뀌었다. 집도 가족도 무사하다.'], [{ hp: -6, cash: -1000 }, '연기를 마셔 입원했다. 창고가 탔다.']] },
  ] },
  { id: 's_flood', title: '물난리', age: [20, 95], w: 0.01, cond: (_s, p) => p.home?.tier === 'room' || p.home?.tier === 'villa', text: '기록적인 폭우. {n}네 집에 물이 차오른다.', choices: [
    { label: '가족부터 대피', text: '살림살이가 다 젖었다. 재난지원금 200만 원이 나왔다.', eff: { cash: -300, hap: -8 } },
    { label: '물을 퍼낸다', text: '', roll: ['str', 45, [{ hap: -2 }, '밤새 퍼내 피해를 줄였다.'], [{ hp: -3, cash: -500 }, '감전될 뻔했다. 피해도 컸다.']] },
  ] },
  { id: 's_stock_jackpot', title: '잊고 있던 주식', age: [30, 90], w: 0.01, text: '{n이} 10년 전 사 두고 잊은 주식 계좌에 로그인했다.', choices: [
    { label: '확인해 본다', text: '', roll: ['luck', 35, [{ cash: 3000, hap: 10 }, '열 배가 돼 있었다! 그 회사가 대박이 났다.'], [{ cash: 50, hap: -1 }, '상장폐지 직전이었다. 남은 50만 원을 건졌다.']] },
  ] },
  { id: 's_old_flame', title: '옛 연인', age: [35, 70], w: 0.015, text: '동창회에서 {n}의 첫사랑을 다시 만났다. 연락처를 주고받았다.', choices: [
    { label: '추억은 추억으로', mark: { honest: 1 }, text: '반가운 인사로 끝냈다.', eff: { hap: 2 } },
    { label: '따로 만나 본다', need: married, mark: { cheat: 1 }, text: '', roll: ['luck', 60, [{ hap: 4 }, '옛날 얘기만 하고 헤어졌다. 그래도 찜찜하다.'], [{ bond: -20, hap: -10 }, '배우자가 문자를 봤다. 집안이 뒤집혔다.']] },
    { label: '다시 시작해 본다', need: (s, p) => !married(s, p), mark: { warmth: 1 }, text: '', roll: ['cha', 45, [{ hap: 10 }, '늦게 찾아온 두 번째 봄이다.'], [{ hap: -4 }, '서로 너무 변했다.']] },
  ] },
  { id: 's_earthquake', title: '지진', age: [5, 95], w: 0.006, text: '규모 5.8 지진! {n}네 집 벽에 금이 갔다.', choices: [
    { label: '안전 점검을 받는다', cost: 50, text: '구조에는 문제가 없단다. 가족 비상 배낭을 싸 두었다.', eff: { hap: -2 } },
    { label: '대충 넘긴다', text: '', roll: ['luck', 80, [{}, '별일 없었다.'], [{ cash: -800 }, '여진 뒤 누수가 시작됐다. 큰 공사가 필요하다.']] },
  ] },
  { id: 's_honorary_retire', title: '명예퇴직 제안', age: [48, 58], w: 0.02, cond: working, text: '회사가 {n}에게 명예퇴직을 제안한다. 위로금은 2년 치 연봉.', choices: [
    { label: '받아들인다', text: '위로금을 받고 새 인생을 준비한다.', eff: { cash: 10000, hap: -3, flag: 'laid_off' } },
    { label: '버틴다', text: '', roll: ['luck', 60, [{}, '구조조정 명단에서 빠졌다. 조금 더 다닌다.'], [{ hap: -8 }, '한직으로 발령 났다. 창가 자리다.']] },
  ] },
  { id: 's_land_compensation', title: '고향 땅 수용', age: [40, 90], w: 0.01, cond: hasParents, text: '신도시 개발로 {n}네 고향 땅이 수용된다. 보상금 협의 통지서가 왔다.', choices: [
    { label: '감정평가대로 받는다', text: '생각보다 많이 나왔다. 형제들과 나눴다.', eff: { cash: 5000, hap: 4 } },
    { label: '이의신청해 더 받는다', mark: { honest: 1 }, text: '', roll: ['int', 50, [{ cash: 8000 }, '재감정으로 보상금이 올랐다.'], [{ cash: 4500, hap: -3 }, '1년을 끌었지만 결과는 비슷했다.']] },
  ] },
  { id: 's_found_wallet_mid', title: '길에서 주운 가방', age: [30, 80], w: 0.015, text: '{n이} 버스 정류장에서 현금 뭉치가 든 가방을 주웠다. 1,000만 원쯤 된다.', choices: [
    { label: '경찰에 가져다준다', mark: { honest: 3 }, text: '주인은 전 재산을 찾으러 나온 할머니였다. 뉴스에 "양심 시민"으로 나왔다. 법정 보상금도 받았다.', eff: { fame: 2, mor: 3, cash: 100 } },
    { label: '가진다', mark: { cheat: 2 }, text: '', roll: ['luck', 40, [{ cash: 1000 }, '아무도 모른다. …정말?'], [{ fame: -3, hap: -15, cash: -300 }, 'CCTV에 찍혔다. 점유이탈물횡령으로 벌금을 냈다.']] },
  ] },

  // ───────── 노년 (60+) ─────────
  { id: 's_fall', title: '낙상', age: [65, 95], w: 0.03, text: '{n이} 빙판길에서 넘어졌다. 고관절이 아프다.', choices: [
    { label: '바로 수술한다', cost: 500, text: '수술은 잘됐다. 재활이 석 달.', eff: { hp: -4 } },
    { label: '파스 붙이고 버틴다', text: '', roll: ['hp', 35, [{ hp: -1 }, '다행히 타박상이었다.'], [{ hp: -10 }, '금이 간 거였다. 한참 누워 지냈다.']] },
  ] },
  { id: 's_late_love', title: '황혼의 설렘', age: [65, 90], w: 0.02, cond: (s, p) => !married(s, p), text: '복지관 노래교실에서 {n}에게 자꾸 사탕을 건네는 분이 있다.', choices: [
    { label: '데이트 신청을 받아 준다', mark: { warmth: 1 }, text: '공원 산책이 일과가 됐다. 자녀들이 놀리면서도 좋아한다.', eff: { hap: 12 } },
    { label: '이 나이에 무슨', text: '사탕만 받았다.', eff: { hap: 1 } },
  ] },
  { id: 's_free_tour', title: '무료 효도관광', age: [65, 90], w: 0.025, text: '동네에 "어르신 무료 관광" 전단이 붙었다. 점심에 선물까지 준단다.', choices: [
    { label: '가 본다', text: '', roll: ['int', 45, [{ hap: 3 }, '중간에 건강식품 설명회가 있었다. 안 사고 버텼다.'], [{ cash: -400, hap: -5 }, '분위기에 휩쓸려 400만 원짜리 온열매트를 샀다. 떴다방이었다.']] },
    { label: '안 간다', mark: { thrift: 1 }, text: '세상에 공짜는 없다.', eff: {} },
  ] },
  { id: 's_grandkid_admission', title: '손주 합격', age: [60, 95], w: 0.03, cond: (s, p) => p.childIds.some((id) => s.people[id]?.childIds.some((g) => alive(s.people[g]) && age(s, s.people[g]) >= 18 && age(s, s.people[g]) <= 20)), text: '손주가 대학에 합격했다는 전화가 왔다! {n}의 목소리가 떨린다.', choices: [
    { label: '두둑한 입학 축하금', cost: 500, mark: { family: 1 }, text: '"할머니(할아버지) 최고!" 손주가 달려와 안겼다.', eff: { hap: 10 } },
    { label: '손편지를 써 준다', mark: { warmth: 1 }, text: '손주가 편지를 액자에 넣었다.', eff: { hap: 7 } },
  ] },
  { id: 's_license_return', title: '운전면허 반납', age: [72, 95], w: 0.03, cond: hasCar, text: '자녀들이 {n}에게 운전면허를 반납하라고 조심스레 권한다. 지자체에서 교통비 30만 원을 준단다.', choices: [
    { label: '반납한다', text: '차를 팔고 택시와 버스로 다닌다. 자녀들이 안심한다.', eff: { cash: 30, hap: -3 } },
    { label: '아직 멀쩡하다', text: '', roll: ['luck', 80, [{}, '조심히 탄다.'], [{ hp: -5, cash: -500, fame: -1 }, '주차장에서 페달을 헷갈렸다. 크게 다치진 않았다.']] },
  ] },
  { id: 's_hidden_cash', title: '비상금 발견', age: [60, 95], w: 0.02, text: '{n이} 이불장을 정리하다 수십 년 전 숨겨 둔 비상금 봉투를 찾았다.', choices: [
    { label: '손주 용돈으로', mark: { family: 1 }, text: '구권이 섞여 있었다. 은행에서 바꿔 손주들에게 나눠 줬다.', eff: { hap: 6 } },
    { label: '나를 위해 쓴다', text: '온천 여행을 다녀왔다.', eff: { hap: 5, hp: 1, cash: 50 } },
  ] },
  { id: 's_kid_divorce', title: '자녀의 이혼 소식', age: [55, 90], w: 0.015, cond: adultKids, text: '자녀가 {n}에게 이혼하겠다고 털어놓았다.', choices: [
    { label: '무조건 네 편이다', mark: { warmth: 2 }, text: '자녀가 한참 울었다. 손주들 걱정이 크다.', eff: { hap: -5 } },
    { label: '한 번만 더 생각해 보라고', text: '"엄마(아빠)는 몰라." 전화가 끊겼다.', eff: { hap: -4 } },
  ] },
  { id: 's_youtube_senior', title: '늦깎이 유튜버', age: [60, 90], w: 0.015, text: '손주가 찍어 준 {n}의 요리 영상이 조회수 100만을 넘었다!', choices: [
    { label: '채널을 키운다', mark: { art: 1 }, text: '', roll: ['cha', 40, [{ fame: 3, cash: 1500, hap: 10 }, '구독자 20만. 방송 출연 섭외까지 왔다.'], [{ hap: 3 }, '한 번 반짝하고 끝났다. 그래도 재밌었다.']] },
    { label: '한 번으로 족하다', text: '댓글을 하나하나 읽으며 웃었다.', eff: { hap: 5 } },
  ] },
  { id: 's_lonely', title: '적막한 저녁', age: [70, 95], w: 0.03, text: '하루 종일 {n}에게 걸려 온 전화가 한 통도 없다.', choices: [
    { label: '먼저 자녀에게 전화한다', mark: { family: 1 }, text: '"엄마(아빠) 무슨 일 있어?" 30분을 수다 떨었다.', eff: { hap: 5 } },
    { label: '경로당에 나간다', mark: { network: 1 }, text: '장기 한 판에 저녁이 금방 갔다.', eff: { hap: 4 } },
    { label: 'TV를 켠다', text: '적막이 조금 가셨다.', eff: { hap: -2 } },
  ] },
  { id: 's_nursing_home', title: '요양원 이야기', age: [78, 95], w: 0.02, cond: adultKids, text: '자녀들이 {n}에게 요양원 이야기를 꺼낸다. 요즘 자꾸 넘어지셔서 걱정이란다.', choices: [
    { label: '좋은 곳이면 가겠다', text: '시설 좋은 곳을 함께 둘러봤다. 친구도 생길 것 같다.', eff: { hap: -2, hp: 2 } },
    { label: '내 집에서 살다 가겠다', text: '방문 요양보호사가 매일 오기로 했다.', eff: { hap: 2 } },
  ] },
];
