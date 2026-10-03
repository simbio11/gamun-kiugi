// 💼 일자리를 잃는 길: 명예퇴직 · 권고사직(성과 부진) · 큰 실수 · 나이 든 직업의 은퇴 고비.
//  · 직업군마다 "한창때"가 있다. 그 나이를 넘기면 해마다 일자리를 잃을 확률이 올라가, 자연스럽게 다음 직업·부업으로 넘어간다.
//  · 공무원·교사·판검사·군인처럼 신분이 보장된 직업은 정년까지 거의 안전하다 (비위·큰 실수만).
//  · 가주·배우자는 이벤트로 고르고, 다른 가족은 연대기에 결과만 남는다.
//
// 참고: 통계청 「경제활동인구조사」 주된 일자리 퇴직 평균 나이 49.4세(2023),
//   사람인 조사 기업 체감 퇴직 나이 49.7세, 개발자 "마흔 고비"(한국소프트웨어산업협회 연령 분포),
//   승무원·모델 등 외모·체력 직군의 30대 중후반 이직률(항공사 공시).
import { chance, pick } from './rng';
import { gate, queueNext, setJob, type Choice, type Ctx, type EventDef } from './ev-util';
import { addFlag, age, alive, check, clamp, fullName, hasTrait, head, isMainline, spouseOf } from './people';
import { JOBS } from './data';
import { formatMoney, jobTitle, payOf, settlePension, severance, statScore } from './economy';
import type { GameState, Person } from './types';

/** 직업군의 한창때 (이 나이를 넘기면 위험이 커진다) */
const PRIME_END: Record<string, number> = { office: 50, tech: 46, media: 47, service: 50, trade: 57, transport: 60, medical: 63, legal: 64, edu: 60, sport: 40, biz: 70, farm: 75, etc: 55, public: 99 };
/** 나이에 따라 은퇴 고비가 오는 직업 (그 나이부터 해마다 제2의 인생 이야기가 올 수 있다) */
const AGE_OUT: Record<string, number> = { flight_attendant: 40, model: 32, dancer: 36, gamer: 26, athlete: 33, entertainer: 45, musician: 48, youtuber: 45, trainer: 45, coach: 58 };
/** 신분 보장 직업: 비위·큰 실수가 아니면 안전 */
const SECURE = new Set(['civil', 'tax_officer', 'court_officer', 'teacher', 'police', 'firefighter', 'coast_guard', 'prison_guard', 'judge', 'prosecutor', 'officer', 'nco', 'diplomat', 'professor', 'mail_carrier', 'public_corp', 'agent', 'forest_ranger']);

const hp = (p: Person, d: number) => (p.happiness = clamp(p.happiness + d, 0, 100));
const nm = (c: Ctx) => fullName(c.p);
const ch = (c: Ctx, list: (Choice | false | undefined)[]) => gate(c.s, list.filter((x): x is Choice => !!x));
const yearPay = (s: GameState, p: Person) => payOf(s, p, true) ?? 0;

/** 일자리를 잃은 뒤: 연금 정리 + 다음 길 고르기 (가주·배우자) */
function lose(s: GameState, p: Person, why: string) {
  addFlag(p, 'lost_job:' + s.year);
  settlePension(p, s);
  setJob(p, 'none');
  p.flags.push('jobloss_why:' + why);
  if (isMainline(s, p) || p.id === s.headId) queueNext(s, 'jl_next', p.id, { why });
}

