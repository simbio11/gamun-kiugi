// 부품 초상화(아틀라스 조립)에서 사람마다 어떤 부품을 쓸지 고른다. DOM을 모르는 순수 함수라 테스트할 수 있다.
//   두상 모양·눈·코·입·머리 모양은 유전자(genes)에서 → 부모를 닮는다
//   피부·머리색은 기존 도트 초상화(bust.ts)와 같은 색 → 가계도의 작은 초상화와 같은 사람으로 보인다
//   옷은 나이(아기~노인)와 직업으로 → 의사는 가운, 경찰은 제복, 아이는 나이별 옷
import type { Person } from '../core/types';

export interface KitPart {
  r: number;
  c: number;
  x: number;
  y: number;
  w: number;
  h: number;
  // 두상
  cx?: number;
  top?: number;
  chin?: number;
  bot?: number;
  fw?: number;
  neck?: number[];
  // 두상·옷·눈·코·입: 섞인 피부색 (두상 피부색으로 바꿔 칠함)
  skin?: number[] | null;
  // 머리카락: 지운 얼굴 자리
  face?: number[];
  // 옷: 목 윗끝·폭, 피부색을 바꿔 칠할 높이
  nw?: number;
  skinY?: number;
  age?: string;
  job?: string;
}
export type KitAtlas = Record<string, KitPart[]>;
export interface KitRef {
  kind: string;
  i: number;
}
export interface KitPick {
  head: KitRef;
  hair: KitRef;
  eyes: KitRef;
  nose: KitRef;
  mouth: KitRef;
  outfit: KitRef;
}

/** FNV-1a — 같은 사람·같은 소금이면 늘 같은 수 */
export function kitHash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const dist = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

// ── 직업 → 옷 무리 ──
const GROUP: Record<string, string[]> = {
  medical: ['doctor', 'dentist', 'kmd', 'vet', 'pharmacist', 'longevity_doc', 'bci_surgeon', 'psychologist', 'optician'],
  nurse: ['nurse', 'nurse_aide', 'caregiver', 'pt', 'radiographer', 'clinical', 'emt', 'dental_hygienist', 'speech_therapist', 'nutritionist', 'care_robot_mgr'],
  lab: ['researcher', 'bio_researcher', 'battery_eng', 'chip_engineer', 'xeno_biologist', 'climate_eng'],
  judge: ['judge'],
  suit: [
    'lawyer', 'prosecutor', 'politician', 'mayor', 'minister', 'president', 'lawmaker', 'office', 'corp', 'public_corp', 'banker', 'analyst', 'marketer', 'sales', 'insurance', 'hr', 'secretary',
    'trader', 'civil', 'tax_officer', 'diplomat', 'accountant', 'tax_accountant', 'patent_attorney', 'scrivener', 'appraiser', 'labor_attorney', 'customs_broker', 'realtor', 'consultant',
    'fund_manager', 'actuary', 'sme_worker', 'sme_ceo', 'ceo', 'founder', 'franchise_ceo', 'developer_re', 'court_officer', 'aide', 'pharma_sales', 'announcer', 'journalist', 'professor',
    'teacher', 'star_lecturer', 'ai_auditor', 'landlord', 'funeral_director', 'hj_mafia', 'hj_trader', 'hj_spy', 'hj_gambler',
  ],
  police: ['police', 'coast_guard', 'prison_guard', 'security_guard', 'hj_bounty'],
  fire: ['firefighter'],
  military: ['officer', 'nco', 'hj_mercenary', 'hj_assassin'],
  pilot: ['pilot', 'aero_engineer', 'air_controller', 'drone_control', 'navigator', 'ship_captain'],
  space: ['space_tech', 'mars_pioneer', 'terraformer', 'asteroid_miner', 'orbital_architect', 'star_navigator'],
  chef: ['chef', 'baker', 'restaurant', 'shopkeeper'],
  service: ['barista', 'bartender', 'sommelier', 'hotelier', 'flight_attendant', 'cafe_owner', 'tour_guide', 'wedding_planner', 'cvs_owner'],
  worker: [
    'factory', 'big_factory', 'electrician', 'welder', 'mechanic', 'carpenter', 'plumber', 'shipbuilder', 'crane_operator', 'heavy_equipment', 'tile_worker', 'robot_tech', 'civil_eng', 'courier',
    'delivery_rider', 'logistics', 'mech_engineer', 'mail_carrier', 'trucker', 'taxi', 'bus_driver', 'train_driver',
  ],
  farm: ['farmer', 'smart_farmer', 'fisher', 'rancher', 'beekeeper', 'forest_ranger', 'sea_farmer', 'hj_natural'],
  sport: ['athlete', 'coach', 'trainer', 'sports_instructor', 'gamer', 'dancer', 'hj_fighter'],
  it: ['developer', 'data_scientist', 'security', 'game_dev', 'ai_engineer', 'ux_designer', 'cloud_eng', 'ai_trainer', 'hj_hacker', 'streamer', 'youtuber', 'upload_engineer'],
};
const JOB_GROUP: Record<string, string> = {};
for (const [g, js] of Object.entries(GROUP)) for (const j of js) JOB_GROUP[j] = g;
export const jobGroupOf = (job: string): string | undefined => JOB_GROUP[job];

