import type { AssetKind, CareerTag, StatKey, TalentId } from './types';

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

export * from './jobs';

/** 성격. 짝(opp)끼리는 함께 가질 수 없다 */
export interface TraitDef {
  name: string;
  desc: string;
  opp?: string;
  good: boolean;
}
export const TRAITS: Record<string, TraitDef> = {
  diligent: { name: '성실', desc: '승진·시험에 유리', opp: 'lazy', good: true },
  lazy: { name: '게으름', desc: '승진·시험에 불리', opp: 'diligent', good: false },
  cheerful: { name: '낙천적', desc: '행복도가 잘 안 떨어진다', opp: 'anxious', good: true },
  anxious: { name: '예민함', desc: '행복도가 쉽게 떨어진다. 우울증 주의', opp: 'cheerful', good: false },
  social: { name: '사교적', desc: '연애·영업·선거에 유리', opp: 'shy', good: true },
  shy: { name: '내성적', desc: '연애가 어렵다. 연구엔 집중력', opp: 'social', good: false },
  filial: { name: '효심', desc: '부모와의 관계도가 잘 오른다', opp: 'rebel', good: true },
  rebel: { name: '반항적', desc: '사춘기가 거세다', opp: 'filial', good: false },
  frugal: { name: '짠돌이', desc: '생활비를 아낀다', opp: 'spender', good: true },
  spender: { name: '낭비벽', desc: '돈이 줄줄 샌다', opp: 'frugal', good: false },
  gambler: { name: '한탕주의', desc: '도박·투기에 끌린다', good: false },
  flirt: { name: '바람기', desc: '이성에게 인기지만 가정이 위태롭다', opp: 'devoted', good: false },
  devoted: { name: '일편단심', desc: '부부 금슬이 좋다', opp: 'flirt', good: true },
  leader: { name: '리더십', desc: '선거·조직에서 두각', good: true },
  tough: { name: '강골', desc: '늙어도 건강하다. 병에 강함', opp: 'frail', good: true },
  frail: { name: '병약함', desc: '잔병치레가 잦다', opp: 'tough', good: false },
  ambitious: { name: '야심가', desc: '출세욕이 강하다. 명성 획득↑', good: true },
};
export const TRAIT_IDS = Object.keys(TRAITS);

export const TAG_NAMES: Record<CareerTag, string> = {
  study: '공부로 성공',
  sport: '운동선수',
  stage: '스타 (연예인·크리에이터)',
  business: '사업가',
  public: '나라를 위한 일 (공무원·군인·정치)',
  free: '자유로운 삶',
};

/** 아이가 장래희망을 말할 때 (분야마다 여러 가지, 나이에 맞는 말투) */
export const DREAM_QUOTES: Record<CareerTag, string[]> = {
  study: ['나는 커서 박사님이 될 거야!', '공부 열심히 해서 엄마 아빠 호강시켜 줄 거야!', '나중에 의사 선생님이 되고 싶어!', '과학자가 돼서 로봇을 만들 거야!', '판사가 돼서 나쁜 사람을 혼내 줄 거야!'],
  sport: ['나는 국가대표가 될 거야!', '손흥민 같은 축구 선수가 되고 싶어!', '올림픽에서 금메달 딸 거야!', '프로야구 선수가 돼서 홈런 칠 거야!', '태권도 사범님이 될 거야!'],
  stage: ['나는 커서 아이돌이 될 거야!', 'TV에 나오는 배우가 되고 싶어!', '유튜버가 돼서 구독자 백만 명 모을 거야!', '가수가 돼서 큰 무대에서 노래할 거야!', '웹툰 작가가 되고 싶어!'],
  business: ['나는 사장님이 될 거야!', '회사를 차려서 부자가 될 거야!', '빵집 사장님이 되고 싶어!', '게임 회사를 만들 거야!', '건물주가 될 거야!'],
  public: ['나는 경찰관이 되고 싶어!', '소방관이 돼서 사람들을 구할 거야!', '대통령이 될 거야!', '선생님이 되고 싶어!', '군인이 돼서 나라를 지킬 거야!'],
  free: ['나는 그냥 하고 싶은 거 하면서 살래!', '세계 여행하면서 살 거야!', '회사 안 다니고 자유롭게 살 거야!', '고양이 키우면서 시골에서 살래!', '아직 모르겠어. 천천히 찾아볼래!'],
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
  building: 0.7,
  stock: 1,
  coin: 1,
  art: 0.5,
  vehicle: 1,
};
export const ASSET_NAMES: Record<AssetKind, string> = {
  apt_seoul: '강남 아파트',
  apt_local: '지방 아파트',
  land: '종가 토지',
  building: '상가 건물',
  stock: '주식',
  coin: '코인',
  art: '예술품',
  vehicle: '자동차',
};
export const ASSET_ICONS: Record<AssetKind, string> = {
  apt_seoul: '🏙',
  apt_local: '🏠',
  land: '🌾',
  building: '🏢',
  stock: '📈',
  coin: '🪙',
  art: '🖼',
  vehicle: '🚗',
};
export const REAL_ESTATE: readonly AssetKind[] = ['apt_seoul', 'apt_local', 'land', 'building'];

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

