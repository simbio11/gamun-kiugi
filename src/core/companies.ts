// 🏢 회사: 같은 "대기업 직원"이라도 어느 회사냐에 따라 연봉·분위기·이야기가 다르다.
//  · 대기업은 실제 그룹을 비튼 패러디 이름, 해외 기업은 가명, 중소·중견기업은 재밌는 이름을 지어 붙인다.
//  · 학벌·전공·능력에 따라 들어갈 수 있는 회사 급이 다르다 (최상위 대학·이공계 → S급·해외, 지방대 → 중견·중소가 많다).
//  · 연봉 배수는 고용노동부 「고용형태별 근로실태조사」의 기업 규모별 임금 격차(300인 이상 = 100 기준, 5~299인 약 55~70%)와
//    잡코리아·사람인 대졸 초임 조사(대기업 5천 안팎, 중소 3천 안팎), 외국계 IT 본사 연봉(국내 대기업의 1.5~2배)을 참고했다.
import { chance, int, pick } from './rng';
import { addFlag, age, alive, check, clamp, fullName, head, isMainline, markOf } from './people';
import { gate, type Choice, type Ctx, type EventDef } from './ev-util';
import { wageIndex } from './pay';
import type { GameState, Person } from './types';

export type CoTier = 'global' | 'S' | 'A' | 'B' | 'mid' | 'small' | 'startup';

export interface Company {
  id: string;
  name: string;
  tier: CoTier;
  /** 분야: 이 직업군에서 뽑는다 */
  field: 'tech' | 'auto' | 'chem' | 'retail' | 'finance' | 'game' | 'bio' | 'heavy' | 'food' | 'media' | 'telecom' | 'air' | 'consult' | 'all';
  /** 한 줄 소개 */
  blurb: string;
  /** 해외 근무 (해외 기업) */
  abroad?: boolean;
  /** 어느 해부터 있나 (근현대사 모드) */
  from?: number;
}

/** 연봉 배수 */
export const TIER_PAY: Record<CoTier, number> = { global: 1.7, S: 1.3, A: 1.15, B: 1.0, mid: 0.85, small: 0.68, startup: 0.8 };
export const TIER_NAME: Record<CoTier, string> = { global: '🌐 글로벌 빅테크·투자은행', S: '👑 국내 최상위 대기업', A: '🏢 대기업', B: '🏢 대기업 계열사', mid: '🏬 중견기업', small: '🏠 중소기업', startup: '🚀 스타트업' };

const C = (id: string, name: string, tier: CoTier, field: Company['field'], blurb: string, o: Partial<Company> = {}): Company => ({ id, name, tier, field, blurb, ...o });

