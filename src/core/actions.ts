// 주도적 행동: 턴을 넘기기 전에 대시보드에서 직접 하는 일. 해마다 행동력 3.
// (갑작스러운 사건·선택형 이벤트는 턴을 넘길 때 일어난다)

import { chance, int } from './rng';
import { JOBS } from './data';
import { formatMoney, jobTitle, pay, statScore } from './economy';
import { makeDate } from './events';
import { iga, schedule, spendable, wa } from './ev-util';
import { addFlag, age, alive, check, clamp, discoverTalent, fullName, hasFlag, head, householder, isDescendantOf, mark, markOf, parentsOf, relationLabel, spouseOf } from './people';
import { startDating } from './romance';
import { TALENTS } from './data';
import type { GameState, Person } from './types';

export const AP_PER_YEAR = 3;

export type ActionCat = '가족' | '진로·자기계발' | '자녀 교육' | '재산' | '사회';

export interface ActionDef {
  id: string;
  cat: ActionCat;
  icon: string;
  name: string;
  desc: string;
  ap: number;
  cost?: number;
  /** 가주 나이 조건: kid(20세 미만)·adult(20세 이상)·any. 기본 adult */
  who?: 'kid' | 'adult' | 'any';
  /** 대상이 필요하면 후보 목록 */
  targets?: (s: GameState) => Person[];
  /** 할 수 없으면 이유 */
  blocked?: (s: GameState, t?: Person) => string | undefined;
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
    name: '공부 계획 세우기',
    desc: '성적↑ · 공부 습관이 쌓인다',
    ap: 1,
    who: 'kid',
    blocked: (s) => (age(s, h(s)) < 8 ? '여덟 살부터' : undefined),
    run: (s) => {
      const me = h(s);
      me.study = clamp((me.study ?? 20) + 2 + markOf(me, 'study') * 0.3, 0, 100);
      mark(me, 'study', 1);
      return '계획표를 벽에 붙였다. 생각보다 잘 지키고 있다.';
    },
  },
  {
    id: 'kid_play',
    cat: '가족',
    icon: '⚽',
    name: '친구들과 놀기',
    desc: '행복↑ 매력↑',
    ap: 1,
    who: 'kid',
    run: (s) => {
      const me = h(s);
      mood(me, 10);
      me.actual.cha = clamp(me.actual.cha + 1, 0, 100);
      mark(me, 'network', 1);
      return '해가 질 때까지 놀았다. 친구가 한 명 더 생겼다.';
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
      me.actual.str = clamp(me.actual.str + 2, 0, Math.max(me.potential.str, me.actual.str));
      mark(me, 'sport', 1);
      return '땀을 뻘뻘 흘렸다. 몸이 가볍다.';
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
      me.actual.cha = clamp(me.actual.cha + 2, 0, Math.max(me.potential.cha, me.actual.cha));
      mark(me, 'art', 1);
      return '스케치북 한 권을 다 채웠다.';
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
      for (const p of parentsOf(s, me).filter(alive)) p.affinity = clamp(p.affinity + 6, -100, 100);
      me.actual.mor = clamp(me.actual.mor + 2, 0, 100);
      mark(me, 'warmth', 1);
      mark(me, 'filial', 1);
      return '설거지를 했더니 엄마가 꼭 안아줬다.';
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
      me.cash += 30 + age(s, me) * 5;
      mark(me, 'thrift', 1);
      return '저금통이 묵직해졌다.';
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
      bond(s, me, 8);
      mark(me, 'family', 1);
      for (const k of minors(s)) {
        mark(k, 'warmth', 1);
        mood(k, 8);
      }
      mood(me, 8);
      return '온 가족이 제주도에 다녀왔다. 사진첩이 한 권 늘었다.';
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
    run: (s) => {
      bond(s, h(s), 7);
      mark(h(s), 'family', 1);
      return '오랜만에 둘만의 저녁. 연애 시절 이야기로 웃었다.';
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
      p.affinity = clamp(p.affinity + 10, -100, 100);
      mood(p, 8);
      mark(h(s), 'filial', 1);
      return `${relationLabel(s, p)}께 용돈을 드리고 말벗이 되어드렸다.`;
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
      mark(p, 'warmth', 1);
      p.study = clamp((p.study ?? 20) + 1, 0, 100);
      for (const par of parentsOf(s, p)) par.affinity = clamp(par.affinity + 4, -100, 100);
      h(s).actual.hp = clamp(h(s).actual.hp - 1, 0, 100);
      return `${wa(fullName(p))} 하루 종일 놀아줬다. 허리는 아프지만 행복하다.`;
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
      p.job = 'none';
      p.jobLevel = 0;
      p.jobYears = 0;
      p.flags = p.flags.filter((f) => !f.startsWith('prep:') && !f.startsWith('tries:'));
      queueEv(s, 'first_job', p.id, { second: true });
      return `${fullName(p)}, ${was} 생활을 정리했다. 이제 뭘 해볼까?`;
    },
  },
  {
    id: 'job_hop',
    cat: '진로·자기계발',
    icon: '📈',
    name: '이직 시도',
    desc: '더 좋은 조건으로 옮긴다 (능력·인맥 판정)',
    ap: 1,
    targets: (s) => adultsOfLine(s).filter((p) => JOBS[p.job].kind === 'salary' && p.jobLevel < JOBS[p.job].maxLevel),
    run: (s, t) => {
      const p = t!;
      const sc = statScore(p, JOBS[p.job].stats ?? { int: 1 }) + Math.min(10, markOf(p, 'network') * 2);
      mark(p, 'network', 1);
      if (check(s, sc, 45 + p.jobLevel * 6, 8)) {
        p.jobLevel++;
        return `헤드헌터를 통해 옮겼다. ${jobTitle(p)}(으)로 한 단계 올라갔다!`;
      }
      mood(p, -4);
      return '서류에서 떨어졌다. 지금 회사에 조용히 남기로 했다.';
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
      me.actual.int = clamp(me.actual.int + 2, 0, Math.max(me.potential.int, me.actual.int));
      mark(me, 'study', 1);
      return '퇴근 후 도서관에 다녔다. 머리가 맑아진다.';
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
    run: (_s, t) => {
      const p = t!;
      p.actual.hp = clamp(p.actual.hp + 3, 0, Math.max(p.potential.hp, p.actual.hp));
      p.actual.str = clamp(p.actual.str + 1, 0, 100);
      mark(p, 'exercise', 1);
      mark(p, 'health_x', -1);
      return `${fullName(p)}, 헬스장에 등록했다. 계단 오르기가 덜 힘들다.`;
    },
  },
  {
    id: 'checkup',
    cat: '진로·자기계발',
    icon: '🩺',
    name: '종합검진',
    desc: '2년간 암을 조기에 발견할 수 있다',
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
    run: (_s, t) => {
      const p = t!;
      p.study = clamp((p.study ?? 30) + 3, 0, 100);
      p.eduSpent = (p.eduSpent ?? 0) + 500;
      mood(p, -4);
      mark(p, 'study', 1);
      if (p.happiness < 30) mark(p, 'hurt', 1);
      return `${fullName(p)}의 주말이 학원으로 채워졌다.`;
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
    desc: '발품을 팔면 싼 매물이 나올 수도',
    ap: 1,
    run: (s) => {
      if (!chance(s, 0.55)) return '며칠을 돌아다녔지만 마땅한 매물이 없었다.';
      const pick = spendable(s) > s.market.apt_seoul * 0.4 && chance(s, 0.6) ? 'r_bargain' : 'r_land';
      queueEv(s, pick, s.headId);
      return '괜찮은 매물을 찾았다!';
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
      me.actual.mor = clamp(me.actual.mor + 2, 0, 100);
      mark(me, 'kind', 1);
      s.fame += 0.5;
      mood(me, 5);
      return '연탄 배달 봉사를 했다. 얼굴은 까맣지만 마음은 환하다.';
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
      me.actual.cha = clamp(me.actual.cha + 1, 0, 100);
      mark(me, 'network', 1);
      if (chance(s, 0.2)) {
        queueEv(s, 'r_stock_tip', me.id);
        return '모임에서 솔깃한 정보를 들었다.';
      }
      return '명함이 한 뭉치 늘었다.';
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
  if (!forHead(s, a)) return { ok: false, text: '지금 나이에는 할 수 없다' };
  if (apLeft(s) < a.ap) return { ok: false, text: '올해 행동력을 다 썼다. 다음 해로 넘기자.' };
  const t = targetId ? s.people[targetId] : undefined;
  if (a.targets && (!t || !a.targets(s).includes(t))) return { ok: false, text: '대상을 골라주세요' };
  const why = a.blocked?.(s, t);
  if (why) return { ok: false, text: why };
  if (a.cost && spendable(s) < a.cost) return { ok: false, text: '돈이 부족하다' };
  if (a.cost) pay(s, householder(s), a.cost);
  s.ap = apLeft(s) - a.ap;
  const text = a.run(s, t);
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
