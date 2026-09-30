import { HIDDEN } from './hidden-data';
// 직업 데이터베이스.
// 연봉은 워크넷·임금직업포털(워크피디아)의 직업별 평균임금을 참고해 게임용으로 단순화한 값 (만원/년).
// 레벨이 오르면 perLevel 만큼 오르고, 능력치(stats 가중합)에 따라 ±25% 보정된다.

import type { CareerTag, Stats, StatKey, TalentId } from './types';

export type JobKind = 'fixed' | 'salary' | 'business' | 'creator' | 'athlete';

export type JobCat =
  | 'office'
  | 'public'
  | 'medical'
  | 'legal'
  | 'tech'
  | 'edu'
  | 'service'
  | 'trade'
  | 'transport'
  | 'media'
  | 'sport'
  | 'biz'
  | 'farm'
  | 'etc';

export const JOB_CATS: Record<JobCat, string> = {
  office: '🏢 사무·금융',
  public: '🏛 공공·안전',
  medical: '🩺 의료·보건',
  legal: '⚖️ 법률·전문 자격',
  tech: '💻 IT·과학·공학',
  edu: '📚 교육·연구',
  service: '🍳 서비스·요식',
  trade: '🔧 기술·생산',
  transport: '🚚 운송·물류',
  media: '🎬 미디어·예술',
  sport: '⚽ 스포츠',
  biz: '💰 장사·사업',
  farm: '🌾 농림어업',
  etc: '🛋 기타',
};

/** 어떻게 그 직업을 갖게 되나 */
export interface JobEntry {
  /**
   * hire: 지원하면 능력치 판정으로 바로 합격/불합격 (다른 길 고를 수 있음)
   * exam: 매년 보는 시험 (EXAMS)
   * start: 돈만 있으면 시작 (장사·창작)
   * school: 특정 학과 졸업 → 국가고시 (진로 선택에서만)
   * special: 이벤트로만 (선거, 임명 등)
   */
  how: 'hire' | 'exam' | 'start' | 'school' | 'special';
  exam?: string;
  /** hire 합격선 (stats 가중합 기준) */
  pass?: number;
  cost?: number;
  univ?: boolean;
  /** 이 중 하나라도 있어야 지원 가능 */
  needFlags?: string[];
  needNote?: string;
  maxAge?: number;
  level?: number;
  tag: CareerTag;
  text?: string;
}

export interface CreatorDef {
  incomes: number[];
  stat: StatKey;
  talent: TalentId;
  base: number;
  div: number;
}

export interface BizDef {
  /** 평균 연수입 */
  base: number;
  /** 한 해 수입의 출렁임 */
  sd: number;
  /** 레벨당 수입 증가 */
  step: number;
  /** 이 이하의 해가 오면 폐업 (판정값) */
  fail: number;
}

export interface JobDef {
  id: string;
  name: string;
  cat: JobCat;
  kind: JobKind;
  base: number;
  perLevel: number;
  maxLevel: number;
  fame: number;
  color: string;
  retireAge: number;
  promote?: number;
  stats?: Partial<Stats>;
  titles?: string[];
  /** 퇴직 후 연금 = 마지막 연봉 × 비율 (공무원연금은 높다) */
  pension?: number;
  /** 연간 부상·질병 위험 (건강 감소 확률) */
  risk?: number;
  entry?: JobEntry;
  creator?: CreatorDef;
  biz?: BizDef;
}

type Opt = Partial<Omit<JobDef, 'id' | 'name' | 'cat' | 'kind' | 'base' | 'perLevel' | 'maxLevel'>>;

const LIST: JobDef[] = [];
function job(id: string, name: string, cat: JobCat, kind: JobKind, base: number, perLevel: number, maxLevel: number, o: Opt = {}) {
  LIST.push({ id, name, cat, kind, base, perLevel, maxLevel, fame: 0, color: '#34506e', retireAge: 60, ...o });
}
const hire = (pass: number, tag: CareerTag, o: Partial<JobEntry> = {}): JobEntry => ({ how: 'hire', pass, tag, ...o });
const exam = (id: string, tag: CareerTag, o: Partial<JobEntry> = {}): JobEntry => ({ how: 'exam', exam: id, tag, ...o });
const start = (tag: CareerTag, o: Partial<JobEntry> = {}): JobEntry => ({ how: 'start', tag, ...o });
const school = (note: string, tag: CareerTag): JobEntry => ({ how: 'school', needNote: note, tag });
const special = (note: string, tag: CareerTag): JobEntry => ({ how: 'special', needNote: note, tag });

const OFFICE_T = ['사원', '주임', '대리', '과장', '차장', '부장'];
const BIG_T = ['사원', '대리', '과장', '차장', '부장', '상무', '전무', '사장'];
const CIVIL_T = ['9급', '8급', '7급', '6급', '5급 사무관', '4급 서기관', '3급 부이사관'];
const SKILL_T = ['견습', '기능공', '숙련공', '반장', '명장'];
const WORK = { int: 0.5, cha: 0.3, mor: 0.2 };
const BODY = { str: 0.6, hp: 0.3, mor: 0.1 };

// ── 무직·기타 ──
job('none', '백수', 'etc', 'fixed', 1200, 0, 0, { fame: -0.5, color: '#8a8a8a', retireAge: 65, entry: { how: 'start', tag: 'free' } });
job('parttime', '알바', 'etc', 'fixed', 1900, 0, 0, { fame: -0.2, color: '#d98c3a', retireAge: 65, entry: start('free', { text: '편의점, 물류센터, 배달… 닥치는 대로 한다.' }) });
job('pension', '은퇴', 'etc', 'fixed', 1500, 0, 0, { color: '#6b5b4b', retireAge: 0 });
job('social_worker', '사회복지사', 'etc', 'salary', 2900, 350, 4, { fame: 1, color: '#6a9a6a', promote: 0.1, stats: { mor: 0.7, int: 0.3 }, titles: ['사회복지사', '팀장', '과장', '부장', '관장'], entry: hire(35, 'public', { univ: true, text: '복지관에 첫 출근했다. 박봉이지만 보람은 크다.' }) });
job('clergy', '종교인', 'etc', 'salary', 2200, 900, 3, { fame: 1, color: '#2a2a2a', retireAge: 70, promote: 0.08, stats: { mor: 0.6, cha: 0.4 }, titles: ['전도사', '부목사', '담임목사', '대형교회 담임'], entry: hire(40, 'public', { cost: 2000, needNote: '신학교 3년', text: '신학교를 마치고 사역을 시작했다.' }) });
job('politician', '국회의원', 'etc', 'fixed', 15500, 3000, 4, { fame: 4, color: '#1c4f8f', retireAge: 0, titles: ['초선', '재선', '3선', '4선', '5선'], entry: special('선거 당선', 'public') });
job('mayor', '시장', 'etc', 'fixed', 16000, 1500, 2, { fame: 5, color: '#1f6a5a', retireAge: 0, titles: ['시장', '재선 시장', '3선 시장'], entry: special('지방선거 당선', 'public') });
job('minister', '장관', 'etc', 'fixed', 14000, 0, 0, { fame: 6, color: '#18365f', retireAge: 0, entry: special('대통령 임명', 'public') });
job('president', '대통령', 'etc', 'fixed', 26000, 0, 0, { fame: 20, color: '#0d2a4f', retireAge: 0, entry: special('대선 승리', 'public') });

