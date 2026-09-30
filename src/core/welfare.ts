// 가족 복지와 생애 전환: 출산 지원·육아휴직, 부모님 돌봄(장기요양), 퇴직 후 제2의 인생.
// 금액은 2025년 제도 기준 (임금 지수로 물가를 따라 오른다).
//  - 첫만남이용권: 첫째 200만, 둘째 이상 300만
//  - 부모급여: 0세 월 100만, 1세 월 50만 / 아동수당: 8세 미만 월 10만
//  - 육아휴직급여: 월 최대 250만(단순화: 연 2,000만 상한)
//  - 장기요양: 요양원 본인부담 월 70~100만 + 비급여(식비 등) → 연 약 1,500만, 재가요양 본인부담 15% → 연 약 400만
import type { GameState, Person } from './types';
import type { Choice, EventDef } from './ev-util';
import { chance, int, pick } from './rng';
import { JOBS } from './data';
import { formatMoney } from './economy';
import { addFlag, age, alive, clamp, fullName, hasFlag, head, mark, parentsOf, relationLabel, spouseOf } from './people';
import { wageIndex } from './pay';

const wi = (s: GameState) => wageIndex(s.year);

/** 출생 순간: 첫만남이용권 */
export function birthSupport(s: GameState, mom: Person, dad: Person, n: number): number {
  if (s.era === 'history' && s.year < 2022) return 0; // 첫만남이용권 2022~
  const order = mom.childIds.length; // 이번에 태어난 아이까지 포함
  let v = 0;
  for (let i = 0; i < n; i++) v += (order - i <= 1 ? 200 : 300) * wi(s);
  const to = alive(mom) ? mom : dad;
  to.cash += Math.round(v);
  return Math.round(v);
}

/** 해마다: 부모급여·아동수당 (아이의 부모에게) */
export function childAllowanceYear(s: GameState) {
  for (const c of Object.values(s.people)) {
    if (!alive(c)) continue;
    const a = age(s, c);
    const v = allowanceAmt(s, a, s.year);
    if (!v) continue;
    const par = parentsOf(s, c).find(alive);
    if (par) par.cash += Math.round(v * wi(s));
  }
}

/** 내년 가계부용: 우리 집 아이들 몫 */
export function allowanceForecast(s: GameState, owners: Person[]): number {
  const ids = new Set(owners.map((p) => p.id));
  let t = 0;
  for (const c of Object.values(s.people)) {
    if (!alive(c) || !parentsOf(s, c).some((q) => ids.has(q.id))) continue;
    const a = age(s, c) + 1;
    t += allowanceAmt(s, a, s.year + 1);
  }
  return Math.round(t * wi(s));
}

/** 부모급여(2023~)·아동수당(2018~). 근현대사 모드에선 제도가 생긴 해부터 */
function allowanceAmt(s: GameState, a: number, y: number): number {
  const hist = s.era === 'history';
  if (a <= 1 && (!hist || y >= 2023)) return a === 0 ? 1200 : 600;
  if (a < 8 && (!hist || y >= 2018)) return 120;
  return 0;
}

const salaryJob = (p: Person) => JOBS[p.job]?.kind === 'salary' && p.job !== 'pension';

// ───────────────────────── 육아휴직 ─────────────────────────

