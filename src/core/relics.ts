// 가문 가보 및 전리품(Relics):
// 대를 이어 전해지는 가문의 영예와 보물.
// 특별한 직업 활동, 위업 달성, 전설적 선택을 통해 획득하며 가문에 영구히 보존된다.
// 가보는 후손에게 고유 스탯/명성/자산 혜택을 주고, 특정 직업이나 히든 루트로 이어지는 운명의 열쇠가 된다.

import { chance } from './rng';
import type { GameState, Person } from './types';
import { age, alive, fullName, head } from './people';
import { grant } from './rewards';

export interface Relic {
  id: string;
  name: string;
  icon: string;
  desc: string;
  obtainYear: number;
  obtainedBy: string;
  obtainedJob: string;
  eff: {
    cash?: number;
    fame?: number;
    int?: number;
    cha?: number;
    str?: number;
    mor?: number;
    hp?: number;
  };
  /** 후손에게 해금해주는 특별 이벤트/루트 식별자 */
  unlockRoute?: string;
}

export interface RelicDef {
  id: string;
  name: string;
  icon: string;
  desc: string;
  eff: Relic['eff'];
  unlockRoute?: string;
}

export const RELIC_DEFS: Record<string, RelicDef> = {
  // ♟️ 체스 그랜드마스터 / 체스 선수
  relic_chess_board: {
    id: 'relic_chess_board',
    name: '다이아몬드 체스판',
    icon: '♟️',
    desc: '세계 챔피언십 우승 기념으로 제작된 가문의 체스판. 대대로 아이들의 지능과 수읽기를 키운다.',
    eff: { int: 3, fame: 2 },
    unlockRoute: 'route:chess_legacy',
  },
  // 👑 대통령
  relic_presidential_medal: {
    id: 'relic_presidential_medal',
    name: '대통령 무궁화 대훈장',
    icon: '🎖️',
    desc: '국정의 정점에 올랐던 가주의 훈장. 국가의 역사에 가문의 이름이 영원히 새겨졌다.',
    eff: { fame: 5, cha: 3 },
    unlockRoute: 'route:political_dynasty',
  },
  // 🏛️ 국회의원 / 장관 / 시장
  relic_law_plaque: {
    id: 'relic_law_plaque',
    name: '국회 본회의 기념 금장패',
    icon: '🏛️',
    desc: '역사적인 민생 법안 통과를 기념하여 헌정된 금장패. 정계에 든든한 가문의 입지를 남긴다.',
    eff: { fame: 3, cha: 2 },
    unlockRoute: 'route:political_dynasty',
  },
  // 🏢 건물주
  relic_building_deed: {
    id: 'relic_building_deed',
    name: '가문 1호 랜드마크 권리증',
    icon: '🏢',
    desc: '도시 중심가에 올린 가문 최초의 랜드마크 빌딩 등기권리증 액자. 대대로 막대한 임대 수익의 토대가 된다.',
    eff: { cash: 3000, fame: 2 },
    unlockRoute: 'route:landlord_heir',
  },
  // 💻 전설의 해커
  relic_cold_wallet: {
    id: 'relic_cold_wallet',
    name: '1만 BTC 콜드월렛',
    icon: '💾',
    desc: '초창기 제네시스 블록 시절 채굴된 비트코인이 담긴 금속제 하드웨어 지갑. 가문의 극비 비자금.',
    eff: { cash: 5000, int: 2 },
    unlockRoute: 'route:deep_hacker',
  },
  // 🧭 모험가 / 자연인
  relic_ancient_compass: {
    id: 'relic_ancient_compass',
    name: '미지의 고대 황금 나침반',
    icon: '🧭',
    desc: '미개척지 심층 유적에서 발굴해낸 나침반. 자석이 아닌 미지의 기운을 가리키며 탐험가를 부른다.',
    eff: { str: 2, hp: 2, fame: 2 },
    unlockRoute: 'route:adventurer_heritage',
  },
  // 🂡 언더그라운드 딜러 / 도박의 왕
  relic_casino_chip: {
    id: 'relic_casino_chip',
    name: '전설의 흑요석 포커 칩',
    icon: '🂡',
    desc: '언더그라운드 하우스에서 거물들의 "평생의 약속"을 담아 발행했던 단 하나의 칩.',
    eff: { cash: 4000, cha: 2 },
    unlockRoute: 'route:dealer_pledge',
  },
  // ✈️ 프라이빗 제트 승무원
  relic_gold_wings: {
    id: 'relic_gold_wings',
    name: '글로벌 로열 VVIP 골드 윙',
    icon: '✈️',
    desc: '전 세계 최상류층 승객들이 만장일치로 수여한 순금 윙 배지. 전 세계 어디서든 최고의 대우를 보장한다.',
    eff: { fame: 3, cha: 3 },
    unlockRoute: 'route:sky_royalty',
  },
  // 👑 밤의 대부 / 대모
  relic_family_ring: {
    id: 'relic_family_ring',
    name: '패밀리의 흑금 인장 반지',
    icon: '💍',
    desc: '뒷세계의 질서를 좌우하는 대부의 인장 반지. 반지를 낀 자에게는 누구도 거역하지 못한다.',
    eff: { fame: 4, cash: 3500 },
    unlockRoute: 'route:underworld_legacy',
  },
  // 🌹 핏빛 후작부인
  relic_vampire_pendant: {
    id: 'relic_vampire_pendant',
    name: '진홍빛 루비 펜던트',
    icon: '🍷',
    desc: '수백 년의 세월이 흘러도 변치 않는 핏빛 광채. 지닌 자에게 신비로운 매혹과 활력을 불어넣는다.',
    eff: { cha: 4, hp: 3 },
    unlockRoute: 'route:blood_heritage',
  },
  // 🎨 화가 / 위조범
  relic_masterpiece: {
    id: 'relic_masterpiece',
    name: '가문 시조의 불멸의 명작',
    icon: '🖼️',
    desc: '국립 미술관 특별관에 영구 전시 중인 가문의 걸작 화폭. 시대가 흘러도 가치가 치솟는다.',
    eff: { fame: 4, cash: 2000 },
    unlockRoute: 'route:art_mastery',
  },
  // ⚔️ 퇴마사 / 무당
  relic_sacred_bell: {
    id: 'relic_sacred_bell',
    name: '천년 벽조목 방울',
    icon: '🔔',
    desc: '벼락 맞은 천년 대추나무로 깎은 신성한 방울. 가문에 깃든 모든 액운과 악귀를 물리친다.',
    eff: { mor: 3, hp: 2, fame: 2 },
    unlockRoute: 'route:mystic_lineage',
  },
};

