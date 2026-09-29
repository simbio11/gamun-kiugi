// 가족사 이벤트: 부모님 유산 나누기, 유언장, 후계자 고르기
import { chance } from './rng';
import { WILL_NAMES } from './data';
import { formatMoney, jobLabel, personWorth } from './economy';
import { adoptiveHeirs, estateTax, settleEstate, transferHeadship } from './estate';
import { eun, iga, type Choice, type Ctx, type EventDef } from './ev-util';
import { addFlag, age, alive, childrenOf, clamp, fullName, hasTrait, head, isDescendantOf, relationLabel, spouseOf } from './people';
import type { GameState, Person, WillMode } from './types';

// ───────────────────────── 부모님 유산 ─────────────────────────

function heirsOf(s: GameState, d: Person) {
  const sp = spouseOf(s, d);
  const kids = childrenOf(s, d).filter(alive);
  return { sp: sp && alive(sp) ? sp : undefined, kids };
}

/** 형제의 반응: 욕심 많은 성격일수록 쉽게 틀어진다 */
function siblingReacts(s: GameState, sib: Person, unfair: number): string {
  const greedy = (hasTrait(sib, 'spender') || hasTrait(sib, 'gambler') || hasTrait(sib, 'ambitious') ? 0.25 : 0) - (hasTrait(sib, 'filial') ? 0.2 : 0);
  if (chance(s, clamp(unfair + greedy, 0, 0.95))) {
    addFlag(sib, 'grievance');
    sib.affinity = clamp(sib.affinity - 30, -100, 100);
    return `${iga(fullName(sib))} 등을 돌렸다.`;
  }
  sib.affinity = clamp(sib.affinity + (unfair < 0 ? 15 : 3), -100, 100);
  return '';
}

const parentEstate: EventDef = {
  id: 'parent_estate',
  title: () => '부모님의 유산',
  portraits: (c) => [c.s.people[c.ev.data.deadId], ...childrenOf(c.s, c.s.people[c.ev.data.deadId]).filter(alive).slice(0, 2)],
  text: (c) => {
    const d = c.s.people[c.ev.data.deadId];
    const t = estateTax(c.s, d);
    const { sp, kids } = heirsOf(c.s, d);
    return (
      `${relationLabel(c.s, d)} ${fullName(d)}의 유산을 정리할 때가 왔다.\n` +
      `재산 ${formatMoney(t.gross)} · 예상 상속세 ${formatMoney(t.tax)}\n` +
      `상속인: ${[...(sp ? [`${fullName(sp)}(배우자)`] : []), ...kids.map((k) => fullName(k) + (k.id === c.s.headId ? '(나)' : ''))].join(', ')}\n` +
      (kids.length > 1 ? '형제들의 눈치가 보인다. 어떻게 나눌까?' : '')
    );
  },
  choices: (c) => {
    const s = c.s;
    const d = s.people[c.ev.data.deadId];
    const me = head(s);
    const { sp, kids } = heirsOf(s, d);
    const sibs = kids.filter((k) => k.id !== me.id);
    const done = (x: Ctx, shares: Map<string, number>, unfair: number, extra = '') => {
      const rep = settleEstate(x.s, d, undefined, shares);
      const reactions = sibs.map((sb) => siblingReacts(x.s, sb, unfair)).filter(Boolean);
      d.flags = d.flags.filter((f) => f !== 'estate_pending');
      return [extra, ...rep.lines, ...reactions].filter(Boolean).join('\n');
    };
    const legal = () => {
      const m = new Map<string, number>();
      if (sp) m.set(sp.id, 1.5);
      for (const k of kids) m.set(k.id, 1);
      return m;
    };
    const out: Choice[] = [{ label: '법대로 나눈다 (배우자 1.5 : 자녀 1)', run: (x) => done(x, legal(), 0.05) }];
    if (sp)
      out.push({
        label: `${relationLabel(s, sp)}께 모두 드린다`,
        run: (x) => {
          sp.affinity = clamp(sp.affinity + 20, -100, 100);
          return done(x, new Map([[sp.id, 1]]), 0.02, `${relationLabel(x.s, sp)}이 모든 재산을 받았다. 두 번째 상속 때 다시 나누게 된다.`);
        },
      });
    if (sibs.length) {
      out.push({
        label: me.flags.includes('cared_parent') ? '내가 부모님을 모셨다 — 기여분 주장' : '맏이·가주로서 더 가져간다',
        run: (x) => {
          const m = legal();
          m.set(me.id, (m.get(me.id) ?? 1) * (me.flags.includes('cared_parent') ? 1.8 : 2.5));
          x.s.fame = Math.max(0, x.s.fame - (me.flags.includes('cared_parent') ? 0 : 3));
          return done(x, m, me.flags.includes('cared_parent') ? 0.25 : 0.6, '내 몫을 더 챙겼다.');
        },
      });
      out.push({
        label: '형제들에게 양보한다',
        run: (x) => {
          const m = legal();
          m.set(me.id, (m.get(me.id) ?? 1) * 0.3);
          me.actual.mor = clamp(me.actual.mor + 3, 0, 100);
          x.s.fame += 3;
          return done(x, m, -1, '내 몫의 대부분을 형제들에게 양보했다. 우애 깊은 집안이라는 소문이 났다.');
        },
      });
    }
    return out;
  },
};

