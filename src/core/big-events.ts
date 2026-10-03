// 대형 이벤트: 미니게임처럼 여러 라운드를 거치는 큰 승부. 가주·자녀·손주에게 찾아온다.
//   라운드마다 전략을 고르고(선택지마다 성공 확률 표시), 점수 막대가 움직이고, 마지막에 결과가 갈린다.
//   빈도: 가족 중 해당되는 사람이 많을수록 잘 오지만, 한 해 걸러 한 번이 최대 — 5명 가족이면 대략 3년에 한 번.
import { gate, queueNext, type Choice, type EventDef } from './ev-util';
import { addAsset, formatMoney } from './economy';
import { addFlag, age, alive, checkOdds, clamp, fullName, hasTalent, hasTrait, head, isDescendantOf, mark, spouseOf } from './people';
import { grant } from './rewards';
import { chance, pick } from './rng';
import { partnerOf } from './romance';
import { modelOf, myVehicles, vehiclesOf, VEHICLES, vehiclePrice } from './vehicle';
import type { GameState, Person, StatKey } from './types';
import type { Rarity } from './rewards';
import { JOBS } from './data';

type Ctx = { s: GameState; p: Person };
export interface BigOpt {
  label: string;
  stat?: StatKey | 'luck';
  need?: number;
  win?: number;
  lose?: number;
  /** 성공·실패 한 줄 */
  wt: string;
  lt?: string;
  /** 실패하면 다친다 (건강 −) */
  hurt?: number;
  /** 여기서 멈추고 결과로 */
  stop?: boolean;
  /** 판 걸기 (레이싱: 차 키) */
  stake?: boolean;
  /** 성공하면 기록해 둘 값 (경매 낙찰가 등) */
  pot?: number;
  bonus?: (s: GameState, p: Person) => number;
  show?: (s: GameState, p: Person) => boolean;
}
export interface BigRound {
  title: string;
  text: string;
  opts: BigOpt[];
}
export interface BigDef {
  id: string;
  title: string;
  icon: string;
  /** 점수 막대 이름 · 목표 점수 */
  meter: string;
  goal: number;
  ok: (s: GameState, p: Person) => boolean;
  /** 다시 찾아오기까지 (년). 없으면 평생 한 번 */
  again?: number;
  bonus?: (s: GameState, p: Person) => number;
  rounds: BigRound[];
  end: (x: Ctx, sc: number, d: BigData) => string;
}
export interface BigData {
  id: string;
  r: number;
  sc: number;
  last?: string;
  ok?: boolean;
  stake?: boolean;
  pot?: number;
}

const A = (s: GameState, p: Person) => age(s, p);
const STAT_KO: Record<StatKey, string> = { str: '근력', int: '지능', cha: '매력', mor: '성품', hp: '건강' };
interface Reward {
  cash?: number;
  fame?: number;
  hap?: number;
  stats?: Partial<Record<StatKey, number>>;
  flag?: string;
  mark?: string;
  /** 직급 +1 */
  promo?: boolean;
  /** 보상 창 (큰 결과만) */
  title?: string;
  icon?: string;
  rarity?: Rarity;
}
/** 보상을 주고, 결과 글 끝에 붙일 "🎁 보상" 한 줄을 만든다 */
function reward(x: Ctx, r: Reward): string {
  const parts: string[] = [];
  if (r.cash) (x.p.cash += r.cash), parts.push(`💰 ${formatMoney(r.cash)}`);
  if (r.fame) (x.s.fame = Math.max(0, x.s.fame + r.fame)), parts.push(`명성 ${r.fame > 0 ? '+' : ''}${r.fame}`);
  for (const [k, v] of Object.entries(r.stats ?? {}) as [StatKey, number][]) {
    x.p.actual[k] = clamp(x.p.actual[k] + v, 0, 100);
    x.p.potential[k] = Math.max(x.p.potential[k], x.p.actual[k]);
    parts.push(`${STAT_KO[k]} ${v > 0 ? '+' : ''}${v}`);
  }
  if (r.hap) (x.p.happiness = clamp(x.p.happiness + r.hap, 0, 100)), parts.push(`행복 ${r.hap > 0 ? '+' : ''}${r.hap}`);
  if (r.promo && JOBS[x.p.job] && x.p.jobLevel < JOBS[x.p.job].maxLevel) (x.p.jobLevel += 1), parts.push('직급 +1');
  if (r.flag) addFlag(x.p, r.flag);
  if (r.mark) mark(x.p, r.mark, 1);
  if (r.title) grant(x.s, r.icon ?? '🏆', r.title, parts.join(' · '), r.rarity ?? 'rare');
  return parts.length ? `\n🎁 ${parts.join(' · ')}` : '';
}

const fill = (t: string, p: Person) => t.replaceAll('{n}', fullName(p));
const working = (p: Person, jobs: string[]) => jobs.includes(p.job);

/** 이 사람이 몰 수 있는 가장 좋은 차 (요트 제외) */
export function bestCar(s: GameState, p: Person) {
  const sp = spouseOf(s, head(s));
  const mine = [...vehiclesOf(s, [p.id]), ...(p.id === s.headId || p.id === sp?.id ? myVehicles(s) : [])].filter((a) => !modelOf(a)?.yacht);
  return mine.sort((a, b) => (modelOf(b)?.price ?? 0) - (modelOf(a)?.price ?? 0))[0];
}
const carTier = (s: GameState, p: Person) => {
  const a = bestCar(s, p);
  const m = a && modelOf(a);
  return m ? VEHICLES.filter((v) => !v.yacht).findIndex((v) => v.id === m.id) : -1;
};