/** 가문이 특정 가보를 소유하고 있는지 확인 */
export function hasRelic(s: GameState, relicId: string): boolean {
  return (s.relics ?? []).some((r) => r.id === relicId);
}

/** 가문 가보 수여: 팝업 축하 및 가문 컬렉션에 영구 보존 */
export function grantRelic(s: GameState, p: Person, relicId: string): string {
  const def = RELIC_DEFS[relicId];
  if (!def) return '';
  const relics = (s.relics ??= []);
  if (relics.some((r) => r.id === relicId)) {
    return `이미 가문의 보물함에 전해지는 [${def.name}]을(를) 다시 확인했다.`;
  }

  const relic: Relic = {
    id: def.id,
    name: def.name,
    icon: def.icon,
    desc: def.desc,
    obtainYear: s.year,
    obtainedBy: p.id,
    obtainedJob: p.job,
    eff: { ...def.eff },
    unlockRoute: def.unlockRoute,
  };
  relics.push(relic);

  // 명예 및 축하 보상 팝업
  grant(
    s,
    def.icon,
    `가문의 가보 획득: ${def.name}`,
    `${fullName(p)}이(가) 가문의 위대한 보물 [${def.name}]을(를) 보물함에 모셨다!\n${def.desc}`,
    'legend',
    100,
  );

  s.log.push({
    year: s.year,
    text: `🏆 가문의 보물 [${def.name}] 획득! (${fullName(p)})`,
    kind: 'achv',
  });

  return `[[relic:${def.id}]]\n🏆 가문의 가보 [${def.icon} ${def.name}]이(가) 보물함에 영구 보존되었다! (${relics.length}번째 가보)`;
}

