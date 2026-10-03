import { describe, expect, it } from 'vitest';
import { DEEP, DEEP_STORIES } from '../src/core/jobdeep';
import { JOBS } from '../src/core/data';
import { RAW_STORIES } from '../src/core/stories';
import { JOB_ACTS } from '../src/core/job-acts';

const STATS = ['str', 'int', 'cha', 'mor', 'hp', 'luck'];
const KINDS = ['cash', 'fame', 'promo', 'skill', 'net', 'care', 'risk', 'hp', 'dark', 'legend', 'rest', 'jackpot'];

describe('직업 고증 팩 (jobdeep)', () => {
  it('팩마다 직업이 실제로 있고, 직급 개수가 같고, 이야기 형식이 맞다', () => {
    const seen = new Set<string>();
    for (const d of DEEP) {
      expect(JOBS[d.job], d.job).toBeTruthy();
      expect(seen.has(d.job), `중복 팩 ${d.job}`).toBe(false);
      seen.add(d.job);
      expect(d.src.length, `${d.job} 출처`).toBeGreaterThan(0);
      if (d.titles) expect(d.titles.length, `${d.job} titles 개수`).toBe(JOBS[d.job].titles?.length);
      if (d.steps) expect(d.steps.length, `${d.job} steps`).toBeGreaterThanOrEqual(JOBS[d.job].maxLevel);
      const titles = new Set<string>();
      for (const x of d.stories) {
        expect(['new', 'mid', 'top', 'any', 'risk', 'old', 'ret']).toContain(x[0]);
        for (const i of [1, 2, 3, 4, 6, 10, 12]) expect((x[i] as string).trim().length, `${d.job}:${x[1]} 글 ${i}`).toBeGreaterThan(0);
        expect(STATS, `${d.job}:${x[1]} 능력치`).toContain(x[7]);
        expect(x[8], `${d.job}:${x[1]} 기준`).toBeGreaterThanOrEqual(35);
        expect(x[8], `${d.job}:${x[1]} 기준`).toBeLessThanOrEqual(75);
        expect(titles.has(x[1]), `${d.job} 같은 제목 ${x[1]}`).toBe(false);
        titles.add(x[1]);
      }
      for (const a of d.acts ?? []) {
        expect(STATS.filter((s) => s !== 'luck'), `${d.job}:${a[1]} 행동 능력치`).toContain(a[3]);
        expect(KINDS, `${d.job}:${a[1]} 종류`).toContain(a[4]);
        expect(a[5].split('|').length, `${d.job}:${a[1]} 결과 넷`).toBe(4);
      }
    }
  });
  it('새 이야기·행동이 실제 목록에 들어가고, 빼기로 한 옛 이야기는 빠진다', () => {
    const ids = new Set(RAW_STORIES.map((x) => x.id));
    for (const x of DEEP_STORIES) expect(ids.has(x.id)).toBe(true);
    for (const d of DEEP) {
      for (const c of d.cutStories ?? []) expect(ids.has(c), `${d.job} cut ${c}`).toBe(false);
      for (const a of d.acts ?? []) expect(JOB_ACTS[d.job].some((b) => b[1] === a[1])).toBe(true);
    }
  });
});