/** 대기업 (실제 그룹 패러디) · 해외 기업 (가명) */
export const COMPANIES: Company[] = [
  // ── 글로벌 (가명) ──
  C('gooble', '구블 (Gooble)', 'global', 'tech', '검색창 하나로 세상을 먹은 실리콘밸리 빅테크. 사내 식당이 미슐랭급', { abroad: true, from: 1998 }),
  C('pineapple', '파인애플 (Pineapple)', 'global', 'tech', '한 입 베어 문 파인애플 로고. 스마트폰 하나로 시가총액 1위', { abroad: true, from: 1976 }),
  C('macrosoft', '매크로소프트 (Macrosoft)', 'global', 'tech', '윈도우 대신 "도어즈" 운영체제. 클라우드로 부활한 공룡', { abroad: true, from: 1975 }),
  C('amazone', '아마존느 (Amazone)', 'global', 'retail', '책 팔다 세상 모든 걸 파는 회사. 새벽 배송의 원조', { abroad: true, from: 1994 }),
  C('envidia', '엔비디야 (Envydia)', 'global', 'tech', 'AI 칩 하나로 세계 1위가 된 그래픽카드 회사. 사장님은 늘 가죽 재킷', { abroad: true, from: 1993 }),
  C('teslo', '테슬로 (Teslo)', 'global', 'auto', '전기차·로켓·로봇… CEO의 트윗 한 줄에 주가가 출렁인다', { abroad: true, from: 2003 }),
  C('openmind', '오픈마인드 (OpenMind)', 'global', 'tech', '말하는 AI로 세상을 뒤집은 연구소. 이직 제안이 쏟아진다', { abroad: true, from: 2015 }),
  C('netflux', '넷플럭스 (Netflux)', 'global', 'media', '빨간 N 대신 빨간 X. K-드라마에 큰돈을 쏟는다', { abroad: true, from: 1997 }),
  C('goldberg', '골드버그 삭스 (Goldberg Sacks)', 'global', 'finance', '월가의 투자은행. 주 100시간 근무, 보너스는 연봉의 두 배', { abroad: true, from: 1869 }),
  C('mckenzie', '맥켄지 (McKenzie)', 'global', 'consult', '세계 1위 컨설팅. 장표 300장, 출장 300일', { abroad: true, from: 1926 }),
  C('spacez', '스페이스Z (SpaceZ)', 'global', 'heavy', '로켓을 다시 착륙시키는 민간 우주기업. 화성에 가겠다고 한다', { abroad: true, from: 2002 }),
  C('sonny', '소미 (Somy)', 'global', 'tech', '워크맨과 게임기의 나라. 도쿄 본사', { abroad: true, from: 1946 }),
  C('toyoda', '토요다 (Toyoda)', 'global', 'auto', '세계 판매 1위 자동차. 나고야 근처 본사', { abroad: true, from: 1937 }),
  C('lmvh', 'LMVH', 'global', 'retail', '명품 가방부터 샴페인까지. 파리 본사', { abroad: true, from: 1987 }),
  C('dizny', '디스니 (Disnee)', 'global', 'media', '쥐 한 마리로 시작한 엔터 제국', { abroad: true, from: 1923 }),
  C('jpmorgen', 'JP 모르겐 (JP Morgen)', 'global', 'finance', '뉴욕 월가 최대 은행', { abroad: true, from: 1871 }),
  // ── 국내 최상위 (S) ──
  C('samsong', '삼송전자', 'S', 'tech', '반도체·스마트폰 세계 1등. 입사하면 "삼송맨" 소리를 듣는다', { from: 1969 }),
  C('sqhynix', 'SQ하이닉스', 'S', 'tech', 'HBM 메모리로 AI 시대의 주인공이 된 반도체 회사. 성과급 뉴스의 단골', { from: 1983 }),
  C('hyundei', '현데이자동차', 'S', 'auto', '정주영… 아니 정주용 회장이 세운 자동차 왕국', { from: 1967 }),
  C('lzelec', 'LZ전자', 'S', 'tech', '"사랑해요 LZ". 가전과 배터리의 명가', { from: 1958 }),
  C('naba', '네이바', 'S', 'tech', '초록 검색창의 나라. 판교 사옥의 로봇이 커피를 나른다', { from: 1999 }),
  C('kkaokao', '까까오', 'S', 'tech', '노란 말풍선 메신저 하나로 금융·택시·웹툰까지', { from: 2010 }),
  C('posk', '포스크', 'S', 'heavy', '쇳물을 끓이는 국민기업. 포항 제철소의 불은 꺼지지 않는다', { from: 1968 }),
  C('kbank1', '국밍은행', 'S', 'finance', '시중은행 1위. 정년까지 버티면 신의 직장', { from: 1963 }),
  // ── 대기업 (A) ──
  C('lotte', '롯태', 'A', 'retail', '껌으로 시작해 월드타워까지. 백화점·마트·호텔', { from: 1967 }),
  C('hanha', '한하', 'A', 'chem', '화약에서 태양광·방산까지. 의리의 그룹', { from: 1952 }),
  C('czfood', 'CZ제일제당', 'A', 'food', '설탕 공장에서 K-푸드·K-콘텐츠 제국으로', { from: 1953 }),
  C('shinsege', '신세게', 'A', 'retail', '백화점·이마트… 아니 이마크', { from: 1963 }),
  C('ktt', 'KTT', 'A', 'telecom', '옛 전화국. 공기업 DNA가 남은 통신사', { from: 1981 }),
  C('skktel', 'SQ텔레콤', 'A', 'telecom', '"스피드 011"… 아니 0111. 이동통신 1위', { from: 1984 }),
  C('koair', '대한항궁', 'A', 'air', '태극 무늬 비행기. 땅콩 사건은 잊어 주세요', { from: 1969 }),
  C('shinhwan', '신환은행', 'A', 'finance', '"신환은 다르다"는 사훈의 금융그룹', { from: 1982 }),
  C('hybe', '하이부', 'A', 'media', '방탄… 아니 "방패소년단"을 키운 엔터 공룡', { from: 2005 }),
  C('emsoft', '엠씨소프트', 'A', 'game', '"리니쥐"로 리니지… 아니 떼돈을 번 게임사', { from: 1997 }),
  C('nexun', '넥순', 'A', 'game', '"바람의 나라"에서 "메이플스토리"… 아니 "메이플스토어"까지', { from: 1994 }),
  C('celltrium', '셀트리움', 'A', 'bio', '바이오시밀러로 뜬 송도의 거인', { from: 2002 }),
  C('hdheavy', '현데이중공업', 'A', 'heavy', '세계 1위 조선소. 울산의 거대한 골리앗 크레인', { from: 1972 }),
  C('coobang', '쿠빵', 'A', 'retail', '로켓… 아니 미사일 배송. 새벽에도 물류센터는 돈다', { from: 2010 }),
  C('baemin', '배달의겨레', 'B', 'retail', '"우리가 어떤 겨레입니까". 배달 앱 1위', { from: 2010 }),
  C('tosss', '토쓰', 'B', 'finance', '송금 버튼 하나로 은행을 흔든 핀테크', { from: 2013 }),
  C('gsretail', 'GZ리테일', 'B', 'retail', '편의점 GZ25… 동네마다 하나씩', { from: 1974 }),
  C('doosen', '두선', 'B', 'heavy', '맥주 회사에서 원전 설비까지', { from: 1896 }),
  C('amoreped', '아모래퍼시픽', 'B', 'chem', 'K-뷰티 원조 화장품 그룹', { from: 1945 }),
  C('kakaobank', '까까오뱅크', 'B', 'finance', '지점 없는 은행. 앱 하나로 대출까지', { from: 2017 }),
  C('crafton', '크래프툰', 'B', 'game', '배틀그라운드… 아니 "배틀필드그라운드"로 대박', { from: 2007 }),
  C('hanmi', '한미약풍', 'B', 'bio', '신약 기술수출로 뜬 제약사', { from: 1973 }),
];
export const COMPANY_BY_ID: Record<string, Company> = Object.fromEntries(COMPANIES.map((c) => [c.id, c]));

