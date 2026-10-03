// 명예의 전당 카드: 가문 사람이 각 분야의 정점에 서면 카드가 생긴다.
// 카드마다 그 사람이 살아 있는 동안 가문 전체에 효과를 준다. 도감을 채우면 세트 보상.

import { tryPromote } from './rank';
import { chance, int, pick } from './rng';
import { gate, schedule, type Choice, type Ctx, type EventDef } from './ev-util';
import { age, alive, check, checkOdds, clamp, fullName, hasFlag, isMainline, parentsOf } from './people';
import { JOBS } from './data';
import { wageIndex } from './pay';
import { formatMoney } from './economy';
import { awardHonor, diffMod, grant, type Rarity } from './rewards';
import { MORE_CARDS, MORE_SUMMITS } from './cards-more';
import { homeCity } from './stories-politics';
import { setCardNamer } from './timeline';
import { CARD_FROM, cardNameAt, ERA_CARDS } from './cards-era';
import type { GameState, Person, StatKey } from './types';

export interface CardEff {
  /** 해마다 가문 명성 */
  fame?: number;
  /** 해마다 카드 주인 수입 (만원, 물가 반영) */
  cash?: number;
  /** 해마다 집안 아이들(20세 미만) 능력치 +1 */
  kid?: StatKey;
  /** 해마다 온 가족 건강·행복 */
  hp?: number;
  hap?: number;
  /** 해마다 아이들 성적 */
  study?: number;
  /** 해마다 세무 주목도 감소 */
  heat?: number;
  /** (상시) 가문에 희귀(히든) 직업의 문이 열릴 확률 +% */
  rare?: number;
  /** (상시) 슈퍼 희귀 직업의 문이 열릴 확률 +% */
  sup?: number;
  /** (상시) 가족 승진 확률 +% */
  promo?: number;
  /** 해마다 가족 사이(가주와의 관계도·부부 애정) +n */
  bond?: number;
}
export interface CardDef {
  id: string;
  name: string;
  icon: string;
  rarity: Rarity;
  /** 어떻게 얻나 (도감 힌트) */
  how: string;
  /** 효과 설명 */
  eff: CardEff;
  /** 조건을 채우면 저절로 (없으면 정점 이벤트로) */
  auto?: (s: GameState, p: Person) => boolean;
  /** 난이도 ★1~3 (없으면 희귀도로) */
  tier?: number;
  /** 얻으면 함께 받는 훈장 */
  honor?: string;
  /** 히든 직업 카드 (숨은 루트로만) */
  hidden?: boolean;
}
export const tierOf = (d: CardDef) => d.tier ?? { common: 1, rare: 1, epic: 2, legend: 3 }[d.rarity];

