// 직업에 딱 맞는 이야기: 정치인(의원·시장·대통령)·개원의·성직자.
// 정치인에겐 승진·팀장 갈등이 아니라 공천·지역구·법안·청문회·비리 유혹이 있다.
// 근현대사 2000년 전에도 나오도록 id는 h_ 로 시작한다 (시대를 가리지 않는 말만 쓴다).
import type { Story } from './stories';
import type { GameState, Person } from './types';
import { homeOf } from './housing';
import { ownsPractice } from './boss';

const pol = (s: GameState, p: Person) => ['politician', 'mayor'].includes(p.job) || (p.job === 'president' && p.id === s.headId);
const lawmaker = (_s: GameState, p: Person) => p.job === 'politician';
const hot = (_s: GameState, p: Person) => (p.pol?.heat ?? 0) >= 25;

/** 사는 곳에 따라 출마할 지방자치단체장 */
export function homeCity(s: GameState, p: Person): string {
  const tier = homeOf(s, p)?.tier ?? 'local';
  if (tier === 'seoul' || tier === 'gangnam') return '서울';
  const h = [...p.id].reduce((a, c) => a + c.charCodeAt(0), 0);
  if (tier === 'metro') return ['인천', '수원', '성남', '고양', '용인', '부천'][h % 6];
  return ['부산', '대구', '광주', '대전', '울산', '창원', '전주', '청주', '춘천', '제주', '포항', '여수'][h % 12];
}

