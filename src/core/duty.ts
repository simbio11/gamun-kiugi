// 집을 떠나 있는 몇 해: 군 복무, 서독 파견(광부·간호사), 중동 건설, 월남 파병.
// 그 기간에는 그곳에서 할 수 있는 일만 하고(행동 탭), 그곳에서 겪을 일이 해마다 찾아온다.
// 예전엔 "3년 계약" 이벤트가 그해에 바로 끝나 버렸다. 이제는 실제로 몇 해를 그곳에서 보낸다.
//
// 참고: 육군 복무기간 연표(histidx armyMonths), 파독 광부 약 7,900명·간호 인력 약 1만 명(1963~1977, 3년 계약),
// 중동 건설 근로자 연인원 100만 명(1974~1985), 월남 파병 연인원 32만 명(1964~1973).

import { chance, pick } from './rng';
import { gate, type Choice, type Ctx, type EventDef } from './ev-util';
import { addFlag, alive, check, checkOdds, clamp, fullName, hasFlag, head, isMainline, mark, parentsOf, spouseOf } from './people';
import { fmt, grow, jitter, rollTier, stat, TIER_MARK, type Delta, type Tier } from './practice';
import { formatMoney } from './economy';
import { wageIndex } from './pay';
import type { ActionDef } from './actions';
import type { GameState, Person, StatKey } from './types';

export type Duty = 'mil' | 'germany' | 'mideast' | 'vietnam';
export const DUTY_NAMES: Record<Duty, string> = { mil: '군 복무 중', germany: '서독 파견 근무 중', mideast: '중동 건설 현장', vietnam: '월남 파병 중' };

/** 지금 집을 떠나 복무·파견 중인가 */
export function dutyOf(p: Person): Duty | undefined {
  if (!p.flags.some((f) => f.startsWith('serving:'))) return undefined;
  if (p.flags.includes('duty:germany')) return 'germany';
  if (p.flags.includes('duty:mideast')) return 'mideast';
  if (p.flags.includes('duty:vietnam')) return 'vietnam';
  return 'mil';
}
export const onDuty = (p: Person) => p.flags.some((f) => f.startsWith('serving:'));
/** 복무가 끝나는 해 */
export const dutyEnd = (p: Person) => Number(p.flags.find((f) => f.startsWith('serving:'))?.slice(8) ?? 0);

/** 파견 시작: 군 복무와 같은 틀(serving)을 쓴다. pay는 2025년 돈 기준 연 수입 */
export function sendAway(s: GameState, p: Person, kind: Exclude<Duty, 'mil'>, years: number, pay: number) {
  p.flags = p.flags.filter((f) => !f.startsWith('serving:') && !f.startsWith('serve_pay:') && !f.startsWith('duty:'));
  p.flags.push('serving:' + (s.year + years - 1), 'serve_pay:' + pay, 'duty:' + kind);
}

const hap = (p: Person, d: number) => (p.happiness = clamp(p.happiness + d, 0, 100));
const up = (p: Person, k: StatKey, d: number) => (p.actual[k] = clamp(p.actual[k] + d, 0, 100));
const wi = (s: GameState) => wageIndex(s.year);
const IDX: Record<Tier, number> = { great: 0, good: 1, meh: 2, bad: 3 };

// ───────────────────────── 복무 중 행동 ─────────────────────────

/** [id, 복무, 아이콘, 이름, 설명, 판정, 키울 능력치, 행복 4단, '대박|보람|제자리|역효과', 추가 효과] */
type DA = [string, Duty[], string, string, string, StatKey, StatKey | undefined, [number, number, number, number], string, ((s: GameState, p: Person, t: Tier) => Delta[])?];