const HONORARY: EventDef = {
  id: 'jl_honorary',
  title: () => '📉 명예퇴직 권고',
  valid: (c) => alive(c.p) && JOBS[c.p.job]?.kind === 'salary',
  text: (c) => `${nm(c)}(${age(c.s, c.p)}세, ${jobTitle(c.p)})에게 인사팀 면담이 잡혔다. "회사가 어려워서… 명예퇴직 신청을 받고 있습니다."\n위로금은 연봉의 1.5~2년치. 거절하면 한직으로 밀릴 수 있다.`,
  choices: (c) => {
    const bonus = Math.round(yearPay(c.s, c.p) * 1.7);
    return ch(c, [
      { label: `명퇴를 받아들인다 (위로금 ${formatMoney(bonus)} + 퇴직금)`, run: (x) => { const sev = severance(x.s, x.p); x.p.cash += bonus; hp(x.p, -6); lose(x.s, x.p, 'honorary'); return `짐을 쌌다. 위로금 ${formatMoney(bonus)}, 퇴직금 ${formatMoney(sev)}. 마지막 퇴근길 엘리베이터가 유난히 느렸다.`; } },
      { label: '버틴다', run: (x) => { if (chance(x.s, 0.45)) { addFlag(x.p, 'cold_seat'); hp(x.p, -12); return '"창가 자리"로 밀려났다. 할 일이 없는 게 일이 됐다. 내년이 더 걱정이다.'; } hp(x.p, -3); return '살아남았다. 동기 절반이 짐을 쌌다.'; } },
    ]);
  },
};

const PIP: EventDef = {
  id: 'jl_pip',
  title: () => '📋 성과 개선 프로그램 (PIP)',
  valid: (c) => alive(c.p) && JOBS[c.p.job]?.kind === 'salary',
  text: (c) => `${nm(c)}의 고과가 2년 연속 바닥이다. 팀장이 "성과 개선 계획서"를 내밀었다. 석 달 안에 목표를 못 채우면 권고사직이다.`,
  choices: (c) =>
    ch(c, [
      { label: '이를 악물고 실적을 낸다', run: (x) => (check(x.s, statScore(x.p, JOBS[x.p.job].stats ?? { int: 1 }), 55, 9) ? ((x.p.actual.int = clamp(x.p.actual.int + 2, 0, 100)), hp(x.p, 5), '목표를 넘겼다. 팀장이 처음으로 "수고했어"라고 했다.') : (lose(x.s, x.p, 'pip'), hp(x.p, -10), `석 달 뒤 사직서에 서명했다. "회사와 안 맞았던 거야." 스스로를 달랬다.`)) },
      { label: '먼저 사표를 쓰고 이직을 준비한다', run: (x) => { severance(x.s, x.p); lose(x.s, x.p, 'quit'); hp(x.p, 2); return '먼저 나왔다. 자존심은 지켰다.'; } },
      { label: '노무사와 상담한다', cost: 150, run: (x) => (chance(x.s, 0.5) ? (hp(x.p, 2), '부당한 평가라는 증거를 모았다. 회사가 한발 물러섰다. 다른 팀으로 옮겼다.') : ((x.p.cash += Math.round(yearPay(x.s, x.p) * 0.5)), lose(x.s, x.p, 'pip'), '합의금 6개월치를 받고 나왔다.')) },
    ]),
};

const MISTAKE: EventDef = {
  id: 'jl_mistake',
  title: () => '💥 큰 실수',
  valid: (c) => alive(c.p) && !!JOBS[c.p.job] && !['none', 'pension', 'parttime'].includes(c.p.job),
  text: (c) => {
    const what = c.ev.data.what as string;
    return `${nm(c)}이(가) ${what}. 손해가 크다. 윗선에서 책임자를 찾고 있다.`;
  },
  choices: (c) =>
    ch(c, [
      { label: '내 잘못이라고 책임진다', run: (x) => (chance(x.s, 0.45) ? (lose(x.s, x.p, 'mistake'), (x.p.actual.mor = clamp(x.p.actual.mor + 3, 0, 100)), '사직서를 냈다. "책임질 줄 아는 사람"이라는 말이 업계에 돌았다.') : ((x.p.actual.mor = clamp(x.p.actual.mor + 3, 0, 100)), (x.p.jobLevel = Math.max(0, x.p.jobLevel - 1)), '징계를 받고 강등됐지만 남았다. 동료들의 신뢰는 오히려 커졌다.')) },
      { label: '수습안을 만들어 만회한다', run: (x) => (check(x.s, x.p.actual.int * 0.5 + x.p.actual.cha * 0.5, 58, 9) ? (hp(x.p, 4), '밤샘 끝에 손해를 절반으로 줄였다. 위기가 기회가 됐다.') : (lose(x.s, x.p, 'mistake'), hp(x.p, -10), '만회하지 못했다. 권고사직 통보를 받았다.')) },
      { label: '덮는다', run: (x) => (chance(x.s, 0.4) ? (addFlag(x.p, 'cover_up'), (x.p.actual.mor = clamp(x.p.actual.mor - 6, 0, 100)), '아무도 모르게 넘어갔다… 지금은.') : (lose(x.s, x.p, 'fired'), (x.s.fame = Math.max(0, x.s.fame - 3)), (x.p.actual.mor = clamp(x.p.actual.mor - 4, 0, 100)), '감사에서 드러났다. 징계 해고. 퇴직금도 반 토막.')) },
    ]),
};

