// 🧩 부업: 본업과 따로 굴리는 작은 일. 행동 탭 "부업 시작"으로 직접 고르거나, 실직·은퇴 고비에서 고른다.
//  · 한 사람이 동시에 하나만. 해마다 수입(실력·운에 따라 출렁임)과 피로(건강·행복)가 따라온다.
//  · 잘되면 단계가 오른다: 0 취미 수준 → 1 쏠쏠한 부수입 → 2 월급만큼 → 3 본업 전환 제안.
//  · 부업마다 고유한 사건이 있다 (배달 사고, 대박 상품, 진상 손님, 대금 미지급…).
//
// 참고 수입: 통계청 「2023 비임금근로·부업 실태」 부업 월평균 40~70만 원, 배달 라이더 시간당 1.5~2만 원(국토부 실태조사),
//   스마트스토어 상위 10% 월매출 수천만 원 / 대다수 월 50만 원 미만(네이버 셀러 통계), 공유숙박 연 수익률 5~10%.
import { chance, int, normal, pick } from './rng';
import { gate, setJob, type Choice, type EventDef } from './ev-util';
import { age, alive, check, clamp, fullName, head, isMainline, spouseOf } from './people';
import { formatMoney } from './economy';
import { JOBS } from './data';
import { wageIndex } from './pay';
import type { GameState, Person, StatKey } from './types';

export interface Gig {
  id: string;
  icon: string;
  name: string;
  desc: string;
  stat: StatKey;
  /** 시작 비용 (2025년 만원) */
  cost: number;
  /** 단계별 연 수입 (2025년 만원, 평균) */
  pay: [number, number, number, number];
  /** 해마다 건강·행복 소모 */
  hp: number;
  joy: number;
  from?: number;
  until?: number;
  /** 조건 */
  ok?: (s: GameState, p: Person) => boolean;
  /** 본업 전환 */
  turnsInto?: string;
  /** 고유 사건 2개: [제목, 상황, 좋은 선택, 판정 스탯, 기준, 성공, 실패] */
  ev: [string, string, string, StatKey, number, string, string][];
}

const ownsHome = (s: GameState, p: Person) => s.assets.some((a) => (a.ownerId === p.id || a.ownerId === p.spouseId) && ['apt_seoul', 'apt_local', 'house', 'building'].includes(a.kind));