// ───────────────────────── 20개 승부 ─────────────────────────
export const BIGS: BigDef[] = [
  {
    id: 'race', title: '🏁 심야의 레이스', icon: '🏁', meter: '순위', goal: 5, again: 6,
    ok: (s, p) => A(s, p) >= 19 && A(s, p) <= 50 && p.flags.includes('license') && (carTier(s, p) >= 2 || hasTrait(p, 'speed_demon')),
    bonus: (s, p) => Math.max(0, carTier(s, p)) * 2.5 + (hasTrait(p, 'speed_demon') ? 12 : 0),
    rounds: [
      { title: '도전장', text: '새벽 2시, 항구 옆 폐쇄된 도로. 튜닝카 무리가 {n}의 차를 둘러쌌다. 리더가 차 키를 흔든다. "판돈은? 자존심만? 아니면 키를 걸까?"', opts: [
        { label: '자존심만 건다', wt: '가볍게 붙어 보기로 했다.', stop: false },
        { label: '🔑 차 키를 건다 (이기면 상대 차, 지면 내 차를 넘긴다)', wt: '"좋아. 진짜 승부다." 두 키가 보닛 위에 놓였다.', stake: true, show: (s, p) => !!bestCar(s, p) },
      ] },
      { title: '출발 신호', text: '깃발을 든 사람이 두 차 사이에 섰다. 엔진이 울부짖는다.', opts: [
        { label: '반응속도로 튀어 나간다', stat: 'str', need: 55, win: 2, lose: -1, wt: '총알처럼 튀어 나갔다! 한 차 길이 앞선다.', lt: '휠스핀! 상대가 먼저 치고 나갔다.' },
        { label: '기어를 침착하게 맞춘다', stat: 'int', need: 48, win: 1, lose: 0, wt: '깔끔한 출발. 나란히 달린다.', lt: '반 박자 늦었다.' },
      ] },
      { title: '헤어핀 코너', text: '산길 헤어핀. 브레이크를 늦게 밟는 쪽이 이긴다.', opts: [
        { label: '드리프트로 파고든다', stat: 'str', need: 62, win: 3, lose: -2, wt: '타이어 연기 속에서 인코스를 뺏었다!', lt: '꼬리가 미끄러졌다! 가드레일을 스쳤다.', hurt: 4 },
        { label: '라인을 지킨다', stat: 'int', need: 52, win: 1, lose: 0, wt: '정석대로 빠져나왔다.', lt: '조금 밀렸다.' },
      ] },
      { title: '마지막 직선 · 사이렌', text: '결승선이 보인다. 멀리서 경찰 사이렌이 울린다!', opts: [
        { label: '니트로를 쏜다', stat: 'luck', need: 45, win: 3, lose: -2, wt: '계기판 바늘이 끝까지 돌았다! 결승선 통과!', lt: '엔진이 콜록거렸다.' },
        { label: '끝까지 밟는다', stat: 'str', need: 58, win: 2, lose: -1, wt: '한 뼘 차이로 먼저 들어왔다!', lt: '마지막에 따라잡혔다.' },
      ] },
    ],
    end: (x, sc, d) => {
      const won = sc >= 5;
      let car = '';
      if (d.stake) {
        const mine = bestCar(x.s, x.p);
        if (won) {
          const mi = mine ? VEHICLES.findIndex((v) => v.id === modelOf(mine)?.id) : 1;
          const m = VEHICLES.filter((v) => !v.yacht)[Math.min(8, mi + 1 + (chance(x.s, 0.3) ? 1 : 0))];
          const a = addAsset(x.s, 'vehicle', x.p.id, vehiclePrice(x.s, m), m.name.replace(/ \((.*)급\)/, ' · $1').replace(/ \((.*)\)/, ' · $1'));
          a.tags = [m.id];
          car = `\n🔑 상대의 ${m.icon} ${m.name} 키를 손에 쥐었다! (${formatMoney(a.value)})`;
        } else if (mine) {
          x.s.assets = x.s.assets.filter((a) => a.id !== mine.id);
          car = `\n🔑 ${mine.name}의 키를 넘겼다. 걸어서 집에 갔다…`;
        }
      }
      if (won) return `🏁 승리! 거리의 전설이 됐다. 영상이 밤새 돌았다.${car}` + reward(x, { cash: d.stake ? 0 : 1000, fame: 2, hap: 15, stats: { str: 2 }, mark: 'risk', title: `거리의 전설: ${fullName(x.p)}`, icon: '🏁', rarity: d.stake ? 'epic' : 'rare' });
      let out = `🏁 패배. 상대의 미등만 멀어졌다.${car}`;
      if (chance(x.s, 0.3)) (x.p.cash -= 300), (out += '\n🚔 단속에 걸렸다. 벌금 300만, 면허 정지 석 달.');
      return out + reward(x, { hap: -8, stats: { str: 1 } });
    },
  },
  {
    id: 'audition', title: '🎤 오디션 서바이벌', icon: '🎤', meter: '심사 점수', goal: 6,
    ok: (s, p) => A(s, p) >= 15 && A(s, p) <= 28 && (p.actual.cha >= 58 || hasTalent(p, 'pitch') || hasTalent(p, 'star')),
    bonus: (_s, p) => (hasTalent(p, 'pitch') ? 10 : 0) + (hasTalent(p, 'star') ? 8 : 0),
    rounds: [
      { title: '예선 · 선곡', text: '참가자 10만 명. {n}의 번호는 4,821번. 무엇을 부를까?', opts: [
        { label: '정통 발라드', stat: 'cha', need: 55, win: 2, lose: -1, wt: '심사위원이 눈을 감고 들었다. 합격!', lt: '고음에서 삑사리가 났다.' },
        { label: '칼군무 댄스곡', stat: 'str', need: 55, win: 2, lose: -1, wt: '무대가 터졌다. 합격!', lt: '숨이 차서 라이브가 흔들렸다.' },
        { label: '자작곡', stat: 'int', need: 60, win: 3, lose: -1, wt: '"이거 직접 쓴 거예요?" 심사위원이 일어섰다.', lt: '곡이 낯설었는지 반응이 미지근했다.' },
      ] },
      { title: '본선 · 팀 미션', text: '팀 미션. 팀원끼리 파트 분배로 싸움이 났다.', opts: [
        { label: '리더를 맡아 정리한다', stat: 'cha', need: 60, win: 2, lose: -1, wt: '팀이 하나가 됐다. 팀 1위!', lt: '팀 분위기가 끝내 안 살아났다.' },
        { label: '킬링 파트를 노린다', stat: 'cha', need: 66, win: 3, lose: -2, wt: '그 4초가 하이라이트 영상이 됐다!', lt: '욕심낸다는 악편이 나갔다.' },
      ] },
      { title: '생방송 결승', text: '실시간 문자 투표. 마지막 무대다.', opts: [
        { label: '가족에게 바치는 노래', stat: 'mor', need: 55, win: 2, lose: 0, wt: '객석이 울었다. 문자 투표 폭발!', lt: '감동은 컸지만 표는 갈렸다.' },
        { label: '최고 난도 퍼포먼스', stat: 'cha', need: 70, win: 3, lose: -1, wt: '전설의 무대. 실시간 검색어 1위!', lt: '실수 하나가 아쉬웠다.' },
      ] },
    ],
    end: (x, sc) => {
      if (sc >= 6) {
        if (['none', 'parttime'].includes(x.p.job) && !x.p.flags.includes('student') && A(x.s, x.p) >= 18) (x.p.job = 'singer'), (x.p.jobLevel = 1), (x.p.jobYears = 0);
        return '🏆 최종 우승! 데뷔 계약서에 사인했다. 다음 날 아침, 모든 포털 메인에 이름이 걸렸다.' + reward(x, { cash: 3000, fame: 5, hap: 20, stats: { cha: 5 }, flag: 'audition_win', title: `오디션 우승: ${fullName(x.p)}`, icon: '🎤', rarity: 'epic' });
      }
      if (sc >= 3) return '🥉 TOP 3. 우승은 놓쳤지만 팬카페가 생겼다.' + reward(x, { cash: 500, fame: 2, hap: 6, stats: { cha: 3 }, title: `오디션 TOP 3: ${fullName(x.p)}`, icon: '🎤', rarity: 'rare' });
      return '탈락. 그래도 무대에 섰던 그 떨림은 오래 남았다.' + reward(x, { hap: -6, stats: { cha: 1 } });
    },
  },
  {
    id: 'quiz', title: '🧠 TV 퀴즈 서바이벌', icon: '🧠', meter: '맞힌 문제', goal: 4, again: 10,
    ok: (s, p) => A(s, p) >= 14 && A(s, p) <= 80 && p.actual.int >= 62,
    bonus: (_s, p) => (hasTalent(p, 'genius') ? 10 : 0) + (hasTalent(p, 'linguist') ? 4 : 0),
    rounds: [1, 2, 3, 4].map((n) => ({
      title: `${n}단계 · 상금 ${['100만', '500만', '2,000만', '1억'][n - 1]}`,
      text: ['첫 문제는 몸풀기. 조명이 {n}을(를) 비춘다.', '"다음 중 가장 먼저 발명된 것은?" 객석이 웅성인다.', '남은 사람은 셋. 손에 땀이 찬다.', '마지막 문제. 맞히면 1억, 틀리면 0원.'][n - 1],
      opts: [
        { label: '정답을 외친다 (지능)', stat: 'int' as const, need: 44 + n * 8, win: 1, lose: -9, wt: '"정답입니다!"', lt: '"…아쉽습니다." 0원.' },
        ...(n > 1 ? [{ label: '상금을 들고 멈춘다', stop: true, wt: '여기서 멈추기로 했다.' }] : []),
      ],
    })),
    end: (x, sc) => {
      if (sc < 0) return '😵 탈락. 상금은 사라졌지만 동네에선 "그 퀴즈 나온 사람"이 됐다.' + reward(x, { hap: -5, stats: { int: 1 } });
      const pot = [0, 100, 500, 2000, 10000][Math.max(0, Math.min(4, sc))];
      if (sc >= 4) return '🏆 1억 원 최종 우승! "인간 백과사전"이라는 별명이 붙었다.' + reward(x, { cash: pot, fame: 4, hap: 20, stats: { int: 4 }, title: `퀴즈 왕: ${fullName(x.p)}`, icon: '🧠', rarity: 'epic' });
      return `💰 ${sc}단계에서 멈췄다.` + reward(x, { cash: pot, fame: 1, hap: 8, stats: { int: 2 } });
    },
  },
  {
    id: 'cook', title: '🍳 요리 서바이벌', icon: '🍳', meter: '심사위원 점수', goal: 6,
    ok: (s, p) => A(s, p) >= 20 && A(s, p) <= 65 && (working(p, ['chef', 'baker', 'restaurant', 'sommelier', 'bartender', 'nutritionist']) || hasTalent(p, 'palate')),
    bonus: (_s, p) => (hasTalent(p, 'palate') ? 12 : 0) + (p.job === 'chef' ? p.jobLevel * 2 : 0),
    rounds: [
      { title: '1라운드 · 재료', text: '100명의 셰프, 단 하나의 주방. 재료 창고 문이 열렸다.', opts: [
        { label: '제철 재료로 정직하게', stat: 'int', need: 52, win: 2, lose: 0, wt: '"재료를 아는 사람이네요."', lt: '평범하다는 평.' },
        { label: '귀한 재료로 승부', stat: 'luck', need: 55, win: 3, lose: -1, wt: '송로버섯 향이 심사석까지 퍼졌다!', lt: '재료가 요리를 이겨 버렸다.' },
      ] },
      { title: '2라운드 · 요리', text: '제한 시간 60분. 무엇을 만들까?', opts: [
        { label: '어머니의 손맛, 정통 한식', stat: 'mor', need: 55, win: 2, lose: -1, wt: '심사위원이 숟가락을 내려놓지 않았다.', lt: '간이 조금 셌다.' },
        { label: '과감한 퓨전', stat: 'int', need: 62, win: 3, lose: -2, wt: '"이런 조합은 처음이에요!"', lt: '"…무슨 맛인지 모르겠네요."' },
      ] },
      { title: '결승 · 플레이팅', text: '마지막 접시. 심사위원 두 명이 팔짱을 꼈다.', opts: [
        { label: '접시에 이야기를 담는다', stat: 'cha', need: 58, win: 2, lose: 0, wt: '설명을 듣던 심사위원이 고개를 끄덕였다.', lt: '이야기가 길었다.' },
        { label: '화려한 불쇼', stat: 'str', need: 60, win: 3, lose: -1, wt: '불꽃 속에서 완성된 접시. 스튜디오가 들썩였다!', lt: '불이 너무 셌다.', hurt: 3 },
      ] },
    ],
    end: (x, sc) => {
      if (sc >= 6) {
        if (x.p.job === 'chef' || x.p.job === 'restaurant') x.p.jobLevel += 1;
        return '🏆 우승! 다음 날부터 예약이 석 달 치 꽉 찼다.' + reward(x, { cash: 3000, fame: 4, hap: 20, stats: { int: 2, cha: 3 }, flag: 'cook_win', title: `요리 서바이벌 우승: ${fullName(x.p)}`, icon: '🍳', rarity: 'epic' });
      }
      if (sc >= 3) return '🥈 준우승. "그 요리사"를 찾아오는 손님이 늘었다.' + reward(x, { cash: 800, fame: 2, hap: 8, stats: { cha: 2 } });
      return '탈락. 칼을 다시 갈았다.' + reward(x, { hap: -5, stats: { int: 1 } });
    },
  },
  {
    id: 'everest', title: '🏔 8천 미터의 꿈', icon: '🏔', meter: '고도', goal: 5,
    ok: (s, p) => A(s, p) >= 25 && A(s, p) <= 55 && p.actual.str >= 60 && p.actual.hp >= 60,
    bonus: (_s, p) => (hasTalent(p, 'iron') ? 12 : 0) + (hasTalent(p, 'athlete') ? 6 : 0),
    rounds: [
      { title: '쿰부 아이스폴', text: '베이스캠프 5,364m. 발밑에서 얼음이 갈라지는 소리가 난다.', opts: [
        { label: '고정 로프를 따라 천천히', stat: 'str', need: 52, win: 1, lose: 0, wt: '무사히 건넜다.', lt: '시간이 오래 걸렸다.' },
        { label: '새벽에 빠르게 돌파', stat: 'str', need: 62, win: 2, lose: -1, wt: '해 뜨기 전에 통과했다!', lt: '크레바스에 발이 빠졌다.', hurt: 8 },
      ] },
      { title: '캠프 4 · 폭풍', text: '7,900m. 텐트가 바람에 찢어질 듯 흔들린다.', opts: [
        { label: '하루 기다린다', stat: 'luck', need: 60, win: 1, lose: 0, wt: '다음 날 하늘이 열렸다.', lt: '날씨가 더 나빠졌다.' },
        { label: '그대로 강행', stat: 'hp', need: 66, win: 2, lose: -1, wt: '폭풍을 뚫었다!', lt: '동상이 왔다.', hurt: 10 },
      ] },
      { title: '힐러리 스텝 · 산소 부족', text: '8,790m. 정상이 손에 잡힐 듯하다. 산소통 눈금이 얼마 안 남았다.', opts: [
        { label: '정상까지 간다', stat: 'hp', need: 70, win: 2, lose: -2, wt: '세상의 꼭대기에 섰다.', lt: '시야가 흐려졌다. 셰르파가 끌어내렸다.', hurt: 15 },
        { label: '돌아선다 — 산은 그대로 있다', stop: true, wt: '살아서 돌아가는 것도 용기다.' },
      ] },
    ],
    end: (x, sc) => {
      if (sc >= 5) return '🏔 8,848m 정상! 가문의 깃발을 꽂았다. 하산 후 기자들이 공항에서 기다리고 있었다.' + reward(x, { fame: 6, hap: 25, stats: { str: 4, mor: 3 }, flag: 'summit_8000', title: `에베레스트 등정: ${fullName(x.p)}`, icon: '🏔', rarity: 'epic' });
      return '🏕 정상은 다음으로. 그래도 살아 돌아와 가족을 안았다.' + reward(x, { hap: 4, stats: { str: 2 } });
    },
  },
  {
    id: 'marathon', title: '🏃 마라톤 풀코스', icon: '🏃', meter: '기록', goal: 4, again: 6,
    ok: (s, p) => A(s, p) >= 20 && A(s, p) <= 65 && p.actual.hp >= 50,
    bonus: (_s, p) => (hasTalent(p, 'iron') ? 14 : 0) + (hasTalent(p, 'athlete') ? 6 : 0),
    rounds: [
      { title: '출발 · 10km', text: '3만 명이 광화문을 출발했다.', opts: [
        { label: '초반부터 질주', stat: 'str', need: 60, win: 2, lose: -2, wt: '선두 그룹에 붙었다!', lt: '오버페이스. 다리가 무겁다.' },
        { label: '내 페이스대로', stat: 'hp', need: 48, win: 1, lose: 0, wt: '호흡이 안정적이다.', lt: '생각보다 힘들다.' },
      ] },
      { title: '30km · 벽', text: '"마라톤은 30km부터"라는 말이 이해된다. 다리가 말을 안 듣는다.', opts: [
        { label: '이를 악물고 버틴다', stat: 'mor', need: 58, win: 2, lose: -1, wt: '벽을 넘었다!', lt: '걷다 뛰다를 반복했다.' },
        { label: '물과 에너지젤 보급', stat: 'int', need: 50, win: 1, lose: 0, wt: '다시 힘이 났다.', lt: '배가 아파 왔다.' },
      ] },
      { title: '마지막 2km', text: '결승선 아치가 보인다. 가족이 손을 흔든다.', opts: [
        { label: '전력 스퍼트', stat: 'str', need: 60, win: 2, lose: -1, wt: '마지막 직선에서 열 명을 제쳤다!', lt: '다리에 쥐가 났다.', hurt: 3 },
        { label: '웃으며 완주', stat: 'luck', need: 85, win: 1, lose: 0, wt: '두 팔을 번쩍 들고 결승선!', lt: '절뚝이며 들어왔다.' },
      ] },
    ],
    end: (x, sc) => {
      if (sc >= 5) return '🏅 2시간 59분! 아마추어의 꿈, "서브3" 달성.' + reward(x, { fame: 2, hap: 18, stats: { hp: 4, str: 3 }, flag: 'saga_run', title: `마라톤 서브3: ${fullName(x.p)}`, icon: '🏃', rarity: 'rare' });
      if (sc >= 2) return '🏅 완주! 메달을 목에 걸고 가족과 사진을 찍었다.' + reward(x, { hap: 12, stats: { hp: 3, str: 1 }, flag: 'saga_run' });
      return '🚑 32km 지점에서 기권. 내년을 기약한다.' + reward(x, { hap: -3, stats: { hp: 1 } });
    },
  },
  {
    id: 'stocks', title: '📈 실전 투자 대회', icon: '📈', meter: '수익률(%)', goal: 40, again: 8,
    ok: (s, p) => A(s, p) >= 25 && A(s, p) <= 75 && p.actual.int >= 55 && (s.assets.some((a) => a.kind === 'stock' && a.ownerId === p.id) || ['analyst', 'fund_manager', 'trader', 'banker', 'hj_trader'].includes(p.job)),
    bonus: (_s, p) => (hasTalent(p, 'strategist') ? 10 : 0) + (hasTalent(p, 'merchant') ? 6 : 0),
    rounds: [
      { title: '1주차 · 장 시작', text: '증권사 실전 투자 대회. 참가자 2만 명, 시드 1억.', opts: [
        { label: '대형주 분할 매수', stat: 'int', need: 50, win: 8, lose: -4, wt: '+8%. 안정적인 출발.', lt: '-4%. 시장이 빠졌다.' },
        { label: '테마주 몰빵', stat: 'luck', need: 40, win: 25, lose: -20, wt: '+25%! 상한가!', lt: '-20%. 하한가…' },
      ] },
      { title: '2주차 · 금리 발표', text: '내일 금리 결정. 시장이 숨을 죽였다.', opts: [
        { label: '발표 전에 판다', stat: 'int', need: 58, win: 6, lose: -2, wt: '빠지기 전에 빠져나왔다.', lt: '오히려 올랐다.' },
        { label: '버틴다', stat: 'luck', need: 50, win: 12, lose: -10, wt: '금리 동결! 급등!', lt: '금리 인상. 급락.' },
      ] },
      { title: '3주차 · 공매도 세력', text: '보유 종목에 악성 루머가 돈다.', opts: [
        { label: '재무제표를 믿고 추가 매수', stat: 'int', need: 62, win: 15, lose: -12, wt: '루머는 거짓이었다. 반등!', lt: '진짜였다.' },
        { label: '손절', stat: 'int', need: 45, win: 2, lose: -5, wt: '피해를 줄였다.', lt: '팔자마자 올랐다.' },
      ] },
      { title: '마지막 날 · 동시호가', text: '순위표 3위. 마지막 30분.', opts: [
        { label: '레버리지로 승부', stat: 'luck', need: 45, win: 20, lose: -15, wt: '종가 상한가! 순위가 뒤집혔다!', lt: '마지막에 미끄러졌다.' },
        { label: '현금 확보하고 지킨다', stat: 'int', need: 50, win: 3, lose: 0, wt: '순위를 지켰다.', lt: '추월당했다.' },
      ] },
    ],
    end: (x, sc) => {
      if (sc >= 40) return `🏆 수익률 ${sc}%로 우승! "여의도의 승부사"라는 기사가 났다.` + reward(x, { cash: 5000, fame: 3, hap: 15, stats: { int: 3 }, title: `실전 투자 대회 우승: ${fullName(x.p)}`, icon: '📈', rarity: 'epic' });
      if (sc > 0) return `📊 수익률 ${sc}%. 상위권 상금을 받았다.` + reward(x, { cash: Math.round(sc * 50), hap: 5, stats: { int: 1 } });
      return `📉 수익률 ${sc}%. 시장은 겸손을 가르쳤다.` + reward(x, { hap: -6, stats: { int: 1 } });
    },
  },
  {
    id: 'baduk', title: '⚫ 바둑 명인전 결승', icon: '⚫', meter: '형세', goal: 5,
    ok: (s, p) => A(s, p) >= 10 && A(s, p) <= 80 && (p.actual.int >= 68 || hasTalent(p, 'strategist')),
    bonus: (_s, p) => (hasTalent(p, 'strategist') ? 12 : 0) + (hasTalent(p, 'genius') ? 6 : 0),
    rounds: [
      { title: '포석', text: '아마추어 명인전 결승. 상대는 전 연구생 출신. 첫 수를 둔다.', opts: [
        { label: '실리를 챙긴다', stat: 'int', need: 55, win: 1, lose: 0, wt: '귀를 차지했다.', lt: '상대가 세력을 쌓았다.' },
        { label: '중앙 세력', stat: 'int', need: 62, win: 2, lose: -1, wt: '큰 그림이 그려졌다.', lt: '집이 모자라 보인다.' },
      ] },
      { title: '중반 · 대마 전투', text: '상대 대마가 끊겼다. 잡으면 끝이다.', opts: [
        { label: '대마를 사냥한다', stat: 'int', need: 68, win: 3, lose: -2, wt: '대마가 죽었다! 해설진이 탄성을 질렀다.', lt: '수가 모자랐다. 오히려 내 돌이 잡혔다.' },
        { label: '내 약점부터 보강', stat: 'int', need: 56, win: 1, lose: 0, wt: '튼튼하게 받았다.', lt: '기회를 놓쳤다.' },
      ] },
      { title: '끝내기 · 초읽기', text: '"셋, 넷, 다섯…" 초읽기 소리가 귀를 찌른다.', opts: [
        { label: '끝까지 정밀하게 계산', stat: 'int', need: 62, win: 2, lose: -1, wt: '반집을 지켰다!', lt: '계산이 꼬였다.' },
        { label: '승부수', stat: 'luck', need: 40, win: 3, lose: -2, wt: '신의 한 수! 판이 뒤집혔다.', lt: '무리수였다.' },
      ] },
    ],
    end: (x, sc) => {
      if (sc >= 5) return '🏆 반집 승! 명인 칭호를 얻었다. 기보가 바둑 채널에서 해설됐다.' + reward(x, { cash: 2000, fame: 3, hap: 15, stats: { int: 4 }, title: `명인 등극: ${fullName(x.p)}`, icon: '⚫', rarity: 'epic' });
      if (sc >= 2) return '🥈 준우승. 복기하며 밤을 새웠다.' + reward(x, { cash: 500, hap: 5, stats: { int: 2 } });
      return '불계패. 돌을 던졌다. 그래도 좋은 바둑이었다.' + reward(x, { hap: -4, stats: { int: 1 } });
    },
  },
  {
    id: 'debate', title: '🗳 생방송 TV 토론', icon: '🗳', meter: '지지율 변화', goal: 5,
    ok: (s, p) => A(s, p) >= 30 && A(s, p) <= 75 && (working(p, ['politician', 'mayor', 'minister', 'aide', 'lawyer', 'journalist', 'professor']) || hasTalent(p, 'orator')),
    bonus: (_s, p) => (hasTalent(p, 'orator') ? 12 : 0),
    rounds: [
      { title: '첫 질문 · 집값', text: '"집값, 어떻게 잡으시겠습니까?" 사회자의 첫 질문.', opts: [
        { label: '숫자로 정책을 설명', stat: 'int', need: 60, win: 2, lose: -1, wt: '"준비된 사람" 반응.', lt: '너무 어려웠다.' },
        { label: '상대 정책을 공격', stat: 'cha', need: 62, win: 3, lose: -2, wt: '한 방이 클립으로 퍼졌다!', lt: '네거티브라는 비판.' },
        { label: '서민의 이야기로', stat: 'mor', need: 55, win: 2, lose: -1, wt: '진정성이 통했다.', lt: '뻔한 이야기라는 평.' },
      ] },
      { title: '돌발 · 의혹 제기', text: '상대가 {n}의 과거 의혹을 꺼냈다. 카메라가 클로즈업한다.', opts: [
        { label: '정면 돌파', stat: 'mor', need: 60, win: 2, lose: -2, wt: '"사실이 아닙니다. 자료로 말하겠습니다." 깔끔했다.', lt: '말이 꼬였다.' },
        { label: '유머로 받아친다', stat: 'cha', need: 66, win: 3, lose: -2, wt: '방청석이 웃음바다. 밈이 됐다.', lt: '가볍다는 비판.' },
      ] },
      { title: '마지막 1분', text: '마지막 발언. 이 1분이 모든 걸 정한다.', opts: [
        { label: '미래 비전', stat: 'cha', need: 62, win: 2, lose: 0, wt: '"이 사람이 그리는 나라를 보고 싶다."', lt: '공허했다.' },
        { label: '진심 어린 다짐', stat: 'mor', need: 58, win: 2, lose: 0, wt: '눈시울이 붉어진 시청자가 많았다.', lt: '평범했다.' },
      ] },
    ],
    end: (x, sc) => {
      const pl = x.p.pol;
      if (pl) pl.approval = clamp(pl.approval + sc * 2, 0, 100);
      const ap = pl ? ` (지지율 ${sc >= 0 ? '+' : ''}${sc * 2}%p)` : '';
      if (sc >= 5) return `🏆 토론 압승!${ap} 다음 날 신문 1면.` + reward(x, { fame: 4, hap: 12, stats: { cha: 3, int: 1 }, title: `토론 압승: ${fullName(x.p)}`, icon: '🗳', rarity: 'rare' });
      if (sc >= 0) return `무난했다.${ap}` + reward(x, { fame: 1, stats: { cha: 1 } });
      return `😓 토론 참패.${ap}` + reward(x, { fame: -1, hap: -8 });
    },
  },
  {
    id: 'flight', title: '🚑 "기내에 의사 선생님 계십니까?"', icon: '🚑', meter: '환자 상태', goal: 5, again: 10,
    ok: (s, p) => A(s, p) >= 26 && A(s, p) <= 70 && working(p, ['doctor', 'kmd', 'nurse', 'emt', 'pharmacist', 'longevity_doc', 'bci_surgeon']),
    bonus: (_s, p) => (hasTalent(p, 'healer') ? 12 : 0) + p.jobLevel * 2,
    rounds: [
      { title: '고도 1만 m', text: '태평양 상공. 승객 하나가 가슴을 움켜쥐고 쓰러졌다. 승무원이 {n}에게 달려왔다.', opts: [
        { label: '증상을 꼼꼼히 묻는다', stat: 'int', need: 55, win: 2, lose: -1, wt: '심근경색 의심. 빠르게 판단했다.', lt: '시간이 흘렀다.' },
        { label: '바로 활력징후부터', stat: 'int', need: 60, win: 2, lose: -1, wt: '맥박·혈압·산소포화도. 그림이 보인다.', lt: '기내 장비가 부족했다.' },
      ] },
      { title: '처치', text: '기내 응급 키트를 열었다. 아스피린, 니트로글리세린, 자동심장충격기.', opts: [
        { label: '응급 처치를 시작한다', stat: 'int', need: 62, win: 3, lose: -2, wt: '환자의 얼굴에 혈색이 돌아왔다!', lt: '심정지! CPR을 시작했다.' },
        { label: '기장에게 회항을 요청', stat: 'cha', need: 50, win: 1, lose: 0, wt: '가장 가까운 공항으로 기수를 돌렸다.', lt: '회항까지 두 시간.' },
      ] },
      { title: '착륙까지', text: '착륙까지 40분. 환자 곁을 지킨다.', opts: [
        { label: '곁을 지키며 관찰', stat: 'mor', need: 55, win: 2, lose: -1, wt: '착륙과 동시에 구급대에 인계했다.', lt: '상태가 오르락내리락했다.' },
      ] },
    ],
    end: (x, sc) => {
      if (sc >= 5) return '✈ 환자가 살았다! 항공사가 감사패와 평생 비즈니스석 업그레이드를, 승객들이 기립 박수를 보냈다. 뉴스에 나왔다.' + reward(x, { cash: 500, fame: 3, hap: 20, stats: { mor: 3, int: 2 }, title: `하늘의 의인: ${fullName(x.p)}`, icon: '🚑', rarity: 'rare' });
      if (sc >= 2) return '환자는 무사히 병원으로 옮겨졌다. 조용히 내 자리로 돌아왔다.' + reward(x, { hap: 8, stats: { mor: 2 } });
      return '최선을 다했지만 환자는 끝내… 오래 마음에 남았다.' + reward(x, { hap: -10, stats: { mor: 1 } });
    },
  },
  {
    id: 'fire', title: '🚒 불길 속으로', icon: '🚒', meter: '구조', goal: 5, again: 8,
    ok: (s, p) => A(s, p) >= 22 && A(s, p) <= 60 && working(p, ['firefighter', 'police', 'coast_guard', 'officer', 'nco', 'emt', 'security_guard']),
    bonus: (_s, p) => (hasTalent(p, 'iron') ? 10 : 0) + (hasTalent(p, 'athlete') ? 6 : 0),
    rounds: [
      { title: '진입', text: '15층 아파트에 불이 났다. 9층에 아이가 있다는 신고.', opts: [
        { label: '계단으로 정면 진입', stat: 'str', need: 58, win: 2, lose: -1, wt: '연기를 뚫고 9층에 닿았다.', lt: '열기에 밀려 돌아섰다.', hurt: 5 },
        { label: '옆집 베란다로 건너간다', stat: 'str', need: 66, win: 3, lose: -2, wt: '아찔한 횡단 성공!', lt: '미끄러질 뻔했다.', hurt: 10 },
      ] },
      { title: '구조', text: '방 안에 아이와 할머니가 있다. 산소통은 하나.', opts: [
        { label: '아이에게 마스크를 씌우고 할머니를 업는다', stat: 'mor', need: 55, win: 2, lose: -1, wt: '둘 다 품에 안았다.', lt: '시간이 너무 걸렸다.' },
        { label: '동료를 불러 나눠 업는다', stat: 'cha', need: 52, win: 2, lose: 0, wt: '팀워크가 빛났다.', lt: '무전이 끊겼다.' },
      ] },
      { title: '붕괴 직전', text: '천장에서 소리가 난다. 탈출해야 한다!', opts: [
        { label: '전력으로 뛴다', stat: 'hp', need: 60, win: 2, lose: -2, wt: '건물을 빠져나온 순간, 뒤에서 천장이 무너졌다.', lt: '파편에 맞았다.', hurt: 15 },
      ] },
    ],
    end: (x, sc) => {
      if (sc >= 5) return `🦸 두 사람 모두 살았다! 아이 엄마가 ${fullName(x.p)}의 손을 잡고 울었다. 의인으로 표창을 받았다.` + reward(x, { cash: 1000, fame: 5, hap: 20, stats: { mor: 3, str: 2 }, flag: 'fire_hero', title: `불길 속의 의인: ${fullName(x.p)}`, icon: '🚒', rarity: 'epic', promo: true });
      if (sc >= 2) return '모두 구조했다. 오늘도 무사히 퇴근했다.' + reward(x, { fame: 1, hap: 8, stats: { mor: 2 } });
      return '구조는 했지만 큰 화상을 입었다. 오래 치료받았다.' + reward(x, { hap: -12, stats: { hp: -3 } });
    },
  },
  {
    id: 'auction', title: '🏠 법원 경매 입찰', icon: '🏠', meter: '낙찰', goal: 1, again: 8,
    ok: (s, p) => A(s, p) >= 30 && A(s, p) <= 80 && p.cash >= 20000,
    rounds: [
      { title: '입찰표', text: '법원 경매 법정. 감정가 4억짜리 아파트. 입찰자가 열두 명이다. 입찰표에 금액을 적는다.', opts: [
        { label: '감정가의 70% (2억 8천)', pot: 28000, stat: 'luck', need: 25, win: 1, lose: 0, wt: '낙찰! 차순위와 30만 원 차이.', lt: '패찰. 누군가 더 썼다.' },
        { label: '감정가의 82% (3억 3천)', pot: 33000, stat: 'luck', need: 60, win: 1, lose: 0, wt: '낙찰!', lt: '패찰.' },
        { label: '감정가의 95% (3억 8천)', pot: 38000, stat: 'luck', need: 90, win: 1, lose: 0, wt: '낙찰! (조금 비싸게 샀다)', lt: '패찰… 이 값에도?' },
      ] },
      { title: '명도', text: '낙찰받은 집에 아직 사람이 산다. 내보내야 한다.', opts: [
        { label: '이사비를 주고 협상한다', stat: 'cha', need: 50, win: 1, lose: 0, wt: '좋게 합의했다.', lt: '협상이 길어졌다. 소송까지 갔다.' },
        { label: '법대로 강제집행', stat: 'mor', need: 40, win: 1, lose: 0, wt: '절차대로 끝냈다.', lt: '마음이 무거웠다.' },
      ] },
    ],
    end: (x, sc, d) => {
      if (sc < 1 || !d.pot) return '패찰. 보증금을 돌려받고 법정을 나왔다. 다음 물건을 찾아본다.' + reward(x, { stats: { int: 1 } });
      const price = d.pot;
      x.p.cash -= price;
      addAsset(x.s, 'apt_local', x.p.id, 40000, '경매로 산 아파트');
      return `🏠 낙찰! ${formatMoney(price)}에 시세 4억 아파트를 손에 넣었다. (시세 차익 ${formatMoney(40000 - price)})` + reward(x, { hap: 12, stats: { int: 2 }, title: `경매 낙찰: ${fullName(x.p)}`, icon: '🏠', rarity: 'rare' });
    },
  },
  {
    id: 'propose', title: '💍 프러포즈 대작전', icon: '💍', meter: '설렘', goal: 5,
    ok: (s, p) => A(s, p) >= 22 && A(s, p) <= 45 && !!p.partnerId && !p.spouseId && !!partnerOf(s, p),
    bonus: (_s, p) => (hasTrait(p, 'flirt') ? 8 : 0) + (hasTalent(p, 'pitch') ? 4 : 0),
    rounds: [
      { title: '장소', text: '반지는 준비됐다. 이제 어디서?', opts: [
        { label: '처음 만난 그 카페', stat: 'mor', need: 50, win: 2, lose: 0, wt: '"여기… 우리 처음 만난 데잖아." 눈치챘다.', lt: '공사 중이었다.' },
        { label: '바닷가 노을', stat: 'luck', need: 60, win: 3, lose: -1, wt: '하늘이 도왔다. 완벽한 노을.', lt: '비가 쏟아졌다.' },
      ] },
      { title: '선물', text: '무엇을 함께 건넬까?', opts: [
        { label: '직접 쓴 편지', stat: 'int', need: 50, win: 2, lose: 0, wt: '읽다가 눈물이 툭 떨어졌다.', lt: '맞춤법이…' },
        { label: '둘의 사진으로 만든 영상', stat: 'cha', need: 58, win: 2, lose: 0, wt: '첫 데이트 사진이 나오자 웃음이 터졌다.', lt: '노트북이 꺼졌다.' },
      ] },
      { title: '한마디', text: '무릎을 꿇었다. 손이 떨린다.', opts: [
        { label: '"평생 네 편이 될게."', stat: 'cha', need: 55, win: 2, lose: -1, wt: '"…응!"', lt: '목소리가 갈라졌다.' },
        { label: '말없이 노래를 부른다', stat: 'cha', need: 62, win: 3, lose: -1, wt: '주변 사람들까지 박수를 쳤다!', lt: '음이 흔들렸다.' },
      ] },
    ],
    end: (x, sc) => {
      const q = partnerOf(x.s, x.p);
      if (sc >= 4 && q) {
        queueNext(x.s, 'wedding', x.p.id);
        return `💍 "응!" ${fullName(q)}이(가) 울면서 반지를 받았다. 지나가던 사람들이 박수를 쳤다. 이제 결혼 준비다!` + reward(x, { hap: 25, stats: { cha: 2 }, title: `프러포즈 성공: ${fullName(x.p)}`, icon: '💍', rarity: 'rare' });
      }
      return '"…조금만 더 생각해 볼게." 반지 상자가 다시 주머니로 들어갔다.' + reward(x, { hap: -8 });
    },
  },
  {
    id: 'fishing', title: '🎣 대물 낚시 대회', icon: '🎣', meter: '손맛', goal: 4, again: 8,
    ok: (s, p) => A(s, p) >= 35 && A(s, p) <= 85,
    rounds: [
      { title: '입질', text: '새벽 5시, 갯바위 낚시 대회. 찌가 까딱인다.', opts: [
        { label: '기다린다', stat: 'luck', need: 60, win: 1, lose: 0, wt: '찌가 쑥 들어갔다!', lt: '잔챙이였다.' },
        { label: '미끼를 바꾼다', stat: 'int', need: 52, win: 2, lose: -1, wt: '바꾸자마자 큰 입질!', lt: '그사이 물때가 지났다.' },
      ] },
      { title: '대물이 걸렸다!', text: '낚싯대가 활처럼 휘었다. 줄이 비명을 지른다.', opts: [
        { label: '힘으로 감는다', stat: 'str', need: 58, win: 2, lose: -2, wt: '조금씩 끌려온다!', lt: '줄이 터졌다…' },
        { label: '풀었다 감았다 힘을 뺀다', stat: 'luck', need: 55, win: 1, lose: 0, wt: '녀석이 지쳐 간다.', lt: '바위 틈으로 숨었다.' },
      ] },
      { title: '뜰채', text: '수면 위로 은빛 등이 보였다. 엄청 크다!', opts: [
        { label: '옆 사람에게 뜰채를 부탁', stat: 'cha', need: 48, win: 1, lose: 0, wt: '둘이 함께 들어 올렸다!', lt: '뜰채가 짧았다.' },
        { label: '직접 뜬다', stat: 'str', need: 60, win: 2, lose: -2, wt: '한 번에 떠올렸다!', lt: '마지막에 바늘이 빠졌다.' },
      ] },
    ],
    end: (x, sc) => {
      const cm = 40 + Math.max(0, sc) * 9;
      if (sc >= 4) return `🐟 감성돔 ${cm}cm! 대회 1위. 어탁을 떠서 거실에 걸었다.` + reward(x, { cash: 300, fame: 1, hap: 15, stats: { hp: 1 }, title: `대물 낚시 우승: ${fullName(x.p)}`, icon: '🎣', rarity: 'rare' });
      if (sc >= 1) return `🐟 ${cm}cm. 입상은 못 했지만 저녁상이 풍성했다.` + reward(x, { hap: 6 });
      return '빈 쿨러로 돌아왔다. 그래도 일출이 예뻤다.' + reward(x, { hap: 2 });
    },
  },
  {
    id: 'suneung', title: '📝 수능 날', icon: '📝', meter: '컨디션', goal: 5,
    ok: (s, p) => A(s, p) === 18 && !p.flags.includes('student') && !p.flags.some((f) => f.startsWith('satday:')) && !p.job.startsWith('hj_') && ['none'].includes(p.job),
    bonus: (_s, p) => (hasTalent(p, 'genius') ? 8 : 0) + (hasTrait(p, 'anxious') ? -8 : hasTrait(p, 'cheerful') ? 4 : 0),
    rounds: [
      { title: '1교시 국어', text: '수험표를 쥔 손이 차갑다. 시험지가 넘어가는 소리.', opts: [
        { label: '비문학부터 푼다', stat: 'int', need: 55, win: 2, lose: -1, wt: '시간이 넉넉하게 남았다.', lt: '지문 하나에 15분을 썼다.' },
        { label: '문학부터 차근차근', stat: 'mor', need: 52, win: 1, lose: 0, wt: '안정적으로 풀었다.', lt: '마지막 지문은 찍었다.' },
      ] },
      { title: '2교시 수학', text: '킬러 문항 하나가 길을 막는다.', opts: [
        { label: '킬러는 버리고 검토', stat: 'int', need: 52, win: 2, lose: 0, wt: '실수 없이 마무리했다.', lt: '검토하다 답을 바꿨다…' },
        { label: '킬러에 도전', stat: 'int', need: 68, win: 3, lose: -2, wt: '풀었다!! 손이 떨렸다.', lt: '20분을 날렸다.' },
      ] },
      { title: '3교시 영어 · 점심 뒤', text: '도시락을 먹고 나니 졸음이 몰려온다.', opts: [
        { label: '찬물로 세수하고 집중', stat: 'hp', need: 50, win: 2, lose: -1, wt: '정신이 번쩍 들었다.', lt: '듣기 한 문제를 놓쳤다.' },
        { label: '빈칸 추론 먼저', stat: 'int', need: 58, win: 2, lose: -1, wt: '어려운 것부터 해치웠다.', lt: '시간에 쫓겼다.' },
      ] },
    ],
    end: (x, sc) => {
      const b = clamp(Math.round(sc * 1.2), -6, 7);
      x.p.flags.push('satday:' + b);
      const tail = `\n📝 수능 점수에 ${b >= 0 ? '+' : ''}${b} 반영`;
      if (sc >= 5) return '🍀 컨디션 최고! 시험장을 나서며 엄마를 꼭 안았다.' + tail + reward(x, { hap: 12, stats: { int: 2 }, mark: 'study' });
      if (sc >= 2) return '📝 무난하게 끝냈다. 결과는 하늘에 맡긴다.' + tail + reward(x, { hap: 4 });
      return '😣 망한 것 같다… 교문 앞에서 엉엉 울었다.' + tail + reward(x, { hap: -10 });
    },
  },
  {
    id: 'pitch', title: '💡 창업 경진대회 결선', icon: '💡', meter: '투자 의향', goal: 6, again: 10,
    ok: (s, p) => s.year >= 2000 && A(s, p) >= 22 && A(s, p) <= 60 && (working(p, ['founder', 'startup_emp', 'developer', 'ai_engineer', 'game_dev', 'data_scientist', 'ux_designer', 'sme_ceo']) || hasTalent(p, 'merchant') || (p.actual.int >= 66 && p.actual.cha >= 55)),
    bonus: (_s, p) => (hasTalent(p, 'merchant') ? 8 : 0) + (hasTalent(p, 'orator') ? 6 : 0),
    rounds: [
      { title: '서류 · 한 줄 소개', text: '지원 팀 1,200곳. {n}의 사업을 한 줄로 설명해야 한다.', opts: [
        { label: '숫자로 말한다 (지능)', stat: 'int', need: 58, win: 2, lose: -1, wt: '"월 사용자 30% 성장." 심사위원이 펜을 들었다.', lt: '숫자가 너무 작았다.' },
        { label: '불편함에서 시작한 이야기', stat: 'cha', need: 55, win: 2, lose: 0, wt: '"나도 그거 불편했어." 공감을 샀다.', lt: '흔한 이야기로 들렸다.' },
      ] },
      { title: '본선 · 5분 발표', text: '무대 위 타이머가 5:00에서 줄어든다. 슬라이드가 갑자기 멈췄다!', opts: [
        { label: '슬라이드 없이 말로 이어 간다', stat: 'cha', need: 62, win: 3, lose: -2, wt: '오히려 눈을 마주치며 말하니 객석이 빨려 들어왔다.', lt: '말이 꼬였다. 5분이 50분 같았다.' },
        { label: '침착하게 재부팅을 기다린다', stat: 'luck', need: 55, win: 1, lose: -1, wt: '30초 만에 돌아왔다. "잠깐 쉬어 가는 타임이었습니다." 웃음이 터졌다.', lt: '결국 시간이 모자랐다.' },
      ] },
      { title: '결선 · 질의응답', text: '심사위원: "대기업이 똑같은 걸 만들면요?"', opts: [
        { label: '"우리만 가진 데이터가 있습니다"', stat: 'int', need: 64, win: 2, lose: -1, wt: '심사위원이 처음으로 고개를 끄덕였다.', lt: '"그 데이터, 사실 누구나 모을 수 있죠?"' },
        { label: '"그럼 저희를 인수하시겠죠"', stat: 'cha', need: 60, win: 2, lose: -2, wt: '객석이 웃었고, 심사위원도 웃었다.', lt: '농담이 통하지 않았다.' },
        { label: '"솔직히 그게 제일 무섭습니다"', stat: 'mor', need: 55, win: 1, lose: 0, wt: '정직한 답에 신뢰 점수가 올랐다.', lt: '자신감이 없어 보였다.' },
      ] },
    ],
    end: (x, sc) => {
      if (sc >= 6) return '🏆 대상! 시드 투자 제안이 세 군데서 들어왔다.' + reward(x, { cash: 5000, fame: 3, hap: 18, stats: { int: 2, cha: 2 }, mark: 'risk', promo: true, title: `창업 경진대회 대상: ${fullName(x.p)}`, icon: '💡', rarity: 'epic' });
      if (sc >= 3) return '🥈 우수상. 명함이 한 뭉치 생겼다.' + reward(x, { cash: 1000, fame: 1, hap: 7, stats: { cha: 1 } });
      return '본선 탈락. 피드백 노트를 들고 사무실로 돌아왔다.' + reward(x, { hap: -4, stats: { int: 1 } });
    },
  },
  {
    id: 'esports', title: '🎮 e스포츠 결승', icon: '🎮', meter: '세트 스코어', goal: 3,
    ok: (s, p) => s.year >= 2002 && A(s, p) >= 16 && A(s, p) <= 27 && (working(p, ['gamer', 'streamer', 'game_dev']) || (p.actual.int >= 60 && hasTalent(p, 'strategist'))),
    bonus: (_s, p) => (p.job === 'gamer' ? 10 : 0) + (hasTalent(p, 'strategist') ? 6 : 0),
    rounds: [
      { title: '1세트', text: '관중 1만 명, 동시 시청자 300만. 헤드셋을 쓰니 함성이 멀어진다.', opts: [
        { label: '연습한 전략대로', stat: 'int', need: 56, win: 1, lose: -1, wt: '교과서 같은 운영. 1세트 승!', lt: '상대가 우리 전략을 읽고 있었다.' },
        { label: '초반 기습', stat: 'luck', need: 50, win: 1, lose: -1, wt: '기습 성공! 해설진이 소리를 질렀다.', lt: '기습이 막혔다.' },
      ] },
      { title: '2세트', text: '상대가 밴 카드를 바꿨다. 우리 주력이 막혔다.', opts: [
        { label: '비장의 픽을 꺼낸다', stat: 'int', need: 64, win: 1, lose: -1, wt: '"저걸 꺼내요?!" 아무도 대비하지 못했다.', lt: '숙련도가 아직 부족했다.' },
        { label: '팀원을 믿고 서포트한다', stat: 'cha', need: 55, win: 1, lose: -1, wt: '팀원이 캐리했다. 세트 승!', lt: '호흡이 한 박자 어긋났다.' },
      ] },
      { title: '마지막 세트', text: '세트 스코어가 엎치락뒤치락. 마지막 한타가 승부를 가른다.', opts: [
        { label: '이니시를 건다', stat: 'str', need: 58, win: 2, lose: -1, wt: '손이 먼저 움직였다. 전설의 한타!', lt: '반 박자 빨랐다.' },
        { label: '침착하게 기다린다', stat: 'mor', need: 55, win: 1, lose: -1, wt: '상대가 먼저 무너졌다.', lt: '기다리다 진영이 갈렸다.' },
      ] },
    ],
    end: (x, sc) => {
      if (sc >= 3) {
        if (['none', 'parttime'].includes(x.p.job) && !x.p.flags.includes('student') && A(x.s, x.p) >= 18) (x.p.job = 'gamer'), (x.p.jobLevel = 1), (x.p.jobYears = 0);
        return '🏆 우승! 트로피를 들어 올리자 꽃가루가 쏟아졌다.' + reward(x, { cash: 4000, fame: 4, hap: 22, stats: { int: 2 }, title: `e스포츠 우승: ${fullName(x.p)}`, icon: '🎮', rarity: 'epic' });
      }
      if (sc >= 1) return '🥈 준우승. 경기가 끝나고 한참을 자리에서 못 일어났다.' + reward(x, { cash: 800, fame: 1, hap: 4 });
      return '완패. 그래도 결승 무대는 아무나 서는 곳이 아니다.' + reward(x, { hap: -6 });
    },
  },
  {
    id: 'concours', title: '🎻 국제 음악 콩쿠르', icon: '🎻', meter: '심사 점수', goal: 6,
    ok: (s, p) => A(s, p) >= 13 && A(s, p) <= 30 && (working(p, ['musician', 'singer']) || hasTalent(p, 'pitch') || (hasTalent(p, 'artist') && p.actual.cha >= 55)),
    bonus: (_s, p) => (hasTalent(p, 'pitch') ? 12 : 0) + (hasTrait(p, 'diligent') ? 5 : 0),
    rounds: [
      { title: '1차 · 지정곡', text: '바르샤바의 작은 홀. 심사위원 열두 명이 악보를 펼쳤다.', opts: [
        { label: '악보에 충실하게', stat: 'int', need: 55, win: 2, lose: 0, wt: '흠잡을 데 없는 연주. 2차 진출!', lt: '정확했지만 밋밋했다.' },
        { label: '나만의 해석으로', stat: 'cha', need: 62, win: 3, lose: -2, wt: '한 심사위원이 연필을 내려놓고 들었다.', lt: '"작곡가의 의도와 다르다"는 평.' },
      ] },
      { title: '2차 · 자유곡', text: '연주 도중 줄이 하나 끊어졌다!', opts: [
        { label: '그대로 끝까지 간다', stat: 'str', need: 58, win: 3, lose: -1, wt: '남은 줄로 끝까지 해냈다. 기립 박수!', lt: '음이 흔들렸다.' },
        { label: '양해를 구하고 다시 시작', stat: 'mor', need: 52, win: 1, lose: 0, wt: '침착한 태도가 오히려 점수를 얻었다.', lt: '흐름이 끊겼다.' },
      ] },
      { title: '결선 · 오케스트라 협연', text: '오케스트라가 숨을 고른다. 지휘자가 {n}에게 눈짓했다.', opts: [
        { label: '오케스트라와 대화하듯', stat: 'cha', need: 62, win: 2, lose: -1, wt: '협연이 아니라 하나의 음악이었다.', lt: '템포가 자꾸 어긋났다.' },
        { label: '압도적인 기교로', stat: 'int', need: 66, win: 3, lose: -1, wt: '카덴차에서 객석이 숨을 멈췄다.', lt: '빠른 패시지에서 미스가 났다.' },
      ] },
    ],
    end: (x, sc) => {
      if (sc >= 6) return '🏆 1위! 고국의 뉴스 첫머리에 이름이 나왔다.' + reward(x, { cash: 4000, fame: 5, hap: 22, stats: { cha: 4 }, flag: 'concours_win', title: `국제 콩쿠르 1위: ${fullName(x.p)}`, icon: '🎻', rarity: 'epic' });
      if (sc >= 3) return '🥉 입상. 유럽 공연 기획사에서 연락이 왔다.' + reward(x, { cash: 800, fame: 2, hap: 8, stats: { cha: 2 } });
      return '본선 탈락. 귀국 비행기에서 이어폰으로 우승자의 연주를 들었다.' + reward(x, { hap: -6, stats: { int: 1 } });
    },
  },
  {
    id: 'soccer', title: '⚽ 동네 조기축구 결승', icon: '⚽', meter: '골', goal: 3, again: 6,
    ok: (s, p) => A(s, p) >= 28 && A(s, p) <= 62 && p.actual.hp >= 45 && (p.actual.str >= 52 || hasTalent(p, 'athlete')),
    bonus: (_s, p) => (hasTalent(p, 'athlete') ? 10 : 0) + (hasTalent(p, 'commander') ? 4 : 0),
    rounds: [
      { title: '전반전', text: '일요일 아침 7시, 구청장배 결승. 상대 팀엔 왕년의 실업 선수가 있다.', opts: [
        { label: '전방 압박', stat: 'str', need: 55, win: 1, lose: 0, wt: '공을 빼앗아 그대로 골! 1:0', lt: '숨이 턱까지 찼다.', hurt: 2 },
        { label: '수비부터 단단히', stat: 'int', need: 50, win: 0, lose: -1, wt: '0:0으로 버텼다.', lt: '한 골 먹었다.' },
      ] },
      { title: '후반전', text: '후반 30분. 다리에 쥐가 나기 시작했다.', opts: [
        { label: '중거리 슛', stat: 'luck', need: 45, win: 1, lose: 0, wt: '골대를 맞고 들어갔다!', lt: '공이 하늘로 날아갔다.' },
        { label: '후배에게 패스', stat: 'cha', need: 52, win: 1, lose: 0, wt: '정확한 패스, 후배의 골! 서로 얼싸안았다.', lt: '패스가 끊겼다.' },
      ] },
      { title: '승부차기', text: '동점. 마지막 키커가 {n}이다.', opts: [
        { label: '구석으로 강하게', stat: 'str', need: 55, win: 1, lose: -1, wt: '그물이 출렁였다!', lt: '골키퍼가 막았다…' },
        { label: '파넨카 칩슛', stat: 'luck', need: 50, win: 2, lose: -2, wt: '골키퍼가 넘어진 사이 공이 천천히 들어갔다. 전설이 됐다.', lt: '골키퍼가 가만히 서서 받았다.' },
      ] },
    ],
    end: (x, sc) => {
      if (sc >= 3) return '🏆 우승! 막걸리 잔에 트로피를 부어 돌려 마셨다.' + reward(x, { cash: 50, hap: 15, stats: { str: 1, hp: 1 }, title: `조기축구 우승: ${fullName(x.p)}`, icon: '⚽', rarity: 'rare' });
      if (sc >= 1) return '아쉬운 준우승. 해장국집에서 "내년엔 꼭" 다짐했다.' + reward(x, { hap: 6, stats: { hp: 1 } });
      return '완패. 다음 날 온몸이 쑤셨다.' + reward(x, { hap: 1 });
    },
  },
  {
    id: 'goldenbell', title: '🔔 도전! 골든벨', icon: '🔔', meter: '맞힌 문제', goal: 5,
    ok: (s, p) => s.year >= 1999 && A(s, p) >= 16 && A(s, p) <= 18 && p.actual.int >= 55,
    bonus: (_s, p) => (hasTalent(p, 'genius') ? 10 : 0) + (hasTalent(p, 'scholar') ? 6 : 0),
    rounds: [
      { title: '10번 문제', text: '전교생 100명이 강당 바닥에 앉았다. 화이트보드와 마커 하나씩.', opts: [
        { label: '자신 있게 쓴다', stat: 'int', need: 50, win: 1, lose: -5, wt: '정답! 아직 70명이 남았다.', lt: '탈락… 친구들이 등을 두드려 줬다.' },
      ] },
      { title: '30번 문제', text: '남은 사람 열 명. 카메라가 {n}의 얼굴을 잡는다.', opts: [
        { label: '정답을 쓴다', stat: 'int', need: 60, win: 2, lose: -5, wt: '정답! 반 친구들이 소리를 질렀다.', lt: '아깝게 틀렸다.' },
        { label: '옆 친구 보드를 슬쩍…', stat: 'luck', need: 10, win: 0, lose: -5, wt: '', lt: '"부정행위!" 녹화가 잠시 멈췄다. 얼굴이 화끈거렸다.', show: (_s, p) => p.actual.mor < 45 },
      ] },
      { title: '50번 · 골든벨 문제', text: '혼자 남았다. 패자부활전으로 돌아온 친구들이 뒤에서 응원한다.', opts: [
        { label: '떨리는 손으로 쓴다', stat: 'int', need: 72, win: 2, lose: -5, wt: '🔔 땡~! 골든벨이 울렸다!', lt: '"아…" 강당이 탄식으로 가득 찼다.' },
      ] },
    ],
    end: (x, sc) => {
      if (sc >= 5) return '🔔 골든벨을 울렸다! 학교 정문에 현수막이 걸렸다.' + reward(x, { cash: 300, fame: 2, hap: 20, stats: { int: 2 }, mark: 'study', flag: 'goldenbell', title: `골든벨: ${fullName(x.p)}`, icon: '🔔', rarity: 'epic' });
      if (sc >= 1) return '최후의 몇 명까지 남았다. 방송에 얼굴이 꽤 오래 나왔다.' + reward(x, { hap: 6, stats: { int: 1 } });
      return '초반 탈락. 그래도 방송 끝 단체 인사에는 나왔다.' + reward(x, { hap: 1 });
    },
  },
];
export const BIG_BY_ID: Record<string, BigDef> = Object.fromEntries(BIGS.map((b) => [b.id, b]));

