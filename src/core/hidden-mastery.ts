// 숨은 길의 숙련: 가문이 히든·슈퍼 히든 직업을 실제로 이뤄 낼수록(카드를 모을수록) 그 세계를 아는 사람이 늘어,
// 다음 사람들에게 문이 더 잘 열린다. 돈이나 운이 아니라 플레이로만 쌓인다 (제안을 받아들이고, 조건을 갖추고, 길을 끝까지 걸어야 카드가 생긴다).
import type { GameState } from './types';
import { isHoH, isSuperHidden } from './hidden-data';
import { cardPassive } from './cards';

/** 기본 빈도: 150년 플레이(배우자·자식·손주 포함)에서 아무 준비 없이도 히든 약 6번 · 슈퍼 히든 약 3번 */
export const HIDDEN_RATE = 0.36;

export function hiddenMastery(s: GameState): { hid: number; sup: number; cards: number; superCards: number } {
  const ids = new Set((s.cards ?? []).map((c) => c.id).filter((id) => id.startsWith('hj_')));
  const superCards = [...ids].filter((id) => isSuperHidden(id) && !isHoH(id)).length;
  const cards = ids.size - superCards;
  return {
    cards,
    superCards,
    // 카드 효과(희귀·슈퍼 희귀 확률 +%)도 곱한다
    hid: Math.min(1.8, 1 + 0.08 * cards + 0.12 * superCards) * (1 + cardPassive(s, 'rare') / 100),
    sup: Math.min(2.5, 1 + 0.06 * cards + 0.25 * superCards) * (1 + cardPassive(s, 'sup') / 100),
  };
}

/** 가문에서 이미 나온 직업일수록 다시 나올 확률이 반씩 준다 → 대대로 다른 길이 열린다 */
export function novelty(s: GameState, id: string): number {
  const n = (s.cards ?? []).filter((c) => c.id === id).length;
  return Math.pow(0.5, n);
}
