// 숨은 길 (단계별 미션): 단서 → 세 단계 시험 → 히든 직업 제안.
// 단서는 ① 해마다 뜻밖의 사건 ② 「숨은 길」 탐색 행동 ③ 직업 행동에서 대박이 났을 때 찾아온다.
// 번듯한 직업이 없는 사람(백수·알바·신참·영세 자영업)에게 훨씬 잘 온다. 번듯한 고위직은 드물다.
import { HIDDEN_RATE, hiddenMastery, novelty } from './hidden-mastery';
import type { ActionDef } from './actions';
import { JOBS, STAT_NAMES } from './data';
import { HIDDEN_BY_ID, isSuperHidden } from './hidden-data';
import { addFlag, age, alive, clamp, fullName, head, isMainline } from './people';
import { fmt, rollTier, TIER_MARK, type Tier } from './practice';
import { chance, next, pick } from './rng';
import type { GameState, Person, StatKey } from './types';
import type { EventDef } from './ev-util';

/** 히든 직업마다: 나이대, 필요한 능력치 (느슨하게), 시대, 시험에 쓰는 능력치 */
interface Lean {
  a: [number, number];
  need?: [StatKey, number];
  from?: number;
  stat: StatKey;
}
const LEAN: Record<string, Lean> = {
  hj_adventurer: { a: [20, 50], need: ['hp', 50], stat: 'hp' },
  hj_magician: { a: [18, 50], need: ['cha', 48], stat: 'cha' },
  hj_shaman: { a: [20, 60], stat: 'mor' },
  hj_cult: { a: [28, 70], need: ['cha', 52], stat: 'cha' },
  hj_memecoin: { a: [18, 60], from: 2013, stat: 'int' },
  hj_gambler: { a: [20, 65], stat: 'cha' },
  hj_natural: { a: [38, 75], stat: 'hp' },
  hj_hermit: { a: [20, 40], stat: 'int' },
  hj_assassin: { a: [22, 50], need: ['str', 55], stat: 'str' },
  hj_hacker: { a: [16, 50], need: ['int', 58], from: 1995, stat: 'int' },
  hj_spy: { a: [24, 50], need: ['int', 52], stat: 'int' },
  hj_smuggler: { a: [25, 60], stat: 'int' },
  hj_pirate: { a: [20, 50], need: ['str', 50], stat: 'str' },
  hj_mercenary: { a: [22, 50], need: ['str', 55], stat: 'str' },
  hj_mafia: { a: [28, 65], need: ['cha', 52], stat: 'cha' },
  hj_godmother: { a: [28, 65], need: ['cha', 52], stat: 'cha' },
  hj_trader: { a: [25, 50], need: ['int', 58], from: 1985, stat: 'int' },
  hj_bounty: { a: [28, 55], need: ['str', 52], stat: 'str' },
  hj_tarot: { a: [20, 75], stat: 'cha' },
  hj_thief: { a: [20, 45], need: ['int', 56], stat: 'int' },
  hj_exorcist: { a: [28, 75], need: ['mor', 52], stat: 'mor' },
  hj_nomad: { a: [22, 55], stat: 'hp' },
  hj_fighter: { a: [19, 38], need: ['str', 56], stat: 'str' },
  hj_forger: { a: [25, 70], need: ['cha', 50], stat: 'cha' },
};
export const QUEST_IDS = Object.keys(LEAN);
const STEPS = ['단서 모으기', '시험 통과하기', '문 두드리기'];

const questOf = (p: Person) => p.flags.find((f) => f.startsWith('hq:'))?.slice(3);
const stepOf = (p: Person) => Number(p.flags.find((f) => f.startsWith('hqs:'))?.slice(4) ?? 0);
function setStep(p: Person, n: number) {
  p.flags = p.flags.filter((f) => !f.startsWith('hqs:'));
  p.flags.push('hqs:' + n);
}
function endQuest(p: Person) {
  p.flags = p.flags.filter((f) => !f.startsWith('hq:') && !f.startsWith('hqs:'));
}

/** 번듯한 직업이 없을수록 숨은 길이 잘 보인다 */
export function lowly(p: Person): number {
  if (['none', 'parttime'].includes(p.job)) return 2.5;
  const j = JOBS[p.job];
  if (!j) return 1;
  const pay = j.base + j.perLevel * p.jobLevel;
  if (pay >= 9000 || ['politician', 'minister', 'president', 'mayor', 'judge', 'prosecutor'].includes(p.job)) return 0.35;
  if (p.jobLevel <= 1 || pay < 3800) return 1.8;
  return 1;
}

