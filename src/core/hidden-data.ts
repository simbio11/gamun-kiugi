// 히든 직업 25종: 이름·수입·카드 효과·그림. (어떻게 되는지는 hidden.ts)
// 그림은 src/assets/hidden/<직업>_<m|f>*.webp (플레이어가 준 도트 그림). 없으면 그림 준비 중.
import type { StatKey } from './types';

export type HiddenFx = 'bokeh' | 'neon' | 'money' | 'candle' | 'magic' | 'cards' | 'leaves' | 'dust' | 'rain' | 'screen' | 'city' | 'crate' | 'waves' | 'fire' | 'smoke' | 'jungle' | 'spirit' | 'steam' | 'shadow';

export interface HiddenJob {
  id: string;
  name: string;
  label?: string;
  icon: string;
  /** 연 수입 (2025년 만원) */
  pay: number;
  color: string;
  fx: HiddenFx;
  /** 카드 효과 (가문 전체) */
  eff: { fame?: number; cash?: number; hap?: number; hp?: number; kid?: StatKey; heat?: number; study?: number };
  /** 도감 힌트 (잠겨 있을 때) */
  hint: string;
  /** 공략법 (카드 뒷면 및 해금 조건) */
  strategy: string;
}

/** 슈퍼 히든 */
export const HOH_IDS = ['hj_vampire', 'hj_timetraveler'];
export const isHoH = (id: string) => HOH_IDS.includes(id);
export const isUltraHidden = (_id: string) => false;
export const ULTRA_HIDDEN_IDS = new Set<string>();

export const SUPER_HIDDEN_IDS = new Set([
  'hj_vtuber',
  'hj_drifter',
  'hj_mafia',
  'hj_private_jet',
  'hj_underground_dealer',
  ...HOH_IDS,
]);

export const isSuperHidden = (id: string) => SUPER_HIDDEN_IDS.has(id);

