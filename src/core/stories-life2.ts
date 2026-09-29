// 이야기 묶음 2: 가족·형제·사돈·이웃·돈·취미. 몇몇은 선택에 따라 몇 년 뒤 뒷이야기가 온다 (w: 0 = 예약으로만).
import type { Story } from './stories';
import type { GameState, Person } from './types';
import { age, alive, parentsOf, spouseOf } from './people';

const married = (s: GameState, p: Person) => !!spouseOf(s, p) && alive(spouseOf(s, p)!);
const hasKids = (s: GameState, p: Person) => p.childIds.some((id) => alive(s.people[id]) && age(s, s.people[id]) < 20);
const adultKids = (s: GameState, p: Person) => p.childIds.some((id) => alive(s.people[id]) && age(s, s.people[id]) >= 22);
const hasSibling = (s: GameState, p: Person) => parentsOf(s, p).some((q) => q.childIds.some((id) => id !== p.id && alive(s.people[id])));
const hasParents = (s: GameState, p: Person) => parentsOf(s, p).some(alive);
const working = (_s: GameState, p: Person) => !['none', 'parttime', 'pension'].includes(p.job) && !p.flags.includes('student');

export const LIFE2_STORIES: Story[] = [
  // ───────── 어린 시절 ─────────
  { id: 'l2_sibling_fight', title: '형제의 난', age: [6, 14], w: 0.04, cond: hasSibling, text: '{n이} 형제와 리모컨을 두고 한바탕 싸웠다. 거실이 전쟁터다.', choices: [
    { label: '둘 다 벌 세운다', mark: { honest: 1 }, text: '벽 보고 손들고 있다가 둘이 킥킥 웃기 시작했다.', eff: { mor: 1 } },
    { label: '규칙을 같이 정하게 한다', mark: { warmth: 1 }, text: '"요일별로 채널 정하기" 협정이 체결됐다.', eff: { int: 1, hap: 3 } },
    { label: '큰애한테 양보하라고 한다', mark: { hurt: 1 }, text: '"맨날 나만 참아!" 문이 쾅 닫혔다.', eff: { aff: -4 } },
  ] },
  { id: 'l2_first_sleepover', title: '친구 집에서 자고 올래', age: [8, 13], w: 0.03, text: '{n이} 친구 집에서 파자마 파티를 하고 싶단다.', choices: [
    { label: '보내 준다', mark: { network: 1 }, text: '밤새 무서운 얘기를 했단다. 눈 밑이 퀭하게 돌아왔다.', eff: { hap: 7, cha: 1 } },
    { label: '우리 집으로 초대하라고', cost: 10, mark: { warmth: 1 }, text: '치킨과 보드게임. 거실이 친구들로 가득했다.', eff: { hap: 6 } },
    { label: '아직 이르다', text: '"다른 애들은 다 가는데…"', eff: { hap: -3 } },
  ] },
  { id: 'l2_piggy_bank', title: '세뱃돈 관리', age: [7, 14], w: 0.04, text: '설날, {n이} 세뱃돈으로 30만 원을 받았다. "이거 내 돈이지?"', choices: [
    { label: '어린이 통장을 만들어 준다', mark: { thrift: 2 }, text: '통장에 찍힌 숫자를 보며 뿌듯해한다. 이자가 붙는 걸 신기해했다.', eff: { int: 1, cash: 30 } },
    { label: '반은 쓰고 반은 저축', mark: { thrift: 1 }, text: '갖고 싶던 레고를 사고 나머지는 저금통에.', eff: { hap: 4 } },
    { label: '엄마가 맡아 둘게', mark: { hurt: 1 }, text: '"그 돈 다 어디 갔어?" 스무 살까지 두고두고 들을 말이다.', eff: { aff: -3 } },
  ] },
  { id: 'l2_school_violence', title: '학폭 신고', age: [10, 17], w: 0.02, text: '{n}의 반에서 학교폭력 신고가 들어왔다. {n이} 목격자라며 진술을 부탁받았다.', choices: [
    { label: '본 대로 말하라고 한다', mark: { honest: 2 }, text: '', roll: ['mor', 40, [{ mor: 3 }, '용기 있게 증언했다. 피해 학생이 고맙다고 했다.'], [{ hap: -5 }, '가해 학생 무리가 {n을} 째려본다. 한동안 불편하다.']] },
    { label: '얽히지 말라고 한다', text: '침묵했다. {n}의 표정이 복잡하다.', eff: { mor: -2 } },
  ] },
  { id: 'l2_idol_audition', title: '아이돌 오디션', age: [12, 18], w: 0.02, cond: (_s, p) => p.actual.cha >= 55, text: '길거리 캐스팅! 기획사 명함을 든 {n이} 연습생을 하고 싶다고 한다.', choices: [
    { label: '한번 해 보라고 한다', mark: { art: 2 }, text: '', roll: ['cha', 65, [{ cha: 3, fame: 1, flag: 'trainee' }, '연습생 계약! 주말마다 서울 연습실로 간다.'], [{ hap: -6 }, '3차 오디션에서 떨어졌다. 한 달을 울었다.']] },
    { label: '공부가 먼저다', mark: { study: 1 }, text: '명함은 서랍 속으로. 가끔 꺼내 본다.', eff: { hap: -5, aff: -3 } },
  ] },

  // ───────── 청년 ─────────
  { id: 'l2_leave_home', title: '첫 자취', age: [20, 30], w: 0.04, cond: (s, p) => !married(s, p) && hasParents(s, p), text: '{n이} 회사 근처로 자취를 하고 싶다고 한다. 월세만 60만 원이다.', choices: [
    { label: '보증금을 보태 준다', cost: 500, mark: { warmth: 1 }, text: '이삿날, 엄마가 반찬을 한가득 싸 주셨다. 냉장고가 꽉 찼다.', eff: { hap: 6, mor: 1 } },
    { label: '제 돈으로 하라고', mark: { thrift: 1 }, text: '고시원부터 시작했다. 독립의 맛은 짜다.', eff: { mor: 2, hap: -2 } },
    { label: '돈 모을 때까지 집에 있어', text: '출퇴근 두 시간. 대신 통장은 빨리 찬다.', eff: { cash: 500, hap: -3 } },
  ] },
  { id: 'l2_friend_business', title: '같이 창업하자', age: [25, 45], w: 0.03, cond: working, text: '대학 동기가 {n}에게 "같이 창업하자, 지분 30% 줄게"라고 한다.', choices: [
    { label: '회사를 그만두고 합류', mark: { risk: 2 }, text: '', roll: ['luck', 30, [{ cash: 8000, fame: 2, hap: 10 }, '투자 유치 성공! 지분 가치가 억 단위가 됐다.'], [{ cash: -1500, hap: -10, flag: 'laid_off' }, '2년 만에 폐업. 동기와 사이도 틀어졌다.']] },
    { label: '돈만 조금 투자', cost: 1000, mark: { risk: 1 }, text: '', roll: ['luck', 35, [{ cash: 4000 }, '투자금이 네 배가 됐다!'], [{}, '투자금은 잊기로 했다.']] },
    { label: '응원만 한다', text: '"잘되면 밥 사." 그걸로 됐다.', eff: {} },
  ] },
  { id: 'l2_mbti_date', title: '소개팅 앱', age: [22, 38], w: 0.03, cond: (s, p) => !married(s, p) && !p.partnerId, text: '친구들이 {n}의 휴대폰에 소개팅 앱을 깔아 줬다. 프로필 사진을 골라야 한다.', choices: [
    { label: '스튜디오 프로필을 찍는다', cost: 30, text: '', roll: ['cha', 45, [{ hap: 6, cha: 1 }, '"좋아요"가 쏟아진다. 매칭이 세 건.'], [{ hap: -3 }, '사진은 예쁜데 대화가 이어지지 않는다.']] },
    { label: '있는 그대로', mark: { honest: 1 }, text: '매칭은 적지만 대화가 잘 통하는 사람이 있다.', eff: { hap: 2 } },
    { label: '지운다', text: '역시 사람은 직접 만나야지.', eff: {} },
  ] },
  { id: 'l2_crypto_friend', title: '코인으로 퇴사한 동기', age: [23, 40], w: 0.03, cond: working, text: '입사 동기가 코인으로 20억을 벌어 퇴사했다. {n}의 단톡방이 들썩인다.', choices: [
    { label: '나도 한다 (1,000만)', cost: 1000, mark: { risk: 2 }, text: '', roll: ['luck', 20, [{ cash: 5000, hap: 10 }, '다섯 배! 그런데 팔 타이밍을 몰라 불안하다.'], [{ hap: -8 }, '고점에 물렸다. 원금이 3분의 1이 됐다.']] },
    { label: '부러워만 한다', mark: { thrift: 1 }, text: '"운이 좋았겠지." 그래도 잠이 안 온다.', eff: { hap: -3 } },
  ] },
  { id: 'l2_military_reserve', title: '예비군 훈련', age: [22, 29], w: 0.03, cond: (_s, p) => p.sex === 'M' && p.flags.includes('served'), text: '{n}에게 예비군 동원 훈련 통지서가 왔다. 2박 3일이다.', choices: [
    { label: '성실하게 받는다', text: '사격 만발! 조기 퇴소 포상을 받았다.', eff: { str: 1, hap: 2 } },
    { label: '대충 시간만 때운다', text: '누워서 하늘만 봤다. 그것도 나름 휴가.', eff: { hap: 3 } },
  ] },

  // ───────── 부부·가정 ─────────
  { id: 'l2_inlaw_holiday', title: '명절 어디부터', age: [28, 60], w: 0.05, cond: married, text: '설날이다. {n}의 부부가 어느 집부터 갈지로 신경전이다.', choices: [
    { label: '번갈아 가기로 정한다', mark: { family: 1 }, text: '"올해는 처가(시댁)부터." 공평하게 정리했다.', eff: { bond: 4 } },
    { label: '명절 여행을 떠난다', cost: 200, text: '양가에 선물만 보내고 제주로 떠났다. 한쪽 부모님이 서운해하신다.', eff: { hap: 8, bond: 3 } },
    { label: '늘 하던 대로', mark: { hurt: 1 }, text: '돌아오는 차 안이 조용했다.', eff: { bond: -5 } },
  ] },
  { id: 'l2_inlaw_money', title: '사돈의 부탁', age: [30, 65], w: 0.03, cond: married, text: '배우자의 부모님이 사업 자금이 급하다며 {n}에게 3,000만 원을 부탁하신다.', choices: [
    { label: '드린다', cost: 3000, mark: { kind: 1 }, text: '"고맙네." 배우자가 몰래 눈물을 훔쳤다.', eff: { bond: 10, later: [0.5, 2, 5, 'st_l2_inlaw_repay'] } },
    { label: '반만 드린다', cost: 1500, text: '최선을 다했다. 모두 조금씩 아쉽다.', eff: { bond: 3 } },
    { label: '정중히 거절한다', mark: { thrift: 1 }, text: '"그럴 수 있지." 말은 그렇게 했지만 공기가 차가워졌다.', eff: { bond: -8 } },
  ] },
  { id: 'l2_inlaw_repay', title: '돌려받은 돈', age: [30, 90], w: 0, text: '몇 년 전 사돈께 드렸던 돈이 이자까지 붙어 돌아왔다. "그때 정말 고마웠네."', choices: [
    { label: '감사히 받는다', text: '돈보다 마음이 오갔다. 두 집안이 더 가까워졌다.', eff: { cash: 3500, bond: 5, hap: 5 } },
  ] },
  { id: 'l2_housework', title: '집안일 분담', age: [28, 60], w: 0.04, cond: married, text: '맞벌이 부부. {n}의 배우자가 "왜 집안일은 나만 해?"라고 폭발했다.', choices: [
    { label: '분담표를 만든다', mark: { family: 1 }, text: '냉장고에 분담표가 붙었다. 설거지는 {n} 담당.', eff: { bond: 6, hap: -1 } },
    { label: '가사도우미를 부른다', cost: 300, text: '주 1회 도우미. 돈으로 평화를 샀다.', eff: { bond: 4, hap: 3 } },
    { label: '"나도 바빠"', mark: { hurt: 1 }, text: '그날 밤 소파에서 잤다.', eff: { bond: -10 } },
  ] },
  { id: 'l2_second_child', title: '둘째 고민', age: [30, 42], w: 0.04, cond: (s, p) => married(s, p) && p.childIds.filter((id) => alive(s.people[id])).length === 1, text: '첫째가 "동생 낳아 줘"라고 조른다. {n}의 부부는 둘째를 고민한다.', choices: [
    { label: '둘째를 갖자', mark: { family: 1 }, text: '둘째를 갖기로 했다. (방침 탭 가족계획을 2명 이상으로)', eff: { bond: 4 } },
    { label: '외동으로 충분하다', text: '"너 하나로 충분해." 첫째를 꼭 안아 줬다.', eff: { hap: 2 } },
  ] },
  { id: 'l2_kid_phone_bill', title: '게임 결제 폭탄', age: [30, 55], w: 0.03, cond: hasKids, text: '카드 명세서에 모르는 게임 결제가 80만 원. 범인은 {n}의 아이다.', choices: [
    { label: '환불 신청 + 엄하게 교육', mark: { honest: 1 }, text: '', roll: ['luck', 60, [{ hap: 1 }, '미성년자 결제라 환불됐다. 아이는 용돈을 석 달 삭감당했다.'], [{ cash: -80, hap: -3 }, '환불이 안 됐다. 비싼 수업료였다.']] },
    { label: '그냥 넘어간다', text: '다음 달 명세서가 무섭다.', eff: { cash: -80 } },
  ] },
  { id: 'l2_kid_wedding_cost', title: '자녀 결혼 자금', age: [50, 75], w: 0.04, cond: adultKids, text: '결혼을 앞둔 자녀가 {n}에게 조심스레 말을 꺼냈다. "전세금이 조금 모자라요."', choices: [
    { label: '1억을 보태 준다', cost: 10000, mark: { family: 1 }, text: '"평생 갚을게요." 자녀가 울었다. 증여세 신고는 잊지 말자 (결혼·출산 공제 1억).', eff: { hap: 6 } },
    { label: '3,000만 원만', cost: 3000, text: '마음만큼은 다 주고 싶었다.', eff: { hap: 3 } },
    { label: '너희 힘으로 해라', mark: { thrift: 1 }, text: '"알겠어요." 서운한 기색을 감추지 못했다.', eff: { hap: -2 } },
  ] },

  // ───────── 중년·노년 ─────────
  { id: 'l2_sibling_inherit', title: '형제 사이 돈 문제', age: [40, 75], w: 0.03, cond: hasSibling, text: '부모님 병원비를 누가 더 냈느냐로 {n}과 형제 사이가 틀어졌다.', choices: [
    { label: '내가 더 내겠다', cost: 500, mark: { filial: 1, kind: 1 }, text: '"그래, 형(언니)이 낼게." 조용히 정리됐다.', eff: { mor: 2 } },
    { label: '영수증을 다 까고 정산', mark: { honest: 1 }, text: '엑셀로 1원 단위까지 나눴다. 정확하지만 차갑다.', eff: { hap: -2 } },
    { label: '연락을 끊는다', mark: { hurt: 2 }, text: '명절에 형제 자리가 비었다.', eff: { hap: -6 } },
  ] },
  { id: 'l2_midlife', title: '오춘기', age: [42, 55], w: 0.04, text: '{n이} 요즘 부쩍 "내 인생은 뭐였나" 하며 멍하니 있는다.', choices: [
    { label: '버킷리스트 여행', cost: 400, text: '혼자 산티아고 순례길을 걸었다. 돌아온 얼굴이 가벼웠다.', eff: { hap: 12, hp: 1 } },
    { label: '새로운 취미를 시작한다', cost: 100, mark: { art: 1 }, text: '색소폰을 샀다. 이웃이 조금 괴로워한다.', eff: { hap: 6, cha: 1 } },
    { label: '일에 더 몰두한다', text: '공허함을 야근으로 덮었다.', eff: { hap: -3, cash: 300 } },
  ] },
  { id: 'l2_old_friend_death', title: '친구의 부고', age: [50, 95], w: 0.04, text: '{n}의 고향 친구가 갑자기 세상을 떠났다는 부고가 왔다.', choices: [
    { label: '만사 제치고 문상 간다', mark: { kind: 1 }, text: '영정 사진 속 친구는 스무 살 그대로 웃고 있었다. 건강검진을 예약했다.', eff: { hap: -6, mor: 2, cash: -10 } },
    { label: '조의금만 보낸다', text: '마음 한편이 무겁다.', eff: { hap: -4, cash: -10 } },
  ] },
  { id: 'l2_grandkid_care', title: '황혼 육아', age: [55, 80], w: 0.05, cond: (s, p) => p.childIds.some((id) => s.people[id]?.childIds.some((g) => alive(s.people[g]) && age(s, s.people[g]) < 6)), text: '맞벌이하는 자녀가 {n}에게 손주를 봐 달라고 부탁한다.', choices: [
    { label: '맡아 준다 (용돈 받고)', mark: { family: 2 }, text: '손주 재롱에 하루가 금방 간다. 허리는 매일 쑤신다.', eff: { hap: 6, hp: -2, cash: 600 } },
    { label: '주 2~3회만', text: '적당한 거리가 서로에게 좋다.', eff: { hap: 3 } },
    { label: '내 인생도 있다', text: '"우리도 이제 좀 쉬자." 자녀가 어린이집을 알아본다.', eff: { hap: 2 } },
  ] },
  { id: 'l2_retire_hobby', title: '은퇴 후 첫 월요일', age: [58, 70], w: 0.05, cond: (_s, p) => p.job === 'pension' || p.job === 'none', text: '알람 없이 눈을 뜬 {n}. 오늘부터 뭘 하지?', choices: [
    { label: '재취업·자격증 도전', mark: { study: 1 }, text: '', roll: ['int', 40, [{ cash: 1200, hap: 5 }, '주택관리사 자격증을 따 아파트 관리소장이 됐다.'], [{ hap: -3 }, '"나이가 좀…" 이력서를 스무 곳 넣었다.']] },
    { label: '등산·파크골프 모임', mark: { exercise: 1, network: 1 }, text: '동네 친구가 스무 명 생겼다.', eff: { hp: 3, hap: 6 } },
    { label: '손 놓고 쉰다', text: '한 달은 좋았다. 두 달째부터 TV만 본다.', eff: { hap: -2, hp: -1 } },
  ] },
  { id: 'l2_will_talk', title: '유산 이야기', age: [65, 95], w: 0.03, cond: adultKids, text: '명절 밥상에서 자녀 하나가 {n}에게 "나중에 집은 누가 가져요?"라고 물었다.', choices: [
    { label: '공평하게 나눈다고 못 박는다', mark: { honest: 1 }, text: '밥상 분위기가 정리됐다. 나중에 유언장을 쓰기로 했다.', eff: { mor: 1 } },
    { label: '"내가 죽어야 알지"', text: '어색한 웃음. 자녀들이 서로 눈치를 본다.', eff: { hap: -2 } },
  ] },
  { id: 'l2_dementia_scare', title: '깜빡깜빡', age: [70, 95], w: 0.04, text: '{n이} 가스 불을 켜 두고 외출했다. 이웃이 연기를 보고 신고했다.', choices: [
    { label: '치매 검사를 받는다', mark: { honest: 1 }, text: '', roll: ['hp', 30, [{ hap: 3 }, '경도인지장애 전 단계. 두뇌 훈련을 시작했다.'], [{ hap: -8, flag: 'chronic' }, '초기 치매 진단. 약을 먹기 시작했다.']] },
    { label: '자동 소화 장치를 단다', cost: 30, text: '가스 차단기를 달았다. 자녀들이 조금 안심한다.', eff: {} },
  ] },

  // ───────── 사회·돈 ─────────
  { id: 'l2_fraud_call', title: '검찰 사칭 전화', age: [25, 90], w: 0.03, text: '"서울중앙지검입니다. {n} 님 명의 통장이 범죄에 쓰였습니다." 목소리가 진지하다.', choices: [
    { label: '끊고 112에 확인', mark: { honest: 1 }, text: '보이스피싱이었다. 신고해서 번호가 정지됐다.', eff: { int: 1 } },
    { label: '시키는 대로 한다', text: '', roll: ['int', 45, [{}, '중간에 뭔가 이상해 멈췄다. 휴…'], [{ cash: -2000, hap: -15 }, '안전 계좌로 옮기라는 말에 속았다. 2천만 원이 사라졌다.']] },
  ] },
  { id: 'l2_rent_hike', title: '월세 인상 통보', age: [22, 70], w: 0.04, cond: (_s, p) => p.home?.type === 'wolse', text: '집주인이 {n}에게 다음 계약부터 월세를 10만 원 올리겠다고 통보했다.', choices: [
    { label: '5%만 올려 달라고 협상', mark: { honest: 1 }, text: '', roll: ['cha', 40, [{ hap: 3 }, '임대차 3법 이야기를 꺼냈더니 5%로 합의했다.'], [{ hap: -3, cash: -60 }, '"싫으면 나가세요." 결국 다 올려 줬다.']] },
    { label: '받아들인다', text: '월세 부담이 늘었다.', eff: { cash: -120 } },
  ] },
  { id: 'l2_apartment_rebuild', title: '재건축 조합', age: [35, 90], w: 0.03, cond: (_s, p) => p.home?.type === 'own', text: '{n}네 아파트가 재건축 안전진단을 통과했다! 조합 총회가 열린다.', choices: [
    { label: '조합원으로 적극 참여', mark: { network: 1 }, text: '', roll: ['luck', 50, [{ hap: 8, fame: 1 }, '사업이 순조롭다. 새 아파트 입주가 머지않았다.'], [{ hap: -6, cash: -500 }, '조합 비리 뉴스가 터졌다. 추가 분담금 폭탄.']] },
    { label: '팔고 나간다', text: '기대감에 호가가 올랐을 때 정리할까 고민 중이다.', eff: { hap: 2 } },
  ] },
  { id: 'l2_donation_big', title: '고향 장학회', age: [50, 90], w: 0.03, cond: (_s, p) => p.cash >= 10000, text: '고향 중학교에서 {n}에게 장학회 설립을 제안했다. 이름을 붙인 장학금이다.', choices: [
    { label: '1억을 출연한다', cost: 10000, mark: { kind: 2 }, text: '"○○ 장학금" 첫 수여식. 아이들이 꾸벅 인사했다. 기부금 세액공제도 받는다.', eff: { fame: 5, mor: 4, hap: 6, cash: 2500 } },
    { label: '매년 조금씩', cost: 500, mark: { kind: 1 }, text: '해마다 장학생 한 명의 등록금을 댄다.', eff: { fame: 1, mor: 2 } },
    { label: '사양한다', text: '아직은 때가 아니다.', eff: {} },
  ] },
];
