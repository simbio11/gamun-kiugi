import { describe, expect, it } from 'vitest';
import { currentEvent, newGame, resolveChoice, simulateYear } from '../src/core/sim';
import { head } from '../src/core/people';
import { joblossYear, primeEndOf, JOBLOSS_EVENTS } from '../src/core/jobloss';
import { GIGS, gigOf, gigYear, GIG_EVENTS } from '../src/core/sidegig';
import { EVENTS } from '../src/core/registry';
import type { GameState } from '../src/core/types';

const drain = (s: GameState, pick = 0) => {
  let g = 0;
  while (s.events.length && g++ < 200) {
    const c = currentEvent(s);
    if (!c) break;
    const en = c.choices.map((x, i) => [x, i] as const).filter(([x]) => !x.disabled);
    resolveChoice(s, en[Math.min(pick, en.length - 1)][1]);
  }
};

describe('일자리를 잃는 길 (jobloss.ts)', () => {
  it('한창때를 넘긴 회사원은 일자리를 잃을 위험이 크고, 공무원은 거의 안전하다', () => {
    let corpHit = 0;
    let civilHit = 0;
    for (let seed = 1; seed <= 60; seed++) {
      for (const job of ['corp', 'civil'] as const) {
        const s = newGame({ seed, familyName: '김', sex: 'M' });
        s.events = [];
        const p = head(s);
        p.birthYear = s.year - 57;
        p.job = job;
        p.jobLevel = 3;
        p.actual.int = 45;
        for (let y = 0; y < 3; y++) joblossYear(s), (s.storySeen = {});
        const hit = s.events.some((e) => e.defId.startsWith('jl_'));
        if (hit) job === 'corp' ? corpHit++ : civilHit++;
      }
    }
    expect(corpHit).toBeGreaterThan(civilHit * 3);
    expect(primeEndOf('civil')).toBe(99);
    expect(primeEndOf('flight_attendant')).toBe(40);
  });
  it('명예퇴직을 받으면 직업이 없어지고 다음 길을 고른다', () => {
    const s = newGame({ seed: 5, familyName: '김', sex: 'M' });
    s.events = [];
    const p = head(s);
    p.birthYear = s.year - 52;
    p.job = 'corp';
    p.jobLevel = 4;
    p.jobYears = 20;
    s.events.push({ uid: s.eventSeq++, defId: 'jl_honorary', personId: p.id, data: {} });
    const c = currentEvent(s)!;
    resolveChoice(s, 0);
    expect(p.job).toBe('none');
    expect(s.events[0]?.defId).toBe('jl_next');
    expect(c.choices.length).toBe(2);
  });
  it('모든 실직 이벤트가 등록돼 있다', () => {
    for (const e of JOBLOSS_EVENTS) expect(EVENTS[e.id]).toBe(e);
  });
});

describe('부업 (sidegig.ts)', () => {
  it('부업을 고르면 해마다 수입이 들어오고, 사건이 온다', () => {
    expect(GIGS.length).toBeGreaterThanOrEqual(18);
    for (const e of GIG_EVENTS) expect(EVENTS[e.id]).toBe(e);
    const s = newGame({ seed: 9, familyName: '김', sex: 'F' });
    s.events = [];
    const p = head(s);
    p.birthYear = s.year - 30;
    p.job = 'office';
    s.events.push({ uid: s.eventSeq++, defId: 'sj_pick', personId: p.id, data: {} });
    const c = currentEvent(s)!;
    const i = c.choices.findIndex((x) => !x.disabled && x.label !== '아직은 아니다');
    resolveChoice(s, i);
    expect(gigOf(p)).toBeTruthy();
    let got = 0;
    for (let y = 0; y < 5; y++) gigYear(s, (_q, v) => (got += v));
    expect(got).toBeGreaterThan(0);
  });
  it('여러 해 자동 플레이에서도 오류 없이 돈다', () => {
    const s = newGame({ seed: 12, familyName: '박', sex: 'M' });
    for (let y = 0; y < 70 && !s.gameOver; y++) (drain(s, y % 3), simulateYear(s));
    expect(s.year).toBeGreaterThan(2060);
  }, 60000);
});
