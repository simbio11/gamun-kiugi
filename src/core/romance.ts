// 연애: 만남 → 사귐(해마다 일이 생긴다) → 프러포즈 → 상견례·결혼식·신혼집 → 결혼.
// 어느 단계에서든 헤어질 수 있다. 연애가 곧 결혼은 아니다.

import { chance, int, next, normal, pick } from './rng';
import { addAsset, formatMoney, pay, personWorth } from './economy';
import { wageIndex } from './pay';
import { agePenalty, appeal, desirability, jobless, makeDate, marry, suitorLine } from './events';
import { eul, eun, gate, iga, queueNext, schedule, wa, who, type Choice, type Ctx, type EventDef } from './ev-util';
import { coverTax, nestOf } from './nest';
import { homeOf, moveInto, moveIntoOwned, moveTo } from './housing';
import { isHouse, mortgageFromCash } from './realty';
import { addFlag, age, alive, check, clamp, fullName, hasFlag, hasTrait, head, householder, isMainline, mark, parentsOf, relationLabel } from './people';
import type { GameState, Person } from './types';
import { deliver, setBond, type LifeDef } from './life';
import { KIN_NAME, kinGap, kinOf, ourKin } from './inlaws';

// ───────────────────────── 기본 동작 ─────────────────────────

export const partnerOf = (s: GameState, p: Person): Person | undefined => (p.partnerId ? s.people[p.partnerId] : undefined);
const datingYears = (s: GameState, p: Person) => s.year - Number(p.flags.find((f) => f.startsWith('dating_since:'))?.slice(13) ?? s.year);
const love = (p: Person) => p.bond ?? 50;
const setLove = (p: Person, q: Person, v: number) => (p.bond = q.bond = clamp(Math.round(v), 0, 100));
const mood = (p: Person, d: number) => (p.happiness = clamp(p.happiness + d, 0, 100));

/** 사귀기 시작 */
export function startDating(s: GameState, p: Person, cand: Person, how: string, arranged = false) {
  cand.inLaw = true;
  addFlag(cand, 'partner');
  s.people[cand.id] = cand;
  p.partnerId = cand.id;
  cand.partnerId = p.id;
  p.flags = p.flags.filter((f) => !f.startsWith('dating_since:'));
  p.flags.push('dating_since:' + s.year);
  if (arranged) addFlag(p, 'arranged');
  else p.flags = p.flags.filter((f) => f !== 'arranged');
  setLove(p, cand, 48 + normal(s, 0, 10) + (hasTrait(p, 'devoted') ? 8 : 0) + (arranged ? -8 : 0));
  mood(p, 10);
  s.log.push({ year: s.year, text: `💕 ${fullName(p)}, ${wa(fullName(cand))} 연애 시작 (${how})`, kind: 'life' });
}

/** 이별. 상대는 아이가 없으면 가계에서 사라진다 */
export function breakUp(s: GameState, p: Person, why: string, mine = true) {
  const q = partnerOf(s, p);
  p.partnerId = undefined;
  p.flags = p.flags.filter((f) => !f.startsWith('dating_since:') && f !== 'arranged' && f !== 'cohabit');
  const exes = Number(p.flags.find((f) => f.startsWith('exes:'))?.slice(5) ?? 0) + 1;
  p.flags = p.flags.filter((f) => !f.startsWith('exes:'));
  p.flags.push('exes:' + exes);
  mood(p, mine ? -6 : -14);
  mark(p, 'scar', mine ? 1 : 2);
  if (q) {
    q.partnerId = undefined;
    q.flags = q.flags.filter((f) => f !== 'partner');
    if (!q.childIds.length) delete s.people[q.id];
    else addFlag(q, 'ex_partner');
    if (chance(s, 0.3)) schedule(s, int(s, 3, 9), 'ex_news', p.id, { name: fullName(q) });
    s.log.push({ year: s.year, text: `💔 ${fullName(p)}·${fullName(q)} 이별 (${why})`, kind: 'life' });
  }
}

/** 사귈 수 있을까 (결혼보다 훨씬 쉽다) */
function canDate(s: GameState, p: Person, cand: Person): boolean {
  return check(s, appeal(s, p) + 12 - agePenalty(age(s, p)) * 0.5, desirability(cand), 11);
}

/** 프러포즈 승낙: 사랑 + 조건 + 나이 */
function acceptsProposal(s: GameState, p: Person, q: Person): boolean {
  const years = datingYears(s, p);
  const score = love(p) * 0.6 + appeal(s, p) * 0.4 + Math.min(10, years * 3) + (hasFlag(p, 'arranged') ? 8 : 0) - agePenalty(age(s, p)) * 0.6 - (jobless(p) ? 12 : 0);
  return check(s, score, desirability(q) * 0.5 + 24, 9);
}

// ───────────────────────── 만남 ─────────────────────────

const WAYS = ['동아리에서', '회사에서', '친구 소개로', '소개팅 앱에서', '여행지에서', '동호회에서', '헬스장에서', '교회에서', '결혼식 뒤풀이에서', '단골 카페에서'];

const meet: LifeDef = {
  id: 'meet',
  weight: (s, p) => {
    if (p.inLaw || p.partnerId || hasFlag(p, 'single_life') || (p.spouseId && alive(s.people[p.spouseId])) || p.flags.some((f) => f.startsWith('serving:'))) return 0;
    const a = age(s, p);
    return a < 19 ? 0 : a < 30 ? 0.14 : a < 40 ? 0.09 : a < 50 ? 0.04 : a < 65 ? 0.015 : 0;
  },
  title: () => '새로운 인연',
  portraits: (c) => [c.p, c.ev.data.cand],
  text: (c) => {
    c.ev.data ??= { cand: makeDate(c.s, c.p), way: pick(c.s, age(c.s, c.p) < 24 ? WAYS.slice(0, 5) : WAYS) };
    return `${who(c)}, ${c.ev.data.way} 마음이 가는 사람을 만났다.\n${suitorLine(c.ev.data.cand, c.s)}`;
  },
  choices: () => [
    {
      label: '고백한다',
      run: (x) => {
        const cand: Person = x.ev.data.cand;
        if (canDate(x.s, x.p, cand)) {
          startDating(x.s, x.p, cand, x.ev.data.way.replace('에서', '').replace('으로', ''));
          return `💕 "나도 좋아." ${iga(fullName(cand))} 수줍게 웃었다. 연애 시작!`;
        }
        mood(x.p, -8);
        return `"좋은 친구로 지내요." 고백은 실패했다.`;
      },
    },
    { label: '마음만 간직한다', run: () => '인연이 아니었나 보다.' },
  ],
};

