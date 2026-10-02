// 생전 승계: 자녀가 35세가 넘으면(또는 가주가 60세가 넘으면) 살아 있을 때 가주 자리를 물려준다.
//  · 어떻게 물려줄지(전부·절반·가업만·자리만), 효도 계약서를 쓸지 고르고, 실제 증여세·취득세를 낸다.
//  · 물려준 뒤에도 전 가주는 "상왕"으로 살아 있다: 훈수·참견, 용돈과 부양, 요양원 딜레마, 형제의 질투,
//    불효가 쌓이면 "효도 계약 위반 증여 취소 소송"까지.
//
// 제도 참고: 상속세 및 증여세법 — 성인 자녀 증여재산공제 10년 5천만 원, 세율 10~50% 누진, 신고세액공제 3%.
//   부동산 증여 취득세 3.5%(조정대상지역 고가 주택은 최대 12%, 게임은 4%로 단순화).
//   가업승계 주식 증여 과세특례(조세특례제한법 30조의6): 10억 공제 뒤 10%(120억 초과분 20%).
//   효도 계약: 부양 조건부 증여 — 대법원 2015다236141(2015.12.10) 판결로 조건을 어기면 증여 해제·반환이 인정됐다.
//   유류분: 다른 자녀는 법정상속분의 1/2을 돌려 달라 청구할 수 있다 (민법 1112조, 2024 헌재 결정 뒤 개정 논의 중).
import { chance, int, pick } from './rng';
import { gate, type Choice, type Ctx, type EventDef } from './ev-util';
import { addFlag, age, alive, check, clamp, fullName, hasFlag, hasTrait, head, isDescendantOf, mark, siblingsOf, spouseOf } from './people';
import { assessedValue, assetsOf, formatMoney, personWorth } from './economy';
import { giveAsset, previewGiftTax, transferHeadship } from './estate';
import { wageIndex } from './pay';
import { isRealty } from './realty';
import type { GameState, Person } from './types';

const hap = (p: Person, d: number) => (p.happiness = clamp(p.happiness + d, 0, 100));
const aff = (p: Person, d: number) => (p.affinity = clamp(p.affinity + d, -100, 100));
const W = (s: GameState, v: number) => Math.max(1, Math.round(v * wageIndex(s.year)));
const elderOf = (s: GameState) => Object.values(s.people).find((p) => alive(p) && hasFlag(p, 'sangwang'));
const flagNum = (p: Person, k: string) => Number(p.flags.find((f) => f.startsWith(k + ':'))?.slice(k.length + 1) ?? 0);
const setNum = (p: Person, k: string, v: number) => ((p.flags = p.flags.filter((f) => !f.startsWith(k + ':'))), p.flags.push(`${k}:${v}`));

/** 생전 승계를 할 수 있나: 지명한 후계자(직계)가 35세 이상이거나, 가주가 60세 이상이고 후계자가 성인 */
export function canHandOver(s: GameState): string | true {
  const h = head(s);
  const heir = s.heirId ? s.people[s.heirId] : undefined;
  if (!heir || !alive(heir)) return '먼저 가계도에서 후계자를 지명하세요';
  if (!isDescendantOf(s, heir, h) && !h.childIds.includes(heir.id)) return '후계자는 직계 자손이어야 합니다';
  const ha = age(s, heir);
  if (ha >= 35) return true;
  if (age(s, h) >= 60 && ha >= 20) return true;
  return `후계자가 35세가 되면(지금 ${ha}세) 또는 가주가 60세가 되면 물려줄 수 있습니다`;
}

type Mode = 'all' | 'half' | 'biz' | 'title';
const MODE_NAME: Record<Mode, string> = { all: '전 재산 생전 증여', half: '절반 증여', biz: '가업(회사 지분)만', title: '가주 자리만' };