export const GIGS: Gig[] = [
  { id: 'rider', icon: '🛵', name: '배달 라이더', desc: '퇴근 후·주말 배달 · 바로 돈이 되지만 몸이 고되다', stat: 'str', cost: 150, pay: [700, 1400, 2400, 3200], hp: -3, joy: -2, from: 2010, ev: [['🛵 빗길 콜', '비 오는 금요일 밤, 배달 요금 세 배. 길은 미끄럽다.', '조심조심 끝까지 탄다', 'str', 50, '오늘 하루 30만 원! 무사히 들어왔다.', '코너에서 미끄러졌다. 무릎이 까지고 오토바이 수리비가 나갔다.'], ['⭐ 별점 테러', '"음식이 식었어요" 별점 1점. 플랫폼 경고가 날아왔다.', '사장님과 고객에게 정중히 해명한다', 'cha', 45, '오해가 풀려 별점이 복구됐다.', '계정이 일주일 정지됐다.']] },
  { id: 'driver', icon: '🚗', name: '대리운전', desc: '밤에 남의 차를 운전 · 손님 복불복', stat: 'cha', cost: 50, pay: [800, 1500, 2300, 3000], hp: -3, joy: -2, from: 2000, ev: [['🍺 만취 손님', '뒷자리 손님이 길을 자꾸 바꾸라고 소리친다.', '웃으며 맞춰 준다', 'cha', 50, '내리면서 팁 5만 원을 쥐여 줬다.', '요금도 안 내고 사라졌다.'], ['🚓 단속', '음주 단속 현장. 손님 차 서류가 이상하다.', '침착하게 설명한다', 'int', 45, '무사히 통과했다.', '경찰서에서 두 시간을 보냈다.']] },
  { id: 'store', icon: '🛍️', name: '온라인 쇼핑몰 (스마트스토어)', desc: '사입해서 판다 · 대박 상품 하나면 인생 역전, 재고가 쌓이면 손해', stat: 'int', cost: 400, pay: [400, 1800, 4500, 8000], hp: -1, joy: 0, from: 2012, turnsInto: 'online_shop', ev: [['🔥 대박 상품', '올린 상품이 SNS에서 터졌다. 주문이 하루 500건!', '재고를 대량으로 들인다', 'int', 55, '완판! 한 달 매출이 연봉을 넘겼다.', '유행이 일주일 만에 끝났다. 창고에 재고가 산더미.'], ['📦 짝퉁 신고', '판매 상품이 상표권 침해라며 신고가 들어왔다.', '정품 증빙을 모은다', 'int', 50, '증빙이 통했다. 판매 재개.', '판매 정지와 과태료.']] },
  { id: 'blog', icon: '✍️', name: '블로그·애드센스', desc: '글 써서 광고 수익 · 꾸준함이 전부', stat: 'int', cost: 0, pay: [100, 600, 1800, 3500], hp: 0, joy: 1, from: 2005, ev: [['📈 상위 노출', '쓴 글 하나가 검색 1페이지에 떴다.', '시리즈로 이어 쓴다', 'int', 50, '방문자가 열 배. 광고 수익이 확 늘었다.', '다음 글은 아무도 안 봤다.'], ['🚫 저품질', '블로그가 갑자기 "저품질"에 걸렸다. 방문자 0.', '새 블로그를 처음부터', 'mor', 45, '오히려 더 좋은 글이 나왔다.', '의욕이 꺾였다.']] },
  { id: 'tutor', icon: '📖', name: '과외·강의', desc: '주말 과외·온라인 강의 · 공부 잘했던 사람에게 딱', stat: 'int', cost: 0, pay: [900, 1800, 3000, 5000], hp: -1, joy: 0, ok: (_s, p) => p.actual.int >= 60, turnsInto: 'tutor', ev: [['🏆 합격 소식', '가르친 학생이 목표 대학에 붙었다!', '학부모 단톡방에 알린다', 'cha', 45, '소개가 줄을 이었다. 시급이 올랐다.', '"우리 애가 잘해서죠." 공은 학생에게.'], ['😤 학부모 민원', '"성적이 왜 안 올라요?" 학부모가 환불을 요구한다.', '학습 계획을 다시 짠다', 'int', 55, '두 달 뒤 성적이 올랐다. 신뢰를 되찾았다.', '과외가 끊겼다.']] },
  { id: 'translate', icon: '🌐', name: '번역·통역', desc: '외국어 실력으로 버는 부업', stat: 'int', cost: 0, pay: [600, 1500, 2800, 4200], hp: -1, joy: 0, ok: (_s, p) => p.actual.int >= 62 || p.flags.includes('abroad_grad') || p.flags.includes('abroad'), until: 2045, ev: [['📚 큰 의뢰', '해외 소설 한 권 번역 의뢰가 들어왔다.', '밤새 붙든다', 'int', 58, '번역서가 호평을 받았다. 역자 이름이 표지에.', '마감을 넘겨 계약이 깨졌다.'], ['🤖 AI 번역', '단가가 반 토막 났다. "AI가 하면 되잖아요."', '감수 전문으로 바꾼다', 'int', 55, '"AI 번역 감수" 틈새를 잡았다.', '일감이 끊겼다.']] },
  { id: 'freelance_dev', icon: '💻', name: '외주 개발', desc: '퇴근 후 앱·홈페이지 외주 · 개발자라면', stat: 'int', cost: 100, pay: [1200, 2500, 4500, 7000], hp: -2, joy: -1, from: 1998, ok: (_s, p) => ['developer', 'game_dev', 'data_scientist', 'chip_engineer', 'researcher'].includes(p.job) || p.flags.some((f) => /^major:(cs|ee|ai)/.test(f)), ev: [['💸 대금 미지급', '납품했는데 클라이언트가 잠수를 탔다.', '내용증명을 보낸다', 'int', 50, '잔금을 받아 냈다.', '석 달 일이 공짜가 됐다.'], ['🚀 대박 클라이언트', '외주 준 스타트업이 투자를 받았다. "같이 하실래요?"', '지분을 받고 합류한다', 'int', 60, '지분 1%. 회사가 크면 큰돈이 된다.', '회사가 1년 만에 문을 닫았다.']] },
  { id: 'design', icon: '🎨', name: '디자인 외주', desc: '로고·상세페이지·일러스트 의뢰', stat: 'cha', cost: 100, pay: [700, 1500, 2800, 4200], hp: -1, joy: 1, ev: [['🔁 수정 지옥', '"조금만 더 화사하게…" 수정 요청 12번째.', '끝까지 맞춘다', 'mor', 50, '결국 만족했다. 다음 일감도 맡겼다.', '참다 못해 그만뒀다. 돈도 못 받았다.'], ['✨ 포트폴리오 히트', '그린 로고가 SNS에서 화제가 됐다.', '작업 의뢰를 받는다', 'cha', 50, '의뢰가 쏟아졌다.', '감당이 안 됐다.']] },
  { id: 'snap', icon: '📸', name: '스냅 사진', desc: '주말 웨딩·가족 스냅 촬영', stat: 'cha', cost: 600, pay: [800, 1700, 3000, 4500], hp: -1, joy: 2, turnsInto: 'photographer', ev: [['💍 웨딩 스냅', '신부가 촬영 내내 울었다. 감동의 눈물.', '진심으로 담는다', 'cha', 50, '후기가 퍼졌다. 예약이 석 달 밀렸다.', '사진이 흔들렸다. 환불했다.'], ['📷 장비 고장', '촬영 당일 카메라가 꺼졌다.', '예비 장비로 버틴다', 'int', 50, '아무도 눈치채지 못했다.', '촬영을 망쳤다. 배상했다.']] },
  { id: 'workshop', icon: '🪵', name: '주말 공방 (가죽·목공·도자기)', desc: '손으로 만들어 판다 · 힐링 부업', stat: 'str', cost: 800, pay: [300, 900, 2000, 3500], hp: 0, joy: 4, ev: [['🧳 플리마켓', '주말 플리마켓에 자리를 잡았다.', '직접 손님을 맞는다', 'cha', 45, '완판! 단골이 생겼다.', '하루 종일 두 개 팔았다.'], ['🏬 백화점 팝업', '백화점 팝업 스토어 제안이 왔다.', '물량을 맞춘다', 'str', 55, '팝업이 대박. 입점 제안까지.', '물량을 못 맞춰 망신.']] },
  { id: 'airbnb', icon: '🏠', name: '공유숙박·단기 임대', desc: '남는 방·집을 빌려준다 (집이 있어야)', stat: 'cha', cost: 500, pay: [600, 1400, 2600, 3800], hp: 0, joy: -1, from: 2012, ok: (s, p) => ownsHome(s, p), ev: [['🎉 파티 손님', '손님이 집에서 파티를 열어 이웃이 신고했다.', '정중하게 수습한다', 'cha', 50, '손님이 사과하고 청소비를 냈다.', '가구가 부서지고 별점도 떨어졌다.'], ['🌏 외국인 단골', '외국인 장기 투숙객이 생겼다.', '한국 문화를 소개한다', 'cha', 45, '후기에 "인생 숙소". 예약이 꽉 찼다.', '말이 안 통해 오해만 쌓였다.']] },
  { id: 'resell', icon: '👟', name: '리셀·중고 거래', desc: '한정판 운동화·굿즈를 사서 되판다', stat: 'int', cost: 300, pay: [300, 1200, 2500, 4000], hp: 0, joy: 1, from: 2015, ev: [['🎟 한정판 드롭', '새벽 응모에 당첨됐다! 정가의 세 배에 팔린다.', '바로 판다', 'int', 45, '하룻밤에 100만 원.', '가품 의심 분쟁에 휘말렸다.'], ['📉 시세 폭락', '리셀 시장이 꺼졌다. 쌓아 둔 물건 값이 반 토막.', '손절한다', 'int', 50, '빨리 털어 손해를 줄였다.', '버티다 더 떨어졌다.']] },
  { id: 'webnovel', icon: '📝', name: '웹소설 연재', desc: '퇴근 후 한 편씩 · 유료화되면 대박', stat: 'int', cost: 0, pay: [100, 900, 3000, 7000], hp: -1, joy: 2, from: 2013, turnsInto: 'writer', ev: [['🔥 투데이 베스트', '연재작이 투데이 베스트 1위에 올랐다.', '하루 두 편씩 쓴다', 'int', 55, '유료 전환 성공! 구매 수가 폭발했다.', '번아웃이 와서 휴재했다.'], ['💬 악플', '"작가 수준이 왜 이래" 댓글이 달렸다.', '묵묵히 쓴다', 'mor', 45, '오히려 독자가 늘었다.', '연재를 접을까 고민 중.']] },
  { id: 'emoticon', icon: '😺', name: '이모티콘 작가', desc: '메신저 이모티콘을 그려 판다', stat: 'cha', cost: 0, pay: [50, 800, 2500, 5000], hp: 0, joy: 3, from: 2012, ev: [['✅ 승인', '열 번 떨어진 끝에 이모티콘이 승인됐다!', '홍보한다', 'cha', 50, '인기 순위 1위! 정산 금액에 눈을 의심했다.', '조용히 묻혔다.'], ['❌ 반려', '또 반려 메일이 왔다.', '캐릭터를 갈아엎는다', 'int', 50, '새 캐릭터가 승인됐다.', '열한 번째 반려.']] },
  { id: 'farm', icon: '🥬', name: '주말농장·텃밭 판매', desc: '주말에 기른 채소를 직거래로', stat: 'str', cost: 200, pay: [200, 600, 1200, 2200], hp: 2, joy: 4, ok: (s, p) => age(s, p) >= 35, ev: [['🌧 장마', '장마에 텃밭이 잠겼다.', '배수로를 판다', 'str', 50, '절반은 건졌다.', '한 해 농사를 망쳤다.'], ['🧺 동네 직거래', '동네 맘카페에 "무농약 채소"가 소문났다.', '주문을 받는다', 'cha', 45, '매주 완판. 단골이 생겼다.', '물량이 모자라 원성만 샀다.']] },
  { id: 'camping', icon: '⛺', name: '캠핑 장비 대여', desc: '장비를 사서 빌려준다', stat: 'cha', cost: 900, pay: [400, 1100, 2200, 3200], hp: -1, joy: 1, from: 2015, ev: [['🔥 훼손', '빌려준 텐트가 불에 그을려 돌아왔다.', '보증금 규정대로 처리한다', 'mor', 45, '원만히 배상받았다.', '분쟁 끝에 손해를 봤다.'], ['🏕 성수기', '캠핑 성수기, 장비가 매일 나간다.', '장비를 늘린다', 'int', 50, '투자금을 한 시즌에 회수했다.', '비수기에 재고만 남았다.']] },
  { id: 'petsit', icon: '🐶', name: '펫시터', desc: '여행 간 집 반려동물 돌봄', stat: 'mor', cost: 0, pay: [400, 900, 1600, 2400], hp: 0, joy: 3, from: 2010, ev: [['🐕 탈출', '맡은 강아지가 산책 중 줄을 끊고 달아났다.', '온 동네를 뒤진다', 'str', 50, '두 시간 만에 찾았다. 보호자가 울면서 고마워했다.', '찾았지만 보호자가 크게 화를 냈다.'], ['💕 단골', '보호자가 "우리 애가 선생님만 좋아해요"라며 장기 계약을 원한다.', '수락한다', 'mor', 40, '고정 수입이 생겼다.', '일정이 꼬였다.']] },
  { id: 'ebook', icon: '📗', name: '전자책·강의 PDF 판매', desc: '내 노하우를 PDF로 판다', stat: 'int', cost: 0, pay: [100, 700, 2000, 3500], hp: 0, joy: 1, from: 2018, ev: [['📈 입소문', '"이거 진짜 도움 됐어요" 후기가 쌓인다.', '2탄을 낸다', 'int', 55, '시리즈가 꾸준히 팔린다.', '2탄은 반응이 없었다.'], ['🧾 표절 시비', '누군가 내 PDF를 그대로 베껴 판다.', '신고한다', 'int', 50, '판매가 중단됐다. 오히려 홍보가 됐다.', '대응하다 지쳤다.']] },
  { id: 'cook', icon: '🍱', name: '도시락·반찬 주문 제작', desc: '손맛으로 버는 부업', stat: 'mor', cost: 300, pay: [500, 1200, 2400, 3600], hp: -1, joy: 1, ok: (s, p) => age(s, p) >= 25, turnsInto: 'restaurant', ev: [['🍱 단체 주문', '회사 50인분 도시락 주문이 들어왔다.', '밤새 만든다', 'str', 50, '"또 시킬게요!" 정기 주문이 생겼다.', '절반을 늦게 보내 항의를 받았다.'], ['🧪 위생 점검', '구청 위생 점검이 나왔다.', '주방을 공개한다', 'mor', 50, '모범 사례로 칭찬받았다.', '영업 신고 문제로 과태료.']] },
  { id: 'shorts', icon: '🎬', name: '숏폼 크리에이터', desc: '짧은 영상으로 조회수 수익', stat: 'cha', cost: 100, pay: [100, 1000, 3500, 8000], hp: 0, joy: 2, from: 2019, turnsInto: 'youtuber', ev: [['📈 떡상', '올린 영상이 하룻밤에 300만 뷰.', '후속편을 바로 찍는다', 'cha', 55, '구독자가 열 배. 광고 문의가 들어온다.', '후속편은 3천 뷰.'], ['🔇 저작권', '배경음악 저작권 경고를 받았다.', '모두 내리고 다시 올린다', 'int', 45, '계정을 지켰다.', '수익 창출이 막혔다.']] },
];
export const GIG_BY_ID: Record<string, Gig> = Object.fromEntries(GIGS.map((g) => [g.id, g]));