// ── 중견·중소·스타트업: 재밌는 이름을 지어 낸다 (같은 시드면 같은 이름) ──
const SME_HEAD = ['대박', '튼튼', '번개', '꿀잠', '왕창', '오뚝이', '반짝', '골목대장', '희망찬', '만년', '으랏차차', '든든', '알뜰', '쑥쑥', '방긋', '야무진', '똑소리', '불끈', '해뜰날', '부릉부릉', '뚝딱', '싱싱', '포근', '한방에', '척척', '반석', '미래', '태산', '청룡', '백호', '은하', '새벽별', '감나무', '돌다리', '두레박'];
const SME_TAIL = ['물산', '상사', '정밀', '철강', '산업', '제약', '식품', '테크', '물류', '기획', '에너지', '전자', '화학', '건설', '푸드', '유통', '소프트', '모터스', '디자인', '랩스'];
const STARTUP = ['마이리틀', '오늘의', '내일의', '데일리', '퀵', '루프', '픽셀', '넥스트', '하이퍼', '스테이', '모두의', '세상의 모든'];
const STARTUP_TAIL = ['컴퍼니', '랩', '스튜디오', '플랫폼', '웍스', 'AI', '로보틱스', '페이', '스페이스', '헬스케어'];
const MID_TAIL = ['홀딩스', '그룹', '산업', '기계', '정공', '인더스트리'];