/** 이 방식으로 넘기면: 넘어갈 자산 목록과 예상 세금 */
function plan(s: GameState, from: Person, to: Person, mode: Mode) {
  const mine = assetsOf(s, from.id).filter((a) => a.kind !== 'vehicle');
  let pick0 = mine;
  if (mode === 'half') {
    const sorted = [...mine].sort((a, b) => b.value - a.value);
    let tot = 0;
    const all = sorted.reduce((t, a) => t + a.value, 0);
    pick0 = sorted.filter((a) => (tot < all / 2 ? ((tot += a.value), true) : false));
  }
  if (mode === 'biz') pick0 = mine.filter((a) => a.kind === 'stock' && (/그룹|회사|지분/.test(a.name) || ['founder', 'sme_ceo', 'franchise_ceo'].includes(from.job)));
  if (mode === 'title') pick0 = [];
  const cashPart = mode === 'all' ? Math.max(0, Math.round(from.cash * 0.8)) : mode === 'half' ? Math.max(0, Math.round(from.cash * 0.5)) : 0;
  const value = pick0.reduce((t, a) => t + Math.max(0, assessedValue(a) - (a.loan ?? 0) - (a.deposit ?? 0)), 0) + cashPart;
  const bizRelief = mode === 'biz';
  // 가업승계 특례: 10억 공제 뒤 10%
  const giftTaxV = bizRelief ? Math.round(Math.max(0, value - 100000) * 0.1) : previewGiftTax(s, from, to, value);
  const acq = pick0.filter(isRealty).reduce((t, a) => t + Math.round(assessedValue(a) * 0.04), 0);
  return { assets: pick0, cashPart, value, giftTaxV: Math.round(giftTaxV * 0.97), acq };
}

const handover: EventDef = {
  id: 'handover',
  title: (c) => (c.ev.data?.stage === 'contract' ? '📜 효도 계약서' : '👑 생전 승계 — 어떻게 물려줄까'),
  valid: (c) => alive(c.p) && c.p.id === c.s.headId && !!c.s.heirId && alive(c.s.people[c.s.heirId]),
  portraits: (c) => [c.p, c.s.people[c.s.heirId!]],
  text: (c) => {
    const heir = c.s.people[c.s.heirId!];
    const d = (c.ev.data ??= {});
    if (d.stage === 'contract') {
      return `${fullName(heir)}에게 재산을 넘기기 전, 변호사가 "효도 계약서"를 권한다.\n· 매달 생활비를 드리고, 아프시면 모시거나 간병을 책임진다는 조건을 붙인 증여다.\n· 조건을 어기면 증여를 되돌릴 수 있다 (대법원 2015년 판결).\n${fullName(heir)}의 표정이 미묘하다.`;
    }
    const lines = (['all', 'half', 'biz', 'title'] as Mode[]).map((m) => {
      const pl = plan(c.s, c.p, heir, m);
      return `· ${MODE_NAME[m]}: 넘어갈 재산 ${formatMoney(pl.value)} · 증여세 약 ${formatMoney(pl.giftTaxV)}${pl.acq ? ` · 취득세 ${formatMoney(pl.acq)}` : ''}`;
    });
    return (
      `${fullName(c.p)}(${age(c.s, c.p)}세)이(가) 가주 자리를 ${fullName(heir)}(${age(c.s, heir)}세)에게 물려주려 한다.\n` +
      `${age(c.s, c.p) < 65 ? '아직 한창인 나이의 이른 승계다. 상왕으로 물러앉은 뒤가 길다.\n' : ''}` +
      `세금은 받는 사람이 낸다 (성인 자녀 10년 5천만 원 공제, 10~50% 누진, 신고하면 3% 공제).\n\n${lines.join('\n')}\n\n` +
      `${fullName(heir)}의 지금 현금: ${formatMoney(heir.cash)} — 모자라면 빚이 된다.`
    );
  },
  choices: (c) => {
    const d = c.ev.data ?? {};
    const heir = c.s.people[c.s.heirId!];
    if (d.stage === 'contract')
      return [
        { label: '효도 계약서를 쓴다', run: (x) => finish(x, heir, d.mode, true) },
        { label: '"가족끼리 무슨 계약서냐"', run: (x) => finish(x, heir, d.mode, false) },
      ];
    return gate(c.s, [
      ...(['all', 'half', 'biz', 'title'] as Mode[])
        .filter((m) => m !== 'biz' || plan(c.s, c.p, heir, 'biz').assets.length)
        .map(
          (m): Choice => ({
            label: MODE_NAME[m],
            req: m === 'all' ? ['재산 대부분이 넘어간다', '노후 자금 20%만 남는다'] : m === 'half' ? ['나머지는 상속 때'] : m === 'biz' ? ['가업승계 특례 (10억 공제 · 10%)'] : ['재산은 그대로 쥐고 있는다'],
            run: (x) => {
              if (m === 'title') return finish(x, heir, m, false);
              x.ev.data = { ...x.ev.data, stage: 'contract', mode: m };
              return { text: '', keep: true };
            },
          }),
        ),
      { label: '아직은 이르다 (그만둔다)', run: () => '"조금만 더 지켜보자."' },
    ]);
  },
};

