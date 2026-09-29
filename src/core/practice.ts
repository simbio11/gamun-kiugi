// 연습·노력의 결과는 매번 다르다: 컨디션·재능·성격·나이·잠재력 여유에 따라
// 대박(great) / 보람(good) / 제자리(meh) / 역효과(bad)가 갈리고, 오르는 능력치도 들쭉날쭉하다.
import { STAT_NAMES } from './data';
import { int, next, pick } from './rng';
import { age, clamp, hasTalent, hasTrait } from './people';
import type { GameState, Person, StatKey } from './types';
import { ADULT_OPEN, KID_OPEN, SEASON, TEEN_OPEN, TIER_TAIL, TRAIT_TAIL } from './action-lines';

export type Tier = 'great' | 'good' | 'meh' | 'bad';

export interface RollOpts {
  talent?: string;
  /** 이 능력치가 높을수록 요령이 붙는다 */
  stat?: StatKey;
  bonus?: number;
}

/** 오늘의 결과 등급 */
export function rollTier(s: GameState, p: Person, o: RollOpts = {}): Tier {
  let luck = next(s);
  if (o.talent && hasTalent(p, o.talent)) luck += 0.1;
  if (hasTrait(p, 'diligent')) luck += 0.06;
  if (hasTrait(p, 'lazy')) luck -= 0.08;
  luck += (p.happiness - 50) / 600; // 기분이 좋으면 잘 된다
  if (o.stat) luck += (p.actual[o.stat] - 50) / 800;
  luck += o.bonus ?? 0;
  if (luck > 0.88) return 'great';
  if (luck > 0.35) return 'good';
  if (luck > 0.08) return 'meh';
  return 'bad';
}

const RANGE: Record<Tier, [number, number]> = { great: [2, 4], good: [1, 3], meh: [0, 1], bad: [0, 0] };

/** 확률적 반올림: 1.4면 60%는 1, 40%는 2 */
const sround = (s: GameState, v: number) => Math.floor(v) + (next(s) < v - Math.floor(v) ? 1 : 0);

/**
 * 능력치 성장. 잠재력에 가까울수록 잘 안 오르고, 어릴수록 쑥쑥 큰다.
 * 실제로 오른 만큼을 돌려준다.
 */
export function grow(s: GameState, p: Person, stat: StatKey, tier: Tier, scale = 1): number {
  const cap = Math.max(p.potential[stat], p.actual[stat]);
  const room = clamp((cap - p.actual[stat]) / 20, 0.15, 1);
  const a = age(s, p);
  const youth = a < 13 ? 1.15 : a < 20 ? 1.05 : a > 55 ? 0.6 : 1;
  const raw = int(s, ...RANGE[tier]) * scale * room * youth;
  const d = Math.max(0, sround(s, raw));
  const before = p.actual[stat];
  p.actual[stat] = clamp(before + d, 0, stat === 'mor' || stat === 'cha' ? 100 : cap);
  return p.actual[stat] - before;
}

/** 행복·관계처럼 범위가 정해진 값 흔들기 */
export function jitter(s: GameState, base: number, spread = 0.4): number {
  return Math.round(base * (1 - spread + next(s) * spread * 2));
}

/** [이름, 변화량] 또는 그대로 보여줄 문구 */
export type Delta = [string, number] | string;
export const stat = (k: StatKey, v: number): Delta => [STAT_NAMES[k], v];

/** "(매력 +2 · 행복 +6)" 꼴. 전부 0이면 "(별 변화 없음)" */
export function fmt(ds: Delta[]): string {
  const shown = ds.flatMap((d) => (typeof d === 'string' ? [d] : Math.round(d[1]) !== 0 ? [`${d[0]} ${d[1] > 0 ? '+' : ''}${Math.round(d[1])}`] : []));
  return shown.length ? ` (${shown.join(' · ')})` : ' (별 변화 없음)';
}

/** 나이대별 대사: [최소, 최대, 문장] 또는 그냥 문장 */
export type Line = string | [number, number, string];
export type Pool = Record<Tier, Line[]>;

export function say(s: GameState, p: Person, pool: Pool, tier: Tier): string {
  const a = age(s, p);
  const ok = pool[tier].filter((l) => typeof l === 'string' || (a >= l[0] && a <= l[1]));
  const l = pick(s, ok.length ? ok : pool[tier]);
  let line = typeof l === 'string' ? l : l[2];
  // 머리말: 계절이나 상황 (따옴표·이름으로 시작하는 문장엔 붙이지 않는다)
  if (!/^["{'“]/.test(line) && next(s) < 0.4) {
    const open = next(s) < 0.55 ? pick(s, SEASON) : pick(s, a < 13 ? KID_OPEN : a < 20 ? TEEN_OPEN : ADULT_OPEN);
    line = `${open} ${line}`;
  }
  // 꼬리말: 성격이 묻어나거나, 그날의 여운
  const traits = (p.traits ?? []).filter((t) => TRAIT_TAIL[t]);
  const r = next(s);
  if (traits.length && r < 0.3) line += ' ' + pick(s, TRAIT_TAIL[pick(s, traits)]);
  else if (r < 0.55) line += ' ' + pick(s, TIER_TAIL[tier]);
  return line;
}

export const TIER_MARK: Record<Tier, string> = { great: '🌟 ', good: '', meh: '', bad: '💦 ' };
