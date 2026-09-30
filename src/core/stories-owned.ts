// 가진 것이 부르는 사건: 뉴럴 칩·가정용 로봇·인공 장기·AR 글래스·궤도 도시 집·해상 도시 집·달/화성 가족…
// 한번 들이면(시술·구매·이주) 그와 관련된 일이 꽤 자주 따라온다. 좋은 일도, 골치 아픈 일도.
// 이야기마다 쿨다운이 있어서 같은 일이 연달아 오지는 않는다.
import type { Story } from './stories';
import type { GameState, Person } from './types';
import { age, alive, hasFlag, householder, parentsOf } from './people';
import { phoneOf } from './devices';

const has = (f: string) => (_s: GameState, p: Person) => hasFlag(p, f);
const hh = (f: string) => (s: GameState) => hasFlag(householder(s), f);
const neural = (s: GameState, p: Person) => hasFlag(p, 'neural') || (p.id === householder(s).id && phoneOf(s).model.kind === 'neural');
const glasses = (s: GameState, p: Person) => p.id === householder(s).id && phoneOf(s).model.kind === 'glass';
const organ = (_s: GameState, p: Person) => p.flags.some((f) => f.startsWith('organ:'));
const young = (s: GameState, p: Person) => age(s, p) < 20 && p.id !== s.headId;
const anyUploaded = (s: GameState, p: Person) => parentsOf(s, p).some((q) => !alive(q) && hasFlag(q, 'uploaded')) || Object.values(s.people).some((q) => !alive(q) && hasFlag(q, 'uploaded'));

