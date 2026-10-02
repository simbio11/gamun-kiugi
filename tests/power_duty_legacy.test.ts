import { describe, expect, it } from 'vitest';
import { currentEvent, newGame, resolveChoice, simulateYear } from '../src/core/sim';
import { head } from '../src/core/people';
import { ACTIONS, forHead } from '../src/core/actions';
import { minYears, promoReady, tryPromote } from '../src/core/rank';
import { canCoup } from '../src/core/power';
import { LEGACY_ITEMS, legacyEarn } from '../src/core/legacy';
import { BIGS, bigOdds } from '../src/core/big-events';
import { EVENTS } from '../src/core/registry';
import type { GameState } from '../src/core/types';

const drain = (s: GameState, pick = 0) => {
  let g = 0;
  while (s.events.length && g++ < 80) {
    const c = currentEvent(s);
    if (!c) break;
    const en = c.choices.map((x, i) => [x, i] as const).filter(([x]) => !x.disabled);
    resolveChoice(s, en[Math.min(pick, en.length - 1)][1]);
  }
};

describe('승진 연한 (rank.ts)', () => {
  it('9급 공무원은 승진 연한을 채우기 전엔 어떤 경로로도 오르지 않는다', () => {
    const s = newGame({ seed: 1, familyName: '김', sex: 'M' });
    const p = head(s);
    p.job = 'civil';
    p.jobLevel = 0;
    p.flags.push(`lv:0:${s.year}`);
    expect(tryPromote(s.year, p, 1)).toBe(false);
    s.year += minYears(0, 6, 'civil');
    expect(promoReady(s.year, p.birthYear, p)).toBe(true);
  });
  it('9급에서 3급까지 최소 연한 합이 25년 이상 (현실보다 빠르지만 비현실적이지 않게)', () => {
    let t = 0;
    for (let lv = 0; lv < 6; lv++) t += minYears(lv, 6, 'civil');
    expect(t).toBeGreaterThanOrEqual(25);
  });
  it('대법관·검찰총장·정보기관장은 해마다 저절로 오르지 않는다 (임명 이벤트로만)', () => {
    const s = newGame({ seed: 2, familyName: '김', sex: 'M' });
    const p = head(s);
    p.birthYear = s.year - 55;
    for (const [job, lv] of [['judge', 3], ['prosecutor', 4], ['agent', 4]] as const) {
      p.job = job;
      p.jobLevel = lv;
      p.flags = p.flags.filter((f) => !f.startsWith('lv:'));
      p.flags.push(`lv:${lv}:${s.year - 30}`);
      expect(promoReady(s.year, p.birthYear, p, 5)).toBe(false);
    }
  });
});

describe('권력의 길 (power.ts)', () => {
  it('근현대사: 사조직 장성은 1979년에 거사 기회를 얻고, 거사는 성공·실패로 끝까지 진행된다', () => {
    const s = newGame({ seed: 7, familyName: '김', sex: 'M', era: 'history' });
    drain(s);
    const p = head(s);
    s.year = 1978;
    p.birthYear = 1930;
    p.job = 'officer';
    p.jobLevel = 6;
    p.flags.push('hanahoe', 'keypost');
    for (const id of ['pw_seoul_mayor', 'pw_army_chief', 'pw_chief_of_staff', 'pw_yujeong', 'pw_kukbowi']) (s.storySeen ??= {})[p.id + ':' + id] = 1;
    expect(canCoup({ ...s, year: 1979 } as GameState, p)).toBe(true);
    let saw = false;
    for (let i = 0; i < 4 && !saw; i++) {
      simulateYear(s);
      saw = s.events.some((e) => e.defId === 'coup_chance');
      drain(s, 0);
    }
    expect(saw).toBe(true);
    expect(p.flags.includes('coup_leader') || p.flags.includes('coup_failed')).toBe(true);
  });
  it('현대 모드에선 쿠데타가 열리지 않는다', () => {
    const s = newGame({ seed: 8, familyName: '김', sex: 'M' });
    const p = head(s);
    p.birthYear = s.year - 50;
    p.job = 'officer';
    p.jobLevel = 7;
    p.flags.push('hanahoe', 'keypost');
    expect(canCoup(s, p)).toBe(false);
  });
  it('사법시험 합격 → 연수원 2년 → 판사·검사·변호사 갈림길', () => {
    const s = newGame({ seed: 9, familyName: '김', sex: 'F', era: 'history' });
    drain(s);
    const p = head(s);
    s.year = 1979;
    p.birthYear = 1955;
    p.actual.int = p.potential.int = 99;
    p.flags.push('prep:sashi', 'tries:0');
    s.events.push({ uid: 9999, defId: 'exam', personId: p.id });
    drain(s, 0);
    expect(p.flags).toContain('track:jtri');
    let saw = false;
    for (let i = 0; i < 3 && !saw; i++) {
      simulateYear(s);
      saw = s.events.some((e) => e.defId === 'law_path');
      drain(s, 0);
    }
    expect(saw).toBe(true);
    expect(['judge', 'prosecutor', 'lawyer']).toContain(p.job);
  });
  it('새 이벤트가 모두 등록돼 있다', () => {
    for (const id of ['law_path', 'judge_apply', 'ag_chief', 'hanahoe_invite', 'coup_chance', 'coup_run', 'coup_trial', 'truth_returns', 'nco_stay', 'allowance_end', 'allowance_spree', 'dm_bootcamp', 'dg_stay']) expect(EVENTS[id], id).toBeDefined();
  });
});