const lv = (p: Person, job: string, n: number) => p.job === job && p.jobLevel >= n;
export const CARDS: CardDef[] = [
  // 권력
  { id: 'president', name: '대통령', icon: '🇰🇷', rarity: 'legend', how: '대선 승리', eff: { fame: 4, hap: 2 }, auto: (_s, p) => hasFlag(p, 'president') },
  { id: 'minister', name: '장관', icon: '🏛', rarity: 'epic', how: '인사청문회 통과', eff: { fame: 2 }, auto: (_s, p) => hasFlag(p, 'was_minister') },
  { id: 'lawmaker', name: '국회의원', icon: '🗳', rarity: 'epic', how: '총선 당선', eff: { fame: 1, heat: 2 }, auto: (_s, p) => hasFlag(p, 'was_politician') },
  { id: 'chief_justice', name: '대법원장', icon: '⚖️', rarity: 'legend', how: '판사로 정점에', eff: { fame: 3, heat: 6 }, auto: (_s, p) => lv(p, 'judge', 5) },
  { id: 'prosecutor_general', name: '검찰총장', icon: '🗂', rarity: 'legend', how: '검사로 정점에', eff: { fame: 3, heat: 6 }, auto: (_s, p) => lv(p, 'prosecutor', 5) },
  { id: 'general', name: '별을 단 장군', icon: '⭐', rarity: 'epic', how: '장교로 장성 진급', eff: { fame: 2, kid: 'str' }, auto: (_s, p) => lv(p, 'officer', 6) },
  { id: 'ambassador', name: '특명전권대사', icon: '🌐', rarity: 'epic', how: '외교관으로 대사 부임', eff: { fame: 2, kid: 'cha' }, auto: (_s, p) => lv(p, 'diplomat', 5) },
  // 돈
  { id: 'chaebol', name: '그룹 총수', icon: '🏢', rarity: 'legend', how: '창업해 대기업 총수로', eff: { cash: 30000, fame: 2 }, auto: (_s, p) => lv(p, 'founder', 5) },
  { id: 'ceo', name: '대기업 사장', icon: '💼', rarity: 'epic', how: '월급쟁이로 사장까지', eff: { cash: 6000 }, auto: (_s, p) => lv(p, 'corp', 7) },
  // 학문·의료
  { id: 'nobel', name: '노벨상 수상자', icon: '🏅', rarity: 'legend', how: '노벨상', eff: { fame: 4, kid: 'int' }, auto: (_s, p) => hasFlag(p, 'nobel') },
  { id: 'scholar', name: '석학 (석좌교수·총장)', icon: '🎓', rarity: 'epic', how: '교수로 석좌·총장까지', eff: { study: 2, fame: 1 }, auto: (_s, p) => lv(p, 'professor', 3) },
  { id: 'famed_doctor', name: '명의', icon: '🩺', rarity: 'epic', how: '의사로 이름을 떨친다 (정점 이벤트)', eff: { hp: 2 } },
  // 연예·문화
  { id: 'national_mc', name: '국민 MC', icon: '🎤', rarity: 'legend', how: '방송인으로 연예대상 대상 (정점 이벤트)', eff: { fame: 3, kid: 'cha', hap: 1 } },
  { id: 'world_star', name: '월드 스타', icon: '🌟', rarity: 'legend', how: '연예인으로 정점에', eff: { fame: 5, cash: 20000 }, auto: (_s, p) => lv(p, 'entertainer', 5) },
  { id: 'best_actor', name: '청룡영화상 주연상', icon: '🎬', rarity: 'epic', how: '배우로 영화제 주연상 (정점 이벤트)', eff: { cash: 5000, fame: 2 } },
  { id: 'national_singer', name: '국민 가수', icon: '🎶', rarity: 'epic', how: '가수로 가요대상 대상 (정점 이벤트)', eff: { hap: 3, cash: 3000 } },
  { id: 'billboard', name: '빌보드 1위', icon: '📀', rarity: 'legend', how: '음악가로 정점에', eff: { hap: 3, cash: 10000, fame: 3 }, auto: (_s, p) => lv(p, 'musician', 5) },
  { id: 'anchor', name: '9시 뉴스 앵커', icon: '📺', rarity: 'epic', how: '아나운서·기자로 메인 앵커 (정점 이벤트)', eff: { fame: 2, kid: 'cha' } },
  { id: 'bestseller', name: '밀리언셀러 작가', icon: '📚', rarity: 'epic', how: '작가로 100만 부 (정점 이벤트)', eff: { kid: 'int', cash: 3000 } },
  { id: 'webtoon_ip', name: '글로벌 IP 작가', icon: '✏️', rarity: 'epic', how: '웹툰·웹소설 작가로 드라마화 이상 (작품이 IP가 된다)', eff: { cash: 8000, fame: 1 }, auto: (_s, p) => lv(p, 'writer', 4) },
  { id: 'gold_button', name: '골드버튼 크리에이터', icon: '▶️', rarity: 'rare', how: '유튜버로 구독자 100만', eff: { fame: 1, cash: 2000 }, auto: (_s, p) => lv(p, 'youtuber', 4) },
  { id: 'star_tutor', name: '1타 강사', icon: '👨‍🏫', rarity: 'epic', how: '학원 강사로 정점에', eff: { study: 3 }, auto: (_s, p) => lv(p, 'tutor', 4) },
  // 스포츠
  { id: 'olympic', name: '올림픽 금메달리스트', icon: '🥇', rarity: 'legend', how: '올림픽 금메달', eff: { kid: 'str', fame: 2 }, auto: (_s, p) => hasFlag(p, 'olympic_gold') },
  { id: 'national_coach', name: '국가대표 감독', icon: '📋', rarity: 'epic', how: '지도자로 국가대표 감독 (정점 이벤트)', eff: { kid: 'str', fame: 2 } },
  { id: 'gamer_champ', name: 'e스포츠 월드 챔피언', icon: '🎮', rarity: 'epic', how: '프로게이머로 정점에', eff: { kid: 'int', fame: 1 }, auto: (_s, p) => lv(p, 'gamer', 5) },
  // 장인
  { id: 'michelin', name: '미쉐린 스타 셰프', icon: '👨‍🍳', rarity: 'epic', how: '셰프로 미쉐린 별', eff: { hap: 2, hp: 1 }, auto: (_s, p) => lv(p, 'chef', 5) },
  { id: 'star_chef', name: '스타 셰프', icon: '🍳', rarity: 'rare', how: '대형 이벤트 「요리 서바이벌」 우승', eff: { hap: 2, cash: 1500 }, auto: (_s, p) => hasFlag(p, 'cook_win') },
  { id: 'architect', name: '프리츠커상 건축가', icon: '🏗', rarity: 'legend', how: '건축가로 세계적 상 (정점 이벤트)', eff: { fame: 3 } },
  { id: 'master_craft', name: '대한민국 명장', icon: '🛠', rarity: 'epic', how: '기술자로 명장 선정 (정점 이벤트)', eff: { kid: 'str', cash: 1500 } },
  { id: 'captain', name: '수석 기장', icon: '✈️', rarity: 'rare', how: '조종사로 정점에', eff: { hp: 1, cash: 1000 }, auto: (_s, p) => lv(p, 'pilot', 3) },
  { id: 'star_farmer', name: '신지식 농업인', icon: '🌾', rarity: 'rare', how: '농업인으로 정점 (정점 이벤트)', eff: { hp: 1, cash: 1500 } },
  { id: 'national_hero', name: '의인·명예 소방관', icon: '🚒', rarity: 'epic', how: '대형 이벤트 「불길 속으로」에서 사람을 구한다', eff: { fame: 3, hap: 1 }, auto: (_s, p) => hasFlag(p, 'fire_hero') },
  ...MORE_CARDS,
  ...ERA_CARDS,
];
/** 카드 효과 더하기: 명성·수입 말고도 숨은 길·승진·가족 사이를 돕는 카드들 */
const EXTRA_EFF: Record<string, CardEff> = {
  // 희귀 직업의 문 (그 세계를 아는 사람이 집안에 있다)
  explorer: { rare: 15 }, spymaster: { rare: 15 }, profiler: { rare: 10 }, heritage_master: { rare: 10 }, cardinal: { rare: 8, bond: 1 },
  hj_tarot: { rare: 12 }, hj_shaman: { rare: 12 }, hj_nomad: { rare: 12 }, hj_adventurer: { rare: 12 }, hj_magician: { rare: 10 }, hj_exorcist: { rare: 10 },
  hj_spy: { rare: 10, sup: 5 }, hj_thief: { rare: 10 }, hj_gambler: { rare: 8, sup: 5 }, hj_smuggler: { rare: 8 }, hj_hermit: { rare: 6 },
  // 슈퍼 희귀 직업의 문
  hj_stargazer: { sup: 20 }, hj_pope: { sup: 15, bond: 1 }, hj_mafia: { sup: 15 }, hj_godmother: { sup: 15 }, hj_detective: { sup: 10, rare: 8 },
  hj_art_investigator: { sup: 10 }, hj_conservator: { sup: 8 }, first_contact: { sup: 20 }, star_voyager: { sup: 15 }, great_author: { sup: 10 },
  un_sg: { sup: 10 }, cannes: { sup: 8 }, astronaut: { sup: 8 }, maestro: { sup: 8, rare: 5 },
  // 승진 (집안에 길을 먼저 간 사람)
  chaebol: { promo: 15 }, ceo: { promo: 10 }, chief_of_staff: { promo: 10 }, bok_governor: { promo: 10 }, scholar: { promo: 10 }, minister: { promo: 8 },
  national_coach: { promo: 8 }, sales_king: { promo: 8 }, engineer_award: { promo: 6 }, best_teacher: { promo: 5 }, model_civil: { promo: 5 }, pro_license: { promo: 6 },
  founder_myth: { promo: 10 }, venture_myth: { promo: 6 }, export_tower: { promo: 6 },
  // 가족 사이
  proud_parent: { bond: 1 }, filial: { bond: 1 }, centenarian: { bond: 1 }, good_heart: { bond: 1 }, national_mc: { bond: 1 }, hj_natural: { bond: 1 }, philanthropist: { bond: 1 },
};
for (const c of CARDS) if (EXTRA_EFF[c.id]) c.eff = { ...c.eff, ...EXTRA_EFF[c.id] };

