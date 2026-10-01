// 인생의 작은 경사들: 결혼·출산·합격·첫 직장·승진·내 집 마련·재산 돌파.
// 해마다, 그리고 선택을 할 때마다 훑어서 처음 이룬 것만 보상한다 (한 번씩).

import { rankLadder, rankWord } from './rank';
import { JOBS } from './data';
import { formatMoney, jobTitle } from './economy';
import { homeOf } from './housing';
import { alive, age, fullName, isMainline } from './people';
import { grant, type Rarity } from './rewards';
import type { GameState } from './types';

const WORTH_STEPS: [number, Rarity][] = [
  [10000, 'common'],
  [50000, 'common'],
  [100000, 'rare'],
  [300000, 'rare'],
  [500000, 'epic'],
];

export function scanMilestones(s: GameState, worth: number) {
  const seen = (s.storySeen ??= {});
  // 처음 훑을 때(새 게임·예전 저장)는 이미 있던 것들을 조용히 기록만 한다
  const silent = seen['ms:init'] === undefined;
  seen['ms:init'] ??= s.year;
  const once = (key: string, fn: () => void) => {
    if (seen['ms:' + key] !== undefined) return;
    seen['ms:' + key] = s.year;
    if (!silent) fn();
  };
  for (const [v, r] of WORTH_STEPS) if (worth >= v) once('worth:' + v, () => grant(s, '💰', `가문 재산 ${formatMoney(v)} 돌파`, `${s.familyName}씨 가문 재산이 ${formatMoney(v)}을 넘었다.`, r));
  const h = s.people[s.headId];
  if (h && homeOf(s, h)?.type === 'own') once('home', () => grant(s, '🏠', '내 집 마련', '월세·전세를 벗어나 우리 이름으로 된 집이 생겼다!', 'rare'));
  for (const p of Object.values(s.people)) {
    if (!alive(p) || p.inLaw || !isMainline(s, p)) continue;
    const n = fullName(p);
    const k = (x: string) => `${p.id}:${x}`;
    if (p.birthYear >= s.year - 1 && p.id !== s.headId && s.year > s.startYear) once(k('born'), () => grant(s, '👶', `새 식구: ${n}`, '가문에 아기가 태어났다.', 'common', 4));
    if (p.spouseId && alive(s.people[p.spouseId])) once(k('wed'), () => grant(s, '💍', `결혼: ${n}`, `${fullName(s.people[p.spouseId!])}와(과) 부부가 됐다.`, 'common', 4));
    if (p.flags.includes('high_elite') || p.flags.includes('mid_intl') || p.flags.includes('mid_art')) once(k('elite_school'), () => grant(s, '🏫', `특목고·국제중 합격: ${n}`, '명문 학교에 들어갔다.', 'common', 4));
    const school = p.flags.find((f) => f.startsWith('school:'))?.slice(7);
    if (school) {
      const top = p.flags.includes('univ_top') || p.flags.includes('abroad_grad');
      once(k('univ'), () => grant(s, '🎓', `${top ? '명문대' : '대학'} 합격: ${n}`, school, top ? 'rare' : 'common', top ? 12 : 4));
    }
    if (age(s, p) >= 18 && !['none', 'parttime', 'pension'].includes(p.job) && !p.flags.includes('student')) {
      const how = JOBS[p.job]?.entry?.how;
      if (how === 'exam' || how === 'school') once(k('exam:' + p.job), () => grant(s, '📜', `합격: ${n} ${JOBS[p.job].name}`, '긴 수험 생활 끝에 꿈을 이뤘다.', 'rare'));
      once(k('job'), () => grant(s, '💼', `첫 직장: ${n}`, `${JOBS[p.job].name}(으)로 사회생활을 시작했다.`, 'common', 3));
      // 승진: 이 직업에서 처음 오른 직급
      const key = `lv:${p.id}:${p.job}`;
      const best = seen[key] ?? p.jobLevel;
      if (!silent && p.jobLevel > best && JOBS[p.job]?.titles) grant(s, rankWord(p.job).icon, `${rankWord(p.job).verb}: ${n} → ${jobTitle(p)}`, rankLadder(p), p.jobLevel >= (JOBS[p.job].maxLevel ?? 9) ? 'rare' : 'common', p.jobLevel >= (JOBS[p.job].maxLevel ?? 9) ? 12 : 3);
      seen[key] = Math.max(best, p.jobLevel);
    }
  }
}
