// 보상: 업적·훈장·출세·승리마다 "명예(✦)"가 쌓이고, 등급이 오르고, 명예 상점에서 가문을 영구히 강하게 만든다.
// 큰 순간은 팝업으로 축하한다 (s.rewards 에 쌓아 두면 화면이 하나씩 보여 준다).

import type { GameState, Person } from './types';
import { fullName } from './people';

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

/** 보상 지급: 명예가 쌓이고 팝업이 뜬다. 등급이 오르면 한 번 더 */
export function grant(s: GameState, icon: string, title: string, text: string, rarity: Rarity, pts = RARITY_PTS[rarity]) {
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
const LEGEND = new Set(['president', 'nobel', 'chaebol', 'world_star', 'olympic_gold', 'gen10', 'bicentury', 'rich1000', 'chief_justice', 'prosecutor_general', 'billboard', 'rival_fallen']);
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
}
export const PERKS: Perk[] = [
  { id: 'ap', icon: '🖼', name: '가훈 액자', desc: '해마다 행동력 +1', cost: [60, 150, 300] },
  { id: 'luck', icon: '🏮', name: '조상신의 가호', desc: '모든 판정 운 +3%', cost: [40, 90, 180] },
  { id: 'study', icon: '📚', name: '가문 서재', desc: '자녀 성적이 15% 더 잘 오른다', cost: [35, 80, 160] },
  { id: 'fame', icon: '🎐', name: '가문의 기품', desc: '해마다 명성 +1', cost: [30, 70, 140] },
  { id: 'vault', icon: '💰', name: '가문 금고', desc: '해마다 가주에게 300만 원씩 (물가 반영)', cost: [25, 50, 100, 200] },
  { id: 'gene', icon: '🧬', name: '명문가의 혈통', desc: '태어나는 아이 잠재력 +2', cost: [80, 200] },
];
export const perkLv = (s: GameState, id: string) => s.perks?.[id] ?? 0;
export function buyPerk(s: GameState, id: string): { ok: boolean; text: string } {
  const pk = PERKS.find((x) => x.id === id);
  if (!pk) return { ok: false, text: '' };
  const lv = perkLv(s, id);
  const cost = pk.cost[lv];
  if (cost === undefined) return { ok: false, text: '이미 최고 단계다' };
  if ((s.glory ?? 0) < cost) return { ok: false, text: `명예가 ${cost - (s.glory ?? 0)}✦ 모자란다` };
  s.glory = (s.glory ?? 0) - cost;
  (s.perks ??= {})[id] = lv + 1;
  s.log.push({ year: s.year, text: `${pk.icon} 명예 상점: ${pk.name} ${lv + 1}단계`, kind: 'achv' });
  return { ok: true, text: `${pk.icon} ${pk.name} ${lv + 1}단계! ${pk.desc}` };
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
