// 주도적 행동: 턴을 넘기기 전에 대시보드에서 직접 하는 일. 해마다 행동력 3.
// (갑작스러운 사건·선택형 이벤트는 턴을 넘길 때 일어난다)

import { chance, int, next, pick } from './rng';
import { fmt, getFatigue, grow, jitter, rollTier, say, setFatigue, stat, TIER_MARK } from './practice';
import { P, P2 } from './action-lines';
import { TRACK_ACTIONS, trackOf } from './tracks';
import { reverseMortgageRate } from './welfare';
import { vehicleAP } from './vehicle';
import { oppActions } from './opportunities';
import { STUDENT_ACTIONS } from './student-actions';
import { fitCats } from './interests';
import { JOB_CATS } from './jobs';
import { wageIndex } from './pay';
import { appealBonus } from './marks';
import { addBargains } from './realty';
import { bindState, standing, standingChange } from './school';
import { JOBS } from './data';
import { formatMoney, jobTitle, pay, severance, statScore } from './economy';
import { makeDate } from './events';
import { eul, iga, schedule, spendable, wa } from './ev-util';
import { isMedStudent } from './people';
import { addFlag, age, alive, check, clamp, discoverTalent, fullName, hasFlag, hasTrait, head, householder, isDescendantOf, mark, markOf, parentsOf, relationLabel, spouseOf } from './people';
import { startDating } from './romance';
import { TALENTS } from './data';
import type { GameState, Person } from './types';

export const AP_PER_YEAR = 3;

/** 대사 속 {n}{이}/{n}{와}/{n}{을}/{n}을 이름과 알맞은 조사로 */
const fillName = (t: string, n: string) => t.replace(/\{n\}\{이\}/g, iga(n)).replace(/\{n\}\{와\}/g, wa(n)).replace(/\{n\}\{을\}/g, eul(n)).replace(/\{n\}/g, n);

const TRIP_PLACES = ['제주도', '강릉', '부산', '경주', '여수', '가평 펜션', '속초', '오사카', '다낭', '방콕', '캠핑장', '전주 한옥마을'];

export type ActionCat = '올해의 기회' | '가족' | '진로·자기계발' | '자녀 교육' | '재산' | '사회';

/** 인생 단계: 단계마다 할 수 있는 일이 다르다 */
export type Stage = 'little' | 'elem' | 'teen' | 'univ' | 'prep' | 'adult' | 'senior';
export const STAGE_NAMES: Record<Stage, string> = { little: '유아', elem: '초등학생', teen: '중·고등학생', univ: '대학생', prep: '수험생·취준생', adult: '사회인', senior: '노년' };
export { isMedStudent } from './people';

export function stageOf(s: GameState, p: Person): Stage {
  const a = age(s, p);
  if (a < 8) return 'little';
  if (a < 14) return 'elem';
  if (p.flags.includes('student')) return 'univ';
  if (a < 20) return 'teen';
  if (p.flags.some((f) => f === 'retaking' || f.startsWith('prep:')) || (p.job === 'none' && a < 32 && !p.spouseId)) return 'prep';
  if (a >= 65 || p.job === 'pension') return 'senior';
  return 'adult';
}

/** 생활 수준에 따른 한 해 행동력: 검소 2 · 보통 3 · 호화 4 */
export function apMax(s: GameState): number {
  return AP_PER_YEAR + ({ frugal: -1, normal: 0, lux: 1 } as const)[s.policy.living] + vehicleAP(s);
}

export interface ActionDef {
  id: string;
  cat: ActionCat;
  icon: string;
  name: string;
  desc: string;
  ap: number;
  cost?: number;
  /** 가주 나이 조건: kid(20세 미만)·adult(20세 이상)·any. 기본 adult (stages가 있으면 그것을 따른다) */
  who?: 'kid' | 'adult' | 'any';
  /** 할 수 있는 인생 단계 */
  stages?: Stage[];
  /** 이 길(전공·시험·직업 그룹)일 때만 (tracks.ts) */
  tracks?: string[];
  /** 조건이 안 되면 목록에서 아예 숨긴다 (자녀가 없으면 자녀 교육 등) */
  show?: (s: GameState) => boolean;
  /** 대상이 필요하면 후보 목록 */
  targets?: (s: GameState) => Person[];
  /** 할 수 없으면 이유 */
  blocked?: (s: GameState, t?: Person) => string | undefined;
  /** 이 행동이 키우는 관심 분야 (적성에 맞으면 💡 표시하고 위로) */
  fit?: string;
  run: (s: GameState, t?: Person) => string;
}

const h = head;
const adultsOfLine = (s: GameState) => Object.values(s.people).filter((p) => alive(p) && !p.inLaw && age(s, p) >= 20 && (p.id === s.headId || isDescendantOf(s, p, h(s))));
const descendants = (s: GameState) => Object.values(s.people).filter((p) => alive(p) && isDescendantOf(s, p, h(s)));
const minors = (s: GameState, lo = 0, hi = 19) => descendants(s).filter((p) => age(s, p) >= lo && age(s, p) <= hi);
const mood = (p: Person, d: number) => (p.happiness = clamp(p.happiness + d, 0, 100));
const bond = (s: GameState, p: Person, d: number) => {
  const q = spouseOf(s, p);
  if (q && alive(q)) p.bond = q.bond = clamp((p.bond ?? 60) + d, 0, 100);
};
const single = (s: GameState, p: Person) => !p.partnerId && !(p.spouseId && alive(s.people[p.spouseId])) && !hasFlag(p, 'single_life');
const queueEv = (s: GameState, defId: string, personId: string, data?: any) => s.events.push({ uid: s.eventSeq++, defId, personId, data });

/** 아이 마음에 쌓인 것을 어렴풋이 알려준다 (떡밥 힌트) */
function heartHint(p: Person): string {
  const hints: string[] = [];
  if (markOf(p, 'hurt') >= 2) hints.push('말끝마다 서운함이 묻어난다');
  if (markOf(p, 'warmth') >= 3) hints.push('부모를 보는 눈빛이 따뜻하다');
  if (markOf(p, 'sport') >= 2) hints.push('몸 쓰는 걸 유난히 좋아한다');
  if (markOf(p, 'art') >= 2) hints.push('그림·노래 이야기를 할 때 신이 난다');
  if (markOf(p, 'study') >= 3) hints.push('책 읽는 습관이 몸에 뱄다');
  if (markOf(p, 'risk') >= 2) hints.push('한탕 이야기에 귀가 솔깃한 편이다');
  if (markOf(p, 'cheat') >= 2) hints.push('요령 피우는 게 조금 걱정된다');
  if (markOf(p, 'scar') >= 2) hints.push('연애 이야기만 나오면 표정이 굳는다');
  return hints.length ? '\n(' + hints.slice(0, 2).join(' · ') + ')' : '';
}

