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
import { JA4 } from './job-acts-4';
import { JA5 } from './job-acts-5';
import { JA6 } from './job-acts-6';
import { hiddenActs } from './job-acts-hidden';
import { jobDoor } from './hidden-quest';
import { grantRelic, hasRelic } from './relics';
import { nextTitle, tryPromote } from './rank';

/** cash 수입 · fame 명성 · promo 승진 · skill 능력치 · net 인맥 · care 보람 · risk 한탕 · hp 체력 · (히든) dark 큰 판 · legend 전설 · rest 숨 고르기 · jackpot 일생일대 */
export type JaKind = 'cash' | 'fame' | 'promo' | 'skill' | 'net' | 'care' | 'risk' | 'hp' | 'dark' | 'legend' | 'rest' | 'jackpot';
/** lo 신참 때만 · hi 고참 때만 · opp 올해의 기회 (없으면 늘) */
export type Band = 'lo' | 'hi' | 'opp';
/** [아이콘, 이름, 설명, 판정 능력치, 종류, '대박|보람|제자리|역효과', 직급 구간] */
export type JA = [string, string, string, StatKey, JaKind, string, Band?];

const BASE: Record<string, JA[]> = { ...JA1, ...JA2, ...JA3 };
const MORE: Record<string, JA[]> = { ...JA4, ...JA5, ...JA6 };
/** 직업마다: 기본 둘 + 올해의 기회 + 신참·고참 전용 + 올해의 기회 하나 더. 히든은 따로 */
export const JOB_ACTS: Record<string, JA[]> = Object.fromEntries(
  Object.entries(BASE).map(([id, l]) => [id, [...l.map((a, k): JA => (k === 2 ? [a[0], a[1], a[2], a[3], a[4], a[5], 'opp'] : a)), ...(MORE[id] ?? [])]]),
);
Object.assign(JOB_ACTS, hiddenActs());

const HINT: Record<JaKind, (st: StatKey) => string> = {
  cash: () => '수입↑',
  fame: () => '명성↑',
  promo: (k) => `${STAT_NAMES[k]}↑ · 대박이면 승진`,
  skill: (k) => `${STAT_NAMES[k]}↑↑`,
  net: () => '인맥·매력↑',
  care: () => '성품·행복↑',
  risk: () => '크게 벌거나 크게 잃는다',
  hp: () => '체력·근력↑',
  dark: () => '큰 대가, 큰 보상 · 삐끗하면 위기',
  legend: () => '명성↑↑ · 가끔 뒤탈',
  rest: () => '건강·행복 회복 · 안전',
  jackpot: () => '일생일대의 한 판: 인생이 바뀌거나 크게 다친다',
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
  dark: { cash: [0.9, 0.3, -0.1, -0.4], fame: [2, 1, 0, -1], hap: [10, 4, -2, -6], hp: [0, 0, -2, -6] },
  legend: { fame: [5, 2, 0, -2], hap: [10, 4, 0, -4] },
  rest: { hap: [10, 6, 3, 0], hp: [6, 4, 2, 0] },
  jackpot: { cash: [2.2, 0.7, -0.3, -0.9], fame: [6, 2, 0, -3], hap: [15, 5, -4, -10], hp: [0, 0, -4, -10] },
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
    // 평정이 좋아도 승진 연한은 채워야 한다 (rank.ts STEPS)
    if (tryPromote(s.year, p, 1)) tail += `\n→ ${jobTitle(p)}(으)로 승진!`;
    else tail += `\n(평가는 좋았지만 ${jobTitle(p)} 승진 연한이 아직 남았다)`;
  }
  // 히든 일의 대가: 삐끗하면 위기가 찾아온다
  const riskP = { dark: 0.4, jackpot: 0.6, legend: 0.2 }[kind as 'dark'] ?? 0;
  if (riskP && t === 'bad' && chance(s, riskP)) {
    s.events.push({ uid: s.eventSeq++, defId: 'hid_risk', personId: p.id, data: { id: p.job } });
    tail += '\n⚠ 뒤탈이 났다…';
  }
  if (kind === 'jackpot' && t === 'great' && !p.flags.includes('hid_jackpot')) p.flags.push('hid_jackpot');
  // 일 속에서 숨은 길의 단서를 만나기도 한다
  if (t === 'great') tail += jobDoor(s, p);
  // 일에서 위대한 업적(대박)을 이루면 가문의 영원한 가보를 획득하기도 한다
  if (t === 'great') tail += tryJobRelic(s, p, job);
  const ls = lines.split('|');
  return TIER_MARK[t] + (ls[i] ?? ls[0]) + fmt(out) + tail;
}