/** 실제로 넘긴다: 자산·현금 증여 → 세금 → 가주 교체 → 상왕 */
function finish(x: Ctx, heir: Person, mode: Mode, contract: boolean): string {
  const s = x.s;
  const old = x.p;
  const pl = plan(s, old, heir, mode);
  const lines: string[] = [];
  let tax = 0;
  if (mode === 'biz') {
    for (const a of pl.assets) a.ownerId = heir.id;
    tax = pl.giftTaxV;
    heir.cash -= tax;
    s.gifts.push({ fromId: old.id, toId: heir.id, amount: pl.value, tax, year: s.year });
    lines.push(`📈 회사 지분 ${formatMoney(pl.value)} 증여 · 가업승계 특례로 증여세 ${formatMoney(tax)}`);
  } else if (mode !== 'title') {
    for (const a of pl.assets) {
      const r = giveAsset(s, old, heir, a.id);
      if (r.ok) (tax += r.tax), lines.push(`🏠 ${a.name} → 증여세 ${formatMoney(r.tax)}`);
    }
    if (pl.cashPart > 0) {
      const t = previewGiftTax(s, old, heir, pl.cashPart);
      old.cash -= pl.cashPart;
      heir.cash += pl.cashPart - t;
      tax += t;
      s.gifts.push({ fromId: old.id, toId: heir.id, amount: pl.cashPart, tax: t, year: s.year });
      lines.push(`💰 현금 ${formatMoney(pl.cashPart)} → 증여세 ${formatMoney(t)}`);
    }
  }
  if (pl.acq) {
    heir.cash -= pl.acq;
    lines.push(`🧾 부동산 취득세 ${formatMoney(pl.acq)}`);
  }
  // 가주 교체
  old.job = old.job === 'president' ? old.job : 'pension';
  addFlag(old, 'retired');
  addFlag(old, 'sangwang');
  setNum(old, 'handover_y', s.year);
  if (age(s, old) < 65) addFlag(old, 'early_handover');
  if (contract) addFlag(old, 'hyodo_contract');
  if (mode === 'all' || mode === 'half') addFlag(old, 'gave_estate');
  transferHeadship(s, heir);
  heir.affinity = 60;
  old.affinity = contract ? 45 : 55;
  // 다른 자녀는 서운하다 (유류분의 씨앗)
  for (const sib of siblingsOf(s, heir).filter((q) => alive(q) && !q.inLaw)) {
    if (mode === 'all' || mode === 'half') {
      aff(sib, -15);
      if (mode === 'all') addFlag(sib, 'grievance');
    }
  }
  s.log.push({ year: s.year, text: `👑 ${fullName(old)} → ${fullName(heir)} 생전 승계 (${MODE_NAME[mode]}${contract ? ', 효도 계약' : ''})`, kind: 'succession' });
  return (
    `👑 ${fullName(heir)}이(가) ${s.generation}대 가주가 되었다. ${fullName(old)}은(는) 상왕으로 물러앉았다.\n` +
    (lines.length ? lines.join('\n') + `\n합계 세금 ${formatMoney(tax + pl.acq)} (${fullName(heir)} 부담)` : '재산은 전 가주가 그대로 쥐고 있다. 상속은 나중 일이다.') +
    (contract ? '\n📜 효도 계약서에 도장을 찍었다. 매달 생활비와 부양을 약속했다.' : '') +
    (heir.cash < 0 ? `\n⚠ 세금 때문에 ${formatMoney(-heir.cash)} 빚이 생겼다.` : '') +
    '\n\n이제부터 새 가주로 플레이한다.'
  );
}

// ───────────────────────── 상왕 이야기 ─────────────────────────

