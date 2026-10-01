// 보상: 업적·훈장·출세·승리마다 "명예(✦)"가 쌓이고, 등급이 오르고, 명예 상점에서 가문을 영구히 강하게 만든다.
// 큰 순간은 팝업으로 축하한다 (s.rewards 에 쌓아 두면 화면이 하나씩 보여 준다).

import type { GameState, Person, StatKey } from './types';
import { fullName, isMainline } from './people';

import { ERA_HONORS } from './cards-era';
export type Rarity = 'common' | 'rare' | 'epic' | 'legend';
export interface Reward {
  id: number;
  icon: string;
  title: string;
  text: string;
  rarity: Rarity;
  pts: number;
  /** 카드 획득이면 카드 id (카드 모양으로 보여 준다) */
  card?: string;
  /** 초상화를 그릴 인물 */
  personId?: string;
  /** 인생 성적표 등급 */
  grade?: string;
}
export const RARITY_NAME: Record<Rarity, string> = { common: '일반', rare: '희귀', epic: '영웅', legend: '전설' };
const RARITY_PTS: Record<Rarity, number> = { common: 5, rare: 12, epic: 30, legend: 80 };

/** 가문 등급: 누적 명예로 오른다 */
export const RANKS: { at: number; name: string; icon: string; perk?: string }[] = [
  { at: 0, name: '평범한 집안', icon: '🏠' },
  { at: 30, name: '이웃이 아는 집', icon: '🏡', perk: '해마다 명성 +1' },
  { at: 90, name: '동네 유지', icon: '🏘', perk: '행동력 +1' },
  { at: 180, name: '지역 명문가', icon: '🏯', perk: '아이 잠재력 +2' },
  { at: 320, name: '전국구 가문', icon: '🏛', perk: '해마다 명성 +2' },
  { at: 520, name: '명문 세도가', icon: '👑', perk: '행동력 +1' },
  { at: 800, name: '역사에 남을 가문', icon: '📜', perk: '판정 운 +5%' },
  { at: 1200, name: '전설의 가문', icon: '🐉', perk: '모든 혜택 두 배의 영광' },
];
export const rankOf = (s: GameState) => {
  const t = s.gloryTotal ?? 0;
  let i = 0;
  while (i + 1 < RANKS.length && t >= RANKS[i + 1].at) i++;
  return i;
};

/** 난이도별 보정: 정점 도전 판정, 라이벌 체급, 명예 배율 */
export const DIFF_MOD = { easy: { challenge: -4, rival: 1, glory: 0.8 }, normal: { challenge: 0, rival: 1.1, glory: 1 }, hard: { challenge: 3, rival: 1.3, glory: 1.25 }, hell: { challenge: 6, rival: 1.7, glory: 1.5 } } as const;
export const diffMod = (s: GameState) => DIFF_MOD[(s.difficulty ?? 'normal') as keyof typeof DIFF_MOD] ?? DIFF_MOD.normal;

/** 보상 지급: 명예가 쌓이고 팝업이 뜬다. 등급이 오르면 한 번 더 */
export function grant(s: GameState, icon: string, title: string, text: string, rarity: Rarity, pts0 = RARITY_PTS[rarity]) {
  const pts = Math.round(pts0 * diffMod(s).glory);
  const before = rankOf(s);
  s.glory = (s.glory ?? 0) + pts;
  s.gloryTotal = (s.gloryTotal ?? 0) + pts;
  (s.rewards ??= []).push({ id: (s.eventSeq = (s.eventSeq ?? 0) + 1), icon, title, text, rarity, pts });
  s.log.push({ year: s.year, text: `${icon} ${title}${pts ? ` (명예 +${pts}✦)` : ''}`, kind: 'achv' });
  const after = rankOf(s);
  if (after > before) {
    const r = RANKS[after];
    s.fame += after * 3;
    (s.rewards ??= []).push({ id: (s.eventSeq += 1), icon: r.icon, title: `가문 등급 상승: ${r.name}`, text: `${s.familyName}씨 가문이 "${r.name}"(으)로 불리기 시작했다!\n혜택: ${r.perk ?? '-'} · 명성 +${after * 3}`, rarity: after >= 5 ? 'legend' : 'epic', pts: 0 });
  }
}

/** 업적 희귀도 */
const LEGEND = new Set(['president', 'nobel', 'chaebol', 'world_star', 'olympic_gold', 'gen10', 'bicentury', 'rich1000', 'chief_justice', 'prosecutor_general', 'billboard', 'rival_fallen', 'hid_hoh', 'hid_super10']);
const SHAME = new Set(['draft_dodger', 'bankrupt', 'guarantee_victim', 'dui', 'ponzi_victim', 'forgery', 'idle3', 'noble_idle', 'gray_divorce']);
export function achvRarity(id: string, cat: string): Rarity | undefined {
  if (SHAME.has(id)) return undefined;
  if (LEGEND.has(id)) return 'legend';
  if (cat === '영광' || cat === '출세') return 'epic';
  if (cat === '재산' || cat === '가문' || cat === '학업') return 'rare';
  return 'common';
}