const AGEOUT: EventDef = {
  id: 'jl_ageout',
  title: () => '⏳ 은퇴의 고비',
  valid: (c) => alive(c.p) && AGE_OUT[c.p.job] !== undefined,
  text: (c) => `${nm(c)}(${age(c.s, c.p)}세)도 어느새 이 바닥에서 고참이다. ${JOBS[c.p.job].name} 자리는 점점 어린 후배들에게 돌아간다. 제2의 인생을 준비할 때일까?`,
  choices: (c) => {
    const second: Record<string, [string, string]> = { flight_attendant: ['hotelier', '호텔리어로 옮긴다'], model: ['designer', '디자이너로 전업한다'], dancer: ['trainer', '안무 강사·트레이너가 된다'], gamer: ['youtuber', '게임 스트리머가 된다'], athlete: ['coach', '지도자 길을 걷는다'], entertainer: ['youtuber', '유튜브 채널을 연다'], musician: ['tutor', '음악 학원 강사가 된다'], youtuber: ['marketer', '마케터로 취업한다'], trainer: ['cafe_owner', '헬스 카페를 차린다'], coach: ['tutor', '체육 학원을 연다'] };
    const [to, label] = second[c.p.job] ?? ['office', '회사원이 된다'];
    return ch(c, [
      { label, run: (x) => (JOBS[to] ? (setJob(x.p, to), hp(x.p, 4), `${JOBS[to].name}(으)로 새 출발. 어색하지만 마음은 편하다.`) : '새 길을 찾지 못했다.') },
      { label: '부업부터 시작해 본다', run: (x) => (queueNext(x.s, 'sj_pick', x.p.id), '본업은 유지하며 부업을 알아보기로 했다.') },
      { label: '아직 현역이다!', run: (x) => (chance(x.s, 0.5) ? (hp(x.p, 6), (x.p.actual.str = clamp(x.p.actual.str + 2, 0, 100)), '한 번 더 불태웠다. 후배들이 "레전드"라 부른다.') : (lose(x.s, x.p, 'ageout'), hp(x.p, -8), '결국 자리를 잃었다. 박수 칠 때 떠났어야 했나.')) },
    ]);
  },
};

const NEXT: EventDef = {
  id: 'jl_next',
  title: () => '🧭 이제 뭘 하지?',
  valid: (c) => alive(c.p) && c.p.job === 'none',
  text: (c) => `${nm(c)}이(가) 일을 그만둔 지 한 달. 늦잠도 질렸다. ${age(c.s, c.p) >= 55 ? '재취업은 쉽지 않은 나이다.' : '아직 한창이다.'}`,
  choices: (c) =>
    ch(c, [
      { label: '재취업을 알아본다', run: (x) => (queueNext(x.s, 'first_job', x.p.id, { second: true }), '이력서를 고쳐 썼다. 경력란이 한 줄 늘었다.') },
      { label: '부업·창업으로 먹고산다', run: (x) => (queueNext(x.s, 'sj_pick', x.p.id, { main: true }), '이참에 내 일을 해 보기로 했다.') },
      age(c.s, c.p) >= 55 && { label: '이대로 은퇴한다', run: (x) => (setJob(x.p, 'pension'), hp(x.p, 5), '은퇴했다. 아침 산책이 일과가 됐다.') },
      { label: '1년 쉰다', run: (x) => (hp(x.p, 8), (x.p.actual.hp = clamp(x.p.actual.hp + 3, 0, 100)), '푹 쉬었다. 내년에 다시 생각하자.') },
    ]),
};

