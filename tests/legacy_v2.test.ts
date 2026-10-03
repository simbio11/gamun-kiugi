import { describe, expect, it } from 'vitest';
import { canConclude, concludeFamily, currentEvent, newGame, resolveChoice, simulateYear } from '../src/core/sim';
import { age, head } from '../src/core/people';
import { ancestorOf, legacyEarn, legacyParts, PERMA_ITEMS, applyPerma } from '../src/core/legacy';
import { apMax } from '../src/core/actions';
import { CARD, CARDS, CARD_GROUPS, cardGroup, summitTries } from '../src/core/cards';
import { isTopSeat, promoReady, seatOdds } from '../src/core/rank';
import type { GameState } from '../src/core/types';

const drain = (s: GameState) => {
  let g = 0;
  while (s.events.length && g++ < 200) {
    const c = currentEvent(s);
    if (!c) break;
    resolveChoice(s, c.choices.findIndex((x) => !x.disabled));
  }
};

describe('유산 상점 v2 (legacy.ts)', () => {
  it('히든 카드·정점 카드가 유산에 더해진다', () => {
    const s = newGame({ seed: 3, familyName: '김', sex: 'M' });
    s.gameOver = { reason: 't', score: 800 };
    const base = legacyEarn(s);
    const pid = head(s).id;
    s.cards = [{ id: 'president', personId: pid, year: s.year }, { id: CARDS.find((c) => c.hidden)!.id, personId: pid, year: s.year }];
    expect(legacyEarn(s)).toBeGreaterThanOrEqual(base + 30);
    expect(legacyParts(s).some(([l]) => l.startsWith('히든'))).toBe(true);
  });
  it('개화기 내력은 잠겨 있어 적용되지 않는다', () => {
    expect(PERMA_ITEMS.find((x) => x.id === 'era_gaehwa')?.locked).toBe(true);
    const s = newGame({ seed: 4, familyName: '김', sex: 'M' });
    applyPerma(s, ['era_gaehwa', 'twin_line']);
    expect(s.perma).toEqual(['twin_line']);
  });
  it('가문 내력: 젊은 날의 열정은 20~39세 가주의 행동력 +1, 같은 시드·내력이면 같은 결과', () => {
    const a = newGame({ seed: 5, familyName: '김', sex: 'F', perma: ['young_fire'] });
    const b = newGame({ seed: 5, familyName: '김', sex: 'F' });
    expect(apMax(a)).toBe(apMax(b)); // 다섯 살
    head(a).birthYear = head(b).birthYear = a.year - 25;
    expect(apMax(a)).toBe(apMax(b) + 1);
    expect(JSON.stringify(newGame({ seed: 5, familyName: '김', sex: 'F', perma: ['young_fire'] }))).toBe(JSON.stringify(newGame({ seed: 5, familyName: '김', sex: 'F', perma: ['young_fire'] })));
  });
  it('불굴의 혈통은 정점 도전 기회 +1', () => {
    const s = newGame({ seed: 6, familyName: '김', sex: 'M', perma: ['summit_grit'] });
    expect(summitTries('famed_doctor', s)).toBe(summitTries('famed_doctor') + 1);
  });
  it('조상 카드: 마지막 가주가 조상이 되고, 다음 가문 아이의 그 능력 잠재력 +3', () => {
    const s = newGame({ seed: 7, familyName: '이', sex: 'M' });
    const anc = ancestorOf(s)!;
    expect(anc.name).toContain('이');
    const a = newGame({ seed: 8, familyName: '김', sex: 'M', ancestor: anc });
    const b = newGame({ seed: 8, familyName: '김', sex: 'M' });
    expect(head(a).potential[anc.stat]).toBe(Math.min(98, head(b).potential[anc.stat] + 3));
    expect(a.ancestor?.name).toBe(anc.name);
  });
  it('가문 이야기 마치기: 40세 전 1대는 못 하고, 그 뒤엔 스스로 끝내고 유산을 받는다', () => {
    const s = newGame({ seed: 9, familyName: '김', sex: 'M' });
    drain(s);
    expect(canConclude(s)).toBe(false);
    while (age(s, head(s)) < 40 && !s.gameOver) (drain(s), simulateYear(s));
    drain(s);
    if (s.gameOver) return;
    expect(concludeFamily(s)).toBe(true);
    expect((s.gameOver as GameState['gameOver'])?.voluntary).toBe(true);
    expect(legacyEarn(s)).toBeGreaterThanOrEqual(5);
  });
});

describe('명예의 전당 카드 난이도', () => {
  it('맨 꼭대기 자리는 50세·5년 전에는 열리지 않고, 확률도 낮다', () => {
    const s = newGame({ seed: 10, familyName: '김', sex: 'M' });
    const p = head(s);
    p.job = 'corp';
    p.jobLevel = 6;
    p.birthYear = s.year - 48;
    p.flags.push(`lv:6:${s.year - 10}`);
    expect(isTopSeat(p)).toBe(true);
    expect(promoReady(s.year, p.birthYear, p)).toBe(false);
    p.birthYear = s.year - 52;
    expect(promoReady(s.year, p.birthYear, p)).toBe(true);
    expect(seatOdds(p)).toBeLessThan(0.5);
  });
  it('정점 도전 기회는 전설 2번 · 영웅 3번', () => {
    expect(summitTries('national_mc')).toBe(2);
    expect(summitTries('famed_doctor')).toBe(3);
  });
  it('검사장은 이야기·행동으로 검찰총장이 될 수 없다 (임명뿐)', () => {
    const s = newGame({ seed: 11, familyName: '김', sex: 'M' });
    const p = head(s);
    p.job = 'prosecutor';
    p.jobLevel = 4;
    p.birthYear = s.year - 55;
    expect(promoReady(s.year, p.birthYear, p, 5)).toBe(false);
  });
  it('모든 카드가 컬렉션 분야 하나에 들어간다', () => {
    const ids = new Set(CARD_GROUPS.map((g) => g.id));
    for (const c of CARDS) expect(ids.has(cardGroup(c))).toBe(true);
    expect(cardGroup(CARD.president)).toBe('power');
  });
});