// ───────────────────────── 해마다 연애 ─────────────────────────

type Situ = 'sweet' | 'fight' | 'boredom' | 'longdist' | 'pressure' | 'cheat_me' | 'cheat_them' | 'pregnant' | 'they_propose' | 'cohabit' | 'dumped' | 'money' | 'parents_meet' | 'ex_contact' | 'friends_meet' | 'sick_partner' | 'abroad_offer' | 'anniversary';

function rollSituation(s: GameState, p: Person, q: Person): Situ {
  const y = datingYears(s, p);
  const a = age(s, p);
  if (love(p) < 22 && chance(s, 0.6)) return 'dumped';
  const pool: [Situ, number][] = [
    ['sweet', 3],
    ['fight', 2],
    ['boredom', y >= 2 ? 2 : 0],
    ['longdist', 0.6],
    ['pressure', age(s, q) >= 30 && y >= 2 && !hasFlag(p, 'arranged') ? 2.5 : 0],
    ['cheat_me', hasTrait(p, 'flirt') ? 1.2 : 0.1],
    ['cheat_them', hasTrait(q, 'flirt') ? 1.2 : 0.15],
    ['pregnant', y >= 1 && a <= 42 ? (hasFlag(p, 'cohabit') ? 0.7 : 0.35) : 0],
    ['they_propose', love(p) >= 65 && y >= 2 ? 1.5 : 0],
    ['cohabit', y >= 1 && !hasFlag(p, 'cohabit') && a >= 23 ? 0.8 : 0],
    ['money', 0.6],
    ['parents_meet', y >= 1 && !hasFlag(p, 'met_parents') && parentsOf(s, p).some(alive) ? 1 : 0],
    ['ex_contact', 0.5],
    ['friends_meet', y <= 1 ? 1 : 0.3],
    ['sick_partner', age(s, q) >= 28 ? 0.35 : 0.15],
    ['abroad_offer', age(s, q) >= 26 && age(s, q) <= 40 ? 0.35 : 0],
    ['anniversary', y >= 1 ? 1.2 : 0.4],
  ];
  let x = next(s) * pool.reduce((t, [, w]) => t + w, 0);
  for (const [k, w] of pool) if ((x -= w) <= 0 && w > 0) return k;
  return 'sweet';
}

const SITU_TEXT: Record<Situ, ((c: Ctx, q: Person) => string)[]> = {
  sweet: [
    (c, q) => `${wa(fullName(q))} 벚꽃 구경, 바다 여행… 요즘 ${who(c)}의 하루가 반짝인다.`,
    (_c, q) => `${wa(fullName(q))} 첫 캠핑. 모닥불 앞에서 밤새 얘기했다.`,
    (_c, q) => `${iga(fullName(q))} 퇴근길에 좋아하는 붕어빵을 사 들고 기다리고 있었다.`,
    (_c, q) => `${wa(fullName(q))} 같이 요리를 하다 부엌이 난장판이 됐다. 그래도 웃겼다.`,
  ],
  fight: [
    (_c, q) => `사소한 일로 ${wa(fullName(q))} 크게 싸웠다. 며칠째 연락이 없다.`,
    (_c, q) => `"왜 답장이 세 시간이나 걸려?" 연락 문제로 ${wa(fullName(q))} 또 다퉜다.`,
    (_c, q) => `데이트 비용을 누가 더 내느냐로 ${wa(fullName(q))} 언성이 높아졌다.`,
    (_c, q) => `${fullName(q)}의 친구 모임에 안 갔다고 서운하단다. 말다툼이 길어졌다.`,
  ],
  boredom: [
    (_c, q) => `${wa(fullName(q))} 만난 지 오래. 설렘이 예전 같지 않다. 권태기인가.`,
    (_c, q) => `${wa(fullName(q))} 만나면 휴대폰만 본다. 대화가 줄었다.`,
    (_c, q) => `주말 데이트가 늘 똑같다. 영화, 밥, 카페. ${fullName(q)}도 하품을 한다.`,
  ],
  longdist: [
    (_c, q) => `${iga(fullName(q))} 지방으로 발령이 났다. 주말에만 볼 수 있다.`,
    (_c, q) => `${iga(fullName(q))} 부산 지사로 옮기게 됐다. KTX로 2시간 반.`,
  ],
  pressure: [(_c, q) => `${fullName(q)}: "우리 나이도 있는데… 결혼 생각은 있는 거지?" 대답을 기다린다.`, (_c, q) => `친구 결혼식에 다녀온 ${fullName(q)}의 말수가 적다. "우리는 언제?"`],
  cheat_me: [(c) => `${who(c)}, 요즘 자꾸 다른 사람이 눈에 들어온다.`, (c) => `회사 동기가 ${who(c)}에게 부쩍 연락을 한다. 싫지 않다.`],
  cheat_them: [(_c, q) => `${fullName(q)}의 휴대폰에 낯선 이름이 자주 뜬다. 뭔가 이상하다.`, (_c, q) => `${iga(fullName(q))} 요즘 야근이 잦다고 한다. 그런데 회사 불은 꺼져 있었다.`],
  pregnant: [(_c, q) => `${fullName(q)}에게서 떨리는 목소리로 전화가 왔다. "…나 임신했어."`],
  they_propose: [(_c, q) => `${iga(fullName(q))} 무릎을 꿇고 반지를 내밀었다! "나랑 결혼해 줄래?"`, (_c, q) => `여행지 노을 앞에서 ${iga(fullName(q))} 떨리는 손으로 반지 상자를 열었다.`],
  cohabit: [(_c, q) => `${fullName(q)}: "우리 같이 살아볼까? 월세도 아끼고."`],
  dumped: [(_c, q) => `${fullName(q)}: "우리 그만하자. 나 많이 지쳤어."`, (_c, q) => `${fullName(q)}: "생각할 시간이 필요해." 그 뒤로 연락이 뜸하다.`],
  money: [(_c, q) => `${iga(fullName(q))} 급하게 돈이 필요하다며 곤란한 얼굴이다.`],
  parents_meet: [(c, q) => `${who(c)}의 부모님이 ${eul(fullName(q))} 한번 보자고 하신다.`],
  ex_contact: [(c) => `새벽 2시, ${who(c)}의 휴대폰에 전 애인의 메시지가 왔다. "자니…?"`, (c) => `${who(c)}의 전 애인이 결혼한다는 소식이 들렸다. 청첩장이 왔다.`],
  friends_meet: [(_c, q) => `${fullName(q)}의 친구들이 한번 보자고 한다. 사실상 면접이다.`],
  sick_partner: [(_c, q) => `${iga(fullName(q))} 갑자기 쓰러져 병원에 실려 갔다. 수술을 받아야 한단다.`],
  abroad_offer: [(_c, q) => `${fullName(q)}에게 해외 지사 발령 제안이 왔다. 3년이다. "같이 갈래?"`],
  anniversary: [(_c, q) => `${wa(fullName(q))}의 1000일이 다가온다. 뭘 해야 할까?`, (_c, q) => `${fullName(q)}의 생일이다. 작년 선물은 반응이 영 별로였다.`],
};