export const JOBLOSS_EVENTS: EventDef[] = [HONORARY, PIP, MISTAKE, AGEOUT, NEXT];

const MISTAKES = ['결재 서류의 숫자 0 하나를 빠뜨려 거래처에 10배 발주를 넣었다', '고객 개인정보가 담긴 노트북을 택시에 두고 내렸다', '사장님 앞 발표에서 경쟁사 자료를 띄웠다', '마감을 놓쳐 큰 계약이 날아갔다', '단체 메일에 연봉 엑셀을 첨부했다', '안전 점검을 건너뛴 날 사고가 났다'];

/** 해마다: 일자리 위험 굴리기 (한 해에 한 집안 최대 한 건) */
export function joblossYear(s: GameState): string[] {
  const out: string[] = [];
  if (s.events.length > 8) return out;
  const h = head(s);
  const sp = spouseOf(s, h);
  const people = Object.values(s.people).filter((p) => alive(p) && age(s, p) >= 22 && (isMainline(s, p) || p.id === sp?.id) && JOBS[p.job] && !['none', 'pension', 'parttime'].includes(p.job));
  const seen = (s.storySeen ??= {});
  for (const p of people) {
    if (s.year - (seen['jl:' + p.id] ?? -99) < 3) continue;
    const j = JOBS[p.job];
    const a = age(s, p);
    const pick1 = (id: string, data: Record<string, unknown> = {}) => {
      seen['jl:' + p.id] = s.year;
      const player = p.id === h.id || p.id === sp?.id;
      if (player) s.events.push({ uid: s.eventSeq++, defId: id, personId: p.id, data });
      else {
        // 다른 가족: 결과만
        if (id === 'jl_ageout') return;
        severance(s, p);
        settlePension(p, s);
        out.push(`📉 ${fullName(p)}(${a}세) ${id === 'jl_honorary' ? '명예퇴직' : id === 'jl_pip' ? '권고사직' : '큰 실수로 퇴사'} — ${j.name}을(를) 그만뒀다`);
        setJob(p, 'none');
      }
    };
    // 나이 든 직업의 고비
    const out0 = AGE_OUT[p.job];
    if (out0 !== undefined && a >= out0 && chance(s, 0.18 + (a - out0) * 0.05)) {
      pick1('jl_ageout');
      return out;
    }
    if (j.kind !== 'salary') continue;
    const secure = SECURE.has(p.job) || !!j.pension;
    const prime = PRIME_END[j.cat] ?? 55;
    const perf = statScore(p, j.stats ?? { int: 1 });
    let risk = secure ? 0.003 : 0.015;
    if (!secure && perf < 45) risk += 0.035;
    else if (!secure && perf < 55) risk += 0.012;
    if (!secure && a > prime) risk += Math.min(0.25, (a - prime) * 0.03);
    if (p.flags.includes('cold_seat')) risk += 0.06;
    if (hasTrait(p, 'lazy')) risk += 0.01;
    if (hasTrait(p, 'diligent')) risk -= 0.004;
    if (!chance(s, Math.max(0, risk))) continue;
    if (!secure && a >= 45 && a > prime - 4) pick1('jl_honorary');
    else if (!secure && perf < 52) pick1('jl_pip');
    else pick1('jl_mistake', { what: pick(s, MISTAKES) });
    return out;
  }
  return out;
}

/** 테스트·도움말용 */
export const primeEndOf = (job: string) => (SECURE.has(job) ? 99 : AGE_OUT[job] ?? PRIME_END[JOBS[job]?.cat ?? 'etc'] ?? 55);
