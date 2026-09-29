// 이벤트 공용 도구: 타입, 조사 처리, 비용 게이트, 진학·취업 처리
import { STAT_NAMES, TAG_NAMES } from './data';
import { unlock } from './achievements';
import { addFlag, alive, clamp, fullName, hasFlag, householder, spouseOf } from './people';
import type { Asset, CareerTag, GameState, JobId, PendingEvent, Person, StatKey } from './types';

/** 후폭풍 예약: yearsLater 년 뒤 그 사람에게 이벤트가 터진다 */
export function schedule(s: GameState, yearsLater: number, defId: string, personId: string, data?: any) {
  (s.scheduled ??= []).push({ year: s.year + Math.max(1, Math.round(yearsLater)), defId, personId, data });
}

export interface Ctx {
  s: GameState;
  p: Person;
  ev: PendingEvent;
}

export interface Choice {
  label: string;
  /** 요구 조건 뱃지 (결과는 숨기고 조건만 보여줌) */
  req?: string[];
  disabled?: boolean;
  cost?: number;
  tag?: CareerTag;
  run: (c: Ctx) => string | { text: string; keep: true };
}

export interface EventDef {
  id: string;
  title: (c: Ctx) => string;
  text: (c: Ctx) => string;
  choices: (c: Ctx) => Choice[];
  portraits?: (c: Ctx) => Person[];
  /** 큐에 들어간 뒤 상황이 바뀌어 더는 말이 안 되면 건너뛴다 */
  valid?: (c: Ctx) => boolean;
}

export const stars = (v: number) => '★'.repeat(clamp(Math.round(v / 20), 1, 5));
export const req = (k: StatKey, v: number) => `${STAT_NAMES[k]} ${stars(v)}`;
export const who = (c: Ctx) => fullName(c.p);
export const tr = (n: string, a: string, b: string) => {
  const code = n.charCodeAt(n.length - 1) - 0xac00;
  return code >= 0 && code % 28 !== 0 ? a : b;
};
/** 조사: 이/가, 은/는, 을/를 */
export const iga = (n: string) => n + tr(n, '이', '가');
export const eun = (n: string) => n + tr(n, '은', '는');
export const eul = (n: string) => n + tr(n, '을', '를');

/** 쓸 수 있는 돈: 살림을 맡은 사람(어릴 땐 부모)과 배우자, 가문 금고 */
export function spendable(s: GameState): number {
  const h = householder(s);
  const sp = spouseOf(s, h);
  return Math.max(0, h.cash) + (sp && alive(sp) ? Math.max(0, sp.cash) : 0) + Math.max(0, s.familyCash);
}

/** 자녀의 꿈과 선택 방향 비교 → 관계도·행복도 */
export function applyDesire(c: Ctx, tag?: CareerTag): string {
  const p = c.p;
  if (!tag || !p.desire || p.id === c.s.headId) return '';
  if (tag === p.desire) {
    p.happiness = clamp(p.happiness + 10, 0, 100);
    p.affinity = clamp(p.affinity + 6, -100, 100);
    addFlag(p, 'passion');
    return p.desireKnown ? ' 원하던 길이라 눈이 반짝인다.' : '';
  }
  p.happiness = clamp(p.happiness - 10, 0, 100);
  p.affinity = clamp(p.affinity - 8, -100, 100);
  p.flags = p.flags.filter((f) => f !== 'passion');
  return p.desireKnown ? ' 하지만 원하던 길이 아니라 시무룩하다.' : '';
}

export function setJob(p: Person, job: JobId, level = 0) {
  p.job = job;
  p.jobLevel = level;
  p.jobYears = 0;
}

/** 진학. track:* 은 졸업할 때 어느 길로 나갈지 표시 (졸업 시 제거) */
export function setStudy(s: GameState, p: Person, years: number, flag: string) {
  addFlag(p, flag);
  addFlag(p, 'student');
  p.flags = p.flags.filter((f) => !f.startsWith('grad:') && !f.startsWith('track:'));
  p.flags.push('grad:' + (s.year + years), 'track:' + flag);
}

/** 위작 판정: 헐값이 된다 */
export function exposeFakes(s: GameState, assets: Asset[]): Asset[] {
  const found = assets.filter((a) => a.kind === 'art' && a.fake && !a.name.endsWith('(위작)'));
  for (const a of found) {
    a.value = Math.round(a.value * 0.05);
    a.name += ' (위작)';
  }
  if (found.length) unlock(s, 'forgery');
  return found;
}

export const ok = (cost: number | undefined, s: GameState) => (cost ?? 0) <= spendable(s);
/** 비용을 감당 못 하는 선택지는 비활성화 */
export const gate = (s: GameState, list: Choice[]): Choice[] => list.map((ch) => ({ ...ch, disabled: ch.disabled || !ok(ch.cost, s) }));


/** 현재 이벤트 바로 다음에 이벤트 끼워넣기 (같은 해에 이어서 진행) */
export function queueNext(s: GameState, defId: string, personId: string, data?: any) {
  s.events.splice(1, 0, { uid: s.eventSeq++, defId, personId, data });
}

export interface RandomDef extends EventDef {
  weight: (c: Ctx) => number;
}

export { TAG_NAMES, STAT_NAMES, hasFlag, alive };