const datingYear: EventDef = {
  id: 'dating_year',
  valid: (c) => !!partnerOf(c.s, c.p) && alive(partnerOf(c.s, c.p)!),
  title: (c) => `연애 ${datingYears(c.s, c.p) + 1}년 차`,
  portraits: (c) => [c.p, partnerOf(c.s, c.p)!],
  text: (c) => {
    const q = partnerOf(c.s, c.p)!;
    c.ev.data ??= { situ: rollSituation(c.s, c.p, q) };
    const l = love(c.p);
    const texts = SITU_TEXT[c.ev.data.situ as Situ];
    return texts[c.ev.uid % texts.length](c, q) + `\n(애정 ${l >= 75 ? '💞' : l >= 50 ? '❤' : l >= 30 ? '💛' : '💔'} ${l})`;
  },
  choices: (c) => {
    const q = partnerOf(c.s, c.p)!;
    const situ = c.ev.data.situ as Situ;
    const y = datingYears(c.s, c.p);
    const bump = (d: number, text: string) => (x: Ctx) => (setLove(x.p, q, love(x.p) + d), text);
    const propose: Choice = {
      label: '💍 프러포즈한다',
      req: ['애정·조건·나이', ...(jobless(c.p) ? ['무직 불리'] : [])],
      disabled: y < 1 && !hasFlag(c.p, 'arranged'),
      run: (x) => {
        if (acceptsProposal(x.s, x.p, q)) {
          queueNext(x.s, 'wedding', x.p.id);
          mood(x.p, 12);
          return `💍 "응!" ${iga(fullName(q))} 울면서 반지를 받았다. 이제 결혼 준비다.`;
        }
        setLove(x.p, q, love(x.p) - 12);
        mood(x.p, -8);
        if (chance(x.s, 0.35)) {
          breakUp(x.s, x.p, '프러포즈 거절', false);
          return `"…아직 모르겠어." 그 뒤로 사이가 틀어졌고, 결국 헤어졌다.`;
        }
        return `"조금만 더 생각해 볼게." 어색한 침묵이 흘렀다.`;
      },
    };
    const keep: Choice = { label: '지금처럼 만난다', run: bump(2, '천천히 가기로 했다.') };
    const leave: Choice = { label: '헤어진다', run: (x) => (breakUp(x.s, x.p, '내가 이별 통보'), '짧지 않은 인연이 끝났다.') };

    switch (situ) {
      case 'dumped':
        return [
          {
            label: '붙잡는다',
            run: (x) => {
              if (check(x.s, appeal(x.s, x.p) + love(x.p), 70, 10)) {
                setLove(x.p, q, love(x.p) + 20);
                return '밤새 편지를 썼다. 다시 한번 해보기로 했다.';
              }
              breakUp(x.s, x.p, '차였다', false);
              return '돌아서는 뒷모습을 잡지 못했다.';
            },
          },
          { label: '보내준다', run: (x) => (breakUp(x.s, x.p, '차였다', false), '"행복해." 그게 마지막 인사였다.') },
        ];
      case 'pressure':
        return [
          propose,
          {
            label: '아직 결혼은 이르다고 한다',
            run: (x) => {
              if (chance(x.s, 0.5)) {
                breakUp(x.s, x.p, '결혼관 차이', false);
                return `"나는 더 못 기다려." ${iga(fullName(q))} 떠났다.`;
              }
              setLove(x.p, q, love(x.p) - 15);
              return '서운한 기색이 역력하다. 1년만 더 기다려 주기로 했다.';
            },
          },
          leave,
        ];
      case 'they_propose':
        return [
          { label: '좋아! 결혼하자', run: (x) => (queueNext(x.s, 'wedding', x.p.id), mood(x.p, 12), '💍 반지를 끼웠다. 결혼 준비 시작!') },
          { label: '아직은… 미안해', run: (x) => (chance(x.s, 0.4) ? (breakUp(x.s, x.p, '프러포즈를 거절', true), '상처받은 상대가 이별을 고했다.') : (setLove(x.p, q, love(x.p) - 15), '어색한 공기가 오래 남았다.')) },
        ];
      case 'pregnant':
        return [
          {
            label: '책임진다 — 결혼하자',
            run: (x) => {
              addFlag(x.p, 'shotgun');
              queueNext(x.s, 'wedding', x.p.id, { baby: true });
              return '속도위반 결혼이다. 양가 부모님이 놀라셨다.';
            },
          },
          {
            label: '헤어지되 아이는 키운다',
            run: (x) => {
              const dad = x.p.sex === 'M' ? x.p : q;
              const mom = x.p.sex === 'F' ? x.p : q;
              deliver(x.s, dad, mom, x.p.inLaw ? q.surname : x.p.surname, 0.015);
              addFlag(x.p, 'single_parent');
              breakUp(x.s, x.p, '미혼 출산', true);
              x.s.fame = Math.max(0, x.s.fame - 2);
              return '혼자 아이를 키우기로 했다. 쉽지 않은 길이다.';
            },
          },
          { label: '헤어진다', run: (x) => (breakUp(x.s, x.p, '임신 후 이별', true), mood(x.p, -15), '서로에게 깊은 상처가 남았다.') },
        ];
      case 'cheat_me':
        return [
          { label: '마음을 다잡는다', run: (x) => ((x.p.actual.mor = clamp(x.p.actual.mor + 2, 0, 100)), '한눈팔지 않기로 했다.') },
          {
            label: '몰래 만나본다',
            run: (x) => {
              if (chance(x.s, 0.5)) {
                mark(x.p, 'cheat', 1);
                breakUp(x.s, x.p, '바람이 들킴', true);
                return '들켰다. 뺨을 맞고 차였다.';
              }
              setLove(x.p, q, love(x.p) - 10);
              return '아직은 들키지 않았다. 마음이 불편하다.';
            },
          },
          { label: '환승이별한다', run: (x) => (breakUp(x.s, x.p, '환승이별', true), (x.p.actual.mor = clamp(x.p.actual.mor - 3, 0, 100)), '새 사람에게 가려고 이별을 고했다.') },
        ];
      case 'cheat_them':
        return [
          { label: '모른 척한다', run: bump(-8, '의심이 마음속에서 자란다.') },
          {
            label: '따져 묻는다',
            run: (x) => {
              if (chance(x.s, hasTrait(q, 'flirt') ? 0.7 : 0.3)) {
                breakUp(x.s, x.p, '상대의 바람', false);
                return '바람이 맞았다. 그날로 끝냈다.';
              }
              setLove(x.p, q, love(x.p) - 5);
              return '오해였다. 서로 사과했다.';
            },
          },
        ];
      case 'cohabit':
        return [
          {
            label: '같이 산다',
            run: (x) => {
              addFlag(x.p, 'cohabit');
              setLove(x.p, q, love(x.p) + 8);
              for (const par of parentsOf(x.s, x.p).filter(alive)) par.affinity = clamp(par.affinity - 8, -100, 100);
              return '작은 원룸에 살림을 합쳤다. 부모님은 아직 모르신다(?)';
            },
          },
          { label: '결혼 전엔 안 된다', run: bump(-4, '"그래, 알았어." 조금 서운해 보인다.') },
          propose,
        ];
      case 'money':
        return gate(c.s, [
          { label: '1천만원 빌려준다', cost: 1000, run: (x) => (setLove(x.p, q, love(x.p) + 6), chance(x.s, 0.7) ? ((x.p.cash += 1000), '몇 달 뒤 고맙다며 갚았다.') : '갚을 생각이 없는 것 같다…') },
          { label: '돈 문제는 선을 긋는다', run: bump(-6, '"치사하다" 소리를 들었다.') },
          keep,
        ]);
      case 'parents_meet':
        return [
          {
            label: '부모님께 인사시킨다',
            run: (x) => {
              addFlag(x.p, 'met_parents');
              const obj = parentsObjection(x.s, x.p, q);
              if (obj) {
                setLove(x.p, q, love(x.p) - 6);
                return `부모님의 표정이 굳었다. "${obj}" 반대가 심하다.`;
              }
              setLove(x.p, q, love(x.p) + 6);
              return '부모님이 마음에 들어 하셨다! "언제 결혼할 거니?"';
            },
          },
          { label: '아직 이르다', run: () => '다음에 인사드리기로 했다.' },
        ];
      case 'sweet':
        return gate(c.s, [
          { label: '커플 여행을 간다 (제주·일본)', cost: 200, run: (x) => (setLove(x.p, q, love(x.p) + 12), mood(x.p, 8), pick(x.s, ['제주 올레길을 걸었다. 사진첩이 둘 얼굴로 가득하다.', '오사카에서 길을 잃었는데, 그래서 더 재밌었다.'])) },
          propose,
          { label: '지금처럼 소소하게', run: bump(6, '특별한 건 없지만 좋다. 이게 행복인가 보다.') },
        ]);
      case 'fight':
        return [
          {
            label: '먼저 사과한다',
            run: (x) => (check(x.s, x.p.actual.mor, 45, 10) ? (setLove(x.p, q, love(x.p) + 6), '"나도 미안해." 싸우고 나니 더 가까워졌다.') : (setLove(x.p, q, love(x.p) - 4), '사과했는데 "뭘 잘못했는지는 알아?"라는 말이 돌아왔다.')),
          },
          { label: '시간을 갖자고 한다', run: (x) => (chance(x.s, 0.6) ? (setLove(x.p, q, love(x.p) - 2), '일주일 뒤, 아무 일 없었다는 듯 다시 만났다.') : (breakUp(x.s, x.p, '냉전 끝에 이별', false), '시간을 갖다 보니 마음도 멀어졌다. 결국 헤어졌다.')) },
          { label: '이번엔 내가 옳다, 버틴다', run: (x) => (chance(x.s, 0.3) ? (breakUp(x.s, x.p, '자존심 싸움', false), '누구도 먼저 연락하지 않았다. 그렇게 끝났다.') : (setLove(x.p, q, love(x.p) - 10), mood(x.p, -3), '결국 상대가 먼저 연락했다. 앙금은 남았다.')) },
          leave,
        ];
      case 'boredom':
        return gate(c.s, [
          { label: '같이 새로운 걸 배운다 (원데이 클래스)', cost: 30, run: (x) => (setLove(x.p, q, love(x.p) + 10), pick(x.s, ['도자기 공방에서 삐뚤빼뚤한 컵을 만들었다. 설렘이 조금 돌아왔다.', '둘이 클라이밍을 시작했다. 서로 응원하는 게 새롭다.'])) },
          { label: '잠시 거리를 둔다', run: (x) => (chance(x.s, 0.5) ? (setLove(x.p, q, love(x.p) + 5), '떨어져 있으니 소중함을 알았다.') : (setLove(x.p, q, love(x.p) - 10), '거리를 두니 정말 멀어졌다.')) },
          propose,
          leave,
        ]);
      case 'longdist':
        return gate(c.s, [
          { label: '주말마다 KTX 탄다', cost: 250, run: (x) => (setLove(x.p, q, love(x.p) + 6), mood(x.p, -2), '금요일 밤 기차가 일상이 됐다. 통장은 가벼워졌지만 마음은 채워진다.') },
          { label: '영상통화로 버틴다', run: (x) => (check(x.s, x.p.actual.mor, 50, 10) ? (setLove(x.p, q, love(x.p) + 2), '매일 밤 영상통화. 잠든 얼굴까지 봤다.') : (setLove(x.p, q, love(x.p) - 12), '통화가 점점 짧아진다.')) },
          propose,
          leave,
        ]);
      case 'ex_contact':
        return [
          { label: '차단한다', run: (x) => (setLove(x.p, q, love(x.p) + 3), (x.p.actual.mor = clamp(x.p.actual.mor + 1, 0, 100)), '미련 없이 차단했다. 지금 사람이 더 소중하다.') },
          { label: '지금 애인에게 솔직히 말한다', run: (x) => (chance(x.s, 0.7) ? (setLove(x.p, q, love(x.p) + 6), '"말해 줘서 고마워." 오히려 믿음이 생겼다.') : (setLove(x.p, q, love(x.p) - 6), '"아직 연락하는 사이야?" 괜히 긁어 부스럼이 됐다.')) },
          { label: '답장한다', run: (x) => (chance(x.s, 0.4) ? (breakUp(x.s, x.p, '전 애인 문제', true), mark(x.p, 'cheat', 1), '들켰다. "우리 끝이야."') : (setLove(x.p, q, love(x.p) - 5), '짧게 안부만 나눴다. 마음 한쪽이 찜찜하다.')) },
        ];
      case 'friends_meet':
        return gate(c.s, [
          { label: '맛있는 걸 쏜다', cost: 30, run: (x) => (check(x.s, appeal(x.s, x.p), 45, 12) ? (setLove(x.p, q, love(x.p) + 8), '친구들이 "괜찮은 사람이네" 하고 합격 도장을 찍었다.') : (setLove(x.p, q, love(x.p) - 3), '분위기가 어색했다. 친구 하나가 계속 떠봤다.')) },
          { label: '편하게 나간다', run: (x) => (check(x.s, x.p.actual.cha, 45, 12) ? (setLove(x.p, q, love(x.p) + 5), '금세 친해져 새벽까지 수다를 떨었다.') : (setLove(x.p, q, love(x.p) - 5), '말실수를 했다. 돌아오는 길이 조용했다.')) },
          { label: '아직 부담스럽다', run: bump(-4, '"나를 소개하기 싫은 거야?" 서운해한다.') },
        ]);
      case 'sick_partner':
        return gate(c.s, [
          { label: '병원에서 곁을 지킨다', run: (x) => (setLove(x.p, q, love(x.p) + 15), mood(x.p, -3), '회사에 연차를 내고 보호자 침대에서 잤다. 수술은 잘 끝났다. "고마워."') },
          { label: '병원비를 보탠다', cost: 300, run: (x) => (setLove(x.p, q, love(x.p) + 10), '보험이 안 되는 검사비를 대신 냈다. 상대 부모님이 고마워하셨다.') },
          { label: '바빠서 전화로만', run: bump(-15, '퇴원 날에도 못 갔다. 상대의 눈빛이 달라졌다.') },
        ]);
      case 'abroad_offer':
        return [
          { label: '같이 간다 (결혼하고)', run: (x) => (queueNext(x.s, 'wedding', x.p.id), mood(x.p, 8), '"그래, 가자!" 결혼하고 함께 떠나기로 했다. 결혼 준비가 급해졌다.') },
          { label: '장거리로 기다린다', run: (x) => (chance(x.s, 0.55) ? (setLove(x.p, q, love(x.p) - 5), '시차 속 연애가 시작됐다. 1년에 두 번 만난다.') : (breakUp(x.s, x.p, '해외 발령', false), '3년은 길었다. 공항에서의 포옹이 마지막이었다.')) },
          { label: '가지 말라고 붙잡는다', run: (x) => (chance(x.s, 0.5) ? (setLove(x.p, q, love(x.p) + 4), '상대가 제안을 거절했다. 대신 가끔 그 얘기를 한다.') : (breakUp(x.s, x.p, '해외 발령', false), '"내 커리어야." 결국 떠났다.')) },
        ];
      case 'anniversary':
        return gate(c.s, [
          { label: '명품 선물', cost: 300, run: (x) => (setLove(x.p, q, love(x.p) + (chance(x.s, 0.7) ? 10 : 2)), '포장을 뜯는 손이 떨렸다. 인증샷이 SNS에 올라왔다.') },
          { label: '손편지와 직접 만든 앨범', run: (x) => (check(x.s, x.p.actual.cha, 40, 12) ? (setLove(x.p, q, love(x.p) + 12), '편지를 읽다 울었다. 앨범은 평생 보물이란다.') : (setLove(x.p, q, love(x.p) + 3), '정성은 느껴졌는데 글씨를 못 알아봤다.')) },
          { label: '까먹었다…', run: bump(-12, '자정이 지나서야 알았다. 밤새 사과 문자를 보냈다.') },
          propose,
        ]);
      default: {
        const d = { sweet: 8, fight: -10, boredom: -12, longdist: -8 }[situ as 'sweet'] ?? 0;
        return [
          propose,
          {
            label: d >= 0 ? '행복하다' : '이번에도 잘 넘겨본다',
            run: (x) => {
              setLove(x.p, q, love(x.p) + d + (d < 0 && check(x.s, x.p.actual.mor, 50, 10) ? 8 : 0));
              mood(x.p, d > 0 ? 6 : -3);
              return d >= 0 ? '둘은 여전히 좋다.' : '어떻게든 잘 넘겼다.';
            },
          },
          leave,
        ];
      }
    }
  },
};