/** 가주가 아직 어릴 때 할 수 있는 일 */
const KID_ACTIONS: ActionDef[] = [
  {
    id: 'kid_study',
    cat: '진로·자기계발',
    icon: '📚',
    name: '공부하기',
    desc: '성적↑ · 공부 습관이 쌓인다 (컨디션 따라 들쭉날쭉)',
    ap: 1,
    who: 'kid',
    blocked: (s) => (age(s, h(s)) < 8 ? '여덟 살부터' : undefined),
    run: (s) => {
      const me = h(s);
      const t = rollTier(s, me, { talent: 'genius', stat: 'int', bonus: markOf(me, 'study') * 0.01 });
      const was = standing(me);
      const st = { great: int(s, 4, 6), good: int(s, 2, 3), meh: int(s, 0, 1), bad: 0 }[t] * (1 + Math.min(6, markOf(me, 'study')) * 0.05) * getFatigue();
      const joy = -jitter(s, t === 'bad' ? 5 : 2);
      mood(me, joy);
      me.study = clamp((me.study ?? 20) + st, 0, 100);
      const di = t === 'great' || (t === 'good' && chance(s, 0.3)) ? grow(s, me, 'int', t === 'great' ? 'good' : 'meh') : 0;
      let hp = 0;
      if (t === 'bad' && chance(s, 0.5)) {
        hp = -1;
        me.actual.hp = clamp(me.actual.hp - 1, 0, 100);
      }
      if (t !== 'meh' && t !== 'bad') mark(me, 'study', 1);
      return TIER_MARK[t] + say(s, me, P.study, t) + fmt([standingChange(was, me), stat('int', di), stat('hp', hp), ['행복', joy]]);
    },
  },
  {
    id: 'kid_play',
    cat: '가족',
    icon: '⚽',
    name: '친구들과 놀기',
    desc: '행복↑ 매력↑ · 친구가 인맥이 된다',
    ap: 1,
    who: 'kid',
    run: (s) => {
      const me = h(s);
      const t = rollTier(s, me, { stat: 'cha', bonus: hasTrait(me, 'social') ? 0.1 : hasTrait(me, 'shy') ? -0.1 : 0 });
      const joy = { great: jitter(s, 14), good: jitter(s, 8), meh: jitter(s, 2), bad: -jitter(s, 6) }[t];
      mood(me, joy);
      const dc = t === 'bad' ? 0 : grow(s, me, 'cha', t, 0.8);
      if (t === 'great' || t === 'good') mark(me, 'network', 1);
      return TIER_MARK[t] + say(s, me, P.play, t) + fmt([stat('cha', dc), ['행복', joy]]);
    },
  },
  {
    id: 'kid_sport',
    cat: '진로·자기계발',
    icon: '🥋',
    name: '운동 연습',
    desc: '근력↑ · 운동 경험이 쌓이면 스카우트가 올지도',
    ap: 1,
    who: 'kid',
    run: (s) => {
      const me = h(s);
      const t = rollTier(s, me, { talent: 'athlete', stat: 'str' });
      const ds = grow(s, me, 'str', t);
      let hp = t === 'great' || t === 'good' ? grow(s, me, 'hp', 'meh') : 0;
      if (t === 'bad') {
        hp = -int(s, 1, 3);
        me.actual.hp = clamp(me.actual.hp + hp, 0, 100);
      }
      if (t !== 'bad') mark(me, 'sport', 1);
      let extra = '';
      if (t === 'great' && me.talents.some((x) => x.id === 'athlete' && !x.discovered) && discoverTalent(me, 'athlete')) extra = '\n[운동 신경] 재능이 드러났다!';
      return TIER_MARK[t] + say(s, me, P.sport, t) + fmt([stat('str', ds), stat('hp', hp)]) + extra;
    },
  },
  {
    id: 'kid_art',
    cat: '진로·자기계발',
    icon: '🎨',
    name: '그림·악기 연습',
    desc: '매력↑ · 예술 경험이 쌓이면 기회가 온다',
    ap: 1,
    who: 'kid',
    run: (s) => {
      const me = h(s);
      const t = rollTier(s, me, { talent: 'artist', stat: 'cha', bonus: markOf(me, 'art') * 0.01 });
      const dc = grow(s, me, 'cha', t);
      const joy = t === 'bad' ? -jitter(s, 5) : t === 'great' ? jitter(s, 8) : 0;
      mood(me, joy);
      if (t !== 'bad') mark(me, 'art', 1);
      let extra = '';
      if (t === 'great') {
        const hid = me.talents.find((x) => (x.id === 'artist' || x.id === 'star') && !x.discovered);
        if (hid && discoverTalent(me, hid.id)) extra = `\n[${TALENTS[hid.id].name}] 재능이 드러났다!`;
      }
      return TIER_MARK[t] + say(s, me, P.art, t) + fmt([stat('cha', dc), ['행복', joy]]) + extra;
    },
  },
  {
    id: 'kid_help',
    cat: '가족',
    icon: '🧹',
    name: '부모님 돕기',
    desc: '집안일·심부름 · 부모님 관계↑ 성품↑',
    ap: 1,
    who: 'kid',
    run: (s) => {
      const me = h(s);
      const t = rollTier(s, me, { stat: 'mor', bonus: hasTrait(me, 'filial') ? 0.1 : 0 });
      const aff = { great: jitter(s, 10), good: jitter(s, 6), meh: jitter(s, 2), bad: 1 }[t];
      for (const p of parentsOf(s, me).filter(alive)) p.affinity = clamp(p.affinity + aff, -100, 100);
      const dm = t === 'bad' ? 0 : grow(s, me, 'mor', t, 0.8);
      if (t !== 'meh') mark(me, 'warmth', 1);
      if (t === 'great' || t === 'good') mark(me, 'filial', 1);
      return TIER_MARK[t] + say(s, me, P.help, t) + fmt([stat('mor', dm), ['부모님 관계', aff]]);
    },
  },
  {
    id: 'kid_save',
    cat: '재산',
    icon: '🐷',
    name: '용돈 모으기',
    desc: '돼지저금통 · 절약 습관',
    ap: 1,
    who: 'kid',
    run: (s) => {
      const me = h(s);
      const t = rollTier(s, me, { bonus: hasTrait(me, 'frugal') ? 0.12 : hasTrait(me, 'spender') ? -0.15 : 0 });
      const base = 20 + age(s, me) * 5;
      const got = { great: jitter(s, base * 4), good: jitter(s, base), meh: jitter(s, base * 0.3), bad: -Math.min(Math.max(0, me.cash), jitter(s, base * 0.8)) }[t];
      me.cash += got;
      if (t !== 'bad') mark(me, 'thrift', 1);
      return TIER_MARK[t] + say(s, me, P.save, t) + ` (${got >= 0 ? '+' : ''}${formatMoney(got)})`;
    },
  },
];

