import { describe, expect, it } from 'vitest';
import { newGame } from '../src/core/sim';
import { JOBS } from '../src/core/data';
import { jobGroupOf, pickKit, type KitAtlas } from '../src/render/kitPick';
import atlasJson from '../public/portrait/atlas.json';

const atlas = atlasJson as unknown as KitAtlas;
const g = newGame({ seed: 7, familyName: '김', sex: 'M', origin: 'middle' });
const base = Object.values(g.people)[0];

describe('부품 초상화 고르기', () => {
  it('모든 직업·나이·성별에서 부품이 실제로 있는 칸을 고른다', () => {
    for (const sex of ['M', 'F'] as const)
      for (const job of Object.keys(JOBS))
        for (const age of [0, 2, 5, 9, 14, 17, 25, 45, 62, 80]) {
          const p = { ...base, id: `t-${sex}-${job}-${age}`, sex, job };
          const k = pickKit(atlas, p, age, '#f2c49e');
          for (const r of [k.head, k.hair, k.eyes, k.nose, k.mouth, k.outfit]) expect(atlas[r.kind]?.[r.i], `${sex} ${job} ${age} ${r.kind}`).toBeTruthy();
        }
  });

  it('같은 사람은 늘 같은 얼굴, 머리 모양은 유전자를 따른다', () => {
    const p = { ...base, id: 'same' };
    expect(pickKit(atlas, p, 30, '#f2c49e')).toEqual(pickKit(atlas, p, 30, '#f2c49e'));
    const q = { ...p, genes: { ...p.genes, hairStyle: p.genes.hairStyle + 1 } };
    expect(pickKit(atlas, q, 30, '#f2c49e').hair).not.toEqual(pickKit(atlas, p, 30, '#f2c49e').hair);
  });

  it('직업 옷: 의사는 의료 복장, 경찰은 제복 무리에서', () => {
    expect(jobGroupOf('doctor')).toBe('medical');
    for (const sex of ['M', 'F'] as const) {
      const doc = pickKit(atlas, { ...base, id: 'd' + sex, sex, job: 'doctor' }, 40, '#f2c49e').outfit;
      expect(doc.kind).toBe(sex === 'F' && atlas[doc.kind][doc.i].job === 'medical' ? 'outfit-f' : sex === 'F' ? 'outfit-f-uniform' : 'outfit-m-uniform');
      const cop = pickKit(atlas, { ...base, id: 'c' + sex, sex, job: 'police' }, 40, '#f2c49e').outfit;
      expect(['outfit-f-special', 'outfit-f-uniform', 'outfit-f', 'outfit-m-uniform']).toContain(cop.kind);
    }
  });

  it('아이는 나이별 옷, 남자는 립스틱을 안 바른다', () => {
    const girl = pickKit(atlas, { ...base, id: 'girl', sex: 'F', job: 'none' }, 4, '#f2c49e').outfit;
    expect(['outfit-f-kid', 'outfit-f']).toContain(girl.kind);
    expect(['4', '5', 'toddler']).toContain(atlas[girl.kind][girl.i].age);
    for (let i = 0; i < 40; i++) {
      const m = pickKit(atlas, { ...base, id: 'm' + i, sex: 'M', genes: { ...base.genes, mouth: i } }, 30, '#f2c49e').mouth;
      expect([0, 2, 4]).toContain(atlas.mouths[m.i].r);
    }
  });
});
