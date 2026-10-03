import { describe, expect, it } from 'vitest';
import { currentEvent, newGame, resolveChoice, simulateYear } from '../src/core/sim';
import { age, head, parentsOf, siblingsOf } from '../src/core/people';
import { SAGA_EVENTS, startInheritanceDrama } from '../src/core/saga';
import { initRival } from '../src/core/rival';
import { EVENTS } from '../src/core/registry';
import type { GameState } from '../src/core/types';

const drain = (s: GameState, pick = 0) => {
  let g = 0;
  while (s.events.length && g++ < 300) {
    const c = currentEvent(s);
    if (!c) break;
    const en = c.choices.map((x, i) => [x, i] as const).filter(([x]) => !x.disabled);
    resolveChoice(s, en[Math.min(pick, en.length - 1)][1]);
  }
};
/** 형제가 있는 시드를 찾아, 가주와 형제를 어른으로 만든다 */
function family(): { s: GameState; sib: ReturnType<typeof head> } {
  for (let seed = 1; seed < 200; seed++) {
    const s = newGame({ seed, familyName: '김', sex: 'M' });
    drain(s);
    const h = head(s);
    const sib = siblingsOf(s, h)[0];
    if (!sib) continue;
    s.year += 30;
    for (const p of Object.values(s.people)) p.birthYear -= 0;
    return { s, sib };
  }
  throw new Error('no sibling seed');
}

describe('가문 서사 (saga.ts)', () => {
  it('모든 서사 이벤트가 등록돼 있다', () => {
    for (const e of SAGA_EVENTS) expect(EVENTS[e.id]).toBe(e);
  });
  it('유언 없이 가주가 떠나면: 빈소 → 분할 협의 → (법정) 으로 이어진다', () => {
    const { s, sib } = family();
    const h = head(s);
    const dad = parentsOf(s, h)[0];
    s.willWritten = false;
    startInheritanceDrama(s, dad, h);
    expect(s.events.some((e) => e.defId === 'sg_wake' && e.data.sibId === sib.id)).toBe(true);
    // "법대로 하자" 길: 빈소(첫 선택) → 1년 뒤 협의 → 세 번째 선택(법대로) → 법정 예약
    drain(s, 0);
    for (let y = 0; y < 2 && !s.events.some((e) => e.defId === 'sg_split'); y++) simulateYear(s);
    const split = s.events.findIndex((e) => e.defId === 'sg_split');
    expect(split).toBeGreaterThanOrEqual(0);
    s.events.unshift(...s.events.splice(split, 1));
    const c = currentEvent(s)!;
    resolveChoice(s, c.choices.findIndex((x) => x.label.startsWith('법대로')));
    expect(s.scheduled?.some((x) => x.defId === 'sg_court')).toBe(true);
  });
  it('모든 서사 이벤트의 모든 선택지가 오류 없이 돈다', () => {
    for (const def of SAGA_EVENTS) {
      for (let i = 0; i < 5; i++) {
        const { s, sib } = family();
        const h = head(s);
        h.cash = 1e7;
        initRival(s, 50000);
        s.rival!.feud = 60;
        s.ancestor = { name: '이순례', family: '이', gen: 2, role: '교사', stat: 'int', value: 70, born: 1950, died: 2030 };
        const dead = parentsOf(s, h)[0];
        dead.deathYear = s.year - 1;
        h.pol = { approval: 45, fund: 0, slush: 0, heat: 0 };
        s.events = [{ uid: s.eventSeq++, defId: def.id, personId: h.id, data: { sibId: sib.id, deadId: dead.id, kin: '박하늘', kb: 2000, sex: 'F', share: 3000, year: 2030, who: '김철수', what: '부도', beat: '부도를 겪던 해, ', job: '교사', from: '김영희' } }];
        const c = currentEvent(s);
        if (!c || i >= c.choices.length) continue;
        if (c.choices[i].disabled) continue;
        expect(() => resolveChoice(s, i)).not.toThrow();
      }
    }
  });
  it('여러 세대 자동 플레이에서 서사가 실제로 나온다', () => {
    let n = 0;
    for (const seed of [3, 8, 21]) {
      const s = newGame({ seed, familyName: '최', sex: seed % 2 ? 'M' : 'F' });
      for (let y = 0; y < 110 && !s.gameOver; y++) (drain(s, y % 3), simulateYear(s));
      n += Object.keys(s.storySeen ?? {}).filter((k) => k.startsWith('sg_')).length;
      expect(age(s, head(s))).toBeGreaterThan(0);
    }
    expect(n).toBeGreaterThan(2);
  }, 120000);
});