export const CARD = Object.fromEntries(CARDS.map((c) => [c.id, c])) as Record<string, CardDef>;

/** 살아 있는 카드 주인(과 시너지)이 주는 상시 효과의 합 (rare·sup·promo) */
export function cardPassive(s: GameState, key: 'rare' | 'sup' | 'promo'): number {
  let n = 0;
  for (const c of s.cards ?? []) {
    const h = s.people[c.personId];
    if (h && alive(h)) n += CARD[c.id]?.eff[key] ?? 0;
  }
  for (const sy of activeSynergies(s)) n += sy.eff[key] ?? 0;
  return Math.min(n, key === 'promo' ? 40 : 100); // 너무 쌓이지 않게
}
setCardNamer((id) => CARD[id]?.name ?? id);
/** 그 카드를 받은 해의 이름 (1980년대의 "은막의 스타") */
export const cardTitle = (id: string, year: number) => cardNameAt(CARD[id]?.name ?? id, id, year);

export function effText(e: CardEff): string {
  const S: Record<StatKey, string> = { str: '근력', int: '지능', cha: '매력', mor: '도덕성', hp: '건강' };
  const sg = (n: number) => (n > 0 ? '+' + n : '−' + -n);
  return [
    e.fame && `해마다 명성 ${sg(e.fame)}`,
    e.cash && `해마다 ${e.cash >= 10000 ? e.cash / 10000 + '억' : e.cash + '만'} 원 수입`,
    e.kid && `아이들 ${S[e.kid]} +1/년`,
    e.study && `아이들 성적 ${sg(e.study)}/년`,
    e.hp && `온 가족 건강 ${sg(e.hp)}/년`,
    e.hap && `온 가족 행복 ${sg(e.hap)}/년`,
    e.heat && (e.heat > 0 ? `세무조사 위험 −${e.heat}/년` : `세무조사 위험 +${-e.heat}/년`),
    e.rare && `희귀 직업 확률 +${e.rare}%`,
    e.sup && `슈퍼 희귀 직업 확률 +${e.sup}%`,
    e.promo && `가족 승진 확률 +${e.promo}%`,
    e.bond && `가족 사이 +${e.bond}/년`,
  ]
    .filter(Boolean)
    .join(' · ');
}

export const hasCard = (s: GameState, p: Person, id: string) => (s.cards ?? []).some((c) => c.id === id && c.personId === p.id);

export function awardCard(s: GameState, p: Person, id: string, why?: string) {
  const d = CARD[id];
  if (!d || hasCard(s, p, id)) return;
  const first = !(s.cards ?? []).some((c) => c.id === id);
  (s.cards ??= []).push({ id, personId: p.id, year: s.year, sex: p.sex });
  if (d.hidden) {
    (s.hiddenCardSex ??= {})[id] = p.sex;
  }
  if (d.honor) awardHonor(s, p, d.honor, d.name);
  grant(s, d.icon, `${first ? '🆕 ' : ''}카드 획득: ${cardNameAt(d.name, id, s.year)}`, `${fullName(p)}${why ? ' — ' + why : ''}\n효과 (살아 있는 동안): ${effText(d.eff)}`, d.rarity);
  const r = s.rewards?.[s.rewards.length - 1];
  if (r) (r.card = id), (r.personId = p.id);
  // 도감 세트 보상
  const kinds = new Set(s.cards.map((c) => c.id)).size;
  for (const [n, rar] of [[3, 'rare'], [6, 'epic'], [10, 'epic'], [16, 'legend'], [24, 'legend']] as [number, Rarity][]) {
    if (kinds >= n && (s.storySeen ??= {})['cardset:' + n] === undefined) {
      s.storySeen['cardset:' + n] = s.year;
      s.fame += n;
      grant(s, '🗃', `카드 도감 ${n}종 달성`, `명예의 전당 카드를 ${n}종 모았다! 명성 +${n}`, rar);
    }
  }
}


