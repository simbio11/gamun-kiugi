// 📖 가문 서사 (saga): 따로 놀던 시스템들을 이야기로 엮는다.
//  ① 상속 분쟁 3막 — 유언 없이 가주가 떠나면: 빈소의 말다툼 → 분할 협의 → 유류분 소송 → 분가 · 10년 뒤 제삿날의 화해
//  ② 숙적의 족보 — 라이벌 가문에도 자식·손주가 있다. 같은 사람이 세월을 두고 반 친구 → 면접관 → 소개팅 상대 → 환자 → 임종으로 다시 나온다
//  ③ 조상과 기록 — 조상 카드(지난 가문)·연대기 속 옛일·가보·족보가 지금 가족의 이야기로 돌아온다
//
// 제도 참고: 민법 1008조의2 기여분, 1112조 유류분(법정상속분의 1/2, 2024 헌재 결정으로 형제자매 유류분 위헌), 상속재산분할심판(가정법원).
//   "협의가 안 되면 가정법원 분할 심판, 평균 1~2년" (법원 사법연감 가사 사건 처리 기간 참고).
import { chance, int, pick } from './rng';
import { gate, iga, schedule, type Choice, type Ctx, type EventDef } from './ev-util';
import { addFlag, addTrait, age, alive, check, clamp, fullName, hasFlag, hasTrait, head, isMainline, mark, parentsOf, randomName, siblingsOf, spouseOf } from './people';
import { formatMoney, personWorth } from './economy';
import { wageIndex } from './pay';
import { grant } from './rewards';
import { JOBS, STAT_NAMES } from './data';
import type { GameState, Person, Sex } from './types';

const hap = (p: Person, d: number) => (p.happiness = clamp(p.happiness + d, 0, 100));
const aff = (p: Person, d: number) => (p.affinity = clamp(p.affinity + d, -100, 100));
const W = (s: GameState, v: number) => Math.max(1, Math.round(v * wageIndex(s.year)));
const n = (p: Person) => fullName(p);
const seen = (s: GameState, k: string) => (s.storySeen ??= {})[k];
const see = (s: GameState, k: string) => ((s.storySeen ??= {})[k] = s.year);
const push = (s: GameState, defId: string, p: Person, data?: Record<string, unknown>) => s.events.push({ uid: s.eventSeq++, defId, personId: p.id, data: data ?? {} });
const ch = (c: Ctx, list: (Choice | false | undefined)[]) => gate(c.s, list.filter((x): x is Choice => !!x));

// ════════════════ ① 상속 분쟁 3막 ════════════════

/** 가주가 유언 없이 떠났을 때(sim.ts deaths) 부른다: 성인 형제가 둘 이상이면 막이 오른다 */
export function startInheritanceDrama(s: GameState, dead: Person, heir: Person) {
  if (s.willWritten) return;
  const sibs = siblingsOf(s, heir).filter((q) => alive(q) && !q.inLaw && age(s, q) >= 20 && dead.childIds.includes(q.id));
  if (!sibs.length || !dead.childIds.includes(heir.id)) return;
  // 가장 서운할 만한 형제: 사이가 나쁘거나 욕심 많은 쪽
  const rival = [...sibs].sort((a, b) => a.affinity - b.affinity + (hasTrait(b, 'greedy') ? 30 : 0) - (hasTrait(a, 'greedy') ? 30 : 0))[0];
  push(s, 'sg_wake', heir, { deadId: dead.id, sibId: rival.id });
}

const sibOf = (c: Ctx) => c.s.people[c.ev.data?.sibId as string] as Person | undefined;
const deadOf = (c: Ctx) => c.s.people[c.ev.data?.deadId as string] as Person | undefined;

const WAKE: EventDef = {
  id: 'sg_wake',
  title: () => '🕯 1막 · 빈소',
  valid: (c) => !!sibOf(c) && alive(sibOf(c)!),
  text: (c) => {
    const sib = sibOf(c)!;
    const d = deadOf(c);
    return `${d ? `${n(d)}의 ` : ''}빈소. 조문객이 뜸해진 새벽 두 시, ${iga(n(sib))} 술잔을 내려놓았다.\n"아버지(어머니)가 그 집은 나 준다고 했어. 녹음은 없지만 ${n(c.p)}도 들었잖아."\n친척들이 고개를 돌린다. 영정 사진이 내려다본다.`;
  },
  choices: (c) => {
    const sib = sibOf(c)!;
    const mom = spouseOf(c.s, deadOf(c) ?? c.p);
    return ch(c, [
      { label: '"상 치르고 이야기하자"', run: (x) => (aff(sib, -3), schedule(x.s, 1, 'sg_split', x.p.id, x.ev.data), `${n(sib)}이(가) 입을 다물었다. 발인 날 아침, 형제는 서로 눈을 마주치지 않았다.\n(1년 뒤 상속재산 분할 협의)`) },
      { label: '그 자리에서 맞받아친다', run: (x) => (aff(sib, -15), mark(sib, 'grudge', 2), (x.s.fame = Math.max(0, x.s.fame - 2)), schedule(x.s, 1, 'sg_split', x.p.id, { ...x.ev.data, hot: 1 }), `"녹음도 없다며!" 목소리가 커졌다. 조문 온 동네 사람들이 수군거렸다. 다음 날 동네에 소문이 다 났다.\n(1년 뒤 분할 협의 — 이미 날이 서 있다)`) },
      mom && alive(mom) && { label: `${n(mom)}에게 중재를 부탁한다`, run: (x) => (check(x.s, mom.actual.mor * 0.5 + mom.actual.cha * 0.5, 50, 12) ? (aff(sib, 6), schedule(x.s, 1, 'sg_split', x.p.id, { ...x.ev.data, calm: 1 }), `"너희 아버지 앞에서 이게 무슨 짓이니." 둘 다 고개를 숙였다. 어머니가 협의 자리를 잡아 주기로 했다.`) : (aff(sib, -5), schedule(x.s, 1, 'sg_split', x.p.id, x.ev.data), `어머니는 울기만 했다. 형제 사이에 낀 어머니의 등이 작아 보였다.`)) },
    ]);
  },
};