const parentalLeave: EventDef = {
  id: 'parental_leave',
  title: () => '육아휴직',
  valid: (c) => salaryJob(c.p) || (!!spouseOf(c.s, c.p) && salaryJob(spouseOf(c.s, c.p)!)),
  text: (c) => {
    const sp = spouseOf(c.s, c.p);
    return `아기가 태어났다. 누가 아이를 돌볼까?\n육아휴직 중엔 월급 대신 육아휴직급여(연 최대 약 ${formatMoney(Math.round(2000 * wi(c.s)))})가 나오고, 그해 승진은 멈춘다.` + (sp && alive(sp) ? `\n(${fullName(c.p)}: ${JOBS[c.p.job].name} · ${fullName(sp)}: ${JOBS[sp.job].name})` : '');
  },
  choices: (c) => {
    const s = c.s;
    const me = c.p;
    const sp = spouseOf(s, me);
    const out: Choice[] = [];
    const take = (p: Person, both = false) => {
      p.flags.push('leave:' + (s.year + 1));
      mark(p, 'family', 2);
      const kids = p.childIds.map((id) => s.people[id]).filter((k) => k && age(s, k) <= 1);
      for (const k of kids) mark(k, 'warmth', both ? 2 : 1);
    };
    if (salaryJob(me))
      out.push({
        label: `${fullName(me)}이(가) 1년 육아휴직`,
        run: () => {
          take(me);
          if (sp && alive(sp)) me.bond = sp.bond = clamp((me.bond ?? 60) + 6, 0, 100);
          const dad = me.sex === 'M';
          return dad ? '아빠 육아휴직! 회사 분위기는 눈치가 보였지만, 첫 뒤집기를 직접 봤다.' : '1년 동안 아이 곁을 지켰다. 복직이 걱정되지만 후회는 없다.';
        },
      });
    if (sp && alive(sp) && salaryJob(sp))
      out.push({
        label: `${fullName(sp)}이(가) 1년 육아휴직`,
        run: () => {
          take(sp);
          me.bond = sp.bond = clamp((me.bond ?? 60) + 4, 0, 100);
          return `${fullName(sp)}이(가) 휴직하고 아이를 돌본다.`;
        },
      });
    if (salaryJob(me) && sp && alive(sp) && salaryJob(sp))
      out.push({
        label: '둘 다 번갈아 6개월씩 (6+6 부모육아휴직제)',
        run: () => {
          take(me, true);
          take(sp, true);
          me.bond = sp.bond = clamp((me.bond ?? 60) + 8, 0, 100);
          return '부부가 번갈아 휴직했다. 정부 지원도 더 두둑했다. 아이는 엄마 아빠 둘 다 똑같이 좋아한다.';
        },
      });
    const grand = parentsOf(s, me).concat(sp ? parentsOf(s, sp) : []).find((g) => alive(g) && age(s, g) < 75);
    if (grand)
      out.push({
        label: `${relationLabel(s, grand)}께 아이를 부탁한다`,
        run: () => {
          grand.actual.hp = clamp(grand.actual.hp - 3, 0, 100);
          grand.affinity = clamp(grand.affinity + 5, -100, 100);
          me.cash -= Math.round(600 * wi(s));
          return `${fullName(grand)}께서 손주를 봐주신다. 수고비로 매달 50만 원씩 드린다. 허리가 걱정된다.`;
        },
      });
    out.push({
      label: '어린이집·시터에 맡기고 계속 일한다',
      run: () => {
        me.cash -= Math.round(1000 * wi(s));
        me.happiness = clamp(me.happiness - 4, 0, 100);
        return '출근길마다 아이 우는 소리가 귀에 맴돈다. 시터 비용이 만만치 않다.';
      },
    });
    return out;
  },
};

// ───────────────────────── 부모님 돌봄 ─────────────────────────

/** 해마다: 돌봄이 필요한 부모님 확인, 돌봄 비용 */
export function careYear(s: GameState): string[] {
  const msgs: string[] = [];
  const h = head(s);
  for (const par of parentsOf(s, h)) {
    if (!alive(par)) continue;
    const care = par.flags.find((f) => f.startsWith('care:'))?.slice(5);
    if (care === 'nursing') {
      const c = Math.round(1500 * wi(s));
      h.cash -= c;
      msgs.push(`🏥 ${relationLabel(s, par)} 요양원 비용 ${formatMoney(c)}`);
    } else if (care === 'home') {
      const c = Math.round(400 * wi(s));
      h.cash -= c;
      h.happiness = clamp(h.happiness - 2, 0, 100);
    } else if (care === 'together') {
      h.happiness = clamp(h.happiness - 3, 0, 100);
      const sp = spouseOf(s, h);
      if (sp && alive(sp)) h.bond = sp.bond = clamp((h.bond ?? 60) - 2, 0, 100);
    } else if (!care && age(s, par) >= 75 && (par.actual.hp < 30 || hasFlag(par, 'dementia')) && !s.events.some((e) => e.defId === 'elder_care' && e.data?.par === par.id)) {
      s.events.push({ uid: s.eventSeq++, defId: 'elder_care', personId: h.id, data: { par: par.id } });
    }
  }
  return msgs;
}