/** 부모님이 반대할 이유 (없으면 빈 문자열) */
function parentsObjection(s: GameState, p: Person, q: Person): string {
  const pars = parentsOf(s, p).filter(alive);
  if (!pars.length) return '';
  const ours = pars.reduce((t, x) => t + personWorth(s, x), 0) + s.familyCash;
  if (hasFlag(q, 'divorced') && chance(s, 0.6)) return '이혼한 사람은 안 된다.';
  if (['none', 'parttime'].includes(q.job) && chance(s, 0.6)) return '직업도 없는 사람한테 어떻게 보내니.';
  if (ours > q.cash * 30 && ours > 100000 && chance(s, 0.5)) return '집안이 너무 차이 난다.';
  if (age(s, q) - age(s, p) >= 8 && chance(s, 0.5)) return '나이 차이가 너무 많이 난다.';
  if (pars.some((x) => hasTrait(x, 'anxious')) && chance(s, 0.2)) return '궁합이 안 좋단다.';
  return '';
}

// ───────────────────────── 결혼 준비 ─────────────────────────

const wedding: EventDef = {
  id: 'wedding',
  valid: (c) => !!partnerOf(c.s, c.p),
  title: (c) => ({ undefined: '상견례', ceremony: '결혼식', house: '신혼집' })[c.ev.data?.stage as 'ceremony'] ?? '상견례',
  portraits: (c) => [c.p, partnerOf(c.s, c.p)!],
  text: (c) => {
    const q = partnerOf(c.s, c.p)!;
    c.ev.data ??= {};
    const d = c.ev.data;
    if (d.stage === 'ceremony') return `결혼식을 어떻게 할까? (${wa(fullName(q))} 함께)`;
    if (d.stage === 'house') return '신혼집은 어디로 할까?';
    if (d.obj === undefined) d.obj = hasFlag(c.p, 'shotgun') ? '' : parentsObjection(c.s, c.p, q);
    if (d.clash === undefined) d.clash = chance(c.s, 0.06) ? pick(c.s, ['예단·예물', '신혼집 명의', '제사 문제', '종교']) : '';
    return (
      `양가 부모님이 한자리에 모였다.` +
      (d.obj ? `\n그런데 부모님이 반대하신다. "${d.obj}"` : '\n분위기는 화기애애하다.') +
      (d.clash ? `\n…양가가 ${d.clash} 문제로 크게 부딪혔다.` : '')
    );
  },
  choices: (c) => {
    const d = c.ev.data;
    const q = partnerOf(c.s, c.p)!;
    const next = (stage: string, text = '') => (x: Ctx) => ((x.ev.data.stage = stage), { text, keep: true as const });
    if (d.stage === 'ceremony') {
      const done = (cost: number, text: string, fame = 0, luv = 0) => (x: Ctx) => {
        x.s.fame += fame;
        setLove(x.p, q, love(x.p) + luv);
        x.ev.data.stage = 'house';
        return { text: text + (cost ? ` (${formatMoney(cost)})` : ''), keep: true as const };
      };
      // 2024 듀오 결혼비용 보고서: 신혼집 제외 평균 5,449만 (예식홀 1,283·웨딩패키지 360·혼수 1,564·예단 758·신혼여행 725·예물 673)
      const wi = wageIndex(c.s.year);
      const W = (v: number) => Math.round(v * wi);
      const gift = (x: Ctx, v: number) => {
        x.p.cash += W(v);
        return ` 축의금 ${formatMoney(W(v))}이 들어왔다.`;
      };
      return gate(c.s, [
        { label: '스몰 웨딩 (예식·반지·가까운 여행)', cost: W(1500), run: (x) => done(0, '가까운 사람들만 모여 소박하게 올렸다. 혼수는 쓰던 걸로.' + gift(x, 500), 0, 6)(x) },
        { label: '평범한 결혼 (예식·혼수·예단·예물·신혼여행)', cost: W(5400), run: (x) => done(0, '남들 하는 만큼은 했다. 스드메, 예단, 발리 신혼여행까지.' + gift(x, 1800), 1, 3)(x) },
        { label: '호텔 웨딩', cost: W(12000), run: (x) => done(0, '샹들리에 아래 화려한 결혼식. 하객들이 입을 모아 부러워했다.' + gift(x, 4000), 4, 2)(x) },
        { label: '식은 생략, 혼인신고만', run: done(0, '구청에서 도장 두 개로 끝냈다. 부모님은 서운해하신다.', 0, 0) },
      ]);
    }
    if (d.stage === 'house') {
      // 부모님이 현금으로 집을 사줄 형편인가 (독립 때 이미 크게 받았으면 또 해주진 않는다)
      const hh = parentsOf(c.s, c.p).filter(alive).sort((a, b) => b.cash - a.cash)[0] ?? householder(c.s);
      const parentHelp = hh.id !== c.p.id && isMainline(c.s, hh) && nestOf(c.p) < c.s.market.apt_local * 0.5 && hh.cash >= c.s.market.apt_local;
      const finish = (text: string, home?: (x: Ctx) => string) => (x: Ctx) => {
        marry(x.s, x.p, q);
        // 가주의 신혼집 (방계 결혼은 집 기록 없이)
        if (x.p.id === x.s.headId) {
          const h = home?.(x);
          if (h) text += '\n' + h;
        }
        if (x.ev.data.baby) deliver(x.s, x.p.sex === 'M' ? x.p : q, x.p.sex === 'F' ? x.p : q, x.p.inLaw ? q.surname : x.p.surname, 0.015);
        return `💍 ${who(x)} ♥ ${fullName(q)}, 부부가 되었다!\n` + text;
      };
      // 둘 중 누가 이미 집을 가지고 있으면 그 집에서 시작할 수 있다 (세입자가 있으면 보증금을 돌려줘야)
      const cur = homeOf(c.s, c.p);
      const owned = c.s.assets
        .filter((a) => [c.p.id, q.id].includes(a.ownerId) && isHouse(a) && !(cur?.type === 'own' && cur.assetId === a.id))
        .sort((a, b) => b.value - a.value)
        .slice(0, 2);
      const ownChoices: Choice[] = owned.map((a) => {
        const need = (a.deposit ?? 0) + 200;
        const have = Math.max(0, c.p.cash) + Math.max(0, q.cash);
        return {
          label: `${a.ownerId === q.id ? `${fullName(q)}의` : '내'} 집 ${a.name}에서 시작${a.deposit ? ` (세입자 보증금 ${formatMoney(a.deposit)} 반환)` : ''}`,
          disabled: have < need,
          run: finish('신혼집 걱정이 없다. 가구만 새로 들였다.', (x) => {
            if (x.p.id !== x.s.headId) return '';
            const r = moveIntoOwned(x.s, x.p, a.id);
            return r.text;
          }),
        };
      });
      const livingOwn = cur?.type === 'own' && c.p.id === c.s.headId;
      if (livingOwn) ownChoices.unshift({ label: `지금 사는 내 집(${cur!.name})에서 그대로`, run: finish('살던 집에 배우자의 짐이 들어왔다. 집이 꽉 찼다.') });
      // 이미 내 집에 살고 있으면 셋집으로 나갈 이유가 없다: 내 집(또는 배우자 집) 중에서 고른다
      if (livingOwn) {
        // 새 집을 사서 옮길 수도 있다 (살던 집은 세를 놓는다): 집값의 40%가 있으면 나머지는 주택담보대출
        const kind = c.s.market.apt_seoul * 0.4 <= Math.max(0, c.p.cash) + Math.max(0, q.cash) ? 'apt_seoul' : 'apt_local';
        const price = Math.round(c.s.market[kind]);
        const have = Math.max(0, c.p.cash) + Math.max(0, q.cash);
        ownChoices.push({
          label: `새 ${kind === 'apt_seoul' ? '수도권' : '지방'} 아파트를 사서 들어간다 (${formatMoney(price)} · 살던 집은 세를 놓는다)`,
          req: ['집값의 40% 현금 · 나머지 대출'],
          disabled: have < price * 0.44,
          run: finish('둘이 고른 새 아파트에서 신혼을 시작한다. 살던 집엔 세입자를 들였다.', (x) => {
            if (q.cash > 0) (x.p.cash += q.cash), (q.cash = 0);
            pay(x.s, x.p, Math.round(price * 1.04));
            const a = addAsset(x.s, kind, x.p.id, price, '신혼 아파트');
            mortgageFromCash(x.s, x.p);
            return moveInto(x.s, x.p, a);
          }),
        });
        return gate(c.s, ownChoices);
      }
      return gate(c.s, [
        ...ownChoices,
        { label: '월세 원룸에서 시작', run: finish('좁지만 둘이면 충분하다.', (x) => (homeOf(x.s, x.p)?.type === 'own' ? '' : moveTo(x.s, x.p, 'oneroom', 'wolse'))) },
        {
          label: '전세 대출로 빌라 신혼집',
          run: finish('은행 대출로 전셋집을 구했다.', (x) => {
            if (homeOf(x.s, x.p)?.type === 'own') return '';
            const r = moveTo(x.s, x.p, 'villa', 'jeonse');
            return r.startsWith('이사할 수 없다') ? '전세 대출이 안 나와 ' + moveTo(x.s, x.p, 'villa', 'wolse') : r;
          }),
        },
        ...(parentHelp && !owned.length
          ? [
              {
                label: '부모님이 집을 마련해 주신다',
                run: (x: Ctx) => {
                  const price = Math.round(x.s.market.apt_local);
                  pay(x.s, hh, price);
                  addAsset(x.s, 'apt_local', x.p.id, price, '신혼집');
                  const tax = Math.round(price * 0.1);
                  const covered = coverTax(x.s, hh, x.p, tax);
                  x.s.gifts.push({ fromId: hh.id, toId: x.p.id, amount: price + covered, tax, year: x.s.year });
                  x.p.cash -= tax;
                  const house = x.s.assets[x.s.assets.length - 1];
                  return finish(`${relationLabel(x.s, hh)}께서 아파트를 사주셨다. (증여세 ${formatMoney(price * 0.1)})`, (y) => moveInto(y.s, y.p, house))(x);
                },
              } as Choice,
            ]
          : []),
        ...(parentsOf(c.s, c.p).some(alive)
          ? [
              {
                label: '본가에 들어가 산다',
                run: (x: Ctx) => (
                  (q.happiness = clamp(q.happiness - 12, 0, 100)),
                  finish('부모님과 함께 산다. 배우자의 표정이 어둡다. 대신 집세가 안 든다.', (y) => {
                    const par = parentsOf(y.s, y.p).find((pp) => alive(pp) && pp.home);
                    if (y.p.home) y.p.cash += y.p.home.type === 'own' ? 0 : y.p.home.deposit - (y.p.home.loan ?? 0);
                    y.p.home = { type: 'parents', tier: par?.home?.tier ?? 'villa', name: `${par?.home?.name ?? '본가'} (부모님 댁)`, deposit: 0, rent: 0, since: y.s.year };
                    return '';
                  })(x)
                ),
              } as Choice,
            ]
          : []),
      ]);
    }
    // 상견례
    const out: Choice[] = [];
    if (d.obj) {
      out.push({
        label: '부모님을 설득한다',
        req: ['성품·매력'],
        run: (x) => {
          if (check(x.s, x.p.actual.mor * 0.5 + x.p.actual.cha * 0.5 + x.p.affinity * 0.2, 45, 8)) return next('ceremony', '몇 달의 설득 끝에 부모님이 허락하셨다.')(x);
          x.ev.data.obj = '끝까지 반대';
          return { text: '"내 눈에 흙이 들어가기 전엔 안 된다!"', keep: true };
        },
      });
      out.push({
        label: '반대를 무릅쓰고 결혼한다',
        run: (x) => {
          for (const par of parentsOf(x.s, x.p).filter(alive)) par.affinity = clamp(par.affinity - 30, -100, 100);
          x.p.affinity = clamp(x.p.affinity - 25, -100, 100);
          return next('ceremony', '부모님 없이 결혼 준비를 했다. 연락이 끊겼다.')(x);
        },
      });
    } else if (d.clash) {
      out.push({ label: '우리가 양보하자고 한다', run: (x) => ((x.p.cash -= 1000), next('ceremony', '예단을 넉넉히 보내 겨우 수습했다.')(x)) });
    } else out.push({ label: '날을 잡는다', run: next('ceremony', '결혼 날짜를 잡았다!') });
    out.push({
      label: '결혼을 없던 일로 한다 (파혼)',
      run: (x) => {
        breakUp(x.s, x.p, '파혼', true);
        x.s.fame = Math.max(0, x.s.fame - 1);
        return '청첩장까지 찍었는데… 파혼했다.';
      },
    });
    return gate(c.s, out);
  },
};

