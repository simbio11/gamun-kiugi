// 지금 이 사람이 걷는 길: 전공(재학 중) 또는 직업. 이야기는 길에 맞는 것만 일어난다.
import { JOBS } from './data';
import type { Person } from './types';

export type Path = 'med' | 'kmd' | 'nurse' | 'law' | 'edu' | 'tech' | 'biz' | 'art' | 'sport' | 'public' | 'soldier' | 'office' | 'service' | 'trade' | 'none';

const MAJOR_PATH: Record<string, Path> = {
  med: 'med', dent: 'med', vet: 'med', pharm: 'med', kmd: 'kmd',
  nurse: 'nurse', pt: 'nurse', radio: 'nurse', clinical: 'nurse', emt: 'nurse',
  law: 'law', admin: 'law',
  edu: 'edu', edu_elem: 'edu', kinder: 'edu',
  cs: 'tech', ee: 'tech', mech: 'tech', auto: 'tech', bio: 'tech', arch: 'tech', itc: 'tech', air: 'tech', agri: 'tech',
  biz: 'biz', econ: 'biz', lang: 'biz', welfare: 'biz', media: 'biz',
  art: 'art', design: 'art', music: 'art', acting: 'art', beauty: 'art', cook: 'art',
  sport: 'sport',
  police: 'public', army: 'soldier', marine: 'public', flight: 'tech',
  rail: 'public', heritage: 'edu', film: 'art', anim: 'art', fashion: 'art', game: 'tech', hotel: 'service',
};

const CAT_PATH: Record<string, Path> = {
  medical: 'med', legal: 'law', edu: 'edu', tech: 'tech', office: 'office', public: 'public',
  service: 'service', trade: 'trade', transport: 'trade', media: 'art', sport: 'sport', biz: 'biz', farm: 'trade', etc: 'none',
};

export const majorKey = (p: Person) => p.flags.find((f) => f.startsWith('major:'))?.slice(6);

export function pathOf(p: Person): Path {
  if (p.flags.some((f) => f.startsWith('serving:'))) return 'soldier';
  if (p.flags.includes('student')) return MAJOR_PATH[majorKey(p) ?? ''] ?? 'biz';
  const j = JOBS[p.job];
  if (!j || p.job === 'none' || p.job === 'parttime' || p.job === 'pension') return 'none';
  if (p.job === 'kmd') return 'kmd';
  if (['nurse', 'pt', 'radiographer', 'clinical', 'emt', 'caregiver'].includes(p.job)) return 'nurse';
  if (['officer', 'soldier'].includes(p.job)) return 'soldier';
  return CAT_PATH[j.cat] ?? 'none';
}

export const isStudent = (p: Person) => p.flags.includes('student');