const elderCare: EventDef = {
  id: 'elder_care',
  title: () => '부모님 돌봄',
  valid: (c) => alive(c.s.people[c.ev.data?.par]),
  portraits: (c) => [c.s.people[c.ev.data.par], c.p],
  text: (c) => {
    const par = c.s.people[c.ev.data.par];
    return `${relationLabel(c.s, par)} ${fullName(par)}(${age(c.s, par)}세)이(가) 이제 혼자 생활하기 어렵다. 장기요양등급 판정이 나왔다.\n누가, 어떻게 모실까?`;
  },
  choices: (c) => {
    const s = c.s;
    const me = c.p;
    const par = s.people[c.ev.data.par];
    const sibs = par.childIds.map((id) => s.people[id]).filter((x) => x && alive(x) && x.id !== me.id);
    const set = (t: string) => {
      par.flags = par.flags.filter((f) => !f.startsWith('care:'));
      par.flags.push('care:' + t);
    };
    const out: Choice[] = [
      {
        label: `좋은 요양원에 모신다 (연 약 ${formatMoney(Math.round(1500 * wi(s)))})`,
        run: () => {
          set('nursing');
          par.happiness = clamp(par.happiness - 8, 0, 100);
          par.actual.hp = clamp(par.actual.hp + 3, 0, 100);
          return '전문 간호를 받으신다. 주말마다 찾아뵙는다. 돌아서는 발걸음이 무겁다.';
        },
      },
      {
        label: `방문 요양 (재가 급여, 연 약 ${formatMoney(Math.round(400 * wi(s)))})`,
        run: () => {
          set('home');
          return '요양보호사가 하루 세 시간 오신다. 나머지는 가족 몫이다.';
        },
      },
      {
        label: '우리 집에서 모신다',
        run: () => {
          set('together');
          addFlag(me, 'cared_parent');
          mark(me, 'filial', 3);
          par.happiness = clamp(par.happiness + 10, 0, 100);
          par.affinity = clamp(par.affinity + 15, -100, 100);
          return '부모님 방을 새로 꾸몄다. 힘들지만, 나중에 후회는 없을 것이다. (유산을 나눌 때 기여분을 주장할 수 있다)';
        },
      },
    ];
    if (sibs.length)
      out.push({
        label: '형제들과 번갈아 모신다',
        run: () => {
          const sb = pick(s, sibs);
          if (chance(s, clamp(0.5 + sb.affinity / 200, 0.15, 0.85))) {
            set('home');
            sb.affinity = clamp(sb.affinity + 5, -100, 100);
            return `${fullName(sb)}와 한 달씩 번갈아 모시기로 했다. 오랜만에 형제애를 느꼈다.`;
          }
          set('nursing');
          sb.affinity = clamp(sb.affinity - 15, -100, 100);
          addFlag(sb, 'grievance');
          return `${fullName(sb)}: "난 못 해." 결국 요양원으로 모셨다. 형제 사이가 싸늘해졌다.`;
        },
      });
    return out;
  },
};

// ───────────────────────── 퇴직 후 제2의 인생 ─────────────────────────

const secondLife: EventDef = {
  id: 'second_life',
  title: () => '제2의 인생',
  valid: (c) => c.p.job === 'pension' && age(c.s, c.p) < 75,
  text: (c) => `${fullName(c.p)}, 정년퇴직. 평균 수명은 아직 20년 넘게 남았다.\n연금 연 ${formatMoney(Math.round(Number(c.p.flags.find((f) => f.startsWith('pens:'))?.slice(5) ?? 0) * wi(c.s)))} · 통장 ${formatMoney(c.p.cash)}\n이제 뭘 하며 살까?`,
  choices: (c) => {
    const s = c.s;
    const p = c.p;
    return [
      {
        label: '퇴직금으로 치킨집을 차린다 (창업비 1.2억)',
        cost: Math.round(12000 * wi(s)),
        run: () => {
          p.job = 'shopkeeper';
          p.jobLevel = 0;
          p.jobYears = 0;
          return '가맹점을 열었다. 자영업 3년 생존율은 절반 남짓이라는데…';
        },
      },
      {
        label: '경비·시설관리로 재취업',
        run: () => {
          p.job = 'parttime';
          p.jobYears = 0;
          p.happiness = clamp(p.happiness - 3, 0, 100);
          return '아파트 경비원이 됐다. 월급은 예전의 절반도 안 되지만 할 일이 있다는 게 좋다.';
        },
      },
      {
        label: '귀농한다',
        cost: Math.round(5000 * wi(s)),
        run: () => {
          p.job = 'farmer';
          p.jobLevel = 0;
          p.jobYears = 0;
          p.actual.hp = clamp(p.actual.hp + 3, 0, 100);
          return '시골에 작은 밭을 샀다. 이웃들이 텃세 반, 반가움 반이다.';
        },
      },
      {
        label: '손주 돌보며 쉰다',
        run: () => {
          p.happiness = clamp(p.happiness + 8, 0, 100);
          mark(p, 'family', 2);
          return '평생 못 쉬던 몸을 쉬게 했다. 손주들이 할머니·할아버지 집을 좋아한다.';
        },
      },
      {
        label: '봉사하며 산다',
        run: () => {
          mark(p, 'kind', 3);
          s.fame += 2;
          p.happiness = clamp(p.happiness + 5, 0, 100);
          return '복지관에서 한글 교실을 맡았다. 새로운 보람이다.';
        },
      },
    ];
  },
};