const JOB_RELIC_MAP: Record<string, string> = {
  president: 'relic_presidential_medal',
  landlord: 'relic_building_deed',
  politician: 'relic_law_plaque',
  minister: 'relic_law_plaque',
  mayor: 'relic_law_plaque',
  hj_chess_master: 'relic_chess_board',
  chess_player: 'relic_chess_board',
  hj_hacker: 'relic_cold_wallet',
  hj_underground_dealer: 'relic_casino_chip',
  hj_private_jet: 'relic_gold_wings',
  hj_adventurer: 'relic_ancient_compass',
  hj_mafia: 'relic_family_ring',
  hj_godmother: 'relic_family_ring',
  hj_vampire: 'relic_vampire_pendant',
  painter: 'relic_masterpiece',
  hj_forger: 'relic_masterpiece',
  hj_exorcist: 'relic_sacred_bell',
  hj_shaman: 'relic_sacred_bell',
};

function tryJobRelic(s: GameState, p: Person, job: string): string {
  const relicId = JOB_RELIC_MAP[job];
  if (!relicId || hasRelic(s, relicId)) return '';
  const res = grantRelic(s, p, relicId);
  return res ? '\n' + res : '';
}

/** 이 행동을 볼 사람: 본업 또는 겸직이 그 직업 */
const holds = (p: Person, job: string) => p.job === job || sideJobOf(p) === job;

function hnum(key: string): number {
  let x = 2166136261;
  for (const ch of key) x = Math.imul(x ^ ch.charCodeAt(0), 16777619);
  return Math.abs(x);
}

/** 직급 구간: 직급 사다리의 아래 절반은 신참, 위 절반은 고참 (히든 직업은 햇수로) */
function inBand(p: Person, job: string, band?: Band): boolean {
  if (!band || band === 'opp') return true;
  // 히든 직업은 직급이 없다: 3년 안이면 입문, 넘으면 고참
  if (job.startsWith('hj_')) return band === 'lo' ? p.jobYears < 3 : p.jobYears >= 3;
  const max = JOBS[job]?.maxLevel ?? 0;
  const mid = Math.max(1, Math.ceil(max / 2));
  return band === 'lo' ? p.jobLevel < mid : p.jobLevel >= mid;
}

/** 행동 탭 전용 행동 + 올해의 기회 (열 해에 일곱 번꼴) */
export function jobActions(): ActionDef[] {
  const out: ActionDef[] = [];
  for (const [job, list] of Object.entries(JOB_ACTS)) {
    list.forEach((a, k) => {
      const band = a[6];
      const opp = band === 'opp';
      const id = `ja_${job}_${k}`;
      const pay = JOBS[job]?.base || 3500;
      const cost = a[4] === 'dark' ? Math.round(pay * 0.06) : a[4] === 'jackpot' ? Math.round(pay * 0.15) : undefined;
      out.push({
        id,
        cat: opp ? '올해의 기회' : '내 직업',
        icon: a[0],
        name: a[1] + (band === 'lo' ? ' 🌱' : band === 'hi' ? ' 🎖' : ''),
        desc: `${a[2] ? a[2] + ' · ' : ''}${HINT[a[4]](a[3])} (${STAT_NAMES[a[3]]})${band === 'lo' ? ' · 신참 때만' : band === 'hi' ? ' · 고참만' : ''}${opp ? ' · 올해만' : ''}`,
        ap: a[4] === 'jackpot' ? 2 : 1,
        cost,
        // 승진 행동은 지금 직급에 맞춰 "다음 자리"를 보여 준다 (3급인데 '6급·5급을 향해'가 뜨지 않게)
        label:
          a[4] === 'promo'
            ? (s) => {
                const p = head(s);
                const nx = p.job === job ? nextTitle(p) : undefined;
                const name = a[1] + (band === 'lo' ? ' 🌱' : band === 'hi' ? ' 🎖' : '');
                const goal = nx ? `${nx}을(를) 향해 · ${STAT_NAMES[a[3]]}↑ · 대박이면 승진 (승진 연한을 채워야)` : `이미 최고 자리 · ${STAT_NAMES[a[3]]}↑ · 평판 관리`;
                return { name, desc: `${goal} (${STAT_NAMES[a[3]]})${opp ? ' · 올해만' : ''}` };
              }
            : undefined,
        stages: ['univ', 'prep', 'adult', 'senior'],
        show: (s) => {
          const p = head(s);
          if (!holds(p, job) || !inBand(p, job, band)) return false;
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