// ───────────────────────── 명예 상점 ─────────────────────────

export interface Perk {
  id: string;
  icon: string;
  name: string;
  desc: string;
  cost: number[];
  /** 몇 번이고 살 수 있는 것: 살 때마다 값이 25%씩 오른다 */
  repeat?: (s: GameState) => string;
}
const famAlive = (s: GameState) => Object.values(s.people).filter((p) => !p.deathYear && isMainline(s, p));
export const PERKS: Perk[] = [
  { id: 'ap', icon: '🖼', name: '가훈 액자', desc: '해마다 행동력 +1', cost: [150, 450, 1100, 2400] },
  { id: 'luck', icon: '🏮', name: '조상신의 가호', desc: '모든 판정 운 +3%', cost: [40, 100, 220, 450, 900] },
  { id: 'study', icon: '📚', name: '가문 서재', desc: '자녀 성적이 15% 더 잘 오른다', cost: [35, 90, 200, 420, 850] },
  { id: 'fame', icon: '🎐', name: '가문의 기품', desc: '해마다 명성 +1', cost: [30, 80, 170, 350, 700] },
  { id: 'vault', icon: '💰', name: '가문 금고', desc: '해마다 가주에게 300만 원씩 (물가 반영)', cost: [25, 60, 130, 270, 550, 1100] },
  { id: 'gene', icon: '🧬', name: '명문가의 혈통', desc: '태어나는 아이 잠재력 +2', cost: [80, 220, 500, 1000] },
  { id: 'doctor', icon: '🩺', name: '가문 주치의', desc: '해마다 가족 모두 건강 +1', cost: [60, 150, 320, 650] },
  { id: 'limit', icon: '🔥', name: '한계 돌파 수련', desc: '가주 능력치 한도(잠재력) +3 · 대가: 수련할 때마다 건강 −10, 행복 −10', cost: [300, 700, 1400, 2600, 4500] },
  { id: 'shrine', icon: '🏯', name: '사당 보수 (반복)', desc: '명성 +12', cost: [120], repeat: (s) => ((s.fame += 12), '사당 기와를 새로 얹었다. 명성 +12') },
  { id: 'feast', icon: '🎎', name: '문중 잔치 (반복)', desc: '가족 모두 행복 +10', cost: [90], repeat: (s) => { for (const p of famAlive(s)) p.happiness = Math.min(100, p.happiness + 10); return '온 문중이 모여 잔치를 벌였다. 가족 행복 +10'; } },
  { id: 'scholar', icon: '📜', name: '가문 장학금 (반복)', desc: '학생 자녀 모두 성적 +8', cost: [110], repeat: (s) => { for (const p of famAlive(s)) if (p.study !== undefined && s.year - p.birthYear < 25) p.study = Math.min(100, p.study + 8); return '문중 장학금을 풀었다. 아이들 성적 +8'; } },
];
export const perkLv = (s: GameState, id: string) => s.perks?.[id] ?? 0;
/** 지금 사려면 얼마인가 (없으면 최고 단계) */
export function perkCost(s: GameState, pk: Perk): number | undefined {
  const lv = perkLv(s, pk.id);
  return pk.repeat ? Math.round(pk.cost[0] * Math.pow(1.25, lv)) : pk.cost[lv];
}
export function buyPerk(s: GameState, id: string): { ok: boolean; text: string } {
  const pk = PERKS.find((x) => x.id === id);
  if (!pk) return { ok: false, text: '' };
  const lv = perkLv(s, id);
  const cost = perkCost(s, pk);
  if (cost === undefined) return { ok: false, text: '이미 최고 단계다' };
  if ((s.glory ?? 0) < cost) return { ok: false, text: `명예가 ${cost - (s.glory ?? 0)}✦ 모자란다` };
  s.glory = (s.glory ?? 0) - cost;
  (s.perks ??= {})[id] = lv + 1;
  s.log.push({ year: s.year, text: `${pk.icon} 명예 상점: ${pk.name} ${pk.repeat ? `${lv + 1}번째` : `${lv + 1}단계`}`, kind: 'achv' });
  if (pk.repeat) return { ok: true, text: `${pk.icon} ${pk.repeat(s)}` };
  if (id === 'limit') {
    const h = s.people[s.headId];
    h.overcap = (h.overcap ?? 0) + 3;
    h.actual.hp = Math.max(0, h.actual.hp - 10);
    h.happiness = Math.max(0, h.happiness - 10);
    return { ok: true, text: `🔥 혹독한 수련 끝에 ${h.name}의 한계가 넓어졌다 (능력치 한도 +3). 몸과 마음이 많이 상했다 (건강 −10 · 행복 −10).` };
  }
  return { ok: true, text: `${pk.icon} ${pk.name} ${lv + 1}단계! ${pk.desc}` };
}

