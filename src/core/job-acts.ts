// 직업 전용 행동: 모든 직업마다 그 일에서만 할 수 있는 행동 둘 + 그 직업에만 오는 「올해의 기회」 하나.
// 데이터는 job-acts-*.ts, 효과는 종류(kind)별 틀에 연봉 규모를 곱해서 정한다.
import type { ActionDef } from './actions';
import { JOBS, STAT_NAMES } from './data';
import { chance, pick } from './rng';
import { fmt, getFatigue, grow, jitter, rollTier, stat, TIER_MARK, type Delta, type Tier } from './practice';
import { clamp, head, mark } from './people';
import { formatMoney, jobTitle } from './economy';
import { sideJobOf } from './tracks';
import type { GameState, Person, StatKey } from './types';
import { JA1 } from './job-acts-1';
import { JA2 } from './job-acts-2';
import { JA3 } from './job-acts-3';
import { JA_HIDDEN } from './job-acts-hidden';

/** cash 수입 · fame 명성 · promo 승진 · skill 능력치 · net 인맥 · care 보람 · risk 한탕 · hp 체력 */
export type JaKind = 'cash' | 'fame' | 'promo' | 'skill' | 'net' | 'care' | 'risk' | 'hp';
/** [아이콘, 이름, 설명, 판정 능력치, 종류, '대박|보람|제자리|역효과'] */
export type JA = [string, string, string, StatKey, JaKind, string];

export const JOB_ACTS: Record<string, JA[]> = { ...JA1, ...JA2, ...JA3, ...JA_HIDDEN };

const HINT: Record<JaKind, (st: StatKey) => string> = {
  cash: () => '수입↑',
  fame: () => '명성↑',
  promo: (k) => `${STAT_NAMES[k]}↑ · 대박이면 승진`,
  skill: (k) => `${STAT_NAMES[k]}↑↑`,
  net: () => '인맥·매력↑',
  care: () => '성품·행복↑',
  risk: () => '크게 벌거나 크게 잃는다',
  hp: () => '체력·근력↑',
};

const IDX: Record<Tier, number> = { great: 0, good: 1, meh: 2, bad: 3 };
type T4 = [number, number, number, number];
const TAB: Record<JaKind, { cash?: T4; fame?: T4; hap: T4; hp?: T4 }> = {
  cash: { cash: [0.18, 0.06, 0, -0.03], hap: [6, 3, -1, -4] },
  fame: { fame: [3, 1, 0, -1], cash: [0.05, 0, 0, 0], hap: [8, 3, -1, -4] },
  promo: { hap: [8, 3, -2, -5] },
  skill: { hap: [4, 2, -1, -3] },
  net: { hap: [6, 3, 0, -3] },
  care: { fame: [1, 0, 0, 0], hap: [10, 6, 1, -2] },
  risk: { cash: [0.45, 0.12, -0.06, -0.2], hap: [10, 3, -3, -8] },
  hp: { hp: [0, 0, 0, -4], hap: [6, 3, 0, -4] },
};

/** 이 사람 일의 한 해 벌이 규모 (만원) */
function scaleOf(p: Person, job: string): number {
  const j = JOBS[job];
  if (!j) return 3000;
  const lv = job === p.job ? p.jobLevel : 0;
  return Math.max(2500, j.base ? j.base + j.perLevel * lv : 3500 + 1500 * lv);
}

