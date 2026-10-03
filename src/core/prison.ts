// 수감 생활: 교도소에 있는 몇 해는 "취준생"이 아니다. 그 안에서 할 수 있는 일만 하고(행동 탭 「수감」),
// 담장 안의 일이 해마다 찾아오며, 모범수는 형기를 다 채우기 전에 가석방될 수 있다.
//
// 참고: 형법 제72조(가석방: 형기의 1/3 이상 지나고 행상이 양호하면) — 실제 가석방은 대개 형기의 70~90% 시점,
//       교도작업 작업장려금(법무부 교정본부, 하루 수천 원~1만 원대 → 한 해 수십~200만 원 안팎),
//       수형자 검정고시·학위·자격 취득 교육(교정본부 교육·교화 프로그램), 수용자 접견(가족 면회) 제도.

import { pick } from './rng';
import { gate, type Choice, type Ctx, type EventDef } from './ev-util';
import { addFlag, alive, check, checkOdds, clamp, fullName, hasFlag, head, isMainline, mark, parentsOf, spouseOf } from './people';
import { fmt, grow, jitter, rollTier, stat, TIER_MARK, type Delta, type Tier } from './practice';
import { formatMoney } from './economy';
import { wageIndex } from './pay';
import type { ActionDef } from './actions';
import type { GameState, Person, StatKey } from './types';

export const inPrison = (p: Person) => p.flags.includes('in_prison');
/** 남은 형기 (해) */
export const prisonLeft = (p: Person) => Number(p.flags.find((f) => f.startsWith('prison_term:'))?.slice(12) ?? 1);
/** 모범 점수: 모범수 생활·교도작업·교육을 잘하면 쌓이고, 가석방 심사에 쓰인다 */
const merit = (p: Person) => Number(p.flags.find((f) => f.startsWith('merit:'))?.slice(6) ?? 0);
function addMerit(p: Person, d: number) {
  const v = Math.max(0, merit(p) + d);
  p.flags = p.flags.filter((f) => !f.startsWith('merit:'));
  if (v) p.flags.push('merit:' + v);
}

const hap = (p: Person, d: number) => (p.happiness = clamp(p.happiness + d, 0, 100));
const up = (p: Person, k: StatKey, d: number) => (p.actual[k] = clamp(p.actual[k] + d, 0, 100));
const IDX: Record<Tier, number> = { great: 0, good: 1, meh: 2, bad: 3 };
const dissident = (p: Person) => hasFlag(p, 'jailed_dissident');

// ───────────────────────── 수감 중 행동 ─────────────────────────

/** [id, 아이콘, 이름, 설명, 판정, 키울 능력치, 행복 4단, '대박|보람|제자리|역효과', 추가 효과] */
type PA = [string, string, string, string, StatKey, StatKey | undefined, [number, number, number, number], string, ((s: GameState, p: Person, t: Tier) => Delta[])?];