/** 지금 하는 부업 (flag: gig:<id>:<단계>) */
export function gigOf(p: Person): { g: Gig; lv: number } | undefined {
  const f = p.flags.find((x) => x.startsWith('gig:'));
  if (!f) return undefined;
  const [, id, lv] = f.split(':');
  const g = GIG_BY_ID[id];
  return g ? { g, lv: Number(lv) || 0 } : undefined;
}
function setGig(p: Person, id: string | undefined, lv = 0) {
  p.flags = p.flags.filter((x) => !x.startsWith('gig:'));
  if (id) p.flags.push(`gig:${id}:${lv}`);
}
export const gigOpen = (s: GameState, p: Person, g: Gig) => (g.from ?? 0) <= s.year && (g.until ?? 9999) >= s.year && (!g.ok || g.ok(s, p));
const W = (s: GameState, v: number) => Math.max(0, Math.round(v * wageIndex(s.year)));

/** 부업 고르기 (행동 "부업 시작" · 실직 뒤) */
const PICK: EventDef = {
  id: 'sj_pick',
  title: () => '🧩 어떤 부업을 해 볼까?',
  valid: (c) => alive(c.p) && age(c.s, c.p) >= 18,
  text: (c) => `${fullName(c.p)}이(가) 부업을 알아본다.${c.ev.data?.main ? ' 이번엔 이걸로 먹고살아야 한다.' : ' 본업은 그대로, 퇴근 후와 주말에.'}\n한 번에 하나만 할 수 있다. 잘되면 커지고, 몸이 고되면 그만둘 수도 있다.`,
  choices: (c) => {
    const open = GIGS.filter((g) => gigOpen(c.s, c.p, g));
    // 다 보여 주면 너무 길다: 이 사람에게 맞는 순서로 6개
    const fit = (g: Gig) => c.p.actual[g.stat] + (g.cost === 0 ? 5 : 0) + ((c.ev.data?.seed as number) ?? 0) * 0;
    const list = [...open].sort((a, b) => fit(b) - fit(a)).slice(0, 6);
    return gate(c.s, [
      ...list.map((g): Choice => ({
        label: `${g.icon} ${g.name}`,
        req: [`${g.desc}${g.cost ? ` · 시작 ${formatMoney(W(c.s, g.cost))}` : ''}`],
        cost: g.cost ? W(c.s, g.cost) : undefined,
        run: (x) => {
          setGig(x.p, g.id, 0);
          if (x.ev.data?.main) x.p.flags.push('gig_main');
          return `${g.icon} ${g.name}을(를) 시작했다. ${pick(x.s, ['첫 주는 서툴렀다.', '생각보다 재밌다.', '통장에 첫 입금이 찍혔다.', '가족들이 신기해한다.'])}`;
        },
      })),
      { label: '아직은 아니다', run: () => '좀 더 생각해 보기로 했다.' },
    ]);
  },
};

