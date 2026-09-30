// 직장 생활 이야기: 직업마다 겪는 그 직업다운 일들. 일하는 가족에게 해마다 하나쯤 찾아온다 (sim.workEvents).
// promo: 직급 +1/-1, flag 'laid_off': 일을 그만둔다.
import type { Story } from './stories';
import type { GameState, Person } from './types';

const J = (...jobs: string[]) => (_s: GameState, p: Person) => jobs.includes(p.job);
const Jl = (min: number, ...jobs: string[]) => (_s: GameState, p: Person) => jobs.includes(p.job) && p.jobLevel >= min;
const W: [number, number] = [20, 72];
const OFFICE = ['office', 'corp', 'public_corp', 'banker', 'analyst', 'marketer', 'sales', 'insurance', 'hr', 'secretary', 'trader'];
const CIVIL = ['civil', 'tax_officer', 'mail_carrier', 'prison_guard', 'public_corp'];
const HEALTH = ['nurse', 'pt', 'radiographer', 'clinical', 'emt', 'nurse_aide', 'caregiver'];
const DEV = ['developer', 'data_scientist', 'security', 'game_dev'];
const ENG = ['researcher', 'chip_engineer', 'mech_engineer', 'aero_engineer'];
const SERVICE = ['chef', 'barista', 'hairdresser', 'nail_artist', 'hotelier', 'flight_attendant', 'tour_guide', 'wedding_planner', 'pet_groomer'];
const TRADE = ['factory', 'big_factory', 'electrician', 'welder', 'mechanic', 'carpenter', 'plumber', 'shipbuilder', 'crane_operator'];
const DRIVE = ['courier', 'delivery_rider', 'taxi', 'bus_driver', 'trucker'];
const CREATOR = ['youtuber', 'entertainer', 'actor', 'model', 'writer', 'novelist', 'musician', 'painter', 'photographer', 'voice_actor'];
const SHOP = ['shopkeeper', 'cafe_owner', 'cvs_owner', 'online_shop', 'restaurant'];
const LICENSE = ['accountant', 'tax_accountant', 'patent_attorney', 'scrivener', 'appraiser', 'labor_attorney', 'customs_broker'];
const FARM = ['farmer', 'smart_farmer', 'fisher', 'rancher'];

