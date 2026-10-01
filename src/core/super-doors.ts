// 슈퍼 히든으로 가는 "다른 문": 지능·매력 기준만이 아니라 그 일과 닿아 있는 직업·재능·성격·지나온 길로도 열린다.
//   base: 그 직업이 될 수 있는 최소 조건 (성별·나이·시대·꼭 있어야 하는 것)
//   edge: 그 세계와 닮은 무언가 (관련 직업·재능·성격·흔적) — 있으면 해마다 3%로 첫 장면이 오고, 단계 판정이 모자라도 55%로 통과
//   edge 가 없어도 아주 드물게(해마다 0.15%) 운명처럼 문이 열린다
import type { GameState, Person, TalentId } from './types';
import { age, hasTrait, markOf } from './people';
import { myVehicles } from './vehicle';

interface Door {
  base: (s: GameState, p: Person) => boolean;
  edge: (s: GameState, p: Person) => boolean;
}
const A = (s: GameState, p: Person) => age(s, p);
const F = (p: Person) => p.sex === 'F';
const M = (p: Person) => p.sex === 'M';
const job = (p: Person, ...ids: string[]) => ids.includes(p.job) || ids.some((id) => p.flags.includes('was:' + id));
const tal = (p: Person, ...ids: TalentId[]) => p.talents.some((t) => ids.includes(t.id));
const tr = (p: Person, ...ids: string[]) => ids.some((id) => hasTrait(p, id));
const hasCar = (s: GameState, p: Person) => s.assets.some((a) => a.kind === 'vehicle' && a.ownerId === p.id) || myVehicles(s).length > 0;