/** 이 사람이 걸어 볼 수 있는 숨은 길들 */
export function eligible(s: GameState, p: Person): string[] {
  const a = age(s, p);
  return QUEST_IDS.filter((id) => {
    const l = LEAN[id];
    if (a < l.a[0] || a > l.a[1]) return false;
    if (l.from && s.year < l.from) return false;
    if (id === 'hj_hermit' && !['none', 'parttime'].includes(p.job)) return false;
    return !l.need || p.actual[l.need[0]] >= l.need[1];
  });
}

const busy = (p: Person) => p.job.startsWith('hj_') || !!questOf(p) || p.flags.includes('student');

/** 숨은 길을 연다 (단서 발견). 연 길의 힌트를 돌려준다 */
function startQuest(s: GameState, p: Person, id: string): string {
  endQuest(p);
  addFlag(p, 'hq:' + id);
  setStep(p, 0);
  (s.storySeen ??= {})[`hq:${p.id}`] = s.year;
  return `🌑 숨은 길의 단서: "${HIDDEN_BY_ID[id].hint}"\n(행동 탭 「내 직업」 맨 위의 🌑 숨은 길을 따라가면, 세 단계 끝에 히든 직업의 문이 열린다)`;
}

/** 직업 행동에서 대박이 나면 가끔 단서를 줍는다 */
export function jobDoor(s: GameState, p: Person): string {
  if (busy(p) || !chance(s, 0.08 * lowly(p))) return '';
  const ids = eligible(s, p);
  return ids.length ? '\n\n' + startQuest(s, p, pick(s, ids)) : '';
}

/** 해마다: 가족에게 단서가 찾아오고, 가주가 아닌 사람은 스스로 길을 걷는다 */
export function questYear(s: GameState): void {
  const seen = (s.storySeen ??= {});
  const hd = head(s);
  for (const p of Object.values(s.people)) {
    if (!alive(p) || !isMainline(s, p) || age(s, p) < 16) continue;
    const q = questOf(p);
    if (q) {
      if ((seen[`hq:${p.id}`] ?? s.year) < s.year - 10) {
        endQuest(p); // 10년 동안 못 따라가면 길이 흐려진다
        continue;
      }
      if (p.id !== hd.id && chance(s, 0.3 + (p.actual[LEAN[q].stat] - 50) / 200)) advance(s, p, q);
      continue;
    }
    if (busy(p) || (seen[`hqx:${p.id}`] ?? -99) > s.year - 4) continue;
    const ids = eligible(s, p);
    if (!ids.length) continue;
    // 가문에서 이미 나온 직업일수록 덜 고른다 (대대로 다른 길)
    const w = ids.map((id) => novelty(s, id));
    const tot = w.reduce((a, b) => a + b, 0);
    if (!chance(s, 0.035 * HIDDEN_RATE * hiddenMastery(s).hid * lowly(p) * Math.min(1, tot / Math.max(1, ids.length) * 1.5))) continue;
    let r = next(s) * tot;
    const id = ids.find((_, i) => (r -= w[i]) < 0) ?? ids[ids.length - 1];
    seen[`hqx:${p.id}`] = s.year;
    s.events.push({ uid: s.eventSeq++, defId: 'hid_clue', personId: p.id, data: { id } });
  }
}

/** 한 단계 나아간다. 마지막 단계를 넘으면 제안이 온다 (슈퍼 히든은 3단계 사연의 1단계로 이어진다) */
function advance(s: GameState, p: Person, id: string): string {
  const n = stepOf(p) + 1;
  if (n >= STEPS.length) {
    endQuest(p);
    if (isSuperHidden(id)) {
      s.events.push({ uid: s.eventSeq++, defId: 'sh_step1', personId: p.id, data: { id } });
      return '🚪 마지막 문이 열렸다. 곧 대부의 부름이 올 것이다…';
    }
    s.events.push({ uid: s.eventSeq++, defId: 'hid_offer', personId: p.id, data: { id } });
    return '🚪 마지막 문이 열렸다. 곧 누군가 찾아올 것이다…';
  }
  setStep(p, n);
  return `🌑 숨은 길 ${n}/${STEPS.length} 통과. 다음: ${STEPS[n]}`;
}

const clue: EventDef = {
  id: 'hid_clue',
  title: () => '🌑 수상한 단서',
  valid: (c) => alive(c.p) && !busy(c.p),
  text: (c) =>
    `${fullName(c.p)}의 일상에 이상한 틈이 생겼다.\n\n"${HIDDEN_BY_ID[c.ev.data.id].hint}"\n\n이 단서를 쫓으면 세 단계의 시험 끝에 히든 직업의 문이 열린다. (어떤 직업인지는 끝에 가서야 안다)`,
  choices: () => [
    { label: '🌑 단서를 쫓는다', run: (x) => startQuest(x.s, x.p, x.ev.data.id) },
    { label: '못 본 척한다', run: () => '평범한 하루로 돌아갔다.' },
  ],
};
export const QUEST_EVENTS = [clue];