interface Story {
  id: string;
  title: string;
  /** 상왕(o)과 지금 가주(h) */
  ok: (s: GameState, o: Person, h: Person) => boolean;
  text: (s: GameState, o: Person, h: Person) => string;
  choices: (s: GameState, o: Person, h: Person) => Choice[];
  w?: number;
}
const H = (x: Ctx) => head(x.s);
const n = fullName;
const elderWord = (_s: GameState, o: Person, h: Person) => (h.fatherId === o.id || h.motherId === o.id ? (o.sex === 'M' ? '아버지' : '어머니') : o.sex === 'M' ? '할아버지' : '할머니');

const SW: Story[] = [
  {
    id: 'sw_nag', title: '🏯 상왕의 훈수',
    ok: () => true, w: 3,
    text: (s, o, h) => `${elderWord(s, o, h)}가 저녁 식탁에서 수저를 내려놓는다. "${pick(s, ['내가 가주였을 땐 이렇게 안 했다.', '요즘 집안 돌아가는 꼴이 영 마음에 안 든다.', '돈을 그렇게 쓰면 금방 바닥난다.', '제사는 제대로 지내고 있는 거냐?'])}"\n${n(h)}의 배우자가 접시만 내려다본다.`,
    choices: () => [
      { label: '"네, 명심하겠습니다"', run: (x) => (aff(x.p, 6), hap(H(x), -3), '어르신 얼굴이 풀렸다. 내 속은 조금 끓었다.') },
      { label: '"이제 제 방식대로 하겠습니다"', run: (x) => (chance(x.s, 0.5) ? (aff(x.p, -4), mark(H(x), 'selfmade'), '"…그래, 네 집이다." 쓸쓸한 뒷모습.') : (aff(x.p, -12), hap(x.p, -6), '"가주 자리 줬더니 기고만장이구나!" 문이 쾅 닫혔다.')) },
      { label: '배우자 편을 든다', run: (x) => { const sp = spouseOf(x.s, H(x)); if (sp) H(x).bond = sp.bond = clamp((H(x).bond ?? 60) + 6, 0, 100); aff(x.p, -8); return '배우자가 고맙다는 눈짓을 보냈다. 어르신은 방으로 들어가셨다.'; } },
    ],
  },
  {
    id: 'sw_grandkid', title: '🎒 손주 교육 참견',
    ok: (s, _o, h) => h.childIds.some((id) => s.people[id] && age(s, s.people[id]) >= 7 && age(s, s.people[id]) <= 18),
    text: (s, o, h) => `${elderWord(s, o, h)}가 손주 성적표를 들여다본다. "얘를 왜 그 학원에 보내냐. 내 친구 손주는 대치동 ○○ 학원 다녀서 의대 갔다더라. 학원비는 내가 대마."`,
    choices: () => [
      { label: '못 이기는 척 보낸다 (학원비는 어르신이)', run: (x) => { x.p.cash -= W(x.s, 600); const kid = H(x).childIds.map((id) => x.s.people[id]).find((k) => k && age(x.s, k) <= 18); if (kid) kid.study = clamp((kid.study ?? 40) + 4, 0, 100), hap(kid, -4); aff(x.p, 6); return '손주 성적이 조금 올랐다. 손주는 할머니(할아버지) 집에 덜 가려 한다.'; } },
      { label: '"애는 저희가 키웁니다"', run: (x) => (aff(x.p, -6), mark(H(x), 'warmth'), '"…그래, 내가 뭘 알겠냐." 서운함이 오래갔다.') },
    ],
  },
  {
    id: 'sw_asset_plan', title: '💼 가문 자산, 어떻게 굴릴까',
    ok: (s, _o, h) => personWorth(s, h) > W(s, 30000), w: 2,
    text: (s, o, h) => `${elderWord(s, o, h)}: "땅은 배신 안 한다. 강남에 하나 더 사 둬라." 자산 관리인: "요즘은 주식·채권 분산이 낫습니다." ${n(h)}의 배우자: "아이들 유학 자금부터 떼 둬요." 가문 자산 ${formatMoney(personWorth(s, h))}, 누구 말을 들을까?`,
    choices: () => [
      { label: '어르신 말대로 부동산', run: (x) => (aff(x.p, 8), mark(H(x), 'thrift'), '"역시 내 자식이다." 다음 매물부터 부동산을 먼저 보기로 했다.') },
      { label: '분산 투자 (주식·채권)', run: (x) => (aff(x.p, -4), (H(x).actual.int = clamp(H(x).actual.int + 1, 0, 100)), mark(H(x), 'risk'), '포트폴리오를 짰다. 어르신은 "종이 쪼가리"라며 혀를 찼다.') },
      { label: '자녀 교육·독립 자금부터', run: (x) => (mark(H(x), 'warmth', 2), '아이들 몫을 먼저 떼어 두었다. 배우자가 고개를 끄덕였다.') },
    ],
  },
  {
    id: 'sw_allowance', title: '💌 부모님 생활비',
    ok: (s, o) => o.cash < W(s, 20000) || hasFlag(o, 'gave_estate'), w: 2,
    text: (s, o, h) => `재산을 물려준 ${elderWord(s, o, h)}의 통장이 가볍다. 매달 생활비를 얼마나 보내 드릴까?${hasFlag(o, 'hyodo_contract') ? '\n📜 효도 계약서에 "매달 생활비"가 적혀 있다.' : ''}`,
    choices: () => [
      { label: '넉넉히 보내 드린다', run: (x) => { const v = W(x.s, 1800); H(x).cash -= v; x.p.cash += v; aff(x.p, 8); hap(x.p, 6); return `한 해 ${formatMoney(v)}. 어르신이 경로당에서 자식 자랑을 하신다.`; } },
      { label: '최소한만', run: (x) => { const v = W(x.s, 600); H(x).cash -= v; x.p.cash += v; aff(x.p, -2); return `한 해 ${formatMoney(v)}. "요즘 다들 힘들지…" 하시며 받으셨다.`; } },
      { label: '"요즘 사정이 어려워서…" 끊는다', run: (x) => { aff(x.p, -20); hap(x.p, -12); setNum(x.p, 'unfilial', flagNum(x.p, 'unfilial') + 1); return hasFlag(x.p, 'hyodo_contract') ? '어르신이 효도 계약서를 꺼내 한참을 들여다보셨다.' : '어르신이 아무 말 없이 전화를 끊으셨다.'; } },
    ],
  },
  {
    id: 'sw_care', title: '🏥 모실까, 요양원에 보낼까',
    ok: (s, o) => age(s, o) >= 74 || o.actual.hp < 40, w: 3,
    text: (s, o, h) => `${elderWord(s, o, h)}가 혼자 거동이 어려워졌다. 낙상이 잦다. 형제들은 바쁘다며 연락이 뜸하다.\n· 모시고 살면 배우자의 부담이 크다. · 요양원은 한 달 수백만 원. · 방문 간병인을 쓸 수도 있다.`,
    choices: () => [
      { label: '집에서 모신다', run: (x) => { const sp = spouseOf(x.s, H(x)); if (sp) H(x).bond = sp.bond = clamp((H(x).bond ?? 60) - 10, 0, 100); aff(x.p, 15); hap(x.p, 10); H(x).actual.mor = clamp(H(x).actual.mor + 3, 0, 100); return '안방을 내어 드렸다. 밤마다 기침 소리에 깬다. 배우자가 지쳐 간다.'; } },
      { label: '좋은 요양원에 모신다 (매주 찾아뵌다)', cost: 2400, run: (x) => (aff(x.p, -2), hap(x.p, -4), '창가 자리가 있는 요양원. 매주 일요일 면회를 간다. "집에 가고 싶다"는 말에 마음이 무너진다.') },
      { label: '방문 간병인을 쓴다', cost: 1500, run: (x) => (aff(x.p, 5), '간병인이 낮 동안 돌봐 드린다. 저녁엔 가족이 들여다본다.') },
      { label: '싼 요양원에 보내고 발길을 끊는다', run: (x) => { aff(x.p, -35); hap(x.p, -25); setNum(x.p, 'unfilial', flagNum(x.p, 'unfilial') + 2); x.s.fame = Math.max(0, x.s.fame - 3); return '요양원 원장이 "자제분들은 잘 안 오시네요"라고 했다. 동네에 말이 돌기 시작했다.'; } },
    ],
  },
  {
    id: 'sw_squander', title: '💸 "내가 준 재산을 어디다 쓴 거냐"',
    ok: (s, o, h) => hasFlag(o, 'gave_estate') && (h.cash < 0 || hasTrait(h, 'spender') || s.policy.living === 'lux'),
    text: (s, o, h) => `${elderWord(s, o, h)}가 등기부 등본을 떼 오셨다. "내가 평생 모은 걸 3년 만에 이렇게 만들어? 차는 또 새로 뽑았더구나."`,
    choices: () => [
      { label: '무릎 꿇고 사과한다', run: (x) => (aff(x.p, 6), (x.s.policy.living = 'frugal'), '그날부터 생활비를 줄였다. "다시는 실망시키지 마라."') },
      { label: '"제 재산입니다"', run: (x) => (aff(x.p, -18), setNum(x.p, 'unfilial', flagNum(x.p, 'unfilial') + 1), '"…그래, 이제 네 거지." 그 말이 칼처럼 꽂혔다.') },
    ],
  },
  {
    id: 'sw_sibling', title: '⚖ 형제들의 불만',
    ok: (s, _o, h) => siblingsOf(s, h).some((q) => alive(q) && !q.inLaw && hasFlag(q, 'grievance')),
    text: (s, o, h) => `명절, 동생이 술잔을 내려놓는다. "형(누나)만 다 받았잖아. ${elderWord(s, o, h)} 돌아가시면 유류분 청구할 거야. 법정상속분 절반은 내 몫이라고."`,
    choices: () => [
      { label: '미리 나눠 준다 (현금)', run: (x) => { const sib = siblingsOf(x.s, H(x)).find((q) => alive(q) && hasFlag(q, 'grievance'))!; const v = Math.max(0, Math.round(H(x).cash * 0.15)); H(x).cash -= v; sib.cash += v; sib.flags = sib.flags.filter((f) => f !== 'grievance'); aff(sib, 20); return `${formatMoney(v)}을 건넸다. 동생이 잔을 다시 채웠다.`; } },
      { label: '부모님께 중재를 부탁한다', run: (x) => (chance(x.s, 0.55) ? ((aff(x.p, 4)), siblingsOf(x.s, H(x)).forEach((q) => (q.flags = q.flags.filter((f) => f !== 'grievance'))), '어르신이 형제들을 불러 앉혔다. "내 뜻이다." 다들 고개를 숙였다.') : (aff(x.p, -6), '중재는 실패했다. 단톡방이 조용해졌다.')) },
      { label: '"법대로 해"', run: (x) => (siblingsOf(x.s, H(x)).forEach((q) => aff(q, -20)), '형제 단톡방에서 나왔다. 이 싸움은 장례식장까지 이어질 것이다.') },
    ],
  },
  {
    id: 'sw_lawsuit', title: '⚖ 증여 취소 소송 — 가문 내전',
    ok: (_s, o) => hasFlag(o, 'hyodo_contract') && hasFlag(o, 'gave_estate') && flagNum(o, 'unfilial') >= 2 && o.affinity < -10 && !hasFlag(o, 'sued_heir'), w: 6,
    text: (s, o, h) => `내용증명이 왔다. 발신인: ${elderWord(s, o, h)} ${n(o)}.\n"효도 계약 위반에 따른 증여 해제 및 소유권 이전등기 말소 청구." 온 가문이 두 편으로 갈라졌다. 기자들이 "막장 재벌가" 기사를 쓰기 시작했다.`,
    choices: () => [
      { label: '찾아가 무릎 꿇고 화해한다', run: (x) => {
        addFlag(x.p, 'sued_heir');
        if (chance(x.s, 0.55)) { aff(x.p, 30); setNum(x.p, 'unfilial', 0); const v = W(x.s, 3000); H(x).cash -= v; x.p.cash += v; return `눈물의 화해. 생활비를 다시 보내고(${formatMoney(v)}) 매주 찾아뵙기로 했다. 소송은 취하됐다.`; }
        return finishSuit(x, '화해는 거절당했다. "법정에서 보자."');
      } },
      { label: '대형 로펌으로 맞선다', cost: 5000, run: (x) => (addFlag(x.p, 'sued_heir'), check(x.s, H(x).actual.int, 70, 8) ? ((x.s.fame = Math.max(0, x.s.fame - 8)), aff(x.p, -30), '"부양 의무를 다했다"는 증거로 이겼다. 그러나 부모 자식 사이는 끝났다.') : finishSuit(x, '재판부는 효도 계약을 인정했다.')) },
      { label: '재산을 돌려드린다', run: (x) => (addFlag(x.p, 'sued_heir'), finishSuit(x, '소송까지 갈 일이 아니었다.', true)) },
    ],
  },
  {
    id: 'sw_comeback', title: '👑 "다시 내가 맡겠다"',
    ok: (s, o, h) => age(s, o) <= 75 && hasFlag(o, 'early_handover') && (h.cash < 0 || s.fame < 20), w: 1,
    text: (s, o, h) => `가문 형편이 기울자 ${elderWord(s, o, h)}가 문중 회의를 소집했다. "아직 내가 정정하다. 가주 자리를 도로 내놓아라." 친척들이 웅성인다.`,
    choices: () => [
      { label: '"한 번만 더 기회를 주십시오"', run: (x) => (check(x.s, H(x).actual.cha, 50, 10) ? (aff(x.p, 2), '친척들이 내 편을 들었다. 3년 안에 보여 줘야 한다.') : (aff(x.p, -10), (x.s.fame = Math.max(0, x.s.fame - 3)), '표결은 아슬아슬하게 이겼다. 집안에 금이 갔다.')) },
      { label: '실권은 넘기고 이름만 가주로', run: (x) => (aff(x.p, 15), hap(H(x), -10), '중요한 결정은 상왕이 한다. 수렴청정이 시작됐다.') },
    ],
  },
  {
    id: 'sw_second_life', title: '🌱 상왕의 두 번째 인생',
    ok: (s, o) => hasFlag(o, 'early_handover') && age(s, o) < 70 && !hasFlag(o, 'second_life_done'),
    text: (s, o, h) => `일찍 물러난 ${elderWord(s, o, h)}가 매일 거실에서 TV만 본다. "평생 일만 했더니 할 게 없구나." 뭘 권해 볼까?`,
    choices: () => [
      { label: '귀촌을 권한다', run: (x) => (addFlag(x.p, 'second_life_done'), hap(x.p, 15), x.p.actual.hp = clamp(x.p.actual.hp + 5, 0, 100), '고향에 텃밭을 일구신다. 주말마다 상추가 택배로 온다.') },
      { label: '봉사·재능 기부를 권한다', run: (x) => (addFlag(x.p, 'second_life_done'), hap(x.p, 12), (x.s.fame += 2), '지역 아이들에게 바둑을 가르치신다. 신문에 작게 났다.') },
      { label: '작은 가게를 차려 드린다', cost: 3000, run: (x) => (addFlag(x.p, 'second_life_done'), (x.p.job = 'cafe_owner'), (x.p.jobLevel = 0), hap(x.p, 10), '동네 카페 사장님이 되셨다. 손님보다 친구분들이 더 많다.') },
      { label: '그냥 쉬시게 둔다', run: (x) => (hap(x.p, -6), '"…그래, 쉬는 것도 일이지." 잔소리가 늘었다.') },
    ],
  },
  {
    id: 'sw_remarry', title: '💍 상왕의 재혼 선언',
    ok: (s, o) => !o.spouseId || !alive(s.people[o.spouseId]), w: 1,
    text: (s, o, h) => `홀로 지내던 ${elderWord(s, o, h)}가 복지관에서 만난 분과 재혼하겠다고 한다. 형제들은 "재산 노리는 거 아니냐"며 술렁인다.`,
    choices: () => [
      { label: '축복한다', run: (x) => (aff(x.p, 15), hap(x.p, 20), '조촐한 식을 올렸다. 어르신이 몇 년 만에 크게 웃으셨다.') },
      { label: '혼인신고 없이 함께 사시라고 한다', run: (x) => (aff(x.p, -5), hap(x.p, 8), '"사실혼"으로 지내기로 했다. 서운한 기색이 남았다.') },
      { label: '반대한다', run: (x) => (aff(x.p, -20), hap(x.p, -15), '"내 인생인데!" 한동안 연락이 끊겼다.') },
    ],
  },
  {
    id: 'sw_birthday', title: '🎂 칠순·팔순 잔치',
    ok: (s, o) => [70, 80, 90].includes(age(s, o)),
    text: (s, o, h) => `${elderWord(s, o, h)}의 ${age(s, o)}세 생신이다. 잔치를 어떻게 할까?`,
    choices: () => [
      { label: '호텔에서 크게', cost: 2000, run: (x) => (aff(x.p, 12), hap(x.p, 15), (x.s.fame += 1), '친척 백여 명이 모였다. 어르신이 마이크를 잡고 "우리 ○○이가…" 하며 우셨다.') },
      { label: '가족끼리 식사', cost: 200, run: (x) => (aff(x.p, 6), hap(x.p, 8), '손주들이 쓴 편지를 읽어 드렸다.') },
      { label: '해외 효도 여행', cost: 1200, run: (x) => (aff(x.p, 10), hap(x.p, 12), (x.p.actual.hp = clamp(x.p.actual.hp - 2, 0, 100)), '평생 처음 비행기 비즈니스석. 사진을 수백 장 찍으셨다.') },
    ],
  },
];

