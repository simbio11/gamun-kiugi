import { eraMortality, lifeTechMult } from './medical';
import { chance } from './rng';
import { STAT_KEYS, TALENTS } from './data';
import { age, alive, clamp, discoverTalent, fullName, hasFlag, hasTrait, head, isDescendantOf } from './people';
import { deathMult } from './marks';
import type { Focus, GameState, Person, StatKey, Stats } from './types';

/** 나이별 성장 효율 */
function ageEff(k: StatKey, a: number): number {
  switch (k) {
    case 'str':
      return a < 10 ? 0.6 : a <= 25 ? 1.2 : a <= 40 ? 0.5 : 0.15;
    case 'int':
      return a <= 20 ? 1.2 : a <= 35 ? 0.6 : 0.25;
    case 'cha':
      return a >= 12 && a <= 25 ? 1.2 : 0.6;
    case 'mor':
      return 0.8;
    case 'hp':
      return a < 25 ? 1 : 0.4;
  }
}

const BUDGET_POINTS = [1, 3, 6, 9];
const FOCUS_STAT: Record<Focus, StatKey | null> = { study: 'int', sport: 'str', art: 'cha', character: 'mor', free: null };

/** 학교·진로 플래그가 주는 연간 추가 성장 (미성년 기간) */
const FLAG_GROWTH: Record<string, Partial<Stats>> = {
  kinder_eng: { int: 1 },
  kinder_church: { cha: 1 },
  elem_private: { int: 1.5, cha: 0.5 },
  elem_intl: { int: 1.5, cha: 1.5 },
  elem_alt: { mor: 1.5, cha: 0.5 },
  gifted: { int: 2.5 },
  sports_team: { str: 2.5, hp: 1 },
  trainee: { cha: 2.5 },
  mid_intl: { int: 2, cha: 1 },
  mid_sport: { str: 3, hp: 1 },
  mid_art: { cha: 3 },
  high_elite: { int: 3 },
  high_sport: { str: 3, hp: 1 },
  high_art: { cha: 3 },
  passion: {},
};

export function growthYear(s: GameState): string[] {
  const msgs: string[] = [];
  const h = head(s);
  for (const p of Object.values(s.people)) {
    if (!alive(p)) continue;
    const a = age(s, p);
    const pts: Stats = { str: 0, int: 0, cha: 0, mor: 0, hp: 0 };

    if (a < 20) {
      // 기본 성장 (학교·또래)
      for (const k of STAT_KEYS) pts[k] += 1.5;
      const mainline = isDescendantOf(s, p, h);
      const pol = mainline ? s.policy.children[p.id] ?? { budget: 1, focus: 'free' } : { budget: 1 as const, focus: 'free' as Focus };
      const budget = BUDGET_POINTS[pol.budget];
      const fs = FOCUS_STAT[pol.focus];
      if (fs) {
        pts[fs] += budget * 0.7;
        for (const k of STAT_KEYS) if (k !== fs) pts[k] += budget * 0.075;
      } else {
        for (const k of STAT_KEYS) pts[k] += budget * 0.2;
        p.happiness = clamp(p.happiness + 3, 0, 100);
      }
      if (pol.budget === 3) p.happiness = clamp(p.happiness - 4, 0, 100);
      for (const f of p.flags) {
        const g = FLAG_GROWTH[f];
        if (g) for (const k of Object.keys(g) as StatKey[]) pts[k] += g[k]!;
      }
      // 투자한 분야에서 숨은 재능이 드러남
      if (a >= 6 && fs) {
        for (const t of p.talents) {
          if (!t.discovered && TALENTS[t.id].stat === fs && chance(s, 0.1)) {
            discoverTalent(p, t.id);
            msgs.push(`✨ ${fullName(p)}에게서 [${TALENTS[t.id].name}] 재능을 발견했다!`);
          }
        }
      }
    } else if (p.id === h.id) {
      const ls = s.policy.lifestyle;
      if (ls === 'self') {
        pts.int += 2;
        pts.cha += 2;
        pts.mor += 1;
      } else if (ls === 'work') {
        pts.hp -= 2;
        pts.int += 0.5;
      } else if (ls === 'rest') pts.hp += 4;
      else if (ls === 'family') pts.mor += 1.5;
    } else if (hasFlag(p, 'student')) {
      pts.int += 2;
    }

    const passion = hasFlag(p, 'passion') ? 1.25 : 1;
    for (const k of STAT_KEYS) {
      if (pts[k] <= 0) {
        p.actual[k] += pts[k];
        continue;
      }
      const tal = p.talents.reduce((m, t) => (TALENTS[t.id].stat === k ? m * TALENTS[t.id].mult : m), 1);
      const room = Math.max(0, 1 - p.actual[k] / p.potential[k]);
      p.actual[k] += pts[k] * 1.6 * ageEff(k, a) * tal * passion * room;
    }

    // 노화
    if (a > 40) p.actual.hp -= (a > 75 ? 2 : a > 60 ? 1.1 : 0.5) * (hasTrait(p, 'tough') ? 0.6 : hasTrait(p, 'frail') ? 1.4 : 1);
    if (a > 45) p.actual.str -= 0.8;
    if (a > 55) p.actual.cha -= 0.5;
    if (a > 70) p.actual.int -= 0.5;
    for (const k of STAT_KEYS) p.actual[k] = clamp(Math.round(p.actual[k] * 10) / 10, 0, 100);
  }
  return msgs;
}

/**
 * 사망 확률: 나이 곡선 × 건강 × 성별(기대수명 남 80.8·여 86.6) × 성격 × 유언 여부 + 암.
 * 유언장을 쓰면 마음이 놓여 기력이 쇠하고(×1.4), 안 쓰고 버티면 조금 더 산다(×0.85).
 */
export function deathChance(s: GameState, p: Person): number {
  if (p.flags.includes('kia_pending')) return 1; // 전사 통지 (war.ts)
  const a = age(s, p);
  const hpFactor = 1.3 - p.actual.hp / 100;
  let base = a < 5 ? 0.002 : a < 40 ? 0.0008 : 0.0006 * Math.exp(0.085 * (a - 30));
  base *= p.sex === 'M' ? 1.0 : 0.5;
  if (hasTrait(p, 'tough')) base *= 0.8;
  if (hasTrait(p, 'frail')) base *= 1.3;
  if (p.job === 'hj_vampire') base *= 0.25; // 슈퍼 히든: 불사의 몸 (죽음이 잘 오지 않는다)
  base *= deathMult(p);
  base *= eraMortality(s.year) * lifeTechMult(p); // 시대의 의료 수준 × 돈으로 산 미래 의료 (medical.ts)
  if (p.id === s.headId && a >= 60) base *= s.willWritten ? 1.4 : 0.85;
  let d = clamp(base * Math.max(0.3, hpFactor), 0, 0.6);
  // 암: 5년 생존율을 연간 위험으로
  const c = p.flags.find((f) => f.startsWith('cancer:'));
  if (c) {
    const [surv, year] = c.slice(7).split(':').map(Number);
    if (s.year - year < 5) d = 1 - (1 - d) * Math.pow(surv / 100, 1 / 5);
  }
  return clamp(d, 0, 0.9);
}