// ── 사무·금융 ──
job('office', '회사원', 'office', 'salary', 3000, 600, 5, { promote: 0.14, stats: WORK, titles: OFFICE_T, entry: hire(20, 'free', { text: '작은 회사에서 커리어를 시작했다.' }) });
job('corp', '대기업 직원', 'office', 'salary', 5200, 1400, 7, { fame: 0.5, color: '#1f3b5c', retireAge: 58, promote: 0.12, stats: WORK, titles: BIG_T, entry: exam('corp', 'study', { univ: true }) });
job('public_corp', '공기업 직원', 'office', 'salary', 4700, 900, 5, { fame: 0.5, color: '#3e5a7a', promote: 0.12, stats: { int: 0.6, mor: 0.4 }, titles: ['6급', '5급', '4급', '3급', '2급', '1급'], entry: exam('public_corp', 'public', { univ: true }) });
job('banker', '은행원', 'office', 'salary', 5000, 1300, 6, { fame: 0.5, color: '#2f4f6f', retireAge: 57, promote: 0.12, stats: WORK, titles: ['행원', '계장', '대리', '과장', '차장', '지점장', '본부장'], entry: exam('banker', 'study', { univ: true }) });
job('analyst', '증권 애널리스트', 'office', 'salary', 6500, 2200, 5, { fame: 1, color: '#243b55', promote: 0.12, stats: { int: 0.8, cha: 0.2 }, titles: ['RA', '애널리스트', '시니어', '팀장', '리서치센터장', '스타 애널리스트'], entry: exam('analyst', 'study', { univ: true }) });
job('marketer', '마케터', 'office', 'salary', 3700, 900, 5, { promote: 0.13, stats: { cha: 0.5, int: 0.5 }, titles: OFFICE_T, entry: hire(42, 'business', { univ: true, text: '마케팅팀 막내가 되었다.' }) });
job('sales', '영업사원', 'office', 'salary', 3200, 1100, 5, { promote: 0.15, stats: { cha: 0.7, mor: 0.3 }, titles: OFFICE_T, entry: hire(30, 'business', { text: '실적이 곧 연봉이다. 명함 백 장을 받았다.' }) });
job('insurance', '보험설계사', 'office', 'salary', 2800, 1800, 4, { promote: 0.14, stats: { cha: 0.8, mor: 0.2 }, titles: ['설계사', '팀장', '지점장', '본부장', '억대 연봉 MDRT'], entry: hire(28, 'business', { text: '지인 명단부터 정리했다.' }) });
job('hr', '인사담당자', 'office', 'salary', 3900, 900, 5, { promote: 0.12, stats: { mor: 0.5, int: 0.3, cha: 0.2 }, titles: OFFICE_T, entry: hire(40, 'free', { univ: true, text: '남의 연봉을 제일 먼저 아는 부서다.' }) });
job('secretary', '비서', 'office', 'salary', 3200, 700, 4, { promote: 0.1, stats: { mor: 0.5, cha: 0.5 }, titles: ['비서', '수행비서', '비서실장', '회장 비서실장', '그룹 비서실장'], entry: hire(40, 'free', { text: '임원실 앞자리에 앉았다.' }) });
job('trader', '무역회사원', 'office', 'salary', 3800, 1000, 5, { promote: 0.12, stats: { int: 0.5, cha: 0.5 }, titles: OFFICE_T, entry: hire(42, 'business', { univ: true, text: '해외 바이어에게 첫 메일을 보냈다.' }) });

// ── 공공·안전 ──
job('civil', '공무원', 'public', 'salary', 3100, 650, 6, { fame: 1, color: '#2b3a67', retireAge: 65, promote: 0.12, pension: 0.5, stats: { int: 0.5, mor: 0.5 }, titles: CIVIL_T, entry: exam('civil', 'public') });
job('tax_officer', '세무공무원', 'public', 'salary', 3200, 700, 6, { fame: 1, color: '#2b3a67', retireAge: 65, promote: 0.12, pension: 0.5, stats: { int: 0.7, mor: 0.3 }, titles: CIVIL_T, entry: exam('tax_civil', 'public') });
job('police', '경찰관', 'public', 'salary', 3400, 700, 6, { fame: 1, color: '#243a73', promote: 0.12, pension: 0.5, risk: 0.03, stats: { str: 0.4, mor: 0.4, int: 0.2 }, titles: ['순경', '경장', '경사', '경위', '경감', '경정', '총경'], entry: exam('police', 'public', { maxAge: 40 }) });
job('coast_guard', '해양경찰', 'public', 'salary', 3500, 700, 6, { fame: 1, color: '#1d4a7a', promote: 0.12, pension: 0.5, risk: 0.04, stats: { str: 0.5, hp: 0.3, mor: 0.2 }, titles: ['순경', '경장', '경사', '경위', '경감', '경정', '총경'], entry: exam('coast_guard', 'public', { maxAge: 40 }) });
job('firefighter', '소방관', 'public', 'salary', 3500, 650, 5, { fame: 1.5, color: '#b8452d', promote: 0.11, pension: 0.5, risk: 0.05, stats: BODY, titles: ['소방사', '소방교', '소방장', '소방위', '소방경', '소방령'], entry: exam('firefighter', 'public', { maxAge: 40 }) });
job('prison_guard', '교도관', 'public', 'salary', 3300, 650, 5, { fame: 0.5, color: '#3b4a3b', promote: 0.1, pension: 0.5, stats: { str: 0.4, mor: 0.6 }, titles: ['교도', '교사', '교위', '교감', '교정관', '소장'], entry: exam('corrections', 'public') });
job('mail_carrier', '집배원', 'public', 'salary', 3000, 450, 4, { fame: 0.5, color: '#c83a3a', promote: 0.08, pension: 0.5, risk: 0.03, stats: BODY, titles: ['집배원', '선임', '팀장', '과장', '우체국장'], entry: exam('postal', 'public') });
job('officer', '직업군인', 'public', 'salary', 3600, 1000, 6, { fame: 1.5, color: '#4b5a2e', retireAge: 56, promote: 0.1, pension: 0.5, risk: 0.02, stats: { str: 0.4, mor: 0.4, int: 0.2 }, titles: ['소위', '중위', '대위', '소령', '중령', '대령', '장군'], entry: school('사관학교·ROTC', 'public') });
job('diplomat', '외교관', 'public', 'salary', 4500, 1300, 5, { fame: 3, color: '#27405e', retireAge: 62, promote: 0.1, pension: 0.5, stats: { int: 0.6, cha: 0.4 }, titles: ['3등 서기관', '2등 서기관', '1등 서기관', '참사관', '공사', '대사'], entry: exam('diplomat', 'public', { univ: true }) });
job('judge', '판사', 'public', 'salary', 8000, 2000, 5, { fame: 4, color: '#111', retireAge: 70, promote: 0.08, pension: 0.5, stats: { int: 0.7, mor: 0.3 }, titles: ['판사', '부장판사', '고법판사', '법원장', '대법관', '대법원장'], entry: exam('judge', 'study', { needFlags: ['passed:bar'], needNote: '변호사시험 합격' }) });
job('prosecutor', '검사', 'public', 'salary', 7500, 2000, 5, { fame: 3.5, color: '#151520', retireAge: 63, promote: 0.1, pension: 0.5, stats: { int: 0.6, cha: 0.2, mor: 0.2 }, titles: ['평검사', '부부장', '부장검사', '차장검사', '검사장', '검찰총장'], entry: exam('prosecutor', 'study', { needFlags: ['passed:bar'], needNote: '변호사시험 합격' }) });

// ── 의료·보건 ──
job('doctor', '의사', 'medical', 'salary', 9000, 3500, 6, { fame: 2, color: '#e8e8e8', retireAge: 72, promote: 0.12, stats: { int: 0.6, mor: 0.2, cha: 0.2 }, titles: ['인턴', '레지던트', '전문의 (봉직의)', '봉직 과장', '개원의', '병원장', '의료재단 이사장'], entry: school('의대 졸업', 'study') });
job('dentist', '치과의사', 'medical', 'salary', 9500, 2500, 4, { fame: 2, color: '#e8f0f8', retireAge: 72, promote: 0.12, stats: { int: 0.6, cha: 0.4 }, titles: ['페이닥터', '개원의', '치과 2호점', '네트워크 치과', '치과 그룹'], entry: school('치대 졸업', 'study') });
job('kmd', '한의사', 'medical', 'salary', 7500, 2000, 4, { fame: 1.5, color: '#e8e0d0', retireAge: 75, promote: 0.1, stats: { int: 0.5, cha: 0.3, mor: 0.2 }, titles: ['부원장', '개원 한의사', '유명 한의원', '한방병원장', '한방 재벌'], entry: school('한의대 졸업', 'study') });
job('vet', '수의사', 'medical', 'salary', 5500, 1500, 4, { fame: 1.5, color: '#dfeee0', retireAge: 72, promote: 0.1, stats: { int: 0.6, mor: 0.4 }, titles: ['수의사', '개원의', '24시 동물병원', '동물병원 체인', '수의대 교수'], entry: school('수의대 졸업', 'study') });
job('pharmacist', '약사', 'medical', 'salary', 6000, 1500, 3, { fame: 1, color: '#dfe8e0', retireAge: 72, promote: 0.1, stats: { int: 0.5, cha: 0.3, mor: 0.2 }, titles: ['근무약사', '약국 개업', '대형 약국', '약국 체인'], entry: school('약대 졸업', 'study') });
job('nurse', '간호사', 'medical', 'salary', 3900, 700, 4, { fame: 1, color: '#f2f2f7', promote: 0.1, risk: 0.02, stats: { mor: 0.5, hp: 0.3, int: 0.2 }, titles: ['간호사', '책임간호사', '수간호사', '간호부장', '간호이사'], entry: school('간호학과 졸업', 'public') });
job('pt', '물리치료사', 'medical', 'salary', 3300, 600, 3, { color: '#e0eef2', promote: 0.1, stats: { str: 0.3, mor: 0.4, int: 0.3 }, titles: ['물리치료사', '주임', '실장', '재활센터 원장'], entry: school('보건계열 졸업', 'public') });
job('radiographer', '방사선사', 'medical', 'salary', 3700, 650, 3, { color: '#e0e6f2', promote: 0.1, stats: { int: 0.6, mor: 0.4 }, titles: ['방사선사', '주임', '실장', '기사장'], entry: school('보건계열 졸업', 'public') });
job('clinical', '임상병리사', 'medical', 'salary', 3600, 600, 3, { color: '#e8e8f2', promote: 0.1, stats: { int: 0.7, mor: 0.3 }, titles: ['임상병리사', '주임', '실장', '기사장'], entry: school('보건계열 졸업', 'public') });
job('emt', '응급구조사', 'medical', 'salary', 3400, 600, 3, { fame: 1, color: '#d9503f', promote: 0.1, risk: 0.03, stats: { str: 0.4, mor: 0.4, hp: 0.2 }, titles: ['구조사', '선임', '팀장', '센터장'], entry: school('응급구조학과 졸업', 'public') });
job('nurse_aide', '간호조무사', 'medical', 'salary', 2600, 300, 2, { color: '#f0e8f0', promote: 0.08, stats: { mor: 0.6, hp: 0.4 }, titles: ['조무사', '선임', '실장'], entry: hire(20, 'public', { cost: 300, needNote: '학원 1년', text: '학원을 마치고 동네 의원에 취직했다.' }) });
job('caregiver', '요양보호사', 'medical', 'salary', 2300, 200, 2, { fame: 0.5, color: '#e6d6c6', retireAge: 70, promote: 0.08, risk: 0.02, stats: { mor: 0.7, hp: 0.3 }, titles: ['요양보호사', '팀장', '센터장'], entry: hire(15, 'public', { cost: 80, text: '어르신들을 돌보는 일을 시작했다.' }) });