/** 이 선택지의 성공 확률 */
export function bigOdds(s: GameState, p: Person, b: BigDef, o: BigOpt): number | undefined {
  if (o.stop || o.stake || !o.stat) return undefined;
  const bonus = (b.bonus?.(s, p) ?? 0) + (o.bonus?.(s, p) ?? 0);
  if (o.stat === 'luck') return clamp((o.need ?? 50) / 100 + bonus / 100, 0.05, 0.95);
  return checkOdds(p.actual[o.stat] + bonus, o.need ?? 50, 8);
}

/** 가주·자녀·손주 */
function folks(s: GameState): Person[] {
  const h = head(s);
  return Object.values(s.people).filter((p) => alive(p) && !p.inLaw && (p.id === h.id || isDescendantOf(s, p, h)) && A(s, p) >= 10);
}

/** 해마다: 해당되는 사람이 있으면 가끔 대형 이벤트 (한 해 걸러 한 번이 최대) */
export function bigYear(s: GameState): void {
  const seen = (s.storySeen ??= {});
  if (s.year - (seen['big:last'] ?? -99) < 2) return;
  if (s.events.some((e) => e.defId === 'big_ev')) return;
  const pairs: [Person, BigDef][] = [];
  for (const p of folks(s))
    for (const b of BIGS) {
      const last = seen[`big:${b.id}:${p.id}`];
      if (last !== undefined && (!b.again || s.year - last < b.again)) continue;
      if (b.ok(s, p)) pairs.push([p, b]);
    }
  if (!pairs.length) return;
  // 가족(가주·자녀·손주, 10세 이상) 1명당 약 11% (5명이면 55%) · 연속으로는 안 온다 → 5명 가족 기준 약 3년에 한 번
  if (!chance(s, Math.min(0.6, 0.11 * folks(s).length))) return;
  // 수능은 그 해에만 오니 먼저
  const sat = pairs.find(([, b]) => b.id === 'suneung');
  const [p, b] = sat ?? pick(s, pairs);
  seen['big:last'] = s.year;
  seen[`big:${b.id}:${p.id}`] = s.year;
  s.events.push({ uid: s.eventSeq++, defId: 'big_ev', personId: p.id, data: { id: b.id, r: 0, sc: 0 } satisfies BigData });
}