/** 중견·중소·스타트업 이름을 하나 짓는다 */
export function smallCompany(s: GameState, tier: 'mid' | 'small' | 'startup'): Company {
  const name =
    tier === 'startup'
      ? `${pick(s, STARTUP)}${pick(s, ['당근', '고양이', '토끼', '달', '별', '구름', '파도', '숲', '바다'])} ${pick(s, STARTUP_TAIL)}`
      : tier === 'mid'
        ? `${pick(s, ['대한', '동방', '삼우', '한일', '세진', '광명', '태광', '우진', '성원', '동양'])}${pick(s, MID_TAIL)}`
        : `(주)${pick(s, SME_HEAD)}${pick(s, SME_TAIL)}`;
  const blurb =
    tier === 'startup'
      ? pick(s, ['직원 12명, 대표는 맨날 "곧 시리즈 B"라고 한다', '판교 공유오피스 한 칸. 간식은 무제한, 월급은 제한', '투자 유치에 성공하면 스톡옵션이 대박이라는데…'])
      : tier === 'mid'
        ? pick(s, ['대기업 1차 협력사. 탄탄하지만 갑의 눈치를 본다', '수출 강소기업 상을 받은 회사', '창업주 2세가 물려받아 키운 중견 회사'])
        : pick(s, ['사장님이 직접 면접을 본다. "가족 같은 회사"라고 한다', '공단 안 작은 공장. 점심은 사장님 사모님이 차려 준다', '직원 30명. 일은 많지만 칼퇴는 보장', '"야근은 없어요"라더니 매일 야근']);
  return { id: `${tier}:${name}`, name, tier, field: 'all', blurb };
}

/** 이 직업이 회사 이름을 갖는가 (월급쟁이) */
export const COMPANY_JOBS: Record<string, Company['field'][]> = {
  corp: ['tech', 'auto', 'chem', 'retail', 'heavy', 'food', 'telecom', 'air', 'media'],
  office: ['all'],
  sme_worker: ['all'],
  developer: ['tech', 'game'],
  game_dev: ['game', 'tech'],
  data_scientist: ['tech', 'finance'],
  chip_engineer: ['tech'],
  banker: ['finance'],
  analyst: ['finance', 'consult'],
  marketer: ['retail', 'food', 'media'],
  researcher: ['tech', 'bio', 'chem'],
  mech_engineer: ['auto', 'heavy'],
  big_factory: ['auto', 'heavy', 'tech'],
  hr: ['all'],
  sales: ['all'],
};

/** 학벌·전공·능력으로 갈 수 있는 회사 급 (높을수록 좋다) */
export function hireTier(s: GameState, p: Person, job: string): CoTier {
  const f = (x: string) => p.flags.includes(x);
  const stem = p.flags.some((x) => /^major:(cs|ee|eng|math|phys|chem|bio|stats|ai|mech)/.test(x)) || f('kaist');
  const score = (f('abroad_grad') || f('ivy') ? 40 : 0) + (f('univ_top') ? 40 : f('univ_seoul') ? 22 : f('univ_local') ? 6 : f('college') ? 0 : -8) + (f('kaist') ? 30 : 0) + (stem ? 6 : 0) + (f('phd') ? 8 : 0) + (p.actual.int - 60) / 3 + (p.actual.cha - 55) / 6 + markOf(p, 'network') * 2;
  if (job === 'sme_worker') return score > 30 ? 'mid' : 'small';
  if (job === 'office') return score > 45 ? 'B' : score > 25 ? 'mid' : 'small';
  const r = score + (chance(s, 0.5) ? 8 : -8);
  if (r >= 70 && (stem || f('abroad_grad') || f('ivy'))) return 'global';
  if (r >= 52) return 'S';
  if (r >= 36) return 'A';
  if (r >= 22) return 'B';
  if (r >= 10) return 'mid';
  return chance(s, 0.3) ? 'startup' : 'small';
}