export const DOORS: Record<string, Door> = {
  hj_vtuber: {
    base: (s, p) => F(p) && A(s, p) >= 18 && A(s, p) <= 32 && !!s.gear?.pc,
    edge: (_s, p) => tal(p, 'star', 'pitch', 'artist') || job(p, 'streamer', 'youtuber', 'gamer', 'voice_actor', 'singer', 'illustrator') || tr(p, 'shy'),
  },
  hj_drifter: {
    base: (s, p) => F(p) && A(s, p) >= 19 && A(s, p) <= 40 && hasCar(s, p),
    edge: (_s, p) => tal(p, 'athlete', 'iron', 'navigator') || job(p, 'mechanic', 'delivery_rider', 'taxi', 'trucker', 'athlete') || markOf(p, 'risk') >= 2,
  },
  hj_mafia: {
    base: (s, p) => M(p) && A(s, p) >= 25 && A(s, p) <= 65,
    edge: (_s, p) => (p.actual.str >= 60 && p.actual.mor <= 45) || job(p, 'security_guard', 'bartender', 'hj_fighter', 'hj_gambler', 'hj_smuggler', 'landlord') || tal(p, 'commander') || tr(p, 'ambitious', 'leader') || markOf(p, 'cheat') >= 1,
  },
  hj_godmother: {
    base: (s, p) => F(p) && A(s, p) >= 28 && A(s, p) <= 70,
    edge: (_s, p) => (p.actual.mor <= 45 && p.actual.int >= 55) || job(p, 'bartender', 'hotelier', 'landlord', 'hj_gambler', 'hj_smuggler', 'hj_tarot') || tal(p, 'commander', 'strategist') || tr(p, 'ambitious', 'leader'),
  },
  hj_private_jet: {
    base: (s, p) => F(p) && A(s, p) >= 21 && A(s, p) <= 40 && !p.flags.includes('no_private_jet'),
    edge: (_s, p) => job(p, 'flight_attendant', 'hotelier', 'sommelier', 'pilot', 'secretary', 'tour_guide') || tal(p, 'linguist', 'beauty') || tr(p, 'social'),
  },
  hj_underground_dealer: {
    base: (s, p) => M(p) && A(s, p) >= 20 && A(s, p) <= 65 && !(s.storySeen?.['casino_refused:' + p.id] && s.year - Number(s.storySeen['casino_refused:' + p.id]) < 10),
    edge: (_s, p) => markOf(p, 'risk') >= 2 || markOf(p, 'cheat') >= 1 || tr(p, 'gambler') || job(p, 'bartender', 'hotelier', 'hj_gambler') || tal(p, 'strategist'),
  },
  hj_chess_master: {
    base: (s, p) => F(p) && p.job === 'chess_player' && A(s, p) >= 28,
    edge: (_s, p) => tal(p, 'strategist', 'genius', 'scholar') || tr(p, 'chess_prodigy', 'diligent'),
  },
  hj_art_investigator: {
    base: (s, p) => A(s, p) >= 25 && A(s, p) <= 58,
    edge: (_s, p) => job(p, 'curator', 'police', 'painter', 'journalist', 'researcher', 'appraiser', 'hj_forger', 'hj_thief') || tal(p, 'artist', 'beauty', 'justice'),
  },
  hj_michelin_inspector: {
    base: (s, p) => A(s, p) >= 26 && A(s, p) <= 62,
    edge: (_s, p) => tal(p, 'palate') || job(p, 'chef', 'baker', 'sommelier', 'restaurant', 'nutritionist', 'journalist', 'bartender', 'hotelier'),
  },
  hj_conservator: {
    base: (s, p) => A(s, p) >= 24 && A(s, p) <= 68,
    edge: (_s, p) => job(p, 'librarian', 'curator', 'researcher', 'painter', 'illustrator', 'professor', 'carpenter', 'translator') || tal(p, 'artist', 'craft', 'scholar') || tr(p, 'diligent', 'frugal'),
  },
  hj_bodyguard: {
    base: (s, p) => A(s, p) >= 22 && A(s, p) <= 52,
    edge: (_s, p) => job(p, 'police', 'officer', 'nco', 'security_guard', 'athlete', 'firefighter', 'coast_guard', 'sports_instructor') || tal(p, 'iron', 'athlete', 'justice') || tr(p, 'tough'),
  },
  hj_detective: {
    base: (s, p) => A(s, p) >= 25 && A(s, p) <= 66,
    edge: (_s, p) => job(p, 'police', 'journalist', 'lawyer', 'prosecutor', 'security', 'court_officer', 'insurance', 'hj_bounty') || tal(p, 'justice', 'scholar', 'linguist') || tr(p, 'anxious', 'shy'),
  },
  hj_perfumer: {
    base: (s, p) => A(s, p) >= 22 && A(s, p) <= 62,
    edge: (_s, p) => tal(p, 'palate', 'beauty', 'artist', 'greenthumb') || job(p, 'perfumer', 'florist', 'sommelier', 'makeup_artist', 'bio_researcher', 'barista', 'chef'),
  },
  hj_stargazer: {
    base: (s, p) => A(s, p) >= 22 && A(s, p) <= 70,
    edge: (_s, p) => job(p, 'hj_tarot', 'hj_shaman', 'clergy', 'psychologist', 'writer', 'novelist', 'aero_engineer') || tal(p, 'empath', 'navigator') || tr(p, 'anxious') || p.flags.includes('mom_devout'),
  },
  hj_pope: {
    base: (s, p) => A(s, p) >= 55 && job(p, 'clergy', 'social_worker', 'teacher') && p.actual.mor >= 65,
    edge: (_s, p) => tal(p, 'empath', 'healer', 'orator', 'linguist') || p.flags.includes('card:who_hero') || p.actual.mor >= 78,
  },
  hj_space_analyst: {
    base: (s, p) => s.year >= 2010 && A(s, p) >= 24 && A(s, p) <= 62,
    edge: (_s, p) => job(p, 'aero_engineer', 'air_controller', 'drone_control', 'space_tech', 'data_scientist', 'pilot', 'navigator', 'researcher', 'star_navigator') || tal(p, 'navigator', 'scholar', 'genius'),
  },
};

/** 다른 문으로 첫 장면이 오는가 (해마다 한 번 굴린다) */
export function doorOpens(s: GameState, p: Person, id: string, roll: (pct: number) => boolean): boolean {
  const d = DOORS[id];
  if (!d || !d.base(s, p)) return false;
  return d.edge(s, p) ? roll(0.03) : roll(0.0015);
}

/** 단계 판정: 능력치가 모자라도 닮은 무언가가 있으면 55%, 없어도 10%는 운으로 통과 */
export function stepPasses(s: GameState, p: Person, id: string, statOk: boolean, roll: (pct: number) => boolean): boolean {
  if (statOk) return true;
  const d = DOORS[id];
  return d && d.base(s, p) && d.edge(s, p) ? roll(0.55) : roll(0.1);
}
