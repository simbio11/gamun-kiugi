// 인생 점수: 한 사람의 일생(배움·일·돈·가정·행복·명예)을 점수로. 가문 총점은 조상부터 지금까지 모두 더한 것.

import { JOBS } from './data';
import { personWorth } from './economy';
import { CARD } from './cards';
import { HONORS, grant, type Rarity } from './rewards';
import { age, alive, fullName, isMainline } from './people';
import type { GameState, Person } from './types';

export interface ScorePart {
  label: string;
  v: number;
}
const RARITY_V: Record<Rarity, number> = { common: 10, rare: 20, epic: 35, legend: 60 };

/** 한 사람의 인생 점수 (항목별) */
export function lifeParts(s: GameState, p: Person): ScorePart[] {
  const f = (x: string) => p.flags.includes(x);
  const edu = (f('univ_top') ? 18 : f('univ_seoul') ? 12 : f('univ_local') ? 7 : f('college') ? 4 : 0) + (f('phd') ? 10 : 0) + (f('abroad_grad') ? 5 : 0) + (f('high_elite') ? 3 : 0);
  const j = JOBS[p.job];
  const jobNow = j && !['none', 'parttime', 'pension'].includes(p.job) ? Math.round(j.fame * 6 + p.jobLevel * 5 + (j.maxLevel && p.jobLevel >= j.maxLevel ? 8 : 0)) : 0;
  const career = Math.min(80, Math.max(p.peak ?? 0, jobNow));
  const w = personWorth(s, p);
  const money = w > 0 ? Math.min(60, Math.round(Math.log10(w / 1000 + 1) * 18)) : Math.max(-20, Math.round(w / 5000));
  const kids = p.childIds.map((id) => s.people[id]).filter(Boolean);
  const grand = kids.flatMap((k) => k.childIds);
  const family = (p.spouseId ? 10 : 0) + Math.min(30, kids.length * 7) + Math.min(20, grand.length * 3) + (f('remarried') ? -2 : 0);
  const happy = Math.round(p.happiness / 5);
  const honor = (s.honors ?? []).filter((h) => h.personId === p.id).reduce((t, h) => t + HONORS[h.id].fame * 2, 0);
  const cards = (s.cards ?? []).filter((c) => c.personId === p.id).reduce((t, c) => t + RARITY_V[CARD[c.id]?.rarity ?? 'common'], 0);
  const a = alive(p) ? age(s, p) : (p.deathYear ?? s.year) - p.birthYear;
  const life = a >= 100 ? 20 : a >= 90 ? 12 : a >= 80 ? 6 : a < 50 && !alive(p) ? -5 : 0;
  const shame = (f('criminal') ? -30 : 0) + (f('dui') ? -10 : 0) + (f('bankrupt') ? -10 : 0) + (f('draft_dodger') ? -15 : 0);
  return [
    { label: '🎓 배움', v: edu },
    { label: '💼 일', v: career },
    { label: '💰 재산', v: money },
    { label: '👪 가정', v: family },
    { label: '😊 행복', v: happy },
    { label: '🎖 훈장', v: honor },
    { label: '🃏 카드', v: cards },
    { label: '🕰 장수', v: life },
    { label: '⚠ 오점', v: shame },
  ].filter((x) => x.v !== 0);
}
export const lifeScore = (s: GameState, p: Person) => p.lifeScore ?? lifeParts(s, p).reduce((t, x) => t + x.v, 0);
export function lifeGrade(v: number): { g: string; r: Rarity } {
  if (v >= 260) return { g: 'SSS', r: 'legend' };
  if (v >= 200) return { g: 'SS', r: 'legend' };
  if (v >= 150) return { g: 'S', r: 'epic' };
  if (v >= 110) return { g: 'A', r: 'epic' };
  if (v >= 80) return { g: 'B', r: 'rare' };
  if (v >= 50) return { g: 'C', r: 'common' };
  return { g: 'D', r: 'common' };
}

/** 해마다: 지금까지 오른 가장 높은 자리를 기억 (은퇴해도 경력은 남는다) */
export function trackPeak(s: GameState) {
  for (const p of Object.values(s.people)) {
    if (!alive(p)) continue;
    const j = JOBS[p.job];
    if (!j || ['none', 'parttime', 'pension'].includes(p.job)) continue;
    const v = Math.round(j.fame * 6 + p.jobLevel * 5 + (j.maxLevel && p.jobLevel >= j.maxLevel ? 8 : 0));
    if (v > (p.peak ?? 0)) {
      p.peak = v;
      // 가장 높았던 자리 (부고·인생 신문용): peakjob:직업:직함
      const title = j.titles?.[p.jobLevel] ?? j.name;
      p.flags = p.flags.filter((f) => !f.startsWith('peakjob:'));
      p.flags.push(`peakjob:${p.job}:${j.titles && !title.includes(j.name) && !j.name.includes(title) ? `${j.name} ${title}` : title}`);
    }
  }
}

/** 세상을 떠날 때: 인생 성적표 */
export function lifeReport(s: GameState, p: Person) {
  const parts = lifeParts(s, p);
  const v = parts.reduce((t, x) => t + x.v, 0);
  p.lifeScore = v;
  const { g, r } = lifeGrade(v);
  const a = (p.deathYear ?? s.year) - p.birthYear;
  grant(
    s,
    '📜',
    `인생 성적표: ${fullName(p)} — ${g}등급 (${v}점)`,
    `${p.birthYear}~${p.deathYear} · 향년 ${a}세\n` + parts.map((x) => `${x.label} ${x.v > 0 ? '+' : ''}${x.v}`).join('  ·  ') + `\n\n이 점수는 가문 총점에 영원히 더해진다.`,
    r,
    Math.max(0, Math.round(v / 10)),
  );
  const rw = s.rewards?.[s.rewards.length - 1];
  if (rw) (rw.personId = p.id), (rw.grade = g);
}

/** 가문 총점: 조상들의 인생 점수 + 지금 살아 있는 직계의 현재 점수 + 가문의 업적 */
export function familyScore(s: GameState): { total: number; parts: ScorePart[] } {
  const line = Object.values(s.people).filter((p) => !p.inLaw && (p.lifeScore !== undefined || (alive(p) && isMainline(s, p))));
  const ancestors = line.filter((p) => p.lifeScore !== undefined).reduce((t, p) => t + p.lifeScore!, 0);
  const living = line.filter((p) => alive(p) && isMainline(s, p) && age(s, p) >= 15).reduce((t, p) => t + Math.round(lifeScore(s, p) * 0.5), 0);
  const parts: ScorePart[] = [
    { label: '📜 조상들의 인생', v: ancestors },
    { label: '👪 지금 가족 (절반 반영)', v: living },
    { label: '✦ 누적 명예', v: s.gloryTotal ?? 0 },
    { label: '🏆 업적', v: s.achievements.length * 5 },
    { label: '🃏 카드 도감', v: new Set((s.cards ?? []).map((c) => c.id)).size * 20 },
    { label: '🎖 훈장', v: (s.honors ?? []).length * 15 },
    { label: '🌳 세대', v: (s.generation - 1) * 25 },
    { label: '⭐ 명성', v: Math.round(s.fame / 2) },
  ].filter((x) => x.v);
  return { total: parts.reduce((t, x) => t + x.v, 0), parts };
}