const SPLIT: EventDef = {
  id: 'sg_split',
  title: () => '⚖ 2막 · 상속재산 분할 협의',
  valid: (c) => !!sibOf(c) && alive(sibOf(c)!),
  text: (c) => {
    const sib = sibOf(c)!;
    const share = W(c.s, 3000 + Math.max(0, personWorth(c.s, c.p)) * 0.08);
    c.ev.data.share = Math.round(share);
    return `변호사 사무실 회의실. ${n(sib)}이(가) 서류 뭉치를 내밀었다.\n"부모님 병원비, 간병, 내가 10년 했어. 기여분 인정해 줘. ${formatMoney(c.ev.data.share)} 더 받아야 맞아."${c.ev.data.hot ? '\n빈소에서의 일 때문에 공기가 얼음장이다.' : ''}${c.ev.data.calm ? '\n어머니가 맨 끝자리에 앉아 두 사람을 번갈아 본다.' : ''}`;
  },
  choices: (c) => {
    const sib = sibOf(c)!;
    const share: number = c.ev.data.share;
    return ch(c, [
      { label: `기여분을 인정하고 ${formatMoney(share)}을 넘긴다`, cost: share, run: (x) => ((sib.cash += share), aff(sib, 20), hap(sib, 10), x.p.flags.push('fair_split'), mark(x.p, 'mor', 1), `서명했다. ${iga(n(sib))} 처음으로 "고맙다"고 했다. 돈은 줄었지만 형제는 남았다.`) },
      { label: '반반 조정안을 낸다', run: (x) => (check(x.s, x.p.actual.cha * 0.6 + x.p.actual.mor * 0.4 + (x.ev.data.calm ? 10 : 0), 55, 10) ? ((x.p.cash -= Math.round(share / 2)), (sib.cash += Math.round(share / 2)), aff(sib, 8), `"반만 받을게. 대신 제사는 네가 지내." 악수로 끝났다. (${formatMoney(Math.round(share / 2))} 정산)`) : (aff(sib, -12), schedule(x.s, int(x.s, 1, 2), 'sg_court', x.p.id, x.ev.data), `"반? 나를 거지로 알아?" 의자가 뒤로 넘어갔다. 내용증명이 날아왔다.\n(1~2년 뒤 법정)`)) },
      { label: '법대로 하자 (한 푼도 못 준다)', run: (x) => (aff(sib, -25), addFlag(sib, 'grievance'), schedule(x.s, int(x.s, 1, 2), 'sg_court', x.p.id, x.ev.data), `"그래, 법정에서 보자." 형제의 단톡방이 조용해졌다. 명절에 빈자리가 생겼다.\n(1~2년 뒤 유류분·기여분 소송)`) },
      { label: '가업(집)을 넘기고 내가 현금만 받는다', run: (x) => ((x.p.cash -= Math.round(share * 0.3)), (sib.cash += Math.round(share * 0.3)), addFlag(sib, 'got_family_home'), aff(sib, 15), mark(x.p, 'mor', 1), `${n(sib)}이(가) 옛집에 들어가 살기로 했다. 나는 현금 조금과 족보만 챙겼다. 가주 자리는 지켰다.`) },
    ]);
  },
};

const COURT: EventDef = {
  id: 'sg_court',
  title: () => '🏛 3막 · 형제의 법정',
  valid: (c) => !!sibOf(c) && alive(sibOf(c)!),
  text: (c) => {
    const sib = sibOf(c)!;
    return `가정법원 3호 법정. 원고 ${n(sib)}, 피고 ${n(c.p)}.\n상대 변호사가 어린 시절 사진을 증거로 냈다. "피고는 늘 부모님의 편애를 받았습니다."\n방청석에 사촌들이 와 있다. 오늘 이 집안의 바닥이 다 드러난다.`;
  },
  choices: (c) => {
    const sib = sibOf(c)!;
    const share: number = c.ev.data.share ?? W(c.s, 4000);
    return ch(c, [
      { label: '대형 로펌으로 끝까지 간다', cost: W(c.s, 2500), run: (x) => (chance(x.s, 0.6) ? (aff(sib, -30), addFlag(sib, 'estranged'), schedule(x.s, int(x.s, 8, 12), 'sg_reconcile', x.p.id, x.ev.data), `승소. 재산은 지켰다. 법원 계단에서 ${iga(n(sib))} 말했다. "이제 우린 남이야."\n(그 뒤로 ${n(sib)}은(는) 제사에 오지 않는다)`) : ((x.p.cash -= share), (sib.cash += share), aff(sib, -20), addFlag(sib, 'estranged'), schedule(x.s, int(x.s, 8, 12), 'sg_reconcile', x.p.id, x.ev.data), `패소. 유류분 ${formatMoney(share)} 반환 판결. 변호사비까지 날렸다. 형제는 원수가 됐다.`)) },
      { label: '조정실에서 합의한다', run: (x) => ((x.p.cash -= Math.round(share * 0.7)), (sib.cash += Math.round(share * 0.7)), aff(sib, 5), `조정위원이 둘을 따로 불렀다. "부모님이 이걸 보고 계신다고 생각해 보세요." ${formatMoney(Math.round(share * 0.7))}에 합의했다. 개운하지는 않다.`) },
      { label: '분가를 허락한다 (재산 일부와 함께 독립)', run: (x) => {
        const part = Math.round(Math.max(share, Math.max(0, personWorth(x.s, x.p)) * 0.12));
        x.p.cash -= part;
        sib.cash += part;
        addFlag(sib, 'branch_founder');
        aff(sib, 18);
        (x.s.fame += 2);
        grant(x.s, '🌿', `분가: ${n(sib)}`, `${n(sib)}이(가) ${formatMoney(part)}을 받아 따로 일가를 이뤘다. 족보에 새 가지가 생겼다. 다투던 형제가 "각자의 집안"으로 갈라섰다.`, 'rare');
        return `"그래, 너는 너대로 일가를 이뤄라." ${n(sib)}에게 ${formatMoney(part)}을 떼어 주고 분가를 허락했다. 족보에 새 가지가 났다. 이상하게 마음이 가볍다.`;
      } },
      { label: '소를 취하해 달라고 빈다', run: (x) => (check(x.s, x.p.actual.cha * 0.5 + x.p.actual.mor * 0.5, 60, 10) ? (aff(sib, 25), hap(x.p, 5), `둘이 법원 매점에서 컵라면을 먹었다. 어릴 때처럼. 소송은 취하됐다.`) : (aff(sib, -10), `"이제 와서?" 문이 닫혔다. 재판은 계속된다.`)) },
    ]);
  },
};