/** 부업 고유 사건 */
const STORY: EventDef = {
  id: 'sj_story',
  title: (c) => GIG_BY_ID[c.ev.data.gig as string]?.ev[c.ev.data.k as number]?.[0] ?? '부업',
  valid: (c) => alive(c.p) && gigOf(c.p)?.g.id === c.ev.data.gig,
  text: (c) => {
    const g = GIG_BY_ID[c.ev.data.gig as string];
    return `${g.icon} ${fullName(c.p)}의 부업 (${g.name})\n${g.ev[c.ev.data.k as number][1]}`;
  },
  choices: (c) => {
    const g = GIG_BY_ID[c.ev.data.gig as string];
    const [, , label, st, need, win, lose] = g.ev[c.ev.data.k as number];
    const cur = gigOf(c.p)!;
    return gate(c.s, [
      { label, run: (x) => {
        if (check(x.s, x.p.actual[st], need, 10)) {
          const bonus = W(x.s, g.pay[cur.lv] * 0.4);
          x.p.cash += bonus;
          x.p.happiness = clamp(x.p.happiness + 5, 0, 100);
          if (cur.lv < 3 && chance(x.s, 0.5)) setGig(x.p, g.id, cur.lv + 1);
          return `${win} (+${formatMoney(bonus)})`;
        }
        const loss = W(x.s, g.pay[cur.lv] * 0.25);
        x.p.cash -= loss;
        x.p.happiness = clamp(x.p.happiness - 5, 0, 100);
        return `${lose} (-${formatMoney(loss)})`;
      } },
      { label: '이참에 부업을 접는다', run: (x) => (setGig(x.p, undefined), '부업을 접었다. 저녁이 생겼다.') },
    ]);
  },
};