/** 해마다 가문의 가보 효과를 적용하고, 자녀 후속 루트 연계 */
export function relicYear(s: GameState): void {
  const relics = s.relics ?? [];
  if (relics.length === 0) return;

  const h = head(s);
  for (const r of relics) {
    if (r.eff.cash) s.familyCash += r.eff.cash;
    if (r.eff.fame) s.fame += r.eff.fame;

    // 가주 능력치 패시브 보너스 (상한 100)
    if (h && alive(h)) {
      if (r.eff.int) h.actual.int = Math.min(100, (h.actual.int ?? 50) + 1);
      if (r.eff.cha) h.actual.cha = Math.min(100, (h.actual.cha ?? 50) + 1);
      if (r.eff.str) h.actual.str = Math.min(100, (h.actual.str ?? 50) + 1);
      if (r.eff.hp) h.actual.hp = Math.min(100, (h.actual.hp ?? 50) + 1);
      if (r.eff.mor) h.actual.mor = Math.min(100, (h.actual.mor ?? 50) + 1);
    }
  }

  // 자녀 성장 시 가보 연계 이벤트 트리거
  checkRelicRouteEvents(s);
}

/** 가보 소유 시 자녀들에게 발생하는 고유 후속 진로/특성 이벤트 */
function checkRelicRouteEvents(s: GameState): void {
  const h = head(s);
  if (!h || !alive(h)) return;

  const kids = h.childIds.map((id) => s.people[id]).filter((k) => k && alive(k));
  for (const kid of kids) {
    const kAge = age(s, kid);

    // 1. 체스판 가보: 7~10세 자녀에게 체스 조기 영재 교육
    if (hasRelic(s, 'relic_chess_board') && kAge >= 7 && kAge <= 10 && !kid.flags.includes('relic_ev:chess')) {
      kid.flags.push('relic_ev:chess');
      kid.actual.int = Math.min(100, kid.actual.int + 8);
      kid.potential.int = Math.min(100, kid.potential.int + 8);
      if (!kid.traits?.includes('chess_prodigy') && chance(s, 0.4)) {
        kid.traits = [...(kid.traits ?? []), 'chess_prodigy'];
      }
      s.events.push({
        uid: s.eventSeq++,
        defId: 'ev_relic_chess_legacy',
        personId: kid.id,
        data: { name: fullName(kid) },
      });
    }

    // 2. 대통령 훈장 / 국회 금장패: 19~28세 청년 자녀에게 정계 입문 후원
    if ((hasRelic(s, 'relic_presidential_medal') || hasRelic(s, 'relic_law_plaque')) && kAge >= 19 && kAge <= 28 && !kid.flags.includes('relic_ev:pol')) {
      kid.flags.push('relic_ev:pol');
      kid.actual.cha = Math.min(100, kid.actual.cha + 10);
      kid.flags.push('route:political_dynasty');
      s.events.push({
        uid: s.eventSeq++,
        defId: 'ev_relic_political_legacy',
        personId: kid.id,
        data: { name: fullName(kid) },
      });
    }

    // 3. 건물주 권리증: 20세 성인 자녀에게 가문 빌딩 자산 관리 승계
    if (hasRelic(s, 'relic_building_deed') && kAge >= 20 && kAge <= 25 && !kid.flags.includes('relic_ev:bldg')) {
      kid.flags.push('relic_ev:bldg');
      kid.cash += 5000;
      kid.flags.push('route:landlord_heir');
      s.events.push({
        uid: s.eventSeq++,
        defId: 'ev_relic_building_legacy',
        personId: kid.id,
        data: { name: fullName(kid) },
      });
    }

    // 4. 콜드월렛: 18~24세 자녀에게 첨단 테크/투자 시드머니 지원
    if (hasRelic(s, 'relic_cold_wallet') && kAge >= 18 && kAge <= 24 && !kid.flags.includes('relic_ev:wallet')) {
      kid.flags.push('relic_ev:wallet');
      kid.cash += 8000;
      kid.actual.int = Math.min(100, kid.actual.int + 6);
      kid.flags.push('route:deep_hacker');
      s.events.push({
        uid: s.eventSeq++,
        defId: 'ev_relic_crypto_legacy',
        personId: kid.id,
        data: { name: fullName(kid) },
      });
    }
  }
}