const RECONCILE: EventDef = {
  id: 'sg_reconcile',
  title: () => '🍶 십 년 뒤, 제삿날',
  valid: (c) => !!sibOf(c) && alive(sibOf(c)!) && alive(c.p),
  text: (c) => {
    const sib = sibOf(c)!;
    const d = deadOf(c);
    return `${d ? `${n(d)}의 ` : ''}기일. 상을 다 차렸을 때 초인종이 울렸다.\n${n(sib)}이다. 머리가 많이 셌다. 손에 부모님이 좋아하던 곶감 한 상자.\n"…들어가도 되냐."`;
  },
  choices: (c) => {
    const sib = sibOf(c)!;
    return ch(c, [
      { label: '말없이 수저를 한 벌 더 놓는다', run: (x) => (aff(sib, 40), (sib.flags = sib.flags.filter((f) => f !== 'estranged' && f !== 'grievance')), hap(x.p, 12), grant(x.s, '🍶', '형제의 화해', `${n(x.p)}와(과) ${n(sib)}, 법정에서 갈라섰던 형제가 제사상 앞에서 다시 만났다.`, 'rare'), '절을 두 번 했다. 술잔을 주고받다가 둘 다 울었다. 아이들은 처음 보는 큰아버지(고모)에게 세배했다.') },
      { label: '"이제 와서 뭘"', run: (x) => (aff(sib, -10), hap(x.p, -6), `문이 닫혔다. 곶감 상자는 현관 앞에 놓여 있었다. 그날 밤 잠이 오지 않았다.`) },
    ]);
  },
};

// ════════════════ ② 숙적의 족보 ════════════════

/** 라이벌 가문 사람: 나이대에 맞는 이를 찾고, 없으면 새로 태어나게 해 족보에 올린다 (같은 사람이 세월을 두고 다시 나온다) */
function rivalKin(s: GameState, born: number): { name: string; born: number; sex: Sex } | undefined {
  const r = s.rival;
  if (!r) return undefined;
  r.kin ??= [];
  const hit = r.kin.find((k) => Math.abs(k.born - born) <= 3);
  if (hit) return hit;
  const sex: Sex = chance(s, 0.5) ? 'M' : 'F';
  const k = { name: r.name + randomName(s, sex, born), born, sex };
  r.kin.push(k);
  if (r.kin.length > 12) r.kin.shift();
  return k;
}
const RV = (s: GameState) => `${s.rival?.name ?? ''}씨 가문`;
const kinOf = (c: Ctx) => ({ name: c.ev.data.kin as string, born: c.ev.data.kb as number, sex: c.ev.data.sex as Sex });
const feud = (s: GameState, d: number) => s.rival && (s.rival.feud = clamp(s.rival.feud + d, 0, 100));
const hostileRv = (s: GameState) => !!s.rival && !s.rival.fallen && !s.rival.allied;
/** 이 사람(라이벌 쪽)을 우리가 전에 만난 적이 있나 */
const metBefore = (s: GameState, kin: string) => s.log.some((l) => l.text.includes(kin));

const RV_INTERVIEW: EventDef = {
  id: 'sg_rv_interview',
  title: () => '🪑 면접관의 얼굴',
  text: (c) => {
    const k = kinOf(c);
    return `${n(c.p)}의 최종 면접. 가운데 앉은 면접관 명패에 "${k.name}"이라고 적혀 있다.\n${RV(c.s)} 사람이다.${metBefore(c.s, k.name) ? ` 예전에 한 번 얽힌 적이 있는, 바로 그 ${k.name}.` : ''} 그쪽도 이력서의 성을 보고 눈썹이 올라갔다.`;
  },
  choices: (c) => {
    const k = kinOf(c);
    return ch(c, [
      { label: '집안 얘기는 꺼내지 않고 실력으로', odds: undefined, run: (x) => (check(x.s, x.p.actual.int * 0.6 + x.p.actual.cha * 0.4, 55, 10) ? (mark(x.p, 'network', 1), feud(x.s, -6), `면접이 끝나고 ${iga(k.name)} 엘리베이터 앞에서 말했다. "집안은 집안이고. 잘 왔어요." 합격 통보가 왔다.`) : (hap(x.p, -6), feud(x.s, 4), `"우리 회사와 맞지 않는 것 같네요." 떨어졌다. 공정했는지는 모른다.`)) },
      { label: '"저희 집안 아시죠?" 먼저 웃는다', run: (x) => (check(x.s, x.p.actual.cha, 55, 12) ? (feud(x.s, -10), mark(x.p, 'network', 2), `면접장에 웃음이 터졌다. "할아버지들이 동창회에서 싸우신 거 우리 집에선 전설이에요." 둘은 그날 저녁 술을 마셨다.`) : (feud(x.s, 6), `분위기가 싸해졌다. 나머지 질문이 유독 날카로웠다.`)) },
    ]);
  },
};

const RV_BLIND: EventDef = {
  id: 'sg_rv_blind',
  title: () => '☕ 소개팅 상대가…',
  text: (c) => {
    const k = kinOf(c);
    return `친구가 "진짜 괜찮은 사람"이라며 잡아 준 소개팅. 카페 문이 열리고 들어온 사람의 이름은 ${k.name}.\n${RV(c.s)}의 ${k.sex === 'M' ? '아들' : '딸'}이다. 둘 다 서로의 성을 듣고 커피를 쏟을 뻔했다.`;
  },
  choices: (c) =>
    ch(c, [
      { label: '집안은 잊고 대화해 본다', run: (x) => (check(x.s, x.p.actual.cha, 50, 12) ? (feud(x.s, -8), schedule(x.s, int(x.s, 1, 2), 'rv_union', x.p.id, { k: kinOf(x).name }), hap(x.p, 10), `세 시간이 훌쩍 갔다. "우리 할아버지들 얘기, 다음에 또 해요." 연락처를 주고받았다.\n(두 집안이 이 사실을 알게 되는 건 시간문제다)`) : `대화가 자꾸 집안 얘기로 샜다. 어색하게 헤어졌다.`) },
      { label: '정중히 일어선다', run: (x) => (feud(x.s, 2), `"죄송해요, 저희 집안이…" 계산은 각자 했다.`) },
    ]),
};

