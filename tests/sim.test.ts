import { describe, expect, it } from 'vitest';
import { currentEvent, familyTotal, migrate, newGame, resolveChoice, simulateYear } from '../src/core/sim';
import { agePenalty } from '../src/core/events';
import { inherit, createPerson } from '../src/core/people';
import { next } from '../src/core/rng';
import type { GameState } from '../src/core/types';

function autoplay(seed: number, years: number): GameState {
  const s = newGame({ seed, familyName: '김', sex: 'M', origin: 'middle' });
  for (let y = 0; y < years && !s.gameOver; y++) {
    let guard = 0;
    while (s.events.length && guard++ < 300) {
      const cur = currentEvent(s)!;
      const all = cur.choices.map((c, i) => [c, i] as const).filter(([c]) => !c.disabled);
      const fwd = all.filter(([c]) => !c.label.startsWith('←'));
      const enabled = fwd.length ? fwd : all;
      // 청혼은 적극적으로, 나머지는 무작위
      const propose = enabled.find(([c]) => c.label.includes('프러포즈') || c.label.includes('청혼'));
      const pickI = propose && next({ rng: seed + y } as any) < 0.8 ? propose[1] : enabled[Math.floor(next(s) * enabled.length)][1];
      resolveChoice(s, pickI);
    }
    expect(s.events.length).toBe(0);
    simulateYear(s);
  }
  return s;
}

describe('시뮬레이션', () => {
  it('유전: 자녀 잠재력은 부모 평균 근처', () => {
    const s = newGame({ seed: 1, familyName: '이', sex: 'F', origin: 'poor' });
    const a = createPerson(s, { surname: '이', birthYear: 1990, sex: 'M' });
    const b = createPerson(s, { surname: '박', birthYear: 1990, sex: 'F' });
    a.potential.int = 90;
    b.potential.int = 70;
    let sum = 0;
    for (let i = 0; i < 500; i++) sum += inherit(s, a, b, '이').potential.int;
    expect(sum / 500).toBeGreaterThan(76);
    expect(sum / 500).toBeLessThan(84);
  });

  it('200년 자동 플레이: 크래시 없음, NaN 없음, 세대 승계 발생', () => {
    let successions = 0;
    for (const seed of [11, 22, 33, 44, 55, 66, 77, 88]) {
      const s = autoplay(seed, 200);
      for (const p of Object.values(s.people)) {
        expect(Number.isFinite(p.cash)).toBe(true);
        for (const v of Object.values(p.actual)) expect(Number.isFinite(v)).toBe(true);
      }
      expect(Number.isFinite(familyTotal(s))).toBe(true);
      successions += s.generation - 1;
      if (s.achievements.includes('second_gen')) expect(s.generation).toBeGreaterThan(1);
    }
    expect(successions).toBeGreaterThan(8);
  });

  it('같은 시드는 같은 결과 (재현성)', () => {
    const a = autoplay(123, 60);
    const b = autoplay(123, 60);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('v0.1 세이브 마이그레이션', () => {
    const s = autoplay(9, 10) as any;
    s.version = 1;
    s.market = { apt_seoul: 1, apt_local: 1, land: 1 };
    delete s.marketChange;
    delete s.policy.taxAdvisor;
    for (const p of Object.values(s.people) as any[]) delete p.genes.face;
    const m = migrate(JSON.parse(JSON.stringify(s)));
    expect(m.version).toBe(3);
    expect(m.market.coin).toBe(100);
    for (const p of Object.values(m.people)) expect(p.genes.face).toBeTypeOf('number');
    for (let i = 0; i < 5; i++) {
      while (m.events.length) resolveChoice(m, currentEvent(m)!.choices.findIndex((c) => !c.disabled));
      simulateYear(m);
    }
    expect(Number.isFinite(familyTotal(m))).toBe(true);
  });

  it('혼인: 나이가 들수록 불리해진다', () => {
    expect(agePenalty(28)).toBe(0);
    expect(agePenalty(40)).toBeGreaterThan(agePenalty(35));
    expect(agePenalty(46)).toBeGreaterThan(agePenalty(40) + 10);
  });
});
