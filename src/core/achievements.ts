import { ACHIEVEMENTS } from './data';
import { personWorth, totalWorth } from './economy';
import { addFlag, alive, hasFlag, head, isMainline, parentsOf } from './people';
import type { GameState, Person } from './types';
import { achvRarity, grant } from './rewards';
import { isHiddenJob, isHoH, isSuperHidden } from './hidden-data';

export function unlock(s: GameState, id: string) {
  if (!s.achievements.includes(id)) {
    s.achievements.push(id);
    const a = ACHIEVEMENTS[id];
    const r = a ? achvRarity(id, a.cat) : undefined;
    if (r) grant(s, '🏆', `업적 달성: ${a.name}`, a.desc, r);
    else s.log.push({ year: s.year, text: `🏴 불명예 기록: ${a?.name ?? id}`, kind: 'achv' });
  }
}

/** p, p의 부모 중 한 명, 그 부모의 부모 중 한 명이 모두 flag를 가졌는가 */
function threeGenerations(s: GameState, p: Person, flag: string): boolean {
  if (!hasFlag(p, flag)) return false;
  return parentsOf(s, p).some((par) => hasFlag(par, flag) && parentsOf(s, par).some((gp) => hasFlag(gp, flag)));
}

const CAREER_FLAGS: Record<string, string> = {
  doctor: 'was_doctor',
  athlete: 'was_athlete',
  entertainer: 'was_entertainer',
  politician: 'was_politician',
  judge: 'was_judge',
  prosecutor: 'was_prosecutor',
  lawyer: 'was_lawyer',
};

/** 직업 최고 단계 업적 */
const TOP_JOB: [string, number, string][] = [
  ['judge', 5, 'chief_justice'],
  ['prosecutor', 5, 'prosecutor_general'],
  ['officer', 6, 'general'],
  ['corp', 7, 'ceo'],
  ['founder', 5, 'chaebol'],
  ['entertainer', 5, 'world_star'],
  ['entertainer', 4, 'ten_million'],
  ['youtuber', 4, 'gold_button'],
  ['musician', 5, 'billboard'],
  ['writer', 5, 'webtoon_ip'],
  ['chef', 5, 'michelin'],
  ['gamer', 5, 'gamer_champ'],
  ['tutor', 4, 'star_tutor'],
];

/** 가진 플래그 → 업적 */
const FLAG_ACHV: [string, string][] = [
  ['audition_win', 'audition_win'],
  ['patent_win', 'patent_win'],
  ['saga_shop', 'saga_shop'],
  ['saga_farm', 'saga_farm'],
  ['saga_world', 'saga_world'],
  ['saga_run', 'saga_run'],
  ['saga_redev', 'saga_redev'],
  ['saga_hidden', 'saga_hidden'],
  ['hid_jackpot', 'hid_jackpot'],
  ['hidden_retired', 'hid_clean'],
  ['masterpiece', 'masterpiece'],
  ['was_politician', 'politics'],
  ['president', 'president'],
  ['was_minister', 'minister'],
  ['nobel', 'nobel'],
  ['olympic_gold', 'olympic_gold'],
  ['ipo', 'ipo'],
  ['twin', 'twins'],
  ['adopted', 'adopted'],
  ['remarried', 'remarriage'],
  ['gray_divorce', 'gray_divorce'],
  ['young_marriage', 'young_marriage'],
  ['late_marriage', 'late_marriage'],
  ['olympiad_gold', 'olympiad'],
  ['long_prep', 'long_prep'],
  ['lotto', 'lotto'],
  ['cancer_survivor', 'cancer_survivor'],
  ['marine', 'marine'],
  ['draft_dodger', 'draft_dodger'],
  ['bankrupt', 'bankrupt'],
  ['pet', 'pet'],
  ['adopted_heir', 'adopted_heir'],
  ['guarantee_victim', 'guarantee_victim'],
  ['angel_jackpot', 'angel_jackpot'],
  ['sub_winner', 'sub_winner'],
  ['married_first_love', 'first_love'],
  ['dui', 'dui'],
  ['emigrated', 'emigrated'],
  ['ponzi_victim', 'ponzi_victim'],
];