// ── 법률·전문 자격 ──
job('lawyer', '변호사', 'legal', 'salary', 7000, 3000, 5, { fame: 1.5, color: '#1f1f2e', retireAge: 72, promote: 0.13, stats: { int: 0.6, cha: 0.4 }, titles: ['어쏘 변호사', '시니어', '파트너', '에쿼티 파트너', '대표변호사', '로펌 회장'], entry: school('로스쿨 → 변호사시험', 'study') });
job('accountant', '회계사', 'legal', 'salary', 6000, 2000, 5, { fame: 1, color: '#2e3f3a', retireAge: 70, promote: 0.13, stats: { int: 0.8, mor: 0.2 }, titles: ['수습', '시니어', '매니저', '이사', '파트너', '대표'], entry: exam('accountant', 'study', { univ: true }) });
job('tax_accountant', '세무사', 'legal', 'salary', 5500, 1800, 4, { fame: 1, color: '#2e3a3f', retireAge: 72, promote: 0.12, stats: { int: 0.7, cha: 0.3 }, titles: ['수습', '세무사', '사무소 개업', '세무법인 파트너', '세무법인 대표'], entry: exam('tax_accountant', 'study') });
job('patent_attorney', '변리사', 'legal', 'salary', 7000, 2200, 4, { fame: 1, color: '#2a2f4a', retireAge: 72, promote: 0.12, stats: { int: 0.9, cha: 0.1 }, titles: ['수습', '변리사', '파트너', '사무소 대표', '특허법인 대표'], entry: exam('patent', 'study', { univ: true }) });
job('scrivener', '법무사', 'legal', 'salary', 5000, 1200, 3, { color: '#3a3a4a', retireAge: 75, promote: 0.1, stats: { int: 0.7, mor: 0.3 }, titles: ['법무사', '사무소 개업', '합동사무소', '법무법인 대표'], entry: exam('scrivener', 'study') });
job('appraiser', '감정평가사', 'legal', 'salary', 6500, 1800, 4, { color: '#3a4a3a', retireAge: 72, promote: 0.12, stats: { int: 0.8, mor: 0.2 }, titles: ['수습', '평가사', '이사', '파트너', '법인 대표'], entry: exam('appraiser', 'study') });
job('labor_attorney', '노무사', 'legal', 'salary', 5000, 1500, 4, { color: '#3a3f4a', retireAge: 72, promote: 0.12, stats: { int: 0.6, cha: 0.4 }, titles: ['수습', '노무사', '사무소 개업', '파트너', '법인 대표'], entry: exam('labor', 'study') });
job('customs_broker', '관세사', 'legal', 'salary', 5000, 1400, 3, { color: '#3f3a4a', retireAge: 72, promote: 0.1, stats: { int: 0.7, cha: 0.3 }, titles: ['관세사', '사무소 개업', '파트너', '법인 대표'], entry: exam('customs', 'study') });
job('realtor', '공인중개사', 'legal', 'business', 0, 0, 3, { color: '#5a4a3a', retireAge: 75, titles: ['중개보조원', '개업 중개사', '단지 앞 1등 부동산', '중개법인'], biz: { base: 3200, sd: 2200, step: 3000, fail: -40 }, entry: exam('realtor', 'business') });

// ── IT·과학·공학 ──
job('developer', '개발자', 'tech', 'salary', 4200, 1500, 5, { fame: 0.3, color: '#2d2d3a', promote: 0.15, stats: { int: 0.9, mor: 0.1 }, titles: ['주니어', '미들', '시니어', '리드', '아키텍트', 'CTO'], entry: exam('developer', 'study') });
job('data_scientist', '데이터 과학자', 'tech', 'salary', 5000, 1800, 5, { fame: 0.5, color: '#2a3a4a', promote: 0.14, stats: { int: 1 }, titles: ['주니어', '미들', '시니어', '리드', '헤드', 'CDO'], entry: hire(62, 'study', { univ: true, text: '데이터팀에 합류했다. 엑셀은 이제 안녕.' }) });
job('security', '보안 전문가', 'tech', 'salary', 4800, 1600, 5, { fame: 0.5, color: '#1a2a1a', promote: 0.13, stats: { int: 0.9, mor: 0.1 }, titles: ['주니어', '미들', '시니어', '리드', '보안 책임자', 'CISO'], entry: hire(60, 'study', { cost: 800, needNote: '정보보안 자격증', text: '화이트 해커가 되었다.' }) });
job('game_dev', '게임 개발자', 'tech', 'salary', 4000, 1400, 5, { fame: 0.5, color: '#3a2d4a', promote: 0.14, stats: { int: 0.7, cha: 0.3 }, titles: ['주니어', '미들', '시니어', '리드', '디렉터', '스튜디오 대표'], entry: hire(52, 'stage', { text: '게임 회사에 들어갔다. 크런치 모드가 기다린다.' }) });
job('researcher', '연구원', 'tech', 'salary', 5000, 1300, 5, { fame: 1, color: '#e0e0d0', retireAge: 61, promote: 0.1, stats: { int: 0.9, mor: 0.1 }, titles: ['연구원', '선임연구원', '책임연구원', '수석연구원', '연구소장', '원장'], entry: hire(64, 'study', { needFlags: ['grad_school', 'univ_top', 'eng_school'], needNote: '석사 이상 유리', text: '연구소 흰 가운을 받았다.' }) });
job('chip_engineer', '반도체 엔지니어', 'tech', 'salary', 6000, 1800, 6, { fame: 0.5, color: '#3a4a5a', retireAge: 58, promote: 0.12, stats: { int: 0.9, hp: 0.1 }, titles: ['사원', '선임', '책임', '수석', '마스터', '임원', '사업부장'], entry: hire(62, 'study', { univ: true, needFlags: ['eng_school', 'univ_top', 'grad_school'], needNote: '공대 졸업', text: '반도체 공장 방진복을 입었다.' }) });
job('mech_engineer', '기계 엔지니어', 'tech', 'salary', 4500, 1200, 5, { color: '#4a4a3a', promote: 0.12, stats: { int: 0.8, str: 0.2 }, titles: ['사원', '대리', '과장', '차장', '부장', '공장장'], entry: hire(50, 'study', { needFlags: ['eng_school'], needNote: '공대 졸업', text: '설계팀에 배치됐다.' }) });
job('architect', '건축가', 'tech', 'salary', 4000, 1600, 5, { fame: 1, color: '#5a5a5a', retireAge: 72, promote: 0.1, stats: { int: 0.6, cha: 0.4 }, titles: ['실습생', '건축사', '실장', '소장', '대표', '프리츠커상 후보'], entry: hire(52, 'stage', { needFlags: ['arch_school'], needNote: '건축학과 5년', text: '설계사무소 막내로 밤을 새운다.' }) });
job('aero_engineer', '항공우주 엔지니어', 'tech', 'salary', 5500, 1600, 5, { fame: 1.5, color: '#3a4a6a', promote: 0.1, stats: { int: 1 }, titles: ['연구원', '선임', '책임', '수석', '발사책임자', '원장'], entry: hire(70, 'study', { needFlags: ['eng_school', 'grad_school'], needNote: '공대·대학원', text: '로켓을 쏘는 사람이 되었다.' }) });