/** 옷 칸 목록: [시트, 행, 열들(생략하면 그 행 전부)] */
type Cells = [string, number, number[]?][];
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

// 여성 — outfit-f-uniform(fu 10×10) · outfit-f-special(fs 10×10)
const F_POOL: Record<string, Cells> = {
  medical: [['outfit-f-uniform', 0, [5, 6, 9]], ['outfit-f-uniform', 1, [3, 4, 5, 8, 9]]],
  nurse: [['outfit-f-uniform', 0, range(0, 4)], ['outfit-f-uniform', 1, [0, 1, 2]], ['outfit-f-uniform', 6, [8, 9]]],
  lab: [['outfit-f-uniform', 1, [3, 4, 5, 8, 9]]],
  judge: [['outfit-f-uniform', 2, [8, 9]], ['outfit-f-uniform', 3, [7, 8, 9]]],
  suit: [['outfit-f-uniform', 2, range(0, 7)], ['outfit-f-uniform', 3, range(0, 6)]],
  police: [['outfit-f-special', 6], ['outfit-f-special', 7], ['outfit-f-uniform', 9, range(0, 3)]],
  fire: [['outfit-f-special', 4], ['outfit-f-special', 5, range(0, 5)]],
  military: [['outfit-f-special', 5, [8, 9]], ['outfit-f-special', 9, [8, 9]]],
  pilot: [['outfit-f-special', 3, range(1, 9)], ['outfit-f-special', 2, range(4, 9)]],
  space: [['outfit-f-special', 2], ['outfit-f-special', 3, range(1, 9)]],
  chef: [['outfit-f-uniform', 6, [0, 1]], ['outfit-f-special', 9, [3, 4]]],
  service: [['outfit-f-uniform', 6, range(2, 7)], ['outfit-f-uniform', 7, range(6, 9)]],
  worker: [['outfit-f-uniform', 4, [0, 1, 2, 3, 4, 6, 7, 8, 9]], ['outfit-f-uniform', 5], ['outfit-f-special', 8, range(4, 7)], ['outfit-f-special', 9, [0, 1, 2]]],
  farm: [['outfit-f-special', 9, [5, 6, 7]]],
  sport: [['outfit-f-uniform', 7, range(0, 5)], ['outfit-f-uniform', 8]],
  it: [['outfit-f-uniform', 4, [5]]],
};
// 여성 나이·직업 복장표(outfit-f)의 열: 직업 무리 → 계열
const F_COL: Record<string, string> = {
  farm: 'agriculture', suit: 'business', judge: 'business', medical: 'medical', nurse: 'medical', lab: 'medical', worker: 'craft', it: 'craft',
  service: 'hospitality', chef: 'hospitality', police: 'combat', fire: 'combat', military: 'combat', sport: 'combat',
};