// ───────────────────────── 가문 시너지 ─────────────────────────
// 서로 다른 분야의 정점이 한 시대에 같이 살아 있으면, 가문에 특별한 힘이 붙는다.
export interface Synergy {
  id: string;
  name: string;
  icon: string;
  desc: string;
  /** 각 묶음에서 하나씩, 살아 있는 가족이 카드를 갖고 있어야 한다 */
  groups: string[][];
  eff: CardEff;
}
export const SYNERGIES: Synergy[] = [
  { id: 'military_industrial', name: '군수 재벌', icon: '⚙️', desc: '장군 + 재계 거물', groups: [['general', 'chief_of_staff'], ['chaebol', 'ceo', 'bigtech']], eff: { cash: 10000, fame: 2 } },
  { id: 'academic', name: '학술 명문가', icon: '📖', desc: '석학 + 명의', groups: [['scholar', 'nobel', 'turing', 'new_drug'], ['famed_doctor', 'who_hero', 'msf']], eff: { study: 2, kid: 'int' } },
  { id: 'law_dynasty', name: '법조 명가', icon: '⚖️', desc: '사법부 수장 + 정치인', groups: [['chief_justice', 'constitutional', 'prosecutor_general'], ['lawmaker', 'minister', 'president', 'mayor']], eff: { heat: 5, fame: 2 } },
  { id: 'hallyu', name: '한류 제국', icon: '🌏', desc: '스타 + 엔터·미디어 의장', groups: [['world_star', 'national_singer', 'billboard', 'best_actor', 'cannes', 'national_mc'], ['ent_chair', 'media_mogul']], eff: { cash: 15000, fame: 3 } },
  { id: 'tech_empire', name: '테크 제국', icon: '🧠', desc: '빅테크 + 과학 천재', groups: [['bigtech', 'space_founder'], ['turing', 'cyber_commander', 'astronaut']], eff: { cash: 20000, kid: 'int' } },
  { id: 'power_peak', name: '권력의 정점', icon: '👑', desc: '최고 지도자 + 권력 핵심', groups: [['president', 'mayor', 'un_sg'], ['minister', 'lawmaker', 'bok_governor', 'chief_of_staff']], eff: { fame: 5 } },
  { id: 'medical_house', name: '의료 명가', icon: '🏥', desc: '명의 + 신약·구호·석학', groups: [['famed_doctor', 'who_hero'], ['new_drug', 'msf', 'scholar']], eff: { hp: 2 } },
  { id: 'press_power', name: '언론 권력', icon: '📰', desc: '언론 + 정치', groups: [['anchor', 'pulitzer', 'media_mogul'], ['lawmaker', 'mayor', 'president']], eff: { fame: 3 } },
  { id: 'sports_house', name: '스포츠 명가', icon: '🏟', desc: '챔피언 + 지도자·구단주', groups: [['olympic', 'gamer_champ'], ['national_coach', 'esports_owner', 'explorer']], eff: { kid: 'str', fame: 2 } },
  { id: 'finance_empire', name: '금융 제국', icon: '💹', desc: '금융 수장 + 재계', groups: [['bok_governor', 'hedge_fund'], ['chaebol', 'ceo', 'bigtech']], eff: { cash: 20000 } },
  { id: 'culture_house', name: '문화 명가', icon: '🎭', desc: '글 + 무대·스크린', groups: [['bestseller', 'webtoon_ip', 'great_author'], ['best_actor', 'cannes', 'maestro', 'grammy']], eff: { fame: 3, hap: 2 } },
  { id: 'guardians', name: '호국 가문', icon: '🛡', desc: '군·정보 + 치안·소방', groups: [['general', 'chief_of_staff', 'spymaster'], ['police_chief', 'fire_chief', 'national_hero', 'profiler']], eff: { fame: 3, kid: 'str' } },
  { id: 'saints', name: '성인의 가문', icon: '🕊', desc: '종교·양심 + 나눔·구호', groups: [['cardinal', 'conscience'], ['msf', 'philanthropist', 'eco_hero']], eff: { hap: 3, kid: 'mor' } },
  // ── 히든 직업 시너지 (히든·슈퍼 히든 카드끼리, 혹은 일반 카드와) ──
  { id: 'hid_spirit', name: '신령의 집', icon: '🔔', desc: '무당·퇴마사 + 타로·교주', groups: [['hj_shaman', 'hj_exorcist'], ['hj_tarot', 'hj_cult']], eff: { hap: 4, fame: 2 } },
  { id: 'hid_shadow', name: '그림자 가문', icon: '🕶', desc: '스파이 + 암살자·해커', groups: [['hj_spy'], ['hj_assassin', 'hj_hacker']], eff: { fame: 4, heat: 6 } },
  { id: 'hid_sea', name: '일곱 바다', icon: '🏴‍☠️', desc: '해적 + 밀매상·모험가', groups: [['hj_pirate'], ['hj_smuggler', 'hj_adventurer']], eff: { cash: 12000, kid: 'str' } },
  { id: 'hid_art', name: '위작의 전설', icon: '🖼', desc: '명화 위조범·괴도 + 거장(문화 카드)', groups: [['hj_forger', 'hj_thief'], ['great_author', 'maestro', 'best_actor', 'bestseller']], eff: { cash: 15000, fame: 2 } },
  { id: 'hid_ring', name: '투혼의 피', icon: '🥊', desc: '지하 격투왕·용병 + 스포츠 챔피언', groups: [['hj_fighter', 'hj_mercenary', 'hj_bounty'], ['olympic', 'national_coach']], eff: { hp: 3, kid: 'str' } },
  { id: 'hid_money', name: '벼락부자 가문', icon: '🐕', desc: '밈코인·트레이더 + 타짜', groups: [['hj_memecoin', 'hj_trader'], ['hj_gambler']], eff: { cash: 30000 } },
  { id: 'hid_stage', name: '무대의 마법', icon: '🌀', desc: '마술사 + 버튜버 여제', groups: [['hj_magician'], ['hj_vtuber']], eff: { fame: 5, hap: 3 } },
  { id: 'hid_nightbloom', name: '영원의 밤', icon: '🩸', desc: '핏빛 후작부인 + 퇴마사', groups: [['hj_vampire'], ['hj_exorcist']], eff: { hp: 6, fame: 5, hap: 4 } },
  { id: 'hid_steel', name: '질주의 혈통', icon: '🏁', desc: '드리프트 퀸 + 스포츠 챔피언', groups: [['hj_drifter'], ['olympic', 'gamer_champ']], eff: { hp: 5, kid: 'str', fame: 3 } },
  { id: 'hid_free', name: '떠도는 자들', icon: '🎒', desc: '방랑자·자연인 + 은둔자·모험가', groups: [['hj_nomad', 'hj_natural'], ['hj_hermit', 'hj_adventurer']], eff: { hap: 6 } },
  { id: 'hid_legacy', name: '비밀의 명문', icon: '🌑', desc: '슈퍼 히든 + 명예의 전당 최고봉', groups: [['hj_vtuber', 'hj_drifter', 'hj_mafia', 'hj_godmother', 'hj_vampire', 'hj_private_jet', 'hj_underground_dealer'], ['president', 'chaebol', 'nobel', 'world_star', 'chief_justice']], eff: { fame: 6, cash: 20000 } },
  { id: 'hid_night_empire', name: '밤의 제국', icon: '🌃', desc: '밤의 대부·대모 + 밀매상·타짜·위조범', groups: [['hj_mafia', 'hj_godmother'], ['hj_smuggler', 'hj_gambler', 'hj_forger']], eff: { cash: 25000, heat: 6, fame: 2 } },
  { id: 'hid_sky_vip', name: '하늘의 의전', icon: '✈️', desc: '프라이빗 제트 + 재계 거물·대통령', groups: [['hj_private_jet'], ['president', 'chaebol', 'ceo', 'un_sg']], eff: { fame: 5, cash: 25000 } },
  { id: 'hid_underground_rule', name: '약속의 제국', icon: '🂡', desc: '비밀 카지노의 딜러 + 밤의 대부·타짜', groups: [['hj_underground_dealer'], ['hj_mafia', 'hj_gambler']], eff: { cash: 35000, heat: -4 } },
];
/** 지금 발동 중인 시너지 */
/** 가문 시너지: 조건 묶음마다 서로 다른 가족이 채워야 한다 (한 사람이 카드를 다 모아도 "가문"은 아니다) */
export function activeSynergies(s: GameState): Synergy[] {
  const live = (s.cards ?? []).filter((c) => s.people[c.personId] && alive(s.people[c.personId]));
  const holders = (g: string[]) => [...new Set(live.filter((c) => g.includes(c.id)).map((c) => c.personId))];
  const fits = (groups: string[][], used: Set<string>): boolean => {
    if (!groups.length) return true;
    for (const pid of holders(groups[0])) {
      if (used.has(pid)) continue;
      used.add(pid);
      if (fits(groups.slice(1), used)) return true;
      used.delete(pid);
    }
    return false;
  };
  return SYNERGIES.filter((sy) => fits(sy.groups, new Set()));
}

