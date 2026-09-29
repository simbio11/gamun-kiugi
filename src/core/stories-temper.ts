// 성향별 이야기: 아이의 타고난 성격이 사건을 만든다. 어떻게 받아 주느냐에 따라 그 성격이 어울리는 길로 이어진다.
import type { Story } from './stories';
import type { GameState, Person } from './types';
import { hasTrait, markOf } from './people';
import { INTEREST_KEYS } from './interests';
import { JOBS } from './data';

const is = (t: string) => (_s: GameState, p: Person) => hasTrait(p, t);

export const TEMPER_STORIES: Story[] = [
  // 내성적
  { id: 't_shy_present', title: '발표가 무서워', age: [7, 16], w: 0.05, cond: is('shy'), text: '내성적인 {n}. 내일 반 앞에서 발표를 해야 하는데 배가 아프다며 학교에 안 가겠단다.', choices: [
    { label: '거울 앞에서 같이 연습', mark: { warmth: 1 }, text: '', roll: ['cha', 30, [{ cha: 2, hap: 5 }, '목소리는 작았지만 끝까지 했다! 박수를 받았다.'], [{ hap: -3 }, '중간에 울먹였다. 그래도 도망가지 않았다.']] },
    { label: '글로 표현하는 걸 권한다', mark: { 'i:media': 2 }, text: '발표 대신 글을 써서 냈다. 선생님이 글솜씨를 칭찬했다.', eff: { int: 1, hap: 3 } },
    { label: '혼자 하는 활동을 찾아 준다', mark: { 'i:tech': 1, 'i:farm': 1 }, text: '코딩과 텃밭. 혼자 몰두할 때 {n}의 눈이 제일 반짝인다.', eff: { hap: 4 } },
    { label: '억지로라도 보낸다', mark: { hurt: 1 }, text: '발표는 했다. 그날 밤 이불 속에서 울었다.', eff: { hap: -5 } },
  ] },
  // 사교적
  { id: 't_social_party', title: '인싸의 고민', age: [8, 17], w: 0.05, cond: is('social'), text: '친구가 너무 많은 {n}. 생일 파티에 반 전체를 초대하고 싶단다.', choices: [
    { label: '다 초대하게 해 준다', cost: 50, mark: { network: 2, 'i:service': 1 }, text: '거실이 터질 듯했다. {n이} 파티를 척척 진행했다. 사회자 체질이다.', eff: { cha: 2, hap: 8 } },
    { label: '친한 친구만', text: '"다른 애들이 서운해할 텐데." 고민하다 쪽지를 돌렸다.', eff: { mor: 1 } },
    { label: '파티 대신 봉사활동을 함께', mark: { kind: 1, 'i:edu': 1 }, text: '친구들과 유기견 보호소에 갔다. 리더 노릇을 톡톡히 했다.', eff: { mor: 2, cha: 1 } },
  ] },
  // 리더십
  { id: 't_leader_team', title: '조장', age: [10, 18], w: 0.05, cond: is('leader'), text: '모둠 과제에서 {n이} 조장을 맡았다. 한 친구가 아무것도 안 한다.', choices: [
    { label: '역할을 다시 나눈다', mark: { 'i:public': 1, 'i:biz': 1 }, text: '', roll: ['cha', 40, [{ cha: 2 }, '그 친구가 자료 조사를 맡더니 제일 열심히 했다.'], [{ hap: -2 }, '결국 {n이} 다 했다.']] },
    { label: '선생님께 알린다', mark: { honest: 1 }, text: '공정하게 평가받았다. 친구와는 조금 서먹해졌다.', eff: { mor: 1 } },
    { label: '혼자 다 한다', text: 'A+를 받았다. 대신 몸살이 났다.', eff: { hp: -1, int: 1 } },
    { label: '반장 선거를 권한다', mark: { 'i:public': 2 }, text: '다음 학기 반장이 됐다. 체질이다.', eff: { cha: 1, flag: 'class_pres' } },
  ] },
  // 반항적
  { id: 't_rebel_rules', title: '교칙이 싫어', age: [12, 18], w: 0.05, cond: is('rebel'), text: '{n이} 두발 규정이 부당하다며 학교에 항의 글을 올렸다. 교무실이 발칵 뒤집혔다.', choices: [
    { label: '논리적으로 싸우게 도와준다', mark: { 'i:legal': 2, honest: 1 }, text: '', roll: ['int', 45, [{ fame: 1, cha: 1 }, '학생회가 나서서 규정이 바뀌었다. {n이} 학교의 스타가 됐다.'], [{ hap: -3 }, '벌점만 받았다. 그래도 물러서지 않는다.']] },
    { label: '그 에너지를 다른 데로', mark: { 'i:media': 1, 'i:sport': 1 }, text: '밴드부에 들어갔다. 반항은 무대 위에서 폭발한다.', eff: { hap: 5, cha: 1 } },
    { label: '크게 혼낸다', mark: { hurt: 2 }, text: '방문이 쾅. 사춘기가 더 거세졌다.', eff: { aff: -8 } },
  ] },
  // 성실
  { id: 't_diligent_burnout', title: '너무 열심히 하는 아이', age: [10, 18], w: 0.04, cond: is('diligent'), text: '성실한 {n}. 새벽 두 시까지 공부하다 코피가 났다.', choices: [
    { label: '잠은 꼭 자게 한다', mark: { warmth: 1 }, text: '12시 소등 규칙. 오히려 집중력이 올랐다.', eff: { hp: 2, study: 1 } },
    { label: '그 성실함에 맞는 목표를 같이 세운다', mark: { 'i:office': 1, 'i:legal': 1, 'i:public': 1 }, text: '"공무원, 회계사… 꾸준히 하면 되는 길이 많아." 표정이 밝아졌다.', eff: { mor: 1 } },
    { label: '대단하다고 칭찬만', text: '더 무리한다. 걱정이다.', eff: { hp: -2, study: 2 } },
  ] },
  // 느긋함
  { id: 't_lazy_dream', title: '하고 싶은 게 없어', age: [12, 19], w: 0.05, cond: is('lazy'), text: '느긋한 {n}. "하고 싶은 게 없어. 그냥 누워 있고 싶어."', choices: [
    { label: '좋아하는 걸 하나만 찾아보자', mark: { warmth: 1 }, text: '', roll: ['luck', 50, [{ hap: 5, 'mark': { 'i:media': 2 } }, '게임 방송 편집에 빠졌다. 처음으로 밤을 새웠다.'], [{ hap: 1 }, '아직은 모르겠단다. 천천히 가기로 했다.']] },
    { label: '아르바이트를 시켜 본다', mark: { thrift: 1, 'i:service': 1 }, text: '편의점 알바 석 달. 돈 버는 게 쉽지 않다는 걸 알았다.', eff: { mor: 2, cash: 100 } },
    { label: '다그친다', mark: { hurt: 1 }, text: '더 방에 틀어박혔다.', eff: { aff: -4 } },
    { label: '기다려 준다', text: '"때가 되면 하겠지." 조급함을 내려놓았다.', eff: { hap: 3 } },
  ] },
  // 예민함
  { id: 't_anxious_exam', title: '시험 불안', age: [10, 19], w: 0.05, cond: is('anxious'), text: '예민한 {n}. 시험 전날마다 잠을 못 자고 손을 떤다.', choices: [
    { label: '상담 센터에 간다', cost: 30, mark: { warmth: 1 }, text: '호흡법을 배웠다. 조금씩 나아진다.', eff: { hap: 5 } },
    { label: '꼼꼼함을 살릴 길을 이야기한다', mark: { 'i:tech': 1, 'i:office': 1 }, text: '"너처럼 세밀한 사람이 필요한 일이 많아. 연구원, 회계, 품질 관리…" 눈이 동그래졌다.', eff: { mor: 1 } },
    { label: '성적은 신경 쓰지 말라고', text: '', roll: ['luck', 50, [{ hap: 4 }, '부담을 덜자 오히려 잘 봤다.'], [{ hap: -2 }, '그래도 불안은 여전하다.']] },
  ] },
  // 낙천적
  { id: 't_cheerful_fail', title: '떨어져도 웃는 아이', age: [10, 19], w: 0.04, cond: is('cheerful'), text: '대회에서 떨어진 {n}이 "다음에 붙으면 돼!" 하고 웃는다.', choices: [
    { label: '그 긍정을 칭찬한다', mark: { warmth: 1, 'i:service': 1, 'i:edu': 1 }, text: '주변을 밝게 만드는 아이. 사람 상대하는 일이 잘 맞겠다.', eff: { cha: 1, hap: 3 } },
    { label: '실패 원인을 같이 본다', mark: { study: 1 }, text: '웃으면서도 오답 노트를 썼다.', eff: { int: 1 } },
  ] },
  // 효심·다정
  { id: 't_filial_care', title: '엄마(아빠) 아파?', age: [7, 16], w: 0.04, cond: is('filial'), text: '감기로 누운 {n}의 부모에게 {n이} 죽을 끓여 왔다. 소금을 너무 넣었지만.', choices: [
    { label: '맛있게 다 먹는다', mark: { warmth: 2 }, text: '"우리 {n}이 최고야." 아이가 뿌듯해했다.', eff: { aff: 6, hap: 5 } },
    { label: '돌보는 일이 잘 맞겠다고 말해 준다', mark: { 'i:medical': 2, 'i:edu': 1 }, text: '"간호사, 선생님… 사람을 돌보는 일 어때?" 아이가 진지하게 생각한다.', eff: { mor: 1 } },
  ] },
  // 알뜰함
  { id: 't_frugal_saver', title: '꼬마 저축왕', age: [8, 16], w: 0.04, cond: is('frugal'), text: '{n}의 저금통이 벌써 세 개째 꽉 찼다. 한 푼도 안 쓴다.', choices: [
    { label: '어린이 적금 통장을 만든다', mark: { 'i:office': 2, thrift: 1 }, text: '이자가 붙는 걸 보고 은행원이 되겠단다.', eff: { cash: 20, int: 1 } },
    { label: '가끔은 써도 된다고', text: '처음으로 친구에게 떡볶이를 샀다.', eff: { hap: 4, cha: 1 } },
    { label: '작은 장사를 해 보자고', mark: { 'i:biz': 2 }, text: '저금통 돈으로 문구 장사를 시작했다. 이윤을 계산한다.', eff: { int: 1 } },
  ] },
  // 낭비벽
  { id: 't_spender_gacha', title: '뽑기 중독', age: [9, 17], w: 0.04, cond: (s, p) => is('spender')(s, p) || is('gambler')(s, p), text: '{n이} 용돈을 전부 캡슐 뽑기와 게임 가챠에 썼다.', choices: [
    { label: '용돈 기입장을 쓰게 한다', mark: { thrift: 1 }, text: '한 달 지출을 보고 스스로 놀랐다.', eff: { mor: 1 } },
    { label: '확률을 같이 계산해 본다', mark: { 'i:tech': 1, study: 1 }, text: '"0.5%면… 200번 뽑아야 하네?" 수학이 재밌어졌다.', eff: { int: 2 } },
    { label: '파는 쪽이 돼 보라고', mark: { 'i:biz': 2 }, text: '"사는 사람 말고 파는 사람이 돼 볼래?" 눈이 번쩍 뜨였다.', eff: { int: 1 } },
    { label: '용돈을 끊는다', mark: { hurt: 1 }, text: '몰래 부모님 카드를 썼다가 걸렸다.', eff: { aff: -5 } },
  ] },
  // 튼튼함
  { id: 't_tough_energy', title: '에너지 폭발', age: [6, 15], w: 0.04, cond: is('tough'), text: '튼튼한 {n}. 집 안에서 뛰어다니다 아랫집에서 올라왔다.', choices: [
    { label: '운동을 시킨다', cost: 20, mark: { 'i:sport': 2 }, text: '축구 클럽에 넣었다. 집이 조용해졌다.', eff: { str: 2, hap: 5 } },
    { label: '몸 쓰는 일 체험', mark: { 'i:trade': 1, 'i:public': 1 }, text: '소방관 체험에서 호스를 번쩍 들었다. 소방관 아저씨가 탐냈다.', eff: { str: 1 } },
    { label: '아랫집에 사과하고 매트를 깐다', cost: 30, text: '평화를 되찾았다.', eff: {} },
  ] },
  // 섬세함·병약
  { id: 't_frail_hobby', title: '자주 아픈 아이', age: [6, 14], w: 0.04, cond: is('frail'), text: '잔병치레가 잦은 {n}. 또 감기로 학교를 빠졌다. 침대에서 심심해한다.', choices: [
    { label: '그림 도구를 사 준다', cost: 10, mark: { 'i:media': 2, art: 1 }, text: '침대 위가 작업실이 됐다. 섬세한 그림체가 나온다.', eff: { cha: 1, hap: 4 } },
    { label: '태블릿으로 코딩 강좌', cost: 20, mark: { 'i:tech': 2 }, text: '누워서 만든 퀴즈 게임을 가족에게 자랑했다.', eff: { int: 1, hap: 3 } },
    { label: '체력부터 기르자', cost: 30, mark: { exercise: 1 }, text: '수영을 시작했다. 감기가 줄었다.', eff: { hp: 3 } },
  ] },
  // 야심
  { id: 't_ambitious_goal', title: '1등 아니면 싫어', age: [10, 19], w: 0.04, cond: is('ambitious'), text: '{n이} 2등 상장을 구겨 버렸다. "1등 아니면 의미 없어."', choices: [
    { label: '큰 목표를 같이 세운다', mark: { 'i:legal': 1, 'i:biz': 1, 'i:public': 1 }, text: '"대통령, 대기업 회장, 대법관… 어디까지 가 볼래?" 불꽃이 튄다.', eff: { mor: 1, study: 1 } },
    { label: '과정도 중요하다고', mark: { warmth: 1 }, text: '한참 말이 없더니 상장을 펴서 벽에 붙였다.', eff: { mor: 2 } },
    { label: '1등 할 때까지 지원한다', cost: 300, mark: { study: 2 }, text: '학원을 늘렸다. 다음엔 1등을 했다. 표정은 여전히 비장하다.', eff: { study: 3, hap: -3 } },
  ] },
  // 한결같음
  { id: 't_devoted_pet', title: '한결같은 아이', age: [7, 15], w: 0.03, cond: is('devoted'), text: '{n이} 3년째 매일 같은 시간에 학교 앞 길고양이 밥을 챙긴다.', choices: [
    { label: '동물 병원 봉사를 알아봐 준다', mark: { 'i:medical': 2, kind: 1 }, text: '수의사 선생님이 "이런 애는 처음"이라고 했다.', eff: { mor: 2 } },
    { label: '사료값을 보태 준다', cost: 10, mark: { kind: 1 }, text: '고양이들이 {n}만 보면 뛰어온다.', eff: { hap: 4 } },
  ] },
  // 인기 많음
  { id: 't_flirt_popular', title: '고백 러시', age: [13, 19], w: 0.04, cond: is('flirt'), text: '밸런타인데이. {n}의 책상에 초콜릿이 산처럼 쌓였다.', choices: [
    { label: '끼를 살려 보라고', mark: { 'i:media': 2 }, text: '방송 댄스부에 들어갔다. 무대 위에서 빛난다.', eff: { cha: 2, hap: 5 } },
    { label: '공부부터', mark: { study: 1 }, text: '"대학 가서." 초콜릿은 가족이 나눠 먹었다.', eff: { study: 1 } },
    { label: '사람 마음을 소중히 하라고', mark: { honest: 1 }, text: '한 명 한 명에게 정중히 답장했다.', eff: { mor: 2 } },
  ] },
  // ───────── 어른이 되어서: 어릴 적 관심이 다시 부른다 ─────────
  { id: 't_dream_return', title: '어릴 적 꿈', age: [30, 50], w: 0.04, cond: (_s, p) => !['none', 'parttime', 'pension'].includes(p.job) && INTEREST_KEYS.some((k) => markOf(p, 'i:' + k) >= 5 && JOBS[p.job]?.cat !== k), text: '{n}이 퇴근길에 어릴 때 푹 빠졌던 것들을 떠올린다. "그때 그 길로 갔으면 어땠을까?"', choices: [
    { label: '과감히 전직한다 (내년에 새 직업 고르기)', mark: { risk: 1 }, text: '사표를 냈다. 가족이 반은 걱정, 반은 응원이다. 새 길을 찾는다.', eff: { hap: 6, flag: 'laid_off', later: [1, 1, 1, 'first_job'] } },
    { label: '주말에 취미로 다시 시작', cost: 50, text: '주말이 기다려진다. 월요병이 조금 줄었다.', eff: { hap: 8 } },
    { label: '지금 일에 그 경험을 살린다', mark: { network: 1 }, text: '어릴 적 관심을 살린 사내 프로젝트를 제안했다. 반응이 좋다.', eff: { cha: 1, int: 1 } },
    { label: '추억은 추억으로', text: '앨범을 덮었다.', eff: {} },
  ] },
  { id: 't_kid_same_path', title: '나를 닮은 아이', age: [35, 60], w: 0.04, cond: (s, p) => p.childIds.some((id) => { const k = s.people[id]; return !!k && markOf(k, 'i:' + (JOBS[p.job]?.cat ?? '')) >= 3; }), text: '{n}의 아이가 부모의 일에 관심을 보인다. "나도 커서 엄마(아빠)처럼 될래."', choices: [
    { label: '일터에 데려가 보여 준다', mark: { family: 1 }, text: '아이가 반짝이는 눈으로 하루를 따라다녔다.', eff: { hap: 6 } },
    { label: '힘든 점도 솔직하게', mark: { honest: 1 }, text: '"그래도 할래." 아이의 대답이 단단하다.', eff: { mor: 1 } },
    { label: '다른 길을 권한다', text: '"엄마(아빠) 일은 힘들어. 넌 더 좋은 거 해."', eff: {} },
  ] },
  { id: 't_second_career', title: '인생 이모작', age: [50, 65], w: 0.04, cond: (_s, p) => INTEREST_KEYS.some((k) => markOf(p, 'i:' + k) >= 3), text: '정년이 다가온다. {n}은 은퇴 뒤에 어릴 적 좋아하던 분야로 다시 일해 볼까 고민한다.', choices: [
    { label: '관련 자격증을 딴다', cost: 100, mark: { cert: 1 }, text: '', roll: ['int', 40, [{ hap: 8, int: 1 }, '합격! 은퇴 뒤 할 일이 생겼다.'], [{ hap: -2 }, '떨어졌다. 내년에 다시.']] },
    { label: '재능 기부를 시작한다', mark: { kind: 2 }, text: '동네 아이들에게 가르친다. 보람이 크다.', eff: { mor: 2, hap: 6 } },
    { label: '푹 쉰다', text: '그동안 고생했다.', eff: { hap: 3 } },
  ] },
];
