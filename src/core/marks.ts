// 흔적(marks)의 보이지 않는 효과. 흔적 종류 설명은 seeds.ts 참고.
import { markOf } from './people';
import type { Person } from './types';

const cap = (n: number, m = 6) => Math.min(m, n);
/** 공부 효율 배수 */
export const studyBoost = (p: Person) => 1 + cap(markOf(p, 'study')) * 0.05;
/** 수능 원점수 보너스 */
export const suneungBonus = (p: Person) => cap(markOf(p, 'study')) * 0.5;
/** 사망 위험 배수 */
export const deathMult = (p: Person) => (1 - cap(markOf(p, 'exercise'), 5) * 0.04) * (1 + cap(markOf(p, 'health_x'), 5) * 0.08) * (1 - cap(markOf(p, 'sport'), 4) * 0.02);
/** 병 위험 배수 */
export const illMult = (p: Person) => 1 + cap(markOf(p, 'health_x'), 5) * 0.1;
/** 연애·결혼 매력 보정 */
export const appealBonus = (p: Person) => cap(markOf(p, 'network')) * 1 - cap(markOf(p, 'scar')) * 2 + cap(markOf(p, 'kind'), 3);
/** 승진 확률 배수 */
export const promoteMult = (p: Person) => 1 + cap(markOf(p, 'honest')) * 0.03 + cap(markOf(p, 'network')) * 0.03;
/** 해마다 금슬 변화 보정 */
export const bondDrift = (p: Person) => cap(markOf(p, 'family'), 8) * 0.25;

