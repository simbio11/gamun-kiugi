// 동네 이야기: 어디 사느냐에 따라 아이가 어울리는 친구도, 겪는 일도 다르다.
import type { Story } from './stories';
import type { GameState, Person } from './types';
import { hoodOf, type Hood } from './housing';

const in_ = (...hs: Hood[]) => (s: GameState, p: Person) => hs.includes(hoodOf(s, p).hood);

export const HOOD_STORIES: Story[] = [
  // ───────── 대치동·학군지 ─────────
  { id: 'level_test', title: '학원 레벨테스트', age: [7, 12], w: 0.07, cond: in_('elite', 'rich'), text: '같은 반 친구들은 벌써 중학교 수학을 한다. {n}도 유명 학원 레벨테스트를 봤다.', choices: [
    { label: '최상위반에 넣으려 과외를 붙인다', cost: 600, mark: { study: 1, hurt: 1 }, text: '', roll: ['int', 50, [{ study: 4, hap: 2 }, '최상위반 합격! 엄마들 단톡방에서 축하가 쏟아졌다.'], [{ study: 2, hap: -8 }, '두 번째 반. {n이} 밤에 몰래 울었다.']] },
    { label: '제 속도대로 가게 둔다', mark: { warmth: 1 }, text: '"다들 하는데 괜찮을까?" 불안하지만 아이는 웃는다.', eff: { hap: 5, study: -1 } },
  ] },
  { id: 'brand_padding', title: '패딩 계급도', age: [9, 17], w: 0.05, cond: in_('elite', 'rich'), text: '반 친구들이 모두 100만 원짜리 패딩을 입는다. {n}만 다르다.', choices: [
    { label: '사 준다', cost: 100, mark: { spend: 1 }, text: '{n이} 어깨를 폈다. 다음엔 신발이란다.', eff: { hap: 6 } },
    { label: '비교하지 말라고 가르친다', mark: { honest: 1 }, text: '', roll: ['mor', 45, [{ mor: 3 }, '"옷이 사람은 아니지." {n이} 고개를 끄덕였다.'], [{ hap: -8, aff: -4 }, '"아무것도 모르면서!" 방문이 닫혔다.']] },
  ] },
  { id: 'hotel_party', title: '호텔 생일 파티', age: [7, 13], w: 0.04, cond: in_('elite'), text: '{n}의 친구가 호텔 스위트룸에서 생일 파티를 연다. 선물은 얼마짜리를 사야 할까.', choices: [
    { label: '남부럽지 않게', cost: 30, mark: { network: 1, spend: 1 }, text: '파티에서 {n이} 새 친구들을 사귀었다. 부모들끼리도 인사를 텄다.', eff: { cha: 1, hap: 6 } },
    { label: '정성이 담긴 선물', mark: { warmth: 1 }, text: '손편지와 작은 선물. 친구가 제일 좋아했다.', eff: { mor: 2 } },
  ] },
  { id: 'burnout_kid', title: '학원 열두 개', age: [10, 18], w: 0.05, cond: in_('elite'), text: '{n}의 하루: 학교 → 학원 셋 → 과외 → 숙제. 새벽 1시에 잔다. 요즘 표정이 없다.', choices: [
    { label: '학원을 반으로 줄인다', mark: { warmth: 2 }, text: '{n이} 오랜만에 친구와 떡볶이를 먹고 왔다.', eff: { hap: 12, study: -3 } },
    { label: '입시까지만 참자고 한다', mark: { hurt: 2, study: 1 }, text: '', roll: ['hp', 50, [{ study: 3 }, '버텨 냈다. 성적은 올랐다.'], [{ hap: -15, hp: -4, flag: 'burnout_kid' }, '{n이} 학교 상담실에 불려 갔다. 번아웃 진단.']] },
  ] },
  { id: 'gifted_center', title: '영재원', age: [9, 14], w: 0.04, cond: in_('elite', 'rich', 'middle'), text: '{n}의 학교에서 영재교육원 선발 공고가 났다.', choices: [
    { label: '영재원 대비반에 보낸다', cost: 300, mark: { study: 2 }, text: '', roll: ['int', 60, [{ int: 3, flag: 'gifted_center' }, '합격! 주말마다 대학 캠퍼스에서 수업을 듣는다.'], [{ hap: -4 }, '떨어졌다. 대비반 친구 절반이 떨어졌다고 한다.']] },
    { label: '관심 없다', text: '', eff: {} },
  ] },
  // ───────── 평범한 아파트 단지 ─────────
  { id: 'apt_playground', title: '단지 놀이터', age: [6, 11], w: 0.05, cond: in_('middle', 'local'), text: '저녁마다 단지 놀이터에 아이들이 모인다. {n}도 끼고 싶어 한다.', choices: [
    { label: '실컷 놀게 한다', mark: { network: 1 }, text: '동네 친구가 여섯이나 생겼다. 엄마들끼리도 친해졌다.', eff: { hap: 8, cha: 1 } },
    { label: '학원 셔틀 시간이라 안 된다', mark: { study: 1 }, text: '창밖으로 놀이터를 내려다본다.', eff: { study: 1, hap: -4 } },
  ] },
  { id: 'local_talent', title: '지역 인재', age: [15, 18], w: 0.04, cond: in_('local'), text: '담임 선생님이 {n}에게 "지역인재 전형을 노려 보라"고 한다. 지방 의대·교대에 유리하다.', choices: [
    { label: '지역에서 승부한다', mark: { study: 1 }, text: '내신 관리에 집중하기로 했다.', eff: { study: 2, flag: 'local_talent' } },
    { label: '서울로 전학 가고 싶다', text: '"큰물에서 놀고 싶어." 전학을 알아보기 시작했다.', eff: { hap: 2 } },
  ] },
  // ───────── 빌라촌·반지하 ─────────
  { id: 'banjiha_rain', title: '장마', age: [6, 18], w: 0.06, cond: in_('poor'), text: '밤새 폭우가 쏟아졌다. 반지하 창문으로 물이 차오른다. {n이} 겁에 질렸다.', choices: [
    { label: '가족이 함께 물을 퍼낸다', mark: { family: 1 }, text: '새벽까지 양동이를 날랐다. {n이} 부쩍 어른스러워졌다.', eff: { mor: 3, hap: -6, hp: -1 } },
    { label: '아이만 친척 집에 보낸다', mark: { hurt: 1 }, text: '안전했지만 {n은} 그날 밤을 오래 기억했다.', eff: { hap: -4 } },
  ] },
  { id: 'cant_invite', title: '초대', age: [7, 14], w: 0.05, cond: in_('poor', 'modest'), text: '{n이} 친구들을 집에 부르고 싶어 하다가 말을 삼킨다.', choices: [
    { label: '작아도 떳떳하다고 부르게 한다', mark: { warmth: 1, honest: 1 }, text: '', roll: ['cha', 40, [{ hap: 8, cha: 1 }, '친구들이 "너네 엄마 떡볶이 최고!"라며 또 오겠단다.'], [{ hap: -6 }, '한 친구가 "여기 사람 사는 데야?"라고 했다.']] },
    { label: '밖에서 놀게 용돈을 준다', cost: 3, text: '놀이터에서 신나게 놀았다.', eff: { hap: 3 } },
  ] },
  { id: 'free_meal', title: '급식', age: [7, 18], w: 0.04, cond: in_('poor'), text: '{n}에게 급식은 하루 중 가장 든든한 끼니다. 방학이 다가온다.', choices: [
    { label: '방학 식사 지원을 신청한다', text: '지역아동센터에서 점심을 먹으며 공부도 봐 준다.', eff: { study: 1, hap: 2 } },
    { label: '아이가 스스로 끼니를 챙긴다', mark: { thrift: 1 }, text: '{n이} 라면 끓이는 솜씨가 늘었다.', eff: { mor: 2, hp: -1 } },
  ] },
  { id: 'rough_crowd', title: '동네 형들', age: [12, 18], w: 0.05, cond: in_('poor', 'modest'), text: '{n이} 동네 형들과 어울리기 시작했다. 늦게 들어오고 담배 냄새가 난다.', choices: [
    { label: '태권도·운동부에 넣는다', cost: 20, mark: { sport: 1 }, text: '땀 흘리는 친구들을 새로 사귀었다.', eff: { str: 2, mor: 1 } },
    { label: '밤새 이야기를 나눈다', mark: { warmth: 2 }, text: '', roll: ['mor', 40, [{ mor: 3, aff: 6 }, '"사실 무서워서 따라다녔어." 눈물을 흘리며 털어놨다.'], [{ aff: -6, flag: 'delinquent' }, '말이 안 통한다. 점점 멀어진다.']] },
  ] },
  { id: 'scholarship_mentor', title: '장학재단 멘토', age: [14, 18], w: 0.04, cond: in_('poor', 'modest'), text: '{n}의 성적을 본 장학재단이 멘토링과 장학금을 제안했다.', choices: [
    { label: '감사히 받는다', mark: { study: 2 }, text: '대학생 멘토가 공부법을 알려 준다. "너도 할 수 있어."', eff: { study: 3, cash: 200, hap: 8, flag: 'mentored' } },
  ] },
  { id: 'library_kid', title: '구립 도서관', age: [9, 18], w: 0.05, cond: in_('poor', 'modest', 'local'), text: '학원 대신 {n은} 매일 구립 도서관에 간다.', choices: [
    { label: '응원한다', mark: { study: 1 }, text: '', roll: ['int', 45, [{ int: 2, study: 3 }, '사서 선생님이 추천해 준 책이 인생 책이 됐다.'], [{ study: 1 }, '졸다가 왔다. 그래도 꾸준하다.']] },
  ] },
  { id: 'part_time_help', title: '가계에 보태기', age: [15, 18], w: 0.05, cond: in_('poor'), text: '{n이} 주말 알바로 번 돈을 슬며시 식탁에 올려 둔다.', choices: [
    { label: '"네 공부가 먼저야" 돌려준다', mark: { warmth: 2 }, text: '{n이} 울컥했다. 더 열심히 공부하기로 했다.', eff: { study: 2, aff: 5 } },
    { label: '고맙게 받는다', mark: { filial: 2, thrift: 1 }, text: '가족이 한 팀이 된 느낌이다.', eff: { cash: 100, mor: 2, study: -2 } },
  ] },
];
