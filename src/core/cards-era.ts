// 시대의 카드: 그 시대를 산 사람만 얻는 명예 (1960년대 새마을 지도자에서 2080년대 화성 이주 1세대까지).
// 그리고 같은 정점이라도 시대에 따라 이름이 다르다 (1980년대의 "은막의 스타", 2020년대의 "월드 스타").
import type { CardDef } from './cards';
import type { GameState, Person } from './types';
import { age, hasFlag } from './people';

const lv = (p: Person, jobs: string[], n: number) => jobs.includes(p.job) && p.jobLevel >= n;
const during = (s: GameState, a: number, b: number) => s.year >= a && s.year <= b;

export const ERA_CARDS: (CardDef & { theme: string })[] = [
  // ── 근현대사 ──
  { id: 'saemaul', name: '새마을 지도자', icon: '🌾', rarity: 'rare', theme: 'nature', how: '1971~1985년, 농부·공무원·교사로 일하며 성품 55 이상 (30~60세)', eff: { fame: 1, kid: 'mor' }, honor: 'saemaul_medal',
    auto: (s, p) => during(s, 1971, 1985) && lv(p, ['farmer', 'civil', 'teacher', 'rancher', 'fisher'], 1) && p.actual.mor >= 55 && age(s, p) >= 30 && age(s, p) <= 60 },
  { id: 'export_tower', name: '수출의 탑', icon: '🚢', rarity: 'epic', theme: 'money', how: '1964~1996년, 창업가(3단계)나 무역회사원(4단계)으로 수출 역군이 된다', eff: { cash: 3000, fame: 1 }, honor: 'dongtap',
    auto: (s, p) => during(s, 1964, 1996) && (lv(p, ['founder'], 3) || lv(p, ['trader'], 4)) },
  { id: 'founder_myth', name: '1세대 창업 신화', icon: '🏭', rarity: 'legend', theme: 'money', how: '1990년 전에 맨손 창업으로 그룹 총수에 오른다', eff: { cash: 20000, fame: 3 }, honor: 'geumtap',
    auto: (s, p) => s.year < 1990 && lv(p, ['founder'], 5) },
  { id: 'mideast_builder', name: '중동 건설 역군', icon: '🏗', rarity: 'rare', theme: 'craft', how: '1970~80년대 중동 건설 현장에 다녀온다', eff: { cash: 800, kid: 'str' }, auto: (_s, p) => hasFlag(p, 'mideast') },
  { id: 'germany_pioneer', name: '파독 광부·간호사', icon: '⛏', rarity: 'rare', theme: 'hero', how: '1960~70년대 서독 파견 광부·간호사로 다녀온다', eff: { cash: 600, hp: 1 }, auto: (_s, p) => hasFlag(p, 'germany') },
  { id: 'vietnam_vet', name: '월남 참전 용사', icon: '🎗', rarity: 'rare', theme: 'military', how: '1960~70년대 베트남전에 파병된다', eff: { fame: 1, kid: 'str' }, honor: 'chamjeon', auto: (_s, p) => hasFlag(p, 'vietnam') },
  { id: 'democracy', name: '민주화운동 유공자', icon: '✊', rarity: 'epic', theme: 'faith', how: '1980년대 학생 운동으로 끌려갔다가, 1988년 이후 명예를 되찾는다', eff: { fame: 2, kid: 'mor' }, honor: 'minju',
    auto: (s, p) => s.year >= 1988 && hasFlag(p, 'arrested80') },
  { id: 'gold_drive', name: 'IMF 금 모으기', icon: '💍', rarity: 'common', theme: 'family', how: '1998년 금 모으기 운동에 돌반지를 내놓는다', eff: { hap: 1, kid: 'mor' }, auto: (_s, p) => hasFlag(p, 'gold_ring') },
  { id: 'venture_myth', name: '벤처 신화', icon: '💾', rarity: 'epic', theme: 'tech', how: '1997~2002년 벤처 붐 때 창업가로 3단계 이상', eff: { cash: 6000, kid: 'int' }, auto: (s, p) => during(s, 1997, 2002) && lv(p, ['founder', 'developer', 'game_dev'], 3) },
  { id: 'hallyu_first', name: '한류 1세대 스타', icon: '🌏', rarity: 'epic', theme: 'stage', how: '1997~2008년 연예인·음악가로 3단계 이상 (한류의 시작)', eff: { fame: 2, cash: 4000 }, auto: (s, p) => during(s, 1997, 2008) && lv(p, ['entertainer', 'musician', 'actor'], 3) },
  // ── 현대와 미래 ──
  { id: 'ai_pioneer', name: 'AI 개척자', icon: '🤖', rarity: 'epic', theme: 'tech', how: '2027~2045년, AI 조련사 3단계·데이터 과학자 4단계', eff: { kid: 'int', cash: 3000 }, auto: (s, p) => during(s, 2027, 2045) && (lv(p, ['ai_trainer'], 3) || lv(p, ['data_scientist'], 4)) },
  { id: 'robot_master', name: '로봇 명장', icon: '🦾', rarity: 'rare', theme: 'craft', how: '로봇 정비사 최고 단계', eff: { kid: 'str', cash: 1500 }, honor: 'dongtap', auto: (_s, p) => lv(p, ['robot_tech'], 4) },
  { id: 'climate_guardian', name: '기후 수호자', icon: '🌊', rarity: 'epic', theme: 'nature', how: '기후 엔지니어로 수석 이상', eff: { hp: 1, fame: 2 }, honor: 'climate_medal', auto: (_s, p) => lv(p, ['climate_eng'], 3) },
  { id: 'world_builder', name: '가상 세계의 설계자', icon: '🌐', rarity: 'epic', theme: 'screen', how: '가상공간 건축가 최고 단계', eff: { hap: 2, cash: 4000 }, auto: (_s, p) => lv(p, ['vr_architect'], 4) },
  { id: 'neural_pioneer', name: '뉴럴 1세대', icon: '🧬', rarity: 'rare', theme: 'tech', how: '2050년대 뉴럴 인터페이스가 처음 나왔을 때 시술을 받는다', eff: { kid: 'int' }, auto: (_s, p) => hasFlag(p, 'neural') },
  { id: 'longevity_master', name: '장수의학 권위자', icon: '⏳', rarity: 'legend', theme: 'medical', how: '노화 역전 전문의 교수 이상', eff: { hp: 3, fame: 2 }, honor: 'changjo', auto: (_s, p) => lv(p, ['longevity_doc'], 3) },
  { id: 'moon_pioneer', name: '달 기지 개척자', icon: '🌙', rarity: 'epic', theme: 'space', how: '달 기지 상주 인력으로 뽑힌다 (2063년~)', eff: { fame: 2, kid: 'int' }, honor: 'ungbi', auto: (_s, p) => hasFlag(p, 'moon_worker') || lv(p, ['space_tech'], 2) },
  { id: 'memory_artisan', name: '기억의 장인', icon: '🧠', rarity: 'epic', theme: 'medical', how: '기억 설계사 수석 이상 (2080년~)', eff: { hap: 2, hp: 1 }, auto: (_s, p) => lv(p, ['memory_designer'], 3) },
  { id: 'mars_first', name: '화성 이주 1세대', icon: '🔴', rarity: 'legend', theme: 'space', how: '화성 정착촌 "새터"로 떠난다 (2084년~)', eff: { fame: 5, kid: 'str' }, honor: 'cosmos', auto: (_s, p) => hasFlag(p, 'mars_settler') || lv(p, ['mars_pioneer'], 2) },
  { id: 'terraform_hero', name: '붉은 행성을 푸르게', icon: '🌱', rarity: 'legend', theme: 'nature', how: '테라포밍 기술자로 구역 책임자 이상 (2105년~)', eff: { hp: 2, fame: 3 }, honor: 'cosmos', auto: (_s, p) => lv(p, ['terraformer'], 3) },
  { id: 'asteroid_tycoon', name: '소행성 재벌', icon: '☄️', rarity: 'epic', theme: 'money', how: '소행성 채굴권 대박, 또는 소행성 광산 소장 (2112년~)', eff: { cash: 15000 }, auto: (_s, p) => hasFlag(p, 'asteroid_rich') || lv(p, ['asteroid_miner'], 4) },
  { id: 'orbital_father', name: '궤도 도시의 설계자', icon: '🛰', rarity: 'epic', theme: 'craft', how: '궤도 도시 건축가 수석 이상 (2122년~)', eff: { hap: 2, fame: 2 }, auto: (_s, p) => lv(p, ['orbital_architect'], 3) },
  { id: 'star_voyager', name: '별로 떠난 사람', icon: '🌠', rarity: 'legend', theme: 'space', how: '성간 탐사선 "누리별" 승무원, 또는 성간 항법사 수석 (2148년~)', eff: { fame: 6, kid: 'int' }, honor: 'cosmos', auto: (_s, p) => hasFlag(p, 'starship_crew') || lv(p, ['star_navigator'], 3) },
  { id: 'first_contact', name: '인류의 답장', icon: '📡', rarity: 'legend', theme: 'diplo', how: '외계 신호에 보낼 인류의 답장에 뽑히거나, 외계 생물학 연구소장 (2144년~)', eff: { fame: 5, kid: 'cha' }, auto: (_s, p) => hasFlag(p, 'signal_answer') || lv(p, ['xeno_biologist'], 4) },
  { id: 'space_tourist', name: '우주 여행객', icon: '🚀', rarity: 'common', theme: 'space', how: '우주 여행을 다녀온다 (2044년~)', eff: { hap: 1 }, auto: (_s, p) => hasFlag(p, 'space_trip') },
  { id: 'war_hero', name: '전쟁 영웅', icon: '🎖', rarity: 'legend', theme: 'military', how: '전쟁 때 최전방에서 전우를 구한다 (전쟁이 일어나야 얻을 수 있다)', eff: { fame: 4, kid: 'str' }, honor: 'taeguk', auto: (_s, p) => hasFlag(p, 'war_hero') },
  { id: 'field_medic', name: '전장의 의사', icon: '⛑', rarity: 'epic', theme: 'medical', how: '전쟁 때 의사·간호사·기술자로 후방 전문 근무', eff: { hp: 2, fame: 1 }, honor: 'dongbaek', auto: (_s, p) => hasFlag(p, 'war_medic') },
  { id: 'veteran', name: '참전 용사', icon: '🪖', rarity: 'rare', theme: 'military', how: '전쟁에 나가 살아 돌아온다', eff: { kid: 'mor', fame: 1 }, auto: (_s, p) => hasFlag(p, 'war_veteran') },
  { id: 'rebuilder', name: '재건의 주역', icon: '🏗', rarity: 'epic', theme: 'craft', how: '전쟁이 끝난 뒤 재건 사업에 뛰어든다', eff: { cash: 3000, kid: 'str' }, honor: 'rebuild_medal', auto: (_s, p) => hasFlag(p, 'rebuilder') },
  { id: 'digital_ancestor', name: '디지털 조상', icon: '💾', rarity: 'epic', theme: 'family', how: '의식 업로드로 후손 곁에 남는다 (2133년~)', eff: { kid: 'int', hap: 1 }, auto: (_s, p) => hasFlag(p, 'uploaded') },
  { id: 'orbital_citizen', name: '궤도 도시 1세대', icon: '🪐', rarity: 'rare', theme: 'space', how: '궤도 도시로 이주한다 (2122년~)', eff: { hap: 1, kid: 'int' }, auto: (_s, p) => hasFlag(p, 'orbital_home') },
  { id: 'jf_fighter', name: '전세 사기 대책위원장', icon: '📢', rarity: 'rare', theme: 'law', how: '전세 사기를 당하고도 성품 55 이상으로 끝까지 싸운다', eff: { fame: 1, kid: 'mor' }, auto: (_s, p) => hasFlag(p, 'jf_victim') && p.actual.mor >= 55 },
  { id: 'history_witness', name: '역사의 산증인', icon: '📜', rarity: 'epic', theme: 'family', how: '근현대사: 1960년 전에 태어나 2030년을 맞는다 (보릿고개에서 AI까지)', eff: { kid: 'mor', fame: 2 }, auto: (_s, p) => hasFlag(p, 'witness') },
  { id: 'sea_pioneer', name: '해양 도시 개척자', icon: '🐚', rarity: 'rare', theme: 'nature', how: '해상 도시 입주 또는 해양 양식 기업 (2072년~)', eff: { cash: 2000, hp: 1 }, auto: (_s, p) => lv(p, ['sea_farmer'], 3) },
];