// ── 교육·연구 ──
job('teacher', '교사', 'edu', 'salary', 3300, 700, 4, { fame: 1, color: '#4e7a5a', retireAge: 62, promote: 0.08, pension: 0.5, stats: { int: 0.4, mor: 0.4, cha: 0.2 }, titles: ['교사', '부장교사', '교감', '교장', '교육장'], entry: exam('teacher', 'public', { univ: true }) });
job('professor', '교수', 'edu', 'salary', 5500, 1200, 4, { fame: 2.5, color: '#6b4a2b', retireAge: 65, promote: 0.1, pension: 0.4, stats: { int: 0.8, mor: 0.2 }, titles: ['조교수', '부교수', '정교수', '석좌교수', '총장'], entry: school('대학원 → 교수 임용', 'study') });
job('kinder_teacher', '유치원 교사', 'edu', 'salary', 2700, 450, 3, { color: '#f0c0c0', promote: 0.08, stats: { mor: 0.6, cha: 0.4 }, titles: ['교사', '부장', '원감', '원장'], entry: hire(30, 'public', { text: '아이들 서른 명의 선생님이 되었다.' }) });
job('tutor', '학원 강사', 'edu', 'creator', 0, 0, 5, { fame: 0.5, color: '#7a4a2a', retireAge: 70, titles: ['보조강사', '단과 강사', '인기 강사', '대치동 스타', '인강 1타', '교육 재벌'], creator: { incomes: [2400, 4500, 9000, 20000, 60000, 150000], stat: 'cha', talent: 'star', base: 0.03, div: 1500 }, entry: start('study', { text: '학원 칠판 앞에 섰다. 학생 반응이 곧 연봉이다.' }) });
job('librarian', '사서', 'edu', 'salary', 3000, 450, 3, { color: '#6a7a5a', promote: 0.08, stats: { int: 0.6, mor: 0.4 }, titles: ['사서', '주무관', '팀장', '관장'], entry: hire(40, 'free', { univ: true, text: '조용한 도서관이 일터가 되었다.' }) });

// ── 서비스·요식 ──
job('chef', '요리사', 'service', 'salary', 2800, 1200, 5, { color: '#f8f8f8', retireAge: 65, promote: 0.12, risk: 0.02, stats: { cha: 0.4, str: 0.3, mor: 0.3 }, titles: ['막내', '라인쿡', '수셰프', '헤드셰프', '오너셰프', '미쉐린 스타'], entry: hire(20, 'free', { cost: 300, needNote: '조리기능사', text: '주방 막내로 양파 100개를 깠다.' }) });
job('barista', '바리스타', 'service', 'salary', 2400, 400, 3, { color: '#6f4e37', promote: 0.1, stats: { cha: 0.7, mor: 0.3 }, titles: ['바리스타', '헤드 바리스타', '매니저', '로스터'], entry: hire(15, 'free', { cost: 150, text: '라떼 아트 연습 중이다.' }) });
job('hairdresser', '미용사', 'service', 'salary', 2400, 1200, 4, { color: '#c050a0', retireAge: 70, promote: 0.12, stats: { cha: 0.7, mor: 0.3 }, titles: ['스텝', '디자이너', '실장', '원장', '청담동 원장'], entry: hire(20, 'stage', { cost: 500, needNote: '미용 자격증', text: '미용실 스텝으로 샴푸부터 배운다.' }) });
job('nail_artist', '네일아티스트', 'service', 'salary', 2300, 900, 3, { color: '#e070a0', retireAge: 70, promote: 0.12, stats: { cha: 0.8, mor: 0.2 }, titles: ['네일리스트', '실장', '숍 원장', '브랜드 대표'], entry: hire(15, 'stage', { cost: 300, text: '손끝의 예술을 시작했다.' }) });
job('hotelier', '호텔리어', 'service', 'salary', 3000, 900, 5, { color: '#2a2a4a', promote: 0.12, stats: { cha: 0.6, mor: 0.4 }, titles: ['프런트', '주임', '지배인', '부장', '총지배인', '호텔 대표'], entry: hire(40, 'free', { text: '특급호텔 로비에서 첫 근무.' }) });
job('flight_attendant', '승무원', 'service', 'salary', 4000, 900, 4, { fame: 0.5, color: '#3a5a8a', retireAge: 58, promote: 0.1, stats: { cha: 0.6, hp: 0.4 }, titles: ['승무원', '부사무장', '사무장', '선임 사무장', '캐빈 매니저'], entry: exam('attendant', 'free') });
job('tour_guide', '여행 가이드', 'service', 'salary', 2600, 800, 3, { color: '#4a8a4a', retireAge: 65, promote: 0.1, stats: { cha: 0.7, hp: 0.3 }, titles: ['가이드', '인솔자', '팀장', '여행사 대표'], entry: hire(35, 'free', { cost: 200, needNote: '관광통역 자격', text: '깃발을 들고 첫 투어에 나섰다.' }) });
job('wedding_planner', '웨딩플래너', 'service', 'salary', 2800, 1000, 3, { color: '#f0d0e0', promote: 0.12, stats: { cha: 0.7, int: 0.3 }, titles: ['플래너', '실장', '이사', '웨딩업체 대표'], entry: hire(35, 'business', { text: '남의 인생 최고의 날을 준비한다.' }) });
job('pet_groomer', '반려동물 미용사', 'service', 'salary', 2300, 700, 3, { color: '#c0a080', retireAge: 70, promote: 0.1, stats: { mor: 0.5, cha: 0.5 }, titles: ['미용사', '실장', '숍 원장', '펫 브랜드 대표'], entry: hire(15, 'free', { cost: 300, text: '강아지들의 미용사가 되었다.' }) });

// ── 기술·생산 ──
job('factory', '생산직', 'trade', 'salary', 3300, 600, 4, { color: '#5a6a7a', retireAge: 60, promote: 0.1, risk: 0.03, stats: BODY, titles: ['사원', '주임', '조장', '반장', '직장'], entry: hire(10, 'free', { text: '3교대 공장에 들어갔다.' }) });
job('big_factory', '대기업 생산기술직', 'trade', 'salary', 4800, 900, 4, { color: '#35506a', retireAge: 60, promote: 0.1, risk: 0.02, stats: { int: 0.4, str: 0.4, mor: 0.2 }, titles: ['사원', '주임', '조장', '반장', '기술 명장'], entry: special('마이스터고·특성화고 고졸 공채', 'free') });
job('electrician', '전기기사', 'trade', 'salary', 3500, 900, 4, { color: '#e0b020', retireAge: 70, promote: 0.12, risk: 0.03, stats: { int: 0.5, str: 0.5 }, titles: SKILL_T, entry: exam('electric', 'free') });
job('welder', '용접공', 'trade', 'salary', 3800, 1100, 4, { color: '#4a4a4a', retireAge: 65, promote: 0.12, risk: 0.05, stats: BODY, titles: SKILL_T, entry: hire(25, 'free', { cost: 300, needNote: '용접기능사', text: '불꽃 튀는 현장에 섰다. 숙련되면 억대도 가능하다.' }) });
job('mechanic', '자동차 정비사', 'trade', 'salary', 3000, 900, 4, { color: '#3a4a6a', retireAge: 70, promote: 0.12, risk: 0.02, stats: { str: 0.4, int: 0.6 }, titles: ['견습', '정비사', '반장', '공장장', '정비소 사장'], entry: hire(25, 'free', { cost: 200, text: '기름때 묻은 작업복을 입었다.' }) });
job('carpenter', '목수', 'trade', 'salary', 3200, 1100, 4, { color: '#8a6a3a', retireAge: 70, promote: 0.1, risk: 0.04, stats: BODY, titles: SKILL_T, entry: hire(20, 'free', { text: '대패질부터 배운다.' }) });
job('plumber', '배관공', 'trade', 'salary', 3300, 1000, 4, { color: '#3a6a8a', retireAge: 70, promote: 0.1, risk: 0.03, stats: BODY, titles: SKILL_T, entry: hire(20, 'free', { text: '물 새는 곳이면 어디든 간다.' }) });
job('shipbuilder', '조선소 기술자', 'trade', 'salary', 4200, 1000, 4, { color: '#2a4a6a', retireAge: 60, promote: 0.1, risk: 0.05, stats: BODY, titles: SKILL_T, entry: hire(30, 'free', { text: '거대한 배 위에서 일한다.' }) });
job('crane_operator', '크레인 기사', 'trade', 'salary', 5000, 1000, 3, { color: '#e0a020', retireAge: 65, promote: 0.1, risk: 0.04, stats: { int: 0.5, hp: 0.5 }, titles: ['보조', '기사', '선임 기사', '장비 사장'], entry: hire(30, 'free', { cost: 800, needNote: '중장비 면허', text: '하늘 높은 조종석에 앉았다.' }) });