// ───────────────────────── 정점 이벤트 ─────────────────────────
// 조건에 맞는 사람에게 가끔 "정점의 순간"이 찾아온다. 잘 해내면 카드.

export interface Summit {
  card: string;
  title: string;
  ok: (s: GameState, p: Person) => boolean;
  /** 2단계 도전: 1차 관문을 넘으면 1~2년 뒤 최종 관문 */
  stages?: number;
  /** 테스트용: 이 조건을 갖춘 사람을 만든다 (pre: 먼저 있어야 하는 카드) */
  setup?: (s: GameState, p: Person) => void;
  pre?: string;
  text: (c: Ctx) => string;
  a: [string, StatKey, number, string, string];
  b: [string, StatKey, number, string, string];
}
export const SUMMITS: Summit[] = [
  { card: 'national_mc', title: '🎤 연말 연예대상', ok: (_s, p) => ['entertainer', 'announcer', 'youtuber', 'actor', 'voice_actor'].includes(p.job) && p.jobLevel >= 2 && p.actual.cha >= 55,
    text: (c) => `${fullName(c.p)}이(가) 올해 예능 3개를 동시에 진행했다. 연말 연예대상 대상 후보에 올랐다. 생방송 수상 소감이 남았다.`,
    a: ['재치 있는 소감으로 웃긴다', 'cha', 65, '🏆 대상! "국민 MC" 칭호가 붙었다. 다음 날 모든 포털 메인.', '최우수상에 그쳤다. 그래도 내년이 있다.'],
    b: ['동료와 제작진에게 공을 돌린다', 'mor', 55, '🏆 대상! 겸손한 소감이 두고두고 회자된다. 국민 MC 탄생.', '대상은 다른 사람에게. 박수는 가장 컸다.'] },
  { card: 'best_actor', title: '🎬 청룡영화상', ok: (_s, p) => ['actor', 'entertainer'].includes(p.job) && p.jobLevel >= 2,
    text: (c) => `${fullName(c.p)}의 주연작이 관객 600만을 넘겼다. 청룡영화상 주연상 후보다.`,
    a: ['예술영화로 승부했던 연기를 믿는다', 'cha', 68, '🏆 주연상! 트로피를 든 손이 떨렸다.', '수상은 불발. 그래도 인생작이 남았다.'],
    b: ['시상식 전 캠페인 인터뷰를 돈다', 'int', 55, '🏆 주연상! 평단과 대중 모두를 잡았다.', '과한 홍보가 역효과였다.'] },
  { card: 'national_singer', title: '🎶 가요대상', ok: (_s, p) => p.job === 'musician' && p.jobLevel >= 2,
    text: (c) => `${fullName(c.p)}의 노래가 12주 연속 음원 차트 1위를 했다. 연말 가요대상 대상 후보다.`,
    a: ['라이브 무대로 정면 승부', 'cha', 66, '🏆 대상! 떼창이 시상식장을 울렸다. 국민 가수 탄생.', '본상만 받았다. 그래도 노래는 남았다.'],
    b: ['가족에게 바치는 신곡을 부른다', 'mor', 55, '🏆 대상! 온 국민이 따라 부르는 노래가 됐다.', '감동은 컸지만 대상은 다른 팀에게.'] },
  { card: 'anchor', title: '📺 메인 앵커 발탁', ok: (_s, p) => ['announcer', 'journalist'].includes(p.job) && p.jobLevel >= 1,
    text: (c) => `방송국 보도국장이 ${fullName(c.p)}을(를) 불렀다. "9시 뉴스 메인 앵커 오디션을 보게."`,
    a: ['또렷한 전달력으로 승부', 'cha', 62, '📺 9시 뉴스 메인 앵커 확정! 매일 밤 온 국민이 본다.', '최종에서 밀렸다. 주말 뉴스를 맡게 됐다.'],
    b: ['단독 취재 기사로 실력을 보인다', 'int', 60, '📺 특종 앵커로 발탁! "믿고 보는 뉴스"가 됐다.', '특종이 오보로 판명 났다. 아찔했다.'] },
  { card: 'famed_doctor', title: '🩺 명의의 순간', ok: (_s, p) => p.job === 'doctor' && p.jobLevel >= 2,
    text: (c) => `다른 병원들이 포기한 환자가 ${fullName(c.p)}에게 왔다. 12시간짜리 고난도 수술이다.`,
    a: ['직접 집도한다', 'int', 68, '🩺 수술 성공! 환자가 걸어서 퇴원했다. "TV 명의" 출연 섭외가 왔다.', '최선을 다했지만 합병증이 왔다. 오래 마음에 남는다.'],
    b: ['국내 최고 팀을 꾸려 협진한다', 'cha', 60, '🩺 협진 성공! 새 수술법이 교과서에 실렸다.', '팀이 삐걱였다. 수술은 절반의 성공.'] },
  { card: 'bestseller', title: '📚 밀리언셀러', ok: (_s, p) => ['novelist', 'writer'].includes(p.job) && p.jobLevel >= 2,
    text: (c) => `${fullName(c.p)}의 신작이 입소문을 타고 있다. 출판사가 대형 마케팅을 제안한다.`,
    a: ['북토크 전국 투어', 'cha', 55, '📚 100만 부 돌파! 서점마다 평대 한가운데.', '50만 부에서 멈췄다. 그래도 대단하다.'],
    b: ['홍보 대신 다음 작품을 쓴다', 'int', 65, '📚 조용히 100만 부. 평론가들이 "시대의 문장"이라 불렀다.', '입소문이 식었다.'] },
  { card: 'national_coach', title: '📋 국가대표 감독 제의', ok: (_s, p) => (p.job === 'coach' && p.jobLevel >= 1) || (p.job === 'athlete' && age(_s, p) >= 32),
    text: (c) => `대한체육회에서 ${fullName(c.p)}에게 국가대표 감독을 맡아 달라고 한다. 아시안게임이 1년 남았다.`,
    a: ['지옥 훈련으로 끌어올린다', 'str', 60, '📋 아시안게임 금메달! 선수들이 헹가래를 쳤다.', '동메달. 여론은 싸늘했다.'],
    b: ['선수들과 소통하는 리더십', 'cha', 58, '📋 금메달! "형님 리더십"이 화제가 됐다.', '분위기는 좋았지만 결과가 따르지 않았다.'] },
  { card: 'architect', title: '🏗 세계 건축상', ok: (_s, p) => p.job === 'architect' && p.jobLevel >= 3,
    text: (c) => `${fullName(c.p)}이(가) 설계한 도서관이 해외 건축 잡지 표지에 실렸다. 세계적인 건축상 후보에 올랐다.`,
    a: ['설계 철학을 담은 강연을 한다', 'int', 60, '🏗 한국인 최초 수상! 세계 건축계가 주목한다.', '최종 후보에서 멈췄다.'],
    b: ['지역 공공건축에 집중한다', 'mor', 52, '🏗 수상! "사람을 위한 건축"이라는 평.', '수상은 불발. 그래도 동네 명소가 남았다.'] },
  { card: 'master_craft', title: '🛠 대한민국 명장 심사', ok: (_s, p) => ['welder', 'mechanic', 'electrician', 'carpenter', 'shipbuilder', 'big_factory', 'factory', 'plumber'].includes(p.job) && p.jobLevel >= 2 && p.jobYears >= 10,
    text: (c) => `30년 가까이 한 길을 걸은 ${fullName(c.p)}이(가) 고용노동부 "대한민국 명장" 후보에 올랐다. 실기 심사가 남았다.`,
    a: ['손끝으로 증명한다', 'str', 55, '🛠 대한민국 명장 선정! 국가가 인정한 장인이 됐다.', '아깝게 떨어졌다. 내년에 다시.'],
    b: ['후배 양성 실적을 내세운다', 'mor', 55, '🛠 명장 선정! 제자 50명이 축하하러 왔다.', '서류에서 밀렸다.'] },
  { card: 'star_farmer', title: '🌾 신지식 농업인', ok: (_s, p) => ['farmer', 'smart_farmer', 'rancher', 'fisher'].includes(p.job) && p.jobLevel >= 1,
    text: (c) => `${fullName(c.p)}의 농장이 새 재배법으로 수확량을 두 배로 늘렸다. 농림부가 "신지식 농업인" 후보로 올렸다.`,
    a: ['재배법을 무료로 공개한다', 'mor', 58, '🌾 신지식 농업인 선정! 전국 농민들이 견학을 온다.', '심사에서 떨어졌지만 이웃들이 고마워한다.'],
    b: ['특허를 내고 사업화한다', 'int', 64, '🌾 선정! 기술 이전료까지 들어온다.', '특허 분쟁에 휘말렸다.'] },
  { card: 'gamer_champ', title: '🎮 월드 챔피언십 결승', ok: (_s, p) => p.job === 'gamer' && p.jobLevel >= 2,
    text: (c) => `${fullName(c.p)}의 팀이 월드 챔피언십 결승에 올랐다. 관중 4만 명, 동시 시청자 1억 명. 5전 3선승.`,
    a: ['밤새 상대 빌드를 분석한다', 'int', 58, '🎮 우승! 트로피를 들어 올리는 손이 전 세계에 생중계됐다.', '2:3 역전패. 무대 뒤에서 한참을 울었다.'],
    b: ['팀원들을 다독이며 멘탈을 잡는다', 'cha', 52, '🎮 우승! "원 팀"의 리더로 기억된다.', '팀이 흔들렸다. 준우승.'] },
  ...MORE_SUMMITS,
];
/** 정점 도전 기회는 한 사람에게 몇 번까지: 전설 2번 · 영웅·희귀 3번 (떨어질수록 다음 도전은 쉬워진다) */
export const summitTries = (card: string, s?: GameState) => (({ legend: 2, epic: 3 } as Record<string, number>)[CARD[card]?.rarity ?? ''] ?? 3) + (s?.perma?.includes('summit_grit') ? 1 : 0); // 💠 불굴의 혈통 +1
const STAT_KO: Record<StatKey, string> = { str: '근력', int: '지능', cha: '매력', mor: '도덕성', hp: '건강' };
/** 몇 단계 도전인가: 전설 카드는 무조건 3단계, 영웅 카드는 2단계 이상 */
const stagesOf = (sm: Summit) => Math.max(sm.stages ?? 1, CARD[sm.card]?.rarity === 'legend' ? 3 : CARD[sm.card]?.rarity === 'epic' ? 2 : 1);
const summitDef = (sm: Summit): EventDef => ({
  id: 'summit_' + sm.card,
  title: () => sm.title,
  valid: (c) => alive(c.p),
  text: (c) => {
    const stage = c.ev.data?.stage ?? 1;
    const total = stagesOf(sm);
    const tag = total > 1 ? (stage < total ? `\n\n⚔️ ${stage}차 관문 (${total}단계 도전)` : `\n\n🔥 최종 관문! 여기서 이기면 역사에 남는다.`) : '';
    return `${sm.text(c)}${tag}\n\n🃏 성공하면 「${CARD[sm.card].name}」 카드 (${'★'.repeat(tierOf(CARD[sm.card]))}) · ${effText(CARD[sm.card].eff)}`;
  },
  choices: (c) => {
    const stage = c.ev.data?.stage ?? 1;
    const total = stagesOf(sm);
    const rar = CARD[sm.card]?.rarity;
    const tries = c.s.storySeen?.[`try:${c.p.id}:${sm.card}`] ?? 0;
    const legendHard = rar === 'legend' ? 8 : rar === 'epic' ? 3 : 0;
    const ease = rar === 'legend' ? Math.min(6, tries * 2) : Math.min(15, tries * 5);
    return gate(
      c.s,
      [sm.a, sm.b].map(([label, st, need0, win, lose]): Choice => {
        const need = need0 - 6 + (stage - 1) * 3 + legendHard + diffMod(c.s).challenge - ease;
        return {
          label,
          req: [`${STAT_KO[st]} 판정`],
          odds: checkOdds(c.p.actual[st], need, 10),
          run: (x) => {
            if (check(x.s, x.p.actual[st], need, 10)) {
              if (stage < total) {
                schedule(x.s, int(x.s, 1, 2), 'summit_' + sm.card, x.p.id, { stage: stage + 1 });
                x.p.happiness = clamp(x.p.happiness + 6, 0, 100);
                return `✅ ${stage}차 관문 통과! 1~2년 뒤 ${stage + 1 < total ? `${stage + 1}차 관문` : '최종 관문'}이 기다린다.`;
              }
              awardCard(x.s, x.p, sm.card, sm.title.replace(/^\S+ /, ''));
              if (sm.card === 'mayor') {
                // 국회의원직을 내려놓고 시장으로 (사는 도시)
                x.p.flags = x.p.flags.filter((f) => !f.startsWith('mayor_of:'));
                x.p.flags.push('mayor_of:' + homeCity(x.s, x.p), 'was_politician');
                x.p.job = 'mayor';
                x.p.jobLevel = 0;
                x.p.jobYears = 0;
              }
              x.p.happiness = clamp(x.p.happiness + 15, 0, 100);
              return win;
            }
            if (sm.card === 'national_hero' && label.startsWith('직접')) x.p.actual.hp = clamp(x.p.actual.hp - 15, 0, 100);
            (x.s.storySeen ??= {})[`try:${x.p.id}:${sm.card}`] = tries + 1;
            x.s.fame += 1;
            return tries + 1 >= summitTries(sm.card, x.s) ? `${lose}\n(이 길의 정점 도전 기회는 여기까지였다 · 명성 +1)` : `${lose}\n(도전 경험이 쌓였다: 다음 도전은 조금 더 쉽다 · 남은 기회 ${summitTries(sm.card, x.s) - tries - 1}번 · 명성 +1)`;
          },
        };
      }),
    );
  },
});
export const CARD_EVENTS: EventDef[] = SUMMITS.map(summitDef);