const DUTY_ACTS: DA[] = [
  // ── 군 ──
  ['duty_shoot', ['mil', 'vietnam'], '🎯', '사격·전투 훈련', '근력↑ · 특급전사가 되면 포상휴가', 'str', 'str', [8, 3, -1, -4], '20발 만발! 특급전사 포상휴가를 받았다.|사격 합격.|탄피 하나를 못 찾아 밤새 뒤졌다.|훈련 중 발목을 접질렸다.', (_s, p, t) => (t === 'great' ? (hap(p, 4), ['포상휴가']) : t === 'bad' ? (up(p, 'hp', -3), [stat('hp', -3)]) : [])],
  ['duty_march', ['mil'], '🥾', '행군·체력단련', '건강↑ 근력↑', 'hp', 'hp', [6, 3, -1, -5], '40km 행군을 웃으며 끝냈다. 소대원들이 업어 줬다.|무사히 완주했다.|물집이 터졌다.|낙오했다. 선임 눈치가 보인다.'],
  ['duty_study', ['mil', 'germany', 'mideast'], '📚', '생활관에서 공부', '지능↑ · 자격증·어학 · 전역(귀국) 뒤를 준비한다', 'int', 'int', [6, 3, -1, -3], '취침 전 한 시간씩 쌓은 공부로 자격증을 땄다!|책 한 권을 다 뗐다.|피곤해서 엎드려 잤다.|당직이 겹쳐 손도 못 댔다.', (_s, p, t) => (t === 'great' || t === 'good' ? (mark(p, 'cert', t === 'great' ? 1 : 0), []) : [])],
  ['duty_letter', ['mil', 'germany', 'mideast', 'vietnam'], '✉️', '집에 편지 쓰기', '가족 관계↑ · 마음이 놓인다', 'mor', undefined, [8, 5, 2, 0], '어머니가 답장에 눈물 자국을 남기셨다.|가족 소식에 힘이 났다.|짧은 답장이 왔다.|답장이 늦다. 괜히 서운하다.', (s, p, t) => {
    for (const q of parentsOf(s, p)) if (alive(q)) q.affinity = clamp(q.affinity + (t === 'bad' ? 1 : 4), -100, 100);
    const sp = spouseOf(s, p);
    if (sp && alive(sp)) p.bond = sp.bond = clamp((p.bond ?? 60) + 3, 0, 100);
    return ['가족 관계↑'];
  }],
  ['duty_buddies', ['mil', 'vietnam'], '🤝', '전우들과 어울리기', '매력↑ · 평생 갈 인맥', 'cha', 'cha', [8, 4, 0, -4], '평생 갈 전우를 얻었다. 전역하면 꼭 보자고 약속했다.|PX에서 냉동식품 파티.|그냥 그랬다.|말년 병장과 부딪쳤다.', (_s, p, t) => (t !== 'bad' ? (mark(p, 'network', t === 'great' ? 2 : 1), ['인맥↑']) : [])],
  ['duty_leave', ['mil'], '🏖', '휴가 나가기', '행복↑ 건강↑ · 짧은 사회의 맛', 'cha', undefined, [12, 8, 4, 0], '휴가 내내 가족과 맛있는 걸 먹었다. 복귀하기 싫다…|친구들을 만났다.|금방 지나갔다.|복귀 날 버스를 놓칠 뻔했다.', (_s, p) => (up(p, 'hp', 2), [stat('hp', 2)])],
  ['duty_cadre', ['mil'], '🎖', '간부(부사관) 지원 상담', '말년에 · 전역 대신 직업군인의 길 (부사관 임관)', 'mor', 'mor', [4, 2, 0, -2], '중대장이 추천서를 써 줬다. 전역하면 부사관으로 임관할 수 있다.|간부의 삶을 들어 봤다.|고민만 깊어졌다.|"너는 안 맞아"라는 말을 들었다.', (_s, p, t) => (t === 'great' || t === 'good' ? (addFlag(p, 'nco_offer'), ['부사관 임관 자격']) : [])],
  // ── 서독 ──
  ['duty_shift', ['germany', 'mideast'], '⛏', '특근·야간 근무', '송금↑ · 몸이 축난다', 'hp', 'str', [6, 2, -2, -6], '특근 수당이 두둑하다. 고향에 한 달 치를 더 보냈다.|돈이 조금 더 모였다.|피곤만 쌓였다.|과로로 쓰러졌다.', (s, p, t) => {
    const v = Math.round([900, 450, 150, 0][IDX[t]] * wi(s));
    p.cash += v;
    if (t === 'bad') up(p, 'hp', -5);
    return [v ? `+${formatMoney(v)}` : '', ...(t === 'bad' ? [stat('hp', -5)] : [])];
  }],
  ['duty_german', ['germany'], '🇩🇪', '독일어 공부', '지능↑ 매력↑ · 현지 생활이 편해진다', 'int', 'int', [8, 4, 0, -3], '병동 환자들과 농담을 주고받을 만큼 늘었다!|단어가 늘었다.|문법이 머리에 안 들어온다.|시험에서 망신을 당했다.', (_s, p, t) => (t === 'great' ? (addFlag(p, 'german'), up(p, 'cha', 2), [stat('cha', 2)]) : [])],
  ['duty_homesick', ['germany', 'mideast', 'vietnam'], '🌙', '동료들과 고향 음식 해 먹기', '행복↑ · 향수병을 달랜다', 'cha', undefined, [12, 8, 3, -2], '김치를 담가 기숙사 전체가 나눠 먹었다. 독일 동료들도 반했다.|된장찌개 냄새에 다 같이 울었다.|재료가 없어 흉내만 냈다.|냄새 때문에 사감에게 혼났다.'],
  ['duty_remit', ['germany', 'mideast', 'vietnam'], '💌', '고향에 목돈 송금', '부모님 집에 큰돈 · 관계↑', 'mor', undefined, [8, 6, 3, 0], '부모님이 그 돈으로 논을 샀다는 편지가 왔다.|동생 학비가 해결됐다.|송금 수수료가 아깝다.|환전하다 손해를 봤다.', (s, p) => {
    const v = Math.min(Math.max(0, p.cash), Math.round(1200 * wi(s)));
    p.cash -= v;
    const par = parentsOf(s, p).find(alive);
    if (par) (par.cash += v), (par.affinity = clamp(par.affinity + 8, -100, 100));
    return v ? [`송금 ${formatMoney(v)}`] : ['보낼 돈이 없다'];
  }],
];

