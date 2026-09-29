export type StatKey = 'str' | 'int' | 'cha' | 'mor' | 'hp';
export type Stats = Record<StatKey, number>;
export type Sex = 'M' | 'F';

export type TalentId = 'genius' | 'athlete' | 'star' | 'merchant';
export interface Talent {
  id: TalentId;
  discovered: boolean;
}

export type JobId = 'none' | 'office' | 'civil' | 'doctor' | 'founder' | 'youtuber' | 'athlete' | 'pension';

/** 진로 성향. 자녀의 '꿈'과 이벤트 선택지의 태그. */
export type CareerTag = 'study' | 'sport' | 'stage' | 'business' | 'public' | 'free';

export interface Genes {
  hairStyle: number;
  hairColor: number;
  skin: number;
  eyes: number;
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

export type AssetKind = 'apt_seoul' | 'apt_local' | 'land';
export interface Asset {
  id: string;
  kind: AssetKind;
  name: string;
  /** 사람 id 또는 'family' */
  ownerId: string;
  /** 시가 (만원) */
  value: number;
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

export interface GameState {
  version: 1;
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
  market: { apt_seoul: number; apt_local: number; land: number };
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
