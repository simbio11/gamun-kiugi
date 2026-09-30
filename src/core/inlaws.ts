// 사돈댁(배우자 집안)과 부부 살이.
// · 배우자마다 집안 형편이 있다: 넉넉지 않음 · 평범 · 부유 · 명문가 (kin:<tier>)
// · 부유한 사돈은 목돈·인맥·학비를 대 주지만 간섭하고, 기울면 연대보증·스캔들에 끌려 들어간다
// · 가난한 사돈은 생활비·병원비를 기대지만, 정이 깊다
// · 두 집안 형편 차이가 크면 금슬이 더 빨리 식고 갈등이 잦다 → 데이트·선물·사돈 챙기기로 붙잡아야 한다
// · 배우자 건강: 약해지면 가주의 행복이 깎이고, 돌보면 금슬이 오른다. 병이 나면 간병을 고른다
import type { ActionDef } from './actions';
import { formatMoney, personWorth } from './economy';
import { gate, type EventDef } from './ev-util';
import { setBond } from './life';
import { addFlag, age, alive, clamp, fullName, head, isMainline, spouseOf } from './people';
import { chance, int, next, pick } from './rng';
import { JOBS } from './data';
import type { GameState, Person } from './types';

export type Kin = 'poor' | 'middle' | 'rich' | 'elite';
export const KIN_NAME: Record<Kin, string> = { poor: '넉넉지 않은 집', middle: '평범한 집', rich: '부잣집', elite: '명문가' };
const RANK: Record<Kin, number> = { poor: 0, middle: 1, rich: 2, elite: 3 };

export const kinOf = (p: Person): Kin | undefined => p.flags.find((f) => f.startsWith('kin:'))?.slice(4) as Kin | undefined;

/** 배우자 후보의 집안을 정한다 (사람됨·우리 집 명성에 따라). 지참금도 집안 따라 */
export function rollKin(s: GameState, cand: Person, quality: number) {
  const r = next(s) + (quality - 44) / 120;
  const k: Kin = r > 0.97 ? 'elite' : r > 0.78 ? 'rich' : r > 0.3 ? 'middle' : 'poor';
  cand.flags = cand.flags.filter((f) => !f.startsWith('kin:'));
  cand.flags.push('kin:' + k);
  cand.cash = Math.round(cand.cash * { poor: 0.5, middle: 1, rich: 2, elite: 3.5 }[k]);
}

/** 옛 저장·처음부터 있던 배우자: 가진 돈으로 집안을 짐작한다 */
function ensureKin(p: Person) {
  if (kinOf(p)) return;
  const k: Kin = p.cash > 30000 ? 'elite' : p.cash > 9000 ? 'rich' : p.cash > 1500 ? 'middle' : 'poor';
  p.flags.push('kin:' + k);
}

/** 우리 집 형편 (직계 순자산 기준, 2025년 원) */
export function ourKin(s: GameState): Kin {
  const w = Object.values(s.people)
    .filter((p) => alive(p) && isMainline(s, p))
    .reduce((t, p) => t + personWorth(s, p), s.familyCash);
  return w > 800000 ? 'elite' : w > 150000 ? 'rich' : w > 30000 ? 'middle' : 'poor';
}

/** 집안 차이: +면 배우자 집이 더 잘산다 */
export const kinGap = (s: GameState, sp: Person) => RANK[kinOf(sp) ?? 'middle'] - RANK[ourKin(s)];

/** 해마다 금슬에 더해지는 몫: 집안 차이, 배우자 건강 */
export function kinDrift(s: GameState, p: Person, sp: Person): number {
  let d = 0;
  const g = Math.abs(kinGap(s, sp));
  if (g >= 2) d -= 0.5 * (g - 1); // 기울어진 결혼은 더 빨리 식는다
  if (p.flags.includes('care:' + s.year)) d += 1.5; // 올해 사돈을 챙겼다
  return d;
}