export const DUTY_ACTIONS: ActionDef[] = DUTY_ACTS.map(([id, duties, icon, name, desc, roll, st, haps, lines, extra]) => ({
  id,
  cat: '복무',
  icon,
  name,
  desc,
  ap: 1,
  who: 'any',
  show: (s) => {
    const d = dutyOf(head(s));
    if (!d || !duties.includes(d)) return false;
    if (id === 'duty_cadre') return dutyEnd(head(s)) <= s.year + 1 && !hasFlag(head(s), 'nco_offer');
    return true;
  },
  blocked: (s) => (id === 'duty_leave' && (s.actUsed?.[id] ?? 0) >= 2 ? '휴가는 한 해 두 번까지' : undefined),
  run: (s) => {
    const p = head(s);
    const t = rollTier(s, p, { stat: roll });
    const out: Delta[] = [];
    if (st) out.push(stat(st, t === 'bad' ? 0 : grow(s, p, st, t, 0.9)));
    const hp = jitter(s, haps[IDX[t]], 0.3);
    hap(p, hp);
    out.push(['행복', hp]);
    if (extra) out.push(...extra(s, p, t).filter((x) => x !== ''));
    const ls = lines.split('|');
    return TIER_MARK[t] + (ls[IDX[t]] ?? ls[0]) + fmt(out);
  },
}));

// ───────────────────────── 복무 중 이야기 ─────────────────────────

interface DStory {
  id: string;
  duty: Duty[];
  title: string;
  /** 복무 몇 해째에 (0 = 첫해) */
  when?: (s: GameState, p: Person) => boolean;
  text: (c: Ctx) => string;
  choices: (c: Ctx) => Choice[];
}
const who = (c: Ctx) => fullName(c.p);
const firstYear = (s: GameState, p: Person) => p.flags.some((f) => f.startsWith('duty_y0:') && Number(f.slice(8)) === s.year);
const lastYear = (s: GameState, p: Person) => dutyEnd(p) === s.year;