// ── 운송·물류 ──
job('pilot', '파일럿', 'transport', 'salary', 7000, 3000, 3, { fame: 1, color: '#223355', retireAge: 65, promote: 0.1, stats: { hp: 0.4, int: 0.4, str: 0.2 }, titles: ['부기장', '기장', '선임기장', '수석기장'], entry: exam('pilot', 'study', { cost: 10000, needNote: '비행교육 1억' }) });
job('courier', '택배기사', 'transport', 'salary', 4000, 400, 2, { color: '#6a8a3a', retireAge: 65, promote: 0.05, risk: 0.04, stats: BODY, titles: ['기사', '베테랑', '영업소장'], entry: hire(10, 'free', { cost: 2000, needNote: '탑차 구입', text: '하루 300개. 몸이 재산이다.' }) });
job('delivery_rider', '배달 라이더', 'transport', 'salary', 3200, 300, 2, { color: '#3aa0d0', retireAge: 60, promote: 0.05, risk: 0.07, stats: BODY, titles: ['라이더', '베테랑', '지사장'], entry: hire(5, 'free', { cost: 300, text: '오토바이를 샀다. 비 오는 날이 대목이다.' }) });
job('taxi', '택시기사', 'transport', 'salary', 2800, 300, 2, { color: '#e0c030', retireAge: 75, promote: 0.05, risk: 0.02, stats: { cha: 0.5, hp: 0.5 }, titles: ['법인택시', '개인택시', '모범택시'], entry: hire(10, 'free', { text: '핸들을 잡았다. 손님과 수다가 절반.' }) });
job('bus_driver', '버스기사', 'transport', 'salary', 4300, 500, 3, { color: '#3a8a3a', retireAge: 63, promote: 0.08, stats: { mor: 0.5, hp: 0.5 }, titles: ['마을버스', '시내버스', '고속버스', '배차 과장'], entry: hire(25, 'free', { cost: 200, needNote: '대형면허', text: '시민의 발이 되었다.' }) });
job('trucker', '화물차 기사', 'transport', 'salary', 4500, 600, 2, { color: '#8a3a3a', retireAge: 65, promote: 0.06, risk: 0.04, stats: { hp: 0.7, str: 0.3 }, titles: ['기사', '지입 차주', '운수 사장'], entry: hire(15, 'free', { cost: 8000, needNote: '화물차 구입', text: '전국을 달린다. 휴게소가 집이다.' }) });
job('train_driver', '철도 기관사', 'transport', 'salary', 5000, 900, 3, { color: '#2a5a8a', retireAge: 60, promote: 0.08, pension: 0.4, stats: { int: 0.5, mor: 0.5 }, titles: ['부기관사', '기관사', 'KTX 기관사', '승무사업소장'], entry: hire(50, 'free', { cost: 1500, needNote: '철도면허 교육', text: '열차 운전석에 앉았다.' }) });
job('navigator', '항해사', 'transport', 'salary', 5500, 2500, 4, { fame: 0.5, color: '#1a3a6a', retireAge: 65, promote: 0.1, risk: 0.03, stats: { str: 0.3, int: 0.4, hp: 0.3 }, titles: ['3등 항해사', '2등 항해사', '1등 항해사', '선장', '도선사'], entry: school('해양대 졸업', 'free') });

// ── 미디어·예술 ──
job('youtuber', '유튜버', 'media', 'creator', 0, 0, 5, { fame: 0.5, color: '#c8322d', retireAge: 0, titles: ['구독자 100명', '구독자 1만', '구독자 10만', '구독자 50만', '골드버튼 100만', '구독자 500만'], creator: { incomes: [300, 1800, 5500, 14000, 36000, 90000], stat: 'cha', talent: 'star', base: 0.04, div: 1200 }, entry: start('stage', { text: '카메라 대신 폰을 들었다. 첫 영상 조회수 37.' }) });
job('entertainer', '연예인', 'media', 'creator', 0, 0, 5, { fame: 2, color: '#d9559b', retireAge: 0, titles: ['무명', '조연', '주연', '흥행 스타', '천만 배우', '월드 스타'], creator: { incomes: [500, 2500, 7000, 18000, 45000, 120000], stat: 'cha', talent: 'star', base: 0.02, div: 1600 }, entry: special('기획사 데뷔·길거리 캐스팅', 'stage') });
job('actor', '연극배우', 'media', 'creator', 0, 0, 5, { fame: 1, color: '#8a2a4a', retireAge: 0, titles: ['대학로 배우', '단역', '조연', '주연', '연기파 배우', '국민 배우'], creator: { incomes: [800, 2000, 5000, 12000, 30000, 80000], stat: 'cha', talent: 'star', base: 0.02, div: 1800 }, entry: start('stage', { text: '대학로 소극장 무대에 섰다. 관객 스무 명.' }) });
job('model', '모델', 'media', 'creator', 0, 0, 5, { fame: 1, color: '#f0f0f0', retireAge: 0, titles: ['지망생', '쇼핑몰 모델', '패션쇼', '광고 모델', '톱모델', '해외 컬렉션'], creator: { incomes: [300, 1500, 4000, 10000, 25000, 60000], stat: 'cha', talent: 'star', base: 0.025, div: 1400 }, entry: hire(60, 'stage', { maxAge: 30, text: '에이전시와 계약했다.' }) });
job('voice_actor', '성우', 'media', 'salary', 3000, 1500, 4, { color: '#5a3a6a', retireAge: 75, promote: 0.1, stats: { cha: 0.8, int: 0.2 }, titles: ['전속 성우', '프리랜서', '주연급', '국민 목소리', '레전드'], entry: hire(60, 'stage', { text: '방송사 공채 성우가 되었다.' }) });
job('writer', '웹툰·웹소설 작가', 'media', 'creator', 0, 0, 5, { fame: 1, color: '#6e8a3a', retireAge: 0, titles: ['지망생', '신인 연재', '인기 연재', '베스트셀러', '드라마화', '글로벌 IP'], creator: { incomes: [100, 1500, 5000, 13000, 30000, 70000], stat: 'int', talent: 'artist', base: 0.015, div: 1800 }, entry: start('stage', { text: '무료 연재 플랫폼에 1화를 올렸다. 댓글 0개.' }) });
job('novelist', '소설가', 'media', 'creator', 0, 0, 5, { fame: 2, color: '#4a3a2a', retireAge: 0, titles: ['습작생', '등단', '첫 단행본', '베스트셀러', '문학상 수상', '노벨문학상 후보'], creator: { incomes: [50, 600, 2000, 8000, 20000, 50000], stat: 'int', talent: 'artist', base: 0.012, div: 1500 }, entry: start('stage', { text: '신춘문예에 원고를 보냈다.' }) });
job('musician', '음악가', 'media', 'creator', 0, 0, 5, { fame: 1.5, color: '#7a3a6e', retireAge: 0, titles: ['인디', '세션', '정규 앨범', '음원 차트', '전국 투어', '빌보드'], creator: { incomes: [400, 1800, 4000, 10000, 25000, 60000], stat: 'cha', talent: 'artist', base: 0.02, div: 1800 }, entry: start('stage', { cost: 300, text: '홍대 클럽에서 첫 공연. 관객 여섯 명.' }) });
job('painter', '화가', 'media', 'creator', 0, 0, 5, { fame: 1.5, color: '#c9a227', retireAge: 0, titles: ['무명 화가', '단체전', '개인전', '미술관 초대', '국전 대상', '거장'], creator: { incomes: [200, 900, 2500, 6000, 12000, 25000], stat: 'cha', talent: 'artist', base: 0.02, div: 1800 }, entry: school('미대 졸업', 'stage') });
job('photographer', '사진작가', 'media', 'creator', 0, 0, 5, { fame: 1, color: '#2a2a2a', retireAge: 0, titles: ['어시스턴트', '스냅 작가', '스튜디오 실장', '화보 작가', '개인전', '세계적 작가'], creator: { incomes: [1500, 2500, 4500, 9000, 18000, 35000], stat: 'cha', talent: 'artist', base: 0.025, div: 1800 }, entry: start('stage', { cost: 800, text: '카메라 장비에 800만원을 썼다.' }) });
job('designer', '디자이너', 'media', 'salary', 3000, 1000, 5, { color: '#e05a5a', promote: 0.13, stats: { cha: 0.6, int: 0.4 }, titles: ['주니어', '디자이너', '시니어', '아트디렉터', '크리에이티브 디렉터', '브랜드 대표'], entry: hire(45, 'stage', { text: '디자인 에이전시에 들어갔다. 수정만 17번째.' }) });
job('journalist', '기자', 'media', 'salary', 3800, 900, 5, { fame: 1.5, color: '#5a4a6e', promote: 0.1, stats: { int: 0.5, cha: 0.5 }, titles: ['수습기자', '기자', '차장', '부장', '논설위원', '편집국장'], entry: exam('journalist', 'study', { univ: true }) });
job('pd', 'PD', 'media', 'salary', 4500, 1500, 5, { fame: 1.5, color: '#3a3a5a', promote: 0.1, stats: { int: 0.5, cha: 0.5 }, titles: ['조연출', 'PD', '메인 PD', 'CP', '본부장', '스타 PD'], entry: exam('pd', 'stage', { univ: true }) });
job('announcer', '아나운서', 'media', 'salary', 4500, 1500, 4, { fame: 2.5, color: '#4a3a5a', promote: 0.1, stats: { cha: 0.7, int: 0.3 }, titles: ['아나운서', '메인 앵커', '간판 아나운서', '국장', '프리 선언 스타'], entry: exam('announcer', 'stage', { univ: true }) });