/** 능력치는 잠재력(+한계 돌파)을 넘지 못한다: 여러 효과가 겹쳐 넘친 것은 해마다 되돌린다 */
export function capStats(s: GameState, bonus?: (p: Person) => Partial<Record<StatKey, number>>) {
  for (const p of Object.values(s.people)) {
    if (p.deathYear) continue;
    const extra = p.overcap ?? 0;
    const b = bonus?.(p) ?? {};
    for (const k of ['str', 'int', 'cha', 'mor', 'hp'] as const) {
      const cap = Math.min(100, p.potential[k] + extra + (b[k] ?? 0));
      if (p.actual[k] > cap) p.actual[k] = cap;
    }
  }
}

/** 등급·상점 혜택 모음 */
export const bonusAP = (s: GameState) => perkLv(s, 'ap') + (rankOf(s) >= 2 ? 1 : 0) + (rankOf(s) >= 5 ? 1 : 0);
export const bonusLuck = (s: GameState) => perkLv(s, 'luck') * 0.03 + (rankOf(s) >= 6 ? 0.05 : 0);
export const bonusGene = (s: GameState) => perkLv(s, 'gene') * 2 + (rankOf(s) >= 3 ? 2 : 0);
export const bonusStudy = (s: GameState) => 1 + perkLv(s, 'study') * 0.15;
/** 해마다: 명성·금고 */
export function perkYear(s: GameState, wage: number) {
  const fame = perkLv(s, 'fame') + (rankOf(s) >= 1 ? 1 : 0) + (rankOf(s) >= 4 ? 2 : 0);
  s.fame += fame;
  const d = perkLv(s, 'doctor');
  if (d) for (const p of famAlive(s)) p.actual.hp = Math.min(Math.min(100, p.potential.hp + (p.overcap ?? 0)), p.actual.hp + d);
  const v = perkLv(s, 'vault');
  if (v) s.people[s.headId].cash += Math.round(300 * v * wage);
}

// ───────────────────────── 훈장 ─────────────────────────
// 상훈법의 실제 훈장 체계 (12종 훈장 중 게임에 맞는 것들)

export interface Honor {
  name: string;
  icon: string;
  fame: number;
  rarity: Rarity;
  desc: string;
}
export const HONORS: Record<string, Honor> = {
  mugunghwa: { name: '무궁화대훈장', icon: '🌺', fame: 60, rarity: 'legend', desc: '대한민국 최고 훈장. 대통령에게 수여' },
  cheongjo: { name: '청조근정훈장', icon: '🎖', fame: 20, rarity: 'epic', desc: '장관급 공직을 마친 이에게' },
  hwangjo: { name: '황조근정훈장', icon: '🎖', fame: 12, rarity: 'epic', desc: '33년 이상 봉직한 공무원·교원 퇴직' },
  hongjo: { name: '홍조근정훈장', icon: '🎖', fame: 9, rarity: 'rare', desc: '30년 이상 봉직 퇴직' },
  nokjo: { name: '녹조근정훈장', icon: '🎖', fame: 7, rarity: 'rare', desc: '28년 이상 봉직 퇴직' },
  okjo: { name: '옥조근정훈장', icon: '🎖', fame: 5, rarity: 'rare', desc: '25년 이상 봉직 퇴직' },
  tongil: { name: '보국훈장 통일장', icon: '⭐', fame: 18, rarity: 'epic', desc: '장성으로 전역한 군인' },
  cheongnyong: { name: '체육훈장 청룡장', icon: '🏅', fame: 20, rarity: 'legend', desc: '올림픽 금메달리스트' },
  geumgwan: { name: '문화훈장 금관', icon: '🎭', fame: 20, rarity: 'legend', desc: '세계적 예술·대중문화 업적' },
  eungwan: { name: '문화훈장 은관', icon: '🎨', fame: 12, rarity: 'epic', desc: '뛰어난 문화예술 업적' },
  changjo: { name: '과학기술훈장 창조장', icon: '🔬', fame: 25, rarity: 'legend', desc: '인류에 기여한 과학 업적' },
  hyeoksin: { name: '과학기술훈장 혁신장', icon: '🧪', fame: 12, rarity: 'epic', desc: '뛰어난 연구 업적 (논문 40편 이상)' },
  geumtap: { name: '금탑산업훈장', icon: '🏭', fame: 18, rarity: 'legend', desc: '국가 경제를 일으킨 기업가' },
  euntap: { name: '은탑산업훈장', icon: '🏢', fame: 10, rarity: 'epic', desc: '기업을 상장시킨 창업주' },
  moran: { name: '국민훈장 모란장', icon: '💐', fame: 10, rarity: 'epic', desc: '나눔과 봉사로 사회에 기여' },
  sugyo: { name: '수교훈장 흥인장', icon: '🌐', fame: 10, rarity: 'epic', desc: '대사로서 국익에 기여' },
  gwanghwa: { name: '수교훈장 광화대장', icon: '🌏', fame: 30, rarity: 'legend', desc: '국제기구 수장으로 세계 평화에 기여' },
  taeguk: { name: '무공훈장 태극장', icon: '🎗', fame: 25, rarity: 'legend', desc: '국군 최고 지휘관으로 안보를 지켜낸 공로' },
  gukseon: { name: '보국훈장 국선장', icon: '🛡', fame: 12, rarity: 'epic', desc: '드러나지 않게 국가 안보에 기여' },
  dongbaek: { name: '국민훈장 동백장', icon: '🌸', fame: 12, rarity: 'epic', desc: '국민의 생명을 지킨 공로' },
  mugunghwa_nat: { name: '국민훈장 무궁화장', icon: '🏵', fame: 22, rarity: 'legend', desc: '국민 훈장의 최고 등급. 인류와 사회에 크게 공헌' },
  ungbi: { name: '과학기술훈장 웅비장', icon: '🚀', fame: 15, rarity: 'epic', desc: '국가 우주·과학 프로젝트의 주역' },
  ...ERA_HONORS,
};

