// 근현대사 모드의 숫자 뼈대 (의존성 없음).
//
// 돈은 모든 모드에서 "2025년 돈 가치(만원)"로 센다. 그래서 과거로 가면 두 가지만 바뀐다.
//  1) 소득 수준: 1인당 실질 GDP(한국은행·세계은행, 2025=1)를 따른다. 1960년은 오늘의 약 1/32이지만,
//     그대로 쓰면 거의 모든 선택지가 막혀 놀 수가 없어 0.55제곱으로 눌렀다 (1960 ≈ 0.15, 1980 ≈ 0.31, 2000 ≈ 0.68).
//  2) 자산값: "그해 소득 대비 얼마나 비쌌나"(2025=1)를 연표로 따른다.
//     서울 아파트는 1978 투기 광풍·1990 폭등·IMF 폭락·2006 버블세븐·2021 영끌을,
//     땅은 1970년대 강남 개발, 주식(코스피)은 1989년 1,000 돌파와 IMF·닷컴·금융위기를 그대로 탄다.

type Pts = [number, number][];
function lerp(pts: Pts, y: number): number {
  if (y <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    const [y1, v1] = pts[i];
    if (y <= y1) {
      const [y0, v0] = pts[i - 1];
      return v0 + ((y - y0) / (y1 - y0)) * (v1 - v0);
    }
  }
  return pts[pts.length - 1][1];
}

/** 1인당 실질 GDP (2025 = 1) */
const REAL_INCOME: Pts = [
  [1950, 0.026], [1955, 0.028], [1960, 0.031], [1965, 0.037], [1970, 0.059], [1975, 0.085], [1979, 0.115], [1980, 0.112], [1985, 0.17],
  [1990, 0.276], [1995, 0.39], [1997, 0.44], [1998, 0.41], [2000, 0.49], [2005, 0.6], [2008, 0.67], [2009, 0.67], [2010, 0.72],
  [2015, 0.82], [2019, 0.93], [2020, 0.92], [2025, 1],
];
/** 게임 속 소득 지수 (과거용). 2025년 이후는 pay.ts의 임금 상승률을 쓴다 */
export const histWage = (y: number) => Math.pow(lerp(REAL_INCOME, y), 0.55);

export type HistKey = 'apt_seoul' | 'apt_local' | 'land' | 'building' | 'stock' | 'coin' | 'art';
/** 소득 대비 자산값 (2025 = 1) */
const REL: Record<Exclude<HistKey, 'building'>, Pts> = {
  apt_seoul: [
    [1955, 1.0], [1970, 1.0], [1975, 0.95], [1978, 1.25], [1980, 1.0], [1983, 0.9], [1986, 0.75], [1988, 0.8], [1990, 0.95], [1991, 0.9],
    [1995, 0.55], [1997, 0.45], [1998, 0.36], [2000, 0.4], [2002, 0.55], [2006, 0.9], [2008, 0.8], [2012, 0.55], [2014, 0.55], [2018, 0.75],
    [2021, 1.1], [2022, 1.0], [2023, 0.9], [2025, 1.0],
  ],
  apt_local: [
    [1955, 1.3], [1970, 1.35], [1980, 1.25], [1988, 1.1], [1990, 1.3], [1991, 1.25], [1995, 1.0], [1998, 0.72], [2003, 0.75], [2008, 0.8],
    [2011, 1.05], [2015, 1.05], [2019, 0.93], [2021, 1.05], [2023, 0.97], [2025, 1.0],
  ],
  land: [
    [1955, 0.3], [1960, 0.32], [1965, 0.55], [1970, 0.85], [1975, 1.0], [1978, 1.5], [1980, 1.35], [1985, 1.25], [1988, 1.35], [1990, 1.45],
    [1992, 1.3], [1997, 0.95], [1998, 0.76], [2002, 0.8], [2007, 0.95], [2009, 0.88], [2015, 0.85], [2021, 1.0], [2025, 1.0],
  ],
  stock: [
    [1955, 0.8], [1972, 1.0], [1975, 1.4], [1978, 1.9], [1980, 1.6], [1985, 2.0], [1987, 3.5], [1989, 4.6], [1990, 3.2], [1992, 2.1],
    [1994, 2.8], [1996, 1.9], [1997, 0.85], [1998, 0.7], [1999, 1.9], [2000, 0.95], [2001, 1.0], [2003, 0.95], [2005, 1.5], [2007, 1.6],
    [2008, 0.85], [2009, 1.15], [2011, 1.35], [2015, 1.2], [2018, 1.15], [2020, 1.05], [2021, 1.3], [2022, 0.95], [2025, 1.0],
  ],
  coin: [[2013, 0.01], [2016, 0.02], [2017, 0.25], [2018, 0.08], [2019, 0.1], [2020, 0.4], [2021, 1.2], [2022, 0.35], [2023, 0.5], [2024, 1.1], [2025, 1.0]],
  art: [[1955, 1], [2025, 1]],
};
export function histRel(k: HistKey, y: number): number {
  if (k === 'building') return (lerp(REL.apt_seoul, y) + lerp(REL.land, y)) / 2;
  if (k === 'coin' && y < 2013) return 0.01;
  return lerp(REL[k], y);
}
/** 2025년 기준 시세 (sim.ts의 기본 시장과 같다) */
export const HIST_BASE: Record<HistKey, number> = { apt_seoul: 250000, apt_local: 30000, land: 20000, building: 350000, stock: 100, coin: 100, art: 100 };
/** 그해 시세 (게임 단위): 2025년 기준값 × 소득 대비 비율 × 소득 지수 */
export const histPrice = (base: number, k: HistKey, y: number) => base * histRel(k, y) * histWage(y);