// ───────────────────────── 자녀의 연애 (알아서) ─────────────────────────

/** 가주가 아닌 자녀·손주의 연애는 조용히 흘러간다 (가주에게는 가끔 소식만) */
export function autoRomance(s: GameState) {
  const h = head(s);
  for (const p of Object.values(s.people)) {
    if (!alive(p) || p.id === h.id || !p.partnerId || !isMainline(s, p)) continue;
    const q = partnerOf(s, p);
    if (!q || !alive(q)) {
      breakUp(s, p, '사별');
      continue;
    }
    setLove(p, q, love(p) + normal(s, -1, 8));
    const y = datingYears(s, p);
    if (love(p) < 25 || chance(s, 0.12)) {
      breakUp(s, p, '헤어졌다');
      continue;
    }
    if (y >= 2 && chance(s, 0.3 + love(p) / 300) && acceptsProposal(s, p, q)) {
      s.events.push({ uid: s.eventSeq++, defId: 'kid_wedding', personId: p.id });
    }
  }
}

const kidWedding: EventDef = {
  id: 'kid_wedding',
  valid: (c) => !!partnerOf(c.s, c.p),
  title: () => '결혼 허락',
  portraits: (c) => [c.p, partnerOf(c.s, c.p)!],
  text: (c) => {
    const q = partnerOf(c.s, c.p)!;
    return `${iga(who(c))} ${datingYears(c.s, c.p)}년 사귄 사람을 데려왔다. 결혼하겠단다.\n${suitorLine(q, c.s)}\n${kinNote(c.s, q)}`;
  },
  choices: (c) => {
    const q = partnerOf(c.s, c.p)!;
    return gate(c.s, [
      { label: '축복한다 (결혼식 비용 지원 3천만)', cost: 3000, run: (x) => (marry(x.s, x.p, q), (x.p.affinity = clamp(x.p.affinity + 12, -100, 100)), `💍 ${who(x)} ♥ ${fullName(q)} 결혼!${weddingKin(x.s, x.p, q)}`) },
      { label: '축복한다 (알아서 하라고)', run: (x) => (marry(x.s, x.p, q), `💍 ${who(x)} ♥ ${fullName(q)} 결혼! 둘이 알뜰하게 준비했다.${weddingKin(x.s, x.p, q)}`) },
      {
        label: '반대한다',
        run: (x) => {
          x.p.affinity = clamp(x.p.affinity - 25, -100, 100);
          if (chance(x.s, 0.5)) {
            marry(x.s, x.p, q);
            return `${eun(who(x))} 반대를 무릅쓰고 결혼했다. 부모 자식 사이가 멀어졌다.`;
          }
          breakUp(x.s, x.p, '부모 반대');
          x.p.happiness = clamp(x.p.happiness - 15, 0, 100);
          return `${iga(who(x))} 울면서 헤어졌다. 원망의 눈빛이다.`;
        },
      },
    ]);
  },
};