export const ACTIONS: ActionDef[] = [
  ...KID_ACTIONS,
  // ───────── 가족 ─────────
  {
    id: 'family_trip',
    cat: '가족',
    icon: '✈️',
    name: '가족 여행',
    desc: '금슬↑ · 아이들 마음에 따뜻한 기억',
    ap: 1,
    cost: 500,
    run: (s) => {
      const me = h(s);
      const t = rollTier(s, me, { bonus: hasTrait(me, 'devoted') ? 0.08 : 0 });
      const place = pick(s, TRIP_PLACES);
      const b = { great: jitter(s, 12), good: jitter(s, 7), meh: jitter(s, 2), bad: -jitter(s, 3) }[t];
      const joy = { great: jitter(s, 12), good: jitter(s, 8), meh: jitter(s, 3), bad: -jitter(s, 3) }[t];
      bond(s, me, b);
      if (t !== 'bad') mark(me, 'family', 1);
      for (const k of minors(s)) {
        if (t !== 'bad') mark(k, 'warmth', 1);
        mood(k, joy);
      }
      mood(me, joy);
      return TIER_MARK[t] + say(s, me, P.trip, t).replace('{d}', place) + fmt([...(spouseOf(s, me) && alive(spouseOf(s, me)!) ? [['금슬', b] as [string, number]] : []), ['가족 행복', joy]]);
    },
  },
  {
    id: 'date',
    cat: '가족',
    icon: '🍷',
    name: '배우자와 데이트',
    desc: '금슬↑',
    ap: 1,
    cost: 50,
    blocked: (s) => (spouseOf(s, h(s)) && alive(spouseOf(s, h(s))!) ? undefined : '배우자가 없다'),
    show: (s) => hasSpouse(s),
    run: (s) => {
      const me = h(s);
      const t = rollTier(s, me, { stat: 'cha', bonus: ((me.bond ?? 60) - 60) / 400 });
      const b = { great: jitter(s, 11), good: jitter(s, 6), meh: jitter(s, 1), bad: -jitter(s, 4) }[t];
      bond(s, me, b);
      if (t !== 'bad') mark(me, 'family', 1);
      return TIER_MARK[t] + say(s, me, P.date, t) + fmt([['금슬', b]]);
    },
  },
  {
    id: 'talk',
    cat: '가족',
    icon: '💬',
    name: '자녀·손주와 깊은 대화',
    desc: '관계↑ · 꿈과 재능, 마음속 이야기를 알 수 있다',
    ap: 1,
    targets: (s) => descendants(s).filter((p) => age(s, p) >= 6),
    run: (s, t) => {
      const p = t!;
      p.affinity = clamp(p.affinity + 8, -100, 100);
      mark(p, 'warmth', 1);
      mark(p, 'hurt', -1);
      let msg = `${wa(fullName(p))} 밤늦게까지 이야기를 나눴다.`;
      if (p.desire && !p.desireKnown) {
        p.desireKnown = true;
        msg += ` 꿈이 뭔지 처음 들었다.`;
      }
      const hidden = p.talents.find((x) => !x.discovered);
      if (hidden && chance(s, 0.25)) {
        discoverTalent(p, hidden.id);
        msg += ` [${TALENTS[hidden.id].name}] 재능이 있는 것 같다!`;
      }
      return msg + heartHint(p);
    },
  },
  {
    id: 'visit_parents',
    cat: '가족',
    icon: '🏡',
    name: '부모님 찾아뵙기',
    desc: '부모님 관계↑ · 효심이 쌓이면 유산 나눌 때 기여분',
    ap: 1,
    cost: 30,
    targets: (s) => parentsOf(s, h(s)).filter(alive),
    run: (s, t) => {
      const p = t!;
      const me = h(s);
      const tier = rollTier(s, me, { stat: 'mor', bonus: hasTrait(p, 'anxious') ? -0.08 : 0 });
      const aff = { great: jitter(s, 15), good: jitter(s, 9), meh: jitter(s, 3), bad: -jitter(s, 4) }[tier];
      p.affinity = clamp(p.affinity + aff, -100, 100);
      mood(p, Math.max(0, aff));
      if (tier !== 'bad') mark(me, 'filial', 1);
      return TIER_MARK[tier] + say(s, me, P.visit, tier).replace(/\{r\}/g, relationLabel(s, p)) + fmt([['관계', aff]]);
    },
  },
  {
    id: 'grandkid',
    cat: '가족',
    icon: '👶',
    name: '손주 돌봐주기',
    desc: '손주 마음↑ · 자식 부부의 짐을 덜어준다',
    ap: 1,
    targets: (s) => minors(s, 0, 12).filter((p) => !h(s).childIds.includes(p.id)),
    run: (s, t) => {
      const p = t!;
      const me = h(s);
      const tier = rollTier(s, me, { stat: 'hp' });
      const st = { great: int(s, 2, 3), good: 1, meh: 0, bad: 0 }[tier];
      p.study = clamp((p.study ?? 20) + st, 0, 100);
      if (tier !== 'bad') mark(p, 'warmth', 1);
      for (const par of parentsOf(s, p)) par.affinity = clamp(par.affinity + jitter(s, 4), -100, 100);
      const hp = tier === 'bad' ? -int(s, 1, 3) : -int(s, 0, 1);
      me.actual.hp = clamp(me.actual.hp + hp, 0, 100);
      return TIER_MARK[tier] + fillName(say(s, me, P.grandkid, tier), fullName(p)).replace('할머니(할아버지)', me.sex === 'F' ? '할머니' : '할아버지') + fmt([...(st ? [`손주 공부 ▲`] : []), stat('hp', hp)]);
    },
  },
  {
    id: 'matchmake',
    cat: '가족',
    icon: '💐',
    name: '혼사 추진 (중매)',
    desc: '결혼 안 한 자녀·손주나 본인에게 좋은 자리를 알아본다',
    ap: 1,
    cost: 500,
    targets: (s) => adultsOfLine(s).filter((p) => age(s, p) >= 24 && single(s, p)),
    run: (s, t) => {
      const p = t!;
      const cand = makeDate(s, p, 8);
      if (p.id === s.headId) {
        queueEv(s, 'blind_date', p.id, { cand, agency: '중매', bonus: 4 });
        return '아는 분 소개로 선 자리가 잡혔다.';
      }
      if (chance(s, 0.35 + p.affinity / 400)) {
        startDating(s, p, cand, '중매', true);
        return `${iga(fullName(p))} 선을 보고 ${wa(fullName(cand))} 만나기 시작했다. (결혼 전제)`;
      }
      p.affinity = clamp(p.affinity - 5, -100, 100);
      return `${fullName(p)}: "제 인생은 제가 알아서 할게요." 선 자리를 거절했다.`;
    },
  },
  {
    id: 'push_marriage',
    cat: '가족',
    icon: '💍',
    name: '결혼 재촉',
    desc: '연애 중인 자녀에게 결혼을 권한다',
    ap: 1,
    targets: (s) => adultsOfLine(s).filter((p) => p.id !== s.headId && p.partnerId),
    run: (s, t) => {
      const p = t!;
      if (chance(s, 0.55 + (p.bond ?? 50) / 300)) {
        queueEv(s, 'kid_wedding', p.id);
        return `"그래요, 이참에 날 잡을게요." ${iga(fullName(p))} 결혼을 결심했다.`;
      }
      p.affinity = clamp(p.affinity - 6, -100, 100);
      return '"아직 준비가 안 됐어요!" 괜한 잔소리가 됐다.';
    },
  },
  // ───────── 진로·자기계발 ─────────
  {
    id: 'career',
    cat: '진로·자기계발',
    icon: '🧭',
    name: '진로 다시 고민하기',
    desc: '지금 일을 그만두고 새 길을 찾는다 (직급은 사라진다)',
    ap: 1,
    targets: (s) => adultsOfLine(s).filter((p) => age(s, p) <= 60 && !p.flags.includes('student') && !p.flags.some((f) => f.startsWith('serving:'))),
    run: (s, t) => {
      const p = t!;
      const was = JOBS[p.job].name;
      const sev = severance(s, p);
      p.job = 'none';
      p.jobLevel = 0;
      p.jobYears = 0;
      p.flags = p.flags.filter((f) => !f.startsWith('prep:') && !f.startsWith('tries:'));
      queueEv(s, 'first_job', p.id, { second: true });
      return `${fullName(p)}, ${was} 생활을 정리했다.${sev ? ` 퇴직금 ${formatMoney(sev)}을 받았다.` : ''} 이제 뭘 해볼까?`;
    },
  },
  {
    id: 'job_hop',
    cat: '진로·자기계발',
    icon: '📈',
    name: '이직 시도',
    desc: '경력 2년 이상 · 3년에 한 번 · 서류 → 면접 → 처우 협의. 대부분 떨어진다 (능력·인맥·자격증·경력·경기·나이)',
    ap: 1,
    targets: (s) => adultsOfLine(s).filter((p) => JOBS[p.job].kind === 'salary' && p.jobLevel < JOBS[p.job].maxLevel),
    blocked: (s, t) => {
      if (!t) return undefined;
      if (t.jobYears < 2) return '경력 2년은 채워야';
      const last = Number(t.flags.find((f) => f.startsWith('hop:'))?.slice(4) ?? -99);
      if (s.year - last < 3) return `이직한 지 ${s.year - last}년 (3년 뒤에)`;
      return undefined;
    },
    run: (s, t) => {
      const p = t!;
      const a = age(s, p);
      // 지원자 경쟁력: 능력 + 인맥 + 자격증 + 경력 − 나이 − 불경기
      const skill = statScore(p, JOBS[p.job].stats ?? { int: 1 });
      const bonus = Math.min(10, markOf(p, 'network') * 2) + Math.min(6, markOf(p, 'cert') * 2) + Math.min(8, p.jobYears);
      const agePen = Math.max(0, a - 45) * 1.5;
      const slump = (s.marketChange.stock ?? 0) < -0.1 ? 8 : 0;
      const sc = skill + bonus - agePen - slump;
      const bar = 50 + p.jobLevel * 6;
      p.flags = p.flags.filter((f) => !f.startsWith('hop:'));
      p.flags.push('hop:' + s.year); // 떨어져도 3년은 조용히
      mark(p, 'network', 1);
      const note = slump ? ' (불경기라 채용 자체가 줄었다)' : agePen > 10 ? ' (나이 얘기가 나왔다)' : '';
      // 1) 서류
      if (!check(s, sc, bar, 9)) {
        mood(p, -3);
        return pick(s, ['💦 지원한 다섯 곳 모두 서류 탈락.', '💦 서류는 냈는데 연락이 없다.', '💦 "귀하의 역량은 뛰어나나…" 불합격 메일만 쌓였다.']) + note + '\n지금 회사에 조용히 남는다.';
      }
      // 2) 면접
      if (!check(s, sc + p.actual.cha * 0.2, bar + 8, 9)) {
        mood(p, -5);
        return pick(s, ['💦 최종 면접까지 갔는데 떨어졌다. 2명 중 1명이었단다.', '💦 면접에서 "왜 지금 회사를 나오려 하냐"는 질문에 말이 꼬였다.', '💦 임원 면접 분위기가 싸했다. 역시 불합격.']) + note;
      }
      // 3) 처우 협의: 붙었다
      const r = next(s);
      if (r < 0.2) {
        // 지금 회사가 붙잡는다
        const raise = Math.round(JOBS[p.job].perLevel * 0.5 * wageIndex(s.year));
        p.cash += raise;
        mood(p, 4);
        return `최종 합격! 그런데 사표를 내자 팀장이 붙잡았다. "연봉 올려 줄게." 카운터 오퍼로 남았다. (일시금 ${formatMoney(raise)})`;
      }
      p.jobLevel++;
      p.jobYears = 0;
      if (r < 0.35) {
        mood(p, -8);
        return `🌟 합격해서 옮겼다. ${jobTitle(p)}. …그런데 새 회사 분위기가 영 아니다. 텃세와 야근. 연봉만 올랐다.`;
      }
      mood(p, 6);
      return `🌟 서류·면접·처우 협의까지 통과! ${jobTitle(p)}(으)로 한 단계 올라 옮겼다.`;
    },
  },
  {
    id: 'self_study',
    cat: '진로·자기계발',
    icon: '📖',
    name: '자격증·어학 공부',
    desc: '가주 지능↑ · 공부 습관',
    ap: 1,
    cost: 100,
    blocked: (s) => (age(s, h(s)) < 18 ? '아직 어리다' : undefined),
    run: (s) => {
      const me = h(s);
      const t = rollTier(s, me, { stat: 'int', talent: 'genius' });
      const di = grow(s, me, 'int', t);
      if (t !== 'meh' && t !== 'bad') mark(me, 'study', 1);
      return TIER_MARK[t] + say(s, me, P.selfStudy, t) + fmt([stat('int', di)]);
    },
  },
  {
    id: 'exercise',
    cat: '진로·자기계발',
    icon: '🏃',
    name: '운동하기',
    desc: '건강·근력↑ · 운동이 쌓이면 오래 산다',
    ap: 1,
    cost: 100,
    targets: (s) => adultsOfLine(s).concat(spouseOf(s, h(s)) && alive(spouseOf(s, h(s))!) ? [spouseOf(s, h(s))!] : []),
    run: (s, t) => {
      const p = t!;
      const tier = rollTier(s, p, { stat: 'hp', talent: 'athlete', bonus: -Math.max(0, age(s, p) - 60) / 200 });
      let hp = tier === 'bad' ? -int(s, 1, 3) : grow(s, p, 'hp', tier);
      if (tier === 'bad') p.actual.hp = clamp(p.actual.hp + hp, 0, 100);
      const ds = tier === 'bad' ? 0 : grow(s, p, 'str', tier === 'great' ? 'good' : 'meh');
      if (tier !== 'bad' && tier !== 'meh') {
        mark(p, 'exercise', 1);
        mark(p, 'health_x', -1);
      }
      return TIER_MARK[tier] + fillName(say(s, p, P.exercise, tier), fullName(p)) + fmt([stat('hp', hp), stat('str', ds)]);
    },
  },
  {
    id: 'checkup',
    cat: '진로·자기계발',
    icon: '🩺',
    name: '종합검진',
    desc: '8년간 암이 생겨도 초기에 발견된다 (생존율↑)',
    ap: 1,
    cost: 200,
    targets: (s) => Object.values(s.people).filter((p) => alive(p) && age(s, p) >= 35 && (p.id === s.headId || p.id === h(s).spouseId || isDescendantOf(s, p, h(s)) || parentsOf(s, h(s)).includes(p))),
    run: (s, t) => {
      const p = t!;
      p.flags = p.flags.filter((f) => !f.startsWith('checkup:'));
      p.flags.push('checkup:' + s.year);
      mark(p, 'health_x', -1);
      return `${fullName(p)} 검진 완료. ${p.actual.hp < 30 ? '의사가 생활습관을 바꾸라고 경고했다.' : '큰 이상은 없다.'}`;
    },
  },
  // ───────── 자녀 교육 ─────────
  {
    id: 'extra_class',
    cat: '자녀 교육',
    icon: '✏️',
    name: '특강·과외 추가',
    desc: '성적↑ 행복↓ · 사교육비 누적',
    ap: 1,
    cost: 500,
    targets: (s) => minors(s, 8, 18),
    run: (s, t) => {
      const p = t!;
      const tier = rollTier(s, p, { stat: 'int', talent: 'genius', bonus: hasTrait(p, 'rebel') ? -0.12 : 0 });
      const was = standing(p);
      const st = { great: int(s, 5, 7), good: int(s, 2, 4), meh: int(s, 0, 1), bad: 0 }[tier] * getFatigue();
      p.study = clamp((p.study ?? 30) + st, 0, 100);
      p.eduSpent = (p.eduSpent ?? 0) + 500;
      const joy = -{ great: jitter(s, 2), good: jitter(s, 4), meh: jitter(s, 5), bad: jitter(s, 9) }[tier];
      mood(p, joy);
      if (tier !== 'bad' && tier !== 'meh') mark(p, 'study', 1);
      if (p.happiness < 30 || tier === 'bad') mark(p, 'hurt', 1);
      return TIER_MARK[tier] + fillName(say(s, p, P.extraClass, tier), fullName(p)) + fmt([standingChange(was, p), ['행복', joy]]);
    },
  },
  {
    id: 'aptitude',
    cat: '자녀 교육',
    icon: '🔬',
    name: '정밀 적성검사',
    desc: '숨은 재능과 잠재력을 모두 확인',
    ap: 0,
    cost: 300,
    targets: (s) => minors(s).filter((p) => !p.potentialKnown),
    run: (_s, t) => {
      const p = t!;
      p.potentialKnown = true;
      for (const x of p.talents) x.discovered = true;
      addFlag(p, 'tested');
      return p.talents.length ? `${fullName(p)}의 숨은 재능과 잠재력이 드러났다.` : `${fullName(p)}: 뚜렷한 재능은 없다. 잠재력은 확인했다.`;
    },
  },
  {
    id: 'abroad',
    cat: '자녀 교육',
    icon: '🗽',
    name: '조기유학 상담',
    desc: '13~16세 자녀 (3년 2억)',
    ap: 1,
    targets: (s) => minors(s, 13, 16).filter((p) => !hasFlag(p, 'abroad')),
    run: (s, t) => {
      queueEv(s, 'r_abroad', t!.id);
      return '유학원 상담을 받았다.';
    },
  },
  // ───────── 재산 ─────────
  {
    id: 'bargain',
    cat: '재산',
    icon: '🔎',
    name: '부동산 임장 (급매 찾기)',
    desc: '발품을 팔면 시세보다 싼 급매가 매물 목록에 올라온다',
    ap: 1,
    blocked: (s) => (age(s, h(s)) < 20 ? '아직 어리다' : undefined),
    run: (s) => {
      const me = h(s);
      const t = rollTier(s, me, { stat: 'int', talent: 'merchant' });
      if (t === 'bad' || (t === 'meh' && chance(s, 0.5))) return pick(s, ['며칠을 돌아다녔지만 마땅한 매물이 없었다.', '중개사무소마다 "요즘 급매는 없어요"란다.', '괜찮아 보였던 집이 알고 보니 반지하였다.']);
      const found = addBargains(s, t === 'great' ? 2 : 1);
      return `${pick(s, ['동네 중개사 사장님이 조용히 귀띔해 줬다.', '새벽 임장에서 급하게 내놓은 집을 발견했다.', '경매 정보지를 뒤지다 눈에 띄는 물건을 찾았다.'])}\n→ 자산 탭 매물 목록에 추가: ${found.map((l) => `${l.name} ${formatMoney(l.price)}`).join(', ')}`;
    },
  },
  {
    id: 'art_fair',
    cat: '재산',
    icon: '🖼',
    name: '아트페어·경매 참관',
    desc: '싸게 나온 작품을 만날 수도 (위작 주의)',
    ap: 1,
    blocked: (s) => (spendable(s) < 15000 ? '여윳돈 1.5억 이상 필요' : undefined),
    run: (s) => {
      if (!chance(s, 0.6)) return '눈에 들어오는 작품이 없었다.';
      queueEv(s, 'r_auction', s.headId);
      return '비공개 경매에 초대받았다.';
    },
  },
  // ───────── 사회 ─────────
  {
    id: 'volunteer',
    cat: '사회',
    icon: '🤝',
    name: '봉사활동',
    desc: '성품↑ 명성↑ · 선행은 언젠가 돌아온다',
    ap: 1,
    who: 'any',
    run: (s) => {
      const me = h(s);
      const t = rollTier(s, me, { stat: 'mor' });
      const dm = grow(s, me, 'mor', t);
      const fame = { great: 1.5, good: 0.5, meh: 0.2, bad: 0 }[t];
      s.fame += fame;
      const joy = t === 'bad' ? 0 : jitter(s, 5);
      mood(me, joy);
      if (t !== 'bad') mark(me, 'kind', 1);
      return TIER_MARK[t] + say(s, me, P.volunteer, t) + fmt([stat('mor', dm), ['명성', fame], ['행복', joy]]);
    },
  },
  {
    id: 'network',
    cat: '사회',
    icon: '🥂',
    name: '인맥 관리',
    desc: '모임·골프·동창회 · 매력↑ · 인맥은 기회가 된다',
    ap: 1,
    cost: 200,
    blocked: (s) => (age(s, h(s)) < 20 ? '아직 어리다' : undefined),
    run: (s) => {
      const me = h(s);
      const t = rollTier(s, me, { stat: 'cha', bonus: hasTrait(me, 'social') ? 0.1 : hasTrait(me, 'shy') ? -0.1 : 0 });
      const dc = t === 'bad' ? 0 : grow(s, me, 'cha', t, 0.7);
      const joy = t === 'bad' ? -jitter(s, 5) : 0;
      mood(me, joy);
      if (t !== 'bad') mark(me, 'network', t === 'great' ? 2 : 1);
      const tip = t !== 'bad' && chance(s, t === 'great' ? 0.35 : 0.15);
      if (tip) queueEv(s, 'r_stock_tip', me.id);
      return TIER_MARK[t] + say(s, me, P.network, t) + fmt([stat('cha', dc), ['행복', joy]]) + (tip ? '\n누군가 솔깃한 정보를 흘렸다…' : '');
    },
  },
  {
    id: 'donate',
    cat: '사회',
    icon: '🎗',
    name: '장학금 기부',
    desc: '명성↑ · 먼 훗날 장학생이 찾아올 수도',
    ap: 1,
    cost: 2000,
    run: (s) => {
      const me = h(s);
      s.fame += 5;
      mark(me, 'kind', 1);
      if (chance(s, 0.3)) schedule(s, int(s, 15, 25), 'scholar_return', me.id, { years: 20 });
      return `${s.familyName}씨 가문 장학금을 만들었다. (명성 +5)`;
    },
  },
  {
    id: 'politics',
    cat: '사회',
    icon: '🗳',
    name: '정치 활동',
    desc: '당원 활동·지역 봉사. 쌓이면 출마 제안이 온다',
    ap: 1,
    cost: 1000,
    blocked: (s) => {
      const me = h(s);
      if (age(s, me) < 35) return '35세부터';
      if (hasFlag(me, 'draft_dodger')) return '병역 기피자는 불가';
      if (['politician', 'president'].includes(me.job)) return '이미 정치인이다';
      return undefined;
    },
    run: (s) => {
      const me = h(s);
      mark(me, 'politics', 1);
      s.fame += 1;
      if (markOf(me, 'politics') >= 3 && s.fame >= 25) {
        queueEv(s, 'election', me.id);
        return '지역에서 이름이 알려졌다. 당에서 공천 이야기가 나온다!';
      }
      return `지역구 행사를 돌았다. (정치 활동 ${markOf(me, 'politics')}/3)`;
    },
  },
];

