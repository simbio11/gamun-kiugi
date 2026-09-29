import type { AssetKind, CareerTag, JobId, StatKey, Stats, TalentId } from './types';

export const STAT_KEYS: StatKey[] = ['str', 'int', 'cha', 'mor', 'hp'];
export const STAT_NAMES: Record<StatKey, string> = {
  str: '근력',
  int: '지능',
  cha: '매력',
  mor: '성품',
  hp: '건강',
};

export interface TalentDef {
  id: TalentId;
  name: string;
  desc: string;
  stat?: StatKey;
  mult: number;
  tag: CareerTag;
}

export const TALENTS: Record<TalentId, TalentDef> = {
  genius: { id: 'genius', name: '수재', desc: '공부가 쏙쏙 들어온다. 지능 성장 ×1.8', stat: 'int', mult: 1.8, tag: 'study' },
  athlete: { id: 'athlete', name: '운동신경', desc: '몸 쓰는 일은 타고났다. 근력 성장 ×1.8', stat: 'str', mult: 1.8, tag: 'sport' },
  star: { id: 'star', name: '스타성', desc: '눈길을 끄는 무언가가 있다. 매력 성장 ×1.5', stat: 'cha', mult: 1.5, tag: 'stage' },
  merchant: { id: 'merchant', name: '장사꾼', desc: '돈 냄새를 잘 맡는다. 창업·투자 판정 유리', mult: 1, tag: 'business' },
  artist: { id: 'artist', name: '예술혼', desc: '손끝에서 무언가가 태어난다. 매력 성장 ×1.2, 화가로 걸작 확률↑', stat: 'cha', mult: 1.2, tag: 'stage' },
};
export const TALENT_IDS = Object.keys(TALENTS) as TalentId[];

export type JobKind = 'fixed' | 'salary' | 'business' | 'creator' | 'athlete';

export interface JobDef {
  id: JobId;
  name: string;
  kind: JobKind;
  /** 연봉 기준 (만원) */
  base: number;
  /** 레벨당 연봉 증가 (만원) */
  perLevel: number;
  maxLevel: number;
  fame: number;
  color: string;
  /** 정년·은퇴 나이 (0 = 해당 없음) */
  retireAge: number;
  /** 연간 승진 기본 확률 (salary) */
  promote?: number;
  /** 수입·승진에 쓰이는 능력치 가중치 (합 1) */
  stats?: Partial<Stats>;
  /** 레벨별 직함 */
  titles?: string[];
}

const J = (d: Omit<JobDef, 'id'>) => d;

