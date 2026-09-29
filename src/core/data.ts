import type { CareerTag, JobId, StatKey, TalentId } from './types';

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
};
export const TALENT_IDS = Object.keys(TALENTS) as TalentId[];

export interface JobDef {
  id: JobId;
  name: string;
  /** 연봉 기준 (만원) */
  base: number;
  /** 레벨당 연봉 증가 (만원) */
  perLevel: number;
  maxLevel: number;
  fame: number;
  color: string;
}

export const JOBS: Record<JobId, JobDef> = {
  none: { id: 'none', name: '백수', base: 1200, perLevel: 0, maxLevel: 0, fame: -0.5, color: '#8a8a8a' },
  office: { id: 'office', name: '회사원', base: 3800, perLevel: 900, maxLevel: 6, fame: 0, color: '#34506e' },
  civil: { id: 'civil', name: '공무원', base: 3300, perLevel: 700, maxLevel: 7, fame: 1, color: '#2b3a67' },
  doctor: { id: 'doctor', name: '의사', base: 4500, perLevel: 3500, maxLevel: 6, fame: 2, color: '#e8e8e8' },
  founder: { id: 'founder', name: '창업가', base: 0, perLevel: 0, maxLevel: 5, fame: 1, color: '#6a3d8f' },
  youtuber: { id: 'youtuber', name: '유튜버', base: 0, perLevel: 0, maxLevel: 5, fame: 0.5, color: '#c8322d' },
  athlete: { id: 'athlete', name: '운동선수', base: 3000, perLevel: 4000, maxLevel: 5, fame: 2, color: '#2f7d4a' },
  pension: { id: 'pension', name: '은퇴', base: 1500, perLevel: 0, maxLevel: 0, fame: 0, color: '#6b5b4b' },
};

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
/** 상속세 평가 시 부동산은 기준시가(시가의 70%)로 평가 → 절세 여지 */
export const REAL_ESTATE_ASSESS_RATIO = 0.7;

export const ASSET_NAMES = {
  apt_seoul: '강남 아파트',
  apt_local: '지방 아파트',
  land: '종가 토지',
} as const;

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
};
