// 외모와 매력.
//  · 타고난 외모(looks)는 유전된다: 얼굴 매력의 유전율은 쌍둥이 연구에서 대략 0.6~0.7 (예: Mitchem et al. 2015, 호주 쌍둥이 연구).
//    그래서 부모가 잘생겼으면 잘생길 확률이 높지만, 평균 쪽으로 돌아가려는 힘(평균 회귀)도 있다.
//  · 아이는 아빠·엄마 중 한쪽을 더 닮는다 (닮은 쪽 얼굴 생김새를 주로 물려받는다). 가끔은 둘의 좋은 점만 모여 "피어난다".
//  · 매력(cha) = 타고난 외모 + 자라며 쌓는 꾸밈(헤어·옷·피부·자세) + 사교성. 그래서 외모가 평범해도 가꾸면 매력은 오른다.
import { chance, normal } from './rng';
import { clamp } from './people';
import type { GameState, Person } from './types';

/** 기록이 없는 옛 사람: 매력 잠재력에서 짐작 */
export const looksOf = (p: Person) => p.looks ?? Math.round(clamp(p.potential.cha + ((p.id.length * 7) % 11) - 5, 8, 98));

export function inheritLooks(s: GameState, father: Person, mother: Person): { looks: number; resemble: 'F' | 'M' | 'mix'; glow: boolean } {
  const resemble: 'F' | 'M' | 'mix' = chance(s, 0.12) ? 'mix' : chance(s, 0.5) ? 'F' : 'M';
  const f = looksOf(father);
  const m = looksOf(mother);
  const blend = resemble === 'mix' ? (f + m) / 2 : resemble === 'F' ? f * 0.7 + m * 0.3 : m * 0.7 + f * 0.3;
  // 평균 회귀: 부모의 장점이 70%만 이어지고, 나머지는 운
  let v = 50 + (blend - 50) * 0.7 + normal(s, 0, 9);
  // 피어난 외모: 부모가 평범해도 4%쯤은 눈에 띄게 예쁘게(잘생기게) 자란다
  const glow = chance(s, 0.04);
  if (glow) v += 24;
  return { looks: Math.round(clamp(v, 8, 98)), resemble, glow };
}

/** 외모 등급 글 */
export function looksLabel(v: number): string {
  return v >= 85 ? '눈에 띄게 수려하다' : v >= 70 ? '호감형 미남·미녀' : v >= 55 ? '단정하고 보기 좋다' : v >= 40 ? '평범하다' : '수수하다';
}
export const resembleLabel = (p: Person) => (p.resemble === 'F' ? '아빠를 쏙 빼닮았다' : p.resemble === 'M' ? '엄마를 쏙 빼닮았다' : p.resemble === 'mix' ? '엄마·아빠를 반반 닮았다' : '');

/** 꾸밈으로 오를 수 있는 매력 한도: 외모가 평범해도 가꾸면 꽤 오른다 */
export const charmCap = (p: Person) => Math.round(clamp(looksOf(p) * 0.5 + 48 + Math.min(10, (p.marks?.groom ?? 0) * 1.5), 30, 100));