function runJa(s: GameState, p: Person, job: string, a: JA, boost: number): string {
  const [, , , st, kind, lines] = a;
  const t = rollTier(s, p, { stat: st });
  const i = IDX[t];
  const f = getFatigue();
  const tab = TAB[kind];
  const out: Delta[] = [];
  const scale = scaleOf(p, job);
  if (kind === 'skill') out.push(stat(st, t === 'bad' ? 0 : grow(s, p, st, t, 1.1)));
  if (kind === 'promo') out.push(stat(st, t === 'bad' ? 0 : grow(s, p, st, t, 0.5)));
  if (kind === 'net') {
    if (t !== 'bad') mark(p, 'network', t === 'great' ? 2 : 1);
    out.push(stat('cha', t === 'bad' ? 0 : grow(s, p, 'cha', t, 0.5)));
  }
  if (kind === 'care') out.push(stat('mor', t === 'bad' ? 0 : grow(s, p, 'mor', t, 0.6)));
  if (kind === 'hp') {
    out.push(stat(st === 'hp' ? 'hp' : 'str', t === 'bad' ? 0 : grow(s, p, st === 'hp' ? 'hp' : 'str', t, 0.7)));
  }
  if (tab.cash) {
    const v = tab.cash[i] * scale * boost;
    const c = Math.round(jitter(s, Math.abs(v), 0.3) * Math.sign(v) * (v > 0 ? f : 1));
    if (c) {
      p.cash += c;
      out.push(`${c > 0 ? '+' : '−'}${formatMoney(Math.abs(c))}`);
    }
  }
  if (tab.fame) {
    const d = Math.round(tab.fame[i] * (tab.fame[i] > 0 ? boost : 1));
    s.fame = Math.max(0, s.fame + d);
    out.push(['명성', d]);
  }
  if (tab.hp) {
    p.actual.hp = clamp(p.actual.hp + tab.hp[i], 0, 100);
    out.push(stat('hp', tab.hp[i]));
  }
  const hp = Math.round(jitter(s, Math.abs(tab.hap[i]), 0.3) * Math.sign(tab.hap[i]));
  p.happiness = clamp(p.happiness + hp, 0, 100);
  out.push(['행복', hp]);
  let tail = '';
  const j = JOBS[job];
  if (kind === 'promo' && job === p.job && j && p.jobLevel < j.maxLevel && ((t === 'great' && chance(s, 0.45 * boost)) || (t === 'good' && chance(s, 0.08)))) {
    p.jobLevel++;
    p.jobYears = 0;
    tail += `\n→ ${jobTitle(p)}(으)로 승진!`;
  }
  const ls = lines.split('|');
  return TIER_MARK[t] + (ls[i] ?? ls[0]) + fmt(out) + tail;
}

/** 이 행동을 볼 사람: 본업 또는 겸직이 그 직업 */
const holds = (p: Person, job: string) => p.job === job || sideJobOf(p) === job;

function hnum(key: string): number {
  let x = 2166136261;
  for (const ch of key) x = Math.imul(x ^ ch.charCodeAt(0), 16777619);
  return Math.abs(x);
}

/** 행동 탭 전용 행동 (본업 둘) + 올해의 기회 (한 해 걸러 열 번에 일곱 번꼴) */
export function jobActions(): ActionDef[] {
  const out: ActionDef[] = [];
  for (const [job, list] of Object.entries(JOB_ACTS)) {
    list.forEach((a, k) => {
      const opp = k === 2;
      const id = `ja_${job}_${k}`;
      out.push({
        id,
        cat: opp ? '올해의 기회' : '내 직업',
        icon: a[0],
        name: a[1],
        desc: `${a[2] ? a[2] + ' · ' : ''}${HINT[a[4]](a[3])} (${STAT_NAMES[a[3]]})${opp ? ' · 올해만' : ''}`,
        ap: 1,
        stages: ['univ', 'prep', 'adult', 'senior'],
        show: (s) => {
          const p = head(s);
          if (!holds(p, job)) return false;
          return !opp || hnum(s.year + id) % 10 < 7;
        },
        blocked: opp ? (s) => (s.actUsed?.[id] ? '올해 이미 했다' : undefined) : undefined,
        run: (s) => runJa(s, head(s), job, a, opp ? 1.6 : 1),
      });
    });
  }
  return out;
}

/** 테스트용: 직업마다 전용 행동이 몇 개인지 */
export const jaCount = (job: string) => JOB_ACTS[job]?.length ?? 0;
export const pickJa = (s: GameState, job: string) => pick(s, JOB_ACTS[job] ?? []);