const door = (id: string, icon: string, name: string, desc: string, st: StatKey, lines: Record<Tier, string>): ActionDef => ({
  id,
  cat: '내 직업',
  icon,
  name,
  desc: `${desc} · 숨은 길 단서를 찾는다 (${STAT_NAMES[st]}) · 번듯한 직업이 없을수록 잘 보인다`,
  ap: 1,
  cost: 30,
  stages: ['univ', 'prep', 'adult', 'senior'],
  show: (s) => !busy(head(s)),
  run: (s) => {
    const p = head(s);
    const t = rollTier(s, p, { stat: st, bonus: lowly(p) > 1.5 ? 0.06 : 0 });
    const ids = eligible(s, p);
    const pr = { great: 0.5, good: 0.18, meh: 0.04, bad: 0 }[t] * Math.min(2, lowly(p));
    const hap = { great: 6, good: 3, meh: 0, bad: -3 }[t];
    p.happiness = clamp(p.happiness + hap, 0, 100);
    let out = TIER_MARK[t] + lines[t] + fmt([['행복', hap]]);
    if (ids.length && chance(s, pr)) out += '\n\n' + startQuest(s, p, pick(s, ids));
    else if (!ids.length) out += '\n(지금 나이·능력으로 걸을 수 있는 숨은 길이 없다)';
    return out;
  },
});

export const QUEST_ACTIONS: ActionDef[] = [
  {
    id: 'hq_step',
    cat: '내 직업',
    icon: '🌑',
    name: '숨은 길 따라가기',
    desc: '단서를 쫓아 한 단계씩',
    ap: 1,
    stages: ['univ', 'prep', 'adult', 'senior'],
    show: (s) => !!questOf(head(s)),
    // 한 해에 두 번까지: 세 단계를 끝내려면 적어도 두 해가 걸린다
    blocked: (s) => ((s.storySeen ?? {})[`hqn:${s.year}`] ?? 0) >= 2 ? '올해는 더 나아갈 수 없다 (한 해 2번)' : undefined,
    label: (s) => {
      const p = head(s);
      const q = questOf(p);
      if (!q) return { name: '숨은 길 따라가기', desc: '' };
      const n = stepOf(p);
      return { name: `🌑 숨은 길 ${n + 1}/${STEPS.length}: ${STEPS[n]}`, desc: `"${HIDDEN_BY_ID[q].hint}" · ${STAT_NAMES[LEAN[q].stat]}로 판정 · 한 해 2번까지` };
    },
    run: (s) => {
      const p = head(s);
      const q = questOf(p)!;
      const sn = (s.storySeen ??= {});
      sn[`hqn:${s.year}`] = (sn[`hqn:${s.year}`] ?? 0) + 1;
      const t = rollTier(s, p, { stat: LEAN[q].stat, bonus: lowly(p) > 1.5 ? 0.03 : -0.03 });
      if (t === 'great') return TIER_MARK[t] + '확신이 섰다. 한 걸음 나아갔다.\n' + advance(s, p, q);
      if (t === 'good') return chance(s, 0.75) ? '한 걸음 더 다가갔다.\n' + advance(s, p, q) : '거의 다 왔는데, 마지막 순간 단서가 흐려졌다.';
      if (t === 'meh') return '헛걸음이었다. 단서는 아직 살아 있다.';
      p.actual.hp = clamp(p.actual.hp - 3, 0, 100);
      if (chance(s, 0.2)) {
        endQuest(p);
        return TIER_MARK[t] + '길을 잃었다. 단서가 끊겼다. (건강 −3)';
      }
      return TIER_MARK[t] + '호되게 당했다. 그래도 단서는 쥐고 있다. (건강 −3)';
    },
  },
  door('hq_night', '🌙', '밤거리 헤매기', '낯선 골목, 낯선 사람들', 'cha', {
    great: '새벽까지 이어진 낯선 인연. 흥미로운 이야기를 들었다.',
    good: '처음 가 보는 동네를 걸었다.',
    meh: '별일 없었다.',
    bad: '길을 잃고 택시비만 날렸다.',
  }),
  door('hq_wander', '🧭', '무작정 떠나기', '배낭 하나 메고', 'hp', {
    great: '길 위에서 잊을 수 없는 일을 겪었다.',
    good: '낯선 풍경이 마음을 흔들었다.',
    meh: '피곤하기만 했다.',
    bad: '비를 쫄딱 맞고 감기에 걸렸다.',
  }),
  door('hq_books', '📚', '헌책방·벼룩시장 뒤지기', '먼지 속 수상한 물건', 'int', {
    great: '낡은 물건 사이에서 이상한 쪽지를 찾았다.',
    good: '재미있는 물건을 샀다.',
    meh: '먼지만 마셨다.',
    bad: '가짜 골동품에 돈을 날렸다.',
  }),
];

/** 테스트용 */
export const _quest = { questOf, stepOf, startQuest, LEAN };