const PRISON_ACTS: PA[] = [
  ['pr_work', '🧵', '교도작업 출역', '작업장려금(적은 돈) · 근력↑ · 모범 점수', 'str', 'str', [4, 2, -1, -4], '작업반장으로 뽑혔다. 장려금이 두 배다.|봉제 작업 할당량을 채웠다.|하루하루가 똑같다.|기계에 손을 다쳤다.', (s, p, t) => {
    const v = Math.round([200, 120, 70, 30][IDX[t]] * wageIndex(s.year));
    p.cash += v;
    if (t !== 'bad') addMerit(p, t === 'great' ? 2 : 1);
    else up(p, 'hp', -3);
    return [`작업장려금 +${formatMoney(v)}`, ...(t === 'bad' ? [stat('hp', -3)] : ['모범 점수↑'])];
  }],
  ['pr_study', '📖', '검정고시·자격증 공부', '지능↑ · 출소 뒤를 준비한다 (자격증)', 'int', 'int', [6, 3, -1, -3], '수형자 교육 과정에서 자격증을 땄다!|책 한 권을 다 뗐다.|소음 때문에 집중이 안 된다.|책을 빼앗겼다.', (_s, p, t) => (t === 'great' || t === 'good' ? (mark(p, 'cert', t === 'great' ? 1 : 0), addMerit(p, 1), ['모범 점수↑']) : [])],
  ['pr_exercise', '🏃', '운동장 운동', '건강↑ 근력↑ · 버티는 힘', 'hp', 'hp', [6, 3, 0, -4], '팔굽혀펴기 100개. 몸이 들어 왔다.|땀을 흘리니 잠이 온다.|운동 시간이 짧았다.|운동장에서 시비가 붙었다.'],
  ['pr_visit', '🪟', '가족 면회 (접견)', '행복↑ · 가족 관계↑ (찾아올 가족이 있어야)', 'cha', undefined, [12, 8, 3, -3], '아이가 유리창에 손바닥을 댔다. 오래 그 자리에 있었다.|어머니가 영치금을 넣고 가셨다.|10분이 금방 지나갔다.|아무도 오지 않았다.', (s, p, t) => {
    const fam = [...parentsOf(s, p), spouseOf(s, p)].filter((q): q is Person => !!q && alive(q));
    for (const q of fam) q.affinity = clamp(q.affinity + (t === 'bad' ? -2 : 4), -100, 100);
    const sp = spouseOf(s, p);
    if (sp && alive(sp)) p.bond = sp.bond = clamp((p.bond ?? 60) + (t === 'bad' ? -3 : 3), 0, 100);
    return fam.length ? ['가족 관계' + (t === 'bad' ? '↓' : '↑')] : ['면회 올 가족이 없다'];
  }],
  ['pr_model', '📝', '모범수 생활 (교화 프로그램·반성문)', '도덕↑ · 모범 점수↑↑ → 가석방 가능성', 'mor', 'mor', [4, 2, 0, -2], '교화 프로그램 수료식에서 대표로 소감을 읽었다.|교도관이 "요즘 달라졌네" 한다.|형식적으로 썼다는 걸 다 안다.|방 안 다툼에 휘말려 징벌을 받았다.', (_s, p, t) => (t === 'bad' ? (addMerit(p, -2), ['모범 점수↓']) : (addMerit(p, t === 'great' ? 3 : 2), ['모범 점수↑']))],
  ['pr_letter', '✉️', '옥중 편지·글쓰기', '행복↑ · (양심수면) 바깥에 이름이 알려진다', 'int', undefined, [8, 5, 2, -1], '편지가 몰래 밖으로 나가 복사본으로 돌았다.|가족에게 긴 편지를 썼다.|몇 줄 쓰다 찢었다.|검열에 걸려 편지가 통째로 돌아왔다.', (s, p, t) => (dissident(p) && (t === 'great' || t === 'good') ? ((s.fame += t === 'great' ? 3 : 1), mark(p, 'network', 1), ['가문 명성↑', '인맥↑']) : [])],
  ['pr_cellmates', '🤝', '방 동기들과 어울리기', '매력↑ · 담장 안 인맥 (좋은 인연도, 나쁜 인연도)', 'cha', 'cha', [8, 4, 0, -5], '형님 동생 하는 사이가 됐다. 출소하면 일자리를 알아봐 준단다.|라면 한 그릇을 나눠 먹었다.|서로 말이 없다.|싸움에 끼어 징벌방에 갔다.', (_s, p, t) => (t === 'great' ? (mark(p, 'network', 1), ['인맥↑']) : t === 'bad' ? (addMerit(p, -2), ['모범 점수↓']) : [])],
];

export const PRISON_ACTIONS: ActionDef[] = PRISON_ACTS.map(([id, icon, name, desc, roll, st, haps, lines, extra]) => ({
  id,
  cat: '수감',
  icon,
  name,
  desc,
  ap: 1,
  who: 'any',
  show: (s) => inPrison(head(s)),
  run: (s) => {
    const p = head(s);
    const t = rollTier(s, p, { stat: roll });
    const out: Delta[] = [];
    if (st) out.push(stat(st, t === 'bad' ? 0 : grow(s, p, st, t, 0.8)));
    const hp = jitter(s, haps[IDX[t]], 0.3);
    hap(p, hp);
    out.push(['행복', hp]);
    if (extra) out.push(...extra(s, p, t).filter((x) => x !== ''));
    const ls = lines.split('|');
    return TIER_MARK[t] + (ls[IDX[t]] ?? ls[0]) + fmt(out) + `\n(남은 형기 ${prisonLeft(p)}년 · 모범 점수 ${merit(p)})`;
  },
}));

// ───────────────────────── 담장 안 이야기 ─────────────────────────

interface PStory {
  id: string;
  title: string;
  when?: (s: GameState, p: Person) => boolean;
  text: (c: Ctx) => string;
  choices: (c: Ctx) => Choice[];
}
const who = (c: Ctx) => fullName(c.p);

