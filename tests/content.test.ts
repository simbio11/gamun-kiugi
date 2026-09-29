import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS, EXAMS, JOBS, JOB_IDS, TRAITS } from '../src/core/data';
import { MAJOR_JOBS, PROGRAMS, admitChance, recommend, suneung } from '../src/core/school';
import { MISSIONS } from '../src/core/missions';
import { deathChance } from '../src/core/growth';
import { age, head, parentsOf } from '../src/core/people';
import { newGame } from '../src/core/sim';
import { EVENTS } from '../src/core/registry';

describe('콘텐츠 무결성', () => {
  it('직업 100개 이상, 모든 참조가 유효', () => {
    expect(JOB_IDS.length).toBeGreaterThanOrEqual(100);
    for (const id of JOB_IDS) {
      const j = JOBS[id];
      if (j.entry?.exam) expect(EXAMS[j.entry.exam], `${id} → ${j.entry.exam}`).toBeDefined();
      if (j.kind === 'creator') expect(j.creator, id).toBeDefined();
      if (j.titles) expect(j.titles.length, id).toBeGreaterThanOrEqual(j.maxLevel + 1);
    }
    for (const [id, e] of Object.entries(EXAMS)) expect(JOBS[e.job], `exam ${id}`).toBeDefined();
    for (const [m, list] of Object.entries(MAJOR_JOBS)) for (const id of list) expect(JOBS[id], `${m} → ${id}`).toBeDefined();
  });

  it('성격 짝·업적·미션·이벤트 정의', () => {
    for (const [id, t] of Object.entries(TRAITS)) if (t.opp) expect(TRAITS[t.opp].opp, id).toBe(id);
    expect(Object.keys(ACHIEVEMENTS).length).toBeGreaterThanOrEqual(60);
    expect(Object.keys(MISSIONS).length).toBeGreaterThanOrEqual(12);
    for (const id of ['school_year', 'path', 'first_job', 'exam', 'blind_date', 'military', 'cancer', 'parent_estate', 'will', 'choose_heir', 'presidential'])
      expect(EVENTS[id], id).toBeDefined();
  });
});

describe('인생 시스템', () => {
  it('다섯 살, 부모와 함께 시작', () => {
    const s = newGame({ seed: 5, familyName: '최', sex: 'F' });
    const h = head(s);
    expect(age(s, h)).toBe(5);
    expect(parentsOf(s, h)).toHaveLength(2);
    expect(s.missions?.length).toBe(3);
  });

  it('수능: 성적이 높을수록 백분위가 높고, 합격선이 높을수록 어렵다', () => {
    const s = newGame({ seed: 1, familyName: '최', sex: 'M' });
    const p = head(s);
    p.actual.int = 70;
    const avg = (study: number) => {
      p.study = study;
      let t = 0;
      for (let i = 0; i < 200; i++) t += suneung(s, p);
      return t / 200;
    };
    expect(avg(90)).toBeGreaterThan(avg(40) + 20);
    const progs = Object.values(PROGRAMS)
      .filter((x) => !x.practical && !x.need)
      .sort((a, b) => a.cut - b.cut);
    expect(admitChance(p, progs[0], 80)).toBeGreaterThan(admitChance(p, progs[progs.length - 1], 80));
    expect(recommend(p, 80, false).length).toBeGreaterThan(3);
  });

  it('유언장을 쓰면 수명이 줄어든다', () => {
    const s = newGame({ seed: 2, familyName: '최', sex: 'M' });
    const h = head(s);
    s.year = h.birthYear + 75;
    const without = deathChance(s, h);
    s.willWritten = true;
    expect(deathChance(s, h)).toBeGreaterThan(without);
  });
});