const RV_PATIENT: EventDef = {
  id: 'sg_rv_patient',
  title: () => '🏥 원수 집안의 환자',
  text: (c) => `새벽 응급실. 들것에 실려 온 환자의 보호자가 ${c.s.rival!.boss}이다.\n"${RV(c.s)}" — 담당의는 ${n(c.p)}. 보호자가 의사 가운의 이름표를 보고 얼어붙었다.`,
  choices: (c) =>
    ch(c, [
      { label: '의사로서 최선을 다한다', run: (x) => (check(x.s, x.p.actual.int, 55, 10) ? (feud(x.s, -30), (x.s.fame += 3), addFlag(x.p, 'saved_rival'), grant(x.s, '🩺', '원수를 살린 의사', `${n(x.p)}이(가) ${RV(x.s)} 사람의 목숨을 구했다. 다음 날 병원 앞에 화환이 왔다.`, 'rare'), `수술은 성공했다. 복도에서 ${x.s.rival!.boss}이(가) 고개를 깊이 숙였다. "…고맙소. 우리 집안이 빚을 졌소."`) : (feud(x.s, 5), `최선을 다했지만 합병증이 왔다. "일부러 그런 거 아니오?" 오해가 남았다.`)) },
      { label: '다른 의사에게 넘긴다', run: () => `공정하게, 다른 교수에게 넘겼다. 그날 당직표는 오래 기억에 남았다.` },
    ]),
};

const RV_DEATHBED: EventDef = {
  id: 'sg_rv_deathbed',
  title: () => '🕯 숙적의 임종',
  text: (c) => `${RV(c.s)}에서 사람이 왔다. ${c.s.rival!.boss}이(가) 위독한데, 마지막으로 ${n(c.p)}을(를) 보고 싶다고 한다.\n수십 년을 다툰 사람이다. 병실 창가에 두 집안이 함께 찍힌 오래된 동네 운동회 사진이 놓여 있다.`,
  choices: (c) =>
    ch(c, [
      { label: '병실에 간다', run: (x) => (feud(x.s, -40), hap(x.p, 6), mark(x.p, 'mor', 1), grant(x.s, '🤝', '숙적과의 작별', `${x.s.rival!.boss}이(가) ${n(x.p)}의 손을 잡고 떠났다. "다음 생엔 한 집안으로 태어납시다."`, 'epic'), `앙상한 손이 내 손을 잡았다. "자네 덕에 평생 게으를 틈이 없었네." 둘 다 웃었다. 그 웃음이 마지막이었다.`) },
      { label: '가지 않는다', run: (x) => (feud(x.s, 10), `가지 않았다. 부고 문자에 답장도 하지 않았다. 그쪽 장손이 이를 갈았다는 말이 들린다.`) },
      { label: '화환만 보낸다', run: (x) => (feud(x.s, -8), `"삼가 고인의 명복을 빕니다 — ${x.s.familyName}씨 가문 일동." 화환은 빈소 맨 앞에 놓였다고 한다.`) },
    ]),
};

const RV_GRANDKIDS: EventDef = {
  id: 'sg_rv_grandkids',
  title: () => '🧒 손주들은 모른다',
  text: (c) => {
    const k = kinOf(c);
    return `${n(c.p)}이(가) 단짝 친구를 데려왔다. "할머니(할아버지), 얘는 ${k.name}이야!"\n${RV(c.s)}의 손주다. 아이들은 두 집안의 50년 묵은 앙금을 하나도 모른다. 둘이 마당에서 깔깔댄다.`;
  },
  choices: (c) =>
    ch(c, [
      { label: '간식을 두 배로 내온다', run: (x) => (feud(x.s, -12), hap(x.p, 8), `아이들이 떡볶이를 먹다 서로 얼굴에 소스를 묻혔다. 그 집 할머니가 데리러 와서 대문 앞에서 한참 서 있다 갔다. "…애들은 애들이지요."`) },
      { label: '"그 집 애랑은 놀지 마라"', run: (x) => (feud(x.s, 6), aff(x.p, -8), hap(x.p, -8), `아이가 울면서 방에 들어갔다. 다음 날도 둘은 학교 뒤에서 몰래 놀았다고 한다.`) },
    ]),
};

const RV_TAKEOVER: EventDef = {
  id: 'sg_rv_takeover',
  title: () => '📉 적대적 인수합병',
  text: (c) => `${RV(c.s)}이(가) 우리 회사 지분을 몰래 사 모았다. 공시가 떴다: 지분 18%.\n${c.s.rival!.boss}: "경영권, 이번엔 우리가 가져가겠소."`,
  choices: (c) => {
    const cost = W(c.s, 6000);
    return ch(c, [
      { label: `백기사를 찾아 지분을 방어한다 (${formatMoney(cost)})`, cost, run: (x) => (check(x.s, x.p.actual.cha * 0.5 + x.p.actual.int * 0.5, 58, 10) ? (feud(x.s, 10), (x.s.fame += 2), `우호 지분을 모아 표 대결에서 이겼다. 주주총회장에서 ${x.s.rival!.boss}이(가) 먼저 자리를 떴다.`) : ((x.p.jobLevel = Math.max(0, x.p.jobLevel - 1)), feud(x.s, 15), `표 대결에서 졌다. 이사회 자리 둘을 내줬다. 회사가 한 단계 작아졌다.`)) },
      { label: '역으로 저쪽 회사를 공격한다', run: (x) => (chance(x.s, 0.45) ? (x.s.rival && (x.s.rival.worth = Math.round(x.s.rival.worth * 0.8)), feud(x.s, 20), `팩맨 방어! 저쪽 계열사 지분을 사들였다. ${RV(x.s)}이(가) 백기를 들었다.`) : ((x.p.cash -= W(x.s, 3000)), feud(x.s, 12), `역공은 실패했다. 손실만 남았다.`)) },
      { label: '협상 테이블로', run: (x) => (check(x.s, x.p.actual.cha, 55, 10) ? (feud(x.s, -20), `"서로 피 볼 필요 있소?" 지분을 되사는 대신 합작 법인을 세우기로 했다.`) : (feud(x.s, 5), `협상은 결렬. 저쪽은 지분을 계속 쥐고 있다.`)) },
    ]);
  },
};