/** 회사를 하나 정해 준다 */
export function pickCompany(s: GameState, p: Person, job: string, tier = hireTier(s, p, job)): Company {
  if (tier === 'mid' || tier === 'small' || tier === 'startup') return smallCompany(s, tier);
  const fields = COMPANY_JOBS[job] ?? ['all'];
  const year = s.year;
  const pool = COMPANIES.filter((c) => c.tier === tier && (c.from ?? 0) <= year && (fields.includes('all') || fields.includes(c.field)));
  const any = COMPANIES.filter((c) => c.tier === tier && (c.from ?? 0) <= year);
  return pick(s, pool.length ? pool : any.length ? any : COMPANIES.filter((c) => c.tier === 'A'));
}

/** 사람의 회사 (flag: co:<tier>:<id 또는 이름>) */
export function companyOf(p: Person): Company | undefined {
  const f = p.flags.find((x) => x.startsWith('co:'));
  if (!f) return undefined;
  const [, tier, ...rest] = f.split(':');
  const key = rest.join(':');
  return COMPANY_BY_ID[key] ?? { id: `${tier}:${key}`, name: key, tier: tier as CoTier, field: 'all', blurb: '' };
}
export function setCompany(p: Person, c: Company) {
  p.flags = p.flags.filter((x) => !x.startsWith('co:'));
  p.flags.push(`co:${c.tier}:${COMPANY_BY_ID[c.id] ? c.id : c.name}`);
}

/** 직업마다 PAY 표가 가정한 회사 급 (그 급이면 배수 1) */
const BASE_TIER: Record<string, CoTier> = { corp: 'A', office: 'mid', sme_worker: 'small' };
/** 회사 급에 따른 연봉 배수 (PAY 표 대비) */
export function companyPay(p: Person): number {
  const c = companyOf(p);
  if (!c || !COMPANY_JOBS[p.job]) return 1;
  return TIER_PAY[c.tier] / TIER_PAY[BASE_TIER[p.job] ?? 'B'];
}

/** 해마다: 월급쟁이에게 회사를 정해 주고(입사), 직업이 바뀌면 지운다 */
export function companyYear(s: GameState): void {
  for (const p of Object.values(s.people)) {
    if (p.deathYear !== undefined) continue;
    const has = p.flags.find((x) => x.startsWith('cojob:'));
    if (!COMPANY_JOBS[p.job]) {
      if (has) p.flags = p.flags.filter((x) => !x.startsWith('co:') && !x.startsWith('cojob:'));
      continue;
    }
    if (has === 'cojob:' + p.job) continue;
    let tier = hireTier(s, p, p.job);
    // 대기업 공채를 뚫었으면 적어도 대기업 계열사
    if (p.job === 'corp' && !['global', 'S', 'A', 'B'].includes(tier)) tier = 'B';
    const c = pickCompany(s, p, p.job, tier);
    setCompany(p, c);
    p.flags = p.flags.filter((x) => !x.startsWith('cojob:'));
    p.flags.push('cojob:' + p.job);
    if (!p.inLaw || p.id === s.headId) s.log.push({ year: s.year, text: `🏢 ${p.surname}${p.name} ${c.name} 입사 — ${TIER_NAME[c.tier]}${c.blurb ? ` · ${c.blurb}` : ''}`, kind: 'life' });
  }
}

// ════════════════ 회사 이야기: 어느 회사에 다니느냐에 따라 다른 일이 생긴다 ════════════════

const TIER_RANK: CoTier[] = ['small', 'startup', 'mid', 'B', 'A', 'S', 'global'];
const up = (t: CoTier): CoTier => TIER_RANK[Math.min(TIER_RANK.length - 1, TIER_RANK.indexOf(t) + 1)];
const W = (s: GameState, v: number) => Math.max(1, Math.round(v * wageIndex(s.year)));
const hp = (p: Person, d: number) => (p.happiness = clamp(p.happiness + d, 0, 100));
const nm = (c: Ctx) => fullName(c.p);
const co = (c: Ctx) => companyOf(c.p)!;
const ch = (c: Ctx, list: (Choice | false | undefined)[]) => gate(c.s, list.filter((x): x is Choice => !!x));