const mood = (p: Person, d: number) => (p.happiness = clamp(p.happiness + d, 0, 100));
const bump = (p: Person, sp: Person, d: number) => setBond(p, sp, (p.bond ?? 60) + d);

// ───────────────────────── 사돈 사건 ─────────────────────────

type Kx = { s: GameState; p: Person; ev: { data: any } };
const spo = (c: Kx) => spouseOf(c.s, c.p)!;
const kinTxt = (c: Kx) => KIN_NAME[kinOf(spo(c)) ?? 'middle'];

interface IlDef {
  id: string;
  kins: Kin[];
  w: number;
  title: string;
  text: (c: Kx) => string;
  choices: (c: Kx) => { label: string; cost?: number; run: (x: Kx) => string }[];
}

const IL: IlDef[] = [
  // ── 부유·명문가 사돈: 이득 ──
  {
    id: 'il_gift', kins: ['rich', 'elite'], w: 3, title: '💰 사돈댁의 목돈',
    text: (c) => `${fullName(spo(c))}의 부모님이 ${fullName(c.p)} 부부를 불렀다. "집 장만에 보태라." 봉투에 ${formatMoney(c.ev.data.amt)}이 들어 있다. 대신 "주말마다 얼굴 좀 보자"고 한다.`,
    choices: () => [
      { label: '감사히 받는다', run: (x) => ((x.p.cash += x.ev.data.amt), mood(x.p, 3), bump(x.p, spo(x), 3), addFlag(x.p, 'inlaw_owe'), `목돈이 들어왔다 (+${formatMoney(x.ev.data.amt)}). 대신 사돈댁 주말 방문이 의무가 됐다.`) },
      { label: '정중히 사양한다', run: (x) => (mood(x.p, 4), bump(x.p, spo(x), -2), '"우리 힘으로 해 볼게요." 사돈은 서운해했지만 자존심은 지켰다.') },
    ],
  },
  {
    id: 'il_connect', kins: ['rich', 'elite'], w: 2, title: '🤝 사돈의 인맥',
    text: (c) => `사돈어른이 ${fullName(c.p)}에게 업계 거물을 소개해 주겠다고 한다. "자네 같은 사위(며느리)면 밀어줄 만하지."`,
    choices: () => [
      {
        label: '소개를 받는다',
        run: (x) => {
          const j = JOBS[x.p.job];
          if (j && j.maxLevel && x.p.jobLevel < j.maxLevel && chance(x.s, 0.5)) {
            x.p.jobLevel++;
            return '거물의 한마디에 길이 열렸다. 직급이 한 단계 올랐다! 다만 "사돈 덕"이라는 뒷말이 따라붙는다.';
          }
          x.s.fame += 1;
          return '좋은 인연을 맺었다. 명성 +1';
        },
      },
      { label: '실력으로 하겠다며 거절한다', run: (x) => (mood(x.p, 3), '사돈은 "고집 있네" 하며 웃었다.') },
    ],
  },
  {
    id: 'il_tuition', kins: ['rich', 'elite'], w: 2, title: '🎓 손주 학비는 우리가',
    text: () => `사돈댁에서 손주 교육비를 대 주겠다고 한다. 조건은 "우리가 고른 학교"로 보내는 것.`,
    choices: () => [
      { label: '받아들인다', run: (x) => { for (const k of x.p.childIds.map((id) => x.s.people[id]).filter((k) => k && alive(k) && age(x.s, k) < 20)) k.study = clamp((k.study ?? 40) + 8, 0, 100); x.p.cash += x.ev.data.amt / 2; return `아이들이 사돈이 고른 명문 학원에 다닌다. 성적이 오른다 (+${formatMoney(x.ev.data.amt / 2)} 절약). 교육 방침엔 사돈 입김이 세졌다.`; } },
      { label: '교육은 우리가 정한다', run: (x) => (bump(x.p, spo(x), -3), '사돈댁과 살짝 냉랭해졌다.') },
    ],
  },
  {
    id: 'il_inherit', kins: ['elite'], w: 0.6, title: '📜 사돈댁 유산',
    text: (c) => `${fullName(spo(c))}의 조부모님이 돌아가셨다. 명문가의 유산 일부가 ${fullName(spo(c))} 몫으로 나왔다. 사촌들이 소송을 걸겠다고 한다.`,
    choices: () => [
      { label: '몫을 지킨다', run: (x) => { const ok = chance(x.s, 0.6); const a = ok ? x.ev.data.amt * 3 : -x.ev.data.amt / 4; spo(x).cash += a; return ok ? `소송에서 이겼다. ${fullName(spo(x))} 명의로 ${formatMoney(a)}.` : `소송비만 ${formatMoney(-a)} 날렸다.`; } },
      { label: '사촌들과 나눈다', run: (x) => { spo(x).cash += x.ev.data.amt; x.s.fame += 1; return `화목하게 나눴다 (+${formatMoney(x.ev.data.amt)}). "그 집 사위(며느리) 사람 됐네."`; } },
    ],
  },
  // ── 부유·명문가 사돈: 손해 ──
  {
    id: 'il_meddle', kins: ['rich', 'elite'], w: 3, title: '😤 사돈의 간섭',
    text: (c) => `사돈댁이 또 전화했다. 집 인테리어, 아이 이름, 명절 순서까지 다 정하려 든다. "우리 애가 너희 집에 가서 고생하는 거 아니냐." ${fullName(c.p)}의 속이 부글거린다.`,
    choices: () => [
      { label: '꾹 참는다', run: (x) => (mood(x.p, -6), '웃으며 "네"라고 했다. 속은 타들어 간다.') },
      { label: '배우자에게 막아 달라고 한다', run: (x) => { const ok = chance(x.s, ((x.p.bond ?? 60) + 10) / 130); bump(x.p, spo(x), ok ? 5 : -8); return ok ? `${fullName(spo(x))}이(가) 부모님께 선을 그었다. 둘 사이가 더 단단해졌다.` : `"우리 부모님을 왜 그렇게 봐?" 부부싸움으로 번졌다.`; } },
      { label: '비싼 선물로 달랜다', cost: 300, run: (x) => (bump(x.p, spo(x), 2), '명품 스카프에 사돈 표정이 풀렸다. 당분간은 조용하다.') },
    ],
  },
  {
    id: 'il_lookdown', kins: ['rich', 'elite'], w: 2.5, title: '🥂 기울어진 식탁',
    text: (c) => `사돈댁 가족 모임. 친척들이 은근히 ${fullName(c.p)}네 집안을 깎아내린다. "그 집은 어디 땅이 좀 있으신가?"`,
    choices: () => [
      { label: '웃어넘긴다', run: (x) => (mood(x.p, -5), bump(x.p, spo(x), -2), '웃었지만 돌아오는 차 안이 조용했다.') },
      { label: '당당하게 받아친다', run: (x) => { const ok = chance(x.s, x.p.actual.cha / 110); if (ok) { mood(x.p, 6); return '재치 있는 한마디에 식탁이 웃음바다가 됐다. 사돈어른이 "배짱 있네" 한다.'; } bump(x.p, spo(x), -6); return '분위기가 얼어붙었다. 배우자가 난처해했다.'; } },
    ],
  },
  {
    id: 'il_guarantee', kins: ['rich', 'elite'], w: 1.2, title: '🏚 사돈 회사가 흔들린다',
    text: (c) => `사돈댁 회사가 부도 위기다. 사돈어른이 ${fullName(c.p)}에게 연대보증을 부탁한다. "잠깐이면 돼. 우리가 그동안 해 준 게 있잖니."`,
    choices: () => [
      { label: '보증을 선다', run: (x) => { if (chance(x.s, 0.45)) { x.s.fame += 1; bump(x.p, spo(x), 10); return '회사가 살아났다! 사돈은 평생 은인이라 부른다.'; } const l = x.ev.data.amt * 2; x.p.cash -= l; bump(x.p, spo(x), 4); return `결국 부도. 보증 빚 ${formatMoney(l)}을 떠안았다.`; } },
      { label: '거절한다', run: (x) => (bump(x.p, spo(x), -12), mood(x.p, -4), '"우리가 너희한테 어떻게 했는데." 사돈댁과 사이가 틀어졌다. 배우자가 크게 서운해한다.') },
    ],
  },
  {
    id: 'il_scandal', kins: ['elite'], w: 0.8, title: '📰 사돈댁 스캔들',
    text: (c) => `사돈댁 이름이 뉴스에 올랐다. 비자금 의혹이다. 기자들이 ${fullName(c.p)}에게도 전화를 걸어온다.`,
    choices: () => [
      { label: '선을 긋는다 ("우리와 무관")', run: (x) => (bump(x.p, spo(x), -8), '가문 명성은 지켰지만 배우자가 상처받았다.') },
      { label: '사돈 편에 선다', run: (x) => (x.s.fame = Math.max(0, x.s.fame - 3), bump(x.p, spo(x), 8), '명성 −3. 배우자는 평생 이 일을 잊지 않을 것이다.') },
    ],
  },
  {
    id: 'il_prenup', kins: ['elite'], w: 0.6, title: '📑 재산 분리 각서',
    text: (c) => `사돈댁 변호사가 찾아왔다. "만일을 대비해" ${fullName(spo(c))}의 재산을 분리하는 각서에 서명해 달라고 한다.`,
    choices: () => [
      { label: '서명한다', run: (x) => (mood(x.p, -5), addFlag(spo(x), 'prenup'), '서명했다. 사랑은 믿음이라는데.') },
      { label: '거절한다', run: (x) => (bump(x.p, spo(x), -6), '"우리를 못 믿는 거예요?" 냉랭한 한 달이 지났다.') },
    ],
  },
  // ── 평범한 사돈 ──
  {
    id: 'il_holiday', kins: ['middle', 'rich', 'poor'], w: 2, title: '🧧 명절, 어느 집 먼저?',
    text: (c) => `명절이 다가온다. 올해는 어느 집에 먼저 갈지 ${fullName(c.p)} 부부가 옥신각신한다. (${kinTxt(c)})`,
    choices: () => [
      { label: '처가(시가) 먼저', run: (x) => (bump(x.p, spo(x), 5), '배우자가 환하게 웃었다.') },
      { label: '우리 집 먼저', run: (x) => (bump(x.p, spo(x), -3), mood(x.p, 2), '부모님은 좋아하셨다. 배우자는 조금 삐쳤다.') },
      { label: '여행을 간다', cost: 200, run: (x) => (bump(x.p, spo(x), 3), mood(x.p, 4), '양가에 선물만 보내고 둘이 떠났다. 뒷말은 좀 들었다.') },
    ],
  },
  {
    id: 'il_trip', kins: ['middle', 'rich'], w: 1, title: '🧳 사돈과 함께 여행',
    text: (c) => `양가 부모님이 함께 여행을 가자고 한다. ${fullName(c.p)}이(가) 총무를 맡게 됐다.`,
    choices: () => [
      { label: '정성껏 준비한다', cost: 150, run: (x) => (bump(x.p, spo(x), 6), mood(x.p, 4), '사돈끼리 형님 동생 하는 사이가 됐다.') },
      { label: '대충 한다', run: (x) => (bump(x.p, spo(x), -2), '숙소가 별로였다. 다들 말은 안 했지만.') },
    ],
  },
  // ── 넉넉지 않은 사돈 ──
  {
    id: 'il_help', kins: ['poor'], w: 3, title: '🍚 사돈댁 생활비',
    text: (c) => `${fullName(spo(c))}의 부모님 형편이 어렵다. 배우자가 조심스럽게 말을 꺼낸다. "매달 조금씩만 보내 드리면 안 될까?" (연 ${formatMoney(c.ev.data.amt / 2)})`,
    choices: () => [
      { label: '보내 드린다', run: (x) => ((x.p.cash -= x.ev.data.amt / 2), bump(x.p, spo(x), 10), mood(x.p, 2), `−${formatMoney(x.ev.data.amt / 2)}. 배우자가 눈물을 글썽이며 고마워했다.`) },
      { label: '우리도 빠듯하다', run: (x) => (bump(x.p, spo(x), -10), '배우자가 몰래 비상금을 털어 보냈다는 걸 알았다.') },
    ],
  },
  {
    id: 'il_sick', kins: ['poor', 'middle'], w: 1.5, title: '🏥 사돈어른 입원',
    text: (c) => `${fullName(spo(c))}의 아버지가 쓰러지셨다. 수술비 ${formatMoney(c.ev.data.amt)}이 필요하다.`,
    choices: () => [
      { label: '수술비를 댄다', run: (x) => ((x.p.cash -= x.ev.data.amt), bump(x.p, spo(x), 15), `−${formatMoney(x.ev.data.amt)}. 사돈어른이 퇴원하며 ${fullName(x.p)}의 손을 한참 잡으셨다.`) },
      { label: '절반만 보탠다', run: (x) => ((x.p.cash -= x.ev.data.amt / 2), bump(x.p, spo(x), 4), `−${formatMoney(x.ev.data.amt / 2)}. 나머지는 형제들이 나눴다.`) },
      { label: '형편이 안 된다', run: (x) => (bump(x.p, spo(x), -12), '배우자는 말없이 병원으로 향했다.') },
    ],
  },
  {
    id: 'il_warm', kins: ['poor', 'middle'], w: 2, title: '🥬 시골에서 온 택배',
    text: () => `사돈댁에서 택배가 왔다. 직접 키운 쌀, 김치, 참기름… 손편지도 들어 있다. "우리 애 잘 부탁하네."`,
    choices: () => [
      { label: '감사 전화를 드린다', run: (x) => (bump(x.p, spo(x), 4), mood(x.p, 5), '사돈어른 목소리가 밝아졌다. 가족이 하나 더 생긴 기분이다.') },
      { label: '다음엔 보내지 마시라 한다', run: (x) => (bump(x.p, spo(x), -4), '"우리가 부담되나 보다" 하셨단다.') },
    ],
  },
  {
    id: 'il_debt', kins: ['poor'], w: 1, title: '💸 사돈의 빚',
    text: (c) => `사돈댁이 사채에 손을 댔다가 빚 독촉에 시달린다. ${formatMoney(c.ev.data.amt)}이면 정리된다고 한다.`,
    choices: () => [
      { label: '갚아 드린다', run: (x) => ((x.p.cash -= x.ev.data.amt), bump(x.p, spo(x), 12), `−${formatMoney(x.ev.data.amt)}. 배우자가 평생 은혜를 갚겠다고 했다.`) },
      { label: '파산 신청을 도와드린다', run: (x) => (bump(x.p, spo(x), 3), mood(x.p, -2), '법률 상담을 알아봐 드렸다. 돈 대신 발품을 팔았다.') },
      { label: '모른 척한다', run: (x) => (bump(x.p, spo(x), -15), '배우자가 한동안 말을 하지 않았다.') },
    ],
  },
  // ── 집안 차이 ──
  {
    id: 'il_gap_rich', kins: ['rich', 'elite'], w: 0, title: '💔 형편 차이',
    text: (c) => `${fullName(spo(c))}이(가) 한숨을 쉰다. "친정(본가)에선 이 정도는 당연했는데…" 씀씀이도, 휴가도, 선물도 기대가 다르다. (배우자는 ${kinTxt(c)} 출신 · 금슬 ${c.p.bond ?? 60})`,
    choices: () => [
      { label: '큰맘 먹고 명품 선물', cost: 500, run: (x) => (bump(x.p, spo(x), 12), '배우자가 모처럼 웃었다. 통장은 울었다.') },
      { label: '솔직하게 대화한다', run: (x) => { const ok = chance(x.s, (x.p.actual.cha + (x.p.bond ?? 60)) / 170); bump(x.p, spo(x), ok ? 8 : -6); return ok ? '"우리 식대로 살자." 서로의 다름을 인정했다.' : '대화가 말다툼이 됐다. "당신은 몰라."'; } },
      { label: '못 들은 척한다', run: (x) => (bump(x.p, spo(x), -8), '둘 사이에 찬 바람이 분다.') },
    ],
  },
  {
    id: 'il_gap_poor', kins: ['poor', 'middle'], w: 0, title: '💔 기우는 마음',
    text: (c) => `${fullName(spo(c))}이(가) 요즘 기가 죽어 있다. ${fullName(c.p)}네 집안 모임에만 가면 말수가 줄어든다. "나만 딴 세상 사람 같아." (금슬 ${c.p.bond ?? 60})`,
    choices: () => [
      { label: '둘만의 여행을 떠난다', cost: 300, run: (x) => (bump(x.p, spo(x), 12), mood(x.p, 4), '낯선 도시에서 손을 잡고 걸었다. 다시 연애하는 기분이다.') },
      { label: '집안 어른들께 단단히 말한다', run: (x) => (bump(x.p, spo(x), 9), x.p.affinity = clamp(x.p.affinity - 5, -100, 100), '"제 배우자예요." 어른들 표정이 굳었지만, 배우자는 든든해했다.') },
      { label: '시간이 해결하겠지', run: (x) => (bump(x.p, spo(x), -8), '배우자가 점점 말이 없어진다.') },
    ],
  },
];