const DSTORIES: DStory[] = [
  // ── 군 ──
  {
    id: 'dm_bootcamp', duty: ['mil'], title: '훈련소', when: firstYear,
    text: (c) => `${who(c)}, 훈련소 3주 차. 각개전투 날, 진흙탕을 기는데 조교가 소리친다. "다시!"`,
    choices: (c) => [
      { label: '이를 악물고 끝까지', odds: checkOdds(c.p.actual.str, 45, 10), run: (x) => (check(x.s, x.p.actual.str, 45, 10) ? (up(x.p, 'str', 3), hap(x.p, 4), '훈련병 대표로 표창을 받았다.') : (up(x.p, 'str', 1), hap(x.p, -3), '끝까지 갔지만 꼴찌였다. 그래도 해냈다.')) },
      { label: '동기를 챙긴다', run: (x) => (up(x.p, 'mor', 3), mark(x.p, 'network', 1), '쓰러진 동기를 부축해 함께 들어왔다. 평생 친구가 생겼다.') },
    ],
  },
  {
    id: 'dm_senior', duty: ['mil'], title: '내무반의 선임', when: (s, p) => !lastYear(s, p),
    text: (c) => `${c.s.era === 'history' && c.s.year < 2000 ? '점호가 끝난 밤, 고참이 이등병들을 집합시켰다.' : '선임 하나가 유독 ' + who(c) + '을(를) 괴롭힌다. 사소한 트집이 매일 이어진다.'}`,
    choices: (c) => [
      { label: '참는다', run: (x) => (hap(x.p, -6), up(x.p, 'mor', 1), '시간은 흐른다. 국방부 시계는 거꾸로 매달아도 간다.') },
      { label: c.s.era === 'history' && c.s.year < 2000 ? '중대장에게 말한다' : '마음의 편지(신고)를 쓴다', odds: checkOdds(c.p.actual.cha, 50, 10), run: (x) => (check(x.s, x.p.actual.cha, 50, 10) ? (up(x.p, 'mor', 3), hap(x.p, 4), '선임이 다른 중대로 전출됐다. 생활관이 조용해졌다.') : (hap(x.p, -10), '"찌른 놈"이 됐다. 남은 복무가 길게 느껴진다.')) },
    ],
  },
  {
    id: 'dm_winter', duty: ['mil'], title: '혹한기 훈련',
    text: (c) => `영하 20도. ${who(c)}의 부대가 텐트에서 일주일을 버틴다. 전투화 속 발가락에 감각이 없다.`,
    choices: (c) => [
      { label: '핫팩을 소대원과 나눈다', run: (x) => (up(x.p, 'mor', 3), mark(x.p, 'network', 1), up(x.p, 'hp', -2), '소대원들이 "형"이라고 불렀다.') },
      { label: '버티기 요령을 총동원한다', odds: checkOdds(c.p.actual.hp, 50, 10), run: (x) => (check(x.s, x.p.actual.hp, 50, 10) ? (up(x.p, 'hp', 2), '양말 세 겹, 전투식량 데우기 달인이 됐다.') : (up(x.p, 'hp', -5), '동상 직전에 의무대로 실려 갔다.')) },
    ],
  },
  {
    id: 'dm_alert', duty: ['mil'], title: '비상 경계 태세', when: (s) => s.era === 'history' && s.year < 2011,
    text: () => '새벽, 비상 사이렌. 휴전선 너머에서 무슨 일이 생겼다. 휴가가 전면 통제되고 실탄이 지급됐다.',
    choices: () => [
      { label: '초소를 지킨다', run: (x) => (up(x.p, 'mor', 2), up(x.p, 'str', 1), '사흘 밤을 꼬박 새웠다. 아무 일도 없었다는 게 가장 큰 다행이었다.') },
    ],
  },
  {
    id: 'dm_injury', duty: ['mil'], title: '작업 중 사고',
    text: (c) => `진지 공사 작업 중 ${who(c)}의 손등을 삽날이 스쳤다. 피가 꽤 난다.`,
    choices: () => [
      { label: '의무대에 간다', run: (x) => (up(x.p, 'hp', -2), '꿰매고 나니 사흘 열외. 생활관에서 책을 읽었다.') },
      { label: '참고 작업을 마친다', run: (x) => (chance(x.s, 0.3) ? (up(x.p, 'hp', -8), hap(x.p, -5), '상처가 덧나 국군병원에 입원했다.') : (up(x.p, 'mor', 1), '독한 놈이라는 소리를 들었다.')) },
    ],
  },
  {
    id: 'dm_visit', duty: ['mil', 'vietnam'], title: '면회',
    text: (c) => `주말, ${who(c)}에게 면회가 왔다. ${c.p.partnerId ? '연인이 도시락을 싸 들고 왔다.' : '부모님이 통닭을 사 오셨다.'}`,
    choices: () => [
      { label: '반갑게 맞는다', run: (x) => (hap(x.p, 10), parentsOf(x.s, x.p).forEach((q) => (q.affinity = clamp(q.affinity + 4, -100, 100))), '면회실에서 웃다가 울었다. 돌아가는 뒷모습이 오래 남았다.') },
    ],
  },
  {
    id: 'dm_dday', duty: ['mil'], title: '전역 D-100', when: lastYear,
    text: (c) => `${who(c)}, 말년 병장. 달력에 X 표시가 빼곡하다. 전역하면 뭘 할까?`,
    choices: () => [
      { label: '복학·취업 계획을 세운다', run: (x) => (up(x.p, 'int', 2), mark(x.p, 'study', 1), '계획표를 세 장 썼다. 이번엔 다르게 살 거다.') },
      { label: '"떨어지는 낙엽도 조심"', run: (x) => (hap(x.p, 6), '아무것도 안 하고 전역만 기다렸다.') },
    ],
  },
  // ── 서독 ──
  {
    id: 'dg_arrive', duty: ['germany'], title: '낯선 땅', when: firstYear,
    text: (c) => `${who(c)}, 프랑크푸르트 공항에 내렸다. ${c.p.sex === 'M' ? '루르 탄광 숙소까지 버스로 몇 시간. 지하 1,000미터 막장이 기다린다.' : '병원 기숙사에 짐을 풀었다. 첫날부터 시신 닦는 일이 맡겨졌다.'}`,
    choices: () => [
      { label: '묵묵히 일을 배운다', run: (x) => (up(x.p, 'mor', 3), up(x.p, 'str', 2), '말이 안 통해도 성실함은 통했다. 작업반장이 엄지를 들었다.') },
      { label: '밤마다 사전을 편다', run: (x) => (up(x.p, 'int', 3), addFlag(x.p, 'german'), '독일어가 조금씩 귀에 들어온다.') },
    ],
  },
  {
    id: 'dg_mine', duty: ['germany'], title: '막장의 사고', when: (_s, p) => p.sex === 'M',
    text: (c) => `지하 1,000미터. 천장에서 돌이 떨어지는 소리. ${who(c)} 옆의 동료가 깔렸다.`,
    choices: (c) => [
      { label: '맨손으로 돌을 치운다', odds: checkOdds(c.p.actual.str, 52, 10), run: (x) => (check(x.s, x.p.actual.str, 52, 10) ? (up(x.p, 'mor', 4), hap(x.p, 6), '동료를 끌어냈다. 독일 광산 회사가 표창장을 줬다.') : (up(x.p, 'hp', -10), '같이 다쳤다. 둘 다 살았지만 한 달을 누워 있었다.')) },
      { label: '구조대를 부르러 뛴다', run: (x) => (up(x.p, 'int', 1), '구조대가 왔다. 동료는 다리를 잃었다.') },
    ],
  },
  {
    id: 'dg_ward', duty: ['germany'], title: '밤 병동', when: (_s, p) => p.sex === 'F',
    text: (c) => `새벽 3시, ${who(c)}이(가) 혼자 지키는 병동에서 노인 환자의 숨이 가빠진다. 당직 의사는 연락이 안 된다.`,
    choices: (c) => [
      { label: '배운 대로 응급처치를 한다', odds: checkOdds(c.p.actual.int, 50, 10), run: (x) => (check(x.s, x.p.actual.int, 50, 10) ? (up(x.p, 'int', 2), hap(x.p, 8), '환자가 살았다. 아침에 수간호사가 "한국 천사"라고 불렀다.') : (hap(x.p, -8), '최선을 다했지만 환자는 떠났다. 그날 기숙사에서 오래 울었다.')) },
      { label: '다른 병동까지 뛰어가 의사를 부른다', run: (x) => (up(x.p, 'mor', 2), '의사가 늦게 도착했지만 고비를 넘겼다.') },
    ],
  },
  {
    id: 'dg_love', duty: ['germany'], title: '독일에서의 인연',
    text: (c) => `${c.p.sex === 'M' ? '파견 간호사' : '파견 광부'} 출신의 한국 사람과 자주 마주친다. 주말마다 한인회 모임에서 눈이 마주친다.`,
    choices: () => [
      { label: '마음을 표현한다', run: (x) => (hap(x.p, 10), addFlag(x.p, 'germany_love'), '타향에서 서로에게 기댈 곳이 생겼다.') },
      { label: '돌아가서 생각하자', run: (x) => (hap(x.p, -2), '지금은 돈을 모아야 할 때다.') },
    ],
  },
  {
    id: 'dg_stay', duty: ['germany'], title: '남을 것인가, 돌아갈 것인가', when: lastYear,
    text: (c) => `계약 3년이 끝나 간다. 병원(회사)이 ${who(c)}에게 계약 연장을 제안했다. 실제로 많은 파독 간호사·광부가 독일에 남았다.`,
    choices: () => [
      { label: '2년 더 남는다', run: (x) => {
        const end = dutyEnd(x.p) + 2;
        x.p.flags = x.p.flags.filter((f) => !f.startsWith('serving:'));
        x.p.flags.push('serving:' + end);
        return `연장 계약서에 사인했다. ${end + 1}년에 돌아간다. 고향 소식은 편지로만 듣는다.`;
      } },
      { label: '고향으로 돌아간다', run: (x) => (hap(x.p, 6), '짐을 쌌다. 비행기 창밖으로 독일 들판이 멀어진다.') },
    ],
  },
  // ── 중동 ──
  {
    id: 'dme_heat', duty: ['mideast'], title: '섭씨 50도',
    text: (c) => `사우디 현장. 한낮 기온 50도, 모래바람. ${who(c)}의 작업조가 공기를 맞추려 밤샘 작업을 한다.`,
    choices: (c) => [
      { label: '밤샘에 앞장선다', odds: checkOdds(c.p.actual.hp, 50, 10), run: (x) => (check(x.s, x.p.actual.hp, 50, 10) ? ((x.p.cash += Math.round(600 * wi(x.s))), up(x.p, 'str', 2), '공기를 앞당겼다. 보너스가 나왔다.') : (up(x.p, 'hp', -8), '일사병으로 쓰러졌다.')) },
      { label: '안전 수칙을 지키자고 한다', run: (x) => (up(x.p, 'mor', 3), '반장이 투덜댔지만 그 주엔 아무도 다치지 않았다.') },
    ],
  },
  {
    id: 'dme_letter', duty: ['mideast'], title: '아내의 편지',
    text: (c) => `${spouseOf(c.s, c.p) ? '아내의 편지가 왔다. "아이가 아빠 얼굴을 잊을까 봐 사진을 매일 보여 줘요."' : '어머니의 편지가 왔다. "밥은 잘 먹고 다니냐."'}`,
    choices: () => [
      { label: '답장에 녹음테이프를 동봉한다', run: (x) => (hap(x.p, 6), spouseOf(x.s, x.p) && (x.p.bond = clamp((x.p.bond ?? 60) + 6, 0, 100)), '목소리를 녹음해 보냈다. 집에서 테이프가 늘어지도록 돌려 들었단다.') },
    ],
  },
  // ── 월남 ──
  {
    id: 'dv_jungle', duty: ['vietnam'], title: '정글 수색',
    text: (c) => `${who(c)}의 소대가 정글 수색에 나섰다. 수풀 너머에서 인기척이 난다.`,
    choices: (c) => [
      { label: '침착하게 엄폐한다', odds: checkOdds(c.p.actual.int, 50, 10), run: (x) => (check(x.s, x.p.actual.int, 50, 10) ? (up(x.p, 'mor', 2), '소대원 모두 무사히 복귀했다.') : (up(x.p, 'hp', -10), hap(x.p, -10), '총격전. 동기 하나가 다쳤다. 그날 밤 잠들 수 없었다.')) },
      { label: '앞장서 돌격한다', odds: checkOdds(c.p.actual.str, 58, 10), run: (x) => (check(x.s, x.p.actual.str, 58, 10) ? ((x.s.fame += 1), hap(x.p, 2), '무공훈장 상신. 그러나 그 정글의 장면은 평생 꿈에 나온다.') : (up(x.p, 'hp', -15), '부상. 후송선에 실려 돌아왔다.')) },
    ],
  },
];