export const POLITICS_STORIES: Story[] = [
  // ─── 의정 활동 ───
  { id: 'h_pol_bill', title: '대표 발의', age: [30, 80], w: 0.3, cooldown: 3, cond: lawmaker, text: '{n}의 보좌진이 법안 초안을 들고 왔다. 지역 소상공인 지원법. 통과되면 지역구에서 이름값이 오른다.', choices: [
    { label: '여야 의원을 한 명씩 찾아가 공동 발의를 받는다', text: '', roll: ['cha', 55, [{ approval: 6, fame: 3 }, '본회의 통과! "일하는 의원" 기사가 났다.'], [{ approval: -1 }, '상임위에서 잠들었다. 법안 서랍행.']] },
    { label: '보여 주기용으로 발의만 해 둔다', text: '발의 건수는 늘었다. 통과된 건 없다.', eff: { approval: 1 } },
  ] },
  { id: 'h_pol_hearing', title: '인사청문회', age: [30, 80], w: 0.25, cooldown: 3, cond: lawmaker, text: '장관 후보자 인사청문회. {n}이(가) 질의자로 나선다. 후보자 자녀의 위장전입 의혹 자료가 손에 있다.', choices: [
    { label: '송곳 질의로 파고든다', text: '', roll: ['int', 58, [{ approval: 7, fame: 4 }, '후보자가 답을 못 했다. "청문회 스타" 탄생.'], [{ approval: -4 }, '자료에 오류가 있었다. 역공을 맞았다.']] },
    { label: '정책 검증에 집중한다', text: '화제는 안 됐지만 "품격 있는 질의"라는 평.', eff: { approval: 2, mor: 1 } },
  ] },
  { id: 'h_pol_filibuster', title: '무제한 토론', age: [30, 80], w: 0.15, cooldown: 6, cond: lawmaker, text: '당이 쟁점 법안을 막기 위해 무제한 토론(필리버스터)에 나선다. {n}의 차례다.', choices: [
    { label: '12시간을 버틴다', text: '', roll: ['hp', 55, [{ approval: 8, fame: 5, hp: -4 }, '12시간 47분. 지지자들이 국회 앞에서 박수를 쳤다.'], [{ hp: -8, approval: 2 }, '5시간 만에 쓰러질 뻔했다.']] },
    { label: '짧고 굵게 끝낸다', text: '핵심만 짚었다. 기억에 남는 한 문장이 기사 제목이 됐다.', eff: { approval: 3 } },
  ] },
  { id: 'h_pol_disaster', title: '지역구 물난리', age: [30, 80], w: 0.2, cooldown: 5, cond: pol, text: '폭우로 {n}의 지역구 하천이 넘쳤다. 이재민 수백 명. 카메라가 몰려온다.', choices: [
    { label: '장화 신고 삽을 든다', text: '', roll: ['str', 45, [{ approval: 9, hp: -3 }, '사흘 밤을 이재민과 함께 보냈다. 주민들이 기억한다.'], [{ approval: -3, hp: -2 }, '"사진 찍으러 왔냐"는 소리를 들었다.']] },
    { label: '특별재난지역 지정을 밀어붙인다', text: '', roll: ['cha', 55, [{ approval: 10, fame: 2 }, '지정 확정! 복구비가 내려왔다.'], [{ approval: -2 }, '정부가 난색을 표했다.']] },
  ] },
  { id: 'h_pol_nomination', title: '공천 심사', age: [30, 80], w: 0.2, cooldown: 4, cond: lawmaker, text: '다음 총선 공천 심사가 시작됐다. 당 지도부와 사이가 좋지 않은 {n}에게 "컷오프" 소문이 돈다.', choices: [
    { label: '지도부를 찾아가 고개를 숙인다', text: '', roll: ['cha', 55, [{ approval: 2 }, '공천을 받았다. 대신 당론에 따라야 한다.'], [{ approval: -5, hap: -5 }, '컷오프 명단에 이름이 올랐다.']] },
    { label: '경선에서 붙자고 맞선다', text: '', roll: ['luck', 50, [{ approval: 6, fame: 3 }, '경선 승리! 지역 당원들이 {n}을(를) 택했다.'], [{ approval: -6 }, '경선에서 졌다. 무소속 출마를 고민한다.']] },
    { label: '탈당해 신당에 합류한다', text: '', roll: ['luck', 40, [{ approval: 5, fame: 4 }, '신당 돌풍의 주역이 됐다.'], [{ approval: -8, fame: -2 }, '"철새 정치인" 소리를 들었다.']] },
  ] },
  { id: 'h_pol_pledge_check', title: '공약 이행률', age: [30, 80], w: 0.2, cooldown: 4, cond: pol, text: '시민단체가 {n}의 공약 이행률을 발표한다. {pledge}', choices: [
    { label: '이행 못 한 공약을 솔직히 사과한다', text: '"변명하지 않겠습니다." 오히려 신뢰가 올랐다.', eff: { approval: 4, mor: 1 } },
    { label: '성과를 부풀려 홍보한다', text: '', roll: ['luck', 45, [{ approval: 3 }, '현수막 효과가 있었다.'], [{ approval: -6 }, '팩트체크 기사에 "대체로 거짓" 판정을 받았다.']] },
  ] },
  // ─── 비리의 유혹 ───
  { id: 'h_pol_jjokji', title: '쪽지 예산', age: [30, 80], w: 0.2, cooldown: 4, cond: lawmaker, text: '예산안 처리 전날 밤, 한 건설사 대표가 "지역 도로 예산 한 줄만 넣어 주시면…" 하며 두툼한 봉투를 내민다.', choices: [
    { label: '봉투를 받는다', mark: { cheat: 2 }, text: '예산 한 줄이 조용히 들어갔다. 봉투는 금고로 갔다.', eff: { slush: 5000, heat: 18, mor: -3 } },
    { label: '봉투는 돌려보내고 예산은 원칙대로', mark: { honest: 1 }, text: '"다음부터 이러시면 신고합니다."', eff: { mor: 2, approval: 1 } },
  ] },
  { id: 'h_pol_hire', title: '보좌관 채용 청탁', age: [30, 80], w: 0.15, cooldown: 5, cond: lawmaker, text: '먼 친척이 "우리 아들 {n} 의원실 보좌진으로 좀…" 한다. 스펙은 부족하다.', choices: [
    { label: '채용한다', mark: { cheat: 1 }, text: '가족 채용 논란이 언제 터질지 모른다.', eff: { heat: 10, aff: 3 } },
    { label: '공개 채용 절차를 밟게 한다', text: '친척은 서운해했다. 뒷말은 없었다.', eff: { mor: 1, aff: -2 } },
  ] },
  { id: 'h_pol_land', title: '개발 정보', age: [30, 80], w: 0.15, cooldown: 6, cond: pol, text: '상임위에서 신도시 예정지 지도를 봤다. 아직 발표 전이다. 배우자가 "그 동네 땅 좀 사 둘까?" 묻는다.', choices: [
    { label: '차명으로 사 둔다', mark: { cheat: 2 }, text: '발표 후 땅값이 세 배가 됐다. 등기부는 언젠가 열린다.', eff: { cash: 20000, heat: 25, mor: -4 } },
    { label: '절대 안 된다고 못 박는다', text: '"우리 집은 그런 거 안 해." 청렴 서약을 지켰다.', eff: { mor: 2 } },
  ] },
  { id: 'h_pol_junket', title: '해외 연수', age: [30, 80], w: 0.15, cooldown: 5, cond: lawmaker, text: '상임위 "선진 사례 연수"로 유럽 2주. 일정표의 절반이 관광지다.', choices: [
    { label: '다녀온다', text: '', roll: ['luck', 50, [{ hap: 6 }, '조용히 다녀왔다.'], [{ approval: -8, heat: 5 }, '"외유성 출장" 보도가 났다. 가이드 팁 영수증까지 공개됐다.']] },
    { label: '빠지고 지역구를 지킨다', text: '"연수 대신 민원" 기사가 났다.', eff: { approval: 3 } },
  ] },
  { id: 'h_pol_envelope', title: '출판기념회', age: [30, 80], w: 0.15, cooldown: 5, cond: pol, text: '{n}의 출판기념회에 기업 관계자들이 줄을 섰다. 책값이라며 봉투에 수백만 원씩 넣는다.', choices: [
    { label: '책값이니 받는다', mark: { cheat: 1 }, text: '합법의 경계선. 금고가 두둑해졌다.', eff: { slush: 3000, heat: 12 } },
    { label: '정가만 받으라고 지시한다', text: '"책값은 2만 원입니다." 판매 부수는 줄었지만 뒷말도 없었다.', eff: { mor: 2, approval: 2 } },
  ] },
  { id: 'h_pol_aide_leak', title: '보좌관의 폭로', age: [30, 80], w: 0.3, cooldown: 3, cond: (s, p) => lawmaker(s, p) && hot(s, p), text: '그만둔 보좌관이 기자와 만났다는 소식. {n} 의원실의 돈 흐름을 다 안다는 사람이다.', choices: [
    { label: '만나서 입막음을 시도한다', mark: { cheat: 1 }, text: '', roll: ['cha', 60, [{ heat: -5, slush: -2000 }, '거액을 주고 입을 막았다. 당분간은.'], [{ heat: 20, approval: -10 }, '입막음 시도까지 녹음됐다. 최악이다.']] },
    { label: '먼저 기자회견을 열어 털어놓는다', text: '', roll: ['mor', 50, [{ heat: -15, approval: -4 }, '"잘못을 인정합니다." 매는 맞았지만 수사는 가벼워졌다.'], [{ heat: 5, approval: -9 }, '해명이 오히려 의혹을 키웠다.']] },
  ] },
  { id: 'h_pol_integrity', title: '청렴 서약', age: [30, 80], w: 0.12, cooldown: 8, cond: (s, p) => pol(s, p) && !hot(s, p), text: '시민단체가 "정치자금 전면 공개" 서약에 서명해 달라고 한다. 동료 의원들은 눈치를 본다.', choices: [
    { label: '가장 먼저 서명한다', text: '"숨길 게 없습니다." 청렴 이미지가 굳어졌다.', eff: { approval: 5, mor: 2, fame: 2 } },
    { label: '당론을 보고 정한다', text: '미적거리는 사이 뉴스가 지나갔다.', eff: {} },
  ] },
  // ─── 시장·대통령 ───
  { id: 'h_mayor_transit', title: '시정 현안', age: [35, 85], w: 0.3, cooldown: 3, cond: (_s, p) => p.job === 'mayor', text: '{city} 시의회가 {n} 시장의 역점 사업 예산을 깎으려 한다. {pledge}', choices: [
    { label: '시민 공청회를 연다', text: '', roll: ['cha', 55, [{ approval: 7 }, '시민 여론이 움직였다. 예산이 살아났다.'], [{ approval: -3 }, '공청회가 고성으로 끝났다.']] },
    { label: '시의회와 주고받는다', text: '반쪽 예산이지만 첫 삽은 떴다.', eff: { approval: 2 } },
  ] },
  { id: 'h_mayor_festival', title: '지역 축제', age: [35, 85], w: 0.2, cooldown: 3, cond: (_s, p) => p.job === 'mayor', text: '{city}의 대표 축제가 열린다. 전국에서 관광객이 몰려올지, 예산만 날릴지.', choices: [
    { label: '직접 무대에 올라 홍보한다', text: '', roll: ['cha', 50, [{ approval: 6, fame: 3 }, '축제가 대박! "시장님 춤"이 화제가 됐다.'], [{ approval: -2 }, '비가 와서 망했다.']] },
    { label: '지역 상인 위주로 조용히 연다', text: '상인들이 고마워했다.', eff: { approval: 3 } },
  ] },
  // ─── 개원의 ───
  { id: 'h_clinic_rent', title: '의원 임대료', age: [30, 75], w: 0.2, cooldown: 5, cond: (_s, p) => ownsPractice(p), text: '{n}의 병원 건물주가 임대료를 30% 올리겠다고 통보했다. 환자는 이 동네에 다 있는데.', choices: [
    { label: '버티고 협상한다', text: '', roll: ['cha', 50, [{ cash: -300 }, '15% 인상으로 합의했다.'], [{ cash: -1200, hap: -4 }, '결국 다 올려 줬다.']] },
    { label: '대출받아 건물을 산다', text: '', roll: ['int', 55, [{ cash: -3000, hap: 6 }, '내 건물이 생겼다. 임대료 걱정 끝.'], [{ cash: -5000, hap: -4 }, '무리한 대출에 허리가 휜다.']] },
  ] },
  { id: 'h_clinic_staff', title: '직원 구하기', age: [30, 75], w: 0.2, cooldown: 4, cond: (_s, p) => ownsPractice(p), text: '간호사 둘이 한꺼번에 그만뒀다. {n} 원장이 직접 접수까지 봐야 할 판이다.', choices: [
    { label: '급여를 올려 새로 뽑는다', text: '인건비는 늘었지만 병원이 돌아간다.', eff: { cash: -800, hap: 2 } },
    { label: '당분간 혼자 버틴다', text: '진료 시간을 줄였다. 환자가 조금 빠졌다.', eff: { hp: -3, cash: -300 } },
  ] },
  { id: 'h_clinic_review', title: '악성 후기', age: [30, 75], w: 0.15, cooldown: 5, cond: (_s, p) => ownsPractice(p), text: '"불친절하고 돈만 밝힌다" — {n}의 병원에 별점 1점 후기가 쏟아진다. 경쟁 병원 짓 같다.', choices: [
    { label: '정중하게 답글을 단다', text: '진심 어린 답글에 단골들이 응원 후기를 남겼다.', eff: { cha: 1, hap: 2 } },
    { label: '법적으로 대응한다', text: '', roll: ['int', 50, [{ hap: 4 }, '업체가 적발됐다. 후기가 지워졌다.'], [{ cash: -300, hap: -3 }, '소송비만 들었다.']] },
  ] },
  // ─── 성직자 ───
  { id: 'h_clergy_sermon', title: '강론', age: [28, 85], w: 0.3, cooldown: 3, cond: (_s, p) => p.job === 'clergy', text: '주말 강론(설교)을 준비한다. 요즘 신도들은 먹고사는 걱정이 크다.', choices: [
    { label: '위로의 말을 준비한다', text: '예배(법회)가 끝나고 한 신도가 울면서 손을 잡았다.', eff: { mor: 2, cha: 1 } },
    { label: '사회 문제를 정면으로 다룬다', text: '', roll: ['cha', 55, [{ fame: 3, mor: 1 }, '강론이 화제가 됐다.'], [{ hap: -3 }, '일부 신도가 불편해했다.']] },
  ] },
  { id: 'h_clergy_donation', title: '헌금(보시)의 행방', age: [28, 85], w: 0.15, cooldown: 6, cond: (_s, p) => p.job === 'clergy', text: '큰 헌금이 들어왔다. 교단(종단) 원로가 "건물을 짓자"고 한다. 어려운 신도들이 먼저 떠오른다.', choices: [
    { label: '구제 사업에 쓴다', text: '쌀과 연탄이 가난한 집들로 갔다.', eff: { mor: 3, fame: 2 } },
    { label: '건축에 쓴다', text: '번듯한 건물이 올라갔다. 뒷말도 조금 따라왔다.', eff: { fame: 1, mor: -1 } },
  ] },
];