const ILD: Record<string, IlDef> = Object.fromEntries(IL.map((d) => [d.id, d]));

function toEvent(d: IlDef): EventDef {
  return {
    id: d.id,
    title: () => d.title,
    valid: (c) => alive(c.p) && !!spouseOf(c.s, c.p) && alive(spouseOf(c.s, c.p)!),
    portraits: (c) => [c.p, spouseOf(c.s, c.p)!],
    text: (c) => d.text(c as Kx),
    choices: (c) => gate(c.s, d.choices(c as Kx).map((ch) => ({ label: ch.label, cost: ch.cost, run: (x) => ch.run(x as Kx) }))),
  };
}

// ───────────────────────── 배우자 건강 ─────────────────────────

const spSick: EventDef = {
  id: 'sp_sick',
  title: (c) => `🏥 ${fullName(spouseOf(c.s, c.p)!)}의 건강`,
  valid: (c) => !!spouseOf(c.s, c.p) && alive(spouseOf(c.s, c.p)!),
  portraits: (c) => [spouseOf(c.s, c.p)!],
  text: (c) => {
    const sp = spouseOf(c.s, c.p)!;
    return `${fullName(sp)}이(가) ${c.ev.data.what}. 의사는 "지금 잘 돌보면 회복할 수 있다"고 한다.\n(배우자 건강 ${Math.round(sp.actual.hp)} · 금슬 ${c.p.bond ?? 60})`;
  },
  choices: (c) => {
    const sp = spouseOf(c.s, c.p)!;
    const cost = c.ev.data.cost as number;
    return gate(c.s, [
      { label: '큰 병원에서 치료하고 곁을 지킨다', cost, run: () => ((sp.actual.hp = clamp(sp.actual.hp + 18, 0, 100)), bump(c.p, sp, 12), mood(c.p, -3), `병상 곁을 지켰다. ${fullName(sp)}이(가) 회복하며 "당신 없었으면…" 하고 울었다. (건강 +18 · 금슬 +12)`) },
      { label: '간병인을 쓰고 일에 집중한다', cost: Math.round(cost * 1.5), run: () => ((sp.actual.hp = clamp(sp.actual.hp + 12, 0, 100)), bump(c.p, sp, -4), `치료는 잘 됐다. 하지만 병실은 늘 쓸쓸했다고 한다. (건강 +12 · 금슬 −4)`) },
      { label: '버티자고 한다', run: () => ((sp.actual.hp = clamp(sp.actual.hp - 10, 0, 100)), bump(c.p, sp, -12), mood(sp, -10), `병이 깊어졌다. ${fullName(sp)}의 눈빛이 식었다. (건강 −10 · 금슬 −12)`) },
    ]);
  },
};