const toEv = (d: DStory): EventDef => ({ id: d.id, title: () => d.title, text: d.text, choices: (c) => gate(c.s, d.choices(c)), valid: (c) => alive(c.p) && !!dutyOf(c.p) && d.duty.includes(dutyOf(c.p)!) });
export const DUTY_EVENTS: EventDef[] = DSTORIES.map(toEv);

/** 해마다: 복무·파견 중인 가족에게 그곳의 일이 생긴다 (가주는 거의 매년, 다른 가족은 가끔) */
export function dutyYear(s: GameState): void {
  for (const p of Object.values(s.people)) {
    if (!alive(p) || !isMainline(s, p) || p.inLaw) continue;
    const d = dutyOf(p);
    if (!d) continue;
    if (!p.flags.some((f) => f.startsWith('duty_y0:'))) p.flags.push('duty_y0:' + s.year);
    const isHead = p.id === s.headId;
    const n = isHead ? (chance(s, 0.5) ? 2 : 1) : chance(s, 0.35) ? 1 : 0;
    const pool = DSTORIES.filter((x) => x.duty.includes(d) && (!x.when || x.when(s, p)) && s.year - ((s.storySeen ??= {})[p.id + ':' + x.id] ?? -99) >= 2);
    // 첫해·마지막 해 이야기는 꼭
    const must = pool.filter((x) => x.when === firstYear || x.when === lastYear);
    const picks = [...must];
    while (picks.length < n && pool.some((x) => !picks.includes(x))) picks.push(pick(s, pool.filter((x) => !picks.includes(x))));
    for (const x of picks.slice(0, Math.max(n, must.length))) {
      s.storySeen![p.id + ':' + x.id] = s.year;
      s.events.push({ uid: s.eventSeq++, defId: x.id, personId: p.id });
    }
  }
}