export const HIDDEN: HiddenJob[] = [
  { id: 'hj_adventurer', name: '모험가', icon: '🧭', pay: 5000, color: '#6a7a3a', fx: 'jungle', eff: { fame: 2, hp: 1 }, hint: '튼튼한 몸, 겁 없는 마음, 오래된 지도.', strategy: '1970년 이후 22~45세, 체력 62 이상, 건강 60 이상, 위험 감수 성향 보유 시 벼룩시장 낡은 지도 발견' },
  { id: 'hj_magician', name: '마술사', icon: '🎩', pay: 7000, color: '#6a2a6a', fx: 'magic', eff: { fame: 2, hap: 1 }, hint: '사람을 홀리는 말솜씨와 빠른 손.', strategy: '18~45세, 매력 58 이상, 지능 52 이상 시 은퇴 마술사 제자 입문 (가족 중 연예인·배우·음악가 시 확률 증가)' },
  { id: 'hj_shaman', name: '무당', icon: '🔔', pay: 6000, color: '#b03a3a', fx: 'spirit', eff: { fame: 1, hap: 2 }, hint: '이유 없이 오래 앓는 몸. 집안에 내림굿의 내력.', strategy: '22~55세, 체력 45 미만 또는 만성질환 앓음, 도덕 45 이상 시 내림굿 (가족 중 무당·신심 깊은 어머니)' },
  { id: 'hj_cult', name: '신비로운 교주', icon: '🔮', pay: 20000, color: '#4a2a6a', fx: 'candle', eff: { cash: 1500 }, hint: '사람을 끄는 힘은 넘치는데, 양심은 가볍다.', strategy: '28세 이상, 매력 60 이상, 도덕 48 이하 시 추종자들과 산속 교단 설립 (가족 중 성직자 시 기회 증가)' },
  { id: 'hj_memecoin', name: '밈코인 벼락부자', icon: '🐕', pay: 30000, color: '#c8a030', fx: 'money', eff: { cash: 3000, hap: 1 }, hint: '코인 지갑, 개 그림 토큰, 그리고 미친 운.', strategy: '2013년 이후 20세 이상, 코인 자산 보유 중 폭등 이벤트 발생 시 전업 코인 인플루언서 전향' },
  { id: 'hj_gambler', name: '타짜', icon: '🃏', pay: 15000, color: '#1a4a2a', fx: 'cards', eff: { cash: 1200 }, hint: '손이 눈보다 빠르고, 도박판을 오래 봤다.', strategy: '20세 이상, 매력 55 이상, 속임수·도박 성향 또는 타짜 플래그 보유 시 하우스 설계자의 스카우트 제의' },
  { id: 'hj_natural', name: '자연인', icon: '🌿', pay: 25000, color: '#3a6a2a', fx: 'leaves', eff: { hp: 8, hap: 6, cash: 2500, kid: 'hp' }, hint: '백두대간 깊은 숲, 맹수와 교감하는 야성의 여신.', strategy: '40세 이상, 행복 30 미만 또는 건강 40 미만 시 모든 세속을 내려놓고 강원도 깊은 산골 흙집으로 입산' },
  { id: 'hj_hermit', name: '은둔자 (백수)', icon: '🍜', pay: 0, color: '#5a5a4a', fx: 'dust', eff: { hap: 1 }, hint: '방 밖으로 나오지 않은 지 오래된 청춘.', strategy: '20~40세 무직·알바생, 행복 45 미만, 비학생 상태에서 면접 탈락 후 방문을 걸어잠그고 방구석 은둔 돌입' },
  { id: 'hj_assassin', name: '암살자', icon: '🗡', pay: 25000, color: '#1a1a24', fx: 'rain', eff: { cash: 1800 }, hint: '강한 몸, 차가운 마음, 군복을 벗은 뒤의 공허.', strategy: '24~50세, 체력 62 이상, 도덕 42 이하, 군 복무/장교 출신 시 익명의 의뢰 봉투 수령 (참전 가족 시 증가)' },
  { id: 'hj_hacker', name: '해커', icon: '💻', pay: 18000, color: '#1a4a4a', fx: 'screen', eff: { cash: 1200, fame: 1 }, hint: '천재적인 머리와 밤새 켜진 모니터.', strategy: '1995년 이후 16세 이상, 지능 70 이상 시 다크웹 해킹 대회 우승 및 비밀 크루 초대 수락' },
  { id: 'hj_spy', name: '스파이', icon: '🕶', pay: 16000, color: '#1a2a4a', fx: 'city', eff: { fame: 1 }, hint: '머리도 말솜씨도 빼어난, 외국을 자주 오가는 사람.', strategy: '25~50세, 지능 62 이상, 매력 58 이상 시 해외 출장 중 국정원/정보국 비밀 요원 면접 제의 수락' },
  { id: 'hj_smuggler', name: '밀매상', icon: '💎', pay: 20000, color: '#6a4a2a', fx: 'crate', eff: { cash: 1500 }, hint: '장사 수완에 흐린 양심, 항구의 창고.', strategy: '25세 이상, 도덕 45 이하, 상인·무역·물류·운송 계열 재직 시 항구 창고 비밀 보석 밀수 수락' },
  { id: 'hj_pirate', name: '해적', icon: '🏴‍☠️', pay: 14000, color: '#2a4a6a', fx: 'waves', eff: { fame: 2, cash: 800 }, hint: '바다에서 자랐고, 규칙을 싫어한다.', strategy: '20~50세, 체력 60 이상, 도덕 50 이하, 항구 선술집에서 외눈 선장의 공해 보물선 해적단 승선 제의' },
  { id: 'hj_mercenary', name: '용병', icon: '🪖', pay: 22000, color: '#4a5a2a', fx: 'fire', eff: { cash: 1500, hp: -1 }, hint: '전쟁을 겪은 몸은 평범한 일상을 견디지 못한다.', strategy: '22~50세, 체력 64 이상, 군 복무·장교·참전 경력 시 해외 민간군사기업(PMC) 분쟁지역 용병 계약' },
  { id: 'hj_mafia', name: '밤의 대부', icon: '🥃', pay: 60000, color: '#2a1a1a', fx: 'smoke', eff: { cash: 6000, fame: 6, heat: 4, kid: 'str' }, hint: '도시의 밤을 쥔 반지. 도박판·밀수판에서 이름을 날린 자에게 부름이 온다.', strategy: '28세 이상 · 매력 56 이상이면서 위험·속임수 성향(또는 타짜·밀매상 이력, 숨은 길 완주) → 3단계: 대부의 부름 → 가문 전쟁 → 도시의 왕' },
  { id: 'hj_trader', name: '월스트리트 트레이더', icon: '📈', pay: 35000, color: '#2a3a5a', fx: 'screen', eff: { cash: 2500 }, hint: '숫자 천재 금융인, 한 번의 대박.', strategy: '1985년 이후 26세 이상, 지능 62 이상, 금융권 재직 중 작성한 공매도 리포트 히트로 뉴욕 헤지펀드 이직' },
  { id: 'hj_bounty', name: '현상금 사냥꾼', icon: '🎯', pay: 12000, color: '#5a3a1a', fx: 'dust', eff: { fame: 1, cash: 600 }, hint: '제복을 벗은 사냥개.', strategy: '28세 이상, 체력 58 이상, 경찰·군인·경비 경력 시 해외 도주 흉악범 거액 사비 현상금 추적 착수' },
  { id: 'hj_tarot', name: '타로 점술가', icon: '🔯', pay: 5000, color: '#3a2a5a', fx: 'magic', eff: { hap: 2 }, hint: '사람 마음을 잘 읽고, 보이지 않는 걸 믿는다.', strategy: '22세 이상, 매력 58, 지능 50, 도덕 50 이상 시 조모 유품 타로 카드로 골목길 심야 점집 개업' },
  { id: 'hj_thief', name: '괴도', icon: '🎭', pay: 18000, color: '#1a1a3a', fx: 'shadow', eff: { fame: 2 }, hint: '천재적인 머리, 날렵한 몸, 그리고 장난기.', strategy: '20~45세, 지능 66 이상, 체력 52 이상, 속임수·위험 성향 시 박물관 허점 간파 후 달빛의 예고장 발송' },
  { id: 'hj_exorcist', name: '퇴마사', icon: '📿', pay: 6000, color: '#3a3a2a', fx: 'spirit', eff: { hap: 1, hp: 1 }, hint: '신심 깊은 사람. 집안의 무당, 혹은 성직자.', strategy: '28세 이상, 도덕 68 이상, 신앙심 깊은 자가 흉가의 귀신 들린 방 퇴마 의뢰를 성공적으로 완수' },
  { id: 'hj_nomad', name: '방랑자', icon: '🎒', pay: 1500, color: '#6a5a3a', fx: 'dust', eff: { hap: 3 }, hint: '매인 곳 없는 떠돌이의 피.', strategy: '어디에도 얽매이지 않고 자유롭게 세상을 유랑하며 방랑의 삶을 만끽' },
  { id: 'hj_fighter', name: '지하 격투왕', icon: '🥊', pay: 10000, color: '#6a1a1a', fx: 'smoke', eff: { fame: 1, hp: -1, cash: 600 }, hint: '가난하고, 주먹이 세다.', strategy: '18~40세, 체력 65 이상, 저소득 환경에서 어둠의 지하 철창 매치 챔피언에 등극' },
  { id: 'hj_forger', name: '명화 위조범', icon: '🖌', pay: 16000, color: '#6a4a3a', fx: 'candle', eff: { cash: 1200 }, hint: '천재적인 붓, 가벼운 양심.', strategy: '22~50세, 지능 60 이상, 예술가 계열 재직 중 암시장 거물에게 명화 모작 위조품 납품' },
  // ── 슈퍼 히든 (3단계 연작 미션 체인) ──
  { id: 'hj_vtuber', name: '버튜버 여제', icon: '🎧', pay: 55000, color: '#7040d0', fx: 'screen', eff: { cash: 5000, hap: 5, fame: 6, kid: 'int' }, hint: '모니터 속 귀여운 아바타, 그리고 책상 위 마이크.', strategy: '20~27세 여성, PC 보유, 매력 68+, 지능 60+ → 3단계 미션: 첫 노래 방송 → 대형 브랜드 콜라보 → 3D 단독 콘서트' },
  { id: 'hj_drifter', name: '드리프트 퀸', icon: '🏎️', pay: 52000, color: '#d03020', fx: 'fire', eff: { fame: 8, cash: 4000, hp: 5, hap: 4 }, hint: '서킷 위 붉은 경주차, 타이어 연기 속의 우승 트로피.', strategy: '선천 희귀 특성 [질주본능](출생 시 2%)을 타고난 여성이 중형 세단 이상의 차를 가지면 → 3단계: 아마추어 대회 → 프로 입단 → 국제 챔피언십' },
  // ── 슈퍼 히든 (핏빛 후작부인 · 시간 정지의 여제) ──
  { id: 'hj_vampire', name: '핏빛 후작부인', icon: '🌹', pay: 65000, color: '#6a0a1a', fx: 'shadow', eff: { cash: 7000, fame: 7, hp: 6, hap: 2 }, hint: '해가 지면 깨어나는 고성의 안주인. 늙지 않는 얼굴.', strategy: '선천 1% [밤의 체질] 여성: 시름시름 앓다 밤에 기운을 되찾고, 치료를 미루면 바로 (쉬운 길) · 또는 슈퍼 히든 가문의 30세+ 여성, 매력 70+·건강 60+ → 3단계' },
  { id: 'hj_timetraveler', name: '시간 정지의 여제', icon: '⏳', pay: 72000, color: '#5a8ad0', fx: 'magic', eff: { cash: 8000, fame: 7, kid: 'int', study: 5 }, hint: '멈춘 사무실, 공중에 뜬 서류와 커피. 그녀만 움직인다.', strategy: '지능 78+ 여성이 높은 직급에 오르면 어느 날 문득 시간이 멈춘다 (확률) · 또는 슈퍼 히든 가문 → 3단계: 멈춘 시계 → 얼어붙은 1초 → 시간 정지의 여제' },
  // ── 슈퍼 히든 (프라이빗 제트 전속 승무원 · 비밀 카지노의 딜러) ──
  { id: 'hj_private_jet', name: '프라이빗 제트 전속 승무원', label: '프라이빗 제트', icon: '✈️', pay: 68000, color: '#1e3250', fx: 'city', eff: { cash: 6500, fame: 5, hap: 6, hp: 3 }, hint: '은은한 조명의 전용기, 구름 위의 샴페인.', strategy: '20~32세 여성, 매력 68+, 지능 60+ → 3단계 미션: VVIP 전담 면접 → 대양 횡단 야간 비행 → 단 한 명을 위한 전속 계약' },
  { id: 'hj_underground_dealer', name: '비밀 카지노의 딜러 (도박의 왕)', label: '언더그라운드 카지노', icon: '🂡', pay: 75000, color: '#3a1a4a', fx: 'cards', eff: { cash: 8000, fame: 6, hap: 4, heat: -2 }, hint: '초록 펠트 테이블, 보라 네온, 그리고 돈이 아닌 약속.', strategy: '21세 이상 남성, 지능 68+, 매력 62+ → 3단계 미션: 심야 하우스의 초대 → 100억의 팟 → 약속의 대결 (도박의 왕)' },
];
export const HIDDEN_BY_ID: Record<string, HiddenJob> = Object.fromEntries(HIDDEN.map((h) => [h.id, h]));
export const isHiddenJob = (job: string) => job.startsWith('hj_');