const SICK = ['요즘 부쩍 숨이 차다며 쓰러졌다', '건강검진에서 이상 소견이 나왔다', '허리 디스크로 일어나지 못한다', '갑상선에 혹이 발견됐다', '과로로 응급실에 실려 갔다', '우울증 진단을 받았다', '당뇨 판정을 받았다', '심장 쪽 정밀검사가 필요하다고 한다'];

export const INLAW_EVENTS: EventDef[] = [...IL.map(toEvent), spSick];

// ───────────────────────── 해마다 ─────────────────────────

/** 직계 부부마다: 사돈 사건 · 집안 차이 갈등 · 배우자 건강 */
export function inlawYear(s: GameState): void {
  const h = head(s);
  const seen = (s.storySeen ??= {});
  for (const p of Object.values(s.people)) {
    if (!alive(p) || p.inLaw || !isMainline(s, p)) continue;
    const sp = spouseOf(s, p);
    if (!sp || !alive(sp)) continue;
    ensureKin(sp);
    const k = kinOf(sp)!;
    const pending = s.events.some((e) => e.personId === p.id && (ILD[e.defId] || e.defId === 'sp_sick'));
    if (pending) continue;
    const amt = { poor: 600, middle: 1500, rich: 5000, elite: 15000 }[k]; // 2025년 기준 (표시는 그 시대 돈으로)
    // 사돈 사건: 가주 부부는 자주, 자녀 부부는 가끔
    const cool = (seen[`il:${p.id}`] ?? -99) > s.year - 2;
    if (!cool && chance(s, p.id === h.id ? 0.22 : 0.08)) {
      const gap = kinGap(s, sp);
      const pool = IL.filter((d) => d.kins.includes(k) && d.w > 0);
      // 기울어진 결혼이면 갈등 사건이 섞인다
      if (Math.abs(gap) >= 2 && chance(s, 0.45)) pool.push(gap > 0 ? ILD.il_gap_rich : ILD.il_gap_poor);
      const d = pickW(s, pool);
      if (d) {
        seen[`il:${p.id}`] = s.year;
        s.events.push({ uid: s.eventSeq++, defId: d.id, personId: p.id, data: { amt: Math.round(amt * (0.6 + next(s) * 0.8)) } });
        continue;
      }
    }
    // 배우자 건강: 나이 들수록, 약할수록 잦다
    const a = age(s, sp);
    const pSick = (a >= 60 ? 0.12 : a >= 45 ? 0.07 : 0.03) + (sp.actual.hp < 40 ? 0.1 : 0);
    if (p.id === h.id && chance(s, pSick)) {
      s.events.push({ uid: s.eventSeq++, defId: 'sp_sick', personId: p.id, data: { what: pick(s, SICK), cost: int(s, 3, 12) * 100 } });
    }
    // 배우자가 아프면 가주 마음도 무겁다
    if (sp.actual.hp < 35) mood(p, -3);
  }
}