export const JOBS: Record<JobId, JobDef> = {
  none: { id: 'none', ...J({ name: '백수', kind: 'fixed', base: 1200, perLevel: 0, maxLevel: 0, fame: -0.5, color: '#8a8a8a', retireAge: 65 }) },
  parttime: { id: 'parttime', ...J({ name: '알바', kind: 'fixed', base: 1900, perLevel: 0, maxLevel: 0, fame: -0.2, color: '#d98c3a', retireAge: 65 }) },
  pension: { id: 'pension', ...J({ name: '은퇴', kind: 'fixed', base: 1500, perLevel: 0, maxLevel: 0, fame: 0, color: '#6b5b4b', retireAge: 0 }) },

  office: { id: 'office', ...J({ name: '회사원', kind: 'salary', base: 3000, perLevel: 600, maxLevel: 5, fame: 0, color: '#34506e', retireAge: 60, promote: 0.14, stats: { int: 0.5, cha: 0.3, mor: 0.2 }, titles: ['사원', '주임', '대리', '과장', '차장', '부장'] }) },
  corp: { id: 'corp', ...J({ name: '대기업 직원', kind: 'salary', base: 5000, perLevel: 1400, maxLevel: 6, fame: 0.5, color: '#1f3b5c', retireAge: 58, promote: 0.13, stats: { int: 0.5, cha: 0.3, mor: 0.2 }, titles: ['사원', '대리', '과장', '차장', '부장', '상무', '전무'] }) },
  civil: { id: 'civil', ...J({ name: '공무원', kind: 'salary', base: 3100, perLevel: 650, maxLevel: 6, fame: 1, color: '#2b3a67', retireAge: 65, promote: 0.12, stats: { int: 0.5, mor: 0.5 }, titles: ['9급', '8급', '7급', '6급', '5급 사무관', '4급 서기관', '3급 부이사관'] }) },
  police: { id: 'police', ...J({ name: '경찰관', kind: 'salary', base: 3400, perLevel: 700, maxLevel: 6, fame: 1, color: '#243a73', retireAge: 60, promote: 0.12, stats: { str: 0.4, mor: 0.4, int: 0.2 }, titles: ['순경', '경장', '경사', '경위', '경감', '경정', '총경'] }) },
  firefighter: { id: 'firefighter', ...J({ name: '소방관', kind: 'salary', base: 3500, perLevel: 650, maxLevel: 5, fame: 1.5, color: '#b8452d', retireAge: 60, promote: 0.11, stats: { str: 0.5, hp: 0.3, mor: 0.2 }, titles: ['소방사', '소방교', '소방장', '소방위', '소방경', '소방령'] }) },
  teacher: { id: 'teacher', ...J({ name: '교사', kind: 'salary', base: 3300, perLevel: 700, maxLevel: 4, fame: 1, color: '#4e7a5a', retireAge: 62, promote: 0.08, stats: { int: 0.4, mor: 0.4, cha: 0.2 }, titles: ['교사', '부장교사', '교감', '교장', '교육장'] }) },
  public_corp: { id: 'public_corp', ...J({ name: '공기업 직원', kind: 'salary', base: 4500, perLevel: 900, maxLevel: 5, fame: 0.5, color: '#3e5a7a', retireAge: 60, promote: 0.12, stats: { int: 0.6, mor: 0.4 }, titles: ['6급', '5급', '4급', '3급', '2급', '1급'] }) },
  officer: { id: 'officer', ...J({ name: '직업군인', kind: 'salary', base: 3600, perLevel: 1000, maxLevel: 6, fame: 1.5, color: '#4b5a2e', retireAge: 56, promote: 0.1, stats: { str: 0.4, mor: 0.4, int: 0.2 }, titles: ['소위', '중위', '대위', '소령', '중령', '대령', '장군'] }) },
  developer: { id: 'developer', ...J({ name: '개발자', kind: 'salary', base: 4200, perLevel: 1500, maxLevel: 5, fame: 0.3, color: '#2d2d3a', retireAge: 60, promote: 0.15, stats: { int: 0.9, mor: 0.1 }, titles: ['주니어', '미들', '시니어', '리드', '아키텍트', 'CTO'] }) },
  journalist: { id: 'journalist', ...J({ name: '기자', kind: 'salary', base: 3800, perLevel: 900, maxLevel: 5, fame: 1.5, color: '#5a4a6e', retireAge: 60, promote: 0.1, stats: { int: 0.5, cha: 0.5 }, titles: ['수습기자', '기자', '차장', '부장', '논설위원', '편집국장'] }) },
  pilot: { id: 'pilot', ...J({ name: '파일럿', kind: 'salary', base: 7000, perLevel: 3000, maxLevel: 3, fame: 1, color: '#223355', retireAge: 65, promote: 0.1, stats: { hp: 0.4, int: 0.4, str: 0.2 }, titles: ['부기장', '기장', '선임기장', '수석기장'] }) },

  doctor: { id: 'doctor', ...J({ name: '의사', kind: 'salary', base: 9000, perLevel: 3500, maxLevel: 6, fame: 2, color: '#e8e8e8', retireAge: 72, promote: 0.12, stats: { int: 0.6, mor: 0.2, cha: 0.2 }, titles: ['봉직의', '전문의', '과장', '부원장', '원장', '병원장', '의료재단 이사장'] }) },
  pharmacist: { id: 'pharmacist', ...J({ name: '약사', kind: 'salary', base: 6000, perLevel: 1500, maxLevel: 3, fame: 1, color: '#dfe8e0', retireAge: 72, promote: 0.1, stats: { int: 0.5, cha: 0.3, mor: 0.2 }, titles: ['근무약사', '약국 개업', '대형 약국', '약국 체인'] }) },
  nurse: { id: 'nurse', ...J({ name: '간호사', kind: 'salary', base: 3800, perLevel: 700, maxLevel: 4, fame: 1, color: '#f2f2f7', retireAge: 60, promote: 0.1, stats: { mor: 0.5, hp: 0.3, int: 0.2 }, titles: ['간호사', '책임간호사', '수간호사', '간호부장', '간호이사'] }) },
  lawyer: { id: 'lawyer', ...J({ name: '변호사', kind: 'salary', base: 7000, perLevel: 3000, maxLevel: 5, fame: 1.5, color: '#1f1f2e', retireAge: 72, promote: 0.13, stats: { int: 0.6, cha: 0.4 }, titles: ['어쏘 변호사', '시니어', '파트너', '에쿼티 파트너', '대표변호사', '로펌 회장'] }) },
  accountant: { id: 'accountant', ...J({ name: '회계사', kind: 'salary', base: 6000, perLevel: 2000, maxLevel: 5, fame: 1, color: '#2e3f3a', retireAge: 70, promote: 0.13, stats: { int: 0.8, mor: 0.2 }, titles: ['수습', '시니어', '매니저', '이사', '파트너', '대표'] }) },
  professor: { id: 'professor', ...J({ name: '교수', kind: 'salary', base: 5500, perLevel: 1200, maxLevel: 4, fame: 2.5, color: '#6b4a2b', retireAge: 65, promote: 0.1, stats: { int: 0.8, mor: 0.2 }, titles: ['조교수', '부교수', '정교수', '석좌교수', '총장'] }) },

  founder: { id: 'founder', ...J({ name: '창업가', kind: 'business', base: 0, perLevel: 0, maxLevel: 5, fame: 1, color: '#6a3d8f', retireAge: 72 }) },
  shopkeeper: { id: 'shopkeeper', ...J({ name: '자영업자', kind: 'business', base: 0, perLevel: 0, maxLevel: 3, fame: 0, color: '#a0522d', retireAge: 70, titles: ['동네 가게', '단골 맛집', '2호점', '프랜차이즈'] }) },

  youtuber: { id: 'youtuber', ...J({ name: '유튜버', kind: 'creator', base: 0, perLevel: 0, maxLevel: 5, fame: 0.5, color: '#c8322d', retireAge: 0, titles: ['구독자 100명', '구독자 1만', '구독자 10만', '구독자 50만', '골드버튼 100만', '구독자 500만'] }) },
  entertainer: { id: 'entertainer', ...J({ name: '연예인', kind: 'creator', base: 0, perLevel: 0, maxLevel: 5, fame: 2, color: '#d9559b', retireAge: 0, titles: ['무명', '조연', '주연', '흥행 스타', '국민 스타', '월드 스타'] }) },
  gamer: { id: 'gamer', ...J({ name: '프로게이머', kind: 'creator', base: 0, perLevel: 0, maxLevel: 5, fame: 1, color: '#3a3a8c', retireAge: 0, titles: ['연습생', '2군', '1군', '주전', '국가대표', '월드 챔피언'] }) },
  writer: { id: 'writer', ...J({ name: '웹툰·웹소설 작가', kind: 'creator', base: 0, perLevel: 0, maxLevel: 5, fame: 1, color: '#6e8a3a', retireAge: 0, titles: ['지망생', '신인 연재', '인기 연재', '베스트셀러', '드라마화', '글로벌 IP'] }) },
  musician: { id: 'musician', ...J({ name: '음악가', kind: 'creator', base: 0, perLevel: 0, maxLevel: 5, fame: 1.5, color: '#7a3a6e', retireAge: 0, titles: ['인디', '세션', '정규 앨범', '음원 차트', '전국 투어', '거장'] }) },
  painter: { id: 'painter', ...J({ name: '화가', kind: 'creator', base: 0, perLevel: 0, maxLevel: 5, fame: 1.5, color: '#c9a227', retireAge: 0, titles: ['무명 화가', '단체전', '개인전', '미술관 초대', '국전 대상', '거장'] }) },
  athlete: { id: 'athlete', ...J({ name: '운동선수', kind: 'athlete', base: 3000, perLevel: 4000, maxLevel: 5, fame: 2, color: '#2f7d4a', retireAge: 0 }) },

  politician: { id: 'politician', ...J({ name: '정치인', kind: 'fixed', base: 15000, perLevel: 3000, maxLevel: 4, fame: 4, color: '#1c4f8f', retireAge: 0, titles: ['초선', '재선', '3선', '4선', '5선'] }) },
};

