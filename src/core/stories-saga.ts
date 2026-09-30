// 연작 이야기: 한 번의 선택이 몇 년에 걸쳐 이어진다. 1장에서 고른 길에 따라 2장·3장이 달라진다.
// 다음 장은 later 로 예약되고(w: 0), 가끔은 결말이 둘 이상으로 갈린다.
import type { Story } from './stories';
import type { GameState, Person } from './types';
import { age, alive, spouseOf } from './people';

const married = (s: GameState, p: Person) => !!spouseOf(s, p) && alive(spouseOf(s, p)!);
const working = (_s: GameState, p: Person) => !['none', 'parttime', 'pension'].includes(p.job) && !p.flags.includes('student');

export const SAGA_STORIES: Story[] = [
  // ───────── 1. 국밥집 창업 사가 ─────────
  { id: 'sg_shop1', title: '📖 국밥집 이야기 ①: 동업 제안', age: [32, 58], w: 0.012, once: true, cond: working, text: '고등학교 동창이 찾아왔다. "우리 할머니 국밥 비법, 이거 대박 난다니까. 너 돈 대고 내가 끓이고. 반반 어때?"', choices: [
    { label: '같이 차린다 (5,000만)', cost: 5000, mark: { risk: 1 }, text: '가게 이름은 "할매손 국밥". 개업 날 동네 사람들이 줄을 섰다.', eff: { hap: 6, later: [1, 1, 2, 'st_sg_shop2'] } },
    { label: '돈만 빌려준다 (2,000만)', cost: 2000, mark: { kind: 1 }, text: '"꼭 갚을게." 친구가 앞치마를 둘렀다.', eff: { later: [1, 2, 3, 'st_sg_shop2b'] } },
    { label: '거절한다', text: '"그래, 잘 생각했어…" 친구는 혼자 작은 가게를 열었다.', eff: { later: [0.6, 3, 5, 'st_sg_shop2c'] } },
  ] },
  { id: 'sg_shop2', title: '📖 국밥집 이야기 ②: 방송 섭외', age: [30, 70], w: 0, text: '"할매손 국밥"에 맛집 프로그램 PD가 찾아왔다. 그런데 동업자 친구가 레시피를 바꾸자고 한다. "요즘 애들은 매운 걸 좋아해."', choices: [
    { label: '원래 맛을 지킨다', mark: { honest: 1 }, text: '', roll: ['luck', 55, [{ cash: 6000, fame: 2, hap: 10, later: [1, 2, 3, 'st_sg_shop3'] }, '"이게 진짜 국밥이지!" 방송 후 대기 번호 200번. 한 해 수익 6천만 원!'], [{ cash: 500, hap: -4, later: [1, 2, 3, 'st_sg_shop3'] }, '방송은 편집에서 잘렸다. 그래도 단골은 늘었다.']] },
    { label: '매운 국밥으로 바꾼다', mark: { risk: 1 }, text: '', roll: ['luck', 45, [{ cash: 9000, fame: 3, hap: 12, later: [1, 2, 3, 'st_sg_shop3'] }, '"불국밥" SNS 챌린지 대유행! 수익 9천만 원!'], [{ cash: -1500, hap: -8, later: [1, 2, 3, 'st_sg_shop3'] }, '단골들이 떠났다. "옛날 맛이 아니야." 적자 1,500만 원.']] },
  ] },
  { id: 'sg_shop3', title: '📖 국밥집 이야기 ③: 프랜차이즈의 유혹', age: [30, 75], w: 0, text: '외식 대기업이 "할매손 국밥" 브랜드를 사겠다고 한다. 동업자 친구는 팔자고 하고, 할머니는 "우리 국밥은 팔 게 아니다"라고 하신다.', choices: [
    { label: '브랜드를 판다', mark: { thrift: 1 }, text: '', roll: ['luck', 60, [{ cash: 30000, hap: 12, flag: 'saga_shop' }, '매각 대금 6억, 내 몫 3억! 동창과 부둥켜안고 울었다.'], [{ cash: 8000, hap: 3, flag: 'saga_shop' }, '실사에서 값이 깎였다. 그래도 내 몫 8천만 원.']] },
    { label: '직접 가맹 사업을 한다', mark: { risk: 2 }, text: '', roll: ['int', 55, [{ cash: 20000, fame: 4, hap: 10, flag: 'saga_shop' }, '가맹점 40호점 돌파! 해마다 로열티가 들어온다.'], [{ cash: -4000, hap: -10, flag: 'saga_shop' }, '가맹점주 소송에 휘말렸다. 손해 4천만 원. 동창과도 서먹해졌다.']] },
    { label: '한 곳만 지킨다', mark: { family: 1, honest: 1 }, text: '할머니 사진을 가게에 걸었다. 30년 된 노포가 되었다. 돈보다 이름이 남는다.', eff: { fame: 3, hap: 8, mor: 3, flag: 'saga_shop' } },
  ] },
  { id: 'sg_shop2b', title: '📖 국밥집 이야기 ②: 친구의 가게', age: [30, 75], w: 0, text: '돈을 빌려줬던 동창의 국밥집이 방송을 탔다. 줄이 한 블록을 넘는다. 친구가 봉투를 들고 왔다.', choices: [
    { label: '원금만 받는다', mark: { kind: 1 }, text: '"평생 국밥은 공짜다!" 가게 벽에 우리 가족 사진이 걸렸다.', eff: { cash: 2000, hap: 8 } },
    { label: '지분으로 달라고 한다', mark: { risk: 1 }, text: '', roll: ['luck', 60, [{ cash: 9000, hap: 8 }, '3년 뒤 가게가 팔리며 지분값 9천만 원!'], [{ cash: 1000, hap: -3 }, '가게가 이전하며 지분이 흐지부지됐다.']] },
  ] },
  { id: 'sg_shop2c', title: '📖 국밥집 이야기 ②: 그때 그 가게', age: [30, 80], w: 0, text: '그때 거절했던 동창의 국밥집이 전국 체인이 됐다. TV에서 친구가 인터뷰를 한다. "제일 힘들 때 아무도 안 도와주더라고요."', choices: [
    { label: '축하 화환을 보낸다', mark: { kind: 1 }, text: '친구가 전화를 걸어왔다. "고맙다. 그때 네 말이 맞았어, 무모했지. 운이 좋았던 거야."', eff: { hap: 3, mor: 2 } },
    { label: '씁쓸하게 채널을 돌린다', text: '인생에 "만약"은 없다.', eff: { hap: -5 } },
  ] },

  // ───────── 2. 오디션 사가 ─────────
  { id: 'sg_aud1', title: '📖 오디션 ①: 예선', age: [15, 27], w: 0.012, once: true, cond: (_s, p) => p.actual.cha >= 40, text: '{n이} 국민 오디션 프로그램 "슈퍼 루키"에 지원서를 냈다. 예선이 다음 주다.', choices: [
    { label: '보컬 레슨을 붙여준다 (300만)', cost: 300, mark: { art: 1, warmth: 1 }, text: '', roll: ['cha', 45, [{ cha: 2, hap: 8, later: [1, 1, 1, 'st_sg_aud2'] }, '예선 합격! 심사위원이 "원석"이라고 했다.'], [{ hap: -6 }, '긴장해서 음이 이탈했다. 예선 탈락. 그래도 무대 맛을 봤다.']] },
    { label: '혼자 힘으로 해 보라고 한다', mark: { art: 1 }, text: '', roll: ['cha', 55, [{ cha: 2, hap: 8, mor: 2, later: [1, 1, 1, 'st_sg_aud2'] }, '맨몸으로 예선 통과!'], [{ hap: -5 }, '예선 탈락. "다음엔 꼭."']] },
    { label: '반대한다', mark: { hurt: 1, study: 1 }, text: '"딴따라는 안 된다." {n은} 지원서를 찢었다.', eff: { hap: -10, aff: -8 } },
  ] },
  { id: 'sg_aud2', title: '📖 오디션 ②: 본선 미션', age: [15, 30], w: 0, text: '{n이} 본선 TOP 20에 올랐다! 이번 미션은 팀 배틀. 그런데 팀원이 {n}의 파트를 뺏으려 한다.', choices: [
    { label: '정면으로 맞선다', text: '', roll: ['cha', 55, [{ cha: 3, fame: 2, hap: 10, later: [1, 1, 1, 'st_sg_aud3'] }, '고음 한 방으로 판을 뒤집었다. 시청자 투표 1위! TOP 5 진출!'], [{ hap: -8, fame: 1 }, '"악마의 편집"에 당했다. 탈락. 인터넷에 악플이 달렸다.']] },
    { label: '파트를 양보하고 화음을 맡는다', mark: { kind: 1 }, text: '', roll: ['luck', 50, [{ mor: 3, fame: 2, hap: 8, later: [1, 1, 1, 'st_sg_aud3'] }, '"진짜 팀 플레이어!" 심사위원 극찬. TOP 5 진출!'], [{ mor: 3, hap: -3 }, '존재감이 없었다. 탈락. 그래도 팀원들이 고마워했다.']] },
  ] },
  { id: 'sg_aud3', title: '📖 오디션 ③: 결승 생방송', age: [15, 32], w: 0, text: '생방송 결승. 문자 투표가 시작됐다. {n}의 이름이 전광판에 뜬다. 온 가족이 TV 앞에 모였다.', choices: [
    { label: '자작곡으로 승부한다', mark: { art: 2 }, text: '', roll: ['cha', 60, [{ cha: 4, fame: 10, hap: 20, cash: 10000, flag: 'audition_win' }, '🏆 우승!!! 상금 1억 원과 데뷔 계약. 온 동네가 떠들썩하다!'], [{ fame: 5, hap: 5, cash: 2000, flag: 'audition_top' }, '준우승. 그래도 기획사 러브콜이 쏟아진다.']] },
    { label: '가족에게 바치는 노래를 부른다', mark: { family: 2 }, text: '', roll: ['luck', 50, [{ fame: 10, hap: 20, cash: 10000, flag: 'audition_win', aff: 10 }, '🏆 우승! 할머니(할아버지)가 객석에서 오열하는 장면이 명장면으로 남았다.'], [{ fame: 5, hap: 8, aff: 10, flag: 'audition_top' }, '3위. 무대 위에서 "엄마 아빠 사랑해요" 한마디에 전국이 울었다.']] },
  ] },

  // ───────── 3. 발명 특허 사가 ─────────
  { id: 'sg_pat1', title: '📖 발명가 ①: 차고의 아이디어', age: [22, 60], w: 0.01, once: true, cond: (_s, p) => p.actual.int >= 50, text: '{n이} 주말마다 차고에서 뭔가를 만든다. "이거 특허 내면 대박이야. 설거지 안 하는 수세미 로봇!"', choices: [
    { label: '특허 출원을 돕는다 (500만)', cost: 500, mark: { study: 1, risk: 1 }, text: '변리사 사무실에서 서류를 냈다. 특허 번호가 나왔다!', eff: { int: 2, later: [1, 1, 3, 'st_sg_pat2'] } },
    { label: '"취미로만 해"', text: '로봇은 창고에 들어갔다.', eff: { hap: -4 } },
  ] },
  { id: 'sg_pat2', title: '📖 발명가 ②: 도둑맞은 특허', age: [22, 70], w: 0, text: '대형 가전회사가 {n}의 특허와 똑같은 제품을 내놨다. 광고가 TV에 나온다. 명백한 침해다.', choices: [
    { label: '소송을 건다 (2,000만)', cost: 2000, mark: { honest: 1 }, text: '"다윗과 골리앗" 소송이 시작됐다. 몇 년이 걸릴지 모른다.', eff: { later: [1, 2, 3, 'st_sg_pat3'] } },
    { label: '라이선스 협상을 제안한다', text: '', roll: ['cha', 50, [{ cash: 15000, hap: 10, flag: 'patent_win' }, '대기업이 1억 5천에 라이선스를 샀다!'], [{ cash: 1000, hap: -6 }, '헐값 제안. 울며 겨자 먹기로 1천만 원에 넘겼다.']] },
    { label: '언론에 제보한다', mark: { risk: 1 }, text: '', roll: ['luck', 50, [{ fame: 5, cash: 8000, hap: 8, flag: 'patent_win' }, '"대기업 기술 탈취" 보도가 나가자 회사가 사과하고 합의금을 냈다!'], [{ hap: -8 }, '기사는 하루 만에 묻혔다.']] },
  ] },
  { id: 'sg_pat3', title: '📖 발명가 ③: 판결의 날', age: [22, 75], w: 0, text: '3년에 걸친 특허 소송. 드디어 대법원 선고 날이다. {n이} 떨리는 손으로 법정에 들어선다.', choices: [
    { label: '선고를 듣는다', text: '', roll: ['int', 50, [{ cash: 50000, fame: 6, hap: 25, flag: 'patent_win' }, '⚖️ 원고 승소! 손해배상 5억 원. 뉴스 헤드라인: "개인 발명가, 대기업 이겼다"'], [{ hap: -12, mor: 3 }, '패소. 하지만 이 소송으로 중소기업 기술보호법이 개정됐다. 이름 없는 승리.']] },
  ] },

  // ───────── 4. 첫사랑 재회 사가 ─────────
  { id: 'sg_love1', title: '📖 첫사랑 ①: 메시지 한 통', age: [40, 70], w: 0.01, once: true, text: 'SNS로 메시지가 왔다. "혹시… {n} 맞아? 나 고등학교 때 그…" 30년 전 첫사랑이다.', choices: [
    { label: '답장한다', mark: { risk: 1 }, text: '밤새 옛날 이야기를 나눴다. 가슴이 두근거린다.', eff: { hap: 6, later: [1, 1, 1, 'st_sg_love2'] } },
    { label: '읽고 지운다', mark: { family: 1 }, text: '그 시절은 그 시절로 남겨 두기로 했다.', eff: { mor: 2 } },
  ] },
  { id: 'sg_love2', title: '📖 첫사랑 ②: 카페에서', age: [40, 72], w: 0, text: '첫사랑과 카페에서 마주 앉았다. 세월이 비켜간 듯한 미소. "나, 사실 그때 너한테 고백하려 했었어."', choices: [
    { label: '"나도 그랬어" (그 시절 이야기를 한다)', need: (s, p) => !married(s, p), text: '두 사람 사이에 30년이 녹아내렸다. 늦은 봄이 왔다.', eff: { hap: 15, flag: 'late_love' } },
    { label: '배우자 이야기를 꺼낸다', need: married, mark: { family: 2 }, text: '"우리 집사람이 말이야…" 첫사랑이 웃었다. "행복하구나. 다행이다." 좋은 친구로 남았다.', eff: { hap: 5, bond: 5, mor: 3 } },
    { label: '자주 만나기로 한다', need: married, mark: { risk: 2 }, text: '', roll: ['luck', 40, [{ hap: 8 }, '그저 좋은 친구로 지냈다. 배우자도 알고 있다.'], [{ bond: -30, hap: -10, flag: 'grievance', later: [1, 1, 1, 'marital_crisis'] }, '배우자가 메시지를 봤다. 집안이 뒤집혔다.']] },
    { label: '추억은 추억으로', text: '커피 한 잔으로 30년 전 이야기를 마무리했다. 돌아오는 길, 이상하게 개운했다.', eff: { hap: 4, mor: 2 } },
  ] },

  // ───────── 5. 재개발 조합장 사가 ─────────
  { id: 'sg_redev1', title: '📖 재개발 ①: 조합장 선거', age: [45, 72], w: 0.01, once: true, head: true, text: '낡은 우리 동네에 재개발 바람이 분다. 주민들이 {n}에게 조합장 출마를 권한다. "당신이 해야 사람들이 믿어."', choices: [
    { label: '출마한다', mark: { network: 2 }, text: '', roll: ['cha', 50, [{ fame: 3, hap: 6, flag: 'redev_chief', later: [1, 2, 3, 'st_sg_redev2'] }, '당선! 조합 사무실에 "조합장 {n}" 명패가 놓였다.'], [{ hap: -5 }, '낙선. 상대 후보는 건설사 사람이라는 소문이다.']] },
    { label: '평조합원으로 지켜본다', text: '앞장서는 건 체질이 아니다.', eff: { later: [0.5, 4, 6, 'st_sg_redev_done'] } },
  ] },
  { id: 'sg_redev2', title: '📖 재개발 ②: 검은 봉투', age: [45, 80], w: 0, text: '시공사 선정을 앞두고 한 건설사 임원이 찾아왔다. 테이블에 두툼한 봉투를 올린다. "조합장님, 작은 성의입니다. 2억입니다."', choices: [
    { label: '돌려보내고 신고한다', mark: { honest: 2 }, text: '투명한 입찰이 진행됐다. 조합원들이 기립 박수를 쳤다.', eff: { mor: 5, fame: 4, later: [1, 2, 4, 'st_sg_redev3'] } },
    { label: '받는다', mark: { cheat: 2 }, text: '', roll: ['luck', 45, [{ cash: 20000, mor: -8, later: [1, 2, 4, 'st_sg_redev3'] }, '아무도 모른다. …아직은.'], [{ cash: -5000, fame: -10, mor: -5, hap: -20, flag: 'criminal' }, '검찰 압수수색. 조합장직 박탈, 벌금에 추징금까지. 가문 이름에 먹칠을 했다.']] },
  ] },
  { id: 'sg_redev3', title: '📖 재개발 ③: 입주의 날', age: [45, 85], w: 0, text: '8년 만에 새 아파트가 완공됐다. 입주민 잔치에서 주민들이 {n}에게 감사패를 준다.', choices: [
    { label: '감사패를 받는다', mark: { family: 1 }, text: '새 아파트 거실에 감사패를 걸었다. 집값도 두 배가 됐다.', eff: { cash: 25000, fame: 3, hap: 15, flag: 'saga_redev' } },
  ] },
  { id: 'sg_redev_done', title: '📖 재개발 완공', age: [45, 90], w: 0, text: '우여곡절 끝에 동네 재개발이 끝났다. 분담금을 내고 새 아파트에 들어간다.', choices: [
    { label: '분담금을 낸다 (1억)', cost: 10000, text: '새집 냄새. 시세는 분담금의 세 배다.', eff: { cash: 25000, hap: 10 } },
    { label: '입주권을 판다', text: '프리미엄을 받고 팔았다.', eff: { cash: 12000, hap: 4 } },
  ] },

  // ───────── 6. 귀농 사가 ─────────
  { id: 'sg_farm1', title: '📖 귀농 ①: 시골로', age: [48, 66], w: 0.01, once: true, cond: (s, p) => p.id === s.headId || age(s, p) >= 55, text: '{n이} 도시 생활에 지쳤다며 귀농 교육 전단지를 내민다. "경북 산골에 사과밭이 싸게 나왔대."', choices: [
    { label: '사과밭을 산다 (8,000만)', cost: 8000, mark: { risk: 1 }, text: '마을 이장님이 막걸리를 들고 환영하러 왔다. 새벽 5시 기상 생활 시작.', eff: { hp: 3, hap: 5, later: [1, 1, 2, 'st_sg_farm2'] } },
    { label: '주말농장만 한다', cost: 200, text: '텃밭에서 상추를 키운다. 이 정도가 딱 좋다.', eff: { hap: 5, hp: 2 } },
    { label: '"꿈 깨"', text: '"벌레 하나 못 잡는 사람이…" 전단지는 재활용 통으로.', eff: { hap: -4 } },
  ] },
  { id: 'sg_farm2', title: '📖 귀농 ②: 첫 수확', age: [48, 80], w: 0, text: '첫 수확 철. 그런데 태풍 예보가 떴다. 사과가 아직 덜 익었다.', choices: [
    { label: '덜 익어도 미리 딴다', mark: { thrift: 1 }, text: '맛은 덜하지만 절반은 건졌다. 즙으로 만들어 팔았다.', eff: { cash: 1500, later: [1, 1, 2, 'st_sg_farm3'] } },
    { label: '하늘에 맡긴다', mark: { risk: 1 }, text: '', roll: ['luck', 50, [{ cash: 5000, hap: 12, later: [1, 1, 2, 'st_sg_farm3'] }, '태풍이 비켜갔다! 꿀사과 대풍년. 5천만 원어치를 팔았다.'], [{ cash: -1000, hap: -12, later: [1, 1, 2, 'st_sg_farm3'] }, '낙과 80%. 땅바닥이 사과로 뒤덮였다. 눈물이 났다.']] },
    { label: '온라인 라이브로 판다', mark: { network: 1 }, text: '', roll: ['cha', 45, [{ cash: 4000, fame: 2, hap: 10, later: [1, 1, 2, 'st_sg_farm3'] }, '"사과 할매(할배)" 라이브 방송이 떴다! 이틀 만에 완판.'], [{ cash: 800, later: [1, 1, 2, 'st_sg_farm3'] }, '시청자 12명. 그래도 조금은 팔았다.']] },
  ] },
  { id: 'sg_farm3', title: '📖 귀농 ③: 마을의 일원', age: [48, 85], w: 0, text: '귀농 3년 차. 마을 사람들이 {n}에게 이장을 맡아 달라고 한다. 한편 도시의 자식들은 "이제 그만 올라오시라"고 한다.', choices: [
    { label: '이장을 맡는다', mark: { network: 2 }, text: '마을 회관에 "이장 {n}" 방송이 울려 퍼졌다. 여기가 이제 고향이다.', eff: { fame: 2, hap: 12, mor: 3, flag: 'saga_farm' } },
    { label: '스마트팜으로 키운다 (5,000만)', cost: 5000, mark: { risk: 1 }, text: '', roll: ['int', 50, [{ cash: 15000, hap: 10, flag: 'saga_farm' }, '온실 자동화 성공! 수출까지 한다.'], [{ cash: 2000, hap: -3, flag: 'saga_farm' }, '기계 고장이 잦았다. 겨우 본전.']] },
    { label: '땅을 팔고 도시로 돌아간다', text: '땅값이 조금 올랐다. 사과 냄새가 그리울 것이다.', eff: { cash: 9500, hap: -2 } },
  ] },

  // ───────── 7. 바이럴 스타 사가 ─────────
  { id: 'sg_viral1', title: '📖 하루아침 스타 ①: 떡상', age: [16, 55], w: 0.012, once: true, text: '{n}이 무심코 올린 영상이 하룻밤 새 조회수 800만을 찍었다. 알림이 멈추지 않는다.', choices: [
    { label: '이 기회를 잡는다', mark: { art: 1, risk: 1 }, text: '광고 문의가 쏟아진다. 매니저를 자처하는 사람들이 연락해 온다.', eff: { fame: 3, hap: 10, later: [1, 1, 1, 'st_sg_viral2'] } },
    { label: '계정을 닫는다', mark: { thrift: 1 }, text: '"관심은 부담스러워." 조용한 일상으로 돌아갔다.', eff: { hap: 2 } },
  ] },
  { id: 'sg_viral2', title: '📖 하루아침 스타 ②: 과거의 망령', age: [16, 60], w: 0, text: '잘나가던 {n}에게 폭탄이 떨어졌다. 10년 전 쓴 SNS 글이 캡처돼 퍼지고 있다. "이 사람 이런 사람이었어?"', choices: [
    { label: '진심으로 사과한다', mark: { honest: 2 }, text: '', roll: ['mor', 50, [{ mor: 4, fame: 2, later: [1, 1, 2, 'st_sg_viral3'] }, '"사람은 변할 수 있다." 오히려 팬이 늘었다.'], [{ fame: -3, hap: -10 }, '사과문이 또 논란이 됐다. 활동 중단.']] },
    { label: '조작이라고 반박한다', mark: { cheat: 1 }, text: '', roll: ['luck', 30, [{ fame: 2, later: [1, 1, 2, 'st_sg_viral3'] }, '진짜 조작이었다! 유포자가 고소당했다.'], [{ fame: -6, hap: -15, mor: -3 }, '원본이 나왔다. 역풍이 두 배로 불었다.']] },
    { label: '잠수를 탄다', text: '6개월 동안 폰을 껐다. 사람들은 빨리 잊는다.', eff: { hap: -4 } },
  ] },
  { id: 'sg_viral3', title: '📖 하루아침 스타 ③: 기로', age: [16, 65], w: 0, text: '위기를 넘긴 {n}에게 방송국과 기획사가 동시에 연락했다. 전업 방송인이 될 것인가, 본업으로 돌아갈 것인가.', choices: [
    { label: '유튜버로 전업한다', need: (_s, p) => p.job !== 'youtuber', mark: { art: 2 }, text: '사직서를 냈다. 이제 카메라가 직장이다.', eff: { flag: 'laid_off', later: [1, 1, 1, 'st_sg_viral_yt'] } },
    { label: '책을 낸다', text: '', roll: ['cha', 45, [{ cash: 4000, fame: 3, hap: 8 }, '에세이가 베스트셀러에 올랐다!'], [{ cash: 400, hap: 2 }, '초판 2천 부. 그래도 내 이름이 박힌 책.']] },
    { label: '본업으로 돌아간다', mark: { family: 1 }, text: '"한때의 바람이었다." 가족이 제일 좋아했다.', eff: { hap: 6, aff: 4 } },
  ] },
  { id: 'sg_viral_yt', title: '📖 하루아침 스타: 새 출발', age: [16, 70], w: 0, text: '{n이} 채널 이름을 정했다. 첫 정식 영상 업로드 버튼을 누른다.', choices: [
    { label: '업로드!', text: '구독자 3만 명에서 시작한다. 전업 유튜버의 길. (직업 선택에서 유튜버를 고르자)', eff: { hap: 6, later: [1, 1, 1, 'first_job'] } },
  ] },

  // ───────── 8. 노부부 세계 일주 사가 ─────────
  { id: 'sg_world1', title: '📖 세계 일주 ①: 버킷리스트', age: [60, 78], w: 0.01, once: true, cond: married, text: '{n}의 배우자가 오래된 수첩을 꺼냈다. 신혼 때 쓴 버킷리스트. 1번: "둘이서 세계 일주"', choices: [
    { label: '1년간 떠난다 (6,000만)', cost: 6000, mark: { spend: 1, family: 1 }, text: '배낭 두 개를 꾸렸다. 자식들이 공항까지 배웅했다.', eff: { hap: 20, bond: 15, later: [1, 1, 1, 'st_sg_world2'] } },
    { label: '크루즈 한 달로 줄인다 (1,500만)', cost: 1500, text: '지중해 크루즈. 선상에서 본 석양을 평생 못 잊을 것이다.', eff: { hap: 12, bond: 10 } },
    { label: '"언젠가"', text: '수첩은 다시 서랍으로 들어갔다.', eff: { bond: -5 } },
  ] },
  { id: 'sg_world2', title: '📖 세계 일주 ②: 안데스에서', age: [60, 85], w: 0, text: '페루 쿠스코, 해발 3,400m. {n}의 배우자가 고산병으로 쓰러졌다. 다음 목적지는 마추픽추인데…', choices: [
    { label: '일정을 접고 돌봐준다', mark: { family: 2 }, text: '작은 여관에서 일주일을 보냈다. 코카차를 끓여주며 신혼 때 이야기를 했다. 여행의 가장 좋은 날들이었다.', eff: { bond: 15, hap: 8, later: [1, 1, 1, 'st_sg_world3'] } },
    { label: '천천히 올라간다', mark: { risk: 1 }, text: '', roll: ['hp', 45, [{ hap: 15, bond: 10, later: [1, 1, 1, 'st_sg_world3'] }, '마추픽추 정상에서 손을 맞잡았다. 구름이 발아래 있었다.'], [{ hp: -8, bond: 5, later: [1, 1, 1, 'st_sg_world3'] }, '같이 쓰러졌다. 현지 병원 신세. 그래도 서로의 손을 놓지 않았다.']] },
  ] },
  { id: 'sg_world3', title: '📖 세계 일주 ③: 돌아와서', age: [60, 90], w: 0, text: '1년 만에 돌아왔다. 손주가 "할머니(할아버지) 여행 얘기 해 줘!"라며 매달린다. 사진이 3만 장이다.', choices: [
    { label: '여행기를 책으로 낸다', text: '', roll: ['cha', 40, [{ cash: 3000, fame: 3, hap: 10, flag: 'saga_world' }, '"칠순 부부의 세계 일주" 베스트셀러! 강연 요청까지 온다.'], [{ hap: 8, flag: 'saga_world' }, '자비 출판 300부. 친척들에게 한 권씩 돌렸다.']] },
    { label: '손주들에게 이야기해 준다', mark: { family: 2 }, text: '매일 밤 한 나라씩. 손주들의 꿈이 "세계 여행"이 됐다.', eff: { hap: 12, flag: 'saga_world' } },
  ] },

  // ───────── 9. 숨겨진 가족 사가 ─────────
  { id: 'sg_hidden1', title: '📖 숨겨진 가족 ①: 낯선 방문자', age: [30, 70], w: 0.006, once: true, cond: (s, p) => s.year > p.birthYear + 30, text: '낯선 30대가 문 앞에 서 있다. 낡은 사진 한 장을 내민다. 젊은 시절의 우리 아버지(어머니)다. "저… 제가 이분 자식이라고 합니다."', choices: [
    { label: '집으로 들인다', mark: { kind: 2, family: 1 }, text: '밤새 이야기를 들었다. 기막힌 사연이었다.', eff: { hap: -3, flag: 'found_half_sib', later: [1, 1, 1, 'st_sg_hidden2'] } },
    { label: 'DNA 검사부터 하자고 한다', mark: { thrift: 1 }, text: '', roll: ['luck', 50, [{ flag: 'found_half_sib', later: [1, 1, 1, 'st_sg_hidden2'] }, '99.9% 일치. 진짜 이복형제였다.'], [{ hap: 3 }, '불일치. 사기꾼이었다. 연락이 끊겼다.']] },
    { label: '문을 닫는다', text: '문 너머에서 한참 동안 발소리가 들리지 않았다.', eff: { mor: -3, hap: -5 } },
  ] },
  { id: 'sg_hidden2', title: '📖 숨겨진 가족 ②: 이복형제', age: [30, 80], w: 0, text: '이복형제가 생겼다. 그런데 형제가 조심스럽게 말한다. "사업이 망해서… 도움이 필요해요. 형(누나)밖에 없어요."', choices: [
    { label: '도와준다 (3,000만)', cost: 3000, mark: { kind: 2 }, text: '', roll: ['luck', 55, [{ hap: 10, mor: 3, later: [1, 3, 5, 'st_sg_hidden3'] }, '형제가 재기에 성공했다. 명절마다 선물을 들고 온다. 가족이 하나 늘었다.'], [{ hap: -8 }, '다시 연락이 끊겼다. 돈 때문이었을까.']] },
    { label: '돈 대신 일자리를 소개한다', mark: { network: 1 }, text: '아는 회사에 소개했다. 형제는 성실하게 일했다.', eff: { mor: 3, hap: 5, later: [1, 3, 5, 'st_sg_hidden3'] } },
    { label: '선을 긋는다', text: '"우리 가족은 우리 가족이야."', eff: { hap: -3 } },
  ] },
  { id: 'sg_hidden3', title: '📖 숨겨진 가족 ③: 형제의 보답', age: [30, 90], w: 0, text: '이복형제가 찾아왔다. 이제는 번듯한 사장님이다. "그때 형(누나)이 아니었으면 전 없었어요."', choices: [
    { label: '함께 부모님 산소에 간다', mark: { family: 2 }, text: '두 사람이 나란히 절을 올렸다. 세상에 없는 한 사람이 두 가족을 이었다.', eff: { hap: 15, mor: 3, cash: 5000, flag: 'saga_hidden' } },
  ] },

  // ───────── 10. 마라톤 사가 ─────────
  { id: 'sg_run1', title: '📖 러너 ①: 첫 10km', age: [28, 60], w: 0.012, once: true, text: '건강검진 결과가 나빴다. 의사가 말한다. "운동 안 하시면 5년 안에 큰일 납니다." {n이} 러닝화를 샀다.', choices: [
    { label: '러닝 크루에 가입한다', mark: { sport: 2, network: 1 }, text: '새벽 한강. 숨이 턱까지 찼지만 크루가 끝까지 기다려 줬다.', eff: { hp: 4, hap: 5, later: [1, 1, 2, 'st_sg_run2'] } },
    { label: '작심삼일', text: '러닝화는 신발장 속에서 새 신발로 남았다.', eff: { hp: -1 } },
  ] },
  { id: 'sg_run2', title: '📖 러너 ②: 풀코스 도전', age: [28, 70], w: 0, text: '1년 동안 꾸준히 달린 {n}. 크루원들이 춘천 마라톤 풀코스 42.195km에 같이 나가자고 한다.', choices: [
    { label: '완주를 목표로 뛴다', text: '', roll: ['hp', 50, [{ hp: 5, hap: 15, mor: 3, later: [1, 1, 3, 'st_sg_run3'] }, '4시간 48분. 결승선에서 가족이 플래카드를 흔들었다. 눈물이 났다.'], [{ hp: -4, hap: -3 }, '32km 지점에서 쥐가 났다. 회수 버스에 탔다. 내년에 다시.']] },
    { label: '기부 마라톤으로 뛴다', mark: { kind: 1 }, text: '1km당 1만 원씩 모아 소아암 환우에게 기부했다. 완주!', eff: { hp: 4, fame: 2, hap: 12, later: [1, 1, 3, 'st_sg_run3'] } },
  ] },
  { id: 'sg_run3', title: '📖 러너 ③: 보스턴의 꿈', age: [28, 75], w: 0, text: '{n}의 기록이 보스턴 마라톤 참가 기준에 근접했다. 전 세계 러너들의 꿈의 무대다.', choices: [
    { label: '보스턴에 간다 (800만)', cost: 800, text: '', roll: ['hp', 55, [{ hp: 5, hap: 20, fame: 2, flag: 'saga_run' }, '하트브레이크 힐을 넘었다. 보스턴 완주 메달이 거실에 걸렸다.'], [{ hap: 10, flag: 'saga_run' }, '기준 기록에 2분 모자랐다. 그래도 관광은 했다.']] },
    { label: '크루 코치가 된다', mark: { network: 2 }, text: '초보 러너 50명을 완주시켰다. 달리는 삶이 됐다.', eff: { hp: 3, cha: 3, hap: 10, flag: 'saga_run' } },
  ] },
];