const RV_LEDGER: EventDef = {
  id: 'sg_rv_ledger',
  title: () => '📒 낡은 동업 장부',
  text: (c) => {
    const a = c.s.ancestor;
    return `창고를 정리하다 누렇게 바랜 장부가 나왔다. 첫 장에 두 이름이 나란히 적혀 있다.\n"${c.s.familyName}·${c.s.rival!.name} 합동 상회 — 이익은 반반, 손해도 반반."${a ? `\n그 옆에 작게, 조상 ${a.name}의 글씨로 "${a.role}… 이 약속을 지키지 못했다"는 메모가 있다.` : ''}\n두 집안은 원래 동업자였다.`;
  },
  choices: (c) =>
    ch(c, [
      { label: '장부를 들고 저쪽 집을 찾아간다', run: (x) => (check(x.s, x.p.actual.mor * 0.5 + x.p.actual.cha * 0.5, 50, 12) ? (feud(x.s, -35), (x.s.fame += 2), `${x.s.rival!.boss}이(가) 장부를 오래 들여다보았다. "우리 할아버지가 늘 하던 말이 있소. 그 집에 받을 게 있다고." 둘은 처음으로 같은 상에서 밥을 먹었다.`) : (feud(x.s, 8), `"그래서 지금 돈을 내놓으라는 거요?" 오해만 샀다.`)) },
      { label: '가족에게만 이야기하고 장부는 금고에', run: (x) => (mark(x.p, 'mor', 1), addFlag(x.p, 'knows_old_pact'), `아이들에게 장부를 보여 주었다. "우리 집이 왜 저 집이랑 그렇게 싸웠는지, 이제 알겠지?"`) },
      { label: '태워 버린다', run: (x) => (feud(x.s, 5), `불길 속에서 두 이름이 같이 탔다. 아무도 모르는 일이 됐다.`) },
    ]),
};

const RV_SCANDAL: EventDef = {
  id: 'sg_rv_scandal',
  title: () => '📰 선거 전날의 폭로',
  text: (c) => `투표 이틀 전, 한 언론사가 ${n(c.p)}의 "20년 전 일"을 보도했다. 제보자는 익명.\n하지만 그 기자는 ${RV(c.s)} 사람과 사돈이다. 누가 뒤에 있는지 뻔하다.`,
  choices: (c) =>
    ch(c, [
      { label: '정면 돌파 기자회견', run: (x) => (check(x.s, x.p.actual.cha * 0.6 + x.p.actual.mor * 0.4, 58, 10) ? (feud(x.s, 8), x.p.pol && (x.p.pol.approval = clamp(x.p.pol.approval + 4, 5, 90)), `"사실은 이렇습니다." 해명이 오히려 동정표를 모았다.`) : (x.p.pol && (x.p.pol.approval = clamp(x.p.pol.approval - 8, 5, 90)), feud(x.s, 6), `해명이 변명처럼 들렸다. 지지율이 빠졌다.`)) },
      { label: '저쪽 비리로 맞불', run: (x) => (chance(x.s, 0.5) ? (feud(x.s, 20), x.s.rival && (x.s.rival.fame = Math.max(0, x.s.rival.fame - 10)), `${RV(x.s)}의 탈세 의혹이 터졌다. 진흙탕 싸움. 양쪽 다 상처투성이다.`) : ((x.s.fame = Math.max(0, x.s.fame - 4)), feud(x.s, 12), `맞불은 역풍이었다. "네거티브 그만하라"는 여론.`)) },
    ]),
};

// ════════════════ ③ 조상과 기록 ════════════════

const ANC_DIARY: EventDef = {
  id: 'sg_anc_diary',
  title: () => '📔 다락방의 일기장',
  text: (c) => {
    const a = c.s.ancestor!;
    return `할머니 댁 다락방에서 낡은 일기장이 나왔다. 표지에 "${a.name}". 조상, ${a.family}씨 가문 ${a.gen}대 가주의 일기다.\n${a.born}년생. ${a.role}. 마지막 장에 이렇게 적혀 있다.\n"내 ${STAT_NAMES[a.stat]}은(는) 타고난 게 아니라 버텨서 얻은 것이다. 이 일기를 읽는 아이야, 너도 할 수 있다."`;
  },
  choices: (c) => {
    const a = c.s.ancestor!;
    return ch(c, [
      { label: '밤새 읽는다', run: (x) => ((x.p.actual[a.stat] = clamp(x.p.actual[a.stat] + 3, 0, x.p.potential[a.stat])), hap(x.p, 5), addFlag(x.p, 'read_ancestor_diary'), `${n(x.p)}의 눈이 반짝였다. 조상이 걸었던 길(${a.role})이 남 일 같지 않다. (${STAT_NAMES[a.stat]} +3)`) },
      { label: '가족이 돌려 읽는다', run: (x) => {
        for (const q of Object.values(x.s.people)) if (alive(q) && isMainline(x.s, q)) hap(q, 3);
        return `저녁마다 한 장씩 소리 내어 읽었다. 할머니가 "그 양반이 그랬지" 하며 웃었다. (가족 행복 +3)`;
      } },
    ]);
  },
};

const ANC_NAMESAKE: EventDef = {
  id: 'sg_anc_namesake',
  title: () => '👶 조상의 이름을 물려줄까',
  text: (c) => {
    const a = c.s.ancestor!;
    return `${n(c.p)}이(가) 태어났다. 집안 어른이 말한다.\n"조상 ${a.name} 어른의 이름 한 자를 물려주면 어떻겠느냐. ${a.role}까지 가신 분이다."`;
  },
  choices: (c) => {
    const a = c.s.ancestor!;
    const given = a.name.slice(a.family.length);
    return ch(c, [
      { label: `"${given}"을(를) 이름에 넣는다`, run: (x) => ((x.p.name = given), (x.p.potential[a.stat] = clamp(x.p.potential[a.stat] + 2, 0, 98)), addFlag(x.p, 'namesake'), `${n(x.p)}. 이름을 부를 때마다 어른들 표정이 달라진다. (${STAT_NAMES[a.stat]} 잠재력 +2)`) },
      { label: '새 시대엔 새 이름', run: (x) => `${n(x.p)}. 아이는 아이의 길을 간다.` },
    ]);
  },
};