// 남성 — outfit-m-uniform(mu 16×8) · outfit-m-special(ms 16×8) · outfit-m-age(ma 16×8, 머리 없는 칸만)
const M_POOL: Record<string, Cells> = {
  medical: [['outfit-m-uniform', 0, [7, 8, 9, 15]], ['outfit-m-uniform', 1, [5, 6, 7, 13, 14, 15]]],
  nurse: [['outfit-m-uniform', 0, [0, 1, 2, 3, 4, 5, 6, 10, 11, 12, 13, 14]], ['outfit-m-uniform', 1, [0, 1, 2, 3, 4, 8, 9, 10, 11, 12]]],
  lab: [['outfit-m-uniform', 1, [5, 6, 7, 13, 14, 15]], ['outfit-m-uniform', 0, [15]]],
  judge: [['outfit-m-uniform', 2, range(12, 15)]],
  suit: [['outfit-m-uniform', 2, range(0, 11)], ['outfit-m-uniform', 3, range(0, 10)]],
  police: [['outfit-m-uniform', 7, range(0, 6)]],
  fire: [['outfit-m-special', 7, range(10, 15)]],
  military: [['outfit-m-special', 4], ['outfit-m-uniform', 7, range(7, 10)]],
  pilot: [['outfit-m-special', 0, range(7, 15)], ['outfit-m-special', 1, range(7, 15)]],
  space: [['outfit-m-special', 0, range(0, 6)], ['outfit-m-special', 1, range(0, 6)], ['outfit-m-age', 7, [8, 9]]],
  chef: [['outfit-m-uniform', 5, [0, 1, 2]]],
  service: [['outfit-m-uniform', 5, range(3, 11)]],
  worker: [['outfit-m-uniform', 4, range(0, 14)], ['outfit-m-special', 6]],
  farm: [['outfit-m-uniform', 4, [0, 1, 2]], ['outfit-m-special', 5]],
  sport: [['outfit-m-uniform', 6]],
  it: [['outfit-m-uniform', 4, [15]], ['outfit-m-uniform', 3, range(11, 15)]],
};
// 평상복: 셔츠·폴로·티·트레이닝 재킷 (나이별 시트의 조끼·방탄복 칸은 뺀다)
const M_CASUAL: Cells = [['outfit-m-uniform', 3, range(11, 15)], ['outfit-m-uniform', 4, [15]], ['outfit-m-uniform', 6, range(9, 15)], ['outfit-m-age', 1, range(10, 15)]];
const M_KID: Cells = [['outfit-m-age', 0]];
const M_TEEN: Cells = [['outfit-m-age', 1], ['outfit-m-age', 0]];

function cells(atlas: KitAtlas, list: Cells): KitRef[] {
  const out: KitRef[] = [];
  for (const [kind, r, cs] of list)
    (atlas[kind] ?? []).forEach((p, i) => {
      if (p.r === r && (!cs || cs.includes(p.c))) out.push({ kind, i });
    });
  return out;
}
const byAge = (atlas: KitAtlas, kind: string, ages: string[], col?: string): KitRef[] =>
  (atlas[kind] ?? []).flatMap((p, i) => (p.age && ages.includes(p.age) && (!col || p.job === col) ? [{ kind, i }] : []));

/** 여성 나이 → 나이·직업 복장표(outfit-f)의 단계, 아동 복장표(outfit-f-kid)의 나이 */
function femaleAges(age: number): { f: string[]; kid: string[] } {
  if (age < 3) return { f: ['baby'], kid: ['1-2'] };
  if (age < 4) return { f: ['toddler'], kid: ['3'] };
  if (age < 6) return { f: ['toddler'], kid: ['4', '5'] };
  if (age < 9) return { f: ['child'], kid: ['6-7', '8'] };
  if (age < 13) return { f: ['preteen'], kid: ['9-10', '11-12'] };
  if (age < 15) return { f: ['teen'], kid: ['13-14'] };
  if (age < 20) return { f: ['teen'], kid: ['15'] };
  if (age < 35) return { f: ['young-adult'], kid: [] };
  if (age < 50) return { f: ['adult'], kid: [] };
  if (age < 65) return { f: ['middle-aged'], kid: [] };
  if (age < 75) return { f: ['senior'], kid: [] };
  return { f: ['elder'], kid: [] };
}