export type AchvCat = '가문' | '결혼·자녀' | '학업' | '출세' | '영광' | '재산' | '인생';
const A = (cat: AchvCat, name: string, desc: string) => ({ cat, name, desc });
export const ACHIEVEMENTS: Record<string, { cat: AchvCat; name: string; desc: string }> = {
  // 가문
  second_gen: A('가문', '대를 잇다', '처음으로 가주가 바뀌었다'),
  gen5: A('가문', '5대 가주', '5대째 가주에 이르다'),
  gen10: A('가문', '10대 명가', '10대째 가주에 이르다'),
  century: A('가문', '100년 가문', '가문 창립 후 100년 경과'),
  bicentury: A('가문', '200년 가문', '가문 창립 후 200년 경과'),
  great_grandchild: A('가문', '증손 보기', '가주가 살아서 증손주를 보다'),
  five_gen: A('가문', '5대가 한자리에', '고조부모부터 고손까지 5대가 동시에 살아 있다'),
  centenarian: A('가문', '백세 장수', '가문에서 100세 어른이 나오다'),
  gangnam3: A('가문', '강남 종가', '3대 연속 가주가 강남 아파트 보유'),
  adopted_heir: A('가문', '양자 입적', '대가 끊길 위기에 조카를 양자로 들이다'),
  mission10: A('가문', '대업', '세대 미션 10개 달성'),
  jobs10: A('가문', '직업 도감 10', '가문에서 10가지 직업을 거치다'),
  jobs30: A('가문', '직업 도감 30', '가문에서 30가지 직업을 거치다'),
  jobs60: A('가문', '직업 도감 60', '가문에서 60가지 직업을 거치다'),
  // 결혼·자녀
  sons3: A('결혼·자녀', '아들만 셋', '한 부부가 아들만 셋 이상'),
  daughters3: A('결혼·자녀', '딸 부잣집', '한 부부가 딸만 셋 이상'),
  big_family: A('결혼·자녀', '대가족', '한 부부가 자녀 5명을 두다'),
  twins: A('결혼·자녀', '쌍둥이', '가문에 쌍둥이가 태어나다'),
  ivf: A('결혼·자녀', '기다림 끝에', '시험관 시술로 아이를 얻다'),
  adopted: A('결혼·자녀', '가슴으로 낳은 아이', '아이를 입양하다'),
  golden_wedding: A('결혼·자녀', '금혼식', '결혼 50주년을 함께 맞다'),
  young_marriage: A('결혼·자녀', '일찍 철든', '25세 이전에 결혼'),
  late_marriage: A('결혼·자녀', '늦깎이 신랑신부', '45세 이후에 결혼'),
  remarriage: A('결혼·자녀', '두 번째 봄', '재혼하다'),
  gray_divorce: A('결혼·자녀', '황혼이혼', '결혼 30년 만에 갈라서다'),
  // 학업
  dragon: A('학업', '개천에서 용', '서민 가문에서 의대 진학'),
  top3: A('학업', '명문대 3대', '3대 연속 명문대 입학'),
  olympiad: A('학업', '올림피아드 금상', '수학 올림피아드 금상'),
  retake3: A('학업', '장수생', '삼수 이상 끝에 대학 입학'),
  long_prep: A('학업', '인간 승리', '다섯 번째 도전 끝에 시험 합격'),
  // 출세
  president: A('출세', '대통령 배출', '가문에서 대통령이 나오다'),
  minister: A('출세', '장관 배출', '인사청문회를 통과해 장관이 되다'),
  politics: A('출세', '정치 명문', '가문에서 국회의원 배출'),
  law_family: A('출세', '법조 명문', '판사·검사·변호사를 모두 배출'),
  chief_justice: A('출세', '대법원장', '사법부의 수장이 되다'),
  prosecutor_general: A('출세', '검찰총장', '검찰의 수장이 되다'),
  general: A('출세', '별을 달다', '장군 진급'),
  ceo: A('출세', '월급쟁이의 끝', '대기업 사장까지 오르다'),
  doctor3: A('출세', '3대째 의사', '직계 3세대 연속 의사'),
  sa_family: A('출세', '사(士)자 집안', '의사·변호사·교수가 한 시대에 함께'),
  star_family: A('출세', '스타 가문', '연예인·운동선수·유튜버를 모두 배출'),
  military3: A('출세', '병역 명문가', '3대 연속 병역 이행'),
  // 영광
  nobel: A('영광', '노벨상', '가문에서 노벨상 수상자가 나오다'),
  olympic_gold: A('영광', '올림픽 금메달', '올림픽 시상대 꼭대기에 서다'),
  world_star: A('영광', '월드 스타', '연예인 최고 단계'),
  ten_million: A('영광', '천만 배우', '연예인 4단계 이상'),
  gold_button: A('영광', '골드 버튼', '유튜브 구독자 100만'),
  billboard: A('영광', '빌보드', '음악가 최고 단계'),
  webtoon_ip: A('영광', '글로벌 IP', '웹툰·웹소설이 세계로'),
  michelin: A('영광', '미쉐린 스타', '셰프 최고 단계'),
  gamer_champ: A('영광', '월드 챔피언', '프로게이머 최고 단계'),
  star_tutor: A('영광', '1타 강사', '인강 1타에 오르다'),
  masterpiece: A('영광', '불후의 명작', '가문의 화가가 걸작을 남기다'),
  // 재산
  rich100: A('재산', '백억 가문', '가문 총자산 100억'),
  rich1000: A('재산', '재벌의 탄생', '가문 총자산 1,000억'),
  chaebol: A('재산', '그룹 총수', '창업한 회사가 대기업이 되다'),
  ipo: A('재산', '상장사 창업주', '창업한 회사를 상장시키다'),
  landlord: A('재산', '조물주 위 건물주', '상가 건물 보유'),
  lotto: A('재산', '인생 역전', '로또 1등 당첨'),
  coin_rich: A('재산', '코인 부자', '코인 평가액 10억 돌파'),
  collector: A('재산', '컬렉터', '진품 예술품 5점 보유'),
  forgery: A('재산', '비싼 수업료', '위작을 샀다'),
  taxsaver: A('재산', '절세의 달인', '20억 이상 상속에서 실효세율 10% 이하'),
  comeback: A('재산', '재기', '파산했던 사람이 10억을 모으다'),
  noble_idle: A('재산', '백수 귀족', '백수로 살면서 개인 재산 10억 보유'),
  // 인생
  idle3: A('인생', '백수 3대', '3대 연속 백수로 살아남기'),
  cancer_survivor: A('인생', '암을 이긴 사람', '암 진단 후 5년 생존'),
  marine: A('인생', '귀신 잡는 해병', '해병대 만기 전역'),
  draft_dodger: A('인생', '국적 포기', '병역을 피해 해외로 (불명예)'),
  bankrupt: A('인생', '바닥', '파산을 경험하다'),
  pet: A('인생', '반려견과 함께', '유기견을 입양하다'),
  guarantee_victim: A('인생', '보증은 서지 마라', '친구 보증을 섰다가 빚을 떠안다'),
  angel_jackpot: A('재산', '유니콘 엔젤', '투자한 스타트업이 대박 나다'),
  sub_winner: A('재산', '청약 당첨', '청약으로 새 아파트를 분양받다'),
  first_love: A('결혼·자녀', '돌고 돌아', '첫사랑과 결혼하다'),
  dui: A('인생', '음주운전 전과', '술 마시고 운전대를 잡았다 (불명예)'),
  emigrated: A('인생', '이민 간 자식', '자녀가 해외에 정착하다'),
  ponzi_victim: A('인생', '달콤한 배당', '폰지 사기에 당하다'),
  rival_passed: A('가문', '라이벌 추월', '라이벌 가문의 재산을 넘어서다'),
  rival_allied: A('가문', '원수에서 사돈으로', '라이벌 가문과 화해하다'),
  rival_fallen: A('가문', '최후의 승자', '라이벌 가문이 무너지는 것을 지켜보다'),
  dip_buyer: A('재산', '공포에 사라', '시대의 위기에 자산을 줍고 반등을 맞다'),
  audition_win: A('영광', '슈퍼 루키', '국민 오디션에서 우승하다'),
  patent_win: A('출세', '다윗의 승리', '대기업을 상대로 특허를 지켜내다'),
  saga_shop: A('인생', '할매손 국밥', '국밥집 이야기를 끝까지 겪다'),
  saga_farm: A('인생', '사과밭 이장님', '귀농 이야기를 끝까지 겪다'),
  saga_world: A('인생', '80일간의 세계 일주', '노부부 세계 일주를 마치다'),
  saga_run: A('인생', '42.195', '러너 이야기를 끝까지 겪다'),
  saga_redev: A('인생', '조합장님', '재개발을 끝까지 이끌다'),
  saga_hidden: A('결혼·자녀', '핏줄', '숨겨진 형제와 가족이 되다'),
};