// ───────────────────────── 국민연금 수령 시기 ─────────────────────────

const pensionTiming: EventDef = {
  id: 'pension_timing',
  title: () => '연금 수령 시기',
  valid: (c) => c.p.job === 'pension' && c.p.flags.some((f) => f.startsWith('pens:')),
  text: (c) => {
    const base = Number(c.p.flags.find((f) => f.startsWith('pens:'))?.slice(5) ?? 0);
    return `${fullName(c.p)}, 연금을 언제부터 받을까?
지금 기준 연 ${formatMoney(Math.round(base * wi(c.s)))}.
일찍 받으면 1년에 6%씩 깎이고, 늦추면 1년에 7.2%씩 늘어난다.`;
  },
  choices: (c) => {
    const p = c.p;
    const base = Number(p.flags.find((f) => f.startsWith('pens:'))?.slice(5) ?? 0);
    const setP = (v: number, from?: number) => {
      p.flags = p.flags.filter((f) => !f.startsWith('pens:') && !f.startsWith('pens_from:'));
      p.flags.push('pens:' + Math.round(v));
      if (from) p.flags.push('pens_from:' + from);
    };
    return [
      { label: '지금 바로 (5년 조기수령, 30% 감액)', run: () => (setP(base * 0.7), '당장 생활비가 급하다. 평생 30% 적게 받는다.') },
      { label: '제때 받는다', run: () => '정해진 대로 받기로 했다.' },
      { label: '5년 늦춘다 (연기연금, 36% 증액)', run: () => (setP(base * 1.36, c.s.year + 5), '당분간은 모아 둔 돈과 일로 버틴다. 대신 평생 36% 더 받는다.') },
    ];
  },
};

// ───────────────────────── 주택연금 ─────────────────────────
// 한국주택금융공사 종신 정액형 예시: 3억 주택 60세 월 약 63만, 70세 월 약 92만 → 집값의 연 2.5~3.7%
// 받은 돈과 이자(연 약 3%)는 그 집에 대출로 쌓이고, 사망 후 집을 팔아 정산한다 (남으면 상속, 모자라도 청구 없음).

export function reverseMortgageRate(a: number): number {
  return a < 60 ? 0.02 : 0.025 + Math.min(25, a - 60) * 0.00125;
}

/** 해마다: 주택연금 지급과 대출 누적 */
export function reverseMortgageYear(s: GameState) {
  for (const p of Object.values(s.people)) {
    const f = p.flags.find((x) => x.startsWith('rm:'));
    if (!f || !alive(p)) continue;
    const [, assetId, annual] = f.split(':');
    const a = s.assets.find((x) => x.id === assetId);
    if (!a) {
      p.flags = p.flags.filter((x) => x !== f);
      continue;
    }
    const v = Number(annual);
    p.cash += v;
    a.loan = Math.round((a.loan ?? 0) * 1.03 + v);
  }
}

// ───────────────────────── 청년도약계좌 ─────────────────────────
// 19~34세, 연 소득 7,500만 이하. 월 최대 70만 × 5년 = 4,200만 납입 → 정부기여금·비과세 이자 포함 약 5,000만.

export function youthAccountYear(s: GameState): string[] {
  const msgs: string[] = [];
  for (const p of Object.values(s.people)) {
    const f = p.flags.find((x) => x.startsWith('youth_acc:'));
    if (!f || !alive(p)) continue;
    const start = Number(f.slice(10));
    if (s.year - start < 5) p.cash -= 840;
    else {
      p.cash += 5000;
      p.flags = p.flags.filter((x) => x !== f);
      addFlag(p, 'youth_acc_done');
      if (p.id === s.headId) msgs.push(`💰 청년도약계좌 만기! 5년 동안 부은 4,200만 원이 5,000만 원이 되어 돌아왔다`);
    }
  }
  return msgs;
}

export const WELFARE_EVENTS: EventDef[] = [parentalLeave, elderCare, secondLife, pensionTiming];
// (int는 향후 확장용)
void int;