/** 카드 힘으로 넓어지는 능력치 한도: 살아 있는 카드·시너지의 건강 효과 ×2 (최대 +20), 아이 능력치 효과 +6 */
export function cardCapBonus(s: GameState): (p: Person) => Partial<Record<StatKey, number>> {
  const effs: CardEff[] = [];
  for (const c of s.cards ?? []) {
    const holder = s.people[c.personId];
    const e = CARD[c.id]?.eff;
    if (holder && alive(holder) && e) effs.push(e);
  }
  for (const sy of activeSynergies(s)) effs.push(sy.eff);
  const hp = Math.min(20, effs.reduce((t, e) => t + Math.max(0, e.hp ?? 0) * 2, 0));
  const kid: Partial<Record<StatKey, number>> = {};
  for (const e of effs) if (e.kid) kid[e.kid] = 6;
  return (p) => {
    if (!isMainline(s, p)) return {};
    return age(s, p) < 20 ? { ...kid, hp: Math.max(hp, kid.hp ?? 0) } : { hp };
  };
}

/** 해마다: 자동 카드 · 정점 이벤트 · 카드 효과 */
export function cardYear(s: GameState): string[] {
  const seen = (s.storySeen ??= {});
  // 가주의 부모·조부모도 제 직업에서 정점에 오를 수 있다
  const h0 = s.people[s.headId];
  const elders = h0 ? [...parentsOf(s, h0), ...parentsOf(s, h0).flatMap((q) => parentsOf(s, q))] : [];
  const people = Object.values(s.people).filter((p) => alive(p) && !p.inLaw && (isMainline(s, p) || elders.includes(p)));
  // 윗세대도 일하는 동안 조금씩 올라간다 (능력이 좋을수록)
  for (const q of elders) {
    const j = JOBS[q.job];
    if (!alive(q) || !j || q.job === 'none' || q.job === 'pension' || q.jobLevel >= j.maxLevel - 1) continue;
    const best = Math.max(q.actual.int, q.actual.cha, q.actual.str);
    if (q.jobYears >= 4 && chance(s, 0.04 + best / 1200)) tryPromote(s.year, q);
  }
  const open = (id: string) => s.year >= (CARD_FROM[id] ?? 0);
  for (const p of people) for (const d of CARDS) if (open(d.id) && d.auto?.(s, p)) awardCard(s, p, d.id);
  // 히든 직업 보유자: 배우자(inLaw)나 방계 등 가문 내 모든 살아있는 구성원에게 소급/누락 방지 지급
  for (const p of Object.values(s.people)) {
    if (alive(p) && p.job.startsWith('hj_')) awardCard(s, p, p.job);
  }
  // 정점 이벤트: 한 해에 하나
  const cands: [Summit, Person][] = [];
  for (const p of people)
    for (const sm of SUMMITS) if (open(sm.card) && !hasCard(s, p, sm.card) && (seen[`try:${p.id}:${sm.card}`] ?? 0) < summitTries(sm.card, s) && sm.ok(s, p) && (seen[`summit:${p.id}:${sm.card}`] ?? -99) <= s.year - 2) cands.push([sm, p]);
  for (let i = 0; i < 2 && cands.length && chance(s, i === 0 ? 0.65 : 0.3); i++) {
    const [sm, p] = pick(s, cands);
    if (CARD[sm.card]?.rarity === 'legend' && !chance(s, 0.5)) continue; // 전설은 기회 자체가 드물다
    seen[`summit:${p.id}:${sm.card}`] = s.year;
    s.events.push({ uid: s.eventSeq++, defId: 'summit_' + sm.card, personId: p.id });
    cands.splice(cands.findIndex(([x, q]) => x === sm && q === p), 1);
  }
  // 효과: 카드 주인이 살아 있는 동안
  // 건강·아이 능력치는 타고난 한계(potential)를 카드 힘으로 조금 넘을 수 있다 (cardCapBonus) — 안 그러면 이미 한계에 닿은 어른에겐 아무 효과가 없다
  const capB = cardCapBonus(s);
  const kids = Object.values(s.people).filter((p) => alive(p) && isMainline(s, p) && age(s, p) < 20);
  const fam = Object.values(s.people).filter((p) => alive(p) && isMainline(s, p));
  const sum = { fame: 0, cash: 0, hp: 0, hap: 0, kid: 0, study: 0, heat: 0, bond: 0 };
  const apply = (e: CardEff, holder: Person) => {
    if (e.fame) (s.fame += e.fame), (sum.fame += e.fame);
    if (e.cash) {
      const m = Math.round(e.cash * wageIndex(s.year));
      holder.cash += m;
      sum.cash += m;
    }
    if (e.kid) for (const k of kids) {
      const cap = Math.min(100, k.potential[e.kid] + (k.overcap ?? 0) + (capB(k)[e.kid] ?? 0));
      if (k.actual[e.kid] < cap) (k.actual[e.kid] += 1), sum.kid++;
    }
    if (e.study) for (const k of kids) if (age(s, k) >= 8) (k.study = clamp((k.study ?? 40) + e.study, 0, 100)), (sum.study += e.study);
    if (e.hp) {
      for (const q of fam) {
        const cap = e.hp > 0 ? Math.max(q.actual.hp, Math.min(100, q.potential.hp + (q.overcap ?? 0) + (capB(q).hp ?? 0))) : 100;
        q.actual.hp = clamp(q.actual.hp + e.hp, 0, cap);
      }
      sum.hp += e.hp;
    }
    if (e.hap) for (const q of fam) q.happiness = clamp(q.happiness + e.hap, 0, 100);
    if (e.hap) sum.hap += e.hap;
    if (e.heat) (s.taxHeat = Math.max(0, s.taxHeat - e.heat)), (sum.heat += e.heat);
    if (e.bond) {
      for (const q of fam) {
        if (q.id !== s.headId) q.affinity = clamp(q.affinity + e.bond, -100, 100);
        if (q.spouseId && q.bond !== undefined) q.bond = clamp(q.bond + e.bond, 0, 100);
      }
      sum.bond += e.bond;
    }
  };
  let n = 0;
  for (const c of s.cards ?? []) {
    const holder = s.people[c.personId];
    const e = CARD[c.id]?.eff;
    if (holder && alive(holder) && e) apply(e, holder), n++;
  }
  // 시너지
  const syn = activeSynergies(s);
  for (const sy of syn) {
    apply(sy.eff, s.people[s.headId]);
    if (seen['syn:' + sy.id] === undefined) {
      seen['syn:' + sy.id] = s.year;
      grant(s, sy.icon, `가문 시너지 발동: ${sy.name}`, `${sy.desc} — 두 분야의 정점이 한 시대에 모였다!\n효과 (함께 살아 있는 동안): ${effText(sy.eff)}`, 'legend');
    }
  }
  if (!n && !syn.length) return [];
  const sg = (x: number) => (x > 0 ? '+' + x : '−' + -x);
  const parts = [
    sum.fame && `명성 ${sg(Math.round(sum.fame * 10) / 10)}`,
    sum.cash && `수입 ${formatMoney(sum.cash)}`,
    sum.hp && `건강 ${sg(sum.hp)}`,
    sum.hap && `행복 ${sg(sum.hap)}`,
    sum.kid && `아이들 능력치 +${sum.kid}`,
    sum.study && `아이들 성적 +${sum.study}`,
    sum.bond && `가족 사이 +${sum.bond}`,
    sum.heat && `세무 주목 ${sg(-sum.heat)}`,
  ].filter(Boolean);
  return parts.length ? [`🃏 명예의 전당 카드 ${n}장${syn.length ? ` · 시너지 ${syn.length}` : ''} 효과: ${parts.join(' · ')}`] : [];
}