/**
 * 창작·연예 직업: 뜨기 전까지는 수입이 거의 없다.
 * 레벨별 연수입(만원), 뜨는 확률 = (base + 주능력치/div + 재능 + 투자) × 0.8^레벨
 */
export interface CreatorDef {
  incomes: number[];
  stat: StatKey;
  talent: TalentId;
  base: number;
  div: number;
}
export const CREATORS: Partial<Record<JobId, CreatorDef>> = {
  youtuber: { incomes: [60, 700, 3000, 9000, 25000, 70000], stat: 'cha', talent: 'star', base: 0.012, div: 2000 },
  entertainer: { incomes: [500, 2500, 7000, 18000, 45000, 120000], stat: 'cha', talent: 'star', base: 0.02, div: 1600 },
  gamer: { incomes: [0, 2000, 5000, 12000, 30000, 60000], stat: 'int', talent: 'athlete', base: 0.05, div: 900 },
  writer: { incomes: [100, 1500, 5000, 13000, 30000, 70000], stat: 'int', talent: 'artist', base: 0.015, div: 1800 },
  musician: { incomes: [400, 1800, 4000, 10000, 25000, 60000], stat: 'cha', talent: 'artist', base: 0.02, div: 1800 },
  painter: { incomes: [200, 900, 2500, 6000, 12000, 25000], stat: 'cha', talent: 'artist', base: 0.02, div: 1800 },
};

