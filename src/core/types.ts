export type StatKey = 'str' | 'int' | 'cha' | 'mor' | 'hp';
export type Stats = Record<StatKey, number>;
export type Sex = 'M' | 'F';

export type TalentId = 'genius' | 'athlete' | 'star' | 'merchant' | 'artist';
export interface Talent {
  id: TalentId;
  discovered: boolean;
}

export type JobId =
  // 무직·기타
  | 'none'
  | 'parttime'
  | 'pension'
  // 직장 (시험·공채)
  | 'office'
  | 'corp'
  | 'civil'
  | 'police'
  | 'firefighter'
  | 'teacher'
  | 'public_corp'
  | 'officer'
  | 'developer'
  | 'journalist'
  | 'pilot'
  // 전문직
  | 'doctor'
  | 'pharmacist'
  | 'nurse'
  | 'lawyer'
  | 'accountant'
  | 'professor'
  // 사업
  | 'founder'
  | 'shopkeeper'
  // 창작·연예·스포츠
  | 'youtuber'
  | 'entertainer'
  | 'gamer'
  | 'writer'
  | 'musician'
  | 'painter'
  | 'athlete'
  // 정치
  | 'politician';

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
}

export type RealEstateKind = 'apt_seoul' | 'apt_local' | 'land';
export type AssetKind = RealEstateKind | 'stock' | 'coin' | 'art';
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

export type MarketKey = 'apt_seoul' | 'apt_local' | 'land' | 'stock' | 'coin' | 'art';

export interface GameState {
  version: 2;
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
  /** 세무 주목도 (v0.3에서 사용) */
  taxHeat: number;
  events: PendingEvent[];
  eventSeq: number;
  idSeq: number;
  log: LogEntry[];
  achievements: string[];
  gameOver?: { reason: string; score: number };
}
