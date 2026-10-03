// 부모·가족의 원래 직업 → 이어질 수 있는 히든 직업 (개연성: 농부가 갑자기 지하 격투왕이 되지 않게)
import { HIDDEN_BY_ID } from './hidden-data';
import type { GameState, Person } from './types';

/** 부모의 원래 직업 → 이어질 수 있는 희귀 직업 (부모 나이 30~43세, 성별·나이 조건이 맞는 것만) */
export const RARE_FROM: Record<string, string[]> = {
  fisher: ['hj_pirate', 'hj_smuggler'], navigator: ['hj_pirate', 'hj_smuggler'], shipbuilder: ['hj_pirate'], ship_captain: ['hj_pirate', 'hj_smuggler'],
  trucker: ['hj_smuggler', 'hj_nomad'], taxi: ['hj_nomad', 'hj_drifter'], delivery_rider: ['hj_nomad', 'hj_fighter'], courier: ['hj_smuggler', 'hj_nomad'], bus_driver: ['hj_nomad'],
  factory: ['hj_fighter'], big_factory: ['hj_fighter'], welder: ['hj_fighter', 'hj_mercenary'], mechanic: ['hj_drifter', 'hj_smuggler'], crane_operator: ['hj_mercenary'],
  officer: ['hj_mercenary', 'hj_bodyguard'], police: ['hj_bounty', 'hj_bodyguard'], coast_guard: ['hj_bounty', 'hj_pirate'], firefighter: ['hj_bodyguard'],
  security: ['hj_hacker'], developer: ['hj_hacker'], game_dev: ['hj_hacker', 'hj_memecoin'], data_scientist: ['hj_hacker', 'hj_trader'], chip_engineer: ['hj_hacker'], ai_engineer: ['hj_hacker'],
  aero_engineer: ['hj_space_analyst'], pilot: ['hj_space_analyst', 'hj_smuggler'], air_controller: ['hj_space_analyst'],
  trader: ['hj_trader', 'hj_memecoin'], banker: ['hj_trader'], analyst: ['hj_trader'], fund_manager: ['hj_trader', 'hj_memecoin'], insurance: ['hj_gambler'], sales: ['hj_gambler', 'hj_magician'],
  clergy: ['hj_exorcist', 'hj_stargazer'], social_worker: ['hj_tarot', 'hj_stargazer'], psychologist: ['hj_tarot', 'hj_stargazer'],
  entertainer: ['hj_magician'], actor: ['hj_magician'], film_actor: ['hj_magician'], musician: ['hj_magician', 'hj_nomad'], singer: ['hj_magician'], comedian: ['hj_magician'],
  painter: ['hj_forger', 'hj_art_investigator'], designer: ['hj_forger'], illustrator: ['hj_forger'], curator: ['hj_art_investigator', 'hj_conservator'], appraiser: ['hj_art_investigator'],
  photographer: ['hj_adventurer', 'hj_nomad'], journalist: ['hj_spy', 'hj_adventurer'], pd: ['hj_adventurer'], tour_guide: ['hj_nomad', 'hj_adventurer'], flight_attendant: ['hj_nomad'], translator: ['hj_spy'], diplomat: ['hj_spy'],
  chef: ['hj_michelin_inspector'], restaurant: ['hj_michelin_inspector'], sommelier: ['hj_michelin_inspector', 'hj_perfumer'], baker: ['hj_michelin_inspector'],
  pharmacist: ['hj_perfumer'], florist: ['hj_perfumer'], makeup_artist: ['hj_perfumer', 'hj_tarot'], hairdresser: ['hj_tarot'], nail_artist: ['hj_tarot'],
  librarian: ['hj_conservator'], researcher: ['hj_conservator', 'hj_hacker'], professor: ['hj_conservator'],
  farmer: ['hj_natural', 'hj_shaman'], smart_farmer: ['hj_natural'], rancher: ['hj_natural'],
  athlete: ['hj_fighter', 'hj_bodyguard'], trainer: ['hj_fighter', 'hj_bodyguard'], coach: ['hj_fighter'], sports_instructor: ['hj_fighter', 'hj_bodyguard'],
  landlord: ['hj_trader', 'hj_mafia', 'hj_godmother'], founder: ['hj_trader', 'hj_memecoin'], sme_ceo: ['hj_gambler', 'hj_mafia', 'hj_godmother'], franchise_ceo: ['hj_mafia', 'hj_godmother'], developer_re: ['hj_gambler', 'hj_mafia', 'hj_godmother'],
  bartender: ['hj_gambler', 'hj_underground_dealer'], parttime: ['hj_gambler', 'hj_fighter'], none: ['hj_gambler', 'hj_natural'],
};
export function parentRareFrom(p: Person, from: string, origin: GameState['origin'], a: number): string[] {
  const list = RARE_FROM[from] ?? (origin === 'poor' ? ['hj_gambler'] : origin === 'rich' ? ['hj_trader'] : []);
  return list.filter((id) => {
    if (!HIDDEN_BY_ID[id]) return false;
    if (id === 'hj_mafia') return p.sex === 'M';
    if (id === 'hj_fighter') return a <= 40 && p.actual.str >= 58; // 주먹이 센 사람만
    if (id === 'hj_godmother' || id === 'hj_drifter') return p.sex === 'F';
    if (id === 'hj_underground_dealer') return a <= 40;
    if (id === 'hj_stargazer') return a >= 30;
    return true;
  });
}

/** 지금 하는 일이나 예전에 2년 넘게 했던 일(was:)에서 이어지는 히든 직업 */
export function linkedHidden(p: Person, origin: GameState['origin'], a: number): string[] {
  const froms = [p.job, ...p.flags.filter((f) => f.startsWith('was:')).map((f) => f.slice(4))];
  return [...new Set(froms.flatMap((j) => (RARE_FROM[j] ? parentRareFrom(p, j, origin, a) : [])))];
}