import type { EventDef } from './ev-util';

export const RELIC_EVENTS: EventDef[] = [
  {
    id: 'ev_relic_chess_legacy',
    title: () => '♟️ [가보의 인도] 다이아몬드 체스판',
    valid: (c) => alive(c.p),
    text: (c) => `가문의 보물함에 모셔진 [다이아몬드 체스판]을 들여다보던 ${fullName(c.p)}.\n\n선대 그랜드마스터가 남겨둔 친필 기보를 홀린 듯이 한 수 한 수 복기하더니, 반상 위의 복잡한 기물 배치를 한눈에 꿰뚫어 보기 시작했다!\n\n"선대의 지성과 수읽기가 아이의 눈동자 속에서 다시 살아 숨쉬고 있습니다."`,
    choices: () => [
      {
        label: '🏆 선대의 뒤를 잇는 체스 신동으로 집중 육성한다',
        run: (x) => {
          x.p.actual.int = Math.min(100, x.p.actual.int + 8);
          x.p.potential.int = Math.min(100, x.p.potential.int + 8);
          if (!x.p.traits?.includes('chess_prodigy')) {
            x.p.traits = [...(x.p.traits ?? []), 'chess_prodigy'];
          }
          x.s.fame += 2;
          return `${fullName(x.p)}은(는) 가문의 체스판 앞에서 정식으로 입문했다! [체스 신동] 적성을 꽃피우며 두뇌가 비약적으로 발달했다. (지능 +8 · 잠재력 +8 · 가문 명성 +2)`;
        },
      },
      {
        label: '📚 취미와 두뇌 훈련으로 즐겁게 두게 한다',
        run: (x) => {
          x.p.actual.int = Math.min(100, x.p.actual.int + 4);
          x.p.happiness = Math.min(100, x.p.happiness + 15);
          return `${fullName(x.p)}은(는) 즐겁게 체스를 두며 뛰어난 집중력과 지혜를 길렀다. (지능 +4 · 행복 +15)`;
        },
      },
    ],
  },
  {
    id: 'ev_relic_political_legacy',
    title: () => '🏛️ [가문의 유산] 정치 명가의 부름',
    valid: (c) => alive(c.p),
    text: (c) => `가문 대대로 전해져 온 대통령 훈장과 국회 금장패.\n\n청년으로 성장한 ${fullName(c.p)}을(를) 찾아온 정계 원로들과 가문의 오랜 후원회가 따뜻한 악수를 건넨다.\n\n"선대 어르신의 뜻과 국가를 향한 헌신을 기억하고 있습니다. 자제분께서도 가문의 이름을 걸고 국가와 국민을 위한 큰 뜻을 펼쳐보시지 않겠습니까?"`,
    choices: () => [
      {
        label: '🏛️ 가문의 깃발을 들고 정계에 입문한다 (정치 명가 특채)',
        run: (x) => {
          x.p.job = 'aide';
          x.p.jobLevel = 1;
          x.p.flags = x.p.flags.filter((f) => f !== 'student');
          x.p.actual.cha = Math.min(100, x.p.actual.cha + 12);
          x.s.fame += 5;
          return `${fullName(x.p)}은(는) 국회 보좌관으로 전격 정계에 입문했다! 선대의 후광과 가문의 인맥을 등에 업고 정계의 유망주로 떠올랐다. (국회 보좌관 전직 · 매력 +12 · 가문 명성 +5)`;
        },
      },
      {
        label: '💼 정계 대신 전문 경영과 자산 운용에 전념한다',
        run: (x) => {
          x.p.actual.int = Math.min(100, x.p.actual.int + 6);
          x.p.cash += 3000;
          return `${fullName(x.p)}은(는) 실물 경제와 가문 자산 수호에 힘쓰기로 했다. (지능 +6 · 개인 자산 +3,000만원)`;
        },
      },
    ],
  },
  {
    id: 'ev_relic_building_legacy',
    title: () => '🏢 [가보의 결실] 랜드마크 빌딩 관리 승계',
    valid: (c) => alive(c.p),
    text: (c) => `성인이 된 ${fullName(c.p)}에게 가문 1호 랜드마크 빌딩의 등기권리증 액자와 열쇠가 전해졌다.\n\n매달 막대한 임대료가 들어오는 도심 핵심 상권의 중심지. 가주는 자녀에게 빌딩 자산 관리 총괄을 맡기며 다음 세대의 기틀을 마련하고자 한다.`,
    choices: () => [
      {
        label: '🏢 가문 랜드마크 총괄 건물주로 전직한다',
        run: (x) => {
          x.p.job = 'landlord';
          x.p.jobLevel = 1;
          x.p.flags = x.p.flags.filter((f) => f !== 'student');
          x.p.cash += 5000;
          x.p.happiness = Math.min(100, x.p.happiness + 20);
          return `${fullName(x.p)}은(는) 가문의 랜드마크를 총괄하는 건물주의 자리에 올랐다! 안정적인 부의 대물림이 완성됐다. (건물주 전직 · 개인 자산 +5,000만원 · 행복 +20)`;
        },
      },
      {
        label: '📈 전문 자산운용사에 위탁하고 배당금만 받는다',
        run: (x) => {
          x.p.cash += 8000;
          x.s.familyCash += 10000;
          return `전문 운용팀에 빌딩을 맡기고 거액의 배당금을 확보했다. (개인 자산 +8,000만원 · 가문 자산 +1억원)`;
        },
      },
    ],
  },
  {
    id: 'ev_relic_crypto_legacy',
    title: () => '💾 [가문의 비자금] 1만 BTC 콜드월렛 전수',
    valid: (c) => alive(c.p),
    text: () => `가문의 비밀 금고 깊은 곳에서 꺼내진 티타늄 재질의 하드웨어 지갑.\n\n"여기에는 초창기 채굴된 1만 개의 비트코인 개인키가 들어있다. 세상 어떤 정부도 빼앗을 수 없는 가문의 극비 비자금이다. 이 힘을 어디에 쓸 것인지는 너의 판단에 달렸다."`,
    choices: () => [
      {
        label: '🚀 첨단 테크 스타트업 창업 및 AI 연구에 투자한다',
        run: (x) => {
          x.p.job = 'founder';
          x.p.jobLevel = 1;
          x.p.flags = x.p.flags.filter((f) => f !== 'student');
          x.p.actual.int = Math.min(100, x.p.actual.int + 10);
          x.p.cash += 10000;
          x.s.fame += 4;
          return `${fullName(x.p)}은(는) 막대한 디지털 자산을 밑천 삼아 글로벌 테크 스타트업 창업에 나섰다! (창업가 전직 · 지능 +10 · 자산 +1억원 · 명성 +4)`;
        },
      },
      {
        label: '💎 콜드월렛을 분산 보관하며 안전 자산으로 지킨다',
        run: (x) => {
          x.s.familyCash += 20000;
          x.p.happiness = Math.min(100, x.p.happiness + 20);
          return `가문의 곳간에 2억원의 든든한 현금성 비자금이 비축되었다! 가문의 안보가 철통같이 굳건해졌다. (가문 자산 +2억원)`;
        },
      },
    ],
  },
];