// ── 스포츠 ──
job('athlete', '운동선수', 'sport', 'athlete', 3000, 4000, 5, { fame: 2, color: '#2f7d4a', retireAge: 0, risk: 0.06, titles: ['신인', '1군', '주전', '에이스', '국가대표', '레전드'], entry: special('프로 입단 테스트', 'sport') });
job('gamer', '프로게이머', 'sport', 'creator', 0, 0, 5, { fame: 1, color: '#3a3a8c', retireAge: 0, titles: ['연습생', '2군', '1군', '주전', '국가대표', '월드 챔피언'], creator: { incomes: [0, 2000, 5000, 12000, 30000, 60000], stat: 'int', talent: 'athlete', base: 0.05, div: 900 }, entry: special('입단 테스트 (24세 이하)', 'sport') });
job('trainer', '트레이너', 'sport', 'salary', 2600, 900, 4, { color: '#2a8a5a', retireAge: 60, promote: 0.12, stats: { str: 0.6, cha: 0.4 }, titles: ['트레이너', '팀장', 'PT 원장', '연예인 트레이너', '피트니스 체인'], entry: hire(45, 'sport', { cost: 300, needNote: '생활체육지도사', text: 'PT 회원을 모으러 헬스장에 나갔다.' }) });
job('coach', '코치', 'sport', 'salary', 3500, 1500, 4, { fame: 1, color: '#2a6a3a', retireAge: 65, promote: 0.1, stats: { str: 0.3, mor: 0.4, cha: 0.3 }, titles: ['코치', '수석코치', '감독', '명감독', '국가대표 감독'], entry: special('선수 은퇴 후', 'sport') });

// ── 장사·사업 ──
job('founder', '창업가', 'biz', 'business', 0, 0, 5, { fame: 1, color: '#6a3d8f', retireAge: 72, titles: ['스타트업', '시리즈 A', '중소기업', '중견기업', '상장사', '대기업 총수'], entry: start('business', { cost: 5000, text: '작은 사업체를 차렸다. 3년 안에 망하는 회사가 절반이다.' }) });
job('shopkeeper', '치킨집 사장', 'biz', 'business', 0, 0, 3, { color: '#a0522d', retireAge: 70, titles: ['동네 가게', '단골 맛집', '2호점', '프랜차이즈'], biz: { base: 1800, sd: 18, step: 3500, fail: -32 }, entry: start('business', { cost: 15000, text: '동네에 치킨집을 열었다. 경쟁 가게가 길 건너에만 셋이다.' }) });
job('cafe_owner', '카페 사장', 'biz', 'business', 0, 0, 3, { color: '#8a5a3a', retireAge: 70, titles: ['동네 카페', '인스타 핫플', '2호점', '카페 브랜드'], biz: { base: 1200, sd: 20, step: 3500, fail: -30 }, entry: start('business', { cost: 12000, text: '작은 카페를 열었다. 한 블록에 카페가 일곱 개다.' }) });
job('cvs_owner', '편의점 점주', 'biz', 'business', 0, 0, 2, { color: '#3aa03a', retireAge: 72, titles: ['편의점 1호', '2개 점포', '다점포 점주'], biz: { base: 2800, sd: 10, step: 2500, fail: -36 }, entry: start('business', { cost: 8000, text: '24시간 불 꺼지지 않는 가게의 주인이 되었다.' }) });
job('online_shop', '온라인 쇼핑몰 대표', 'biz', 'business', 0, 0, 4, { color: '#e05a8a', retireAge: 70, titles: ['부업', '월 매출 1억', '브랜드', '홈쇼핑 진출', '연 매출 500억'], biz: { base: 1500, sd: 26, step: 5000, fail: -28 }, entry: start('business', { cost: 2000, text: '스마트스토어를 열었다.' }) });
job('restaurant', '식당 사장', 'biz', 'business', 0, 0, 3, { color: '#b04a2a', retireAge: 72, titles: ['동네 식당', '줄 서는 집', '방송 출연 맛집', '외식 기업'], biz: { base: 2200, sd: 20, step: 4000, fail: -30 }, entry: start('business', { cost: 20000, text: '할머니 비법으로 식당을 열었다.' }) });
job('landlord', '건물주', 'biz', 'fixed', 0, 0, 0, { fame: 0.5, color: '#b8860b', retireAge: 0, entry: special('상가 건물 보유', 'business') });

// ── 농림어업 ──
job('farmer', '농부', 'farm', 'business', 0, 0, 3, { color: '#6a8a2a', retireAge: 0, risk: 0.02, titles: ['초보 농부', '작목반장', '명품 브랜드 농가', '영농법인 대표'], biz: { base: 2000, sd: 15, step: 2500, fail: -45 }, entry: start('free', { cost: 3000, text: '귀농했다. 첫해 농사는 벌레 반, 작물 반.' }) });
job('smart_farmer', '스마트팜 경영', 'farm', 'business', 0, 0, 4, { color: '#3aa06a', retireAge: 0, titles: ['창업농', '스마트팜 1동', '5동', '수출 농가', '애그테크 기업'], biz: { base: 2500, sd: 20, step: 4000, fail: -35 }, entry: start('business', { cost: 20000, text: '센서와 LED로 키우는 농장을 지었다.' }) });
job('fisher', '어부', 'farm', 'business', 0, 0, 3, { color: '#2a5a7a', retireAge: 0, risk: 0.05, titles: ['선원', '선장', '어선 2척', '수산 법인'], biz: { base: 3000, sd: 22, step: 3000, fail: -45 }, entry: start('free', { cost: 5000, text: '작은 어선을 샀다. 바다는 정직하지 않다.' }) });
job('rancher', '축산업', 'farm', 'business', 0, 0, 3, { color: '#8a6a4a', retireAge: 0, risk: 0.02, titles: ['소 10두', '소 50두', '한우 명가', '축산 법인'], biz: { base: 3000, sd: 18, step: 4000, fail: -40 }, entry: start('business', { cost: 30000, text: '한우 열 마리로 시작했다.' }) });

