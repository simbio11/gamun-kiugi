import type { Person } from './types';
import { addFlag, hasFlag } from './people';

/** 국가 전문직 면허 메타데이터 */
export interface LicenseMeta {
  jobId: string;
  name: string;
  icon: string;
  openLevel: number; // 개원/개업 시 직급
  minReturnLevel: number; // 봉직의/소속 전문직 복귀 시 최소 인정 직급
  openCost: number; // 개원/개업 필요 자금 (만원)
}

export const LICENSED_JOBS: Record<string, LicenseMeta> = {
  doctor: {
    jobId: 'doctor',
    name: '의사 면허증',
    icon: '🩺',
    openLevel: 4, // 개원의
    minReturnLevel: 2, // 전문의 (봉직의)
    openCost: 3500,
  },
  dentist: {
    jobId: 'dentist',
    name: '치과의사 면허증',
    icon: '🦷',
    openLevel: 1, // 개원의
    minReturnLevel: 0, // 페이닥터
    openCost: 3500,
  },
  kmd: {
    jobId: 'kmd',
    name: '한의사 면허증',
    icon: '🌿',
    openLevel: 1, // 개원 한의사
    minReturnLevel: 0, // 부원장
    openCost: 2500,
  },
  pharmacist: {
    jobId: 'pharmacist',
    name: '약사 면허증',
    icon: '💊',
    openLevel: 1, // 약국 개업
    minReturnLevel: 0, // 근무약사
    openCost: 2000,
  },
  vet: {
    jobId: 'vet',
    name: '수의사 면허증',
    icon: '🐾',
    openLevel: 1, // 개원의
    minReturnLevel: 0, // 수의사
    openCost: 2000,
  },
  lawyer: {
    jobId: 'lawyer',
    name: '변호사 자격증',
    icon: '⚖️',
    openLevel: 2, // 파트너/개업 변호사
    minReturnLevel: 1, // 시니어 변호사
    openCost: 2500,
  },
  accountant: {
    jobId: 'accountant',
    name: '공인회계사 자격증',
    icon: '📊',
    openLevel: 2, // 개업/파트너
    minReturnLevel: 1, // 시니어 회계사
    openCost: 2000,
  },
  tax_accountant: {
    jobId: 'tax_accountant',
    name: '세무사 자격증',
    icon: '📑',
    openLevel: 1, // 세무사 개업
    minReturnLevel: 0, // 소속 세무사
    openCost: 1500,
  },
  patent_attorney: {
    jobId: 'patent_attorney',
    name: '변리사 자격증',
    icon: '💡',
    openLevel: 1, // 개업 변리사
    minReturnLevel: 0, // 소속 변리사
    openCost: 2000,
  },
  nurse: {
    jobId: 'nurse',
    name: '간호사 면허증',
    icon: '💉',
    openLevel: 2, // 책임간호사
    minReturnLevel: 1, // 일반간호사
    openCost: 0,
  },
};

/** 특정 직업의 면허를 소지하고 있는지 검사 (취소된 경우 false) */
export function hasLicense(p: Person, jobId: string): boolean {
  if (hasFlag(p, `license_revoked:${jobId}`)) return false;
  if (hasFlag(p, `license:${jobId}`)) return true;

  // 과거에 해당 직업으로 일했거나 현재 해당 직업인 경우 자동 면허 인정 (기존 세이브 호환)
  if (LICENSED_JOBS[jobId]) {
    if (p.job === jobId) {
      addFlag(p, `license:${jobId}`);
      return true;
    }
    if (hasFlag(p, `was_${jobId}`) || hasFlag(p, `prev_level:${jobId}`)) {
      addFlag(p, `license:${jobId}`);
      return true;
    }
  }

  return false;
}

/** 보유 중인 모든 면허 목록 반환 */
export function getLicenses(p: Person): string[] {
  return Object.keys(LICENSED_JOBS).filter((id) => hasLicense(p, id));
}

/** 어떤 전문직 면허라도 가지고 있는지 확인 */
export function hasAnyLicense(p: Person): boolean {
  return getLicenses(p).length > 0;
}

/** 면허 부여 */
export function grantLicense(p: Person, jobId: string): void {
  if (!LICENSED_JOBS[jobId]) return;
  // 취소 플래그가 있었다면 제거
  p.flags = p.flags.filter((f) => f !== `license_revoked:${jobId}`);
  addFlag(p, `license:${jobId}`);
}