const ANC_LOOKALIKE: EventDef = {
  id: 'sg_anc_lookalike',
  title: () => '🖼 영정 사진 속 얼굴',
  text: (c) => `명절에 큰집에 갔다. 벽에 걸린 증조부모 사진 앞에서 친척들이 웅성거린다.\n"어머, ${n(c.p)} 좀 봐. 증조할아버지(할머니)랑 똑같네!" 눈매, 웃을 때 한쪽만 올라가는 입꼬리까지.`,
  choices: (c) =>
    ch(c, [
      { label: '증조부모 이야기를 들려 달라고 한다', run: (x) => {
        const anc = parentsOf(x.s, x.p).flatMap((q) => parentsOf(x.s, q)).flatMap((q) => parentsOf(x.s, q)).find((q) => q && !alive(q));
        const role = anc ? anc.flags.find((f) => f.startsWith('peakjob:'))?.split(':').slice(2).join(':') : undefined;
        mark(x.p, 'roots', 2);
        hap(x.p, 4);
        return anc ? `${n(anc)}. ${anc.birthYear}년생${role ? `, ${role}` : ''}. 큰아버지가 밤늦도록 이야기를 풀었다. ${n(x.p)}은(는) 처음으로 "우리 집안"이라는 말을 실감했다.` : '어른들 이야기가 끝이 없었다. 아이는 졸린 눈으로 끝까지 들었다.';
      } },
      { label: '"나는 나야!"', run: (x) => (addTrait(x.p, 'rebel'), `${iga(n(x.p))} 볼을 부풀렸다. 그 표정마저 똑같다고 다들 웃었다.`) },
    ]),
};

const JOKBO: EventDef = {
  id: 'sg_jokbo',
  title: () => '📜 족보를 새로 엮는다',
  text: (c) => `${c.s.familyName}씨 가문이 ${c.s.generation}대를 이었다. 종친회에서 족보를 새로 펴내자고 한다.\n지난 세대들의 이름, 직업, 묘소… 빠진 사람도 많고, 넣기 곤란한 사람도 있다.`,
  choices: (c) => {
    const cost = W(c.s, 800);
    const black = Object.values(c.s.people).filter((q) => !q.inLaw && (hasFlag(q, 'criminal') || hasFlag(q, 'estranged') || hasFlag(q, 'branch_founder')));
    return ch(c, [
      { label: `있는 그대로 모두 싣는다 (${formatMoney(cost)})`, cost, run: (x) => ((x.s.fame += 4), mark(x.p, 'mor', 1), grant(x.s, '📜', `${x.s.familyName}씨 족보 ${x.s.generation}대본`, `잘난 사람도, 엇나간 사람도, 분가한 형제도 모두 한 책에 실었다. "족보는 자랑이 아니라 기억이다."`, 'rare'), black.length ? `${black.map(n).slice(0, 2).join(', ')}의 이름도 넣었다. 분가했던 집에서 고맙다는 전화가 왔다.` : '빠짐없이 실었다. 두툼한 책이 가보가 됐다.') },
      { label: `흠 있는 이름은 빼고 낸다 (${formatMoney(cost)})`, cost, run: (x) => ((x.s.fame += 2), black.forEach((q) => alive(q) && aff(q, -20)), black.length ? `${black.map(n).slice(0, 2).join(', ')}의 이름이 빠졌다. 그 집에서 항의 전화가 왔다.` : '깔끔한 족보가 나왔다.') },
      { label: '디지털 족보 앱으로 만든다', run: (x) => ((x.s.fame += 1), `가계도가 휴대폰 안으로 들어갔다. 손주들이 "우리 조상 중에 ${pick(x.s, ['장군', '부자', '시인', '독립운동가', '사기꾼'])}도 있대!" 하며 신기해한다.`) },
    ]);
  },
};

const JESA: EventDef = {
  id: 'sg_jesa',
  title: () => '🍚 명절, 한자리에 모인 형제들',
  text: (c) => {
    const sibs = siblingsOf(c.s, c.p).filter((q) => alive(q) && !q.inLaw);
    const bad = sibs.filter((q) => q.affinity < -10 || hasFlag(q, 'grievance'));
    return `${pick(c.s, ['설', '추석'])} 아침. 전 부치는 냄새와 함께 형제자매 ${sibs.length}명이 모였다.${bad.length ? `\n${bad.map(n).join(', ')}은(는) 아직 서운한 게 있는 눈치다. 술이 몇 순배 돌자 옛날 얘기가 나온다.` : '\n오랜만에 다 같이 웃는다.'}`;
  },
  choices: (c) => {
    const sibs = siblingsOf(c.s, c.p).filter((q) => alive(q) && !q.inLaw);
    return ch(c, [
      { label: '고생한 형제에게 먼저 술을 따른다', run: (x) => (sibs.forEach((q) => aff(q, q.affinity < 0 ? 12 : 4)), hap(x.p, 4), `"그동안 미안했다." 한마디에 분위기가 풀렸다. 조카들이 사촌끼리 뛰어논다.`) },
      { label: '재산 얘기가 나오자 자리를 뜬다', run: () => (sibs.forEach((q) => aff(q, -4)), `밖에 나와 담배를 물었다. 창문 너머로 웃음소리가 들렸다.`) },
      { label: '"내년엔 각자 집에서 지내자"', run: (x) => (sibs.forEach((q) => aff(q, -2)), hap(x.p, 3), `차례상은 간소해졌다. 모두 조금씩 편해졌고, 조금씩 멀어졌다.`) },
    ]);
  },
};

const CAPSULE: EventDef = {
  id: 'sg_capsule',
  title: () => '⏳ 타임캡슐',
  text: (c) => (c.ev.data?.open ? `${n(c.p)}이(가) 스무 살이 된 날. 마당 감나무 아래를 팠다. 녹슨 통 안에 ${c.ev.data.from}의 편지가 있다.\n"20년 뒤의 너에게. 지금 아빠(엄마)는 ${c.ev.data.job}이고, 걱정이 많아. 너는 어떤 사람이 되어 있을까?"` : `${n(c.p)}의 첫돌. 감나무 아래 타임캡슐을 묻기로 했다. 아이가 스무 살이 되면 열어 본다.`),
  choices: (c) =>
    c.ev.data?.open
      ? ch(c, [
          { label: '편지를 부모님께 읽어 드린다', run: (x) => {
            const ps = parentsOf(x.s, x.p).filter(alive);
            ps.forEach((q) => hap(q, 8));
            aff(x.p, 10);
            return ps.length ? '부모님이 고개를 돌리고 눈가를 훔쳤다. "그때 우리 진짜 가난했는데…"' : '읽어 줄 사람이 이제 없다. 편지를 액자에 넣었다.';
          } },
          { label: '나도 20년 뒤 나에게 편지를 쓴다', run: (x) => (schedule(x.s, 20, 'sg_capsule_self', x.p.id, { job: JOBS[x.p.job]?.name ?? '학생' }), `새 편지를 넣고 다시 묻었다. 20년 뒤 마흔의 나에게.`) },
        ])
      : ch(c, [
          { label: '가족 사진과 편지를 넣는다', run: (x) => {
            const parent = parentsOf(x.s, x.p).find(alive) ?? head(x.s);
            schedule(x.s, 19, 'sg_capsule', x.p.id, { open: 1, from: n(parent), job: JOBS[parent.job]?.name ?? '백수' });
            return '사진 한 장, 편지 한 통, 그해 신문 한 부. 흙을 덮고 꾹꾹 밟았다. (19년 뒤 열린다)';
          } },
          { label: '그런 건 됐다', run: () => '감나무만 묵묵히 컸다.' },
        ]),
};