// ── 미래 직업 (timeline.ts의 JOB_FROM 해가 되어야 열린다) ──
job('ai_trainer', 'AI 조련사', 'tech', 'salary', 3800, 1500, 4, { fame: 0.3, color: '#4a5aa8', promote: 0.13, stats: { int: 0.7, cha: 0.3 }, titles: ['데이터 라벨러', 'AI 튜너', '시니어 튜너', '모델 책임자', 'AI 수석'], entry: hire(52, 'study', { univ: true, text: 'AI에게 사람의 말과 눈치를 가르치는 일을 시작했다.' }) });
job('robot_tech', '로봇 정비사', 'trade', 'salary', 3600, 1000, 4, { color: '#8a8a9a', retireAge: 65, promote: 0.09, risk: 0.03, stats: { int: 0.5, str: 0.4, mor: 0.1 }, titles: ['견습', '정비사', '선임 정비사', '정비 반장', '로봇 명장'], entry: hire(28, 'free', { cost: 400, text: '가정용 로봇을 고치러 집집마다 다닌다. "관절에서 소리가 나요."' }) });
job('drone_control', '드론 교통 관제사', 'transport', 'salary', 4000, 1100, 4, { color: '#3a8ac8', retireAge: 62, promote: 0.08, stats: { int: 0.7, mor: 0.3 }, titles: ['관제 보조', '관제사', '선임 관제사', '관제 팀장', '관제소장'], entry: hire(45, 'public', { text: '도시 하늘을 오가는 배송·택시 드론 수천 대를 지켜본다.' }) });
job('climate_eng', '기후 엔지니어', 'tech', 'salary', 5000, 1600, 5, { fame: 1, color: '#2a8a6a', promote: 0.1, stats: { int: 0.9, mor: 0.1 }, titles: ['연구원', '선임', '책임', '수석', '본부장', '기후청장'], entry: hire(62, 'study', { univ: true, text: '폭염과 해수면을 막는 설계를 한다. 일이 끊길 걱정은 없다.' }) });
job('vr_architect', '가상공간 건축가', 'media', 'salary', 4200, 1800, 4, { fame: 0.5, color: '#9a4ad0', promote: 0.12, stats: { int: 0.5, cha: 0.5 }, titles: ['주니어', '디자이너', '시니어', '아트 디렉터', '월드 빌더'], entry: hire(50, 'stage', { text: '사람들이 퇴근 뒤 모이는 가상 도시를 짓는다.' }) });
job('care_robot_mgr', '돌봄 로봇 매니저', 'medical', 'salary', 3600, 900, 2, { fame: 0.5, color: '#d6c6b6', retireAge: 70, promote: 0.08, stats: { mor: 0.6, int: 0.4 }, titles: ['매니저', '팀장', '센터장'], entry: hire(20, 'public', { text: '어르신 스무 분의 돌봄 로봇을 관리한다. 로봇이 못 하는 말벗은 내 몫이다.' }) });
job('longevity_doc', '노화 역전 전문의', 'medical', 'salary', 12000, 5000, 5, { fame: 2, color: '#f0f0ff', retireAge: 80, promote: 0.12, stats: { int: 0.7, mor: 0.3 }, titles: ['전임의', '전문의', '센터장', '교수', '연구원장', '장수의학회장'], entry: hire(80, 'study', { needFlags: ['track:med_school'], needNote: '의대 졸업', text: '100세를 70세 몸으로 되돌리는 치료를 한다. 대기 명단이 3년이다.' }) });
job('ai_auditor', 'AI 윤리 감사관', 'legal', 'salary', 5500, 1800, 4, { fame: 1, color: '#5a4a3a', promote: 0.1, stats: { int: 0.6, mor: 0.4 }, titles: ['감사관보', '감사관', '선임 감사관', '감사국장', 'AI 윤리위원장'], entry: hire(66, 'public', { univ: true, text: 'AI가 내린 판단이 공정했는지 따진다. 상대는 사람보다 말을 잘한다.' }) });
job('space_tech', '달 기지 기술자', 'tech', 'salary', 8000, 3000, 4, { fame: 1.5, color: '#c0c8d8', retireAge: 55, promote: 0.1, risk: 0.05, stats: { int: 0.6, str: 0.3, hp: 0.1 }, titles: ['훈련생', '기지 기술자', '선임 기술자', '기지 반장', '기지 사령관'], entry: hire(70, 'study', { needFlags: ['eng_school', 'grad_school'], needNote: '공대·대학원', text: '6개월 교대 근무. 창밖으로 푸른 지구가 뜬다.' }) });
job('bci_surgeon', '뉴럴 인터페이스 의사', 'medical', 'salary', 14000, 5500, 5, { fame: 2, color: '#e0d0ff', retireAge: 75, promote: 0.12, stats: { int: 0.8, mor: 0.2 }, titles: ['전임의', '전문의', '과장', '센터장', '교수', '뉴럴의학 권위자'], entry: hire(82, 'study', { needFlags: ['track:med_school'], needNote: '의대 졸업', text: '머릿속에 칩을 심는 수술을 한다. 손이 떨리면 안 된다.' }) });
job('memory_designer', '기억 설계사', 'medical', 'salary', 6000, 2500, 4, { fame: 1, color: '#c08ad0', promote: 0.11, stats: { int: 0.5, cha: 0.3, mor: 0.2 }, titles: ['수련생', '설계사', '선임 설계사', '수석 설계사', '기억연구소장'], entry: hire(60, 'study', { univ: true, text: '사람들의 추억을 정리하고, 아픈 기억의 모서리를 다듬는다.' }) });
job('mars_pioneer', '화성 개척민', 'farm', 'salary', 9000, 3000, 4, { fame: 2, color: '#c8603a', retireAge: 70, promote: 0.1, risk: 0.08, stats: { str: 0.5, int: 0.3, hp: 0.2 }, titles: ['이주 후보', '개척민', '돔 관리자', '정착촌 대표', '화성 의회 의원'], entry: hire(55, 'free', { maxAge: 45, text: '편도 티켓이다. 붉은 하늘 아래 새 삶을 시작했다.' }) });
job('terraformer', '테라포밍 기술자', 'tech', 'salary', 9000, 3000, 5, { fame: 1.5, color: '#c87a4a', retireAge: 90, promote: 0.1, risk: 0.04, stats: { int: 0.7, str: 0.3 }, titles: ['현장 연구원', '기술자', '선임 기술자', '구역 책임자', '대기 설계 총괄', '행성 개조 위원장'], entry: hire(68, 'study', { needFlags: ['eng_school', 'grad_school'], needNote: '공대·대학원', text: '화성의 하늘을 파랗게 바꾸는 일을 한다. 결과는 100년 뒤에 나온다.' }) });
job('asteroid_miner', '소행성 광부', 'trade', 'salary', 7000, 2500, 4, { fame: 0.5, color: '#8a7a6a', retireAge: 80, promote: 0.09, risk: 0.09, stats: { str: 0.6, hp: 0.3, int: 0.1 }, titles: ['견습 채굴사', '채굴사', '선임 채굴사', '광산 반장', '광산 소장'], entry: hire(30, 'free', { maxAge: 50, text: '2년 계약으로 소행성대에 왔다. 창밖은 빙글빙글 도는 돌덩이들.' }) });
job('orbital_architect', '궤도 도시 건축가', 'tech', 'salary', 8500, 3200, 5, { fame: 1.5, color: '#6a8ac8', retireAge: 90, promote: 0.11, stats: { int: 0.7, cha: 0.3 }, titles: ['설계사', '선임 설계사', '구역 설계 책임', '수석 건축가', '도시 총괄 건축가', '궤도 도시의 아버지(어머니)'], entry: hire(70, 'study', { univ: true, text: '회전하는 원통 안에 공원과 강을 설계한다.' }) });
job('upload_engineer', '의식 업로드 엔지니어', 'medical', 'salary', 11000, 4000, 4, { fame: 1, color: '#b0a0e0', retireAge: 95, promote: 0.1, stats: { int: 0.8, mor: 0.2 }, titles: ['수련 엔지니어', '엔지니어', '선임 엔지니어', '업로드 센터장', '디지털 인격 윤리 위원'], entry: hire(74, 'study', { univ: true, text: '한 사람의 평생을 데이터로 옮기는 일. 손끝이 떨린다.' }) });
job('xeno_biologist', '외계 생물학자', 'edu', 'salary', 8000, 3500, 5, { fame: 2, color: '#4ac8a0', retireAge: 95, promote: 0.1, stats: { int: 0.9, mor: 0.1 }, titles: ['연구원', '선임 연구원', '유로파 탐사대원', '책임 연구원', '외계 생명 연구소장', '태양계 과학원장'], entry: hire(76, 'study', { needFlags: ['grad_school', 'univ_top'], needNote: '대학원 유리', text: '얼음 바다 아래 미생물과 첫 눈을 맞췄다.' }) });
job('star_navigator', '성간 항법사', 'transport', 'salary', 12000, 4500, 4, { fame: 2.5, color: '#e0d080', retireAge: 100, promote: 0.08, risk: 0.05, stats: { int: 0.7, hp: 0.2, mor: 0.1 }, titles: ['항법 훈련생', '항법사', '선임 항법사', '수석 항법사', '성간선 함장'], entry: hire(80, 'study', { univ: true, maxAge: 40, text: '별과 별 사이의 길을 읽는다. 한 번의 계산 실수가 수십 년을 잃게 한다.' }) });
job('sea_farmer', '해양 도시 양식가', 'farm', 'business', 0, 0, 4, { color: '#2a7aa0', retireAge: 0, titles: ['창업 양식장', '부유식 양식장 1기', '5기', '수출 선단', '해양 식량 기업'], biz: { base: 3000, sd: 20, step: 4500, fail: -35 }, entry: start('business', { cost: 25000, text: '바다 위 도시 아래에 해조류·어류 양식장을 띄웠다.' }) });
// 히든 직업: 숨겨진 루트로만 된다 (hidden.ts)
for (const h of HIDDEN) job(h.id, h.name, 'etc', 'fixed', h.pay, 0, 0, { fame: 0, color: h.color, retireAge: 0, entry: special('히든 루트', 'free') });