export const OWNED_STORIES: Story[] = [
  // ═══════ 뉴럴 칩 ═══════
  { id: 'own_neural_ads', title: '🧠 머릿속 광고', age: [15, 200], w: 0.1, cooldown: 5, cond: neural, text: '아침에 눈을 뜨자마자 머릿속에 치킨 광고가 떠오른다. 무료 요금제의 대가다.', choices: [
    { label: '광고 없는 요금제로 바꾼다', cost: 30, text: '고요하다. 생각이 온전히 내 것이 됐다.', eff: { hap: 4 } },
    { label: '참는다', text: '점심에 결국 치킨을 시켰다.', eff: { hap: -2, cash: -3 } },
  ] },
  { id: 'own_neural_dream', title: '🧠 꿈 녹화', age: [15, 200], w: 0.09, cooldown: 6, cond: neural, text: '뉴럴 칩으로 간밤의 꿈을 녹화했다. 돌아가신 할머니가 나오는 꿈이었다. 가족에게 보여 줄까?', choices: [
    { label: '가족과 함께 본다', text: '온 가족이 울다가 웃었다. 할머니 목소리가 그대로였다.', eff: { hap: 6, aff: 4 } },
    { label: '혼자 간직한다', text: '가끔 다시 틀어 본다.', eff: { hap: 3 } },
    { label: '지운다', text: '꿈은 꿈으로 두기로 했다.', eff: { mor: 1 } },
  ] },
  { id: 'own_neural_hack', title: '🧠 뉴럴 해킹', age: [15, 200], w: 0.07, cooldown: 8, cond: neural, text: '낯선 목소리가 머릿속에서 속삭인다. "계좌 비밀번호를 떠올려 보세요." 뉴럴 칩이 해킹당했다.', choices: [
    { label: '즉시 칩을 끄고 병원으로', cost: 50, text: '보안 패치를 받았다. 사흘 동안 생각이 조용했다.', eff: { int: 1 } },
    { label: '무시하고 버틴다', text: '', roll: ['int', 55, [{ hap: -2 }, '스스로 이상한 연결을 끊어 냈다.'], [{ cash: -1500, hap: -10 }, '무심코 비밀번호를 떠올렸다. 통장이 털렸다.']] },
  ] },
  { id: 'own_neural_telepathy', title: '🧠 생각 공유', age: [20, 200], w: 0.08, cooldown: 7, cond: (s, p) => neural(s, p) && !!p.spouseId, text: '배우자도 뉴럴 칩이 있다. "생각 공유 모드"를 켜면 말하지 않아도 마음이 전해진다. 숨기고 싶은 생각까지도.', choices: [
    { label: '켠다', text: '', roll: ['mor', 50, [{ bond: 10, hap: 5 }, '서로를 이렇게 깊이 이해한 적이 없었다.'], [{ bond: -8 }, '"지금 옆집 사람 생각했지?" 대판 싸웠다.']] },
    { label: '말로 하는 게 좋다', text: '"당신 목소리가 좋아." 저녁마다 산책하며 이야기한다.', eff: { bond: 4 } },
  ] },
  { id: 'own_neural_update', title: '🧠 업데이트 실패', age: [15, 200], w: 0.08, cooldown: 6, cond: neural, text: '밤사이 뉴럴 칩 자동 업데이트가 실패했다. 아침부터 머리가 멍하고 단어가 떠오르지 않는다.', choices: [
    { label: '재부팅 센터에 간다', cost: 20, text: '30분 만에 정상. 대기실이 같은 증상의 사람들로 가득했다.', eff: { hp: -1 } },
    { label: '하루 쉰다', text: '칩 없이 보낸 하루. 오히려 개운했다.', eff: { hap: 3 } },
  ] },
  { id: 'own_neural_exam', title: '🧠 기억 검색', age: [15, 200], w: 0.08, cooldown: 6, cond: neural, text: '회의 중 10년 전 계약서 조항이 필요하다. 뉴럴 칩 "기억 검색"을 쓰면 1초 만에 떠오른다.', choices: [
    { label: '쓴다', text: '"와, 그걸 기억해요?" 동료들이 놀랐다.', eff: { int: 1 } },
    { label: '일부러 안 쓴다', text: '"머리도 써야 늘지." 끙끙대다 결국 찾아냈다.', eff: { int: 1, mor: 1 } },
  ] },
  { id: 'own_neural_addict', title: '🧠 접속 중독', age: [13, 40], w: 0.07, cooldown: 8, cond: (s, p) => neural(s, p) && age(s, p) < 40, text: '{n}이(가) 하루 18시간 뉴럴 가상공간에 접속해 있다. 밥 먹는 것도 잊는다.', choices: [
    { label: '디지털 단식 캠프에 보낸다', cost: 80, text: '2주 동안 칩을 끄고 숲에서 지냈다. 돌아와서 처음으로 창밖을 오래 봤다.', eff: { hp: 4, hap: 2 } },
    { label: '접속 시간 제한을 건다', text: '', roll: ['mor', 45, [{ hp: 2 }, '스스로 시간을 지키기 시작했다.'], [{ aff: -5, hap: -3 }, '몰래 제한을 풀었다. 싸움이 잦아졌다.']] },
  ] },
  { id: 'own_neural_upgrade', title: '🧠 차세대 칩', age: [20, 200], w: 0.06, cooldown: 10, cond: neural, text: '차세대 뉴럴 칩이 나왔다. 처리 속도 10배, 감정 필터 기능까지. 교체 시술이 필요하다.', choices: [
    { label: '교체한다', cost: 600, text: '세상이 한 단계 빨라졌다.', eff: { int: 2, hap: 3 } },
    { label: '지금 칩도 충분하다', text: '"기능보다 안정이지."', eff: { mor: 1 } },
  ] },
  // ═══════ 가정용 로봇 ═══════
  { id: 'own_robot_break', title: '🤖 로봇이 멈췄다', age: [20, 200], w: 0.09, cooldown: 5, head: true, cond: hh('home_robot'), text: '설거지하던 로봇이 접시를 든 채 멈췄다. 화면에 "관절 모듈 교체 필요".', choices: [
    { label: '정품 수리', cost: 120, text: '이틀 만에 돌아왔다. 아이들이 박수를 쳤다.', eff: { hap: 3 } },
    { label: '동네 로봇 정비사에게', cost: 40, text: '', roll: ['luck', 60, [{ hap: 3 }, '싸게 잘 고쳤다.'], [{ hap: -3 }, '이상한 부품을 넣었는지 로봇이 가끔 트로트를 부른다.']] },
  ] },
  { id: 'own_robot_nanny', title: '🤖 로봇 엄마?', age: [25, 60], w: 0.09, cooldown: 7, head: true, cond: (s) => hasFlag(householder(s), 'home_robot') && Object.values(s.people).some((p) => alive(p) && age(s, p) < 10), text: '아이가 다쳤는데 엄마 아빠 대신 로봇에게 먼저 달려갔다. 가슴이 철렁했다.', choices: [
    { label: '저녁 시간은 로봇을 끈다', text: '저녁마다 가족끼리 밥을 먹는다. 아이가 다시 엄마 아빠를 찾는다.', eff: { aff: 6 } },
    { label: '로봇 덕분에 편하다', text: '일은 편해졌다. 아이는 로봇 얘기만 한다.', eff: { aff: -4, hap: 2 } },
  ] },
  { id: 'own_robot_neighbor', title: '🤖 옆집과 분쟁', age: [20, 200], w: 0.07, cooldown: 8, head: true, cond: hh('home_robot'), text: '우리 로봇이 청소하다 옆집 화분을 넘어뜨렸다. 옆집이 로봇 보험 청구를 하겠다고 한다.', choices: [
    { label: '직접 사과하고 물어준다', cost: 20, text: '케이크를 들고 갔다. 이웃과 오히려 친해졌다.', eff: { cha: 1, mor: 1 } },
    { label: '제조사 책임이라 주장한다', text: '', roll: ['int', 50, [{ hap: 2 }, '제조사가 배상했다.'], [{ hap: -3 }, '소송만 길어졌다.']] },
  ] },
  { id: 'own_robot_retire', title: '🤖 오래된 로봇', age: [30, 200], w: 0.06, cooldown: 15, head: true, cond: hh('home_robot'), text: '15년 된 우리 집 로봇. 새 모델로 바꾸라는 광고가 쏟아진다. 아이들이 "버리지 마"라며 운다.', choices: [
    { label: '은퇴시켜 거실에 둔다', text: '로봇은 이제 가끔 옛날이야기만 한다. 가족 사진에 늘 같이 있다.', eff: { hap: 5, mor: 1 } },
    { label: '새 모델로 바꾼다', cost: 1500, text: '빠르고 똑똑하다. 그런데 옛 로봇이 부르던 노래를 모른다.', eff: { hap: 2, int: 1 } },
  ] },
  { id: 'own_robot_elder', title: '🤖 할머니의 친구', age: [70, 200], w: 0.08, cooldown: 8, cond: (s, p) => hasFlag(householder(s), 'home_robot') && age(s, p) >= 70, text: '로봇이 {n}에게 매일 약을 챙기고 화투 상대를 해 준다. 그런데 요즘 {n}이(가) 가족보다 로봇하고만 이야기한다.', choices: [
    { label: '주말마다 손주들을 보낸다', text: '로봇이 손주들에게 "할머니(할아버지)는 이 노래를 좋아하세요"라고 알려 줬다.', eff: { hap: 6, aff: 4 } },
    { label: '그래도 외롭지 않으니 다행이다', text: '로봇 덕에 우울증 검사 수치가 좋아졌다.', eff: { hp: 2 } },
  ] },
  // ═══════ 인공 장기·미래 의료 ═══════
  { id: 'own_organ_recall', title: '🫀 인공 장기 리콜', age: [30, 200], w: 0.08, cooldown: 10, cond: organ, text: '{n}의 인공 장기 모델에 리콜 공지가 떴다. "펌웨어 결함, 드물게 멈출 수 있음." 병원 예약이 밀려 있다.', choices: [
    { label: '당장 사설 병원에서 교체', cost: 800, text: '하루 만에 교체했다. 돈으로 산 안심.', eff: { hp: 3 } },
    { label: '예약 차례를 기다린다', text: '', roll: ['luck', 85, [{}, '무사히 차례가 왔다.'], [{ hp: -20 }, '기다리는 동안 한 번 멈췄다. 응급실에서 살아났다.']] },
  ] },
  { id: 'own_organ_charge', title: '🫀 심장 충전', age: [30, 200], w: 0.08, cooldown: 7, cond: has('organ:heart'), text: '인공 심장은 몸 안에서 무선 충전된다. 그런데 정전이 사흘째다. 배터리 잔량 18%.', choices: [
    { label: '병원 비상 충전소로', text: '긴 줄에 인공 심장을 단 사람들이 모였다. 서로 웃었다. "우리 다 기계 심장이네요."', eff: { cha: 1 } },
    { label: '휴대용 발전기를 산다', cost: 60, text: '다음 정전부터는 걱정 없다.', eff: { hap: 3 } },
  ] },
  { id: 'own_rejuv_reunion', title: '✨ 동창회', age: [60, 200], w: 0.09, cooldown: 10, cond: has('rejuvenated'), text: '동창회에 나갔더니 아무도 {n}을(를) 못 알아본다. 노화 역전 치료로 스무 살은 젊어 보인다. 치료 못 받은 친구들 눈빛이 복잡하다.', choices: [
    { label: '치료 정보를 나눈다', text: '"나도 해 볼까." 친구들이 반색했다.', eff: { cha: 1, mor: 1 } },
    { label: '그냥 웃어넘긴다', text: '"요즘 운동해서 그래." 괜히 미안했다.', eff: { hap: 2 } },
  ] },
  { id: 'own_backup_restore', title: '💾 기억 복원', age: [70, 200], w: 0.09, cooldown: 8, cond: has('brain_backup'), text: '{n}이(가) 요즘 가족 이름을 자주 헷갈린다. 저장해 둔 뇌 백업으로 기억을 복원할 수 있다.', choices: [
    { label: '복원한다', cost: 100, text: '"아, 우리 손주 이름이 그거였지!" 눈빛이 돌아왔다.', eff: { int: 3, hap: 6 } },
    { label: '자연스럽게 둔다', text: '잊어 가는 것도 삶이라고, 본인이 말했다.', eff: { mor: 2 } },
  ] },
  // ═══════ AR 글래스 ═══════
  { id: 'own_glass_nav', title: '👓 길 안내 사고', age: [15, 90], w: 0.08, cooldown: 6, cond: glasses, text: 'AR 글래스 길 안내 화살표만 보고 걷다가 공사장 안내판에 부딪혔다.', choices: [
    { label: '"현실 우선 모드"를 켠다', text: '가끔은 세상을 맨눈으로 본다. 하늘이 이렇게 파랬나.', eff: { hap: 3 } },
    { label: '제조사에 항의한다', text: '', roll: ['cha', 45, [{ cash: 50 }, '보상금을 받았다.'], [{ hap: -2 }, '"약관에 있습니다."']] },
  ] },
  { id: 'own_glass_face', title: '👓 얼굴 인식', age: [15, 90], w: 0.07, cooldown: 7, cond: glasses, text: '길에서 스친 사람 머리 위에 이름과 직업이 뜬다. 옛 연인이다. 인사할까?', choices: [
    { label: '인사한다', text: '', roll: ['cha', 50, [{ hap: 5 }, '반갑게 커피 한잔. 좋은 추억으로 남았다.'], [{ hap: -3 }, '상대는 {n}을(를) 기억하지 못했다.']] },
    { label: '얼굴 인식을 끈다', text: '모르는 사람은 모르는 채로 두는 게 예의다.', eff: { mor: 1 } },
  ] },
  // ═══════ 우주·새 터전 ═══════
  { id: 'own_space_lecture', title: '🚀 우주 여행 강연', age: [18, 200], w: 0.07, cooldown: 10, cond: has('space_trip'), text: '{n}이(가) 우주에 다녀왔다는 소문을 듣고, 동네 초등학교에서 강연을 부탁했다.', choices: [
    { label: '간다', text: '아이들 질문이 끝이 없었다. "우주에서 방귀 뀌면 어떻게 돼요?"', eff: { cha: 2, fame: 1 } },
    { label: '사진만 보낸다', text: '지구 사진이 교실 뒤에 걸렸다.' },
  ] },
  { id: 'own_space_again', title: '🚀 또 가고 싶다', age: [18, 200], w: 0.07, cooldown: 12, cond: has('space_trip'), text: '밤하늘을 볼 때마다 그때가 생각난다. "한 번 더 가고 싶다." 적금 통장을 들여다본다.', choices: [
    { label: '우주 여행 적금을 든다', text: '매달 조금씩. 다음엔 온 가족이 함께.', eff: { mark: { thrift: 1 }, hap: 3 } },
    { label: '한 번이면 충분하다', text: '마음속에 늘 그 풍경이 있다.', eff: { hap: 2 } },
  ] },
  { id: 'own_orbital_spin', title: '🪐 궤도 도시의 하루', age: [5, 200], w: 0.09, cooldown: 5, cond: has('orbital_home'), text: '궤도 도시에 우주 쓰레기 경보가 울렸다. 모두 차폐 구역으로. 창밖으로 파편이 반짝이며 지나간다.', choices: [
    { label: '이웃 아이들을 챙겨 대피한다', text: '차폐실에서 아이들과 끝말잇기를 했다.', eff: { mor: 2, cha: 1 } },
    { label: '빠르게 혼자 대피한다', text: '무사했다. 경보는 30분 만에 풀렸다.', eff: {} },
  ] },
  { id: 'own_orbital_homesick', title: '🪐 흙냄새', age: [10, 200], w: 0.08, cooldown: 8, cond: has('orbital_home'), text: '궤도 도시에서 몇 년. {n}이(가) 비 오는 날 흙냄새가 그립다고 한다.', choices: [
    { label: '지구 휴가를 간다', cost: 200, text: '시골 할머니 집 마당에서 비를 맞았다. 울었다.', eff: { hap: 8 } },
    { label: '공원 화분에 물을 준다', text: '작은 흙냄새로 버틴다.', eff: { hap: 2 } },
  ] },
  { id: 'own_sea_typhoon', title: '🌊 해상 도시 잠수', age: [5, 200], w: 0.09, cooldown: 6, cond: hh('sea_city'), text: '초대형 태풍. 해상 도시가 통째로 물속으로 가라앉는다. 창밖으로 물고기 떼가 지나간다.', choices: [
    { label: '아이들과 해저 구경', text: '공포보다 신기함이 컸다. 아이들이 물고기 이름을 외웠다.', eff: { hap: 5, int: 1 } },
    { label: '비상식량을 점검한다', text: '사흘 뒤 도시가 다시 떠올랐다. 아무 일도 없었다.', eff: { mor: 1 } },
  ] },
  { id: 'own_moon_letter', title: '🌙 달에서 온 영상 편지', age: [10, 200], w: 0.09, cooldown: 4, cond: (s) => Object.values(s.people).some((q) => alive(q) && (hasFlag(q, 'moon_worker') || hasFlag(q, 'mars_settler') || hasFlag(q, 'starship_crew'))), text: '멀리 떠난 가족에게서 영상 편지가 왔다. 배경에 낯선 하늘이 보인다. "여긴 잘 지내. 거긴 어때?"', choices: [
    { label: '온 가족이 답장을 찍는다', text: '강아지까지 나와서 짖었다. 몇 분(또는 몇 년) 뒤 도착할 답장.', eff: { hap: 6, aff: 3 } },
    { label: '짧게 안부만', text: '"건강해." 한마디에 마음을 담았다.', eff: { hap: 2 } },
  ] },
  // ═══════ 업로드된 조상 ═══════
  { id: 'own_upload_advice', title: '💾 할머니에게 물어보자', age: [15, 90], w: 0.1, cooldown: 5, cond: anyUploaded, text: '큰 결정을 앞두고 업로드된 조상의 디지털 인격에게 조언을 구할 수 있다. "우리 때는 말이다…"', choices: [
    { label: '접속해서 묻는다', text: '', roll: ['luck', 60, [{ int: 1, hap: 4 }, '뜻밖에 딱 맞는 조언이었다. "200년 살아 보니 돈보다 사람이더라."'], [{ hap: -1 }, '"요즘 애들은…" 잔소리만 30분 들었다.']] },
    { label: '내 힘으로 정한다', text: '조상님도 이걸 바라셨을 거다.', eff: { mor: 1 } },
  ] },
  { id: 'own_upload_rights', title: '💾 디지털 조상의 투표권', age: [20, 90], w: 0.07, cooldown: 12, cond: anyUploaded, text: '업로드 인격에게 투표권을 줄지 국민투표가 열렸다. 우리 조상님도 "투표하고 싶다"고 하신다.', choices: [
    { label: '찬성한다', text: '조상님이 "고맙다, 아가"라고 하셨다.', eff: { aff: 3, mor: 1 } },
    { label: '반대한다', text: '"산 사람의 세상은 산 사람이." 조상님이 서운해하셨다.', eff: { cha: 1 } },
  ] },
  // ═══════ 아이·청소년이 가진 것 ═══════
  { id: 'own_kid_neural_school', title: '🧠 칩 없는 아이', age: [10, 18], w: 0.08, cooldown: 6, years: [2060, 2200], cond: (s, p) => young(s, p) && !neural(s, p), text: '반 아이들 대부분이 뉴럴 칩으로 조별 과제를 한다. {n}만 말로 해야 한다. 소외감을 느낀다.', choices: [
    { label: '칩을 해 준다', cost: 600, text: '친구들과 생각으로 대화한다. 표정이 밝아졌다.', eff: { hap: 6, cha: 1, flag: 'neural' } },
    { label: '"말로 하는 게 네 무기야"', text: '토론 대회에서 칩 쓰는 애들을 이겼다.', eff: { cha: 2, mor: 1 } },
  ] },
];