function finishSuit(x: Ctx, lead: string, voluntary = false): string {
  const o = x.p;
  const h = H(x);
  // 증여받은 자산을 돌려준다 (전 가주에게서 넘어온 것)
  const back = x.s.gifts.filter((g) => g.fromId === o.id && g.toId === h.id).reduce((t, g) => t + g.amount, 0);
  let returned = 0;
  for (const a of x.s.assets.filter((a) => a.ownerId === h.id && a.kind !== 'vehicle').sort((a, b) => b.value - a.value)) {
    if (returned >= back * 0.8) break;
    a.ownerId = o.id;
    returned += a.value;
  }
  x.s.fame = Math.max(0, x.s.fame - (voluntary ? 3 : 15));
  x.s.scandal = Math.min(100, (x.s.scandal ?? 0) + (voluntary ? 2 : 12));
  aff(o, voluntary ? 20 : -10);
  hap(h, -15);
  return `${lead}\n${voluntary ? '스스로' : '판결로'} 받은 재산 ${formatMoney(returned)}어치를 ${n(o)}에게 되돌려 놓았다. ${voluntary ? '어르신이 "됐다, 이제 됐다" 하셨다.' : '"효도 계약 위반 증여 해제" 판결이 법률 뉴스에 실렸다. 가문 명성 −15'}`;
}