/** 시대의 훈장 (rewards.ts HONORS에 더해진다) */
export const ERA_HONORS = {
  saemaul_medal: { name: '새마을훈장 협동장', icon: '🌾', fame: 6, rarity: 'rare' as const, desc: '새마을운동으로 마을을 일으킨 공로 (1973년 제정)' },
  dongtap: { name: '동탑산업훈장', icon: '🏭', fame: 8, rarity: 'rare' as const, desc: '수출과 산업 발전에 기여' },
  chamjeon: { name: '월남전 참전기장', icon: '🎗', fame: 4, rarity: 'rare' as const, desc: '베트남전 참전 용사에게' },
  minju: { name: '민주화운동 관련자 증서', icon: '✊', fame: 8, rarity: 'epic' as const, desc: '민주주의를 위해 희생한 이에게 국가가 명예를 돌려주다' },
  climate_medal: { name: '기후복원훈장 (2040년 신설)', icon: '🌍', fame: 12, rarity: 'epic' as const, desc: '폭염·해수면 상승에서 국민을 지킨 공로' },
  war_service: { name: '종군기장', icon: '🎖', fame: 5, rarity: 'rare' as const, desc: '전쟁에 나가 복무를 마친 이에게' },
  war_merit: { name: '무공훈장 화랑무공훈장', icon: '🎗', fame: 14, rarity: 'epic' as const, desc: '전장에서 다치거나 목숨을 바친 이에게' },
  rebuild_medal: { name: '국민훈장 목련장 (재건 공로)', icon: '🌸', fame: 8, rarity: 'rare' as const, desc: '폐허를 다시 일으킨 공로' },
  cosmos: { name: '우주개척훈장 (2070년 신설)', icon: '🪐', fame: 20, rarity: 'legend' as const, desc: '인류의 새 터전을 연 개척자에게' },
};

