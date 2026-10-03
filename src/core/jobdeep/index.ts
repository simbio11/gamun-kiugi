// 직업 고증 팩 모음 → 이야기(Story)·행동·직급표에 붙인다.
import { JOBS } from '../data';
import { setSteps } from '../rank';
import type { Story } from '../stories';
import type { GameState, Person } from '../types';
import type { DS, JobDeep, Stage } from './types';
import { DEEP_MEDIA1 } from './media1';
import { DEEP_MEDIA2 } from './media2';
import { DEEP_MEDICAL1 } from './medical1';
import { DEEP_MEDICAL2 } from './medical2';
import { DEEP_TECH } from './tech';
import { DEEP_OFFICE } from './office';
import { DEEP_SERVICE } from './service';
import { DEEP_PUBLIC } from './public';
import { DEEP_TRADE } from './trade';
import { DEEP_TRANSPORT } from './transport';
import { DEEP_BIZLEGAL } from './bizlegal';
import { DEEP_EDUFARM } from './edufarm';
import { DEEP_SOCIETY } from './society';

export const DEEP: JobDeep[] = [...DEEP_MEDIA1, ...DEEP_MEDIA2, ...DEEP_MEDICAL1, ...DEEP_MEDICAL2, ...DEEP_TECH, ...DEEP_OFFICE, ...DEEP_SERVICE, ...DEEP_PUBLIC, ...DEEP_TRADE, ...DEEP_TRANSPORT, ...DEEP_BIZLEGAL, ...DEEP_EDUFARM, ...DEEP_SOCIETY];
export const DEEP_BY_JOB: Record<string, JobDeep> = Object.fromEntries(DEEP.map((d) => [d.job, d]));

// ── 직급 이름·승진 햇수·정년 바로잡기 (세이브 호환: 직급 개수가 같을 때만) ──
for (const d of DEEP) {
  const j = JOBS[d.job];
  if (!j) continue;
  if (d.titles && j.titles && d.titles.length === j.titles.length) j.titles = d.titles;
  if (d.retireAge) j.retireAge = d.retireAge;
  if (d.steps) setSteps(d.job, d.steps);
}

const age = (s: GameState, p: Person) => s.year - p.birthYear;
/** 단계 조건 */
function stageOk(st: Stage, job: string, s: GameState, p: Person): boolean {
  if (st === 'ret') return p.job === 'pension' && p.flags.includes('retired:' + job);
  if (p.job !== job) return false;
  const j = JOBS[job];
  const max = j?.maxLevel ?? 0;
  const yrs = p.jobYears ?? 0;
  switch (st) {
    case 'new':
      return p.jobLevel <= 1 && yrs <= 4;
    case 'mid':
      return yrs >= 3 && (max === 0 || p.jobLevel < max);
    case 'top':
      return max === 0 ? yrs >= 10 : p.jobLevel >= Math.max(1, max - 1);
    case 'old':
      return age(s, p) >= 50;
    default:
      return true;
  }
}

function toStory(job: string, d: DS, i: number): Story {
  const [st, title, text, al, at, ae, bl, stat, dc, oe, ot, be, bt, o] = d;
  return {
    id: `jd_${job}_${i + 1}`,
    title,
    age: st === 'ret' ? [50, 95] : [18, 80],
    w: o?.w ?? (st === 'risk' ? 0.3 : 0.4),
    once: o?.once,
    cooldown: 12,
    years: o?.years,
    cond: (s, p) => stageOk(st, job, s, p) && (!o?.sex || p.sex === o.sex),
    text,
    choices: [{ label: al, text: at, eff: ae }, { label: bl, text: '', roll: [stat, dc, [oe, ot], [be, bt]] }],
  };
}

export const DEEP_STORIES: Story[] = DEEP.flatMap((d) => d.stories.map((x, i) => toStory(d.job, x, i)));
/** 개연성이 없어 빼는 기존 이야기 */
export const DEEP_CUT_STORIES = new Set(DEEP.flatMap((d) => d.cutStories ?? []));