/**
 * 시험·공채. 붙을 때까지 매년 도전(준비 방식 선택)하거나 포기한다.
 * 점수 = 능력치 가중합 + 준비 보너스 + 경험(재수) 보너스 → 합격선과 비교
 */
export interface ExamDef {
  name: string;
  job: JobId;
  level: number;
  stats: Partial<Stats>;
  pass: number;
  /** 대학 졸업 필요 */
  univ?: boolean;
  /** 이 플래그가 있으면 +8 */
  bonusFlags?: string[];
  /** 최대 응시 횟수 (변호사시험 5회) */
  maxTries?: number;
  desc: string;
}
export const EXAMS: Record<string, ExamDef> = {
  corp: { name: '대기업 공채', job: 'corp', level: 0, stats: { int: 0.6, cha: 0.4 }, pass: 60, univ: true, bonusFlags: ['univ_top'], desc: '서류·인적성·면접. 스펙 싸움이다.' },
  public_corp: { name: '공기업 NCS', job: 'public_corp', level: 0, stats: { int: 0.8, mor: 0.2 }, pass: 60, univ: true, desc: '신의 직장. 경쟁률이 수백 대 일.' },
  civil: { name: '9급 공무원 시험', job: 'civil', level: 0, stats: { int: 0.6, mor: 0.4 }, pass: 54, desc: '철밥통을 향한 공시생의 길.' },
  civil5: { name: '5급 행정고시', job: 'civil', level: 4, stats: { int: 1 }, pass: 76, univ: true, bonusFlags: ['univ_top'], desc: '합격하면 바로 사무관.' },
  police: { name: '경찰 공무원 시험', job: 'police', level: 0, stats: { int: 0.4, str: 0.4, mor: 0.2 }, pass: 50, desc: '필기에 체력 시험까지.' },
  firefighter: { name: '소방 공무원 시험', job: 'firefighter', level: 0, stats: { str: 0.5, hp: 0.3, int: 0.2 }, pass: 50, desc: '체력이 곧 실력.' },
  teacher: { name: '교원 임용고시', job: 'teacher', level: 0, stats: { int: 0.6, mor: 0.4 }, pass: 60, univ: true, bonusFlags: ['edu_school'], desc: '교대·사범대 출신이 유리하다.' },
  accountant: { name: 'CPA (공인회계사)', job: 'accountant', level: 0, stats: { int: 1 }, pass: 70, univ: true, desc: '숫자와의 전쟁.' },
  journalist: { name: '언론고시', job: 'journalist', level: 0, stats: { int: 0.5, cha: 0.5 }, pass: 64, univ: true, bonusFlags: ['univ_top'], desc: '논술·작문·면접.' },
  developer: { name: 'IT 기업 코딩테스트', job: 'developer', level: 0, stats: { int: 1 }, pass: 58, desc: '알고리즘 문제를 풀어야 한다.' },
  pilot: { name: '항공사 조종사 채용', job: 'pilot', level: 0, stats: { hp: 0.4, int: 0.4, str: 0.2 }, pass: 62, bonusFlags: ['flight_school'], desc: '비행 교육 이수 후 채용 시험.' },
  bar: { name: '변호사 시험', job: 'lawyer', level: 0, stats: { int: 1 }, pass: 60, maxTries: 5, desc: '로스쿨 졸업 후 5년 안에 5번만 볼 수 있다.' },
  professor: { name: '교수 임용', job: 'professor', level: 0, stats: { int: 0.8, mor: 0.2 }, pass: 72, desc: '논문 실적과 인맥의 싸움. 자리가 잘 안 난다.' },
  nurse: { name: '간호사 국가고시', job: 'nurse', level: 0, stats: { int: 0.6, mor: 0.4 }, pass: 38, desc: '대부분 붙는다.' },
  pharmacist: { name: '약사 국가고시', job: 'pharmacist', level: 0, stats: { int: 1 }, pass: 45, desc: '대부분 붙는다.' },
};