const big: EventDef = {
  id: 'big_ev',
  title: (c) => {
    const b = BIG_BY_ID[c.ev.data.id];
    const r = b.rounds[Math.min(c.ev.data.r, b.rounds.length - 1)];
    return `${b.title} · ${r.title}`;
  },
  valid: (c) => alive(c.p) && !!BIG_BY_ID[c.ev.data.id],
  text: (c) => fill(BIG_BY_ID[c.ev.data.id].rounds[c.ev.data.r].text, c.p),
  choices: (c) => {
    const d = c.ev.data as BigData;
    const b = BIG_BY_ID[d.id];
    const round = b.rounds[d.r];
    return gate(
      c.s,
      round.opts
        .filter((o) => !o.show || o.show(c.s, c.p))
        .map((o): Choice => ({
          label: o.label,
          run: (x) => {
            const dd = x.ev.data as BigData;
            let line = o.wt;
            if (o.stake) dd.stake = true;
            if (o.stat) {
              const ok = chance(x.s, bigOdds(x.s, x.p, b, o)!);
              dd.sc += ok ? (o.win ?? 1) : (o.lose ?? 0);
              line = ok ? `✅ ${o.wt}` : `❌ ${o.lt ?? '실패했다.'}`;
              if (ok && o.pot) dd.pot = o.pot;
              if (!ok && o.hurt) x.p.actual.hp = clamp(x.p.actual.hp - o.hurt, 1, 100);
              // 퀴즈: 틀리면 그 자리에서 끝
              if (!ok && b.id === 'quiz') dd.sc = -1;
            }
            dd.last = line;
            dd.r += 1;
            const over = o.stop || dd.r >= b.rounds.length || (b.id === 'quiz' && dd.sc < 0) || (b.id === 'auction' && dd.sc < 1 && dd.r >= 1);
            if (!over) return { text: '', keep: true };
            return `${line}\n\n${b.end(x, dd.sc, dd)}`;
          },
        })),
    );
  },
};

export const BIG_EVENTS: EventDef[] = [big];