/** 복무·파견이 끝날 때 한 줄 */
export function dutyDone(p: Person): string {
  const d = p.flags.find((f) => f.startsWith('duty:'))?.slice(5);
  p.flags = p.flags.filter((f) => !f.startsWith('duty:') && !f.startsWith('duty_y0:') && !f.startsWith('serve_pay:'));
  if (d === 'germany') return `✈️ ${fullName(p)}, 서독 파견 계약을 마치고 귀국`;
  if (d === 'mideast') return `✈️ ${fullName(p)}, 중동 건설 현장에서 귀국 — 까맣게 탄 얼굴`;
  if (d === 'vietnam') return addFlag(p, 'served'), `🎖 ${fullName(p)}, 월남에서 귀국`;
  return '';
}

export const dutyPay = (s: GameState, p: Person): number => {
  const v = Number(p.flags.find((f) => f.startsWith('serve_pay:'))?.slice(10) ?? NaN);
  if (Number.isFinite(v)) return Math.round(v * wageIndex(s.year));
  // 병사 월급: 2017년까지는 용돈 수준(병장 월 21만 원), 2018년부터 크게 올랐다 (2025 병장 월 150만 원 + 자산형성 지원)
  return Math.round(1200 * wageIndex(s.year) * (s.year < 2018 ? 0.15 : 1));
};