/** 결혼 허락 창: 두 집안 형편 비교 */
function kinNote(s: GameState, q: Person): string {
  const g = kinGap(s, q);
  const base = `🏠 상대 집안: ${KIN_NAME[kinOf(q) ?? 'middle']} · 우리 집: ${KIN_NAME[ourKin(s)]}`;
  if (g >= 2) return base + '\n⚠ 형편 차이가 크다: 사돈 지원은 두둑하겠지만 간섭·무시가 잦고, 금슬이 빨리 식는다 (선물·데이트로 붙잡아야 한다)';
  if (g <= -2) return base + '\n⚠ 형편 차이가 크다: 사돈댁 생활비·병원비를 기대게 되고, 배우자가 기죽기 쉽다';
  if (g === 1) return base + ' · 사돈댁이 조금 더 넉넉하다 (혼수·신혼집 도움이 있을 수 있다)';
  if (g === -1) return base + ' · 우리 집이 조금 더 넉넉하다';
  return base + ' · 형편이 비슷하다 (갈등이 적다)';
}

/** 결혼식: 사돈댁 형편에 따라 신혼집 보태기 · 예단 기싸움 */
function weddingKin(s: GameState, p: Person, q: Person): string {
  const k = kinOf(q) ?? 'middle';
  const g = kinGap(s, q);
  if (k === 'elite' || k === 'rich') {
    const amt = k === 'elite' ? int(s, 30, 80) * 1000 : int(s, 8, 25) * 1000;
    p.cash += amt;
    if (g >= 2) setBond(p, q, (p.bond ?? 60) - 6);
    return `\n🏠 사돈댁이 신혼집에 ${formatMoney(amt)}을 보탰다.${g >= 2 ? ' 대신 예단 기싸움으로 첫해부터 삐걱거린다 (금슬 −6).' : ''}`;
  }
  if (k === 'poor' && g <= -2) return '\n🏠 사돈댁 형편이 어려워 혼수는 우리 쪽이 거의 다 댔다. 배우자가 미안해한다.';
  return '';
}

