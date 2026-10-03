import { describe, expect, it } from 'vitest';
import { currentEvent, newGame, resolveChoice } from '../src/core/sim';
import { head } from '../src/core/people';
import { CAMPUS_EVENTS, campusYear } from '../src/core/campus';
import { companyOf, COMPANIES } from '../src/core/companies';
import { EVENTS } from '../src/core/registry';

describe('캠퍼스 (campus.ts)', () => {
  it('졸업 전 입사 제안을 받으면 졸업하는 해에 그 회사로 입사한다', () => {
    const s = newGame({ seed: 4, familyName: '김', sex: 'M' });
    s.events = [];
    const p = head(s);
    p.birthYear = s.year - 23;
    p.job = 'none';
    p.flags.push('kaist', 'univ_top', 'major:ee', 'student', 'grad:' + (s.year + 1));
    s.events.push({ uid: s.eventSeq++, defId: 'cp_contract', personId: p.id, data: { co: COMPANIES.find((c) => c.id === 'sqhynix') } });
    resolveChoice(s, 0);
    expect(p.flags.some((f) => f.startsWith('offer:chip_engineer:'))).toBe(true);
    p.flags = p.flags.filter((f) => f !== 'student');
    campusYear(s);
    expect(p.job).toBe('chip_engineer');
    expect(companyOf(p)?.name).toBe('SQ하이닉스');
  });
  it('캠퍼스 이야기는 모두 등록돼 있고 선택지가 오류 없이 돈다', () => {
    for (const e of CAMPUS_EVENTS) expect(EVENTS[e.id]).toBe(e);
    for (const def of CAMPUS_EVENTS) {
      for (let i = 0; i < 3; i++) {
        const s = newGame({ seed: 7 + i, familyName: '이', sex: 'F' });
        s.events = [];
        const p = head(s);
        p.birthYear = s.year - 21;
        p.cash = 1e6;
        p.flags.push('student', 'school:테스트대', 'major:cs', 'grad:' + (s.year + 1));
        s.events.push({ uid: s.eventSeq++, defId: def.id, personId: p.id, data: { co: COMPANIES[0], job: 'developer' } });
        const c = currentEvent(s);
        if (!c || i >= c.choices.length || c.choices[i].disabled) continue;
        expect(() => resolveChoice(s, i)).not.toThrow();
      }
    }
  });
});