/** 지금 가주가 할 수 있는 종류의 행동인가 */
export function forHead(s: GameState, a: ActionDef): boolean {
  if (a.show && !a.show(s)) return false;
  if (a.targets && !a.targets(s).length) return false;
  if (a.tracks && !a.tracks.includes(trackOf(s, h(s)) ?? '')) return false;
  const st = a.stages ?? STAGE_DEFAULT[a.id];
  if (st) return st.includes(stageOf(s, h(s)));
  const kid = age(s, h(s)) < 20;
  const w = a.who ?? 'adult';
  return w === 'any' || (w === 'kid') === kid;
}

export function apLeft(s: GameState) {
  return s.ap ?? AP_PER_YEAR;
}

/** 행동 실행: 행동력·비용 확인 → 효과 */
export function doAction(s: GameState, id: string, targetId?: string): { ok: boolean; text: string } {
  const a = ACTIONS.find((x) => x.id === id);
  if (!a) return { ok: false, text: '' };
  bindState(s);
  if (!forHead(s, a)) return { ok: false, text: '지금 나이에는 할 수 없다' };
  if (apLeft(s) < a.ap) return { ok: false, text: '올해 행동력을 다 썼다. 다음 해로 넘기자.' };
  const t = targetId ? s.people[targetId] : undefined;
  if (a.targets && (!t || !a.targets(s).includes(t))) return { ok: false, text: '대상을 골라주세요' };
  const why = a.blocked?.(s, t);
  if (why) return { ok: false, text: why };
  if (a.cost && spendable(s) < a.cost) return { ok: false, text: '돈이 부족하다' };
  if (a.cost) pay(s, householder(s), a.cost);
  s.ap = apLeft(s) - a.ap;
  // 같은 걸 한 해에 여러 번: 두 번째 60%, 세 번째 35%… 그리고 지친다
  const used = (s.actUsed ??= {});
  const rep = used[id] ?? 0;
  used[id] = rep + 1;
  setFatigue([1, 0.6, 0.35, 0.2][Math.min(3, rep)]);
  let text = a.run(s, t);
  setFatigue(1);
  if (rep >= 1 && a.ap > 0) {
    const who = t ?? h(s);
    mood(who, -3 * rep);
    text += `\n(올해 ${rep + 1}번째라 효과가 줄었다 · 피로 누적, 행복 -${3 * rep})`;
  }
  s.log.push({ year: s.year, text: `${a.icon} ${a.name}${t ? ` (${fullName(t)})` : ''}: ${text.split('\n')[0]}`, kind: 'life' });
  return { ok: true, text };
}