function outfitPool(atlas: KitAtlas, p: Person, age: number): KitRef[] {
  const g = age >= 20 && age < 75 ? JOB_GROUP[p.job] : undefined;
  if (p.sex === 'F') {
    const A = femaleAges(age);
    if (age < 20) return [...byAge(atlas, 'outfit-f-kid', A.kid), ...byAge(atlas, 'outfit-f', A.f)];
    const job = g ? cells(atlas, F_POOL[g] ?? []) : [];
    const col = g ? F_COL[g] : undefined;
    const aged = col ? byAge(atlas, 'outfit-f', A.f, col) : [];
    const casual = byAge(atlas, 'outfit-f', A.f, undefined).filter((r) => {
      const j = atlas[r.kind][r.i].job;
      return j === 'classic' || j === 'arts' || j === 'commerce' || j === 'agriculture' || j === 'formal';
    });
    const pool = [...job, ...job, ...aged]; // 직업 옷에 무게
    return pool.length ? pool : casual;
  }
  if (age < 13) return cells(atlas, M_KID);
  if (age < 20) return cells(atlas, M_TEEN);
  const job = g ? cells(atlas, M_POOL[g] ?? []) : [];
  return job.length ? job : cells(atlas, M_CASUAL);
}

// 입: 11행 × 6열. 남자는 립스틱 없는 줄만, 7번째 줄(크게 벌린 입)은 평소 얼굴에 안 쓴다
const M_MOUTH_ROWS = [0, 2, 4, 10];
const SHOUT_ROW = 6;
// 코: 첫 줄의 막대 코(2~5열)는 확대하면 어색해서 뺀다
const NOSE_OK = (p: KitPart) => !(p.r === 0 && p.c >= 2);
// 두상: 4번째 줄(하트 모양 이마)은 빼고
const HEAD_ROWS = [0, 1, 2, 4, 5, 6, 7];

export function pickKit(atlas: KitAtlas, p: Person, age: number, skinHex: string): KitPick {
  const g = p.genes;
  const h = kitHash(p.id);
  const f = p.sex === 'F';
  // 두상: 모양은 얼굴형 유전자, 색은 기존 초상화 피부색과 가장 가까운 칸
  const row = HEAD_ROWS[(g.face * 3 + g.brows) % HEAD_ROWS.length];
  const skin = hex(skinHex);
  let head = -1;
  let best = Infinity;
  atlas.heads.forEach((q, i) => {
    if (q.r !== row || !q.skin) return;
    const d = dist(q.skin, skin);
    if (d < best) (best = d), (head = i);
  });
  if (head < 0) head = 0;
  const hairKind = f ? 'hair-f' : 'hair-m';
  const hairN = atlas[hairKind].length;
  // 눈: 여자는 반쯤 화장한 눈 시트에서 (같은 자리의 눈이라 모양은 유전)
  const eyeKind = f && age >= 15 && h % 2 === 0 ? 'eyes-makeup' : 'eyes';
  const eyes = (g.eyes * 13 + g.brows * 5) % atlas[eyeKind].length;
  const noses = atlas.noses.flatMap((q, i) => (NOSE_OK(q) ? [i] : []));
  const lips = f && age >= 15; // 립스틱은 15세 이상 여자만
  const mouths = atlas.mouths.flatMap((q, i) => (q.r !== SHOUT_ROW && (lips || M_MOUTH_ROWS.includes(q.r) || (q.r === 1 && q.c < 2)) ? [i] : []));
  const pool = outfitPool(atlas, p, age);
  const outfit = pool.length ? pool[(h >>> 4) % pool.length] : { kind: f ? 'outfit-f' : 'outfit-m-uniform', i: 0 };
  return {
    head: { kind: 'heads', i: head },
    hair: { kind: hairKind, i: (g.hairStyle * 11 + (h >>> 9)) % hairN },
    eyes: { kind: eyeKind, i: eyes },
    nose: { kind: 'noses', i: noses[(g.face * 7 + g.skin + (h >>> 13)) % noses.length] },
    mouth: { kind: 'mouths', i: mouths[(g.mouth * 7 + (h >>> 17)) % mouths.length] },
    outfit,
  };
}