/** 시험 준비 방식: [이름, 비용(만원), 점수 보너스] */
export const PREP_TIERS: [string, number, number][] = [
  ['독학', 0, 0],
  ['인강', 200, 4],
  ['학원', 800, 8],
  ['1타 강사 + 고시원 올인', 2500, 13],
];

export const TAG_NAMES: Record<CareerTag, string> = {
  study: '공부로 성공하기',
  sport: '운동선수',
  stage: '스타가 되기',
  business: '사업가',
  public: '나라를 위해 일하기',
  free: '자유롭게 살기',
};

export const MALE_NAMES = ['민준', '서준', '도윤', '예준', '시우', '주원', '하준', '지호', '준서', '건우', '현우', '우진', '선우', '연우', '유준', '정우', '승우', '승현', '시윤', '준혁', '은우', '지환', '승민', '지우', '유찬', '윤우', '민성', '준영', '시후', '진우', '태윤', '동현', '재원', '성민', '한결'];
export const FEMALE_NAMES = ['서연', '서윤', '지우', '서현', '민서', '하은', '하윤', '윤서', '지유', '지민', '채원', '지원', '수아', '다은', '예은', '수빈', '소율', '예린', '지아', '시은', '소윤', '유나', '예원', '윤아', '가은', '다인', '아린', '하린', '채은', '나은', '서아', '연우', '은서', '민지', '수연'];
export const SURNAMES = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황', '안', '송', '류', '홍'];

/** 실제 한국 상속·증여세율 단순화: [과세표준 상한(만원), 세율] */
export const TAX_BRACKETS: [number, number][] = [
  [10000, 0.1],
  [50000, 0.2],
  [100000, 0.3],
  [300000, 0.4],
  [Infinity, 0.5],
];

export const INHERIT_BASIC_DEDUCTION = 50000; // 일괄공제 5억
export const INHERIT_SPOUSE_DEDUCTION = 50000; // 배우자공제 최소 5억
export const GIFT_EXEMPT_ADULT = 5000; // 성인 자녀 10년 5천만
export const GIFT_EXEMPT_MINOR = 2000; // 미성년 자녀 10년 2천만
export const GIFT_EXEMPT_SPOUSE = 60000; // 배우자 10년 6억
/** 손주에게 바로 주면(세대생략) 세액 30% 할증 */
export const GENERATION_SKIP_SURCHARGE = 0.3;
/** 세무사: 공제 항목을 샅샅이 챙겨 과세표준을 줄여줌 */
export const ADVISOR_BASE_CUT = 0.12;

/**
 * 세법상 평가 비율. 부동산은 기준시가(시가의 70%), 예술품은 감정가가 애매해서 더 낮게 잡힌다.
 * 주식·코인은 시가 그대로 → 절세 여지 없음.
 */