/** 카드 그림 테마 (render/cardart.ts) */
export const CARD_THEME: Record<string, string> = {
  president: 'power', minister: 'power', lawmaker: 'power', mayor: 'power', model_civil: 'power',
  chief_justice: 'law', prosecutor_general: 'law', constitutional: 'law', police_chief: 'law', profiler: 'law', pro_license: 'law',
  general: 'military', chief_of_staff: 'military', public_servant: 'military',
  ambassador: 'diplo', un_sg: 'diplo', captain: 'diplo',
  chaebol: 'money', ceo: 'money', bok_governor: 'money', hedge_fund: 'money', sales_king: 'money',
  nobel: 'science', scholar: 'science', star_tutor: 'science',
  astronaut: 'space', space_founder: 'space',
  spymaster: 'tech', cyber_commander: 'tech', turing: 'tech', bigtech: 'tech', gamer_champ: 'tech', esports_owner: 'tech', engineer_award: 'tech',
  famed_doctor: 'medical', who_hero: 'medical', new_drug: 'medical', msf: 'medical', angel_care: 'medical',
  national_mc: 'stage', world_star: 'stage', ent_chair: 'stage', rookie_star: 'stage',
  best_actor: 'screen', webtoon_ip: 'screen', gold_button: 'screen', cannes: 'screen', mega_creator: 'screen',
  national_singer: 'music', billboard: 'music', maestro: 'music', grammy: 'music',
  anchor: 'press', bestseller: 'press', media_mogul: 'press', pulitzer: 'press', great_author: 'press',
  olympic: 'sports', national_coach: 'sports',
  michelin: 'service', star_chef: 'service', service_master: 'service', local_legend: 'service',
  architect: 'craft', master_craft: 'craft', heritage_master: 'craft', craft_hands: 'craft',
  national_hero: 'hero', fire_chief: 'hero',
  cardinal: 'faith', conscience: 'faith', good_heart: 'faith',
  star_farmer: 'nature', eco_hero: 'nature', explorer: 'nature', good_driver: 'nature', farm_hero: 'nature',
  philanthropist: 'family', best_teacher: 'family', proud_parent: 'family', centenarian: 'family', filial: 'family',
  ...Object.fromEntries(ERA_CARDS.map((c) => [c.id, c.theme])),
};
export const SYN_THEME: Record<string, string> = {
  military_industrial: 'military', academic: 'science', law_dynasty: 'law', hallyu: 'stage', tech_empire: 'tech', power_peak: 'power', medical_house: 'medical',
  press_power: 'press', sports_house: 'sports', finance_empire: 'money', culture_house: 'screen', guardians: 'hero', saints: 'faith',
};
/** 도감 번호 */
export const cardNo = (id: string) => CARDS.findIndex((c) => c.id === id) + 1;