/** 적립식 자동 증여: 해마다 설정한 금액을 보낸다 */
export function autoGiftYear(s: GameState, give: (to: Person, amount: number) => boolean): string[] {
  const out: string[] = [];
  const gifts = s.policy.autoGifts ?? {};
  for (const [id, amt] of Object.entries(gifts)) {
    const to = s.people[id];
    if (!to || !alive(to) || !amt) {
      delete gifts[id];
      continue;
    }
    if (give(to, amt)) out.push(`🎁 ${fullName(to)}에게 적립식 증여 ${formatMoney(amt)}`);
    else out.push(`🎁 현금이 부족해 ${fullName(to)}에게 이번 해 증여를 못 했다`);
  }
  return out;
}

// ───────────────────────── 인생 단계별 기본 설정 ─────────────────────────

const YOUNG: Stage[] = ['little', 'elem', 'teen'];
const GROWN: Stage[] = ['adult', 'senior'];
const ADULTISH: Stage[] = ['univ', 'prep', 'adult', 'senior'];
/** 예전부터 있던 행동이 어느 단계에서 보이는가 */
const STAGE_DEFAULT: Record<string, Stage[]> = {
  kid_study: ['elem', 'teen'],
  kid_play: YOUNG,
  kid_sport: YOUNG,
  kid_art: YOUNG,
  kid_help: YOUNG,
  kid_save: ['elem', 'teen'],
  family_trip: GROWN,
  date: ADULTISH,
  talk: GROWN,
  visit_parents: ADULTISH,
  grandkid: GROWN,
  matchmake: GROWN,
  push_marriage: GROWN,
  career: ['adult'],
  job_hop: ['adult'],
  self_study: ['adult'],
  exercise: ADULTISH,
  checkup: GROWN,
  extra_class: GROWN,
  aptitude: GROWN,
  abroad: GROWN,
  bargain: GROWN,
  art_fair: GROWN,
  volunteer: ['teen', 'univ', 'prep', 'adult', 'senior'],
  network: ['adult'],
  donate: GROWN,
  politics: GROWN,
};

const me = (s: GameState) => h(s);
const hasSpouse = (s: GameState) => {
  const q = spouseOf(s, h(s));
  return !!q && alive(q);
};
const single2 = (s: GameState) => !h(s).partnerId && !hasSpouse(s);
const fat = () => getFatigue();

