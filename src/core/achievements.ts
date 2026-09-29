import { ACHIEVEMENTS } from './data';
import { personWorth, totalWorth } from './economy';
import { addFlag, alive, hasFlag, head, isMainline, parentsOf } from './people';
import type { GameState, Person } from './types';

export function unlock(s: GameState, id: string) {
  if (!s.achievements.includes(id)) {
    s.achievements.push(id);
    s.log.push({ year: s.year, text: `🏆 업적 달성: ${ACHIEVEMENTS[id].name}`, kind: 'achv' });
  }
}

/** p, p의 부모 중 한 명, 그 부모의 부모 중 한 명이 모두 flag를 가졌는가 */
function threeGenerations(s: GameState, p: Person, flag: string): boolean {
  if (!hasFlag(p, flag)) return false;
  return parentsOf(s, p).some((par) => hasFlag(par, flag) && parentsOf(s, par).some((gp) => hasFlag(gp, flag)));
}

const CAREER_FLAGS: Partial<Record<Person['job'], string>> = {
  doctor: 'was_doctor',
  athlete: 'was_athlete',
  entertainer: 'was_entertainer',
  politician: 'was_politician',
};

export function checkAchievements(s: GameState) {
  const members = Object.values(s.people).filter((p) => alive(p) && isMainline(s, p));
  const total = totalWorth(s, members);
  if (total >= 1_000_000) unlock(s, 'rich100');
  if (total >= 10_000_000) unlock(s, 'rich1000');
  if (s.year - s.startYear >= 100) unlock(s, 'century');

  const h = head(s);
  if (s.assets.some((a) => a.kind === 'apt_seoul' && a.ownerId === h.id)) addFlag(h, 'gangnam_head');
  if (threeGenerations(s, h, 'gangnam_head')) unlock(s, 'gangnam3');

  const blood = Object.values(s.people).filter((p) => !p.inLaw);
  for (const p of blood) {
    const f = CAREER_FLAGS[p.job];
    if (f) addFlag(p, f);
    if (p.job === 'youtuber' && p.jobLevel >= 1) addFlag(p, 'was_youtuber');
    if (threeGenerations(s, p, 'was_doctor')) unlock(s, 'doctor3');
    if (threeGenerations(s, p, 'chosen_idle')) unlock(s, 'idle3');
    if (alive(p) && p.job === 'none' && hasFlag(p, 'chosen_idle') && personWorth(s, p) >= 100000) unlock(s, 'noble_idle');
    if (hasFlag(p, 'masterpiece')) unlock(s, 'masterpiece');
    if (hasFlag(p, 'was_politician')) unlock(s, 'politics');
    if (p.childIds.length >= 5) unlock(s, 'big_family');
  }
  if (['was_entertainer', 'was_athlete', 'was_youtuber'].every((f) => blood.some((p) => hasFlag(p, f)))) unlock(s, 'star_family');
  const living = blood.filter(alive);
  if ((['doctor', 'lawyer', 'professor'] as const).every((j) => living.some((p) => p.job === j))) unlock(s, 'sa_family');

  if (s.assets.some((a) => a.kind === 'coin' && a.value >= 100000)) unlock(s, 'coin_rich');
  const ids = new Set(['family', ...members.map((p) => p.id)]);
  if (s.assets.filter((a) => a.kind === 'art' && !a.fake && ids.has(a.ownerId)).length >= 5) unlock(s, 'collector');
}