/** 카드 컬렉션의 분야 (계정 컬렉션 화면에서 종류별로 모아 본다) */
export const CARD_GROUPS: { id: string; icon: string; name: string }[] = [
  { id: 'power', icon: '🏛', name: '권력·법·외교' },
  { id: 'money', icon: '💰', name: '돈·사업' },
  { id: 'mind', icon: '🔬', name: '학문·기술·우주' },
  { id: 'medical', icon: '🩺', name: '의료' },
  { id: 'culture', icon: '🎭', name: '연예·문화·언론' },
  { id: 'sports', icon: '🏅', name: '스포츠' },
  { id: 'craft', icon: '🛠', name: '장인·현장·자연' },
  { id: 'life', icon: '👪', name: '삶·신념' },
  { id: 'era', icon: '🕰', name: '시대' },
  { id: 'hidden', icon: '🌑', name: '히든' },
  { id: 'super', icon: '🌌', name: '슈퍼 히든' },
];
const THEME_GROUP: Record<string, string> = {
  power: 'power', law: 'power', military: 'power', diplo: 'power', hero: 'power',
  money: 'money', science: 'mind', space: 'mind', tech: 'mind', medical: 'medical',
  stage: 'culture', screen: 'culture', music: 'culture', press: 'culture', sports: 'sports',
  service: 'craft', craft: 'craft', nature: 'craft', family: 'life', faith: 'life',
};
const ERA_IDS = new Set(ERA_CARDS.map((c) => c.id));
export function cardGroup(d: CardDef): string {
  if (d.hidden) return d.rarity === 'legend' ? 'super' : 'hidden';
  if (ERA_IDS.has(d.id)) return 'era';
  return THEME_GROUP[CARD_THEME[d.id] ?? ''] ?? 'life';
}
