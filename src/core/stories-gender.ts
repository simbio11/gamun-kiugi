// 성별에 따라 다른 삶의 장면들. 시대마다 달라진 기대와 편견, 그걸 넘어서는 선택.
//   (1960~80년대 장면은 id를 h_ 로 시작해 근현대사 초반에도 나온다)
import type { Story } from './stories';
import type { GameState, Person } from './types';
import { age } from './people';

const F = (_s: GameState, p: Person) => p.sex === 'F';
const M = (_s: GameState, p: Person) => p.sex === 'M';
const working = (p: Person) => !['none', 'parttime', 'pension'].includes(p.job);
const Fw = (s: GameState, p: Person) => F(s, p) && working(p);
const Mw = (s: GameState, p: Person) => M(s, p) && working(p);
const Fkid = (s: GameState, p: Person) => F(s, p) && p.childIds.length > 0;
const Mkid = (s: GameState, p: Person) => M(s, p) && p.childIds.length > 0 && p.childIds.some((id) => s.people[id] && age(s, s.people[id]) < 7);

export const GENDER_STORIES: Story[] = [
  // ── 여성 ──
  { id: 'h_g_girl_school', title: '"여자가 공부는 무슨"', age: [12, 16], w: 0.08, cooldown: 99, era: [1960, 1985], cond: F, text: '중학교 졸업을 앞둔 {n}. 친척 어른이 "여자애가 공부는 무슨, 공장 가서 동생들 뒷바라지해야지" 한다.', choices: [
    { label: '선생님께 도움을 청한다', text: '', roll: ['int', 50, [{ int: 3, hap: 6, study: 3 }, '장학금 추천서를 받았다. 고등학교에 간다!'], [{ hap: -8 }, '선생님도 어쩔 수 없다며 고개를 숙였다.']] },
    { label: '공장에 나가 야간학교를 다닌다', text: '낮엔 미싱, 밤엔 교과서. 손끝이 갈라져도 책은 놓지 않았다.', eff: { cash: 100, int: 2, hp: -3, mor: 2 } },
  ] },
  { id: 'g_first_makeup', title: '첫 화장', age: [14, 19], w: 0.06, cooldown: 99, cond: F, text: '{n}이(가) 친구 따라 처음으로 틴트를 발랐다. 거울 속 얼굴이 낯설다.', choices: [
    { label: '마음에 든다', text: '괜히 하루 종일 웃었다.', eff: { hap: 5, cha: 1 } },
    { label: '민낯이 편하다', text: '"그대로가 예뻐." 친구가 말했다.', eff: { hap: 2 } },
  ] },
  { id: 'g_glass_ceiling', title: '유리천장', age: [32, 55], w: 0.05, cooldown: 10, years: [1990, 2040], cond: Fw, text: '승진 심사에서 {n}보다 실적이 낮은 남자 동료가 팀장이 됐다. "여자는 애 낳으면 그만두잖아"라는 말이 돌았다.', choices: [
    { label: '실적으로 다시 증명한다', text: '', roll: ['int', 58, [{ promo: 1, fame: 1, hap: 6 }, '다음 해, 회사 첫 여성 임원 후보가 됐다.'], [{ hap: -6 }, '또 밀렸다. 지친다.']] },
    { label: '인사팀에 공식 이의를 제기한다', text: '', roll: ['cha', 55, [{ mor: 2, promo: 1 }, '재심사 끝에 결과가 바뀌었다.'], [{ hap: -5, promo: -1 }, '"분위기 흐린다"는 소리를 들었다.']] },
  ] },
  { id: 'g_career_break', title: '경력단절', age: [30, 45], w: 0.06, cooldown: 12, years: [1985, 2045], cond: Fkid, text: '아이를 키우느라 일을 쉰 지 몇 년. {n}은(는) 다시 일하고 싶다. 이력서의 빈칸이 무겁다.', choices: [
    { label: '새일센터 재취업 과정을 듣는다', text: '', roll: ['int', 50, [{ int: 2, hap: 8, cash: 300 }, '6개월 과정을 마치고 새 일을 시작했다.'], [{ hap: -3 }, '면접에서 "애는 누가 봐요?"라는 질문만 들었다.']] },
    { label: '작게 내 일을 시작한다', text: '', roll: ['cha', 50, [{ cash: 500, hap: 6 }, '동네 공방이 입소문을 탔다.'], [{ cash: -300 }, '생각보다 손님이 없다.']] },
  ] },
  { id: 'g_mom_group', title: '엄마들 모임', age: [28, 50], w: 0.05, cooldown: 5, years: [1995, 2060], cond: Fkid, text: '유치원 엄마들 모임. 학원 정보, 집값, 남편 연봉 이야기가 오간다.', choices: [
    { label: '열심히 끼어서 정보를 얻는다', text: '좋은 선생님 정보를 얻었다. 대신 지갑이 조금 얇아졌다.', eff: { cash: -50, cha: 1, study: 1 } },
    { label: '적당히 거리를 둔다', text: '"그 집 엄마는 쿨하더라." 조금은 외로웠지만 마음은 편했다.', eff: { hap: 2 } },
  ] },
  { id: 'g_night_walk', title: '밤길', age: [16, 40], w: 0.05, cooldown: 8, cond: F, text: '퇴근길 골목에서 누군가 계속 따라오는 것 같다.', choices: [
    { label: '큰길 편의점으로 들어간다', text: '점원이 경찰에 연락해 줬다. 다음 날부터 가로등이 하나 더 켜졌다.', eff: { hap: -2, int: 1 } },
    { label: '가족에게 전화하며 걷는다', text: '집 앞까지 마중 나온 가족을 보자 다리에 힘이 풀렸다.', eff: { aff: 3 } },
  ] },
  { id: 'g_female_first', title: '최초의 여성', age: [28, 60], w: 0.04, cooldown: 20, years: [1975, 2030], cond: Fw, text: '{n}이(가) 이 직장 역사상 첫 여성 관리자 후보에 올랐다. 기자가 인터뷰를 청한다.', choices: [
    { label: '당당하게 인터뷰한다', text: '', roll: ['cha', 55, [{ fame: 3, hap: 8 }, '기사가 퍼졌다. 후배 여성들의 편지가 쏟아졌다.'], [{ hap: -3 }, '"여자라서 뽑혔다"는 댓글에 속상했다.']] },
    { label: '실력으로만 보이고 싶다며 사양한다', text: '조용히 자리에 올랐다. 일로 증명할 것이다.', eff: { promo: 1, mor: 1 } },
  ] },
  // ── 남성 ──
  { id: 'g_enlist_eve', title: '입대 전날', age: [19, 23], w: 0.1, cooldown: 99, cond: M, text: '내일이 입대. 머리를 밀고 온 {n}을(를) 보고 어머니가 부엌에서 조용히 우신다.', choices: [
    { label: '친구들과 마지막 밤을 보낸다', text: '노래방에서 목이 쉬도록 불렀다. "2년 금방이다!"', eff: { hap: 5, cha: 1 } },
    { label: '가족과 저녁을 먹는다', text: '아버지가 처음으로 "몸조심해라"라며 어깨를 두드렸다.', eff: { aff: 6, hap: 3 } },
  ] },
  { id: 'g_first_shave', title: '첫 면도', age: [14, 18], w: 0.06, cooldown: 99, cond: M, text: '거뭇거뭇 수염이 났다. 아버지가 면도기를 건넨다.', choices: [
    { label: '아버지에게 배운다', text: '두 군데 베였지만 거울 속 얼굴이 어른 같았다.', eff: { aff: 4, hap: 3 } },
    { label: '혼자 몰래 해 본다', text: '휴지 조각을 붙이고 학교에 갔다. 다들 웃었다.', eff: { hap: 1 } },
  ] },
  { id: 'g_dad_leave', title: '아빠 육아휴직', age: [28, 45], w: 0.06, cooldown: 10, years: [2008, 2070], cond: (s, p) => Mkid(s, p) && working(p), text: '회사에 남자 육아휴직 1호 신청서를 낼까. 팀장 표정이 떠오른다.', choices: [
    { label: '낸다', text: '', roll: ['cha', 50, [{ aff: 8, hap: 10 }, '아이가 처음 걸은 날을 직접 봤다. 팀장도 "잘했다"고 했다.'], [{ hap: 4, promo: -1 }, '아이와의 1년은 좋았다. 복귀 후 자리는 달라져 있었다.']] },
    { label: '눈치 보여 포기한다', text: '주말마다 아이가 조금씩 낯을 가린다.', eff: { hap: -4 } },
  ] },
  { id: 'h_g_breadwinner', title: '가장의 무게', age: [30, 55], w: 0.06, cooldown: 8, era: [1960, 1999], cond: Mw, text: '월급날, 봉투를 받아 든 {n}. 쌀값, 학비, 부모님 약값… 계산이 맞지 않는다.', choices: [
    { label: '야근과 부업을 늘린다', text: '돈은 맞췄다. 거울 속 얼굴이 부쩍 늙었다.', eff: { cash: 200, hp: -5, hap: -3 } },
    { label: '아내와 솔직하게 상의한다', text: '', roll: ['cha', 45, [{ bond: 6, hap: 4 }, '둘이 머리를 맞대니 길이 보였다.'], [{ bond: -3 }, '자존심 상한 말이 오갔다.']] },
  ] },
  { id: 'g_man_cry', title: '"남자가 울면 안 되지"', age: [8, 60], w: 0.04, cooldown: 12, cond: M, text: '슬픈 일이 있었는데 {n}은(는) 꾹 참고 있다. "남자는 울면 안 된다"는 말이 귀에 맴돈다.', choices: [
    { label: '참지 않고 운다', text: '실컷 울고 나니 가슴이 가벼워졌다.', eff: { hap: 6, mor: 1 } },
    { label: '꾹 참는다', text: '괜찮은 척했다. 밤에 잠이 오지 않았다.', eff: { hap: -4, hp: -1 } },
  ] },
  { id: 'g_dad_ponytail', title: '딸 머리 묶기', age: [28, 50], w: 0.05, cooldown: 8, cond: (s, p) => M(s, p) && p.childIds.some((id) => s.people[id]?.sex === 'F' && age(s, s.people[id]) < 10), text: '아침마다 딸이 "아빠가 머리 묶어 줘" 한다. {n}의 손은 투박하다.', choices: [
    { label: '영상 보고 배운다', text: '', roll: ['int', 45, [{ aff: 8, hap: 8 }, '양갈래 땋기 성공! 딸이 유치원에서 자랑했다.'], [{ aff: 3, hap: 3 }, '삐뚤빼뚤했지만 딸은 좋다고 웃었다.']] },
    { label: '엄마에게 넘긴다', text: '딸이 살짝 실망한 눈치였다.', eff: { aff: -1 } },
  ] },
];