export function awardHonor(s: GameState, p: Person, id: string, why: string) {
  const h = HONORS[id];
  if (!h || p.flags.includes('honor:' + id)) return;
  p.flags.push('honor:' + id);
  (s.honors ??= []).push({ id, personId: p.id, year: s.year });
  s.fame += h.fame;
  grant(s, h.icon, `훈장 수여: ${h.name}`, `${fullName(p)} — ${why}\n청와대(대통령실)에서 훈장을 받았다. 가문의 영광이다.\n명성 +${h.fame}`, h.rarity);
}

/** 근정훈장: 공무원·교원이 오래 일하고 물러날 때 */
const PUBLIC_JOBS = new Set(['civil', 'tax_officer', 'police', 'coast_guard', 'firefighter', 'prison_guard', 'mail_carrier', 'teacher', 'professor', 'kinder_teacher', 'judge', 'prosecutor', 'public_corp']);
export function retireHonor(s: GameState, p: Person) {
  if (p.job === 'officer' && p.jobLevel >= 6) return awardHonor(s, p, 'tongil', '장군으로 전역');
  if (p.job === 'diplomat' && p.jobLevel >= 4) return awardHonor(s, p, 'sugyo', '대사로 봉직 후 퇴임');
  if (!PUBLIC_JOBS.has(p.job)) return;
  const y = p.jobYears;
  const id = y >= 33 ? 'hwangjo' : y >= 30 ? 'hongjo' : y >= 28 ? 'nokjo' : y >= 25 ? 'okjo' : undefined;
  if (id) awardHonor(s, p, id, `${y}년 봉직 후 정년퇴직`);
}

/** 해마다: 업적성 훈장 (플래그·직업 단계로 판단) */
export function checkHonors(s: GameState) {
  for (const p of Object.values(s.people)) {
    if (p.deathYear !== undefined) continue;
    const f = (x: string) => p.flags.includes(x);
    if (f('president')) awardHonor(s, p, 'mugunghwa', '대한민국 대통령 취임');
    if (f('olympic_gold')) awardHonor(s, p, 'cheongnyong', '올림픽 금메달');
    if (f('nobel')) awardHonor(s, p, 'changjo', '노벨상 수상');
    if ((p.papers ?? 0) >= 40) awardHonor(s, p, 'hyeoksin', `논문 ${p.papers}편, 학계의 거목`);
    if (p.job === 'founder' && p.jobLevel >= 5) awardHonor(s, p, 'geumtap', '그룹을 일군 총수');
    if (f('ipo')) awardHonor(s, p, 'euntap', '회사를 상장시킨 창업주');
    if ((p.job === 'entertainer' && p.jobLevel >= 5) || (p.job === 'musician' && p.jobLevel >= 5) || (p.job === 'writer' && p.jobLevel >= 5)) awardHonor(s, p, 'geumgwan', '세계를 사로잡은 한류');
    if (f('masterpiece') || (['actor', 'novelist', 'painter'].includes(p.job) && p.jobLevel >= 5)) awardHonor(s, p, 'eungwan', f('masterpiece') ? '불후의 명작' : '한 길을 걸어 정상에 서다');
    if ((p.donated ?? 0) >= 50000) awardHonor(s, p, 'moran', `누적 기부 ${Math.round((p.donated ?? 0) / 10000)}억 원`);
  }
}