// ───────────────────────── 시대에 따라 열리고 닫히는 것 ─────────────────────────

/** 이 직업이 생긴 해 (없으면 예전부터 있었다) */
export const JOB_FROM: Record<string, number> = {
  youtuber: 2008, gamer: 2000, developer: 1985, data_scientist: 2012, security: 2000, game_dev: 1995, chip_engineer: 1983,
  online_shop: 2000, delivery_rider: 2012, pet_groomer: 2000, nail_artist: 2000, wedding_planner: 1995, cvs_owner: 1989, barista: 2000,
  flight_attendant: 1969, pilot: 1969, aero_engineer: 1990, smart_farmer: 2015, realtor: 1985, labor_attorney: 1986, appraiser: 1989,
  trainer: 1990, radiographer: 1965, clinical: 1965, emt: 1995, caregiver: 2008, nurse_aide: 1967, voice_actor: 1961, pd: 1961, announcer: 1961,
  model: 1970, writer: 2003, hotelier: 1970, tour_guide: 1970, big_factory: 1970, crane_operator: 1970, train_driver: 1960,
  // 미래 직업 (현대 모드에도 적용: 그해가 와야 생긴다)
  ai_trainer: 2027, robot_tech: 2034, drone_control: 2036, climate_eng: 2038, vr_architect: 2042, care_robot_mgr: 2046, longevity_doc: 2055,
  ai_auditor: 2056, space_tech: 2063, bci_surgeon: 2066, memory_designer: 2080, sea_farmer: 2074, mars_pioneer: 2088,
};
/** 이 해부터 새로 뛰어들 수 없는 직업 (자율주행·드론·AI가 대신한다) */
export const JOB_UNTIL: Record<string, number> = {
  taxi: 2048, bus_driver: 2055, trucker: 2052, delivery_rider: 2045, courier: 2058, cvs_owner: 2060, secretary: 2050, insurance: 2060,
  tour_guide: 2065, mail_carrier: 2065, parttime: 9999, train_driver: 2060, crane_operator: 2055, barista: 2070,
};
/** 직업이 열리는 해 (모드를 가리지 않는 미래 직업은 현대 모드에도) */
export const jobOpen = (era: string | undefined, year: number, id: string) => {
  const from = JOB_FROM[id] ?? 0;
  if ((era === 'history' || from > 2025) && year < from) return false;
  return year < (JOB_UNTIL[id] ?? 99999);
};
/** 수시 전형이 생긴 해 */
export const SUSI_FROM: Record<string, number> = { gyo: 1997, essay: 1997, talent: 1997, rural: 1996, region: 2005, hak: 2008, opp: 2009, equal: 2009 };
/** 대입 시험 이름 */
export function examName(y: number): string {
  if (y < 1969) return '대학별 본고사';
  if (y < 1982) return '대입 예비고사·본고사';
  if (y < 1994) return '학력고사';
  return '수능';
}
/** 육군 복무 개월 수 (병역법 개정 연표) */
export function armyMonths(y: number): number {
  if (y < 1962) return 36;
  if (y < 1968) return 30;
  if (y < 1977) return 36;
  if (y < 1984) return 33;
  if (y < 1990) return 30;
  if (y < 2003) return 26;
  if (y < 2011) return 24;
  if (y < 2020) return 21;
  return 18;
}
/** 제도 시행 연도 */
export const SINCE = {
  livelihood: 2000, // 국민기초생활보장법 (그 전은 생활보호법: 근로능력 없는 사람만 쥐꼬리 지원)
  eitc: 2009, // 근로장려금
  childAllowance: 2018, // 아동수당
  parentBenefit: 2023, // 부모급여 (그 전 영아수당 2022)
  firstMeet: 2022, // 첫만남이용권
  nps: 1988, // 국민연금
  basicPension: 2014, // 기초연금 (2008 기초노령연금)
  healthIns: 1977, // 직장 의료보험
  healthInsAll: 1989, // 전 국민 의료보험
  parentalPay: 2001, // 육아휴직급여
  coin: 2014, // 국내 코인 거래소
} as const;