// ───────────────────────── 유언장 ─────────────────────────

/** 유언장을 쓴다: 마음은 놓이지만 기력이 쇠한다(사망 확률↑). 대신 상속은 뜻대로. */
export function writeWill(s: GameState, mode: WillMode, heirId?: string) {
  s.will = mode;
  s.willWritten = true;
  if (heirId) s.heirId = heirId;
  addFlag(head(s), 'will_written');
}

const will: EventDef = {
  id: 'will',
  title: () => '유언장',
  text: (c) => {
    const t = estateTax(c.s, c.p);
    return (
      `${age(c.s, c.p)}세. 요즘 부쩍 기력이 떨어진다. 가족들이 조심스럽게 유언장 이야기를 꺼낸다.\n` +
      `재산 ${formatMoney(t.gross)} · 지금 떠나면 상속세 ${formatMoney(t.tax)}\n\n` +
      `유언장을 쓰면 재산이 뜻대로 가지만, 마음이 놓여서인지 기력이 빨리 쇠한다.\n` +
      `안 쓰면 더 오래 버티지만, 떠난 뒤 자식들이 재산을 두고 다툴 수 있다.`
    );
  },
  choices: (c) => {
    const kids = childrenOf(c.s, c.p).filter(alive);
    const out: Choice[] = kids.slice(0, 4).map((k) => ({
      label: `✍ ${fullName(k)}에게 몰아준다 (후계자 지정)`,
      req: [relationLabel(c.s, k), `${age(c.s, k)}세`, jobLabel(k)],
      run: (x: Ctx) => {
        writeWill(x.s, 'heir', k.id);
        return `유언장을 썼다. ${eun(fullName(k))} 가문의 후계자다. 다른 자식들은 서운해할 것이다.`;
      },
    }));
    for (const mode of ['equal', 'legal'] as WillMode[])
      out.push({ label: `✍ ${WILL_NAMES[mode]}`, run: (x) => (writeWill(x.s, mode), '유언장을 써서 변호사에게 맡겼다. 한결 마음이 편하다.') });
    out.push({ label: '아직은 쓰지 않는다', run: (x) => ((x.p.happiness = clamp(x.p.happiness + 3, 0, 100)), '"내가 벌써 그럴 나이인가." 서랍을 닫았다.') });
    return out;
  },
};

// ───────────────────────── 후계자 고르기 ─────────────────────────

const chooseHeir: EventDef = {
  id: 'choose_heir',
  title: () => '가문을 이을 사람',
  portraits: (c) => (c.ev.data.cands as string[]).slice(0, 3).map((id) => c.s.people[id]),
  text: (c) => c.ev.data.text + '\n\n누구로 가문을 이어갈까? (선택한 사람의 자손만 직접 이끈다)',
  choices: (c) =>
    (c.ev.data.cands as string[]).map((id) => {
      const p = c.s.people[id];
      return {
        label: `${fullName(p)} (고인의 ${kinOf(c.s, c.s.people[c.ev.data.deadId], p)} · ${age(c.s, p)}세)`,
        req: [jobLabel(p), `재산 ${formatMoney(personWorth(c.s, p))}`, ...(p.spouseId ? ['기혼'] : []), ...(p.childIds.length ? [`자녀 ${p.childIds.length}`] : [])],
        run: (x: Ctx) => {
          if (x.s.headId !== id) transferHeadship(x.s, p, false);
          x.s.log.push({ year: x.s.year, text: `👑 ${fullName(p)} ${x.s.generation}대 가주`, kind: 'succession' });
          return `이제 ${iga(fullName(p))} ${x.s.generation}대 가주다.`;
        },
      };
    }),
};

/** 고인 기준 호칭 */
function kinOf(s: GameState, dead: Person | undefined, p: Person): string {
  if (!dead) return relationLabel(s, p);
  const son = p.sex === 'M';
  if (dead.childIds.includes(p.id)) return son ? '아들' : '딸';
  if (dead.childIds.some((c) => s.people[c].childIds.includes(p.id))) return son ? '손자' : '손녀';
  if (isDescendantOf(s, p, dead)) return son ? '증손자' : '증손녀';
  if (p.fatherId && (p.fatherId === dead.fatherId || p.motherId === dead.motherId)) return (son ? '형제' : '자매') + ' → 가주 계승';
  return (son ? '조카' : '조카딸') + ' → 양자';
}

/** 가주 사망 뒤 이어갈 수 있는 사람: 고인의 살아 있는 자손 (자녀 → 손주 순) */
export function heirCandidates(s: GameState, dead: Person): Person[] {
  const own = Object.values(s.people).filter((p) => alive(p) && isDescendantOf(s, p, dead));
  if (!own.length) return adoptiveHeirs(s, dead);
  return own
    .filter((p) => alive(p) && isDescendantOf(s, p, dead))
    .sort((a, b) => (dead.childIds.includes(b.id) ? 1 : 0) - (dead.childIds.includes(a.id) ? 1 : 0) || a.birthYear - b.birthYear)
    .slice(0, 6);
}

export const FAMILY_EVENTS: EventDef[] = [parentEstate, will, chooseHeir];