/** 선거 공약: 시대·자리에 맞게 여러 갈래 */
export function pledgeOf(s: GameState, p: Person, seed: number): string {
  const y = s.year;
  const city = homeCity(s, p);
  const pool =
    p.job === 'mayor'
      ? y < 1995
        ? [`${city} 판자촌 재개발`, `${city} 상수도 보급`, '시내버스 노선 확충']
        : y < 2030
          ? [`${city} 지하철 연장`, '공공 산후조리원', `${city} 청년 월세 지원`, '반값 공공 주택', '시립 어린이집 두 배로', `${city} 도심 공원화`, '심야 버스 확대']
          : [`${city} 자율주행 셔틀`, '도심 수직 농장', '기후 방재 지하 저류조', `${city} 드론 택배 기지`, '돌봄 로봇 무상 대여']
      : p.job === 'president'
        ? y < 1995
          ? ['경제 개발 계획', '수출 100억 불', '국민 주택 200만 호', '통일 기반 조성']
          : y < 2030
            ? ['집값 안정', '저출생 대책', '청년 일자리 50만 개', '연금 개혁', '반도체 초격차', '탄소 중립 로드맵', '검찰 개혁', '지방 균형 발전']
            : ['AI 기본 소득', '화성 이주 계획', '해수면 방벽', '4일제 근무', '장수 사회 연금 개편', '로봇세 도입']
        : y < 1995
          ? ['지역구 다리 건설', '국민학교 증설', '비료값 인하', '고속도로 나들목 유치']
          : y < 2030
            ? ['GTX 역 유치', '종합병원 유치', '재건축 규제 완화', '전통시장 현대화', '국립 도서관 분관', '청년 창업 지원센터', '노인 일자리 두 배']
            : ['자율주행 버스 노선', 'AI 공공 병원', '우주항공 산업단지 유치', '기후 이주민 지원법', '뉴럴 링크 규제법'];
  return pool[seed % pool.length];
}