describe('복무·파견 (duty.ts)', () => {
  it('군 복무 중엔 복무 행동만 보이고, 군 이야기가 온다', () => {
    const s = newGame({ seed: 3, familyName: '김', sex: 'M' });
    drain(s);
    const p = head(s);
    p.birthYear = s.year - 20;
    p.flags.push('serving:' + (s.year + 2));
    const acts = ACTIONS.filter((a) => forHead(s, a));
    expect(acts.length).toBeGreaterThan(3);
    expect(acts.every((a) => a.cat === '복무')).toBe(true);
    simulateYear(s);
    expect(s.events.some((e) => e.defId.startsWith('dm_'))).toBe(true);
  });
});

describe('대형 이벤트 난이도', () => {
  it('보통 능력치(55)로 최선을 다하면 대부분의 승부를 20% 넘게 이긴다', () => {
    const s = newGame({ seed: 5, familyName: '김', sex: 'M' });
    const p = head(s);
    for (const k of Object.keys(p.actual) as (keyof typeof p.actual)[]) p.actual[k] = 55;
    let hard = 0;
    for (const b of BIGS) {
      const memo = new Map<string, number>();
      const f = (r: number, sc: number): number => {
        if (r >= b.rounds.length) return sc >= b.goal ? 1 : 0;
        const key = r + ':' + sc;
        if (memo.has(key)) return memo.get(key)!;
        let best = 0;
        for (const o of b.rounds[r].opts) {
          if (!o.stat) { best = Math.max(best, o.stop ? (sc >= b.goal ? 1 : 0) : f(r + 1, sc)); continue; }
          const q = bigOdds(s, p, b, o)!;
          best = Math.max(best, q * f(r + 1, sc + (o.win ?? 1)) + (1 - q) * (b.id === 'quiz' ? 0 : f(r + 1, sc + (o.lose ?? 0))));
        }
        memo.set(key, best);
        return best;
      };
      if (f(0, 0) < 0.2) hard++;
    }
    expect(hard).toBeLessThanOrEqual(4);
  });
});

describe('유산 상점 (legacy.ts)', () => {
  it('혜택을 사서 시작하면 적용되고, 같은 시드·혜택이면 같은 결과', () => {
    const items = LEGACY_ITEMS.map((x) => x.id);
    const a = newGame({ seed: 11, familyName: '김', sex: 'M', legacy: items });
    const b = newGame({ seed: 11, familyName: '김', sex: 'M', legacy: items });
    const c = newGame({ seed: 11, familyName: '김', sex: 'M' });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a.fame).toBeGreaterThan(c.fame);
    expect(head(a).traits).toContain('diligent');
    expect(a.legacy).toContain('lucky_charm');
  });
  it('가문 단절 때 유산을 5~200 사이로 준다', () => {
    const s = newGame({ seed: 12, familyName: '김', sex: 'M' });
    s.gameOver = { reason: 'test', score: 1500 };
    const v = legacyEarn(s);
    expect(v).toBeGreaterThanOrEqual(5);
    expect(v).toBeLessThanOrEqual(200);
  });
});

describe('권력의 길 ② (power2.ts)', () => {
  it('1961년 장교 가족에게 5·16 혁명공약 서명 제안이 온다', async () => {
    const { power2Year } = await import('../src/core/power2');
    const s = newGame({ seed: 21, familyName: '김', sex: 'M', era: 'history' });
    drain(s);
    const dad = s.people[head(s).fatherId!];
    dad.job = 'officer';
    dad.jobLevel = 2;
    s.year = 1961;
    power2Year(s);
    expect(s.events.some((e) => e.defId === 'pw_516_join' && e.personId === dad.id)).toBe(true);
  });
  it('체육관 선거(1972)엔 집권 세력만, 직선(1987)엔 야당 정치인도 후보가 된다', async () => {
    const { power2Year } = await import('../src/core/power2');
    const s = newGame({ seed: 22, familyName: '김', sex: 'M', era: 'history' });
    drain(s);
    const p = head(s);
    p.birthYear = 1925;
    p.job = 'politician';
    p.jobLevel = 2;
    s.fame = 200;
    s.year = 1972;
    power2Year(s);
    expect(s.events.some((e) => e.defId === 'pw_pres')).toBe(false);
    p.flags.push('ruling');
    power2Year(s);
    expect(s.events.some((e) => e.defId === 'pw_pres')).toBe(true);
    s.events = [];
    p.flags = p.flags.filter((f) => f !== 'ruling');
    s.year = 1987;
    power2Year(s);
    expect(s.events.some((e) => e.defId === 'pw_pres')).toBe(true);
  });
  it('하나회 실명은 게임 글에 나오지 않는다', async () => {
    const fs: { readdirSync: (p: string) => string[]; readFileSync: (p: string, e: string) => string } = await import('node:fs' as string);
    for (const f of fs.readdirSync('src/core')) expect(fs.readFileSync('src/core/' + f, 'utf8').includes('하나회'), f).toBe(false);
  });
});