const CO_POACH: EventDef = {
  id: 'co_poach',
  title: () => '📞 헤드헌터의 전화',
  valid: (c) => !!companyOf(c.p),
  text: (c) => {
    const to = c.ev.data.to as Company;
    return `"${nm(c)} 님 맞으시죠? ${to.name}에서 경력직을 찾고 있습니다."\n${TIER_NAME[to.tier]} — ${to.blurb}\n지금 ${co(c).name}보다 연봉이 꽤 오른다. 대신 텃세도, 성과 압박도 세다.`;
  },
  choices: (c) => {
    const to = c.ev.data.to as Company;
    return ch(c, [
      { label: '면접을 본다', odds: undefined, run: (x) => (check(x.s, x.p.actual.int * 0.6 + x.p.actual.cha * 0.4, 60, 9) ? (setCompany(x.p, to), hp(x.p, 8), `합격! ${to.name}(으)로 옮겼다. 첫 출근 날 사원증 사진이 영 어색하다.`) : (hp(x.p, -4), '최종 면접에서 떨어졌다. "좋은 인연으로 다시 뵙길…"')) },
      { label: '지금 회사에 남는다', run: (x) => (hp(x.p, 2), `${co(x).name}에 남기로 했다. 팀장이 눈치를 챘는지 다음 달 연봉 협상에서 조금 더 챙겨 줬다.`) },
    ]);
  },
};

const CO_STARTUP_EXIT: EventDef = {
  id: 'co_startup_exit',
  title: () => '🚀 스타트업의 운명',
  valid: (c) => companyOf(c.p)?.tier === 'startup',
  text: (c) => `${co(c).name}이(가) 갈림길에 섰다. 대기업 인수설과 자금난 소문이 동시에 돈다. 받아 둔 스톡옵션이 휴지 조각이 될지, 집 한 채가 될지.`,
  choices: (c) =>
    ch(c, [
      { label: '끝까지 남는다 (스톡옵션)', run: (x) => {
        const r = int(x.s, 0, 99);
        if (r < 25) {
          const v = W(x.s, int(x.s, 30000, 120000));
          x.p.cash += v;
          hp(x.p, 20);
          return `🎉 ${pick(x.s, ['까까오', '네이바', '쿠빵', '삼송전자'])}이(가) 회사를 인수했다! 스톡옵션 대박 — ${Math.round(v / 10000)}억 원대 수익.`;
        }
        if (r < 65) return '투자를 겨우 받았다. 회사는 살아남았다. 스톡옵션은 아직 꿈.';
        x.p.job = 'none';
        x.p.jobLevel = 0;
        hp(x.p, -15);
        return '💥 폐업. 마지막 달 월급은 체불됐다. 노트북을 반납하고 나왔다.';
      } },
      { label: '대기업으로 탈출한다', run: (x) => (check(x.s, x.p.actual.int, 58, 10) ? (setCompany(x.p, pickCompany(x.s, x.p, x.p.job, 'B')), hp(x.p, 4), '스타트업 경력을 인정받아 대기업 계열사로 옮겼다. 연봉은 오르고, 회의는 길어졌다.') : (hp(x.p, -5), '지원한 곳마다 떨어졌다. 남기로 했다.')) },
    ]),
};

const CO_BONUS: EventDef = {
  id: 'co_bonus',
  title: () => '💸 성과급 시즌',
  valid: (c) => ['S', 'global'].includes(companyOf(c.p)?.tier ?? ''),
  text: (c) => `${co(c).name} 올해 실적이 역대급이다. 사내 게시판에 "성과급 ${int(c.s, 5, 15) * 100}%" 공지가 떴다. 동기 단톡방이 터진다.`,
  choices: (c) =>
    ch(c, [
      { label: '적금에 넣는다', run: (x) => { const v = W(x.s, int(x.s, 1500, 5000)); x.p.cash += v; hp(x.p, 6); return `통장에 ${Math.round(v)}만 원이 꽂혔다. 꾹 참고 적금으로.`; } },
      { label: '가족 여행을 간다', run: (x) => { const v = W(x.s, int(x.s, 1500, 5000)); x.p.cash += Math.round(v * 0.6); for (const q of Object.values(x.s.people)) if (alive(q) && isMainline(x.s, q)) hp(q, 5); return '성과급 절반으로 가족 여행을 다녀왔다. 아이들이 그 여름을 오래 기억했다.'; } },
    ]),
};

