// 시대의 의료와 돈으로 사는 수명.
// · 시대: 1960년대엔 기대수명이 50대였다(사망 위험 ×1.4). 2025년 기준 1, 그 뒤로 조금씩 내려가 2130년대엔 ×0.4.
// · 개인: 인공 관절·3D 프린팅 장기·나노봇·전신 세포 재생… 받을수록 위험이 줄어든다.
//   값이 비싸서 처음엔 부자만 받는다. 시대가 지나면 값이 내려 누구나 받을 수 있게 된다.
import type { Person } from './types';

export function eraMortality(y: number): number {
  if (y < 2025) return 1 + (2025 - y) * 0.006;
  return Math.max(0.4, 1 - (y - 2025) * 0.0055);
}

/** [플래그, 위험 배수] */
const TECH: [string, number][] = [
  ['regen_joint', 0.92], ['organ:heart', 0.75], ['organ:kidney', 0.85], ['organ:liver', 0.85], ['organ:lung', 0.85],
  ['rejuvenated', 0.7], ['nano_bots', 0.72], ['cell_regen', 0.6], ['gene_fix', 0.8], ['brain_backup', 0.95],
  ['cancer_vax', 0.88], ['retina', 0.97], ['dementia_vax', 0.9], ['mito_swap', 0.75],
];
export function lifeTechMult(p: Person): number {
  let m = 1;
  for (const [f, v] of TECH) if (p.flags.includes(f)) m *= v;
  return m;
}
