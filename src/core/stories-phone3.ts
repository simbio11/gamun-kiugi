// 휴대폰 이야기 ③ — 같은 문자·전화가 반복되지 않도록 시대마다 결이 다른 연락을 더 늘린다.
// 제목 앞 기호(📟 📱 💬 📞 ✉)로 휴대폰(연락 수단) 창에 뜬다. 근현대사 2000년 전 이야기는 id를 h_ 로 시작한다.
import type { Story } from './stories';
import type { GameState, Person } from './types';
import { age, alive, parentsOf } from './people';

const adult = (s: GameState, p: Person) => age(s, p) >= 20;
const parent = (_s: GameState, p: Person) => p.childIds.length > 0;
const hasParents = (s: GameState, p: Person) => parentsOf(s, p).some(alive);
const working = (_s: GameState, p: Person) => !['none', 'parttime', 'pension'].includes(p.job) && !p.flags.includes('student');
const senior = (s: GameState, p: Person) => age(s, p) >= 60;

export const PHONE3_STORIES: Story[] = [
  // ─── 1960~90년대 ───
  { id: 'h_ph3_wedding_card', title: '✉ 청첩장', age: [22, 60], w: 0.04, cooldown: 6, era: [1960, 1999], text: '고향 친구의 청첩장이 우편으로 왔다. 버스로 다섯 시간 거리다.', choices: [
    { label: '새벽 첫차를 탄다', text: '신랑 신부가 버선발로 달려 나왔다. "올 줄 알았다!"', eff: { cash: -5, hap: 5, cha: 1 } },
    { label: '우편환으로 축의금만 보낸다', text: '다음 명절에 고맙다는 편지가 왔다.', eff: { cash: -3, mor: 1 } },
  ] },
  { id: 'h_ph3_hometown_call', title: '📞 고향 우체국 교환', age: [20, 60], w: 0.04, cooldown: 6, era: [1965, 1985], cond: hasParents, text: '"서울 ○○번, 고향 우체국 연결해 드릴게요." 교환원 목소리 뒤로 어머니 목소리가 아득하게 들린다.', choices: [
    { label: '"어머니, 저 잘 지내요"', text: '"밥은 먹고 다니냐." 3분이 금방 지나갔다.', eff: { hap: 6, aff: 3 } },
    { label: '돈 보낸다는 말만 하고 끊는다', text: '통화료가 아까워 할 말을 삼켰다. 끊고 나서 한참 수화기를 봤다.', eff: { cash: -10, aff: 2 } },
  ] },
  { id: 'h_ph3_pc_chat', title: '💬 PC통신 번개', age: [16, 35], w: 0.05, cooldown: 6, era: [1992, 2001], text: '하이텔 동호회 게시판에 "토요일 종로 번개" 공지가 떴다. 대화방에서만 보던 사람들이다.', choices: [
    { label: '나간다', text: '', roll: ['cha', 40, [{ hap: 7, cha: 1 }, '닉네임으로만 알던 사람들과 밤새 웃었다. 평생 친구가 생겼다.'], [{ hap: -2 }, '어색한 침묵만 흘렀다.']] },
    { label: '접속만 한다', text: '모뎀 접속음이 밤새 이어졌다. 전화비 고지서가 무섭다.', eff: { int: 1, cash: -2 } },
  ] },
  // ─── 2000~2020년대 ───
  { id: 'ph3_class_chat', title: '💬 동창 단톡방 소환', age: [25, 70], w: 0.04, cooldown: 8, years: [2010, 2200], cond: adult, text: '20년 만에 초등학교 동창 단톡방에 초대됐다. 첫 메시지가 "다들 뭐 하고 사니?"다.', choices: [
    { label: '근황 사진을 올린다', text: '좋아요가 쏟아졌다. 반장이던 친구가 개인 톡을 보내왔다.', eff: { hap: 5, cha: 1 } },
    { label: '조용히 나간다', text: '"○○님이 나갔습니다." 마음이 편해졌다.', eff: { hap: 1 } },
  ] },
  { id: 'ph3_wrong_number_boss', title: '📞 잘못 걸린 전화', age: [20, 70], w: 0.03, cooldown: 10, years: [2000, 2200], text: '모르는 번호. "사장님, 오늘 납품 물건 어디로 갈까요?" 잘못 걸린 전화인데, 상대가 몹시 급하다.', choices: [
    { label: '친절하게 다시 알아보라고 한다', text: '"아이고 죄송합니다!" 30분 뒤 감사 문자와 커피 쿠폰이 왔다.', eff: { mor: 1, hap: 2 } },
    { label: '장난으로 받아친다', text: '', roll: ['luck', 50, [{ hap: 4 }, '상대도 웃었다. 별일 없었다.'], [{ hap: -3 }, '진짜 사장에게 항의가 갔다며 다시 전화가 왔다. 진땀이 났다.']] },
  ] },
  { id: 'ph3_parents_tech', title: '📞 엄마의 영상통화', age: [25, 60], w: 0.05, cooldown: 6, years: [2014, 2200], cond: hasParents, text: '어머니가 영상통화를 걸었다. 화면엔 천장과 콧구멍만 보인다. "얘, 이거 어떻게 하는 거니?"', choices: [
    { label: '30분 동안 차근차근 알려 드린다', text: '드디어 얼굴이 보였다. 어머니가 손주 사진을 보여 달라며 웃으셨다.', eff: { aff: 4, hap: 4, mor: 1 } },
    { label: '"주말에 가서 해 드릴게요"', text: '주말에 가서 큰 글씨로 설정해 드렸다.', eff: { aff: 2 } },
  ] },
  { id: 'ph3_school_notice', title: '📱 학교 알림장 앱', age: [28, 55], w: 0.05, cooldown: 5, years: [2015, 2200], cond: parent, text: '"내일 준비물: 우유갑 10개, 솔방울 3개." 밤 10시에 알림이 왔다.', choices: [
    { label: '편의점과 공원을 뒤진다', text: '자정에 솔방울 세 개를 들고 돌아왔다. 아이는 이미 자고 있었다.', eff: { hap: -2, aff: 3 } },
    { label: '다른 엄마·아빠 단톡방에 SOS', text: '이웃집에서 우유갑을 나눠 줬다. 육아는 연대다.', eff: { cha: 1, hap: 2 } },
  ] },
  { id: 'ph3_salary_text', title: '📱 급여 입금 문자', age: [22, 65], w: 0.04, cooldown: 6, years: [2005, 2200], cond: working, text: '"[입금] 급여 ○○○만 원." 25일 아침. 3분 뒤 카드값·월세·적금이 차례로 빠져나갔다.', choices: [
    { label: '스쳐 간 월급에 웃는다', text: '"월급은 통장을 스쳐 갈 뿐." 그래도 이번 달도 버텼다.', eff: { hap: 1 } },
    { label: '가계부 앱을 깐다', mark: { thrift: 1 }, text: '새는 돈이 보이기 시작했다. 배달비만 한 달에 20만 원이었다.', eff: { int: 1, cash: 30 } },
  ] },
  { id: 'ph3_lost_phone', title: '📞 내 폰을 주운 사람', age: [15, 80], w: 0.03, cooldown: 12, years: [2005, 2200], text: '휴대폰을 택시에 두고 내렸다. 친구 폰으로 걸어 보니 기사님이 받는다. "어디로 갖다 드릴까요?"', choices: [
    { label: '사례금을 넉넉히 드린다', text: '기사님이 "이런 거 바라고 한 거 아니에요" 하면서도 웃으셨다.', eff: { cash: -5, mor: 1, hap: 3 } },
    { label: '감사 인사만 거듭한다', text: '폰을 돌려받았다. 사진 10년 치가 무사하다.', eff: { hap: 4 } },
  ] },
  { id: 'ph3_kid_first_phone', title: '📱 아이의 첫 휴대폰', age: [32, 55], w: 0.04, once: true, years: [2008, 2200], cond: (s, p) => p.childIds.some((id) => s.people[id] && age(s, s.people[id]) >= 9 && age(s, s.people[id]) <= 12), text: '아이가 "반에서 폰 없는 사람 나밖에 없어"라며 운다.', choices: [
    { label: '키즈폰을 사 준다', text: '첫 문자가 왔다. "엄마(아빠) 사랑해 ♥♥♥" 캡처해 뒀다.', eff: { cash: -30, aff: 4, hap: 3 } },
    { label: '중학교 가면 사 주기로 약속한다', text: '약속을 손가락 걸고 도장까지 찍었다.', eff: { aff: -1, mor: 1 } },
  ] },
  { id: 'ph3_retire_group', title: '💬 퇴직 동기 단톡방', age: [58, 80], w: 0.04, cooldown: 8, years: [2010, 2200], cond: senior, text: '퇴직 동기 단톡방에 "아침 산행 6시 집합" 공지가 올라왔다. 다들 은퇴 후가 더 바쁘다.', choices: [
    { label: '등산화를 꺼낸다', text: '정상에서 막걸리 한 잔. 옛날 부장님 흉을 보며 웃었다.', eff: { hp: 2, hap: 5 } },
    { label: '이모티콘으로만 답한다', text: '"👍" 하나로 존재감을 남겼다.', eff: { hap: 1 } },
  ] },
  // ─── 2030년대 이후 (미래) ───
  { id: 'ph3_ai_secretary', title: '📱 AI 비서의 제안', age: [20, 80], w: 0.04, cooldown: 8, years: [2032, 2200], text: '"주인님 일정을 분석했어요. 이번 주말 어머님 생신인데 아무 계획이 없네요. 예약해 둘까요?" AI 비서가 먼저 말을 건다.', choices: [
    { label: '예약을 맡긴다', text: '어머니가 좋아하시는 식당이 딱 잡혀 있었다. 편하지만… 조금 부끄럽다.', eff: { aff: 3, hap: 2 } },
    { label: '직접 전화한다', text: '"웬일로 먼저 전화를 다 하니." 목소리가 밝았다.', eff: { aff: 5, mor: 1 } },
  ] },
  { id: 'ph3_neural_ping', title: '💬 머릿속 알림', age: [18, 70], w: 0.04, cooldown: 8, years: [2048, 2200], text: '뉴럴 링크 알림이 머릿속에서 울린다. "읽지 않은 메시지 47개." 회의 도중인데 생각이 자꾸 새어 나간다.', choices: [
    { label: '방해 금지 모드를 켠다', text: '머릿속이 조용해졌다. 회의 내용이 처음으로 귀에 들어왔다.', eff: { int: 1, hap: 2 } },
    { label: '멀티태스킹으로 다 답한다', text: '', roll: ['int', 55, [{ int: 1, hap: 2 }, '전부 처리했다. 동료들이 놀랐다.'], [{ hap: -4 }, '엉뚱한 사람에게 엉뚱한 생각을 보냈다.']] },
  ] },
  { id: 'ph3_lunar_call', title: '📞 달에서 온 전화', age: [15, 90], w: 0.03, cooldown: 12, years: [2060, 2200], text: '달 기지에서 일하는 친척이 영상통화를 걸었다. 2.6초씩 늦게 도착하는 목소리. "여기서 보는 지구, 진짜 파래!"', choices: [
    { label: '가족을 다 불러 모은다', text: '온 가족이 화면 앞에 모였다. 지연 때문에 대화가 자꾸 겹쳐서 다 같이 웃었다.', eff: { hap: 6, aff: 2 } },
    { label: '부탁할 기념품 목록을 읽는다', text: '"월석은 반출 금지야!" 대신 달 기지 스티커를 보내 준다고 했다.', eff: { hap: 3 } },
  ] },
  { id: 'ph3_climate_buddy', title: '📱 탄소 일기 알림', age: [12, 80], w: 0.03, cooldown: 10, years: [2040, 2200], text: '"이번 달 탄소 배출: 이웃 평균의 140%." 시 탄소 앱이 빨간 경고를 띄웠다. 초과분엔 부담금이 붙는다.', choices: [
    { label: '대중교통·채식 주간에 도전', text: '한 달 만에 초록불이 됐다. 환급 포인트도 받았다.', eff: { hp: 1, cash: 20, mor: 1 } },
    { label: '부담금을 내고 말지', text: '편한 대신 돈이 나갔다. 아이가 "지구 아프대"라며 째려봤다.', eff: { cash: -30 } },
  ] },
  { id: 'ph3_robot_report', title: '📱 돌봄 로봇 보고서', age: [40, 75], w: 0.04, cooldown: 8, years: [2045, 2200], cond: hasParents, text: '부모님 댁 돌봄 로봇이 주간 보고서를 보냈다. "어머님 걸음 속도 12% 감소. 이번 주 웃음 횟수 3회."', choices: [
    { label: '당장 찾아간다', text: '"로봇이 일러바쳤니?" 어머니가 웃으셨다. 웃음 횟수가 그날만 스무 번.', eff: { aff: 5, hap: 4 } },
    { label: '로봇에게 산책 일정을 추가한다', text: '걸음 속도는 회복됐다. 웃음 횟수는 그대로다.', eff: { aff: 1 } },
  ] },
];