function pickW(s: GameState, pool: IlDef[]): IlDef | undefined {
  const t = pool.reduce((a, d) => a + (d.w || 1), 0);
  let x = next(s) * t;
  for (const d of pool) if ((x -= d.w || 1) <= 0) return d;
  return pool[0];
}

// ───────────────────────── 행동 ─────────────────────────

const hasSp = (s: GameState) => !!spouseOf(s, head(s)) && alive(spouseOf(s, head(s))!);

export const INLAW_ACTIONS: ActionDef[] = [
  {
    id: 'sp_gift',
    cat: '가족',
    icon: '🎁',
    name: '배우자에게 선물',
    desc: '금슬↑ · 부잣집 출신 배우자는 눈이 높다 (선물값이 집안 따라 달라진다)',
    ap: 1,
    stages: ['univ', 'prep', 'adult', 'senior'],
    show: hasSp,
    label: (s) => {
      const sp = spouseOf(s, head(s));
      const k = sp ? kinOf(sp) ?? 'middle' : 'middle';
      return { name: '배우자에게 선물', desc: `금슬↑ · ${KIN_NAME[k]} 출신이라 ${formatMoney(GIFT[k])}쯤은 써야 마음이 전해진다` };
    },
    run: (s) => {
      const me = head(s);
      const sp = spouseOf(s, me)!;
      const k = kinOf(sp) ?? 'middle';
      me.cash -= GIFT[k];
      const d = 6 + int(s, 0, 6);
      bump(me, sp, d);
      mood(sp, 6);
      return `${pick(s, GIFT_LINE)} ${fullName(sp)}이(가) 환하게 웃었다. (−${formatMoney(GIFT[k])} · 금슬 +${d})`;
    },
  },
  {
    id: 'sp_care_kin',
    cat: '가족',
    icon: '🏡',
    name: '사돈댁 챙기기',
    desc: '처가·시가에 안부·선물 · 올해 금슬이 덜 식고 배우자가 고마워한다',
    ap: 1,
    cost: 100,
    stages: ['adult', 'senior'],
    show: hasSp,
    blocked: (s) => (head(s).flags.includes('care:' + s.year) ? '올해 이미 챙겼다' : undefined),
    run: (s) => {
      const me = head(s);
      const sp = spouseOf(s, me)!;
      addFlag(me, 'care:' + s.year);
      me.flags = me.flags.filter((f) => !f.startsWith('care:') || f === 'care:' + s.year);
      bump(me, sp, 5);
      return `${pick(s, ['사돈어른 생신에 꽃바구니를 보냈다.', '주말에 처가(시가)에 들러 하룻밤 자고 왔다.', '사돈댁 김장을 도우러 갔다.', '사돈어른 건강검진을 예약해 드렸다.'])} 배우자가 "고마워"라고 작게 말했다. (금슬 +5)`;
    },
  },
  {
    id: 'sp_health',
    cat: '가족',
    icon: '🩺',
    name: '배우자 건강 챙기기',
    desc: '함께 검진·운동 · 배우자 건강↑ 금슬↑',
    ap: 1,
    cost: 60,
    stages: ['adult', 'senior'],
    show: hasSp,
    label: (s) => {
      const sp = spouseOf(s, head(s));
      return { name: '배우자 건강 챙기기', desc: `함께 검진·운동 · 배우자 건강 ${sp ? Math.round(sp.actual.hp) : '?'}${sp && sp.actual.hp < 45 ? ' ⚠ 약해졌다' : ''}` };
    },
    run: (s) => {
      const me = head(s);
      const sp = spouseOf(s, me)!;
      const g = sp.actual.hp < 50 ? int(s, 4, 8) : int(s, 1, 4);
      sp.actual.hp = clamp(sp.actual.hp + g, 0, Math.max(sp.potential.hp, sp.actual.hp));
      bump(me, sp, 3);
      return `${pick(s, ['둘이 새벽 산책을 시작했다.', '함께 종합검진을 받았다.', '배우자 도시락을 챙겨 줬다.', '같이 수영을 등록했다.'])} (배우자 건강 +${g} · 금슬 +3)`;
    },
  },
];
const GIFT: Record<Kin, number> = { poor: 30, middle: 60, rich: 200, elite: 500 };
const GIFT_LINE = ['기념일도 아닌데 꽃다발을 안겼다.', '갖고 싶다던 가방을 몰래 샀다.', '손편지와 함께 목걸이를 건넸다.', '둘이 처음 만난 식당을 예약했다.', '배우자 이름을 새긴 만년필을 선물했다.'];

/** 결혼 후보 고를 때 보이는 집안 이름 */
export const kinLabel = (p: Person) => KIN_NAME[kinOf(p) ?? 'middle'];
export const _inlaw = { ILD };