const toEv = (d: Story): EventDef => ({
  id: d.id,
  title: () => d.title,
  valid: (c) => alive(c.p) && hasFlag(c.p, 'sangwang') && c.p.id !== c.s.headId && d.ok(c.s, c.p, head(c.s)),
  portraits: (c) => [c.p, head(c.s)],
  text: (c) => d.text(c.s, c.p, head(c.s)),
  choices: (c) => gate(c.s, d.choices(c.s, c.p, head(c.s))),
});

export const HANDOVER_EVENTS: EventDef[] = [handover, ...SW.map(toEv)];

/** 해마다: 상왕이 살아 있으면 이야기가 온다 (이른 승계일수록 자주) */
export function handoverYear(s: GameState): void {
  const o = elderOf(s);
  if (!o || o.id === s.headId) return;
  const h = head(s);
  // 상왕이 다시 가주가 되었거나 직계가 아니면 끝
  if (!isDescendantOf(s, h, o) && !o.childIds.includes(h.id)) return;
  const early = hasFlag(o, 'early_handover');
  if (!chance(s, early ? 0.7 : 0.45)) return;
  const pool = SW.filter((d) => d.ok(s, o, h) && s.year - ((s.storySeen ??= {})['sw:' + d.id] ?? -99) >= (d.id === 'sw_lawsuit' ? 1 : 4));
  if (!pool.length) return;
  // 소송은 조건이 되면 먼저
  const suit = pool.find((d) => d.id === 'sw_lawsuit');
  const total = pool.reduce((t, d) => t + (d.w ?? 1), 0);
  let r = (int(s, 0, 9999) / 10000) * total;
  const d = suit ?? pool.find((x) => (r -= x.w ?? 1) <= 0) ?? pool[0];
  s.storySeen!['sw:' + d.id] = s.year;
  s.events.push({ uid: s.eventSeq++, defId: d.id, personId: o.id });
}

