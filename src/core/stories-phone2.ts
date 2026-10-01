// 휴대폰 이야기 ② — 시대별 전화·문자·알림을 세 배로. 제목 앞 기호(📟 📱 💬 📞 ✉)로 휴대폰(연락 수단) 창에 뜬다.
// 근현대사 2000년 전에도 나오도록 그 시절 것은 id를 h_ 로 시작한다.
import type { Story } from './stories';
import type { GameState, Person } from './types';
import { age } from './people';

const young = (s: GameState, p: Person) => age(s, p) >= 13 && age(s, p) < 32;
const adult = (s: GameState, p: Person) => age(s, p) >= 20;
const parent = (_s: GameState, p: Person) => p.childIds.length > 0;
const working = (_s: GameState, p: Person) => !['none', 'parttime', 'pension'].includes(p.job);
const single = (_s: GameState, p: Person) => !p.spouseId;

export const PHONE2_STORIES: Story[] = [
  // ─── 1960~80년대: 편지·전보·집 전화 ───
  { id: 'h_ph2_army_letter', title: '✉ 군사우편', age: [18, 30], w: 0.06, cooldown: 4, era: [1960, 1999], cond: single, text: '"충성! 잘 지내니? 여긴 눈이 무릎까지 쌓였다…" 군대 간 친구(연인)의 군사우편이 도착했다.', choices: [
    { label: '밤새 답장을 쓴다', text: '편지지 세 장을 꽉 채웠다. 사진 한 장도 넣었다.', eff: { hap: 5, bond: 3 } },
    { label: '위문품을 싸서 보낸다', text: '초코파이 한 상자. 부대 전체가 {n}의 이름을 외웠다고 한다.', eff: { cash: -3, hap: 4, cha: 1 } },
  ] },
  { id: 'h_ph2_neighbor_phone', title: '📞 "전화 왔어요!"', age: [10, 60], w: 0.06, cooldown: 4, era: [1960, 1983], text: '동네에 전화가 있는 집은 복덕방뿐. 아이가 뛰어와 외친다. "{n} 씨, 서울에서 전화 왔대요!"', choices: [
    { label: '신발도 제대로 못 신고 달려간다', text: '서울 간 동생이었다. "형(누나), 나 취직했어!" 복덕방 아저씨도 같이 웃었다.', eff: { hap: 6, aff: 2 } },
    { label: '전화 빌린 값으로 사탕을 사 간다', text: '복덕방 할머니가 "다음에도 불러 줄게" 하며 웃었다.', eff: { cash: -1, mor: 1, hap: 3 } },
  ] },
  { id: 'h_ph2_radio_letter', title: '✉ 라디오 사연', age: [14, 40], w: 0.05, cooldown: 6, era: [1965, 1999], text: '밤 10시 라디오에서 DJ가 읽는 사연… {n}이(가) 보낸 엽서다!', choices: [
    { label: '카세트테이프에 녹음한다', text: '두고두고 돌려 들었다. 신청곡이 나올 땐 소리를 질렀다.', eff: { hap: 7 } },
    { label: '가족들을 깨워 같이 듣는다', text: '온 식구가 이불 속에서 킥킥거렸다.', eff: { hap: 5, aff: 2 } },
  ] },
  { id: 'h_ph2_pen_pal', title: '✉ 펜팔', age: [12, 25], w: 0.05, cooldown: 5, era: [1965, 1995], cond: young, text: '잡지 펜팔 코너를 보고 보낸 편지에 답장이 왔다. 부산에 사는 동갑내기다.', choices: [
    { label: '계속 편지를 주고받는다', text: '10년 뒤 결혼식 방명록에 그 이름이 있었다.', eff: { hap: 5, cha: 1 } },
    { label: '사진을 동봉한다', text: '', roll: ['cha', 45, [{ hap: 8 }, '"사진보다 편지가 더 좋아." 답장이 두 배로 길어졌다.'], [{ hap: -3 }, '그 뒤로 답장이 끊겼다.']] },
  ] },
  { id: 'h_ph2_long_call', title: '📞 장거리 전화 요금', age: [18, 60], w: 0.05, cooldown: 5, era: [1975, 1999], cond: adult, text: '전화 요금 고지서를 뜯어 본 가족이 비명을 질렀다. 시외 통화가 한 달에 수십 통.', choices: [
    { label: '밤 11시 할인 시간에만 건다', text: '그 뒤로 밤 11시가 되면 집 안이 조용해지고 {n}의 방에서 속삭임이 들렸다.', eff: { cash: -3, hap: 2 } },
    { label: '편지로 바꾼다', text: '우표값이 전화비보다 훨씬 싸다. 글씨체도 늘었다.', eff: { int: 1 } },
  ] },
  // ─── 1990년대: 삐삐·PC통신 ───
  { id: 'h_ph2_pager_code', title: '📟 암호 삐삐', age: [15, 35], w: 0.07, cooldown: 3, era: [1992, 2000], cond: young, text: '삐삐에 "0027 1010235" 가 찍혔다. 친구가 보낸 암호다. (땡땡이 칠래 = 열열이 사모)', choices: [
    { label: '"8282"로 답한다', text: '학교 앞 떡볶이집에서 만났다. 무슨 뜻이었는지 한참 웃었다.', eff: { hap: 6 } },
    { label: '공중전화에서 음성을 남긴다', text: '100원짜리 동전 세 개를 다 썼다. 할 말이 너무 많았다.', eff: { cash: -1, hap: 4, cha: 1 } },
  ] },
  { id: 'h_ph2_pager_work', title: '📟 호출', age: [22, 55], w: 0.06, cooldown: 4, era: [1991, 2000], cond: working, text: '토요일 등산 중 삐삐가 울린다. 회사 번호 뒤에 "119". 급하다는 뜻이다.', choices: [
    { label: '산 아래 공중전화까지 뛰어 내려간다', text: '땀범벅으로 전화를 걸었다. "{n} 씨, 서류 어디 뒀어?"', eff: { hap: -3, cha: 1 } },
    { label: '못 본 척 산을 오른다', text: '', roll: ['luck', 55, [{ hap: 5 }, '월요일에 아무도 그 일을 기억하지 못했다.'], [{ hap: -5 }, '월요일 아침, 팀장 얼굴이 굳어 있었다.']] },
  ] },
  { id: 'h_ph2_chat_room', title: '💬 대화방 초대', age: [15, 35], w: 0.06, cooldown: 5, era: [1993, 2002], cond: young, text: '나우누리 대화방에 초대됐다. 방 제목: "90년생 아니고 70년생 모여라". 모뎀 소리가 삐- 지지직.', choices: [
    { label: '밤새 채팅한다', text: '새벽 4시. 어머니가 전화선을 뽑을 때까지.', eff: { hap: 5, cash: -2 } },
    { label: '정모에 나간다', text: '', roll: ['cha', 45, [{ hap: 7, cha: 1 }, '대화명 "푸른하늘"이 이렇게 생긴 사람이었다니. 친해졌다.'], [{ hap: -2 }, '어색한 인사만 하고 헤어졌다.']] },
  ] },
  { id: 'h_ph2_016', title: '📱 첫 휴대폰', age: [18, 50], w: 0.05, cooldown: 10, era: [1996, 2001], cond: adult, text: '"016, 017, 018, 019…" 대리점 앞에 사람들이 줄을 섰다. 벽돌만 한 휴대폰이 드디어 싸졌다.', choices: [
    { label: '할부로 산다', text: '버스에서 전화를 받자 모두가 쳐다봤다. 괜히 목소리를 키웠다.', eff: { cash: -30, hap: 6, cha: 1 } },
    { label: '아직은 삐삐로 버틴다', text: '공중전화 줄은 점점 짧아졌다.', eff: {} },
  ] },
  // ─── 2000~2010년대 ───
  { id: 'ph2_wrong_sms', title: '📱 잘못 보낸 문자', age: [15, 60], w: 0.06, cooldown: 4, years: [2001, 2045], text: '"부장님 진짜 싫다 ㅠㅠ" …를 부장님에게 보냈다.', choices: [
    { label: '"부장님 진짜 싫다고 하는 애가 있어서요ㅎㅎ" 수습한다', text: '', roll: ['cha', 55, [{ hap: 2 }, '부장님이 "ㅋㅋ 누군데" 하고 넘어갔다. 살았다.'], [{ hap: -6 }, '다음 날부터 부장님이 인사를 안 받는다.']] },
    { label: '폰을 잃어버렸다고 한다', text: '한 달 동안 다른 사람 폰인 척했다.', eff: { mor: -1, hap: -2 } },
  ] },
  { id: 'ph2_minihompy_bgm', title: '💬 방명록', age: [14, 35], w: 0.06, cooldown: 4, years: [2002, 2012], cond: young, text: '미니홈피 방명록에 "잘 지내?" 한 줄. 헤어진 사람이다.', choices: [
    { label: '"응, 너도." 답글을 단다', text: '짧은 두 줄이 오갔다. 마음이 조금 정리됐다.', eff: { hap: 3, mor: 1 } },
    { label: '다이어리에 감성 글을 올린다', text: '"…ㅇㅏ 모르겠ㄷr" 다음 날 부끄러워서 지웠다.', eff: { hap: 1 } },
  ] },
  { id: 'ph2_dmb', title: '📱 DMB', age: [14, 60], w: 0.04, cooldown: 6, years: [2005, 2014], text: '지하철에서 DMB로 월드컵을 보는데 터널에 들어가자 화면이 멈췄다. 골이 들어갔는지 옆 칸에서 함성이 들린다.', choices: [
    { label: '다음 역에서 뛰어내려 본다', text: '역 대합실 TV 앞에서 모르는 사람들과 얼싸안았다.', eff: { hap: 6 } },
    { label: '문자 중계를 기다린다', text: '"골!!!!!!!" 친구의 문자가 5분 늦게 왔다.', eff: { hap: 3 } },
  ] },
  { id: 'ph2_kakao_first', title: '💬 카카오톡', age: [15, 70], w: 0.05, cooldown: 10, years: [2010, 2013], text: '"문자 대신 이거 깔아. 공짜야." 친구가 노란 아이콘 앱을 알려 줬다.', choices: [
    { label: '깔고 가족 단톡방을 만든다', text: '첫 메시지는 어머니의 "이거 어떻게 하는 거니".', eff: { hap: 4, aff: 2 } },
    { label: '문자가 편하다', text: '1년 뒤, 문자를 보내는 사람은 {n}뿐이었다.', eff: {} },
  ] },
  { id: 'ph2_read_receipt', title: '💬 "1"이 안 사라진다', age: [15, 45], w: 0.07, cooldown: 3, years: [2011, 2045], cond: young, text: '고백 비슷한 메시지를 보냈는데 한 시간째 숫자 1이 안 사라진다.', choices: [
    { label: '기다린다', text: '', roll: ['luck', 50, [{ hap: 9, bond: 5 }, '"미안 폰 충전 중이었어!! 나도…" 심장이 터질 뻔했다.'], [{ hap: -5 }, '다음 날 아침 "ㅋㅋ 잘 자" 한 줄이 왔다.']] },
    { label: '"잘못 보냄ㅋㅋ" 한다', text: '1이 바로 사라졌다. …읽고 있었구나.', eff: { hap: -3 } },
  ] },
  { id: 'ph2_boss_night', title: '💬 밤 11시 단톡', age: [22, 60], w: 0.07, cooldown: 3, years: [2011, 2045], cond: working, text: '밤 11시, 팀 단톡방에 팀장이 "다들 자나?"', choices: [
    { label: '"아니요!" 바로 답한다', text: '그 뒤로 밤마다 {n}에게 일이 왔다.', eff: { hap: -4, promo: 0 } },
    { label: '아침에 "죄송합니다 자느라…"', text: '', roll: ['luck', 55, [{ hap: 3 }, '팀장도 별일 아니었다고 했다.'], [{ hap: -3 }, '"요즘 애들은…" 소리를 들었다.']] },
  ] },
  { id: 'ph2_gifticon', title: '💬 기프티콘', age: [15, 70], w: 0.07, cooldown: 3, years: [2011, 2050], text: '생일도 아닌데 오랜 친구가 커피 기프티콘을 보냈다. "그냥 생각나서."', choices: [
    { label: '케이크 기프티콘으로 답한다', text: '핑퐁 선물이 1년째 이어지고 있다.', eff: { cash: -3, hap: 5 } },
    { label: '전화를 건다', text: '두 시간 통화했다. 다음 달에 만나기로 했다.', eff: { hap: 6, cha: 1 } },
  ] },
  { id: 'ph2_parent_voice', title: '📞 부모님 영상통화', age: [22, 60], w: 0.07, cooldown: 3, years: [2012, 2050], cond: adult, text: '"얼굴 좀 보자." 부모님 영상통화. 화면엔 콧구멍만 보인다.', choices: [
    { label: '"폰을 좀 멀리 드세요" 하며 30분 수다', text: '아버지가 결국 이마만 보이게 드셨다. 그래도 좋았다.', eff: { hap: 5, aff: 3 } },
    { label: '"바빠서요" 하고 끊는다', text: '다음 날 반찬 택배가 왔다. 메모에 "밥은 먹고 다녀라".', eff: { aff: -1, hap: -2 } },
  ] },
  { id: 'ph2_kid_location', title: '📱 위치 알림', age: [30, 60], w: 0.06, cooldown: 4, years: [2010, 2060], cond: parent, text: '키즈폰 위치 알림: 아이가 학원이 아니라 PC방에 있다.', choices: [
    { label: '데리러 간다', text: '', roll: ['cha', 50, [{ aff: 2 }, '"엄마(아빠)도 어릴 때 그랬어." 같이 한 판 하고 왔다.'], [{ aff: -4 }, '아이가 폰을 두고 다니기 시작했다.']] },
    { label: '저녁에 조용히 이야기한다', text: '아이가 먼저 털어놓았다. 학원이 너무 힘들었다고.', eff: { aff: 3, mor: 1 } },
  ] },
  { id: 'ph2_delivery_msg', title: '📱 택배 알림', age: [18, 80], w: 0.06, cooldown: 3, years: [2014, 2060], cond: adult, text: '"[택배] 고객님의 상품이 문 앞에 배송 완료되었습니다." 시킨 기억이 없다.', choices: [
    { label: '열어 본다', text: '', roll: ['luck', 60, [{ hap: 5 }, '친구가 보낸 깜짝 선물이었다!'], [{ hap: -2 }, '옆집 거였다. 테이프를 다시 붙였다.']] },
    { label: '택배사에 전화한다', text: '주소 오류였다. 옆집 할머니가 떡을 가져오셨다.', eff: { mor: 1, hap: 3 } },
  ] },
  { id: 'ph2_stock_push', title: '📱 주식 앱 알림', age: [20, 80], w: 0.07, cooldown: 3, years: [2015, 2060], cond: adult, text: '"[알림] 관심 종목 +18.3%" 점심 먹다 숟가락을 떨어뜨렸다.', choices: [
    { label: '지금 판다', text: '', roll: ['luck', 50, [{ cash: 30, hap: 4 }, '고점에 팔았다! 저녁은 {n}이 쐈다.'], [{ hap: -4 }, '팔자마자 30% 더 올랐다.']] },
    { label: '더 오를 거다, 기다린다', text: '', roll: ['luck', 45, [{ cash: 50, hap: 6 }, '다음 날 또 올랐다!'], [{ cash: -20, hap: -5 }, '다음 날 원래대로 돌아왔다.']] },
  ] },
  { id: 'ph2_dating_app', title: '💬 매칭 알림', age: [20, 40], w: 0.06, cooldown: 4, years: [2015, 2060], cond: single, text: '"새로운 매칭이 있어요! 💕" 소개팅 앱이 울린다.', choices: [
    { label: '대화를 시작한다', text: '', roll: ['cha', 55, [{ hap: 7, cha: 1 }, '밤새 대화가 이어졌다. 주말에 만나기로 했다.'], [{ hap: -3 }, '"ㅎㅎ" 한 글자 답장 후 조용해졌다.']] },
    { label: '앱을 지운다', text: '역시 사람은 직접 만나야지.', eff: {} },
  ] },
  { id: 'ph2_screen_time', title: '📱 스크린 타임 리포트', age: [13, 70], w: 0.05, cooldown: 5, years: [2018, 2060], text: '"지난주 하루 평균 사용 시간: 7시간 42분 (▲23%)"', choices: [
    { label: '앱 시간 제한을 건다', text: '', roll: ['mor', 50, [{ int: 1, hap: 3 }, '한 달 뒤 책 두 권을 읽었다.'], [{ hap: -1 }, '제한 해제 버튼을 하루에 스무 번 눌렀다.']] },
    { label: '못 본 걸로 한다', text: '리포트 알림을 껐다.', eff: {} },
  ] },
  { id: 'ph2_group_birthday', title: '💬 단톡방 생일 축하', age: [15, 70], w: 0.06, cooldown: 3, years: [2012, 2060], text: '오늘이 {n}의 생일. 여기저기 단톡방에서 축하 메시지와 기프티콘이 쏟아진다.', choices: [
    { label: '한 명 한 명 답장한다', text: '답장만 두 시간. 그래도 행복했다.', eff: { hap: 8, cha: 1 } },
    { label: '"다들 고마워♡" 한 번에', text: '효율적이었다.', eff: { hap: 4 } },
  ] },
  { id: 'ph2_scam_parcel', title: '📱 [국제발신] 통관 문자', age: [18, 90], w: 0.05, cooldown: 4, years: [2016, 2050], cond: adult, text: '"[국제발신] 고객님 해외직구 통관 보류. 확인: http://…" 해외직구를 한 적이 없다.', choices: [
    { label: '삭제하고 신고한다', text: '스팸 신고 완료. 같은 문자를 받은 부모님께도 알렸다.', eff: { int: 1, aff: 1 } },
    { label: '혹시 몰라 눌러 본다', text: '', roll: ['int', 55, [{ int: 1 }, '이상한 앱 설치 화면에서 멈췄다. 휴.'], [{ cash: -80, hap: -8 }, '카드 정보가 털렸다. 재발급받느라 한 주가 날아갔다.']] },
  ] },
  // ─── 2030년대~ ───
  { id: 'ph2_ai_matchmaker', title: '💬 AI 중매', age: [22, 45], w: 0.06, cooldown: 4, years: [2032, 2120], cond: single, text: '"취향 일치율 94%인 분이 근처 카페에 계세요." AI 비서가 슬쩍 알려 준다.', choices: [
    { label: '가 본다', text: '', roll: ['cha', 50, [{ hap: 8 }, '94%가 아니라 100%였다.'], [{ hap: -3 }, '그분도 AI 비서가 보낸 거였다. 둘 다 민망했다.']] },
    { label: '운명은 스스로 찾겠다', text: 'AI가 조용히 "알겠습니다"라고 했다. 서운한 듯.', eff: { mor: 1 } },
  ] },
  { id: 'ph2_holo_grandma', title: '📞 할머니 홀로그램', age: [5, 60], w: 0.05, cooldown: 8, years: [2045, 2200], text: '할머니가 홀로그램 통화를 걸어왔다. 거실 한가운데 할머니가 서서 "밥은?" 하신다.', choices: [
    { label: '같이 밥 먹는 척한다', text: '할머니와 한 식탁에서 저녁을 먹었다. 거리는 멀어도.', eff: { hap: 6, aff: 3 } },
    { label: '다음 주에 직접 찾아가겠다고 한다', text: '할머니가 홀로그램인데도 눈물이 보였다.', eff: { aff: 4, cash: -5 } },
  ] },
  { id: 'ph2_neural_ping', title: '💬 뉴럴 핑', age: [15, 90], w: 0.05, cooldown: 4, years: [2085, 2200], text: '머릿속에 친구의 목소리가 울린다. "야, 지금 생각한 거 나도 들렸어 ㅋㅋ"', choices: [
    { label: '프라이버시 필터를 켠다', text: '생각이 다시 내 것이 됐다.', eff: { int: 1 } },
    { label: '같이 웃는다', text: '말하지 않아도 통하는 친구가 생겼다.', eff: { hap: 5, cha: 1 } },
  ] },
  { id: 'ph2_orbit_call', title: '📞 궤도 정거장에서 온 전화', age: [18, 90], w: 0.04, cooldown: 6, years: [2070, 2200], text: '궤도 정거장에서 일하는 가족이 전화했다. 창밖으로 지구가 돌아간다.', choices: [
    { label: '"우리 집 보여?" 묻는다', text: '"구름 때문에 안 보여 ㅋㅋ" 그래도 한참 웃었다.', eff: { hap: 5, aff: 2 } },
    { label: '온 가족이 모여 손을 흔든다', text: '4초 늦게 도착한 손 인사가 오래 기억에 남았다.', eff: { hap: 6 } },
  ] },
  // ─── 2040년대~ (먼 미래가 같은 알림만 반복되지 않도록) ───
  { id: 'ph2_ai_twin', title: '💬 내 AI 분신의 답장', age: [20, 80], w: 0.05, cooldown: 6, years: [2040, 2200], cond: adult, text: '{n}의 말투를 학습한 AI 분신이 지난주 단톡방에 대신 답장을 해 왔다. 친구가 묻는다. "어제 그거 진짜 너였어?"', choices: [
    { label: '분신 설정을 끈다', text: '오랜만에 직접 쓴 답장. 오타가 정겨웠다.', eff: { hap: 3, mor: 1 } },
    { label: '"응, 나였어 ^^" (분신이 쓴 답장)', text: '', roll: ['luck', 55, [{ hap: 2 }, '아무도 눈치채지 못했다. 조금 쓸쓸했다.'], [{ cha: -1, hap: -3 }, '"너 말투 아닌데?" 들켰다.']] },
  ] },
  { id: 'ph2_drone_gift', title: '📦 드론 택배', age: [10, 90], w: 0.05, cooldown: 6, years: [2040, 2200], text: '베란다 창밖에 배송 드론이 떠 있다. 보낸 사람은 연락 끊긴 옛 친구. 상자 안엔 손편지 한 장.', choices: [
    { label: '바로 영상 통화를 건다', text: '20년 만의 통화. 한 시간이 1분 같았다.', eff: { hap: 8, cha: 1 } },
    { label: '손편지로 답장을 보낸다', text: '종이 편지가 귀한 시대. 친구가 액자에 넣었다고 한다.', eff: { hap: 6, mor: 1, cash: -2 } },
  ] },
  { id: 'ph2_deepfake_call', title: '📞 딥페이크 전화', age: [30, 95], w: 0.05, cooldown: 6, years: [2035, 2120], cond: adult, text: '자녀의 얼굴과 목소리로 영상 통화가 왔다. "엄마(아빠), 급해서 그런데 돈 좀…" 화면 속 눈 깜빡임이 어딘가 어색하다.', choices: [
    { label: '가족만 아는 암호를 묻는다', text: '"우리 집 강아지 이름이 뭐지?" 통화가 뚝 끊겼다. 사기였다.', eff: { int: 1, hap: 2 } },
    { label: '일단 송금한다', text: '', roll: ['int', 60, [{ int: 1 }, '송금 직전, 은행 AI가 이상 거래를 막았다. 휴.'], [{ cash: -500, hap: -10 }, '진짜 자녀는 그 시간에 회의 중이었다.']] },
  ] },
  { id: 'ph2_memory_album', title: '💬 기억 앨범 알림', age: [30, 100], w: 0.05, cooldown: 7, years: [2050, 2200], text: '"10년 전 오늘의 기억이 도착했습니다." 그날의 냄새와 소리까지 재생되는 몰입형 앨범이다.', choices: [
    { label: '온 가족과 함께 본다', text: '아이들이 어렸을 때다. 다들 말없이 웃었다.', eff: { hap: 7, aff: 2 } },
    { label: '혼자 조용히 본다', text: '그때는 몰랐던 행복이 보였다.', eff: { hap: 4, mor: 1 } },
  ] },
  { id: 'ph2_translator_love', title: '💬 실시간 통역 메시지', age: [18, 45], w: 0.05, cooldown: 6, years: [2038, 2200], cond: single, text: '실시간 통역 앱으로 지구 반대편 사람과 매일 대화한다. 오늘 상대가 물었다. "통역 끄고 얘기해 볼래?"', choices: [
    { label: '서툴러도 그 나라 말로 해 본다', text: '', roll: ['int', 52, [{ hap: 8, int: 1 }, '엉터리 문법에 둘 다 웃었다. 마음은 다 전해졌다.'], [{ hap: 2 }, '무슨 말인지 하나도 몰랐지만, 웃음소리는 알아들었다.']] },
    { label: '통역은 켜 두자고 한다', text: '편하긴 하지만, 어딘가 한 겹 막힌 느낌.', eff: { hap: 2 } },
  ] },
  { id: 'ph2_robot_report', title: '📱 돌봄 로봇 리포트', age: [35, 90], w: 0.05, cooldown: 6, years: [2045, 2200], cond: parent, text: '부모님 댁 돌봄 로봇의 주간 리포트. "이번 주 대화 시간 12분. 웃음 2회. 자녀분 이야기를 9번 하셨습니다."', choices: [
    { label: '주말에 찾아간다', text: '로봇이 현관에서 말했다. "오늘 웃음은 벌써 14회입니다."', eff: { aff: 4, hap: 5, cash: -10 } },
    { label: '로봇에게 말벗 모드를 늘려 달라고 한다', text: '설정을 바꿨다. 마음 한쪽이 무거웠다.', eff: { mor: -1 } },
  ] },
  { id: 'ph2_climate_alert', title: '📱 폭염 재난 경보', age: [15, 100], w: 0.035, cooldown: 8, years: [2045, 2160], text: '"[재난] 체감 45℃. 낮 12시~5시 외출 금지 권고." 올여름 들어 열한 번째 경보다.', choices: [
    { label: '동네 무더위 쉼터 봉사를 한다', text: '혼자 사는 어르신들께 물을 돌렸다.', eff: { mor: 2, hap: 3, hp: -1 } },
    { label: '집에서 냉방을 최대로', text: '전기 요금 고지서가 무섭다.', eff: { cash: -20, hp: 1 } },
  ] },
  { id: 'ph2_space_postcard', title: '✉ 달 기지 엽서', age: [8, 90], w: 0.04, cooldown: 7, years: [2065, 2200], text: '달 기지에 관광 간 이웃이 디지털 엽서를 보냈다. "지구가 손톱만 해요. 그래도 우리 동네 쪽은 알아보겠더라고요."', choices: [
    { label: '"우리도 언젠가 가자" 가족과 적금을 든다', text: '"달 여행 적금" 통장을 만들었다.', eff: { hap: 5, cash: -30 } },
    { label: '천체 망원경으로 달을 본다', text: '저기 어딘가에 사람이 산다니.', eff: { int: 1, hap: 3 } },
  ] },
  { id: 'ph2_ai_lawyer', title: '📱 AI 법률 비서 알림', age: [25, 90], w: 0.04, cooldown: 7, years: [2040, 2200], cond: working, text: '"근로계약서 14조에 불리한 조항이 있습니다. 서명 전에 확인하시겠어요?" AI 법률 비서가 경고한다.', choices: [
    { label: '조항을 고쳐 달라고 요구한다', text: '', roll: ['cha', 50, [{ cash: 100, hap: 3 }, '회사가 순순히 고쳤다. AI 덕에 연봉도 조금 올랐다.'], [{ hap: -3 }, '"그럼 다른 분 구하죠." 결국 그대로 서명했다.']] },
    { label: '그냥 서명한다', text: '읽지 않은 약관이 또 하나 늘었다.', eff: {} },
  ] },
  { id: 'ph2_neural_dream_share', title: '💬 꿈 공유 초대', age: [15, 80], w: 0.04, cooldown: 7, years: [2095, 2200], text: '친구에게서 "꿈 공유" 초대가 왔다. 오늘 밤 같은 꿈에서 만나자고.', choices: [
    { label: '수락한다', text: '', roll: ['luck', 55, [{ hap: 8, cha: 1 }, '꿈속 바닷가에서 밤새 웃었다. 아침에 둘 다 같은 노래를 흥얼거렸다.'], [{ hap: -3 }, '친구의 악몽에 끌려 들어갔다. 시험 보는 꿈이었다.']] },
    { label: '내 꿈은 나만의 것', text: '오랜만에 아무도 없는 꿈을 꿨다.', eff: { mor: 1 } },
  ] },
  { id: 'ph2_ancestor_ai', title: '📞 조상 AI와의 통화', age: [20, 95], w: 0.04, cooldown: 8, years: [2080, 2200], text: '가문 기록으로 학습한 증조할아버지 AI가 명절 인사를 왔다. "요즘 애들은 밥은 먹고 다니냐."', choices: [
    { label: '가문 이야기를 묻는다', text: '몰랐던 집안 이야기를 들었다. 반은 AI가 지어낸 것 같지만.', eff: { hap: 5, int: 1 } },
    { label: '어색해서 끈다', text: '죽은 사람의 목소리는 아직 낯설다.', eff: {} },
  ] },
  { id: 'ph2_carbon_score', title: '📱 탄소 점수 알림', age: [18, 90], w: 0.05, cooldown: 6, years: [2042, 2160], cond: adult, text: '"이번 달 개인 탄소 점수: C등급. 항공 이용이 많았습니다. 다음 달 세금 감면 혜택이 줄어듭니다."', choices: [
    { label: '대중교통·채식 챌린지', text: '', roll: ['mor', 50, [{ hp: 1, mor: 1, cash: 20 }, 'A등급 달성! 감면 혜택을 받았다.'], [{ hap: -2 }, '사흘 만에 포기했다.']] },
    { label: '돈으로 상쇄권을 산다', text: '나무 300그루를 샀다. 화면 속에서만.', eff: { cash: -30 } },
  ] },
];
