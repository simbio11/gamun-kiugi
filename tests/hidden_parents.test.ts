import { describe, expect, it } from 'vitest';
import { newGame } from '../src/core/sim';
import { hiddenYear } from '../src/core/hidden';
import { linkedHidden } from '../src/core/hidden-links';
import { head } from '../src/core/people';

describe('부모님의 히든 직업 (개연성)', () => {
  it('농부 아버지에게는 지하 격투왕 같은 엉뚱한 길이 아니라 하던 일에서 이어지는 길만, 첫 장면부터 열린다', () => {
    const s = newGame({ seed: 11, familyName: '김', sex: 'M' });
    const h = head(s);
    const dad = s.people[h.fatherId!];
    dad.job = 'farmer';
    dad.flags = dad.flags.filter((f) => !f.startsWith('was:'));
    dad.actual.str = 85;
    expect(linkedHidden(dad, s.origin, 40)).not.toContain('hj_fighter');
    const seenIds = new Set<string>();
    for (let i = 0; i < 400; i++) {
      s.events = [];
      s.storySeen = {};
      hiddenYear(s);
      for (const e of s.events.filter((e) => e.personId === dad.id)) {
        expect(e.defId).not.toBe('hid_offer'); // 바로 제안이 오지 않는다
        expect(['hp_step', 'sh_step1']).toContain(e.defId);
        if (e.defId === 'hp_step') expect(e.data.n).toBe(0);
        seenIds.add(e.data.id as string);
      }
    }
    expect(seenIds.size).toBeGreaterThan(0);
    for (const id of seenIds) expect(['hj_natural', 'hj_shaman']).toContain(id);
    expect(dad.job).toBe('farmer');
  });
});