const CO_ABROAD: EventDef = {
  id: 'co_abroad',
  title: () => '✈ 본사 발령',
  valid: (c) => companyOf(c.p)?.tier === 'global' && !c.p.flags.includes('abroad_work'),
  text: (c) => `${co(c).name} 본사에서 ${nm(c)}을(를) 부른다. "${pick(c.s, ['실리콘밸리', '시애틀', '뉴욕', '런던', '도쿄', '싱가포르'])} 본사로 와 줄 수 있나요?" 연봉은 두 배 가까이, 대신 가족은…`,
  choices: (c) =>
    ch(c, [
      { label: '가족과 함께 떠난다', run: (x) => (addFlag(x.p, 'abroad_work'), x.p.jobLevel < 7 && (x.p.jobLevel += 1), hp(x.p, 8), '이삿짐을 컨테이너에 실었다. 아이들은 영어 이름을 하나씩 골랐다. (직급 +1)') },
      { label: '혼자 간다 (기러기)', run: (x) => (addFlag(x.p, 'abroad_work'), addFlag(x.p, 'goose_parent'), hp(x.p, -6), '공항에서 아이가 울었다. 매일 밤 영상통화로 잠든 얼굴을 본다.') },
      { label: '한국에 남는다', run: (x) => (hp(x.p, 2), '"가족이 먼저입니다." 본사는 아쉬워했다.') },
    ]),
};

const CO_SUCCESSION: EventDef = {
  id: 'co_sme_heir',
  title: () => '🏭 "자네가 맡아 주게"',
  valid: (c) => companyOf(c.p)?.tier === 'small',
  text: (c) => `${co(c).name} 사장님이 술잔을 내려놓았다. "자식들은 회사 물려받기 싫다더군. 20년 같이 일한 자네가 맡아 주면 좋겠네."`,
  choices: (c) =>
    ch(c, [
      { label: '회사를 인수한다', cost: 5000, run: (x) => ((x.p.job = 'sme_ceo'), (x.p.jobLevel = 1), (x.p.jobYears = 0), hp(x.p, 10), `${co(x).name} 사장이 됐다. 직원 30명의 월급이 이제 내 어깨에 있다.`) },
      { label: '정중히 거절한다', run: () => '"저는 월급쟁이가 체질인가 봅니다." 사장님은 쓸쓸히 웃었다.' },
    ]),
};

const CO_SCANDAL: EventDef = {
  id: 'co_scandal',
  title: () => '📰 회사가 뉴스에 나왔다',
  valid: (c) => ['S', 'A', 'B'].includes(companyOf(c.p)?.tier ?? ''),
  text: (c) => `${co(c).name} ${pick(c.s, ['오너 일가의 갑질 영상', '협력업체 단가 후려치기', '개인정보 유출', '노조 탄압 문건'])}이(가) 터졌다. 불매 운동이 번지고, 친구들이 "너네 회사 괜찮아?"라고 묻는다.`,
  choices: (c) =>
    ch(c, [
      { label: '사내 익명 게시판에 목소리를 낸다', run: (x) => (check(x.s, x.p.actual.mor, 55, 10) ? ((x.p.actual.mor = clamp(x.p.actual.mor + 3, 0, 100)), hp(x.p, 4), '글이 퍼져 회사가 공식 사과했다. 동료들이 몰래 커피를 사 줬다.') : (hp(x.p, -8), '글쓴이를 찾는다는 소문이 돈다. 한동안 숨죽였다.')) },
      { label: '조용히 일만 한다', run: (x) => (hp(x.p, -3), '묵묵히 출근했다. 회사 로고가 박힌 텀블러는 서랍에 넣었다.') },
    ]),
};

