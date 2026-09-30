export type StatKey = 'str' | 'int' | 'cha' | 'mor' | 'hp';
export type Stats = Record<StatKey, number>;
export type Sex = 'M' | 'F';

export type TalentId = 'genius' | 'athlete' | 'star' | 'merchant' | 'artist';
export interface Talent {
  id: TalentId;
  discovered: boolean;
}

/** 직업 id (jobs.ts 의 JOBS 키) */
export type JobId = string;

/** 진로 성향. 자녀의 '꿈'과 이벤트 선택지의 태그. */
export type CareerTag = 'study' | 'sport' | 'stage' | 'business' | 'public' | 'free';

export interface Genes {
  hairStyle: number;
  hairColor: number;
  skin: number;
  eyes: number;
  /** 얼굴형 (갸름/보통/둥근) */
  face: number;
  /** 눈썹 */
  brows: number;
  /** 입 모양 */
  mouth: number;
  /** 유전 안 되는 개인 특징: 0 없음, 1 안경, 2 주근깨, 3 점, 4 볼터치, 5 선글라스 */
  mark: number;
}

export interface Person {
  id: string;
  surname: string;
  name: string;
  sex: Sex;
  birthYear: number;
  deathYear?: number;
  /** 지금까지 오른 가장 높은 자리 (인생 점수용) */
  peak?: number;
  /** 세상을 떠날 때 매긴 인생 점수 */
  lifeScore?: number;
  /** 논문 편수 (대학원·교수·연구원) */
  papers?: number;
  /** 누적 기부액 (만원) */
  donated?: number;
  /** 정치인: 지지율·정치자금·비자금 */
  pol?: { approval: number; fund: number; slush: number; heat: number };
  fatherId?: string;
  motherId?: string;
  spouseId?: string;
  childIds: string[];
  potential: Stats;
  actual: Stats;
  talents: Talent[];
  genes: Genes;
  job: JobId;
  jobYears: number;
  jobLevel: number;
  flags: string[];
  /** 현 가주와의 관계도 -100~100 */
  affinity: number;
  /** 숨은 값 0~100 */
  happiness: number;
  desire?: CareerTag;
  desireKnown: boolean;
  potentialKnown: boolean;
  /** 개인 현금 (만원) */
  cash: number;
  /** 결혼할 때 가문에 들어온 사람 */
  inLaw: boolean;
  /** 보이지 않게 쌓이는 흔적 (떡밥): 작은 선택들이 누적돼 나중에 사건으로 돌아온다 */
  marks?: Record<string, number>;
  /** 연애 중인 상대 (결혼 전) */
  partnerId?: string;
  /** 성격 (TRAITS id) */
  traits?: string[];
  /** 부부 금슬 0~100 (배우자와 같은 값) */
  bond?: number;
  /** 사는 집 (살림을 맡은 사람) */
  home?: Home;
  /** 신용점수 300~950 (기본 750) */
  credit?: number;
  /** 학업 성적 누적 0~100 (수능에 반영) */
  study?: number;
  /** 지금까지 들어간 사교육비 (만원) */
  eduSpent?: number;
}

export type RealEstateKind = 'apt_seoul' | 'apt_local' | 'land';
export type AssetKind = RealEstateKind | 'building' | 'stock' | 'coin' | 'art' | 'vehicle';
/** 사는 집: 자가·전세·월세 (살림을 맡은 사람에게 붙는다) */
export interface Home {
  type: 'own' | 'jeonse' | 'wolse' | 'parents';
  /** 집 등급 (housing.ts TIERS) */
  tier: string;
  name: string;
  /** 자가: 그 집 자산 id */
  assetId?: string;
  /** 전세·월세 보증금 (내가 맡겨 둔 돈 = 내 자산) */
  deposit: number;
  /** 월세: 1년 치 */
  rent: number;
  /** 전세자금대출 */
  loan?: number;
  since: number;
}

export interface Asset {
  id: string;
  kind: AssetKind;
  name: string;
  /** 사람 id 또는 'family' */
  ownerId: string;
  /** 시가 (만원) */
  value: number;
  /** 예술품: 위작 여부 (감정·매각 전까지 숨김) */
  fake?: boolean;
  /** 산 값·산 해 (양도세 계산) */
  cost?: number;
  bought?: number;
  /** 담보대출 잔액 (연 이자) */
  loan?: number;
  /** 세입자 전세보증금 (돌려줘야 할 돈) · 만기 해 */
  deposit?: number;
  depositEnd?: number;
  /** 매물 고유 성격: 시장 민감도·연 추가 상승률·변동성·임대수익률 */
  beta?: number;
  drift?: number;
  vol?: number;
  yield?: number;
  tags?: string[];
  /** 유언장에 적은 받을 사람 (지정 상속) */
  heir?: string;
  /** 작년 이맘때 시세 (올해 등락 표시) */
  prev?: number;
  /** 비거주 주택을 어떻게 굴리나 (전세는 deposit으로 판단) */
  lease?: 'wolse' | 'jeonse' | 'empty';
}