const CAPSULE_SELF: EventDef = {
  id: 'sg_capsule_self',
  title: () => '⏳ 마흔의 나에게',
  text: (c) => `20년 전의 내가 쓴 편지. "지금 나는 ${c.ev.data.job}. 마흔의 나는 ${pick(c.s, ['부자가 됐을까', '행복할까', '아직 꿈을 기억할까', '부모님께 효도하고 있을까'])}?"\n지금의 나는 ${JOBS[c.p.job]?.name ?? '…'}이다.`,
  choices: (c) => ch(c, [{ label: '스무 살의 나에게 답장한다', run: (x) => (hap(x.p, x.p.happiness > 60 ? 10 : 4), x.p.happiness > 60 ? '"걱정 마. 꽤 괜찮게 살고 있어."' : '"미안. 그래도 아직 포기 안 했어."') }]),
};

const LETTER: EventDef = {
  id: 'sg_letter',
  title: () => '✉ 서랍 속 편지',
  text: (c) => {
    const d = c.s.people[c.ev.data.deadId as string];
    const story = (c.ev.data.beat as string) ?? '';
    return `돌아가신 ${d ? n(d) : '할아버지(할머니)'}의 책상 서랍에서 봉투 하나가 나왔다. 겉봉에 "${n(c.p)}에게".\n${story ? `"${story} 그 일로 나는 많이 배웠다. 너는 나처럼 넘어지지 말거라. 넘어지더라도 꼭 일어나거라."` : '"살아 보니 돈보다 사람이더라. 형제끼리 싸우지 말거라."'}`;
  },
  choices: (c) =>
    ch(c, [
      { label: '편지를 지갑에 넣고 다닌다', run: (x) => (mark(x.p, 'mor', 1), (x.p.actual.mor = clamp(x.p.actual.mor + 3, 0, 100)), hap(x.p, 5), '힘든 날마다 꺼내 읽었다. 글씨가 닳을 때까지. (도덕성 +3)') },
      { label: '형제들과 돌려 본다', run: (x) => (siblingsOf(x.s, x.p).filter(alive).forEach((q) => aff(q, 8)), '편지 한 통에 오래 묵은 서운함이 녹았다.') },
    ]),
};

const MEMORY: EventDef = {
  id: 'sg_memory',
  title: () => '🕰 그해의 기억',
  text: (c) => `${n(c.p)}이(가) 오래된 신문 스크랩을 꺼냈다.\n"${c.ev.data.year}년, ${c.ev.data.who}이(가) ${c.ev.data.what}을(를) 겪던 해야. 그때 집이 어땠는지 너희는 모를 거다."\n아이들이 숨을 죽이고 듣는다.`,
  choices: (c) =>
    ch(c, [
      { label: '그때 배운 것을 가훈으로 남긴다', run: (x) => {
        const motto = { 부도: '빚은 무섭다', 전세사기: '계약서는 세 번 읽어라', '코인 폭락': '쉽게 번 돈은 쉽게 나간다', 옥살이: '바르게 살아라', 실직: '기술은 배신하지 않는다', 사기: '좋은 말일수록 의심하라', 이혼: '곁에 있는 사람에게 잘해라', '암 투병': '건강이 첫째다' }[x.ev.data.what as string] ?? '넘어진 만큼 일어나라';
        x.s.motto = motto;
        for (const q of Object.values(x.s.people)) {
          if (!alive(q) || !isMainline(x.s, q) || age(x.s, q) >= 25) continue;
          q.actual.mor = clamp(q.actual.mor + 2, 0, 100);
          if (!hasTrait(q, 'spender') && chance(x.s, 0.3)) addTrait(q, 'frugal');
        }
        return `거실 벽에 붓글씨가 걸렸다. 「${motto}」 — ${x.s.familyName}씨 가문의 가훈. (아이들 도덕성 +2)`;
      } },
      { label: '"다 지난 일이다" 웃어넘긴다', run: (x) => (hap(x.p, 3), '이야기는 웃음으로 끝났다. 아이들 기억엔 할머니의 웃음만 남았다.') },
    ]),
};

const HEIR_JOB: EventDef = {
  id: 'sg_anc_path',
  title: () => '👣 조상과 같은 길',
  text: (c) => {
    const a = c.s.ancestor!;
    return `${n(c.p)}이(가) ${JOBS[c.p.job]?.name}의 길에 들어섰다. 그런데 이 길, 조상 ${a.name}(${a.role})이 걸었던 길이다.\n어머니가 오래된 상자를 꺼내 왔다. 그분이 쓰던 ${pick(c.s, ['만년필', '명함첩', '수첩', '손때 묻은 공구'])}이 들어 있다.`;
  },
  choices: (c) => ch(c, [{ label: '물려받아 쓴다', run: (x) => (mark(x.p, 'network', 2), addFlag(x.p, 'ancestor_path'), (x.p.actual.int = clamp(x.p.actual.int + 2, 0, 100)), hap(x.p, 6), '첫 출근 날 주머니에 넣었다. 왠지 든든하다. (인맥 +2 · 지능 +2)') }]),
};

export const SAGA_EVENTS: EventDef[] = [WAKE, SPLIT, COURT, RECONCILE, RV_INTERVIEW, RV_BLIND, RV_PATIENT, RV_DEATHBED, RV_GRANDKIDS, RV_TAKEOVER, RV_LEDGER, RV_SCANDAL, ANC_DIARY, ANC_NAMESAKE, ANC_LOOKALIKE, JOKBO, JESA, CAPSULE, CAPSULE_SELF, LETTER, MEMORY, HEIR_JOB];

// ════════════════ 해마다: 조건이 맞는 서사 하나 ════════════════