/** 이 해가 되어야 생기는 정점 (근현대사 모드에서 1970년에 "AI 혁신"이 오지 않게) */
export const CARD_FROM: Record<string, number> = {
  gold_button: 2008, mega_creator: 2008, webtoon_ip: 2003, gamer_champ: 2000, esports_owner: 2000, bigtech: 1995, space_founder: 2015,
  turing: 1985, cyber_commander: 2010, hedge_fund: 1995, astronaut: 2008, who_hero: 1970, michelin: 1980, grammy: 1990, billboard: 1990,
};

/** 같은 정점, 시대마다 다른 이름: [이 해 전까지, 그 시절 이름] */
const ERA_NAME: Record<string, [number, string][]> = {
  world_star: [[1997, '은막의 스타']],
  billboard: [[1996, '가요톱10 골든컵'], [2012, '아시아 차트 석권']],
  michelin: [[2016, '특급호텔 총주방장']],
  national_singer: [[1990, '10대 가수상 가수왕']],
  star_tutor: [[2001, '족집게 과외 선생']],
  webtoon_ip: [[2010, '대본소 인기 만화가']],
  bigtech: [[2010, '전자 대기업 창업주']],
  gamer_champ: [[2005, '스타크래프트 황제']],
  anchor: [[1980, '라디오 뉴스 아나운서']],
  ceo: [[1990, '그룹 기획조정실장']],
  national_mc: [[1990, '토요일 밤 쇼 MC']],
};
export function cardNameAt(base: string, id: string, year: number): string {
  for (const [until, name] of ERA_NAME[id] ?? []) if (year < until) return name;
  return base;
}