/** 3단계: 본업 전환 제안 */
const TURN: EventDef = {
  id: 'sj_turn',
  title: () => '🔁 부업이 본업을 넘었다',
  valid: (c) => alive(c.p) && !!gigOf(c.p)?.g.turnsInto,
  text: (c) => {
    const g = gigOf(c.p)!.g;
    return `${fullName(c.p)}의 ${g.name} 수입이 본업 월급을 넘었다. 이참에 ${JOBS[g.turnsInto!].name}(으)로 전업할까?`;
  },
  choices: (c) => {
    const g = gigOf(c.p)!.g;
    return gate(c.s, [
      { label: `${JOBS[g.turnsInto!].name}(으)로 전업한다`, run: (x) => (setJob(x.p, g.turnsInto!, 1), setGig(x.p, undefined), (x.p.happiness = clamp(x.p.happiness + 10, 0, 100)), `사표를 냈다. 이제 ${JOBS[g.turnsInto!].name}이(가) 본업이다.`) },
      { label: '안정이 먼저다. 둘 다 한다', run: () => '월급은 안전판으로 남겨 두었다.' },
    ]);
  },
};

export const GIG_EVENTS: EventDef[] = [PICK, STORY, TURN];

/** 해마다: 부업 수입·피로·성장·사건 */
export function gigYear(s: GameState, incomeOf: (p: Person, v: number) => void): string[] {
  const out: string[] = [];
  const h = head(s);
  const sp = spouseOf(s, h);
  let told = false;
  for (const p of Object.values(s.people)) {
    const cur = gigOf(p);
    if (!cur) continue;
    if (!alive(p)) continue;
    const { g, lv } = cur;
    const skill = p.actual[g.stat];
    const main = p.flags.includes('gig_main') || p.job === 'none';
    const v = W(s, g.pay[lv] * clamp(normal(s, 0.55 + skill / 110, 0.3), 0.1, 2.2) * (main ? 1.6 : 1));
    incomeOf(p, v);
    p.actual.hp = clamp(p.actual.hp + g.hp * (main ? 0.5 : 1), 0, 100);
    p.happiness = clamp(p.happiness + g.joy, 0, 100);
    // 성장: 실력·꾸준함
    if (lv < 3 && chance(s, 0.08 + skill / 600 + (main ? 0.08 : 0))) {
      setGig(p, g.id, lv + 1);
      if (isMainline(s, p) || p.id === sp?.id) out.push(`🧩 ${fullName(p)}의 ${g.name}이(가) 커졌다 (${['취미 수준', '쏠쏠한 부수입', '월급만큼', '본업 수준'][lv + 1]})`);
    }
    // 너무 고되면 접는다 (건강이 바닥)
    if (p.actual.hp < 25 && chance(s, 0.5)) {
      setGig(p, undefined);
      out.push(`🧩 ${fullName(p)}, 몸이 버티지 못해 ${g.name}을(를) 접었다`);
      continue;
    }
    const player = p.id === h.id || p.id === sp?.id;
    if (!player || told) continue;
    const seen = (s.storySeen ??= {});
    if (lv >= 3 && g.turnsInto && p.job !== g.turnsInto && s.year - (seen['sj_turn:' + p.id] ?? -99) >= 6) {
      seen['sj_turn:' + p.id] = s.year;
      s.events.push({ uid: s.eventSeq++, defId: 'sj_turn', personId: p.id, data: {} });
      told = true;
    } else if (chance(s, 0.35) && s.year - (seen['sj:' + p.id] ?? -99) >= 2) {
      seen['sj:' + p.id] = s.year;
      s.events.push({ uid: s.eventSeq++, defId: 'sj_story', personId: p.id, data: { gig: g.id, k: int(s, 0, g.ev.length - 1) } });
      told = true;
    }
  }
  return out;
}

/** 부업 접기 (행동) */
export function quitGig(p: Person): string {
  const cur = gigOf(p);
  if (!cur) return '';
  setGig(p, undefined);
  p.flags = p.flags.filter((x) => x !== 'gig_main');
  return `${cur.g.icon} ${cur.g.name}을(를) 접었다.`;
}