const PSTORIES: PStory[] = [
  {
    id: 'pr_first_night', title: '첫날 밤', when: (_s, p) => !p.flags.includes('pr_seen_first'),
    text: (c) => `${who(c)}, 수번이 적힌 옷을 받았다. 혼거실 문이 철컥 닫힌다. 방장이 위아래로 훑어본다. "여긴 처음이야?"`,
    choices: (c) => [
      { label: '고개를 숙이고 조용히 지낸다', run: (x) => (addFlag(x.p, 'pr_seen_first'), hap(x.p, -4), addMerit(x.p, 1), '구석 자리를 받았다. 천장의 얼룩을 세며 잤다.') },
      { label: '기 싸움에서 물러서지 않는다', odds: checkOdds(c.p.actual.str, 55, 10), run: (x) => (addFlag(x.p, 'pr_seen_first'), check(x.s, x.p.actual.str, 55, 10) ? (mark(x.p, 'network', 1), '방장이 피식 웃었다. "깡은 있네." 그날부터 함부로 대하지 않는다.') : (up(x.p, 'hp', -5), addMerit(x.p, -1), '맞았다. 교도관이 보고도 못 본 척했다.')) },
    ],
  },
  {
    id: 'pr_guard', title: '교도관의 제안',
    text: (c) => `야간 근무 교도관이 ${who(c)}에게 슬쩍 말을 건다. "담배 몇 갑이면 편하게 해 줄 수 있는데."`,
    choices: () => [
      { label: '거절한다', run: (x) => (up(x.p, 'mor', 2), addMerit(x.p, 1), '"그래, 너 같은 사람이 일찍 나가더라." 교도관이 돌아섰다.') },
      { label: '영치금으로 산다', run: (x) => ((x.p.cash -= Math.round(30 * wageIndex(x.s.year))), hap(x.p, 5), pick(x.s, [0, 1, 2]) === 0 ? (addMerit(x.p, -3), '들켰다. 징벌방 열흘. 가석방 심사에 불리하다.') : '이불이 한 장 늘었다. 겨울이 조금 덜 춥다.') },
    ],
  },
  {
    id: 'pr_news', title: '바깥소식',
    text: (c) => {
      const sp = spouseOf(c.s, c.p);
      return sp && alive(sp) ? `${fullName(sp)}이(가) 면회 와서 한참 말이 없다. "애들은… 잘 크고 있어."` : `동생이 보낸 편지. "형(누나) 없는 동안 집안일은 걱정 마."`;
    },
    choices: () => [
      { label: '미안하다고 말한다', run: (x) => (hap(x.p, -3), up(x.p, 'mor', 2), '"나오면 잘할게." 처음으로 소리 내 울었다.') },
      { label: '괜찮은 척한다', run: (x) => (hap(x.p, -6), '웃어 보였다. 면회실을 나서자마자 무너졌다.') },
    ],
  },
  {
    id: 'pr_teacher', title: '감방의 선생', when: (_s, p) => p.actual.int >= 55,
    text: (c) => `글을 모르는 방 동기가 ${who(c)}에게 딸에게 보낼 편지를 대신 써 달라고 한다. 다른 이들도 줄을 선다.`,
    choices: () => [
      { label: '한글을 가르쳐 준다', run: (x) => (up(x.p, 'mor', 3), up(x.p, 'cha', 2), addMerit(x.p, 2), mark(x.p, 'network', 1), '석 달 뒤, 그가 처음으로 혼자 쓴 편지를 보여 줬다. 삐뚤빼뚤한 "사랑한다".') },
      { label: '대필만 해 준다', run: (x) => (hap(x.p, 3), '편지 한 통에 라면 하나. 방에서 대접이 달라졌다.') },
    ],
  },
  {
    id: 'pr_conscience', title: '양심수의 단식', when: (_s, p) => dissident(p),
    text: (c) => `${who(c)}의 사건이 바깥에서 "양심수 석방" 구호가 됐다. 같은 사동의 동지들이 처우 개선 단식을 제안한다.`,
    choices: () => [
      { label: '함께 단식한다', run: (x) => (up(x.p, 'hp', -8), (x.s.fame += 4), up(x.p, 'mor', 3), '열흘째, 신문 한 귀퉁이에 이름이 실렸다. 교도소가 독서 제한을 풀었다.') },
      { label: '몸을 지킨다', run: (x) => (hap(x.p, -2), '나가서 할 일이 더 많다고 스스로를 달랬다.') },
    ],
  },
];

const toEv = (d: PStory): EventDef => ({ id: d.id, title: () => '🔒 ' + d.title, text: d.text, choices: (c) => gate(c.s, d.choices(c)), valid: (c) => alive(c.p) && inPrison(c.p) });
export const PRISON_EVENTS: EventDef[] = PSTORIES.map(toEv);

/** 해마다 (형기 계산 전): 담장 안 이야기 + 가석방 심사. 가석방이면 한 줄을 돌려준다 */
export function prisonYear(s: GameState): string[] {
  const msgs: string[] = [];
  for (const p of Object.values(s.people)) {
    if (!alive(p) || !inPrison(p) || !isMainline(s, p)) continue;
    const seen = (s.storySeen ??= {});
    const isHead = p.id === s.headId;
    const pool = PSTORIES.filter((x) => (!x.when || x.when(s, p)) && s.year - (seen[p.id + ':' + x.id] ?? -99) >= 3);
    const first = pool.find((x) => x.id === 'pr_first_night');
    const n = first ? 1 : isHead ? 1 : 0;
    if (n && pool.length) {
      const x = first ?? pick(s, pool);
      seen[p.id + ':' + x.id] = s.year;
      s.events.push({ uid: s.eventSeq++, defId: x.id, personId: p.id });
    }
    // 가석방: 남은 형기가 2년 이상이고 모범 점수가 쌓였으면 (형법 제72조)
    const left = prisonLeft(p);
    if (left >= 2 && merit(p) >= 4 && check(s, merit(p) * 8 + p.actual.mor * 0.3, 60, 12)) {
      p.flags = p.flags.filter((f) => f !== 'in_prison' && !f.startsWith('prison_term:') && !f.startsWith('merit:'));
      addFlag(p, 'criminal');
      addFlag(p, 'paroled');
      msgs.push(`🕊 ${fullName(p)}, 모범수로 가석방됐다! (남은 형기 ${left}년을 앞두고) 교도소 정문 앞에서 가족이 두부를 내밀었다.`);
    }
  }
  return msgs;
}