const CO_CRUNCH: EventDef = {
  id: 'co_crunch',
  title: () => '🔥 크런치 모드',
  valid: (c) => ['game', 'tech', 'consult', 'finance'].includes(companyOf(c.p)?.field ?? '') || c.p.job === 'game_dev',
  text: (c) => `${co(c).name}, 출시(마감) 한 달 전. "이번 달만 버티자"는 말이 석 달째다. 회사 소파가 침대가 됐다.`,
  choices: (c) =>
    ch(c, [
      { label: '끝까지 달린다', run: (x) => ((x.p.actual.hp = clamp(x.p.actual.hp - 6, 0, 100)), x.p.flags.push('crunch_' + x.s.year), check(x.s, x.p.actual.int, 55, 10) ? ((x.p.cash += W(x.s, 800)), '대성공! 특별 보너스를 받았다. 대신 흰머리가 늘었다.') : '결과는 그저 그랬다. 남은 건 허리 통증.') },
      { label: '칼퇴를 선언한다', run: (x) => (hp(x.p, 4), check(x.s, x.p.actual.cha, 55, 10) ? '"제 시간에 끝내겠습니다." 정말로 끝냈다. 팀장이 할 말을 잃었다.' : '팀장의 눈빛이 차가워졌다. 고과가 걱정이다.') },
    ]),
};

export const COMPANY_EVENTS: EventDef[] = [CO_POACH, CO_STARTUP_EXIT, CO_BONUS, CO_ABROAD, CO_SUCCESSION, CO_SCANDAL, CO_CRUNCH];

/** 해마다 한 번: 직계 월급쟁이 한 명에게 회사 이야기 (30%) */
export function companyStoryYear(s: GameState) {
  if (s.events.length > 3 || !chance(s, 0.3)) return;
  const workers = Object.values(s.people).filter((p) => alive(p) && (isMainline(s, p) || p.id === head(s).id) && companyOf(p) && age(s, p) >= 23 && p.jobYears >= 1);
  if (!workers.length) return;
  const p = pick(s, workers);
  const c = companyOf(p)!;
  const seen = (s.storySeen ??= {});
  const ok = (id: string, cool: number) => s.year - (seen[`${id}:${p.id}`] ?? -99) >= cool;
  const pool: [string, number, Record<string, unknown>?][] = [];
  if (c.tier !== 'global' && ok('co_poach', 6) && p.actual.int + p.actual.cha >= 120 && p.jobYears >= 3) pool.push(['co_poach', 1.2, { to: pickCompany(s, p, p.job, up(c.tier)) }]);
  if (c.tier === 'startup' && ok('co_startup_exit', 99) && p.jobYears >= 2) pool.push(['co_startup_exit', 2]);
  if ((c.tier === 'S' || c.tier === 'global') && ok('co_bonus', 4)) pool.push(['co_bonus', 1]);
  if (c.tier === 'global' && ok('co_abroad', 99) && !p.flags.includes('abroad_work')) pool.push(['co_abroad', 0.8]);
  if (c.tier === 'small' && p.jobYears >= 12 && age(s, p) >= 40 && ok('co_sme_heir', 99)) pool.push(['co_sme_heir', 1]);
  if (['S', 'A', 'B'].includes(c.tier) && ok('co_scandal', 10)) pool.push(['co_scandal', 0.5]);
  if ((['game', 'tech', 'consult', 'finance'].includes(c.field) || p.job === 'game_dev') && ok('co_crunch', 5)) pool.push(['co_crunch', 0.7]);
  if (!pool.length) return;
  const tot = pool.reduce((t, x) => t + x[1], 0);
  let r = int(s, 0, 9999) / 10000 * tot;
  const [id, , data] = pool.find((x) => (r -= x[1]) <= 0) ?? pool[pool.length - 1];
  seen[`${id}:${p.id}`] = s.year;
  s.events.push({ uid: s.eventSeq++, defId: id, personId: p.id, data: data ?? {} });
}