const exNews: EventDef = {
  id: 'ex_news',
  title: () => '옛 연인의 소식',
  text: (c) => `SNS에 뜬 사진 한 장. 옛 연인 ${iga(c.ev.data.name)} ${pick({ rng: c.s.year }, ['결혼했다', '아이를 안고 웃고 있다', '해외로 이민 갔다', '사업에 성공했다'])}고 한다.`,
  choices: () => [
    { label: '행복을 빌어준다', run: (x) => ((x.p.actual.mor = clamp(x.p.actual.mor + 1, 0, 100)), '잘 살아라.') },
    { label: '괜히 봤다', run: (x) => (mood(x.p, -4), '밤새 뒤척였다.') },
  ],
};

/** 가주 본인은 해마다 연애 이벤트 */
export function romanceYear(s: GameState) {
  const h = head(s);
  const q = partnerOf(s, h);
  if (q && !alive(q)) breakUp(s, h, '사별', false);
  else if (q && !s.events.some((e) => e.defId === 'dating_year' || e.defId === 'wedding')) s.events.push({ uid: s.eventSeq++, defId: 'dating_year', personId: h.id });
  autoRomance(s);
}

export const ROMANCE_EVENTS: EventDef[] = [datingYear, wedding, kidWedding, exNews];
export const ROMANCE_RANDOM: LifeDef[] = [meet];