/** 올해 나온 부동산 매물 */
export interface Listing {
  id: string;
  kind: 'apt_seoul' | 'apt_local' | 'land' | 'building';
  name: string;
  price: number;
  tags: string[];
  beta: number;
  drift: number;
  vol: number;
  yield: number;
  /** 전세 낀 매물: 세입자 보증금 */
  deposit?: number;
  /** 주택 수에 들어가는가 (아파트·오피스텔) */
  house: boolean;
  /** 임장으로 찾은 매물 */
  found?: boolean;
}

export interface Gift {
  fromId: string;
  toId: string;
  amount: number;
  tax: number;
  year: number;
}

export type Lifestyle = 'work' | 'balance' | 'family' | 'self' | 'rest';
export type Living = 'frugal' | 'normal' | 'lux';
export type Focus = 'study' | 'sport' | 'art' | 'character' | 'free';
export type WillMode = 'legal' | 'heir' | 'equal';

export interface ChildPolicy {
  budget: 0 | 1 | 2 | 3;
  focus: Focus;
}

export interface Policy {
  lifestyle: Lifestyle;
  living: Living;
  familyPlan: number;
  children: Record<string, ChildPolicy>;
  /** 세무사 선임 (연 수임료 ↔ 상속·증여세 절감) */
  taxAdvisor: boolean;
  /** 적립식 자동 증여: 받는 사람 id → 해마다 보낼 금액(만원) */
  autoGifts?: Record<string, number>;
}

export interface PendingEvent {
  uid: number;
  defId: string;
  personId: string;
  data?: any;
}

export interface LogEntry {
  year: number;
  text: string;
  kind?: 'birth' | 'death' | 'money' | 'market' | 'life' | 'achv' | 'succession';
}

export interface Mission {
  id: string;
  /** 부여된 세대 */
  gen: number;
  state: 'open' | 'done' | 'failed';
  /** 시작 시점 기준값 (자산 2배 등) */
  base?: number;
}

export type MarketKey = 'apt_seoul' | 'apt_local' | 'land' | 'building' | 'stock' | 'coin' | 'art';

export interface GameState {
  version: 3;
  rng: number;
  seed: number;
  year: number;
  startYear: number;
  familyName: string;
  origin: 'poor' | 'middle' | 'rich';
  headId: string;
  founderId: string;
  generation: number;
  people: Record<string, Person>;
  assets: Asset[];
  gifts: Gift[];
  familyCash: number;
  fame: number;
  /** 부동산은 한 채 가격, 주식·코인·예술품은 지수 (시작 = 100) */
  market: Record<MarketKey, number>;
  /** 작년 대비 변동률 (UI 표시용) */
  marketChange: Partial<Record<MarketKey, number>>;
  policy: Policy;
  heirId?: string;
  will: WillMode;
  /** 올해 남은 행동력 (대시보드에서 직접 하는 일) */
  ap?: number;
  /** 올해 행동별 횟수 (반복하면 효과가 줄어든다) */
  actUsed?: Record<string, number>;
  /** 가주가 유언장을 써뒀는가 */
  willWritten?: boolean;
  /** 세무 주목도 (v0.3에서 사용) */
  taxHeat: number;
  events: PendingEvent[];
  eventSeq: number;
  idSeq: number;
  log: LogEntry[];
  achievements: string[];
  /** 가문에서 거쳐 간 직업 (직업 도감) */
  jobsSeen?: string[];
  /** 세대 미션 */
  missions?: Mission[];
  /** 예약된 후폭풍: 지난 선택의 결과가 몇 년 뒤 터진다 */
  scheduled?: { year: number; defId: string; personId: string; data?: any }[];
  /** 근현대사 모드 (1960년 시작) */
  era?: 'history';
  /** 우리 집이 직접 들인 전화기·컴퓨터 (devices.ts 모델 id) */
  gear?: { phone?: string; pc?: string };
  gameOver?: { reason: string; score: number };
  /** 올해 부동산 매물 */
  listings?: Listing[];
  /** 이야기를 마지막으로 겪은 해 (같은 이야기가 자꾸 반복되지 않게): '사람id:이야기id' → 해 */
  storySeen?: Record<string, number>;
  /** 시작 난이도 (없으면 운명에 맡김) */
  difficulty?: 'easy' | 'normal' | 'hard' | 'hell';
  /** 보상 팝업 대기열 */
  rewards?: import('./rewards').Reward[];
  /** 명예(✦): 쓸 수 있는 것 / 누적 (등급) */
  glory?: number;
  gloryTotal?: number;
  /** 명예 상점에서 산 혜택 단계 */
  perks?: Record<string, number>;
  /** 명예의 전당 카드 */
  cards?: { id: string; personId: string; year: number }[];
  /** 가문이 받은 훈장 */
  honors?: { id: string; personId: string; year: number }[];
  /** 가문 스캔들 위험 (0~100): 돈 되는 지름길을 쓸수록 쌓인다 */
  scandal?: number;
  /** 스캔들 없이 지낸 햇수 */
  cleanYears?: number;
  /** 라이벌 가문 */
  rival?: import('./rival').Rival;
}