export const ASSESS_RATIO: Record<AssetKind, number> = {
  apt_seoul: 0.7,
  apt_local: 0.7,
  land: 0.7,
  stock: 1,
  coin: 1,
  art: 0.5,
};
/** 연 수익률 (임대료·배당) */
export const ASSET_YIELD: Record<AssetKind, number> = {
  apt_seoul: 0.025,
  apt_local: 0.025,
  land: 0.02,
  stock: 0.02,
  coin: 0,
  art: 0,
};

export const ASSET_NAMES: Record<AssetKind, string> = {
  apt_seoul: '강남 아파트',
  apt_local: '지방 아파트',
  land: '종가 토지',
  stock: '주식',
  coin: '코인',
  art: '예술품',
};
export const ASSET_ICONS: Record<AssetKind, string> = {
  apt_seoul: '🏙',
  apt_local: '🏠',
  land: '🌾',
  stock: '📈',
  coin: '🪙',
  art: '🖼',
};
export const REAL_ESTATE: readonly AssetKind[] = ['apt_seoul', 'apt_local', 'land'];

/** 예술품 등급: 가격(만원), 위작 확률 */
export const ART_TIERS = [
  { name: '신진 작가 작품', price: 3000, fake: 0.03 },
  { name: '중견 작가 작품', price: 30000, fake: 0.08 },
  { name: '거장의 작품', price: 300000, fake: 0.15 },
] as const;
/** 주식·코인 매수 단위 (만원) */
export const TRADE_UNITS = [1000, 10000, 100000];

export const EDU_COST = [0, 300, 1200, 3000];
export const BUDGET_NAMES = ['없음', '기본', '사교육', '올인'];
export const FOCUS_NAMES = { study: '공부', sport: '운동', art: '예체능', character: '인성', free: '자유' } as const;
export const LIFESTYLE_NAMES = { work: '일 중심', balance: '균형', family: '가정 중심', self: '자기계발', rest: '요양' } as const;
export const LIVING_NAMES = { frugal: '검소', normal: '보통', lux: '호화' } as const;
export const WILL_NAMES = { legal: '법정상속 (배우자 1.5 : 자녀 1)', heir: '후계자에게 몰아주기', equal: '자녀 균등 분배' } as const;

export const ACHIEVEMENTS: Record<string, { name: string; desc: string }> = {
  second_gen: { name: '대를 잇다', desc: '처음으로 가주가 바뀌었다' },
  doctor3: { name: '3대째 의사', desc: '직계 3세대 연속 의사 배출' },
  rich100: { name: '백억 가문', desc: '가문 총자산 100억 달성' },
  taxsaver: { name: '절세의 달인', desc: '20억 이상 상속에서 실효세율 10% 이하' },
  dragon: { name: '개천에서 용', desc: '서민 가문에서 의대 진학' },
  noble_idle: { name: '백수 귀족', desc: '백수로 살면서 개인 재산 10억 보유' },
  rich1000: { name: '재벌의 탄생', desc: '가문 총자산 1,000억 달성' },
  century: { name: '100년 가문', desc: '가문 창립 후 100년 경과' },
  gangnam3: { name: '강남 종가', desc: '3대 연속 가주가 강남 아파트 보유' },
  star_family: { name: '스타 가문', desc: '연예인·운동선수·유튜버를 모두 배출' },
  sa_family: { name: '사(士)자 집안', desc: '의사·변호사·교수가 한 시대에 함께' },
  politics: { name: '정치 명문', desc: '가문에서 정치인 배출' },
  masterpiece: { name: '불후의 명작', desc: '가문의 화가가 걸작을 남기다' },
  coin_rich: { name: '코인 부자', desc: '코인 평가액 10억 돌파' },
  collector: { name: '컬렉터', desc: '진품 예술품 5점 보유' },
  forgery: { name: '비싼 수업료', desc: '위작을 샀다' },
  big_family: { name: '대가족', desc: '한 부부가 자녀 5명을 두다' },
  idle3: { name: '백수 3대', desc: '3대 연속 백수로 살아남기' },
};