/** 면허 취소 (중범죄, 의료사고 등 법적 처벌 시) */
export function revokeLicense(p: Person, jobId: string): void {
  p.flags = p.flags.filter((f) => f !== `license:${jobId}`);
  addFlag(p, `license_revoked:${jobId}`);
  // 현재 그 직업으로 일하고 있다면 즉시 해임
  if (p.job === jobId) {
    p.job = 'none';
    p.jobLevel = 0;
    p.jobYears = 0;
  }
}

/** 과거 직급 저장 (실직이나 퇴직 시 호출) */
export function savePreviousLevel(p: Person, jobId: string, level: number): void {
  p.flags = p.flags.filter((f) => !f.startsWith(`prev_level:${jobId}:`));
  addFlag(p, `prev_level:${jobId}:${level}`);
}

/** 과거 직급 조회 */
export function getPreviousLevel(p: Person, jobId: string): number {
  const prefix = `prev_level:${jobId}:`;
  const f = p.flags.find((x) => x.startsWith(prefix));
  if (f) return Number(f.slice(prefix.length)) || 0;
  return 0;
}

/** 전문직 면허로 복직/개원 시 직급 계산 */
export function calculateReturnLevel(p: Person, jobId: string, isOpen: boolean): number {
  const meta = LICENSED_JOBS[jobId];
  if (!meta) return 0;
  if (isOpen) return meta.openLevel;

  const prev = getPreviousLevel(p, jobId);
  // 이전 직급이 봉직과장(3) 이상이었으면 최소 과장(3)이나 전문의(2) 인정
  const safePrev = Math.max(0, prev > 1 ? prev - 1 : prev);
  return Math.max(meta.minReturnLevel, safePrev);
}

/** 전문직 복직 및 개원 제안 이벤트 */
export const licensedRehireEvent = {
  id: 'licensed_rehire',
  title: () => '🩺 전문직 면허 복직 / 개원 제안',
  text: (c: any) => {
    const p = c.p as Person;
    const lics = getLicenses(p);
    const targetJobId = (c.ev.data?.jobId as string) || lics[0] || 'doctor';
    const meta = LICENSED_JOBS[targetJobId];
    const prevLvl = getPreviousLevel(p, targetJobId);
    const prevTitle = prevLvl > 0 ? ` (과거 직급: ${prevLvl}레벨)` : '';
    return (
      `${p.surname}${p.name}에게 전문직 헤드헌터와 동료들로부터 연락이 왔다.\n` +
      `"선생님의 ${meta?.name ?? '국가 면허'}${prevTitle}을 두고 쉬고 계시기엔 너무 아깝습니다.\n` +
      `병원/기관의 책임 전문직으로 복직하시겠습니까, 아니면 이번 기회에 개인 의원/사무소를 개원하시겠습니까?"`
    );
  },
  choices: (c: any) => {
    const p = c.p as Person;
    const lics = getLicenses(p);
    const targetJobId = (c.ev.data?.jobId as string) || lics[0] || 'doctor';
    const meta = LICENSED_JOBS[targetJobId];
    const retLevel = calculateReturnLevel(p, targetJobId, false);

    const out: any[] = [
      {
        label: `병원 / 전문기관에 복직한다 (${retLevel}레벨 경력직)`,
        run: (x: any) => {
          x.p.job = targetJobId;
          x.p.jobLevel = retLevel;
          x.p.jobYears = 0;
          x.p.happiness = Math.min(100, x.p.happiness + 12);
          return `🩺 ${x.p.surname}${x.p.name}, 국가 면허를 살려 ${retLevel}레벨 경력직으로 현장에 즉시 복직했다!`;
        },
      },
    ];

    if (meta && meta.openCost > 0) {
      out.push({
        label: `개원 / 개업 자금을 들여 독립한다 (비용 ${meta.openCost}만, ${meta.openLevel}레벨 원장)`,
        cost: meta.openCost,
        run: (x: any) => {
          x.p.job = targetJobId;
          x.p.jobLevel = meta.openLevel;
          x.p.jobYears = 0;
          x.s.fame = Math.min(100, x.s.fame + 2);
          x.p.happiness = Math.min(100, x.p.happiness + 18);
          return `🏥 ${x.p.surname}${x.p.name}, 개인 ${meta.name.replace(' 면허증', '').replace(' 자격증', '')} 의원/사무소를 성대하게 개원했다! (원장 취임)`;
        },
      });
    }

    out.push({
      label: '아직은 조금 더 쉬고 싶다 (휴식 유지)',
      run: () => '잠시 숨을 고르며 재충전의 시간을 조금 더 갖기로 했다.',
    });

    return out;
  },
};

export const LICENSED_EVENTS = [licensedRehireEvent];

