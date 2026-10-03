import { describe, expect, it } from 'vitest';
import { newGame } from '../src/core/sim';
import { head } from '../src/core/people';
import { imprison } from '../src/core/crimes';
import { ACTIONS, forHead } from '../src/core/actions';
import { jobLabel } from '../src/core/economy';
import { prisonYear } from '../src/core/prison';
import { EVENTS } from '../src/core/registry';

describe('수감 생활 (prison.ts)', () => {
  it('교도소에 가면 취준생 행동 대신 수감 중 행동만 보이고, 직업 칸에 수감 중이라고 나온다', () => {
    const s = newGame({ seed: 3, familyName: '김', sex: 'M' });
    const h = head(s);
    h.birthYear = s.year - 30;
    imprison(s, h, 3, 0, '테스트');
    const cats = new Set(ACTIONS.filter((a) => forHead(s, a)).map((a) => a.cat));
    expect([...cats]).toEqual(['수감']);
    expect(ACTIONS.filter((a) => forHead(s, a)).length).toBeGreaterThanOrEqual(6);
    expect(jobLabel(h)).toContain('수감 중');
  });
  it('모범수는 형기를 다 채우기 전에 가석방될 수 있다', () => {
    let paroled = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const s = newGame({ seed, familyName: '김', sex: 'M' });
      const h = head(s);
      h.birthYear = s.year - 30;
      imprison(s, h, 4, 0, '테스트');
      h.flags.push('merit:8');
      const out = prisonYear(s).some((m) => m.includes('가석방'));
      if (out) paroled++;
      expect(h.flags.includes('in_prison')).toBe(!out);
    }
    expect(paroled).toBeGreaterThan(5);
  });
});

describe('국가보안법 연행 전 떡밥', () => {
  it('"검은 지프" 장면을 지나고 해가 바뀌어야 연행 이벤트가 온다', () => {
    const s = newGame({ seed: 5, familyName: '김', sex: 'M', era: 'history' });
    const h = head(s);
    s.year = 1983;
    h.birthYear = 1955;
    h.flags.push('dissident');
    const ctx = { s, p: h, ev: { uid: 0, defId: 'pw_dissident_jail', personId: h.id } };
    expect(EVENTS.pw_dissident_jail.valid!(ctx)).toBe(false);
    expect(EVENTS.pw_watched.valid!({ ...ctx, ev: { ...ctx.ev, defId: 'pw_watched' } })).toBe(true);
    h.flags.push('watched:1983');
    expect(EVENTS.pw_dissident_jail.valid!(ctx)).toBe(false); // 같은 해에는 아직
    s.year = 1984;
    expect(EVENTS.pw_dissident_jail.valid!(ctx)).toBe(true);
  });
});
