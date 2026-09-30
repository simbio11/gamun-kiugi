// 히든 직업 25종: 이름·수입·카드 효과·그림. (어떻게 되는지는 hidden.ts)
// 그림은 src/assets/hidden/<직업>_<m|f>*.webp (플레이어가 준 도트 그림). 없으면 그림 준비 중.
// fx: 카드 위에 겹치는 움직임 효과
export type HiddenFx = 'bokeh' | 'neon' | 'money' | 'candle' | 'magic' | 'cards' | 'leaves' | 'dust' | 'rain' | 'screen' | 'city' | 'crate' | 'waves' | 'fire' | 'smoke' | 'jungle' | 'spirit' | 'steam' | 'shadow';

export interface HiddenJob {
  id: string;
  name: string;
  icon: string;
  /** 연 수입 (2025년 만원) */
  pay: number;
  color: string;
  fx: HiddenFx;
  /** 카드 효과 (가문 전체) */
  eff: { fame?: number; cash?: number; hap?: number; hp?: number };
  /** 도감 힌트 (잠겨 있을 때) */
  hint: string;
}

export const HIDDEN: HiddenJob[] = [
  { id: 'hj_av', name: 'AV 배우', icon: '💋', pay: 12000, color: '#a0203a', fx: 'bokeh', eff: { cash: 900, fame: 1 }, hint: '빼어난 외모의 스무 살 남짓. 낯선 명함 한 장.' },
  { id: 'hj_adventurer', name: '모험가', icon: '🧭', pay: 5000, color: '#6a7a3a', fx: 'jungle', eff: { fame: 2, hp: 1 }, hint: '튼튼한 몸, 겁 없는 마음, 오래된 지도.' },
  { id: 'hj_magician', name: '마술사', icon: '🎩', pay: 7000, color: '#6a2a6a', fx: 'magic', eff: { fame: 2, hap: 1 }, hint: '사람을 홀리는 말솜씨와 빠른 손.' },
  { id: 'hj_shaman', name: '무당', icon: '🔔', pay: 6000, color: '#b03a3a', fx: 'spirit', eff: { fame: 1, hap: 2 }, hint: '이유 없이 오래 앓는 몸. 집안에 내림굿의 내력.' },
  { id: 'hj_cult', name: '신비로운 교주', icon: '🔮', pay: 20000, color: '#4a2a6a', fx: 'candle', eff: { cash: 1500 }, hint: '사람을 끄는 힘은 넘치는데, 양심은 가볍다.' },
  { id: 'hj_memecoin', name: '밈코인 벼락부자', icon: '🐕', pay: 30000, color: '#c8a030', fx: 'money', eff: { cash: 3000, hap: 1 }, hint: '코인 지갑, 개 그림 토큰, 그리고 미친 운.' },
  { id: 'hj_gambler', name: '타짜', icon: '🃏', pay: 15000, color: '#1a4a2a', fx: 'cards', eff: { cash: 1200 }, hint: '손이 눈보다 빠르고, 도박판을 오래 봤다.' },
  { id: 'hj_natural', name: '자연인', icon: '🌿', pay: 300, color: '#3a6a2a', fx: 'leaves', eff: { hp: 2, hap: 2 }, hint: '지치고 아픈 중년. "나는 산으로 간다."' },
  { id: 'hj_hermit', name: '은둔자 (백수)', icon: '🍜', pay: 0, color: '#5a5a4a', fx: 'dust', eff: { hap: 1 }, hint: '방 밖으로 나오지 않은 지 오래된 청춘.' },
  { id: 'hj_assassin', name: '암살자', icon: '🗡', pay: 25000, color: '#1a1a24', fx: 'rain', eff: { cash: 1800 }, hint: '강한 몸, 차가운 마음, 군복을 벗은 뒤의 공허.' },
  { id: 'hj_hacker', name: '해커', icon: '💻', pay: 18000, color: '#1a4a4a', fx: 'screen', eff: { cash: 1200, fame: 1 }, hint: '천재적인 머리와 밤새 켜진 모니터.' },
  { id: 'hj_spy', name: '스파이', icon: '🕶', pay: 16000, color: '#1a2a4a', fx: 'city', eff: { fame: 1 }, hint: '머리도 말솜씨도 빼어난, 외국을 자주 오가는 사람.' },
  { id: 'hj_smuggler', name: '밀매상', icon: '💎', pay: 20000, color: '#6a4a2a', fx: 'crate', eff: { cash: 1500 }, hint: '장사 수완에 흐린 양심, 항구의 창고.' },
  { id: 'hj_pirate', name: '해적', icon: '🏴‍☠️', pay: 14000, color: '#2a4a6a', fx: 'waves', eff: { fame: 2, cash: 800 }, hint: '바다에서 자랐고, 규칙을 싫어한다.' },
  { id: 'hj_mercenary', name: '용병', icon: '🪖', pay: 22000, color: '#4a5a2a', fx: 'fire', eff: { cash: 1500, hp: -1 }, hint: '전쟁을 겪은 몸은 평범한 일상을 견디지 못한다.' },
  { id: 'hj_mafia', name: '마피아 보스', icon: '🥃', pay: 40000, color: '#2a1a1a', fx: 'smoke', eff: { cash: 3000, fame: 1 }, hint: '도박판·밀수판에서 이름을 날리면 누군가 찾아온다.' },
  { id: 'hj_trader', name: '월스트리트 트레이더', icon: '📈', pay: 35000, color: '#2a3a5a', fx: 'screen', eff: { cash: 2500 }, hint: '숫자 천재 금융인, 한 번의 대박.' },
  { id: 'hj_massage', name: '매혹적인 마사지사', icon: '💆', pay: 9000, color: '#5a2a3a', fx: 'steam', eff: { hap: 2, cash: 500 }, hint: '손이 약손이라 소문난, 눈에 띄는 외모.' },
  { id: 'hj_bounty', name: '현상금 사냥꾼', icon: '🎯', pay: 12000, color: '#5a3a1a', fx: 'dust', eff: { fame: 1, cash: 600 }, hint: '제복을 벗은 사냥개.' },
  { id: 'hj_tarot', name: '타로 점술가', icon: '🔯', pay: 5000, color: '#3a2a5a', fx: 'magic', eff: { hap: 2 }, hint: '사람 마음을 잘 읽고, 보이지 않는 걸 믿는다.' },
  { id: 'hj_thief', name: '괴도', icon: '🎭', pay: 18000, color: '#1a1a3a', fx: 'shadow', eff: { fame: 2 }, hint: '천재적인 머리, 날렵한 몸, 그리고 장난기.' },
  { id: 'hj_exorcist', name: '퇴마사', icon: '📿', pay: 6000, color: '#3a3a2a', fx: 'spirit', eff: { hap: 1, hp: 1 }, hint: '신심 깊은 사람. 집안의 무당, 혹은 성직자.' },
  { id: 'hj_nomad', name: '방랑자', icon: '🎒', pay: 1500, color: '#6a5a3a', fx: 'dust', eff: { hap: 3 }, hint: '매인 곳 없는 떠돌이의 피.' },
  { id: 'hj_fighter', name: '지하 격투왕', icon: '🥊', pay: 10000, color: '#6a1a1a', fx: 'smoke', eff: { fame: 1, hp: -1, cash: 600 }, hint: '가난하고, 주먹이 세다.' },
  { id: 'hj_forger', name: '명화 위조범', icon: '🖌', pay: 16000, color: '#6a4a3a', fx: 'candle', eff: { cash: 1200 }, hint: '천재적인 붓, 가벼운 양심.' },
];
export const HIDDEN_BY_ID: Record<string, HiddenJob> = Object.fromEntries(HIDDEN.map((h) => [h.id, h]));
export const isHiddenJob = (job: string) => job.startsWith('hj_');