/** 단계마다 새로 생긴 행동들 */
const STAGE_ACTIONS: ActionDef[] = [
  // ───── 유아·초등·중고 ─────
  {
    id: 'kid_book',
    cat: '진로·자기계발',
    icon: '📖',
    name: '책 읽기',
    desc: '지능↑ 성적 조금↑ · 독서 습관은 오래간다',
    ap: 1,
    stages: YOUNG,
    run: (s) => {
      const p = me(s);
      const t = rollTier(s, p, { stat: 'int', bonus: markOf(p, 'study') * 0.01 });
      const was = standing(p);
      const di = grow(s, p, 'int', t, 0.8);
      if (age(s, p) >= 8) p.study = clamp((p.study ?? 20) + { great: 2, good: 1, meh: 0, bad: 0 }[t] * fat(), 0, 100);
      if (t === 'great' || t === 'good') mark(p, 'study', 1);
      const joy = t === 'bad' ? -jitter(s, 3) : 0;
      mood(p, joy);
      return TIER_MARK[t] + say(s, p, P2.book, t) + fmt([stat('int', di), ...(age(s, p) >= 8 ? [standingChange(was, p)] : []), ['행복', joy]]);
    },
  },
  {
    id: 'kid_game',
    cat: '가족',
    icon: '🎮',
    name: '게임하기',
    desc: '행복↑ · 성적↓ · 빠지면 헤어나기 어렵다',
    ap: 1,
    stages: ['elem', 'teen'],
    run: (s) => {
      const p = me(s);
      const t = rollTier(s, p, { stat: 'int', bonus: -markOf(p, 'risk') * 0.02 });
      const was = standing(p);
      const joy = { great: jitter(s, 12), good: jitter(s, 8), meh: jitter(s, 4), bad: -jitter(s, 4) }[t];
      mood(p, joy);
      p.study = clamp((p.study ?? 20) - { great: 1, good: 1.5, meh: 3, bad: 4 }[t], 0, 100);
      const di = t === 'great' ? grow(s, p, 'int', 'meh') : 0;
      let aff = 0;
      if (t === 'bad') {
        aff = -jitter(s, 5);
        for (const q of parentsOf(s, p).filter(alive)) q.affinity = clamp(q.affinity + aff, -100, 100);
        mark(p, 'risk', 1);
      }
      return TIER_MARK[t] + say(s, p, P2.game, t) + fmt([['행복', joy], standingChange(was, p), stat('int', di), ['부모님 관계', aff]]);
    },
  },
  {
    id: 'teen_cram',
    cat: '진로·자기계발',
    icon: '🌙',
    name: '밤샘 벼락치기',
    desc: '성적 크게↑ 가능 · 건강↓ 행복↓ · 실패하면 역효과',
    ap: 1,
    stages: ['teen'],
    run: (s) => {
      const p = me(s);
      const t = rollTier(s, p, { stat: 'hp', bonus: hasTrait(p, 'tough') ? 0.08 : hasTrait(p, 'frail') ? -0.1 : 0 });
      const was = standing(p);
      const st = { great: int(s, 5, 7), good: int(s, 3, 4), meh: 1, bad: -2 }[t] * (t === 'bad' ? 1 : fat());
      p.study = clamp((p.study ?? 20) + st, 0, 100);
      const hp = -int(s, 1, t === 'bad' ? 4 : 2);
      p.actual.hp = clamp(p.actual.hp + hp, 0, 100);
      const joy = -jitter(s, t === 'bad' ? 8 : 4);
      mood(p, joy);
      if (t === 'bad') mark(p, 'health_x', 1);
      return TIER_MARK[t] + say(s, p, P2.cram, t) + fmt([standingChange(was, p), stat('hp', hp), ['행복', joy]]);
    },
  },
  {
    id: 'teen_club',
    cat: '가족',
    icon: '🎸',
    name: '동아리 활동',
    desc: '매력↑ 인맥↑ · 공부 시간은 줄어든다',
    ap: 1,
    stages: ['teen'],
    run: (s) => {
      const p = me(s);
      const t = rollTier(s, p, { stat: 'cha', bonus: hasTrait(p, 'social') ? 0.1 : hasTrait(p, 'leader') ? 0.08 : 0 });
      const dc = t === 'bad' ? 0 : grow(s, p, 'cha', t);
      const joy = t === 'bad' ? -jitter(s, 5) : jitter(s, 6);
      mood(p, joy);
      p.study = clamp((p.study ?? 20) - (t === 'bad' ? 2 : 1), 0, 100);
      if (t !== 'bad') mark(p, 'network', 1);
      if (t === 'great') p.flags.includes('club') || p.flags.push('club');
      return TIER_MARK[t] + say(s, p, P2.club, t) + fmt([stat('cha', dc), ['행복', joy], ['성적', -(t === 'bad' ? 2 : 1)]]);
    },
  },
  {
    id: 'teen_job',
    cat: '재산',
    icon: '🧋',
    name: '아르바이트',
    desc: '돈을 번다 · 성적↓ 피로↑ (16세부터)',
    ap: 1,
    stages: ['teen'],
    blocked: (s) => (age(s, me(s)) < 16 ? '16세부터' : undefined),
    run: (s) => {
      const p = me(s);
      const t = rollTier(s, p, { stat: 'mor' });
      const got = { great: jitter(s, 350), good: jitter(s, 220), meh: jitter(s, 120), bad: jitter(s, 60) }[t];
      p.cash += got;
      p.study = clamp((p.study ?? 20) - 2, 0, 100);
      const hp = t === 'bad' ? -int(s, 1, 2) : 0;
      p.actual.hp = clamp(p.actual.hp + hp, 0, 100);
      if (t !== 'bad') mark(p, 'thrift', 1);
      const dm = t === 'great' ? grow(s, p, 'mor', 'good') : 0;
      return TIER_MARK[t] + say(s, p, P2.teenJob, t) + fmt([['수입(만)', got], ['성적', -2], stat('hp', hp), stat('mor', dm)]);
    },
  },
  {
    id: 'teen_love',
    cat: '가족',
    icon: '💌',
    name: '연애',
    desc: '행복↑ 매력↑ · 성적↓ · 헤어지면 상처 (15세부터)',
    ap: 1,
    stages: ['teen'],
    blocked: (s) => (age(s, me(s)) < 15 ? '15세부터' : undefined),
    run: (s) => {
      const p = me(s);
      const t = rollTier(s, p, { stat: 'cha', bonus: hasTrait(p, 'flirt') ? 0.08 : hasTrait(p, 'shy') ? -0.08 : 0 });
      const joy = { great: jitter(s, 14), good: jitter(s, 8), meh: 0, bad: -jitter(s, 12) }[t];
      mood(p, joy);
      const dc = t === 'great' || t === 'good' ? grow(s, p, 'cha', 'meh') : 0;
      p.study = clamp((p.study ?? 20) - (t === 'bad' ? 3 : 2), 0, 100);
      if (t === 'bad') mark(p, 'scar', 1);
      return TIER_MARK[t] + say(s, p, P2.teenLove, t) + fmt([['행복', joy], stat('cha', dc), ['성적', -(t === 'bad' ? 3 : 2)]]);
    },
  },
  // ───── 대학생 ─────
  {
    id: 'u_major',
    cat: '진로·자기계발',
    icon: '🎓',
    name: '전공 공부 (학점 관리)',
    desc: '학점↑ → 취업·대학원에 유리 · 행복 조금↓',
    ap: 1,
    stages: ['univ'],
    show: (s) => !isMedStudent(me(s)),
    run: (s) => {
      const p = me(s);
      const t = rollTier(s, p, { stat: 'int', talent: 'genius', bonus: hasTrait(p, 'diligent') ? 0.05 : 0 });
      const g = { great: 2, good: 1, meh: 0, bad: -1 }[t];
      mark(p, 'gpa', g);
      const di = grow(s, p, 'int', t === 'great' ? 'good' : 'meh');
      const joy = -jitter(s, 3);
      mood(p, joy);
      if (t === 'great') p.cash += 250; // 성적 장학금
      return TIER_MARK[t] + say(s, p, P2.major, t) + fmt([`학점 ${gpaLabel(p)}`, stat('int', di), ['행복', joy], ...(t === 'great' ? [['장학금(만)', 250] as [string, number]] : [])]);
    },
  },
  {
    id: 'u_med',
    cat: '진로·자기계발',
    icon: '🩺',
    name: '의학 공부 (시험·실습)',
    desc: '쏟아지는 시험과 실습 · 게을리하면 유급',
    ap: 1,
    stages: ['univ'],
    show: (s) => isMedStudent(me(s)),
    run: (s) => {
      const p = me(s);
      const t = rollTier(s, p, { stat: 'int', talent: 'genius' });
      mark(p, 'gpa', { great: 2, good: 1, meh: 0, bad: -1 }[t]);
      const di = grow(s, p, 'int', t === 'great' ? 'good' : 'meh');
      const hp = -int(s, 0, 2);
      p.actual.hp = clamp(p.actual.hp + hp, 0, 100);
      const joy = -jitter(s, 4);
      mood(p, joy);
      return TIER_MARK[t] + say(s, p, P2.med, t) + fmt([`학점 ${gpaLabel(p)}`, stat('int', di), stat('hp', hp), ['행복', joy]]);
    },
  },
  {
    id: 'u_club',
    cat: '가족',
    icon: '🎤',
    name: '동아리·학생회',
    desc: '매력↑ 인맥↑ · 학점 관리는 소홀해진다',
    ap: 1,
    stages: ['univ'],
    run: (s) => {
      const p = me(s);
      const t = rollTier(s, p, { stat: 'cha', bonus: hasTrait(p, 'leader') ? 0.1 : 0 });
      const dc = t === 'bad' ? 0 : grow(s, p, 'cha', t);
      mark(p, 'network', t === 'great' ? 2 : t === 'bad' ? 0 : 1);
      if (t === 'bad' || chance(s, 0.3)) mark(p, 'gpa', -1);
      const joy = t === 'bad' ? -jitter(s, 5) : jitter(s, 7);
      mood(p, joy);
      return TIER_MARK[t] + say(s, p, P2.uClub, t) + fmt([stat('cha', dc), ['행복', joy]]);
    },
  },
  {
    id: 'u_job',
    cat: '재산',
    icon: '💼',
    name: '아르바이트·과외',
    desc: '생활비를 번다 · 학점·건강↓',
    ap: 1,
    stages: ['univ', 'prep'],
    run: (s) => {
      const p = me(s);
      const t = rollTier(s, p, { stat: 'int' });
      const got = { great: jitter(s, 900), good: jitter(s, 550), meh: jitter(s, 300), bad: jitter(s, 150) }[t];
      p.cash += got;
      const hp = t === 'bad' ? -int(s, 1, 3) : -int(s, 0, 1);
      p.actual.hp = clamp(p.actual.hp + hp, 0, 100);
      if (stageOf(s, p) === 'univ' && (t === 'bad' || chance(s, 0.35))) mark(p, 'gpa', -1);
      if (stageOf(s, p) === 'prep') p.study = clamp((p.study ?? 40) - 2, 0, 100);
      mark(p, 'thrift', 1);
      return TIER_MARK[t] + say(s, p, P2.uJob, t) + fmt([['수입(만)', got], stat('hp', hp)]);
    },
  },
  {
    id: 'u_meeting',
    cat: '가족',
    icon: '💘',
    name: '미팅·소개팅',
    desc: '연인이 생길 수도 · 돈과 시간이 든다',
    ap: 1,
    cost: 10,
    stages: ['univ', 'prep', 'adult'],
    show: (s) => single2(s) && age(s, me(s)) < 40,
    run: (s) => {
      const p = me(s);
      const t = rollTier(s, p, { stat: 'cha', bonus: appealBonus(p) / 100 });
      if (t === 'great') {
        const q = makeDate(s, p);
        startDating(s, p, q, '미팅');
        mood(p, 12);
        return TIER_MARK[t] + say(s, p, P2.meeting, t) + `\n→ ${wa(fullName(q))} 사귀기 시작했다!` + fmt([['행복', 12]]);
      }
      const joy = { great: 0, good: jitter(s, 5), meh: 0, bad: -jitter(s, 6) }[t];
      mood(p, joy);
      const dc = t === 'good' ? grow(s, p, 'cha', 'meh') : 0;
      return TIER_MARK[t] + say(s, p, P2.meeting, t) + fmt([['행복', joy], stat('cha', dc)]);
    },
  },
  {
    id: 'u_intern',
    cat: '진로·자기계발',
    icon: '🏢',
    name: '인턴십',
    desc: '실무 경험 → 취업에 큰 도움 (21세부터 · 의약계열 제외)',
    ap: 1,
    stages: ['univ', 'prep'],
    show: (s) => !isMedStudent(me(s)),
    blocked: (s) => (age(s, me(s)) < 21 ? '21세부터' : undefined),
    run: (s) => {
      const p = me(s);
      const t = rollTier(s, p, { stat: 'int', bonus: Math.min(6, markOf(p, 'gpa')) * 0.02 + Math.min(6, markOf(p, 'network')) * 0.01 });
      mark(p, 'intern', { great: 2, good: 1, meh: 1, bad: 0 }[t]);
      const dc = t === 'great' || t === 'good' ? grow(s, p, 'cha', 'meh') : 0;
      const joy = t === 'bad' ? -jitter(s, 7) : 0;
      mood(p, joy);
      if (t === 'great') addFlag(p, 'intern_offer');
      return TIER_MARK[t] + say(s, p, P2.intern, t) + fmt([`경력 ${markOf(p, 'intern')}`, stat('cha', dc), ['행복', joy]]);
    },
  },
  {
    id: 'u_exchange',
    cat: '진로·자기계발',
    icon: '🌍',
    name: '교환학생',
    desc: '한 학기 해외 · 지능·매력·인맥↑ (한 번만)',
    ap: 2,
    cost: 1500,
    stages: ['univ'],
    show: (s) => !hasFlag(me(s), 'exchange') && !isMedStudent(me(s)),
    run: (s) => {
      const p = me(s);
      addFlag(p, 'exchange');
      const t = rollTier(s, p, { stat: 'cha' });
      const di = grow(s, p, 'int', t);
      const dc = grow(s, p, 'cha', t);
      mark(p, 'network', 2);
      const joy = t === 'bad' ? -jitter(s, 4) : jitter(s, 12);
      mood(p, joy);
      return TIER_MARK[t] + say(s, p, P2.exchange, t) + fmt([stat('int', di), stat('cha', dc), ['행복', joy]]);
    },
  },
  {
    id: 'u_cert',
    cat: '진로·자기계발',
    icon: '📜',
    name: '자격증·어학 시험',
    desc: '스펙 한 줄 · 취업에 조금 유리',
    ap: 1,
    cost: 30,
    stages: ['univ', 'prep'],
    run: (s) => {
      const p = me(s);
      const t = rollTier(s, p, { stat: 'int' });
      if (t === 'great' || t === 'good') mark(p, 'cert', 1);
      const di = grow(s, p, 'int', t === 'great' ? 'good' : 'meh');
      return TIER_MARK[t] + say(s, p, P2.cert, t) + fmt([`자격증 ${markOf(p, 'cert')}개`, stat('int', di)]);
    },
  },
  // ───── 수험생·취준생 ─────
  {
    id: 'p_focus',
    cat: '진로·자기계발',
    icon: '🔥',
    name: '공부에 몰두',
    desc: '재수·고시·취업 준비 · 성적↑ 합격률↑ · 행복↓ 건강↓',
    ap: 1,
    stages: ['prep'],
    run: (s) => {
      const p = me(s);
      const t = rollTier(s, p, { stat: 'int', bonus: hasTrait(p, 'anxious') ? -0.06 : 0 });
      const was = standing(p);
      p.study = clamp((p.study ?? 40) + { great: int(s, 3, 5), good: int(s, 2, 3), meh: 1, bad: 0 }[t] * fat(), 0, 100);
      if (t === 'great' || t === 'good') mark(p, 'study', 1);
      const joy = -jitter(s, t === 'bad' ? 8 : 4);
      mood(p, joy);
      const hp = -int(s, 0, t === 'bad' ? 3 : 1);
      p.actual.hp = clamp(p.actual.hp + hp, 0, 100);
      return TIER_MARK[t] + say(s, p, P2.focus, t) + fmt([p.flags.includes('retaking') ? standingChange(was, p) : `준비 ${markOf(p, 'study')}`, ['행복', joy], stat('hp', hp)]);
    },
  },
  {
    id: 'p_group',
    cat: '진로·자기계발',
    icon: '👥',
    name: '스터디 모임',
    desc: '서로 붙잡아 준다 · 준비↑ 매력 조금↑',
    ap: 1,
    stages: ['prep', 'univ'],
    run: (s) => {
      const p = me(s);
      const t = rollTier(s, p, { stat: 'cha', bonus: hasTrait(p, 'social') ? 0.08 : 0 });
      if (t === 'great' || t === 'good') mark(p, 'study', 1);
      if (t !== 'bad') mark(p, 'network', 1);
      const dc = t === 'great' ? grow(s, p, 'cha', 'meh') : 0;
      const joy = t === 'bad' ? -jitter(s, 5) : jitter(s, 3);
      mood(p, joy);
      return TIER_MARK[t] + say(s, p, P2.group, t) + fmt([stat('cha', dc), ['행복', joy]]);
    },
  },
  // ───── 사회인 ─────
  {
    id: 'overtime',
    cat: '진로·자기계발',
    icon: '🌃',
    name: '야근 자청',
    desc: '승진 기회↑ · 건강↓ 금슬↓ 행복↓',
    ap: 1,
    stages: ['adult'],
    show: (s) => ['salary', 'fixed'].includes(JOBS[me(s).job].kind) && me(s).job !== 'pension',
    run: (s) => {
      const p = me(s);
      const t = rollTier(s, p, { stat: 'hp', bonus: hasTrait(p, 'diligent') ? 0.08 : 0 });
      let promo = '';
      const j = JOBS[p.job];
      if (j.kind === 'salary' && p.jobLevel < j.maxLevel && chance(s, { great: 0.45, good: 0.15, meh: 0.05, bad: 0 }[t])) {
        p.jobLevel++;
        promo = `\n→ ${jobTitle(p)}(으)로 승진!`;
      }
      const hp = -int(s, 1, t === 'bad' ? 5 : 2);
      p.actual.hp = clamp(p.actual.hp + hp, 0, 100);
      const b = hasSpouse(s) ? -int(s, 1, 4) : 0;
      bond(s, p, b);
      const joy = -jitter(s, 4);
      mood(p, joy);
      if (t === 'bad') mark(p, 'health_x', 1);
      return TIER_MARK[t] + say(s, p, P2.overtime, t) + promo + fmt([stat('hp', hp), ['금슬', b], ['행복', joy]]);
    },
  },
  {
    id: 'hobby',
    cat: '가족',
    icon: '🎣',
    name: '취미 생활',
    desc: '행복↑ 스트레스↓ · 돈이 든다',
    ap: 1,
    cost: 100,
    stages: ['adult', 'senior'],
    run: (s) => {
      const p = me(s);
      const t = rollTier(s, p, { stat: 'cha' });
      const joy = { great: jitter(s, 14), good: jitter(s, 9), meh: jitter(s, 3), bad: -jitter(s, 3) }[t];
      mood(p, joy);
      const k = pick(s, ['cha', 'str', 'hp'] as const);
      const d = t === 'bad' ? 0 : grow(s, p, k, 'meh');
      let money = 0;
      if (t === 'bad') (money = -jitter(s, 200)), (p.cash += money);
      mark(p, 'health_x', -1);
      return TIER_MARK[t] + say(s, p, P2.hobby, t) + fmt([['행복', joy], stat(k, d), ['돈(만)', money]]);
    },
  },
  {
    id: 'side_job',
    cat: '재산',
    icon: '🛒',
    name: '부업',
    desc: '퇴근 후 한 푼 더 · 대박도 손해도 있다 · 피로↑',
    ap: 1,
    stages: ['adult'],
    run: (s) => {
      const p = me(s);
      const t = rollTier(s, p, { stat: 'int', talent: 'merchant' });
      const got = { great: jitter(s, 1800), good: jitter(s, 700), meh: jitter(s, 150), bad: -jitter(s, 400) }[t];
      p.cash += got;
      const hp = -int(s, 0, 2);
      p.actual.hp = clamp(p.actual.hp + hp, 0, 100);
      const joy = t === 'bad' ? -jitter(s, 5) : 0;
      mood(p, joy);
      return TIER_MARK[t] + say(s, p, P2.sideJob, t) + fmt([['수입(만)', got], stat('hp', hp), ['행복', joy]]);
    },
  },
  // ───── 노년 ─────
  {
    id: 'senior_class',
    cat: '진로·자기계발',
    icon: '🏫',
    name: '노인대학·문화센터',
    desc: '지능 유지·행복↑ · 친구가 생긴다',
    ap: 1,
    cost: 20,
    stages: ['senior'],
    run: (s) => {
      const p = me(s);
      const t = rollTier(s, p, { stat: 'int' });
      const di = t === 'bad' ? 0 : grow(s, p, 'int', t === 'great' ? 'good' : 'meh');
      const joy = t === 'bad' ? -jitter(s, 3) : jitter(s, 8);
      mood(p, joy);
      mark(p, 'network', 1);
      return TIER_MARK[t] + say(s, p, P2.seniorClass, t) + fmt([stat('int', di), ['행복', joy]]);
    },
  },
  {
    id: 'garden',
    cat: '가족',
    icon: '🥬',
    name: '텃밭 가꾸기',
    desc: '건강·행복↑',
    ap: 1,
    stages: ['senior'],
    run: (s) => {
      const p = me(s);
      const t = rollTier(s, p, { stat: 'hp' });
      const hp = t === 'bad' ? -int(s, 1, 3) : grow(s, p, 'hp', 'meh');
      if (t === 'bad') p.actual.hp = clamp(p.actual.hp + hp, 0, 100);
      const joy = t === 'bad' ? 0 : jitter(s, 7);
      mood(p, joy);
      mark(p, 'exercise', 1);
      return TIER_MARK[t] + say(s, p, P2.garden, t) + fmt([stat('hp', hp), ['행복', joy]]);
    },
  },
];
// 올해의 기회: 목록 맨 앞 (분류 칩도 맨 앞에 선다)
ACTIONS.unshift(...oppActions((s) => stageOf(s, h(s))));
ACTIONS.push(...STAGE_ACTIONS, ...STUDENT_ACTIONS, ...TRACK_ACTIONS, {
  id: 'license',
  cat: '진로·자기계발',
  icon: '🚦',
  name: '운전면허 따기',
  desc: '1종 보통 · 학원비 약 77만 (학과 → 장내기능 → 도로주행). 차를 사려면 필요하다 (만 18세부터)',
  ap: 1,
  cost: 77,
  stages: ['teen', 'univ', 'prep', 'adult', 'senior'],
  show: (s) => age(s, h(s)) >= 18 && !hasFlag(h(s), 'license'),
  run: (s) => {
    const p = h(s);
    const t = rollTier(s, p, { stat: 'int' });
    if (t === 'bad') {
      addFlag(p, 'license');
      return pick(s, ['💦 도로주행에서 두 번 떨어졌다. 세 번째에 겨우 붙었다. 재시험비가 아깝다.', '💦 장내기능 T자 코스에서 탈선. 재응시 끝에 면허증을 받았다.']);
    }
    addFlag(p, 'license');
    return pick(s, ['🌟 필기 100점, 기능·도로주행 한 번에 합격! 강사님이 "타고났다"고 했다.', '한 번에 붙었다. 면허증 사진이 영 마음에 안 든다.', '도로주행 시험관이 "브레이크 좀 부드럽게"라고 했지만 합격!']);
  },
}, {
  id: 'youth_account',
  cat: '재산',
  icon: '🌱',
  name: '청년도약계좌 가입',
  desc: '5년간 매년 840만(월 70만) 납입 → 만기에 약 5,000만 (19~34세, 한 번만)',
  ap: 0,
  stages: ['univ', 'prep', 'adult'],
  show: (s) => {
    const p = h(s);
    return age(s, p) >= 19 && age(s, p) <= 34 && !p.flags.some((f) => f.startsWith('youth_acc'));
  },
  run: (s) => {
    const p = h(s);
    p.flags.push('youth_acc:' + s.year);
    mark(p, 'thrift', 2);
    return '청년도약계좌를 열었다. 5년 동안 매달 70만 원씩. 만기엔 정부 기여금과 비과세 이자가 붙는다. (중간에 빼면 손해)';
  },
}, {
  id: 'reverse_mortgage',
  cat: '재산',
  icon: '🏡',
  name: '주택연금 가입',
  desc: '살던 집에 계속 살면서 평생 매년 연금을 받는다 · 받은 돈은 집에 대출로 쌓인다 (55세 이상, 내 집)',
  ap: 1,
  stages: ['adult', 'senior'],
  show: (s) => {
    const p = h(s);
    const home = p.home?.type === 'own' ? s.assets.find((a) => a.id === p.home!.assetId) : undefined;
    return age(s, p) >= 55 && !!home && !p.flags.some((f) => f.startsWith('rm:'));
  },
  run: (s) => {
    const p = h(s);
    const home = s.assets.find((a) => a.id === p.home!.assetId)!;
    const cap = Math.round(170000 * wageIndex(s.year)); // 공시가 12억(시가 약 17억) 한도
    const annual = Math.round(Math.min(home.value, cap) * reverseMortgageRate(age(s, p)));
    p.flags.push(`rm:${home.id}:${annual}`);
    (home.tags ??= []).push('주택연금');
    return `${home.name}(시세 ${formatMoney(home.value)})로 주택연금에 가입했다. 평생 연 ${formatMoney(annual)}(월 ${formatMoney(Math.round(annual / 12))})을 받는다.\n집은 그대로 살고, 받은 돈과 이자는 나중에 집값에서 정산된다.`;
  },
});

