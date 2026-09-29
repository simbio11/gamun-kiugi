// 특수 이벤트: 드물게, 평생 한 번쯤. 가문의 운명을 크게 흔들 수도 있다.
import type { Story } from './stories';
import type { GameState, Person } from './types';
import { age, alive, parentsOf, spouseOf } from './people';

const married = (s: GameState, p: Person) => !!spouseOf(s, p) && alive(spouseOf(s, p)!);
const owns = (kind: string) => (s: GameState, p: Person) => s.assets.some((a) => a.ownerId === p.id && a.kind === kind);
const grandparentsGone = (s: GameState, p: Person) => parentsOf(s, p).some((q) => parentsOf(s, q).some((g) => !alive(g)));

export const SPECIAL_STORIES: Story[] = [
  // ───────── 돈·유산 ─────────
  { id: 'sp_ancestor_land', title: '조상 땅 찾기', age: [30, 80], w: 0.008, once: true, head: true, cond: grandparentsGone, text: '구청의 "조상 땅 찾기" 서비스로 조회해 보니, {n}의 돌아가신 할아버지 명의 땅이 강원도에 남아 있었다!', choices: [
    { label: '상속 등기를 한다', cost: 100, text: '', roll: ['luck', 50, [{ cash: 8000, hap: 12 }, '관광단지 개발지 옆이었다. 8천만 원에 팔렸다!'], [{ cash: 900, hap: 4 }, '산비탈 임야. 그래도 900만 원은 받았다.']] },
    { label: '사촌들과 나눈다', mark: { family: 2 }, text: '친척들이 모여 할아버지 이야기로 밤을 지새웠다. 몫은 작았지만 정이 커졌다.', eff: { cash: 1500, hap: 6 } },
    { label: '고향 마을에 기부한다', mark: { kind: 2 }, text: '마을 쉼터가 생겼다. 할아버지 이름을 딴 정자가 섰다.', eff: { fame: 3, mor: 3 } },
  ] },
  { id: 'sp_overseas_relative', title: '해외 친척의 유언', age: [30, 85], w: 0.005, once: true, head: true, text: '미국 로펌에서 편지가 왔다. 60년 전 이민 간 {n}의 친척 할머니가 유산 일부를 남겼다고 한다.', choices: [
    { label: '변호사를 선임해 확인한다', cost: 300, text: '', roll: ['luck', 55, [{ cash: 30000, fame: 1, hap: 15 }, '진짜였다! 3억 원이 송금됐다.'], [{ hap: -5 }, '진짜긴 했지만 상속인이 스무 명. 수수료 빼고 나니 남는 게 없었다.']] },
    { label: '사기 같다, 무시한다', text: '', roll: ['luck', 70, [{}, '역시 국제 사기 편지였다.'], [{ hap: -8 }, '몇 년 뒤, 진짜였다는 걸 알았다.']] },
    { label: '대사관에 문의한다', mark: { honest: 1 }, text: '', roll: ['luck', 45, [{ cash: 25000, hap: 12 }, '영사관이 확인해 줬다. 진짜 유산이었다!'], [{}, '"이런 편지는 대부분 사기입니다." 덕분에 피해는 없었다.']] },
  ] },
  { id: 'sp_heirloom', title: '진품명품', age: [35, 90], w: 0.008, once: true, text: '다락방에서 할아버지가 쓰시던 도자기가 나왔다. TV 감정 프로그램에 내 볼까?', choices: [
    { label: '방송에 출연한다', text: '', roll: ['luck', 20, [{ cash: 20000, fame: 3, hap: 15 }, '"조선 백자 달항아리! 감정가 2억 원!" 스튜디오가 술렁였다.'], [{ fame: 1, hap: 2 }, '"근대에 만든 모조품입니다. 추정가 30만 원." 그래도 TV에 나왔다.']] },
    { label: '박물관에 기증한다', mark: { kind: 2 }, text: '국립박물관 기증자 명판에 가문 이름이 새겨졌다.', eff: { fame: 4, mor: 3 } },
    { label: '그냥 가보로 둔다', mark: { family: 1 }, text: '거실 장식장 한가운데 놓았다. 진짜인지는 영원히 비밀.', eff: { hap: 3 } },
  ] },
  { id: 'sp_lotto_first', title: '로또 1등', age: [25, 90], w: 0.0015, once: true, head: true, text: '토요일 밤, {n}의 손이 떨린다. 번호 여섯 개가 전부 맞았다. 당첨금 20억 원!', choices: [
    { label: '아무에게도 말하지 않는다', mark: { thrift: 2 }, text: '세금 떼고 약 14억 원. 회사를 계속 다니며 조용히 불려 간다.', eff: { cash: 140000, hap: 20 } },
    { label: '가족·친척에게 나눈다', mark: { family: 2 }, text: '온 가족이 울었다. 대신 연락 안 되던 친척들이 줄줄이 찾아온다.', eff: { cash: 90000, hap: 15, fame: 1 } },
    { label: '당장 퇴사하고 세계 여행', mark: { spend: 2 }, text: '인생은 한 번. 1년 동안 세계를 돌았다.', eff: { cash: 110000, hap: 25, flag: 'laid_off' } },
    { label: '절반은 기부한다', mark: { kind: 3 }, text: '익명 기부가 뉴스에 났다. "얼굴 없는 천사."', eff: { cash: 70000, fame: 5, mor: 5, hap: 15 } },
  ] },
  { id: 'sp_friend_unicorn', title: '친구의 스타트업', age: [30, 60], w: 0.005, once: true, text: '10년 전 {n}이 500만 원을 빌려줬던 대학 동기의 회사가 유니콘이 됐다. 동기가 찾아왔다.', choices: [
    { label: '"그때 돈은 됐어"', mark: { kind: 1 }, text: '동기가 스톡옵션 일부를 선물로 줬다.', eff: { cash: 15000, hap: 10 } },
    { label: '지분으로 받는다', mark: { risk: 1 }, text: '', roll: ['luck', 60, [{ cash: 40000, hap: 12 }, '상장 첫날 지분 가치가 4억이 됐다!'], [{ cash: 3000 }, '상장이 연기됐다. 일부만 현금화했다.']] },
    { label: '입사 제안을 받아들인다', mark: { network: 2 }, text: '임원으로 합류했다. 인생 제2막.', eff: { cash: 5000, fame: 2, cha: 2 } },
  ] },

  // ───────── 명예·방송 ─────────
  { id: 'sp_master_tv', title: '생활의 달인', age: [30, 75], w: 0.006, once: true, cond: (_s, p) => p.jobYears >= 10, text: '{n}이 한 가지 일을 오래 해 온 걸 보고 방송국에서 "생활의 달인" 출연 섭외가 왔다.', choices: [
    { label: '출연한다', text: '', roll: ['str', 40, [{ fame: 4, hap: 12, cash: 300 }, '눈 감고도 해내는 모습에 스튜디오가 박수를 쳤다. 가게(회사)에 손님이 몰렸다.'], [{ fame: 2, hap: 4 }, '긴장해서 실수를 했지만 따뜻한 반응을 얻었다.']] },
    { label: '쑥스러워 거절', text: '"저는 그냥 제 일을 할 뿐입니다."', eff: { mor: 1 } },
  ] },
  { id: 'sp_hero', title: '시민 영웅', age: [18, 70], w: 0.004, once: true, text: '출근길 지하철 선로에 사람이 떨어졌다. 열차가 들어오고 있다. {n}의 몸이 먼저 움직였다.', choices: [
    { label: '뛰어들어 끌어올린다', mark: { kind: 3, honest: 1 }, text: '', roll: ['str', 45, [{ fame: 8, mor: 5, hap: 10 }, '열차가 서기 직전 끌어올렸다. LG 의인상과 대통령 표창을 받았다.'], [{ hp: -10, fame: 6, mor: 5 }, '구해 냈지만 크게 다쳤다. 병상에서 의인상 소식을 들었다.']] },
    { label: '비상 정지 버튼을 누른다', mark: { honest: 1 }, text: '열차가 멈췄다. 역무원들이 달려와 구조했다. 침착한 대처가 뉴스에 나왔다.', eff: { fame: 3, mor: 2 } },
    { label: '얼어붙는다', text: '다른 시민이 구했다. 그날 밤 잠이 오지 않았다.', eff: { hap: -5 } },
  ] },
  { id: 'sp_honorary', title: '명예 박사', age: [55, 90], w: 0.005, once: true, cond: (s) => s.fame >= 40, text: '모교에서 {n}에게 명예 박사 학위를 주겠다고 한다. 졸업식 축사도 부탁했다.', choices: [
    { label: '감사히 받고 축사를 한다', text: '', roll: ['cha', 45, [{ fame: 3, hap: 10 }, '"실패해도 괜찮습니다." 축사가 SNS에서 화제가 됐다.'], [{ fame: 2, hap: 5 }, '원고를 읽다 목이 메었다. 그래도 큰 박수를 받았다.']] },
    { label: '장학금도 함께 기부한다', cost: 5000, mark: { kind: 2 }, text: '가문 이름의 장학금이 생겼다.', eff: { fame: 5, mor: 3, hap: 8 } },
  ] },
  { id: 'sp_ambassador', title: '고향 홍보대사', age: [30, 80], w: 0.006, once: true, cond: (s) => s.fame >= 25, text: '고향 군청에서 {n}을 지역 축제 홍보대사로 위촉하고 싶다고 한다.', choices: [
    { label: '위촉을 받아들인다', mark: { network: 1 }, text: '축제 개막식 무대에 섰다. 어릴 적 친구들이 몰려왔다.', eff: { fame: 3, hap: 8 } },
    { label: '고향 사랑 기부금도 낸다', cost: 500, mark: { kind: 1 }, text: '고향사랑기부제로 기부하고 답례품으로 특산물을 받았다. 세액공제도 된다.', eff: { fame: 2, hap: 5, cash: 150 } },
    { label: '정중히 사양', text: '"아직 부족합니다."', eff: {} },
  ] },
  { id: 'sp_documentary', title: '가족 다큐멘터리', age: [40, 85], w: 0.004, once: true, cond: (_s, p) => p.childIds.length >= 3, text: '방송국 PD가 "3대가 사는 대가족" 다큐멘터리를 찍고 싶다며 {n}네를 찾아왔다.', choices: [
    { label: '촬영을 허락한다', mark: { family: 2 }, text: '', roll: ['cha', 40, [{ fame: 5, hap: 10 }, '방송이 나가자 "우리 집 같다"는 댓글이 쏟아졌다.'], [{ fame: 2, hap: -3 }, '편집 때문에 부부 싸움 장면만 화제가 됐다.']] },
    { label: '사생활이 중요하다', text: '정중히 거절했다.', eff: {} },
  ] },

  // ───────── 인연·운명 ─────────
  { id: 'sp_hidden_sibling', title: '숨겨진 형제', age: [30, 80], w: 0.003, once: true, cond: (s, p) => parentsOf(s, p).some((q) => !alive(q)), text: '낯선 사람이 {n}을 찾아왔다. DNA 검사 결과를 내밀며 "우리 아버지(어머니)가 같다"고 한다.', choices: [
    { label: '받아들이고 만난다', mark: { family: 1, kind: 1 }, text: '어색한 첫 만남. 웃는 모습이 똑 닮았다. 형제가 한 명 늘었다.', eff: { hap: 6 } },
    { label: '유산을 노리는 게 아닐까', text: '', roll: ['luck', 60, [{ hap: -2 }, '진심이었다. 나중에야 미안해졌다.'], [{ cash: -1000, hap: -6 }, '결국 상속 회복 청구 소송이 들어왔다.']] },
    { label: '모른 척한다', mark: { hurt: 1 }, text: '돌아서는 뒷모습이 오래 남았다.', eff: { hap: -4 } },
  ] },
  { id: 'sp_twin_reunion', title: '입양된 쌍둥이', age: [25, 70], w: 0.002, once: true, text: '해외 입양인 뿌리 찾기 프로그램에서 연락이 왔다. {n}에게 해외로 입양된 쌍둥이 형제가 있었다는 것이다.', choices: [
    { label: '공항으로 마중 나간다', mark: { family: 2 }, text: '같은 얼굴이 입국장 문을 열고 나왔다. 둘 다 말없이 한참 울었다.', eff: { hap: 15, fame: 2 } },
    { label: '영상 통화부터', text: '서툰 한국어로 "형(누나)"이라고 불렀다.', eff: { hap: 8 } },
  ] },
  { id: 'sp_first_love_rich', title: '첫사랑의 편지', age: [60, 95], w: 0.004, once: true, cond: (s, p) => !married(s, p), text: '40년 만에 {n}의 첫사랑에게서 손편지가 왔다. "그때 하지 못한 말이 있어서."', choices: [
    { label: '만나러 간다', mark: { warmth: 1 }, text: '둘 다 백발이 되어 다시 마주 앉았다. 늦었지만 따뜻한 봄이 왔다.', eff: { hap: 15 } },
    { label: '답장만 쓴다', text: '편지를 몇 번이고 다시 읽었다.', eff: { hap: 6 } },
    { label: '추억으로 남긴다', text: '편지를 상자에 넣었다.', eff: { hap: 2 } },
  ] },
  { id: 'sp_rich_inlaw', title: '재벌가 사돈', age: [45, 75], w: 0.003, once: true, cond: (s, p) => p.childIds.some((id) => { const k = s.people[id]; return !!k && alive(k) && age(s, k) >= 25 && !k.spouseId; }), text: '{n}의 자녀가 사귀는 사람이 알고 보니 재벌가 막내다. 상대 집안에서 만나자고 한다.', choices: [
    { label: '당당하게 만난다', mark: { honest: 1 }, text: '', roll: ['cha', 50, [{ fame: 3, hap: 8 }, '"자녀분을 참 잘 키우셨네요." 결혼 허락이 떨어졌다.'], [{ hap: -8 }, '"집안이 좀…" 반대에 부딪혔다. 자녀가 크게 상처받았다.']] },
    { label: '우리 집과 너무 다르다', text: '자녀에게 조심스레 말했다. "행복은 돈이 아니야."', eff: { hap: -3 } },
  ] },

  // ───────── 재난·기적 ─────────
  { id: 'sp_survivor', title: '기적의 생존', age: [20, 80], w: 0.002, once: true, text: '{n}이 탄 버스가 빗길에 전복됐다. 여러 명이 크게 다쳤는데 {n}은 기적처럼 멀쩡하다.', choices: [
    { label: '다친 사람들을 돕는다', mark: { kind: 2 }, text: '구급대가 오기 전까지 지혈을 도왔다. 한 사람의 생명을 구했다.', eff: { fame: 3, mor: 3, hap: -3 } },
    { label: '삶을 다시 돌아본다', text: '"덤으로 사는 인생." 하고 싶던 일을 하나씩 해 보기로 했다.', eff: { hap: 8, mor: 2 } },
  ] },
  { id: 'sp_meteorite', title: '하늘에서 떨어진 돌', age: [10, 90], w: 0.0008, once: true, text: '밤하늘에서 불빛이 번쩍하더니 {n}네 밭(마당)에 검은 돌이 떨어졌다. 운석일까?', choices: [
    { label: '극지연구소에 감정 의뢰', text: '', roll: ['luck', 40, [{ cash: 50000, fame: 5, hap: 20 }, '진짜 운석이었다! 연구소와 박물관이 5억 원에 구입했다.'], [{ fame: 1 }, '그냥 현무암이었다. 뉴스에는 한 줄 나왔다.']] },
    { label: '해외 수집가에게 판다', mark: { risk: 1 }, text: '', roll: ['luck', 30, [{ cash: 80000, hap: 15 }, '해외 수집가가 8억 원을 불렀다!'], [{ cash: -500, hap: -5 }, '감정비만 날렸다. 가짜 수집가였다.']] },
    { label: '가보로 간직한다', text: '거실에 놓인 까만 돌. 가족의 전설이 됐다.', eff: { hap: 5 } },
  ] },
  { id: 'sp_relic', title: '땅속의 유물', age: [30, 85], w: 0.003, once: true, cond: owns('land'), text: '{n}의 땅에서 공사를 하던 중 오래된 토기와 기와 조각이 나왔다.', choices: [
    { label: '문화재청에 신고한다', mark: { honest: 2 }, text: '삼국시대 유적이었다! 발굴 조사로 공사는 멈췄지만 보상금과 포상금을 받았다.', eff: { cash: 3000, fame: 4, hap: 4 } },
    { label: '몰래 덮는다', mark: { cheat: 2 }, text: '', roll: ['luck', 60, [{}, '공사는 계속됐다. 찜찜하다.'], [{ cash: -3000, fame: -5, hap: -12 }, '인부의 제보로 문화재 은닉 혐의가 적용됐다.']] },
  ] },
  { id: 'sp_sinkhole', title: '싱크홀', age: [20, 90], w: 0.002, once: true, cond: owns('building'), text: '{n}의 건물 앞 도로가 갑자기 꺼졌다. 건물 기초에도 금이 갔다.', choices: [
    { label: '시에 손해배상 청구', mark: { honest: 1 }, text: '', roll: ['int', 45, [{ cash: 2000 }, '상수도관 파열이 원인으로 밝혀져 보상을 받았다.'], [{ cash: -2000, hap: -6 }, '원인 불명. 보수 비용은 내 몫이다.']] },
    { label: '바로 보강 공사', cost: 3000, text: '세입자들이 안심했다.', eff: { hap: -2 } },
  ] },

  // ───────── 가문 ─────────
  { id: 'sp_genealogy', title: '족보 발견', age: [40, 90], w: 0.005, once: true, head: true, text: '문중에서 새 족보를 펴냈다. {n}네 집안이 조선 시대 이름난 학자의 후손이라고 한다.', choices: [
    { label: '시제에 참석한다', mark: { family: 2 }, text: '종친회 어른들이 반갑게 맞아 주셨다. 가문의 뿌리를 느꼈다.', eff: { fame: 2, hap: 5 } },
    { label: '자녀들에게 가문 이야기를 해 준다', mark: { family: 1 }, text: '아이들이 조상 이야기에 귀를 기울였다.', eff: { hap: 3, mor: 1 } },
    { label: '족보 값 30만 원은 아깝다', text: '"요즘 세상에 무슨 족보." 종친회에서 서운해했다.', eff: {} },
  ] },
  { id: 'sp_family_motto', title: '가훈', age: [45, 90], w: 0.005, once: true, head: true, text: '손주가 학교 숙제로 "우리 집 가훈"을 물어 왔다. {n}에게 아직 가훈이 없다.', choices: [
    { label: '"정직하게 살자"', mark: { honest: 2 }, text: '붓글씨로 써서 거실에 걸었다. 자손들이 새겨 두기를.', eff: { mor: 2 } },
    { label: '"건강이 최고"', mark: { exercise: 1 }, text: '가족 모두 웃었다. 틀린 말은 아니다.', eff: { hap: 3 } },
    { label: '"배워서 남 주자"', mark: { study: 1, kind: 1 }, text: '손주가 받아 적었다. 선생님이 칭찬했단다.', eff: { int: 1 } },
    { label: '"돈 모으는 게 효도다"', mark: { thrift: 2 }, text: '며느리(사위)가 조용히 웃었다.', eff: { cash: 100 } },
  ] },
  { id: 'sp_time_capsule', title: '타임캡슐', age: [35, 60], w: 0.005, once: true, text: '초등학교 개교 50주년. 30년 전 묻었던 타임캡슐을 연다며 {n}에게 연락이 왔다.', choices: [
    { label: '동창회에 간다', mark: { network: 1 }, text: '"나는 커서 대통령이 될 거야." 삐뚤빼뚤한 글씨를 보고 한참 웃었다.', eff: { hap: 8 } },
    { label: '새 타임캡슐에 편지를 넣는다', mark: { family: 1 }, text: '30년 뒤의 손주에게 편지를 썼다.', eff: { hap: 5, mor: 1 } },
  ] },
  { id: 'sp_blue_house', title: '대통령실 초청', age: [30, 85], w: 0.003, once: true, cond: (s) => s.fame >= 50, text: '{n}의 공로가 알려져 대통령 초청 오찬에 초대받았다.', choices: [
    { label: '참석해 소신을 말한다', mark: { honest: 1 }, text: '', roll: ['cha', 50, [{ fame: 5, hap: 10 }, '대통령이 고개를 끄덕였다. 정책에 반영됐다는 소식이 들렸다.'], [{ fame: 2, hap: 3 }, '긴장해서 준비한 말을 반도 못 했다.']] },
    { label: '사진만 찍고 온다', text: '가족 단톡방이 난리가 났다.', eff: { fame: 2, hap: 6 } },
    { label: '정치와 엮이기 싫다', text: '정중히 불참했다.', eff: {} },
  ] },
];