export function checkAchievements(s: GameState) {
  const members = Object.values(s.people).filter((p) => alive(p) && isMainline(s, p));
  const total = totalWorth(s, members);
  if (total >= 1_000_000) unlock(s, 'rich100');
  if (total >= 10_000_000) unlock(s, 'rich1000');
  const years = s.year - s.startYear;
  if (years >= 100) unlock(s, 'century');
  if (years >= 200) unlock(s, 'bicentury');
  if (s.generation >= 5) unlock(s, 'gen5');
  if (s.generation >= 10) unlock(s, 'gen10');
  const seen = s.jobsSeen?.length ?? 0;
  if (seen >= 10) unlock(s, 'jobs10');
  if (seen >= 30) unlock(s, 'jobs30');
  if (seen >= 60) unlock(s, 'jobs60');

  const h = head(s);
  if (members.filter((p) => isHiddenJob(p.job)).length >= 2) unlock(s, 'hid_pair');
  if (s.assets.some((a) => a.kind === 'apt_seoul' && a.ownerId === h.id)) addFlag(h, 'gangnam_head');
  if (threeGenerations(s, h, 'gangnam_head')) unlock(s, 'gangnam3');

  const blood = Object.values(s.people).filter((p) => !p.inLaw);
  for (const p of blood) {
    const f = CAREER_FLAGS[p.job];
    if (f) addFlag(p, f);
    if (p.job === 'youtuber' && p.jobLevel >= 1) addFlag(p, 'was_youtuber');
    if (threeGenerations(s, p, 'was_doctor')) unlock(s, 'doctor3');
    if (threeGenerations(s, p, 'chosen_idle')) unlock(s, 'idle3');
    if (threeGenerations(s, p, 'univ_top')) unlock(s, 'top3');
    if (threeGenerations(s, p, 'served')) unlock(s, 'military3');
    if (alive(p) && p.job === 'none' && hasFlag(p, 'chosen_idle') && personWorth(s, p) >= 100000) unlock(s, 'noble_idle');
    if (alive(p) && hasFlag(p, 'bankrupt') && personWorth(s, p) >= 100000) unlock(s, 'comeback');
    for (const [fl, id] of FLAG_ACHV) if (hasFlag(p, fl)) unlock(s, id);
    if (alive(p) && isHiddenJob(p.job)) {
      if (p.jobYears >= 10) unlock(s, 'hid_legend10');
      if (p.jobYears >= 10 && isSuperHidden(p.job)) unlock(s, 'hid_super10');
      if (isHoH(p.job)) unlock(s, 'hid_hoh');
    }
    for (const [job, lv, id] of TOP_JOB) if (p.job === job && p.jobLevel >= lv) unlock(s, id);
    if (Number(p.flags.find((x) => x.startsWith('retake:'))?.slice(7) ?? 0) >= 2 && p.flags.some((x) => x.startsWith('school:'))) unlock(s, 'retake3');
    if (hasFlag(p, 'ivf') && p.childIds.length) unlock(s, 'ivf');
    const ageNow = (p.deathYear ?? s.year) - p.birthYear;
    if (ageNow >= 100) unlock(s, 'centenarian');
    if (ageNow >= 120) unlock(s, 'centenarian_120');
    const kids = p.childIds.map((id) => s.people[id]);
    if (kids.length >= 5) unlock(s, 'big_family');
    if (kids.length >= 3 && kids.every((k) => k.sex === 'M')) unlock(s, 'sons3');
    if (kids.length >= 3 && kids.every((k) => k.sex === 'F')) unlock(s, 'daughters3');
    const wed = Number(p.flags.find((x) => x.startsWith('wed:'))?.slice(4) ?? NaN);
    if (alive(p) && p.spouseId && alive(s.people[p.spouseId]) && s.year - wed >= 50) unlock(s, 'golden_wedding');
  }
  if (['was_entertainer', 'was_athlete', 'was_youtuber'].every((f) => blood.some((p) => hasFlag(p, f)))) unlock(s, 'star_family');
  if (['was_judge', 'was_prosecutor', 'was_lawyer'].every((f) => blood.some((p) => hasFlag(p, f)))) unlock(s, 'law_family');
  const living = blood.filter(alive);
  if ((['doctor', 'lawyer', 'professor'] as const).every((j) => living.some((p) => p.job === j))) unlock(s, 'sa_family');

  // 가주 생전에 증손주
  if (living.some((p) => depthFrom(s, p, h) === 3)) unlock(s, 'great_grandchild');
  // 5대 동시 생존
  if (living.some((p) => {
    let cur: Person | undefined = p;
    for (let i = 0; i < 4; i++) {
      cur = parentsOf(s, cur).find((x) => alive(x) && !x.inLaw) ?? parentsOf(s, cur).find(alive);
      if (!cur) return false;
    }
    return true;
  })) unlock(s, 'five_gen');

  if (s.assets.some((a) => a.kind === 'coin' && a.value >= 100000)) unlock(s, 'coin_rich');
  if (s.assets.some((a) => a.kind === 'building' && members.some((m) => m.id === a.ownerId))) unlock(s, 'landlord');
  const ids = new Set(['family', ...members.map((p) => p.id)]);
  if (s.assets.filter((a) => a.kind === 'art' && !a.fake && ids.has(a.ownerId)).length >= 5) unlock(s, 'collector');
}

/** p가 ancestor의 몇 대 자손인가 (아니면 -1) */
function depthFrom(s: GameState, p: Person, ancestor: Person): number {
  let frontier = [ancestor];
  for (let d = 1; d <= 6; d++) {
    frontier = frontier.flatMap((x) => x.childIds.map((id) => s.people[id]));
    if (frontier.some((x) => x.id === p.id)) return d;
    if (!frontier.length) break;
  }
  return -1;
}