/** 학점 표시 (흔적 'gpa'로 4.5 만점 환산) */
export function gpaLabel(p: Person): string {
  const v = clamp(3.0 + markOf(p, 'gpa') * 0.15, 1.5, 4.5);
  return v.toFixed(2);
}

// 어릴 때 하는 기본 활동도 분야가 있다
for (const [id, f] of Object.entries({ kid_sport: 'sport', kid_art: 'media', kid_book: 'edu', kid_game: 'tech', teen_club: 'media', u_intern: 'office', u_club: 'public' })) {
  const a = ACTIONS.find((x) => x.id === id);
  if (a) a.fit = f;
}

// 부모가 자녀의 적성에 맞는 체험을 골라 보내 준다
ACTIONS.push({
  id: 'kid_explore',
  cat: '자녀 교육',
  icon: '💡',
  name: '적성 맞춤 직업 체험',
  desc: '아이 성향에 가장 잘 맞는 분야로 체험학습을 보낸다 · 그 분야 관심↑ 행복↑',
  ap: 1,
  cost: 50,
  targets: (s) => Object.values(s.people).filter((p) => alive(p) && isDescendantOf(s, p, h(s)) && age(s, p) >= 7 && age(s, p) <= 18),
  run: (s, t) => {
    const p = t!;
    const f = fitCats(p, 3);
    const cat = f.length ? f[Math.floor(next(s) * Math.min(2, f.length))] : 'office';
    const name = JOB_CATS[cat as keyof typeof JOB_CATS];
    const tier = rollTier(s, p, { stat: 'cha' });
    const g = { great: 3, good: 2, meh: 1, bad: 1 }[tier];
    mark(p, 'i:' + cat, g);
    p.happiness = clamp(p.happiness + g * 2, 0, 100);
    const place: Record<string, string> = { office: '증권사·은행', public: '소방서·구청', medical: '대학병원', legal: '법원 모의재판', tech: '반도체 연구소', edu: '초등학교 보조교사', service: '호텔 주방', trade: '자동차 정비소', transport: '공항 관제탑', media: '방송국 스튜디오', sport: '프로 구단 훈련장', biz: '스타트업 사무실', farm: '스마트팜' };
    return `${TIER_MARK[tier]}${fullName(p)}이(가) ${place[cat] ?? name} 체험을 다녀왔다. ${tier === 'great' ? '눈이 반짝반짝. "나 이거 할래!"' : tier === 'bad' ? '생각보다 지루했단다. 그래도 경험은 남는다.' : '재밌었다며 이야기를 쏟아낸다.'}${fmt([`${name.split(' ')[0]} 관심 +${g}`, ['행복', g * 2]])}`;
  },
});