export const WORK_STORIES: Story[] = [
  // ───────── 사무·금융 ─────────
  { id: 'wk_off_ppt', title: '임원 보고', age: W, w: 1, cond: J(...OFFICE), text: '내일 아침 임원 보고. 팀장이 퇴근하며 {n}에게 PPT 40장을 맡겼다. "내일 7시까지."', choices: [
    { label: '밤을 새워 완벽하게', mark: { study: 1 }, text: '', roll: ['int', 50, [{ promo: 1, hap: -3, hp: -2 }, '상무가 "이거 누가 만들었어?" 물었다. 연말 승진 명단에 이름이 올랐다.'], [{ hap: -8, hp: -3 }, '밤을 새웠는데 팀장 이름으로 올라갔다.']] },
    { label: '핵심만 10장으로 줄인다', mark: { risk: 1 }, text: '', roll: ['cha', 50, [{ fame: 1, hap: 5 }, '"간결해서 좋네." 임원이 칭찬했다.'], [{ hap: -5 }, '"성의가 없네?" 팀장 표정이 굳었다.']] },
    { label: '칼퇴하고 내일 아침 일찍', text: '6시 출근해서 대충 맞췄다. 무난하게 넘어갔다.', eff: { hap: 2 } },
  ] },
  { id: 'wk_off_restructure', title: '구조조정 명단', age: [35, 60], w: 0.8, cond: J('office', 'corp', 'banker', 'trader', 'insurance', 'sales'), text: '회사가 희망퇴직을 받는다. 인사팀에서 {n}에게 조용히 말했다. "위로금 2년 치입니다. 지금이 제일 조건이 좋아요."', choices: [
    { label: '버틴다', mark: { thrift: 1 }, text: '', roll: ['luck', 60, [{ hap: -3 }, '살아남았다. 동기 절반이 사라진 사무실이 휑하다.'], [{ promo: -1, hap: -10 }, '한직으로 발령 났다. 창가 자리다.']] },
    { label: '위로금을 받고 나간다', mark: { risk: 1 }, text: '두둑한 위로금을 받고 사원증을 반납했다. 새 출발이다.', eff: { cash: 8000, flag: 'laid_off', later: [1, 1, 1, 'first_job'] } },
  ] },
  { id: 'wk_off_bigdeal', title: '큰 계약', age: W, w: 0.8, cond: J('sales', 'trader', 'insurance', 'marketer', 'corp'), text: '{n}이(가) 1년을 공들인 해외 거래처가 드디어 계약서에 사인하려 한다. 단, 마지막 조건으로 단가를 10% 깎아 달란다.', choices: [
    { label: '받아들이고 계약한다', text: '', roll: ['cha', 45, [{ promo: 1, cash: 800, hap: 8 }, '연간 300억짜리 계약! 사내 영업왕 시상대에 올랐다.'], [{ hap: -4 }, '본사가 단가를 승인하지 않았다. 계약이 날아갔다.']] },
    { label: '끝까지 협상한다', mark: { risk: 1 }, text: '', roll: ['int', 55, [{ promo: 1, cash: 1500, fame: 1 }, '원래 단가 그대로 사인! 전설의 협상으로 남았다.'], [{ hap: -8 }, '상대가 경쟁사로 갔다.']] },
  ] },
  { id: 'wk_off_boss', title: '꼰대 부장', age: [22, 45], w: 0.8, cond: J(...OFFICE), text: '새로 온 부장이 회식 3차까지 강제로 끌고 다닌다. 주말 등산 모임까지 "자율 참석"이란다.', choices: [
    { label: '분위기 맞춰 따라간다', mark: { network: 1 }, text: '등산 정상에서 부장이 "자네는 됐어"라며 어깨를 쳤다.', eff: { hap: -4, cha: 1, hp: 1 } },
    { label: '정중히 빠진다', text: '', roll: ['cha', 45, [{ hap: 3 }, '"요즘 애들" 소리를 들었지만 딱히 불이익은 없었다.'], [{ hap: -3 }, '인사 평가가 B로 떨어졌다.']] },
    { label: '익명 게시판에 올린다', mark: { risk: 1 }, text: '', roll: ['luck', 50, [{ hap: 8 }, '글이 퍼져 부장이 교육을 받았다. 회식 문화가 바뀌었다.'], [{ hap: -8 }, '작성자가 특정됐다. 사무실 공기가 얼어붙었다.']] },
  ] },
  { id: 'wk_bank_fraud', title: '수상한 대출', age: W, w: 0.8, cond: J('banker', 'analyst', 'insurance'), text: '지점장이 {n}에게 서류가 부실한 대출을 승인하라고 한다. "VIP 고객이야. 실적 압박 알잖아."', choices: [
    { label: '원칙대로 반려한다', mark: { honest: 2 }, text: '', roll: ['mor', 45, [{ mor: 3, fame: 1 }, '몇 달 뒤 그 고객이 사기꾼으로 밝혀졌다. {n}의 판단이 지점을 살렸다.'], [{ hap: -6, promo: -1 }, '"융통성이 없어." 한직으로 밀렸다.']] },
    { label: '시키는 대로 한다', mark: { cheat: 1 }, text: '', roll: ['luck', 55, [{ cash: 500 }, '실적 보너스가 나왔다. 찝찝하다.'], [{ hap: -15, flag: 'laid_off', fame: -2 }, '부실 대출이 터졌다. 책임을 지고 해고됐다.']] },
  ] },
  { id: 'wk_analyst_call', title: '매도 리포트', age: W, w: 0.8, cond: J('analyst', 'banker'), text: '{n}이(가) 분석해 보니 대형 고객사의 실적이 엉망이다. "매도" 의견을 내면 그 회사와의 거래가 끊긴다.', choices: [
    { label: '"매도" 리포트를 낸다', mark: { honest: 1 }, text: '', roll: ['int', 55, [{ fame: 3, promo: 1 }, '3개월 뒤 주가가 반토막. "소신 애널리스트" 1위에 올랐다.'], [{ hap: -6 }, '주가가 오히려 올랐다. 망신이다.']] },
    { label: '"중립"으로 돌려 말한다', text: '아무 일도 없었다. 그게 이 바닥의 방식이다.', eff: { mor: -1 } },
  ] },
  { id: 'wk_hr_layoff', title: '해고 통보', age: W, w: 0.8, cond: J('hr', 'secretary'), text: '인사팀 {n}이(가) 해고 대상자 20명에게 통보하는 일을 맡았다. 그중엔 입사 동기도 있다.', choices: [
    { label: '한 명 한 명 직접 만난다', mark: { kind: 1 }, text: '울고, 화내고, 고맙다고 하는 사람도 있었다. 밤에 잠이 오지 않았다.', eff: { mor: 3, hap: -8 } },
    { label: '동기를 명단에서 빼 달라고 한다', mark: { family: 1 }, text: '', roll: ['cha', 55, [{ hap: 3 }, '동기가 남았다. 평생 은인이 됐다.'], [{ hap: -6 }, '"공사 구분 못 하나?" 경고를 받았다.']] },
  ] },
  // ───────── 공무원 ─────────
  { id: 'wk_civil_complaint', title: '악성 민원', age: W, w: 1, cond: J(...CIVIL), text: '같은 민원인이 석 달째 매일 {n}에게 전화한다. 오늘은 사무실에 찾아와 소리를 지른다.', choices: [
    { label: '끝까지 친절하게', mark: { kind: 1 }, text: '', roll: ['mor', 50, [{ mor: 2, fame: 1 }, '민원인이 결국 사과 편지를 보냈다. "당신 같은 공무원만 있으면…"'], [{ hap: -10, hp: -2 }, '공황 증상이 왔다. 병가를 냈다.']] },
    { label: '법대로 선을 긋는다', text: '청원경찰을 불렀다. 민원은 줄었지만 마음이 무겁다.', eff: { hap: -3 } },
  ] },
  { id: 'wk_civil_promo', title: '승진 시험', age: [28, 58], w: 0.8, cond: J('civil', 'tax_officer', 'public_corp', 'prison_guard', 'mail_carrier'), text: '{n}에게 승진 심사가 다가온다. 근무평정 점수가 간당간당하다.', choices: [
    { label: '야근하며 실적을 쌓는다', mark: { study: 1 }, text: '', roll: ['int', 45, [{ promo: 1, hap: 4 }, '승진! 새 명패가 책상에 놓였다.'], [{ hap: -5 }, '이번에도 밀렸다.']] },
    { label: '국장 라인을 탄다', mark: { network: 1 }, text: '', roll: ['cha', 55, [{ promo: 1 }, '줄을 잘 섰다. 승진했다.'], [{ hap: -8 }, '줄을 잘못 섰다. 국장이 좌천됐다.']] },
  ] },
  { id: 'wk_tax_bribe', title: '세무조사의 유혹', age: W, w: 0.8, cond: J('tax_officer'), text: '세무조사 중인 기업 대표가 {n}에게 명절 선물이라며 두꺼운 봉투를 내밀었다.', choices: [
    { label: '돌려주고 보고한다', mark: { honest: 2 }, text: '청렴 공무원 표창을 받았다.', eff: { mor: 4, fame: 2 } },
    { label: '받는다', mark: { cheat: 2 }, text: '', roll: ['luck', 50, [{ cash: 3000, mor: -6 }, '아무도 모른다. …아직은.'], [{ flag: 'laid_off', fame: -6, hap: -20 }, '감찰에 걸렸다. 파면됐다.']] },
  ] },
  { id: 'wk_mail_snow', title: '폭설 속 배달', age: W, w: 0.8, cond: J('mail_carrier', 'courier'), text: '폭설로 산골 마을 길이 끊겼다. 그 마을엔 약을 기다리는 할머니가 있다.', choices: [
    { label: '걸어서라도 간다', mark: { kind: 2 }, text: '', roll: ['hp', 45, [{ fame: 2, mor: 3 }, '눈길 4시간. 할머니가 손을 잡고 울었다. 지역 뉴스에 났다.'], [{ hp: -6 }, '약은 전했지만 발목을 다쳤다.']] },
    { label: '제설 후에 간다', text: '다음 날 도착했다. 할머니는 괜찮았다.', eff: {} },
  ] },
  // ───────── 경찰·해경·소방·군 ─────────
  { id: 'wk_police_chase', title: '추격전', age: [22, 58], w: 1, cond: J('police', 'coast_guard'), text: '순찰 중 {n}의 눈앞에서 뺑소니 차량이 달아난다.', choices: [
    { label: '끝까지 추격한다', mark: { sport: 1 }, text: '', roll: ['str', 50, [{ promo: 1, fame: 2 }, '검거! 표창장과 특진이 나왔다.'], [{ hp: -8 }, '추격 중 사고가 났다. 부상.']] },
    { label: 'CCTV로 추적한다', mark: { study: 1 }, text: '', roll: ['int', 45, [{ fame: 1 }, '사흘 만에 은신처를 찾아 검거했다.'], [{ hap: -3 }, '용의자가 해외로 달아났다.']] },
  ] },
  { id: 'wk_police_case', title: '미제 사건', age: [30, 60], w: 0.8, cond: Jl(2, 'police'), text: '15년 된 미제 살인 사건. 새 DNA 기법이 나왔다. {n}이(가) 사건 파일을 다시 연다.', choices: [
    { label: '재수사를 밀어붙인다', mark: { honest: 1 }, text: '', roll: ['int', 58, [{ fame: 5, promo: 1, hap: 10 }, '진범을 잡았다! 유가족이 경찰서 앞에서 무릎을 꿇었다. 전국 뉴스.'], [{ hap: -6 }, '증거가 부족했다. 파일을 다시 덮었다.']] },
    { label: '현재 사건에 집중한다', text: '파일은 다시 캐비닛으로 들어갔다.', eff: {} },
  ] },
  { id: 'wk_fire_rescue', title: '화재 출동', age: [22, 58], w: 1, cond: J('firefighter'), text: '새벽 3시 아파트 화재. 연기가 가득한 15층에 노인이 있다는 신고.', choices: [
    { label: '진입한다', mark: { kind: 2 }, text: '', roll: ['str', 50, [{ fame: 3, mor: 3 }, '노인을 업고 나왔다. 가족들이 소방서에 떡을 돌렸다.'], [{ hp: -10, hap: -5 }, '구조했지만 연기를 마시고 입원했다.']] },
    { label: '고가사다리로 접근', mark: { study: 1 }, text: '', roll: ['int', 45, [{ fame: 2 }, '침착한 판단으로 전원 구조.'], [{ hap: -8 }, '바람이 불어 접근이 늦었다. 다행히 목숨은 건졌다.']] },
  ] },
  { id: 'wk_fire_trauma', title: '트라우마', age: [25, 60], w: 0.6, cond: J('firefighter', 'emt', 'police'), text: '참혹한 현장을 본 뒤 {n}이(가) 잠을 못 잔다. 동료들은 "원래 다 그래"라고 한다.', choices: [
    { label: '상담을 받는다', mark: { warmth: 1 }, text: '처음엔 부끄러웠지만 조금씩 나아졌다.', eff: { hap: 6, hp: 2 } },
    { label: '술로 버틴다', mark: { hurt: 1 }, text: '술이 늘었다. 가족이 걱정한다.', eff: { hp: -5, hap: -5, bond: -5 } },
  ] },
  { id: 'wk_mil_drill', title: '연합 훈련', age: [22, 55], w: 1, cond: J('officer'), text: '한미 연합 훈련. {n}의 부대가 작전 평가를 받는다.', choices: [
    { label: '과감한 기동 작전', mark: { risk: 1 }, text: '', roll: ['int', 55, [{ promo: 1, fame: 1 }, '최우수 부대! 사단장 표창.'], [{ hap: -6 }, '작전이 꼬였다. 평가 최하위.']] },
    { label: '교범대로 정석으로', text: '', roll: ['mor', 45, [{ hap: 3 }, '무난하게 통과했다.'], [{ hap: -3 }, '"창의성이 없다"는 평.']] },
  ] },
  { id: 'wk_mil_transfer', title: '격오지 발령', age: [25, 50], w: 0.7, cond: J('officer'), text: '{n}에게 강원도 최전방 GOP 대대장 발령이 났다. 가족은 서울에 있다.', choices: [
    { label: '혼자 간다 (진급 유리)', mark: { risk: 1 }, text: '2년 주말부부. 대신 진급 심사에서 가산점을 받았다.', eff: { promo: 1, bond: -8, hap: -4 } },
    { label: '온 가족이 따라간다', mark: { family: 2 }, text: '관사에서의 2년. 아이들은 계곡과 별을 보며 자랐다.', eff: { bond: 6, hap: 4 } },
  ] },
  { id: 'wk_prison_riot', title: '수용동 소란', age: W, w: 0.8, cond: J('prison_guard'), text: '수용동에서 싸움이 번진다. 동료 둘뿐이다.', choices: [
    { label: '대화로 진정시킨다', mark: { honest: 1 }, text: '', roll: ['cha', 50, [{ fame: 1, promo: 1 }, '주동자를 설득했다. 소장 표창.'], [{ hp: -6 }, '주먹이 날아왔다.']] },
    { label: '지원을 부르고 대기', text: '5분 뒤 기동대가 들어왔다. 교범대로다.', eff: {} },
  ] },
  // ───────── 법조·자격사 ─────────
  { id: 'wk_judge_case', title: '세간의 이목', age: [30, 70], w: 1, cond: J('judge'), text: '재벌 총수 횡령 사건이 {n} 판사에게 배당됐다. 법정 밖에서 여론이 들끓는다.', choices: [
    { label: '법대로 실형 선고', mark: { honest: 2 }, text: '', roll: ['mor', 50, [{ fame: 3, promo: 1 }, '"법 앞에 평등" 판결이 교과서에 실렸다.'], [{ hap: -6 }, '항소심에서 뒤집혔다. 비난이 쏟아졌다.']] },
    { label: '집행유예 (경제 사정 고려)', mark: { cheat: 1 }, text: '"재벌 봐주기" 비판이 거셌다. 대신 로펌 러브콜이 늘었다.', eff: { fame: -2, cash: 0 } },
  ] },
  { id: 'wk_prosecutor', title: '살아 있는 권력', age: [30, 65], w: 1, cond: J('prosecutor'), text: '{n} 검사가 수사하다 보니 여당 실세의 비리가 나왔다. 윗선에서 "속도 조절"을 요구한다.', choices: [
    { label: '끝까지 수사한다', mark: { honest: 2 }, text: '', roll: ['int', 55, [{ fame: 5, promo: 1 }, '기소! "강골 검사"로 이름을 날렸다.'], [{ promo: -1, hap: -10 }, '지방으로 좌천됐다.']] },
    { label: '지시를 따른다', mark: { cheat: 1 }, text: '요직으로 옮겼다. 거울 보기가 불편하다.', eff: { promo: 1, mor: -5 } },
  ] },
  { id: 'wk_lawyer_case', title: '의뢰인', age: W, w: 1, cond: J('lawyer'), text: '{n} 변호사에게 두 사건이 왔다. 대기업 사건(수임료 3억)과 억울한 해고 노동자 사건(무료 변론).', choices: [
    { label: '대기업 사건', text: '', roll: ['int', 50, [{ cash: 9000, promo: 1 }, '승소. 성공 보수까지 두둑하다.'], [{ cash: 3000 }, '패소했지만 수임료는 받았다.']] },
    { label: '노동자 사건 (무료)', mark: { kind: 2, honest: 1 }, text: '', roll: ['int', 55, [{ fame: 4, mor: 4 }, '대법원 승소! 판례가 바뀌었다. "노동자의 변호사"로 불린다.'], [{ mor: 3, hap: -3 }, '졌지만 노동자는 "끝까지 싸워줘서 고맙다"고 했다.']] },
  ] },
  { id: 'wk_license_season', title: '시즌 마감', age: W, w: 1, cond: J(...LICENSE), text: '신고·결산 시즌. {n}의 사무실에 서류가 산처럼 쌓였다. 큰 고객이 "좀 봐달라"며 애매한 처리를 부탁한다.', choices: [
    { label: '원칙대로 처리', mark: { honest: 1 }, text: '고객 하나를 잃었지만 평판이 쌓였다. 소개가 늘었다.', eff: { mor: 2, cash: 1200 } },
    { label: '고객 요구를 들어준다', mark: { cheat: 1 }, text: '', roll: ['luck', 60, [{ cash: 3000 }, '고객이 만족했다. 수수료 보너스.'], [{ cash: -2000, fame: -3, hap: -10 }, '세무조사로 걸렸다. 징계와 과태료.']] },
  ] },
  { id: 'wk_realtor', title: '전세사기 매물', age: W, w: 0.8, cond: J('realtor', 'appraiser'), text: '{n}에게 시세보다 싼 빌라 전세 매물이 잔뜩 들어왔다. 등기부를 보니 근저당이 심상치 않다.', choices: [
    { label: '세입자에게 위험을 알린다', mark: { honest: 2 }, text: '계약은 안 됐지만 신혼부부가 연신 고맙다고 했다. 동네 입소문이 좋아졌다.', eff: { mor: 3, fame: 1 } },
    { label: '수수료 받고 계약시킨다', mark: { cheat: 2 }, text: '', roll: ['luck', 30, [{ cash: 1500 }, '수수료가 두둑했다.'], [{ fame: -8, hap: -20, flag: 'laid_off' }, '전세사기 방조로 입건됐다. 자격이 정지됐다.']] },
  ] },
  // ───────── 의료 ─────────
  { id: 'wk_doc_er', title: '응급실의 밤', age: [25, 65], w: 1, cond: J('doctor', 'emt', 'nurse'), text: '응급실에 교통사고 환자가 한꺼번에 여섯 명 실려 왔다. 의사는 {n} 포함 둘뿐.', choices: [
    { label: '중증부터 빠르게 분류', mark: { study: 1 }, text: '', roll: ['int', 55, [{ fame: 2, mor: 2 }, '여섯 명 모두 살렸다. 병원장이 직접 찾아왔다.'], [{ hap: -12 }, '한 명을 잃었다. 오래 잊지 못할 것이다.']] },
    { label: '인근 병원에 전원 요청', text: '', roll: ['cha', 45, [{ hap: 2 }, '협조가 잘 됐다. 모두 무사하다.'], [{ hap: -6 }, '"응급실 뺑뺑이" 뉴스에 병원 이름이 나왔다.']] },
  ] },
  { id: 'wk_doc_open', title: '개원의 꿈', age: [33, 55], w: 0.8, cond: Jl(2, 'doctor', 'dentist', 'kmd', 'vet'), text: '{n}에게 동기가 공동 개원을 제안했다. 대출 10억, 성공하면 월급의 세 배.', choices: [
    { label: '개원한다', mark: { risk: 2 }, text: '', roll: ['cha', 50, [{ promo: 1, cash: 5000, hap: 8 }, '입소문 맛집(?) 병원이 됐다. 예약이 2주 밀렸다.'], [{ cash: -8000, hap: -10 }, '상권이 안 좋았다. 대출 이자에 허덕인다.']] },
    { label: '봉직의로 남는다', text: '안정이 최고다. 퇴근이 이르다.', eff: { hap: 3 } },
  ] },
  { id: 'wk_doc_lawsuit', title: '의료 소송', age: [30, 70], w: 0.7, cond: J('doctor', 'dentist', 'kmd'), text: '수술 합병증이 생긴 환자 가족이 {n}을(를) 상대로 소송을 걸었다. 병원 앞 1인 시위도 시작됐다.', choices: [
    { label: '진심으로 사과하고 설명한다', mark: { honest: 1 }, text: '', roll: ['mor', 50, [{ mor: 3 }, '가족이 소송을 취하했다. "의사 선생님 말을 믿겠습니다."'], [{ cash: -3000, hap: -8 }, '합의금으로 3천만 원을 냈다.']] },
    { label: '병원 법무팀에 맡긴다', text: '', roll: ['luck', 60, [{}, '무과실 판결이 났다.'], [{ cash: -5000, fame: -2 }, '일부 과실이 인정됐다.']] },
  ] },
  { id: 'wk_nurse_taeum', title: '태움', age: [22, 45], w: 1, cond: J(...HEALTH), text: '선배 {n}이(가) 보니 신입 간호사가 다른 선배에게 매일 혼나며 울고 있다. 병동의 "태움" 문화다.', choices: [
    { label: '신입을 감싸고 수간호사에게 알린다', mark: { kind: 2 }, text: '', roll: ['cha', 45, [{ mor: 3, fame: 1 }, '병동 문화가 바뀌기 시작했다. 신입이 편지를 줬다.'], [{ hap: -6 }, '"너나 잘해." 선배들 눈 밖에 났다.']] },
    { label: '모른 척한다', text: '신입이 두 달 뒤 사직서를 냈다.', eff: { mor: -2 } },
  ] },
  { id: 'wk_care_family', title: '보호자', age: W, w: 0.8, cond: J('caregiver', 'nurse_aide', 'pt'), text: '{n}이(가) 돌보는 어르신의 자녀들이 서로 간병비를 미루며 싸운다. 어르신은 {n}의 손만 잡는다.', choices: [
    { label: '어르신 곁을 지킨다', mark: { kind: 2 }, text: '어르신이 편히 눈을 감으셨다. 장례식에서 자녀들이 고개를 숙였다.', eff: { mor: 4, hap: -3 } },
    { label: '다른 곳으로 옮긴다', text: '마음이 무겁지만 내 몸도 챙겨야 한다.', eff: { hp: 2 } },
  ] },
  { id: 'wk_pharm_chain', title: '약국 앞 대형 병원', age: W, w: 0.8, cond: J('pharmacist'), text: '{n}의 약국 건너편에 대형 병원이 들어선다는 소식. 약국 자리 권리금이 5억으로 뛰었다.', choices: [
    { label: '대출받아 병원 앞으로 옮긴다', mark: { risk: 1 }, text: '', roll: ['luck', 55, [{ cash: 6000, promo: 1 }, '처방전이 쏟아진다! 약사 둘을 더 뽑았다.'], [{ cash: -4000 }, '병원이 문전약국 편법을 막았다. 권리금만 날렸다.']] },
    { label: '동네 약국으로 남는다', mark: { warmth: 1 }, text: '단골 할머니들이 오늘도 수다를 떨고 간다.', eff: { hap: 4 } },
  ] },
  { id: 'wk_vet', title: '안락사', age: W, w: 0.8, cond: J('vet', 'pet_groomer'), text: '15살 노견의 보호자가 치료비를 감당 못 해 안락사를 부탁한다. 치료하면 1~2년은 더 살 수 있다.', choices: [
    { label: '치료비를 깎아준다', mark: { kind: 2 }, cost: 200, text: '노견은 1년을 더 살았다. 보호자가 매년 명절 선물을 보낸다.', eff: { mor: 4, hap: 4 } },
    { label: '보호자의 결정을 존중한다', text: '마지막을 편히 보내 줬다. 오래 마음에 남는다.', eff: { hap: -4 } },
  ] },
  // ───────── IT·공학 ─────────
  { id: 'wk_dev_outage', title: '서비스 장애', age: [22, 60], w: 1, cond: J(...DEV), text: '금요일 밤 11시, {n}이(가) 배포한 코드 때문에 서비스가 멈췄다. 사용자 500만 명이 접속 불가.', choices: [
    { label: '밤새 원인을 잡는다', mark: { study: 1 }, text: '', roll: ['int', 55, [{ promo: 1, hap: 3 }, '새벽 4시 복구! 장애 보고서가 사내 교육 자료가 됐다.'], [{ hap: -10, hp: -3 }, '복구에 14시간. 뉴스에 났다.']] },
    { label: '즉시 롤백하고 월요일에', text: '10분 만에 롤백. 주말을 지켰다. "그게 정답"이라는 CTO의 말.', eff: { hap: 2 } },
  ] },
  { id: 'wk_dev_offer', title: '실리콘밸리 제안', age: [26, 45], w: 0.7, cond: Jl(2, ...DEV, ...ENG), text: '미국 빅테크 리크루터가 {n}에게 연락했다. 연봉 4억, 가족 비자 지원.', choices: [
    { label: '미국으로 간다', mark: { risk: 2 }, text: '', roll: ['int', 60, [{ cash: 20000, promo: 1, fame: 2, flag: 'abroad_grad' }, '면접 5단계 통과! 캘리포니아에서 3년, 연봉과 스톡으로 크게 벌었다.'], [{ hap: -4 }, '최종 면접에서 떨어졌다. 그래도 좋은 경험.']] },
    { label: '한국에 남는다', mark: { family: 1 }, text: '회사에 오퍼를 보여줬더니 연봉을 올려 줬다.', eff: { cash: 1500 } },
  ] },
  { id: 'wk_game_crunch', title: '크런치 모드', age: [22, 50], w: 0.8, cond: J('game_dev', 'developer'), text: '출시 한 달 전. {n}의 팀이 3주째 새벽 퇴근이다. 사장은 "이번만 버티자"고 한다.', choices: [
    { label: '버틴다', text: '', roll: ['luck', 45, [{ cash: 3000, hap: 6 }, '게임이 대박! 인센티브가 연봉만큼 나왔다.'], [{ hp: -6, hap: -8 }, '게임은 망했다. 몸만 상했다.']] },
    { label: '노조를 만든다', mark: { honest: 1, network: 1 }, text: '', roll: ['cha', 50, [{ mor: 3, hap: 4 }, '업계 최초 크런치 금지 협약을 맺었다.'], [{ promo: -1 }, '"주동자"로 찍혔다.']] },
  ] },
  { id: 'wk_security_hack', title: '해킹 공격', age: [22, 60], w: 0.8, cond: J('security', 'developer'), text: '새벽, 회사 서버에 외국발 해킹 시도가 폭주한다. 고객 개인정보 3천만 건이 위험하다.', choices: [
    { label: '실시간으로 막는다', mark: { study: 1 }, text: '', roll: ['int', 58, [{ promo: 1, fame: 2 }, '공격을 막아냈다! 국정원에서 협조 요청이 왔다.'], [{ hap: -10 }, '일부 정보가 유출됐다. 청문회에 불려 나갔다.']] },
    { label: '서버를 내리고 차단', text: '서비스는 멈췄지만 정보는 지켰다.', eff: { hap: -2 } },
  ] },
  { id: 'wk_eng_patent', title: '직무 발명', age: [25, 60], w: 1, cond: J(...ENG, 'architect'), text: '{n}이(가) 개발한 기술로 회사가 수백억을 벌었다. 그런데 직무발명 보상금은 50만 원.', choices: [
    { label: '정당한 보상을 요구한다', mark: { honest: 1 }, text: '', roll: ['int', 55, [{ cash: 10000, fame: 2 }, '소송 끝에 보상금 1억! 업계의 판례가 됐다.'], [{ hap: -8, promo: -1 }, '회사와 척을 졌다.']] },
    { label: '대신 승진을 요구한다', text: '', roll: ['cha', 50, [{ promo: 1 }, '팀장이 됐다.'], [{ hap: -4 }, '"다음에 보자"는 말만 들었다.']] },
  ] },
  { id: 'wk_chip_line', title: '라인 사고', age: [24, 58], w: 0.8, cond: J('chip_engineer', 'big_factory', 'factory'), text: '반도체 라인에 정전이 났다. 웨이퍼 수천 장이 폐기될 위기. 복구 책임자로 {n}이(가) 지목됐다.', choices: [
    { label: '72시간 비상 근무', mark: { study: 1 }, text: '', roll: ['int', 50, [{ promo: 1, cash: 1000 }, '피해를 절반으로 줄였다. 특별 보너스.'], [{ hp: -6, hap: -6 }, '피해가 컸다. 책임론이 나왔다.']] },
    { label: '원인 보고서부터 쓴다', text: '재발 방지책을 만들었다. 윗선은 느리다고 불만이다.', eff: {} },
  ] },
  { id: 'wk_architect', title: '설계 공모전', age: [28, 65], w: 0.8, cond: J('architect'), text: '시립 도서관 설계 공모가 떴다. 대형 설계사무소들이 모두 참여한다.', choices: [
    { label: '과감한 디자인으로', mark: { art: 1, risk: 1 }, text: '', roll: ['cha', 55, [{ fame: 3, promo: 1, cash: 3000 }, '당선! 지역의 랜드마크가 된다.'], [{ hap: -4 }, '"너무 실험적"이라며 떨어졌다.']] },
    { label: '실용성으로 승부', text: '', roll: ['int', 50, [{ cash: 2000 }, '2등 입상. 상금을 받았다.'], [{}, '입선도 못 했다.']] },
  ] },
  // ───────── 교육 ─────────
  { id: 'wk_teacher_parent', title: '학부모 민원', age: W, w: 1, cond: J('teacher', 'kinder_teacher'), text: '학부모가 "우리 애만 미워한다"며 교장실에 쳐들어왔다. 아동학대 신고까지 하겠다고 한다.', choices: [
    { label: '기록을 보여주며 대응한다', mark: { honest: 1 }, text: '', roll: ['int', 50, [{ mor: 2 }, '무혐의. 교육청이 {n} 편을 들어줬다.'], [{ hap: -12, hp: -3 }, '조사만 석 달. 교단에 선 게 후회된다.']] },
    { label: '교권보호위원회를 연다', text: '학교가 나섰다. 학부모가 사과했다.', eff: { hap: 3 } },
  ] },
  { id: 'wk_teacher_student', title: '그 아이', age: W, w: 1, cond: J('teacher', 'kinder_teacher', 'tutor', 'librarian', 'social_worker'), text: '{n}의 반에 매일 굶고 오는 아이가 있다. 집에 무슨 일이 있는 것 같다.', choices: [
    { label: '직접 가정 방문', mark: { kind: 2 }, cost: 30, text: '아동보호기관과 연결해 아이를 도왔다. 20년 뒤 그 아이가 교사가 되어 찾아왔다.', eff: { mor: 5, fame: 1 } },
    { label: '상담교사에게 넘긴다', text: '절차대로 처리됐다.', eff: {} },
  ] },
  { id: 'wk_tutor_rival', title: '학원가 전쟁', age: W, w: 0.8, cond: J('tutor'), text: '길 건너 대형 학원이 {n}의 스타 강사 자리를 노리고 수강생을 빼간다.', choices: [
    { label: '무료 특강으로 맞선다', mark: { network: 1 }, text: '', roll: ['cha', 55, [{ promo: 1, cash: 2000 }, '특강이 대박. 수강생이 두 배.'], [{ cash: -500 }, '자리만 채웠다.']] },
    { label: '인강 플랫폼과 계약한다', mark: { risk: 1 }, text: '', roll: ['luck', 50, [{ cash: 5000, fame: 2 }, '전국구 인강 스타가 됐다.'], [{ hap: -4 }, '조회수가 안 나왔다.']] },
  ] },
  // ───────── 서비스 ─────────
  { id: 'wk_chef_critic', title: '미식가의 방문', age: W, w: 1, cond: J('chef', 'restaurant'), text: '예약 명단에 익명 미식 평론가로 보이는 손님이 있다. 오늘 {n}의 요리가 평가받는다.', choices: [
    { label: '시그니처 코스로 정면 승부', mark: { art: 1 }, text: '', roll: ['cha', 55, [{ promo: 1, fame: 3 }, '"올해의 발견" 리뷰가 실렸다. 예약이 꽉 찼다.'], [{ hap: -6 }, '"평범하다"는 한 줄 평.']] },
    { label: '제철 재료로 즉흥 요리', mark: { risk: 1 }, text: '', roll: ['int', 55, [{ fame: 4 }, '"천재적인 즉흥성" — 미식 잡지 표지에 났다.'], [{ hap: -8 }, '소스가 짰다.']] },
  ] },
  { id: 'wk_service_gapjil', title: '진상 손님', age: W, w: 1, cond: J(...SERVICE, 'barista', ...SHOP), text: '손님이 {n}에게 무릎을 꿇으라며 소리친다. 영상을 찍어 올리겠다고 한다.', choices: [
    { label: '정중하되 단호하게', mark: { honest: 1 }, text: '', roll: ['cha', 50, [{ fame: 1, hap: 3 }, '다른 손님이 찍은 영상이 퍼져 오히려 응원을 받았다.'], [{ hap: -8 }, '악성 리뷰 폭탄을 맞았다.']] },
    { label: '사과하고 넘긴다', text: '참았다. 퇴근길에 한참 걸었다.', eff: { hap: -6 } },
  ] },
  { id: 'wk_flight', title: '기내 응급 상황', age: [22, 55], w: 0.8, cond: J('flight_attendant', 'pilot'), text: '태평양 상공, 승객이 쓰러졌다. 의사 승객은 없다. 가장 가까운 공항까지 3시간.', choices: [
    { label: '심폐소생술을 한다', mark: { kind: 1 }, text: '', roll: ['int', 45, [{ fame: 3, mor: 3 }, '승객이 숨을 되찾았다. 항공사 회장상을 받았다.'], [{ hap: -8 }, '최선을 다했다. 결과는 하늘의 뜻이었다.']] },
    { label: '회항을 요청한다', text: '가까운 섬 공항에 비상 착륙. 승객은 무사했다.', eff: {} },
  ] },
  { id: 'wk_hotel_vip', title: 'VIP 투숙', age: W, w: 0.8, cond: J('hotelier', 'tour_guide', 'wedding_planner'), text: '해외 국빈이 투숙한다. {n}이(가) 전담을 맡았다. 요구 사항이 까다롭기로 유명하다.', choices: [
    { label: '완벽한 의전', mark: { network: 1 }, text: '', roll: ['cha', 55, [{ promo: 1, fame: 1 }, '국빈이 떠나며 손편지를 남겼다. 총지배인 후보가 됐다.'], [{ hap: -6 }, '작은 실수 하나가 대사관 항의로 이어졌다.']] },
    { label: '매뉴얼대로', text: '무난했다.', eff: {} },
  ] },
  { id: 'wk_beauty_shop', title: '내 가게', age: [25, 55], w: 0.8, cond: J('hairdresser', 'nail_artist', 'barista', 'pet_groomer'), text: '단골이 늘어난 {n}에게 "이제 네 가게 차려"라는 말이 나온다. 보증금 5천만 원.', choices: [
    { label: '차린다', cost: 5000, mark: { risk: 1 }, text: '', roll: ['cha', 50, [{ promo: 1, cash: 4000, hap: 8 }, '인스타 맛집(?)이 됐다. 예약이 한 달 밀렸다.'], [{ hap: -8 }, '상권이 안 좋았다. 월세 내기 빠듯하다.']] },
    { label: '아직은 이르다', text: '실력을 더 쌓기로 했다.', eff: {} },
  ] },
  // ───────── 기술·생산 ─────────
  { id: 'wk_trade_accident', title: '현장 안전', age: W, w: 1, cond: J(...TRADE), text: '공기에 쫓긴 현장 소장이 안전 장비 없이 작업하라고 한다. {n}의 동료가 불안해한다.', choices: [
    { label: '작업을 거부한다', mark: { honest: 1 }, text: '', roll: ['mor', 45, [{ mor: 3, fame: 1 }, '그날 옆 현장에서 사고가 났다. 소장이 {n}에게 고맙다고 했다.'], [{ hap: -5, cash: -200 }, '하루 일당이 날아갔다.']] },
    { label: '조심해서 한다', mark: { risk: 1 }, text: '', roll: ['luck', 70, [{ cash: 200 }, '무사히 끝났다. 공기도 맞췄다.'], [{ hp: -15, hap: -10 }, '추락 사고. 산재 처리로 반년을 쉬었다.']] },
  ] },
  { id: 'wk_trade_master', title: '기능 경기', age: [20, 45], w: 0.8, cond: J(...TRADE), text: '{n}에게 전국 기능경기대회 출전 권유가 왔다. 입상하면 국가대표로 국제대회에 나간다.', choices: [
    { label: '출전한다', mark: { study: 1 }, text: '', roll: ['str', 55, [{ promo: 1, fame: 2, cash: 1000 }, '금메달! 회사가 특진을 시켜 줬다.'], [{ hap: -3 }, '입상은 못 했지만 실력이 늘었다.']] },
    { label: '현장 일에 집중', text: '일당이 더 중요하다.', eff: { cash: 300 } },
  ] },
  { id: 'wk_trade_own', title: '독립', age: [30, 55], w: 0.8, cond: Jl(2, 'electrician', 'plumber', 'carpenter', 'mechanic', 'welder'), text: '거래처 사장님이 {n}에게 "직접 사업자 내면 일감 몰아줄게"라고 한다.', choices: [
    { label: '사업자를 낸다', mark: { risk: 1 }, text: '', roll: ['cha', 45, [{ promo: 1, cash: 3000 }, '일감이 끊이지 않는다. 직원을 둘 뒀다.'], [{ cash: -1000 }, '미수금이 쌓였다.']] },
    { label: '월급쟁이가 편하다', text: '4대 보험이 최고다.', eff: {} },
  ] },
  // ───────── 운송 ─────────
  { id: 'wk_drive_night', title: '과로', age: W, w: 1, cond: J(...DRIVE), text: '물량이 폭주했다. {n}이(가) 하루 16시간째 운전 중이다. 눈꺼풀이 무겁다.', choices: [
    { label: '갓길에 세우고 잔다', text: '30분 쪽잠. 늦었지만 무사히 돌아왔다.', eff: { hp: 1, cash: -50 } },
    { label: '커피로 버틴다', mark: { risk: 1 }, text: '', roll: ['hp', 50, [{ cash: 150 }, '무사히 끝냈다. 이번 달 수입이 쏠쏠하다.'], [{ hp: -12, cash: -500 }, '졸음운전 사고. 크게 다치진 않았지만 차가 망가졌다.']] },
  ] },
  { id: 'wk_taxi_passenger', title: '특별한 손님', age: W, w: 0.8, cond: J('taxi', 'bus_driver', 'delivery_rider'), text: '뒷좌석 손님이 휴대폰을 두고 내렸다. 사업가처럼 보였다.', choices: [
    { label: '경찰서에 맡기러 간다', mark: { honest: 1 }, text: '', roll: ['luck', 30, [{ cash: 1000, fame: 1 }, '대기업 회장이었다! 사례금과 함께 "기사님 같은 분이 필요하다"며 회사 운전직을 제안했다.'], [{ mor: 2 }, '주인이 고맙다는 문자를 보냈다.']] },
    { label: '다음 손님을 태운다', text: '휴대폰은 다음 손님이 챙겼다.', eff: { mor: -1 } },
  ] },
  { id: 'wk_pilot', title: '돌풍 속 착륙', age: [25, 62], w: 1, cond: J('pilot', 'train_driver', 'navigator'), text: '기상 악화. {n}이(가) 모는 기체(열차·선박)가 거센 돌풍 속에 있다. 승객 300명.', choices: [
    { label: '침착하게 정면 돌파', mark: { study: 1 }, text: '', roll: ['int', 55, [{ promo: 1, fame: 3 }, '완벽한 조종. 승객들이 박수를 쳤다. 영상이 퍼졌다.'], [{ hap: -6 }, '무사했지만 경위서를 썼다.']] },
    { label: '회항·대기', text: '안전이 최우선. 승객 불만은 컸지만 모두 무사하다.', eff: {} },
  ] },
  // ───────── 미디어·창작 ─────────
  { id: 'wk_journalist', title: '특종', age: [23, 65], w: 1, cond: J('journalist', 'pd'), text: '{n}에게 제보가 왔다. 대기업의 산재 은폐 문건. 광고주라 데스크가 난색이다.', choices: [
    { label: '보도를 밀어붙인다', mark: { honest: 2 }, text: '', roll: ['int', 55, [{ fame: 4, promo: 1 }, '특종! 국회 청문회가 열렸다. 기자상을 받았다.'], [{ promo: -1, hap: -8 }, '기사가 킬됐다. 지방 주재로 밀려났다.']] },
    { label: '더 취재하며 기다린다', text: '6개월 뒤 다른 언론사가 먼저 터뜨렸다.', eff: { hap: -4 } },
  ] },
  { id: 'wk_pd_ratings', title: '시청률 전쟁', age: [25, 60], w: 0.8, cond: J('pd', 'announcer'), text: '{n}의 프로그램이 동시간대 꼴찌. 폐지 위기. 자극적인 코너를 넣자는 의견이 나온다.', choices: [
    { label: '자극적으로 간다', mark: { risk: 1 }, text: '', roll: ['luck', 55, [{ promo: 1, cash: 1000 }, '시청률 두 배! 대신 방심위 경고를 받았다.'], [{ fame: -3 }, '논란만 커지고 폐지됐다.']] },
    { label: '진정성으로 승부', mark: { honest: 1 }, text: '', roll: ['cha', 55, [{ fame: 3, promo: 1 }, '입소문으로 시즌2 확정!'], [{ hap: -6 }, '폐지. 그래도 부끄럽지 않다.']] },
  ] },
  { id: 'wk_creator_scandal', title: '악플', age: [18, 70], w: 1, cond: J(...CREATOR), text: '{n}의 작품(영상)에 악플이 쏟아진다. 근거 없는 루머까지 퍼진다.', choices: [
    { label: '법적 대응한다', cost: 500, mark: { honest: 1 }, text: '', roll: ['luck', 65, [{ hap: 6, fame: 1 }, '악플러들이 합의금을 냈다. 루머가 사라졌다.'], [{ hap: -5 }, '대부분 해외 계정이라 잡지 못했다.']] },
    { label: '작품으로 증명한다', mark: { art: 1 }, text: '', roll: ['cha', 55, [{ promo: 1, fame: 2 }, '신작이 대박. 악플이 응원으로 바뀌었다.'], [{ hap: -8 }, '슬럼프가 왔다.']] },
    { label: '잠시 활동을 쉰다', text: '1년 쉬었다. 돌아오니 사람들이 반겨 줬다.', eff: { hap: 8, cash: -500 } },
  ] },
  { id: 'wk_creator_contract', title: '노예 계약', age: [18, 45], w: 0.8, cond: J('entertainer', 'model', 'musician', 'actor', 'youtuber'), text: '대형 기획사가 {n}에게 7년 전속 계약을 제안한다. 수익 배분 9:1. 대신 전폭적인 지원.', choices: [
    { label: '계약한다', mark: { risk: 1 }, text: '', roll: ['luck', 50, [{ promo: 1, fame: 3 }, '기획사 파워로 단숨에 스타덤!'], [{ hap: -10 }, '7년간 기획사 배만 불렸다.']] },
    { label: '독립 활동', mark: { honest: 1 }, text: '', roll: ['cha', 55, [{ cash: 2000 }, '느리지만 수익이 온전히 내 것이다.'], [{ hap: -4 }, '홍보가 부족했다.']] },
  ] },
  { id: 'wk_writer_deadline', title: '마감', age: [18, 75], w: 0.8, cond: J('writer', 'novelist', 'painter', 'photographer', 'designer', 'voice_actor'), text: '마감 이틀 전. {n}의 원고(작업)가 절반도 안 됐다. 영감이 오지 않는다.', choices: [
    { label: '밤을 새운다', text: '', roll: ['int', 50, [{ promo: 1 }, '마감 직전 완성. 인생작이 나왔다.'], [{ hp: -4, hap: -6 }, '급하게 낸 작품이 혹평을 받았다.']] },
    { label: '연재를 한 주 쉰다', text: '독자들이 "작가님 건강이 먼저"라고 댓글을 달았다.', eff: { hap: 4 } },
  ] },
  { id: 'wk_announcer', title: '생방송 사고', age: [22, 60], w: 0.8, cond: J('announcer', 'journalist', 'entertainer'), text: '생방송 중 원고가 날아갔다. 카메라 빨간불이 켜져 있다. 10초가 영원 같다.', choices: [
    { label: '애드리브로 넘긴다', text: '', roll: ['cha', 55, [{ fame: 3, promo: 1 }, '침착한 애드리브가 "레전드 방송"으로 퍼졌다.'], [{ fame: -2, hap: -8 }, '"방송 사고" 짤이 돌았다.']] },
    { label: '솔직하게 사과한다', text: '"잠시 원고를 확인하겠습니다." 오히려 호감을 샀다.', eff: { fame: 1 } },
  ] },
  // ───────── 스포츠 ─────────
  { id: 'wk_athlete_injury', title: '부상', age: [18, 38], w: 1, cond: J('athlete', 'trainer'), text: '결승을 앞두고 {n}의 무릎에 통증이 온다. 진통제를 맞으면 뛸 수 있다.', choices: [
    { label: '진통제 맞고 뛴다', mark: { risk: 1 }, text: '', roll: ['str', 55, [{ promo: 1, fame: 3 }, '우승! 눈물의 트로피.'], [{ hp: -15, promo: -1 }, '인대가 끊어졌다. 1년 재활.']] },
    { label: '다음을 기약한다', mark: { thrift: 1 }, text: '벤치에서 팀을 응원했다. 몸을 지켰다.', eff: { hp: 3 } },
  ] },
  { id: 'wk_athlete_offer', title: '해외 진출', age: [20, 32], w: 0.7, cond: Jl(2, 'athlete'), text: '{n}에게 유럽·미국 리그에서 영입 제안이 왔다. 연봉은 적지만 꿈의 무대다.', choices: [
    { label: '도전한다', mark: { risk: 2 }, text: '', roll: ['str', 60, [{ promo: 1, fame: 5, cash: 10000 }, '주전 확보! 유니폼이 한국에서 불티나게 팔린다.'], [{ hap: -6 }, '벤치만 지키다 1년 만에 돌아왔다.']] },
    { label: '국내 최고 대우로 남는다', text: 'FA 대박. 연봉 두 배.', eff: { cash: 5000 } },
  ] },
  { id: 'wk_chess_match', title: '명인과의 사투', age: [18, 60], w: 1, cond: J('chess_player'), text: '국제 대회에서 세계적인 체스 마스터와 마주쳤다. 5시간째 수가 이어지고 있다.', choices: [
    { label: '승부수를 던진다', mark: { risk: 2 }, text: '', roll: ['int', 60, [{ promo: 1, fame: 4, cash: 3000 }, '환상적인 룩 희생으로 체크메이트! 대회 최고의 명국으로 선정됐다.'], [{ hap: -5 }, '마지막 수순 착각으로 기권패했다.']] },
    { label: '안전하게 무승부로 끈다', text: '상대와 무승부에 합의했다. 레이팅 방어 성공.', eff: { fame: 1 } },
  ] },
  { id: 'wk_chess_simul', title: '다면기 행사', age: [20, 65], w: 0.8, cond: J('chess_player'), text: '{n}에게 30인 동시 다면기 초청이 왔다. 팬들과 영재 유망주들이 기다리고 있다.', choices: [
    { label: '전승을 노린다', mark: { fame: 2 }, text: '', roll: ['int', 62, [{ fame: 3, cash: 2000, hap: 5 }, '30전 30승 전승! 언론에 대서특필되었다.'], [{ hp: -5 }, '한 판을 패배하며 씁쓸하게 마쳤다.']] },
    { label: '친선과 지도에 집중한다', text: '아이들에게 친절히 조언하며 체스 보급에 힘썼다.', eff: { mor: 3, hap: 4 } },
  ] },
  { id: 'wk_coach', title: '제자', age: [30, 70], w: 0.8, cond: J('coach', 'trainer', 'gamer'), text: '{n}이(가) 가르치는 선수 중 재능은 있는데 가정 형편이 어려운 아이가 있다. 그만두려 한다.', choices: [
    { label: '후원자를 찾아준다', mark: { kind: 2 }, text: '', roll: ['cha', 45, [{ fame: 2, mor: 3 }, '10년 뒤 그 아이가 국가대표가 됐다. 인터뷰에서 {n}의 이름을 불렀다.'], [{ mor: 2 }, '후원자는 못 찾았지만 아이는 끝까지 운동을 했다.']] },
    { label: '현실을 받아들인다', text: '아이는 떠났다.', eff: { hap: -3 } },
  ] },
  // ───────── 장사·사업 ─────────
  { id: 'wk_shop_delivery', title: '배달앱 수수료', age: W, w: 1, cond: J(...SHOP), text: '배달앱 수수료가 또 올랐다. {n}의 가게는 팔수록 손해다.', choices: [
    { label: '자체 배달·포장 할인', mark: { thrift: 1 }, text: '', roll: ['cha', 50, [{ cash: 800 }, '단골들이 직접 주문한다. 숨통이 트였다.'], [{ cash: -500 }, '주문이 절반으로 줄었다.']] },
    { label: '가격을 올린다', text: '', roll: ['luck', 50, [{ cash: 300 }, '손님들이 이해해 줬다.'], [{ cash: -600 }, '"비싸졌네" 리뷰가 달렸다.']] },
  ] },
  { id: 'wk_shop_rent', title: '건물주의 통보', age: W, w: 0.8, cond: J(...SHOP, 'hairdresser'), text: '상가 건물주가 월세를 50% 올리겠다고 통보했다. 동네가 뜨면서 생긴 일이다.', choices: [
    { label: '협상한다', text: '', roll: ['cha', 50, [{}, '20% 인상으로 합의했다.'], [{ cash: -1500 }, '결국 50% 올랐다.']] },
    { label: '다른 동네로 옮긴다', cost: 1000, text: '단골 일부를 잃었지만 새 동네에서 다시 시작했다.', eff: { hap: -3 } },
    { label: '대출받아 건물을 산다', mark: { risk: 2 }, text: '', roll: ['luck', 40, [{ cash: 5000, promo: 1 }, '무리해서 샀는데 동네가 더 떴다. 이젠 내가 건물주다.'], [{ cash: -3000 }, '대출 이자에 허리가 휜다.']] },
  ] },
  { id: 'wk_founder_invest', title: '투자 유치', age: [25, 65], w: 1, cond: J('founder', 'online_shop'), text: 'VC가 {n}의 회사에 50억 투자를 제안했다. 대신 지분 40%와 이사회 자리를 원한다.', choices: [
    { label: '투자를 받는다', mark: { risk: 1 }, text: '', roll: ['int', 55, [{ promo: 1, fame: 2 }, '공격적 확장 성공! 기업 가치가 다섯 배.'], [{ hap: -8 }, '투자자와 갈등이 생겼다.']] },
    { label: '자력으로 성장한다', mark: { thrift: 1 }, text: '느리지만 경영권은 지켰다.', eff: { hap: 2 } },
  ] },
  { id: 'wk_founder_crisis', title: '월급날', age: [25, 65], w: 0.8, cond: J('founder'), text: '다음 주가 월급날인데 통장에 돈이 없다. 직원 30명. {n}의 개인 재산을 넣어야 하나.', choices: [
    { label: '집을 담보로 넣는다', mark: { risk: 2, family: -1 }, text: '', roll: ['luck', 55, [{ promo: 1, hap: 6 }, '석 달 버텼더니 대형 계약이 터졌다. 회사가 살았다.'], [{ cash: -10000, hap: -12 }, '결국 문을 닫았다. 빚만 남았다.']] },
    { label: '구조조정한다', text: '직원 절반을 내보냈다. 회사는 살았지만 마음이 무겁다.', eff: { mor: -2, hap: -6 } },
  ] },
  // ───────── 농어업 ─────────
  { id: 'wk_farm_weather', title: '냉해', age: W, w: 1, cond: J(...FARM), text: '봄철 이상 한파 예보. {n}의 농장(어장) 한 해 농사가 걸렸다.', choices: [
    { label: '밤새 방상팬·불을 피운다', mark: { thrift: 1 }, text: '', roll: ['hp', 45, [{ cash: 1000 }, '피해를 막았다. 옆 농가들이 부러워한다.'], [{ cash: -1500, hp: -3 }, '절반이 얼었다.']] },
    { label: '재해보험에 기댄다', text: '', roll: ['luck', 60, [{ cash: 500 }, '보험금이 나왔다.'], [{ cash: -1000 }, '보험 약관에 걸려 보상이 적었다.']] },
  ] },
  { id: 'wk_farm_brand', title: '직거래', age: W, w: 0.8, cond: J(...FARM), text: '{n}의 농산물을 유명 셰프가 맛보고 직거래를 제안했다. 대신 품질 기준이 까다롭다.', choices: [
    { label: '받아들인다', mark: { study: 1 }, text: '', roll: ['int', 50, [{ promo: 1, cash: 2000, fame: 1 }, '고급 레스토랑 납품! 브랜드 농가가 됐다.'], [{ cash: -500 }, '기준을 못 맞춰 계약이 끊겼다.']] },
    { label: '농협 수매로 충분', text: '안정적이다.', eff: {} },
  ] },
  // ───────── 기타 ─────────
  { id: 'wk_social', title: '위기 가정', age: W, w: 1, cond: J('social_worker', 'clergy'), text: '{n}이(가) 맡은 가정에서 고독사 위험 신호가 보인다. 규정상 주 1회 방문이 한계다.', choices: [
    { label: '퇴근 후에도 들른다', mark: { kind: 2 }, text: '할아버지가 다시 웃기 시작했다. 복지관 우수 사례로 소개됐다.', eff: { mor: 4, fame: 1, hap: -2 } },
    { label: '규정대로 한다', text: '다른 가정도 많다.', eff: {} },
  ] },
  { id: 'wk_clergy', title: '헌금 논란', age: [30, 80], w: 0.8, cond: J('clergy'), text: '{n}의 교회(절)에 거액의 헌금이 들어왔다. 장로들은 새 건물을 짓자고 한다.', choices: [
    { label: '어려운 이웃에게 쓴다', mark: { kind: 2 }, text: '무료 급식소를 열었다. 신도가 오히려 늘었다.', eff: { mor: 4, fame: 3 } },
    { label: '성전을 크게 짓는다', text: '', roll: ['luck', 50, [{ promo: 1 }, '대형 교회가 됐다.'], [{ fame: -4 }, '"교회 세습·건축 논란" 기사가 났다.']] },
  ] },

  // ───────── 보강: 이야기가 얇던 직업들 ─────────
  { id: 'wk_coast_rescue', title: '해상 조난', age: [22, 60], w: 1, cond: J('coast_guard', 'navigator', 'fisher'), text: '태풍 속에서 어선이 조난 신호를 보냈다. 선원 8명. 파도가 5m다.', choices: [
    { label: '구조정을 띄운다', mark: { kind: 2 }, text: '', roll: ['str', 55, [{ fame: 3, promo: 1 }, '8명 전원 구조! 해양경찰청장 표창.'], [{ hp: -8 }, '구조는 했지만 동료가 다쳤다.']] },
    { label: '헬기 지원을 기다린다', text: '2시간 뒤 헬기가 도착했다. 모두 무사했다.', eff: {} },
  ] },
  { id: 'wk_dip_hostage', title: '재외국민 피랍', age: [26, 65], w: 1, cond: J('diplomat'), text: '분쟁 지역에서 한국인 봉사단 5명이 무장 세력에 납치됐다. 현장 협상 책임자로 {n}이(가) 급파된다.', choices: [
    { label: '현지 부족장을 통해 협상', mark: { network: 2 }, text: '', roll: ['cha', 58, [{ fame: 5, promo: 1 }, '40일 만에 전원 무사 귀환! 공항에서 가족들이 {n}을(를) 안았다.'], [{ hap: -12 }, '협상이 길어졌다. 결국 다른 채널로 풀려났다.']] },
    { label: '본부 지침대로 원칙 협상', text: '', roll: ['int', 55, [{ fame: 2 }, '원칙을 지키며 석방을 이끌어냈다.'], [{ hap: -6 }, '진척이 없어 교체됐다.']] },
  ] },
  { id: 'wk_dip_treaty', title: '통상 협상', age: [28, 65], w: 1, cond: J('diplomat', 'trader', 'customs_broker'), text: '반도체 관세 협상 마지막 날. 상대국이 무리한 조건을 내민다. {n}이(가) 테이블에 앉았다.', choices: [
    { label: '결렬도 불사한다', mark: { risk: 1 }, text: '', roll: ['int', 58, [{ promo: 1, fame: 3 }, '상대가 먼저 물러섰다! "협상의 달인" 기사.'], [{ hap: -8, promo: -1 }, '결렬. 책임론이 나왔다.']] },
    { label: '작은 것을 내주고 큰 것을', mark: { network: 1 }, text: '', roll: ['cha', 52, [{ promo: 1 }, '원하던 핵심을 지켰다.'], [{ hap: -4 }, '내준 것만 기억됐다.']] },
  ] },
  { id: 'wk_law_revolving', title: '전관예우', age: [35, 70], w: 1, cond: J('judge', 'prosecutor', 'lawyer'), text: '대형 로펌이 {n}에게 연봉 20억을 제시한다. "전관" 대우. 그 대신 친정(법원·검찰)과의 인맥이 필요하다.', choices: [
    { label: '로펌으로 간다', mark: { cheat: 1 }, text: '연봉이 열 배가 됐다. 동료들의 시선은 싸늘하다.', eff: { cash: 15000, fame: -2, flag: 'laid_off', later: [1, 1, 1, 'first_job'] } },
    { label: '공익 변호로 간다', mark: { honest: 2 }, text: '"전관예우를 거부한 법조인" — 존경을 받았다.', eff: { mor: 5, fame: 3 } },
    { label: '지금 자리를 지킨다', text: '제안을 거절했다.', eff: { mor: 2 } },
  ] },
  { id: 'wk_lab_error', title: '검사 오류', age: W, w: 1, cond: J('pharmacist', 'radiographer', 'clinical', 'nurse', 'pt'), text: '{n}이(가) 어제 처리한 검사(조제)에 실수가 있었던 것 같다. 아직 아무도 모른다.', choices: [
    { label: '바로 보고한다', mark: { honest: 2 }, text: '환자에게 연락해 바로잡았다. 큰일 날 뻔했다. 병원은 오히려 {n}을(를) 믿게 됐다.', eff: { mor: 4 } },
    { label: '조용히 다시 확인', text: '', roll: ['luck', 60, [{}, '다행히 결과엔 문제가 없었다.'], [{ fame: -3, hap: -10 }, '환자 상태가 나빠졌다. 징계를 받았다.']] },
  ] },
  { id: 'wk_license_firm', title: '대형 법인 vs 개업', age: [28, 60], w: 1, cond: J(...LICENSE, 'realtor', 'lawyer'), text: '대형 법인(펌)이 {n}을(를) 파트너로 부른다. 동시에 고향 선배는 같이 개업하자고 한다.', choices: [
    { label: '대형 법인 파트너', mark: { network: 1 }, text: '', roll: ['int', 50, [{ promo: 1, cash: 3000 }, '파트너 승진! 연봉이 뛰었다.'], [{ hap: -8 }, '실적 압박에 밤낮이 없다.']] },
    { label: '개업한다', mark: { risk: 1 }, text: '', roll: ['cha', 50, [{ cash: 5000, hap: 6 }, '고향 사람들이 다 찾아온다. 동네 1등 사무소.'], [{ cash: -2000 }, '첫 해는 적자였다.']] },
  ] },
  { id: 'wk_library', title: '작은 도서관', age: W, w: 1, cond: J('librarian', 'teacher', 'social_worker'), text: '구청이 {n}의 작은 도서관 예산을 삭감하려 한다. 방과 후 아이들이 갈 곳이 없어진다.', choices: [
    { label: '주민 서명운동', mark: { network: 1, kind: 1 }, text: '', roll: ['cha', 45, [{ fame: 2, mor: 3 }, '서명 3천 명! 예산이 되살아났다.'], [{ hap: -5 }, '결국 줄었다. 자원봉사로 버틴다.']] },
    { label: '책 기부 캠페인', text: '동네 사람들이 책 2천 권을 보내 줬다.', eff: { hap: 5, mor: 2 } },
  ] },
  { id: 'wk_logistics_strike', title: '파업', age: W, w: 1, cond: J('trucker', 'train_driver', 'navigator', 'bus_driver', 'courier'), text: '노조가 총파업을 결의했다. 안전운임제·인력 충원 요구. {n}도 결정을 해야 한다.', choices: [
    { label: '파업에 참여한다', mark: { network: 1 }, text: '', roll: ['luck', 50, [{ cash: 500, hap: 4 }, '요구 일부가 받아들여졌다. 임금이 올랐다.'], [{ cash: -800, hap: -4 }, '무노동 무임금. 성과 없이 끝났다.']] },
    { label: '일을 계속한다', text: '돈은 벌었지만 동료들과 서먹해졌다.', eff: { cash: 400, hap: -3 } },
  ] },
  { id: 'wk_rail_night', title: '선로 위 그림자', age: W, w: 1, cond: J('train_driver', 'navigator', 'pilot'), text: '야간 운행 중 선로(항로) 앞에 무언가가 보인다. 급제동하면 승객이 다칠 수 있다.', choices: [
    { label: '비상 제동', mark: { honest: 1 }, text: '', roll: ['int', 45, [{ fame: 2 }, '선로에 쓰러진 사람이었다. 목숨을 구했다.'], [{ hap: -6 }, '승객 몇 명이 넘어져 다쳤다. 그래도 옳은 판단이었다.']] },
    { label: '속도를 줄이며 경적', text: '멧돼지였다. 무사히 지나갔다.', eff: {} },
  ] },
  { id: 'wk_design_client', title: '수정 지옥', age: W, w: 1, cond: J('designer', 'photographer', 'painter', 'architect'), text: '클라이언트가 {n}에게 "처음 버전으로 돌아가 주세요. 로고는 더 크게, 그런데 작게" — 32번째 수정 요청.', choices: [
    { label: '끝까지 맞춰준다', text: '대금은 받았다. 포트폴리오에는 안 넣기로 했다.', eff: { cash: 500, hap: -5 } },
    { label: '계약서를 들이민다', mark: { honest: 1 }, text: '', roll: ['cha', 50, [{ cash: 800, hap: 3 }, '추가 비용을 받아냈다.'], [{ hap: -4 }, '클라이언트가 떠났다.']] },
    { label: '공모전에 개인 작업을 낸다', mark: { art: 1 }, text: '', roll: ['cha', 60, [{ fame: 3, promo: 1 }, '국제 디자인 어워드 수상! 클라이언트가 줄을 선다.'], [{ hap: -2 }, '입선에 그쳤다.']] },
  ] },
  { id: 'wk_esports_fix', title: '승부 조작 제의', age: [17, 50], w: 1, cond: J('gamer', 'coach', 'athlete'), text: '불법 도박 브로커가 {n}에게 접근했다. "한 경기만 져 주면 5천만 원."', choices: [
    { label: '거절하고 신고한다', mark: { honest: 2 }, text: '브로커 조직이 검거됐다. 협회가 공로상을 줬다.', eff: { mor: 5, fame: 2 } },
    { label: '돈을 받는다', mark: { cheat: 2 }, text: '', roll: ['luck', 30, [{ cash: 5000, mor: -8 }, '아무도 모른다. 잠이 오지 않는다.'], [{ fame: -10, flag: 'laid_off', hap: -25 }, '영구 제명. 가문 이름에 먹칠을 했다.']] },
  ] },
  // ───────── 모든 직장인 ─────────
  { id: 'wk_any_raise', title: '연봉 협상', age: [24, 60], w: 0.5, cond: (_s, p) => !['none', 'parttime', 'pension', 'politician', 'president', 'minister', 'mayor'].includes(p.job) && !p.flags.includes('student'), text: '연봉 협상 시즌. 회사는 동결을 통보했다. {n}은(는) 올해 성과가 꽤 좋았다.', choices: [
    { label: '당당히 인상을 요구한다', mark: { risk: 1 }, text: '', roll: ['cha', 50, [{ cash: 800, hap: 4 }, '10% 인상! 말하길 잘했다.'], [{ hap: -4 }, '"다른 데 알아보든가." 싸늘하다.']] },
    { label: '조용히 이직 준비', text: '이력서를 업데이트했다. (행동 탭의 이직 시도)', eff: {} },
    { label: '회사를 믿는다', text: '내년엔 올려 주겠지.', eff: { mor: 1 } },
  ] },
  { id: 'wk_any_burnout', title: '번아웃', age: [25, 60], w: 0.5, cond: (_s, p) => !['none', 'parttime', 'pension'].includes(p.job) && !p.flags.includes('student') && p.happiness < 45, text: '{n}이(가) 아침에 일어나지 못한다. 출근 생각만 해도 가슴이 답답하다.', choices: [
    { label: '한 달 휴직한다', mark: { warmth: 1 }, text: '제주도 한 달 살기. 다시 웃을 수 있게 됐다.', eff: { hap: 12, cash: -500 } },
    { label: '참고 다닌다', text: '', roll: ['hp', 50, [{ hap: 2 }, '겨우 버텼다.'], [{ hp: -6, hap: -6 }, '결국 쓰러졌다. 입원.']] },
  ] },
  // ───────── 미래 직업 (2027년~) ─────────
  { id: 'wk_ait_bias', title: 'AI가 편을 든다', age: W, w: 1, cond: J('ai_trainer'), text: '{n}이(가) 튜닝한 상담 AI가 특정 지역 사람에게만 대출을 거절한다는 민원이 터졌다.', choices: [
    { label: '데이터를 처음부터 다시 본다', mark: { study: 1 }, text: '', roll: ['int', 55, [{ promo: 1, fame: 1 }, '학습 데이터의 편향을 찾아냈다. 업계 사례집에 실렸다.'], [{ hap: -5, hp: -2 }, '석 달을 매달렸지만 원인을 못 찾았다.']] },
    { label: '필터로 급히 막는다', text: '민원은 잦아들었다. 찝찝함은 남았다.', eff: { hap: -2 } },
  ] },
  { id: 'wk_ait_jailbreak', title: '탈옥 대회', age: W, w: 0.8, cond: J('ai_trainer'), text: '해커들이 {n}네 AI를 속여 금지된 답을 받아 내는 "탈옥 대회"를 열었다. 상금은 회사가 건다.', choices: [
    { label: '밤새 방어 규칙을 짠다', text: '', roll: ['int', 50, [{ promo: 1, cash: 600 }, '끝까지 뚫리지 않았다. 보너스가 나왔다.'], [{ hap: -6 }, '12분 만에 뚫렸다. 뉴스에 캡처가 돌았다.']] },
    { label: '해커들을 채용하자고 건의한다', mark: { network: 1 }, text: '"적을 친구로." 우승자가 팀에 합류했다.', eff: { cha: 1 } },
  ] },
  { id: 'wk_robo_recall', title: '관절 리콜', age: W, w: 1, cond: J('robot_tech'), text: '가정용 로봇 한 모델의 무릎 관절이 갑자기 풀린다. 리콜 대상 3만 대, {n}의 팀이 맡았다.', choices: [
    { label: '주말 없이 돈다', text: '석 달 동안 3천 가구를 돌았다. 어르신들이 커피를 타 주셨다.', eff: { cash: 700, hp: -3, str: 1 } },
    { label: '원인 부품을 파고든다', mark: { study: 1 }, text: '', roll: ['int', 50, [{ promo: 1 }, '윤활유 규격이 문제였다. 본사가 설계를 바꿨다.'], [{ hap: -3 }, '원인을 못 찾고 교체만 반복했다.']] },
  ] },
  { id: 'wk_robo_grandma', title: '로봇을 고쳐 주세요', age: W, w: 0.8, cond: J('robot_tech'), text: '홀로 사는 할머니가 20년 된 구형 로봇을 고쳐 달라신다. 부품은 단종됐다. "영감 떠나고 이 녀석이 말벗이야."', choices: [
    { label: '3D 프린터로 부품을 만든다', text: '로봇이 다시 "할머니, 약 드실 시간이에요" 했다. 할머니가 울었다.', eff: { mor: 2, hap: 6 } },
    { label: '새 모델을 권한다', text: '할머니는 끝내 새 로봇을 사지 않으셨다.', eff: { hap: -2 } },
  ] },
  { id: 'wk_drone_storm', title: '돌풍 경보', age: W, w: 1, cond: J('drone_control'), text: '갑작스러운 돌풍. 도심 상공에 배송 드론 4천 대, 에어택시 30대가 떠 있다. 관제실이 {n}을(를) 바라본다.', choices: [
    { label: '전 기체 즉시 착륙 명령', text: '', roll: ['int', 50, [{ promo: 1, fame: 1 }, '한 대의 사고도 없었다. 관제소장이 박수를 쳤다.'], [{ hap: -6 }, '착륙장이 모자라 드론 수백 대가 공원에 불시착했다.']] },
    { label: '고도를 낮춰 운항 유지', mark: { risk: 1 }, text: '', roll: ['luck', 55, [{ cash: 400 }, '배송 지연 없이 넘겼다.'], [{ hap: -10, promo: -1 }, '드론 두 대가 충돌했다. 청문회에 불려 갔다.']] },
  ] },
  { id: 'wk_drone_night', title: '야간 관제', age: W, w: 0.8, cond: J('drone_control'), text: '새벽 3시 관제실. 화면 속 수천 개의 점이 반딧불 같다. 졸음이 쏟아진다.', choices: [
    { label: 'AI 보조에 맡기고 눈을 붙인다', mark: { risk: 1 }, text: '', roll: ['luck', 60, [{ hap: 3 }, '아무 일 없었다.'], [{ promo: -1, hap: -6 }, '그 사이 경보가 울렸다. 징계를 받았다.']] },
    { label: '커피를 들이켜고 버틴다', text: '아침 교대 때 눈이 빨갰다.', eff: { hp: -2, mor: 1 } },
  ] },
  { id: 'wk_climate_wall', title: '방조제 설계', age: W, w: 1, cond: J('climate_eng'), text: '해수면 상승 대비 방조제 설계를 맡았다. 높이 1m마다 예산이 수천억씩 뛴다. 주민들은 "바다를 막아 달라"고 한다.', choices: [
    { label: '100년 뒤를 보고 높게 짓자고 주장한다', text: '', roll: ['cha', 50, [{ promo: 1, fame: 1 }, '예산이 통과됐다. 손주 세대까지 지킬 벽이다.'], [{ hap: -4 }, '"과잉 설계" 소리를 듣고 밀려났다.']] },
    { label: '예산에 맞춘다', text: '무난하게 통과됐다. 밤마다 파도 소리가 신경 쓰인다.', eff: { hap: -1 } },
  ] },
  { id: 'wk_climate_heat', title: '폭염 도시', age: W, w: 0.8, cond: J('climate_eng'), text: '올여름 도심 기온 43도. {n}의 팀이 만든 "바람길" 설계가 시범 적용된다.', choices: [
    { label: '현장에서 직접 측정한다', text: '땡볕 아래 온도계를 들고 다녔다. 3도가 내려갔다!', eff: { hp: -2, fame: 1, hap: 4 } },
    { label: '시뮬레이션을 믿는다', text: '', roll: ['int', 50, [{ promo: 1 }, '예측이 딱 맞았다.'], [{ hap: -4 }, '실제 바람은 시뮬레이션과 달랐다.']] },
  ] },
  { id: 'wk_vr_crash', title: '가상 도시 정전', age: W, w: 1, cond: J('vr_architect'), text: '{n}이(가) 설계한 가상 도시에 동시 접속자 200만 명. 서버가 버티지 못하고 건물들이 녹아내리기 시작했다.', choices: [
    { label: '구역을 쪼개 긴급 분산', text: '', roll: ['int', 50, [{ promo: 1 }, '20분 만에 복구. "월드 빌더답다"는 말을 들었다.'], [{ hap: -6 }, '결국 전체 점검. 사과문을 썼다.']] },
    { label: '"새 이벤트"라고 공지한다', mark: { risk: 1 }, text: '"녹는 도시 체험"이 오히려 화제가 됐다.', eff: { cha: 1, hap: 3 } },
  ] },
  { id: 'wk_vr_wedding', title: '가상 결혼식', age: W, w: 0.8, cond: J('vr_architect'), text: '해외에 흩어진 가족을 위해 가상 결혼식장을 지어 달라는 의뢰. 신부의 할머니는 60년 전 고향 마을을 원한다.', choices: [
    { label: '옛 사진으로 마을을 복원한다', text: '할머니가 가상 골목을 걸으며 "여기가 우리 집이었어" 하셨다.', eff: { mor: 2, hap: 6 } },
    { label: '화려한 궁전으로 짓는다', text: '멋있었지만 할머니는 조용하셨다.', eff: { cash: 300 } },
  ] },
  { id: 'wk_crm_lonely', title: '로봇이 못 하는 일', age: W, w: 1, cond: J('care_robot_mgr'), text: '돌봄 로봇이 모든 일을 척척 한다. 그런데 한 어르신이 로봇을 밀치며 "사람하고 얘기하고 싶다"고 우신다.', choices: [
    { label: '매일 30분 말벗이 된다', text: '어르신이 {n}의 손을 꼭 잡으셨다. 기록에 남지 않는 일이다.', eff: { mor: 2, hap: 4 } },
    { label: '로봇 대화 모드를 조정한다', text: '', roll: ['int', 45, [{ promo: 1 }, '말투를 돌아가신 아드님처럼 맞췄다. 어르신이 웃으셨다.'], [{ hap: -3 }, '어르신이 더 서글퍼하셨다.']] },
  ] },
  { id: 'wk_crm_fall', title: '낙상 경보', age: W, w: 0.8, cond: J('care_robot_mgr'), text: '새벽, 로봇 두 대가 동시에 낙상 경보를 울렸다. 한 대는 오작동일 가능성이 높다.', choices: [
    { label: '두 곳 다 뛰어간다', text: '한 곳은 진짜였다. 제때 도착했다.', eff: { hp: -2, mor: 1, fame: 1 } },
    { label: '데이터를 보고 한 곳만', mark: { risk: 1 }, text: '', roll: ['int', 55, [{ hap: 2 }, '판단이 맞았다.'], [{ hap: -10, promo: -1 }, '판단이 틀렸다. 어르신이 한참 쓰러져 계셨다.']] },
  ] },
  { id: 'wk_lon_rich', title: 'VIP 대기 명단', age: W, w: 1, cond: J('longevity_doc'), text: '재벌 회장 비서가 찾아왔다. "대기 순서를 앞당겨 주시면 병원에 연구동 하나를 지어 드리겠습니다."', choices: [
    { label: '순서대로 한다', text: '회장은 다른 병원으로 갔다. 대기 명단의 노부부가 편지를 보내왔다.', eff: { mor: 3 } },
    { label: '병원장에게 넘긴다', mark: { risk: 1 }, text: '', roll: ['luck', 50, [{ promo: 1, cash: 2000 }, '연구동이 지어졌다. 아무도 묻지 않았다.'], [{ fame: -2, hap: -8 }, '특혜 의혹 기사가 났다.']] },
  ] },
  { id: 'wk_lon_side', title: '부작용', age: W, w: 0.8, cond: J('longevity_doc'), text: '노화 역전 치료를 받은 환자 몇 명에게서 드문 부작용이 보고됐다. 학회 발표를 앞두고 있다.', choices: [
    { label: '있는 그대로 발표한다', text: '', roll: ['mor', 45, [{ fame: 2, promo: 1 }, '정직함이 신뢰를 얻었다. 치료 기준이 더 안전해졌다.'], [{ hap: -4 }, '주가가 떨어졌다며 재단이 불편해했다.']] },
    { label: '추가 연구 뒤로 미룬다', text: '발표는 순조로웠다. 마음 한편이 무겁다.', eff: { mor: -2 } },
  ] },
  { id: 'wk_aud_judge', title: 'AI 판결 감사', age: W, w: 1, cond: J('ai_auditor'), text: 'AI 보조 판사가 낸 양형 수천 건을 감사한다. 한 사건에서 AI의 판단 근거가 설명되지 않는다.', choices: [
    { label: '끝까지 근거를 요구한다', text: '', roll: ['int', 55, [{ promo: 1, fame: 1 }, '알고리즘 결함을 찾아 판결 200건이 재심에 들어갔다.'], [{ hap: -5 }, '"설명 불가도 결과는 정확하다"는 반박에 밀렸다.']] },
    { label: '결과가 맞으면 통과시킨다', text: '보고서는 깔끔했다.', eff: { mor: -1, cash: 300 } },
  ] },
  { id: 'wk_aud_lobby', title: '로비', age: W, w: 0.8, cond: J('ai_auditor'), text: '감사 대상 빅테크의 임원이 저녁을 사겠단다. "우리 AI, 조금만 너그럽게 봐 주시면…"', choices: [
    { label: '거절하고 보고한다', text: '윤리위원회가 {n}을(를) 표창했다.', eff: { mor: 3, fame: 1 } },
    { label: '밥만 먹는다', mark: { risk: 1 }, text: '', roll: ['luck', 50, [{ cash: 500 }, '별일 없었다.'], [{ promo: -1, fame: -2 }, '사진이 찍혔다. 감사에서 빠졌다.']] },
  ] },
  { id: 'wk_moon_leak', title: '기지 공기 누출', age: W, w: 1, cond: J('space_tech'), text: '달 기지 B동에 미세한 공기 누출 경보. 밖은 영하 170도의 진공이다.', choices: [
    { label: '직접 선외 수리에 나선다', text: '', roll: ['str', 50, [{ promo: 1, fame: 2 }, '2시간 만에 틈을 막았다. 지구 뉴스에 나왔다.'], [{ hp: -12 }, '우주복이 긁혀 저산소증으로 쓰러졌다. 무사히 구조됐다.']] },
    { label: '구역을 봉쇄하고 로봇을 보낸다', text: '시간은 걸렸지만 안전하게 끝났다.', eff: { int: 1 } },
  ] },
  { id: 'wk_moon_home', title: '지구가 뜬다', age: W, w: 0.8, cond: J('space_tech'), text: '6개월째 달 기지. 가족 영상통화는 1.3초씩 늦게 닿는다. 아이 생일인데 지구가 창밖에 푸르게 떠 있다.', choices: [
    { label: '지구를 배경으로 생일 노래를 부른다', text: '아이가 그 영상을 평생 간직했다.', eff: { hap: 6, aff: 5 } },
    { label: '일에 집중한다', text: '임무를 앞당겨 마쳤다. 귀환이 2주 빨라졌다.', eff: { promo: 1, hap: -3 } },
  ] },
  { id: 'wk_bci_hack', title: '칩 해킹', age: W, w: 1, cond: J('bci_surgeon'), text: '{n}이(가) 시술한 환자의 뉴럴 칩이 해킹당했다는 의심 신고. 환자가 "머릿속에 광고가 들린다"고 한다.', choices: [
    { label: '긴급 제거 수술을 한다', text: '', roll: ['int', 55, [{ fame: 1, promo: 1 }, '무사히 제거했다. 보안 기준이 바뀌었다.'], [{ hap: -6 }, '후유증으로 환자가 한동안 말을 더듬었다.']] },
    { label: '보안팀과 원격 패치를 한다', mark: { risk: 1 }, text: '', roll: ['luck', 55, [{ hap: 3 }, '패치로 해결됐다.'], [{ hap: -8 }, '패치가 실패했다. 소송이 걸렸다.']] },
  ] },
  { id: 'wk_bci_walk', title: '다시 걷다', age: W, w: 0.8, cond: J('bci_surgeon'), text: '10년간 누워 있던 청년이 {n}의 수술 뒤 처음으로 일어섰다. 기자들이 몰려왔다.', choices: [
    { label: '재활팀에 공을 돌린다', text: '재활팀이 두고두고 {n}을(를) 존경했다.', eff: { mor: 2, fame: 1 } },
    { label: '인터뷰에 나선다', text: '9시 뉴스에 나왔다. 수술 예약이 3년 치 찼다.', eff: { fame: 2, cash: 1000 } },
  ] },
  { id: 'wk_mem_erase', title: '지워 주세요', age: W, w: 1, cond: J('memory_designer'), text: '의뢰인이 사고로 떠난 가족의 기억을 통째로 지워 달라고 한다. "너무 아파서 살 수가 없어요."', choices: [
    { label: '지우지 않고 모서리만 다듬는다', text: '', roll: ['cha', 50, [{ fame: 1, mor: 2 }, '1년 뒤 의뢰인이 찾아와 고맙다고 했다. "그 사람을 잃지 않아서요."'], [{ hap: -5 }, '의뢰인이 화를 내며 다른 곳으로 갔다.']] },
    { label: '원하는 대로 지운다', text: '의뢰인은 가벼워졌다. 그런데 가끔 이유 없이 운다고 한다.', eff: { cash: 800, mor: -1 } },
  ] },
  { id: 'wk_mem_fake', title: '가짜 추억', age: W, w: 0.8, cond: J('memory_designer'), text: '부자 고객이 "행복한 어린 시절"을 새로 심어 달라고 한다. 실제로는 없던 기억이다.', choices: [
    { label: '윤리 규정상 거절한다', text: '규정을 지켰다. 고객은 해외 업체를 찾았다.', eff: { mor: 2 } },
    { label: '"각색"까지만 해 준다', mark: { risk: 1 }, text: '', roll: ['int', 50, [{ cash: 2000 }, '고객이 만족했다.'], [{ promo: -1, fame: -1 }, '자격 정지 3개월.']] },
  ] },
  { id: 'wk_mars_dust', title: '모래 폭풍', age: W, w: 1, cond: J('mars_pioneer'), text: '화성 전역에 모래 폭풍. 태양광이 끊기고 돔 온실의 작물이 위험하다. 한 달은 간다고 한다.', choices: [
    { label: '온실부터 살린다', text: '', roll: ['str', 50, [{ promo: 1, fame: 1 }, '감자 한 알도 잃지 않았다. 정착촌 회의에서 박수가 터졌다.'], [{ hp: -6, hap: -4 }, '온실 절반을 잃었다. 배급이 줄었다.']] },
    { label: '사람들 거주 구역에 전력을 몰아준다', text: '추위는 피했다. 작물은 다시 심는다.', eff: { mor: 1 } },
  ] },
  { id: 'wk_mars_letter', title: '지구에서 온 편지', age: W, w: 0.8, cond: J('mars_pioneer'), text: '20분 늦게 도착하는 영상 편지. 지구의 어머니가 늙으셨다. "밥은 잘 먹니?"', choices: [
    { label: '화성 첫 수확 감자를 보여 준다', text: '어머니가 화면 너머로 웃으셨다.', eff: { hap: 5, aff: 4 } },
    { label: '귀환 신청서를 들여다본다', text: '결국 내지 않았다. 여기가 이제 집이다.', eff: { hap: -3, mor: 1 } },
  ] },
  { id: 'wk_sea_typhoon', title: '초대형 태풍', age: W, w: 1, cond: J('sea_farmer'), text: '초대형 태풍이 해상 도시로 온다. 양식장을 통째로 가라앉혀야 버틴다. 잠수 장치가 오래됐다.', choices: [
    { label: '가라앉힌다', text: '', roll: ['luck', 60, [{ hap: 4 }, '태풍이 지나가고 양식장이 멀쩡히 떠올랐다.'], [{ cash: -3000, hap: -8 }, '장치가 고장 나 일부가 쓸려 갔다.']] },
    { label: '줄을 더 묶고 버틴다', mark: { risk: 1 }, text: '', roll: ['str', 45, [{ cash: 500 }, '밤새 버텼다.'], [{ cash: -5000, hap: -10 }, '양식장 절반이 부서졌다.']] },
  ] },
  { id: 'wk_sea_market', title: '해조 스테이크', age: W, w: 0.8, cond: J('sea_farmer'), text: '{n}네 해조류로 만든 "바다 스테이크"가 SNS에서 뜨고 있다. 대형 식품사가 독점 계약을 제안한다.', choices: [
    { label: '계약한다', text: '안정적인 매출이 생겼다.', eff: { cash: 3000 } },
    { label: '우리 브랜드로 간다', mark: { risk: 1 }, text: '', roll: ['cha', 50, [{ cash: 6000, fame: 1 }, '브랜드가 전국에 퍼졌다.'], [{ cash: -1500 }, '유통망을 뚫지 못했다.']] },
  ] },
  // ───────── 22세기 직업 ─────────
  { id: 'wk_terra_storm', title: '화성 모래 폭풍과 온실가스 공장', age: W, w: 1, cond: J('terraformer'), text: '{n}이(가) 맡은 온실가스 공장이 모래 폭풍에 멈췄다. 대기 개조 일정이 1년 밀린다.', choices: [
    { label: '폭풍 속에서 수리에 나선다', text: '', roll: ['str', 50, [{ promo: 1, fame: 1 }, '사흘 만에 재가동. 대기압 그래프가 다시 오른다.'], [{ hp: -8 }, '장비가 고장 나 구조됐다. 공장은 로봇이 고쳤다.']] },
    { label: '폭풍이 지나길 기다린다', text: '1년 늦어도 100년 계획이다. 안전이 먼저.', eff: { mor: 1 } },
  ] },
  { id: 'wk_terra_rain', title: '화성의 첫 비', age: W, w: 0.8, cond: J('terraformer'), text: '관측 기록상 처음으로 화성에 이슬비가 내렸다. 3초 동안. {n}의 팀이 설계한 구역이다.', choices: [
    { label: '팀원들과 비를 맞으러 나간다', text: '헬멧 유리에 물방울 세 개. 모두가 울었다.', eff: { hap: 12, fame: 1 } },
    { label: '데이터부터 저장한다', text: '그 데이터로 논문을 썼다. 교과서에 실렸다.', eff: { int: 2, promo: 1 } },
  ] },
  { id: 'wk_ast_crack', title: '소행성 균열', age: W, w: 1, cond: J('asteroid_miner'), text: '채굴 중인 소행성에 균열이 번진다. 반장은 "하루만 더 캐면 목표량"이라고 한다.', choices: [
    { label: '대피를 주장한다', text: '', roll: ['cha', 45, [{ mor: 2, fame: 1 }, '모두 대피한 직후 소행성이 쪼개졌다. 동료들이 {n}을(를) 영웅이라 불렀다.'], [{ hap: -4 }, '"겁쟁이" 소리를 들었지만 혼자 대피했다. 결국 채굴은 중단됐다.']] },
    { label: '하루만 더 캔다', mark: { risk: 1 }, text: '', roll: ['luck', 50, [{ cash: 2000 }, '목표량 달성. 두둑한 보너스.'], [{ hp: -15, hap: -8 }, '파편에 부상을 입었다.']] },
  ] },
  { id: 'wk_ast_home', title: '지구 휴가', age: W, w: 0.8, cond: J('asteroid_miner'), text: '8개월 만의 지구 휴가. 지구 중력이 천근만근이다. 아이는 {n}을(를) 낯설어한다.', choices: [
    { label: '휴가 내내 아이와 논다', text: '마지막 날 아이가 "가지 마" 하며 매달렸다.', eff: { aff: 6, hap: 4 } },
    { label: '재활 치료부터 받는다', text: '뼈 밀도가 회복됐다.', eff: { hp: 5 } },
  ] },
  { id: 'wk_orb_spin', title: '회전 이상', age: W, w: 1, cond: J('orbital_architect'), text: '{n}이(가) 설계한 궤도 도시 구역의 회전 속도가 미세하게 흔들린다. 주민 2만 명이 어지럼증을 호소한다.', choices: [
    { label: '설계를 다시 계산한다', text: '', roll: ['int', 55, [{ promo: 1, fame: 1 }, '평형추 배치 오류를 찾아냈다.'], [{ hap: -6 }, '원인을 못 찾아 외부 감사를 받았다.']] },
    { label: '주민 설명회에 나간다', text: '사과하고 일정을 공개했다. 주민들이 기다려 줬다.', eff: { cha: 2, mor: 1 } },
  ] },
  { id: 'wk_orb_park', title: '우주 공원', age: W, w: 0.8, cond: J('orbital_architect'), text: '궤도 도시 한가운데 공원을 짓는다. 예산은 나무 1,000그루 몫. 주민들은 "진짜 흙"을 원한다.', choices: [
    { label: '지구 흙을 실어 온다', text: '비쌌지만 아이들이 맨발로 뛰어논다.', eff: { hap: 6, mor: 1 } },
    { label: '인공 토양으로 짓는다', text: '예산 안에 끝냈다. 승진 심사에 유리했다.', eff: { promo: 1 } },
  ] },
  { id: 'wk_upl_glitch', title: '업로드 오류', age: W, w: 1, cond: J('upload_engineer'), text: '업로드된 인격 하나가 "여긴 내가 아니야"라고 반복한다. 가족들이 {n}을(를) 찾아왔다.', choices: [
    { label: '데이터를 한 줄씩 복원한다', text: '', roll: ['int', 55, [{ fame: 1, promo: 1 }, '빠진 기억 조각을 찾아 넣었다. "이제 나야." 가족이 울었다.'], [{ hap: -8 }, '끝내 복원하지 못했다. 가족이 소송을 걸었다.']] },
    { label: '가족에게 솔직히 말한다', text: '"완벽한 업로드는 없습니다." 가족이 오래 침묵했다.', eff: { mor: 2 } },
  ] },
  { id: 'wk_upl_ethics', title: '영원히 살고 싶은 재벌', age: W, w: 0.8, cond: J('upload_engineer'), text: '한 재벌이 자기 인격을 1,000개 복제해 달라고 한다. 법의 빈틈이다.', choices: [
    { label: '거절한다', text: '윤리 위원회가 {n}의 판단을 지지했다.', eff: { mor: 3, fame: 1 } },
    { label: '받아들인다', mark: { risk: 1 }, text: '', roll: ['luck', 40, [{ cash: 8000 }, '큰돈을 벌었다. 뉴스에는 안 나왔다.'], [{ fame: -3, promo: -1 }, '"복제 인격 사태"로 청문회에 불려 갔다.']] },
  ] },
  { id: 'wk_xeno_contact', title: '빛나는 미생물', age: W, w: 1, cond: J('xeno_biologist'), text: '유로파 표본의 미생물이 {n}이(가) 비춘 빛의 패턴에 따라 반짝이며 반응한다. 우연일까, 신호일까?', choices: [
    { label: '신중하게 반복 실험한다', text: '', roll: ['int', 60, [{ fame: 2, promo: 1 }, '1,000번 반복해도 같았다. 학계가 뒤집혔다.'], [{ hap: -3 }, '재현되지 않았다. 다시 처음부터.']] },
    { label: '바로 발표한다', mark: { risk: 1 }, text: '', roll: ['luck', 40, [{ fame: 3 }, '세계가 주목했다.'], [{ fame: -2, hap: -6 }, '성급했다는 비판을 받았다.']] },
  ] },
  { id: 'wk_xeno_protect', title: '생명 보호 구역', age: W, w: 0.8, cond: J('xeno_biologist'), text: '광산 회사가 유로파 얼음을 채굴하려 한다. 미생물 서식지가 겹친다.', choices: [
    { label: '보호 구역 지정을 요구한다', text: '외계 생명 보호법 1호 구역이 지정됐다.', eff: { mor: 3, fame: 1 } },
    { label: '공동 조사를 제안한다', text: '회사와 타협했다. 연구비가 크게 늘었다.', eff: { cash: 2000, int: 1 } },
  ] },
  { id: 'wk_nav_drift', title: '항로 이탈', age: W, w: 1, cond: J('star_navigator'), text: '성간선이 계산보다 0.001도 틀어졌다. 이대로면 10년 뒤 목적지를 비껴간다. 함장은 잠들어 있다(인공 동면).', choices: [
    { label: '직접 궤도를 수정한다', text: '', roll: ['int', 60, [{ promo: 1, fame: 2 }, '완벽한 수정. 깨어난 함장이 {n}의 손을 잡았다.'], [{ hap: -8 }, '수정이 과했다. 다시 계산하느라 1년이 걸렸다.']] },
    { label: '함장을 깨운다', text: '동면 해제는 위험하지만 규정대로 했다.', eff: { mor: 2 } },
  ] },
  { id: 'wk_nav_letter', title: '20년 늦게 온 편지', age: W, w: 0.8, cond: J('star_navigator'), text: '지구에서 편지가 도착했다. 20년 전에 보낸 것이다. 어머니가 {n}의 생일 축하 노래를 부르신다.', choices: [
    { label: '답장을 녹음한다', text: '이 답장은 20년 뒤에 도착한다. 그래도 불렀다.', eff: { hap: 4, aff: 4 } },
    { label: '별을 보며 혼자 운다', text: '창밖 별빛이 흐려 보였다.', eff: { hap: -3, mor: 1 } },
  ] },
];