export const JOBS: Record<string, JobDef> = Object.fromEntries(LIST.map((j) => [j.id, j]));
export const JOB_IDS = LIST.map((j) => j.id);

/** 창작 직업 (하위 호환) */
export const CREATORS: Record<string, CreatorDef> = Object.fromEntries(LIST.filter((j) => j.creator).map((j) => [j.id, j.creator!]));

/**
 * 시험·공채. 붙을 때까지 매년 도전(준비 방식 선택)하거나 포기한다.
 * 점수 = 능력치 가중합 + 준비 보너스 + 경험(재수) 보너스 → 합격선과 비교
 */
export interface ExamDef {
  name: string;
  job: string;
  level: number;
  stats: Partial<Stats>;
  pass: number;
  univ?: boolean;
  /** 이 플래그가 있으면 +8 */
  bonusFlags?: string[];
  maxTries?: number;
  desc: string;
}
const X = (name: string, job: string, stats: Partial<Stats>, pass: number, desc: string, o: Partial<ExamDef> = {}): ExamDef => ({ name, job, level: 0, stats, pass, desc, ...o });
export const EXAMS: Record<string, ExamDef> = {
  corp: X('대기업 공채', 'corp', { int: 0.6, cha: 0.4 }, 60, '서류·인적성·면접. 스펙 싸움이다.', { univ: true, bonusFlags: ['univ_top'] }),
  public_corp: X('공기업 NCS', 'public_corp', { int: 0.8, mor: 0.2 }, 60, '신의 직장. 경쟁률이 수백 대 일.', { univ: true }),
  banker: X('은행 공채', 'banker', { int: 0.6, cha: 0.4 }, 60, '금융권 필기와 합숙 면접.', { univ: true, bonusFlags: ['univ_top'] }),
  analyst: X('증권사 리서치 공채', 'analyst', { int: 0.9, cha: 0.1 }, 66, '숫자로 미래를 맞혀야 한다.', { univ: true, bonusFlags: ['univ_top'] }),
  civil: X('9급 공무원 시험', 'civil', { int: 0.6, mor: 0.4 }, 54, '철밥통을 향한 공시생의 길.'),
  civil5: X('5급 행정고시', 'civil', { int: 1 }, 76, '합격하면 바로 사무관.', { level: 4, univ: true, bonusFlags: ['univ_top'] }),
  tax_civil: X('세무직 9급', 'tax_officer', { int: 0.7, mor: 0.3 }, 54, '회계학이 필수 과목이다.'),
  police: X('경찰 공무원 시험', 'police', { int: 0.4, str: 0.4, mor: 0.2 }, 50, '필기에 체력 시험까지.', { bonusFlags: ['served'] }),
  coast_guard: X('해양경찰 시험', 'coast_guard', { str: 0.5, hp: 0.3, int: 0.2 }, 50, '수영 실기가 있다.', { bonusFlags: ['served'] }),
  firefighter: X('소방 공무원 시험', 'firefighter', { str: 0.5, hp: 0.3, int: 0.2 }, 50, '체력이 곧 실력.', { bonusFlags: ['served'] }),
  corrections: X('교정직 시험', 'prison_guard', { int: 0.5, mor: 0.5 }, 48, '교도소가 직장이 된다.'),
  postal: X('우정직 시험', 'mail_carrier', { int: 0.5, hp: 0.5 }, 44, '우체국 집배원 채용.'),
  diplomat: X('외교관 후보자 시험', 'diplomat', { int: 0.7, cha: 0.3 }, 76, '외교부의 문은 좁다.', { univ: true, bonusFlags: ['univ_top'] }),
  judge: X('판사 임용', 'judge', { int: 0.8, mor: 0.2 }, 76, '법조 경력과 성적이 모두 필요하다.'),
  prosecutor: X('검사 임용', 'prosecutor', { int: 0.7, cha: 0.3 }, 72, '로스쿨 성적과 실무수습 평가.'),
  teacher: X('교원 임용고시', 'teacher', { int: 0.6, mor: 0.4 }, 60, '교대·사범대 출신이 유리하다.', { univ: true, bonusFlags: ['edu_school'] }),
  accountant: X('CPA (공인회계사)', 'accountant', { int: 1 }, 70, '숫자와의 전쟁.', { univ: true }),
  tax_accountant: X('세무사 시험', 'tax_accountant', { int: 1 }, 66, '세법만 수천 페이지.'),
  patent: X('변리사 시험', 'patent_attorney', { int: 1 }, 74, '공대생들의 고시.', { univ: true, bonusFlags: ['eng_school'] }),
  scrivener: X('법무사 시험', 'scrivener', { int: 0.8, mor: 0.2 }, 66, '등기의 달인이 되는 길.'),
  appraiser: X('감정평가사 시험', 'appraiser', { int: 1 }, 68, '땅값을 매기는 사람.'),
  labor: X('공인노무사 시험', 'labor_attorney', { int: 0.8, mor: 0.2 }, 64, '노동법 전문가.'),
  customs: X('관세사 시험', 'customs_broker', { int: 0.9, mor: 0.1 }, 62, '수출입 통관의 전문가.'),
  realtor: X('공인중개사 시험', 'realtor', { int: 0.8, mor: 0.2 }, 45, '국민 자격증. 응시자가 수십만 명.'),
  journalist: X('언론고시', 'journalist', { int: 0.5, cha: 0.5 }, 64, '논술·작문·면접.', { univ: true, bonusFlags: ['univ_top'] }),
  pd: X('방송사 PD 공채', 'pd', { int: 0.5, cha: 0.5 }, 68, '기획안 하나로 승부한다.', { univ: true, bonusFlags: ['univ_top'] }),
  announcer: X('아나운서 공채', 'announcer', { cha: 0.7, int: 0.3 }, 72, '경쟁률 1000:1.', { univ: true }),
  attendant: X('항공사 승무원 공채', 'flight_attendant', { cha: 0.6, hp: 0.4 }, 58, '미소와 체력의 시험.'),
  developer: X('IT 기업 코딩테스트', 'developer', { int: 1 }, 58, '알고리즘 문제를 풀어야 한다.', { bonusFlags: ['bootcamp', 'eng_school'] }),
  electric: X('전기기사 자격시험', 'electrician', { int: 0.7, str: 0.3 }, 46, '필기와 실기.'),
  pilot: X('항공사 조종사 채용', 'pilot', { hp: 0.4, int: 0.4, str: 0.2 }, 62, '비행 교육 이수 후 채용 시험.', { bonusFlags: ['flight_school', 'served'] }),
  bar: X('변호사 시험', 'lawyer', { int: 1 }, 60, '로스쿨 졸업 후 5번만 볼 수 있다.', { maxTries: 5 }),
  professor: X('교수 임용', 'professor', { int: 0.8, mor: 0.2 }, 72, '논문 실적과 인맥의 싸움. 자리가 잘 안 난다.'),
  nurse: X('간호사 국가고시', 'nurse', { int: 0.6, mor: 0.4 }, 38, '대부분 붙는다.'),
  pharmacist: X('약사 국가고시', 'pharmacist', { int: 1 }, 45, '대부분 붙는다.'),
  dentist: X('치과의사 국가고시', 'dentist', { int: 1 }, 45, '대부분 붙는다.'),
  kmd: X('한의사 국가고시', 'kmd', { int: 1 }, 45, '대부분 붙는다.'),
  vet: X('수의사 국가고시', 'vet', { int: 1 }, 45, '대부분 붙는다.'),
  pt: X('물리치료사 국가고시', 'pt', { int: 0.7, mor: 0.3 }, 38, '대부분 붙는다.'),
  radiographer: X('방사선사 국가고시', 'radiographer', { int: 1 }, 40, '대부분 붙는다.'),
  clinical: X('임상병리사 국가고시', 'clinical', { int: 1 }, 40, '대부분 붙는다.'),
  emt: X('응급구조사 국가고시', 'emt', { int: 0.6, mor: 0.4 }, 36, '대부분 붙는다.'),
};

/** 시험 준비 방식: [이름, 비용(만원), 점수 보너스] */
export const PREP_TIERS: [string, number, number][] = [
  ['독학', 0, 0],
  ['인강', 200, 4],
  ['학원', 800, 8],
  ['1타 강사 + 고시원 올인', 2500, 13],
];