/** 연대기 속 굵직한 고생 (기억·편지 이야기의 재료) */
const DOWN: [RegExp, string][] = [
  [/파산|부도|폐업/, '부도'],
  [/전세 ?사기/, '전세사기'],
  [/코인|폭락|상장폐지/, '코인 폭락'],
  [/구속|징역|수감/, '옥살이'],
  [/해고|구조조정|명예퇴직/, '실직'],
  [/이혼/, '이혼'],
  [/암 진단/, '암 투병'],
  [/사기를 당|사기 피해/, '사기'],
];

export function sagaYear(s: GameState): void {
  if (s.gameOver || s.events.length > 3) return;
  const h = head(s);
  const ha = age(s, h);
  const live = Object.values(s.people).filter((p) => alive(p) && isMainline(s, p) && !p.inLaw);
  const cand: [string, Person, number, Record<string, unknown>?][] = [];
  const cool = (k: string, y: number) => s.year - (seen(s, k) ?? -999) >= y;
  // ── 숙적의 족보
  const r = s.rival;
  if (r && !r.fallen) {
    for (const p of live) {
      const a = age(s, p);
      if (a >= 23 && a <= 30 && hostileRv(s) && !['none', 'parttime'].includes(p.job) && p.jobYears <= 1 && cool('sg_rv_interview:' + p.id, 99)) cand.push(['sg_rv_interview', p, 0.5]);
      if (a >= 25 && a <= 34 && !p.spouseId && !p.partnerId && hostileRv(s) && cool('sg_rv_blind', 15)) cand.push(['sg_rv_blind', p, 0.35]);
      if (p.job === 'doctor' && p.jobLevel >= 2 && hostileRv(s) && cool('sg_rv_patient', 20)) cand.push(['sg_rv_patient', p, 0.6]);
      if (a >= 7 && a <= 12 && cool('sg_rv_grandkids', 12) && r.feud >= 30) cand.push(['sg_rv_grandkids', p, 0.4]);
      if (p.id === h.id && p.job === 'founder' && p.jobLevel >= 3 && r.feud >= 55 && hostileRv(s) && cool('sg_rv_takeover', 15)) cand.push(['sg_rv_takeover', p, 0.7]);
      if (p.id === h.id && p.job === 'politician' && hostileRv(s) && r.feud >= 45 && cool('sg_rv_scandal', 10)) cand.push(['sg_rv_scandal', p, 0.5]);
    }
    if (s.year - r.bossBorn >= 74 && ha >= 50 && r.feud >= 40 && cool('sg_rv_deathbed:' + r.boss, 99)) cand.push(['sg_rv_deathbed', h, 0.8]);
    if (ha >= 35 && cool('sg_rv_ledger', 99) && s.generation >= 2) cand.push(['sg_rv_ledger', h, 0.15]);
  }
  // ── 조상과 기록
  const anc = s.ancestor;
  for (const p of live) {
    const a = age(s, p);
    if (anc && a >= 12 && a <= 17 && !hasFlag(p, 'read_ancestor_diary') && cool('sg_anc_diary', 25)) cand.push(['sg_anc_diary', p, 0.35]);
    if (anc && a === 0 && cool('sg_anc_namesake', 30) && p.id !== h.id) cand.push(['sg_anc_namesake', p, 0.6]);
    if (a >= 8 && a <= 14 && s.generation >= 3 && cool('sg_anc_lookalike', 20)) cand.push(['sg_anc_lookalike', p, 0.3]);
    if (anc && a >= 22 && a <= 35 && p.jobYears === 1 && JOBS[p.job] && anc.role.includes(JOBS[p.job].name) && !hasFlag(p, 'ancestor_path')) cand.push(['sg_anc_path', p, 1.5]);
    if (a === 1 && p.fatherId && cool('sg_capsule', 8) && chance(s, 0.5)) cand.push(['sg_capsule', p, 0.4]);
  }
  if (s.generation >= 3 && cool('sg_jokbo', 30) && ha >= 40) cand.push(['sg_jokbo', h, 0.4]);
  if (ha >= 35 && siblingsOf(s, h).filter((q) => alive(q) && !q.inLaw).length >= 2 && cool('sg_jesa', 6)) cand.push(['sg_jesa', h, 0.35]);
  // 돌아가신 직계의 고생 → 편지(손주에게) · 기억(가주가 아이들에게)
  const deadLine = Object.values(s.people).filter((p) => !alive(p) && !p.inLaw && (p.deathYear ?? 0) >= s.year - 15);
  for (const d of deadLine) {
    const lines = s.log.filter((l) => l.text.includes(fullName(d)));
    const beat = DOWN.find(([re]) => lines.some((l) => re.test(l.text)));
    const grand = d.childIds.flatMap((id) => s.people[id]?.childIds ?? []).map((id) => s.people[id]).find((q) => q && alive(q) && age(s, q) >= 15 && age(s, q) <= 35);
    if (grand && cool('sg_letter:' + d.id, 99)) cand.push(['sg_letter', grand, 0.5, { deadId: d.id, beat: beat ? `${beat[1]}을(를) 겪던 해, ` : '' }]);
    if (beat && ha >= 40 && cool('sg_memory', 12)) {
      const ln = lines.find((l) => beat[0].test(l.text))!;
      cand.push(['sg_memory', h, 0.5, { year: ln.year, who: fullName(d), what: beat[1] }]);
    }
  }
  if (!cand.length || !chance(s, 0.55)) return;
  const total = cand.reduce((t, x) => t + x[2], 0);
  let x = (int(s, 0, 9999) / 10000) * total;
  const [id, p, , data0] = cand.find((c) => (x -= c[2]) <= 0) ?? cand[cand.length - 1];
  const data: Record<string, unknown> = { ...(data0 ?? {}) };
  if (['sg_rv_interview', 'sg_rv_blind', 'sg_rv_grandkids'].includes(id)) {
    const k = rivalKin(s, p.birthYear + (id === 'sg_rv_interview' ? -15 : 0));
    if (!k) return;
    data.kin = k.name;
    data.kb = k.born;
    data.sex = k.sex;
  }
  // 쿨다운 열쇠
  const key = id === 'sg_rv_interview' ? 'sg_rv_interview:' + p.id : id === 'sg_rv_deathbed' ? 'sg_rv_deathbed:' + s.rival!.boss : id === 'sg_letter' ? 'sg_letter:' + data.deadId : id;
  see(s, key);
  push(s, id, p, data);
}
